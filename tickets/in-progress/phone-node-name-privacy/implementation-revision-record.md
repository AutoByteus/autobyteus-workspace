# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `solution-handoff.md` (Architecture Design Complete), round 1 | N/A | `Initial Baseline` | `SR-002`; `ARCH-REV-*` N/A; `CRR-*` N/A; `API-REV-*` N/A; `DR-*` N/A | Implemented; local checks pass; ready for direct API/E2E |
| IR-002 | Solution Designer, `solution-handoff.md` "SR-003 Revision" (from CRR-001 F-001 / API-REV-001), round 2 | CRR-001 F-001 | `Design Impact` | `SR-003`; `CRR-001`; `API-REV-001` | Not implemented: DS-006's premise check failed on WebView 124 (HTTP error comes before `onPageStarted`); returned to Solution Designer. Code unchanged at `ba3ba5b23e` |
| IR-003 | Solution Designer, `solution-handoff.md` "SR-004 Revision" (answer to IR-002), round 3 | CRR-001 F-001 | `Design Impact` (rework on the revised design) | `SR-004`, `SR-003`; `CRR-001`; `API-REV-001` | Implemented at `ea45dc1643`; local checks pass; ready for direct API/E2E |
| IR-004 | Solution Designer, `solution-handoff.md` "SR-005 Revision" (from code review CRR-002 F-002 / API-REV-002), round 4 | CRR-002 F-002 | `Design Impact` (rework on the revised design) | `SR-005`; `CRR-002`; `API-REV-002` | Implemented at `60adcf3bc8`; premise measured (holds); local checks pass; ready for direct API/E2E |
| IR-005 | Solution Designer, `solution-handoff.md` "SR-006 Revision" (from delivery DR-001: integration with autobyteus-432), round 5 | DR-001 (base refresh conflict) | `Design Impact` (rework on the revised design) | `SR-006`; `DR-001`; `API-REV-003` (prior pass) | Merged `origin/personal` `b690a5dfdb` at `e8516bce5c`; local checks pass; ready for direct API/E2E on the integrated state |

## Revision Entries

### IR-001 — Show a node's name, never its address, on the phone

