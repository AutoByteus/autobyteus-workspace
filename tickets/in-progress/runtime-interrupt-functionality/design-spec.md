# Design Spec

## Current-State Read

This design update is a second-stage refactor on top of the current ticket worktree, not a new ticket. The first-stage implementation already introduced native interrupt semantics and extracted the hidden turn loop from old normal-flow event handlers.

Current implemented single-agent runtime path in this worktree:

`Agent.postUserMessage() -> AgentRuntime.submitEvent(UserMessageReceivedEvent) -> AgentMessageInbox.postUserMessage(...) -> AgentWorker.asyncRun() -> AgentMessageScheduler.nextDispatchable(...) -> TurnStartMessageHandler -> AgentRuntimeState.startActiveTurn(...) -> AgentTurnRunner.run(event) -> AgentInputPipeline -> LlmPhase -> ToolPhase -> ToolResultPipeline -> ToolResultContinuationBuilder -> AgentInputPipeline(SenderType.TOOL) -> LLMResponsePipeline + AgentExternalEventNotifier notifications -> AgentIdleEvent`

Current implemented approval path:

`Server approve/deny command -> AgentRunBackend.approveToolInvocation(...) -> AutoByteusAgentRunBackend.approveToolInvocation(...) -> Agent.postToolExecutionApproval(...) -> AgentRuntime.postToolApproval(ToolApprovalInputMessage) -> AgentMessageInbox.postToolApproval(...) -> AgentMessageScheduler -> ToolApprovalMessageHandler -> AgentRuntimeState.postToolApprovalToActiveTurn(...) -> TurnToolInputPort.postApproval(...) -> ToolPhase.waitForApproval(...)`

Current implemented interrupt path:

`AgentRunBackend.interrupt(...) / Agent.interrupt(...) -> AgentRuntime.interrupt(...) -> AgentRuntimeState.interruptActiveTurn(...) -> AgentTurn.executionScope.interrupt(...) -> LlmPhase / ToolPhase await boundary observes interruption -> AgentTurnRunner settles interrupted -> runtime remains reusable`

Important current-state improvements already present:

- `WorkerEventDispatcher` and old normal-flow `agent/handlers/*` turn-control choreography are removed from the implemented normal LLM/tool/continuation path.
- `AgentTurnRunner`, `LlmPhase`, `ToolPhase`, typed processor pipelines, and `TurnExecutionScope` now own the core turn flow; `AgentExternalEventNotifier` remains the external observable-event boundary.
- Current first-stage inbox code introduced a useful mailbox/scheduler shape, but it also introduced message-wrapper terminology around an event-oriented runtime.
- `TurnToolInputPort` is currently the active-turn approval wait/post primitive; dormant tool-result/continuation lanes were removed in the implemented code.

Remaining design pressure exposed by the user discussion:

- Autobyteus already has typed runtime events. A target flow that wraps `UserMessageReceivedEvent` into `UserInboxMessage` only to unwrap the event again creates duplicate domain representations.
- `AgentMessageInbox` / `AgentInboxMessage` remain message-wrapper names around an event-oriented runtime, and the low-level queue store should remain private storage, not the domain boundary.
- Scheduling and event processing are still implicit in `AgentWorker` / `AgentRuntime` branches rather than explicit `AgentEventScheduler` and typed `AgentEventProcessor`s.
- If tool approvals/results are treated as active-turn events, the inbox loop cannot block behind `await AgentTurnRunner.run(...)`; it must keep processing active-turn events while a runner task is active.

Therefore the next target design keeps the successful turn-runner/phase/pipeline extraction but refactors the remaining inbound side into:

`Typed runtime event -> AgentEventInbox entry -> AgentWorker inbox loop -> AgentEventScheduler -> typed AgentEventProcessor -> AgentTurnRunner / lifecycle / TurnToolInputPort`

`TurnToolInputPort` remains as an internal per-turn tool-phase wait/wake port used by tool event processors and `ToolPhase`; it is not a second architecture-facing inbox.

## Intended Change

Add first-class native Autobyteus interruption as a turn-scoped runtime-control capability:

- `stop()` remains terminal runtime shutdown.
- `interrupt()` means cancel the currently active turn/generation and keep the runtime/session reusable.
- `AgentRuntime` is the public authoritative command boundary for native agent interruption.
- `AgentTurn` owns an interruptible **turn execution scope**, not just a loose AbortController. The scope owns the active turn AbortSignal, interrupted flag, active operation metadata, settlement state, abort listeners, and late-result fencing.
- Introduce a finite **AgentTurnRunner / AgentLoopRunner** boundary for the per-trigger reasoning loop: user/inter-agent/tool-continuation input -> LLM -> tool batch -> tool result continuation -> next LLM -> final answer/idle.
- `AgentWorker` remains the long-lived runtime mailbox/scheduler, not the semantic owner of the agent reasoning loop.
- LLM/tool phases run under the active turn runner and turn execution scope. Passing `{ signal }` into BaseLLM/BaseTool/provider/tool APIs is downstream adapter plumbing, not the architectural owner of interruption.
- `LlmPhase`, `ToolPhase`, LLM providers, concrete tools, and selected built-in tool adapters receive the active turn scope/signal and translate it into provider/tool cancellation or local abandonment.
- Interrupted turns settle to idle with explicit interruption metadata, not success, error, or shutdown.
- Native server Autobyteus backends call native `interrupt()` APIs instead of `stop()`.
- Native team interrupt propagates to currently running member agents/sub-teams without invoking team shutdown cleanup.
- Second-stage inbound refactor replaces the architecture-facing `AgentMessageInbox` / `AgentInboxMessage` message-wrapper model with one event-centric `AgentEventInbox`, explicit `AgentEventScheduler`, typed `AgentEventProcessor`s, and an internal `TurnToolInputPort`.
- `AgentWorker` runs the runtime inbox loop and lifecycle work; `AgentEventScheduler` owns dispatchability and routing policy; event processors are entry processors that call pipelines/domain owners without recreating the old LLM/tool event-handler chain.

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

After the first-stage implementation, `AgentWorker` is no longer the semantic owner of the LLM/tool reasoning loop. It still owns a long-running runtime loop, bootstrap, stop/shutdown, and event intake. The remaining boundary improvement is to split **event scheduling and event processing** out of the worker so the inbound architecture is readable.

Target concepts:

| Concept | Lifetime | Responsibility | Must Not Own |
| --- | --- | --- | --- |
| `AgentRuntime` | Agent session | Public lifecycle/control: start, stop, interrupt, submit typed events, expose status, own inbox/state/worker and external-event notifier lifecycle. | LLM/tool phase execution, provider cancellation details, event processor internals. |
| `AgentEventInbox` | Runtime session | Store typed event entries using semantic lanes, preserve parked work, and expose lane/claim/awaitable-reply primitives to the scheduler. | Scheduling policy, turn-loop decisions, LLM/tool execution, runtime shutdown cleanup. |
| `AgentWorker` | Runtime worker loop | Bootstrap, run the inbox loop, call `AgentEventScheduler`, coordinate terminal shutdown. | Event routing policy and normal LLM/tool phase progression. |
| `AgentEventScheduler` | Runtime session | Choose what inbound event entry is dispatchable given inbox lanes plus runtime/turn state; invoke the correct typed event processor. | Queue storage mechanics, processor logic, LLM/tool phase work, provider/tool cancellation. |
| `AgentEventProcessor` | One event family | Process one inbound event family and call the appropriate domain owner or pipeline. | Chaining LLM/tool phases as a hidden runner. |
| `AgentTurn` | One active turn | Turn identity, active batches, `TurnToolInputPort`, execution scope, settlement state. | Runtime inbox storage or public lifecycle commands. |
| `AgentTurnRunner` | One active turn task | Finite reasoning loop: process input, call LLM, run tools, feed continuations, finish/interrupted settlement. | Runtime inbox loop, scheduling queued external messages, server/frontend protocol. |

Critical scheduler change:

The worker must not rely on a single blocking loop shaped as `event -> start runner -> await runner -> read next event` if active-turn events are posted to the inbox. Instead the target loop is:

```ts
while (runtime.running) {
  const entry = await scheduler.nextDispatchable({ inbox, runtimeState, signal: workerSignal });
  await scheduler.dispatch(entry);
}
```

`TurnStartEventProcessor` starts the `AgentTurnRunner` as the active turn task and registers a settlement callback; the worker loop keeps monitoring the inbox. While the runner is active:

- valid active-turn events, such as tool approval/denial, are dispatched immediately to active-turn processors;
- unrelated external user/inter-agent events remain parked in `AgentEventInbox` until the active turn settles;
- lifecycle stop/shutdown events remain dispatchable according to lifecycle policy;
- interrupt remains side-band via `AgentRuntime.interrupt()` and does not wait for inbox dispatch.

This preserves one-active-turn semantics while making a unified inbox possible.

Final implementation rule:

- `AgentTurnRunner` remains the only owner of normal LLM/tool/continuation progression.
- `AgentEventScheduler` owns inbound dispatchability and routing policy only.
- Typed event processors are entry processors; they may call pipelines/domain owners but must not recreate the deleted old chain: `UserHandler -> LLMHandler -> ToolHandler -> ToolResultHandler -> LLMHandler`.
- Public event/stream notifications remain external observations, not hidden turn-control messages.

## Concept Inventory Before Spines

Before choosing file changes, the architecture should make these concepts explicit:

| Concept | Meaning | Current Representation | Target Responsibility | Notes |
| --- | --- | --- | --- | --- |
| Runtime control plane | Public commands and lifecycle for a running agent session. | `AgentRuntime`, server backend adapters. | `start`, terminal `stop`, side-band `interrupt`, inbound event submission, active-turn approval command. | Runtime owns the inbox/scheduler/worker but does not own event processor internals or LLM/tool phases. |
| Runtime lifecycle pipeline | Bootstrap and terminal shutdown work for the whole runtime. | `AgentWorker.initialize/runtimeInit`, `AgentBootstrapper`, shutdown orchestrator. | Run bootstrap before dispatching turn-starting events; run shutdown exactly once on terminal stop/worker exit. | Normal interrupt never runs shutdown cleanup. |
| AgentEventInbox | One semantic inbound event boundary for the agent. | Current first-stage inbox plus approval path through `AgentRuntimeState`/`TurnToolInputPort`. | Store typed event entries for user/inter-agent triggers, lifecycle events, active-turn approval/result events, and parked future work; expose lane/claim APIs to the scheduler. | Replaces architecture-facing `AgentMessageInbox`/message wrappers; it is one event inbox with lanes, not one flat FIFO. |
| InboxQueueStore | Low-level queue/availability storage. | Current `message-inbox/inbox-queue-store.ts`. | Generic queue primitives behind `AgentEventInbox`. | Storage only; no domain routing, no “event manager” ownership. |
| AgentEventScheduler | Runtime event-routing policy. | Implicit `AgentWorker` / `AgentRuntime` branches. | Decide dispatchability by event class/lane, active-turn state, lifecycle state, and stop state using inbox lane APIs; invoke typed event processors. | Prevents worker or inbox storage from becoming a routing blob. |
| AgentEventProcessor | Entry processor for one inbound event family. | Currently implicit branches and direct runtime/state calls. | Validate/normalize one event family and call the right domain owner or processor pipeline. | Event processors are not LLM/tool phase owners. |
| TurnToolInputPort | Internal turn-scoped tool input wait/wake port. | Current `turn-tool-input-port.ts` approval wait/post primitive. | Deliver validated tool approvals and future async tool results to the current `ToolPhase`. | Internal to `AgentTurn` / `ToolPhase`; not a second public inbox. |
| AgentExternalEventNotifier | External observable-event boundary for agent-produced facts/data. | `AgentExternalEventNotifier`, `EventEmitter` / `EventManager`, `AgentEventStream`. | Publish assistant output, segment deltas, tool lifecycle/logs, approvals, errors, artifacts, state updates, turn lifecycle. | External events do not advance turn control flow and are separate from inbound event inbox entries. |
| Agent turn | One finite unit of agent reasoning started by a turn-starting event. | `AgentTurn` with turn ID, batch, scope, current tool-approval wait primitive. | Turn ID, active batches, `TurnToolInputPort`, execution scope, settlement/interruption metadata. | TOOL continuations stay inside the same turn. |
| Agent turn runner / agent loop | Finite reasoning loop for one turn. | `AgentTurnRunner`. | Process input, call LLM, run tools, feed tool continuations, finish or settle interrupted. | This remains the core domain boundary. |
| Turn execution scope | Cancellation/operation scope for one turn. | `TurnExecutionScope`. | Abort signal, active operation, abort callbacks, `AgentInterruptionError`, late-result fencing. | Mechanical cancellation primitive used by runner phases. |
| Processor | Ordered custom extension point for one domain transformation. | Existing input, LLM response, tool result, tool invocation, system prompt processors. | Remain concrete domain processors with `getOrder()` semantics. | Do not collapse differing contracts into one generic processor. |
| Processor pipeline | Orchestrator that applies processors for one area. | `agent/pipelines/*`. | Shared pipeline services for input, tool invocation, tool result, LLM response/output, system prompt. | Called by event processors/runners/phases as appropriate. |
| Tool result continuation builder | Ordered tool results -> TOOL-sender input message. | `ToolResultContinuationBuilder`. | Preserve current aggregate message shape, denied/error/success formatting, `ContextFile` attachments. | Feeds `AgentInputPipeline`, never raw LLM. |
| LLM/tool phase services | Turn-local phase work. | `LlmPhase`, `ToolPhase`. | Execute one LLM or tool phase under `TurnExecutionScope`. | Event processors must not own this work. |
| Event/notification stream | Observability and client updates. | Notifier, stream events, WebSocket mappers. | Report statuses, stream segments, tool lifecycle, turn interrupted/completed. | Observes facts; does not drive the internal loop. |

