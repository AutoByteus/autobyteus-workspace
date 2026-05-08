# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Autobyteus runtime must gain first-class interrupt capability distinct from stop/termination. Today the server-side `AgentRunBackend` interface already exposes `interrupt()`, Codex and Claude backends implement real abort/interrupt behavior, and the UI/WebSocket command path routes “stop generation” to `activeRun.interrupt(...)`. However, the native Autobyteus backend implements `interrupt()` by calling `agent.stop()`, which shuts down the runtime, and the core `autobyteus-ts` AgentRuntime has no turn-scoped cancellation owner for in-flight LLM calls, tool calls, or the enclosing active AgentTurn/event-loop dispatch.

The requested behavior: interrupt should cancel the current active work unit, including an in-flight LLM call, in-flight tool call, pending tool approval, pending same-turn continuation, and the active AgentTurn / AgentLoop dispatch, without using runtime stop semantics or forcing the whole run/session offline.

## Investigation Findings

- Core single-agent runtime is event-loop based: `AgentWorker.asyncRun()` dequeues events and awaits `WorkerEventDispatcher.dispatch(...)` before checking `stopRequested` again.
- `AgentRuntime.stop()` / `AgentWorker.stop()` only set a stop flag, enqueue shutdown/stopped events, then wait for the worker loop. They cannot preempt the currently awaited handler. If the handler is awaiting an LLM stream or tool execution, stop waits until that operation settles or times out.
- `AgentRuntimeState` already has `activeTurn: AgentTurn | null`, and `AgentTurn` tracks tool batches, but it owns no AbortController, interrupted state, or settlement outcome.
- `LLMUserMessageReadyEventHandler` awaits `llmInstance.streamMessages(...)` without any abort signal; LLM provider implementations do not accept a runtime cancellation option.
- `ToolInvocationExecutionEventHandler` awaits `toolInstance.execute(context, args)` without a cancellation option; `BaseTool.execute` and `_execute` do not receive an AbortSignal. Foreground `run_bash` creates a local `TerminalSessionManager` that cannot currently be interrupted by the active turn.
- Tool batch continuation depends on `ToolResultEventHandler` aggregating active-batch results and enqueueing a tool-continuation user message. Interrupt must clear active batches and stale same-turn queue events so an interrupted tool result does not drive another LLM call.
- Server-native Autobyteus single-agent backend maps `interrupt()` to `agent.stop()`. Server-native Autobyteus team backend maps `interrupt()` to `team.stop()`. Codex and Claude backends already have real interrupt paths.
- UI/services currently send `STOP_GENERATION`, but the server treats that command as an interrupt operation (`activeRun.interrupt(...)`) for all backends. The main product gap is the native Autobyteus runtime/backend implementation, not the presence of a WebSocket command path.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue + Missing Invariant
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: `AgentRunBackend.interrupt()` exists, but Autobyteus backend bypasses true interrupt and calls stop. Core AgentTurn has no cancellation ownership; LLM/tool handlers own blocking awaits locally with no shared interruption contract.
- Requirement or scope impact: Interrupt must be designed at the AgentRuntime / AgentTurn boundary and propagated through LLM providers, tool execution, runtime status/events, server Autobyteus backend, native team interrupt, and validation tests. A local handler patch is insufficient; the finite per-turn agent loop needs an explicit owner separate from the long-lived AgentWorker mailbox, and turn-local business flow should be extracted from queue-only event choreography.

## Recommendations

