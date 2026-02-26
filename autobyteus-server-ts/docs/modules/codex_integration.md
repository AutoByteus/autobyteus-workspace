# Codex Integration

## Goal

Enable a "Codex agent" in AutoByteus that can execute coding tasks through Codex, controllable from the existing AutoByteus Web agent UI.

## Recommendation

Use **Codex as an MCP server** first (fastest and lowest-risk path), then optionally add a native **Codex App Server** runtime later.

- Path A (recommended now): AutoByteus Agent -> MCP tools (`codex`, `codex-reply`) -> Codex CLI MCP server.
- Path B (future): AutoByteus Agent runtime talks directly to Codex App Server protocol.

## Why Path A Fits Current Architecture

Current AutoByteus already supports MCP end-to-end:

- MCP config + persistence + registration: `src/mcp-server-management/services/mcp-config-service.ts`
- MCP server GraphQL API: `src/api/graphql/types/mcp-server.ts`
- MCP tool registration in runtime registry: `src/tools/mcp/tool-registrar.ts` (from `autobyteus-ts`)
- Per-agent MCP server lifecycle: `src/tools/mcp/server-instance-manager.ts` and `src/agent/bootstrap-steps/mcp-server-prewarming-step.ts` (from `autobyteus-ts`)
- Frontend MCP management UI: `autobyteus-web/stores/toolManagementStore.ts`

Because this is already in place, Codex can be integrated without changing core agent execution flow.

## OpenAI Capability References

- Codex MCP integration guide: [https://developers.openai.com/codex/mcp](https://developers.openai.com/codex/mcp)
- Codex as MCP server (tools: `codex`, `codex-reply`): [https://developers.openai.com/codex/mcp-server](https://developers.openai.com/codex/mcp-server)
- Codex SDK / App Server protocol docs: [https://developers.openai.com/codex/sdk](https://developers.openai.com/codex/sdk), [https://developers.openai.com/codex/app-server](https://developers.openai.com/codex/app-server)

## Path A Implementation (Now)

### 1. Configure Codex MCP server

Use Tools -> MCP Servers in AutoByteus Web, or bulk-import `docs/examples/codex_mcp_import.json`.

Recommended server settings:

- `transport_type`: `stdio`
- `command`: `npx`
- `args`: `["-y","codex@latest","mcp-server","--model","codex-mini-latest","--approval-mode","full-auto","--sandbox","workspace-write"]`
- `tool_name_prefix`: `codex`
- `env.OPENAI_API_KEY`: your API key

### 2. Discover and register tools

Run "Discover and Register MCP Server Tools" for the configured server.

Expected tool names with prefix:

- `codex_codex`
- `codex_codex-reply`

### 3. Create a Codex agent definition

Create an agent definition (for example: `codex-agent`) with:

- Tool names: `["codex_codex","codex_codex-reply"]`
- Prompt family: choose an existing coding prompt (for this repo DB, `software engineering` + `implementation` is available)
- Keep optional tool list minimal; avoid giving this agent unrelated file/terminal tools at first

### 4. Run from frontend

When user sends input:

1. Web calls `sendAgentUserInput` (`src/api/graphql/types/agent-run.ts`)
2. Server builds agent with selected definition + model (`src/agent-execution/services/agent-run-manager.ts`)
3. Agent invokes Codex MCP tools
4. MCP proxy forwards to Codex CLI MCP server (`src/tools/mcp/server/proxy.ts` in `autobyteus-ts`)

## Runtime Call Stack (Path A)

Use case: user asks Codex agent to implement a feature.

1. `autobyteus-web` sends `sendAgentUserInput`.
2. `src/api/graphql/types/agent-run.ts:sendAgentUserInput(...)`
3. `src/agent-execution/services/agent-run-manager.ts:createAgentRun(...)`
4. `autobyteus-ts/src/agent/handlers/tool-invocation-request-event-handler.ts` (tool call lifecycle)
5. `autobyteus-ts/src/tools/mcp/tool.ts:GenericMcpTool._execute(...)`
6. `autobyteus-ts/src/tools/mcp/server/proxy.ts:callTool(...)`
7. `autobyteus-ts/src/tools/mcp/server-instance-manager.ts:getServerInstance(...)`
8. `autobyteus-ts/src/tools/mcp/server/stdio-managed-mcp-server.ts:createClientSession(...)`
9. Codex MCP server executes `codex` / `codex-reply` and returns output
10. AutoByteus streams result back through existing agent stream pipeline

## Path B (Future): Native Codex Agent Runtime

If you want Codex to be a first-class runtime (not a tool), build a new provider in `autobyteus-server-ts`:

- New service speaking Codex App Server protocol (session + turn lifecycle)
- New resolver/service bridge similar to existing agent stream handlers
- Add provider/model metadata into LLM management and frontend provider selection
- Optional: dedicated "Codex Agent" launcher in UI

This gives tighter control and richer Codex semantics, but is higher effort than MCP mode.

## Risks And Guardrails

- Sandbox/approval must be intentional (`--sandbox`, `--approval-mode`).
- Keep Codex agent toolset narrow to avoid tool recursion and noisy plans.
- Ensure `OPENAI_API_KEY` is injected only into the Codex MCP server process env.
- Monitor startup logs: MCP registration runs in background task `src/startup/mcp-loader.ts`.
