# Delivery / Release / Deployment Report

## Release / Publication / Deployment Scope

- Release request autobyteus-322: the stable release `v1.5.10` from `origin/personal`, at the user's request (2026-10-29).
- No software change. The content is everything on `personal` since `v1.5.9`, which is autobyteus-320 (the web UI cleanup round), already shipped as beta `v1.5.10-beta.1`.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `aca8655bdd`, read from `origin/personal` @ `5562fc73e6` in the release worktree
- Deviations from the guide and why: `None` for this release.
- Earlier deviation, corrected: the `v1.5.10-beta.1` delivery (autobyteus-320) recorded the wrong guide revision. It made no build-only run and watched the runs one after another. All four runs succeeded with 17/17 assets. A correction section was added to `tickets/done/web-ui-cleanup-round/release-deployment-report.md`.
- Proposed guide fixes: `None`

## Handoff Summary

- Not applicable for a release request (no validated package); this report, `delivery-revision-record.md` and `release-notes.md` are the release request's documents.
- Delivery revision record: `delivery-revision-record.md`; current delivery revision ID: `DR-001`

## Verification (the release guide's checks)

- Content decision, between the tested beta and the `personal` tip:
  - `git log v1.5.10-beta.1..origin/personal` gives only `5562fc73e6`, autobyteus-320's delivery record. `git diff --name-only v1.5.10-beta.1 origin/personal` lists only `tickets/done/web-ui-cleanup-round/release-deployment-report.md`.
  - The tip therefore carries the beta's software, and the release is cut from `personal` as RELEASE.md says.
- The beta's evidence: proven from a clean clone (autobyteus-320 DR-001); 4/4 workflows; 17/17 assets; Docker `1.5.10-beta.1` on amd64/arm64.
- Before the tag (recorded in the Release Record below):
  - Secret Gate;
  - `check_licensing.py` and `check_repository_artifact_hygiene.py` on the merged state;
  - build-only release run `pnpm release:test --ref personal`.

## Release Decision

- Decision: `Stable`, `v1.5.10`
- Decided by: the user, through the Project Task Manager's Task "Publish the next stable release, v1.5.10, from origin/personal, following RELEASE.md." (2026-10-29)
- Version: the next patch after the highest stable tag `v1.5.9`. `v1.5.10` did not exist on the remote (`git ls-remote --tags origin v1.5.10` was empty on 2026-10-29).

## Release Notes

- Ticket notes: `tickets/done/release-v1.5.10/release-notes.md`. They are user-facing and functional, with no internal IDs.
  - What's new since 1.5.9, as listed in the request.
  - "Before You Update" carries the 1.5.9 rollback warnings forward: this release converts no data, and going back before 1.5.9 is still not supported.
  - Docker and desktop upgrade notes.
- The release script copies them to `.github/release-notes/release-notes.md` in the tagged revision.

## Ticket State Transition

- Ticket moved to `tickets/done/release-v1.5.10/` before the final commit: `Yes`

## Constraints Kept

- No published tag was moved or deleted; `v1.5.9-beta.14` stays as the partial pre-release it is.
- The user's nodes and app were not touched; he upgrades his nodes himself (`autobyteus-docker upgrade --all --tag latest`).

## Rollback Criteria

- Revert on `personal` and cut a new release. Desktop updates never downgrade, and Docker `:latest`/`:beta` only move forward.
- This release converts no data, so going back to `1.5.10-beta.1` or `1.5.9` is data-compatible. Going back before `1.5.9` is not supported (the 1.5.9 conversions).

## Release Record

### Repository Finalization

- Ticket branch `codex/release-v1.5.10`: archive commit `6651380444`, which holds the release notes, this report and the correction to the beta record. It was pushed to origin after the Secret Gate passed.
- `finalize/release-v1.5.10` was created from `origin/personal` @ `5562fc73e6` and merged with `git merge --no-ff` → `bd67046ddc`.
- On the merged state: Secret Gate PASS, `check_repository_artifact_hygiene.py` exit 0, `check_licensing.py` "Licensing is consistent."
- Pushed `5562fc73e6..bd67046ddc HEAD -> personal`. Repository finalization: `Completed`.

