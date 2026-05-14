# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

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
- Original baseline server-native Autobyteus single-agent backend mapped `interrupt()` to `agent.stop()`, and team backend mapped `interrupt()` to `team.stop()`, while Codex and Claude backends already had real interrupt paths. Current ticket code has begun replacing this with native `agent.interrupt(...)` / `team.interrupt(...)`; final design must preserve that clean separation and complete the runtime architecture.
- Current ticket UI/services send `INTERRUPT_GENERATION`; server single-agent and team stream handlers resolve the active run and call `activeRun.interrupt(...)`. The main product gap is the native Autobyteus runtime/backend implementation and event parity, not the presence of a WebSocket command path.
- Current ticket implementation has already completed the first major refactor: normal turn execution now flows through `AgentMessageInbox -> AgentWorker -> AgentTurnRunner -> LlmPhase/ToolPhase/pipelines`, with `AgentRuntime.postToolApproval(...) -> AgentRuntimeState.postToolApprovalToActiveTurn(...) -> TurnToolInputPort.postApproval(...)` for approvals. `WorkerEventDispatcher` and old normal-flow handlers are no longer the turn-loop owners.
- The next design refinement uses that implemented state as the base and cleans up the remaining inbound-event model: `AgentMessageInbox`/message wrappers and `TurnToolInputPort` are understandable as an intermediate step, but the final architecture should expose one semantic `AgentEventInbox`, an explicit `AgentEventScheduler`, typed `InboxEventHandler`s, and an internal tool-specific `TurnToolInputPort` rather than a second domain-message layer around canonical events.
- Existing frontend and server consumers depend on inter-agent/system-task observable events: `notifyAgentDataInterAgentMessageReceived(...)` maps through `AgentEventStream`/server conversion/team processors into `INTER_AGENT_MESSAGE` conversation segments and derived `TEAM_COMMUNICATION_MESSAGE` store updates. Removing `AgentOutbox` must preserve these notifier publications and payload shapes.
- The frontend interrupt button path already sends `INTERRUPT_GENERATION` for single-agent and team contexts and intentionally keeps `isSending` true until stream feedback (`TURN_INTERRUPTED` and/or idle status) arrives. Native Autobyteus interrupt must emit the same event/status semantics as Codex/Claude so the UI does not hang.
- Latest code review design-impact finding CR-019 clarified that event-inbox dispatch targets are scheduler-selected handlers/delegates, not processor pipelines. Final naming must use `event-inbox/handlers`, `InboxEventHandler`, `*InboxEventHandler`, `AgentEventSchedulerHandlers`, and `handle(...)`, while keeping old normal-flow handlers removed and preserving real processor-pipeline terminology for input/tool/LLM/system-prompt processors.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue + Missing Invariant
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: `AgentRunBackend.interrupt()` exists, but Autobyteus backend bypasses true interrupt and calls stop. Core AgentTurn has no cancellation ownership; LLM/tool handlers own blocking awaits locally with no shared interruption contract.
- Requirement or scope impact: Interrupt must be designed at the AgentRuntime / AgentTurn boundary and propagated through LLM providers, tool execution, runtime status/events, server Autobyteus backend, native team interrupt, and validation tests. A local handler patch is insufficient; the finite per-turn agent loop needs an explicit owner separate from the long-lived AgentWorker mailbox, and turn-local business flow should be extracted from queue-only event choreography.

## Recommendations

