# Implementation Handoff — phone-node-name-privacy (autobyteus-433)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review not selected (Medium / Low, direct implementation route); this package goes to `/software_engineering_team/api_e2e_engineer` (rule: Small/Medium + Low, ready for direct API/E2E validation).
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/requirements-doc.md` (Approved; SR-001, REQ-006/AC-007/DEC-009 clarified at SR-003, REQ-006/AC-007/DEC-010 at SR-005)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/design-spec.md` (Ready, SR-006; section "SR-006 Integration With autobyteus-432")
- Supplemental task artifacts: None
- Design review report: `N/A — not applicable` (independent architecture review not selected)
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/code-review-report.md` (CRR-001 F-001, `Design Impact`, from API/E2E API-REV-001 API-08/08b); `solution-handoff.md` sections "SR-003 Revision" and "SR-004 Revision"; IR-002 premise check (`evidence/IMP-09-sr003-load-order-premise.log`); `code-review-report.md` CRR-002 F-002 (from API-REV-002) and `solution-handoff.md` section "SR-005 Revision"; delivery DR-001 (`release-deployment-report.md`, `delivery-revision-record.md`) and `solution-handoff.md` section "SR-006 Revision"

## Current Implementation Summary

The phone never shows a node's address. The `/mobile` page names the open node by the Android app's name for it (a new `nodeName` in the bridge's `hello` reply), then its session's QR name, then "AutoByteus node". The connection sheet shows the name and state only. The pairing page uses the same rule and reports only the QR's name to the app. The Android app shows `SavedNodeEntry.shownName` (its known name or "AutoByteus node") on every screen. It names an unnamed open node when that node's page pairs, says "Can't connect" for an unusable typed address, and its toasts and overlays carry no URL, WebView error text or exception text. While an overlay is up, the page underneath is hidden (WebView `INVISIBLE`, opaque overlay), so WebView's own error page, which prints the node URL, cannot show or be read by a screen reader. The page shows, and its overlay closes, only when the node's own page reports itself mounted (bridge `pageReady`, IR-004); WebView's error page has no bridge, so every failed load — first load, reload, Retry or Back, over a fresh WebView or a loaded page — keeps the overlay, and Retry or Back that loads the page closes it.

- Implementation cycle: `Rework` (IR-005: merge with autobyteus-432; IR-001 baseline, IR-002 returned a Design Impact without code, IR-003 superseded, IR-004 passed API-REV-003 on the old base)
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/implementation-revision-record.md`
- Current implementation revision ID: `IR-005`
- Branch / commits: `codex/phone-node-name-privacy`; code `ba3ba5b23e` (IR-001) + `ea45dc1643` (IR-003) + `60adcf3bc8` (IR-004) + merge `e8516bce5c` with `origin/personal` `b690a5dfdb` (IR-005); ticket documents and evidence in the commit after it (see the handoff message)
- Related solution revision IDs: `SR-002`, `SR-003`, `SR-004`, `SR-005`, `SR-006`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `CRR-001`, `CRR-002`
- Related API/E2E revision IDs: `API-REV-001`, `API-REV-002`, `API-REV-003` (pass on the old base)
- Related delivery revision IDs: `DR-001`
- Triggering finding IDs: DR-001 (base refresh with autobyteus-432); earlier CRR-002 F-002, CRR-001 F-001 (FU-002 folded in)

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` → Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: 22 source files in the two expected packages (11 Android main, 1 Android instrumented test, 10 web), plus tests and one probe. Every change sits inside the owner the design named. The only contract change is the added `nodeName` field of the `hello` reply, with both ends in this commit. Nothing else changed: the bridge's origin/main-frame rule (`ShellBridgeMessages.read`), pairing, credentials, the Host/Origin rules, the server, stored entry fields and permissions. No escalation trigger fired. IR-004 adds one bridge message (`pageReady`, page → app, both ends in this branch, same origin/main-frame rule) and one small state class (`OpenPageState.kt`) within the owners SR-005 names; no persistence or permission change; `DESIGN.md` rule 9 consequence (older node pages never send `pageReady`) accepted by the design. IR-005 merges autobyteus-432 and adds `ui/DesktopFullScreenRequest.kt` over its controller (DEC-011); no new contract.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (see Known Risks and the Legacy check below)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | App name → session QR name → "AutoByteus node"; never the address | `MobilePairedShell.vue`: `appNodeName` from one `getShellBridge()?.hello()` on mount (not awaited by the status check); `nodeName = nodeNameOrDefault(appNodeName, session?.nodeName)` feeds header, aria label, banner, post-pair "Connected to", sheet. `shellBridge.ts`: `ShellHello.nodeName` (`''` when absent). `ShellBridge.kt`: reply `nodeName = entry.knownName.orEmpty()` | Done. Web tests cover all four orders with a stubbed bridge, plus the browser case; IMP-02, IMP-08 |
| BEH-002 | Sheet shows name and state, no address | `MobileConnectionSheet.vue`: address line and `serverBaseUrl` prop removed; `MobilePairedShell` no longer passes it | Done. Sheet spec asserts no address shape in either state; MSP-09 asserts no host, port or `://` connected and not reachable |
| BEH-003 | App shows `shownName` everywhere | `SavedNodeEntry.knownName/shownName`; `NodeRow` (text, ⋮ label, row description), `RemoveNodeSheet` (title, confirmation), `MainActivity.openPage` ("Connected to"), `NodeConnectionFlow.run` (Connecting, Can't reach), `ConnectionValidator` (Phone access off) | Done. No UI file reads `displayName` any more (`grep` of `ui/`, `MainActivity.kt`) |
| BEH-004 | An unnamed open node takes the QR name when its page pairs; a named one is never renamed | `NodeConnectionFlow`: `openEntry` set in `opened()` (OnReachable / AlreadySaved; `null` for a pairing link); `onPaired` names `pending ?: openEntry?.takeIf { knownName == null }`; no save for a named open entry or a blank page name | Done. `NodeConnectionFlowTest` covers a typed node, a legacy host-named node, a named node and a blank name |
| BEH-005 | Unusable typed address: "Can't connect", typed text not repeated | `NodeConnectionFlow.connectTyped` failure → `showCantReach("")` (title "Can’t connect" from `MainActivity.showCantReach`) | Done. Test with both failure kinds |
| BEH-006 | Toasts/overlays without URL; the page hidden while an overlay is up; a successful load closes the overlay (SR-003/SR-004) | `ConnectionDiagnosticMapper.pageLoadFailed(nodeName)`, `linkBlocked()`, `noAppForLink()`, `noFilePicker()`; `AutoByteusWebView.onOpenedOutside: () -> Unit`; toast "Opening outside AutoByteus". IR-003: `WebShellScreen` (WebView `INVISIBLE` under an opaque overlay). IR-004 (DS-006): `MobileRemoteAccessShell` `onMounted` → `getShellBridge()?.pageReady()` → `ShellBridge` (`PageReady`, origin/main-frame rule) → `MainActivity.bridgeActions.onPageReady(entryId)` → `OpenPageState.onPageReady` (clears the overlay; shows the page first time or on the Web screen); `showWebDiagnostic` sets the overlay; `showPage()` renders with it | Done. Texts tested word for word; the page-state rule by `OpenPageStateTest` (CRR-002 sequences); `pageReady` at both bridge ends; the hidden page by the instrumented smoke test; premise measured and the final APK checked on an own emulator (IMP-13, IMP-16) |
| BEH-007 | No exception text in any diagnostic | `fromException` no longer reads `error.message` | Done. Unknown-host, IO, SSL, other and timeout exceptions naming a test host give no host in any text |
| BEH-008 | Pairing page: QR without name → "AutoByteus node" | `MobilePairingBootstrap.vue`: `nodeNameOrDefault(payload?.serverName)`; reports `session.nodeName ?? ''` | Done. Spec asserts the label and that `paired` gets `''` |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Web (`autobyteus-web`):
- Add `utils/remoteAccess/nodeName.ts`, `utils/remoteAccess/__tests__/nodeName.spec.ts`
- Modify `utils/remoteAccess/shellBridge.ts`, `components/mobile/MobilePairedShell.vue`, `components/mobile/connection/MobileConnectionSheet.vue`, `components/mobile/MobilePairingBootstrap.vue`, `types/remoteAccess.ts` (comment)
- Tests: `components/mobile/__tests__/MobileRemoteAccessShell.spec.ts` (reproduction flipped; app-name order, banner, browser tailnet cases), `components/mobile/connection/__tests__/MobileConnectionSheet.spec.ts`, `components/mobile/__tests__/MobilePairingBootstrap.spec.ts`
- Probe: `tests/e2e/mobile-shell-probe.mjs` MSP-09 asserts no address in the sheet (connected and not reachable) instead of reading `mobile-connection-url`

Android (`autobyteus-android/app/src/main/java/org/autobyteus/mobile/`):
- `connection/SavedNodeEntry.kt` (`knownName`, `shownName`, `UNNAMED_NODE_NAME`, KDoc on `displayName`)
- `shell/NodeConnectionFlow.kt`, `web/ShellBridge.kt`, `connection/ConnectionDiagnosticMapper.kt`, `connection/ConnectionValidator.kt`, `shell/ConnectionInputResolver.kt`, `web/AutoByteusWebView.kt`, `web/WebFileChooserCoordinator.kt`, `MainActivity.kt`, `ui/start/NodeRow.kt`, `ui/sheets/RemoveNodeSheet.kt`
- IR-003/IR-004: `ui/WebShellScreen.kt` (hidden page, opaque overlay); new `shell/OpenPageState.kt`; `web/ShellBridge.kt` (`PageReady`, `Actions.onPageReady`); `web/AutoByteusWebView.kt` (main-frame errors only; no load-outcome tracking); `MainActivity.kt` (`pageState`, `onPageReady`, `showPage` with the overlay). Removed: `web/MainFrameLoadOutcome.kt`
- Web (IR-004): `utils/remoteAccess/shellBridge.ts` (`pageReady()`), `components/mobile/MobileRemoteAccessShell.vue` (`onMounted` → `pageReady`)
- IR-005 (merge with autobyteus-432, DEC-011): `web/AutoByteusWebView.kt` (`onPageStarted: () -> Unit`, reset only); new `ui/DesktopFullScreenRequest.kt` (the document's request, applied only on the plain page; off at once; cleared by a new document or the host's end); `MainActivity.kt` (`showPage` with an overlay through `showScreen`; plain page → `plainPageShown()`; bridge `onDesktopFullScreen` → `onRequest`); conflicts in `ShellBridge.kt`, `shellBridge.ts`, the probe, `docs/design-cases.md` (Case 19); test `DesktopFullScreenRequestTest`
- Tests: new `test/.../connection/SavedNodeEntryTest.kt`, `test/.../shell/OpenPageStateTest.kt`; `NodeConnectionFlowTest`, `ShellBridgeMessagesTest`, `ConnectionDiagnosticMapperTest`; `androidTest/.../AutoByteusMobileShellSmokeTest.kt` (`onOpenedOutside`; WebView `INVISIBLE` under an opaque overlay, `VISIBLE` again without one); web `MobileRemoteAccessShell.spec.ts` (`pageReady` once on mount; nothing in a browser)

## Important Assumptions

- A stored `displayName` equal to the entry's host (ignoring case) means "no name", as `onPaired` already assumed. A blank stored name also reads as unnamed.
- `nodeNameOrDefault` trims names. The session's `nodeName` was already stored trimmed or absent (`mobileNodeSessionStore.ts:184`).

## Known Risks

- **Stale bridge entry after an in-page rename (low).** `ShellBridge` and `AutoByteusWebView` keep the entry they were built with. When an open typed node is named by its page's pairing, a later `hello` from the same page answers `""` until the node is opened again. The page then shows the session's QR name, which is the same name, so nothing visible differs. A page-load failure overlay on that page reads "Can't reach AutoByteus node" until the node is reopened.
- **A page that pairs with another node's link (existing behavior, not introduced).** The page pairs with whatever link is pasted (`pairWithPayload` fetches the link's `serverBaseUrl`). If a user pastes node B's link on typed node A's page, `paired("B")` now names entry A "B". The same trust already applied to a pending QR entry. A guard would need the `paired` message to carry the paired server's address, which is a contract change outside this design. I am recording it as a risk, not changing it.
- The fix reaches the user only when both the APK and the node's `/mobile` bundle are updated (RISK-001, delivery note).
- Two never-paired typed nodes both read "AutoByteus node" (DEC-004).
- **SR-005, `DESIGN.md` rule 9 (accepted):** a node still serving an older `/mobile` page never sends `pageReady`, so the new app stays on "Connected to <node> / Opening your runs…" for it until the node is updated (release notes must say to update every node with the app).
- **IR-005 / DEC-011:** the phone turns to landscape when the page appears, not while "Connected to …" still shows (432 as merged turned earlier); returning to a page whose document still asks for full screen turns it back on. The premise that a new document's request arrives after `onPageStarted` is assumed as in 432, not measured here. Deviation from the design's wording: "setOn(true) … then pageShown()" is one or the other (both would darken the root twice and give the dark colour back as its own).
- **SR-005 tradeoff (accepted):** a node page whose code fails before mounting stays behind that screen or the overlay; the page appears a moment later than before (after its code runs).
- Back-forward cache: not observed on WebView 124 (IMP-13: Back re-loads the document and the shell re-mounts). If a later WebView restored a page from that cache without re-mounting, the overlay would stay until Retry (fails closed).
- **SR-003 accepted:** an overlay raised by a link (blocked, no app, no file picker) over a working page now hides the page too until Retry reloads it or Edit leaves.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change (privacy fix)
- Reviewed root-cause classification: `Missing Invariant`
- Reviewed refactor decision: `No Refactor Needed` beyond the two small owners (`nodeNameOrDefault`, `SavedNodeEntry.knownName/shownName`)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the "no name" fact now has one owner per codebase. `onPaired`'s own `displayName != host` comparison is gone.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (no version check of the `hello` reply; the page's "session name, then label" steps serve the browser and an app entry with no name)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes`. Removed: both `hostOf` helpers; the sheet's `serverBaseUrl` prop and line; `webViewLoadFailed`; `unsafeNavigationBlocked`; the URL/message parameters of `invalidUrl` and `httpNeedsAcknowledgement`; the exception detail in `fromException`; the `url` parameter of the external-open callback; the `qrHadName` computation; the host-asserting test. IR-003: the `onPageStarted` (dead, its only caller passed `{}`) and `onPageFinished(url)` parameters of `AutoByteusWebView`, the forwarding `onPageStarted` override and its `Bitmap` import; the translucent overlay colour. IR-004: `MainFrameLoadOutcome` and its test, `onPageLoaded` and the `onPageFinished` override, `pageOverlayShown` and the per-page local `firstPageShown`.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (`ShellHello` gains one field; `SavedNodeEntry` gains derived properties only, nothing stored)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes`. Largest is `MainActivity.kt` at 321 effective lines; the largest change is `ConnectionDiagnosticMapper.kt` at about 49 changed lines.
- Notes: `SavedNodeStore` keeps its existing reader default (`displayName` → host → "AutoByteus") unchanged; it is persistence, not display.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: `design-spec.md` → Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence: `SavedNodeEntryTest.aSavedEntryWhoseStoredNameIsItsHostReadsAsUnnamed` and `NodeConnectionFlowTest.aSavedEntryWhoseStoredNameIsItsHostIsShownAsAutoByteusNode` / `aLegacyHostNamedNodeIsNamedWhenItsPagePairs`. Stored JSON is unchanged.
- Deviation: `None`

