# API/E2E Execution Coverage Report — one-step-phone-pairing (autobyteus-395, with autobyteus-391)

## Round

- Coverage investigation: [api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md)
- API/E2E revision record and current revision ID: [api-e2e-revision-record.md](api-e2e-revision-record.md), `API-REV-001`
- Test progress log: [api-e2e-test-progress.md](api-e2e-test-progress.md)
- Round and trigger: round 1, code review pass CRR-001 (head `27b24037dd`, code `55fdae0a34`, base `origin/personal` `677f61de0b`)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - API-10: the nothing-checkable variant uses the same Linux node registered through a loopback forward (`http://127.0.0.1:<port>`, the SSH-tunnel case) instead of IPv6: Docker Desktop did not answer on this Mac's IPv6 address.
  - API-11: the first expiry code was discarded when a harness step navigated the main window (CDP window order is not stable); the case was restarted in the Docker node's window and the harness now orders windows by Electron window ID.
  - API-12: pairing used the Share entry form for both nodes; Paste a link needs the emulator clipboard, which `adb input text` could not fill with a full link.
  - API-13: the emulator's virtual-scene wall poster is out of the camera's view and the pose cannot be moved headless; recorded `Not Tested`.
  - Added cases API-17 (locale defect found during API-15) and API-18 (AC-007 with the released app).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-step-phone-pairing/tickets/in-progress/one-step-phone-pairing/evidence`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Not Applicable` this round (result `Fail`; failure-origin review requested). The changed probe `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` goes to test-code review with the passing round.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `27b24037dd` (code `55fdae0a34`) + probe change | macOS arm64 (Darwin 25.5), Node 22 | MSP probe stack: worktree `dist` server ×2, `build:mobile-web`, `nuxt dev`, headless Chrome | Probe-owned data roots; phone origin `http://192.168.77.10:<port>` (synthetic) |
