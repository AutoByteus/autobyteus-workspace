# Codex App Server MCP Rebind Probe

## Purpose

Determine whether Codex App Server 0.150.1 applies a changed thread-scoped MCP descriptor when AutoByteus resumes an already-persisted Codex thread in an app-server process that is still alive.

## Environment

- Date: 2026-08-27
- Codex executable: `/Users/normy/.local/bin/codex`
- Version: `codex-cli 0.150.1` (the same version visible in the user-supplied screenshot)
- Transport under test: Codex App Server newline-delimited JSON-RPC over stdio
- MCP transport: local Streamable HTTP test server
- Model identifier supplied to `thread/start` / `thread/resume`: `gpt-5.6-luna`
- Isolation: a temporary workspace and temporary `CODEX_HOME`; both were removed after each probe

The local fake MCP server exposed separate `old` and `new` URLs and recorded the endpoint selected by Codex. The probe used `mcpServer/tool/call` directly, so MCP binding behavior was tested independently of model choice or prompt/tool selection. A short failed-auth model turn was used only to make the temporary Codex rollout resumable; no model output was needed for the MCP assertions.

## Baseline: Same App-Server Process

1. Start one Codex app-server process.
2. Call `thread/start` with `mcp_servers.autobyteus_agent_tools` pointing to the old MCP URL and old bearer credential.
3. Directly call the fake `echo` MCP tool. Codex calls the old URL and receives `old`.
4. Mark the old URL revoked so it returns AutoByteus-shaped `HTTP 404` / `session_unavailable`.
5. Call `thread/resume` for the same Codex thread ID, supplying the same MCP server name with the new URL and new bearer credential.
6. Directly call the MCP tool again.

Observed result:

- `thread/resume` succeeded and returned the same Codex thread ID.
- The second tool call still went to the old URL with the old bearer credential.
- Codex surfaced the old endpoint's `HTTP 404` / `session_unavailable` failure.
- The new MCP URL received no initialize, list, or call request.

This reproduces the user's observable failure at the Codex/App-Server-to-AutoByteus boundary.

## Candidate Runtime Refresh Operations

Two additional same-process variants were executed:

- `thread/unsubscribe` before `thread/resume`: unsubscribe returned `status: unsubscribed`, but the later MCP tool call still used the old URL.
- `config/mcpServer/reload` after `thread/resume`: reload returned success, but the later MCP tool call still used the old URL.

A changed MCP server key was also supplied on resume. The newly named server was reported as unknown, confirming that the changed resume-time `mcp_servers` map was not materialized for the already-loaded thread.

## Fresh App-Server Process Control

1. Start a first Codex app-server process and create/materialize the persisted thread using the old MCP descriptor.
2. Stop that app-server process.
3. Mark the old descriptor revoked.
4. Start a second app-server process using the same temporary `CODEX_HOME`.
5. Call `thread/resume` with the same persisted Codex thread ID and the new MCP descriptor.
6. Directly call the fake MCP tool.

Observed result:

- The resumed Codex thread ID exactly matched the original thread ID.
- The second app-server process initialized and called the new MCP URL using the new credential.
- The tool returned `new` successfully.
- No post-revocation request was made to the old URL.

## Conclusion

AutoByteus already revokes the old Agent Tools MCP session and creates/passes a fresh descriptor on restore. The failure occurs when the Codex thread is resumed inside an app-server process that still has that thread's old MCP client materialized. Codex 0.150.1 retains the old MCP transport despite the changed `thread/resume.config`.

The probe proves that passing a changed descriptor to an already-loaded thread is insufficient. A fresh app-server process is one sufficient control, while reactivating the exact descriptor already cached by the thread is the other viable repair class. The approved product direction below selects stable descriptor reactivation so normal shared-process reuse remains unchanged.

## Final Approved Design-Direction Update

The probe establishes that an already-loaded Codex thread needs the same Agent Tools endpoint descriptor across supported run activations; it does not require a persistent secret. The final user-approved repair derives one deterministic, non-secret endpoint identity from the immutable AutoByteus run ID, uses it for both Codex and Claude, removes the internal bearer/header entirely, and registers fresh live execution context only while the run is active. Stop makes that stable route return the normal redacted unavailable response; restore recomputes and reactivates it. Explicit loopback-only HTTP admission supplies the trusted-local boundary. The fresh-process control remains causal evidence but is not the selected product fix.
