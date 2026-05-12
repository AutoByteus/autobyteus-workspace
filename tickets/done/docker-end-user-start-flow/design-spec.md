# Design Spec

## Current-State Read

The current server Docker startup has two separate user paths:

- Source-checkout path: `autobyteus-server-ts/docker/docker-start.sh` is a capable developer/helper script. It supports lifecycle commands, `--pull-remote`, multiple isolated instances through developer-facing `--project`, collision-safe port selection, and source-tree Compose/build files.
- No-clone path: `README.md` and `autobyteus-server-ts/docker/README.md` show a long direct `docker run` command. This starts the published image, but it is fixed-port, hard to remember, not surfaced in the packaged app, and does not offer the helper script's multi-container ergonomics.

The initial public launcher design added raw GitHub one-shot commands such as `curl -fsSL <raw>/autobyteus-docker.sh | bash -s -- start`. Downstream implementation feedback exposed a UX requirement gap: that command shape is acceptable for a temporary run, but it is not the right repeated-use primary flow because it downloads/evaluates the script every time. The refined user expectation is the familiar install-once model: install the launcher once, then run `autobyteus-docker start`, `autobyteus-docker start --new`, `autobyteus-docker urls`, etc. directly.

The packaged Electron app's Settings → Nodes flow starts only after a server is already reachable. `NodeManager.vue` owns current-node display, remote-node registration, capability probing, optional bootstrap sync, full sync, configured-node management, and remote browser sharing. It has no Docker-start guidance. The node registry stores base URLs and metadata only; it does not and should not own external Docker lifecycle.

The release workflow `.github/workflows/release-server-docker.yml` publishes `autobyteus/autobyteus-server` to Docker Hub. Stable releases publish both a version tag and `latest`; prereleases publish only the prerelease tag. The public launcher can therefore default to Docker Hub `latest` and optionally accept an explicit tag.

## Intended Change

Add a public, source-repo-free Docker launcher boundary, make install-once the primary public UX, and surface that from Settings → Nodes:

1. Add public launcher scripts under `scripts/public/docker/`:
   - `autobyteus-docker.sh` for macOS/Linux.
   - `autobyteus-docker.ps1` for Windows PowerShell.
2. The launchers expose `install`, direct lifecycle commands (`start`, `start --new`, `stop`, `status`, `logs`, `urls`/`ports`), and an update/reinstall path (`install` rerunnable; optional `update` alias).
3. The Settings/docs primary flow is:
   - Step 1: install the launcher once from the public raw script URL.
   - Step 2: run stable direct commands such as `autobyteus-docker start`, `autobyteus-docker start --new`, and `autobyteus-docker urls`.
4. One-shot raw execution (`curl ... | bash -s -- start` / PowerShell equivalent) may remain as a secondary advanced/temporary option, but it must not be the normal repeated-use UI/docs path.
5. The launchers pull `autobyteus/autobyteus-server:latest` by default, create/manage containers with automatic user-facing names and non-conflicting ports, and print backend URLs for app registration.
6. Add a Settings → Nodes "Start Docker node" guide card with copyable install commands and post-install direct commands for macOS/Linux and Windows.
7. The guide tells the user to run the copied command, then paste the printed backend URL into the existing Add Remote Node form.
8. Update docs so the installed public launcher is the recommended no-clone path; keep `docker-start.sh` clearly documented as the source-checkout/developer helper.

## Install-Once Rework Decision (2026-05-12)

The design-impact reroute is accepted. The updated decisions are:

