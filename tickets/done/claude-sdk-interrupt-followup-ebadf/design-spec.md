# Design Spec

## Current-State Read

The current business flow is:

`Frontend primary stop/send button -> team WebSocket STOP_GENERATION -> AgentTeamStreamHandler -> TeamRun.interrupt -> ClaudeTeamManager.interrupt -> member AgentRun.interrupt -> ClaudeAgentRunBackend.interrupt -> ClaudeSession.interrupt -> Claude SDK query/process`

Follow-up uses the same active team WebSocket/session:

`Frontend send -> team WebSocket SEND_MESSAGE -> AgentTeamStreamHandler -> TeamRun.postMessage -> ClaudeTeamManager.postMessage -> reused member AgentRun -> ClaudeSession.sendTurn -> Claude SDK query/process`

The main ownership boundaries are mostly correct: the frontend owns user controls and stream command sending, `AgentTeamStreamHandler` owns WebSocket command dispatch, `ClaudeTeamManager` owns member-run routing/reuse, `ClaudeSession` owns the Claude per-run/per-turn lifecycle, and `ClaudeSdkClient` owns SDK option mapping. The defect is inside the Claude per-turn lifecycle boundary:

- `ClaudeSession.sendTurn()` starts a detached `runTurn()` and clears active state only in that task's `finally`.
- `ClaudeSession.interrupt()` aborts and clears the active controller, clears pending approvals, calls `sdkClient.interruptQuery()`, and immediately emits `TURN_INTERRUPTED` while `activeTurnId` and SDK query cleanup may still be unsettled.
- `TURN_INTERRUPTED` is mapped to frontend `TURN_COMPLETED` and `AGENT_STATUS IDLE`, so the UI can enable follow-up before the SDK query/process resources are stable.
- `ClaudeSdkClient` does not forward the SDK-supported `abortController` option, and the current string-prompt path relies on `Query.interrupt()`, which the installed SDK types describe as a control request supported only in streaming input/output contexts.
- Frontend `stopGeneration()` also sets local `isSending=false` immediately after sending the stop command, duplicating and weakening backend lifecycle authority.

The target design must preserve the existing WebSocket command path and team/session reuse, but make `ClaudeSession` the single owner that decides when an interrupted turn is truly settled and when idle can be emitted.

## Intended Change

Implement a settled-interrupt lifecycle for Claude Agent SDK turns and add E2E coverage for the team interrupt-then-follow-up business flow.

The implementation should:

1. Introduce an internal active-turn execution record in `ClaudeSession` so one owner tracks `turnId`, `AbortController`, active query, interrupt intent, and the turn task/settlement promise.
2. Forward the per-turn `AbortController` through `ClaudeSdkClient.startQueryTurn()` into Claude SDK query options.
3. On interrupt, mark the active turn as interrupted, abort the controller, clear pending tool approvals, force-close/cleanup the active query as needed, wait for the active turn task to settle, then emit `TURN_INTERRUPTED`/idle.
4. Treat user-requested abort as an interrupted terminal path: no `ERROR` segment, no successful `TURN_COMPLETED`, and no `hasCompletedTurn` update based only on an aborted turn.
5. Remove optimistic frontend `isSending=false` changes from stop handlers so backend lifecycle events remain authoritative.
6. Add unit and live-gated Claude team E2E tests for the invariant and the business flow.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix plus validation coverage.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, bounded local lifecycle refactor in `ClaudeSession`.
- Evidence: `ClaudeSession.interrupt()` emits interrupted/idle before the detached turn task clears `activeTurnId` and active query state; SDK cancellation option `abortController` is not forwarded; frontend stop handlers clear send state before backend lifecycle confirmation.
- Design response: Consolidate active-turn/interrupt state inside `ClaudeSession`, align SDK cancellation with `abortController`, and keep UI readiness event-driven.
- Refactor rationale: A local patch that only catches `spawn EBADF` or delays the frontend would leave the runtime boundary able to advertise idle while SDK resources are still closing. The lifecycle invariant must live at the Claude session owner.
- Intentional deferrals and residual risk, if any: The exact Node file descriptor that reports `EBADF` is not traced inside the minified SDK/Node child-process internals. The in-scope design removes the stale-resource conditions that expose it. Broader migration to the SDK's unstable v2 session API is deferred because the current bug can be fixed within the existing query adapter boundary.

