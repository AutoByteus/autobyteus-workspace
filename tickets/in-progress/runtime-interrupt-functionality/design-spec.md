# Design Spec

## Current-State Read

This design update is a second-stage refactor on top of the current ticket worktree, not a new ticket. The first-stage implementation already introduced native interrupt semantics and extracted the hidden turn loop from old normal-flow event handlers.

Current implemented single-agent runtime path in this worktree:

`Agent.postUserMessage() -> AgentRuntime.submitEvent(UserMessageReceivedEvent) -> AgentMessageInbox.postUserMessage(...) -> AgentWorker.asyncRun() -> AgentMessageScheduler.nextDispatchable(...) -> TurnStartMessageHandler -> AgentRuntimeState.startActiveTurn(...) -> AgentTurnRunner.run(event) -> AgentInputPipeline -> LlmPhase -> ToolPhase -> ToolResultPipeline -> ToolResultContinuationBuilder -> AgentInputPipeline(SenderType.TOOL) -> LLMResponsePipeline + AgentExternalEventNotifier notifications -> AgentIdleEvent`

Current implemented approval path:

`Server approve/deny command -> AgentRunBackend.approveToolInvocation(...) -> AutoByteusAgentRunBackend.approveToolInvocation(...) -> Agent.postToolExecutionApproval(...) -> AgentRuntime.postToolApproval(ToolApprovalInputMessage) -> AgentMessageInbox.postToolApproval(...) -> AgentMessageScheduler -> ToolApprovalMessageHandler -> AgentRuntimeState.postToolApprovalToActiveTurn(...) -> TurnToolInputPort.postApproval(...) -> ToolPhase.waitForApproval(...)`

Current implemented interrupt path before the AR-B-006 boundary correction:

`AgentRunBackend.interrupt(...) / Agent.interrupt(...) -> AgentRuntime.interrupt(...) -> AgentRuntimeState.interruptActiveTurn(...) -> AgentTurn.executionScope.interrupt(...) -> LlmPhase / ToolPhase await boundary observes interruption -> AgentTurnRunner settles interrupted -> runtime remains reusable`

The final target keeps the observable behavior but removes the state-owned interrupt/task boundary: `AgentRuntime.interrupt(...) -> AgentRuntimeState.activeTurn -> AgentTurn.interrupt(...) -> activeTurn.waitForSettlement(...)`.

Current implemented memory/working-context behavior exposed by user testing:

`AgentRuntimeState.startActiveTurn(...) -> memoryManager.createWorkingContextTurnCheckpoint(...) -> turn runs and appends user/tool/assistant protocol state to workingContextSnapshot -> AgentTurnRunner catches interruption -> context.state.restoreWorkingContextForInterruptedTurn(turnId) -> memoryManager.restoreWorkingContextTurnCheckpoint(...)`

This can reset the future LLM working context to the state before the interrupted turn even though the UI/event stream and raw traces still show the accepted user message and observed activity. The final target must treat interrupt as turn settlement, not as erasure of already accepted/emitted/executed history.

Important current-state improvements already present:

- `WorkerEventDispatcher` and old normal-flow `agent/handlers/*` turn-control choreography are removed from the implemented normal LLM/tool/continuation path.
- `AgentTurnRunner`, `LlmPhase`, `ToolPhase`, typed processor pipelines, and `TurnExecutionScope` now own the core turn flow; `AgentExternalEventNotifier` remains the external observable-event boundary.
- Current first-stage inbox code introduced a useful mailbox/scheduler shape, but it also introduced message-wrapper terminology around an event-oriented runtime.
- `TurnToolInputPort` is currently the active-turn approval wait/post primitive; dormant tool-result/continuation lanes were removed in the implemented code.

Remaining design pressure exposed by the user discussion:

- Autobyteus already has typed runtime events. A target flow that wraps `UserMessageReceivedEvent` into `UserInboxMessage` only to unwrap the event again creates duplicate domain representations.
- `AgentMessageInbox` / `AgentInboxMessage` remain message-wrapper names around an event-oriented runtime, and the low-level queue store should remain private storage, not the domain boundary.
- Scheduling and inbox-event handling are still implicit in `AgentWorker` / `AgentRuntime` branches rather than explicit `AgentEventScheduler` and typed `InboxEventHandler`s.
- If tool approvals/results are treated as active-turn events, the inbox loop cannot block behind `await AgentTurnRunner.run(...)`; it must keep processing active-turn events while an active turn's private execution is running.
- `AgentRuntimeState` currently still exposes active execution bookkeeping (`activeTurnTask` / task registration) beside `activeTurn`. That leaks an internal execution handle outside the `AgentTurn` aggregate and is a boundary issue to remove in the final target.
- Normal interrupt currently restores the working context to a pre-turn checkpoint, which can make later LLM calls forget accepted user input and observed activity from the interrupted turn. Memory retention/projection must be governed by the memory subsystem, not by `AgentTurnRunner` checkpoint rollback.

Therefore the next target design keeps the successful turn-runner/phase/pipeline extraction but refactors the remaining inbound side into:

`Typed runtime event -> AgentEventInbox entry -> AgentWorker inbox loop -> AgentEventScheduler -> typed InboxEventHandler -> AgentTurnRunner / lifecycle / TurnToolInputPort`

`TurnToolInputPort` remains as an internal per-turn tool-phase wait/wake port used by tool inbox event handlers and `ToolPhase`; it is not a second architecture-facing inbox.

## Intended Change

Add first-class native Autobyteus interruption as a turn-scoped runtime-control capability:

- `stop()` remains terminal runtime shutdown.
- `interrupt()` means cancel the currently active turn/generation and keep the runtime/session reusable.
- `AgentRuntime` is the public authoritative command boundary for native agent interruption.
- `AgentTurn` owns the active-turn aggregate: turn identity, interruptible **turn execution scope**, tool input port, settlement state, and a private execution promise/handle. The scope owns the active turn AbortSignal, interrupted flag, active operation metadata, abort listeners, and late-result fencing.
- Introduce a finite **AgentTurnRunner** boundary for the per-trigger reasoning algorithm: user/inter-agent/tool-continuation input -> LLM -> tool batch -> tool result continuation -> next LLM -> final answer/idle. `AgentTurn.startExecution(...)` owns attaching that runner to the turn; `AgentRuntimeState` must not store a sibling runner task.
- `AgentWorker` remains the long-lived runtime mailbox/scheduler, not the semantic owner of the agent reasoning loop.
- LLM/tool phases run under the active turn runner and turn execution scope. Passing `{ signal }` into BaseLLM/BaseTool/provider/tool APIs is downstream adapter plumbing, not the architectural owner of interruption.
- `LlmPhase`, `ToolPhase`, LLM providers, concrete tools, and selected built-in tool adapters receive the active turn scope/signal and translate it into provider/tool cancellation or local abandonment.
- Interrupted turns settle to idle with explicit interruption metadata, not success, error, or shutdown.
- Interrupted turns do not erase already accepted/emitted/executed history. The memory subsystem keeps committed facts and produces an LLM-safe future working-context projection while the turn/phase layer suppresses unsafe same-turn continuation.
- Native server Autobyteus backends call native `interrupt()` APIs instead of `stop()`.
- Native team interrupt propagates to currently running member agents/sub-teams without invoking team shutdown cleanup.
- Second-stage inbound refactor replaces the architecture-facing `AgentMessageInbox` / `AgentInboxMessage` message-wrapper model with one event-centric `AgentEventInbox`, explicit `AgentEventScheduler`, typed `InboxEventHandler`s, and an internal `TurnToolInputPort`.
- `AgentWorker` runs the runtime inbox loop and lifecycle work; `AgentEventScheduler` owns dispatchability and routing policy; inbox event handlers are scheduler-selected entry delegates that delegate to pipelines/domain owners without recreating the old LLM/tool event-handler chain.

## Architectural Cancellation Boundary

The design is not “sprinkle `{ signal }` through every call.” The design introduces an explicit **turn execution scope** around every active AgentTurn. That scope is the architectural container the user command interrupts.

Conceptual shape:

```ts
const turn = runtimeState.beginTurn(...);
await turn.executionScope.runOperation(
  { kind: 'llm_stream', turnId: turn.id },
  async (scope) => {
    return llmPhase.streamUnderTurnScope(scope);
  },
);

// From another control path, not the worker queue:
await runtime.interrupt({ turnId: turn.id, reason: 'user_interrupt' });
```

The scope provides these invariants:

- one cancellation authority per active turn;
- out-of-band interrupt entry from `AgentRuntime.interrupt()` while an active `AgentTurnRunner` task / phase operation is running;
- a standard way for the current await boundary to fail with `AgentInterruptionError`;
- registration of best-effort physical cancellers, for example stream close, HTTP abort, terminal session kill, MCP request cancel when supported;
- late-result fencing so an abandoned LLM/tool promise cannot revive the interrupted turn;
- one interrupted settlement path that clears pending approvals, same-turn queued continuations, and partial streaming segments.

Important JavaScript/TypeScript constraint: a Promise cannot be forcibly cancelled and an exception cannot be safely injected into arbitrary already-running async code from outside. The execution scope therefore combines three mechanisms:

1. **Cooperative cancellation**: the scope exposes `signal`; providers/tools that support cancellation observe it and stop.
2. **Await-boundary interruption**: `LlmPhase` and `ToolPhase` run LLM/tool work through scope utilities that race the active operation against the scope abort and throw/normalize `AgentInterruptionError` at the phase boundary.
3. **Containment/fencing**: if a provider/tool ignores cancellation, the scope abandons the local wait, records the turn as interrupted, and suppresses late results. Truly forcible termination requires a stronger containment boundary such as killing a child process/terminal session or worker process; use that only for concrete adapters that own such resources.

So `{ signal }` remains necessary, but only as the transport/control wire from the turn execution scope to lower-level participants. The main-line architecture is: `AgentRuntime.interrupt()` interrupts the active `AgentTurn.executionScope`; the LLM/tool calls merely participate in that scope.

## AgentWorker / Scheduler / AgentLoop Boundary

After the first-stage implementation, `AgentWorker` is no longer the semantic owner of the LLM/tool reasoning loop. It still owns a long-running runtime loop, bootstrap, stop/shutdown, and event intake. The remaining boundary improvement is to split **event scheduling and inbox-event handling** out of the worker so the inbound architecture is readable.

Target concepts:

| Concept | Lifetime | Responsibility | Must Not Own |
| --- | --- | --- | --- |
| `AgentRuntime` | Agent session | Public lifecycle/control: start, stop, interrupt, submit typed events, expose status, own inbox/state/worker and external-event notifier lifecycle. | LLM/tool phase execution, provider cancellation details, inbox event handler internals. |
| `AgentEventInbox` | Runtime session | Store typed event entries using semantic lanes, preserve parked work, and expose lane/claim/awaitable-reply primitives to the scheduler. | Scheduling policy, turn-loop decisions, LLM/tool execution, runtime shutdown cleanup. |
| `AgentWorker` | Runtime worker loop | Bootstrap, run the inbox loop, call `AgentEventScheduler`, coordinate terminal shutdown. | Event routing policy and normal LLM/tool phase progression. |
| `AgentEventScheduler` | Runtime session | Choose what inbound event entry is dispatchable given inbox lanes plus runtime/turn state; invoke the correct typed inbox event handler. | Queue storage mechanics, handler logic, LLM/tool phase work, provider/tool cancellation. |
| `InboxEventHandler` | One event family | Handle one scheduler-selected inbox event entry and delegate to the appropriate domain owner or pipeline. | Chaining LLM/tool phases as a hidden runner. |
| `AgentRuntimeState` | Runtime active-turn selector | The single `activeTurn: AgentTurn | null` reference, active-turn creation, identity routing, and clear-by-turn-ID after settlement. | Private runner task/promise, active runner object, turn execution handle, tool-port internals, or settlement state. |
| `AgentTurn` | One active turn aggregate | Turn identity, active batches, `TurnToolInputPort`, execution scope, settlement state, public `startExecution(...)` / `interrupt(...)` / `waitForSettlement(...)`, and private execution promise/handle. | Runtime inbox storage, public lifecycle commands, scheduler policy, or the LLM/tool reasoning algorithm. |
| `AgentTurnRunner` | Turn execution algorithm/service | Finite reasoning loop: process input, call LLM, run tools, feed continuations, return completed/interrupted outcome. | Runtime inbox loop, active-turn task registration, scheduling queued external messages, server/frontend protocol, or runtime-state clearing. |

Critical scheduler change:

The worker must not rely on a single blocking loop shaped as `event -> start runner -> await runner -> read next event` if active-turn events are posted to the inbox. Instead the target loop is:

```ts
while (runtime.running) {
  const entry = await scheduler.nextDispatchable({ inbox, runtimeState, signal: workerSignal });
  await scheduler.dispatch(entry);
}
```

`TurnStartInboxEventHandler` asks `AgentRuntimeState` to create the active `AgentTurn`, then calls `AgentTurn.startExecution(runnerFactory, trigger)`. The private execution handle stays inside the turn. The handler may attach a non-owning settlement observer through `turn.waitForSettlement().finally(...)` to clear the active turn by ID and wake the scheduler; it must not register a task in runtime state. The worker loop keeps monitoring the inbox while the turn execution is active. While the turn is active:

- valid active-turn events, such as tool approval/denial, are dispatched immediately to active-turn inbox event handlers;
- unrelated external user/inter-agent events remain parked in `AgentEventInbox` until the active turn settles;
- lifecycle stop/shutdown events remain dispatchable according to lifecycle policy;
- interrupt remains side-band via `AgentRuntime.interrupt()` and does not wait for inbox dispatch.

This preserves one-active-turn semantics while making a unified inbox possible.

Final implementation rule:

- `AgentTurnRunner` remains the only owner of normal LLM/tool/continuation progression.
- `AgentTurn` remains the aggregate root for active-turn execution bookkeeping, settlement, interruption, and turn-scoped ports.
- `AgentRuntimeState` owns only the active-turn reference and identity routing; it must not own `activeTurnTask`, `activeRunner`, or a runner promise as peer state.
- `AgentEventScheduler` owns inbound dispatchability and routing policy only.
- Typed inbox event handlers are scheduler-selected entry delegates; they may delegate to pipelines/domain owners but must not recreate the deleted old chain: `UserHandler -> LLMHandler -> ToolHandler -> ToolResultHandler -> LLMHandler`.
- Public event/stream notifications remain external observations, not hidden turn-control messages.

## Concept Inventory Before Spines

Before choosing file changes, the architecture should make these concepts explicit:

| Concept | Meaning | Current Representation | Target Responsibility | Notes |
| --- | --- | --- | --- | --- |
| Runtime control plane | Public commands and lifecycle for a running agent session. | `AgentRuntime`, server backend adapters. | `start`, terminal `stop`, side-band `interrupt`, inbound event submission, active-turn approval command. | Runtime owns the inbox/scheduler/worker but does not own inbox event handler internals or LLM/tool phases. |
| Runtime lifecycle pipeline | Bootstrap and terminal shutdown work for the whole runtime. | `AgentWorker.initialize/runtimeInit`, `AgentBootstrapper`, shutdown orchestrator. | Run bootstrap before dispatching turn-starting events; run shutdown exactly once on terminal stop/worker exit. | Normal interrupt never runs shutdown cleanup. |
| AgentEventInbox | One semantic inbound event boundary for the agent. | Current first-stage inbox plus approval path through `AgentRuntimeState`/`TurnToolInputPort`. | Store typed event entries for user/inter-agent triggers, lifecycle events, active-turn approval/result events, and parked future work; expose lane/claim APIs to the scheduler. | Replaces architecture-facing `AgentMessageInbox`/message wrappers; it is one event inbox with lanes, not one flat FIFO. |
| InboxQueueStore | Low-level queue/availability storage. | Current `message-inbox/inbox-queue-store.ts`. | Generic queue primitives behind `AgentEventInbox`. | Storage only; no domain routing, no “event manager” ownership. |
| AgentEventScheduler | Runtime event-routing policy. | Implicit `AgentWorker` / `AgentRuntime` branches. | Decide dispatchability by event class/lane, active-turn state, lifecycle state, and stop state using inbox lane APIs; invoke typed inbox event handlers. | Prevents worker or inbox storage from becoming a routing blob. |
| InboxEventHandler | Entry handler for one inbound event family. | Currently implicit branches and direct runtime/state calls. | Validate/normalize one event family and delegate to the right domain owner or processor pipeline. | Inbox event handlers are not LLM/tool phase owners. |
| TurnToolInputPort | Internal turn-scoped tool input wait/wake port. | Current `turn-tool-input-port.ts` approval wait/post primitive. | Deliver validated tool approvals and future async tool results to the current `ToolPhase`. | Internal to `AgentTurn` / `ToolPhase`; not a second public inbox. |
| AgentExternalEventNotifier | External observable-event boundary for agent-produced facts/data. | `AgentExternalEventNotifier`, `EventEmitter` / `EventManager`, `AgentEventStream`. | Publish assistant output, segment deltas, tool lifecycle/logs, approvals, errors, artifacts, state updates, turn lifecycle. | External events do not advance turn control flow and are separate from inbound event inbox entries. |
| MemoryManager / working context | Memory/history and future prompt-context owner. | `MemoryManager`, `WorkingContextSnapshot`, raw trace store, snapshot store. | Retain accepted/emitted/executed facts and project LLM-safe working-context messages from generic memory facts. | `AgentTurn` reports lifecycle outcome; memory owns what is remembered. |
| LLM-safe working-context projection after stopped continuation | Safe future prompt representation after a turn stops before normal continuation. | Currently incomplete; current pre-turn checkpoint restore is too broad. | Preserve committed facts while excluding unsafe incomplete native tool-call protocol and avoiding same-turn continuation. | Prevents the model from forgetting user messages after interrupt without making memory own turn lifecycle. |
| Agent turn | One finite unit of agent reasoning started by a turn-starting event. | `AgentTurn` with turn ID, batch, scope, current tool-approval wait primitive, and first-stage task stored in runtime state. | Turn ID, active batches, `TurnToolInputPort`, execution scope, settlement/interruption metadata, and private execution handle exposed only through `startExecution(...)` / `waitForSettlement(...)`. | TOOL continuations stay inside the same turn; runtime state must not store the turn's task separately. |
| Agent turn runner / agent loop | Finite reasoning loop for one turn. | `AgentTurnRunner`. | Process input, call LLM, run tools, feed tool continuations, return final/interrupted outcome to `AgentTurn` settlement. | This remains the core algorithm boundary but not the aggregate/task owner. |
| Turn execution scope | Cancellation/operation scope for one turn. | `TurnExecutionScope`. | Abort signal, active operation, abort callbacks, `AgentInterruptionError`, late-result fencing. | Mechanical cancellation primitive used by runner phases. |
| Processor | Ordered custom extension point for one domain transformation. | Existing input, LLM response, tool result, tool invocation, system prompt processors. | Remain concrete domain processors with `getOrder()` semantics. | Do not collapse differing contracts into one generic processor. |
| Processor pipeline | Orchestrator that applies processors for one area. | `agent/pipelines/*`. | Shared pipeline services for input, tool invocation, tool result, LLM response/output, system prompt. | Called by inbox event handlers, runners, and phases as appropriate. |
| Tool result continuation builder | Ordered tool results -> TOOL-sender input message. | `ToolResultContinuationBuilder`. | Preserve current aggregate message shape, denied/error/success formatting, `ContextFile` attachments. | Feeds `AgentInputPipeline`, never raw LLM. |
| LLM/tool phase services | Turn-local phase work. | `LlmPhase`, `ToolPhase`. | Execute one LLM or tool phase under `TurnExecutionScope`. | Inbox event handlers must not own this work. |
| Event/notification stream | Observability and client updates. | Notifier, stream events, WebSocket mappers. | Report statuses, stream segments, tool lifecycle, turn interrupted/completed. | Observes facts; does not drive the internal loop. |

Design rule: **the inbox stores typed event entries; the scheduler chooses the inbox event handler; handlers delegate to pipelines/domain owners; the runner controls turn-local LLM/tool flow; the execution scope interrupts active operations; `AgentExternalEventNotifier` notifies external observers.**

## Corrected Conceptual Data-Flow Spines

These are the spines the implementation should preserve or create. The later detailed file mapping should be checked against them.

| Spine ID | Name | Start | Main Path | End / Outcome | Owner |
| --- | --- | --- | --- | --- | --- |
| CDF-001 | Runtime bootstrap | `AgentRuntime.start()` | `AgentWorker` runtime init -> `AgentBootstrapper` / `SystemPromptPipeline` -> ready/idle notification -> inbox loop begins dispatching turn-starting events | Agent ready for event dispatch | `AgentRuntime` / `AgentWorker` |
| CDF-002 | External trigger to turn | `UserMessageReceivedEvent` / `InterAgentMessageReceivedEvent` enters `AgentEventInbox` | inbox stores typed event entry -> worker loop asks scheduler for next dispatchable entry -> scheduler claims turn-starting event when idle -> `TurnStartInboxEventHandler` checks no active turn -> `AgentRuntimeState.startActiveTurn(...)` creates/records `activeTurn` -> `AgentTurn.startExecution(runnerFactory, trigger)` privately runs `AgentTurnRunner` -> `turn.waitForSettlement()` observer clears active turn by ID and wakes scheduler | One active `AgentTurn` owns the private execution handle while inbox loop stays alive | `AgentEventInbox` / `AgentEventScheduler` / `TurnStartInboxEventHandler` / `AgentTurn` |
| CDF-003 | Input processing to LLM leg | External trigger or TOOL continuation | `AgentInputPipeline` applies input processors -> builds LLM user message with correct turn ID | LLM phase receives processed LLM input | `AgentInputPipeline` / `AgentTurnRunner` |
| CDF-004 | LLM phase | Processed LLM input | LLM request assembly/compaction -> provider stream under `TurnExecutionScope` -> streaming parser/segment events | Final response or tool invocations | `AgentTurnRunner` / `LlmPhase` |
| CDF-005 | Final response / output | LLM final response with no tool continuation | LLM response/output pipeline -> response processors -> assistant complete/final notification | Turn completed and idle | `LLMResponsePipeline` / `AgentTurnRunner` |
| CDF-006 | Tool invocation phase | Parsed LLM tool invocations | tool invocation preprocessors -> approval if needed -> approval wait through `TurnToolInputPort` -> tool execution under `TurnExecutionScope` -> ordered tool results | Ordered tool results or interruption | `AgentTurnRunner` / `ToolPhase` / `TurnToolInputPort` |
| CDF-007 | Tool result continuation | Ordered tool results from `ToolPhase` or active-turn `ToolResultEvent`s | tool result processors -> continuation builder -> `AgentInputPipeline` with `SenderType.TOOL` and existing active turn | Next processed LLM input in same turn | `ToolResultPipeline` / `ToolResultContinuationBuilder` / `AgentInputPipeline` |
| CDF-008 | Interrupt active turn | User control command, not inbox turn traffic | server/backend -> `AgentRuntime.interrupt()` -> read `AgentRuntimeState.activeTurn` -> `activeTurn.interrupt(reason)` -> active `AgentTurn.executionScope.interrupt()` -> active phase aborts/abandons -> `AgentTurn` records interrupted settlement through its private execution boundary -> `activeTurn.waitForSettlement()` completes -> `AgentRuntimeState.clearActiveTurnIfStillActive(turnId)` | Turn settles interrupted; worker/inbox loop remains alive and runtime becomes reusable | `AgentRuntime` / `AgentTurn` / `TurnExecutionScope` / `AgentTurnRunner` |
| CDF-009 | Pending approval response | Server/backend/native approval command arrives while turn waits | `AgentRunBackend.approveToolInvocation` -> native `Agent.postToolExecutionApproval` -> `AgentRuntime.postToolApprovalEvent(ToolExecutionApprovalEvent)` -> `AgentEventInbox.postAwaitableEvent(...)` -> scheduler -> `ToolApprovalInboxEventHandler` -> `AgentRuntimeState.routeToolApprovalToActiveTurn(...)` validates active turn identity -> `activeTurn.postToolApproval(...)` validates pending invocation through the turn aggregate -> `TurnToolInputPort.postApproval` -> `ToolPhase.waitForApproval` resumes | Tool phase resumes approved/denied, or explicit stale/no-active/no-pending/interrupted result is returned without starting a turn | `AgentEventInbox` / `AgentEventScheduler` / `ToolApprovalInboxEventHandler` / `AgentRuntimeState` / `AgentTurn` / `TurnToolInputPort` |
| CDF-010 | External observable-event publication | Domain fact or agent-produced output occurs in any spine | phase/pipeline/runtime calls `AgentExternalEventNotifier.notify...` -> `EventEmitter`/`EventManager` -> `AgentEventStream` -> backend/WebSocket/frontend | Client sees assistant output/status/segments/tool lifecycle/turn outcome | `AgentExternalEventNotifier` + event/stream pipeline |
| CDF-010A | Inter-agent communication projection | Inter-agent/system message is accepted as an inbound trigger | input pipeline converts message for LLM use and publishes the observable communication fact through `AgentExternalEventNotifier` -> stream/server/team processors enrich and derive team communication events -> frontend renders conversation/team communication projections | Existing consumers continue to see inter-agent communication after outbox removal | `AgentInputPipeline` + `AgentExternalEventNotifier` + team event processors |
| CDF-011 | Terminal shutdown | `AgentRuntime.stop()` / lifecycle stop message | mark stopping -> side-band cancel active turn if needed -> lifecycle handler/shutdown orchestrator cleans LLM/tools/MCP/resources exactly once -> stopped | Runtime lifecycle complete | `AgentRuntime` / `AgentWorker` / shutdown lifecycle pipeline |
| CDF-012 | External/async tool result delivery | External tool host/callback submits `ToolResultEvent` for an active invocation | `ToolResultEvent` enters `AgentEventInbox` active-turn lane -> scheduler -> `ToolResultInboxEventHandler` -> `AgentRuntimeState.routeToolResultToActiveTurn(...)` validates active turn identity -> `activeTurn.postToolResult(...)` validates pending invocation through the turn aggregate -> `TurnToolInputPort.postToolResult` -> `ToolPhase.waitForToolResults` resumes -> CDF-007 tool result continuation | Valid async result joins the current tool batch, or stale/no-active/no-pending/interrupted result is dropped without starting a turn | `AgentEventInbox` / `AgentEventScheduler` / `ToolResultInboxEventHandler` / `AgentRuntimeState` / `AgentTurn` / `TurnToolInputPort` / `ToolPhase` |
| CDF-013 | Interrupted history projection | `AgentTurn` settles interrupted after accepted/emitted/executed facts exist | phase services have already ingested committed facts or now ingest any completed-but-not-continued facts -> same-turn continuation is stopped -> `MemoryManager.projectWorkingContextForNextLlm(...)` or equivalent repairs the prompt projection into an LLM-safe sequence -> raw traces/event history remain append-only -> working context contains accepted user input and observed assistant/tool facts when safe -> next LLM request uses that working context | Later turns remember what happened without continuing unsafe partial protocol | `MemoryManager` / working-context projection, called by turn/phase lifecycle code |