Design rule: **the inbox stores typed event entries; the scheduler chooses the event processor; processors call pipelines/domain owners; the runner controls turn-local LLM/tool flow; the execution scope interrupts active operations; `AgentExternalEventNotifier` notifies external observers.**

## Corrected Conceptual Data-Flow Spines

These are the spines the implementation should preserve or create. The later detailed file mapping should be checked against them.

| Spine ID | Name | Start | Main Path | End / Outcome | Owner |
| --- | --- | --- | --- | --- | --- |
| CDF-001 | Runtime bootstrap | `AgentRuntime.start()` | `AgentWorker` runtime init -> `AgentBootstrapper` / `SystemPromptPipeline` -> ready/idle notification -> inbox loop begins dispatching turn-starting events | Agent ready for event dispatch | `AgentRuntime` / `AgentWorker` |
| CDF-002 | External trigger to turn | `UserMessageReceivedEvent` / `InterAgentMessageReceivedEvent` enters `AgentEventInbox` | inbox stores typed event entry -> worker loop asks scheduler for next dispatchable entry -> scheduler claims turn-starting event when idle -> `TurnStartEventProcessor` checks no active turn -> creates `AgentTurn` -> starts `AgentTurnRunner` task | One active runner owns the trigger while inbox loop stays alive | `AgentEventInbox` / `AgentEventScheduler` / `TurnStartEventProcessor` |
| CDF-003 | Input processing to LLM leg | External trigger or TOOL continuation | `AgentInputPipeline` applies input processors -> builds LLM user message with correct turn ID | LLM phase receives processed LLM input | `AgentInputPipeline` / `AgentTurnRunner` |
| CDF-004 | LLM phase | Processed LLM input | LLM request assembly/compaction -> provider stream under `TurnExecutionScope` -> streaming parser/segment events | Final response or tool invocations | `AgentTurnRunner` / `LlmPhase` |
| CDF-005 | Final response / output | LLM final response with no tool continuation | LLM response/output pipeline -> response processors -> assistant complete/final notification | Turn completed and idle | `LLMResponsePipeline` / `AgentTurnRunner` |
| CDF-006 | Tool invocation phase | Parsed LLM tool invocations | tool invocation preprocessors -> approval if needed -> approval wait through `TurnToolInputPort` -> tool execution under `TurnExecutionScope` -> ordered tool results | Ordered tool results or interruption | `AgentTurnRunner` / `ToolPhase` / `TurnToolInputPort` |
| CDF-007 | Tool result continuation | Ordered tool results from `ToolPhase` or active-turn `ToolResultEvent`s | tool result processors -> continuation builder -> `AgentInputPipeline` with `SenderType.TOOL` and existing active turn | Next processed LLM input in same turn | `ToolResultPipeline` / `ToolResultContinuationBuilder` / `AgentInputPipeline` |
| CDF-008 | Interrupt active turn | User control command, not inbox turn traffic | server/backend -> `AgentRuntime.interrupt()` -> active `AgentTurn.executionScope.interrupt()` -> active phase aborts/abandons | Runner settles turn interrupted; worker/inbox loop remains alive | `AgentRuntime` / `AgentTurnRunner` / `TurnExecutionScope` |
| CDF-009 | Pending approval response | Server/backend/native approval command arrives while turn waits | `AgentRunBackend.approveToolInvocation` -> native `Agent.postToolExecutionApproval` -> `AgentRuntime.postToolApprovalEvent(ToolExecutionApprovalEvent)` -> `AgentEventInbox.postAwaitableEvent(...)` -> scheduler -> `ToolApprovalEventProcessor` -> state validation -> `TurnToolInputPort.postApproval` -> `ToolPhase.waitForApproval` resumes | Tool phase resumes approved/denied, or explicit stale/no-active/no-pending/interrupted result is returned without starting a turn | `AgentEventInbox` / `AgentEventScheduler` / `ToolApprovalEventProcessor` / `TurnToolInputPort` |
| CDF-010 | External observable-event publication | Domain fact or agent-produced output occurs in any spine | phase/pipeline/runtime calls `AgentExternalEventNotifier.notify...` -> `EventEmitter`/`EventManager` -> `AgentEventStream` -> backend/WebSocket/frontend | Client sees assistant output/status/segments/tool lifecycle/turn outcome | `AgentExternalEventNotifier` + event/stream pipeline |
| CDF-010A | Inter-agent communication projection | Inter-agent/system message is accepted as an inbound trigger | input pipeline converts message for LLM use and publishes the observable communication fact through `AgentExternalEventNotifier` -> stream/server/team processors enrich and derive team communication events -> frontend renders conversation/team communication projections | Existing consumers continue to see inter-agent communication after outbox removal | `AgentInputPipeline` + `AgentExternalEventNotifier` + team event processors |
| CDF-011 | Terminal shutdown | `AgentRuntime.stop()` / lifecycle stop message | mark stopping -> side-band cancel active turn if needed -> lifecycle handler/shutdown orchestrator cleans LLM/tools/MCP/resources exactly once -> stopped | Runtime lifecycle complete | `AgentRuntime` / `AgentWorker` / shutdown lifecycle pipeline |
| CDF-012 | External/async tool result delivery | External tool host/callback submits `ToolResultEvent` for an active invocation | `ToolResultEvent` enters `AgentEventInbox` active-turn lane -> scheduler -> `ToolResultEventProcessor` -> `AgentRuntimeState` validates active turn/invocation -> `TurnToolInputPort.postToolResult` -> `ToolPhase.waitForToolResults` resumes -> CDF-007 tool result continuation | Valid async result joins the current tool batch, or stale/no-active/no-pending/interrupted result is dropped without starting a turn | `AgentEventInbox` / `AgentEventScheduler` / `ToolResultEventProcessor` / `TurnToolInputPort` / `ToolPhase` |

Important spine constraints:

- CDF-008 is side-band control. It must not be blocked behind inbox scheduling.
- CDF-009 and CDF-012 can use the unified inbox only because the worker inbox loop keeps running while the active `AgentTurnRunner` task is active.
- CDF-007 must go through CDF-003. Tool results must not be fed directly to the LLM.
- CDF-010 observes and reports facts. It must not be required to advance CDF-003 through CDF-007.
- CDF-010A is mandatory consumer compatibility: inter-agent/system communication events describe internal agent facts but must still be externally observable through the existing notifier/stream/server/frontend chain.
- CDF-002 enforces the one-active-turn invariant for turn-starting events; active-turn events can be dispatched while a turn is active but cannot create a second turn.
- CDF-001 and CDF-011 are runtime lifecycle spines. They must not be mixed into the per-turn runner and must not run during a normal generation interrupt.
- CDF-009 and CDF-012 are tool-specific active-turn event spines. If a future non-tool phase needs external input, it should get its own phase-specific wait/wake primitive rather than broadening `TurnToolInputPort`.

### Conceptual Spine Completeness Check

| Use Case / Scenario | Required Spine Coverage | Completeness Decision |
| --- | --- | --- |
| Runtime starts before turn-starting events are processed | CDF-001 gates CDF-002 through runtime ready/idle state. | Complete: bootstrap is lifecycle, not a turn. |
| User/inter-agent event starts work | CDF-002 starts exactly one runner task; CDF-003 through CDF-005 complete the normal LLM response path. | Complete: scheduler/processor/runner boundaries are explicit. |
| Tool call with in-process result | CDF-006 executes tool phase; CDF-007 feeds results through tool-result and input pipelines before the next LLM call. | Complete: raw tool results never go directly to LLM. |
| Tool approval arrives while the turn waits | CDF-009 routes through server/native/runtime inbox/scheduler/processor/state validation into `TurnToolInputPort`. | Complete: approval cannot start a new turn or bypass validation. |
| Tool result arrives asynchronously from outside the phase | CDF-012 routes through inbox/scheduler/processor/state validation into `TurnToolInputPort`, then rejoins CDF-007. | Complete for the target architecture; in-process tool results may still return directly inside `ToolPhase`. |
| Interrupt during LLM/tool/approval wait | CDF-008 interrupts the active scope side-band; CDF-006/CDF-009/CDF-012 are fenced by `TurnToolInputPort` and runtime state. | Complete: interrupt is not delayed behind inbox dispatch. |
| Later user event while turn is active | CDF-002 parks turn-starting events; scheduler keeps CDF-009/CDF-012/lifecycle events dispatchable. | Complete: one active turn is preserved without blocking active-turn events. |
| Outbound status/output/tool lifecycle | CDF-010 publishes through `AgentExternalEventNotifier` only. | Complete: external observable events never advance turn control flow. |
| Inter-agent/system communication consumers | CDF-010A preserves `INTER_AGENT_MESSAGE`, `TEAM_COMMUNICATION_MESSAGE`, and `SYSTEM_TASK_NOTIFICATION` consumer projections while removing `AgentOutbox`. | Complete: notifier remains semantic publication boundary; stream/server/frontend consumers stay compatible. |
| Terminal stop/shutdown | CDF-011 runs shutdown cleanup exactly once and remains separate from normal interrupt. | Complete: stop and interrupt semantics remain distinct. |

## Phase Naming Symmetry

Use the final symmetric phase names **`LlmPhase`** and **`ToolPhase`**. Do not keep `LlmTurnPhase` in the target architecture: the word `Turn` is redundant because both phases are owned by `AgentTurnRunner`, and the asymmetric pair `LlmTurnPhase` / `ToolPhase` makes the model harder to read. Do not use `LlmCallPhase`, because the phase owns more than a raw provider call: request assembly, context/compaction preparation, provider streaming, streaming parser integration, final/tool outcome production, and interrupted segment finalization.

