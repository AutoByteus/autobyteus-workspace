# Agent Execution

## Scope

Manages runtime agent runs and message execution flow.

## TS Source

- `src/agent-execution/services/agent-run-manager.ts` (`AgentRunManager`)
- `src/agent-execution/services/agent-run-activation-candidate.ts`
- `src/agent-execution/services/standalone-agent-run-lifecycle-service.ts`
- `src/agent-execution/services/agent-run-command-coordinator.ts`
- `src/agent-execution/services/agent-run-command-registry.ts`
- `src/agent-execution/services/agent-run-command-status-overlay-store.ts`
- `src/agent-execution/services/agent-run-provisioning-service.ts`
- `src/agent-execution/services/agent-run-status-projection-service.ts`
- `src/agent-execution/providers/agent-provider-factory-builder.ts`
- `src/agent-execution/input/agent-run-provider-input-normalizer.ts`
- `src/agent-execution/runtime/general-process-run-supervisor.ts`
- `src/api/graphql/types/agent-run.ts`
- `src/services/agent-streaming/agent-stream-handler.ts`
- `src/api/websocket/agent.ts`

## Notes

Runtime managers compose definitions, prompts, tools, processors, and workspace context.

For the `antigravity_cli` provider's run-owned project capsule, exact provider
conversation binding, headless tool policy, and canonical event mapping, see
[Antigravity CLI Runtime](./antigravity_cli_runtime.md). It joins the existing
manager/factory boundary rather than defining a second Agent lifecycle.

## Execution Family Composition

`AgentProviderFactoryBuilder` freezes process-wide provider primitives and
creates AutoByteus, Codex, and Claude backend factories only from an explicit
execution-family `AgentDefinitionService` and
`AgentToolMcpRunSessionActivator`.
Provider construction does not read a process-global application manager or
session scope. Codex and Claude materializers therefore receive the exact
activation boundary owned by the General Process or Application execution
family that created the run.

`GeneralProcessRunSupervisor` owns the General Process Agent/Team managers,
history services, task identity, context-file normalization, run resources, and
its independent scoped Agent Tools authority. Application execution constructs
the same provider backends beneath a private `ApplicationExecutionScope` with
application-local definition services and publication capability. The families
share provider implementation but not manager identity, active-run registries,
session authority, definition graph, or publication authority.