- Primary Settings/docs flow: `install once -> autobyteus-docker ...`.
- Secondary flow: one-shot raw execution can exist only as advanced/temporary guidance, not as the main command list.
- macOS/Linux install destination: `${AUTOBYTEUS_DOCKER_INSTALL_DIR:-$HOME/.local/bin}/autobyteus-docker`; create the directory, write the executable, `chmod +x`, and report the installed path.
- macOS/Linux PATH behavior: no `sudo` requirement and no silent shell-profile edits. If the install directory is not on `PATH`, print exact PATH instructions and a direct-path fallback such as `$HOME/.local/bin/autobyteus-docker start`.
- Windows install destination: `${env:AUTOBYTEUS_DOCKER_INSTALL_DIR}` or `%LOCALAPPDATA%\AutoByteus\bin`; write a PowerShell launcher plus a command shim so `autobyteus-docker ...` can be resolved when the install directory is on User `PATH`.
- Windows PATH behavior: use user-local/no-admin PATH handling. The installer should reconcile or clearly print User PATH instructions; if automatic User PATH update is implemented, it must affect User PATH only, not Machine PATH, and report whether a new shell is needed.
- Update/reinstall scope: in scope through rerunnable `install`; an explicit `update` alias is allowed and should share the same implementation. Docker runtime state, containers, and volumes are not deleted by install/update.
- Launcher update vs server image update: `autobyteus-docker update` updates only the installed launcher script; `autobyteus-docker start` owns Docker image/container refresh for the managed server node. `start` should pull/check the configured image, avoid unnecessary recreation when unchanged, and recreate the managed container when the image changed while preserving named volumes, runtime metadata, friendly identity, and ports where possible.
- Uninstall scope: full uninstall and Docker data cleanup automation are out of scope for this ticket. Help/docs may include manual removal notes.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Feature`
- Current design issue found (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Boundary Or Ownership Issue`
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): `Yes`, bounded extraction/addition of an end-user launcher boundary plus installer semantics inside that boundary.
- Evidence: `docker-start.sh` owns useful lifecycle behavior but depends on source-tree files and exposes developer `--project` vocabulary. NodeManager owns remote-node registration but cannot help users start Docker. Static `docker run` docs are no-clone but not ergonomic. Raw one-shot launcher commands solve discoverability only partially because they are not a stable repeated-use CLI. The update semantics also need to be unambiguous: launcher `update` updates the script, while `start` handles server image/container refresh.
- Design response: create a public launcher subsystem under root `scripts/public/docker/`; give it an install/update boundary; make Settings → Nodes depend on a command composer that points to install and direct commands; keep Docker lifecycle out of node registry and Vue template literals.
- Refactor rationale: without a local launcher installation boundary, the app would either duplicate Docker policy in UI text or normalize repeated `curl | bash` downloads as the everyday control plane.
- Intentional deferrals and residual risk: one-click Docker start from Electron is deferred. Users still run terminal/PowerShell commands and manually add the printed URL. Full uninstall is deferred. PATH availability remains shell/platform-dependent, so the installer must provide explicit feedback/fallback.

## Terminology

- `Public launcher`: repo-hosted script intended to be installed or temporarily executed by packaged-app users without a source checkout.
- `Installed launcher`: local `autobyteus-docker` CLI installed by the public launcher for repeated use.
- `Docker node`: one user-facing server container that can be added as a remote node in AutoByteus.
- `Source helper`: existing developer script under `autobyteus-server-ts/docker/docker-start.sh`.
- `Friendly node name`: user-facing container identity such as `autobyteus-server`, `autobyteus-server-2`; not a Docker Compose project term.
- `One-shot raw execution`: piping/downloading the public script and immediately running a lifecycle command without installing it. This is secondary/advanced only.

## Design Reading Order

1. Follow the data-flow spine from Settings → Nodes install guidance to installed launcher execution and printed URL.
2. Read ownership boundaries: UI command display vs frontend command catalog vs public launcher install/lifecycle vs existing node registration.
3. Read installer/PATH semantics before implementing command catalog text.
4. Read file responsibilities and concrete path mapping.
5. Read migration and validation guidance.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: decommission the long `docker run` command as the primary no-clone recommendation in docs and replace it with the installed public launcher CLI. It may remain only as an advanced low-level Docker fallback, explicitly not as the primary path.
- Required action: do not point packaged-app users to `autobyteus-server-ts/docker/docker-start.sh`.
- Required action: do not expose `--project` / Docker Compose project naming in public app copy.
- Required action: remove/demote repeated `curl | bash ... start` and repeated `irm ...; autobyteus-docker start` as primary Settings/docs examples. They may remain only under advanced/temporary wording.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | Settings → Nodes | Installed launcher ready for direct use | DockerNodeStartGuideCard + DockerLauncherCommandCatalog + public installer | This is the new primary user onboarding path. |
| `DS-002` | `Primary End-to-End` | User terminal/PowerShell direct command | Running Docker container(s) | Installed public Docker launcher | This owns the repeated lifecycle control path. |
| `DS-003` | `Return-Event` | Launcher printed backend URL | Node registry + opened node window | Existing NodeManager/nodeStore flow | This connects the external Docker result back to the app. |
| `DS-004` | `Bounded Local` | Launcher lifecycle command | Docker CLI action + state update/read | Public Docker launcher script | This shapes command parsing, state, port selection, and container discovery. |
| `DS-005` | `Bounded Local` | Launcher install/update command | Local `autobyteus-docker` executable/shim on user PATH or fallback path | Public Docker installer command | This is the added install-once boundary. |

## Primary Execution Spine(s)

