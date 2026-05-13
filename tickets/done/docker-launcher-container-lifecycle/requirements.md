# Requirements: Docker launcher container lifecycle commands

Status: Design-ready

## User intent

Redesign the public AutoByteus Docker launcher so container creation and lifecycle management are explicit, clean, and not backward-compatible with the old `start`/`start --new` command model.

## Functional requirements

1. Replace the old creation flow with a clear command:
   - `autobyteus-docker new-container`
   - Each invocation creates a new managed server container using indexed names starting at zero: `autobyteus-server-0`, `autobyteus-server-1`, `autobyteus-server-2`, ...
2. Add `autobyteus-docker upgrade --all`:
   - Pull the latest configured server image.
   - Recreate all AutoByteus-managed server containers with the latest image.
   - Keep Docker named volumes.
   - Prefer each node's existing ports/config where possible.
   - Remove old AutoByteus server image IDs only when no containers still use them.
3. Add `autobyteus-docker destroy --all`:
   - Remove all AutoByteus-managed server containers.
   - Keep Docker named volumes.
   - Remove launcher state for destroyed nodes.
   - Remove unused AutoByteus server images in a targeted way.
4. Add `autobyteus-docker reset`:
   - Remove all AutoByteus-managed server containers.
   - Keep Docker named volumes.
   - Remove unused old AutoByteus server images.
   - Create one fresh `autobyteus-server-0` from the latest image.
5. Do not preserve backward compatibility for the old `start` and `start --new` command API unless implementation investigation finds a release-critical reason and the user approves.
6. Preserve launcher self-install/update behavior through one unambiguous command:
   - `install` is the only public command for installing or updating the local launcher script from the public script URL.
   - Remove the `update` alias from help and command routing.
7. Apply behavior consistently to Bash and PowerShell public launchers where practical.

## Safety requirements

- Never remove Docker volumes in these lifecycle commands.
- Never globally prune unrelated user Docker images.
- Only target AutoByteus-managed containers/images, identified by launcher labels and/or the configured AutoByteus server image repository.
- Avoid surprising deletion by requiring `--all` for commands that affect all containers.

## Acceptance criteria

- Help text documents the new command model.
- Shell syntax checks pass for the Bash launcher.
- PowerShell parser check passes if PowerShell is available locally.
- Non-destructive behavior checks verify command parsing/help and lifecycle helper logic without deleting the user's real containers.


## Refined command model

- `new-container` is the only creation command. It creates exactly one new indexed container per invocation.
- Indexed node names are `autobyteus-server-0`, `autobyteus-server-1`, ... and indexes are selected by the first currently available index.
- `start` and `start --new` are removed from the public command model.
- `upgrade --all`, `destroy --all`, and `reset` are explicit lifecycle operations for all managed containers.
- `install` remains as the only launcher self-install/update command; `update` is removed to avoid ambiguity.

## Validation requirements

- Parsing/help must not advertise `start`.
- `bash -n` must pass for the Bash script.
- If `pwsh` is installed, PowerShell parse validation must pass.
- A fake-Docker smoke test should verify `new-container` creates `autobyteus-server-0` then `autobyteus-server-1` under isolated state.
