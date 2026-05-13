# Implementation Design: Docker launcher container lifecycle commands

Status: Design baseline

## Scope

Files in scope:

- `scripts/public/docker/autobyteus-docker.sh`
- `scripts/public/docker/autobyteus-docker.ps1`
- `README.md`

## Public command model

- `autobyteus-docker new-container [--image <image>] [--tag <tag>]`
  - Pulls/checks the configured image.
  - Creates one new managed container using the first available indexed node name: `autobyteus-server-0`, `autobyteus-server-1`, ...
  - Uses named volumes derived from that indexed node name.
- `autobyteus-docker upgrade --all [--image <image>] [--tag <tag>]`
  - Enumerates all managed nodes from launcher state and Docker labels.
  - Captures their current image IDs.
  - Calls the existing single-node reconcile flow for each node so containers move to the latest image/config while preserving volumes and preferred ports.
  - Removes captured old image IDs only after all containers have been reconciled and only if no remaining container uses the image ID.
- `autobyteus-docker destroy --all`
  - Enumerates all managed containers and state files.
  - Captures current image IDs.
  - Removes containers with `docker rm -f`.
  - Removes matching state files.
  - Runs targeted unused-image removal for captured image IDs.
- `autobyteus-docker reset [--image <image>] [--tag <tag>]`
  - Performs all-node destroy while keeping volumes.
  - Creates a fresh `autobyteus-server-0` through the same `new-container` path.
- `install`
  - Preserve launcher self-install/update behavior through one public command that downloads the launcher script from the public URL and replaces the local install.

## Removed command model

- Do not expose `start` or `start --new` in help.
- Do not route `start` as a supported command.

## Data-flow spine

1. Command parser resolves command and options.
2. Docker availability is asserted for Docker-manipulating commands.
3. Node enumeration comes from two sources:
   - state files under launcher state dir;
   - Docker containers with label `com.autobyteus.launcher=server-docker`.
4. Container creation/reconciliation uses one shared single-node function to avoid divergent behavior.
5. Image cleanup receives explicit image IDs captured from managed containers and removes only unused IDs.

## Safety

- No command removes volumes.
- No global Docker prune command is used.
- Image cleanup is ID-targeted and skips images still used by any container.
- `upgrade` and `destroy` require `--all` because they affect all managed nodes.

## Implementation execution summary

Status: Complete

Changed files:

- `scripts/public/docker/autobyteus-docker.sh`
- `scripts/public/docker/autobyteus-docker.ps1`
- `README.md`

Implemented behavior:

- Replaced public creation command with `new-container`.
- New managed node names start at `autobyteus-server-0` and increment by first available index.
- Added all-node `upgrade --all`, `destroy --all`, and `reset` command paths.
- Added managed-node/container enumeration from state files and Docker labels.
- Added targeted image cleanup by captured image ID, skipping images still used by any Docker container.
- Kept volumes untouched; no volume removal or global prune commands were added.
- Preserved launcher self-install/update behavior through `install` only.
- Updated README and installer guidance to use the new commands.

Implementation validation run during Stage 6:

- `bash -n scripts/public/docker/autobyteus-docker.sh`
- help command model grep checks
- fake-Docker `new-container` smoke: created `autobyteus-server-0` then `autobyteus-server-1`
- fake-Docker `upgrade --all` smoke
- fake-Docker `destroy --all` smoke
- PowerShell parse check skipped because neither `pwsh` nor `powershell` is installed in this environment.