## Agent Event Inbox / Scheduler / Event Processor Model

Autobyteus should remain **event-centric**. The final inbound model should not convert `Event -> Message -> Event` or introduce a second domain message representation. The runtime inbox stores **event entries/envelopes**: the canonical payload remains the original typed event, while the envelope adds delivery metadata such as lane, entry ID, and an optional awaitable completion for command-style callers.

Use the explicit names:

- **`AgentEventInbox`**: runtime inbound event mailbox with semantic lanes;
- **`AgentEventInboxEntry`**: small queue envelope around a typed event, not a new domain message;
- **`AgentEventScheduler`**: dispatchability and processor selection policy;
- **`AgentEventProcessor`**: thin entry processor for one event family;
- **`TurnToolInputPort`**: internal per-turn tool wait/wake primitive.

Do **not** expose `AgentMessageInbox`, `AgentInboxMessage`, `UserInboxMessage`, `ToolApprovalInputMessage`, `ToolResultInputMessage`, or equivalent domain-message wrappers in the target architecture. If implementation needs an internal queue record, call it an `Entry` or `Envelope` and keep the event as the canonical domain object.

Naming decision: do not use `ActiveTurnMessagePort` or `TurnAwaitableInputPort` in the final design. Those names are too broad and make the primitive sound like a second general inbox. The in-scope wait/wake responsibility is tool-specific: tool approval now, and future external/async tool result delivery if tool execution is externalized. If a future non-tool phase needs external input, define a separate phase-specific primitive instead of expanding this one.

The inbox is one semantic event boundary with typed lanes, not one undifferentiated FIFO:

| Inbox Lane | Accepted Typed Events | Dispatch Rule | Can Start New Turn? | Processor |
| --- | --- | --- | --- | --- |
| Turn-starting lane | `UserMessageReceivedEvent`, `InterAgentMessageReceivedEvent`, future external trigger events | Dispatch only when runtime is ready and no active turn exists; otherwise keep parked | Yes | `TurnStartEventProcessor` / specialized user and inter-agent processors if they later diverge |
| Active-turn lane | `ToolExecutionApprovalEvent`, externally submitted `ToolResultEvent`, future tool-specific external result events | Dispatch only when an active turn exists and event identity matches; otherwise stale/no-active/no-pending/interrupted outcome | No | `ToolApprovalEventProcessor`, `ToolResultEventProcessor` |
| Runtime lifecycle lane | `LifecycleEvent` subclasses such as bootstrap/shutdown/stopped/error/ready lifecycle events | Dispatch according to lifecycle state; terminal stop can preempt future turn starts | No | `RuntimeLifecycleEventProcessor` |
| Side-band control | `interrupt()` command | Bypasses inbox and directly targets active turn execution scope | No | `AgentRuntime.interrupt()` |

Conceptual event-entry shape:

```ts
type AgentEventInboxLane = 'turn_start' | 'active_turn' | 'runtime_lifecycle';

type AgentEventInboxEntry<TEvent extends BaseEvent = BaseEvent> = {
  entryId: string;
  lane: AgentEventInboxLane;
  event: TEvent;
  awaitable?: AwaitableCompletion<EventProcessorResult>;
};

class AgentEventInbox {
  postEvent(event: BaseEvent): Promise<void>;
  postAwaitableEvent(event: BaseEvent): Promise<EventProcessorResult>;
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
  dispatch(entry: AgentEventInboxEntry): Promise<EventProcessorResult>;
  wakeDispatchabilityChanged(): void;
}
```

`AgentEventInbox.postEvent(...)` owns lane classification for typed runtime events. `AgentEventScheduler.nextDispatchable(...)` owns dispatchability: when a turn is active it should prefer valid active-turn/lifecycle events and leave future user/inter-agent turn-starting events parked in `AgentEventInbox`. The scheduler waits on either inbox availability or runtime-state dispatchability changes, such as active-turn settlement. This avoids accidental second turns and avoids blocking tool approvals behind queued future user events.

Typed event processor shape:

```ts
interface AgentEventProcessor<TEvent extends BaseEvent = BaseEvent> {
  canProcess(event: BaseEvent): event is TEvent;
  process(entry: AgentEventInboxEntry<TEvent>, context: AgentContext): Promise<EventProcessorResult>;
}
```

Processor responsibilities:

- `TurnStartEventProcessor`: accepts `UserMessageReceivedEvent | InterAgentMessageReceivedEvent`, starts a new `AgentTurn` and `AgentTurnRunner` task when idle, then returns without owning the LLM/tool loop.
- `ToolApprovalEventProcessor`: accepts `ToolExecutionApprovalEvent`, validates active turn and pending invocation through `AgentRuntimeState`, posts to `TurnToolInputPort`, and resolves stale/no-active/no-pending/interrupted outcomes.
- `ToolResultEventProcessor`: accepts externally submitted `ToolResultEvent`, validates active turn/invocation for asynchronous tool results, then routes them to the active turn result port. In-process synchronous tool execution may still return results directly inside `ToolPhase`; do not force artificial queue hops inside one owner.
- `RuntimeLifecycleEventProcessor`: accepts lifecycle events and applies lifecycle/status/terminal shutdown coordination.

Design rule: **all inbound agent work enters as typed events in `AgentEventInbox`; scheduler dispatches event entries; event processors are entry points; the finite reasoning loop remains inside `AgentTurnRunner`.**

The current `AgentMessageInbox` implementation should be reshaped into `AgentEventInbox`. The current low-level queue storage should be named `InboxQueueStore` or equivalent and kept private to the inbox subsystem. The current `TurnToolInputPort` should remain internal to `AgentTurn` / turn phases.

## External Tool Approval / Denial Routing Model

Tool approval is an active-turn event. It may enter `AgentEventInbox`, but it is never eligible to start a new turn. The reason this is safe is the scheduler rule: the inbox loop keeps running while the active `AgentTurnRunner` task waits, and `AgentEventScheduler` dispatches active-turn events to active-turn processors instead of parking them behind future user events.

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
  -> ToolApprovalEventProcessor validates active turn and pending invocation with AgentRuntimeState
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
- If no active turn exists when the processor validates, return `no_active_turn`.
- If supplied `turnId` does not match the active turn, return `stale_turn`.
- If the active turn is interrupting/interrupted/settled, return `interrupted_turn` or `stale_turn` depending on available state.
- If the invocation is not pending in `AgentRuntimeState.pendingToolApprovals`, return `no_pending_invocation`.
- Only after scheduler/processor/runtime-state validation may the event be posted to `TurnToolInputPort`.
- `TurnToolInputPort.postApproval(...)` wakes exactly the waiting `ToolPhase.waitForApproval(...)` for that invocation.
- Denial is a valid tool approval decision. `ToolPhase` converts it into denied-tool-result semantics and continues through `ToolResultPipeline` / continuation unless the turn is interrupted.

Boundary rule: server/native backends call the public native facade; the facade creates/submits a typed `ToolExecutionApprovalEvent`; runtime submits that event to `AgentEventInbox`; only `ToolApprovalEventProcessor` / runtime state may post to `TurnToolInputPort`. External callers, server backends, and team routing code must not write directly to `TurnToolInputPort` internals or low-level queue storage.

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
  -> AgentEventScheduler / TurnStartEventProcessor starts an AgentTurn
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
| Active turn during stop | Runtime lifecycle control + active runner | Stop may use the active `TurnExecutionScope` to cancel the current LLM/tool operation, but final outcome is terminal shutdown, not reusable interrupt. |
| Shutdown cleanup steps | `AgentShutdownOrchestrator` / `AgentTeamShutdownOrchestrator` | Run once on terminal runtime exit. |
| Normal interrupt | `AgentRuntime.interrupt()` / active turn runner | Must not run shutdown cleanup and must keep runtime reusable. |
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
| `AgentWorker` | Long-lived runtime loop | Runtime init, bootstrap, inbox loop, calling scheduler for dispatchable event entries, terminal shutdown coordination. | Event routing policy, normal LLM/tool reasoning loop, processor execution. | Keeps the runtime alive while an active turn task runs. |
| `AgentEventScheduler` | Dispatch policy owner | Decide dispatchability by event class/lane, inbox lane, and runtime/turn state; claim event entries through `AgentEventInbox`; invoke typed event processors; leave future external turn-starting events parked while active. | Inbox storage mechanics, processor logic, phase execution, provider/tool cancellation. | Makes scheduling explicit instead of spreading `if` branches across worker/runtime. |
| `AgentEventProcessor` | Entry processor per event family | Validate/normalize one inbound event family and call the correct domain owner or pipeline. | Chaining LLM/tool phases as hidden event choreography. | Keeps processors useful but bounded. |
| `AgentTurn` | Per-turn state object | Turn ID, active tool batches, `TurnToolInputPort`, execution scope, settlement state, interruption metadata. | Running the loop, calling LLM/tools, status protocol mapping. | Gives the active turn one canonical identity and cancellation/settlement state. |
| `TurnToolInputPort` | Internal turn-scoped tool input primitive | Wait/post tool approval/result events, wake waiting `ToolPhase` operations, fence stale events. | New-turn scheduling, non-tool phase input, or public runtime command routing. | Replaces top-level active-turn inbox language with a tool-specific internal port. |
| `AgentTurnRunner` / `AgentLoopRunner` | Per-turn use-case runner | The finite loop for one trigger: input processing, LLM phase, tool request/approval/execution/result phase, continuation, final/idle/interrupted outcome. | Runtime start/stop, external mailbox ownership, frontend/server protocol mapping. | The turn loop remains one direct owner. |
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

class TurnStartEventProcessor {
  async process(entry: AgentEventInboxEntry<UserMessageReceivedEvent | InterAgentMessageReceivedEvent>) {
    const event = entry.event;
    if (state.activeTurn) return { accepted: false, code: 'not_dispatchable' };
    const turn = state.startActiveTurn(event.turnId);
    const runnerTask = new AgentTurnRunner(context, turn).run(event);
    state.registerActiveTurnTask(turn.turnId, runnerTask);
    runnerTask.finally(() => {
      state.completeActiveTurn(turn.turnId);
      scheduler.wakeDispatchabilityChanged();
    });
    return { accepted: true, code: 'turn_started', turnId: turn.turnId };
  }
}
```

The worker loop continues to read dispatchable active-turn/lifecycle events while the runner task is active. One-active-turn is enforced by scheduler/state, not by blocking the entire inbox loop.

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
    await turn.settlement.wait(options?.timeoutMs);
    return result;
  }
}
```

