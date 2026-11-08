# API/E2E Execution Coverage Report — phone-node-name-privacy (autobyteus-433)

## Round

- Coverage investigation (the plan; it lists the upstream documents): `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; Implementation Complete IR-001 (code `ba3ba5b23e`), direct route
- Prior round reviewed: None
- Deviations from the investigation's plan, and why:
  - API-02 first ran the full probe: all 19 MSP cases passed, but the probe failed on two unexpected browser errors in MSP-12. I found the cause in the harness (below), made a baseline fix (`f7bb05f5ec`, test only) and reran MSP-12 and MSP-09 only (TESTING.md: one run per case per round; rerun the failing test).
  - API-03 first attempt: the windowed emulator froze (qemu at 0% CPU, `adb shell` hung) while the machine's load was about 68, with a second agent's emulator running. I restarted it headless (`-no-window`) and the run completed. No result came from the frozen attempt.
  - API-07: the Type an address sheet keeps **Connect** disabled until the tick is set for an `http://` address (`TypeAddressSheet.kt:57`), so the "plain http without tick" failure cannot be reached from the UI. It is unit-tested (IMP-06). The reachable "unusable typed address" is an unreadable one (`ftp://…`), which ran.
  - API-08: my first node stop killed the wrapper process, not the node (my script's pid file), so the page could not go down; I fixed the script and stopped the listener. The page shows "Not reachable" after a **Check** (the 5 s poll sends no credential check, autobyteus-426 SR-008, as MSP-09 also does); that is the real trigger used.
  - API-08b added: a user-only reproduction of the API-08 failure.
  - API-09: Gmail opened `mailto:`, so for "No app can open this link" I disabled Gmail on the ticket-owned AVD.
  - Pasting a 278-character link with `adb input text` stops at 153 characters; I typed it in three chunks (real key input; the field's value was checked equal to the link).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/evidence/` (emulator files in `evidence/emulator/`, with their header in `evidence/emulator/README.md`)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery` (not reached: this round is `Fail`)
- Proportional test-code review decision: `Not Required — direct low-risk route` (the one test change, the probe baseline fix `f7bb05f5ec`, goes with the failure package to the code reviewer for information)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `8f87b1ef49` (code `ba3ba5b23e`); rerun `f7bb05f5ec` | macOS 26.5.2 arm64, Node 22.23.1 | mobile-shell probe stack: worktree server `dist` ×2, `build:mobile-web` bundle, `nuxt dev`, headless Chrome 390×844 | probe-owned data roots; phone origin `http://192.168.77.10:<port>` |
| ENV-2 | `8f87b1ef49` (code `ba3ba5b23e`) | ticket-owned AVD `pnnp433_api35`: Android 15, `google_apis` arm64, `sdk_gphone64_arm64`, WebView 124.0.6367.219, 1080×2400 @420 dpi, headless | debug APK sha256 `9d47eab3…c99a` (rebuilt, same hash as IMP-07); `/mobile` bundle rebuilt (`API-02-builds.log`) | two test nodes from the worktree `dist` (A `127.0.0.1:47331`, B `127.0.0.1:47332`), own data roots/HOME; test DNS → `10.0.2.2` for `hostbox-9f3.home.arpa`, `nodebox-2c7.home.arpa`, `hostbox-9f3.example-tailnet.ts.net`; names "Test Desktop", "Test Node"; WebView DevTools for DOM reads |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001…AC-008 (unit), AC-010 (suites), QR-003 | Web unit, guards, typecheck; Android JVM; APK build | Reused IMP-02, IMP-04, IMP-05, IMP-06, IMP-07 | (handoff) | Pass | (handoff) | (handoff) | `git diff --name-only ba3ba5b23e 8f87b1ef49` = ticket files only; the changed web modules are imported only under `components/mobile/**` (grep), all inside IMP-02's scope |
| API-01b | AC-002, AC-010 (sheet, Check/Retry, Unpair in a browser) | `/mobile` bundle, MSP-09 | Reused IMP-08 | (handoff) | Pass | (handoff) | (handoff) | Same commit; also rerun in API-02 |
| API-02 | AC-010, AC-002, AC-003 (browser) | Full phone bundle, every MSP case | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web`; `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=/tmp/pnnp-e2e/msp-run1`. Cause of MSP-12's errors: temporary `[DIAG-433]` logging in the route handler, `--cases=MSP-12` (removed). Baseline fix `f7bb05f5ec`; rerun `--cases=MSP-12,MSP-09 --output-dir=/tmp/pnnp-e2e/msp-run2` | ENV-1 | Pass | `API-02-builds.log`, `API-02-mobile-shell-full.log`, `API-02-mobile-shell-probe.json`, `API-02-MSP-12-cause.log`, `API-02-rerun-after-probe-fix.log`, `API-02-MSP-09-connection-sheet.png`, `API-02-MSP-09-sheet-not-reachable.png` | full run: 19 × `Pass`, then `mobile-shell probe: Fail` with `phone-timing console: Failed to load resource: net::ERR_CONNECTION_REFUSED` ×2; cause: `[DIAG-433] fetch failed label=phone-timing … error=route.fetch: Target page, context or browser has been closed` (5 GraphQL loads in flight when `timing context close`); rerun: `mobile-shell probe: Pass`, `unexpected browser errors: []`, `expected MSP-09 refusals recorded: 12`, MSP-09 `"urlLines": 0`, `addressShownDown []` | Harness race, not the product and not this change: the timing phone closes its context at its first row, and the handler answered the cut-off requests as `connectionrefused`. The fix lets such a request end with its context; real refusals are still aborted (MSP-09). TESTING.md rule 9 baseline fix |
| API-03 | AC-010, QR-003 | Android instrumented tests | `cd autobyteus-android && JAVA_HOME=/opt/homebrew/opt/openjdk@17 ANDROID_HOME=~/Library/Android/sdk ANDROID_SERIAL=emulator-5584 ./gradlew :app:connectedDebugAndroidTest` | ENV-2 | Pass | `API-03-android-instrumented-tests.log` | `suite tests=11 failures=0 errors=0 skipped=0`; `pass AutoByteusMobileShellSmokeTest.diagnosticWebShellKeepsRecoveryActionsInOverlay` | Second attempt (first: frozen windowed emulator, see Deviations) |
| API-04 | AC-001, AC-002, AC-009, QR-001, AC-010 (pairing) | App ↔ bridge ↔ page: QR-named node A | Fresh install; share A's pairing link (`am start -a android.intent.action.SEND … -n org.autobyteus.mobile/.MainActivity`); read page; remove `nodeName` from `localStorage['autobyteus.remote_access.mobile_session']` and reload; read page; tap header; read sheet; Switch node | ENV-2 | Pass | `emulator/API-04-01-first-launch.*`, `API-04-03-after-pair.png`, `API-04-04-page-connected.json`, `API-04-05-session-name-removed.json`, `API-04-07-page-reloaded-no-session-name.{json,png}`, `API-04-08-sheet-connected.{json,png}`, `API-04-09-switch-node-one.*` | API-04-07: `"headerName": "Test Desktop"`, `"headerAria": "Test Desktop, Connected. Connection"`, `"sessionNodeName": "(absent)"`, `"helloReply": {… "nodeName": "Test Desktop"}`, `ADDRESS PARTS … none`; API-04-08 `sheetText: "Test Desktop\nConnected\nSwitch node\n1 node on this phone\nUnpair from Test Desktop"`, `"sheetAddressLine": false` | AC-001 reproduced as the user's state: a session without `nodeName` (removed in the stored JSON, keys `entryId, serverBaseUrl, credential, device, pairedAt`) |
| API-05 | AC-004, AC-009, QR-001, RU-01, RU-04 | Typed Tailscale-style address | Other ways to connect › Type an address `http://hostbox-9f3.example-tailnet.ts.net:47331`, tick, Connect; page; Back; ⋮; read `shared_prefs/saved_nodes.xml` with `run-as` | ENV-2 | Pass | `emulator/API-05-03-connecting.{txt,png}`, `API-05-05-typed-page.json`, `API-05-06-first-page-two-nodes.*`, `API-05-07-more-sheet.*`, `API-05-08-saved-entries.txt` | `text: Connected to AutoByteus node`; `"helloReply": {… "nodeName": ""}`; rows `content-desc: AutoByteus node, Online`, `Test Desktop, Online`; ⋮ sheet `text: AutoByteus node`; prefs `'displayName': 'hostbox-9f3.example-tailnet.ts.net'` (stored host, shown as the label: direct use) | The typed node's page shows its own pairing screen; no address in its text |
| API-06 | AC-005, AC-004, AC-003 (page name), RU-02, RU-04 | Typed node B named by its page's pairing | Type `http://nodebox-2c7.home.arpa:47332` + tick (Phone access was off on B: screen captured; turned on; Retry); page › Other ways to connect › paste B's link "Test Node" › Connect; prefs before/after; Back; reopen B | ENV-2 | Pass | `emulator/API-06-02-phone-access-off.*`, `API-06-04-link-pasted.png`, `API-06-06-page-paired.{json,png}`, `API-06-07-saved-entries-before-after.txt`, `API-06-08-first-page-named.*`, `API-06-10-reopened-B.json` | `text: Can’t reach AutoByteus node` / `AutoByteus node is reachable, but Phone access is off.`; prefs `'displayName': 'nodebox-2c7.home.arpa'` → `'displayName': 'Test Node'`, A still `'Test Desktop'`; row `content-desc: Test Node, Online`; header `"Test Node"` with `"nodeName": ""` right after pairing (the handoff's stale-bridge risk; the session's QR name shows), then `"nodeName": "Test Node"` after reopening | RU-02 behaves as the handoff described: no visible difference |
| API-07 | AC-006 | Type an address failures | `ftp://nodebox-2c7.home.arpa:47332` › Connect; also `https://nodebox-2c7.home.arpa:99999` (answers nothing) | ENV-2 | Pass | `emulator/API-07-03-typed-ftp.xml`, `API-07-04-cant-connect.{txt,png}`, `API-07-02-typed-unreachable.{txt,png}` | `text: Can’t connect` / `text: Check the address and try again.`, `no address parts … ftp`; unreachable typed: `text: Can’t reach AutoByteus node` | Unticked `http://` cannot be submitted (Connect disabled); unit-tested only |
| API-08 | AC-001 (not reachable), AC-002 (not reachable), AC-007 (load failure), AC-009 (Can't reach), QR-001, AC-010 (Check/Retry, reachability) | Node A down with its page open; app screens | Stop A; header › sheet › Check; close sheet; page reload; start A; overlay Retry; stop A; Back to the list; tap the typed row and Test Desktop; start A; Retry | ENV-2 | **Fail** | `emulator/API-08-01-sheet-not-reachable.{json,png}`, `API-08-02-header-banner-down.{json,png}`, **`API-08-03-load-failure-overlay.{txt,png}`**, **`API-08-05-back-while-down-error-page.{txt,png}`**, `API-08-04-retry-recovered.{json,png}`, `API-08-06-list-not-reachable.*`, `API-08-08-cant-reach-unnamed.*`, `API-08-09-cant-reach-named.*`, `API-08-10-retry-opens.txt` | Pass parts: `"headerState": "Not reachable"`, `"banner": "Can’t reach Test Desktop.Check"`, sheet without address, rows `Test Desktop, Not reachable`, `text: Can’t reach Test Desktop` / `Can’t reach AutoByteus node`, Retry reopens. **Fail:** the in-page load failure (API-08-03, -05): overlay `text: Can’t reach Test Desktop` / `Check that Tailscale or your Wi-Fi is on and the computer is awake.` is right, but under it WebView's own Chromium error page stays visible: `text: The webpage at ` `text: http://hostbox-9f3.home.arpa:47331/mobile/` `text:  could not be loaded because:` `text: net::ERR_CONNECTION_REFUSED`; in the screenshot the URL is legible in grey above the overlay | Cause (Read + Reproduced): `AutoByteusWebView.Client.onReceivedError` only shows the overlay (`showWebDiagnostic` renders `WebShellScreen` over the same WebView); the WebView keeps rendering Chromium's default error page, which prints the URL. The overlay card does not cover the top of the screen |
| API-08b | AC-007, AC-009, QR-001 | Same failure, user actions only | On A's page: a link that can't open here (overlay) → A stopped (the computer asleep) → **RETRY** | ENV-2 | **Fail** | `emulator/API-08-11-retry-while-down-error-page.{txt,png}` | `text: http://hostbox-9f3.home.arpa:47331/mobile` above `text: Can’t reach Test Desktop`; `ADDRESS FOUND: 'hostbox' … '47331' … 'http://'` | Every main-frame load failure of the open page does this: Retry while down, system Back into history while down, a reload while down |
| API-09 | AC-007 (toast, blocked link, no app) | WebView navigation events on A's page | A full-page test link injected through DevTools and tapped with `adb shell input tap`: `http://hostbox-9f3.home.arpa:47331/settings`; `https://example.com/` (screen recorded); `/mobile/THIRD_PARTY_NOTICES` with `download` (recorded); `mailto:test@example.com` (Gmail opened; then Gmail disabled on the AVD and again) | ENV-2 | Pass | `emulator/API-09-01-link-blocked.{txt,png}`, `API-09-03-external-link-toast{.png,-strip.png,.mp4}`, `API-09-04-download-toast{.png,-strip.png,.mp4}`, `API-09-02-mailto-opens-gmail.*`, `API-09-05-no-app-for-link.{txt,png}` | `text: This link can’t open here` / `AutoByteus on your phone opens only its own pages.`; toast frame `Opening outside AutoByteus` (no URL) for the external link and the download; `text: No app can open this link` / `No app on this phone opens this kind of link.`; `no address parts` on each | The link was injected because an empty node offers no such link; the tap goes through the real `shouldOverrideUrlLoading` / `DownloadListener`. No Chromium error page here (the page is not navigated) |
| API-10 | AC-010, RU-03, AC-009 (Switch node) | Preserved flows | Sheet › Switch node (3 nodes) › Test Desktop; ⋮ › Remove from this phone › Remove (typed node); open Test Node; force-stop + relaunch; sheet › Unpair › Unpair | ENV-2 | Pass | `emulator/API-10-01-sheet-B.json`, `API-10-02-switch-node-three.*`, `API-10-04-switched-to-A.json`, `API-10-05-remove-confirm.*`, `API-10-06-after-remove.*`, `API-10-07-relaunch-opens-last.{json,png}`, `API-10-08-unpair-confirm.png`, `API-10-09-after-unpair.{json,png}` | `content-desc: Test Node, Online, current node`, `AutoByteus node, Online`, `Test Desktop, Online`; `Remove AutoByteus node from this phone? Scan its QR code again to add it back.`; relaunch → `"headerName": "Test Node"`, page `nodebox-2c7.home.arpa:47332/mobile/`; after Unpair `"sessionNodeName": "(no session)"`, pairing screen | Observed outside scope: an overlay stays after a successful Retry → FU-002 |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part: What You Tried And Why It Still Needs The User |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-04 (connected), API-08 (not reachable), API-01 (unit, `ts.net` session) | Proven, apart from a user-only part | The exact user setup, a session paired over HTTPS at a real `*.ts.net` name, was not built. The node refuses an `http://…ts.net` pairing link (`pairing-url-policy.ts`), and the debug app trusts only system CAs, which API 34+ keeps in the Conscrypt APEX, so a test certificate cannot be made trusted. The name rule does not read the address (unit tests with a `ts.net` session; emulator with a `.home.arpa` session and a typed `ts.net` node). The user checks his header after updating both the app and the node |
| AC-002 | Yes | API-04, API-08, API-02 (MSP-09), API-01 | Proven | — |
| AC-003 | No | API-01 (unit), API-02 (MSP-09 browser pairing), API-06 (page names by the session's QR name when the app has none) | Proven | — |
| AC-004 | Yes | API-05, API-06, API-08, API-10, API-01 | Proven | — |
| AC-005 | Yes | API-06, API-01 | Proven | — |
| AC-006 | No | API-07, API-01 | Proven | — |
| AC-007 | Yes | API-09 (toast, download, blocked, no app: Pass); API-08/API-08b (load failure: **Fail**) | **Not Proven** | The load-failure overlay's texts are right, but the screen shows the node URL from WebView's own error page under it |
| AC-008 | No | API-01 (IMP-06 `ConnectionDiagnosticMapperTest`) | Proven | Unit level is the planned verification; no UI shows the diagnostic's exception text |
| AC-009 | Yes | API-04, API-05, API-06, API-08, API-10 | **Not Proven** | First page, connected page, sheet, Switch node and the native Can't reach screens show names only; the in-page Can't reach overlay screen shows the URL (API-08-03, -05, -11) |
| AC-010 | Yes | API-02, API-03, API-04, API-06, API-08, API-10 | Proven | — |
| QR-001 | Yes | as AC-009 | **Not Proven** | Same screen |
| QR-003 | No | API-01 (`ShellBridgeMessagesTest`), API-03 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 50% | API-04…API-10 prove everything except the in-page load-failure screen | AC-007/AC-009/QR-001 fail on that screen | The fix, then API-08/API-08b again |
| Changed-boundary execution directness | 75% | 95% | Real bridge `hello` both ways, real store, real WebView events (API-04…API-09) | — | — |
| Cross-boundary integration realism and mock gap | 70% | 95% | Two real nodes from the worktree, real DNS names as Host, real pairing, real network failure | Network failure by a stopped node, not a sleeping computer (same WebView error) | — |
| Environment, configuration, identity, and fixture fidelity | 75% | 90% | Android 15 emulator, real WebView 124, test names | No HTTPS `*.ts.net` session (user part); one WebView version | The user's phone after release |
| Failure, edge-case, lifecycle, and recovery evidence | 70% | 50% | Not reachable, Phone access off, Can't connect, Retry, relaunch, Unpair, Remove, stale bridge | The load-failure screen leaks the URL | Rerun after the fix |
| User-surface, browser, and desktop-shell confidence | 80% | 50% | MSP probe (browser), emulator screens | Same failing screen | Rerun after the fix |
| Durable regression coverage quality and relevance | 85% | 85% | Unit tests at both ends, probe MSP-09, instrumented smoke | No durable test fails on the leak: `diagnosticWebShellKeepsRecoveryActionsInOverlay` checks the overlay, not what is behind it | A durable check that a main-frame load failure leaves no URL visible (for example, an instrumented test of the shown page's text after `onReceivedError`) |

- Overall post-repository confidence: 76%
- Overall final confidence: 66% (simple average)
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-007, AC-009, QR-001)
- Any final applicable category below `90%`: `Yes`: requirement proof 50%, failure evidence 50%, user surface 50%, durable coverage 85%
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: the failing load-failure screen; after its fix, the HTTPS `*.ts.net` session remains for the user

## Broader Validation Decision (Mandatory)

- Decision: `Required` (ran)
- Execution mode: `Browser` (MSP probe), `Other` (Android emulator with two worktree nodes, test DNS, WebView DevTools)
- Confidence gap or residual risk it addresses, and the expected gain: the real bridge reply with a nameless session (AC-001), native screens, real WebView events and failures; gained direct proof for all but one screen, and found that screen's leak
- Browser validation needed, and why or why not: yes, the `/mobile` bundle's paired screens (MSP probe); the app's WebView was driven on the emulator
- If `Blocked`: N/A

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data used: a typed entry stored as `displayName` = its host (the shape both the released and the new app write for a typed address), and a page session without `nodeName`
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the direct-use outcome: API-05 (`'displayName': 'hostbox-9f3.example-tailnet.ts.net'` shown as "AutoByteus node", not rewritten), API-06 (rewritten only when its page paired), API-04 (session without `nodeName` read normally)
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: None

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes` (one baseline fix)

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (phone route handler) | Updated (`f7bb05f5ec`, baseline fix) | API-02 | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct route); attached to the failure package for information
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| A phone | Android 15 emulator (`google_apis`) | No physical phone attached | One WebView version (124) |
| The user's network names | Test DNS answering test names with `10.0.2.2` | Never the user's names or tailnet | Plain HTTP, not Tailscale Serve HTTPS |
| A session paired before names were kept | `nodeName` removed from the stored session JSON through DevTools | Building it with an old server needs the released stack | Same stored shape |
| Links in a conversation | A test link injected into the page through DevTools, tapped with `adb input tap` | An empty node has no messages with links | The click handling is the real WebView path |
| A computer going to sleep | Node process stopped | — | Same WebView error (`ERR_CONNECTION_REFUSED`); a sleeping machine may give a timeout instead, still a main-frame error |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `[DIAG-433]` logging in `mobile-shell-probe.mjs` | Yes | `git checkout` of the file before the fix | Removed, never committed |
| Test nodes A and B (`127.0.0.1:47331/47332`) and their data roots | Yes | `node.sh stop`; `rm -rf /tmp/pnnp-e2e/nodes` | 0 listeners (`emulator/cleanup.log`) |
| Test DNS responder (UDP 53) | Yes | kill | `udp 53: 0` |
| AVD `pnnp433_api35`, its emulator, app data, adb forwards, Gmail disabled | Yes | `adb forward --remove-all`, `pm enable`, `adb uninstall`, `adb emu kill`, `avdmanager delete avd` | `AVD 'pnnp433_api35' deleted.`; `my emulator processes: 0`; the other agent's `emulator-5554` untouched |
| MSP probe stacks | Yes | probe `finally` | `serversLeft: 0, rootRemoved: true` |
| `/tmp/pnnp-e2e` probe outputs and frames | Yes | `rm -rf` | removed; harness scripts kept in `/tmp/pnnp-e2e/scripts` for the rerun |

## Preliminary Classification (On `Fail`)

- Classification: `Design Impact` (preliminary)
- Evidence: REQ-006 and the requirements' observable definition of success ("screenshots of … Can't reach and the in-page error overlays show node names and no address"), AC-007 and QR-001 cover this screen. The design's DS-004 and its exact texts change only the overlay's text. When the open page's main frame fails, the WebView keeps rendering Chromium's default error page ("The webpage at <URL> could not be loaded because: …"), which shows above the overlay card. The implementation did what the design specified (the overlay texts match word for word); what is missing is a design decision about what the WebView shows behind the overlay. Options include loading a blank page or the app's own error page into the WebView on a main-frame error, or a full-screen opaque overlay, and how Retry/Back then behave (see FU-002).
- Recommended owner: Solution Designer, after failure-origin review by the code reviewer.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, or parts only the user can check (IDs): not proven AC-007 (load failure), AC-009 (in-page Can't reach overlay screen), QR-001; user-only part of AC-001 (HTTPS `*.ts.net` session on his phone)
- Preliminary classification and recommended owner: `Design Impact`; Solution Designer (via failure-origin review)
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review)
- Notes: everything else passed, including all names, the sheet, the bridge, the stored entries and the preserved flows. The rerun after the fix needs API-08 and API-08b (and API-03 if the fix touches `MainActivity`/`AutoByteusWebView`/`WebShellScreen`); the other cases stay valid when the fix touches only the WebView error handling. Out of scope: FU-002 (overlay stays after a successful Retry).