Important spine constraints:

- CDF-008 is side-band control. It must not be blocked behind inbox scheduling.
- CDF-009 and CDF-012 can use the unified inbox only because the worker inbox loop keeps running while the active `AgentTurn` private execution is running.
- CDF-007 must go through CDF-003. Tool results must not be fed directly to the LLM.
- CDF-010 observes and reports facts. It must not be required to advance CDF-003 through CDF-007.
- CDF-010A is mandatory consumer compatibility: inter-agent/system communication events describe internal agent facts but must still be externally observable through the existing notifier/stream/server/frontend chain.
- CDF-002 enforces the one-active-turn invariant for turn-starting events; active-turn events can be dispatched while a turn is active but cannot create a second turn.
- CDF-001 and CDF-011 are runtime lifecycle spines. They must not be mixed into the per-turn runner and must not run during a normal generation interrupt.
- CDF-009 and CDF-012 are tool-specific active-turn event spines. If a future non-tool phase needs external input, it should get its own phase-specific wait/wake primitive rather than broadening `TurnToolInputPort`.
- CDF-013 separates ownership: `AgentTurn` / `AgentTurnRunner` decide interruption and whether continuation stops; phase services decide which facts have occurred; `MemoryManager` owns only fact storage and LLM-safe projection/repair. Turn code must not restore working context wholesale or edit snapshot internals directly.

### Conceptual Spine Completeness Check

| Use Case / Scenario | Required Spine Coverage | Completeness Decision |
| --- | --- | --- |
| Runtime starts before turn-starting events are processed | CDF-001 gates CDF-002 through runtime ready/idle state. | Complete: bootstrap is lifecycle, not a turn. |
| User/inter-agent event starts work | CDF-002 creates exactly one active `AgentTurn`, starts its private execution handle through `AgentTurn.startExecution(...)`, and runs CDF-003 through CDF-005 for the normal LLM response path. | Complete: scheduler/handler/turn aggregate/runner boundaries are explicit. |
| Tool call with in-process result | CDF-006 executes tool phase; CDF-007 feeds results through tool-result and input pipelines before the next LLM call. | Complete: raw tool results never go directly to LLM. |
| Tool approval arrives while the turn waits | CDF-009 routes through server/native/runtime inbox/scheduler/handler, `AgentRuntimeState` active-turn identity routing, and `AgentTurn.postToolApproval(...)` before `TurnToolInputPort`. | Complete: approval cannot start a new turn, bypass runtime active-turn routing, or bypass turn-owned pending-invocation validation. |
| Tool result arrives asynchronously from outside the phase | CDF-012 routes through inbox/scheduler/handler, `AgentRuntimeState` active-turn identity routing, and `AgentTurn.postToolResult(...)` before `TurnToolInputPort`, then rejoins CDF-007. | Complete for the target architecture; in-process tool results may still return directly inside `ToolPhase`. |
| Interrupt during LLM/tool/approval wait | CDF-008 interrupts the active scope side-band; CDF-006/CDF-009/CDF-012 are fenced by `AgentTurn`, `TurnToolInputPort`, and runtime-state active-turn identity routing. | Complete: interrupt is not delayed behind inbox dispatch. |
| Later user event while turn is active | CDF-002 parks turn-starting events; scheduler keeps CDF-009/CDF-012/lifecycle events dispatchable. | Complete: one active turn is preserved without blocking active-turn events. |
| Outbound status/output/tool lifecycle | CDF-010 publishes through `AgentExternalEventNotifier` only. | Complete: external observable events never advance turn control flow. |
| Inter-agent/system communication consumers | CDF-010A preserves `INTER_AGENT_MESSAGE`, `TEAM_COMMUNICATION_MESSAGE`, and `SYSTEM_TASK_NOTIFICATION` consumer projections while removing `AgentOutbox`. | Complete: notifier remains semantic publication boundary; stream/server/frontend consumers stay compatible. |
| Terminal stop/shutdown | CDF-011 runs shutdown cleanup exactly once and remains separate from normal interrupt. | Complete: stop and interrupt semantics remain distinct. |
| Interrupted turn memory retention | CDF-013 keeps accepted/emitted/executed facts, stops same-turn continuation, and repairs the future LLM projection safely. | Complete: interrupt ends execution but does not erase history. |

## Phase Naming Symmetry

Use the final symmetric phase names **`LlmPhase`** and **`ToolPhase`**. Do not keep `LlmTurnPhase` in the target architecture: the word `Turn` is redundant because both phases are owned by `AgentTurnRunner`, and the asymmetric pair `LlmTurnPhase` / `ToolPhase` makes the model harder to read. Do not use `LlmCallPhase`, because the phase owns more than a raw provider call: request assembly, context/compaction preparation, provider streaming, streaming parser integration, final/tool outcome production, and interrupted segment finalization.

## Agent Event Inbox / Scheduler / Inbox Event Handler Model

Autobyteus should remain **event-centric**. The final inbound model should not convert `Event -> Message -> Event` or introduce a second domain message representation. The runtime inbox stores **event entries/envelopes**: the canonical payload remains the original typed event, while the envelope adds delivery metadata such as lane, entry ID, and an optional awaitable completion for command-style callers.

Use the explicit names:

- **`AgentEventInbox`**: runtime inbound event mailbox with semantic lanes;
- **`AgentEventInboxEntry`**: small queue envelope around a typed event, not a new domain message;
- **`AgentEventScheduler`**: dispatchability and handler selection policy;
- **`InboxEventHandler`**: thin scheduler-selected handler/delegate for one inbox event family;
- **`TurnToolInputPort`**: internal per-turn tool wait/wake primitive.

Do **not** expose `AgentMessageInbox`, `AgentInboxMessage`, `UserInboxMessage`, `ToolApprovalInputMessage`, `ToolResultInputMessage`, or equivalent domain-message wrappers in the target architecture. If implementation needs an internal queue record, call it an `Entry` or `Envelope` and keep the event as the canonical domain object.

Naming decision from CR-019: use **Handler** deliberately for scheduler-selected event-inbox dispatch targets. These classes handle one `AgentEventInboxEntry`, perform small type/guard work, and delegate to the authoritative owner (`AgentTurnRunner` through `AgentTurn.startExecution(...)`, `AgentRuntimeState` active-turn routing, `AgentTurn` posting methods, lifecycle/status owner). They are not processor pipelines and must not be named `*EventProcessor` or placed under `event-inbox/processors/`. This does **not** resurrect the removed legacy normal-flow `agent/handlers/*` chain; final names must include `InboxEventHandler` to mark the narrower boundary. Their thinness is correct and should not be inflated just to justify the word handler.

Naming decision: do not use `ActiveTurnMessagePort` or `TurnAwaitableInputPort` in the final design. Those names are too broad and make the primitive sound like a second general inbox. The in-scope wait/wake responsibility is tool-specific: tool approval now, and future external/async tool result delivery if tool execution is externalized. If a future non-tool phase needs external input, define a separate phase-specific primitive instead of expanding this one.

The inbox is one semantic event boundary with typed lanes, not one undifferentiated FIFO:

| Inbox Lane | Accepted Typed Events | Dispatch Rule | Can Start New Turn? | Handler |
| --- | --- | --- | --- | --- |
| Turn-starting lane | `UserMessageReceivedEvent`, `InterAgentMessageReceivedEvent`, future external trigger events | Dispatch only when runtime is ready and no active turn exists; otherwise keep parked | Yes | `TurnStartInboxEventHandler` / specialized user and inter-agent handlers if they later diverge |
| Active-turn lane | `ToolExecutionApprovalEvent`, externally submitted `ToolResultEvent`, future tool-specific external result events | Dispatch only when an active turn exists and event identity matches; otherwise stale/no-active/no-pending/interrupted outcome | No | `ToolApprovalInboxEventHandler`, `ToolResultInboxEventHandler` |
| Runtime lifecycle lane | `LifecycleEvent` subclasses such as bootstrap/shutdown/stopped/error/ready lifecycle events | Dispatch according to lifecycle state; terminal stop can preempt future turn starts | No | `RuntimeLifecycleInboxEventHandler` |
| Side-band control | `interrupt()` command | Bypasses inbox and directly targets active turn execution scope | No | `AgentRuntime.interrupt()` |

Conceptual event-entry shape:

```ts
type AgentEventInboxLane = 'turn_start' | 'active_turn' | 'runtime_lifecycle';

type AgentEventInboxEntry<TEvent extends BaseEvent = BaseEvent> = {
  entryId: string;
  lane: AgentEventInboxLane;
  event: TEvent;
  awaitable?: AwaitableCompletion<InboxEventHandlerResult>;
};

class AgentEventInbox {
  postEvent(event: BaseEvent): Promise<void>;
  postAwaitableEvent(event: BaseEvent): Promise<InboxEventHandlerResult>;
  waitForAvailability(options?: { signal?: AbortSignal }): Promise<void>;
  peekCandidates(): Record<AgentEventInboxLane, AgentEventInboxEntry[]>;
  claim(entryId: string): AgentEventInboxEntry | null;
  park(entryId: string, reason: InboxParkReason): void;
}

class AgentEventScheduler {
  nextDispatchable(input: {
    inbox: AgentEventInbox;
    runtimeState: AgentRuntimeState;
    signal?: AbortSignal;
  }): Promise<AgentEventInboxEntry>;
  dispatch(entry: AgentEventInboxEntry): Promise<InboxEventHandlerResult>;
  wakeDispatchabilityChanged(): void;
}
```

`AgentEventInbox.postEvent(...)` owns lane classification for typed runtime events. `AgentEventScheduler.nextDispatchable(...)` owns dispatchability: when a turn is active it should prefer valid active-turn/lifecycle events and leave future user/inter-agent turn-starting events parked in `AgentEventInbox`. The scheduler waits on either inbox availability or runtime-state dispatchability changes, such as active-turn settlement. This avoids accidental second turns and avoids blocking tool approvals behind queued future user events.

Typed inbox event handler shape:

```ts
interface InboxEventHandler<TEvent extends BaseEvent = BaseEvent> {
  canHandle(event: BaseEvent): event is TEvent;
  handle(entry: AgentEventInboxEntry<TEvent>, context: AgentContext): Promise<InboxEventHandlerResult>;
}
```

Handler responsibilities:

- `TurnStartInboxEventHandler`: accepts `UserMessageReceivedEvent | InterAgentMessageReceivedEvent`, asks `AgentRuntimeState` to create the active `AgentTurn` when idle, calls `turn.startExecution(runnerFactory, trigger)`, attaches only a non-owning settlement observer, then returns without owning the LLM/tool loop or storing the runner task.
- `ToolApprovalInboxEventHandler`: accepts `ToolExecutionApprovalEvent`, routes through `AgentRuntimeState` for active-turn identity, then delegates pending-invocation validation and port delivery to `AgentTurn.postToolApproval(...)`; it resolves stale/no-active/no-pending/interrupted outcomes.
- `ToolResultInboxEventHandler`: accepts externally submitted `ToolResultEvent`, routes through `AgentRuntimeState` for active-turn identity, then delegates pending-invocation validation and port delivery to `AgentTurn.postToolResult(...)`. In-process synchronous tool execution may still return results directly inside `ToolPhase`; do not force artificial queue hops inside one owner.
- `RuntimeLifecycleInboxEventHandler`: accepts lifecycle events and applies lifecycle/status/terminal shutdown coordination.

Design rule: **all inbound agent work enters as typed events in `AgentEventInbox`; scheduler dispatches event entries; inbox event handlers handle/delegate scheduler-selected entries; the finite reasoning loop remains inside `AgentTurnRunner`.**

The current `AgentMessageInbox` implementation should be reshaped into `AgentEventInbox`. The current low-level queue storage should be named `InboxQueueStore` or equivalent and kept private to the inbox subsystem. The current `TurnToolInputPort` should remain internal to `AgentTurn` / turn phases.

## External Tool Approval / Denial Routing Model

Tool approval is an active-turn event. It may enter `AgentEventInbox`, but it is never eligible to start a new turn. The reason this is safe is the scheduler rule: the inbox loop keeps running while the active `AgentTurn` private execution waits, and `AgentEventScheduler` dispatches active-turn events to active-turn inbox event handlers instead of parking them behind future user events.

Final approval spine:

```text
Server approve/deny command
  -> AgentRun.approveToolInvocation(invocationId, approved, reason)
  -> AgentRunBackend.approveToolInvocation(...)
  -> AutoByteusAgentRunBackend.approveToolInvocation(...)
  -> Agent.postToolExecutionApproval(invocationId, approved, reason, { turnId? })
  -> AgentRuntime.postToolApprovalEvent(new ToolExecutionApprovalEvent(...))
  -> AgentEventInbox.postAwaitableEvent(ToolExecutionApprovalEvent)
  -> AgentEventScheduler.dispatch(...)
  -> ToolApprovalInboxEventHandler routes active-turn identity through AgentRuntimeState
  -> AgentTurn.postToolApproval(...) validates pending invocation and interrupted/settled state
  -> TurnToolInputPort.postApproval(ToolExecutionApprovalEvent)
  -> ToolPhase.waitForApproval(invocationId, scope.signal) resumes
```

Final public/runtime API shape:

```ts
class ToolExecutionApprovalEvent extends AgentOperationalEvent {
  toolInvocationId: string;
  isApproved: boolean;
  reason?: string;
  turnId?: string;
}

type PostToolApprovalResult =
  | { accepted: true; code: 'posted'; turnId: string; invocationId: string }
  | { accepted: false; code: 'no_active_turn'; invocationId: string; message: string }
  | { accepted: false; code: 'stale_turn'; invocationId: string; turnId?: string; activeTurnId?: string; message: string }
  | { accepted: false; code: 'no_pending_invocation'; invocationId: string; turnId: string; message: string }
  | { accepted: false; code: 'interrupted_turn'; invocationId: string; turnId: string; message: string }
  | { accepted: false; code: 'runtime_stopped'; invocationId: string; message: string };

class Agent {
  postToolExecutionApproval(
    invocationId: string,
    approved: boolean,
    reason?: string | null,
    options?: { turnId?: string; requestedBy?: string }
  ): Promise<PostToolApprovalResult>;
}

class AgentRuntime {
  postToolApprovalEvent(event: ToolExecutionApprovalEvent): Promise<PostToolApprovalResult>;
}
```

Validation and stale-result rules:

- `toolInvocationId` is required and must be non-empty.
- `turnId` is optional because current server/backend APIs may only provide invocation ID; if supplied, it must match the active turn.
- If runtime is stopped or the inbox loop is not running, return `runtime_stopped`; do not enqueue.
- If no active turn exists when the inbox event handler routes through `AgentRuntimeState`, return `no_active_turn`.
- If supplied `turnId` does not match the active turn, return `stale_turn`.
- If the active turn is interrupting/interrupted/settled, return `interrupted_turn` or `stale_turn` depending on available state.
- If the invocation is not pending in the active `AgentTurn` / active tool batch / `TurnToolInputPort` wait set, return `no_pending_invocation`.
- Only after scheduler/handler/runtime-state active-turn routing and `AgentTurn` pending-invocation validation may the event be posted to `TurnToolInputPort`.
- `TurnToolInputPort.postApproval(...)` wakes exactly the waiting `ToolPhase.waitForApproval(...)` for that invocation.
- Denial is a valid tool approval decision. `ToolPhase` converts it into denied-tool-result semantics and continues through `ToolResultPipeline` / continuation unless the turn is interrupted.

Boundary rule: server/native backends call the public native facade; the facade creates/submits a typed `ToolExecutionApprovalEvent`; runtime submits that event to `AgentEventInbox`; only `ToolApprovalInboxEventHandler` may ask `AgentRuntimeState` to route to the active turn, and only `AgentTurn` may validate pending invocation and post to `TurnToolInputPort`. External callers, server backends, team routing code, scheduler, and handlers must not write directly to `TurnToolInputPort` internals or low-level queue storage.

Team note: native team approval routing remains a team/member boundary concern. A team-level approval command should locate the target member and call that member agent's `postToolExecutionApproval(...)`; it must not bypass the member runtime's `AgentRuntime.postToolApprovalEvent(...)` path.

## External Event Notifier Model

The final design should **not** introduce `AgentOutbox` or a separate `AgentOutboundEventPublisher`. The existing `AgentExternalEventNotifier` already represents the intended concept: external observable agent events for consumers outside the agent's internal control flow. Here **external** means external to the agent's internal control loop, not that the underlying fact originated outside the agent. Some externally observed facts are internal agent facts, especially inter-agent communication and system-task notifications used by team UI projections.

This preserves the original distinction in the codebase:

- **Internal runtime events**: user-message events, inter-agent-message events, tool approval/result events, lifecycle events, and turn-starting work. These belong to `AgentEventInbox` / `AgentEventScheduler` and may drive runtime control flow.
- **External observable events**: assistant output, streaming segments, tool lifecycle, status, artifacts, inter-agent-message notifications, and turn lifecycle facts. These belong to `AgentExternalEventNotifier` and are consumed by `AgentEventStream`, server backends, WebSocket clients, CLIs, history projections, and other observers.

`AgentExternalEventNotifier` remains the canonical external-event publication boundary. It may continue to extend/use the shared `EventEmitter` / `EventManager` infrastructure, but `EventEmitter` is low-level subscription infrastructure, not the agent-domain owner.

| External Event Family | Observable Facts | Producer | Consumer | Notes |
| --- | --- | --- | --- | --- |
| Assistant output | final assistant response, final/error output | LLM response/output pipeline | `AgentExternalEventNotifier` -> `AgentEventStream` -> backend/server/UI | May later support output processors before publishing. |
| Streaming segments | reasoning/text/media/tool-call segment start/content/end | `LlmPhase` / streaming handler | stream pipeline/server/UI | Must support interrupted segment finalization. |
| Tool lifecycle | approval requested/approved/denied, execution started/succeeded/failed/interrupted, tool logs | `ToolPhase` / tool pipelines | stream pipeline/server/UI | Interrupted tool is distinct from failed tool. |
| Turn/status lifecycle | turn started/completed/interrupted, status changes | runtime/runner/status manager | status manager/notifier/server/UI | Turn interruption is not runtime shutdown. |
| Runtime lifecycle | bootstrap, ready, error, shutdown, stopped | runtime lifecycle pipeline | status manager/notifier/server/UI | Runtime lifecycle, not turn-local output. |
| Inter-agent / system communication projection | inter-agent-message notification, system task notification | `AgentInputPipeline` while adapting an inbound inter-agent/system message for LLM input | `AgentEventStream` -> server/team processors -> WebSocket/frontend conversation/team communication stores | Observable projection of an internal communication fact; must be preserved when removing `AgentOutbox`. |
| Artifact/state updates | artifacts, todo list, compaction status, memory/context notifications | relevant services/pipelines | stream pipeline/server/UI | Observability/state publication. |

### External Consumer Compatibility / Inter-Agent Event Contract

`AgentExternalEventNotifier` is a consumer contract as much as a publisher contract. The final refactor must preserve existing downstream consumers that render agent communication and lifecycle state. Removing the duplicate `AgentOutbox` wrapper means replacing each `outbox.publish...` call with the corresponding semantic notifier method; it does **not** mean deleting those publications.

Required inter-agent observable spine:

```text
AgentEventInbox receives InterAgentMessageReceivedEvent entry
  -> AgentEventScheduler / TurnStartInboxEventHandler starts an AgentTurn
  -> AgentInputPipeline converts InterAgentMessageReceivedEvent to SenderType.AGENT LLM input
  -> AgentExternalEventNotifier.notifyAgentDataInterAgentMessageReceived(payload)
  -> AgentEventStream maps AGENT_DATA_INTER_AGENT_MESSAGE_RECEIVED to StreamEventType.INTER_AGENT_MESSAGE
  -> AutoByteusStreamEventConverter maps to AgentRunEventType.INTER_AGENT_MESSAGE
  -> AutoByteusTeamRunEventProcessor enriches team/member sender+receiver metadata
  -> TeamCommunicationMessageProcessor derives TEAM_COMMUNICATION_MESSAGE
  -> AgentRunEventMessageMapper maps to WebSocket ServerMessageType.INTER_AGENT_MESSAGE / TEAM_COMMUNICATION_MESSAGE
  -> TeamStreamingService dispatches INTER_AGENT_MESSAGE to conversation segment rendering
     and TEAM_COMMUNICATION_MESSAGE to teamCommunicationStore
```

Payload shape that must remain compatible with current frontend/server consumers:

- `INTER_AGENT_MESSAGE`: `sender_agent_id`, optional `sender_agent_name`, optional `team_run_id`, optional `receiver_run_id`, optional `receiver_agent_name`, `recipient_role_name`, `content`, `message_type`, optional `message_id`, optional `reference_files`, optional `reference_file_entries`, optional `created_at`/`updated_at`, plus `agent_id`/`agent_name` when needed for team member routing.
- `TEAM_COMMUNICATION_MESSAGE`: normalized camel-case team communication payload (`messageId`, `teamRunId`, `senderRunId`, `receiverRunId`, member names, content, messageType, timestamps, `referenceFiles`) derived from the enriched inter-agent message.
- `SYSTEM_TASK_NOTIFICATION`: `sender_id`, `content`, and optional member routing fields.

Boundary rules:

- `AgentInputPipeline` may notify `AgentExternalEventNotifier` when it converts inter-agent/system input into an LLM-facing message because that publication is an external-observable projection, not a turn-control action.
- `AgentExternalEventNotifier.notifyAgentDataInterAgentMessageReceived(...)` and `notifyAgentDataSystemTaskNotificationReceived(...)` must remain semantic notifier methods in `agent/events/notifiers.ts`; do not replace them with low-level `emit(...)` calls.
- `AgentEventStream`, server converters, team event processors, and frontend streaming handlers remain consumers/projections; they must not be used to advance `AgentTurnRunner` or scheduler control flow.
- Final source must have no `AgentOutbox` wrapper, but the existing consumer-visible event families and payload fields must stay covered by tests.

### Frontend Interrupt Command / Event Contract

Current frontend code already uses the interrupt command path for both single-agent and team contexts. The final native Autobyteus runtime must emit the same observable events that Codex and Claude flows use so the UI is not broken:

```text
AgentUserInputTextArea primary action while isSending
  -> activeContextStore.interruptGeneration()
  -> agentRunStore.interruptGeneration(runId) or agentTeamRunStore.interruptGeneration(teamRunId)
  -> AgentStreamingService / TeamStreamingService sends { type: 'INTERRUPT_GENERATION' }
  -> AgentStreamHandler / AgentTeamStreamHandler resolves active run
  -> activeRun.interrupt(...)
  -> Autobyteus backend calls native Agent.interrupt(...) / AgentTeam.interrupt(...)
```

The frontend intentionally does **not** clear `isSending` optimistically at button click. It clears sending only when stream feedback arrives, primarily `TURN_INTERRUPTED` and/or `AGENT_STATUS` idle/error/shutdown. Therefore Autobyteus native interrupt must publish, through `AgentExternalEventNotifier` and the existing event stream/server mapper chain:

- `TURN_INTERRUPTED` with `turn_id`, `reason`, `interrupted: true`, and member routing fields when applicable;
- `TOOL_EXECUTION_INTERRUPTED` for interrupted active tool invocations, with `invocation_id`, `tool_name`, `turn_id`, `reason`, and routing fields;
- an idle status update after interrupted turn settlement, or equivalent existing status mapping that produces idle client state.

Design rule: **inbound event entries drive work; external events publish facts/results. External observable events must not be required to advance the internal agent loop, but they are required to preserve external consumers and UI correctness.**

Allowed final publication shape:

```ts
notifier.notifyAgentToolExecutionInterrupted({
  turn_id: turnId,
  invocation_id: invocationId,
  reason,
});

notifier.notifyAgentDataAssistantCompleteResponse(response);
```

Forbidden final publication shape:

```ts
// Do not add a wrapper that only forwards to AgentExternalEventNotifier.
agentOutbox.publishToolExecutionInterrupted(...);

// Do not bypass the semantic notifier with low-level EventEmitter/EventManager calls.
notifier.emit(EventType.AGENT_TOOL_EXECUTION_INTERRUPTED, rawPayload);
```

File guidance:

- Keep `autobyteus-ts/src/agent/events/notifiers.ts` as the single external observable-event boundary. Extend `AgentExternalEventNotifier` there when new interrupt events or payload helpers are needed.
- Remove the first-stage `autobyteus-ts/src/agent/outbox/` wrapper from the final design/source.
- Runner, phase, pipeline, and lifecycle code may depend on the semantic `AgentExternalEventNotifier` methods, but must not call low-level `EventEmitter.emit(...)` or `EventManager.emit(...)` directly.
- `AgentEventStream` remains an observer/converter of notifier events; it does not drive turn control.

## Bootstrap / Shutdown Fit Analysis

Bootstrap and shutdown fit the new architecture, but they should be treated as **runtime lifecycle pipelines**, not as agent turns and not as inbox-triggered agent-loop work.

### Current Bootstrap Read

Single-agent bootstrap currently runs through internal queue events:

```text
AgentWorker.initialize()
  -> enqueue BootstrapStartedEvent
  -> BootstrapEventHandler
       -> stores bootstrap steps in customData
       -> enqueue BootstrapStepRequestedEvent(0)
       -> execute step
       -> enqueue BootstrapStepCompletedEvent
       -> enqueue next BootstrapStepRequestedEvent
       -> BootstrapCompletedEvent
       -> AgentReadyEvent
```

Default single-agent bootstrap steps:

1. `McpServerPrewarmingStep`
2. `SystemPromptProcessingStep`
3. `WorkingContextSnapshotRestoreStep`

Team bootstrap is already simpler/direct:

```text
AgentTeamWorker.asyncRun()
  -> AgentTeamBootstrapper.run(context)
  -> TeamContextInitializationStep
  -> TaskNotifierInitializationStep
  -> AgentConfigurationPreparationStep
  -> CoordinatorInitializationStep
  -> AgentTeamReadyEvent
```

So the new architecture should make single-agent bootstrap more like team bootstrap: a direct lifecycle runner/orchestrator with emitted status/notification events, not queue events as the primary control-flow mechanism.

### Target Bootstrap Responsibility