## Environment Or Dependency Notes

- Android builds need JDK 17: `JAVA_HOME=/opt/homebrew/opt/openjdk@17` on this machine (there is no default `java`), with `ANDROID_HOME=$HOME/Library/Android/sdk`.
- `pnpm install` and `pnpm -C autobyteus-web exec nuxt prepare` were run in this worktree. The server `dist/` and the `/mobile` bundle (`autobyteus-web/dist/public`, `dist-mobile/public`) are built from commit `ba3ba5b23e` (IMP-03). Rebuild them if code changes.
- The typecheck left untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` (build output, not committed).

## Checks Run

Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/evidence/`

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | Reproduction: flipped test only, before the fix: `cd autobyteus-web && pnpm exec vitest run components/mobile/__tests__/MobileRemoteAccessShell.spec.ts -t "AutoByteus node"` | `60f73df0a0` + flipped test | macOS, Node 22.23.1 | `MobilePairedShell.vue` (old host fallback) | BEH-001, AC-003 | Fail as expected (reproduced) | `IMP-01-reproduction-fails-before-fix.log` | `Received: "desktop-private.local:29695"` |
| IMP-02 | `cd autobyteus-web && pnpm exec vitest run components/mobile composables/mobile utils/remoteAccess stores/__tests__/mobileNodeSessionStore --reporter=verbose` | `ba3ba5b23e` | macOS, Node 22.23.1, vitest 3.2.7 | `components/mobile/**`, `composables/mobile/**`, `utils/remoteAccess/**` (incl. `nodeName.ts`, `shellBridge.ts`) | BEH-001, 002, 008; AC-001, 002, 003; AC-010 (web suites) | Pass | `IMP-02-web-mobile-unit-tests.log` | `Test Files  22 passed (22)`, `Tests  172 passed (172)`; the reproduction test passes |
| IMP-03 | `pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | `ba3ba5b23e` | macOS, Node 22.23.1 | server `dist/`, `/mobile` production bundle | prerequisite of IMP-08 and API/E2E | Pass | `IMP-03-server-and-mobile-bundle-build.log` | `files with 'mobile-connection-url': 0` |
| IMP-04 | `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `ba3ba5b23e` | macOS | web sources | — | Pass | `IMP-04-web-guards.log` | `exit=0` ×3 |
| IMP-05 | `pnpm -C autobyteus-web typecheck` | `ba3ba5b23e` | macOS | web app, Electron main, build scripts, cross-package tests | — | Pass | `IMP-05-web-typecheck.log` | `production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)`, `PASS` |
| IMP-06 | `cd autobyteus-android && ./gradlew :app:testDebugUnitTest` (JDK 17) | `ba3ba5b23e` | macOS, JDK 17 | `connection/*`, `shell/*`, `web/ShellBridge.kt` messages | BEH-003…007; AC-004, 005, 006, 007 (texts), 008; QR-003 (origin rule tests unchanged, pass) | Pass | `IMP-06-android-unit-tests.log` | `TOTAL tests 66 failures 0 errors 0` |
| IMP-07 | `./gradlew :app:assembleDebug :app:compileDebugAndroidTestKotlin` (JDK 17) | `ba3ba5b23e` | macOS, JDK 17, Android SDK 35 | whole app incl. `MainActivity`, `AutoByteusWebView`, `NodeRow`, `RemoveNodeSheet`, smoke test | build of BEH-003, 006 call sites | Pass | `IMP-07-android-apk-build.log` | `BUILD SUCCESSFUL`; APK sha256 `9d47eab3…c99a` |
| IMP-08 | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-09 --output-dir=…/evidence/IMP-08-mobile-shell-MSP-09` (after IMP-03) | `ba3ba5b23e` | macOS, headless Chrome 390×844, probe-owned alpha/beta | `/mobile` production bundle: header, sheet (connected, not reachable), banner, browser pairing page, unpair | BEH-001, BEH-002; AC-002 (browser), AC-010 (sheet, Check/Retry, Unpair) | Pass | `IMP-08-mobile-shell-MSP-09.log`, `IMP-08-mobile-shell-MSP-09/` (screenshots, `mobile-shell-probe.json`) | `MSP-09 Pass`; `info.urlLines 0`, `info.addressShown []`, `addressShownDown []`; screenshot `MSP-09-connection-sheet.png`: title "Alpha Test Node", no address line |

| IMP-09 | SR-003 premise check (IR-002): temporary log + temporary instrumented test, both removed | `ba3ba5b23e` + temporary code | own emulator, API 35, WebView 124.0.6367.219; host test servers | WebView callback order | DS-006 | Done (premise differed for HTTP errors → SR-004) | `IMP-09-sr003-load-order-premise.log` | `onReceivedHttpError main=true … 502` before `onPageStarted` |
| IMP-10 | `cd autobyteus-android && ./gradlew :app:testDebugUnitTest :app:assembleDebug :app:compileDebugAndroidTestKotlin` (JDK 17) | `ea45dc1643` | macOS, JDK 17 | all Android JVM tests incl. `MainFrameLoadOutcomeTest`; app and androidTest compile | BEH-003…007; DS-006 | Pass | `IMP-10-android-unit-and-build.log` | `TOTAL tests 71 failures 0 errors 0`; `MainFrameLoadOutcomeTest tests 5` |
| IMP-11 | `ANDROID_SERIAL=emulator-5570 ./gradlew :app:connectedDebugAndroidTest` | `ea45dc1643` | own read-only emulator `codex_api35_arm64`, API 35, WebView 124 | all 11 instrumented tests incl. `diagnosticWebShellKeepsRecoveryActionsInOverlay` (hidden page, opaque overlay) | BEH-006 (DS-004) | Pass | `IMP-11-android-instrumented-tests.log` | `TOTAL 11 failures 0 errors 0` |
| IMP-12 | Real app on the same emulator against a fake test node (status OK; `/mobile` switched 502 / dropped connection / 200): first load 502, Retry with a network failure, Retry with 502, Retry after recovery | `ea45dc1643` | as IMP-11; fake node `IMP-12-app-load-failure-overlay/fake_node.py.txt` | `MainActivity`, `AutoByteusWebView`, `MainFrameLoadOutcome`, `WebShellScreen` | BEH-006; AC-007; FU-002 | Pass | `IMP-12-app-load-failure-overlay.log`, `IMP-12-app-load-failure-overlay/01…04 .png/.xml` | 01–03: only the overlay on an opaque background, uiautomator dumps without `10.0.2.2`/`8436`/`http`/`webpage`; 02 title `Can’t reach Test Desktop`; 04: `TEST PAGE OK`, no RETRY |

| IMP-13 | SR-005 premise measurement: temporary logs (removed) in the bridge, activity and WebView client; the real `/mobile` bundle built from this tree, served by a fake test node (ok / 502 / drop / stopped); adb + WebView DevTools | `60adcf3bc8` + temporary logs | own emulator, API 35, WebView 124.0.6367.219 | bridge `pageReady` vs failed/successful main-frame loads | DS-006 | Done (premise holds) | `IMP-13-sr005-pageready-premise.log`, `IMP-13-sr005-fake-node.py.txt` | no `bridge {"type":"pageReady"}` line between a failure and its recovery; one per successful document; D5 `marker: null` after Back (no bfcache restore) |
| IMP-14 | web phone suites (`--reporter=verbose`), guards, typecheck | `60adcf3bc8` | macOS, Node 22 | `shellBridge.ts`, `MobileRemoteAccessShell.vue` and every phone suite | DS-006 (page end) | Pass | `IMP-14-web-checks.log` | `Tests  175 passed (175)`; the two "tells the app once that the page is ready" cases; `[typecheck] PASS` |
| IMP-15 | `./gradlew :app:testDebugUnitTest :app:assembleDebug`; `ANDROID_SERIAL=emulator-5570 ./gradlew :app:connectedDebugAndroidTest` | `60adcf3bc8` | macOS, JDK 17; own emulator | all Android JVM tests incl. `OpenPageStateTest`, `ShellBridgeMessagesTest`; 11 instrumented | BEH-006; DS-004, DS-006 | Pass | `IMP-15-android-tests-and-build.log` | `JVM TOTAL tests 74 failures 0`; `INSTRUMENTED TOTAL 11 failures 0`; `ABX433TMP: 0` |
| IMP-16 | Final APK on the emulator against the IMP-13 fake node: loaded page; reload with the node stopped; Retry while down; recovery; Back while 502; Retry drop; recovery | `60adcf3bc8` | as IMP-13 | `MainActivity`, `OpenPageState`, `ShellBridge`, `WebShellScreen`, the page's `pageReady` | BEH-006; AC-007; CRR-002 F-002 | Pass | `IMP-16-app-pageready-overlay.log`, `IMP-16-app-pageready-overlay/01…07` | `02-reload-refused-over-loaded-page.png`: the overlay alone (the CRR-002 state); 04/07: the page |

| IMP-17 | web on the merge: phone suites, guards, typecheck, probe `node --check`, `build:mobile-web` | `e8516bce5c` | macOS, Node 22 | merged web (433 + 432 phone code) | DS-006; 432 web | Pass | `IMP-17-web-checks-merged.log` | `Tests  189 passed (189)`; `[typecheck] PASS`; bundle `pageReady=1, desktopFullScreen=2` |
| IMP-18 | `./gradlew :app:testDebugUnitTest :app:assembleDebug :app:compileDebugAndroidTestKotlin`; `ANDROID_SERIAL=emulator-5570 ./gradlew :app:connectedDebugAndroidTest` | `e8516bce5c` | macOS, JDK 17; own emulator | all Android JVM tests incl. `DesktopFullScreenRequestTest`, 432's `DesktopFullScreenControllerTest`, `MainActivityManifestTest`; 12 instrumented incl. `DesktopFullScreenWindowTest` | DEC-011; D-2; DS-006 | Pass | `IMP-18-android-tests-merged.log` | `JVM TOTAL tests 93 failures 0`; `INSTRUMENTED TOTAL 12 failures 0` |
| IMP-19 | merged APK on the emulator, IMP-13 fake node with the merged bundle; the page's full-screen request sent from the live document via DevTools | `e8516bce5c` | own emulator, WebView 124 | `MainActivity`, `DesktopFullScreenRequest`, `OpenPageState`, 432's controller | DEC-011; D-2; AC-007 | Pass | `IMP-19-app-fullscreen-with-overlay.log`, `IMP-19-app-fullscreen-with-overlay/01…10` | `requestedOrientation` per step: 02 `SENSOR_LANDSCAPE`; 03 overlay `UNSPECIFIED`; 08 held `UNSPECIFIED`; 09 after pageReady `SENSOR_LANDSCAPE` (`09-ready-applies-request.png`) |

- IMP-10…IMP-12 (IR-003) are superseded by IMP-13…IMP-16: the code they exercised was replaced. IMP-13…IMP-16 ran on the old base; IMP-17…IMP-19 rerun the affected layers on the merge (the merge changed the web phone code, the bridge, `MainActivity` and `AutoByteusWebView`).
- Rerun plan for IR-004 (`git diff --name-only ea45dc1643 60adcf3bc8`): web `shellBridge.ts` and `MobileRemoteAccessShell.vue` changed → web suites, guards and typecheck rerun (IMP-14); MSP-09 (IMP-08) exercises the sheet in a browser (no bridge) and is unaffected by `pageReady` (still valid). IMP-01, IMP-03 still valid; the `/mobile` bundle must be rebuilt for any node API/E2E uses (it now sends `pageReady`).
- Not run, and why:
  - AC-009 screenshots on an isolated real node and the API-08/08b cases (reload and Back while down): owned by API/E2E. Back while down was not exercised in IMP-12 (the fake page has no history).
  - The full `test:e2e:mobile-shell` probe (only MSP-09 ran): the change touches the sheet, header and pairing name; other cases are left to API/E2E's plan.
  - Full `pnpm -C autobyteus-web test:nuxt`: only the phone/remote-access suites ran; no other code reads the changed modules (grep of `shellBridge`, `MobileConnectionSheet`, `MobilePairedShell`, `MobilePairingBootstrap`).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: `/mobile` header (name, aria label), offline banner, connection sheet (connected and not reachable), pairing page name; Android screens (rows, Switch node, Connecting, Connected, Can't reach / Can't connect, ⋮ sheet, in-page overlay, toast).
- Approved references: `requirements-doc.md` (UI requirements: the sheet keeps the name as its title and loses the monospace address line); `design-spec.md` exact texts.
- Design system / adjacent surfaces reviewed: `MobileBottomSheet` header slot, `MobileRunList` header and banner, existing Android `ConnectionDiagnosticMapper` wording (`’` apostrophes kept).
- Testing guideline surface used: `TESTING.md` → the phone bundle is proven by `test:e2e:mobile-shell` (IMP-08) on the production `/mobile` build.
- States inspected: the sheet connected and not reachable with its diagnostic box, the header connected and not reachable, the offline banner, the browser pairing page, the unpair confirmation. Viewport 390×844.
- Visual or interaction issues found and corrected: none. Without the address line the sheet header is the title alone, vertically aligned with the close button, with no leftover gap (`MSP-09-connection-sheet.png`, `MSP-09-sheet-not-reachable.png`).
- IR-004 Android overlay states inspected on an own emulator with the final APK (IMP-16), including the CRR-002 state IR-003's check missed (a failed reload over a page that had loaded): the overlay alone on an opaque background, staying through Retry and Back while down, closing on recovery.
- Remaining unverified states: the Android native screens and the in-app header with an app-supplied name were not rendered here; they are covered by unit tests, and AC-009 on the emulator is with API/E2E.

## Downstream Coverage Hints / Suggested Scenarios

- AC-001 on the emulator: an isolated node at a `*.ts.net`-style test address; a saved entry named "Test Desktop" (by QR) whose page session has no `nodeName`. To get one, clear the session's `nodeName` in WebView `localStorage` key `autobyteus.remote_access.mobile_session`, or pair with a QR without `serverName`. Expected: the header shows "Test Desktop" and "Connected"; the sheet has no address.
- AC-004: a typed address (Other ways to connect → Type an address) shows "AutoByteus node" on the first page, in Switch node, on Connecting/Connected and in the ⋮ sheet. Then AC-005: paste a pairing link with `serverName` "Test Node" on its page and go back to the list: the row reads "Test Node".
- AC-006: type `http://test-node.local:29695` without the tick, or an unreadable address. The title is "Can’t connect" and the typed text does not appear.
- AC-007: stop the node while its page is open → overlay "Can’t reach <name>" with the Tailscale/Wi-Fi advice; open a download or an external link → toast "Opening outside AutoByteus".
- IR-005 (design-spec SR-006 Validation, on the integrated state): this ticket's AC-007 cases (CRR-002's rerun list) and 432's full-screen cases — enter and exit; reset on reload, on Switch node and on an overlay; a page reopened at `full=1` (the request before `pageReady`, applied when the page appears; also the premise that the new document's request arrives after `onPageStarted`). Rebuild both the APK and the node's `/mobile` bundle from the merge.
- IR-004 (CRR-002's rerun plan, design-spec "SR-005 tests"): API-08, API-08b, API-11, API-09 (all parts), API-04, API-05, API-06, API-10, API-03. Rebuild the `/mobile` bundle the node serves (it must send `pageReady`, or the app stays on "Opening your runs…") as well as the APK. `IMP-13-sr005-fake-node.py.txt` serves the real bundle with 502 / drop modes if a proxy is not at hand.
- Rebuild both the APK and the `/mobile` bundle the node serves (README: a fresh APK cannot update stale `mobile-web/` assets).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-009 emulator screenshots (first page, connected page, sheet, Switch node, Can't reach) with an isolated node and test names only; QR-001 text assertions on them.
- AC-010 preserved flows on the emulator (pairing, Switch node, Unpair, Check/Retry, reachability, Remove, opening the last node), and whichever existing suites API/E2E's plan marks Rerun.
- Docs sync (`autobyteus-android/README.md`, `docs/android_mobile_access.md`, `autobyteus-web/docs/remote_access.md`) is in the design's file mapping and the team assigns it to delivery; it is not done here.
