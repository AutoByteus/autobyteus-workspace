# UI/UX Specification — Right Panel Resize and Collapse

## Status

`Requirements-ready`

## UX Goal

Keep the right tools surface predictable: a user drag changes docked width, an explicit collapse creates a reversible strip, and only a real capacity constraint turns a responsive strip into a transient drawer.

## Related Requirements And Acceptance Criteria

- Requirements: R-001–R-006
- Acceptance criteria: AC-001–AC-007

## Users / Personas / Contexts

- Desktop user working in a maximized AutoByteus workspace with left navigation and right tools visible.
- User may collapse either side intentionally and may resize the right dock with the center/right separator.

## User-Journey Inventory

| Journey ID | User / Context | Starting State | User Goal | Completion State | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- | --- |
| UXJ-001 | Desktop workspace | Left panel docked; right panel docked | Collapse left navigation, enlarge right dock | Left strip + center + right dock remain visible while compact floor fits | R-001, R-002, AC-001, AC-002 |
| UXJ-002 | Desktop workspace | Left strip + right dock | Explicitly collapse right tools | Right strip is visible; selecting a tool redocks when capacity fits | R-004, AC-004 |
| UXJ-003 | Constrained workspace | Any supported shell state | Use right tools when dock cannot fit | Right strip opens a transient drawer | R-003, AC-005 |
| UXJ-004 | Any desktop drawer | Left or right drawer open | Retain workspace context while focusing the drawer | Lighter consistent scrim keeps underlying content recognizable | R-006, AC-007 |

## Journey Details

### UXJ-001 — User-sized right dock with left strip

1. User maximizes the application.
2. User clicks the left collapse button. The left panel becomes a 50px consuming strip; the right panel remains docked.
3. User drags the center/right separator left. The right panel grows and the center shrinks to the approved user-sized floor of 200px.
4. While the compact candidate fits, the right panel remains a docked panel with a live separator; no right strip or drawer appears.
5. User drags the separator right again. The right panel shrinks within the same capacity rules and remains docked.
6. If the compact candidate eventually cannot fit, responsive fallback may show the right strip; because this is responsive yield, selecting a tool opens the transient drawer.

### UXJ-002 — Explicit right collapse and redock

1. Starting from a fitting left-strip/right-dock state, user clicks the right panel collapse control.
2. The right dock is replaced by its 50px tool strip. The right strip represents an explicit user-hidden preference.
3. User selects a tool on the strip.
4. If the right dock fits at the current compact boundary, the panel redocks, the drawer remains absent, and the selected tool is active.
5. If the dock cannot fit, the existing `open-drawer` constrained behavior remains valid.

### UXJ-003 — Genuine constrained responsive fallback

1. Available width is insufficient for left presentation + right preferred/effective width + handle + 200px center.
2. Resolver yields right tools to the consuming strip.
3. The strip advertises `open-drawer` and remains the only visible right-side opener.
4. Selecting a tool opens the existing modal drawer with focus restoration and no duplicate strip underneath.

### UXJ-004 — Contextual drawer scrim

1. User opens either the left navigation drawer or right tools drawer.
2. The drawer remains the dominant bright surface.
3. A consistent lighter scrim covers the non-drawer workspace at approximately 30% black opacity.
4. The underlying conversation/workspace remains recognizable enough to preserve orientation; it is de-emphasized, not visually blacked out.
5. Existing backdrop click, Escape, focus trapping, return-focus, and opposite-strip hit-target behavior remain unchanged.

## Screen / Surface / Component Inventory

| Surface / Component | Purpose | Entry Conditions | Important States | Exit / Next Action |
| --- | --- | --- | --- | --- |
| `WorkspaceAdaptiveLayout` center/right flow | Owns center/right split and renders resolver result | Standard workspace route | Docked right panel, right strip, right drawer | Resize, collapse, tool selection, drawer close |
| Right separator | Changes the right panel preferred width | Right panel docked | Hover, active drag, compact boundary | Width update; no presentation switch while fit |
| `RightSidebarStrip` | Tool opener or explicit redock affordance | Resolver returns strip | `redock-panel`, `open-drawer` | Tool selection emits redock/open |
| `WorkspaceRightToolDrawer` | Transient constrained tool surface | Strip activation is `open-drawer` | Open, focus-trapped, dismissible, lighter contextual scrim | Close returns focus to strip trigger |
| Left navigation drawer | Transient navigation surface | Left strip activation is `open-drawer` | Open, focus-trapped, dismissible, same lighter scrim | Close returns focus to navigation trigger |
| `RightSideTabs` | Docked right tools and explicit collapse toggle | Right panel docked | Active tab, collapse control | Tab selection or explicit hide |

## Interaction And State-Transition Specification