The active runner observes this because every LLM/tool phase runs under `turn.executionScope`.

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
  AgentEventInbox -> AgentEventScheduler -> TurnStartEventProcessor -> AgentTurnRunner -> AgentInputPipeline.processForLlm(startsNewTurn=true)

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
AgentWorker waits for the next scheduler-approved inbox message.
AgentTurnRunner owns everything that happens inside a started turn.
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
- Evidence: The first-stage worktree already fixed the original hidden-loop problem by introducing `AgentTurnRunner`, phase services, typed pipelines, `TurnExecutionScope`, and native interrupt routing. The remaining design issue is inbound-event clarity: current code exposes `AgentMessageInbox` plus `AgentInboxMessage` wrappers, while scheduling/processor selection is still tied to message-wrapper shapes rather than canonical events.
- Design response: Preserve the implemented runner/phase/pipeline/interrupt architecture, then refactor the inbound side to `AgentEventInbox -> AgentEventScheduler -> typed AgentEventProcessor -> pipeline/domain owner`, with `TurnToolInputPort` internal to the active turn.
- Refactor rationale: A superficial rename would not solve dispatch ownership. A second public active-turn inbox keeps the mental model less intuitive. A unified inbox is safe only if scheduling is explicit and the worker loop remains able to dispatch active-turn/lifecycle events while one runner task is active.
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
| DS-006 | Bounded Local | Active `AgentTurnRunner` operation | `TurnExecutionScope.runAbortable` returns/throws interruption and runner settles | `AgentTurnRunner` + `TurnExecutionScope` | Queue-based worker dispatch is not the normal turn-control path; operations are scoped directly under the turn. |
| DS-007 | Bounded Local | Tool batch settlement under active turn | Expected invocation IDs are settled/fenced and `TurnToolInputPort` is closed/cleared on interrupt | `AgentTurn` / `TurnToolInputPort` / `AgentRuntimeState` | Prevents late tool results from reviving an interrupted turn. |
| DS-008 | Primary End-to-End | External approve/deny tool command | `ToolPhase.waitForApproval` receives valid decision or runtime returns stale/no-active/no-pending/interrupted result | `AgentRuntime` / `AgentRuntimeState` / `TurnToolInputPort` / `ToolPhase` | Completes UC-003/CDF-009 after removing old approval handler path. |
| DS-009 | Primary End-to-End | External/async tool result arrives for an active invocation | `ToolPhase.waitForToolResults` receives the validated result or stale/no-active/no-pending/interrupted result is fenced | `AgentEventScheduler` / `AgentRuntimeState` / `TurnToolInputPort` / `ToolPhase` | Completes the tool-result-in-inbox path without allowing tool results to start turns or bypass CDF-007. |
| DS-010 | Return-Event | Inter-agent/system message is accepted as input | Frontend conversation/team communication consumers receive compatible `INTER_AGENT_MESSAGE`, derived `TEAM_COMMUNICATION_MESSAGE`, and system task notifications | `AgentInputPipeline` / `AgentExternalEventNotifier` / event stream + server/team processors | Prevents the outbox-removal refactor from breaking existing team communication rendering. |

## Primary Execution Spine(s)

Single-agent native interrupt:

`Client Interrupt Command -> AgentRunBackend.interrupt -> Agent.interrupt -> AgentRuntime.interrupt -> Active AgentTurnRunner/TurnExecutionScope Interrupt -> LlmPhase/ToolPhase Aborts Or Abandons -> AgentTurn Interrupted Settlement -> AgentExternalEventNotifier Turn/Tool Interrupted Events -> Runtime Idle Status`

Native LLM interruption:

`AgentRuntime.interrupt -> AgentTurn.executionScope.interrupt -> LlmPhase abortable provider stream -> BaseLLM/provider request abort or local abandonment -> streaming segment interruption finalization -> skip assistant ingestion/output pipeline -> interrupted turn settlement`

Native tool interruption:

`AgentRuntime.interrupt -> AgentTurn.executionScope.interrupt -> ToolPhase abortable execute -> BaseTool / terminal / MCP cancellation -> TurnToolInputPort fences expected invocation IDs -> AgentExternalEventNotifier tool-interrupted lifecycle -> no ToolResultContinuationBuilder call -> interrupted turn settlement`

Native tool approval/denial response:

`Server Approval Command -> AgentRunBackend.approveToolInvocation -> AutoByteusAgentRunBackend.approveToolInvocation -> Agent.postToolExecutionApproval -> AgentRuntime.postToolApprovalEvent(ToolExecutionApprovalEvent) -> AgentEventInbox.postAwaitableEvent(event) -> AgentEventScheduler -> ToolApprovalEventProcessor validates active turn/pending invocation -> TurnToolInputPort.postApproval -> ToolPhase.waitForApproval resumes or stale outcome returns`

External/async tool result response:

`External Tool Result Callback -> AgentRuntime.postToolResultEvent(ToolResultEvent) -> AgentEventInbox active-turn lane -> AgentEventScheduler -> ToolResultEventProcessor validates active turn/pending invocation -> TurnToolInputPort.postToolResult -> ToolPhase.waitForToolResults resumes -> ToolResultPipeline -> ToolResultContinuationBuilder -> AgentInputPipeline(SenderType.TOOL)`

Native team interruption:

`Team Interrupt Command -> AutoByteusTeamRunBackend.interrupt -> AgentTeam.interrupt -> AgentTeamRuntime.interrupt -> TeamManager interrupt running nodes -> member AgentRuntime interrupts -> Team idle/interrupted status`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The user asks to cancel the current native generation. The server backend calls native `Agent.interrupt()`. Runtime signals the active `AgentTurn` side-band through the runner/scope. The active phase service sees the scope interruption, stops producing normal output, and returns/throws `AgentInterruptionError` to `AgentTurnRunner`. The runner closes the turn tool input port, publishes interrupted facts through `AgentExternalEventNotifier`, settles the turn interrupted, and the runtime remains running/idle. | Client command, AgentRunBackend, AgentRuntime, AgentTurnRunner, AgentTurn, TurnExecutionScope, AgentExternalEventNotifier | AgentRuntime / AgentTurnRunner / AgentTurn | Server backend, status projection, stream events |
| DS-002 | While LLM streaming is active, interrupt aborts the active turn scope. `LlmPhase` races provider iteration against the scope, asks the provider/iterator to abort/close when supported, closes open response segments with interruption metadata, skips assistant ingestion and `LLMResponsePipeline`, and returns interruption to the runner. | AgentRuntime, AgentTurnRunner, TurnExecutionScope, LlmPhase, BaseLLM, provider | AgentTurnRunner + TurnExecutionScope + BaseLLM | Streaming parser/segments, memory working-context rollback/suppression |
| DS-003 | While a tool is running, interrupt aborts the active turn scope. `ToolPhase` races tool execution against that scope. Participating tools receive the signal; terminal foreground command closes its session. The phase publishes tool-interrupted lifecycle through `AgentExternalEventNotifier`, marks/fences expected invocation IDs, closes/fences the turn tool input port for that batch, and returns interruption without building a TOOL continuation. | AgentRuntime, AgentTurnRunner, TurnExecutionScope, ToolPhase, BaseTool, TurnToolInputPort | AgentTurnRunner + TurnExecutionScope + BaseTool | Terminal/MCP cancellation, recent-settled cache, pending approval cleanup |
| DS-004 | A team interrupt is a coordination operation, not shutdown. The native team runtime enters interrupting, asks TeamManager to interrupt all currently running cached agents/sub-teams, waits boundedly for member settlement, and returns team status to idle/interrupted. | Team backend, AgentTeamRuntime, TeamManager, member AgentRuntime | AgentTeamRuntime / TeamManager | Member context mapping, team status/events |
| DS-005 | Interrupt outcome travels through `AgentExternalEventNotifier`, `AgentEventStream`, server stream conversion, WebSocket mapper, and frontend handlers as interrupting/interrupted metadata. UI can clear sending state and keep the run online. | AgentExternalEventNotifier, AgentEventStream, server converter, WebSocket mapper, frontend handlers | AgentExternalEventNotifier / runtime event pipeline | Status visuals, protocol enum |
| DS-006 | The worker remains the serialized inbox loop, but normal turn execution is not worker-dispatched handler choreography. Active runner phase services execute operations through `TurnExecutionScope` while the worker loop remains available for active-turn/lifecycle message dispatch and preserves unrelated parked events. | AgentWorker, AgentEventScheduler, AgentTurnRunner, TurnExecutionScope, phase services | AgentTurnRunner / TurnExecutionScope / AgentEventScheduler | Signal-aware phase operations, active-turn message dispatch, late-promise logging |
| DS-007 | Interruption invalidates all same-turn pending/queued continuation work. Tool approvals are cleared or rejected by active-turn identity. Invocation IDs expected by the active batch are marked recently settled/fenced so stale late results are ignored. | AgentTurn, TurnToolInputPort, AgentRuntimeState, recent settled cache | AgentTurn / TurnToolInputPort / AgentRuntimeState | Message predicates, pending approval map |
| DS-008 | External approval/denial is a runtime active-turn message, not a new turn and not an old event-handler path. The server/backend command calls the native facade, runtime posts an awaitable inbox message, scheduler dispatches `ToolApprovalEventProcessor`, validation occurs against active turn/pending invocation, and the waiting `ToolPhase` resumes or returns a stale/no-active/no-pending/interrupted outcome. | AgentRunBackend, Agent facade, AgentRuntime, AgentEventInbox, AgentEventScheduler, ToolApprovalEventProcessor, AgentRuntimeState, TurnToolInputPort, ToolPhase | AgentRuntime / AgentEventScheduler / AgentRuntimeState / TurnToolInputPort | Server command mapping, stale result mapping, team member routing |
| DS-009 | If tool execution is externalized or a tool result arrives asynchronously, the result is an active-turn inbox message. Scheduler dispatches `ToolResultEventProcessor`; runtime state validates active turn and expected invocation identity; `TurnToolInputPort` wakes the waiting `ToolPhase`; then normal CDF-007 tool-result processing builds the TOOL-sender continuation. Invalid or late results are fenced and cannot start a turn. | Tool result callback, AgentEventInbox, AgentEventScheduler, ToolResultEventProcessor, AgentRuntimeState, TurnToolInputPort, ToolPhase, ToolResultPipeline | AgentEventScheduler / AgentRuntimeState / ToolPhase | External tool host/callback mapping, stale result classification, recent-settled cache |

## Spine Actors / Main-Line Nodes

- Client interrupt command: sends the user's cancel-current-generation intent.
- AgentRunBackend / TeamRunBackend: runtime-kind adapter for the command.
- Agent / AgentTeam facade: public native runtime API exposed above runtime internals.
- AgentRuntime / AgentTeamRuntime: authoritative lifecycle/control boundary.
- AgentEventInbox: semantic runtime inbox for turn-starting triggers, active-turn events, lifecycle events, and queued/parked events that can exist outside a turn.
- AgentWorker / inbox loop: keeps the runtime inbox loop alive and delegates dispatch to `AgentEventScheduler`; does not own LLM/tool loop semantics.
- AgentTurnRunner: finite per-turn agent loop owner.
- AgentTurn: active-turn identity, tool input port, cancellation scope, and settlement state owner.
- TurnExecutionScope: per-turn cancellation and late-result fencing primitive.
- LlmPhase / ToolPhase: direct phase services called by the runner.
- BaseLLM / BaseTool: provider/tool boundary where cancellation leaves runtime internals.
- AgentExternalEventNotifier / runtime event/status pipeline: publishes interrupting/interrupted state to server/UI.

## Ownership Map