## Terminology

- `Active turn execution`: the internal `ClaudeSession` record for one in-flight turn, including the turn identity, controller, query/resource references, interrupt flag, and settlement task.
- `Settled interrupt`: an interrupt whose SDK query/process cleanup is complete enough that `activeTurnId` is cleared and a follow-up `sendTurn()` can safely create a new query.
- `Frontend readiness`: whether the input button is send-ready; for this flow it must follow backend lifecycle events, not the local act of sending a stop command.

## Design Reading Order

1. Follow the data-flow spines for interrupt, settlement event propagation, and follow-up send.
2. Read the ownership map to see why `ClaudeSession` owns the invariant.
3. Apply file responsibility mapping and interface changes.
4. Implement migration sequence and tests.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the premature local frontend `isSending=false` stop behavior and remove `ClaudeSession` reliance on SDK `Query.interrupt()` for the current string-prompt query path.
- No compatibility flag should preserve early idle emission or optimistic send readiness.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User presses frontend stop control | Claude SDK active query/process is aborted/closed and session can accept next turn | `ClaudeSession` for per-turn lifecycle; `AgentTeamStreamHandler` for command entry | This is the failing interrupt path. |
| DS-002 | Return-Event | Settled Claude interrupt | Frontend input becomes send-ready through stream lifecycle events | `ClaudeSession` emits, event converter/stream handlers project | Prevents UI from enabling follow-up before runtime is safe. |
| DS-003 | Primary End-to-End | User sends follow-up message after interrupt | New Claude SDK query starts and emits normal progress | `ClaudeTeamManager` routes, `ClaudeSession` starts turn | This is the reported regression path. |
| DS-004 | Bounded Local | `ClaudeSession.sendTurn()` starts active turn | Active-turn execution clears state in normal/interrupt/error terminal path | `ClaudeSession` | This internal lifecycle state machine is the core fix. |
| DS-005 | Bounded Local | Claude SDK adapter receives start-turn options | SDK query receives `abortController` in options | `ClaudeSdkClient` | Ensures cancellation uses the SDK-supported interface. |

## Primary Execution Spine(s)

- DS-001 interrupt spine: `Input Stop Button -> TeamStreamingService STOP_GENERATION -> AgentTeamStreamHandler -> TeamRun / ClaudeTeamManager -> ClaudeSession settled interrupt -> ClaudeSdkClient / SDK query cleanup`
- DS-003 follow-up spine: `Input Send Button -> TeamStreamingService SEND_MESSAGE -> AgentTeamStreamHandler -> TeamRun / ClaudeTeamManager -> reused AgentRun -> ClaudeSession new active turn -> ClaudeSdkClient / SDK query`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The UI places a stop command on the team stream. The backend resolves the active team run and asks the Claude team manager to interrupt active members. Each Claude member run delegates to `ClaudeSession`, which aborts the active SDK query and waits until the turn state is settled before reporting interruption. | Stop control, team stream command, team run, Claude team manager, Claude session, SDK query | `ClaudeSession` for turn resource lifecycle | Pending tool approval denial, active query map cleanup, SDK adapter cancellation. |
| DS-002 | Only after DS-001 settlement does the session emit `TURN_INTERRUPTED`; existing conversion maps it to `TURN_COMPLETED`/`AGENT_STATUS IDLE`, and existing frontend handlers clear `isSending`. | Claude session event, event converter, team stream broadcaster, frontend handlers | `ClaudeSession` controls emission timing | WebSocket event mapping and frontend store state projection. |
| DS-003 | The user sends another message on the same team WebSocket. The team manager reuses the active member run, but `ClaudeSession` now has no active turn and starts a fresh SDK query with a fresh abort controller. | Send control, team stream command, team run, Claude team manager, member run, Claude session, SDK query | `ClaudeSession` for new turn start | Context attachments and run activity recording remain existing off-spine concerns. |
| DS-004 | Inside `ClaudeSession`, each turn has one active execution record. Normal completion updates `hasCompletedTurn`; interrupt completion emits interrupted and leaves the session safe for a later turn; errors emit runtime error and clear state. | Active-turn execution record, execute turn task, cleanup finally | `ClaudeSession` | Abort classification, output-completion suppression, active query map cleanup. |
| DS-005 | The SDK adapter translates internal turn options into SDK query options, including `abortController`; it no longer hides cancellation behind a control request for this prompt path. | ClaudeSdkClient start-turn options, SDK query options | `ClaudeSdkClient` | Environment, cwd, allowed tools, model and permission options remain unchanged. |

