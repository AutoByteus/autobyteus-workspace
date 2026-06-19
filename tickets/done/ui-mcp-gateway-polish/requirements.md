# Requirements — UI MCP Gateway Polish

- Status: `Design-ready`
- Ticket: `ui-mcp-gateway-polish`
- Date: 2026-06-19
- Scope classification: `Small`

## Goal / Problem Statement

Improve navigation icon clarity and simplify the MCP Gateway setup experience so users can quickly understand/copy the endpoint and config without visual noise, truncated critical values, missing copy feedback, or redundant tool-list duplication.

## Source Evidence

- Screenshot 1: `/Users/normy/.autobyteus/server-data/memory/agents/codex_3bb1091f2aa740bf93f18edb31631e9d/context_files/ctx_291a18371749__image.png`
  - The current `Nodes` sidebar icon uses a stacked-cylinder/database-like glyph.
- Screenshot 2: `/Users/normy/.autobyteus/server-data/memory/agents/codex_3bb1091f2aa740bf93f18edb31631e9d/context_files/ctx_939124f4c825__image.png`
  - The current MCP Gateway page has long external-client prose, a truncated endpoint input, no visible copy confirmation, and a redundant bottom tools list.
- Investigation notes: `tickets/in-progress/ui-mcp-gateway-polish/investigation-notes.md`

## Requirements

| Requirement ID | Requirement | Expected Outcome |
| --- | --- | --- |
| REQ-001 | Replace the top-level `Nodes` icon with a non-database visual. | The navigation metadata for `nodes` uses the AutoByteus custom network/hierarchy icon sentinel rather than `heroicons:circle-stack`. |
| REQ-002 | Simplify MCP Gateway explanatory content. | The panel uses concise setup-focused text and does not include the long client-name sentence (`Configure Cursor, Antigravity, Claude Code...`) or extra bottom helper-note rows. |
| REQ-003 | Make the gateway endpoint fully readable. | The endpoint is shown in a full-width monospace display that allows the full URL to be read at common desktop widths without being hidden inside a narrow input. |
| REQ-004 | Provide visible copy feedback for both copy actions. | Endpoint copy and JSON config copy buttons visibly change to a copied/success label after successful clipboard write. |
| REQ-005 | Remove redundant gateway tools list from the Gateway tab. | The Gateway tab no longer renders or fetches the bottom `Exposed MCP-origin tools` list; tool browsing remains owned by the MCP Servers area. |
| REQ-006 | Keep behavior localized and preserve gateway config output. | The endpoint URL and Streamable HTTP JSON config content remain correct; no backend/API changes are introduced. |

## In-Scope Use Cases

| Use Case ID | Use Case | Source Requirements | Primary Expected Flow |
| --- | --- | --- | --- |
| UC-001 | User scans the primary sidebar and identifies `Nodes`. | REQ-001 | Sidebar renders `Nodes` with a network/hierarchy-style icon. |
| UC-002 | User opens MCP Gateway and reads what it is for. | REQ-002, REQ-005 | Panel shows a short title/description, tightened setup layout, and no redundant tool-list card or bottom helper note. |
| UC-003 | User copies the MCP gateway endpoint. | REQ-003, REQ-004, REQ-006 | Full endpoint is visible; click copy; button shows copied confirmation. |
| UC-004 | User copies example MCP client JSON config. | REQ-004, REQ-006 | Config remains visible; click copy; button shows copied confirmation. |

## Acceptance Criteria

| Acceptance Criteria ID | Requirement IDs | Expected Outcome | Validation Intent |
| --- | --- | --- | --- |
| AC-001 | REQ-001 | `useShellPrimaryNavigation.ts` no longer assigns `heroicons:circle-stack` to `nodes`; it assigns `SHELL_NODES_NETWORK_ICON`, and `AppLeftPanel.vue` renders the custom network/hierarchy SVG for that sentinel. | Static/unit check on shared navigation owner and host render branch. |
| AC-002 | REQ-002 | `McpGatewayPanel` does not render the old long client-name guidance or the bottom MCP Servers helper-note row, and instead renders concise setup text. | Component unit test. |
| AC-003 | REQ-003 | `McpGatewayPanel` renders the full gateway URL in a readable endpoint display, not a narrow truncated input. | Component unit test checking text/display. |
| AC-004 | REQ-004 | After successful endpoint copy, the endpoint copy button visibly changes to a copied/success label. | Component unit test with mocked clipboard. |
| AC-005 | REQ-004 | After successful JSON copy, the JSON copy button visibly changes to a copied/success label. | Component unit test with mocked clipboard. |
| AC-006 | REQ-005 | `McpGatewayPanel` no longer fetches or renders MCP-origin tool count/list/refresh UI. | Component unit test ensures `fetchMcpGatewayTools` is not called and tool names are absent. |
| AC-007 | REQ-006 | Generated JSON still contains `mcpServers.autobyteus.type = streamable-http`, the computed gateway URL, and Authorization bearer-token placeholder. | Component unit test checks config content. |
| AC-008 | REQ-005 | Durable docs no longer describe the Gateway tab as showing the MCP-origin tool list/refresh action. | Docs sync review. |

## Requirement Coverage Map To Call-Stack Use Cases

| Requirement ID | Mapped Use Cases |
| --- | --- |
| REQ-001 | UC-001 |
| REQ-002 | UC-002 |
| REQ-003 | UC-003 |
| REQ-004 | UC-003, UC-004 |
| REQ-005 | UC-002 |
| REQ-006 | UC-003, UC-004 |

## Acceptance Criteria Coverage Map To Stage 7 Scenarios

| Acceptance Criteria ID | Planned Scenario ID | Scenario Type |
| --- | --- | --- |
| AC-001 | SCN-001 | Component/static unit validation |
| AC-002 | SCN-002 | Component unit validation |
| AC-003 | SCN-002 | Component unit validation |
| AC-004 | SCN-003 | Component unit validation |
| AC-005 | SCN-004 | Component unit validation |
| AC-006 | SCN-005 | Component unit validation |
| AC-007 | SCN-002 | Component unit validation |
| AC-008 | SCN-006 | Documentation sync validation |

## Constraints / Dependencies

- Preserve existing endpoint calculation from `getServerBaseUrl()`.
- Preserve the example client config shape for Streamable HTTP.
- Keep changes inside `autobyteus-web` frontend/docs/tests unless implementation reveals an unexpected cross-boundary issue.
- Use existing Vue, Pinia, Iconify, Tailwind, and localization conventions.
- Do not introduce backend compatibility paths or legacy fallback behavior.

## Assumptions

- A custom inline network/hierarchy SVG is acceptable for `Nodes` because it is clearer than the tested built-in alternatives and avoids adding a new icon collection dependency.
- The MCP Servers tab remains the better owner for detailed tool visibility and discovery UX.
- Clipboard success feedback can be local ephemeral state in `McpGatewayPanel`.

## Open Questions / Risks

- Clipboard API can be missing in non-browser tests; tests should mock it explicitly.
- The localization catalogs are generated-named files, but the repo currently commits them and component tests rely on available labels.
