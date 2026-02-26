# Proposed Design Document

## Summary

The first redesign pass successfully unified the global shell into `AppLeftPanel` (top nav + running section + bottom settings), but page-level secondary left sidebars still exist in core routes (`/agents`, `/prompt-engineering`, `/tools`, `/memory`).

This iteration removes those in-page sidebars and moves section switching into the right content area (header tabs/segmented controls), so users experience a true single-left-panel model: one persistent app-level left panel only.

## Scope Classification

- Classification: `Medium`
- Why:
  - Cross-cutting changes across multiple pages and shared view-state stores.
  - Includes component removals/rename and routing/query behavior alignment.
  - Requires test updates for pages/components and separation-of-concerns guardrails.

## Goals

- Keep exactly one persistent app-level left panel: `/Users/normy/autobyteus_org/autobyteus-web/components/AppLeftPanel.vue`.
- Remove page-level left navigation rails from:
  - `/Users/normy/autobyteus_org/autobyteus-web/pages/agents.vue`
  - `/Users/normy/autobyteus_org/autobyteus-web/pages/prompt-engineering.vue`
  - `/Users/normy/autobyteus_org/autobyteus-web/pages/tools.vue`
- Reframe memory page left column as domain content (`Memory Index`) instead of page navigation semantics.
- Keep top-level app navigation in one place only (`AppLeftPanel`).
- Keep `Settings` anchored at bottom of `AppLeftPanel`.
- Preserve route-level separation (one route per top-level domain) while making each page visually/content-driven instead of sidebar-driven.

## Non-Goals

