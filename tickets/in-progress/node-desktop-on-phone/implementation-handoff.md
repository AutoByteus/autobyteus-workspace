# Implementation Handoff — S3: Node desktop on the phone (autobyteus-407)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Large/High), passed ARCH-REV-002 (SR-002); this package goes to independent code review.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-on-phone/tickets/in-progress/node-desktop-on-phone/requirements-doc.md`
- Investigation notes: `.../node-desktop-on-phone/investigation-notes.md` (S3-01…S3-12)
- Solution revision record: `.../node-desktop-on-phone/solution-revision-record.md` (SR-001, SR-002)
- Design spec: `.../node-desktop-on-phone/design-spec.md` (SR-002)
- Design review report: `.../node-desktop-on-phone/design-review-report.md` (ARCH-REV-002, Pass)
- Architecture review revision record: `.../node-desktop-on-phone/architecture-review-revision-record.md`
- Implementation revision record: `.../node-desktop-on-phone/implementation-revision-record.md` (IR-001)
- Evidence: `.../node-desktop-on-phone/evidence/` (index: `evidence/README.md`)

## Current Implementation Summary

- Implementation cycle: `Initial` (IR-001)
- Related revision IDs: SR-001, SR-002; ARCH-REV-002; CRR / API-REV / DR `N/A`
- Triggering finding IDs: AR-S3-009, AR-S3-010 (settled, below)
- Commits on `codex/node-desktop-on-phone` (base `origin/personal` @ `e427a0c9cf`): `4f11061ecf` (implementation), `d84d2d0fdd` (keyboard bridge caret fix, found on the emulator), then this handoff, the revision record and the evidence.

What exists:

