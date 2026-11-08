# API/E2E Coverage Investigation — phone-node-name-privacy (autobyteus-433)

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/requirements-doc.md` (Approved, SR-001)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/solution-revision-record.md`
- Design Spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/design-spec.md` (Ready, SR-002)
- Supplemental Task Artifacts: None
- Design Review Report: `N/A — not applicable` (architecture review not selected: Medium / Low)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: Implementation Complete, IR-001 (code `ba3ba5b23e`, documents `8f87b1ef49`), direct API/E2E route
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

Everywhere on the phone, a node is shown by its name and its state, never by its address (REQ-001…REQ-008). The `/mobile` page names the open node by the Android app's name for it (new `nodeName` in the bridge `hello` reply), then the session's QR name, then "AutoByteus node" (DS-001). The connection sheet has no address line (REQ-002). The Android app shows `SavedNodeEntry.shownName` on every screen (REQ-003). An unnamed open node takes the QR name when its page pairs (REQ-005, DS-003). An unusable typed address shows "Can’t connect" (REQ-004). Toasts, overlays and diagnostics carry no URL, WebView error text or exception text, with the exact texts in the design spec (REQ-006, REQ-007, DS-004). The pairing page uses the same name rule and reports only the QR name (REQ-008, DS-005). Preserved: pairing, Switch node, Unpair, Check/Retry, reachability, Remove, opening the last node (AC-010); the bridge's origin/main-frame rule (QR-003). Persisted data: `Directly Usable — No Migration`.

Independent architecture and source review were not selected (direct route); the design spec and its post-design classification (`Medium` / `Low`) are present and confirmed in the implementation handoff.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001…SCN-006.
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - RU-01: a node added by typing a Tailscale (`*.ts.net`) address that is not paired: its row, Switch node, Connecting/Connected and the page with its own pairing. Trigger: Other ways to connect › Type an address. (The node refuses an `http://…ts.net` pairing link; the user's real Tailscale path is HTTPS through Tailscale Serve, so a paired `ts.net` session needs a TLS certificate the emulator trusts: see Not Tested.)
  - RU-02: the open page of a node that was just named by its page's pairing (the "stale bridge entry" risk in the handoff): what the header and a load-failure overlay show before the node is reopened. Trigger: pairing from the typed node's page, then a page reload / node down.
  - RU-03: app restart opens the last used node (AC-010) with its name. Trigger: force-stop and relaunch.
  - RU-04: a saved typed entry whose stored `displayName` is its host (the shape both the released and the new app write for a typed address), shown through the normal reader: the direct-use persisted-data proof.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): None recorded. The "page pairs with another node's pasted link" (handoff risk 2) is existing trust behavior, not a supported scenario of this ticket; not tested as a defect.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 page name order (app → session → label) | Changed | design DS-001; `MobilePairedShell.vue` | Web unit (IMP-02); emulator: real bridge `hello` with a session without `nodeName` (AC-001) |
