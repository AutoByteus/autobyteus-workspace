# Design Spec — phone VNC Viewer: full screen in landscape, as large as possible

## Solution And Approval Basis

- Current solution revision ID: `SR-003` (SR-002 for ARCH-REV-001; SR-003 for implementation finding IMP-DI-001)
- Approved requirements: `requirements-doc.md` SR-001 (within the direction, user informed)
- User approval of the design: `Not required`
- Design status: `Ready`
- Investigation: `investigation-notes.md` L-01 … L-12 (L-05/L-06 corrected)
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, root `DESIGN.md`, `TESTING.md`

## Current-State Read

The phone viewer's full screen is a route state (`full=1`, owner `useMobileNavigation`, L-03); `MobileNodeDesktop` hides its bars and shows a handle in Control (L-02); View only zoom is a CSS transform of the stage (L-04). The page talks to the Android app through the existing `ShellBridge` (`window.AutoByteusShell`, web messages accepted only from the node's main frame, one web owner `shellBridge.ts`; L-11). The app has no orientation request or bar hiding yet (L-05); rotation keeps the page (415) and insets follow the visible bars (277, L-07).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium` — one Android controller and one new message on the existing shell bridge; one web composable for the shell/browser full screen; `MobileNodeDesktop` and `useNodeDesktopZoom` changes; tests on the emulator and in a browser.
- Architectural risk: `High` — a new message in the page↔app contract (ShellBridge) and Android window/orientation lifecycle.
- Escalation trigger: the back gesture unusable in immersive mode; an orientation request recreating the activity; the bridge accepting the new message from anything but the node's main frame.

## Intended Change

A new shell-bridge message `{ type: 'desktopFullScreen', on }` (main frame and node origin only, like every bridge message) lets the page ask the Android app for "desktop full screen" (sensor landscape + hidden system bars) and give it back. The page sends it from one owner that follows the route's `full=1`; without the app it uses the browser's full screen. View only gains Fill by double tap.

## Change Scope (Mandatory)

- In scope: UC-001…003. Android: new `autobyteus-android/app/src/main/java/org/autobyteus/mobile/ui/DesktopFullScreenController.kt`; `web/ShellBridge.kt` (message `desktopFullScreen` in `ShellBridgeMessages.read`, `ShellBridgeAction.DesktopFullScreen(on)`, `Actions.onDesktopFullScreen(on)`); `MainActivity.kt` (own the controller; implement the action; reset rule D-2); `app/src/test/.../web/ShellBridgeMessagesTest.kt`. Web: `utils/remoteAccess/shellBridge.ts` (`desktopFullScreen(on)` on `ShellBridge`); new `autobyteus-web/composables/mobile/useDesktopFullScreenDisplay.ts`; `components/mobile/views/MobileNodeDesktop.vue` (call it; exit handle in both modes); `composables/mobile/useNodeDesktopZoom.ts` (Fill, double tap toggle); docs (`docs/android_mobile_access.md`, `autobyteus-android/README.md`, `autobyteus-web/docs/remote_access.md` phone desktop section).
- Derived consumers: the `ShellBridge` type gains `desktopFullScreen`; its existing callers (pairing, node list, scan) are unchanged.
- Left alone: iOS; `SystemBarInsets` (follows hidden bars by itself); 403 policies; Control zoom.
- Follow-ups: none.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ / AC | Path |
| --- | --- | --- |
| BEH-001/002 | REQ-001…003, 005; AC-001, 002, 004, 005 | DS-001 |
| BEH-003 | REQ-004; AC-003 | DS-002 |
| — | REQ-006; AC-006 | DS-001 (browser branch) |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`. Design issue: `No`. Triggers: Several kinds or forms (fires: Android app vs browser → one web owner with explicit branches decided by `getShellBridge() !== null`, then `document.fullscreenEnabled`); Capability-area reuse (fires: the existing ShellBridge carries the request — SR-001 had proposed a second `window.AutoByteusShell`, corrected in SR-002; route state `full=1` is the single source; insets owner unchanged). Refactor needed: `No`.

## Terminology

