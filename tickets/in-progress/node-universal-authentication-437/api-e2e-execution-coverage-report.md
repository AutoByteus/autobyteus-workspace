# API/E2E Execution Coverage Report — node-universal-authentication-437 (autobyteus-437), slice 1 "no key, no access"

## Round

- Coverage investigation (the plan; it lists the upstream documents): `tickets/in-progress/node-universal-authentication-437/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/node-universal-authentication-437/api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `tickets/in-progress/node-universal-authentication-437/api-e2e-test-progress.md`
- Round and trigger: round 1; Code Reviewer CRR-002 Pass on IR-002 (HEAD `b6a57ab154`, base `b690a5dfdb`)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - Browser probes attach the credential in the probe's browser context, not through the `nuxt dev` proxy: the proxy path is broken (F-1, API-15). The context keeps the header on loopback only (`context.route` strips it elsewhere), because the browser-wide header made icon-CDN requests fail CORS preflight (API-05 run 2).
  - The real gateway (API-11) and `pwsh` (API-12) ran in throwaway `alpine` containers with `apk` packages: Docker Hub and MCR image pulls stalled behind Docker Desktop's proxy.
  - API-03 MSP-08 and API-08 NVP-05 failed. Their causes were found by reproducing and narrowing (TESTING.md Rule 9): a base build in a temporary worktree, and temporary instrumentation of `dist` files, each restored afterwards (`cmp` equal).
  - API-FS (fresh-start build) is deferred to the next round: the fixes F-1…F-3 are expected to touch build inputs (`autobyteus-web/nuxt.config.ts`), and the proof must run on the commit that is released.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437/tickets/in-progress/node-universal-authentication-437/evidence/api-e2e/`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (after the fix round's Pass; this round is `Fail` → failure-origin review)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `b6a57ab154` | macOS 26 (Darwin 25.5) arm64 | packaged desktop `electron-dist/mac-arm64` built by API-00 (Electron 42.11.16); isolated instances with their own data roots | CDP attach-only (playwright-core `connectOverCDP`); en |
| ENV-2 | `b6a57ab154` | same host; LAN `192.168.2.158/24`, Tailscale `100.127.30.107` | `autobyteus-server-ts/dist` built at `1e02bea41e` (IR002-05; no server source changed since), Node 22.23.1 | nodes bound `0.0.0.0` or `127.0.0.1`; temp data folders |
| ENV-3 | `b6a57ab154` | Docker Desktop (linux/arm64), Tailscale | image `abtest437/autobyteus-server:test`: `autobyteus/autobyteus-server:beta` with this worktree's server package (`docker buildx … --target server-package`, API-02 build log); released launcher (`b690a5dfdb`) and this launcher; guarded `docker` wrapper | test names `autobyteus-server-3/4`, temp launcher state; the user's `autobyteus-server-0/1/2` never touched (73 calls audited) |
| ENV-4 | `b6a57ab154` + this round's probe changes | same host | headless Google Chrome 156.0.8078.80 via playwright-core; `nuxt dev`; probe-owned `dist/app.js` nodes with the scripted AGY CLI | probe launch credential (`fixtures/probe-node-access.mjs`) |
| ENV-5 | `b6a57ab154` | throwaway `alpine:latest` containers | nginx 1.30.6, PowerShell 7.6.9 (apk) | test-owned, removed |

## Cases

Evidence paths are relative to the evidence folder. Credentials, setup codes, invites and peer secrets are redacted in every file (scan: no match for `own_|mra_|mhub_|mcpg_…{30,}`, `abpi_…`, `access_token=…`, `"peerSecret": "…"`).

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-IMP | AC-001, 002, 006, 007, 009; QR-001/002 | server unit/integration/e2e, two-server, Electron/web specs, launcher, built CLI | Reused: IMP-01…19, IR002-01…06 | — | Pass | (implementation handoff Checks Run) | — | Server source unchanged since `1e02bea41e`; IR002 checks ran there; IMP checks on earlier commits: the files changed since are the CR-001 peer files (rerun by IR002-03/04/06), `NodeRow.vue` (IMP-19 at `d8fbe5082a`) and docs |
| API-00 | — | packaged desktop build | `pnpm -C autobyteus-web build:electron:mac` | ENV-1 | Pass | `API-00-electron-build.log` | `# Exit status: 0` | |
| API-01 | AC-003; NAS-01, 16, 17, 18, 30, 31, 33, 35, 37, 19, 23; NA-8 | Electron shell + renderer + own node + a server node | isolated instance; CDP step scripts `API-01-electron/steps/e*.js` (exact code); transcript | ENV-1, ENV-2 | Pass | `API-01-electron/API-01-transcript.txt`, `API-01-e3.png` … `API-01-e24.png` | transcript sections NAD-01…NAD-13; e.g. `"0\nTERM-MARK-42"`, `"fetch failed: Failed to fetch"` + `REMOTE_ACCESS_ORIGIN_REFUSED /graphql … origin null`, in-app browser `NODE_CREDENTIAL_REQUIRED` on the previewed file, `200 POST …/backend/graphql`, sockets closed 37–40 ms after Disconnect | The window's file **search** was not exercised here; it fails (F-2, API-03) |
| API-02 | AC-004; NAS-02, 03, 13, 27, 32, 33, 34; NA-4; UNK-006; RU-01, RU-03 | Docker launcher + container + Electron | `API-02-docker/api02.sh` (launcher log), then desktop steps `d1…d4.js` | ENV-3, ENV-1 | Pass | `API-02-docker-launcher.log`, `API-02-docker/API-02-desktop-transcript.txt`, `API-02-docker/API-02-d*.png`, `API-02-server-package-build.log` | `published: 0.0.0.0:8004` → after `setup-code`: `published: 100.127.30.107:8004 127.0.0.1:8004`, `nodeId after: … (same: yes)`, `NAS-27 LAN health (new publishing) 000 curl-exit=7`, `UNK-006 Tailscale health 200`; desktop: `Server 1.5.12-beta.8`, `ws://127.0.0.1:8004/ws/node-desktop` 101, Disconnect closes 4 sockets in ≤ 54 ms | Node update: the update status read is authorized (`inPlaceUpdate: available`); an in-place update was not performed (needs a newer signed package) |
| API-03 | AC-005; NAS-05, 08, 09, 10 (phone bundle) | phone bundle `/mobile` + desktop window | `pnpm -C autobyteus-web build:mobile-web`; `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<API-03-mobile-shell>`; MSP-08 rerun alone `--cases=MSP-08` | ENV-4 | **Fail** | `API-03-mobile-shell.log`, `API-03-mobile-shell/mobile-shell-probe.json`, `API-03-mobile-shell/MSP-08-files-search.png`, `API-03-mobile-shell-MSP-08-rerun.log`, `API-03-MSP-08-cause.txt`, `API-03-MSP-08-search-check.mjs` | 19 of 20 cases `Pass`; `MSP-08 Fail: one search over the workspace` (rerun: same); screenshot "No files matched the workspace search."; cause file: base `["src/app.ts"]` vs this branch `[]` + `Search aborted`; `preValidation off -> {"searchFiles":["src/app.ts"]}` | **F-2** |
| API-04 | AC-008; NAS-05, 06, 07, 08, 09, 10, 11, 12, 14, 28; DEC-011, DEC-012 | real network admission on this Mac's addresses | `node API-04/API-04-real-network-probe.mjs <dir>` (node bound `0.0.0.0`) | ENV-2 | Pass | `API-04/API-04-real-network.log`, `API-04/API-04-node.log`, `API-04/API-04-network.json` | every row `PASS`; `NAS-07 … 192.168.2.158 … 403 NODE_NETWORK_REFUSED` (valid key, the key never checked), after Allow: `NAS-06 phone on allowed LAN … 200`, `NAS-08 … 403 NODE_ROUTE_NOT_PERMITTED`, `NAS-09 … close 4403 PHONE_ACCESS_ROUTE_REFUSED`, `NAS-10 … close 4403 REMOTE_ACCESS_DEVICE_REVOKED`; `credential strings in the node log: 0` | First run had two probe bugs (network field name, a non-phone socket); its output was replaced by the rerun |
| API-05 | preserved collaboration (run titles) | browser + two nodes, pairing by invite | `pnpm -C autobyteus-web test:e2e:remote-run-title --output-dir=…` | ENV-4 | Pass | `API-05-remote-run-title.log`, `API-05-remote-run-title/remote-run-title-probe.json`; earlier runs `…-run1-devproxy*`, `…-run2-cors*` | `remote-run-title probe: Pass`, RRT-01…06 `Pass`, 0 browser errors | run 1 found F-1; run 2 harness CORS noise (fixed in the fixture) |
| API-06 | preserved collaboration (remote runs in the tree) | browser + two nodes | `test:e2e:remote-runs-in-tree` | ENV-4 | Pass | `API-06-remote-runs-in-tree.log`, `API-06-remote-runs-in-tree/` | RTP-01…07 `Pass` | |
| API-07 | preserved (Model Routing, window switched to the peer) | browser + two nodes | `test:e2e:model-routing-decisions` | ENV-4 | Pass | `API-07-model-routing-decisions.log`, `API-07-model-routing-decisions/` | `Model Routing decisions probe: Pass`; 8 `Pass` lines | |
| API-08 | preserved autobyteus-290 vocabulary, held-back nodes (REQ-913) | browser + two nodes + phone | `test:e2e:node-vocabulary` | ENV-4 | **Fail** | `API-08-node-vocabulary.log`, `API-08-node-vocabulary/node-vocabulary-probe.json`, `API-08-node-vocabulary/NVP-05-card-held-back.png`, `API-08-NVP-05-cause.txt` | NVP-01…04 `Pass`; `NVP-05 Fail: … Response not successful: Received status code 503`; server log `"url":"/graphql","statusCode":503`; cause file: `readonly statusCode = 503` added in `9765d0dad8` + mercurius `lib/errors.js` 70–74 | **F-3** |
| API-09 | REQ-006, DEC-014, NAS-19, 23; preserved Nodes page | browser Nodes page, 11 nodes | `test:e2e:remote-nodes-page` | ENV-4 | Pass | `API-09-remote-nodes-page.log`, `API-09-remote-nodes-page/` (run 3); `…-run1*`, `…-run2*` | NP-01…13 `Pass`, `remote-nodes-page probe: Pass` | run 1: stale epsilon expectation (now "Pair again", NAS-23) and a probe variable; run 2: NP-07 race outcome changed (see Observations O-3) |
| API-10 | M-9, RU-01, AC-707 preserved causes | browser Nodes page with a Docker node | `PATH=/tmp/abtest437/bin:$PATH pnpm -C autobyteus-web test:e2e:nodes-docker-address --docker-image=abtest437/autobyteus-server:test` | ENV-3, ENV-4 | Pass | `API-10-nodes-docker-address.log`, `API-10-nodes-docker-address/`; `…-run1*` | ND-01…05 `Pass` | run 1: stale address assertion (M-9 takes the invite's first answering candidate `localhost:<port>`) |
| API-11 | AC-006 at a base path (CR-001), RU-04 | real nginx 1.30 prefix-stripping gateway | `node API-11-gateway/API-11-gateway-probe.mjs <dir>` | ENV-2, ENV-5 | Pass | `API-11-gateway/API-11-gateway.log`, `API-11-gateway/API-11-nginx-access.log`, `API-11-gateway/API-11-node-*.log` | `A's peer row for B: {… "baseUrl":"http://127.0.0.1:56359/autobyteus","paired":true}`, `signed offer read … "refusalCode":null`, `the delegated run on B: {… "summary":"Gateway check. Marker GW-437."}`, `nginx lines for /autobyteus/rest/remote*: 5; statuses 200,201`, `B refusal lines: 0` | |
| API-12 | NA-5 Windows launcher (parse + contract) | PowerShell launcher | `docker run alpine … apk add powershell … pytest -k powershell` | ENV-5 | Pass | `API-12-pwsh-launcher.log` | `PowerShell 7.6.9`, `test_powershell_launcher_parses_when_pwsh_is_available PASSED` | Parse and text contract only; the launcher's runtime on Windows (named pipe) not run |
| API-13 | QR-003 | built-server suites never run since the change | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… RUN_BUSY_STOP_NOW_E2E=1 vitest run` (3 files) | ENV-2 | Pass | `API-13-built-server-suites.log` | `Test Files  3 passed (3)`, `Tests  15 passed (15)` | |
| API-14b | `--allow-local-network` across `upgrade --all` (handoff edge case) | launcher (fake docker) | `python3 -m pytest -q -rs` the five launcher files | ENV-2 | Pass | `API-14b-launcher-tests.log` | `61 passed, 2 skipped` (pwsh; port 8001 busy on this host) | new test `test_allow_local_network_is_kept_when_upgrade_all_recreates_the_node` |
| API-15 | RU-02 `pnpm dev`; QR-003; design dev runtime (handoff assumption 11) | `nuxt dev` proxy, window WebSockets | `node scripts/development/run-dev.mjs` (clean env), headless Chrome `API-15-pnpm-dev/devcheck.mjs`, raw upgrades with curl | ENV-2 | **Fail** | `API-15-pnpm-dev/API-15-upgrade-repro.log`, `API-15-pnpm-dev/API-15-window-websockets.json.txt`, `API-15-pnpm-dev/API-15-pnpm-dev-output-excerpt.log`; first sighting `API-05-remote-run-title-run1-devproxy/` | `curl upgrade ws://127.0.0.1:3000/ws/projects` → `HTTP/1.1 200 OK … x-powered-by: Nuxt`; window: `Error during WebSocket handshake: Unexpected response code: 200`, `ERR_CONNECTION_RESET`; dev output `Restarting Nuxt due to error: Error: read ECONNRESET` (7×); HTTP GraphQL through the proxy `200` | **F-1** |
| API-FS | build inputs (`nuxt.config.ts`, `generated/graphql.ts`, `scripts/**`) | fresh clone release build | — | — | Not Tested | — | — | Deferred to the fix round: F-1's fix will change `nuxt.config.ts`; the proof must run on the released commit |
| API-16 | QR-003 | the other 36 probes under `autobyteus-web/tests/e2e/` that start `dist/app.js` | — | — | Not Tested | — | — | Not updated this round (no credential; they will get 401). API/E2E-owned; they move to `fixtures/probe-node-access.mjs` next round |

## Failures

| Failure | Case | Expected (approved basis) | Observed | Cause (found, Rule 9) | Preliminary classification / owner |
| --- | --- | --- | --- | --- | --- |
| **F-1** `pnpm dev` window has no WebSockets | API-15 (first seen API-05 run 1) | The development window works through the Vite proxy, which adds the development launch credential to HTTP, `/ws` and GraphQL subscriptions (handoff assumption 11; design scope "dev runtime and Vite proxy"; QR-003) | Every `/ws/*` and `/graphql` upgrade to the dev origin `127.0.0.1:3000` is answered `200 text/html` by Nuxt or reset; Nuxt restarts on `read ECONNRESET` repeatedly; agent streams, terminal, file explorer, notifications never connect; HTTP GraphQL works | `autobyteus-web/nuxt.config.ts` makes the window's node the frontend origin (`developmentFrontendUrl`) and relies on `vite.server.proxy` `ws: true` for `/ws` and `/graphql`; Nuxt's dev server does not hand WebSocket upgrades to that proxy rule (the curl upgrade gets Nuxt's page) | `Local Fix` — implementation engineer (the dev proxy mechanism; the design intent, credential only in the dev server process, stays) |
| **F-2** workspace file search returns nothing (desktop and phone) | API-03 MSP-08 (and its rerun) | Preserved: Files search over the workspace (MSP-08; desktop file explorer search uses the same `searchFiles`) — Preserved Behavior Boundary, AC-003 "files", AC-005 "all MSP cases pass" | `searchFiles` returns `[]` for owner and phone; node logs `Error searching files: Search aborted` per call; base `b690a5dfdb` and the released image return `["src/app.ts"]` | `src/api/security/node-access-plugin.ts` registers an async `preValidation` hook for every request (returns early for non-peers). With it the request's `IncomingMessage` has ended and is `destroyed` when Mercurius builds the context, so `createRequestAbortSignal` (`graphql-request-context.ts`, unchanged since `87522ceda1`) aborts at creation (`reqDestroyed=true readableEnded=true`); with that hook off, search works | `Local Fix` — implementation engineer |
| **F-3** held-back Memory Sync card loses its reason | API-08 NVP-05 | Preserved autobyteus-290 REQ-913: the card says "Memory Sync is waiting for its data migration." (the class's own doc: "the settings GraphQL reads and saves fail with its text") | The card shows "Response not successful: Received status code 503" | `9765d0dad8` added `readonly statusCode = 503` to `MemorySyncNotMigratedError`; Mercurius uses a resolver error's `originalError.statusCode` as the HTTP status when there is no data (`mercurius/lib/errors.js` 70–74), so the settings query answers HTTP 503 and the client never reads the GraphQL error | `Local Fix` — implementation engineer |

## Observations (Non-Blocking)

| ID | What | Evidence | Suggestion |
| --- | --- | --- | --- |
| O-1 | `new-container` still ends with "Next step: paste Backend into Add Remote Node in AutoByteus. Then open that node over your trusted private network." after printing the setup code | `API-02-docker-launcher.log` section C; `scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh:254` | Word it for the setup-code step with the fix round |
| O-2 | After Disconnect, the open node desktop viewer says "This viewer is not allowed on this node" (its 4403 text) rather than that the node needs connecting | `API-02-docker/API-02-d4-window.png` | UX nit; NA-13 allows a generic message |
| O-3 | The pairing exchange numbers a taken name itself (`peer-directory.ts` `savePairedPeer` → `uniqueName`): the confirmation said "mu calls this node “Embedded Node”", the result is "Embedded Node 2" with no notice; before, the step failed with "mu already has a node named Embedded Node." and Try again re-planned | `API-09-remote-nodes-page-run2.log` (NP-07 wait for the failure), `API-09-remote-nodes-page/` NP-07 | The end state follows the naming rule; the probe now asserts it. Reviewer to confirm it is intended |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | R-IMP (IR002-04, IMP-06), API-04, API-01 (curl to the embedded node) | Proven | — |
| AC-002 | Yes | R-IMP (IMP-17, IMP-03) | Proven | — |
| AC-003 | Yes | API-01, API-02 (node desktop) | **Not Proven** — runs, files view, HTML preview, applications, terminal, node desktop, in-app 401 and no key in URL/log/page are proven; workspace file search fails (F-2) | — |
| AC-004 | Yes | API-02, API-01 (NAD-07…13), API-10 | Proven (node update: authorized status read, not an executed update) | — |
| AC-005 | Yes | API-03, API-04 | **Not Proven** — 19 of 20 MSP cases pass under enforcement; MSP-08 fails (F-2) | — |
| AC-006 | Yes | R-IMP (IR002-06, IMP-09), API-11, API-01 (NAD-09, NAD-13), API-02 (D2), API-05…07, API-09 | Proven | — |
| AC-007 | Yes | R-IMP (IMP-04 NAS-25, IMP-07 NAS-26, UI-00 MCP panel) | Proven | — |
| AC-008 | Yes | API-04, API-02 (publishing, UNK-006) | Proven on this computer's real LAN and Tailscale addresses; **a second physical device: Only The User Can Check** | Tried: the tailnet Linux host on this LAN (no SSH), the phone (not attached to adb), Android emulators (NAT to loopback). A phone on the home Wi-Fi (allowed / not allowed) and on a café/other network would confirm it |
| AC-009 | Yes | R-IMP (IMP-06), API-04 (NAS-08 over LAN) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 70% | R-IMP; API-01…04, 11 | AC-003 and AC-005 not proven (F-2); preserved behaviors broken (F-1, F-3) | the fixes, then API-03, API-08, API-15 again |
| Changed-boundary execution directness | 85% | 90% | packaged Electron, real Docker/launcher, real addresses, real nginx, phone bundle | Windows launcher runtime | — |
| Cross-boundary integration realism and mock gap | 80% | 90% | API-01, 02, 04, 11; probes on real servers | — | — |
| Environment, configuration, identity, and fixture fidelity | 80% | 85% | real launch credentials, setup codes, invites, phone pairing | dev runtime broken (F-1); a second physical device | fix F-1; user device check |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 90% | Disconnect with open terminal / node desktop, re-pair, NAS-34 upgrade, revocations | Wi-Fi change while running (DS-007 refresh) not exercised on a real network change | — |
| User-surface, browser, and desktop-shell confidence | 70% | 70% | API-01, 02, 05…10 | file search (F-2), Memory Sync card (F-3), dev window (F-1) | the fixes |
| Durable regression coverage quality and relevance | 70% | 75% | 7 probes updated + fixture; launcher test added | 36 probes still without a credential (API-16); no durable test for F-1…F-3 yet | durable tests with the fixes; API-16 |

- Overall post-repository confidence: 77%
- Overall final confidence: 81%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-003, AC-005)
- Any final applicable category below `90%`: `Yes` — requirement proof 70%, environment fidelity 85%, user surface 70%, durable coverage 75%
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-1, F-2, F-3; API-16; API-FS deferred

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed this round)
- Execution mode: `Project Desktop Validation` (isolated packaged instance), `Browser` (probes), `Live API` (real addresses), `Worker or Distributed` (Docker, gateway, two nodes)
- Confidence gap or residual risk it addresses: Electron attachment for iframes/WS, Docker publishing (UNK-006), real-network admission, phone bundle, peers through a real proxy — none provable by the mocked repository tests
- Browser validation needed: Yes — the window and phone are where F-1 and F-2 show
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed: `pnpm --silent isolated-app start --from-worktree` (and `--data-root` for the restart leg) of the API-00 build, CDP attach-only; never the user's app or data
- Web-equivalent cases: API-05…10; shell-specific: API-01 (attacher on iframes, WebSockets, in-app browser partition, encrypted store, IPC Connect/Disconnect, restart with a new launch credential), API-02 (node desktop stream, Disconnect)
- Effect on any already-running desktop application: `None`
- Behavior not directly proven: an executed in-place node update; Windows

## Persisted-Data Transition Checks

- Approved decision: `Directly Usable — No Migration`
- Representative existing data used: a peer row of the released shape (no `peerSecret`) in the embedded node's `peers.json` (API-01 NAD-13); a Docker node created by the released launcher (v9, publishing on every address) (API-02 A); the released node registry and phone session (API-08 NVP-01, NVP-04)
- Approved transition followed without an unnecessary migration: `Yes` ("Pair again" then re-pair keeps `addedAt`; `setup-code` recreates with volumes kept, same node ID)
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none found

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (old-launcher containers answer only exempt endpoints, NAS-34)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/fixtures/probe-node-access.mjs` | Added | API-03, 05…10 | — |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated (launch credential, owner headers/sockets, invite pairing, desktop contexts attach; phone contexts untouched) | API-03 | — |
| `autobyteus-web/tests/e2e/remote-run-title-probe.mjs` | Updated | API-05 | — |
| `autobyteus-web/tests/e2e/remote-runs-in-tree-probe.mjs` | Updated | API-06 | — |
| `autobyteus-web/tests/e2e/model-routing-decisions-probe.mjs` | Updated | API-07 | — |
| `autobyteus-web/tests/e2e/node-vocabulary-probe.mjs` | Updated (the pairing exchange stays credential-free, as a phone sends it) | API-08 | — |
| `autobyteus-web/tests/e2e/remote-nodes-page-probe.mjs` | Updated (pairing flow: `turnOnThere`/`pair` steps and texts; "earlier use" by invites plus a removal on epsilon; NP-03 epsilon "Pair again"; NP-06 name-there line; NP-07 numbered name; NP-12 allowed ops `CreatePeerInvite`; receipts redacted) | API-09 | Removed assertions: `registerHere`/`registerThere` steps, "Trusted private network only: nodes are not authenticated.", the address line, `AddPeerNode`/`GetPeerAddressCandidates`/`ResolvePeerAddress` ops — the removed one-way registration (removal plan; M-9). Replacement: the `pair` step assertions above |
| `autobyteus-web/tests/e2e/nodes-docker-address-probe.mjs` | Updated (credential incl. the container's launch credential, pairing step, address from the invite's candidates, receipts redacted) | API-10 | Removed: ND-03's `resolvePeerAddress` attempts and ND-01's `peerAddressCandidates` read — those GraphQL queries were removed by the change (handoff assumption 7); the Change-address causes stay asserted |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` | Added `test_allow_local_network_is_kept_when_upgrade_all_recreates_the_node` | API-14b | — |

- Added or updated paths attached for proportional test-code review: `No` — this round is `Fail`; test-code review follows a passing round
- Diff or repository evidence supplied for removed paths: the commit with this report

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| The desktop main process in browser probes | the probe's browser context carries the credential (loopback only) | browser probes have no Electron shell | browser probes prove web-equivalent behavior; the attacher is proven by API-01/02 |
| Model inference | scripted AGY CLI, recorded Grok ACP replay | no provider calls needed | transport only |
| A second LAN device | this Mac's own LAN/Tailscale addresses | none drivable here | AC-008 user part |
| `docker pull` of the local test image | guarded wrapper (no-op for `abtest437/*`) | the image exists only locally | none for publishing/recreate |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Isolated instances `iso-59228-236e`, `iso-60391-bb96`, `iso-62106-b5ee` | Yes | `isolated-app stop`; kept data root removed | `isolated-app list` shows none |
| Server nodes on ports 59849, 60779/60848 and the search/gateway checks | Yes | SIGTERM; temp roots removed | none listening |
| Containers `autobyteus-server-3/4`, `abtest437-search-beta`, `abtest437-search-head`, `abtest437-gateway`, alpine runs | Yes | `docker rm -f -v`; 10 named volumes removed | `docker ps -a`: only the user's `autobyteus-server-0/1/2` (Up 2 days) and others' containers |
| Image `abtest437/autobyteus-server:test` | Yes | `docker image rm` at the end of the round | see revision record |
| `pnpm dev` stack (ports 8000/3000) | Yes | SIGINT | ports free |
| Base worktree `/tmp/abtest437/base-wt` | Yes | `git worktree remove --force` | removed |
| Temporary `dist` instrumentation (`node-access-plugin.js`, `graphql-request-context.js`) | Yes | restored from copies | `cmp` equal ("restored") |
| `/tmp/abtest437` scratch (scripts, server package, launcher copies) | Yes | removed at the end of the round | — |

## Preliminary Classification (On `Fail`)

- `Local Fix` for F-1, F-2 and F-3: bounded implementation corrections inside the ticket's changed code (`nuxt.config.ts` dev proxy, the gate plugin's hook registration, `MemorySyncNotMigratedError`), each with its cause found and a reproduction. Owner: implementation engineer, after failure-origin review.
- API/E2E-owned items for the next round: API-16 (36 probes), API-FS.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, or parts only the user can check: AC-003 (F-2), AC-005 (F-2); AC-008 second physical device (user)
- Preliminary classification and recommended owner: `Local Fix` → implementation engineer (F-1, F-2, F-3)
- Next recipient from `get_handoff_rules`: see the handoff message (failure-origin review)
- Notes: everything else validated passes, including the security boundary on real surfaces (admission, credentials, attachment, Docker publishing incl. UNK-006, revocation, peers through a real gateway).