| BEH-002 sheet without address | Removed (line) | `MobileConnectionSheet.vue` | Web unit, MSP-09 (IMP-08); emulator sheet text, connected and not reachable |
| BEH-003 app `shownName` | Changed | `SavedNodeEntry.kt`, readers | Android unit (IMP-06); emulator rows, Switch node, Connecting, Connected, Can't reach, ⋮ sheet |
| BEH-004 typed node named on pairing | Added | `NodeConnectionFlow.onPaired` | Android unit; emulator real pairing from the typed node's page |
| BEH-005 "Can’t connect" | Changed | `connectTyped` | Android unit; emulator both failure kinds |
| BEH-006 toast/overlay texts | Changed | `AutoByteusWebView`, `MainActivity` | Android unit (texts); emulator real WebView events |
| BEH-007 no exception text | Changed | `fromException` | Android unit (AC-008) |
| BEH-008 pairing page label | Changed | `MobilePairingBootstrap.vue` | Web unit |
| Bridge `hello` reply `nodeName` | Added (contract) | `ShellBridge.kt`, `shellBridge.ts` | Unit both ends; emulator end to end |
| Origin/main-frame rule | Preserved | QR-003 | `ShellBridgeMessagesTest` (IMP-06); instrumented smoke test |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | Yes | app↔page `hello` reply (WebMessage bridge) | Unit tests on each end with a stubbed other end | The real WebView message channel and timing (hello answered before / after first render) | Emulator + WebView DevTools |
| Frontend component / state | Yes | `/mobile` header, sheet, pairing page | Web unit (IMP-02), MSP-09 (IMP-08) | Rest of the phone bundle's paired screens after the new `onMounted` hello | Full mobile-shell probe |
| Browser integration / user journey | Yes | `/mobile` in a browser (no bridge) | MSP-09 | Other MSP cases | Full mobile-shell probe |
| Authentication / session / permissions | Yes (read only) | session `nodeName` absent (pre-395 sessions) | Web unit with a synthesized session | A real WebView localStorage session without `nodeName` | Emulator, localStorage edited through DevTools |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | Android: Connecting/Connected/Can't reach screens, page load failure, toast, relaunch | JVM unit tests of flow and texts | Native rendering, real WebView errors, Activity lifecycle | Emulator, instrumented tests |
| Persisted-data transition | Yes (direct use) | `saved_nodes` entries with `displayName == host` | `SavedNodeEntryTest`, `NodeConnectionFlowTest` | The real store and UI | Emulator, `run-as` read of the prefs |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | Android intents (browser / no app), DNS names | — | Whether a real intent target exists | Emulator |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy`, branch `codex/phone-node-name-privacy`
- Project type and runtime stack: pnpm monorepo; Nuxt web (`/mobile` bundle served by the node), Node server (`autobyteus-server-ts/dist/app.js`), Android Kotlin WebView app (Gradle, JDK 17)
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/TESTING.md` (no closer `TESTING*.md` in `autobyteus-android/` or `autobyteus-web/`)
- Conflicting, missing, or unclear project instructions: `TESTING.md` has no Android layer row; the Android layers come from `autobyteus-android/README.md` (unit, build, `connectedDebugAndroidTest` on an emulator, live checks per `docs/android_mobile_access.md`). Not a conflict; recorded.
- Changed build-input paths: `None` (`git diff --name-only eebbc2b8ee...HEAD` lists source, test and ticket files only; no manifest, lockfile, Gradle, config or workflow file; the one new import, `~/utils/remoteAccess/nodeName`, is inside `autobyteus-web`). No fresh-start build case.
- Required environment variables or secrets available: `N/A` (no provider, no secret)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing rules | Web unit `test:nuxt`; phone bundle behavior proven by `test:e2e:mobile-shell` on the production build; rerun by impact; one heavy run at a time; never the user's AutoByteus or data; own data roots/ports |
| `autobyteus-android/README.md` | Android build and tests | `./gradlew :app:testDebugUnitTest`, `:app:assembleDebug`, `:app:connectedDebugAndroidTest` on an emulator; rebuild the `/mobile` bundle as well as the APK |
| `docs/android_mobile_access.md` | Device checklist | ADB bridges allowed; record device and mappings; `adb reverse/forward --remove-all` on cleanup |
| `autobyteus-server-ts/docs/features/remote_access.md` | Node Host/Origin rules | `.ts.net`, `.home.arpa` hosts pass the Host rule; HTTP pairing only for trusted private hosts (`.home.arpa` yes, `.ts.net` no) |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` header | Probe | Needs `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web build:mobile-web`; about 6 minutes; fresh `--output-dir` |
| `tickets/done/one-step-phone-pairing/api-e2e-execution-coverage-report.md` | Prior phone emulator run | AVD `autobyteus277_api35`; emulator reaches the host as `10.0.2.2`; Share (`ACTION_SEND`) pairs a link |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Builds | worktree | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web`; `./gradlew :app:assembleDebug` (JDK 17) | serialized | `dist/app.js`, `autobyteus-web/dist/public/index.html`, APK hash | build outputs untracked |
| Test nodes A ("Test Desktop") and B ("Test Node") | `autobyteus-server-ts` | `node dist/app.js --host 127.0.0.1 --port <free> --data-dir <tmp>/<node>/data`, own `HOME`, `APP_ENV=test` | serve `/mobile` from this worktree's bundle | `GET /rest/health` 200; `/mobile` contains `/mobile/_nuxt/` | SIGTERM; `rm -rf` the temp root |
| Test DNS responder | `/tmp/pnnp-e2e/scripts` | `python3 dns.py` on UDP 53, answers only 127.0.0.1 clients; maps `hostbox-9f3.home.arpa`, `nodebox-2c7.home.arpa`, `hostbox-9f3.example-tailnet.ts.net` → `10.0.2.2`; other names forwarded | gives the emulator realistic node names | `dig @127.0.0.1` | kill |
| Android emulator | SDK | `emulator -avd pnnp433_api35 -dns-server 127.0.0.1 -no-snapshot -no-audio` (ticket-owned AVD cloned from the `google_apis` API 35 image) | does not touch the team AVDs | `sys.boot_completed=1` | `adb emu kill`; `avdmanager delete avd` |
| WebView DevTools | adb | `adb forward tcp:<p> localabstract:webview_devtools_remote_<pid>` (debuggable APK) | CDP over `ws` | `/json` lists the page | `adb forward --remove-all` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Pairing links named "Test Desktop" / "Test Node" | Node REST `PUT /rest/remote-access/settings`, `POST /rest/remote-access/pairing-sessions` (as the desktop's Phone Setup does) | test-owned nodes only | removed with the data roots |
| A page session without `nodeName` (paired before names were kept) | Delete `nodeName` from the WebView `localStorage` session through DevTools after pairing | reproduces the stored shape only; credential untouched | app data removed with `pm clear` / uninstall |
| Test names only | "Test Desktop", "Test Node", hosts `hostbox-9f3…`, `nodebox-2c7…` | no user names or addresses | — |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design-spec › Persisted Data / State Transition Decision; handoff › Persisted Data Transition Check
- Representative existing-data setup and required behavior: a typed entry stored with `displayName` = its host (the shape the released app also writes for a typed address); it must read as "AutoByteus node" through the normal reader without being rewritten, and take the QR name when its page pairs.
- Evidence planned: emulator `run-as org.autobyteus.mobile cat shared_prefs/<saved nodes file>` before and after pairing, with the UI texts (API-06, RU-04); unit tests (IMP-06).
- Migration-specific scenarios: N/A
- Upstream ambiguity or reroute required: None

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/mobile/__tests__/MobileRemoteAccessShell.spec.ts` | Name order, browser label, banner, no address in header/aria/sheet | REQ-001, AC-001, AC-003 | Still Valid | Read; IMP-02 Pass | Reuse IMP-02 |
| `autobyteus-web/components/mobile/connection/__tests__/MobileConnectionSheet.spec.ts` | No `mobile-connection-url`; no address both states | REQ-002, AC-002 | Still Valid | IMP-02 | Reuse |
| `autobyteus-web/components/mobile/__tests__/MobilePairingBootstrap.spec.ts` | QR without name → label; `paired('')` | REQ-008, AC-003 | Still Valid | IMP-02 | Reuse |
| `autobyteus-web/utils/remoteAccess/__tests__/nodeName.spec.ts` | First non-blank, trim, label | REQ-001 | Still Valid | IMP-02 | Reuse |
| `autobyteus-android/.../connection/SavedNodeEntryTest.kt` | known/shown name, legacy host name | REQ-003 | Still Valid | IMP-06 | Reuse |
| `autobyteus-android/.../shell/NodeConnectionFlowTest.kt` | shownName to screens; Can't connect; naming on paired | REQ-003…005, AC-005, AC-006 | Still Valid | IMP-06 | Reuse |
| `autobyteus-android/.../web/ShellBridgeMessagesTest.kt` | reply carries `nodeName`; origin/main-frame rule | REQ-001, QR-003 | Still Valid | IMP-06 | Reuse |
| `autobyteus-android/.../connection/ConnectionDiagnosticMapperTest.kt` | exact texts; no host/exception text | REQ-006, REQ-007, AC-007, AC-008 | Still Valid | IMP-06 | Reuse |
| `autobyteus-android/app/src/androidTest/.../AutoByteusMobileShellSmokeTest.kt` and the other instrumented tests | WebView shell smoke, insets, rotation | AC-010 | Still Valid (call-site rename only) | compiled in IMP-07, never run | Run (API-03) |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` MSP-09 | Sheet with no host, port or `://`, both states | REQ-002, AC-002, AC-010 | Still Valid | IMP-08 Pass | Reuse IMP-08 |
| `mobile-shell-probe.mjs` other MSP cases | Paired phone journeys on the production bundle | AC-010 | Still Valid | not run this ticket | Run (API-02) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001…AC-008 (unit level), AC-010 (suites), QR-003 | Web unit, guards, typecheck; Android JVM unit; APK build | Reused | IMP-02, IMP-04, IMP-05, IMP-06, IMP-07 | Ran on `ba3ba5b23e`; `git diff --name-only ba3ba5b23e HEAD` lists only ticket files; the changed web modules are imported only by `components/mobile/**` (grep), all inside IMP-02's scope; each log has a header and its result line |
| API-01b | AC-002, AC-010 (sheet, Unpair, Check/Retry in a browser) | `/mobile` production bundle, MSP-09 | Reused | IMP-08 | Same commit; `MSP-09 Pass` with `urlLines 0` |
| API-02 | AC-010, AC-003 (browser) | Full phone bundle, every MSP case | Existing Test | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web`; `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<fresh>` | `MobilePairedShell` (every paired screen's parent) gained an `onMounted` hello; only MSP-09 ran |
| API-03 | AC-010, QR-003 | Android instrumented tests on the emulator | Existing Test | `./gradlew :app:connectedDebugAndroidTest` (JDK 17) | Never run for this change; `AutoByteusMobileShellSmokeTest` call site changed |
| API-04 | AC-001, AC-002, AC-009, QR-001, AC-010 (pairing) | Emulator: QR-named node A "Test Desktop" at `http://hostbox-9f3.home.arpa:<A>` via Share | Journey | Fresh install; share A's link; first page, Connecting, Connected, header; DevTools: remove the session's `nodeName`, reload; header, aria label, sheet text; uiautomator dumps + screenshots | AC-001 needs the real bridge reply with a nameless session |
| API-05 | AC-004, AC-009, QR-001, RU-01 | Emulator: typed `http://hostbox-9f3.example-tailnet.ts.net:<A>` with the tick (Tailscale-style name) | Journey | Type an address; Connecting/Connected; the page's own pairing screen; first page row; ⋮ sheet; Switch node | Typed entries were named by their host |
| API-06 | AC-005, AC-004, RU-02, RU-04 | Emulator: typed node B `http://nodebox-2c7.home.arpa:<B>`, then its page pairs with B's link "Test Node" | Journey | Type an address; read prefs; paste B's link on its page; Connect; prefs; Back to the list; row "Test Node"; header; page reload | Real `paired` → `onPaired` → store |
| API-07 | AC-006 | Emulator: Type an address failures | Journey | `http://nodebox-2c7.home.arpa:<B>` without the tick; `ht tp://` (unreadable) | "Can’t connect", typed text absent |
| API-08 | AC-001 (not reachable), AC-002 (not reachable), AC-007 (load failure), AC-009 (Can't reach), AC-010 (Check/Retry, reachability) | Emulator: node A stopped and restarted | Journey | A's page open, stop A: header, banner, sheet with diagnostic, Check; reload → overlay; back to list: row Not reachable; tap → Can't reach screen; start A; Retry | Real network failure through the real WebView |
| API-08b | AC-007, AC-009, QR-001 | Emulator: the API-08 finding by user actions only | Journey | A's page: a link that can't open here → node A stopped → overlay RETRY | Added in execution: proves the leak without DevTools |
| API-09 | AC-007 (toast, blocked link, no app) | Emulator: WebView navigation events on A's page | Journey (DevTools-injected link clicks) | DevTools: click an `https://example.com/` link, a same-origin `/rest/…` link outside `/mobile`, a `mailto:` link, a download of a node file; screenshots for toasts, uiautomator for overlays | No page in an empty node offers these links; the click enters the real `shouldOverrideUrlLoading` / `DownloadListener` |
| API-10 | AC-010, RU-03 | Emulator: Switch node, Remove, Unpair, relaunch | Journey | Switch node from the sheet A→B; ⋮ Remove on the ts.net entry; force-stop + relaunch opens the last node; Unpair from the sheet | Preserved flows |

- Test progress log needed: `Yes`

## Durable Coverage To Add

None planned. The repository already has unit coverage at both ends of every changed boundary (IMP-02, IMP-06) and the phone-bundle probe (MSP-09). The emulator journeys need a test-owned DNS name, two nodes and WebView DevTools; the project has no Android device-journey harness (`docs/android_mobile_access.md` is a manual checklist), so they run as ticket-owned journeys outside the repository.

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-02 | `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (phone route handler) | A request cut off by the probe closing a phone's context must not be answered as `connectionrefused` | Added in execution after the cause was proven (TESTING.md rule 9 baseline fix, `f7bb05f5ec`) |

## Durable Coverage To Remove

None (the host-asserting test was already rewritten in IR-001 per the design's removal plan).

## Live Environment And Fixture Plan

- Startup order and commands: builds (serialized) → DNS responder → nodes A and B → emulator (own AVD, `-dns-server 127.0.0.1`) → install APK → journeys. The MSP probe (API-02) runs alone before the emulator journeys (one heavy run at a time).
- Environment choices that materially affect the run: node names resolve through the test DNS to `10.0.2.2`, so the phone's Host is the real name as on a LAN/tailnet; nodes bind `127.0.0.1` only.
- Health / readiness checks: `/rest/health`; `/mobile` served; `adb shell getprop sys.boot_completed`; DevTools `/json`.
- Seed data / fixtures: two pairing sessions over REST; no runs (an empty node shows "No runs yet": the header, banner and sheet are the same).
- Test identities: device name is the emulator's model; names "Test Desktop", "Test Node".
- Requirement-linked journeys: API-04…API-10.
- Evidence to capture: uiautomator XML text per screen (assertions), DevTools DOM text/aria (assertions), screenshots (support), shared-prefs reads, node logs.
- Owned processes and temporary state to clean up: nodes, DNS responder, emulator and its AVD, adb forwards, `/tmp/pnnp-e2e` data.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| A page session paired over HTTPS at a real `*.ts.net` name (the user's own setup) | The node accepts only HTTPS pairing for a `ts.net` name; the debug app trusts only system CAs and API 34+ keeps them in the Conscrypt APEX, so a test certificate cannot be trusted without rebuilding the system image. The name rule does not depend on the address kind (unit tests cover a `ts.net` session) | Low | Yes (his phone and node after the release) | Delivery: ask the user to look at his header after updating both the app and the node |
| `Scan` with the camera | Unchanged; Share is the same `connect` path | None for this ticket | No | — |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| On a main-frame load failure of the open page, WebView's own Chromium error page ("The webpage at http://<host>:<port>/mobile/ could not be loaded because: net::ERR_CONNECTION_REFUSED") stays visible above the "Can’t reach <name>" overlay (found in execution) | `Design Impact` (preliminary; failure-origin review decides) | `evidence/emulator/API-08-03-load-failure-overlay.*`, `API-08-05-back-while-down-error-page.*`, `API-08-11-retry-while-down-error-page.*` | Solution Designer via code reviewer |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (executed; result `Fail`, see the execution report)
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: —
- Notes: harness scripts live in `/tmp/pnnp-e2e/scripts` (outside the repository); their outputs are evidence files.
