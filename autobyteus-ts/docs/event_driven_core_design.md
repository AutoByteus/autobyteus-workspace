# Autobyteus Event-Driven Core Design

## 1. Scope and Goals

This document describes the event-driven core that powers Autobyteus agents,
agent teams, and workflows. It focuses on how runtimes serialize work through
event inboxes, route events to the active owner, publish streamable status/output,
and shut down cleanly.

The implementation intentionally separates two concerns:

- **Runtime event inboxes** serialize externally submitted work and lifecycle
  control while preserving canonical typed event payloads.
- **Turn owners** (`AgentTurnRunner` plus its phases) own one active agent turn's
  LLM/tool/continuation loop.

That separation is the main guardrail against reintroducing retired dispatcher
or handler control flow.

---

## 2. Core Runtime Layers

Each runtime (`AgentRuntime`, `AgentTeamRuntime`, `WorkflowRuntime`) owns:

- the runtime context and mutable runtime state;
- status derivation/projection;
- an external notifier for streaming and UI updates;
- a worker that runs the serialized loop.

The public runtime API provides startup, input submission, side-band control
where supported, and terminal shutdown. Agent generation interrupt is side-band
control for the active turn and is distinct from `stop()`.

---

## 3. Agent Event Inbox and Scheduler

### 3.1 AgentEventInbox lanes

The single-agent runtime uses `AgentEventInbox` instead of the retired
multi-queue dispatcher or the intermediate message-wrapper inbox. The inbox
stores typed event entries and has three lanes:

| Lane | Accepted events | Purpose |
| --- | --- | --- |
| `runtime_lifecycle` | `LifecycleEvent` values such as ready/shutdown notifications | Runtime bootstrap/shutdown/control work. Operational tool events are rejected here. |
| `active_turn` | awaitable `ToolExecutionApprovalEvent` and `ToolResultEvent` entries | Wakes the already-active turn without starting another turn. |
| `turn_start` | `UserMessageReceivedEvent` and `InterAgentMessageReceivedEvent` | Starts a new outer `AgentTurn` only while the runtime is idle. |

`AgentEventInbox` rejects same-turn TOOL sender continuations and rejects
unsupported operational events as lifecycle or turn-start input. Same-turn
continuations remain inside the turn runner, while public tool approvals/results
enter as canonical active-turn events through `postToolApprovalEvent(...)` and
`postToolResultEvent(...)`.

### 3.2 Dispatchability priorities

`AgentEventScheduler` chooses dispatchable event entries based on runtime
state:

- While a turn is active or settling: `runtime_lifecycle` first, then
  `active_turn`. New `turn_start` messages wait.
- While idle: `runtime_lifecycle`, then `active_turn`, then `turn_start`.

This means terminal lifecycle notifications and active-turn control events can
wake the worker, but queued user/inter-agent triggers do not preempt or overlap
an active turn. On shutdown, queued awaitables are settled with explicit stopped
results.

### 3.3 Scheduler processors

The scheduler dispatches to a small fixed processor set:

- `TurnStartEventProcessor` creates and runs a new `AgentTurn` through
  `AgentTurnRunner`.
- `RuntimeLifecycleEventProcessor` applies runtime lifecycle notifications.
- `ToolApprovalEventProcessor` calls
  `AgentRuntimeState.postToolApprovalEventToActiveTurn(...)` and publishes
  `ToolExecutionApprovalEvent` only after the active turn accepts the decision.
- `ToolResultEventProcessor` calls
  `AgentRuntimeState.postToolResultEventToActiveTurn(...)`.

There is no single-agent `WorkerEventDispatcher`, `EventHandlerRegistry`, or
normal-flow handler chain in the active runtime.

---

## 4. Agent Turn Ownership

`AgentTurnRunner` is the only normal owner of one outer agent turn. It uses:

- `AgentInputPipeline` to convert user/inter-agent turn-start events into the
  LLM-facing input, preserve reference-file metadata, and mark native tool
  continuations as `tool_history_only`.
- `LlmPhase` to assemble memory-backed requests, pass cancellation signals to
  the LLM, stream segments, parse tool calls, terminalize failed/interrupted
  segments, and publish assistant-side effects only after interruption fences.
- `ToolPhase` to prepare, approve, execute, or wait for external results for
  tool invocations under the active `TurnExecutionScope`.
- `TurnToolInputPort` to receive same-turn approvals and external tool results
  for known invocation ids.
