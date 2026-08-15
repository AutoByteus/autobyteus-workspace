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

## Carpenter Runtime Instructions

Before creating any native AutoByteus, Codex, or Claude backend, the runtime
resolves the selected agent definition and validated team context. Native
AutoByteus then resolves its exact absolute workspace and calls
`composeNativeAutoByteusPrompt(...)`; Codex and Claude call
`composeSharedCarpenterPrompt(...)` and retain ownership of their provider
working-directory fields. A team run supplies its validated `MemberTeamContext`
so every composition includes the exact selected Team instruction, canonical
member address, and the same AgentTeam Addressing/Collaboration guidance. No
flat communication or delegation roster is injected.

The shared semantic order is Agent Identity, optional Team Instruction, and
optional Team Collaboration. Native AutoByteus appends Working Environment,
Bash Operating Practice, and File And Directory Practice, then the native core
appends its one terminal Skills catalog. Native AutoByteus places the Carpenter
text in `AgentConfig.systemPrompt`; Codex passes shared text as thread
`baseInstructions`; Claude passes shared text as SDK query
`options.systemPrompt`. Codex/Claude configured skills use their
provider-specific discovery/materialization paths rather than an eager prompt
body.

The composition boundary fails before provider invocation when a required name,
native workspace, team member/delivery binding, or dynamic value is invalid. It
also contains authored `agent.md` and `team.md` headings beneath their owning
section and rejects unresolved Carpenter placeholders. Stable Claude
instructions are not rebuilt in user turns.

See
[Prompt Engineering And Runtime Instruction Composition](./prompt_engineering.md)
for the authoring contract and concrete foundation, Bash, skill, and tool
examples.

Configured agent skills are resolved before runtime-specific bootstrap through
`SkillService.resolveConfiguredSkillsForAgent(agentDefinition)`. Native
AutoByteus, Codex, Claude, and team-member launch paths should consume that
resolved `Skill[]` shape instead of calling global skill catalog lookup by name.
This preserves package-private and owning-team-shared skill context while still
allowing configured skill-directory fallback for explicitly named skills.

Launch flows no longer expose a user-facing skill-access choice. A standalone
agent run receives the skills configured on its selected agent definition, and a
team run gives each leaf member only the skills configured on that member's
agent definition. An agent with no configured skills receives no
AutoByteus-managed skills by default. The legacy `GLOBAL_DISCOVERY` / "all
installed skills" mode is removed from public runtime inputs; unsupported legacy
values are rejected after startup migration has rewritten old persisted metadata
to configured-only behavior.

Native AutoByteus runs consume the resolved `Skill.rootPath` values directly in
`AgentConfig.skills`. For imported package agents this includes exact canonical
package-private skill roots under `skills/<skillName>`. The separate normal Skills
catalog also exposes bundled package skills for browsing/opening, but runtime
configured-skill fallback stays limited to configured global skill directories
so package agents keep source-context-first resolution.

`AgentRunManager` also owns active-run sidecars that must be attached independently of websocket clients. For Codex and Claude runs with a `memoryDir`, it attaches `AgentRunMemoryRecorder` so accepted user commands and normalized runtime events are written to server-owned local memory even when no browser is subscribed to the live stream. Native AutoByteus runs are skipped by that recorder because their memory remains owned by the native `autobyteus-ts` memory manager.

`AgentRun.postUserMessage(...)` exposes an internal command-observer seam. Observers are notified only after the message is accepted, and observer failures are isolated from the user-message result.

Current user context-file references are part of runtime input construction, not
Team Communication metadata. For native AutoByteus turns, the shared
`autobyteus-ts` message builder appends a generated `Reference files:` block
after context-file resolution. Server-owned direct runtimes with their own input
mapping, including Codex and Claude Agent SDK sessions, must use the same
context-file reference-section utility with `ContextFileLocalPathResolver` so
finalized `/rest/.../context-files/...` locators become model-visible absolute
local paths when they resolve. This intentionally exposes server filesystem
paths to the selected runtime/model provider for attached current-turn context
files; unresolved or non-local values must be omitted rather than rendered as
reference files.

