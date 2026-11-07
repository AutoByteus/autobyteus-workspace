# Implementation Handoff — one-step-phone-pairing (autobyteus-395, with autobyteus-391)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Large / High → independent architecture review `Pass` (ARCH-REV-003); the source-review rule applies to this handoff.
- Requirements doc: [requirements-doc.md](requirements-doc.md) (`Approved`, SR-013; DEC-001…024)
- Investigation notes: [investigation-notes.md](investigation-notes.md) (E-01…E-27)
- Solution revision record: [solution-revision-record.md](solution-revision-record.md) (SR-001…SR-014)
- Design spec: [design-spec.md](design-spec.md) (SR-014, `Ready`, user approval `Obtained`)
- Supplemental task artifacts: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/one-step-phone-pairing/ui-ux-spec.md` (VIS-001…034); [follow-ups.md](follow-ups.md)
- Design review report: [design-review-report.md](design-review-report.md) (ARCH-REV-003 `Pass`; its working-tree edits are the reviewer's and are left uncommitted)
- Architecture review revision record: [architecture-review-revision-record.md](architecture-review-revision-record.md)
- Triggering rework report: N/A (initial implementation)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: [implementation-revision-record.md](implementation-revision-record.md)
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-014`
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review / API-E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`
- Branch `codex/one-step-phone-pairing`; implementation commits `d92d94472f` (feature), `b2c7239d5e` (spec typing), `55fdae0a34` (page reason text); this handoff and evidence in the commit after them.

**Server (`autobyteus-server-ts/src/remote-access`).** `NodeNetworkService` reports this computer's network facts (`GET /rest/remote-access/network`) from `os.networkInterfaces()`, one reverse lookup per `100.64/10` tunnel address (1 s), the default route (macOS `route`/`arp`; Linux `/proc/net/route`/`/proc/net/arp`) and the computer name; in a container it reports no addresses and its own `this-computer` answer. Pure rules in `network-interface-classifier.ts`, IPv4 ranges in `ip-address-ranges.ts` (the pairing URL policy imports them; rules unchanged), network ID in `default-route.ts`, allowed networks in `allowed-local-network-store.ts` (`PUT /network/local-networks/:networkId`). Pairing sessions require `connectionWay`, return an opaque `sessionId` (`DELETE /pairing-sessions/:sessionId`, 204), are all discarded when Phone Access turns off, keep a consumed code until it expires (second use → `CONSUMED`), and the device record carries the way. Status drops `serverName`; the candidates route and service are removed; route policy lists the new owner routes.

**Desktop (`autobyteus-web`).** `PhonesPanel` (+ `PhoneWayTab`, `PhoneCodeBlock`, `ConnectedPhones`) replaces the two Phone Setup cards. `phoneAccessStore` loads facts and status, recognises the node kind, composes ways with the pure `phoneConnectionWays` (per-kind table of the design), checks every candidate in parallel (2 s, same node ID), pre-selects the best ready way, and owns the code lifecycle (create, timer expiry, discard on close / tab change / new code / leaving / Wi-Fi switch off), the Phone access switch, allow/forget of the local network on the node that keeps it (embedded node for this computer's nodes), the typed company address (checked by node ID, DEC-021/022), and devices. `tailscaleServeCommand` builds the optional Serve command (443 for the embedded node, `8443 + k` by entry `createdAt` for other nodes on this computer, never `serve reset`). en and zh-CN texts.

**`/mobile`.** `shellBridge.ts` wraps `window.AutoByteusShell`. The pairing page pairs at once in the app (bridge `hello` → model name → exchange → `paired`), shows Connecting / can't-reach (expired, used, phone access off, no answer) with Scan again and back; in a browser it is the VIS-032/033 page with one tap. The session keeps `nodeName`; the paired shell names the node from it (host when absent) and the post-pair screen reads "Connected to <node> / Opening your runs…". The node sheet has refresh icon / Retry, Switch node only in the app, "Unpair from <node>"; peer list removed.

**Android.** `NodeConnectionFlow` owns the connect sequence (parse → check → open page; save on `paired` for pairing links, on reachable for typed addresses, select for saved entries; plain-words reasons). `ShellBridge` registers the androidx.webkit listener for the entry's origin before `loadUrl`, acts only on main-frame messages from that origin. Screens: `StartScreen`/`NodeRow` (start + Switch node mode, reachability via `NodeReachability`), `ScanScreen` (journeyapps `BarcodeView`, own brackets), `ConnectingScreen` (connecting / connected), `CantReachScreen` (also "Update Android System WebView" when `WEB_MESSAGE_LISTENER` is missing), `TypeAddressSheet` (DEC-017 wording), `RemoveNodeSheet`. `ConnectionInputResolver` acknowledges parsed pairing links and requires the tick for typed `http://`. `ConnectionScreen.kt` and the write-only `AndroidAppShellViewModel` are removed; `QrScanCoordinator` is now only the camera-permission gate.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section: design-spec "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence: ~123 files across server, desktop web, `/mobile` and Android; new owner routes, a persisted file, additive record fields, a native-to-page bridge and per-OS detection — as the design described. No escalation trigger fired: macOS detection measured (IMP-05); Linux parsers covered by recorded fixtures (real Linux host check still open, below); the 403 Origin rule did not block renderer checks (IMP-09); the bridge needs no permission and works on an `http://<IPv4>:<port>` origin (IMP-10).
- Selected route: `Code Review`
- Lightweight implementation self-review for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Tabs from detected ways; best ready way pre-selected; code per way; Wi-Fi once per network; Advanced command | `node-network-service.ts` → `GET /network` → `phoneAccessStore.load` → `phoneConnectionWays` → status checks → `PhonesPanel`/`PhoneWayTab`/`PhoneCodeBlock` → `POST /pairing-sessions` | Done; real macOS host: Tailscale recommended, code made, Wi-Fi question/allowed/forget (IMP-09) |
| BEH-002 | Docker node: host facts + published port, checked against the Docker node; blocked message | `recognizeNodeKind` (`runsInContainer` + loopback) → embedded node `/network` → compose with node port; allow kept by embedded node | Done; store spec (Docker cases). Not run against a real container (API/E2E) |
| BEH-003 | Remote node: own facts + desktop's address classified; typed company address checked | `composeConnectionWays(kind:'remote')`, `useTypedAddress` | Done; composer + store specs |
| BEH-004 | App scan/paste/share connects without questions; browser one tap | `ConnectionInputResolver.resolvePairingLink`, `NodeConnectionFlow.connect`, `MobilePairingBootstrap` + `shellBridge` | Done; shared link paired at once on emulator (IMP-10); browser one tap (IMP-09) |
| BEH-005 | Names from QR; scan-first list; Switch node from the page | `NodeConnectionFlow.onPaired`, `StartScreen`, bridge `showNodeList`, session `nodeName` | Done; emulator (IMP-10); E-10 unit test |
| BEH-006 | Phones list with way, last seen, Revoke, quiet Revoke all, History (n) | `ConnectedPhones.vue`, device `connectionWay` | Done; AC-012 component test (1 active, History (31)) |
| BEH-007 | QR payload unchanged; existing records/sessions/saved nodes read as before | Payload untouched; `paired-device-store` reads absent way as `null`; page session `nodeName` optional; `SavedNodeStore` shape unchanged | Done; legacy device row test; old session shows host |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Server: `src/remote-access/services/{node-network-service,network-interface-classifier,default-route,computer-name,ip-address-ranges,remote-access-pairing-service,paired-device-service,pairing-url-policy}.ts`, `src/remote-access/stores/{allowed-local-network-store,paired-device-store}.ts`, `src/remote-access/domain/{models,remote-access-close-codes}.ts`, `src/api/rest/remote-access.ts`, `src/api/security/remote-access-route-policy.ts`, `docs/features/remote_access.md`; removed `services/address-candidate-service.ts`.
- Desktop: `components/settings/phone/*`, `stores/phoneAccessStore.ts`, `utils/phoneAccess/{phoneConnectionWays,tailscaleServeCommand}.ts`, `utils/phoneAccessRemoteNode.ts`, `types/remoteAccess.ts`, `components/settings/NodeManager.vue`, `localization/messages/{en,zh-CN}/settings.ts`; removed the two cards, `phoneSetupGuideCommands.ts`, `phoneAccessPairingUrlPolicy.ts` and their specs.
- `/mobile`: `utils/remoteAccess/shellBridge.ts`, `components/mobile/{MobilePairingBootstrap,MobilePairedShell,MobileRemoteAccessShell}.vue`, `components/mobile/connection/MobileConnectionSheet.vue`, `stores/mobileNodeSessionStore.ts`.
- Android: `shell/{NodeConnectionFlow,NodeReachability,ConnectionInputResolver,QrScanCoordinator}.kt`, `web/{ShellBridge,AutoByteusWebView}.kt`, `ui/{ShellUi,start/*,connect/*,sheets/*}.kt`, `MainActivity.kt`, `connection/{ConnectionValidator,ConnectionDiagnosticMapper,SavedNodeStore}.kt`, `res/drawable/ic_*.xml` (Heroicons, MIT), `app/build.gradle.kts` (`androidx.webkit:webkit:1.12.1`; test-only `org.json`).
- `GLOSSARY.md` (Way to connect, Node network, Local network / network ID, Allowed local network, Shell bridge).
- Probes updated for the required `connectionWay`: `autobyteus-web/tests/e2e/{mobile-shell-probe,node-vocabulary-probe,composer-context-file-removal-probe,owner-scoped-file-reads-probe}.mjs`, `large-runs-load-less-cases.mjs`, `workspace-views-chooser-cases.mjs`.

