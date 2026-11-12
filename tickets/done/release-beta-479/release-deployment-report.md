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

Pending (recorded after publication)

## Repository Finalization

Pending (recorded after publication)

## Release / Publication / Deployment

Pending (recorded after publication)

## Release Notes Summary

- Release notes artifact: `tickets/done/release-beta-479/release-notes.md`. It is put above the GitHub generated notes after the workflows succeed.
- Tickets whose "What you need to do" sections were used:
  - 472: the Android app for Download;
  - 469: do not go back to an older version; contact support instead.
- Added from the handoff: the node and desktop lines.
- "What's new" comes from the four tickets' `release-notes.md` and the two handoff summaries (model-settings-reality, 464).
- Result: Pending (recorded after publication)

## Post-Finalization Cleanup

Pending (recorded after publication)

## Rollback Criteria

- **Not rollback-safe on the same data** (autobyteus-469): an older build would not see agents delegated after the update. The notes say so and tell users to contact support instead of installing an older build. This follows `RELEASE.md` § Rollback for a change that older builds do not read correctly.
- A defect is fixed forward with the next beta. `:beta` only moves forward.

## Final Status

Pending (recorded after publication)