See [Agent Memory](./agent_memory.md) for the external raw-trace-only recorder contract and memory-file boundaries.


## Runtime Identity Allocation

New concrete `AgentRun` identities are allocated by the server before any
runtime backend is created. `AgentRunIdentityAllocator` resolves the supplied
`agentDefinitionId` to the current agent definition name and produces a
folder-safe `<agent_definition_name_slug>_<uuid-without-dashes>` value. The slug
is readability metadata only; routing, task ownership, restore, and storage
logic must treat the whole `agentRunId` as opaque and must not parse the slug or
assume a runtime-specific prefix.

The same allocation boundary is used for standalone prepared/created runs, team
agent members, and delegated task-agent instances. It guards active runs,
standalone metadata/directories, team-member metadata/directories, nested child
team metadata, and in-flight reservations before approving a new id.
`AgentRunManager` rejects duplicate active registrations instead of replacing an
existing run. Runtime backend factories receive the canonical id from the
manager/config and fail fast when production code omits it; provider/native
identities such as Codex thread ids, Claude session ids, and AutoByteus native
agent ids remain separate metadata.

Historical restore paths continue to use stored run ids as data. Old readable,
deterministic, or otherwise legacy ids are not rewritten and are not validated
against the new generated shape.

## Standalone Command Lifecycle

Standalone user-message activation is owned by the backend command boundary,
not by frontend restore/start orchestration. `AgentRunCommandCoordinator` accepts
`SEND_MESSAGE` commands for a durable `runId`, validates required
`message_id` and `dedupe_key`, publishes command-level lifecycle status when an
inactive run must be activated, resolves the active runtime, forwards the
message, records activity, and returns an `AGENT_COMMAND_ACK`.

The command registry is scoped by `(runId, message_id)`. A retry with the same
message id is idempotent and returns the current/original acknowledgement state.
Distinct commands may coexist: activation is single-flight, then every command
enters the same `AgentRun` admission boundary in arrival order. The registry
tracks `STARTING -> ADMITTED -> FORWARDED -> COMPLETED | FAILED | REJECTED |
CANCELLED` through a per-entry typed lifecycle observer; it does not select
active-turn behavior or maintain a second input queue. Terminal command records
are retained in process for at least 15 minutes.

For inactive historical runs and prepared-new identities, the coordinator
publishes a command overlay `AGENT_STATUS { status: "initializing",
can_interrupt: false }` before runtime restore/start work. During an
inactive-start command, runtime readiness remains an internal fact until the
accepted message has been handed to the runtime. The overlay is replaced only by
command-correlated post-handoff lifecycle signals: command-start `AGENT_STATUS
initializing`, explicit `TURN_STARTED`, command-correlated `AGENT_STATUS`,
terminal/error events after handoff, or coordinator activation/post failure
handling. Restored runtime snapshots/readiness, WebSocket bind success,
`statusHint=ACTIVE` alone, persisted metadata, and active runtime snapshot
availability do not clear or replace the overlay. If activation fails
before runtime command evidence is available, the overlay moves to
non-interruptible `error` and the acknowledgement includes the failure
code/message.

New standalone first-message flow uses `prepareAgentRun(...)`, not
`createAgentRun(...)`, before the WebSocket command. Preparation creates a
durable run identity, V2 history catalog row, run metadata, and memory directory
with `preparedAt`, `preparedExpiresAt`, `platformAgentRunId: null`, and no active
runtime. The first accepted `SEND_MESSAGE` activates that prepared identity
through `activatePreparedRun(...)` and records `startedAt` plus the platform run
id when one exists. Prepared runs can be explicitly cancelled before activation,
and stale prepared identities are eligible for TTL cleanup without affecting
activated or historical runs. Standalone `activationState` is not persisted; the
`prepareAgentRun` response may still return `activationState: "PREPARED"` as a
launch API response field.

`AgentRun.postUserMessage(...)` is the sole runtime-level input-admission,
status, and turn authority once an `AgentRun` exists. Its runtime events are the
source that replaces command overlays and drives later `running`, `idle`,
`offline`, and `error` projections.