## Spine Actors / Main-Line Nodes

- Frontend primary input control (`AgentUserInputTextArea`).
- Frontend active-context/team-run store (`activeContextStore`, `agentTeamRunStore`).
- Team stream client (`TeamStreamingService`).
- Team WebSocket command entry (`AgentTeamStreamHandler`).
- Team run facade and Claude team backend/manager (`TeamRun`, `ClaudeTeamRunBackend`, `ClaudeTeamManager`).
- Member run and Claude backend (`AgentRun`, `ClaudeAgentRunBackend`).
- Claude session (`ClaudeSession`).
- Claude SDK adapter (`ClaudeSdkClient`).
- Claude Agent SDK query/process.

## Ownership Map

- `AgentUserInputTextArea` owns only user interaction dispatch and visual button state binding; it must not own backend turn lifecycle truth.
- `agentTeamRunStore` owns stream-service lookup and command sending; it must not declare a stop command complete before lifecycle events arrive.
- `AgentTeamStreamHandler` owns parsing WebSocket commands and invoking the team run; it should not implement Claude-specific cancellation policy.
- `ClaudeTeamManager` owns mapping team member names to member `AgentRun`s and retaining reusable member sessions; it should rely on member run interrupt promises to mean settled enough for status publication.
- `ClaudeAgentRunBackend` is a thin backend boundary around `ClaudeSession`; it translates operation results but must not duplicate session lifecycle state.
- `ClaudeSession` owns active turn identity, `AbortController`, active query registration, pending approval cleanup coordination, turn terminal classification, and lifecycle event emission timing.
- `ClaudeSdkClient` owns translating internal query inputs into the SDK's option object and safe best-effort query closure primitives.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `activeContextStore.stopGeneration()` | `agentTeamRunStore` / `agentRunStore`, then backend runtime | Selection-aware frontend facade | Runtime stop completion. |
| `TeamRun.interrupt()` | Runtime-specific team backend/manager | Domain facade over backend variants | Claude SDK cancellation internals. |
| `ClaudeAgentRunBackend.interrupt()` | `ClaudeSession` | Converts session exceptions to `AgentOperationResult` | Active-turn state or SDK process cleanup policy. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Immediate `focusedMember.isSending = false` in `agentTeamRunStore.stopGeneration()` | It advertises send readiness before backend interrupt settlement. | Existing stream lifecycle handlers driven by `AGENT_STATUS`/`TURN_COMPLETED`/`ERROR`. | In This Change | Remove, do not replace with timeout polling. |
| Immediate `context.isSending = false` in `agentRunStore.stopGeneration()` | Same premature readiness pattern for single-agent stop path. | Existing stream lifecycle handlers. | In This Change | Keeps shared input behavior consistent. |
| `ClaudeSession` use of `sdkClient.interruptQuery()` as primary stop for string-prompt turns | SDK contract points to `abortController`; `interrupt()` is a control request for streaming input/output. | Active-turn abort controller + active query close/settlement in `ClaudeSession`; adapter forwards `abortController`. | In This Change | `ClaudeSdkClient.interruptQuery()` can remain only if other future streaming-input code uses it; current session path must not. |
| Emitting successful completion for an aborted/interrupted turn | Interrupted turns are not successful assistant completions and should not mark session completed. | Explicit interrupted terminal path in active-turn execution. | In This Change | Suppress `ITEM_OUTPUT_TEXT_COMPLETED` and `TURN_COMPLETED` for aborted user interrupt. |

