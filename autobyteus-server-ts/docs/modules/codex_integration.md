# Codex Integration

## Current State

Codex App Server is now a first-class runtime in `autobyteus-server-ts`. Codex can still be used through MCP tools, but the primary integration path in this repo is the native runtime.

Supported Codex paths:

- Native runtime: `runtimeKind = codex_app_server`
- Optional tool-based mode: Codex exposed through MCP tools

## Native Runtime Architecture

Standalone runs:

1. Frontend selects `codex_app_server`.
2. GraphQL create/continue flows hand runtime selection to the server run services.
3. `AgentRunManager` resolves the Codex backend factory.
4. `codex-agent-run-backend-factory.ts` creates a Codex-backed `AgentRun`.
5. `codex-thread-bootstrapper.ts` prepares the workspace, skills, approvals, and thread config.
6. `CodexAppServerClient` / `CodexAppServerClientManager` speak to the Codex App Server process.
7. Codex thread notifications are converted into normalized AutoByteus runtime events and streamed to the existing websocket/frontend pipeline.

Team runs:

1. Team services create a team run with a generated `<team_definition_name_slug>_<uuid-without-dashes>` `teamRunId`, allocator-backed opaque `memberRunId` values for concrete agent members, and `TeamBackendKind.MIXED`.
2. `MixedTeamManager` creates/restores one standalone Codex `AgentRun` per Codex team member through `AgentRunManager`.
3. Codex member bootstrap consumes a runtime-neutral `MemberTeamContext` for teammate instructions, allowed recipients, `send_message_to` delivery wiring, and task-delegation identity/tool context.
4. Team websocket streaming preserves the member domain identity while forwarding Codex member runtime events under the mixed team backend.

Codex App Server client reuse is scoped by canonical workspace `cwd`.
Standalone runs and same-workspace Codex team members can therefore share one
`CodexAppServerClient` process; team identity, member identity, and active-turn
routing stay above that client boundary in the thread/router layer rather than
in a separate client scope key. The `CodexClientThreadRouter` owns app-server
message classification for the shared client. Routeable thread/turn messages
must carry enough thread or turn identity to reach one active thread. Known
client-global notifications, such as account rate-limit and MCP startup-status
updates, are not team-thread events and are skipped by default instead of being
emitted as chat-visible runtime errors. Other no-identity messages that cannot
be routed among multiple active threads remain server-side diagnostics; server
requests receive a transport-level error response, but the router must not
broadcast them or call per-thread runtime-error projection.

Codex exposes in-scope configured backend agent tools through the server-hosted
Agent Tools MCP surface. When the configured tool set includes at least one
available supported tool, including selected MCP-origin registry tools,
`CodexThreadBootstrapper` creates a live `AgentToolMcpDescriptor`, materializes
it as thread-scoped `config.mcp_servers.autobyteus_agent_tools`, and passes that
config to `thread/start` and `thread/resume`. The descriptor must not be written
to trusted project config, process-wide app-server launch flags, or durable
history. The old Codex dynamic registration/spec-builder paths for migrated
browser, media, task-delegation, `send_message_to`, and `publish_artifacts`
tools are removed and must not be retained as fallbacks. Raw external MCP server
configs are not directly materialized into Codex `mcp_servers`; configured
MCP-origin calls delegate back through the registry-created AutoByteus MCP tool
path.

Route-backed Codex Agent Tools MCP calls are normalized from the Codex
`mcpToolCall` lifecycle to application-facing canonical tool names. Sender
streams and memory traces must preserve invocation id and arguments, apply
family-specific result canonicalization where that family owns a public result
contract, and sanitize provider/server-qualified names
(`autobyteus_agent_tools` or
`mcp__autobyteus_agent_tools__publish_artifacts`) plus `Authorization`,
`Bearer`, and `http_headers` config details from app-facing payloads.
For known browser tools, Codex must emit the standard browser result object
instead of the raw MCP content envelope so `open_tab` exposes `result.tab_id`
directly to Browser-shell focus handling. Unknown non-AutoByteus MCP traffic
keeps its provider result shape.

Family semantics still come from the shared server-owned services:

