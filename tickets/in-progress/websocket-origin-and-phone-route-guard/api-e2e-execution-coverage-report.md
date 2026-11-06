# API/E2E Execution Coverage Report — websocket-origin-and-phone-route-guard (autobyteus-403)

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, after code review pass CRR-001 (Full Review of IR-001)
- Prior round reviewed: None
- Deviations from the investigation's plan, and why:
  - API-04 also runs the phone journey in WebKit through the Tailscale-shaped proxy (planned). Playwright's WebKit build v2248 was installed into the user's Playwright cache for this, because only v2227 was present.
  - API-08 gave the isolated instance's embedded node the scripted AGY CLI and turned applications on (`ENABLE_APPLICATIONS=true`) in that instance's own `server-data/.env`, with restarts. The embedded server receives only a baseline environment, and the instance starts with applications off.
  - The Docker node runs this worktree's full server package (`docker buildx … --target server-package`), not a `dist`-only mount. The image's built-in package is 1.5.12-beta.3 and differs in many files beyond this change, so TESTING.md does not allow a `dist`-only mount.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/websocket-origin-and-phone-route-guard/tickets/in-progress/websocket-origin-and-phone-route-guard/evidence/api-e2e/`. The temporary probe sources are in `evidence/api-e2e/probes/`.

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (`autobyteus-web/tests/e2e/mobile-shell-probe.mjs`, commit `14e3681cdc`)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `a24421610f` (source `88a93aaf26`) | macOS 26.5.2 arm64 | Node 22.23.1; server `dist` built from this worktree; headless Chrome (stable) via playwright-core | Server E2E: `env -i PATH HOME=<resolved temp> TMPDIR` |
| ENV-2 | `a24421610f` + the probe update (committed as `14e3681cdc`) | macOS 26.5.2 arm64 | Server `dist` and phone bundle (`build:mobile-web`) built from this worktree; Chrome; Playwright WebKit 26.0 (v2248) | Probe-owned alpha/beta on 127.0.0.1 with temp data roots; scripted AGY CLI and the fake Grok ACP fixture; Chrome `--host-resolver-rules` for `192.168.77.10` and `*.ts.net`/`evil.example`/`gw.example.test`; self-signed TLS proxies |
| ENV-3 | `a24421610f` (source `88a93aaf26`) | macOS 26.5.2 arm64 | Packaged Electron app built by `pnpm --silent isolated-app start --build` (instance `iso-58042-7c90`, control port 58042, backend 58043; renderer `file://…/renderer/index.html`) + a test-owned Docker node `abx403-api-e2e-node` (image `autobyteus/autobyteus-server:beta`, this worktree's server package 1.5.12-beta.5 mounted read-only over `/opt/autobyteus/server-package`, `127.0.0.1:57310`, no volumes) | Scripted AGY CLI (`AGY_FAKE_CASE=linked_skills`) on both nodes; Brief Studio imported as a local package on the embedded node |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | Regression | Server typecheck | Reused | — | Pass | (implementation handoff) | — | Ran on `88a93aaf26`; `git diff --name-only 88a93aaf26 HEAD` touches only ticket files |
| IMP-02 | REQ-002, REQ-004, REQ-007; AC-002, AC-004, AC-005 (unit) | Origin rule, route policy, WS handler units, architecture | Reused | — | Pass | (implementation handoff) | — | Same commit |
| IMP-03 | Regression | Whole server unit suite | Reused | — | Pass | (implementation handoff) | — | Same commit |
| IMP-04 | AC-001…AC-006 | Real studio server, real upgrades (`ws` client), CORS via inject | Reused | — | Pass | (implementation handoff) | — | Same commit; the AC-006 log assertions are in this test |
| IMP-05 | BEH-002 preserved (MCP gateway rule, studio CORS headers) | Studio HTTP contract | Reused | — | Pass | (implementation handoff) | — | Same commit |
| IMP-06, IMP-07 | BEH-004…008 server side | Existing WS route suites, update notifications | Reused | — | Pass | (implementation handoff) | — | Same commit |
| IMP-08 | AC-001…AC-006 fail on base | Base reproduction | Reused | — | Fails as expected | (implementation handoff) | — | Same commit |
| API-00 | SCN-A02 | Playwright URL rewrite headers; Chrome host mapping | `node probes/API-00-route-fetch-headers-probe.mjs <web> [forward-host]`; `node probes/API-00-chrome-host-mapping-probe.mjs <web> <server>` | ENV-1 | Pass | `API-00-route-fetch-headers.log`, `API-00-chrome-host-mapping.log` | Mode 1: `"host": "127.0.0.1:…"` with `"origin": "http://192.168.77.10:…"`. Mode 2: host `192.168.77.10:…`. Mapping: the `UPGRADE` rows have host and origin `192.168.77.10:…` and `node.tail-probe.ts.net:…` | A measurement |
| API-01 | Regression, QR-003 | All 235 server E2E files through the new gate | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" pnpm test:e2e` | ENV-1 | Fail (out of scope, FU-004) | `API-01-server-e2e.excerpt.log`, `API-01-server-e2e.full.log.gz`, `API-01-AR14-head-vs-base.log` | `Test Files  4 failed \| 111 passed \| 120 skipped (235)`; each of the 4 failures is quoted with its assertion; AR-14 shows `× AR-14 …` on HEAD and on base `src` | The 4 failures do not involve the gate. A reworded workspace-removal message, a `lastActivityAt` field that the test expects removed, the `deepseek_harness` runtime kind added in d5566977b4, and AR-14 failing identically on base `src` 3bf9240d42. Recorded as FU-004. Every suite that crosses the gate passed. The only refusal lines in the run come from passing tests that assert refusals |
| API-02 | AC-008 (harness) | Mobile-shell probe as committed at HEAD | `node tests/e2e/<HEAD copy of mobile-shell-probe.mjs> --cases=MSP-01 --output-dir=<fresh>` | ENV-2 | Fail (expected: harness) | `API-02-mobile-shell-before-update.log` | `locator('[data-testid="mobile-pair-button"]')` timeout; `19 Remote Access request refused REMOTE_ACCESS_ORIGIN_REFUSED /mobile/_nuxt/<asset> origin http://192.168.77.10:49990` | Shows why the probe needed the update: its Host-rewriting emulation is refused, as the measurement in API-00 predicted. It is not a product defect, because a real phone keeps its Host (API-04) |
| API-03 | AC-008, AC-009 (MSP-06), REQ-006 | Phone shell (LAN shape, Host and Origin kept), alpha + beta, desktop comparison window on Nuxt dev (loopback) | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<fresh>` with the updated probe | ENV-2 | Pass | `API-03/API-03-summary.log`, `API-03/mobile-shell-probe.json`, `API-03/server-alpha.log`, `API-03/server-beta.log`, 3 screenshots | `mobile-shell probe: Pass`; all 15 cases `Pass`; `"unknownBrowserErrors": 0`; beta has no refusal lines; alpha's lines start at log line 298, after its MSP-09 restart: `REMOTE_ACCESS_AUTH_INVALID`/`REMOTE_ACCESS_DEVICE_REVOKED` | Alpha's refusals are MSP-13's unknown (401) and revoked (403) credentials, with today's codes. No `REMOTE_ACCESS_ORIGIN_REFUSED` and no `PHONE_ACCESS_ROUTE_REFUSED`. Cleanup: `serversLeft: 0`, `rootRemoved: true` |
| API-04 | AC-008, ASM-001, ASM-002, SCN-004, SCN-009 | Phone shell on the browser's own network stack: LAN shape (Chrome), Tailscale-Serve-shaped HTTPS proxy (Chrome and WebKit) | `node probes/abx403-phone-origins-probe.mjs <worktree> <out>` (the mobile-shell probe's `--hold` stack); WebKit rerun: `ABX403_JOURNEYS=webkit-tailscale node …` | ENV-2 | Pass | `API-04/API-04-summary.log`, `API-04/API-04-phone-origins.json`, `API-04/API-04-webkit-rerun.json`, `API-04/server-alpha.log`, `API-04/server-beta.log`, screenshots | Each journey: `pair`, `runList`, `agentRun`, `teamRun`, `orgRun`, `delegatedTree`, `remoteRun`, `files`, `newRun` all `Pass`. WS handshakes `('http://192.168.77.10:55079', 101)` and `('https://alpha.tail-probe.ts.net:55195', 101)`. Proxy upgrades with Host `alpha.tail-probe.ts.net:55195` → `HTTP/1.1 101 Switching Protocols`. `node refusal lines during journeys: {'alpha': [], 'beta': []}`. `outsidePhoneList: []` | Messages sent from the phone are verified stored on alpha (agent run, new run) and on beta (remote run). The probe recorded `Fail` only for WebKit console lines. The rerun shows their cause: 27 are Iconify icon fetches (`api.iconify.design`, `api.unisvg.com`, `api.simplesvg.com`) that the probe's own CONNECT proxy refuses by design, and one is the known `localhost:8000/health` feed of the phone bundle. None reached the node. Attempt 1 (`newRun` failed on the probe's own navigation behind the file viewer) and attempt 2 (the probe hung on proxy cleanup) were probe defects, fixed before this run |
| API-05 | AC-009, SCN-006, SCN-007 | Two nodes collaborating (peer REST, `/rest/remote/run-observations`); desktop shell on Nuxt dev (loopback) | `pnpm -C autobyteus-web test:e2e:remote-runs-in-tree --output-dir=<fresh>` | ENV-2 | Pass | `API-05/remote-runs-in-tree-probe.json`, `API-05/server-alpha.log`, `API-05/server-beta.log`, `API-05/RTP-04-after-owner-message.png` | `RTP-01`…`RTP-07` all `Pass`; RTP-04 `"liveAnswer": true`, `"ownerMessageCount": 1`; `grep -c` of refusal lines = 0 on both nodes | Peers send no Origin |
| API-06 | AC-001, AC-003, SCN-001, SCN-002, SCN-A01, REQ-005 | A real Chrome page at `http://evil.example:<port>` and a sandboxed `null` iframe against a real node; loopback control page | `node probes/abx403-browser-attack-and-gateway-probe.mjs <worktree> <out>` | ENV-2 | Pass | `API-06-07/API-06-07-browser-attack-and-gateway.json`, `API-06-07/API-06-07-node.log` | Foreign: `terminal`, `projects`, `graphqlWs` and `peerObservation` each `"opened": false, "frames": 0`; `preflightedPost` `TypeError: Failed to fetch`; `nullOriginIframe` `"opened": false`. Node log: 7 lines `Remote Access request refused REMOTE_ACCESS_ORIGIN_REFUSED …`, incl. `/ws/terminal/abx403-evil-term origin http://evil.example:56853` and `/ws/projects origin null`. `definitionsAfter`: only `ABX403-LOOPBACK-PREFLIGHT`. Control: terminal `"opened": true, "frames": 5` | The simple `text/plain` POST is refused at the gate (it is one of the `/graphql` lines). Attempt 1 failed only on the probe's own log filter (API-07, below) |
| API-07 | REQ-002b/e, SCN-009, DEC-005 | Host-rewriting HTTPS gateway (no X-Forwarded-Host), with and without `AUTOBYTEUS_ALLOWED_ORIGINS` | Same probe, gateway part | ENV-2 | Pass | Same files | Without the setting: POST `"status": 403` with `REMOTE_ACCESS_ORIGIN_REFUSED`, WS `"opened": false`, gateway upgrade `HTTP/1.1 403 Forbidden`. With `AUTOBYTEUS_ALLOWED_ORIGINS=https://gw.example.test:<p>,ftp://not-an-origin`: POST 200, WS opened, upgrade `HTTP/1.1 101`. Log: `AUTOBYTEUS_ALLOWED_ORIGINS: ignoring entries that are not http(s) origins: ftp://not-an-origin` (once) | Attempt 1 counted the probe's own start banner as a second warning; the check was fixed to match the warning text |
| API-08 | AC-007, SCN-003, SCN-008, ASM-001 | Packaged desktop app (`file://` renderer) on the embedded node and a test-owned Docker node | `pnpm --silent isolated-app start --build`, then the journey steps over CDP (`probes/abx403-desktop-step.mjs` + `probes/API-08-steps/*.mjs`) with `probes/abx403-desktop-ws-recorder.mjs` recording every renderer WS handshake and HTTP request. Embedded: open run, send a message, streamed answer; Terminal (`echo …$((40+3))`); Files (tree; a file created on disk appears live); Brief Studio → Enter application (iframe `/ws/applications/…/backend/notifications`). Docker: Nodes → Add node `http://127.0.0.1:57310` → Open window; the same run, Terminal and Files steps; VNC Viewer → Connect | ENV-3 | Pass | `API-08/API-08-desktop-ws-recorder.jsonl`, `API-08/API-08-embedded-server.log`, `API-08/API-08-instance.log`, `API-08/API-08-docker-node.log`, screenshots `API-08-embedded-run-streamed.png`, `API-08-embedded2-terminal.png`, `API-08-embedded2-files.png`, `API-08-22-brief-studio-entered.png`, `API-08-docker-run-streamed.png`, `API-08-docker-terminal.png`, `API-08-docker-files.png`, `API-08-docker-vnc.png`; `API-08-isolated-start.json`, `API-08-isolated-stop.json` | Recorder: 13 WS routes on both nodes (agent, agent-collaboration, agent-package-definitions, file-explorer, terminal, update-notifications, and node-desktop on the Docker node), each with origin `file://` and status `101`; 476 HTTP requests, all `sentOrigin: null`; no `http-error`. Run answers `OK`; terminal `ABX403_TERM_embedded2_43` and `ABX403_TERM_docker_43`; `liveFileAppeared: true` on both; app iframe origin `http://127.0.0.1:58043`, socket first frame `{"type":"connected",…}`; VNC `Connected · View only` with canvas 448×252; 0 refusal lines in all three logs | The app iframe runs in a separate (out-of-process) frame, so its socket was captured with Playwright's `websocket` event instead of the page CDP session. `/ws/update-notifications` (not a phone route) works from the desktop app, as REQ-004 intends |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part: What You Tried And Why It Still Needs The User |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | IMP-04, IMP-08, API-06 | Proven | — |
| AC-002 | Yes | IMP-02, IMP-04, API-04 (real-browser same-origin via Host and through a Host-preserving proxy), API-07 (configured origin), API-03/05 (loopback dev origin) | Proven | — |
| AC-003 | Yes | IMP-04, IMP-05, API-06 (real-browser preflight and simple POST) | Proven | — |
| AC-004 | Yes | IMP-02, IMP-04 | Proven | — |
| AC-005 | Yes | IMP-04, API-03, API-04 (every phone route used by the shell answers 101 with the credential) | Proven | — |
| AC-006 | Yes | IMP-04, API-06 (refusal lines with route and origin, no credential) | Proven | — |
| AC-007 | Yes | API-08 | Proven | A Docker node on the user's own machine and a remote node on another host are the user's setups. A test-owned Docker node from the same image, running this branch's package, was used instead |
| AC-008 | Yes | API-03, API-04 | Proven (with a part only the user can check) | Real Tailscale Serve on the user's tailnet and the iOS/Android wrapper apps on devices. I emulated Tailscale Serve from its source (`serve.go`: Host kept, X-Forwarded-Host/Proto/For set) with a TLS proxy, and ran the WKWebView engine (WebKit) through it. Both wrappers load the node's `/mobile` URL straight into the WebView (`AutoByteusWebViewController.swift:62`, `AutoByteusWebView.kt:65`). A real tailnet and devices are the user's own |
| AC-009 | Yes | API-05, API-03 (MSP-06), API-04 (`remoteRun`) | Proven | — |
| AC-010 | No | Code review CRR-001 (docs reviewed) | Proven by review, not executable | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 96% | IMP-02/04/05; API-03…08 | AC-010 is proven by review only (docs) | — |
| Changed-boundary execution directness | 85% | 97% | IMP-04 real upgrades; API-04/06/08 real browsers and the packaged app against real servers | — | — |
| Cross-boundary integration realism and mock gap | 70% | 95% | API-04 (TLS proxy shaped like Tailscale Serve), API-05 (two real nodes), API-08 (real Docker node) | Tailscale Serve and the wrapper WebViews are emulated; the real ones are user-only (AC-008) | The user's tailnet and devices |
| Environment, configuration, identity, and fixture fidelity | 80% | 95% | Worktree builds; a full server package in the Docker node; real pairing; `AUTOBYTEUS_ALLOWED_ORIGINS` (API-07) | Scripted runtimes instead of models (the transport is identical) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | IMP-02/04 near misses; API-06 `null` origin and simple POST; MSP-09 restart, MSP-13 unknown/revoked credentials; API-07 | — | — |
| User-surface, browser, and desktop-shell confidence | 50% | 95% | API-03/04 (Chrome, WebKit), API-05 (Nuxt dev), API-08 (packaged Electron) | Electron dev (`http://localhost:3000`) not run; the same loopback class (unit: `localhost`; probes: `127.0.0.1`) is covered | Run Electron dev on a disposable data root |
| Durable regression coverage quality and relevance | 90% | 95% | IMP-02/04 durable; `mobile-shell-probe.mjs` now sends the phone's Origin and Host on its sockets | The real-browser checks (API-04/06/07) stay temporary (self-signed TLS, host mapping) | — |

