# Design Spec

## Current-State Read

This design update is a second-stage refactor on top of the current ticket worktree, not a new ticket. The first-stage implementation already introduced native interrupt semantics and extracted the hidden turn loop from old normal-flow event handlers.

Current implemented single-agent runtime path in this worktree:

`Agent.postUserMessage() -> AgentRuntime.submitEvent(...) -> AgentInputBox.enqueueUserMessage(...) -> AgentWorker.asyncRun() -> AgentInputBox.nextTurnTriggerWhenIdle(...) -> AgentRuntimeState.startActiveTurn(...) -> AgentTurnRunner.run(...) -> AgentInputPipeline -> LlmTurnPhase (target rename: LlmPhase) -> ToolPhase -> ToolResultPipeline -> ToolResultContinuationBuilder -> AgentInputPipeline(SenderType.TOOL) -> LLMResponsePipeline / AgentOutbox -> AgentIdleEvent`

Current implemented approval path:

`Server approve/deny command -> AgentRunBackend.approveToolInvocation(...) -> AutoByteusAgentRunBackend.approveToolInvocation(...) -> Agent.postToolExecutionApproval(...) -> AgentRuntime.postToolApproval(...) -> AgentRuntimeState.postToolApprovalToActiveTurn(...) -> AgentTurnInputBox.postApproval(...) -> ToolPhase.waitForApproval(...)`

Current implemented interrupt path:

`AgentRunBackend.interrupt(...) / Agent.interrupt(...) -> AgentRuntime.interrupt(...) -> AgentRuntimeState.interruptActiveTurn(...) -> AgentTurn.executionScope.interrupt(...) -> LlmTurnPhase (target rename: LlmPhase) / ToolPhase await boundary observes interruption -> AgentTurnRunner settles interrupted -> runtime remains reusable`

Important current-state improvements already present:

- `WorkerEventDispatcher` and old normal-flow `agent/handlers/*` turn-control choreography are removed from the implemented normal LLM/tool/continuation path.
- `AgentTurnRunner`, current `LlmTurnPhase` (target final name `LlmPhase`), `ToolPhase`, typed processor pipelines, `TurnExecutionScope`, and `AgentOutbox` now own the core turn flow.
- `AgentInputBox` is already a semantic boundary above `AgentInputEventQueueManager` for external turn-starting messages and lifecycle input.
- `AgentTurnInputBox` is currently an active-turn approval wait/post primitive; dormant tool-result/continuation lanes were removed in the implemented code.

Remaining design pressure exposed by the user discussion:

- The public mental model still has two “inboxes” (`AgentInputBox` and `AgentTurnInputBox`), which is less intuitive than saying “the agent has one message inbox with typed message lanes.”
- `AgentInputEventQueueManager` remains an implementation-centric name: it describes queue mechanics, not the domain boundary.
- Scheduling and message handling are still implicit in `AgentWorker` / `AgentRuntime` branches rather than explicit `AgentMessageScheduler` and typed `AgentMessageHandler`s.
- If tool approvals/results are treated as inbound agent messages, the inbox loop cannot block behind `await AgentTurnRunner.run(...)`; it must keep processing active-turn messages while a runner task is active.

Therefore the next target design keeps the successful turn-runner/phase/pipeline extraction but refactors the remaining inbound side into:

`AgentMessageInbox -> AgentWorker inbox loop -> AgentMessageScheduler -> typed AgentMessageHandler -> processor pipeline/domain owner`

`TurnToolInputPort` remains as an internal per-turn tool-phase wait/wake port used by tool handlers and `ToolPhase`; it is not a second architecture-facing inbox.

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
- Second-stage inbound refactor replaces the architecture-facing `AgentInputBox` / `AgentTurnInputBox` split with one `AgentMessageInbox`, explicit `AgentMessageScheduler`, typed `AgentMessageHandler`s, and an internal `TurnToolInputPort`.
- `AgentWorker` runs the runtime inbox loop and lifecycle work; `AgentMessageScheduler` owns dispatchability and routing policy; handlers are entry handlers that call pipelines/domain owners without recreating the old LLM/tool handler chain.

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

After the first-stage implementation, `AgentWorker` is no longer the semantic owner of the LLM/tool reasoning loop. It still owns a long-running runtime loop, bootstrap, stop/shutdown, and message intake. The remaining boundary improvement is to split **message scheduling and message handling** out of the worker so the inbound architecture is readable.

Target concepts:

| Concept | Lifetime | Responsibility | Must Not Own |
| --- | --- | --- | --- |
| `AgentRuntime` | Agent session | Public lifecycle/control: start, stop, interrupt, submit messages, expose status, own inbox/outbox/state/worker. | LLM/tool phase execution, provider cancellation details, message-type handler internals. |
| `AgentMessageInbox` | Runtime session | Store inbound agent messages using typed semantic lanes, preserve parked work, and expose lane/claim/awaitable-reply primitives to the scheduler. | Scheduling policy, turn-loop decisions, LLM/tool execution, runtime shutdown cleanup. |
| `AgentWorker` | Runtime worker loop | Bootstrap, run the inbox loop, call `AgentMessageScheduler`, coordinate terminal shutdown. | Message routing policy and normal LLM/tool phase progression. |
| `AgentMessageScheduler` | Runtime session | Choose what inbound message is dispatchable given inbox lanes plus runtime/turn state; invoke the correct typed handler. | Queue storage mechanics, processor logic, LLM/tool phase work, provider/tool cancellation. |
| `AgentMessageHandler` | One message family | Handle one inbound message family and call the appropriate domain owner or pipeline. | Chaining LLM/tool phases as a hidden runner. |
| `AgentTurn` | One active turn | Turn identity, active batches, `TurnToolInputPort`, execution scope, settlement state. | Runtime inbox storage or public lifecycle commands. |
| `AgentTurnRunner` | One active turn task | Finite reasoning loop: process input, call LLM, run tools, feed continuations, finish/interrupted settlement. | Runtime inbox loop, scheduling queued external messages, server/frontend protocol. |

Critical scheduler change:

The worker must not rely on a single blocking loop shaped as `message -> start runner -> await runner -> read next message` if active-turn messages are posted to the inbox. Instead the target loop is:

```ts
while (runtime.running) {
  const message = await scheduler.nextDispatchable({ inbox, runtimeState, signal: workerSignal });
  await scheduler.dispatch(message);
}
```

`TurnStartMessageHandler` starts the `AgentTurnRunner` as the active turn task and registers a settlement callback; the worker loop keeps monitoring the inbox. While the runner is active:

- valid active-turn messages, such as tool approval/denial, are dispatched immediately to active-turn handlers;
- unrelated external user/inter-agent messages remain parked in `AgentMessageInbox` until the active turn settles;
- lifecycle stop/shutdown messages remain dispatchable according to lifecycle policy;
- interrupt remains side-band via `AgentRuntime.interrupt()` and does not wait for inbox dispatch.

This preserves one-active-turn semantics while making a unified inbox possible.

Final implementation rule:

- `AgentTurnRunner` remains the only owner of normal LLM/tool/continuation progression.
- `AgentMessageScheduler` owns inbound dispatchability and routing policy only.
- Typed message handlers are entry handlers; they may call pipelines/domain owners but must not recreate the deleted old chain: `UserHandler -> LLMHandler -> ToolHandler -> ToolResultHandler -> LLMHandler`.
- Public event/stream notifications remain observations/outbox outputs, not hidden turn-control messages.

## Concept Inventory Before Spines

Before choosing file changes, the architecture should make these concepts explicit:

| Concept | Meaning | Current Representation | Target Responsibility | Notes |
| --- | --- | --- | --- | --- |
| Runtime control plane | Public commands and lifecycle for a running agent session. | `AgentRuntime`, server backend adapters. | `start`, terminal `stop`, side-band `interrupt`, inbound message submission, active-turn approval command. | Runtime owns the inbox/scheduler/worker but does not own message handler internals or LLM/tool phases. |
| Runtime lifecycle pipeline | Bootstrap and terminal shutdown work for the whole runtime. | `AgentWorker.initialize/runtimeInit`, `AgentBootstrapper`, shutdown orchestrator. | Run bootstrap before dispatching turn-starting messages; run shutdown exactly once on terminal stop/worker exit. | Normal interrupt never runs shutdown cleanup. |
| AgentMessageInbox | One semantic inbound boundary for the agent. | Current `AgentInputBox` plus approval path through `AgentRuntimeState`/`AgentTurnInputBox`. | Store typed inbound agent messages: user, inter-agent, lifecycle, active-turn approval/result messages, and parked future work; expose lane/claim APIs to the scheduler. | Replaces architecture-facing `AgentInputBox`; it is one inbox with lanes, not one flat FIFO. |
| InboxQueueStore | Low-level queue/availability storage. | `AgentInputEventQueueManager`. | Generic queue primitives behind `AgentMessageInbox`. | Storage only; no domain routing, no “event manager” ownership. |
| AgentMessageScheduler | Runtime message-routing policy. | Implicit `AgentWorker` / `AgentRuntime` branches. | Decide dispatchability by message kind, active-turn state, lifecycle state, and stop state using inbox lane APIs; invoke typed handlers. | Prevents worker or inbox storage from becoming a routing blob. |
| AgentMessageHandler | Entry handler for one inbound message family. | Currently implicit branches and direct runtime/state calls. | Validate/normalize one message kind and call the right domain owner or processor pipeline. | Handlers are not LLM/tool phase owners. |
| TurnToolInputPort | Internal turn-scoped tool input wait/wake port. | Current `AgentTurnInputBox` approval wait/post primitive. | Deliver validated tool approvals and future async tool results to the current `ToolPhase`. | Internal to `AgentTurn` / `ToolPhase`; not a second public inbox. |
| Agent outbox | Canonical outbound lane for agent-produced facts/data. | `AgentOutbox`, notifier/event stream. | Publish assistant output, segment deltas, tool lifecycle/logs, approvals, errors, artifacts, state updates, turn lifecycle. | Outbox messages do not advance turn control flow. |
| Agent turn | One finite unit of agent reasoning started by a turn-starting message. | `AgentTurn` with turn ID, batch, scope, current tool-approval wait primitive. | Turn ID, active batches, `TurnToolInputPort`, execution scope, settlement/interruption metadata. | TOOL continuations stay inside the same turn. |
| Agent turn runner / agent loop | Finite reasoning loop for one turn. | `AgentTurnRunner`. | Process input, call LLM, run tools, feed tool continuations, finish or settle interrupted. | This remains the core domain boundary. |
| Turn execution scope | Cancellation/operation scope for one turn. | `TurnExecutionScope`. | Abort signal, active operation, abort callbacks, `AgentInterruptionError`, late-result fencing. | Mechanical cancellation primitive used by runner phases. |
| Processor | Ordered custom extension point for one domain transformation. | Existing input, LLM response, tool result, tool invocation, system prompt processors. | Remain concrete domain processors with `getOrder()` semantics. | Do not collapse differing contracts into one generic processor. |
| Processor pipeline | Orchestrator that applies processors for one area. | `agent/pipelines/*`. | Shared pipeline services for input, tool invocation, tool result, LLM response/output, system prompt. | Called by handlers/runners/phases as appropriate. |
| Tool result continuation builder | Ordered tool results -> TOOL-sender input message. | `ToolResultContinuationBuilder`. | Preserve current aggregate message shape, denied/error/success formatting, `ContextFile` attachments. | Feeds `AgentInputPipeline`, never raw LLM. |
| LLM/tool phase services | Turn-local phase work. | `LlmPhase`, `ToolPhase`. | Execute one LLM or tool phase under `TurnExecutionScope`. | Final message handlers must not own this work. |
| Event/notification stream | Observability and client updates. | Notifier, stream events, WebSocket mappers. | Report statuses, stream segments, tool lifecycle, turn interrupted/completed. | Observes facts; does not drive the internal loop. |

Design rule: **the inbox stores typed messages; the scheduler chooses the handler; handlers call pipelines/domain owners; the runner controls turn-local LLM/tool flow; the execution scope interrupts active operations; outbox/events notify observers.**

## Corrected Conceptual Data-Flow Spines

These are the spines the implementation should preserve or create. The later detailed file mapping should be checked against them.

| Spine ID | Name | Start | Main Path | End / Outcome | Owner |
| --- | --- | --- | --- | --- | --- |
| CDF-001 | Runtime bootstrap | `AgentRuntime.start()` | `AgentWorker` runtime init -> `AgentBootstrapper` / `SystemPromptPipeline` -> ready/idle notification -> inbox loop begins dispatching turn-starting messages | Agent ready for message dispatch | `AgentRuntime` / `AgentWorker` |
| CDF-002 | External trigger to turn | User/inter-agent message enters `AgentMessageInbox` | inbox stores typed message -> worker loop asks scheduler for next dispatchable message -> scheduler claims turn-starting message when idle -> `TurnStartMessageHandler` checks no active turn -> creates `AgentTurn` -> starts `AgentTurnRunner` task | One active runner owns the trigger while inbox loop stays alive | `AgentMessageInbox` / `AgentMessageScheduler` / `TurnStartMessageHandler` |
| CDF-003 | Input processing to LLM leg | External trigger or TOOL continuation | `AgentInputPipeline` applies input processors -> builds LLM user message with correct turn ID | LLM phase receives processed LLM input | `AgentInputPipeline` / `AgentTurnRunner` |
| CDF-004 | LLM phase | Processed LLM input | LLM request assembly/compaction -> provider stream under `TurnExecutionScope` -> streaming parser/segment events | Final response or tool invocations | `AgentTurnRunner` / `LlmPhase` |
| CDF-005 | Final response / output | LLM final response with no tool continuation | LLM response/output pipeline -> response processors -> assistant complete/final notification | Turn completed and idle | `LLMResponsePipeline` / `AgentTurnRunner` |
| CDF-006 | Tool invocation phase | Parsed LLM tool invocations | tool invocation preprocessors -> approval if needed -> approval wait through `TurnToolInputPort` -> tool execution under `TurnExecutionScope` -> ordered tool results | Ordered tool results or interruption | `AgentTurnRunner` / `ToolPhase` / `TurnToolInputPort` |
| CDF-007 | Tool result continuation | Ordered tool results from `ToolPhase` or active-turn result messages | tool result processors -> continuation builder -> `AgentInputPipeline` with `SenderType.TOOL` and existing active turn | Next processed LLM input in same turn | `ToolResultPipeline` / `ToolResultContinuationBuilder` / `AgentInputPipeline` |
| CDF-008 | Interrupt active turn | User control command, not inbox turn traffic | server/backend -> `AgentRuntime.interrupt()` -> active `AgentTurn.executionScope.interrupt()` -> active phase aborts/abandons | Runner settles turn interrupted; worker/inbox loop remains alive | `AgentRuntime` / `AgentTurnRunner` / `TurnExecutionScope` |
| CDF-009 | Pending approval response | Server/backend/native approval command arrives while turn waits | `AgentRunBackend.approveToolInvocation` -> native `Agent.postToolExecutionApproval` -> `AgentRuntime.postToolApproval` -> `AgentMessageInbox.postAwaitable(ToolApprovalMessage)` -> scheduler -> `ToolApprovalMessageHandler` -> state validation -> `TurnToolInputPort.postApproval` -> `ToolPhase.waitForApproval` resumes | Tool phase resumes approved/denied, or explicit stale/no-active/no-pending/interrupted result is returned without starting a turn | `AgentMessageInbox` / `AgentMessageScheduler` / `ToolApprovalMessageHandler` / `TurnToolInputPort` |
| CDF-010 | Outbox / observability | Domain fact or agent-produced output occurs in any spine | phase/pipeline publishes to `AgentOutbox` -> notifier/event stream/WebSocket/frontend | Client sees assistant output/status/segments/tool lifecycle/turn outcome | `AgentOutbox` + event/notification pipeline |
| CDF-011 | Terminal shutdown | `AgentRuntime.stop()` / lifecycle stop message | mark stopping -> side-band cancel active turn if needed -> lifecycle handler/shutdown orchestrator cleans LLM/tools/MCP/resources exactly once -> stopped | Runtime lifecycle complete | `AgentRuntime` / `AgentWorker` / shutdown lifecycle pipeline |
| CDF-012 | External/async tool result delivery | External tool host/callback submits a result for an active invocation | tool result enters `AgentMessageInbox` active-turn lane -> scheduler -> `ToolResultMessageHandler` -> `AgentRuntimeState` validates active turn/invocation -> `TurnToolInputPort.postToolResult` -> `ToolPhase.waitForToolResults` resumes -> CDF-007 tool result continuation | Valid async result joins the current tool batch, or stale/no-active/no-pending/interrupted result is dropped without starting a turn | `AgentMessageInbox` / `AgentMessageScheduler` / `ToolResultMessageHandler` / `TurnToolInputPort` / `ToolPhase` |

