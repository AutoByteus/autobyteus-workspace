# Proposed Design Document

## Design Version

- Current Version: `v5`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| `v1` | Initial design draft from investigation + user interaction decisions | Defined persistent focused-member model with center-pane `Focus` / `Grid` / `Spotlight` team layout modes | `Pending` |
| `v2` | Live validation bug report during handoff re-entry | Clarified that compact multi-member tiles must summarize streaming AI content from `message.segments`, not only `message.text` | `3` |
| `v3` | UX contract refinement from follow-up review | Replaced summary-card compact previews with real compact segment rendering: preserve tool-call UI, compact text-bearing segments, omit `Think` in compact tiles | `4` |
| `v4` | Live UX validation of compact renderer | Replace custom compact tile rendering with smaller read-only event-monitor feeds so message alignment and live-flow behavior match focus mode | `5` |
| `v5` | Live UX validation of shared feed reuse | Keep the shared feed, but lock per-tile viewport ownership and internal scrolling so one long conversation does not stretch the outer pane | `6` |

## Artifact Basis

- Investigation Notes: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/tickets/in-progress/team-grid-view-modes/investigation-notes.md`
- Requirements: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/tickets/in-progress/team-grid-view-modes/requirements.md`
- Requirements Status: `Design-ready`

## Summary

Add team center-pane layout modes without changing the existing team-selection and focused-member behavior model.

- Left tree remains the canonical navigation surface for team runs and team members.
- The selected team run still owns exactly one focused member.
- The center pane gains three layout modes:
  - `Focus`: current detailed single-member monitor
  - `Grid`: smaller read-only event-monitor tiles for all members
  - `Spotlight`: one large focused member plus smaller read-only secondary tiles
- The bottom composer continues to route to the focused member only.
- Right-side member-scoped tabs continue to resolve through the focused member; the task-plan tab remains team-scoped.

## Goals

- Let users observe multiple team members' live activity at once.
- Preserve the current focused-member routing contract for send/stop/approval/right-panel behavior.
- Keep the left tree as the canonical member selector and avoid introducing a second competing navigation model.
- Minimize backend risk by building the feature entirely from current frontend team context state.

## Non-Goals

- No aggregated cross-member activity or artifacts feed in the right panel.
- No per-tile message composers in grid or spotlight.
- No change to team streaming protocol or backend team context shape beyond frontend-only UI additions.

## Decision Log

- `D-001` Keep `focusedMemberName` as the single behavioral routing source of truth for team runs.
- `D-002` Treat team center-pane view mode as UI-only state, separate from `AgentTeamContext`.
- `D-003` Do not move member navigation to the right panel; retain left-tree navigation and allow center-tile clicks as a secondary focus affordance.
- `D-004` Reuse the canonical event-monitor conversation rendering path in all team modes; `Grid` and `Spotlight` differ by viewport size and read-only composition, not by a different conversation renderer.
- `D-005` Preserve the existing right-side task-plan behavior and existing focused-member-driven activity/artifact behavior.
- `D-006` Smaller tiles must render the same underlying `UserMessage` / `AIMessage` / segment tree as `Focus` mode so streaming and historical AI responses remain visible in the same alignment.
- `D-007` Information density in multi-member tiles should come primarily from tile viewport size, internal scrolling, and omission of the composer, not from message summarization.
- `D-008` Existing tool-call segment UI remains unchanged in smaller tiles because it is already part of the canonical event-monitor render path.
- `D-009` Extract a shared read-only conversation-feed component from `AgentEventMonitor` and reuse it in both `Focus` and multi-member tiles.
- `D-010` Keep smaller tiles read-only; the shared bottom composer remains outside those tiles.
- `D-011` Each multi-member tile owns a bounded conversation viewport with internal scrolling; the outer grid/spotlight container scrolls only for tile navigation, not transcript growth.

## Current State (As-Is)

