#!/usr/bin/env node
// The system's memory: opportunity tracker (JSONL) + activity log (log.md).
// Every agent writes through this CLI so the format stays consistent.
//
//   node tracker/tracker.mjs add '<json>'              → new opportunity (status=found). Prints the id. Rejects duplicates.
//   node tracker/tracker.mjs set <id> '<partial-json>' → merge fields (e.g. {"status":"drafted","note":"..."})
//   node tracker/tracker.mjs get <id>
//   node tracker/tracker.mjs list [status ...]         → summary table, sorted by score
//   node tracker/tracker.mjs find <text>               → search by company/role/url
//   node tracker/tracker.mjs log '<message>'           → append a line to log.md
//   node tracker/tracker.mjs stats                     → count by status
import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const DB = join(here, "opportunities.jsonl");
const LOG = join(here, "log.md");
export const STATUSES = ["found", "drafted", "approved", "applied", "replied", "interview", "offer", "rejected", "discarded"];

const load = () => (existsSync(DB) ? readFileSync(DB, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const save = (rows) => writeFileSync(DB, rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""));
const now = () => new Date().toISOString();
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const norm = (s = "") => s.toLowerCase().replace(/[^a-z0-9]/g, "");
// Local time, "YYYY-MM-DD HH:MM". Set TRACKER_TZ (e.g. "America/New_York") to override the system time zone.
const stamp = () => new Date().toLocaleString("sv-SE", process.env.TRACKER_TZ ? { timeZone: process.env.TRACKER_TZ } : {}).slice(0, 16);
const log = (msg) => appendFileSync(LOG, `- ${stamp()} · ${msg}\n`);
const die = (m) => { console.error(m); process.exit(1); };

const [, , cmd, a, b] = process.argv;
const rows = load();

switch (cmd) {
  case "add": {
    const o = JSON.parse(a);
    if (!o.company || !o.role) die("add needs company and role");
    const dup = rows.find((r) => (o.url && r.url && r.url.split("?")[0] === o.url.split("?")[0]) || (norm(r.company) === norm(o.company) && norm(r.role) === norm(o.role)));
    if (dup) { console.log(`DUPLICATE ${dup.id}`); break; }
    const id = `${now().slice(0, 10)}-${slug(o.company)}-${slug(o.role)}`.slice(0, 80);
    const row = { id, status: "found", score: null, created: now(), updated: now(), history: [{ at: now(), status: "found" }], ...o, id };
    rows.push(row); save(rows); log(`➕ ${row.company} — ${row.role} (${id})`);
    console.log(id); break;
  }
  case "set": {
    const r = rows.find((x) => x.id === a) ?? die(`Not found: ${a}`);
    const patch = JSON.parse(b);
    if (patch.status && !STATUSES.includes(patch.status)) die(`Invalid status: ${patch.status}`);
    if (patch.status && patch.status !== r.status) { r.history = [...(r.history ?? []), { at: now(), status: patch.status, note: patch.note }]; log(`🔁 ${r.company} — ${r.role}: ${r.status} → ${patch.status}${patch.note ? ` (${patch.note})` : ""}`); }
    delete patch.note; Object.assign(r, patch, { updated: now() }); save(rows); console.log("OK"); break;
  }
  case "get": console.log(JSON.stringify(rows.find((x) => x.id === a) ?? die(`Not found: ${a}`), null, 2)); break;
  case "find": { const q = norm(a); rows.filter((r) => norm(`${r.company}${r.role}${r.url}`).includes(q)).forEach((r) => console.log(`${r.id}\t${r.status}\t${r.company} — ${r.role}`)); break; }
  case "list": {
    const want = process.argv.slice(3);
    rows.filter((r) => !want.length || want.includes(r.status)).sort((x, y) => (y.score ?? 0) - (x.score ?? 0))
      .forEach((r) => console.log(`${String(r.score ?? "-").padStart(3)}  ${r.status.padEnd(9)}  ${r.company} — ${r.role}  [${r.id}]`));
    break;
  }
  case "stats": { const c = {}; rows.forEach((r) => (c[r.status] = (c[r.status] ?? 0) + 1)); console.log(JSON.stringify(c)); break; }
  case "log": log(a); console.log("OK"); break;
  default: die("Commands: add | set | get | list | find | log | stats");
}
