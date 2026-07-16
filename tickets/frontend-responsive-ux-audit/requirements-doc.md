# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Supplemental Artifacts

- right-tool-tabs-ux-spec.md — intended right-tool tab-row interaction and visual contract for single-row horizontal scrolling, overflow discoverability, active-tab reachability, and accessibility. Status: Refined for architecture re-review. Approval applicability: Required because it defines user-visible behavior.
- comprehensive-responsive-ui-test-report.md — historical/live evidence for the responsive failure matrix and the durable browser-validation scope. Status: Evidence supplement. Approval applicability: N/A.

## Right-Tool Tab Design-Impact Follow-Up

The current CR-003 implementation wraps the right-tool tabs to keep the expanded catalog visible. The user-confirmed target is instead the original single-row header with horizontal scrolling and lightweight overflow discoverability. The wrapping implementation and initial-fit browser assertion are not authoritative target behavior and must be revised only after this requirements/design update.

The tab-row contract is defined in right-tool-tabs-ux-spec.md and is part of the intended-behavior requirements basis for architecture re-review.

## Goal / Problem Statement

Improve the standard AutoByteus `/workspace` frontend responsive experience. The normal wide desktop workspace is acceptable, but shrinking the browser width or height currently produces severe usability failures: a blank gray workspace at intermediate widths, a legacy mobile-tab workspace at smaller widths, and cramped desktop split panes at tablet/narrow desktop widths.

The target behavior is not a phone/PWA redesign. The existing `/mobile` route already owns true phone remote access. The standard `/workspace` route must remain a desktop-capability workspace that adapts gracefully in constrained browser, embedded-browser, and narrow-window contexts without losing access to the main conversation/team surface, run history, files, terminal, activity, artifacts, browser, or VNC tools.

## Investigation Findings

- Live backend/frontend startup was completed from the dedicated task worktree using an isolated backend data directory and frontend dev server.
- Current `/workspace` has duplicated and inconsistent responsive policy:
  - `pages/workspace.vue` decides desktop/mobile with `window.matchMedia('(min-width: 640px)')`.
  - `WorkspaceDesktopLayout.vue` hides itself with Tailwind `hidden md:flex` (`md` = 768px).
  - `WorkspaceMobileLayout.vue` hides itself with `md:hidden`.
  - `layouts/default.vue` independently switches the outer app shell at `md`.
- At viewport widths `640px <= width < 768px`, the route mounts `WorkspaceDesktopLayout`, but CSS hides that mounted layout and the mobile layout is not mounted. Live probes at `700x700` and `760x700` reproduced the user screenshot: black mobile app header with blank gray workspace body.
- At `width < 640px`, the route mounts `WorkspaceMobileLayout`. That component is a legacy, limited tab UI (`Running`, optional `Files`, optional `Content`, `Agent`) and does not preserve the standard workspace's right-side tool surface (Terminal/Activity/Artifacts/Browser/VNC) or the desktop-capability shell semantics.
- At `md+` constrained widths, current docked panes over-consume horizontal space. Live probes showed:
  - `1024x768`: left panel `320px`, right panel `450px`, center shell only `247px`.
  - `800x700`: left panel `320px`, right panel clamped to `273px`, center shell only `200px`.
