# API/E2E Coverage Investigation — autobyteus-139 `chat-socket-content-cadence`

Paths are relative to the ticket folder `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-socket-content-cadence/tickets/in-progress/chat-socket-content-cadence/` unless noted. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-socket-content-cadence`, branch `codex/chat-socket-content-cadence`, HEAD `e24ff6b333`, base `origin/personal` @ `f3124db10f`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-002, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-002, Ready)
- Supplemental Task Artifacts: `evidence/validity-probe.*`, `evidence/impl-*.log`
- Design Review Report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- API/E2E Test Progress Log: `api-e2e-test-progress.md`
- Current Investigation Round: 2 (see Planned Cases › Round 2)
- Trigger: Code Reviewer implementation-review Pass (CRR-001), Large/High
- Prior Investigation Reviewed: None
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review of any durable test changes; per handoff rules)
- Proportional test-code review decision: `Required` if API/E2E changes durable test code; otherwise the Code Reviewer confirms there is nothing to review

## Current Requirement And Design Basis

Team, Org and delegated-agent sockets must send ordinary reply text at most once per configured window (REQ-001). Identical repeated status companions must not split the window (REQ-002). Clients must never see a sequence gap or reorder; a batch frame covers `[change_sequence, change_sequence_through]` (REQ-003). Every other message flushes pending text first (REQ-004). Root-event consumers stay unthrottled (REQ-005). The docs list all four sockets (REQ-006). The design implements one per-connection `SequencedContentCadenceScheduler` (DS-002 rules 1–5) with two wire shapes. Batch frames are `SEGMENT_CONTENT_BATCH` (Team) and `ROOT_EXECUTION_EVENT` / `agent_presentation_batch` (Org, collaboration). Clients accept `first === next` and advance to `through + 1`. Accepted deviations: D-1 (a snapshot clears the status baselines), D-2 (shared root-execution egress factory), D-3 (filters refused). UNK-001 (statuses between deltas are identical in live streams) must be confirmed live; a contradiction is a `Design Impact`.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (standalone, regression only), SCN-002 (Team, members in parallel), SCN-003 (Org), SCN-004 (delegated agent of a standalone run).
- Real-use scenarios added from investigating the implementation, each with its real trigger:
  - SCN-A1, **parallel members by direct message**: the user messages two Team or Org members at once. Each member's composer or the socket's `SEND_MESSAGE` with `agent_run_id` / `target_agent_run_id`. This is the deterministic way to make real streams interleave.
  - SCN-A2, **parallel delegated children**: an agent calls `delegate_task` for two tasks, and the children stream while the parent continues. The user can then message both children on `/ws/agent-collaboration`.
  - SCN-A3, **reconnect mid-stream**: a second socket, or a renderer reload, during streaming. The new frames must start at snapshot base + 1.
  - SCN-A4, **interval change mid-stream** (AC-003): Settings › Live response streaming, through GraphQL `updateServerSetting`.
  - SCN-A5, **Stop mid-answer**: terminate an Org or a standalone root while children stream. The tail text must arrive before `ROOT_LIFECYCLE` inactive.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 standalone cadence | Preserved | PB-001 | PB-001 socket file + streaming unit folder |
| BEH-002..004 per-window batching on Team/Org/collaboration | Changed | DS-001/002 | Scheduler units, per-socket integration ×3, live traces, desktop |
| BEH-005 gap-free sequences with ranges | Changed (contract + clients) | Contracts, `advanceSequencedStream` | Contract tests, web specs, integration coverage check, live coverage check, renderer reopen/warning watch |
| BEH-006 root consumers unthrottled | Preserved | Publisher untouched | AC-005 integration case |
| BEH-007 boundaries flush first | Preserved / stricter | Rule 5 | AC-004 integration; live ordering check |
| Status absorption (UNK-001) | Added | DEC-002 | Scheduler units; **live trace measurement** |
| Handler session lifecycle (egress per session, dispose, flush before close) | Changed | Handlers | Handler unit cases; live Stop mid-answer |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Scheduler, shapes | Unit tests | Real event mix and timing | Live API |
| API / transport / contract | Yes | 3 socket wire formats | Integration with a real publisher and real `ws`, but scripted events | Real runtime batches, real statuses (UNK-001), parallel agents | Live API (built server + LM Studio) |
| Frontend component / state | Yes | 3 web contexts | Specs | Real frames into real contexts | Isolated desktop instance |
| Browser integration / user journey | Yes | Team/Org/delegated views | None | Reopen, final text, smoothness | Isolated desktop instance |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | as above | — | — | Isolated instance |
| Desktop shell / Electron-specific integration | No | Embedded server is the same code | — | — | Packaged build via isolated instance |
| Process / lifecycle | Yes | Session dispose, Stop mid-answer, reconnect | Handler units, integration | Real Stop of a root with live children | Live API |
| Persisted-data transition | No (`Not Affected`) | — | — | — | — |
| Worker / queue / distributed coordination | Yes (per-connection timers) | Timers per session | Units | Many sessions/agents in parallel | Live API |
| External integration | Indirect | Real LLM streams (LM Studio) | None | Real timing | Live API |

## Project Execution Discovery

- Assigned worktree: as above.
- Project type: pnpm monorepo; Node 22 server (Fastify, GraphQL, `@fastify/websocket`); Nuxt/Electron client; contract packages with tracked `dist/`.
- Testing guideline: `TESTING.md` in this worktree (newer than the superrepo copy: it adds "Rerun by impact", "Green server suites" and Rule 9 "Fix every failure you hit; find its cause first. Never close a failure as pre-existing or flaky without its cause"). No closer `TESTING*.md`.
- Conflicting, missing, or unclear project instructions:
  - TESTING.md says to run at most one agent run or suite that uses a local model at a time. A Team/Org/delegation run with two members streaming at once is one run whose scenario is parallel by definition. I run one root at a time, with at most 2–3 concurrent model requests (LM Studio parallel slots = 4). No other local-model run was active at start (`lms ps`: none loaded).
  - AC-007 says "a test data package". `docs/isolated-app-instances.md` says demo data is created through the instance UI or public APIs, and TESTING.md › Data says "through public APIs or the UI". Definitions are created through GraphQL (public API), and the runs are driven in the UI.
- Required environment variables or secrets: none (LM Studio is keyless).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Layers, rules | Server unit/integration/typecheck; `test:integration:prepare` after contract changes; web `test:nuxt`; contract `pnpm -C <pkg> test`; build `dist` for `dist/app.js`; isolated instance via `isolated-app start --build`; one local-model run at a time; unload JIT-loaded models; stop what you start |
| `docs/isolated-app-instances.md` | Isolated instance | start/list/stop; browser automation via `CHROME_REMOTE_DEBUGGING_PORT`; data via UI/API |
| `tests/e2e/helpers/agy-runtime-error-fixture.ts` | Org/Team GraphQL shapes | `createAgentOrgDefinition` (members AGENT/AGENT_TEAM), `createAgentOrgRun` (`rootConfiguration`, overrides), `getAgentOrgRunConfig`, `/ws/agent-org` `SEND_MESSAGE` with `root_subject_kind`, `root_run_id`, `target_agent_run_id`, `command_id` |
| `tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts` | Team GraphQL/ws | `createAgentTeamDefinition`, `createAgentTeamRun`, `getTeamRunResumeConfig`; `/ws/agent-team` `SEND_MESSAGE` with `agent_run_id` |
| `tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` | Standalone delegation | `list_available_agents` → address; `delegate_task {recipient_address, description}`; `/ws/agent-collaboration/:runId` |
| `src/config/streaming-content-flush-interval-setting.ts` | Interval | `AUTOBYTEUS_STREAMING_CONTENT_FLUSH_INTERVAL_MS`, default 500, 100–2000 |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree | `pnpm -C autobyteus-server-ts build` | Serialized with other builds | exit 0 | — |
| Real server | `autobyteus-server-ts` | Probe spawns `node dist/app.js --data-dir <tmp> --port 0` with a clean env | Own data root/DB/port | "Server listening" + `/rest/health` | SIGTERM; remove tmp root |
| LM Studio | host | JIT load of `qwen/qwen3.6-35b-a3b` on first request | Not loaded at start → I unload it at the end | `/v1/models` | `lms unload qwen/qwen3.6-35b-a3b` |
| Isolated desktop instance | worktree | `pnpm --silent isolated-app start --build` | Own ports and data root; `iso-62261-0a7b` (running) and `iso-54255-*` are someone else's | `start` JSON | `isolated-app stop <id>` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent, Team, Org definitions | GraphQL create mutations | Test-owned data root only | Removed with the root/instance |
| Runs | GraphQL create mutations (Live API) / UI (desktop) | — | Terminated, then root removed |

## Persisted Data Transition Coverage Basis

- `Not Affected`. Nothing to validate beyond the diff having no persistence change.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Req / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/integration/agent/chat-socket-content-cadence.integration.test.ts` (6 cases × 3 sockets) | AC-001/002/003/004/005/009 per socket through real handlers, a real publisher and a real `ws`, with contiguous-coverage checks | REQ-001..005 | Still Valid | Reviewed by CR; new | Run ×3; sensitivity vs base handlers |
| `tests/unit/services/agent-streaming/sequenced-content-cadence-scheduler.test.ts`, `sequenced-stream-shapes.test.ts` | DS-002 rules, design examples, interval, snapshot (D-1), dispose, filter guard (D-3) | REQ-001..004 | Still Valid | — | Run |
| Org/collaboration handler unit tests (close/disconnect cases) | Flush before close; dispose | REQ-004 | Still Valid | — | Run |
| `tests/integration/agent/agent-status-websocket.integration.test.ts` (PB-001) | Standalone cadence | BEH-001 | Still Valid | — | Run |
| Contract node tests (`agent-presentation-batch.test.mjs`, `team-segment-content-batch.test.mjs` + existing) | Batch schema rules | REQ-003 | Still Valid | — | Run |
| Web specs (3 contexts, 3 services) | Range accept, gap reject, batch dispatch | REQ-003 | Still Valid | — | Run full `test:nuxt` |
| Server `test:unit`, `test:integration`, `typecheck` | Regression | AC-006 | Still Valid | — | Run |
| `tests/integration/agent/agent-team-websocket.integration.test.js` | Stale, excluded by the vitest include | — | Out Of Scope (FU-A) | Handoff | None |

