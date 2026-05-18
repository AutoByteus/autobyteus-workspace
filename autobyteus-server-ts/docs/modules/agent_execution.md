# Agent Execution

## Scope

Manages runtime agent runs and message execution flow.

## TS Source

- `src/agent-execution/services/agent-run-manager.ts` (`AgentRunManager`)
- `src/agent-execution/services/agent-run-command-coordinator.ts`
- `src/agent-execution/services/agent-run-command-registry.ts`
- `src/agent-execution/services/agent-run-command-status-overlay-store.ts`
- `src/agent-execution/services/agent-run-provisioning-service.ts`
- `src/agent-execution/services/agent-run-status-projection-service.ts`
- `src/api/graphql/types/agent-run.ts`
- `src/services/agent-streaming/agent-stream-handler.ts`
- `src/api/websocket/agent.ts`

## Notes

Runtime managers compose definitions, prompts, tools, processors, and workspace context.

`AgentRunManager` also owns active-run sidecars that must be attached independently of websocket clients. For Codex and Claude runs with a `memoryDir`, it attaches `AgentRunMemoryRecorder` so accepted user commands and normalized runtime events are written to server-owned local memory even when no browser is subscribed to the live stream. Native AutoByteus runs are skipped by that recorder because their memory remains owned by the native `autobyteus-ts` memory manager.

`AgentRun.postUserMessage(...)` exposes an internal command-observer seam. Observers are notified only after the message is accepted, and observer failures are isolated from the user-message result.

See [Agent Memory](./agent_memory.md) for the storage-only recorder contract and memory-file boundaries.

## Standalone Command Lifecycle

Standalone user-message dispatch is owned by the backend command boundary, not
by frontend restore/start orchestration. `AgentRunCommandCoordinator` accepts
`SEND_MESSAGE` commands for a durable `runId`, validates required
`message_id` and `dedupe_key`, publishes command-level lifecycle status when an
inactive run must be activated, resolves the active runtime, forwards the
message, records activity, and returns an `AGENT_COMMAND_ACK`.

The command registry is scoped by `(runId, message_id)`. A retry with the same
message id is idempotent and returns the current/original acknowledgement state.
A different message id while the run already has a `STARTING` or `FORWARDED`
command is rejected with `RUN_COMMAND_IN_PROGRESS` instead of being queued.
Terminal command records are retained in process for at least 15 minutes.

For inactive historical runs and prepared-new identities, the coordinator
publishes a command overlay `AGENT_STATUS { status: "initializing",
can_interrupt: false }` before runtime restore/start work. During an
inactive-start command, runtime readiness remains an internal fact until the
accepted message has been handed to the runtime. The overlay is replaced only by
command-correlated post-handoff lifecycle signals: command-start `AGENT_STATUS
initializing`, explicit `TURN_STARTED`, command-correlated `AGENT_STATUS`,
terminal/error events after handoff, or coordinator activation/post failure
handling. Restored runtime snapshots/readiness, WebSocket bind success,
`statusHint=ACTIVE` alone, metadata `lastKnownStatus=ACTIVE`, and active runtime
snapshot availability do not clear or replace the overlay. If activation fails
before runtime command evidence is available, the overlay moves to
non-interruptible `error` and the acknowledgement includes the failure
code/message.

New standalone first-message flow uses `prepareAgentRun(...)`, not
`createAgentRun(...)`, before the WebSocket command. Preparation creates a
durable run identity, run metadata, history row, and memory directory with
`activationState: "PREPARED"`, `platformAgentRunId: null`, and no active
runtime. The first accepted `SEND_MESSAGE` activates that prepared identity
through `activatePreparedRun(...)`, transitions metadata through `ACTIVATING`
to `ACTIVATED`, and records the platform run id when one exists. Prepared runs
can be explicitly cancelled before activation, and stale prepared identities are
eligible for TTL cleanup without affecting activated or historical runs.

`AgentRun.postUserMessage(...)` remains the runtime-level status and turn
authority once an `AgentRun` exists. Its runtime events are the source that
replaces command overlays and drives later `running`, `idle`, `offline`, and
`error` projections.

## Runtime Segment Identity And Ordering

Provider adapters own the stream segment identities they emit. Text segments must
use provider message/content-block identity when it is available, and may fall
back to runtime-generated identities only for genuinely anonymous stream text.
They must not use the whole turn id as the text segment id for all assistant
text in a turn, because clients intentionally coalesce later content into an
existing rendered segment when `segment_type` and `id` match.

Adapters also own the ordering boundary between assistant text and tool
lifecycles. If a provider emits `assistant text -> tool_use/tool_result ->
assistant text`, the runtime must emit separate text segment completion events
at the provider text-block boundaries so live streaming, team fanout,
run-history projection, and storage-only memory traces all preserve the same
assistant/tool/assistant order without frontend provider-specific repair logic.

## Runtime Tool Lifecycle Normalization

Provider adapters must keep tool calls on two runtime-neutral lanes:

