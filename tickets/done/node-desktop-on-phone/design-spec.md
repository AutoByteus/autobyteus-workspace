# Design Spec — S3: node desktop on the phone and in a desktop browser

## Solution And Approval Basis

- Current solution revision ID: `SR-002` (ARCH-REV-001: AR-S3-001 … AR-S3-008)
- Approved requirements: `requirements-doc.md` SR-001 (user: parent requirements and placement; details DEC-S3-1 … 8 within the direction, user informed)
- User approval of the design: `Not required`
- Design status: `Ready`
- Investigation: `investigation-notes.md` S3-01 … S3-12; parent evidence (autobyteus-394, S1 archive)
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, root `DESIGN.md`, `GLOSSARY.md` (node desktop), `TESTING.md`
- Conflicts: none

## Current-State Read

- Server (S1): `/ws/node-desktop` authorizes with the shared policy, validates `mode`, resolves the node desktop and starts a `NodeDesktopStream` (S3-10). Phones are admitted by credential at connect only; nothing counts streams.
- Web (S1): `useVncSession` (noVNC session, mode, close-code state) works with the bound node endpoints and the phone credential (S3-09); the visibility/reconnect policy lives in `NodeDesktopTile.vue` (S3-11); `nodeDesktopClient.ts` owns the client contract.
- Phone (autobyteus-277): run ⋮ menu → `openView(view)` → `?screen=<view>` → `MobilePairedShell` renders the view (S3-02, S3-03). The run screen knows a remote run (S3-12).
- Android: rotation kept (415); no HTML fullscreen (S3-05); page visibility on background unverified (MP-001, S3-08).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large` — server viewer registry (limits, periodic re-check) and route change; client contract (new state); one shared connection-policy composable extracted from the S1 tile; new phone view with zoom/pan gestures and a keyboard bridge; menu, navigation and shell wiring; localization; docs; tests across server, web, browser probe and Android emulator.
- Architectural risk: `High` — security behavior (live revocation cut-off), new concurrency/lifecycle owner (registry + timer), contract addition (close code 4429), touch input handling on the View only boundary's client side, Android WebView lifecycle premise (MP-001).
- Escalation trigger: MP-001 false; noVNC coordinates wrong under the View only transform after switching to Control; a phone credential re-check affecting other routes.

## Architecture Investigation Evidence

| Source | Observation | Decision |
| --- | --- | --- |
| S3-07 | noVNC: fit or 1:1 only; drag viewport in View only; `sendKey` + keysym lookup | D-S3-4 zoom, D-S3-5 keyboard |
| S3-09 | Session works in `/mobile` | Reuse `useVncSession` |
| S3-10 | Auth service and close-code mapping reusable | D-S3-1 registry |
| S3-11 | Visibility policy in the tile | D-S3-3 extract |
| S3-02/03/12 | Menu/view pattern; remote run known | D-S3-2 entry |
| S3-05/08 | No HTML fullscreen; background premise | D-S3-6, MP-001 |

## Intended Change

Add a **VNC Viewer** phone view reachable from a run's ⋮ menu (on nodes that have a desktop, for runs on the paired node), built on S1's session and on one shared connection policy, with View only zoom/pan, a Control mode with a keyboard bridge and in-page full screen. On the server, a per-node viewer registry admits streams within limits and re-checks open phone streams every 20 s (non-overlapping; cut-off ≤ 25 s).

## Change Scope (Mandatory)

- In scope: UC-002, UC-003 (phone), UC-006 (phone). Areas: `autobyteus-server-ts/src/node-desktop/` (new `node-desktop-viewers.ts`; `node-desktop-stream.ts` public close + end notification), `src/api/websocket/node-desktop.ts` (admission step), `src/remote-access/domain/remote-access-close-codes.ts` (the failure → close mapping, moved from `src/api/websocket/remote-access-websocket-auth.ts`, which imports it); web `utils/nodeDesktopClient.ts` (4429 state), new `composables/useNodeDesktopConnection.ts` (extracted from the tile), `components/workspace/tools/NodeDesktopTile.vue` (uses it; shows the new state), `composables/useVncSession.ts` (key sending API), new `composables/mobile/useNodeDesktopZoom.ts`, new `components/mobile/views/MobileNodeDesktop.vue`, `composables/mobile/useMobileNavigation.ts` (`desktop` screen/view), `components/mobile/runScreen/MobileRunMenu.vue` + `MobileRunTargetView.vue` (entry), `components/mobile/MobilePairedShell.vue` (render), new `composables/useNodeDesktopAvailability.ts`, `types/novnc.d.ts` (`sendKey`), localization (en, zh-CN); docs `autobyteus-web/docs/remote_access.md`, `autobyteus-server-ts/docs/modules/node_desktop.md`.
- Derived consumers: `viewerStateForClose` gains `too-many`; both clients map it (tile + phone view). `MobileScreen`/`MobileView` unions gain `desktop`; `back()` parent mapping covers it (`screen: 'run'`).
- Deliberately left alone: Android shell code (unless MP-001 fails → prerequisite); the shared Remote Access policy for other routes; iOS; S2 images.
- Follow-ups: none new.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ / AC | Trigger | Change | Spine |
| --- | --- | --- | --- | --- |
| BEH-003 | REQ-014, 015, S3-1…S3-4; AC-017, 018, S3-1, S3-2 | ⋮ → VNC Viewer | New phone view | DS-S3-1 |
| BEH-008 | REQ-009; AC-012 | Revoke / disable | Registry re-check closes the stream | DS-S3-3 |
| BEH-S3-1 | REQ-019; AC-021 | Stream open | Registry admission | DS-S3-2 |
| — | REQ-016; AC-019 | Background | Shared connection policy | DS-S3-1 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`. Design issue: `Yes` (small) — the S1 tile owns the connect/visibility/reconnect policy that the phone view needs too. Triggers: Repeated coordination (fires → extract `useNodeDesktopConnection`, Principle 13); Capability-area reuse (fires → auth service, close mapping, session, availability); Several kinds or forms (fires → trusted-network, loopback and phone viewers in admission: only phones have an identity and a credential to re-check; both clients map 4429); Behavior by absence (checked → entry visibility is an explicit availability answer, not a failed connect). Root cause: `Duplicated Policy Or Coordination` (avoided by extraction). Refactor needed now: `Yes` (extract the policy before adding the phone view).

