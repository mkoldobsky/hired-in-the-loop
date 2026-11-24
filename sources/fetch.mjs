#!/usr/bin/env node
// Reads public job sources (Himalayas, Hacker News "Who is hiring?", Greenhouse boards). Read-only, no accounts.
// It does NOT add anything to the tracker: it leaves candidates in sources/candidates.json for job-scout to review and score.
//
//   node sources/fetch.mjs              → fetch, filter, dedupe and write candidates.json
//   node sources/fetch.mjs --mark-seen  → mark candidates.json entries as seen (run AFTER reviewing them)
//
// Filters live in config/search-profile.json → public_sources (title_pattern, title_exclude_pattern, location_pattern, himalayas_country).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "candidates.json");
const SEEN = join(here, "seen.json");
const read = (p, d) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : d);

if (process.argv.includes("--mark-seen")) {
  const seen = new Set(read(SEEN, []));
  read(OUT, { candidates: [] }).candidates.forEach((c) => seen.add(c.key));
  writeFileSync(SEEN, JSON.stringify([...seen], null, 1));
  console.log(`seen=${seen.size}`);
  process.exit(0);
}

const cfgDir = join(here, "..", "config");
const cfgPath = existsSync(join(cfgDir, "search-profile.json")) ? join(cfgDir, "search-profile.json") : join(cfgDir, "search-profile.example.json");
const cfg = JSON.parse(readFileSync(cfgPath, "utf8")).public_sources;
const trackerPath = join(here, "..", "tracker", "opportunities.jsonl");
const tracked = existsSync(trackerPath) ? readFileSync(trackerPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const seen = new Set(read(SEEN, []));

const norm = (s = "") => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\(.*?\)/g, "").replace(/[^a-z0-9]/g, "");
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', nbsp: " ", "#x27": "'", "#39": "'", "#x2F": "/" };
const decode = (s = "") => s.replace(/&(#?\w+);/g, (m, e) => ENT[e] ?? m);
const strip = (s = "") => decode(decode(s).replace(/<(p|br|li|\/p|\/li|h\d)[^>]*>/gi, "\n").replace(/<[^>]+>/g, "")).replace(/\n{3,}/g, "\n\n").trim();

// Title filter (which roles you want) and exclusions (other functions that share words with them).
const ROLE = new RegExp(cfg.title_pattern, "i");
const NOT_ROLE = new RegExp(cfg.title_exclude_pattern || "$^", "i");
// Greenhouse/HN locations are free text: they must mention a place you can work from.
const LOC_OK = new RegExp(cfg.location_pattern, "i");
const US_ONLY = /\bUS[- ]only|remote[^\n]{0,15}\((US|USA|U\.S\.|UK|EU|Canada|US\/Canada|US & Canada)[^)]{0,12}\)/i;

const get = async (url) => {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; job-feed-check)" }, signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};
const found = [], report = {};
const run = async (name, fn) => {
  try { const n = await fn(); report[name] = { ok: true, read: n }; }
  catch (e) { report[name] = { ok: false, error: String(e.message || e) }; }
};

await run("himalayas", async () => {
  let n = 0;
  const country = cfg.himalayas_country ? `&country=${encodeURIComponent(cfg.himalayas_country)}` : "";
  for (const q of cfg.himalayas_queries ?? []) {
    const d = await get(`https://himalayas.app/jobs/api/search?q=${encodeURIComponent(q)}${country}`);
    for (const j of d.jobs ?? []) {
      n++;
      if (!ROLE.test(j.title) || NOT_ROLE.test(j.title)) continue;
      found.push({
        key: j.guid, source: "himalayas", company: j.companyName, role: j.title, url: j.applicationLink,
        location: j.locationRestrictions?.length ? j.locationRestrictions.join(", ") : "Remote, no restriction stated",
        salary: j.minSalary ? `${j.currency ?? ""} ${j.minSalary}–${j.maxSalary ?? ""} (${j.salaryPeriod ?? "?"})`.trim() : "",
        posted: j.pubDate ? new Date(j.pubDate * 1000).toISOString().slice(0, 10) : "", description: strip(j.description),
      });
    }
  }
  return n;
});

for (const board of cfg.greenhouse_boards ?? []) {
  await run(`greenhouse:${board}`, async () => {
    const d = await get(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`);
    for (const j of d.jobs ?? []) {
      if (!ROLE.test(j.title) || NOT_ROLE.test(j.title) || !LOC_OK.test(j.location?.name ?? "")) continue;
      found.push({ key: `gh:${board}:${j.id}`, source: "greenhouse", company: j.company_name || board, role: j.title, url: j.absolute_url, location: j.location.name, salary: "", posted: (j.first_published || j.updated_at || "").slice(0, 10), description: strip(j.content) });
    }
    return (d.jobs ?? []).length;
  });
}

if (cfg.hackernews !== false) await run("hackernews", async () => {
  const s = await get("https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=10");
  const story = s.hits.find((h) => /who is hiring/i.test(h.title));
  if (!story) throw new Error("this month's thread not found");
  const item = await get(`https://hn.algolia.com/api/v1/items/${story.objectID}`);
  for (const c of item.children ?? []) {
    const text = strip(c.text ?? ""); const first = text.split("\n")[0] ?? "";
    // The role must appear as a position (header or a short line in a list of openings), not mentioned in passing.
    const line = text.split("\n").find((l) => l.length < 220 && ROLE.test(l) && !NOT_ROLE.test(l));
    if (!line || !/remote/i.test(text) || US_ONLY.test(text) || !LOC_OK.test(text)) continue;
    found.push({ key: `hn:${c.id}`, source: "hackernews", company: first.split("|")[0].trim().slice(0, 60), role: (line.match(ROLE) ?? [""])[0], url: `https://news.ycombinator.com/item?id=${c.id}`, location: first.slice(0, 200), salary: "", posted: (c.created_at ?? "").slice(0, 10), description: text });
  }
  return (item.children ?? []).length;
});

const uniq = new Map();
let inTracker = 0, alreadySeen = 0;
for (const c of found) {
  const id = norm(c.company) + "|" + norm(c.role);
  if (uniq.has(id)) continue;
  const co = norm(c.company), ro = norm(c.role);
  const dup = tracked.find((t) => { const tc = norm(t.company), tr = norm(t.role); return (co && tc && (tc.startsWith(co) || co.startsWith(tc))) && (tr.includes(ro) || ro.includes(tr)); });
  if (dup) { inTracker++; uniq.set(id, null); continue; }
  if (seen.has(c.key)) { alreadySeen++; uniq.set(id, null); continue; }
  uniq.set(id, c);
}
const candidates = [...uniq.values()].filter(Boolean).sort((a, b) => (b.posted || "").localeCompare(a.posted || ""));
writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), report, candidates }, null, 1));
for (const [k, v] of Object.entries(report)) console.log(v.ok ? `OK    ${k}: ${v.read} read` : `ERROR ${k}: ${v.error}`);
console.log(`candidates=${candidates.length} · already in tracker=${inTracker} · already seen=${alreadySeen}`);
for (const c of candidates) console.log(`- [${c.source}] ${c.company} — ${c.role} | ${c.location.slice(0, 80)} | ${c.salary || "n/a"} | ${c.posted}`);
if (Object.values(report).length && Object.values(report).every((v) => !v.ok)) process.exit(1);
