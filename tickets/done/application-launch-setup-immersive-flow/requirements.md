# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)
Refined

## Goal / Problem Statement
Redesign the application open flow so host-managed launch setup is a clear pre-entry step and the post-entry experience is immediately app-first and immersive. The current page mixes application metadata, launch setup, entry gating, and the live app surface in one long host layout, which makes the setup form feel like the main experience instead of a prerequisite before entering the application.

## Investigation Findings
- The current `ApplicationShell.vue` always renders the page inside the standard host shell and vertically stacks four concerns in one page: app notice/banner, app metadata/details, `ApplicationLaunchSetupPanel`, and the pre-entry gate or live `ApplicationSurface`.
- `ApplicationShell.vue` no longer uses `appLayoutStore` or any immersive presentation state, even though `appLayoutStore` and `layouts/default.vue` still support `hostShellPresentation === 'application_immersive'`.
- Earlier immersive work already established a valid boundary pattern: `ApplicationShell.vue` owns page-level presentation state while the outer layout suppresses host chrome through `appLayoutStore`. That boundary still exists in code, but the current application page does not use it.
- The application-owned runtime orchestration ticket intentionally introduced a pre-entry host setup gate and explicitly allowed a “simple first-cut” behavior that can show the setup form on every launch, prefilled from saved values.
- User feedback now says that first-cut behavior is not good enough: the route should first feel like setup/configuration, and once the user enters the application, the UI should switch to immersive app usage rather than keeping setup in the primary page hierarchy.
- The current durable docs describe the flow `Applications card -> launch setup save -> Enter application -> iframe bootstrap -> app-owned run creation`, which matches the user’s requested configure-then-enter mental model but does not yet describe an immersive post-entry shell.
- Live local validation of Brief Studio showed that after `Enter application`, the in-app homepage can still expose host/bootstrap placeholder copy such as `Waiting for the host bootstrap payload…`, which means the reviewed flow still lacks an explicit post-click launch/bootstrap transition gate before the business homepage is revealed.

## Recommendations
- Keep host-managed launch setup as the authoritative pre-entry step, but give it its own setup-focused presentation rather than leaving it mixed with the live app view.
- Restore immersive app viewing after entry by reusing the existing `appLayoutStore` → `layouts/default.vue` host-shell suppression boundary.
- Treat the application route as a two-phase experience:
  1. `Setup phase`: configure/save required launch setup.
  2. `In-app phase`: once the user enters, show only the immersive application view plus minimal host escape/setup controls.
- Within the post-entry in-app phase, define an explicit immersive launch/bootstrap transition so host-owned loading/failure state stays outside the normal app homepage and the business surface is revealed only after bootstrap succeeds.
- Keep setup reachable after entry through a secondary host control, not as always-visible primary page content.
- Preserve the current app-owned runtime model: host setup saves defaults and ensures backend readiness, while actual runs are still created from inside the application.

## Scope Classification (`Small`/`Medium`/`Large`)
Medium

## In-Scope Use Cases
- Open an application from the catalog and land on a setup-focused pre-entry screen.
- Review or edit saved resource and launch defaults before entry.
- Save valid setup and enter the application.
- Enter the application when saved setup is already valid, using the same setup-first screen with prefilled values.
- After clicking enter, pass through an immersive launch/bootstrap loading state before the application homepage is revealed.
- Use the application in an immersive app-first surface after entry.
- Reopen launch setup/details from inside the immersive application view without making setup the default post-entry layout.
- Retry entering the application after a launch/bootstrap failure without losing the saved setup state.
- See launch/bootstrap failure remain in the launch/loading phase instead of appearing as normal app homepage content.

## Out of Scope
- Reworking backend application bootstrap protocols or iframe contract payloads.
- Changing how app-owned backends create or manage their own runs after entry.
- Redesigning unrelated application catalog/list browsing beyond the route-to-open/setup handoff.
- Introducing native OS fullscreen APIs or non-web window-management behavior.