- Triggering role, report path, and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/solution-handoff.md`, round 1 (direct implementation route: Medium / Low).
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: implementation commit `ba3ba5b23e` on `codex/phone-node-name-privacy`; checks IMP-01…IMP-08 in `implementation-handoff.md`.
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: `N/A` (not selected)
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline is recorded: first implementation of the design spec.
- Approved behavior or requirement IDs affected: BEH-001…BEH-008; REQ-001…REQ-008; AC-001…AC-008 at the unit level (AC-009 and AC-010 on the emulator remain with API/E2E).
- Implementation delta:
  - Web: new `utils/remoteAccess/nodeName.ts` (`UNNAMED_NODE_NAME`, `nodeNameOrDefault`); `ShellHello.nodeName`; `MobilePairedShell` names the node `nodeNameOrDefault(appNodeName, session.nodeName)` from one `hello` on mount; the connection sheet's address line and `serverBaseUrl` prop are gone; `MobilePairingBootstrap` uses the rule and reports `session.nodeName ?? ''`; both `hostOf` helpers removed.
  - Android: `SavedNodeEntry.knownName` / `shownName` / `UNNAMED_NODE_NAME`; every UI reader moved to `shownName`; `NodeConnectionFlow` tracks `openEntry`, names an unnamed open entry on `paired`, passes `""` for an unusable typed address; the bridge's `hello` reply carries `nodeName = entry.knownName.orEmpty()`; `ConnectionDiagnosticMapper` gains `pageLoadFailed(nodeName)`, `linkBlocked()`, `noAppForLink()`, `noFilePicker()`, loses `webViewLoadFailed`, `unsafeNavigationBlocked` and the URL/detail parameters; `AutoByteusWebView.onExternalUrl(url)` became `onOpenedOutside()`; the toast reads "Opening outside AutoByteus".
  - Tests: reproduction test flipped (IMP-01), new and changed web and Android unit tests, the probe's MSP-09 asserts no address in the sheet.
- Changed files or areas: see `implementation-handoff.md` Key Files Or Areas.
- Local validation and result: IMP-01…IMP-08, all Pass (see the handoff's Checks Run).
- Next recipient or routing: direct API/E2E (handoff rule for Small/Medium + Low).
- Remaining limitations or risks: see the handoff's Known Risks (emulator not run here; bridge entry not refreshed after an in-page rename; a page could pair with another node's link).

### IR-002 — SR-003 premise check fails for HTTP errors (Design Impact returned)

- Triggering role, report path, and round: Solution Designer, `solution-handoff.md` section "SR-003 Revision", round 2 (from code review `code-review-report.md` CRR-001 F-001, API/E2E API-REV-001 API-08/08b).
- Triggering finding IDs: CRR-001 F-001
- Classification: `Design Impact`
- Prior authoritative result: IR-001 (`ba3ba5b23e`)
- Current authoritative result: unchanged code (`ba3ba5b23e`); no SR-003 change implemented.
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `N/A`
- Why this revision is recorded: the design (DS-006) required confirming the WebView callback order on the emulator first and returning a Design Impact if it differs. It differs.
- Approved behavior or requirement IDs affected: BEH-006; REQ-006; AC-007; DEC-009.
- Implementation delta: none kept. A temporary log in `AutoByteusWebView.Client` and a temporary instrumented test (`TmpLoadOrderProbeTest`) were used and removed (`grep ABX433TMP|TmpLoadOrder` finds nothing).
- Changed files or areas: `evidence/IMP-09-sr003-load-order-premise.log` only.
- Local validation and result: IMP-09 on an own read-only emulator (`codex_api35_arm64`, API 35, WebView 124.0.6367.219), 2 runs with the same order:
  - network failure (closed port): `onPageStarted → onReceivedError(main) → onPageFinished` (matches);
  - HTTP 502, first load and reload: `onReceivedHttpError(main) → onPageStarted → onPageFinished` (differs: "onPageStarted clears the mark" would erase the HTTP failure, and `onPageLoaded()` would show the 502 page);
  - success: `onPageStarted → onPageFinished`; a sub-resource HTTP error (favicon, `main=false`) comes after `onPageFinished`.
- Next recipient or routing: Solution Designer (Design Impact).
- Remaining limitations or risks: the emulator and the test servers were stopped; the other agent's emulator (`emulator-5554`) was not touched.

### IR-003 — Hide the page under an overlay; show it only after a load that succeeded

- Triggering role, report path, and round: Solution Designer, `solution-handoff.md` sections "SR-003 Revision" and "SR-004 Revision", round 3 (CRR-001 F-001 from API-REV-001 API-08/08b; IR-002 premise check).
- Triggering finding IDs: CRR-001 F-001 (and FU-002, folded in at SR-003)
- Classification: `Design Impact` (rework on the revised design: SR-003 as revised by SR-004)
- Prior authoritative result: IR-001 (`ba3ba5b23e`); IR-002 changed no code.
- Current authoritative result: `ea45dc1643`.
- Related solution revision IDs: `SR-003`, `SR-004`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `N/A`
- Why this revision is recorded: on a main-frame load failure WebView's error page, which prints the node URL, showed through the 92 % opaque overlay and was in the accessibility tree; the first `onPageFinished` replaced a first-load overlay with that page; a successful Retry did not close the overlay (FU-002).
- Approved behavior or requirement IDs affected: BEH-006; REQ-006; AC-007; DEC-009.
- Implementation delta:
  - New `web/MainFrameLoadOutcome.kt`: `onError(isMainFrame)` marks a main-frame failure; `onFinished()` returns `!failed` and resets the mark; nothing happens at `onPageStarted`.
  - `AutoByteusWebView`: `onPageStarted`/`onPageFinished(url)` parameters replaced by `onPageLoaded: () -> Unit`, called from `onPageFinished` only when `MainFrameLoadOutcome.onFinished()` is `true`; both error callbacks feed `onError`. The `onPageStarted` override (it only forwarded) and the `Bitmap` import were removed.
  - `WebShellScreen`: with a diagnostic the WebView is `INVISIBLE` (kept in the layout), otherwise `VISIBLE`; the overlay background is opaque.
  - `MainActivity`: `pageOverlayShown` (set by `showWebDiagnostic`; cleared by `showPage`, `closePage` and a new `openPage`); `onPageLoaded`: first page not shown yet → `showPage()`; else an overlay up on the Web screen → `showPage()`; else nothing.
  - Tests: new `MainFrameLoadOutcomeTest` (network failure, HTTP error first, success, sub-resource errors, a sequence ending in a successful Retry); `AutoByteusMobileShellSmokeTest` uses `onPageLoaded`, asserts the WebView `INVISIBLE` under an opaque overlay and `VISIBLE` again without one.
- Changed files or areas: `autobyteus-android/app/src/main/java/org/autobyteus/mobile/{web/MainFrameLoadOutcome.kt, web/AutoByteusWebView.kt, ui/WebShellScreen.kt, MainActivity.kt}`, `app/src/test/.../web/MainFrameLoadOutcomeTest.kt`, `app/src/androidTest/.../AutoByteusMobileShellSmokeTest.kt`.
- Local validation and result: IMP-10 (71 JVM tests, APK, androidTest compile), IMP-11 (11 instrumented tests on an own emulator), IMP-12 (the real app on an own emulator against a fake test node: first-load 502 stays an overlay, Retry with a network failure and with a 502 keeps it, Retry after recovery closes it and shows the page; no address in any screenshot or uiautomator dump). All Pass.
- Next recipient or routing: direct API/E2E (Medium / Low).
- Remaining limitations or risks: accepted SR-004 residual (a main-frame error with no `onPageFinished` keeps the overlay one more Retry; not observed); an overlay raised by a link over a working page now hides the page until Retry reloads it or Edit leaves (SR-003, accepted); Back while down was not exercised here (the test page has no history).

### IR-004 — Show the page only when the node's page reports itself ready

- Triggering role, report path, and round: Solution Designer, `solution-handoff.md` section "SR-005 Revision", round 4 (code review `code-review-report.md` CRR-002 F-002 from API/E2E API-REV-002; cause log `evidence/emulator-r2/API-08-cause-onPageFinished-twice.log`).
- Triggering finding IDs: CRR-002 F-002
- Classification: `Design Impact` (rework on the revised design: SR-005, DEC-010)
- Prior authoritative result: IR-003 (`ea45dc1643`), which failed open: a failed load over a page that had loaded reports `onPageFinished` twice, and the second counted as success. My IMP-12 exercised only fresh-WebView failures (no loaded page underneath), so it did not reach that state.
- Current authoritative result: `60adcf3bc8`.
- Related solution revision IDs: `SR-005`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `CRR-002`
- Related API/E2E revision IDs: `API-REV-002`
- Related delivery revision IDs: `N/A`
- Why this revision is recorded: WebView's load callbacks cannot tell the node's page from WebView's own error page without failing open; the page now reports itself mounted over the bridge, which the error page cannot do (fails closed).
- Approved behavior or requirement IDs affected: BEH-006; REQ-006; AC-007; DEC-010.
- Implementation delta:
  - Web: `ShellBridge.pageReady()` posts `{type:'pageReady'}`; `MobileRemoteAccessShell` `onMounted` calls `getShellBridge()?.pageReady()` once (nothing in a browser).
  - Android: `ShellBridgeAction.PageReady` read from `{"type":"pageReady"}` under the unchanged origin/main-frame rule → `Actions.onPageReady(entry.id)`; new `shell/OpenPageState.kt` (open entry id, `overlay`, `firstPageShown`; `open`/`close` reset; `onDiagnostic` sets the overlay; `onPageReady(entryId, onWebScreen)` ignores other entries, clears the overlay, returns whether to show the page: first time or on the Web screen); `MainActivity` drives it (`showWebDiagnostic` → `onDiagnostic` + `showPage()`; `showPage()` always renders with `pageState.overlay`; `onPageReady` → `showPage()` when told).
  - Removed: `web/MainFrameLoadOutcome.kt` and its test, `AutoByteusWebView.onPageLoaded` and its `onPageFinished` override, `MainActivity.pageOverlayShown` and the per-page local `firstPageShown`.
  - Tests: new `OpenPageStateTest` (CRR-002 §2, §3, §8, §4–§7; Switch-node return; ready elsewhere; another entry; reset); `ShellBridgeMessagesTest` (pageReady read only from the main frame of the entry's origin; not from a subframe, another origin or `chrome-error://chromewebdata`); `MobileRemoteAccessShell.spec.ts` (pageReady once on mount, paired and unpaired, not again on in-document navigation; nothing in a browser); smoke test drops `onPageLoaded`.
