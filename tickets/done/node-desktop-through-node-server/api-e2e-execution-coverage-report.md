# API/E2E Execution Coverage Report — S1: Node desktop through the node's own server (autobyteus-405)

The run record and the result. The plan is `api-e2e-coverage-investigation.md`; the history is `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-through-node-server/tickets/in-progress/node-desktop-through-node-server/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; code review CRR-001 passed (Large / High)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - **API-06 (PowerShell):**
    - In the first real run the launcher's own `docker pull autobyteus/autobyteus-server:beta` fetched a newer `beta` from Docker Hub (`69e9c09535fa`, published 2026-11-06T17:19Z). The node was therefore recreated for "Image changed", not for the v9 config alone. That run is kept (`API-06b-*`, annotated).
    - The v8 → v9 transition was repeated with the image pinned by digest (`API-06c-*`).
    - The pull had moved the user's local `beta` tag. It was restored to `9c5aa01bb2fc`, the image the user's nodes run (`API-06c-04`, `API-99`).
    - The update-test module needs `node` for its fake starter; that module was rerun with Debian `nodejs` installed (`API-06a-update-tests-with-node.log`).
  - **API-04 (clipboard boundary):**
    - Run 1's positive control (an unsolicited Provide) was invalid: Xvnc ignores clipboard data from a client that did not announce it first.
    - Run 2 used the protocol's Notify → Request → Provide flow, but decoded Xvnc's Provide without `Z_SYNC_FLUSH`.
    - Run 3 is authoritative; runs 1 and 2 are kept, annotated.
  - **API-05 (Electron):**
    - Electron's CDP has no `Browser.getWindowForTarget`, so minimizing went through macOS (`osascript`, AXMinimized, by the instance's PID) (`API-05-07a` annotated, `API-05-07b`).
    - The first Control input used canvas coordinates from before the Control reconnect re-laid out the tile. The pointer did arrive, but at the wrong spot. Step 05b repeats it with the new geometry.
    - The first app-hide attempt started with the viewer already disconnected, most likely because the window was fully covered by another window (Chromium reports that as `hidden`). Step 08b repeats it with a `visibilitychange` recorder.
  - **API-10 was added after the first confidence pass (94.9%).** The local-only image tag failed the launcher's `docker pull` (fatal), so the image was served from a test-owned `registry:2` on `127.0.0.1` (`API-10-01a` annotated).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-through-node-server/tickets/in-progress/node-desktop-through-node-server/evidence/` (files `API-*`)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review), then delivery
