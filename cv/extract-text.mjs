#!/usr/bin/env node
// Extracts plain text from a .docx, .odt, .txt or .md CV, with no dependencies.
// Usage: node cv/extract-text.mjs <file> [out.txt]
// PDFs don't need this: Claude Code reads PDFs directly. Old .doc files: save them as .docx or PDF first.
import { readFileSync, writeFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { extname } from "node:path";

const [, , file, out] = process.argv;
if (!file) {
  console.error("Usage: node cv/extract-text.mjs <file.docx|file.odt|file.txt> [out.txt]");
  process.exit(1);
}

// Minimal ZIP reader: walks the central directory; returns { name: text } for entries matching `want`.
function readZipEntries(buf, want) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Not a valid .docx/.odt file (ZIP directory not found).");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const found = {};
  for (let n = 0; n < count; n++) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const entry = buf.toString("utf8", p + 46, p + 46 + nameLen);
    if (want.test(entry)) {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(start, start + size);
      if (method === 0) found[entry] = data.toString("utf8");
      else if (method === 8) found[entry] = inflateRawSync(data).toString("utf8");
      else throw new Error(`Unsupported compression method ${method} in ${entry}.`);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return found;
}

const decode = (s) => s
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&amp;/g, "&");

function docxText(xml) {
  return decode(xml
    .replace(/<mc:Fallback>[\s\S]*?<\/mc:Fallback>/g, "")   // text boxes appear twice (Choice + Fallback)
    .replace(/<w:delText[^>]*>[\s\S]*?<\/w:delText>/g, "") // tracked deletions
    .replace(/<w:instrText[^>]*>[\s\S]*?<\/w:instrText>/g, "") // field codes (HYPERLINK "mailto:...")
    .replace(/<w:tab\s*\/>/g, "\t")
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<w:numPr>/g, "• ")          // list items
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, ""));
}

function odtText(xml) {
  return decode(xml
    .replace(/<text:tab\/>/g, "\t")
    .replace(/<text:line-break\/>/g, "\n")
    .replace(/<text:list-item>/g, "• ")
    .replace(/<\/text:(p|h)>/g, "\n")
    .replace(/<[^>]+>/g, ""));
}

const ext = extname(file).toLowerCase();
let text;
if (ext === ".docx") {
  // Many CV templates put name and contact details in the page header, so headers go first.
  const parts = readZipEntries(readFileSync(file), /^word\/(document|header\d*)\.xml$/);
  if (!parts["word/document.xml"]) throw new Error("word/document.xml not found: is this a Word document?");
  const headers = Object.keys(parts).filter((k) => k.includes("header")).sort().map((k) => docxText(parts[k]).trim()).filter(Boolean);
  text = [...new Set(headers), docxText(parts["word/document.xml"])].join("\n");
} else if (ext === ".odt") {
  const parts = readZipEntries(readFileSync(file), /^(content|styles)\.xml$/);
  text = odtText(parts["content.xml"] ?? "");
}
else if (ext === ".txt" || ext === ".md") text = readFileSync(file, "utf8");
else if (ext === ".pdf") { console.error("PDFs don't need extraction: ask Claude Code to read the PDF directly."); process.exit(2); }
else if (ext === ".doc") { console.error("Old .doc format: open it in Word/Google Docs and save it as .docx or PDF first."); process.exit(2); }
else { console.error(`Unsupported file type: ${ext}`); process.exit(2); }

text = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
if (/Ã.|Â[·\s]|â€/.test(text)) console.error("WARNING: the text looks garbled (e.g. 'MÃ©ndez' instead of 'Méndez'): the file has broken encoding. Fix those characters when importing, and check names and accents.");
if (out) { writeFileSync(out, text); console.log(`OK → ${out} (${text.length} chars)`); }
else process.stdout.write(text);
