# Implementation Plan

## Scope Classification

- Classification: `Medium` (refined)
- Reasoning:
  - Phase 1 already unified app shell left panel.
  - Phase 2 now removes remaining page-level secondary sidebars across multiple routes.
  - Includes remove/rename actions plus store/page test updates.
- Workflow Depth:
  - `Medium` -> proposed design -> design-based runtime call stack -> runtime call stack review -> implementation plan -> implementation progress

## Plan Maturity

- Current Status: `Implemented (Phase 2 + IA correction)`
- Notes:
  - Deep review iteration 7 passes with no blocking gaps and no unresolved SoC issues.

## Solution Sketch

- Architecture decision:
  - Keep multi-route top-level domains.
  - Keep a single persistent left panel (`AppLeftPanel`) as the only app navigation rail.
  - Replace page-level left sub-navigation with in-content section controls where needed.
  - Keep `Agents` and `Agent Teams` as dedicated top-level route hosts (no same-level duplication in right content).
- Affected domains:
  - Agents
  - Prompt Engineering
  - Tools
  - Memory
- Legacy removal stance:
  - Remove obsolete sidebar components/layout wrappers instead of preserving compatibility adapters.

## Runtime Call Stack Review Gate

| Use Case | Call Stack Location | Review Location | Business Flow Completeness | Structure & SoC Check | Dependency Smells | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Top-level app navigation | `/Users/normy/autobyteus_org/autobyteus-web/tickets/unified-left-panel-navigation-redesign/design-based-runtime-call-stack.md` | `/Users/normy/autobyteus_org/autobyteus-web/tickets/unified-left-panel-navigation-redesign/runtime-call-stack-review.md` | Pass | Pass | None | Pass |
| Dedicated Agent Teams top-level route (`/agent-teams`) | same | same | Pass | Pass | None | Pass |
| Prompt section switching (no local sidebar) | same | same | Pass | Pass | None | Pass |
| Tools section switching (no local sidebar) | same | same | Pass | Pass | None | Pass |
| Memory index/inspector domain flow | same | same | Pass | Pass | None | Pass |
| Running selection/create flows | same | same | Pass | Pass | None | Pass |

## Go / No-Go Decision

- Decision: `Go`

## Principles

- Host/page owns route and section transitions.
- Leaf components own rendering/action intent only.
- No legacy compatibility branches or dual implementations.
- Remove obsolete components/files in the same iteration.
- Keep tests updated in lockstep with component removals/renames.

## Dependency And Sequencing Map (Phase 2)

| Order | Task ID | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- | --- |
| 1 | T-006 | `/Users/normy/autobyteus_org/autobyteus-web/pages/agents.vue` | None | Remove `ResponsiveMasterDetail` and keep agents-only route host behavior. |
| 2 | T-007 | `/Users/normy/autobyteus_org/autobyteus-web/pages/prompt-engineering.vue`, `/Users/normy/autobyteus_org/autobyteus-web/stores/promptEngineeringViewStore.ts` | None | Refactor prompt host/store naming and flow before removing prompt sidebar file. |
| 3 | T-008 | `/Users/normy/autobyteus_org/autobyteus-web/pages/tools.vue` | None | Replace tools section switching host behavior before removing tools sidebar file. |
| 4 | T-009 | `/Users/normy/autobyteus_org/autobyteus-web/pages/memory.vue`, `/Users/normy/autobyteus_org/autobyteus-web/components/memory/MemorySidebar.vue` -> `MemoryIndexPanel.vue` | None | Reframe memory pane semantics and apply rename atomically. |
| 5 | T-010 | Remove obsolete files (`ResponsiveMasterDetail.vue`, `PromptSidebar.vue`, `ToolsSidebar.vue`) | T-006, T-007, T-008 | Safe removal once runtime references are migrated. |
| 6 | T-011 | Update/add tests in pages/components | T-006 to T-010 | Lock regressions after structural changes settle. |
| 7 | T-012 | Update docs (`prompt_engineering.md`, `tools_and_mcp.md`) | T-010 | Ensure docs reflect final component topology. |
| 8 | T-013 | `/Users/normy/autobyteus_org/autobyteus-web/pages/agent-teams.vue`, `/Users/normy/autobyteus_org/autobyteus-web/components/AppLeftPanel.vue`, `/Users/normy/autobyteus_org/autobyteus-web/components/settings/messaging/SetupVerificationCard.vue` | T-006 | Enforce strict top-level IA purity (`Agent Teams` dedicated route). |

## Design Delta Traceability (Phase 2)

