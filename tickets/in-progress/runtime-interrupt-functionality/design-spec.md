# Design Spec

## Current-State Read

The native Autobyteus runtime has a terminal stop path but no turn-scoped interrupt path.

Current single-agent path:

`Web/UI command -> AgentRun.interrupt() -> AutoByteusAgentRunBackend.interrupt() -> Agent.stop() -> AgentRuntime.stop() -> AgentWorker.stop() -> shutdown cleanup`

Current in-process execution path:

`Agent.postUserMessage() -> AgentRuntime.submitEvent() -> AgentWorker event loop -> WorkerEventDispatcher -> UserInputMessageEventHandler -> LLMUserMessageReadyEventHandler -> BaseLLM.streamMessages() -> provider stream -> optional PendingToolInvocationEvent -> ToolInvocationExecutionEventHandler -> BaseTool.execute() -> ToolResultEventHandler -> tool-continuation input -> next LLM call -> AgentIdleEvent`

Important current constraints:

- `AgentWorker.asyncRun()` awaits one dispatched event handler at a time. While an LLM stream or tool execution is awaited, the worker cannot process another queued event. Therefore, an interrupt implemented only as a queued event cannot preempt the active operation.
- `AgentWorker.stop()` sets stop flags and enqueues `AgentStoppedEvent`, but it does not abort the currently awaited LLM/tool promise. Stop can time out while the underlying operation continues.
- `AgentRuntimeState.activeTurn` already governs whether later external input can be processed, but `AgentTurn` currently stores only a turn ID and tool batches. It owns no cancellation signal, active-operation state, interruption outcome, or settlement promise.
- `LLMUserMessageReadyEventHandler` calls `llmInstance.streamMessages(...)` without a cancellation option and treats stream errors as LLM errors.
- `ToolInvocationExecutionEventHandler` calls `toolInstance.execute(context, args)` without a cancellation option and always enqueues a `ToolResultEvent` on completion/failure.
- `ToolResultEventHandler` can drop duplicate/recently settled invocation IDs after a turn cleanup, but interruption does not currently add interrupted invocation IDs to that guard.
- Server abstractions already separate interrupt from terminate: `AgentRunBackend.interrupt()` exists and Codex/Claude backends implement real abort/interrupt. Native Autobyteus single-agent and team backends are the inconsistent pieces: both call `stop()` from `interrupt()`.
- Native team runtime also has stop only. Stop runs shutdown cleanup for bridges, sub-teams, agents, and factory removal; that is not appropriate for “cancel current generation and keep the run usable.”

## Intended Change

Add first-class native Autobyteus interruption as a turn-scoped runtime-control capability:

- `stop()` remains terminal runtime shutdown.
- `interrupt()` means cancel the currently active turn/generation and keep the runtime/session reusable.
- `AgentRuntime` is the public authoritative command boundary for native agent interruption.
- `AgentTurn` owns an interruptible **turn execution scope**, not just a loose AbortController. The scope owns the active turn AbortSignal, interrupted flag, active operation metadata, settlement state, abort listeners, and late-result fencing.
- Introduce a finite **AgentTurnRunner / AgentLoopRunner** boundary for the per-trigger reasoning loop: user/inter-agent/tool-continuation input -> LLM -> tool batch -> tool result continuation -> next LLM -> final answer/idle.
- `AgentWorker` remains the long-lived runtime mailbox/scheduler, not the semantic owner of the agent reasoning loop.
- LLM/tool phases run under the active turn runner and turn execution scope. Passing `{ signal }` into BaseLLM/BaseTool/provider/tool APIs is downstream adapter plumbing, not the architectural owner of interruption.
- `LlmTurnPhase`, `ToolPhase`, LLM providers, concrete tools, and selected built-in tool adapters receive the active turn scope/signal and translate it into provider/tool cancellation or local abandonment.
- Interrupted turns settle to idle with explicit interruption metadata, not success, error, or shutdown.
- Native server Autobyteus backends call native `interrupt()` APIs instead of `stop()`.
- Native team interrupt propagates to currently running member agents/sub-teams without invoking team shutdown cleanup.

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
- out-of-band interrupt entry from `AgentRuntime.interrupt()` even while `AgentWorker` is awaiting the active `AgentTurnRunner` / phase operation;
- a standard way for the current await boundary to fail with `AgentInterruptionError`;
- registration of best-effort physical cancellers, for example stream close, HTTP abort, terminal session kill, MCP request cancel when supported;
- late-result fencing so an abandoned LLM/tool promise cannot revive the interrupted turn;
- one interrupted settlement path that clears pending approvals, same-turn queued continuations, and partial streaming segments.

Important JavaScript/TypeScript constraint: a Promise cannot be forcibly cancelled and an exception cannot be safely injected into arbitrary already-running async code from outside. The execution scope therefore combines three mechanisms:

1. **Cooperative cancellation**: the scope exposes `signal`; providers/tools that support cancellation observe it and stop.
2. **Await-boundary interruption**: `LlmTurnPhase` and `ToolPhase` run LLM/tool work through scope utilities that race the active operation against the scope abort and throw/normalize `AgentInterruptionError` at the phase boundary.
3. **Containment/fencing**: if a provider/tool ignores cancellation, the scope abandons the local wait, records the turn as interrupted, and suppresses late results. Truly forcible termination requires a stronger containment boundary such as killing a child process/terminal session or worker process; use that only for concrete adapters that own such resources.

So `{ signal }` remains necessary, but only as the transport/control wire from the turn execution scope to lower-level participants. The main-line architecture is: `AgentRuntime.interrupt()` interrupts the active `AgentTurn.executionScope`; the LLM/tool calls merely participate in that scope.

## AgentWorker vs AgentLoop Boundary

Current code uses `AgentWorker.asyncRun()` as a long-lived event pump, but the per-turn agent loop is only implicit in queued events and handlers:

`UserMessageReceivedEvent -> LLMUserMessageReadyEvent -> LLMCompleteResponseReceivedEvent -> PendingToolInvocationEvent -> ExecuteToolInvocationEvent -> ToolResultEvent -> tool-continuation UserMessageReceivedEvent -> next LLMUserMessageReadyEvent -> ... -> AgentIdleEvent`

That means `AgentWorker` currently represents two different concepts at once:

1. **Runtime mailbox / scheduler**: keeps the agent alive, initializes bootstrap state, dequeues external/internal events, and handles terminal stop/shutdown.
2. **Implicit agent loop executor**: because every LLM/tool step is dispatched through the same worker loop, the worker becomes the de facto runner of the reasoning loop.

The interrupt requirement exposes this conflation. A user wants to interrupt the finite loop started by one message, not kill the long-lived mailbox. Therefore the target architecture should separate them:

| Concept | Lifetime | Responsibility | Interrupt behavior |
| --- | --- | --- | --- |
| `AgentRuntime` | Agent session | Public lifecycle/control: start, stop, interrupt, submit external input. | Calls active turn runner/scope interrupt. |
| `AgentWorker` / mailbox worker | Long-lived until stop | Serialize external triggers and lifecycle events; enforce one active turn at a time. | Not the thing being interrupted; remains alive. |
| `AgentTurn` | One triggered turn | Turn identity, batches, execution scope, settlement state. | Owns interrupted/settled state. |
| `AgentTurnRunner` / `AgentLoopRunner` | One active turn | Finite reasoning loop: process input, call LLM, handle tool batches/approvals/results, repeat until final or interrupted. | Catches `AgentInterruptionError`, performs turn cleanup, returns interrupted outcome. |

Target single-turn control shape:

```ts
while (worker.isRunning()) {
  const trigger = await agentInputBox.nextTurnTriggerWhenIdle();
  const turn = runtimeState.startActiveTurn(trigger.turnId);
  const runner = new AgentTurnRunner(context, turn);

  try {
    await runner.run(trigger);
    runtimeState.completeActiveTurn(turn.turnId);
  } catch (error) {
    if (isAgentInterruptionError(error)) {
      await runner.settleInterrupted(error);
      continue;
    }
    throw error;
  }
}
```

In this model the internal tool/LLM cycle does not need to be represented primarily as worker queue traffic. The queue can still exist for external triggers and notifications, but turn-local continuation is owned by the runner. This makes interruption natural: the active runner has one execution scope, one try/catch boundary, and one settlement path.

Final implementation rule:

- `AgentTurnRunner` is introduced as the direct owner of turn-local control flow, not as a pass-through over old queued phase flow.
- LLM/tool/request/result logic that currently lives in queued handlers is moved into `LlmTurnPhase`, `ToolPhase`, typed pipelines, `AgentTurnInputBox`, and `ToolResultContinuationBuilder`.
- Public event/stream notifications remain events, but they do not advance the internal turn loop.

This is a larger refactor than adding `{ signal }`, but it is architecturally cleaner and aligns with the domain model: the agent runtime is long-lived; each agent loop/turn is finite and interruptible.

## Concept Inventory Before Spines

Before choosing file changes, the architecture should make these concepts explicit:

| Concept | Meaning | Current Representation | Target Responsibility | Notes |
| --- | --- | --- | --- | --- |
| Runtime control plane | Public commands and lifecycle for a running agent session. | `AgentRuntime`, server backend adapters. | `start`, terminal `stop`, side-band `interrupt`, external input submission. | Control commands such as interrupt must not wait behind the AgentTurnInputBox. |
| Runtime lifecycle pipeline | Bootstrap and terminal shutdown work for the whole runtime. | Single-agent bootstrap is event-choreographed; team bootstrap is direct; shutdown orchestrators already exist. | Run bootstrap before input box processing; run shutdown exactly once on terminal stop/worker exit. | This is not an agent turn and not interrupted by user generation interrupt. |
| AgentInputBox | Durable arrival area for external triggers and runtime lifecycle messages. | `AgentInputEventQueueManager` queues. | Hold user messages, inter-agent messages, lifecycle notifications, and other messages that may exist before/after a turn. | The AgentInputBox is not the agent loop and must not let turn-local messages start new turns. |
| AgentTurnInputBox | Per-active-turn arrival area for turn-local messages. | Currently mixed into `AgentInputEventQueueManager` as tool continuation/tool result/tool approval queues. | Hold tool results, tool approvals, and same-turn continuations keyed by `turnId`/invocation ID. | Consumed by `AgentTurnRunner`; cleared/fenced on interruption. |
| Agent outbox | Canonical outbound lane for agent-produced facts/data. | Currently direct notifier calls scattered across handlers. | Publish assistant output, segment deltas, tool lifecycle/logs, approvals, errors, artifacts, todo updates, turn lifecycle. | Consumed by notifier/event stream/server/UI; not used to advance turn control flow. |
| AgentInputBox monitor / scheduler | Long-lived process that reacts when AgentInputBox work is available. | `AgentWorker.asyncRun()`. | Initialize runtime, wait for next eligible external trigger, start/await one `AgentTurnRunner`, handle terminal shutdown. | This can keep the `AgentWorker` name; responsibility must narrow. |
| AgentInputBox trigger | One external item that may start work. | `UserMessageReceivedEvent`, `InterAgentMessageReceivedEvent`, and other external trigger events; approval events are routed to `AgentTurnInputBox` in the final model. | Typed input to scheduler/runner with explicit identity and optional turn context. | New external user/inter-agent trigger starts a turn only when no active turn exists. |
| Agent turn | One finite unit of agent reasoning started by an external trigger. | `AgentTurn` with turn ID and tool batches. | Turn ID, active batches, execution scope, settlement/interruption metadata. | TOOL continuations stay inside the same turn. |
| Agent turn runner / agent loop | Finite reasoning loop for one turn. | Implicit in worker queue + handlers. | Process input, call LLM, run tools, feed tool continuations, finish or settle interrupted. | This is the missing domain boundary. |
| Turn execution scope | Cancellation/operation scope for one turn. | Not present. | Abort signal, active operation, abort callbacks, `AgentInterruptionError`, late-result fencing. | Mechanical cancellation primitive used by runner phases. |
| Processor | Ordered custom extension point for one domain transformation. | Existing `input-processor`, `llm-response-processor`, `tool-execution-result-processor`, `tool-invocation-preprocessor`, `system-prompt-processor`. | Remain concrete domain processors with `getOrder()` semantics. | Do not collapse all processors into one generic type if their contracts differ. |
| Processor pipeline | Orchestrator that applies processors for one area. | Currently embedded inside individual handlers/bootstrap step. | Shared pipeline services under `agent/pipelines` for input, tool invocation, tool result, LLM response/output, system prompt. | Pipeline services are called by the runner and final inbound/outbound boundaries; legacy turn-control handler ownership is removed. |
| Agent input pipeline | AgentInputBox/TOOL-continuation message -> LLM-ready user message. | `UserInputMessageEventHandler`. | Preserve sender type/turn rules, run input processors, build multimodal LLM user message. | Critical for tool-result continuation. |
| Tool result continuation builder | Ordered tool results -> TOOL-sender input message. | Private method in `ToolResultEventHandler`. | Preserve current aggregate message shape, denied/error/success formatting, `ContextFile` attachments. | Feeds `AgentInputPipeline`, never raw LLM. |
| LLM/tool phase services | Turn-local phase work. | `LLMUserMessageReadyEventHandler`, tool handlers. | Execute one LLM phase or tool phase under `TurnExecutionScope`. | Existing handler logic moves into these services; final handlers do not own turn-local phase work. |
| Output / response pipeline | Completed LLM response -> processor handling/final output. | `LLMCompleteResponseReceivedEventHandler` and `llmResponseProcessors`. | Apply response/output processors, emit assistant complete/final answer, decide whether turn is complete. | If future “output processors” are added, they belong in this concept, not the worker. |
| Event/notification stream | Observability and client updates. | Notifier, stream events, WebSocket mappers. | Report statuses, stream segments, tool lifecycle, turn interrupted/completed. | Events can report facts without being the only turn-control mechanism. |