- `useRightPanel.ts` currently clamps only enough to preserve a `200px` center minimum and does not auto-collapse or switch to a drawer/strip presentation when the workspace container cannot support docked right tools.
- `layouts/default.vue` keeps the full `320px` left panel docked at `md+` even when viewport width is only `768-1024px`, leaving insufficient width for the workspace.
- Short-height probes (`800x420`, `1024x480`) keep panes technically mounted but visibly cramped; the left-panel primary navigation/workspace-history split and the center/right split need height-aware responsive behavior.
- Operational note from live startup: `autobyteus-web/README.md` still documents `NUXT_PUBLIC_*` endpoint variables, but `nuxt.config.ts` actually uses `BACKEND_*` variables and the dev proxy in development. Using only the README variables produced connection-refused tool panels until corrected. This is a documentation sync issue for delivery.
- Expanded comprehensive responsive UI probing is recorded in `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/comprehensive-responsive-ui-test-report.md` with raw JSON/screenshots under `tickets/frontend-responsive-ux-audit/probes/comprehensive/`.
- The expanded viewport matrix covered `390x844`, `390x640`, `500x700`, `500x420`, `639x700`, `640x700`, `700x700`, `767x700`, `768x700`, `800x700`, `800x420`, `900x700`, `1024x768`, `1024x480`, `1180x800`, `1280x800`, `1440x900`, plus `/mobile` at `390x844`.
- Comprehensive results sharpen the severity model: `640-767px` is P0 blank; `<640px` is P1 legacy limited mobile-tab fallback; `768-1024px` is P1 center/right/left docking failure; `<=480px` height is P2 short-window recovery failure; button/control ordering is P2 product-level UX drift.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Behavior Change / Responsive Layout Refactor
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination; Boundary Or Ownership Issue; File Placement Or Responsibility Drift
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: Live screenshots/probe JSON under `tickets/frontend-responsive-ux-audit/probes/`; current code in `pages/workspace.vue`, `layouts/default.vue`, `components/layout/WorkspaceDesktopLayout.vue`, `components/layout/WorkspaceMobileLayout.vue`, `composables/useRightPanel.ts`, and `composables/useLeftPanel.ts`.
- Requirement or scope impact: Fixing only one breakpoint would remove the blank band but would preserve the bad legacy mobile layout and cramped narrow-desktop layout. The change needs a single responsive policy owner and adaptive shell/workspace presentations.

## Recommendations

1. Make standard `/workspace` an adaptive desktop-capability workspace; do not route constrained standard workspace windows into the legacy `WorkspaceMobileLayout`.
2. Introduce a single responsive policy owner for workspace/shell surface presentation and remove duplicated breakpoint decisions from route/component CSS.
3. Replace hard binary desktop/mobile layout switching with adaptive surface modes:
   - wide: existing docked left panel + center + docked right tools;
   - constrained: left panel collapsed/strip or overlay, right tools collapsed to strip/drawer, center kept usable;
   - narrow: app header/drawers are allowed, but all standard workspace capabilities remain reachable and no blank body is allowed.
4. Raise the practical center-pane preservation requirement above the current `200px` minimum and auto-collapse side surfaces before the center becomes unusable.
5. Keep `/mobile` route and `components/mobile/*` as the phone/PWA remote-access owner; do not mix it into the standard `/workspace` route.
6. Update developer startup docs to reflect actual `BACKEND_*` frontend endpoint configuration.
7. Treat button/control order as a product-level responsive requirement: the narrow layout must not inherit arbitrary legacy `Running / Agent` ordering, and tool buttons must keep a stable canonical order across docked tabs, strips, and drawers.
8. Treat the comprehensive responsive viewport matrix as a durable validation requirement, not a one-off manual audit; implementation should include policy/component coverage and a browser probe/E2E equivalent for the tested failure bands.

## Scope Classification (`Small`/`Medium`/`Large`)

Large

Rationale: The defect starts as a breakpoint bug but the required product-quality fix crosses the app shell, workspace layout, left-panel presentation, right-panel presentation, and responsive coverage. It does not require backend domain changes.

## In-Scope Use Cases

- UC-001: Wide desktop workspace preserves the current good desktop UX.
- UC-002: Intermediate widths (`640-767px`) render usable workspace content rather than a blank body.
- UC-003: Constrained desktop/tablet widths (`768-1024px`) keep the center conversation/team/config surface usable by collapsing or re-presenting side surfaces.
- UC-004: Very narrow standard `/workspace` windows (`<640px`) retain access to standard workspace capabilities through drawers/strips/sheets instead of falling into the legacy limited mobile layout.
- UC-005: Short windows (`420-480px` height) keep navigation, center content, and tool access operable without forcing key controls permanently off-screen.
- UC-006: True phone/PWA remote access continues through `/mobile` and remains unaffected.
- UC-007: Local developer startup documentation accurately starts frontend against backend for manual responsive testing.
- UC-008: Responsive control/button ordering remains intentional, stable, and task-priority driven across wide, constrained, and narrow workspace modes.
- UC-009: Responsive fixes are validated against a comprehensive viewport/interaction matrix rather than a single screenshot or breakpoint.

