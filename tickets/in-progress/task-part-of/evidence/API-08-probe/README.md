# API-08 — live cascade in the browser (AC-018 "boards update live", AC-008 web, AC-009–011, tab)

- Command (worktree root): `node tickets/in-progress/task-part-of/evidence/API-08-probe/parts-live-probe.mjs --output-dir <fresh dir>`
- Commit: code `179ddb9f77`; backend `autobyteus-server-ts/dist/app.js` built from it; Nuxt dev of `autobyteus-web`; headless Chrome; scripted AGY CLI (`AGY_FAKE_CASE=linked_skills`). Date 2026-10-19.
- Result: `run1/evidence.json` → `cases.API-08.result: "Pass"`, `before` / `after` DOM state, `cancelled.task.closedParts`, `after.boardGraphqlRequestsDuringCascade: 0`, `browserErrors: []`, `cleanup` (processes terminated, data root removed, no live AGY process of the run).
- Screenshots: `run1/API-08-*-before.png`, `run1/API-08-*-after.png` (board, parent page, part page, tab).