## Functional Requirements
- `REQ-LAUNCH-IMM-001`: Opening an application route from the catalog must land on a setup-focused pre-entry host screen rather than immediately placing setup and the live application surface in one mixed primary layout.
- `REQ-LAUNCH-IMM-002`: The setup-focused pre-entry screen must show the authoritative host-managed launch setup form with saved values prefilled when available.
- `REQ-LAUNCH-IMM-003`: The setup-focused pre-entry screen must preserve explicit launch gating so the user can see whether entry is blocked, why it is blocked, and what must be saved before entry becomes available.
- `REQ-LAUNCH-IMM-004`: When required setup is valid and the user activates the enter action, the route must transition into an immersive app-first application view instead of keeping the setup form in the default visible hierarchy beneath or beside the app surface.
- `REQ-LAUNCH-IMM-005`: While the immersive application view is active, the outer host shell chrome must be suppressed or reduced through the authoritative host-layout boundary so the application canvas becomes the dominant surface.
- `REQ-LAUNCH-IMM-006`: The immersive application view must keep a minimal but clear host escape/control surface, represented by a very small setup/control trigger in the immersive chrome, that opens a compact host menu for secondary actions without restoring the current heavy default layout.
- `REQ-LAUNCH-IMM-007`: Launch setup must remain reachable after entry as a secondary host-managed surface opened from the minimal immersive trigger, and it must not stay permanently visible in the default immersive layout.
- `REQ-LAUNCH-IMM-007A`: Activating the minimal immersive trigger must reveal a host-managed side control panel/menu that exposes setup/details/actions while temporarily pushing or narrowing the application canvas instead of replacing immersive mode as the default resting state.
- `REQ-LAUNCH-IMM-007B`: That side control panel/menu must include an explicit `Exit application` action that closes the immersive application view and returns the user to the Applications list/panel.
- `REQ-LAUNCH-IMM-007C`: Choosing `Setup` / `Configure` from the side control panel/menu must open the configuration form inside that same side panel rather than restoring the old full-page mixed layout.
- `REQ-LAUNCH-IMM-007D`: The side control panel/menu should support horizontal resizing so the user can widen the panel enough to configure comfortably while keeping the application visible in the remaining canvas area.
- `REQ-LAUNCH-IMM-007E`: The side control panel/menu should behave like an inline expandable menu: clicking items such as `Details` or `Configure/Setup` should immediately expand their content directly below the selected item inside the same panel rather than navigating away or replacing the entire panel context.
- `REQ-LAUNCH-IMM-008`: The redesign must preserve the current host/application responsibility split: host setup persists resource/default selections and host launch ensures backend readiness, while the application itself still owns later run creation/orchestration inside the iframe.
- `REQ-LAUNCH-IMM-009`: The redesign must reuse or extend the existing authoritative immersive-layout boundary (`ApplicationShell.vue` page ownership plus `appLayoutStore` / `layouts/default.vue` shell suppression) rather than introducing direct page-to-layout internal coupling.
- `REQ-LAUNCH-IMM-010`: The in-app immersive view must continue to keep iframe/bootstrap lifecycle ownership inside `ApplicationSurface.vue`; the setup/immersive redesign must not pull iframe launch state into setup-form components.
- `REQ-LAUNCH-IMM-010A`: After the user activates `Enter application`, the user-visible lifecycle must include an explicit immersive launch/bootstrap transition between setup and app-ready viewing. During that transition, host-owned launch/bootstrap loading or failure UI must remain outside the normal app homepage, and the business surface must be revealed only after the existing bootstrap boundary succeeds.
- `REQ-LAUNCH-IMM-011`: The resulting route experience must not preserve the current long-lived mixed layout as a compatibility mode once the new setup-first / immersive-after-entry flow ships.