Important spine constraints:

- CDF-008 is side-band control. It must not be blocked behind inbox scheduling.
- CDF-009 and CDF-012 can use the unified inbox only because the worker inbox loop keeps running while the active `AgentTurnRunner` task is active.
- CDF-007 must go through CDF-003. Tool results must not be fed directly to the LLM.
- CDF-010 observes and reports facts. It must not be required to advance CDF-003 through CDF-007.
- CDF-002 enforces the one-active-turn invariant for turn-starting messages; active-turn messages can be dispatched while a turn is active but cannot create a second turn.
- CDF-001 and CDF-011 are runtime lifecycle spines. They must not be mixed into the per-turn runner and must not run during a normal generation interrupt.
- CDF-009 and CDF-012 are tool-specific active-turn message spines. If a future non-tool phase needs external input, it should get its own phase-specific wait/wake primitive rather than broadening `TurnToolInputPort`.

### Conceptual Spine Completeness Check

| Use Case / Scenario | Required Spine Coverage | Completeness Decision |
| --- | --- | --- |
| Runtime starts before messages are processed | CDF-001 gates CDF-002 through runtime ready/idle state. | Complete: bootstrap is lifecycle, not a turn. |
| User/inter-agent message starts work | CDF-002 starts exactly one runner task; CDF-003 through CDF-005 complete the normal LLM response path. | Complete: scheduler/handler/runner boundaries are explicit. |
| Tool call with in-process result | CDF-006 executes tool phase; CDF-007 feeds results through tool-result and input pipelines before the next LLM call. | Complete: raw tool results never go directly to LLM. |
| Tool approval arrives while the turn waits | CDF-009 routes through server/native/runtime inbox/scheduler/handler/state validation into `TurnToolInputPort`. | Complete: approval cannot start a new turn or bypass validation. |
| Tool result arrives asynchronously from outside the phase | CDF-012 routes through inbox/scheduler/handler/state validation into `TurnToolInputPort`, then rejoins CDF-007. | Complete for the target architecture; in-process tool results may still return directly inside `ToolPhase`. |
| Interrupt during LLM/tool/approval wait | CDF-008 interrupts the active scope side-band; CDF-006/CDF-009/CDF-012 are fenced by `TurnToolInputPort` and runtime state. | Complete: interrupt is not delayed behind inbox dispatch. |
| Later user message while turn is active | CDF-002 parks turn-starting messages; scheduler keeps CDF-009/CDF-012/lifecycle messages dispatchable. | Complete: one active turn is preserved without blocking active-turn messages. |
| Outbound status/output/tool lifecycle | CDF-010 publishes through `AgentOutbox` only. | Complete: outbox never advances turn control flow. |
| Terminal stop/shutdown | CDF-011 runs shutdown cleanup exactly once and remains separate from normal interrupt. | Complete: stop and interrupt semantics remain distinct. |

## Phase Naming Symmetry

Use the final symmetric phase names **`LlmPhase`** and **`ToolPhase`**. Do not keep `LlmTurnPhase` in the target architecture: the word `Turn` is redundant because both phases are owned by `AgentTurnRunner`, and the asymmetric pair `LlmTurnPhase` / `ToolPhase` makes the model harder to read. Do not use `LlmCallPhase`, because the phase owns more than a raw provider call: request assembly, context/compaction preparation, provider streaming, streaming parser integration, final/tool outcome production, and interrupted segment finalization.

## Agent Message Inbox / Scheduler / Handler Model

Use the explicit name **AgentMessageInbox** for the agent's runtime inbound boundary. Do not expose two architecture-facing inboxes. The active turn still needs a waitable delivery primitive for tool-phase external input, but it should be named by its real responsibility: **TurnToolInputPort**.

Naming decision: do not use `ActiveTurnMessagePort` or `TurnAwaitableInputPort` in the final design. Those names are too broad and make the primitive sound like a second general inbox. The in-scope wait/wake responsibility is tool-specific: tool approval now, and future external/async tool result delivery if tool execution is externalized. If a future non-tool phase needs external input, define a separate phase-specific primitive instead of expanding this one.

The inbox is one semantic boundary with typed lanes, not one undifferentiated FIFO:

| Inbox Lane | Accepted Messages | Dispatch Rule | Can Start New Turn? | Handler |
| --- | --- | --- | --- | --- |
| Turn-starting lane | user messages, inter-agent messages, other future external triggers | Dispatch only when runtime is ready and no active turn exists; otherwise keep parked | Yes | `TurnStartMessageHandler` / specialized user and inter-agent handlers |
| Active-turn lane | tool approvals/denials, future external/async tool results, phase-local wakeups | Dispatch only when active turn and identity match; otherwise stale/no-active/no-pending outcome | No | `ToolApprovalMessageHandler`, `ToolResultMessageHandler` |
| Runtime lifecycle lane | bootstrap notifications, shutdown/stopped lifecycle, status/lifecycle observations | Dispatch according to lifecycle state; terminal stop can preempt future turn starts | No | `RuntimeLifecycleMessageHandler` |
| Side-band control | interrupt command | Bypasses inbox and directly targets active turn execution scope | No | `AgentRuntime.interrupt()` |

Conceptual message shape:

```ts
type AgentInboxMessage =
  | UserInboxMessage
  | InterAgentInboxMessage
  | ToolApprovalInboxMessage
  | ToolResultInboxMessage
  | RuntimeLifecycleInboxMessage;

class AgentMessageInbox {
  post(message: AgentInboxMessage): Promise<void>;
  postAwaitable<T extends AgentInboxMessage>(message: T): Promise<MessageHandlerResult<T>>;
  waitForAvailability(options?: { signal?: AbortSignal }): Promise<void>;
  peekCandidates(): AgentInboxCandidateSnapshot;
  claim(messageId: string): AgentInboxMessage | null;
  park(messageId: string, reason: InboxParkReason): void;
}

class AgentMessageScheduler {
  nextDispatchable(input: {
    inbox: AgentMessageInbox;
    runtimeState: AgentRuntimeState;
    signal?: AbortSignal;
  }): Promise<AgentInboxMessage>;
  dispatch(message: AgentInboxMessage): Promise<MessageHandlerResult>;
  wakeDispatchabilityChanged(): void;
}
```

`AgentMessageScheduler.nextDispatchable(...)` is semantic: when a turn is active it should prefer valid active-turn/lifecycle messages and leave future user/inter-agent messages parked in `AgentMessageInbox`. The scheduler waits on either inbox availability or runtime-state dispatchability changes, such as active-turn settlement. This avoids accidental second turns and avoids blocking tool approvals behind queued future user messages.

Typed handlers:

```ts
interface AgentMessageHandler<T extends AgentInboxMessage> {
  readonly kind: T['kind'];
  handle(message: T, context: AgentContext): Promise<MessageHandlerResult>;
}
```

Handler responsibilities:

- `TurnStartMessageHandler`: starts a new `AgentTurn` and `AgentTurnRunner` task when idle, then returns without owning the LLM/tool loop.
- `ToolApprovalMessageHandler`: validates active turn and pending invocation through `AgentRuntimeState`, posts to `TurnToolInputPort`, and resolves stale/no-active/no-pending/interrupted outcomes.
- `ToolResultMessageHandler`: validates active turn/invocation for externally delivered or asynchronous tool result messages, then routes them to the active turn result port. In-process synchronous tool execution may still return results directly inside `ToolPhase`; do not force artificial queue hops inside one owner.
- `RuntimeLifecycleMessageHandler`: applies lifecycle/status events and terminal shutdown coordination.

Design rule: **all inbound agent messages use one `AgentMessageInbox`; scheduling is explicit; handlers are entry points; the finite reasoning loop remains inside `AgentTurnRunner`.**

The current `AgentInputBox` should be renamed/reshaped into `AgentMessageInbox`. The current `AgentInputEventQueueManager` should be renamed/moved to `InboxQueueStore` or equivalent and kept private to the inbox subsystem. The current `AgentTurnInputBox` should be renamed/reshaped into `TurnToolInputPort` and kept internal to `AgentTurn` / turn phases.

## External Tool Approval / Denial Routing Model

Tool approval is an active-turn agent message. It may enter the unified `AgentMessageInbox`, but it is never eligible to start a new turn. The reason this is safe is the second-stage scheduler rule: the inbox loop keeps running while the active `AgentTurnRunner` task waits, and `AgentMessageScheduler` dispatches active-turn messages to active-turn handlers instead of parking them behind future user messages.

Final approval spine:

```text
Server approve/deny command
  -> AgentRun.approveToolInvocation(invocationId, approved, reason)
  -> AgentRunBackend.approveToolInvocation(...)
  -> AutoByteusAgentRunBackend.approveToolInvocation(...)
  -> Agent.postToolExecutionApproval(invocationId, approved, reason, { turnId? })
  -> AgentRuntime.postToolApproval(ToolApprovalInputMessage)
  -> AgentMessageInbox.postAwaitable(ToolApprovalInboxMessage)
  -> AgentMessageScheduler.dispatch(...)
  -> ToolApprovalMessageHandler validates active turn and pending invocation with AgentRuntimeState
  -> TurnToolInputPort.postApproval(ToolApprovalInputMessage)
  -> ToolPhase.waitForApproval(invocationId, scope.signal) resumes
```

Final public/runtime API shape:

```ts
type ToolApprovalInputMessage = {
  kind: 'tool_approval';
  invocationId: string;
  turnId?: string;
  approved: boolean;
  reason?: string | null;
  requestedBy?: string;
};

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
  postToolApproval(input: ToolApprovalInputMessage): Promise<PostToolApprovalResult>;
}
```

Validation and stale-result rules:

- `invocationId` is required and must be non-empty.
- `turnId` is optional because current server/backend APIs may only provide invocation ID; if supplied, it must match the active turn.
- If runtime is stopped or the inbox loop is not running, return `runtime_stopped`; do not enqueue.
- If no active turn exists when the handler validates, return `no_active_turn`.
- If supplied `turnId` does not match the active turn, return `stale_turn`.
- If the active turn is interrupting/interrupted/settled, return `interrupted_turn` or `stale_turn` depending on available state.
- If the invocation is not pending in `AgentRuntimeState.pendingToolApprovals`, return `no_pending_invocation`.
- Only after scheduler/handler/runtime-state validation may the message be posted to `TurnToolInputPort`.
- `TurnToolInputPort.postApproval(...)` wakes exactly the waiting `ToolPhase.waitForApproval(...)` for that invocation.
- Denial is a valid tool approval decision. `ToolPhase` converts it into denied-tool-result semantics and continues through `ToolResultPipeline` / continuation unless the turn is interrupted.

Boundary rule: server/native backends call the public native facade; the facade calls `AgentRuntime.postToolApproval`; runtime submits an awaitable approval message to `AgentMessageInbox`; only `ToolApprovalMessageHandler` / runtime state may post to `TurnToolInputPort`. External callers, server backends, and team routing code must not write directly to `TurnToolInputPort` internals or low-level queue storage.

Team note: native team approval routing remains a team/member boundary concern. A team-level approval command should locate the target member and call that member agent's `postToolExecutionApproval(...)`; it must not bypass the member runtime's `AgentRuntime.postToolApproval(...)` path.

## Outbox Lane Model

If the architecture names an inbox, it should also name the outbound side. Today outbound behavior is scattered through direct notifier calls from handlers and processors:

- assistant complete response;
- streaming segment start/content/end events;
- tool execution started/succeeded/failed logs;
- tool approval requested/approved/denied;
- output-generation errors;
- compaction status;
- artifacts, todo updates, system task notifications, inter-agent message notifications;
- turn started/completed/interrupted.

The target design should introduce an **AgentOutbox** as the canonical outbound publication boundary. It does not need to be a durable queue; it can be a thin façade over `AgentExternalEventNotifier` / stream payload builders as long as it is the final domain publication owner. The important part is ownership.

| Outbox Lane | Messages | Producer | Consumer | Notes |
| --- | --- | --- | --- | --- |
| Assistant output lane | final assistant response, final/error output | LLM response/output pipeline | notifier/event stream/server/UI | May later support output processors before publishing. |
| Streaming segment lane | reasoning/text/media/tool-call segment events | LLM phase / streaming handler | stream pipeline/server/UI | Must support interrupted segment finalization. |
| Tool lifecycle lane | approval requested/approved/denied, execution started/succeeded/failed/interrupted, tool logs | tool phase / tool pipelines | stream pipeline/server/UI | Interrupted tool is distinct from failed tool. |
| Turn lifecycle lane | turn started/completed/interrupted, status changes | runtime/runner | status manager/notifier/server/UI | Turn interruption is not runtime shutdown. |
| Runtime lifecycle lane | bootstrap, ready, error, shutdown, stopped | runtime lifecycle pipeline | status manager/notifier/server/UI | Runtime lifecycle, not turn-local output. |
| Artifact/state update lane | artifacts, todo list, compaction status, memory/context notifications | relevant services/pipelines | stream pipeline/server/UI | Observability/state publication. |

Design rule: **inbox messages drive work; outbox messages publish facts/results. Outbox messages must not be required to advance the internal agent loop.**

This avoids the same fragmentation problem on the outbound side. Instead of each handler directly knowing every notifier method, runner phases and pipelines publish domain outbox messages:

```ts
outbox.publish({
  kind: 'tool_execution_interrupted',
  turnId,
  invocationId,
  reason,
});

outbox.publish({
  kind: 'assistant_complete',
  turnId,
  response,
});
```

Then `AgentOutbox` maps those to existing notifier/event-stream payloads. This creates a single place to add new interrupt-specific outbound messages such as `turn_interrupted` and `tool_execution_interrupted`.