## Important Assumptions

Small choices made inside the design; none changes an approved behavior:
- The Advanced Serve command shows for the desktop's node and nodes on this computer only; hidden for remote nodes (its text says "on this computer", and the port rule covers this desktop's nodes).
- With no ready way, the Tailscale tab opens (as VIS-014).
- "Get the Android app" links to `https://github.com/AutoByteus/autobyteus-workspace/releases/latest` (E-19).
- Copy the spec does not draw: Android can't-reach title "Can’t connect" for an unreadable scan (no node name); typed address that cannot be read: "Check the address and try again."; "Update Android System WebView" screen body and "Open Google Play". `/mobile` paste field: "That isn’t an AutoByteus pairing link." Desktop "Last seen" / "Not used yet"; history line omits "Connected through" for rows without a way.
- Server: an expired code now answers `REMOTE_ACCESS_PAIRING_EXPIRED` once (lookup before prune) instead of being pruned silently; afterwards `INVALID` (same text on the phone).
- A saved node's page opens behind the native "Connected to <node> / Opening your runs…" until its first page load; a pairing link keeps the native Connecting screen until the page takes over with its own states.
- The browser path keeps posting the exchange to the payload's base URL (the page's origin in every supported flow).

## Known Risks

- U-001/U-004/U-005 on Linux: parsers and classifier covered by recorded Linux fixtures; a real Linux host check (Docker image host or CI runner) remains for API/E2E.
- U-003: renderer status checks verified from the dev renderer (loopback origin); packaged build (`file://` origin) not run.
- U-006: Tailscale Serve `--https=8443…8542` not run (optional text only).
- `WEB_MESSAGE_LISTENER` missing → "Update Android System WebView" instead of pages (accepted in review).
- Emulator: one ANR on the first cold start after boot, in the framework render thread during activity stop (no app frame); not reproduced.
- Pre-existing, unchanged: `am start` of SEND into the running activity does not reach `onNewIntent` (standard launch mode); shares from other apps start a new instance through `onCreate` (verified).
- `mobile-shell-probe.mjs` MSP-09 still asserts the removed peer list and status `serverName`: API/E2E to update the case (request bodies already fixed).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Larger Requirement` (feature with replacement)
- Reviewed root-cause classification: `Boundary Or Ownership Issue` (+ `Shared Structure Looseness`)
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`
- Routed as `Design Impact`: `N/A`
- Evidence: facts owner on the node, way policy on the desktop, connect sequence in `NodeConnectionFlow`, old cards/screen/route removed.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes` (`getSessionForTests`, `pairWithManualUrl`, `lastStatus`, `AndroidAppShellViewModel`, unused mapper diagnostics, CaptureActivity launcher)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance reapplied: `Yes`
- Size guardrails: `Yes` — largest changed source files: `phoneAccessStore.ts` 353, `MainActivity.kt` 309, settings catalogs 499 non-empty lines. Rewrites over 220 changed lines are the design's planned replacements (store, `MainActivity`, pairing page).

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (`allowed-local-networks.json`, new) / `Directly Usable — No Migration` (device `connectionWay`, page session `nodeName`, Android saved entries)
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows it without migration or version branches: `Yes`
- Direct-use evidence: a device row without `connectionWay` reads `null` (unit test); a page session without `nodeName` shows the host (component test); `SavedNodeStore` unchanged.
- Deviation: `None`

## Environment Or Dependency Notes

- New Android dependency `androidx.webkit:webkit:1.12.1` (library; manifest unchanged, `MainActivityManifestTest.theAppHoldsNoNewPermission`); test-only `org.json:json:20240303`.
- No `package.json`, lockfile, tsconfig or workflow change; no fresh-start build needed for the web/server builds.

## Checks Run

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts test:unit` | working tree = `d92d94472f` server code | macOS, Node 22 | whole server unit suite | all | Pass (1 failure was untracked new files, passes in IMP-02) | `evidence/IMP-01-server-unit-suite.txt` | `Tests  1 failed \| 8068 passed` + tracked-imports note |
| IMP-02 | `vitest run tests/e2e/remote-access tests/e2e/node-desktop/node-desktop-routes.e2e.test.ts tests/unit/remote-access tests/architecture/tracked-imports.test.ts` | `b2c7239d5e` | macOS, Node 22 | remote-access services, routes, route policy, classifier, default route | BEH-001…007; AC-003, AC-013; REQ-016 | Pass | `evidence/IMP-02-server-remote-access-unit-e2e.txt` | `Tests  119 passed (119)` |
| IMP-03 | `pnpm -C autobyteus-server-ts typecheck` | `d92d94472f` server code | macOS | server src + tests | — | Pass | `evidence/IMP-03-server-typecheck.txt` | `production errors: 0 … (baseline 1182 in 365 files)` |
| IMP-04 | `pnpm -C autobyteus-web typecheck` | `b2c7239d5e` | macOS | web app, electron, tests | — | Pass | `evidence/IMP-04-web-typecheck.txt` | `production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)` |
| IMP-05 | read-only `NodeNetworkService` probe on this Mac (shapes only) | `d92d94472f` (dist) | macOS with Tailscale, Wi-Fi | network facts, classifier, default route, computer name | BEH-001; U-001 (macOS), U-005 (macOS) | Pass | `evidence/IMP-05-macos-network-facts.txt` | `"dnsNameEndsTsNet":true`, `"networkIdShape":"gw_<16hex>"`, `ms` ~20 |
| IMP-06 | `pnpm -C autobyteus-web test:nuxt --run` (full), then affected specs | full: pre-`d92d94472f` tree; affected: `b2c7239d5e`; `55fdae0a34` for the bootstrap spec | macOS | web stores, components, utils | BEH-001…007; AC-012, AC-015, AC-016 | Pass after updating `mobile-root-shell.spec.ts` | `evidence/IMP-06-web-unit-suite.txt` | `Tests  125 passed (125)` (affected) |
| IMP-07 | web guards (`guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`) | `b2c7239d5e` | macOS | web sources, i18n | — | Pass | `evidence/IMP-07-web-guards.txt` | `Passed with zero unresolved findings.` |
| IMP-08 | `./gradlew :app:testDebugUnitTest :app:assembleDebug :app:compileDebugAndroidTestKotlin` | `b2c7239d5e` | macOS, JDK 21, AGP 8.13.2 | Android flow, resolver, bridge rules, reachability, mapper, manifest | BEH-004, BEH-005; E-09, E-10; QR-003 | Pass (42 tests) | `evidence/IMP-08-android-unit-build.txt` | `BUILD SUCCESSFUL`, `ShellBridgeMessagesTest" tests="4"`, `NodeConnectionFlowTest" tests="7"` |
| IMP-09 | isolated test node from `dist` + `nuxt dev`; desktop panel and `/mobile` in the browser | working tree of `d92d94472f` | macOS, Chrome via agent tools | panel, store, checks, code lifecycle, Wi-Fi allow/forget, browser pairing | BEH-001, BEH-004, BEH-005; AC-001 (dev renderer), AC-002, AC-015, AC-016 | Pass | `evidence/IMP-09-rendered-desktop-and-browser.txt` | `"Tailscale Recommended:true"`, `"Works anywhere through Tailscale"`, `devices: [("Phone", "local_network")]` |
| IMP-10 | debug APK on emulator (Android 15) against the same test node | working tree of `d92d94472f` + ScanScreen fix | headless emulator, WebView 124 | start screen, flow, bridge, switch node, sheets, can't reach, scanner | BEH-004, BEH-005; AC-008 (shared link), AC-010, AC-011 | Pass | `evidence/IMP-10-android-emulator.txt`, `evidence/IMP-10-android-*.png` | shared link → run list, device name = model; "Test Node, Online, current node" |

