# Docs Sync Report

## Scope

- Ticket: `general-mcp-gateway-analysis`
- Trigger: Delivery-stage docs sync after post-API/E2E durable coverage-code re-review passed.
- Bootstrap base reference: `origin/personal` at `79857c513dd6d6e25c4b7761cb5aa0d3a805c227`, recorded in `investigation-notes.md` as the task base/finalization target.
- Integrated base reference used for docs sync: Docs were initially synced after `git fetch origin` at `origin/personal` `79857c513dd6d6e25c4b7761cb5aa0d3a805c227`; after the remote advanced, the ticket branch was checkpointed and latest `origin/personal` `9637ec7130df52841a89f786210ba147c4439b0a` (`v1.3.61`) was merged without conflicts before the latest Electron verification build.
- Post-integration verification reference: Branch `codex/general-mcp-gateway-analysis` integrated HEAD `e6a0d6e02be7d61274858e46b4b5a0d1513f63bf`; `merge-base(HEAD, origin/personal)` equals `origin/personal` `9637ec7130df52841a89f786210ba147c4439b0a`, branch ahead/behind `2 / 0`; `git diff --check` passed before the integrated Electron rebuild, and `NO_TIMESTAMP=1 APPLE_TEAM_ID= AUTOBYTEUS_BUILD_FLAVOR=personal pnpm -C autobyteus-web build:electron:mac` passed.

## Why Docs Were Updated

- Summary: Long-lived server and web docs now describe the new stable `/mcp/gateway` Streamable HTTP endpoint, `AUTOBYTEUS_MCP_GATEWAY_TOKEN`, no-token local-loopback-only behavior, MCP-origin-only tool scope, and Settings/Tools MCP Gateway panel behavior.
- Why this should live in long-lived project docs: The implementation adds a reusable external-client integration surface and user-facing settings panel. Future maintainers and users need canonical docs that distinguish the new general MCP gateway from run-scoped Agent Tools MCP and MCP Server Management.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/README.md` | Server environment setup must mention the new gateway token and no-token fallback. | `Updated` | Added `AUTOBYTEUS_MCP_GATEWAY_TOKEN` note under environment notes. |
| `autobyteus-server-ts/docs/README.md` | Server docs index should point readers to the new gateway module. | `Updated` | Added `modules/mcp_gateway.md` to module docs description. |
| `autobyteus-server-ts/docs/modules/mcp_gateway.md` | New canonical backend module doc needed for the gateway endpoint. | `Updated` | New file documents endpoint, auth modes, tool scope/execution, frontend visibility, and out-of-scope boundaries. |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Existing run-scoped MCP docs needed to distinguish `/mcp/agent-tools/:sessionId` from `/mcp/gateway`. | `Updated` | Added General MCP Gateway distinction and out-of-scope note. |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` | External MCP import docs needed to show how registered MCP-origin tools feed both run-scoped Agent Tools MCP and the new gateway. | `Updated` | Added gateway relationship and token guidance for external desktop clients. |
| `autobyteus-web/docs/tools_and_mcp.md` | Frontend Tools/MCP docs needed Settings -> MCP Gateway panel and GraphQL `origin: MCP` behavior. | `Updated` | Added module structure, state action, component sections, query note, and related backend docs. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/mcp_gateway.md` | New module doc | Documented `/mcp/gateway`, Streamable HTTP methods, supported JSON-RPC methods, token/no-token access model, MCP-origin-only catalog/calls, execution through `GenericMcpTool` / `McpServerProxy`, client config example, frontend panel, and out-of-scope boundaries. | Promote durable runtime/API behavior from ticket artifacts into canonical backend docs. |
| `autobyteus-server-ts/README.md` | Environment note | Added optional `AUTOBYTEUS_MCP_GATEWAY_TOKEN` behavior and local-loopback-only fallback when unset. | Make the operational security setting visible during server setup. |
| `autobyteus-server-ts/docs/README.md` | Docs index | Mentioned `modules/mcp_gateway.md` in module docs overview. | Help readers discover the new canonical gateway doc. |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Boundary clarification | Distinguished run-scoped Agent Tools MCP from the new general gateway; recorded that Agent Tools MCP is not the general `/mcp/gateway`. | Prevent future conflation of runtime/session-scoped internal tool projection with the external MCP-origin-only gateway. |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` | Relationship clarification | Documented that MCP Server Management feeds both the run-scoped Agent Tools MCP surface and the new `/mcp/gateway` surface. | Keep the import/registration owner docs aligned with the new exposed gateway path. |
| `autobyteus-web/docs/tools_and_mcp.md` | Frontend feature docs | Added MCP Gateway tab/panel, `mcpGatewayTools`, `fetchMcpGatewayTools()`, `tools(origin: MCP)` query note, token/no-token guidance, and related backend docs links. | Document the user-visible Settings -> MCP Gateway panel behavior and data source. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| General MCP Gateway endpoint | `/mcp/gateway` is a stable Streamable HTTP MCP endpoint for external clients and is separate from `/mcp/agent-tools/:sessionId`. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/mcp_gateway.md`, `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` |
| Gateway access policy | `AUTOBYTEUS_MCP_GATEWAY_TOKEN` enables bearer-token access; without it, access is local-loopback-only and remote-style requests are rejected. | `implementation-handoff.md`, `code-review-report.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/mcp_gateway.md`, `autobyteus-server-ts/README.md` |
| MCP-origin-only exposure | Gateway `tools/list` and `tools/call` use only current `ToolOrigin.MCP` registry definitions and fail closed for missing/non-MCP-origin names. | `requirements.md`, `design-spec.md`, `api-e2e-coverage-investigation.md` | `autobyteus-server-ts/docs/modules/mcp_gateway.md`, `autobyteus-server-ts/docs/modules/mcp_server_management.md` |
| Existing MCP proxy execution path | Gateway calls execute through registry-created MCP tools and the existing `GenericMcpTool` / `McpServerProxy` path, not through an AgentRun session. | `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/mcp_gateway.md` |
| Settings -> MCP Gateway panel | The frontend MCP management area now has `MCP Servers` and `MCP Gateway` tabs; the panel shows endpoint/config guidance and fetches `tools(origin: MCP)` for the count/list. | `implementation-handoff.md`, `api-e2e-execution-coverage-report.md`, `code-review-report.md` | `autobyteus-web/docs/tools_and_mcp.md`, `autobyteus-server-ts/docs/modules/mcp_gateway.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Treating Agent Tools MCP as the only server-hosted outbound MCP surface | Distinct surfaces: run-scoped `/mcp/agent-tools/:sessionId` and general MCP-origin-only `/mcp/gateway` | `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md`, `autobyteus-server-ts/docs/modules/mcp_gateway.md` |
| External client guidance only through MCP server import / run-scoped runtime materialization docs | General gateway client config guidance with token/no-token access rules | `autobyteus-server-ts/docs/modules/mcp_gateway.md`, `autobyteus-web/docs/tools_and_mcp.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A - docs were updated`
- Rationale: `N/A`

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed and was then carried through a later user-requested latest-base merge from `origin/personal` `9637ec7130df52841a89f786210ba147c4439b0a`. The merge completed without conflicts; delivery ran `git diff --check`, rebuilt the macOS arm64 Electron app successfully, and recorded upstream review/API-E2E plus integrated-build results in the handoff artifacts.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: `N/A`
- Recommended recipient: `N/A`
- Why docs could not be finalized truthfully: `N/A`
