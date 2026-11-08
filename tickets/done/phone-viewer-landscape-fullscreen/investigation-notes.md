# Investigation Notes — phone VNC Viewer: full screen in landscape, as large as possible

## Investigation Meta

- Package identifier: `phone-viewer-landscape-fullscreen` (Project Task `autobyteus-432`)
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-landscape-fullscreen`, branch `codex/phone-viewer-landscape-fullscreen`, base `origin/personal` @ `eebbc2b8eed0e83cd3627298d8a7abec19c7d02f` (fetched 2026-11-08; latest tags v1.5.12-beta.7, beta.8); finalization target `origin/personal`
- Authorities read (this conversation): requirements-engineering, ticket-scope, finding-the-cause, handoff, architecture-design, design-principles, project-documents; root `DESIGN.md`, `TESTING.md`, `GLOSSARY.md`, `AGENTS.md`
- Earlier evidence: S3 archive `/Users/normy/autobyteus_org/autobyteus-ticket-archives/node-desktop-on-phone-407/tickets/done/node-desktop-on-phone/`; 415 archive `/Users/normy/autobyteus_org/autobyteus-ticket-archives/android-keep-page-on-rotation-415/tickets/done/android-keep-page-on-rotation/`

## Task Direction

- The user (2026-11-08): portrait shows a small picture with bars; landscape looks much better; "when the user clicks full screen, it automatically goes into full screen mode and then automatically switches the phone to landscape on Android?"; asked about permissions and fitting without distortion. Comment: "If this experience can be provided can you just dedicate the task to the software engineering team" (dispatch; no Product Team requested).

## Findings

| ID | Source | Observation | Established | Implication |
| --- | --- | --- | --- | --- |
| L-01 | User screenshots (Task context `28.jpg`, `29.jpg`) | Portrait: toolbar (←, title, Keyboard, Clipboard, Control, full screen) + status line, picture ~1/4 of the height. Landscape full screen: no app bars, but **Android's status bar (top) and gesture bar (bottom) still take space**, picture 16:9 with black bars left and right (phone ≈ 20:9) | Read (images) | Landscape alone is not "as large as possible": Android's bars must be hidden too (immersive mode) |
| L-02 | `autobyteus-web/components/mobile/views/MobileNodeDesktop.vue:5-110` | Full screen hides the screen bar and status line; picture stage fills the rest; Control shows a top handle "Show controls"; View only exits on a single tap; status text shown when disconnected | Read | Exit controls exist; View only has no visible one |
| L-03 | `autobyteus-web/composables/mobile/useMobileNavigation.ts:9-10,37,57,93` | Full screen is the route key `full=1` (`desktopFullScreen`), Back pops it first | Read | The full-screen state has one owner the shell signal can follow |
| L-04 | `autobyteus-web/composables/mobile/useNodeDesktopZoom.ts:19-60,132` | View only: CSS transform of the stage, scale 1–4, pan clamped to the stage, double tap resets to scale 1 | Read | A "fill" step (cover the stage, no distortion) fits here; Control stays at scale 1 (noVNC coordinates, S3 DEC-S3-3) |
| L-05 | `autobyteus-android/app/src/main/java/org/autobyteus/mobile/**` (`grep requestedOrientation|WindowInsetsControllerCompat`) | No orientation request; no system-bar hiding. **Corrected (SR-002):** the first search looked only for `addJavascriptInterface` and wrongly concluded there is no page→app bridge — there is one (L-11) | Read | The display request goes through the existing bridge |
| L-06 | `web/AutoByteusWebView.kt:26-27,61` | The WebView registers the existing `ShellBridge` (L-11). **Corrected (SR-002):** no new interface is added; the bridge already accepts only the node's main frame | Read | — |
| L-11 | `web/ShellBridge.kt:14-66` (`WebViewCompat.addWebMessageListener`, object `AutoByteusShell`, `ShellBridgeMessages.read` accepts a message only if `isMainFrame` and the source origin is the entry's origin, `:80-81`; `Actions`: `nodeCount`, `deviceName`, `onPaired`, `onShowNodeList`, `onStartScan`); `MainActivity.kt:179-192` (`openPage` builds `ShellBridge(entry, bridgeActions)`), `:212` (actions); web `utils/remoteAccess/shellBridge.ts:6-75` (one owner: `getShellBridge()` → `hello`, `paired`, `showNodeList`, `startScan`; `readShellObject` requires `postMessage` and `addEventListener`); JVM test `app/src/test/java/org/autobyteus/mobile/web/ShellBridgeMessagesTest.kt` | The page↔app bridge exists (autobyteus-417), main-frame and origin limited | Read | Add one message `desktopFullScreen` to it; a second `window.AutoByteusShell` would collide and break pairing |
| L-12 | `MainActivity.kt` screen switches: `setContentView` at `:159` (connecting), `:171` (CantReach), `:186` (connected), `:241` (start/list via `renderList`, incl. the in-page node list from `onShowNodeList`), `:285` (scan), `:309` (web page), `:329` (web page with diagnostic), `:346` (`showUpdateWebView`); web host destroyed at `:150` (`onDestroy`), `:184` (`openPage`), `:320` (`closePage`); `onPageStarted = {}` at `:192`; `onResume` `:110`, `onPause` `:115` | Every place the activity leaves the open page | Read | Reset rule (design D-2) |
| L-07 | `AndroidManifest.xml` (415: `configChanges` incl. orientation); `ui/SystemBarInsets.kt` (insets of systemBars, cutout, ime padded on the root) | Requesting an orientation does not recreate the activity; when system bars are hidden their insets become 0, so the root padding shrinks and the page grows | Read | Fits 415/277 without changes there |
| L-08 | Android platform | `setRequestedOrientation(SCREEN_ORIENTATION_SENSOR_LANDSCAPE)` turns the screen to landscape (either side by the sensor) even when the user's auto-rotate is off — what games do; `SCREEN_ORIENTATION_UNSPECIFIED` returns control to the system/user setting. `WindowInsetsControllerCompat.hide(systemBars())` with `BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE` hides bars until a swipe. Neither needs a permission | Read (platform docs) | No new permission |
| L-09 | Browsers | In a phone or desktop browser (`/mobile` without the app), the HTML Fullscreen API exists; `screen.orientation.lock('landscape')` works only in fullscreen (Chrome Android) | Read | Without the app bridge, use the browser's fullscreen and try the lock |
| L-10 | `git log eafc34b185..HEAD` for the phone viewer and Android | Since S3: Clipboard sheet in Control (426 D-05), reopen after Android ends the app in the background (426 D-03), blob: preview frame (426 D-07), share not re-run on recreation | Read | Restoring a killed app with `full=1` re-enters full screen; the shell signal must follow the page state on load |

## Supplemental Artifact Inventory

| Path | Purpose |
| --- | --- |
| Task context `28.jpg`, `29.jpg` | The user's portrait/landscape screenshots (his own node; not copied into the ticket) |