| Scenario / State | User Action Or Trigger | Immediate Feedback | Resulting UI State | Data / Side Effect | Next Available Actions |
| --- | --- | --- | --- | --- | --- |
| Left strip + right dock, automatic | Drag right separator left | Separator tracks pointer | `rightPanel.presentation=docked`, center floor 200 only after `user-sized` intent | Preferred/effective width update | Continue drag, collapse right |
| Left strip + right dock, compact fit | Resize or shell measurement changes | No strip flash | Right panel stays docked; `centerProtectionMode=user-override` | Effective width re-clamps | Continue drag, select tools |
| Left strip + right dock, compact fail | Width decreases beyond compact capacity | Right strip appears | `rightPanel.presentation=strip`, activation `open-drawer` | Responsive yield only; user preference remains visible | Open drawer from tool strip |
| Explicit right collapse, fitting | Click right collapse | Dock disappears; strip appears | `rightPanel.preference=hidden-by-user`, activation `redock-panel` | Visibility preference changes | Select a tool to redock |
| Explicit right strip, select tool | Click a strip tool | Dock returns without overlay | `rightPanel.presentation=docked`; drawer absent | Visibility preference becomes visible | Use selected docked tool |
| Responsive right strip | Click a strip tool | Lighter backdrop and drawer appear | Drawer owns transient interaction; workspace remains recognizable | Focus is remembered/restored | Use tool, close drawer |

## Markdown Wireframes / Visual Structure

```text
Fitting user-sized state after left collapse:
[ left strip 50 ][ center >= 200 ][ handle ][ right tools docked, resizable ]

Explicit right collapse:
[ left strip 50 ][ center ][ right tool strip 50 ]
Selecting a tool when redock-panel:
[ left strip 50 ][ center ][ right tools docked ]   (no overlay drawer)

Genuine constrained responsive state:
[ left strip 50 ][ center ][ right tool strip 50 ] + transient drawer only after tool selection
```

User-provided evidence:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_8482332e24b048f8b364a01db133b3e7/solution_designer_c57872615c404d48928a797b99956134/context_files/ctx_d77b8e3f6572__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_8482332e24b048f8b364a01db133b3e7/solution_designer_c57872615c404d48928a797b99956134/context_files/ctx_966f9d1594b8__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_8482332e24b048f8b364a01db133b3e7/solution_designer_c57872615c404d48928a797b99956134/context_files/ctx_ce0dc2de13cc__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_8482332e24b048f8b364a01db133b3e7/solution_designer_c57872615c404d48928a797b99956134/context_files/ctx_99de889f216d__image.png`

## Non-Happy-Path States

### Loading

No new loading state; keep the mounted center workspace and existing tool loading behavior.

### Empty

No change to empty workspace state or navigation actions.

### Error And Recovery

A drawer opened by a true constraint remains dismissible through existing backdrop/Escape behavior. An incorrect responsive strip must not be used as a recovery path for a fitting user-sized dock.

The scrim must not be so dark that the underlying workspace loses orientation. If a platform/theme changes the effective backdrop color, keep the visible darkness within the approved 25–35% black range.

### Disabled / Unavailable

No new disabled state. Existing unavailable tabs remain governed by the right-tool catalog.

### Permission / Authentication

Not affected.

## Responsive And Platform Behavior

- Standard desktop and embedded desktop use the same responsive policy.
- Below the existing narrow breakpoint and in short-height windows, preserve the current consuming strip and drawer behavior.
- The user-sized override applies only when the compact dock candidate fits; it does not force an over-wide dock into an unusable viewport.
- `/mobile` remains out of scope.

## Accessibility And Keyboard Behavior

- Preserve existing button labels, tab selection, focus-visible behavior, and strip activation semantics.
- `redock-panel` returns to the docked panel without introducing a modal focus trap.
- `open-drawer` retains the existing drawer focus trap, Escape handling, and return-focus target.

## Content, Labels, And Validation Messages

No copy changes.

## Drawer Scrim Visual Contract

- Target: approximately 30% black over the underlying surface.
- Acceptable range: 25–35% black opacity.
- Apply consistently to left and right transient drawers.
- Preserve the existing exception that persistent opposite-side strips may remain outside the backdrop hit-test region when they are intentionally actionable.
- Do not remove the scrim entirely; the drawer must remain clearly modal.

## Data And API Dependencies

No backend/API dependency. The UI consumes the existing responsive shell state and right-panel composable.

## Out Of Scope

Visual restyling, tool ordering, mobile redesign, generic surface controls, and drawer lifecycle refactoring.

## Open Decisions / Risks

- Exact viewport threshold is derived from current measured widths and constants, not a new fixed breakpoint.
- Live browser validation is desirable but may require an available workspace fixture; pure policy/component coverage is required regardless.
- The current implementation uses different left/right backdrop opacities; implementation should converge both owners on the lighter shared target.

## Approval Status

Intended behavior is derived from the user's request and screenshots. `Requirements-ready`; approval applicability is user-facing and should be confirmed if the user disputes the stated 200px compact-fit boundary.
