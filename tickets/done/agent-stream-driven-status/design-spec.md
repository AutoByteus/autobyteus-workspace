# Design Spec

## Status (`SR-008` — Failure-Safe Interrupt Transport Admission, Ready For Architecture Re-review)

This is the implementation-authoritative target design for the complete approved requirements basis through 2026-08-03. It preserves the complete `SR-006` implementation that passed `ARCH-REV-006`, implementation/source/API-E2E/proportional test review, and reached delivery verification. `ARCH-REV-007` accepted the `SR-007` Codex provider design and admitted-request interrupt acknowledgement design, but identified one frontend transport-admission omission. `SR-008` resolves `ARCH-FIND-004` without reopening the accepted provider, server, lifecycle, team, nested identity, presentation, or native AutoByteus contracts.

No source rework may begin until `SR-008` passes architecture re-review. The prior delivery candidate and its manual-verification artifacts are superseded for completion. `ARCH-FIND-001`–`ARCH-FIND-003`, `CODE-FIND-001`–`CODE-FIND-003`, and `TEST-FIND-001`–`TEST-FIND-002` remain resolved; `ARCH-FIND-004` is the only current re-review target.

## Current-State Read

The dedicated ticket worktree is at HEAD `df3fe87e78ccc734128ce0b96a4e4281e2f55405`, 27 commits ahead / 0 behind refreshed `origin/personal=2a7271c9d78b71b919f7dbfa3b8f97f61c3a2e2b` on 2026-08-03. Source commit `bfd5ea403` and subsequent reviews implement the accepted `SR-006` design. Manager-owned binary team liveness, two-level team activity indicators, aggregate-team removal, Stop failure/pending semantics, nested stream coordinates, and the agent lifecycle/batching foundation are accepted current source. Delivery-owned documentation/log edits remain protected continuation state and are outside solution-design edits.

The historical aggregate model that this ticket removed was structurally broad:

- `AgentTeamRunManager.activeRuns` plus `TeamRun.isActive()` already determine whether a root team execution is live.
- History and resume expose `isActive`, but `TeamRunStatusProjectionService` additionally folds member snapshots through `deriveTeamApiStatus` and exposes a root `status`.
- `TeamRun`, `MixedTeamManager`, subteam/task-team handles, command overlays, the team event mapper, and the team WebSocket snapshot all manufacture root or nested `TEAM_STATUS` events.
- The frontend stores both `AgentTeamContext.currentStatus` and `TeamRunHistoryItem.isActive`, converts activity to a synthetic team status during hydration, and later converts status back to action eligibility.
- `workspaceHistoryTeamDefinitionGroups.ts` copies the most recent child run's status onto a reusable team definition, which has no runtime lifecycle of its own.
- Root and definition rows render five-color team dots even though the user action at the root is simply Stop while the run exists.
- The same aggregate event is also used as a shortcut for task-team projection cleanup, team failure observation, and task-team open-work settlement.

That aggregate mixed five distinct subjects and is now removed in accepted source. Member `AGENT_STATUS` remains exact at every nesting depth; root action/liveness uses manager-owned `isActive`; task cleanup, failure, and settlement use their own facts.

`SR-005` also resolved the prior recursive task-team coordinate defect by separating `TaskTeamStreamScope` from operational identity and rebasing all outward paths in one frame. That accepted design remains authoritative and unchanged.

The current frontend now correctly stores no team status enum and renders the approved boolean group/run activity indicators. That accepted presentation is unrelated to the new member defect and remains unchanged.

The delivery-verification Codex trace exposes one provider-boundary identity defect. `CodexThread.sendTurn()` calls `turn/start` and `markTurnStarted(responseId)` even when identified turn A is already current. Codex treats the incoming reviewer message as same-turn input inside A, but AutoByteus installs response/request identity B. Provider terminal A then cannot clear phantom B from the canonical current/retired-turn lifecycle. A fresh team snapshot remains `running` even though `CodexThread.activeTurnId` is empty and interruption correctly rejects with no active provider turn.

The bundled Codex app-server 0.146 contract provides the exact correction: idle input uses `turn/start`; input while identified A is current uses `turn/steer { threadId, expectedTurnId: A, input }`, whose response is `{ turnId: A }`. The current standalone and team stream handlers separately discard most interrupt results after logging them. `AGENT_COMMAND_ACK` currently represents only standalone `SEND_MESSAGE`, and team streaming has no control-result dispatch before member-event projection.

`ARCH-REV-007` additionally confirmed a reachable local admission edge. Canonical agent `running` intentionally survives socket disconnect, and the stores retain the streaming service while its `IWebSocketClient.state` may be `DISCONNECTED`, `CONNECTING`, or `RECONNECTING`. `WebSocketClient.send()` throws synchronously unless state is `CONNECTED`, and the underlying `WebSocket.send()` may also throw after a connected-state check. A pending interrupt registered immediately before either failure must therefore be removed and completed as local transport feedback in the same call; an earlier disconnect event cannot complete a command that did not yet exist.

Relevant verified paths and evidence are in [`investigation-notes.md`](./investigation-notes.md), [`production-trace-evidence.md`](./production-trace-evidence.md), [`team-status-simplification-evidence.md`](./team-status-simplification-evidence.md), and [`codex-steering-stale-running-evidence.md`](./codex-steering-stale-running-evidence.md).

## Intended Change

Keep one five-state lifecycle only for an agent execution:

```text
no live agent runtime                    -> offline
terminal turn/runtime failure            -> error
accepted command, no current turn        -> initializing
current open turn                        -> running
live agent runtime, no current turn      -> idle
```

`running` remains the sole public busy/interruptible agent state. The implemented `AgentRun` gateway continues to pair canonical `AGENT_STATUS` with every final non-status agent event, apply current/retired-turn safety, and serve the same canonical snapshot on reconnect. The frontend continues to resolve Send/Stop/disabled from agent status plus local submission constraints; it never restores `can_interrupt` or `canInterrupt`.

For a team, remove the five-state lifecycle altogether:

```text
team definition                          -> no runtime state
root team run registered and backend live -> isActive = true
root team run absent/unregistered          -> isActive = false
leaf agent member                          -> its own five-state AgentStatus
task execution                             -> its task-domain stage
socket                                     -> connected/disconnected only
Stop request                               -> local stopPending only
```

Presentation projects those existing facts without adding state:

```text
exact team-run activity dot     = teamRun.isActive
agent-team/definition group dot = runs.some(run => run.isActive)
active visual                   = solid blue + accessible "Active"
inactive visual                 = solid gray + accessible "Inactive"
```

The group boolean belongs only to the display group. It is not written to a team definition, server response, store, history record, or stream. It never authorizes Stop. The exact run boolean continues to authorize Stop independently through the existing action policy.

Make `AgentTeamRunManager` the only public team-liveness owner. It exposes a fresh binary snapshot and an idempotent lifecycle subscription for an exact root `teamRunId`. The team WebSocket binds both the run-event subscription and manager-lifecycle subscription, then performs a fresh manager read. It sends `TEAM_RUN_LIFECYCLE { team_run_id, is_active }`; it no longer sends root or nested aggregate `TEAM_STATUS`. Successful unregistration emits `false`; failed termination emits no false transition; disconnect emits nothing about liveness.

Remove agent-like status snapshots from subteam and task-team handles. Team runtime snapshots recursively return `TeamLeafAgentStatusSnapshot`: a canonical agent status with required team-leaf identity plus a discriminated ordinary-member or task-team `TaskTeamStreamScope`. The task-team handle derives that tight scope from its operational `TaskTeamInstanceIdentity` in the immediate parent frame. Every outer ordinary boundary prefixes the scope's logical-team path together with source/member paths and rebuilds every route key. Every live event type and every initial snapshot calls the same `prefixMixedTeamStreamScope`; live agent and snapshot adapters additionally enforce a nonempty relative leaf selector. Both stream mappings call the same task-team identity flattener and never guess a missing prefix. Replace the settlement aggregate read with a private `TeamRun.hasOpenExecutionWork()` predicate. Replace task-team offline-event cleanup with task-delegation terminal/reconciliation facts. Remove the root aggregate-error branch from team lifecycle observation while retaining canonical member-agent failure observation and explicit operation failures.

On the frontend, continue to store root `isActive` directly and keep `AgentTeamStatus`, root/team `currentStatus`, and aggregate normalization/hydration removed. Use `isActive && !stopPending` for Stop. Keep `StatusDot` and `AgentStatusDisplay` agent-only. Add a separate `TeamActivityDot` that accepts only a boolean plus an accessible label; use it on the two desktop group/run surfaces. A root or subteam header has no agent status fallback. Mobile team-run liveness remains `Active` or `Inactive` text from `isActive` only.

For Codex input, keep runtime-neutral callers unchanged. `CodexThread` becomes the single provider-local decision owner:

```text
after startup ready, activeTurnId = null -> turn/start -> require returned started ID -> markTurnStarted(started ID)
after startup ready, activeTurnId = A    -> turn/steer(expectedTurnId=A) -> require returned ID A -> preserve A
steer rejection or mismatched response   -> failed AgentOperationResult -> no start fallback and no identity mutation
```

A successful steer never invokes `markTurnStarted`; if terminal A is processed before the steer response, the accepted result can still report A for memory correlation but must not reopen A. `AgentRun`, its current/retired-turn state, accepted-input observers, team delivery, and frontend remain provider-neutral. Claude behavior is unchanged. Native AutoByteus continues to queue user/inter-agent inputs in FIFO `turn_start`; interrupt settles the current native turn and a queued message may then start a distinct turn.

For interruption, widen `AGENT_COMMAND_ACK` into a tight discriminated union. Preserve the existing `SEND_MESSAGE` arm and dedupe semantics. Add one `INTERRUPT_GENERATION` arm containing a client command ID, `accepted | rejected | failed`, code/message when not accepted, and a discriminated exact standalone-run or team-member target. Both server handlers return this acknowledgement for every supported interrupt request. The frontend streaming service matches command ID and target before resolving the result; accepted results do not mutate lifecycle, while rejected/failed results are shown as localized error toasts and never appended as agent/runtime `ERROR` segments.

