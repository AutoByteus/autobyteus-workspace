# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness/tickets/in-progress/agy-background-task-turn-liveness/requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness/tickets/in-progress/agy-background-task-turn-liveness/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness/tickets/in-progress/agy-background-task-turn-liveness/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness/tickets/in-progress/agy-background-task-turn-liveness/design-spec.md`
- Supplemental Task Artifacts: `probes/agy-daemon-stream-order-probe.py` (P1) and `probes/agy-background-task-turn-end-probe.py` (P2), both in the ticket folder
- Design Review Report: `N/A — not applicable` (architecture review not selected, Small/Low)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness/tickets/in-progress/agy-background-task-turn-liveness/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness/tickets/in-progress/agy-background-task-turn-liveness/implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: `N/A` (not a delivery re-entry)
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness/tickets/in-progress/agy-background-task-turn-liveness/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness/tickets/in-progress/agy-background-task-turn-liveness/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: Implementation Complete (IR-001, commit `5dd87a33f`) from `/implementation_engineer`
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

These behaviors must be proven:

- REQ-001 / AC-001: there is no silence-based kill during an AGY turn.
- REQ-002: turns still end on `result`, on process exit or stream failure, and on Stop/Terminate.
- REQ-003 / AC-002: a tool step that is still unfinished when `result` arrives is closed as `TOOL_EXECUTION_SUCCEEDED`. It carries `provider_state: "RUNNING"` and the fixed background output, and it comes before `TURN_COMPLETED` or the turn `ERROR`.
- REQ-004 / AC-003: existing semantics are unchanged, and Stop or process death still yields `TURN_INTERRUPTED`.
- AC-004: the real-AGY scenarios SCN-001 (daemon, then continued work) and SCN-002 (non-daemon background task running longer than 5 minutes) both work.

Design risk: a late daemon event could arrive after `result`. The design asks for a quiet window of at least 2 minutes to be observed.