## Active Input And Interrupt Command Results

Each live `AgentRun` owns one non-persisted `AgentRunInputAdmissionState` behind
`postUserMessage(...)`. It validates and admits a private FIFO entry, owns one
provider-dispatch claim at a time, and selects exactly one explicit
`start_turn` or `append_to_active_turn` dispatch from canonical turn state plus
the backend's declared `activeTurnAppend` capability. `accepted: true` means the
run owns the ordered, at-most-once forwarding attempt; it does not mean the
provider completed the turn. A non-null immediate `turnId` is returned only for
an entry atomically claimed as an exact active-turn append. Other admissions
return `turnId: null` and gain their identified turn through canonical lifecycle
observation.

Codex declares exact active-turn append support and maps that dispatch to
`turn/steer(expectedTurnId=A)`. A successful steer preserves A without a new
turn-start transition; rejection, mismatch, or failure never falls back to
start. AutoByteus and Claude declare append unsupported, so input accepted while
their turn is active stays in the AgentRun FIFO and becomes one later
`start_turn` after the current canonical terminal. Provider I/O stays outside
the serialized critical section, while admission, claims, result application,
terminal observation, and drain re-enter the per-run event queue. User-message
memory/sidecar observation occurs only when the entry is actually forwarded.

An active interrupt reservation temporarily makes every queued entry ineligible
for provider dispatch, including append-capable Codex input. Rejected or thrown
interrupt work releases only that matching reservation and drains the original
FIFO; an accepted interrupt holds the reservation until the exact canonical
terminal, which is projected before the next start. Termination first quiesces
new admission, waits for a claimed provider call, cancels undispatched entries
once after accepted termination, and reopens the original order if termination
is rejected. No provider queue, retry, persisted inbox, or provider-specific
caller policy is used.

`INTERRUPT_GENERATION` is command-correlated control traffic. Standalone and
exact team-member requests carry a fresh client `command_id`; the originating
WebSocket receives one discriminated `AGENT_COMMAND_ACK` with `accepted`,
`rejected`, or `failed`, the same command id, and the exact standalone-run or
team-member target. Missing/inactive targets and provider rejection are result
arms rather than fabricated lifecycle events. Accepted means only that the
runtime accepted the interrupt request: later `TURN_INTERRUPTED`/terminal
`AGENT_STATUS` remains responsible for clearing running/Stop state. A closed
socket cannot receive a server result, so client disconnect completion is a
separate local transport failure, not a synthetic acknowledgement.

## Canonical Turn Lifecycle And Failure Authority

Runtime lifecycle projection is boundary-owned. A live run is `running` only
while it has an authoritative active turn and is `idle` when it remains reusable
with no active turn. `initializing` covers accepted activation/start work before
an active turn opens, `offline` means that the runtime is unavailable, and
`error` represents an accepted lifecycle failure. The public status vocabulary
is unchanged.

Provider adapters normalize their base events, then
`AgentRunEventDispatchQueue` serializes pipeline processing and final listener
dispatch for each run. Different runs remain concurrent. Within one run,
`LifecycleStatusEventTransformer` and `AgentTurnLifecycleState` own the
identified/anonymous/retired turn state:

- `TURN_STARTED` opens the supplied `turn_id` and establishes `running` when an
  accompanying explicit status is absent.
- A matching `TURN_COMPLETED` or `TURN_INTERRUPTED` retires the current turn and
  establishes `idle` when an accompanying explicit status is absent.
- Duplicate boundaries and boundaries for an already retired turn are
  idempotent lifecycle no-ops. A terminal boundary for turn A cannot close a
  newer active turn B.
- Ordinary segment, tool, inter-agent, todo, and system-task activity remains
  observable but cannot establish or reopen a turn. Same-turn activity may only
  recover an `error` projection when it carries the current identified, still
  open turn id.
- `AGENT_STATUS` is the only event shape that updates
  `AgentRun.statusOverride`. Raw activity, `statusHint`, and unclassified error
  events are not parallel lifecycle authorities.

