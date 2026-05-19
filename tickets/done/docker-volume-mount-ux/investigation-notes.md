# Investigation Notes

## Investigation Status

- Bootstrap Status: `Completed`
- Current Status: `Requirements refined to design-ready; design spec in progress`
- Investigation Goal: Determine how the current `autobyteus-docker` launcher/server Docker setup stores data and design a safer, more discoverable persistent-data and user-mount UX.
- Scope Classification (`Small`/`Medium`/`Large`): `Medium`
- Scope Classification Rationale: The request affects public launcher behavior, Docker run/compose semantics, docs, and Settings guidance, but should not require changing application runtime persistence or node registry schemas.
- Scope Summary: Persistent storage and additional host-folder bind mounts for Docker-managed AutoByteus server containers.
- Primary Questions To Resolve:
  - What does current `autobyteus-docker` do for named volumes, bind mounts, runtime metadata, and container recreation?
  - Which app data paths inside the server container must be persisted?
  - Can volumes be stored under an AutoByteus data folder, and should this be bind mounts or Docker named volumes?
  - What UX should users follow to add/change mounts when a container already exists?

## Request Context

User asks whether Docker container volumes can be stored somewhere durable, ideally in the application's data folder, so recreating Docker through `autobyteus-docker` never loses volumes. User also asks whether it can be convenient to add another host mount folder so files persisted by agents inside Docker appear in a user-selected local folder. User asks specifically what happens when Docker is already started and whether mounts can still be added.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/in-progress/docker-volume-mount-ux`
- Current Branch: `codex/docker-volume-mount-ux`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-05-19.
- Task Branch: `codex/docker-volume-mount-ux`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: `None`
- Notes For Downstream Agents: Worktree was created specifically for this task from the latest tracked `origin/personal`.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-19 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git symbolic-ref refs/remotes/origin/HEAD` | Discover initial repo/worktree context | Initial checkout was `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` on branch `personal`, remote default `origin/personal`. | No |
| 2026-05-19 | Command | `git fetch origin --prune` | Refresh tracked remote refs before creating task worktree | Fetch succeeded. | No |
| 2026-05-19 | Command | `git worktree add -b codex/docker-volume-mount-ux /Users/normy/autobyteus_org/autobyteus-workspace-superrepo origin/personal` | Create dedicated task branch/worktree | Worktree created at commit `98cfdc24612a8cce8525e934cfd373589ad51ec4`. | No |
| 2026-05-19 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/SKILL.md` | Follow team solution-designer workflow | Requires bootstrap artifacts, investigation notes, requirements refinement, and design spec after approval. | No |
| 2026-05-19 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Load shared design authority | Use spine/ownership model and authoritative boundary rule. | No |
| 2026-05-19 | Command | `find scripts/public/docker autobyteus-server-ts/docker docker -maxdepth 3 -type f -print` | Locate Docker scripts/docs | Public launcher scripts are in `scripts/public/docker`; source helper and compose files are in `autobyteus-server-ts/docker`. | No |
| 2026-05-19 | Code | `scripts/public/docker/autobyteus-docker.sh` | Inspect public launcher storage/lifecycle behavior | Bash launcher uses state root `$HOME/.autobyteus/docker-server`, named volumes `<node>-workspace`, `<node>-data`, `<node>-root-home`, labels/config hash, and recreate paths that keep named volumes. No bind-mount support. | No |
| 2026-05-19 | Code | `scripts/public/docker/autobyteus-docker.ps1` | Inspect Windows parity | PowerShell launcher uses `%LOCALAPPDATA%\AutoByteus\docker-server`, JSON state, same named-volume mounts, same recreate behavior, no bind-mount support. | No |
| 2026-05-19 | Doc | `README.md` lines 39-119 | Inspect public no-clone Docker docs | Docs say public launcher keeps state outside source checkout, creates indexed containers, and keeps named volumes for upgrade/destroy/stop. Root-home volume is called out for Claude settings/auth. | Update docs if feature proceeds |
| 2026-05-19 | Doc | `autobyteus-server-ts/docker/README.md` lines 20-123 and 317-335 | Inspect server Docker docs | Docs list public launcher state dir, source helper, direct `docker run`, and data/persistence volumes. Persistence docs name three volumes for public launcher and source helper. | Update docs if feature proceeds |
| 2026-05-19 | Code | `autobyteus-server-ts/docker/docker-compose.yml` lines 37-46 | Inspect source-helper volume declarations | Compose mounts named volumes to `/app/autobyteus-server-ts/workspace`, `/home/autobyteus/data`, and `/root`. | No |
| 2026-05-19 | Code | `autobyteus-server-ts/docker/docker-start.sh` | Inspect source helper lifecycle | Compose `down` removes volumes only with `--volumes`; otherwise source-helper volumes survive. Runtime port state is stored under `.runtime/<project>.env`. | No |
| 2026-05-19 | Code | `autobyteus-server-ts/docker/entrypoint.sh`; `supervisor-autobyteus-server.conf`; `Dockerfile.monorepo` | Verify server data-dir startup | Container creates `/home/autobyteus/data/.env`; supervisor starts `node dist/app.js --data-dir /home/autobyteus/data`; Dockerfile sets `AUTOBYTEUS_DATA_DIR=/home/autobyteus/data`. | No |
| 2026-05-19 | Code | `autobyteus-server-ts/src/config/app-config.ts`; `src/app.ts` | Inspect app-data directories | AppConfig stores DB, logs, downloads, memory, skills, temp workspace, agents, teams, media/context/application data under the configured app data dir. CLI `--data-dir` sets that root. | No |
| 2026-05-19 | Code | `autobyteus-server-ts/src/workspaces/workspace-manager.ts`; `codex-workspace-resolver.ts`; `claude-workspace-resolver.ts` | Determine where agent files land by default | Default temp workspace is `AppConfig.getTempWorkspaceDir()`, under `<app-data-dir>/temp_workspace`. Codex/Claude fallback working directory uses that path. | No |
| 2026-05-19 | Doc | `autobyteus-server-ts/docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md`; `docs/modules/agent_memory.md`; `docs/modules/run_history.md` | Confirm persistent data categories | Media lives under `<app-data-dir>/media`; context files are under app data and memory roots; run history/memory artifacts live under `<app-data-dir>/memory`. | No |
| 2026-05-19 | Code | `autobyteus-web/utils/dockerNodeLauncherCommands.ts`; `DockerNodeStartGuideCard.vue` | Inspect current Settings command guidance | UI command catalog exposes install, `new-container`, `upgrade --all`, `destroy --all`, `reset`, `urls`, `status`, `logs`, `stop`. No storage/mount commands. | Update if feature proceeds |
| 2026-05-19 | Web | Docker Docs: `https://docs.docker.com/engine/containers/run/` | Verify Docker storage/mount semantics | Docker docs state named volume data persists after stop/remove and bind mounts share host/container data; mounts are passed to `docker run`. | No |
| 2026-05-19 | Web | Docker Docs: `https://docs.docker.com/engine/storage/bind-mounts/` | Verify bind-mount constraints and risks | Bind mounts are read-write by default, can modify host files, are tied to host path structure, and bind-mounting over existing container data obscures it until recreate without the mount. | No |
| 2026-05-19 | Web | Docker Docs: `https://docs.docker.com/engine/storage/volumes/` | Verify volume lifecycle | Volumes exist outside container lifecycle and persist when a container is removed; volume removal/prune is separate. | No |
| 2026-05-19 | Other | User screenshots and clarification in chat | Validate mount target naming against real terminal view | Screenshots show `/home/autobyteus/data` is the active app data root with internal folders such as `agents`, `agent-teams`, `db`, `logs`, `memory`, `skills`, `temp_workspace`, and `workspaces.json`, while `/home/autobyteus/workspace` exists and is empty. User prefers the workspace folder as the user-visible mount location, with options like `/home/autobyteus/workspace/custom-data` rather than mixing with app data. | Update requirements/design to reserve `/home/autobyteus/data` for app internals and use `/home/autobyteus/workspace` plus `/home/autobyteus/workspace/<alias>` for user bind mounts |
| 2026-05-19 | Other | User clarification in chat about host source path | Refine source/target path mental model | User likes a predictable host source path under `~/.autobyteus/docker-server/storage/autobyteus-server-0/...`. This should be the launcher-managed default source root when users do not choose their own folder, paired with container targets under `/home/autobyteus/workspace` for user files. | Reflect in design: host source root and container target path are distinct concepts |
| 2026-05-19 | Other | User scope clarification in chat | Lock ticket bootstrap scope | User explicitly clarified the suggested design must not change existing Docker named volumes; it should only add additional host bind mounts. | Keep requirements in Draft and stop after bootstrap pending further discussion |
| 2026-05-19 | Other | User design clarification in chat | Refine final target filesystem model | User clarified desired model: existing named volumes stay unchanged; host keeps node-specific folders under a shared workspace root; each container sees its own node folder as `/home/autobyteus/workspace`; all containers also get a common shared folder, without exposing node names to agents inside the container. | Requirements updated; still Draft pending further discussion |
| 2026-05-19 | Other | User proceed instruction in chat | Determine whether to continue beyond bootstrap | User said to work on the current bootstrapped ticket after the shared workspace discussion. Requirements are being treated as design-ready for this workflow pass. | Produce design spec and route to architecture review |
| 2026-05-19 | Other | Dynamic mount discussion in chat | Decide whether to use dynamic mount technology | Dynamic mount options were discussed. Conclusion: normal Docker bind mounts require recreation; non-portable alternatives such as namespace hot-mounts, FUSE/network mounts inside containers, or propagation hacks are not appropriate as default UX. Stable parent bind mounts solve the practical need because new subfolders appear immediately after one-time setup. | Record in requirements/design |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - Public no-clone users: `scripts/public/docker/autobyteus-docker.sh` or `.ps1`, surfaced in README and Settings → Nodes command card.
  - Source checkout users: `autobyteus-server-ts/docker/docker-start.sh` and `docker-compose.yml`.