1. Introduce an explicit finite AgentTurnRunner/agent-loop owner plus turn-scoped interrupt control in `autobyteus-ts` instead of overloading stop or treating AgentWorker/internal queue events as the turn loop.
2. Replace the architecture-facing `AgentMessageInbox` / message-wrapper layer with a unified `AgentEventInbox` that stores typed inbound agent events in semantic lanes: turn-starting user/inter-agent events, active-turn tool approval/result events, lifecycle events, and parked future work. The separate turn-scoped tool input primitive should be an internal `TurnToolInputPort`, not a second public inbox concept and not a generic all-phase awaitable input object.
3. Use the existing `AgentExternalEventNotifier` as the single external observable-event boundary for assistant output, streaming segments, tool lifecycle/logs, approvals, errors, inter-agent/system-task communication facts, turn/runtime lifecycle, artifacts, and state updates; do not introduce a separate AgentOutbox wrapper.
4. Extract typed processor pipeline orchestrators for input, tool invocation, tool result, LLM response/output, and system prompt processing so runner phases and lifecycle bootstrap can reuse existing processors without duplicating or bypassing behavior.
5. Treat bootstrap and shutdown as runtime lifecycle pipelines: bootstrap prepares the runtime before `AgentEventInbox` turn-starting events are dispatched, shutdown runs only for terminal stop/worker exit, and neither is part of normal generation interrupt.
6. Add public `interrupt(...)` APIs on native `Agent`, `AgentRuntime`, `AgentTeam`, and `AgentTeamRuntime` while leaving `stop(...)` as terminal runtime shutdown.
7. Introduce a turn execution scope as the architectural cancellation boundary, then propagate that scope/signal into explicit LLM/tool phase services, LLM invocation, request assembly/compaction, streaming response handlers, tool execution, MCP tools, and foreground terminal tools.
8. Treat interrupted turns as settled/idle, not successful, failed, or stopped. Emit explicit interruption metadata and avoid producing tool-continuation LLM input from interrupted work.
9. Update native server Autobyteus backends to call native interrupt APIs rather than stop.
10. Add tests that prove interrupt unblocks active LLM/tool awaits and the same runtime can accept a later user message.
11. Add an explicit `AgentEventScheduler` and typed inbox event handlers so the inbox loop is easy to reason about: scheduler selects the dispatchable event entry and processor by event class/lane plus runtime/turn state; handlers invoke the right domain owner or processor pipeline without becoming the LLM/tool phase chain.
12. Use symmetric final phase names `LlmPhase` and `ToolPhase`; keep the current `LlmPhase` / `ToolPhase` naming consistently in the final architecture.

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
- UC-008: Existing frontend/server consumers for inter-agent communication, team communication messages, system task notifications, and interrupt button state continue to work after the inbox/outbox refactor.
- UC-009: A user interrupts after a turn has accepted user input, emitted assistant output, or executed tools; later turns still remember those already-observed facts as history while unsafe incomplete protocol continuation is fenced.

## Out of Scope

- Hard rollback of filesystem or external side effects already committed by a tool before the interrupt request.
- Killing background processes deliberately started by `run_bash` with `background: true`; those remain managed by the existing background process tools unless an explicit future requirement changes that contract.
- Changing Codex app-server or Claude SDK runtime internals beyond keeping the shared server command interface consistent.
- Full UI redesign; only status/protocol/handler changes needed to represent native Autobyteus interruption are in scope.

## Functional Requirements

