# VNC Fullscreen Auto-Fit Implementation Plan

## Goal

When user enters maximize mode in VNC viewer, remote desktop should fill the available area like TigerVNC whenever server supports remote resize. If remote resize is unavailable, gracefully fall back to current fit behavior.

## Scope Classification

- Classification: Small-to-Medium
- Reason: Primarily frontend (`useVncSession`, `VncHostTile`) but changes noVNC runtime behavior and user interaction defaults.

## Preconditions

- VNC runtime uses Xvnc stack with dynamic size support (`SetDesktopSize`/RandR).
- Server setting points to correct VNC endpoint.

## Current Constraints

- `resizeSession` is currently disabled.
- noVNC will not request remote resize in `viewOnly` mode.
- Current maximize mode only changes layout; it does not negotiate remote framebuffer size.

## Recommended Behavior

1. Enter maximize:
   - Enable remote resize attempt (`resizeSession = true`).
   - Keep `scaleViewport = true` as fallback.
   - Temporarily force interactive mode if needed for resize request.
2. During maximize + resize events:
   - Trigger viewport refresh and remote resize request.
3. Exit maximize:
   - Restore pre-maximize interaction mode and baseline session options.

## File Changes

1. `/Users/normy/autobyteus_org/autobyteus-web/composables/useVncSession.ts`
   - Add explicit API for fullscreen-fit mode transitions.
   - Manage `resizeSession`, `scaleViewport`, and temporary interactive override.
   - Keep fallback safe when server ignores resize requests.
2. `/Users/normy/autobyteus_org/autobyteus-web/components/workspace/tools/VncHostTile.vue`
   - Call new session APIs on maximize enter/exit.
   - Keep current toolbar auto-hide UX.
3. Optional:
   - Add lightweight UI hint when fallback mode is active.

## Acceptance Criteria

1. On Xvnc host, maximize mode removes top/bottom black bars after resize settles.
2. On fixed-resolution host, app does not break; it keeps fit-with-bars fallback.
3. Exiting maximize restores previous interaction mode and remains stable.
4. No regressions in connect/disconnect or existing maximize toolbar behavior.

## Validation Plan

1. Manual test on dynamic-resize host (Xvnc):
   - Connect, maximize, verify remote resolution changes and bars disappear.
2. Manual test on fixed-resolution host (Xvfb + x11vnc):
   - Connect, maximize, verify fallback still usable.
3. Targeted Nuxt test run for affected workspace layout/tooling suites.

## Risks

1. Forcing interactive mode in maximize could surprise users if not restored correctly.
2. Some VNC servers may partially support resize and cause transient flicker.
3. Teleport + noVNC DOM behavior is harder to unit test; rely on manual verification for final UX gate.