- Current execution flow:
  - Public launcher install writes a local `autobyteus-docker` command.
  - `autobyteus-docker new-container` chooses the next node name/ports, pulls image, runs `docker run -d`, and mounts three Docker named volumes.
  - `upgrade --all`, image/config changes, and reset/destroy flows remove/recreate containers while keeping named volumes.
  - The server starts with app data at `/home/autobyteus/data`; default agent temp workspace is inside that app data tree.
- Ownership or boundary observations:
  - Public launcher is the correct owner for Docker storage/mount UX because it already owns the `docker run` shape, labels, state, ports, images, and recreation behavior.
  - The server app-data subsystem owns what lives under `/home/autobyteus/data`; it should not need to know whether Docker backs that path with a named volume or host bind mount.
  - Settings → Nodes should remain a guidance/copy surface, not a Docker lifecycle executor.
- Current behavior summary:
  - Data is durable by default but not discoverable enough. Host-visible folder support is missing. Adding mounts requires recreating containers, but the launcher does not currently provide that safe workflow.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Feature` / `Behavior Change`
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Boundary Or Ownership Issue`
- Refactor posture evidence summary: Add a first-class storage/mount capability to the existing public launcher boundary. Do not duplicate Docker mount policy in Vue/docs or change app-data internals.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User request | Users need durable data and host-visible file mounts across container recreation | Public Docker storage/mount UX is incomplete or unclear | Design launcher storage/mount commands |
| `autobyteus-docker.sh/.ps1` | Existing launcher owns `docker run`, named volumes, labels, config hash, state, recreate behavior | Mount support belongs here; config hash should include mount config | Yes, if implementing |
| Server `AppConfig` | App data path is controlled by `--data-dir` and contains DB/logs/memory/media/temp workspace | Persisting `/home/autobyteus/data` is enough for app state; host-visible work can use temp workspace override | Yes, if implementing default workspace bind mount |
| Docker docs | Bind mounts share host/container files but can modify host and require container creation/recreation | UX must not promise hot-mounting; must warn and automate recreate safely | No |
| UI command catalog | Settings shows launcher commands but no storage/mount guidance | Add command catalog entries and copy after launcher support exists | Yes, if implementing |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.sh` | Bash public launcher | Owns install, state dir, Docker image pull, `docker run`, named volumes, container recreation | Extend with storage/mount config and recreate/apply commands |
| `scripts/public/docker/autobyteus-docker.ps1` | Windows public launcher | Windows parity for launcher lifecycle | Must receive equivalent storage/mount behavior |
| `autobyteus-server-ts/docker/docker-start.sh` | Source checkout Docker helper | Compose project lifecycle; removes volumes only with `--volumes` | Developer helper can remain; public UX should focus launcher first |
| `autobyteus-server-ts/docker/docker-compose.yml` | Source-helper compose spec | Defines same three logical named volumes | Docs can use as persistence reference; no public no-clone mount UX here unless source helper also extended |
| `autobyteus-server-ts/docker/entrypoint.sh` | Docker startup bootstrap | Creates data dir and `.env` under `/home/autobyteus/data` | Data volume/bind target is correct app-data root |
| `autobyteus-server-ts/src/config/app-config.ts` | App data/log/db/memory path owner | `getTempWorkspaceDir()` defaults under app data | Default host-visible workspace can be implemented by env `AUTOBYTEUS_TEMP_WORKSPACE_DIR` |
| `autobyteus-server-ts/src/workspaces/workspace-manager.ts` | Workspace lifecycle/lookup | Creates temp workspace from config; explicit workspaces use root paths | User-visible mount command should print container root path for explicit workspace use |
| `autobyteus-web/utils/dockerNodeLauncherCommands.ts` | Frontend command catalog | Centralizes copyable launcher commands | Add storage/mount commands/copy after launcher support |
| `autobyteus-web/components/settings/DockerNodeStartGuideCard.vue` | Settings guide UI | Renders install/direct command cards | Add concise storage/mount guidance when commands exist |
| `README.md`; `autobyteus-server-ts/docker/README.md` | User docs | Document named volumes but not host-visible mount workflow | Update mental model and commands |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-19 | Static trace | Read `run_container()` in `scripts/public/docker/autobyteus-docker.sh` | `docker run` mounts only named volumes, not host bind mounts. | Bind mount UX requires launcher changes. |
| 2026-05-19 | Static trace | Read `start_node()` in Bash/PowerShell launchers | Existing recreation path removes container and reruns with same named volumes when image/config changes. | Safe mount apply can reuse same pattern. |
| 2026-05-19 | Static trace | Read AppConfig and workspace resolvers | Default agent workspace falls under data dir unless explicit workspace root is resolved. | A default workspace bind-mount can be implemented with env config. |

## External / Public Source Findings

- Docker `docker run` docs:
  - Mounts are provided through `docker run --mount`.
  - Volumes persist data even if a container is stopped/removed.
  - Bind mounts reflect file changes between host and container.
- Docker bind mount docs:
  - Bind mounts are read-write by default and can change host files.
  - Bind mounts are tied to host filesystem structure.
  - Bind-mounting over non-empty container paths obscures existing contents.
- Docker volume docs:
  - Volumes live outside container lifecycle and are not removed automatically when a container is removed.
  - Volume removal/prune is separate.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Docker may be needed for future E2E validation; static design investigation did not start Docker.
- Required config, feature flags, env vars, or accounts: None for investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin --prune`; `git worktree add ...`.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. The answer to "will recreation lose data?" is mostly already "no" for launcher-managed data because named volumes are used and ordinary lifecycle commands keep them.
2. The answer to "is data stored in our application data folder?" is nuanced:
   - Inside the container, app data is `/home/autobyteus/data`, and the screenshot confirms it contains internal server folders/files (`db`, `memory`, `logs`, `agents`, `skills`, `workspaces.json`, etc.).
   - On the host, the current backing store is Docker named volumes managed by Docker, not a friendly AutoByteus app-data folder.
   - To make user files host-visible, the launcher should use bind mounts outside the app-data tree, preferably `/home/autobyteus/workspace` for the default workspace and `/home/autobyteus/workspace/<alias>` for extra folders.
