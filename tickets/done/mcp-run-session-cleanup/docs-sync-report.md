# Docs Sync Report — mcp-run-session-cleanup

## Scope

- Ticket: `mcp-run-session-cleanup` (Project Task `autobyteus-193`); `task_size=Small`, `architectural_risk=Low`, direct low-risk route
- Trigger: API/E2E Pass `API-REV-001`, commit `477152956c`
- Bootstrap base: `origin/personal` @ `fc93276e6f`; integrated base: `origin/personal` @ `b5e4dd6cdc`, merged as `98365d815d`
- Post-integration verification: `evidence/DR-01` … `DR-04`

## Why Docs Were Updated

- The fix added a "Server Instance Lifetime" section to `mcp_server_management.md`; delivery checked it against the code.
- Two other module docs list exactly what a run's resource release does, and the list was now incomplete.

## Long-Lived Docs Reviewed

| Doc Path | Result | Notes |
| --- | --- | --- |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` | No change (by delivery) | "Server Instance Lifetime" (from the fix) matches `AgentRunResourceManager.release()` (once per run, not awaited, warning on failure) and `McpServerInstanceManager.cleanupMcpServerInstancesForAgent` (detach first, then `Promise.allSettled` close, per-server warning) |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Updated | The release-step sentence in published-run finalization |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Updated | The release-step sentence in "Published-Run Finalization" |
| Other docs naming `AgentRunResourceManager` (`agent_work_journal.md`, `skill_update_notices.md`, `artifact_file_serving_design.md`) | No change | They describe their own observers, not the release step list |

## Docs Updated

| Doc Path | What Changed | Why |
| --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Release now also "starts closing the external MCP server instances opened for the run (in the background, never failing the release)", linked to "Server Instance Lifetime" | The step list would otherwise say release leaves those instances alone |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Same addition, distinguishing the external MCP server instances from the Agent Tools run-session | Same |

## Removed / Replaced Components Recorded

| Old | Replaced By | Where Documented |
| --- | --- | --- |
| `McpServerInstanceManager.cleanupAllMcpServerInstances()` (unused; typecheck passes without it) | Per-run close on release; the gateway scope stays shared | `mcp_server_management.md` "Server Instance Lifetime" |
| Sequential per-agent close that swallowed errors | Detach-first, parallel close with per-server warnings | same |

## Delivery Continuation

- Result: `Pass`
