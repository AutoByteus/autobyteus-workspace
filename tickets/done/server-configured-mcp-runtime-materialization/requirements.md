# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Autobyteus can configure external MCP servers, discover/register their tools into the shared `autobyteus-ts` tool registry, and assign those registered tool names to an agent definition. The native Autobyteus runtime can then execute those tools through `GenericMcpTool` and `McpServerProxy`. Codex App Server and Claude Agent SDK runtimes currently only materialize the session-scoped AutoByteus Agent Tools MCP server for built-in server-owned tool families; configured external MCP-origin tools selected on the same agent definition are not exposed to those provider runtimes.

The goal is that one configured MCP tool selection on an agent definition works consistently across native Autobyteus, Codex App Server, and Claude Agent SDK runtimes without duplicating runtime-specific external MCP config policy or leaking configured MCP secrets into provider-specific durable files/logs.

## Investigation Findings

- `autobyteus-ts` owns the core configured-MCP model: `BaseMcpConfig`, `StdioMcpServerConfig`, `StreamableHttpMcpServerConfig`, `WebsocketMcpServerConfig`, `McpConfigService`, `McpToolRegistrar`, `McpServerInstanceManager`, `GenericMcpTool`, and `McpServerProxy`.
- `autobyteus-server-ts` persists configured MCPs through `McpConfigService` / `FileMcpServerConfigProvider`, loads them at startup through `runMcpToolRegistration`, and registers discovered tools in `defaultToolRegistry` as `ToolOrigin.MCP` with `metadata.mcp_server_id`.
- Agent definitions store only `toolNames: string[]`; there is no distinct field for MCP server IDs or remote tool names. A configured MCP tool selected by an agent is represented by the registered tool name, which may include `tool_name_prefix`.
- Native Autobyteus runtime resolves `agentDefinition.toolNames` through `resolveAutoByteusAgentTools`; MCP-origin names are created from `defaultToolRegistry` and execute through `GenericMcpTool`.
- Codex and Claude runtime paths resolve `ConfiguredAgentToolExposure`, but that structure currently classifies only known server-owned Agent Tools MCP families: browser, media, task delegation, `send_message_to`, and `publish_artifacts`. Unknown configured MCP-origin tool names remain only in `configuredToolNames` and are not materialized.
- `AgentToolMcpSessionService` creates one session-scoped `autobyteus_agent_tools` Streamable HTTP MCP descriptor. `AgentToolMcpCatalog` currently has a static adapter set for built-in server-owned tools only, so configured MCP-origin tools cannot appear in `tools/list` for Codex/Claude.
- Directly materializing configured external MCP servers as separate Codex/Claude provider config entries would not preserve existing Autobyteus semantics cleanly: provider config schemas differ from `BaseMcpConfig` (`cwd`, WebSocket, auth/token/header behavior, per-tool prefix mapping, and event-name canonicalization all need extra policy). It would also duplicate connection/secret policy outside the current MCP config owner.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Feature
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue with Shared Structure Looseness
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: `ConfiguredAgentToolExposure` retains all names but only classifies built-in Agent Tools MCP families; `AgentToolMcpCatalog` statically lists built-in adapter providers; Codex/Claude materializers only consume `AgentToolMcpDescriptor`; native Autobyteus resolves arbitrary registry tools including MCP-origin tools; direct provider materialization would need provider-specific reconstruction of remote names, auth, cwd, WebSocket, and event canonicalization.
- Requirement or scope impact: The requirements should extend the runtime-facing Agent Tools MCP exposure boundary to include selected configured MCP-origin registry tools, rather than creating separate direct provider materializers for every external MCP server as the first implementation.

## Recommendations

Use the existing session-scoped AutoByteus Agent Tools MCP endpoint as the authoritative runtime-facing materialized MCP config for Codex and Claude, and extend its catalog to include selected configured MCP-origin tools from the shared registry. The provider runtimes should continue to receive one run-scoped `autobyteus_agent_tools` MCP server config, but `tools/list` for that session should include both built-in server-owned tools and the agent-definition-selected external MCP-origin registered tool names.

