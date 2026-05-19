# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

`Design-ready`

## Goal / Problem Statement

Improve the `autobyteus-docker` user experience by adding host bind mounts while leaving the existing Docker named volumes unchanged. Each container should keep private app/server data under `/home/autobyteus/data`, get a simple container-local user workspace at `/home/autobyteus/workspace`, and optionally share collaboration files with other managed containers through `/home/autobyteus/shared`.

## Investigation Findings

- The current public launcher already persists the important container paths in Docker named volumes per launcher node:
  - `<node>-data` mounted at `/home/autobyteus/data`
  - `<node>-root-home` mounted at `/root`
  - `<node>-workspace` mounted at `/app/autobyteus-server-ts/workspace`
- The current public launcher stores only launcher metadata under a host state directory:
  - macOS/Linux default: `$HOME/.autobyteus/docker-server`
  - Windows default: `%LOCALAPPDATA%\AutoByteus\docker-server`
  - override: `AUTOBYTEUS_DOCKER_STATE_DIR`
- Current public launcher container recreation paths remove/recreate containers while keeping named volumes. `destroy --all` removes containers and launcher state files but explicitly keeps named volumes. `reset` keeps volumes too, so "fresh" currently means fresh container/ports/state, not wiped persistent data.
- The source-checkout helper uses Docker Compose with the same three logical named volumes. Source-helper volumes are deleted only when `./docker-start.sh down --volumes` is used.
- The server process is launched with `--data-dir /home/autobyteus/data`. The app data directory owns `.env`, SQLite DB, logs, downloads, memory/run history, media/context files, agents, teams, skills, application packages, and default temp workspace data.
- Default Codex/Claude working directories fall back to `AppConfig.getTempWorkspaceDir()`, which defaults to `<app-data-dir>/temp_workspace`; inside Docker this is `/home/autobyteus/data/temp_workspace`, so it is already persisted by the `<node>-data` volume but not directly visible in a friendly host folder.
- Current launchers do not support user-configured bind mounts or host-backed app-data directories. Users must use manual Docker commands if they want a local folder mounted into the server container.

- User clarification on 2026-05-19 from terminal screenshots and discussion: `/home/autobyteus/data` visibly contains internal server app data (`agents`, `agent-teams`, `application-packages`, `db`, `download`, `extensions`, `external-channel`, `logs`, `mcps.json`, `memory`, `skills`, `temp_workspace`, `workspaces.json`), while `/home/autobyteus/workspace` exists and is empty. The desired model is to leave `/home/autobyteus/data` volumes unchanged, map a node-specific host folder to `/home/autobyteus/workspace`, and map one common host folder to `/home/autobyteus/shared` across all containers.
- Dynamic/hot mount discussion on 2026-05-19: true Docker bind mounts are container-create configuration, so normal support still requires recreation. Linux namespace tricks, mount propagation, FUSE/NFS/SMB/rclone/sync sidecars exist but are not a good cross-platform product default. The chosen design avoids repeated remount needs by adding stable parent bind mounts once; new folders created under those mounted parents appear immediately without Docker recreation.
- Docker semantics matter for UX:
  - named volumes persist outside a container lifecycle;
  - bind mounts expose a host path inside a container and reflect writes back to the host;
  - mounts are part of container creation/run configuration, so adding/removing a mount for an existing launcher-managed container requires container recreation;
  - bind-mounting over a non-empty container directory obscures the image/container's existing contents at that target while mounted.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Feature` / `Behavior Change`
