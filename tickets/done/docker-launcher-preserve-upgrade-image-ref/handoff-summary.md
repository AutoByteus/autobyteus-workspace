# Handoff Summary

## Ticket

- Ticket: `docker-launcher-preserve-upgrade-image-ref`
- Branch: `codex/docker-launcher-preserve-upgrade-image-ref`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref`
- Finalization target from bootstrap context: `personal` (`origin/personal` tracked base)
- Current delivery status: User approved finalization and requested a new release on 2026-07-09; ticket archival/finalization/release is in progress.

## Integrated State

- Bootstrap base reference: `origin/personal` / `personal` from upstream context.
- Latest tracked remote base checked during delivery: `origin/personal@7508f3de95c7aebf2d5a2816e95e81023324aadf` (`chore(delivery): record token meter team total finalization`).
- Base advanced during delivery refresh: No. `origin/personal` was unchanged by fetch and `HEAD...origin/personal` was `0 0`.
- Local checkpoint commit before integrating base: Not needed because the tracked base did not advance and no merge/rebase was required.
- Integration method: Already current with latest tracked `origin/personal`; no merge or rebase performed.
- Integration result: Completed as current-state verification; delivery edits started only after confirming the base was current.
- Post-integration checks rerun by delivery:
  - `bash -n scripts/public/docker/autobyteus-docker.d/bash/core.sh scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh scripts/public/docker/autobyteus-docker.d/bash/commands.sh scripts/public/docker/autobyteus-docker.sh` — passed.
  - `git diff --check` — passed after delivery docs/artifacts.
  - `python3.11 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace.PublicDockerLauncherSharedWorkspaceTest.test_upgrade_all_preserves_each_node_saved_image_ref_by_default scripts.tests.test_public_docker_launcher_shared_workspace.PublicDockerLauncherSharedWorkspaceTest.test_upgrade_all_with_explicit_tag_retargets_all_nodes scripts.tests.test_public_docker_launcher_shared_workspace.PublicDockerLauncherSharedWorkspaceTest.test_upgrade_all_with_explicit_image_retargets_all_nodes scripts.tests.test_public_docker_launcher_shared_workspace.PublicDockerLauncherSharedWorkspaceTest.test_powershell_launcher_matches_the_shared_workspace_cli_contract scripts.tests.test_public_docker_launcher_shared_workspace.PublicDockerLauncherSharedWorkspaceTest.test_public_launcher_source_files_stay_within_reviewable_size_guard -v` — passed, 5 tests.
  - `pnpm -C autobyteus-web guard:localization-boundary` — passed.
  - `pnpm -C autobyteus-web audit:localization-literals` — passed after temporarily resolving dependencies via the existing main-worktree `node_modules` symlink; the symlink was removed after the check.

## What Is Included

- Bash launcher parser now tracks whether `--image` or `--tag` was explicitly supplied.
- Bash `upgrade_all_nodes` resolves each node's saved `IMAGE_REF` during plain `upgrade --all`; explicit image/tag overrides still retarget every managed node.
- PowerShell launcher runtime mirrors the Bash preserve-by-default and explicit-retarget semantics.
- Docker lifecycle start/recreate remains policy-agnostic and receives an already-resolved image ref.
- Public Bash/PowerShell help, root/server Docker docs, server README quickstart, and settings UI user-facing copy now describe saved image-ref preservation and explicit all-node retargeting.
- Durable fake-Docker coverage covers mixed-image preservation, explicit tag retargeting, explicit image retargeting, PowerShell static parity, and source size guard.

## Delivery Docs Sync

- Docs sync report: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/docs-sync-report.md`
- Docs/user-facing guidance updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/README.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/autobyteus-server-ts/README.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/autobyteus-server-ts/docker/README.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/scripts/public/docker/autobyteus-docker.d/bash/core.sh`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/scripts/public/docker/autobyteus-docker.d/powershell/Core.ps1`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/autobyteus-web/localization/messages/en/settings.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/autobyteus-web/localization/messages/zh-CN/settings.ts`

## Upstream Validation Summary

API/E2E reported pass with no reroute required and no repository-resident durable coverage added, updated, or removed after code review. Upstream passed checks include:

- Bash syntax check for public launcher Bash files.
- `git diff --check`.
- Python compile check for `scripts/tests/test_public_docker_launcher_shared_workspace.py`.
- Focused durable fake-Docker coverage under `python3` and `python3.11`: default preserve, explicit tag retarget, explicit image retarget, PowerShell static parity, and source-size guard — 5 tests passed in each runtime.
- Environment-gated PowerShell parse test under `python3.11` — OK with expected skip because `pwsh` is not installed.
- Temporary fake-Docker missing-`IMAGE_REF` fallback probe — passed.
- Docs/help source grep for saved-image-ref and explicit retarget wording — passed.

## Not Run / Residual Risk

- No destructive live Docker upgrade was run; approved requirements preferred fake-Docker coverage and put live mutation out of primary scope.
- PowerShell executable parse/runtime remains environment-limited because local `pwsh` is not installed. Static Bash/PowerShell parity passed, and the `pwsh`-gated test skipped as expected.
- Full launcher module baseline/environment failures noted by implementation and code review remain unrelated to this change: Python 3.9 `zip(strict=True)`, occupied friendly ports, missing `pwsh`, and an existing shell-quote expectation.
- No ticket archival, commit, push, target-branch merge, release, deployment, or cleanup has been performed before explicit user verification.

## Upstream Artifact Package

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/design-review-report.md`
- Implementation handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/implementation-handoff.md`
- Code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/code-review-report.md`
- API/E2E coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/api-e2e-coverage-investigation.md`
- API/E2E execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/api-e2e-execution-coverage-report.md`
- API/E2E execution log: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/api-e2e-execution.log`
- Docs sync report: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/docs-sync-report.md`
- Delivery/release/deployment report: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/delivery-release-deployment-report.md`

## Verification Request

Please verify the integrated worktree state and reply with explicit approval if you want delivery to proceed with finalization. On approval, delivery should refresh `origin/personal` again, protect any delivery-owned edits, re-integrate and rerun required checks if the base advanced, move the ticket to `tickets/done/docker-launcher-preserve-upgrade-image-ref/`, commit the ticket branch, push the ticket branch if required by project flow, merge to `personal`, push `personal`, and then handle any applicable release/deployment/cleanup steps.
