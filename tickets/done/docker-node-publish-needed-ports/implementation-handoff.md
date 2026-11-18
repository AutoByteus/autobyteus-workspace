# Implementation Handoff — S0: Docker nodes publish only the ports they need (autobyteus-402)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review not selected (`task_size = Small`, `architectural_risk = Low`, design-spec.md); route `Architecture Design Complete` → implementation, then direct API/E2E.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-publish-needed-ports/tickets/in-progress/docker-node-publish-needed-ports/requirements-doc.md` (SR-001, Approved)
- Investigation notes: `.../docker-node-publish-needed-ports/investigation-notes.md`
- Solution revision record: `.../docker-node-publish-needed-ports/solution-revision-record.md` (SR-001)
- Design spec (required on every route): `.../docker-node-publish-needed-ports/design-spec.md` (SR-001, Ready)
- Supplemental task artifacts: parent `probes/rfb-forwarding-probe.mjs` (see Known Risks: its `handshake` mode cannot run once 5900 is unpublished; replaced for AC-006 by `evidence/IMP-07-check-published-ports.mjs`)
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: `N/A` (initial)

## Current Implementation Summary

New and recreated Docker nodes publish two host ports: the backend port on all interfaces (unchanged) and the VNC Viewer port on `127.0.0.1` only. The bash and PowerShell launchers no longer allocate, store, publish or print the VNC (5900) or Chrome debug (9223) host ports. `CONFIG_HASH_VERSION` is `v8`, so a v7 node is recreated once at the user's next lifecycle command, keeping its backend and VNC Viewer ports and its named volumes. Compose publishes `127.0.0.1:${AUTOBYTEUS_WEB_VNC_PORT:-6080}:6080`; `.env.example` and `docker-start.sh` drop the two ports. Output, help, docs and the in-app Docker Guide `urls` description (en, zh-CN) name Backend, GraphQL and "VNC Viewer … (this computer only)".

