# Autobyteus Event-Driven Core Design

## 1. Scope and Goals

This document describes the **event-driven core** that powers Autobyteus agents, agent teams, and workflows. It focuses on how the system:

- creates per-entity serialized loops (mailboxes),
- routes events through input queues,
- schedules external turn triggers and lifecycle/control events,
- streams events outward for UI/monitoring,
- and shuts down cleanly.

The intent is to provide a clear mental model for extending or debugging the runtime.
For the current single-agent turn loop and interrupt boundary, see
[Agent Runtime Loop and Native Interrupt](agent_runtime_loop_and_interrupt.md).

---

## 2. Core Runtime Layers (Agent, Team, Workflow)

Autobyteus uses a consistent pattern across Agent, AgentTeam, and Workflow runtimes.

### 2.1 Runtime Wrapper

Each runtime (`AgentRuntime`, `AgentTeamRuntime`, `WorkflowRuntime`) owns:

- the **context** (config + state),
- a **status manager**,
- an **external event notifier** (for streaming + UI),
- and a **worker** that runs the event loop.

The runtime provides the public API:

- `start()` to initialize the serialized loop,
- `submit_event()` to enqueue input events,
- `interrupt()` to cancel the active turn while keeping the runtime reusable,
- `stop()` to shut down cleanly.

### 2.2 Serialized Worker Loop (Mailbox)

Each worker (`AgentWorker`, `AgentTeamWorker`, `WorkflowWorker`) owns a **serialized async loop** (mailbox) running on the shared Node.js event loop.

- The mailbox loop provides ordering guarantees without per-agent OS threads.
- `worker_threads` are optional for CPU-bound workloads or hard isolation.
- The worker runs `asyncRun()` for the lifecycle (bootstrap → event loop → shutdown).

### 2.3 Bootstrap, Turns, Interrupt, and Shutdown

Bootstrap steps run **inside the worker loop** after a minimal runtime init
phase creates the event store, status deriver, and input queues.

Agent bootstrap steps include (default order):

1. `WorkspaceContextInitializationStep`
2. `McpServerPrewarmingStep`
3. `SystemPromptProcessingStep` through `SystemPromptPipeline`

A successful bootstrap applies `AgentReadyEvent` (or `WorkflowReadyEvent` /
`AgentTeamReadyEvent`).

For single agents, the worker loop does **not** dispatch the normal
LLM/tool/continuation sequence through legacy handlers. It selects one external
`UserMessageReceivedEvent` or `InterAgentMessageReceivedEvent`, starts an
`AgentTurn`, and delegates that finite turn to `AgentTurnRunner`. The runner
owns the LLM phase, tool phase, result processing, continuation input, final
response, and turn settlement.

`AgentRuntime.interrupt()` is side-band runtime control. It aborts the active
`AgentTurn` through `TurnExecutionScope`, closes the turn input box, clears
pending approvals for that turn, restores the turn-start working-context
checkpoint, and leaves the worker alive for later turns. If no active turn
exists, interrupt returns `no_active_turn` and does not start or stop the
runtime.

Shutdown is orchestrated inside the worker loop (e.g., `AgentShutdownOrchestrator`) after the main loop exits.

---

## 3. Input Event Queues

### 3.1 AgentInputEventQueueManager

The agent runtime has **multiple input queues**, each dedicated to a class of events:

- user messages
- inter-agent messages
- tool approval
- internal system events

This separation allows the runtime to coordinate priorities and preserve order **per queue**.
Tool requests, tool execution, tool results, and same-turn tool continuations are
turn-local state owned by `AgentTurnRunner`, `ToolPhase`,
`ToolResultPipeline`, and `ToolResultContinuationBuilder`.
`AgentTurnInputBox` is approval-only. Tool results are direct `ToolPhase`
returns and are not scheduled as independent normal-flow worker-handler events.

### 3.2 Deterministic Queue Selection

`getNextSchedulerEvent()` in `AgentInputEventQueueManager` uses a **two-phase strategy** to prevent reordering:

1. **Serve buffered items first** (FIFO per queue).
2. If none buffered, wait on all queues with a `Promise.race(...)`-style wait.
   - Completed items are **buffered**, not requeued.
   - Pending tasks are cancelled.
3. Return the highest-priority buffered event.

Priority order is deterministic for scheduler-visible queues (user →
inter-agent → tool approval → internal system). This avoids the previous bug
where ready events were reinserted at the tail and changed order.

### 3.3 Team/Workflow Queue Managers

AgentTeam and Workflow runtimes use simpler queue managers with two queues:

- user message queue
- internal system event queue

Their workers wait on both queues with a `Promise.race(...)`-style wait.

---

## 4. Event Processing Pipeline

### 4.1 Submitting Events (Cross-Loop)

External callers submit events via the runtime (`submit_event`). The runtime:

1. schedules an enqueue on the mailbox loop (e.g., `queueMicrotask` or `setImmediate`),
2. enqueues the event into the correct queue.

This makes the queueing safe across async contexts and ensures all queue ops happen inside the worker loop.

### 4.2 Worker Main Loop (Agent)

The agent worker loop looks like:

1. await `getNextSchedulerEvent()`
2. start `AgentTurnRunner` for a user/inter-agent external turn trigger, or
   apply lifecycle/control status events directly
