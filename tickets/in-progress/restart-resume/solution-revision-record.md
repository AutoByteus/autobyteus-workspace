# Solution Revision Record — restart-resume (autobyteus-285)

## SR-001 — 2026-11-01 — Requirements baseline (Ready for Approval)
- Trigger: Task autobyteus-285 (the user's decision of 2026-10-30: automatic resume after an update restart).
- Basis carried from autobyteus-283; changed facts G-01..G-07 (284/339/349/305 merged; the server does not know its release version).
- DEC-001 (which non-update restarts resume) needs the user; DEC-002..004 decided by the Solution Designer.
- Design: not started.

## SR-002 — 2026-11-01 — Requirements approved by the user
- The user described the purpose (automatic beta update at night; busy runs continue; idle runs untouched) = DEC-001 = A. REQ-001..006 approved; AC-004 made concrete.

## SR-003 — 2026-11-01 — Architecture design complete
- D1: a release-identity stamp written by the server build; D2: busy runs recorded in the cleanup, before
  `app.close()`; D3: the resume after listen (consume first, update test, eligibility, at most 3 at a time, through
  the shared `resolveOrRestoreRoot` and the root's `post_message`); D4: a system notice with its own recorded sender id.
- DEC-005 (application-owned and system-owned runs not resumed) decided by the Solution Designer.
- Classification: Large / High. Routing: architecture review. Follow-ups FU-001, FU-002.
