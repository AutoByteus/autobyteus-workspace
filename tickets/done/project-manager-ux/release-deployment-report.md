# Delivery / Release / Deployment Report — project-manager-ux

## Release / Publication / Deployment Scope

- Repository finalization into `origin/personal`.
- One desktop beta via `scripts/desktop-release.sh beta`, as the user requested at verification.
- Classification: `task_size=Large`, `architectural_risk=High`, reviewed route.

## Handoff Summary

- Handoff summary artifact: `tickets/done/project-manager-ux/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/project-manager-ux/delivery-revision-record.md`
- Current delivery revision ID: `DR-002`
- Notes:
  - DR-001 was the pre-verification state.
  - DR-002 covers verification, finalization, and the beta release.
  - The first tag `v1.4.96-beta.3` failed Desktop Release on repository artifact hygiene. Delivery fixed it and published `v1.4.96-beta.4`.
  - DR-002 also covers cleanup.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal@7d130309e`
- Latest tracked remote base reference checked: `origin/personal@88fad73cb` (fetched 2026-10-07)
- Base advanced since bootstrap or previous refresh: `Yes` (14 commits: chat Draft rows, Grok Build compaction, beta `1.4.96-beta.2`, delivery receipts)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed`. `671b65fe6` contains the API/E2E durable tests, `TESTING.md`, the `package.json` script and the review/validation artifacts. The SDK `dist/` was excluded, and the secret-pattern scan was clean.
- Integration method: `Merge` (`adc8912cb`)
- Integration result: `Completed`. There were no conflicts. `TESTING.md` and `autobyteus-web/package.json` auto-merged with both sides kept.
- Post-integration executable checks rerun: `Yes`
  - Web gates `guard:web-boundary`, `guard:localization-boundary` and `audit:localization-literals` → pass. The audit reported "zero unresolved findings" (the F-001 gate).
  - `pnpm -C autobyteus-server-ts build` → pass.
  - Server `tests/e2e/projects` (gated) + `tests/unit/projects` + the base's Grok/ACP unit tests → 25 files, 195 pass, 1 gated skip.
  - Web Projects, stores, workspace history, left panel, chat, run settings, streaming handlers and localization → 1363/1364.
    - The one failure, `workspaceSelectionComposition › publication-only snapshot…`, is pre-existing on base.
  - `test:e2e:project-manager-ux` → PMU-001..012 all Pass, with probe cleanup complete.
  - Evidence: `delivery-evidence/dr-001/`.
- Post-integration verification result: `Passed`
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes` (as of `88fad73cb`)
- Blocker: None

## User Verification

- Initial explicit user completion/verification received: `Yes`
- Initial verification / acceptance reference: `user-verification-record.md` ("finalize and release a new version", corrected to "release a new beta i meant", 2026-10-07)
- Renewed verification required after later re-integration: `No` (the target was unchanged at `88fad73cb`)
- Renewed verification received: `Not needed`
- Renewed verification / acceptance reference: —
- Release-recovery decisions by the user (2026-10-07):
  - "push and retrigger the same pipeline". The push was done. A literal retrigger of beta.3 builds from the unchanged tag commit, which would fail again.
  - "What's the correct approach? Just recommend one and do it yourself." → beta.4 (no published tag rewritten).
  - "cancel the job for beta 3" → the remaining beta.3 runs were cancelled.

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-web/docs/projects.md` (probe paragraph). The canonical feature docs had already been updated in `4d469b0c5`.

## Ticket State Transition

- Ticket moved to `tickets/done/project-manager-ux`: `Yes`
- Archived ticket path: `tickets/done/project-manager-ux/`

## Repository Finalization

