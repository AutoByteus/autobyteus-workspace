# Delivery / Release / Deployment Report — package-personal-settings (stage 1)

## Release / Publication / Deployment Scope

Repository finalization of `codex/package-personal-settings` (stage 1) into `origin/personal`, then a beta, then the user's check in the app, per the Task's done-when. Stage 2 was dropped by the user (DEC-010), so stage 1 completes the Task. There is no deployment: the repository deploys no hosted service.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` `51ec39d86c`. It is unchanged since bootstrap.
- Deviations from the guide and why:
  - **The runs were watched one after another, not together.** `RELEASE.md` says to "watch the four runs together … and act on the first failure". Delivery watched them in sequence, so the Server Docker failure (10:39Z) was acted on only after the user reported it, at about 10:49Z. The Desktop publish job's resulting failure was seen later still. Recovery followed the guide once the failure was seen. The release was partial for about an hour.
  - **Delivery had first counted 17 assets as complete.** That count is from an older copy of the guide; the current one says 23, with the server packages.
- Proposed guide fixes, and whether the user agreed: `None`. The guide already says to watch the runs together and covers this recovery. The deviation was delivery's.
- Created by this delivery: `No`

## Handoff Summary

- Handoff summary artifact: `tickets/done/package-personal-settings/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/package-personal-settings/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: `task_size=Large`, `architectural_risk=High`, route `Reviewed`. It went through ARCH-REV-002, CRR-001 Pass (9.3/10), API-REV-001 Pass at 95.0%, and CRR-002 Pass. This is stage 1 only.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `a85bf4f38d`
- Latest tracked remote base reference checked: `origin/personal` `51ec39d86c`, fetched 2026-11-09
- Base advanced since bootstrap or previous refresh: `Yes`, by 30 commits
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed` (`db3cffd862`)
- Integration method: `Merge` (`5a62a061b4`)
- Integration result: `Completed`. One conflict, in `mobile-root-shell.spec.ts`: both sides had made the same baseline fix, and the base's version was taken whole.
- Post-integration executable checks rerun: `Yes`. DEL-01..10 are in `evidence/delivery/`.
- Post-integration verification result: `Passed`, all ten
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`
- Blocker: None

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on:
  - the execution report's Acceptance-Criteria Proof (API-REV-001, 95.0%, target met, no category below 90%);
  - the API-20 real-GitHub files (`personal-settings.final.json`, `backups.txt`, `registry.final.json`);
  - the server E2E logs API-02..08 and API-10 (three runs each);
  - two screenshots: `API-2x-12-confirm-en.png` and `API-2x-06-tools-mark.png`;
  - the integrated rerun DEL-01..10.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 | API-10a, API-10e (DEL-04), API-20 | The run has the personal tool. `git status` of the local package is clean, and the record is in `personal-settings.json`. After a Save, the GitHub install is byte-identical | Proven |
| AC-002 | API-02, API-04 (DEL-03), API-20 click and automatic | Real GitHub: the record keeps the in-app edits, and the install equals HEAD `45012f0`. Fake GitHub: all five edit kinds are kept | Proven (skill/avatar on fake GitHub only) |
| AC-003 | API-03, API-04, API-06, API-20 | Captured `create_task` and `toolsRemoved: [search_web]`. Backups `20261109T090303Z` (2 files) and `20261109T090631Z` (1 file); 5 backups kept | Proven |
| AC-004 | API-05, API-R04 | `UPDATE_FAILED` / `AUTO_FAILED`; install, settings and backups unchanged | Proven (404 emulated) |
| AC-005 | API-07, API-22, screenshot | Reset removes the field and the package value shows; the marks are on Tools and LLM config | Proven |
| AC-006 | API-10a..10d, 10f, 10g (DEL-04) | Effective tools in standalone, Team, Org and delegated runs; a running agent picks up a change without a restart | Proven |
| AC-007 | API-08 | `{not json`: package values, a warning, the file kept; the next save sets it aside as `.unreadable-<time>` | Proven |
| AC-008 | API-21, screenshot | The en and zh-CN texts match the catalogs exactly | Proven |

