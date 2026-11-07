# API/E2E Execution Coverage Report — websocket-origin-and-phone-route-guard (autobyteus-403)

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md` (round 2 rerun plan in "Round 2 Rerun Plan")
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 2. Code review pass CRR-003 (Full Re-Audit) of IR-002, delivery's Local Fix DR-001: merge `6f59bab2a2` of origin/personal @ 6341292552 (autobyteus-407, node desktop on the phone). Tested commit `1e1d6482a7`.
- Prior round reviewed: round 1, API-REV-001 (Pass, 95.4%) on `a24421610f` + `14e3681cdc`
- Deviations from the investigation's plan, and why:
  - API-09 attempt 1: the probe's in-page WebSocket recorder subclassed `WebSocket`, which broke noVNC ("Cannot reach the node"; the node sent 12 messages and got 0). The same journey without a recorder passed View only and Control (`round2/API-09/API-09-control-run-without-recorder.json`). The final run uses a recorder that hands the page the browser's own WebSocket objects.
  - As in round 1: the embedded node got the scripted AGY CLI and `ENABLE_APPLICATIONS=true` through the isolated instance's own `.env`, and the Docker node runs this commit's full server package.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/websocket-origin-and-phone-route-guard/tickets/in-progress/websocket-origin-and-phone-route-guard/evidence/api-e2e/`. Round-2 files are in `round2/`; round-1 files that are still valid (API-00, API-02) stay at the top level. Probe sources are in `probes/` and `round2/probes/`.

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Not Required` this round. No durable test changed since the reviewed `14e3681cdc` (`mobile-shell-probe.mjs` is byte-identical). The temporary probes live in the evidence folder only.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `a24421610f` (round 1) | macOS 26.5.2 arm64 | Node 22.23.1; Chrome; playwright-core | Round-1 measurements (API-00, API-02) |
| ENV-R2-1 | `1e1d6482a7` (source merge `6f59bab2a2`) | macOS 26.5.2 arm64 | Node 22.23.1; server `dist`, phone bundle and web typecheck rebuilt after the merge | Server E2E: `env -i PATH HOME=<resolved temp> TMPDIR` |
| ENV-R2-2 | `1e1d6482a7` | macOS 26.5.2 arm64 | Probe-owned alpha/beta from this `dist`; Chrome; Playwright WebKit 26.0 (v2248) | Chrome host mapping for `192.168.77.10`, `*.ts.net`, `evil.example`, `gw.example.test`; self-signed TLS proxies |
| ENV-R2-3 | `1e1d6482a7` | macOS 26.5.2 arm64 | Test-owned Docker node `abx403-api-e2e-node` (image `autobyteus/autobyteus-server:beta`, this commit's server package 1.5.12-beta.5 read-only over `/opt/autobyteus/server-package`, `127.0.0.1:55369`, no volumes; node desktop `available: true`) | Phone Access on; API-09 without AGY, API-08 with the scripted AGY CLI (`linked_skills`) |
| ENV-R2-4 | `1e1d6482a7` | macOS 26.5.2 arm64 | Packaged Electron app from `pnpm --silent isolated-app start --build` (instance `iso-57410-6022`, control 57410, backend 57411, `file://` renderer) + ENV-R2-3 | Scripted AGY and applications enabled in the instance's own `.env`; Brief Studio imported |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-09…IMP-12 | AC-001…AC-006, REQ-007, 407 node desktop preserved, regression | Server typecheck; origin/phone/node-desktop e2e + contract (152); terminal/file-explorer e2e (26); full unit suite (8043) | Reused | — | Pass | (implementation handoff) | — | Ran on `6f59bab2a2`; since then only ticket files changed. They replace IMP-01…IMP-08 as the repository evidence |
| WEB-TC | Regression after the merge | Web typecheck (Nuxt, Electron main, scripts, cross-package tests) | `pnpm -C autobyteus-web typecheck` | ENV-R2-1 | Pass | (log not committed; result line here) | `[typecheck] production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)`, `[typecheck] PASS` | TESTING.md rerun rule 5 |
| API-00 | SCN-A02 | Playwright URL rewrite headers; Chrome host mapping | Round 1 | ENV-1 | Pass (still valid) | `API-00-route-fetch-headers.log`, `API-00-chrome-host-mapping.log` | as round 1 | Independent of the product |
| API-01 | Regression, QR-003 | All 235 server E2E files | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" pnpm test:e2e` | ENV-R2-1 | Fail (out of scope, FU-004) | `round2/API-01-server-e2e.excerpt.log`, `round2/API-01-server-e2e.full.log.gz` | `Test Files  4 failed \| 111 passed \| 120 skipped (235)`, `Tests  4 failed \| 493 passed` | The same 4 base failures as round 1 (FU-004); no new failure. 493 passed, up from 489, including 407's node-desktop e2e. AR-14's base result: round-1 `API-01-AR14-head-vs-base.log` |
| API-02 | AC-008 (harness) | Mobile-shell probe before the update | Round 1 | ENV-1 | Fail, expected (still valid as history) | `API-02-mobile-shell-before-update.log` | as round 1 | The probe is unchanged since its update |
| API-03 | AC-008, AC-009 (MSP-06), REQ-006 | Phone shell (LAN shape), alpha + beta, desktop comparison window on Nuxt dev | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<fresh>` | ENV-R2-2 | Pass | `round2/API-03/API-03-summary.log`, `round2/API-03/mobile-shell-probe.json`, `round2/API-03/server-alpha.log`, `round2/API-03/server-beta.log` | `mobile-shell probe: Pass`, 15/15 cases, `"unknownBrowserErrors": 0`; alpha only `REMOTE_ACCESS_AUTH_INVALID`/`REMOTE_ACCESS_DEVICE_REVOKED` (MSP-13); beta none | Same as round 1 |
| API-04 | AC-008, ASM-001, ASM-002 | Phone shell on the browser's own network stack: LAN shape (Chrome), Tailscale-shaped HTTPS proxy (Chrome, WebKit) | `node probes/abx403-phone-origins-probe.mjs <worktree> <out>` | ENV-R2-2 | Pass | `round2/API-04/API-04-summary.log`, `round2/API-04/API-04-phone-origins.json`, `round2/API-04/server-alpha.log`, `round2/API-04/server-beta.log`, screenshots | All 9 steps `Pass` in all 3 journeys; WS handshakes `('http://192.168.77.10:53883', 101)` and `('https://alpha.tail-probe.ts.net:53985', 101)`; proxy upgrades `HTTP/1.1 101`; `node refusals during journeys {'alpha': [], 'beta': []}`; `outsidePhoneList: []` | The probe's own verdict is `Fail` only for browser lines, each traced in the summary: the known `localhost:8000` feed (the filter missed it once the URL suffix was added) and 30 Iconify fetches that the probe's CONNECT proxy refuses by design. None reached the node |
| API-05 | AC-009, SCN-006, SCN-007 | Two nodes collaborating | `pnpm -C autobyteus-web test:e2e:remote-runs-in-tree --output-dir=<fresh>` | ENV-R2-2 | Pass | `round2/API-05/remote-runs-in-tree-probe.json`, `round2/API-05/server-alpha.log`, `round2/API-05/server-beta.log` | RTP-01…RTP-07 `Pass`, RTP-04 `"liveAnswer": true`; 0 refusal lines on both nodes | — |
| API-06 | AC-001, AC-003, SCN-001/002/A01, REQ-005; a foreign `/ws/node-desktop` | A real Chrome page at `http://evil.example:<port>` and a sandboxed `null` iframe; loopback control | `node round2/probes/abx403-browser-attack-and-gateway-probe.mjs <worktree> <out>` (adds `/ws/node-desktop`) | ENV-R2-2 | Pass | `round2/API-06-07/API-06-07-browser-attack-and-gateway.json`, `round2/API-06-07/API-06-07-node.log` | `nodeDesktop`: `"opened": false, "frames": 0`, Chrome `Error during WebSocket handshake: Unexpected response code: 403`; log `Remote Access request refused REMOTE_ACCESS_ORIGIN_REFUSED /ws/node-desktop origin http://evil.example:54991`; 8 refusal lines in all; control `/ws/node-desktop` from `http://127.0.0.1:54992` → `101` | — |
| API-07 | REQ-002b/e, DEC-005 | Host-rewriting gateway with and without `AUTOBYTEUS_ALLOWED_ORIGINS` | Same probe | ENV-R2-2 | Pass | Same files | `withoutRefusedPost`, `withoutRefusedWs`, `withAllowedPost`, `withAllowedWs`, `invalidEntryWarned` all `true` | — |
| API-08 | AC-007, SCN-003, SCN-008, ASM-001 | Packaged desktop app on the embedded node and the Docker node | `pnpm --silent isolated-app start --build`; steps over CDP (`probes/abx403-desktop-step.mjs`, `probes/API-08-steps/*.mjs`, new `round2/probes/API-08-steps/s-vnc2.mjs`); recorder `probes/abx403-desktop-ws-recorder.mjs`. Embedded: run stream, Terminal, Files (live), Brief Studio iframe. Docker: Nodes → Add node → Open window; run stream, Terminal, Files (live), VNC Viewer View only, then Control | ENV-R2-4 | Pass | `round2/API-08/API-08-desktop-ws-recorder.jsonl`, `round2/API-08/API-08-embedded-server.log`, `round2/API-08/API-08-instance.log`, `round2/API-08/API-08-docker-node.log`, screenshots (`API-08-docker-vnc-view-only.png`, `API-08-docker-vnc-control.png`, …), `API-08-isolated-start.json`, `API-08-isolated-stop.json` | Answers `OK` on both nodes; `ABX403_TERM_embedded_43`, `ABX403_TERM_docker_43`; `liveFileAppeared: true` ×2; app iframe origin `http://127.0.0.1:57411`, first frame `{"type":"connected",…}`; VNC `Connected · View only` with node mouse `x:300 y:300` after a click, then `Connected · Control` with mouse `x:1440 y:807` (expected ≈ `x:1440 y:810`). Recorder: every WS (incl. `ws://DOCKER/ws/node-desktop` ×2) origin `file://` → `101`; 78 HTTP requests, all `sentOrigin: null`; no HTTP errors; 0 refusal lines in all 3 logs | The recorder attached after the restarted window had opened the embedded node's app-wide sockets, so those two are absent this round (round 1 recorded them: `file://` → 101) |
| API-09 | REQ-004, REQ-005, AC-005, REQ-006 (with 407: View only, Control, live re-check); SCN-004 | The phone's node desktop under the origin gate and the phone route limit, against the Docker node: Chrome LAN shape, Chrome and WebKit through the Tailscale-shaped HTTPS proxy | `node round2/probes/abx403-phone-node-desktop-probe.mjs <worktree> <out> abx403-api-e2e-node <port>`: pair; New run (draft, catalog model, no message); ⋮ → VNC Viewer; View only taps; Control tap; owner revokes every device; the open stream must close 4403 | ENV-R2-3 | Pass | `round2/API-09/API-09-phone-node-desktop.json`, `round2/API-09/API-09-docker-node.log`, `round2/API-09/API-09-control-run-without-recorder.json`, screenshots (`API-09-chrome-lan-control.png`, `API-09-chrome-lan-liveRevocation.png`, `API-09-webkit-tailscale-openViewer.png`, `API-09-chrome-tailscale-control.png`, attempt-1 image) | Each journey: `openViewer` `Connected · View only`; `viewOnly` `x:300 y:300`; `control` `Connected · Control`, `x:1440 y:810` (WebKit `x:1437 y:805`); `liveRevocation` `{'code': 4403, 'reason': 'REMOTE_ACCESS_DEVICE_REVOKED'}` after 18–21 s, UI `This viewer is not allowed on this node`. Handshakes `/ws/node-desktop` with the phone's origin → 101 (Chrome via CDP; TS via the proxy: `HTTP/1.1 101`). Node log: `[node-desktop] stream ended mode=control viewer=mobile … close=REMOTE_ACCESS_DEVICE_REVOKED` per journey; no `REMOTE_ACCESS_ORIGIN_REFUSED`/`PHONE_ACCESS_ROUTE_REFUSED` from the journeys | The only origin refusal in the node log is my own `curl -H 'origin: https://evil.example' /rest/health` check before the run. The browser lines are not from this change: noVNC's "requires a secure context" warning on the LAN HTTP page, a headless clipboard-permission denial in Control, the known `localhost:8000` feed, and the proxy-refused Iconify hosts |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part: What You Tried And Why It Still Needs The User |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | IMP-10, API-06 (incl. foreign `/ws/node-desktop`) | Proven | — |
| AC-002 | Yes | IMP-10, API-04, API-07, API-03/05, API-09 | Proven | — |
| AC-003 | Yes | IMP-10, API-06 | Proven | — |
| AC-004 | Yes | IMP-10 | Proven | — |
| AC-005 | Yes | IMP-10, API-03, API-04, API-09 (`/ws/node-desktop` with a phone credential, both modes) | Proven | — |
| AC-006 | Yes | IMP-10, API-06 | Proven | — |
| AC-007 | Yes | API-08 | Proven | The user's own Docker/remote nodes (a test-owned node from the same image ran this commit's package) |
| AC-008 | Yes | API-03, API-04, API-09 | Proven (with a part only the user can check) | Real Tailscale Serve and the wrapper apps on devices, as in round 1: the proxy is emulated from Tailscale's source, and WebKit stands in for WKWebView |
| AC-009 | Yes | API-05, API-03 (MSP-06), API-04 (`remoteRun`) | Proven | — |
| AC-010 | No | Code review (docs) | Proven by review | — |
| 407 on the phone under this gate (CRR-003 ask) | Yes | API-09, IMP-10 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 96% | IMP-09…12; API-03…09 | AC-010 by review | — |
| Changed-boundary execution directness | 85% | 97% | IMP-10; API-06/08/09 real browsers and the packaged app against real servers and a real node desktop | — | — |
| Cross-boundary integration realism and mock gap | 75% | 95% | API-04/09 (Tailscale-shaped proxy), API-05, API-08/09 (real Docker node desktop) | Tailscale Serve and the WebViews are emulated (user-only) | The user's tailnet and devices |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | Rebuilt `dist`, phone bundle and server package after the merge; real pairing and revocation | Scripted runtime instead of models (the transport is identical) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 96% | API-06 (`null`, simple POST, foreign node-desktop), API-09 live revocation 4403, MSP-09/13, API-07 | — | — |
| User-surface, browser, and desktop-shell confidence | 55% | 95% | API-03/04/09 (Chrome, WebKit), API-05 (Nuxt dev), API-08 (packaged Electron incl. VNC Control) | Electron dev not run (loopback class covered) | — |
| Durable regression coverage quality and relevance | 90% | 95% | IMP-09…12 durable (incl. 407's node-desktop e2e and the foreign `/ws/node-desktop` case); `mobile-shell-probe.mjs` | The real-browser checks stay temporary | — |

- Overall post-repository confidence: 79%
- Overall final confidence: 95.6%
- Calculation method: simple average (96+97+95+95+96+95+95)/7
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: a real Tailscale Serve node and the wrapper apps on devices (user-only); Electron dev not run; FU-004 (four base E2E failures outside this change)

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` + `Project Desktop Validation` + `Worker or Distributed` + `Live API`
- Confidence gap or residual risk it addresses, and the expected gain: the merge combined this gate with 407's phone node desktop (a new phone WebSocket client, viewer limits and a live re-check) and changed the adapter all `/ws/*` handlers use. Only real clients show that the phone's VNC Viewer, the desktop's VNC Viewer and the other sockets still work under the gate
- Browser validation needed, and why or why not: yes. The phone's and attacker pages' Origin and Host are set by the browser, and noVNC runs in the browser
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed: as round 1, plus VNC Control (`s-vnc2.mjs`)
- Cases proving web-equivalent behavior, and cases proving shell-specific or lifecycle behavior: API-08 (`file://` origin on every WebSocket, Origin-less fetch); API-03/05 (loopback web shell)
- Effect on any already-running desktop application: `None` (`stop` removed the data root; `list` → `[]`)
- Behavior not directly proven and its confidence consequence: Electron dev (loopback class covered)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (IR-002 removed the unreachable `?? 4401` fallback; one close-code table)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No` (round 1 updated `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` in `14e3681cdc`, reviewed in `api-e2e-test-review-report.md`; unchanged since)

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| None this round | — | — | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Tailscale Serve | TLS reverse proxy keeping Host, setting X-Forwarded-Host/Proto/For (`serve.go`) | The user's tailnet | User-only part of AC-008 |
| Phone LAN address | Chrome host mapping (the browser's real Host and Origin) | Avoids binding test nodes to the LAN | The node sees a loopback client; the phone credential is checked whatever the address |
| iOS/Android wrappers | Playwright WebKit and Chrome | Device builds | User-only part of AC-008 |
| Models | Scripted AGY CLI; a draft run for the phone viewer | No inference needed | None for this change |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe stacks (API-03/04/05/06/07) | Yes | Each probe's `finally` | `serversLeft: 0`, `rootRemoved: true`, `nodeStopped: true`, `proxiesClosed: true` |
| API-09 TLS/CONNECT proxies, cert | Yes | Probe `finally` | `proxiesClosed: true` |
| Docker container `abx403-api-e2e-node` (API-09, then recreated for API-08) | Yes | `docker rm -f -v` | No container with label `com.autobyteus.api-e2e-owner=abx403` left |
| Isolated instance `iso-57410-6022` | Yes | `pnpm --silent isolated-app stop iso-57410-6022` | `ok`, `wasRunning: true`, `dataRootRemoved: true`; `list` → `[]` |
| Server package build, desk workspace, Brief Studio copy, AGY fixture copy, `/tmp/abx403-r2` | Yes | `rm -rf` | Removed after the commit |
| User's app and containers | No | Not touched | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: AC-008 on real Tailscale Serve and on the wrapper apps on devices (only the user can check)
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: code reviewer (the reviewed route; no durable test changed this round)
- Notes: FU-004 is unchanged (four base E2E failures outside this change). Round 1's result, API-REV-001, is in the revision record.