- `send_message_to` selector semantics come from the shared
  `src/agent-communication` dispatcher: `recipient_name` requires a team member
  context, while `target_agent_run_id` can be used by configured standalone or
  team-member Codex runs to reach an exact currently active `AgentRun.runId`.
- Task-delegation tools call `TaskDelegationToolService` with the current
  `MemberTeamContext`, inherit the canonical ready-to-run/no-dependencies
  guidance from the shared manifest/schema, and remain unavailable for
  standalone sessions.
- Browser, media, and `publish_artifacts` tools execute through their shared
  family services/manifests instead of Codex dynamic handlers.
- Configured MCP-origin tools appear under their registered AutoByteus names
  such as prefixed `db_query`; remote tool-name and transport details stay owned
  by MCP Server Management and the shared MCP proxy path.

The Codex runtime does not mutate task state directly and must not expose the
removed legacy task-plan names (`create_task`, `create_tasks`,
`assign_task_to`, `get_my_tasks`, or `get_task_plan_status`). This remains a
configured-tool boundary: Codex runtime code must not add ticket-specific
provider `tool_choice` overrides, forced-tool dampening, or framework
auto-review behavior for task results.

Codex MCP tool calls exposed by the native runtime follow the same split
surface contract. A raw `mcpToolCall` start emits a display
`SEGMENT_START(tool_call)` and a durable `TOOL_EXECUTION_STARTED` event with the
same invocation id, turn id, tool name, and arguments. Completion is enriched
from the thread-local pending MCP call before the pending state is removed, so
terminal lifecycle events retain the same arguments that the live segment
showed. Storage keeps those arguments on the already-persisted call only; its
separate raw result contains identity plus result/error and does not duplicate
name/arguments.

Codex turn input mapping preserves context-file media continuity while making
local file paths visible in text. `toCodexUserInput(...)` resolves finalized
`/rest/.../context-files/...` locators through the server context-file local
path resolver, appends one generated `Reference files:` block to the text item
for local absolute paths, and keeps eligible images as `localImage` items.
HTTP(S), data URL, empty, malformed, and unresolved locator values are not
listed as local reference files.

## Model Catalog, Reasoning Effort, And Fast Mode Configuration

Codex launch-time model configuration is driven by the Codex App Server
`model/list` response and carried through the existing AutoByteus `llmConfig`
field. No Codex-specific GraphQL or database field is introduced for these
model settings.

- `supportedReasoningEfforts` / `supported_reasoning_efforts` is normalized to
  the existing model-scoped `reasoning_effort` enum parameter. AutoByteus
  preserves each trimmed non-empty App Server value in first-seen order and
  does not filter or lowercase it through a product-wide reasoning-effort
  allowlist. The selected model's App Server row remains the capability
  authority, so values such as `max`, `ultra`, or future values appear only for
  models that advertise them.
- `defaultReasoningEffort` / `default_reasoning_effort` is normalized as the
  schema default. The frontend displays that default as the effective reasoning
  value and **Thinking** state, opens **Advanced** for that ON default, and still
  leaves unset `llmConfig.reasoning_effort` as null so the Codex App Server can
  apply its own model default.
- An explicit `llmConfig.reasoning_effort` is trimmed and carried without
  lowercasing or capability filtering through `CodexThreadConfig` to App Server
  `turn/start.effort`. Empty, whitespace-only, and non-string values remain
  null. App Server decides whether a directly submitted non-empty value is
  supported; thread bootstrap does not own a duplicate capability cache or a
  second `model/list` lookup.
- `additionalSpeedTiers` / `additional_speed_tiers` containing `fast` adds a
  `service_tier` enum parameter labeled **Fast mode**. Only `fast` is exposed;
  leaving the control at Default/off omits the setting and preserves Codex's
  default service tier.
- Backend normalization accepts only `llmConfig.service_tier === "fast"` for
  this feature. Unsupported values such as `flex` or arbitrary strings, and
  camelCase caller attempts such as `serviceTier`, are ignored before requests
  reach the Codex App Server.
- `reasoning_effort` and `service_tier` are independent. A run can carry, for
  example, `{ reasoning_effort: "high", service_tier: "fast" }`.
