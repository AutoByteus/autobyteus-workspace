# Delivery / Release / Deployment Report

## Release / Publication / Deployment Scope

Client-only web fix in `autobyteus-web` (4 source files), plus server and web tests and two web docs. Classification is preserved from upstream: `task_size=Small`, `architectural_risk=Low`, direct route (architecture, source and test-code review `N/A — not applicable`). The user asked for finalization and a new beta.

## Handoff Summary

- Handoff summary artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/done/archived-open-run-disappears/handoff-summary.md` (on `personal`: `tickets/done/archived-open-run-disappears/handoff-summary.md`)
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/archived-open-run-disappears/delivery-revision-record.md`
- Current delivery revision ID: `DR-002`
- Notes: DR-001 covered the integrated state held for verification. DR-002 covers finalization and the `v1.4.99-beta.2` release.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `3a2496c95`
- Latest tracked remote base reference checked: `origin/personal` @ `ace86bf1f`
- Base advanced since bootstrap or previous refresh: `Yes` (13 commits: idle-shutdown-background-tasks, v1.4.99-beta.1)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Not needed` (the validated candidate `efb0faa7e` was already committed)
- Integration method: `Merge` (`efcda7ee2`, no conflicts, no overlap with the ticket files)
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes`
  - The 5 changed web specs: 48 tests passed
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history --no-watch`: 46 files, 227 tests passed
  - `pnpm -C autobyteus-web guard:web-boundary`: Passed
- Post-integration verification result: `Passed` (`delivery-evidence/post-merge-*.log`)
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`
- Blocker: None

## User Verification

- Initial explicit user completion/verification received: `Yes`
- Initial verification / acceptance reference: "finalize and release a new beta" (2026-10-08). Recorded in `user-verification.md`. No in-app test result was reported. The go-ahead relies on the delivered validation evidence.
- Renewed verification required after later re-integration: `No` (`origin/personal` did not advance after verification)
- Renewed verification received: `Not needed`

## Docs Sync Result

- Docs sync artifact: `tickets/done/archived-open-run-disappears/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/chat.md`

## Ticket State Transition

- Ticket moved to `tickets/done/archived-open-run-disappears`: `Yes` (`f68017d7c`)
- Archived ticket path: `tickets/done/archived-open-run-disappears/`

## Version / Tag / Release Commit

- Method: `bash scripts/desktop-release.sh beta --branch release-beta-archived-open-run --no-push`. The helper needs a clean checkout on the named branch, so it ran in the ticket worktree on a temporary local branch at the finalized `personal` tip `a904f5705`. The untracked `autobyteus-application-*/dist/` build output was moved first to `/tmp/archived-open-run-dist-aside/`. That output was never part of the ticket.
- Computed version: **`1.4.99-beta.2`** (next beta number after `v1.4.99-beta.1`)
- Release commit: `b5e0da508` "chore(release): bump workspace release version to 1.4.99-beta.2" (`autobyteus-web/package.json` 1.4.99-beta.1 → 1.4.99-beta.2). The author identity is the same as the earlier release commits.
- Push, in the helper's order: `a904f5705..b5e0da508 HEAD -> personal` (origin/personal was re-checked as `a904f5705` just before), then the annotated tag `v1.4.99-beta.2` (`[new tag]`)
- Receipt: `delivery-evidence/beta-release.log`

## Repository Finalization

- Bootstrap context source: the API/E2E and implementation handoffs (worktree, branch `codex/archived-open-run-disappears`, base and target `origin/personal`)
- Ticket branch: `codex/archived-open-run-disappears`
- Ticket branch commit result: `Completed`
  - `fd5f32ba5`: implementation
  - `b2beb3110`: catalog spec baseline fix
  - `efb0faa7e`: API/E2E test and artifacts
  - `efcda7ee2`: base integration merge
  - `a95d69c65`: delivery artifacts and docs
  - `f68017d7c`: archive to `tickets/done`
- Ticket branch push result: `Completed` (`[new branch] codex/archived-open-run-disappears`)
- Finalization target remote: `origin`
- Finalization target branch: `personal`
- Target advanced after verification / acceptance: `No` (`ace86bf1f` at merge time)
- Delivery-owned edits protected before re-integration: `Not needed`
- Re-integration before final merge result: `Not needed`
- Target branch update result: `Completed`. Done in the ticket worktree, detached at the fetched `origin/personal`. The main checkout was not touched.
- Merge into target result: `Completed`. `--no-ff` merge `a904f5705` "Merge verified archived-open-run-disappears (close an archived or deleted open run to the workspace empty view)". The net product diff is the validated 11 files plus the 2 docs (13 files, +483/−22). `check_licensing.py` and `check_repository_artifact_hygiene.py` pass, and no ticket path contains Windows-invalid characters.
- Push target branch result: `Completed` (`ace86bf1f..a904f5705 HEAD -> personal`)
- Repository finalization status: `Completed`
- Blocker: none