- Overall post-repository confidence: 76% (the AC-007/008/009 gap called for broader validation)
- Overall final confidence: 95.4%
- Calculation method: simple average of the seven final scores (96+97+95+95+95+95+95)/7
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: a real Tailscale Serve node and the wrapper apps on devices (user-only); Electron dev not run (loopback class covered); FU-004 (four base E2E failures outside this change)

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` + `Project Desktop Validation` + `Worker or Distributed` + `Live API`
- Confidence gap or residual risk it addresses, and the expected gain: the requirements depend on what real clients send (Origin and Host from the packaged renderer, the phone shell on LAN and behind a TLS proxy, peers). Repository tests set those headers themselves. The journeys removed that gap
- Browser validation needed, and why or why not: yes. The phone shell and attacker pages are browser surfaces whose Origin and Host the browser sets
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed, and any deviation from the investigation's plan: an isolated worktree build driven over CDP, with a recorder on the renderer's network events. Deviations (the instance's own `.env`, the full server package in the Docker node) are listed under Round
- Cases proving web-equivalent behavior, and cases proving shell-specific or lifecycle behavior: API-08 proves the shell's own `file://` origin on WebSockets and its Origin-less fetch on both nodes. API-03/05 prove the web shell at a loopback origin
- Effect on any already-running desktop application: `None` (own data root, ports and process group; `stop` removed the data root; `list` shows no instance)
- Behavior not directly proven and its confidence consequence: Electron dev, which is the same loopback class (see the scorecard)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (commit `14e3681cdc`) | Updated: the LAN emulation forwards the phone's Host on HTTP and sends the phone's Origin and Host on the upstream WebSocket (`ws`); header comment | API-02 (before), API-03 (after) | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Tailscale Serve | A TLS reverse proxy that keeps Host and sets X-Forwarded-Host/Proto/For, as in `serve.go` | Needs the user's tailnet | Proxy shape taken from source; user-only part of AC-008 |
| Phone LAN address | Chrome `--host-resolver-rules MAP 192.168.77.10 127.0.0.1` (the browser's real Host and Origin) | Avoids binding a test node with a terminal to the LAN | The node sees a loopback client address; the phone credential is checked whatever the address |
| iOS/Android wrappers | Playwright WebKit (the WKWebView engine) and Chrome | Device builds | User-only part of AC-008 |
| Models and runtimes | Scripted AGY CLI; fake Grok ACP replay (in the probe) | No paid inference needed to test transport | None for this change |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe stacks (API-02/03/04/05) | Yes | Each probe's `finally` | `serversLeft: 0`, `rootRemoved: true` in every receipt; no probe processes left (`pgrep`) |
| API-04 TLS and CONNECT proxies, self-signed cert | Yes | Closed by the probe; cert dir removed | `proxiesClosed: true` |
| API-06/07 node, gateway, cert | Yes | Probe `finally` | `nodeStopped: true`, `rootRemoved: true` |
| Isolated instance `iso-58042-7c90` | Yes | `pnpm --silent isolated-app stop iso-58042-7c90` | `wasRunning: true`, `dataRootRemoved: true`; `list` → `[]` |
| Docker container `abx403-api-e2e-node` | Yes | `docker rm -f -v` | No container with label `com.autobyteus.api-e2e-owner=abx403` left |
| Server package build (`/tmp/abx403-api-e2e/server-package`), desk workspace, Brief Studio copy, AGY fixture copy | Yes | `rm -rf` | Removed |
| `/tmp/abx403-api-e2e` (probe sources and raw outputs) | Yes | Removed after commit | Sources kept in `evidence/api-e2e/probes/` |
| Playwright WebKit v2248 in `~/Library/Caches/ms-playwright` | Yes (installed for API-04) | Kept: a shared test browser that matches this repository's playwright-core | — |
| User's containers (`autobyteus-server-*`, `abx407-phone-node`), user's app | No | Not touched | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: AC-008 on real Tailscale Serve and on the wrapper apps on devices (only the user can check)
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: code reviewer (test-code review of `mobile-shell-probe.mjs`)
- Notes: FU-004 records four base E2E failures outside this change.