- FR-001: Native Autobyteus single-agent runtime shall expose `interrupt(options?)` separately from `stop(timeout?)` on `Agent` and `AgentRuntime`.
- FR-002: Calling native `interrupt()` while an AgentTurn is active shall request cancellation through the active AgentTurnRunner/turn execution scope/AbortSignal and mark the turn as interrupted.
- FR-003: Interrupting a native LLM phase shall abort or abandon the current LLM request/stream, close any active response segments with interruption metadata, skip normal completed-assistant response ingestion for the interrupted turn, record any already emitted assistant facts as interrupted/partial history when available, and return the runtime to idle.
- FR-004: Interrupting a native tool phase shall request cancellation of the active tool execution, emit an interrupted tool lifecycle outcome, retain tool invocations/results that were already observed or completed as history, suppress unsafe same-turn tool-result continuation to the LLM, and ignore late results from the interrupted invocation.
- FR-004A: Non-interrupted tool-result continuation shall preserve current behavior: aggregate ordered tool results into a `SenderType.TOOL` `AgentInputUserMessage`, preserve media `ContextFile` attachments, apply configured input processors, build the LLM user message through the existing multimodal conversion path, and reuse the active turn rather than starting a new turn.
- FR-004B: The implementation shall separate mailbox/runtime events from turn-local business control flow by introducing explicit turn runner and phase/pipeline services; normal LLM/tool/continuation progression shall not be owned by internal queue-event choreography in the final implementation.
- FR-004C: Existing processor extension points shall be preserved through typed pipeline orchestrators: input processors, tool invocation preprocessors, tool execution result processors, LLM response/output processors, and system prompt processors.
- FR-004D: Tool results, tool approvals, and same-turn continuations shall be modeled as active-turn agent events keyed by turn/invocation identity; they shall never be eligible to start a new turn.
- FR-004D1: `AgentEventInbox` shall be the first-class semantic runtime inbound boundary above low-level queue storage; it shall own typed inbound event storage, preserve unrelated external turn-starting events while a turn is active, and expose lane/candidate/claim APIs to the scheduler without leaking queue-manager mechanics or owning routing policy.
- FR-004D2: `AgentEventScheduler` shall own event dispatchability and routing policy: external user/inter-agent events start a turn only when idle, active-turn events are routed only to the active turn, lifecycle events are handled by runtime lifecycle handlers, stale events produce explicit reject/drop outcomes, and interrupt remains side-band runtime control.
- FR-004D3: Typed `InboxEventHandler`s shall handle scheduler-selected inbound event entries and delegate to the appropriate domain owner or processor pipeline. They shall not recreate the old event-handler chain for LLM/tool phase progression.
- FR-004E: Agent-produced outbound facts and data shall flow through the existing `AgentExternalEventNotifier` as the single external observable-event boundary, including assistant output, streaming segments, tool lifecycle/logs, approvals, errors, inter-agent/system-task communication facts, artifacts, state updates, and turn/runtime lifecycle events. The final design shall not add a separate AgentOutbox or duplicate publisher wrapper.
- FR-004E1: Inter-agent and system-task observable event publications shall be preserved when removing `AgentOutbox`: `AgentInputPipeline` conversion shall still publish through `AgentExternalEventNotifier.notifyAgentDataInterAgentMessageReceived(...)` / `notifyAgentDataSystemTaskNotificationReceived(...)`, `AgentEventStream` and server/team processors shall still map/enrich/derive `INTER_AGENT_MESSAGE` and `TEAM_COMMUNICATION_MESSAGE`, and frontend `TeamStreamingService` consumers shall still render conversation segments and update `teamCommunicationStore`.
- FR-005: Interrupting pending approval shall clear pending approval state for the interrupted turn and ignore later stale approval/denial events for those invocation IDs.
- FR-005A: External tool approval/denial commands shall route through the final public/runtime boundary (`AgentRunBackend.approveToolInvocation` -> native `Agent.postToolExecutionApproval` -> `AgentRuntime.postToolApprovalEvent`), enter `AgentEventInbox` as awaitable active-turn `ToolExecutionApprovalEvent` entries, pass scheduler/handler/runtime-state active-turn identity routing, and be validated by the active `AgentTurn` against pending invocation ID and interruption/settlement state before any event is posted through the active turn's internal `TurnToolInputPort`.
- FR-005B: Externally delivered or asynchronous tool results, when present, shall enter `AgentEventInbox` as active-turn `ToolResultEvent` entries, be dispatched by `AgentEventScheduler` to `ToolResultInboxEventHandler`, pass runtime-state active-turn identity routing, be validated against expected invocation identity by the active `AgentTurn`, and wake `ToolPhase` through `TurnToolInputPort`; normal in-process tool execution may still return results directly inside `ToolPhase`.
- FR-006: Native interrupt shall clear or invalidate unsafe turn-scoped continuation work (`LLMUserMessageReadyEvent`, incomplete tool invocation request/execution/result events, and tool-continuation input) for the interrupted turn while preserving unrelated later external user messages and all already accepted/emitted/executed history facts.
- FR-007: After successful native interrupt settlement, the runtime shall remain running and reusable; a later user message can start a new turn without requiring runtime restart.
- FR-008: Native `stop(timeout?)` shall retain terminal shutdown semantics and shall not become a synonym for interrupt.
- FR-008A: Bootstrap and shutdown shall remain runtime lifecycle pipelines outside `AgentTurnRunner`: bootstrap must complete before `AgentEventInbox` turn-starting events are dispatched; normal interrupt shall not execute shutdown cleanup; terminal stop shall execute shutdown cleanup exactly once.
- FR-008B: Single-agent bootstrap shall use direct lifecycle orchestration (`AgentBootstrapper.run(context)`) with bootstrap events used only for lifecycle notification/observation if kept; system prompt processors shall be preserved via a typed `SystemPromptPipeline`.
- FR-009: LLM invocation APIs shall accept a cancellation option that provider adapters map to SDK/fetch abort mechanisms where available and to cooperative runtime abandonment where not available.
- FR-010: Tool execution APIs shall accept a cancellation option; built-in foreground terminal tools and MCP tool adapters shall participate in interruption as far as their transports allow.
- FR-011: Native Autobyteus server backend `interrupt()` shall call native `agent.interrupt(...)`, not `agent.stop(...)`.
- FR-012: Native Autobyteus team backend `interrupt()` shall call native `team.interrupt(...)`, not `team.stop(...)`.
- FR-013: Native team interrupt shall propagate interruption to currently running member agents and sub-teams and return the team runtime to idle without teardown.
- FR-014: Runtime events/statuses shall distinguish interrupting/interrupted work from error and shutdown; clients shall be able to tell whether a turn or tool ended because of interruption. Native Autobyteus interrupt shall publish the frontend-compatible `TURN_INTERRUPTED`, optional `TOOL_EXECUTION_INTERRUPTED`, and idle-status stream feedback needed for existing interrupt button behavior.
- FR-015: Repeated interrupt requests for the same active turn shall be idempotent and shall not emit duplicate terminal turn/tool outcomes.
- FR-016: Implementation shall preserve the documented component contracts, state-machine transitions, event routing rules, and final work-package safety gates for `AgentRuntime`, `AgentWorker`, `AgentEventInbox`, `AgentEventScheduler`, typed `InboxEventHandler`s, `TurnToolInputPort`, `AgentTurnRunner`, `LlmPhase`, `ToolPhase`, `TurnExecutionScope`, `AgentExternalEventNotifier`, and typed processor pipelines.
- FR-017: Final implementation shall be a clean-cut refactor: normal LLM/tool/continuation turn progression shall be owned by `AgentTurnRunner` and phase/pipeline services, and old event-handler queue choreography shall be removed from normal turn control. Remaining event/listener code shall be limited to external input boundaries, lifecycle observation, or external event delivery only.
- FR-018: Event-inbox dispatch targets shall use handler/delegation naming, not processor naming: `event-inbox/handlers/`, `InboxEventHandler`, `TurnStartInboxEventHandler`, `ToolApprovalInboxEventHandler`, `ToolResultInboxEventHandler`, `RuntimeLifecycleInboxEventHandler`, scheduler-facing `AgentEventSchedulerHandlers`, and `handle(entry, context)`. This naming shall be explicitly distinct from the removed legacy normal-flow `agent/handlers/*` chain and from real processor pipelines.
- FR-019: Interrupt shall not restore working context to the state before the interrupted turn. The memory subsystem shall retain already accepted user input, emitted assistant output/facts, tool invocation/result/interruption facts, and a turn-interrupted marker in durable history; it shall rebuild/finalize the future LLM working context as a provider-safe projection of those facts while fencing incomplete native tool-call protocol or late continuation state. `AgentTurn`/`AgentTurnRunner` may report interruption outcome, but `MemoryManager` owns memory commit/projection policy.

