# API/E2E Coverage Investigation

## Investigation Meta

All ticket paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-stop-cleanup-and-org-recovery/tickets/in-progress/runtime-stop-cleanup-and-org-recovery/`.

- Requirements Doc: `requirements-doc.md` (SR-001, Approved 2026-09-29)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-001..SR-003)
- Design Spec: `design-spec.md` (SR-003)
- Supplemental Task Artifacts: `probes/gql.sh`, `probes/org-send.mjs`, `probes/create-nested-classroom-agy-org.json`, `predecessor-delivery-receipt-verification.md`, `handoff-architecture-design-complete.md`
- Design Review Report: `design-review-report.md` (ARCH-REV-002 Pass; N-1..N-3)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md`
- Implementation Revision Record: `implementation-revision-record.md` (IR-001)
- Code Review Report: `code-review-report.md` (CRR-001 Pass, 9.3/10)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: `N/A`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- Current Investigation Round: 2 (round 1 = API-REV-001 Fail on F-API-B1-ALT; round 2 = SR-004 alignment)
- Trigger: Implementation Review PASS from `/code_reviewer` (commit `299875113`, base `origin/personal` @ `5d6179797`)
- Prior Investigation Reviewed: None for this package
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review)
- Proportional test-code review decision: `Required`

## Current Requirement And Design Basis

**A — AGY background cleanup.**

- REQ-A1 / AC-A1 / AC-A2: every AutoByteus-initiated stop of a live AGY process also stops AGY's background process groups on macOS/Linux. The stops are user Stop, run/Team/Org Terminate, graceful server shutdown, and stream failure.
- REQ-A2 / AC-A3: a normal turn end keeps daemons running.
- REQ-A3: AGY crash orphans are a documented limitation.
- QR-001: no collateral kills.
- QR-002: bounded delay of at most about 2 s.

**B — Org/Team recovery with dead members.**

- REQ-B1 / AC-B1: Terminate succeeds; the root is unregistered; the retry is not permanently blocked.
- REQ-B4 / AC-B1: config and inspection agree on the active state.
- REQ-B2 / AC-B2: a message after Terminate restores the Org, and the member continues its conversation (ASM-001, AGY `--conversation`).
- REQ-B3 / AC-B3: a message to a crashed member in an active Org resumes that member; other members are untouched.
- AC-B4: healthy flows are unchanged.

Design D-A1 and D-B1..D-B4 apply, plus R-7 (Stop-caused death, both an Org root agent and a Team member inside an Org) and DEC-004 (standalone Team).

