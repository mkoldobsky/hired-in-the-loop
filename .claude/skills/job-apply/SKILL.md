---
name: job-apply
description: Prepares and fills applications for opportunities in status approved, stopping before Submit for the user's final OK. Only acts on what the user explicitly approved. Use for "apply", "send the approved ones".
---

# job-apply

Precondition: the opportunity is `approved` **and** the user approved it in the chat (this session, or recorded in the tracker history). Otherwise, don't apply.

## Steps (for each `approved`)
1. `node tracker/tracker.mjs get <id>` and open the posting URL in the browser.
2. **Forms that don't require an account** (e.g. Greenhouse, Lever, Ashby, Workable public forms):
   - Fill contact fields with data the user already provided (in `master.json` or in the chat). Don't make up personal data.
   - Upload the tailored PDF and, if there is a field, paste `cover.md` (or upload it as .txt).
   - Check **pre-filled answers** from previous applications: if they contradict `master.json` (years, team size, budget), don't submit; ask.
   - Screening questions: answer **only** with facts from `master.json` / `search-profile.json`. Salary, work authorization, sponsorship, demographics, policy acceptance or anything not covered → **stop and ask the user**.
   - Verify the values that actually landed in each field (some forms drop characters when typing) and review the summary page.
   - Before clicking Submit: show the user a summary of what will be sent and get the final OK.
3. **Sites that require an account or whose terms forbid automation** (Workday, SuccessFactors, some job boards): don't create accounts or enter passwords, and don't automate them. Write `applications/<id>/apply.md` with the link, the PDF to use, the cover letter and suggested answers, and tell the user to submit it themselves. Status stays `approved` with note `"external: pending user"`.
4. After sending: `node tracker/tracker.mjs set <id> '{"status":"applied","applied_at":"<ISO>","channel":"<ats-or-site>","note":"sent"}'`.
5. If a login, CAPTCHA, verification or anything unexpected appears: stop, `log` it and tell the user.
6. Final summary: sent, pending manual, blocked.