3. yield to the Node.js event loop so other tasks can run

### 4.3 Turn Runner + Status Management

For single agents, `AgentTurnRunner` owns normal turn control:

- **Status updates** are derived by applying the same event classes
  (`LLMUserMessageReadyEvent`, `PendingToolInvocationEvent`, `ToolResultEvent`,
  `LLMCompleteResponseReceivedEvent`, `AgentTurnInterruptedEvent`, etc.).
- **Processor pipelines** are invoked directly from the runner and phase
  services.
- **Tool continuation** stays inside the active turn rather than re-entering
  the worker as a fresh user event.

If a runner or lifecycle path throws, the runtime applies `AgentErrorEvent` and
notifies the status manager to enter `ERROR`.

### 4.4 Handlers and Team/Workflow Runtimes

Team and workflow runtimes still use their own dispatcher/handler
infrastructure where applicable. The removed single-agent normal-flow handlers
must not be reintroduced as an alternate LLM/tool/continuation path.

---

## 5. Event Streaming and Multiplexing

The event-driven core also emits **external, streamable events** for UIs and monitoring:

- `AgentExternalEventNotifier` emits `AGENT_STATUS_UPDATED` for status changes and output data events.
- `AgentEventStream` subscribes to the notifier and converts events to stream records.
- `AgentEventBridge` forwards an agent’s stream into a workflow notifier.
- `AgentEventMultiplexer` manages multiple bridges so a workflow can aggregate events from its agents and sub-workflows.

This decouples internal control flow (queues) from external observability (streams).

---

## 6. Lifecycle Sequences (Agent)

### 6.1 Startup

1. `AgentRuntime.start()` → worker loop initialized.
2. Loop initializes → runtime init creates input queues.
3. Bootstrap begins through `AgentBootstrapper.run(context)`.
4. `SystemPromptPipeline` processes the system prompt.
5. Bootstrap finishes → `AgentReadyEvent` status projection updates to IDLE.

### 6.2 Event Handling (Typical)

1. External `UserMessageReceivedEvent` is submitted.
2. Event hits `user_message_input_queue`.
3. Worker starts an `AgentTurn` and delegates to `AgentTurnRunner`.
4. `AgentInputPipeline` creates the `LLMUserMessage`; `LlmTurnPhase` calls the LLM.
5. Tool invocations run through `ToolPhase`; approvals are posted into the active `AgentTurnInputBox`.
6. `ToolResultPipeline`, `ToolResultContinuationBuilder`, and follow-up LLM legs remain in the same turn.
7. `LLMCompleteResponseReceivedEvent` / `AgentTurnInterruptedEvent` settle the turn, then the worker returns the agent to IDLE when appropriate.

### 6.3 Interrupt

1. `AgentRuntime.interrupt()` checks the current active turn.
2. If one exists, `AgentRuntimeState.interruptActiveTurn(...)` aborts the active
   `TurnExecutionScope`, clears pending approvals, and closes the turn input
   box.
3. `AgentTurnRunner` catches the interruption, restores the working-context
   checkpoint, publishes `TURN_INTERRUPTED`, and settles the turn as
   interrupted.
4. The worker remains alive; a later message starts a new turn.

### 6.4 Shutdown

1. `AgentRuntime.stop()` triggers status update to SHUTTING_DOWN.
2. Worker stop signal set; `AgentStoppedEvent` enqueued.
3. Worker exits loop and runs shutdown orchestrator.
4. Runtime completes final status update.

---

## 7. Concurrency and Safety Guarantees

- **Isolation:** Each agent/team/workflow runs in its own serialized mailbox loop.
- **Safe submission:** All input queue ops happen via the mailbox loop (e.g., `queueMicrotask` / `setImmediate`).
- **Ordering:** Each queue preserves FIFO; inter-queue ordering is deterministic via priority.
- **Backpressure:** Queue managers can enforce bounded sizes for backpressure.
- **Error containment:** Runner/lifecycle errors are caught, reported, and translated into error events/status updates.

---

## 8. Extension Points

- **Add new turn behavior:** Prefer a typed pipeline, phase service, or outbox
  publication point under `AgentTurnRunner`.
- **Adjust queue priorities:** Update `_queue_priority` in `AgentInputEventQueueManager`.
- **Add new bootstrap steps:** Extend `AgentBootstrapper` / bootstrap step configuration.
- **Stream new outputs:** Add notifier events and map them in `AgentEventStream`.

---

## 9. Key Files (Reference)

- Agent runtime loop: `src/agent/runtime/agent-worker.ts`
- Agent queue manager: `src/agent/events/agent-input-event-queue-manager.ts`
- Agent turn runner: `src/agent/loop/agent-turn-runner.ts`
- Agent turn phases: `src/agent/loop/llm-turn-phase.ts`, `src/agent/loop/tool-phase.ts`
- Agent turn input box: `src/agent/loop/agent-turn-input-box.ts`
- Agent interruption scope: `src/agent/interruption/turn-execution-scope.ts`
- Agent runtime wrapper: `src/agent/runtime/agent-runtime.ts`
- Team workers: `src/agent-team/runtime/agent-team-worker.ts`
- Stream multiplexing: `src/agent-team/streaming/agent-event-multiplexer.ts`
