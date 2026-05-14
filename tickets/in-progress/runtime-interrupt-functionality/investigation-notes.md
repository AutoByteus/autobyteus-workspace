# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; requirements refined; design produced in companion artifact.
- Investigation Goal: Understand the current Autobyteus runtime stop/control model, AgentTurn / AgentLoop ownership, LLM-call execution, tool-call execution, status/event propagation, and API/UI command surfaces sufficiently to design interrupt functionality.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: Interrupt spans runtime lifecycle, in-flight async operation cancellation, tool process/adapter behavior, LLM provider invocation, API/event surfaces, native team propagation, and user-visible state semantics.
- Scope Summary: Design a first-class interrupt capability distinct from stop, able to interrupt current LLM call, current tool call, pending approval/continuation, active AgentTurn, and native team active member work.
- Primary Questions To Resolve:
  - Where is stop currently owned and how does it propagate?
  - Where are AgentLoop and AgentTurn boundaries implemented?
  - How do LLM calls and tool calls execute, stream, and report outcomes?
  - Which cancellation primitives already exist or are missing?
  - Which surfaces need interrupt API/events/status?

## Request Context

User asked on 2026-05-05: “codex, and claude code both of them have abort functionality, but autobyteus runtime does not have abort functionality. Because currently autobyteus only has stop funcitonality, not interrupt. Please analyse, and design interrupt functionality. In general, I think interrupt should not only be able to, so if you look at the think about what agent is doing, it is reacting to a, let's say, whatever, let's say, so interrupt should not only interrupt the current running LLM call, right? It should also interrupt the current running tool call. Which possibly means the current AgentTurn or AgentLoop. Basically the AgentTurn or AgentLoop itself can be interrupted”.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-interrupt-functionality`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-interrupt-functionality/tickets/in-progress/runtime-interrupt-functionality`
- Current Branch: `codex/runtime-interrupt-functionality`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-interrupt-functionality`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-05-05 before worktree creation.
- Task Branch: `codex/runtime-interrupt-functionality` created from `origin/personal`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Authoritative artifacts for this task live under the task worktree path above, not the shared superrepo checkout.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-05 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git symbolic-ref refs/remotes/origin/HEAD && git branch --show-current` | Bootstrap repo context | Shared checkout is Git repo on branch `personal`, tracking `origin/personal`; remote default resolves to `refs/remotes/origin/personal`. | No |
| 2026-05-05 | Command | `git fetch origin --prune && git worktree list --porcelain && git branch --list 'codex/*interrupt*' 'codex/design-interrupt-functionality'` | Refresh remotes and identify existing task worktrees | Remote refresh succeeded. Existing interrupt-related worktrees exist but none for this exact runtime-interrupt design task. | No |
| 2026-05-05 | Command | `git worktree add -b codex/runtime-interrupt-functionality /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-interrupt-functionality origin/personal` | Create dedicated task branch/worktree | Created branch `codex/runtime-interrupt-functionality` tracking `origin/personal`. | No |
| 2026-05-05 | Command | `find . -maxdepth 2 -type d` and package manifest scan | Identify monorepo structure | Repo contains `autobyteus-ts`, `autobyteus-server-ts`, `autobyteus-web`, SDKs, gateway, applications, docs, tickets. | No |
| 2026-05-05 | Command | `rg -n "\b(AgentLoop|AgentTurn|stop|cancel|abort|interrupt|AbortSignal|ToolCall|LLM)\b" ...` | Locate runtime stop/interrupt/abort references across core, server, and web | Found native `AgentRuntime.stop`, `AgentWorker.stop`, server `AgentRunBackend.interrupt`, Codex/Claude interrupt implementations, and Autobyteus backend interrupt mapped to stop. | No |
| 2026-05-05 | Code | `autobyteus-ts/src/agent/runtime/agent-runtime.ts` | Inspect single-agent runtime lifecycle boundary | `stop()` applies `ShutdownRequestedEvent`, calls `worker.stop(timeout)`, unregisters context, and emits `AgentStoppedEvent`; no `interrupt()` exists. | Yes: design separate interrupt API. |
| 2026-05-05 | Code | `autobyteus-ts/src/agent/runtime/agent-worker.ts` | Inspect AgentLoop stop behavior | Worker loop awaits each dispatched handler. `stop()` only sets flags, enqueues `AgentStoppedEvent`, and races loop promise with timeout; it cannot preempt the currently awaited handler. | Yes: design out-of-band active-turn cancellation. |
| 2026-05-05 | Code | `autobyteus-ts/src/agent/agent-turn.ts` | Inspect AgentTurn ownership | `AgentTurn` stores turn ID and active tool batch only; no AbortController, interrupted status, settlement outcome, or active operation identity. | Yes: make turn scoped cancellation owner. |
| 2026-05-05 | Code | `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | Inspect active turn and pending approval state | Runtime state owns `activeTurn`, `pendingToolApprovals`, `recentSettledInvocationIds`, and turn completion notifications. It can become the right place to settle/clear interrupted active turn state. | Yes: add interruption helpers. |
| 2026-05-05 | Code | `autobyteus-ts/src/agent/events/agent-input-event-queue-manager.ts` | Inspect event queue ownership and ordering | Queue manager prioritizes tool continuation and gates external input while `activeTurn !== null`. It has no clear/drop-by-turn support; some continuation events currently lack explicit turn IDs. | Yes: add turn-scoped queue invalidation and turn identity on tool continuation. |
| 2026-05-05 | Code | `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts` | Inspect LLM execution path | Handler prepares request, awaits `llmInstance.streamMessages(...)`, emits segment events, parses tool invocations, ingests assistant response, and enqueues `LLMCompleteResponseReceivedEvent`. It passes no signal and handles stream errors as LLM errors. | Yes: pass turn signal, catch interruption separately, avoid normal completion/error side effects. |
| 2026-05-05 | Code | `autobyteus-ts/src/llm/base.ts` and `autobyteus-ts/src/llm/api/*.ts` | Inspect LLM invocation abstraction and providers | BaseLLM has no cancellation option. Providers call OpenAI/Anthropic/Gemini/Ollama/Autobyteus/Mistral clients with kwargs as provider params. Need a separate invocation options channel to avoid leaking `signal` into model params. | Yes: extend BaseLLM/provider protected method signatures. |
| 2026-05-05 | Code | `autobyteus-ts/src/agent/handlers/tool-invocation-execution-event-handler.ts` | Inspect tool execution path | Handler awaits `toolInstance.execute(context, arguments_)`; catches all tool errors as normal tool failure; always enqueues a `ToolResultEvent`. No cancellation option or stale-late-result guard for interruption. | Yes: pass tool execution options, emit interrupted lifecycle, suppress result continuation. |
| 2026-05-05 | Code | `autobyteus-ts/src/tools/base-tool.ts` | Inspect tool abstraction | `execute(context,args)` validates and calls `_execute(context,args)`; no `AbortSignal` or interrupt hook. | Yes: extend execution options and optional interrupt hook. |
| 2026-05-05 | Code | `autobyteus-ts/src/tools/terminal/tools/run-bash.ts`, `terminal-session-manager.ts`, `direct-shell-session.ts`, `pty-session.ts` | Inspect foreground command cancellation potential | Foreground `run_bash` creates a `TerminalSessionManager`, executes command, and closes in finally. Sessions support `close()` that sends SIGTERM/SIGKILL, but the manager has no signal-aware execution path. | Yes: make foreground terminal execution signal-aware. |
| 2026-05-05 | Code | `autobyteus-ts/src/tools/mcp/tool.ts`, `tools/mcp/server/base-managed-mcp-server.ts` | Inspect remote MCP tool call path | Generic MCP tool proxies to `callTool` with timeout only; no cancellation signal. | Yes: pass cancellation to MCP call when client supports options and abandon locally otherwise. |
| 2026-05-05 | Code | `autobyteus-ts/src/agent/status/*`, `agent/events/notifiers.ts`, `agent/streaming/*` | Inspect status and stream lifecycle events | Status enum has shutdown/error/processing states but no interrupting state. Turn stream has started/completed only. Tool stream has approval/approved/denied/started/succeeded/failed only. | Yes: add interrupting/interrupted metadata or events. |
| 2026-05-05 | Code | `autobyteus-server-ts/src/agent-execution/backends/agent-run-backend.ts`, `domain/agent-run.ts` | Inspect server run command contract | Shared backend contract already has `interrupt(turnId?)`. Domain `AgentRun.interrupt()` delegates to backend. | No for contract; implement native backend. |
| 2026-05-05 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts` | Inspect native server interrupt mapping | `AutoByteusAgentRunBackend.interrupt()` checks `agent.stop` and calls `agent.stop()`. This is the exact stop/interrupt conflation reported by user. | Yes: call `agent.interrupt()`. |
| 2026-05-05 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` and `codex-agent-run-backend.ts` | Compare Codex interrupt behavior | Codex backend calls `turn/interrupt` with active turn ID. Confirms shared command path is designed around interrupt rather than terminate. | No |
| 2026-05-05 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts`, `claude-active-turn-execution.ts`, `claude-session-event-converter.ts` | Compare Claude interrupt behavior | Claude session creates per-turn `AbortController`, marks active turn interrupted, clears pending approvals, closes active query, awaits settled task, emits turn interrupted, maps it to TURN_COMPLETED + IDLE. Useful target pattern for native Autobyteus. | No |
| 2026-05-05 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts` | Inspect native team interrupt mapping | Native team backend also calls `team.stop()` inside `interrupt()`. | Yes: add native team interrupt propagation. |
| 2026-05-05 | Code | `autobyteus-ts/src/agent-team/agent-team.ts`, `runtime/agent-team-runtime.ts`, `context/team-manager.ts`, shutdown steps | Inspect native team ownership | Team runtime has stop only. TeamManager can enumerate cached agents/subteams, and shutdown steps already stop all running nodes for teardown. Interrupt should reuse/extend TeamManager enumeration without running shutdown cleanup. | Yes: add team interrupt API and propagation. |
| 2026-05-05 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`, `agent-team-stream-handler.ts`, `models.ts` | Inspect original WebSocket command path | Original baseline had app-owned stop-generation naming while server behavior called `activeRun.interrupt(...)` / `activeRun.interrupt()` for teams. The current ticket worktree has since renamed this command to `INTERRUPT_GENERATION`. | No major transport blocker; preserve interrupt semantics. |
| 2026-05-05 | Code | `autobyteus-web/services/agentStreaming/*`, `stores/agentRunStore.ts`, `stores/agentTeamRunStore.ts`, `types/agent/AgentStatus.ts`, `composables/useStatusVisuals.ts` | Inspect original frontend command/status representation | Original baseline used stop-generation naming while semantically aborting the current generation. The current ticket worktree has since renamed the client command/store service path to `interruptGeneration` / `INTERRUPT_GENERATION`. | Yes: preserve stream feedback semantics and UI state clearing. |
| 2026-05-05 | Code | `autobyteus-ts/tests/integration/agent/runtime/agent-runtime.test.ts` | Inspect current runtime validation patterns | Existing tests cover start/stop and active-turn queue ordering with controllable LLM. This is a good place for native interrupt tests. | Yes |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: For single-agent UI, `AgentUserInputTextArea.handleStop()` calls `activeContextStore.interruptGeneration()`, `agentRunStore.interruptGeneration(...)`, and `AgentStreamingService.interruptGeneration()`, which sends `{ type: 'INTERRUPT_GENERATION' }`; server `AgentStreamHandler` resolves the active run and calls `activeRun.interrupt(null)`. Team UI follows the analogous `agentTeamRunStore` / `TeamStreamingService` / `AgentTeamStreamHandler` path and calls `activeRun.interrupt()`.
- Current execution flow:
  - Native single-agent runtime: `Agent.postUserMessage()` -> `AgentRuntime.submitEvent()` -> `AgentWorker.asyncRun()` -> `WorkerEventDispatcher.dispatch()` -> `UserInputMessageEventHandler` -> `LLMUserMessageReadyEventHandler` -> `BaseLLM.streamMessages()` -> provider stream -> optional tool invocation events -> `ToolInvocationExecutionEventHandler` -> `BaseTool.execute()` -> `ToolResultEventHandler` -> tool continuation -> next LLM call -> `AgentIdleEvent`.
  - Native single-agent stop: `Agent.stop()` -> `AgentRuntime.stop()` -> `AgentWorker.stop()` -> loop stop flag + shutdown cleanup -> terminal `AgentStoppedEvent`.
  - Current native backend interrupt: server `AutoByteusAgentRunBackend.interrupt()` -> `agent.stop()` -> runtime shutdown.
- Ownership or boundary observations:
  - `AgentRuntime`/`AgentWorker` own runtime lifecycle but not active-turn cancellation.
  - `AgentRuntimeState` owns active-turn identity and should own turn settlement/invalidation helpers.
  - `AgentTurn` is the natural owner for turn-scoped signal, interrupted flag, current active tool batch, and turn settlement outcome.
  - LLM providers and tools are boundary adapters that must translate a runtime AbortSignal into provider/tool-specific cancellation.
  - Server `AgentRunBackend` is already the authoritative command boundary for cross-runtime interrupt; Autobyteus backend bypasses that semantic by calling stop.
- Current behavior summary: There is a shared interrupt command surface, but native Autobyteus implements it as terminal stop and the core native runtime lacks any mechanism to abort in-flight LLM/tool/turn work.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Behavior Change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue + Missing Invariant
- Refactor posture evidence summary: Refactor needed now. Adding only `AutoByteusAgentRunBackend.interrupt()` would not cancel the current LLM/tool await because the core runtime has no turn-scoped cancellation owner and handlers do not accept signals.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User request | Stop exists but interrupt does not; interrupt must affect LLM call, tool call, and AgentTurn / AgentLoop. | Cross-boundary runtime-control capability, not a local UI change. | Design core runtime interrupt control. |
| `AgentWorker.stop` | Stop only sets flags and waits for loop promise; active dispatch can stay blocked. | Stop cannot satisfy interrupt semantics. | Add out-of-band active-turn AbortSignal. |
| `AgentTurn` | Tracks only tool batches. | Missing turn cancellation invariant. | Extend turn model or add owned turn control. |
| `LLMUserMessageReadyEventHandler` | Awaits stream without signal and treats stream errors as LLM errors. | LLM abort must be a separate outcome, not normal error. | Add signal + interrupt error handling. |
| `ToolInvocationExecutionEventHandler` | Awaits execute without signal and always enqueues result. | Tool interruption would currently either hang or become a normal error/result. | Add tool cancellation options and late-result suppression. |
| Native Autobyteus server backend | `interrupt()` calls `stop()`. | Direct boundary/ownership mismatch at backend command boundary. | Call native interrupt API after it exists. |
| Claude backend | Per-turn `AbortController`, interrupted flag, pending approval cleanup, query close, turn-interrupted event. | Provides proven shape to adapt to native runtime. | Use similar ownership, not copy implementation blindly. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/agent/runtime/agent-runtime.ts` | Runtime lifecycle and public runtime command boundary | Start/stop only; stop is terminal. | Add `interrupt()` command while preserving stop. |
| `autobyteus-ts/src/agent/runtime/agent-worker.ts` | Serialized event loop and active dispatch await | Cannot process queued interrupt while handler is awaited. | Runtime interrupt must signal current active turn directly/out-of-band. |
| `autobyteus-ts/src/agent/agent-turn.ts` | Turn ID and tool batch tracking | No cancellation or outcome state. | Turn should own AbortController/interrupted settlement. |
| `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | Active turn, pending approvals, runtime state | Has the state needed to clear turn-scoped work but lacks helpers. | Add active-turn interruption/settlement helpers. |
| `autobyteus-ts/src/agent/events/agent-input-event-queue-manager.ts` | Prioritized event queues and active-turn gating | No removal/filtering API; tool continuation event lacks turn identity. | Add turn-scoped queue invalidation and explicit turn IDs for continuation. |
| `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts` | Request assembly, LLM stream, segment events, tool parsing | No signal; incomplete segment/tool handling on abort absent. | Pass signal; interrupt streaming handler; suppress completion. |
| `autobyteus-ts/src/agent/streaming/handlers/*` | Convert LLM chunks into segments/tool invocations | `finalize()` assumes normal completion and may parse incomplete tool args. | Add explicit `interrupt()` finalization path that marks open segments interrupted and does not create invocations from partial data. |
| `autobyteus-ts/src/llm/base.ts` | LLM invocation abstraction | No invocation options channel separate from provider kwargs. | Add `LLMInvocationOptions` with signal. |
| `autobyteus-ts/src/llm/api/*` | Provider adapters | No signal mapping. | Each adapter maps/catches abort under its own boundary. |
| `autobyteus-ts/src/tools/base-tool.ts` | Tool validation/execution template | No `ToolExecutionOptions`. | Add optional signal/options to `execute`/`_execute`. |
| `autobyteus-ts/src/tools/terminal/*` | Foreground/background shell commands | Sessions can close/kill, manager cannot receive signal. | Make foreground execution abort-aware. |
| `autobyteus-ts/src/tools/mcp/*` | MCP tool adapter | Timeout only; no cancellation signal. | Pass signal where transport supports, race/abandon locally otherwise. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts` | Native Autobyteus backend command adapter | `interrupt()` calls `agent.stop()`. | Replace with `agent.interrupt()`. |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts` | Native Autobyteus team command adapter | `interrupt()` calls `team.stop()`. | Replace with `team.interrupt()`. |
| `autobyteus-ts/src/agent-team/*` | Native team runtime/facade/manager | Stop only, no interrupt propagation. | Add team interrupt that propagates to running nodes without shutdown. |
| `autobyteus-web/services/agentStreaming/*`, `stores/*` | Client command send/status handling | Existing “stop generation” command already maps to backend interrupt, but naming/status lacks explicit interrupt. | Minimal protocol changes or internal rename/status additions depending implementation choice. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-05 | Static trace | Manual source trace from `AgentStreamingService.stopGeneration()` through server `AgentStreamHandler.handleStopGeneration()` to `AgentRunBackend.interrupt()` implementations. | Shared command path is already “interrupt” at server domain level. Codex/Claude implement real interrupt, Autobyteus maps to stop. | Native runtime/backend gap is isolated enough to design without reinventing cross-runtime command abstraction. |
| 2026-05-05 | Static trace | Manual source trace from `AgentWorker.asyncRun()` through LLM/tool handlers. | Active dispatch is awaited synchronously by the worker loop; queue-based events cannot preempt current handler. | Interrupt needs direct active-turn signal and handler/provider/tool cooperation. |
| 2026-05-14 | Static trace / source inspection | `find autobyteus-ts/src/agent -maxdepth 3 -type f` filtered with `rg` for message-inbox, event-inbox, turn-tool, agent-turn-runner, llm phase, tool-phase, and events/agent-events paths; `sed -n` on `agent-inbox-message.ts`, `agent-message-inbox.ts`, `agent-runtime.ts`; `rg` for event and inbox wrapper references. | Current first-stage code has `AgentMessageInbox` / `AgentInboxMessage` wrappers around typed events, while `AgentTurnRunner` and `AgentInputPipeline` already consume `UserMessageReceivedEvent` / `InterAgentMessageReceivedEvent` directly; tool command wrappers duplicate existing `ToolExecutionApprovalEvent` / `ToolResultEvent`. | Final design should be event-centric: `AgentEventInboxEntry` wraps only queue metadata, canonical payload remains typed event, and `ToolExecutionApprovalEvent` / `ToolResultEvent` route through scheduler/handlers to `TurnToolInputPort`. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used. Investigation relied on local repository code.
- Version / tag / commit / freshness: Local branch `codex/runtime-interrupt-functionality` at base `origin/personal` as of 2026-05-05.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: No runtime services started. Existing test patterns in `autobyteus-ts/tests/integration/agent/runtime/agent-runtime.test.ts` provide controllable LLM mocks for future validation.
- Required config, feature flags, env vars, or accounts: None for investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree/branch creation only.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. The server/domain layer already distinguishes interrupt from terminate. This is visible in `AgentRunBackend.interrupt()` and `AgentRun.terminate()` as separate methods.
2. The native Autobyteus backend violates the interrupt boundary by mapping interrupt to `agent.stop()`, while Codex and Claude map interrupt to turn/session abort operations.
3. The core native runtime cannot satisfy interrupt by backend changes alone because current active LLM/tool handlers cannot be preempted by an enqueued event.
4. The natural authoritative boundary for native interruption is AgentRuntime/AgentTurn: runtime receives command; active turn owns signal/outcome; handlers/providers/tools cooperate and report interruption, not success/failure/shutdown.
5. Existing queue-ordering tests confirm the active-turn gate matters; interrupt must settle the active turn cleanly so queued external messages can continue without violating ordering.
6. Terminal foreground tools have a feasible cancellation mechanism because sessions support `close()` that kills the shell, but manager execution needs signal wiring.
7. Team stop is shutdown/cleanup oriented and currently stops/removes running agents through shutdown steps; team interrupt must not reuse this path as-is.

## Constraints / Dependencies / Compatibility Facts

- Existing `stop()` semantics are terminal and used by removal/shutdown paths; do not repurpose stop.
- Current ticket protocol uses `INTERRUPT_GENERATION` and store/service methods named `interruptGeneration`. Existing frontend behavior deliberately does not clear `isSending` optimistically; it waits for stream feedback such as `TURN_INTERRUPTED` or idle/error/shutdown status. Native Autobyteus must emit those events/statuses to keep UI behavior aligned with Codex/Claude.
- LLM kwargs are currently forwarded to provider request parameters. Cancellation must not be added as a normal provider kwarg unless each provider strips/translates it; a separate options channel is safer.
- JavaScript async interruption is cooperative; hard preemption of synchronous tool code is not possible.
- Tool side effects cannot be rolled back generically.

## Open Unknowns / Risks

- Exact AbortSignal support differs by provider SDK; implementation must inspect installed SDK types/docs during coding.
- Some MCP transports may keep remote work running after local cancellation; this should be exposed as local interruption, not tool success.
- If a provider/tool promise ignores signal and later rejects, implementation must swallow/log late rejection to avoid unhandled promise noise.
- If UI wants a distinct “Interrupted” artifact/timeline event, protocol additions may be required beyond status/turn-completed metadata.

## Notes For Architect Reviewer

- The design should be judged primarily on whether interruption has one authoritative owner (`AgentRuntime` / active `AgentTurn`) and whether stop remains terminal.
- Avoid a design where individual handlers each invent local cancellation state; that would preserve the current boundary problem.
- Avoid a design where server Autobyteus backend continues to call stop or where interrupt is implemented only as a queued event.


## Approval Routing Addendum (AR-B-005 Evidence)

- Current server command path: `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` handles tool approval commands and calls `activeRun.approveToolInvocation(invocationId, approved, reason)`.
- Current domain/backend interface: `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` delegates `approveToolInvocation(...)` to `AgentRunBackend.approveToolInvocation(...)`; `autobyteus-server-ts/src/agent-execution/backends/agent-run-backend.ts` defines that backend method.
- Current native backend path: `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts` calls `agent.postToolExecutionApproval(invocationId, approved, reason)` and maps errors to `AgentOperationResult`.
- Original pre-refactor native facade/runtime path: `autobyteus-ts/src/agent/agent.ts` created `ToolExecutionApprovalEvent` in `postToolExecutionApproval(...)`; `autobyteus-ts/src/agent/runtime/agent-runtime.ts` enqueued it through `inputEventQueues.enqueueToolApprovalEvent(...)`; original event-handler registration included `ToolExecutionApprovalEventHandler`.
- Implemented first-refactor native facade/runtime path: `Agent.postToolExecutionApproval(...) -> AgentRuntime.postToolApproval(...) -> AgentRuntimeState.postToolApprovalToActiveTurn(...) -> TurnToolInputPort.postApproval(...) -> ToolPhase.waitForApproval(...)`.
- Second-stage design impact: preserve this public/runtime approval spine but make the runtime-facing payload the canonical `ToolExecutionApprovalEvent`, routed through the unified `AgentEventInbox` / `AgentEventScheduler` / `ToolApprovalInboxEventHandler` model before delivery to internal `TurnToolInputPort`.

## Current Worktree Baseline Addendum (Second-Stage Event-Inbox Design)

Date: 2026-05-12; revised 2026-05-14 after user review of event-vs-message wrapping.

This addendum uses the already-implemented first refactor in the current ticket worktree as the base for the next design update. Relevant inspected sources:

- `autobyteus-ts/src/agent/runtime/agent-runtime.ts`
- `autobyteus-ts/src/agent/runtime/agent-worker.ts`
- `autobyteus-ts/src/agent/message-inbox/agent-message-inbox.ts`
- `autobyteus-ts/src/agent/message-inbox/agent-inbox-message.ts`
- `autobyteus-ts/src/agent/message-inbox/agent-message-scheduler.ts`
- `autobyteus-ts/src/agent/message-inbox/handlers/*.ts`
- `autobyteus-ts/src/agent/message-inbox/inbox-queue-store.ts`
- `autobyteus-ts/src/agent/loop/turn-tool-input-port.ts`
- `autobyteus-ts/src/agent/loop/agent-turn-runner.ts`
- `autobyteus-ts/src/agent/loop/llm-phase.ts`
- `autobyteus-ts/src/agent/loop/tool-phase.ts`
- `autobyteus-ts/src/agent/context/agent-runtime-state.ts`
- `autobyteus-ts/src/agent/events/agent-events.ts`
- `autobyteus-ts/src/agent/tool-approval-command.ts`
- `autobyteus-ts/src/agent/tool-result-command.ts`

Current implemented path now differs from the original baseline:

- External turn-starting flow is now `AgentRuntime.submitEvent(UserMessageReceivedEvent | InterAgentMessageReceivedEvent) -> AgentMessageInbox.postUserMessage/postInterAgentMessage(...) -> AgentWorker.asyncRun() -> AgentMessageScheduler.nextDispatchable(...) -> TurnStartMessageHandler -> AgentTurnRunner.run(event)`.
- Normal LLM/tool progression is now direct runner/phase flow: `AgentTurnRunner -> AgentInputPipeline -> LlmPhase -> ToolPhase -> ToolResultPipeline -> ToolResultContinuationBuilder -> AgentInputPipeline(SenderType.TOOL) -> LLMResponsePipeline + AgentExternalEventNotifier notifications`.
- External approvals currently route through `Agent.postToolExecutionApproval(...) -> AgentRuntime.postToolApproval(ToolApprovalInputMessage) -> AgentMessageInbox.postToolApproval(...) -> AgentMessageScheduler -> ToolApprovalMessageHandler -> AgentRuntimeState.postToolApprovalToActiveTurn(...) -> TurnToolInputPort.postApproval(...) -> ToolPhase.waitForApproval(...)`.
- The first-stage implementation already has useful lane storage, scheduler, turn runner, phase services, `TurnExecutionScope`, and `TurnToolInputPort`. The remaining issue is not the presence of a mailbox loop; it is the extra domain-message wrapping around an already event-oriented runtime.

Event-vs-message evidence:

- `agent-events.ts` already defines the canonical domain events used by the runtime: `UserMessageReceivedEvent`, `InterAgentMessageReceivedEvent`, `LifecycleEvent`, `ToolExecutionApprovalEvent`, and `ToolResultEvent`.
- `agent-turn-runner.ts` already accepts `AgentTurnTrigger = UserMessageReceivedEvent | InterAgentMessageReceivedEvent`; `agent-input-pipeline.ts` also processes `UserMessageReceivedEvent | InterAgentMessageReceivedEvent` directly.
- The current `agent-inbox-message.ts` introduces parallel wrappers: `UserInboxMessage` wraps `UserMessageReceivedEvent`, `InterAgentInboxMessage` wraps `InterAgentMessageReceivedEvent`, `RuntimeLifecycleInboxMessage` wraps `LifecycleEvent`, and tool input wrappers use `ToolApprovalInputMessage` / `ToolResultInputMessage` instead of the canonical `ToolExecutionApprovalEvent` / `ToolResultEvent`.
- `agent-message-inbox.ts` therefore performs `Event -> InboxMessage -> Event` wrapping/unwrapping for user/inter-agent/lifecycle events and creates separate command-message shapes for tool approval/result. This is a shared-structure looseness smell: two representations describe the same inbound domain fact.
- Repository reference counts are also asymmetric: event types are already widespread and stable, while the new message-wrapper types are concentrated in the first-stage inbox files/tests. A full conversion to a new message domain would be broad and unnecessary; an event-centric inbox cleanup is the smaller clean-cut refactor.

Second-stage design impact:

- Preserve the successful first-stage extraction of `AgentTurnRunner`, `LlmPhase`, `ToolPhase`, typed pipelines, `TurnExecutionScope`, `TurnToolInputPort`, and external notifications through the existing `AgentExternalEventNotifier`.
- Rename/move the current `message-inbox` concept to an event-centric `agent/event-inbox` subsystem: `AgentEventInbox`, `AgentEventInboxEntry`, `AgentEventScheduler`, typed `InboxEventHandler`s, and private `InboxQueueStore`.
- Keep the canonical payload as a typed `BaseEvent`; the inbox entry only adds queue metadata (`entryId`, `lane`, awaitable completion). Do not introduce or keep domain wrappers such as `UserInboxMessage`, `ToolApprovalInputMessage`, or `ToolResultInputMessage` in the final architecture.
- Route public tool approval commands as `ToolExecutionApprovalEvent` entries through `AgentRuntime.postToolApprovalEvent(...) -> AgentEventInbox.postAwaitableEvent(...) -> AgentEventScheduler -> ToolApprovalInboxEventHandler -> AgentRuntimeState -> TurnToolInputPort`.
- Route future external/async tool results as `ToolResultEvent` entries through `AgentRuntime.postToolResultEvent(...) -> AgentEventInbox -> AgentEventScheduler -> ToolResultInboxEventHandler -> AgentRuntimeState -> TurnToolInputPort`; in-process tool results may still return directly inside `ToolPhase`.
- Keep `TurnToolInputPort` internal and tool-specific. It handles tool approval now and future external/async tool result delivery if tool execution is externalized; non-tool awaited input should get a separate phase-specific primitive.
- Keep `AgentExternalEventNotifier` as the external observable-event boundary and remove the first-stage `AgentOutbox` wrapper from the final design.
- Phase naming refinement from user review: final design should use symmetric `LlmPhase` / `ToolPhase`.

## Event-Inbox Handler Naming Addendum (CR-019 Design Impact)

Date: 2026-05-14.

Code review Round 27 identified a design-language issue after the event-centric inbox refactor implementation: classes under `autobyteus-ts/src/agent/event-inbox/processors/` are not processor pipelines and do not own domain processing chains. They are scheduler-selected handlers/delegates for one `AgentEventInboxEntry`.

Relevant inspected current sources from the review package:

- `autobyteus-ts/src/agent/event-inbox/agent-event-scheduler.ts`
- `autobyteus-ts/src/agent/event-inbox/processors/agent-event-processor.ts`
- `autobyteus-ts/src/agent/event-inbox/processors/turn-start-event-processor.ts`
- `autobyteus-ts/src/agent/event-inbox/processors/tool-approval-event-processor.ts`
- `autobyteus-ts/src/agent/event-inbox/processors/tool-result-event-processor.ts`
- `autobyteus-ts/src/agent/event-inbox/processors/runtime-lifecycle-event-processor.ts`
- `tickets/in-progress/runtime-interrupt-functionality/review-report.md` finding `CR-019`

Observed responsibility:

- Turn-start dispatch target checks active turn state and delegates active-turn creation/task start to the worker/runtime turn-start boundary.
- Tool approval dispatch target checks the event shape and delegates active-turn validation/delivery to `AgentRuntimeState.postToolApprovalEventToActiveTurn(...)`, which then reaches `TurnToolInputPort`.
- Tool result dispatch target delegates active-turn result validation/delivery to `AgentRuntimeState.postToolResultEventToActiveTurn(...)`.
- Runtime lifecycle dispatch target applies lifecycle status and requests worker stop for shutdown/stopped inputs.

Design impact:

- Final design should rename the event-inbox dispatch targets from processor terminology to handler terminology: `event-inbox/handlers/`, `InboxEventHandler`, `TurnStartInboxEventHandler`, `ToolApprovalInboxEventHandler`, `ToolResultInboxEventHandler`, `RuntimeLifecycleInboxEventHandler`, scheduler-facing `AgentEventSchedulerHandlers`, and `handle(entry, context)`.
- This is behavior-neutral and should not add extra behavior to make handlers less thin. Thin delegation is the correct role.
- The handler name is explicitly scoped to `event-inbox` and must not resurrect the removed legacy normal-flow handler chain under `agent/handlers/*`.
- Real processor terminology remains reserved for existing processor pipelines: `AgentInputPipeline`, `ToolInvocationPipeline`, `ToolResultPipeline`, `LLMResponsePipeline`, and `SystemPromptPipeline`.



## Frontend / External Consumer Compatibility Addendum

Date: 2026-05-13.

User review clarified that `AgentExternalEventNotifier` is not merely an output convenience. It is the external-observable projection boundary for facts produced inside the agent, including inter-agent communication facts that downstream consumers render. I inspected the current worktree frontend/server/native event paths to ensure the final design does not remove a consumer-visible event family while removing the first-stage `AgentOutbox` wrapper.

Relevant inspected sources:

- `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue`
- `autobyteus-web/stores/activeContextStore.ts`
- `autobyteus-web/stores/agentRunStore.ts`
- `autobyteus-web/stores/agentTeamRunStore.ts`
- `autobyteus-web/services/agentStreaming/AgentStreamingService.ts`
- `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`
- `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts`
- `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts`
- `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts`
- `autobyteus-web/services/agentStreaming/handlers/teamHandler.ts`
- `autobyteus-web/stores/teamCommunicationStore.ts`
- `autobyteus-server-ts/src/services/agent-streaming/models.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts`
- `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts`
- `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-event-processor.ts`
- `autobyteus-server-ts/src/agent-execution/events/processors/team-communication/team-communication-message-event-processor.ts`
- `autobyteus-ts/src/agent/events/notifiers.ts`
- `autobyteus-ts/src/agent/streaming/streams/agent-event-stream.ts`
- `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts`
- `autobyteus-ts/src/agent/outbox/agent-outbox.ts`

Findings:

1. Current frontend interrupt command path is already named interrupt: `AgentUserInputTextArea` calls `activeContextStore.interruptGeneration()`, which routes to `agentRunStore.interruptGeneration(runId)` or `agentTeamRunStore.interruptGeneration(teamRunId)`. `AgentStreamingService` and `TeamStreamingService` send `{ type: 'INTERRUPT_GENERATION' }`.
2. Server command path accepts `ClientMessageType.INTERRUPT_GENERATION`: `AgentStreamHandler` calls `activeRun.interrupt(null)` and `AgentTeamStreamHandler` calls `activeRun.interrupt()`.
3. Native Autobyteus server backends in the current ticket worktree already model the desired backend shape: `AutoByteusAgentRunBackend.interrupt(...)` calls native `agent.interrupt(...)` when present and returns unsupported rather than falling back to stop; `AutoByteusTeamRunBackend.interrupt()` calls native `team.interrupt(...)` when present.
4. Frontend stores intentionally do not clear `isSending` optimistically when interrupt is clicked. Existing tests assert this behavior. `agentStatusHandler.handleTurnInterrupted(...)` and idle/error/shutdown status handling are what clear `isSending` and mark conversations/tool segments terminal.
5. Current protocol definitions include `TURN_INTERRUPTED`, `TOOL_EXECUTION_INTERRUPTED`, `INTER_AGENT_MESSAGE`, and `TEAM_COMMUNICATION_MESSAGE` on both server and frontend sides.
6. Inter-agent observable event chain is currently real and consumer-visible: `AgentInputPipeline.convertInterAgentEvent(...)` calls `outbox.publishInterAgentMessage(...)`; `AgentOutbox.publishInterAgentMessage(...)` forwards to `AgentExternalEventNotifier.notifyAgentDataInterAgentMessageReceived(...)`; `AgentEventStream` maps `AGENT_DATA_INTER_AGENT_MESSAGE_RECEIVED` to `StreamEventType.INTER_AGENT_MESSAGE`; server conversion maps it to `AgentRunEventType.INTER_AGENT_MESSAGE`; native team event processing enriches team/member metadata; `TeamCommunicationMessageProcessor` derives `TEAM_COMMUNICATION_MESSAGE`; `TeamStreamingService` sends `INTER_AGENT_MESSAGE` to `handleInterAgentMessage(...)` for conversation segment rendering and sends `TEAM_COMMUNICATION_MESSAGE` to `teamCommunicationStore.upsertFromBackendPayload(...)`.
7. Therefore the final design may remove `AgentOutbox` only by replacing outbox forwarding calls with direct semantic `AgentExternalEventNotifier` calls (or a tight notifier interface over that same owner). It must not remove `notifyAgentDataInterAgentMessageReceived(...)` / `notifyAgentDataSystemTaskNotificationReceived(...)` publications or change the payload fields consumed by the server/frontend chain.

Verification command run from `autobyteus-web`:

```bash
pnpm exec vitest run \
  services/agentStreaming/__tests__/AgentStreamingService.spec.ts \
  services/agentStreaming/__tests__/TeamStreamingService.spec.ts \
  services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts \
  services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts \
  stores/__tests__/agentRunStore.spec.ts \
  stores/__tests__/agentTeamRunStore.spec.ts \
  stores/__tests__/teamCommunicationStore.spec.ts
```

Result: passed, 7 test files / 61 tests. This focused run covered frontend interrupt command sending, no optimistic `isSending` clearing, turn/tool interrupted handlers, team streaming dispatch, and team communication store normalization. An earlier accidental broad `pnpm test:nuxt -- run ...` run executed the whole web suite and failed one unrelated localization glossary test (`zhCnGlossaryConsistency` deprecated term check); the focused streaming/store run passed.

Design impact:

- `AgentExternalEventNotifier` wording in the design should be read as “events observable by consumers outside the internal agent control loop,” not as “events that originated outside the agent.”
- Add an explicit inter-agent/system-task external-consumer data-flow spine and acceptance criteria.
- Add explicit frontend interrupt contract: native Autobyteus must emit `TURN_INTERRUPTED`, optional `TOOL_EXECUTION_INTERRUPTED`, and idle status feedback through the same event stream/server/frontend path used by Codex/Claude-compatible UI handling.

## Interrupted Turn Memory / Working Context Addendum

Date: 2026-05-14.

User reported an Electron-built runtime scenario where the visible conversation showed an earlier interrupted task request (for example, “think about a game which you can create in html and create it and play yourself”), but later model responses claimed the first user message was “stop please.” This strongly indicates divergence between visible/event history and the working context used to populate later LLM prompts.

Relevant inspected sources in the current worktree:

- `autobyteus-ts/src/agent/context/agent-runtime-state.ts`
- `autobyteus-ts/src/agent/agent-turn.ts`
- `autobyteus-ts/src/agent/loop/agent-turn-runner.ts`
- `autobyteus-ts/src/memory/memory-manager.ts`
- `autobyteus-ts/src/memory/working-context-snapshot.ts`
- `autobyteus-ts/src/agent/llm-request-assembler.ts`
- `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts`
- `autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts`

Findings:

1. `AgentRuntimeState.startActiveTurn(...)` creates an `AgentTurn` and currently attaches a working-context checkpoint from `memoryManager.createWorkingContextTurnCheckpoint(nextTurnId)`.
2. `AgentTurnRunner` catches `AgentInterruptionError` and calls `this.context.state.restoreWorkingContextForInterruptedTurn(turnId)` before publishing `AgentTurnInterruptedEvent`.
3. `AgentTurn.restoreWorkingContextCheckpoint(...)` calls `memoryManager.restoreWorkingContextTurnCheckpoint(checkpoint)`, which resets `MemoryManager.workingContextSnapshot` back to the checkpoint messages.
4. `LLMRequestAssembler.prepareRequest(...)` appends the current user message to `memoryManager.workingContextSnapshot` before rendering the final LLM payload, while `MemoryIngestInputProcessor` also records accepted user input as raw trace through `memoryManager.ingestUserMessage(...)`.
5. Therefore the raw trace/event/UI history may contain the accepted user message and observed activity, while `workingContextSnapshot` can be reset to the pre-turn checkpoint after interrupt. Later LLM requests are populated from `memoryManager.getWorkingContextMessages()`, so the model may not see the interrupted turn's accepted user message even though the UI still displays it.

Design impact:

- This exposes a boundary/ownership issue: `AgentTurn` / `AgentTurnRunner` should not define memory rollback policy by restoring the working context wholesale to a pre-turn checkpoint.
- `AgentTurn` should own execution lifecycle only: interrupt, settlement, tool input port, execution scope, private execution handle.
- `MemoryManager` / memory subsystem should own raw trace retention, working-context projection, and interrupted-turn memory finalization.
- Correct semantic rule: everything already accepted/emitted/executed before interrupt is history. Interrupt fences future continuation and unsafe provider protocol state; it does not erase accepted user input or observed tool/assistant facts.
- The final design should replace wholesale pre-turn working-context restore on normal interrupt with generic memory operations: commit facts when they happen, separate raw fact ingestion from same-turn LLM continuation, and repair/project the future working context into an LLM-safe message sequence. Memory should not expose a turn-lifecycle method such as `finalizeInterruptedTurn(...)`; `AgentTurn` / phase services decide interruption and continuation policy, while `MemoryManager` only stores facts and projects prompt context.