`Settings Page -> NodeManager -> DockerNodeStartGuideCard -> DockerLauncherCommandCatalog -> User Clipboard/Terminal -> Public Docker Launcher install -> Installed autobyteus-docker CLI -> autobyteus-docker start/start --new -> Docker image check/pull -> Conditional managed container recreate/start -> Printed Backend URL -> Add Remote Node -> Node Registry`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | User opens Settings → Nodes, sees an install-once guide, copies an OS-specific install command, installs the CLI, then uses direct commands. | NodeManager, guide card, command catalog, installer, installed launcher | NodeManager for UI placement; public launcher for install contract | Localization, clipboard feedback, PATH guidance text |
| `DS-002` | The installed launcher checks/pulls the Docker Hub image, starts the existing managed container when unchanged, recreates the managed container when the image changed, assigns/preserves ports, persists state, and prints URLs. | Installed launcher, state store, Docker CLI, container | Public launcher | Free-port selection, labels, volume naming, image/tag policy |
| `DS-003` | User copies the printed backend URL into the existing Add Remote Node form; existing validation/probe persists the node and opens/focuses a node window. | Add form, host validation, capability probe, nodeStore, Electron node registry | Existing NodeManager/nodeStore boundary | Bootstrap sync, warnings, capability state |
| `DS-004` | For `status`, `logs`, `urls`, and `stop`, the installed launcher reads its state/labels and calls Docker CLI commands without requiring source files. | CLI parser, state reader, Docker CLI adapter | Public launcher | Error formatting, stale state cleanup |
| `DS-005` | For `install` or `update`, the public launcher writes/replaces the local CLI into a user-local bin directory, reports PATH status, and preserves Docker runtime state. | Installer command, install directory, executable/shim, PATH reporter | Public launcher installer | Public script source URL, file permissions, User PATH guidance |

## Spine Actors / Main-Line Nodes

- `NodeManager`
- `DockerNodeStartGuideCard`
- `DockerLauncherCommandCatalog`
- `Public Docker Launcher Installer`
- `Installed Public Docker Launcher`
- `Docker Engine / Docker Hub Image`
- `AutoByteus Server Container`
- `Add Remote Node flow`
- `Node Registry`

## Ownership Map

- `NodeManager`: owns Settings → Nodes composition and continues to own remote-node registration/sync. It is not a Docker lifecycle owner.
- `DockerNodeStartGuideCard`: owns the visual guidance block, copy actions, localized user explanation, and grouping of install/direct commands.
- `DockerLauncherCommandCatalog`: owns construction of public script URLs, install commands, direct commands, and any secondary one-shot commands. It prevents scattered hardcoded raw URLs in Vue templates.
- `Public Docker Launcher Installer`: owns installing/updating the local `autobyteus-docker` executable/shim, install destination selection, and PATH/fallback reporting.
- `Installed Public Docker Launcher`: owns Docker lifecycle commands, automatic naming, port selection, image pulling, container creation/recreation, state persistence, labels, and printed URLs.
- `Docker Engine`: owns container runtime execution.
- `NodeStore/Electron node registry`: owns app-level node metadata only after the user adds a backend URL.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `NodeManager.vue` includes guide card | `DockerNodeStartGuideCard` + `DockerLauncherCommandCatalog` + public launcher | Keeps Settings → Nodes discoverability | Docker lifecycle policy or raw command assembly |
| `DockerNodeStartGuideCard.vue` | `DockerLauncherCommandCatalog` for commands; public launcher for install/lifecycle | UI-only host for copyable commands | URL/tag policy duplication, PATH logic, Docker state |
| Public raw GitHub URL | Public launcher script | Source-repo-free script distribution and installation | App node registry mutation |
| Installed `autobyteus-docker` command | Public launcher implementation | Stable repeated-use CLI | Source-tree Docker Compose project behavior |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Direct `docker run` as primary no-clone docs path | Too long/fixed-port; duplicates lifecycle policy | `scripts/public/docker/autobyteus-docker.*` installed CLI | `In This Change` | Can remain as advanced fallback only. |
| Public guidance that says to use source `docker-start.sh` for no-clone users | Packaged users do not have source files | Settings guide + installed public launcher | `In This Change` | Keep `docker-start.sh` for repo users. |
| Public use of `--project` terminology, or making plain `start` create unlimited duplicate containers | Developer/test vocabulary, not end-user model | `start --new`, friendly names, automatic numbering | `In This Change` | Internal labels/Compose names may exist but are hidden. |
| Repeated raw-download lifecycle commands as primary examples | Re-downloads/evaluates the launcher every time and fails install-once UX | Install command plus direct `autobyteus-docker ...` commands | `In This Change` | Raw one-shot can move to advanced/temporary docs section. |

## Return Or Event Spine(s) (If Applicable)

`Installed Public Docker Launcher -> prints Backend URL -> user enters URL in Add Remote Node -> validateServerHostConfiguration -> probeNodeCapabilities -> nodeStore.addRemoteNode -> Electron node registry -> optional bootstrap sync`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `Public Docker Launcher Installer`
  - `parse install/update -> resolve public source URL/current script -> resolve install dir -> create directory -> write executable/shim -> chmod or shim generation -> check/report PATH -> print next direct commands`
  - Matters because this is where the install-once UX succeeds or fails.
- Parent owner: `Installed Public Docker Launcher`
  - `parse lifecycle command -> load state/discover containers -> choose target node -> pull/check image -> compare current managed container image -> choose/verify ports -> recreate container only when image/config changed or missing -> start container -> persist/discover state -> print URLs`
  - Matters because this is where no-clone multi-node behavior and port collision avoidance live.
