#!/usr/bin/env node
// Checks that a CV JSON follows the master.json schema and flags what still needs the user's input.
// Usage: node cv/validate.mjs [cv/master.json]
// Exit code 1 on errors (the file won't render well); warnings are things to review, not blockers.
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const path = process.argv[2] ?? join(here, "master.json");
if (!existsSync(path)) { console.error(`Not found: ${path}`); process.exit(1); }

let cv;
try { cv = JSON.parse(readFileSync(path, "utf8")); }
catch (e) { console.error(`Invalid JSON in ${path}: ${e.message}`); process.exit(1); }

const errors = [], warnings = [];
const isStr = (v) => typeof v === "string" && v.trim() !== "";
const req = (cond, msg) => { if (!cond) errors.push(msg); };
const warn = (cond, msg) => { if (!cond) warnings.push(msg); };

req(isStr(cv.name), "name is missing");
req(isStr(cv.headline), "headline is missing");
req(isStr(cv.summary), "summary is missing");
req(cv.contact && typeof cv.contact === "object", "contact is missing");
warn(isStr(cv.contact?.email), "contact.email is empty");
warn(isStr(cv.contact?.linkedin), "contact.linkedin is empty");
warn(isStr(cv.contact?.location), "contact.location is empty");

const roles = (key) => {
  const arr = cv[key] ?? [];
  if (!Array.isArray(arr)) { errors.push(`${key} must be a list`); return; }
  const ids = new Set();
  arr.forEach((r, i) => {
    const where = `${key}[${i}]${r?.company ? ` (${r.company})` : ""}`;
    req(isStr(r?.title), `${where}: title is missing`);
    req(isStr(r?.company), `${where}: company is missing`);
    warn(isStr(r?.period), `${where}: period (dates) is missing`);
    req(isStr(r?.id), `${where}: id is missing (short slug, e.g. "acme")`);
    if (r?.id) { req(!ids.has(r.id), `${where}: duplicate id "${r.id}"`); ids.add(r.id); }
    req(Array.isArray(r?.bullets), `${where}: bullets must be a list`);
    (r?.bullets ?? []).forEach((b, j) => req(isStr(b?.text ?? b), `${where}: bullet ${j + 1} is empty`));
    if (key === "experience") warn((r?.bullets ?? []).length > 0, `${where}: no bullets (achievements)`);
    const metric = (t) => /\d/.test(String(t).replace(/\b(19|20)\d{2}\b/g, "").replace(/\bQ[1-4]\b/g, ""));
    const withNumbers = (r?.bullets ?? []).filter((b) => metric(b?.text ?? b)).length;
    if (key === "experience" && (r?.bullets ?? []).length >= 2) warn(withNumbers > 0, `${where}: no bullet has a number (team size, %, time, money). Add real metrics if you have them`);
  });
};
req(Array.isArray(cv.experience) && cv.experience.length > 0, "experience is empty");
roles("experience");
roles("ventures");

warn(Array.isArray(cv.highlights) && cv.highlights.length > 0, "highlights is empty: the CV header shows up to 4 key metrics");
(cv.highlights ?? []).forEach((h, i) => req(isStr(h?.value) && isStr(h?.label), `highlights[${i}] needs value and label`));
warn(Array.isArray(cv.competencies) && cv.competencies.length > 0, "competencies is empty");
warn(Array.isArray(cv.education) && cv.education.length > 0, "education is empty");
warn(Array.isArray(cv.languages) && cv.languages.length > 0, "languages is empty");

// Leftovers from the example file or the import
const raw = JSON.stringify(cv);
if (/\(fictional\)|example\.com|Alex Rivera/.test(raw)) errors.push("still contains data from master.example.json (Alex Rivera / fictional / example.com)");
// TODOs would be printed on the CV, so they block until the user answers them.
const todos = raw.match(/TODO[^"]*/g) ?? [];
todos.forEach((t) => errors.push(`pending, ask the user: ${t}`));
if (/Ã.|Â[·\s]|â€/.test(raw)) errors.push("garbled characters (e.g. 'Ã©' instead of 'é'): broken encoding from the source file");
if (cv.lang && cv.lang !== "en") warn(cv.labels && typeof cv.labels === "object", `lang is "${cv.lang}" but there are no labels: section titles will print in English (see labels in master.example.json)`);

console.log(`${path}`);
console.log(`  ${cv.experience?.length ?? 0} roles, ${cv.ventures?.length ?? 0} ventures, ${(cv.experience ?? []).reduce((n, r) => n + (r.bullets?.length ?? 0), 0)} experience bullets, ${cv.highlights?.length ?? 0} highlights`);
errors.forEach((e) => console.log(`  ✗ ${e}`));
warnings.forEach((w) => console.log(`  ! ${w}`));
if (!errors.length && !warnings.length) console.log("  ✓ looks complete");
else if (!errors.length) console.log(`  ✓ valid, with ${warnings.length} item(s) to review`);
process.exit(errors.length ? 1 : 0);