- `ToolResultPipeline` and `ToolResultContinuationBuilder` to process accepted
  tool results and build either legacy TOOL-origin continuation input or native
  `ToolContinuationReadyEvent` / `tool_history_only` continuation.
- `LLMResponsePipeline` and `AgentExternalEventNotifier` to publish final
  assistant output and other semantic external-observable events.

Tool approvals and external tool results are therefore active-turn controls, not
new turn triggers.

---

## 5. Team and Workflow Mailboxes

Agent team and workflow runtimes keep simpler serialized queues for their own
coordination. Team code can route a command to a member agent, but member-agent
turn controls must go through the member's public APIs. For example, team tool
approval commands resolve the target member and call
`memberAgent.postToolExecutionApproval(...)`; they do not bypass the member
runtime state or inject tool events directly into a member event inbox.

Team communication events are projected through the team/server stream pipeline.
When inter-agent messages carry structured `reference_files`, the recipient
agent's `AgentInputPipeline` preserves the metadata and adds exactly one
LLM-visible `Reference files:` block.

---

## 6. Streaming and Observability

The event-driven core emits external, streamable events for UIs and monitoring:

- `AgentExternalEventNotifier` is the semantic external-observable boundary for
  agent runtime publication. Runner, phases, and pipelines call its typed
  `notify...` methods directly rather than going through an outbox wrapper.
- The notifier emits status updates, segment events, tool lifecycle/log events,
  inter-agent/system-task data events, and assistant output events.
- `AgentEventStream` maps notifier events into stream records.
- Agent-team stream handlers enrich and project member events, team
  communication messages, and reference-file entries.

Server and web protocol layers use canonical `turn_id` in outbound segment
payloads. Frontend stores/projectors treat interrupted and failed segments as
terminal states.

---

## 7. Interrupt, Stop, and Safety Guarantees

- **One active turn:** `AgentRuntimeState` owns the active turn and rejects
  overlapping turn starts.
- **Side-band interrupt:** `AgentRuntime.interrupt()` aborts the active
  `TurnExecutionScope`, closes `TurnToolInputPort`, restores the working-context
  checkpoint, publishes interrupted terminal state, and leaves the runtime
  reusable.
- **Terminal stop:** `stop()` requests shutdown, settles queued awaitables, and
  prevents queued turn-start messages from running after shutdown begins.
- **Awaited-seam fences:** LLM, tool, input, final-response, and continuation
  seams check accepted interruption before publishing normal side effects.
- **Approval/result authority:** Only pending approvals and active result waiters
  inside the active `TurnToolInputPort` are authoritative. Stale, duplicate,
  wrong-turn, no-waiter, interrupted, and stopped submissions return explicit
  rejection results.
- **No stop fallback:** User generation interrupt never falls back to provider
  `STOP_GENERATION` commands or runtime shutdown cleanup.

---

## 8. Extension Points

- Add turn-start input behavior with an `AgentInputProcessor` or by extending
  `AgentInputPipeline` semantics.
- Add LLM streaming behavior in `LlmPhase`, streaming handlers, parsers, or
  adapters.
- Add tool execution/result behavior in `BaseTool.prepareExecution(...)`,
  `ToolPhase`, `ToolResultPipeline`, or `ToolResultContinuationBuilder`.
- Add stream outputs through `AgentExternalEventNotifier` and the corresponding
  stream mapping layer.
- Add runtime lifecycle behavior through `RuntimeLifecycleEventProcessor` or the
  shutdown/bootstrap orchestrators.

Do not add new normal-flow control by resurrecting retired dispatcher or handler
classes.

---

## 9. Key Files

- Agent runtime wrapper: `src/agent/runtime/agent-runtime.ts`
- Agent worker loop: `src/agent/runtime/agent-worker.ts`
- Agent event inbox: `src/agent/event-inbox/agent-event-inbox.ts`
- Agent event scheduler: `src/agent/event-inbox/agent-event-scheduler.ts`
- Scheduler processors: `src/agent/event-inbox/processors/*`
- Runtime state: `src/agent/context/agent-runtime-state.ts`
- Turn runner: `src/agent/loop/agent-turn-runner.ts`
- LLM phase: `src/agent/loop/llm-phase.ts`
- Tool phase: `src/agent/loop/tool-phase.ts`
- Active-turn tool port: `src/agent/loop/turn-tool-input-port.ts`
- Tool continuation builder: `src/agent/loop/tool-result-continuation-builder.ts`
- Team workers: `src/agent-team/runtime/agent-team-worker.ts`
- Stream multiplexing: `src/agent-team/streaming/agent-event-multiplexer.ts`