- Not run, and why: real Docker container node (AC-004), two nodes on two machines (AC-005), packaged Electron build (U-003 for `file://`), real Linux host detection (U-001/U-004/U-005), Tailscale Serve `--https` ports (U-006), scanning a real QR with a camera, iOS (out of scope), `mobile-shell-probe` and the other browser probes (API/E2E), Electron main tests (no Electron change).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: desktop Phones panel (UIS-001…004, 011), `/mobile` pairing page and node sheet (UIS-005, UIS-010), Android start / Switch node / scanner / connecting / can't reach / sheets (UIS-006…009); UXJ-001…008.
- References: UI/UX spec VIS-001…034 and its texts; the design repository's prototype components (`PhoneConnectPanel.vue`, `AndroidAppScreens.vue`, `MobilePairingBootstrap.vue`, `MobileConnectionSheet.vue`) for classes and structure.
- Design system reviewed: Nodes page cards/pills/switch styles, 277 mobile sheet (`MobileBottomSheet`), Heroicons.
- Surface used: isolated test node from `dist`, `nuxt dev` (TESTING.md browser-probe stack), the node's production `/mobile` bundle, Android emulator.
- States inspected: desktop default (Tailscale recommended), phone access off → turn on and show code, code shown with timer, Advanced command, Wi-Fi first time → allowed → forget, tab change discarding the code, narrow width; browser pairing link → run list → node sheet; Android first launch, shared link pairing, node sheet in app, Switch node, page with a used code, type-address with `http://`, can't reach, scanner, app start into the last node, Back paths. Other states (expired, VPN, company address, Docker blocked, history) by component/store specs.
- Issues found and corrected: panel header crushed the title at narrow width (now stacks, VIS-017); scanner header and hint unreadable over a bright camera image (now in dark bars, VIS-024); page "Phone access off" reason aligned with the app's text.
- Remaining unverified: packaged Electron rendering, real camera decode, 360 dp width (VIS-034), dark camera scene brackets, zh-CN rendering.