Code review residual: CR-C1 (`*_STOP_INCOMPLETE` once).

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-A1: `AgyStreamProcess.stop()` also stops AGY background groups | Changed | D-A1 | Unit (fake `ps`) exists. Live proof needed for Stop, run/Team/Org Terminate and server shutdown. |
| BEH-A1 preserved: normal turn end keeps daemon | Preserved | REQ-A2 | Live (existing SCN-001 case) |
| BEH-A2: AGY crash orphan | Preserved (documented) | REQ-A3 | Unit (helper skipped). Live: record only. |
| BEH-B1: dead-member Terminate / retry / restore self-heal | Changed | D-B1, D-B3, D-B4 | Unit exists with fakes. A live Org and a standalone Team with a real AGY crash (`kill -9`) and a real Stop are needed. |
| BEH-B2: crashed member resumes by message | Changed | D-B2 | Unit exists. Live proof of AGY `--conversation` resume and conversation continuity (ASM-001) is needed. |
| Healthy Org/Team lifecycle | Preserved | AC-B4 | Existing live suite `agy-team-inter-agent-roundtrip.e2e.test.ts` + unit suites |
| Team service restore pre-guard removal | Changed | AR-001 | Unit exists. Live: registered-but-inactive Team restore via GraphQL `restoreAgentTeamRun`, if that state is reachable live. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Handle, planner, Org run, scopes, managers | Unit (fakes) | Real registry discovery timing with a real dead AGY process | Live server + real AGY |
| API / transport / contract | Yes (behavioral) | GraphQL `terminateAgentOrgRun` / `restoreAgentOrgRun` / `terminateAgentTeamRun` / `restoreAgentTeamRun`; Org/Team WebSocket `SEND_MESSAGE` / `INTERRUPT_GENERATION` ACKs | Unit only | End-to-end outcomes (`success:true`, ACK accepted) | Live server |
| Frontend | No code change | UI restore flow reuses the GraphQL restore | — | REQ-B4 is covered at the server state level | Server-level GraphQL (no browser) |
| Process / lifecycle | Yes | OS process groups; AGY kill and restart; `--conversation` resume; graceful shutdown | Unit (fake `ps`); implementation did a temporary real-OS check | Real AGY background groups; real shutdown path | Live real AGY; in-process `app.close()` (same fastify onClose → supervisor `close()` → `stopAll*` as SIGTERM shutdown) |
| Persisted data | Indirect | Execution tree and `platformAgentRunId` reused by restore | Unit | Real restore with persisted binding | Live |
| Concurrency / termination ordering | Yes | Fence / finish / retry / self-heal | Unit | Real timing | Live, including Stop mid-turn |
| External integration | Yes | AGY 1.2.12 | — | Everything above | Live |
| Desktop / browser | No | — | — | — | Not required |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-stop-cleanup-and-org-recovery`
- Environment: already prepared by implementation (`pnpm install`, `prisma generate`, `prepare:shared`). The untracked `dist/` folders are build outputs.
- Secrets: the local `agy` login (1.2.12). No repository secrets.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/vitest.config.ts` | Runner | forks, no file parallelism, Prisma global setup |
| `tests/e2e/runtime/agy-team-inter-agent-roundtrip.e2e.test.ts` | Live AGY Team/Org pattern | Gate `RUN_AGY_E2E=1`. GraphQL definitions/runs. Org WebSocket `/ws/agent-org/<id>` with `SEND_MESSAGE {root_subject_kind, root_run_id, target_agent_run_id, command_id, …}`. Wait for `ROOT_LIFECYCLE is_active:true` before commands. Attribution via `ROOT_EXECUTION_EVENT` `agent_presentation`. Team WebSocket `/ws/agent-team/<id>` with `SEND_MESSAGE {agent_run_id}`. Checkpoint `getAgentOrgExecutionCheckpoint`. |
| `tests/e2e/runtime/agy-background-task-live.e2e.test.ts` (predecessor) | Live daemon pattern | Gate `RUN_AGY_BACKGROUND_E2E=1`. Records `daemonListeningAfterTerminate` / `AfterStop`; these become assertions. |
| `autobyteus-collaboration-stream-contracts/src/root-execution-view-dtos.ts` | Org WS schema | `INTERRUPT_GENERATION` payload = `{root_subject_kind:"agent_org", root_run_id, target_agent_run_id, command_id}` |
| `src/services/agent-streaming/team-interrupt-generation-command-handler.ts` | Team WS Stop | payload `{command_id, agent_run_id}` |
| `src/server-runtime.ts`, `src/compositions/build-studio-server.ts`, `src/agent-execution/runtime/general-process-run-supervisor.ts` | Graceful shutdown | SIGTERM/SIGINT → `app.close()` → onClose → supervisor `close()` → `stopAllAgentOrgRuns` / `stopAllTeamRuns` / `stopAllAgentRuns` |
| `src/agent-execution/backends/antigravity/capsule/agy-run-capsule.ts` | Identify a member's AGY process | argv `--agent autobyteus-<sha256(runId)[:16]>`; restore argv adds `--conversation <platformAgentRunId>` |

| Component / Dependency | Start / Setup | Readiness | Stop / Cleanup |
| --- | --- | --- | --- |
| In-process studio server | `startStudioE2eRuntimeServer()` (temp app data) | returns URL | `app.close()` (also the shutdown-under-test) |
| Real AGY per member | spawned by the backend | AGY init / member TURN_COMPLETED | Terminate / shutdown; `afterAll` kills leftover test-owned daemons |
| Test daemons | `python3 -m http.server <free port> --bind 127.0.0.1` via the AGY `IsDaemon` prompt | TCP connect | Asserted gone; `afterAll` `lsof` kill as the safety net |

