# API/E2E Coverage Investigation — one-step-phone-pairing (autobyteus-395, with autobyteus-391)

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence and the broader-validation decision are in [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md).

## Investigation Meta

- Requirements Doc: [requirements-doc.md](requirements-doc.md) (`Approved`, SR-013; REQ-001…023, AC-001…016, QR-001…006, DEC-001…024)
- Investigation Notes: [investigation-notes.md](investigation-notes.md) (E-01…E-27)
- Solution Revision Record: [solution-revision-record.md](solution-revision-record.md) (SR-001…SR-014)
- Design Spec: [design-spec.md](design-spec.md) (SR-014, `Ready`)
- Supplemental Task Artifacts: UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/one-step-phone-pairing/ui-ux-spec.md` (VIS-001…034, its texts normative); [follow-ups.md](follow-ups.md) (FU-001…003)
- Design Review Report: [design-review-report.md](design-review-report.md) (ARCH-REV-003 `Pass`)
- Architecture Review Revision Record: [architecture-review-revision-record.md](architecture-review-revision-record.md)
- Implementation Handoff: [implementation-handoff.md](implementation-handoff.md) (IR-001; Checks Run IMP-01…IMP-10)
- Implementation Revision Record: [implementation-revision-record.md](implementation-revision-record.md)
- Code Review Report: [code-review-report.md](code-review-report.md) (CRR-001 `Pass`, CR-C01…C08)
- Code Review Revision Record: [code-review-revision-record.md](code-review-revision-record.md)
- Delivery Revision Record: N/A (first API/E2E round)
- API/E2E Revision Record: [api-e2e-revision-record.md](api-e2e-revision-record.md) (written with the first result)
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: `2` (rerun by impact after IR-002: API-17 rerun, IMP-11 reused as API-19; all other cases still valid)
- Trigger: code reviewer's implementation-review pass (CRR-001), branch `codex/one-step-phone-pairing`, head `27b24037dd` (code at `55fdae0a34`), base `origin/personal` `677f61de0b`
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file, round 1

## Current Requirement And Design Basis

- **Desktop (REQ-001…005, 008, 015, 020…023).** Nodes › Phone Setup shows four tabs (Same Wi-Fi or LAN, Tailscale, Your VPN, Company address). The node reports its computer's network facts (`GET /rest/remote-access/network`); the desktop composes each way's candidate addresses with the node's port and checks each against the node's ID (2 s, in parallel). The best ready way is pre-selected and "Recommended". "Show QR code" makes one code for that way's best checked address. Phone access off → the button turns it on. Same Wi-Fi: the first press is the trust decision, remembered per network (`gw_<hash>` of the router's hardware address, or `this-computer`). A code shows its time left; Close, a tab change, New code, leaving and switching Wi-Fi off discard it on the node (`DELETE /pairing-sessions/:sessionId`).
- **Node kinds (REQ-006, REQ-007; design "Way composition per node kind").** Desktop's own node: its own facts. Local Docker node (`runsInContainer` + loopback base URL): the embedded node's host facts + the Docker node's published port, checked against the Docker node's ID; none passing → "<name> isn't reachable from other devices". Remote node: its own facts plus the desktop's address for it, classified by host; nothing checkable → every tab not ready, the Company address field ("This address doesn't reach <node>." when the typed address answers with another node ID, DEC-022).
- **Pairing contract (REQ-009, 016, 017).** QR payload unchanged (`version 1, serverBaseUrl, pairingCode, expiresAt, serverName`); `serverName` is the desktop's name for the node (DEC-016: computer name for the embedded node, else the registry name). Status drops `serverName`. A used code answers `CONSUMED` until expiry, a discarded one `INVALID`, an expired one `EXPIRED` once.
- **Phone (REQ-010…013, 018, 019; DEC-023).** App: scan / paste / share pairs at once (no HTTP tick, no name field; model name), entry saved under the QR's name only after the page reports `paired`; scan-first start screen; Switch node from the page's node sheet over the `AutoByteusShell` web-message bridge (main frame of the open origin only). Node sheet: no peer list; refresh icon when reachable, "Retry" when not; "Unpair from <node>". Browser: one "Connect to <name>" tap, "Get the Android app".
- **Phones list (REQ-014).** Active phones with way and last seen; Revoke; quiet Revoke all; History (n).
- **Persisted data.** `allowed-local-networks.json` new (`Not Affected`); device `connectionWay`, page session `nodeName`, Android saved entries `Directly Usable — No Migration`.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001…SCN-009.
- Real-use scenarios added from the implementation:
  - **RU-01 Docker node paired end to end:** the phone scans the Docker node's QR (host address + published port) and reaches that node's run list. SCN-003 ends at the QR; the phone side of a Docker node is the real goal ("On the Docker node … scan").
  - **RU-02 Two nodes from the real desktop on one phone:** the embedded node and a Docker node, each paired from its own desktop window's QR, listed under the names the desktop gave (DEC-016) and switched from inside a page. IMP-10 had one node only.
  - **RU-03 HTML preview inside a node page cannot drive the app:** the product renders file previews in sandboxed frames inside `/mobile` (autobyteus-417); a frame calling `AutoByteusShell` is the real abuse path (design Risks; AR-001).
  - **RU-04 Phone access switched off while a code is shown:** the header switch off, then on again; the shown code no longer pairs (design return spine "discard all on disable").
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none in the requirements. The code reviewer's rejected candidates CR-C01 (tab click within the POST round trip), CR-C04 (cancel → type → in-page paste chain) and CR-C05 (cross-node paste in a browser) are not tested.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 desktop node panel, ways, checks, code lifecycle | Changed | REQ-001…005, 008, 015, 020…023; DS-001, DS-003 | Store/composer specs exist; prove in the real desktop (packaged, `file://`) with real network facts |
| BEH-002 Docker node | Added | REQ-006; DS-002 | Only store specs; needs a real container (AC-004) |
| BEH-003 remote node | Changed | REQ-007; DS-001 | Only composer/store specs; needs a node with another computer's facts (AC-005) |
| BEH-004 scan/paste/share connects; browser one tap | Changed | REQ-010, 018; DS-004, DS-005 | Emulator (shared link) and browser done in IMP-09/10; add pasted link, camera decode, Docker node pairing |
| BEH-005 names, scan-first list, Switch node, node sheet | Changed | REQ-011…013, 019; DS-006 | Two nodes from the real desktop; MSP-06/MSP-09 probe update |
| BEH-006 phones list | Changed | REQ-014; DS-007 | Component test (AC-012) + rows after real pairings |
| BEH-007 existing pairings and saved data | Preserved | REQ-016, 017; AC-007, AC-014 | Pre-change app and node data upgraded in place (AC-014) |
| `GET /rest/remote-access/address-candidates`, status `serverName` | Removed | Removal plan | Probes must not read status `serverName` (MSP setup) |
| Node sheet peer list | Removed | REQ-019 | MSP-06 and MSP-09 assert it: update |
| Network facts on Linux | Added | U-001, U-004, U-005; QR-006 | Recorded fixtures only; run on a real Linux kernel |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `NodeNetworkService`, classifier, default route, pairing sessions, devices | Server unit (IMP-01/02) | Linux kernel interface names and `/proc` content are fixtures | Lifecycle: node in a privileged Linux container (real netns) |
| API / transport / contract | Yes | `/network`, `/network/local-networks/:id`, `DELETE /pairing-sessions/:id`, POST `connectionWay`, status without `serverName` | Server E2E (fastify inject) | Real process over real HTTP from the desktop renderer | Live API through the desktop and probes |
| Frontend component / state | Yes | `phoneAccessStore`, `phoneConnectionWays`, `PhonesPanel` | Web specs (IMP-06) | Real facts, real checks, timing | Project Desktop Validation |
| Browser integration / user journey | Yes | `/mobile` pairing page, node sheet | IMP-09 (manual); MSP probe stale | Durable probe coverage of REQ-019 / AC-015 | Browser probe (durable) |
| Authentication / session / permissions | Yes | Owner routes, phone credential, codes | Server E2E | Codes discarded/used/expired over the real stack | Live API + desktop |
| Desktop renderer / web-equivalent UI | Yes | Panel in a node window | IMP-09 in the dev renderer (loopback origin, embedded window only) | Non-embedded windows exist only in Electron | Isolated desktop instance |
| Desktop shell / Electron-specific integration | Yes (indirect) | Renderer `fetch` from `file://` to other nodes' addresses (U-003); node windows | None | Origin rule from `file://` | Isolated desktop instance (packaged build) |
| Process / lifecycle | Yes | Docker node, phone access off discards codes, code expiry | Store/server specs | Real container, real timer | Desktop + container |
| Persisted-data transition | Yes | Device rows without `connectionWay`, page session without `nodeName`, Android saved entries | Unit (device row), component (session) | A real pre-change phone and node upgraded | Emulator + container upgrade (AC-014) |
| Worker / queue / distributed coordination | Yes | Desktop ↔ embedded node ↔ Docker/remote node | Store specs with fakes | Real multi-node checks | Desktop + containers |
| External integration | Yes | Android WebView bridge, camera scanner, Tailscale | Android unit (IMP-08), emulator (IMP-10) | Camera decode; sandboxed-frame abuse; Serve ports | Emulator; Tailscale docs |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-step-phone-pairing`
- Project type and runtime stack: pnpm monorepo; Node 22 server (`autobyteus-server-ts`, fastify), Nuxt web + Electron desktop (`autobyteus-web`), Android WebView shell (`autobyteus-android`, Gradle, JDK 21); server Docker image `autobyteus/autobyteus-server:beta` (arm64).
- Project testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-step-phone-pairing/TESTING.md` (root; no closer `TESTING*.md`).
- Conflicting, missing, or unclear project instructions:
  - TESTING.md's Fresh-start build list covers the desktop and server release jobs only; this ticket changes `autobyteus-android/app/build.gradle.kts` (new library `androidx.webkit`), an input of `.github/workflows/release-android.yml`. Plan: run the Android job's build from a fresh clone (API-05) and add the Android build inputs and command to the guideline (`docs(testing)` commit).
  - The browser-automation launcher named in `docs/isolated-app-instances.md` is not present on this machine; the instance is driven through its CDP control port with `playwright-core` `connectOverCDP` (the same endpoint the launcher attaches to).
  - `autobyteus-android/README.md` still describes the removed flow (HTTP acknowledgement after a scan, the Phone Setup guide). Docs are delivery's sync; noted for delivery.