Design escalation trigger: a consumer (memory sequencer, replay, web projection) could reject or mis-render the new SUCCEEDED event.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001: AGY turn idle watchdog | Removed | design D1; diff `agy-stream-process.ts` | Unit test with fake timers (exists). A real AGY silent window longer than 300 s must be observed live (SCN-002). |
| BEH-002: background closure at `result` | Added | design D2; diff `agy-stream-event-converter.ts` | Converter and lifecycle unit tests exist. It must also be proven through the real server's WebSocket, memory and history projection, and with real AGY. |
| BEH-003: non-daemon background task holds the turn | Preserved | CUR-5 | Live SCN-002 |
| Stop/process death → `TURN_INTERRUPTED` | Preserved | REQ-004, AC-003 | Unit test exists. Also check through the real server (fake transport and real AGY). |
| Startup timeout, protocol, stdin failures | Preserved | REQ-002 | Unit (`agy-stream-process.test.ts`) plus existing suites |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Converter projection; process liveness | Converter, lifecycle and process unit tests | Real AGY stream shape and timing | Live real AGY |
| API / transport / contract | Yes (event values) | WebSocket `TOOL_EXECUTION_SUCCEEDED` with `provider_state: "RUNNING"` right before `TURN_COMPLETED` | None through the real server | Stream mapper, memory writer and projection handling of the new event | Real server + fake AGY transport (durable); real server + real AGY (live) |
| Frontend component / state | Indirect | The existing web tool card renders a succeeded result; `provider_state` is read only for denial | Investigation grep + existing web handler/hydration unit harness | RUNNING-specific rendering not asserted in the web | Web unit coverage added (WEB-001), revised during execution |
| Browser integration / user journey | No | — | — | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No new UI | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | AGY child process lifetime during long silent turns; Stop kills AGY and its background tasks | Unit test with mocked spawn | Real process lifetime longer than 5 minutes; whether real background tasks die on Stop (ASM-001) | Live real AGY |
| Persisted-data transition | Yes (new tool result rows) | Memory trace records a result for the daemon tool call | None | Sequencer and replay of a RUNNING succeeded result | Real server history projection |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | AGY CLI 1.2.12 stream-json | Probes P1/P2 (raw AGY only, not through AutoByteus) | End-to-end behavior through AutoByteus code | Live real AGY through the real server |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness`
- Project type and runtime stack: pnpm monorepo. Server is `autobyteus-server-ts` (Node, TypeScript, Fastify, GraphQL, WebSocket, Prisma/SQLite), tested with vitest (`pool: forks`, `fileParallelism: false`).
- Conflicting, missing, or unclear project instructions: none. The e2e opt-in env gates are defined inside each test file.
- Required environment variables or secrets available: `Yes`. The local `agy` 1.2.12 is signed in, and no secrets are needed in the repo.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/package.json` | Scripts | `vitest` for tests; `tsc -p tsconfig.build.json` for build |
| `autobyteus-server-ts/vitest.config.ts` | Test runner | Includes `tests/**/*.test.ts`; Prisma global setup |
| `implementation-handoff.md` Environment notes | Worktree setup | `pnpm install`, `prisma generate`, `pnpm prepare:shared` (already done by implementation) |
| `tests/e2e/runtime/agy-failure-transport.e2e.test.ts`, `agy-native-image-step-output.e2e.test.ts` | Real-server fake-AGY pattern | Gate: `RUN_AGY_FAILURE_E2E=1` + `ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs`; cases selected by `AGY_FAKE_CASE` |
| `tests/e2e/runtime/agy-native-image-app-chat.e2e.test.ts` | Real-server real-AGY pattern | `startStudioE2eRuntimeServer`, GraphQL `createAgentRun` with `runtimeKind: "antigravity_cli"`, WebSocket `/ws/agent/<runId>`, `getRunProjection` for history |
| `src/runtime-management/antigravity-cli-capability.ts` | AGY command resolution | `ANTIGRAVITY_CLI_COMMAND` overrides `agy` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| In-process AutoByteus server | `autobyteus-server-ts` | `startStudioE2eRuntimeServer()` inside the test | Random ports, temp app-data dir | Returns `mainUrl` | `app.close()`, `rm` temp dir |
| Real AGY CLI | per-run capsule | Spawned by the backend | Uses the user's AGY login; separate conversations | AGY `init` | `terminateAgentRun` / interrupt → SIGTERM |
| Daemon under test (`python3 -m http.server <free port>`) | temp workspace | Started by the AGY model | Free port chosen by the test (not 29695/5199) | TCP connect | Killed with AGY on terminate; the test asserts the port is closed |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent definition | GraphQL `createAgentDefinition` in temp app-data | Isolated from the user's `~/.autobyteus` app (port 29695 untouched) | `deleteAgentDefinition` + temp dir removed |
| Fake AGY stream cases | New `AGY_FAKE_CASE` values in `tests/fixtures/agy-failure-cli.mjs` | Deterministic | None |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration` (design: "No Migration Required")
- Design-spec and implementation-handoff references: design "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check"
- Representative setup: a new turn persists the daemon tool result through the normal runtime memory writer. The normal reader (`getRunProjection`) must replay it as `tool_call` with `toolResult {provider_state:"RUNNING", output}` and activity status `success`, both live and after terminate.
- Historical traces: no schema change. Existing projection suites cover the unchanged reader.
- Upstream ambiguity: none

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Req / AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/.../antigravity/agy-stream-process.test.ts` (new in IR-001) | 30 min of fake silence does not kill; mid-turn exit fails; startup timeout rejects | AC-001, REQ-002 | Still Valid | Reviewed file; pass | Keep |
| `tests/unit/.../antigravity/agy-stream-event-converter.test.ts` (+5 cases) | Background closure ordering, identity, non-SUCCESS, finished steps not closed, interrupt | AC-002, AC-003 | Still Valid | pass | Keep |
| `tests/unit/.../antigravity/agy-turn-lifecycle.test.ts` (+2 cases) | Backend-level closure; close mid-turn → interrupted | AC-002, AC-003 | Still Valid | pass | Keep |
| `tests/e2e/runtime/agy-failure-transport.e2e.test.ts` | Denied tool and terminal error through the real server | REQ-004 | Still Valid | pass (fake transport) | Keep; rerun as regression |
| `tests/e2e/runtime/agy-native-image-step-output.e2e.test.ts` | Native image DONE through the real server and history | REQ-004 | Still Valid | pass | Keep; rerun as regression |
| `tests/unit/.../antigravity/agy-production-live.test.ts`, `agy-restore-live.test.ts`, `agy-mcp-team-live.test.ts` | Real AGY basics | Not changed behavior | Out Of Scope | — | None |
| Any test that asserts `AGY_TURN_IDLE_TIMEOUT` | — | — | None exist | `grep TURN_IDLE\|turnIdle` finds only ACP | None |

