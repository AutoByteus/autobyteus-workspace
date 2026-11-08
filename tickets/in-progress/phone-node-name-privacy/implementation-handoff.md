# Implementation Handoff — phone-node-name-privacy (autobyteus-433)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review not selected (Medium / Low, direct implementation route); this package goes to `/software_engineering_team/api_e2e_engineer` (rule: Small/Medium + Low, ready for direct API/E2E validation).
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/requirements-doc.md` (Approved, SR-001)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/design-spec.md` (Ready, SR-002)
- Supplemental task artifacts: None
- Design review report: `N/A — not applicable` (independent architecture review not selected)
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence: N/A (initial)

## Current Implementation Summary

The phone never shows a node's address. The `/mobile` page names the open node by the Android app's name for it (a new `nodeName` in the bridge's `hello` reply), then its session's QR name, then "AutoByteus node". The connection sheet shows the name and state only. The pairing page uses the same rule and reports only the QR's name to the app. The Android app shows `SavedNodeEntry.shownName` (its known name or "AutoByteus node") on every screen. It names an unnamed open node when that node's page pairs, says "Can't connect" for an unusable typed address, and its toasts and overlays carry no URL, WebView error text or exception text.

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Branch / commits: `codex/phone-node-name-privacy`; code `ba3ba5b23e`; ticket documents and evidence in the commit after it (see the handoff message)
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` → Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: 22 source files in the two expected packages (11 Android main, 1 Android instrumented test, 10 web), plus tests and one probe. Every change sits inside the owner the design named. The only contract change is the added `nodeName` field of the `hello` reply, with both ends in this commit. Nothing else changed: the bridge's origin/main-frame rule (`ShellBridgeMessages.read`), pairing, credentials, the Host/Origin rules, the server, stored entry fields and permissions. No escalation trigger fired.
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
| BEH-006 | Toasts/overlays without URL | `ConnectionDiagnosticMapper.pageLoadFailed(nodeName)`, `linkBlocked()`, `noAppForLink()`, `noFilePicker()`; `AutoByteusWebView.onOpenedOutside: () -> Unit`; toast "Opening outside AutoByteus" | Done. Exact texts of the design spec, tested word for word |
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
- Tests: new `test/.../connection/SavedNodeEntryTest.kt`; `NodeConnectionFlowTest`, `ShellBridgeMessagesTest`, `ConnectionDiagnosticMapperTest`; `androidTest/.../AutoByteusMobileShellSmokeTest.kt` (named argument `onOpenedOutside`)

## Important Assumptions

- A stored `displayName` equal to the entry's host (ignoring case) means "no name", as `onPaired` already assumed. A blank stored name also reads as unnamed.
- `nodeNameOrDefault` trims names. The session's `nodeName` was already stored trimmed or absent (`mobileNodeSessionStore.ts:184`).

## Known Risks

- **Stale bridge entry after an in-page rename (low).** `ShellBridge` and `AutoByteusWebView` keep the entry they were built with. When an open typed node is named by its page's pairing, a later `hello` from the same page answers `""` until the node is opened again. The page then shows the session's QR name, which is the same name, so nothing visible differs. A page-load failure overlay on that page reads "Can't reach AutoByteus node" until the node is reopened.
- **A page that pairs with another node's link (existing behavior, not introduced).** The page pairs with whatever link is pasted (`pairWithPayload` fetches the link's `serverBaseUrl`). If a user pastes node B's link on typed node A's page, `paired("B")` now names entry A "B". The same trust already applied to a pending QR entry. A guard would need the `paired` message to carry the paired server's address, which is a contract change outside this design. I am recording it as a risk, not changing it.
- The fix reaches the user only when both the APK and the node's `/mobile` bundle are updated (RISK-001, delivery note).
- Two never-paired typed nodes both read "AutoByteus node" (DEC-004).

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
- Dead code in the touched files and modules removed: `Yes`. Removed: both `hostOf` helpers; the sheet's `serverBaseUrl` prop and line; `webViewLoadFailed`; `unsafeNavigationBlocked`; the URL/message parameters of `invalidUrl` and `httpNeedsAcknowledgement`; the exception detail in `fromException`; the `url` parameter of the external-open callback; the `qrHadName` computation; the host-asserting test.
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

- Not run, and why:
  - Emulator / instrumented tests (`connectedDebugAndroidTest`) and AC-009 screenshots on an isolated node: owned by API/E2E (the design's AC-009 plan). Not run here.
  - The full `test:e2e:mobile-shell` probe (only MSP-09 ran): the change touches the sheet, header and pairing name; other cases are left to API/E2E's plan.
  - Full `pnpm -C autobyteus-web test:nuxt`: only the phone/remote-access suites ran; no other code reads the changed modules (grep of `shellBridge`, `MobileConnectionSheet`, `MobilePairedShell`, `MobilePairingBootstrap`).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: `/mobile` header (name, aria label), offline banner, connection sheet (connected and not reachable), pairing page name; Android screens (rows, Switch node, Connecting, Connected, Can't reach / Can't connect, ⋮ sheet, in-page overlay, toast).
- Approved references: `requirements-doc.md` (UI requirements: the sheet keeps the name as its title and loses the monospace address line); `design-spec.md` exact texts.
- Design system / adjacent surfaces reviewed: `MobileBottomSheet` header slot, `MobileRunList` header and banner, existing Android `ConnectionDiagnosticMapper` wording (`’` apostrophes kept).
- Testing guideline surface used: `TESTING.md` → the phone bundle is proven by `test:e2e:mobile-shell` (IMP-08) on the production `/mobile` build.
- States inspected: the sheet connected and not reachable with its diagnostic box, the header connected and not reachable, the offline banner, the browser pairing page, the unpair confirmation. Viewport 390×844.
- Visual or interaction issues found and corrected: none. Without the address line the sheet header is the title alone, vertically aligned with the close button, with no leftover gap (`MSP-09-connection-sheet.png`, `MSP-09-sheet-not-reachable.png`).
- Remaining unverified states: the Android native screens and the in-app header with an app-supplied name were not rendered here (no emulator run). They are covered by unit tests only, and AC-009 on the emulator is with API/E2E.

## Downstream Coverage Hints / Suggested Scenarios

- AC-001 on the emulator: an isolated node at a `*.ts.net`-style test address; a saved entry named "Test Desktop" (by QR) whose page session has no `nodeName`. To get one, clear the session's `nodeName` in WebView `localStorage` key `autobyteus.remote_access.mobile_session`, or pair with a QR without `serverName`. Expected: the header shows "Test Desktop" and "Connected"; the sheet has no address.
- AC-004: a typed address (Other ways to connect → Type an address) shows "AutoByteus node" on the first page, in Switch node, on Connecting/Connected and in the ⋮ sheet. Then AC-005: paste a pairing link with `serverName` "Test Node" on its page and go back to the list: the row reads "Test Node".
- AC-006: type `http://test-node.local:29695` without the tick, or an unreadable address. The title is "Can’t connect" and the typed text does not appear.
- AC-007: stop the node while its page is open → overlay "Can’t reach <name>" with the Tailscale/Wi-Fi advice; open a download or an external link → toast "Opening outside AutoByteus".
- Rebuild both the APK and the `/mobile` bundle the node serves (README: a fresh APK cannot update stale `mobile-web/` assets).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-009 emulator screenshots (first page, connected page, sheet, Switch node, Can't reach) with an isolated node and test names only; QR-001 text assertions on them.
- AC-010 preserved flows on the emulator (pairing, Switch node, Unpair, Check/Retry, reachability, Remove, opening the last node), and whichever existing suites API/E2E's plan marks Rerun.
- Docs sync (`autobyteus-android/README.md`, `docs/android_mobile_access.md`, `autobyteus-web/docs/remote_access.md`) is in the design's file mapping and the team assigns it to delivery; it is not done here.