## Return Or Event Spine(s) (If Applicable)

- DS-002: `ClaudeSession settled interrupt -> ClaudeSessionEventConverter -> AgentRunEventMessageMapper -> TeamStreamBroadcaster -> TeamStreamingService -> handleTurnCompleted/handleAgentStatus -> focused member isSending=false`.

The event mapping can continue projecting `TURN_INTERRUPTED` as `TURN_COMPLETED` plus `AGENT_STATUS IDLE`, but the event must only be emitted after `ClaudeSession` clears the active turn execution.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `ClaudeSession`.
- Turn start spine: `sendTurn() -> create ActiveTurnExecution -> start executeTurn task -> register active query -> consume SDK query -> normal/error/interrupt terminal classification -> cleanup query/state -> emit terminal event`.
- Interrupt spine: `interrupt() -> capture ActiveTurnExecution -> mark interrupted -> abort controller -> deny pending approvals -> close active query -> await execution settlement -> emit TURN_INTERRUPTED`.
- Why it matters: This internal state machine prevents idle/status events from racing ahead of SDK process cleanup and prevents follow-up sends from reusing stale interrupted state.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Pending tool approval cleanup | DS-001, DS-004 | `ClaudeSession` via `ClaudeSessionToolUseCoordinator` | Deny/clear approval waits on interrupt. | Tool-gated turns are an interruptable state. | Tool approval policy could leak into team manager or WebSocket handler. |
| SDK option mapping | DS-005 | `ClaudeSdkClient` | Convert internal turn options to SDK query options. | Keeps SDK contract changes localized. | Session would depend on SDK internals directly. |
| Frontend lifecycle projection | DS-002 | Frontend handlers | Update `isSending` from stream events. | UI state must reflect backend truth. | Local stores would race with backend lifecycle. |
| Live Claude E2E setup | DS-003 | Test harness | Create schema, team run, WebSocket, model selection. | Validates business flow with real runtime. | Production code would accumulate test-only hooks. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Team stop command transport | Existing team WebSocket streaming subsystem | Reuse | `STOP_GENERATION` already exists and reaches backend. | N/A |
| Claude per-turn lifecycle | Existing Claude session subsystem | Extend | `ClaudeSession` already owns active turn and SDK query dependencies. | N/A |
| SDK query option translation | Existing runtime-management Claude SDK client | Extend | Adapter already maps model/cwd/env/tools to SDK options. | N/A |
| UI send readiness | Existing streaming handlers | Reuse | `handleAgentStatus`, `handleTurnCompleted`, `handleError` already clear `isSending`. | N/A |
| E2E team runtime coverage | Existing `claude-team-inter-agent-roundtrip.e2e.test.ts` | Extend | Same live-gated Claude team WebSocket harness and setup. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Web frontend agent input/store | User stop/send dispatch and frontend readiness projection | DS-001, DS-002 | Frontend store/handlers | Extend | Remove optimistic stop readiness. |
| Server team streaming | WebSocket command dispatch and event broadcast | DS-001, DS-003 | `AgentTeamStreamHandler` | Reuse | No protocol changes. |
| Claude team execution | Member run reuse/routing | DS-001, DS-003 | `ClaudeTeamManager` | Reuse | Relies on member interrupt promise semantics. |
| Claude agent session | Active turn lifecycle, interrupt settlement, event timing | DS-001, DS-004 | `ClaudeSession` | Extend | Primary fix. |
| Claude runtime management | SDK query option mapping and query close primitive | DS-005 | `ClaudeSdkClient` | Extend | Add `abortController` option. |
| Runtime E2E tests | Business-flow validation | DS-001, DS-003 | Test suite | Extend | Add live-gated Claude team scenario. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Claude agent session | `ClaudeSession` | Add active-turn execution record, settled interrupt flow, abort classification, completion suppression on interrupt. | Existing file owns Claude per-run session lifecycle. | Internal type only unless it grows. |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | Claude runtime management | `ClaudeSdkClient` | Add `abortController` to start-turn options and SDK query options. | Existing adapter owns SDK option mapping. | No. |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Web frontend team run store | Team stop command sender | Remove optimistic `isSending=false` after `STOP_GENERATION`. | Existing action owns team stream command send. | No. |
| `autobyteus-web/stores/agentRunStore.ts` | Web frontend single-agent run store | Agent stop command sender | Remove optimistic `isSending=false` after `STOP_GENERATION`. | Same pattern for single-agent input. | No. |
| `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | Unit tests | SDK adapter tests | Assert `abortController` is forwarded. | Existing adapter unit test file. | No. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session.test.ts` | Unit tests | Session lifecycle tests | Assert interrupt waits/suppresses abort errors/clears active state after settlement. | Existing session unit test file. | No. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts` | Unit tests | Private executeTurn option expectations | Update private calls/expectations for new abort-controller input. | Existing tests directly call `executeTurn`. | No. |
| `autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts` | E2E tests | Live Claude team flow | Add `SEND_MESSAGE -> STOP_GENERATION -> SEND_MESSAGE` test. | Existing live-gated Claude team harness. | No. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Active-turn execution record | None initially; keep private in `claude-session.ts` | Claude agent session | Only used by one owner. | N/A | N/A | A cross-file generic runtime state container. |
| WebSocket E2E helpers for wait/send | Existing local helpers in E2E file | Test harness | Existing file already uses local helpers; small additions can stay local. | N/A | N/A | Production utility or broad test abstraction unless duplication grows. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Active-turn execution record | Yes | Yes | Low | Keep fields singular: `turnId`, `abortController`, `interrupted`, `settledTask`. Do not keep both `signal` and `abortController` as separate authorities. |
| Claude SDK start-turn options | Yes | Yes | Low | Add `abortController` as the cancellation authority; do not add another custom cancellation flag. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Claude agent session | `ClaudeSession` | Active-turn lifecycle state and settled interrupt event emission. | One lifecycle owner should hold the invariant. | Private active-turn record. |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | Claude runtime management | `ClaudeSdkClient` | SDK query options include `abortController`; preserve close helper. | Adapter boundary. | No. |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Frontend team run actions | Team run store | Stop sends command only; lifecycle events clear readiness. | Existing team action owner. | No. |
| `autobyteus-web/stores/agentRunStore.ts` | Frontend agent run actions | Agent run store | Stop sends command only; lifecycle events clear readiness. | Existing agent action owner. | No. |
| `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | Tests | Adapter unit coverage | Abort-controller forwarding. | Existing test placement. | No. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session.test.ts` | Tests | Session unit coverage | Interrupt-settlement invariant. | Existing test placement. | No. |
| `autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts` | Tests | Live team E2E | Common business flow. | Existing live Claude team E2E placement. | No. |

## Ownership Boundaries

`ClaudeSession` is the authoritative boundary for per-turn lifecycle. Callers above it (`ClaudeAgentRunBackend`, `ClaudeTeamManager`, WebSocket handlers, frontend stores) must not infer that a stop is complete from command submission. They must rely on the session's terminal event/operation result semantics.

`ClaudeSdkClient` is the authoritative SDK adapter. `ClaudeSession` can request a start turn with an `AbortController`, but it should not duplicate SDK option object construction or inspect minified SDK internals.

Frontend stores are command senders and state holders, not backend lifecycle owners. Existing frontend stream handlers are the correct path for backend lifecycle projection.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ClaudeSession` | Active turn record, abort controller, active query map cleanup, lifecycle event timing | `ClaudeAgentRunBackend`, `ClaudeTeamManager` | Team manager clearing member state or emitting idle before session settles. | Add session methods/state, not team-manager workarounds. |
| `ClaudeSdkClient` | SDK query option object, query creation/close/interrupt wrappers | `ClaudeSession`, model catalog | `ClaudeSession` constructing raw SDK options or importing SDK directly. | Extend `startQueryTurn` options. |
| Frontend stream handlers | `isSending` lifecycle projection from backend messages | `agentTeamRunStore`, `agentRunStore` | Store locally forcing send-ready immediately after stop command. | Use existing `AGENT_STATUS`/`TURN_COMPLETED` handlers or add a backend ack event if needed. |

