# API/E2E Coverage Investigation — S0: Docker nodes publish only the ports they need (autobyteus-402)

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-publish-needed-ports/tickets/in-progress/docker-node-publish-needed-ports/requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `.../docker-node-publish-needed-ports/investigation-notes.md`
- Solution Revision Record: `.../docker-node-publish-needed-ports/solution-revision-record.md` (SR-001)
- Design Spec (required on every route): `.../docker-node-publish-needed-ports/design-spec.md` (SR-001, Ready; Small + Low)
- Supplemental Task Artifacts: parent `probes/rfb-forwarding-probe.mjs` (its `handshake` mode no longer runs once 5900 is unpublished; the implementation replaced it with `evidence/IMP-07-check-published-ports.mjs`)
- Design Review Report: `N/A — not applicable` (architecture review not selected)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `.../docker-node-publish-needed-ports/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `.../docker-node-publish-needed-ports/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record (created after the first completed result): `.../docker-node-publish-needed-ports/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation complete (IR-001), direct API/E2E route; message from `implementation_engineer` 2026-11-06
- Prior Investigation Reviewed: `N/A` (first round)
- Latest Authoritative Investigation: this file

Code under test: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-publish-needed-ports`, branch `codex/docker-node-publish-needed-ports`; implementation `2575d870e8`, handoff `71dc90b1f1` (ticket files only: `git diff --name-only 2575d870e8 71dc90b1f1` lists only `tickets/...`). Base `origin/personal` @ `6324fb056d`.

## Current Requirement And Design Basis

New and recreated launcher nodes (bash and PowerShell) publish the backend port on all interfaces and the VNC Viewer port (container 6080) only on `127.0.0.1`. They no longer allocate, store, publish or print the VNC (5900) and Chrome debug (9223) ports (REQ-001, REQ-002). `CONFIG_HASH_VERSION` v7 → v8 recreates an existing node once, at the user's own lifecycle command, keeping its backend and VNC Viewer ports and named volumes (REQ-003). Compose, `.env.example` and `docker-start.sh` follow the same rule (REQ-004). Output, help, the Docker Guide `urls` copy (en, zh-CN) and the docs say Backend, GraphQL, "VNC Viewer … (this computer only)" (REQ-005, REQ-006). Preserved: BEH-005, the desktop app's VNC Viewer dialling `localhost:<VNC Viewer port>` on the same computer. Persisted data: launcher state files, `Directly Usable — No Migration`.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (create a node), SCN-002 (existing node gets the new shape), SCN-003 (compose / `docker-start.sh`).
- Real-use scenarios added from investigating the implemented behavior:
  - **SCN-001a — the VNC Viewer dials `localhost`, not `127.0.0.1`.** `-p N:6080` used to listen on IPv4 and IPv6 (`[::]:N`). `-p 127.0.0.1:N:6080` listens on IPv4 loopback only. The app's VNC Viewer builds `ws://localhost:<N>` (`utils/vncHosts.ts`, from `AUTOBYTEUS_VNC_SERVER_HOSTS=localhost:<N>`) and opens it with noVNC `RFB` in the Chromium renderer (`composables/useVncSession.ts`). If `localhost` resolves to `::1` first and nothing falls back to `127.0.0.1`, BEH-005 breaks. IMP-07 only proved `ws://127.0.0.1:<N>`. Real trigger: the user opens the VNC Viewer for the node, which runs noVNC in Chromium against `ws://localhost:<N>`.
  - **SCN-001b — saved VNC Viewer port taken on the host's loopback.** The node's state has saved ports and the container is gone, for example after Docker Desktop was reset or the container was removed. Another program now listens on `127.0.0.1:<N>`. The user runs `workspace apply --name` / `upgrade --all`, so the launcher runs `docker run` with the saved ports. Docker's bind error for a `127.0.0.1:`-qualified mapping must still match `is_bind_failure` so the launcher retries with fresh ports. Fake Docker (IMP-01) cannot prove the real error text.
  - **SCN-002-PS — the PowerShell launcher runs end to end.** A v7 PowerShell JSON state and container, then the v8 PowerShell launcher. IMP-01 checks the PowerShell sources only statically.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 run args / port allocation (bash, PS) | Changed | design DS-001; diff `container-config.sh`, `ContainerConfig.ps1`, `docker-runtime.sh`, `DockerRuntime.ps1` | Fake-Docker tests (bash); real Docker for both launchers |
