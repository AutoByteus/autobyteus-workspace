# Design Spec

## Current-State Read

The public no-clone Docker launcher is implemented in `scripts/public/docker/autobyteus-docker.sh` and `scripts/public/docker/autobyteus-docker.ps1`. It owns install/update of the local `autobyteus-docker` command, image pull/check, node naming, port allocation, state files, labels/config hash, and `docker run` arguments.

Current public launcher persistence uses Docker named volumes only:

- `<node>-workspace:/app/autobyteus-server-ts/workspace`
- `<node>-data:/home/autobyteus/data`
- `<node>-root-home:/root`

The server starts with `--data-dir /home/autobyteus/data`, and `AppConfig.getTempWorkspaceDir()` defaults to `<app-data-dir>/temp_workspace`, so Docker terminals/default Codex/Claude work currently land under `/home/autobyteus/data/temp_workspace`. User screenshots confirm `/home/autobyteus/data` is the internal app-data root containing `db`, `memory`, `logs`, `agents`, `skills`, `workspaces.json`, and other server-owned state. `/home/autobyteus/workspace` exists in the image and is currently empty.

The current launcher preserves named volumes during normal stop/destroy/reset/upgrade/recreate flows, but it has no first-class host bind mount support. Adding a normal Docker bind mount to an existing container requires container recreation. Non-portable dynamic mount alternatives are intentionally excluded from the target design. The design instead adds stable parent bind mounts once, then new subfolders under those parents become visible immediately without further Docker recreation.

## Intended Change

Add host bind-mount support to the public launcher while leaving all existing named volumes unchanged.

Target filesystem model:

- Private per-node server state remains unchanged:
  - `<node>-data -> /home/autobyteus/data`
  - `<node>-root-home -> /root`
  - `<node>-workspace -> /app/autobyteus-server-ts/workspace`
- New launcher-managed host root:
  - macOS/Linux: `$HOME/.autobyteus/docker-server/shared-workspace`
  - Windows: `%LOCALAPPDATA%\AutoByteus\docker-server\shared-workspace`
  - optional override: `AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR`
- New per-node user workspace bind mount:
  - host `shared-workspace/nodes/<node-name>/`
  - container `/home/autobyteus/workspace`
- New common collaboration bind mount:
  - host `shared-workspace/shared/`
  - container `/home/autobyteus/shared`
- New environment variable in launched containers:
  - `AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace`

Agents and terminals see simple paths inside the container and do not need to know node names. Node names remain host-side organization only.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Feature` / `Behavior Change`
- Current design issue found (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Boundary Or Ownership Issue`
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): `Yes`
- Evidence: The public launcher already owns Docker container creation and persistent named-volume lifecycle, but host-visible workspace policy is missing. Putting mount instructions only in docs/UI would duplicate the launcher's `docker run` policy and leave users with unsafe manual recreation.
- Design response: Extend the public launcher boundary with shared-workspace path derivation, directory creation, bind-mount Docker arguments, config-hash inclusion, storage/path reporting, and safe apply/recreate command behavior. UI/docs only present launcher-owned commands and mental model.
- Refactor rationale: The existing `run_container`/`Start-Node` path is the authoritative place to add mounts. It needs small internal extraction for shared workspace layout and Docker argument construction so Bash and PowerShell stay aligned and config hashing remains complete.
- Intentional deferrals and residual risk, if any: Host-backed app-data migration/export remains out of scope. Linux root-owned bind-mounted files may need a future `fix-permissions` or non-root-container strategy; this ticket should at least document the risk.

## Terminology