## Dependency Rules

- `AgentUserInputTextArea` may call `activeContextStore`; it must not call stream services or backend APIs directly.
- `agentTeamRunStore` may send `STOP_GENERATION` via `TeamStreamingService`; it must not mark backend interruption complete.
- `AgentTeamStreamHandler` may call `TeamRun` domain commands; it must not import Claude session classes.
- `ClaudeTeamManager` may call member `AgentRun.interrupt()` and wait for its result; it must not manipulate `ClaudeSession.activeTurnId` or SDK query maps.
- `ClaudeSession` may call `ClaudeSdkClient.startQueryTurn()` and `closeQuery()`; it must not import `@anthropic-ai/claude-agent-sdk` directly.
- `ClaudeSdkClient` may import and call the SDK; it must not know team/member/frontend concepts.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `TeamStreamingService.stopGeneration()` / WS `STOP_GENERATION` | Active team run | Request stop for current generation. | Team run ID comes from WebSocket URL. | No payload change. |
| `TeamRun.interrupt()` | Team run | Interrupt runtime-specific active work. | Team run instance. | Existing facade. |
| `ClaudeSession.interrupt()` | Claude session active turn | Settle active turn interruption and emit lifecycle. | Session instance/run ID. | Promise should not resolve before settled interrupt. |
| `ClaudeSdkClient.startQueryTurn(options)` | SDK query start | Start query with model/cwd/tools/abort controller. | Explicit options object with optional `abortController`. | Add `abortController?: AbortController`. |
| `ClaudeSdkClient.closeQuery(query)` | SDK query cleanup | Force cleanup of active query when interrupting/terminating. | Query object or null. | Safe best-effort wrapper. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| WS `STOP_GENERATION` | Yes | Yes, URL team run ID | Low | Keep unchanged. |
| `ClaudeSession.interrupt()` | Yes after refactor | Yes | Low | Promise means settled interrupt. |
| `ClaudeSdkClient.startQueryTurn()` | Yes | Yes | Low | Add `abortController`, avoid generic cancel flags. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Claude session lifecycle owner | `ClaudeSession` | Yes | Low | Keep. |
| Internal turn state | `ActiveTurnExecution` or `ClaudeActiveTurnExecution` | Yes | Low | Keep private; name by concern, not helper. |
| SDK adapter | `ClaudeSdkClient` | Yes | Low | Keep. |
| Frontend command sender | `agentTeamRunStore.stopGeneration` | Yes | Low | Keep method, remove premature state change. |