Turn correlation uses `payload.turn_id` as the canonical event field. The
shared internal resolver tolerates `payload.turnId` while runtime/provider
boundaries are normalized, but new publishers should emit `turn_id`. Runtime
contexts retain retired identified turn ids for their lifetime so arbitrarily
late content can still be delivered without reopening completed work.

Canonical `ERROR` payloads add structured lifecycle evidence:

```ts
type AgentErrorLifecycleEvidence =
  | { error_scope: "turn"; error_effect: "diagnostic"; turn_id: string }
  | { error_scope: "runtime"; error_effect: "diagnostic" }
  | { error_scope: "turn"; error_effect: "terminal"; turn_id: string }
  | { error_scope: "runtime"; error_effect: "terminal" };
```

A turn diagnostic is content-only for lifecycle purposes. A turn-terminal
error can settle only its matching identified turn; an old turn error cannot
settle a newer command/turn. A runtime-terminal error has no `turn_id`, clears
the active runtime turn, and establishes `error`. Missing fields, an empty turn
id, a runtime-scoped payload with a turn id, or any unsupported scope/effect
combination has no lifecycle or command-settlement authority. Runtime adapters
emit an authoritative `ERROR` before any companion `AGENT_STATUS error` so the
transformer can validate that status against the same evidence. A status-only
`AGENT_STATUS error` remains a valid runtime snapshot but cannot settle an
identified command by itself.

## Runtime Segment Identity And Ordering

The provider boundary supplies truthful source identity, while `AgentRun` owns
canonical segment admission. A source start must carry non-empty `id`,
`turn_id`, and one finite segment type. Source content/end carry only their
non-empty ID and turn plus content/terminal facts; they do not repeat type.
Missing provider identity remains missing and becomes a non-terminal
`AGENT_SEGMENT_LIFECYCLE_INVALID` diagnostic. No provider or consumer may
generate a fallback identity, use the turn as segment ID, infer a type, or
synthesize a missing start.

Each `AgentRun` owns one non-persisted lifecycle map keyed by exact
`{turnId,segmentId}`. The first pipeline transformer admits valid starts,
derives their type onto canonical content, preserves a type-less canonical end,
and rejects conflicting/replayed/retired lifecycle mutations as specified by
the common state machine. Browser and transport coalescing also require exact
turn, segment, and type agreement; equal deltas remain distinct events unless
the presentation egress joins adjacent messages with every other payload field
equal.

Adapters also own the ordering boundary between assistant text and tool
lifecycles. If a provider emits `assistant text -> tool_use/tool_result ->
assistant text`, the runtime must emit separate text segment completion events
at the provider text-block boundaries so live streaming, team fanout,
run-history projection, and external raw-trace recording all preserve the same
assistant/tool/assistant order without frontend provider-specific repair logic.

## Runtime Tool Lifecycle Normalization

Provider adapters must keep tool calls on two runtime-neutral lanes:

- `SEGMENT_START` / `SEGMENT_END` owns transcript/conversation structure for a tool call and can provide enough normalized display facts for the frontend to seed a pending Activity row immediately.
- `TOOL_APPROVAL_*` and `TOOL_EXECUTION_*` owns execution/approval status, terminal result/error, logs, argument hydration, and durable tool traces.

Provider-specific tool identities and result envelopes must be canonicalized at
the runtime event-converter boundary before they become post-pipeline
`AgentRunEvent`s. Tool source events still cross the common segment lifecycle
when they use the segment lane.
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

Claude Agent SDK query options also carry the AutoByteus provider-policy default
`disallowedTools: ["AskUserQuestion"]` at the `ClaudeSdkClient` boundary. This
bare disallow entry hides the Claude Code built-in clarification-question tool
from context; it is not an AutoByteus MCP tool preapproval rule. Do not replace
this default with a Claude SDK `tools` allowlist, because that would require
enumerating every desired Claude built-in and could accidentally remove tools
AutoByteus still expects. AutoByteus MCP tools continue to be supplied through
`mcpServers` and pre-approved through `allowedTools` according to the configured
tool exposure.

