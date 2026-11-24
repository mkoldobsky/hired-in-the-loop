---
name: interview-prep
description: Builds an interview dossier (company, role, required skills vs. the user's evidence, gaps, likely questions with STAR answers based only on the user's real experience, questions to ask). Use when an opportunity moves to interview or when the user asks "prepare the interview with X".
---

# interview-prep

Output: `applications/<id>/prep.md` (notes in the user's language; model answers in the interview's language).

## Research
- The opportunity's `job.md`, `fit.md`, `emails.md` and `cv.json`.
- Web: company site, product, business model, funding/investors, size, news from the last 12 months, tech stack (engineering blog, postings, GitHub), culture and values, Glassdoor if accessible.
- Interviewers (if names are known): public professional info only (role, background). Don't collect personal data.

## Structure of `prep.md`
1. **30-second summary**: what the company does, why they're hiring, the user's angle.
2. **The company**: product, customers, model, stage, numbers, competitors, news.
3. **The role**: responsibilities, reporting line, team size, the problem they probably want solved.
4. **Skills matrix**: requirement → concrete evidence from `master.json` → strength (high/medium/gap).
5. **Gaps and how to address them**: honestly, with a credible bridge.
6. **Personal pitch**: 60-second and 2-minute versions, adapted to the role.
7. **Likely questions + answers** (15–20): leadership and org design, delivery/quality, stakeholders, architecture, incidents, budget/costs, conflict/underperformance, hiring, AI in engineering, "why are you leaving / why us?", salary. STAR answers using **only stories and metrics from `master.json`**. Where a real example is missing, write `[TO FILL: ...]` instead of inventing one.
8. **Questions to ask them** (6–8, company-specific).
9. **Logistics**: date/time (the user's time zone and the interviewer's), link, format, what to prepare.
10. **Day-before checklist.**

When done: `node tracker/tracker.mjs set <id> '{"prep":"applications/<id>/prep.md","note":"dossier ready"}'` and send the user the link to the file.