- Changed build-input paths: none in the guideline's list (`git diff --name-only 677f61de0b...HEAD`); outside it, `autobyteus-android/app/build.gradle.kts` → API-05.
- Required environment variables or secrets available: `N/A` (no provider keys needed; no live gate).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Test layers, rules | Rerun by impact; one heavy run at a time; Docker server nodes: test-owned container from the same image, fresh volumes, worktree server package via `docker buildx … --target server-package` mounted over `/opt/autobyteus/server-package`; never the user's containers; isolated instance for desktop-shell journeys; probes own their stack |
| `docs/isolated-app-instances.md`, `skills/autobyteus-isolated-app/SKILL.md` | Real desktop of a worktree build | `pnpm --silent isolated-app start --build` (or `--from-worktree`), control port (CDP), `stop <instanceId>`; renderer at `/renderer/index.html` (`file://`) |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` header | MSP probe | Prereqs `pnpm -C autobyteus-server-ts build`, `pnpm -C autobyteus-web build:mobile-web`; `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<fresh> --cases=…` |
| `.github/workflows/release-android.yml` | Android release job | `./gradlew --no-daemon clean :app:assembleDebug` (unsigned path), JDK 17, platform 35 |
| `autobyteus-android/README.md` | Android build | `ANDROID_HOME=$HOME/Library/Android/sdk ./gradlew :app:assembleDebug` |
| `autobyteus-server-ts/docker/Dockerfile.monorepo` | Server package for the image | `--target server-package` (scratch stage with the built package) |
| Image `autobyteus/autobyteus-server:beta` config | Test-owned containers | Entrypoint `/usr/local/bin/entrypoint.sh`; `AUTOBYTEUS_BIND_HOST=0.0.0.0`, port 8000, data `/home/autobyteus/data`, `/root` home volume |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Isolated desktop instance (packaged worktree build) | repo root | `pnpm --silent isolated-app start --build` | Own data root and ports; embedded server binds `0.0.0.0` | `start` result (backend `/rest/health`, window listed) | `pnpm --silent isolated-app stop <instanceId>` |
| Test Docker nodes `ospp-e2e-*` | — | `docker run -d --name ospp-e2e-<n> -p <bind>:<port>:8000 -v ospp-e2e-<n>-data:/home/autobyteus/data -v ospp-e2e-<n>-root:/root -v /tmp/ospp-e2e/server-package:/opt/autobyteus/server-package:ro autobyteus/autobyteus-server:beta` | Fresh test volumes; never the user's `autobyteus-server-*` | `GET /rest/health` | `docker rm -f -v` + `docker volume rm` |
| Linux facts node `ospp-e2e-linux` | — | Same image, `--privileged`, `/.dockerenv` removed at start, test interfaces added in its own network namespace | Own netns only; host VM untouched | `GET /rest/remote-access/network` | `docker rm -f -v` |
| MSP probe stack | `autobyteus-web` | `pnpm test:e2e:mobile-shell --output-dir=<fresh> --cases=MSP-06,MSP-09` | Probe-owned nodes, Nuxt, Chrome | Probe output | Probe `finally` + cleanup receipt |
| Android emulator `autobyteus277_api35` | — | `emulator -avd autobyteus277_api35 -no-window -no-snapshot-save` | Reaches the host as `10.0.2.2` and the LAN | `adb wait-for-device`, `sys.boot_completed` | `adb emu kill`; app data cleared |
| Fresh clones | `/tmp/ospp-e2e/clone-*` | `git clone --no-local <worktree>`, checkout commit | Base APK (AC-014) and fresh-start build (API-05) | Build output exists | `rm -rf` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Paired phones, codes | Public REST (`/pairing-sessions`, `/pairing-exchanges`) and the real UI | Test-owned nodes only; no real codes in evidence (redacted) | Removed with the nodes |
| Node names | Desktop registry through the instance UI | Neutral names ("Docker Test Node", "Linux Test Node") | Removed with the instance |
| Pre-change phone (AC-014) | Base APK (fresh clone of `677f61de0b`) paired by the old flow to a test container on the released `beta` server | Synthesized by the real old app and old node, never copied | Container, volumes, emulator app data removed |
| Real network facts of this Mac | Read by the nodes | Real computer name and addresses replaced by placeholders in kept evidence; no screenshot shows them | — |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected` (`allowed-local-networks.json`); `Directly Usable — No Migration` (device `connectionWay`, page session `nodeName`, Android saved entries).
- Design-spec and implementation-handoff references: design "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check".
- Representative existing-data setup and required behavior: a phone paired by the base app to a node on the released server (device row without `connectionWay`, page session without `nodeName`, saved entry named by the old status constant). After the node runs this worktree's server package on the same data and the app is updated in place, the app opens the last node into its run list with no pairing; the desktop lists the phone without "Connects through"; the sheet names the node by its host (no `nodeName`).
- Evidence planned: API-15.
- Migration-specific scenarios: N/A.
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/remote-access/{network-interface-classifier,default-route,node-network-service,pairing-auth-service,route-policy}.test.ts` | Classifier rules (macOS/Linux fixtures, AC-003), `/proc` parsers, facts service, sessions (way required, opaque ID, CONSUMED until expiry, EXPIRED once, discard by ID, discard on disable, legacy rows) | REQ-002, 003, 016; AC-003, AC-013 | Still Valid | Read; IMP-02 | Reuse (API-01) |
| `autobyteus-server-ts/tests/e2e/remote-access/phone-access-running-routes.e2e.test.ts` | Routes over fastify: network facts shape, allow/forget, way required, DELETE → INVALID, second use → CONSUMED, device way, phone credential refused on `/network` | AC-013, REQ-016 | Still Valid | Read lines 305–403 | Reuse (API-01) |
| `autobyteus-server-ts/tests/e2e/remote-access/request-origin-and-phone-routes.e2e.test.ts`, `node-desktop-routes.e2e.test.ts` | Origin rule and phone route list | Preserved boundary | Still Valid | IMP-02 | Reuse |
| `autobyteus-web/utils/phoneAccess/__tests__/{phoneConnectionWays,tailscaleServeCommand}.spec.ts`, `stores/__tests__/phoneAccessStore.spec.ts`, `components/settings/phone/__tests__/PhonesPanel.spec.ts` | Per-kind composition, Serve port rule, store lifecycle, AC-012 History (31) | REQ-001…008, 014, 015, 020…023 | Still Valid | IMP-06 | Reuse (API-03) |
| `autobyteus-web/components/mobile/**/__tests__/{MobilePairingBootstrap,MobileConnectionSheet,MobileRemoteAccessShell}.spec.ts`, `pages/__tests__/mobile-root-shell.spec.ts` | Pairing page states, sheet (no peers, refresh/Retry, Unpair from), session name | REQ-010, 018, 019; AC-015, AC-016 | Still Valid | IMP-06 | Reuse (API-03) |
| `autobyteus-android/app/src/test/**` (`NodeConnectionFlowTest`, `ConnectionInputResolverTest`, `ShellBridgeMessagesTest`, `NodeReachabilityTest`, `ConnectionDiagnosticMapperTest`, `MainActivityManifestTest`) | Flow, resolver (E-09), name from QR (E-10), bridge message rules, manifest without new permission | REQ-010, 011, 013; AC-007; QR-003 | Still Valid | IMP-08 | Reuse (API-04) |
| `autobyteus-android/app/src/androidTest/**` (`AutoByteusMobileShellSmokeTest`, `MainActivityConfigurationChangeTest`) | Instrumented smoke, compiled in IMP-08 | REQ-012 | Still Valid (compiled; not run on a device by IMP-08) | IMP-08 | Out of scope to run (emulator journeys cover the same screens) |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` setup (line ~166) | Reads status `serverName` into `node.serverName` | Status `serverName` removed | Needs Update | Lines 164–167 | Name the node in the pairing request as the desktop does (`serverName`) and use it |
| `mobile-shell-probe.mjs` MSP-06 (line ~998, 1022) | "the peer is not reachable in the connection sheet" (`mobile-peer`) | REQ-019 removes the sheet's peer list; run chips stay | Needs Update | Lines 994–1022 | Drop the sheet-peer read and assertion; keep the row chips, notice and Retry |
| `mobile-shell-probe.mjs` MSP-09 (lines 1372–1435) | Sheet named by status `serverName`; peer with what it offers; "Check connection"; "Unpair this phone?" | REQ-011, REQ-019, DEC-018; AC-016 | Needs Update | Lines 1427–1433 | Name from the QR; no peer list; refresh icon when connected, "Retry" when not; "Unpair from <node>"; browser page "Connect to <name>" + "Get the Android app" (AC-015) |
| `autobyteus-web/tests/e2e/{node-vocabulary-probe,composer-context-file-removal-probe,owner-scoped-file-reads-probe}.mjs`, `large-runs-load-less-cases.mjs`, `workspace-views-chooser-cases.mjs` | Other journeys that pair a phone with `connectionWay` (one changed line each) | REQ-016 contract only | Still Valid | `git diff` one line each; no `serverName`/peer reads (grep) | Not rerun: the same POST body is exercised by the MSP run (API-06) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-003, AC-013 (server), REQ-016, BEH-001…007 server | Server unit + route E2E | Reused | IMP-02 (and IMP-01 suite) | Server code unchanged since `d92d94472f` (`git diff --name-only d92d94472f 55fdae0a34` = two web files) |
| API-02 | — | Server and web typechecks, web guards | Reused | IMP-03, IMP-04, IMP-07 | `55fdae0a34` changes one string literal in a `.vue`; nothing the checks read changed shape |
| API-03 | AC-012, AC-015, AC-016 (component), REQ-001…023 web | Web specs | Reused | IMP-06 | Ran on `b2c7239d5e` and the bootstrap spec on `55fdae0a34` |
| API-04 | AC-007, QR-003, REQ-010, 011, 013 | Android unit + build | Reused | IMP-08 | Android unchanged since `b2c7239d5e` |
| API-05 | Release build of the Android app | Fresh-start Android build | Durable check (guideline rule) | Fresh clone of `27b24037dd`; `cd autobyteus-android && ./gradlew --no-daemon clean :app:assembleDebug` | New library dependency; the runner resolves it from nothing |
| API-06 | AC-015, AC-016, REQ-011, REQ-019, DEC-018 | Browser probe on a probe-owned stack | Durable (update) | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web`; `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<fresh> --cases=MSP-06,MSP-09` | MSP-06/09 assert removed behavior |
| API-07 | U-001, U-004, U-005, AC-003 on Linux, QR-006 | Node facts on a real Linux kernel | Temporary Probe | Privileged test container (own netns), `/.dockerenv` removed, worktree server package; add `wg0` (wireguard), `tailscale0` (tun, 100.x), `tun1` (tun, unconfirmed 100.x), `docker0`-style bridge, link-local; `GET /rest/remote-access/network`; compare network ID with `sha256` of `ip neigh` gateway MAC | Needs a privileged container and kernel modules; not a repository test |
| API-08 | AC-001, AC-002, AC-006, AC-013 (desktop), QR-004, U-003, REQ-020…023 | Packaged desktop (`file://`), embedded node, real facts | Journey | Isolated instance (`--build`); Nodes › Phone Setup; DOM + request log over CDP; codes exchanged by REST from a test client; see Live Environment | Non-embedded windows and `file://` exist only in the real desktop |
| API-09 | AC-004, REQ-006, RU-01 | Desktop + test Docker node (published `0.0.0.0`), and one published on `127.0.0.1` only | Journey | Add each container in the instance's Nodes page at `http://127.0.0.1:<port>`; open its window; Phone Setup; read tabs, decode the QR's payload, check `serverBaseUrl` = host address + published port and the container's node ID | Real container boundary |
| API-10 | AC-005, REQ-007, DEC-021, DEC-022 | Desktop + node with another computer's facts | Journey | API-07's Linux node published `0.0.0.0`, added at `http://<this Mac's LAN address>:<port>` (its own facts are another network's), then at its IPv6 address (nothing checkable); Company address: typed embedded-node address → "This address doesn't reach <node>"; typed right address → code | Only one physical machine; the Linux netns gives the remote node its own unreachable facts |
| API-11 | AC-013 (expiry), REQ-015 | Desktop timer + node expiry | Journey | Show a code; wait past 5:00; "New code" shown; exchange the old code → `EXPIRED`, again → `INVALID` | Real 5-minute timer |
| API-12 | AC-008, AC-009, AC-010, AC-011, AC-016 (in app), RU-01, RU-02 | Emulator + real desktop QR texts | Journey | Debug APK of HEAD; paste the embedded node's link, share the Docker node's link; both listed by the desktop's names; Switch node A → B → B's run list; sheet refresh/Retry; unreachable row | Two nodes and names from the real desktop |
| API-13 | AC-008 (Scan entry form) | Emulator camera decode | Temporary Probe | Emulator virtual scene with the QR image as a poster (`-virtualscene-poster`), Scan | Time-boxed; the emulator camera is the only camera here |
| API-14 | Bridge abuse (AR-001), RU-03 | WebView bridge | Temporary Probe | WebView DevTools (debug build) on a paired page: `typeof AutoByteusShell` in the main frame, a same-origin iframe and a sandboxed `srcdoc` iframe; post `showNodeList` from each; observe the app | Needs the WebView inspector; no repository harness for it |
| API-15 | AC-014, REQ-017, QR-005, persisted data | Emulator + node upgrade in place | Journey | Base APK (fresh clone of `677f61de0b`) paired by the old flow to a test container on the released `beta` server; then the same container data with this worktree's server package and `adb install -r` the HEAD APK; open the app | Pre-change data made by the real old app and node |
| API-17 | REQ-014 texts | Desktop phones list | Journey (added in round 1, rerun in round 2) | Fresh packaged instance; paired + used + revoked phones on the embedded node; read rows in English and zh-CN on the de_DE host | Round 1 found the locale defect during API-15 |
| API-18 | AC-007 | Released app + new QR | Journey (added in round 1) | Base APK shares a new desktop code | Payload unchanged |
| API-19 | REQ-014 dates (durable) | Web spec | Reused | IMP-11 | Runs on the fix commit `c113dae1a7` |
| API-16 | U-006, REQ-008 | Tailscale Serve `--https=8443…8542` | Not Tested (docs check) | Read Tailscale's Serve CLI docs; do not run Serve on this machine | Running it changes the user's tailnet configuration (design guidance) |

- Test progress log needed: `Yes` ([api-e2e-test-progress.md](api-e2e-test-progress.md)).

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-05 | `TESTING.md` Fresh-start build: Android build inputs and the Android job's command | So a later change to the Android build inputs runs the fresh-start proof before merge |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-06 | `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` setup | Stop reading status `serverName`; pair with `serverName` as the desktop does | Status field removed |
| API-06 | `mobile-shell-probe.mjs` MSP-06 | Remove the sheet-peer read and assertion | REQ-019 |
| API-06 | `mobile-shell-probe.mjs` MSP-09 | Name from the QR; no peer list; refresh icon / "Retry"; "Unpair from <node>"; pairing page "Connect to <name>" and "Get the Android app" | REQ-011, 019, DEC-018, AC-015, AC-016 |

## Durable Coverage To Remove

| Existing Path / Test | Obsolete Assertion And Why | Requirement / AC / Design Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| `mobile-shell-probe.mjs` MSP-06 assertion "the peer is not reachable in the connection sheet" | The sheet no longer lists peers | REQ-019 | No replacement: the same MSP-06 still proves the peer's rows show "Not reachable" and the run notice with Retry |
| `mobile-shell-probe.mjs` MSP-09 assertion "the peer with what it offers" | Same | REQ-019 | Replaced by "no peer list in the sheet" (AC-016) |

## Desktop Application Validation Plan

- Desktop framework / shell: Electron; renderer from `file://…/renderer/index.html`; node windows per registry entry.
- Guideline used: TESTING.md ("Desktop-shell behavior … isolated desktop instance"), `docs/isolated-app-instances.md`.
- Web-equivalent behavior: the panel, store and checks (also proven in IMP-09 in the dev renderer).
- Shell-specific: status checks to other nodes' addresses from a `file://` origin (U-003); a non-embedded node window (Docker, remote) and its Phone Setup; the embedded node's real network facts.
- Approach: isolated instance of this worktree's packaged build (`--build`), driven over its CDP control port with `playwright-core` (`connectOverCDP`), DOM assertions plus the renderer's request log; node windows opened through the Nodes page as a user does.
- Avoiding disturbance: the instance has its own ports and data root; the user's installed app, nodes and Tailscale are not touched; Docker nodes are test-owned containers with fresh volumes.

## Live Environment And Fixture Plan

- Startup order: server package build (buildx) → MSP probe (own stack) → isolated instance → Linux facts container and Docker test containers → emulator.
- Environment choices that matter: this Mac's real Wi-Fi and Tailscale (facts only, read-only); emulator reaches the host's LAN address and `10.0.2.2`.
- Readiness: `/rest/health`; instance `start` result; `adb shell getprop sys.boot_completed`.
- Seed data: none beyond the nodes' own default data; pairings made through the UI or the public REST routes.
- Identities: owner requests from the desktop (loopback/`file://`); phone credentials from real exchanges.
- Journeys: API-08…API-15 above.
- Evidence: DOM text, decoded QR payloads (codes redacted), request logs (method, path, status), server answers, emulator screenshots and `uiautomator` dumps; real computer name and addresses replaced by placeholders.
- Cleanup: `isolated-app stop`, `docker rm -f -v` + `docker volume rm` for `ospp-e2e-*`, `adb emu kill`, fresh clones removed.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Tailscale Serve `--https=8443…8542` (U-006) | Running Serve changes the user's tailnet configuration; no test tailnet here | The optional Advanced text could name a port Serve refuses | Yes (his tailnet) | Docs check in API-16 |
| A second physical machine (AC-005) | One machine available | Emulated by a node in its own Linux network namespace (API-10) | Partly (his own nodes) | Recorded in the report |
| iOS | Out of scope (FU-001) | — | No | — |
| Windows hosts | Low priority; not available (QR-006) | Fallbacks only | No | — |

## Ambiguities Or Reroute Triggers

None found before execution.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (MSP probe update; TESTING.md fresh-start rule)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: the user's three node containers (`autobyteus-server-0/1/2`) and their volumes are not used.