### Build-Only Release Run (before the tag)

- `pnpm release:test --ref personal` dispatched `release-desktop.yml` run `40819786999` on `personal` @ `bd67046ddc` (04:48:21Z).
- Result: `success`. All five builds succeeded: macOS ARM64, macOS Intel x64, Windows x64, Linux x64, Linux ARM64. "Publish GitHub Release" was `skipped`, as a build-only run should be.

### Version / Tag / Release Commit

- The worktree was clean. Ran `bash scripts/desktop-release.sh release 1.5.10 --release-notes tickets/done/release-v1.5.10/release-notes.md --branch finalize/release-v1.5.10 --no-push`.
- Release commit `d38cf5fb46` "chore(release): bump workspace release version to 1.5.10" changes `autobyteus-web/package.json` to `1.5.10` and `.github/release-notes/release-notes.md`, which is identical to the ticket notes. The annotated tag `v1.5.10` is on that commit.
- `git fetch origin personal` confirmed `personal` was still `bd67046ddc`. Then: Secret Gate PASS, `bd67046ddc..d38cf5fb46 HEAD -> personal`, and `[new tag] v1.5.10` (05:15:03Z).

### Rollout (the four runs watched together, polled every minute, set to stop on the first failure)

| Run | Workflow | Result | Finished |
| --- | --- | --- | --- |
| `40822289655` | Android APK Release | success | 05:20:09Z |
| `40822289684` | iOS App Store Connect Release (TestFlight upload) | success | 05:33:32Z |
| `40822289647` | Desktop Release | success | 05:44:34Z |
| `40822289644` | Server Docker Release | success | 06:02:09Z |

- The first watcher stopped when the user restarted the session (about 05:29Z). The runs were checked again right away, with no failures, and a new watcher was started. It reported all four succeeded at 06:02:17Z.

### Published Artifacts Checked

- GitHub release `v1.5.10` (https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.5.10):
  - **Latest** (`gh release list`), not a pre-release, not a draft;
  - **17 assets**: Android APK + `.sha256`; Linux arm64 and x64 AppImages; macOS arm64 and x64 `.dmg`/`.zip`, each with its blockmap; Windows `.exe`; `latest-linux-arm64.yml`, `latest-linux.yml`, `latest-mac.yml`, `latest.yml`;
  - its notes are the curated notes, starting "## Before You Update".
- Docker Hub `autobyteus/autobyteus-server`:
  - `1.5.10`, `:latest` and `:beta` all on `sha256:a1c22e2e…3fa7cd`, for amd64 and arm64. `:beta` moved, because the newest tag is now this stable release, as RELEASE.md says;
  - `1.5.10-beta.1` is unchanged (`sha256:f6f8699c…b152b6`).
- Release result: `Completed` (4/4 workflows, 17/17 assets, Latest, Docker tags as required). Nothing is partial.

### Constraints

- No published tag was moved or deleted (`v1.5.9-beta.14` is untouched).
- The user's nodes and app were not touched; he upgrades his nodes with `autobyteus-docker upgrade --all --tag latest`.

### Post-Release Cleanup

- Release worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/release-v1.5.10` was clean, then removed and pruned.
- Local branches `codex/release-v1.5.10` (`6651380444`) and `finalize/release-v1.5.10` (`d38cf5fb46`) were deleted; both are contained in `origin/personal`.
- `origin/codex/release-v1.5.10` is kept as the pushed ticket history.
- The main checkout was not touched.
- This record was committed from a temporary detached checkout of `origin/personal` (`/tmp/ab322-record`), which is removed after the push.

### Final Status

- Verification (the release guide's checks): `Completed`
- Repository finalization: `Completed`
- Release: `Completed`
- Cleanup: `Completed`
- Unresolved blocker: `None`
- Terminal package sent to the Solution Designer: sent with `send_message_to` to `/software_engineering_team/solution_designer` right after this record is pushed (confirmed in the delivery conversation)
