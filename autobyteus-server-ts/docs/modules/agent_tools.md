# Agent Tools

## Scope

Registers and exposes tool groups for agent runtime and APIs.

## TS Source

- `src/agent-tools`
- `src/startup/agent-tool-loader.ts`
- `src/api/graphql/types/tool-management.ts`

## Notes

Tool groups are loaded dynamically and logged per group at startup.

Browser-tool support is runtime-gated:

- embedded Electron runtimes resolve the Browser bridge from environment variables injected at desktop startup
- remote nodes can resolve the same Browser bridge through an in-memory runtime registration when a desktop client explicitly pairs that node with its local browser
- browser tool exposure still stays subject to the active runtime/tool projection and the configured agent tool names
- Codex App Server and Claude Agent SDK receive configured browser tools
  through the unified `autobyteus_agent_tools` Agent Tools MCP descriptor when
  browser support is available; the old Codex browser `dynamicTools` path and
  old Claude `autobyteus_browser` MCP server path are not retained for these
  migrated tools

## Server-Owned Agent Communication Tool

`send_message_to` is the shared first-party agent communication tool. Its
canonical contract, selector parsing, runtime-neutral dispatcher, direct
exact-run routing, and optional direct-message grants live under
`src/agent-communication`; AutoByteus, Codex, and Claude adapters project the
same contract through their configured runtime surfaces. Codex App Server and
Claude Agent SDK now project `send_message_to` through the server-hosted
`autobyteus_agent_tools` MCP descriptor instead of runtime-specific
send-message wrappers/handlers.

The tool accepts exactly one target selector:

- `recipient_name` for a team-local roster recipient. This selector requires a
  current `MemberTeamContext`, routes through team delivery, and is the path that
  creates Team Communication projection and message-owned `reference_files`.
- `target_agent_run_id` for an exact currently active `AgentRun.runId`. This
  selector routes through `AgentRunManager.getActiveRun(...)`, rejects inactive,
  unknown, preallocated-only, recoverable-only, or lazy-startable-only ids, posts
  direct input to the active target run, and emits a direct `INTER_AGENT_MESSAGE`
  without Team Communication projection fields.

Standalone configured runs can use `target_agent_run_id` without team context.
They cannot use `recipient_name` unless the run is actually executing as a team
member. See [Agent Communication](./agent_communication.md) for the full selector
and projection contract.

## Server-Hosted Agent Tools MCP Server

`src/agent-tools/mcp` provides the AutoByteus Agent Tools MCP Server, a
session-scoped Streamable HTTP MCP surface for external runtimes that need to
call configured AutoByteus tools. Runtime materializers receive descriptors for
the reserved MCP server name `autobyteus_agent_tools` and endpoint
`/mcp/agent-tools/:sessionId`.

This server-hosted MCP surface is not the MCP Server Management subsystem.
MCP Server Management imports external MCP servers into AutoByteus; the Agent
Tools MCP Server exposes configured AutoByteus tools outward to an MCP client.
That outward set includes selected built-in server-owned tool families and
selected `ToolOrigin.MCP` registry tools discovered from configured external MCP
servers. Codex App Server and Claude Agent SDK do not receive direct
provider-native copies of raw external MCP config for those tools.

The session service snapshots configured tool exposure, stores only a bearer
token hash, derives `enabledTools` from server-supported definitions and
selected MCP-origin registry definitions, and redacts secret descriptors for
diagnostics. Active session validity is owner-lifetime and process-memory
scoped: the descriptor works only while the registry entry is present, not
revoked, and matched by bearer auth; restart or registry reset invalidates old
descriptors until the runtime materializes a fresh descriptor. `tools/list`
returns only tools enabled for that session, and `tools/call` rejects unknown or
unconfigured tools before executor dispatch.
The default adapter catalog supports
`send_message_to`, browser, media, task-delegation, and `publish_artifacts`
tool families by delegating to their existing family manifests/services instead
of runtime-specific handlers. Configured MCP-origin tools delegate through the
registry-created tool and existing MCP proxy path, preserving registered names
such as prefixed `db_query` at the provider boundary while the proxy owns the
remote MCP tool call. Codex App Server and Claude Agent SDK materialize this
surface when at least one configured tool is available for the session. Their
provider/server-qualified wire names stay below the runtime converter;
application events, run history, and memory expose canonical registered tool
names and must not contain bearer/header descriptor details.
See
[Agent Tools MCP Server](./agent_tools_mcp_server.md) for the route, lifecycle,
security, and adapter contract.

## Server-Owned Task Delegation Tools

The server owns the first-party bounded task-delegation surface for team runs:

- `delegate_tasks`
- `submit_task_result`
- `review_task_result`

