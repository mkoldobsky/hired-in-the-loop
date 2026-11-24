---
name: job-scout
description: Finds new job postings (job-alert emails in Gmail + public job sources), scores them against the user's profile and adds them to the tracker. Use for "find jobs", "scout", or the daily scheduled run.
---

# job-scout

Goal: feed `tracker/opportunities.jsonl` with new, deduplicated, scored postings.

## Steps
1. Read `CLAUDE.md`, `config/search-profile.json` and `node tracker/tracker.mjs stats` for context.
2. **Source 1 — job-alert emails (Gmail connector):** search alerts from the last 2 days, e.g.
   `from:(jobalerts-noreply@linkedin.com OR jobs-noreply@linkedin.com) newer_than:2d`, plus alerts from other boards the user subscribes to (Wellfound, Remote OK, Glassdoor, local boards).
   From each alert extract company, role, location/work mode and the posting URL.
3. **Source 2 — public sources:** `node sources/fetch.mjs`. No accounts, no browser; works even if Gmail fails.
   - Reads `public_sources` from `config/search-profile.json`, dedupes against the tracker and writes new ones, with full descriptions, to `sources/candidates.json`.
   - The filter is by title only: read each description before scoring. These don't count towards `max_detail_fetches_per_run`. Save `job.md` from `description`; `source` = himalayas | hackernews | greenhouse.
   - "No restriction stated" does NOT mean they hire in the user's country: say so in `score_reason`.
   - If a source returns ERROR, `log` it and continue with the others.
   - Only after reviewing all of them: `node sources/fetch.mjs --mark-seen`.
4. Drop duplicates before fetching details: `node tracker/tracker.mjs find <company>`.
5. For the remaining candidates (max `max_detail_fetches_per_run`), open the posting and extract the full description. If a login, CAPTCHA or verification appears: **stop**, log it and tell the user.
6. **Score 0–100**:
   - Role match (primary 40 / secondary 25 / other 0–10)
   - Seniority and scope (team size, ownership) 0–20
   - Domain/skills match with `cv/master.json` 0–20
   - Market bonus from `markets_priority` (−25 to +20)
   - Dealbreakers → score 0 and status `discarded`
7. Add: `node tracker/tracker.mjs add '{"company":..,"role":..,"url":..,"location":..,"market":"<market from markets_priority>","source":"email-alert|himalayas|hackernews|greenhouse|...","score":N,"score_reason":"one line"}'`
   and save the description to `applications/<id>/job.md` (title, company, URL, work mode, salary if stated, full description, requirements).
8. Close with `node tracker/tracker.mjs log "scout: N new, M discarded"` and a short summary for the user (top 5 by score).