- Parent owner: `DockerNodeStartGuideCard`
  - `render command -> copy button -> clipboard.writeText -> copied/error feedback`
  - Matters because copyability is the UI acceptance criterion, but it must stay UI-local.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization | `DS-001` | Guide card | User-facing labels/descriptions | Existing app localization constraints | Hardcoded strings fail guards and make translation inconsistent |
| Clipboard feedback | `DS-001` | Guide card | Copy command + show copied state | User convenience | Pollutes command composer with UI state |
| Public script URL constants | `DS-001`, `DS-005` | Command catalog / installer | Build raw GitHub URLs from one place | Avoid duplicated URLs | Raw URLs scattered in Vue/docs/tests |
| Install directory/PATH reporter | `DS-005` | Public launcher installer | Pick user-local destination, report direct command availability/fallback | Makes install-once practical without admin | UI would need to own shell-specific behavior |
| Docker state directory | `DS-002`, `DS-004` | Installed launcher | Persist node metadata and recover URLs | Enables multiple nodes and rediscovery | App node registry would start owning external runtime |
| Container labels | `DS-002`, `DS-004` | Installed launcher | Discover/clean AutoByteus containers | Handles stale/missing state | Name-only discovery becomes brittle |
| Docs | `DS-001` | Users/maintainers | Explain install-once vs one-shot vs source helper paths | External discoverability | Docs and app diverge |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Settings placement | `NodeManager.vue` Settings → Nodes | `Extend` | Correct user place for remote-node startup guidance | N/A |
| Remote node registration | `nodeStore`, Electron node registry | `Reuse` | Already validates/probes/adds nodes | N/A |
| Source Docker helper | `autobyteus-server-ts/docker/docker-start.sh` | `Do not extend for public users` | Source-tree dependent, developer vocabulary | Public launcher must run without repo checkout |
| Public command construction | None | `Create New` | Needs a frontend-owned command composer | Existing components should not own raw URL/direct command policy |
| Public Docker lifecycle and installer | None | `Create New` | Needs source-repo-free install and lifecycle boundary | Existing helper depends on source files and has developer semantics |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Public launcher scripts | Install/update, Docker lifecycle, image pull, container naming, ports, state, URLs | `DS-002`, `DS-004`, `DS-005` | Public Docker Launcher | `Create New` | Under `scripts/public/docker/`. |
| Settings Nodes UI | Discovery, copy install/direct commands, next-step guidance | `DS-001` | NodeManager | `Extend` | Add child card. |
| Frontend command catalog | OS-specific install command strings, direct command strings, public URLs | `DS-001` | Guide card | `Create New` | Test directly. |
| Existing node registry | Remote node persistence after URL is known | `DS-003` | nodeStore/Electron | `Reuse` | No schema change. |
| Documentation | No-clone/start/install docs | `DS-001` | Users | `Extend` | Installed-launcher-first docs. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.sh` | Public launcher scripts | Bash public launcher | macOS/Linux installer + lifecycle implementation | Shell-specific command implementation | Shared CLI contract documented with PowerShell peer |
| `scripts/public/docker/autobyteus-docker.ps1` | Public launcher scripts | PowerShell public launcher | Windows installer + lifecycle implementation | PowerShell-specific implementation | Shared CLI contract documented with Bash peer |
| `autobyteus-web/utils/dockerNodeLauncherCommands.ts` | Frontend command catalog | Command composer | Public script URLs, install commands, direct commands, secondary one-shot commands if retained | Keeps raw command policy out of UI | Shared command model/types |
| `autobyteus-web/components/settings/DockerNodeStartGuideCard.vue` | Settings Nodes UI | Guide card | Render install-once instructions/copy buttons | Single visual concern | Command catalog |
| `autobyteus-web/components/settings/NodeManager.vue` | Settings Nodes UI | NodeManager | Place guide card above Add Remote Node | Existing section composition owner | Guide card only |
| `README.md` | Documentation | Root docs | Installed-launcher-first no-clone startup | User entry docs | N/A |
| `autobyteus-server-ts/docker/README.md` | Documentation | Server Docker docs | Distinguish installed launcher, one-shot advanced, and source helper | Detailed Docker docs | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Public command variant data (`id`, `platform`, `phase`, `command`, `description`, `isPrimary`) | `autobyteus-web/utils/dockerNodeLauncherCommands.ts` | Frontend command catalog | Guide card and tests need same structure | `Yes` | `Yes` | A general installer registry |
| Launcher CLI command contract | Script help text in both `.sh` and `.ps1` | Public launcher scripts | Both OS scripts must expose same user commands | `Yes` | `Yes` | Hidden divergent platform behavior |
| Install destination defaults | Script constants/help in both launchers | Public launcher scripts | Both platforms need documented user-local install behavior | `Yes` | `Yes` | UI-owned PATH logic |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `DockerLauncherCommand` frontend type | `Yes` | `Yes` | `Low` | Include command phase/primary flag so install vs direct vs advanced one-shot are not inferred from labels. |
| Launcher state file shape | `Yes` | `Yes` | `Medium` | State should store friendly name, container name, ports, image ref, created/updated timestamps; Docker labels remain discovery backup, not a second authoritative state model. |
| Install result reporting | `Yes` | `Yes` | `Low` | Keep as printed script output/help, not a UI data model. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.sh` | Public launcher scripts | Bash public launcher | macOS/Linux no-clone install/update and Docker node lifecycle | Shell-specific public entrypoint | CLI contract |
| `scripts/public/docker/autobyteus-docker.ps1` | Public launcher scripts | PowerShell public launcher | Windows no-clone install/update and Docker node lifecycle | PowerShell-specific public entrypoint | CLI contract |
| `autobyteus-web/utils/dockerNodeLauncherCommands.ts` | Frontend command catalog | Command composer | Builds copyable install/direct/advanced command list and URLs | One source for public script paths/commands | `DockerLauncherCommand` |
| `autobyteus-web/utils/__tests__/dockerNodeLauncherCommands.spec.ts` | Frontend command catalog tests | Command composer tests | Verify URLs/default install/direct/start-new/urls variants | Unit test for command policy | N/A |
| `autobyteus-web/components/settings/DockerNodeStartGuideCard.vue` | Settings Nodes UI | Guide card | Render localized install-once guidance and copy buttons | Keeps NodeManager lean | Command catalog |
| `autobyteus-web/components/settings/__tests__/DockerNodeStartGuideCard.spec.ts` | Settings Nodes UI tests | Guide card test | Verify rendered copyable install/direct commands and copy behavior | Component-specific coverage | N/A |
| `autobyteus-web/components/settings/NodeManager.vue` | Settings Nodes UI | NodeManager | Add guide card to Nodes page | Existing section composition | Guide card |
| `autobyteus-web/localization/messages/en/settings.ts` | Localization | English catalog | New guide card copy | Existing settings catalog | N/A |
| `autobyteus-web/localization/messages/zh-CN/settings.ts` | Localization | Chinese catalog | New guide card copy | Existing settings catalog | N/A |
| `README.md` | Documentation | Root docs | Installed public launcher quick start | Root project entry | N/A |
| `autobyteus-server-ts/docker/README.md` | Documentation | Server Docker docs | Public launcher install/use vs source helper guidance | Detailed Docker guide | N/A |