## Terminology

- **Node desktop**, **viewer**, **mode** as in GLOSSARY / S1. **Viewer registry:** the node's list of open desktop streams. UI name on the phone: "VNC Viewer" (the tab's name in the desktop app).

## Legacy Removal Policy (Mandatory)

- Removed: the tile's own visibility/reconnect code (moved, not copied); remote_access.md "Phase One removes … VNC" text. Compatibility kept: `None`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

`Not Affected` (registry is in memory).

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-S3-1 | Primary | User taps ⋮ → VNC Viewer on the phone | Desktop shown; stream ends on leave/background | `MobileNodeDesktop` + `useNodeDesktopConnection` + `useVncSession` |
| DS-S3-2 | Primary (server) | Stream request | Admitted (stream) or refused 4429 | `NodeDesktopViewers` |
| DS-S3-3 | Bounded local (server) | 30 s tick | Revoked phone streams closed | `NodeDesktopViewers` |
| DS-S3-4 | Bounded local (client) | Touch / wheel in View only | Picture transform | `useNodeDesktopZoom` |

## Primary Execution Spine(s)

DS-S3-1: `MobileRunMenu (entry shown if useNodeDesktopAvailability().available && !remote) → useMobileNavigation.openView('desktop') → MobilePairedShell → MobileNodeDesktop → useNodeDesktopConnection (connect View only when visible) → useVncSession → /ws/node-desktop?mode=view&access_token=… → [server DS-S3-2] → Xvnc`

DS-S3-2 (AR-S3-004): `route: authorize → validate → resolve → construct NodeDesktopStream (no TCP yet) → NodeDesktopViewers.admit(viewer, stream) — the registry subscribes to the stream's end → refused: the route closes the socket with 4429 NODE_DESKTOP_TOO_MANY_VIEWERS and never calls start() (no TCP) | admitted: stream.start() → a rejected re-check calls stream.close(code, reason) → the end notification removes the entry`

## Spine Narratives (Mandatory)