## Durable Coverage To Add

None planned up front. Live cadence on real streams depends on real model timing, so it stays a ticket probe. I'll revisit this if live runs expose a gap that a deterministic case can express.

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-collaboration-stream-contracts test`; `pnpm -C autobyteus-team-stream-contracts test` | worktree | Batch schemas | Pass | `evidence/REPO-01-contracts.log` |
| 2 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming --no-watch` | worktree | Scheduler, shapes, handlers | Pass | `evidence/REPO-02-unit-agent-streaming.log` |
| 3 | `… vitest run tests/integration/agent/chat-socket-content-cadence.integration.test.ts` ×3 | worktree | AC-001..005, AC-009 per socket | Pass | `evidence/REPO-03-cadence-socket-run-{1,2,3}.log` |
| 4 | Same file with the 3 handlers at base `f3124db10f` (restored after) | worktree | Test sensitivity | Pass | `evidence/REPO-04-base-handlers.log` |
| 5 | `… vitest run tests/integration/agent/agent-status-websocket.integration.test.ts` | worktree | BEH-001 (PB-001) | Pass | `evidence/REPO-05-pb001-socket.log` |
| 6 | `pnpm -C autobyteus-server-ts typecheck` | worktree | AC-006 | Pass | `evidence/REPO-06-typecheck.log` |
| 7 | `pnpm -C autobyteus-server-ts test:unit` | worktree | AC-006 | Pass | `evidence/REPO-07-test-unit.log` |
| 8 | `pnpm -C autobyteus-server-ts test:integration:prepare` then `test:integration` | worktree | AC-006, AC-005 | Pass | `evidence/REPO-08-test-integration.log` |
| 9 | `pnpm -C autobyteus-web test:nuxt run` | worktree (after `nuxt prepare`) | AC-002 clients, AC-006 | Pass | `evidence/REPO-09-web-test-nuxt.log` |

