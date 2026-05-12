# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

`Refined`

## Goal / Problem Statement

Make it easy for packaged Electron app users to start and manage the released AutoByteus server Docker runtime without cloning or downloading the source repository. The primary user experience must be install-once: Settings → Nodes should help the user install a small public launcher one time, then use stable direct commands such as `autobyteus-docker start`, `autobyteus-docker start --new`, and `autobyteus-docker urls` for repeated use.

## Investigation Findings

- The repo already has a maintainer/developer helper at `autobyteus-server-ts/docker/docker-start.sh`.
  - It supports Docker-style `up`, `down`, `ps`, `logs`, and `ports`; the public launcher should expose friendlier aliases such as `start`, `stop`, `status`, `logs`, and `urls`/`ports`.
  - It supports multiple isolated instances via the developer-facing `--project` option and collision-safe port assignment stored in `autobyteus-server-ts/docker/.runtime/<project>.env`; the public launcher should keep the capability but hide this terminology.
  - `up --pull-remote` pulls `autobyteus/autobyteus-server:<tag>`, retags it as the local compose image, and only force-recreates the container when the remote digest changes.
  - It depends on files inside the source tree, especially `autobyteus-server-ts/docker/docker-compose.yml`, `build.sh`, and the monorepo Dockerfile.
- The root `README.md` and `autobyteus-server-ts/docker/README.md` already document direct `docker run` for users without a clone, but that command is long, fixed-port, and does not provide the script's multi-instance/collision-safe behavior.
- The current source helper is not usable by packaged-app users unless they know the repo and download source files. This is the core UX/distribution gap.
- The server Docker image is published by `.github/workflows/release-server-docker.yml` to Docker Hub as `autobyteus/autobyteus-server:<release-version>` and `autobyteus/autobyteus-server:latest` for stable releases; prereleases publish only the version tag.
- The Settings page already has a Nodes section implemented by `autobyteus-web/components/settings/NodeManager.vue`.
  - It is responsible for adding remote nodes, probing capabilities, bootstrapping sync, running full sync, listing configured nodes, and remote browser sharing controls.
  - It is the correct user-facing place to teach users how to install and use the Docker launcher before they add the running server as a remote node.
- Node registry records only the server base URL and metadata; the app currently does not own external Docker lifecycle management.
- The application already has localization boundaries and generated/static message catalogs. Any UI copy added under Settings/Nodes must use the existing localization mechanism rather than hardcoded user-facing text.
- Downstream implementation/review exposed a requirement gap on 2026-05-12: showing `curl ... | bash -s -- start` as the repeated-use primary command downloads the launcher every time. The refined requirement is install-once plus direct local CLI commands as the primary Settings/docs flow. One-shot raw execution can remain only as an advanced/temporary option.
- User clarification on 2026-05-12 separated two update concepts: `autobyteus-docker update` updates the installed launcher script itself, while `autobyteus-docker start` owns server Docker image/container refresh. `start` should check/pull the configured image, avoid recreation when unchanged, and recreate the managed container when the image changed while preserving user data/volumes and user-facing node identity.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Feature`
- Initial design issue signal (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Boundary Or Ownership Issue`
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): `Likely Needed`
- Evidence basis: The Docker lifecycle policy needed by users is trapped inside a source-tree helper that packages do not ship or surface. The first public command design solved source checkout dependence but still made normal repeated use depend on re-downloading the launcher. The app only owns remote node registration after a server already exists.
- Requirement or scope impact: The target must add a source-repo-free end-user launcher boundary with a local installation contract. Settings/docs should be an instruction/copy surface for install and direct CLI use, not an unowned duplicate of Docker lifecycle policy.

## Recommendations

- Create a standalone end-user Docker launcher script pair for macOS/Linux shell and Windows PowerShell under `scripts/public/docker/`.
  - The launcher must run without a source checkout.
  - It must support `install` so users can install a local `autobyteus-docker` CLI once.
  - After installation, repeated-use examples should use direct commands: `autobyteus-docker start`, `autobyteus-docker start --new`, `autobyteus-docker urls`, `autobyteus-docker status`, `autobyteus-docker logs`, and `autobyteus-docker stop`.
  - It should generate/manage per-user runtime state outside the repo, pull the released Docker Hub image, start/stop/status/log/list/print-URLs, and support multiple user-facing nodes/containers with automatic naming and ports.