| Concern | Owner | Rule |
| --- | --- | --- |
| Runtime init: event store, status deriver, queues | `AgentWorker` / runtime lifecycle | Runs before bootstrap steps. |
| Bootstrap step ordering | `AgentBootstrapper.run(context)` / lifecycle pipeline | Directly executes steps and emits bootstrap lifecycle events as observations. |
| System prompt processors | `SystemPromptPipeline` under `agent/pipelines` | Preserve processor order and error behavior; invoked by `SystemPromptProcessingStep`. |
| MCP prewarming | `McpServerPrewarmingStep` | Runtime resource preparation, not turn work. |
| Working context restore | `WorkingContextSnapshotRestoreStep` | Runtime memory/context preparation, not turn work. |
| AgentEventInbox availability | `AgentWorker` / `AgentEventScheduler` | External turn triggers must not start until bootstrap succeeds and ready/idle is reached. |

Bootstrap creates **readiness**, not a turn. Therefore:

- `AgentTurnRunner` is not involved in bootstrap.
- `AgentRuntime.interrupt()` during bootstrap has no active turn and should return a no-active-turn/not-interruptible result, not stop the runtime.
- `AgentRuntime.stop()` during bootstrap is terminal lifecycle control. If possible, it should request lifecycle cancellation/stop and then run shutdown cleanup.

A lightweight lifecycle stop signal may be added later or now as part of the larger refactor if MCP prewarming or snapshot restore need to be abortable. That signal is separate from `TurnExecutionScope`; do not reuse a turn scope for runtime lifecycle work.

### Current Shutdown Read

Single-agent shutdown is already closer to the target: `AgentWorker.asyncRun()` has a `finally` block that calls `AgentShutdownOrchestrator.run(context)`. Default steps:

1. `LLMInstanceCleanupStep`
2. `ToolCleanupStep`
3. `McpServerCleanupStep`

Team shutdown is also direct through `AgentTeamShutdownOrchestrator`:

1. `BridgeCleanupStep`
2. `SubTeamShutdownStep`
3. `AgentTeamShutdownStep`

The main issue is not placement; it is semantic separation from interrupt. Native backend interrupt currently calls stop, which incorrectly enters this shutdown spine.

### Target Shutdown Responsibility

| Concern | Owner | Rule |
| --- | --- | --- |
| Terminal stop command | `AgentRuntime.stop()` / `AgentTeamRuntime.stop()` | Enters stopping/shutdown state and prevents new turn starts. |
| Active turn during stop | Runtime lifecycle control + active `AgentTurn` | Stop may use the active `TurnExecutionScope` to cancel the current LLM/tool operation, but final outcome is terminal shutdown, not reusable interrupt. |
| Shutdown cleanup steps | `AgentShutdownOrchestrator` / `AgentTeamShutdownOrchestrator` | Run once on terminal runtime exit. |
| Normal interrupt | `AgentRuntime.interrupt()` / active `AgentTurn` | Must not run shutdown cleanup and must keep runtime reusable. |
| Team interrupt | `AgentTeamRuntime.interrupt()` / `TeamManager` | Interrupts running member nodes/subteams without bridge/subteam/agent teardown cleanup. |

This gives three distinct controls:

```text
bootstrap: prepare runtime before any turn
interrupt: cancel active turn and stay running
stop: terminally cancel work if needed, then cleanup resources
```

### Bootstrap/Shutdown Refactor Guidance

- Add `AgentBootstrapper.run(context)` for single-agent, mirroring `AgentTeamBootstrapper.run(context)`. Remove bootstrap event choreography as a control-flow mechanism; lifecycle events are emitted through AgentExternalEventNotifier/status notification only.
- Extract `SystemPromptPipeline` under `agent/pipelines` so system prompt processors join the processor-pipeline concept while remaining bootstrap-owned.
- Keep `AgentShutdownOrchestrator` and team shutdown orchestrator as lifecycle pipeline owners. Do not move them under `AgentTurnRunner`.
- Ensure `interrupt()` never triggers `AgentShutdownOrchestrator`; ensure `stop()` still does.
- Add tests for: bootstrap success still reaches idle, bootstrap failure still reaches error, interrupt during bootstrap does not call shutdown, stop during active turn performs terminal cleanup, and normal interrupt leaves cleanup untouched.

## Refined Responsibility Split

The second-stage refactor is not a cosmetic rename. It clarifies the remaining inbound-event architecture after the first-stage runner/phase/pipeline extraction.

### Core Objects

| Object | Kind | Owns | Must Not Own | Why |
| --- | --- | --- | --- | --- |
| `AgentRuntime` | Public lifecycle/control boundary | `start`, terminal `stop`, side-band `interrupt`, event submission, run status access, runtime-owned inbox/scheduler/worker/state creation and external-event notifier lifecycle. | LLM/tool phase execution, provider cancellation details, event-processor internals. | Keeps external API stable and separates terminal lifecycle/control from turn work. |
| `AgentEventInbox` | Runtime inbound boundary | Typed inbound agent events, semantic lanes, parked external work, lane availability, claim/park mechanics, awaitable command replies where needed. | Scheduling policy, turn-loop execution, phase logic. | One intuitive inbox for user, agent, lifecycle, and tool approval/result events without a second public inbox. |
| `AgentWorker` | Long-lived runtime loop | Runtime init, bootstrap, inbox loop, calling scheduler for dispatchable event entries, terminal shutdown coordination. | Event routing policy, normal LLM/tool reasoning loop, processor execution. | Keeps the runtime alive while an active turn's private execution runs. |
| `AgentEventScheduler` | Dispatch policy owner | Decide dispatchability by event class/lane, inbox lane, and runtime/turn state; claim event entries through `AgentEventInbox`; invoke typed inbox event handlers; leave future external turn-starting events parked while active. | Inbox storage mechanics, handler logic, phase execution, provider/tool cancellation. | Makes scheduling explicit instead of spreading `if` branches across worker/runtime. |
| `InboxEventHandler` | Entry handler per event family | Validate/normalize one scheduler-selected inbox event entry and delegate to the correct domain owner or pipeline. | Chaining LLM/tool phases as hidden event choreography. | Keeps handlers useful but bounded. |
| `AgentTurn` | Per-turn aggregate root | Turn ID, active tool batches, `TurnToolInputPort`, execution scope, settlement/interruption state, private execution promise/handle, `startExecution(...)`, `interrupt(...)`, and `waitForSettlement(...)`. | Running the LLM/tool algorithm itself, runtime inbox scheduling, public lifecycle commands, status protocol mapping. | Gives the active turn one canonical identity, private execution handle, cancellation/settlement state, and tool-input boundary. |
| `TurnToolInputPort` | Internal turn-scoped tool input primitive | Wait/post tool approval/result events, wake waiting `ToolPhase` operations, fence stale events. | New-turn scheduling, non-tool phase input, public runtime command routing, or direct handler/server access. | Replaces top-level active-turn inbox language with a tool-specific internal port owned through `AgentTurn`. |
| `AgentTurnRunner` | Per-turn use-case runner/service | The finite loop for one trigger: input processing, LLM phase, tool request/approval/execution/result phase, continuation, final/idle/interrupted outcome returned to `AgentTurn`. | Runtime start/stop, external mailbox ownership, frontend/server protocol mapping, active execution handle storage, runtime-state clearing. | The turn algorithm remains one direct owner while `AgentTurn` owns the aggregate/execution handle. |
| `TurnExecutionScope` | Per-turn cancellation/operation primitive | AbortController/signal, active operation metadata, abort callback registry, `runAbortable`, interruption error normalization, late-result fencing hooks. | Business loop decisions, LLM/tool semantics, runtime lifecycle. | Keeps cancellation mechanics out of runner and adapters. |

### Scheduler / Runner Control Shape

The first-stage implementation awaits `AgentTurnRunner.run(...)` directly from `AgentWorker`. That is safe when active-turn approvals are routed side-band directly to the current turn, but it is not sufficient for a unified inbox where tool approvals/results are inbound events.

Second-stage target:

```ts
class AgentWorker {
  async runInboxLoop() {
    await this.bootstrapRuntime();
    while (!this.stopRequested) {
      const entry = await scheduler.nextDispatchable({
        inbox,
        runtimeState: state,
        signal: this.workerSignal,
      });
      await scheduler.dispatch(entry);
    }
  }
}

class TurnStartInboxEventHandler {
  async handle(entry: AgentEventInboxEntry<UserMessageReceivedEvent | InterAgentMessageReceivedEvent>) {
    const trigger = entry.event;
    if (state.activeTurn) return { accepted: false, code: 'not_dispatchable' };

    const turn = state.startActiveTurn({ trigger });
    turn.startExecution({
      trigger,
      runnerFactory: () => new AgentTurnRunner(context, turn),
    });

    void turn.waitForSettlement().finally(() => {
      state.clearActiveTurnIfStillActive(turn.turnId);
      scheduler.wakeDispatchabilityChanged();
    });

    return { accepted: true, code: 'turn_started', turnId: turn.turnId };
  }
}
```

The worker loop continues to read dispatchable active-turn/lifecycle events while the active turn's private execution is running. One-active-turn is enforced by scheduler/state, not by blocking the entire inbox loop.

Good shape:

```text
AgentRuntimeState.activeTurn -> AgentTurn.startExecution(runnerFactory, trigger)
AgentRuntime.interrupt -> activeTurn.interrupt(reason)
activeTurn.waitForSettlement() -> runtimeState.clearActiveTurnIfStillActive(turnId)
```

Forbidden shape:

```text
runtimeState.activeTurn
runtimeState.activeTurnTask
runtimeState.activeRunner
state.registerActiveTurnTask(turnId, runnerTask)
```

The handler may observe the turn's settlement promise through the `AgentTurn` boundary. It must not store the runner promise, runner instance, or execution handle in `AgentRuntimeState`, `AgentWorker`, or `AgentEventScheduler` as a peer source of truth.

### Why `TurnExecutionScope` Is Still Needed

`AgentTurnRunner` should own **what the turn does next**. It should not directly own all cancellation mechanics. Without a separate scope, the runner mixes input/LLM/tool policy with abort-controller lifecycle, promise/stream racing, late-result suppression, process/MCP abort callback registration, and interruption error normalization.

Correct relation:

```text
AgentTurnRunner  --uses-->  AgentTurn.executionScope

AgentTurnRunner decides: run LLM, run tools, continue, finish, settle interrupted.
TurnExecutionScope enforces: this operation is interruptible and late results cannot escape.
```

Runtime interruption should not need to know which phase is active:

```ts
class AgentRuntime {
  async interrupt(options?: AgentInterruptOptions) {
    const turn = this.context.state.activeTurn;
    if (!turn) return noActiveTurn();
    const result = turn.interrupt(options?.reason ?? 'user_interrupt');
    await turn.waitForSettlement({ timeoutMs: options?.timeoutMs });
    return result;
  }
}
```

The active turn execution observes this because every LLM/tool phase runs under `turn.executionScope`.

## Tool Result Continuation / Input Pipeline Preservation

The refined runner design must preserve an important current semantic contract: **tool results are re-fed to the LLM as TOOL-sender input through the same input processing chain**.

Current behavior:

```text
ToolResultEventHandler
  -> aggregate ordered tool results
  -> new AgentInputUserMessage(..., SenderType.TOOL, mediaContextFiles)
  -> enqueueToolContinuationInput(new UserMessageReceivedEvent(toolMessage))
  -> UserInputMessageEventHandler
       - does not start a new turn because senderType === TOOL
       - reuses context.state.activeTurn.turnId
       - applies context.config.inputProcessors in order
       - buildLLMUserMessage(processedMessage)
       - enqueue LLMUserMessageReadyEvent for the same turn
  -> LLMUserMessageReadyEventHandler
```

This must not be broken. The target runner must **not** shortcut directly from raw tool results to an LLM call. If it did, it would bypass:

- `ToolResultProcessor` ordering and aggregation;
- `ContextFile` / media context preservation;
- `SenderType.TOOL`;
- configured `inputProcessors`;
- existing `buildLLMUserMessage(...)` multimodal conversion;
- active-turn reuse for tool continuations.

### Required Extraction

As part of the final refactor that removes queue choreography from tool continuation, extract the current user-input transformation into a shared pipeline, for example:

```ts
class AgentInputPipeline {
  async processForLlm(
    input: AgentInputUserMessage | UserMessageReceivedEvent | InterAgentMessageReceivedEvent,
    context: AgentContext,
    options: { turn: AgentTurn; startsNewTurn: boolean }
  ): Promise<ProcessedLlmUserInput>
}
```

Then both paths use the same pipeline:

```text
External user input:
  AgentEventInbox -> AgentEventScheduler -> TurnStartInboxEventHandler -> AgentTurnRunner -> AgentInputPipeline.processForLlm(startsNewTurn=true)

Tool continuation:
  AgentTurnRunner -> ToolResultContinuationBuilder ->
  AgentInputPipeline.processForLlm(startsNewTurn=false, senderType=TOOL)
```

The input-processing logic currently inside `UserInputMessageEventHandler` should move into `AgentInputPipeline`. In the final design, normal turn execution calls this pipeline directly; the old queued input handler is not part of the turn-local loop.

### Tool Continuation Builder

Also extract the aggregation currently embedded in `ToolResultEventHandler.dispatchResultsToInputPipeline(...)` into a reusable turn-local component, for example:

```ts
class ToolResultContinuationBuilder {
  build(processedResults: ToolExecutionResult[]): AgentInputUserMessage
}
```

It must preserve the existing message shape:

- prefix: `The following tool executions have completed...`;
- per-tool success/error/denied formatting;
- `ContextFile` media attachments;
- `SenderType.TOOL`.

### Non-Breaking Rule

`AgentTurnRunner` may own the loop, but it must call the same extracted input pipeline for every LLM leg. Therefore the target sequence becomes:

```text
AgentTurnRunner
  -> run LLM phase from current LLM user message
  -> run/settle tool batch
  -> ToolResultContinuationBuilder builds TOOL input
  -> AgentInputPipeline applies inputProcessors and builds LLM user message
  -> next LLM phase in same turn
```

So the design does not remove the tool-result-as-user-input behavior; it makes that behavior an explicit shared capability instead of an accidental side effect of queue routing.

## Interrupted Turn Memory / Working Context Ownership Model

Interrupt is an execution control action. It must not be treated as a memory erase action.

The final design separates three history/context layers:

| Layer | Owner | Rule On Interrupt | Why |
| --- | --- | --- | --- |
| External observable event history | `AgentExternalEventNotifier` / event stream / UI consumers | Keep already published user/assistant/tool/turn facts. | Users saw these facts; they are history. |
| Durable raw memory trace history | `MemoryManager` raw trace store | Keep accepted user input, emitted assistant facts when available, tool invocations/results, and optional operation-boundary facts/notes. | Memory is append-only history of what happened. |
| Future LLM working context | `MemoryManager` / working-context projection | Rebuild/finalize LLM-safe context from raw/committed facts; include the interrupted turn, but avoid invalid partial native tool-call protocol. | Future prompts must remember history without violating provider message rules. |

Correct semantic rule:

```text
accepted / emitted / executed before interrupt = committed history
unsafe not-yet-completed protocol continuation = fenced, not continued
```

Therefore the final implementation must remove normal-interrupt behavior shaped like:

```text
AgentTurnRunner catches interruption
  -> restore working context to pre-turn checkpoint
```

That shape is wrong because it lets an execution controller erase memory owned by `MemoryManager`; it also makes later LLM calls forget accepted user input that remains visible in the conversation UI.

Target shape:

```text
AgentTurnRunner catches interruption
  -> return interrupted TurnOutcome
Turn/phase lifecycle stops same-turn continuation
  -> completed facts that already happened are ingested through normal memory methods
  -> MemoryManager.projectWorkingContextForNextLlm({ mode: 'llm_safe', fenceIncompleteToolProtocolScope })
MemoryManager
  -> keeps raw traces/event facts
  -> fences incomplete native tool-call protocol
  -> appends/projects an operation-boundary note when needed
  -> persists LLM-safe working context
```

The exact method name can vary, but the ownership must not vary: **`MemoryManager` owns memory commit/projection policy.** `AgentTurn` may hold a turn ID and settlement state; it must not own a working-context checkpoint that restores memory to a pre-turn state. `AgentRuntimeState` must not own memory rollback either.

LLM-safe projection examples:

```text
Good future context after interrupted user-only turn:
User: think about a game which you can create in html and create it and play yourself
Optional operation-boundary note: The previous operation stopped before normal completion.
```

```text
Good future context after interrupted tool turn:
User: create and play an HTML game
Optional operation-boundary note: The assistant began working and tool run_bash completed before the operation stopped.
Optional operation-boundary note: Incomplete tool continuation was not sent back to the LLM.
```

Forbidden future context:

```text
// Bad: forgets accepted history
User: stop please

// Bad: invalid partial native tool protocol
Assistant: tool_calls=[call_1, call_2]
Tool: result for call_1 only
```

Design consequences:

- `MemoryIngestInputProcessor` / `AgentInputPipeline` may record accepted user input; future prompt projection belongs to `MemoryManager`.
- `LlmPhase` / streaming response handlers may expose partial assistant text/events; memory ingestion of emitted assistant facts should be a memory-owned API, not a runner-local snapshot restore.
- `ToolPhase` / `ToolResultPipeline` may record completed tool facts; interrupted or incomplete tool protocol must be projected safely by memory.
- `LLMRequestAssembler` continues to populate the next provider request from `MemoryManager.getWorkingContextMessages()`, but that working context must already be the memory-owned safe projection.
- Normal completion may commit normal native tool protocol shape. Interrupt stops same-turn continuation and requires an LLM-safe working-context projection instead.

## Event Loop Fragmentation / Target Control-Flow Simplification

The current architecture is hard to reason about because the same event/queue mechanism is being used for multiple different purposes:

| Current Use Of Events/Queues | What It Really Represents | Problem | Target Owner |
| --- | --- | --- | --- |
| External user/inter-agent messages | Runtime inbox triggers | Valid use of a queue behind a semantic inbox. | `AgentEventInbox` / `AgentWorker` scheduler |
| Bootstrap/shutdown/status lifecycle | Runtime lifecycle events | Valid as lifecycle notifications/control. | `AgentRuntime` / `AgentWorker` |
| `LLMUserMessageReadyEvent` | Next phase inside the same turn | Internal control flow is hidden as queue traffic. | `AgentTurnRunner` + `AgentInputPipeline` |
| `PendingToolInvocationEvent` / `ExecuteToolInvocationEvent` | Tool phase inside the same turn | Tool batch control is fragmented across handlers/queues. | `AgentTurnRunner` tool phase |
| `ToolResultEvent` -> tool continuation user message | Same-turn continuation into next LLM leg | Behavior is correct, but it is accidental/indirect through queue priority. | `ToolResultContinuationBuilder` + `AgentInputPipeline` |
| `AgentIdleEvent` | Turn settlement | Turn completion is inferred after queued events. | `AgentTurnRunner` outcome + runtime status event |

The target design should distinguish **mailbox events** from **turn-local control flow**:

```text
Mailbox/runtime events:
  user input arrives
  inter-agent input arrives
  bootstrap/shutdown/status notifications
  external tool approval response, if approval is asynchronous

Turn-local control flow:
  process input
  call LLM
  parse tool requests
  execute/approve tools
  aggregate tool results
  process TOOL-sender continuation input
  call LLM again
  complete or interrupt turn
```

This gives a clearer mental model:

```text
AgentWorker waits for the next scheduler-approved inbox event entry.
AgentTurn owns the active-turn aggregate and private execution handle.
AgentTurnRunner owns the finite LLM/tool algorithm inside that turn.
Events still announce what happened, but they are no longer the way the turn advances.
```

### Existing-Turn Input Rule

The current `SenderType.TOOL` behavior should become an explicit rule in `AgentInputPipeline`:

```ts
if (message.senderType === SenderType.TOOL) {
  // Same-turn continuation.
  // Must not start a new AgentTurn.
  // Must require an active turn.
  turnId = activeTurn.turnId;
} else {
  // New external trigger.
  // Must start exactly one new AgentTurn when no active turn exists.
  turnId = startNewTurn();
}

processed = await runInputProcessors(message);
llmUserMessage = buildLLMUserMessage(processed);
```

This means the runner does not bypass the processor chain. Instead, after tools finish, the runner builds a TOOL-sender input and sends it through the same pipeline before the next LLM call.

### Final Control-Flow Shape

The final design uses explicit phase methods rather than handler-owned queue choreography:

```ts
class AgentTurnRunner {
  async run(trigger: UserMessageReceivedEvent | InterAgentMessageReceivedEvent): Promise<TurnOutcome> {
    let nextInput = await this.inputPipeline.processExternalTrigger(trigger, this.turn);

    while (true) {
      const llmOutcome = await this.llmPhase.run(nextInput, this.turn.executionScope);

      if (llmOutcome.kind === 'final') {
        return { kind: 'completed', response: llmOutcome.response };
      }

      const toolResults = await this.toolPhase.run(llmOutcome.toolInvocations, this.turn.executionScope);
      const toolInput = this.toolContinuationBuilder.build(toolResults);
      nextInput = await this.inputPipeline.processToolContinuation(toolInput, this.turn);
    }
  }
}
```

The final direction should be:

- `AgentEventInbox` and `AgentEventScheduler` schedule turn-starting, active-turn, and lifecycle inbox event entries;
- runner phase services implement turn-local business flow;
- events/notifiers report status and streaming facts;
- internal queue events must not be the normal representation of the agent loop.

This is a significant refactor, but it improves locality, makes interruption natural, and makes the tool-result continuation rule easy to verify.

## Design Principles Validation

| Principle | Validation | Design Consequence |
| --- | --- | --- |
| Single Responsibility | Runtime, AgentEventInbox, worker, turn state, turn runner, phase services, and cancellation scope each have one primary reason to change. | Do not put inbox eligibility in low-level queue storage; do not put LLM/tool loop policy in `AgentWorker`; do not duplicate cancellation mechanics directly in every phase service. |
| Separation of Lifetimes | Runtime/worker are long-lived; turn/runner/scope are finite. | `stop()` targets runtime/worker lifetime; `interrupt()` targets active turn lifetime. |
| Structured Concurrency | Child operations belong to a parent turn scope. | LLM streams, tool calls, approvals, and continuations must be tied to one `AgentTurn.executionScope`. |
| Encapsulation | Higher layers issue intent; lower layers implement mechanics. | Server calls `agent.interrupt`; runtime interrupts active turn; runtime input goes through `AgentEventInbox`; providers/tools only receive generic execution options. |
| Authoritative Boundary Rule | Callers depend on the semantic owner, not both the owner and its internals. | Runtime/worker use `AgentEventInbox`, not both `AgentEventInbox` and `InboxQueueStore`; runner uses phase/pipeline services, not old handlers. |
| Idempotent State Transitions | Interrupt can be repeated and late results can arrive. | `AgentTurn` settlement must be idempotent; late LLM/tool results are fenced and ignored. |
| Open/Closed Adapter Boundary | New provider/tool cancellation behavior should not change runtime logic. | `BaseLLM` and `BaseTool` expose generic execution options; adapters map to provider/tool specifics. |
| Command/Event Separation | Events are good for external triggers and notifications, but turn-local business flow should have explicit phase owners. | `AgentTurnRunner` and phase services advance the loop; events/notifiers report facts. |
| Behavioral Preservation | Existing tool-result continuation semantics are part of the domain contract, not incidental queue behavior. | Extract and reuse `AgentInputPipeline` and `ToolResultContinuationBuilder`; never bypass input processors for tool continuations. |
| Minimal Renaming | Avoid broad churn unrelated to the behavior. | Keep `AgentWorker` name if desired; reduce its role and add `AgentTurnRunner` rather than renaming the whole runtime. |

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue + Missing Invariant + File Placement / Responsibility Drift
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: The first-stage worktree already fixed the original hidden-loop problem by introducing `AgentTurnRunner`, phase services, typed pipelines, `TurnExecutionScope`, and native interrupt routing. Remaining design issues are inbound-event clarity, active-turn encapsulation, and memory ownership on interrupt: current code exposes `AgentMessageInbox` plus `AgentInboxMessage` wrappers, `AgentRuntimeState` still exposes active execution bookkeeping beside `activeTurn`, and the current interruption catch path can restore the working context to a pre-turn checkpoint even though UI/raw traces show accepted user input and observed tool/assistant activity.
- Design response: Preserve the implemented runner/phase/pipeline/interrupt architecture, refactor the inbound side to `AgentEventInbox -> AgentEventScheduler -> typed InboxEventHandler -> pipeline/domain owner`, keep `TurnToolInputPort` internal to the active turn, move private execution handle/settlement ownership fully inside `AgentTurn`, and move interrupted-turn memory finalization into `MemoryManager` so interrupt stops execution without erasing accepted/emitted/executed history.
- Refactor rationale: A superficial rename would not solve dispatch ownership. A second public active-turn inbox keeps the mental model less intuitive. A wholesale working-context rollback on normal interrupt solves provider-protocol safety by violating memory ownership. A unified event inbox is safe only if scheduling is explicit and the worker loop remains able to dispatch active-turn/lifecycle events while one active turn's private execution is running; interrupted memory is safe only if `MemoryManager` owns a LLM-safe projection instead of letting turn execution controllers restore snapshots.
- Intentional deferrals and residual risk, if any: Full rollback of external tool side effects is deferred/out of scope. Some third-party SDKs or remote MCP servers may not physically stop remote work; local runtime must still abandon late results and surface local interruption.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.
- `Interrupt`: Cancel current active turn/generation and keep runtime reusable.
- `Stop` / `Terminate`: Shut down runtime/run resources and make the run offline.

## Design Reading Order