- Initial design issue signal (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Boundary Or Ownership Issue`
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): `Likely Needed`
- Evidence basis: Durable storage exists in launcher scripts but is only implicit in named-volume flags and docs. There is no first-class public launcher boundary for host-visible mounts, storage inspection, or safe recreation after mount config changes.
- Requirement or scope impact: The public launcher should become the authoritative UX boundary for storage/mount policy. UI/docs should surface that policy rather than requiring users to understand raw Docker `run` flags.

## Recommendations

1. Keep all existing Docker named volumes unchanged. The current mounts remain the private per-node server state contract:
   - `<node>-data:/home/autobyteus/data`
   - `<node>-root-home:/root`
   - `<node>-workspace:/app/autobyteus-server-ts/workspace`
2. Add host bind mounts as an additional launcher capability, not as a replacement for named volumes.
3. Use a launcher-managed shared host root for cross-container filesystem UX:
   - macOS/Linux: `$HOME/.autobyteus/docker-server/shared-workspace`
   - Windows: `%LOCALAPPDATA%\AutoByteus\docker-server\shared-workspace`
4. Within that host root, keep node-specific and truly shared folders separate:
   - `shared-workspace/nodes/<node-name>/` is the host-side source for that node's private user workspace.
   - `shared-workspace/shared/` is the host-side source for a collaboration folder visible to every managed container.
5. Inside every container, hide node names from agents and present simple stable paths:
   - `shared-workspace/nodes/<node-name>/` -> `/home/autobyteus/workspace`
   - `shared-workspace/shared/` -> `/home/autobyteus/shared`
6. Set each container's default temp workspace to its simple container-local workspace path:
   - `AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace`
   This makes terminals/default agent runs land in the node-specific host folder without exposing node names inside the container.
7. Add storage/mount inspection commands so users can understand the mapping:
   - `autobyteus-docker storage` prints existing named volumes plus new bind mounts.
   - `autobyteus-docker workspace` or `autobyteus-docker workspace paths` prints the host and container paths for the node workspace and shared folder.
8. Applying this to existing containers requires a one-time safe recreate. The recreate must keep existing named volumes and only add bind mounts/environment variables. After the one-time bind mount enable/apply step, creating new folders under `/home/autobyteus/workspace` or `/home/autobyteus/shared` must not require Docker recreation.
9. Update docs and Settings → Nodes copy to explain the simple mental model: `/home/autobyteus/data` is private server state; `/home/autobyteus/workspace` is this container's user workspace; `/home/autobyteus/shared` is shared across AutoByteus Docker containers.
10. Defer host-backed app-data migration/export. It is not part of this ticket because the user explicitly wants existing volumes unchanged.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium`

Rationale: The change primarily affects public launcher scripts, command catalog/UI copy, docs, and tests. It should not require changing server runtime persistence or node registry schemas. Host-backed app-data migration, if included, would make the scope `Large`; this doc recommends deferring migration/export unless the user explicitly wants it in the first implementation.

## In-Scope Use Cases

- `UC-001`: A user starts AutoByteus through `autobyteus-docker` and can see a clear summary of which data is persisted and where it is mounted inside the container.
- `UC-002`: A user can stop/remove/recreate/upgrade launcher-managed containers without losing app data, run history, generated media, default temp workspace files, or CLI auth state.
- `UC-003`: A user can inspect the Docker named volumes and launcher state for each managed node.
- `UC-004`: A user can configure one or more host-folder bind mounts before or after container creation through the launcher.
- `UC-005`: A user with an existing container can add/change mounts through a safe workflow that recreates the container without deleting named volumes or host folder contents.
- `UC-006`: A user can configure a default host-visible workspace folder so agent-created files land in a local host folder by default.
- `UC-007`: UI/docs explain the distinction between Docker named volumes, host bind mounts, launcher state files, and destructive volume removal.

## Out of Scope

- Changing, renaming, migrating, or removing the existing public launcher Docker named volumes. This ticket is only about adding additional host bind mounts.
- One-click Docker process control from the Electron app.
- Installing Docker Desktop / Docker Engine.
- Full enterprise remote-host mount orchestration.
- Arbitrary hot-mounting into an already-running container without recreation.
- Changing the server app-data model or run-history/memory storage layout.
- Host-backed app-data migration/export.
- Automatically registering mounted folders as application workspaces in every possible runtime profile.

## Functional Requirements

- `REQ-000`: The implementation must leave all existing named-volume mounts unchanged: `<node>-data:/home/autobyteus/data`, `<node>-root-home:/root`, and `<node>-workspace:/app/autobyteus-server-ts/workspace`. New behavior may only add extra host bind mounts and environment configuration.
- `REQ-001`: The launcher must provide a managed shared host root, defaulting to `$HOME/.autobyteus/docker-server/shared-workspace` on macOS/Linux and `%LOCALAPPDATA%\AutoByteus\docker-server\shared-workspace` on Windows, with an override available if needed.
- `REQ-002`: For each managed node, the launcher must create/use a host node workspace folder at `shared-workspace/nodes/<node-name>/` and bind-mount it to `/home/autobyteus/workspace` in that node's container.
- `REQ-003`: The launcher must create/use a host shared collaboration folder at `shared-workspace/shared/` and bind-mount it to `/home/autobyteus/shared` in every managed container that has shared workspace support enabled.
- `REQ-004`: The launcher must set `AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace` for containers using the new workspace bind mount so default terminals and default agent work land in the node-specific host workspace without exposing node names inside the container.
- `REQ-005`: Existing containers must gain the new bind mounts through a safe recreate/apply workflow that preserves all existing named volumes, friendly node identity, image/tag, and ports where possible.
- `REQ-006`: The launcher must include the new bind mount and temp-workspace environment configuration in its config hash so future lifecycle operations consistently preserve/reapply the bind mounts.
- `REQ-007`: The launcher must provide inspection/help output that shows the distinction between private named volumes (`/home/autobyteus/data`, `/root`, legacy workspace volume) and host bind mounts (`/home/autobyteus/workspace`, `/home/autobyteus/shared`).
- `REQ-008`: The launcher and docs must explain that adding bind mounts to an already-created container requires recreation, but the implemented recreate keeps existing named volumes and host folders.
- `REQ-009`: The launcher must avoid exposing node names in the default container workspace path. Node names may appear in host paths and diagnostic output, but inside the container the default path is `/home/autobyteus/workspace`.
- `REQ-010`: Settings → Nodes and Docker docs must explain the final mental model: private app data stays per container at `/home/autobyteus/data`; each container's user workspace is `/home/autobyteus/workspace`; cross-container collaboration files are under `/home/autobyteus/shared`.
- `REQ-011`: Cross-platform launchers must implement equivalent behavior for Bash and PowerShell, including path creation and Docker argument quoting.
- `REQ-012`: Tests must cover command parsing/rendering, config hash changes, fake-Docker recreate-with-bind-mount behavior, and docs/UI command catalog updates.
- `REQ-013`: The implementation must not depend on non-portable dynamic mount techniques such as Linux namespace hot-mount hacks, privileged FUSE/NFS/SMB clients inside the container, or Docker Desktop-incompatible mount propagation for the default product UX.

## Acceptance Criteria

- `AC-001`: Creating a new managed Docker node with shared workspace support keeps the existing named volume mounts and additionally mounts `shared-workspace/nodes/<node-name>/` to `/home/autobyteus/workspace` plus `shared-workspace/shared/` to `/home/autobyteus/shared`.
- `AC-002`: Recreating an existing node to apply shared workspace support does not remove or rename existing Docker named volumes and reports that private app data was kept.
- `AC-003`: Inside every enabled container, `pwd` for the default terminal/default workspace resolves to `/home/autobyteus/workspace`, not `/home/autobyteus/data/temp_workspace`.
- `AC-004`: Node 0 and node 1 both see `/home/autobyteus/workspace`, but their host backing folders are different: `shared-workspace/nodes/autobyteus-server-0/` and `shared-workspace/nodes/autobyteus-server-1/`.
- `AC-005`: Node 0 and node 1 both see the same `/home/autobyteus/shared` contents backed by `shared-workspace/shared/`.
- `AC-006`: A file written by one container to `/home/autobyteus/shared` is visible from another enabled container without any additional Docker recreation.
- `AC-007`: A file written by node 0 to `/home/autobyteus/workspace` appears in the host node-0 folder and does not appear in node 1's `/home/autobyteus/workspace` unless copied through `/home/autobyteus/shared`.
- `AC-008`: Storage/help output clearly labels `/home/autobyteus/data` as private server state and `/home/autobyteus/workspace` / `/home/autobyteus/shared` as host bind-mounted user file areas.
- `AC-009`: Bash and PowerShell launchers pass static syntax checks and fake-Docker lifecycle tests for the shared workspace bind mount behavior.
- `AC-010`: Settings → Nodes and docs describe that existing volumes are unchanged and only additional bind mounts are added.
- `AC-011`: After shared workspace support is enabled, creating a new subfolder under the host `shared-workspace/shared/` or `shared-workspace/nodes/<node-name>/` is visible inside the matching container path without recreating Docker.

## Constraints / Dependencies

- Docker mount definitions are part of container creation/run configuration. Applying changed mounts requires recreating the container.
- Docker named volumes are managed by the Docker engine; their physical host location may be inside Docker Desktop's VM on macOS/Windows and should not be treated as a friendly user file path.
- Bind mounts are host-path dependent and can modify host files from inside the container.
- The server container currently runs as `root`, so Linux bind-mounted output may be created as root-owned files on the host unless the design adds a permission mitigation.
- Docker Desktop file-sharing permissions may be required for host paths on macOS/Windows.
- Existing app-data storage semantics under `/home/autobyteus/data` should remain unchanged.

## Assumptions

- The public `scripts/public/docker/autobyteus-docker.*` launchers are the correct user-facing boundary for storage and mount UX.
- The Settings → Nodes guide card should teach commands but should not own Docker process control.
- For the first implementation, named volumes remain the safest default for app data; bind mounts are added for host-visible user workspaces/output folders.

## Risks / Open Questions

- Whether users expect all app data to be host-visible by default, or only agent work/output folders.
- Whether Linux root-owned bind-mounted files are acceptable or need a `fix-permissions` command or deeper non-root container strategy.
- Whether current command vocabulary (`new-container`, `upgrade --all`, `destroy --all`) should be revisited while adding storage/mount commands.
- Whether host-backed app-data mode should ship now or after storage inspection + workspace bind mounts.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| `REQ-000` | `UC-001`, `UC-002`, `UC-004`, `UC-005`, `UC-006`, `UC-007` |
| `REQ-001` | `UC-004`, `UC-005`, `UC-006`, `UC-007` |
| `REQ-002` | `UC-004`, `UC-005`, `UC-006` |
| `REQ-003` | `UC-004`, `UC-005`, `UC-006` |
| `REQ-004` | `UC-006` |
| `REQ-005` | `UC-002`, `UC-005` |
| `REQ-006` | `UC-002`, `UC-004`, `UC-005` |
| `REQ-007` | `UC-001`, `UC-003`, `UC-007` |
| `REQ-008` | `UC-005`, `UC-007` |
| `REQ-009` | `UC-006`, `UC-007` |
| `REQ-010` | `UC-007` |
| `REQ-011` | `UC-004`, `UC-005`, `UC-006` |
| `REQ-012` | `UC-001` through `UC-007` |
| `REQ-013` | `UC-004`, `UC-005`, `UC-006`, `UC-007` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| `AC-001` | New nodes get additional bind mounts without volume changes. |
| `AC-002` | Existing nodes can adopt the feature safely. |
| `AC-003` | Default agent/terminal work lands in the clean user workspace. |
| `AC-004` | Containers have simple identical internal workspace paths while host paths remain node-organized. |
| `AC-005` | Shared collaboration folder is common across containers. |
| `AC-006` | Cross-container file sharing works after one-time setup. |
| `AC-007` | Per-node workspace isolation still exists for default work. |
| `AC-008` | Users understand private vs shared filesystem areas. |
| `AC-009` | Launcher behavior is executable and cross-platform. |
| `AC-010` | UI/docs align with the clarified scope. |
| `AC-011` | Stable parent bind mounts provide practical dynamic folder visibility without Docker hot-mounting. |

## Approval Status

User asked to proceed with the current ticket on 2026-05-19; requirements treated as design-ready input for architecture review. Recommended first implementation scope: add additional host bind mounts only, keep all existing named volumes unchanged, add a node-specific host workspace mounted as `/home/autobyteus/workspace`, add a common shared host folder mounted as `/home/autobyteus/shared`, and add storage inspection plus safe recreate/apply workflow.