1. Introduce an explicit finite AgentTurnRunner/agent-loop owner plus turn-scoped interrupt control in `autobyteus-ts` instead of overloading stop or treating AgentWorker/internal queue events as the turn loop.
2. Introduce typed input-box lanes: `AgentInputBox` for turn-starting triggers, `AgentTurnInputBox` for tool results/approvals/continuations, lifecycle lane for bootstrap/shutdown/status, and side-band control for interrupt.
3. Introduce an AgentOutbox publication boundary for assistant output, streaming segments, tool lifecycle/logs, approvals, errors, turn/runtime lifecycle, artifacts, and state updates.
4. Extract typed processor pipeline orchestrators for input, tool invocation, tool result, LLM response/output, and system prompt processing so runner phases and lifecycle bootstrap can reuse existing processors without duplicating or bypassing behavior.
5. Treat bootstrap and shutdown as runtime lifecycle pipelines: bootstrap prepares the runtime before AgentInputBox-triggered turns, shutdown runs only for terminal stop/worker exit, and neither is part of normal generation interrupt.
6. Add public `interrupt(...)` APIs on native `Agent`, `AgentRuntime`, `AgentTeam`, and `AgentTeamRuntime` while leaving `stop(...)` as terminal runtime shutdown.
7. Introduce a turn execution scope as the architectural cancellation boundary, then propagate that scope/signal into explicit LLM/tool phase services, LLM invocation, request assembly/compaction, streaming response handlers, tool execution, MCP tools, and foreground terminal tools.
8. Treat interrupted turns as settled/idle, not successful, failed, or stopped. Emit explicit interruption metadata and avoid producing tool-continuation LLM input from interrupted work.
9. Update native server Autobyteus backends to call native interrupt APIs rather than stop.
10. Add tests that prove interrupt unblocks active LLM/tool awaits and the same runtime can accept a later user message.

## Scope Classification (`Small`/`Medium`/`Large`)

Large

## In-Scope Use Cases

- UC-001: A user interrupts while the native Autobyteus agent is awaiting/streaming an LLM response.
- UC-002: A user interrupts while the native Autobyteus agent is executing a foreground tool call.
- UC-003: A user interrupts while a tool approval is pending or same-turn tool-result continuation is queued.
- UC-004: A user interrupts a native Autobyteus team run and the team interrupts active member agents/sub-teams without shutting down the team runtime.
- UC-005: Server/UI command path for active generation interruption uses the backend `interrupt()` operation consistently across Autobyteus, Codex, and Claude runtimes.
- UC-006: Terminal/MCP/LLM provider adapters receive cancellation context where supported and otherwise cannot keep the AgentTurn blocked indefinitely.
- UC-007: Bootstrap and shutdown lifecycle behavior remains correct under the new runner/pipeline architecture and stays separate from normal interrupt.

## Out of Scope

- Hard rollback of filesystem or external side effects already committed by a tool before the interrupt request.
- Killing background processes deliberately started by `run_bash` with `background: true`; those remain managed by the existing background process tools unless an explicit future requirement changes that contract.
- Changing Codex app-server or Claude SDK runtime internals beyond keeping the shared server command interface consistent.
- Full UI redesign; only status/protocol/handler changes needed to represent native Autobyteus interruption are in scope.

## Functional Requirements

