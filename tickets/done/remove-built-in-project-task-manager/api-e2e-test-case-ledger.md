# API/E2E Test-Case Ledger

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager` (HEAD `62af418df`)
- Coverage investigation: `api-e2e-coverage-investigation.md`
- Execution coverage report: `api-e2e-execution-coverage-report.md`
- API/E2E revision record: `api-e2e-revision-record.md`
- Ledger scope and reason it is required: four multi-restart built-process cases, repository suites and temporary probes (long-running, interruption-prone).
- Last updated: 2026-10-06

## Planned Cases

| Case ID | Case / Journey | Requirement / Acceptance-Criteria IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | Server build, including the built-in smoke | AC-001 | Build output | `pnpm -C autobyteus-server-ts build` | 1 | |
| R-002 | Focused server unit + integration | AC-001..006, AC-009 | In-process | vitest (built-in-agents, app-data-migrations, agent-collaboration, integration) | 2 | |
| E-001 | Studio upgrade: removed once, one PTM, preserved bytes, restart no-op | AC-002, AC-003, AC-006 | Built Studio `dist/app.js`, GraphQL | new E2E file | 3 | |
| E-002 | Studio FAILED window, then retry; old run history, continue failure, other run, `@` | AC-004, AC-008, AC-009 | Built Studio, GraphQL + WS, emulated LM Studio | new E2E file | 3 | |
| E-003 | Fresh install: nothing created, SKIPPED | AC-001, AC-005 | Built Studio | new E2E file | 3 | |
| E-004 | Standalone host first: failure non-blocking, then removal; shared record | AC-002, AC-004, QR-001 | Built `dist/index.js` host + Studio | new E2E file | 3 | |
| R-003 | Projects E2E regression | AC-007 | Built dist, HTTP/MCP | `vitest run tests/e2e/projects` | 4 | |
| R-004 | Projects / tools unit suites | AC-007 | In-process | TESTING.md Project unit command | 5 | |
| R-005 | Web mirror / mention / history store | AC-009, REQ-006 | Nuxt unit | `test:nuxt utils/agents utils/collaborators stores/__tests__/runHistoryStore.spec.ts` | 6 | |
| TMP-001 | Real cross-version upgrade (base dist, then new dist) | AC-002, AC-006, AC-008 | Two built servers on one owned data dir | temporary probe | 7 | Decided after the scorecard |
| TMP-002 | Browser history / continue for the old run | AC-008 (UNK-001) | Nuxt dev + headless browser against the owned backend | temporary probe | 8 | Decided after the scorecard |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | R-001 | 2026-10-06 | Completed | `pnpm -C autobyteus-server-ts build` at `62af418df` | Exit 0; smoke passes; dist templates without PTM | Exit 0; "Built-in agents bootstrap smoke check passed"; `dist/built-in-agents/templates` = `daily-assistant`, `retrospective-skill-improver` | Pass | `api-e2e-evidence/r-001-build.log` | Write E2E |
| 2 | E-001..E-004 | 2026-10-06 | Completed | `vitest run tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts` (first run) | All pass | 4/4 passed (18 s) | Pass | `api-e2e-evidence/e-001-004-run1.log` | Capture AC-008 payload; negative control |
| 3 | E-002 | 2026-10-06 | Checkpoint | Temporary instrumentation (reverted, `cmp` identical) | Continue fails with the not-found failure | ACK `state: failed`, `code: RUN_NOT_FOUND`, `"AgentDefinition with ID autobyteus-project-task-manager not found."`; status `error` with the same message; history lists the run under "Project Task Manager"; projection holds both messages | Pass (checkpoint) | `api-e2e-evidence/e-002-continue-events.json`, `e-002-history-and-projection.json` | Pin `code`/`state` in the test |
| 4 | E-001..E-004 | 2026-10-06 | Checkpoint | Negative control: migration registration commented out in `dist/.../app-data-migration-registry.js` (restored, `cmp` identical) | All four cases fail | 4/4 failed | Pass (discriminates) | `api-e2e-evidence/negative-control-unregistered.log` | Final run |
| 5 | E-001..E-004 | 2026-10-06 | Completed | Final E2E file (with `RUN_NOT_FOUND`/`failed` pinned) | All pass | 4/4 passed | Pass | `api-e2e-evidence/e-001-004-final.log` | R-002 |
| 6 | R-002 | 2026-10-06 | Completed | `vitest run tests/unit/built-in-agents tests/unit/app-data-migrations tests/unit/agent-collaboration tests/integration/app-data-migrations/remove-built-in-project-task-manager-startup.integration.test.ts` | All pass | 70 files, 581 tests passed | Pass | `api-e2e-evidence/r-002-server-focused.log` | R-003 |
| 7 | R-003 | 2026-10-06 | Completed | `vitest run tests/e2e/projects` (current dist) | All pass | 4 files, 21 tests passed | Pass | `api-e2e-evidence/r-003-projects-e2e.log` | R-004 |
| 8 | R-004 | 2026-10-06 | Completed | `vitest run tests/unit/projects tests/unit/agent-tools/project-tasks tests/unit/agent-tools/task-delegation` | All pass | 11 files, 170 tests passed | Pass | `api-e2e-evidence/r-004-projects-unit.log` | R-005 |
| 9 | R-005 | 2026-10-06 | Completed | `pnpm -C autobyteus-web test:nuxt utils/agents utils/collaborators stores/__tests__/runHistoryStore.spec.ts --run` | All pass | 4 files, 57 tests passed | Pass | `api-e2e-evidence/r-005-web.log` | Scorecard → TMP-001/TMP-002 |
| 10 | TMP-001 | 2026-10-06 | Checkpoint | Base worktree `/tmp/ptm-base-api-e2e` at `1aa918298`: install, prebuild, build | Base dist ships the PTM template | Exit 0; base templates `daily-assistant`, `project-task-manager`, `retrospective-skill-improver` | — | `api-e2e-evidence/tmp-001-base-build.log` | Run the probe |
| 11 | TMP-001/TMP-002 | 2026-10-06 | Checkpoint | Probe attempts 1–6 | — | Probe-mechanics failures only, each fixed in turn: (1) argv realpath (`/tmp` → `/private/tmp`); (2–5) collapsed history rows and the double `aria-expanded` toggle; (6) composer textarea has `role=combobox`. TMP-001 passed in attempts 2–6. | — | `api-e2e-evidence/tmp-001-002-attempt*/` | Rerun |
| 12 | TMP-001, TMP-002 | 2026-10-06 | Completed | `node api-e2e-evidence/tmp-001-002-upgrade-browser-probe.mjs /tmp/ptm-base-api-e2e api-e2e-evidence/tmp-001-002-run7` | Real upgrade removes the copy once; old run listed, readable, continue fails like a deleted agent; app keeps working | All 6 probe steps Pass. Base-written copy byte-equal to FX-001. New start SUCCEEDED attempts 1; preserved bytes identical. Browser: "Project Task Manager (1)"; messages rendered; continue shows "An Error Occurred — AgentDefinition with ID autobyteus-project-task-manager not found."; other run continued; 0 page/console errors. Cleanup receipts all clean; base worktree removed. | Pass | `api-e2e-evidence/tmp-001-002-run7/` | Write report |

## Re-entry And Reconciliation

- Last durably recorded event: 12 (TMP-001/TMP-002 Pass)
- Last completed case and result: TMP-002 Pass. All planned cases are complete and pass.
- Cases still running, interrupted, or not started: None
- Next case or recovery action: handoff
- Interruption, context-compression, or rerun note: Probe attempts 1–6 are retained as evidence of probe-mechanics iteration. They are not product failures.
- Reconciled into execution coverage report: `Yes` (`api-e2e-execution-coverage-report.md` → Test-Case Ledger Reconciliation)
- Reconciliation note for any case missing a terminal result: N/A