1. Native interruption command/data-flow spines.
2. Turn ownership and interruption settlement.
3. LLM/tool cancellation propagation.
4. Server/team/frontend command surface alignment.
5. File mapping, removals, and final work-package safety gates.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required final-state policy: old event-handler queue choreography for normal LLM/tool turn progression must be removed. Remaining event/listener code may only serve external input boundaries, lifecycle observation, or external event delivery; it must not serve as hidden control flow.
- Required action: remove the native Autobyteus backend behavior that implements `interrupt()` by calling `stop()`.
- Required action: preserve the current `INTERRUPT_GENERATION` / `interruptGeneration` command naming in the app-owned WebSocket/store layer, remove any leftover stop-generation code naming if found, and do not add a dual stop/interrupt command path. The user-facing button may still say “Stop” if product wants that label, but code/protocol ownership should use interrupt semantics.
- Required action: stop treating aborted LLM/tool work as normal errors or normal completions.
- The design must not leave a fallback branch where native interrupt silently uses stop.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User presses interrupt current generation | Active `AgentTurnRunner` settles current `AgentTurn` interrupted and runtime returns idle/reusable | `AgentRuntime` / `AgentTurnRunner` / `AgentTurn` | Core requested behavior for native single-agent runtime. |
| DS-002 | Primary End-to-End | `AgentRuntime.interrupt()` during LLM phase | `LlmPhase` aborts/abandons provider stream; no assistant completion is ingested | `AgentTurnRunner` + `TurnExecutionScope` + `BaseLLM` boundary | Ensures interruption reaches LLM without relying on worker-dispatched handlers. |
| DS-003 | Primary End-to-End | `AgentRuntime.interrupt()` during tool phase | `ToolPhase` aborts/abandons active tool execution; late result fenced; no continuation LLM call | `AgentTurnRunner` + `TurnExecutionScope` + `BaseTool` boundary | Ensures interruption reaches tools and same-turn batch mechanics. |
| DS-004 | Primary End-to-End | User interrupts native team run | Running member agents/sub-teams are interrupted and team returns idle without teardown | `AgentTeamRuntime` / `TeamManager` | Native team backend currently calls stop; team behavior must match interrupt semantics. |
| DS-005 | Return-Event | Interrupted turn/tool status | Frontend observes interrupting/interrupted lifecycle and can clear sending state | `AgentExternalEventNotifier` / runtime event/status pipeline | Prevents interruption from looking like success, failure, or shutdown. |
| DS-006 | Bounded Local | Active `AgentTurn` private execution | `TurnExecutionScope.runAbortable` returns/throws interruption; runner returns outcome; `AgentTurn` records settlement | `AgentTurn` + `AgentTurnRunner` + `TurnExecutionScope` | Queue-based worker dispatch is not the normal turn-control path; operations are scoped directly under the turn aggregate. |
| DS-007 | Bounded Local | Tool batch settlement under active turn | Expected invocation IDs are settled/fenced and `TurnToolInputPort` is closed/cleared on interrupt | `AgentTurn` / `TurnToolInputPort` | Prevents late tool results from reviving an interrupted turn while keeping tool-batch state inside the turn aggregate. |
| DS-008 | Primary End-to-End | External approve/deny tool command | `ToolPhase.waitForApproval` receives valid decision or runtime returns stale/no-active/no-pending/interrupted result | `AgentRuntime` / `AgentRuntimeState` / `AgentTurn` / `TurnToolInputPort` / `ToolPhase` | Completes UC-003/CDF-009 after removing old approval handler path and runtime-state ownership of port internals. |
| DS-009 | Primary End-to-End | External/async tool result arrives for an active invocation | `ToolPhase.waitForToolResults` receives the validated result or stale/no-active/no-pending/interrupted result is fenced | `AgentEventScheduler` / `AgentRuntimeState` / `AgentTurn` / `TurnToolInputPort` / `ToolPhase` | Completes the tool-result-in-inbox path without allowing tool results to start turns, bypass CDF-007, or bypass the turn aggregate. |
| DS-010 | Return-Event | Inter-agent/system message is accepted as input | Frontend conversation/team communication consumers receive compatible `INTER_AGENT_MESSAGE`, derived `TEAM_COMMUNICATION_MESSAGE`, and system task notifications | `AgentInputPipeline` / `AgentExternalEventNotifier` / event stream + server/team processors | Prevents the outbox-removal refactor from breaking existing team communication rendering. |
| DS-011 | Primary End-to-End / Memory Projection | Interrupt after accepted user input, emitted assistant facts, or completed tool facts | Next LLM request remembers committed facts from the interrupted turn safely while incomplete native tool-call protocol is fenced | `MemoryManager` / working-context projection | Prevents UI/raw-history facts from diverging from prompt memory after interrupt. |

## Primary Execution Spine(s)

Single-agent native interrupt:

`Client Interrupt Command -> AgentRunBackend.interrupt -> Agent.interrupt -> AgentRuntime.interrupt -> AgentRuntimeState.activeTurn -> AgentTurn.interrupt / TurnExecutionScope Interrupt -> LlmPhase/ToolPhase Aborts Or Abandons -> AgentTurn Interrupted Settlement -> AgentExternalEventNotifier Turn/Tool Interrupted Events -> Runtime Idle Status`

Native LLM interruption:

`AgentRuntime.interrupt -> AgentTurn.executionScope.interrupt -> LlmPhase abortable provider stream -> BaseLLM/provider request abort or local abandonment -> streaming segment interruption finalization -> skip normal completed-assistant ingestion/output pipeline -> memory-owned interrupted projection -> interrupted turn settlement`

Native tool interruption:

`AgentRuntime.interrupt -> AgentTurn.executionScope.interrupt -> ToolPhase abortable execute -> BaseTool / terminal / MCP cancellation -> TurnToolInputPort fences expected invocation IDs -> AgentExternalEventNotifier tool-interrupted lifecycle -> no ToolResultContinuationBuilder call -> interrupted turn settlement`

Native tool approval/denial response:

`Server Approval Command -> AgentRunBackend.approveToolInvocation -> AutoByteusAgentRunBackend.approveToolInvocation -> Agent.postToolExecutionApproval -> AgentRuntime.postToolApprovalEvent(ToolExecutionApprovalEvent) -> AgentEventInbox.postAwaitableEvent(event) -> AgentEventScheduler -> ToolApprovalInboxEventHandler -> AgentRuntimeState.routeToolApprovalToActiveTurn -> AgentTurn.postToolApproval -> TurnToolInputPort.postApproval -> ToolPhase.waitForApproval resumes or stale outcome returns`

External/async tool result response:

`External Tool Result Callback -> AgentRuntime.postToolResultEvent(ToolResultEvent) -> AgentEventInbox active-turn lane -> AgentEventScheduler -> ToolResultInboxEventHandler -> AgentRuntimeState.routeToolResultToActiveTurn -> AgentTurn.postToolResult -> TurnToolInputPort.postToolResult -> ToolPhase.waitForToolResults resumes -> ToolResultPipeline -> ToolResultContinuationBuilder -> AgentInputPipeline(SenderType.TOOL)`

Interrupted-turn memory retention:

`Accepted user input / emitted assistant facts / completed tool facts -> MemoryManager raw trace history -> AgentTurn interrupted outcome -> MemoryManager.projectWorkingContextForNextLlm(...) / equivalent LLM-safe projection repair -> LLM-safe working-context projection with optional operation-boundary note -> next LLM request uses remembered interrupted history`

Native team interruption:

`Team Interrupt Command -> AutoByteusTeamRunBackend.interrupt -> AgentTeam.interrupt -> AgentTeamRuntime.interrupt -> TeamManager interrupt running nodes -> member AgentRuntime interrupts -> Team idle/interrupted status`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The user asks to cancel the current native generation. The server backend calls native `Agent.interrupt()`. Runtime reads `AgentRuntimeState.activeTurn` and signals the active `AgentTurn` side-band through `turn.interrupt(...)`; it does not access a runner task. The active phase service sees the scope interruption, stops producing normal output, and returns/throws `AgentInterruptionError` to `AgentTurnRunner`. The runner returns an interrupted outcome through the turn's private execution boundary; `AgentTurn` closes/fences turn-local ports, records idempotent settlement, publishes/coordinates interrupted facts through `AgentExternalEventNotifier`, and the runtime remains running/idle after active-turn clear-by-ID. | Client command, AgentRunBackend, AgentRuntime, AgentRuntimeState, AgentTurn, AgentTurnRunner, TurnExecutionScope, AgentExternalEventNotifier | AgentRuntime / AgentTurn / AgentTurnRunner | Server backend, status projection, stream events |
| DS-002 | While LLM streaming is active, interrupt aborts the active turn scope. `LlmPhase` races provider iteration against the scope, asks the provider/iterator to abort/close when supported, closes open response segments with interruption metadata, skips normal completed-assistant ingestion and `LLMResponsePipeline`, ensures any already emitted assistant facts are ingested through memory-owned fact APIs and future projection, and returns interruption to the runner. | AgentRuntime, AgentTurnRunner, TurnExecutionScope, LlmPhase, BaseLLM, provider | AgentTurnRunner + TurnExecutionScope + BaseLLM | Streaming parser/segments, memory-owned LLM-safe projection |
| DS-003 | While a tool is running, interrupt aborts the active turn scope. `ToolPhase` races tool execution against that scope. Participating tools receive the signal; terminal foreground command closes its session. The phase publishes tool-interrupted lifecycle through `AgentExternalEventNotifier`, asks the active `AgentTurn`/`TurnToolInputPort` boundary to fence expected invocation IDs, closes/fences the turn tool input port for that batch, and returns interruption without building a TOOL continuation. | AgentRuntime, AgentTurn, AgentTurnRunner, TurnExecutionScope, ToolPhase, BaseTool, TurnToolInputPort | AgentTurnRunner + TurnExecutionScope + BaseTool | Terminal/MCP cancellation, turn-local port/batch fencing |
| DS-004 | A team interrupt is a coordination operation, not shutdown. The native team runtime enters interrupting, asks TeamManager to interrupt all currently running cached agents/sub-teams, waits boundedly for member settlement, and returns team status to idle/interrupted. | Team backend, AgentTeamRuntime, TeamManager, member AgentRuntime | AgentTeamRuntime / TeamManager | Member context mapping, team status/events |
| DS-005 | Interrupt outcome travels through `AgentExternalEventNotifier`, `AgentEventStream`, server stream conversion, WebSocket mapper, and frontend handlers as interrupting/interrupted metadata. UI can clear sending state and keep the run online. | AgentExternalEventNotifier, AgentEventStream, server converter, WebSocket mapper, frontend handlers | AgentExternalEventNotifier / runtime event pipeline | Status visuals, protocol enum |
| DS-006 | The worker remains the serialized inbox loop, but normal turn execution is not worker-dispatched handler choreography. Active turn execution is privately attached to `AgentTurn`; runner phase services execute operations through `TurnExecutionScope` while the worker loop remains available for active-turn/lifecycle event dispatch and preserves unrelated parked events. | AgentWorker, AgentEventScheduler, AgentTurn, AgentTurnRunner, TurnExecutionScope, phase services | AgentTurn / AgentTurnRunner / TurnExecutionScope / AgentEventScheduler | Signal-aware phase operations, active-turn event dispatch, late-promise logging |
| DS-007 | Interruption invalidates all same-turn pending/queued continuation work. Tool approvals are cleared or rejected by active-turn identity. Invocation IDs expected by the active batch are marked settled/fenced inside the active `AgentTurn` / `TurnToolInputPort` boundary so stale late results are ignored. | AgentTurn, TurnToolInputPort, ToolPhase | AgentTurn / TurnToolInputPort | Event predicates, pending approval map inside the turn aggregate |
| DS-008 | External approval/denial is a runtime active-turn event, not a new turn and not an old event-handler path. The server/backend command calls the native facade, runtime posts an awaitable inbox event, scheduler dispatches `ToolApprovalInboxEventHandler`, runtime state validates active turn identity, `AgentTurn.postToolApproval(...)` validates pending invocation and posts to `TurnToolInputPort`, and the waiting `ToolPhase` resumes or returns a stale/no-active/no-pending/interrupted outcome. | AgentRunBackend, Agent facade, AgentRuntime, AgentEventInbox, AgentEventScheduler, ToolApprovalInboxEventHandler, AgentRuntimeState, AgentTurn, TurnToolInputPort, ToolPhase | AgentRuntime / AgentEventScheduler / AgentRuntimeState / AgentTurn / TurnToolInputPort | Server command mapping, stale result mapping, team member routing |
| DS-009 | If tool execution is externalized or a tool result arrives asynchronously, the result is an active-turn inbox event. Scheduler dispatches `ToolResultInboxEventHandler`; runtime state validates active turn identity; `AgentTurn.postToolResult(...)` validates expected invocation identity and wakes `TurnToolInputPort`; then normal CDF-007 tool-result processing builds the TOOL-sender continuation. Invalid or late results are fenced and cannot start a turn. | Tool result callback, AgentEventInbox, AgentEventScheduler, ToolResultInboxEventHandler, AgentRuntimeState, AgentTurn, TurnToolInputPort, ToolPhase, ToolResultPipeline | AgentEventScheduler / AgentRuntimeState / AgentTurn / ToolPhase | External tool host/callback mapping, stale result classification, turn-local settled/fenced invocation IDs |
| DS-011 | When a turn is interrupted after facts are already accepted, emitted, or executed, the turn reports an interrupted outcome but does not decide what memory forgets. `MemoryManager` keeps raw trace facts append-only, records an operation-boundary note when needed, and rebuilds/finalizes the future working context as a LLM-safe projection. The projection may summarize/mark partial assistant/tool facts, but it must not preserve an invalid native tool-call protocol fragment or erase the accepted user message. | MemoryManager, raw trace store, WorkingContextSnapshot, AgentTurn outcome, LLMRequestAssembler | MemoryManager / working-context projection | Provider message validity, compaction/snapshot consistency, raw trace retention |

## Spine Actors / Main-Line Nodes

- Client interrupt command: sends the user's cancel-current-generation intent.
- AgentRunBackend / TeamRunBackend: runtime-kind adapter for the command.
- Agent / AgentTeam facade: public native runtime API exposed above runtime internals.
- AgentRuntime / AgentTeamRuntime: authoritative lifecycle/control boundary.
- AgentEventInbox: semantic runtime inbox for turn-starting triggers, active-turn events, lifecycle events, and queued/parked events that can exist outside a turn.
- AgentWorker / inbox loop: keeps the runtime inbox loop alive and delegates dispatch to `AgentEventScheduler`; does not own LLM/tool loop semantics.
- AgentTurn: active-turn aggregate root, private execution handle owner, tool input port owner, interruption/settlement owner.
- AgentTurnRunner: finite per-turn agent loop algorithm owner.
- AgentRuntimeState: active-turn reference and identity routing owner only.
- MemoryManager / working context: memory/history owner that turns raw committed facts plus interrupted-turn outcome into LLM-safe future prompt context.
- TurnExecutionScope: per-turn cancellation and late-result fencing primitive.
- LlmPhase / ToolPhase: direct phase services called by the runner.
- BaseLLM / BaseTool: provider/tool boundary where cancellation leaves runtime internals.
- AgentExternalEventNotifier / runtime event/status pipeline: publishes interrupting/interrupted state to server/UI.

## Ownership Map

- `AgentRuntime` owns public runtime control commands: start, stop, interrupt, external input submission, active-turn approval input, and status projection for runtime-level control events.
- `AgentEventInbox` owns typed inbound lanes, parked events, lane availability, claim/park mechanics, and awaitable command replies above low-level storage.
- `AgentWorker` owns long-lived inbox loop execution, runtime bootstrap readiness, and stop/shutdown sequencing. It delegates routing decisions to `AgentEventScheduler` and must not own the finite LLM/tool reasoning loop.
- `AgentTurn` owns active-turn execution bookkeeping, private execution promise/handle, tool input port, and settlement; `AgentTurnRunner` owns the finite per-turn reasoning loop and is the primary local try/catch boundary for `AgentInterruptionError`.
- `LlmPhase` owns one LLM phase: request assembly, compaction preparation, provider streaming, streaming parser integration, and phase-level interruption handling.
- `ToolPhase` owns one tool phase: invocation preprocessing, approval coordination through `TurnToolInputPort`, abortable execution, result collection, and tool-interrupted lifecycle publication.
- `AgentTurn` owns turn ID, active tool batch, `TurnToolInputPort`, `TurnExecutionScope`, active operation metadata, interrupted flag, private execution handle, public `startExecution`/`waitForSettlement` boundary, and settlement promise.
- `AgentRuntimeState` owns active-turn storage and identity routing only: start active turn, no-active/stale-turn classification, route approval/result to the active turn, and clear active turn by ID after settlement. It must not own pending approval maps, recent settled invocation IDs, port internals, runner task/promise state, or working-context rollback policy.
- `MemoryManager` owns raw trace retention, working-context state, compaction/snapshot interaction, and interrupted-turn memory finalization/projection. It must keep accepted/emitted/executed facts append-only and build the LLM-safe prompt context used by the next `LLMRequestAssembler` call.
- `AgentInputPipeline`, `ToolInvocationPipeline`, `ToolResultPipeline`, `LLMResponsePipeline`, and `SystemPromptPipeline` own typed handler orchestration.
- `AgentExternalEventNotifier` owns external observable-event publication above low-level `EventEmitter` / `EventManager` infrastructure.
- `BaseLLM` owns the stable cancellation-aware LLM invocation contract; provider adapters own SDK-specific signal mapping.
- `BaseTool` owns the stable cancellation-aware tool execution contract; concrete tools own transport/process-specific cancellation.
- `AgentTeamRuntime` owns team-level interrupt command; `TeamManager` owns propagation to currently managed member nodes.
- Server Autobyteus backends are thin adapters that must call native runtime control APIs and must not invent stop fallback semantics.

If a public facade exists, it is thin: `Agent` and `AgentTeam` expose commands but `AgentRuntime` and `AgentTeamRuntime` govern lifecycle/control policy.

## Thin Entry Facades / Public API Surfaces (If Applicable)

| Facade / Entry Surface | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `Agent.interrupt(...)` | `AgentRuntime.interrupt(...)` | Public native agent API matching `postUserMessage` / `stop`. | AbortController, queue cleanup, status policy. |
| `Agent.postToolExecutionApproval(...)` | `AgentRuntime.postToolApprovalEvent(...)` | Public native approval/denial API used by server, CLI, UI, and team member routing. | Pending-invocation validation beyond delegating to runtime. |
| `AgentTeam.interrupt(...)` | `AgentTeamRuntime.interrupt(...)` | Public native team API. | Member propagation policy beyond delegating to runtime. |
| `AutoByteusAgentRunBackend.interrupt(...)` | Native `Agent.interrupt(...)` | Server runtime-kind adapter. | Stop fallback or in-process runtime cleanup. |
| `AutoByteusAgentRunBackend.approveToolInvocation(...)` | Native `Agent.postToolExecutionApproval(...)` | Server runtime-kind approval adapter. | Direct TurnToolInputPort writes or old approval-event handler routing. |
| `AutoByteusTeamRunBackend.interrupt(...)` | Native `AgentTeam.interrupt(...)` | Server team backend adapter. | Stop fallback or team shutdown cleanup. |
| Frontend interrupt action/store method | Server `AgentRun.interrupt(...)` / `TeamRun.interrupt(...)` | User command transport. | Runtime semantics beyond issuing command and reflecting stream state. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `AutoByteusAgentRunBackend.interrupt()` calling `agent.stop()` | Incorrectly conflates interrupt with terminal shutdown. | `agent.interrupt()` / `AgentRuntime.interrupt()` | In This Change | No fallback to stop. If native agent lacks interrupt, return unsupported command failure. |
| `AutoByteusTeamRunBackend.interrupt()` calling `team.stop()` | Incorrectly terminates native team on interrupt. | `team.interrupt()` / `AgentTeamRuntime.interrupt()` | In This Change | No fallback to stop. |
| Queue/handler choreography for normal turn loop | It hides the finite agent loop across worker-dispatched handlers. | `AgentTurnRunner` + direct phase/pipeline services | In This Change | Old queue events may remain only as external-event/lifecycle/external boundary facts, not turn-control flow. |
| Treating `InboxQueueStore` as the semantic agent inbox | Queue storage should not own turn-starting eligibility or domain routing. | `AgentEventInbox` in `agent/event-inbox/agent-event-inbox.ts`, with queue manager as optional low-level storage. | In This Change | Prevents tool results/approvals from being mistaken for turn-starting inbox event entries. |
| Queue-only idea for interrupt | Normal queued work cannot preempt an active phase operation. | Side-band `AgentRuntime.interrupt()` -> active `TurnExecutionScope` | In This Change | Interrupt events can still be published through external-event/status. |
| Treating abort as LLM/tool error | Interrupted work is not a runtime error or tool failure. | `AgentInterruptionError` and interrupted lifecycle external events. | In This Change | Provider/tool abort exceptions must normalize to interruption. |
| Normal tool-continuation after interrupted tool batch | Would let an interrupted turn continue. | Turn-scoped `AgentTurn` / `TurnToolInputPort` close and expected-invocation fencing. | In This Change | Late results ignored. |
| Whole-turn working-context restore on normal interrupt | It erases accepted/emitted/executed facts from the next prompt and lets execution control own memory policy. | generic memory fact ingestion + LLM-safe working-context projection. | In This Change | Raw trace/event history remains append-only; only unsafe incomplete native tool-call protocol fragments are fenced or summarized. |
| Any remaining app-owned `STOP_GENERATION` protocol/store naming | It hides the domain distinction the task is fixing. | `INTERRUPT_GENERATION` / `interruptGeneration` names. | In This Change / Already Partly Done | Current ticket frontend/server code already uses `INTERRUPT_GENERATION`; final implementation should keep that shape and remove any leftover stop-generation code names if found. |

## Return Or Event Spine(s) (If Applicable)

Single-agent interrupted status/event return:

`AgentTurn settlement -> AgentExternalEventNotifier -> AgentEventStream -> AutoByteusStreamEventConverter -> AgentRunEventMessageMapper -> WebSocket ServerMessage -> frontend streaming handler -> context status/isSending update`

Tool interrupted event return:

`ToolPhase -> AgentExternalEventNotifier.notifyAgentToolExecutionInterrupted -> AgentEventStream -> server converter -> TOOL_EXECUTION_INTERRUPTED message -> frontend activity/tool lifecycle handler`

Inter-agent communication projection return:

`AgentInputPipeline.convertInterAgentEvent -> AgentExternalEventNotifier.notifyAgentDataInterAgentMessageReceived -> AgentEventStream -> AutoByteusStreamEventConverter -> AutoByteusTeamRunEventProcessor enriches metadata -> TeamCommunicationMessageProcessor derives TEAM_COMMUNICATION_MESSAGE -> AgentRunEventMessageMapper -> TeamStreamingService -> conversation inter_agent_message segment + teamCommunicationStore`

Team interrupted return:

`AgentTeamRuntime.interrupt -> AgentTeamExternalEventNotifier/team status -> AgentTeamEventStream -> team backend event mapping -> team WebSocket -> team context/member statuses`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `AgentTurnRunner`
  - Spine: `phase service operation -> TurnExecutionScope.runAbortable/iterateAbortable -> AgentInterruptionError -> AgentTurn interrupted settlement -> worker inbox loop continues monitoring/dispatching eligible event entries`
  - Why it matters: The worker remains serialized but does not own turn-local LLM/tool control flow.

- Parent owner: `AgentTurn`
  - Spine: `startActiveTurn -> create TurnToolInputPort/scope -> begin runner operation -> interrupt scope -> settle interrupted -> completed facts already ingested -> MemoryManager.projectWorkingContextForNextLlm -> resolve settlement -> clear active turn`
  - Why it matters: This is the turn-scoped state machine that keeps LLM/tool/approval interruption consistent.

- Parent owner: `ToolPhase`
  - Spine: `begin tool operation -> start tool promise with scope signal -> race promise with abort -> on abort publish interrupted and fence stale IDs -> ignore late promise`
  - Why it matters: Tool promises may not stop physically; runtime must still unblock and suppress late outcomes.

- Parent owner: `AgentTeamRuntime`
  - Spine: `interrupt requested -> resolve running cached nodes -> call node.interrupt() -> bounded wait -> team interrupted/idle status`
  - Why it matters: Team interrupt is a propagation loop, not shutdown cleanup.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Interruption error/result types | DS-001, DS-002, DS-003 | AgentRuntime / AgentTurnRunner / phase services | Stable interrupted outcome and error normalization. | Prevents abort exceptions being treated as provider/tool errors. | Each phase/provider invents incompatible abort checks. |