Canonical contracts, schemas, parsing, result serialization, team-run binding,
and service lookup live under `src/agent-tools/task-delegation`. The model-facing
surface is intentionally smaller than the legacy native task-plan tools:
`create_task`, `create_tasks`, `assign_task_to`, `get_my_tasks`,
`get_task_plan_status`, and the old local task-plan `update_task_status` are not
part of the delegation workflow.

Runtime projection is explicit and uses the same manifest/service boundary:

- Mixed AutoByteus standalone member/task-agent runs may receive thin
  server-owned local wrappers for the canonical delegation and acceptance tools
  when configured, and they strip the legacy task-management tool names from
  mixed team contexts.
- Codex App Server and Claude Agent SDK receive configured task-delegation
  tools through the unified `autobyteus_agent_tools` Agent Tools MCP descriptor.
  The old Codex task-delegation `dynamicTools` path and the old Claude
  `autobyteus_team` MCP server path are not retained for these migrated tools.
- Tool availability is configuration-driven. Runtime adapters must not expose
  these tools when the member is not configured for them, and this layer must
  not add provider `tool_choice` policy, forced-tool dampening, or
  framework-driven auto-acceptance to compensate for model/prompt behavior.

All task-delegation tool calls must be bound to an active team run and current
member identity. `delegate_tasks` creates one or more internal delegation ledger
records from exact `member_name`, ready-to-run rich `description`, and optional
`reference_files` work-packet inputs, then starts runnable task-agent instances
with direct work packets. Do not encode dependencies in a task item; dependent
follow-up work is delegated by the coordinator later through another
`delegate_tasks` call. Bound task-agents submit reviewable output with
`submit_task_result`; the tool accepts only `message` and optional
`reference_files` because the task is inferred from task-agent context. Original
delegators review the latest pending submission with `review_task_result`, using
`decision="accept"` to finalize or `decision="request_revision"` plus a message
to send system revision instructions. `send_message_to` remains available for
ordinary communication/handoffs only; it is not task result/review/acceptance.

## Server-Owned Media Tools

The server owns the first-party media agent-tool boundary for:

- `generate_image`
- `edit_image`
- `generate_speech`

Canonical contracts, schemas, parsing, model-default resolution, media-local
path resolution, and execution orchestration live under `src/agent-tools/media`.
Provider-specific image/audio clients still come from `autobyteus-ts`
multimedia infrastructure, but the old direct `autobyteus-ts` media `BaseTool`
classes are no longer the active first-party registration path.

Runtime projection is explicit:

- AutoByteus uses thin local tool wrappers registered from the server media
  manifest.
- Codex App Server and Claude Agent SDK receive configured media tools through
  the unified `autobyteus_agent_tools` Agent Tools MCP descriptor. The old Codex
  media `dynamicTools` path and the old Claude `autobyteus_image_audio` MCP
  server path are not retained for these migrated tools.

`generate_image` and `edit_image` use an array-shaped `input_images` public
contract across all projections. Callers must pass image references as
`string[]` values, including one-element arrays for a single reference. String
or comma-separated `input_images` values are rejected rather than
compatibility-parsed, which avoids corrupting data URIs that legitimately
contain commas.

Image references may be URLs, data URIs, local filesystem paths, or `file:`
URLs. Local references and media output paths are resolved through the media
path resolver:

- relative local paths resolve inside the active workspace and may not traverse
  outside it
- absolute output paths may target any local path writable by the server process
- absolute local input paths and `file:` URL input paths may target any existing
  local file readable by the server process
- URL and data URI input references continue to pass through unchanged

The media resolver owns this media-specific policy. The generic
workspace/Downloads/system-temp safe-path helper remains available for unrelated
tools, but it is not the authority for server-owned media local paths.

All media tools return the canonical result shape `{ file_path }`. Runtime event
normalizers preserve that result shape from Agent Tools MCP provider wire names
such as `mcp__autobyteus_agent_tools__generate_image`, so generated media files
continue to project as generated-output file changes while application surfaces
see canonical names like `generate_image`.

## Server-Owned Published Artifacts Tool

`publish_artifacts` is the first-party publication boundary for artifacts that
an agent has already written. Its canonical contract and parameter schema live
under `src/services/published-artifacts` and
`src/agent-tools/published-artifacts`.

Runtime projection is explicit:

- AutoByteus uses the local server-owned wrapper.
- Codex App Server and Claude Agent SDK receive `publish_artifacts` through the
  unified `autobyteus_agent_tools` Agent Tools MCP descriptor. The old Codex
  dynamic registration path and the old Claude `autobyteus_published_artifacts`
  MCP server path are not retained for this migrated tool.

Agent Tools MCP execution publishes against the active owning run id and uses
the session execution context as fallback workspace, memory, and application
runtime context. Application-facing events and published-artifact projections
must use the canonical `publish_artifacts` identity and must not expose the MCP
session id, bearer token, or provider-qualified server/tool name.