- **Desktop full screen:** the phone viewer's full screen (route `full=1`); in the Android app it also means landscape and hidden system bars.

## Legacy Removal Policy / Persisted Data

- Nothing removed; `Not Affected`.

## Data-Flow Spine Inventory

| Spine | Path | Owner |
| --- | --- | --- |
| DS-001 | `full screen button → useMobileNavigation.openDesktopFullScreen() (full=1) → MobileNodeDesktop watches desktopFullScreen → useDesktopFullScreenDisplay.apply(on) → [app] getShellBridge().desktopFullScreen(on) → postMessage {type:'desktopFullScreen', on} → ShellBridgeMessages.read (main frame + node origin, else ignored) → ShellBridge → Actions.onDesktopFullScreen(on) (MainActivity) → DesktopFullScreenController (UI thread): on = set SENSOR_LANDSCAPE, hide systemBars (transient by swipe), shell root background dark; off = UNSPECIFIED (the phone's own setting; the activity declares no orientation, pinned by a manifest test), show systemBars, root background back. "On" is read from the window state, so a recreated activity (process death keeps the requested orientation) starts consistent with the page (SR-003, implementation 9d8552563e) → configuration change (no recreate, 415) → insets listener re-pads (277) → page re-lays out → noVNC refits` ; [browser] `documentElement.requestFullscreen()` then `screen.orientation.lock('landscape')` — both rejections caught (a reload with `full=1` has no user activation, so `requestFullscreen` rejects: stay in the in-page full screen); `fullscreenchange` to none while `full=1` → `navigation.back()` | `useDesktopFullScreenDisplay` (web), `DesktopFullScreenController` (Android) |
| DS-002 | `double tap (View only) → useNodeDesktopZoom.toggleFill()` → Fill scale = cover ratio of the stage over the fitted picture (picture size from noVNC's canvas, aspect kept), centred; pan clamped to the picture; double tap again → Fit (scale 1) | `useNodeDesktopZoom` |

## Ownership Map

- `DesktopFullScreenController` (Android): the only owner of the activity's requested orientation, system-bar visibility and shell-root background for desktop full screen. `setOn(Boolean)` is idempotent; `reset()` = off = `SCREEN_ORIENTATION_UNSPECIFIED` (the phone's own setting). While on, the shell root's background is dark, so the display-cutout padding (kept by `SystemBarInsets`, e.g. 136 px on the left in landscape) blends with the stage instead of showing a light strip; drawing under the cutout stays out of scope (follow-up FU-001).
- `ShellBridge` (existing, autobyteus-417): gains message `{type:'desktopFullScreen', on:boolean}` → `ShellBridgeAction.DesktopFullScreen(on)` → `Actions.onDesktopFullScreen(on)`, under the same main-frame/origin rule (`ShellBridgeMessages.read:80-81`); a malformed `on` is ignored. `MainActivity` implements the action by calling `DesktopFullScreenController.setOn(on)` (the listener runs on the UI thread).
- **D-2 Reset rule (AR-432-002)** — owner `MainActivity`: the controller is reset (off) on every main-frame page start (`onPageStarted`, `:192`), whenever the activity shows anything but the open page — every `setContentView` other than the plain page at `:309` (i.e. `:159`, `:171`, `:186`, `:241` incl. the in-page node list from `onShowNodeList`, `:285`, `:329` page with diagnostic, `:346`) — and whenever it destroys the web host (`:150`, `:184`, `:320`). Implemented in one private method (e.g. `leavePage()`/`showScreen(view)`) that these paths call, not by scattered calls. Bars are re-applied in `onResume` only if AC-004 shows Android brought them back.
- `useDesktopFullScreenDisplay()` (web): the only caller; `apply(on)` chooses the branch by `getShellBridge() !== null` (app) or `document.fullscreenEnabled` (browser) or none (in-page only). Called by `MobileNodeDesktop` from a watcher on `desktopFullScreen` (immediate, so a reopened page with `full=1` applies it) and `apply(false)` on unmount.
- `MobileNodeDesktop.vue`: shows the exit handle in full screen in both modes (DEC-006); keeps the View only tap exit. **In Control full screen the top strip carries Keyboard, Clipboard and Show controls** (IMP-DI-001, AC-005): the same handle style, outside noVNC's canvas, existing labels and actions (keyboard bridge focus in the tap handler; Clipboard sheet), so typing and pasting work in landscape full screen without leaving it.
- `useNodeDesktopZoom`: Fill/Fit toggle on double tap (REQ-004).