- **Server** `src/node-desktop/node-desktop-viewers.ts` (new): `NodeDesktopViewers.admit(viewer, stream)` → `"admitted"` or `{ refused: 4429 NODE_DESKTOP_TOO_MANY_VIEWERS }`; at most 4 streams per node (every kind), 2 per phone (`deviceId`); forgets a stream on `stream.onEnd`. While a phone stream is open it re-checks every phone stream's credential with `RemoteAccessAuthService.authorizeMobileCredential`: the next cycle is scheduled (an `unref`'d `setTimeout`) 20 s after the previous cycle **finished**, so cycles never overlap; one cycle checks its phones concurrently (`Promise.all`), each with a 5 s timeout; a timeout or an error logs a warning without the credential and leaves the stream for the next cycle; a rejection calls `stream.close(remoteAccessCloseForFailure(code))`. `dispose()` stops it for good (route `onClose` hook). `node-desktop-stream.ts`: public `close(close)` (end cause `node-closed`, logged as `reason=node-closed close=<reason>`) and `onEnd(listener)`. `src/remote-access/domain/remote-access-close-codes.ts` (new) owns the failure → close mapping; `remote-access-websocket-auth.ts` imports it. Route `src/api/websocket/node-desktop.ts`: authorize → validate → resolve → construct the stream → `viewers.admit` → `start()`; a phone context without a device id or credential → 4400.
- **Web shared**: `utils/nodeDesktopClient.ts` state `too-many` (4429); `composables/useNodeDesktopConnection.ts` (new; the connect/visibility/resize/unmount policy moved out of the tile, `offer` = connect | reconnect | retry | null); `NodeDesktopTile.vue` uses it and shows Retry for `too-many`; `composables/useNodeDesktopAvailability.ts` (new, one owner of `GET /rest/node-desktop` per node, cached per REST base; `VncViewer.vue` uses it); `useVncSession.ts`: `typeText(text)` / `pressKey('Enter'|'Backspace'|'Tab')` via `rfb.sendKey` (Control and connected only), keysyms computed (`keysymForCodepoint`: Latin-1 identity, else `0x01000000 | cp`, no `keysymdef` import), `switchMode` waits for the old socket's `close` (≤ 3.5 s) before opening the new one; `types/novnc.d.ts` `sendKey`.
- **Phone**: `components/mobile/views/MobileNodeDesktop.vue` (new): bar (Back, title, Fit when zoomed in View only, Keyboard in Control, the View only / Control switch with `aria-pressed`, Full screen), status strip with the offer button, the stage, the View only gesture layer, the Control full-screen handle "Show controls", the hidden keyboard textarea. `composables/mobile/useNodeDesktopZoom.ts` (new): pinch around the centre 1×–4×, pan clamped to the picture, double tap → fit, single tap after the 300 ms double-tap window, Ctrl+wheel (`passive: false`, `preventDefault`), resize/rotation and leaving View only → fit. `useMobileNavigation.ts`: screen/view `desktop`, key `full=1`, Back walks full screen → view → run. Wiring: `MobileRunMenu.vue` entry "VNC Viewer" (`showDesktop`), `MobileRunTargetView.vue` (`availability === 'available' && !remote`), `MobilePairedShell.vue` renders the view. `utils/mobileFeatureGates.ts`: `'vnc'` removed (AR-S3-008).
- **Localization**: new `mobileNodeDesktop.ts` catalogs (en, zh-CN) for the view's own labels; the close-state texts reuse the tile's `NodeDesktopTile.*` keys (one owner of each state's words), which gain `too_many_viewers` and `retry`.
- **Docs**: `autobyteus-web/docs/remote_access.md` "Node desktop on the phone" and the rewritten Phase One statements (AC-S3-3); `autobyteus-server-ts/docs/modules/node_desktop.md` "Viewer limits and live revocation", 4429 row, `node-closed`.

### Decisions settled in implementation (for the reviewer)

- **MP-001 (do first)**: holds. On `autobyteus277_api35`, Home fires `visibilitychange` → hidden, return → visible, same pid (`evidence/MP-001/`). No prerequisite.
- **AR-S3-009 (keyboard)**: the hidden textarea is reset to a fixed sentinel (`'_'` × 32) with the caret at its end after every non-composing input; each input is diffed against the last value: removed characters → Backspace each, added text → `typeText` (`\n` Enter, `\t` Tab); during composition the value is not reset, so a growing or corrected word is diffed letter by letter, and `compositionend` re-diffs then resets. Unit cases: Backspace after a reset, repeated Backspace, composition, and (after the emulator finding) the caret case below.
- **Emulator finding, fixed in this round (`d84d2d0fdd`)**: after a Backspace and the reset, Gboard puts the caret back at 31 of 32, so the next letter lands before the sentinel's last character; the plain prefix diff sent `d` + `_` (`evidence/xev-run1-keysyms.txt`). A common-suffix diff would be wrong for compositions (the node's caret is at the end of what was sent). The diff now ignores text after the local caret that the last value also ended with — the node's caret follows the local caret. New unit case; emulator rerun shows exactly `a b c Return BackSpace d e BackSpace BackSpace f` (`xev-run2-keysyms.txt`).
- **AR-S3-010**: the three stale spec lines were ignored as instructed: 20 s cycles (not 30 s), the mapping in `remote-access/domain` (not exported from websocket-auth), no `keysymdef` import.
- **Re-check**: one cycle checks its phones concurrently; the next starts 20 s after it ends; worst-case detection is interval + timeout = 25 s (unit-tested with a slow store; the route E2E measures ≤ 25 s; the emulator measured 2.3 s for one case).
- **Zoom**: reset on window resize/rotation and when the gesture layer goes (Control); Ctrl+wheel listener is non-passive with `preventDefault`; a single tap waits out the double-tap window. Fingers lifted after a pinch are not a tap (`sequenceHadPinch`; found in unit tests).
- **Mode switch**: `switchMode` waits for the old socket to close before opening the new one, so a phone at its 2-stream limit is not refused while switching (the old stream must leave the registry first).
- **Availability ref**: `ref`/`shallowRef` return a given ref unchanged, so the per-node state ref is wrapped in `{ state }` before switching nodes (caught by the spec).
- **`registerNodeDesktopWebsocket(app, resolveTarget = …, viewers = new NodeDesktopViewers())`**: the registry is a parameter with the production default, the S1 shape for `resolveTarget`; the route E2E passes its own.
- **No auto-reconnect after "not allowed"**: the connection policy reconnects on visible only if the page was hidden while a stream was open or opening (S1 behavior); "not allowed" offers no button. Reopening the view tries once and is refused (AC-012 evidence).

## Routing Classification (Mandatory)