Complete frontend admission as one failure-safe transition in both services: register the exact pending command, require `ConnectionState.CONNECTED`, attempt the serialized send, and return `true` only if that send returns without throwing. If state is disconnected/connecting/reconnecting or send throws, delete that exact pending entry, invoke the exact-target transport-failure callback once, and return `false`. A later disconnect drains only entries still present. Neither local failure path fabricates a server acknowledgement or mutates agent/team lifecycle.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-002, REQ-008, REQ-009; AC-001, AC-002, AC-009 | Selected standalone or exact team member is working | Original screenshot and agent investigation | Preserve implemented `running -> Stop`; exact run/member interrupt identity remains | DS-001, DS-002, DS-005 |
| BEH-002 | System / Contract | REQ-003, REQ-004, REQ-005, REQ-010; AC-003, AC-004, AC-010, AC-011 | Any supported outward agent event origin | ORIGIN-001–ORIGIN-007; `ARCH-REV-002` | Preserve the single `AgentRun` gateway and one canonical companion per final non-status event | DS-003, DS-004, DS-006, DS-009 |
| BEH-003 | System | REQ-005, REQ-006, REQ-007, REQ-011; AC-004, AC-005, AC-006, AC-007, AC-012 | Agent terminal/error/termination or reconnect | Snapshot race evidence and implemented foundation | Preserve matching terminal -> idle, terminal failure -> error, termination -> offline, fresh snapshot convergence | DS-003, DS-004, DS-007 |
| BEH-004 | System | REQ-004, REQ-012; AC-008, AC-011, AC-012 | Late/duplicate retired-turn evidence | Production trace and turn-state evidence | Preserve late content while preventing retired turn A from reopening or disturbing B | DS-006 |
| BEH-005 | User | REQ-008, REQ-009; AC-013, AC-014 | Click, Enter, or programmatic composer action | Composer source and implementation review | Preserve one action guard; initializing blocks, running interrupts, Shift+Enter inserts newline | DS-005 |
| BEH-006 | User / Contract | REQ-013, REQ-020; AC-016, AC-026 | Scan a collapsed/expanded team-definition group | Delivery screenshot, user feedback, current group builder | Keep definition free of lifecycle; render `runs.some(isActive)` as a binary group activity dot; preserve name/avatar/count/disclosure/launch | DS-010, DS-013 |
| BEH-007 | System / Contract | REQ-014, REQ-015, REQ-018; AC-017, AC-018, AC-019, AC-020, AC-024 | Create, restore, refresh, subscribe, terminate, or lose a root team run | Manager/history/resume and circular frontend projection evidence | Root team lifecycle is only manager-owned `isActive`; member state and socket state never determine it | DS-008 |
| BEH-008 | User | REQ-016, REQ-018, REQ-020; AC-017, AC-018, AC-022, AC-023, AC-026 | Stop, archive, delete, or scan an exact team run | Delivery screenshot, user feedback, current history/running rows | Stop keeps `isActive` plus local pending; exact run row renders the same boolean as a separate binary dot; no five-state team visuals | DS-008, DS-010, DS-013 |
| BEH-009 | System / Contract | REQ-015, REQ-017, REQ-019; AC-020, AC-021, AC-025 | Member live stream/initial reconnect at any depth, including ordinary subteam -> task team; task terminal/failure; settlement check | `CR-MP-002`, `CODE-FIND-002`, team bridge/flattener, task-team scoped resolver, task/failure/settlement owners | Preserve exact leaf-agent status through one representable and coordinate-consistent live/snapshot scope; move task cleanup, failure, and open-work decisions to their real owners; delete aggregate status | DS-004, DS-011, DS-012 |
| BEH-010 | System / Contract | REQ-002, REQ-005, REQ-012, REQ-017, REQ-021; AC-004, AC-011, AC-015, AC-021, AC-027, AC-028 | Supported input reaches a Codex run while identified provider turn A is current | Live native rollout/AutoByteus trace; `CodexThread.sendTurn`; generated 0.146 `turn/steer` schema | Codex provider boundary selects idle start versus exact current-turn steer; successful steer preserves A and terminal A settles idle; rejection creates no B | DS-014, DS-003, DS-006, DS-007 |
| BEH-011 | User / Control | REQ-008, REQ-019, REQ-022; AC-002, AC-029 | User interrupts a standalone or focused exact team member while connected, disconnected, connecting, reconnecting, or racing socket send | 17 live server failures; standalone/team handlers; SEND_MESSAGE-only ack; `ARCH-FIND-004`; `WebSocketClient.state/send`; retained frontend services | A successfully transmitted interrupt receives one matched control acknowledgement; immediate non-admission and in-flight disconnect produce exactly-once local transport feedback; no outcome changes lifecycle or becomes agent `ERROR` | DS-015, DS-001, DS-002, DS-005 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/production-trace-evidence.md` | Matched agent production trace and live snapshot probe | REQ-001–REQ-012 / AC-001–AC-015 | Grounds the preserved agent lifecycle/gateway design | Complete; evidence-only; approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/team-status-simplification-evidence.md` | Team authority, aggregate-consumer trace, and binary presentation correction | REQ-013–REQ-020 / AC-016–AC-026 | Grounds clean aggregate removal plus binary group/run visuals | Updated; evidence-only; approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/codex-steering-stale-running-evidence.md` | Live Codex A/B identity, silent interrupt result, protocol, and source evidence | REQ-002, REQ-005, REQ-012, REQ-019, REQ-021–REQ-022 / AC-002, AC-004, AC-011, AC-027–AC-029 | Grounds the provider-local start/steer invariant and control-result return path | Complete; evidence-only; approval N/A |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_6557dd2b51c3__image.png` | Agent UI screenshot | REQ-001, REQ-008 / AC-001, AC-009 | Shows Running with the wrong primary action | User-supplied evidence; approval N/A |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_9d9c83cf3d30__image.png` | Team hierarchy screenshot | REQ-013–REQ-017 / AC-016, AC-017, AC-021, AC-023 | Distinguishes redundant root status from useful member status | User-supplied evidence; approval N/A |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_ead75793b5e3__image.png` | Team-definition screenshot | REQ-013 / AC-016 | Shows the invalid definition-level status dot | User-supplied evidence; approval N/A |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_0fa01fdeb308__image.png` | Delivery-candidate team UI screenshot | REQ-016, REQ-020 / AC-023, AC-026 | Shows both missing team activity positions that the user explicitly restored | User-supplied evidence; approved behavior 2026-08-03 |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_638f89bebf84__image.png` | Live Codex verification screenshot | REQ-002, REQ-005, REQ-021–REQ-022 / AC-004, AC-027–AC-029 | Shows completed output with server-derived Running and ineffective visible Stop | User-supplied evidence; approval N/A |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_3456bc49f3dc__image.png` | Focused exact-member verification screenshot | REQ-008, REQ-019, REQ-022 / AC-002, AC-029 | Confirms the stale running member and red Stop state | User-supplied evidence; approval N/A |

## Task Design Health Assessment (Mandatory)

- Change posture: prior `Bug Fix`/`Refactor`/`Cleanup` and `SR-006` presentation behavior are accepted; `SR-007` established the provider-boundary fix and command-result contract; `SR-008` is a bounded frontend control-transport design correction for `ARCH-FIND-004`.
- Current design issue found: `No` in the accepted runtime-neutral lifecycle/team architecture or the architecture-approved Codex/server result paths; `Yes` only in immediate frontend interrupt admission/send completion.
- Root cause classification for SR-008: `Missing Invariant` at the streaming-service admission boundary. Pending registration, connected-state validation, synchronous send, rollback, callback, and boolean return were not specified as one atomic failure-safe transition.
- Refactor needed now: `Yes`, locally. Both existing services must use the same tight admission helper/transition and boolean result; no new event, lifecycle, coordinator, or public transport message is required.
- Evidence:
  - The original agent action was governed by two independently mutable fields; that part is already corrected on this branch.
- Accepted source has one agent lifecycle owner, one team liveness representation (`isActive`), exact nested identity, and no aggregate shortcut consumers. Those boundaries correctly expose rather than cause the Codex phantom ID.
- Native Codex proves same-turn steering is the supported busy-input behavior; native AutoByteus proves a separate predictable FIFO turn model. Runtime-neutral callers must not guess or unify those provider semantics.
- Design response: preserve the architecture-approved provider and admitted-request result design; add a shared frontend admission helper that owns register/check/send/rollback/exactly-once local failure, then let both services return its boolean result.
- Refactor rationale: weakening the current/retired-turn state machine or treating interrupt rejection as runtime `ERROR` would repair symptoms at the wrong authority. The smallest healthy correction strengthens the two owners already responsible for provider control and command transport.
- Intentional deferrals and residual risk: provider reasoning/tool loops, native AutoByteus queueing, Claude input semantics, task-stage semantics, team topology, and general workspace styling remain unchanged. A future Codex protocol change remains an adapter maintenance risk; typed exact-response validation contains it.

## Terminology

- **Agent lifecycle:** The five-state lifecycle of one exact `AgentRun`.
- **Team definition:** Reusable configuration/topology; never a runtime subject.
- **Team definition-group activity:** Presentation-only `hasActiveRuns = runs.some(run.isActive)` for the concrete child collection shown beneath a definition group; not a definition field or lifecycle.
- **Root team run liveness:** `isActive` for one exact root `teamRunId`, owned by `AgentTeamRunManager` registration plus backend liveness.
- **Team lifecycle message:** `TEAM_RUN_LIFECYCLE { team_run_id, is_active }`, a binary manager fact; not a member aggregate.
- **Leaf-agent snapshot:** `AgentStatusPayload` for an actual agent execution, including exact route/path/run/task identity.
- **Task-team stream scope:** Tight outward identity `{ taskTeamRunId, taskTeamInstanceId, taskId, logicalTeamPath, logicalTeamRouteKey }`. Its logical-team path/key are always rooted in the enclosing event/snapshot `teamRunId`; it deliberately excludes operational ingress/coordinator-local selectors.
- **Team leaf-agent snapshot:** Internal discriminated carrier `{ scopeKind, teamRunId, payload, taskTeamScope? }`, where `payload` is canonical `AgentStatusPayload` with required leaf identity; `ordinary_member` has no task-team field and `task_team_member` requires one coordinate-consistent `TaskTeamStreamScope`.
- **Mixed team stream scope:** Shared `teamRunId`/source-path/task-team envelope projected from every live `TeamRunEvent` type or a team leaf-agent snapshot and prefixed once at each parent boundary. Agent events/snapshots additionally carry a member path in the same frame.
- **Open execution work:** Private boolean used only for safe task-team settlement; it is not a public status or display value.
- **stopPending:** Frontend-local duplicate-request guard; it never changes `isActive`.
- **Team activity dot:** Solid binary UI indicator that accepts only a boolean and accessible label; distinct from the agent-only five-state `StatusDot`.
- **Codex started input:** Input submitted while no provider turn is current through `turn/start`; only its required returned provider turn ID may establish the new current turn.
- **Codex steered input:** Input submitted while identified provider turn A is current through `turn/steer(expectedTurnId=A)`; the returned ID must equal A and does not create/start another lifecycle turn.
- **Interrupt command acknowledgement:** Control-plane response correlated by client command ID and exact standalone/team-member target; never an agent event, lifecycle fact, or transcript segment.
- **Interrupt transport admission:** One synchronous frontend transition that registers exact pending correlation and returns true only after a connected socket send returns without throwing.
- **Interrupt transport failure:** Local exactly-once result for a non-admitted or previously admitted command whose connection is lost; it is not `AGENT_COMMAND_ACK`, `AGENT_STATUS`, or an `ErrorSegment`.

## Design Reading Order

Read the agent/team spines through DS-013 as preserved branch foundations, DS-014 as the architecture-approved Codex provider-local input design, and DS-015 as the admitted-or-locally-failed interrupt return spine completed by `SR-008`. The removal and file maps keep those additions inside existing owners and forbid changes to accepted lifecycle/team semantics.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Preserve the already implemented removal of agent `can_interrupt` / `canInterrupt`; do not reintroduce a derived alias.
- Delete backend `TeamStatusPayload`, `deriveTeamApiStatus`, root/nested `TeamRunEventSourceType.TEAM`, aggregate status overrides/deduplication, team command status construction, and aggregate snapshot/mapping code.
- Delete public/frontend `AgentTeamStatus`, root history `status`, team context/tree `currentStatus`, team-status normalization/hydration, and `TEAM_STATUS` protocol handling.
- Preserve deletion of five-state team visual helpers/components and the team branch of the agent `StatusDot`. Add a new boolean-only `TeamActivityDot`; do not retrofit the old helpers.
- Do not accept old and new team payloads, retain an optional `status`, translate `status` into `isActive`, or publish both `TEAM_STATUS` and `TEAM_RUN_LIFECYCLE`.
- Replace active-Codex `turn/start` with exact `turn/steer`; do not keep a fallback or dual path that retries start after steer rejection.
- Widen `AGENT_COMMAND_ACK` cleanly into SEND_MESSAGE and INTERRUPT_GENERATION variants. Do not add an interrupt-specific server message type or translate interrupt failures into generic `ERROR` events.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Run/team metadata JSON, raw trace JSONL, transcript/activity/task projections, and history-index rows under server memory. Volume depends on user history. Live agent lifecycle, root team aggregate status, and frontend projections are computed/in-memory.
- Relevant code-model, serialization, semantic, or physical-store change: Live agent DTO has already removed `can_interrupt`; GraphQL/frontend team history removes computed root `status` while retaining `isActive` and `members[].status`; WebSocket replaces root aggregate `TEAM_STATUS` with binary `TEAM_RUN_LIFECYCLE`. `SR-007` adds only ephemeral Codex input-result and WebSocket interrupt-command correlation types; `SR-008` adds only an ephemeral local admission/failure helper/type. None is persisted.
- Normal reader/writer behavior and representative evidence: Team history already calculates `isActive` from `AgentTeamRunManager`; member statuses are live projections with offline fallback. Metadata/traces persist identities, topology, content, task records, and termination data, not a required aggregate-team lifecycle.
- Required semantics and invariants under direct use: Preserve all identity, topology, transcript, late activity, task records, and termination history. Active lifecycle is rebuilt from live runtime/manager state. Historical traces that contain a prior phantom accepted-input turn ID remain readable evidence; no reader may restore that historical correlation ID as a live current turn.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: No user data rewrite or deletion; server and frontend contracts ship together.
- Decision: `Directly Usable — No Migration`
- Decision rationale: Existing stored data remains meaningful and current readers can ignore obsolete historical superset fields. A bulk rewrite adds I/O/corruption/recovery cost without changing runtime authority.
- Acceptance criteria or design constraints supported: REQ-011, REQ-012, REQ-014–REQ-022; AC-008, AC-011, AC-012, AC-018–AC-029.

### Migration Plan

N/A — the decision is `Directly Usable — No Migration`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-003, BEH-005 | Standalone user command | Provider turn / exact interrupt | `AgentRun` | Preserved status-only standalone action path |
| DS-002 | Primary End-to-End | BEH-001, BEH-005, BEH-009 | Team member command | Exact nested `AgentRun` turn / interrupt | `TeamRun` route boundary + member `AgentRun` | Preserves exact compound identity |
| DS-003 | Return-Event | BEH-002–BEH-004 | Runtime source batch | Standalone subscribers | `AgentRun` | Preserved single processing/finalization path |
| DS-004 | Return-Event | BEH-001–BEH-004, BEH-009 | Nested agent final event or initial leaf snapshot at arbitrary ordinary/task-team depth | Matching frontend leaf/task-team-scoped context | member `AgentRun` + mixed-team stream-scope bridge | Gives live and reconnect status one representable identity whose paths remain in the current parent frame |
| DS-005 | Primary End-to-End | BEH-001, BEH-005 | Button/Enter/programmatic action | Send or exact interrupt | frontend primary-action policy | Prevents input-path disagreement |
| DS-006 | Bounded Local | BEH-002–BEH-004 | Queued agent facts/events/snapshot | Canonical status + final event batch | run-owned lifecycle state/finalizer | Enforces current/retired-turn precedence |
| DS-007 | Return-Event | BEH-003 | Stream bind/recovery | Canonical agent snapshot | `AgentRun.getStatusSnapshot()` | Prevents stale startup on reconnect |
| DS-008 | Return-Event | BEH-007, BEH-008 | Manager register/read/unregister | GraphQL/history and live team frontend `isActive` | `AgentTeamRunManager` | Gives root Stop one binary authority |
| DS-009 | Return-Event | BEH-002 | Local/processor agent event | Agent subscribers | `AgentRun.publishEvent` / gateway | Preserves all outward origin coverage |
| DS-010 | Bounded Local | BEH-006, BEH-008 | Definition/history read model | Team definition/run presentation | workspace history projection | Removes status from non-agent subjects |
| DS-011 | Return-Event | BEH-009 | Task terminal/result/failure facts | Task projection cleanup and lifecycle observer | task delegation / operation / member failure owners | Replaces aggregate shortcuts |
| DS-012 | Bounded Local | BEH-009 | Settlement request | settle now or wait | `TeamRun.hasOpenExecutionWork()` + task delegation service | Replaces aggregate status as work predicate |
| DS-013 | Bounded Local | BEH-006, BEH-008 | Existing child-run `isActive` booleans | Accessible group/run activity dots | workspace presentation | Restores scan clarity without a new lifecycle or transport field |
| DS-014 | Primary End-to-End | BEH-010 | Supported direct/inter-agent/system input for a Codex run | Provider start or exact same-turn steer and correlated `AgentOperationResult` | `CodexThread` | Prevents provider request identity from replacing actual current-turn identity |
| DS-015 | Primary + Return/Control | BEH-001, BEH-005, BEH-011 | Standalone/exact-member Stop click in any socket state | Not-admitted local transport result, matched server acknowledgement, or provider terminal lifecycle | frontend admission helper + streaming service + server stream handler | Makes every interrupt attempt complete observably without creating another lifecycle owner |

## Primary Execution Spine(s)

- **DS-001:** `Composer -> primary-action policy -> activeContextStore -> AgentRun command -> backend -> provider`
- **DS-002:** `Composer -> exact teamRunId/memberRouteKey/memberRunId -> TeamRun -> mixed member handle -> nested AgentRun -> provider`
- **DS-005:** `Click | Enter | programmatic admission -> resolveAgentPrimaryAction -> rechecked store command -> Send | exact Interrupt | Disabled`
- **DS-014:** `supported input origin -> AgentRun.postUserMessage -> CodexAgentRunBackend -> CodexThread -> activeTurnId branch -> turn/start | turn/steer(expected A) -> exact result identity -> accepted-input observer/canonical lifecycle`
- **DS-015:** `Stop click -> store builds commandId + exact target -> service register/check/send -> not admitted: delete + exact local transport failure + false | admitted: true -> WebSocket handler -> AgentRun.interrupt | TeamRun.interruptMember -> AgentOperationResult -> AGENT_COMMAND_ACK -> client ID/target match -> accepted wait | rejected/failed toast`; later disconnect drains only still-pending admitted commands.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The existing command boundary applies startup/current-turn facts to one `AgentRun`; its status-only projection drives the standalone action. | agent run, turn, action | `AgentRun` | provider adapter, submission pending |
| DS-002 | `TeamRun` validates the exact route/run identity and delegates to one member handle; only the nested `AgentRun` owns agent lifecycle. | team run, member identity, agent run | `TeamRun` and member `AgentRun` | routing, task instance identity |
| DS-003 | Runtime source batches enter the run queue, processors derive final events, then the lifecycle finalizer adds ordered status companions before listeners. | source event, final event, status | `AgentRun` | mapper, content batching |
| DS-004 | A task-team handle derives `TaskTeamStreamScope` in its immediate parent frame. Each outer ordinary boundary passes every live event type and initial snapshot through `prefixMixedTeamStreamScope`, rebasing source and logical-team paths together; agent adapters rebase member paths with the same private rule. The shared flattener then computes one nonempty relative leaf selector for live and reconnect. | leaf agent, parent-frame stream scope, scoped snapshot/event | mixed-team bridge | path/key rebasing, strict leaf validation |
| DS-005 | One discriminated policy resolves Send/Stop/Disabled for every trigger and the store rechecks immediately before executing. | draft, agent status, action | primary-action policy | upload/pending state |
| DS-006 | One current/anonymous/retired-turn state reconciles command facts, fresh runtime evidence, and ordered events; late content renders without lifecycle rollback. | current turn, retired turns | run-owned lifecycle state | terminal classification |
| DS-007 | A listener binds first, then `AgentRun` reconciles a fresh backend lifecycle snapshot inside its queue and sends the canonical result. | agent snapshot | `AgentRun` | history/live precedence |
| DS-008 | Manager registration is created/restored once, queried for history/resume, and removed once after accepted termination or detected backend death. The same owner notifies live subscribers with one binary fact. | root team run | `AgentTeamRunManager` | GraphQL mapper, socket session |
| DS-009 | Awaited local events join runtime events before processors/finalization; no caller performs listener fanout or status pairing. | local agent event | `AgentRun` | producer-specific persistence |
| DS-010 | Definition groups retain a representative only for definition metadata/avatar needs. They never borrow that run's status; group/run presentation consumes binary activity through DS-013. | definition, root team run | workspace history projection | accessibility text |
| DS-011 | Task terminal events and task-record refresh remove task projections; explicit operation results and leaf-agent terminal failures report failures. No team enum mediates them. | task, operation, failure | task/failure owners | scheduling and toast state |
| DS-012 | Settlement asks task delegation whether records remain open and asks the child team run whether execution work remains; it settles only when both are false. | child team execution | `TeamRun` backend + settlement coordinator | task directories |
| DS-013 | The group builder calculates `hasActiveRuns` from all displayed children. The group row renders that boolean; each exact run row renders its own `isActive`. Both use one boolean-only component with solid blue/gray and accessible labels. | team display group, root team run | workspace presentation | localization, focused component tests |
| DS-014 | After Codex startup readiness, `CodexThread` reads its current provider identity once for this submission. No current turn means start and install the required returned ID. Identified A means steer with exact A, require returned A, and never call the start transition. Provider rejection or response mismatch returns failure with no identity mutation/fallback. | provider thread, current turn, input result | `CodexThread` | typed app-server request/response parsing, accepted-input memory observer |
| DS-015 | Existing standalone/team action routing creates one client command ID and exact target. A shared frontend admission helper registers it, requires `CONNECTED`, attempts send, and rolls back with exactly-once local failure/false on nonconnected state or throw. Admitted commands remain pending until exact server acknowledgement or disconnect. The service accepts only a matching acknowledgement, while the store reports local/rejected/failed outcomes through toast; accepted acknowledgement leaves status untouched until terminal provider events arrive. | interrupt command, exact target, admission result, acknowledgement, lifecycle | frontend admission helper + streaming service + server stream handler | command ID generation, localized toast, connection reason normalization |

## Spine Actors / Main-Line Nodes

- Agent: composer, primary-action policy, frontend stores, stream service, `AgentRun`, lifecycle state/finalizer, runtime backend/provider.
- Team member: exact team command boundary, mixed leaf member handle, nested `AgentRun`, team event identity bridge, leaf context resolver.
- Root team liveness: GraphQL mutation/history/resume, `AgentTeamRunManager`, team WebSocket lifecycle binding, `AgentTeamContext.isActive`, Stop policy.
- Former aggregate consumers: task-delegation event/record projection, `AgentRunCanonicalFailureObserver`, `TeamRun.hasOpenExecutionWork()`, settlement coordinator.
- Codex busy input: runtime-neutral message caller, `AgentRun`, Codex backend, `CodexThread`, typed app-server request boundary, accepted-input observer.
- Interrupt result: composer/action facade, standalone/team store, streaming service pending command matcher, server stream handler, exact `AgentRun`/`TeamRun` operation, toast feedback.

## Ownership Map

- **`AgentRun`:** Sole agent command, event, lifecycle, snapshot, and subscriber owner; preserved from `SR-002`.
- **`AgentTurnLifecycleState`:** Internal current/retired-turn state and precedence; never a transport/public owner.
- **Runtime backend:** Provider control plus neutral source batches and internal lifecycle snapshot; never final public dispatch.
- **`AgentTeamRunManager`:** Root team registration, fresh liveness check, idempotent unregistration, and root lifecycle subscribers.
- **`TeamRun`:** Thin exact-team command/event facade and private open-execution-work facade; no aggregate status cache.
- **`MixedTeamManager`:** Member orchestration, recursive leaf status snapshot collection, and private execution-work predicate; no public root lifecycle.
- **Leaf mixed member handle:** One `TeamLeafAgentStatusSnapshot` with required agent/member/source identity and exact agent operations; task-agent fields remain in the canonical payload.
- **Subteam handle:** Child-run orchestration; recursively prefixes child live events and snapshots while rebasing any retained `TaskTeamStreamScope` into the parent frame; never returns an agent-like status for the team node.
- **Task-team handle:** Child-run orchestration; derives one tight `TaskTeamStreamScope` from its operational `TaskTeamInstanceIdentity` in the immediate parent frame and supplies that same override to live/snapshot adapters; owns no five-state team status.
- **Task delegation subsystem:** Task stage, terminal state, records, and task projection reconciliation.
- **Frontend `AgentTeamContext`:** Root `isActive`, connection `isSubscribed`, focus, topology, and leaf contexts as separate fields.
- **Workspace projection:** Definition grouping, binary collection summary, and action presentation; no lifecycle authority. It may derive `hasActiveRuns` from already-projected child booleans but cannot persist or transport it.
- **`CodexThread`:** Sole owner of whether a Codex input is a new provider turn or same-turn steering, exact request shape, response identity validation, and start-only current-turn installation.
- **Standalone/team stream handlers:** Owners of mapping one interrupt request to one control acknowledgement on the same socket; they do not derive lifecycle.
- **Frontend streaming services:** Owners of pending interrupt command ID/target correlation and delivery to a result callback; they reject unmatched/stale acknowledgements and do not mutate status.
- **Frontend run/team stores:** Owners of client command ID creation and localized user feedback. They retain their existing boolean admission result and exact target validation; no interrupt lifecycle field is added.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL team create/restore/terminate/history/resume | `AgentTeamRunManager` / history service | Public request/query transport | Status aggregation or optimistic liveness truth |
| Team WebSocket handler | `AgentTeamRunManager` + exact `TeamRun` | Live root lifecycle and member-event transport | Member lifecycle, socket-derived liveness, task stage |
| `TeamRun` | manager/backend owners | Stable command/event boundary | Root registration or aggregate status cache |
| frontend team run store | GraphQL/manager fact | UI orchestration and cleanup | Deriving `isActive` from context/socket/member state |
| `AgentRun.postUserMessage` / `CodexAgentRunBackend.postUserMessage` | `CodexThread` for provider method selection | Runtime-neutral accepted-input entry | Branching on Codex provider semantics or fabricating a second lifecycle turn |
| standalone/team WebSocket handler | exact `AgentRun` / `TeamRun` operation plus ack mapper | Request transport and same-socket control result | Treating an acknowledgement as status, transcript error, or team lifecycle |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `team-status-payload.ts`, `team-status-aggregation.ts` | Public team aggregate removed | Manager binary liveness; private work predicate | In This Change | Delete tests that only validate aggregation |
| `TeamRun.statusOverride/getStatusSnapshot/observeBackendEvent` | Duplicate/cached aggregate owner | manager snapshot; leaf snapshot API | In This Change | No alias |
| `TeamManager`/backend `getStatusSnapshot` | Forces aggregate on all team backends | `getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[]`, `hasOpenExecutionWork` | In This Change | Specialize responsibility |
| `TeamRunEventSourceType.TEAM` and `TeamRunStatusUpdateData` | Conflates root/nested concerns | manager `TEAM_RUN_LIFECYCLE`; task/failure facts | In This Change | No nested five-state replacement |
| `publishTeamStatusIfChanged`, `lastTeamStatus`, `rootOfflinePublished` | Aggregate/dedup machinery | manager registration lifecycle | In This Change | Member events continue normally |
| Team portions of `TeamCommandStatusOverlayStore` and team command-status builders | Teams no longer present agent status | operation result; member-only overlay | In This Change | Rename store/file if only member concern remains |
| Pseudo subteam/task-team `getStatusSnapshot()` | Makes a team look like an agent and cannot carry task-team leaf scope | recursive scoped leaf snapshots + private work predicate | In This Change | Tighten handle interfaces; no plain payload array |
| `TeamRunStatusProjectionService.status` | Duplicates `isActive` | activity/member projection | In This Change | Rename to `TeamRunLiveProjectionService` |
| GraphQL root team history `status` | No public meaning | `isActive`; `members[].status` | In This Change | Regenerate client types |
| WebSocket `TEAM_STATUS` protocol/handler | Aggregate contract removed | `TEAM_RUN_LIFECYCLE`; leaf `AGENT_STATUS` | In This Change | No compatibility parsing |
| frontend `AgentTeamStatus` and team `currentStatus` fields | Parallel authority | root `isActive`; leaf `AgentStatus` | In This Change | Remove imports/tests/fixtures |
| team-status hydration/normalization and status-to-active helpers | Circular conversion | direct `isActive` application | In This Change | Keep agent normalization |
| five-state definition/run team dots, `TeamStatusDisplay`, `useTeamStatusVisuals`, team branch in `StatusDot` | Wrong subject/presentation | separate boolean-only `TeamActivityDot`; existing Active/Inactive text | Already Removed; Do Not Restore | New component accepts no status enum and shares none of the old normalization |
| task-team cleanup on offline `TEAM_STATUS` | Task stage disguised as lifecycle | terminal task event + record reconciliation | In This Change | No timer/status fallback |
| root aggregate-error branch in team lifecycle observer | Duplicate failure inference | canonical leaf-agent failure + explicit operation result | In This Change | Preserve ATTACHED/TERMINATED |
| one-second inactive polling in team lifecycle observer | Polls a fact the manager owns | manager lifecycle subscription | In This Change | Exact unregister notification emits TERMINATED |
| settlement fallback `childRun.getStatusSnapshot()` | Public enum used internally | `childRun.hasOpenExecutionWork()` | In This Change | Preserve error-as-work-blocking semantics |
| active-Codex `turn/start` plus unconditional `markTurnStarted(responseId)` | It creates phantom B for same-turn input into A | exact `turn/steer(expectedTurnId=A)` with returned-A validation | In This Change | Idle start remains; no active-start fallback |
| log-only standalone/team interrupt rejection | User receives no observable result | `AGENT_COMMAND_ACK` interrupt variant on the originating socket | In This Change | Accepted also acknowledges but status waits for provider terminal events |
| frontend SEND_MESSAGE-only ack interface and generic `handleError` use for command rejection | Cannot represent interrupt target/outcome and appends false runtime content | discriminated ack union + control-result callback/toast | In This Change | Preserve SEND_MESSAGE fields/dedupe exactly; no compatibility alias |

## Return Or Event Spine(s) (If Applicable)

- **Agent standalone:** `provider/local source -> AgentRun queue -> processors -> lifecycle finalizer -> AGENT_STATUS companion + final event -> mapper -> socket -> agent state/rendering`.
- **Agent in team, live:** `nested AgentRun final sequence -> TeamRunAgentEventPayload + TaskTeamStreamScope -> prefixMixedTeamStreamScope at each ordinary/task boundary -> root-frame TeamRun event -> shared task-team flattener -> socket -> exact leaf resolver -> agent state/rendering`.
- **Agent in team, initial/reconnect:** `nested AgentRun canonical snapshot -> TeamLeafAgentStatusSnapshot + TaskTeamStreamScope -> same prefixMixedTeamStreamScope at each boundary -> root-frame snapshot mapper + same flattener -> AGENT_STATUS -> same exact leaf resolver`.
- **Root team lifecycle:** `manager register/unregister/stale-backend cleanup -> manager lifecycle listener -> TEAM_RUN_LIFECYCLE -> team context isActive -> Stop/inactive actions`.
- **Team initial convergence:** `bind TeamRun event listener + manager lifecycle listener -> fresh manager snapshot -> recursively scoped leaf snapshots mapped to AGENT_STATUS + root lifecycle snapshot -> frontend`.
- **Task cleanup:** `TASK_DELEGATION_TERMINAL_STATUS / record refresh -> task projection reconciler -> remove transient task-team projection`.
- **Observed lifecycle:** `manager lifecycle false -> observed TEAM_RUN TERMINATED`; `leaf AgentRun terminal failure -> team envelope -> AgentRunCanonicalFailureObserver -> observed TEAM_RUN FAILED`; command/mutation failure remains its returned operation result. The current one-second inactive poll and aggregate-error branch are removed.
- **Codex accepted input:** `AgentRun.postUserMessage -> Codex backend -> CodexThread start/steer -> exact turnId in AgentOperationResult -> RuntimeMemoryEventAccumulator/other command observers`. Busy steer returns A; it never manufactures B.
- **Interrupt control result:** `standalone/team handler -> operation result -> interrupt ack mapper -> same WebSocket -> pending command matcher -> store callback -> localized error toast when rejected/failed`. This path is separate from `AgentRunEvent`, `AGENT_STATUS`, and transcript dispatch.

## Bounded Local / Internal Spines (If Applicable)

- **DS-006, parent `AgentRun`:** `enqueue -> fresh runtime evidence -> reconcile current/retired turn -> processors -> lifecycle finalizer -> ordered listener delivery`.
- **DS-008, parent `AgentTeamRunManager`:** `register/get/terminate/stale-check -> one transition helper -> update activeRuns -> notify exact-run lifecycle listeners`. Notifications occur only when the registered boolean changes.
- **DS-012, parent `MixedTeamManager`:** `enumerate live member handles -> leaf agent status work-blocking check OR recursive child work -> boolean`. Work-blocking agent status is `initializing | running | error`; `idle | offline` is closed. Active task-agent/task-team directories and task-delegation records remain separate explicit checks.
- **DS-014, parent `CodexThread`:** `await startup -> snapshot activeTurnId -> null: start/parse/install | A: steer(expected A)/parse/validate A/no install -> return exact ID | throw without mutation`.
- **DS-015, parent streaming service:** `create/store command ID + expected target -> send -> receive ack before event routing -> match ID + exact target -> delete pending -> result callback`. Disconnect clears pending registrations and reports a transport failure through the same callback; it does not change agent status.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Provider lifecycle projector | DS-001, DS-003, DS-006, DS-007 | `AgentRun` | Normalize provider phase/current turn | Runtime differences are real | Provider semantics leak into UI |
| Team identity rebasing | DS-002, DS-004 | mixed-team bridge | Keep event/snapshot teamRunId, source/member paths, and task-team logical path in one parent frame for live and initial paths | Exact targeting/nesting | Wrong/root task-team node updated; reconnect throws |
| Manager lifecycle broadcaster | DS-008 | `AgentTeamRunManager` | Notify exact-run active transition | Live clients need convergence | Socket close becomes false liveness |
| Scoped leaf snapshot carrier/prefixer | DS-004 | mixed team runtime | Compose canonical leaf status with ordinary/task-team stream scope, then rebase it exactly like every live event | Reconnect at nested/task-team depth | Scope is lost or uses a different coordinate frame |
| Content presentation scheduler | DS-003, DS-004 | streaming UI | Preserve batching while status applies immediately | Performance | Status pairing destroys batching |
| stopPending map | DS-008 | UI action caller | Prevent duplicate mutation | Local idempotency UX | Becomes a second lifecycle owner |
| Task record refresh/projection | DS-011 | task delegation | Reconcile transient task nodes | Task business truth | Task stage becomes team status |
| Failure observer | DS-011 | observed run lifecycle | Promote canonical leaf terminal failure | Operational visibility | Member error folded into team status |
| Open-work predicate | DS-012 | settlement | Decide whether execution can settle | Internal safety | Public enum recreated |
| Codex start/steer response parsers | DS-014 | `CodexThread` | Parse the distinct `turn/start` nested turn and `turn/steer` top-level turnId schemas | Provider contract shapes differ | A request/correlation ID becomes lifecycle identity |
| Interrupt acknowledgement mapper | DS-015 | server stream handlers | Convert operation result to accepted/rejected/failed and attach exact target | Two handlers need one contract | Divergent/silent feedback or generic runtime error |
| Pending interrupt matcher | DS-015 | frontend streaming service | Correlate same-socket result by command ID and exact target | Prevent stale/cross-target feedback | Ack routed as member activity or applied to wrong surface |
| Localized control feedback | DS-015 | frontend run/team store | Show rejected/failed interrupt without transcript mutation | User must see the result | Command failure terminalizes agent message/lifecycle |

## Ownership Boundaries

`AgentRun` remains the authoritative agent boundary; local producers and runtime backends cannot emit directly to public listeners. `AgentTeamRunManager` becomes the authoritative root-team liveness boundary; GraphQL, history, resume, WebSocket, and frontend actions must not inspect both manager registration and member/backend internals to decide public activity.

`TeamRun` may expose `isActive()` internally to its manager and child handles, but only the root manager determines the public root fact. `MixedTeamManager.hasOpenExecutionWork()` is an internal settlement capability, not a lifecycle projection. Task-delegation stage and explicit operation failures remain in their existing domains.

The frontend may own connection state and request-pending state, but neither may mutate `isActive`. Only server create/restore/history/resume/lifecycle/termination success applies that field. Leaf `AGENT_STATUS` can mutate only the matched leaf agent context.

`CodexThread` is the authoritative provider-control boundary for Codex current-turn method selection. `AgentRun`, team delivery, notification senders, and the frontend must all call the runtime-neutral message boundary and may consume only `AgentOperationResult`; none may inspect Codex `activeTurnId` or choose `turn/start`/`turn/steer`. Conversely, `CodexThread` may mutate provider current-turn identity only on a validated new-turn start or provider terminal event, never from a steering response.

Interrupt acknowledgement is owned by the WebSocket command boundary, not the agent event boundary. The server handler owns result construction and same-connection delivery. The frontend streaming service owns pending command correlation. The store owns user feedback. No layer may send the ack through `AgentRun.publishEvent`, member event scoping, generic `handleError`, or lifecycle reconciliation.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentRun` | queue, lifecycle state, processors/finalizer, backend evidence | commands, streams, local producers | backend listener/direct dispatch/status override | Extend `AgentRun` named methods |
| `AgentTeamRunManager.getLifecycleSnapshot/subscribeToLifecycle` | active map, backend live validation, transition notification | history/resume/socket/liveness reads | member aggregate, socket presence, raw map access | Extend manager lifecycle API |
| `TeamRun.getLeafAgentStatusSnapshots` | backend recursive `TeamLeafAgentStatusSnapshot` collection | stream/history live projection | subteam `AgentStatusPayload` or plain `AgentStatusPayload[]` that drops task-team scope | Extend the scoped leaf snapshot carrier, not `AgentStatusPayload` |
| `prefixMixedTeamStreamScope` | one mixed-team parent-frame transition | all live event adapters and initial leaf snapshot adapter | leaf-only prefix logic, cloned child-local scope, or mapper/frontend guessing | Extend this core and its invariants |
| `TeamRun.hasOpenExecutionWork` | backend member/child predicate | settlement coordinator | `getStatusSnapshot().status` | Extend private execution-work capability |
| task delegation projection | terminal event + record reconciliation | frontend task router | TEAM_STATUS offline cleanup | Extend task event/record mapper |
| `CodexThread.submitInput` (renamed from misleading `sendTurn`) | provider current-turn identity, app-server method selection, exact response validation | Codex backend only | `AgentRun`/team caller choosing start versus steer, or active `turn/start` fallback | Extend the provider-local method with explicit start/steer branches |
| interrupt acknowledgement mapper | operation result -> tight control response | standalone/team stream handlers | log-only rejection, generic `ERROR`, or runtime event publication | Extend the shared ack union/builder |
| frontend streaming-service matcher | pending command ID + exact target | run/team stores | member event resolver or transcript error handler | Extend streaming-service options/result callback |