`AgentRunProviderInputNormalizer` is injected into each manager and resolves
current-turn context-file locators against that family's explicit path
environment before provider dispatch. This normalization is not a static or
process-global provider lookup.

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
the contextual configured-skill resolver. Native AutoByteus consumes
`SkillService.resolveConfiguredSkillsForAgent(agentDefinition)`, the
resolved-only `Skill[]` projection. Codex and Claude consume
`resolveConfiguredSkillBindingsForAgent(agentDefinition)`, which preserves safe
unresolved names so their workspace materializers can reconcile stale broken
links before omitting an unavailable optional skill. AGY also consumes these
bindings for its run-owned capsule. No runtime should call the global skill
catalog lookup by name. This preserves package-private and owning-team-shared
skill context while still allowing configured skill-directory fallback for
explicitly named skills. The resolved binding records the winning
agent-private, team-shared, or global source and its canonical trust root.
AGY uses that provenance for its checked snapshot; it does not infer a team
root from an unrelated global fallback. See the
[AGY runtime guide](./antigravity_cli_runtime.md#run-owned-project-and-workspace)
for its checked in-bound file-link policy. Codex/Claude retain their own
materialization semantics.

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

## Activation Publication And Exact Continuation

`AgentRunManager` constructs new and restored runtimes as private
`AgentRunActivationCandidate`s. A candidate exposes only its local run ID,
runtime kind, optional external-provider identity, `commitPublication()`, and
`abort()`. It is absent from active-run lookup and cannot receive input or
publish events until its governing owner has durably committed the metadata or
Team execution-tree state that makes the run discoverable. Cleanup uncertainty
quarantines the run ID in-process instead of permitting a replacement runtime.

`StandaloneAgentRunLifecycleService` owns one activation attempt per run ID
across command, prepared-run activation, and history restore callers. It
reactivates the persisted workspace, reconstructs the exact stored run config,
prepares the private candidate, commits `startedAt` and the external provider ID
when applicable, and only then publishes the run. A started external run
requires a non-local persisted provider ID and restores that exact identity; a
native AutoByteus run restores by its local run ID and memory directory.
Missing, unreadable, conflicting, or indeterminate durable state fails closed.

Codex restoration sends the stored thread ID to `thread/resume`; failure never
falls back to `thread/start`. Claude reserves one valid UUID before first input:
the first process open receives only `sessionId`, later and restored opens receive
only `resume`, and every provider-reported session ID must confirm the same UUID.
The local AgentRun ID is never a Codex/Claude provider binding or placeholder.

## Published-Run Termination And Resource Finalization

`AgentRunManager.prepareAgentRunTermination(expectedRun)` is the only
termination preparation entrypoint for a published `AgentRun`. Direct stop,
Mixed Team-member stop, and `stopAllAgentRuns()` all use the same exact-instance
wrapper around `AgentRun.prepareTermination()`. Concurrent preparation and
finish calls coalesce per exact run.

Cancellation reopens the underlying run and removes the reusable preparation.
A committed finish that returns `accepted: false` keeps the run current and the
finish retryable. An accepted provider/runtime finish is not returned to the
caller until the run is inactive, exact-current removal succeeds, and the
activation registry's cleanup result is successful. That removal releases the
same run's resources once: it deactivates the deterministic Agent Tools MCP
run-session and detaches file-change, artifact-relay, and memory observers.
Replacement runs are never released by stale cleanup. Thrown finalization,
identity mismatch, or accepted-but-active outcomes are terminal for the
committed attempt rather than being converted into success.

## Stopped Model Configuration And Restore Serialization

`StandaloneAgentRunLifecycleService` also owns the narrow stopped-run
model/settings-pair update. Update and restore share the same per-run transition lane,
so the supported General Process orders are deterministic: Save can commit
before restore reads the config, or restore can make the run active before Save
rechecks and returns `RUN_ACTIVE`. This lane is not a browser multi-writer or
revision protocol.

The update keeps runtime kind, workspace, provider
conversation identity, tool policy, and local run ID fixed. It requires a
current, cataloged, unarchived, manager-inactive run; validates the submitted
`llmModelIdentifier` + `llmConfig` against the selected model's current schema
within that fixed runtime; and writes/rereads the pair together. Replacement
requires fresh runtime-catalog membership and target-schema validity. Only
AutoByteus additionally requires verified positive target context capacity at
least the fresh saved-model capacity. Same-model settings updates bypass that
replacement comparison, not
ordinary availability/schema checks. No-op and canonical confirmation compare
both fields. See [LLM Management](./llm_management.md#persisted-run-model-selection-validation).

The same run's next normal message/restore consumes the saved pair without a
new provider conversation. Save neither activates a backend nor compacts,
converts, or resets history. Existing memory/compaction lineage remains in
place; ordinary later execution uses its existing runtime algorithm with the
selected model, without promising identical future compaction timing.

Studio adds a separate owner-aware guard before this General lane. A live
Application binding locks configuration without exposing Application managers
to General execution. See [Run History](./run_history.md) and
[Application Orchestration](./application_orchestration.md).

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

Unexpected backend preparation failures are logged by `AgentRunManager` with
the run ID, runtime kind, and original error object before failed-candidate
cleanup. The command/WebSocket boundary still exposes the stable generic
preparation failure rather than the private filesystem/provider cause; the
status and acknowledgement therefore remain user-safe while server diagnostics
retain the actionable cause and stack.

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

Claim rule: the FIFO is walked in order. Entries already forwarded into the
active IDENTIFIED turn are skipped, because they finish at that turn's terminal.
The first queued entry is the candidate; any other non-queued entry ahead
(reserved, committed, claimed, or forwarded into a different or unknown turn)
stops the walk. With no active turn the candidate becomes `start_turn`. With an
IDENTIFIED active turn and `activeTurnAppend: "supported"` it becomes
`append_to_active_turn(T)`. Otherwise it waits. So a message posted while an
earlier message's turn is still running is delivered into that turn.

Codex and Claude declare exact active-turn append support. Codex maps the
dispatch to `turn/steer(expectedTurnId=T)`; Claude writes the message into its
live streaming session. A successful append preserves T without a new
turn-start transition. A rejection, mismatch, or failure never falls back to
start unless the backend proves the input was not delivered: such a result
sets `undeliveredRetryAsStart` (Claude `CLAUDE_APPEND_TURN_MISMATCH`, Codex
`CODEX_TURN_STEER_TURN_NOT_ACTIVE`, both raised before any provider I/O). The
entry then returns to its FIFO position, marked as never to be appended into T
again. It starts the next turn after T's terminal, or appends into a different
later turn. An RPC-level steer rejection or a post-RPC steer id mismatch stays a
visible failure. Native AutoByteus declares append unsupported, so its input
waits for the canonical terminal and becomes one later `start_turn`. The
`turnId` returned by `postUserMessage` for an append is only a claim-time hint;
consumers observe input lifecycle facts instead. Provider I/O stays outside
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

Claude Agent SDK session options carry an explicit AutoByteus built-in tool
policy at the `ClaudeSdkClient` boundary. The SDK `tools` option enables exactly
these Claude Code built-ins: `Bash`, `Read`, `Edit`, `Write`, `Glob`, `Grep`,
`NotebookEdit`, `WebFetch`, `WebSearch`, and `Skill`. Every other built-in,
including new ones added by future SDK releases, is absent from model context.
Claude's native subagent and multi-agent tools are not exposed; AutoByteus
`delegate_task`, `send_message_to`, and the Team tools replace them. As a safety
net, `disallowedTools: ["AskUserQuestion", "Agent", "Task", "Workflow",
"SendMessage", "ListAgents"]` keeps the clarification-question tool and the
native multi-agent tools hidden and blocked even if the enabled list is widened.
Both lists are product constants, not caller inputs, and apply only to normal
turns; model discovery keeps its own options. These bare built-in names are not
AutoByteus MCP tool preapproval rules. AutoByteus MCP tools are unaffected by
`tools`. They continue to be supplied through `mcpServers` and pre-approved
through `allowedTools` according to the configured tool exposure. Claude Code
tool names can change between Claude Code releases. The CLI that actually runs
is resolved by `resolveClaudeCodeExecutablePath()`: an explicit
`CLAUDE_CODE_EXECUTABLE_PATH` / `CLAUDE_CODE_PATH` / `CLAUDE_CLI_PATH` override
first, then `claude` on `PATH`. It is therefore not necessarily the CLI bundled
with the pinned SDK. Re-verify both lists against the CLI in use whenever the SDK
version changes and whenever the resolved Claude Code CLI is updated. Sessions
created before this policy keep any earlier agent-type listing in their
persisted transcript history. On resume, the tool list itself is still
restricted and native multi-agent calls still fail.

Claude Agent SDK `0.3.280` is used with exact direct peers
`@anthropic-ai/sdk@0.128.0` and `@modelcontextprotocol/sdk@1.30.0` in SDK
streaming input mode. Each Claude AgentRun keeps one Claude CLI process for its
whole life: `ClaudeSdkClient.openStreamingSession` opens one
`query({ prompt: AsyncIterable, options })` lazily on the first input (new or
restored run), and `ClaudeSessionProcess` owns that process, its single frame
pump, and exit detection. There is no idle timer. Run terminate/close (standalone
or team) and server shutdown close the process, which stops its background
tasks. An unexpected exit fails the active turn with a turn-terminal `ERROR`
carrying stderr diagnostics, and the next input reopens the session with
`resume`. Claude CLI defaults apply: AutoByteus sets no background-task or Bash
timeout environment variables. An operator's own environment still passes through
unchanged. If the server environment sets `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`,
Claude agents cannot run background commands, and a warning is logged at each
process open. Unset it (and any `BASH_*_TIMEOUT_MS` you did not intend) to get
the CLI defaults. The intrinsic Agent Tools MCP descriptor alone
is marked `alwaysLoad: true` so required Team tools are ready on the first
turn. Tool exposure, the MCP descriptor, system-prompt capture, and the
selected-model binding are resolved once per process open.

Canonical turns are derived from the stream by `ClaudeTurnTracker`, the single
owner of Claude turn identity. Turn ids are `${runId}:turn:${uuid}`.
- A turn opens on a `start_turn` input, or on `system/init` while idle: that is
  a turn the CLI starts itself, for example after a background task completes.
- Every input is an `SDKUserMessage` with its own uuid. A canonical turn may span
  several CLI turns and settles only when no CLI turn is open and every written
  uuid is listed in a `result.user_message_uuids` or cancelled.
- Only `system/init` opens a turn. Content frames or results that arrive while
  no turn is active are logged and dropped.

`ClaudeBackgroundTaskRegistry` tracks the CLI's background set and completions
the model has not seen. A turn the CLI starts itself is preceded by a
`SYSTEM_TASK_NOTIFICATION` (`sender_id: "system.claude_background_task"`), for
example `Background task completed: <description> (<status>)`. Agent memory
records these notices, and only these, as `system_task_notification` traces,
and run-history replay shows them in the conversation.

Image context files are sent inline as image content blocks. The Codex and
Claude paths share `agent-execution/shared/context-image-source.ts`. Local
files are read and base64-encoded (at most 20 MB); http(s) URLs and data URLs
pass through. An unreadable image becomes a visible text note, not a failure.
Non-image context files keep the "Reference files" path section.

For token accounting, each Claude process open resolves the selected model
value to one raw id through that session's supported-model metadata. Terminal
result `modelUsage` is reconciled by the server token-usage fold per session and
raw model; auxiliary-model usage is not charged to the selected-model meter.
The meter reports an AutoByteus-configured API-equivalent estimate, not the
Claude subscription's actual charge. See [Token Usage](token_usage.md) for
checkpoint, cache-write approximation, and migration details.
The same selected raw result row supplies a context-window capacity only when
it is positive and safe; a safe full prompt sum then yields the latest prompt
percentage. Older valid rows with null percentage are repaired by the
run-summary read projection, not by a data backfill.

Claude interrupt is owned by the session, not by WebSocket, GraphQL, or
frontend button state, and it ends only the current turn. The process, the
conversation, and running background tasks stay alive.
1. The session clears and flushes pending tool approvals.
2. Input still waiting for the process to open or for an image read is
   cancelled locally without an SDK call.
3. Unless no input of the turn was ever sent and no CLI turn is open, the
   session calls `Query.interrupt({ cancelQueued: true })`. The CLI advertises
   this with the `interrupt_cancel_queued_v1` capability; the SDK d.ts omits the
   parameter, so the call is isolated in `ClaudeSdkStreamingSession`. That
   atomically cancels messages the CLI has queued and aborts the running turn.
4. The turn settles by the tracker's uuid accounting:
   - `TURN_INTERRUPTED` when anything was cancelled or aborted;
   - `TURN_COMPLETED` when the Stop arrived before the CLI read the input.

Background completions that `cancelQueued` may have dequeued are announced in
the interrupted turn and carried into the next input as a system note. Active
terminate settles an active turn as `TURN_INTERRUPTED`, closes the process, and
only then does the manager emit `SESSION_TERMINATED`. The first process open
uses SDK `sessionId` with the UUID reserved before the first input; every later
open (after an exit or a restore) uses `resume`. A provider-reported session id
that conflicts with that UUID is fatal for the process. Re-verify the
`cancelQueued` contract after Claude CLI or Agent SDK bumps with the gated live
check in `claude-sdk-client.integration.test.ts` (`RUN_CLAUDE_E2E=1`, PATH and
bundled CLIs).

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
context automatically unions `get_handoff_rules`, `send_message_to`, and
`delegate_task` into that effective set even when the agent definition omitted
them; configured duplicate names are deduplicated. Other tools remain explicitly
configured and availability-gated. When at least one effective and available tool is enabled,
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
such as `delegate_task`; internal run-session IDs and provider configuration
details are not projected into events, run history, or memory traces.

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
