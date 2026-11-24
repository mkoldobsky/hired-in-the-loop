#!/usr/bin/env node
// Renders a CV (JSON following the master.json schema) to HTML and PDF.
// Usage: node cv/render.mjs <cv.json> <out.pdf>
// No dependencies: uses headless Chrome to print the PDF (set CHROME_PATH if it is not in the default macOS location).
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const defaultIn = existsSync(join(here, "master.json")) ? join(here, "master.json") : join(here, "master.example.json");
const [, , inPath = defaultIn, outPath = join(here, "CV.pdf")] = process.argv;

const cv = JSON.parse(readFileSync(inPath, "utf8"));
const css = readFileSync(join(here, "template.css"), "utf8");
const L = { summary: "Executive Summary", experience: "Experience", ventures: "Ventures", competencies: "Core Competencies", education: "Education", languages: "Languages", ...(cv.labels ?? {}) };
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const list = (items, fn) => (items ?? []).map(fn).join("");
const bullets = (bs) => (bs?.length ? `<ul>${list(bs, (b) => `<li>${esc(b.text ?? b)}</li>`)}</ul>` : "");

const role = (r) => `
  <div class="role">
    <h3>${esc(r.title)} – ${esc(r.company)}</h3>
    <div class="meta">${r.url ? `${esc(r.url)} · ` : ""}${esc(r.period)}</div>
    ${r.description ? `<p class="desc">${esc(r.description)}</p>` : ""}
    ${bullets(r.bullets)}
  </div>`;

const contact = [cv.contact?.email, cv.contact?.email_alt, cv.contact?.linkedin, cv.contact?.location].filter(Boolean).map(esc).join(" · ");

const html = `<!doctype html><html lang="${esc(cv.lang ?? "en")}"><head><meta charset="utf-8"><title>${esc(cv.name)} – CV</title>
<style>${css}</style></head><body>
<header>
  <h1>${esc(cv.name)}</h1>
  <div class="headline">${esc(cv.headline)}</div>
  ${cv.tagline ? `<div class="tagline">${esc(cv.tagline)}</div>` : ""}
  <div class="contact">${contact}</div>
</header>
<section><h2>${esc(L.summary)}</h2><p>${esc(cv.summary)}</p>
  ${cv.highlights?.length ? `<div class="kpis">${list(cv.highlights, (h) => `<div class="kpi"><b>${esc(h.value)}</b><span>${esc(h.label)}</span></div>`)}</div>` : ""}
</section>
<section><h2>${esc(L.experience)}</h2>${list(cv.experience, role)}</section>
${cv.ventures?.length ? `<section><h2>${esc(L.ventures)}</h2>${list(cv.ventures, role)}</section>` : ""}
<section class="keep"><h2>${esc(L.competencies)}</h2><div class="grid">${list(cv.competencies, (c) => `<div>${esc(c)}</div>`)}</div></section>
<section class="keep two">
  <div><h2>${esc(L.education)}</h2>${list(cv.education, (e) => `<h3>${esc(e.degree)}</h3><div class="meta">${esc(e.school)}</div>`)}</div>
  ${cv.languages?.length ? `<div><h2>${esc(L.languages)}</h2><p class="langs">${cv.languages.map(esc).join("<br>")}</p></div>` : ""}
</section>
</body></html>`;

const out = resolve(outPath);
const htmlPath = out.replace(/\.pdf$/i, ".html");
writeFileSync(htmlPath, html);

const chrome = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
execFileSync(chrome, [
  "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
  `--user-data-dir=${mkdtempSync(join(tmpdir(), "cvchrome-"))}`,
  `--print-to-pdf=${out}`, `file://${htmlPath}`,
], { stdio: "ignore" });
console.log(`OK → ${out}`);