Claude Agent SDK `0.3.231` is used with exact direct peers
`@anthropic-ai/sdk@0.116.0` and `@modelcontextprotocol/sdk@1.30.0`. The adapter
continues to call one `query({ prompt: string, options })` per AgentRun
`start_turn`; it does not use SDK `streamInput`, priority scheduling, or a
provider-owned input queue. The intrinsic Agent Tools MCP descriptor alone is
marked `alwaysLoad: true` so required Team tools are ready on the first turn.

Claude active-turn closure is owned by the session, not by WebSocket, GraphQL,
or frontend button state. Each active Claude turn is tracked with its own
`AbortController`, and that controller is passed into the SDK query options.
When a user interrupt or active-run terminate request closes an in-flight Claude
turn, the session clears pending tool approvals, flushes pending
approval/control-response work, calls `AbortController.abort()`, waits for the
exact active query execution to settle, completes registered-query/reference
cleanup, clears active state, and only then emits canonical `TURN_INTERRUPTED`.
It does not call SDK `Query.interrupt()` or consume an SDK interrupt receipt as
a fallback. AgentRun then releases the reservation and drains retained FIFO
input. A user-requested interrupt is a normal interrupted terminal path: it must
not be recorded as a completed turn and SDK abort/close fallout should not
surface as a runtime `ERROR`. Active terminate reuses the same session-owned
closure boundary before the manager emits `SESSION_TERMINATED` and removes the
run session, so row-level termination remains stronger than interrupt without
duplicating abort-first cleanup policy outside the session. Follow-up messages
start from a fresh query resource after settlement and still resume with a real
provider `session_id` when one has been observed. The local run id placeholder
is never an SDK `resume` value.

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

A non-interrupt native turn failure is also operation-scoped when memory repair
can complete. `AgentTurnRunner` terminalizes unmatched native calls through the
memory-owned protocol-safety boundary, publishes a diagnostic recovered event,
settles the turn as recovered, and lets the still-live worker return to idle for
a later message. A missing persisted result is represented as one matching raw
and working-context tool error, never fabricated success. If repair/persistence
itself fails, the turn remains terminally errored. This recovery rule does not
add a universal timeout to unrelated native tools.

Claude Agent SDK and Codex App Server expose in-scope effective backend agent
tools through the unified Agent Tools MCP route, not through runtime-owned
duplicated tool projections. The enabled set includes selected server-owned
tool families and selected configured MCP-origin registry tools. A valid team
context automatically unions `send_message_to` and `delegate_task` into that
effective set even when the agent definition omitted both; configured duplicate
names are deduplicated. Other tools remain explicitly configured and
availability-gated. When at least one effective and available tool is enabled,
the runtime materializer creates a live `autobyteus_agent_tools` descriptor:

- Codex passes it only as thread-scoped
  `config.mcp_servers.autobyteus_agent_tools` to `thread/start` /
  `thread/resume`.
- Claude passes it only through SDK `mcpServers` and pre-approves generated
  provider wire names such as
  `mcp__autobyteus_agent_tools__generate_image` in `allowedTools`.

The old migrated Codex `dynamicTools` builders and old Claude local MCP server
builders for browser, media, task delegation, `send_message_to`, and
`publish_artifacts` are removed and must not be restored as compatibility
fallbacks. Generic Codex dynamic-tool infrastructure remains valid for unrelated
custom dynamic tools.
Raw external MCP server configs are likewise not copied directly into Codex or
Claude provider-native MCP config for configured MCP-origin tools; the
registered tool name is exposed through `autobyteus_agent_tools`, and execution
delegates through the shared registry/MCP proxy owner.

Runtime converters must canonicalize all Agent Tools MCP provider identities
before emitting application-facing events. Provider/server-qualified names such
as `autobyteus_agent_tools` and
`mcp__autobyteus_agent_tools__delegate_task` normalize to canonical tool names
such as `delegate_task`; bearer tokens, session ids, `Authorization`, and
`http_headers` are sanitized from events, run history, and memory traces.