- Surface install-once guidance in Settings → Nodes through a dedicated "Start Docker node" guidance card.
  - Primary commands should be: install launcher once, then direct local CLI commands.
  - `start --new` remains the public command to create another isolated node; `start another` and developer `--project` terminology should not be used.
  - One-shot raw execution (`curl ... | bash -s -- start` or the PowerShell equivalent) may remain in docs or a collapsed advanced/temporary section, but not as the primary repeated-use path.
  - The UI should tell users to paste the printed backend URL into the existing Add Remote Node form.
- Install destination/PATH policy:
  - macOS/Linux: install `autobyteus-docker` into `${AUTOBYTEUS_DOCKER_INSTALL_DIR:-$HOME/.local/bin}` by default, mark it executable, and print the installed path. If that directory is not on `PATH`, print exact shell instructions and a direct-path fallback such as `~/.local/bin/autobyteus-docker start`; do not require `sudo`.
  - Windows: install under `${env:AUTOBYTEUS_DOCKER_INSTALL_DIR}` or `%LOCALAPPDATA%\AutoByteus\bin` by default, write a PowerShell launcher plus a command shim so `autobyteus-docker ...` works when the install directory is on User `PATH`, and print/reconcile User PATH instructions without requiring admin privileges.
- Keep `install` idempotent and safe to rerun as reinstall/update. An explicit `update` command can be an alias to the same install/update behavior. Full uninstall and Docker data cleanup are out of scope for this ticket beyond concise manual removal guidance in docs/help.
- Keep `autobyteus-server-ts/docker/docker-start.sh` as the repo/developer helper. Do not force packaged users through it.
- Update README/server Docker docs so the installed launcher CLI is the primary no-clone path; keep raw `docker run` and one-shot raw launcher execution only as advanced/manual fallback paths if retained.
- Prefer tag-aware script/image commands for packaged releases when the app version is available; allow a clear `latest` fallback for non-packaged/dev builds.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium`

Rationale: The change crosses Docker distribution scripts, documentation, and Electron Settings/Nodes UI. The refined install-once requirement adds installer/PATH semantics but still does not require server runtime behavior changes or node-registry schema changes.

## In-Scope Use Cases

- `UC-001`: A packaged Electron app user opens Settings → Nodes and sees a clear "Start Docker node" instruction card before/additional to the Add Remote Node form.
- `UC-002`: A macOS/Linux user can copy an install command from the app, run it in a terminal, and install a local `autobyteus-docker` launcher without cloning the repository.
- `UC-003`: A Windows user can copy a PowerShell install command from the app, run it in PowerShell, and install a local `autobyteus-docker` launcher without cloning the repository.
- `UC-004`: After installation, a user can run `autobyteus-docker start` repeatedly to start/update the default released server Docker node without creating surprise duplicates.
- `UC-005`: A user can start more than one isolated Docker-backed server node with `autobyteus-docker start --new` without manually choosing ports or understanding Docker Compose project names.
- `UC-006`: A user can stop, inspect logs/status, and print ports/URLs for Docker nodes through the same installed launcher entrypoint.
- `UC-007`: A user can update/reinstall the launcher by rerunning the install command or using an explicit update alias if implemented.
- `UC-008`: A maintainer can release the app and server Docker image without manually editing in-app commands for each version.

## Out of Scope

- One-click Docker lifecycle execution from inside Electron.
- Installing Docker Desktop / Docker Engine itself.
- Changing the embedded server startup model.
- Changing the node registry data model.
- Replacing the existing source-tree `docker-start.sh` developer helper.
- Automatic remote-node registration from the external script back into the Electron app.
- Full enterprise fleet orchestration or remote host provisioning.
- Full launcher uninstall and Docker volume/data cleanup automation. Documentation/help may include manual removal notes only.

## Functional Requirements

- `REQ-001`: Provide a standalone macOS/Linux Docker launcher script under a root-level public script folder such as `scripts/public/docker/`, runnable without a source checkout.
  - Expected outcome: a user can fetch/run the public script from a repository URL for installation or temporary execution.
- `REQ-002`: Provide a standalone Windows PowerShell Docker launcher script in the same root-level public script folder, or an equivalent source-repo-free Windows command path.
  - Expected outcome: Windows users have a first-class no-clone install/start path rather than adapting bash instructions.
- `REQ-003`: The launcher must support an `install` command that installs a local `autobyteus-docker` CLI for repeated use.
  - Expected outcome: the primary user flow downloads the script once for installation, then uses direct local commands.
- `REQ-004`: The install behavior must be idempotent and update-safe.
  - Expected outcome: rerunning the install command, or running an explicit `autobyteus-docker update` alias if implemented, refreshes/replaces the installed launcher without corrupting Docker runtime state.
- `REQ-005`: The installed launcher must manage user-facing Docker lifecycle commands for at least `start`, `start --new`, `stop`, `status`, `logs`, and `urls`/`ports`, with Docker-style aliases allowed but not required as the primary UI vocabulary.
  - Expected outcome: users can start, stop, inspect, and rediscover the node URL through one launcher surface without learning Docker Compose project terms. `start` is idempotent for the default node: if it already exists, it starts/updates that node and prints its URLs instead of creating surprise duplicates.
- `REQ-006`: The launcher must support isolated multiple server containers through a user-facing `start --new` flag with automatic naming and port allocation.
  - Expected outcome: users can start the default node with plain `start`, and additional nodes with `start --new`, without passing Docker Compose project names or manually selecting ports; any optional name flag is a friendly display/management label, not a required developer project identifier.
- `REQ-007`: The launcher must default to the released Docker Hub server image using the normal public `latest` tag, while still accepting an optional version/tag override for future compatibility-sensitive cases.
  - Expected outcome: the ordinary user command pulls the latest released server Docker image from Docker Hub; maintainers still have a safe way to pin a tag if app/server compatibility ever requires it.
- `REQ-015`: `autobyteus-docker start` must own Docker image/container refresh for the target managed node.
  - Expected outcome: `start` checks/pulls the configured image, starts the existing node without recreation when the image is unchanged, and stops/removes/recreates the managed container when the image changed while preserving named volumes, runtime state, friendly node identity, and preferred ports where possible.
- `REQ-008`: The launcher must persist only user-machine Docker runtime state outside the source tree, using user-facing node/container identifiers rather than source-repo project identifiers.
  - Expected outcome: no repo checkout path is required; state such as generated env/metadata files lives under a user data/config directory.
- `REQ-009`: The installer must use user-local install destinations and clear PATH behavior.
  - Expected outcome: macOS/Linux defaults to `$HOME/.local/bin` unless `AUTOBYTEUS_DOCKER_INSTALL_DIR` is set; Windows defaults to `%LOCALAPPDATA%\AutoByteus\bin` unless the env override is set; installers report installed path, whether direct `autobyteus-docker` is available, and exact PATH/fallback guidance when needed.
- `REQ-010`: Settings → Nodes must display copyable Docker launcher guidance for macOS/Linux and Windows with install-once as the primary flow.
  - Expected outcome: the app contains discoverable install commands and post-install direct CLI commands, not only external docs or repeated raw download commands.
- `REQ-011`: Settings → Nodes guidance must explain the next app step after Docker startup.
  - Expected outcome: users know to copy the launcher-reported backend/base URL into the Add Remote Node form and can use the existing node probe/bootstrap flow.
- `REQ-012`: UI command text must be constructed from a single frontend-owned command catalog/composer rather than scattered literal duplication in the component template.
  - Expected outcome: public script paths, install/start command policy, image/tag policy, and command variants are maintainable and testable.
- `REQ-013`: Documentation must make the installed launcher CLI the primary published-Docker startup path and distinguish it from source-checkout developer helpers.
  - Expected outcome: README and server Docker docs no longer force users to discover source-tree scripts or repeat raw download commands for normal use.
- `REQ-014`: One-shot raw launcher execution may exist only as a secondary/advanced temporary path.
  - Expected outcome: users who want no local install can still run a one-off command if documented, but primary Settings/docs examples for repeated use remain `install` plus direct `autobyteus-docker ...`.

## Acceptance Criteria

- `AC-001`: A macOS/Linux install command shown in Settings → Nodes installs or updates a local `autobyteus-docker` launcher without requiring a source checkout.
  - Scenario intent: user copies the install command from the app, runs it in terminal, sees the installed path and any needed PATH/direct-path guidance.
- `AC-002`: A Windows install command shown in Settings → Nodes installs or updates a local `autobyteus-docker` launcher without requiring a source checkout.
  - Scenario intent: user copies the install command from the app, runs it in PowerShell, sees the installed path and any needed User PATH/direct-path guidance.
- `AC-003`: After installation, `autobyteus-docker start` starts or updates the default `autobyteus/autobyteus-server` Docker node when Docker is installed.
  - Scenario intent: running the same direct command again is safe, prints the backend URL, and does not create an unintended extra container.
- `AC-004`: The installed launcher supports `start`, `stop`, `status`, `logs`, and `urls`/`ports` without referencing files inside the source repository.
  - Scenario intent: command help and script execution do not require `autobyteus-server-ts/docker/docker-compose.yml` from a checkout, and user-facing help avoids Docker Compose project terminology.
- `AC-005`: Starting the default node and then using `autobyteus-docker start --new` results in separate containers with automatically generated stable names and non-conflicting published ports.
  - Scenario intent: multiple remote nodes are practical for end users without exposing Docker Compose project terminology.
- `AC-006`: The Settings → Nodes card includes copyable commands for installing the launcher once and for post-install direct use: default `start`, `start --new`, and URL rediscovery.
  - Scenario intent: user does not need to memorize or find commands elsewhere, and the repeated-use commands do not redownload the script each time.
- `AC-007`: If one-shot raw execution remains visible anywhere, it is explicitly labeled as advanced/temporary and is not the primary card/docs flow.
  - Scenario intent: the normal user path is not `curl | bash` every time.
- `AC-008`: The Settings → Nodes card explains that the printed backend URL should be added as a remote node using the existing Add Remote Node form.
  - Scenario intent: start-Docker guidance connects to the actual node registration workflow.
- `AC-009`: The app command source is covered by unit tests that verify release/ref URL construction and rendered command text for macOS/Linux and Windows, including install and post-install direct commands.
  - Scenario intent: maintainers can change release/version policy without silently breaking UI commands.
- `AC-010`: Documentation updates in `README.md` and `autobyteus-server-ts/docker/README.md` identify the installed launcher CLI as the recommended no-clone path and keep source checkout helper instructions separate.
  - Scenario intent: external docs and in-app instructions agree.
- `AC-011`: Rerunning the install command or invoking the update alias, if present, replaces/refreshes the installed launcher without deleting managed Docker containers, volumes, or runtime state.
  - Scenario intent: install/update affects the CLI tool only, not user data.
- `AC-012`: When `autobyteus-docker start` detects that the configured Docker image has changed, it refreshes the managed server container and preserves user data/volumes; when the image is unchanged, it does not recreate the container unnecessarily.
  - Scenario intent: server image updates happen through normal start/update behavior, while launcher `update` remains script-only.

## Constraints / Dependencies

- Requires Docker Desktop / Docker Engine with Docker Compose support or plain Docker CLI support on the user's machine.
- Requires internet access to download/install/update the launcher and pull the Docker image.
- Requires the Docker Hub image `autobyteus/autobyteus-server` to remain published by release automation.
- The app's existing NodeManager and node registry should remain the authoritative UI/backend boundary for registering remote nodes.
- User-facing UI strings must pass existing localization guards.
- Public user-facing scripts should live under a dedicated root `scripts` subfolder, not mixed flatly among maintainer/release scripts.
- The solution must not require a source repository clone.
- Installers must not require admin/root privileges by default.

## Assumptions

- The repository-hosted raw script URL is acceptable for the first implementation if commands are tag-pinned or otherwise clearly versioned.
- `autobyteus-web/package.json` version is the packaged app release version and aligns with the Docker image release tag for stable releases.
- Users are comfortable running a terminal/PowerShell command when instructed clearly.
- The first implementation can require users to manually add the printed backend URL as a remote node after startup.
- The first implementation can require users to open a new shell or apply printed PATH guidance if their platform does not already include the user-local install directory on `PATH`.

## Risks / Open Questions

- Exact public hosting URL should be confirmed: raw GitHub URL is simplest for a public open-source repo, while GitHub Release assets are prettier but may require release-workflow changes and race consideration with existing release asset publishers.
- PowerShell execution policy, User PATH behavior, and command shim quoting need careful validation on Windows.
- `curl | bash` convenience has security tradeoffs even when used only for install. The UI/docs should make the public script URL visible and optionally show inspectable download-then-run guidance.
- If the desktop app and server Docker image versions diverge in future releases, tag-pinned commands must be revisited.
- End-to-end validation may require Docker availability in the validation environment; if unavailable, script static checks and targeted mocked tests may need to cover part of the acceptance criteria.
- PATH behavior is inherently platform/shell dependent; acceptance must verify clear feedback/fallback rather than silently assuming all shells can immediately resolve `autobyteus-docker`.
- Docker image refresh must distinguish container replacement from data deletion: managed containers may be recreated for new images, but named volumes/runtime state must be preserved by default.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| `REQ-001` | `UC-002`, `UC-007`, `UC-008` |
| `REQ-002` | `UC-003`, `UC-007`, `UC-008` |
| `REQ-003` | `UC-002`, `UC-003`, `UC-004`, `UC-007` |
| `REQ-004` | `UC-007` |
| `REQ-005` | `UC-004`, `UC-005`, `UC-006` |
| `REQ-006` | `UC-005` |
| `REQ-007` | `UC-004`, `UC-005`, `UC-008` |
| `REQ-015` | `UC-004`, `UC-005`, `UC-006` |
| `REQ-008` | `UC-004`, `UC-005`, `UC-006` |
| `REQ-009` | `UC-002`, `UC-003` |
| `REQ-010` | `UC-001`, `UC-002`, `UC-003`, `UC-004` |
| `REQ-011` | `UC-001`, `UC-004`, `UC-005` |
| `REQ-012` | `UC-008` |
| `REQ-013` | `UC-002`, `UC-003`, `UC-004`, `UC-005`, `UC-006` |
| `REQ-014` | `UC-002`, `UC-003`, `UC-004` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| `AC-001` | macOS/Linux no-clone install path works from app-provided command. |
| `AC-002` | Windows no-clone install path works from app-provided command. |
| `AC-003` | Post-install direct default startup works and is idempotent. |
| `AC-004` | Lifecycle management is available through installed standalone launcher commands. |
| `AC-005` | Multiple isolated Docker nodes can be started without port collisions or user-facing project naming. |
| `AC-006` | UI makes install, default `start`, `start --new`, and rediscovery commands copyable. |
| `AC-007` | Raw one-shot execution is demoted to advanced/temporary if retained. |
| `AC-008` | UI connects Docker startup to existing remote-node registration workflow. |
| `AC-009` | Command generation/rendering is test-covered. |
| `AC-010` | Docs and in-app instructions align. |
| `AC-011` | Install/update affects the CLI tool only and preserves Docker runtime data. |
| `AC-012` | `start` refreshes the server container only when the Docker image changed, preserving volumes/data. |

## Approval Status

`Refined on 2026-05-12 after downstream design-impact clarification: install-once plus direct local CLI commands is the primary public UX; one-shot raw execution is secondary/advanced only. Earlier user-approved decisions remain: public launcher hides developer project naming, plain start is idempotent, and additional nodes use start --new with automatic names/ports. User also clarified that launcher `update` updates the script itself, while `start` checks/pulls and refreshes the Docker server container when the image changed.`
