# Comprehensive Responsive UI Test Report

## Purpose

This report records the expanded live investigation requested by the user for the current AutoByteus frontend responsive experience. The goal was not only to confirm the original blank-screen screenshot, but to test the whole `/workspace` responsive surface across phone-width, narrow, breakpoint, tablet, short-height, small-desktop, and wide-desktop sizes; capture the problems; and turn them into a UI improvement plan.

## Environment / Setup

- Dedicated worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit`
- Branch: `codex/frontend-responsive-ux-audit`
- Backend: `http://127.0.0.1:13001` started from `autobyteus-server-ts` with isolated data dir `/tmp/autobyteus-responsive-ux-audit-server-data`.
- Frontend: `http://127.0.0.1:13002` started from `autobyteus-web` with current `BACKEND_*` endpoint variables.
- Probe script: `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/probes/comprehensive/probe-current-responsive-ui.mjs`
- Probe JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/probes/comprehensive/current-responsive-ui-results.json`
- Probe generated at: `2026-06-24T05:06:08.243Z`

## Test Method

The probe used Playwright/Chrome to open `http://127.0.0.1:13002/workspace`, set each viewport, wait for initial render, capture a screenshot, collect DOM/layout measurements, collect visible button order, click the visible hamburger when present, click the legacy `Agent` tab when present, and click visible right-side tabs in order on docked desktop states. It separately opened `http://127.0.0.1:13002/mobile` to verify that true phone/PWA mobile remains a separate route.

Issue flags were derived from visible DOM facts, not from source-code assumptions:

- `desktop_layout_mounted_but_hidden`: the desktop workspace component exists but has no visible box.
- `visible_main_has_no_workspace_content`: the main region is visible but has no actual workspace content.
- `legacy_mobile_running_agent_button_model`: the narrow `/workspace` experience is the legacy `Running`/`Agent` model.
- `center_too_narrow_*`: center content shell is visible but below a practical minimum in the current probe.
- `right_panel_cramped_*`: right tool panel is visible but below a practical minimum.
- `left_panel_docked_too_wide_for_viewport`: full 320px left panel remains docked at `md+` constrained widths.
- `short_height_keeps_full_left_panel_docked`: short-height window still keeps the full left panel docked.

## Viewport Matrix Results