## Ownership Boundaries

- Settings UI owns discoverability, grouping, next-step explanation, and copy action only.
- Command catalog owns string construction for public install commands, direct commands, and advanced one-shot commands if any are shown.
- Public launcher scripts own install/update and all Docker lifecycle details.
- Node registry owns only registered server base URLs after the user submits them.
- Documentation mirrors the same public launcher boundary and must not reintroduce the source helper or repeated raw script downloads as the packaged-user primary path.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.* install/update` | Script source URL, install dir, executable/shim writing, PATH reporting | Users, docs, Settings command catalog | UI/docs inventing separate installer/PATH rules | Add/adjust launcher install command/help |
| Installed `autobyteus-docker` lifecycle commands | Docker CLI calls, image pull/check, conditional container recreate, state files, labels, naming, ports | Users, docs, Settings command catalog | UI/docs duplicating full `docker run` or image-refresh lifecycle as primary flow | Add launcher command/option |
| `dockerNodeLauncherCommands.ts` | Raw GitHub URLs, install/direct command variants, primary vs advanced grouping | `DockerNodeStartGuideCard` | Vue template hardcoding raw GitHub command strings | Add command variant to catalog |
| `nodeStore.addRemoteNode` | Registry update + Electron IPC/localStorage | Add Remote Node UI | Launcher writing Electron node registry directly | Add an explicit app import flow in a future design |

## Dependency Rules

Allowed:
- `NodeManager.vue` may import `DockerNodeStartGuideCard.vue`.
- `DockerNodeStartGuideCard.vue` may import `dockerNodeLauncherCommands.ts` and localization/composable utilities.
- Docs and command catalog may reference `scripts/public/docker/...` public paths.
- Public launcher scripts may download/copy their public source, write user-local files, call Docker CLI, and use host filesystem state under a user config/state directory.

Forbidden:
- Node registry code must not call Docker CLI.
- Public launcher scripts must not depend on source-tree files such as `autobyteus-server-ts/docker/docker-compose.yml`.
- Settings UI must not hardcode long Docker lifecycle commands or `docker run` as the primary command.
- Settings UI must not make repeated raw script download commands the primary repeated-use path.
- Public UI/help must not expose `--project` or Docker Compose project naming.
- Installer must not require root/admin privileges by default.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `curl -fsSL <raw>/autobyteus-docker.sh | bash -s -- install` | macOS/Linux local launcher installation | Install/update local `autobyteus-docker` | optional env `AUTOBYTEUS_DOCKER_INSTALL_DIR` | Primary macOS/Linux install command. |
| `powershell -NoProfile -ExecutionPolicy Bypass -Command "irm <raw>/autobyteus-docker.ps1 | iex; autobyteus-docker install"` | Windows local launcher installation | Install/update local `autobyteus-docker` wrapper/shim | optional env `AUTOBYTEUS_DOCKER_INSTALL_DIR` | Primary Windows install command; exact function/dispatch shape may be implemented differently only if command catalog/docs stay aligned. |
| `autobyteus-docker install` | Installed launcher update/reinstall | Refresh local launcher | optional install dir env | Must preserve Docker runtime state. |
| `autobyteus-docker update` | Installed launcher script update/reinstall | Alias to install/update behavior for the CLI script only | optional install dir env | Optional but recommended for discoverability; must not update/delete Docker containers or volumes. |
| `autobyteus-docker start` | Default Docker node | Check/pull image, start or conditionally recreate default node; print URLs | none | Creates `autobyteus-server` if missing; if it exists and image is unchanged, start it and print URLs without recreation; if image changed, recreate the managed container while preserving volumes/state/identity and ports where possible. |
| `autobyteus-docker start --new` | Additional Docker node | Create next numbered node with free ports | optional friendly `--name <name>` | `--name` is friendly label, not project. |
| `autobyteus-docker urls` / `ports` | Docker node URLs | Print backend/noVNC/VNC/debug URLs | optional friendly name | Primary app needs backend URL. |
| `autobyteus-docker status` | Docker node status | Show managed containers | optional friendly name/all | User-facing `status`; alias `ps` optional. |
| `autobyteus-docker logs` | Docker node logs | Tail/show logs | optional friendly name | Should pass through to `docker logs`. |
| `autobyteus-docker stop` / `stop --all` | Docker node lifecycle | Stop one/all managed nodes | optional friendly name/all | Should not remove named volumes by default. |
| `buildDockerNodeLauncherCommands()` | UI command list | Return OS/phase/command variants for guide card | no runtime node ID | Version/ref constants centralized. |
| `nodeStore.addRemoteNode(input)` | App node profile | Persist remote server URL | `name`, `baseUrl`, capabilities | Existing boundary; unchanged. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Public `install` | `Yes` | `Yes` | `Low` | Keep install scoped to launcher file/shim/PATH guidance; do not start Docker or modify Docker data. |
| Public `update` | `Yes` | `Yes` | `Low` | Alias to install/update logic for the launcher script only; do not touch Docker runtime state. |
| Public `start` | `Yes` | `Yes` | `Low` | Keep `start` idempotent for the default node; require `--new` for additional nodes; refresh the managed container only when the image/config changed or container is missing. |
| Public `--name` | `Yes` | `Yes` | `Medium` | Define it as friendly label; sanitize internally. |
| Command catalog | `Yes` | `Yes` | `Low` | Keep command variant IDs and phase flags explicit. |
| Add Remote Node | `Yes` | `Yes` | `Low` | Existing `baseUrl` subject remains unchanged. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Installed public command | `autobyteus-docker` | `Yes` | `Low` | Names product + Docker function. |
| Guide card | `DockerNodeStartGuideCard` | `Yes` | `Low` | Names UI concern. |
| Additional node command | `start --new` | `Yes` | `Low` | Avoid `start another` and `--project`. |
| URL command | `urls` | `Yes` | `Low` | Alias `ports` can exist for developer familiarity, but UI should show `urls`. |
| Update command | `update` | `Yes` | `Low` | Optional alias; if omitted, help must state rerun `install` to update. |

## Applied Patterns (If Any)

- `Adapter`: public launcher adapts user-friendly commands into Docker CLI operations.
- `Installer`: public launcher installs/updates a stable local command while keeping Docker runtime state separate.
- `Catalog/Composer`: frontend command catalog turns public script metadata into copyable install/direct command strings.
- `State file + labels`: launcher-owned local state plus Docker labels support recovery and stale-state cleanup.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/` | `Folder` | Public script namespace | User-facing scripts runnable via raw GitHub URLs | Prevents mixing with maintainer automation | Release-only/internal scripts |
| `scripts/public/docker/` | `Folder` | Public Docker launcher namespace | Docker launcher scripts | Future public Docker scripts can grow here | Source checkout build helpers |
| `scripts/public/docker/autobyteus-docker.sh` | `File` | Bash public launcher | macOS/Linux install/update and lifecycle | Public no-clone shell entrypoint | Source-tree assumptions |
| `scripts/public/docker/autobyteus-docker.ps1` | `File` | PowerShell public launcher | Windows install/update and lifecycle | Public no-clone Windows entrypoint | Bash-only assumptions |
| `autobyteus-web/utils/dockerNodeLauncherCommands.ts` | `File` | Frontend command catalog | Command construction | Existing frontend utility area | Clipboard state or Docker execution |
| `autobyteus-web/components/settings/DockerNodeStartGuideCard.vue` | `File` | Settings guide card | Render/copy commands | Settings component namespace | Docker lifecycle or PATH implementation |
| `autobyteus-web/components/settings/NodeManager.vue` | `File` | Settings Nodes composition | Include guide card | Existing owner of Nodes page | Raw launcher command policy |
| `README.md` | `File` | Root documentation | Installed-launcher-first quick start | Primary repo docs | Source-helper-first no-clone guidance |
| `autobyteus-server-ts/docker/README.md` | `File` | Docker documentation | Detail public launcher and developer helper | Existing Docker guide | Confusing project terminology for public path |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `scripts/public/docker/` | `Main-Line Domain-Control` for public launcher scripts | `Yes` | `Low` | Separates public launchers from internal scripts. |
| `autobyteus-web/components/settings/` | `Mixed Justified` settings UI components | `Yes` | `Low` | Existing settings component folder; card is cohesive. |
| `autobyteus-web/utils/` | `Off-Spine Concern` command composer | `Yes` | `Low` | Utility is frontend command construction, not UI rendering. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Primary macOS/Linux install | `curl -fsSL <raw>/autobyteus-docker.sh \| bash -s -- install` | Showing `curl -fsSL <raw>/autobyteus-docker.sh \| bash -s -- start` as the repeated-use main command | User installs once, then stops re-downloading the launcher. |
| Primary Windows install | `powershell -NoProfile -ExecutionPolicy Bypass -Command "irm <raw>/autobyteus-docker.ps1 \| iex; autobyteus-docker install"` | Requiring users to adapt Bash command or paste a long `docker run` | Windows is first-class. |
| Repeated default start | `autobyteus-docker start` | `cd autobyteus-server-ts/docker && ./docker-start.sh up --pull-remote` | User has no source checkout. |
| Additional node command | `autobyteus-docker start --new` | `autobyteus-docker start another`, `--project second-node`, or rerunning plain `start` to create duplicates | User wants another Docker node, not a Compose project. |
| URL rediscovery | `autobyteus-docker urls` | Telling users to inspect `.runtime/<project>.env` | URLs must be rediscoverable without repo internals. |
| UI boundary | Guide card imports command catalog | Template hardcodes raw GitHub URL three times | Central command policy is testable. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Show `docker-start.sh --project` in app | Existing helper works for developers | `Rejected` for public UX | Public launcher uses plain `start` for the default node and `start --new` for additional friendly-named nodes. |
| Keep long `docker run` as primary no-clone command | Already documented | `Rejected` as primary path | Installed-launcher-first docs/UI; direct `docker run` only advanced fallback. |
| Keep `curl | bash -s -- start` as the primary repeated-use command | Initially easy to copy from UI | `Rejected` as primary path after design-impact reroute | Primary UI/docs show install command plus direct `autobyteus-docker ...`; raw run is secondary/advanced only. |
| Make `autobyteus-docker update` update both the launcher and server container | A single word could mean both | `Rejected` as ambiguous | `update` updates the launcher script only; `start` handles Docker image pull/check and conditional server container refresh. |
| Make Electron execute Docker directly | More seamless | `Rejected` for this scope | Copyable launcher command keeps external Docker lifecycle outside app. |
| Have public launcher write Electron node registry | Could skip manual Add Remote Node | `Rejected` for this scope | Existing Add Remote Node remains authoritative app boundary. |
| Full automatic uninstall/Docker data cleanup | Completes installer lifecycle | `Rejected` for this scope | Manual removal notes only; no Docker volume deletion by install/update. |

