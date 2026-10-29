# Docs Sync Report — mcp-http-error-status

## Scope

- Ticket: `mcp-http-error-status`: show the HTTP status in remote MCP connection errors (FU-002 of autobyteus-182)
- Trigger: API/E2E Pass `API-REV-001` (direct Small / Low route)
- Bootstrap base reference: `origin/personal` at `66d834b0ac`
- Integrated base reference used for docs sync: `origin/personal` at `7f41314aa8`, merged into `codex/mcp-http-error-status` as `8a804a1ee1`
- Post-integration verification reference: `evidence/DEL-01-integrated-rerun.log` (build, core MCP unit and integration 116 passed, the three MCP HTTP e2e files 8/8)

## Why Docs Were Updated

- Summary: the server's MCP module doc said that AutoByteus shows the SDK's error text unchanged and that a remote HTTP failure reads `SdkHttpError: Error POSTing to endpoint: <body>`. After this change, a failed remote connect reads `Error: HTTP <status> <reason>: Error POSTing to endpoint: <body>`, and the cross-origin redirect message now starts with `HTTP 307 Temporary Redirect: `.
- Why this should live in long-lived project docs: the doc is where people look up the error texts users and agents see. Those texts are also asserted by e2e suites.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` | Lists the MCP error texts and the redirect message | Updated | Sections "Redirects" and "Verifying An MCP SDK Upgrade" |
| `autobyteus-web/docs/tools_and_mcp.md` | Web preview/discover error display | No change | Describes only "a recoverable validation error". The web shows the GraphQL message verbatim, and no web code changed. |
| `autobyteus-ts/docs/` (MCP and runtime call-stack docs) | Core library owns `HttpManagedMcpServer` | No change | No doc names the connect error text |
| `TESTING.md` | MCP test rows | No change | The commands are unchanged. The suites changed only inside existing files. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` | Behavior text | Redirects: the cross-origin message now starts with `HTTP 307 Temporary Redirect: `. Error text: a failed remote connect puts `HTTP <status> <reason>` first, followed by the SDK text. It covers: no reason phrase; a 404 with an empty body; how preview, discover and a native tool call show it; failures without an HTTP answer stay unchanged; HTTP errors after connect stay unchanged; agents on Agent Tools MCP runtimes see JSON-RPC `Internal error` (FU-001). | The old text (`SdkHttpError: …`, "AutoByteus does not reword it") is no longer true |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| HTTP status in connect errors | The SDK keeps the status on `SdkHttpError`, not in its message. `HttpManagedMcpServer` adds it at connect only. Post-connect errors (U-001) are deliberately unchanged. | `design-spec.md`, `investigation-notes.md` (U-001) | `mcp_server_management.md` |
| Agent Tools MCP masking | AGY/Codex/Claude agents see `Internal error` for any external tool failure | `follow-ups.md` FU-001 | `mcp_server_management.md` (current behavior only; the fix is FU-001) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Remote HTTP connect failure text `SdkHttpError: Error POSTing to endpoint: …` | `Error: HTTP <status> <reason>: Error POSTing to endpoint: …` | `mcp_server_management.md`, "Verifying An MCP SDK Upgrade" |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A (docs updated)

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, verification and repository finalization
- Notes: delivery also corrected one evidence path in `follow-ups.md` FU-001 (`API-11-agent-wire` → `API-09-11-agent-wire`, the folder that exists).