- Task size: `Large`; Architecture risk: `High` (design-spec.md) — `Confirmed`. No escalation trigger fired: MP-001 true; noVNC coordinates correct in Control after View only zoom (Control taps land at the expected desktop point on the emulator and in the browser); the re-check touches no other route.
- Selected route: `Code Review`.
- Lightweight self-review: `Not Applicable` (Large/High); I reread the full diff against the design's file mapping.
- New design impact: `None`.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change | Production Path / Key Files | Result |
| --- | --- | --- | --- |
| BEH-003 / REQ-014, 015, S3-1, S3-3; AC-017 | Phone view, View only first, zoom/pan, Control switch, full screen | ⋮ → `MobileRunMenu` → `useMobileNavigation` `screen=desktop` → `MobileNodeDesktop` → `useNodeDesktopConnection` → `useVncSession` → `/ws/node-desktop` | Emulator pass: fitted View only portrait + landscape (same pid, connected), pinch 2.75× around the centre, pan, double tap and Fit → fit; View only taps/drag leave the node pointer at `x:300 y:300`; full screen hides the bars in both modes; View only tap and system Back leave it; Control handle "Show controls" brings them back without a desktop click; Control tap → `x:1598 y:800` (aimed 1600, 800) |
| REQ-014, S3-1; AC-018 | Same in a desktop browser | same | Browser probe pass: View only clicks → pointer unchanged; Ctrl+wheel zoom, drag pan, Fit, double click; full screen both modes; Control click `x:959 y:540` (aimed centre) |
| REQ-S3-2; AC-S3-1 | Keyboard bridge | `MobileNodeDesktop` textarea → `useVncSession.typeText/pressKey` → `rfb.sendKey` | Emulator + Gboard + xev pass (after `d84d2d0fdd`) |
| REQ-016; AC-019 | Background ends, return reconnects View only | `useNodeDesktopConnection` visibility | Emulator pass: Home → `stream ended mode=control … reason=viewer-closed`, upstream 0; return → "Connected · View only", 1 upstream |
| BEH-008 / REQ-009; AC-012 | Revocation ends the open stream ≤ 30 s | `NodeDesktopViewers` re-check → `stream.close` | Emulator pass: 2.3 s, `reason=node-closed close=REMOTE_ACCESS_DEVICE_REVOKED`, "not allowed", reopen refused (closed 13 ms after upgrade), upstream 0. Route E2E: revoked and Phone Access off ≤ 25 s |
| BEH-S3-1 / REQ-019; AC-021 | 4 per node, 2 per phone, 4429 before upstream | `viewers.admit` in the route; `viewerStateForClose` `too-many`; tile + phone Retry | Registry unit (12), route E2E (5th → 4429, 3rd phone → 4429), tile and phone component specs. Not shown on the emulator |
| BEH-S3-2 / REQ-S3-4; AC-S3-2 | Entry only with a node desktop and a local run | `useNodeDesktopAvailability` + `MobileRunTargetView` | `MobileRunScreen.spec.ts` availability × remote cases; emulator shows it on the Docker node |
| REQ-S3-5; AC-S3-3 | Docs | `remote_access.md`, `node_desktop.md` | Done |

- Changes stayed within the Scope Guardrail: `Yes` (no Android shell code, no change to the shared policy for other routes, no image change).

## Key Files Or Areas

- Server: `autobyteus-server-ts/src/node-desktop/{node-desktop-viewers,node-desktop-stream}.ts`, `src/api/websocket/{node-desktop,remote-access-websocket-auth}.ts`, `src/remote-access/domain/remote-access-close-codes.ts`, `docs/modules/node_desktop.md`
- Web: `utils/nodeDesktopClient.ts`, `utils/mobileFeatureGates.ts`, `types/novnc.d.ts`, `composables/{useVncSession,useNodeDesktopConnection,useNodeDesktopAvailability}.ts`, `composables/mobile/{useNodeDesktopZoom,useMobileNavigation}.ts`, `components/workspace/tools/{NodeDesktopTile,VncViewer}.vue`, `components/mobile/views/MobileNodeDesktop.vue`, `components/mobile/runScreen/{MobileRunMenu,MobileRunTargetView}.vue`, `components/mobile/MobilePairedShell.vue`, `localization/messages/{en,zh-CN}/{mobileNodeDesktop,workspace,index}.ts`, `docs/remote_access.md`
- Tests: server `tests/unit/node-desktop/node-desktop-viewers.test.ts`, `tests/unit/api/websocket/node-desktop.test.ts`, `tests/e2e/node-desktop/node-desktop-routes.e2e.test.ts`; web `composables/__tests__/{useVncSession,useNodeDesktopConnection,useNodeDesktopAvailability}.spec.ts`, `composables/mobile/__tests__/{useNodeDesktopZoom,useMobileNavigation}.spec.ts`, `components/mobile/views/__tests__/MobileNodeDesktop.spec.ts`, `components/workspace/tools/__tests__/{NodeDesktopTile,VncViewer}.spec.ts`, `components/mobile/runScreen/__tests__/MobileRunScreen.spec.ts`, mobile gates spec