- No backend/API schema changes.
- No mobile interaction redesign beyond compatibility with updated desktop structures.
- No functional changes to agent execution, tool execution, or memory retrieval logic.
- No migration to a single mega-route application shell.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility and no legacy retention`.
- This iteration removes obsolete page-level sidebar components instead of preserving parallel patterns.

## Requirements And Use Cases

1. User opens app and sees one global left panel (`AppLeftPanel`) as the only persistent navigation rail.
2. Clicking `Agents` or `Agent Teams` in `AppLeftPanel` changes right content while left panel structure remains unchanged.
3. On `/agents`, only agent content is shown (no `Agents/Agent Teams` same-level selector in right content).
4. `Agent Teams` is a dedicated top-level route host (`/agent-teams`) and shows only team content.
5. On `/prompt-engineering`, switching between Marketplace and Drafts happens via content-header section tabs, not a local left sidebar.
6. On `/tools`, switching between Local Tools and MCP Servers happens via content-header section tabs, not a local left sidebar.
7. On `/memory`, search/manual-load/index list are shown as memory-domain controls (content pane), not as a page navigation sidebar.
8. Running instances remain visible in `AppLeftPanel` middle region and can still navigate/open workspace context.
9. No route ownership leakage from reusable child components (host/page owns route and section state transitions).

## Current State (As-Is)

- Global shell is already unified through:
  - `/Users/normy/autobyteus_org/autobyteus-web/layouts/default.vue`
  - `/Users/normy/autobyteus_org/autobyteus-web/components/AppLeftPanel.vue`
- Remaining in-page secondary navigation:
  - `/Users/normy/autobyteus_org/autobyteus-web/pages/agents.vue` uses `ResponsiveMasterDetail` with `AI Agents` sidebar section links.
  - `/Users/normy/autobyteus_org/autobyteus-web/pages/prompt-engineering.vue` uses `PromptSidebar`.
  - `/Users/normy/autobyteus_org/autobyteus-web/pages/tools.vue` uses `ToolsSidebar`.
  - `/Users/normy/autobyteus_org/autobyteus-web/pages/memory.vue` renders `MemorySidebar` in a page-left `<aside>` (domain data controls but visually/sidebar-framed).
- Result: users still perceive two-level navigation despite shell-level unification.

## Target State (To-Be)

### Navigation Model

- Keep multi-route architecture for top-level domains (`/agents`, `/agent-teams`, `/applications`, `/prompt-engineering`, `/skills`, `/tools`, `/memory`, `/media`, `/settings`).
- Keep one global left panel (`AppLeftPanel`) as the only persistent left navigation surface.
- Move per-page section switching into content headers (tabs/segmented controls) inside each page’s main area.

### Page-Level Patterns

- `/agents`:
  - Remove `ResponsiveMasterDetail` sidebar slot.
  - Show only agents domain flows (`list/detail/create/edit`).
- `/agent-teams`:
  - Add dedicated team host page.
  - Show only team flows (`team-list/team-detail/team-create/team-edit`).
- `/prompt-engineering`:
  - Remove `PromptSidebar`.
  - Add content-header section switch (`Prompts Marketplace`, `My Drafts`) mapped to prompt view store actions.
- `/tools`:
  - Remove `ToolsSidebar`.
  - Add content-header section switch (`Local Tools`, `MCP Servers`) mapped to `activeView` roots.
- `/memory`:
  - Replace sidebar framing semantics with content-domain framing (`Memory Index` panel + `Memory Inspector` work area).
  - Rename memory list component to reflect domain responsibility (index panel), not app navigation role.

### Naming And SoC

- Keep `AppLeftPanel` naming for global navigation shell.
- Remove ambiguous “sidebar” naming for page-internal section-switch components.
- Keep host ownership:
  - App-level route changes owned by `AppLeftPanel` or page host.
  - Reusable leaf components emit intent; they do not own route decisions.

## Change Inventory (Delta)

### Completed In Prior Iteration

| Change ID | Change Type | Current Path | Target Path | Status |
| --- | --- | --- | --- | --- |
| C-001 | Modify | `/Users/normy/autobyteus_org/autobyteus-web/components/AppLeftPanel.vue` | same | Completed |
| C-002 | Modify | `/Users/normy/autobyteus_org/autobyteus-web/components/workspace/running/RunningAgentsPanel.vue` | same | Completed |
| C-003 | Modify | `/Users/normy/autobyteus_org/autobyteus-web/components/layout/WorkspaceDesktopLayout.vue` | same | Completed |
| C-004 | Remove | `/Users/normy/autobyteus_org/autobyteus-web/components/layout/LeftSidePanel.vue` | N/A | Completed |
| C-005 | Remove | `/Users/normy/autobyteus_org/autobyteus-web/stores/workspaceLeftPanelLayoutStore.ts` | N/A | Completed |
| C-006 | Modify | `/Users/normy/autobyteus_org/autobyteus-web/components/__tests__/AppLeftPanel.spec.ts` | same | Completed |
| C-007 | Modify | `/Users/normy/autobyteus_org/autobyteus-web/components/layout/__tests__/WorkspaceDesktopLayout.spec.ts` | same | Completed |
| C-008 | Add | N/A | `/Users/normy/autobyteus_org/autobyteus-web/components/workspace/running/__tests__/RunningAgentsPanel.hostBoundary.spec.ts` | Completed |

### New Iteration (This Round)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-009 | Modify | `/Users/normy/autobyteus_org/autobyteus-web/pages/agents.vue` | same | Remove local left sub-navigation and keep agents-only right content. | Agents UX | Keep query model limited to agent views (`list/detail/create/edit`). |
| C-010 | Remove | `/Users/normy/autobyteus_org/autobyteus-web/components/layout/ResponsiveMasterDetail.vue` | N/A | Obsolete after agents page no longer uses page-level sidebar master/detail wrapper. | Layout components | Remove only after references are zero. |
| C-011 | Modify | `/Users/normy/autobyteus_org/autobyteus-web/pages/prompt-engineering.vue` | same | Replace `PromptSidebar` with content-header section switch. | Prompt Engineering UX | Preserve existing store-driven views (`marketplace`, `drafts`, `create`, `details`). |
| C-012 | Remove | `/Users/normy/autobyteus_org/autobyteus-web/components/promptEngineering/PromptSidebar.vue` | N/A | Remove obsolete page-level prompt navigation sidebar component. | Prompt components | No compatibility wrapper retained. |
| C-013 | Modify | `/Users/normy/autobyteus_org/autobyteus-web/stores/promptEngineeringViewStore.ts` | same | Rename sidebar-oriented state/API to section-oriented naming and remove unused `skills` branch if invalid. | Prompt state ownership | SoC cleanup + dead-state elimination. |
| C-014 | Modify | `/Users/normy/autobyteus_org/autobyteus-web/pages/tools.vue` | same | Replace `ToolsSidebar` with content-header section switch and keep tool views in one page body. | Tools UX | `activeView` roots become section tabs: `local-tools`, `mcp-servers`. |
| C-015 | Remove | `/Users/normy/autobyteus_org/autobyteus-web/components/tools/ToolsSidebar.vue` | N/A | Remove obsolete tools local sidebar. | Tools components | No compatibility wrapper retained. |
| C-016 | Modify | `/Users/normy/autobyteus_org/autobyteus-web/pages/memory.vue` | same | Reframe left memory controls as domain content pane; avoid nav-sidebar semantics. | Memory UX | Keep inspector behavior unchanged. |
| C-017 | Rename/Move | `/Users/normy/autobyteus_org/autobyteus-web/components/memory/MemorySidebar.vue` | `/Users/normy/autobyteus_org/autobyteus-web/components/memory/MemoryIndexPanel.vue` | Name reflects data-domain concern, not application navigation concern. | Memory component boundary | Update imports/tests/docs; no alias retained. |
| C-018 | Modify | `/Users/normy/autobyteus_org/autobyteus-web/pages/__tests__/memory.spec.ts` and affected page/component tests | same paths | Align test stubs/assertions with no page-level sidebars and renamed memory panel. | Test suite | Include coverage for header section switch behavior. |
| C-019 | Modify | `/Users/normy/autobyteus_org/autobyteus-web/docs/prompt_engineering.md`, `/Users/normy/autobyteus_org/autobyteus-web/docs/tools_and_mcp.md` | same | Remove outdated sidebar references from docs. | Internal docs | Keep docs aligned with new UX architecture. |
| C-020 | Add | N/A | `/Users/normy/autobyteus_org/autobyteus-web/pages/agent-teams.vue` | Create dedicated top-level host so team content is isolated from agents page. | Agent Teams UX | Canonical team route: `/agent-teams?view=team-list`. |
| C-021 | Modify | `/Users/normy/autobyteus_org/autobyteus-web/components/AppLeftPanel.vue` | same | Map top-level `Agent Teams` directly to dedicated route host. | Global navigation | Active-state logic uses route path, not `/agents` query split. |
| C-022 | Modify | `/Users/normy/autobyteus_org/autobyteus-web/components/settings/messaging/SetupVerificationCard.vue` | same | Align remediation shortcut to new team route host. | Messaging setup flow | `OPEN_TEAM_RUNTIME` -> `/agent-teams?view=team-list`. |

## Architecture Overview

- `layouts/default.vue`
  - Owns app shell and mounting of persistent `AppLeftPanel`.
- `components/AppLeftPanel.vue`
  - Owns top-level app navigation + running section interactions + settings entry.
- `pages/*`
  - Own page-level section switching state and right-content composition.
  - No page-level left navigation rails.
- Domain leaf components (`AgentList`, `PromptMarketplace`, `McpServerList`, `MemoryInspector`, etc.)
  - Own domain rendering and actions.
  - Emit intents upward; no app-shell routing ownership.

## File And Module Breakdown (This Iteration)

| File/Module | Change Type | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web/pages/agents.vue` | Modify | Agents domain host page (agents-only) | Route/query + `handleNavigation` | Input: route query, child emits; Output: selected agent view | agent/workspace stores, agent components |
| `/Users/normy/autobyteus_org/autobyteus-web/pages/agent-teams.vue` | Add | Agent teams domain host page (teams-only) | Route/query + `handleNavigation` | Input: route query, child emits; Output: selected team view | team/workspace stores, team components |
| `/Users/normy/autobyteus_org/autobyteus-web/pages/prompt-engineering.vue` | Modify | Prompt domain host page with in-content section switching | `navigateTo` page actions | Input: prompt view store state; Output: page content branch | prompt store, prompt components |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/promptEngineeringViewStore.ts` | Modify | Prompt page state machine | store actions/getters | Input: page interactions; Output: view mode transitions | pinia/localStorage |
| `/Users/normy/autobyteus_org/autobyteus-web/pages/tools.vue` | Modify | Tools domain host page without local sidebar | `handleNavigation` | Input: user actions; Output: active view branch | tool management store, tools components |
| `/Users/normy/autobyteus_org/autobyteus-web/pages/memory.vue` | Modify | Memory host composition with domain index panel + inspector | page mount behavior | Input: memory stores; Output: index + inspector rendering | memory stores/components |
| `/Users/normy/autobyteus_org/autobyteus-web/components/memory/MemoryIndexPanel.vue` | Rename/Move | Memory index/search/manual-load controls and selection | emits/handlers via stores | Input: index/view stores; Output: selected agent id | memory stores |
| `/Users/normy/autobyteus_org/autobyteus-web/components/AppLeftPanel.vue` | Modify | Top-level route mapping + active-state highlighting for dedicated team route | Vue component interface | Input: current route; Output: route transitions | vue-router, running panel |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/messaging/SetupVerificationCard.vue` | Modify | Verification blocker runtime shortcuts | UI action handlers | Input: blocker action; Output: route push | vue-router |
| `/Users/normy/autobyteus_org/autobyteus-web/components/layout/ResponsiveMasterDetail.vue` | Remove | Obsolete page-level layout abstraction | N/A | N/A | N/A |
| `/Users/normy/autobyteus_org/autobyteus-web/components/promptEngineering/PromptSidebar.vue` | Remove | Obsolete prompt page sidebar navigation | N/A | N/A | N/A |
| `/Users/normy/autobyteus_org/autobyteus-web/components/tools/ToolsSidebar.vue` | Remove | Obsolete tools page sidebar navigation | N/A | N/A | N/A |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `AppLeftPanel.vue` | `vue-router`, running panel emits | global layout | Low | Keep only top-level routing responsibility; map `Agent Teams` to dedicated route host. |
| `pages/agents.vue` | route query + agent components | `/agents` route | Low | Keep query parsing limited to agent-only views. |
| `pages/agent-teams.vue` | route query + team components | `/agent-teams` route | Low | Keep query parsing limited to team-only views. |
| `pages/prompt-engineering.vue` + prompt store | prompt view store + child components | `/prompt-engineering` route | Medium | Refactor store naming/actions to section-oriented API; remove dead branch states. |
| `pages/tools.vue` | tool management store | `/tools` route | Low | `activeView` remains single host-owned state machine with explicit root-section transitions. |
| `pages/memory.vue` + `MemoryIndexPanel` | memory stores | `/memory` route | Low | Keep page layout semantic (domain content panes) and avoid route ownership in child panels. |

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web/components/layout/ResponsiveMasterDetail.vue` | Remove usage in `pages/agents.vue`, then delete file. | No compatibility wrapper. | `rg -n "ResponsiveMasterDetail" /Users/normy/autobyteus_org/autobyteus-web` returns 0 runtime refs. |
| `/Users/normy/autobyteus_org/autobyteus-web/components/promptEngineering/PromptSidebar.vue` | Remove usage in prompt page, then delete file. | No compatibility wrapper. | `rg -n "PromptSidebar" /Users/normy/autobyteus_org/autobyteus-web` returns 0 runtime refs. |
| `/Users/normy/autobyteus_org/autobyteus-web/components/tools/ToolsSidebar.vue` | Remove usage in tools page, then delete file. | No compatibility wrapper. | `rg -n "ToolsSidebar" /Users/normy/autobyteus_org/autobyteus-web` returns 0 runtime refs. |
| `/Users/normy/autobyteus_org/autobyteus-web/components/memory/MemorySidebar.vue` | Rename to `MemoryIndexPanel.vue`, update imports/tests/docs. | No dual-file alias retained. | `rg -n "MemorySidebar" /Users/normy/autobyteus_org/autobyteus-web` returns no runtime refs post-rename. |

## Data Models (If Needed)

No persistent data model changes. Existing store schemas remain, with prompt store naming/state cleanup only.

## Error Handling And Edge Cases

- Section tab clicked while already active: no-op transition.
- Invalid `/agents` query view still falls back to `list`.
- Prompt detail/create views keep contextual return path via prompt store section context.
- Tools section switch resets search/category filters deterministically.
- Memory index fetch errors continue to be surfaced in index panel area.

## Performance / Security Considerations

- Removing redundant sidebars reduces duplicated DOM hierarchy and potential repeated reactive work.
- No auth/security behavior changes.

## Migration / Rollout

- Single PR, no feature flag.
- Apply remove/rename changes in same PR to avoid lingering dead components.

## Change Traceability To Implementation Plan

| Change ID | Planned Task(s) | Verification | Status |
| --- | --- | --- | --- |
| C-009 | T-006 | Agents page tests + manual agents-only `/agents` flow | Planned |
| C-010 | T-010 | Reference scan + typecheck/test | Planned |
| C-011 | T-007 | Prompt page tests + manual Marketplace/Drafts flow | Planned |
| C-012 | T-010 | Reference scan + test cleanup | Planned |
| C-013 | T-007 | Prompt store tests (or adjusted page tests) | Planned |
| C-014 | T-008 | Tools page tests + manual Local/MCP flows | Planned |
| C-015 | T-010 | Reference scan + test cleanup | Planned |
| C-016 | T-009 | Memory page tests + manual memory load/inspect flow | Planned |
| C-017 | T-009 | Component rename + updated tests | Planned |
| C-018 | T-011 | Focused page/component test suite | Planned |
| C-019 | T-012 | Docs diff review | Planned |
| C-020 | T-013 | New `/agent-teams` host route behavior tests/manual checks | Planned |
| C-021 | T-013 | `AppLeftPanel` route mapping assertions | Planned |
| C-022 | T-013 | Messaging setup runtime navigation test assertion | Planned |

## Design Feedback Loop Notes (This Iteration)

| Date | Trigger | Design Smell | Design Update Applied | Status |
| --- | --- | --- | --- | --- |
| 2026-02-12 | Screenshot + page audit | Users still perceive two-level navigation due to page-level sidebars in right content area | Adopted strict one-global-left-panel model; moved section switches into page content headers | Applied |
| 2026-02-12 | Post-implementation screenshot review | `Agents` page still showed same-level `Agent Teams` selector, creating duplicated IA with left panel | Split to dedicated route host `/agent-teams` and made `/agents` agents-only | Applied |
| 2026-02-12 | SoC audit | Page-level “sidebar” naming confuses navigation vs domain-content boundaries | Renamed memory sidebar concept to `MemoryIndexPanel`; removed prompt/tools sidebar components | Applied |
| 2026-02-12 | Architecture decision review | “Single page vs multiple pages” ambiguity | Chosen architecture: multi-route domains + single persistent app left panel + in-content section switching | Applied |

## Open Questions

None. Current decision is to keep multi-route domain pages and eliminate page-level left navigation rails.