3. The simplest first UX improvement is not to migrate internal app data; it is to add a host-visible workspace bind mount for agent outputs and a storage inspection command for confidence.
4. Adding/changing mounts for an already-created container must recreate the container. The launcher already has a safe container recreation pattern that preserves volumes, so the UX can automate it.
5. Bind mounts should not default to critical internal paths because they can obscure existing data and expose host files to writes. The clean default is to reserve `/home/autobyteus/data` for server internals, use `/home/autobyteus/workspace` for the host-visible default workspace, and use `/home/autobyteus/workspace/<alias>` for additional mounted folders.
6. If users want default agent files to appear in the host folder, the launcher can set `AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace`.
7. Final clarified host/container mapping target:
   - Existing named volumes remain unchanged.
   - `$HOME/.autobyteus/docker-server/shared-workspace/nodes/<node-name>/` -> `/home/autobyteus/workspace` for that node only.
   - `$HOME/.autobyteus/docker-server/shared-workspace/shared/` -> `/home/autobyteus/shared` for every enabled node.
   - Set `AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace` so agents see a simple default folder and do not need to know node names.

Recommended managed host source layout is distinct from container targets: node names are host-side organization; inside the container the default workspace path stays simple.

Dynamic mount conclusion: do not depend on hot-add mount mechanisms. Recreate once to attach stable parent bind mounts, then rely on ordinary subfolder creation under the mounted parents for immediate visibility.

