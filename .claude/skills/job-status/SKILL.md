---
name: job-status
description: Summarizes the state of the job search from the tracker (pipeline by status, pending approvals, upcoming interviews, follow-ups due, recent activity). Use for "how are we doing?", "status", "what's pending".
---

# job-status

1. `node tracker/tracker.mjs stats` and `list`, plus the last ~20 lines of `tracker/log.md`.
2. Reply in the user's language with:
   - Funnel: found / drafted / approved / applied / replied / interview / offer / rejected.
   - **Waiting on the user**: `drafted` batches to approve, external applications pending, email drafts not sent.
   - Upcoming interviews (date, company, link to `prep.md`).
   - `applied` more than 10 days ago with no reply → suggest a follow-up (as a draft, with OK).
