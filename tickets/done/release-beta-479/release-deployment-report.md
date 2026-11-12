# Delivery / Release / Deployment Report — release-beta-479

## Release / Publication / Deployment Scope

A release request (`Release Requested`, Project Task autobyteus-479): a new beta pre-release from `personal`. There is no change to the software. Docs sync, the handoff summary and Verify From Evidence do not apply; the release guide's checks are the verification.

- Requested by: the user, relayed by the Project Task Manager on 2026-11-12: "Let's create a new beta".
- Content (`git log --merges --first-parent v1.5.13-beta.4..HEAD`, re-checked just before tagging):

| Merge | Ticket | Notes source |
| --- | --- | --- |
| `e6d3902477` | autobyteus-472 `phone-viewer-pinch-zoom-472`; Download needs the new Android APK | its `release-notes.md` |
| `cfc606659f` | autobyteus-452 `open-file-live-refresh-452` | its `release-notes.md` |
| `8a319100d8` | autobyteus-471 `desktop-node-file-open-471` | its `release-notes.md` |
| `1ee1ea61cf`, `827f1e68dc` | autobyteus-469 `collaboration-tree-open-tasks-only-469`; **its notes say not to go back to an older version** | its `release-notes.md` |
| `388386dcb5` | `model-settings-reality` (autobyteus-9) | its `handoff-summary.md` |
| `ee46b59310` | autobyteus-464 `task-copy-assignment-race-464` | its `handoff-summary.md` |

- Launcher: `scripts/public/docker/` is unchanged since `v1.5.13-beta.4`, so there is no reinstall.
- Not in this beta: 457 and 461, whose designs are running, and the follow-up tickets.
- The user's running app and nodes were not touched.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` `55a80dc691`. It is unchanged since `v1.5.13-beta.4`, as is `TESTING.md`.
- Deviations from the guide and why: the beta notes carry a "What's new" above the generated notes, as the handoff asked. There are no others.
- Proposed guide fixes, and whether the user agreed: `None`
- Created by this delivery: `No`

## Checks Before Tagging

Run on `codex/release-beta-479` at `1f3f01ebc8` (`origin/personal` `55a80dc691` plus the handoff document only), after `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts prebuild`:

- `python3 scripts/check_licensing.py`: `Licensing is consistent.`
- `python3 scripts/check_repository_artifact_hygiene.py`: exit 0, which includes tracked imports
- `scripts/check_secrets.sh v1.5.13-beta.4..HEAD`: PASS, 136 commits
- `python3 scripts/release_smoke.py`: **exit 0, PASS**, 2026-11-12T03:21:36Z–03:24:10Z. Summary in `evidence/DEL-01-release-smoke.log`.
  - Claude (haiku), 3/3;
  - Codex (`gpt-5.6-luna`), 3/3;
  - Grok (`grok-4.5`; the pinned `grok-4.7` was not offered), 3/3;
  - Antigravity, 2/2;
  - AutoByteus, 2/2;
  - worktree left unchanged: pass. Nothing was written during the run.
- Waivers: none used. The user's standing Grok word ("Waive grok if no usage limit anymore") was not needed. DeepSeek Harness is not part of the smoke run.

## Release Decision

- Decision: `Beta`
- Decided by: the user ("Let's create a new beta", relayed by the Project Task Manager, 2026-11-12)

## Version / Tag / Release Commit

- Release commit `f35447286d` `chore(release): bump workspace release version to 1.5.13-beta.5`. It changes only `autobyteus-web/package.json`, from `1.5.13-beta.4` to `1.5.13-beta.5`, and sits on the merge `92f6a976de`.
- Annotated tag `v1.5.13-beta.5` on `f35447286d`, pushed at 2026-11-12T03:25:11Z. The number comes from `release_versions.py next-beta`.

## Repository Finalization

