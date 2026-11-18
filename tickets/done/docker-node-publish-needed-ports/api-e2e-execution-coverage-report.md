# API/E2E Execution Coverage Report — S0: Docker nodes publish only the ports they need (autobyteus-402)

The run record and the result. The plan is in `api-e2e-coverage-investigation.md`; the history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-publish-needed-ports/tickets/in-progress/docker-node-publish-needed-ports/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; implementation complete (IR-001), direct API/E2E route
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - API-06 (b) planned PowerShell from `mcr.microsoft.com/powershell`. That image has no arm64 variant. Under amd64 emulation, pwsh 7.4.2 parsed and ran the unit tests (API-06 a), but it aborted with `PAL_SEHException` on the real launcher run (`API-06b-00-amd64-emulation-crash.log`). Step (b) therefore used native arm64 PowerShell 7.4.6 (the official `linux-arm64` tarball) in `mcr.microsoft.com/dotnet/runtime-deps:8.0`.
  - API-06 (a) also ran the whole launcher test file in that container. Six tests failed there for container reasons: running as root defeats the read-only state-dir setup, and `curl` is missing for the install tests. The six, plus the parse and collision tests, pass as a non-root user with `curl` installed (`API-06a-rerun-nonroot-with-curl.log`). They also pass on the Mac (IMP-01).
  - API-11 was added after the first confidence pass. With API-01..10 the overall score was 94%, and the closable part of the gap was AC-007 in the real desktop app. API-11 drove an isolated desktop instance of this worktree's build and opened the Docker node's VNC Viewer.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-publish-needed-ports/tickets/in-progress/docker-node-publish-needed-ports/evidence/`

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route` (no durable test code changed in this round)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `71dc90b1f1` (source identical to `2575d870e8`: `git diff --name-only 2575d870e8 71dc90b1f1` lists only `tickets/…`) | macOS 26.5.2 arm64 | `/bin/bash` 3.2, Python 3.9.6, Node v22.23.1, Docker Desktop 29.0.1 (Compose v2), image `autobyteus/autobyteus-server:1.5.11-beta.7` (`8bcf8eabfafe`) | temp `AUTOBYTEUS_DOCKER_STATE_DIR` / `…_SHARED_WORKSPACE_DIR` under `/private/tmp/abx402-api/`; test names `abx402-api-node`, `abx402-ps-node`, compose project `abx402-compose`; LAN IP 192.168.2.158 |
| ENV-2 | as ENV-1 | Ubuntu 22.04 container, x86_64 under Rosetta | PowerShell 7.4.2, Python 3.10, the test harness's fake Docker | worktree mounted read-only; own network namespace |
| ENV-3 | as ENV-1 | Linux arm64 container (`dotnet/runtime-deps:8.0`) | native PowerShell 7.4.6 (linux-arm64 tarball), static arm64 docker CLI from `docker:cli`; real Docker Desktop engine via `/var/run/docker.sock` | state/shared dirs mounted at the same absolute host path; v7 launcher = `git archive 6324fb056d` |
| ENV-4 | as ENV-1 | macOS 26.5.2 arm64 | Browser tab: Chromium 148.0.7778.280 in Electron 42.11.16 (user agent `… autobyteus/1.5.12-beta.3 Chrome/148.0.7778.280 Electron/42.11.16 …`), page at `http://127.0.0.1:58502` serving the worktree's `@novnc/novnc` 1.7.0-g7c36fab | `localhost` resolves to `::1` then `127.0.0.1` (`dscacheutil`) |
| ENV-6 | `71dc90b1f1` | macOS 26.5.2 arm64 | Isolated desktop instance `iso-60917-946b` of this worktree's build (`pnpm --silent isolated-app start --build`; AutoByteus 1.5.12-beta.3, e2e profile, own data root), driven over CDP (control port 60917) | test node `abx402-api-node` (server 1.5.11-beta.7) added as a remote node, collaboration off |
| ENV-5 | `71dc90b1f1` fresh clone | macOS 26.5.2 arm64 | Node v22.23.1, pnpm 10.28.2 | no signing/notarization secrets (`CSC_IDENTITY_AUTO_DISCOVERY=false`) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-002 (static), AC-003, AC-005 | bash launcher, fake Docker; PS static | Reused IMP-01 | — | Pass | (IMP-01 row) | (IMP-01 row) | Ran on `2575d870e8`; nothing outside `tickets/` changed since |
| API-02 | Preserved update/stop | bash launcher | Reused IMP-02 | — | Pass | (IMP-02 row) | (IMP-02 row) | Same |
| API-03 | AC-004 | compose config | Reused IMP-04 | — | Pass | (IMP-04 row) | (IMP-04 row) | Same; the real compose run is API-09 |
| API-04 | AC-005 | Docker Guide copy, localization guards | Reused IMP-05 | — | Pass | (IMP-05 row) | (IMP-05 row) | Same; the fresh-start build (API-10) also passed both guards and the typecheck |
| API-05 | AC-003, AC-006, QR-001 | bash launcher on real Docker, v7 → v8 | Reused IMP-07 | — | Pass | (IMP-07 row) | (IMP-07 row) | Same; its RFB check used `127.0.0.1` (API-07 adds `localhost`) |
| API-06 | AC-002, AC-003 (PS), AC-005 (PS); REQ-001/002/003; persisted JSON | PowerShell launcher under real pwsh | (a) `docker run --platform linux/amd64 -v <worktree>:/w:ro mcr.microsoft.com/powershell:latest bash -c 'apt-get install python3; cd /w && python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace -v'`, then the 6 environment failures + parse + collision as a non-root user with `curl`. (b) runner `API-06-ps-run.sh`: seed v7 JSON (four ports) → v7 PS launcher `workspace apply --name abx402-ps-node` → data-volume marker → v8 PS launcher `workspace apply --name abx402-ps-node` twice → `urls --name` → `help` → `destroy --name` + `docker volume rm` ×5 | ENV-2 (a), ENV-3 (b) | Pass | `API-06a-launcher-tests-with-pwsh.log`, `API-06a-rerun-nonroot-with-curl.log`, `API-06b-01-seeded-v7-state.json.txt`, `API-06b-02-v7-ps-create.log`, `API-06b-03-v7-ps-node.txt`, `API-06b-04-v8-first-apply.log`, `API-06b-05-v8-node-after-first-apply.txt`, `API-06b-06-v8-second-apply.log`, `API-06b-07-v8-urls.log`, `API-06b-08-v8-help.log`, `API-06b-09-destroy-and-cleanup.txt`, `API-06-ps-run.sh`, `API-06b-00-amd64-emulation-crash.log` | (a) `test_powershell_launcher_parses_when_pwsh_is_available … ok`, `test_preferred_port_collision_falls_back_for_that_service … ok`; rerun `Ran 8 tests` / `OK`. (b) 03: four `0.0.0.0` mappings (v7); 04: `Launcher config changed for abx402-ps-node; recreating the managed container while keeping named volumes.` and `VNC Viewer: localhost:56186 (this computer only)`; 05: `127.0.0.1:56186->6080/tcp, 0.0.0.0:56184->8000/tcp, [::]:56184->8000/tcp`, `{"6080/tcp":[{"HostIp":"127.0.0.1","HostPort":"56186"}],"8000/tcp":[{"HostIp":"","HostPort":"56184"}]}`, JSON with only `backendPort` 56184 and `noVncPort` 56186, `marker: abx402-ps-volume-marker`, five named volumes mounted; 06: `already running with the current image and launcher config` and the same id `827d51bf7fcd…` as 05; 08: `Show Backend, GraphQL and VNC Viewer (this computer only) URLs`; 09: `containers named abx402-ps-node: []`, `volumes abx402-ps-node-*: []` | Linux pwsh, not Windows: the port probe runs in the container's namespace. The changed PS lines are platform-neutral values |
| API-07 | BEH-005, AC-006, AC-007 (transport), QR-001; REQ-001 | Fresh v8 node; VNC Viewer transport as the app dials it (`ws://localhost:<N>`) | seed state (no ports) → `autobyteus-docker.sh workspace apply --name abx402-api-node`; `docker ps` / inspect / `lsof`; `node API-07-localhost-probe.mjs <ws pkg> 192.168.2.158 58395 58396`; browser tab `http://127.0.0.1:58502/index.html?url=ws://localhost:58396` (page `API-07-novnc-page.html`: `new RFB(div, url, { credentials: { password: '' }, shared: true })` from the worktree's `@novnc/novnc` 1.7.0), then `ws://[::1]:58396` and `ws://192.168.2.158:58396` as negative controls | ENV-1, ENV-4 | Pass | `API-07-01-v8-create.log`, `API-07-02-v8-node.txt`, `API-07-03-node-localhost-probe.txt`, `API-07-localhost-probe.mjs`, `API-07-04-browser-novnc-results.txt`, `API-07-04-novnc-localhost-connected.png`, `API-07-novnc-page.html`, `API-07-08-cleanup.txt` | 02: `127.0.0.1:58396->6080/tcp, 0.0.0.0:58395->8000/tcp, [::]:58395->8000/tcp`; lsof `IPv4 … TCP 127.0.0.1:58396 (LISTEN)` and `IPv6 … TCP *:58395 (LISTEN)`; state has only `BACKEND_PORT=58395`, `NOVNC_PORT=58396`. 03: `localhostLookupAll` `::1` first; vncViewer `::1` `ECONNREFUSED`, `localhost` `connected` with `"remoteAddress": "127.0.0.1"`, LAN `ECONNREFUSED`; backend LAN `connected`; `wsLocalhost` `"serverVersion": "RFB 003.008"`. 04: `"status":"connected","detail":"fb=1920x1080 name=vncuser@35c0bd419d20 canvas=1920x1080"`, `sampledNonBlackPixels":21378`; screenshot shows the node desktop with Chromium; `[::1]` and LAN targets `"status":"disconnected"`, no canvas | Chromium's fallback from `::1` to `127.0.0.1` is what keeps BEH-005 working. Before the change, `-p N:6080` also listened on `[::]` |
| API-08 | AC-001 alternate (bind-failure retry) on real Docker; REQ-001 | bash launcher + Docker's real bind error for a `127.0.0.1:` mapping | after API-07: data marker; `docker rm -f abx402-api-node` (own container; state kept); Python listener on `127.0.0.1:58396`; `autobyteus-docker.sh workspace apply --name abx402-api-node`; release listener; inspect | ENV-1 | Pass | `API-08-01-bind-failure-retry.log`, `API-08-02-after-retry.txt` | 01: `Python … TCP 127.0.0.1:58396 (LISTEN)`, then `Port bind failed; retrying with fresh ports (attempt 2/5).`, `Started abx402-api-node.`, `VNC Viewer: localhost:58924 (this computer only)`; 02: `127.0.0.1:58924->6080/tcp, 0.0.0.0:58923->8000/tcp`, state `BACKEND_PORT=58923` / `NOVNC_PORT=58924`, `marker: abx402-api-volume-marker` | Proves `is_bind_failure` matches Docker Desktop's error for a loopback-qualified mapping |
| API-09 | AC-004, REQ-004, QR-001 | `docker-start.sh` + compose on real Docker | `docker tag autobyteus/autobyteus-server:1.5.11-beta.7 autobyteus-server:latest-abx402`; `cd autobyteus-server-ts/docker && ./docker-start.sh up -p abx402-compose -v abx402 --no-build`; `.runtime` env, `docker ps`, inspect, `lsof`, Node probe; `./docker-start.sh down -p abx402-compose --volumes --delete-state`; `docker rmi autobyteus-server:latest-abx402` | ENV-1 | Pass | `API-09-01-compose-up.log`, `API-09-02-compose-ports.txt`, `API-09-03-cleanup.txt` | 01: `VNC Viewer: localhost:59112 (this computer only)`; 02: env file with only `AUTOBYTEUS_BACKEND_PORT=59111`, `AUTOBYTEUS_WEB_VNC_PORT=59112`, `AUTOBYTEUS_IMAGE_TAG=latest-abx402`; `127.0.0.1:59112->6080/tcp, 0.0.0.0:59111->8000/tcp, [::]:59111->8000/tcp`; vncViewer LAN `ECONNREFUSED`, `ws://localhost:59112` `RFB 003.008`; 03: `compose volumes: []`, `.runtime: []`, `Untagged: autobyteus-server:latest-abx402` | — |
| API-10 | Release safety (fresh-start build; TESTING.md build inputs `scripts/**`, `autobyteus-server-ts/docker/**`) | Desktop release job from a fresh clone | `API-10-fresh-start-build.sh`: `git clone --no-local` + checkout `71dc90b1f1`; `python3 scripts/check_repository_artifact_hygiene.py`; `python3 scripts/check_licensing.py`; `pnpm install --frozen-lockfile`; `cd autobyteus-web && NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=… CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64`; Prisma and terminal-runtime verify steps | ENV-5 | Pass | `API-10-fresh-start-build.excerpt.txt`, `API-10-fresh-start-build.full.log`, `API-10-fresh-start-build.sh` | `exit=0` after each step; `[guard:localization-boundary] Passed.`; `[typecheck] production errors: 0; test-file errors: 99 in 43 files (baseline 99 in 43 files)`, `[typecheck] PASS`; `building        target=DMG arch=arm64`; `prisma engine ok`, `prisma client ok`; `== ALL DONE` | Not run: signing/notarization (runner secrets), other OSes, and the server image job (its steps read none of the changed files; investigation, Discovery). The full log's first line says "API-08": the case was renumbered after it started |

| API-11 | AC-007, BEH-005, AC-005 (rendered Guide copy) | Real desktop app: Nodes → Add node → open the node window → VNC Viewer tab; Docker Guide card | `pnpm --silent isolated-app start --build`; v8 bash launcher `workspace apply --name abx402-api-node`; through CDP (`API-11-cdp.mjs`): Nodes → Add node (`http://localhost:60167`, name `abx402-docker-node`, collaboration unticked) → Docker Guide (read the `urls` card) → Manage Nodes → `Open abx402-docker-node in its own window` → node window: Show tools → VNC Viewer; wait 8 s; read `.vnc-viewer` and canvas; screenshots; `isolated-app stop iso-60917-946b`; `destroy --name` + volume rm | ENV-6 | Pass | `API-11-00-isolated-instance-start.json`, `API-11-01-test-node.log`, `API-11-02-docker-guide-urls.png`, `API-11-03-node-window-vnc-viewer.png`, `API-11-04-desktop-journey.txt`, `API-11-05-isolated-instance-stop.json`, `API-11-06-cleanup.txt`, `API-11-cdp.mjs` | 01: `127.0.0.1:60168->6080/tcp`, container env `localhost:60168`; 04: `"viewerText":"localhost:60168\nConnected to VNC server\nDisconnect\nView Only"`, `"canvas":{"width":1920,"height":1080,…}`; `Prints the Backend, GraphQL and VNC Viewer (this computer only) addresses for all managed nodes by default.`, `"mentionsNoVNC":false`; 03 screenshot: green dot, `localhost:60168`, the node desktop; 05: `"dataRootRemoved": true`, both ports released | The node window's Workspaces panel shows a `lastActivityAt` GraphQL error. The node server (1.5.11-beta.7) is older than the app (1.5.12-beta.3); this is version skew of the test image, unrelated to this change |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 (bash run args, state, friendly 8001/6080, bind-retry) | Yes | API-01, API-05, API-07, API-08 | Proven | — |
| AC-002 (PowerShell same shape) | Yes | API-01 (static), API-06 (parse under real pwsh; real v7→v8 run with the real engine: args, JSON, output) | Proven (Linux pwsh; Windows host not run, see residual risks) | — |
| AC-003 (v7 node recreated once at the user's lifecycle command, same ports, volumes kept, second run reuses) | Yes | API-01 (`upgrade --all`, fake), API-05 (bash real), API-06 (PS real) | Proven. The trigger is `upgrade --all` / `workspace apply`; the launcher has no `start` (wording note below) | — |
| AC-004 (compose ports) | Yes | API-03, API-09 | Proven | — |
| AC-005 (output, help, Guide, docs wording) | No | API-01, API-04, API-11 (Guide rendered in the real app), API-06 (PS `urls`/`help`), API-07/09 output lines; doc diff reviewed (README.md, autobyteus-server-ts/README.md, docker/README.md: two ports, `127.0.0.1`, no VNC app / `chrome://inspect` from outside, existing nodes change at `upgrade --all` / `workspace apply`) | Proven | — |
| AC-006 (real node: `0.0.0.0:B->8000` + `[::]`, `127.0.0.1:N->6080` only; RFB on loopback; LAN refused) | Yes | API-05, API-07, API-09 | Proven | — |
| AC-007 (desktop VNC Viewer still renders) | No (optional in the requirements) | API-11 (the worktree's desktop app: the Docker node window's VNC Viewer tab connected to `localhost:60168` and rendered the node desktop); API-07 (the same noVNC in a Chromium renderer, with `[::1]` / LAN negative controls) | Proven | — |
| QR-001 (no listener reachable from another device on 5900/6080/9223) | Yes | API-05 (old ports refused on LAN), API-07, API-09 (VNC Viewer port refused on LAN); 5900/9223 have no host mapping at all (inspect `PortBindings`) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 96% | Repository: API-01..04. Final: API-05..09 prove every critical AC on real Docker for both launchers | PS on a Windows host | A Windows run |
| Changed-boundary execution directness | 75% | 96% | Real `docker run` / compose publishing, inspected `PortBindings`, host `lsof` (API-05..09) | — | — |
| Cross-boundary integration realism and mock gap | 70% | 96% | Fake Docker was replaced by the real engine; real noVNC over `localhost` in a Chromium renderer (API-07) and in the real app's node window (API-11); real bind error (API-08) | PS on Windows Docker Desktop | Windows host |
| Environment, configuration, identity, and fixture fidelity | 80% | 93% | Real image, real v7 launchers producing v7 state (bash, PS), the resolver's actual `localhost` order (ENV-4) | Linux pwsh instead of Windows PowerShell for API-06; Docker Desktop for Windows not run | Windows host |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 95% | Recreate-once and reuse (bash, PS), real bind-failure retry on a loopback mapping (API-08), compose down/volume cleanup, `::1` / LAN negative controls | PS bind-failure on a real engine (same regex as bash; fake-tested) | — |
| User-surface, browser, and desktop-shell confidence | 70% | 96% | Guide specs (API-04) and the Guide rendered in the real app (API-11); the real node-window VNC Viewer connected and rendered (API-11); launcher output lines | Only the enterprise build flavor was used (the flavor `isolated-app --build` produces); the VNC Viewer code is shared by both flavors | — |
| Durable regression coverage quality and relevance | 92% | 92% | Updated launcher tests assert exact two-port shape, state keys, output, v7 recreate; the reproduction fails 7 times on base (IMP-03); the parse and collision tests ran under pwsh (API-06 a) | Real-Docker behavior (IPv4-only listener, real bind text) has no durable test; the repository has no gated real-Docker launcher suite | A gated real-Docker launcher suite (outside this ticket) |

- Overall post-repository confidence: 79%
- Overall final confidence: 94.9% (simple average: 96, 96, 96, 93, 95, 96, 92); after API-01..10 alone it was 94% (96, 96, 95, 93, 95, 92, 92)
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No`, by 0.1 point (94.9%). Every critical AC is proven directly. API-11 closed the closable gap, the desktop app's VNC Viewer. The two remaining limits cannot be closed here: (1) PowerShell on a Windows host (environment fidelity 93%), because no Windows machine is available; the changed PS lines ran for real under pwsh 7.4.6 (API-06); (2) no durable real-Docker test (durable regression 92%), because the repository has no gated real-Docker launcher suite, and adding one is test infrastructure outside this ticket.
- Confidence-limiting residual risks: (1) the PS launcher on Windows. Windows paths and the `TcpListener` probe are untouched by this change; the changed lines are values and ran for real under pwsh 7.4.6. (2) Real-Docker behavior (IPv4-only loopback listener, real bind error text) is proven by this round's runs, not by a durable test.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Lifecycle` (real Docker, both launchers, compose), `Browser` (noVNC in a Chromium/Electron renderer), `Project Desktop Validation` (isolated desktop instance), `CLI`
- Confidence gap or residual risk it addresses, and the expected gain: fake Docker could not show Docker's real listeners, IPv6 loss, real bind errors, or PowerShell running at all. The `localhost` dial target of the real viewer was unproven. Gain: post-repository 79% → final 94.9%, every critical AC directly proven.
- Browser validation needed, and why: yes. The VNC Viewer's renderer resolves `localhost` itself, and the change removed the IPv6 listener.
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed: web-equivalent renderer check (API-07), then an isolated desktop instance of this worktree's build (API-11; TESTING.md "Isolated desktop instance"). The browser tool's tab is Chromium 148 inside Electron 42 (the AutoByteus app's engine). It ran the app's `@novnc/novnc` 1.7.0 with the app's options against `ws://localhost:<N>`.
- Cases proving web-equivalent behavior: API-07. The real-app journey: API-11. Shell-specific or lifecycle behavior: none changed by this ticket.
- Effect on any already-running desktop application: `None`. The API-07 tab was opened and closed through the browser tool. API-11 used its own instance with its own ports and data root, removed on stop. Another engineer's isolated instance (`iso-50369-8be8`) was never addressed.
- Behavior not directly proven and its confidence consequence: none for this change.

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data used: v7 state written by the v7 launchers themselves: bash `.env` (IMP-07-03) and PS `.json` (`API-06b-03`, with `vncPort`/`debugPort` and a v7 `configHash`)
- Approved transition followed without an unnecessary migration: `Yes`. The normal reader loaded it, the ports were kept, and the next write dropped the two keys (IMP-07-08; `API-06b-05`).
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`. PS `Get-UsedPorts` reads every `*Port` property generically, the same rule as bash `collect_used_ports`; it has no old-key branch.
- Residual untested persisted-data risk: none material

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No` (`write_v7_node` fixture models the real v7 input of the approved one-time recreate)
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`

None.

- Added or updated paths attached for proportional test-code review: `Not Applicable`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Windows PowerShell host | Linux pwsh 7.4.6 (arm64) talking to the real Docker engine | No Windows machine | Windows-specific paths and port probe not exercised (unchanged code) |
| Docker (repository tests only) | Fake Docker in API-01/02/06 a | Unit layer | Covered by the real-engine cases |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Test node `abx402-ps-node` + 5 volumes | Yes | PS `destroy --name`; `docker volume rm` ×5 | Removed (`API-06b-09`) |
| Test node `abx402-api-node` + 5 volumes | Yes | bash `destroy --name`; `docker volume rm` ×5 | Removed (`API-07-08-cleanup.txt`) |
| Compose project `abx402-compose` (container, network, 5 volumes, `.runtime/abx402-compose.env`) | Yes | `docker-start.sh down --volumes --delete-state` | Removed (`API-09-03`) |
| Image tag `autobyteus-server:latest-abx402` | Yes | `docker rmi` (untag only; the underlying image is the user's existing `1.5.11-beta.7`) | Untagged |
| Images `mcr.microsoft.com/powershell:latest`, `mcr.microsoft.com/dotnet/runtime-deps:8.0`, `docker:cli` | Yes (pulled by this run) | `docker rmi` | Untagged |
| amd64 pwsh container that hung (`PAL_SEHException`) | Yes | `docker rm -f` | Removed |
| Python port holder on `127.0.0.1:58396` | Yes | `kill` | Stopped |
| HTTP server `127.0.0.1:58502`, browser tab `db9bd5` | Yes | process killed; tab closed | Done |
| `/private/tmp/abx402-api/` (state, shared, base launcher, pwsh tarball, fresh clone + DMG; recreated for API-11) | Yes | `rm -rf` (twice) | Removed |
| Isolated instance `iso-60917-946b` and its data root | Yes | `isolated-app stop iso-60917-946b` | Stopped, data root removed, ports released (`API-11-05`) |
| Test node `abx402-api-node` (API-11) + 5 volumes | Yes | bash `destroy --name`; `docker volume rm` ×5 | Removed (`API-11-06`) |
| `autobyteus-web/electron-dist/` in the worktree (API-11 build output) | Yes | Left in place: untracked, gitignored build output of this worktree | Kept |
| User's nodes `autobyteus-server-0/1/2` and volumes `autobyteus-server-3…7-*` | No | Not touched (no `--all`, `new-container`, `reset`) | `Up 3 days` after every case |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: see the handoff message
- Notes:
  - Wording, not behavior: REQ-003, REQ-006, AC-003 and the design name `autobyteus-docker start`, which does not exist. The validated triggers are `upgrade --all` and `workspace apply`, which the docs name. The Solution Designer may want to correct the requirement/design wording.
  - Observation for S1 (no action in S0): the VNC Viewer port is IPv4-loopback only. The app reaches it because Chromium and Node fall back from `::1` to `127.0.0.1` (API-07). A client that dials `[::1]` explicitly is refused.