## Stale Or Obsolete Coverage Decisions

None. No existing test asserted the removed idle-timeout behavior.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Req / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| E2E-BG-001 | Daemon step closed as background success through the real server: WebSocket order, memory, `getRunProjection` (live and after terminate), next turn accepted | AC-002, REQ-003, design escalation trigger | `autobyteus-server-ts/tests/e2e/runtime/agy-background-task-transport.e2e.test.ts` + new fake cases in `tests/fixtures/agy-failure-cli.mjs` | Unit tests stop at the backend. The WebSocket mapper, memory sequencer and replay are the consumers named in the design's escalation trigger. |
| E2E-BG-002 | Stop during a daemon turn through the real server: `TURN_INTERRUPTED`, no background success, history not marked success | AC-003, REQ-002, REQ-004 | same file | The interrupt path runs through the WebSocket `INTERRUPT_GENERATION`, AgentRun and memory `interruptTurn` |
| LIVE-BG-001 | Real AGY SCN-001: daemon + continued work, background card, quiet window of at least 120 s after `result`, next turn has no late daemon event, terminate stops the daemon | AC-004, REQ-001..003, design Risk, ASM-001 | `autobyteus-server-ts/tests/e2e/runtime/agy-background-task-live.e2e.test.ts` (opt-in `RUN_AGY_BACKGROUND_E2E=1`) | Keeps the AC-004 evidence re-runnable against future AGY versions, which the design flags as undocumented behavior |
| LIVE-BG-002 | Real AGY SCN-002: non-daemon `sleep 330` background task; the turn survives more than 300 s of silence and completes | AC-004, AC-001, REQ-001 | same file | Only real AGY proves the real silent window |
| LIVE-BG-003 | Real AGY Stop during a daemon turn: `TURN_INTERRUPTED`, daemon killed with AGY | AC-004 alternate, REQ-002, ASM-001 | same file | Real process-tree behavior |

## Durable Coverage To Update

| Scenario ID | Existing Path | Required Update | Evidence | Notes |
| --- | --- | --- | --- | --- |
| E2E-BG-001/002 | `tests/fixtures/agy-failure-cli.mjs` | Add `daemon_background` and `daemon_hold` fake cases | AC-002, AC-003 | Additive; existing cases unchanged |
| WEB-001 | `autobyteus-web/services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts` | Add a daemon `run_command` STARTED → SUCCEEDED(RUNNING) case: card `success`, result retained, activity `success` | REQ-003 / BEH-002 ("shown ... as succeeded") | Added during execution to close the user-surface gap without a browser session |
| WEB-001 | `autobyteus-web/services/runHydration/__tests__/runProjectionConversation.spec.ts` | Add a history row with the RUNNING result → `success` card with result | REQ-003 / BEH-002 (history reload) | same |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm exec vitest run tests/unit/agent-execution/backends/antigravity --no-watch` | `autobyteus-server-ts` | AC-001..003 unit | Pass (100 passed, 5 skipped) | ledger UNIT-001 |
| 2 | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/agy-failure-transport.e2e.test.ts tests/e2e/runtime/agy-native-image-step-output.e2e.test.ts` | same | REQ-004 regression through the real server | Pass (6/6) | ledger E2E-REG-001 |
| 3 | same gate + `tests/e2e/runtime/agy-background-task-transport.e2e.test.ts` | same | E2E-BG-001, E2E-BG-002 | see execution report | ledger |
| 4 | `RUN_AGY_BACKGROUND_E2E=1 AGY_BACKGROUND_EVIDENCE_DIR=<ticket>/evidence pnpm exec vitest run tests/e2e/runtime/agy-background-task-live.e2e.test.ts` | same, real `agy` 1.2.12 | LIVE-BG-001..003 | see execution report | ledger + evidence JSON |
| 5 | `pnpm exec tsc -p tsconfig.json --noEmit` (filter to changed test files) | same | Test typing | see execution report | — |

