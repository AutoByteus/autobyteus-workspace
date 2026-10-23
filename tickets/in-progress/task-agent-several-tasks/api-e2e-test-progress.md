# API/E2E Test Progress — task-agent-several-tasks

Your own progress log while tests run. Only add rows; never change earlier ones.

- Execution coverage report: `tickets/in-progress/task-agent-several-tasks/api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-23 08:00 | API-00 | Started | | Gated whole projects folder + app-data-migrations on HEAD e421b2896d; log /tmp/ast-e2e/baseline-folder.log; no edits to existing test files until it completes |
| 2026-10-23 15:09 | API-05 | Started | | New suite task-agent-several-tasks.e2e.test.ts (gated) run 1, parallel to API-00; log /tmp/ast-e2e/run-sev1.log |
| 2026-10-23 15:11 | API-05 | Checkpoint | | Run 1: 3 pass; SEV-E2E-003 my test error (delegating a DONE Task is refused as before; reopen first, as the unit test does). Fixed; run 2 |
| 2026-10-23 15:19 | API-00 | Completed | Pass | Baseline: 9 failed = 7 stale pins (boundaries 663, 846; existing-copy 404 x3, 731, 866) + 2 delegated-launch-config-defaults (stale since autobyteus-197, task-comments FU-003) |
| 2026-10-23 15:19 | API-05 | Completed | Pass | Run 2: 4/4 |
| 2026-10-23 15:19 | API-01..04 | Started | | Edited pins; run project-task-boundaries + task-existing-copy-assignment (gated); log /tmp/ast-e2e/run-pins.log |
| 2026-10-23 15:23 | API-01..04 | Completed | Pass | boundaries 16/16; existing-copy 7 pass 2 skipped; race outcomes both orders |
| 2026-10-23 15:23 | API-06 | Started | | Folder gated after edits (background) /tmp/ast-e2e/run-folder.log; Electron build /tmp/ast-e2e/electron-build.log |
| 2026-10-23 15:30 | API-07 | Started | | Electron build exit=0; instance start (root init) /tmp/ast-e2e/desktop-root |
| 2026-10-23 15:40 | API-06 | Completed | Pass | 35/36 files; only delegated-launch-config-defaults (FU-002) |
| 2026-10-23 15:40 | API-07 | Completed | Fail | J1-J5 Pass but the Assigned-to help text states the old stop rule (API-F-001); instance stopped, root removed |
| 2026-10-23 15:40 | — | Completed | Fail | Test code 386ce18b5f; artifacts commit next; handoff to code reviewer (failure-origin) |
