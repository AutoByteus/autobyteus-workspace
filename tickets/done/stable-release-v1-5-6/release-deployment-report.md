# Delivery / Release / Deployment Report — stable v1.5.6

## Current result — DR-002

Stable **v1.5.6** is published fully: a non-prerelease GitHub release, marked Latest, with 17 assets. All four tag-push workflows succeeded, and the release body is byte-equal to the approved notes. Docker `:1.5.6`, `:latest` and `:beta` share one multi-arch digest for linux/amd64 and linux/arm64. No published tag was moved or deleted, and no workflow was rerun or dispatched manually.

## Release / Publication / Deployment Scope

Release-only Task `project_task_784234fc-e6b8-43db-8f87-94e4a4757b13`, package `stable-release-v1-5-6`. `task_size=Small`, `architectural_risk=Low`. Route: direct delivery, named by the user. Implementation, architecture review, code review and API/E2E are `N/A — not applicable` because nothing in the code changed. The classifications of the included feature tickets are unchanged.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `69d7d4f3e643f770b172e565c2d88572f42ded65` (unchanged at `fee828e9cf`).
- Deviations from the guide: `None`. The generic step "push the ticket branch" was not used. RELEASE.md merges the local `codex/` branch into `finalize/<ticket>` and pushes `personal`, so the ticket branch was never pushed.
- Proposed guide fixes: FU-1 and FU-2 from the design spec, recorded for `/project_task_manager`; the user has not agreed to them yet. RELEASE.md Rollback says Docker users can pin an earlier tag to go back, which is not true after a one-way data conversion. No support channel is documented; this release uses GitHub Issues. No guide change was made.

## Handoff Summary

- Handoff summary artifact: `handoff-summary.md` (`Updated`)
- Delivery revision record: `delivery-revision-record.md`, current `DR-002`

## Initial Delivery Integration Refresh

- Bootstrap base: `origin/personal` @ `69d7d4f3e643f770b172e565c2d88572f42ded65`. Re-fetched before the archive commit, before the finalize branch and before the push; it had not moved at any point.
- Base advanced: `No`. New base commits integrated: `No`. Checkpoint commit: `Not needed`. Integration method: `Already current`; the finalize branch takes a `--no-ff` merge of the ticket branch.
- Post-integration check: `git diff --stat v1.5.6-beta.11 HEAD -- . ':!tickets'` is empty (`Passed`). No other rerun was needed because no new base commits came in and there is no product diff from the fully published beta.11.
- Delivery edits started only after the integrated state was current: `Yes`.

## Verification

- Evidence judged: `Sufficient`.
- Evidence relied on: before the cut, the product content was confirmed equal to beta.11, whose four workflows succeeded with 17 assets (`delivery-evidence/dr-001-pre-cut.txt`). After publication, the checks in `delivery-evidence/dr-002-publication.txt`.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 | `gh release view v1.5.6`; `releases/latest` | `isPrerelease=false`, `isDraft=false`; Latest = `v1.5.6`; 17 assets, all `uploaded`, sizes > 0; names match the beta.11 set exactly | Proven |
| AC-002 | `gh run view` for each run and its jobs | Desktop 39229794456, Android 39229794352, iOS 39229794343, Server Docker 39229794344: all `success` on `fee828e9cf`; every job `success`, including Publish GitHub Release and Archive And Upload To App Store Connect | Proven |
| AC-003 | `git diff --name-only v1.5.6-beta.11 v1.5.6 -- . ':!tickets'`; `merge-base --is-ancestor` | Only `.github/release-notes/release-notes.md` and `autobyteus-web/package.json` (version `1.5.6`) changed; `v1.5.6` is an ancestor of `origin/personal` | Proven |
| AC-004 | Raw API `body` compared with the archived `release-notes.md` | Byte-equal (7941 bytes); no internal IDs (ID scan before tagging found none) | Proven |
| AC-005 | Body read for the required statements | Contains the backup advice with the data location, the one-way conversion, "older version … not supported", the GitHub Issues URL, and update-together | Proven |
| AC-006 | Docker Hub registry manifests (anonymous token) | `:1.5.6` = `:latest` = `:beta` = `sha256:375f2ac4b6562ac8a0854c83b3012a2784bce048c67bf4a53eb13fe0b3c4bcf8`, platforms linux/amd64 and linux/arm64. Before the release, `:latest` was 1.5.5 (`sha256:1bdcb7c7…`) and `:beta` was beta.11 (`sha256:aad12e74…`) | Proven |
| AC-007 | Downloaded `latest*.yml` and `.apk.sha256` | All four updater files show `version: 1.5.6` and point at the 1.5.6 files (mac arm64 and x64 zip/dmg). The APK `.sha256` `4103e108…95f4` equals GitHub's asset digest | Proven |
| AC-008 | Delivery record commit on `personal`; worktree and branch removal | Record committed and pushed after this report. Cleanup runs right after the push; its result is in the terminal message to Solution Designer | Completed after this commit (see terminal message) |