Do **not** make Codex/Claude directly materialize the raw external MCP server configs in this change. That path should remain a future option only after a separate provider-schema compatibility design resolves `cwd`, WebSocket, token/header semantics, prefixed registered names versus remote names, and canonical event-name mapping.

## Scope Classification (`Small`/`Medium`/`Large`)

Large

## In-Scope Use Cases

- UC-001: A server-configured MCP tool assigned to an agent definition remains usable by the native Autobyteus runtime.
- UC-002: The same assigned MCP-origin registered tool appears in the Codex run's materialized Agent Tools MCP `tools/list` and can be called by Codex.
- UC-003: The same assigned MCP-origin registered tool appears in the Claude SDK run's materialized Agent Tools MCP `tools/list` and can be called by Claude.
- UC-004: A configured MCP server with `tool_name_prefix` exposes the registered/prefixed tool name to Codex/Claude while execution still delegates to the original remote MCP tool name through existing Autobyteus MCP execution machinery.
- UC-005: Built-in server-owned Agent Tools MCP tool families and configured external MCP-origin tools can coexist in one session without name collisions, secret leakage, or bypassing the agent definition's configured tool list.

## Out of Scope

- Directly materializing external configured MCP servers as separate Codex `mcp_servers` / Claude `mcpServers` entries.
- Changing the user-facing semantics of existing native Autobyteus MCP tool execution.
- Adding new configured MCP transports beyond what `autobyteus-ts` already supports.
- General UI work beyond any already-required tool configuration and selection surfaces.
- Fixing unrelated MCP token/header persistence semantics unless implementation discovers that the selected proxy path needs a small owner-local tightening to preserve current behavior.

## Functional Requirements

- REQ-001: The server must resolve agent-definition-selected configured MCP-origin tools from `agentDefinition.toolNames` by consulting the authoritative shared tool registry and tool metadata, not by re-parsing persisted MCP config names in Codex/Claude runtime code.
- REQ-002: The Agent Tools MCP catalog must expose selected, enabled, discovered MCP-origin registry tools in session `tools/list` alongside existing built-in Agent Tools MCP adapters.
- REQ-003: Configured MCP-origin tool execution through Agent Tools MCP must delegate to existing Autobyteus MCP execution ownership (`GenericMcpTool` / `McpServerProxy` / `McpServerInstanceManager`) so transport, prefix, environment, workspace, and cleanup semantics remain consistent with native runtime execution.
- REQ-004: The materialized Codex config must continue to use the session-scoped `autobyteus_agent_tools` MCP server descriptor and must include the selected configured MCP-origin tool names in that descriptor's enabled tool list.
- REQ-005: The materialized Claude SDK config must continue to use the session-scoped `autobyteus_agent_tools` MCP server descriptor and must allow selected configured MCP-origin tool names through Claude's allowed-tool policy.
- REQ-006: Configured MCP-origin tools must remain gated by the agent definition's configured `toolNames`; editing provider-side `enabled_tools` / `allowedTools` must not grant access to unconfigured tools.
- REQ-007: Tool name collisions between built-in Agent Tools MCP adapters and configured MCP-origin registry tools must be rejected or skipped deterministically with an actionable diagnostic; no ambiguous owner may expose the same tool name.
- REQ-008: MCP tool results returned through the Agent Tools MCP proxy must preserve successful/error semantics and useful content for the provider runtime; implementation must not flatten arbitrary MCP results in a way that makes common configured MCP tools unusable.
- REQ-009: Bearer tokens, configured MCP env values, headers, and other secret-bearing config values must not be logged, persisted into runtime-specific durable files, or surfaced in frontend events/history as part of materialization or execution.

## Acceptance Criteria