| Viewport | Size | Issue flags | Main | Left | Center | Right | Visible top/right controls |
| --- | --- | --- | --- | --- | --- | --- | --- |
| phone-390x844 | 390x844 | legacy_mobile_running_agent_button_model | 390x788@0,56 | 320x788@-320,56 | - | - | Top: Open menu, Running, Agent, Running List, Configuration<br>Right: - |
| phone-short-390x640 | 390x640 | legacy_mobile_running_agent_button_model | 390x584@0,56 | 320x584@-320,56 | - | - | Top: Open menu, Running, Agent, Running List, Configuration<br>Right: - |
| narrow-500x700 | 500x700 | legacy_mobile_running_agent_button_model | 500x644@0,56 | 320x644@-320,56 | - | - | Top: Open menu, Running, Agent, Running List, Configuration<br>Right: - |
| narrow-short-500x420 | 500x420 | legacy_mobile_running_agent_button_model | 500x364@0,56 | 320x364@-320,56 | - | - | Top: Open menu, Running, Agent, Running List, Configuration<br>Right: - |
| threshold-639x700 | 639x700 | legacy_mobile_running_agent_button_model | 639x644@0,56 | 320x644@-320,56 | - | - | Top: Open menu, Running, Agent, Running List, Configuration<br>Right: - |
| threshold-640x700 | 640x700 | desktop_layout_mounted_but_hidden<br>visible_main_has_no_workspace_content | 640x644@0,56 | 320x644@-320,56 | 0x0@0,0 | 0x0@0,0 | Top: Open menu<br>Right: - |
| gap-700x700 | 700x700 | desktop_layout_mounted_but_hidden<br>visible_main_has_no_workspace_content | 700x644@0,56 | 320x644@-320,56 | 0x0@0,0 | 0x0@0,0 | Top: Open menu<br>Right: - |
| gap-767x700 | 767x700 | desktop_layout_mounted_but_hidden<br>visible_main_has_no_workspace_content | 767x644@0,56 | 320x644@-320,56 | 0x0@0,0 | 0x0@0,0 | Top: Open menu<br>Right: - |
| md-768x700 | 768x700 | center_too_narrow_200px<br>right_panel_cramped_241px<br>left_panel_docked_too_wide_for_viewport | 445x700@323,0 | 320x700@0,0 | 200x700@323,0 | 241x700@527,0 | Top: Files, Terminal, Activity, Agents, Collapse left panel, Toggle Sidebar, Agent Teams, Skills<br>Right: Files, Terminal, Activity, Toggle Sidebar |
| tablet-800x700 | 800x700 | center_too_narrow_200px<br>right_panel_cramped_273px<br>left_panel_docked_too_wide_for_viewport | 477x700@323,0 | 320x700@0,0 | 200x700@323,0 | 273x700@527,0 | Top: Files, Terminal, Activity, Agents, Collapse left panel, Toggle Sidebar, Agent Teams, Skills<br>Right: Files, Terminal, Activity, Toggle Sidebar |
| tablet-short-800x420 | 800x420 | center_too_narrow_200px<br>right_panel_cramped_273px<br>left_panel_docked_too_wide_for_viewport<br>short_height_keeps_full_left_panel_docked | 477x420@323,0 | 320x420@0,0 | 200x420@323,0 | 273x420@527,0 | Top: Files, Terminal, Activity, Agents, Collapse left panel, Toggle Sidebar, Agent Teams, Skills<br>Right: Files, Terminal, Activity, Toggle Sidebar |
| tablet-900x700 | 900x700 | center_too_narrow_200px<br>left_panel_docked_too_wide_for_viewport | 577x700@323,0 | 320x700@0,0 | 200x700@323,0 | 373x700@527,0 | Top: Files, Terminal, Activity, Artifacts, Agents, Collapse left panel, Toggle Sidebar, Agent Teams, Skills<br>Right: Files, Terminal, Activity, Artifacts, Toggle Sidebar |
| small-desktop-1024x768 | 1024x768 | center_too_narrow_247px<br>left_panel_docked_too_wide_for_viewport | 701x768@323,0 | 320x768@0,0 | 247x768@323,0 | 450x768@574,0 | Top: Files, Terminal, Activity, Artifacts, VNC Viewer, Agents, Collapse left panel, Toggle Sidebar, Agent Teams, Skills<br>Right: Files, Terminal, Activity, Artifacts, VNC Viewer, Toggle Sidebar |
| small-desktop-short-1024x480 | 1024x480 | center_too_narrow_247px<br>left_panel_docked_too_wide_for_viewport<br>short_height_keeps_full_left_panel_docked | 701x480@323,0 | 320x480@0,0 | 247x480@323,0 | 450x480@574,0 | Top: Files, Terminal, Activity, Artifacts, VNC Viewer, Agents, Collapse left panel, Toggle Sidebar, Agent Teams, Skills<br>Right: Files, Terminal, Activity, Artifacts, VNC Viewer, Toggle Sidebar |
| desktop-1180x800 | 1180x800 | OK | 857x800@323,0 | 320x800@0,0 | 403x800@323,0 | 450x800@730,0 | Top: Files, Terminal, Activity, Artifacts, VNC Viewer, Agents, Collapse left panel, Toggle Sidebar, Agent Teams, Skills<br>Right: Files, Terminal, Activity, Artifacts, VNC Viewer, Toggle Sidebar |
| desktop-1280x800 | 1280x800 | OK | 957x800@323,0 | 320x800@0,0 | 503x800@323,0 | 450x800@830,0 | Top: Files, Terminal, Activity, Artifacts, VNC Viewer, Agents, Collapse left panel, Toggle Sidebar, Agent Teams, Skills<br>Right: Files, Terminal, Activity, Artifacts, VNC Viewer, Toggle Sidebar |
| wide-1440x900 | 1440x900 | OK | 1117x900@323,0 | 320x900@0,0 | 663x900@323,0 | 450x900@990,0 | Top: Files, Terminal, Activity, Artifacts, VNC Viewer, Agents, Collapse left panel, Toggle Sidebar, Agent Teams, Skills<br>Right: Files, Terminal, Activity, Artifacts, VNC Viewer, Toggle Sidebar |