| ENV-2 | `27b24037dd` | macOS arm64, Wi-Fi + Tailscale 1.98.2 (facts read-only), AppleLocale `de_DE`, app UI English | Isolated desktop `iso-49410-016d`: packaged worktree build (`isolated-app start --build`), renderer `file://…/app.asar/dist/renderer/index.html`; driven over CDP (playwright-core) | Own data root and ports (backend 49411); real network facts of this Mac |
| ENV-3 | `27b24037dd` | Docker Desktop (linuxkit 6.12.54, arm64) | Image `autobyteus/autobyteus-server:beta` + this worktree's server package (`docker buildx --target server-package`) mounted read-only | Test containers `ospp-e2e-*`, fresh volumes; never the user's `autobyteus-server-0/1/2` |
| ENV-4 | `27b24037dd` / base `677f61de0b` | Android emulator `autobyteus277_api35` (Android 15, WebView 124.0.6367.219, model `sdk_gphone64_arm64`) | HEAD debug APK from the API-05 fresh-start build; base debug APK from `677f61de0b` | Emulator reaches the host as `10.0.2.2` and on the LAN/tailnet addresses |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-003, AC-013 (server), REQ-016, BEH-001…007 (server) | Server unit + route E2E | Reused IMP-02 (and IMP-01) | — | Pass | (IMP-02) | (IMP-02) | Server code unchanged since `d92d94472f` (`git diff --name-only d92d94472f 55fdae0a34` = two web files) |
| API-02 | — | Typechecks, web guards | Reused IMP-03, IMP-04, IMP-07 | — | Pass | (IMP-03/04/07) | (IMP-03/04/07) | `55fdae0a34` changes one string literal in a `.vue` |
| API-03 | AC-012, AC-015, AC-016 (component) | Web specs | Reused IMP-06 | — | Pass | (IMP-06) | (IMP-06) | Bootstrap spec ran on `55fdae0a34`; the rest on `b2c7239d5e`, no web change since but that string |
| API-04 | AC-007 (parser), QR-003, REQ-010, 011, 013 | Android unit + build | Reused IMP-08 | — | Pass | (IMP-08) | (IMP-08) | Android unchanged since `b2c7239d5e` |
| API-05 | Release build of the Android app; QR-003 | Fresh-start Android build | Fresh clone of `27b24037dd`; `cd autobyteus-android`; `GRADLE_USER_HOME=<empty> ./gradlew --no-daemon clean :app:assembleDebug`; `aapt2 dump permissions` | ENV-4 host | Pass | `API-05-android-fresh-start-build.txt` | `BUILD SUCCESSFUL in 1m 22s`; `androidx.webkit/ -> 1.12.1`; permissions INTERNET, ACCESS_NETWORK_STATE, CAMERA | Signed `assembleRelease` needs the runner's secrets: not tested |
| API-06 | AC-015, AC-016, REQ-011, REQ-019, DEC-018 | Browser probe (durable, updated) | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web`; `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=/tmp/ospp-e2e/msp/run1 --cases=MSP-06,MSP-09` | ENV-1 | Pass | `API-06-mobile-shell-probe.txt`, `API-06-mobile-shell-probe.json`, `API-06-MSP-09-*.png` | `MSP-06 Pass`, `MSP-09 Pass`; JSON MSP-09 `"peerRows": 0`, `"checkDown": {"label": null, "text": "Retry"}`, `"button": "Connect to Alpha Test Node"`, `"statusFields": ["nodeId","pairingAvailable","phoneAccessEnabled"]`; cleanup `"serversLeft": 0, "rootRemoved": true` | Probe updated: setup no longer reads status `serverName`; MSP-06 sheet-peer assertion removed; MSP-09 rewritten |
| API-07 | U-001, U-004, U-005, AC-003 (Linux), QR-006 | Node facts on a real Linux kernel | Privileged test container, own netns, `/.dockerenv` removed; `wg0`, `tailscale0`+`tun1` (TUN held as tailscaled does), bridges, CGNAT/public/link-local/IPv6; `GET /rest/remote-access/network`; default route removed/restored; allow/forget | ENV-3 | Pass | `API-07-linux-network-facts.txt` | `"tailscale":{"address":"100.101.102.103","dnsName":null}`, `"vpnAddresses":["10.66.0.2"]`, `"addresses":["172.17.0.6","100.88.1.5"]`, network ID equals `gw_` + sha256 of the gateway MAC; `"networkId":"this-computer"` without a default route | A TUN with no process attached is invisible to Node (not RUNNING) — like Tailscale switched off |
| API-08 | AC-001, AC-002, AC-006 (text), AC-013 (close, tab, used), RU-04, U-003, QR-004 | Packaged desktop, embedded node | Isolated instance; Nodes › Phone Setup; Turn on and show QR code; tab change; Allow and show QR code; phone exchanges ×2; Close; reopen; Wi-Fi switch off; Advanced; access off/on with a code shown | ENV-2 | Pass | `API-08-desktop-node-journey.txt` | `Tailscale Recommended: ready=True selected=true`; `ms click → QR: 194`, `line: "Works anywhere through Tailscale"`; `← DELETE …/pairing-sessions/pss_48a0… 204` then `REMOTE_ACCESS_PAIRING_INVALID`; `PUT …/local-networks/gw_<16 hex…> 200`; `REMOTE_ACCESS_PAIRING_CONSUMED`; `serve --bg 49411` | The Tailscale HTTPS name answered with another node's ID (the host's own AutoByteus) and was excluded by the node-ID check |
| API-09 | AC-004, REQ-006 | Desktop + real Docker nodes | Containers published `0.0.0.0` and `127.0.0.1` only, added at `http://127.0.0.1:<port>`, own windows › Phone Setup; codes for Tailscale and Wi-Fi | ENV-2, ENV-3 | Pass | `API-09-docker-node.txt`, `API-09-loopback-docker-node-blocked.png` | `serverBaseUrl":"http://<tailnet address>:49816"` / `"http://<lan address>:49816"`, `serverName":"Docker Test Node"`; allow `PUT http://127.0.0.1:49411/…` (embedded node); blocked: `Loopback Docker Node isn’t reachable from other devices. Publish its port …` | — |
| API-10 | AC-005, REQ-007, DEC-021, DEC-022, QR-004 | Desktop + node with another computer's facts | API-07 node added at `http://<lan address>:64911`; Turn on, allow and show QR code; Company address typed wrong/right; then re-added via `http://127.0.0.1:64911` (tunnel) | ENV-2, ENV-3 | Pass | `API-10-remote-node.txt` | `ms tab click → ready: 2079`; `PUT http://<lan address>:64911/…/local-networks/gw_3cfe72a56fd965c0 200` (kept by the remote node); `This address doesn’t reach Linux Test Node.`; `"connectionWay":"company_address"`; tunnel: every tab `ready=False`, field `Enter the address your IT gave you` | Copy observation for remote nodes → FU-004 |
| API-11 | AC-013 (expiry), REQ-015 | Desktop timer + node expiry | Show QR code; wait past 5:00; read panel; two exchanges; New code | ENV-2 | Pass | `API-11-code-expiry.txt` | `"This code has expired"`, New code shown; `REMOTE_ACCESS_PAIRING_EXPIRED` then `REMOTE_ACCESS_PAIRING_INVALID`; New code `Valid for 5:00` | Run in the Docker window (see Deviations) |
| API-12 | AC-008 (share form), AC-009, AC-010, AC-011, AC-016 (app), RU-01, RU-02 | Emulator + real desktop codes | Fresh install of HEAD APK; first launch; Scan (permission, scanner); share embedded node's Tailscale link; share Docker node's Wi-Fi link; node sheet; Switch node A→B; Docker paused → list; Back → start screen | ENV-2, ENV-3, ENV-4 | Pass | `API-12-android-two-nodes.txt`, `API-12-android-switch-node-unreachable.png` | `('sdk_gphone64_arm64', 'tailscale')`, saved `displayName "<computer name>"`; `('sdk_gphone64_arm64', 'local_network')` on the Docker node; `Switch node 2 nodes on this phone`, `Unpair from Docker Test Node`; `Docker Test Node, Not reachable` | — |
| API-13 | AC-008 (Scan entry form: camera decode) | Emulator camera | `-camera-back virtualscene -virtualscene-poster wall=<live QR>`; Scan | ENV-4 | Not Tested | — | — | Scanner and permission flow shown (API-12); the poster is out of view and the scene pose cannot be moved headless (`sensor set` changes no view). The parsed-text path after a decode is the same `NodeConnectionFlow.connect` as Share (unit-tested per entry form) |
| API-14 | AR-001 bridge abuse, RU-03 | Android WebView bridge | WebView DevTools (raw CDP): hostile script in sandboxed `srcdoc`, sandboxed `blob:` (the previewer's pattern) and same-origin subframes; main-frame control | ENV-4 | Pass | `API-14-bridge-abuse.txt` | sandboxed: `"type": "undefined"`, `"parentType": "blocked: SecurityError"`; main frame `showNodeList` → `'Switch node'` list; blob frame → `Navigation blocked` | Blob preview cannot load in the app at all (pre-existing containment) → FU-005; a same-origin non-sandboxed subframe can call the parent's object (same-origin script already holds the credential; /mobile renders no such frame) |
| API-15 | AC-014, REQ-017, QR-005, persisted data, REQ-016 (revoke) | Emulator + node upgraded in place | Released-server container + base APK, old pairing flow; container recreated on the same volumes with the worktree package; `adb install -r` HEAD APK; open; desktop phones list; Revoke | ENV-2, ENV-3, ENV-4 | Pass | `API-15-pre-change-phone-upgrade.txt` | `['10.0.2.2:54021, Connected. Connection', 'No runs yet', …]` with no input; same `nodeId`; `"connectionWay":null`; `lastSeenAt "…10:09:05Z"`; `History (1) Phone Revoked …`; phone `Couldn’t load your runs.` after revoke | Old saved name "AutoByteus Desktop" kept until re-scan (design: acceptable) |
| API-16 | U-006, REQ-008 | Tailscale Serve HTTPS ports | Docs and read-only CLI help | — | Not Tested | `API-16-tailscale-serve-https-ports.txt` | `Funnel can only listen on ports 443, 8443, and 10000` (Funnel only); Serve `--https value  Expose an HTTPS server at the specified port` | Running Serve changes the user's tailnet configuration |
| API-17 | REQ-014 (spec texts "Last seen 2 minutes ago", "Revoked Oct 28"); AC-012 surface | Desktop phones list | Observed during API-15 on the `de_DE` host; renderer locale facts by CDP evaluate; code read | ENV-2 | **Fail** | `API-17-phones-list-locale.txt` | `"Phone Last seen jetzt Revoke"`, `"History (1) Phone Revoked 7. Nov."`; `ConnectedPhones.vue:91 new Intl.RelativeTimeFormat(undefined, …)`, `:108 toLocaleDateString(undefined, …)` | The user's own Mac is `de_DE` with the app in English |
| API-18 | AC-007, REQ-009, REQ-017 | Released app + new desktop QR | Base APK fresh; Docker node Wi-Fi code from the desktop shared into it; HTTP tick; open; one tap | ENV-2, ENV-3, ENV-4 | Pass | `API-18-released-app-new-qr.txt` | `'Connect to Docker Test Node'` → `['Docker Test Node, Connected. Connection', …]`; devices `('Phone','local_network')` | — |
| QR-001 check | QR-001, REQ-016 | Node logs | The 8 pairing codes of this run grepped in the instance log, its `server-data/logs`, and the containers' logs; `pairing=` grepped | ENV-2, ENV-3 | Pass | (recorded here) | 0 matches for every code; 0 `pairing=` matches | — |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part: What You Tried And Why It Still Needs The User |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-08 | Proven | — |
| AC-002 | Yes | API-08, API-07 (another network: a different network ID is asked again) | Proven | Moving this Mac to another real Wi-Fi was not done (it would disturb the user's machine); the network-change rule is proven on Linux (API-07) and in unit tests |
| AC-003 | Yes | API-01, API-07, API-08 | Proven | — |
| AC-004 | Yes | API-09, API-12 (phone pairs with the Docker node) | Proven | — |
| AC-005 | Yes | API-10 | Proven (emulated second computer) | A second physical computer was not available; the remote node ran in its own Linux network namespace with its own unreachable addresses. The user's own remote nodes are the remaining check |
| AC-006 | No | API-08 (command, Copy, Check again shown), API-16 | Only The User Can Check (after-setup part) | The command text and controls are proven; "after setting it up, Check again shows the Tailscale HTTPS state" needs Serve run on the user's tailnet (U-006) |
| AC-007 | Yes | API-04, API-18 | Proven | — |
| AC-008 | Yes | API-12 (Share), API-04 (resolver per entry form) | Proven for the Share form; Scan decode Only The User Can Check | API-13: the emulator camera's virtual scene could not show the QR poster headless. A real phone camera scanning the desktop QR remains for the user |
| AC-009 | Yes | API-12 | Proven | — |
| AC-010 | No | API-12 (0 and 2 nodes) | Proven | — |
| AC-011 | Yes | API-12 | Proven | — |
| AC-012 | No | API-03 (History (31) component test), API-15 (real revoke → History (1)) | Proven | — (the date text inside it: API-17) |
| AC-013 | Yes | API-01, API-08, API-11 | Proven | — |
| AC-014 | Yes | API-15 | Proven | — |
| AC-015 | No | API-06, API-18 | Proven | — |
| AC-016 | Yes | API-06, API-12 | Proven | — |
| REQ-014 texts (spec "Last seen 2 minutes ago", "Revoked Oct 28") | No | API-17 | **Not Proven (Fail)** | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 88% | API-05…API-18 | REQ-014 dates fail (API-17); AC-005 on one machine; camera decode and Serve ports for the user | Fix API-17; user checks |
| Changed-boundary execution directness | 75% | 95% | API-07…API-15 real routes, real containers, packaged renderer, real WebView bridge | — | — |
| Cross-boundary integration realism and mock gap | 70% | 92% | API-08…API-12, API-15, API-18 | Second computer emulated by a network namespace | The user's own remote node |
| Environment, configuration, identity, and fixture fidelity | 75% | 90% | Real Mac facts (ENV-2), real Linux kernel (API-07), released server and app (API-15, API-18) | Linux interfaces created by the test (not a real tailscaled/WireGuard peer); macOS VPN not measured | A Linux host with Tailscale |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 95% | Discard by tab/close/off, consumed, expired, unpublished port, nothing checkable, wrong typed address, unreachable node, revoke | — | — |
| User-surface, browser, and desktop-shell confidence | 70% | 85% | API-06, API-08…API-12 | API-17 visible mixed-language text; camera decode not run | Fix API-17; real phone scan |
| Durable regression coverage quality and relevance | 85% | 90% | MSP-06/09 updated (API-06); TESTING.md fresh-start rule (API-05); existing unit/E2E suites | No durable test for the phones list's locale; the Linux check is a temporary probe | A spec asserting the app locale in `ConnectedPhones` |

- Overall post-repository confidence: 76%
- Overall final confidence: 91%
- Calculation method: simple average of the seven categories.
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `Yes` — requirement proof 88% and user surface 85%, both from API-17.
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: API-17 (fail); AC-005 on one physical machine; Scan decode with a real camera; Serve HTTPS ports (U-006).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Project Desktop Validation` (isolated packaged instance), `Worker or Distributed` (Docker and Linux test nodes), `Browser` (MSP probe), `Other` (Android emulator, WebView DevTools)
- Confidence gap it addressed: node windows other than the embedded one exist only in Electron; `file://` checks (U-003); real container ports (AC-004); another computer's facts (AC-005); Linux detection (U-001/4/5); the phone side with real codes; pre-change data (AC-014).
- Browser validation needed: yes, for the `/mobile` page and node sheet (MSP probe, durable).
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed: isolated instance of this worktree's packaged build, driven over its CDP control port; node windows opened from Nodes › Manage like a user.
- Web-equivalent behavior: panel, store, checks, code lifecycle (API-08…API-11). Shell-specific: `file://` origin checks to LAN, tailnet and HTTPS addresses all answered (U-003, API-08 section 1); non-embedded windows for local-container and remote nodes (API-09, API-10).
- Effect on any already-running desktop application: `None` (own ports and data root; the host's own AutoByteus received read-only status requests from the product's Tailscale HTTPS check, by design).
- Behavior not directly proven: none in the shell beyond the user-only items.

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Not Affected` (allowed-local-networks.json); `Directly Usable — No Migration` (device way, page session `nodeName`, Android saved entries).
- Representative existing data used: made by the released server and the released app (API-15), not copied.
- Approved transition followed without an unnecessary migration: `Yes`
- Cases: API-15 (device row `connectionWay: null`, session without `nodeName` names the node by host, saved entry opens, legacy row revocable), API-08/API-10 (new file written per keeper).
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none found.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (status `serverName` and `/address-candidates` gone; the released app works because the payload is unchanged, API-18)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal: Obsolete Assertion, Upstream Evidence, And Replacement Or No-Replacement Rationale |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (setup, `pairingFor`) | Updated | API-06 | Status `serverName` removed (design removal plan); the probe names the node in the pairing request as the desktop does and records the status fields |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` MSP-06 | Updated (assertion removed) | API-06 | "the peer is not reachable in the connection sheet": REQ-019 removed the sheet's peer list. No replacement needed: MSP-06 still proves the peer's rows "Not reachable" and the notice with Retry |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` MSP-09 | Updated | API-06 | "the peer with what it offers" replaced by "no peer list in the sheet"; adds refresh icon / "Retry" (AC-016), "Unpair from <node>" (DEC-018), the name from the pairing code (REQ-011), the browser page with one "Connect to <name>" tap and "Get the Android app" (AC-015) |
| `TESTING.md` Fresh-start build | Updated | API-05 | Android build inputs and the Android job's command with an empty Gradle home |

- Added or updated paths attached for proportional test-code review: `No` (failure round; with the passing round)
- Diff or repository evidence supplied for removed paths: the commit `test(mobile): …` in the handoff

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| A second physical computer | Linux network namespace in a test container with its own interfaces | One machine available | Real remote LAN routing not exercised |
| Linux Tailscale and WireGuard | `tailscale0` TUN held by a test process; `wg0` WireGuard without peers | No tailnet/WireGuard peer for a test host | Interface facts are real kernel facts; traffic through them not exercised |
| Phone | Android emulator | No physical phone attached | Camera decode (API-13) |
| Pairing exchanges for desktop-side cases | `curl` POST to the node, as the page does | Faster and exact for code states | The page path itself is proven in API-06, API-12, API-15, API-18 |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Isolated instance `iso-49410-016d` | Yes | `isolated-app stop` | `dataRootRemoved: true`, ports released; `list` → `[]` |
| Containers `ospp-e2e-docker-a/-b`, `ospp-e2e-linux`, `ospp-e2e-old` and 9 volumes | Yes | `docker rm -f -v`, `docker volume rm` | 0 left; the user's `autobyteus-server-0/1/2` untouched and running |
| Emulator app data, port forwards, emulator | Yes | `adb uninstall`, `adb forward --remove-all`, `adb emu kill` | done |
| MSP probe stack | Yes | probe `finally` | `serversLeft: 0, rootRemoved: true` |
| `/tmp/ospp-e2e` clones, Gradle home, server package, live code files, QR poster | Yes | `rm -rf` | removed; harness scripts kept under `/tmp/ospp-e2e/scripts` |
| Harness: `/tmp/ospp-e2e/scripts/{run.mjs,desk-lib.mjs,steps/*,phone-exchange.sh,ui.sh,bridge-abuse.mjs,linux-node-setup.sh,tun-holder.py}` | Yes | kept for the rerun; not in the repository (one-off journeys over CDP/adb, not a project harness) | — |

## Preliminary Classification (On `Fail`)

- `Local Fix` — implementation (`autobyteus-web/components/settings/phone/ConnectedPhones.vue`): format "Last seen …" and "Revoked …" with the app's UI locale (`useLocalization().resolvedLocale`, already imported for `t`) instead of `undefined` (the OS locale), and add a spec that renders the list with a non-English OS locale and the app in English.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, or parts only the user can check: Fail: REQ-014 texts (API-17). User-only: AC-006 after-setup state (U-006), AC-008 Scan with a real camera, AC-005 with his own second computer.
- Preliminary classification and recommended owner: `Local Fix`, implementation engineer (confirmed by the code reviewer's failure-origin review).
- Next recipient from `get_handoff_rules`: in the handoff message.
- Notes: every other case passed. Follow-ups added: FU-004 (remote-node copy "this computer"), FU-005 (HTML preview blocked inside the Android app, pre-existing). Delivery note: `autobyteus-android/README.md` still describes the removed scan-and-tick flow and the Phone Setup guide.