## Removal / Decommission Plan (Mandatory)

None.

## Interface Boundary Mapping

| Interface | Subject | Shape |
| --- | --- | --- |
| Shell-bridge message `{ type: 'desktopFullScreen', on: boolean }` | the app's display state for desktop full screen | existing `AutoByteusShell` web-message object; web `shellBridge.ts` `desktopFullScreen(on)`; Android `ShellBridge.Actions.onDesktopFullScreen(on)` |
| `useDesktopFullScreenDisplay().apply(on)` | the page's request | web |

## Main Domain Subject Naming Check

`DesktopFullScreenController`, bridge message `desktopFullScreen`, `useDesktopFullScreenDisplay` — "desktop full screen" = the viewer's full screen (Terminology); does not clash with "node desktop".

## File Mapping

| File | Kind | Concern |
| --- | --- | --- |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/ui/DesktopFullScreenController.kt` | Add | orientation + bars |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/web/ShellBridge.kt` | Modify | message, action, `Actions.onDesktopFullScreen` |
| `autobyteus-android/app/src/test/java/org/autobyteus/mobile/web/ShellBridgeMessagesTest.kt` | Modify | new message accepted from the node's main frame; ignored from a subframe, another origin, a malformed `on` |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/MainActivity.kt` | Modify | own the controller; implement the action; reset rule D-2 in one method |
| `autobyteus-web/utils/remoteAccess/shellBridge.ts` | Modify | `desktopFullScreen(on)` |
| `autobyteus-web/composables/mobile/useDesktopFullScreenDisplay.ts` | Add | app/browser/in-page branches |
| `autobyteus-web/components/mobile/views/MobileNodeDesktop.vue` | Modify | watcher, exit handle in both modes |
| `autobyteus-web/composables/mobile/useNodeDesktopZoom.ts` | Modify | Fill toggle |
| Docs (`docs/android_mobile_access.md`, `autobyteus-android/README.md`, `autobyteus-web/docs/remote_access.md`) | Modify | behavior |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Page detects old app versions | N/A — app and node from one release (DESIGN.md rule 9); an older app ignores an unknown bridge message (`read` returns null) |
| A second `window.AutoByteusShell` (`@JavascriptInterface`) | Rejected (SR-002): collides with the existing bridge and would expose the call to every frame |

## Change Sequence

Android controller + bridge message (+ JVM test) + reset rule → web `shellBridge.desktopFullScreen` → web composable → view + zoom → docs → validation.

## Validation Plan

- Android unit/instrumented: `ShellBridgeMessagesTest` (accepted from the node's main frame; ignored from a subframe, another origin, malformed); controller idempotence; off sets `SCREEN_ORIENTATION_UNSPECIFIED` (the phone's own setting) and restores the root background, on is read from the window state (consistent after recreation); reset on page start and on each non-page screen (incl. the in-page node list).
- Web unit: `useDesktopFullScreenDisplay` branches (app present, browser fullscreen, none); watcher applies on mount with `full=1` and off on unmount; Fill/Fit toggle math (cover, centred, aspect kept); handle in both modes.
- Emulator (`autobyteus277_api35`, auto-rotate off; isolated node, test data): AC-001…AC-005 incl. back gesture in immersive mode, keyboard/Clipboard in landscape, pairing still working (bridge regression), and AC-002's in-page node list (opened from full screen's page) restoring portrait. API 34 too if cheap.
- Browser probe: AC-006. Permissions unchanged (AC-007).

## Guidance For Implementation

- Only `useDesktopFullScreenDisplay` sends `desktopFullScreen`; no second shell object. Never resize the desktop. Test nodes only; no screenshots of real desktops.