- Ticket branch: `codex/release-beta-479`. The handoff `1f3f01ebc8` and the record `79cf0c570f` were pushed after the Secret Gate passed.
- Finalization target: `origin/personal`. It was unmoved at `55a80dc691` before each push.
- Merge into target: `finalize/release-beta-479` from `origin/personal`, `git merge --no-ff` gave `92f6a976de` (tree identical, Secret Gate PASS), pushed `55a80dc691..92f6a976de`. Then the release commit `92f6a976de..f35447286d`, then this record commit (see `delivery-revision-record.md`).
- User's checkout of the target branch (`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`): `Updated to f35447286d` (the release commit), 2026-11-12. It was on `personal` with no local commits, 4 commits behind; `git fetch`, then `git merge --ff-only origin/personal`, exit 0. Its 42 uncommitted entries were kept untouched. After this record's push it is fast-forwarded once more to the record commit; that result is in the terminal message.
- Repository finalization status: `Completed`

## Release / Publication / Deployment

- Applicable: `Yes`
- Method: `Project Release Guide`
- Pipelines triggered and their results. All four were watched together by one poll every 60 s that stops at the first failure:

| Workflow | Run | Result |
| --- | --- | --- |
| Android APK Release | 43148081591 | success |
| iOS App Store Connect Release | 43148081592 | success (TestFlight upload) |
| Server Docker Release | 43148081620 | success; image 03:51:40Z, server packages 04:07–04:09Z |
| Desktop Release | 43148081801 | success; all four completed by 04:10:13Z |

- Failed jobs: none.
- Published artifacts checked:
  - `gh release view v1.5.13-beta.5`: `isPrerelease: true` with **23 assets**, the complete set:
    - macOS arm64 and x64: `.dmg`, `.zip` and their blockmaps;
    - Linux x64 and arm64 AppImages;
    - Windows `.exe`;
    - Android APK and `.sha256`;
    - six `autobyteus-server-1.5.13-beta.5-linux-{x64,arm64}.{tar.gz,json,json.sig}` files;
    - four `latest*.yml` files.
  - Order: every `latest*.yml` (04:09:23Z) is newer than all six server package files (04:07:46Z–04:09:05Z).
  - Docker Hub: `autobyteus/autobyteus-server:1.5.13-beta.5` and `:beta` both point to `sha256:ea309062d582…`. `:latest` stays on `v1.5.12` (`sha256:2d8affe595e0…`).
  - Release page: https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.5.13-beta.5
- Release/publication/deployment result: `Completed`
- Release notes handoff result: `Used`, as below.

## Release Notes Summary

- Release notes artifact: `tickets/done/release-beta-479/release-notes.md`. It is put above the GitHub generated notes after the workflows succeed.
- Tickets whose "What you need to do" sections were used:
  - 472: the Android app for Download;
  - 469: do not go back to an older version; contact support instead.
- Added from the handoff: the node and desktop lines.
- "What's new" comes from the four tickets' `release-notes.md` and the two handoff summaries (model-settings-reality, 464).
- Result: Put above the generated notes after all four succeeded, with `gh release edit v1.5.13-beta.5 --notes-file`. The body starts with `## What you need to do`, and the generated "Full Changelog" link stays below. The assets are unchanged (23).

## Post-Finalization Cleanup

- Created by this delivery and removed after the record push:
  - the worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/release-beta-479`;
  - the local branches `codex/release-beta-479` and `finalize/release-beta-479`;
  - the temp files `/tmp/rb479-*`.
- The smoke run passed, so it kept no step logs.
- Remote branch: `origin/codex/release-beta-479` is kept, as for earlier tickets.
- No test instances were started. The user's running app and nodes were not touched.

## Rollback Criteria

- **Not rollback-safe on the same data** (autobyteus-469): an older build would not see agents delegated after the update. The notes say so and tell users to contact support instead of installing an older build. This follows `RELEASE.md` § Rollback for a change that older builds do not read correctly.
- A defect is fixed forward with the next beta. `:beta` only moves forward.

## Final Status

- Verification complete (the release guide's checks; smoke exit 0, no waiver): `Yes`
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete or not required: `Yes`. Beta `v1.5.13-beta.5` is complete: 4/4 workflows, 23 assets, `:beta`.
- Applicable safe cleanup complete or not required: `Yes`
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal message/reference: `Delivery Completed` to the Solution Designer