| Data / Fixture / Identity Need | Method | Safety | Cleanup |
| --- | --- | --- | --- |
| Agent / Team / Org definitions | GraphQL create in temp app data | Isolated from the user's app (29695 untouched; its stuck L1/L2 Orgs not touched) | delete + temp dir removal |

## Persisted Data Transition Coverage Basis

- Decision: `No Migration Required`. Live restore reuses the persisted execution tree and `platformAgentRunId`. Checks: the restored member argv has `--conversation <same id>`, and conversation continuity holds (a marker is recalled).

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Req / AC | Validity Decision | Action |
| --- | --- | --- | --- | --- |
| Unit: `agy-background-process-groups.test.ts`, `agy-stream-process.test.ts` | Group selection (QR-001), order, SIGKILL sweep, crash skip, fail-safe | REQ-A1, A3, QR-001 | Still Valid | Keep; rerun |
| Unit: `configured-agent-execution-handle.test.ts`, `configured-agent-activation-planner.test.ts` | Stale termination / fence; per-attempt mode | REQ-B1, B3 | Still Valid | Keep |
| Unit: `agent-org-run-termination.test.ts`, `frozen-agent-org-termination-scope.test.ts`, `*-restore-self-heal.test.ts`, `flat-team-execution-manager-routing.test.ts`, `team-run-service.test.ts` | Retry, self-heal, service guard removal | REQ-B1, B4, DEC-004 | Still Valid | Keep |
| `team-run-service.test.ts`: old "rejects a managed offline run before readiness" | Pre-guard | — | Replaced by implementation (reviewed) | — |
| `tests/e2e/runtime/agy-background-task-live.e2e.test.ts` SCN-001 | Daemon survives turn end; records `daemonListeningAfterTerminate` (evidence only) | AC-A3, AC-A2 | Needs Update | Make the terminate observation an assertion (daemon gone) |
| same, Stop case | Stop 0.4 s after daemon start; `daemonListeningAfterStop` evidence only | AC-A1 | Needs Update | Stop only after the daemon is backgrounded (listening + ≥ 8 s past `WaitMsBeforeAsync`); assert gone |
| same, SCN-002 | 330 s silence | Predecessor | Still Valid | Rerun optional (unchanged path) |
| `tests/e2e/runtime/agy-team-inter-agent-roundtrip.e2e.test.ts` | Healthy Team relay + Org members, terminate/restore | AC-B4 | Still Valid | Rerun live (`RUN_AGY_E2E=1`) |
| `tests/e2e/runtime/agy-background-task-transport.e2e.test.ts`, `agy-failure-transport`, `agy-native-image-step-output` (fake AGY) | Predecessor transport paths | AC-A3 / regression | Still Valid | Rerun |
| 12 failures in `team-run-model-selection-save.test.ts`, `agent-org-run-config.test.ts` | Model-selection save / org workspace | — | Out Of Scope (pre-existing; identical at base `5d6179797`, verified by me) | None |

## Durable Coverage To Add

New opt-in live file `autobyteus-server-ts/tests/e2e/runtime/agy-runtime-stop-recovery-live.e2e.test.ts`, gate `RUN_AGY_RECOVERY_E2E=1`, real AGY through the real server. The whole AC-B family and the Team/Org/shutdown AC-A cases are only provable live, and the live test keeps this behavior re-runnable against future AGY versions.