- Implementation cycle: `Initial`
- Implementation revision record: `.../docker-node-publish-needed-ports/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review / code-review / API/E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`
- Commits: implementation `2575d870e8`; handoff documents and evidence in the next commit on `codex/docker-node-publish-needed-ports` (base `origin/personal` @ `6324fb056d`; `origin/personal` has since gained 6 docs-only commits, autobyteus-401, none touching this change's files).

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: the change stayed in the files the design named, each keeping its responsibility; no new owner, contract or persistence format (state files lose two keys; readers tolerate extras). Neither escalation trigger fired: nothing in the product reaches 5900/9223 from outside the node, and the recreate kept the backend port (IMP-07).
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (diff reread against the design's file map and removal plan; bash/PowerShell parity checked line by line; shellcheck count unchanged, IMP-06)
- New design impact or escalation trigger: `None`. One wording discrepancy, below, does not change behavior.

### Discrepancy: the launcher has no `start` command

REQ-003, REQ-006, AC-003, the design (BEH-002, DS-001) and the handoff name `autobyteus-docker start`. No such command exists (`commands.sh:191` lists `new-container|upgrade|destroy|reset|workspace|storage|urls|ports|status|ps|stop|logs|update`; `new-container` refuses `--name`, `commands.sh:227`). The commands that reach an existing node's `start_node` are `upgrade --all` and `workspace apply [--name <node> | --all]`; `reset` destroys and creates afresh. I implemented the approved intent (existing nodes change only at the user's own lifecycle command) and the docs name the real commands: "until you run `autobyteus-docker upgrade --all` (or `autobyteus-docker workspace apply`)". The automated AC-003 case uses `upgrade --all`; the real-node check used `workspace apply --name` (below). The Solution Designer may want to correct the word in requirements/design; no behavior changes.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | 2 host ports; `-p B:8000`, `-p 127.0.0.1:N:6080`; friendly 8001+i / 6080+i | bash `container-config.sh` `run_container` + `desired_config_hash`; `docker-runtime.sh` `choose_ports_for_node`, `start_node` reuse/retry checks, `write_state` calls; `core.sh` `load_state`/`write_state`. PS `ContainerConfig.ps1` `Get-ContainerRunArgs`/`Get-StateConfigHash`; `DockerRuntime.ps1` `Select-Ports`, `Test-StateHasPorts`, `New-NodeState`, `Get-UsedPorts`; `Core.ps1` `Save-NodeState` | Done. IMP-01 (fake Docker), IMP-07 (real) |
| BEH-002 | v7 node recreated once, same backend + VNC Viewer ports, volumes kept | `CONFIG_HASH_VERSION="v8"` (`core.sh:6`), `$Script:ConfigHashVersion = 'v8'` (`Core.ps1:7`); existing `start_node` hash mechanism | Done. IMP-01 `test_upgrade_recreates_a_v7_node_once_with_its_saved_ports_and_volumes`; IMP-07 steps 05–10 |
| BEH-003 | Compose: backend + `127.0.0.1:6080`; no 5900/9223; `docker-start.sh` allocates two | `autobyteus-server-ts/docker/docker-compose.yml`, `.env.example`, `docker-start.sh` | Done. IMP-04 |
| BEH-004 | Output/help/Guide/docs: Backend, GraphQL, "VNC Viewer … (this computer only)" | bash `print_urls`, `usage`; PS `Print-Urls`, `Show-AutoByteusDockerHelp`; `docker-start.sh` endpoints; `autobyteus-web/localization/messages/{en,zh-CN}/settings.ts:391`; `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md` | Done. IMP-01 `test_urls_and_help_…`, IMP-05 |
| BEH-005 | VNC Viewer on `localhost:<port>` unchanged | `-e AUTOBYTEUS_VNC_SERVER_HOSTS=localhost:${NOVNC_PORT}` untouched | Preserved. IMP-07 step 12: RFB handshake on `ws://127.0.0.1:<N>` |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. `AUTOBYTEUS_VNC_SERVER_HOSTS`, `Dockerfile.monorepo` `EXPOSE`, the base image, viewer and server are untouched; nothing was run against `autobyteus-server-0/1/2` (IMP-07-14: still "Up 3 days").

## Key Files Or Areas

- `scripts/public/docker/autobyteus-docker.d/bash/{core.sh,container-config.sh,docker-runtime.sh}`
- `scripts/public/docker/autobyteus-docker.d/powershell/{Core.ps1,ContainerConfig.ps1,DockerRuntime.ps1}`
- `autobyteus-server-ts/docker/{docker-compose.yml,.env.example,docker-start.sh}`
- `scripts/tests/test_public_docker_launcher_shared_workspace.py`
- `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md`
- `autobyteus-web/localization/messages/{en,zh-CN}/settings.ts`

## Important Assumptions

- PowerShell `Get-UsedPorts` now reserves every `*Port` property of each state file, the same rule as bash `collect_used_ports` (`*PORT` keys). Old v7 state files of other nodes keep reserving their VNC/debug numbers until rewritten, as the design decided ("they keep reading whatever `*PORT` values exist"); it is a generic reader, not an old-key branch.
- The variable name `NOVNC_PORT` / `noVncPort` is kept, as the design decided (S1 removes it).

## Known Risks

- PowerShell is checked statically only: `pwsh` is not installed on this Mac, so `test_powershell_launcher_parses_when_pwsh_is_available` skips. The static parity test checks the PS sources for the new mapping, `v8`, and the absence of the removed ports, keys and labels.
- `test_preferred_port_collision_falls_back_for_that_service` skips on this Mac because the user's `autobyteus-server-0` holds host port 8001. The same fallback policy is covered by the controlled-probe case `test_controlled_busy_preferred_port_uses_real_random_fallback` (passes).
- The parent probe's `MODE=handshake` also runs a WS→TCP bridge to `VNC_PORT` (5900). With 5900 unpublished it crashes (unset: `ERR_SOCKET_BAD_PORT`; set to the old mapping: unhandled `ECONNREFUSED 127.0.0.1:52432`). Its direct-websockify handshake is reproduced in `evidence/IMP-07-check-published-ports.mjs`, which also checks TCP reachability.
- By design, the user's existing nodes keep the old publishing until he runs `upgrade --all` or `workspace apply`. These commands enumerate every managed node by Docker label (`managed_node_names`, `docker-runtime.sh:67-85`), so testers must use only `workspace apply --name <test node>` and `destroy --name <test node>`, never `--all`, `new-container` or `reset`, on this Mac.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change (operational security hardening)
- Reviewed root-cause classification: No Design Issue Found
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: every change landed in the single owner the design named per launcher; no new function or file.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. Removed: VNC/debug allocation, preferences 5908/9228, retry resets, reuse checks, hash lines, state keys, output lines, `.env.example`/`docker-start.sh`/compose entries. Shellcheck SC2034 count went from 22 to 20 because the unused `VNC_PORT`/`DEBUG_PORT` resets in `load_state` were removed (IMP-06).
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (state shape lost two fields)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source files stayed within size guardrails: `Yes`. Largest touched: `docker-runtime.sh` 425, `DockerRuntime.ps1` 416 non-empty lines (both shrank); size-guard test passes.
- Notes: the test helper `has_unqualified_port_mapping` was replaced by `published_ports` / `assert_publishes_only_backend_and_loopback_vnc_viewer` (no remaining caller).

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: design-spec.md "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence: a v7 state file (`VNC_PORT`/`DEBUG_PORT` present) is sourced, its backend and VNC Viewer ports reused, and the next write drops the two keys: IMP-07-03 (before) vs IMP-07-08 (after), and the fake-Docker AC-003 case asserts `["BACKEND_PORT", "NOVNC_PORT"]` are the only port keys after the upgrade.
- Migration implementation: `N/A`
- Deviation: `None`

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-web exec nuxt prepare` were run in this worktree for IMP-05 (no lockfile change).
- Real-node check used the already-local image `autobyteus/autobyteus-server:1.5.11-beta.7` (`8bcf8eabfafe`); the launcher's own `docker pull` reached Docker Hub with no change.
- Fresh-start build: `scripts/**` and `autobyteus-server-ts/docker/**` are build inputs (TESTING.md), but no build step, workflow or gate input read by the desktop/server builds changed. Not run here; the delivery engineer confirms whether it applies, as the design says.

## Checks Run

Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-publish-needed-ports/tickets/in-progress/docker-node-publish-needed-ports/evidence/`. Environment for all: macOS 26 arm64, Python 3, `/bin/bash` 3.2, Docker Desktop, Node v22.23.1.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace -v` | 2575d870e8 | fake Docker, temp state/shared dirs | bash launcher (all modules), PS sources (static) | AC-001, AC-002 (static), AC-003, AC-005; BEH-001/002/004 | Pass | `IMP-01-launcher-shared-workspace-tests.log` | `Ran 37 tests` / `OK (skipped=2)`; skips: `pwsh is not installed`, `port 8001 is not available for collision test setup` |
| IMP-02 | `python3 -m unittest scripts.tests.test_public_docker_launcher_update scripts.tests.test_public_docker_launcher_stop -v` | 2575d870e8 | fake Docker | bash `update`, `stop` paths (state reader) | Preserved behavior | Pass | `IMP-02-launcher-update-stop-tests.log` | `Ran 9 tests` / `OK` |
| IMP-03 | Reproduction: the rewritten test file run against the base launcher (`git archive 6324fb056d`) in a temp tree | test at 2575d870e8, launcher at 6324fb056d | fake Docker | base launcher | AC-001, AC-003, AC-005 | Fails as expected | `IMP-03-reproduction-on-base-launcher.log` | `FAILED (failures=7, skipped=2)`, incl. `['8001:8000', '127.0.0.1:6080:6080'] != ['8001:8000', '5908:5900', '6080:6080', '9228:9223']` |
| IMP-04 | `docker compose -f autobyteus-server-ts/docker/docker-compose.yml config`; `bash -n docker-start.sh` | 2575d870e8 | Docker Compose | compose file, dev script | AC-004; BEH-003 | Pass | `IMP-04-compose-config-ports.txt` | two port entries only; second has `host_ip: 127.0.0.1`, `target: 6080` |
| IMP-05 | `pnpm -C autobyteus-web exec vitest run components/settings/__tests__/DockerNodeStartGuideCard.spec.ts utils/__tests__/dockerNodeLauncherCommands.spec.ts`; `guard:localization-boundary`; `audit:localization-literals` | 2575d870e8 | Node 22, happy-dom | Docker Guide card + localization (en, zh-CN) | AC-005 | Pass | `IMP-05-web-docker-guide-specs-and-guards.log` | `Tests  7 passed (7)`; `[guard:localization-boundary] Passed.`; `audit:localization-literals exit=0` |
| IMP-06 | `shellcheck -s bash -S warning` on the bash modules + `docker-start.sh`, this commit vs base | 2575d870e8 vs 6324fb056d | shellcheck (Homebrew) | bash sources | Self-review | Pass (no new findings) | `IMP-06-shellcheck-base-vs-changed.txt` | `changed: 13 findings` / `base:    13 findings`; SC2034 `22` → `20` |
| IMP-07 | Real isolated node `abx402-port-check` (temp `AUTOBYTEUS_DOCKER_STATE_DIR`/`…_SHARED_WORKSPACE_DIR`): seed state; base v7 launcher `workspace apply --name` creates it; data-volume marker; worktree v8 launcher `workspace apply --name` twice; `urls --name`; RFB handshake + TCP reachability on 127.0.0.1 and LAN IP 192.168.2.158; `destroy --name` + `docker volume rm` of its five volumes | 2575d870e8 | Docker Desktop, image `1.5.11-beta.7` | both launchers' bash path end to end; real Docker publishing | AC-003, AC-006, AC-007 (transport); QR-001; BEH-001/002/005 | Pass | `IMP-07-01…14-*`, `IMP-07-check-published-ports.mjs` | 02: four `0.0.0.0` mappings (v7); 05: `Launcher config changed for abx402-port-check`; 06: `127.0.0.1:52433->6080/tcp, 0.0.0.0:52431->8000/tcp, [::]:52431->8000/tcp`; 08: only `BACKEND_PORT=52431`, `NOVNC_PORT=52433`; 09: `abx402-volume-marker`; 10: `already running with the current image and launcher config` and same container id `f95f5ed395b5` (04); 12: `"serverVersion": "RFB 003.008"`, `"width": 1920`, LAN `vncViewer … "ECONNREFUSED"`, LAN `backend … "connected"`, old 5900/9223 ports `ECONNREFUSED` on both hosts; 14: `no test container`, `no test volumes`, user nodes `Up 3 days` |

- Not run, and why:
  - PowerShell execution (`pwsh` not installed); a `pwsh` run of the launcher where available is left to API/E2E or the user.
  - Desktop app VNC Viewer against the test node (AC-007 optional); the RFB handshake through the loopback port is the transport proof.
  - Fresh-start build (see Environment notes).
  - A real `new-container` / `upgrade --all` on this Mac: they enumerate the user's managed nodes by label (Known Risks). Covered by fake-Docker IMP-01.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Settings → Docker Guide card, `urls` command description (copy only, en and zh-CN).
- Approved references: requirements-doc.md "UI, Interaction, And Experience Requirements" (copy only; product design N/A).
- Design system / adjacent surfaces reviewed: `DockerNodeStartGuideCard.vue` renders each description as `<p class="mt-1 text-xs leading-5 text-slate-500">` in a wrapping grid card; sibling descriptions are up to 280 characters, the new one is about 106.
- Rendered surface used: component specs (IMP-05) mount the card and render the command list; no dev server or browser was started.
- States inspected: none visually. The change is a string value in an already wrapping paragraph, with no layout, state or interaction change.
- Issues found and corrected: none.
- Limitation: not visually inspected in a browser or the desktop app.

## Downstream Coverage Hints / Suggested Scenarios

- `pwsh` run (if a machine has it): `test_powershell_launcher_parses_when_pwsh_is_available`, plus a fake-Docker PowerShell `workspace apply --name` on a v7 JSON state (with `vncPort`/`debugPort`) to confirm the new run args and the rewritten JSON.
- Compose path end to end: `docker-start.sh up -p <test project> --no-build` with a test project name and an existing local image tag, then `docker ps` port check and `down --volumes --delete-state`.
- Bind-failure retry on a real node: hold the VNC Viewer port on `127.0.0.1` before `workspace apply --name` of a test node, then check both new ports differ and the mapping keeps `127.0.0.1`.
- Optional AC-007: isolated desktop instance adding the test node and opening its VNC Viewer.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Independent executable validation of AC-001…AC-007 and QR-001 per TESTING.md (Docker server nodes rules): test-owned container, temp state, single-node commands only, `docker rm -f -v` / volume removal afterwards.
- Classification of the PowerShell gap and of AC-007 (optional) in the validation report.
