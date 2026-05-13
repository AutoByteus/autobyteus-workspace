# Release Notes: Docker launcher lifecycle commands

- Replaced public Docker launcher container creation with `autobyteus-docker new-container`.
- New containers are named consistently from `autobyteus-server-0`, then `autobyteus-server-1`, and so on.
- Added `autobyteus-docker upgrade --all` to upgrade all managed server containers while keeping volumes.
- Added `autobyteus-docker destroy --all` to remove all managed server containers while keeping volumes.
- Added `autobyteus-docker reset` to destroy all managed containers and create one fresh `autobyteus-server-0`.
- Old unused AutoByteus server image IDs are removed only when no Docker container still uses them.
- `install` is the only launcher self-install/update command; the `update` alias was removed to avoid ambiguity.