| Spine | Narrative |
| --- | --- |
| DS-S3-1 | The entry appears only when the paired node answers `{ available: true }` and the open run is not remote. The view opens View only and fitted; the shared connection policy disconnects when the page is hidden and reconnects in View only when visible. Pinch/drag/double-tap transform the picture in View only; the Control switch reconnects in Control, resets the zoom and shows Keyboard. Full screen hides the bars. |
| DS-S3-2 | After S1's three steps, the registry counts open streams (all kinds, node-wide max 4) and phone streams per `deviceId` (max 2); a refusal closes the socket before any TCP connection. The stream notifies its end; the registry forgets it. |
| DS-S3-3 | While any phone stream is open, the registry runs one re-check cycle every **20 s** (AR-S3-005): a `setTimeout` (`unref`'d) scheduled only after the previous cycle has finished, so cycles never overlap. A cycle calls `authorizeMobileCredential(credential)` for each phone stream (a local store lookup) with a 5 s timeout per call; a rejection closes that stream with the mapped code and reason (4401/4403, e.g. `REMOTE_ACCESS_DEVICE_REVOKED`); a timeout leaves the stream and retries next cycle. Bound: a revocation is detected at most 20 s + one cycle (≤ 5 s) later, i.e. ≤ 25 s < 30 s. The timer stops when no phone stream remains and on app close. Known effect: each successful check updates the device's `lastSeenAt` (correct: the phone is in use). |
| DS-S3-4 | View only: a gesture layer above the canvas turns two-finger pinch into scale (1×–4×) around the pinch centre, one-finger drag into pan (clamped to the picture), double tap and Fit into scale 1, and a single tap in full screen into "show controls"; Ctrl+wheel (trackpad pinch in desktop browsers) zooms. In Control the layer is removed and scale is 1, so noVNC receives touches with correct coordinates; full screen then shows a small handle at the top edge (outside noVNC's canvas element, so a tap there is never sent to the desktop) that brings the controls back (AR-S3-003). The system Back key leaves full screen first: full screen is a route state (`?screen=desktop&full=1`, written only by `useMobileNavigation`), so Back pops it before leaving the view. |

## Ownership Map

- `NodeDesktopViewers` (`src/node-desktop/node-desktop-viewers.ts`, one per server, created with the route): admission limits, the open-stream list (stream, kind, deviceId, credential in memory only), the re-check cycle, removal on the stream's end notification. Uses `RemoteAccessAuthService` and the close mapping in `src/remote-access/domain/remote-access-close-codes.ts` (moved there from `api/websocket/remote-access-websocket-auth.ts`, which then imports it; AR-S3-006). Never logs the credential.
- `NodeDesktopStream` (S1): gains a public `close(close)` (used by the registry) and an end notification the registry subscribes to at admission; it is constructed before admission and opens TCP only in `start()`.
- WS route: adds the admission step and passes the auth context and `extractRemoteAccessWebSocketCredential(req)` for phones.
- `useNodeDesktopConnection(session)` (web): when to connect/disconnect — mount, `visibilitychange`, Reconnect, mode switch; always View only after a reconnect (S1 D-10). Used by `NodeDesktopTile` and `MobileNodeDesktop`.
- `useNodeDesktopAvailability()` (web): **the one owner** of client-side availability (AR-S3-007) — one cached `fetchNodeDesktop` per bound node; `VncViewer` (desktop app) and the phone run screen both use it; `VncViewer`'s own fetch is removed.
- `useNodeDesktopZoom(layer, picture)` (web, mobile): View only gestures → CSS transform; reset.
- `useVncSession` (S1): gains `typeText(text)` and `pressKey('Enter'|'Backspace'|'Tab')`, acting only in `control`. It owns the codepoint → keysym mapping itself (AR-S3-001; noVNC's package exports only `core/rfb.js` and the contract test forbids deep imports): codepoints 0x20–0x7E and 0xA0–0xFF map to themselves; any other codepoint to `0x01000000 | codepoint` (X11's Unicode keysyms); Enter `0xFF0D`, Backspace `0xFF08`, Tab `0xFF09`; each sent as down then up with the public `rfb.sendKey(keysym, null, down)`. `switchMode` opens the new connection only after the old socket's `close` event, so a mode switch at the limit is not refused with 4429 (residual risk from the review).
- `MobileNodeDesktop.vue`: the phone view — screen bar (←, "VNC Viewer", status, View only/Control switch, Keyboard in Control, Fit, Full screen), the picture, the full-screen handle, the hidden keyboard input, state messages.
- Keyboard bridge (in `MobileNodeDesktop.vue`, AR-S3-002): a visually hidden `<textarea>` with `autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" inputmode="text"`; `focus()` is called inside the Keyboard tap handler (Android opens the soft keyboard only from a user gesture). Typing is read from the textarea's **value**, never from `keydown` (Android soft keyboards report `Unidentified`/229): on each `input` event the new value is diffed against the last one — removed characters → `pressKey('Backspace')` × n, added characters → `typeText(added)` with `\n` → `pressKey('Enter')` and `\t` → `pressKey('Tab')`. This sends Latin text that arrives through composition (Gboard) letter by letter as the composition grows. When no composition is active (`compositionend` seen or `isComposing` false), the value is reset to a fixed sentinel string (not empty), so a Backspace after a reset still produces a deletion the diff can see (AR-S3-009); the diff ignores the sentinel itself. CJK compositions may send intermediate letters (not guaranteed, REQ-S3-2).

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By |
| --- | --- | --- |
| `NodeDesktopTile.vue` visibility/reconnect code (`openViewOnlyWhenReady`, `handleVisibilityChange`, related refs) | Shared by the phone view | `useNodeDesktopConnection` |
| `autobyteus-web/docs/remote_access.md` statements that mobile has no VNC (lines 41, 49, 184) and the "Mobile Capability Gating" section (176-194) | No longer true | Phone desktop section |
| `'vnc'` in `utils/mobileFeatureGates.ts:12` and its spec row (`utils/__tests__/mobileFeatureGates.spec.ts:15`) | Dead: no route or component reads it | — |

## Off-Spine Concerns

| Concern | Owner served | Reuse |
| --- | --- | --- |
| Phone credential re-check | `NodeDesktopViewers` | `RemoteAccessAuthService.authorizeMobileCredential` |
| Failure → close code | registry, route | exported `closeCodeByFailure` mapping |
| Endpoints, credential URL | session | S1 |
| Back key / route | phone view | `useMobileNavigation` |

## Dependency Rules

- `node-desktop/node-desktop-viewers.ts` → `remote-access/services/remote-access-auth-service.ts`, the exported close mapping; no Fastify. Route → registry → stream; the stream does not know the registry (notification only).
- Web: phone view → `useNodeDesktopConnection` → `useVncSession`; only `useVncSession` imports noVNC (the package root only; it owns the keysym mapping); only `nodeDesktopClient.ts` knows route strings and close codes.

## Interface Boundary Mapping

| Interface | Subject | Notes |
| --- | --- | --- |
| Close `4429 NODE_DESKTOP_TOO_MANY_VIEWERS` | refused stream | before any upstream connection |
| `NodeDesktopViewers.admit(viewer, stream) → 'admitted' \| { refused: close }` | node's streams | viewer = `{ kind, deviceId?, credential? }` (phone fields only for `kind === 'mobile'`); entry removed on the stream's end |
| `viewerStateForClose` → `'too-many'` | client state | message "Too many viewers on this node right now" + Retry |
| `MobileView`/`MobileScreen` `'desktop'` | phone route | `?screen=desktop[&full=1]`; Back: full screen → view → run |
| `useVncSession.typeText(text)`, `pressKey(key)` | Control input | no-op in `view` |

## Main Domain Subject Naming Check

`node-desktop-viewers.ts` / `NodeDesktopViewers` (registry of viewers of the node desktop); `MobileNodeDesktop.vue`; screen id `desktop`; UI "VNC Viewer". Consistent with GLOSSARY "node desktop".

## Existing Capability / Subsystem Reuse Check

Auth service, close mapping, S1 session/client/availability: Reuse. Connection policy: Extract (from the tile). Registry, zoom, keyboard bridge, phone view: Create New.

## Final File Responsibility Mapping

| File | Kind | Concern |
| --- | --- | --- |
| `autobyteus-server-ts/src/node-desktop/node-desktop-viewers.ts` | Add | limits, registry, 30 s re-check |
| `autobyteus-server-ts/src/node-desktop/node-desktop-stream.ts` | Modify | `close(close)`, `onEnd` |
| `autobyteus-server-ts/src/api/websocket/node-desktop.ts` | Modify | admission step; credential for phones |
| `autobyteus-server-ts/src/remote-access/domain/remote-access-close-codes.ts` | Add | failure code → WebSocket close mapping (moved) |
| `autobyteus-server-ts/src/api/websocket/remote-access-websocket-auth.ts` | Modify | imports the moved mapping |
| `autobyteus-server-ts/docs/modules/node_desktop.md` | Modify | limits, re-check, 4429 |
| `autobyteus-web/utils/nodeDesktopClient.ts` | Modify | `too-many` state |
| `autobyteus-web/composables/useNodeDesktopConnection.ts` | Add | connect/visibility/reconnect policy |
| `autobyteus-web/composables/useNodeDesktopAvailability.ts` | Add | cached availability per bound node |
| `autobyteus-web/composables/useVncSession.ts` | Modify | `typeText`, `pressKey` |
| `autobyteus-web/components/workspace/tools/NodeDesktopTile.vue` | Modify | uses the extracted policy; `too-many` message |
| `autobyteus-web/composables/mobile/useNodeDesktopZoom.ts` | Add | View only gestures |
| `autobyteus-web/components/mobile/views/MobileNodeDesktop.vue` | Add | phone view |
| `autobyteus-web/composables/mobile/useMobileNavigation.ts` | Modify | `desktop` screen/view; `full=1` key for full screen (Back pops it first) |
| `autobyteus-web/components/mobile/runScreen/MobileRunMenu.vue`, `MobileRunTargetView.vue` | Modify | entry + visibility rule |
| `autobyteus-web/components/mobile/MobilePairedShell.vue` | Modify | render the view |
| `autobyteus-web/types/novnc.d.ts` | Modify | `sendKey(keysym: number, code: string \| null, down?: boolean)` |
| `autobyteus-web/utils/mobileFeatureGates.ts` (+ spec) | Modify | remove the unused `'vnc'` feature id (AR-S3-008; read only by its own spec) |
| `autobyteus-web/components/workspace/tools/VncViewer.vue` | Modify | availability from `useNodeDesktopAvailability` |
| `autobyteus-web/localization/messages/{en,zh-CN}/…` | Modify | labels and states |
| `autobyteus-web/docs/remote_access.md` | Modify | phone desktop; lines 41, 49, 184 and the "Mobile Capability Gating" section (176-194) updated |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| Policy reuse | tile and phone view call `useNodeDesktopConnection(session)` | copying `handleVisibilityChange` into the phone view |
| Zoom | CSS transform of the fitted picture in View only; Control at scale 1 | zooming while Control taps go to noVNC (wrong coordinates) |
| Revocation | registry re-checks with the auth service | the stream holding an auth callback |
| Limits | refusal before TCP connect | counting after the stream started |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Keep a desktop-only copy of the visibility policy | Rejected (extract) |

## Change / Refactor Sequence

1. MP-001 on the emulator (before anything else): background the paired app with a page listening for `visibilitychange`; if the page is not hidden, stop and return (prerequisite).
2. Server: export close mapping → stream `close`/`onEnd` → registry + tests → route admission.
3. Web: `too-many` state → extract `useNodeDesktopConnection` (tile unchanged in behavior) → `useVncSession` key API → availability composable → zoom composable → phone view → navigation/menu/shell → localization.
4. Docs.
5. Validation.

## Validation Plan (per TESTING.md)

- Server unit: registry (4 node-wide, 2 per `deviceId`, trusted-network counted node-wide only, release on end, re-check closes only rejected phone streams with the mapped code, timer stops when empty, credential never logged).
- Server E2E: 5th stream and 3rd phone stream refused with 4429 before the fake upstream sees a connection (stream constructed, `start()` never called); revoked phone stream closed within 25 s (injectable interval in the test); Phone Access disabled likewise; cycles never overlap.
- Web unit: keysym mapping (ASCII, Latin-1, a non-Latin codepoint → `0x01000000|cp`, Enter/Backspace/Tab) and `sendKey` down/up; keyboard bridge value diff (insert, delete, composition growth, `\n`, reset after composition); full screen handle in Control and Back leaving full screen; `useNodeDesktopAvailability` single fetch per node; mode switch waits for close; `viewerStateForClose(4429)`; `useNodeDesktopConnection` (hidden → disconnect; visible → View only reconnect) on both clients; `useNodeDesktopZoom` (pinch scale clamp, pan clamp, double tap reset, disabled in Control); `typeText`/`pressKey` no-op in View only; menu entry shown/hidden (available × remote); navigation `desktop` and Back.
- Browser probe: `/mobile` in a desktop browser against an isolated node — AC-018.
- Android emulator (`autobyteus277_api35`, isolated node, test data): AC-017 (open, fit, rotate, pinch/pan, full screen in both modes incl. the handle and Back, no input in View only checked node-side), AC-019 (background → stream closed in the node log; return → View only), AC-S3-1 (Control → Keyboard with the emulator's Gboard → typing, Backspace, Enter reach a test text field), AC-012 (revoke from the desktop app's Phone Access card → closed ≤ 30 s). No screenshots of anything but the test node.
- Regression: S1 desktop tests; mobile shell tests.

## Guidance For Implementation

- MP-001 first. Real nodes and the user's phone are never used.
- The registry's timer must not keep the process alive (`unref`) and must stop on app close.