- FR-001: Native Autobyteus single-agent runtime shall expose `interrupt(options?)` separately from `stop(timeout?)` on `Agent` and `AgentRuntime`.
- FR-002: Calling native `interrupt()` while an AgentTurn is active shall request cancellation through the active AgentTurnRunner/turn execution scope/AbortSignal and mark the turn as interrupted.
- FR-003: Interrupting a native LLM phase shall abort or abandon the current LLM request/stream, close any active response segments with interruption metadata, skip assistant-response ingestion for the interrupted turn, and return the runtime to idle.
- FR-004: Interrupting a native tool phase shall request cancellation of the active tool execution, emit an interrupted tool lifecycle outcome, suppress same-turn tool-result continuation to the LLM, and ignore late results from the interrupted invocation.
- FR-004A: Non-interrupted tool-result continuation shall preserve current behavior: aggregate ordered tool results into a `SenderType.TOOL` `AgentInputUserMessage`, preserve media `ContextFile` attachments, apply configured input processors, build the LLM user message through the existing multimodal conversion path, and reuse the active turn rather than starting a new turn.
- FR-004B: The implementation shall separate mailbox/runtime events from turn-local business control flow by introducing explicit turn runner and phase/pipeline services; normal LLM/tool/continuation progression shall not be owned by internal queue-event choreography in the final implementation.
- FR-004C: Existing processor extension points shall be preserved through typed pipeline orchestrators: input processors, tool invocation preprocessors, tool execution result processors, LLM response/output processors, and system prompt processors.
- FR-004D: Tool results, tool approvals, and tool continuations shall be modeled as `AgentTurnInputBox` messages keyed by turn/invocation identity; they shall not be accepted as `AgentInputBox` messages that can start a new turn.
- FR-004D1: `AgentInputBox` shall be a first-class semantic runtime inbound boundary above low-level queue storage; it shall own external turn-starting message eligibility, preserve unrelated external messages while a turn is active, and be the source consumed by the AgentWorker scheduler.
- FR-004E: Agent-produced outbound facts and data shall flow through an AgentOutbox publication boundary above existing notifier/event-stream implementations, including assistant output, streaming segments, tool lifecycle/logs, approvals, errors, artifacts, state updates, and turn/runtime lifecycle messages.
- FR-005: Interrupting pending approval shall clear pending approval state for the interrupted turn and ignore later stale approval/denial messages for those invocation IDs.
- FR-006: Native interrupt shall clear or invalidate turn-scoped queued work (`LLMUserMessageReadyEvent`, tool invocation request/execution/result events, and tool-continuation input) for the interrupted turn while preserving unrelated later external user messages.
- FR-007: After successful native interrupt settlement, the runtime shall remain running and reusable; a later user message can start a new turn without requiring runtime restart.
- FR-008: Native `stop(timeout?)` shall retain terminal shutdown semantics and shall not become a synonym for interrupt.
- FR-008A: Bootstrap and shutdown shall remain runtime lifecycle pipelines outside `AgentTurnRunner`: bootstrap must complete before external AgentInputBox triggers start turns; normal interrupt shall not execute shutdown cleanup; terminal stop shall execute shutdown cleanup exactly once.
- FR-008B: Single-agent bootstrap shall use direct lifecycle orchestration (`AgentBootstrapper.run(context)`) with bootstrap events used only for lifecycle notification/observation if kept; system prompt processors shall be preserved via a typed `SystemPromptPipeline`.
- FR-009: LLM invocation APIs shall accept a cancellation option that provider adapters map to SDK/fetch abort mechanisms where available and to cooperative runtime abandonment where not available.
- FR-010: Tool execution APIs shall accept a cancellation option; built-in foreground terminal tools and MCP tool adapters shall participate in interruption as far as their transports allow.
- FR-011: Native Autobyteus server backend `interrupt()` shall call native `agent.interrupt(...)`, not `agent.stop(...)`.
- FR-012: Native Autobyteus team backend `interrupt()` shall call native `team.interrupt(...)`, not `team.stop(...)`.
- FR-013: Native team interrupt shall propagate interruption to currently running member agents and sub-teams and return the team runtime to idle without teardown.
- FR-014: Runtime events/statuses shall distinguish interrupting/interrupted work from error and shutdown; clients shall be able to tell whether a turn or tool ended because of interruption.
- FR-015: Repeated interrupt requests for the same active turn shall be idempotent and shall not emit duplicate terminal turn/tool outcomes.
- FR-016: Implementation shall preserve the documented component contracts, state-machine transitions, message routing rules, and final work-package safety gates for `AgentRuntime`, `AgentWorker`, `AgentInputBox`, `AgentTurnInputBox`, `AgentTurnRunner`, `TurnExecutionScope`, `AgentOutbox`, and typed processor pipelines.
- FR-017: Final implementation shall be a clean-cut refactor: normal LLM/tool/continuation turn progression shall be owned by `AgentTurnRunner` and phase/pipeline services, and old event-handler queue choreography shall be removed from normal turn control. Remaining event/listener code shall be limited to external input boundaries, lifecycle observation, or outbox delivery only.

## Acceptance Criteria