## Applied Patterns (If Any)

- Bounded local state machine inside `ClaudeSession`: active turn transitions from `running` to `completed`, `interrupted`, or `failed`, with cleanup before terminal event emission.
- Adapter pattern at `ClaudeSdkClient`: translates internal runtime options to external Claude SDK query options.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | File | `ClaudeSession` | Active turn and interrupt lifecycle. | Existing session lifecycle owner. | Team routing, frontend state, raw SDK imports. |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | File | `ClaudeSdkClient` | SDK query option mapping and query wrappers. | Existing SDK adapter. | Team/session lifecycle policy. |
| `autobyteus-web/stores/agentTeamRunStore.ts` | File | Team frontend store | Stop command sending only. | Existing team frontend action owner. | Backend lifecycle completion decisions. |
| `autobyteus-web/stores/agentRunStore.ts` | File | Agent frontend store | Stop command sending only. | Existing single-agent action owner. | Backend lifecycle completion decisions. |
| `autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts` | File | Live Claude team E2E | Add interrupt-follow-up test. | Existing live Claude team flow tests. | Production hooks or fake runtime code. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `.../backends/claude/session` | Main-Line Domain-Control | Yes | Low | Claude session lifecycle is already isolated. |
| `.../runtime-management/claude/client` | Adapter / provider boundary | Yes | Low | SDK-facing code belongs here. |
| `autobyteus-web/stores` | Frontend state/actions | Yes | Low | Only remove premature state mutation. |
| `tests/e2e/runtime` | Executable validation | Yes | Low | Existing runtime E2E placement. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Settled interrupt | `interrupt(): markInterrupted -> abort -> close query -> await activeTurn.settled -> emit TURN_INTERRUPTED` | `interrupt(): abort -> emit TURN_INTERRUPTED -> cleanup later` | Prevents idle before resources settle. |
| SDK cancellation | `startQueryTurn({ ..., abortController })` then `abortController.abort()` | `startQueryTurn(...)` without controller then `query.interrupt()` for string prompt | Aligns with SDK contract. |
| Frontend readiness | Stop sends command; `AGENT_STATUS IDLE` handler clears `isSending`. | Stop sends command and immediately clears `isSending`. | Prevents user follow-up before backend lifecycle is safe. |
| E2E business flow | `SEND_MESSAGE(tool approval) -> STOP_GENERATION -> wait idle -> SEND_MESSAGE(follow-up) -> assert no ERROR` | Only testing `terminate -> restore -> continue` | Matches the user's actual business flow. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep immediate frontend `isSending=false` after stop and add a backend retry on follow-up | Would be a small frontend-preserving patch. | Rejected | Remove optimistic reset; lifecycle events own readiness. |
| Catch and suppress `spawn EBADF` in `ClaudeAgentRunBackend.postUserMessage()` | Would hide user-visible error. | Rejected | Fix settled interrupt and SDK cancellation so EBADF is not produced by normal flow. |
| Keep `query.interrupt()` and also add `abortController` | Dual cancellation paths would make terminal behavior ambiguous. | Rejected for current `ClaudeSession` prompt path | Use abort-controller/close settlement as the current path. Leave `interruptQuery` unused unless a future streaming-input owner explicitly needs it. |
| Emit `TURN_INTERRUPTED` immediately for UI responsiveness and add a later hidden cleanup event | Preserves existing early idle semantics. | Rejected | Emit terminal lifecycle only after cleanup; no hidden dual-state behavior. |