## Acceptance Criteria
- `AC-LAUNCH-IMM-001`: On first opening an application route, the user sees a setup-focused host screen with the launch setup form and entry gating, not a page that simultaneously reads as both configuration workspace and live application canvas.
- `AC-LAUNCH-IMM-002`: When saved setup is already valid, the setup-focused screen still appears first, but the enter action is immediately available without forcing redundant re-entry of values.
- `AC-LAUNCH-IMM-003`: If setup is incomplete, loading, dirty, or failed, the UI clearly communicates why entry is unavailable.
- `AC-LAUNCH-IMM-004`: After the user enters the application, the default visible experience is an immersive app-first view where the application canvas is the dominant surface and the setup form is no longer in the primary hierarchy.
- `AC-LAUNCH-IMM-005`: During immersive viewing, the outer host shell no longer remains a competing left-side navigation surface by default.
- `AC-LAUNCH-IMM-006`: The immersive view retains a minimal host control path through a small setup/control trigger.
- `AC-LAUNCH-IMM-006A`: Activating that small trigger opens a secondary side menu/panel that exposes setup/details/actions and temporarily pushes or narrows the application canvas, while closing it returns the application to the full immersive-dominant layout.
- `AC-LAUNCH-IMM-006B`: The side menu/panel includes an explicit exit action that returns the user to the Applications list/panel.
- `AC-LAUNCH-IMM-007`: Reopening setup/details from the immersive view works inside that side panel without losing the saved setup state or violating the app-owned runtime model.
- `AC-LAUNCH-IMM-007A`: The side panel can be widened horizontally enough for direct configuration work while the application remains visible in the remaining canvas area.
- `AC-LAUNCH-IMM-007B`: Selecting menu items such as `Details` or `Configure/Setup` expands their content inline beneath the clicked item inside the same panel, giving an immediate nested/disclosure feel instead of a separate page transition.
- `AC-LAUNCH-IMM-008`: Iframe/bootstrap behavior remains owned by `ApplicationSurface.vue` and is not reimplemented in the setup form path.
- `AC-LAUNCH-IMM-008A`: After the user clicks `Enter application`, the immersive experience first shows a launch/bootstrap transition state; normal app homepage content is not revealed while host bootstrap is still pending.
- `AC-LAUNCH-IMM-008B`: If bootstrap fails, the user remains in that launch/bootstrap transition failure state with retry/exit affordances instead of seeing homepage-level waiting-for-bootstrap content as the normal visible state.
- `AC-LAUNCH-IMM-009`: The final UX does not keep the current always-mixed host layout as a parallel long-lived default behavior.

## Constraints / Dependencies
- The design must build on the current `autobyteus-web` Applications shell, `ApplicationLaunchSetupPanel.vue`, `ApplicationSurface.vue`, `appLayoutStore.ts`, and `layouts/default.vue`.
- The earlier `application-owned-runtime-orchestration` ticket is the authoritative source for the current host/app responsibility split and must remain valid after this UX redesign.
- The earlier `application-bundle-agent-architecture-analysis` ticket remains authoritative that host bootstrap completes when the bootstrap envelope is delivered; this redesign must solve the UX leak without inventing a new backend/bootstrap protocol.
- The earlier `application-immersive-mode-refactor` ticket is no longer the exact implementation, but its immersive ownership concept remains reusable.
- The change should be a clean-cut replacement for the current mixed page experience, not a long-lived dual UX.
- Current docs and tests around `ApplicationShell.vue`, `ApplicationLaunchSetupPanel.vue`, and the Applications module will need updates to reflect the new flow.

## Assumptions
- The user wants the application route to begin in setup mode every time it is opened from the catalog, with saved values prefilled when available.
- The immersive application view should become the default entered state after successful setup.
- A very small setup/control trigger that opens a side panel/menu is the preferred shape for returning to setup/details, exposing an exit action, and leaving immersive mode.
- The side panel is expected to be usable for direct configuration work, so horizontal resizing should be part of the target UX.
- The existing `appLayoutStore` / `default.vue` immersive suppression contract is still the right authoritative boundary for host-shell suppression.