## Dependency Rules

- Runtime backends -> source batches/internal lifecycle evidence -> `AgentRun`; never public listeners.
- `AgentRun` -> canonical agent events/status; team code wraps but never recalculates them.
- Team history/resume/WebSocket -> `AgentTeamRunManager` lifecycle API; never `deriveTeamApiStatus` or frontend context membership.
- `AgentTeamRunManager` may call `TeamRun.isActive()` to validate a registration; callers receive only manager-owned binary lifecycle.
- `MixedTeamManager` may query scoped leaf-agent snapshots and child private work predicates; it must not construct a team `AgentStatusPayload`. The task-team handle derives a parent-frame `TaskTeamStreamScope`; every outer recursive boundary rebases that scope instead of cloning child-local coordinates.
- Team lifecycle transport contains only exact `team_run_id` and `is_active`; no member state, phase, error, interrupt permission, or socket state.
- Leaf status transport retains exact route/path/run/task identity. Every live event type and every initial snapshot must call `prefixMixedTeamStreamScope`; live agent/snapshot mapping must call the same strict leaf validator and `buildTaskTeamScopedIdentityPayload`. No other layer may prefix or infer task-team scope.
- Task projection depends on task events/records; failure observation depends on canonical agent failure/operation results; settlement depends on private work facts.
- Frontend team action code depends on exact-run `isActive` and stopPending only. Archive/delete additionally use existing inactive history lifecycle flags. Definition-group `hasActiveRuns` is display-only and cannot authorize an action.
- Runtime-neutral message callers depend on `AgentRun.postUserMessage`; Codex backend alone depends on `CodexThread.submitInput`; only `CodexThread` depends on app-server `turn/start`/`turn/steer` and response parsers.
- A Codex start response must contain a nonempty nested `turn.id`; a steer response must contain a nonempty top-level `turnId` equal to captured expected A. Missing/mismatched responses fail without current-turn mutation.
- A steer failure never retries `turn/start`. A terminal event that wins the race may clear A before the steer response; successful correlation still returns A but must not reinstall it.
- Client interrupt commands include one nonempty `command_id`. Server acknowledgements echo that ID plus exact target. Frontend services accept an acknowledgement only when both match the pending entry.
- Accepted interrupt acknowledgement clears pending control state only. `TURN_INTERRUPTED`/`TURN_COMPLETED` plus canonical `AGENT_STATUS` remain the only path to idle.