Source-confirmed MCP terminal result lanes use the general MCP effective-result
projector before Activity, run history, and memory traces consume the result.
Codex proves source eligibility from MCP item families or raw
`mcp__server__tool` wire names; Claude proves it from raw MCP wire names or
explicit provider MCP markers. The projector is intentionally not a value-only
global unwrapping rule: non-MCP/source-unknown results that merely look like an
MCP envelope stay unchanged.

For successful source-confirmed MCP envelopes, application-facing
`TOOL_EXECUTION_SUCCEEDED.payload.result` is the effective result, not the raw
protocol envelope. Projection prefers non-null `structuredContent`, parses a
single JSON text block or returns single plain text, joins multiple text blocks
with `\n\n`, projects mixed/rich content as sanitized `{ items: [...] }`, and
projects empty content to `null`. Top-level MCP protocol fields such as
`content`, `structuredContent`, `_meta`, and `isError` must not appear in normal
successful Activity results. If a source-confirmed MCP envelope has
`isError: true`, converters emit `TOOL_EXECUTION_FAILED` with a deterministic
`error` and no successful `result`. Browser, media, task-delegation,
communication, published-artifact, and configured MCP proxy services continue to
own their family-specific execution semantics; the projector only translates
MCP protocol result envelopes into application-facing result/error payloads.

Family-specific execution ownership stays below the Agent Tools MCP adapter:

- `send_message_to` still runs through the shared
  `src/agent-communication` dispatcher, so `recipient_address` stays a
  team-context route and `target_agent_run_id` remains the global live-only exact
  active-run route.
- Browser tools use the shared browser service and normalize successful results
  into the standard browser result object before terminal lifecycle events are
  emitted.
- Media tools return the canonical `{ file_path }` result shape so generated
  media files continue to project as generated-output file changes. The
  server-owned `generate_image` capability applies its own validated
  10,000-3,600,000 ms operation deadline (saved
  `MEDIA_OPERATION_TIMEOUT_MS`, default 300,000 ms), propagates supported
  cancellation, stages bytes under a revocable publication lease, and suppresses
  late provider/download publication. This is media-service policy, not a
  runtime-wide tool deadline; other media operations retain their existing
  duration semantics.
- Task-delegation tools call `TaskDelegationToolService` with the current
  `MemberTeamContext` and inherit the canonical ready-to-run/no-dependencies
  guidance from the shared manifest/schema. AutoByteus native execution
  round-trips that context through `initialCustomData.teamContext`; the payload
  must preserve typed `agent` / `agent_team` member rows, team-definition ids,
  and ingress/coordinator identity so local AutoByteus `delegate_task` calls can
  resolve the same team targets advertised in server prompts. When these tools
  are reached through Agent Tools MCP, the MCP route still returns standard text
  content, but source-confirmed Codex and Claude lifecycle conversion projects
  successful task results back to the parsed task-domain object.
- `publish_artifacts` calls the published-artifact publication service for the
  active owning run and continues to drive published-artifact projection/events.
- Configured MCP-origin tools use their registered AutoByteus names, including
  any configured prefix. Their raw MCP result fields (`content`, `isError`,
  `structuredContent`, `_meta`) remain protocol-boundary data at the MCP route /
  provider boundary; source-confirmed Codex and Claude lifecycle events project
  those envelopes to effective results or failed tool events before user-facing
  Activity/history/memory surfaces consume them.

Non-MCP tools and source-unknown provider result lanes stay unchanged;
converters must not rewrite unrelated traffic just because a result value is
envelope-shaped.

The frontend consumes both normalized lanes through a shared Activity projection owner: eligible segment starts provide immediate Activity visibility, while lifecycle events update the same invocation through execution and terminal states. The external raw-trace recorder treats lifecycle events, not display-only segments, as durable tool-call/tool-result trace authority. This keeps transcript rendering, Activity argument rendering, run history, and memory traces runtime-neutral without requiring UI code to parse raw provider payloads.
