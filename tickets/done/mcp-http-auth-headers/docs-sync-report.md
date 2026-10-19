# Docs Sync Report — mcp-http-auth-headers

## Scope

- Ticket: `mcp-http-auth-headers` (Project Task `autobyteus-179`, FU-1 of `autobyteus-175`); `task_size=Small`, `architectural_risk=Low`, direct low-risk route
- Trigger: API/E2E Pass, `API-REV-001` round 1, API/E2E commit `c777c47490`
- Bootstrap base reference: `origin/personal` @ `d6f2d6ceb5`
- Integrated base reference used for docs sync: `origin/personal` @ `8d40ba3b6c`, merged into the ticket branch as `cebd751772` (no conflicts, no file overlap with this ticket)
- Post-integration verification reference: `evidence/DR-01` … `DR-05` (see `release-deployment-report.md`)

## Why Docs Were Updated

- Summary: the implementation already added the credentials section to the server's MCP management module doc. Delivery checked it against the integrated code and brought the web-side MCP doc in line: it described `token` only as an "optional authentication token" and did not say how it is sent, that both credentials go on every request, that token + `Authorization` is rejected, or that headers are edited through the JSON view.
- Why this should live in long-lived project docs: anyone configuring or changing remote MCP servers needs to know how the two credential fields reach the server and why both together are refused; the ticket artifacts will not be read later.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` | Owner module of `mcps.json` persistence and registration | No change (by delivery) | Updated in the implementation commit `b109a62ea6`: section "Remote (Streamable HTTP) Server Credentials". Checked against `types.ts` `requestHeaders()`, `http-managed-mcp-server.ts` `requestInit.headers` and `file-provider.ts`: accurate |
| `autobyteus-web/docs/tools_and_mcp.md` | Frontend MCP form, JSON view and transport field reference | Updated | See below |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Runtimes reach external MCP tools through the registry | No change | Describes the run-scoped endpoint; the credential path is below it and unchanged in shape |
| `autobyteus-server-ts/docs/modules/mcp_gateway.md` (linked from the web doc) | Gateway bearer token could be confused with server credentials | No change | Covers `AUTOBYTEUS_MCP_GATEWAY_TOKEN`, a different token |
| `autobyteus-web/docs/settings.md` | Settings sections list | No change | Only lists the MCP Servers section |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/tools_and_mcp.md` | Behavior clarification | Form feature list: token with the Bearer hint, headers through the JSON tab. Streamable HTTP field table: token sent as `Authorization: Bearer <token>`, blank = none; headers sent unchanged on every request. New paragraph: credentials on every request, token + `Authorization` rejected on save/preview/import, Form → JSON view keeps headers; link to the server module section | The old text was vague and did not state the fixed behavior |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Effective request headers | Derived only in `StreamableHttpMcpServerConfig.requestHeaders()`; passed to the SDK as `requestInit.headers` (the SDK ignores a top-level `headers` option) | `design-spec.md`, `investigation-notes.md` | `mcp_server_management.md` (implementation) |
| Token vs header conflict | Rejected, never overridden, any letter case | `requirements-doc.md` DEC-002 | both docs |
| Storage | Token and headers stored in plain text in `mcps.json` until the vault follow-up | `requirements-doc.md` R-001 / FU-2 | `mcp_server_management.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `{ url, headers }` options passed to `StreamableHTTPClientTransport` (ignored by SDK 1.30) and the dead fallback paths in `http-managed-mcp-server.ts` | `{ requestInit: { headers: config.requestHeaders() } }` | `mcp_server_management.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, verification record, finalization
- Notes: no Product Design docs apply (none requested).