## Derived Layering (If Useful)

- UI layer: input button and Pinia stores send commands and project lifecycle events.
- Transport layer: WebSocket services/handlers carry `STOP_GENERATION` and `SEND_MESSAGE`.
- Team domain layer: `TeamRun` / `ClaudeTeamManager` route commands to member runs.
- Runtime lifecycle layer: `ClaudeSession` owns turn state and lifecycle events.
- Provider adapter layer: `ClaudeSdkClient` maps to SDK query options and query cleanup.

Layering is explanatory only; the authoritative boundary for this bug remains `ClaudeSession`.

## Migration / Refactor Sequence

1. In `ClaudeSdkClient`, add `abortController?: AbortController` to `startQueryTurn()` and `buildQueryOptions()` input types and include it in the returned SDK query options when present.
2. Add/adjust `ClaudeSdkClient` unit coverage proving the same controller object reaches the SDK `query()` call options.
3. In `ClaudeSession`, introduce a private active-turn execution record. The record should be the only source for active `turnId`, `AbortController`, interruption flag, and settlement task. Keep public `activeAbortController`/`activeTurnId` behavior compatible only as projections if existing tests/code read them.
4. Change `sendTurn()` to create the active-turn record, start the task, and return the turn ID immediately while retaining a settlement promise for `interrupt()`.
5. Change `executeTurn()` input from loose `signal` to the owning `AbortController` or active-turn record. Pass the controller to `startQueryTurn()`.
6. In `executeTurn()`, classify `abortController.signal.aborted` / SDK abort errors as interrupted, skip assistant-completion and `TURN_COMPLETED` emission for interrupted turns, and always unregister/close the active query in `finally`.
7. In `interrupt()`, if an active turn exists: mark it interrupted, abort it, clear pending approvals, close the active query if present, await the settlement promise, then emit `TURN_INTERRUPTED` with the captured turn ID. If no active turn exists, return as an idempotent no-op without emitting a misleading turn event.
8. Update `ClaudeSession` unit tests for the new settlement semantics and remove expectations that `interruptQuery(null)` is called by session interrupt.
9. Remove immediate `isSending=false` mutations from team and single-agent frontend `stopGeneration()` actions. Confirm existing stream handlers cover idle/error/turn-complete readiness.
10. Add live-gated Claude team E2E test in `claude-team-inter-agent-roundtrip.e2e.test.ts`:
    - create one-agent Claude team run with `autoExecuteTools=false` and `write_file` exposed,
    - connect team WebSocket,
    - send a prompt that reaches `TOOL_APPROVAL_REQUESTED`,
    - send `STOP_GENERATION`,
    - wait for denial/interrupted idle event,
    - send a follow-up prompt in the same WebSocket/team run,
    - assert normal follow-up output and no `ERROR`/`spawn EBADF` after the interrupt.
