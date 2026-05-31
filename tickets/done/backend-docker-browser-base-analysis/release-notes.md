# Release Notes — Backend Docker Browser Profile Persistence

## Highlights

- Docker-managed backend nodes now persist Chromium browser profile state in a per-node named volume mounted at `/home/vncuser/.config/chromium`.
- Public Bash and PowerShell Docker launchers keep the no-clone install/curl-pipe user contract while using smaller support modules that are installed alongside the local launcher.
- Existing launcher-managed containers will be safely recreated once when the launcher detects the new config hash, keeping named volumes and host folders while attaching the Chromium profile volume.
- Source-helper and personal all-in-one Docker Compose paths now mount dedicated Chromium profile named volumes too.

## Operator Notes

- Users whose Chromium profile state only lived in an old container writable layer may need to sign in again after the new persistent volume is attached.
- PowerShell runtime validation should still be run on a `pwsh`-capable host before or during release if that infrastructure is available; this macOS host did not have `pwsh` installed.
- After merge/finalization, publish a new `autobyteus/autobyteus-server` image from the finalized tag so `latest` and the version tag inherit browser Docker `1.3.6` stale Chromium profile lock cleanup.
