# Release Requested — autobyteus-486: a new beta from `personal`

- Classification: `Release Requested` (no change to the software; nothing to investigate or design)
- Project Task: `autobyteus-486` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), assigned by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) on 2026-11-12
- Requested by: the user, relayed by the PM in his words (2026-11-12): "lets create a beta release please".
- Worktree / branch / base: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-beta-486`, `codex/release-beta-486`, from `origin/personal` @ `a9f2b9f296`. Finalization target: `origin/personal`.

## Version

- Tags were fetched on 2026-11-12. The newest is `v1.5.13-beta.5` (`f35447286d`, contained in `personal`). The latest stable is `v1.5.12` (`8338f97e59`).
- So this is presumably **`v1.5.13-beta.6`**. Confirm with `release_versions.py next-beta`.

## Content

The Solution Designer checked the content with `git log --merges --first-parent v1.5.13-beta.5..origin/personal`. There are two merges, and 39 files outside `tickets/` change:

| Merge | Ticket | Notes source |
| --- | --- | --- |
| `ae5ac8e9ce` | autobyteus-480 `markdown-heading-links-480` | `release-notes.md`: a Contents link (`#heading`) in rendered Markdown scrolls to its heading; headings get GitHub-compatible ids; a link to another file or a broken anchor does nothing instead of breaking the page |
| `0c5f02bdfa` | autobyteus-473 `phone-background-tasks-473` | `release-notes.md`: the phone's Activity shows the open agent's background tasks live; a viewer that opens a run later sees its current tasks (Claude, AutoByteus, Antigravity) |

- The commits on the first-parent line that are not merges touch only `tickets/`.
- `autobyteus-android` and `autobyteus-ios` are unchanged since beta.5 (`git diff --stat` is empty). So **no new Android app is needed**: these are page changes served by the node.
  - Confirm this against the two tickets' notes.
  - The notes say no new APK is needed. People who skipped beta.5 still need its APK.
- `scripts/public/docker` is unchanged since beta.5, so the launcher does not need a reinstall.
- Not in this beta: 457, 461 (designs running) and the follow-up tickets.
- Re-check by ancestry right before writing the notes. Anything merged later that the Task does not name needs the PM's word before it ships.

## Notes

- "What you need to do" comes first:
  - no new Android app in this beta, but anyone who has not installed beta.5's app should;
  - update the nodes (`autobyteus-docker upgrade --all --tag beta`), or let them update on the beta channel; the launcher is unchanged;
  - the desktop updates itself;
  - **keep beta.5's line**: do not go back to an older version after updating. Since 469's collaboration-tree change, an older version is not safe to run on the same data.
- Then what changed: Markdown Contents links (480) and background tasks on the phone (473).

## Smoke check and waivers

- Run the full `python3 scripts/release_smoke.py` on all five runtimes, as `RELEASE.md` says. Don't write into the worktree during the run.
- **Grok:** the user's standing word (verbatim, 2026-11-11) is "Waive grok if no usage limit anymore".
  - It covers only a Grok case that fails on a usage or rate limit. Record that case with this quote.
  - Any other Grok failure: ask him.
- **Every other runtime** that fails only on a quota needs his own waiver words at release time. Record them verbatim.
- DeepSeek Harness is not in the smoke run (known 400).

## Constraints (from the Task and `RELEASE.md`)

- Follow `RELEASE.md` as on `personal`:
  - the Secret Gate first;
  - no build-only run per tag;
  - triage every pipeline failure first;
  - `latest*.yml` only after the six server packages;
  - `:beta` moves with the newest tag, and `:latest` stays on v1.5.12;
  - never move or delete a published tag.
- **Watch all four workflows together.**
- **Do not touch the user's running app or nodes.** Teams 457, 461 and 484 may be running. The PM checks versions afterwards.
- After the last push, bring the user's checkout of `personal` up to date:
  - `git fetch`, then `git merge --ff-only`;
  - never stash, reset, check out or commit;
  - report the line "User's checkout of the target branch: Updated to <commit> / Not updated: why".
- Clean up everything you create, including this worktree and its branches. Record the delivery record on `personal`.

## Done when (from the Task)

- Published and verified:
  - the tag;
  - the GitHub pre-release with all 23 assets;
  - the four workflows;
  - Docker `:beta`.
- The smoke result is recorded, with any waiver in his words.
- The delivery record is on `personal`, and cleanup is done.
- Return `Delivery Completed` to the Solution Designer. The PM verifies and reports to the user.