- `AgentRuntime` owns public runtime control commands: start, stop, interrupt, external input submission, active-turn approval input, and status projection for runtime-level control events.
- `AgentEventInbox` owns typed inbound lanes, parked events, lane availability, claim/park mechanics, and awaitable command replies above low-level storage.
- `AgentWorker` owns long-lived inbox loop execution, runtime bootstrap readiness, and stop/shutdown sequencing. It delegates routing decisions to `AgentEventScheduler` and must not own the finite LLM/tool reasoning loop.
- `AgentTurnRunner` / `AgentLoopRunner` owns the finite per-turn reasoning loop and is the primary local try/catch boundary for `AgentInterruptionError`.
- `LlmPhase` owns one LLM phase: request assembly, compaction preparation, provider streaming, streaming parser integration, and phase-level interruption handling.
- `ToolPhase` owns one tool phase: invocation preprocessing, approval coordination through `TurnToolInputPort`, abortable execution, result collection, and tool-interrupted lifecycle publication.
- `AgentTurn` owns turn ID, active tool batch, `TurnToolInputPort`, `TurnExecutionScope`, active operation metadata, interrupted flag, and settlement promise.
- `AgentRuntimeState` owns active-turn storage, pending approval indexes needed across external approval routing, approval input validation/stale-result classification, recent settled invocation IDs, and working-context turn checkpoint restoration/suppression.
- `AgentInputPipeline`, `ToolInvocationPipeline`, `ToolResultPipeline`, `LLMResponsePipeline`, and `SystemPromptPipeline` own typed processor orchestration.
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
| Normal tool-continuation after interrupted tool batch | Would let an interrupted turn continue. | Turn-scoped `TurnToolInputPort` close/fencing + recent settled invocation IDs. | In This Change | Late results ignored. |
| Any remaining app-owned `STOP_GENERATION` protocol/store naming | It hides the domain distinction the task is fixing. | `INTERRUPT_GENERATION` / `interruptGeneration` names. | In This Change / Already Partly Done | Current ticket frontend/server code already uses `INTERRUPT_GENERATION`; final implementation should keep that shape and remove any leftover stop-generation code names if found. |

## Return Or Event Spine(s) (If Applicable)

Single-agent interrupted status/event return:

`AgentTurnRunner settlement -> AgentExternalEventNotifier -> AgentEventStream -> AutoByteusStreamEventConverter -> AgentRunEventMessageMapper -> WebSocket ServerMessage -> frontend streaming handler -> context status/isSending update`

Tool interrupted event return:

`ToolPhase -> AgentExternalEventNotifier.notifyAgentToolExecutionInterrupted -> AgentEventStream -> server converter -> TOOL_EXECUTION_INTERRUPTED message -> frontend activity/tool lifecycle handler`

Inter-agent communication projection return:

`AgentInputPipeline.convertInterAgentEvent -> AgentExternalEventNotifier.notifyAgentDataInterAgentMessageReceived -> AgentEventStream -> AutoByteusStreamEventConverter -> AutoByteusTeamRunEventProcessor enriches metadata -> TeamCommunicationMessageProcessor derives TEAM_COMMUNICATION_MESSAGE -> AgentRunEventMessageMapper -> TeamStreamingService -> conversation inter_agent_message segment + teamCommunicationStore`

Team interrupted return:

`AgentTeamRuntime.interrupt -> AgentTeamExternalEventNotifier/team status -> AgentTeamEventStream -> team backend event mapping -> team WebSocket -> team context/member statuses`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `AgentTurnRunner`
  - Spine: `phase service operation -> TurnExecutionScope.runAbortable/iterateAbortable -> AgentInterruptionError -> runner interrupted settlement -> worker inbox loop continues monitoring/dispatching eligible messages`
  - Why it matters: The worker remains serialized but does not own turn-local LLM/tool control flow.