- When selected, `service_tier: "fast"` is resolved into
  `CodexThreadConfig.serviceTier` and sent as App Server `serviceTier` on
  `thread/start`, `thread/resume`, and `turn/start` so launch, restore, and
  subsequent turns stay aligned with the Codex service-tier contract.

The frontend renders the normalized schema in existing agent, team, default
launch, and member-override configuration surfaces. If the selected model's
schema no longer includes `service_tier`, the frontend sanitizes stale
`llmConfig.service_tier` before launch rather than carrying Fast mode into an
unsupported model.

## Server-Owned Durable Memory

Codex runtime runs now receive server-owned durable memory in addition to Codex-native thread history.

- Standalone Codex runs write under `memory/agents/<runId>/...`.
- Codex team members write under their resolved team-member `memoryDir`: direct members use `memory/agent_teams/<rootTeamRunId>/<memberRunId>/...`, nested members use `memory/agent_teams/<rootTeamRunId>/<childTeamRunId>/<memberRunId>/...` with deeper child team ids appended, and task-agent runs use `memory/agent_teams/<rootTeamRunId>/<...teamRunPath>/<taskAgentRunId>/...`.
- `AgentRunManager` attaches the storage-only `AgentRunMemoryRecorder`; the recorder captures accepted `AgentRun.postUserMessage(...)` commands plus normalized assistant, reasoning, and tool `AgentRunEvent`s.
- The recorder writes shared `RawTraceItem` rows and `working_context_snapshot.json` through the `autobyteus-ts` `RunMemoryFileStore` primitives.

New Codex tool traces use the shared split physical contract. A `tool_call`
owns compound `(turn_id, tool_call_id)` identity, canonical name, and explicit
arguments. Its separate `tool_result` owns the same identity plus physically
present result/error keys, repeats the matched call's verified canonical name,
and omits arguments. The accumulator reconstructs call-written/result-written
state from active plus complete rotated segments, suppresses duplicate
terminals, and never rewrites the call into a combined terminal row. When a
terminal supplies a non-empty name, it must match the canonical lifecycle name;
a conflict is logged and skipped without completion. A name-omitting terminal
uses the matched lifecycle name.

Call timing follows provider argument readiness. Ordinary Codex command, file,
dynamic, and MCP starts with explicit argument objects are written early. A
hosted `webSearch` placeholder start omits `arguments` and creates no raw tool
row, but its normalized start still establishes the live ordered card and
flushes reasoning that preceded it. The terminal action supplies authoritative
query/open/find arguments, so storage appends the call first and then the
minimal result without splitting reasoning written after the card. A genuinely
result-first terminal still flushes before the inferred call. An explicit `{}`
is a valid no-argument call. The shared accumulator does not parse raw Codex
items or branch on `search_web`; presence semantics belong to the converter.

This memory is the normal run-history display replay source and is also useful
for inspection and future offline analyzers. It is **not** Codex runtime memory
management: AutoByteus does not retrieve these traces for Codex, inject them
into Codex prompts, replace Codex session state, or run semantic compaction
inside the Codex execution path.

Codex provider/session compaction metadata is treated as provider-owned context management, not AutoByteus semantic compaction. Current Codex `contextCompaction` item lifecycle events normalize at the Codex converter boundary into `COMPACTION_STATUS` provider-boundary payloads: `item/started` emits non-rotating in-progress provenance, and `item/completed` emits a completed rotation-eligible boundary. Raw Responses `type = "context_compaction"`, older raw Responses `type = "compaction"`, and deprecated `thread/compacted` also normalize to completed provider-boundary payloads and dedupe with the item lifecycle boundary when they report the same compaction. `compaction_trigger` is not a completed boundary and must not write a marker or rotate raw traces. The server recorder writes provider-boundary provenance and may rotate settled active raw traces before rotation-eligible markers into complete segmented archive entries. It must not create semantic/episodic memory, rewrite trace content, drop trace history, retrieve memory for Codex, or inject memory back into Codex.

## Sandbox Mode Configuration

Codex filesystem sandbox behavior is controlled by the Codex-specific server setting
`CODEX_APP_SERVER_SANDBOX`.

