# Investigation Notes — S3: node desktop on the phone and in a desktop browser

## Investigation Meta

- Package identifier: `node-desktop-on-phone` (Project Task `autobyteus-407`, slice S3 of autobyteus-394)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-on-phone`; branch `codex/node-desktop-on-phone`
- Resolved base: `origin/personal` @ `3bf9240d4229dc01012aa3bfd0819a971ab3b32a` (fetched 2026-11-06; includes S0, S1 and the mobile redesign autobyteus-277)
- Finalization target: `origin/personal`
- Bootstrap: worktree and ticket folder created; blocker: none
- Authorities read (this conversation): `references/requirements-engineering.md`, `ticket-scope.md`, `finding-the-cause.md`, `handoff.md`, `architecture-design.md`, `design-principles.md`, `project-documents.md`; root `DESIGN.md`, `TESTING.md`, `GLOSSARY.md`, `AGENTS.md` (re-read: test vault note)
- Parent evidence: autobyteus-394 investigation notes; S1 archive `/Users/normy/autobyteus_org/autobyteus-ticket-archives/node-desktop-through-node-server-405/tickets/done/node-desktop-through-node-server/`
- Status: complete for design (PRE-001 delivered by autobyteus-415, merge `9d5da23341`; worktree fast-forwarded to `origin/personal` `e427a0c9cf`)

## Task Direction

- Task autobyteus-407 and the user's comment (2026-11-06): "make the phone able to have the VNC as viewer as well, i think currently we have messages, files, artifact, etc. we could have VNC Viewer as well". S2 parked; S3 needs only S1.

## Findings

| ID | Source | Observation | Established | Implication |
| --- | --- | --- | --- | --- |
| S3-01 | `git log origin/personal --grep 277` | Mobile redesign merged (`562c7a2333`, beta.4); autobyteus-403 (Origin) and autobyteus-404 (phone deny) not merged | Read | Placement follows the new shell; if 404 lands, `/ws/node-desktop` must stay open to phones |
| S3-02 | `autobyteus-web/components/mobile/runScreen/MobileRunMenu.vue:44-50` | A run's ⋮ menu lists views `artifacts`, `files`, `messages` (Messages only when the run shows them), each opening a full-screen view | Read | The user's "we could have VNC Viewer as well" = a fourth entry in this menu |
| S3-03 | `autobyteus-web/composables/mobile/useMobileNavigation.ts:5-6,87`; `components/mobile/MobilePairedShell.vue:30-33` | `MobileScreen`/`MobileView` unions and `openView` push `?screen=<view>`; the paired shell renders one view component per screen; system Back walks view → run → list | Read | New screen value and view component follow the same owner |
| S3-04 | S1 web code (`components/workspace/tools/NodeDesktopTile.vue`, `composables/useVncSession.ts`, `utils/nodeDesktopClient.ts`) | Viewer pieces exist with mode, close-code states, visibility handling and the phone credential in the stream URL (`nodeDesktopStreamUrl(endpoints, mode, credential)`) | Read | Reuse on the phone |
| S3-05 | `autobyteus-android/app/src/main/java/org/autobyteus/mobile/web/WebFileChooserCoordinator.kt:20` | The WebView's `WebChromeClient` implements no `onShowCustomView`, so the HTML Fullscreen API cannot enter fullscreen in the Android WebView | Read | "Fullscreen" on the phone = the view fills the screen in the page (no Android change) |
| **S3-06** | `autobyteus-android/app/src/main/AndroidManifest.xml` (activity `.MainActivity`: no `android:configChanges`, no `screenOrientation`); `MainActivity.kt:38-67` (`onCreate` loads `savedNodeStore.loadSelectedEntry()` → `validateAndOpen(savedEntry, savedEntry.mobileUrl, …)`); no `onSaveInstanceState`/WebView `saveState`/`restoreState` anywhere in `app/src/main/java` | Android destroys and recreates an activity on rotation unless it declares the change in `configChanges` (platform behavior). Here a rotation therefore runs `onCreate` again, which opens the saved node's clean `/mobile` URL in a new WebView: **every rotation reloads the phone app and returns to the run list**, on any screen | Read (code + platform lifecycle); not yet reproduced on a device | **PRE-001**: landscape (REQ-014, AC-017) cannot work until the shell keeps its page across rotation |

- Reproduction to hand over: on the emulator AVD `autobyteus277_api35` (present on this Mac), pair the release APK with an isolated node, open any screen other than the run list, rotate (`adb emu rotate`), and observe the app back on the run list (and a second `GET /mobile/` in the node's access log).


## Findings After PRE-001 (resumed 2026-11-06)

| ID | Source | Observation | Established | Implication |
| --- | --- | --- | --- | --- |
| S3-07 | noVNC `core/rfb.js:1095-1130` (`dragViewport` handled before the View only check), `:1326-1440` (gesture handler: tap = click, drag, twodrag = scroll, pinch → remote zoom key), `:472` `sendKey(keysym, code, down)`, `core/input/keysymdef.js:672-673` `lookup(codepoint)`; `scaleViewport`/`clipViewport` give fit or 1:1 only | noVNC has no free zoom; viewport drag works in View only; keys can be sent by keysym | Read | View only zoom = page-level transform of the fitted picture (no input in View only); Control fitted; keyboard bridge via `sendKey` |
| S3-08 | `autobyteus-android/app/src/main/java/org/autobyteus/mobile/**` | No `onPause`/`onResume`/`pauseTimers` calls on the WebView | Read | MP-001: whether the page becomes hidden when the app is backgrounded must be verified on the emulator first |
| S3-09 | `autobyteus-web/stores/mobileNodeSessionStore.ts:91` (`nodeContext.bindNodeContext(entryId, serverBaseUrl)`); `utils/remoteAccess/authorizedTransport.ts:8` (`getActiveRemoteAccessCredential`); S1 `composables/useVncSession.ts:64-65` (bound endpoints + active credential in the stream URL) | The paired phone binds the window node context; S1's session already adds the phone credential | Read | `useVncSession` works in `/mobile` unchanged |
| S3-10 | S1 server: `src/api/websocket/node-desktop.ts` (authorize → validate → resolve → stream; viewer kind from `authorizeRemoteAccessWebSocket(req).mode`); `src/node-desktop/node-desktop-stream.ts` (close codes, one log line); `src/remote-access/services/remote-access-auth-service.ts:41-73` (`authorizeMobileCredential` → context with `deviceId`; revoked → 403 `REMOTE_ACCESS_DEVICE_REVOKED`; disabled → 403 `PHONE_ACCESS_DISABLED`); `api/websocket/remote-access-websocket-auth.ts` (`extractRemoteAccessWebSocketCredential`, `closeCodeByFailure`) | Admission and re-check can reuse the auth service and the close-code mapping | Read | Viewer registry for limits + 30 s re-check |
| S3-11 | S1 web: `components/workspace/tools/NodeDesktopTile.vue:176-245` (`openViewOnlyWhenReady`, `handleVisibilityChange`), `utils/nodeDesktopClient.ts:11-60` (`NodeDesktopMode`, `NodeDesktopViewerState`, `viewerStateForClose`, `fetchNodeDesktop`) | Visibility/reconnect policy lives in the tile | Read | Extract it to one owner used by the tile and the phone view (no copy) |
| S3-12 | `components/mobile/runScreen/MobileRunTargetView.vue:12,21,60-62` (`remoteView.remote` for a run on another node) | The run screen knows when the open run is remote | Read | Entry hidden for remote runs |

## Prerequisites

| ID | Finding | Blocks | Status |
| --- | --- | --- | --- |
| PRE-001 | S3-06: the Android shell reloads on rotation | REQ-014 landscape, AC-017 | Delivered: autobyteus-415, merge `9d5da23341` |