## Derived Layering (If Useful)

- Presentation: `DockerNodeStartGuideCard.vue`, localization messages.
- Frontend command policy: `dockerNodeLauncherCommands.ts`.
- Public host automation: `scripts/public/docker/autobyteus-docker.*` install/update and lifecycle commands.
- Runtime dependency: Docker Engine + Docker Hub image.
- App registration: existing `NodeManager`/`nodeStore`/Electron registry.

## Migration / Refactor Sequence

1. Update public Bash launcher to support `install`, idempotent reinstall/update, and optional `update` alias.
2. Update public PowerShell launcher to support the same install/update contract and create a direct `autobyteus-docker` command shim/wrapper.
3. Ensure installed launchers preserve existing lifecycle behavior: `start`, `start --new`, `urls`, `status`, `logs`, `stop`, `stop --all`; plain `start` remains idempotent.
4. Add/adjust launcher self-help and install result messages so they report installed path, PATH status/guidance, and avoid source checkout/project terminology.
5. Update `dockerNodeLauncherCommands.ts` with command phases:
   - primary install commands per platform,
   - post-install direct commands (`autobyteus-docker start`, `autobyteus-docker start --new`, `autobyteus-docker urls`),
   - optional advanced one-shot commands labeled secondary/temporary.
6. Update `DockerNodeStartGuideCard.vue` and localization keys to present install-once steps first and direct commands second.
7. Keep the guide card near the top of `NodeManager.vue`, before Add Remote Node.
8. Update command catalog and guide card tests to assert install commands, direct commands, and absence/demotion of raw one-shot commands from the primary set.
9. Update `README.md` and `autobyteus-server-ts/docker/README.md` to make installed launcher CLI the no-clone path and source helper the developer path.
10. Run targeted frontend tests, script static checks, install-command dry-run tests where possible, and Docker smoke validation if Docker is available.

