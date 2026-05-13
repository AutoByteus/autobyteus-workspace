# Agent Runtime Loop and Native Interrupt

**Status:** Active  
**Date:** 2026-05-05

## Purpose

This document is the canonical runtime-loop overview for the TypeScript
AutoByteus single-agent runtime after the native interrupt redesign.

The important ownership rule is:

- `AgentWorker` owns runtime lifecycle, bootstrap, shutdown, and selecting the
  next external turn trigger from the mailbox.
- `AgentTurnRunner` owns the finite LLM/tool/continuation loop for one
  `AgentTurn`.
- `AgentRuntime.interrupt()` is side-band control for the active turn. It is
  not a queued user event and it is not a synonym for `stop()`.

## Runtime Lifecycle

1. `AgentRuntime.start()` starts `AgentWorker`.
2. `AgentWorker` performs runtime init:
   - `AgentEventStore`
   - `AgentStatusDeriver`
   - `AgentMessageInbox`
   - `AgentMessageScheduler`
3. `AgentWorker` runs direct bootstrap through `AgentBootstrapper.run(context)`.
4. `SystemPromptPipeline` applies system-prompt processors during bootstrap.
5. `AgentReadyEvent` moves the runtime to the ready/idle state.
6. The worker loop waits for the next scheduler event.

Bootstrap and shutdown are lifecycle work. They are not part of an agent turn,
and normal generation interrupt does not run shutdown cleanup.

## Turn Scheduling

External user and inter-agent inputs enter the runtime through
`AgentRuntime.submitEvent(...)` and are queued in the `turn_start` lane of
`AgentMessageInbox`.
When the worker selects a `UserMessageReceivedEvent` or
`InterAgentMessageReceivedEvent`, it:

1. creates an `AgentTurn` through `AgentRuntimeState.startActiveTurn()`;
2. creates a working-context checkpoint for that `turnId`;
3. runs `new AgentTurnRunner(context, turn).run(trigger)`;
4. clears the active turn in a `finally` block;
5. emits `AgentIdleEvent` after a completed turn.

Only one active turn is allowed per runtime.

`AgentMessageInbox` is the runtime mailbox. It has three lanes:

- `turn_start` for external user messages (`UserMessageReceivedEvent`) and
  inter-agent messages (`InterAgentMessageReceivedEvent`);
- `active_turn` for awaitable active-turn controls such as tool approvals and
  external tool results;
- `runtime_lifecycle` for runtime lifecycle events (`LifecycleEvent`).

`AgentMessageScheduler` dispatches `turn_start` messages only while the runtime
is idle. While a turn is active, it dispatches lifecycle messages and
`active_turn` controls so the active turn can be interrupted, approved, or fed
external tool results without starting another turn.

`AgentRuntime.submitEvent(...)` rejects unsupported operational events instead
of hiding them in the lifecycle queue. Tool approval decisions are not
turn-starting runtime input: callers must use
`Agent.postToolExecutionApproval(...)`, which delegates to
`AgentRuntime.postToolApproval(...)`, an awaitable active-turn inbox message,
`ToolApprovalMessageHandler`, and
`AgentRuntimeState.postToolApprovalToActiveTurn(...)` before waking the active
turn's `TurnToolInputPort.postApproval(...)`. If there is no active turn, no
pending invocation, a stale turn id, or an interrupted turn, the runtime returns
an explicit non-turn-starting rejection result.

External tool results use the same active-turn boundary through
`AgentRuntime.postToolResult(...)`, `ToolResultMessageHandler`, and
`AgentRuntimeState.postToolResultToActiveTurn(...)` before waking
`TurnToolInputPort.postToolResult(...)`. Same-turn TOOL continuations remain
inside `AgentTurnRunner`/`ToolPhase`/`ToolResultContinuationBuilder` and must not
enter the runtime mailbox as `SenderType.TOOL` user input.

## Turn Execution Ownership

`AgentTurnRunner` is the only normal owner of the LLM/tool reasoning loop. It
uses these collaborators:

- `AgentInputPipeline`
  - converts external user/inter-agent triggers into an `LLMUserMessage`;
  - runs configured input processors;
  - preserves inter-agent metadata such as `sender_agent_id`,
    `original_message_type`, and `reference_files`;
  - adds exactly one generated `Reference files:` block to recipient-visible
    inter-agent input when structured `reference_files` are present.