| Scenario ID | Behavior / Boundary | Req / AC | Why Durable |
| --- | --- | --- | --- |
| LIVE-ORG-B1 | Org: `/director` AGY `kill -9` → Terminate `success:true`; config and inspection inactive; second Terminate no-op success; restore; director resumes with `--conversation` and recalls its marker (ASM-001) | AC-B1, AC-B2, REQ-B4 | Core incident path (L1) |
| LIVE-ORG-B3 | Org: Team member `/team/worker` AGY `kill -9` → message the worker: ACK accepted, resumes with `--conversation`, recalls its marker; `/director` AGY pid untouched and alive | AC-B3, R-7 placement | Core L2 path; Team member placement |
| LIVE-ORG-R7 | Org: Stop mid-turn as the cause of death. (a) `/director` Stop → message the director resumes. (b) `/team/worker` Stop → Org Terminate `success:true` → restore → the worker resumes. | R-7, AC-B1..B3 | Stop-caused death differs from a crash (the interrupt path fences) |
| LIVE-ORG-A2 | Org member starts a daemon (turn ends, daemon alive) → Org Terminate → daemon gone | AC-A2 (Org), AC-A3 | Team/Org stop path |
| LIVE-TEAM-D4 | Standalone Team: member starts a daemon; the other member is crashed (`kill -9`). Observe the Team's active state. If the Team is registered-but-inactive, `restoreAgentTeamRun` self-heals (no "already managed"). Then Terminate `success:true` (the daemon of the live member is gone) → restore → the crashed member resumes. | DEC-004, REQ-B1/B2, AC-A2 (Team) | Standalone Team path |
| LIVE-SHUTDOWN-A2 | Graceful server shutdown (`app.close()`) with an idle AGY run that holds a daemon → daemon gone | AC-A2 (shutdown) | Shutdown path |

## Durable Coverage To Update

| Scenario ID | Existing Path | Required Update | Evidence |
| --- | --- | --- | --- |
| LIVE-BG-001 | `agy-background-task-live.e2e.test.ts` SCN-001 | Assert daemon gone after `terminateAgentRun` (≤ 5 s) | AC-A2 (run Terminate), AC-A3 unchanged |
| LIVE-BG-003 | same, Stop case | Stop only after the daemon is backgrounded; assert daemon gone (≤ 5 s); keep interruption assertions | AC-A1 |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Boundary | Result |
| --- | --- | --- | --- |
| 1 | `pnpm exec vitest run tests/unit/agent-execution/backends/antigravity tests/unit/agent-collaboration tests/unit/agent-org-execution tests/unit/agent-team-execution tests/architecture` | Unit + architecture for the changed owners | Pass for the change: 451 passed, 5 skipped. The 12 failures are pre-existing: I checked out base `src`/`tests` and got an identical 12 failures in the same 2 files, then restored. |
| 2 | Fake-transport e2e: `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs vitest run agy-background-task-transport agy-failure-transport agy-native-image-step-output` | Predecessor transport regression | Planned |
| 3 | `tsc -p tsconfig.json --noEmit` (new/changed test files) | Typing | Planned |
| 4 | Live: `RUN_AGY_RECOVERY_E2E=1 … agy-runtime-stop-recovery-live.e2e.test.ts` | LIVE-ORG-*, LIVE-TEAM-D4, LIVE-SHUTDOWN-A2 | Planned |
| 5 | Live: `RUN_AGY_BACKGROUND_E2E=1 … agy-background-task-live.e2e.test.ts -t "SCN-001\|Stop during"` | LIVE-BG-001, LIVE-BG-003 | Planned |
| 6 | Live: `RUN_AGY_E2E=1 … agy-team-inter-agent-roundtrip.e2e.test.ts` | AC-B4 healthy regression | Planned |

## Test-Case Ledger Plan

- Ledger required: `Yes`. There are many independent live cases, several minutes each, with a real interruption risk.
- Canonical ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Case IDs: UNIT-001, E2E-REG-001, TSC-001, LIVE-BG-001, LIVE-BG-003, LIVE-ORG-B1, LIVE-ORG-B3, LIVE-ORG-R7, LIVE-ORG-A2, LIVE-TEAM-D4, LIVE-SHUTDOWN-A2, LIVE-REG-B4

## Post-Repository Confidence Scorecard