- `SEGMENT_START` / `SEGMENT_END` owns transcript/conversation structure for a tool call and can provide enough normalized display facts for the frontend to seed a pending Activity row immediately.
- `TOOL_APPROVAL_*` and `TOOL_EXECUTION_*` owns execution/approval status, terminal result/error, logs, argument hydration, and durable tool traces.

Provider-specific tool identities and result envelopes must be canonicalized at
the runtime event-converter boundary before they become `AgentRunEvent`s.
Frontend streaming handlers, Activity rows, and conversation tool cards consume
the backend-provided tool name and result shape; they must not infer provider
wire protocols such as MCP prefixes.

After provider adapters produce a base normalized event batch, the shared
`AgentRunEventPipeline` runs before subscriber fan-out. The pipeline may append
derived normalized events such as `FILE_CHANGE` for explicit file mutations and
known generated-output tools. File-change projection is not inferred by
streaming handlers or by `RunFileChangeService`; that service consumes
`FILE_CHANGE` only and persists the run-scoped projection.

Claude Agent SDK sessions treat raw assistant `tool_use` blocks as authoritative invocation starts. `tool_use.input` / `tool_use.arguments` is tracked by invocation id, emitted on both the segment metadata lane and lifecycle argument lane, and preserved on terminal `TOOL_EXECUTION_SUCCEEDED` / `TOOL_EXECUTION_FAILED` events as a result-first recovery path. If the Claude SDK permission callback observes the same invocation, the coordinator must reuse that tracked state and suppress duplicate segment-start/lifecycle-start emissions independently.

Claude Agent SDK active-turn closure is owned by the session, not by websocket,
GraphQL, or frontend button state. Each active Claude turn is tracked with its
own `AbortController`, and that controller is passed into the SDK query options.
When a user interrupt or active-run terminate request closes an in-flight Claude
turn, the session clears pending tool approvals, flushes pending
approval/control-response work, aborts and closes the active SDK query, removes
the active query registration, and waits for the active turn task to settle
before the caller continues its terminal lifecycle. A user-requested interrupt is
a normal interrupted terminal path: it must not be recorded as a successful
completed turn and SDK abort/close fallout should not surface as a runtime
`ERROR`. Active terminate reuses the same session-owned closure boundary before
the manager emits `SESSION_TERMINATED` and removes the run session, so row-level
termination remains stronger than interrupt without duplicating abort-first
cleanup policy outside the session. Follow-up messages in the same run or team
member must start from a fresh query resource after that settlement boundary,
but they must still resume the provider conversation when the session has
already adopted a real Claude provider `session_id`. The local run id
placeholder is not a provider session id and must never be sent as the SDK
`resume` value; when no provider `session_id` has been observed before the
closure, provider-level resume is unavailable for that follow-up.

Native AutoByteus runs expose the same user-facing interrupt contract through
the `autobyteus-ts` runtime. `AgentRun.interrupt(...)` delegates to
`AgentRuntime.interrupt(...)`, which targets only the active `AgentTurn` and
leaves the worker/runtime alive for a later follow-up. The native runner passes
the active turn's `AbortSignal` through LLM, MCP, tool, and terminal execution
boundaries where supported, records already committed memory facts plus an
operation-boundary note, and rejects stale approvals/results after the turn
input box is closed. Interrupted-turn memory projection removes unsafe partial
native tool-call protocol from future provider prompts while retaining accepted
user input, interrupted streamed assistant text/reasoning, and completed
tool-result facts. This is distinct from `stop()`, which remains terminal
runtime shutdown and runs cleanup.

Claude browser MCP tools add one extra converter responsibility: allowlisted
`mcp__autobyteus_browser__<tool>` names for known stable browser tools are
projected to canonical names such as `open_tab`, and successful MCP
content-block/content-envelope results are parsed into the standard browser
result object before terminal lifecycle events are emitted. Non-AutoByteus MCP
tools and unknown browser-like suffixes stay unchanged.

Claude team `send_message_to` is also a first-party MCP tool with a canonical
event contract. The dedicated team communication handler owns the logical
delivery invocation and emits canonical segment plus lifecycle events:
`SEGMENT_START`, `TOOL_EXECUTION_STARTED`, one terminal
`TOOL_EXECUTION_SUCCEEDED` or `TOOL_EXECUTION_FAILED`, then `SEGMENT_END`.
Raw SDK transport events named `mcp__autobyteus_team__send_message_to` are
suppressed as duplicate MCP noise; they must not replace the handler-owned
canonical lifecycle or create extra Activity rows.

The frontend consumes both normalized lanes through a shared Activity projection owner: eligible segment starts provide immediate Activity visibility, while lifecycle events update the same invocation through execution and terminal states. The storage-only memory recorder treats lifecycle events, not display-only segments, as durable tool-call/tool-result trace authority. This keeps transcript rendering, Activity argument rendering, run history, and memory traces runtime-neutral without requiring UI code to parse raw provider payloads.