Design rule: **the input box schedules turns; processor pipelines transform data; the runner controls turn-local flow; the execution scope interrupts active operations; events notify observers.**

## Corrected Conceptual Data-Flow Spines

These are the spines the implementation should preserve or create. The later detailed file mapping should be checked against them.

| Spine ID | Name | Start | Main Path | End / Outcome | Owner |
| --- | --- | --- | --- | --- | --- |
| CDF-001 | Runtime bootstrap | `AgentRuntime.start()` | `AgentWorker` runtime init -> system prompt pipeline -> ready/idle notification | Agent ready for input box triggers | `AgentRuntime` / `AgentWorker` |
| CDF-002 | External trigger to turn | User/inter-agent message enters `AgentInputBox` | `AgentInputBox.nextTurnTriggerWhenIdle` exposes one eligible trigger -> `AgentWorker` checks no active turn -> creates `AgentTurn` -> starts `AgentTurnRunner` | One active runner owns the trigger | `AgentInputBox` / `AgentWorker` scheduler |
| CDF-003 | Input processing to LLM leg | External trigger or TOOL continuation | `AgentInputPipeline` applies input processors -> builds LLM user message with correct turn ID | LLM phase receives processed LLM input | `AgentInputPipeline` |
| CDF-004 | LLM phase | Processed LLM input | LLM request assembly/compaction -> provider stream under `TurnExecutionScope` -> streaming parser/segment events | Final response or tool invocations | `AgentTurnRunner` LLM phase |
| CDF-005 | Final response / output | LLM final response with no tool continuation | LLM response/output pipeline -> response processors -> assistant complete/final notification | Turn completed and idle | Response/output pipeline + runner |
| CDF-006 | Tool invocation phase | Parsed LLM tool invocations | tool invocation preprocessors -> approval if needed -> tool execution under `TurnExecutionScope` -> tool results posted/returned into AgentTurnInputBox | Ordered tool results or interruption | `AgentTurnRunner` tool phase + AgentTurnInputBox |
| CDF-007 | Tool result continuation | Ordered tool results from AgentTurnInputBox | tool result processors -> continuation builder -> `AgentInputPipeline` with `SenderType.TOOL` and existing active turn | Next processed LLM input in same turn | Tool result pipeline + input pipeline |
| CDF-008 | Interrupt active turn | User control command, not input box turn traffic | server/backend -> `AgentRuntime.interrupt()` -> active `AgentTurn.executionScope.interrupt()` -> active phase aborts/abandons | Runner settles turn interrupted; worker remains alive | `AgentRuntime` / `AgentTurnRunner` / `TurnExecutionScope` |
| CDF-009 | Pending approval response | Approval/denial arrives while turn waits | AgentTurnInputBox/scheduler routes approval to active runner/tool phase by invocation/turn ID | Tool phase resumes or settles denied/interrupted | Scheduler + tool phase |
| CDF-010 | Outbox / observability | Domain fact or agent-produced output occurs in any spine | phase/pipeline publishes to `AgentOutbox` -> notifier/event stream/WebSocket/frontend | Client sees assistant output/status/segments/tool lifecycle/turn outcome | AgentOutbox + event/notification pipeline |
| CDF-011 | Terminal shutdown | `AgentRuntime.stop()` / worker terminal exit | mark stopping -> cancel active turn/lifecycle work as terminal shutdown if needed -> shutdown orchestrator cleans LLM/tools/MCP/resources -> stopped | Runtime lifecycle pipeline |

Important spine constraints:

- CDF-008 is side-band control. It must not be blocked behind CDF-002/CDF-003 queue processing.
- CDF-007 must go through CDF-003. Tool results must not be fed directly to the LLM.
- CDF-010 observes and reports facts. It should not be the sole mechanism that advances CDF-003 through CDF-007.
- CDF-002 enforces the one-active-turn invariant for external triggers; CDF-007 reuses the existing turn instead of creating a second turn.
- CDF-001 and CDF-011 are runtime lifecycle spines. They must not be mixed into the per-turn runner and must not run during a normal generation interrupt.

## Input Box Lane Model

Use the explicit names **AgentInputBox** and **AgentTurnInputBox** rather than generic “inbox” in implementation-facing code.

- `AgentInputBox`: runtime-level inbound lane for messages that may start a new turn or belong to runtime/lifecycle handling.
- `AgentTurnInputBox`: active-turn inbound lane for messages that can only advance the current turn, such as tool results, approvals, and same-turn continuations.

It is useful to think in terms of input boxes, but the design should avoid one undifferentiated queue where every message has equal semantic meaning. The cleaner model is **typed input-box lanes**:

| Input Box Lane | Accepted Messages | Consumer | Can Start New Turn? | Turn Binding |
| --- | --- | --- | --- | --- |
| AgentInputBox | user messages, inter-agent messages, system/user-facing external triggers | `AgentWorker` scheduler | Yes, when no active turn exists | New `AgentTurn` is created by scheduler |
| Runtime lifecycle/control lane | bootstrap/shutdown/ready/error/status notifications, terminal stop coordination | runtime lifecycle owner | No | Runtime-level, not turn-level |
| AgentTurnInputBox | tool results, tool approvals/denials, same-turn TOOL continuations, phase-local wakeups | `AgentTurnRunner` | No | Must match active `turnId` and/or invocation ID |
| Side-band control | interrupt command | `AgentRuntime.interrupt()` directly | No | Active turn if present |

So yes, tool results can be modeled as input-box messages, but they belong to the **AgentTurnInputBox**, not the AgentInputBox.

This gives the best of both models:

- input box processing remains explicit and extensible by message type;
- tool results are not accidentally treated like external user input;
- the active runner can wait for tool results/approvals while still owning the turn loop;
- interrupt can clear/fence the AgentTurnInputBox without deleting unrelated future user messages;
- stale late tool results can be dropped by `turnId`/invocation ID.

Conceptual shape:

```ts
type AgentInputBoxMessage =
  | ExternalUserMessage
  | InterAgentMessage
  | RuntimeLifecycleMessage;

type AgentTurnInputBoxMessage =
  | ToolResultMessage
  | ToolApprovalMessage
  | ToolContinuationMessage;

class AgentWorker {
  async run() {
    const trigger = await agentInputBox.nextExternalTriggerWhenIdle();
    const turn = state.startActiveTurn(trigger.turnId);
    await new AgentTurnRunner(context, turn, turn.inputBox).run(trigger);
  }
}

class AgentTurnRunner {
  async runToolPhase(invocations) {
    await toolExecutor.start(invocations);
    const results = await this.agentTurnInputBox.collectToolResults(invocations, {
      signal: this.turn.executionScope.signal,
    });
    return results;
  }
}
```

Design rule: **messages that can create a turn go to the AgentInputBox; messages that can only advance an existing turn go to the AgentTurnInputBox; interrupts bypass both as side-band control.**

If the existing `AgentInputEventQueueManager` remains as low-level storage, it must sit behind semantic `AgentInputBox` / `AgentTurnInputBox` APIs. It must not preserve old phase-handler queue choreography as the normal turn-control path.

## Outbox Lane Model

If the architecture names input boxes, it should also name the outbound side. Today outbound behavior is scattered through direct notifier calls from handlers and processors:

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

Design rule: **input-box messages drive work; outbox messages publish facts/results. Outbox messages must not be required to advance the internal agent loop.**

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

Bootstrap and shutdown fit the new architecture, but they should be treated as **runtime lifecycle pipelines**, not as agent turns and not as input box-triggered agent-loop work.

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
| AgentInputBox availability | `AgentWorker` scheduler | External turn triggers must not start until bootstrap succeeds and ready/idle is reached. |

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

The design should avoid a broad rename of `AgentWorker`. The goal is not a naming cleanup; the goal is to introduce the missing domain boundary: **one finite, interruptible turn runner**. Existing names may remain if their responsibilities become clearer.

### Core Objects

| Object | Kind | Owns | Must Not Own | Why |
| --- | --- | --- | --- | --- |
| `AgentRuntime` | Public lifecycle/control boundary | `start`, `stop`, `interrupt`, `postUserMessage`, run status access, active-turn command routing. | LLM/tool phase execution, provider cancellation details, per-turn loop choreography. | Keeps external API stable and separates terminal runtime lifecycle from per-turn work. |
| `AgentWorker` | Long-lived runtime worker / scheduler | Bootstrap/runtime initialization, waiting for the next external trigger, ensuring only one active turn is run at a time, awaiting the current `AgentTurnRunner`, terminal shutdown sequence. | The semantic LLM/tool reasoning loop, provider/tool cancellation policy, interrupted turn settlement details. | Preserves existing worker concept but narrows it to runtime scheduling and lifecycle execution. |
| `AgentTurn` | Per-turn state object | Turn ID, active tool batches, execution scope, settlement state, interruption metadata. | Running the loop, calling LLM/tools, status protocol mapping. | Gives the active turn one canonical identity and cancellation/settlement state. |
| `AgentTurnRunner` / `AgentLoopRunner` | Per-turn use-case runner | The finite loop for one trigger: input processing, LLM phase, tool request/approval/execution/result phase, continuation, final/idle/interrupted outcome. | Runtime start/stop, external mailbox ownership, provider-specific cancellation, frontend/server protocol mapping. | This is the missing boundary. It is the thing that can be started, awaited, and interrupted. |
| `TurnExecutionScope` | Per-turn cancellation/operation primitive | AbortController/signal, active operation metadata, abort callback registry, `runAbortable`, `AgentInterruptionError` normalization, late-result fencing hooks. | Business loop decisions, LLM/tool semantics, runtime lifecycle. | Keeps cancellation mechanics out of both the runner and provider/tool adapters. |

### Why `TurnExecutionScope` Is Still Needed

`AgentTurnRunner` should own **what the turn does next**. It should not directly own all cancellation mechanics. Without a separate scope, the runner becomes a large object mixing:

- input/LLM/tool continuation policy;
- abort-controller lifecycle;
- promise/stream race code;
- late-result suppression;
- terminal/MCP/provider abort callback registration;
- interruption error normalization.

That violates single responsibility. Therefore the scope is needed, but it must stay small and mechanical.

Correct relation:

```text
AgentTurnRunner  --uses-->  AgentTurn.executionScope

AgentTurnRunner decides: run LLM, run tools, continue, finish, settle interrupted.
TurnExecutionScope enforces: this operation is interruptible and late results cannot escape.
```

So the runner is the domain control owner; the scope is the cancellation primitive.

### Active Turn State Shape

```ts
class AgentTurn {
  readonly turnId: string;
  readonly executionScope: TurnExecutionScope;

  activeToolInvocationBatch: ToolInvocationBatch | null;
  settlement: TurnSettlementController;

  interrupt(reason: string): AgentInterruptResult {
    return this.executionScope.interrupt(reason);
  }
}
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

### Worker/Runner Control Shape

```ts
while (!stopRequested) {
  const trigger = await agentInputBox.nextTurnTriggerWhenIdle();

  const turn = state.startActiveTurn(trigger.turnId);
  const runner = new AgentTurnRunner(context, turn);

  const outcome = await runner.run(trigger);

  if (outcome.kind === 'completed') {
    state.completeActiveTurn(turn.turnId);
  } else if (outcome.kind === 'interrupted') {
    state.settleInterruptedTurn(turn.turnId, outcome.reason);
  }
}
```

The worker may still publish or observe bootstrap/lifecycle events, but turn-local control flow is owned directly by the runner and phase services rather than internal queue events.

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

Before moving tool continuation out of queue choreography, extract the current user-input transformation into a shared pipeline, for example:

```ts
class AgentInputPipeline {
  async processForLlm(
    event: UserMessageReceivedEvent,
    context: AgentContext,
    options: { turn: AgentTurn; startsNewTurn: boolean }
  ): Promise<LLMUserMessageReadyEvent>
}
```

Then both paths use the same pipeline:

```text
External user input:
  AgentWorker -> AgentTurnRunner -> AgentInputPipeline.processForLlm(startsNewTurn=true)

Tool continuation:
  AgentTurnRunner -> ToolResultContinuationBuilder ->
  AgentInputPipeline.processForLlm(startsNewTurn=false, senderType=TOOL)