Forbidden shortcuts: status-to-active conversion, activity-to-`AgentStatus` conversion, representative-child status on definitions, persisting/transporting `hasActiveRuns`, `context exists -> active`, `socket connected -> active`, root false writing member statuses, a compatibility `AgentTeamStatus`, a replacement public “team phase” enum, mapper/frontend scope guessing, carrying a full operational `TaskTeamInstanceIdentity` as the outward stream coordinate, active-Codex `turn/start`, steer-to-start fallback, accepting a mismatched steer response ID, applying a command ack as status, or routing an interrupt failure through agent `ERROR`. Aggregating displayed child booleans with `some(isActive)` is the one approved presentation projection.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentStatusPayload { status, ...identity }` | exact agent run | Canonical five-state snapshot/companion | agent/member/task-agent fields only | Already implemented; no `can_interrupt`; no task-team fields added |
| `TaskTeamStreamScope` | one task-team execution as seen from the enclosing `teamRunId` | Carry only IDs and logical-team route/path needed for outward scoping | task-team run/instance/task IDs + logical-team path/key in parent frame | Derived from operational identity; excludes ingress/coordinator-local selectors |
| `TeamLeafAgentStatusSnapshot` | one leaf execution in a team snapshot | Compose canonical payload with exact recursive team scope | discriminated `ordinary_member` or `task_team_member` | Internal team contract; concrete shape below |
| `AgentTeamRunManager.getLifecycleSnapshot(teamRunId)` | root team run | Fresh `{ teamRunId, isActive }` | exact root `teamRunId` | Validates backend before true |
| `AgentTeamRunManager.subscribeToLifecycle(teamRunId, listener)` | root team run | Idempotent active transition stream | exact root `teamRunId` | Independent of TeamRun event listeners |
| `TEAM_RUN_LIFECYCLE` | root team run | Wire `{ team_run_id, is_active }` | socket run identity + payload ID | Root only; no source path/status |
| `buildTaskTeamStreamScope(taskTeamInstance, parentTeamRunId)` | task-team activation boundary | Derive the tight scope in its immediate parent frame | full operational identity + exact parent ID | Validates immutable parent ID and path/key consistency once |
| `prefixMixedTeamStreamScope(input)` | one live/snapshot parent transition | Prefix source path and retained task-team logical path once; accept a target-frame override | parent run ID, source prefix, child stream scope, optional target-frame scope | Shared by every live event type and initial snapshot adapter |
| `buildTaskTeamScopedIdentityPayload(scope)` | task-team wire identity | Flatten task-team IDs/logical-team/relative identity without rebasing | already-consistent source path + `TaskTeamStreamScope` | Shared by live event and initial snapshot mapping; no fallback |
| `TeamRun.getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[]` | leaf agents in a team | Recursive exact snapshots | team boundary + required leaf identity + discriminated scope | No subteam pseudo snapshot or plain payload array |
| `TeamRunBackend.getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[]` | backend leaf projection | Expose backend-owned recursive carrier | same | `TeamManager` has the same signature |
| `MixedTeamMemberHandle.getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[]` | one agent/subteam member subtree | Agent returns one; subteam recursively rebases | same | Task-team handle stamps the tight target-frame stream scope |
| `mapTeamLeafAgentStatusSnapshot(snapshot)` | initial team stream | Produce `AGENT_STATUS` with the live mapper's identity fields/order | one scoped snapshot | Calls shared flattener; outer task-team `task_id` wins as in live mapping |
| `TeamRun.hasOpenExecutionWork()` | private team execution | Settlement-safe boolean | exact in-memory child `TeamRun` | Not GraphQL/WebSocket/frontend |
| `TeamRunHistoryItem` GraphQL | root team history | History metadata + isActive + member statuses | exact root/team/member IDs | Root `status` removed |
| frontend `AgentTeamContext` | opened team context | `isActive`, connection, focus, topology | exact `teamRunId` | No `currentStatus` |
| `TeamActivityDot { isActive, label }` | team activity presentation | Solid binary visual + accessible meaning | caller-supplied boolean and localized label | No `AgentStatus`, phase, member state, or action policy |
| `WorkspaceHistoryTeamDefinitionDisplayGroup.hasActiveRuns` | one displayed definition group | `runs.some(run.isActive)` | the group's existing exact child collection | Presentation-only; not persisted or transported |
| `terminateTeamRun(teamRunId): Promise<boolean>` | root team operation | Return accepted success/failure | exact root `teamRunId` | Caller must handle false and clear pending |
| `CodexThread.submitInput(message): Promise<CodexInputSubmissionResult>` | one Codex input against current provider state | Select start or exact steer and return correlated provider turn | `{ kind: "started" | "steered", turnId: string }` | Start installs returned ID; steer validates/returns A without transition |
| `resolveStartedTurnId(payload)` | `turn/start` response | Require nested `turn.id` | unknown provider response -> nonempty string or throw | Existing start schema only |
| `resolveSteeredTurnId(payload)` | `turn/steer` response | Require top-level `turnId` | unknown provider response -> nonempty string or throw | Must not reuse nested start parser |
| `InterruptGenerationCommandAckPayload` | one control request/result | Echo command/outcome/exact target without lifecycle | client command ID + discriminated standalone/team-member target | No status, duplicate, transcript, or task fields |
| `AgentCommandAckPayload` | WebSocket command result union | Discriminate existing send and new interrupt results | `command_type` | SEND_MESSAGE arm remains unchanged |
| `tryAdmitInterruptCommand(input): boolean` | frontend local transport admission | Register exact pending entry, validate connected state, send, or atomically remove/report local failure | pending map + command/target + socket state/send + failure callback | `true` only after send returns; failure callback is delete-guarded exactly once |
| `completePendingInterruptTransportFailure(input): boolean` | frontend local transport completion | Delete one still-pending entry and invoke exact failure callback once | command ID + reason + pending map | Shared by admission catch/state failure and disconnect drain; no server ack |
| `drainPendingInterruptTransportFailures(input): number` | frontend disconnect completion | Snapshot and complete only entries still pending | pending map + disconnect reason | Used by automatic and intentional disconnect before teardown |
| `AgentStreamingService.interruptGeneration(commandId): boolean` | standalone interrupt request | Delegate exact standalone entry/send to failure-safe admission | command ID + connected run ID | Result callback only after exact match; false on non-admission |
| `TeamStreamingService.interruptGeneration(commandId, target): boolean` | exact member interrupt request | Delegate exact compound entry/send to failure-safe admission | command ID + team run + member route/run | Ack is intercepted before member/task routing; false on non-admission |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentStatusPayload` | Yes | Yes for its agent subject | Low | Preserve; do not add task-team fields |
| `TaskTeamStreamScope` | Yes | Yes | Low | Every path is explicitly relative to enclosing `teamRunId`; exclude operational local selectors |
| `TeamLeafAgentStatusSnapshot` | Yes | Yes | Low | Use required leaf payload plus discriminated scope |
| manager lifecycle API | Yes | Yes | Low | New exact-run listener/snapshot |
| `TEAM_RUN_LIFECYCLE` | Yes | Yes | Low | No nested/source-path overload |
| leaf snapshot API | Yes | Yes | Low | Return the scoped carrier and use the shared prefix/flatten functions |
| open-work API | Yes | Yes | Low | Keep private and boolean |
| frontend team context | Yes | Yes | Low | Remove aggregate and connection inference |
| `CodexInputSubmissionResult` | Yes | Yes | Low | Discriminate start/steer internally; expose only exact turn ID through `AgentOperationResult` |
| interrupt ack union | Yes | Yes | Low | Required target specialization; no mostly-optional generic command payload |
| pending interrupt matcher | Yes | Yes | Low | Match command ID and exact target; unmatched/stale result is not applied |
| interrupt transport admission helper | Yes | Yes | Low | One register/check/send/rollback/complete owner; boolean and local failure are derived from the same transition |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Agent runtime lifecycle | `AgentStatus` | Yes | Low | Preserve |
| Root registered team execution | `TeamRunLifecycleSnapshot` / `isActive` | Yes | Low | Avoid `TeamStatus` |
| Leaf runtime collection | `getLeafAgentStatusSnapshots` | Yes | Low | Replace generic member/team snapshot name |
| Scoped leaf carrier | `TeamLeafAgentStatusSnapshot` | Yes | Low | Keep team scope composed outside canonical agent payload |
| Scoped task-team projection | `TaskTeamStreamScope` | Yes | Low | Name distinguishes outward parent-frame scope from operational instance identity |
| Shared rebasing | `prefixMixedTeamStreamScope` | Yes | Low | Use for all live event types and initial snapshots |
| Settlement predicate | `hasOpenExecutionWork` | Yes | Low | Do not call it status |
| UI duplicate guard | `stopPending` / `terminatingTeamIds` | Yes | Low | Do not call active/terminating lifecycle |
| Definition group | `WorkspaceHistoryTeamDefinitionDisplayGroup` | Yes | Low | Keep status removed; add only derived `hasActiveRuns` |
| Binary team visual | `TeamActivityDot` | Yes | Low | Boolean-only; do not reuse agent `StatusDot` |
| Codex input owner | `CodexThread.submitInput` | Yes | Low | Rename `sendTurn` because supported input may steer the current turn rather than start one |
| Codex provider result | `CodexInputSubmissionResult` | Yes | Low | Internal discriminant documents whether a turn was started or steered |
| Interrupt result | `InterruptGenerationCommandAckPayload` | Yes | Low | Name remains control-command-specific, not lifecycle/error |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Agent lifecycle/gateway | agent execution lifecycle/pipeline | Reuse | Already implemented and reviewed | N/A |
| Root liveness | `AgentTeamRunManager` active registry | Extend | It already owns the fact | N/A |
| Live binary delivery | existing team WebSocket handler | Extend | Same exact root session | N/A |
| Leaf nested status | mixed member bridge/snapshot service | Extend | Existing identity owner | N/A |
| Task cleanup | task delegation projection/records | Extend | Owns task stage and terminality | N/A |
| Team failure | canonical agent failure observer + operation results | Reuse | Existing explicit facts | N/A |
| Settlement | existing coordinator/team backend | Extend | Existing decision owner | N/A |
| Team activity visuals | workspace presentation + existing `isActive` | Extend | Reuse exact booleans; add one boolean-only component | No backend/state-model change |
| Codex current-turn control | existing `CodexThread` + typed app-server client | Extend | The thread already owns activeTurnId and all provider commands | No new coordinator; private branch methods are sufficient |
| Command result transport | existing `AGENT_COMMAND_ACK` + WebSocket handlers/services | Extend | Same connection and command-response concept | No new server event type or lifecycle channel |
| Visible interrupt feedback | existing global `useToasts` through store callback | Reuse | Established localized non-transcript feedback | Do not call from domain/provider code |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent execution | status-only lifecycle and companions | DS-001–DS-007, DS-009 | `AgentRun` | Reuse | Preserve current branch implementation |
| Team execution domain | exact member routing, leaf snapshots, private work | DS-002, DS-004, DS-012 | `TeamRun`/Mixed manager | Refactor | Remove aggregate |
| Team run management | root registration/lifecycle | DS-008 | `AgentTeamRunManager` | Extend | Binary only |
| Team streaming | member events + root lifecycle transport | DS-004, DS-008 | stream handler | Refactor | Delete TEAM_STATUS |
| Run history GraphQL | root activity/member snapshot projection | DS-008 | history service | Refactor | Remove root status |
| Task delegation | task stage/terminal cleanup | DS-011, DS-012 | task service/coordinator | Extend | No team enum |
| Frontend runtime state | team isActive + leaf agent statuses | DS-004, DS-008 | stores/context | Refactor | Remove circular conversions |
| Workspace/mobile UI | binary group/run activity; binary action/text; no five-state team status | DS-010, DS-013 | presentation components | Extend | Agent visuals and mobile text remain |
| Codex provider adapter | idle start/current steer and identity validation | DS-014 | `CodexThread` | Refactor | Replace active start; preserve other runtimes |
| Agent/team WebSocket control | interrupt request/result | DS-015 | stream handlers | Extend | Widen ack union; no runtime event |
| Frontend streaming control | pending ack correlation and result callback | DS-015 | streaming services + stores | Extend | Toast failure; preserve lifecycle handlers |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-team-run-manager.ts` | team management | manager | active transition and listeners | Co-located with map mutation | lifecycle snapshot type |
| `team-run-lifecycle.ts` | team domain | manager contract | binary internal/wire-neutral type | Shared across manager/stream tests | Yes |
| `task-team-stream-scope.ts` | team domain | outward task-team scope contract | execution IDs plus parent-frame logical-team path/key | Separates stream coordinates from operational identity | `TaskTeamInstanceIdentity` input only |
| `team-leaf-agent-status-snapshot.ts` | team domain | scoped snapshot contract | required leaf payload plus ordinary/task-team stream scope | One tight recursive leaf identity type | canonical agent payload + stream scope |
| `team-run.ts` / backend interfaces | team execution | facade/backend | scoped leaf snapshots and private work | Natural team capabilities | scoped snapshot carrier |
| mixed member handles | mixed execution | specialized handles | leaf factory vs ordinary/task-team child recursion | Different runtime subjects | scoped carrier + prefix helper |
| `team-runtime-status-snapshot-service.ts` renamed | streaming | snapshot boundary | scoped leaf agent + root lifecycle initial messages | One initial convergence batch | lifecycle DTO + snapshot mapper |
| `team-stream-agent-identity-payload.ts` | streaming | live/initial identity flattener | consistent task-team stream scope to wire fields | One wire identity rule | `TaskTeamStreamScope` |
| team history projection service renamed | history | projection | isActive + leaf snapshots | One list projection | lifecycle snapshot |
| frontend protocol/context/history types | frontend state | contract | remove aggregate; add lifecycle message | Contract/state owners | isActive boolean |
| workspace team presentation files | UI | display | binary group/run activity plus direct actions | Existing surfaces | no team status enum or member-derived color |
| `codex-thread.ts` + ID resolver | Codex provider adapter | thread | exact idle-start/current-steer branch and distinct response parsing | One owner already holds provider current turn | typed app-server client |
| `interrupt-generation-command-ack.ts` | streaming transport | ack mapper | tight target union and operation-result outcome mapping | Shared by standalone/team handlers | existing operation result + send ack union |
| standalone/team stream handlers | streaming transport | request handler | always emit interrupt ack on originating connection | Existing command entrypoints | shared ack mapper |
| frontend command-ack protocol + services | frontend transport | matcher | discriminated parsing and pending ID/target match | Existing socket clients | exact ack types |
| `interruptCommandAdmission.ts` | frontend transport | local admission | shared register/check/send/rollback/drain and exactly-once callback | Two services require the same transition | pending command + local failure type |
| frontend run/team stores | frontend orchestration | feedback | build command ID and toast rejected/failed result | Existing action owners | `useToasts` |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| root team binary lifecycle | `team-run-lifecycle.ts` | team management/domain | manager, stream, tests share exact shape | Yes | Yes | task/member phase DTO |
| task-team outward scope | `task-team-stream-scope.ts` | team domain | live events and snapshots need the same minimal execution/logical-team coordinates | Yes | Yes | full operational identity or wire DTO |
| recursive all-event/live/snapshot rebasing | `mixed-team-event-bridge.ts` | mixed team bridge | all path-bearing stream scope must change frames together | Yes | Yes | leaf-only or snapshot-only path mapper |
| live/initial task-team wire fields | `team-stream-agent-identity-payload.ts` | team streaming | both mapper paths must flatten the same envelope | Yes | Yes | generic team status mapper |
| agent status visuals | existing `workspaceStatusDotPresentation.ts` | frontend presentation | agent rows share it | Yes | Yes | team aggregate visuals |
| binary team activity visual | new `TeamActivityDot.vue` | frontend presentation | history and running surfaces need the same strict boolean/color/accessibility semantics | Yes | Yes | generic status component or AgentStatus mapper |
| task terminal cleanup policy | existing task execution router/projection | task delegation | all task terminal messages reconcile once | Yes | Yes | root lifecycle handler |
| Codex input outcome | `codex-thread.ts` exported type or adjacent tight type file | Codex adapter | Backend/tests need one exact started/steered result | Yes | Yes | generic provider operation union |
| command acknowledgement | server/frontend command-ack type files | streaming transport | SEND_MESSAGE and INTERRUPT share one wire discriminant | Yes | Yes | mostly-optional all-command DTO |
| interrupt target matcher | frontend streaming protocol/service | streaming transport | standalone/team services need exact comparison | Yes | Yes | route inference or lifecycle selector |
| interrupt transport admission/completion | `interruptCommandAdmission.ts` | frontend streaming transport | standalone/team services have the identical register/check/send/rollback/drain invariant | Yes | Yes | socket lifecycle owner, retry queue, or fabricated acknowledgement |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentStatusPayload` | Yes | Yes | Low | Preserve current implementation |
| `TeamLeafAgentStatusPayload` | Yes | Yes | Low | Require actual leaf run/name/member/source identity; do not make fields optional |
| `TaskTeamStreamScope` | Yes | Yes | Low | Only stream-required IDs and one parent-frame logical-team path/key |
| `TeamLeafAgentStatusSnapshot` | Yes | Yes | Low | Discriminate ordinary member from required coordinate-consistent stream scope |
| `TeamRunLifecycleSnapshot { teamRunId, isActive }` | Yes | Yes | Low | No status/error/socket fields |
| `AgentTeamContext` | Yes | Yes | Low | `isActive` and `isSubscribed` remain explicitly separate |
| team history item | Yes | Yes | Low | Root has isActive; leaf member has status |
| team member node/row unions | Yes | Yes | Low | Put agent status only on agent specialization; team nodes carry no five-state field |
| open-work result | Yes | Yes | Low | Private boolean only; no public serialization |
| `CodexInputSubmissionResult` | Yes | Yes | Low | `{ kind, turnId }`; non-null turn ID required |
| `InterruptGenerationCommandAckPayload` | Yes | Yes | Low | common outcome core composed with required standalone/team target union; no status/duplicate fields |
| frontend pending interrupt entry | Yes | Yes | Low | command ID plus the same required target union only; ephemeral and cleared on result/disconnect |
| `InterruptCommandTransportFailure` | Yes | Yes | Low | exact command/target plus discriminated local reason; never shares server-ack or lifecycle fields |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | team management | manager | register/validate/unregister and lifecycle subscribers | Only writer of root activity | lifecycle type |
| `.../domain/team-run-lifecycle.ts` | team domain | lifecycle contract | binary snapshot/listener type | Tight reusable contract | N/A |
| `.../domain/task-team-stream-scope.ts` | team domain | outward scope contract | build/clone tight task-team IDs + parent-frame logical-team coordinates | Prevents operational/local fields leaking into stream scope | `TaskTeamInstanceIdentity` as builder input |
| `.../domain/team-leaf-agent-status-snapshot.ts` | team domain | recursive snapshot contract | discriminated ordinary/task-team carrier around required leaf payload | Keeps scope out of canonical agent DTO | `AgentStatusPayload`, `TaskTeamStreamScope` |
| `.../domain/team-run.ts`, `.../backends/team-run-backend.ts`, `team-manager.ts` | team execution | facade/backend | scoped leaf snapshots/private work; delete aggregate | Contract trio | snapshot carrier |
| `.../backends/mixed/mixed-team-manager.ts` | mixed runtime | manager | collect leaf snapshots and compute work | Owns live handles | specialized handles |
| `.../backends/mixed/members/*` | mixed runtime | handle | leaf agent vs child team specialization | Runtime-subject boundary | prefix helper |
| `.../backends/mixed/events/mixed-team-event-bridge.ts` | team bridge | identity rebaser | one `prefixMixedTeamStreamScope` core for every live event type and nested leaf snapshot | One coordinate transition rule | stream scope + snapshot carrier |
| `.../services/team-command-status-overlay-store.ts` | member command projection | member overlay | member-only pre-run status | Remove team maps/methods | agent payload |
| `.../task-delegation/task-team-settlement-coordinator.ts` | task delegation | settlement | call explicit work facts | Existing owner | TeamRun method |
| `.../services/team-run-service.ts` | lifecycle observation | service | leaf canonical failure + explicit termination | Existing observer | failure observer |
| `autobyteus-server-ts/src/services/agent-streaming/team-stream-agent-identity-payload.ts` | transport | strict identity flattener | one no-rebase task-team wire projection and leaf validator for live/initial paths | Prevents mapping drift/fallback guesses | `TaskTeamStreamScope` |
| `autobyteus-server-ts/src/services/agent-streaming/*team*` | transport | stream | root lifecycle and scoped leaf member events/snapshots | Existing team socket | lifecycle/agent DTOs |
| `.../run-history/services/team-run-live-projection-service.ts` | history | projection | isActive + leaf snapshots | Renamed coherent scope | manager/team APIs |
| `.../api/graphql/types/run-history.ts` | GraphQL | schema | remove root status | Public query contract | isActive/member status |
| `autobyteus-web/types/agent/AgentTeamContext.ts` | frontend state | context contract | isActive, subscription, topology, specialized nodes | Exact UI model | AgentContext |
| `autobyteus-web/stores/runHistoryTypes.ts` | frontend history | read model | no root status; specialized member rows | Exact query model | agent status/isActive |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` + protocol | frontend transport | stream | lifecycle handler and exact leaf status | Existing socket client | DTOs |
| `autobyteus-web/stores/agentTeamRunStore.ts` + history/open/recovery | frontend orchestration | store | direct activity application, cleanup | Existing lifecycle callers | isActive |
| workspace history/running components | presentation | UI | render binary group/run activity and use direct actions/text | Existing surfaces | AgentStatus mapping or aggregate helpers |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | Codex adapter | provider input owner | rename `sendTurn` to `submitInput`; branch start/steer; mutate current ID only on start; validate exact steer response | Existing current-turn authority | typed client + input mapper |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-id-resolver.ts` | Codex adapter | response parser | separate required start and steer ID parsers matching their schemas | Prevents request/correlation response ambiguity | app-server JSON primitives |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts` | agent backend | runtime-neutral adapter | call `submitInput`, return exact turn ID, convert throw to failed `AgentOperationResult` | Existing backend boundary | internal submission result |
| `autobyteus-server-ts/src/services/agent-streaming/interrupt-generation-command-ack.ts` | transport | command result mapper | define exact target/ack types, validate command ID, map operation result state | Shared by both handlers | existing SEND_MESSAGE ack arm |
| `autobyteus-server-ts/src/services/agent-streaming/{agent-stream-handler.ts,agent-team-stream-handler.ts}` | transport | command handlers | parse command ID/target, execute exact interrupt, always send ack on same connection | Existing request owners | shared interrupt ack builder |
| `autobyteus-web/services/agentStreaming/protocol/agentCommandTypes.ts` | frontend transport | wire contract | replace SEND-only interface with discriminated send/interrupt union | Single parse authority | exact target types |
| `autobyteus-web/services/agentStreaming/interruptCommandAdmission.ts` | frontend transport | local admission/completion owner | shared pending registration, connected-state gate, send-throw rollback, delete-guarded failure callback, and disconnect drain | One repeated failure-safe transition for both services | pending entry + exact local failure type |
| `autobyteus-web/services/agentStreaming/{AgentStreamingService.ts,TeamStreamingService.ts}` | frontend transport | pending matcher | delegate admission, include command ID, intercept/match ack, invoke callbacks, drain pending on disconnect, return boolean | Existing socket owner | protocol union + shared admission helper |
| `autobyteus-web/stores/{agentRunStore.ts,agentTeamRunStore.ts}` | frontend orchestration | command/feedback owner | generate command ID, pass server/local callbacks, toast rejected/failed/transport failure once, return service admission, preserve exact route validation | Existing action surfaces | `useToasts` + streaming services |
| `autobyteus-web/localization/messages/{en,zh-CN}/agent.generated.ts` (or existing command-error catalog selected by implementation) | localization | user feedback text | localized interrupt failure prefix/fallback | Existing localization owner | provider message as detail |

## Applied Patterns (If Any)

- **Single authoritative boundary:** `AgentRun` for agent lifecycle; `AgentTeamRunManager` for root team liveness.
- **Schema contraction:** Remove overlapping team status rather than deprecating it.
- **Discriminated specialization:** Agent member shapes own `AgentStatus`; team member shapes do not.
- **Event plus fresh snapshot:** Bind lifecycle listener then read manager state for race-free live convergence.
- **Explicit domain predicates:** Private `hasOpenExecutionWork` replaces a public enum used as a proxy.
- **Provider adapter strategy inside one owner:** `CodexThread` selects start or steer from its owned current-turn fact; callers remain runtime-neutral.
- **Discriminated command result:** One `AGENT_COMMAND_ACK` union has tight SEND_MESSAGE and INTERRUPT_GENERATION variants rather than a mostly-optional payload.
- **Request/result correlation:** Frontend service matches ephemeral command ID and exact target before invoking feedback; lifecycle stays event-owned.
- **Failure-safe admission:** Shared register/check/send/rollback logic returns a truthful boolean and completes local failures exactly once before server correlation exists.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/**` | Folder | `AgentRun` | Preserve implemented five-state gateway/finalizer | Agent domain | Team aggregate |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | File/Change | `CodexThread` | provider-local `submitInput`, idle start/current steer, exact response validation, and bounded `lastTerminalTurnId` request/notification reconciliation | Already owns current Codex turn and commands | runtime-neutral lifecycle changes, public second lifecycle, or steer fallback |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-id-resolver.ts` | File/Change | Codex response parsing | separate required `turn/start` and `turn/steer` ID parsers | Provider schemas are different | generic request/correlation fallback |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts` | File/Change | Codex backend adapter | adapt internal submission result to `AgentOperationResult` | Existing runtime-neutral boundary | start/steer policy duplication |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-command-types.ts` | File/Change | send-command domain | rename the existing SEND_MESSAGE-only ack to `SendMessageCommandAckPayload`; keep coordinator result semantics unchanged | Send deduplication remains agent-run-command behavior | interrupt target/result fields or a compatibility alias |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-lifecycle.ts` | File/New | manager contract | `{teamRunId,isActive}` and listener | Team domain | member/task/status enum |
| `autobyteus-server-ts/src/agent-team-execution/domain/task-team-stream-scope.ts` | File/New | team outward identity | tight scope builder/clone and parent-frame invariants | Stream scope is team-domain identity, not mapper inference | operational ingress/coordinator selectors or wire snake_case |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-leaf-agent-status-snapshot.ts` | File/Change | team snapshot contract | required leaf payload plus discriminated ordinary/task-team stream scope | Team recursion owns the envelope | full task-team operational identity or optional task-team fields on `AgentStatusPayload` |
| `.../services/agent-team-run-manager.ts` | File/Change | root liveness owner | lifecycle snapshot/subscription and idempotent transition | Active registry lives here | aggregate derivation |
| `.../domain/team-run.ts` | File/Change | team facade | leaf snapshots/private work; no status override | Existing exact run boundary | root registration cache |
| `.../domain/team-run-event.ts` | File/Change | team event contract | AGENT/TASK/COMMUNICATION/MEMBER_INPUT + optional tight `taskTeamScope` | Team-run outward event domain | TEAM status source or full operational task-team identity |
| `.../domain/team-status-payload.ts` | File/Delete | N/A | Remove | Obsolete | N/A |
| `.../domain/team-status-aggregation.ts` | File/Delete | N/A | Remove | Obsolete | N/A |
| `.../backends/{team-run-backend.ts,team-manager.ts}` | Files/Change | backend contract | scoped leaf snapshots and work predicate | Backend capabilities | aggregate or plain payload snapshot |
| `.../backends/mixed/**` | Folder/Change | mixed runtime | specialize handles, derive/rebase stream scope, recursive leaf status/work | Owns member topology/boundary | pseudo team status, cloned child-local scope, or split prefix logic |
| `.../services/team-command-status-overlay-store.ts` and `team-member-command-start-status-events.ts` | Files/Change/Rename if useful | member startup | member-only overlay/events | Still needed before leaf run exists | team status maps/builders |
| `.../task-delegation/task-team-settlement-coordinator.ts` | File/Change | settlement | explicit work checks | Existing owner | team status normalization |
| `autobyteus-server-ts/src/services/agent-streaming/team-stream-agent-identity-payload.ts` | File/Change | transport identity | shared task-team flattening, strict live/snapshot leaf validation | Wire mapping belongs at transport boundary | prefix/rebase fallback or independent relative-path rules |
| `autobyteus-server-ts/src/services/agent-streaming/{models.ts,agent-team-stream-handler.ts,team-run-event-websocket-message-mapper.ts,team-runtime-status-snapshot-service.ts}` | Files/Change/Rename snapshot service | transport | `TEAM_RUN_LIFECYCLE`, mapped scoped leaf snapshots, no TEAM_STATUS | Existing team stream | aggregate logic or early carrier unwrapping |
| `autobyteus-server-ts/src/services/agent-streaming/interrupt-generation-command-ack.ts` | File/New | command-result transport | tight interrupt ack target/outcome and shared result mapping | Two handlers must emit exactly the same contract | status, transcript, task, or duplicate-send fields |
| `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | File/Change | standalone command transport | parse command ID, execute interrupt, always return same-socket ack | Existing standalone command owner | log-only rejection or generic ERROR |
| `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | File/Change | exact-member command transport | parse ID/target, execute exact interrupt, always return same-socket ack | Existing team command owner | aggregate interrupt or member event publication |
| `autobyteus-server-ts/src/run-history/services/team-run-status-projection-service.ts` | File/Rename | history live projection | isActive + member snapshots | Name must match scope | root status |
| `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts` and GraphQL history type | Files/Change | history contract | drop root status | Existing projection/schema | status-to-active |
| `autobyteus-web/types/agent/AgentTeamStatus.ts` | File/Delete | N/A | Remove | Obsolete | N/A |
| `autobyteus-web/types/agent/AgentTeamContext.ts`, `stores/runHistoryTypes.ts` | Files/Change | state models | root isActive; specialized agent/team nodes | Canonical frontend models | team currentStatus |
| `autobyteus-web/services/agentStreaming/{protocol/messageTypes.ts,TeamStreamingService.ts,handlers/teamHandler.ts}` | Files/Change | client stream | lifecycle boolean and leaf status | Existing transport | TEAM_STATUS compatibility |
| `autobyteus-web/services/agentStreaming/protocol/agentCommandTypes.ts` | File/Change | command-result contract | discriminated SEND_MESSAGE/INTERRUPT_GENERATION ack union | Existing ack type owner | mostly-optional generic command DTO |
| `autobyteus-web/services/agentStreaming/interruptCommandAdmission.ts` | File/New | local control admission | exact pending entry types, local failure reason, failure-safe send, delete-guarded completion, and disconnect drain | Same invariant is required by both existing socket services | retries, server ack construction, status, transcript, or toast |
| `autobyteus-web/services/agentStreaming/AgentStreamingService.ts` | File/Change | standalone control transport | boolean admission through shared helper, standalone ack matching, callback/cleanup before generic dispatch | Existing socket owner | lifecycle mutation, swallowed send throw, or transcript error |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | File/Change | exact-member control transport | boolean admission through shared helper, ID/target matching, ack interception before task/member routing | Existing team socket owner | inferred target, swallowed send throw, or generic member dispatch |
| `autobyteus-web/stores/{agentRunStore.ts,agentTeamRunStore.ts}` | Files/Change | command/feedback orchestration | build command ID, install server/local callbacks, return service boolean, and show one localized rejected/failed/transport failure | Existing action owners | duplicate toast, agent status mutation, or team liveness mutation |
| `autobyteus-web/services/runHydration/**`, `runOpen/**`, `runRecovery/**`, history stores/helpers | Folder/Change | state convergence | direct isActive and member hydration | Existing convergence owners | synthetic team status |
| `autobyteus-web/components/workspace/common/TeamActivityDot.vue` | File/New | team presentation | solid blue/gray boolean indicator with accessible caller label | Shared by two desktop team surfaces | AgentStatus, animation, aggregation, actions |
| `autobyteus-web/components/workspace/history/workspaceHistoryTeamDefinitionGroups.ts` | File/Change | definition-group projection | add `hasActiveRuns = runs.some(run.isActive)` | Owns the displayed child collection | representative status or persisted state |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | File/Change | workspace team presentation | render group `hasActiveRuns` and exact run `isActive` dots | Exact screenshot surface | lifecycle derivation or Stop changes |
| `autobyteus-web/components/workspace/running/{RunningTeamGroup.vue,RunningTeamRow.vue}` | Files/Change | running team presentation | render any-child and exact-run activity dots | Existing alternate desktop surface | synthetic AgentStatus |
| `autobyteus-web/components/workspace/common/__tests__/TeamActivityDot.spec.ts` | File/New | component contract coverage | colors, no pulse, label/title, boolean test attribute | Directly tests the tight primitive | agent status cases |
| `autobyteus-web/components/workspace/history/__tests__/{workspaceHistoryTeamDefinitionGroups.spec.ts,WorkspaceHistoryWorkspaceSection.spec.ts}` | File/New + File/Change | history presentation coverage | both builder paths, mixed/all-inactive group projection, exact sibling rows, unchanged actions/member dots | Closest durable units for DS-013 | backend lifecycle tests |
| `autobyteus-web/components/workspace/running/__tests__/{RunningTeamGroup.spec.ts,RunningTeamRow.spec.ts}` | Files/Change | running presentation coverage | any-child group and exact-run dot parity | Existing component suites | history/server behavior |
| `autobyteus-web/localization/messages/{en,zh-CN}/workspace.generated.ts` | Files/Change | localization | accessible active/inactive group/run labels | Existing component-key catalogs | hard-coded user-facing labels |
| `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts` | File/No Change | mobile presentation | retain `Active`/`Inactive` text | Already correct | new dot or aggregate status |
| `autobyteus-web/components/workspace/team/TeamStatusDisplay.vue`, `composables/useTeamStatusVisuals.ts` | Files/Delete | N/A | Remove | Unused/obsolete | N/A |
| `autobyteus-web/components/workspace/common/StatusDot.vue`, `utils/workspaceStatusDotPresentation.ts` | Files/No Change | agent visuals | agent-only five-state dots | Status belongs to agent | team kind/branches |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-execution` | Main-Line Domain-Control | Yes | Low | Preserve reviewed owner |
| `agent-team-execution/domain` | Main-Line Domain-Control | Yes | Low | Binary lifecycle, exact team facade, recursive leaf carrier, and tight outward task-team scope; operational task identity remains separate |
| `agent-team-execution/backends/mixed` | Persistence-Provider/runtime | Yes | Medium | Specialize handle interfaces and centralize one all-event/live/snapshot coordinate-frame transition in the existing bridge |
| `services/agent-streaming` | Transport | Yes | Low | Mapping only, no lifecycle derivation |
| `run-history/services` | Off-Spine projection | Yes | Low | Manager read + member snapshot projection |
| frontend stores/services | Mixed Justified | Yes | Medium | Keep contract, convergence, and presentation responsibilities in their existing areas; remove conversions |
| `agent-execution/backends/codex/thread` | Provider Adapter | Yes | Low | Keep current-turn method selection and schema parsing together under `CodexThread`; no cross-runtime coordinator |
| server/frontend `agentStreaming` | Transport | Yes | Medium | Ack contract/matching belongs with the existing WebSocket command surface; stores own only ID creation and feedback |

## Binary Team Activity Presentation Contract (`SR-006`)

### One boolean-only visual component

Add `autobyteus-web/components/workspace/common/TeamActivityDot.vue`:

```ts
defineProps<{
  isActive: boolean;
  label: string;
}>();
```

Contract:

- Render a fixed solid circular dot using the existing workspace row size (`h-2 w-2 flex-shrink-0 rounded-full`).
- `isActive=true` uses solid `bg-blue-500`; `false` uses solid `bg-gray-400`.
- Never add `animate-pulse`: team activity means a live registered resource, not current agent generation.
- Render `role="img"`, `aria-label=label`, and `title=label`; expose `data-test="team-activity-dot"` and `data-active="true|false"` for focused coverage.
- Accept no `AgentStatus`, string status, member collection, task stage, socket state, or action callback. The caller owns the exact boolean and localized label.
- Keep existing `StatusDot.vue` and `workspaceStatusDotPresentation.ts` agent-only and unchanged.

### Definition/group projection

Extend the internal presentation type only:

```ts
export type WorkspaceHistoryTeamDefinitionDisplayGroup = {
  // existing identity/runs/representative metadata
  hasActiveRuns: boolean;
};
```

`buildWorkspaceTeamDefinitionDisplayGroups` sets `hasActiveRuns` from the exact child collection on each returned group:

```ts
hasActiveRuns = runs.some((run) => run.isActive);
```

In `buildDisplayGroupsFromTeamNodes`, initialize the field from the first run and update it when another run is appended; in `buildDisplayGroupsFromHistory`, calculate it from the already-complete `runs` array. Leftover/current-node groups pass through the first helper and therefore follow the identical rule. This requirement does not invent a cross-group merge: each rendered group summarizes exactly the `runs` collection it renders. It must not use `representativeRun`, member status, `isSubscribed`, draft/context existence, last-activity ordering, or Stop availability. A temporary draft with `isActive=false` does not make its group active when another displayed child is active.

`WorkspaceHistoryWorkspaceSection.vue` renders `TeamActivityDot` immediately after the group disclosure control and before the existing team avatar/name. `RunningTeamGroup.vue`, whose `runs` are live contexts, computes the same `runs.some(run.isActive)` locally and renders the same component before the definition name. Both supply localized `Active team runs` / `No active team runs` meaning.

### Exact run projection

`WorkspaceHistoryWorkspaceSection.vue` renders `TeamActivityDot` immediately after the run disclosure control and before `formatTeamRunLabel(team)`, passing `team.isActive`. `RunningTeamRow.vue` renders it in the equivalent position before the run identifier, passing `teamRun.isActive`. Both supply localized `Active team run` / `Inactive team run` meaning.

The existing Stop/archive/delete conditions remain unchanged. The visual and action read the same exact boolean but do not call or own one another. An inactive historical or draft row renders gray; an active registered row renders blue. A failed Stop leaves the dot blue after pending clears because `isActive` remains true; accepted termination turns it gray when the existing lifecycle projection applies false.

### Coverage contract

Focused durable frontend tests must prove:

1. `TeamActivityDot` maps true/false to solid blue/gray, has no pulse class, and exposes accessible active/inactive labeling.
2. A definition group with mixed active/inactive child runs is blue; after the last active child changes to inactive it is gray; representative ordering and member status changes do not affect it. Both `buildDisplayGroupsFromHistory` and `buildDisplayGroupsFromTeamNodes` (including the leftover/current-node route) are covered.
3. Each exact workspace-history run row follows its own `isActive`, including simultaneous blue and gray siblings.
4. `RunningTeamGroup` and `RunningTeamRow` render the same binary semantics.
5. Definition and run rows contain no five-state status value or `AgentStatus` mapping; leaf-agent dots remain unchanged.
6. Existing Stop success/failure/pending tests remain passing; the indicator introduces no click target or action behavior.

No server/API/E2E contract is added. After source review, the API/E2E engineer still owns the formal coverage-validity decision and any proportionate browser-equivalent execution.

## Codex Current-Turn Input Contract (`SR-007`, BEH-010)

### One serialized provider-input owner

Rename `CodexThread.sendTurn` to `submitInput` because the operation may start a new provider turn or steer the current one. Keep the decision inside `CodexThread`; the Codex backend remains the only caller.

```ts
export type CodexInputSubmissionResult =
  | { kind: "started"; turnId: string }
  | { kind: "steered"; turnId: string };

class CodexThread {
  private inputSubmissionTail: Promise<void> = Promise.resolve();

  submitInput(message: AgentInputUserMessage): Promise<CodexInputSubmissionResult>;
  private performInputSubmission(
    message: AgentInputUserMessage,
  ): Promise<CodexInputSubmissionResult>;
  private startInput(message: AgentInputUserMessage): Promise<CodexInputSubmissionResult>;
  private steerInput(
    message: AgentInputUserMessage,
    expectedTurnId: string,
  ): Promise<CodexInputSubmissionResult>;
}
```

`submitInput` chains each call onto `inputSubmissionTail` and resets the tail through both success and failure. This prevents two supported callers from both observing idle and issuing concurrent starts. App-server notifications remain independently processable; the exact steer precondition handles a terminal race rather than blocking lifecycle events behind input submission.

Within the serialized task:

1. Await startup readiness.
2. Read `activeTurnId` after readiness and after every earlier queued input submission has settled.
3. If it is null, call `startInput`.
4. If it is identified A, call `steerInput(message, A)`.

No caller may supply its own mode or expected turn ID. This prevents team/direct/system origin logic from duplicating provider policy.

### Idle start

`startInput` preserves the current `turn/start` request fields: `threadId`, mapped input, working directory, model, reasoning effort, service tier, summary, personality, output schema, and collaboration mode. The response parser becomes required and start-specific:

Rename the currently write-only `lastCompletedTurnId` field to `lastTerminalTurnId` and make it the provider-thread's bounded request/notification race guard. Exact `markTurnCompleted(S)`, exact `markTurnFailed(S)`, and an idle/runtime-terminal transition that clears identified active S set `lastTerminalTurnId=S`; a genuinely newer `markTurnStarted(N)` clears the old terminal guard. This is not another public lifecycle or a replacement for `AgentTurnLifecycleState`; it only prevents a late request response for the most recently settled provider turn from reopening that same ID.

```ts
export function resolveStartedTurnId(payload: unknown): string {
  // Require response.turn.id; throw CODEX_TURN_START_RESPONSE_INVALID otherwise.
}
```

Only after a nonempty started ID S is parsed does `startInput` reconcile it with independently processed provider notifications:

- `activeTurnId === null` and `lastTerminalTurnId !== S`: no start notification/terminal S is known, so call `markTurnStarted(S)` once;
- `activeTurnId === S`: the provider's `turn/started(S)` notification already installed S, so return it without a second transition;
- `activeTurnId === null` and `lastTerminalTurnId === S`: terminal S already won the race, so return S for accepted-input correlation without reinstalling it;
- identified `activeTurnId !== S`: throw `CODEX_TURN_START_IDENTITY_CONFLICT` and preserve the fresher provider identity.

A missing/malformed ID is a failed operation and cannot create anonymous `running` state. This reconciliation is required because app-server notifications remain processable while the request is in flight; the `turn/start` response must not reopen a turn that already completed.

### Identified current-turn steer

`steerInput` sends only the fields owned by the generated Codex 0.146 steer contract:

```ts
const response = await client.request<unknown>("turn/steer", {
  threadId,
  expectedTurnId: A,
  input: toCodexUserInput(message),
});
```

Steer has a distinct response parser because its ID is top-level rather than nested:

```ts
export function resolveSteeredTurnId(payload: unknown): string {
  // Require response.turnId; throw CODEX_TURN_STEER_RESPONSE_INVALID otherwise.
}
```

The returned ID must equal A. Mismatch throws `CODEX_TURN_STEER_ID_MISMATCH` and leaves the thread unchanged. Success returns `{ kind: "steered", turnId: A }` and **does not** call `markTurnStarted`, set `currentStatus`, clear `lastTerminalTurnId`, or replace `runtimeContext.activeTurnId`.

If A completes/interruption/fails while `turn/steer` is in flight, existing notification handling may clear A. A provider precondition/non-steerable rejection becomes `CODEX_TURN_STEER_REJECTED`. If the provider nevertheless returns successful A after the terminal notification was already processed, `submitInput` returns A for accepted-input/memory correlation but does not reinstall it; canonical status remains governed by the terminal event/fresh snapshot.

### Structured failure and backend adaptation

Add a tight Codex provider-input error carrying one of:

```ts
type CodexInputSubmissionErrorCode =
  | "CODEX_TURN_START_RESPONSE_INVALID"
  | "CODEX_TURN_START_IDENTITY_CONFLICT"
  | "CODEX_TURN_STEER_RESPONSE_INVALID"
  | "CODEX_TURN_STEER_ID_MISMATCH"
  | "CODEX_TURN_STEER_REJECTED";
```

The Codex backend preserves this code/message in `{ accepted: false, code, message }`; unrelated failures retain the existing `RUNTIME_COMMAND_FAILED` mapping. It maps either successful internal variant to the existing runtime-neutral `{ accepted: true, turnId, platformAgentRunId }`. `AgentOperationResult` does not gain `kind`; provider method choice remains encapsulated.

Never catch steer rejection and call `turn/start`. Never change `AgentTurnLifecycleState` precedence. A successful busy reviewer delivery is recorded by the existing command observer under A; `TURN_COMPLETED(A)` then clears A normally and reconnect returns idle.

### Concrete A/B correction

```text
Current defective path:
  current A -> turn/start -> response B -> markTurnStarted(B)
  provider executes message inside A -> TURN_COMPLETED(A)
  old-turn guard preserves B -> stale running; provider interrupt has no A/B

Target path:
  current A -> turn/steer(expected A) -> response A -> no lifecycle mutation
  accepted-input observer records A -> TURN_COMPLETED(A)
  canonical current A settles -> idle; reconnect idle; Stop removed
```

Native AutoByteus is explicitly outside this adapter change: its `turn_start` inbox remains FIFO, current turns do not receive later user/inter-agent messages, interrupt settles only the current turn, and queued messages start distinct later turns.

## Interrupt Command Result And Admission Contract (`SR-007` + `SR-008`, BEH-011, `ARCH-FIND-004`)

### Tight discriminated wire union

Keep `ServerMessageType.AGENT_COMMAND_ACK`. Rename the current server SEND-only payload type to `SendMessageCommandAckPayload` and define the union without a compatibility alias:

```ts
export type InterruptCommandTarget =
  | {
      target_kind: "standalone_run";
      run_id: string;
    }
  | {
      target_kind: "team_member";
      team_run_id: string;
      member_route_key: string;
      member_run_id: string | null;
    };

export type InterruptGenerationCommandAckPayload =
  | {
      command_type: "INTERRUPT_GENERATION";
      command_id: string;
      state: "accepted";
      target: InterruptCommandTarget;
    }
  | {
      command_type: "INTERRUPT_GENERATION";
      command_id: string;
      state: "rejected" | "failed";
      code: string;
      message: string;
      target: InterruptCommandTarget;
    };

export type AgentCommandAckPayload =
  | SendMessageCommandAckPayload
  | InterruptGenerationCommandAckPayload;
```

The interrupt arm contains no redundant `accepted` boolean: its `state` is the outcome discriminator, and nonaccepted arms require code/message. It also contains no `status`, `duplicate`, `dedupe_key`, task stage, team activity, or transcript fields. The existing SEND_MESSAGE arm remains byte-for-byte equivalent in fields, state values, codes, status option, and deduplication behavior.

Client requests add one `command_id`:

```json
{"type":"INTERRUPT_GENERATION","payload":{"command_id":"client_interrupt_1"}}
```

```json
{"type":"INTERRUPT_GENERATION","payload":{"command_id":"client_interrupt_2","target_member_route_key":"article_writer","target_member_run_id":"article_writer_..."}}
```

### Server result construction and delivery

Add `interrupt-generation-command-ack.ts` as the shared transport-owned builder. It:

- imports the tight `SendMessageCommandAckPayload` from the agent-run-command domain and exports the transport-level `AgentCommandAckPayload` discriminated union;
- validates/normalizes the client command ID and exact target supplied by the handler;
- maps `{ accepted: true }` to `state="accepted"`;
- maps request/target/run validation rejection to `state="rejected"` with a stable code/message;
- maps a nonaccepted backend/provider operation or a thrown execution failure to `state="failed"`, preserving a stable code/message;
- never reads or emits agent status.

Restructure both handlers so the interrupt branch runs before the generic active-subscription early return. The handler retains the originating `connection`, resolves the active subject itself, builds a rejected result when the run is absent, invokes the existing exact interrupt operation when present inside a branch-local `try/catch`, maps both returned rejection and thrown execution failure, and sends exactly one `AGENT_COMMAND_ACK` on that connection in all supported product cases. The outer message-handler catch must not be the owner of interrupt outcome delivery. If the connection has already closed, the handler cannot write an acknowledgement; that transport teardown is reported by the frontend's separate disconnect callback rather than treated as a server result.

For team commands, parse and normalize `target_member_route_key`/optional run ID before execution and put that exact normalized guard in the target arm. Existing compound target validation remains. No aggregate interrupt is added. Invalid/missing synthetic targets may retain the existing explicit invalid-target `ERROR`; every product `TeamStreamingService` request is exact and therefore receives the required ack.

Accepted acknowledgement means only “the provider/runtime accepted the interrupt request.” It must not publish or synthesize `AGENT_STATUS idle`. Existing provider `TURN_INTERRUPTED`/terminal status returns through the normal `AgentRun` gateway and settles lifecycle.

### Frontend request matching and feedback

Mirror the discriminated union in `protocol/agentCommandTypes.ts`. Keep server acknowledgement and local transport failure as separate types:

```ts
type PendingInterruptCommand = {
  commandId: string;
  target: InterruptCommandTarget;
};

type InterruptCommandTransportFailure = {
  commandId: string;
  target: InterruptCommandTarget;
  reason: {
    code:
      | "INTERRUPT_TRANSPORT_NOT_CONNECTED"
      | "INTERRUPT_TRANSPORT_SEND_FAILED"
      | "INTERRUPT_TRANSPORT_DISCONNECTED";
    connectionState: ConnectionState;
    message: string;
  };
};
```

Each service owns an ephemeral `pendingInterruptCommands` map but delegates its repeated admission/completion mechanics to `interruptCommandAdmission.ts`:

```ts
export function tryAdmitInterruptCommand(input: {
  pending: Map<string, PendingInterruptCommand>;
  entry: PendingInterruptCommand;
  getConnectionState: () => ConnectionState;
  send: () => void;
  onTransportFailure: (failure: InterruptCommandTransportFailure) => void;
}): boolean;

export function completePendingInterruptTransportFailure(input: {
  pending: Map<string, PendingInterruptCommand>;
  commandId: string;
  reason: InterruptCommandTransportFailure["reason"];
  onTransportFailure: (failure: InterruptCommandTransportFailure) => void;
}): boolean;

export function drainPendingInterruptTransportFailures(input: {
  pending: Map<string, PendingInterruptCommand>;
  reason: InterruptCommandTransportFailure["reason"];
  onTransportFailure: (failure: InterruptCommandTransportFailure) => void;
}): number;
```

`tryAdmitInterruptCommand` performs one synchronous transition:

1. Register the exact entry before any send attempt. Product callers generate a fresh `client_interrupt_<uuid>`; focused store coverage preserves that uniqueness so the helper never overwrites a live entry.
2. Read the socket state immediately before send. If it is not `ConnectionState.CONNECTED`, call `completePendingInterruptTransportFailure` with `INTERRUPT_TRANSPORT_NOT_CONNECTED` and return `false` without calling `send`.
3. Call the provided serialized `send` inside `try/catch`.
4. If send returns normally, leave the entry pending and return `true`.
5. If send throws, call the same completion helper with `INTERRUPT_TRANSPORT_SEND_FAILED` and return `false`.

The completion helper first looks up the still-pending entry, deletes it, and only then invokes `onInterruptCommandTransportFailure({ commandId, target, reason })`. If the entry is already absent it returns `false` and does not invoke feedback. The drain helper snapshots current command IDs and delegates each to that same completion function. This delete guard makes reentrant disconnect-plus-throw, acknowledgement-plus-disconnect, and repeated disconnect cleanup exactly once. Neither helper constructs `AgentCommandAckPayload`.

The service methods have truthful synchronous contracts:

```ts
AgentStreamingService.interruptGeneration(commandId: string): boolean;
TeamStreamingService.interruptGeneration(
  commandId: string,
  target: TeamInterruptGenerationTarget,
): boolean;
```

Both build their already-normalized exact `PendingInterruptCommand`, delegate registration/state/send/rollback to the helper, and return its boolean unchanged. They do not retry or queue an interrupt across reconnect: the user may try again while canonical status still says `running`.

For admitted commands, on `AGENT_COMMAND_ACK`:

1. Preserve the current standalone SEND_MESSAGE handler for the SEND arm.
2. For the interrupt arm, find the pending entry by `command_id`.
3. Require exact target equality, including team run, canonical member route, and normalized member run ID/null.
4. If unmatched, log and ignore; do not route through member/task event projection.
5. If matched, delete the entry and invoke `onInterruptCommandResult(ack)` supplied through service options.

`TeamStreamingService` performs this interception before `refreshTaskDelegationRecords`, `handleTaskExecutionProjectionMessage`, and `resolveTeamStreamMemberContext`; an acknowledgement is not a member activity message. Both automatic `handleDisconnect` and intentional public `disconnect()` call `drainPendingInterruptTransportFailures(...INTERRUPT_TRANSPORT_DISCONNECTED...)`; intentional disconnect drains **before** unregistering socket handlers and clearing context. A command already rolled back during immediate non-admission or send throw is absent and cannot produce duplicate feedback. The callback is local connection feedback, not a fabricated `AGENT_COMMAND_ACK`, and it does not change status.

`agentRunStore` and `agentTeamRunStore` generate `client_interrupt_<uuid>` using the existing client ID pattern, pass it with the already-validated run/compound member target, and install both callbacks when constructing each service. They return the service boolean unchanged: `true` means the interrupt was admitted to a connected socket send, not that interruption succeeded; `false` means it was not admitted. The synchronous transport-failure callback already owns the error toast, so the caller must not toast again merely because the method returned `false`.

On matched `rejected` or `failed`, the store uses `localizationRuntime` plus `useToasts().addToast(..., "error")` to display the target-aware failure. Provider `message` is detail beneath a localized fallback/prefix. Accepted acknowledgement produces no success toast and no optimistic idle; it merely completes control correlation. The current generic `handleError` call remains only for the pre-existing SEND_MESSAGE arm and must not be used for interrupt results.

### Focused coverage contract

Implementation-scoped server/frontend tests must prove:

1. idle Codex input uses only `turn/start`, requires started ID, installs it only when no start/terminal notification already reconciled S, and returns `kind=started`;
2. active A uses only `turn/steer(expectedTurnId=A)`, requires response A, never calls the start transition, and returns/records A;
3. serialized submissions cannot issue two concurrent idle starts; the later operation observes the state established by the earlier one;
4. steer precondition/non-steerable rejection and response mismatch preserve current identity and never call start fallback;
5. terminal A after successful steer settles backend/canonical snapshot idle and reconnect remains idle; start response S after already-processed terminal S also remains idle and does not reinstall S;
6. standalone/team handlers emit exactly one interrupt ack for accepted, missing-run/validation rejection, and provider failure with exact command/target identity;
7. frontend standalone/team services serialize command ID, match ID plus target, ignore unmatched ack, intercept team ack before member projection, and report in-flight disconnect through the separate local transport-failure callback without fabricating a server acknowledgement;
8. rejected/failed result produces one error toast and no conversation `ErrorSegment`, agent-status change, team-lifecycle change, or false success;
9. accepted result produces no optimistic idle; later canonical terminal/status removes Stop;
10. for both standalone and team services, already-`DISCONNECTED`, `CONNECTING`, and `RECONNECTING` states register then remove the exact entry, skip socket send, invoke one exact-target `INTERRUPT_TRANSPORT_NOT_CONNECTED` callback, return `false`, and leave no pending command;
11. for both services, a connected-state send throw—including a mock that reentrantly emits disconnect before throwing—returns `false`, leaves no pending entry, and invokes at most one exact-target transport callback; a later disconnect adds no duplicate feedback;
12. an admitted command returns `true`; later automatic or intentional disconnect reports it once, while matched acknowledgement removes it so a later disconnect reports nothing;
13. every local admission/disconnect failure produces no fabricated server ack, status/liveness mutation, `ErrorSegment`, retry queue, stale entry, or duplicate toast;
14. existing SEND_MESSAGE ack/dedupe tests and all SR-006 agent/team/nested/presentation tests remain passing.

API/E2E still owns fresh coverage investigation and realistic Codex/browser-equivalent execution after source review.

## Recursively Scoped Leaf-Agent Contract And Coordinate Frame (`ARCH-FIND-003`, `CODE-FIND-002`)

### Tight task-team stream scope

Keep operational `TaskTeamInstanceIdentity` unchanged for task activation, active-run directories, persistence, token/memory scope, ingress selection, coordinator selection, and delivery. Do not carry that broad object through outward live/snapshot stream recursion. Add this tight derived type in `autobyteus-server-ts/src/agent-team-execution/domain/task-team-stream-scope.ts`:

```ts
export type TaskTeamStreamScope = {
  taskTeamRunId: string;
  taskTeamInstanceId: string;
  taskId: string;
  logicalTeamPath: string[];
  logicalTeamRouteKey: string;
};

export function buildTaskTeamStreamScope(input: {
  taskTeamInstance: TaskTeamInstanceIdentity;
  parentTeamRunId: string;
}): TaskTeamStreamScope;

export function cloneTaskTeamStreamScope(
  scope: TaskTeamStreamScope,
): TaskTeamStreamScope;
```

`buildTaskTeamStreamScope` validates that `taskTeamInstance.parentTeamRunId === parentTeamRunId`, normalizes nonblank IDs/path segments, copies `logicalTeam.memberPath`, and rebuilds `logicalTeamRouteKey` from that path. The result is therefore in the immediate parent `TeamRun` frame at the moment a `MixedTaskTeamMemberHandle` is created. It deliberately excludes:

- `parentTeamRunId`, which is immutable operational launch ownership rather than the mutable outward coordinate frame;
- `ingress.memberPath/memberRouteKey`, which are task-team-local operational selectors;
- `coordinatorMemberRouteKey`, which is likewise local to the task-team definition;
- template/definition/descriptive fields not used to resolve an outward message.

This is not a second lifecycle or public team status. It is the minimum internal execution/scope identity needed to flatten the existing task-team wire fields.

### Tight recursive leaf carrier

Keep `AgentStatusPayload` unchanged. Update the team-owned composition in `team-leaf-agent-status-snapshot.ts`:

```ts
export type TeamLeafAgentStatusPayload = AgentStatusPayload & {
  agent_id: string;
  agent_name: string;
  member_route_key: string;
  member_path: string[];
  source_route_key: string;
  source_path: string[];
};

type OrdinaryTeamLeafAgentStatusSnapshot = {
  scopeKind: "ordinary_member";
  teamRunId: string;
  payload: TeamLeafAgentStatusPayload;
};

type TaskTeamLeafAgentStatusSnapshot = {
  scopeKind: "task_team_member";
  teamRunId: string;
  payload: TeamLeafAgentStatusPayload;
  taskTeamScope: TaskTeamStreamScope;
};

export type TeamLeafAgentStatusSnapshot =
  | OrdinaryTeamLeafAgentStatusSnapshot
  | TaskTeamLeafAgentStatusSnapshot;
```

Update `TeamRunEvent` in `team-run-event.ts` in the same clean cut: replace the broad optional `taskTeamInstance` outward marker with `taskTeamScope?: TaskTeamStreamScope | null`. The wire contract does not change; this is an internal carrier correction.

Coordinate invariant for every live event or initial leaf snapshot:

```text
carrier.teamRunId
  == coordinate frame for sourcePath/source_path
  == coordinate frame for agent memberPath/member_path
  == coordinate frame for taskTeamScope.logicalTeamPath (when present)
```

Additional invariants:

- Every route key is rebuilt from the path returned in that same frame; no caller keeps a pre-prefix key.
- A `task_team_member` snapshot requires `taskTeamScope`; an ordinary snapshot forbids it.
- A task-team leaf requires `source_path` to start with `logicalTeamPath` and contain at least one additional relative member segment.
- Task-agent identity remains in the existing optional `task_agent_instance_id`, `task_agent_run_id`, and payload `task_id` fields. Outer task-team `taskId` still wins the single public `task_id` during stream flattening.
- Invalid scope fails at the mixed-team/stream invariant boundary. It is never downgraded to ordinary scope, task-team-root scope, or pseudo team status.

### One shared all-event/live/snapshot rebasing core

Replace leaf-only `prefixMixedTeamAgentScope` with this generic core in `mixed-team-event-bridge.ts`:

```ts
export type MixedTeamStreamScope = {
  teamRunId: string;
  sourcePath: string[];
  taskTeamScope: TaskTeamStreamScope | null;
};

export type PrefixedMixedTeamStreamScope = MixedTeamStreamScope & {
  sourceRouteKey: string;
};

export function prefixMixedTeamStreamScope(input: {
  parentTeamRunId: string;
  sourcePrefix: string[];
  scope: MixedTeamStreamScope;
  taskTeamScopeOverride?: TaskTeamStreamScope;
}): PrefixedMixedTeamStreamScope;
```

Exact algorithm:

1. Normalize `parentTeamRunId`, `sourcePrefix`, current `teamRunId`, source path, and optional scope.
2. Set `alreadyInParentFrame = scope.teamRunId === parentTeamRunId`.
3. Rebase `sourcePath` with the one private `prefixPath(path, sourcePrefix, alreadyInParentFrame)` rule. That rule preserves an already parent-rooted path only when the frame IDs match and the path starts with the prefix; otherwise it prefixes once.
4. Select task-team scope:
   - If `taskTeamScopeOverride` is supplied, clone it unchanged because the task-team handle built it in the **target** `parentTeamRunId` frame.
   - Else if a retained `scope.taskTeamScope` exists and `alreadyInParentFrame`, clone it unchanged.
   - Else prefix the retained `logicalTeamPath` with the same `sourcePrefix` and rebuild `logicalTeamRouteKey`.
5. When a scope exists, require the returned `sourcePath` to start with returned `logicalTeamPath`. This is a boundary invariant, not a recovery/fallback.
6. Return `teamRunId=parentTeamRunId`, the rebased path/key, and the cloned/rebased task-team scope.

Exactly two public adapters call this core:

```ts
prefixMixedSubTeamEvent(input: {
  parentTeamRunId: string;
  sourcePrefix: string[];
  event: TeamRunEvent;
  taskTeamScopeOverride?: TaskTeamStreamScope;
}): TeamRunEvent;

prefixMixedTeamLeafAgentStatusSnapshot(input: {
  parentTeamRunId: string;
  sourcePrefix: string[];
  snapshot: TeamLeafAgentStatusSnapshot;
  taskTeamScopeOverride?: TaskTeamStreamScope;
}): TeamLeafAgentStatusSnapshot;
```

Adapter rules:

- `prefixMixedSubTeamEvent` calls `prefixMixedTeamStreamScope` for **AGENT, TASK_DELEGATION, COMMUNICATION, and MEMBER_INPUT**, not only for agent events. It writes the returned `teamRunId`, `sourcePath`, and `taskTeamScope` to the copied event.
- For an `AGENT` event, the adapter also applies the same private `prefixPath` rule to `TeamRunAgentEventPayload.memberPath` and rebuilds its member route key. It then asserts a nonempty relative task-team leaf selector when task-team scope exists.
- Conversation-address task-team-segment detection consumes only `taskTeamScope.taskTeamRunId`; no full operational identity is required in the outward event.
- `prefixMixedTeamLeafAgentStatusSnapshot` calls the same core, rebases `payload.member_path` with the same private path rule, rebuilds both payload route keys, and returns the correct discriminated variant. It asserts the same task-team leaf invariant.
- `MixedTaskTeamMemberHandle` calls `buildTaskTeamStreamScope({ taskTeamInstance: request.identity, parentTeamRunId: parentContext.runId })` once and passes that same target-frame override to both adapters.
- `MixedSubTeamMemberHandle` passes no override. Any retained scope is therefore rebased each time it crosses a distinct ordinary parent frame.

### Exact recursive snapshot method signatures

```ts
TeamRun.getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[];
TeamRunBackend.getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[];
TeamManager.getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[];
MixedTeamMemberHandle.getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[];
MixedAgentMemberHandle.getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[];
MixedSubTeamMemberHandle.getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[];
MixedTaskTeamMemberHandle.getLeafAgentStatusSnapshots(): TeamLeafAgentStatusSnapshot[];
```

- `MixedAgentMemberHandle` returns one ordinary snapshot using its canonical `AgentRun`/pre-run overlay and required exact member/source identity. A task-agent handle continues to stamp task-agent fields in the payload.
- `MixedSubTeamMemberHandle` returns `[]` when no child run exists; otherwise it maps child snapshots through `prefixMixedTeamLeafAgentStatusSnapshot` without an override.
- `MixedTaskTeamMemberHandle` returns `[]` when no child run exists; otherwise it maps child snapshots through the same adapter with its derived target-frame `TaskTeamStreamScope` override.
- `MixedTeamManager` concatenates persistent leaf agents, active persistent subteam recursion, task-agent handles, and active task-team recursion. Uninstantiated direct leaf agents keep the existing offline ordinary snapshot. Absent child-team leaves remain frontend/history metadata defaults; no pseudo team snapshot is emitted.
- History consumes `snapshot.payload` only. It does not serialize the internal task-team stream carrier into GraphQL history.

### One strict live/initial wire flattener

Update `team-stream-agent-identity-payload.ts`:

```ts
export type TeamStreamTaskTeamIdentityPayload = {
  task_team_run_id: string;
  task_team_instance_id: string;
  task_id: string;
  team_route_key: string;
  team_path: string[];
  task_team_relative_member_path: string[];
  task_team_relative_member_route_key?: string;
};

export function buildTaskTeamScopedIdentityPayload(input: {
  sourcePath: string[];
  taskTeamScope: TaskTeamStreamScope | null;
}): TeamStreamTaskTeamIdentityPayload | null;

export function assertTaskTeamLeafStreamScope(input: {
  sourcePath: string[];
  taskTeamScope: TaskTeamStreamScope | null;
  agentRunId: string;
}): void;

export function mapTeamLeafAgentStatusSnapshot(
  snapshot: TeamLeafAgentStatusSnapshot,
): ServerMessage;
```

The flattener performs no prefixing or recovery. For task-team scope it subtracts `taskTeamScope.logicalTeamPath` from the already-consistent source path and emits the existing wire fields. `assertTaskTeamLeafStreamScope` requires a nonempty relative path/route for both a live `AGENT` event and an initial task-team leaf snapshot. Non-agent task-team-root events may validly have an empty relative selector. Both the live event mapper's `AGENT` branch and `mapTeamLeafAgentStatusSnapshot` call the assertion before spreading the same flattener result.

Initial mapping spreads canonical `snapshot.payload` first and flattened outer task-team fields last. When a task-agent runs inside a task team, its task-agent run/instance fields remain present while outer task-team `task_id` wins exactly as today. `TeamRuntimeSnapshotService.getInitialMessages(teamRun)` retains each carrier through `mapTeamLeafAgentStatusSnapshot`; it never unwraps to plain `AgentStatusPayload` first.

### Concrete multi-boundary example: root -> ordinary subteam -> task team -> leaf

Assume:

- root stream/run: `root-team-1`;
- ordinary persistent subteam in root: `research_group`, path `['research_group']`, child run `research-run-2`;
- visible team target inside that child: `review_team`, child-local path `['review_team']`;
- task-team run/instance/task: `task-team-run-7` / `task-team-instance-7` / `task-42`;
- leaf inside the materialized task team: `['review_group', 'critic']`, agent run `critic-runtime-93`.

The operational identity is created inside `research-run-2` and stays unchanged:

```ts
{
  taskTeamRunId: "task-team-run-7",
  taskTeamInstanceId: "task-team-instance-7",
  parentTeamRunId: "research-run-2",
  taskId: "task-42",
  logicalTeam: {
    memberPath: ["review_team"],
    memberRouteKey: "review_team",
    // definition/template fields omitted here
  },
  ingress: {
    memberPath: ["review_group", "critic"],
    memberRouteKey: "review_group/critic",
    memberRunId: "critic-runtime-93"
  }
}
```

The task-team handle derives a child-parent-frame stream scope:

```ts
{
  taskTeamRunId: "task-team-run-7",
  taskTeamInstanceId: "task-team-instance-7",
  taskId: "task-42",
  logicalTeamPath: ["review_team"],
  logicalTeamRouteKey: "review_team"
}
```

A task-team child leaf starts locally as `['review_group', 'critic']`. Applying the task-team handle override produces a carrier in the ordinary child frame:

```ts
{
  scopeKind: "task_team_member",
  teamRunId: "research-run-2",
  payload: {
    status: "running",
    agent_id: "critic-runtime-93",
    agent_name: "critic",
    member_path: ["review_team", "review_group", "critic"],
    member_route_key: "review_team/review_group/critic",
    source_path: ["review_team", "review_group", "critic"],
    source_route_key: "review_team/review_group/critic"
  },
  taskTeamScope: {
    taskTeamRunId: "task-team-run-7",
    taskTeamInstanceId: "task-team-instance-7",
    taskId: "task-42",
    logicalTeamPath: ["review_team"],
    logicalTeamRouteKey: "review_team"
  }
}
```

The outer ordinary handle then calls the same core with `sourcePrefix=['research_group']` and **no override**. It prefixes the retained logical-team path together with leaf paths:

```ts
{
  scopeKind: "task_team_member",
  teamRunId: "root-team-1",
  payload: {
    status: "running",
    agent_id: "critic-runtime-93",
    agent_name: "critic",
    member_path: ["research_group", "review_team", "review_group", "critic"],
    member_route_key: "research_group/review_team/review_group/critic",
    source_path: ["research_group", "review_team", "review_group", "critic"],
    source_route_key: "research_group/review_team/review_group/critic"
  },
  taskTeamScope: {
    taskTeamRunId: "task-team-run-7",
    taskTeamInstanceId: "task-team-instance-7",
    taskId: "task-42",
    logicalTeamPath: ["research_group", "review_team"],
    logicalTeamRouteKey: "research_group/review_team"
  }
}
```

Both the live root event and reconnect snapshot map to:

```json
{
  "status": "running",
  "agent_id": "critic-runtime-93",
  "agent_name": "critic",
  "member_path": ["research_group", "review_team", "review_group", "critic"],
  "member_route_key": "research_group/review_team/review_group/critic",
  "source_path": ["research_group", "review_team", "review_group", "critic"],
  "source_route_key": "research_group/review_team/review_group/critic",
  "task_team_run_id": "task-team-run-7",
  "task_team_instance_id": "task-team-instance-7",
  "task_id": "task-42",
  "team_path": ["research_group", "review_team"],
  "team_route_key": "research_group/review_team",
  "task_team_relative_member_path": ["review_group", "critic"],
  "task_team_relative_member_route_key": "review_group/critic"
}
```

The existing frontend resolver therefore targets `task-team-run-7/review_group/critic`, promotes its run ID to `critic-runtime-93`, and exposes the running/interrupt surface on that exact transient leaf. It never falls through to task-team root or the structural `research_group/review_team/review_group/critic` context. A second or third ordinary outer boundary repeats the same retained-scope rebase and preserves the invariant.

## Outward `AgentRunEvent` Origin Coverage

The `SR-002` origin inventory remains authoritative and unchanged:

| Origin | Production source | Required preserved path |
| --- | --- | --- |
| ORIGIN-001 | AutoByteus/Codex/Claude runtime batch | runtime adapter -> `AgentRun` gateway -> processors -> finalizer -> subscribers |
| ORIGIN-002 | run command/termination fact | `AgentRun` lifecycle fact -> same queue/canonicalizer |
| ORIGIN-003 | accepted direct agent message | awaited `AgentRun.publishEvent` |
| ORIGIN-004 | artifact publication | awaited `AgentRun.publishEvent` |
| ORIGIN-005 | skill notification | awaited `AgentRun.publishEvent` |
| ORIGIN-006 | task-delegation notification to an agent | awaited nested `AgentRun.publishEvent` |
| ORIGIN-007 | processor-derived file/team communication event | processors then finalizer inside same gateway |

Removing aggregate team status must not introduce a new direct `AgentRunEvent` path. Leaf member status snapshots and events reuse the same final `AgentRun` output.

## Canonical Active-Run Status Application And Snapshot Precedence

The agent precedence that resolved `ARCH-FIND-002` remains unchanged:

| Canonical Agent Fact | Fresh Runtime Evidence | Result |
| --- | --- | --- |
| startup/initializing | current identified/anonymous turn | running |
| identified current A | idle/initializing without matching terminal | remain running |
| identified current A | matching terminal/error A | idle/error and retire A |
| current B | late evidence for retired A | preserve B/running |
| any | explicit accepted runtime termination | offline |

Team liveness uses a separate, simpler precedence:

| Manager Fact / Event | Other Observation | Public `isActive` |
| --- | --- | --- |
| exact run registered and `TeamRun.isActive()` true | any member status, no deltas, socket connected/disconnected | true |
| termination result rejected/throws | local stopPending clears | remain true |
| accepted termination then manager unregistration | stale frontend true | false |
| `getActiveRun` detects dead backend and performs the same unregister transition | stale frontend true | false |
| history context/draft exists without registration | any local context/socket state | false |

The team WebSocket must bind the manager lifecycle listener before its fresh manager read. A transition between bind and read is therefore observed or included in the read; repeated identical lifecycle messages are idempotent.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Root lifecycle | `{ team_run_id: "T", is_active: true }` from manager | `{ status: "idle" }` derived from members | Idle members do not make a team inactive |
| Definition group | solid blue when `group.runs.some(run.isActive)`, gray otherwise | five-state color copied from `representativeRun` or no activity cue | Group summary reveals active children without giving the definition a lifecycle |
| Exact team-run row | solid blue from `team.isActive`, gray when false | no dot, or `running/offline` synthesized for agent `StatusDot` | Preserves scan clarity with the exact manager-owned fact |
| Root action | `team.isActive && !stopPending -> Stop` | `team.currentStatus !== Offline -> Stop` | Uses the actual authority |
| Leaf member | `AGENT_STATUS running, member_route_key=a/b, agent_id=R` | subteam node `status=running` | Only the agent owns five-state lifecycle |
| Multi-boundary task-team leaf | child `review_team/.../critic` becomes root `research_group/review_team/.../critic`, and logical team becomes `research_group/review_team`; both map to `task-team-run-7/review_group/critic` | prefix leaf paths but clone child-local logical-team path | Live and reconnect must select the same transient execution leaf at arbitrary depth |
| Failure | `AgentRunCanonicalFailureObserver` or failed mutation result | root aggregate `status=error` | Keeps failure explicit |
| Settlement | `!taskService.hasOpenWork() && !childRun.hasOpenExecutionWork()` | `teamStatus in {idle,offline}` | Internal question gets an internal predicate |
| Connection | `isSubscribed=false, isActive=true` is valid | disconnect sets inactive | Transport is not liveness |
| Codex busy input | current A -> `turn/steer(expectedTurnId=A)` -> response A -> no start transition | active `turn/start` -> response B -> replace A | Provider method and lifecycle identity must describe the same turn |
| Codex steer race | exact precondition rejection -> failed operation, identity unchanged | rejection -> fallback `turn/start` | Race must be explicit, not converted into a phantom/new turn |
| Interrupt result | `{command_type:"INTERRUPT_GENERATION", command_id, state:"failed", target:{...}}` -> error toast | log only or generic agent `ERROR` segment | Control failure is observable without becoming agent output/status |
| Accepted interrupt | ack accepted; keep Running until `TURN_INTERRUPTED(A)`/canonical status | ack accepted -> optimistic idle | Provider terminal event remains lifecycle authority |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep optional root `status` beside `isActive` | Minimize query changes | Rejected | Remove schema/type/query/fixtures in one change |
| Map old `TEAM_STATUS` to lifecycle boolean | Ease stream migration | Rejected | New `TEAM_RUN_LIFECYCLE`; delete old mapper/handler |
| Keep `AgentTeamStatus` as computed alias | Ease component migration | Rejected | Components consume `isActive` or leaf `AgentStatus` directly |
| Infer active from any non-offline member | Preserve helper | Rejected | Manager registry is authority |
| Keep subteam pseudo or plain recursive `AgentStatusPayload` | Preserve common handle interface | Rejected | Specialize leaf snapshots and child work methods; carry `TaskTeamStreamScope` in the discriminated snapshot |
| Keep full `TaskTeamInstanceIdentity` as stream scope | Reuse one broad object | Rejected | Derive tight `TaskTeamStreamScope`; operational ingress/coordinator paths remain local and never participate in outward subtraction |
| Repair missing relative selector in mapper/frontend | Avoid bridge rework | Rejected | Rebase source/member/logical-team paths together at the mixed-team boundary; mapper validates and flattens only |
| Use socket close as inactive fallback | Avoid lifecycle event | Rejected | Bind manager lifecycle + fresh snapshot |
| Keep task cleanup on offline team event | Preserve router path | Rejected | Task terminal event/record reconciliation |
| Reuse agent `StatusDot` with `isActive ? running : offline` | Avoid a new component | Rejected | Boolean-only `TeamActivityDot`; no AgentStatus conversion or pulse |
| Persist/transport definition `hasActiveRuns` | Share the group summary broadly | Rejected | Derive from the group's already-present `runs[].isActive` at presentation boundary |
| Keep active-Codex `turn/start` and ignore response B | Minimize source change | Rejected | Use the provider's explicit steer method and exact A response; request method and identity must agree |
| Retry `turn/start` after steer rejection | Preserve delivery despite race | Rejected | Return structured failure and let caller/user decide; never fabricate a new turn |
| Clear canonical running from empty Codex snapshot/timer | Repair the visible stale state | Rejected | Prevent phantom B at provider input boundary; preserve current/retired-turn safety |
| Add `INTERRUPT_RESULT` or send generic `ERROR` | Avoid widening existing ack | Rejected | Widen `AGENT_COMMAND_ACK` with a tight interrupt arm; handle before event projection |
| Put `status` in interrupt acknowledgement | Let result drive UI directly | Rejected | Ack reports control only; canonical events/snapshot drive status |
| Accept unmatched interrupt acknowledgement | Simplify frontend | Rejected | Require command ID and exact target match before feedback |
| Queue/retry interrupt through reconnect | Hide transient transport loss | Rejected | Fail the attempt locally and visibly; canonical Running keeps Stop available for an explicit retry |
| Check socket state without send rollback | Avoid a helper | Rejected | State can race the send; register/check/send/catch/delete/callback/boolean is one failure-safe transition |
| Convert local transport failure into `AGENT_COMMAND_ACK` | Reuse one callback type | Rejected | Keep local admission/disconnect feedback distinct from a server result that was never produced |

## Derived Layering (If Useful)

```text
Frontend presentation/actions
  -> frontend team/agent read models
  -> GraphQL and WebSocket transport + command-result correlation
  -> AgentTeamRunManager (root team liveness) | TeamRun (exact member/event facade)
  -> MixedTeamManager/member handles (orchestration, leaf snapshots, private work)
  -> AgentRun (leaf lifecycle/event authority)
  -> runtime backend -> CodexThread start/steer owner | other provider owner
```

Task delegation and failure observation remain side capabilities consuming explicit events/results; they do not sit between team liveness and the UI.

## Change / Refactor Sequence

1. Start from accepted source HEAD `df3fe87e78ccc734128ce0b96a4e4281e2f55405`. Preserve all SR-006 lifecycle/team/nested/presentation source and tests. Do not include or overwrite delivery-owned dirty documentation/log artifacts.
2. In Codex thread scope, add serialized input submission, distinct required start/steer response parsers, typed provider-input failures, and rename `sendTurn` to `submitInput`. Update Codex backend/tests/call sites; do not edit `AgentTurnLifecycleState` or other runtime adapters.
3. Prove idle start, active A steer, exact A preservation, serialization, rejection/mismatch with no fallback/mutation, terminal A -> idle, accepted-input memory A, and reconnect idle in focused Codex/AgentRun tests.
4. Add the server interrupt-ack union/builder. Restructure standalone/team interrupt handling to parse command ID, execute the existing exact operation, and send exactly one same-socket ack for supported accepted/rejected/failed outcomes.
5. Mirror the discriminated union in frontend protocol. Add `interruptCommandAdmission.ts`; make both services register/check/send/rollback through it, return boolean admission, match pending ID/target, intercept team control results before member/task routing, and drain only still-pending entries on disconnect without changing lifecycle.
6. Update standalone/team stores to create client interrupt IDs, install server-result and local-transport callbacks, return the service admission boolean unchanged, and show one localized rejected/failed/transport error toast. Preserve composer action policy, exact team target checks, and canonical-event-only idle.
7. Add focused server/frontend coverage listed in the SR-007/SR-008 contracts, including disconnected, connecting, reconnecting, send-throw, reentrant disconnect-plus-throw, admitted-disconnect, and ack-before-disconnect cases. Rerun existing SEND_MESSAGE ack/dedupe, exact member routing, agent lifecycle/late-turn, nested task-team, binary team activity, composer keyboard, and localization suites.
8. Run server/frontend builds/typechecks and repository diff/obsolete-path scans. Classify unrelated baseline failures exactly. Produce the next implementation revision and return source to code review; API/E2E then performs a fresh SR-008 coverage investigation before delivery refresh/rebuild/manual verification.

## Key Tradeoffs

- A dedicated binary lifecycle message adds one small contract, but it prevents socket state and member aggregation from becoming implicit liveness and supports other live clients.
- A dedicated `TaskTeamStreamScope` adds one small internal type, but it removes irrelevant operational paths from the outward carrier and makes its one coordinate frame enforceable without bloating `AgentStatusPayload`.
- Rebasing scope at every mixed-team boundary is stricter than repairing it at the mapper, but it guarantees every downstream live/snapshot consumer sees coherent identity and prevents transport heuristics.
- Specializing handle/node types touches more compile sites than leaving optional status fields, but it makes invalid team-as-agent states unrepresentable.
- `error` remains work-blocking for private settlement to preserve current safety; this does not create a public team error state.
- Clean-cut GraphQL/WebSocket contraction requires coordinated server/frontend changes, accepted because they ship together and stored data needs no migration.
- A derived definition-group activity boolean is technically an aggregation, but it is intentionally bounded to presentation over already-authoritative child booleans; this keeps the valuable collapsed-group signal without recreating domain status.
- A separate small component adds one file, but it prevents boolean liveness from being disguised as agent `running/offline` and prevents an active team resource from pulsing like current generation.
- A small serialized Codex input tail adds local sequencing, but it prevents multiple supported input origins from making independent start/steer decisions and owns no cross-runtime policy.
- Requiring distinct start/steer response parsers is stricter than reusing `resolveTurnId`, but their actual schemas differ and a request/correlation ID must never masquerade as provider lifecycle identity.
- A widened ack union and ephemeral pending map add control-plane types, but avoid both log-only failure and misuse of agent `ERROR`/status. The map is not a lifecycle owner and is cleared on result/disconnect.
- A small shared admission helper is stricter than calling `wsClient.send` directly in two services, but it makes the identical rollback/exactly-once/boolean invariant reviewable and prevents connection-state races from leaving stale pending commands.

## Risks

- A manager unregister path that bypasses lifecycle notification could leave another live client stale; all map deletion/validation paths must use one transition method.
- Member offline events must complete before root unregistration/transport teardown so successful team termination does not strand leaf UI state.
- Every ordinary boundary must rebase retained logical-team scope with source/member paths. A cloned child-local scope, missing task-team override, or second prefix algorithm can target the task-team root/wrong leaf or reject reconnect.
- Switching `TeamRunEvent` from full operational identity to tight stream scope must cover AGENT, TASK_DELEGATION, COMMUNICATION, and MEMBER_INPUT; a partial event-type cut would preserve hidden frame drift.
- Removing pseudo team statuses may expose callers that used `currentStatus` for display or work inference; repository scans and discriminated types should force explicit replacement.
- Task-team cleanup must remain correct for terminal success, failure, cancellation, reconnect, and record refresh without an offline fallback.
- The delivery candidate and its Electron package no longer represent the complete approved UI; they must not be finalized or reused as SR-006 verification evidence without rebuild/revalidation.
- If `buildDisplayGroupsFromTeamNodes` does not update `hasActiveRuns` when appending another run, or the history path reads anything other than its complete `runs[]`, a collapsed group can show stale gray. Cover both builder paths and the leftover/current-node route.
- Accidentally using `isSubscribed`, representative ordering, member status, or Stop availability would recreate the ownership defect under a new presentation name; tests must vary those facts independently.
- If `submitInput` reads `activeTurnId` outside its serialized task, two near-simultaneous inputs can still both choose start. The read must occur after startup and earlier queued submissions.
- If a start response S or steer success reinstalls its ID after the corresponding terminal notification, stale running remains possible. Exact completion/failure/identified-idle paths must maintain `lastTerminalTurnId`; start must reconcile it with `activeTurnId` before transition, and steer must be correlation-only.
- If the steer response uses the nested start parser, its top-level `turnId` will be missed or an unrelated ID may be accepted. Parsers and error codes must remain method-specific.
- App-server precondition/non-steerable errors may vary by Codex version. The adapter must preserve a structured failure/message and never fall back; real-runtime API/E2E should verify the bundled version.
- If the team frontend sends `AGENT_COMMAND_ACK` through task/member projection before checking `command_type`, the result can be dropped or applied to the wrong leaf. Intercept it first and require exact target match.
- A matched accepted ack can arrive before provider terminal. Any optimistic idle/status cleanup would recreate dual authority; coverage must observe Running until canonical terminal/status.
- Disconnect between request and ack must clear pending control entries and surface transport failure without setting idle/offline. Otherwise the button appears inert again or stale acknowledgements may match after reconnect.
- Canonical Running may outlive socket attachment. A disconnected/reconnecting check must occur after pending registration and immediately before send, and a synchronous send throw must run the same delete-guarded completion. Otherwise the new command did not exist at the earlier disconnect event and can remain stale/inert.
- Reentrant test transports can emit disconnect inside `send()` and then throw. Both paths must share delete-before-callback completion so only the first observes the pending entry and feedback remains exactly once.

## Guidance For Implementation

- Treat HEAD `df3fe87e78ccc734128ce0b96a4e4281e2f55405` as the source starting state; `ARCH-REV-006`, IR-005, CRR-007, API-REV-003, CRR-008, and DR-005 remain the accepted SR-006 baseline. Preserve all unrelated server/frontend behavior and protected delivery edits.
- Make manager transition notification idempotent: reject/non-register a backend that is not live; emit only when an exact run changes registered liveness; replacing one still-active instance under the same ID is boolean `true -> true`, not a false/true flicker; a failed terminate does not mutate the map or notify false.
- Keep the lifecycle payload minimal. Do not add `status`, `phase`, member summaries, error text, interrupt permission, or connection state.
- In the initial team stream, bind run events and manager lifecycle before reading; keep each coordinate-consistent `TeamLeafAgentStatusSnapshot` intact through `mapTeamLeafAgentStatusSnapshot`, then send the fresh root lifecycle and recursively mapped leaf messages.
- Let only leaf-agent specializations expose `AgentStatus`. A subteam/task-team handle may expose child `isActive()` internally and `hasOpenExecutionWork()`, but never an agent status DTO.
- Preserve exact member route/path/run/task identity in both live and initial `AGENT_STATUS`; use `prefixMixedTeamStreamScope` at every boundary and `buildTaskTeamScopedIdentityPayload` only after scope is root-consistent. Do not copy either algorithm or infer a missing prefix.
- Keep the operational `TaskTeamInstanceIdentity` unchanged and local to task execution. Derive `TaskTeamStreamScope` at the task-team handle; never mutate operational ingress/coordinator selectors to look root-relative.
- Update the stale `TeamRunService` manager double as a test fixture. Do not add optional chaining/default lifecycle behavior to production to accommodate it.
- Keep task terminality and operational failures observable after aggregate deletion; do not silently drop the former consumers.
- Frontend lifecycle handlers update one subject only: root lifecycle -> `teamContext.isActive`; member status -> exact agent context; task event -> task projection; socket events -> `isSubscribed`.
- The definition/group dot reads only `runs.some(run.isActive)` and is display-only. The exact run dot reads only that row's `isActive`. Do not make either a new store field or mutation guard.
- Keep `TeamActivityDot` semantically tight: boolean + localized label, solid blue/gray, no pulse. Do not add a `kind`, string status, member list, or AgentStatus fallback.
- Keep `CodexThread` as the only start/steer owner. Serialize submissions locally; parse required method-specific IDs; start may install a new ID only after notification-aware reconciliation, while steer may only validate/return expected A.
- Do not add an active-input branch to `AgentRun`, team delivery, notifications, or frontend. Do not change native AutoByteus FIFO `turn_start` behavior or Claude semantics.
- Preserve the current/retired-turn state machine exactly. A provider steer failure returns through `AgentOperationResult`; it is not evidence to close A, and a successful response after terminal A does not reopen A.
- Keep the interrupt ack specialized and control-only. SEND_MESSAGE ack/dedupe remains unchanged. Do not add `status`, `can_interrupt`, task/team activity, or generic optional target fields to the interrupt arm.
- Both stream handlers must respond on the originating connection, including missing active-run and backend rejection. Team target route/run remains exact; no aggregate fallback.
- Frontend matching requires both command ID and target. Team matching happens before task/member projection. Rejected/failed feedback uses localized toast, not `handleError` or an `ErrorSegment`.
- Frontend interrupt admission returns `true` only after `CONNECTED` send returns normally. For nonconnected state or send throw, remove the exact entry, invoke local transport feedback once, and return `false`; do not queue/retry through reconnect or fabricate an acknowledgement.
- Disconnect drains only entries still pending through the same delete-guarded completion helper. An immediate failure, matched ack, or earlier disconnect must make later cleanup a no-op for that command.
- Accepted interrupt ack clears only the pending command correlation. Wait for canonical provider terminal/status to remove Stop and settle idle.
- Make `onTerminateTeam` check the store's boolean result. While pending, disable duplicate Stop; on failure, clear pending and leave `isActive=true`/Stop available.
- Delete rather than deprecate old fields/events/helpers. Regenerate generated GraphQL types after schema/query edits.
- Update documentation only in the later delivery stage after integrated-state refresh.