- AC-001: In a native Autobyteus runtime test with a controllable LLM stream that blocks until aborted, `runtime.interrupt()` resolves without calling `runtime.stop()`, the active turn is cleared, status becomes idle, and `runtime.isRunning === true`.
- AC-002: In the same scenario, a user message submitted after interrupt starts a new turn and reaches the LLM exactly once; stale output from the interrupted turn does not enqueue `LLMCompleteResponseReceivedEvent` or an assistant-complete message.
- AC-003: In a native tool test with a controllable long-running tool, `runtime.interrupt()` passes/aborts the tool signal, emits a tool-interrupted lifecycle outcome, does not enqueue a tool-continuation user message, and returns status to idle.
- AC-004: A late result from an interrupted tool invocation is ignored and cannot complete the interrupted batch or trigger another LLM call.
- AC-004A: A non-interrupted tool-result continuation test verifies that configured input processors are invoked for the `SenderType.TOOL` continuation message, the same turn ID is reused, media context files are preserved, and exactly one next LLM call receives the processed tool-result message.
- AC-004B: Architecture/code review verifies that `AgentTurnRunner` and extracted phase/pipeline services own turn-local LLM/tool continuation flow, while `AgentWorker` remains a mailbox/scheduler/lifecycle worker and does not directly encode the reasoning loop.
- AC-004C: Processor pipeline tests verify existing processor ordering and error behavior are preserved for input, tool invocation, tool result, and LLM response/output processors after extraction.
- AC-004D: AgentTurnInputBox tests verify tool results/approvals are accepted only for the active turn/invocation, stale or post-interrupt messages are ignored, and external user messages remain queued separately.
- AC-004D1: AgentInputBox tests/review verify external user/inter-agent messages enter the semantic AgentInputBox, the worker consumes triggers from AgentInputBox rather than direct queue storage, and tool results/approvals/continuations cannot start turns through AgentInputBox.
- AC-004E: Outbox tests verify new turn/tool interruption outbound messages are published through AgentOutbox and mapped to existing notifier/event-stream outputs without being used to advance turn control flow.
- AC-005: Interrupt during pending tool approval clears `pendingToolApprovals` for that turn; a later approval for that invocation is rejected/ignored as stale without changing runtime status.
- AC-006: `agent.stop()` and `runtime.stop()` still transition to shutdown complete and unregister/cleanup runtime resources.
- AC-006A: Bootstrap tests verify successful bootstrap reaches ready/idle before external turns are processed, bootstrap failure reaches error, and interrupt during bootstrap returns no-active-turn/not-interruptible without invoking shutdown cleanup.
- AC-006B: Stop tests verify shutdown cleanup runs exactly once, including when stop is requested during an active turn; normal interrupt tests verify shutdown cleanup is not invoked and runtime remains reusable.
- AC-007: `AutoByteusAgentRunBackend.interrupt()` unit tests verify `agent.interrupt()` is invoked and `agent.stop()` is not invoked.
- AC-008: `AutoByteusTeamRunBackend.interrupt()` unit tests verify `team.interrupt()` is invoked and `team.stop()` is not invoked.
- AC-009: Native team integration test proves an interrupted active member returns to idle while the team remains active/reusable.
- AC-010: WebSocket/streaming tests verify the active generation command reaches `activeRun.interrupt(...)` and clients receive an idle/turn-settled update with interruption metadata.
- AC-011: Foreground `run_bash` interruption kills/closes the active terminal session and reports an interrupted tool outcome; background `run_bash` behavior is unchanged and documented as out of scope.
- AC-012: LLM provider tests/mocks verify the active turn signal is passed through BaseLLM and provider adapters, and an abort does not get reported as a normal LLM error.
- AC-013: Architecture/code review verifies component boundaries, state-machine transitions, message routing rules, and final work-package safety gates match the design; no implementation path leaves `AgentWorker` as the owner of turn-local LLM/tool control flow.
- AC-014: Final source review verifies no duplicate control-flow owners remain: normal turn execution no longer depends on `WorkerEventDispatcher` dispatching the old LLM/tool/continuation handler chain, and remaining event/listener code is limited to external input boundaries, lifecycle observation, or outbox delivery only.

## Constraints / Dependencies

