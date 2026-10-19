# Docs Sync Report — mcp-sdk-1-32-upgrade

## Scope

- Ticket: `mcp-sdk-1-32-upgrade` (Project Task `autobyteus-181`, FU-8 of `autobyteus-175`); `task_size=Medium`, `architectural_risk=Low`, direct low-risk route
- Trigger: API/E2E Pass, `API-REV-001` round 1, API/E2E commit `53ef702bd3`
- Bootstrap base reference: `origin/personal` @ `436b85ce93`
- Integrated base reference used for docs sync: `origin/personal` @ `bf3c550c18`, merged into the ticket branch as `7d02301c3a` (no conflicts, no file overlap)
- Post-integration verification reference: `evidence/DR-01` … `DR-05` (see `release-deployment-report.md`)

## Why Docs Were Updated

- Summary: the implementation changed no long-lived doc. Two behaviors are durable and were undocumented: (1) remote MCP requests follow redirects only within the configured origin (SDK 1.32 default, deliberately kept), with the user-visible error; (2) the only supported external MCP transports are `stdio` and `streamable_http`, with WebSocket removed and how other types are rejected or skipped.
- Why this should live in long-lived project docs: the redirect rule is a credential-safety contract that a future SDK upgrade or `redirectPolicy` change must not silently break; the transport list removes a dead option from the mental model.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` | Owner module for external MCP servers; has the 179 credentials section | Updated | New "Redirects" subsection and "Supported Transports" section |
| `autobyteus-web/docs/tools_and_mcp.md` | Frontend MCP transports and form | No change | Already lists only STDIO and Streamable HTTP; no UI change in this ticket |
| `autobyteus-ts/docs/*` (`tool_schema_and_configuration.md`, `nodejs_architecture.md`) | Core MCP mentions | No change | Neither describes transports, loaders or the SDK seams |
| All `*.md` docs, grep for WebSocket MCP transport | Removed component | No change | No doc described a WebSocket MCP transport; remaining WebSocket mentions are app streaming/terminal transports |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` | New behavior + removed component | "Redirects": same-origin followed with credentials; cross-origin not followed, error text, zero requests to the other origin, use the final URL; 301/302 on POST not followed (SDK contract). "Supported Transports": `stdio`/`streamable_http` only; other `transport_type` values (e.g. `websocket`) rejected by the core parser with `Valid types are: stdio, streamable_http.`; bulk import counts them as failed, reason in the server log; stored unparseable entries skipped at startup | Durable contract of this ticket |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Redirect policy | Do not set `redirectPolicy: 'follow'`; credentials must stay on the configured origin | `requirements-doc.md` REQ-002, DEC-003; API-01/01M | `mcp_server_management.md` |
| Transport set | WebSocket removed (SDK cannot carry headers; not an MCP spec transport; never persisted) | `requirements-doc.md` DEC-001 | `mcp_server_management.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `autobyteus-ts/src/tools/mcp/server/websocket-managed-mcp-server.ts`, WebSocket config type, factory branch, exports, tests | Nothing (transport removed); parser rejects `websocket` | `mcp_server_management.md` "Supported Transports" |
| `setSdkLoader` seams, `any` casts and constructor/export fallbacks in the stdio/HTTP loaders | Typed `await import()` of the SDK with its own types, one path each | Code; no doc described the seams |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, verification record, finalization