- `TeamWorkspaceView.vue` renders a single focused-member monitor and derives the header from the focused member.
- `AgentTeamEventMonitor.vue` adapts team data into a single `AgentEventMonitor` bound to the focused member only.
- `activeContextStore` maps a selected team to `agentTeamContextsStore.focusedMemberContext`.
- `agentTeamRunStore` sends messages and tool approvals to the focused member only.
- `TeamOverviewPanel.vue` is already team-scoped task-plan UI.

## Target State (To-Be)

- Selecting a team run still opens `TeamWorkspaceView`.
- The center header gains an explicit team mode switcher: `Focus`, `Grid`, `Spotlight`.
- The active team retains one focused member at all times.
- `Focus` mode renders the current detailed focused-member monitor path.
- `Grid` mode renders all team members simultaneously as smaller live read-only monitor tiles.
- `Spotlight` mode renders the focused member as a large primary panel with all remaining members visible in smaller read-only secondary tiles.
- Clicking a tile changes the focused member. The right-side activity/artifact context and bottom input target update immediately because they already depend on focused-member state.
- The task plan remains unchanged on the right side.

## Architecture Overview

The feature should be implemented as a presentation-layer expansion on top of the existing focused-member contract.

- Runtime team state continues to live in `agentTeamContextsStore`.
- Behavioral routing continues to flow through `focusedMemberName` -> `focusedMemberContext`.
- New team center-pane layout state should live in a dedicated UI store keyed by team run ID.
- A shared read-only conversation-feed component should be extracted from `AgentEventMonitor`.
- `Focus` mode should use that shared feed plus the composer.
- `Grid` and `Spotlight` tiles should use that same shared feed in smaller read-only containers with no composer.
- Tile shells must enforce bounded heights and `min-h-0` propagation so the shared feed can scroll internally.

## Change Inventory (Delta)

| Change ID | Change Type | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `Add` | N/A | `autobyteus-web/stores/teamWorkspaceViewStore.ts` | Own per-team center-pane layout mode as UI-only state | Store/UI state | Keeps `AgentTeamContext` focused on runtime/team data |
| `C-002` | `Add` | N/A | `autobyteus-web/components/workspace/team/TeamWorkspaceModeSwitch.vue` | Provide explicit `Focus` / `Grid` / `Spotlight` mode controls | Workspace team header | Reusable, testable control surface |
| `C-003` | `Add` | N/A | `autobyteus-web/components/workspace/team/TeamMemberMonitorTile.vue` | Render smaller read-only live team member tile shell for multi-member modes | Center-pane team layouts | Avoids composer duplication while preserving canonical message rendering and bounded tile containment |
| `C-004` | `Add` | N/A | `autobyteus-web/components/workspace/team/TeamGridView.vue` | Render all team members as compact tiles | Center-pane team layouts | Scrollable grid container |
| `C-005` | `Add` | N/A | `autobyteus-web/components/workspace/team/TeamSpotlightView.vue` | Render focused member primary panel with secondary member tiles | Center-pane team layouts | Hybrid layout |
| `C-006` | `Add` | N/A | `autobyteus-web/composables/useTeamMemberPresentation.ts` | Centralize display-name/avatar/status helpers shared by header and tiles | Shared presentation logic | Prevents duplication drift |
| `C-007` | `Modify` | `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`, `TeamGridView.vue`, `TeamSpotlightView.vue` | same | Orchestrate mode switcher, focused-member header, mode-specific center content, shared input-target copy, and bounded tile layout behavior | Team workspace shell/layout | Main integration point |
| `C-008` | `Modify` | `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue`, `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue` | same | Extract reusable read-only conversation feed and keep focused-member detail adapter thin | Focus mode / multi-member feed reuse | Main reuse point for canonical monitor rendering |
| `C-009` | `Modify` | `autobyteus-web/types/agent/AgentTeamContext.ts` | same or no-op | Only if lightweight helper typing is needed; otherwise avoid runtime model change | Types | Preferred default is no runtime shape change |
| `C-010` | `Modify` | Team workspace tests | same directories | Add coverage for mode switching, grid focus changes, compact segment rendering, and layout persistence | Unit tests | Required acceptance protection |
| `C-011` | `Add` | N/A | `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` | Render the canonical read-only conversation feed shared by focus mode and smaller team tiles | Shared conversation-feed presentation | Central reuse point for message flow, autoscroll, and segment rendering |
| `C-012` | `Delete / Simplify` | `autobyteus-web/components/workspace/team/TeamMemberConversationPreview.vue`, `autobyteus-web/components/workspace/team/compact/*` | same | Remove custom compact conversation renderer path that degraded UX and duplicated message layout | Team-specific compact rendering | Restores one canonical conversation rendering model |

