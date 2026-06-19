# Investigation Notes — UI MCP Gateway Polish

- Ticket: `ui-mcp-gateway-polish`
- Date: 2026-06-19
- Current stage: Stage 1 Investigation + Triage

## Investigation Goals / Questions

1. Identify the frontend owner for the top-level `Nodes` sidebar icon and confirm why it looks like a database.
2. Identify the frontend owner for the Settings → MCP Servers → MCP Gateway tab.
3. Determine whether the MCP Gateway page can be simplified locally in the frontend without backend/API changes.
4. Determine what tests/docs need updates for the UI behavior change.

## User Evidence Consulted

- Screenshot 1: `/Users/normy/.autobyteus/server-data/memory/agents/codex_3bb1091f2aa740bf93f18edb31631e9d/context_files/ctx_291a18371749__image.png`
  - Shows the primary sidebar. The `Nodes` item uses a stacked-cylinder icon, visually similar to a database/storage symbol.
- Screenshot 2: `/Users/normy/.autobyteus/server-data/memory/agents/codex_3bb1091f2aa740bf93f18edb31631e9d/context_files/ctx_939124f4c825__image.png`
  - Shows Settings → MCP Servers → MCP Gateway.
  - Current page has a long explanatory paragraph naming external clients (`Cursor`, `Antigravity`, `Claude Code`, etc.).
  - Endpoint input is visibly truncated at screenshot width.
  - Copy buttons have no visible success state.
  - Bottom `Exposed MCP-origin tools` card duplicates detailed tool browsing/listing already available in the MCP Servers tab.

## Commands / Sources Consulted

- `git status --short --branch`, `git remote -v`, `git symbolic-ref refs/remotes/origin/HEAD || true`
  - Confirmed git repo and base branch `origin/personal`.
- `git fetch origin personal --prune`
  - Refreshed tracked base branch before ticket worktree creation.
- `git worktree add -b codex/ui-mcp-gateway-polish /Users/normy/autobyteus_org/autobyteus-worktrees/ui-mcp-gateway-polish origin/personal`
  - Created dedicated ticket worktree.
- `rg -n "MCP Gateway|EXTERNAL MCP GATEWAY|Exposed MCP-origin tools|Configure Cursor|Nodes|Database|Copy JSON|mcp/gateway|gateway" autobyteus-web -S`
  - Located MCP Gateway UI, localization, docs, and navigation labels.
- `rg -n "McpGatewayPanel|McpManagementTabs|external_mcp_gateway|configure_external_clients|exposed_mcp_origin_tools|copy_json" autobyteus-web -S`
  - Located core MCP Gateway component/test/localization docs.
- `rg -n "shell.navigation.nodes|navigation.*nodes|Nodes|Database|Lucide|Icon|Cylinder|Server|HardDrive|Network" autobyteus-web/components autobyteus-web/layouts autobyteus-web/pages autobyteus-web/plugins autobyteus-web/stores autobyteus-web/app.vue -S`
  - Located shell navigation owner and tests.
- Read `autobyteus-web/components/tools/McpGatewayPanel.vue`.
- Read `autobyteus-web/components/tools/__tests__/McpGatewayPanel.spec.ts`.
- Read `autobyteus-web/composables/useShellPrimaryNavigation.ts`.
- Read `autobyteus-web/components/AppLeftPanel.vue` and related tests.
- Read `autobyteus-web/docs/tools_and_mcp.md` sections around `McpGatewayPanel.vue`.
- Read `autobyteus-web/package.json` for validation commands.

## Codebase Findings

### Sidebar Nodes icon owner

- File: `autobyteus-web/composables/useShellPrimaryNavigation.ts`
- Current item:
  - `{ key: 'nodes', labelKey: 'shell.navigation.nodes', icon: 'heroicons:circle-stack' }`
- `heroicons:circle-stack` is a stacked-cylinder/database-like glyph. This directly explains the user complaint.
- Rendering owner:
  - `autobyteus-web/components/AppLeftPanel.vue` iterates `primaryNavItems` and renders `<Icon :icon="item.icon" />`.
