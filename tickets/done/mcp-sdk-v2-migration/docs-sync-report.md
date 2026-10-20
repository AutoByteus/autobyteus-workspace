# Docs Sync Report — mcp-sdk-v2-migration

## Scope

- Ticket: `mcp-sdk-v2-migration`, Project Task `autobyteus-182` (FU-9 of `autobyteus-175`)
- Trigger: code reviewer handoff after API/E2E pass `API-REV-001` and test-code review `CRR-002` (Not Applicable); reviewed route, `task_size=Medium`, `architectural_risk=High`
- Bootstrap base reference: `origin/personal` @ `dc530fdcb0`
- Integrated base reference used for docs sync: `origin/personal` @ `b7ea243953`, merged into the ticket branch as `f151ded614`
- Post-integration verification reference: `evidence/DEL-01…DEL-03` (MCP unit 87/87, core MCP integration 22 passed + 1 gated skip, endpoint integration 15/15)

## Why Docs Were Updated

- Summary: the implementation already moved the product docs to the v2 client (package names, `legacy` negotiation, all-pages listing, HTTP and redirect wording; checked in CRR-001). The stdio start-failure wording also changed with v2 (API/E2E note 1), and the docs did not say so. Delivery added the v2 error texts for HTTP, exit-at-start and hang-at-start, with the v1 wording they replace.
- Why this should live in long-lived project docs: users see these texts in MCP preview and connect errors, and maintainers compare them across SDK upgrades ("Verifying An MCP SDK Upgrade"). REQ-011 / AC-010 require the v2 wording in the docs.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` | MCP client package, redirects, error wording, upgrade verification | `Updated` (implementation + delivery) | Implementation: v2 package, redirect text, negotiation, paging, test packages. Delivery: error-text list for HTTP and stdio failures |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Claude Agent SDK peer on the v1 package | `No change` (updated by implementation) | States the v1 peer is installed by the package manager and used for types only; matches API-15 |
| `TESTING.md` ("Core library MCP integration" row) | Referenced by the upgrade section | `No change` | Commands unchanged by this ticket |
| `autobyteus-web/docs/*` | MCP preview error display | `No change` | No doc quotes SDK error text; the display path is unchanged |
| `RELEASE.md` | Release steps | `No change` | Followed as written |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` | Behavior wording | "Verifying An MCP SDK Upgrade": replaced the single HTTP sentence with a list: `SdkHttpError: Error POSTing to endpoint: <body>`, `SdkError: Connection closed` (exit at start), `SdkError: Request timed out` after 60 s (hang at start); names the v1 wording each replaces; states AutoByteus does not reword or parse them | DEC-003 accepts v2's wording as a whole; API/E2E API-10 showed the stdio texts changed too |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| MCP client line | `@modelcontextprotocol/client` 2.x, `legacy` negotiation, one stdio start, all pages listed | `design-spec.md`, `api-e2e-execution-coverage-report.md` | `mcp_server_management.md` (implementation) |
| SDK error texts | v2 texts and their v1 predecessors; nothing parses them | `evidence/API-10-13-parity-comparison.md` | `mcp_server_management.md` (delivery) |
| v1 package in the tree | Only as the Claude Agent SDK / Google GenAI peer, types only | `evidence/API-15-packaged-contents-after.txt`, IMP-07 | `mcp_server_management.md`, `agent_execution.md` (implementation) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `@modelcontextprotocol/sdk` 1.32.1 as AutoByteus's MCP client | `@modelcontextprotocol/client` 2.3.1 | `mcp_server_management.md` |
| `ClaudeSdkClient.createMcpServer()` / `createToolDefinition()` (dead path) | Removed; Claude reaches tools through the Agent Tools MCP endpoint | `agent_execution.md` (no doc described the removed path) |
| v1 test servers (`McpServer` from the v1 package) | v2 `@modelcontextprotocol/server` / `node` devDependencies | `mcp_server_management.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, archive, finalization to `personal`, beta, the user's check
- Notes: follow-ups FU-001…FU-007 are in `follow-ups.md`; none affects these docs.