| Change ID | Change Type | Planned Task ID(s) | Remove/Rename Included | Verification |
| --- | --- | --- | --- | --- |
| C-009 | Modify | T-006 | No | Agents page tests + manual `/agents` behavior checks |
| C-010 | Remove | T-010 | Yes | `rg` reference scan + focused tests |
| C-011 | Modify | T-007 | No | Prompt page tests + view transitions |
| C-012 | Remove | T-010 | Yes | `rg` reference scan + focused tests |
| C-013 | Modify | T-007 | No | Prompt store/page behavior tests |
| C-014 | Modify | T-008 | No | Tools page tests + manual local/MCP branch checks |
| C-015 | Remove | T-010 | Yes | `rg` reference scan + focused tests |
| C-016 | Modify | T-009 | No | Memory page tests + manual selection flow |
| C-017 | Rename/Move | T-009 | Yes | Build/test + reference scan for old symbol |
| C-018 | Modify | T-011 | No | Focused test suite pass |
| C-019 | Modify | T-012 | No | Docs diff review |
| C-020 | Add | T-013 | No | New route-host behavior checks for `/agent-teams` |
| C-021 | Modify | T-013 | No | AppLeftPanel route mapping assertion |
| C-022 | Modify | T-013 | No | Setup verification runtime-link assertion |

## Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| T-010 | `/Users/normy/autobyteus_org/autobyteus-web/components/layout/ResponsiveMasterDetail.vue` | Remove | Delete file + clear imports/usages | Low |
| T-010 | `/Users/normy/autobyteus_org/autobyteus-web/components/promptEngineering/PromptSidebar.vue` | Remove | Delete file + clear imports/usages | Low |
| T-010 | `/Users/normy/autobyteus_org/autobyteus-web/components/tools/ToolsSidebar.vue` | Remove | Delete file + clear imports/usages | Low |
| T-009 | `/Users/normy/autobyteus_org/autobyteus-web/components/memory/MemorySidebar.vue` | Rename/Move | Rename to `MemoryIndexPanel.vue`, update imports/tests/docs | Medium (test updates required) |

## Step-By-Step Plan

1. T-006: Refactor `/Users/normy/autobyteus_org/autobyteus-web/pages/agents.vue` to remove `ResponsiveMasterDetail` and keep agents-only right content.
2. T-007: Refactor `/Users/normy/autobyteus_org/autobyteus-web/pages/prompt-engineering.vue` and prompt view store to content-header section switching semantics.
3. T-008: Refactor `/Users/normy/autobyteus_org/autobyteus-web/pages/tools.vue` to content-header Local/MCP switching.
4. T-009: Refactor `/Users/normy/autobyteus_org/autobyteus-web/pages/memory.vue` and rename `MemorySidebar` to `MemoryIndexPanel`.
5. T-010: Remove obsolete sidebar/master-detail components.
6. T-011: Update focused tests and run targeted suite.
7. T-012: Update architecture docs referencing removed sidebars.
8. T-013: Add dedicated `/agent-teams` route host and update top-level/team-runtime route mapping.

## Per-File Definition Of Done (Phase 2)

| File | Implementation Done Criteria | Unit Test Criteria | Integration/Manual Criteria |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web/pages/agents.vue` | No `ResponsiveMasterDetail`; agents-only right content | New/updated page test passes | Manual: no `Agent Teams` selector appears in `/agents` right content |
| `/Users/normy/autobyteus_org/autobyteus-web/pages/agent-teams.vue` | Dedicated team-only route host exists and handles `team-*` views | New/updated page test passes | Manual: `/agent-teams` shows only team content |
| `/Users/normy/autobyteus_org/autobyteus-web/components/AppLeftPanel.vue` | `Agent Teams` maps to `/agent-teams?view=team-list` | AppLeftPanel test passes | Manual: left nav opens dedicated route |
| `/Users/normy/autobyteus_org/autobyteus-web/pages/prompt-engineering.vue` | No `PromptSidebar`; header section switch controls marketplace/drafts | Updated prompt page tests pass | Manual: marketplace/drafts/create/details flows remain valid |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/promptEngineeringViewStore.ts` | Section-oriented naming/state; no invalid dead branch retained | Store/page behavior tests pass | Manual: section context return behavior still correct |
| `/Users/normy/autobyteus_org/autobyteus-web/pages/tools.vue` | No `ToolsSidebar`; header section switch controls local vs MCP roots | Updated tools page tests pass | Manual: Local and MCP flows intact |
| `/Users/normy/autobyteus_org/autobyteus-web/pages/memory.vue` | Memory content composed without nav-sidebar semantics | Updated memory page test passes | Manual: search/select/manual-load/inspect works |
| `/Users/normy/autobyteus_org/autobyteus-web/components/memory/MemoryIndexPanel.vue` | Renamed component compiles and behavior unchanged | Updated component tests pass | Manual: index interactions unchanged |
| Removed files in T-010 | Deleted with no runtime refs | N/A | `rg` reference scans return no runtime usages |

## Test Strategy

- Focused unit/page tests (to update/add):
  - `/Users/normy/autobyteus_org/autobyteus-web/pages/__tests__/memory.spec.ts`
  - Prompt page tests (new if absent)
  - Agents page tests (new if absent)
  - Tools page tests (new if absent)
  - Updated memory component tests for renamed file
- Regression tests to keep:
  - `/Users/normy/autobyteus_org/autobyteus-web/components/__tests__/AppLeftPanel.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-web/components/workspace/running/__tests__/RunningAgentsPanel.hostBoundary.spec.ts`
- Manual flows:
  - `/agents`, `/agent-teams`, `/prompt-engineering`, `/tools`, `/memory`, `/workspace`, `/settings`