- `Named volume`: Docker-managed volume referenced by name, used by current launcher for private app state.
- `Bind mount`: Host directory mounted into the container at a target path.
- `Shared workspace host root`: Launcher-managed host folder containing node-specific and shared collaboration folders.
- `Node workspace`: Host folder under `shared-workspace/nodes/<node-name>/` mounted as `/home/autobyteus/workspace` for one node.
- `Shared collaboration folder`: Host folder under `shared-workspace/shared/` mounted as `/home/autobyteus/shared` for every enabled node.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: No existing named-volume path is removed or migrated. The current named-volume mounts remain first-class active behavior.
- Treat removal as first-class design work: no obsolete files are removed in this ticket. The change is additive at the launcher boundary.
- Decision rule: The design must not add dual/manual docs paths that bypass the launcher for normal use. Raw `docker run -v host:container` examples may remain advanced fallback only, not the primary public flow.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User runs `autobyteus-docker new-container` or recreate/apply command | Managed container starts with named volumes plus shared workspace bind mounts | Public Docker Launcher | Core launch/mount behavior. |
| DS-002 | Primary End-to-End | User inspects storage/workspace paths | User sees named volumes, host paths, and container paths | Public Docker Launcher | Discoverability and trust for persistence. |
| DS-003 | Bounded Local | Launcher computes desired container config | Config hash label/state update | Public Docker Launcher | Ensures future lifecycle operations preserve/reapply bind mounts. |
| DS-004 | Return-Event | Files written in one container/host folder | Files appear under mapped paths in host and/or other containers | Host filesystem through Docker bind mount | Main UX benefit: cross-container shared folder visibility. |

## Primary Execution Spine(s)

`User CLI command -> Public Docker Launcher command parser -> Node state/path resolver -> SharedWorkspaceLayout -> Docker run argument builder -> Docker Engine -> Container with unchanged named volumes + added bind mounts -> Printed URLs/storage paths`

`Settings → Nodes guide -> DockerLauncherCommandCatalog -> User copies launcher command -> Public Docker Launcher -> same launcher-owned spine above`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A user creates or reapplies a node. The launcher resolves the node name and ports, creates host directories under the shared workspace root, includes unchanged named volumes and new bind mounts in the Docker run config, sets `AUTOBYTEUS_TEMP_WORKSPACE_DIR`, and starts/recreates the container. | CLI command, node state, shared workspace layout, Docker run config, container | Public Docker Launcher | Path creation, Docker availability, port reuse, image pull, config hash |
| DS-002 | A user asks where data lives. The launcher reports current private named volumes and new host bind mounts without forcing the user to understand Docker internals. | CLI command, node state, storage summary | Public Docker Launcher | Docker inspect optionality, no-container state, multi-node output |
| DS-003 | The launcher builds a deterministic config hash from image, ports, named-volume names, shared workspace root/targets, and environment. Changed bind mount config triggers safe recreate. | Desired config hash, labels, state file | Public Docker Launcher | Cross-shell hashing parity, path normalization |
| DS-004 | A container writes to `/home/autobyteus/shared`; Docker writes into the host shared folder, and every enabled container sees the same content through its own `/home/autobyteus/shared` bind mount. A container writing to `/home/autobyteus/workspace` writes only to that node's host folder. | Container path, host path, other container path | Docker bind mount / host filesystem | File ownership, host path access, Docker Desktop sharing |

## Spine Actors / Main-Line Nodes

- Public Docker Launcher command parser.
- Launcher node state.
- Shared workspace layout resolver.
- Docker run/config hash builder.
- Docker Engine container creation/recreation.
- Container filesystem paths `/home/autobyteus/workspace` and `/home/autobyteus/shared`.

## Ownership Map

- Public Docker Launcher owns Docker lifecycle policy, persistent node metadata, port selection, image pull/check, labels, config hash, and all Docker run arguments.
- Shared workspace layout resolver owns host path derivation and container target constants for bind mounts.
- Server `AppConfig` owns app-data semantics under `/home/autobyteus/data` and consumes `AUTOBYTEUS_TEMP_WORKSPACE_DIR`; it does not own Docker mount creation.
- Settings UI command catalog owns display/copy of launcher commands only; it must not reimplement Docker run/mount policy.
- Docker Engine owns actual named volume and bind mount mechanics.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `DockerNodeStartGuideCard.vue` | Public Docker Launcher | User-facing copy surface in Settings → Nodes | Docker lifecycle/mount semantics |
| `dockerNodeLauncherCommands.ts` | Public Docker Launcher command contract | Centralizes command strings used by UI | Independent mount policy or hand-written `docker run` |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Any primary docs/UI advice that tells users to manually edit `docker run -v` for normal shared workspace use | Manual bind mounts bypass launcher-managed state/config hash/recreate safety | `scripts/public/docker/autobyteus-docker.*` workspace/storage commands | In This Change | Advanced fallback may remain clearly secondary. |
| Requirement/design language about replacing current volumes or host-backing `/home/autobyteus/data` | User explicitly clarified current volumes must not change | Additive shared workspace bind mounts | In This Change | Host-backed app data remains deferred/out of scope. |