File guidance:

- Add `autobyteus-ts/src/agent/outbox/agent-outbox.ts` as a small publication façade.
- Keep `AgentExternalEventNotifier` as the low-level emitter for now.
- Route runner, phase, pipeline, and lifecycle publication through outbox calls; do not add new direct notifier calls from turn-control code.
- Do not make outbox a control queue for the runner; it is observation/output only.

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
| AgentMessageInbox availability | `AgentWorker` / `AgentMessageScheduler` | External turn triggers must not start until bootstrap succeeds and ready/idle is reached. |

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

- Add `AgentBootstrapper.run(context)` for single-agent, mirroring `AgentTeamBootstrapper.run(context)`. Remove bootstrap event choreography as a control-flow mechanism; lifecycle events are emitted through AgentOutbox/status notification only.
- Extract `SystemPromptPipeline` under `agent/pipelines` so system prompt processors join the processor-pipeline concept while remaining bootstrap-owned.
- Keep `AgentShutdownOrchestrator` and team shutdown orchestrator as lifecycle pipeline owners. Do not move them under `AgentTurnRunner`.
- Ensure `interrupt()` never triggers `AgentShutdownOrchestrator`; ensure `stop()` still does.
- Add tests for: bootstrap success still reaches idle, bootstrap failure still reaches error, interrupt during bootstrap does not call shutdown, stop during active turn performs terminal cleanup, and normal interrupt leaves cleanup untouched.

## Refined Responsibility Split

The second-stage refactor is not a cosmetic rename. It clarifies the remaining inbound-message architecture after the first-stage runner/phase/pipeline extraction.

### Core Objects

| Object | Kind | Owns | Must Not Own | Why |
| --- | --- | --- | --- | --- |
| `AgentRuntime` | Public lifecycle/control boundary | `start`, terminal `stop`, side-band `interrupt`, message submission, run status access, runtime-owned inbox/scheduler/worker/outbox/state creation. | LLM/tool phase execution, provider cancellation details, message-handler internals. | Keeps external API stable and separates terminal lifecycle/control from turn work. |
| `AgentMessageInbox` | Runtime inbound boundary | Typed inbound agent messages, semantic lanes, parked external work, lane availability, claim/park mechanics, awaitable command replies where needed. | Scheduling policy, turn-loop execution, phase logic. | One intuitive inbox for user, agent, lifecycle, tool approval/result messages without a second public inbox. |
| `AgentWorker` | Long-lived runtime loop | Runtime init, bootstrap, inbox loop, calling scheduler for dispatchable messages, terminal shutdown coordination. | Message routing policy, normal LLM/tool reasoning loop, processor execution. | Keeps the runtime alive while an active turn task runs. |
| `AgentMessageScheduler` | Dispatch policy owner | Decide dispatchability by message kind, inbox lane, and runtime/turn state; claim messages through `AgentMessageInbox`; invoke typed message handlers; leave future external messages parked while active. | Inbox storage mechanics, processor logic, phase execution, provider/tool cancellation. | Makes scheduling explicit instead of spreading `if` branches across worker/runtime. |
| `AgentMessageHandler` | Entry handler per message family | Validate/normalize one inbound message family and call the correct domain owner or pipeline. | Chaining LLM/tool phases as hidden event choreography. | Keeps handlers useful but bounded. |
| `AgentTurn` | Per-turn state object | Turn ID, active tool batches, `TurnToolInputPort`, execution scope, settlement state, interruption metadata. | Running the loop, calling LLM/tools, status protocol mapping. | Gives the active turn one canonical identity and cancellation/settlement state. |
| `TurnToolInputPort` | Internal turn-scoped tool input primitive | Wait/post tool approval/result messages, wake waiting `ToolPhase` operations, fence stale messages. | New-turn scheduling, non-tool phase input, or public runtime command routing. | Replaces top-level active-turn inbox language with a tool-specific internal port. |
| `AgentTurnRunner` / `AgentLoopRunner` | Per-turn use-case runner | The finite loop for one trigger: input processing, LLM phase, tool request/approval/execution/result phase, continuation, final/idle/interrupted outcome. | Runtime start/stop, external mailbox ownership, frontend/server protocol mapping. | The turn loop remains one direct owner. |
| `TurnExecutionScope` | Per-turn cancellation/operation primitive | AbortController/signal, active operation metadata, abort callback registry, `runAbortable`, interruption error normalization, late-result fencing hooks. | Business loop decisions, LLM/tool semantics, runtime lifecycle. | Keeps cancellation mechanics out of runner and adapters. |

### Scheduler / Runner Control Shape

The first-stage implementation awaits `AgentTurnRunner.run(...)` directly from `AgentWorker`. That is safe when active-turn approvals are routed side-band directly to the current turn, but it is not sufficient for a unified inbox where tool approvals/results are inbound messages.

Second-stage target:

```ts
class AgentWorker {
  async runInboxLoop() {
    await this.bootstrapRuntime();
    while (!this.stopRequested) {
      const message = await scheduler.nextDispatchable({
        inbox,
        runtimeState: state,
        signal: this.workerSignal,
      });
      await scheduler.dispatch(message);
    }
  }
}

class TurnStartMessageHandler {
  async handle(message: UserInboxMessage | InterAgentInboxMessage) {
    if (state.activeTurn) return { accepted: false, code: 'not_dispatchable' };
    const turn = state.startActiveTurn(message.turnId);
    const runnerTask = new AgentTurnRunner(context, turn).run(message);
    state.registerActiveTurnTask(turn.turnId, runnerTask);
    runnerTask.finally(() => {
      state.completeActiveTurn(turn.turnId);
      scheduler.wakeDispatchabilityChanged();
    });
    return { accepted: true, code: 'turn_started', turnId: turn.turnId };
  }
}
```

