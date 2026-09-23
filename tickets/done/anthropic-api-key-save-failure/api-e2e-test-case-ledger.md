# API/E2E Test-Case Ledger — Anthropic credential save

- Worktree: `/home/autobyteus/workspace/.codex/worktrees/anthropic-api-key-save-failure`
- Investigation: `api-e2e-coverage-investigation.md`; report: `api-e2e-execution-coverage-report.md`; revision: `api-e2e-revision-record.md` (relative to this ticket).
- Required for multiple meaningful cases and service/browser execution. Initialized before execution on 2026-09-23 UTC.

| Case ID | Planned case | AC | Surface | State |
| --- | --- | --- | --- | --- |
| API-CASE-001 | Focused repository regression + shared callers | AC-001/004 | Vitest | Pass |
| API-CASE-002 | Real isolated backend, browser save/repeat/refresh, value-free API | AC-002/003/004 | API + Chromium | Pass |
| API-CASE-003 | Genuine rejection feedback | AC-001 | Browser GraphQL rejection | Pass |
| API-CASE-004 | Guards/build/cleanup | AC-002/004 | Repository/process | Pass |

## Execution events
| Seq | Case | UTC | Event | Command / configuration | Expected | Observed | Result | Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | API-CASE-001 | 2026-09-23T04:46:07Z | Started | Four focused Nuxt Vitest files, including new shared-caller test | Focused regressions pass | Pending | N/A | `evidence/api-e2e/focused-vitest.log` | Run tests |
| 2 | API-CASE-001 | 2026-09-23T04:47:00Z | Completed | `pnpm test:nuxt ... --run` | Focused regressions pass | 4 files, 35 tests passed; new Qwen/Gemini/custom shared-caller regression passed | Pass | `evidence/api-e2e/focused-vitest.log` | Browser real-backend validation |
| 3 | API-CASE-002 | 2026-09-23T04:47:09Z | Started | Build worktree server, then isolated DB/Chromium probe | Initial false, success immediate true/refresh true, value-free | Build pending | N/A | `evidence/api-e2e/server-build.log` | Build and launch |
| 4 | API-CASE-002 | 2026-09-23T04:49:07Z | Checkpoint | `pnpm -C autobyteus-server-ts build` | Worktree server built | Pass, sanitized bootstrap smoke passed | N/A | `evidence/api-e2e/server-build.log` | Launch runtime |
| 5 | API-CASE-003 | 2026-09-23T04:49:08Z | Started | Browser intercepted only `SaveProviderApiKey` with GraphQL error | Failure toast, retained input/status, no backend write | Pending | N/A | `evidence/api-e2e/browser/result.json` | Observe rejection |
| 6 | API-CASE-003 | 2026-09-23T04:49:35Z | Completed | Same isolated browser run | Genuine rejection truthfully reported | Failure alert visible; input retained, Not Configured, backend status false | Pass | `evidence/api-e2e/browser/result.json` | Real success path |
| 7 | API-CASE-002 | 2026-09-23T04:49:35Z | Completed | Isolated backend + Nuxt + Chromium, first/repeat save and refresh | Immediate Configured/success/clear, value-free, unrelated unchanged | Both real saves HTTP 200/configured=true; immediate UI success/clear; refresh true; OpenAI still false; no post-success read-only error; temp root/processes removed | Pass | `evidence/api-e2e/browser/result.json`, `before-save.png`, `after-save.png`, backend/frontend logs | Broader repository checks |
| 8 | API-CASE-004 | 2026-09-23T04:50:29Z | Started | Web boundary/localization guards and production build | Pass; no owned processes/data remain | Pending | N/A | `evidence/api-e2e/repository-checks.log` | Execute |
| 9 | API-CASE-004 | 2026-09-23T04:51:53Z | Completed | Web boundary/localization guards, Nuxt build, diff check, process/temp cleanup | Pass and owned resources removed | Both guards and build passed; diff check clean; browser-owned child PIDs absent; isolated temp root removed; generated untracked SDK builds removed | Pass | `evidence/api-e2e/repository-checks.log`, `browser/result.json` | Final report |
| 10 | API-CASE-002/003 | 2026-09-23T04:52:32Z | Started | Registered package E2E command with default server build after generated-contract cleanup | Self-contained clean-worktree rerun passes | Pending | N/A | `evidence/api-e2e/browser-recheck/` | Rerun durable command |
| 11 | API-CASE-002/003 | 2026-09-23T04:53:51Z | Completed | `pnpm test:e2e:provider-api-key-save` with default worktree-server build | Self-contained clean-worktree rerun passes | Pass; isolated real save/repeat/refresh and injected GraphQL rejection, all owned resources removed | Pass | `evidence/api-e2e/browser-recheck/result.json`, `browser-recheck/server-build.log` | Final report |

## Reconciliation
- Last completed event: API-CASE-002/003 recheck Pass; API-CASE-001–004 all Pass.
- Unstarted: None.
- Report reconciliation: Yes — `api-e2e-execution-coverage-report.md` § Ledger reconciliation.