- Supported canonical values are `read-only`, `workspace-write`, and `danger-full-access`.
- `workspace-write` is the default when the setting is absent or invalid.
- `danger-full-access` disables filesystem sandboxing and should only be used for trusted tasks and environments.
- The Settings page exposes the common user decision through **Server Settings -> Basics -> Codex full access**: toggle on saves `danger-full-access`, and toggle off saves `workspace-write`. The Advanced Settings raw table also treats `CODEX_APP_SERVER_SANDBOX` as a predefined editable, non-deletable setting and rejects values outside the canonical set.
- Saved changes flow through the existing server-settings persistence path and are read by future/new Codex thread bootstrap or restore paths. Already-active Codex sessions are not mutated in place.
- The saved sandbox setting is the default for non-auto-approved Codex runs.
  Codex run launch `autoExecuteTools=true` is a separate high-trust per-run
  policy for both standalone and team-member runs: thread create/restore uses
  effective `danger-full-access` and `approvalPolicy = "never"` even when the
  saved full-access setting is off, and runtime command/file/MCP/permission
  requests are auto-accepted or session-granted. Leave auto-approve off when the
  run should remain on visible manual approval gates.
- Team-member auto-approval does not own team communication routing. Dynamic
  team tools such as `send_message_to` remain constrained by configured tool
  exposure, team-owned handlers, and recipient validation.

Server-side semantics are owned by
`src/runtime-management/codex/codex-sandbox-mode-setting.ts` so the settings
service, create-session bootstrap, and restore-session history path share one
key/default/value-list/normalization source.

## Key Backend Components

Agent runtime:

- `src/agent-execution/backends/codex/backend/codex-agent-run-backend-factory.ts`
- `src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts`
- `src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`

Thread/runtime bridge:

- `src/runtime-management/codex/codex-sandbox-mode-setting.ts`
- `src/agent-execution/backends/codex/thread/codex-thread.ts`
- `src/agent-execution/backends/codex/thread/codex-client-thread-router.ts`
- `src/runtime-management/codex/client/codex-app-server-client.ts`
- `src/runtime-management/codex/client/codex-app-server-client-manager.ts`

Event normalization:

- `src/agent-execution/backends/codex/events/codex-thread-event-converter.ts`
- `src/agent-execution/backends/codex/events/codex-item-event-converter.ts`
- `src/agent-execution/backends/codex/events/codex-raw-response-event-converter.ts`
- `src/agent-execution/backends/codex/events/codex-thread-lifecycle-event-converter.ts`
- `src/agent-memory/services/provider-compaction-boundary-recorder.ts`
- Detailed raw-event audit table: `docs/design/codex_raw_event_mapping.md`

Team runtime:

- `src/agent-team-execution/backends/mixed/mixed-team-manager.ts`
- `src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts`
- `src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts`
- `src/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.ts`
- `src/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.ts`
- `src/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-event-payload.ts`
- `src/agent-tools/mcp`
- `src/agent-tools/mcp/providers`

## Skills

Configured runtime skills are first resolved by
`SkillService.resolveConfiguredSkillsForAgent(...)`, so Codex receives the same
context-aware `Skill[]` shape as the other runtime bootstraps. That resolver can
return package-private agent skills, owning-team shared skills for team-local
members, or configured global skill-directory fallback skills. Package skills
may also appear in the normal Skills catalog for browsing, but Codex
materialization uses the already-resolved runtime skill roots rather than a
package-wide catalog lookup.

The resolved skills are then preflighted against Codex `skills/list` for the run
working directory.

- If Codex already discovers an enabled skill with the logical `name`,
  AutoByteus reuses it and does not materialize another workspace entry.
- If the resolved skill name is not discoverable, AutoByteus materializes a
  runtime-owned whole-directory symlink into the run workspace at
  `.codex/skills/<sanitized-skill-name>`.
- The symlink target is the already-resolved `Skill.rootPath`. For imported
  shared-agent package skills, that is the canonical
  `agents/<agent-id>/skills/<skill-name>` package skill root.
- If the discovery probe fails, AutoByteus falls back to the runtime-owned
  workspace symlink path instead of blocking bootstrap.
