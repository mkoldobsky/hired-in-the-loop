---
name: cv-import
description: Turns the user's existing CV (PDF, Word .docx, .odt, text, or a LinkedIn "Save to PDF" export) into cv/master.json, then interviews the user to fill gaps like metrics and team sizes. Use for "import my CV", "here's my CV", "create master.json from my resume", "importá mi CV", or when cv/master.json doesn't exist yet.
---

# cv-import

Goal: a complete, truthful `cv/master.json` that follows the schema of `cv/master.example.json`, without the user editing JSON by hand.

`master.json` is the only source of facts for every other agent, so this skill follows rule 1 strictly: **copy what the CV says, never add.** Anything that isn't in the source file or said by the user in chat does not go in.

## 1. Get the file
- Ask for the path, or tell the user they can drag the file into the Claude Code window. Suggest putting it in `cv/source/` (git-ignored).
- No CV at hand? A LinkedIn profile works: **Profile → More → Save to PDF**. Several sources can be combined (e.g. CV + LinkedIn PDF); when they disagree on a fact (dates, titles), ask which one is right.
- Read it:
  - **PDF**: read it directly with the Read tool.
  - **.docx / .odt / .txt / .md**: `node cv/extract-text.mjs <file>`.
  - **.doc** (old Word) or a scanned image: ask the user to save it as .docx or PDF first.
- If the extractor warns about garbled characters ("MÃ©ndez"), fix them back to the right accents and double-check names with the user.
- If `cv/master.json` already exists, **don't overwrite it**: write to `cv/master.imported.json` and at the end show what's different, then ask before replacing.

## 2. Map it to the schema
Follow `cv/master.example.json` field by field:

| Field | Where it comes from |
|---|---|
| `name`, `contact` (email, linkedin, location) | Header of the CV. Phone and address are **not** needed; leave them out. |
| `headline` | The current or most recent **job title**, as written in the experience section (not a description from the profile). If there are two real roles (e.g. "Head of Engineering · Fractional CTO"), both are fine. If the CV uses a different label elsewhere, ask which one the user prefers. |
| `tagline` | Optional. Only from areas the CV already shows; skip it if unsure. |
| `summary` | The CV's own summary/profile, with only typos and grammar fixed: **no new claims**, not even inferred ones like years of experience or domains. If it is missing or very thin, keep what's there and ask the user in step 3 whether they want a fuller one; write it with them, from their answers. |
| `experience[]` | One entry per role, newest first. `id` = short slug (`"acme"`, `"acme-2"` for a second stint). `title`, `company`, `period` exactly as written ("2019 – 2023", "Mar 2021 – Present"). Each achievement or responsibility becomes a bullet; keep the user's wording, only fix typos and split very long bullets. |
| `ventures[]` | Own companies, side projects, open source, freelance work, if the CV has them. |
| `tags` | On roles and bullets: short lowercase topics (`leadership`, `payments`, `backend`, `hiring`…). Tags are metadata to help tailoring, not facts, so infer them freely. |
| `highlights[]` | Up to 4 metrics **that appear in the CV** (team size, %, time saved, money, users). `value` is the number, `label` a short description that keeps the source's verb: "coordinated" stays "coordinated", it doesn't become "led". Prefer results over scope; an empty list is fine. If the CV has no metrics, leave it empty and ask in step 3. |
| `competencies[]` | The CV's skills section as written, up to 12 items. You may suggest a few more that the bullets clearly show (a bullet about hiring → "Hiring"), but list them in step 3 for the user to confirm before adding them. Few items is fine. |
| `education[]` | As written. If the degree's status or year is unclear, ask in step 3 and add it to `degree` only when the user answers (e.g. "B.Sc. in Computer Science (2012)"). |
| `languages[]` | Keep the source's wording and language: "Inglés intermedio" becomes `"Inglés: Intermedio"`. **Never convert to a CEFR level (B2, C1) or a certificate the CV doesn't mention.** |
| `lang`, `labels` | `lang` is the CV's language code (`"en"`, `"es"`, `"pt"`…). Keep the CV's language; don't translate. If it isn't English, set `labels` with the section titles in that language (same keys as in `master.example.json`), or the PDF prints English headings. |
| `tags` vocabulary | Prefer these, lowercase kebab-case, and add others only when needed: `leadership`, `hiring`, `delivery`, `project-management`, `product`, `platform`, `backend`, `frontend`, `mobile`, `data`, `ai`, `cloud`, `cost`, `reliability`, `security`, `payments`, `e-commerce`, `banking`, `logistics`, `consulting`, `client-management`, `hands-on`. |
| `_note` | `"Imported from <file> on <date>. Facts only from the source CV and the user's answers."` |

Never:
- invent numbers, round them up, or turn "helped" into "led";
- merge two achievements into one sentence (two true facts can make a false claim);
- fill a missing date or title with a guess. Use `"TODO: ..."` instead. TODOs are printed on the CV, so `validate.mjs` treats them as errors until the user answers; never share or render a CV for use while it has TODOs.

## 3. Interview the user to fill gaps
Most CVs are thin on numbers, and numbers are what make tailored CVs strong. Run `node cv/validate.mjs <file>`, write your questions to `cv/questions.md` (git-ignored) so nothing is lost if the session ends, and then ask, **in short rounds of 3–4 questions, in the user's language**, plain words, no JSON jargon:
- each `TODO` and every missing date;
- for the 2–3 most recent roles: how many people they led or worked with, the size of the budget or user base, a before/after result (time, cost, quality, revenue). Make it clear "I don't know" or "skip" is a fine answer;
- anything ambiguous ("you list 'led migration': did you lead the team, or the technical design?").

- the suggested extra competencies, and the headline if the CV uses two different labels.

Add only what the user confirms, with their numbers. Approximate numbers stay approximate ("~30 engineers"). Mark each answered question in `cv/questions.md` as you go.

## 4. Check and show it
1. `node cv/validate.mjs <file>` until there are no errors: every TODO answered or removed (warnings can stay if the user chose to skip them).
2. `node cv/render.mjs <file> cv/CV.pdf`, read the PDF, and tell the user to open it and compare it with their original CV. This is the moment to catch anything mis-read.
3. Summarize in a few lines: roles imported, bullets, metrics, what's still pending.
4. If you wrote `master.imported.json`, show the differences against `master.json` and ask before replacing it.

## 5. Next steps for the user
- Optional: add a list of vetoed phrases to `_note` (claims they don't want any agent to use).
- Then configure `config/search-profile.json` and run a first scout.