| Abortable operation utility | DS-002, DS-003, DS-006 | TurnExecutionScope / phase services | Race promises/async iterators against AbortSignal, close iterators, attach late rejection logging. | JS cannot preempt promises; abortable utilities give phase services a consistent pattern. | Worker or runtime would need unsafe parallel completion semantics. |
| Active-turn tool event predicate | DS-007, DS-009 | AgentEventScheduler / AgentRuntimeState / AgentTurn / TurnToolInputPort | Identify/drop/fence tool approval/result events belonging to interrupted turn while preserving parked AgentEventInbox event entries. Runtime state performs active-turn identity checks; `AgentTurn` owns pending-invocation and port-level fencing. | Prevents interrupted continuations. | Generic queue storage or runtime state becomes domain-aware of every turn-internal event shape. |
| LLM-safe working-context projection | DS-002, DS-003, DS-011 | MemoryManager / working-context projection | Retain accepted/emitted/executed facts and finalize LLM-safe working context with an operation-boundary note when needed while fencing incomplete protocol. | Avoids both forgotten history and invalid partial tool-call protocol. | AgentTurnRunner or AgentTurn would own memory rollback/projection policy. |
| Provider signal mapping | DS-002 | BaseLLM/provider adapters | Translate generic signal to OpenAI/Anthropic/Gemini/Ollama/etc SDK capabilities. | Keeps provider details below BaseLLM boundary. | LlmPhase would depend on provider internals. |
| Tool signal mapping | DS-003 | BaseTool/concrete tools | Translate generic signal to terminal/MCP/local tool behavior. | Keeps process/transport cancellation below tool boundary. | ToolPhase would know terminal/MCP internals. |
| Frontend status visualization | DS-005 | UI stores/components | Display interrupting/interrupted and clear sending state. | User-visible correctness. | Runtime would leak UI-specific semantics. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Runtime command boundary | `agent/runtime` | Extend | Runtime already owns start/stop/status command surface. | N/A |
| Active turn state | `agent/agent-turn.ts` + `agent/context/agent-runtime-state.ts` | Extend | `AgentTurn` should own turn internals and private execution; `AgentRuntimeState` should own only the `activeTurn` reference, creation, identity routing, and clear-by-turn-ID. | N/A |
| Runtime event inbox boundary | `InboxQueueStore` low-level queues | Create semantic boundary under `agent/event-inbox` | Typed lanes, parking, and awaitable active-turn commands need a semantic owner above queue storage; dispatchability belongs to `AgentEventScheduler`. | Leaving this only as event queue storage makes the worker/queue look like the domain inbox and obscures event semantics. |
| Finite agent loop runner | Currently implicit in `AgentWorker` + queued handlers | Create/Extract under `agent/loop` | The per-turn LLM/tool continuation loop needs a finite owner that can be interrupted independently from the long-lived worker. | Keeping this implicit in AgentWorker preserves the stop/interrupt ambiguity. |
| Processor pipeline orchestration | Currently duplicated across handlers/bootstrap steps | Create under `agent/pipelines` | Ordered processor execution, type validation, and error policy should be consistent but domain-typed. | Existing processor folders define processors, not shared orchestration. |
| LLM-safe working-context projection | Existing `MemoryManager`, raw trace store, `WorkingContextSnapshot`, compaction/snapshot support | Extend memory subsystem | Memory already owns future LLM context and history; interrupted finalization is a memory projection policy, not a turn execution concern. | N/A |
| External observable-event boundary | Existing `AgentExternalEventNotifier` already has semantic `notify...` methods; first-stage `AgentOutbox` wrapper duplicates it. | Extend `agent/events/notifiers.ts`; remove `agent/outbox`. | Phase services and input/lifecycle pipelines need one outbound publication boundary for assistant output, streaming, tool lifecycle, inter-agent/system-task communication facts, turn/runtime lifecycle, and errors. | `EventEmitter` / `EventManager` are low-level infrastructure; `AgentExternalEventNotifier` is the domain boundary. |
| Input processing pipeline | Currently embedded in `UserInputMessageEventHandler` | Extract under `agent/pipelines` | External user input and tool continuation must use identical input processor and multimodal conversion behavior. | Leaving it only in an event handler would force the runner either to enqueue local events or bypass behavior. |
| Tool invocation/result/response pipelines | Currently embedded in `ToolInvocationExecutionEventHandler`, `ToolResultEventHandler`, `LLMCompleteResponseReceivedEventHandler` | Extract under `agent/pipelines` | Runner needs explicit typed pipelines for each phase while preserving current processor behavior. | Keeping these only in handlers preserves fragmented control flow. |
| System prompt pipeline | Currently embedded in `SystemPromptProcessingStep` | Extract under `agent/pipelines` | Bootstrap should use the same typed pipeline concept for system prompt processors. | Keeping system prompt processing as one-off code preserves processor orchestration duplication. |
| Tool result continuation builder | Currently embedded in `ToolResultEventHandler.dispatchResultsToInputPipeline` | Extract under `agent/loop` or `agent/pipelines` turn-local support | Tool result aggregation must be reused by runner without bypassing current message shape. | Keeping it private inside the handler ties domain behavior to queue routing. |
| Cancellation helper/types | None | Create New under `agent/interruption` | Reused by LLM/tool/user-input/compaction handling and tests. | Existing runtime/status files should not accumulate utility policy. |
| LLM invocation abstraction | `llm/base.ts` + provider adapters | Extend | BaseLLM is authoritative boundary above providers. | N/A |
| Tool execution abstraction | `tools/base-tool.ts` + concrete tools | Extend | BaseTool is authoritative boundary above tools. | N/A |
| Terminal foreground process lifecycle | `tools/terminal` | Extend | Existing sessions can close/kill; manager needs signal-aware execution. | N/A |
| MCP remote tool adapter | `tools/mcp` | Extend | Existing MCP proxy/server call path owns remote tool calls. | N/A |
| Server command adapter | `agent-execution/backends/autobyteus` | Extend | Backend already adapts shared `AgentRunBackend.interrupt`. | N/A |
| Server approval command path | `AgentRunBackend.approveToolInvocation` + native `Agent.postToolExecutionApproval` | Extend/Reshape | Existing public/server route exists and should be preserved as the public boundary, but final routing must post through `AgentRuntime.postToolApprovalEvent` into `AgentEventInbox`, then through scheduler/handler validation into `TurnToolInputPort` instead of queued approval handlers. | N/A |
| Team propagation | `agent-team/runtime` + `TeamManager` | Extend | Team runtime owns team commands; TeamManager knows managed nodes. | N/A |
| UI streaming protocol | `services/agentStreaming` | Extend/Rename | Existing channel already sends current-generation command and status messages. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent runtime control | start/stop/interrupt, active turn command, status projection | DS-001, DS-006 | AgentRuntime | Extend | Stop remains terminal. |
| Agent turn lifecycle/interruption | private execution handle, AbortSignal, active operation, interrupted settlement, and tool-port fencing | DS-001, DS-002, DS-003, DS-006, DS-007 | AgentTurn | Extend | `AgentTurn` is the aggregate root; memory projection is owned by `MemoryManager`; `AgentRuntimeState` is only the active-turn selector and identity router. |
| Agent turn loop execution | finite per-trigger LLM/tool loop, continuation, runner-level interruption catch/outcome production | DS-001, DS-002, DS-003, DS-006, DS-007 | AgentTurnRunner | Create/Extract | Separates finite agent loop algorithm from long-lived AgentWorker mailbox and from active-turn execution-handle storage. |
| Agent event inbox | unified typed inbound lanes, parked external events, active-turn command events, lifecycle events | CDF-002, CDF-009, CDF-012, DS-006, DS-007, DS-008, DS-009 | AgentEventInbox / AgentEventScheduler | Reshape current AgentMessageInbox | One semantic inbox with lanes; scheduler owns dispatchability; active-turn events cannot start turns. |
| Tool approval routing | public/native/server approval command as awaitable inbox event entry, scheduler/handler validation, active-turn identity routing, turn-owned pending-invocation validation, turn tool input port delivery | CDF-009 | AgentRuntime / AgentEventInbox / AgentEventScheduler / ToolApprovalInboxEventHandler / AgentRuntimeState / AgentTurn / TurnToolInputPort | Extend/Create explicit route | Completes approval path without old approval event handler routing or runtime-state ownership of turn internals. |
| External/async tool result routing | external result as active-turn inbox event, scheduler/handler validation, active-turn identity routing, turn-owned pending-invocation validation, turn tool input port delivery, then normal continuation | CDF-012, CDF-007 | AgentEventInbox / AgentEventScheduler / ToolResultInboxEventHandler / AgentRuntimeState / AgentTurn / TurnToolInputPort / ToolPhase | Create explicit route when externalized tool execution exists | Prevents tool results from starting turns, bypassing tool-result/input pipelines, or writing directly to turn-port internals. |
| Processor pipeline orchestration | typed ordered processor execution and shared error/logging policy | DS-001, DS-002, DS-003 | ProcessorPipelineRunner + domain pipelines | Create/Extract | Provides consistency without making one untyped generic processor abstraction. |
| Agent memory / working-context projection | raw trace retention, working-context messages, operation-boundary note when needed, LLM-safe projection after interrupt, compaction/snapshot consistency | CDF-013, DS-011 | MemoryManager / WorkingContextSnapshot | Extend | Interrupt is execution settlement, not memory erasure; `MemoryManager` must retain history while fencing invalid partial provider protocol. |
| Agent input pipeline | input processors, sender-type handling, multimodal LLM user message construction | DS-001, DS-002, DS-003 | AgentInputPipeline | Create/Extract | Preserves current UserInputMessageEventHandler behavior for both external and tool-continuation input. |
| Tool invocation pipeline | tool invocation preprocessors and approval preparation | DS-003 | ToolInvocationPipeline | Create/Extract | Keeps tool-call preparation outside worker and reusable by runner. |
| Tool result pipeline | tool execution result processors and memory ingest | DS-003, DS-007 | ToolResultPipeline | Create/Extract | Preserves result processor behavior before continuation building. |
| LLM response/output pipeline | LLM response processors and final assistant output emission | DS-002, DS-005 | LLMResponsePipeline / output pipeline | Create/Extract | Supports existing llmResponseProcessors and future output processors behind one phase boundary. |
| System prompt pipeline | system prompt processor ordering and LLM system prompt configuration | CDF-001 | SystemPromptPipeline | Create/Extract | Keeps bootstrap aligned with processor-pipeline architecture. |
| Tool continuation construction | aggregate tool results into SenderType.TOOL AgentInputUserMessage with media context | DS-003, DS-007 | ToolResultContinuationBuilder | Create/Extract | Preserves current tool-result-as-user-input contract while letting runner own local continuation. |
| Agent interruption support | error/result/options types and abortable operation utilities | DS-001, DS-002, DS-003, DS-006 | AgentRuntime / AgentTurn / TurnExecutionScope / phase services | Create New | Small concrete folder under `agent/interruption`. |
| LLM invocation | signal-aware send/stream and provider mapping | DS-002 | BaseLLM | Extend | Use separate invocation options from provider kwargs. |
| Tool execution | signal-aware execute and interrupted lifecycle | DS-003 | BaseTool / ToolPhase | Extend | Built-in terminal/MCP get concrete support first. |
| Agent external event notifier | outbound assistant/tool/segment/lifecycle/error/artifact/inter-agent/system-task observable facts | DS-005, DS-010, CDF-010, CDF-010A | AgentExternalEventNotifier | Extend | Existing canonical publication boundary above `EventEmitter` / `EventManager`; remove duplicate `AgentOutbox` while preserving consumer-visible event families. |
| Runtime streaming events | interrupting/interrupted status and tool/turn interruption events | DS-005 | Notifier / stream pipeline | Extend | Single-agent and team event streams. |
| Native team runtime control | team interrupt propagation to members | DS-004 | AgentTeamRuntime / TeamManager | Extend | Do not reuse shutdown steps. |
| Server backend adapters | map domain interrupt to native interrupt APIs | DS-001, DS-004 | AgentRunBackend / TeamRunBackend | Extend | Remove stop fallback. |
| Frontend protocol/store/status | send interrupt command and reflect interrupted lifecycle | DS-005 | AgentStreamingService / stores | Extend/Verify | Current ticket code already sends `INTERRUPT_GENERATION`; preserve this path and verify stream feedback clears `isSending`. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/interruption/agent-interruption.ts` | Agent interruption support | Runtime interruption model | `AgentInterruptOptions`, `AgentInterruptResult`, `AgentInterruptionError`, `isAgentInterruptionError`, reason normalization. | One semantic model for interrupted outcome. | N/A |
| `autobyteus-ts/src/agent/interruption/turn-execution-scope.ts` | Agent interruption support | TurnExecutionScope | Per-turn cancellation scope: signal owner, abort listener registry, operation runner, late-result fencing hooks. | Architectural container for interruptible turn execution. | `AgentInterruptionError`, abortable helpers |
| `autobyteus-ts/src/agent/interruption/abortable-operation.ts` | Agent interruption support | Abortable operation utility | Abort-aware promise and async-iterator utilities plus late-promise handling used by the turn execution scope. | Operational utility separate from domain types. | `AgentInterruptionError` |
| `autobyteus-ts/src/agent/agent-turn.ts` | Agent turn lifecycle | AgentTurn | Turn ID, private execution promise/handle, `startExecution(...)`, `waitForSettlement(...)`, signal/scope, interrupted flag, active operation, idempotent settlement, tool input port, tool batch. It must not own a working-context checkpoint/restore policy. | Existing turn owner becomes the aggregate root for active-turn internals only. | `AgentInterruptOptions`, `AgentTurnRunner`, `TurnOutcome` |
| `autobyteus-ts/src/memory/memory-manager.ts` | Agent memory / working-context projection | MemoryManager | Raw trace retention, working-context updates, snapshots/compaction integration, and `appendRawTrace(...)` plus `projectWorkingContextForNextLlm(...)` or equivalent memory-native projection API. | Existing memory owner already feeds LLM context; interrupted history retention belongs here. | WorkingContextSnapshot, raw trace models |
| `autobyteus-ts/src/memory/working-context-llm-safe-projector.ts` (optional) | Agent memory / working-context projection | Working-context LLM-safe projector | Small extracted projection helper if `projectWorkingContextForNextLlm(...)` would otherwise mix LLM-safe message construction into the broader manager. | Optional owned helper under memory, not under agent loop. | WorkingContextSnapshot |
| `autobyteus-ts/src/agent/event-inbox/agent-event-inbox.ts` | Agent event inbox | AgentEventInbox | Typed inbound lanes, `post`, `postAwaitable`, lane availability, candidate peek, claim, parking, and awaitable reply resolution above low-level storage. | Makes one agent inbox first-class while keeping dispatch policy outside storage. | `AgentEventInboxEntry`, `InboxEventHandlerResult` |
| `autobyteus-ts/src/agent/event-inbox/inbox-queue-store.ts` | Agent event inbox | InboxQueueStore | Low-level async queue/availability storage. | Replaces architecture-facing queue-manager naming with private storage. | N/A |
| `autobyteus-ts/src/agent/event-inbox/agent-event-scheduler.ts` | Agent event scheduling | AgentEventScheduler | Dispatchability and handler selection by event class/lane and runtime/turn state. | Keeps routing policy out of worker and storage. | AgentEventSchedulerHandlers |
| `autobyteus-ts/src/agent/event-inbox/handlers/*.ts` | Agent inbox event handlers | Typed InboxEventHandlers | Turn-start, tool-approval, tool-result, and lifecycle entry handlers. | Handlers delegate to domain owners/pipelines without recreating phase choreography. | AgentEventInboxEntry types |
| `autobyteus-ts/src/agent/loop/agent-turn-runner.ts` | Agent turn loop execution | AgentTurnRunner | Finite reasoning algorithm around input -> LLM -> tools -> continuation -> completed/interrupted outcome. | New owner for the per-turn algorithm formerly implicit in worker queue choreography; execution handle remains private to `AgentTurn`. | `AgentTurn`, `TurnExecutionScope` |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | Agent turn loop execution | LlmPhase | Request assembly, context/compaction preparation, signal-aware provider streaming, stream parsing, interrupted segment finalization, and final/tool outcome return. | One phase service owns LLM-phase behavior under the runner. | `LLMInvocationOptions`, `TurnExecutionScope`, `AgentExternalEventNotifier` |
| `autobyteus-ts/src/agent/loop/tool-phase.ts` | Agent turn loop execution | ToolPhase | Tool invocation preprocessing, approval coordination, signal-aware tool execution, ordered result collection, tool interruption lifecycle, and stale-result fencing. | One phase service owns tool-phase behavior under the runner. | `ToolExecutionOptions`, `TurnToolInputPort`, `AgentExternalEventNotifier` |
| `autobyteus-ts/src/agent/loop/turn-tool-input-port.ts` | Agent turn loop execution | TurnToolInputPort | Internal per-turn wait/post port for validated tool approvals and future async tool results keyed by turn/invocation identity. | Keeps turn-scoped tool input delivery private to the active turn while all inbound events enter AgentEventInbox. | `AgentTurn`, `TurnExecutionScope` |
| `autobyteus-ts/src/agent/pipelines/processor-pipeline-runner.ts` | Processor pipeline orchestration | ProcessorPipelineRunner | Shared ordered processor execution helper with domain-specific error policies supplied by callers. | Avoids duplicated sorting/validation while keeping typed domain pipelines. | Existing processor interfaces |
| `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts` | Agent input pipeline | AgentInputPipeline | Apply input processors, preserve sender-type/turn rules, build LLM user message data. | Moves current input transformation into a direct runner-callable pipeline. | `AgentInputUserMessage`, LLM input data |
| `autobyteus-ts/src/agent/pipelines/tool-invocation-pipeline.ts` | Tool invocation pipeline | ToolInvocationPipeline | Apply tool invocation preprocessors and produce execution-ready invocation. | Makes pre-execution processing reusable by `ToolPhase`. | ToolInvocation preprocessors |
| `autobyteus-ts/src/agent/pipelines/tool-result-pipeline.ts` | Tool result pipeline | ToolResultPipeline | Apply tool execution result processors and memory-ingest side effects. | Makes post-tool processing reusable before continuation building. | Tool result processors |
| `autobyteus-ts/src/agent/pipelines/llm-response-pipeline.ts` | LLM response/output pipeline | LLMResponsePipeline | Apply LLM response processors/output processors and decide final assistant emission. | Keeps final-response processing explicit after `LlmPhase`. | LLM response processors |
| `autobyteus-ts/src/agent/pipelines/system-prompt-pipeline.ts` | System prompt pipeline | SystemPromptPipeline | Apply system prompt processors and return processed system prompt. | Extracts current system-prompt processor loop into lifecycle pipeline architecture. | System prompt processors |
| `autobyteus-ts/src/agent/loop/tool-result-continuation-builder.ts` | Tool continuation construction | ToolResultContinuationBuilder | Aggregate ordered tool results into SenderType.TOOL AgentInputUserMessage with ContextFiles. | Preserves current tool-continuation message contract outside queue routing. | Tool result data, `AgentInputUserMessage` |
| `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | Runtime active-turn selector | AgentRuntimeState | Own only `activeTurn: AgentTurn | null`, create active turn, route tool approval/result events by active-turn identity, and clear active turn by ID after `turn.waitForSettlement()`. | Keeps runtime state from owning the turn's private execution handle or tool-port internals. | `AgentTurn`, `ToolExecutionApprovalEvent`, `ToolResultEvent` |
| `autobyteus-ts/src/agent/event-inbox/inbox-queue-store.ts` | Agent event inbox | InboxQueueStore | Generic async queue/availability storage behind `AgentEventInbox`. | Storage owns mechanics only; inbox/scheduler own domain identity. | N/A |
| `autobyteus-ts/src/agent/events/notifiers.ts` | Agent external event notifier | AgentExternalEventNotifier | Semantic external observable-event methods for assistant output, segments, tool lifecycle, inter-agent/system-task notifications, turn/runtime lifecycle, errors, artifacts, and interruption outcomes. | Existing outbound boundary; extend here instead of adding `agent/outbox` or another publisher wrapper; preserve `notifyAgentDataInterAgentMessageReceived` and `notifyAgentDataSystemTaskNotificationReceived`. | Low-level turn control or inbox scheduling. |
| `autobyteus-ts/src/agent/events/agent-events.ts` | Runtime events | Event model | `AgentInterruptRequestedEvent`, `AgentTurnInterruptedEvent`. | Existing event definitions file for observable lifecycle facts. | Interruption types |
| `autobyteus-ts/src/agent/status/status-enum.ts` / `status-deriver.ts` / `status-update-utils.ts` | Runtime status | Status deriver | Add interrupting state and interrupted transition metadata. | Existing status owners. | New events |
| `autobyteus-ts/src/agent/streaming/handlers/streaming-response-handler.ts` and implementations | Streaming segments | Streaming response handler | Add `interrupt(reason)` finalization path for open segments. | Existing streaming segment owner; not a turn-control owner. | Interruption metadata |
| `autobyteus-ts/src/llm/base.ts` | LLM invocation | BaseLLM | Add `LLMInvocationOptions` and pass to provider methods. | Existing authoritative LLM boundary. | AbortSignal |
| `autobyteus-ts/src/tools/base-tool.ts` | Tool execution | BaseTool | Add `ToolExecutionOptions` with signal/turn/invocation metadata. | Existing authoritative tool boundary. | AbortSignal |
| `autobyteus-ts/src/tools/terminal/terminal-session-manager.ts` | Terminal tool | Terminal manager | Signal-aware foreground command execution and close-on-abort. | Existing foreground command owner. | AbortSignal |
| `autobyteus-ts/src/tools/mcp/*` | MCP tool | MCP proxy/server | Signal-aware or locally abandoned remote call. | Existing remote tool owner. | ToolExecutionOptions |
| `autobyteus-ts/src/agent-team/runtime/agent-team-runtime.ts`, `agent-team.ts`, `context/team-manager.ts` | Team runtime control | AgentTeamRuntime / TeamManager | Team interrupt API and member propagation. | Existing team command/member owners. | Agent interrupt API |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts` | Server backend | AutoByteusAgentRunBackend | Call native `agent.interrupt` for interrupt and `agent.postToolExecutionApproval` for approvals, mapping native results to `AgentOperationResult`. | Existing adapter owner. | AgentInterruptResult, PostToolApprovalResult |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts` | Server team backend | AutoByteusTeamRunBackend | Call native `team.interrupt`. | Existing adapter owner. | AgentOperationResult |
| `autobyteus-web/services/agentStreaming/*`, `stores/*`, `types/agent/AgentStatus.ts` | Frontend protocol/status | Streaming services/stores | Rename/send interrupt command and display status/events. | Existing UI streaming boundary. | Server messages |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Interrupt options/result/error shape | `agent/interruption/agent-interruption.ts` | Agent interruption support | Used by AgentRuntime, AgentTurnRunner, phase services, server adapters, tests. | Yes | Yes | Generic cancellation kitchen sink for unrelated subsystems. |
| Promise/async-iterator abort racing | `agent/interruption/abortable-operation.ts` | Agent interruption support | LLM stream and tool execution need same late-result-safe pattern. | Yes | Yes | Provider-specific cancellation adapter. |
| Tool execution options | `tools/base-tool.ts` export | Tool execution | Concrete tools need same signal/turn/invocation metadata. | Yes | Yes | Generic runtime context replacement. |
| LLM invocation options | `llm/base.ts` export or `llm/invocation-options.ts` | LLM invocation | Provider adapters need signal without polluting request kwargs. | Yes | Yes | Provider params object. |
| Turn interruption stream payload | `agent/streaming/events/stream-event-payload-lifecycle.ts` | Runtime streaming events | Server and frontend need stable payload. | Yes | Yes | General-purpose status payload. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentInterruptOptions` | Yes | Yes | Low | Fields: `turnId?`, `reason?`, `requestedBy?`, `timeoutMs?`; no stop/terminate fields. |
| `AgentInterruptResult` | Yes | Yes | Low | Fields distinguish accepted/no-active/already-interrupted/settled. Do not duplicate `AgentOperationResult`; server maps it. |
| `AgentInterruptionError` | Yes | Yes | Low | Carries `turnId`, `reason`, optional `operation`; not provider/tool error details. |
| `ToolExecutionOptions` | Yes | Yes | Low | Only execution metadata: `signal`, `turnId`, `invocationId`, `toolName`. |
| `LLMInvocationOptions` | Yes | Yes | Low | Only invocation control metadata: `signal`, `turnId`; provider params remain in `kwargs`. |
| `TurnInterruptionData` stream payload | Yes | Yes | Low | One event payload for turn interrupted. Status payload remains status-only plus metadata. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/interruption/agent-interruption.ts` | Agent interruption support | Runtime interruption model | Define interruption options/result/error and guards. | Semantic model only. | N/A |
| `autobyteus-ts/src/agent/interruption/turn-execution-scope.ts` | Agent interruption support | TurnExecutionScope | Per-turn interruptible execution container, operation runner, abort listener registry, and late-result fencing hooks. | Architectural cancellation boundary, not provider/tool adapter code. | `AgentInterruptionError`, abortable helper |
| `autobyteus-ts/src/agent/interruption/abortable-operation.ts` | Agent interruption support | Abortable operation utility | Abort-aware promise/iterator helpers and late-result logging used by scope/phase services. | Operational helper only. | `AgentInterruptionError` |
| `autobyteus-ts/src/agent/interruption/index.ts` | Agent interruption support | Public exports | Export interruption support. | Keeps import paths stable. | N/A |
| `autobyteus-ts/src/agent/agent-turn.ts` | Agent turn lifecycle | AgentTurn | Own the turn execution scope, private execution promise/handle, interrupted state, active operation, tool input port, idempotent settlement promise, and batch state. It does not own memory rollback or working-context projection. | Existing turn owner becomes the aggregate root; runtime state stores only the active turn reference. | Interruption types, TurnOutcome |
| `autobyteus-ts/src/memory/memory-manager.ts` | Agent memory / working-context projection | MemoryManager | Own generic raw trace/fact ingestion, LLM-safe working-context projection, optional operation-boundary notes, and removal of normal-interrupt pre-turn restore. | Existing memory owner is the future-prompt source used by `LLMRequestAssembler`; interrupt memory behavior belongs here. | WorkingContextSnapshot, raw trace models |
| `autobyteus-ts/src/memory/working-context-llm-safe-projector.ts` (optional) | Agent memory / working-context projection | Interrupted-turn projector | Encapsulate LLM-safe conversion of partial/interrupted turn facts into prompt messages if the logic grows beyond one manager method. | Keeps projection logic memory-owned and testable. | WorkingContextSnapshot |
| `autobyteus-ts/src/agent/event-inbox/agent-event-inbox.ts` | Agent event inbox | AgentEventInbox | Own typed inbound lanes, parked events, lane availability, candidate peek/claim, and awaitable active-turn commands. | Makes inbox semantics explicit above queue storage while scheduler owns dispatch policy. | AgentEventInboxEntry, InboxEventHandlerResult |
| `autobyteus-ts/src/agent/event-inbox/inbox-queue-store.ts` | Agent event inbox | InboxQueueStore | Private async queue/availability storage for inbox lanes. | Low-level storage only. | N/A |
| `autobyteus-ts/src/agent/event-inbox/agent-event-scheduler.ts` | Agent event scheduling | AgentEventScheduler | Select dispatchable inbox event entries and dispatch typed handlers by event class/lane/state. | Makes scheduling an explicit owner. | AgentEventSchedulerHandlers |
| `autobyteus-ts/src/agent/event-inbox/handlers/*.ts` | Agent inbox event handlers | Typed InboxEventHandlers | Turn-start, approval, result, and lifecycle event-entry processing. | Keeps inbound handling separate from LLM/tool phases. | AgentEventInboxEntry types |
| `autobyteus-ts/src/agent/loop/agent-turn-runner.ts` | Agent turn loop execution | AgentTurnRunner | Run one finite agent loop from trigger input through LLM/tool cycles and return completed/interrupted outcome. | Separates turn algorithm from long-lived worker mailbox; execution handle/settlement remains inside `AgentTurn`. | AgentTurn, TurnExecutionScope |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | Agent turn loop execution | LlmPhase | Run one LLM phase: request assembly, context preparation, provider streaming through scope, streaming parser integration, response/tool outcome production, interrupted finalization. | Makes the LLM phase a direct runner-owned service instead of a queued handler. | LLMInvocationOptions, AgentExternalEventNotifier |
| `autobyteus-ts/src/agent/loop/tool-phase.ts` | Agent turn loop execution | ToolPhase | Run one tool phase: invocation preprocessing, approval request/wait, signal-aware execution, result collection, interrupted lifecycle, stale-result fencing. | Makes the tool phase a direct runner-owned service instead of queued request/execution/result handlers. | ToolExecutionOptions, TurnToolInputPort, AgentExternalEventNotifier |
| `autobyteus-ts/src/agent/loop/turn-tool-input-port.ts` | Agent turn loop execution | TurnToolInputPort | Wait/post/fence tool approvals and future async tool result events. | Internal turn-scoped tool input primitive, not a public inbox. | AgentTurn, invocation IDs |
| `autobyteus-ts/src/agent/pipelines/processor-pipeline-runner.ts` | Processor pipeline orchestration | ProcessorPipelineRunner | Shared helper for ordered processor execution, with typed domain pipelines choosing contracts and error behavior. | Reduces duplicated processor loops without erasing domain differences. | Existing processor interfaces |
| `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts` | Agent input pipeline | AgentInputPipeline | Shared processing of external and TOOL-continuation input into LLM-ready input data. | Prevents runner extraction from bypassing input processors. | AgentInputUserMessage, input processors |
| `autobyteus-ts/src/agent/pipelines/tool-invocation-pipeline.ts` | Tool invocation pipeline | ToolInvocationPipeline | Shared tool invocation preprocessor pipeline for `ToolPhase`. | Keeps invocation preparation out of worker and tool execution mechanics. | ToolInvocation preprocessors |
| `autobyteus-ts/src/agent/pipelines/tool-result-pipeline.ts` | Tool result pipeline | ToolResultPipeline | Shared tool result processor pipeline for `ToolPhase` before continuation building. | Keeps result processing explicit before continuation building. | Tool result processors |
| `autobyteus-ts/src/agent/pipelines/llm-response-pipeline.ts` | LLM response/output pipeline | LLMResponsePipeline | Shared LLM response/output processor pipeline and assistant-complete emission decision. | Supports existing response processors and future output processors. | LLM response processors |
| `autobyteus-ts/src/agent/pipelines/system-prompt-pipeline.ts` | System prompt pipeline | SystemPromptPipeline | Shared system prompt processor pipeline used by bootstrap. | Aligns bootstrap processors with pipeline architecture. | System prompt processors |
| `autobyteus-ts/src/agent/loop/tool-result-continuation-builder.ts` | Tool continuation construction | ToolResultContinuationBuilder | Build the same SenderType.TOOL continuation message currently produced from completed tool results. | Preserves tool-result-as-user-input semantics outside queue routing. | Tool result data, ContextFile |
| `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | Runtime active-turn selector | AgentRuntimeState | Active-turn reference, creation, active-turn identity routing for approval/result events, and clear-by-turn-ID after settlement. | Existing state owner narrowed to avoid `activeTurnTask` / `activeRunner` peer state or turn-internal cleanup. | AgentTurn, ToolExecutionApprovalEvent |
| `autobyteus-ts/src/agent/event-inbox/inbox-queue-store.ts` | Agent event inbox | InboxQueueStore | Generic queue filtering/clearing primitives behind inbox APIs. | Queue storage owner; no phase ownership and no message eligibility ownership. | Predicate from inbox/scheduler |
| `autobyteus-ts/src/agent/events/agent-events.ts` | Event model | Agent runtime events | Add interrupt requested/turn interrupted observable events. | Existing event definitions. | Interruption types |
| `autobyteus-ts/src/agent/status/status-enum.ts` | Status model | AgentStatus | Add `INTERRUPTING`; update processing helper. | Existing status enum. | N/A |
| `autobyteus-ts/src/agent/status/status-deriver.ts` | Status model | AgentStatusDeriver | Map interrupt requested -> interrupting, turn interrupted -> idle. | Existing status reducer. | New events |
| `autobyteus-ts/src/agent/runtime/agent-runtime.ts` | Runtime control | AgentRuntime | Public `interrupt()`, active-turn approval input (`postToolApprovalEvent`), out-of-band signal, bounded settlement wait. | Existing runtime command owner. | Interruption result, PostToolApprovalResult |
| `autobyteus-ts/src/agent/agent.ts` | Public facade | Agent | Delegate `interrupt()` and `postToolExecutionApproval(...)` to runtime. | Thin facade. | Interruption result, PostToolApprovalResult |
| `autobyteus-ts/src/agent/events/notifiers.ts` | Agent external event notifier | AgentExternalEventNotifier | External observable-event publication methods above `EventEmitter` / `EventManager`, including inter-agent and system-task notification methods required by frontend/team communication consumers. | Existing owner for outbound domain events; no `AgentOutbox` wrapper. | Low-level turn control or inbox scheduling. |
| `autobyteus-ts/src/agent/streaming/*` and `events/event-types.ts` | Runtime streaming | Streaming/event pipeline | Turn/tool interrupted event types, payloads, and interrupted segment finalization. | Existing streaming surface; observation only. | TurnInterruptionData |
| `autobyteus-ts/src/llm/base.ts` or `llm/invocation-options.ts` | LLM invocation | BaseLLM | Add signal-aware invocation options. | Existing LLM boundary. | AbortSignal |
| Provider files under `autobyteus-ts/src/llm/api/` | LLM provider adapters | Provider classes | Map/catch abort for each SDK. | Each provider owns its transport. | LLMInvocationOptions |
| `autobyteus-ts/src/tools/base-tool.ts` | Tool execution | BaseTool | Add signal-aware tool options. | Existing tool boundary. | ToolExecutionOptions |
| `autobyteus-ts/src/tools/terminal/*` | Terminal tool | Terminal manager/session | Close/kill foreground sessions on signal. | Existing process lifecycle owner. | ToolExecutionOptions |
| `autobyteus-ts/src/tools/mcp/*` | MCP tool | MCP proxy/server | Pass signal where supported; local abandon otherwise. | Existing MCP owner. | ToolExecutionOptions |
| `autobyteus-ts/src/agent-team/*` | Team runtime control | AgentTeamRuntime / TeamManager | Native team interrupt API, status, propagation. | Existing team owners. | Agent interrupt API |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts` | Server native adapter | AutoByteusAgentRunBackend | Call `agent.interrupt` for interrupt and `agent.postToolExecutionApproval` for approvals, map results. | Existing adapter. | AgentOperationResult |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts` | Server team adapter | AutoByteusTeamRunBackend | Call `team.interrupt`, map result. | Existing adapter. | AgentOperationResult |
| `autobyteus-server-ts/src/services/agent-streaming/*` | WebSocket command | Stream command models | Rename command handling to interrupt generation. | Existing transport owner. | ServerMessageType updates |
| `autobyteus-web/services/agentStreaming/*`, `stores/*`, `types/agent/AgentStatus.ts`, status visuals | Frontend | Streaming services/stores | Send interrupt command and render interrupting/interrupted. | Existing UI owners. | Protocol types |

## Ownership Boundaries

- Upstream callers must use `Agent.interrupt()` / `AgentRuntime.interrupt()` for native agent interruption. They must not reach into `AgentRuntimeState.activeTurn.signal`, `AgentTurn.executionScope.signal`, or any private execution promise/runner handle directly.
- `AgentRuntimeState` must expose only `activeTurn: AgentTurn | null` plus narrow creation/routing/clear methods. It must not expose or store `activeTurnTask`, `activeRunner`, or `activeTurnExecutionHandle` as sibling state, and it must not restore working context for normal turn interruption.
- `MemoryManager` is the authoritative boundary for raw history and working-context projection. `AgentTurn`, `AgentTurnRunner`, and `AgentRuntimeState` must report turn outcomes/facts to memory-owned APIs rather than holding/restoring memory checkpoints themselves.
- `AgentTurnRunner` owns turn-local LLM/tool/continuation decisions. It calls `AgentInputPipeline`, `LlmPhase`, `ToolPhase`, `ToolResultPipeline`, `ToolResultContinuationBuilder`, and `LLMResponsePipeline` directly.
- `LlmPhase` and `ToolPhase` may use the active turn execution scope and interruption helpers. They do not own global interruption policy or runtime lifecycle.
- LLM provider adapters own SDK-specific abort mapping. Runtime, runner, and phase services must not branch on provider class names.
- Concrete tools own process/transport-specific cancellation. `ToolPhase` must not know how to kill terminal sessions or cancel MCP calls beyond invoking the `BaseTool` cancellation-aware boundary.
- `WorkerEventDispatcher` and old turn-advancing event handlers are not normal turn-control owners. Any remaining event/listener code is restricted to external input boundaries, lifecycle observation, public event surfaces, or external event delivery.
- Server Autobyteus backends must use the native public facade. They must not call runtime internals or stop as a substitute.
- Team interrupt propagation is owned by `AgentTeamRuntime`/`TeamManager`, not by server team backend.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentRuntime.interrupt()` | Active `AgentTurn` aggregate, turn execution scope, status events, settlement wait | `Agent`, server Autobyteus backend, tests | Backend calling `agent.stop()`, mutating active turn directly, or reaching for a runner task | Add result/options to `interrupt()`. |
| `AgentTurn` aggregate | Private execution promise/handle, `TurnExecutionScope`, `TurnToolInputPort`, tool batches, settlement state | `AgentRuntime`, `TurnStartInboxEventHandler`, `ToolPhase`, runtime tests | `AgentRuntimeState.activeTurnTask`, `AgentRuntimeState.activeRunner`, worker/scheduler storing runner promise as peer state, or direct writes to turn port internals | Add `startExecution(...)`, `interrupt(...)`, `waitForSettlement(...)`, and narrow turn event-posting methods on `AgentTurn`. |
| `MemoryManager` / working-context projection | Raw trace store, working-context messages, operation-boundary note when needed/projection, compaction/snapshot consistency | `AgentTurnRunner`, `LlmPhase`, `ToolPhase`, `LLMRequestAssembler`, tests | `AgentTurn` or `AgentRuntimeState` restoring a pre-turn checkpoint on normal interrupt, runner editing `WorkingContextSnapshot` directly, or prompt assembler reconstructing memory policy | Add marker-ingestion and focused projection helper APIs on the memory boundary. |
| `AgentRuntime.postToolApprovalEvent()` | Awaitable active-turn approval event submission through `AgentEventInbox`, scheduler/handler validation, approval result classification | `Agent.postToolExecutionApproval`, native/team facades, server Autobyteus backend tests | Server/native code writing directly to `TurnToolInputPort`, `InboxQueueStore`, or old approval handlers | Add `ToolExecutionApprovalEvent`, `ToolExecutionApprovalEvent` entry, and `PostToolApprovalResult` contract. |
| `AgentEventInbox` | Low-level queue storage, semantic lanes, parked events, lane availability, claim/park mechanics, awaitable command replies | `AgentRuntime.submitEvent`, `AgentWorker`, `AgentEventScheduler`, runtime tests | Callers pushing directly into `InboxQueueStore`, or scheduler/handlers bypassing inbox lanes | Add semantic post/postAwaitable/wait/peek/claim APIs. |
| `AgentTurnRunner` | Per-turn LLM/tool continuation algorithm and interruption catch/outcome production | `AgentTurn.startExecution(...)`, runtime tests | Worker/event dispatcher directly owning turn-local LLM/tool loop policy, runner storing itself in runtime state, or runner bypassing input pipeline for tool continuation | Extract runner methods and call shared `AgentInputPipeline` / `ToolResultContinuationBuilder`; keep execution-handle ownership in `AgentTurn`. |
| `LlmPhase` | LLM request assembly, provider streaming, streaming parser integration, interrupted segment finalization | `AgentTurnRunner` | Queued LLM-ready event handler remaining the real LLM phase owner | Move LLM phase logic into `LlmPhase` and call it directly. |
| `ToolPhase` | Invocation preprocessing, approval wait, tool execution, result collection, interrupted tool lifecycle | `AgentTurnRunner` | Queued tool request/execution/result handlers remaining the real tool phase owner | Move tool phase logic into `ToolPhase` and call it directly. |
| `TurnToolInputPort` tool input | Tool approval/result delivery to the active turn's `ToolPhase` | `AgentRuntime.postToolApprovalEvent`, `ToolPhase`, `AgentTurnRunner`, optional external tool-result callbacks | External callers or server backend posting directly to the port without runtime/state validation | Keep port internal to active turn; expose approval/results through runtime inbox APIs only. |
| `AgentInputPipeline` | Input processors and LLM user-message construction | `AgentTurnRunner`, bootstrap/lifecycle tests where relevant | Duplicating input-processor application in the runner or skipping it for SenderType.TOOL | Extract pipeline contract and require runner use for every LLM leg. |
| `AgentTurn.executionScope` | AbortController/signal, abort listeners, operation metadata, late-result fencing | `AgentRuntime`, `AgentTurnRunner`, `LlmPhase`, `ToolPhase` | Phase services creating unrelated AbortControllers or ad-hoc race policy for the same turn | Extend TurnExecutionScope/AgentTurn methods. |
| `BaseLLM.streamMessages(..., options)` | Provider signal mapping | `LlmPhase` | Phase service inspecting provider class to inject signal | Extend BaseLLM/provider contract. |
| `BaseTool.execute(..., options)` | Tool signal mapping | `ToolPhase` | Phase service checking terminal/MCP tool classes | Extend BaseTool/concrete tool contract. |
| `AgentExternalEventNotifier` | External observable-event publication above `EventEmitter` / `EventManager` | Runner, phase services, lifecycle pipeline, processor pipelines | Direct low-level `emit(...)` calls, duplicate publisher/outbox wrappers, or notifier events used to advance loop | Add typed semantic notifier methods. |
| `AgentTeamRuntime.interrupt()` | Member propagation and team status | `AgentTeam`, server team backend | Team backend calling `team.stop()` | Add team interrupt API/result. |
| Stream event pipeline | Event type conversion and WebSocket mapping | AgentExternalEventNotifier, AgentEventStream, server stream command models, frontend | UI polling runtime internals for interrupted state | Add stream events/status payload. |

## Dependency Rules

Allowed:

- `Agent` may call `AgentRuntime.interrupt()`.
- `AgentRuntime` may read `AgentRuntimeState.activeTurn` and call `activeTurn.interrupt(...)` / `activeTurn.waitForSettlement(...)`; it must not access runner promises or private execution handles.
- `AgentRuntime` may submit typed inbound event entries to `AgentEventInbox`; it must not push directly into low-level queue storage.
- `AgentRuntime` may accept tool approval/denial commands through `postToolApprovalEvent(...)` by posting an awaitable `ToolExecutionApprovalEvent` entry to `AgentEventInbox`.
- `AgentWorker` may run the inbox loop and call `AgentEventScheduler.nextDispatchable(...)` / `dispatch(...)`; it must not own routing branches itself.
- `AgentEventScheduler` may select dispatchable inbox event entries and typed `InboxEventHandler`s by event class/lane and runtime/turn state.
- `ToolApprovalInboxEventHandler` may validate/route with `AgentRuntimeState`, which then calls an `AgentTurn` public posting method that owns pending-invocation validation and `TurnToolInputPort` delivery.
- `ToolResultInboxEventHandler` may validate/route external/async tool results with `AgentRuntimeState`, which then calls an `AgentTurn` public posting method that owns pending-invocation validation and `TurnToolInputPort` delivery; in-process tool results may remain direct inside `ToolPhase`.
- `AgentEventInbox` may use `InboxQueueStore` as generic storage, but owns semantic lanes, parking, availability, claim, and awaitable-reply APIs; scheduler owns dispatchability policy.
- `AgentTurnRunner` directly calls `LlmPhase`, `ToolPhase`, and typed pipeline services, and owns turn-local continuation control flow.
- `AgentTurnRunner` must use `AgentInputPipeline` for initial input and tool-continuation input before every LLM phase.
- `AgentTurnRunner` / `ToolPhase` may use `ToolResultContinuationBuilder` to preserve one tool-result message shape.
- Runner phases and pipelines should publish outbound facts through semantic `AgentExternalEventNotifier` methods rather than low-level `EventEmitter` / `EventManager` calls or duplicate wrapper classes.
- `AgentTurnRunner`, `LlmPhase`, and `ToolPhase` may use `AgentTurn.executionScope` / interruption helpers. `AgentTurnRunner` returns a `TurnOutcome`; `AgentTurn` records settlement. Runtime-state clearing happens only through `clearActiveTurnIfStillActive(turnId)` after `turn.waitForSettlement()`.
- `AgentTurnRunner` / `AgentTurn` may report an interrupted turn outcome through normal memory ingestion APIs and `MemoryManager.projectWorkingContextForNextLlm(...)` when projection repair is needed; `LLMRequestAssembler` then reads the already-projected context through `MemoryManager.getWorkingContextMessages()`.
- `LlmPhase` may depend on the `BaseLLM` cancellation-aware API, not provider adapters.
- `ToolPhase` may depend on the `BaseTool` cancellation-aware API, not concrete tools.
- Provider adapters may depend on provider SDK-specific request options.
- Concrete tools may depend on process/MCP transport-specific cancellation.
- Server Autobyteus backends may depend on public `Agent`/`AgentTeam` interrupt APIs.

Forbidden:

- `interrupt()` must not call `stop()` for native Autobyteus runtime or team runtime.
- Worker loop must not run multiple active turns concurrently to solve interruption; it may keep processing inbox event entries while one active turn's private execution is running.
- `AgentRuntimeState` must not contain `activeTurnTask`, `activeRunner`, `registerActiveTurnTask(...)`, or any public/private field that stores the active turn's execution promise as peer state beside `activeTurn`.
- `AgentWorker` must not remain the semantic owner of the finite LLM/tool reasoning loop once the runner boundary is introduced.
- `WorkerEventDispatcher` must not dispatch the normal LLM/tool/continuation loop in the final implementation.
- Old queued phase handlers must not remain as alternate owners for normal LLM/tool/request/result flow.
- `AgentTurnRunner` must not feed raw tool results directly to the LLM or bypass `context.config.inputProcessors` for SenderType.TOOL continuations.
- External observable events must not be used as the mechanism that advances the internal agent loop.
- `InboxQueueStore` must not hard-code domain-specific event classes; `AgentEventInbox` provides typed lane metadata and `AgentEventScheduler` provides predicates/dispatchability rules.
- External callers must not bypass `AgentEventInbox` by writing directly to `InboxQueueStore`.
- Active-turn events inside `AgentEventInbox` must never be classified as turn-starting events.
- Server/native/team callers must not post approval directly into `TurnToolInputPort`; they must use `Agent.postToolExecutionApproval(...)` / `AgentRuntime.postToolApprovalEvent(...)`.
- External tool result callbacks must not post directly into `TurnToolInputPort`; they must enter as typed `ToolResultEvent` entries through `AgentEventInbox` and scheduler/handler validation.
- Valid approval events must not bypass `AgentRuntimeState` active-turn identity routing or `AgentTurn` pending-invocation validation.
- LLM/tool abort must not be reported as normal provider/tool error.
- Interrupted tool result must not enqueue a tool-continuation user message.
- Provider-specific abort logic must not leak into runner or phase services.
- Normal interrupt must not restore the working context wholesale to a pre-turn checkpoint, and `AgentTurn` / `AgentTurnRunner` / `AgentRuntimeState` must not own working-context rollback/projection policy.

## Implementation-Ready Component Contracts

This section narrows the second-stage target architecture into implementation contracts. Method names are proposed shapes; exact names may vary if responsibilities remain unchanged.

### `AgentRuntime` Contract

Purpose: public runtime control plane.

Owns: `start`, terminal `stop`, side-band `interrupt`, runtime-owned event inbox/scheduler/worker/state lifecycle, status access, public event submission APIs, and access to the external-event notifier.

Does not own: LLM/tool phase control flow, processor pipeline execution, provider/tool cancellation mechanics, or event-processor internals.

```ts
class AgentRuntime {
  start(): void;
  stop(timeoutSeconds?: number): Promise<void>;
  interrupt(options?: AgentInterruptOptions): Promise<AgentInterruptResult>;
  submitEvent(event: BaseEvent): Promise<void>;
  postToolApprovalEvent(event: ToolExecutionApprovalEvent): Promise<PostToolApprovalResult>;
  postToolResultEvent(event: ToolResultEvent): Promise<PostToolResultResult>;
}
```

Rules:

- `interrupt()` bypasses inbox scheduling, reads `AgentRuntimeState.activeTurn`, and targets only that `AgentTurn` / `TurnExecutionScope` if present. It must not call a runtime-state `interruptActiveTurn(...)` helper that hides access to an active runner task.
- `submitEvent()` posts a typed event into `AgentEventInbox`; it does not convert the event into a second domain message object.
- `postToolApprovalEvent()` and `postToolResultEvent()` are not new-turn submissions; they create awaitable active-turn event entries and return the inbox event handler result.
- `stop()` remains terminal and may cancel active work only as part of shutdown.

### `AgentEventInbox` Contract

Purpose: one semantic runtime inbound boundary for all typed agent events.

Accepts typed lanes: turn-starting user/inter-agent events, active-turn tool approval/result events, runtime lifecycle events, and future parked work.

Does not own: routing policy, runner execution, phase execution, or status derivation.

```ts
type AgentEventInboxLane = 'turn_start' | 'active_turn' | 'runtime_lifecycle';

type AgentEventInboxEntry<TEvent extends BaseEvent = BaseEvent> = {
  entryId: string;
  lane: AgentEventInboxLane;
  event: TEvent;
  awaitable?: AwaitableCompletion<InboxEventHandlerResult>;
};

class AgentEventInbox {
  postEvent(event: BaseEvent): Promise<void>;
  postAwaitableEvent(event: BaseEvent): Promise<InboxEventHandlerResult>;
  waitForAvailability(options?: { signal?: AbortSignal }): Promise<void>;
  peekCandidates(): Record<AgentEventInboxLane, AgentEventInboxEntry[]>;
  claim(entryId: string): AgentEventInboxEntry | null;
  park(entryId: string, reason: InboxParkReason): void;
  resolveAwaitable(entryId: string, result: InboxEventHandlerResult): void;
  drainForShutdown(): AgentEventInboxEntry[];
}
```

Rules:

- The event is the canonical domain object. The inbox entry/envelope adds only delivery metadata.
- One inbox does not mean one FIFO. The scheduler uses inbox lane APIs to choose the next dispatchable event by active turn/lifecycle state.
- External user/inter-agent events remain parked while a turn is active.
- Active-turn events may be dispatchable while a turn is active but can never start a turn.
- `InboxQueueStore` is private storage; callers must not use it directly.

### `AgentEventScheduler` Contract

Purpose: explicit event-routing policy.

Owns: dispatchability decisions, handler selection by typed event class and runtime/turn state, parking/claiming behavior, and wake-up on runtime-state changes.

Does not own: queue storage mechanics, event payload transformation, turn execution, phase execution, or provider/tool cancellation.

```ts
class AgentEventScheduler {
  nextDispatchable(input: {
    inbox: AgentEventInbox;
    runtimeState: AgentRuntimeState;
    signal?: AbortSignal;
  }): Promise<AgentEventInboxEntry>;
  dispatch(entry: AgentEventInboxEntry): Promise<InboxEventHandlerResult>;
  wakeDispatchabilityChanged(): void;
}
```

Rules:

- Select the next dispatchable event by event class, lane, runtime state, and turn state; then select handlers by event class.
- Enforce one-active-turn for turn-starting events.
- Route active-turn events only to active-turn inbox event handlers and return explicit stale/no-active/no-pending/interrupted outcomes.
- Runtime lifecycle events are not turn-starting events.
- Wait on both inbox availability and runtime-state dispatchability changes so parked turn-starting events are claimed after active-turn settlement without requiring a new external inbox post.

### Typed `InboxEventHandler` Contracts

Purpose: entry processing for one inbound event family.

```ts
interface InboxEventHandler<TEvent extends BaseEvent = BaseEvent> {
  canHandle(event: BaseEvent): event is TEvent;
  handle(entry: AgentEventInboxEntry<TEvent>, context: AgentContext): Promise<InboxEventHandlerResult>;
}
```

Rules:

- Handlers are scheduler-selected entry delegates, not phase owners.
- `TurnStartInboxEventHandler` may call `AgentTurn.startExecution(runnerFactory, trigger)`, but it does not await/own the finite LLM/tool loop and does not register a runner task outside the turn.
- `ToolApprovalInboxEventHandler` and `ToolResultInboxEventHandler` validate active turn identity through `AgentRuntimeState`; pending-invocation validation and `TurnToolInputPort` delivery happen through `AgentTurn` public methods, not direct port mutation by handlers.
- `RuntimeLifecycleInboxEventHandler` applies lifecycle/status events and coordinates terminal stop/shutdown only.

| Handler | Handles | May Call | Must Not Own |
| --- | --- | --- | --- |
| `TurnStartInboxEventHandler` | `UserMessageReceivedEvent`, `InterAgentMessageReceivedEvent` | `AgentRuntimeState.startActiveTurn`, `AgentTurn.startExecution(runnerFactory, trigger)`, `AgentTurn.waitForSettlement` observer | LLM/tool phase loop or runner-task storage. |
| `ToolApprovalInboxEventHandler` | `ToolExecutionApprovalEvent` | `AgentRuntimeState.routeToolApprovalToActiveTurn` | Direct public API/server routing, direct `AgentTurn` mutation, or direct `TurnToolInputPort` mutation. |
| `ToolResultInboxEventHandler` | external/async `ToolResultEvent` | `AgentRuntimeState.routeToolResultToActiveTurn` | In-process tool execution, direct `AgentTurn`/`TurnToolInputPort` mutation, or tool-result continuation pipeline. |
| `RuntimeLifecycleInboxEventHandler` | `LifecycleEvent` subclasses | status/lifecycle owners, shutdown orchestrator | Agent turn reasoning loop. |

### `TurnToolInputPort` Contract

Purpose: internal turn-scoped tool input primitive used by `ToolPhase` and `AgentTurn` public posting methods after scheduler/handler/runtime-state routing.

```ts
type TurnToolInputEvent = ToolExecutionApprovalEvent | ToolResultEvent;

class TurnToolInputPort {
  postApproval(event: ToolExecutionApprovalEvent): PostTurnEventResult;
  waitForApproval(invocationId: string, options: { signal: AbortSignal }): Promise<ToolExecutionApprovalEvent>;
  postToolResult(event: ToolResultEvent): PostTurnEventResult;
  waitForToolResult(invocationId: string, options: { signal: AbortSignal }): Promise<ToolResultEvent>;
  close(reason: 'completed' | 'interrupted' | 'failed' | 'stopped'): void;
}
```

Rules:

- Every event must match active `turnId` when supplied and expected invocation identity.
- External callers never touch this port directly; they use runtime/facade APIs that become inbox events and scheduler/handler dispatch.
- Clearing/closing this port on interrupt must not delete unrelated parked `AgentEventInbox` events.
- This port is tool-specific. Do not route user-message events, inter-agent events, lifecycle events, or non-tool phase wakeups through it.

### `MemoryManager` Fact Storage / Working-Context Projection Contract

Purpose: memory/history owner for accepted facts and future LLM prompt context.

Owns raw trace retention, working-context messages, snapshot/compaction consistency, and LLM-safe projection/repair. It does not own turn execution, cancellation, interruption policy, or scheduler dispatch.

```ts
class MemoryManager {
  ingestUserMessage(message: LLMUserMessage, turnId: string, sourceEvent: string): void;
  ingestAssistantResponse(response: CompleteResponse, turnId: string, sourceEvent: string, options?: {
    appendToWorkingContext?: boolean;
    partial?: boolean;
  }): void;
  ingestToolIntents(invocations: ToolInvocation[], turnId?: string, options?: {
    appendToWorkingContext?: boolean;
    assistantContent?: string | null;
    assistantReasoning?: string | null;
  }): void;
  ingestToolResults(events: ToolResultEvent[], turnId?: string, options?: {
    source?: string;
    appendToWorkingContext?: boolean;
  }): void;
  appendRawTrace(trace: RawTraceItem): void;
  projectWorkingContextForNextLlm(options?: {
    mode?: 'llm_safe';
    fenceIncompleteToolProtocolScope?: { kind: 'agent_turn'; id: string };
    includeCommittedFacts?: boolean;
  }): Promise<void>;
  getWorkingContextMessages(): Promise<LLMMessage[]>;
}
```

Rules:

- Fact ingestion and LLM continuation are separate decisions. A completed tool result may be ingested as a fact while `appendToWorkingContext: false` prevents it from becoming same-turn native tool continuation after interrupt.
- Raw trace/event history for accepted user input, emitted assistant facts, tool intents/results, and optional operation-boundary notes is append-only for facts already observed before interrupt.
- The future working context must be LLM-safe: it may include natural assistant text, neutral summaries, or operation-boundary notes when needed, but must not preserve invalid partial native tool-call protocol fragments.
- `AgentTurn`, `AgentTurnRunner`, and phase services decide whether interruption stops continuation; `MemoryManager` only records facts and projects prompt context.
- `LLMRequestAssembler` reads `getWorkingContextMessages()` and must not reconstruct interruption or tool-protocol policy itself.

### `AgentRuntimeState` Active-Turn Routing Contract

Purpose: active-turn identity selector and stale active-turn routing boundary.

```ts
class AgentRuntimeState {
  activeTurn: AgentTurn | null;
  startActiveTurn(input: { trigger: UserMessageReceivedEvent | InterAgentMessageReceivedEvent }): AgentTurn;
  getActiveTurn(): AgentTurn | null;
  routeToolApprovalToActiveTurn(event: ToolExecutionApprovalEvent): PostToolApprovalResult;
  routeToolResultToActiveTurn(event: ToolResultEvent): PostToolResultResult;
  clearActiveTurnIfStillActive(turnId: string): AgentTurn | null;
}
```

Rules:

- Runtime state owns only the active-turn reference, active-turn creation, optional turn-ID stale classification, and clear-by-turn-ID after settlement.
- Runtime state must not store `activeTurnTask`, `activeRunner`, a runner promise, or an `AgentTurnExecutionHandle` as peer state beside `activeTurn`.
- Runtime state must not own working-context checkpoint restoration or LLM-safe working-context projection.
- Runtime state must not inspect or mutate `TurnToolInputPort` internals. After no-active/stale-turn checks, it calls public `AgentTurn.postToolApproval(...)` / `AgentTurn.postToolResult(...)` methods.
- Pending-invocation validation, interrupted-turn classification, and port delivery are owned by the active `AgentTurn` aggregate and its `TurnToolInputPort` / tool-batch state.
- Inbox event handlers ask runtime state to route; they do not inspect/modify active-turn internals directly.

### `AgentTurn` Contract

Purpose: one turn's aggregate root: identity, private execution handle, turn tool input port, execution scope, and settlement.

```ts
type AgentTurnRunnerFactory = (turn: AgentTurn) => AgentTurnRunner;

class AgentTurn {
  readonly turnId: string;
  readonly toolInputPort: TurnToolInputPort;
  readonly executionScope: TurnExecutionScope;
  readonly settlementState: TurnSettlementState;

  startExecution(input: {
    trigger: UserMessageReceivedEvent | InterAgentMessageReceivedEvent;
    runnerFactory: AgentTurnRunnerFactory;
  }): void;
  waitForSettlement(options?: { timeoutMs?: number }): Promise<TurnSettlementResult>;
  interrupt(reason: string): AgentInterruptResult;
  startToolInvocationBatch(invocations: ToolInvocation[]): ToolInvocationBatch;
  postToolApproval(event: ToolExecutionApprovalEvent): PostToolApprovalResult;
  postToolResult(event: ToolResultEvent): PostToolResultResult;
}
```

Rules:

- `AgentTurn` is the only owner of the private execution promise/handle created by `startExecution(...)`.
- `startExecution(...)` may create an `AgentTurnRunner` through the factory, call `runner.run(trigger)`, and translate the returned `TurnOutcome` or interruption/error into idempotent settlement.
- `AgentTurn` owns pending invocation validation and delivery to `TurnToolInputPort`; external callers and inbox handlers do not post directly to the port.
- `AgentTurn` does not own memory rollback/projection; it may expose turn identity/outcome only as metadata for generic memory fact ingestion/projection when needed.
- Settlement is idempotent; late LLM/tool/approval outcomes are fenced; TOOL continuations reuse the same turn.
- `AgentRuntimeState` may hold the `AgentTurn` reference and clear it by ID after settlement, but it must not hold the private execution promise/handle.

### `AgentTurnRunner` Contract

Purpose: finite interruptible agent loop for one active turn.

Owns turn-local sequence: input pipeline -> LLM phase -> tool phase -> tool-result continuation -> next LLM phase, plus interruption catch/outcome production and external observable-event notification. `AgentTurn`, not the runner, records the authoritative settlement.

```ts
class AgentTurnRunner {
  run(trigger: UserMessageReceivedEvent | InterAgentMessageReceivedEvent): Promise<TurnOutcome>;
}
```

Rule: runner may call `AgentInputPipeline`, `LlmPhase`, `ToolPhase`, `ToolResultPipeline`, `ToolResultContinuationBuilder`, `LLMResponsePipeline`, and `AgentExternalEventNotifier`; it must not read parked inbox event entries, own runtime lifecycle, clear runtime state, or expose/store its promise outside `AgentTurn`.

### `TurnExecutionScope` Contract

Purpose: mechanical cancellation and late-result fencing for one turn.

Owns signal, active operation metadata, abort callbacks, abortable promise/iterator helpers, interruption normalization, and late-result logging/fencing. It does not own business decisions or runtime lifecycle.

### `AgentExternalEventNotifier` Contract

Purpose: semantic external observable-event boundary above low-level `EventEmitter` / `EventManager` infrastructure. External observable events publish facts/results and never advance the internal loop. The notifier must preserve all existing consumer-visible families, including assistant/segment/tool/turn/status/artifact facts and inter-agent/system-task communication facts.

Required methods to preserve/extend rather than replace with a wrapper:

- `notifyAgentDataInterAgentMessageReceived(payload)`
- `notifyAgentDataSystemTaskNotificationReceived(payload)`
- `notifyAgentTurnInterrupted(turnId, reason)`
- `notifyAgentToolExecutionInterrupted(payload)`
- existing assistant, segment, tool approval/execution, todo/artifact/status/error notification methods

### Processor Pipeline Contracts

| Pipeline | Input | Output | Owner Rule |
| --- | --- | --- | --- |
| `SystemPromptPipeline` | base prompt + tools/context | processed prompt | bootstrap-owned, not turn-owned |
| `AgentInputPipeline` | external trigger / TOOL continuation + active turn context | LLM-ready input data | preserves sender type and same-turn TOOL rule |
| `ToolInvocationPipeline` | parsed `ToolInvocation` | execution-ready invocation | preprocess before approval/execution |
| `ToolResultPipeline` | tool result data | processed tool result data | process before continuation |
| `LLMResponsePipeline` / output pipeline | `CompleteResponse` | final assistant output decision | response/output processing after final LLM response |

## State Machines And Invariants

### Runtime / Inbox Dispatch State

| State | Meaning | Dispatch Rule |
| --- | --- | --- |
| `BOOTSTRAPPING` | Runtime lifecycle setup is running. | Do not dispatch turn-starting events; lifecycle stop may be handled. |
| `IDLE_READY` | Runtime ready and no active turn. | Dispatch next turn-starting user/inter-agent event or lifecycle event. |
| `TURN_ACTIVE` | One `AgentTurn` is active and its private execution handle is running or settling. | Dispatch active-turn events and lifecycle events; park future turn-starting events. |
| `INTERRUPTING` | Active turn interruption requested. | Continue active-turn fencing/stale classification; do not start a new turn until settlement. |
| `STOPPING` | Terminal stop requested. | Stop accepting new turn starts; cancel active turn as shutdown if needed; run shutdown once. |
| `STOPPED` | Runtime terminally stopped. | Reject inbound events with runtime-stopped result. |

### Tool Batch State Machine

| State | Meaning | Transition Rule |
| --- | --- | --- |
| `CREATED` | LLM parsed expected invocations. | all invocation IDs are bound to active turn |
| `PENDING_APPROVAL` | one or more invocations await approval. | approval events must match invocation/turn and arrive through scheduler/handler/port |
| `EXECUTING` | one or more tools running. | each execution receives `ToolExecutionOptions.signal` |
| `COLLECTING_RESULTS` | tool results settle in `ToolPhase` or arrive as active-turn result events. | collect only expected IDs |
| `READY_FOR_CONTINUATION` | ordered results complete. | feed `ToolResultPipeline` then continuation builder |
| `INTERRUPTED` | active turn interrupted. | mark expected IDs fenced inside the active turn / tool input port |
| `SETTLED` | continuation processed or turn done. | duplicate/late results ignored |

### Invariants

| ID | Invariant | Enforcement Owner |
| --- | --- | --- |
| INV-001 | At most one active `AgentTurn` per runtime. | `AgentEventScheduler` + `AgentRuntimeState` |
| INV-002 | `AgentEventInbox` is the only semantic inbound boundary above queue storage; `AgentEventScheduler` is the only dispatchability/routing owner above that inbox. | `AgentRuntime` / `AgentEventInbox` / `AgentEventScheduler` |
| INV-002A | Active-turn inbox event entries may enter `AgentEventInbox`, but they must never be classified as turn-starting events. | `AgentEventInbox` / `AgentEventScheduler` |
| INV-002B | The worker inbox loop continues to dispatch active-turn/lifecycle events while one active turn's private execution is running. | `AgentWorker` / `AgentEventScheduler` |
| INV-002C | Active-turn execution handle ownership is private to `AgentTurn`; runtime state must not store a runner task/promise as peer state. | `AgentTurn` / `AgentRuntimeState` |
| INV-003 | Tool input events must match active `turnId` and expected invocation identity. | `AgentTurn` / `TurnToolInputPort` / `AgentRuntimeState` |
| INV-003A | External approval/denial must reach `TurnToolInputPort` only through `AgentRuntime.postToolApproval -> AgentEventInbox -> AgentEventScheduler -> ToolApprovalInboxEventHandler -> AgentRuntimeState active-turn routing -> AgentTurn.postToolApproval`. | `AgentRuntime` / `AgentEventScheduler` / `AgentRuntimeState` / `AgentTurn` |
| INV-003B | External/async tool results must reach `TurnToolInputPort` only through `AgentEventInbox -> AgentEventScheduler -> ToolResultInboxEventHandler -> AgentRuntimeState active-turn routing -> AgentTurn.postToolResult`; in-process results may stay inside `ToolPhase`. | `AgentEventScheduler` / `AgentRuntimeState` / `AgentTurn` / `ToolPhase` |
| INV-004 | `SenderType.TOOL` input never starts a new turn. | `AgentInputPipeline` / `AgentEventScheduler` |
| INV-005 | Tool results must pass through `ToolResultPipeline` and `AgentInputPipeline` before next LLM. | `AgentTurnRunner` |
| INV-006 | `interrupt()` is side-band and must not be blocked behind inbox work. | `AgentRuntime` |
| INV-007 | Normal interrupt never runs shutdown cleanup. | `AgentRuntime` / lifecycle tests |
| INV-008 | Stop always remains terminal and runs shutdown cleanup exactly once. | `AgentRuntime` / `AgentWorker` |
| INV-009 | External observable-event publication is observation/output only, not internal control flow. | `AgentExternalEventNotifier` / runner |
| INV-010 | Bootstrap must complete before any external trigger starts a turn. | `AgentWorker` lifecycle |
| INV-011 | Turn settlement is idempotent and fences late results. | `AgentTurn` / `TurnExecutionScope` |
| INV-012 | Provider/tool-specific cancellation stays below `BaseLLM` / `BaseTool`. | provider/tool adapters |
| INV-013 | Normal interrupt never restores working context wholesale to a pre-turn checkpoint; LLM-safe working-context projection is owned by `MemoryManager`. | `MemoryManager` / tests |
| INV-014 | Accepted user input, emitted assistant facts, completed tool facts, and operation-boundary notes already observed before interrupt remain append-only history. | `MemoryManager` / `AgentExternalEventNotifier` |

## Event Routing Rules

| Incoming Item | Enters | Scheduler / Handler | Can Start Turn? | Required Identity | Invalid/Stale Handling |
| --- | --- | --- | --- | --- | --- |
| External user message | `AgentEventInbox` turn-starting lane | `TurnStartInboxEventHandler` when idle | Yes | optional client message ID | park until idle; reject only if runtime stopped |
| Inter-agent message | `AgentEventInbox` turn-starting lane | `TurnStartInboxEventHandler` when idle | Yes | sender metadata | park until idle; reject only if runtime stopped |
| Runtime lifecycle event | `AgentEventInbox` lifecycle lane | `RuntimeLifecycleInboxEventHandler` | No | runtime ID | obey lifecycle state; terminal stop preempts turn starts |
| Tool approval/denial command | `AgentRuntime.postToolApprovalEvent` -> awaitable `AgentEventInbox` active-turn lane | `ToolApprovalInboxEventHandler` -> `AgentRuntimeState.routeToolApprovalToActiveTurn` -> `AgentTurn.postToolApproval` | No | required `invocationId`, optional `turnId`, `approved`, optional `reason` | return no-active/stale-turn/no-pending/interrupted/runtime-stopped |
| External/async tool result event | `AgentEventInbox` active-turn lane | `ToolResultInboxEventHandler` -> `AgentRuntimeState.routeToolResultToActiveTurn` -> `AgentTurn.postToolResult` | No | `turnId`, `invocationId` | drop/fence if unknown, stale, interrupted, or mismatched |
| In-process tool result | `ToolPhase` direct return inside runner | `ToolResultPipeline` in runner | No | active batch invocation IDs | fenced by `TurnExecutionScope` and turn-local batch state |
| TOOL continuation message | runner-local continuation builder | `AgentInputPipeline(SenderType.TOOL)` | No | active `turnId` | reject/fence if no active turn |
| Shutdown request / stop | runtime control/lifecycle lane | lifecycle handler / runtime stop | No | runtime ID | terminal; blocks new turn starts |
| Interrupt request | side-band `AgentRuntime.interrupt()` | active turn scope | No | optional `turnId` | no-active/stale-turn result if applicable |
| Low-level queued storage entry | private `InboxQueueStore` | none by itself | No | storage metadata | storage does not decide routing |
| Assistant/segment/tool lifecycle output | `AgentExternalEventNotifier` | external event subscribers | No | `turnId`/invocation if applicable | publish only; never enqueue as turn input |

## Event Handler / Listener Final-State Model

The final design does **not** use an intermediate handler chain. Existing event-handler logic is moved into final domain services, and old handlers that only existed to advance the turn loop are removed from the normal runtime path.

Final rule:

```text
AgentTurnRunner and explicit phase/pipeline services own turn-local control flow.
Event/listener code may remain only for external input boundaries, lifecycle observation, or external event delivery.
No event-handler chain may remain as the hidden agent loop.
No intermediate turn-control state is part of the design.
```

### Final Handler Classification

| Current Handler / Listener Area | Current Role | Final State | Required Final Action |
| --- | --- | --- | --- |
| `BootstrapEventHandler` | Drives bootstrap through queued step events. | Removed from bootstrap control flow. | `AgentBootstrapper.run(context)` owns bootstrap; bootstrap facts publish through lifecycle/external-event/status. |
| `UserInputMessageEventHandler` | Applies input processors, starts/reuses turn, enqueues LLM-ready event. | Removed from normal turn flow. | `AgentInputPipeline` owns transformation; `AgentWorker`/`AgentTurnRunner` call it directly. |
| `InterAgentMessageEventHandler` | Handles inter-agent input. | Removed from turn flow; replaced by `AgentEventInbox` external trigger routing. | Inter-agent events enter `AgentEventInbox` and are processed by the same scheduler/runner path as user triggers. |
| `LLMUserMessageReadyEventHandler` | Owns request assembly, streaming, parsing, tool-intent enqueue. | Removed from normal turn flow. | `LlmPhase` called by `AgentTurnRunner` owns LLM phase; no queued `LLMUserMessageReadyEvent` is needed for normal runner flow. |
| `LLMCompleteResponseReceivedEventHandler` | Applies response processors and emits final assistant response. | Removed from normal turn flow. | `LLMResponsePipeline` / output pipeline called by runner owns response processing. |
| `ToolInvocationRequestEventHandler` | Handles pending tool invocation/approval flow. | Removed from normal turn flow. | Runner tool phase owns approval request and awaits `TurnToolInputPort` approval events. |
| `ToolExecutionApprovalEventHandler` | Handles approval/denial events in the old event model. | Removed from normal turn flow. | External approval/denial follows `AgentRunBackend.approveToolInvocation -> Agent.postToolExecutionApproval -> AgentRuntime.postToolApproval -> AgentEventInbox -> AgentEventScheduler -> ToolApprovalInboxEventHandler -> AgentRuntimeState active-turn routing -> AgentTurn.postToolApproval -> TurnToolInputPort`; the new typed handler is an entry handler, not a tool phase owner. |
| `ToolInvocationExecutionEventHandler` | Applies preprocessors, executes tool, enqueues tool result. | Removed from normal turn flow. | `ToolInvocationPipeline` + tool execution phase called by runner owns execution. |
| `ToolResultEventHandler` | Applies result processors, emits lifecycle, aggregates continuation, enqueues TOOL input. | Removed from normal turn flow. | `ToolResultPipeline` + `ToolResultContinuationBuilder` + `AgentInputPipeline` called by runner own continuation. |
| `LifecycleEventLogger` / generic lifecycle listeners | Logs/projects lifecycle facts. | May remain as observers. | Observation only; no turn advancement. |
| `WorkerEventDispatcher` | Dispatches every event and indirectly advances the loop. | Removed from normal turn flow; may remain only for non-turn lifecycle observation if still useful. | Must not dispatch normal LLM/tool/continuation loop. |
| `AgentExternalEventNotifier` / `EventEmitter` listeners | External observable-event delivery. | `AgentExternalEventNotifier` remains the semantic publisher; `EventEmitter`/listeners remain delivery infrastructure. | Runner/pipelines publish through `AgentExternalEventNotifier`; listeners only deliver outbound facts and never advance turns. |

### Clean-Cut Target Flow

Final target:

```text
AgentEventInbox trigger
  -> AgentWorker inbox loop
  -> AgentEventScheduler
  -> TurnStartInboxEventHandler calls AgentRuntimeState.startActiveTurn
  -> AgentTurn.startExecution(runnerFactory, trigger) owns the private execution handle
  -> AgentTurnRunner calls AgentInputPipeline
  -> AgentTurnRunner calls LlmPhase
  -> AgentTurnRunner calls ToolPhase if needed
  -> ToolPhase uses TurnToolInputPort for approvals and future async result delivery
  -> AgentTurnRunner calls ToolResultPipeline + ToolResultContinuationBuilder
  -> AgentTurnRunner calls AgentInputPipeline(SenderType.TOOL)
  -> AgentTurnRunner loops or completes
  -> AgentExternalEventNotifier publishes facts/results
```

Tool approval target:

```text
`ToolExecutionApprovalEvent` entry
  -> AgentEventScheduler
  -> ToolApprovalInboxEventHandler
  -> AgentRuntimeState validation
  -> TurnToolInputPort.postApproval
  -> ToolPhase.waitForApproval resumes
```

Forbidden final shapes:

```text
AgentTurnRunner -> enqueue event -> WorkerEventDispatcher -> Handler -> enqueue next event -> ...
```

```text
Queue event -> Handler chain remains the true LLM/tool loop while AgentTurnRunner is only a pass-through.
```

```text
Both runner direct flow and legacy handler queue flow are active for the same turn.
```

### Event Use After Final Refactor

Events remain valuable, but only in these roles:

```text
External input boundary: yes.
Runtime lifecycle observations: yes.
External observable events/server/UI streams: yes.
Turn-local control-flow engine: no.
```

### Final Handler Safety Gates

The final implementation must pass review/test checks that:

- extracted pipelines preserve current handler processor ordering and error behavior;
- `AgentTurnRunner` directly calls phase/pipeline services for normal turn execution;
- no duplicate LLM/tool continuation path exists;
- event/listener code cannot process stale active-turn events after interruption;
- new interruption events are published through semantic `AgentExternalEventNotifier` methods, not low-level `EventEmitter.emit(...)` calls or duplicate wrapper classes;
- `WorkerEventDispatcher` is not the semantic owner of the finite agent loop;
- old internal queue events that only existed to advance the normal turn loop are removed from final turn control flow.

## Final Refactor Work Packages And Safety Gates

The design describes the final target architecture only. The implementation may be organized into work packages, but these are not acceptable stopping points. The final handoff must include all required packages and must not leave intermediate turn-control seams, duplicate control-flow owners, or old handler queue choreography in the normal turn path.

### Work Package 0 — Characterization Tests

Goal: lock behavior that must be preserved.

Required tests/evidence:

- current bootstrap success/failure behavior;
- current stop cleanup behavior;
- current tool-result-as-TOOL-input flow;
- current input processor ordering;
- current tool result processor ordering;
- current LLM response processor behavior;
- current server native interrupt incorrectly calls stop, captured as the bug to remove;
- current interrupted-turn memory behavior that can forget an accepted user message after pre-turn working-context restore.

Safety gate: tests prove existing behavior that must survive the refactor.

### Work Package 1 — Typed Pipeline Extraction And Direct Ownership

Goal: move processor logic into final typed pipelines.

Required final components:

- `SystemPromptPipeline` used by direct bootstrap lifecycle;
- `AgentInputPipeline` used directly by turn-start handling / runner input flow;
- `ToolInvocationPipeline` used directly by runner tool phase;
- `ToolResultPipeline` used directly by runner tool-result processing;
- `LLMResponsePipeline` used directly by runner output phase;
- `ToolResultContinuationBuilder` used directly by runner continuation flow.

Safety gate: processor ordering/error behavior is preserved; old handlers no longer own these transformations in the normal turn path.

### Work Package 2 — AgentEventInbox / Scheduler / Handlers / TurnToolInputPort / AgentExternalEventNotifier

Goal: establish explicit inbound/outbound boundaries and dispatch ownership.

Required final components:

- `AgentEventInbox` for all typed inbound agent events and parked work;
- `InboxQueueStore` as private low-level storage behind the inbox;
- `AgentEventScheduler` for dispatchability and handler selection;
- typed `InboxEventHandler`s for turn-start, tool approval, tool result, and lifecycle event-entry processing;
- `TurnToolInputPort` as the internal turn-scoped tool wait/post primitive;
- `AgentExternalEventNotifier` for assistant output, streaming segments, tool lifecycle, errors, lifecycle facts, artifacts/state updates.

Safety gate:

- active-turn events can enter the inbox but cannot start turns;
- stale/no-active/no-pending/interrupted outcomes are explicit;
- tool approvals and external/async tool results reach `TurnToolInputPort` only after scheduler/handler/runtime-state validation;
- the worker loop stays alive for active-turn/lifecycle dispatch while an active turn's private execution is running;
- external observable-event publication is notification-only and does not advance the loop;
- inter-agent/system communication publications remain visible to `AgentEventStream`, server team processors, `TeamStreamingService`, conversation segment rendering, and `teamCommunicationStore` after `AgentOutbox` removal.
- event-inbox dispatch targets use `handlers/`, `InboxEventHandler`, `*InboxEventHandler`, `AgentEventSchedulerHandlers`, and `handle(...)`; no event-inbox `processors/` or `*EventProcessor` naming remains in final source/tests, while real processor pipeline names remain unchanged.

### Work Package 3 — Direct Bootstrap / Shutdown Lifecycle

Goal: make lifecycle control explicit and separate from turns.

Required final behavior:

- single-agent bootstrap uses direct `AgentBootstrapper.run(context)`;
- system prompt processors flow through `SystemPromptPipeline`;
- bootstrap step events are observations only, if kept;
- shutdown uses shutdown orchestrator exactly once on terminal stop;
- normal interrupt never runs shutdown cleanup.

Safety gate: bootstrap/shutdown tests pass, including interrupt during bootstrap and stop during active turn.

### Work Package 4 — AgentTurn / TurnExecutionScope

Goal: add finite turn state and cancellation primitive while removing memory rollback responsibility from the turn aggregate.

Required final components:

- `AgentTurn` owns `turnId`, private execution promise/handle, `startExecution(...)`, `waitForSettlement(...)`, `TurnToolInputPort`, `TurnExecutionScope`, tool batches, and settlement;
- `AgentTurn` no longer stores or restores working-context checkpoints for normal interrupt;
- `TurnExecutionScope` owns abort signal, abort listeners, abortable promise/iterator helpers, late-result fencing;
- late LLM/tool/approval results cannot revive a settled turn.

Safety gate: idempotent interrupt/settlement and late-result fencing tests pass; source review confirms no `AgentRuntimeState.activeTurnTask`, `activeRunner`, `registerActiveTurnTask(...)`, or equivalent peer execution-handle storage remains.

### Work Package 4A — Memory Fact Commit And LLM-Safe Projection

Goal: split memory fact commit from same-turn LLM continuation and make future prompt projection LLM-safe after interruption.

Required final behavior:

- remove normal-interrupt calls to `restoreWorkingContextForInterruptedTurn(...)` / pre-turn checkpoint restore;
- extend normal memory ingestion APIs with explicit `appendToWorkingContext` control where needed, especially for tool intents/results;
- add or expose `MemoryManager.projectWorkingContextForNextLlm(...)` or equivalent projection repair;
- retain raw trace/event facts for accepted user input, emitted assistant facts, completed tool facts, and optional operation-boundary notes;
- rebuild or finalize `WorkingContextSnapshot` as LLM-safe prompt history that remembers committed facts from the interrupted turn while fencing incomplete native tool-call protocol;
- keep `LLMRequestAssembler` as a reader of `MemoryManager.getWorkingContextMessages()` rather than an owner of interrupted projection policy.

Safety gate: AC-016 passes with a runtime test that interrupts after an accepted first user message and verifies the next LLM request includes that earlier message/operation-boundary note when needed rather than starting history at the post-interrupt message.

### Work Package 5 — AgentTurnRunner And Phase Services

Goal: make the finite agent loop explicit.

Required final flow:

```text
AgentEventInbox -> AgentEventScheduler -> TurnStartInboxEventHandler -> AgentRuntimeState.startActiveTurn -> AgentTurn.startExecution(runnerFactory, trigger)
AgentTurn private execution -> AgentTurnRunner -> AgentInputPipeline
AgentTurnRunner -> LlmPhase
AgentTurnRunner -> ToolPhase
AgentTurnRunner -> ToolResultPipeline + ToolResultContinuationBuilder
AgentTurnRunner -> AgentInputPipeline(SenderType.TOOL)
AgentTurnRunner -> LLMResponsePipeline / completion
```

Safety gate:

- normal LLM/tool/continuation flow does not depend on `WorkerEventDispatcher` dispatching old handlers;
- only one active turn can run, even though the worker loop keeps dispatching active-turn/lifecycle events; the private execution handle is owned by `AgentTurn`, not runtime state;
- tool continuation still reuses the same turn and still applies input processors.

### Work Package 6 — Native Interrupt Semantics

Goal: implement requested interrupt behavior through the final architecture.

Required final behavior:

- `AgentRuntime.interrupt()` is side-band, reads `AgentRuntimeState.activeTurn`, and targets `activeTurn.interrupt(...)` / `TurnExecutionScope`;
- LLM stream interruption aborts or abandons provider stream and suppresses assistant ingestion;
- tool execution interruption aborts or abandons tool execution and suppresses continuation;
- pending approval interruption clears/fences active approval state;
- server/native approval commands route through `Agent.postToolExecutionApproval` / `AgentRuntime.postToolApprovalEvent` into `AgentEventInbox`, then through `AgentEventScheduler`, `ToolApprovalInboxEventHandler`, `AgentRuntimeState.routeToolApprovalToActiveTurn`, and `AgentTurn.postToolApproval` into the active `TurnToolInputPort`;
- external/async tool result events route through `AgentEventInbox`, then through `AgentEventScheduler`, `ToolResultInboxEventHandler`, `AgentRuntimeState.routeToolResultToActiveTurn`, and `AgentTurn.postToolResult` into `TurnToolInputPort`, then rejoin the normal tool-result continuation pipeline;
- server native backend maps interrupt to native `agent.interrupt`, not stop;
- team interrupt propagates member interrupts, not team stop.

Safety gate: acceptance tests AC-001 through AC-014 and AC-016 pass.

### Work Package 7 — Remove Old Turn-Control Choreography

Goal: clean-cut decommission of old control-flow owners.

Required final cleanup:

- remove native interrupt-to-stop fallback;
- keep the current `INTERRUPT_GENERATION` / `interruptGeneration` command path and remove any remaining app-owned `STOP_GENERATION` naming where found;
- remove old internal queue events/handlers that only advanced the normal LLM/tool/continuation loop;
- keep only external input boundaries, lifecycle observations, and external event delivery listeners;
- remove duplicate paths where both runner and handler chain can advance the same turn.

Safety gate: source review confirms no final implementation path leaves the old handler chain as the hidden agent loop.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `Agent.interrupt(options?: AgentInterruptOptions): Promise<AgentInterruptResult>` | Native agent runtime | Public cancel-current-turn command. | Optional `turnId` for active turn validation. | Thin facade. |
| `AgentRuntime.interrupt(options?: AgentInterruptOptions): Promise<AgentInterruptResult>` | Agent runtime control | Signal active turn and wait for settlement. | `turnId?`, reason/requestedBy/timeout. | Authoritative native boundary. |
| `Agent.postToolExecutionApproval(invocationId, approved, reason?, options?)` | Native agent active-turn input | Public approval/denial command for a pending tool invocation. | Required invocation ID, approved/denied boolean, optional reason, optional turnId/requestedBy. | Thin facade to runtime; keeps existing public/server surface. |
| `AgentRuntime.postToolApprovalEvent(event: ToolExecutionApprovalEvent): Promise<PostToolApprovalResult>` | Runtime active-turn input | Submit an awaitable `ToolExecutionApprovalEvent` entry; scheduler/handler validates and posts to `TurnToolInputPort`. | `ToolExecutionApprovalEvent`. | Authoritative native approval boundary. |
| `AgentEventInbox.post(...)` / `postAwaitable(...)` / lane/claim APIs | Runtime inbound events | Store typed inbound event entries, preserve parked work, and expose candidates/claims to the scheduler without exposing queue storage. | Event class/lane plus identity/reply metadata as needed. | Semantic inbox boundary above queue storage; scheduler owns dispatchability. |
| `AgentTurn.startExecution(runnerFactory, trigger)` | Active turn aggregate | Attach the private execution handle for one turn and run the runner algorithm. | Current turn plus trigger. | Internal; callers above `AgentTurn` do not keep the handle. |
| `AgentTurn.interrupt(reason)` | Active turn aggregate | Idempotently abort signal and record metadata. | Current turn ID only. | Internal to runtime; does not expose runner task. |
| `AgentTurn.waitForSettlement(options?)` | Active turn aggregate | Await the turn's idempotent settlement. | Current turn ID only. | Used by runtime/handler as a boundary, not a task handle. |
| `MemoryManager.appendRawTrace(...)` | Agent memory / raw history | Append a generic raw fact or optional operation-boundary note without owning turn lifecycle. | RawTraceItem with trace type/content/source metadata. | Memory-native ingest operation; lifecycle decisions remain outside memory. |
| `MemoryManager.projectWorkingContextForNextLlm(...)` | Agent memory / working-context projection | Rebuild/finalize LLM-safe prompt context from remembered facts. | Projection mode/options, optional fence scope for incomplete protocol. | Authoritative projection boundary; no pre-turn restore by turn/runtime state. |
| `BaseLLM.streamMessages(messages, renderedPayload, kwargs, options?)` | LLM invocation | Stream with optional cancellation. | `LLMInvocationOptions.signal`, `turnId`. | `kwargs` remains provider params. |
| `BaseTool.execute(context, args, options?)` | Tool execution | Execute with optional cancellation. | `ToolExecutionOptions.signal`, `turnId`, `invocationId`. | Existing tools may ignore signal; `ToolPhase` still runs through `TurnExecutionScope` late-result fencing. |
| `AgentTeam.interrupt(options?)` | Native team runtime | Public team cancel-current-work command. | Reason/timeout; no member selector for this requirement. | Interrupts all running cached nodes. |
| `AgentTeamRuntime.interrupt(options?)` | Team runtime control | Propagate to member nodes and update team status. | Reason/timeout. | Does not shutdown. |
| `AgentRunBackend.approveToolInvocation(invocationId, approved, reason?)` | Cross-runtime server run | Runtime-kind tool approval/denial command. | Required invocation ID, approved boolean, optional reason; future turn ID should be explicit if protocol adds it. | Existing interface retained and mapped to native approval API. |
| `AgentRunBackend.interrupt(turnId?)` | Cross-runtime server run | Runtime-kind interrupt command. | Optional platform turn ID. | Existing interface retained. |
| WebSocket `INTERRUPT_GENERATION` | Client command | Interrupt active generation for run/team. | Optional `turn_id` payload if available. | Current ticket protocol shape; keep as the single app-owned interrupt command. |

Rule: do not overload `stop(timeout?)` with interrupt options. Stop remains terminal and takes only shutdown timeout.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentRuntime.interrupt` | Yes | Yes | Low | Optional turnId must match active turn or return stale/no-active result; implementation calls `activeTurn.interrupt()` and `activeTurn.waitForSettlement()`, not a state-owned runner task. |
| `AgentEventInbox` | Yes | Yes | Low | Event class/lane must distinguish turn-starting, active-turn, and lifecycle events without owning scheduler policy or exposing queue storage. |
| `AgentEventScheduler` | Yes | Yes | Low | Scheduler owns dispatchability and processor routing; typed handlers own processing. |
| `AgentRuntime.postToolApprovalEvent` | Yes | Yes | Low | Invocation ID is required; optional turn ID must match active turn; stale/no-active/no-pending outcomes are explicit. |
| `MemoryManager.appendRawTrace` | Yes | Yes | Low | Appends a memory/history marker; it does not finalize a turn, cancel execution, or route events. |
| `MemoryManager.projectWorkingContextForNextLlm` | Yes | Yes | Low | Projection options are explicit; method owns prompt-memory projection only. |
| `BaseLLM.streamMessages` | Yes | Yes | Low | Keep provider kwargs separate from invocation options. |
| `BaseTool.execute` | Yes | Yes | Low | Options are execution metadata, not tool arguments. |
| WebSocket interrupt command | Yes | Yes | Low | Payload uses `turn_id`, not generic ID. |
| Team interrupt | Yes | Mostly | Medium | Initial scope interrupts all running cached nodes; future per-member interrupt should add explicit member identity, not overload this method. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Runtime cancellation command | `interrupt` | Yes | Low | Use consistently in native/server code. |
| Runtime inbox | `AgentEventInbox` | Yes | Low | Use this name for all typed inbound agent events; do not call the low-level queue store the inbox owner. |
| Runtime scheduler | `AgentEventScheduler` | Yes | Low | Use this name for dispatch policy; do not hide routing in the worker loop. |
| Inbox event handlers | `*InboxEventHandler` | Yes | Low | Use handler language because these classes handle scheduler-selected inbox entries and delegate; do not confuse them with processor pipelines or old normal-flow handlers. |
| Terminal runtime shutdown | `stop` | Yes | Low | Keep only for terminal shutdown. |
| Client command | `INTERRUPT_GENERATION` | Yes | Low | Preserve current app-owned protocol and do not reintroduce stop-generation naming. |
| Active cancellation object | `AgentTurn` signal/interruption | Yes | Low | Avoid separate generic cancellation manager unless needed. |
| Status | `interrupting` | Yes | Low | No terminal `interrupted` agent status; final status is idle with turn interrupted event. |

## Applied Patterns (If Any)

- State machine inside `AgentTurn`: active, interrupting, interrupted/settled. This is bounded inside the turn owner.
- Adapter pattern at LLM providers and tools: BaseLLM/BaseTool accept generic signal options; providers/tools translate to SDK/process/MCP mechanisms.
- Event loop pattern remains inside `AgentWorker`; it may keep dispatching eligible inbox event entries while one active turn's private execution is running, but `AgentEventScheduler` still enforces one active turn.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/event-inbox/` | Folder | Agent event inbox | Unified inbound event boundary, scheduler, handlers, and private queue storage. | Names the agent inbox separately from event storage and turn loop execution. | LLM/tool phase execution or provider/tool cancellation. |
| `autobyteus-ts/src/agent/event-inbox/agent-event-inbox.ts` | File | AgentEventInbox | `post`, `postAwaitable`, lane availability, candidate peek, claim, parking, and awaitable reply APIs over private queue storage. | Single semantic inbound boundary with typed lanes. | Handler dispatch policy or phase control flow. |
| `autobyteus-ts/src/agent/event-inbox/inbox-queue-store.ts` | File | InboxQueueStore | Low-level async queue/availability storage for inbox lanes. | Private storage mechanics with no domain routing. | Event eligibility or handler dispatch. |
| `autobyteus-ts/src/agent/event-inbox/agent-event-scheduler.ts` | File | AgentEventScheduler | Select dispatchable event entries and handlers by event class/lane and runtime/turn state. | Explicit owner for scheduling policy. | LLM/tool phase execution. |
| `autobyteus-ts/src/agent/event-inbox/handlers/` | Folder | Typed InboxEventHandlers | Turn-start, tool-approval, tool-result, and lifecycle entry handlers. | Keeps event handling/delegation explicit without old phase choreography. | LLM/tool phase execution chain. |
| `autobyteus-ts/src/agent/loop/` | Folder | Agent turn loop execution | Finite per-turn runner, direct phase services, turn tool input port, and continuation builders. | Makes the agent loop start/end boundary explicit. | Long-lived worker stop/shutdown policy or provider-specific cancellation. |
| `autobyteus-ts/src/agent/loop/agent-turn-runner.ts` | File | AgentTurnRunner | Runs one agent turn algorithm and returns final/interrupted outcome to `AgentTurn`. | One concrete runner owner for finite loop semantics; execution handle/settlement storage is in `AgentTurn`. | Transport protocol, terminal shutdown code, runtime-state clearing, or active task storage. |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | File | LlmPhase | Runs the LLM phase under `TurnExecutionScope`. | Direct phase owner replaces queued LLM-ready handler control flow. | Tool execution, worker scheduling, provider-specific SDK branching. |
| `autobyteus-ts/src/agent/loop/tool-phase.ts` | File | ToolPhase | Runs approval/execution/result collection under `TurnExecutionScope`. | Direct phase owner replaces queued tool request/execution/result handler control flow. | Provider/terminal process internals or worker scheduling. |
| `autobyteus-ts/src/agent/loop/turn-tool-input-port.ts` | File | TurnToolInputPort | Internal wait/post/fence port for validated tool approvals and future async tool results. | Keeps turn-scoped tool input delivery private to the turn while inbound entry uses AgentEventInbox. | New-turn scheduling or lifecycle events. |
| `autobyteus-ts/src/agent/loop/tool-result-continuation-builder.ts` | File | ToolResultContinuationBuilder | Builds SenderType.TOOL continuation input from settled tool results. | Preserves current tool-result message shape for direct runner reuse. | Input processor execution or LLM calls. |
| `autobyteus-ts/src/agent/pipelines/` | Folder | Agent processor pipelines | Shared orchestration for input, tool invocation, tool result, LLM response/output, and optional common pipeline runner. | Keeps processor orchestration explicit without moving concrete processors out of their existing folders. | Worker scheduling, turn-loop ownership, or provider execution. |
| `autobyteus-ts/src/agent/pipelines/processor-pipeline-runner.ts` | File | ProcessorPipelineRunner | Common ordered execution helper for typed pipeline services. | Shared mechanics only; domain pipelines own contracts. | Generic untyped handler semantics or turn control flow. |
| `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts` | File | AgentInputPipeline | Applies input processors and builds LLM-ready input for external/tool input. | Single owner of the current input transformation contract. | Tool result aggregation. |
| `autobyteus-ts/src/agent/pipelines/tool-invocation-pipeline.ts` | File | ToolInvocationPipeline | Applies tool invocation preprocessors. | Single owner of invocation pre-execute processing. | Tool execution or approval UI transport. |
| `autobyteus-ts/src/agent/pipelines/tool-result-pipeline.ts` | File | ToolResultPipeline | Applies tool execution result processors. | Single owner of post-tool processing before continuation. | Continuation message formatting. |
| `autobyteus-ts/src/agent/pipelines/llm-response-pipeline.ts` | File | LLMResponsePipeline | Applies LLM response/output processors and final assistant emission policy. | Single owner of response processor orchestration. | LLM streaming/provider code. |
| `autobyteus-ts/src/agent/pipelines/system-prompt-pipeline.ts` | File | SystemPromptPipeline | Applies system prompt processors for bootstrap. | Single owner of system prompt processor orchestration. | Runtime init or turn execution. |
| `autobyteus-ts/src/agent/events/notifiers.ts` | File | AgentExternalEventNotifier | Publish assistant/tool/segment/lifecycle/error/artifact messages through semantic `notify...` methods above `EventEmitter` / `EventManager`. | Existing single external observable-event boundary; final design removes `agent/outbox`. | Input box scheduling, turn control flow, or provider execution. |
| `autobyteus-ts/src/memory/memory-manager.ts` | File | MemoryManager | Raw trace retention, working-context messages, snapshots/compaction integration, and interrupted-turn LLM-safe projection. | Existing memory owner is the future LLM context source. | Turn execution handle, scheduler dispatch, or provider/tool cancellation. |
| `autobyteus-ts/src/memory/working-context-llm-safe-projector.ts` (optional) | File | Interrupted-turn projection helper | Focused LLM-safe projection of interrupted-turn facts if needed. | Keeps projection logic memory-owned and testable if it grows. | Agent turn execution or inbox routing. |
| `autobyteus-ts/src/agent/interruption/` | Folder | Agent interruption support | Small concrete support area for interruption types/utilities. | Shared by runtime, turn state, phase services, tests. | Runtime lifecycle ownership or provider-specific cancellation. |
| `autobyteus-ts/src/agent/interruption/agent-interruption.ts` | File | Interruption model | Options/result/error/guards. | One semantic data shape. | Stop/terminate semantics. |
| `autobyteus-ts/src/agent/interruption/abortable-operation.ts` | File | Abortable operation utility | Promise/iterator abort racing and late-result logging. | Reused by `TurnExecutionScope`, `LlmPhase`, and `ToolPhase`. | Provider/tool-specific behavior. |
| `autobyteus-ts/src/agent/agent-turn.ts` | File | AgentTurn | Turn signal, private execution handle, operation, settlement, tool input port, and batch fencing. | Existing active turn owner becomes aggregate root for execution lifecycle only. | Queue storage, runtime status emission, public lifecycle commands, or working-context rollback/projection. |
| `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | File | AgentRuntimeState | Active-turn reference, creation, active-turn identity routing, and clear-by-turn-ID after settlement. | Existing state owner narrowed to the active-turn selector. | Public runtime command API, runner promise storage, port internals, or turn-local cleanup/fencing. |
| `autobyteus-ts/src/agent/runtime/agent-runtime.ts` | File | AgentRuntime | `interrupt()` authoritative command, `postToolApprovalEvent()` awaitable inbox submission command, and status projection. | Existing lifecycle/command owner. | Provider/tool-specific abort or direct TurnToolInputPort bypass without scheduler/state validation. |
| `autobyteus-ts/src/agent/agent.ts` | File | Agent facade | Public native methods including `interrupt()` and `postToolExecutionApproval(...)`, delegating to runtime. | Existing facade owner. | Active-turn validation or inbox mutation. |
| `autobyteus-ts/src/agent/events/` | Folder | Event model | Observable lifecycle/status event definitions and event-store projections. | Events remain for lifecycle/observation; inbox storage moves under `agent/event-inbox`. | Normal LLM/tool/continuation turn control or inbox storage. |
| `autobyteus-ts/src/agent/streaming/` | Folder | Streaming/event publication | Segment and stream payload handling behind `AgentExternalEventNotifier`. | Streaming is an external event subscriber/segment concern. | Turn-loop advancement. |
| `autobyteus-ts/src/llm/` / `src/llm/api/` | Folder/files | LLM boundary | Signal-aware invocation API and provider mapping. | Existing provider subsystem. | Agent turn cleanup. |
| `autobyteus-ts/src/tools/` | Folder/files | Tool boundary | Signal-aware execution API and concrete cancellation. | Existing tool subsystem. | Runtime status policy. |
| `autobyteus-ts/src/agent-team/runtime/agent-team-runtime.ts` | File | Team runtime | Native team interrupt command. | Existing team lifecycle owner. | Member lookup internals beyond TeamManager call. |
| `autobyteus-ts/src/agent-team/context/team-manager.ts` | File | TeamManager | Interrupt running cached nodes. | Existing member registry owner. | Team status derivation. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/` | Folder | Server native backend | Adapt server interrupt to native agent interrupt and server approval to native `postToolExecutionApproval`. | Existing runtime-kind adapter. | Stop fallback or direct inbox/active-turn-port writes. |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/` | Folder | Server native team backend | Adapt server team interrupt to native team interrupt. | Existing team backend adapter. | Team shutdown fallback. |
| `autobyteus-web/services/agentStreaming/` | Folder | Frontend streaming protocol | Send interrupt command and handle interrupted lifecycle. | Existing streaming service. | Runtime logic. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent/event-inbox` | Main-Line Domain-Control | Yes | Medium | Unified inbound boundary plus scheduler/handlers; keep storage private and keep LLM/tool phase work in `agent/loop`. |
| `agent/loop` | Main-Line Domain-Control | Yes | Medium | New runner boundary must contain only finite per-turn control flow and turn-local continuation construction, not long-lived worker lifecycle. |
| `agent/pipelines` | Off-Spine Concern | Yes | Medium | Shared processor pipeline orchestrators used by the turn runner and final phase services; must not become the agent loop itself. |
| `agent/events/notifiers.ts` | Off-Spine Concern | Yes | Low | Existing outbound observable-event boundary above `EventEmitter` / `EventManager`; no separate outbox folder. |
| `agent/interruption` | Off-Spine Concern | Yes | Low | Concrete support for AgentRuntime/AgentTurn, not generic shared cancellation. |
| `agent/runtime` | Main-Line Domain-Control | Yes | Low | Runtime command owner remains here. |
| `agent/context` | Main-Line Domain-Control | Yes | Medium | RuntimeState already large; narrow it to active-turn reference/identity routing and move turn-local cleanup/fencing into `AgentTurn`; remove working-context restore policy from runtime state. |
| `memory` | Off-Spine Concern | Yes | Medium | Memory owns raw traces and working-context projection used by LLM requests; LLM-safe projection after stopped continuation belongs here, not under turn execution. |
| `llm/api` | Persistence-Provider/Adapter | Yes | Low | Provider-specific cancellation belongs here. |
| `tools/terminal` | Persistence-Provider/Adapter | Yes | Low | Terminal process cancellation belongs here. |
| `server-ts/agent-execution/backends/autobyteus` | Transport/Adapter | Yes | Low | Server adapter only maps command to native public API. |
| `autobyteus-web/services/agentStreaming` | Transport | Yes | Low | Protocol command/status mapping only. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Native interrupt command | `await agent.interrupt({ reason: 'User interrupted generation' })` -> runtime interrupts active turn execution scope -> idle | `await agent.stop()` from backend interrupt | Shows interrupt is not shutdown. |
| Turn execution scope | `turn.executionScope.runOperation(meta, async scope => llmPhase.run(scope))` | Each phase service creates its own `new AbortController()` and local race policy | Establishes one architectural interrupt container for the turn. |
| LLM signal API | `llm.streamMessages(messages, payload, providerKwargs, { signal: scope.signal, turnId })` | `providerKwargs.signal = turn.signal` | Keeps provider params separate from runtime control and makes signal passing adapter plumbing from the scope. |
| Tool signal API | `tool.execute(context, args, { signal, turnId, invocationId })` | Runner/phase code checks `if (toolName === 'run_bash') kill terminal` | Keeps tool cancellation behind BaseTool/concrete tools. |
| Tool continuation input | `ToolResultContinuationBuilder.build(results)` -> `AgentInputPipeline.processForLlm(senderType=TOOL, startsNewTurn=false)` | Runner calls LLM directly with formatted raw tool results | Preserves current tool-result-as-user-input and input processor behavior. |
| Interrupted tool result | emit `TOOL_EXECUTION_INTERRUPTED`, mark invocation settled, return without `ToolResultEvent` | throw error -> `TOOL_EXECUTION_FAILED` -> tool continuation | Prevents interruption becoming failure or continuation. |
| Turn-local fencing | `AgentTurn.closeForInterruption()` / `TurnToolInputPort.close('interrupted')` fences expected invocation IDs | queue manager imports every domain event and decides turn identity | Preserves queue/storage boundary and keeps turn-internal cleanup inside `AgentTurn`. |
| Team interrupt | `team.interrupt()` -> `TeamManager.interruptRunningNodes()` | `team.stop()` | Team interrupt should keep team run alive. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep native `interrupt()` as stop fallback when `agent.interrupt` missing | Would avoid changing backend interface immediately. | Rejected | Add native interrupt API and return unsupported result if adapter receives an incompatible object. |
| Support both `STOP_GENERATION` and `INTERRUPT_GENERATION` indefinitely | Avoids updating older app code/tests. | Rejected | Current ticket code uses `INTERRUPT_GENERATION`; keep a clean single command. If external clients exist, document release note rather than dual path. |
| Treat abort exceptions as normal tool/LLM failures | Reuses existing error handling. | Rejected | Normalize to `AgentInterruptionError` and interrupted lifecycle events. |
| Let interrupted tool result flow through `ToolResultEvent` with an error string | Reuses continuation pipeline. | Rejected | Emit interrupted lifecycle and suppress tool continuation. |
| Add a second local AbortController in each phase service | Fast local patch. | Rejected | Active `AgentTurn` owns the one signal for the turn. |

## Derived Layering (If Useful)

- UI/transport layer: sends `INTERRUPT_GENERATION` and receives interrupted events/status.
- Server runtime adapter layer: maps command to `AgentRunBackend.interrupt()` / native `agent.interrupt()`.
- Runtime control layer: `AgentRuntime` / `AgentTeamRuntime` own command semantics.
- Active turn layer: `AgentTurn` owns cancellation state, private execution, and turn cleanup; `AgentRuntimeState` only selects/routes the active turn.
- Phase service layer: LLM and tool phase services translate turn interruption to phase outcome.
- Provider/tool adapter layer: LLM providers and concrete tools translate AbortSignal to transport/process cancellation.

Layering follows ownership; callers above runtime must not depend directly on active-turn internals.

## Key Tradeoffs

- Use turn-scoped AbortSignal instead of worker-loop cancellation: preserves serialized worker design and gives the current phase operation a direct cancellation signal.
- Add explicit interrupted events rather than overloading failure/completion: clearer semantics but requires protocol/frontend updates.
- Locally abandon promises that ignore AbortSignal: necessary for responsiveness, with late-result suppression and late-rejection logging to manage risk.
- Interrupt all running cached team nodes for this requirement: simpler and consistent with existing Codex/Claude team-manager implementations; per-member interrupt requires a future explicit member identity contract.
- Rename app-owned protocol command: larger change than only native backend fix, but removes the stop/interrupt ambiguity that caused the problem.

## Risks

- Provider SDK signal support may differ. Implementation must verify each SDK call signature and keep unsupported providers locally abandonable via the abortable operation utility.
- Remote MCP tools may continue executing after local interruption. The runtime must surface local interruption and ignore late results; true remote cancellation may be best-effort.
- If a tool performs irreversible side effects before observing the signal, interruption cannot roll them back.
- LLM-safe working-context projection must be carefully implemented so interrupted turns do not corrupt compaction snapshots, future LLM context, or native tool-call protocol while still preserving accepted history.
- Frontend/status tests may need updates because `interrupting` is a new non-terminal state and `interrupted` is an event, not a final agent status.

## Guidance For Implementation

- Start with core runtime tests using controllable LLM/tool mocks before touching provider adapters.
- Keep `stop()` tests passing unchanged.
- Make interruption settlement idempotent. Repeated interrupt requests for the same turn should return the same/safe result and not duplicate turn/tool lifecycle events.
- In abortable operation utilities, attach a catch handler to the abandoned promise/iterator path to prevent unhandled late rejections.
- On interrupted tool execution, ask `AgentTurn` / `TurnToolInputPort` to fence the active invocation ID and every expected invocation ID in the active batch; do not store that fencing set in `AgentRuntimeState`.
- Add `turn_id` to turn-local events/continuation records so `AgentTurn` / `TurnToolInputPort` fencing can drop stale work without dropping later real user events.
- Provider adapters should normalize native abort errors into `AgentInterruptionError` or allow the `TurnExecutionScope` / abortable-operation utility to do so; do not emit normal LLM errors for user interrupts.
- Server backend tests should explicitly assert `stop` is not called by `interrupt`.
- Server/native approval tests should assert `AgentRunBackend.approveToolInvocation` calls `agent.postToolExecutionApproval`, which calls `AgentRuntime.postToolApprovalEvent`, and valid approvals wake `ToolPhase.waitForApproval` through `TurnToolInputPort`.
- Post-interrupt approval tests should assert stale approvals return explicit stale/interrupted/no-pending results and do not start a new turn.
- Frontend tests should assert the interrupt command is sent and `isSending` clears only on interrupted/idle stream feedback, not optimistically at button click.
- Frontend/team communication tests should assert `INTER_AGENT_MESSAGE` still creates conversation inter-agent segments and derived `TEAM_COMMUNICATION_MESSAGE` still updates `teamCommunicationStore`; this is required because `AgentOutbox` removal must not remove `AgentExternalEventNotifier` inter-agent publications.