11. Run targeted unit tests and, when credentials/flag are available, the targeted live Claude team E2E.

## Key Tradeoffs

- Waiting for settled interrupt can make the stop action reflect actual backend completion instead of instant UI readiness. This is intentional because send readiness must not race SDK cleanup.
- Keeping the E2E live-gated means CI without Claude credentials will not execute the full business flow. Unit coverage compensates for the core invariant, while live E2E remains available for release validation.
- The design keeps the existing query API rather than migrating to SDK v2 sessions, limiting scope and risk.

## Risks

- Live Claude model behavior may not reliably enter tool approval; E2E prompts must be strict and should use an exposed write tool with `autoExecuteTools=false` to force an approval event.
- Abort/close idempotency must be guarded because `interrupt()` and `executeTurn().finally` may both attempt cleanup.
- If frontend tests assume immediate stop clears `isSending`, those tests must be updated to expect lifecycle-driven readiness.

## Guidance For Implementation

- Keep the active-turn execution record private to `ClaudeSession`; do not export a generic lifecycle helper unless repeated code appears.
- Capture `turnId` before clearing active state so `TURN_INTERRUPTED` includes the correct turn ID.
- Do not emit `ERROR` for an abort caused by `interrupt()`; still emit errors for genuine SDK failures.
- Do not set `hasCompletedTurn=true` for interrupted turns. Only successful `TURN_COMPLETED` should mark a session resumable/completed.
- Prefer `query.close()` as best-effort forced cleanup after abort, wrapped in try/catch and idempotent guards. Do not call SDK `query.interrupt()` from `ClaudeSession` for the current string-prompt path.
- E2E should assert absence of `ERROR` messages after the interrupt index, especially messages containing `spawn EBADF`, and assert at least one normal follow-up `SEGMENT_CONTENT`/`SEGMENT_END`/`ASSISTANT_COMPLETE` for the target member.