## Release / Publication / Deployment

- Applicable: `Yes`
- Method: `Release Script` (tag-triggered GitHub workflows)
- Method reference / command: `scripts/desktop-release.sh beta` (see above)
- Workflow runs for `v1.4.99-beta.2`, all ending `success` (`delivery-evidence/workflows-final.json`):
  - Android APK Release `37797231461` (15:04:51Z)
  - iOS App Store Connect Release `37797231229` (15:17:10Z)
  - Desktop Release `37797231284` (15:25:14Z)
  - Server Docker Release `37797231269`. **Attempt 1 failed**: the upstream Antigravity installer download (`https://antigravity.google/cli/install.sh`) gave a non-script payload in the amd64 build ("cannot execute binary file", exit 126). A probe right after got a valid `text/x-sh` bash script. The Dockerfile was not changed by this ticket, and the same step passed for beta.1 earlier today. This was a transient external failure, so only the failed jobs were re-run. **Attempt 2 succeeded** (15:52:24Z).
- GitHub release `v1.4.99-beta.2` (`delivery-evidence/github-release.json`): **pre-release**, not a draft, published 2026-10-08T15:04:41Z, with 17 assets. These are macOS arm64/x64 dmg+zip with blockmaps, the Windows exe, Linux x64/arm64 AppImage, the Android APK and its sha256, and 4 updater metadata files.
- Updater metadata: `latest.yml`, `latest-mac.yml`, `latest-linux.yml` and `latest-linux-arm64.yml` all report `version: 1.4.99-beta.2` (`delivery-evidence/updater-metadata/`). GitHub `releases/latest` stays on stable `v1.4.98`, so only beta-channel installs are offered the beta.
- Docker `autobyteus/autobyteus-server` (`delivery-evidence/docker-tags.txt`):
  - `:1.4.99-beta.2` and `:beta` share digest `sha256:f8fde617ba03…d244` (linux/amd64 and linux/arm64)
  - `:latest` is unchanged at `sha256:8aa17b23…5187` (1.4.98)
- Release/publication/deployment result: `Completed`
- Release notes handoff result: `Not required`. Beta mode publishes generated notes without curated notes. The archived `release-notes.md` stays as the ticket's user-facing summary for the next stable release.
- Blocker: none

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears`
- Worktree cleanup result: `Completed` (after this record was pushed)
- Worktree prune result: `Completed`
- Local ticket branch cleanup result: `Completed` (`codex/archived-open-run-disappears`, temporary `release-beta-archived-open-run`)
- Remote branch cleanup result: `Not required` (repo convention keeps `codex/*` remote branches)
- Note: the untracked `dist/` build output moved aside is in `/tmp/archived-open-run-dist-aside/` and can be regenerated.
- Blocker: none

## Release Notes Summary

- Release notes artifact created before verification / acceptance: `tickets/done/archived-open-run-disappears/release-notes.md`
- Archived release notes artifact used for release/publication: not used (beta has no curated notes)
- Release notes status: `Updated`

## Deployment Steps

The tag-triggered workflows above published the desktop, mobile and Docker artifacts. No other deployment target applies.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected` (design-spec.md)
- Delivery action required: `None`
- Result and evidence: N/A

## Verification Checks

| Check | Command | Result |
| --- | --- | --- |
| Base freshness (delivery start / after verification) | `git fetch origin personal` | `ace86bf1f` integrated, unchanged at merge time |
| Post-merge smoke | 5 web specs, server `tests/unit/run-history`, guard:web-boundary | 48 tests; 46 files / 227 tests; Pass |
| Release gates on merged tree | `python3 scripts/check_licensing.py`; `python3 scripts/check_repository_artifact_hygiene.py` | Pass; Pass |
| Windows path scan | `git ls-files tickets/done/archived-open-run-disappears \| grep -E '[<>:"\|?*\\]'` | No matches |
| Published workflows | `gh run list --branch v1.4.99-beta.2` | 4/4 success (Docker on attempt 2) |
| Published artifacts | `gh release view`, updater yml, `docker buildx imagetools inspect` | As above |
| Upstream full validation | API-REV-001 | Pass, 95% |

## Rollback Criteria

- If an open run is not closed after Archive or Delete, another run is auto-selected, or a non-archived run cannot be opened from its address: publish a fixed `v1.4.99-beta.3` through the helper, or revert merge `a904f5705` on `personal`. Only the client is affected, and no data is migrated.
- Do not delete a published beta that beta-channel installs may already have taken.

## Final Status

- Explicit user testing/verification complete: `Yes` (`user-verification.md`)
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete or not required: `Yes` (`v1.4.99-beta.2` published)
- Applicable safe cleanup complete or not required: `Yes` (performed right after this record was pushed)
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to `/solution_designer`: `Yes` (after cleanup)
- Terminal message/reference: delivery-engineer `send_message_to` → `/software_engineering_team/solution_designer`
