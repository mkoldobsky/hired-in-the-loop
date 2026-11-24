---
name: job-tailor
description: Builds a tailored CV (JSON + PDF), cover letter and fit analysis for tracker opportunities in status found with a score above the threshold, and puts them in the approval queue (drafted). Use for "tailor", "build the CVs", or after job-scout.
---

# job-tailor

## Steps (for each `found` opportunity with `score >= score_threshold_tailor`, or the one the user names)
1. Read `applications/<id>/job.md` and `cv/master.json`.
2. Analyze the posting: top 6–8 requirements, keywords (for ATS), company tone, language.
3. Create `applications/<id>/cv.json` from `master.json`:
   - `headline`: align with the job title using roles the user actually held. Never use a title they didn't have.
   - `summary`: rewrite 3–4 lines aimed at what the posting asks for, using facts from master.
   - `experience`/`ventures`: reorder bullets by relevance, cut irrelevant ones; you may rephrase to include keywords **without changing the fact or the metric**.
   - `highlights`: pick the 4 most relevant metrics (from master only).
   - `competencies`: prioritize matches; you may rename to the posting's synonyms only when they are truly equivalent.
   - Target: **2 pages max**.
   - **Forbidden**: adding technologies, achievements, numbers, companies or dates that are not in master. Respect any `_note` in master listing phrases the user vetoed.
4. Render: `node cv/render.mjs applications/<id>/cv.json applications/<id>/CV_<Company>.pdf`, then read the PDF to check it doesn't overflow to 3 pages.
5. `applications/<id>/cover.md`: 180–250 words, in the posting's language. Structure: why this company (something concrete from the posting/site) → 2 proofs with real metrics that map to their needs → close with availability. No clichés ("I am writing to express..."). Sign with the user's name.
6. `applications/<id>/fit.md`: strong matches, honest gaps and how to address them in an interview.
7. `node tracker/tracker.mjs set <id> '{"status":"drafted","cv_pdf":"<path>","note":"CV+cover ready"}'`
8. Show the user **the approval queue**: table with score, company, role, market, link and a one-line summary of the angle. Ask which ones they approve. Only with their explicit OK: `set <id> '{"status":"approved"}'` (or `discarded` for rejected ones).
