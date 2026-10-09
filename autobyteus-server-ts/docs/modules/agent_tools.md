# Agent Tools

## Scope

Registers and exposes tool groups for agent runtime and APIs.

## TS Source

- `src/agent-tools`
- `src/startup/agent-tool-loader.ts`
- `src/api/graphql/types/tool-management.ts`

## Notes

Tool groups are loaded dynamically and logged per group at startup.

Browser-tool support has two explicit source families:

- embedded Electron runtimes resolve the Browser bridge only from environment
  variables injected at desktop startup; there is no remote runtime browser
  bridge registration or host-browser pairing source
- Docker and remote nodes get browser automation from configured MCP-origin
  tools inside that node/container, such as BrowserServer MCP; if no browser
  MCP tool is configured and selected, those nodes expose no browser tools
- browser tool exposure still stays subject to active source availability, the
  configured agent tool names, and the active runtime/tool projection
- Agent Tools MCP snapshots a source-aware route table per session. Inactive
  embedded browser adapters do not reserve names, browser-tool name overlaps
  prefer the selected configured MCP-origin route, and protected first-party
  platform/control adapters such as `send_message_to` still block configured
  MCP name collisions
- Codex App Server and Claude Agent SDK receive selected embedded-browser or
  configured MCP-origin browser tools through the unified
  `autobyteus_agent_tools` Agent Tools MCP descriptor; the old Codex browser
  `dynamicTools` path and old Claude `autobyteus_browser` MCP server path are
  not retained for these migrated tools

## Runtime Exposure Resolution

`src/agent-execution/shared/runtime-agent-tool-exposure.ts` is the common
runtime-neutral boundary before native schemas or Agent Tools MCP projection.
It trims and deduplicates configured `AgentDefinition.toolNames`. For every
run with a `MemberExecutionContext`, `automaticCollaborationToolNames(context)`
then unions:

- `send_message_to`, `delegate_task` and `create_or_update_task` for every
  member context (`create_or_update_task` marks DONE the Task a description-only
  delegation created; see [Projects](./projects.md#tasks-with-no-project-ad-hoc));
- `get_handoff_rules` only when the context is Team-scoped (`teamScoped: true`:
  Team and Org members, and members of a task Team in any root).

These tools apply even when the agent definition omitted them. Every
user-facing standalone run that can host collaborators (not a server helper
run with `launchPurpose: "server_helper"`, not application-owned) gets a host
member context from its Agent root (see
[Standalone Agent Run Root](./standalone_agent_run_root.md)), so it has
`send_message_to`, `delegate_task` and `create_or_update_task` from its first
turn. Every runtime reads the same list (AutoByteus through `requestedToolNames`,
Codex and Claude through `enabledProjectTaskToolNames` on the Agent Tools MCP
surface). A task Agent directly
under an Agent root is not Team-scoped and has no `get_handoff_rules`. Server
helper runs and application-owned runs have no member context and keep their
explicitly configured set. Browser, media, publishing, `list_available_agents`
and configured MCP-origin tools remain explicitly selected and availability-gated.

The native AutoByteus backend owns an additional runtime-derived baseline. For
ordinary native standalone or team runs, it prepends exactly `run_bash`,
`read_file`, `edit_file`, and `write_file` before delegating to the shared
normalization and team-tool composition. The baseline is deduplicated with
configured names, materialized through the existing native registry, and never
written back to `AgentDefinition.toolNames`. Mixed-team filtering may remove
legacy local task tools but does not remove any foundation tool. The existing
`write_file` trusted-local path, approval, overwrite, and execution contracts
remain authoritative.

Direct native compaction bypasses Agent construction entirely and sends no tool
schemas to its isolated LLM. The former exact-ID Memory Compactor empty-tool
exception is removed. It must not be used to infer tool exposure for ordinary
agents: even an ordinary empty persisted `toolNames` set receives the native
four-tool baseline and applicable Team tools.

Claude Agent SDK and Codex App Server continue to call the runtime-neutral
boundary directly. They do not inherit the native baseline; their configured
and team-derived exposure remains governed by their existing provider
projection and availability rules.

Prompt composition does not inspect configured/effective tool names and does
not render an `Available Tools` catalog. Tool manifests and schemas are
provider-native, out-of-band capability contracts.

## Server-Owned Agent Communication Tools

`send_message_to` and `get_handoff_rules` are the shared first-party Agent
communication tools. Their canonical contracts, logical-address parsing,
runtime-neutral services, result projection, direct exact-run routing,
and optional direct-message grants live under `src/agent-communication`;
AutoByteus, Codex, and Claude adapters project the same contracts through their
effective runtime surfaces. Codex App Server and Claude Agent SDK project both
tools through the server-hosted
`autobyteus_agent_tools` MCP descriptor instead of runtime-specific
send-message wrappers/handlers.

`send_message_to` accepts exactly one target selector:

- `recipient_address` for one canonical absolute non-root `/...` logical
  Agent-or-AgentTeam address. Relative addresses, the structural root `/`, and
  bare names are invalid. This selector requires a current `MemberTeamContext`,
  routes through root Team placement/delivery, and is the path that creates Team
  Communication projection and message-owned `reference_files`. An AgentTeam
  address targets its mounted configured coordinator ingress.
- `target_agent_run_id` for an exact `AgentRun.runId`. A target in the
  sender's own collaboration root is delivered through that root, which wakes a
  shut-down delegated child first and records ordinary root communication. Any
  other target routes through `AgentRunManager.getActiveRun(...)`, rejects
  inactive, unknown, preallocated-only, recoverable-only, or lazy-startable-only
  ids, posts direct input to the active target run, and emits a direct
  `INTER_AGENT_MESSAGE` without Team Communication projection fields.

Explicitly configured standalone runs can use `target_agent_run_id` without team context.
They cannot use `recipient_address` unless the run is actually executing as a team
member. Every valid team context receives `send_message_to` automatically; the
active delivery binding and root topology resolver still govern whether a call succeeds. See
[Agent Communication](./agent_communication.md) for the full selector and
projection contract.

Message and task tools share only the canonical caller coordinate and minimal
placement result. The caller coordinate is frozen
`{rootTeamRunId,memberAddress}`. Placement is frozen Agent
`{kind:"agent",address}` or Team
`{kind:"team",address,ingressAddress}`; parent Team, segments, local name, route
selector, and task direct-owner eligibility are derived by the owning operation.
Tool adapters must not recreate member-path, route-key, owner-config, or handle
fields beside these canonical addresses.

`get_handoff_rules` takes no arguments and is available only to a Team-bound
Agent with collaboration context. It returns `{ handoffs }`, where every entry
is one ordered `{ when, recipient_address }` rule. It succeeds with an empty
list when no edge exists, does not authorize delivery, and rejects missing Team
context. `send_message_to` separately returns the canonical
`{accepted,code,message,target_agent_run_id}` operation result. Accepted calls
return the exact existing AgentRun that accepted the message; rejected calls
return `target_agent_run_id:null`. The removed generic `result` field is not a
compatibility surface. AutoByteus JSON and MCP text/structured results preserve
the same strict shape.

## Server-Owned Agent Discovery Tool

`list_available_agents` (`src/agent-tools/agent-discovery/`) is an **opt-in**
tool (REQ-001): it is registered in the tool registry (category Agent
Communication) so it appears in the tool picker, and an agent gets it only when
its definition's `toolNames` select it. It is never added automatically.
`RuntimeAgentToolExposure.listAvailableAgentsEnabled` records the selection.

- The tool takes no arguments and returns
  `{ agents: [{ name, kind: "agent" | "agent_team", address, description }] }`,
  the same JSON on every runtime.
- It is bound to the sender's `MemberExecutionContext`:
  `MemberCollaborationContext.listAvailableAgents` calls the sender's root
  (`listAvailableAgents(sender)` on the Team, Org and Agent roots), which answers
  from `CollaboratorCandidatePolicy.listEligible` and `CatalogAddressMap`. The
  handler adds no logic and nothing is written (see
  [Agent Communication](./agent_communication.md#collaborators)).
- AutoByteus binds a local tool instance to the member context
  (`createBoundListAvailableAgentsTool`); Codex, Claude, AGY and the other MCP
  runtimes receive it through the Agent Tools MCP adapter
  (`list-available-agents-mcp-adapter-provider.ts`), available only to a sender
  whose context can list. Runs without a catalog (application-owned and server
  helper runs) have no lister, so the tool is skipped there.

The tool controls discovery only. Any agent may bring in or delegate to an
available address with `send_message_to` or `delegate_task` whether or not it
has the tool (REQ-006).

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

The service derives a deterministic `agtrun_...` routing ID from the normalized
run ID, snapshots configured tool exposure and current execution context, and
derives `enabledTools` from server-supported definitions plus selected
MCP-origin registry definitions. Active run-session validity is owner-lifetime
and process-memory scoped: the tokenless descriptor works only while the exact
current registry entry is active. The endpoint is served by one host-owned
ephemeral loopback listener, not the main Studio/standalone HTTP server; raw
peer, `Host`, and optional `Origin` admission replaces bearer authentication.
Within one process, stop/restore reuses the deterministic route and activates
fresh current context. A process restart rematerializes the descriptor against
the new listener. `tools/list` returns only tools enabled for that run-session,
and `tools/call` rejects unknown or unconfigured tools before executor dispatch.
The default adapter catalog supports
`send_message_to`, `get_handoff_rules`, browser, media, task-delegation, `publish_artifacts`
and `list_available_agents` tool families by delegating to their existing family manifests/services instead
of runtime-specific handlers. Configured MCP-origin tools delegate through the
registry-created tool and existing MCP proxy path, preserving registered names
such as prefixed `db_query` at the provider boundary while the proxy owns the
remote MCP tool call. Codex App Server and Claude Agent SDK materialize this
surface when at least one configured tool is available for the session. Their
provider/server-qualified wire names stay below the runtime converter;
application events, run history, and memory expose canonical registered tool
names and must not contain internal run-session routing details.
See
[Agent Tools MCP Server](./agent_tools_mcp_server.md) for the route, lifecycle,
security, and adapter contract.

## Server-Owned Task Delegation Tool

The server owns one first-party delegation tool for collaboration roots (Team,
Org, and the Agent root of a standalone run):

- `delegate_task`

Canonical contracts, schemas, parsing, result serialization, root binding, and
service lookup live under `src/agent-tools/task-delegation`. Delegation is a
pure spawn; there is no task record, status, submission, or review. The retired
`submit_task_result` and `review_task_result` tools are not exposed on any
runtime, and legacy configured names for them (and for the old native task-plan
tools `create_task`, `create_tasks`, `assign_task_to`, `get_my_tasks`,
`get_task_plan_status`, `update_task_status`) are ignored.

Runtime projection is explicit and uses the same manifest/service boundary:

- Mixed AutoByteus standalone member/task-agent runs may receive a thin
  server-owned local wrapper for `delegate_task` when included in effective
  exposure, and they strip the legacy task-management tool names from mixed
  team contexts.
- Codex App Server and Claude Agent SDK receive `delegate_task` through the
  unified `autobyteus_agent_tools` Agent Tools MCP descriptor. The old Codex
  task-delegation `dynamicTools` path and the old Claude `autobyteus_team` MCP
  server path are not retained.
- A valid team context automatically exposes `delegate_task` even when omitted
  from the agent definition. This layer must not add provider `tool_choice`
  policy or forced-tool dampening to compensate for model/prompt behavior.

Every `delegate_task` call must be bound to an active collaboration root and
the current member identity. Each root resolves the required canonical absolute
non-root `recipient_address` with `resolveDelegationPlacement`: configured
placements first, then the run's collaborators (shared Agents and Agent Teams
brought in by an agent's first message, or with `@` in runs saved by earlier
releases, or a member of a collaborator Team), then an eligible **catalog** Agent or Agent Team at its
listed address (`CatalogAddressMap`; see `list_available_agents`), including a
teammate inside the sender's own catalog Team copy (taken from that copy's
snapshot). See [Agent Communication](./agent_communication.md#collaborators).
Every call starts a fresh copy: an ordinary delegated child with the system task
notice and its own run IDs. Parallel copies are allowed, and there is no limit.
- Delegating to a collaborator leaves the hosted instance unaffected.
- Delegating to a catalog address adds **only the copy**, never a collaborator
  entry. The copy records its `source` (`TaskExecutionSource`), which activation
  and restore read first.
- Copies are placed by address (`resolveTaskCopyHost`, REQ-012): a teammate
  copy inside the delegator's own Team instance, any other copy at the root.

The normal way to keep working with one ongoing instance is `send_message_to`
(`MessageRecipientResolution`): the sender's own Team instance first, then a
configured member or a collaborator, otherwise a listed catalog Agent or Team
brought in on first use. In Team and Org roots an Agent cannot delegate to its
own logical placement. The Agent root refuses only the host's address, so a
collaborator that delegates to its own address gets an extra copy (C-11). There
is no caller-supplied target kind, flat-name lookup, or compatibility input.

`delegate_task` takes ready-to-run `description` content (objective, context,
constraints, done conditions, expected output, and reference guidance) and
optional `reference_files`. Member targets start one task-agent instance; team
targets start one task-scoped child team run whose coordinator receives the
work packet. The work packet (delegator address and AgentRun ID, description,
reference files) is the child's first message. Multiple independent pieces of
work are delegated through additional `delegate_task` calls.

`delegate_task` has three strict input modes: `{recipient_address, task_id}` and
`{recipient_address, description, reference_files?}` spawn a new copy;
`{target_team_run_id | target_agent_run_id, task_id}` gives a saved Task to an
existing copy (see [Follow-up Task to an existing copy](projects.md#follow-up-task-to-an-existing-copy)).
`recipient_address` is therefore not required by the parameter schema; the
parser requires exactly one mode.

The result is a strict union, also published as the MCP output schema
(`anyOf`). It names every ID for what it is:

```text
{ delegated: true, target_kind: "agent", target_agent_run_id: "<Agent copy run ID>", task_id?: "…" }
{ delegated: true, target_kind: "team", target_team_run_id: "<Team copy run ID>",
  target_team_coordinator_agent_run_id: "<its coordinator AgentRun ID>", task_id?: "…" }
{ delegated: false, message: "<why nothing started>" }
```

An address that is neither a configured placement, a collaborator nor an
available catalog agent of the run returns `{ delegated: false,
message }` ("'…' is not a mounted Agent or Agent Team, a collaborator or an
available agent of this run."); it is not a tool error. A catalog copy that
cannot run with the run's settings also starts nothing and returns
`{ delegated: false, message: "<name> cannot be delegated to: <reason>" }`.
Collaborators are added by the user's `@` send or by an agent's first
`send_message_to` to a listed address; both use the same admission, and a
failure there is `COLLABORATOR_ADD_FAILED`. Input errors (`VALIDATION_ERROR`, `INVALID_REFERENCE_FILE`) and a
root that is not admitting (`ROOT_RUN_NOT_ACTIVE`) are tool errors raised before
anything is prepared. The original logical `recipient_address` remains the mounted
definition, not an alias for the child.

The two collaboration modes are intentionally not interchangeable.
`send_message_to` reaches the one instance at an address. A listed catalog
Agent or Team that is not yet in the run is brought in on first use, and later
messages reach the same instance. Messaging never creates a second instance,
and `send_message_to` by run ID creates nothing.
`delegate_task` starts a fresh child and delivers the complete work packet as
the creation call; the same packet must not be resent through
`send_message_to`. The accepted result names the copy (see above), plus
`task_id` when a description-only delegation from an agent that is not working
on a Task created a Task with no Project for the copy; the caller marks it DONE
with `create_or_update_task({task_id, status: "DONE"})` when the work is
finished, which stops the copy and hides it. After delegation, parent and child communicate only through
`send_message_to` with run IDs, in both directions. A child that stays quiet is
shut down after the grace period, but not while it has a running background
task, and a same-root message to its run ID restores it with its conversation (see
[Delegated Child Lifecycle](./agent_team_execution.md#delegated-child-lifecycle)).

`reference_files` on `delegate_task` must be normalized absolute local paths of
existing files. Callers should pass full paths returned by file-writing tools or
resolve local files with `realpath` before invoking the tool. Relative paths,
URLs/protocol-shaped values, `..` segments, directories, and missing files are
rejected with `INVALID_REFERENCE_FILE` before anything is prepared; no
workspace-relative compatibility resolver runs.

## Server-Owned Media Tools

The server owns the first-party media agent-tool boundary for:

- `generate_image`
- `edit_image`
- `generate_speech`
- `generate_video`

Canonical contracts, schemas, parsing, model-default resolution, media-local
path resolution, and execution orchestration live under `src/agent-tools/media`.
Provider-specific image/audio/video clients still come from `autobyteus-ts`
multimedia infrastructure, but the old direct `autobyteus-ts` media `BaseTool`
classes are no longer the active first-party registration path.

Runtime projection is explicit:

- AutoByteus uses thin local tool wrappers registered from the server media
  manifest.
- Codex App Server and Claude Agent SDK receive configured media tools through
  the unified `autobyteus_agent_tools` Agent Tools MCP descriptor. The old Codex
  media `dynamicTools` path and the old Claude `autobyteus_image_audio` MCP
  server path are not retained for these migrated tools.

`generate_image`, `edit_image`, and `generate_video` use an array-shaped
`input_images` public contract across all projections. Callers must pass image
references as `string[]` values, including one-element arrays for a single
reference. String or comma-separated `input_images` values are rejected rather
than compatibility-parsed, which avoids corrupting data URIs that legitimately
contain commas.

`generate_video` is a creation-only boundary. It supports prompt-only video
creation plus image/reference-image creation through `generation_config.task`
values `text_to_video`, `image_to_video`, and `reference_to_video`; editing,
uploaded/source-video editing, audio-reference upload, and stateful
`previous_interaction_id` continuation are not part of this tool contract.

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

`generate_image` additionally uses a media-owned synchronous deadline rather
than a generic tool watchdog. `MediaGenerationService` resolves a valid integer
timeout from an internal execution override, then
`MEDIA_OPERATION_TIMEOUT_MS`, then 300,000 ms (allowed range
10,000-3,600,000 ms). The active turn signal is propagated to supported
provider/download transports. Generated bytes stage under an invocation lease
and publish through a per-final-path lock only while that lease remains current,
so timeout, cancellation, same-path retry, or unsupported-provider late
completion cannot publish a false success or overwrite newer/final bytes.
`edit_image`, `generate_speech`, and `generate_video` retain their existing
duration semantics while still receiving supported cancellation signals.

All media tools return the canonical result shape `{ file_path }`. Runtime event
normalizers preserve that result shape from Agent Tools MCP provider wire names
such as `mcp__autobyteus_agent_tools__generate_image` and
`mcp__autobyteus_agent_tools__generate_video`, so generated media files
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
run-session ID or provider-qualified server/tool name.