- Bootstrap context source: the code-review handoff (base `origin/personal@7d130309e`, finalization target `origin/personal`)
- Ticket branch: `codex/project-manager-ux`
- Ticket branch commit result: `Completed`. The archive and docs-sync commit is `9d3fbac92`.
- Ticket branch push result: `Completed` (new remote branch)
- Finalization target remote: `origin` (`git@github.com-ryan:AutoByteus/autobyteus-workspace.git`)
- Finalization target branch: `personal`
- Target advanced after verification / acceptance: `No` (still at `88fad73cb`, rechecked immediately before the push)
- Delivery-owned edits protected before re-integration: `Not needed`
- Re-integration before final merge result: `Not needed`
- Target branch update result: `Completed`. An isolated clean clone of `personal` was used because the shared main checkout has unrelated uncommitted work.
- Merge into target result: `Completed`. The `--no-ff` merge is `8bdf184bd` ("Merge verified project-manager-ux"). Its tree `2c2de8bea` is identical to the verified ticket head.
- Push target branch result: `Completed` (`88fad73cb..8bdf184bd`)
- Repository finalization status: `Completed`
- Receipt: `delivery-evidence/dr-002/final-merge.log`

## Version / Tag / Release Commit

**Attempt 1: `v1.4.96-beta.3` (Desktop failed; superseded)**
- `bash scripts/desktop-release.sh beta` exited 0. Release commit `b03c20212`, tag `v1.4.96-beta.3`. Receipt: `delivery-evidence/dr-002/beta3-release.log`.
- Desktop Release run 37614288860 failed at "Resolve Release Metadata › Check repository artifact hygiene". There were 19 tracked paths over 200 characters, which would break the GitHub-hosted Windows checkout:
  - 17 in `tickets/done/grok-compaction-analysis/api-e2e-evidence/live-grok-probe/grok-home/sessions/<URL-encoded temp workspace path>/…`. They were introduced by `a6b858bdf` (another ticket's delivery, already on the base before this integration).
  - 2 in this ticket's own `api-e2e-evidence/user-journey/final-state/project_<uuid>__tasks__project_task_<uuid>__agent_run_resources.json`.
- Delivery miss: the hygiene script was not run locally before tagging. From now on it is a pre-tag delivery check, and it was run before beta.4.
- Android APK Release 37614288842 succeeded. The beta.3 GitHub prerelease therefore exists with only the Android APK and its `.sha256`. It has no desktop assets and no updater metadata.
- iOS 37614288903 and Server Docker 37614288876 were cancelled at the user's direction after beta.4 was cut, to avoid redundant uploads and a `:beta` Docker tag race.
  - No `1.4.96-beta.3` Docker image was published.
  - `:beta` was still at the beta.2 digest until beta.4 replaced it.
- The tag `v1.4.96-beta.3` was **not** moved or deleted.

**Fix**
- `f1d569db4` ("chore(tickets): shorten over-long archived evidence paths for release hygiene"), pushed `b03c20212..f1d569db4`. It changes only archived ticket evidence:
  - The Grok session folder was renamed to `sessions/workspace-session/`. Its original name is recorded in that folder's `PRUNED-BY-DELIVERY.md`.
  - The `project_4772c5e1-…__` prefix was dropped from the project-manager-ux `final-state/` files. A `README.md` records it.
  - Content is unchanged, and no product code changed.
- `python3 scripts/check_repository_artifact_hygiene.py` passes (longest tracked path: 200 characters).

**Attempt 2: `v1.4.96-beta.4` (published)**
- The hygiene check passed locally. `bash scripts/desktop-release.sh beta` exited 0 from the clean finalized `personal`.
- Version `1.4.96-beta.4`. Release commit `0ade50f5a` ("chore(release): bump workspace release version to 1.4.96-beta.4"), pushed `f1d569db4..0ade50f5a`.
- The annotated tag `v1.4.96-beta.4` resolves to `0ade50f5a`. Tag push: `Completed`.
- The product code is identical to beta.3's.
- Commit identity: the host default `normy <normy@macbookpro.speedport.ip>`, which matches previous beta release commits.
- Receipt: `delivery-evidence/dr-002/beta4-release.log`.

## Release / Publication / Deployment

- Applicable: `Yes`. The user requested one new beta.
- Method: `Release Script`, `bash scripts/desktop-release.sh beta`
- Release/publication/deployment result: `Completed` (`v1.4.96-beta.4`)
- Release notes handoff result: `Not required` for publication. The beta helper uses generated notes. The archived `release-notes.md` stays as the product summary for the next stable release.

## Hosted Publication / Rollout Verification

| Tag | Workflow | Run | Result |
| --- | --- | --- | --- |
| v1.4.96-beta.4 | Desktop Release | 37615343293 | Success |
| v1.4.96-beta.4 | Android APK Release | 37615343215 | Success |
| v1.4.96-beta.4 | iOS App Store Connect Release | 37615343143 | Success |
| v1.4.96-beta.4 | Server Docker Release | 37615343268 | Success |
| v1.4.96-beta.3 | Desktop Release | 37614288860 | Failure (hygiene) |
| v1.4.96-beta.3 | Android APK Release | 37614288842 | Success |
| v1.4.96-beta.3 | iOS App Store Connect Release | 37614288903 | Cancelled |
| v1.4.96-beta.3 | Server Docker Release | 37614288876 | Cancelled |

- GitHub release https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.4.96-beta.4:
  - non-draft, marked prerelease;
  - published 2026-10-07T11:41:39Z;
  - 17 assets, none empty (`github-release-beta4.json`).
- Updater metadata: `latest.yml`, `latest-mac.yml`, `latest-linux.yml` and `latest-linux-arm64.yml` all report `version: 1.4.96-beta.4` (`updater-metadata/`).
- Docker:
  - `autobyteus/autobyteus-server:1.4.96-beta.4` and `:beta` share the index digest `sha256:15e01daba2a7ba1b027a611af5ba15411ed134371058920c5030ad04c1f244f8`.
  - The index covers linux/amd64 and linux/arm64.
- The beta.3 prerelease remains, with Android assets only (`github-release-beta3.json`). Beta-channel desktop installs are now offered beta.4.

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux`
- Worktree cleanup result: `Completed`. It was removed after verifying that head `9d3fbac92` is in `origin/personal`. Only the untracked SDK `dist/` build output was discarded.
- Worktree prune result: `Completed`
- Local ticket branch cleanup result: `Completed` (was `9d3fbac92`)
- Remote branch cleanup result: `Completed` (`origin/codex/project-manager-ux` deleted)
- Shared main checkout: fast-forwarded with `--ff-only` after the receipt commit. Unrelated uncommitted work is preserved.
- The isolated finalization clone `/Users/normy/autobyteus_org/autobyteus-worktrees/finalize-project-manager-ux` is removed after the receipt commit is pushed.

## Release Notes Summary

- Release notes artifact created before verification / acceptance: `release-notes.md`
- Archived release notes artifact used for release/publication: not used by the beta helper (generated notes). It is kept for the next stable release.
- Release notes status: `Updated`

## Deployment Steps

- None beyond the tag-triggered workflows above.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Directly Usable — No Migration` (an optional `recipientAddress` on `assigned` entries)
- Delivery action required: `None`

## Verification Checks

- See `handoff-summary.md` › Verification Evidence and the hosted publication checks above.

## Rollback Criteria

- Revert merge `8bdf184bd` on `personal` and cut a new beta. Never move or delete the published tags.
- No data rollback is needed. Older builds tolerate the extra `recipientAddress` key but do not show the recorded worker name.

## Final Status

- Explicit user testing/verification complete: `Yes` (`user-verification-record.md`)
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete or not required: `Yes` (beta `v1.4.96-beta.4` published and verified; beta.3 superseded)
- Applicable safe cleanup complete or not required: `Yes`
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to `/solution_designer`: after this receipt commit is pushed. The message reference is given in the message itself.