## Test-Case Ledger Plan

- Ledger required: `Yes`. There are multiple independent cases and one case runs about 6+ minutes of real AGY (SCN-002), so interruption risk is credible.
- Canonical ledger path: `tickets/in-progress/agy-background-task-turn-liveness/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`

| Case ID | Case / Journey | Req / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Evidence Expected |
| --- | --- | --- | --- | --- | --- | --- |
| UNIT-001 | AGY unit folder | AC-001..003 | Unit | order 1 | 1 | vitest summary |
| E2E-REG-001 | Existing fake-transport suites | REQ-004 | Real server + fake AGY | order 2 | 2 | vitest summary |
| E2E-BG-001 | Daemon background closure via the real server | AC-002, REQ-003 | Real server + fake AGY | order 3 | 3 | WS order, projection rows |
| E2E-BG-002 | Stop during daemon turn via the real server | AC-003 | Real server + fake AGY | order 3 | 4 | WS events, projection |
| LIVE-BG-001 | SCN-001 real AGY + quiet window + next turn + terminate kills daemon | AC-004 | Real server + real AGY | order 4 | 5 | evidence JSON |
| LIVE-BG-002 | SCN-002 real AGY, more than 300 s silence | AC-004, AC-001 | Real server + real AGY | order 4 | 6 | evidence JSON with max gap |
| LIVE-BG-003 | Stop during a real daemon turn | AC-004 alt, REQ-002 | Real server + real AGY | order 4 | 7 | evidence JSON, port closed |
| TSC-001 | Type-check the new test files | — | tsc | order 5 | 8 | 0 errors in new files |

## Post-Repository Confidence Scorecard

Scores after the repository checks only: the unit suites plus the fake-transport real-server e2e. Final scores are in the execution report.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | AC-001..003 proven by unit tests and the real server with fake AGY | AC-004 (real AGY) not yet run | Live real AGY |
| Changed-boundary execution directness | 88% | Real converter/process code through the real server | Real AGY stream timing not exercised | Live real AGY |
| Cross-boundary integration realism and mock gap | 80% | WebSocket, memory and projection are real; AGY is faked | Real AGY withholding and daemon behavior | Live real AGY |
| Environment, configuration, identity, and fixture fidelity | 80% | Real server with temp app data | Fake AGY | Live real AGY |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | Stop, process close, startup timeout, non-SUCCESS (unit/fake) | Silence > 300 s in real time; late events after `result` | Live real AGY with a quiet window |
| User-surface, browser, and desktop-shell confidence | 85% | Server WS payload and projection asserted | Web consumption of RUNNING not asserted | Web handler/hydration unit cases |
| Durable regression coverage quality and relevance | 92% | Unit + fake-transport e2e; negative control fails on the base commit | Live scenario not durable | Opt-in live e2e |