- `LlmPhase`
  - assembles memory-backed LLM requests;
  - passes `{ signal, turnId }` into `BaseLLM.streamMessages(...)`;
  - publishes streamed segment facts through `AgentExternalEventNotifier`;
  - parses text/API tool calls through the streaming response handler factory;
  - checks the `TurnExecutionScope` before starting or consuming LLM streams
    and again after awaited LLM seams before publishing normal assistant
    completion side effects;
  - on non-interrupt LLM stream errors, failed-terminalizes any active text,
    tool, write/edit, or reasoning segments before publishing the runtime error.
- `ToolPhase`
  - runs tool invocations under the active `TurnExecutionScope`;
  - calls `BaseTool.prepareExecution(...)` before publishing started lifecycle
    or registering an external-result waiter, so agent-id setup, argument
    coercion/schema/type validation, abort checks, and mode resolution fail
    before the tool is announced as pending or started;
  - passes cancellation context into tools that support it;
  - waits for approval through `TurnToolInputPort` when needed, with
    `ToolPhase.waitForApproval(...)` as the only consumer of active-turn
    approval messages;
  - waits for external tool results through `TurnToolInputPort` only for
    prepared invocations that resolved to external-result mode;
  - checks for accepted interrupts after awaited tool seams before publishing
    tool terminal success, tool results, or continuation input.
- `ToolResultPipeline`
  - applies configured tool-result processors to the direct results returned by
    `ToolPhase`; direct tool results are not posted back through the runtime
    mailbox.
- `ToolResultContinuationBuilder`
  - builds the same-turn `SenderType.TOOL` continuation input for legacy
    text-parser modes;
  - marks native `api_tool_call` continuations as `tool_history_only`, causing
    `AgentTurnRunner` to emit `ToolContinuationReadyEvent` and `LlmPhase` to
    call `LLMRequestAssembler.prepareToolContinuationRequest(...)` without
    appending a synthetic provider-visible user message.
- `LLMResponsePipeline`
  - applies final response processors and publishes assistant output.
- `AgentExternalEventNotifier`
  - centralizes semantic external-observable runtime publication such as
    status, turn, segment, tool lifecycle/log, inter-agent, system-task, and
    assistant-output events.

The old single-agent `WorkerEventDispatcher` and normal-flow handler files are
removed. Do not reintroduce them as parallel control-flow owners for LLM calls,
tool execution, tool results, or inter-agent message ingestion.

## Tool Approval Spine

Pending tool approvals are part of the active turn boundary, not the runtime
lifecycle mailbox. The native single-agent path is:

1. external API/UI/CLI calls `Agent.postToolExecutionApproval(...)`;
2. `AgentRuntime.postToolApproval(...)` checks runtime liveness and posts an
   awaitable active-turn inbox message;
3. `ToolApprovalMessageHandler` delegates to
   `AgentRuntimeState.postToolApprovalToActiveTurn(...)`;
4. runtime state verifies the active turn, turn id, pending-approval marker,
   and interruption state before calling `TurnToolInputPort.postApproval(...)`;
5. `ToolPhase.waitForApproval(...)` consumes the posted decision and continues
   or denies the pending invocation.

`ToolExecutionApprovalEvent` is still published for status/projection after a
valid approval decision, but it is not accepted by `AgentRuntime.submitEvent(...)`
or `AgentMessageInbox` as runtime lifecycle input. Stale, no-active-turn,
no-pending-invocation, runtime-stopped, and interrupted-turn approval attempts
must not start a turn, restore a turn, or enqueue lifecycle work.

Active tool-batch membership is not approval authority. Only invocations stored
in `AgentRuntimeState.pendingToolApprovals` are approvable; attempts to approve
auto-executing or otherwise active-but-not-pending invocations return
`no_pending_invocation` and must not mutate status.

Team approval commands follow the same boundary by resolving the target member
and calling that member agent's public `postToolExecutionApproval(...)` API via
the team event handler. Team code must not bypass member runtime state or post
approval events directly into a member mailbox.

## External Tool Result Spine

External-result tools are also active-turn controls. The native path is:

1. external API or integration calls `Agent.postToolResult(...)`;
2. `AgentRuntime.postToolResult(...)` checks runtime liveness and posts an
   awaitable active-turn inbox message;
3. `ToolResultMessageHandler` delegates to
   `AgentRuntimeState.postToolResultToActiveTurn(...)`;
4. runtime state verifies an active turn and forwards the result to
   `TurnToolInputPort.postToolResult(...)`;
