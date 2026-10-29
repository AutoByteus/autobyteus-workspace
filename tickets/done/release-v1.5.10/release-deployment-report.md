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

Recorded below as each step completes.