- Overall post-repository confidence: 85% (simple average 85.0%)
- Every critical acceptance criterion directly proven: `No` (AC-004 pending)
- Any applicable category below 90%: `Yes`, six categories (all except durable regression)
- Default clean-confidence target of 95% met: `No`, so broader validation is `Required`

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Live API` (in-process real server via GraphQL/WebSocket, fake AGY transport) + `Lifecycle` (real AGY process through the real server)
- Specific confidence gap addressed:
  - consumer handling of the new SUCCEEDED/RUNNING event (the design's escalation trigger);
  - the real AGY silent window longer than 300 s;
  - late daemon events after `result`;
  - Stop killing the daemon (ASM-001).
- Why the selected mode helps: it exercises the actual production path from the AGY process through to history replay.
- Expected confidence after validation: at least 95%
- Browser-specific decision and rationale: `Not Required`. No UI code changed. The web tool card consumes the same WebSocket `TOOL_EXECUTION_SUCCEEDED` payload shape it already renders for DONE results, and the web reads `provider_state` only on the denied path (`runProjectionConversation.ts:164`). The server WebSocket and projection payloads will be asserted directly.

## Desktop Application Validation Decision

- Not applicable. The change is server-only. The user's running AutoByteus app (port 29695) is not touched.

## Live Environment And Fixture Plan

- Startup: the vitest test starts an in-process server with a temp app-data dir, creates an agent definition and creates an AGY run with `gemini-3.8-flash-high` (the model used by probes P1/P2, which reliably follows the IsDaemon instruction).
- Environment choices: `RUN_AGY_BACKGROUND_E2E=1`; `AGY_BACKGROUND_EVIDENCE_DIR` points to the ticket's `evidence/` folder.
- Readiness: `createAgentRun.success`; WebSocket open.
- Fixtures: temp workspace; a free TCP port for the daemon, chosen by the test.
- Evidence: a timestamped WebSocket event log per case, the maximum inter-event gap, projection rows, and daemon port liveness before and after terminate.
- Cleanup: terminate runs, delete the definition, close the server, remove the temp dir, and assert the daemon port is closed.

## Temporary Executable Validation Plan

None planned. Probes P1/P2 are superseded by the durable opt-in live test, which exercises AutoByteus code rather than raw AGY.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Org/Team presentation of the background card | Org/Team adapters forward the same run events; no change in them | Low | None |
| ACP/Grok idle timer | Out of scope (separate ticket) | — | — |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| **ASM-001 falsified (found during execution).** Raw AGY 1.2.12 probes show that on SIGTERM, whether after `result` or mid-turn once the daemon is backgrounded, AGY exits but its daemon keeps running, reparented to PID 1 in its own process group. So Stop/Terminate ends the turn and the AGY process, but it does not stop backgrounded daemons. This does not affect any AC: AC-004 only requires that Stop ends the turn, which is proven. The change did not touch the terminate path, and a background-process manager is explicitly Out Of Scope. The durable live test's daemon-kill assertions were derived from ASM-001, not from an AC, so they were converted to recorded evidence. | Non-blocking finding / separate-ticket candidate (per Review Authority: adjacent concern; any fix would be new product behavior requiring user approval) | execution report "Evidence / Notes"; ledger rows 7, 10, 12 | Carried to `/delivery_engineer` with the Pass package for user visibility; Solution Designer decides on a follow-up ticket |
| Observation: `AgyAgentRunBackend.handleMessage` returns early when `!this.turnId`, so a late provider event after `result` is dropped, not thrown. The design's Risk (`AGY_UNEXPECTED_EVENT_OUTSIDE_TURN`) therefore cannot fail the run. The residual form is a late daemon `DONE` arriving during the next turn, which would show up as an extra tool card. LIVE-BG-001 checks this. | None (informational) | `agy-agent-run-backend.ts:100-101` | — |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (2 added server e2e files, 1 fixture updated, 2 web specs extended)
- Post-repository confidence: 85% → final 96% after broader validation (see execution report)
- Broader validation decision: `Required` (Live API + Lifecycle, real AGY)
- Reroute Required Before Validation Execution: `No`