- Proportional test-code review decision: `Required`. The review scope is small: no durable test code was added, updated or removed this round. Only temporary probes were written, kept as evidence under `evidence/API-*.mjs` / `.sh`.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `952bc1fcd0` (source = `ce13fa9727`) | macOS 26.5.2 arm64 | Node v22.23.1, pnpm 10.28.2, Docker Desktop 29.0.1, Python 3.9 | worktree checks |
| ENV-2 | `952bc1fcd0` fresh clone (`/private/tmp/abx405-api/fresh-clone`, removed) | macOS arm64 | `pnpm install --frozen-lockfile` only; unsigned | server package + full image built with buildx `desktop-linux` linux/arm64; desktop app `AutoByteus.app` 1.5.12-beta.3 (personal) |
| ENV-3 | as ENV-2 | Docker node `abx405-api-node` | image `autobyteus/autobyteus-server:beta` `9c5aa01bb2fc` (Xvnc TigerVNC 1.13.1) + ENV-2's server package read-only over `/opt/autobyteus/server-package`; fresh volumes | backend published on `192.168.2.158:62053` only (loopback refused) |
| ENV-4 | as ENV-2 | isolated desktop instances `iso-62503-d542`, `iso-64528-e090` | ENV-2's app (Electron 42), own data roots and ports, driven over CDP | in the node windows `navigator.permissions.query` answered `denied` for `clipboard-*` (guard: Electron answers `granted`, and Control would otherwise read/write the user's Mac clipboard) |
| ENV-5 | as ENV-1 | Debian 12 arm64 container | native PowerShell 7.4.6 (linux-arm64 tarball) in `dotnet/runtime-deps:8.0`, static arm64 docker CLI, host engine via socket | temp state/shared dirs at the same absolute path |
| ENV-6 | as ENV-2 | launcher node `abx405-launcher-node` | full S1 image built from ENV-2 (`dd05ec966af3`), pulled by the launcher from `localhost:64429` (test-owned `registry:2`) | launcher defaults: backend on all interfaces |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-003, 005, 006, 007, 008, 009, 010, 011, 013, 014, 020, 022; gates | server unit/integration/E2E, web specs, contract, typechecks, launcher, real node, browser probe | Reused IMP-04, IMP-06, IMP-15…IMP-25 | — | Pass | (implementation handoff rows) | (handoff rows) | IMP-15…25 ran on `ce13fa9727` = HEAD source. IMP-04/06 ran on `6407bfc15f`; only the filter, its tests, the contract test and docs changed since, and those were rerun as IMP-21/22 |
| API-02 | AC-022 (compose) | compose | `docker compose -f autobyteus-server-ts/docker/docker-compose.yml config` | ENV-1 | Pass | `API-02-compose-config.txt` | ports: `target: 8000` / `published: "8001"` only; `grep AUTOBYTEUS_VNC / 6080 / 5900 / 9223 … []` | IMP-09 kept no output |
| API-03 | gates | Electron env spec, typecheck gate spec | `vitest --config ./electron/vitest.config.ts run electron/server/__tests__/serverRuntimeEnv.spec.ts`; `vitest run scripts/__tests__/typecheckGate.spec.ts` | ENV-1 | Pass | `API-03-electron-and-gate-specs.log` | `Tests  13 passed (13)`, `Tests  29 passed (29)` | IMP-07 kept no output; the guards ran in API-07 |
| API-04 | AC-006, REQ-006, REQ-017 (node side), AC-002 reachability; reviewer's Caps check | raw viewer through `/ws/node-desktop` vs real Xvnc | `node API-04-clipboard-boundary.mjs <ws pkg> http://192.168.2.158:62053 abx405-api-node` (per mode: noVNC Caps; agent copies → Request; Notify → server Request? → Provide; Caps with Request+Provide bits; legacy ClientCutText); `curl` LAN vs loopback | ENV-3 | Pass | `API-04-clipboard-boundary.txt` (run 3), `API-04-clipboard-boundary.mjs`, `API-04-node-run.sh`, runs 1–2 annotated | view: `"repliesToRequest":[]`, `"serverRepliesToNotify":[]`, `"nodeClipboardIsViewerText":false`, Caps+bits `"replies":[]` and clipboard unchanged, legacy `false`, every step `"open":true`; control (positive): `"provideCarriedAgentText":true`, `"serverRepliesToNotify":[["request"],…]`, `"nodeClipboardIsViewerText":true`, legacy `true`; LAN `{"available":true}`, loopback `http_code=000` | Measures that only the Caps reaches Xvnc in View only and that Xvnc treats a Caps with action bits as Caps |
| API-05 | AC-001, 002, 004, 006, 007, 008, 009, 010, 011 (UI), 022 (viewer through the server); BEH-012 | Electron shell + renderer (isolated instance of the fresh-clone build) against the LAN-only node | Main window: VNC Viewer (embedded), Settings → Server Settings. Nodes → Add `http://192.168.2.158:62053` → open window → VNC Viewer (CDP Network capture). View only: click + type `abxviewonly` + pointer. Switch to Control: click into a capture terminal, type `abxcontrol42`, move pointer. Switch back. Maximize + raw SetDesktopSize ×2. Minimize (macOS). App hide (macOS). Tab switch. Xvnc restart + Reconnect. Server restart + Reconnect | ENV-3, ENV-4 | Pass | `API-05-00…10-*`, `API-05-cdp.mjs`, `API-05-upstream.sh`, `API-05-raw-resize.mjs`, screenshots `API-05-01/02/03/05/06/09a/09b-*.png` | see the per-step lines below | `API-05-07a`, `API-05-05` and `API-05-08` are annotated earlier attempts (see Round) |
| API-06 | AC-022 (PowerShell), REQ-020, persisted state | PowerShell launcher under real pwsh + real engine | (a) the three launcher test modules with pwsh, non-root (update module rerun with `nodejs`). (b) run 1 (image moved, annotated). (c) seeded v8 JSON (S0 shape, image pinned by digest) → v8 PS launcher (`git archive 9e0681bf39`) `workspace apply --name abx405-ps-node` → S1 PS launcher ×2 → destroy + volume rm | ENV-5 | Pass | `API-06a-launcher-tests-with-pwsh.log`, `API-06a-update-tests-with-node.log`, `API-06c-01…04`, `API-06b-*` (run 1), `API-06-ps-run.sh` | (a) `test_powershell_launcher_parses_when_pwsh_is_available … ok`, `test_preferred_port_collision_falls_back_for_that_service … ok`; update rerun `Ran 8 tests` / `OK`. (c) 01: `127.0.0.1:61617->6080/tcp, 0.0.0.0:61616->8000/tcp`, env `AUTOBYTEUS_VNC_SERVER_HOSTS=localhost:61617`; 02: `Launcher config changed for abx405-ps-node`, `0.0.0.0:61616->8000/tcp, [::]:61616->8000/tcp`, env `[]`, JSON only `backendPort` 61616, `marker: abx405-ps-volume-marker`; 03: `already running with the current image and launcher config`, same id; 04: `volumes abx405-ps*: []`, `local beta -> sha256:9c5aa01bb2fc…`; help `Show Backend and GraphQL URLs` (`API-06b-07`) | (a) The first full run in the container had 10 failures/errors, all in the update module, because its fake starter needs `node`; with `nodejs` the module passes |
| API-07 | fresh-start build | server image `server-package` stage + desktop release job, fresh clone | `API-07-fresh-start-build.sh` | ENV-2 | Pass | `API-07-fresh-start-build.excerpt.txt`, `.full.log`, `.sh` | buildx `exit=0` and `dist/node-desktop/*.js` in the package; hygiene/licensing/install `exit=0`; `[guard:web-boundary] Passed.`, `[guard:localization-boundary] Passed.`, `audit:localization-literals … Passed`; `[typecheck] cross-package tests (tsconfig.cross-package-tests.json): 0 errors`, `[typecheck] PASS`; DMG built; Prisma ok; terminal runtime `spawn probe` ok | The cross-package typecheck compiled the server's filter from a fresh install (DESIGN.md rule 12, local part). The full server image was also built from this clone (API-10) |
| API-08 | AC-002 / SCN-003 transport part | route behind a TLS-terminating proxy, `https`/`wss` only | `node API-08-wss-through-tls-proxy.mjs <ws pkg> 192.168.2.158 62053 <self-signed cert> <key> abx405-api-node` | ENV-3 | Pass | `API-08-wss-through-tls-proxy.txt`, `.mjs` | REST via proxy `"status": 200` `{"available":true}`; `wss://…?mode=view` `RFB 003.008`, pointer to 200,200 → mouse unchanged `x:960 y:540`, `1920x1080` after SetDesktopSize; `wss://…?mode=control` mouse `x:777 y:444`, `1920x1080`; `"upgrade": 2` | Proves the route through TLS termination; Electron's `wss` to a real Tailscale Serve node is user-only (below) |
| API-09 | AC-014, REQ-011 | node logs | grep docker logs + every `*.log` under the node's data dir for the markers this round sent and for credential words | ENV-3 | Pass | `API-09-log-scan.txt` | every marker `docker=0 data-logs=0` (`abxviewonly`, `abxcontrol42`, `abx405-api-agent`, `abx405-api-viewer`, `access_token`, `mysecretpassword`, `AUTOBYTEUS_VNC`); `password` 4 hits = Chromium's `--password-store=basic` in dbus lines; `[node-desktop]` lines: 3 metadata-only shapes | — |
| API-10 | AC-022 end to end, AC-001 (local); server image fresh start | S1 launcher → node from a fresh-clone S1 image → desktop app viewer | build `--load` from the fresh clone; push to `registry:2` on `127.0.0.1:64429`; seed state; `autobyteus-docker.sh workspace apply --name abx405-launcher-node`; isolated instance: add `http://localhost:64491`, VNC Viewer, network capture; destroy, rm registry and images | ENV-6, ENV-4 | Pass | `API-10-image-build.log`, `API-10-01-launcher-node-from-s1-image.txt`, `API-10-01a-*` (annotated), `API-10-00/02/03/04-*`, `API-10-02-launcher-node-vnc-viewer.png` | 01: `0.0.0.0:64491->8000/tcp, [::]:64491->8000/tcp`, `{"8000/tcp":[{"HostIp":"","HostPort":"64491"}]}`, env `[]`, state only `BACKEND_PORT=64491`; 02: `"status":"Connected · View only","canvas":{"w":1920,"h":1080}`, `ws://localhost:64491/ws/node-desktop?mode=view`, network hosts `['api.iconify.design', 'localhost:64491']`; 04: `containers abx405*: []`, `volumes abx405*: []` | — |