- More evidence requested: `None`
- User check needed: `Yes`. The Project Task autobyteus-95 says "Done when: the user has approved the model, it's implemented with tests, released as a beta, and the user has checked it", as the Solution Designer quoted it on 2026-11-09. The parts best checked on the user's own machines are AC-001, AC-002/003, AC-005 and AC-008.
- User check reference: the user, 2026-11-09, on his own Mac running `v1.5.13-beta.1`, reported through the Solution Designer's conversation (relayed; not observed by delivery):
  - **AC-001: done.**
    - At his request, his old in-file edits in his two local package checkouts (`autobyteus-agents`, `autobyteus-private-agents`) were moved into `personal-settings.json` as 9 records. Both checkouts were reset to `origin/main`, and the app was restarted.
    - The personal tools came back: the four `droplet_ssh_*` tools reappeared in a running agent through the live tool-list update. The file stayed intact, and `git status` is clean in both checkouts.
    - Adding `generate_image` to `product-video-producer` in the editor stored a personal record (`{toolsAdded: [generate_image], toolsRemoved: [read_media_file]}`), and the package files were untouched.
  - **AC-005: done.** "Reset to the package's setting" on `product-video-producer`, then Save, removed that record. The other 9 records were unchanged and the files untouched. He found the "Personal" label in the edit form.
  - **AC-002/003 (GitHub update): not checked by the user.** Neither of his packages is a GitHub install. In his words: "the github testing will be done I will not to do the testing here". He accepts the team's real-GitHub evidence (API-20..22).
  - **AC-008 (update texts en/zh-CN): not read by the user.** It rests on API-21 and its screenshots.

## Release Decision

- Decision: `Beta`
- Decided by: the user, through the Task's done-when quoted above, and DEC-006 ("stage 1 … merged and released as a beta first"). No stable release is asked for.

## Docs Sync Result

- Docs sync artifact: `tickets/done/package-personal-settings/docs-sync-report.md`
- Docs sync result: `Updated`. The implementation made the changes, and delivery verified them on the integrated state.
- `DESIGN.md`, `TESTING.md` and `RELEASE.md` were checked and need no change. The reasons are in the docs sync report.

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes`
- Archived ticket path: `tickets/done/package-personal-settings/` (stage 1, which completes the Task: stage 2 was dropped by the user, DEC-010)

## Version / Tag / Release Commit

- Release commit `6884309283` `chore(release): bump workspace release version to 1.5.13-beta.1`. It changes only `autobyteus-web/package.json`, from `1.5.12` to `1.5.13-beta.1`, and sits on `personal` `e0c4a239dc`, the stage 1 merge.
- Annotated tag `v1.5.13-beta.1` on `6884309283`. The number comes from `release_versions.py next-beta`; the base is the next patch after the highest stable tag, `v1.5.12`.

## Repository Finalization

- Bootstrap context source: `RELEASE.md` Finalization Target (remote `origin`, branch `personal`)
- Ticket branch: `codex/package-personal-settings`
- Ticket branch commit result: `Completed`. The archive commit is `7cd5457de4`, on merge `5a62a061b4` and checkpoint `db3cffd862`.
- Ticket branch push result: `Completed`. `origin/codex/package-personal-settings` is at `7cd5457de4`, pushed after the Secret Gate passed (21 commits).
- Finalization target remote: `origin`
- Finalization target branch: `personal`
- Target advanced after verification / acceptance: `No`. `origin/personal` stayed at `51ec39d86c` on each fetch.
- Delivery-owned edits protected before re-integration: `Not needed`
- Re-integration before final merge result: `Not needed`
- Target branch update result: `Completed`. `finalize/package-personal-settings` was created from `origin/personal` `51ec39d86c`.
- Merge into target result: `Completed`. `git merge --no-ff` gave `e0c4a239dc`, with a tree identical to the ticket branch. The Secret Gate passed on the merged state.
- Push target branch result: `Completed`. `51ec39d86c..e0c4a239dc`, then the release commit `e0c4a239dc..6884309283`.
- Repository finalization status: `Completed`
- Blocker: None

## Release / Publication / Deployment

- Applicable: `Yes`
- Method: `Project Release Guide`
- Checks before tagging, on `personal` `e0c4a239dc`:
  - `check_licensing.py`: consistent;
  - `check_repository_artifact_hygiene.py`: pass;
  - `check_secrets.sh v1.5.12..HEAD`: PASS, 35 commits. A first run over `v1.5.12-beta.11..HEAD` (39 commits) also passed. Git's version sort ranks that beta above the stable `v1.5.12`, so the stable tag is the correct previous release.
- Release commands:
  - `bash scripts/desktop-release.sh beta --branch finalize/package-personal-settings --no-push`;
  - `git push origin HEAD:personal`;
  - `git push origin v1.5.13-beta.1`, at 2026-11-09T09:46:44Z.
- Pipelines triggered and their results:

| Workflow | Run | Attempt 1 | Final |
| --- | --- | --- | --- |
| Android APK Release | 42595998952 | success, 09:52:28Z | success |
| iOS App Store Connect Release | 42595998979 | success, 10:08:59Z | success (TestFlight upload) |
| Server Docker Release | 42595998924 | **failure**: "Build And Push Server Image" died at 10:39:55Z | success on attempt 2 (`gh run rerun --failed`): image 11:32:41Z, server packages amd64 and arm64 at 11:38 |
| Desktop Release | 42595998872 | all 5 builds succeeded; **failure** in "Publish GitHub Release" at "Wait for the server packages" | success on attempt 2 (`gh run rerun --failed`, publish job only) at 11:42:12Z |

- Failed jobs, triaged as `RELEASE.md` Recovery requires:
  - **Server Docker Release, "Build And Push Server Image" (job 129088685134).**
    - Log line (annotation): "The hosted runner lost communication with the server." No step log was kept (the log blob is missing).
    - The step "Build and push default multi-arch image" has no result after 53 min. Earlier runs of this job took about 44 min.
    - Classification: unclear from the log, so one rerun decided. The rerun of the same commit passed, which makes it **the platform's**: a lost GitHub-hosted runner.
    - Nothing was half-published before the rerun: no `1.5.13-beta.1` image existed, and `:beta` was still on the `v1.5.12` image.
  - **Desktop Release, "Publish GitHub Release" (job 129099528753).**
    - Log line: "The server packages of v1.5.13-beta.1 did not appear within 60 minutes; missing: autobyteus-server-1.5.13-beta.1-linux-x64.tar.gz … The desktop updater files were not published."
    - Classification: a consequence of the Docker failure (the platform's).
    - Action: the guide's "server packages are missing" path. After the Docker rerun put the six package files on the release, delivery reran the Desktop run's failed job. The build jobs were not rerun.
- Published artifacts checked:
  - `gh release view v1.5.13-beta.1`: `isPrerelease: true` with **23 assets**, the complete set per `RELEASE.md`:
    - macOS arm64 and x64: `.dmg`, `.zip` and their blockmaps;
    - Linux x64 and arm64 AppImages;
    - Windows `.exe`;
    - Android APK and `.sha256`;
    - six `autobyteus-server-1.5.13-beta.1-linux-{x64,arm64}.{tar.gz,json,json.sig}` files;
    - four `latest*.yml` files.
  - Order (autobyteus-412): every `latest*.yml` (11:42:08Z) is newer than all six server package files (11:38:16–11:38:47Z).
  - Docker Hub: `autobyteus/autobyteus-server:1.5.13-beta.1` and `:beta` both point to `sha256:3250182e7413…`. `:latest` stays on `v1.5.12` (`sha256:2d8affe595e0…`).
  - Release page: https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.5.13-beta.1
- Release/publication/deployment result: `Completed`, after the recovery above. Between about 10:40Z and 11:42Z it was a partial release: there was no Docker image or server packages, and no updater files, so no desktop was offered the version.
- Release notes handoff result: `Not required`. A pre-release uses GitHub generated notes.

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/package-personal-settings`
- Worktree cleanup result: `Completed` after this record was pushed. Untracked build output `*/dist/` was removed with it.
- Local ticket branch cleanup result: `Completed`. Local `codex/package-personal-settings` and `finalize/package-personal-settings` were deleted.
- Remote branch cleanup result: `Not required`. The ticket branch is kept on `origin`, as for earlier tickets.