- More evidence requested: `None`.
- User check needed: `No`. The user's own update check on a real install is his to do afterward and is not a delivery gate (handoff).

## Release Decision

- Decision: `Stable` `v1.5.6`.
- Decided by: the user, 2026-10-19: "just send to dleiver engineer to do a stable release please". DEC-001 keep F1, DEC-002 GitHub Issues as the support pointer, DEC-003 no extra beta checks.

## Docs Sync Result

- `docs-sync-report.md`: `No impact` beyond the curated notes, which the release helper copies to `.github/release-notes/release-notes.md`.

## Ticket State Transition

- Moved to `tickets/done/stable-release-v1-5-6/` in `9e1bd5cc3a` (before finalization): `Yes`.

## Version / Tag / Release Commit

- `scripts/desktop-release.sh release 1.5.6 --release-notes tickets/done/stable-release-v1-5-6/release-notes.md --branch finalize/stable-release-v1-5-6 --no-push`
- Release commit `fee828e9cfa4d14731e53ac99f6722c337e280d4` ("chore(release): bump workspace release version to 1.5.6"). Annotated tag `v1.5.6`, tag object `82640e0ef67e13b100076747b19416b9a219bd8e`, peels to `fee828e9cf`.
- Before tagging: `check_licensing.py` passed, `check_repository_artifact_hygiene.py` passed (74036 files, longest path 200), and `android-version-code 1.5.6` returned `10050699`. The worktree was clean, with no untracked `dist/`.

## Repository Finalization

- Ticket branch `codex/stable-release-v1-5-6`: archive and DR-001 commit `9e1bd5cc3a` on top of `c580d97be6`. Kept local, per RELEASE.md.
- Finalize branch `finalize/stable-release-v1-5-6` from `origin/personal` `69d7d4f3e6`, with `--no-ff` merge `aab9f2e3a1`, then the release commit `fee828e9cf`.
- Fetch check (unchanged), then `git push origin HEAD:personal` (`69d7d4f3e6..fee828e9cf`) and `git push origin v1.5.6` (new tag).
- Target advanced after verification: `No` before the release push. After it, `personal` advanced to `f59055f13f` with two other tickets' merges. The delivery-record commit was rebased onto that. `v1.5.6` is unaffected and stays at `fee828e9cf`.
- Repository finalization: `Completed`.

## Release / Publication / Deployment

- Applicable: `Yes`. Method: `Project Release Guide` (stable path).
- Pipelines: the four runs above, all `success`. All four started from the tag push, with no manual dispatch.
- Published artifacts: 17 out of 17, matching RELEASE.md's table. TestFlight upload succeeded; public App Store review is external and not claimed. Docker is multi-arch on all three tags.
- Result: `Completed` (not partial). Release notes handoff: `Used` (archived `tickets/done/stable-release-v1-5-6/release-notes.md`).
- Release URL: https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.5.6

## Post-Finalization Cleanup

- Subjects: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/stable-release-v1-5-6`, local branches `codex/stable-release-v1-5-6` and `finalize/stable-release-v1-5-6`. Neither branch exists on the remote, so no remote cleanup is needed.
- Runs after this report is pushed. The actual result is stated in the terminal message to Solution Designer.

## Environment Or Persisted-Data Transition Notes

- Approved decision: `Not Affected` for this ticket. The one-way conversions shipped in the betas, and the notes state them along with backup advice and the support pointer.
- Delivery action required: `None`. No user installs, nodes, volumes or data were touched.

## Rollback Criteria

- Never move or delete `v1.5.6`. A problem in the tag's content is fixed on `personal` and shipped as `1.5.7`.
- The first start converts user data one-way. Going back to an older build is not supported; users are pointed to GitHub Issues. Docker `:latest` and `:beta` only move forward.
- A code rollback means reverting on `personal` and cutting a newer release (RELEASE.md Rollback).

## Final Status

- Verification complete: `Yes`
- Repository finalization complete: `Yes`
- Release/deployment/rollout complete: `Yes` (full, 4/4 workflows, 17/17 assets)
- Safe cleanup: runs after this commit; result in the terminal message
- Unresolved blocker: `None`
- Terminal package eligible: `Yes`, once cleanup succeeds