## Constraints / Dependencies / Compatibility Facts

- Existing named volumes remain unchanged; new work should only add bind mounts.
- Current public launcher commands are `new-container`, `upgrade --all`, `destroy --all`, `reset`, `urls`, `status`, `logs`, and `stop`; there is no current `start`/`start --new` command in this branch.
- `destroy --all` removes launcher state files but keeps named volumes; recreating the same node names can reuse old volumes.
- Docker named volume physical paths may not be friendly or directly accessible on Docker Desktop because the Docker daemon may run inside a VM.
- Host bind mounts are host-specific and can break if a path is removed or Docker Desktop cannot access it.
- The server currently runs as root in the container; Linux host bind-mounted files written by agents may be root-owned unless mitigated.

## Open Unknowns / Risks

- Whether first implementation should include host-backed app data root or defer it behind explicit export/migration.
- Whether mount command names should be `mount`, `workspace`, `storage`, or another vocabulary aligned with existing `new-container` lifecycle wording.
- Whether Linux file ownership requires a first-class permission-fix command.
- Whether a future cleanup should rename lifecycle commands away from `new-container`/`destroy` to more user-friendly names, or keep current command vocabulary stable.

## Notes For Architect Reviewer

Requirements are design-ready per user proceed instruction. Recommended design spine:

`User command / Settings guide -> Docker launcher shared-workspace enable/apply -> launcher creates host shared root and node/shared subfolders -> safe stop/remove/recreate with preserved named volumes -> Docker container sees /home/autobyteus/workspace and /home/autobyteus/shared -> default terminal/agent workspace resolves to /home/autobyteus/workspace`

Key boundary rule: the public launcher owns Docker storage/mount semantics. The server only consumes configured filesystem paths, and Settings/docs only present launcher-owned commands.