## Representative Screenshot Evidence

| Evidence | Path |
| --- | --- |
| Blank band | /Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/probes/comprehensive/gap-700x700-initial.png |
| Legacy narrow mobile-tab fallback | /Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/probes/comprehensive/phone-390x844-initial.png |
| Cramped 800px desktop/tablet | /Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/probes/comprehensive/tablet-800x700-initial.png |
| Cramped 1024px small desktop | /Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/probes/comprehensive/small-desktop-1024x768-initial.png |
| First acceptable wide desktop sample | /Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/probes/comprehensive/desktop-1180x800-initial.png |
| Independent `/mobile` route sample | /Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/probes/comprehensive/mobile-route-390x844.png |

## Problem Catalogue

| Severity | Problem | Evidence viewports | Current cause / symptom | Design response |
| --- | --- | --- | --- | --- |
| P0 | Blank standard `/workspace` at `640-767px` | `threshold-640x700`, `gap-700x700`, `gap-767x700` | Desktop component is mounted but `hidden md:flex` hides it below `768px`; route no longer mounts mobile below `640px` once `min-width:640px` matches. | One adaptive `/workspace` layout; route no longer owns desktop/mobile branching; no root CSS branch can hide the only mounted layout. |
| P1 | Legacy mobile-tab model below `640px` | `phone-390x844`, `narrow-500x700`, `threshold-639x700` | Visible controls are `Running`, `Agent`, `Running List`, `Configuration`; standard tools are absent. | Narrow standard `/workspace` keeps desktop-capability surfaces with canonical `Work -> Runs -> Files -> Tools` controls. |
| P1 | Center workspace crushed at `768-1024px` | `md-768x700`, `tablet-800x700`, `tablet-900x700`, `small-desktop-1024x768` | Left panel remains `320px` docked and right panel remains docked/clamped, leaving center `200-247px`. | Policy collapses/re-presents side surfaces before center falls below practical target; use strip/drawer/sheet modes. |
| P1 | Right tool tabs are truncated or unavailable in constrained docked panel | `md-768x700`, `tablet-800x700`, `tablet-900x700` | Only first tabs are readable/reachable in the cramped header; some tools are cut or icon-only. | Right tools share canonical order across docked tabs, rail/strip, and drawer/sheet; all available tools remain reachable. |
| P1 | Left panel consumes too much width at tablet/small desktop widths | `768-1024px` family | `layouts/default.vue` keeps full `320px` left panel docked at `md+`. | Shell policy has effective left presentation separate from user preference: docked only when space supports it; otherwise strip/drawer. |
| P2 | Short-height windows keep full docked panes | `800x420`, `1024x480` | Full-height left and right panes remain docked with little vertical recovery; important nav/history/tool controls can be clipped. | Height-aware policy chooses compact/overlay presentations and keeps required controls recoverable. |
| P2 | Responsive button/control order is accidental | All non-wide modes | Below `640px`, order comes from `WorkspaceMobileLayout`; at `md+`, order comes from right-tab implementation and physical clipping. | Dedicated surface/order catalog with tests: primary surfaces `Work, Runs, Files, Tools`; tools `Files, Team, Terminal, Activity, Artifacts, Browser, VNC`. |
| P2 | Developer startup docs are stale | Manual setup | `autobyteus-web/README.md` documents `NUXT_PUBLIC_*`, while current Nuxt config uses `BACKEND_*`/dev proxy. | Delivery docs update after implementation or as part of final docs sync. |

## Key Conclusions

1. The user screenshot is a real breakpoint coordination defect, not just a styling glitch. There is a full `640-767px` blank band where the route mounts desktop but CSS hides desktop and mobile is not mounted.
2. Below `640px`, `/workspace` does render, but it renders the wrong product model for this route: a legacy limited mobile fallback with `Running`/`Agent` buttons and no stable standard tool access.
3. Starting at `768px`, the desktop layout becomes visible but the center is still unusable until roughly wide-desktop sizes. The first probed size without issue flags was `1180x800`, where the center was still only `403px`.
4. The current side-panel policy treats left/right panels as always dockable at `md+`, so the center workspace pays the cost. This is why `800px` and `1024px` screenshots look bad even though they are technically not blank.
5. Button ordering is part of the bug. In constrained states, users see whichever controls survive clipping or legacy fallback order; there is no single product-level order model.
6. `/mobile` is healthy as a separate phone/PWA route and should not become the standard `/workspace` responsive fallback.

