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
   - `AgentInputEventQueueManager`
3. `AgentWorker` runs direct bootstrap through `AgentBootstrapper.run(context)`.
4. `SystemPromptPipeline` applies system-prompt processors during bootstrap.
5. `AgentReadyEvent` moves the runtime to the ready/idle state.
6. The worker loop waits for the next scheduler event.

Bootstrap and shutdown are lifecycle work. They are not part of an agent turn,
and normal generation interrupt does not run shutdown cleanup.

## Turn Scheduling

External user and inter-agent inputs enter the runtime through
`AgentRuntime.submitEvent(...)` and are queued by `AgentInputEventQueueManager`.
When the worker selects a `UserMessageReceivedEvent` or
`InterAgentMessageReceivedEvent`, it:

1. creates an `AgentTurn` through `AgentRuntimeState.startActiveTurn()`;
2. creates a working-context checkpoint for that `turnId`;
3. runs `new AgentTurnRunner(context, turn).run(trigger)`;
4. clears the active turn in a `finally` block;
5. emits `AgentIdleEvent` after a completed turn.

Only one active turn is allowed per runtime.

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
- `LlmTurnPhase`
  - assembles memory-backed LLM requests;
  - passes `{ signal, turnId }` into `BaseLLM.streamMessages(...)`;
  - streams segments through `AgentOutbox`;
  - parses text/API tool calls through the streaming response handler factory.
- `ToolPhase`
  - runs tool invocations under the active `TurnExecutionScope`;
  - passes cancellation context into tools that support it;
  - waits for approval through `AgentTurnInputBox` when needed.
- `ToolResultPipeline`
  - applies configured tool-result processors.
- `ToolResultContinuationBuilder`
  - builds the same-turn `SenderType.TOOL` continuation input.
- `LLMResponsePipeline`
  - applies final response processors and publishes assistant output.
- `AgentOutbox`
  - centralizes runtime event publication to the external notifier.

The old single-agent `WorkerEventDispatcher` and normal-flow handler files are
removed. Do not reintroduce them as parallel control-flow owners for LLM calls,
tool execution, tool results, or inter-agent message ingestion.

## Native Interrupt Semantics

`Agent.interrupt(...)` delegates to `AgentRuntime.interrupt(...)`.

When an active turn exists:

1. the runtime publishes/derives interrupt-request state;
2. `AgentRuntimeState.interruptActiveTurn(...)` interrupts the active
   `AgentTurn`;
3. `AgentTurn.interrupt(...)` aborts the `TurnExecutionScope` and closes the
   `AgentTurnInputBox`;
4. pending approvals for the turn are cleared and expected invocation ids are
   fenced as recently settled;
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
shutdown orchestrator. User generation interrupt must not run shutdown cleanup.

## Working Context and Stale Results

The runtime creates a working-context checkpoint at turn start. If the turn is
interrupted, the checkpoint is restored so interrupted partial user, tool, or
assistant fragments do not leak into the next LLM request. Raw trace files may
still keep audit/history records; the restored working-context snapshot is the
prompt authority for follow-up turns.

`AgentTurnInputBox` rejects late approvals or stale tool results after a turn is
interrupted or completed. This prevents a delayed approval/result from
continuing an already-terminal turn.

## Inter-Agent Reference Files

Inter-agent messages with explicit `reference_files` are handled by
`AgentInputPipeline.convertInterAgentEvent(...)`, not by a legacy handler. The
pipeline:

- publishes the inter-agent message through `AgentOutbox` for notifier/stream
  projection;
- preserves structured `reference_files` metadata;
- adds one LLM-visible `Reference files:` block to the recipient input;
- keeps prose-only file paths as ordinary message content.

This keeps `send_message_to` reference-file behavior compatible with the
integrated team/server artifact pipeline while preserving the clean-cut
runtime-loop ownership model.

