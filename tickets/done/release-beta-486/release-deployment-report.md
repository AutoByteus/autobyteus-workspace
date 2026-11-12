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

Pending (recorded after publication)

## Repository Finalization

Pending (recorded after publication)

## Release / Publication / Deployment

Pending (recorded after publication)

## Release Notes Summary

- Release notes artifact: `tickets/done/release-beta-486/release-notes.md`. It is put above the GitHub generated notes after the workflows succeed.
- Neither ticket has a "What you need to do" section.
- The section carries:
  - from the handoff: the node and desktop lines, and the note that there is no new app (install beta.5's if skipped);
  - beta.5's line, which still applies since 469: do not go back to an older version.
- 480's "Rolling back is possible" line is left out, because since 469 it no longer holds for the release as a whole.
- Result: Pending (recorded after publication)

## Post-Finalization Cleanup

Pending (recorded after publication)

## Rollback Criteria

- Not rollback-safe on the same data since `v1.5.13-beta.5` (autobyteus-469). The notes keep that line.
- A defect is fixed forward with the next beta. `:beta` only moves forward.

## Final Status

Pending (recorded after publication)
