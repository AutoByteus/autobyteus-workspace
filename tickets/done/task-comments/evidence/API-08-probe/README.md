# API-08 — the thread live in the Task page and the tab, adding from both, board search (AC-003, AC-004, AC-016, REQ-007)

- Command (worktree root): `node tickets/in-progress/task-comments/evidence/API-08-probe/comments-live-probe.mjs --output-dir <fresh dir>`
- Commit: code `e014c349b8`; backend `autobyteus-server-ts/dist/app.js` built from it; Nuxt dev of `autobyteus-web`; headless Chrome; the Manager on the scripted AGY CLI (`AGY_FAKE_CASE=linked_skills`). Date 2026-10-22.
- Result: `run1/evidence.json` → `cases.API-08.result: "Pass"`; `before` (2 agent comments, page = tab, empty state "No comments yet.", card order), `after` (5 comments `task-comment-1..5`: tab add, page add, Manager add, each live in the other view; blank Add disabled; box cleared), `stored` (description unchanged, ids 1–5), `boardSearch` (`quokka` → only the commented Task; cleared → all 3), `browserErrors: []`, `cleanup`.
- Screenshots: `run1/API-08-page-before.png`, `run1/API-08-tab-before.png`, `run1/API-08-page-after.png`, `run1/API-08-tab-after.png`, `run1/API-08-board-search-quokka.png`.
