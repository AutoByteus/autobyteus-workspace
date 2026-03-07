# Implementation Plan

## Scope Classification

- Classification: `Medium`
- Reasoning: Frontend-only but cross-cutting across workspace shell, team-specific UI state, compact team monitor rendering, and behavior-preserving tests.

## Plan Maturity

- Current Status: `Re-Refreshed For Implementation`
- Review Gate: `Go Confirmed`

## Implementation Principles

- Preserve one focused-member contract end-to-end.
- Keep team center-pane mode state UI-only and separate from runtime team context.
- Reuse one canonical conversation-feed rendering path across focus mode and multi-member tiles.
- Preserve the existing message alignment and tool-call UI rather than maintaining a separate tile conversation renderer.
- Reduce multi-member density through smaller read-only viewports and removal of the composer, not summary cards.
- Keep tile height bounded so the shared feed scrolls inside each tile instead of stretching the outer pane.
- Add tests for layout mode semantics before considering the task technically complete.

## Planned Change Set

| Task ID | Change ID(s) | File / Module | Planned Action | Verification |
| --- | --- | --- | --- | --- |
| `T-001` | `C-001` | `stores/teamWorkspaceViewStore.ts` | Add per-team view-mode state and default resolution | store unit test |
| `T-002` | `C-006` | `composables/useTeamMemberPresentation.ts` | Centralize display-name/avatar/status helper logic | component tests using helper consumers |
| `T-003` | `C-002` | `components/workspace/team/TeamWorkspaceModeSwitch.vue` | Add mode switch control | component test |
| `T-004` | `C-003`, `C-011` | `components/workspace/team/TeamMemberMonitorTile.vue`, `components/workspace/agent/AgentConversationFeed.vue` | Add smaller tile shell and shared read-only conversation feed renderer with bounded internal-scroll viewport behavior | component test |
| `T-005` | `C-004` | `components/workspace/team/TeamGridView.vue` | Add all-members grid renderer | component test |
| `T-006` | `C-005` | `components/workspace/team/TeamSpotlightView.vue` | Add spotlight renderer | component test |
| `T-007` | `C-007`, `C-008` | `components/workspace/team/TeamWorkspaceView.vue`, `components/workspace/agent/AgentEventMonitor.vue`, `AgentTeamEventMonitor.vue`, `TeamGridView.vue`, `TeamSpotlightView.vue` | Integrate mode switch, shared feed extraction, grid/spotlight shared composer behavior, focused-member target label, and bounded tile containment behavior | `TeamWorkspaceView.spec.ts`, `AgentTeamEventMonitor.spec.ts` |
| `T-008` | `C-012` | `components/workspace/team/TeamMemberConversationPreview.vue`, `components/workspace/team/compact/*` | Remove the superseded custom preview renderer path once shared feed reuse is wired in | component specs |
| `T-009` | `C-010` | `components/workspace/team/__tests__/*`, `components/conversation/__tests__/*`, `stores/__tests__/*` | Expand and add targeted tests for mode behavior, compact segment rendering, and focus routing | `vitest --run ...` |

## Dependency And Sequencing Map

| Order | Task ID | Depends On | Why This Order |
| --- | --- | --- | --- |
| `1` | `T-001` | none | Establish UI-only mode state contract first |
| `2` | `T-002` | none | Shared presentation helper prevents duplicated fallback logic in new components |
| `3` | `T-003` / `T-004` | `T-001`, `T-002` | Build the mode switch and shared read-only conversation feed before shell integration |
| `4` | `T-007` | `T-004` | Extract the shared feed into the focus-mode shell before wiring tile reuse |
| `5` | `T-005` / `T-006` | `T-004` | Grid and spotlight compose the tile primitive around the shared feed |
| `6` | `T-008` | `T-004`..`T-007` | Remove the superseded custom preview path after shared reuse is in place |
| `7` | `T-009` | all prior tasks | Verify final behavior once full integration is present |

## File-Level Definition Of Done

| File | Done Criteria | Unit Test Criteria |
| --- | --- | --- |
| `stores/teamWorkspaceViewStore.ts` | Returns default `focus`, persists per-team mode changes, clears modes predictably | New store spec passes |
| `composables/useTeamMemberPresentation.ts` | Shared helper returns stable display metadata for header and tiles | Covered indirectly via component tests |
| `TeamWorkspaceModeSwitch.vue` | Emits/selects valid modes and visibly highlights current mode | New component spec passes |
| `TeamMemberMonitorTile.vue` | Renders smaller tile shell and shared read-only feed without composer | New component spec passes |
| `AgentConversationFeed.vue` | Renders canonical conversation feed, autoscrolls correctly, and supports read-only tile reuse inside bounded tile viewports | New component spec passes |
| `TeamGridView.vue` | Renders all members and emits member selection | New component spec passes |
| `TeamSpotlightView.vue` | Renders focused primary panel plus remaining tiles and emits selection | New component spec passes |
| `TeamWorkspaceView.vue` | Supports `Focus` / `Grid` / `Spotlight`; preserves focused member; shows input target label in multi-member modes | Updated `TeamWorkspaceView.spec.ts` passes |
| `components/workspace/team/compact/*` / `TeamMemberConversationPreview.vue` | Superseded custom preview path removed or no longer used | No dead-path regressions remain |

## Test Strategy

- Targeted unit tests:
  - `pnpm test:nuxt components/workspace/team/__tests__/TeamWorkspaceView.spec.ts --run`
  - `pnpm test:nuxt components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts --run`
  - `pnpm test:nuxt stores/__tests__/teamWorkspaceViewStore.spec.ts --run`
  - `pnpm test:nuxt components/workspace/team/__tests__/TeamGridView.spec.ts --run`
  - `pnpm test:nuxt components/workspace/team/__tests__/TeamSpotlightView.spec.ts --run`
  - `pnpm test:nuxt components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts --run`
  - `pnpm test:nuxt components/workspace/agent/__tests__/AgentConversationFeed.spec.ts --run`
- Follow-up integration confidence:
  - `pnpm test:nuxt components/layout/__tests__/WorkspaceDesktopLayout.spec.ts --run`

## Risks To Watch During Implementation

- Shared-feed extraction must not regress focus-mode autoscroll or message rendering behavior.
- Team workspace composer placement in multi-member modes must not regress focused-member send behavior.
- Header/tile display-name fallback logic can drift unless the helper is truly shared.