## Key Tradeoffs

- `curl | bash` / downloaded PowerShell commands remain convenient for installing the trusted public launcher, but everyday lifecycle control shifts to direct local commands to avoid repeated downloads.
- Auto-editing shell profiles is convenient but risky. The design requires explicit PATH reporting/fallback; Windows may update User PATH if implemented safely, but no installer should require admin privileges.
- Defaulting to `latest` matches user expectation for released Docker, but an optional tag override remains useful if future app/server compatibility requires pinning.
- Manual Add Remote Node remains one extra step, but it preserves clear ownership and avoids Electron/Docker coupling.
- Plain Docker CLI implementation avoids requiring Compose files from source checkout. It may require more script code for port/state management, but that code belongs in the public launcher boundary.

## Risks

- Windows quoting/execution-policy/User PATH behavior may require iteration.
- Docker may be unavailable in validation environments; use mocked/static tests plus manual or Docker-enabled validation when possible.
- Public raw GitHub URL ref must be chosen carefully. Current tracked default branch is `personal`; if the public default branch changes, update the command catalog constant in one place.
- Port-selection race conditions are possible if a port becomes occupied between selection and `docker run`; launcher should retry with fresh ports on bind failure.
- PATH availability is shell/session dependent; installer output must be clear enough that users can recover with a direct path or PATH command.

