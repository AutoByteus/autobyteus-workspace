# API/E2E Test-Case Ledger

## Ledger Meta

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator`
- Coverage investigation: `…/api-e2e-coverage-investigation.md`
- Execution coverage report: `…/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `…/api-e2e-revision-record.md`
- Ledger scope and reason it is required: six cases in one new real-server E2E plus several regression suites; several long-running E2E runs.
- Last updated: 2026-10-09

`…/` = `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/`. Evidence folder: `…/api-e2e-evidence/api-rev-001/`.

## Planned Cases

| Case ID | Case / Journey | REQ / AC | Boundary / Execution Surface | Planned Command Or Entry Point | Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| DCM-001 | `@` candidates per focused agent (host / Team-copy reviewer / Agent copy); missing focused ID error | REQ-001, AC-001 | Real GraphQL | New E2E (`E2E-NEW`) | 1 | |
| DCM-002 | User `@host` to the not-yet-started reviewer via `/ws/agent-collaboration` | REQ-002, REQ-004, AC-002 | Real WS + admission + note | `E2E-NEW` | 2 | |
| DCM-003 | Reviewer `send_message_to(<host address>)` reaches the existing host | REQ-006, AC-003 | Real scoped MCP → host run, Team-tab record | `E2E-NEW` | 3 | |
| DCM-004 | `list_available_agents` for reviewer / Agent copy / host; plain-words send | REQ-003, AC-006 | Real scoped MCP | `E2E-NEW` | 4 | |
| DCM-005 | `delegate_task(<host address>)` from a copy member refused | AC-009 | Real scoped MCP | `E2E-NEW` | 5 | |
| DCM-006 | Host self-mention and ineligible copy-member mention rejected | AC-009 (preserved) | Real WS (host and root streams) | `E2E-NEW` | 6 | |
| MUT-001 | Mutation control: viewer-less own definition → `E2E-NEW` must fail | AC-001 | Temporary source edit (restored) | `E2E-NEW` | 7 | Temporary probe |
| REG-001 | Contract tests (note wording, saved notes) | AC-002, data continuity | Package tests | `pnpm -C autobyteus-agent-presentation-contracts test` | 8 | |
| REG-002 | Server unit, changed owners | AC-001..009 | Vitest | targeted `vitest run` | 9 | |
| REG-003 | Ad-hoc delegation E2E, three roots | AC-007, AC-009, host view | Real server | `ad-hoc-task-delegation.e2e.test.ts` | 10 | |
| REG-004 | Lazy member activation + task reactivation E2E | Copy lifecycle regression | Real server | two E2E files | 11 | |
| REG-005 | Web unit for changed specs | AC-001, QR-001 | Vitest/Nuxt | `test:nuxt … --run` | 12 | |
| REG-006 | Server build typecheck | — | tsc | `tsc -p tsconfig.build.json --noEmit` | 13 | |
| REG-007 | PM-startup migration E2E (updated caller, built dist) | AC-009 caller | Built dist | `remove-built-in-project-task-manager-startup.e2e.test.ts` | 14 | needs `build` |

`E2E-NEW` = `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<worktree>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/delegated-copy-member-contact-host.e2e.test.ts --no-watch`

## Execution Events

| Seq | Case ID | Timestamp | Event | Command / Configuration | Expected | Observed | Result | Evidence | Next Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | DCM-001..006 | 07:52 | Completed (run 1) | `E2E-NEW` | all pass | 1/1 pass; receipt showed Team-tab record lookup used the wrong path (`communicationRecorded:false`) | Pass (with assertion gap) | `dcm-e2e-run1.log` | Tighten assertions |
| 2 | DCM-001..006 | 07:53 | Completed (runs 2, 3) | `E2E-NEW` after tightening (Team-tab record required, exact host run ID on delivery, refusal `target_agent_run_id:null`) | all pass | 1/1 pass twice; `teamTabRecord` reviewer → host with marker; cleanup clean | Pass | `dcm-e2e-run2.log`, `dcm-e2e-run3.log`, `delegated-copy-member-contact-host.json` | — |
| 3 | MUT-001 | 07:55 | Completed | `ownDefinition = hostDefinition` temporarily, `E2E-NEW` | Fail | Fail: `expected [ 'dcm-lead-…', …(4) ] to include 'dcm-manager-…'`; source restored, clean diff | Pass (control detected defect) | `dcm-e2e-mutation-own-definition.log` | — |
| 4 | REG-001 | 07:56 | Completed | contracts test | pass | 16/16 | Pass | `contracts-test.log` | — |
| 5 | REG-002 | 07:57 | Completed | `vitest run tests/unit/agent-collaboration tests/unit/standalone-agent-run-root tests/unit/agent-team-execution tests/unit/agent-org-execution tests/unit/services/agent-streaming tests/unit/api/graphql tests/unit/agent-tools` | pass | 158 files / 1120 tests pass | Pass | `server-unit-targeted.log` | — |
| 6 | REG-003 | 07:59 | Completed | ad-hoc E2E (same env) | pass | 3/3 (Agent, Team, Org) | Pass | `ad-hoc-e2e.log`, `ad-hoc-task-delegation.json` | — |
| 7 | REG-005 | 08:01 | Completed | `test:nuxt services/collaborators composables/agentInput composables/runSettings stores/__tests__/agentRunCollaborationStore.spec.ts utils --run`; `test:nuxt components/agentInput --run` | pass | 78 files/470 tests; 7 files/44 tests | Pass | `web-unit-targeted.log`, `web-unit-agentInput-components.log` | — |
| 8 | REG-006 | 08:02 | Completed | `tsc -p tsconfig.build.json --noEmit`; `tsc -p tsconfig.json` filtered for the new file | clean | clean; no errors in new file | Pass | `server-tsc-build.log` | — |
| 9 | REG-004 | 08:00 | Started | lazy activation + reactivation E2E (background) | pass | running | — | `lazy-and-reactivation-e2e.log` | await |
| 10 | REG-004 | 08:05 | Completed | same | pass | 8 pass, 2 skipped (opt-in `RUN_CLAUDE_E2E`); `TASK_AGENT_RESOURCE_STOP_FAILED` logs are from the suite's DONE-race case | Pass | `lazy-and-reactivation-e2e.log` | — |
| 11 | REG-007 | 08:08 | Completed | `prebuild && build`; PM-startup E2E | pass | 4/4 | Pass | `server-build.log`, `pm-startup-e2e.log` | — |
| 12 | BJ-001, BJ-002 | 08:12 | Completed (run-1) | `node browser-probe/dcm-browser-journey.mjs <worktree> browser-probe/run-1` | both pass | BJ-001 Pass; BJ-002 timed out: probe typed `@Project Man` (space ends the `@` token) | BJ-002 Not Tested (probe error) | `browser-probe/run-1/` | fix probe |
| 13 | BJ-001, BJ-002 | 08:16 | Completed (run-2) | same, `run-2`, `@Project` | both pass | both Pass; 0 browser errors; cleanup clean | Pass | `browser-probe/run-2/evidence.json`, screenshots | — |
| 14 | DCM-007 | 08:20 | Completed | `E2E-NEW` runs 4, 5 with DCM-007 added | pass | Pass ×2; stored views and restore-on-send correct | Pass | `dcm-e2e-run4.log`, `dcm-e2e-run5.log` | — |

## Re-entry And Reconciliation

- Last durably recorded event: Seq 14
- Last completed case and result: DCM-007 Pass
- Cases still running or not started: none
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md`, "Test-Case Ledger Reconciliation"