## UI Improvement Plan Derived From Testing

### Adaptive modes

The target should not be a simple `mobile` vs `desktop` branch. It should be a measured adaptive standard workspace:

- `Wide / full docked`: preserve current good desktop layout when there is enough measured space for left panel, usable center, and right tools. The observed current desktop starts becoming acceptable around `1180px+`, but implementation should derive this from center-width preservation rather than a single viewport constant.
- `Constrained desktop / tablet`: for roughly `768-1179px` or any measured container where docked side surfaces would crush the center, auto-collapse the left panel to strip/drawer and move right tools to strip/drawer. Center remains the primary surface.
- `Narrow standard workspace`: below `768px`, still render standard `/workspace` capabilities, not `WorkspaceMobileLayout`. Use primary controls in this order: `Work -> Runs -> Files -> Tools`.
- `Short height`: at roughly `<=480px` height, prefer compact/overlay side surfaces and preserve recoverable controls rather than full-height docked side panels.
- `Phone/PWA`: keep `/mobile` separate and untouched.

### Control ordering

The canonical order must be explicit and testable:

- Primary surface order: `Work`, `Runs`, `Files`, `Tools`.
- Tool order: `Files`, `Team` when applicable, `Terminal`, `Activity`, `Artifacts`, `Browser` when available, `VNC Viewer`.
- Center header/action priority: identity/status first, primary run/work action next, secondary actions in overflow instead of wrapping into misleading order.

### Architecture plan

- Add a pure responsive policy owner (`utils/layout/responsiveLayoutPolicy.ts`) for width/height/container decisions.
- Add a canonical order catalog (`utils/layout/workspaceSurfaceOrder.ts` or equivalent) for top-level surfaces and tools.
- Refactor `WorkspaceDesktopLayout` into `WorkspaceAdaptiveLayout` and remove the root `hidden md:flex` owner.
- Make `pages/workspace.vue` a thin route facade that always mounts the adaptive standard workspace.
- Remove/decommission `WorkspaceMobileLayout.vue` and `useMobilePanels.ts` from standard `/workspace` if no other imports remain.
- Extend left/right panel state to separate user preference from responsive effective presentation.
- Keep `/mobile -> MobileRemoteAccessShell` separate.

### Durable validation plan

Implementation should not be accepted with only manual visual inspection. It should add or update durable coverage so the following are checked:

- Pure policy boundaries around `639`, `640`, `767`, `768`, `800`, `900`, `1024`, `1180+`, and short-height cases.
- Component/layout tests confirming one visible adaptive layout and no blank root.
- Surface-ownership tests confirming the wide left/center/right hierarchy, no duplicate generic surface row after manual collapse, explicit narrow navigation/Tools triggers, empty-state selection actions, and canonical right-tool order.
- Live browser/E2E responsive probe using the matrix in this report, with screenshots or traces for failures.
- `/mobile` route remains separate and still renders `MobileRemoteAccessShell`.

## Design Impact

### Right-Tool Tab Design-Impact Clarification

The historical probe correctly identified that the expanded right-tool catalog can leave later tabs outside the initial visible header bounds. That observation remains valid, but the prior initial-fit assertion is not the final product contract. The user-confirmed target preserves the original single horizontal row and uses horizontal scrolling, conditional edge fade/chevron affordances, and active-tab auto-scroll to make every tab reachable.

The current CR-003 wrapped-header implementation is therefore a design-impact follow-up, not a completed responsive fix. Future browser coverage must assert one-row rendering, scrollability, overflow discoverability, active/focused-tab reachability, canonical order, and fixed panel-toggle stability in docked and drawer states. It must not require every tab to fit before the user scrolls. See right-tool-tabs-ux-spec.md for the intended behavior.

The expanded test results reinforce the existing design direction and make the responsive probe matrix a first-class requirement. They do not change the core design owner: the solution must still be one adaptive standard `/workspace` shell with centralized policy and explicit control order. They add stronger evidence that a breakpoint-only patch is inadequate because the UX remains poor from `768px` through `1024px` and in short-height windows.

### Workspace shell design-impact clarification