| Category | Score | Support | Remaining Uncertainty | Improvement |
| --- | --- | --- | --- | --- |
| Requirement and AC proof | 70% | Unit proves the mechanisms with fakes | Every AC is specified as live; ASM-001 is unproven | Live |
| Changed-boundary directness | 70% | Real classes, fake manager/registry/`ps` | Real process table and real dead AGY | Live |
| Integration realism / mock gap | 60% | — | Fakes throughout | Live |
| Environment / fixture fidelity | 65% | Real-OS helper check (implementation, temporary) | Real AGY groups | Live |
| Failure / lifecycle / recovery | 70% | Unit retry and self-heal | Real crash and Stop timing; shutdown | Live |
| User surface | 85% | No UI change; GraphQL/WebSocket unchanged | ACK and success values end to end | Live GraphQL/WebSocket |
| Durable regression quality | 85% | Strong unit coverage with negative checks | No e2e | Live opt-in e2e |

- Overall post-repository confidence: 72% (simple average of 70, 70, 60, 65, 70, 85, 85 = 72.1%)
- Every critical AC directly proven: `No`
- Categories below 90%: all seven
- 95% target met: `No`, so broader validation is required

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Live API` (in-process real server GraphQL/WebSocket) + `Lifecycle` (real AGY processes, `kill -9`, Stop, in-process graceful shutdown)
- Gap addressed: all ACs, ASM-001, R-7 and DEC-004 are real-process behaviors
- Browser: `Not Required`. No UI change; REQ-B4 is asserted on server state (config and inspection).
- Expected confidence after: ≥ 95%

## Live Environment And Fixture Plan

- Model: `gemini-3.8-flash-high` for tool/daemon prompts, which reliably follows `IsDaemon` (predecessor evidence).
- Crash simulation: find the member AGY by argv `--agent autobyteus-<sha256(runId)[:16]>` in `ps`, then `kill -9`. Wait until the pid is gone.
- Stop: WebSocket `INTERRUPT_GENERATION` while the member runs `sleep`.
- Evidence: per-case JSON (frames summary, pids, argv, GraphQL results, port states) in `<ticket>/evidence/`.
- Cleanup:
  - `afterAll` terminates roots, deletes definitions, closes the server, and removes temp dirs.
  - The safety net kills only processes listening on test-owned ports.
  - It also kills only AGY processes spawned by this test process (ppid = test pid).

## Temporary Executable Validation Plan

None planned beyond the durable live file.

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk |
| --- | --- | --- |
| Windows | DEC-003 out of scope | — |
| Hard-killed app | Documented limit | — |
| AGY crash orphans | DEC-001 documented limitation; recorded as evidence only | — |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| F-API-B1-ALT (found during execution): a second Terminate of an already-terminated Org/Team returns `success:false` "…run not found.". AC-B1's approved alternate says it must be a harmless no-op success. No design decision covers this. The manager code (`if (!run) return false;` in both managers) is unchanged from base. | Design Impact (preliminary; alternatively Local Fix) | ledger events 7, 9, 10, 13; `evidence/live-org-b1.json`, `live-org-r7.json`, `live-team-d4.json` | Round 2: **Resolved** by SR-004 (user-approved option (b)). The existing response is the approved behavior, and the assertions were updated per N-4 |

Execution-time plan revisions:
- The LIVE-BG-001 write-step check is location-independent (a model cwd variance made the fixture fail).
- The second-Terminate assertions are `expect.soft`, so the remainder is still proven.
- The "registered-but-inactive Team → restore" check is exercised as a live Terminate + restore race. Fail-stop comes only from persistence or lifecycle failures, not member death.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Durable coverage: `Yes` (1 new live file, 1 live file updated)
- Post-repository confidence: 72%
- Broader validation: `Required`
- Reroute Required Before Validation Execution: `No`
- Round 2 outcome: F-API-B1-ALT resolved by SR-004; final confidence 95% (see execution report); PROBE-LINUX-A1 added for REQ-A1's Linux clause