- Changed files or areas: `autobyteus-web/{utils/remoteAccess/shellBridge.ts, components/mobile/MobileRemoteAccessShell.vue, components/mobile/__tests__/MobileRemoteAccessShell.spec.ts}`; `autobyteus-android/app/src/main/java/org/autobyteus/mobile/{shell/OpenPageState.kt (new), web/ShellBridge.kt, web/AutoByteusWebView.kt, MainActivity.kt}`, `web/MainFrameLoadOutcome.kt` (removed); tests as above.
- Local validation and result: IMP-13 premise measurement (holds: no `pageReady` for any failed load — fresh WebView and over a loaded page; first load, reload, Retry, Back; 502, drop, refused — and exactly one per successful document; no back-forward-cache restore observed, Back re-mounts the shell); IMP-14 web (175 tests, guards, typecheck at baseline); IMP-15 Android (74 JVM, APK without temporary strings, 11 instrumented); IMP-16 final APK on the emulator (CRR-002 state now shows only the overlay; recovery shows the page). All Pass.
- Next recipient or routing: direct API/E2E (Medium / Low).
- Remaining limitations or risks: `DESIGN.md` rule 9 — a node serving an older `/mobile` page never sends `pageReady`, so the new app stays on "Connected to … / Opening your runs…" for it (accepted, release note); a page whose code fails before mounting stays behind that screen or the overlay (accepted, SR-005 tradeoff); the IMP-13/IMP-16 node is a fake that serves the real bundle, not a real node (real-node journeys are API/E2E's).

### IR-005 — Merge with autobyteus-432 (desktop full screen): each event one job

- Triggering role, report path, and round: Solution Designer, `solution-handoff.md` section "SR-006 Revision" and design-spec "SR-006 Integration With autobyteus-432", round 5 (delivery `release-deployment-report.md`, `delivery-revision-record.md` DR-001).
- Triggering finding IDs: DR-001 (base refresh: five conflicts, one semantic in `MainActivity.kt`)
- Classification: `Design Impact` (rework on the revised design: SR-006, DEC-011)
- Prior authoritative result: IR-004 (`60adcf3bc8`), API/E2E pass API-REV-003, on the old base.
- Current authoritative result: merge commit `e8516bce5c` (parents `9b617b0d52`, `origin/personal` `b690a5dfdb`).
- Related solution revision IDs: `SR-006`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `API-REV-003` (passed on the old base; its cases need the integrated state)
- Related delivery revision IDs: `DR-001`
- Why this revision is recorded: both 433 (overlay hides the page; only `pageReady` shows it) and 432 (D-2: full screen only on the plain page, reset on `onPageStarted`, any other screen and the host's end) changed `MainActivity`'s page lifecycle.
- Approved behavior or requirement IDs affected: BEH-006; REQ-006; AC-007; DEC-010, DEC-011; 432's D-2.
- Implementation delta:
  - Mechanical: `ShellBridge.kt` KDoc and `shellBridge.ts` header name both features; the probe's route handler keeps the closed-context fix and 432's `runIds`; `docs/design-cases.md` keeps 432's Case 18 and renumbers this ticket's case to Case 19.
  - `AutoByteusWebView`: `onPageStarted: () -> Unit` restored (override → callback), used only for the reset; no `onPageFinished`, no load outcome.
  - New `ui/DesktopFullScreenRequest.kt` over 432's `DesktopFullScreenController`: `onRequest(on, plainPageOnScreen)` remembers the request, applies `on` only when the plain page is on screen, `off` at once; `clear()` (new document, host's end) forgets it and resets; `otherScreenShown()` resets; `plainPageShown()` applies the remembered request (`setOn(true)` when off, `pageShown()` when already on — never both, which would darken the root twice and lose its own colour).
  - `MainActivity`: `openPage` uses 432's `destroyWebHost()`/`showScreen()` with `pageState.open` and `entry.shownName`; `onPageStarted = { fullScreenRequest.clear() }`; `showPage()` with `pageState.overlay` renders through `showScreen` (reset, no `pageShown`), without it `setContentView` + `plainPageShown()`; `showWebDiagnostic` → `pageState.onDiagnostic` + `showPage()`; `onDesktopFullScreen(on)` → `fullScreenRequest.onRequest(on, screen == Web && overlay == null)`; `showScreen`/`destroyWebHost` go through the request object.
  - Tests: new `DesktopFullScreenRequestTest` (request before pageReady; held under an overlay; new document clears; other screen resets and a return re-applies; off at once; host's end; single darkening); smoke test passes `onPageStarted = {}`.
- Changed files or areas: the five conflicted files; `autobyteus-android/.../web/AutoByteusWebView.kt`, `ui/DesktopFullScreenRequest.kt` (new), `test/.../ui/DesktopFullScreenRequestTest.kt` (new), `androidTest/.../AutoByteusMobileShellSmokeTest.kt`.
- Local validation and result: IMP-17 (web on the merge: 189 tests, guards, typecheck at baseline, probe syntax, bundle carries both messages); IMP-18 (Android: 93 JVM incl. 432's controller/manifest tests and the 8 new cases; 12 instrumented incl. 432's `DesktopFullScreenWindowTest`); IMP-19 (merged APK on an own emulator: request applied on the plain page, off under an overlay, cleared by a new document and by a reload, held under an overlay over a live document and applied on `pageReady`, off at once; no address in any dump). All Pass.
- Next recipient or routing: direct API/E2E on the integrated state (design-spec SR-006 Validation).
- Remaining limitations or risks: the premise "the new document's request arrives after `onPageStarted`" is assumed as in 432 (not measured here; JS of a document cannot run before its commit, and IMP-13 shows `onPageStarted` before every `pageReady`); a real VNC viewer reopened at `full=1` and Switch node were not exercised here (no real node with a desktop) — JVM-covered and left to API/E2E. Deviation from the design's wording: "setOn(true) … then pageShown()" is implemented as one or the other (see delta) because both together lose the root's own colour.