The worker loop continues to read dispatchable active-turn/lifecycle messages while the runner task is active. One-active-turn is enforced by scheduler/state, not by blocking the entire inbox loop.

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
    input: AgentInputUserMessage | UserInboxMessage | InterAgentInboxMessage,
    context: AgentContext,
    options: { turn: AgentTurn; startsNewTurn: boolean }
  ): Promise<ProcessedLlmUserInput>
}
```

Then both paths use the same pipeline:

```text
External user input:
  AgentMessageInbox -> AgentMessageScheduler -> TurnStartMessageHandler -> AgentTurnRunner -> AgentInputPipeline.processForLlm(startsNewTurn=true)

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
| External user/inter-agent messages | Runtime inbox triggers | Valid use of a queue behind a semantic inbox. | `AgentMessageInbox` / `AgentWorker` scheduler |
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
  async run(trigger: UserInboxMessage | InterAgentInboxMessage): Promise<TurnOutcome> {
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

- `AgentMessageInbox` and `AgentMessageScheduler` schedule turn-starting, active-turn, and lifecycle inbox messages;
- runner phase services implement turn-local business flow;
- events/notifiers report status and streaming facts;
- internal queue events must not be the normal representation of the agent loop.

This is a significant refactor, but it improves locality, makes interruption natural, and makes the tool-result continuation rule easy to verify.

## Design Principles Validation

| Principle | Validation | Design Consequence |
| --- | --- | --- |
| Single Responsibility | Runtime, AgentMessageInbox, worker, turn state, turn runner, phase services, and cancellation scope each have one primary reason to change. | Do not put inbox eligibility in low-level queue storage; do not put LLM/tool loop policy in `AgentWorker`; do not duplicate cancellation mechanics directly in every phase service. |
| Separation of Lifetimes | Runtime/worker are long-lived; turn/runner/scope are finite. | `stop()` targets runtime/worker lifetime; `interrupt()` targets active turn lifetime. |
| Structured Concurrency | Child operations belong to a parent turn scope. | LLM streams, tool calls, approvals, and continuations must be tied to one `AgentTurn.executionScope`. |
| Encapsulation | Higher layers issue intent; lower layers implement mechanics. | Server calls `agent.interrupt`; runtime interrupts active turn; runtime input goes through `AgentMessageInbox`; providers/tools only receive generic execution options. |
| Authoritative Boundary Rule | Callers depend on the semantic owner, not both the owner and its internals. | Runtime/worker use `AgentMessageInbox`, not both `AgentMessageInbox` and `InboxQueueStore`; runner uses phase/pipeline services, not old handlers. |
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
- Evidence: The first-stage worktree already fixed the original hidden-loop problem by introducing `AgentTurnRunner`, phase services, typed pipelines, `TurnExecutionScope`, and native interrupt routing. The remaining design issue is inbound-message clarity: current code exposes `AgentInputBox` plus `AgentTurnInputBox` plus `AgentInputEventQueueManager`, while scheduling/handler selection is still implicit in worker/runtime branches.
- Design response: Preserve the implemented runner/phase/pipeline/interrupt architecture, then refactor the inbound side to `AgentMessageInbox -> AgentMessageScheduler -> typed AgentMessageHandler -> pipeline/domain owner`, with `TurnToolInputPort` internal to the active turn.
- Refactor rationale: A superficial rename would not solve dispatch ownership. A second public active-turn inbox keeps the mental model less intuitive. A unified inbox is safe only if scheduling is explicit and the worker loop remains able to dispatch active-turn/lifecycle messages while one runner task is active.
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
- Required final-state policy: old event-handler queue choreography for normal LLM/tool turn progression must be removed. Remaining event/listener code may only serve external input boundaries, lifecycle observation, or outbox delivery; it must not serve as hidden control flow.
- Required action: remove the native Autobyteus backend behavior that implements `interrupt()` by calling `stop()`.
- Required action: replace misleading stop-generation command naming in the app-owned WebSocket/store layer with interrupt-generation naming, rather than adding a dual stop/interrupt command path. The user-facing button may still say “Stop” if product wants that label, but code/protocol ownership should use interrupt semantics.
- Required action: stop treating aborted LLM/tool work as normal errors or normal completions.
- The design must not leave a fallback branch where native interrupt silently uses stop.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User presses interrupt current generation | Active `AgentTurnRunner` settles current `AgentTurn` interrupted and runtime returns idle/reusable | `AgentRuntime` / `AgentTurnRunner` / `AgentTurn` | Core requested behavior for native single-agent runtime. |
| DS-002 | Primary End-to-End | `AgentRuntime.interrupt()` during LLM phase | `LlmPhase` aborts/abandons provider stream; no assistant completion is ingested | `AgentTurnRunner` + `TurnExecutionScope` + `BaseLLM` boundary | Ensures interruption reaches LLM without relying on worker-dispatched handlers. |
| DS-003 | Primary End-to-End | `AgentRuntime.interrupt()` during tool phase | `ToolPhase` aborts/abandons active tool execution; late result fenced; no continuation LLM call | `AgentTurnRunner` + `TurnExecutionScope` + `BaseTool` boundary | Ensures interruption reaches tools and same-turn batch mechanics. |
| DS-004 | Primary End-to-End | User interrupts native team run | Running member agents/sub-teams are interrupted and team returns idle without teardown | `AgentTeamRuntime` / `TeamManager` | Native team backend currently calls stop; team behavior must match interrupt semantics. |
| DS-005 | Return-Event | Interrupted turn/tool status | Frontend observes interrupting/interrupted lifecycle and can clear sending state | `AgentOutbox` / runtime event/status pipeline | Prevents interruption from looking like success, failure, or shutdown. |
| DS-006 | Bounded Local | Active `AgentTurnRunner` operation | `TurnExecutionScope.runAbortable` returns/throws interruption and runner settles | `AgentTurnRunner` + `TurnExecutionScope` | Queue-based worker dispatch is not the normal turn-control path; operations are scoped directly under the turn. |
| DS-007 | Bounded Local | Tool batch settlement under active turn | Expected invocation IDs are settled/fenced and `TurnToolInputPort` is closed/cleared on interrupt | `AgentTurn` / `TurnToolInputPort` / `AgentRuntimeState` | Prevents late tool results from reviving an interrupted turn. |
| DS-008 | Primary End-to-End | External approve/deny tool command | `ToolPhase.waitForApproval` receives valid decision or runtime returns stale/no-active/no-pending/interrupted result | `AgentRuntime` / `AgentRuntimeState` / `TurnToolInputPort` / `ToolPhase` | Completes UC-003/CDF-009 after removing old approval handler path. |
| DS-009 | Primary End-to-End | External/async tool result arrives for an active invocation | `ToolPhase.waitForToolResults` receives the validated result or stale/no-active/no-pending/interrupted result is fenced | `AgentMessageScheduler` / `AgentRuntimeState` / `TurnToolInputPort` / `ToolPhase` | Completes the tool-result-in-inbox path without allowing tool results to start turns or bypass CDF-007. |

## Primary Execution Spine(s)

Single-agent native interrupt:

`Client Interrupt Command -> AgentRunBackend.interrupt -> Agent.interrupt -> AgentRuntime.interrupt -> Active AgentTurnRunner/TurnExecutionScope Interrupt -> LlmPhase/ToolPhase Aborts Or Abandons -> AgentTurn Interrupted Settlement -> AgentOutbox Turn/Tool Interrupted Events -> Runtime Idle Status`

Native LLM interruption:

`AgentRuntime.interrupt -> AgentTurn.executionScope.interrupt -> LlmPhase abortable provider stream -> BaseLLM/provider request abort or local abandonment -> streaming segment interruption finalization -> skip assistant ingestion/output pipeline -> interrupted turn settlement`

Native tool interruption:

`AgentRuntime.interrupt -> AgentTurn.executionScope.interrupt -> ToolPhase abortable execute -> BaseTool / terminal / MCP cancellation -> TurnToolInputPort fences expected invocation IDs -> AgentOutbox tool-interrupted lifecycle -> no ToolResultContinuationBuilder call -> interrupted turn settlement`

Native tool approval/denial response:

`Server Approval Command -> AgentRunBackend.approveToolInvocation -> AutoByteusAgentRunBackend.approveToolInvocation -> Agent.postToolExecutionApproval -> AgentRuntime.postToolApproval -> AgentMessageInbox.postAwaitable(ToolApprovalMessage) -> AgentMessageScheduler -> ToolApprovalMessageHandler validates active turn/pending invocation -> TurnToolInputPort.postApproval -> ToolPhase.waitForApproval resumes or stale outcome returns`

External/async tool result response:

`External Tool Result Callback -> AgentRuntime.submitMessage(ToolResultInboxMessage) -> AgentMessageInbox active-turn lane -> AgentMessageScheduler -> ToolResultMessageHandler validates active turn/pending invocation -> TurnToolInputPort.postToolResult -> ToolPhase.waitForToolResults resumes -> ToolResultPipeline -> ToolResultContinuationBuilder -> AgentInputPipeline(SenderType.TOOL)`

Native team interruption:

`Team Interrupt Command -> AutoByteusTeamRunBackend.interrupt -> AgentTeam.interrupt -> AgentTeamRuntime.interrupt -> TeamManager interrupt running nodes -> member AgentRuntime interrupts -> Team idle/interrupted status`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The user asks to cancel the current native generation. The server backend calls native `Agent.interrupt()`. Runtime signals the active `AgentTurn` side-band through the runner/scope. The active phase service sees the scope interruption, stops producing normal output, and returns/throws `AgentInterruptionError` to `AgentTurnRunner`. The runner closes the turn tool input port, publishes interrupted facts through `AgentOutbox`, settles the turn interrupted, and the runtime remains running/idle. | Client command, AgentRunBackend, AgentRuntime, AgentTurnRunner, AgentTurn, TurnExecutionScope, AgentOutbox | AgentRuntime / AgentTurnRunner / AgentTurn | Server backend, status projection, stream events |
| DS-002 | While LLM streaming is active, interrupt aborts the active turn scope. `LlmPhase` races provider iteration against the scope, asks the provider/iterator to abort/close when supported, closes open response segments with interruption metadata, skips assistant ingestion and `LLMResponsePipeline`, and returns interruption to the runner. | AgentRuntime, AgentTurnRunner, TurnExecutionScope, LlmPhase, BaseLLM, provider | AgentTurnRunner + TurnExecutionScope + BaseLLM | Streaming parser/segments, memory working-context rollback/suppression |
| DS-003 | While a tool is running, interrupt aborts the active turn scope. `ToolPhase` races tool execution against that scope. Participating tools receive the signal; terminal foreground command closes its session. The phase publishes tool-interrupted lifecycle through `AgentOutbox`, marks/fences expected invocation IDs, closes/fences the turn tool input port for that batch, and returns interruption without building a TOOL continuation. | AgentRuntime, AgentTurnRunner, TurnExecutionScope, ToolPhase, BaseTool, TurnToolInputPort | AgentTurnRunner + TurnExecutionScope + BaseTool | Terminal/MCP cancellation, recent-settled cache, pending approval cleanup |
| DS-004 | A team interrupt is a coordination operation, not shutdown. The native team runtime enters interrupting, asks TeamManager to interrupt all currently running cached agents/sub-teams, waits boundedly for member settlement, and returns team status to idle/interrupted. | Team backend, AgentTeamRuntime, TeamManager, member AgentRuntime | AgentTeamRuntime / TeamManager | Member context mapping, team status/events |
| DS-005 | Interrupt outcome travels through `AgentOutbox`, native notifier, stream conversion, server WebSocket mapper, and frontend handlers as interrupting/interrupted metadata. UI can clear sending state and keep the run online. | AgentOutbox, AgentExternalEventNotifier, AgentEventStream, server converter, WebSocket mapper, frontend handlers | AgentOutbox / runtime event pipeline | Status visuals, protocol enum |
| DS-006 | The worker remains the serialized inbox loop, but normal turn execution is not worker-dispatched handler choreography. Active runner phase services execute operations through `TurnExecutionScope` while the worker loop remains available for active-turn/lifecycle message dispatch and preserves unrelated parked messages. | AgentWorker, AgentMessageScheduler, AgentTurnRunner, TurnExecutionScope, phase services | AgentTurnRunner / TurnExecutionScope / AgentMessageScheduler | Signal-aware phase operations, active-turn message dispatch, late-promise logging |
| DS-007 | Interruption invalidates all same-turn pending/queued continuation work. Tool approvals are cleared or rejected by active-turn identity. Invocation IDs expected by the active batch are marked recently settled/fenced so stale late results are ignored. | AgentTurn, TurnToolInputPort, AgentRuntimeState, recent settled cache | AgentTurn / TurnToolInputPort / AgentRuntimeState | Message predicates, pending approval map |
| DS-008 | External approval/denial is a runtime active-turn message, not a new turn and not an old event-handler path. The server/backend command calls the native facade, runtime posts an awaitable inbox message, scheduler dispatches `ToolApprovalMessageHandler`, validation occurs against active turn/pending invocation, and the waiting `ToolPhase` resumes or returns a stale/no-active/no-pending/interrupted outcome. | AgentRunBackend, Agent facade, AgentRuntime, AgentMessageInbox, AgentMessageScheduler, ToolApprovalMessageHandler, AgentRuntimeState, TurnToolInputPort, ToolPhase | AgentRuntime / AgentMessageScheduler / AgentRuntimeState / TurnToolInputPort | Server command mapping, stale result mapping, team member routing |
| DS-009 | If tool execution is externalized or a tool result arrives asynchronously, the result is an active-turn inbox message. Scheduler dispatches `ToolResultMessageHandler`; runtime state validates active turn and expected invocation identity; `TurnToolInputPort` wakes the waiting `ToolPhase`; then normal CDF-007 tool-result processing builds the TOOL-sender continuation. Invalid or late results are fenced and cannot start a turn. | Tool result callback, AgentMessageInbox, AgentMessageScheduler, ToolResultMessageHandler, AgentRuntimeState, TurnToolInputPort, ToolPhase, ToolResultPipeline | AgentMessageScheduler / AgentRuntimeState / ToolPhase | External tool host/callback mapping, stale result classification, recent-settled cache |

## Spine Actors / Main-Line Nodes

- Client interrupt command: sends the user's cancel-current-generation intent.
- AgentRunBackend / TeamRunBackend: runtime-kind adapter for the command.
- Agent / AgentTeam facade: public native runtime API exposed above runtime internals.
- AgentRuntime / AgentTeamRuntime: authoritative lifecycle/control boundary.
- AgentMessageInbox: semantic runtime inbox for turn-starting triggers, active-turn messages, lifecycle messages, and queued/parked messages that can exist outside a turn.
- AgentWorker / inbox loop: keeps the runtime inbox loop alive and delegates dispatch to `AgentMessageScheduler`; does not own LLM/tool loop semantics.
- AgentTurnRunner: finite per-turn agent loop owner.
- AgentTurn: active-turn identity, message port, cancellation scope, and settlement state owner.
- TurnExecutionScope: per-turn cancellation and late-result fencing primitive.
- LlmPhase / ToolPhase: direct phase services called by the runner.
- BaseLLM / BaseTool: provider/tool boundary where cancellation leaves runtime internals.
- AgentOutbox / runtime event/status pipeline: publishes interrupting/interrupted state to server/UI.

## Ownership Map

- `AgentRuntime` owns public runtime control commands: start, stop, interrupt, external input submission, active-turn approval input, and status projection for runtime-level control events.
- `AgentMessageInbox` owns typed inbound lanes, parked messages, lane availability, claim/park mechanics, and awaitable command replies above low-level storage.
- `AgentWorker` owns long-lived inbox loop execution, runtime bootstrap readiness, and stop/shutdown sequencing. It delegates routing decisions to `AgentMessageScheduler` and must not own the finite LLM/tool reasoning loop.
- `AgentTurnRunner` / `AgentLoopRunner` owns the finite per-turn reasoning loop and is the primary local try/catch boundary for `AgentInterruptionError`.
- `LlmPhase` owns one LLM phase: request assembly, compaction preparation, provider streaming, streaming parser integration, and phase-level interruption handling.
- `ToolPhase` owns one tool phase: invocation preprocessing, approval coordination through `TurnToolInputPort`, abortable execution, result collection, and tool-interrupted lifecycle publication.
- `AgentTurn` owns turn ID, active tool batch, `TurnToolInputPort`, `TurnExecutionScope`, active operation metadata, interrupted flag, and settlement promise.
- `AgentRuntimeState` owns active-turn storage, pending approval indexes needed across external approval routing, approval input validation/stale-result classification, recent settled invocation IDs, and working-context turn checkpoint restoration/suppression.
- `AgentInputPipeline`, `ToolInvocationPipeline`, `ToolResultPipeline`, `LLMResponsePipeline`, and `SystemPromptPipeline` own typed processor orchestration.
- `AgentOutbox` owns outbound domain publication above the low-level notifier/event-stream.
- `BaseLLM` owns the stable cancellation-aware LLM invocation contract; provider adapters own SDK-specific signal mapping.
- `BaseTool` owns the stable cancellation-aware tool execution contract; concrete tools own transport/process-specific cancellation.
- `AgentTeamRuntime` owns team-level interrupt command; `TeamManager` owns propagation to currently managed member nodes.
- Server Autobyteus backends are thin adapters that must call native runtime control APIs and must not invent stop fallback semantics.

If a public facade exists, it is thin: `Agent` and `AgentTeam` expose commands but `AgentRuntime` and `AgentTeamRuntime` govern lifecycle/control policy.

## Thin Entry Facades / Public API Surfaces (If Applicable)

| Facade / Entry Surface | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `Agent.interrupt(...)` | `AgentRuntime.interrupt(...)` | Public native agent API matching `postUserMessage` / `stop`. | AbortController, queue cleanup, status policy. |
| `Agent.postToolExecutionApproval(...)` | `AgentRuntime.postToolApproval(...)` | Public native approval/denial API used by server, CLI, UI, and team member routing. | Pending-invocation validation beyond delegating to runtime. |
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
| Queue/handler choreography for normal turn loop | It hides the finite agent loop across worker-dispatched handlers. | `AgentTurnRunner` + direct phase/pipeline services | In This Change | Old queue events may remain only as outbox/lifecycle/external boundary facts, not turn-control flow. |
| Treating `InboxQueueStore` as the semantic agent inbox | Queue storage should not own turn-starting eligibility or domain routing. | `AgentMessageInbox` in `agent/message-inbox/agent-message-inbox.ts`, with queue manager as optional low-level storage. | In This Change | Prevents tool results/approvals from being mistaken for turn-starting inbox messages. |
| Queue-only idea for interrupt | Normal queued work cannot preempt an active phase operation. | Side-band `AgentRuntime.interrupt()` -> active `TurnExecutionScope` | In This Change | Interrupt events can still be published through outbox/status. |
| Treating abort as LLM/tool error | Interrupted work is not a runtime error or tool failure. | `AgentInterruptionError` and interrupted lifecycle outbox events. | In This Change | Provider/tool abort exceptions must normalize to interruption. |
| Normal tool-continuation after interrupted tool batch | Would let an interrupted turn continue. | Turn-scoped `TurnToolInputPort` close/fencing + recent settled invocation IDs. | In This Change | Late results ignored. |
| App-owned `STOP_GENERATION` protocol/store naming | It hides the domain distinction the task is fixing. | `INTERRUPT_GENERATION` / `interruptGeneration` names. | In This Change | Keep product button label only if desired; code/protocol should use interrupt. |

## Return Or Event Spine(s) (If Applicable)

Single-agent interrupted status/event return:

`AgentTurnRunner settlement -> AgentOutbox -> AgentExternalEventNotifier -> AgentEventStream -> AutoByteusStreamEventConverter -> AgentRunEventMessageMapper -> WebSocket ServerMessage -> frontend streaming handler -> context status/isSending update`

Tool interrupted event return:

`ToolPhase -> AgentOutbox.toolExecutionInterrupted -> AgentExternalEventNotifier -> AgentEventStream -> server converter -> TOOL_EXECUTION_INTERRUPTED message -> frontend activity/tool lifecycle handler`

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
| Active-turn tool message predicate | DS-007, DS-009 | AgentMessageScheduler / TurnToolInputPort / AgentRuntimeState | Identify/drop/fence tool approvals/results belonging to interrupted turn while preserving parked AgentMessageInbox messages. | Prevents interrupted continuations. | Generic queue storage becomes domain-aware of every message shape. |
| Working-context interruption checkpoint | DS-002, DS-003 | AgentRuntimeState / MemoryManager | Restore/suppress working context additions from interrupted turn. | Avoids incomplete user/tool/assistant fragments driving future LLM calls. | LlmPhase would own memory rollback policy. |
| Provider signal mapping | DS-002 | BaseLLM/provider adapters | Translate generic signal to OpenAI/Anthropic/Gemini/Ollama/etc SDK capabilities. | Keeps provider details below BaseLLM boundary. | LlmPhase would depend on provider internals. |
| Tool signal mapping | DS-003 | BaseTool/concrete tools | Translate generic signal to terminal/MCP/local tool behavior. | Keeps process/transport cancellation below tool boundary. | ToolPhase would know terminal/MCP internals. |
| Frontend status visualization | DS-005 | UI stores/components | Display interrupting/interrupted and clear sending state. | User-visible correctness. | Runtime would leak UI-specific semantics. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Runtime command boundary | `agent/runtime` | Extend | Runtime already owns start/stop/status command surface. | N/A |
| Active turn state | `agent/agent-turn.ts` + `agent/context/agent-runtime-state.ts` | Extend | Active turn already gates event-loop external input and tool batches. | N/A |
| Runtime message inbox boundary | `InboxQueueStore` low-level queues | Create semantic boundary under `agent/message-inbox` | Typed lanes, parking, and awaitable active-turn commands need a semantic owner above queue storage; dispatchability belongs to `AgentMessageScheduler`. | Leaving this only as event queue storage makes the worker/queue look like the domain inbox and obscures message semantics. |
| Finite agent loop runner | Currently implicit in `AgentWorker` + queued handlers | Create/Extract under `agent/loop` | The per-turn LLM/tool continuation loop needs a finite owner that can be interrupted independently from the long-lived worker. | Keeping this implicit in AgentWorker preserves the stop/interrupt ambiguity. |
| Processor pipeline orchestration | Currently duplicated across handlers/bootstrap steps | Create under `agent/pipelines` | Ordered processor execution, type validation, and error policy should be consistent but domain-typed. | Existing processor folders define processors, not shared orchestration. |
| Outbox publication boundary | Direct notifier calls scattered across handlers/processors | Create under `agent/outbox` | Phase services need one outbound publication boundary for assistant output, streaming, tool lifecycle, turn/runtime lifecycle, and errors. | Notifier is a low-level emitter, not a domain outbox owner. |
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
| Server approval command path | `AgentRunBackend.approveToolInvocation` + native `Agent.postToolExecutionApproval` | Extend/Reshape | Existing public/server route exists and should be preserved as the public boundary, but final routing must post through `AgentRuntime.postToolApproval` into `AgentMessageInbox`, then through scheduler/handler validation into `TurnToolInputPort` instead of queued approval handlers. | N/A |
| Team propagation | `agent-team/runtime` + `TeamManager` | Extend | Team runtime owns team commands; TeamManager knows managed nodes. | N/A |
| UI streaming protocol | `services/agentStreaming` | Extend/Rename | Existing channel already sends current-generation command and status messages. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent runtime control | start/stop/interrupt, active turn command, status projection | DS-001, DS-006 | AgentRuntime | Extend | Stop remains terminal. |
| Agent turn lifecycle/interruption | AbortSignal, active operation, interrupted settlement, working-context checkpoint | DS-001, DS-002, DS-003, DS-007 | AgentTurn / AgentRuntimeState | Extend | Central invariant owner. |
| Agent turn loop execution | finite per-trigger LLM/tool loop, continuation, runner-level interruption catch/settle | DS-001, DS-002, DS-003, DS-006, DS-007 | AgentTurnRunner / AgentLoopRunner | Create/Extract | Separates finite agent loop from long-lived AgentWorker mailbox. |
| Agent message inbox | unified typed inbound lanes, parked external messages, active-turn command messages, lifecycle messages | CDF-002, CDF-009, CDF-012, DS-006, DS-007, DS-008, DS-009 | AgentMessageInbox / AgentMessageScheduler | Reshape current AgentInputBox | One semantic inbox with lanes; scheduler owns dispatchability; active-turn messages cannot start turns. |
| Tool approval routing | public/native/server approval command as awaitable inbox message, scheduler/handler validation, turn tool input port delivery | CDF-009 | AgentRuntime / AgentMessageInbox / AgentMessageScheduler / ToolApprovalMessageHandler / AgentRuntimeState / TurnToolInputPort | Extend/Create explicit route | Completes approval path without old approval event handler routing. |
| External/async tool result routing | external result as active-turn inbox message, scheduler/handler validation, turn tool input port delivery, then normal continuation | CDF-012, CDF-007 | AgentMessageInbox / AgentMessageScheduler / ToolResultMessageHandler / AgentRuntimeState / TurnToolInputPort / ToolPhase | Create explicit route when externalized tool execution exists | Prevents tool results from starting turns or bypassing tool-result/input pipelines. |
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
| Agent outbox | outbound assistant/tool/segment/lifecycle/error/artifact messages | DS-005, CDF-010 | AgentOutbox | Create/Extract | Canonical publication boundary above notifier/event stream. |
| Runtime streaming events | interrupting/interrupted status and tool/turn interruption events | DS-005 | Notifier / stream pipeline | Extend | Single-agent and team event streams. |
| Native team runtime control | team interrupt propagation to members | DS-004 | AgentTeamRuntime / TeamManager | Extend | Do not reuse shutdown steps. |
| Server backend adapters | map domain interrupt to native interrupt APIs | DS-001, DS-004 | AgentRunBackend / TeamRunBackend | Extend | Remove stop fallback. |
| Frontend protocol/store/status | send interrupt command and reflect interrupted lifecycle | DS-005 | AgentStreamingService / stores | Extend/Rename | Replace app-owned STOP_GENERATION naming. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/interruption/agent-interruption.ts` | Agent interruption support | Runtime interruption model | `AgentInterruptOptions`, `AgentInterruptResult`, `AgentInterruptionError`, `isAgentInterruptionError`, reason normalization. | One semantic model for interrupted outcome. | N/A |
| `autobyteus-ts/src/agent/interruption/turn-execution-scope.ts` | Agent interruption support | TurnExecutionScope | Per-turn cancellation scope: signal owner, abort listener registry, operation runner, late-result fencing hooks. | Architectural container for interruptible turn execution. | `AgentInterruptionError`, abortable helpers |
| `autobyteus-ts/src/agent/interruption/abortable-operation.ts` | Agent interruption support | Abortable operation utility | Abort-aware promise and async-iterator utilities plus late-promise handling used by the turn execution scope. | Operational utility separate from domain types. | `AgentInterruptionError` |
| `autobyteus-ts/src/agent/agent-turn.ts` | Agent turn lifecycle | AgentTurn | Signal/scope, interrupted flag, active operation, settlement promise, tool batch. | Existing turn owner extended with turn lifecycle state. | `AgentInterruptOptions` |
| `autobyteus-ts/src/agent/message-inbox/agent-message-inbox.ts` | Agent message inbox | AgentMessageInbox | Typed inbound lanes, `post`, `postAwaitable`, lane availability, candidate peek, claim, parking, and awaitable reply resolution above low-level storage. | Makes one agent inbox first-class while keeping dispatch policy outside storage. | `AgentInboxMessage`, `MessageHandlerResult` |
| `autobyteus-ts/src/agent/message-inbox/inbox-queue-store.ts` | Agent message inbox | InboxQueueStore | Low-level async queue/availability storage. | Replaces architecture-facing queue-manager naming with private storage. | N/A |
| `autobyteus-ts/src/agent/message-inbox/agent-message-scheduler.ts` | Agent message scheduling | AgentMessageScheduler | Dispatchability and handler selection by message kind and runtime/turn state. | Keeps routing policy out of worker and storage. | AgentMessageHandler registry |
| `autobyteus-ts/src/agent/message-inbox/handlers/*.ts` | Agent message handlers | Typed AgentMessageHandlers | Turn-start, tool-approval, tool-result, and lifecycle entry handlers. | Handlers call domain owners/pipelines without recreating phase choreography. | AgentInboxMessage types |
| `autobyteus-ts/src/agent/loop/agent-turn-runner.ts` | Agent turn loop execution | AgentTurnRunner | Finite reasoning loop around input -> LLM -> tools -> continuation -> idle/interrupted. | New owner for the per-turn agent loop formerly implicit in worker queue choreography. | `AgentTurn`, `TurnExecutionScope` |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | Agent turn loop execution | LlmPhase | Request assembly, context/compaction preparation, signal-aware provider streaming, stream parsing, interrupted segment finalization, and final/tool outcome return. | One phase service owns LLM-phase behavior under the runner. | `LLMInvocationOptions`, `TurnExecutionScope`, `AgentOutbox` |
| `autobyteus-ts/src/agent/loop/tool-phase.ts` | Agent turn loop execution | ToolPhase | Tool invocation preprocessing, approval coordination, signal-aware tool execution, ordered result collection, tool interruption lifecycle, and stale-result fencing. | One phase service owns tool-phase behavior under the runner. | `ToolExecutionOptions`, `TurnToolInputPort`, `AgentOutbox` |
| `autobyteus-ts/src/agent/loop/turn-tool-input-port.ts` | Agent turn loop execution | TurnToolInputPort | Internal per-turn wait/post port for validated tool approvals and future async tool results keyed by turn/invocation identity. | Keeps turn-scoped tool input delivery private to the active turn while all inbound messages enter AgentMessageInbox. | `AgentTurn`, `TurnExecutionScope` |
| `autobyteus-ts/src/agent/pipelines/processor-pipeline-runner.ts` | Processor pipeline orchestration | ProcessorPipelineRunner | Shared ordered processor execution helper with domain-specific error policies supplied by callers. | Avoids duplicated sorting/validation while keeping typed domain pipelines. | Existing processor interfaces |
| `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts` | Agent input pipeline | AgentInputPipeline | Apply input processors, preserve sender-type/turn rules, build LLM user message data. | Moves current input transformation into a direct runner-callable pipeline. | `AgentInputUserMessage`, LLM input data |
| `autobyteus-ts/src/agent/pipelines/tool-invocation-pipeline.ts` | Tool invocation pipeline | ToolInvocationPipeline | Apply tool invocation preprocessors and produce execution-ready invocation. | Makes pre-execution processing reusable by `ToolPhase`. | ToolInvocation preprocessors |
| `autobyteus-ts/src/agent/pipelines/tool-result-pipeline.ts` | Tool result pipeline | ToolResultPipeline | Apply tool execution result processors and memory-ingest side effects. | Makes post-tool processing reusable before continuation building. | Tool result processors |
| `autobyteus-ts/src/agent/pipelines/llm-response-pipeline.ts` | LLM response/output pipeline | LLMResponsePipeline | Apply LLM response processors/output processors and decide final assistant emission. | Keeps final-response processing explicit after `LlmPhase`. | LLM response processors |
| `autobyteus-ts/src/agent/pipelines/system-prompt-pipeline.ts` | System prompt pipeline | SystemPromptPipeline | Apply system prompt processors and return processed system prompt. | Extracts current system-prompt processor loop into lifecycle pipeline architecture. | System prompt processors |
| `autobyteus-ts/src/agent/loop/tool-result-continuation-builder.ts` | Tool continuation construction | ToolResultContinuationBuilder | Aggregate ordered tool results into SenderType.TOOL AgentInputUserMessage with ContextFiles. | Preserves current tool-continuation message contract outside queue routing. | Tool result data, `AgentInputUserMessage` |
| `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | Agent turn lifecycle | AgentRuntimeState | Request/settle active turn interruption, validate/post active-turn tool approval/result input, clear pending approvals, drop/fence same-turn work, restore/suppress checkpoint. | State already owns activeTurn/pending approvals/recent settled cache. | `AgentTurn`, `ToolApprovalInputMessage`, `ToolResultInputMessage` |
| `autobyteus-ts/src/agent/message-inbox/inbox-queue-store.ts` | Agent message inbox | InboxQueueStore | Generic async queue/availability storage behind `AgentMessageInbox`. | Storage owns mechanics only; inbox/scheduler own domain identity. | N/A |
| `autobyteus-ts/src/agent/outbox/agent-outbox.ts` | Agent outbox | AgentOutbox | Domain publication façade for assistant output, segments, tool lifecycle, turn/runtime lifecycle, errors, artifacts. | One outbound boundary above low-level notifier. | AgentExternalEventNotifier |
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
| `autobyteus-ts/src/agent/message-inbox/agent-message-inbox.ts` | Agent message inbox | AgentMessageInbox | Own typed inbound lanes, parked messages, lane availability, candidate peek/claim, and awaitable active-turn commands. | Makes inbox semantics explicit above queue storage while scheduler owns dispatch policy. | AgentInboxMessage, MessageHandlerResult |
| `autobyteus-ts/src/agent/message-inbox/inbox-queue-store.ts` | Agent message inbox | InboxQueueStore | Private async queue/availability storage for inbox lanes. | Low-level storage only. | N/A |
| `autobyteus-ts/src/agent/message-inbox/agent-message-scheduler.ts` | Agent message scheduling | AgentMessageScheduler | Select dispatchable inbox messages and dispatch typed handlers by message kind/state. | Makes scheduling an explicit owner. | AgentMessageHandler registry |
| `autobyteus-ts/src/agent/message-inbox/handlers/*.ts` | Agent message handlers | Typed AgentMessageHandlers | Turn-start, approval, result, and lifecycle entry handling. | Keeps inbound handling separate from LLM/tool phases. | AgentInboxMessage types |
| `autobyteus-ts/src/agent/loop/agent-turn-runner.ts` | Agent turn loop execution | AgentTurnRunner | Run one finite agent loop from trigger input through LLM/tool cycles to idle or interrupted settlement. | Separates turn execution from long-lived worker mailbox. | AgentTurn, TurnExecutionScope |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | Agent turn loop execution | LlmPhase | Run one LLM phase: request assembly, context preparation, provider streaming through scope, streaming parser integration, response/tool outcome production, interrupted finalization. | Makes the LLM phase a direct runner-owned service instead of a queued handler. | LLMInvocationOptions, AgentOutbox |
| `autobyteus-ts/src/agent/loop/tool-phase.ts` | Agent turn loop execution | ToolPhase | Run one tool phase: invocation preprocessing, approval request/wait, signal-aware execution, result collection, interrupted lifecycle, stale-result fencing. | Makes the tool phase a direct runner-owned service instead of queued request/execution/result handlers. | ToolExecutionOptions, TurnToolInputPort, AgentOutbox |
| `autobyteus-ts/src/agent/loop/turn-tool-input-port.ts` | Agent turn loop execution | TurnToolInputPort | Wait/post/fence tool approvals and future async tool result messages. | Internal turn-scoped tool input primitive, not a public inbox. | AgentTurn, invocation IDs |
| `autobyteus-ts/src/agent/pipelines/processor-pipeline-runner.ts` | Processor pipeline orchestration | ProcessorPipelineRunner | Shared helper for ordered processor execution, with typed domain pipelines choosing contracts and error behavior. | Reduces duplicated processor loops without erasing domain differences. | Existing processor interfaces |
| `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts` | Agent input pipeline | AgentInputPipeline | Shared processing of external and TOOL-continuation input into LLM-ready input data. | Prevents runner extraction from bypassing input processors. | AgentInputUserMessage, input processors |
| `autobyteus-ts/src/agent/pipelines/tool-invocation-pipeline.ts` | Tool invocation pipeline | ToolInvocationPipeline | Shared tool invocation preprocessor pipeline for `ToolPhase`. | Keeps invocation preparation out of worker and tool execution mechanics. | ToolInvocation preprocessors |
| `autobyteus-ts/src/agent/pipelines/tool-result-pipeline.ts` | Tool result pipeline | ToolResultPipeline | Shared tool result processor pipeline for `ToolPhase` before continuation building. | Keeps result processing explicit before continuation building. | Tool result processors |
| `autobyteus-ts/src/agent/pipelines/llm-response-pipeline.ts` | LLM response/output pipeline | LLMResponsePipeline | Shared LLM response/output processor pipeline and assistant-complete emission decision. | Supports existing response processors and future output processors. | LLM response processors |
| `autobyteus-ts/src/agent/pipelines/system-prompt-pipeline.ts` | System prompt pipeline | SystemPromptPipeline | Shared system prompt processor pipeline used by bootstrap. | Aligns bootstrap processors with pipeline architecture. | System prompt processors |
| `autobyteus-ts/src/agent/loop/tool-result-continuation-builder.ts` | Tool continuation construction | ToolResultContinuationBuilder | Build the same SenderType.TOOL continuation message currently produced from completed tool results. | Preserves tool-result-as-user-input semantics outside queue routing. | Tool result data, ContextFile |
| `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | Agent turn lifecycle | AgentRuntimeState | Active-turn interruption request/settlement, approval validation/posting, pending approvals cleanup, turn-local work invalidation, checkpoint restore/suppression. | Existing active state owner. | AgentTurn, ToolApprovalInputMessage |
| `autobyteus-ts/src/agent/message-inbox/inbox-queue-store.ts` | Agent message inbox | InboxQueueStore | Generic queue filtering/clearing primitives behind inbox APIs. | Queue storage owner; no phase ownership and no message eligibility ownership. | Predicate from inbox/scheduler |
| `autobyteus-ts/src/agent/events/agent-events.ts` | Event model | Agent runtime events | Add interrupt requested/turn interrupted observable events. | Existing event definitions. | Interruption types |
| `autobyteus-ts/src/agent/status/status-enum.ts` | Status model | AgentStatus | Add `INTERRUPTING`; update processing helper. | Existing status enum. | N/A |
| `autobyteus-ts/src/agent/status/status-deriver.ts` | Status model | AgentStatusDeriver | Map interrupt requested -> interrupting, turn interrupted -> idle. | Existing status reducer. | New events |
| `autobyteus-ts/src/agent/runtime/agent-runtime.ts` | Runtime control | AgentRuntime | Public `interrupt()`, active-turn approval input (`postToolApproval`), out-of-band signal, bounded settlement wait. | Existing runtime command owner. | Interruption result, PostToolApprovalResult |
| `autobyteus-ts/src/agent/agent.ts` | Public facade | Agent | Delegate `interrupt()` and `postToolExecutionApproval(...)` to runtime. | Thin facade. | Interruption result, PostToolApprovalResult |
| `autobyteus-ts/src/agent/outbox/agent-outbox.ts` | Agent outbox | AgentOutbox | Domain publication façade above notifier/event stream. | One owner for outbound domain messages. | AgentExternalEventNotifier |
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
- `WorkerEventDispatcher` and old turn-advancing event handlers are not normal turn-control owners. Any remaining event/listener code is restricted to external input boundaries, lifecycle observation, public event surfaces, or outbox delivery.
- Server Autobyteus backends must use the native public facade. They must not call runtime internals or stop as a substitute.
- Team interrupt propagation is owned by `AgentTeamRuntime`/`TeamManager`, not by server team backend.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentRuntime.interrupt()` | Active turn runner/scope, status events, settlement wait | `Agent`, server Autobyteus backend, tests | Backend calling `agent.stop()` or mutating active turn directly | Add result/options to `interrupt()`. |
| `AgentRuntime.postToolApproval()` | Awaitable active-turn approval message submission through `AgentMessageInbox`, scheduler/handler validation, approval result classification | `Agent.postToolExecutionApproval`, native/team facades, server Autobyteus backend tests | Server/native code writing directly to `TurnToolInputPort`, `InboxQueueStore`, or old approval handlers | Add `ToolApprovalInputMessage`, `ToolApprovalInboxMessage`, and `PostToolApprovalResult` contract. |
| `AgentMessageInbox` | Low-level queue storage, semantic lanes, parked messages, lane availability, claim/park mechanics, awaitable command replies | `AgentRuntime.submitMessage`, `AgentWorker`, `AgentMessageScheduler`, runtime tests | Callers pushing directly into `InboxQueueStore`, or scheduler/handlers bypassing inbox lanes | Add semantic post/postAwaitable/wait/peek/claim APIs. |
| `AgentTurnRunner` | Per-turn LLM/tool continuation loop and interruption catch/settlement | `AgentWorker`, runtime tests | Worker/event dispatcher directly owning turn-local LLM/tool loop policy, or runner bypassing input pipeline for tool continuation | Extract runner methods and call shared `AgentInputPipeline` / `ToolResultContinuationBuilder`. |
| `LlmPhase` | LLM request assembly, provider streaming, streaming parser integration, interrupted segment finalization | `AgentTurnRunner` | Queued LLM-ready event handler remaining the real LLM phase owner | Move LLM phase logic into `LlmPhase` and call it directly. |
| `ToolPhase` | Invocation preprocessing, approval wait, tool execution, result collection, interrupted tool lifecycle | `AgentTurnRunner` | Queued tool request/execution/result handlers remaining the real tool phase owner | Move tool phase logic into `ToolPhase` and call it directly. |
| `TurnToolInputPort` tool input | Tool approval/result delivery to the active turn's `ToolPhase` | `AgentRuntime.postToolApproval`, `ToolPhase`, `AgentTurnRunner`, optional external tool-result callbacks | External callers or server backend posting directly to the port without runtime/state validation | Keep port internal to active turn; expose approval/results through runtime inbox APIs only. |
| `AgentInputPipeline` | Input processors and LLM user-message construction | `AgentTurnRunner`, bootstrap/lifecycle tests where relevant | Duplicating input-processor application in the runner or skipping it for SenderType.TOOL | Extract pipeline contract and require runner use for every LLM leg. |
| `AgentTurn.executionScope` | AbortController/signal, abort listeners, operation metadata, late-result fencing | `AgentRuntime`, `AgentTurnRunner`, `LlmPhase`, `ToolPhase` | Phase services creating unrelated AbortControllers or ad-hoc race policy for the same turn | Extend TurnExecutionScope/AgentTurn methods. |
| `BaseLLM.streamMessages(..., options)` | Provider signal mapping | `LlmPhase` | Phase service inspecting provider class to inject signal | Extend BaseLLM/provider contract. |
| `BaseTool.execute(..., options)` | Tool signal mapping | `ToolPhase` | Phase service checking terminal/MCP tool classes | Extend BaseTool/concrete tool contract. |
| `AgentOutbox` | Notifier/event-stream payload publication | Runner, phase services, lifecycle pipeline, processor pipelines | Direct notifier scattering from turn-control code or outbox used to advance loop | Add typed outbox messages. |
| `AgentTeamRuntime.interrupt()` | Member propagation and team status | `AgentTeam`, server team backend | Team backend calling `team.stop()` | Add team interrupt API/result. |
| Stream event pipeline | Event type conversion and WebSocket mapping | AgentOutbox/notifiers, server stream command models, frontend | UI polling runtime internals for interrupted state | Add stream events/status payload. |

## Dependency Rules

Allowed:

- `Agent` may call `AgentRuntime.interrupt()`.
- `AgentRuntime` may call `AgentRuntimeState.requestActiveTurnInterrupt(...)` and apply interruption status events.
- `AgentRuntime` may submit typed inbound messages to `AgentMessageInbox`; it must not push directly into low-level queue storage.
- `AgentRuntime` may accept tool approval/denial commands through `postToolApproval(...)` by posting an awaitable `ToolApprovalInboxMessage` to `AgentMessageInbox`.
- `AgentWorker` may run the inbox loop and call `AgentMessageScheduler.nextDispatchable(...)` / `dispatch(...)`; it must not own routing branches itself.
- `AgentMessageScheduler` may select dispatchable inbox messages and typed `AgentMessageHandler`s by message kind and runtime/turn state.
- `ToolApprovalMessageHandler` may validate with `AgentRuntimeState` and post valid messages to `TurnToolInputPort`.
- `ToolResultMessageHandler` may validate external/async tool results with `AgentRuntimeState` and post valid results to `TurnToolInputPort`; in-process tool results may remain direct inside `ToolPhase`.
- `AgentMessageInbox` may use `InboxQueueStore` as generic storage, but owns semantic lanes, parking, availability, claim, and awaitable-reply APIs; scheduler owns dispatchability policy.
- `AgentTurnRunner` directly calls `LlmPhase`, `ToolPhase`, and typed pipeline services, and owns turn-local continuation control flow.
- `AgentTurnRunner` must use `AgentInputPipeline` for initial input and tool-continuation input before every LLM phase.
- `AgentTurnRunner` / `ToolPhase` may use `ToolResultContinuationBuilder` to preserve one tool-result message shape.
- Runner phases and pipelines should publish outbound facts through `AgentOutbox` rather than scattered direct notifier calls.
- `AgentTurnRunner`, `LlmPhase`, and `ToolPhase` may use `AgentTurn.executionScope` / interruption helpers and call state settlement helpers.
- `LlmPhase` may depend on the `BaseLLM` cancellation-aware API, not provider adapters.
- `ToolPhase` may depend on the `BaseTool` cancellation-aware API, not concrete tools.
- Provider adapters may depend on provider SDK-specific request options.
- Concrete tools may depend on process/MCP transport-specific cancellation.
- Server Autobyteus backends may depend on public `Agent`/`AgentTeam` interrupt APIs.

Forbidden:

- `interrupt()` must not call `stop()` for native Autobyteus runtime or team runtime.
- Worker loop must not run multiple active turns concurrently to solve interruption; it may keep processing inbox messages while one active turn task is running.
- `AgentWorker` must not remain the semantic owner of the finite LLM/tool reasoning loop once the runner boundary is introduced.
- `WorkerEventDispatcher` must not dispatch the normal LLM/tool/continuation loop in the final implementation.
- Old queued phase handlers must not remain as alternate owners for normal LLM/tool/request/result flow.
- `AgentTurnRunner` must not feed raw tool results directly to the LLM or bypass `context.config.inputProcessors` for SenderType.TOOL continuations.
- Outbox messages must not be used as the mechanism that advances the internal agent loop.
- `InboxQueueStore` must not hard-code domain-specific event classes; `AgentMessageInbox` provides typed lane metadata and `AgentMessageScheduler` provides predicates/dispatchability rules.
- External callers must not bypass `AgentMessageInbox` by writing directly to `InboxQueueStore`.
- Active-turn messages inside `AgentMessageInbox` must never be classified as turn-starting messages.
- Server/native/team callers must not post approval directly into `TurnToolInputPort`; they must use `Agent.postToolExecutionApproval(...)` / `AgentRuntime.postToolApproval(...)`.
- External tool result callbacks must not post directly into `TurnToolInputPort`; they must enter as typed `ToolResultInboxMessage`s through `AgentMessageInbox` and scheduler/handler validation.
- Valid approval messages must not bypass `AgentRuntimeState` active-turn and pending-invocation validation.
- LLM/tool abort must not be reported as normal provider/tool error.
- Interrupted tool result must not enqueue a tool-continuation user message.
- Provider-specific abort logic must not leak into runner or phase services.

## Implementation-Ready Component Contracts

This section narrows the second-stage target architecture into implementation contracts. Method names are proposed shapes; exact names may vary if responsibilities remain unchanged.

### `AgentRuntime` Contract

Purpose: public runtime control plane.

Owns: `start`, terminal `stop`, side-band `interrupt`, runtime-owned inbox/scheduler/worker/outbox/state lifecycle, status access, and public submission APIs.

Does not own: LLM/tool phase control flow, processor pipeline execution, provider/tool cancellation mechanics, or message-handler internals.

```ts
class AgentRuntime {
  start(): void;
  stop(timeoutSeconds?: number): Promise<void>;
  interrupt(options?: AgentInterruptOptions): Promise<AgentInterruptResult>;
  submitMessage(message: AgentInboxMessage): Promise<void>;
  postToolApproval(input: ToolApprovalInputMessage): Promise<PostToolApprovalResult>;
}
```

Rules:

- `interrupt()` bypasses inbox scheduling and targets only the active `AgentTurn` / `TurnExecutionScope` if present.
- `postToolApproval()` is not a new-turn submission; it creates an awaitable active-turn message and returns the handler result.
- `stop()` remains terminal and may cancel active work only as part of shutdown.

### `AgentMessageInbox` Contract

Purpose: one semantic runtime inbound boundary for all inbound agent messages.

Accepts typed lanes: turn-starting user/inter-agent messages, active-turn tool approval/result messages, runtime lifecycle messages, and future parked work.

Does not own: routing policy, runner execution, phase execution, or status derivation.

```ts
type AgentInboxMessage =
  | UserInboxMessage
  | InterAgentInboxMessage
  | ToolApprovalInboxMessage
  | ToolResultInboxMessage
  | RuntimeLifecycleInboxMessage;

class AgentMessageInbox {
  post(message: AgentInboxMessage): Promise<void>;
  postAwaitable<T extends AgentInboxMessage>(message: T): Promise<MessageHandlerResult<T>>;
  waitForAvailability(options?: { signal?: AbortSignal }): Promise<void>;
  peekCandidates(): AgentInboxCandidateSnapshot;
  claim(messageId: string): AgentInboxMessage | null;
  park(messageId: string, reason: InboxParkReason): void;
  resolveAwaitable(messageId: string, result: MessageHandlerResult): void;
  drainForShutdown(): AgentInboxMessage[];
}
```

Rules:

- One inbox does not mean one FIFO. The scheduler uses inbox lane APIs to choose the next dispatchable message by active turn/lifecycle state.
- External user/inter-agent messages remain parked while a turn is active.
- Active-turn messages may be dispatchable while a turn is active but can never start a turn.
- Low-level storage lives behind this boundary as `InboxQueueStore` or equivalent.

### `AgentMessageScheduler` Contract

Purpose: explicit message-routing policy.

```ts
class AgentMessageScheduler {
  nextDispatchable(input: {
    inbox: AgentMessageInbox;
    runtimeState: AgentRuntimeState;
    signal?: AbortSignal;
  }): Promise<AgentInboxMessage>;
  dispatch(message: AgentInboxMessage): Promise<MessageHandlerResult>;
  wakeDispatchabilityChanged(): void;
}
```

Rules:

- Select the next dispatchable message by message kind, lane, runtime state, and turn state; then select handlers by message kind.
- Enforce one-active-turn for turn-starting messages.
- Route active-turn messages only to active-turn handlers and return explicit stale/no-active/no-pending/interrupted outcomes.
- Do not call LLM/tool phases directly from scheduler; handlers/runners own those transitions.
- Wait on both inbox availability and runtime-state dispatchability changes so parked turn-starting messages are claimed after active-turn settlement without requiring a new external inbox post.
- Resolve `postAwaitable(...)` replies only after the selected handler returns a classified result; do not let callers observe low-level queue completion as command completion.

### Typed `AgentMessageHandler` Contracts

Purpose: entry handling for one inbound message family.

```ts
interface AgentMessageHandler<T extends AgentInboxMessage> {
  readonly kind: T['kind'];
  handle(message: T, context: AgentContext): Promise<MessageHandlerResult>;
}
```

Required handlers:

| Handler | Owns | Calls | Must Not Own |
| --- | --- | --- | --- |
| `TurnStartMessageHandler` | Validate idle state, create active `AgentTurn`, start runner task, register settlement callback. | `AgentRuntimeState`, `AgentTurnRunner`. | LLM/tool phases or processor internals. |
| `ToolApprovalMessageHandler` | Validate active turn/pending invocation and post approval decision. | `AgentRuntimeState`, `TurnToolInputPort`. | Tool execution. |
| `ToolResultMessageHandler` | Validate externally delivered/async tool results and route to active turn when such results exist. | `AgentRuntimeState`, `TurnToolInputPort`. | Synchronous in-process `ToolPhase` result handling unless tool execution is externalized. |
| `RuntimeLifecycleMessageHandler` | Apply lifecycle/status messages and terminal shutdown coordination. | status/lifecycle owners, shutdown orchestrator. | Agent turn reasoning loop. |

### `TurnToolInputPort` Contract

Purpose: internal turn-scoped tool input primitive used by `ToolPhase` and tool-specific active-turn message handlers.

```ts
type TurnToolInputMessage = ToolApprovalInputMessage | ToolResultInputMessage | ToolPhaseWakeupMessage;

class TurnToolInputPort {
  postApproval(message: ToolApprovalInputMessage): PostTurnMessageResult;
  waitForApproval(invocationId: string, options: { signal: AbortSignal }): Promise<ToolApprovalInputMessage>;
  postToolResult?(message: ToolResultInputMessage): PostTurnMessageResult;
  waitForToolResults?(expectedInvocationIds: string[], options: { signal: AbortSignal }): Promise<ToolExecutionResult[]>;
  close(reason: 'completed' | 'interrupted' | 'failed' | 'stopped'): void;
}
```

Rules:

- Every message must match active `turnId` and expected invocation identity.
- External callers never touch this port directly; they use runtime/facade APIs that become inbox messages and scheduler/handler dispatch.
- Clearing/closing this port on interrupt must not delete unrelated parked `AgentMessageInbox` messages.
- This port is tool-specific. Do not route user messages, inter-agent messages, lifecycle messages, or non-tool phase wakeups through it.

### `AgentRuntimeState` Active-Turn Routing Contract

Purpose: own active turn state and stale/identity classification.

```ts
class AgentRuntimeState {
  validateToolApproval(input: ToolApprovalInputMessage): ToolApprovalValidationResult;
  validateToolResult(input: ToolResultInputMessage): ToolResultValidationResult;
  postToolApprovalToActiveTurn(input: ToolApprovalInputMessage): PostToolApprovalResult;
  postToolResultToActiveTurn(input: ToolResultInputMessage): PostToolResultResult;
  registerActiveTurnTask(turnId: string, task: Promise<TurnOutcome>): void;
  completeActiveTurn(turnId: string): string | null;
}
```

Rules:

- State compares supplied turn ID, active turn ID, pending approval indexes, interrupted/settled state, and fenced invocation IDs.
- On interrupt, state clears/fences pending approvals so later approvals return explicit stale/interrupted/no-pending outcomes.

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

Owns turn-local sequence: input pipeline -> LLM phase -> tool phase -> tool-result continuation -> next LLM phase, plus interruption catch/settlement and outbox publication.

```ts
class AgentTurnRunner {
  run(trigger: UserInboxMessage | InterAgentInboxMessage): Promise<TurnOutcome>;
}
```

Rule: runner may call `AgentInputPipeline`, `LlmPhase`, `ToolPhase`, `ToolResultPipeline`, `ToolResultContinuationBuilder`, `LLMResponsePipeline`, and `AgentOutbox`; it must not read parked inbox messages or own runtime lifecycle.

### `TurnExecutionScope` Contract

Purpose: mechanical cancellation and late-result fencing for one turn.

Owns signal, active operation metadata, abort callbacks, abortable promise/iterator helpers, interruption normalization, and late-result logging/fencing. It does not own business decisions or runtime lifecycle.

### `AgentOutbox` Contract

Purpose: outbound publication boundary above notifier/event-stream implementations. Outbox messages publish facts/results and never advance the internal loop.

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
| `BOOTSTRAPPING` | Runtime lifecycle setup is running. | Do not dispatch turn-starting messages; lifecycle stop may be handled. |
| `IDLE_READY` | Runtime ready and no active turn. | Dispatch next turn-starting user/inter-agent message or lifecycle message. |
| `TURN_ACTIVE` | One `AgentTurnRunner` task is active. | Dispatch active-turn messages and lifecycle messages; park future turn-starting messages. |
| `INTERRUPTING` | Active turn interruption requested. | Continue active-turn fencing/stale classification; do not start a new turn until settlement. |
| `STOPPING` | Terminal stop requested. | Stop accepting new turn starts; cancel active turn as shutdown if needed; run shutdown once. |
| `STOPPED` | Runtime terminally stopped. | Reject inbound messages with runtime-stopped result. |

### Tool Batch State Machine

| State | Meaning | Transition Rule |
| --- | --- | --- |
| `CREATED` | LLM parsed expected invocations. | all invocation IDs are bound to active turn |
| `PENDING_APPROVAL` | one or more invocations await approval. | approval messages must match invocation/turn and arrive through scheduler/handler/port |
| `EXECUTING` | one or more tools running. | each execution receives `ToolExecutionOptions.signal` |
| `COLLECTING_RESULTS` | tool results settle in `ToolPhase` or arrive as active-turn result messages. | collect only expected IDs |
| `READY_FOR_CONTINUATION` | ordered results complete. | feed `ToolResultPipeline` then continuation builder |
| `INTERRUPTED` | active turn interrupted. | mark expected IDs recently settled/fenced |
| `SETTLED` | continuation processed or turn done. | duplicate/late results ignored |

### Invariants

| ID | Invariant | Enforcement Owner |
| --- | --- | --- |
| INV-001 | At most one active `AgentTurn` per runtime. | `AgentMessageScheduler` + `AgentRuntimeState` |
| INV-002 | `AgentMessageInbox` is the only semantic inbound boundary above queue storage; `AgentMessageScheduler` is the only dispatchability/routing owner above that inbox. | `AgentRuntime` / `AgentMessageInbox` / `AgentMessageScheduler` |
| INV-002A | Active-turn inbox messages may enter `AgentMessageInbox`, but they must never be classified as turn-starting messages. | `AgentMessageInbox` / `AgentMessageScheduler` |
| INV-002B | The worker inbox loop continues to dispatch active-turn/lifecycle messages while one runner task is active. | `AgentWorker` / `AgentMessageScheduler` |
| INV-003 | `TurnToolInputPort` messages must match active `turnId` and expected invocation identity. | `TurnToolInputPort` / `AgentRuntimeState` |
| INV-003A | External approval/denial must reach `TurnToolInputPort` only through `AgentRuntime.postToolApproval -> AgentMessageInbox -> AgentMessageScheduler -> ToolApprovalMessageHandler`. | `AgentRuntime` / `AgentMessageScheduler` / `AgentRuntimeState` |
| INV-003B | External/async tool results must reach `TurnToolInputPort` only through `AgentMessageInbox -> AgentMessageScheduler -> ToolResultMessageHandler`; in-process results may stay inside `ToolPhase`. | `AgentMessageScheduler` / `AgentRuntimeState` / `ToolPhase` |
| INV-004 | `SenderType.TOOL` input never starts a new turn. | `AgentInputPipeline` / `AgentMessageScheduler` |
| INV-005 | Tool results must pass through `ToolResultPipeline` and `AgentInputPipeline` before next LLM. | `AgentTurnRunner` |
| INV-006 | `interrupt()` is side-band and must not be blocked behind inbox work. | `AgentRuntime` |
| INV-007 | Normal interrupt never runs shutdown cleanup. | `AgentRuntime` / lifecycle tests |
| INV-008 | Stop always remains terminal and runs shutdown cleanup exactly once. | `AgentRuntime` / `AgentWorker` |
| INV-009 | Outbox publication is observation/output only, not internal control flow. | `AgentOutbox` / runner |
| INV-010 | Bootstrap must complete before any external trigger starts a turn. | `AgentWorker` lifecycle |
| INV-011 | Turn settlement is idempotent and fences late results. | `AgentTurn` / `TurnExecutionScope` |
| INV-012 | Provider/tool-specific cancellation stays below `BaseLLM` / `BaseTool`. | provider/tool adapters |

## Message Routing Rules

| Incoming Item | Enters | Scheduler / Handler | Can Start Turn? | Required Identity | Invalid/Stale Handling |
| --- | --- | --- | --- | --- | --- |
| External user message | `AgentMessageInbox` turn-starting lane | `TurnStartMessageHandler` when idle | Yes | optional client message ID | park until idle; reject only if runtime stopped |
| Inter-agent message | `AgentMessageInbox` turn-starting lane | `TurnStartMessageHandler` when idle | Yes | sender metadata | park until idle; reject only if runtime stopped |
| Runtime lifecycle message | `AgentMessageInbox` lifecycle lane | `RuntimeLifecycleMessageHandler` | No | runtime ID | obey lifecycle state; terminal stop preempts turn starts |
| Tool approval/denial command | `AgentRuntime.postToolApproval` -> awaitable `AgentMessageInbox` active-turn lane | `ToolApprovalMessageHandler` -> `TurnToolInputPort` | No | required `invocationId`, optional `turnId`, `approved`, optional `reason` | return no-active/stale-turn/no-pending/interrupted/runtime-stopped |
| External/async tool result message | `AgentMessageInbox` active-turn lane | `ToolResultMessageHandler` -> `TurnToolInputPort` | No | `turnId`, `invocationId` | drop/fence if unknown, stale, interrupted, or mismatched |
| In-process tool result | `ToolPhase` direct return inside runner | `ToolResultPipeline` in runner | No | active batch invocation IDs | fenced by scope/recent-settled IDs |
| TOOL continuation message | runner-local continuation builder | `AgentInputPipeline(SenderType.TOOL)` | No | active `turnId` | reject/fence if no active turn |
| Shutdown request / stop | runtime control/lifecycle lane | lifecycle handler / runtime stop | No | runtime ID | terminal; blocks new turn starts |
| Interrupt request | side-band `AgentRuntime.interrupt()` | active turn scope | No | optional `turnId` | no-active/stale-turn result if applicable |
| Low-level queued storage entry | private `InboxQueueStore` | none by itself | No | storage metadata | storage does not decide routing |
| Assistant/segment/tool lifecycle output | `AgentOutbox` | outbox sinks | No | `turnId`/invocation if applicable | publish only; never enqueue as turn input |

## Event Handler / Listener Final-State Model

The final design does **not** use an intermediate handler chain. Existing event-handler logic is moved into final domain services, and old handlers that only existed to advance the turn loop are removed from the normal runtime path.

Final rule:

```text
AgentTurnRunner and explicit phase/pipeline services own turn-local control flow.
Event/listener code may remain only for external input boundaries, lifecycle observation, or outbox delivery.
No event-handler chain may remain as the hidden agent loop.
No intermediate turn-control state is part of the design.
```

### Final Handler Classification

| Current Handler / Listener Area | Current Role | Final State | Required Final Action |
| --- | --- | --- | --- |
| `BootstrapEventHandler` | Drives bootstrap through queued step events. | Removed from bootstrap control flow. | `AgentBootstrapper.run(context)` owns bootstrap; bootstrap facts publish through lifecycle/outbox/status. |
| `UserInputMessageEventHandler` | Applies input processors, starts/reuses turn, enqueues LLM-ready event. | Removed from normal turn flow. | `AgentInputPipeline` owns transformation; `AgentWorker`/`AgentTurnRunner` call it directly. |
| `InterAgentMessageEventHandler` | Handles inter-agent input. | Removed from turn flow; replaced by `AgentMessageInbox` external trigger routing. | Inter-agent messages enter `AgentMessageInbox` and are processed by the same scheduler/runner path as user triggers. |
| `LLMUserMessageReadyEventHandler` | Owns request assembly, streaming, parsing, tool-intent enqueue. | Removed from normal turn flow. | `LlmPhase` called by `AgentTurnRunner` owns LLM phase; no queued `LLMUserMessageReadyEvent` is needed for normal runner flow. |
| `LLMCompleteResponseReceivedEventHandler` | Applies response processors and emits final assistant response. | Removed from normal turn flow. | `LLMResponsePipeline` / output pipeline called by runner owns response processing. |
| `ToolInvocationRequestEventHandler` | Handles pending tool invocation/approval flow. | Removed from normal turn flow. | Runner tool phase owns approval request and awaits `TurnToolInputPort` approval messages. |
| `ToolExecutionApprovalEventHandler` | Handles approval/denial events in the old event model. | Removed from normal turn flow. | External approval/denial follows `AgentRunBackend.approveToolInvocation -> Agent.postToolExecutionApproval -> AgentRuntime.postToolApproval -> AgentMessageInbox -> AgentMessageScheduler -> ToolApprovalMessageHandler -> AgentRuntimeState validation -> TurnToolInputPort`; the new typed handler is an entry handler, not a tool phase owner. |
| `ToolInvocationExecutionEventHandler` | Applies preprocessors, executes tool, enqueues tool result. | Removed from normal turn flow. | `ToolInvocationPipeline` + tool execution phase called by runner owns execution. |
| `ToolResultEventHandler` | Applies result processors, emits lifecycle, aggregates continuation, enqueues TOOL input. | Removed from normal turn flow. | `ToolResultPipeline` + `ToolResultContinuationBuilder` + `AgentInputPipeline` called by runner own continuation. |
| `LifecycleEventLogger` / generic lifecycle listeners | Logs/projects lifecycle facts. | May remain as observers. | Observation only; no turn advancement. |
| `WorkerEventDispatcher` | Dispatches every event and indirectly advances the loop. | Removed from normal turn flow; may remain only for non-turn lifecycle observation if still useful. | Must not dispatch normal LLM/tool/continuation loop. |
| `AgentExternalEventNotifier` listeners / EventEmitter | Low-level outbound delivery. | Remain low-level sinks behind `AgentOutbox`. | Runner/pipelines publish through `AgentOutbox`; low-level listeners only deliver outbound facts. |

### Clean-Cut Target Flow

Final target:

```text
AgentMessageInbox trigger
  -> AgentWorker inbox loop
  -> AgentMessageScheduler
  -> TurnStartMessageHandler starts AgentTurnRunner task
  -> AgentTurnRunner calls AgentInputPipeline
  -> AgentTurnRunner calls LlmPhase
  -> AgentTurnRunner calls ToolPhase if needed
  -> ToolPhase uses TurnToolInputPort for approvals and future async result delivery
  -> AgentTurnRunner calls ToolResultPipeline + ToolResultContinuationBuilder
  -> AgentTurnRunner calls AgentInputPipeline(SenderType.TOOL)
  -> AgentTurnRunner loops or completes
  -> AgentOutbox publishes facts/results
```

Tool approval target:

```text
ToolApprovalInboxMessage
  -> AgentMessageScheduler
  -> ToolApprovalMessageHandler
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
Outbox notifications/server/UI streams: yes.
Turn-local control-flow engine: no.
```

### Final Handler Safety Gates

The final implementation must pass review/test checks that:

- extracted pipelines preserve current handler processor ordering and error behavior;
- `AgentTurnRunner` directly calls phase/pipeline services for normal turn execution;
- no duplicate LLM/tool continuation path exists;
- event/listener code cannot process stale active-turn messages after interruption;
- new interruption events are published through `AgentOutbox`, not scattered new notifier calls;
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

### Work Package 2 — AgentMessageInbox / Scheduler / Handlers / TurnToolInputPort / AgentOutbox

Goal: establish explicit inbound/outbound boundaries and dispatch ownership.

Required final components:

- `AgentMessageInbox` for all typed inbound agent messages and parked work;
- `InboxQueueStore` as private low-level storage behind the inbox;
- `AgentMessageScheduler` for dispatchability and handler selection;
- typed `AgentMessageHandler`s for turn-start, tool approval, tool result, and lifecycle entry handling;
- `TurnToolInputPort` as the internal turn-scoped tool wait/post primitive;
- `AgentOutbox` for assistant output, streaming segments, tool lifecycle, errors, lifecycle facts, artifacts/state updates.

Safety gate:

- active-turn messages can enter the inbox but cannot start turns;
- stale/no-active/no-pending/interrupted outcomes are explicit;
- tool approvals and external/async tool results reach `TurnToolInputPort` only after scheduler/handler/runtime-state validation;
- the worker loop stays alive for active-turn/lifecycle dispatch while a runner task is active;
- outbox is publication-only and does not advance the loop.

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
AgentMessageInbox -> AgentMessageScheduler -> TurnStartMessageHandler -> starts AgentTurnRunner task
AgentTurnRunner -> AgentInputPipeline
AgentTurnRunner -> LlmPhase
AgentTurnRunner -> ToolPhase
AgentTurnRunner -> ToolResultPipeline + ToolResultContinuationBuilder
AgentTurnRunner -> AgentInputPipeline(SenderType.TOOL)
AgentTurnRunner -> LLMResponsePipeline / completion
```

Safety gate:

- normal LLM/tool/continuation flow does not depend on `WorkerEventDispatcher` dispatching old handlers;
- only one active turn can run, even though the worker loop keeps dispatching active-turn/lifecycle messages;
- tool continuation still reuses the same turn and still applies input processors.

### Work Package 6 — Native Interrupt Semantics

Goal: implement requested interrupt behavior through the final architecture.

Required final behavior:

- `AgentRuntime.interrupt()` is side-band and targets active turn runner/scope;
- LLM stream interruption aborts or abandons provider stream and suppresses assistant ingestion;
- tool execution interruption aborts or abandons tool execution and suppresses continuation;
- pending approval interruption clears/fences active approval state;
- server/native approval commands route through `Agent.postToolExecutionApproval` / `AgentRuntime.postToolApproval` into `AgentMessageInbox`, then through `AgentMessageScheduler` and `ToolApprovalMessageHandler` into the active `TurnToolInputPort`;
- external/async tool result messages route through `AgentMessageInbox`, then through `AgentMessageScheduler` and `ToolResultMessageHandler` into `TurnToolInputPort`, then rejoin the normal tool-result continuation pipeline;
- server native backend maps interrupt to native `agent.interrupt`, not stop;
- team interrupt propagates member interrupts, not team stop.

Safety gate: acceptance tests AC-001 through AC-014 pass.

### Work Package 7 — Remove Old Turn-Control Choreography

Goal: clean-cut decommission of old control-flow owners.

Required final cleanup:

- remove native interrupt-to-stop fallback;
- remove app-owned `STOP_GENERATION` naming where in scope;
- remove old internal queue events/handlers that only advanced the normal LLM/tool/continuation loop;
- keep only external input boundaries, lifecycle observations, and outbox delivery listeners;
- remove duplicate paths where both runner and handler chain can advance the same turn.

Safety gate: source review confirms no final implementation path leaves the old handler chain as the hidden agent loop.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `Agent.interrupt(options?: AgentInterruptOptions): Promise<AgentInterruptResult>` | Native agent runtime | Public cancel-current-turn command. | Optional `turnId` for active turn validation. | Thin facade. |
| `AgentRuntime.interrupt(options?: AgentInterruptOptions): Promise<AgentInterruptResult>` | Agent runtime control | Signal active turn and wait for settlement. | `turnId?`, reason/requestedBy/timeout. | Authoritative native boundary. |
| `Agent.postToolExecutionApproval(invocationId, approved, reason?, options?)` | Native agent active-turn input | Public approval/denial command for a pending tool invocation. | Required invocation ID, approved/denied boolean, optional reason, optional turnId/requestedBy. | Thin facade to runtime; keeps existing public/server surface. |
| `AgentRuntime.postToolApproval(input): Promise<PostToolApprovalResult>` | Runtime active-turn input | Submit an awaitable `ToolApprovalInboxMessage`; scheduler/handler validates and posts to `TurnToolInputPort`. | `ToolApprovalInputMessage`. | Authoritative native approval boundary. |
| `AgentMessageInbox.post(...)` / `postAwaitable(...)` / lane/claim APIs | Runtime inbound messages | Store typed inbound messages, preserve parked work, and expose candidates/claims to the scheduler without exposing queue storage. | Message kind plus identity/reply metadata as needed. | Semantic inbox boundary above queue storage; scheduler owns dispatchability. |
| `AgentTurn.interrupt(reason)` | Active turn | Idempotently abort signal and record metadata. | Current turn ID only. | Internal to runtime/state/runner. |
| `BaseLLM.streamMessages(messages, renderedPayload, kwargs, options?)` | LLM invocation | Stream with optional cancellation. | `LLMInvocationOptions.signal`, `turnId`. | `kwargs` remains provider params. |
| `BaseTool.execute(context, args, options?)` | Tool execution | Execute with optional cancellation. | `ToolExecutionOptions.signal`, `turnId`, `invocationId`. | Existing tools may ignore signal; `ToolPhase` still runs through `TurnExecutionScope` late-result fencing. |
| `AgentTeam.interrupt(options?)` | Native team runtime | Public team cancel-current-work command. | Reason/timeout; no member selector for this requirement. | Interrupts all running cached nodes. |
| `AgentTeamRuntime.interrupt(options?)` | Team runtime control | Propagate to member nodes and update team status. | Reason/timeout. | Does not shutdown. |
| `AgentRunBackend.approveToolInvocation(invocationId, approved, reason?)` | Cross-runtime server run | Runtime-kind tool approval/denial command. | Required invocation ID, approved boolean, optional reason; future turn ID should be explicit if protocol adds it. | Existing interface retained and mapped to native approval API. |
| `AgentRunBackend.interrupt(turnId?)` | Cross-runtime server run | Runtime-kind interrupt command. | Optional platform turn ID. | Existing interface retained. |
| WebSocket `INTERRUPT_GENERATION` | Client command | Interrupt active generation for run/team. | Optional `turn_id` payload if available. | Replaces app-owned `STOP_GENERATION` name. |

Rule: do not overload `stop(timeout?)` with interrupt options. Stop remains terminal and takes only shutdown timeout.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentRuntime.interrupt` | Yes | Yes | Low | Optional turnId must match active turn or return stale/no-active result. |
| `AgentMessageInbox` | Yes | Yes | Low | Message kind/lane must distinguish turn-starting, active-turn, and lifecycle messages without owning scheduler policy or exposing queue storage. |
| `AgentMessageScheduler` | Yes | Yes | Low | Scheduler owns dispatchability and handler routing; typed handlers own handling. |
| `AgentRuntime.postToolApproval` | Yes | Yes | Low | Invocation ID is required; optional turn ID must match active turn; stale/no-active/no-pending outcomes are explicit. |
| `BaseLLM.streamMessages` | Yes | Yes | Low | Keep provider kwargs separate from invocation options. |
| `BaseTool.execute` | Yes | Yes | Low | Options are execution metadata, not tool arguments. |
| WebSocket interrupt command | Yes | Yes | Low | Payload uses `turn_id`, not generic ID. |
| Team interrupt | Yes | Mostly | Medium | Initial scope interrupts all running cached nodes; future per-member interrupt should add explicit member identity, not overload this method. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Runtime cancellation command | `interrupt` | Yes | Low | Use consistently in native/server code. |
| Runtime inbox | `AgentMessageInbox` | Yes | Low | Use this name for all typed inbound agent messages; do not call the low-level queue store the inbox owner. |
| Runtime scheduler | `AgentMessageScheduler` | Yes | Low | Use this name for dispatch policy; do not hide routing in the worker loop. |
| Message handlers | `*MessageHandler` | Yes | Medium | Keep handlers as entry handlers only, not phase-chain owners. |
| Terminal runtime shutdown | `stop` | Yes | Low | Keep only for terminal shutdown. |
| Client command | `INTERRUPT_GENERATION` | Yes | Low | Replace `STOP_GENERATION` in app-owned protocol. |
| Active cancellation object | `AgentTurn` signal/interruption | Yes | Low | Avoid separate generic cancellation manager unless needed. |
| Status | `interrupting` | Yes | Low | No terminal `interrupted` agent status; final status is idle with turn interrupted event. |

## Applied Patterns (If Any)

- State machine inside `AgentTurn`: active, interrupting, interrupted/settled. This is bounded inside the turn owner.
- Adapter pattern at LLM providers and tools: BaseLLM/BaseTool accept generic signal options; providers/tools translate to SDK/process/MCP mechanisms.
- Event loop pattern remains inside `AgentWorker`; it may keep dispatching eligible inbox messages while one runner task is active, but `AgentMessageScheduler` still enforces one active turn.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/message-inbox/` | Folder | Agent message inbox | Unified inbound message boundary, scheduler, handlers, and private queue storage. | Names the agent inbox separately from event storage and turn loop execution. | LLM/tool phase execution or provider/tool cancellation. |
| `autobyteus-ts/src/agent/message-inbox/agent-message-inbox.ts` | File | AgentMessageInbox | `post`, `postAwaitable`, lane availability, candidate peek, claim, parking, and awaitable reply APIs over private queue storage. | Single semantic inbound boundary with typed lanes. | Handler dispatch policy or phase control flow. |
| `autobyteus-ts/src/agent/message-inbox/inbox-queue-store.ts` | File | InboxQueueStore | Low-level async queue/availability storage for inbox lanes. | Private storage mechanics with no domain routing. | Message eligibility or handler dispatch. |
| `autobyteus-ts/src/agent/message-inbox/agent-message-scheduler.ts` | File | AgentMessageScheduler | Select dispatchable messages and handlers by message kind and runtime/turn state. | Explicit owner for scheduling policy. | LLM/tool phase execution. |
| `autobyteus-ts/src/agent/message-inbox/handlers/` | Folder | Typed AgentMessageHandlers | Turn-start, tool-approval, tool-result, and lifecycle entry handlers. | Keeps message handling explicit without old phase choreography. | LLM/tool phase execution chain. |
| `autobyteus-ts/src/agent/loop/` | Folder | Agent turn loop execution | Finite per-turn runner, direct phase services, turn tool input port, and continuation builders. | Makes the agent loop start/end boundary explicit. | Long-lived worker stop/shutdown policy or provider-specific cancellation. |
| `autobyteus-ts/src/agent/loop/agent-turn-runner.ts` | File | AgentTurnRunner | Runs one agent turn loop to final/interrupted settlement. | One concrete runner owner for finite loop semantics. | Transport protocol or terminal shutdown code. |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | File | LlmPhase | Runs the LLM phase under `TurnExecutionScope`. | Direct phase owner replaces queued LLM-ready handler control flow. | Tool execution, worker scheduling, provider-specific SDK branching. |
| `autobyteus-ts/src/agent/loop/tool-phase.ts` | File | ToolPhase | Runs approval/execution/result collection under `TurnExecutionScope`. | Direct phase owner replaces queued tool request/execution/result handler control flow. | Provider/terminal process internals or worker scheduling. |
| `autobyteus-ts/src/agent/loop/turn-tool-input-port.ts` | File | TurnToolInputPort | Internal wait/post/fence port for validated tool approvals and future async tool results. | Keeps turn-scoped tool input delivery private to the turn while inbound entry uses AgentMessageInbox. | New-turn scheduling or lifecycle events. |
| `autobyteus-ts/src/agent/loop/tool-result-continuation-builder.ts` | File | ToolResultContinuationBuilder | Builds SenderType.TOOL continuation input from settled tool results. | Preserves current tool-result message shape for direct runner reuse. | Input processor execution or LLM calls. |
| `autobyteus-ts/src/agent/pipelines/` | Folder | Agent processor pipelines | Shared orchestration for input, tool invocation, tool result, LLM response/output, and optional common pipeline runner. | Keeps processor orchestration explicit without moving concrete processors out of their existing folders. | Worker scheduling, turn-loop ownership, or provider execution. |
| `autobyteus-ts/src/agent/pipelines/processor-pipeline-runner.ts` | File | ProcessorPipelineRunner | Common ordered execution helper for typed pipeline services. | Shared mechanics only; domain pipelines own contracts. | Generic untyped processor semantics or turn control flow. |
| `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts` | File | AgentInputPipeline | Applies input processors and builds LLM-ready input for external/tool input. | Single owner of the current input transformation contract. | Tool result aggregation. |
| `autobyteus-ts/src/agent/pipelines/tool-invocation-pipeline.ts` | File | ToolInvocationPipeline | Applies tool invocation preprocessors. | Single owner of invocation pre-execute processing. | Tool execution or approval UI transport. |
| `autobyteus-ts/src/agent/pipelines/tool-result-pipeline.ts` | File | ToolResultPipeline | Applies tool execution result processors. | Single owner of post-tool processing before continuation. | Continuation message formatting. |
| `autobyteus-ts/src/agent/pipelines/llm-response-pipeline.ts` | File | LLMResponsePipeline | Applies LLM response/output processors and final assistant emission policy. | Single owner of response processor orchestration. | LLM streaming/provider code. |
| `autobyteus-ts/src/agent/pipelines/system-prompt-pipeline.ts` | File | SystemPromptPipeline | Applies system prompt processors for bootstrap. | Single owner of system prompt processor orchestration. | Runtime init or turn execution. |
| `autobyteus-ts/src/agent/outbox/` | Folder | Agent outbox | Outbound domain message publication façade and typed payloads if needed. | Complements inbox lanes and reduces direct notifier scattering. | Turn control flow or provider execution. |
| `autobyteus-ts/src/agent/outbox/agent-outbox.ts` | File | AgentOutbox | Publish assistant/tool/segment/lifecycle/error/artifact messages to existing notifier/streams. | Single outbound publication boundary. | Input box scheduling or state mutation. |
| `autobyteus-ts/src/agent/interruption/` | Folder | Agent interruption support | Small concrete support area for interruption types/utilities. | Shared by runtime, turn state, phase services, tests. | Runtime lifecycle ownership or provider-specific cancellation. |
| `autobyteus-ts/src/agent/interruption/agent-interruption.ts` | File | Interruption model | Options/result/error/guards. | One semantic data shape. | Stop/terminate semantics. |
| `autobyteus-ts/src/agent/interruption/abortable-operation.ts` | File | Abortable operation utility | Promise/iterator abort racing and late-result logging. | Reused by `TurnExecutionScope`, `LlmPhase`, and `ToolPhase`. | Provider/tool-specific behavior. |
| `autobyteus-ts/src/agent/agent-turn.ts` | File | AgentTurn | Turn signal, operation, settlement, batch. | Existing active turn owner. | Queue storage or runtime status emission. |
| `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | File | AgentRuntimeState | Active turn state mutation, active-turn validation/stale classification, turn-local work cleanup/fencing, pending approval cleanup, checkpoint restore. | Existing state owner. | Public runtime command API. |
| `autobyteus-ts/src/agent/runtime/agent-runtime.ts` | File | AgentRuntime | `interrupt()` authoritative command, `postToolApproval()` awaitable inbox submission command, and status projection. | Existing lifecycle/command owner. | Provider/tool-specific abort or direct TurnToolInputPort bypass without scheduler/state validation. |
| `autobyteus-ts/src/agent/agent.ts` | File | Agent facade | Public native methods including `interrupt()` and `postToolExecutionApproval(...)`, delegating to runtime. | Existing facade owner. | Active-turn validation or inbox mutation. |
| `autobyteus-ts/src/agent/events/` | Folder | Event model | Observable lifecycle/status event definitions and event-store projections. | Events remain for lifecycle/observation; inbox storage moves under `agent/message-inbox`. | Normal LLM/tool/continuation turn control or inbox storage. |
| `autobyteus-ts/src/agent/streaming/` | Folder | Streaming/event publication | Segment and stream payload handling behind `AgentOutbox`. | Streaming is an outbox sink/segment concern. | Turn-loop advancement. |
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
| `agent/message-inbox` | Main-Line Domain-Control | Yes | Medium | Unified inbound boundary plus scheduler/handlers; keep storage private and keep LLM/tool phase work in `agent/loop`. |
| `agent/loop` | Main-Line Domain-Control | Yes | Medium | New runner boundary must contain only finite per-turn control flow and turn-local continuation construction, not long-lived worker lifecycle. |
| `agent/pipelines` | Off-Spine Concern | Yes | Medium | Shared processor pipeline orchestrators used by the turn runner and final phase services; must not become the agent loop itself. |
| `agent/outbox` | Off-Spine Concern | Yes | Low | Outbound domain publication boundary above notifier/streaming. |
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
| Support both `STOP_GENERATION` and `INTERRUPT_GENERATION` indefinitely | Avoids updating existing app code/tests. | Rejected | Rename app-owned protocol/store code in one change. If external clients exist, document release note rather than dual path. |
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
- Add `turn_id` to turn-local messages so `TurnToolInputPort` fencing can drop stale work without dropping later real user messages.
- Provider adapters should normalize native abort errors into `AgentInterruptionError` or allow the `TurnExecutionScope` / abortable-operation utility to do so; do not emit normal LLM errors for user interrupts.
- Server backend tests should explicitly assert `stop` is not called by `interrupt`.
- Server/native approval tests should assert `AgentRunBackend.approveToolInvocation` calls `agent.postToolExecutionApproval`, which calls `AgentRuntime.postToolApproval`, and valid approvals wake `ToolPhase.waitForApproval` through `TurnToolInputPort`.
- Post-interrupt approval tests should assert stale approvals return explicit stale/interrupted/no-pending results and do not start a new turn.
- Frontend tests should assert the interrupt command is sent and `isSending` clears only on interrupted/idle stream feedback, not optimistically at button click.
