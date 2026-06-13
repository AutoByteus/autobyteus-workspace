# Docs Sync Report

## Scope

- Ticket: `streamable-mcp-runtime-tools`
- Trigger: Post-API/E2E durable coverage-code re-review passed and handed to delivery.
- Bootstrap base reference: `origin/personal` recorded at `97ea4ae2055510bcfc657624e3f9b2c5c6048227` in the investigation notes; reviewed/validated ticket state is based on the later branch state at `08078c26`.
- Integrated base reference used for docs sync: latest fetched `origin/personal` at `08078c268` on 2026-06-13; ticket branch `codex/streamable-mcp-runtime-tools` was already current with that tracked base, so no merge or rebase was needed before docs edits.
- Post-integration verification reference: No new base commits were integrated. Delivery reused the post-API/E2E/code-review evidence on the same base (`pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts --no-watch`, `pnpm -C autobyteus-server-ts run build`, and `git diff --check` all passed upstream) and ran a delivery whitespace check after docs/report edits.

## Why Docs Were Updated

- Summary: The final implementation adds a long-lived backend subsystem and public Fastify route for the AutoByteus Agent Tools MCP Server. Long-lived docs needed to describe the new outward-facing MCP endpoint, its distinction from MCP Server Management, its session/security model, its v1 `send_message_to` support, and the future-adapter boundary.
- Why this should live in long-lived project docs: Runtime and agent-tool maintainers need a durable source of truth for how external process runtimes should consume configured server-owned tools without rediscovering the ticket artifacts. The endpoint, session descriptor, security boundary, and v1 scope are architectural/runtime knowledge, not just one-off implementation notes.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-server-ts/docs/modules/agent_tools.md` | Canonical server-owned agent-tool module overview. | `Updated` | Added Agent Tools MCP Server section and link to detailed module doc. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | New long-lived module doc needed for the implemented subsystem. | `Updated` | Added as the durable source for route, session, security, v1 support, and deferred scope. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-server-ts/docs/modules/agent_communication.md` | `send_message_to` runtime projection docs must include the new MCP surface that reuses the shared dispatcher. | `Updated` | Added external process runtime projection through `autobyteus_agent_tools`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-server-ts/docs/modules/mcp_server_management.md` | Needed to prevent confusion between consuming external MCP servers and exposing AutoByteus tools outward. | `Updated` | Clarified this module is consumer/import side; linked to Agent Tools MCP Server. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-server-ts/docs/modules/README.md` | Module index should include the new long-lived module doc. | `Updated` | Added Agent Tools MCP Server row. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-server-ts/docs/PROJECT_OVERVIEW.md` | Project API/domain overview should include the new MCP Streamable HTTP surface. | `Updated` | Added `/mcp/agent-tools/:sessionId` and domain/index references. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-server-ts/docs/ARCHITECTURE.md` | Runtime topology should include the new route owner. | `Updated` | Added `src/agent-tools/mcp` as the Agent Tools MCP Streamable HTTP route owner. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-server-ts/docs/modules/agent_team_execution.md` | Reviewed because team-member lifecycle and `send_message_to` are touched. | `No change` | Existing text stays accurate; detailed MCP-server behavior belongs in the new module doc and agent communication docs. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-server-ts/docs/modules/agent_execution.md` | Reviewed because runtime projection docs mention first-party MCP tools and configured exposure. | `No change` | Existing runtime/event normalization text remains correct; production materializers are deferred. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-web/docs/tools_and_mcp.md` | Reviewed for MCP terminology overlap. | `No change` | Frontend doc covers user-managed external MCP server configuration, not this server-hosted endpoint. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | New module doc | Documented endpoint, TS source owners, descriptors, bearer/session lifecycle, configured-tool gating, JSON-RPC methods, v1 `send_message_to`, future adapter rules, and out-of-scope materializers/streaming. | Provides canonical long-lived knowledge for maintainers and future runtime materializer work. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-server-ts/docs/modules/agent_tools.md` | Module overview expansion | Added Server-Hosted Agent Tools MCP Server section. | Keeps the central agent-tools doc aware of the new outward MCP surface. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-server-ts/docs/modules/agent_communication.md` | Runtime projection update | Added external process/runtime projection through session-scoped `autobyteus_agent_tools`. | Records that MCP `send_message_to` uses the same shared selector/dispatcher contract. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-server-ts/docs/modules/mcp_server_management.md` | Boundary clarification | Clarified consumer/import MCP management vs server-hosted Agent Tools MCP Server. | Prevents future maintainers from placing outward tool-hosting behavior in the wrong subsystem. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-server-ts/docs/modules/README.md` | Index update | Added Agent Tools MCP Server link. | Makes the new module doc discoverable. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-server-ts/docs/PROJECT_OVERVIEW.md` | Project overview update | Added MCP endpoint and domain/index references. | Makes the public backend API/domain inventory complete. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-server-ts/docs/ARCHITECTURE.md` | Runtime topology update | Added `src/agent-tools/mcp` route ownership. | Keeps route owner topology accurate. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| AutoByteus Agent Tools MCP Server | It is a client-neutral, server-hosted Streamable HTTP MCP surface for configured server-owned tools. | `requirements-doc.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md`, `autobyteus-server-ts/docs/modules/agent_tools.md` |
| Consumer/import MCP vs outward MCP hosting | MCP Server Management consumes external MCP servers; Agent Tools MCP Server exposes AutoByteus tools outward. | `investigation-notes.md`, `design-spec.md`, `implementation-handoff.md` | `autobyteus-server-ts/docs/modules/mcp_server_management.md`, `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` |
| Session descriptor and security boundary | Runtime config `enabled_tools` is not the authority; the server session gates by configured exposure, bearer token, expiry, and owner lifecycle. | `design-spec.md`, `implementation-handoff.md`, `code-review-report.md` | `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` |
| `send_message_to` MCP projection | The MCP endpoint reuses the shared `src/agent-communication` contract and dispatcher; selector semantics stay consistent across surfaces. | `requirements-doc.md`, `design-spec.md`, `implementation-handoff.md` | `autobyteus-server-ts/docs/modules/agent_communication.md`, `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` |
| V1 deferred scope | Production runtime materializers, persisted sessions/restored rematerialization, stale bearer cleanup, long-lived/resumable SSE, and non-`send_message_to` adapters remain future work. | `requirements-doc.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md`, `code-review-report.md` | `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| No existing outward AutoByteus-owned Agent Tools MCP endpoint. | New server-hosted `/mcp/agent-tools/:sessionId` route and `src/agent-tools/mcp` session/catalog/executor subsystem. | `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md`, `autobyteus-server-ts/docs/PROJECT_OVERVIEW.md`, `autobyteus-server-ts/docs/ARCHITECTURE.md` |
| Treating all MCP docs as consumer-side MCP Server Management. | Explicit split between consumer/import MCP management and outward AutoByteus Agent Tools MCP hosting. | `autobyteus-server-ts/docs/modules/mcp_server_management.md`, `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Not applicable. Long-lived docs were updated.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed on the delivery-refreshed branch state. No docs blocker or reroute is needed.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Not applicable.