## Important Assumptions

- A phone's identity for the per-phone limit is its `deviceId` from the authorized context; trusted-network and loopback viewers have none and count node-wide only.
- The emulator's Gboard is representative of the caret behavior after a reset; other keyboards are handled by the same caret-following diff (no keyboard-specific code).

## Known Risks

- The noVNC local cursor dot stays where the last Control tap was when the stage moves (keyboard opened); cosmetic, noVNC's own element (seen in `IMP-S3-16-control-keyboard-gboard.png`).
- The availability answer is cached per node for the page's life: after a revoke the ⋮ entry is still shown; opening it shows "not allowed" (correct refusal, no dead end).
- CJK input methods are not guaranteed (documented); only Gboard Latin was run.
- AC-021 "too many viewers" was not provoked on the emulator or in a browser (server E2E + component specs only).
- iOS not in scope.

## Task Design Health Assessment Implementation Check

- Change posture: Feature; root cause: Duplicated Policy Or Coordination (avoided); refactor: `Yes`, done first — the tile's policy moved to `useNodeDesktopConnection` (moved, not copied; the tile has no visibility code left).
- Implementation matched the assessment: `Yes`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. Legacy retained: `No` — `'vnc'` mobile gate and its spec row removed; Phase One "no VNC" doc text replaced; the mapping moved (not duplicated).
- Dead code in touched files removed: `Yes`.
- File sizes (non-empty lines): `NodeDesktopTile.vue` 241, `MobileNodeDesktop.vue` 204, `useVncSession.ts` 186, `useNodeDesktopZoom.ts` 167, `node-desktop-stream.ts` 130, `node-desktop.ts` (route) 108, `node-desktop-viewers.ts` 106 — all below 500.

## Persisted Data Transition Check

- `Not Affected` (the registry is in memory).

## Environment Or Dependency Notes