## Proposed Module / File Breakdown

| File/Module | Change Type | Concern / Responsibility | Public APIs | Inputs / Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- |
| `stores/teamWorkspaceViewStore.ts` | Add | Persist UI-only team view mode per team run | `getMode(teamRunId)`, `setMode(teamRunId, mode)`, `clearMode(teamRunId?)` | teamRunId + mode -> current mode | Pinia |
| `components/workspace/team/TeamWorkspaceModeSwitch.vue` | Add | Render and emit center-pane layout mode changes | `v-model` or `mode` + `update:mode` | active mode -> user selection event | view-mode store or parent |
| `components/workspace/team/TeamMemberMonitorTile.vue` | Add | Smaller read-only member monitor tile shell with focus styling and bounded viewport containment | props for member context, focus state, click handlers | member data -> tile shell UI events | presentation composable, shared conversation feed |
| `components/workspace/agent/AgentConversationFeed.vue` | Add | Render read-only conversation feed with canonical message flow, autoscroll, and optional usage metadata | props: conversation, agent metadata, display flags | conversation -> read-only feed UI | `UserMessage`, `AIMessage` |
| `components/workspace/team/TeamGridView.vue` | Add | Render all members in grid layout | props: team context, focused member, select handler | members -> tile collection | tile component |
| `components/workspace/team/TeamSpotlightView.vue` | Add | Render focused member primary panel plus remaining tiles | props: team context, focused member, select handler | members -> hybrid layout | tile + detail adapter |
| `composables/useTeamMemberPresentation.ts` | Add | Resolve shared display name, avatar URL, route-key fallback, and sender-name mapping | helper functions/computed factories | team/member context -> display metadata | agent definition store |
| `components/workspace/team/TeamWorkspaceView.vue` | Modify | Team workspace shell; owns mode selection wiring and mode-specific center content | template + local computed state | selected team -> team workspace UI | team contexts, view-mode store, presentation helpers |
| `components/workspace/team/AgentTeamEventMonitor.vue` | Modify | Focused-member detail adapter into `AgentEventMonitor` | existing props-free focused-member monitor | focused member -> detailed monitor | team contexts, agent definitions |
| `components/workspace/team/__tests__/*.spec.ts` | Modify/Add | Verify team workspace behavior across modes | test helpers | mocked team contexts -> UI assertions | Vue Test Utils / Vitest |

## Separation Of Concerns

- `AgentTeamContext` remains runtime state, not view-layout state.
- `teamWorkspaceViewStore` owns only team center-pane view mode persistence.
- `TeamWorkspaceView.vue` is the shell/orchestrator, not the owner of compact tile rendering details.
- `TeamMemberMonitorTile.vue` is presentation-only and does not send messages directly.
- `AgentConversationFeed.vue` owns read-only conversation-feed rendering and is shared across focus mode and multi-member tiles.
- `AgentEventMonitor.vue` owns composer placement around that feed, not the feed rendering itself.
- `TeamMemberMonitorTile.vue` owns viewport containment for smaller tiles, not message rendering.
- Message sending, stop generation, and approval routing stay in `activeContextStore` / `agentTeamRunStore`.

## Naming Decisions