## Release Notes Summary

- Release notes status: `Not required`. A beta uses GitHub generated notes (`RELEASE.md`). A later stable release writes curated notes from `handoff-summary.md`, What Changed.

## Deployment Steps

None. Beta users receive the change through the desktop auto-updater, with **Receive beta updates** on, or with `autobyteus-docker upgrade --all --tag beta`.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected` for existing data. The change adds the new files `personal-settings.json` and `backups/`.
- Delivery action required: `None`
- Behavior to note: at the first GitHub update under this version, edits a user made inside package files (before this change) are captured into `personal-settings.json`, and the changed files are backed up. This is designed behavior (REQ-006, AC-003), not a migration.

## Verification Checks

- Artifact hygiene `python3 scripts/check_repository_artifact_hygiene.py` (with tracked imports): Pass
- Licensing `python3 scripts/check_licensing.py`: Pass (`Licensing is consistent.`)
- Secret Gate (`scripts/check_secrets.sh`): PASS for 21 ticket commits before the first push, PASS on the merged state before the `personal` push, and PASS over `v1.5.12..HEAD` (35 commits) before tagging

## Rollback Criteria

- Roll back if personal settings are lost or misapplied, or if updates fail or change package content wrongly. To roll back, revert the merge on `personal` and cut a new release, because desktop updates never downgrade.
- An older build ignores `personal-settings.json` and the backups. After an update under this version, edits live there rather than in the package files, so an older build shows package values. The data is kept and comes back when the user moves forward again. `RELEASE.md` requires no rollback compatibility.

## Final Status

- Verification complete: `Yes`. Verified from the evidence and by the user's check on `v1.5.13-beta.1`: AC-001 and AC-005 by the user; AC-002/003 and AC-008 rest on the evidence, which the user accepted.
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete or not required: `Yes` (beta `v1.5.13-beta.1`, complete after the recovery)
- Applicable safe cleanup complete or not required: `Yes`
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
