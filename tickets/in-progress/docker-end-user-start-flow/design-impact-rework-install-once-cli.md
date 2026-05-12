# Design Impact Rework: Install-Once Docker Launcher CLI

## Date

2026-05-12

## Trigger

`implementation_engineer` rerouted the ticket after user clarification that the approved primary commands were still awkward for repeated use. The current approved examples used one-shot raw execution:

- `curl -fsSL <raw>/autobyteus-docker.sh | bash -s -- start`
- `curl -fsSL <raw>/autobyteus-docker.sh | bash -s -- start --new`
- PowerShell equivalents that download/evaluate the script for each lifecycle command.

The user expectation is closer to installer-based tooling: install or download the launcher once, then run stable direct commands:

- `autobyteus-docker start`
- `autobyteus-docker start --new`
- `autobyteus-docker urls`
- `autobyteus-docker status`
- `autobyteus-docker logs`
- `autobyteus-docker stop`

## Classification

- Re-entry type: `Design Impact` + `Requirement Gap`
- Reason: The primary public UX changes from repeated one-shot raw command execution to an install-once local CLI. This affects launcher command contract, Settings command catalog, UI copy grouping, docs, installer destinations/PATH behavior, and acceptance criteria.

## Design Decisions

1. **Primary Settings/docs flow becomes install-once + direct CLI.**
   - Show install command first.
   - Then show direct local commands for repeated use.
   - Do not make repeated `curl | bash ... start` the normal user path.

2. **One-shot raw execution remains secondary only.**
   - It may be retained in docs or a collapsed/advanced UI section as a temporary/no-install option.
   - It must be labeled as advanced/temporary if visible.

3. **macOS/Linux install behavior.**
   - Command shape: `curl -fsSL <raw>/autobyteus-docker.sh | bash -s -- install`.
   - Default destination: `${AUTOBYTEUS_DOCKER_INSTALL_DIR:-$HOME/.local/bin}/autobyteus-docker`.
   - Installer creates the directory, writes the executable, applies executable permission, and prints the installed path.
   - If the destination is not on `PATH`, installer prints exact PATH guidance and a direct-path fallback such as `$HOME/.local/bin/autobyteus-docker start`.
   - No `sudo` requirement and no silent shell profile edits in this ticket.

4. **Windows install behavior.**
   - Command shape: `powershell -NoProfile -ExecutionPolicy Bypass -Command "irm <raw>/autobyteus-docker.ps1 | iex; autobyteus-docker install"`.
   - Default destination: `${env:AUTOBYTEUS_DOCKER_INSTALL_DIR}` or `%LOCALAPPDATA%\AutoByteus\bin`.
   - Installer writes a PowerShell launcher and a command shim so `autobyteus-docker ...` is usable when the install directory is on User `PATH`.
   - PATH handling must be user-local/no-admin. If automatic User PATH update is implemented, it must not modify Machine PATH and must report whether a new shell is needed. Otherwise it must print exact User PATH guidance and a direct-path fallback.

5. **Update/reinstall scope.**
   - `install` is idempotent and safe to rerun as reinstall/update.
   - An explicit `update` command can be an alias to the same install/update behavior.
   - Install/update must not delete Docker runtime state, managed containers, or volumes.

6. **Uninstall scope.**
   - Full uninstall and Docker data cleanup automation are out of scope for this ticket.
   - Help/docs may include concise manual removal notes.

## Updated Acceptance Focus

- Settings → Nodes must provide copyable install commands and post-install direct commands.
- Direct commands must be test-covered in the frontend command catalog and guide card.
- Raw one-shot commands must not appear as primary repeated-use commands.
- Launcher install/update behavior must be covered by static/dry-run checks where Docker is unavailable.
- Existing Docker lifecycle requirements remain: `start` is idempotent; `start --new` creates another node with automatic name/ports; public help avoids `--project`/Compose project terminology.

## Updated Artifact Paths

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow/design-spec.md`

## Additional User Clarification: Launcher Update vs Server Image Update

After the install-once rework handoff, the user clarified update semantics:

- `autobyteus-docker update` should update the installed launcher script itself using the install/update approach described above.
- Docker server image/container refresh belongs to `autobyteus-docker start`.
- `start` should check/pull the configured Docker image.
- If no newer/different image is available, `start` should simply ensure the managed container is running and print URLs.
- If the configured image changed, `start` should stop/remove/recreate the managed container from the new image and then start it.
- This container refresh must preserve named volumes, runtime state, friendly node identity, and ports where possible. It must not delete user data by default.

Design consequence: do not overload `autobyteus-docker update` to update both the launcher and the server. The clean split is: `update` = launcher script update; `start` = server image/container start-or-refresh.