- Parent owner: `AgentTurn`
  - Spine: `startActiveTurn -> create TurnToolInputPort/scope/checkpoint -> begin runner operation -> interrupt scope -> settle interrupted -> resolve settlement -> clear active turn`
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
| Active-turn tool event predicate | DS-007, DS-009 | AgentEventScheduler / TurnToolInputPort / AgentRuntimeState | Identify/drop/fence tool approval/result events belonging to interrupted turn while preserving parked AgentEventInbox event entries. | Prevents interrupted continuations. | Generic queue storage becomes domain-aware of every event shape. |
| Working-context interruption checkpoint | DS-002, DS-003 | AgentRuntimeState / MemoryManager | Restore/suppress working context additions from interrupted turn. | Avoids incomplete user/tool/assistant fragments driving future LLM calls. | LlmPhase would own memory rollback policy. |
| Provider signal mapping | DS-002 | BaseLLM/provider adapters | Translate generic signal to OpenAI/Anthropic/Gemini/Ollama/etc SDK capabilities. | Keeps provider details below BaseLLM boundary. | LlmPhase would depend on provider internals. |
| Tool signal mapping | DS-003 | BaseTool/concrete tools | Translate generic signal to terminal/MCP/local tool behavior. | Keeps process/transport cancellation below tool boundary. | ToolPhase would know terminal/MCP internals. |
| Frontend status visualization | DS-005 | UI stores/components | Display interrupting/interrupted and clear sending state. | User-visible correctness. | Runtime would leak UI-specific semantics. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Runtime command boundary | `agent/runtime` | Extend | Runtime already owns start/stop/status command surface. | N/A |
| Active turn state | `agent/agent-turn.ts` + `agent/context/agent-runtime-state.ts` | Extend | Active turn already gates event-loop external input and tool batches. | N/A |
| Runtime event inbox boundary | `InboxQueueStore` low-level queues | Create semantic boundary under `agent/event-inbox` | Typed lanes, parking, and awaitable active-turn commands need a semantic owner above queue storage; dispatchability belongs to `AgentEventScheduler`. | Leaving this only as event queue storage makes the worker/queue look like the domain inbox and obscures event semantics. |
| Finite agent loop runner | Currently implicit in `AgentWorker` + queued handlers | Create/Extract under `agent/loop` | The per-turn LLM/tool continuation loop needs a finite owner that can be interrupted independently from the long-lived worker. | Keeping this implicit in AgentWorker preserves the stop/interrupt ambiguity. |
| Processor pipeline orchestration | Currently duplicated across handlers/bootstrap steps | Create under `agent/pipelines` | Ordered processor execution, type validation, and error policy should be consistent but domain-typed. | Existing processor folders define processors, not shared orchestration. |
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
| Server approval command path | `AgentRunBackend.approveToolInvocation` + native `Agent.postToolExecutionApproval` | Extend/Reshape | Existing public/server route exists and should be preserved as the public boundary, but final routing must post through `AgentRuntime.postToolApprovalEvent` into `AgentEventInbox`, then through scheduler/processor validation into `TurnToolInputPort` instead of queued approval handlers. | N/A |
| Team propagation | `agent-team/runtime` + `TeamManager` | Extend | Team runtime owns team commands; TeamManager knows managed nodes. | N/A |
| UI streaming protocol | `services/agentStreaming` | Extend/Rename | Existing channel already sends current-generation command and status messages. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent runtime control | start/stop/interrupt, active turn command, status projection | DS-001, DS-006 | AgentRuntime | Extend | Stop remains terminal. |
| Agent turn lifecycle/interruption | AbortSignal, active operation, interrupted settlement, working-context checkpoint | DS-001, DS-002, DS-003, DS-007 | AgentTurn / AgentRuntimeState | Extend | Central invariant owner. |
| Agent turn loop execution | finite per-trigger LLM/tool loop, continuation, runner-level interruption catch/settle | DS-001, DS-002, DS-003, DS-006, DS-007 | AgentTurnRunner / AgentLoopRunner | Create/Extract | Separates finite agent loop from long-lived AgentWorker mailbox. |
| Agent event inbox | unified typed inbound lanes, parked external events, active-turn command events, lifecycle events | CDF-002, CDF-009, CDF-012, DS-006, DS-007, DS-008, DS-009 | AgentEventInbox / AgentEventScheduler | Reshape current AgentMessageInbox | One semantic inbox with lanes; scheduler owns dispatchability; active-turn events cannot start turns. |
| Tool approval routing | public/native/server approval command as awaitable inbox event entry, scheduler/processor validation, turn tool input port delivery | CDF-009 | AgentRuntime / AgentEventInbox / AgentEventScheduler / ToolApprovalEventProcessor / AgentRuntimeState / TurnToolInputPort | Extend/Create explicit route | Completes approval path without old approval event handler routing. |
| External/async tool result routing | external result as active-turn inbox event, scheduler/processor validation, turn tool input port delivery, then normal continuation | CDF-012, CDF-007 | AgentEventInbox / AgentEventScheduler / ToolResultEventProcessor / AgentRuntimeState / TurnToolInputPort / ToolPhase | Create explicit route when externalized tool execution exists | Prevents tool results from starting turns or bypassing tool-result/input pipelines. |
| Processor pipeline orchestration | typed ordered processor execution and shared error/logging policy | DS-001, DS-002, DS-003 | ProcessorPipelineRunner + domain pipelines | Create/Extract | Provides consistency without making one untyped generic processor abstraction. |
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
| `autobyteus-ts/src/agent/agent-turn.ts` | Agent turn lifecycle | AgentTurn | Signal/scope, interrupted flag, active operation, settlement promise, tool batch. | Existing turn owner extended with turn lifecycle state. | `AgentInterruptOptions` |
| `autobyteus-ts/src/agent/event-inbox/agent-event-inbox.ts` | Agent event inbox | AgentEventInbox | Typed inbound lanes, `post`, `postAwaitable`, lane availability, candidate peek, claim, parking, and awaitable reply resolution above low-level storage. | Makes one agent inbox first-class while keeping dispatch policy outside storage. | `AgentEventInboxEntry`, `EventProcessorResult` |
| `autobyteus-ts/src/agent/event-inbox/inbox-queue-store.ts` | Agent event inbox | InboxQueueStore | Low-level async queue/availability storage. | Replaces architecture-facing queue-manager naming with private storage. | N/A |
| `autobyteus-ts/src/agent/event-inbox/agent-event-scheduler.ts` | Agent event scheduling | AgentEventScheduler | Dispatchability and processor selection by event class/lane and runtime/turn state. | Keeps routing policy out of worker and storage. | AgentEventProcessor registry |
| `autobyteus-ts/src/agent/event-inbox/processors/*.ts` | Agent event processors | Typed AgentEventProcessors | Turn-start, tool-approval, tool-result, and lifecycle entry processors. | Processors call domain owners/pipelines without recreating phase choreography. | AgentEventInboxEntry types |
| `autobyteus-ts/src/agent/loop/agent-turn-runner.ts` | Agent turn loop execution | AgentTurnRunner | Finite reasoning loop around input -> LLM -> tools -> continuation -> idle/interrupted. | New owner for the per-turn agent loop formerly implicit in worker queue choreography. | `AgentTurn`, `TurnExecutionScope` |
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
| `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | Agent turn lifecycle | AgentRuntimeState | Request/settle active turn interruption, validate/post active-turn tool approval/result input, clear pending approvals, drop/fence same-turn work, restore/suppress checkpoint. | State already owns activeTurn/pending approvals/recent settled cache. | `AgentTurn`, `ToolExecutionApprovalEvent`, `ToolResultEvent` |
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
| `autobyteus-ts/src/agent/agent-turn.ts` | Agent turn lifecycle | AgentTurn | Own the turn execution scope, interrupted state, active operation, settlement promise, batch state. | Existing turn owner. | Interruption types |
| `autobyteus-ts/src/agent/event-inbox/agent-event-inbox.ts` | Agent event inbox | AgentEventInbox | Own typed inbound lanes, parked events, lane availability, candidate peek/claim, and awaitable active-turn commands. | Makes inbox semantics explicit above queue storage while scheduler owns dispatch policy. | AgentEventInboxEntry, EventProcessorResult |
| `autobyteus-ts/src/agent/event-inbox/inbox-queue-store.ts` | Agent event inbox | InboxQueueStore | Private async queue/availability storage for inbox lanes. | Low-level storage only. | N/A |
| `autobyteus-ts/src/agent/event-inbox/agent-event-scheduler.ts` | Agent event scheduling | AgentEventScheduler | Select dispatchable inbox event entries and dispatch typed processors by event class/lane/state. | Makes scheduling an explicit owner. | AgentEventProcessor registry |
| `autobyteus-ts/src/agent/event-inbox/processors/*.ts` | Agent event processors | Typed AgentEventProcessors | Turn-start, approval, result, and lifecycle event-entry processing. | Keeps inbound handling separate from LLM/tool phases. | AgentEventInboxEntry types |
| `autobyteus-ts/src/agent/loop/agent-turn-runner.ts` | Agent turn loop execution | AgentTurnRunner | Run one finite agent loop from trigger input through LLM/tool cycles to idle or interrupted settlement. | Separates turn execution from long-lived worker mailbox. | AgentTurn, TurnExecutionScope |
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
| `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | Agent turn lifecycle | AgentRuntimeState | Active-turn interruption request/settlement, approval validation/posting, pending approvals cleanup, turn-local work invalidation, checkpoint restore/suppression. | Existing active state owner. | AgentTurn, ToolExecutionApprovalEvent |
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

- Upstream callers must use `Agent.interrupt()` / `AgentRuntime.interrupt()` for native agent interruption. They must not reach into `AgentRuntimeState.activeTurn.signal` directly.
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
| `AgentRuntime.interrupt()` | Active turn runner/scope, status events, settlement wait | `Agent`, server Autobyteus backend, tests | Backend calling `agent.stop()` or mutating active turn directly | Add result/options to `interrupt()`. |
| `AgentRuntime.postToolApprovalEvent()` | Awaitable active-turn approval event submission through `AgentEventInbox`, scheduler/processor validation, approval result classification | `Agent.postToolExecutionApproval`, native/team facades, server Autobyteus backend tests | Server/native code writing directly to `TurnToolInputPort`, `InboxQueueStore`, or old approval handlers | Add `ToolExecutionApprovalEvent`, `ToolExecutionApprovalEvent` entry, and `PostToolApprovalResult` contract. |
| `AgentEventInbox` | Low-level queue storage, semantic lanes, parked events, lane availability, claim/park mechanics, awaitable command replies | `AgentRuntime.submitEvent`, `AgentWorker`, `AgentEventScheduler`, runtime tests | Callers pushing directly into `InboxQueueStore`, or scheduler/processors bypassing inbox lanes | Add semantic post/postAwaitable/wait/peek/claim APIs. |
| `AgentTurnRunner` | Per-turn LLM/tool continuation loop and interruption catch/settlement | `AgentWorker`, runtime tests | Worker/event dispatcher directly owning turn-local LLM/tool loop policy, or runner bypassing input pipeline for tool continuation | Extract runner methods and call shared `AgentInputPipeline` / `ToolResultContinuationBuilder`. |
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
- `AgentRuntime` may call `AgentRuntimeState.requestActiveTurnInterrupt(...)` and apply interruption status events.
- `AgentRuntime` may submit typed inbound event entries to `AgentEventInbox`; it must not push directly into low-level queue storage.
- `AgentRuntime` may accept tool approval/denial commands through `postToolApprovalEvent(...)` by posting an awaitable `ToolExecutionApprovalEvent` entry to `AgentEventInbox`.
- `AgentWorker` may run the inbox loop and call `AgentEventScheduler.nextDispatchable(...)` / `dispatch(...)`; it must not own routing branches itself.
- `AgentEventScheduler` may select dispatchable inbox event entries and typed `AgentEventProcessor`s by event class/lane and runtime/turn state.
- `ToolApprovalEventProcessor` may validate with `AgentRuntimeState` and post valid approval events to `TurnToolInputPort`.
- `ToolResultEventProcessor` may validate external/async tool results with `AgentRuntimeState` and post valid results to `TurnToolInputPort`; in-process tool results may remain direct inside `ToolPhase`.
- `AgentEventInbox` may use `InboxQueueStore` as generic storage, but owns semantic lanes, parking, availability, claim, and awaitable-reply APIs; scheduler owns dispatchability policy.
- `AgentTurnRunner` directly calls `LlmPhase`, `ToolPhase`, and typed pipeline services, and owns turn-local continuation control flow.
- `AgentTurnRunner` must use `AgentInputPipeline` for initial input and tool-continuation input before every LLM phase.
- `AgentTurnRunner` / `ToolPhase` may use `ToolResultContinuationBuilder` to preserve one tool-result message shape.
- Runner phases and pipelines should publish outbound facts through semantic `AgentExternalEventNotifier` methods rather than low-level `EventEmitter` / `EventManager` calls or duplicate wrapper classes.
- `AgentTurnRunner`, `LlmPhase`, and `ToolPhase` may use `AgentTurn.executionScope` / interruption helpers and call state settlement helpers.
- `LlmPhase` may depend on the `BaseLLM` cancellation-aware API, not provider adapters.
- `ToolPhase` may depend on the `BaseTool` cancellation-aware API, not concrete tools.
- Provider adapters may depend on provider SDK-specific request options.
- Concrete tools may depend on process/MCP transport-specific cancellation.
- Server Autobyteus backends may depend on public `Agent`/`AgentTeam` interrupt APIs.

Forbidden:

- `interrupt()` must not call `stop()` for native Autobyteus runtime or team runtime.
- Worker loop must not run multiple active turns concurrently to solve interruption; it may keep processing inbox event entries while one active turn task is running.
- `AgentWorker` must not remain the semantic owner of the finite LLM/tool reasoning loop once the runner boundary is introduced.
- `WorkerEventDispatcher` must not dispatch the normal LLM/tool/continuation loop in the final implementation.
- Old queued phase handlers must not remain as alternate owners for normal LLM/tool/request/result flow.
- `AgentTurnRunner` must not feed raw tool results directly to the LLM or bypass `context.config.inputProcessors` for SenderType.TOOL continuations.
- External observable events must not be used as the mechanism that advances the internal agent loop.
- `InboxQueueStore` must not hard-code domain-specific event classes; `AgentEventInbox` provides typed lane metadata and `AgentEventScheduler` provides predicates/dispatchability rules.
- External callers must not bypass `AgentEventInbox` by writing directly to `InboxQueueStore`.
- Active-turn events inside `AgentEventInbox` must never be classified as turn-starting events.
- Server/native/team callers must not post approval directly into `TurnToolInputPort`; they must use `Agent.postToolExecutionApproval(...)` / `AgentRuntime.postToolApprovalEvent(...)`.
- External tool result callbacks must not post directly into `TurnToolInputPort`; they must enter as typed `ToolResultEvent entry`s through `AgentEventInbox` and scheduler/processor validation.
- Valid approval events must not bypass `AgentRuntimeState` active-turn and pending-invocation validation.
- LLM/tool abort must not be reported as normal provider/tool error.
- Interrupted tool result must not enqueue a tool-continuation user message.
- Provider-specific abort logic must not leak into runner or phase services.

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

- `interrupt()` bypasses inbox scheduling and targets only the active `AgentTurn` / `TurnExecutionScope` if present.
- `submitEvent()` posts a typed event into `AgentEventInbox`; it does not convert the event into a second domain message object.
- `postToolApprovalEvent()` and `postToolResultEvent()` are not new-turn submissions; they create awaitable active-turn event entries and return the event processor result.
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
  awaitable?: AwaitableCompletion<EventProcessorResult>;
};

class AgentEventInbox {
  postEvent(event: BaseEvent): Promise<void>;
  postAwaitableEvent(event: BaseEvent): Promise<EventProcessorResult>;
  waitForAvailability(options?: { signal?: AbortSignal }): Promise<void>;
  peekCandidates(): Record<AgentEventInboxLane, AgentEventInboxEntry[]>;
  claim(entryId: string): AgentEventInboxEntry | null;
  park(entryId: string, reason: InboxParkReason): void;
  resolveAwaitable(entryId: string, result: EventProcessorResult): void;
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

Owns: dispatchability decisions, processor selection by typed event class and runtime/turn state, parking/claiming behavior, and wake-up on runtime-state changes.

Does not own: queue storage mechanics, event payload transformation, turn execution, phase execution, or provider/tool cancellation.

```ts
class AgentEventScheduler {
  nextDispatchable(input: {
    inbox: AgentEventInbox;
    runtimeState: AgentRuntimeState;
    signal?: AbortSignal;
  }): Promise<AgentEventInboxEntry>;
  dispatch(entry: AgentEventInboxEntry): Promise<EventProcessorResult>;
  wakeDispatchabilityChanged(): void;
}
```

Rules:

- Select the next dispatchable event by event class, lane, runtime state, and turn state; then select processors by event class.
- Enforce one-active-turn for turn-starting events.
- Route active-turn events only to active-turn processors and return explicit stale/no-active/no-pending/interrupted outcomes.
- Runtime lifecycle events are not turn-starting events.
- Wait on both inbox availability and runtime-state dispatchability changes so parked turn-starting events are claimed after active-turn settlement without requiring a new external inbox post.

### Typed `AgentEventProcessor` Contracts

Purpose: entry processing for one inbound event family.

```ts
interface AgentEventProcessor<TEvent extends BaseEvent = BaseEvent> {
  canProcess(event: BaseEvent): event is TEvent;
  process(entry: AgentEventInboxEntry<TEvent>, context: AgentContext): Promise<EventProcessorResult>;
}
```

Rules:

- Processors are entry adapters, not phase owners.
- `TurnStartEventProcessor` may start `AgentTurnRunner`, but it does not await and own the finite LLM/tool loop.
- `ToolApprovalEventProcessor` and `ToolResultEventProcessor` validate active turn identity through `AgentRuntimeState` before touching `TurnToolInputPort`.
- `RuntimeLifecycleEventProcessor` applies lifecycle/status events and coordinates terminal stop/shutdown only.

| Processor | Handles | May Call | Must Not Own |
| --- | --- | --- | --- |
| `TurnStartEventProcessor` | `UserMessageReceivedEvent`, `InterAgentMessageReceivedEvent` | `AgentRuntimeState.startActiveTurn`, `AgentTurnRunner` task starter | LLM/tool phase loop. |
| `ToolApprovalEventProcessor` | `ToolExecutionApprovalEvent` | `AgentRuntimeState.postToolApprovalToActiveTurn`, `TurnToolInputPort` through state | Direct public API or server routing. |
| `ToolResultEventProcessor` | external/async `ToolResultEvent` | `AgentRuntimeState.postToolResultToActiveTurn`, `TurnToolInputPort` through state | In-process tool execution or tool-result continuation pipeline. |
| `RuntimeLifecycleEventProcessor` | `LifecycleEvent` subclasses | status/lifecycle owners, shutdown orchestrator | Agent turn reasoning loop. |

### `TurnToolInputPort` Contract

Purpose: internal turn-scoped tool input primitive used by `ToolPhase` and tool-specific active-turn event processors.

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
- External callers never touch this port directly; they use runtime/facade APIs that become inbox events and scheduler/processor dispatch.
- Clearing/closing this port on interrupt must not delete unrelated parked `AgentEventInbox` events.
- This port is tool-specific. Do not route user-message events, inter-agent events, lifecycle events, or non-tool phase wakeups through it.

### `AgentRuntimeState` Active-Turn Routing Contract

Purpose: active-turn identity and stale/interrupt validation owner.

```ts
class AgentRuntimeState {
  activeTurn: AgentTurn | null;
  startActiveTurn(): AgentTurn;
  interruptActiveTurn(reason: string): AgentInterruptResult;
  validateToolApproval(event: ToolExecutionApprovalEvent): ToolApprovalValidationResult;
  validateToolResult(event: ToolResultEvent): ToolResultValidationResult;
  postToolApprovalToActiveTurn(event: ToolExecutionApprovalEvent): PostToolApprovalResult;
  postToolResultToActiveTurn(event: ToolResultEvent): PostToolResultResult;
  completeActiveTurn(turnId: string): void;
}
```

Rules:

- Runtime state owns stale/no-active/interrupted/no-pending classification because it owns active turn identity and pending invocation maps.
- Event processors ask runtime state to validate/post; they do not inspect/modify pending maps directly.
- Runtime state may post to `TurnToolInputPort` only after active-turn and invocation validation.

### `AgentTurn` Contract

Purpose: one turn's identity, turn tool input port, execution scope, and settlement.

```ts
class AgentTurn {
  readonly turnId: string;
  readonly toolInputPort: TurnToolInputPort;
  readonly executionScope: TurnExecutionScope;
  startToolInvocationBatch(invocations: ToolInvocation[]): ToolInvocationBatch;
  interrupt(reason: string): AgentInterruptResult;
  settle(outcome: TurnOutcome): TurnSettlementResult;
}
```

Rules: settlement is idempotent; late LLM/tool/approval outcomes are fenced; TOOL continuations reuse the same turn.

### `AgentTurnRunner` Contract

Purpose: finite interruptible agent loop for one active turn.

Owns turn-local sequence: input pipeline -> LLM phase -> tool phase -> tool-result continuation -> next LLM phase, plus interruption catch/settlement and external observable-event notification.

```ts
class AgentTurnRunner {
  run(trigger: UserMessageReceivedEvent | InterAgentMessageReceivedEvent): Promise<TurnOutcome>;
}
```

Rule: runner may call `AgentInputPipeline`, `LlmPhase`, `ToolPhase`, `ToolResultPipeline`, `ToolResultContinuationBuilder`, `LLMResponsePipeline`, and `AgentExternalEventNotifier`; it must not read parked inbox event entries or own runtime lifecycle.

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
| `IDLE_READY` | Runtime ready and no active turn. | Dispatch next turn-starting user/inter-agent message or lifecycle message. |
| `TURN_ACTIVE` | One `AgentTurnRunner` task is active. | Dispatch active-turn events and lifecycle events; park future turn-starting events. |
| `INTERRUPTING` | Active turn interruption requested. | Continue active-turn fencing/stale classification; do not start a new turn until settlement. |
| `STOPPING` | Terminal stop requested. | Stop accepting new turn starts; cancel active turn as shutdown if needed; run shutdown once. |
| `STOPPED` | Runtime terminally stopped. | Reject inbound events with runtime-stopped result. |

### Tool Batch State Machine

| State | Meaning | Transition Rule |
| --- | --- | --- |
| `CREATED` | LLM parsed expected invocations. | all invocation IDs are bound to active turn |
| `PENDING_APPROVAL` | one or more invocations await approval. | approval events must match invocation/turn and arrive through scheduler/processor/port |
| `EXECUTING` | one or more tools running. | each execution receives `ToolExecutionOptions.signal` |
| `COLLECTING_RESULTS` | tool results settle in `ToolPhase` or arrive as active-turn result messages. | collect only expected IDs |
| `READY_FOR_CONTINUATION` | ordered results complete. | feed `ToolResultPipeline` then continuation builder |
| `INTERRUPTED` | active turn interrupted. | mark expected IDs recently settled/fenced |
| `SETTLED` | continuation processed or turn done. | duplicate/late results ignored |

### Invariants

| ID | Invariant | Enforcement Owner |
| --- | --- | --- |
| INV-001 | At most one active `AgentTurn` per runtime. | `AgentEventScheduler` + `AgentRuntimeState` |
| INV-002 | `AgentEventInbox` is the only semantic inbound boundary above queue storage; `AgentEventScheduler` is the only dispatchability/routing owner above that inbox. | `AgentRuntime` / `AgentEventInbox` / `AgentEventScheduler` |
| INV-002A | Active-turn inbox event entries may enter `AgentEventInbox`, but they must never be classified as turn-starting events. | `AgentEventInbox` / `AgentEventScheduler` |
| INV-002B | The worker inbox loop continues to dispatch active-turn/lifecycle events while one runner task is active. | `AgentWorker` / `AgentEventScheduler` |
| INV-003 | `TurnToolInputPort` messages must match active `turnId` and expected invocation identity. | `TurnToolInputPort` / `AgentRuntimeState` |
| INV-003A | External approval/denial must reach `TurnToolInputPort` only through `AgentRuntime.postToolApproval -> AgentEventInbox -> AgentEventScheduler -> ToolApprovalEventProcessor`. | `AgentRuntime` / `AgentEventScheduler` / `AgentRuntimeState` |
| INV-003B | External/async tool results must reach `TurnToolInputPort` only through `AgentEventInbox -> AgentEventScheduler -> ToolResultEventProcessor`; in-process results may stay inside `ToolPhase`. | `AgentEventScheduler` / `AgentRuntimeState` / `ToolPhase` |
| INV-004 | `SenderType.TOOL` input never starts a new turn. | `AgentInputPipeline` / `AgentEventScheduler` |
| INV-005 | Tool results must pass through `ToolResultPipeline` and `AgentInputPipeline` before next LLM. | `AgentTurnRunner` |
| INV-006 | `interrupt()` is side-band and must not be blocked behind inbox work. | `AgentRuntime` |
| INV-007 | Normal interrupt never runs shutdown cleanup. | `AgentRuntime` / lifecycle tests |
| INV-008 | Stop always remains terminal and runs shutdown cleanup exactly once. | `AgentRuntime` / `AgentWorker` |
| INV-009 | External observable-event publication is observation/output only, not internal control flow. | `AgentExternalEventNotifier` / runner |
| INV-010 | Bootstrap must complete before any external trigger starts a turn. | `AgentWorker` lifecycle |
| INV-011 | Turn settlement is idempotent and fences late results. | `AgentTurn` / `TurnExecutionScope` |
| INV-012 | Provider/tool-specific cancellation stays below `BaseLLM` / `BaseTool`. | provider/tool adapters |

## Message Routing Rules

| Incoming Item | Enters | Scheduler / Handler | Can Start Turn? | Required Identity | Invalid/Stale Handling |
| --- | --- | --- | --- | --- | --- |
| External user message | `AgentEventInbox` turn-starting lane | `TurnStartEventProcessor` when idle | Yes | optional client message ID | park until idle; reject only if runtime stopped |
| Inter-agent message | `AgentEventInbox` turn-starting lane | `TurnStartEventProcessor` when idle | Yes | sender metadata | park until idle; reject only if runtime stopped |
| Runtime lifecycle message | `AgentEventInbox` lifecycle lane | `RuntimeLifecycleEventProcessor` | No | runtime ID | obey lifecycle state; terminal stop preempts turn starts |
| Tool approval/denial command | `AgentRuntime.postToolApprovalEvent` -> awaitable `AgentEventInbox` active-turn lane | `ToolApprovalEventProcessor` -> `TurnToolInputPort` | No | required `invocationId`, optional `turnId`, `approved`, optional `reason` | return no-active/stale-turn/no-pending/interrupted/runtime-stopped |
| External/async tool result message | `AgentEventInbox` active-turn lane | `ToolResultEventProcessor` -> `TurnToolInputPort` | No | `turnId`, `invocationId` | drop/fence if unknown, stale, interrupted, or mismatched |
| In-process tool result | `ToolPhase` direct return inside runner | `ToolResultPipeline` in runner | No | active batch invocation IDs | fenced by scope/recent-settled IDs |
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
| `ToolExecutionApprovalEventHandler` | Handles approval/denial events in the old event model. | Removed from normal turn flow. | External approval/denial follows `AgentRunBackend.approveToolInvocation -> Agent.postToolExecutionApproval -> AgentRuntime.postToolApproval -> AgentEventInbox -> AgentEventScheduler -> ToolApprovalEventProcessor -> AgentRuntimeState validation -> TurnToolInputPort`; the new typed handler is an entry handler, not a tool phase owner. |
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
  -> TurnStartEventProcessor starts AgentTurnRunner task
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
  -> ToolApprovalEventProcessor
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
- current server native interrupt incorrectly calls stop, captured as the bug to remove.

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
- `AgentEventScheduler` for dispatchability and processor selection;
- typed `AgentEventProcessor`s for turn-start, tool approval, tool result, and lifecycle event-entry processing;
- `TurnToolInputPort` as the internal turn-scoped tool wait/post primitive;
- `AgentExternalEventNotifier` for assistant output, streaming segments, tool lifecycle, errors, lifecycle facts, artifacts/state updates.

Safety gate:

- active-turn events can enter the inbox but cannot start turns;
- stale/no-active/no-pending/interrupted outcomes are explicit;
- tool approvals and external/async tool results reach `TurnToolInputPort` only after scheduler/processor/runtime-state validation;
- the worker loop stays alive for active-turn/lifecycle dispatch while a runner task is active;
- external observable-event publication is notification-only and does not advance the loop;
- inter-agent/system communication publications remain visible to `AgentEventStream`, server team processors, `TeamStreamingService`, conversation segment rendering, and `teamCommunicationStore` after `AgentOutbox` removal.

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

Goal: add finite turn state and cancellation primitive.

Required final components:

- `AgentTurn` owns `turnId`, `TurnToolInputPort`, `TurnExecutionScope`, tool batches, settlement;
- `TurnExecutionScope` owns abort signal, abort listeners, abortable promise/iterator helpers, late-result fencing;
- late LLM/tool/approval results cannot revive a settled turn.

Safety gate: idempotent interrupt/settlement and late-result fencing tests pass.

### Work Package 5 — AgentTurnRunner And Phase Services

Goal: make the finite agent loop explicit.

Required final flow:

```text
AgentEventInbox -> AgentEventScheduler -> TurnStartEventProcessor -> starts AgentTurnRunner task
AgentTurnRunner -> AgentInputPipeline
AgentTurnRunner -> LlmPhase
AgentTurnRunner -> ToolPhase
AgentTurnRunner -> ToolResultPipeline + ToolResultContinuationBuilder
AgentTurnRunner -> AgentInputPipeline(SenderType.TOOL)
AgentTurnRunner -> LLMResponsePipeline / completion
```

Safety gate:

- normal LLM/tool/continuation flow does not depend on `WorkerEventDispatcher` dispatching old handlers;
- only one active turn can run, even though the worker loop keeps dispatching active-turn/lifecycle events;
- tool continuation still reuses the same turn and still applies input processors.

### Work Package 6 — Native Interrupt Semantics

Goal: implement requested interrupt behavior through the final architecture.

Required final behavior:

- `AgentRuntime.interrupt()` is side-band and targets active turn runner/scope;
- LLM stream interruption aborts or abandons provider stream and suppresses assistant ingestion;
- tool execution interruption aborts or abandons tool execution and suppresses continuation;
- pending approval interruption clears/fences active approval state;
- server/native approval commands route through `Agent.postToolExecutionApproval` / `AgentRuntime.postToolApprovalEvent` into `AgentEventInbox`, then through `AgentEventScheduler` and `ToolApprovalEventProcessor` into the active `TurnToolInputPort`;
- external/async tool result events route through `AgentEventInbox`, then through `AgentEventScheduler` and `ToolResultEventProcessor` into `TurnToolInputPort`, then rejoin the normal tool-result continuation pipeline;
- server native backend maps interrupt to native `agent.interrupt`, not stop;
- team interrupt propagates member interrupts, not team stop.

Safety gate: acceptance tests AC-001 through AC-014 pass.

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
| `AgentRuntime.postToolApprovalEvent(event: ToolExecutionApprovalEvent): Promise<PostToolApprovalResult>` | Runtime active-turn input | Submit an awaitable `ToolExecutionApprovalEvent` entry; scheduler/processor validates and posts to `TurnToolInputPort`. | `ToolExecutionApprovalEvent`. | Authoritative native approval boundary. |
| `AgentEventInbox.post(...)` / `postAwaitable(...)` / lane/claim APIs | Runtime inbound events | Store typed inbound event entries, preserve parked work, and expose candidates/claims to the scheduler without exposing queue storage. | Event class/lane plus identity/reply metadata as needed. | Semantic inbox boundary above queue storage; scheduler owns dispatchability. |
| `AgentTurn.interrupt(reason)` | Active turn | Idempotently abort signal and record metadata. | Current turn ID only. | Internal to runtime/state/runner. |
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
| `AgentRuntime.interrupt` | Yes | Yes | Low | Optional turnId must match active turn or return stale/no-active result. |
| `AgentEventInbox` | Yes | Yes | Low | Event class/lane must distinguish turn-starting, active-turn, and lifecycle events without owning scheduler policy or exposing queue storage. |
| `AgentEventScheduler` | Yes | Yes | Low | Scheduler owns dispatchability and processor routing; typed processors own processing. |
| `AgentRuntime.postToolApprovalEvent` | Yes | Yes | Low | Invocation ID is required; optional turn ID must match active turn; stale/no-active/no-pending outcomes are explicit. |
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
| Event processors | `*EventProcessor` | Yes | Medium | Keep processors as entry processors only, not phase-chain owners. |
| Terminal runtime shutdown | `stop` | Yes | Low | Keep only for terminal shutdown. |
| Client command | `INTERRUPT_GENERATION` | Yes | Low | Preserve current app-owned protocol and do not reintroduce stop-generation naming. |
| Active cancellation object | `AgentTurn` signal/interruption | Yes | Low | Avoid separate generic cancellation manager unless needed. |
| Status | `interrupting` | Yes | Low | No terminal `interrupted` agent status; final status is idle with turn interrupted event. |

## Applied Patterns (If Any)

- State machine inside `AgentTurn`: active, interrupting, interrupted/settled. This is bounded inside the turn owner.
- Adapter pattern at LLM providers and tools: BaseLLM/BaseTool accept generic signal options; providers/tools translate to SDK/process/MCP mechanisms.
- Event loop pattern remains inside `AgentWorker`; it may keep dispatching eligible inbox event entries while one runner task is active, but `AgentEventScheduler` still enforces one active turn.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/event-inbox/` | Folder | Agent event inbox | Unified inbound event boundary, scheduler, processors, and private queue storage. | Names the agent inbox separately from event storage and turn loop execution. | LLM/tool phase execution or provider/tool cancellation. |
| `autobyteus-ts/src/agent/event-inbox/agent-event-inbox.ts` | File | AgentEventInbox | `post`, `postAwaitable`, lane availability, candidate peek, claim, parking, and awaitable reply APIs over private queue storage. | Single semantic inbound boundary with typed lanes. | Processor dispatch policy or phase control flow. |
| `autobyteus-ts/src/agent/event-inbox/inbox-queue-store.ts` | File | InboxQueueStore | Low-level async queue/availability storage for inbox lanes. | Private storage mechanics with no domain routing. | Event eligibility or processor dispatch. |
| `autobyteus-ts/src/agent/event-inbox/agent-event-scheduler.ts` | File | AgentEventScheduler | Select dispatchable event entries and processors by event class/lane and runtime/turn state. | Explicit owner for scheduling policy. | LLM/tool phase execution. |
| `autobyteus-ts/src/agent/event-inbox/processors/` | Folder | Typed AgentEventProcessors | Turn-start, tool-approval, tool-result, and lifecycle entry processors. | Keeps event processing explicit without old phase choreography. | LLM/tool phase execution chain. |
| `autobyteus-ts/src/agent/loop/` | Folder | Agent turn loop execution | Finite per-turn runner, direct phase services, turn tool input port, and continuation builders. | Makes the agent loop start/end boundary explicit. | Long-lived worker stop/shutdown policy or provider-specific cancellation. |
| `autobyteus-ts/src/agent/loop/agent-turn-runner.ts` | File | AgentTurnRunner | Runs one agent turn loop to final/interrupted settlement. | One concrete runner owner for finite loop semantics. | Transport protocol or terminal shutdown code. |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | File | LlmPhase | Runs the LLM phase under `TurnExecutionScope`. | Direct phase owner replaces queued LLM-ready handler control flow. | Tool execution, worker scheduling, provider-specific SDK branching. |
| `autobyteus-ts/src/agent/loop/tool-phase.ts` | File | ToolPhase | Runs approval/execution/result collection under `TurnExecutionScope`. | Direct phase owner replaces queued tool request/execution/result handler control flow. | Provider/terminal process internals or worker scheduling. |
| `autobyteus-ts/src/agent/loop/turn-tool-input-port.ts` | File | TurnToolInputPort | Internal wait/post/fence port for validated tool approvals and future async tool results. | Keeps turn-scoped tool input delivery private to the turn while inbound entry uses AgentEventInbox. | New-turn scheduling or lifecycle events. |
| `autobyteus-ts/src/agent/loop/tool-result-continuation-builder.ts` | File | ToolResultContinuationBuilder | Builds SenderType.TOOL continuation input from settled tool results. | Preserves current tool-result message shape for direct runner reuse. | Input processor execution or LLM calls. |
| `autobyteus-ts/src/agent/pipelines/` | Folder | Agent processor pipelines | Shared orchestration for input, tool invocation, tool result, LLM response/output, and optional common pipeline runner. | Keeps processor orchestration explicit without moving concrete processors out of their existing folders. | Worker scheduling, turn-loop ownership, or provider execution. |
| `autobyteus-ts/src/agent/pipelines/processor-pipeline-runner.ts` | File | ProcessorPipelineRunner | Common ordered execution helper for typed pipeline services. | Shared mechanics only; domain pipelines own contracts. | Generic untyped processor semantics or turn control flow. |
| `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts` | File | AgentInputPipeline | Applies input processors and builds LLM-ready input for external/tool input. | Single owner of the current input transformation contract. | Tool result aggregation. |
| `autobyteus-ts/src/agent/pipelines/tool-invocation-pipeline.ts` | File | ToolInvocationPipeline | Applies tool invocation preprocessors. | Single owner of invocation pre-execute processing. | Tool execution or approval UI transport. |
| `autobyteus-ts/src/agent/pipelines/tool-result-pipeline.ts` | File | ToolResultPipeline | Applies tool execution result processors. | Single owner of post-tool processing before continuation. | Continuation message formatting. |
| `autobyteus-ts/src/agent/pipelines/llm-response-pipeline.ts` | File | LLMResponsePipeline | Applies LLM response/output processors and final assistant emission policy. | Single owner of response processor orchestration. | LLM streaming/provider code. |
| `autobyteus-ts/src/agent/pipelines/system-prompt-pipeline.ts` | File | SystemPromptPipeline | Applies system prompt processors for bootstrap. | Single owner of system prompt processor orchestration. | Runtime init or turn execution. |
| `autobyteus-ts/src/agent/events/notifiers.ts` | File | AgentExternalEventNotifier | Publish assistant/tool/segment/lifecycle/error/artifact messages through semantic `notify...` methods above `EventEmitter` / `EventManager`. | Existing single external observable-event boundary; final design removes `agent/outbox`. | Input box scheduling, turn control flow, or provider execution. |
| `autobyteus-ts/src/agent/interruption/` | Folder | Agent interruption support | Small concrete support area for interruption types/utilities. | Shared by runtime, turn state, phase services, tests. | Runtime lifecycle ownership or provider-specific cancellation. |
| `autobyteus-ts/src/agent/interruption/agent-interruption.ts` | File | Interruption model | Options/result/error/guards. | One semantic data shape. | Stop/terminate semantics. |
| `autobyteus-ts/src/agent/interruption/abortable-operation.ts` | File | Abortable operation utility | Promise/iterator abort racing and late-result logging. | Reused by `TurnExecutionScope`, `LlmPhase`, and `ToolPhase`. | Provider/tool-specific behavior. |
| `autobyteus-ts/src/agent/agent-turn.ts` | File | AgentTurn | Turn signal, operation, settlement, batch. | Existing active turn owner. | Queue storage or runtime status emission. |
| `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | File | AgentRuntimeState | Active turn state mutation, active-turn validation/stale classification, turn-local work cleanup/fencing, pending approval cleanup, checkpoint restore. | Existing state owner. | Public runtime command API. |
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
| `agent/event-inbox` | Main-Line Domain-Control | Yes | Medium | Unified inbound boundary plus scheduler/processors; keep storage private and keep LLM/tool phase work in `agent/loop`. |
| `agent/loop` | Main-Line Domain-Control | Yes | Medium | New runner boundary must contain only finite per-turn control flow and turn-local continuation construction, not long-lived worker lifecycle. |
| `agent/pipelines` | Off-Spine Concern | Yes | Medium | Shared processor pipeline orchestrators used by the turn runner and final phase services; must not become the agent loop itself. |
| `agent/events/notifiers.ts` | Off-Spine Concern | Yes | Low | Existing outbound observable-event boundary above `EventEmitter` / `EventManager`; no separate outbox folder. |
| `agent/interruption` | Off-Spine Concern | Yes | Low | Concrete support for AgentRuntime/AgentTurn, not generic shared cancellation. |
| `agent/runtime` | Main-Line Domain-Control | Yes | Low | Runtime command owner remains here. |
| `agent/context` | Main-Line Domain-Control | Yes | Medium | RuntimeState already large; keep only state mutation/cleanup, not utility races. |
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
| Queue cleanup | `inputEventQueues.dropWhere((event) => state.eventBelongsToTurn(event, turnId))` | queue manager imports every domain event and decides turn identity | Preserves queue/storage boundary. |
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
- Active turn layer: `AgentTurn` / `AgentRuntimeState` own cancellation state and turn cleanup.
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
- Working-context rollback/suppression must be carefully implemented so interrupted turns do not corrupt compaction snapshots or future LLM context.
- Frontend/status tests may need updates because `interrupting` is a new non-terminal state and `interrupted` is an event, not a final agent status.

## Guidance For Implementation

- Start with core runtime tests using controllable LLM/tool mocks before touching provider adapters.
- Keep `stop()` tests passing unchanged.
- Make interruption settlement idempotent. Repeated interrupt requests for the same turn should return the same/safe result and not duplicate turn/tool lifecycle events.
- In abortable operation utilities, attach a catch handler to the abandoned promise/iterator path to prevent unhandled late rejections.
- On interrupted tool execution, add the active invocation ID and every expected invocation ID in the active batch to `recentSettledInvocationIds`.
- Add `turn_id` to turn-local events/continuation records so `TurnToolInputPort` fencing can drop stale work without dropping later real user events.
- Provider adapters should normalize native abort errors into `AgentInterruptionError` or allow the `TurnExecutionScope` / abortable-operation utility to do so; do not emit normal LLM errors for user interrupts.
- Server backend tests should explicitly assert `stop` is not called by `interrupt`.
- Server/native approval tests should assert `AgentRunBackend.approveToolInvocation` calls `agent.postToolExecutionApproval`, which calls `AgentRuntime.postToolApprovalEvent`, and valid approvals wake `ToolPhase.waitForApproval` through `TurnToolInputPort`.
- Post-interrupt approval tests should assert stale approvals return explicit stale/interrupted/no-pending results and do not start a new turn.
- Frontend tests should assert the interrupt command is sent and `isSending` clears only on interrupted/idle stream feedback, not optimistically at button click.
- Frontend/team communication tests should assert `INTER_AGENT_MESSAGE` still creates conversation inter-agent segments and derived `TEAM_COMMUNICATION_MESSAGE` still updates `teamCommunicationStore`; this is required because `AgentOutbox` removal must not remove `AgentExternalEventNotifier` inter-agent publications.