## Risks / Open Questions
- The user prefers the earlier immersive interaction pattern: a very small setup/control icon in immersive mode that opens a side panel/menu and pushes or narrows the app canvas temporarily.
- The side panel should contain menu items such as `Configure/Setup` and `Exit`, and `Configure/Setup` should render the form directly inside the panel.
- The panel should be horizontally resizable so users can expand it enough for comfortable editing without abandoning the immersive app context.
- The current localization bundle still contains strings for removed immersive-related components; implementation should avoid reviving stale concepts accidentally and should clean up or replace text intentionally.
- Existing tests currently assert the pre-entry gate and setup form live in the same page shell, so the redesign will require deliberate test rewrites rather than small wording tweaks.

## Requirement-To-Use-Case Coverage
- `REQ-LAUNCH-IMM-001` -> Setup-first route entry.
- `REQ-LAUNCH-IMM-002` -> Prefilled saved setup on entry.
- `REQ-LAUNCH-IMM-003` -> Clear blocked-entry feedback.
- `REQ-LAUNCH-IMM-004` -> Transition from setup to immersive application use.
- `REQ-LAUNCH-IMM-005` -> Suppressed host chrome during immersive viewing.
- `REQ-LAUNCH-IMM-006` -> Minimal host escape/control path.
- `REQ-LAUNCH-IMM-007` -> Reopen setup/details after entry.
- `REQ-LAUNCH-IMM-007A` -> Small trigger opens secondary side panel without making it the default state.
- `REQ-LAUNCH-IMM-007B` -> Exit action from the small control menu returns to Applications.
- `REQ-LAUNCH-IMM-007C` -> Configure action opens the form inside the same side panel.
- `REQ-LAUNCH-IMM-007D` -> Side panel is horizontally resizable.
- `REQ-LAUNCH-IMM-007E` -> Menu items expand inline inside the same panel.
- `REQ-LAUNCH-IMM-008` -> Preserve host/app runtime ownership split.
- `REQ-LAUNCH-IMM-009` -> Reuse authoritative immersive-layout boundary.
- `REQ-LAUNCH-IMM-010` -> Keep iframe/bootstrap ownership in `ApplicationSurface.vue`.
- `REQ-LAUNCH-IMM-010A` -> Add a distinct post-click launch/bootstrap transition before the business homepage is revealed.
- `REQ-LAUNCH-IMM-011` -> Clean-cut replacement of the mixed layout.

## Acceptance-Criteria-To-Scenario Intent
- `AC-LAUNCH-IMM-001` -> Verifies the route begins in a setup-focused state.
- `AC-LAUNCH-IMM-002` -> Verifies saved setup reduces friction without skipping setup-first presentation.
- `AC-LAUNCH-IMM-003` -> Verifies launch gating clarity.
- `AC-LAUNCH-IMM-004` -> Verifies immersive post-entry viewing.
- `AC-LAUNCH-IMM-005` -> Verifies host shell suppression.
- `AC-LAUNCH-IMM-006` -> Verifies minimal host controls remain reachable.
- `AC-LAUNCH-IMM-006A` -> Verifies the small trigger opens the secondary side panel and closing it restores immersive dominance.
- `AC-LAUNCH-IMM-006B` -> Verifies exit from the panel returns to Applications.
- `AC-LAUNCH-IMM-007` -> Verifies setup/details remain reachable after entry.
- `AC-LAUNCH-IMM-007A` -> Verifies the panel can widen enough for direct configuration work.
- `AC-LAUNCH-IMM-007B` -> Verifies panel items expand inline below the clicked menu item.
- `AC-LAUNCH-IMM-008` -> Verifies iframe/bootstrap ownership stays intact.
- `AC-LAUNCH-IMM-008A` -> Verifies the user sees an immersive launch/bootstrap transition instead of the business homepage while bootstrap is pending.
- `AC-LAUNCH-IMM-008B` -> Verifies bootstrap failure remains in the transition state rather than leaking into the homepage experience.
- `AC-LAUNCH-IMM-009` -> Verifies the old mixed layout is removed as default behavior.

## Approval Status
Approved by user in-thread on 2026-04-22; refined on 2026-04-23 via live-validation feedback about post-click launch/bootstrap gating; proceed to revised design/architecture review.