## Return Or Event Spine(s) (If Applicable)

- File visibility return/event spine:
  - `Container A writes /home/autobyteus/shared/file -> Docker bind mount writes host shared-workspace/shared/file -> Container B reads /home/autobyteus/shared/file`.
- Node-private workspace spine:
  - `Container A writes /home/autobyteus/workspace/file -> Docker bind mount writes shared-workspace/nodes/autobyteus-server-0/file -> Container B does not see it at /home/autobyteus/workspace because B's workspace points to shared-workspace/nodes/autobyteus-server-1`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: Public Docker Launcher.
- Chain: `resolve node -> resolve shared workspace root -> mkdir node/shared dirs -> build mount args -> compute config hash -> docker run/start/recreate`.
- Why it matters: bind mount correctness must stay deterministic across `new-container`, `upgrade --all`, `reset`, and any new `workspace apply` command.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Directory creation | DS-001 | Public Docker Launcher | Create host `nodes/<node>` and `shared` directories before `docker run` | Docker bind mount source must exist predictably | Docker run failures or daemon-created root-owned dirs |
| Config hash | DS-001, DS-003 | Public Docker Launcher | Include bind mount targets/root and temp workspace env in desired config | Enables safe recreate when config changes | Containers silently run stale mount config |
| Storage/path reporting | DS-002 | Public Docker Launcher | Explain named volumes vs bind mounts | User trust/debuggability | Users resort to manual Docker internals |
| UI localization | DS-002 | Settings UI | Localized copy for commands and mental model | Existing UI boundary requires localization | Hardcoded strings fail guards |
| File ownership warning | DS-004 | Docs/launcher output | Warn root container may create root-owned files on Linux | Honest UX | Users surprised by host permissions |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Docker lifecycle and run args | Public Docker Launcher scripts | Extend | Already owns `docker run`, volumes, labels, state, recreation | N/A |
| App data semantics | Server `AppConfig` | Reuse | Already consumes `AUTOBYTEUS_TEMP_WORKSPACE_DIR` and owns data dir layout | N/A |
| Settings command display | `DockerNodeStartGuideCard` + command catalog | Extend | Existing copy surface for launcher commands | N/A |
| Generic dynamic mounts | None | Do not create | Non-portable and not needed with stable parent bind mounts | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Public Docker Launcher | Shared workspace layout, bind mounts, config hash, safe recreate/apply, storage reporting | DS-001, DS-002, DS-003 | User CLI | Extend | Bash and PowerShell parity required. |
| Server Runtime Config | `AUTOBYTEUS_TEMP_WORKSPACE_DIR` interpretation | DS-001 | Server runtime | Reuse | No server code change expected unless validation exposes missing env support. |
| Settings Docker Guide | User-facing command copy and explanation | DS-002 | Settings UI | Extend | No Docker execution from UI. |
| Documentation | Durable mental model and examples | DS-002, DS-004 | Users/maintainers | Extend | README and server Docker README. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.sh` | Public Docker Launcher | Bash launcher | Add shared workspace root/layout functions, bind mount args, config hash fields, workspace/storage commands | Shell-specific public entrypoint | Shared CLI contract by convention/docs |
| `scripts/public/docker/autobyteus-docker.ps1` | Public Docker Launcher | PowerShell launcher | Windows parity for the same behavior | Shell-specific public entrypoint | Shared CLI contract by convention/docs |
| `autobyteus-web/utils/dockerNodeLauncherCommands.ts` | Settings Docker Guide | Command catalog | Add copyable storage/workspace commands | Existing centralized command strings | Existing command types |
| `autobyteus-web/components/settings/DockerNodeStartGuideCard.vue` | Settings Docker Guide | Settings component | Display new commands and mental model | Existing guide card | Command catalog |
| `autobyteus-web/localization/messages/*/settings.ts` | Settings UI localization | Message catalogs | Localized strings for shared workspace/storage copy | Existing localization boundary | N/A |
| `README.md` | Docs | Root user docs | Explain shared workspace bind mounts | Existing public Docker docs | N/A |
| `autobyteus-server-ts/docker/README.md` | Docs | Server Docker docs | Detailed persistence/shared workspace docs | Existing server Docker reference | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Shared workspace CLI contract across Bash/PowerShell/UI/docs | None in this ticket; document constants in each script and UI tests | Public Docker Launcher / Settings Guide | Cross-language scripts cannot share source directly; tests/docs enforce parity | Yes | Yes | A hidden third source of truth that scripts do not use |
| Container target constants | Launcher constants per script | Public Docker Launcher | Needed for hash, Docker args, output | Yes | Yes | Scattered literals in multiple functions |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Bash node state env | Yes if it stores node/ports/image/config hash only and derives workspace paths from root+node | Yes | Medium | Prefer deriving shared workspace paths instead of persisting duplicate path fields. If persisting overrides, quote safely. |
| PowerShell node state JSON | Yes | Yes | Low | Add fields only if not derivable; keep path semantics named clearly. |
| UI command catalog command IDs | Yes | Yes | Low | Add IDs for `workspace paths`, `workspace apply --all`, `storage`. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.sh` | Public Docker Launcher | Bash public launcher | Resolve shared workspace root, create host dirs, add `--mount` bind args, set temp workspace env, update config hash/output, add workspace/storage commands | Bash implementation of public CLI | CLI contract mirrored in PS/UI tests |
| `scripts/public/docker/autobyteus-docker.ps1` | Public Docker Launcher | PowerShell public launcher | Same as Bash for Windows | PowerShell implementation of public CLI | CLI contract mirrored in Bash/UI tests |
| `autobyteus-web/utils/dockerNodeLauncherCommands.ts` | Settings Docker Guide | Command catalog | Add direct commands: `autobyteus-docker workspace paths`, `autobyteus-docker workspace apply --all`, `autobyteus-docker storage` | Existing command source for card | Existing command model |
| `autobyteus-web/components/settings/DockerNodeStartGuideCard.vue` | Settings Docker Guide | Settings UI | Display shared workspace/storage guidance and copy buttons | Existing card | Command catalog |
| `autobyteus-web/components/settings/__tests__/DockerNodeStartGuideCard.spec.ts` | Settings tests | Component tests | Verify visible commands/copy mental model | Existing test location | N/A |
| `autobyteus-web/utils/__tests__/dockerNodeLauncherCommands.spec.ts` | Settings tests | Command catalog tests | Verify command text and URL refs | Existing test location | N/A |
| `README.md` | Docs | Root docs | Public quick explanation | Existing root docs | N/A |
| `autobyteus-server-ts/docker/README.md` | Docs | Docker reference | Detailed storage/shared workspace behavior | Existing Docker docs | N/A |

## Ownership Boundaries

The public Docker launcher is the authoritative boundary for Docker storage/mount behavior. Callers above it (Settings/docs/users) must use launcher commands rather than hand-building Docker commands for normal operation.

The server runtime is not responsible for discovering host paths. It only consumes `/home/autobyteus/workspace`, `/home/autobyteus/shared`, and `AUTOBYTEUS_TEMP_WORKSPACE_DIR` after the launcher has mounted/configured them.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `autobyteus-docker` public CLI | Docker `run`, bind mount args, named volumes, config hash, state files, recreate/apply | README, Settings command card, users | UI/docs primary flow with raw `docker run --mount` | Add/adjust launcher command |
| Server `AppConfig` | app data dir, temp workspace dir resolution | Server runtime, workspace manager | Docker launcher writing server internal files directly | Add env/config option if needed |

## Dependency Rules

- Public launcher may call Docker CLI and create host directories under its state/shared workspace roots.
- Public launcher may set `AUTOBYTEUS_TEMP_WORKSPACE_DIR` in the container environment.
- Server runtime may depend on the configured temp workspace path but must not depend on launcher state files or host path layout.
- UI/docs may depend on documented launcher command strings but must not duplicate mount argument construction.
- No default UX may depend on `nsenter`, privileged in-container mount services, FUSE/network mount clients, or Docker Desktop-incompatible mount propagation.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-docker new-container` | Docker node | Create next node with default desired launcher config | optional image/tag | New containers include shared workspace bind mounts. |
| `autobyteus-docker upgrade --all` | Docker nodes | Recreate/update all managed nodes when image/config changes | `--all` | Must preserve existing volumes and reapply bind mounts. |
| `autobyteus-docker workspace paths [--name <node>] [--all]` | Workspace path report | Print host/container path mapping | node name or all | Does not need to recreate. |
| `autobyteus-docker workspace apply [--name <node>] [--all]` | Docker node workspace config | Recreate one/all nodes to apply current shared workspace config | node name or all | May call same start/recreate spine. |
| `autobyteus-docker storage [--name <node>] [--all]` | Storage summary | Print named volumes and bind mounts | node name or all | Should clearly label private vs host-visible. |
| `AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR` | Shared workspace host root | Override launcher-managed host root | absolute host path | Optional advanced override. |
| `AUTOBYTEUS_TEMP_WORKSPACE_DIR` | Server temp workspace | Set default workspace inside container | container path | Set to `/home/autobyteus/workspace`. |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs.
- Split boundaries by subject or require an explicit compound identity shape.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `workspace paths` | Yes | Yes | Low | Use `--name`/`--all`, default current default node. |
| `workspace apply` | Yes | Yes | Medium | Require `--all` for all nodes; default one node only. |
| `storage` | Yes | Yes | Low | Same node selector conventions as status/logs. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Public command | `workspace` | Yes | Low | Use for user-file workspace, not app-data. |
| Public command | `storage` | Yes | Low | Use for inspection, not mutation. |
| Container path | `/home/autobyteus/workspace` | Yes | Low | Default user work. |
| Container path | `/home/autobyteus/shared` | Yes | Low | Cross-node collaboration. |
| Container path | `/home/autobyteus/data` | Yes | Medium | Always label as private app/server data. |

## Applied Patterns (If Any)

- Deterministic layout resolver: a bounded local pattern inside the launcher that derives all host/container paths from shared workspace root + node name + constants.
- Config-hash guard: existing launcher pattern extended to include new bind mount and environment configuration so stale containers are recreated safely.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.sh` | File | Bash public launcher | Bash implementation of shared workspace bind mounts and commands | Existing public CLI | Server app-data internals |
| `scripts/public/docker/autobyteus-docker.ps1` | File | PowerShell public launcher | Windows parity | Existing public CLI | Bash-only assumptions |
| `$HOME/.autobyteus/docker-server/shared-workspace` | Folder | Launcher-managed host storage | Host root for node and shared folders | Under existing launcher data namespace | App DB/memory migration |
| `shared-workspace/nodes/<node-name>` | Folder | Launcher-managed host storage | Host source for one node's `/home/autobyteus/workspace` | Node organization stays host-side | Other nodes' default work |
| `shared-workspace/shared` | Folder | Launcher-managed host storage | Host source for every node's `/home/autobyteus/shared` | Explicit shared collaboration area | Private app state |
| `autobyteus-web/utils/dockerNodeLauncherCommands.ts` | File | Settings command catalog | Copyable commands | Existing command catalog | Raw Docker mount flags |
| `autobyteus-web/components/settings/DockerNodeStartGuideCard.vue` | File | Settings UI | Display launcher guidance | Existing guide card | Docker execution logic |
| `README.md` | File | Docs | Public quick-start update | Existing public docs | Full implementation details |
| `autobyteus-server-ts/docker/README.md` | File | Docs | Detailed Docker persistence/shared workspace docs | Existing Docker docs | UI-only copy |

## Migration / Refactor Sequence

1. Add shared workspace constants/helpers to Bash launcher:
   - `shared_workspace_root()` default/override.
   - node workspace host path and shared host path derivation.
   - `ensure_shared_workspace_dirs(node)`.
   - bind mount Docker argument construction using `--mount type=bind,source=...,target=...`.
2. Add the same concepts to PowerShell launcher with platform-appropriate path handling.
3. Extend desired config hash in both launchers with:
   - config hash version bump,
   - shared workspace root,
   - node workspace target `/home/autobyteus/workspace`,
   - shared target `/home/autobyteus/shared`,
   - `AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace`.
4. Add bind mount args and temp workspace env to `docker run` paths in both launchers, leaving existing named volume args unchanged.
5. Add storage/workspace commands:
   - `workspace paths [--name <node>|--all]`.
   - `workspace apply [--name <node>|--all]`.
   - `storage [--name <node>|--all]`.
6. Update installer/help next-command examples if needed, keeping existing lifecycle commands stable.
7. Update Settings command catalog, component copy, localization, and tests.
8. Update README and server Docker README.
9. Add/extend fake-Docker tests for new bind mount args, config hash, and recreate behavior.

## Compatibility / Transition Plan

- Existing containers are not mutated until the user runs a lifecycle command that recreates them or runs the new `workspace apply` command.
- Existing named volumes stay attached under the same names and targets.
- Existing `/home/autobyteus/data/temp_workspace` content remains preserved in the data named volume but stops being the default temp workspace after the shared workspace config is applied.
- New containers created by the updated launcher use the shared workspace bind mounts by default.

## Testing / Validation Plan

- Static:
  - `bash -n scripts/public/docker/autobyteus-docker.sh`.
  - PowerShell parse check where `pwsh` is available.
- Fake Docker launcher tests:
  - `new-container` emits existing named volumes unchanged plus two bind mounts.
  - `workspace apply --all` recreates managed containers while preserving named volume names.
  - config hash changes from prior version and remains stable across repeated calls.
  - `workspace paths` and `storage` output expected host/container paths.
- Frontend tests:
  - `dockerNodeLauncherCommands.spec.ts` verifies new commands.
  - `DockerNodeStartGuideCard.spec.ts` verifies visible mental model strings and command copy UI.
- Docs verification:
  - grep/check docs include `/home/autobyteus/data`, `/home/autobyteus/workspace`, `/home/autobyteus/shared`, and state that named volumes are unchanged.
- Optional real Docker validation if available:
  - create two nodes, verify node-specific workspace separation and shared folder visibility.

## Rollout / Operational Notes

- The first user-visible upgrade may require users to run `autobyteus-docker workspace apply --all` or another documented lifecycle command to recreate existing containers with the new bind mounts.
- Docker Desktop users may need host file-sharing access to the shared workspace root.
- On Linux, files may be written as root because the current container runs as root. Document this and consider a follow-up permission strategy.

## Risks / Tradeoffs

- Changing the default temp workspace from `/home/autobyteus/data/temp_workspace` to `/home/autobyteus/workspace` is a behavior change. It is intentional for host visibility but should be documented.
- Always adding shared bind mounts by default creates host folders. This is acceptable because they live under the launcher data namespace and do not replace app data.
- The existing named volume `<node>-workspace` at `/app/autobyteus-server-ts/workspace` remains but may be less central. It must stay unchanged for compatibility and because the user explicitly requested no volume changes.

## Open Questions

- Exact public command names may be adjusted during implementation if architecture review prefers `shared-workspace` over `workspace`; the design intent should remain the same.
- Whether `workspace apply --all` should be shown as a primary Settings command or docs-only management command.
- Whether a follow-up should address Linux host file ownership.