- The runtime-owned workspace path is an intuitive
  `.codex/skills/<sanitized-skill-name>` directory symlink to the original source
  root. AutoByteus does not add the old hash suffix, does not generate
  `agents/openai.yaml`, and does not write ownership markers into the source
  tree.
- Team-shared relative links continue to work because Codex resolves through the
  source root, so no mirrored `.codex/shared/...` path is created.
- Duplicate skill names are product-excluded for this ticket. Codex has no
  source-aware duplicate-name preflight or materializer behavior here; it uses
  the normal resolved `Skill.rootPath` plus logical `Skill.name` path.

Durable E2E coverage exercises the runtime boundary with the real
`CodexThreadBootstrapper` and `CodexWorkspaceSkillMaterializer`: imported
shared-agent canonical single-skill and multi-skill package layouts resolve into
`.codex/skills/<skill-name>` symlinks that point at the exact package source
roots and expose the expected `SKILL.md` content to Codex.

Relevant owners:

- `src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`
- `src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts`
- `src/skills/services/configured-agent-skill-resolver.ts`

This keeps Codex skill loading aligned with the Codex filesystem contract instead of injecting skill content into prompts at the server boundary.

## Projection / History

Normal Codex UI history uses the same local application-owned replay trace as
all other runtimes. `getRunProjection(runId)` and
`getTeamMemberRunProjection(teamRunId, memberRouteKey)` do not call, fallback
to, or merge with Codex native `thread/read` history for display. If local
replay traces are absent or incomplete, focused Codex UI history may be empty
or incomplete. That is the accepted display boundary.

Relevant display components:

- `src/run-history/projection/providers/local-memory-run-view-projection-provider.ts`
- `src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts`
- `src/run-history/services/agent-run-view-projection-service.ts`
- `src/run-history/services/team-member-run-view-projection-service.ts`

Diagnostic/runtime-native Codex components:

- `src/agent-execution/backends/codex/history/codex-thread-history-reader.ts`
- `src/agent-execution/backends/codex/history/codex-thread-history-item-normalizer.ts`
- `src/agent-execution/backends/codex/items/codex-tool-item-family.ts`
- `src/run-history/projection/providers/codex-run-view-projection-provider.ts`

The normal display projection path uses:

- domain run ids for AutoByteus-owned identity;
- explicit `memoryDir` basenames for standalone and resolved root-hierarchical
  team-member local replay reads;
- Codex thread ids only as runtime-native metadata, not as display-source
  selectors.

For Codex live streams, the provider adapter closes each content-bearing logical
reasoning block through the generic `SEGMENT_END(reasoning)` lifecycle before
the real transcript/lifecycle boundary that ended it. The server-owned memory
recorder and `RuntimeMemoryEventAccumulator` flush that exact block at the end
event, before a new ordered tool card, assistant text, turn transition, or
terminal error is applied. The accumulator's existing generic visible-write
flushes remain idempotent safeguards, not a substitute for provider lifecycle
completion. This ordering lets restart/history reload show thinking rows before
the corresponding local replay tool cards or assistant text without duplicating
the reasoning record. An abnormal provider/process disappearance that supplies
neither a supported boundary nor a terminal error is not speculatively repaired
from Codex native history.

Tool replay uses one complete-corpus logical interaction per compound identity.
New minimal results carry the verified canonical name locally and obtain
arguments from their call even when rotation places the pair in different
files. Historical name-less results and result-side name/argument supersets
remain readable; supersets can override historical call metadata only inside
the read projection. That overlay is never used to decide a new write.

`AgentRunViewProjectionService` owns the source-authority policy and always
loads local replay projection through `LocalMemoryRunViewProjectionProvider`,
regardless of `runtimeKind`. It has no normal UI branch that selects
`CodexRunViewProjectionProvider`, no local/native merge path, and no recovery
from native thread history when local replay is missing.

`TeamMemberRunViewProjectionService` resolves team/member metadata, including
the member memory directory, and delegates to `AgentRunViewProjectionService`.
It must not read member raw traces as a second projection beside another source
and must not pass Codex native provider output into focused member history.