| Item Type | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| Store | N/A | `teamWorkspaceViewStore` | Makes UI-only responsibility explicit | Avoids overloading team context store |
| Type | N/A | `TeamWorkspaceViewMode` | Clear distinction from center view `chat/config` mode | Can live in store or a dedicated type file |
| Component | N/A | `TeamMemberMonitorTile.vue` | Describes read-only compact monitor role | Distinct from full `AgentTeamEventMonitor` |
| Component | N/A | `TeamGridView.vue` / `TeamSpotlightView.vue` | Mirrors visible user-facing modes | Keeps shell logic flat |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation |
| --- | --- | --- | --- | --- |
| `teamWorkspaceViewStore.ts` | none besides Pinia | `TeamWorkspaceView.vue`, tests | Low | Keep UI-only API minimal |
| `useTeamMemberPresentation.ts` | `agentDefinitionStore`, team/member context inputs | header, tiles, focused monitor helpers | Low | Centralize formatting logic to avoid repeated fallback chains |
| `TeamWorkspaceView.vue` | team context store, view-mode store, presentation composable | workspace desktop/mobile layout | Medium | Shell only; push layout-specific rendering into child components |
| `TeamGridView.vue` / `TeamSpotlightView.vue` | tile component + team context data | `TeamWorkspaceView.vue` | Low | Keep them stateless with parent-provided selection handler |
| `AgentTeamEventMonitor.vue` | team contexts store | focus mode + spotlight primary panel if reused | Medium | Avoid broad refactor unless review shows duplication smell |

## Detailed UX Behavior

### Team Selection And Focus

- Selecting a team run from the left tree opens the team workspace using the stored mode for that team run, defaulting to `Focus` unless the store has another saved mode.
- Selecting a team member from the left tree updates `focusedMemberName` as it does today.
- Clicking a member tile in `Grid` or `Spotlight` updates `focusedMemberName`.
- Exactly one member is always visibly highlighted as focused in `Grid` and `Spotlight`.

### Focus Mode

- Uses the existing focused-member detailed monitor path.
- Header avatar, title, and status continue to reflect the focused member.
- The detailed event monitor keeps the current full conversation view.

### Grid Mode

- Renders all members in a scrollable responsive grid.
- Each tile shows:
  - member name,
  - status badge,
  - avatar/initials,
  - a smaller read-only conversation feed using the canonical event-monitor message renderer.
- Each tile keeps a bounded height.
- The tile feed auto-scrolls like focus mode and shows the live bottom of the conversation inside the tile viewport.
- Messages, tool calls, and other visible segments use the same alignment and ordering model as focus mode.
- Tiles are read-only; no tile-level composer exists.
- One tile is focus-highlighted.
- The shared bottom composer remains available for the focused member.
- The outer grid container scrolls only when there are more tiles than fit in the available area.

### Spotlight Mode

- Renders the focused member in a large primary panel.
- Renders remaining members as compact secondary tiles.
- Clicking a secondary tile changes focus and swaps that member into the primary panel.
- The shared bottom composer remains available for the focused member.
- The primary and secondary spotlight panels use the same shared read-only conversation feed as grid tiles, with the primary panel receiving more viewport room.
- Secondary spotlight tiles keep their own bounded internal scroll viewport.

### Input / Right Panel Semantics

- The focused member remains the sole input target in all modes.
- The composer area must clearly label the current target, for example `Replying to: professor`.
- Draft text remains preserved across mode switches because the draft is stored on the focused member context and retargeted when tile selection changes focus.
- Right-side member-scoped tabs continue to update through existing focused-member active context mapping.
- Right-side task plan remains unchanged and team-scoped.

## Design Choice: Shared Conversation Feed Extraction

Extract the read-only conversation portion of `AgentEventMonitor` into a shared `AgentConversationFeed` component and reuse it everywhere the app needs the canonical conversation view without a composer.

Rationale:

