# Investigation Notes: Docker launcher container lifecycle commands

Status: Current

## Scope triage

Small/Medium: two public launcher scripts plus README/help text. Behavior is shell-based Docker orchestration with safety-sensitive container/image removal.

## Current Bash launcher findings

- File: `scripts/public/docker/autobyteus-docker.sh`.
- Existing self-update behavior: `install` and `update` are aliases; both download `PUBLIC_BASH_SCRIPT_URL` to the local install path.
- Existing `start` command pulls the image and manages only the resolved target node. With no args this is `autobyteus-server`; with `--new` it picks `autobyteus-server-2`, `-3`, etc.
- Existing labels: `com.autobyteus.launcher=server-docker`, `com.autobyteus.nodeName=<node>`, `com.autobyteus.configHash=<hash>`.
- Volumes are derived from normalized node name: `<node>-workspace`, `<node>-data`, `<node>-root-home`.
- Existing state: `$HOME/.autobyteus/docker-server/nodes/<node>.env`.
- Existing `stop --all` stops managed containers but does not remove containers, state, images, or volumes.

## Current PowerShell launcher findings

- File: `scripts/public/docker/autobyteus-docker.ps1`.
- Existing self-update behavior: `install` and `update` are aliases; both download `PublicPowerShellScriptUrl` and write a `.cmd` shim.
- Existing command model mirrors Bash: `start`, `start --new`, `stop --all`, status/logs/urls.
- State uses JSON files under `%LOCALAPPDATA%\\AutoByteus\\docker-server\\nodes`.

## Design implications

- User explicitly does not require backward compatibility with `start`/`start --new`.
- New indexed naming should start at `autobyteus-server-0`.
- `new-container` should always create the next available indexed node; repeated calls create 0, then 1, then 2.
- `upgrade --all`, `destroy --all`, and `reset` need targeted cleanup only for AutoByteus-managed containers/images and must never delete volumes.
- Image cleanup should collect image IDs from containers before removal/recreation and remove them only if unused by any remaining container.
- For safety, broad destructive all-node actions should require `--all`, except `reset` whose purpose is explicitly all-node reset.
- To keep Bash and PowerShell consistent, implement equivalent command parsing and helpers in both scripts.

## Answer to user question

Yes. The script already includes self-update behavior: `autobyteus-docker update` is an alias for `install`, and it re-downloads the public launcher script to the local install location.