- Tests:
  - `autobyteus-web/components/__tests__/AppLeftPanel.spec.ts` checks shared navigation policy owns the `nodes` entry.
  - `autobyteus-web/components/__tests__/AppLeftPanel_v2.spec.ts` stubs `Icon`; no icon-name assertion exists.

### MCP Gateway panel owner

- File: `autobyteus-web/components/tools/McpGatewayPanel.vue`
- Current responsibilities:
  - Shows header (`External MCP Gateway`) and long explanation via `configure_external_clients` translation.
  - Displays endpoint in a read-only `<input>` inside a grid with access-mode helper box.
  - Copies endpoint/config using `copyText(value)` but does not expose copied state in the UI.
  - Shows example JSON config.
  - Fetches and renders `store.getMcpGatewayTools` in a bottom `Exposed MCP-origin tools` card, including refresh action.
- Store/API dependency:
  - `useToolManagementStore()` is imported only to fetch/show the bottom MCP-origin tools list.
  - If the bottom list is removed, this panel no longer needs to fetch MCP gateway tools.
- Tests:
  - `autobyteus-web/components/tools/__tests__/McpGatewayPanel.spec.ts` currently expects tool count/list rendering, `fetchMcpGatewayTools()` call on mount, and refresh button behavior.
  - These tests should be updated to the simplified target behavior.

### Localization owner

- Files:
  - `autobyteus-web/localization/messages/en/tools.generated.ts`
  - `autobyteus-web/localization/messages/zh-CN/tools.generated.ts`
- Relevant current keys:
  - `configure_external_clients` contains the long client-name prose.
  - `copy`, `copy_json`, `exposed_mcp_origin_tools`, `exposed_tool_count`, `refresh`, `loading_mcp_origin_tools`, empty-state keys.
- Target will need concise text and new copy-success labels.

### Documentation impact

- File: `autobyteus-web/docs/tools_and_mcp.md`
- Current docs say `McpGatewayPanel.vue` shows current MCP-origin tool count/list and refreshes tools via `fetchMcpGatewayTools()`.
- This will become inaccurate if the bottom tool list is removed. Stage 9 should update this durable doc.

## Current Runtime / UX Diagnosis

- The `Nodes` icon problem is an icon choice, not routing/state behavior.
- The MCP Gateway problem is a component layout/content problem:
  - The endpoint read-only input is too narrow because it shares a two-column grid row with a wide access-mode card.
  - Long introductory copy competes with actionable setup controls.
  - Copy buttons give no visible confirmation because `copyText()` has no local state.
  - The bottom tools list duplicates the MCP Servers tab and creates vertical noise.
- No backend schema or API change is needed for the requested simplification.

## Scope Triage

- Scope: `Small`
- Rationale:
  - Expected touched source files are local frontend UI/component files plus localized strings and tests/docs.
  - No backend/API/storage/schema changes are needed.
  - Behavior remains informational setup plus clipboard copy; no new product runtime boundary is introduced.

## Constraints / Unknowns

- Clipboard API may be unavailable in some test/runtime contexts; UI feedback should be set only after successful `navigator.clipboard?.writeText()` and remain silent/warn on failure.
- The localization files are named `*.generated.ts`, but current repository workflow includes these committed catalogs; update them alongside component key use to keep tests deterministic.
- Icon selection should prefer clarity in the live sidebar and avoid new dependencies where possible. Round 3 live comparison found the custom inline network/hierarchy SVG clearer than the tested built-in alternatives (`heroicons:share`, `ph:tree-structure`, `ph:share-network`, `lucide:network`) and clearer than the earlier CPU-chip candidate.

## Design Implications

- Keep the shell navigation ownership in `useShellPrimaryNavigation.ts`; only change the `nodes` icon value.
- Keep `McpGatewayPanel.vue` as the owner for external gateway setup; simplify within this component instead of adding a new page/component.
- Remove bottom tool-list rendering and store fetch dependency from the Gateway tab.
- Add local copy-feedback state keyed by action (`endpoint`, `config`) with an auto-reset timer.
- Make the endpoint visible in a full-width monospace block with wrapping or horizontal scrolling instead of a narrow input.
- Update tests to assert simplified gateway behavior, visible copy feedback, and no tool-list fetch/list duplication.