API-05 per step (files `API-05-…`):

- **01 (AC-004):** the embedded node's VNC Viewer shows `"viewerText":"This node has no shared desktop."` and `"tile":false`.
- **02:**
  - BEH-012 (inline in the run): the Server Settings endpoint cards are LM Studio and Ollama only (`"vncHostsCard":false,"anyVnc":false`; screenshot `API-05-02-server-settings-no-vnc-hosts.png`).
  - Traffic (`API-05-02-network-capture-summary.txt`): `hosts of node-desktop traffic: ['192.168.2.158:62053']`, 3 `/rest/node-desktop` requests and 11 `/ws/node-desktop` sockets. The only other network host is `api.iconify.design` (FU-002).
- **03:** `"status":"Connected · View only"`, canvas `1920x1080`. Electron's clipboard permissions before the guard: `{"read":"granted","write":"granted"}`.
- **04 (View only input):** the node pointer stayed at `x:960 y:540`, `typed-bytes=0`.
- **05b (Control):** `"Connected · Control"`, `active after click: abx405-capture`, `typed=[abxcontrol42]`, pointer `x:301 y:299`, desktop `1920x1080`. Switching back gives `"Connected · View only"` and logs a Control `stream ended … reason=viewer-closed` (inline).
- **06 (Maximize, AC-008/009):** `"maximizedClass":true,"canvasCss":"1510x849"` with the desktop at `1920x1080`. Raw viewers in View only and Control each sent SetDesktopSize 800x600 (`"openAfterSetDesktopSize":true`); afterwards the desktop is `1920x1080` and the tile `Connected · View only`.
- **07b (minimize, AC-010):** upstream `1` at +586 ms, `0` at +894 ms; `visibilityState node window="hidden" main window="visible"`; log `mode=control … reason=viewer-closed`; still `0` four seconds later. After restore: `tile="Connected · View only" mode="View only" upstream=1` (D-10).
- **08 (tab switch):** Browser tab gives `tile mounted=false` and `upstream … 0`; back on VNC Viewer it is `Connected · View only`, upstream `1`.
- **08b (app hide):** hidden at 17:57:09.637Z; recorder `hidden` at 17:57:09.870Z; node log at 17:57:09.884Z; upstream `0` at +264 ms. After showing again: `Connected · View only`.
- **09 (AC-011):**
  - Xvnc restart: `"The node's desktop disconnected"`, buttons `Reconnect`, `Maximize view`, log `reason=desktop-closed`. Reconnect gives `Connected · View only` at `1920x1080`.
  - Server restart: the same state. Reconnect gives `Connected · View only`, upstream `1`.

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-only part |
| --- | --- | --- | --- | --- |
| AC-001 desktop app renders; desktop traffic only to the node's base URL | Yes | API-05 (01–09, network summary), API-10 (local `localhost`), IMP-19 | Proven | — |
| AC-002 node reachable only by its backend URL | Yes | API-04/05 (node published on the LAN address only, loopback refused, app renders), API-08 (`https`/`wss` through TLS termination) | Proven, except the cloud variant through a real Tailscale Serve in the Electron app | Tried: Tailscale is stopped on this Mac ("Tailscale is stopped", "No serve config"), and starting it changes the user's network. A self-signed proxy cannot be trusted by the app without changing the user's keychain. Needs the user's tailnet: add a Tailscale Serve `https` node and open its VNC Viewer |
| AC-003 client-supplied host/port/URL refused, no upstream | Yes | IMP-21 (route E2E), IMP-16 (`?mode=view&host=…&port=5900` → 4400, 0 upstream) | Proven | — |
| AC-004 embedded node: no shared desktop | No | API-05 01, IMP-06 | Proven | — |
| AC-005 policy refusal before upstream | Yes | IMP-21 (E2E with upstream spy: invalid/revoked phone credential, Phone Access disabled) | Proven | — |
| AC-006 View only: no key/pointer/clipboard reaches the desktop | Yes | API-04, API-05 04, API-08, IMP-16 | Proven | — |
| AC-007 Control by switch; input only in Control | Yes | API-05 05b + switch back, API-04/08 control positives, IMP-16/19 | Proven | — |
| AC-008 no resize (connect, Maximize, SetDesktopSize) | Yes | API-05 06, API-08, IMP-16/19 | Proven | — |
| AC-009 several viewers, size unchanged | Yes | API-05 06 (app + 2 raw), IMP-16 | Proven | — |
| AC-010 no stream without a visible view; upstream closed ≤ 2 s; reopening reconnects | Yes | API-05 07b (minimize ≤ 0.9 s), 08b (hide ≤ 0.27 s), 08 (tab), IMP-16, unit specs | Proven | — |
| AC-011 Xvnc / server restart: viewer shows it and can reconnect | Yes | API-05 09, IMP-17 | Proven | — |
| AC-013 ≤ 8 MiB per slow viewer | Yes | IMP-21 (integration test asserting peak `bufferedAmount` ≤ 8 MiB) | Proven (server integration, as the AC specifies) | — |
| AC-014 metadata-only logs | Yes | API-09, IMP-18 | Proven | — |
| AC-020 View only viewer's clipboard unchanged | No (Should) | IMP-19 (browser: clipboard unchanged in View only), IMP-15 / API-04 (View only gets only Notify; its Request is dropped) | Proven. Not repeated in Electron on purpose: it would put text on the user's real Mac clipboard if it failed | — |
| AC-022 backend port only, no host env; viewer works through the server | Yes | API-02, API-06 (PowerShell, real), API-10 (bash, real S1 image, app viewer), IMP-20, IMP-25 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 82% | 96% | every AC above; repository: API-01–03 | AC-002 cloud variant is user-only (excluded from the score) | — |
| Changed-boundary execution directness | 85% | 96% | real Xvnc behind the route (API-04, 05, 08, 10); real Electron visibility events | — | — |
| Cross-boundary integration realism and mock gap | 80% | 96% | Electron app ↔ real node over LAN and localhost; TLS termination; raw clients alongside the app | Electron `wss` to a real Tailscale Serve node (user-only); the client derives `wss` like every other `/ws` route (`nodeEndpoints.ts:29-30`, spec `nodeDesktopClient.spec.ts:16`) | User's tailnet check |
| Environment, configuration, identity, and fixture fidelity | 78% | 95% | fresh-clone app and server image; a launcher-made node from a real S1 image (API-10); an S0 (v8) node transitioned by the real PS launcher (API-06c) | Node on the same Mac (reached by its LAN address), not a second machine; PowerShell on Linux, not Windows | Second machine; Windows host |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 96% | minimize, hide, tab, Xvnc/server restart in the app; Control/View only switches; resize attempts; clipboard protocol variants | Slow-viewer cap only in the integration test (as the AC specifies) | — |
| User-surface, browser, and desktop-shell confidence | 70% | 95% | API-05 journey with screenshots; API-10 local; IMP-19 browser | A fully covered (occluded) window also reads as hidden and drops the stream (REQ-008 consistent); one View only stream was replaced once during a tile re-layout (reconnected in View only, not reproduced) | — |
| Durable regression coverage quality and relevance | 92% | 92% | 52 server node-desktop tests, 18 contract tests, web specs (D-7 rows, D-10, visibility), browser probe, launcher tests; parse test ran under pwsh | Electron-shell visibility and real-Xvnc clipboard behavior are proven by this round's runs, not by a durable suite (the repository has no gated real-node or Electron journey suite for this) | A gated real-node suite (outside this ticket) |