| BEH-002 v7 → v8 recreate, ports and volumes kept | Changed (hash version) | `core.sh:6`, `Core.ps1:7` | Fake-Docker AC-003 test; real v7→v8 for bash (IMP-07) and PS (new) |
| BEH-003 compose / `docker-start.sh` | Changed | compose diff | `compose config` (IMP-04) + real `docker-start.sh up` |
| BEH-004 output / help / Guide / docs | Changed | diff | Output tests, Guide specs, doc review |
| BEH-005 VNC Viewer on `localhost:<port>` | Preserved | parent BEH-001 | Real noVNC in Chromium against `ws://localhost:<N>` |
| State files drop `VNC_PORT`/`DEBUG_PORT` (`vncPort`/`debugPort`) | Removed | design Persisted Data | v7 state read and rewritten, bash + PS |
| PS `Get-UsedPorts` reserves every `*Port` property | Changed (generic reader) | handoff Important Assumptions | Exercised by PS real run (v7 JSON present) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | Yes | Host port publishing of the node (Docker `-p`) | Fake-Docker arg assertions | Docker's real listener set (IPv4/IPv6), real bind errors | Real Docker (CLI/Lifecycle) |
| Frontend component / state | Yes (copy) | Docker Guide `urls` description string | Component specs (IMP-05) | None material (string in a wrapping paragraph) | None |
| Browser integration / user journey | Yes (preserved) | VNC Viewer WebSocket to `localhost:<N>` | None | `localhost` → `::1` with no IPv6 listener | Browser: real noVNC in Chromium |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes (preserved) | VNC Viewer renderer (noVNC) | None | As above | Browser (web-equivalent) |
| Desktop shell / Electron-specific integration | No | The VNC Viewer runs in the renderer; no shell code changed | — | — | — |
| Process / lifecycle | Yes | Launcher create / recreate / bind retry; compose up/down | Fake Docker | Real Docker error text and recreate | Real Docker (Lifecycle) |
| Persisted-data transition | Yes | Launcher state files (`.env`, `.json`) | Fake-Docker AC-003 test (bash) | PS JSON rewrite | PS real run |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | Docker Engine / Docker Desktop port forwarding | — | As above | Real Docker |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-publish-needed-ports`
- Project type and runtime stack: pnpm monorepo; the public Docker launcher is bash + PowerShell (`scripts/public/docker`), tested with Python `unittest` (`scripts/tests`); Nuxt/Electron web app (`autobyteus-web`); Docker Desktop on macOS arm64.
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-publish-needed-ports/TESTING.md` (root; no closer `TESTING*.md` under `scripts/` or `autobyteus-server-ts/docker/`).
- Conflicting, missing, or unclear project instructions: TESTING.md's "Docker server nodes" rule describes a hand-made test container bound to `127.0.0.1`. The launcher under test chooses its own publishing, so its backend publishes on all interfaces by design (REQ-001). The run stays within the rule's intent: a test-owned node name, temp state and shared dirs, fresh test volumes, never the user's containers or volumes, removed afterwards. TESTING.md has no row for the launcher's Python tests; the design and handoff use `python3 -m unittest scripts.tests.<module>`.
- Changed build-input paths: `scripts/**` (`scripts/public/docker/...`, `scripts/tests/...`) and `autobyteus-server-ts/docker/**` (`docker-compose.yml`, `.env.example`, `docker-start.sh`, `README.md`) → fresh-start build case API-10. `release-server-docker.yml`'s image build reads none of the changed files. `Dockerfile.monorepo` copies only `starter/*.mjs`, the signing key, the supervisor conf and the entrypoint/bridge scripts from `autobyteus-server-ts/docker/`. Its builder stage copies `autobyteus-server-ts` wholesale, but no build step reads compose, `.env.example`, `docker-start.sh` or the README. The server image build is recorded as not needed, with this reason. The desktop job runs the hygiene and licensing checks over the whole tree, and its `pnpm typecheck` / guards read the changed localization files, so the desktop job is run.
- Required environment variables or secrets available: `N/A` (no secrets; `AUTOBYTEUS_DOCKER_STATE_DIR` / `AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR` point at temp folders)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` (root) | Testing guideline | Docker server nodes rule (test-owned container and volumes, never the user's; `docker rm -f -v` after); fresh-start build rule and build-input list; one heavy run at a time; rerun by impact |
| `AGENTS.md` (root) | Repository instructions | Read DESIGN/TESTING/RELEASE |
| `design-spec.md` Validation Plan | Ticket | Isolated node with temp state/shared dirs; image `autobyteus/autobyteus-server:1.5.11-beta.7` (local); never touch `autobyteus-server-0/1/2` |
| `implementation-handoff.md` Known Risks | Ticket | `upgrade --all`, `new-container`, `reset`, `workspace apply --all` reach every managed node by label; use only `workspace apply --name <test node>` and `destroy --name <test node>` |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` header | Test file | Python 3.9+; PowerShell parse requires `pwsh` |
| `.github/workflows/release-desktop.yml`, `release-server-docker.yml` | Release jobs | Desktop: hygiene + licensing checks, `pnpm install --frozen-lockfile`, `pnpm build:electron:mac -- --arm64`, Prisma and terminal-runtime verifications |
| `autobyteus-server-ts/docker/docker-start.sh` | Dev script | `up -p <project> -v <variant> --no-build` needs local `autobyteus-server:latest-<variant>`; `down --volumes --delete-state`; state in gitignored `.runtime/` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Test node `abx402-api-node` (bash launcher) | worktree | seed state (name, container, image, created; no ports); `autobyteus-docker.sh workspace apply --name abx402-api-node` | image `autobyteus/autobyteus-server:1.5.11-beta.7` | launcher `Started …`; `docker ps` | `destroy --name abx402-api-node`; `docker volume rm` its five volumes |
| Test node `abx402-ps-node` (PS launcher) | `pwsh` container | `docker run mcr.microsoft.com/powershell` with the Docker socket, a static Docker CLI from `docker:cli`, the launcher mounted read-only, and temp state/shared dirs mounted at the same absolute host path | Linux pwsh 7; real Docker Desktop engine | launcher `Started …` | PS `destroy --name abx402-ps-node`; volume rm; remove both pulled images |
| Compose project `abx402-compose` | `autobyteus-server-ts/docker` | `docker tag … autobyteus-server:latest-abx402`; `./docker-start.sh up -p abx402-compose -v abx402 --no-build` | project-scoped volumes `abx402-compose_*` | `Instance abx402-compose is up.` | `./docker-start.sh down -p abx402-compose --volumes --delete-state`; `docker rmi autobyteus-server:latest-abx402` (tag only) |
| Static noVNC page server | `/tmp/abx402-api/novnc-page` | `python3 -m http.server --bind 127.0.0.1 <port>` | serves the worktree's `@novnc/novnc` 1.7.0 (the app's version) | HTTP 200 | kill the process |
| Fresh clone build | `/tmp/abx402-api/fresh-clone` | `/tmp/abx402-api/fresh-start.sh` | heavy; run alone where possible | `== ALL DONE` | `rm -rf` the clone |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| v7 node (bash) | IMP-07 (reused) | — | done by IMP-07 |
| v7 node (PS) | base PS launcher (`git archive 6324fb056d`) run on a hand-seeded JSON state without ports | test name only | destroyed with volumes |
| Host port held on `127.0.0.1:<N>` | Python listener owned by this run | only the test node's own saved port | process killed |

