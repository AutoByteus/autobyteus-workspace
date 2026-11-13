# Delivery / Release / Deployment Report — release-beta-486

## Release / Publication / Deployment Scope

A release request (`Release Requested`, Project Task autobyteus-486): a new beta pre-release from `personal`. There is no change to the software. Docs sync, the handoff summary and Verify From Evidence do not apply; the release guide's checks are the verification.

- Requested by: the user, relayed by the Project Task Manager on 2026-11-12: "lets create a beta release please".
- Content (`git log --merges --first-parent v1.5.13-beta.5..HEAD`, re-checked just before tagging):

| Merge | Ticket | Notes source |
| --- | --- | --- |
| `ae5ac8e9ce` | autobyteus-480 `markdown-heading-links-480` | its `release-notes.md` |
| `0c5f02bdfa` | autobyteus-473 `phone-background-tasks-473` | its `release-notes.md` |

- `autobyteus-android`, `autobyteus-ios` and `scripts/public/docker` are unchanged since `v1.5.13-beta.5` (`git diff --stat` is empty). Neither ticket's notes ask for a new app. So no new APK and no launcher reinstall; people who skipped beta.5 still need its APK.
- Not in this beta: 457, 461 and the follow-up tickets.
- The user's running app and nodes were not touched.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` `a9f2b9f296`. It is unchanged since `v1.5.13-beta.5`, as is `TESTING.md`.
- Deviations from the guide and why: the beta notes carry a "What's new" above the generated notes, as the handoff asked. There are no others.
- Proposed guide fixes, and whether the user agreed: `None`
- Created by this delivery: `No`

## Checks Before Tagging

Run on `codex/release-beta-486` at `29dbc5c3c2` (`origin/personal` `a9f2b9f296` plus the handoff document only), after `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts prebuild`:

- `python3 scripts/check_licensing.py`: `Licensing is consistent.`
- `python3 scripts/check_repository_artifact_hygiene.py`: exit 0, which includes tracked imports
- `scripts/check_secrets.sh v1.5.13-beta.5..HEAD`: PASS, 28 commits
- `python3 scripts/release_smoke.py`: **exit 0, PASS**, 2026-11-12T11:40:11Z–11:43:24Z. Summary in `evidence/DEL-01-release-smoke.log`.
  - Claude (haiku), 3/3;
  - Codex (`gpt-5.6-luna`), 3/3;
  - Grok (`grok-4.7`), 3/3;
  - Antigravity, 2/2;
  - AutoByteus, 2/2;
  - worktree left unchanged: pass. Nothing was written during the run.
- Waivers: none used. The standing Grok word ("Waive grok if no usage limit anymore") was not needed.

## Release Decision

- Decision: `Beta`
- Decided by: the user ("lets create a beta release please", relayed by the Project Task Manager, 2026-11-12)

## Version / Tag / Release Commit

- Release commit `3228eff74b` `chore(release): bump workspace release version to 1.5.13-beta.6`. It changes only `autobyteus-web/package.json`, from `1.5.13-beta.5` to `1.5.13-beta.6`, and sits on the merge `e85013bdf9`.
- Annotated tag `v1.5.13-beta.6` on `3228eff74b`, pushed at 2026-11-12T11:44:37Z. The number comes from `release_versions.py next-beta`.

## Repository Finalization

- Ticket branch: `codex/release-beta-486`. The handoff `29dbc5c3c2` and the record `c249b0ca29` were pushed after the Secret Gate passed.
- Finalization target: `origin/personal`. It was unmoved at `a9f2b9f296` before each push.
- Merge into target: `finalize/release-beta-486` from `origin/personal`, `git merge --no-ff` gave `e85013bdf9` (tree identical, Secret Gate PASS), pushed `a9f2b9f296..e85013bdf9`. Then the release commit `e85013bdf9..3228eff74b`, then this record commit (see `delivery-revision-record.md`).
- User's checkout of the target branch (`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`): `Updated to 3228eff74b` (the release commit), 2026-11-12. It was on `personal` with no local commits, 4 commits behind; `git fetch`, then `git merge --ff-only origin/personal`, exit 0. Its 42 uncommitted entries were kept untouched. After this record's push it is fast-forwarded once more to the record commit; that result is in the terminal message.
- Repository finalization status: `Completed`

## Release / Publication / Deployment

- Applicable: `Yes`
- Method: `Project Release Guide`
- Pipelines triggered and their results. All four were watched together by one poll every 60 s that stops at the first failure:

| Workflow | Run | Result |
| --- | --- | --- |
| Android APK Release | 43211753722 | success |
| iOS App Store Connect Release | 43211753733 | success (TestFlight upload) |
| Server Docker Release | 43211753804 | success; image 12:17:31Z, server packages 12:43–12:44Z |
| Desktop Release | 43211753830 | success; all four completed by 12:45:04Z |

- Failed jobs: none.
- Published artifacts checked:
  - `gh release view v1.5.13-beta.6`: `isPrerelease: true` with **23 assets**, the complete set:
    - macOS arm64 and x64: `.dmg`, `.zip` and their blockmaps;
    - Linux x64 and arm64 AppImages;
    - Windows `.exe`;
    - Android APK and `.sha256`;
    - six `autobyteus-server-1.5.13-beta.6-linux-{x64,arm64}.{tar.gz,json,json.sig}` files;
    - four `latest*.yml` files.
  - Order: every `latest*.yml` (12:44:26Z) is newer than all six server package files (12:43:26Z–12:44:03Z).
  - Docker Hub: `autobyteus/autobyteus-server:1.5.13-beta.6` and `:beta` both point to `sha256:a6efd40295da…`. `:latest` stays on `v1.5.12` (`sha256:2d8affe595e0…`).
  - Release page: https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.5.13-beta.6
- Release/publication/deployment result: `Completed`
- Release notes handoff result: `Used`, as below.

## Release Notes Summary

- Release notes artifact: `tickets/done/release-beta-486/release-notes.md`. It is put above the GitHub generated notes after the workflows succeed.
- Neither ticket has a "What you need to do" section.
- The section carries:
  - from the handoff: the node and desktop lines, and the note that there is no new app (install beta.5's if skipped);
  - beta.5's line, which still applies since 469: do not go back to an older version.
- 480's "Rolling back is possible" line is left out, because since 469 it no longer holds for the release as a whole.
- Result: Put above the generated notes after all four succeeded, with `gh release edit v1.5.13-beta.6 --notes-file`. The body starts with `## What you need to do`, and the generated "Full Changelog" link stays below. The assets are unchanged (23).

## Post-Finalization Cleanup

- Created by this delivery and removed after the record push:
  - the worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/release-beta-486`;
  - the local branches `codex/release-beta-486` and `finalize/release-beta-486`;
  - the temp files `/tmp/rb486-*`.
- The smoke run passed, so it kept no step logs.
- Remote branch: `origin/codex/release-beta-486` is kept, as for earlier tickets.
- No test instances were started. The user's running app and nodes were not touched.

## Rollback Criteria

- Not rollback-safe on the same data since `v1.5.13-beta.5` (autobyteus-469). The notes keep that line.
- A defect is fixed forward with the next beta. `:beta` only moves forward.

## Final Status

- Verification complete (the release guide's checks; smoke exit 0, no waiver): `Yes`
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete or not required: `Yes`. Beta `v1.5.13-beta.6` is complete: 4/4 workflows, 23 assets, `:beta`.
- Applicable safe cleanup complete or not required: `Yes`
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal message/reference: `Delivery Completed` to the Solution Designer