## Downstream Coverage Hints / Suggested Scenarios

- AC-004: test-owned Docker container from the image with this worktree's server package, published on `0.0.0.0`; Docker node window → host addresses + published port, checked against the container's node ID; port published on loopback only → "isn't reachable from other devices".
- AC-005: two test nodes on two machines (or two hosts), remote-node window; nothing checkable → company field and "This address doesn't reach <node>".
- AC-013: a used / closed / expired code refused (server: CONSUMED / INVALID / EXPIRED once); Close and tab change send `DELETE /pairing-sessions/:sessionId`.
- AC-014: phone with pre-change saved entry and page session (no `nodeName`) opens without re-pairing.
- Bridge abuse: an HTML preview (sandboxed iframe) inside the page cannot call `AutoByteusShell` (no object in subframes; main-frame-only listener).
- Linux host detection (`tailscale0`, `wg0`, `docker0`, `/proc/net/route`) on a real Linux runner; QR-004 timing (< 3 s) with an unreachable candidate.
- Update `mobile-shell-probe.mjs` MSP-09 for REQ-019 (no peers) and the name from the QR.

## API / E2E / Executable Coverage Investigation And Execution Still Required

All of "Not run" above, plus the existing browser probes that pair phones (now with `connectionWay`).

## Downstream Review Status

- Code review: `Pass`, CRR-001 for IR-001 ([code-review-report.md](code-review-report.md)); the code reviewer routed the package to API/E2E, including MSP-09. No implementation action.