```

The input-processing logic currently inside `UserInputMessageEventHandler` should move into `AgentInputPipeline`. In the final design, normal turn execution calls this pipeline directly; the old queued input handler is not part of the turn-local loop.

### Tool Continuation Builder

Also extract the aggregation currently embedded in `ToolResultEventHandler.dispatchResultsToInputPipeline(...)` into a reusable turn-local component, for example:

```ts
class ToolResultContinuationBuilder {
  build(processedResults: ToolResultEvent[]): AgentInputUserMessage
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
| External user/inter-agent messages | Runtime inbox triggers | Valid use of a queue behind a semantic inbox. | `AgentInputBox` / `AgentWorker` scheduler |
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
AgentWorker waits for the next external trigger.
AgentTurnRunner owns everything that happens inside that trigger's turn.
Events still announce what happened, but they are no longer the only way the turn advances.
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
  async run(trigger: UserMessageReceivedEvent): Promise<TurnOutcome> {
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

- queues schedule external triggers and lifecycle/control messages;
- runner phase services implement turn-local business flow;
- events/notifiers report status and streaming facts;
- internal queue events must not be the normal representation of the agent loop.

This is a significant refactor, but it improves locality, makes interruption natural, and makes the tool-result continuation rule easy to verify.

## Design Principles Validation

| Principle | Validation | Design Consequence |
| --- | --- | --- |
| Single Responsibility | Runtime, AgentInputBox, worker, turn state, turn runner, phase services, and cancellation scope each have one primary reason to change. | Do not put inbox eligibility in low-level queue storage; do not put LLM/tool loop policy in `AgentWorker`; do not duplicate cancellation mechanics directly in every phase service. |
| Separation of Lifetimes | Runtime/worker are long-lived; turn/runner/scope are finite. | `stop()` targets runtime/worker lifetime; `interrupt()` targets active turn lifetime. |
| Structured Concurrency | Child operations belong to a parent turn scope. | LLM streams, tool calls, approvals, and continuations must be tied to one `AgentTurn.executionScope`. |
| Encapsulation | Higher layers issue intent; lower layers implement mechanics. | Server calls `agent.interrupt`; runtime interrupts active turn; runtime input goes through `AgentInputBox`; providers/tools only receive generic execution options. |
| Authoritative Boundary Rule | Callers depend on the semantic owner, not both the owner and its internals. | Runtime/worker use `AgentInputBox`, not both `AgentInputBox` and `AgentInputEventQueueManager`; runner uses phase/pipeline services, not old handlers. |
| Idempotent State Transitions | Interrupt can be repeated and late results can arrive. | `AgentTurn` settlement must be idempotent; late LLM/tool results are fenced and ignored. |
| Open/Closed Adapter Boundary | New provider/tool cancellation behavior should not change runtime logic. | `BaseLLM` and `BaseTool` expose generic execution options; adapters map to provider/tool specifics. |
| Command/Event Separation | Events are good for external triggers and notifications, but turn-local business flow should have explicit phase owners. | `AgentTurnRunner` and phase services advance the loop; events/notifiers report facts. |
| Behavioral Preservation | Existing tool-result continuation semantics are part of the domain contract, not incidental queue behavior. | Extract and reuse `AgentInputPipeline` and `ToolResultContinuationBuilder`; never bypass input processors for tool continuations. |
| Minimal Renaming | Avoid broad churn unrelated to the behavior. | Keep `AgentWorker` name if desired; reduce its role and add `AgentTurnRunner` rather than renaming the whole runtime. |

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue + Missing Invariant
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: Server `interrupt()` boundary exists but native Autobyteus maps it to `stop()`. Core `AgentTurn` lacks cancellation invariants. The finite per-turn agent loop is implicit in worker-queued handler choreography, so `AgentWorker` currently mixes mailbox/scheduler responsibility with reasoning-loop execution. LLM/tool handlers own blocking awaits locally with no shared cancellation contract. Worker queue processing cannot preempt active handler dispatch.
- Design response: Introduce an explicit `AgentTurnRunner`/agent-loop boundary plus an `agent/interruption` capability owned by AgentRuntime/AgentTurn. Keep `AgentWorker` as long-lived mailbox/scheduler, propagate the active turn scope through LLM/tool boundaries, add explicit interrupted lifecycle events/status metadata, and remove the native backend interrupt-to-stop mapping.
- Refactor rationale: Implementing only `AutoByteusAgentRunBackend.interrupt()` would still leave in-flight LLM/tool work uninterruptible. Implementing cancellation separately inside each handler would duplicate policy and preserve boundary ambiguity. Treating `AgentWorker` as the agent loop keeps the long-lived runtime loop and finite turn loop conflated. The correct owner is the active turn runner/scope under the runtime command boundary.
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
| DS-002 | Primary End-to-End | `AgentRuntime.interrupt()` during LLM phase | `LlmTurnPhase` aborts/abandons provider stream; no assistant completion is ingested | `AgentTurnRunner` + `TurnExecutionScope` + `BaseLLM` boundary | Ensures interruption reaches LLM without relying on worker-dispatched handlers. |
| DS-003 | Primary End-to-End | `AgentRuntime.interrupt()` during tool phase | `ToolPhase` aborts/abandons active tool execution; late result fenced; no continuation LLM call | `AgentTurnRunner` + `TurnExecutionScope` + `BaseTool` boundary | Ensures interruption reaches tools and same-turn batch mechanics. |
| DS-004 | Primary End-to-End | User interrupts native team run | Running member agents/sub-teams are interrupted and team returns idle without teardown | `AgentTeamRuntime` / `TeamManager` | Native team backend currently calls stop; team behavior must match interrupt semantics. |
| DS-005 | Return-Event | Interrupted turn/tool status | Frontend observes interrupting/interrupted lifecycle and can clear sending state | `AgentOutbox` / runtime event/status pipeline | Prevents interruption from looking like success, failure, or shutdown. |
| DS-006 | Bounded Local | Active `AgentTurnRunner` operation | `TurnExecutionScope.runAbortable` returns/throws interruption and runner settles | `AgentTurnRunner` + `TurnExecutionScope` | Queue-based worker dispatch is not the normal turn-control path; operations are scoped directly under the turn. |
| DS-007 | Bounded Local | Tool batch settlement under active turn | Expected invocation IDs are settled/fenced and `AgentTurnInputBox` is closed/cleared on interrupt | `AgentTurn` / `AgentTurnInputBox` / `AgentRuntimeState` | Prevents late tool results from reviving an interrupted turn. |

## Primary Execution Spine(s)

Single-agent native interrupt:

`Client Interrupt Command -> AgentRunBackend.interrupt -> Agent.interrupt -> AgentRuntime.interrupt -> Active AgentTurnRunner/TurnExecutionScope Interrupt -> LlmTurnPhase/ToolPhase Aborts Or Abandons -> AgentTurn Interrupted Settlement -> AgentOutbox Turn/Tool Interrupted Events -> Runtime Idle Status`

Native LLM interruption:

`AgentRuntime.interrupt -> AgentTurn.executionScope.interrupt -> LlmTurnPhase abortable provider stream -> BaseLLM/provider request abort or local abandonment -> streaming segment interruption finalization -> skip assistant ingestion/output pipeline -> interrupted turn settlement`

Native tool interruption:

`AgentRuntime.interrupt -> AgentTurn.executionScope.interrupt -> ToolPhase abortable execute -> BaseTool / terminal / MCP cancellation -> AgentTurnInputBox fences expected invocation IDs -> AgentOutbox tool-interrupted lifecycle -> no ToolResultContinuationBuilder call -> interrupted turn settlement`

Native team interruption:

`Team Interrupt Command -> AutoByteusTeamRunBackend.interrupt -> AgentTeam.interrupt -> AgentTeamRuntime.interrupt -> TeamManager interrupt running nodes -> member AgentRuntime interrupts -> Team idle/interrupted status`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The user asks to cancel the current native generation. The server backend calls native `Agent.interrupt()`. Runtime signals the active `AgentTurn` side-band through the runner/scope. The active phase service sees the scope interruption, stops producing normal output, and returns/throws `AgentInterruptionError` to `AgentTurnRunner`. The runner closes the turn input box, publishes interrupted facts through `AgentOutbox`, settles the turn interrupted, and the runtime remains running/idle. | Client command, AgentRunBackend, AgentRuntime, AgentTurnRunner, AgentTurn, TurnExecutionScope, AgentOutbox | AgentRuntime / AgentTurnRunner / AgentTurn | Server backend, status projection, stream events |
| DS-002 | While LLM streaming is active, interrupt aborts the active turn scope. `LlmTurnPhase` races provider iteration against the scope, asks the provider/iterator to abort/close when supported, closes open response segments with interruption metadata, skips assistant ingestion and `LLMResponsePipeline`, and returns interruption to the runner. | AgentRuntime, AgentTurnRunner, TurnExecutionScope, LlmTurnPhase, BaseLLM, provider | AgentTurnRunner + TurnExecutionScope + BaseLLM | Streaming parser/segments, memory working-context rollback/suppression |
| DS-003 | While a tool is running, interrupt aborts the active turn scope. `ToolPhase` races tool execution against that scope. Participating tools receive the signal; terminal foreground command closes its session. The phase publishes tool-interrupted lifecycle through `AgentOutbox`, marks/fences expected invocation IDs, closes the active turn input box for that batch, and returns interruption without building a TOOL continuation. | AgentRuntime, AgentTurnRunner, TurnExecutionScope, ToolPhase, BaseTool, AgentTurnInputBox | AgentTurnRunner + TurnExecutionScope + BaseTool | Terminal/MCP cancellation, recent-settled cache, pending approval cleanup |
| DS-004 | A team interrupt is a coordination operation, not shutdown. The native team runtime enters interrupting, asks TeamManager to interrupt all currently running cached agents/sub-teams, waits boundedly for member settlement, and returns team status to idle/interrupted. | Team backend, AgentTeamRuntime, TeamManager, member AgentRuntime | AgentTeamRuntime / TeamManager | Member context mapping, team status/events |
| DS-005 | Interrupt outcome travels through `AgentOutbox`, native notifier, stream conversion, server WebSocket mapper, and frontend handlers as interrupting/interrupted metadata. UI can clear sending state and keep the run online. | AgentOutbox, AgentExternalEventNotifier, AgentEventStream, server converter, WebSocket mapper, frontend handlers | AgentOutbox / runtime event pipeline | Status visuals, protocol enum |
| DS-006 | The worker remains serialized as an input-box monitor, but normal turn execution is not worker-dispatched handler choreography. Active runner phase services execute operations through `TurnExecutionScope` so the awaited operation returns promptly after abort and the worker later resumes with preserved unrelated AgentInputBox messages. | AgentWorker, AgentTurnRunner, TurnExecutionScope, phase services | AgentTurnRunner / TurnExecutionScope | Signal-aware phase operations, late-promise logging |
| DS-007 | Interruption invalidates all same-turn pending/queued continuation work. Tool approvals are cleared or rejected by active-turn identity. Invocation IDs expected by the active batch are marked recently settled/fenced so stale late results are ignored. | AgentTurn, AgentTurnInputBox, AgentRuntimeState, recent settled cache | AgentTurn / AgentTurnInputBox / AgentRuntimeState | Message predicates, pending approval map |

## Spine Actors / Main-Line Nodes

- Client interrupt command: sends the user's cancel-current-generation intent.
- AgentRunBackend / TeamRunBackend: runtime-kind adapter for the command.
- Agent / AgentTeam facade: public native runtime API exposed above runtime internals.
- AgentRuntime / AgentTeamRuntime: authoritative lifecycle/control boundary.
- AgentInputBox: semantic runtime inbox for external turn-starting triggers and queued messages that can exist outside a turn.
- AgentWorker / AgentInputBox monitor: starts one runner for one eligible external trigger; does not own LLM/tool loop semantics.
- AgentTurnRunner: finite per-turn agent loop owner.
- AgentTurn: active-turn identity, input box, cancellation scope, and settlement state owner.
- TurnExecutionScope: per-turn cancellation and late-result fencing primitive.
- LlmTurnPhase / ToolPhase: direct phase services called by the runner.
- BaseLLM / BaseTool: provider/tool boundary where cancellation leaves runtime internals.
- AgentOutbox / runtime event/status pipeline: publishes interrupting/interrupted state to server/UI.

## Ownership Map

- `AgentRuntime` owns public runtime control commands: start, stop, interrupt, external input submission, and status projection for runtime-level control events.
- `AgentInputBox` owns runtime-level inbound messages that may start turns, semantic trigger eligibility, and preservation of queued external messages while a turn is active. It may use low-level queue storage but owns the inbox contract.
- `AgentWorker` owns long-lived AgentInputBox monitoring, runtime bootstrap readiness, one-active-turn scheduling, and stop/shutdown sequencing. It must not own the finite LLM/tool reasoning loop.
- `AgentTurnRunner` / `AgentLoopRunner` owns the finite per-turn reasoning loop and is the primary local try/catch boundary for `AgentInterruptionError`.
- `LlmTurnPhase` owns one LLM phase: request assembly, compaction preparation, provider streaming, streaming parser integration, and phase-level interruption handling.
- `ToolPhase` owns one tool phase: invocation preprocessing, approval coordination through `AgentTurnInputBox`, abortable execution, result collection, and tool-interrupted lifecycle publication.
- `AgentTurn` owns turn ID, active tool batch, `AgentTurnInputBox`, `TurnExecutionScope`, active operation metadata, interrupted flag, and settlement promise.
- `AgentRuntimeState` owns active-turn storage, pending approval indexes needed across external approval routing, recent settled invocation IDs, and working-context turn checkpoint restoration/suppression.
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
| `AgentTeam.interrupt(...)` | `AgentTeamRuntime.interrupt(...)` | Public native team API. | Member propagation policy beyond delegating to runtime. |
| `AutoByteusAgentRunBackend.interrupt(...)` | Native `Agent.interrupt(...)` | Server runtime-kind adapter. | Stop fallback or in-process runtime cleanup. |
| `AutoByteusTeamRunBackend.interrupt(...)` | Native `AgentTeam.interrupt(...)` | Server team backend adapter. | Stop fallback or team shutdown cleanup. |
| Frontend interrupt action/store method | Server `AgentRun.interrupt(...)` / `TeamRun.interrupt(...)` | User command transport. | Runtime semantics beyond issuing command and reflecting stream state. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `AutoByteusAgentRunBackend.interrupt()` calling `agent.stop()` | Incorrectly conflates interrupt with terminal shutdown. | `agent.interrupt()` / `AgentRuntime.interrupt()` | In This Change | No fallback to stop. If native agent lacks interrupt, return unsupported command failure. |
| `AutoByteusTeamRunBackend.interrupt()` calling `team.stop()` | Incorrectly terminates native team on interrupt. | `team.interrupt()` / `AgentTeamRuntime.interrupt()` | In This Change | No fallback to stop. |
| Queue/handler choreography for normal turn loop | It hides the finite agent loop across worker-dispatched handlers. | `AgentTurnRunner` + direct phase/pipeline services | In This Change | Old queue events may remain only as outbox/lifecycle/external boundary facts, not turn-control flow. |
| Treating `AgentInputEventQueueManager` as the semantic agent inbox | Queue storage should not own turn-starting eligibility or domain routing. | `AgentInputBox` in `agent/input-box/agent-input-box.ts`, with queue manager as optional low-level storage. | In This Change | Prevents tool results/approvals from being mistaken for turn-starting inbox messages. |
| Queue-only idea for interrupt | Normal queued work cannot preempt an active phase operation. | Side-band `AgentRuntime.interrupt()` -> active `TurnExecutionScope` | In This Change | Interrupt events can still be published through outbox/status. |
| Treating abort as LLM/tool error | Interrupted work is not a runtime error or tool failure. | `AgentInterruptionError` and interrupted lifecycle outbox events. | In This Change | Provider/tool abort exceptions must normalize to interruption. |
| Normal tool-continuation after interrupted tool batch | Would let an interrupted turn continue. | Turn-scoped input-box close/fencing + recent settled invocation IDs. | In This Change | Late results ignored. |
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
  - Spine: `phase service operation -> TurnExecutionScope.runAbortable/iterateAbortable -> AgentInterruptionError -> runner interrupted settlement -> worker resumes input-box monitoring`
  - Why it matters: The worker remains serialized but does not own turn-local LLM/tool control flow.

- Parent owner: `AgentTurn`
  - Spine: `startActiveTurn -> create AgentTurnInputBox/scope/checkpoint -> begin runner operation -> interrupt scope -> settle interrupted -> resolve settlement -> clear active turn`
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
| Turn-scoped input-box predicate | DS-007 | AgentTurnInputBox / AgentRuntimeState | Identify/drop/fence messages belonging to interrupted turn while preserving later AgentInputBox messages. | Prevents interrupted continuations. | Generic queue storage becomes domain-aware of every message shape. |
| Working-context interruption checkpoint | DS-002, DS-003 | AgentRuntimeState / MemoryManager | Restore/suppress working context additions from interrupted turn. | Avoids incomplete user/tool/assistant fragments driving future LLM calls. | LlmTurnPhase would own memory rollback policy. |
| Provider signal mapping | DS-002 | BaseLLM/provider adapters | Translate generic signal to OpenAI/Anthropic/Gemini/Ollama/etc SDK capabilities. | Keeps provider details below BaseLLM boundary. | LlmTurnPhase would depend on provider internals. |
| Tool signal mapping | DS-003 | BaseTool/concrete tools | Translate generic signal to terminal/MCP/local tool behavior. | Keeps process/transport cancellation below tool boundary. | ToolPhase would know terminal/MCP internals. |
| Frontend status visualization | DS-005 | UI stores/components | Display interrupting/interrupted and clear sending state. | User-visible correctness. | Runtime would leak UI-specific semantics. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Runtime command boundary | `agent/runtime` | Extend | Runtime already owns start/stop/status command surface. | N/A |
| Active turn state | `agent/agent-turn.ts` + `agent/context/agent-runtime-state.ts` | Extend | Active turn already gates event-loop external input and tool batches. | N/A |
| Runtime input box boundary | `AgentInputEventQueueManager` low-level queues | Create semantic boundary under `agent/input-box` | Turn-starting message eligibility and idle scheduling need a named owner above queue storage. | Leaving this only as event queue storage makes the worker/queue look like the domain inbox and obscures why tool results belong elsewhere. |
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
| Team propagation | `agent-team/runtime` + `TeamManager` | Extend | Team runtime owns team commands; TeamManager knows managed nodes. | N/A |
| UI streaming protocol | `services/agentStreaming` | Extend/Rename | Existing channel already sends current-generation command and status messages. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent runtime control | start/stop/interrupt, active turn command, status projection | DS-001, DS-006 | AgentRuntime | Extend | Stop remains terminal. |
| Agent turn lifecycle/interruption | AbortSignal, active operation, interrupted settlement, working-context checkpoint | DS-001, DS-002, DS-003, DS-007 | AgentTurn / AgentRuntimeState | Extend | Central invariant owner. |
| Agent turn loop execution | finite per-trigger LLM/tool loop, continuation, runner-level interruption catch/settle | DS-001, DS-002, DS-003, DS-006, DS-007 | AgentTurnRunner / AgentLoopRunner | Create/Extract | Separates finite agent loop from long-lived AgentWorker mailbox. |
| Agent input box | runtime-level inbound lane, turn-starting trigger eligibility, preservation of queued external messages | CDF-002, CDF-009, DS-006, DS-007 | AgentInputBox / AgentWorker scheduler | Create semantic boundary | Sits above low-level queue storage; must not accept tool results/approvals/continuations as new-turn input. |
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
| `autobyteus-ts/src/agent/input-box/agent-input-box.ts` | Agent input box | AgentInputBox | Runtime-level inbound lane for external turn-starting triggers and queued lifecycle messages; exposes semantic enqueue/next-trigger APIs above low-level queue storage. | Makes the agent inbox a first-class owner separate from worker scheduling and event storage. | `AgentInputBoxMessage`, `AgentInputBoxTrigger` |
| `autobyteus-ts/src/agent/loop/agent-turn-runner.ts` | Agent turn loop execution | AgentTurnRunner | Finite reasoning loop around input -> LLM -> tools -> continuation -> idle/interrupted. | New owner for the per-turn agent loop formerly implicit in worker queue choreography. | `AgentTurn`, `TurnExecutionScope` |
| `autobyteus-ts/src/agent/loop/llm-turn-phase.ts` | Agent turn loop execution | LlmTurnPhase | Request assembly, context/compaction preparation, signal-aware provider streaming, stream parsing, interrupted segment finalization, and final/tool outcome return. | One phase service owns LLM-phase behavior under the runner. | `LLMInvocationOptions`, `TurnExecutionScope`, `AgentOutbox` |
| `autobyteus-ts/src/agent/loop/tool-phase.ts` | Agent turn loop execution | ToolPhase | Tool invocation preprocessing, approval coordination, signal-aware tool execution, ordered result collection, tool interruption lifecycle, and stale-result fencing. | One phase service owns tool-phase behavior under the runner. | `ToolExecutionOptions`, `AgentTurnInputBox`, `AgentOutbox` |
| `autobyteus-ts/src/agent/loop/agent-turn-input-box.ts` | Agent turn loop execution | AgentTurnInputBox | Typed per-turn lane for tool results, approvals, and same-turn continuations keyed by turn/invocation identity. | Separates turn-local messages from AgentInputBox. | `AgentTurn`, `TurnExecutionScope` |
| `autobyteus-ts/src/agent/pipelines/processor-pipeline-runner.ts` | Processor pipeline orchestration | ProcessorPipelineRunner | Shared ordered processor execution helper with domain-specific error policies supplied by callers. | Avoids duplicated sorting/validation while keeping typed domain pipelines. | Existing processor interfaces |
| `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts` | Agent input pipeline | AgentInputPipeline | Apply input processors, preserve sender-type/turn rules, build LLM user message data. | Moves current input transformation into a direct runner-callable pipeline. | `AgentInputUserMessage`, LLM input data |
| `autobyteus-ts/src/agent/pipelines/tool-invocation-pipeline.ts` | Tool invocation pipeline | ToolInvocationPipeline | Apply tool invocation preprocessors and produce execution-ready invocation. | Makes pre-execution processing reusable by `ToolPhase`. | ToolInvocation preprocessors |
| `autobyteus-ts/src/agent/pipelines/tool-result-pipeline.ts` | Tool result pipeline | ToolResultPipeline | Apply tool execution result processors and memory-ingest side effects. | Makes post-tool processing reusable before continuation building. | Tool result processors |
| `autobyteus-ts/src/agent/pipelines/llm-response-pipeline.ts` | LLM response/output pipeline | LLMResponsePipeline | Apply LLM response processors/output processors and decide final assistant emission. | Keeps final-response processing explicit after `LlmTurnPhase`. | LLM response processors |
| `autobyteus-ts/src/agent/pipelines/system-prompt-pipeline.ts` | System prompt pipeline | SystemPromptPipeline | Apply system prompt processors and return processed system prompt. | Extracts current system-prompt processor loop into lifecycle pipeline architecture. | System prompt processors |
| `autobyteus-ts/src/agent/loop/tool-result-continuation-builder.ts` | Tool continuation construction | ToolResultContinuationBuilder | Aggregate ordered tool results into SenderType.TOOL AgentInputUserMessage with ContextFiles. | Preserves current tool-continuation message contract outside queue routing. | Tool result data, `AgentInputUserMessage` |
| `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | Agent turn lifecycle | AgentRuntimeState | Request/settle active turn interruption, clear pending approvals, drop/fence same-turn work, restore/suppress checkpoint. | State already owns activeTurn/pending approvals/recent settled cache. | `AgentTurn` |
| `autobyteus-ts/src/agent/events/agent-input-event-queue-manager.ts` | Input-box queue storage | Queue manager | Generic storage/filter/drop APIs with predicates supplied by owning state/input-box APIs. | Queue owns storage only; state/input boxes own domain identity. | N/A |
| `autobyteus-ts/src/agent/outbox/agent-outbox.ts` | Agent outbox | AgentOutbox | Domain publication façade for assistant output, segments, tool lifecycle, turn/runtime lifecycle, errors, artifacts. | One outbound boundary above low-level notifier. | AgentExternalEventNotifier |
| `autobyteus-ts/src/agent/events/agent-events.ts` | Runtime events | Event model | `AgentInterruptRequestedEvent`, `AgentTurnInterruptedEvent`. | Existing event definitions file for observable lifecycle facts. | Interruption types |
| `autobyteus-ts/src/agent/status/status-enum.ts` / `status-deriver.ts` / `status-update-utils.ts` | Runtime status | Status deriver | Add interrupting state and interrupted transition metadata. | Existing status owners. | New events |
| `autobyteus-ts/src/agent/streaming/handlers/streaming-response-handler.ts` and implementations | Streaming segments | Streaming response handler | Add `interrupt(reason)` finalization path for open segments. | Existing streaming segment owner; not a turn-control owner. | Interruption metadata |
| `autobyteus-ts/src/llm/base.ts` | LLM invocation | BaseLLM | Add `LLMInvocationOptions` and pass to provider methods. | Existing authoritative LLM boundary. | AbortSignal |
| `autobyteus-ts/src/tools/base-tool.ts` | Tool execution | BaseTool | Add `ToolExecutionOptions` with signal/turn/invocation metadata. | Existing authoritative tool boundary. | AbortSignal |
| `autobyteus-ts/src/tools/terminal/terminal-session-manager.ts` | Terminal tool | Terminal manager | Signal-aware foreground command execution and close-on-abort. | Existing foreground command owner. | AbortSignal |
| `autobyteus-ts/src/tools/mcp/*` | MCP tool | MCP proxy/server | Signal-aware or locally abandoned remote call. | Existing remote tool owner. | ToolExecutionOptions |
| `autobyteus-ts/src/agent-team/runtime/agent-team-runtime.ts`, `agent-team.ts`, `context/team-manager.ts` | Team runtime control | AgentTeamRuntime / TeamManager | Team interrupt API and member propagation. | Existing team command/member owners. | Agent interrupt API |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts` | Server backend | AutoByteusAgentRunBackend | Call native `agent.interrupt`. | Existing adapter owner. | AgentInterruptResult |
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
| `autobyteus-ts/src/agent/input-box/agent-input-box.ts` | Agent input box | AgentInputBox | Own runtime-level inbound messages that may start turns, expose semantic trigger retrieval, and keep turn-local tool messages out of the runtime inbox. | Makes inbox policy explicit above queue storage. | AgentInputBoxMessage, AgentInputBoxTrigger |
| `autobyteus-ts/src/agent/loop/agent-turn-runner.ts` | Agent turn loop execution | AgentTurnRunner | Run one finite agent loop from trigger input through LLM/tool cycles to idle or interrupted settlement. | Separates turn execution from long-lived worker mailbox. | AgentTurn, TurnExecutionScope |
| `autobyteus-ts/src/agent/loop/llm-turn-phase.ts` | Agent turn loop execution | LlmTurnPhase | Run one LLM phase: request assembly, context preparation, provider streaming through scope, streaming parser integration, response/tool outcome production, interrupted finalization. | Makes the LLM phase a direct runner-owned service instead of a queued handler. | LLMInvocationOptions, AgentOutbox |
| `autobyteus-ts/src/agent/loop/tool-phase.ts` | Agent turn loop execution | ToolPhase | Run one tool phase: invocation preprocessing, approval request/wait, signal-aware execution, result collection, interrupted lifecycle, stale-result fencing. | Makes the tool phase a direct runner-owned service instead of queued request/execution/result handlers. | ToolExecutionOptions, AgentTurnInputBox, AgentOutbox |
| `autobyteus-ts/src/agent/loop/agent-turn-input-box.ts` | Agent turn loop execution | AgentTurnInputBox | Accept, collect, fence, and clear turn-local tool results/approvals/continuations. | Makes tool result input-box semantics explicit without confusing them with external triggers. | AgentTurn, invocation IDs |
| `autobyteus-ts/src/agent/pipelines/processor-pipeline-runner.ts` | Processor pipeline orchestration | ProcessorPipelineRunner | Shared helper for ordered processor execution, with typed domain pipelines choosing contracts and error behavior. | Reduces duplicated processor loops without erasing domain differences. | Existing processor interfaces |
| `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts` | Agent input pipeline | AgentInputPipeline | Shared processing of external and TOOL-continuation input into LLM-ready input data. | Prevents runner extraction from bypassing input processors. | AgentInputUserMessage, input processors |
| `autobyteus-ts/src/agent/pipelines/tool-invocation-pipeline.ts` | Tool invocation pipeline | ToolInvocationPipeline | Shared tool invocation preprocessor pipeline for `ToolPhase`. | Keeps invocation preparation out of worker and tool execution mechanics. | ToolInvocation preprocessors |
| `autobyteus-ts/src/agent/pipelines/tool-result-pipeline.ts` | Tool result pipeline | ToolResultPipeline | Shared tool result processor pipeline for `ToolPhase` before continuation building. | Keeps result processing explicit before continuation building. | Tool result processors |
| `autobyteus-ts/src/agent/pipelines/llm-response-pipeline.ts` | LLM response/output pipeline | LLMResponsePipeline | Shared LLM response/output processor pipeline and assistant-complete emission decision. | Supports existing response processors and future output processors. | LLM response processors |
| `autobyteus-ts/src/agent/pipelines/system-prompt-pipeline.ts` | System prompt pipeline | SystemPromptPipeline | Shared system prompt processor pipeline used by bootstrap. | Aligns bootstrap processors with pipeline architecture. | System prompt processors |
| `autobyteus-ts/src/agent/loop/tool-result-continuation-builder.ts` | Tool continuation construction | ToolResultContinuationBuilder | Build the same SenderType.TOOL continuation message currently produced from completed tool results. | Preserves tool-result-as-user-input semantics outside queue routing. | Tool result data, ContextFile |
| `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | Agent turn lifecycle | AgentRuntimeState | Active-turn interruption request/settlement, pending approvals cleanup, turn-local work invalidation, checkpoint restore/suppression. | Existing active state owner. | AgentTurn |
| `autobyteus-ts/src/agent/events/agent-input-event-queue-manager.ts` | Input-box queue storage | Queue manager | Generic queue filtering/clearing primitives behind input-box APIs. | Queue storage owner; no phase ownership and no message eligibility ownership. | Predicate from state/input boxes |
| `autobyteus-ts/src/agent/events/agent-events.ts` | Event model | Agent runtime events | Add interrupt requested/turn interrupted observable events. | Existing event definitions. | Interruption types |
| `autobyteus-ts/src/agent/status/status-enum.ts` | Status model | AgentStatus | Add `INTERRUPTING`; update processing helper. | Existing status enum. | N/A |
| `autobyteus-ts/src/agent/status/status-deriver.ts` | Status model | AgentStatusDeriver | Map interrupt requested -> interrupting, turn interrupted -> idle. | Existing status reducer. | New events |
| `autobyteus-ts/src/agent/runtime/agent-runtime.ts` | Runtime control | AgentRuntime | Public `interrupt()`, out-of-band signal, bounded settlement wait. | Existing runtime command owner. | Interruption result |
| `autobyteus-ts/src/agent/agent.ts` | Public facade | Agent | Delegate `interrupt()`. | Thin facade. | Interruption result |
| `autobyteus-ts/src/agent/outbox/agent-outbox.ts` | Agent outbox | AgentOutbox | Domain publication façade above notifier/event stream. | One owner for outbound domain messages. | AgentExternalEventNotifier |
| `autobyteus-ts/src/agent/streaming/*` and `events/event-types.ts` | Runtime streaming | Streaming/event pipeline | Turn/tool interrupted event types, payloads, and interrupted segment finalization. | Existing streaming surface; observation only. | TurnInterruptionData |
| `autobyteus-ts/src/llm/base.ts` or `llm/invocation-options.ts` | LLM invocation | BaseLLM | Add signal-aware invocation options. | Existing LLM boundary. | AbortSignal |
| Provider files under `autobyteus-ts/src/llm/api/` | LLM provider adapters | Provider classes | Map/catch abort for each SDK. | Each provider owns its transport. | LLMInvocationOptions |
| `autobyteus-ts/src/tools/base-tool.ts` | Tool execution | BaseTool | Add signal-aware tool options. | Existing tool boundary. | ToolExecutionOptions |
| `autobyteus-ts/src/tools/terminal/*` | Terminal tool | Terminal manager/session | Close/kill foreground sessions on signal. | Existing process lifecycle owner. | ToolExecutionOptions |
| `autobyteus-ts/src/tools/mcp/*` | MCP tool | MCP proxy/server | Pass signal where supported; local abandon otherwise. | Existing MCP owner. | ToolExecutionOptions |
| `autobyteus-ts/src/agent-team/*` | Team runtime control | AgentTeamRuntime / TeamManager | Native team interrupt API, status, propagation. | Existing team owners. | Agent interrupt API |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts` | Server native adapter | AutoByteusAgentRunBackend | Call `agent.interrupt`, map result. | Existing adapter. | AgentOperationResult |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts` | Server team adapter | AutoByteusTeamRunBackend | Call `team.interrupt`, map result. | Existing adapter. | AgentOperationResult |
| `autobyteus-server-ts/src/services/agent-streaming/*` | WebSocket command | Stream command models | Rename command handling to interrupt generation. | Existing transport owner. | ServerMessageType updates |
| `autobyteus-web/services/agentStreaming/*`, `stores/*`, `types/agent/AgentStatus.ts`, status visuals | Frontend | Streaming services/stores | Send interrupt command and render interrupting/interrupted. | Existing UI owners. | Protocol types |

## Ownership Boundaries

- Upstream callers must use `Agent.interrupt()` / `AgentRuntime.interrupt()` for native agent interruption. They must not reach into `AgentRuntimeState.activeTurn.signal` directly.
- `AgentTurnRunner` owns turn-local LLM/tool/continuation decisions. It calls `AgentInputPipeline`, `LlmTurnPhase`, `ToolPhase`, `ToolResultPipeline`, `ToolResultContinuationBuilder`, and `LLMResponsePipeline` directly.
- `LlmTurnPhase` and `ToolPhase` may use the active turn execution scope and interruption helpers. They do not own global interruption policy or runtime lifecycle.
- LLM provider adapters own SDK-specific abort mapping. Runtime, runner, and phase services must not branch on provider class names.
- Concrete tools own process/transport-specific cancellation. `ToolPhase` must not know how to kill terminal sessions or cancel MCP calls beyond invoking the `BaseTool` cancellation-aware boundary.
- `WorkerEventDispatcher` and old turn-advancing event handlers are not normal turn-control owners. Any remaining event/listener code is restricted to external input boundaries, lifecycle observation, public event surfaces, or outbox delivery.
- Server Autobyteus backends must use the native public facade. They must not call runtime internals or stop as a substitute.
- Team interrupt propagation is owned by `AgentTeamRuntime`/`TeamManager`, not by server team backend.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentRuntime.interrupt()` | Active turn runner/scope, status events, settlement wait | `Agent`, server Autobyteus backend, tests | Backend calling `agent.stop()` or mutating active turn directly | Add result/options to `interrupt()`. |
| `AgentInputBox` | Low-level queue storage, trigger eligibility, preservation of external messages while active turn runs | `AgentRuntime.submitInput`, `AgentWorker`, runtime tests | Callers pushing directly into `AgentInputEventQueueManager`, or tool results/approvals entering the runtime inbox as turn-starting messages | Add semantic enqueue/next-trigger APIs and route turn-local messages to `AgentTurnInputBox`. |
| `AgentTurnRunner` | Per-turn LLM/tool continuation loop and interruption catch/settlement | `AgentWorker`, runtime tests | Worker/event dispatcher directly owning turn-local LLM/tool loop policy, or runner bypassing input pipeline for tool continuation | Extract runner methods and call shared `AgentInputPipeline` / `ToolResultContinuationBuilder`. |
| `LlmTurnPhase` | LLM request assembly, provider streaming, streaming parser integration, interrupted segment finalization | `AgentTurnRunner` | Queued LLM-ready event handler remaining the real LLM phase owner | Move LLM phase logic into `LlmTurnPhase` and call it directly. |
| `ToolPhase` | Invocation preprocessing, approval wait, tool execution, result collection, interrupted tool lifecycle | `AgentTurnRunner` | Queued tool request/execution/result handlers remaining the real tool phase owner | Move tool phase logic into `ToolPhase` and call it directly. |
| `AgentInputPipeline` | Input processors and LLM user-message construction | `AgentTurnRunner`, bootstrap/lifecycle tests where relevant | Duplicating input-processor application in the runner or skipping it for SenderType.TOOL | Extract pipeline contract and require runner use for every LLM leg. |
| `AgentTurn.executionScope` | AbortController/signal, abort listeners, operation metadata, late-result fencing | `AgentRuntime`, `AgentTurnRunner`, `LlmTurnPhase`, `ToolPhase` | Phase services creating unrelated AbortControllers or ad-hoc race policy for the same turn | Extend TurnExecutionScope/AgentTurn methods. |
| `BaseLLM.streamMessages(..., options)` | Provider signal mapping | `LlmTurnPhase` | Phase service inspecting provider class to inject signal | Extend BaseLLM/provider contract. |
| `BaseTool.execute(..., options)` | Tool signal mapping | `ToolPhase` | Phase service checking terminal/MCP tool classes | Extend BaseTool/concrete tool contract. |
| `AgentOutbox` | Notifier/event-stream payload publication | Runner, phase services, lifecycle pipeline, processor pipelines | Direct notifier scattering from turn-control code or outbox used to advance loop | Add typed outbox messages. |
| `AgentTeamRuntime.interrupt()` | Member propagation and team status | `AgentTeam`, server team backend | Team backend calling `team.stop()` | Add team interrupt API/result. |
| Stream event pipeline | Event type conversion and WebSocket mapping | AgentOutbox/notifiers, server stream command models, frontend | UI polling runtime internals for interrupted state | Add stream events/status payload. |

## Dependency Rules

Allowed:

- `Agent` may call `AgentRuntime.interrupt()`.
- `AgentRuntime` may call `AgentRuntimeState.requestActiveTurnInterrupt(...)` and apply interruption status events.
- `AgentRuntime` may submit external turn-starting input to `AgentInputBox`; it must not push directly into low-level queue storage.
- `AgentWorker` may read eligible triggers from `AgentInputBox` and create/invoke `AgentTurnRunner` for one external trigger when no turn is active.
- `AgentInputBox` may use `AgentInputEventQueueManager` as generic storage, but owns message eligibility and semantic API.
- `AgentTurnRunner` directly calls `LlmTurnPhase`, `ToolPhase`, and typed pipeline services, and owns turn-local continuation control flow.
- `AgentTurnRunner` must use `AgentInputPipeline` for initial input and tool-continuation input before every LLM phase.
- `AgentTurnRunner` / `ToolPhase` may use `ToolResultContinuationBuilder` to preserve one tool-result message shape.
- Runner phases and pipelines should publish outbound facts through `AgentOutbox` rather than scattered direct notifier calls.
- `AgentTurnRunner`, `LlmTurnPhase`, and `ToolPhase` may use `AgentTurn.executionScope` / interruption helpers and call state settlement helpers.
- `LlmTurnPhase` may depend on the `BaseLLM` cancellation-aware API, not provider adapters.
- `ToolPhase` may depend on the `BaseTool` cancellation-aware API, not concrete tools.
- Provider adapters may depend on provider SDK-specific request options.
- Concrete tools may depend on process/MCP transport-specific cancellation.
- Server Autobyteus backends may depend on public `Agent`/`AgentTeam` interrupt APIs.

Forbidden:

- `interrupt()` must not call `stop()` for native Autobyteus runtime or team runtime.
- Worker loop must not be made multi-dispatch/concurrent to solve interruption.
- `AgentWorker` must not remain the semantic owner of the finite LLM/tool reasoning loop once the runner boundary is introduced.
- `WorkerEventDispatcher` must not dispatch the normal LLM/tool/continuation loop in the final implementation.
- Old queued phase handlers must not remain as alternate owners for normal LLM/tool/request/result flow.
- `AgentTurnRunner` must not feed raw tool results directly to the LLM or bypass `context.config.inputProcessors` for SenderType.TOOL continuations.
- Outbox messages must not be used as the mechanism that advances the internal agent loop.
- Queue manager must not hard-code domain-specific event classes; state/input-box owners should provide predicates.
- External callers must not bypass `AgentInputBox` by writing directly to `AgentInputEventQueueManager`.
- `AgentInputBox` must not accept tool results, approvals, or same-turn continuations as turn-starting input.
- LLM/tool abort must not be reported as normal provider/tool error.
- Interrupted tool result must not enqueue a tool-continuation user message.
- Provider-specific abort logic must not leak into runner or phase services.

## Implementation-Ready Component Contracts

This section narrows the target architecture into contracts the implementation should preserve. Method names are proposed shapes; exact names may vary if the responsibility remains unchanged.

### `AgentRuntime` Contract

Purpose: public runtime control plane.

Owns:

- `start()` / runtime activation;
- `stop(timeout?)` / terminal shutdown;
- `interrupt(options?)` / side-band active-turn cancellation;
- external input submission into `AgentInputBox`;
- status access and runtime context registration.

Does not own:

- LLM/tool phase control flow;
- processor pipeline execution;
- provider/tool cancellation mechanics;
- outbox payload formatting below the `AgentOutbox` boundary.

Proposed control shape:

```ts
class AgentRuntime {
  start(): void;
  stop(timeoutSeconds?: number): Promise<void>;
  interrupt(options?: AgentInterruptOptions): Promise<AgentInterruptResult>;
  submitInput(message: AgentInputBoxMessage): Promise<void>;

  get currentStatus(): AgentStatus;
  get isRunning(): boolean;
}
```

Rules:

- `interrupt()` targets only the active `AgentTurn` / `AgentTurnRunner` if present.
- `interrupt()` must not enqueue behind normal turn work.
- `interrupt()` must not run shutdown cleanup.
- `stop()` may cancel an active turn as part of terminal shutdown, but the final outcome is stopped, not interrupted/reusable.

### `AgentWorker` / `AgentInputBoxMonitor` Contract

Purpose: long-lived runtime worker and input-box monitor.

Owns:

- runtime init of event store/status deriver/input boxes;
- bootstrap lifecycle execution before turns;
- waiting for next eligible `AgentInputBox` trigger when idle;
- starting exactly one `AgentTurnRunner` for one trigger;
- awaiting runner outcome and publishing lifecycle/status facts;
- terminal shutdown orchestration.

Does not own:

- LLM/tool reasoning loop internals;
- input/tool/response processor pipelines;
- tool-result continuation construction;
- cancellation mechanics beyond delegating to runtime/turn scope.

Proposed control shape:

```ts
class AgentWorker {
  start(): void;
  stop(timeoutSeconds?: number): Promise<void>;

  private async runLifecycle(): Promise<void>;
  private async waitAndRunTurns(): Promise<void>;
  private async runOneTurn(trigger: AgentInputBoxTrigger): Promise<TurnOutcome>;
}
```

Rules:

- Bootstrap must finish successfully before `waitAndRunTurns()` starts processing turn-starting triggers.
- The worker must not start a second runner while `state.activeTurn !== null`.
- Existing internal event handlers must not remain in the final normal turn-control path; the worker should not be the semantic owner of turn-local flow.

### `AgentInputBox` Contract

Purpose: runtime-level inbound lane for messages that can exist outside a turn.

Accepts:

- user messages;
- inter-agent messages;
- system/user-facing external triggers;
- lifecycle notifications where queueing is appropriate.

Does not accept:

- tool results;
- tool approvals/denials bound to an active invocation;
- same-turn tool continuations.

Proposed shape:

```ts
type AgentInputBoxMessage =
  | ExternalUserInputMessage
  | InterAgentInputMessage
  | RuntimeLifecycleInputMessage;

class AgentInputBox {
  enqueue(message: AgentInputBoxMessage): Promise<void>;
  nextTurnTriggerWhenIdle(signal?: AbortSignal): Promise<AgentInputBoxTrigger>;
  drainOrPreserveForShutdown(): Promise<void>;
}
```

Rules:

- Messages from `AgentInputBox` may start a new `AgentTurn` only when there is no active turn.
- If a turn is active, external user/inter-agent messages remain queued/preserved.
- `AgentInputBox` should expose semantic methods rather than forcing callers to know internal queue priority.

Concrete owner/file:

- Add `autobyteus-ts/src/agent/input-box/agent-input-box.ts` as the first-class semantic runtime inbox.
- `AgentInputEventQueueManager` may remain as low-level queue storage behind this boundary, but it is not the semantic owner of message eligibility or turn-starting policy.
- `AgentWorker` consumes `AgentInputBox.nextTurnTriggerWhenIdle(...)`; callers submit external input through `AgentRuntime.submitInput(...)` / `AgentInputBox.enqueue(...)`.

### `AgentTurnInputBox` Contract

Purpose: active-turn inbound lane for messages that can only advance an existing turn.

Accepts:

- tool result messages;
- tool approval/denial messages;
- same-turn TOOL continuations;
- phase-local wakeups if needed.

Does not accept:

- messages that can start a new turn;
- messages without matching `turnId` / invocation identity.

Proposed shape:

```ts
type AgentTurnInputBoxMessage =
  | ToolResultInputMessage
  | ToolApprovalInputMessage
  | ToolContinuationInputMessage;

class AgentTurnInputBox {
  post(message: AgentTurnInputBoxMessage): Promise<PostTurnMessageResult>;
  collectToolResults(
    expectedInvocationIds: string[],
    options: { signal: AbortSignal }
  ): Promise<ToolResultEvent[]>;
  waitForApproval(invocationId: string, options: { signal: AbortSignal }): Promise<ToolApprovalDecision>;
  close(reason: 'completed' | 'interrupted' | 'failed' | 'stopped'): void;
}
```

Rules:

- Every message must be validated against the active `turnId` and expected invocation IDs.
- Post-interrupt and stale messages are dropped or recorded as ignored, never processed.
- Clearing this box on interrupt must not delete later unrelated `AgentInputBox` messages.

### `AgentTurn` Contract

Purpose: one turn's identity, state, input box, execution scope, and settlement.

Owns:

- `turnId`;
- `AgentTurnInputBox`;
- `TurnExecutionScope`;
- active tool batches;
- settlement state and idempotent completion/interruption metadata.

Does not own:

- loop execution;
- processor application;
- provider/tool logic;
- outbound publishing policy.

Proposed shape:

```ts
class AgentTurn {
  readonly turnId: string;
  readonly inputBox: AgentTurnInputBox;
  readonly executionScope: TurnExecutionScope;

  startToolInvocationBatch(invocations: ToolInvocation[]): ToolInvocationBatch;
  interrupt(reason: string): AgentInterruptResult;
  settle(outcome: TurnOutcome): TurnSettlementResult;
}
```

Rules:

- Settlement is idempotent.
- A settled turn must fence late LLM/tool/approval outcomes.
- TOOL continuations reuse this turn; they do not create another `AgentTurn`.

### `AgentTurnRunner` Contract

Purpose: finite interruptible agent loop for one active turn.

Owns:

- turn-local sequence: input pipeline -> LLM phase -> tool phase -> tool continuation -> next LLM phase;
- runner-level catch/settle handling for `AgentInterruptionError`;
- deciding completed vs interrupted vs failed turn outcome;
- coordination with `AgentTurnInputBox`, pipelines, phase services, and `AgentOutbox`.

Does not own:

- runtime lifecycle stop/shutdown;
- long-lived inbox monitoring;
- low-level provider/tool cancellation internals;
- direct notifier/WebSocket mapping.

Proposed shape:

```ts
type TurnOutcome =
  | { kind: 'completed'; turnId: string }
  | { kind: 'interrupted'; turnId: string; reason: string }
  | { kind: 'failed'; turnId: string; error: Error };

class AgentTurnRunner {
  run(trigger: AgentInputBoxTrigger): Promise<TurnOutcome>;
}
```

Loop rule:

```text
input trigger
  -> AgentInputPipeline
  -> LLM phase
  -> if final: LLMResponsePipeline/output -> complete
  -> if tool calls: ToolInvocationPipeline/tool phase
  -> ToolResultPipeline
  -> ToolResultContinuationBuilder
  -> AgentInputPipeline(SenderType.TOOL, same turn)
  -> next LLM phase
```

Interruption rule:

```text
AgentRuntime.interrupt()
  -> activeTurn.executionScope.interrupt()
  -> active phase throws/normalizes AgentInterruptionError
  -> AgentTurnRunner catches
  -> closes AgentTurnInputBox
  -> publishes interrupted outbox events
  -> settles turn interrupted
```

### `TurnExecutionScope` Contract

Purpose: mechanical cancellation and late-result fencing for one turn.

Owns:

- `AbortController` / `AbortSignal`;
- active operation metadata;
- abort callback registry;
- promise/async-iterator race helpers;
- `AgentInterruptionError` normalization;
- late-result/late-rejection logging hooks.

Does not own:

- business decisions about next LLM/tool step;
- inbox routing;
- outbox payload mapping;
- terminal runtime stop semantics.

Proposed shape:

```ts
class TurnExecutionScope {
  readonly signal: AbortSignal;

  runAbortable<T>(operation: TurnOperationMeta, run: () => Promise<T>): Promise<T>;
  iterateAbortable<T>(operation: TurnOperationMeta, iterator: AsyncIterable<T>): AsyncIterable<T>;
  onAbort(callback: () => void | Promise<void>): Disposable;
  interrupt(reason: string): AgentInterruptResult;
  fenceLateResult(operationId: string): boolean;
}
```

Rules:

- Scope interruption is cooperative where possible and locally abandoning/fencing where not possible.
- Scope must not be reused across turns.
- Stop may invoke/cascade the scope as part of shutdown, but stop outcome is terminal shutdown, not reusable interruption.

### `AgentOutbox` Contract

Purpose: outbound publication boundary above notifier/event-stream implementations.

Owns:

- mapping domain outbox messages to `AgentExternalEventNotifier` / stream payloads;
- typed outbound messages for assistant output, segments, tool lifecycle, approvals, errors, artifacts, todos, turn/runtime lifecycle;
- new interrupted outbound messages.

Does not own:

- turn control flow;
- inbox routing;
- processor execution;
- status derivation beyond publishing status facts supplied by owners.

Proposed shape:

```ts
type AgentOutboxMessage =
  | AssistantOutputMessage
  | SegmentOutboxMessage
  | ToolLifecycleOutboxMessage
  | TurnLifecycleOutboxMessage
  | RuntimeLifecycleOutboxMessage
  | ErrorOutboxMessage
  | ArtifactStateOutboxMessage;

class AgentOutbox {
  publish(message: AgentOutboxMessage): void;
}
```

Rules:

- Outbox messages publish facts/results; they do not advance the internal loop.
- New interrupt-specific outward facts should be added here first: `turn_interrupted`, `tool_execution_interrupted`, interrupted streaming segment finalization.

### Processor Pipeline Contracts

Purpose: typed orchestration of existing ordered processors.

| Pipeline | Input | Output | Current Source | Owner Rule |
| --- | --- | --- | --- | --- |
| `SystemPromptPipeline` | base prompt + tools/context | processed prompt | `SystemPromptProcessingStep` | bootstrap-owned, not turn-owned |
| `AgentInputPipeline` | external trigger / TOOL continuation + active turn context | LLM-ready input data | existing input processor + multimodal message-building path | must preserve `SenderType.TOOL` same-turn rule |
| `ToolInvocationPipeline` | parsed `ToolInvocation` | execution-ready `ToolInvocation` | existing tool invocation preprocessor loop | applies preprocessors before execution/approval |
| `ToolResultPipeline` | tool result data | processed tool result data | existing tool result processor loop | applies result processors before continuation |
| `LLMResponsePipeline` / output pipeline | `CompleteResponse` | handled/final assistant output decision | existing LLM response processor loop | supports existing response processors and future output processors |

Shared helper rule:

- A small `ProcessorPipelineRunner` may share sorting/logging/error-policy mechanics.
- Do not erase the different typed contracts of each processor family into one untyped generic processor.

## State Machines And Invariants

### Runtime State Machine

| State | Entered By | Allowed Next | Notes |
| --- | --- | --- | --- |
| `UNINITIALIZED` | construction | `BOOTSTRAPPING`, `ERROR`, `SHUTDOWN_COMPLETE` | no inbox turns allowed |
| `BOOTSTRAPPING` | `start()` lifecycle | `IDLE`, `ERROR`, `SHUTTING_DOWN` | no `AgentTurnRunner`; interrupt returns no-active/not-interruptible |
| `IDLE` | bootstrap complete or turn settled | `PROCESSING_USER_INPUT`, `SHUTTING_DOWN` | worker may start next turn trigger |
| `TURN_RUNNING` conceptual aggregate | active runner phase states | `INTERRUPTING`, `IDLE`, `ERROR`, `SHUTTING_DOWN` | projected by existing statuses such as awaiting LLM/executing tool |
| `INTERRUPTING` | reusable interrupt requested | `IDLE`, `ERROR`, `SHUTTING_DOWN` | active turn settling interrupted; runtime remains alive on success |
| `SHUTTING_DOWN` | `stop()` | `SHUTDOWN_COMPLETE`, `ERROR` | terminal cleanup path |
| `SHUTDOWN_COMPLETE` | shutdown finished | none unless explicit restart is later designed | context unregistered |
| `ERROR` | fatal bootstrap/worker/runtime error | `SHUTTING_DOWN` or explicit recovery if supported | do not silently start turns |

### Turn State Machine

| State | Entered By | Allowed Next | Owner |
| --- | --- | --- | --- |
| `CREATED` | `AgentRuntimeState.startActiveTurn` | `INPUT_PROCESSING`, `INTERRUPTING`, `FAILED` | runtime state/runner |
| `INPUT_PROCESSING` | initial trigger or TOOL continuation | `AWAITING_LLM`, `INTERRUPTING`, `FAILED` | `AgentInputPipeline` |
| `AWAITING_LLM` | LLM phase started | `ANALYZING_LLM`, `INTERRUPTING`, `FAILED` | LLM phase + scope |
| `ANALYZING_LLM` | LLM stream complete | `OUTPUT_PROCESSING`, `TOOL_BATCH_ACTIVE`, `INTERRUPTING`, `FAILED` | runner / streaming parser |
| `TOOL_BATCH_ACTIVE` | tool invocations parsed | `AWAITING_TOOL_APPROVAL`, `EXECUTING_TOOLS`, `TOOL_RESULTS_PROCESSING`, `INTERRUPTING`, `FAILED` | tool phase |
| `AWAITING_TOOL_APPROVAL` | approval required | `EXECUTING_TOOLS`, `TOOL_RESULTS_PROCESSING`, `INTERRUPTING`, `FAILED` | turn input box/tool phase |
| `EXECUTING_TOOLS` | tool execution started | `TOOL_RESULTS_PROCESSING`, `INTERRUPTING`, `FAILED` | tool phase + scope |
| `TOOL_RESULTS_PROCESSING` | ordered results collected | `INPUT_PROCESSING`, `INTERRUPTING`, `FAILED` | tool result pipeline + continuation builder |
| `OUTPUT_PROCESSING` | final response no tools | `COMPLETED`, `INTERRUPTING`, `FAILED` | response/output pipeline |
| `INTERRUPTING` | scope interrupted | `INTERRUPTED`, `SHUTDOWN_CANCELLED`, `FAILED` | runner/scope |
| `COMPLETED` | final output emitted | terminal | runner/state |
| `INTERRUPTED` | reusable interrupt settled | terminal | runner/state |
| `SHUTDOWN_CANCELLED` | stop cancelled work | terminal under shutdown | runtime lifecycle |
| `FAILED` | unrecoverable turn error | terminal or runtime error projection | runner/state |

### Tool Batch State Machine

| State | Meaning | Transition Rule |
| --- | --- | --- |
| `CREATED` | LLM parsed expected invocations | all invocation IDs are bound to active turn |
| `PENDING_APPROVAL` | one or more invocations await approval | approval messages must match invocation/turn |
| `EXECUTING` | one or more tools running | each execution receives `ToolExecutionOptions.signal` |
| `COLLECTING_RESULTS` | results arriving in `AgentTurnInputBox` | collect only expected IDs |
| `READY_FOR_CONTINUATION` | ordered results complete | feed `ToolResultPipeline` then continuation builder |
| `INTERRUPTED` | active turn interrupted | mark expected IDs recently settled/fenced |
| `SETTLED` | continuation queued/processed or turn done | duplicate/late results ignored |

### Invariants

| ID | Invariant | Enforcement Owner |
| --- | --- | --- |
| INV-001 | At most one active `AgentTurn` per runtime. | `AgentWorker` + `AgentRuntimeState` |
| INV-002 | `AgentInputBox` messages may start a turn only when no turn is active. | `AgentInputBox` / `AgentWorker` |
| INV-002A | `AgentInputBox` must not accept tool results, approvals, denials, or same-turn continuations. | `AgentInputBox` |
| INV-003 | `AgentTurnInputBox` messages must match active `turnId` and expected invocation identity. | `AgentTurnInputBox` |
| INV-004 | `SenderType.TOOL` input never starts a new turn. | `AgentInputPipeline` |
| INV-005 | Tool results must pass through `ToolResultPipeline` and `AgentInputPipeline` before next LLM. | `AgentTurnRunner` |
| INV-006 | `interrupt()` is side-band and must not be blocked behind normal inbox work. | `AgentRuntime` |
| INV-007 | Normal interrupt never runs shutdown cleanup. | `AgentRuntime` / lifecycle tests |
| INV-008 | Stop always remains terminal and runs shutdown cleanup exactly once. | `AgentRuntime` / `AgentWorker` |
| INV-009 | Outbox publication is observation/output only, not internal control flow. | `AgentOutbox` / runner |
| INV-010 | Bootstrap must complete before any external trigger starts a turn. | `AgentWorker` lifecycle |
| INV-011 | Turn settlement is idempotent and fences late results. | `AgentTurn` / `TurnExecutionScope` |
| INV-012 | Provider/tool-specific cancellation stays below `BaseLLM` / `BaseTool`. | provider/tool adapters |

## Message Routing Rules

| Incoming Item | Destination | Can Start Turn? | Required Identity | Invalid/Stale Handling |
| --- | --- | --- | --- | --- |
| External user message | `AgentInputBox` | Yes, if idle | none or client message ID | queue until idle; reject only if runtime stopped |
| Inter-agent message | `AgentInputBox` | Yes, if idle | sender metadata | queue until idle; reject only if runtime stopped |
| System/user-facing trigger | `AgentInputBox` or runtime lifecycle lane depending type | Maybe | explicit type | route by type; do not overload as TOOL continuation |
| TOOL continuation message | `AgentTurnInputBox` via continuation builder/pipeline | No | active `turnId` | reject if no active turn |
| Tool result | `AgentTurnInputBox` | No | `turnId`, `invocationId` | drop/fence if unknown, stale, interrupted, or mismatched |
| Tool approval/denial | `AgentTurnInputBox` | No | `turnId` if available, `invocationId` | ignore/reject if no matching pending invocation |
| Bootstrap lifecycle event | lifecycle lane/outbox notification | No | runtime ID | no active turn created |
| Shutdown request / stop | runtime control/lifecycle | No | runtime ID | terminal; blocks new turn starts |
| Interrupt request | side-band `AgentRuntime.interrupt()` | No | optional `turnId` | no-active result if no active turn; stale-turn result if mismatch |
| Low-level queued storage entry | behind `AgentInputBox` / `AgentTurnInputBox` only | No by itself | storage metadata plus owning-box predicate | queue manager does not decide domain routing |
| Assistant output | `AgentOutbox` | No | `turnId` | publish only; never enqueue as turn input |
| Segment/tool lifecycle/status output | `AgentOutbox` | No | `turnId`/invocation if applicable | publish only; never enqueue as turn input |

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
| `InterAgentMessageEventHandler` | Handles inter-agent input. | Removed from turn flow; replaced by `AgentInputBox` external trigger routing. | Inter-agent messages enter `AgentInputBox` and are processed by the same scheduler/runner path as user triggers. |
| `LLMUserMessageReadyEventHandler` | Owns request assembly, streaming, parsing, tool-intent enqueue. | Removed from normal turn flow. | `LlmTurnPhase` called by `AgentTurnRunner` owns LLM phase; no queued `LLMUserMessageReadyEvent` is needed for normal runner flow. |
| `LLMCompleteResponseReceivedEventHandler` | Applies response processors and emits final assistant response. | Removed from normal turn flow. | `LLMResponsePipeline` / output pipeline called by runner owns response processing. |
| `ToolInvocationRequestEventHandler` | Handles pending tool invocation/approval flow. | Removed from normal turn flow. | Runner tool phase owns approval request and awaits `AgentTurnInputBox` approval messages. |
| `ToolExecutionApprovalEventHandler` | Handles approval/denial events. | Replaced by `AgentTurnInputBox` message routing. | External approval/denial is posted to active `AgentTurnInputBox`; no tool execution logic remains in a handler. |
| `ToolInvocationExecutionEventHandler` | Applies preprocessors, executes tool, enqueues tool result. | Removed from normal turn flow. | `ToolInvocationPipeline` + tool execution phase called by runner owns execution. |
| `ToolResultEventHandler` | Applies result processors, emits lifecycle, aggregates continuation, enqueues TOOL input. | Removed from normal turn flow. | `ToolResultPipeline` + `ToolResultContinuationBuilder` + `AgentInputPipeline` called by runner own continuation. |
| `LifecycleEventLogger` / generic lifecycle listeners | Logs/projects lifecycle facts. | May remain as observers. | Observation only; no turn advancement. |
| `WorkerEventDispatcher` | Dispatches every event and indirectly advances the loop. | Removed from normal turn flow; may remain only for non-turn lifecycle observation if still useful. | Must not dispatch normal LLM/tool/continuation loop. |
| `AgentExternalEventNotifier` listeners / EventEmitter | Low-level outbound delivery. | Remain low-level sinks behind `AgentOutbox`. | Runner/pipelines publish through `AgentOutbox`; low-level listeners only deliver outbound facts. |

### Clean-Cut Target Flow

Final target:

```text
AgentInputBox trigger
  -> AgentWorker starts AgentTurnRunner
  -> AgentTurnRunner calls AgentInputPipeline
  -> AgentTurnRunner calls LlmTurnPhase
  -> AgentTurnRunner calls ToolPhase if needed
  -> ToolPhase uses AgentTurnInputBox for approvals/results
  -> AgentTurnRunner calls ToolResultPipeline + ToolResultContinuationBuilder
  -> AgentTurnRunner calls AgentInputPipeline(SenderType.TOOL)
  -> AgentTurnRunner loops or completes
  -> AgentOutbox publishes facts/results
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
- `AgentInputPipeline` used directly by worker/runner input flow;
- `ToolInvocationPipeline` used directly by runner tool phase;
- `ToolResultPipeline` used directly by runner tool-result processing;
- `LLMResponsePipeline` used directly by runner output phase;
- `ToolResultContinuationBuilder` used directly by runner continuation flow.

Safety gate: processor ordering/error behavior is preserved; old handlers no longer own these transformations in the normal turn path.

### Work Package 2 — AgentInputBox / AgentTurnInputBox / AgentOutbox

Goal: establish explicit inbound/outbound boxes.

Required final components:

- `AgentInputBox` for external turn-starting triggers, implemented as the semantic owner in `agent/input-box/agent-input-box.ts`;
- `AgentTurnInputBox` for active-turn tool results, approvals, continuations;
- `AgentOutbox` for assistant output, streaming segments, tool lifecycle, errors, lifecycle facts, artifacts/state updates.

Safety gate:

- tool results/approvals cannot enter as turn-starting messages;
- stale turn-local messages are rejected/fenced;
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

- `AgentTurn` owns `turnId`, `AgentTurnInputBox`, `TurnExecutionScope`, tool batches, settlement;
- `TurnExecutionScope` owns abort signal, abort listeners, abortable promise/iterator helpers, late-result fencing;
- late LLM/tool/approval results cannot revive a settled turn.

Safety gate: idempotent interrupt/settlement and late-result fencing tests pass.

### Work Package 5 — AgentTurnRunner And Phase Services

Goal: make the finite agent loop explicit.

Required final flow:

```text
AgentWorker -> AgentTurnRunner.run(trigger)
AgentTurnRunner -> AgentInputPipeline
AgentTurnRunner -> LlmTurnPhase
AgentTurnRunner -> ToolPhase
AgentTurnRunner -> ToolResultPipeline + ToolResultContinuationBuilder
AgentTurnRunner -> AgentInputPipeline(SenderType.TOOL)
AgentTurnRunner -> LLMResponsePipeline / completion
```

Safety gate:

- normal LLM/tool/continuation flow does not depend on `WorkerEventDispatcher` dispatching old handlers;
- only one active turn can run;
- tool continuation still reuses the same turn and still applies input processors.

### Work Package 6 — Native Interrupt Semantics

Goal: implement requested interrupt behavior through the final architecture.

Required final behavior:

- `AgentRuntime.interrupt()` is side-band and targets active turn runner/scope;
- LLM stream interruption aborts or abandons provider stream and suppresses assistant ingestion;
- tool execution interruption aborts or abandons tool execution and suppresses continuation;
- pending approval interruption clears/fences active approval state;
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
| `AgentInputBox.enqueue(message): Promise<void>` / `nextTurnTriggerWhenIdle(...)` | Runtime inbound messages | Accept external turn-starting messages and expose one eligible trigger to the worker. | Message kind plus optional client message ID / sender metadata. | Semantic inbox boundary above queue storage. |
| `AgentTurn.interrupt(reason)` | Active turn | Idempotently abort signal and record metadata. | Current turn ID only. | Internal to runtime/state/runner. |
| `BaseLLM.streamMessages(messages, renderedPayload, kwargs, options?)` | LLM invocation | Stream with optional cancellation. | `LLMInvocationOptions.signal`, `turnId`. | `kwargs` remains provider params. |
| `BaseTool.execute(context, args, options?)` | Tool execution | Execute with optional cancellation. | `ToolExecutionOptions.signal`, `turnId`, `invocationId`. | Existing tools may ignore signal; `ToolPhase` still runs through `TurnExecutionScope` late-result fencing. |
| `AgentTeam.interrupt(options?)` | Native team runtime | Public team cancel-current-work command. | Reason/timeout; no member selector for this requirement. | Interrupts all running cached nodes. |
| `AgentTeamRuntime.interrupt(options?)` | Team runtime control | Propagate to member nodes and update team status. | Reason/timeout. | Does not shutdown. |
| `AgentRunBackend.interrupt(turnId?)` | Cross-runtime server run | Runtime-kind interrupt command. | Optional platform turn ID. | Existing interface retained. |
| WebSocket `INTERRUPT_GENERATION` | Client command | Interrupt active generation for run/team. | Optional `turn_id` payload if available. | Replaces app-owned `STOP_GENERATION` name. |

Rule: do not overload `stop(timeout?)` with interrupt options. Stop remains terminal and takes only shutdown timeout.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentRuntime.interrupt` | Yes | Yes | Low | Optional turnId must match active turn or return stale/no-active result. |
| `AgentInputBox` | Yes | Yes | Low | Message kind must distinguish turn-starting external input from turn-local tool/approval/continuation input. |
| `BaseLLM.streamMessages` | Yes | Yes | Low | Keep provider kwargs separate from invocation options. |
| `BaseTool.execute` | Yes | Yes | Low | Options are execution metadata, not tool arguments. |
| WebSocket interrupt command | Yes | Yes | Low | Payload uses `turn_id`, not generic ID. |
| Team interrupt | Yes | Mostly | Medium | Initial scope interrupts all running cached nodes; future per-member interrupt should add explicit member identity, not overload this method. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Runtime cancellation command | `interrupt` | Yes | Low | Use consistently in native/server code. |
| Runtime inbox | `AgentInputBox` | Yes | Low | Use this name for turn-starting inbound messages; do not call the low-level queue manager the inbox owner. |
| Terminal runtime shutdown | `stop` | Yes | Low | Keep only for terminal shutdown. |
| Client command | `INTERRUPT_GENERATION` | Yes | Low | Replace `STOP_GENERATION` in app-owned protocol. |
| Active cancellation object | `AgentTurn` signal/interruption | Yes | Low | Avoid separate generic cancellation manager unless needed. |
| Status | `interrupting` | Yes | Low | No terminal `interrupted` agent status; final status is idle with turn interrupted event. |

## Applied Patterns (If Any)

- State machine inside `AgentTurn`: active, interrupting, interrupted/settled. This is bounded inside the turn owner.
- Adapter pattern at LLM providers and tools: BaseLLM/BaseTool accept generic signal options; providers/tools translate to SDK/process/MCP mechanisms.
- Event loop pattern remains inside `AgentWorker`; interruption does not turn worker into a concurrent dispatcher.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/input-box/` | Folder | Agent input box | Runtime-level inbound box and message/trigger types for work that can exist outside an active turn. | Names the agent inbox separately from event storage and turn-local input. | LLM/tool phase execution or turn-local tool result collection. |
| `autobyteus-ts/src/agent/input-box/agent-input-box.ts` | File | AgentInputBox | Semantic enqueue and next-turn-trigger APIs over low-level queue storage. | Single owner of turn-starting message eligibility and preservation while a turn is active. | Tool result/approval/continuation handling or phase control flow. |
| `autobyteus-ts/src/agent/loop/` | Folder | Agent turn loop execution | Finite per-turn runner, direct phase services, turn-local input box, and continuation builders. | Makes the agent loop start/end boundary explicit. | Long-lived worker stop/shutdown policy or provider-specific cancellation. |
| `autobyteus-ts/src/agent/loop/agent-turn-runner.ts` | File | AgentTurnRunner | Runs one agent turn loop to final/interrupted settlement. | One concrete runner owner for finite loop semantics. | Transport protocol or terminal shutdown code. |
| `autobyteus-ts/src/agent/loop/llm-turn-phase.ts` | File | LlmTurnPhase | Runs the LLM phase under `TurnExecutionScope`. | Direct phase owner replaces queued LLM-ready handler control flow. | Tool execution, worker scheduling, provider-specific SDK branching. |
| `autobyteus-ts/src/agent/loop/tool-phase.ts` | File | ToolPhase | Runs approval/execution/result collection under `TurnExecutionScope`. | Direct phase owner replaces queued tool request/execution/result handler control flow. | Provider/terminal process internals or worker scheduling. |
| `autobyteus-ts/src/agent/loop/agent-turn-input-box.ts` | File | AgentTurnInputBox | Typed input box lane for active-turn messages: tool results, approvals, continuations. | Prevents AgentInputBox and turn-local messages from being conflated. | New-turn scheduling or lifecycle events. |
| `autobyteus-ts/src/agent/loop/tool-result-continuation-builder.ts` | File | ToolResultContinuationBuilder | Builds SenderType.TOOL continuation input from settled tool results. | Preserves current tool-result message shape for direct runner reuse. | Input processor execution or LLM calls. |
| `autobyteus-ts/src/agent/pipelines/` | Folder | Agent processor pipelines | Shared orchestration for input, tool invocation, tool result, LLM response/output, and optional common pipeline runner. | Keeps processor orchestration explicit without moving concrete processors out of their existing folders. | Worker scheduling, turn-loop ownership, or provider execution. |
| `autobyteus-ts/src/agent/pipelines/processor-pipeline-runner.ts` | File | ProcessorPipelineRunner | Common ordered execution helper for typed pipeline services. | Shared mechanics only; domain pipelines own contracts. | Generic untyped processor semantics or turn control flow. |
| `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts` | File | AgentInputPipeline | Applies input processors and builds LLM-ready input for external/tool input. | Single owner of the current input transformation contract. | Tool result aggregation. |
| `autobyteus-ts/src/agent/pipelines/tool-invocation-pipeline.ts` | File | ToolInvocationPipeline | Applies tool invocation preprocessors. | Single owner of invocation pre-execute processing. | Tool execution or approval UI transport. |
| `autobyteus-ts/src/agent/pipelines/tool-result-pipeline.ts` | File | ToolResultPipeline | Applies tool execution result processors. | Single owner of post-tool processing before continuation. | Continuation message formatting. |
| `autobyteus-ts/src/agent/pipelines/llm-response-pipeline.ts` | File | LLMResponsePipeline | Applies LLM response/output processors and final assistant emission policy. | Single owner of response processor orchestration. | LLM streaming/provider code. |
| `autobyteus-ts/src/agent/pipelines/system-prompt-pipeline.ts` | File | SystemPromptPipeline | Applies system prompt processors for bootstrap. | Single owner of system prompt processor orchestration. | Runtime init or turn execution. |
| `autobyteus-ts/src/agent/outbox/` | Folder | Agent outbox | Outbound domain message publication façade and typed payloads if needed. | Complements input-box lanes and reduces direct notifier scattering. | Turn control flow or provider execution. |
| `autobyteus-ts/src/agent/outbox/agent-outbox.ts` | File | AgentOutbox | Publish assistant/tool/segment/lifecycle/error/artifact messages to existing notifier/streams. | Single outbound publication boundary. | Input box scheduling or state mutation. |
| `autobyteus-ts/src/agent/interruption/` | Folder | Agent interruption support | Small concrete support area for interruption types/utilities. | Shared by runtime, turn state, phase services, tests. | Runtime lifecycle ownership or provider-specific cancellation. |
| `autobyteus-ts/src/agent/interruption/agent-interruption.ts` | File | Interruption model | Options/result/error/guards. | One semantic data shape. | Stop/terminate semantics. |
| `autobyteus-ts/src/agent/interruption/abortable-operation.ts` | File | Abortable operation utility | Promise/iterator abort racing and late-result logging. | Reused by `TurnExecutionScope`, `LlmTurnPhase`, and `ToolPhase`. | Provider/tool-specific behavior. |
| `autobyteus-ts/src/agent/agent-turn.ts` | File | AgentTurn | Turn signal, operation, settlement, batch. | Existing active turn owner. | Queue storage or runtime status emission. |
| `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | File | AgentRuntimeState | Active turn state mutation, turn-local work cleanup/fencing, pending approval cleanup, checkpoint restore. | Existing state owner. | Public runtime command API. |
| `autobyteus-ts/src/agent/runtime/agent-runtime.ts` | File | AgentRuntime | `interrupt()` authoritative command and status projection. | Existing lifecycle command owner. | Provider/tool-specific abort. |
| `autobyteus-ts/src/agent/events/` | Folder | Event model and low-level input-box storage | Observable lifecycle event definitions and generic queue storage/filtering behind input-box APIs. | Events remain for external/lifecycle/observation; queues remain storage only. | Normal LLM/tool/continuation turn control. |
| `autobyteus-ts/src/agent/streaming/` | Folder | Streaming/event publication | Segment and stream payload handling behind `AgentOutbox`. | Streaming is an outbox sink/segment concern. | Turn-loop advancement. |
| `autobyteus-ts/src/llm/` / `src/llm/api/` | Folder/files | LLM boundary | Signal-aware invocation API and provider mapping. | Existing provider subsystem. | Agent turn cleanup. |
| `autobyteus-ts/src/tools/` | Folder/files | Tool boundary | Signal-aware execution API and concrete cancellation. | Existing tool subsystem. | Runtime status policy. |
| `autobyteus-ts/src/agent-team/runtime/agent-team-runtime.ts` | File | Team runtime | Native team interrupt command. | Existing team lifecycle owner. | Member lookup internals beyond TeamManager call. |
| `autobyteus-ts/src/agent-team/context/team-manager.ts` | File | TeamManager | Interrupt running cached nodes. | Existing member registry owner. | Team status derivation. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/` | Folder | Server native backend | Adapt server interrupt to native agent interrupt. | Existing runtime-kind adapter. | Stop fallback. |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/` | Folder | Server native team backend | Adapt server team interrupt to native team interrupt. | Existing team backend adapter. | Team shutdown fallback. |
| `autobyteus-web/services/agentStreaming/` | Folder | Frontend streaming protocol | Send interrupt command and handle interrupted lifecycle. | Existing streaming service. | Runtime logic. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent/input-box` | Main-Line Domain-Control | Yes | Low | Runtime-level inbox boundary for turn-starting triggers; stays separate from low-level queue storage and active-turn tool-result input. |
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
- Add `turn_id` to turn-local messages so `AgentTurnInputBox` fencing can drop stale work without dropping later real user messages.
- Provider adapters should normalize native abort errors into `AgentInterruptionError` or allow the `TurnExecutionScope` / abortable-operation utility to do so; do not emit normal LLM errors for user interrupts.
- Server backend tests should explicitly assert `stop` is not called by `interrupt`.
- Frontend tests should assert the interrupt command is sent and `isSending` clears only on interrupted/idle stream feedback, not optimistically at button click.