Codex `thread/read` replay still maps active Codex tool item families for
diagnostics and protocol investigation:

- `dynamicToolCall` -> canonical `tool_call` rows for unrelated custom dynamic
  tools. Migrated server-owned backend tool families are not Codex dynamic
  tools.
- `mcpToolCall` -> canonical `tool_call` rows with canonicalized Agent Tools MCP
  names when applicable, or server-qualified names for other MCP servers when
  available.
- `webSearch` -> `search_web`.
- `commandExecution` -> `run_bash`.
- `fileChange` -> `edit_file`.

Those runtime-native rows are not the normal UI display authority. Missing
Codex display rows after reload should be fixed in the live normalized event
and local raw-trace recording path so the application-owned replay trace
contains the expected reasoning/tool/text facts.

Projection consumers must apply conversation and Activity rows as one replay
bundle. If a subscribed live context is preserved during reopen, the frontend
must preserve both the live conversation and the live Activity feed instead of
hydrating Activity-only rows from projection. Team reopen may hydrate projected
Activity only for newly materialized member contexts whose projected
conversation is being applied.

## Event-Normalization Rules

- Raw Codex event interpretation stays inside `src/agent-execution/backends/codex/events/`.
- Completed Codex reasoning snapshots are grouped under one allocator-owned
  logical segment id per active turn. A real ordered boundary emits exactly one
  status-neutral `SEGMENT_END(reasoning)` for that id before the boundary's own
  event(s). Real boundaries include user/non-reasoning transcript items,
  assistant text, first creation of an ordered tool card (including a
  result-first creation), turn completion/start, and terminal error. Matching
  updates to an already-positioned tool card and provider-maintenance/no-effect
  events do not close the block. A completed snapshot without a correlatable
  turn emits adjacent content/end events with the same id and `turn_id: null`.
  Turn-start/error global cleanup closes every active content-bearing block in
  deterministic order. Generic transport, frontend retention, and memory code
  must consume this lifecycle without adding Codex-specific completion logic.
- `item/started` / `item/completed` with `item.type = dynamicToolCall` are the authoritative raw owners for non-migrated Codex dynamic-tool execution lifecycle. The converter emits display segments and execution lifecycle separately: start produces `SEGMENT_START(tool_call)` plus `TOOL_EXECUTION_STARTED`, and completion produces exactly one terminal `TOOL_EXECUTION_SUCCEEDED` or `TOOL_EXECUTION_FAILED` before `SEGMENT_END(tool_call)`.
- `item/started` with `item.type = mcpToolCall` follows the split surface and is the canonical start authority for storage-only memory. `item/completed(mcpToolCall)` closes the display segment, while `codex/local/mcpToolExecutionCompleted` emits exactly one terminal lifecycle event enriched with the pending call's canonicalized tool name, turn id, and arguments. Those terminal fields serve live lifecycle consumers and missing-call materialization; the recorder verifies any supplied terminal name against lifecycle state, persists that canonical name on the raw result, and continues to keep arguments call-only.
- `item/started` / `item/completed` with `item.type = webSearch` are the authoritative raw owners for Codex built-in `search_web` execution lifecycle. The converter emits the same separated transcript and lifecycle surfaces: start produces `SEGMENT_START(tool_call, tool_name=search_web)` plus `TOOL_EXECUTION_STARTED(search_web)` but omits `arguments` for a provider placeholder; completion supplies the authoritative action arguments in exactly one terminal lifecycle event before `SEGMENT_END(tool_call)`. Storage therefore defers the call until terminal readiness instead of persisting placeholder `{}`.
- Raw `function_call_output` remains diagnostic `TOOL_LOG` output for dynamic tools. It is not the terminal lifecycle authority and must not be used as a substitute for success/error Activity state.
- Browser/media/task-delegation/communication/published-artifact tools from
  `autobyteus_agent_tools` use the MCP lifecycle path, not Codex
  `dynamicToolCall`.
