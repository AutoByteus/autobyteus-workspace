# Analysis Summary — Server-Configured MCP Tools for Codex and Claude Runtimes

## Short answer

The missing bridge is not in `autobyteus-ts` MCP execution. Native Autobyteus already works because configured MCP tools are discovered into `defaultToolRegistry` as `ToolOrigin.MCP`, selected by registered tool name on the agent definition, and executed through `GenericMcpTool` / `McpServerProxy`.

The gap is in the Codex/Claude runtime-facing exposure boundary: `ConfiguredAgentToolExposure` and `AgentToolMcpCatalog` only recognize built-in server-owned Agent Tools MCP families. Unknown MCP-origin registered tool names remain in `configuredToolNames`, but they are not included in the `autobyteus_agent_tools` MCP session descriptor and cannot appear in Codex/Claude `tools/list`.

## Recommended direction

Extend the existing session-scoped AutoByteus Agent Tools MCP server to expose agent-definition-selected MCP-origin registry tools.

In practice, Codex/Claude should still receive one run-scoped materialized MCP config entry:

- Codex: `mcp_servers.autobyteus_agent_tools`
- Claude: `mcpServers.autobyteus_agent_tools`

But that session's enabled tools and `tools/list` should include both:

1. existing built-in Agent Tools MCP adapters (`open_tab`, `generate_image`, `send_message_to`, etc.), and
2. selected configured MCP-origin registered tools from `defaultToolRegistry`.

This preserves one authoritative runtime-facing boundary and avoids reconstructing external MCP config directly in each provider runtime.

## Why not direct materialization of external MCP servers first?

Directly adding each configured external MCP server to Codex/Claude provider configs looks tempting, but investigation found multiple semantic mismatches:

- Agent definitions store registered tool names, not remote MCP tool names; prefixed tools need registered-to-remote mapping.
- `ToolDefinition` metadata currently records `mcp_server_id`, but not the remote tool name as public metadata.
- Autobyteus supports WebSocket MCP in `autobyteus-ts`; Claude SDK local types do not show WebSocket MCP config support.
- Autobyteus stdio config supports `cwd`; Claude SDK local MCP server config type does not include `cwd`.
- HTTP auth semantics are loose today: config types/UI include `token`, but native HTTP client uses `headers`; persisting/materializing token differently for Codex/Claude would create divergent behavior.
- Provider event names would become `mcp__server__remoteTool` and would need new per-run canonicalization maps back to registered AutoByteus tool names.
- Secrets would need to be copied into provider-specific configs for every external MCP server instead of staying behind the existing session capability boundary.

The proxy-through-Agent-Tools-MCP path lets existing Autobyteus MCP execution remain the owner of configured server transport details and keeps Codex/Claude materialization provider-simple.

## Current code facts

- `autobyteus-ts/src/tools/mcp/types.ts` defines MCP config classes for stdio, streamable HTTP, and WebSocket.
- `autobyteus-ts/src/tools/mcp/tool-registrar.ts` discovers remote tools and registers `ToolDefinition`s with `ToolOrigin.MCP` and `metadata.mcp_server_id`.
- `autobyteus-ts/src/tools/mcp/tool.ts` implements `GenericMcpTool`, which calls the remote MCP tool through `McpServerProxy(agentId, serverId)`.
- `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.ts` resolves arbitrary agent `toolNames` through `defaultToolRegistry`, which is why native runtime can use configured MCP tools.
- `autobyteus-server-ts/src/agent-execution/shared/configured-agent-tool-exposure.ts` only derives explicit family fields for browser/media/task-delegation/send-message/publish-artifacts; configured MCP-origin tools are not classified for provider runtime exposure.
- `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-catalog.ts` builds a static adapter map from built-in Agent Tools MCP providers; it does not consult `defaultToolRegistry` for MCP-origin tools.
- `codex-agent-tools-mcp-materializer.ts` and `claude-agent-tools-mcp-materializer.ts` only materialize the `AgentToolMcpDescriptor` they are given.

## Main implementation implication

The clean design should introduce a registry-backed configured-MCP tool bridge at the Agent Tools MCP catalog/session boundary, not provider-specific config reconstruction in Codex/Claude bootstrappers.

Likely implementation areas:

- Extend/tighten `ConfiguredAgentToolExposure` or add a sibling resolver that identifies configured MCP-origin registered tool names.
- Extend `AgentToolMcpCatalog` so built-in adapters and configured MCP-origin registry tools can both be resolved for a session.
- Add an adapter/executor path for MCP-origin registry tools that delegates to existing `GenericMcpTool`/`McpServerProxy`.
- Adjust result mapping if needed so arbitrary remote MCP results are preserved usefully through the Agent Tools MCP route.
- Ensure collision handling between built-in adapter names and MCP-origin registered tool names.
- Add Codex and Claude tests proving the materialized `autobyteus_agent_tools` session exposes the configured MCP-origin tool and executes it through existing MCP infrastructure.

## Formal artifacts

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/investigation-notes.md`
