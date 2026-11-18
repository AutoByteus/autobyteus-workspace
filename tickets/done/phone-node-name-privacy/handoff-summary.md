# Handoff Summary: phone-node-name-privacy (autobyteus-433)

- Status: verified from the evidence, archived and finalized on `personal`. **No release**: the user has not asked for one ("Release only on the user's word"; `RELEASE.md` default). The user-only part of AC-001 is open and can only be checked after a release (below).
- Classification: `task_size=Medium`, `architectural_risk=Low`, direct route.
  - Architecture, source and test-code review: `N/A — not applicable`.
  - The code reviewer did two failure-origin reviews, CRR-001 and CRR-002, which led to SR-003…SR-005.
  - API/E2E: API-REV-004 `Pass` at 95% on the integrated state.

## What Changed

- `/mobile` page:
  - `utils/remoteAccess/nodeName.ts` sets the name order: the app's name from `hello`, else the session's `nodeName`, else "AutoByteus node".
  - The header, its accessibility label, the banner and "Connected to …" use that name.
  - `MobileConnectionSheet.vue` has no address line.
  - `MobilePairingBootstrap.vue` uses "AutoByteus node" for a QR without a name.
  - `MobileRemoteAccessShell.vue` sends `pageReady` when it mounts.
  - `shellBridge.ts` adds `pageReady` and reads `hello.nodeName`.
- Android app:
  - `SavedNodeEntry.shownName`/`knownName` ("AutoByteus node" for a node without a name), `NodeRow` and `RemoveNodeSheet`.
  - `NodeConnectionFlow`: a typed node takes the QR name when its page pairs, and "Can't connect" doesn't echo the typed text.
  - `ConnectionDiagnosticMapper` builds texts without exception text or an address.
  - `ShellBridge` sends `hello.nodeName` and handles `pageReady`.
  - `OpenPageState`: only `pageReady` shows the page or closes its overlay.
  - `WebShellScreen`: the WebView is invisible under an opaque overlay.
  - `AutoByteusWebView` keeps only main-frame errors, and `onPageStarted` only for the full-screen reset.
  - Toasts and overlays have no URLs.
- Merge with autobyteus-432 (SR-006, DEC-011): `ui/DesktopFullScreenRequest.kt`. The page's full-screen request is applied only on the plain page. A new document or closing the page clears it. Another screen or an overlay turns full screen off and keeps the request.
- Tests:
  - web: `nodeName.spec`, `MobileConnectionSheet.spec`, `MobilePairingBootstrap.spec`, `MobileRemoteAccessShell.spec`;
  - Android JVM: `OpenPageStateTest`, `DesktopFullScreenRequestTest`, `ShellBridgeMessagesTest`, `NodeConnectionFlowTest`, `SavedNodeEntryTest`, `ConnectionDiagnosticMapperTest`;
  - the instrumented smoke test;
  - the probe baseline fix `f7bb05f5ec`.
- Docs (delivery): `autobyteus-android/README.md`, `docs/android_mobile_access.md`, `autobyteus-web/docs/remote_access.md`. Implementation added `docs/design-cases.md` Case 19, and API/E2E added the `TESTING.md` "Android emulators" section (`82e4807f11`).

## Integration

- DR-001: the first refresh against `origin/personal` `b690a5dfdb` (24 commits, including autobyteus-432) hit a semantic conflict in `MainActivity.kt`. It went back to the Solution Designer as a `Design Impact`, which led to SR-006 / DEC-011.
- Implementation merged it as `e8516bce5c` (IR-005). API/E2E round 4 ran on that merge.
- DR-002: `origin/personal` was still `b690a5dfdb` when fetched at the start, so no new base commits and no further rerun.

## Verification (from the evidence)

All checked in the files of round 4 (merged APK and bundle):

- AC-001, AC-002 (`emulator-r4/API-04-07…json`, `API-04-08…json`):
  - `"headerName": "Test Desktop"` with `"sessionNodeName": "(absent)"`, and `hello` `"nodeName": "Test Desktop"`;
  - the sheet reads "Test Desktop / Connected / Switch node / 1 node on this phone / Unpair from Test Desktop".
- AC-004, AC-009, QR-001: my own scan of all 39 round-4 dumps for hosts, ports, `://`, `webpage` and `ERR_`. The only match is `API-05-02-typed.xml`, the Type an address sheet showing what was typed, which is kept on purpose.
- AC-007: `API-14-11-failed-reload-from-full.png` shows only the opaque "Can’t reach Test Docker Node" overlay. API-08/08b/09/11 (r4) cover reload, Retry and Back while down, the first-load 502/drop/refused, and recovery.
- AC-010: `API-02-r4-mobile-shell-full.log` `mobile-shell probe: Pass`, `unexpected browser errors: []` (20 cases incl. 426's MSP-20), plus API-10 (r4).
- DEC-011, in `API-14-window-states.log`:
  - entering gives `ROTATION_90 … SENSOR_LANDSCAPE … visible=false`, and `exit-2` gives `ROTATION_0 … UNSPECIFIED … visible=true`;
  - a reload, the node list and the link overlay each give `ROTATION_0 … UNSPECIFIED`;
  - Back to the page from the list gives `ROTATION_90` again;
  - the failed reload gives `ROTATION_0`.
  - The harness rotation trap is explained in its header and in TESTING.md.

## Open For The User

- **AC-001 on his own phone:** after updating both the app and his nodes, he opens his desktop node and checks that the header shows the node's name and no `…ts.net` name. API/E2E could not build an HTTPS session at a real `*.ts.net` name: the node refuses `http://…ts.net` pairing, and API 34+ can't be made to trust a test CA. The name rule never reads the address, which the unit tests with a `ts.net` session and the emulator both show. The check needs a release, so it follows finalization.
- **Release together:** the app and the node's `/mobile` page must come from the same release. `release-notes.md` carries the user action.

## Residual

- No instrumented test drives a real failed load over a loaded page (covered by `OpenPageStateTest` and by the emulator cases).
- Reopening a page at `full=1` can't be reached on a device (autobyteus-432 FU-002); `DesktopFullScreenRequestTest` covers it.
- Follow-ups FU-001 (wording of the HTTP-error overlay) and FU-003 (Retry after a pairing link's failed first load opens the page unpaired) are in `follow-ups.md`; the Solution Designer sends them.