## Guidance For Implementation

- Public launcher installation behavior:
  - `install` is the primary bootstrap command for both scripts.
  - Rerunning `install` replaces/refreshes the installed launcher and must not remove Docker containers, volumes, or runtime state.
  - `update` may be implemented as an alias to `install`; if omitted, help must clearly say rerun `install` to update.
  - Implementation should download the latest official script to a temporary file, validate syntax where practical, keep/replace backups where practical, and atomically replace the installed launcher.
  - Launcher install/update must not call Docker, stop containers, remove containers, or delete volumes/state.
  - Bash install default: `${AUTOBYTEUS_DOCKER_INSTALL_DIR:-$HOME/.local/bin}/autobyteus-docker`.
  - PowerShell install default: `${env:AUTOBYTEUS_DOCKER_INSTALL_DIR}` or `$env:LOCALAPPDATA\AutoByteus\bin`; create `autobyteus-docker.ps1` and a shim/command entry usable as `autobyteus-docker ...` when the directory is on PATH.
  - Print installed path, next command examples, and PATH guidance/fallback whenever direct `autobyteus-docker` may not be resolvable.
  - Do not require sudo/admin by default.
- Public launcher lifecycle behavior:
  - Default image: `autobyteus/autobyteus-server:latest`.
  - Optional flags: `--tag <tag>`, `--image <image>`, `--name <friendly-name>` only if needed; do not require names.
  - Default node name: `autobyteus-server`.
  - `start`: idempotently starts/updates the default node and prints URLs; it must not create an extra container when rerun. It checks/pulls the configured image; when the current managed container uses the same image/config, just ensure it is running; when the image changed, stop/remove/recreate the managed container with the same friendly identity, preserve named volumes/runtime state, and retain the previous ports when possible.
  - `start --new`: choose next available name such as `autobyteus-server-2` and create it from the currently pulled configured image.
  - Prefer host ports `8001`, `5908`, `6080`, `9228` for the default node when available; otherwise auto-allocate.
  - For additional nodes, always auto-allocate non-conflicting ports.
  - Persist state outside the source tree, e.g. Bash default `${AUTOBYTEUS_DOCKER_STATE_DIR:-$HOME/.autobyteus/docker-server}` and PowerShell default under `$env:LOCALAPPDATA\AutoByteus\docker-server`, with env override support.
  - Use Docker labels such as `com.autobyteus.launcher=server-docker` and `com.autobyteus.nodeName=<name>` for discovery.
  - Use named volumes per node for workspace, data, and root home; do not remove volumes on normal `stop`, install, or update.
  - Print a concise result block with at least `Backend: http://localhost:<port>` and `noVNC`.
- UI guidance:
  - Use product language: "Install Docker launcher", "Start Docker node", "Start another Docker node", "Show Docker node URLs".
  - Primary commands should be install and direct local CLI commands, not repeated raw script downloads.
  - Do not show `project` or `compose` terminology.
  - Include a short next-step sentence: "After the command prints Backend, paste that URL into Add Remote Node below."
- Tests:
  - Unit-test command catalog URL/path/ref, command phases, install variants, direct variants, and any advanced one-shot variants.
  - Component-test guide card rendering and copy behavior with mocked clipboard.
  - Script checks should verify no source-tree compose file dependency, help output includes install/direct commands, and install/update paths do not touch Docker runtime state.
