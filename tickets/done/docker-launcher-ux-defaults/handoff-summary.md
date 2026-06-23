# Handoff Summary — Docker Launcher UX Defaults

## Status

Finalized and released as `v1.3.71`; GitHub release workflows are running asynchronously.

## Delivered

- macOS/Linux public launcher install now prints truthful PATH guidance:
  - installed executable path,
  - direct-path command that works immediately,
  - current-shell `export PATH=...`,
  - duplicate-safe persistent profile update when possible,
  - copy/paste persistent profile setup commands when automatic update is skipped, unavailable, or blocked,
  - explicit note that a child installer cannot mutate the already-running parent shell.
- Fresh indexed Docker nodes now prefer deterministic friendly host ports when available:
  - `autobyteus-server-0`: backend/VNC/noVNC/debug `8001/5908/6080/9228`,
  - `autobyteus-server-1`: `8002/5909/6081/9229`,
  - `autobyteus-server-2`: `8003/5910/6082/9230`, with later nodes continuing offsets.
- Existing saved ports remain authoritative unless unavailable; preferred-port collisions and real Docker bind/start failures fall back to fresh safe ports.
- Read-only discovery commands now show all managed nodes by default: `urls`, `ports`, `workspace paths`, and `storage`.
- Explicit single-node forms remain available for URL/port/path/storage inspection.
- Mutating or stream commands preserve safe explicit targeting: `workspace apply` does not broaden silently, `upgrade`/`destroy` require `--all`, `logs` remains single-node, and `stop` remains default/single-node unless `--all` is supplied.
- Public docs and Docker Guide copy were synchronized:
  - `README.md`,
  - `autobyteus-web/localization/messages/en/settings.ts`,
  - `autobyteus-web/localization/messages/zh-CN/settings.ts`.

## Validation Summary

- API/E2E round 2 is the latest authoritative validation round and passed.
- Delivery/finalization checks passed:
  - Bash syntax,
  - `python3 -m py_compile scripts/tests/test_public_docker_launcher_shared_workspace.py`,
  - `python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace scripts.tests.test_server_docker_cli_latest_defaults` (`Ran 22 tests`, `OK (skipped=1)`),
  - Docker Guide focused frontend tests (`2 files`, `4 tests`),
  - `git diff --check` / staged diff check,
  - repository artifact hygiene check.
- Real Docker Engine 29.1.3 probes passed in API/E2E round 2 for sequential ports, all-node read-only defaults, explicit single-node narrowing, mutating safety, saved-port preservation, preferred-port fallback, and saved-port start retry.

## Documentation Sync Summary

- Docs sync artifact: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/tickets/done/docker-launcher-ux-defaults/docs-sync-report.md`
- Docs result: `Updated`.
- Docs / guide copy updated:
  - `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/README.md`
  - `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/localization/messages/en/settings.ts`
  - `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/autobyteus-web/localization/messages/zh-CN/settings.ts`

## Finalization Result

- User verification / release instruction: 2026-06-23, `cooo. finalize and release a new version`.
- Ticket artifact folder: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/tickets/done/docker-launcher-ux-defaults`
- Ticket branch final HEAD before cleanup: `4569cd201c53a9268fcef945494fe6c3ab75ecfe`
- Merge commit on `personal`: `77f12c187227971caf2b63978f2ce02eb752ac59`
- Release commit on `personal`: `20c510b772fd4c993903ddc1a69aff011fcccdb7`
- Release tag: `v1.3.71`
- Release tag object: `38aa019c7c34212d6cf0f6e24b4f5876b636aff2`
- Release tag target: `20c510b772fd4c993903ddc1a69aff011fcccdb7`
- Cleanup: dedicated ticket worktree removed; local and remote ticket branches deleted.

## Release Workflow Status

Pushing `v1.3.71` triggered the release workflows. They were `in_progress` when checked:

- Server Docker Release: https://github.com/AutoByteus/autobyteus-workspace/actions/runs/28012460314
- iOS App Store Connect Release: https://github.com/AutoByteus/autobyteus-workspace/actions/runs/28012460261
- Android APK Release: https://github.com/AutoByteus/autobyteus-workspace/actions/runs/28012460250
- Desktop Release: https://github.com/AutoByteus/autobyteus-workspace/actions/runs/28012460244
- Release Messaging Gateway: https://github.com/AutoByteus/autobyteus-workspace/actions/runs/28012460151

## Release / Deployment Report

- Report: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/tickets/done/docker-launcher-ux-defaults/release-deployment-report.md`
- Release notes: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo/tickets/done/docker-launcher-ux-defaults/release-notes.md`