The current implementation also fails a wide-layout mental-model check that is distinct from the prior viewport failure matrix. `WorkspaceAdaptiveLayout.vue` renders `WorkspacePrimarySurfaceControls` whenever the left effective presentation is not `docked`, so a user-collapsed left panel on a full-screen window can produce a `Work / Runs / Files / Tools` row while the original right-side tabs remain visible. The live screenshot `evidence/solution-designer-workspace-current-narrow-empty-state.png` shows the related narrow empty state: the center only says `Select or run an agent/team to begin`, while the actual Agents/Agent Teams selection path is hidden behind the shell drawer.

The revised validation boundary must therefore include:

- wide default: no generic top surface row;
- wide manual left collapse: left strip + center + right tabs remain in the personal-branch hierarchy, with no generic top row;
- constrained/narrow: explicit semantic navigation/selection and Tools triggers, not duplicated `Work / Runs / Files / Tools` controls;
- no-selection center: direct agent/team selection and run-history actions;
- resize transitions: selected run and user panel preference are preserved.
- modest resize while still desktop-usable: left panel remains docked when left navigation plus a practical center fit, and right tools yield first rather than triggering a blanket left-strip state;
- policy validation proves left-panel collapse is capacity/priority-driven, not simply `viewportWidth < 1280`.

These are design-impact follow-ups recorded in `workspace-responsive-ui-ux-spec.md`; they require architecture review before implementation sign-off.

### DI-003 composed policy resolution

Architecture Review Round 6 found that the prior package described measured capacity and right-tools-first priority without defining one executable owner. The revised design now makes `resolveResponsiveWorkspaceShellState` plus `useResponsiveWorkspaceShell` authoritative. The resolver receives viewport dimensions, left/right preferences, and preferred widths; it applies the explicit fit formula and phase order; `layouts/default.vue` provides the result to `WorkspaceAdaptiveLayout`; no second workspace resolver is allowed. Policy coverage must assert the resulting state and `presentationSource` for wide, large-constrained, constrained, narrow, short-height, manual-left-hidden, and repeated-resize cases.

### Right-strip duplicate Tools trigger (2026-07-16)

The user supplied a full-screen comparison showing a second regression after collapsing the right panel: the current build renders the expected right vertical tool strip and an additional top `Tools` button, while the personal branch renders only the strip. Source inspection identifies the exact condition in `autobyteus-web/components/layout/WorkspaceAdaptiveLayout.vue`:

```ts
const showToolsTrigger = computed(() =>
  responsiveWorkspaceShellState.value.rightPanel.presentation !== 'docked',
)
```

The same template renders `RightSidebarStrip` when `showRightStrip` is true. A user-collapsed right panel has effective presentation `strip`, so both branches are active. The strip already opens the right tool drawer through `RightSidebarStrip.vue`; treating every non-docked state as requiring a top trigger creates two affordances for one surface. The intended correction is `presentation === 'drawer'` (or the equivalent composed-policy output), with tests proving: docked = no top trigger; strip = strip only; drawer-only = one semantic Tools trigger.

This is a local implementation defect, not a reason to change the `/mobile` wrapper or reintroduce the generic `Work / Runs / Files / Tools` row. The requirements/design basis now records this as FR-032/AC-033 and requires architecture re-review before the bounded implementation fix.

### Right-panel divider drag disappearance (2026-07-16)

The user reproduced a second supported-path failure by dragging the docked right-panel divider leftward. The current `useRightPanel.ts` drag handler has only a minimum clamp; it allows `preferredRightPanelWidth` to grow without an available-space maximum. Once that width makes the left-docked/right-docked candidate infeasible, the composed policy selects a right drawer. `WorkspaceAdaptiveLayout.vue` consequently removes the docked right panel and lets the center expand, which appears as the entire right side suddenly disappearing; the top `Tools` trigger can remain as the drawer-only affordance.

The personal branch bounded the actual right width using a measured workspace container. The target must restore an equivalent bound with the approved `480px` center minimum: dragging stops at the maximum center-preserving docked width and does not itself change the effective presentation. Genuine viewport/container resize and explicit panel toggles remain the only presentation-transition paths. This is covered by FR-033/AC-034 and is classified as a local implementation defect against the existing bounded-resize design spine.