## Out of Scope

- Native Android/iOS UI changes.
- Redesign of the mature `/mobile` remote-access shell.
- Backend feature behavior changes unrelated to serving the UI during local reproduction.
- Full redesign of individual tool panel internals such as Terminal, Browser, or VNC beyond ensuring the panels are reachable in adaptive presentations.
- Visual restyling of the wide desktop workspace beyond preserving existing layout quality.

## Functional Requirements

- FR-016: Right-tool tabs in docked and drawer presentations must remain a single horizontal row with the original spacing, typography, active underline, and fixed panel-toggle affordance; the row must not wrap.
- FR-017: When the right-tool tab catalog exceeds the available header width, the tab row must remain horizontally scrollable through native mouse, touchpad, touch, and keyboard interactions.
- FR-018: Overflow discoverability must be conditional and lightweight: show a subtle edge fade and directional chevron only when undisclosed tabs exist, and update the direction/visibility after scrolling.
- FR-019: Selecting or keyboard-focusing an offscreen right-tool tab must automatically scroll that tab into view without changing canonical tab order or panel preference state.
- FR-020: An optional More menu may provide secondary direct tab selection, but it must not replace the visible scrollable tab row or become the only path to any tool.

- FR-001: `/workspace` must not have any viewport-width band where the route mounts one workspace layout while CSS hides that same mounted layout and no alternative layout is visible.
- FR-002: `/workspace` must use one authoritative responsive policy for shell/workspace surface presentation instead of independent breakpoint decisions in `pages/workspace.vue`, `WorkspaceDesktopLayout`, `WorkspaceMobileLayout`, and `layouts/default.vue`.
- FR-003: Wide desktop behavior must preserve the current primary layout: left navigation/history panel, center workspace surface, and right-side tools panel are docked when enough space exists.
- FR-004: At constrained widths, the app must preserve a usable center workspace surface by automatically collapsing or re-presenting the left and/or right side surfaces before the center is squeezed below the target minimum usable width.
- FR-005: At narrow standard `/workspace` widths, the UI must retain discoverable access to run history/navigation, files, terminal, activity/progress, artifacts, browser, and VNC through strips, drawers, sheets, or equivalent standard-workspace surfaces.
- FR-006: The legacy `WorkspaceMobileLayout` must not remain the standard `/workspace` fallback if it cannot provide the standard workspace capability set.
- FR-007: The `/mobile` route and `components/mobile/*` remote-access shell must remain the owner for phone/PWA experiences and must not be regressed by the `/workspace` responsive refactor.
- FR-008: Responsive behavior must account for both width and height so short windows do not permanently hide required controls or create unusable split panes.
- FR-009: The right-panel width policy must preserve a practical center width and switch presentation mode rather than merely clamping the right panel while leaving a `200px` center.
- FR-010: The left-panel policy must distinguish user preference from responsive effective presentation so constrained widths can auto-collapse without permanently overwriting the user's wide-desktop preference.
- FR-011: Developer documentation for local frontend/backend startup must match the actual Nuxt configuration variables used by `nuxt.config.ts`.
- FR-012: Standard `/workspace` controls must use a canonical responsive ordering model rather than per-layout ad hoc button order. The primary order must prioritize: current work surface, run/history/config access, files, then tools.
- FR-013: Right-tool controls must keep a stable order across docked desktop tabs, constrained strips, and narrow drawers/sheets: Files first where present, contextual Team overview when relevant, then Terminal, Activity, Artifacts, Browser, and VNC.
- FR-014: Header/action buttons inside the center work surface must keep stable priority under constrained width: identity/status first, primary run/work actions next, secondary actions in overflow; controls must not wrap into unusable or misleading order.
- FR-015: The implementation must provide durable responsive validation for the known failure classes: blank `640-767px` band, legacy `<640px` `/workspace` fallback, cramped `768-1024px` docked panes, short-height recovery, canonical control/tool ordering, wide desktop non-regression, and `/mobile` route isolation.