- Overall post-repository confidence: 82%
- Overall final confidence: 95.1% (simple average: 96, 96, 96, 95, 96, 95, 92); after API-01…09 it was 94.9% (96, 96, 96, 93, 96, 95, 92)
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks:
  1. Electron `wss` to a real Tailscale Serve node (user-only).
  2. PowerShell on a Windows host.
  3. No durable suite for the Electron shell or real-Xvnc behavior.
  4. The build-only release run (Windows/Linux runners), which is not run here; delivery runs it before the merge (below).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Project Desktop Validation` (isolated desktop instances), `Lifecycle` (real nodes, restarts, launchers), `Live API` (raw RFB clients, TLS proxy), `CLI`
- Gap addressed: repository and earlier evidence lacked the Electron shell's visibility behavior, the app against a node reachable only by a non-loopback address, real PowerShell, what Xvnc does with forwarded clipboard messages, and a fresh-start build. Expected gain: 82% → 95.1%.
- Browser validation: covered by IMP-19 (headless Chrome, web-equivalent); the Electron journey (API-05/10) adds the shell.
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed: two isolated instances of this commit's fresh-clone build (`iso-62503-d542`, `iso-64528-e090`), driven over CDP (`Runtime.evaluate`, `Input.*`, `Network.*`, `Page.captureScreenshot`). The window was minimized and hidden through macOS (`osascript`, by the instance's PID), because Electron's CDP lacks `Browser.getWindowForTarget`.
- Web-equivalent behavior: render, mode switch, Maximize, restart states (API-05; IMP-19). Shell-specific behavior: minimize, app hide and restore → `visibilitychange` (API-05 07b/08b), Electron's clipboard permission default (`granted`).
- Effect on any already-running desktop application: `None`. Each instance used its own ports and data root, and was stopped with its data root removed. Another engineer's isolated instance was never addressed. The user's clipboard was not read or written (permission guard in the node windows).
- Behavior not directly proven: Electron `wss` to a Tailscale Serve node (user-only).

## Persisted-Data Transition Checks

- Approved decision: `Directly Usable — No Migration`
- Representative existing data: a v8 PowerShell state written by the S0 (v8) PowerShell launcher itself (`noVncPort` present, its container publishing `127.0.0.1:N:6080` and setting `AUTOBYTEUS_VNC_SERVER_HOSTS`).
- Transition followed without migration: `Yes`. The S1 launcher read it normally, kept `backendPort` and the data volume, and its next write dropped `noVncPort` (`API-06c-02`). Bash: IMP-25.
- Version-specific runtime branch / dual path / compatibility fallback observed: `No`
- Residual risk: none material. A node's saved `AUTOBYTEUS_VNC_*` settings value (if a user saved one) shows as a deletable custom setting, per the design; this was not exercised (no such value on a fresh node).

## Compatibility / Legacy Scope Check

- Upstream backward compatibility in scope: `No`
- Compatibility-only behavior in the implementation: `No` (the host list, password keys, the 6080 publishing and the VNC Hosts card are gone; checked in the app: API-05 02, API-10 01)
- Durable coverage only for compatibility behavior: `No`
- Reroute: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`

