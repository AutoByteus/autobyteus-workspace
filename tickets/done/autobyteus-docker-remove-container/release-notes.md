## What's New

- Added `autobyteus-docker destroy --name <node>` to safely remove one proven AutoByteus-managed Docker server node.
- Added a copyable, localized targeted-node command to the Nodes > Docker Guide.

## Improvements

- Targeted destroy cleans matching launcher state, forgets stale state explicitly, preserves named volumes and host workspaces, and reuses the freed indexed slot on a later `new-container` invocation.
- Target resolution now fails closed for ambiguous, conflicting, malformed, or unmanaged targets and keeps Docker Buildx infrastructure outside launcher ownership.
- Docker documentation now distinguishes AutoByteus node removal from `docker buildx rm multi-platform-builder`.

## Validation

- Backend/Docker focused coverage: 11 tests passed, including a disposable real-Docker lifecycle probe.
- Frontend focused coverage: 7 Vitest tests passed, with Nuxt prepare, localization/web boundary guards, literal audit, and diff checks passing.
- PowerShell/Windows executable runtime and repository-wide baseline diagnostics remain documented environment limitations.
