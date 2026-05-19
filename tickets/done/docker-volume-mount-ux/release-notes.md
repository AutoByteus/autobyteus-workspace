# Release Notes: Docker Shared Workspace Bind Mounts

## What's New

- Added default host-visible workspace bind mounts for public `autobyteus-docker` managed containers while keeping the existing Docker named volumes unchanged.
- Each managed container now receives:
  - `/home/autobyteus/workspace` backed by that node's host workspace folder.
  - `/home/autobyteus/shared` backed by one shared host folder visible to all managed Docker nodes.
- Added public launcher commands:
  - `autobyteus-docker workspace paths`
  - `autobyteus-docker workspace apply --all`
  - `autobyteus-docker storage`

## Improvements

- The launcher sets `AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace` so default terminal/agent work lands in a host-visible node workspace.
- Existing managed containers can adopt the new bind mounts through `workspace apply --all`; the workflow recreates containers safely while preserving named volumes, host folders, ports, and friendly node identity where possible.
- Settings -> Nodes and Docker docs now explain the storage mental model: private server data remains in named volumes under `/home/autobyteus/data` and `/root`, while user files should use `/home/autobyteus/workspace` and `/home/autobyteus/shared`.

## Notes / Residual Gaps

- Existing files under `/home/autobyteus/data/temp_workspace` remain preserved in the data named volume, but new/apply containers use `/home/autobyteus/workspace` as the default temp workspace.
- Native PowerShell runtime validation remains untested on this host because `pwsh` is unavailable; Bash, fake-Docker parity/source-contract tests, targeted frontend tests, and real Docker macOS validation passed.
- On Linux hosts, files written from the current root-running container into bind-mounted host folders may be root-owned.