None.

- Added or updated paths attached for test-code review: `Not Applicable` (temporary probes only, kept as evidence)
- Diff for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Was Not Used | Limitation |
| --- | --- | --- | --- |
| A second machine on the network | node published only on the Mac's LAN address | one machine | same-host network path |
| Tailscale Serve (`https` → `http` proxy) | local Node TLS-terminating proxy, self-signed certificate (raw `wss` client) | Tailscale stopped; starting it changes the user's network | not the real Serve hop; the app's `wss` is not exercised |
| Windows PowerShell | native Linux pwsh 7.4.6 against the real engine | no Windows machine | Windows paths/port probe not exercised |
| Node with an S1 image in a registry | test-owned `registry:2` on 127.0.0.1 | no S1 release exists | none for the launcher path |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| `abx405-api-node` + 5 volumes | Yes | `docker rm -f -v`, `docker volume rm` | Removed (`API-99-cleanup.txt`) |
| `abx405-ps-node` (two runs) + volumes, image `69e9c09535fa` pulled by run 1 | Yes | PS `destroy --name` (removed the unused image), volume rm | Removed (`API-06b-08`, `API-06c-04`) |
| Local tag `autobyteus/autobyteus-server:beta`, moved by run 1's pull | No (the user's) | `docker tag 9c5aa01bb2fc autobyteus/autobyteus-server:beta` | Restored; user nodes still on `9c5aa01bb2fc` (`API-06c-04`, `API-99`) |
| `abx405-launcher-node` + volumes, `abx405-api-registry`, images `abx405-api/autobyteus-server:s1`, `localhost:64429/…:s1`, `registry:2` | Yes | launcher destroy, volume rm, `docker rm -f -v`, `docker rmi` | Removed (`API-10-04`) |
| Images `mcr.microsoft.com/dotnet/runtime-deps:8.0`, `docker:cli` | Yes | `docker rmi` | Untagged |
| Isolated instances `iso-62503-d542`, `iso-64528-e090` | Yes | `isolated-app stop` | Stopped, data roots removed, ports released |
| `/private/tmp/abx405-api/` (fresh clone, app, server package, pwsh, probes, proxy cert) | Yes | `rm -rf` | Removed (probes kept as evidence) |
| buildx `desktop-linux` build cache from this round | Yes | left | Build cache only, no data |
| User's `autobyteus-server-0/1/2` and their volumes | No | never addressed (no `--all`, `new-container`, `reset`) | `Up 2 hours`, image `9c5aa01bb2fc` |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: AC-002's cloud variant through a real Tailscale Serve `wss` in the desktop app (user-only; see AC-002 row)
- Not run here, for delivery: the build-only release run that DESIGN.md rule 12 / RELEASE.md ask for a gate change (`tsconfig.cross-package-tests.json`, `nuxt.config.ts`): `pnpm release:test --ref codex/node-desktop-through-node-server`, before the merge. It needs the branch pushed (not on origin) and GitHub runners for Windows/Linux. The macOS fresh-start (API-07) passed.
- Preliminary classification: N/A
- Notes:
  - **Observation, by design:** the viewer also disconnects when its window is fully covered by other windows, because Chromium reports that as `hidden`. It reconnects in View only when visible again. This is consistent with REQ-008 and D-10. A user in Control who switches to a full-screen app comes back in View only.
  - **Observation, by design (REQ-017 residual noted by the reviewer):** a raw View only client cannot get the agent's clipboard through the extended-clipboard Request (dropped, API-04). The reviewer's note about legacy `ServerCutText` to clients without extended-clipboard support stays as recorded upstream.
  - **FU-002 added:** the app fetches icons from `api.iconify.design` at run time. This is pre-existing and app-wide.
