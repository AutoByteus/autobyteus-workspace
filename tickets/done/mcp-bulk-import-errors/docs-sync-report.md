# Docs Sync Report — mcp-bulk-import-errors

## Scope

- Ticket: `mcp-bulk-import-errors` (Project Task `autobyteus-190`); `task_size=Small`, `architectural_risk=Low`, direct low-risk route
- Trigger: API/E2E Pass `API-REV-001`, commit `d1ba170610`
- Bootstrap base: `origin/personal` @ `41be799edb`; integrated base: `origin/personal` @ `3d4d9d0a95` (two ticket-only records), merged as `59637ac3af`
- Post-integration verification: `evidence/DR-01-integrated-mcp-e2e-and-web.log`

## Why Docs Were Updated

- The implementation updated the frontend doc's Bulk Import section.
- The server MCP module doc's "Supported Transports" section said a bulk import gives only a failed count, with per-entry reasons in the server log. It did not describe how a transport is inferred when `transport_type` is absent. Both statements are now wrong.

## Long-Lived Docs Reviewed

| Doc Path | Result | Notes |
| --- | --- | --- |
| `autobyteus-web/docs/tools_and_mcp.md` (Bulk Import) | No change (by delivery) | The implementation's text matches the view, store and the inference rule in `config-service.ts` |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` (Supported Transports) | Updated | See below |

## Docs Updated

| Doc Path | What Changed | Why |
| --- | --- | --- |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` | "Supported Transports" now states the one transport rule (explicit `transport_type`/`transportType`, else `url` → `streamable_http`, else `command` → `stdio`, else a named error), shared by bulk import and `mcps.json` loading. It also documents the `importMcpServerConfigs` result: counts plus `failures` `{ serverId, reason }`, value-free reasons, and whole-input errors with an empty list. The stale "reason is in the server log" sentence is removed | The doc would otherwise contradict the shipped behavior |

## Removed / Replaced Components Recorded

| Old | Replaced By | Where Documented |
| --- | --- | --- |
| Bulk import that required `transport_type`, with its server-side checks in `mcp-config-service.ts` (about 90 lines changed) | The core parser's shared rule (`McpConfigService.transportTypeOf`) | `mcp_server_management.md` "Supported Transports" |
| Count-only import result | Counts plus `failures` | same; `tools_and_mcp.md` Bulk Import |

## Delivery Continuation

- Result: `Pass`