## Acceptance Criteria

- AC-016: In docked and drawer right-tool presentations, the tabs render in one horizontal row with no multi-row wrapping; the original spacing, typography, active underline, and fixed panel-toggle affordance remain present.
- AC-017: When the tab row overflows, a browser/component test can scroll it horizontally through mouse/touchpad-equivalent, touch, and keyboard paths; the test does not require all tabs to fit initially.
- AC-018: Edge fades and directional chevrons appear only when additional tabs exist, point toward undisclosed content, and update or disappear at the relevant scroll boundaries.
- AC-019: Activating or focusing an offscreen tab automatically brings it into the visible tab-list bounds in both docked and drawer presentations.
- AC-020: The current expanded catalog, including Usage/Token and VNC Viewer when available, remains reachable and in canonical order through scrolling without changing the active underline or panel-toggle placement.
- AC-021: If a More menu is implemented, it is a secondary shortcut and the visible scrollable tab row remains available as the primary interaction.

- AC-001: At `700x700` and `760x700`, `/workspace` shows visible workspace controls/content; it does not show only the black app header plus blank gray body.
- AC-002: At `1440x900`, the current wide desktop layout remains materially unchanged: left panel docked, center workspace visible, and right tools docked by default.
- AC-003: At `1024x768`, the center workspace surface is not squeezed to approximately `247px`; side surfaces collapse or change presentation so the center is meaningfully usable.
- AC-004: At `800x700`, the center workspace surface is not squeezed to approximately `200px`; the UI chooses constrained presentation rather than maintaining three cramped docked panes.
- AC-005: At `<640px` standard `/workspace` widths, the old limited `Running/Files/Content/Agent` mobile-tab layout is not the only available experience; standard workspace tools remain reachable.
- AC-006: At `800x420` and `1024x480`, required controls remain operable through scrolling/drawers/strips; no key panel is clipped with no recovery path.
- AC-007: `/mobile` still renders `MobileRemoteAccessShell` and does not import or depend on the standard workspace adaptive shell.
- AC-008: Unit/component coverage verifies the responsive-policy boundary at least around `639`, `640`, `767`, `768`, `800`, `1024`, and a wide desktop size.
- AC-009: A live browser responsive probe or equivalent E2E coverage confirms no blank workspace body at `640-767px` and validates constrained-width behavior.
- AC-010: `autobyteus-web/README.md` or equivalent local-development docs no longer instruct developers to use endpoint environment variables ignored by the current Nuxt config.
- AC-011: At narrow standard `/workspace` widths, the visible primary surface controls appear in the intended order: Work, Runs, Files, Tools; they do not show the legacy ambiguous `Running / Agent` pair as the main navigation model.
- AC-012: In every right-tool presentation mode, the tool order is stable and matches the canonical sequence: Files, Team when applicable, Terminal, Activity, Artifacts, Browser, VNC.
- AC-013: Agent/team center header controls remain discoverable and ordered by priority under constrained width; secondary actions collapse into overflow instead of displacing the title/status or primary work action.
- AC-014: A browser-level responsive probe or equivalent E2E coverage runs the comprehensive viewport family used in investigation (`390x844`, `390x640`, `500x700`, `500x420`, `639x700`, `640x700`, `700x700`, `767x700`, `768x700`, `800x700`, `800x420`, `900x700`, `1024x768`, `1024x480`, `1180x800`, `1280x800`, `1440x900`) and records screenshots/traces for failures.
- AC-015: In the target state, the comprehensive probe no longer reports the current failure classes for standard `/workspace`: `desktop_layout_mounted_but_hidden`, `visible_main_has_no_workspace_content`, `legacy_mobile_running_agent_button_model`, center widths around `200-247px` at `768-1024px`, cramped right tool panels at `768-800px`, or unrecoverable full docked side panels in short-height windows.

## Constraints / Dependencies