**Not used on purpose:** `new-container`. With a temp state dir, it would take the next free index after the user's `autobyteus-server-0/1/2`, which is `autobyteus-server-3`. The user still has volumes `autobyteus-server-3-…` to `autobyteus-server-7-…` (`docker volume ls`; `-root-home` holds CLI sign-ins), so the node would mount the user's old data. SCN-001's port selection through `new-container` is proven with fake Docker (IMP-01). The real runs use a test name through the same `start_node` path.

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check"
- Representative existing-data setup and required behavior: a v7 state written by the v7 launcher itself (bash `.env` with `VNC_PORT`/`DEBUG_PORT`; PS `.json` with `vncPort`/`debugPort`). The v8 launcher reads it through its normal reader, keeps the backend and VNC Viewer ports, and its next write drops the two keys.
- Evidence planned: IMP-07-03/08 (bash, reused); API-06 before/after JSON (PS).
- Migration-specific scenarios: N/A.
- Upstream ambiguity or reroute required: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_new_container_adds_bind_mounts_without_removing_named_volumes` | Run args publish `B:8000` + `127.0.0.1:N:6080` only; state keys; output line | AC-001, AC-005 | Still Valid (updated by implementation) | diff; IMP-01/03 | Reuse |
| `…::test_urls_and_help_name_backend_graphql_and_local_vnc_viewer_only` (new) | `urls` / `help` text | AC-005 | Still Valid | IMP-01 | Reuse |
| `…::test_upgrade_recreates_a_v7_node_once_with_its_saved_ports_and_volumes` (new) | v7 → v8 once, same ports, volumes, second run reuses | AC-003 | Still Valid | IMP-01/03 | Reuse |
| `…::test_new_containers_prefer_sequential_friendly_ports` | 8001+i / 6080+i, two probes per node | AC-001 | Still Valid (updated) | IMP-01 | Reuse |
| `…::test_preferred_port_collision_falls_back_for_that_service` | busy 8001 → fallback | AC-001 | Still Valid; skips here (user's node holds 8001); same policy proven by `test_controlled_busy_preferred_port_uses_real_random_fallback` | IMP-01 | Reuse |
| `…::test_bind_failure_retry_uses_random_ports_after_first_friendly_attempt` | fake bind failure → fresh ports for both | AC-001 (alternate) | Still Valid (updated) | IMP-01 | Reuse; real error text added by API-08 |
| `…::test_powershell_launcher_matches_the_shared_workspace_cli_contract` | static PS/bash parity (v8, mapping, removed keys/labels) | AC-002 | Still Valid (updated) | IMP-01 | Reuse; runtime proof added by API-06 |
| `…::test_powershell_launcher_parses_when_pwsh_is_available` | PS parse | AC-002 | Still Valid; skips here (no `pwsh`) | IMP-01 | Its command is run under real pwsh in API-06 |
| Other tests in that file (destroy, workspace, upgrade, install, discovery) | unchanged behavior; fixtures now 2-port | Preserved | Still Valid | IMP-01 | Reuse |
| `scripts/tests/test_public_docker_launcher_update.py`, `…_stop.py` | update/stop paths read state | Preserved | Still Valid | IMP-02 | Reuse |
| `autobyteus-web/components/settings/__tests__/DockerNodeStartGuideCard.spec.ts`, `utils/__tests__/dockerNodeLauncherCommands.spec.ts` | Guide card renders commands | AC-005 | Still Valid | IMP-05 | Reuse |
| `scripts/tests/test_server_docker_*`, `test_docker_build_context_sources.py` | other Docker CLI / build context | — | Out Of Scope (no reference to the changed ports; `git grep` for 5908/9228/`AUTOBYTEUS_VNC_PORT` finds nothing outside the changed files) | grep | None |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-002 (static), AC-003, AC-005; REQ-001/002/003/005 | bash launcher with fake Docker; PS static | Reused | IMP-01 | Ran on `2575d870e8`; `71dc90b1f1` changes only ticket files; log has header and `Ran 37 tests` / `OK (skipped=2)` |
| API-02 | Preserved (update/stop) | bash launcher | Reused | IMP-02 | Same commit argument; `Ran 9 tests` / `OK` |
| API-03 | AC-004; REQ-004 | compose config | Reused | IMP-04 | Same commit argument; port entries visible in the file |
| API-04 | AC-005 | Docker Guide copy (en, zh-CN), localization guards | Reused | IMP-05 | Same commit argument; `Tests  7 passed (7)` |
| API-05 | AC-003, AC-006; QR-001 | bash launcher on real Docker, v7 → v8, RFB via `127.0.0.1`, LAN refusal | Reused | IMP-07 | Same commit argument; per-step files with expected lines |
| API-06 | AC-002, AC-003 (PS), AC-005 (PS output/help); REQ-001/002/003 | PowerShell launcher, real pwsh 7 + real Docker engine | Temporary Probe | In a `mcr.microsoft.com/powershell` container: (a) the durable parse test's command on all PS files; (b) base (v7) PS launcher `workspace apply --name abx402-ps-node` on a seeded JSON; (c) v8 PS launcher `workspace apply --name` twice; `urls --name`; `help`; `docker ps` / inspect port bindings; JSON before/after; (d) PS `destroy --name` | No `pwsh` on this Mac, so a durable PS test would skip here. The container gives a real pwsh run against the real engine, which repository tests cannot. |
| API-07 | BEH-005, AC-006, AC-007 (transport), QR-001 | VNC Viewer transport as the app dials it: noVNC `RFB` in Chromium to `ws://localhost:<N>`; Node `ws` to `localhost`; TCP on `127.0.0.1`, `::1`, LAN | Journey | Fresh v8 node `abx402-api-node` via `workspace apply --name`; static page serving the worktree's `@novnc/novnc` opened in a browser tab, `new RFB(div, 'ws://localhost:<N>', {shared:true})`, wait for `connect`, read the framebuffer size; Node probe; `docker ps` | Real-use dial target `localhost` was never exercised (IMP-07 used `127.0.0.1`); the IPv6 listener disappeared with this change |
| API-08 | AC-001 alternate (bind-failure retry), REQ-001 | bash launcher + real Docker bind error on a `127.0.0.1:` mapping | Journey | `docker rm -f abx402-api-node` (own container, state kept); hold `127.0.0.1:<saved N>` with a Python listener; `workspace apply --name abx402-api-node`; expect `Port bind failed; retrying with fresh ports`, new ports, mapping still `127.0.0.1:`; release listener | Real Docker error text for a loopback-qualified mapping must match `is_bind_failure` |
| API-09 | AC-004; REQ-004; QR-001 | `docker-start.sh up` + compose on real Docker | Journey | tag local image as `autobyteus-server:latest-abx402`; `./docker-start.sh up -p abx402-compose -v abx402 --no-build`; `docker ps` ports; `.runtime` env file; TCP on 127.0.0.1 / LAN; `down --volumes --delete-state` | `compose config` proves the file, not Docker's publishing or the script's env file |
| API-10 | Release safety (fresh-start build) | Desktop release job from a fresh clone | Journey | `/tmp/abx402-api/fresh-start.sh`: clone `71dc90b1f1`, hygiene + licensing checks, `pnpm install --frozen-lockfile`, `pnpm build:electron:mac -- --arm64`, Prisma and terminal-runtime verifications | TESTING.md Fresh-start build: changed paths match `scripts/**` and `autobyteus-server-ts/docker/**` |
| API-11 | AC-007, BEH-005, AC-005 (rendered) | Real desktop app (isolated instance of this worktree's build) | Journey | `pnpm --silent isolated-app start --build`; test node via `workspace apply --name abx402-api-node`; over CDP: Nodes → Add node (`http://localhost:<B>`, collaboration off) → Docker Guide `urls` card → open the node window → VNC Viewer tab; read status and canvas; screenshots; stop instance; destroy node | Added after the first confidence pass (94%): the closable gap was AC-007 in the real app (TESTING.md: desktop journeys → isolated desktop instance) |

- Test progress log needed: `Yes`

## Durable Coverage To Add

None. API-06 has no durable form that runs on this Mac (no `pwsh`); the durable parse test and static parity test already exist and would run where `pwsh` is installed. API-07/08/09 need a real Docker engine and image and touch host ports; the repository has no gated real-Docker launcher suite to extend. Adding one would be new test infrastructure outside this ticket's scope.

## Durable Coverage To Update

None. The implementation already updated the launcher tests; API/E2E found each updated assertion valid against the approved behavior (inventory above).

## Durable Coverage To Remove

None (`has_unqualified_port_mapping` was removed by the implementation with no remaining caller; its assertion of unqualified 5900/6080/9223 publishing is obsolete per REQ-001, replaced by `assert_publishes_only_backend_and_loopback_vnc_viewer`).

## Live Environment And Fixture Plan

- Startup order and commands: API-10 runs in the background first (heavy). API-06, then API-07 → API-08 (same test node), then API-09. Docker cases are not timing assertions; container start overlaps the build only where unavoidable.
- Environment choices that materially affect the run: temp `AUTOBYTEUS_DOCKER_STATE_DIR` / `AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR` under `/private/tmp/abx402-api/`; test node names `abx402-api-node`, `abx402-ps-node`; compose project `abx402-compose`; image `autobyteus/autobyteus-server:1.5.11-beta.7`; LAN IP 192.168.2.158.
- Health / readiness checks: launcher `Started …`; `docker ps` status; websockify answers the RFB version.
- Seed data / fixtures: seed state files without ports (as IMP-07).
- Test identities: none; fresh volumes, so CLIs are signed out.
- Requirement-linked journeys: above.
- Evidence to capture: launcher logs, `docker ps` / `docker inspect` port bindings, state files before/after, browser DOM state + screenshot of the noVNC canvas, probe JSON, build log excerpt.
- Owned processes and temporary state to clean up: two test nodes and their volumes, compose project and volumes, image tag `autobyteus-server:latest-abx402`, pulled images `mcr.microsoft.com/powershell:latest` and `docker:cli`, the HTTP server, the browser tab, `/tmp/abx402-api/`.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| PowerShell on Windows (Windows paths, Windows `TcpListener` probe against Windows host ports, Docker Desktop for Windows) | No Windows machine; API-06 runs the same PS code under Linux pwsh 7 against the real engine | Low: the changed lines are platform-neutral array and string values | No | None |
| `new-container` on real Docker | Would mount the user's leftover `autobyteus-server-3-*` volumes (see Discovery) | Low: same `start_node` path, proven with a test name; name/port choice proven with fake Docker | No | None |
| Server Docker image release build | Its steps read none of the changed files (Discovery) | None | No | None |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| REQ-003, REQ-006, AC-003 and the design name an `autobyteus-docker start` command that the launcher does not have; the docs and tests use `upgrade --all` / `workspace apply` | Not a validation failure: wording in the approved documents, with no behavior difference. The approved intent (recreate only at the user's own lifecycle command) is what is validated. | `commands.sh:191`; implementation handoff "Discrepancy" | Solution Designer, to correct the wording (reported in the handoff; not a reroute) |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: the strongest new evidence comes from API-07 and API-11, which test the `localhost` dial target the real VNC Viewer uses (API-11 in the real app), and API-06, which runs PowerShell for real.