- AC-001: Given an agent definition whose `toolNames` includes a discovered MCP-origin registered tool, a native Autobyteus run can still instantiate and execute that tool through `resolveAutoByteusAgentTools`.
- AC-002: Given the same agent definition on Codex App Server, the run-scoped materialized config contains `mcp_servers.autobyteus_agent_tools`, and that session's `tools/list` includes the configured MCP-origin registered tool name.
- AC-003: Given the same agent definition on Claude Agent SDK, the run-scoped `mcpServers` contains `autobyteus_agent_tools`, and that session's `tools/list` includes the configured MCP-origin registered tool name.
- AC-004: Calling the configured MCP-origin tool through Codex/Claude reaches the original configured MCP server and remote tool via existing Autobyteus MCP execution classes, not through a provider-specific duplicate config path.
- AC-005: For a configured MCP server with `tool_name_prefix: "db"` and remote tool `query`, Codex/Claude see and call `db_query`, while execution delegates to remote tool `query` on the configured server.
- AC-006: If an agent definition does not include a configured MCP-origin tool name, that tool is absent from Agent Tools MCP `tools/list` and calls to it are rejected before remote MCP execution.
- AC-007: If a configured MCP-origin tool name collides with a built-in Agent Tools MCP adapter name, the session does not expose an ambiguous tool and emits/logs an actionable diagnostic without leaking secrets.
- AC-008: Runtime/frontend tool events and run history use canonical registered tool names and do not expose provider wire names, session URLs, bearer tokens, configured MCP env values, or headers.

## Constraints / Dependencies

- Existing worktree/branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools` on `codex/streamable-mcp-runtime-tools`.
- Existing uncommitted files from `tickets/open-tab-streamable-mcp-browser-regression` must not be overwritten by this ticket.
- `AgentToolMcpCatalog` is currently static after construction; exposing MCP-origin registry tools will require an owner-local refactor or dynamic bridge.
- `ToolDefinition` metadata for MCP-origin tools currently records `mcp_server_id`; if execution/result mapping needs registered-to-remote identity outside the existing `GenericMcpTool` instance, metadata may need to be tightened to include remote tool name explicitly.
- Claude SDK local type definitions show direct HTTP and stdio MCP config support but stdio lacks `cwd`; Codex CLI local help shows stdio and streamable HTTP MCP registration but not all Autobyteus config fields. This reinforces avoiding direct external config materialization in this change.

## Assumptions

- Configured MCP tools are discovered/registered before they can be selected and used by an agent definition.
- Agent definitions intentionally select registered tool names, not raw MCP server IDs or remote tool names.
- The existing server Agent Tools MCP endpoint is the correct runtime-facing boundary for provider runtimes that cannot call Autobyteus in-process tools directly.
- If a configured MCP server is disabled or its tools are not registered, its tools should not be exposed to Codex/Claude.

## Risks / Open Questions

- Whether current `AgentOperationResult` / `AgentToolsMcpResultMapper` can represent arbitrary remote MCP results well enough, or whether the adapter result contract needs a raw MCP result pass-through variant.
- Whether `GenericMcpTool` can be invoked from Agent Tools MCP adapters with the correct per-run `agentId` and workspace semantics, given that `McpServerInstanceManager.setWorkspacePathProvider` is available but no server-side setter usage was found.
- Whether existing persisted configured MCP auth fields need owner-local tightening; investigation found `token` fields in DTO/UI but native HTTP client currently uses `headers`.
- Whether tool collision handling should be enforced at MCP discovery/registration time or only when creating Agent Tools MCP sessions.

## Requirement-To-Use-Case Coverage

| Requirement | Covered Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-002, UC-003, UC-004 |
| REQ-002 | UC-002, UC-003, UC-005 |
| REQ-003 | UC-001, UC-004 |
| REQ-004 | UC-002, UC-005 |
| REQ-005 | UC-003, UC-005 |
| REQ-006 | UC-002, UC-003, UC-005 |
| REQ-007 | UC-005 |
| REQ-008 | UC-002, UC-003, UC-004 |
| REQ-009 | UC-002, UC-003, UC-005 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Native runtime regression guard |
| AC-002 | Codex materialized Agent Tools MCP exposure includes configured MCP-origin tools |
| AC-003 | Claude materialized Agent Tools MCP exposure includes configured MCP-origin tools |
| AC-004 | Execution delegation uses existing configured MCP execution owner |
| AC-005 | Prefix/remote-name behavior remains correct |
| AC-006 | Agent-definition gating remains authoritative |
| AC-007 | Collision safety |
| AC-008 | Secret and provider-name leakage prevention |

## Approval Status

Approved by user on 2026-06-16 after review of the bigger direction. User explicitly asked to kick off the ticket and noted deeper implementation-detail investigation may still refine the concrete design.
