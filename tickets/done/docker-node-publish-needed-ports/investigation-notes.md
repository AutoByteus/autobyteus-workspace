# Investigation Notes — S0: Docker nodes publish only the ports they need

## Investigation Meta

- Package identifier: `docker-node-publish-needed-ports` (Project Task `autobyteus-402`, slice S0 of autobyteus-394)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-publish-needed-ports`
- Repository mode: `Git`; branch `codex/docker-node-publish-needed-ports`
- Resolved base: `origin/personal` @ `6324fb056da909aeab6b19d74815bcfaddc633a8` (fetched 2026-11-06); no launcher or Docker change between the parent's base `b78fd86fe4` and this base (`git log b78fd86fe4..HEAD -- scripts/public/docker autobyteus-server-ts/docker scripts/tests` is empty)
- Finalization target: `origin` / `personal` (RELEASE.md)
- Bootstrap result: worktree and ticket folder created; blocker: none
- Current solution revision ID: `SR-001`
- Authorities read (2026-11-06, this conversation): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md`, `references/handoff.md`, `references/architecture-design.md`, `references/design-principles.md`, `references/project-documents.md` (updated version), root `DESIGN.md`, `TESTING.md`, `GLOSSARY.md`
- Parent evidence (read-only): `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-desktop-access-through-node-server/tickets/in-progress/remote-desktop-access-through-node-server/investigation-notes.md` (runtime findings: listeners, no VNC password, loopback publishing measured; AF-08 history of the earlier preserved all-interface publishing; AF-09 config-hash recreate; AF-16 every `AUTOBYTEUS_VNC*` use)
- Investigation status: complete

## Initial Request And Clarifications

- Task autobyteus-402 description (read with `get_project_task` 2026-11-06) and the user's words quoted there; parent decisions DEC-005 (refined), DEC-013.

## Relevant Existing Behavior And Supported Product Paths

See requirements-doc.md BEH-001 … BEH-005.

## Relevant Codebase And Technical Facts

| ID | Path | Fact | Implication |
| --- | --- | --- | --- |
| AF-01 | `scripts/public/docker/autobyteus-docker.d/bash/container-config.sh:2-11` (hash text), `:13-50` (`run_container`: `-p "${BACKEND_PORT}:8000" -p "${VNC_PORT}:5900" -p "${NOVNC_PORT}:6080" -p "${DEBUG_PORT}:9223"`, `-e AUTOBYTEUS_VNC_SERVER_HOSTS=localhost:${NOVNC_PORT}`) | Publishing and the config hash text live here | Main bash change |
| AF-02 | `bash/docker-runtime.sh:107-118` (`collect_used_ports` reserves every `*PORT` key in all state files), `:183-197` (`choose_ports_for_node`: preferences 8001/5908/6080/9228 + index), `:249-264` (`print_urls`), `:280-366` (`start_node`: reuse requires all four ports in state; retries reset all four) | Port allocation, printing, start/recreate | Two ports instead of four |
| AF-03 | `bash/core.sh:6` (`CONFIG_HASH_VERSION="v7"`), `:38` (help line), `:114-131` (`load_state` sources the file; `write_state` positional args incl. vnc/debug) | Hash version and state | Bump to `v8`; state without vnc/debug; old files' extra keys are harmless (sourced, unused) |
| AF-04 | `powershell/ContainerConfig.ps1:7-28` (hash lines), `:43-61` (run args); `powershell/DockerRuntime.ps1:115-160` (`Get-UsedPorts`, `Select-Ports`), `:183-190` (urls text), `:213-217` (`Test-StateHasPorts`, `New-NodeState`); `powershell/Core.ps1:7` (`ConfigHashVersion = 'v7'`), `:38` (help), `:131-147` (`Save-NodeState`) | PowerShell parity points | Same change |
| AF-05 | `autobyteus-server-ts/docker/docker-compose.yml:16-24`; `.env.example:7-10`; `docker-start.sh:238-247,277-281` | Compose and dev script publish/allocate 5908/6080/9228 | Same rule |
| AF-06 | Docs: `README.md:144-150,218-226`; `autobyteus-server-ts/README.md:410-417`; `autobyteus-server-ts/docker/README.md:50,262-280,420,676-685`; in-app copy `autobyteus-web/localization/messages/{en,zh-CN}/settings.ts:391` (`DockerNodeStartGuideCard.commands.urls.description`) | Port descriptions | Update text |
| AF-07 | Tests: `scripts/tests/test_public_docker_launcher_shared_workspace.py:245-250` (unqualified mappings for 8000/5900/6080/9223, no `127.0.0.1:`), `:549-623` (friendly ports, retry, busy-port fallback with four probes), `:719` (`v7`), `:811-813` (state keys), `:860-862` (`has_unqualified_port_mapping`); `scripts/tests/test_public_docker_launcher_update.py`, `test_public_docker_launcher_stop.py` (check for port assumptions); `pwsh` not installed on this Mac (`which pwsh` empty) | Tests encode the old shape | Update them to the new shape |
| AF-08 | `autobyteus-server-ts/docker/Dockerfile.monorepo:149` `EXPOSE 8000 5900 6080 9223`; `scripts/tests/test_server_package_release.py:301` edits that line | Metadata only; base image exposes the same | Left for S2 (DEC-S0-4) |

## Runtime, Probe, Or Reproduction Findings

- The parent's isolated probe measured `-p 127.0.0.1:<port>:6080` and the RFB handshake through it on the current image (`autobyteus/autobyteus-server:1.5.11-beta.7`). No new runtime probe was needed for the design.
- `docker ps` (read-only, 2026-11-06): the user's nodes `autobyteus-server-0/1/2` publish 5900/6080/8000/9223 on `0.0.0.0`/`[::]`; they are not touched by this Task.
- Temporary diagnostics: None. Reproduction to start from: the launcher test at `scripts/tests/test_public_docker_launcher_shared_workspace.py:245-250` fails once rewritten to the new expectations.

## Persisted Data And State Facts

- Launcher state: bash `$(state_root)/nodes/<node>.env` (sourced key=value), PowerShell `<node>.json`; written on every lifecycle action; volume: one small file per node.
- Old keys `VNC_PORT`/`DEBUG_PORT` (`vncPort`/`debugPort`) are ignored by the new launcher and dropped at the next write; other nodes' old files keep reserving those numbers until rewritten (harmless).

## Product Design Request Context

Not stated; copy-only change.

## Supplemental Artifact Inventory

| Path | Owner | Purpose | Status |
| --- | --- | --- | --- |
| Parent `probes/rfb-forwarding-probe.mjs` | Solution Designer (autobyteus-394) | RFB handshake for AC-006 | Evidence tool |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution |
| --- | --- | --- | --- |
| RSK-001 | Risk | PowerShell path cannot be executed here | Static tests + review; run with `pwsh` where available |
| RSK-002 | Risk | Users with a VNC app or `chrome://inspect` from another machine lose that access | User decided; documented (REQ-006) |

## Notes For Architecture Design

- Keep one place per launcher that builds the run args and the hash text; bump the hash version once.
