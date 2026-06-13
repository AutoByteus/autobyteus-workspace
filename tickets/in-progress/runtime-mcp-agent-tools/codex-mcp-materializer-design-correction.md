# Codex MCP Materializer Design Correction

## Status

Accepted as a solution-design correction on 2026-06-13. This artifact supersedes the earlier Claude-only / Codex-dynamic scope assumption in the requirements, investigation notes, design spec, and matrix response.

## Trigger

The user challenged the design because the current `design-spec.md` had left Codex App Server on dynamic `send_message_to`, even though the upstream `streamable-mcp-runtime-tools` investigation had already proved Codex MCP config support and the product direction is a unified Agent Tools MCP solution.

## Investigation Answer

Codex App Server does support the MCP config path we need, but the product should not use process-level `--config` / `-c` for run/member bearer descriptors.

- Prior upstream probe proved `codex app-server --stdio -c mcp_servers.autobyteus_agent_tools.*` can initialize a Streamable HTTP MCP server and call its tools.
- Process-level `-c` is unsafe in AutoByteus because Codex app-server clients are keyed/reused by normalized `cwd`; a run/member bearer descriptor must not be injected into a shared process.
- Refreshed protocol generation on 2026-06-13 showed `ThreadStartParams` and `ThreadResumeParams` both accept `config?: { [key: string]: JsonValue } | null`.
- Refreshed local probe at `/tmp/autobyteus-agent-tools-mcp-thread-config-probe-20260613-133706/result.json` passed `config.mcp_servers.autobyteus_agent_tools` in `thread/start`; Codex app-server initialized the MCP server and successfully called a tool.

## Design Decision

Codex App Server `send_message_to` is in scope for this ticket and must cut over to Agent Tools MCP using thread-scoped app-server config:

```text
CodexThreadBootstrapper
  -> if send_message_to configured:
       AgentToolMcpSessionService.createAgentToolMcpSession(...)
       materialize descriptor to config.mcp_servers.autobyteus_agent_tools
       exclude send_message_to from Codex dynamic tool specs/handlers
  -> CodexThreadManager.startRemoteThread / resumeRemoteThread
       sends config: { mcp_servers: { autobyteus_agent_tools: ... } }
  -> Codex app-server MCP client calls /mcp/agent-tools/:sessionId
  -> Agent Tools MCP executor
  -> SendMessageToDispatcher
```

Forbidden shapes:

- Codex process-level `--config` / `-c` bearer injection on the shared cwd-keyed app-server process.
- `CODEX_APP_SERVER_ARGS` / `CODEX_APP_SERVER_ARGS_JSON` bearer injection.
- Trusted project `.codex/config.toml` or any durable bearer-token file.
- Dynamic `send_message_to` fallback after the Agent Tools MCP cutover.
- Generic all-runtime materializer that hides runtime-specific config and cleanup ownership.

## Artifact Updates

Updated artifacts:

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-spec.md`

Superseded assumption:

- Any prior statement that “Codex remains dynamic-tool based” for `send_message_to` is superseded. Codex dynamic tools remain valid for non-`send_message_to` tool families only.