- Preserve wide desktop behavior and existing route `/workspace` semantics.
- Do not regress `/mobile` remote-access route.
- Tailwind's default `md` breakpoint is `768px`; any JS thresholds must not conflict with CSS-only visibility thresholds.
- Existing global state in `useLeftPanel` and `useRightPanel` must avoid SSR/browser lifecycle hazards.
- Implementation should avoid backward-compatible dual desktop/mobile behavior paths for standard `/workspace` after the adaptive layout is introduced.

## Assumptions

- The referenced screenshot represents the `640-767px` blank-band failure caused by the `640px` JS breakpoint versus `768px` CSS breakpoint mismatch.
- Standard `/workspace` should remain useful in embedded browser panes and resizable desktop windows even when the surface is narrower than a typical desktop monitor.
- True phone usage should prefer `/mobile`, not the legacy `WorkspaceMobileLayout` embedded in `/workspace`.

## Risks / Open Questions

- Exact visual thresholds for automatic left/right collapse need implementation tuning, but the minimum outcome must satisfy the acceptance criteria above.
- Some right-side tools may need additional internal responsive polish after being moved into drawer/sheet presentations; this task requires reachability and shell-level usability, not complete tool-internal redesign.
- Existing user preference persistence for panel visibility/width is minimal; adding responsive effective modes must not create surprising permanent state changes.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| FR-001 | UC-002 |
| FR-002 | UC-001, UC-002, UC-003, UC-004, UC-005 |
| FR-003 | UC-001 |
| FR-004 | UC-003 |
| FR-005 | UC-004 |
| FR-006 | UC-002, UC-004 |
| FR-007 | UC-006 |
| FR-008 | UC-005 |
| FR-009 | UC-003, UC-005 |
| FR-010 | UC-001, UC-003, UC-005 |
| FR-011 | UC-007 |
| FR-012 | UC-008 |
| FR-013 | UC-008 |
| FR-014 | UC-003, UC-004, UC-005, UC-008 |
| FR-015 | UC-001, UC-002, UC-003, UC-004, UC-005, UC-006, UC-008, UC-009 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001 | Regression guard for the exact blank responsive band reproduced live. |
| AC-002 | Wide desktop non-regression. |
| AC-003 | Narrow desktop/tablet width usability. |
| AC-004 | Severe constrained-width usability. |
| AC-005 | Legacy mobile fallback removal/replacement for standard workspace. |
| AC-006 | Short-window usability. |
| AC-007 | `/mobile` ownership boundary preservation. |
| AC-008 | Durable unit/component coverage of policy decisions. |
| AC-009 | Browser-level confidence for responsive layout behavior. |
| AC-010 | Documentation sync for live manual testing. |
| AC-011 | Primary narrow control ordering and removal of the legacy ambiguous mobile button model. |
| AC-012 | Stable canonical tool ordering across docked/strip/drawer presentations. |
| AC-013 | Center header/action priority under constrained width. |
| AC-014 | Comprehensive responsive browser matrix coverage. |
| AC-015 | Regression guard for all current failure classes found by the comprehensive probe. |

## Approval Status

Refined based on the user's explicit confirmation of the original single-row right-tool tab design. The right-tool tab overflow behavior is now an intended-behavior requirement and must pass architecture re-review before implementation resumes. The existing wrapping Local Fix and initial-fit browser assertion are superseded for this behavior.

## Revised Requirement Coverage

| Requirement | Use Cases |
| --- | --- |
| FR-016 | UC-008, UC-009 |
| FR-017 | UC-008, UC-009 |
| FR-018 | UC-008, UC-009 |
| FR-019 | UC-008, UC-009 |
| FR-020 | UC-008, UC-009 |

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-016 | Single-row right-tool tab-header visual contract. |
| AC-017 | Horizontal overflow interaction across pointer, touch, and keyboard input. |
| AC-018 | Conditional overflow discoverability affordances. |
| AC-019 | Active/focused tab auto-scroll reachability. |
| AC-020 | Expanded catalog reachability and order preservation. |
| AC-021 | Optional More-menu non-replacement rule. |