5. `ToolPhase.waitForToolResult(...)` consumes the result for a prepared
   external-result invocation and rejoins the same turn's continuation flow.

Unknown invocation ids, duplicate or late results, turn mismatch, no active
waiter, closed/interrupted ports, and runtime-stopped submissions return
explicit rejection results. They must not publish started/pending lifecycle,
run the tool implementation, or revive a terminal turn.

## Interrupt Fences At Awaited Seams

Accepted interrupts can arrive while a turn is suspended at an awaited seam.
Every owner that resumes from such a seam must check the `TurnExecutionScope`
before performing normal side effects:

- `TurnExecutionScope.runAbortable(...)` checks for an already-aborted turn
  before invoking the thunk.
- `TurnExecutionScope.iterateAbortable(...)` and the underlying
  `iterateWithAbort(...)` check before acquiring an iterator and before each
  next-item request.
- `AgentTurnRunner` fences after external input processing, after LLM phase,
  before and after final response processing, after tool phase, before and
  after terminal tool lifecycle, after continuation processing, and before
  continuation status publication.
- `LlmPhase` fences before stream start/iteration/finalization and before
  publishing normal LLM-derived assistant response side effects.
- `ToolPhase` fences before tool execution, after awaited execution, and before
  terminal success/result publication.

These fences prevent a late accepted interrupt from being followed by normal
assistant completion, memory updates, tool terminal success, tool-result
processing, or same-turn continuation publication for the interrupted turn.

## Native Interrupt Semantics

`Agent.interrupt(...)` delegates to `AgentRuntime.interrupt(...)`.

When an active turn exists:

1. the runtime publishes/derives interrupt-request state;
2. `AgentRuntimeState.interruptActiveTurn(...)` interrupts the active
   `AgentTurn`;
3. `AgentTurn.interrupt(...)` aborts the `TurnExecutionScope` and closes the
   `TurnToolInputPort`;
4. pending approvals and external-result waiters for the turn are cleared and
   expected invocation ids are fenced as recently settled;
5. active LLM streams, tool executions, terminal foreground commands, and MCP
   calls receive or observe the abort signal where supported;
6. `AgentTurnRunner` catches the interruption, restores the working-context
   checkpoint for the interrupted turn, publishes `TURN_INTERRUPTED`, applies
   `AgentTurnInterruptedEvent`, and settles the turn as `interrupted`;
7. the worker keeps running and can accept a later follow-up turn.

When no active turn exists, `interrupt(...)` returns `no_active_turn` and does
not start or stop the runtime.

`stop(...)` remains terminal runtime shutdown. If a stop happens during an
active turn, it interrupts the turn with a runtime-stop reason and then runs the
shutdown orchestrator. The worker sets its stop flag before enqueuing the
terminal lifecycle notification and checks that flag again after waking from
the mailbox, so already-queued user/inter-agent turn triggers are not started
after terminal stop/shutdown begins. User generation interrupt must not run
shutdown cleanup.

## Working Context and Stale Results

The runtime creates a working-context checkpoint at turn start. If the turn is
interrupted, the checkpoint is restored so interrupted partial user, tool, or
assistant fragments do not leak into the next LLM request. Raw trace files may
still keep audit/history records; the restored working-context snapshot is the
prompt authority for follow-up turns.

`TurnToolInputPort` rejects late approvals and external tool results after a
turn is interrupted or completed. Direct tool execution results remain
`ToolPhase` returns owned by the active turn, so no result channel can revive an
already-terminal turn.

Failed LLM streams are not treated as interrupts. Streaming handlers emit
terminal `SEGMENT_END` events with `failed: true` and an error message for
open segments; `ToolInvocationAdapter` suppresses failed partial tool segments
so they do not become invocations, tool results, or same-turn continuations.

## Inter-Agent Reference Files

Inter-agent messages with explicit `reference_files` are handled by
`AgentInputPipeline.convertInterAgentEvent(...)`, not by a legacy handler. The
pipeline:

- publishes the inter-agent message through `AgentExternalEventNotifier` for
  stream projection;
- preserves structured `reference_files` metadata;
- adds one LLM-visible `Reference files:` block to the recipient input;
- keeps prose-only file paths as ordinary message content.

This keeps `send_message_to` reference-file behavior compatible with the
integrated team/server artifact pipeline while preserving the clean-cut
runtime-loop ownership model.