- `item/started` / `item/completed` with `item.type = fileChange` are the authoritative raw owners for Codex `edit_file` lifecycle. After conversion, `AgentRunEventPipeline` derives the Artifacts-tab `FILE_CHANGE` event; Codex frontend code must not infer artifacts from supplemental diff events.
- Codex may expose multiple start-like normalized facts for one file operation. Duplicate identical interim `FILE_CHANGE` `pending` updates for the same path/source invocation are acceptable when idempotent, followed by terminal `available`/`failed`, and the run-file-changes projection remains one row.
- `turn/diff/updated` is treated as supplemental diff information and is intentionally not promoted into lifecycle or artifact ownership.
- `rawResponseItem/completed` for custom tool completions is not the authoritative owner of `apply_patch` file mutation state.
- The durable raw-event mapping table lives in `docs/design/codex_raw_event_mapping.md` and should be updated before adding new Codex raw-event handling.

## Operational Notes

- Approval requests, tool calls, file changes, and final-answer deltas are all normalized into the standard runtime event spine.
- In practice, Codex may emit visible final-answer text only after reasoning finishes, which can make text streaming appear as a late burst even though lifecycle/tool events are still live.
- Large long-running Codex turns can also become bursty and include long silent gaps at the native `codex app-server` layer; when debugging attribution, compare native raw deltas with backend `SEGMENT_CONTENT` cadence before blaming the AutoByteus bridge.
- Team member runtime identity is server-allocated and opaque; route keys/member paths remain the team routing identity, and Codex thread ids are stored separately as runtime-native references.
- Storage-only Codex memory appends active raw traces and updates the working-context snapshot for normal user/assistant/tool records. Dynamic tools, MCP tool calls, and built-in tool-like items such as `search_web` are recorded from normalized lifecycle events as a strict call plus minimal terminal result; display `SEGMENT_*` events alone are not treated as memory tool-result authority. Existing historical split/superset rows are read directly and are not rewritten or backfilled; no migration, schema-version branch, or Memory Sync change is involved. Provider compaction boundaries may additionally rotate settled active raw traces into segmented archive entries while leaving the boundary marker active. There is no Codex semantic compaction, archive compression, total-storage retention window, or snapshot windowing policy in this path.
- Raw Codex debug capture is available through `CODEX_THREAD_RAW_EVENT_LOG_DIR`; see `docs/design/codex_raw_event_mapping.md` for the audit workflow and file format.

## Validation Notes

- Durable long-turn attribution probes live under `tests/integration/runtime-execution/codex-app-server/thread/`.
- `codex-raw-vs-backend-cadence.probe.test.ts` compares native raw `item/agentMessage/delta` cadence with backend `SEGMENT_CONTENT` cadence in the same run.
- `codex-long-turn-cadence.probe.test.ts` records backend long-turn event cadence over time.
- `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` is the gated live
  mixed-runtime task-delegation proof. The default command
  `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mixed-task-delegation.e2e.test.ts --no-file-parallelism`
  should skip when live flags are absent. To exercise the live path, run with a
  working LMStudio Qwen model and Codex `gpt-5.5`; use exact `LMSTUDIO_MODEL_ID`
  pinning for deterministic provider-native tool calls, or omit it to use the
  `LMSTUDIO_TARGET_TEXT_MODEL`/default Qwen fragment fallback. This proof also
  protects task-centered `SYSTEM_TASK_NOTIFICATION` display content, uniform
  member/team activation copy, no duplicate member-input echo, and the canonical
  `review_task_result.comment` review field. Example:
  `RUN_MIXED_TASK_DELEGATION_E2E=1 RUN_CODEX_E2E=1 APP_ENV=test LMSTUDIO_TARGET_TEXT_MODEL=qwen3.6-27b CODEX_E2E_TASK_DELEGATION_MODEL=gpt-5.5 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mixed-task-delegation.e2e.test.ts --reporter=dot`.
- These live probes are intentionally opt-in and require the matching local
  runtime prerequisites; they must not become default CI prerequisites.

## MCP Mode

MCP-based Codex remains a valid optional path when you want Codex as a tool rather than a runtime:

- use MCP mode when Codex should be one tool among others inside an AutoByteus-native agent
- use `codex_app_server` when Codex itself should own the run/thread lifecycle

The native runtime is the canonical integration path for run history, restore, projection, approvals, and team-member runtime orchestration.
