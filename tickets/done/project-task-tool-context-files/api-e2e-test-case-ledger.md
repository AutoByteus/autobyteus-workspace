# API/E2E Test-Case Ledger

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files`
- Coverage investigation: `api-e2e-coverage-investigation.md` (same folder)
- Execution coverage report: `api-e2e-execution-coverage-report.md` (same folder)
- API/E2E revision record: `api-e2e-revision-record.md` (same folder)
- Ledger scope and reason it is required: round 1 (API-REV-001); several independent cases including a long-running gated scripted-actor journey.
- Last updated: 2026-10-08

## Planned Cases

| Case ID | Case / Journey | Requirement / Acceptance-Criteria IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| UNIT-REG | Unit/architecture regression | All (unit layer) | Vitest unit | `vitest run tests/unit/projects tests/unit/agent-tools tests/unit/context-files tests/unit/agent-collaboration tests/architecture` | 1 | |
| BUILD | prebuild + build + production tsc | – | Build | `prebuild`, `build`, `tsc -p tsconfig.build.json --noEmit` | 2 | |
| CTX-E2E-001 | MCP/native create + patch success, reads, sources deleted, UI append/remove | AC-001, 002, 003, 004, 006, 009, 011 | Real Studio HTTP + Agent Tools MCP + GraphQL + REST + disk | `vitest run tests/e2e/projects/project-task-boundaries.e2e.test.ts` | 3 | |
| CTX-E2E-002 | Error contract and atomicity, DONE + invalid file | AC-004, 005, 008 | same | same | 3 | |
| CTX-FIX-001 | Fake AGY READ_REFERENCE_FILES route | RU-003 | Local process | `vitest run tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts` | 4 | |
| CTX-E2E-003 | Live linked delegation with agent-attached files; DONE atomicity with a live run; ad-hoc rejection | AC-005, 007, 010 | Real HTTP/WS/scoped MCP + scripted AGY | gated `project-task-context-files-delegation.e2e.test.ts` | 5 | |
| E2E-REG | `tests/e2e/projects` ungated and AGY-gated regression | Preserved DONE/closure/reactivation/ad-hoc/feed | Server E2E | `vitest run tests/e2e/projects` (both modes) | 6 | |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | UNIT-REG | 2026-10-08 08:15 | Completed | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/projects tests/unit/agent-tools tests/unit/context-files tests/unit/agent-collaboration tests/architecture --no-watch` | All pass | 88 files, 790 tests pass | Pass | api-e2e-evidence/logs/unit.log | – |
| 2 | BUILD | 2026-10-08 08:17 | Completed | `prebuild`, `build`, `tsc -p tsconfig.build.json --noEmit` | Exit 0 | build + bootstrap smoke pass; tsc exit 0 | Pass | api-e2e-evidence/logs/build.log, tsc.log | – |
| 3 | CTX-E2E-001 | 2026-10-08 08:17 | Completed | `vitest run tests/e2e/projects/project-task-boundaries.e2e.test.ts` (first attempt) | Pass | Failed at the test's own `updateProjectTask` call: GraphQL 400 because `description` is required and the test omitted it (the app always sends it). Test defect, not product | Fail (test) | api-e2e-evidence/logs/boundaries.log (overwritten by rerun) | Fix test input to match `useProjectTaskDraft` save |
| 4 | CTX-E2E-002 | 2026-10-08 08:17 | Completed | same run | Pass | Passed in the first attempt | Pass | same | – |
| 5 | CTX-E2E-001 | 2026-10-08 08:22 | Completed | same command, rerun after the test fix | Pass | 10/10 tests in the file pass (8 existing + CTX-E2E-001/002) | Pass | api-e2e-evidence/logs/boundaries.log | – |
| 6 | CTX-FIX-001 | 2026-10-08 08:31 | Completed | `vitest run tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts` | New route + existing routes pass | 15/15 pass (new READ_REFERENCE_FILES case + 14 existing) | Pass | api-e2e-evidence/logs/routing.log | – |
| 7 | CTX-E2E-003 | 2026-10-08 08:31 | Completed | `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs TASK_CONTEXT_FILES_E2E_EVIDENCE_DIR=<ticket>/api-e2e-evidence vitest run tests/e2e/projects/project-task-context-files-delegation.e2e.test.ts` | Worker lists and reads saved copies; bad DONE closes nothing; ad-hoc refuses files | Pass; worker message lists 3 saved paths, worker sha256/size match sources; TASK_CONTEXT_FILE_UNAVAILABLE names the path; no closure frame, closedAt null, worker messageable; corrected DONE closes worker; ad-hoc TASK_CONTEXT_INVALID, task.json byte-identical; cleanup receipt all true | Pass | api-e2e-evidence/project-task-context-files-delegation.json; api-e2e-evidence/logs/delegation.log | – |
| 8 | MUTATION | 2026-10-08 08:34 | Completed | Temporary source mutations (restored with `git checkout`): (a) local import moved into the DONE write callback (after closure); (b) ad-hoc rejection removed | New cases fail | (a) CTX-E2E-002 fails (run resource changed) and CTX-E2E-003 fails (closure frame emitted); (b) CTX-E2E-003 fails at the ad-hoc refusal | Pass (sensitivity shown) | api-e2e-evidence/logs/mutation.log, mutation2.log | Source verified clean (`git status` src empty) |
| 9 | E2E-REG | 2026-10-08 08:36 | Completed | `vitest run tests/e2e/projects` (ungated), then the same with `env -u AUTOBYTEUS_* RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs fixture>` | All pass; gated suites skip cleanly ungated | Ungated: 4 files pass, 5 skipped; 26 pass / 19 skipped. Gated: 9/9 files; 44 pass / 1 skipped (Claude-only reactivation case) | Pass | api-e2e-evidence/logs/e2e-projects-ungated.log, e2e-projects-gated.log | – |
| 10 | BV-001 | 2026-10-08 08:25 | Started | Temporary owned stack `api-e2e-evidence/bv-001-stack.mjs`: worktree `dist/app.js` + fake AGY + Nuxt dev (`BACKEND_NODE_BASE_URL`) | – | Backend healthy; Manager run's own MCP `create_or_update_task` attached `/private/tmp/.../Screenshot … AM.png` + `repro-notes.md`; sources deleted; Nuxt ready | – | api-e2e-evidence/bv-001-stack.json | Drive Task page |
| 11 | BV-001 | 2026-10-08 08:26 | Completed | Browser tab on `/projects/<id>/tasks/<taskId>` (DOM via run_script, screenshot) | Task page lists both files; screenshot shows an image preview; sizes/types shown | "Context Files (2)": `Screenshot 2026-10-08 at 10.15.32 AM.png` "Image · 70 B" with thumbnail decoded (naturalWidth 1); `repro-notes.md` "File · 56 B"; Preview opens an inline preview panel with the decoded image. Stack stopped; owned data/sources removed; ports released | Pass | api-e2e-evidence/bv-001-task-page.png, bv-001-stack.json, bv-001-backend.log, bv-001-frontend.log | – |

## Re-entry And Reconciliation

- Last durably recorded event: 11 (BV-001 Completed)
- Last completed case and result: BV-001 Pass
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none
- Interruption, context-compression, or rerun note: CTX-E2E-001 first attempt failed on a test-input defect (fixed, rerun Pass)
- Reconciled into execution coverage report: `Yes` — api-e2e-execution-coverage-report.md §Test-Case Ledger Reconciliation
- Reconciliation note for any case missing a terminal result: –