- Existing event-loop ordering invariant must be preserved: later external user input stays queued behind an active turn until the active turn settles or is interrupted.
- Interrupt must be out-of-band enough to signal the currently awaited handler; simply enqueueing another event is insufficient.
- JavaScript cannot forcibly preempt synchronous CPU-bound code. In-process tools must be cooperatively cancellable; runtime must still abandon late async results when possible.
- Provider SDKs have uneven AbortSignal support; adapter ownership must hide those differences from AgentRuntime.
- Existing Codex and Claude runtime behavior should remain functionally unchanged; the shared server command path should continue to call each backend's `interrupt()`.

## Assumptions

- Interrupt means “cancel the active turn/current generation and keep the run usable,” not “terminate the run.”
- If no active turn exists, interrupt can be treated as an accepted no-op or a non-fatal no-active-turn result; implementation should choose one consistent result and test it.
- Tool side effects already completed before cancellation are not reversible.
- A queued external user message that is unrelated to the interrupted turn should be preserved and processed after the interrupted turn settles.

## Risks / Open Questions

- Some provider SDKs may not support real transport abort; the design must still unblock the agent loop through cooperative abandonment and late-result suppression.
- Some MCP tools may keep executing remotely after local abandonment; durable UI should show local interruption and avoid false success.
- Adding explicit interruption lifecycle messages requires coordinated protocol/frontend updates if a separate `TOOL_EXECUTION_INTERRUPTED` message is chosen.
- If future product requirements want “interrupt only selected turn ID” from UI, the transport payload may need to include the active turn ID consistently for teams and single agents.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| UC-001 | FR-001, FR-002, FR-003, FR-004D1, FR-006, FR-007, FR-009, FR-014, FR-015, FR-016, FR-017 |
| UC-002 | FR-001, FR-002, FR-004, FR-004A, FR-004B, FR-004C, FR-004D, FR-004D1, FR-004E, FR-006, FR-007, FR-010, FR-014, FR-015, FR-016, FR-017 |
| UC-003 | FR-004B, FR-004C, FR-004D, FR-004D1, FR-005, FR-006, FR-014, FR-015, FR-016, FR-017 |
| UC-004 | FR-012, FR-013, FR-014 |
| UC-005 | FR-011, FR-012, FR-014 |
| UC-006 | FR-009, FR-010 |
| UC-007 | FR-008, FR-008A, FR-008B |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Native LLM interrupt unblocks active turn without shutdown. |
| AC-002 | Runtime remains reusable and stale LLM completion is suppressed. |
| AC-003 | Native tool interrupt unblocks active tool execution without tool continuation. |
| AC-004 | Late tool result cannot revive interrupted turn. |
| AC-004A | Tool-result continuation still flows through input processors and same-turn LLM input. |
| AC-004B | Turn-local flow is owned by runner/phase services, not fragmented queue choreography. |
| AC-004C | Typed processor pipeline extraction preserves existing processor behavior. |
| AC-004D | AgentTurnInputBox separates tool results/approvals from `AgentInputBox` turn-starting messages. |
| AC-004D1 | AgentInputBox is the semantic runtime inbox above queue storage. |
| AC-004E | AgentOutbox is the outbound boundary for new interruption events and remains observation-only. |
| AC-005 | Pending approval state is cleared safely. |
| AC-006 | Stop remains terminal lifecycle control. |
| AC-006A | Bootstrap lifecycle is ready/error before turns and is not normal interrupt. |
| AC-006B | Shutdown lifecycle runs on stop, not on reusable interrupt. |
| AC-007 | Single-agent server Autobyteus backend no longer conflates interrupt with stop. |
| AC-008 | Team server Autobyteus backend no longer conflates interrupt with stop. |
| AC-009 | Native team interrupt is propagation, not teardown. |
| AC-010 | User command path exposes interrupted turn/status to client. |
| AC-011 | Built-in terminal foreground tool participates in cancellation. |
| AC-012 | LLM adapter cancellation is owned below BaseLLM boundary. |
| AC-013 | Component contracts, state machines, routing rules, and final work-package gates are preserved. |
| AC-014 | Final implementation is clean-cut; old handler queue choreography is removed from normal turn control. |

## Approval Status

User explicitly requested analysis and design. No separate approval round has been captured yet; this document is design-ready as the requirements basis for architecture review, with approval state to be called out in handoff.