- Preserves one canonical message and segment rendering model.
- Fixes the UX mismatch the user observed in smaller tiles.
- Improves separation of concerns by making `AgentEventMonitor` a shell that composes `AgentConversationFeed` plus the composer.
- Reduces maintenance risk compared with a separate tile-only conversation renderer.
- Allows tile-height and scroll-containment tuning without touching canonical message rendering again.

## Design Choice: Composer Placement

For the first implementation, preserve the existing full composer behavior in `Focus` mode and add a shared composer footer in `Grid` and `Spotlight` mode.

Rationale:

- Avoids unnecessary broad refactor of `AgentEventMonitor` for the first version.
- Keeps `Focus` mode behavior maximally compatible with the current workspace.
- Draft preservation is already safe because draft text is stored in `activeContextStore`, not only in the mounted textarea component.

Follow-up option after stabilization:

- Extract a shared read-only conversation panel from `AgentEventMonitor` and move the composer to `TeamWorkspaceView` for all team modes, but this is not required for the initial version.

## Use-Case Coverage Matrix

| Use Case ID | Requirement(s) | Use Case | Primary Path Covered | Fallback / Edge Covered | Runtime Modeling Needed |
| --- | --- | --- | --- | --- | --- |
| `UC-001` | `REQ-001`, `REQ-002` | Open selected team in focus mode and render current focused member | Yes | Yes | Yes |
| `UC-002` | `REQ-001`, `REQ-003`, `REQ-005` | Switch from focus to grid without losing focused member or draft | Yes | Yes | Yes |
| `UC-003` | `REQ-003`, `REQ-006`, `REQ-008` | Click a grid tile to change focus and update right-side member-scoped tabs | Yes | Yes | Yes |
| `UC-004` | `REQ-004`, `REQ-006` | Switch to spotlight and promote a different member to the primary panel | Yes | Yes | Yes |
| `UC-005` | `REQ-007`, `REQ-008`, `REQ-009` | Send a message while in grid/spotlight and route it to the focused member only | Yes | Yes | Yes |
| `UC-006` | `REQ-010` | Render clear focus highlight across all multi-member modes | Yes | N/A | Yes |
| `UC-007` | `REQ-003`, `REQ-012` | Render a large-member-count team in a scrollable grid without breaking shell layout | Yes | Yes | Yes |
| `UC-008` | `REQ-011`, `REQ-012`, `REQ-013` | Render compact tiles with real tool-call segments, compact text segments, and omitted think segments | Yes | Yes | Yes |

## Test Strategy Direction

- Add focused team mode tests at the workspace shell level:
  - default mode,
  - mode switching,
  - focus highlight updates,
  - input-target label updates.
- Add isolated tile/grid/spotlight component tests:
  - compact tile renders real tool-call segment UI,
  - compact tile truncates text-bearing segments,
  - compact tile omits `Think`,
  - grid renders all members,
  - spotlight swaps primary member on click.
- Preserve and update existing `TeamWorkspaceView` and `AgentTeamEventMonitor` tests rather than replacing them.

## Decommission / Cleanup Plan

| Item | Cleanup Action | Why |
| --- | --- | --- |
| Header-local duplicate member formatting logic | Move to `useTeamMemberPresentation.ts` | Prevent repeated fallback chains across header, focus mode, and tiles |
| Any temporary in-component mode refs if introduced early | Consolidate into `teamWorkspaceViewStore.ts` | Keep one source of truth for per-team view mode |

## Risks

- If the shared feed extraction is sloppy, focus mode and tile mode could diverge in autoscroll or spacing behavior.
- If view mode state is stored locally instead of centrally, switching between team runs may feel inconsistent.
- If focus styling is subtle, users may not understand why right-side tabs and input target update when they click tiles.

## Recommended Default

- Default team view mode: `Focus`

Reasoning:

- Lowest behavioral surprise for current users.
- Lets the feature land incrementally while still enabling users to opt into `Grid` or `Spotlight`.
