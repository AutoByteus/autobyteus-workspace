# Requirements Doc

Write this artifact to a canonical file path in the assigned task workspace before any handoff message.

## Status (`Draft`/`Design-ready`/`Refined`)
Design-ready

## Goal / Problem Statement
Refactor the launched application experience so Application mode feels immersive and app-first. When a live application session exists, the bundled application surface should dominate the window and stop feeling like a host dashboard with an embedded app panel. Host chrome must shrink to a very small escape/control surface so the user feels fully inside the launched application while still being able to exit immersive mode, switch to Execution mode, and reach operational actions when needed.

## Investigation Findings
- The product docs for `autobyteus-web` already describe Application mode as app-first with minimal host chrome and a near-full-screen canvas.
- The current implementation is drifted from that target: `ApplicationShell.vue` still renders a large live-session host card above the application surface, `ApplicationSurface.vue` constrains the iframe area with a reduced viewport height, and `default.vue` keeps the left host shell visible beside the application.
- User testing of Brief Studio confirms that the current live-session page still feels like the host platform with an embedded app rather than feeling like the user is inside the launched app.

## Recommendations
- Make immersive Application mode the default live-session presentation.
- Keep only a minimal always-available host escape/control surface in immersive mode.
- Move non-primary operational actions and metadata behind secondary surfaces instead of leaving them above the app canvas.
- Make the surrounding host shell yield visually to the application while immersive mode is active.
- Preserve Execution mode as the explicit host-native operational view.

## Scope Classification (`Small`/`Medium`/`Large`)
Medium

## In-Scope Use Cases
- Launch an application and land in an immersive app-first surface by default.
- Continue viewing an already-live application session in immersive Application mode.
- Exit immersive mode through a minimal host control while staying on the application page.
- Switch from immersive Application mode into Execution mode.
- Access operational actions (details, relaunch, stop session) without reintroducing heavy host chrome in the default immersive state.
- Ensure the application surface uses the available window area more completely than today.
- Reduce or suppress competing host navigation chrome while immersive mode is active.

## Out of Scope
- Changing the backend application session model.
- Redesigning the application iframe bootstrap contract.
- Rebuilding Execution mode into a new workspace architecture.
- Adding OS-level fullscreen APIs or true native fullscreen window management as part of this refactor.
- Redesigning the application catalog/list pages.

## Functional Requirements
- `REQ-IMM-001`: When an application session is active and the user is in Application mode, the default presentation must be immersive and app-first rather than a host-management page with a large session header above the app canvas.
- `REQ-IMM-002`: Immersive Application mode must provide a minimal always-available escape/control surface that lets the user leave the immersive view without materially disrupting the app-first feeling.
- `REQ-IMM-003`: The immersive control surface must preserve a clear switch into Execution mode, and switching to Execution mode must return the user to a host-native operational surface.
- `REQ-IMM-004`: Operational actions required for a live application session (for example details, relaunch, stop session) must remain reachable, but they must not occupy the primary default visual hierarchy of immersive Application mode.
- `REQ-IMM-005`: The application surface container must expand to use the available layout area appropriately for immersive mode rather than remaining constrained by the current dashboard-like vertical sizing.
- `REQ-IMM-006`: While immersive Application mode is active, surrounding host shell chrome must no longer remain a competing default visual surface beside the app canvas.
- `REQ-IMM-007`: Exiting immersive mode or switching to Execution mode must restore the appropriate host-native shell presentation without losing the bound live application session.

## Acceptance Criteria
- `AC-IMM-001`: With a live application session open in Application mode, the default visible host chrome is reduced to a minimal control surface and no large host session card remains above the application canvas.
- `AC-IMM-002`: The user can exit the immersive view through a clearly discoverable minimal control without navigating away from the application page or terminating the session.
- `AC-IMM-003`: Switching from Application mode to Execution mode restores the host-native execution view and does not strand the user in the immersive presentation.
- `AC-IMM-004`: Relaunch / stop / details remain accessible from the live-session experience without restoring the previous heavy dashboard layout as the default state.
- `AC-IMM-005`: The launched application surface occupies materially more of the available page/window area than the current implementation and visually reads as the dominant primary surface.
- `AC-IMM-006`: During immersive Application mode, the surrounding shell no longer leaves large competing navigation areas visible beside the app surface by default.
- `AC-IMM-007`: Leaving immersive mode restores the normal host shell presentation for the application page without rebinding or losing the current session.

## Constraints / Dependencies
- The refactor must fit the current frontend architecture around `ApplicationShell.vue`, `ApplicationSurface.vue`, the default layout, and existing stores/composables unless design investigation proves a better authoritative boundary is needed.
- The change must remain aligned with the current backend-owned one-live-session-per-application model.
- The design should be a clean-cut target behavior, not a fallback-heavy dual UX.
- The implementation should restore coherence with the documented “Application mode is app-first” contract in `autobyteus-web/docs/applications.md`.

## Assumptions
- Immersive mode should be the default whenever a live session is shown in Application mode.
- Execution mode remains the primary place for host-native retained-state inspection and operational monitoring.
- Minimal host controls can be represented as compact overlay or slim-shell UI rather than a full page header.
- Desktop layout behavior is the primary target; mobile-specific adjustments may remain limited unless current implementation constraints demand more.

## Risks / Open Questions
- Whether immersive mode should fully hide the host left shell or collapse it to a zero-competition minimal state controlled by the layout.
- Whether the minimal control surface should be always visible or partially reveal on hover/focus while still staying reliably discoverable.
- Whether existing tests or screenshots assume the current host card and will need broad updates.

## Requirement-To-Use-Case Coverage
- `REQ-IMM-001` -> Launch or reopen a live app into an immersive surface.
- `REQ-IMM-002` -> Exit immersive mode through minimal host controls.
- `REQ-IMM-003` -> Switch from Application mode to Execution mode.
- `REQ-IMM-004` -> Reach relaunch / stop / details from immersive mode.
- `REQ-IMM-005` -> Use the available window area more completely.
- `REQ-IMM-006` -> Reduce competing host-shell presence during immersive mode.
- `REQ-IMM-007` -> Restore normal shell when leaving immersive mode.

## Acceptance-Criteria-To-Scenario Intent
- `AC-IMM-001` -> Verifies removal of the heavy live-session host header in default immersive mode.
- `AC-IMM-002` -> Verifies the user can safely leave immersive mode.
- `AC-IMM-003` -> Verifies Application vs Execution mode separation remains coherent.
- `AC-IMM-004` -> Verifies operational actions remain reachable without dominating the UI.
- `AC-IMM-005` -> Verifies the app canvas becomes the dominant surface.
- `AC-IMM-006` -> Verifies the shell no longer competes visually with the app by default.
- `AC-IMM-007` -> Verifies immersive exit restores normal host presentation while preserving the live session.

## Approval Status
Pending user review.