## Acceptance Criteria

- AC-001: In a native Autobyteus runtime test with a controllable LLM stream that blocks until aborted, `runtime.interrupt()` resolves without calling `runtime.stop()`, the active turn is cleared, status becomes idle, and `runtime.isRunning === true`.
- AC-002: In the same scenario, a user message submitted after interrupt starts a new turn and reaches the LLM exactly once; stale output from the interrupted turn does not enqueue `LLMCompleteResponseReceivedEvent` or an assistant-complete message.
- AC-003: In a native tool test with a controllable long-running tool, `runtime.interrupt()` passes/aborts the tool signal, emits a tool-interrupted lifecycle outcome, does not enqueue a tool-continuation user message, and returns status to idle.
- AC-004: A late result from an interrupted tool invocation is ignored and cannot complete the interrupted batch or trigger another LLM call.
- AC-004A: A non-interrupted tool-result continuation test verifies that configured input processors are invoked for the `SenderType.TOOL` continuation message, the same turn ID is reused, media context files are preserved, and exactly one next LLM call receives the processed tool-result message.
- AC-004B: Architecture/code review verifies that `AgentTurnRunner` and extracted phase/pipeline services own turn-local LLM/tool continuation flow, while `AgentWorker` remains a mailbox/scheduler/lifecycle worker and does not directly encode the reasoning loop.
- AC-004C: Processor pipeline tests verify existing processor ordering and error behavior are preserved for input, tool invocation, tool result, and LLM response/output processors after extraction.
- AC-004D: Active-turn event tests verify tool result/approval events are accepted only for the active turn/invocation, stale or post-interrupt events are ignored, and external user/inter-agent events remain queued separately.
- AC-004D1: AgentEventInbox tests/review verify external user/inter-agent events, lifecycle events, and active-turn events enter the semantic inbox, the scheduler claims typed event entries through AgentEventInbox rather than direct queue storage, and tool results/approvals/continuations cannot start turns.
- AC-004D2: AgentEventScheduler tests verify routing outcomes for idle external events, busy external events, valid active-turn events, stale active-turn events, lifecycle events, stopped runtime, and side-band interrupt exclusion.
- AC-004D3: InboxEventHandler tests/review verify handlers delegate to typed pipelines/domain owners, use `handle(...)`, and do not own normal LLM/tool phase progression.
- AC-004E: External-event tests verify new turn/tool interruption outbound events are published through `AgentExternalEventNotifier` and mapped to existing event-stream outputs without being used to advance turn control flow; no separate AgentOutbox wrapper remains in the final source.
- AC-004E1: Inter-agent/system-task event tests verify `notifyAgentDataInterAgentMessageReceived(...)` and `notifyAgentDataSystemTaskNotificationReceived(...)` still map through `AgentEventStream` and server/team processors into `INTER_AGENT_MESSAGE`, derived `TEAM_COMMUNICATION_MESSAGE`, and frontend conversation/team communication store updates with compatible payload fields after `AgentOutbox` removal.
- AC-005: Interrupt during pending tool approval clears `pendingToolApprovals` for that turn; a later approval for that invocation is rejected/ignored as stale without changing runtime status.
- AC-005A: Server/native approval routing tests verify `AgentRunBackend.approveToolInvocation` reaches native `Agent.postToolExecutionApproval`, `AgentRuntime.postToolApprovalEvent` posts an awaitable active-turn `ToolExecutionApprovalEvent` entry, `ToolApprovalInboxEventHandler`/`AgentRuntimeState` route active-turn identity, `AgentTurn` checks pending invocation/interruption state, valid approvals wake `ToolPhase.waitForApproval` through `TurnToolInputPort`, and no-active/stale-turn/no-pending/interrupted approvals return explicit non-turn-starting outcomes.
- AC-005B: External/async tool-result routing tests verify `ToolResultEvent` enters `AgentEventInbox`, scheduler dispatches `ToolResultInboxEventHandler`, runtime-state routing checks active turn identity, `AgentTurn` checks expected invocation identity, valid results wake `ToolPhase.waitForToolResults` through `TurnToolInputPort`, stale/interrupted results are fenced, and in-process tool results still follow direct `ToolPhase -> ToolResultPipeline -> ToolResultContinuationBuilder -> AgentInputPipeline(SenderType.TOOL)` flow.
- AC-006: `agent.stop()` and `runtime.stop()` still transition to shutdown complete and unregister/cleanup runtime resources.
- AC-006A: Bootstrap tests verify successful bootstrap reaches ready/idle before external turns are processed, bootstrap failure reaches error, and interrupt during bootstrap returns no-active-turn/not-interruptible without invoking shutdown cleanup.
- AC-006B: Stop tests verify shutdown cleanup runs exactly once, including when stop is requested during an active turn; normal interrupt tests verify shutdown cleanup is not invoked and runtime remains reusable.
- AC-007: `AutoByteusAgentRunBackend.interrupt()` unit tests verify `agent.interrupt()` is invoked and `agent.stop()` is not invoked.
- AC-008: `AutoByteusTeamRunBackend.interrupt()` unit tests verify `team.interrupt()` is invoked and `team.stop()` is not invoked.
- AC-009: Native team integration test proves an interrupted active member returns to idle while the team remains active/reusable.
- AC-010: WebSocket/streaming tests verify the frontend interrupt button sends `INTERRUPT_GENERATION`, server single-agent/team handlers route it to `activeRun.interrupt(...)`, native Autobyteus backends call native `Agent.interrupt(...)` / `AgentTeam.interrupt(...)`, and clients receive `TURN_INTERRUPTED` and/or idle status feedback that clears `isSending` without optimistic client-side clearing.
- AC-011: Foreground `run_bash` interruption kills/closes the active terminal session and reports an interrupted tool outcome; background `run_bash` behavior is unchanged and documented as out of scope.
- AC-012: LLM provider tests/mocks verify the active turn signal is passed through BaseLLM and provider adapters, and an abort does not get reported as a normal LLM error.
- AC-013: Architecture/code review verifies component boundaries, state-machine transitions, event routing rules, and final work-package safety gates match the design; no implementation path leaves `AgentWorker` as the owner of turn-local LLM/tool control flow.
- AC-014: Final source review verifies no duplicate control-flow owners remain: normal turn execution no longer depends on `WorkerEventDispatcher` dispatching the old LLM/tool/continuation handler chain, and remaining event/listener code is limited to external input boundaries, lifecycle observation, or external event delivery only.
- AC-015: Naming review verifies event-inbox dispatch targets live under `agent/event-inbox/handlers`, expose `InboxEventHandler.handle(...)`, use `*InboxEventHandler` class names and `AgentEventSchedulerHandlers`, and contain no event-inbox `*EventProcessor` / `processors/` naming while preserving processor-pipeline terminology for real processors.
- AC-016: Interrupted-turn memory tests verify that after a user message is accepted and the turn is interrupted, the next LLM request still includes a provider-safe memory projection of that user message and an interrupted-turn marker. If assistant output or tool execution was emitted/completed before interruption, those facts remain in raw/event history and the future working context does not claim they never happened. Tests also verify no code path restores the working context wholesale to the pre-turn checkpoint on normal interrupt.

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
- Adding explicit interruption lifecycle events requires coordinated protocol/frontend updates if a separate `TOOL_EXECUTION_INTERRUPTED` message is chosen.
- If future product requirements want “interrupt only selected turn ID” from UI, the transport payload may need to include the active turn ID consistently for teams and single agents.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| UC-001 | FR-001, FR-002, FR-003, FR-004D1, FR-004D2, FR-004D3, FR-006, FR-007, FR-009, FR-014, FR-015, FR-016, FR-017 |
| UC-002 | FR-001, FR-002, FR-004, FR-004A, FR-004B, FR-004C, FR-004D, FR-004D1, FR-004D2, FR-004D3, FR-004E, FR-005B, FR-006, FR-007, FR-010, FR-014, FR-015, FR-016, FR-017 |
| UC-003 | FR-004B, FR-004C, FR-004D, FR-004D1, FR-004D2, FR-004D3, FR-005, FR-005A, FR-005B, FR-006, FR-014, FR-015, FR-016, FR-017, FR-018 |
| UC-004 | FR-012, FR-013, FR-014 |
| UC-005 | FR-011, FR-012, FR-014 |
| UC-006 | FR-009, FR-010 |
| UC-007 | FR-008, FR-008A, FR-008B |
| UC-008 | FR-004E, FR-004E1, FR-014 |
| UC-009 | FR-003, FR-004, FR-006, FR-007, FR-014, FR-019 |

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
| AC-004D | Active-turn events are fenced from turn-starting events. |
| AC-004D1 | AgentEventInbox is the semantic runtime inbox above queue storage. |
| AC-004D2 | AgentEventScheduler owns dispatch decisions by event class/lane and runtime/turn state. |
| AC-004D3 | Typed inbox event handlers delegate to pipelines/domain owners without recreating old phase-handler choreography. |
| AC-004E | `AgentExternalEventNotifier` is the outbound boundary for new interruption events, remains observation-only, and is not wrapped by a separate AgentOutbox. |
| AC-004E1 | Existing inter-agent/system-task observable event consumers remain compatible after removing the outbox wrapper. |
| AC-005 | Pending approval state is cleared safely. |
| AC-005A | External approval/denial routes through runtime validation into TurnToolInputPort. |
| AC-005B | External/async tool results route through runtime validation into TurnToolInputPort and rejoin the normal tool-result continuation pipeline. |
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
| AC-015 | Event-inbox handler naming is behavior-neutral and distinct from both legacy handlers and real processor pipelines. |
| AC-016 | Interrupt finalizes history/memory correctly: accepted/emitted/executed facts are retained, unsafe protocol continuation is fenced, and future LLM context remembers the interrupted turn safely. |

## Approval Status

User explicitly requested analysis and design. No separate approval round has been captured yet; this document is design-ready as the requirements basis for architecture review, with approval state to be called out in handoff.