- Device checks used a test-owned node (`beta` image `9c5aa01bb2fc` + this worktree's server package, read-only), the `autobyteus277_api35` emulator with the app built from this worktree, and headless system Chrome; details in `evidence/README.md`. Removed afterwards (container, volumes, emulator, adb forwards). No model was loaded (no message was sent).
- **Fresh-start build**: not run here (no build-input change in S3 beyond source; left to API/E2E/delivery per TESTING.md).

## Checks Run

Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-on-phone/tickets/in-progress/node-desktop-on-phone/evidence/` (index with headers: `evidence/README.md`).

| Check ID | Command Or Steps | Commit | Code It Exercises | Criteria | Result | Evidence / Look For |
| --- | --- | --- | --- | --- | --- | --- |
| MP-001 | Home / return on the emulator, `visibilitychange` recorder | 4f11061ecf | Android WebView lifecycle | premise | Pass | `MP-001/`: hidden on Home, visible on return, same pid |
| IMP-S3-01 | server `vitest run tests/unit/node-desktop tests/unit/api/websocket tests/integration/node-desktop tests/e2e/node-desktop tests/unit/remote-access` | d84d2d0fdd | registry, stream, route, close mapping, E2E (4429 ×2, revoked ≤ 25 s, Phone Access off ≤ 25 s) | AC-012, AC-021 | Pass | `Tests  132 passed (132)` |
| IMP-S3-02 | server `test:unit` (full) | 4f11061ecf sources (server unchanged since) | whole server | green | Pass | 938 files, 8030 passed (output not kept) |
| IMP-S3-03 | `pnpm -C autobyteus-server-ts typecheck` | d84d2d0fdd | server | gate | Pass | `production errors: 0; test-file errors: 1182 … (baseline 1182 …)` |
| IMP-S3-04 | `pnpm -C autobyteus-web typecheck` | d84d2d0fdd | web | gate | Pass | `cross-package tests … 0 errors`; `production errors: 0; test-file errors: 96 … (baseline 96 …)` |
| IMP-S3-05 | web guards ×3 | d84d2d0fdd | boundaries, localization | gates | Pass | `Passed.` ×3 |
| IMP-S3-07 | web `vitest run components/mobile composables components/workspace/tools utils localization` | d84d2d0fdd | all S3 web code | AC-017…019, S3-1, S3-2, 021 (units) | Pass | `Test Files  178 passed`, `Tests  1181 passed` |
| IMP-S3-10…15 | emulator AC-017 | 4f11061ecf (view code unchanged by the fix) | phone view, zoom, full screen, Control | AC-017 | Pass | screenshots; pointer `x:300 y:300` through View only; Control `x:1598 y:800` |
| IMP-S3-16 | emulator AC-S3-1 run 1 | 4f11061ecf | keyboard bridge | AC-S3-1 | Fail → fixed | `xev-run1-keysyms.txt`: abc, Return, BackSpace correct; `d` arrived as `d` + `_` |
| IMP-S3-17 | emulator AC-S3-1 run 2 | d84d2d0fdd | keyboard bridge | AC-S3-1 | Pass | `xev-run2-keysyms.txt`: 10 keys in order, 10 releases |
| IMP-S3-19 | emulator AC-019 | 4f11061ecf | connection policy | AC-019 | Pass | `node-desktop-log-lines.txt` lines 2–3 |
| IMP-S3-20 | emulator AC-012 | d84d2d0fdd | registry re-check → close; refusal | AC-012 | Pass | `ac012-revoke.txt` (2.3 s, `node-closed close=REMOTE_ACCESS_DEVICE_REVOKED`), `ac012-reconnect.txt` |
| IMP-S3-21 | browser probe AC-018 | d84d2d0fdd | the view with mouse/trackpad | AC-018 | Pass | `AC-018/AC018-results.json` `"result": "done"`, all steps as expected; screenshots |
| IMP-S3-22 | node log scan | d84d2d0fdd | logging | no credentials | Pass | `log-scan.txt`: 0 `access_token=` values, 0 `mra_` in every log |

- Not run, and why: AC-021 on a device (covered by server E2E and specs); Phone Access off on the emulator (route E2E covers it; same code path as revoke); the full server suite was not repeated after `d84d2d0fdd` (web-only change); fresh-start build (delivery/API-E2E per TESTING.md); Electron desktop app (the tile's behavior is unchanged apart from the extracted policy and Retry, covered by specs).

## Frontend Rendered-Result Check

- Affected surfaces: phone run ⋮ menu; the new VNC Viewer view (bar, status strip, stage, full screen, handle, keyboard); desktop app VNC Viewer tile (Retry state only).
- References: requirements "UI, Interaction, And Experience Requirements"; design D-S3-4…D-S3-6.
- Rendered surface used: the Android emulator app against the test node (portrait and landscape, Gboard open) and headless Chrome at 1280×800; screenshots inspected.
- States inspected: menu with VNC Viewer; Connected · View only fitted (portrait, landscape); zoomed + panned with Fit; full screen View only; Connected · Control with Keyboard; full screen Control with "Show controls"; keyboard open; "This viewer is not allowed on this node". "Too many viewers" + Retry by component spec only.
- Issues found and corrected: the keyboard caret defect (`d84d2d0fdd`). No layout defects seen.
- Limitations: tile Retry state not rendered in the Electron app.

## Downstream Coverage Hints / Suggested Scenarios

- AC-021 rendered: three tabs of one paired browser (one device) each open the view → the third shows "Too many viewers on this node right now" + Retry; 4 streams node-wide → the 5th is refused.
- Phone Access off while the phone streams → "not allowed" ≤ 30 s.
- Another keyboard (e.g. SwiftKey) or Gboard with suggestions on: words and corrections reach the desktop once.
- Control after zooming in View only: taps land at the right desktop point (checked once here).

## API / E2E / Executable Coverage Still Required

- Independent validation of AC-017, 018, 019, 012, 021, S3-1, S3-2 per TESTING.md on test-owned nodes and the emulator only; fresh-start build.
