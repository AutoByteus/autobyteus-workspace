# Handoff Summary

## Outcome

- Ticket: `docker-launcher-preserve-upgrade-image-ref`
- User verification/finalization signal: received on 2026-07-09: "now finalize and release a new version."
- Ticket branch commit: `d26d7866dca5646b8987a95d064476a16a19adf6` (`fix(docker): preserve node image refs during upgrade all`).
- Merge commit into `personal`: `c1d2da124ab48e2007763bf5eef133fee81a2bca`.
- Release commit: `bc9844acbbc389165ad1157f5dd5045a6607f93f`.
- Release tag: `v1.4.6` (annotated tag; peeled commit `bc9844acbbc389165ad1157f5dd5045a6607f93f`).
- GitHub release URL: https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.4.6
- Archived ticket path after main checkout refresh: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-launcher-preserve-upgrade-image-ref`.

## What Changed

- Plain `autobyteus-docker upgrade --all` now upgrades every managed node using that node's saved image ref instead of applying the launcher default image ref to every node.
- Mixed fleets keep their intended image line by default: `latest` nodes stay on `latest`, `latest-zh` nodes stay on `latest-zh`, and pinned refs stay pinned unless explicitly retargeted.
- Explicit `--tag` and `--image` on `upgrade --all` remain all-node retarget operations.
- Bash and PowerShell launchers now share the same preserve-by-default / explicit-retarget semantics.
- Root/server Docker docs, server README quickstart, Bash/PowerShell help, and settings UI English/Chinese copy now describe the new contract.

## Verification Summary

Delivery/finalization checks run successfully:

- Latest-base refresh before finalization: `origin/personal` remained at `7508f3de95c7aebf2d5a2816e95e81023324aadf` before ticket archival/commit.
- Pre-archive/final ticket checks:
  - `bash -n scripts/public/docker/autobyteus-docker.d/bash/core.sh scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh scripts/public/docker/autobyteus-docker.d/bash/commands.sh scripts/public/docker/autobyteus-docker.sh` — passed.
  - Focused `python3.11 -m unittest` launcher coverage set — passed, 5 tests.
  - `git diff --check` — passed.
- Post-merge checks in the finalization worktree:
  - same Bash syntax check — passed.
  - same focused `python3.11 -m unittest` launcher coverage set — passed, 5 tests.
  - `git diff --check HEAD~2..HEAD` — passed.
- Release-prep checks:
  - `python3 scripts/check_repository_artifact_hygiene.py` — passed.
  - `node autobyteus-message-gateway/scripts/build-runtime-package.mjs --check-release-manifest --release-tag v1.4.6` — passed.
  - package version check confirmed `autobyteus-web/package.json` and `autobyteus-message-gateway/package.json` are `1.4.6`.

## Release Notes

- Archived release notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-launcher-preserve-upgrade-image-ref/release-notes.md`
- Curated GitHub release notes copied to: `.github/release-notes/release-notes.md`

## Release Rollout Snapshot

Snapshot recorded at 2026-07-09T17:55:44Z:

| Workflow | Run ID | Status |
| --- | --- | --- |
| Release Messaging Gateway | `29038345592` | completed / success |
| Android APK Release | `29038345645` | completed / success |
| Desktop Release | `29038345787` | in progress |
| Server Docker Release | `29038345766` | in progress |
| iOS App Store Connect Release | `29038345646` | in progress |

At that snapshot, the GitHub release was published with messaging-gateway assets and Android APK assets attached. Desktop, server Docker, and iOS lanes were still running asynchronously.

## Residual / Rollout Notes

- Local `pwsh` is not installed, so PowerShell executable parse/runtime coverage remained environment-gated and skipped as expected upstream; static Bash/PowerShell parity checks passed.
- Destructive live Docker upgrade validation remained out of scope per approved requirements; fake-Docker coverage exercises parsing, state image-ref resolution, pulls, and node start/recreate invocation.
- Full launcher module baseline/environment failures documented upstream remain unrelated to this change.
- If any still-running `v1.4.6` workflow fails, inspect that workflow and prefer a follow-up patch release over mutating the already-pushed `v1.4.6` tag.

## Artifact Package

- Requirements: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-launcher-preserve-upgrade-image-ref/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-launcher-preserve-upgrade-image-ref/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-launcher-preserve-upgrade-image-ref/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-launcher-preserve-upgrade-image-ref/design-review-report.md`
- Implementation handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-launcher-preserve-upgrade-image-ref/implementation-handoff.md`
- Code review report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-launcher-preserve-upgrade-image-ref/code-review-report.md`
- API/E2E coverage investigation: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-launcher-preserve-upgrade-image-ref/api-e2e-coverage-investigation.md`
- API/E2E execution coverage report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-launcher-preserve-upgrade-image-ref/api-e2e-execution-coverage-report.md`
- API/E2E execution log: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-launcher-preserve-upgrade-image-ref/api-e2e-execution.log`
- Docs sync report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-launcher-preserve-upgrade-image-ref/docs-sync-report.md`
- Delivery/release/deployment report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-launcher-preserve-upgrade-image-ref/delivery-release-deployment-report.md`
- Release notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-launcher-preserve-upgrade-image-ref/release-notes.md`