## Planned Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Kind | Planned Command Or Steps | For A Temporary Probe: Why It Should Not Stay As Durable Coverage |
| --- | --- | --- | --- | --- | --- |
| REPO-01 | AC-002 (schema), REQ-003 | Contract packages | Existing Test | `pnpm -C autobyteus-collaboration-stream-contracts test`; `pnpm -C autobyteus-team-stream-contracts test` | — |
| REPO-02 | AC-001..004 (units), REQ-001..004 | Scheduler, shapes, handlers | Existing Test | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming --no-watch` | — |
| REPO-03 | AC-001..005, AC-009 | Real handlers, publisher and `ws` in process | Existing Test | `… vitest run tests/integration/agent/chat-socket-content-cadence.integration.test.ts` ×3 | — |
| REPO-04 | Test sensitivity | same | Existing Test | REPO-03 with the 3 handlers at `f3124db10f`, then restore | — |
| REPO-05 | BEH-001 (AC-006) | `/ws/agent` | Existing Test | `… vitest run tests/integration/agent/agent-status-websocket.integration.test.ts` | — |
| REPO-06 | AC-006 | tsc | Existing Test | `pnpm -C autobyteus-server-ts typecheck` | — |
| REPO-07 | AC-006 | Server units | Existing Test | `pnpm -C autobyteus-server-ts test:unit` | — |
| REPO-08 | AC-005, AC-006 | Server integration | Existing Test | `test:integration:prepare` + `test:integration` | — |
| REPO-09 | AC-002 (clients), AC-006 | Web | Existing Test | `pnpm -C autobyteus-web exec nuxt prepare`; `pnpm -C autobyteus-web test:nuxt run` | — |
| LIVE-TEAM | AC-007, AC-009, AC-002, REQ-002 (UNK-001), SCN-A3 | Built server + LM Studio, `/ws/agent-team` | Temporary Probe | `node evidence/live-sequenced-probe.mjs --server-dir autobyteus-server-ts --out evidence/live-team --scenario team` | Needs a local model; real timing is nondeterministic; the deterministic contract is in REPO-03 |
| LIVE-ORG | AC-007, AC-003, AC-004, REQ-002, SCN-A4/A5 | `/ws/agent-org` | Temporary Probe | `… --scenario org --out evidence/live-org` | Same |
| LIVE-COLLAB | AC-007, AC-009, REQ-002, SCN-A2/A5 | `/ws/agent-collaboration` | Temporary Probe | `… --scenario collab --out evidence/live-collab` | Same |
| LIVE-ADOPT | AC-002, AC-009, AC-007 (server side) next to the base's adoption | `/ws/agent-collaboration` with an adopted run + a fresh copy | Temporary Probe | `… --scenario adopt --out evidence/LIVE-ADOPT` | Same as LIVE-* |
| DESK-02 | AC-007 (renderer, round 2) | Fresh packaged build at `335f065cd1` | Journey | delegation (+ adoption when reachable) in the UI with the CDP recorder | Manual by design |
| REPO-10 | AC-001..005, AC-009, AC-002 (clients) | spot-check at HEAD | Existing Test | cadence integration + web collaboration/Team specs | — |
| DESK-01 | AC-007 (renderer: no reopen, final text, smooth screens) | Isolated instance of the worktree build | Journey | `pnpm --silent isolated-app start --build`; definitions via GraphQL; Team, Org and delegation driven in the UI; `evidence/cdp-sequenced-recorder.mjs` | The isolated-instance layer is manual by design |

Progress while running: `api-e2e-test-progress.md`.

### Round 2 (CRR-003 after IR-002, DR-001 merge) — rerun by impact

- Validated commit (round 1): `e24ff6b333`. Code under test now: `335f065cd1`, on the merge `b3666d458f` of `origin/personal` `cf14704473` and the test-only `335f065cd1`.
- `git diff --name-only e24ff6b333 335f065cd1`: 149 files outside `tickets/`. 132 are in `autobyteus-server-ts` (the base's hand-started run adoption, task-execution resources, runtime skill profiles, standalone root, project tasks), 16 in `autobyteus-web`, plus `TESTING.md` (temp HOME guidance).
- Not touched: `websocket-egress/`, the 3 socket handlers, `RootEventPublisher`, both contract packages, `autobyteus-ts`, the lockfile, schema/migrations and build config (web `package.json` changed only its version). So no shared foundation changed (TESTING.md rerun rule 4). The changed `tests/fixtures/*` files belong to the base's own features and are not used by this ticket's cases.
- Ticket areas changed: the web `agentRunCollaborationStreamingService.ts` and its spec (merge: base `onTaskExecutionStarted` next to this ticket's `change_sequence_through`); `TeamStreamingService.spec.ts` (test-only).

| Case ID | Decision | Reason |
| --- | --- | --- |
| REPO-01..09 | Reused (IMP-01, IMP-02, IMP-03, IMP-04, IMP-05, IMP-06/07, IMP-08..10, IMP-12, IMP-13) | Ran at `b3666d458f`; between that and HEAD only the Team spec changed, which IMP-12 reran at `335f065cd1`. Evidence has headers and look-for lines (implementation handoff › Checks Run) |
| REPO-10 (new) | Run | Own spot-check at HEAD: cadence integration + the merged web collaboration and Team specs |
| LIVE-TEAM, LIVE-ORG | Still valid | They exercise egress, handlers, contracts, publisher and Team/Org roots, none changed by the base (Team/Org event production untouched) |
| LIVE-COLLAB | Rerun | The standalone root (`standalone-agent-run-root.ts`, root task adapter) and the task-execution lifecycle that produce this socket's events changed |
| LIVE-ADOPT (new) | Run | The base's adoption makes a hand-started run join the PM's root next to the batch path (`task_execution_started`, then its content as batches); the Code Reviewer asked for a focused check |
| DESK-01 Team/Org parts | Still valid | Team/Org web contexts and services are unchanged (only a Team spec changed) |
| DESK-02 (new) | Run | The merged web collaboration service on a fresh packaged build at HEAD: delegation (and adoption if reachable from the UI), with renderer recording |


## Post-Repository Confidence Scorecard (Mandatory)

See the execution report's scorecard (post-repository and final scores).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (AC-007 and the UNK-001 live measurement are required by the package; repository evidence uses scripted events).
- Selected execution mode: `Live API` (built server, clean env, native runtime + LM Studio; raw frame capture on `/ws/agent-team`, `/ws/agent-org`, `/ws/agent-collaboration`), then `Project Desktop Validation` (isolated instance of the worktree build; renderer frames via CDP, console warnings, DOM text, long-task timing).
- Specific gap: real event mixes and statuses (UNK-001), real parallel agents, reconnect, interval change, Stop mid-answer, renderer acceptance without reopen, smoothness.
- Expected confidence after: ≥ 95%.
- Browser-specific decision: no separate browser probe; the isolated desktop instance covers the renderer.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron with an embedded server.
- Web-equivalent behavior: the Team, Org and delegated-agent views consuming the three sockets.
- Shell-specific behavior: none changed.
- Chosen approach: isolated instance (`start --build`), definitions created via GraphQL, runs driven in the UI. The second message to a parallel member is sent from the UI where the UI allows it, otherwise from a second client. Recorded with CDP (Network frames for the 3 sockets, Runtime console messages, long tasks).
- Effect on any already-running desktop application: `None`.

## Live Environment And Fixture Plan

- Startup: build `dist` → probe starts `dist/app.js` (clean env, temp root, `LMSTUDIO_HOSTS=http://127.0.0.1:1234`) → `ensureProviderModelCatalog(LMSTUDIO)` → definitions → runs → sockets → commands.
- Journeys:
  - LIVE-TEAM: Team with members A and B; both are messaged at once; a mid-stream second socket.
  - LIVE-ORG: Org with direct members A and B; both are messaged at once; an interval change to 1000 ms mid-stream; Stop the Org mid-answer.
  - LIVE-COLLAB: standalone PM delegates two tasks via `delegate_task`; the collaboration socket observes; both children are then messaged at once; Stop the root mid-answer.
- Evidence: raw JSONL frames per socket, computed summaries (sequence coverage from the snapshot base, batch spacing per identity, items per batch, standalone status frames per agent per window, early-flush triggers), final text vs. GraphQL projections, server logs.
- Cleanup: terminate runs, stop the server, remove temp roots, unload the JIT-loaded model.

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
See Planned Cases.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Remote-node version skew (RSK-003) | No compatibility promise; out of scope | Known, for the release notes | No | Delivery release notes |
| Codex/Claude/AGY live streams | Paid/real providers not needed for a runtime-agnostic egress change | Low; the egress is after the publisher for every runtime | No | — |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| None. UNK-001 was confirmed live (identical statuses absorbed), so the Design Impact escalation does not fire | — | Execution report › Acceptance-Criteria Proof (UNK-001 row) | — |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No` (planned)
- Post-repository confidence: 83.6%; final: 95.9% (execution report)
- Broader validation decision: `Required`
- Reroute Required Before Validation Execution: `No`
- Notes: execution complete; see `api-e2e-execution-coverage-report.md`. Durable coverage unchanged by API/E2E.
