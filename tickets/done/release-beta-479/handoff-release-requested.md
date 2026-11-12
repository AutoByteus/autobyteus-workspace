# Release Requested — autobyteus-479: a new beta from `personal`

- Classification: `Release Requested` (no change to the software; nothing to investigate or design)
- Project Task: `autobyteus-479` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), assigned by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) on 2026-11-12
- Requested by: the user, relayed by the PM in his words (2026-11-12): "Let's create a new beta".
- Worktree / branch / base: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-beta-479`, `codex/release-beta-479`, from `origin/personal` @ `55a80dc691`. Finalization target: `origin/personal`.

## Version

- Tags checked by the Solution Designer (fetched 2026-11-12):
  - the newest tag is `v1.5.13-beta.4` (on `1ca4be9bfb`, contained in `personal`), from the `release-beta-18` ticket (`tickets/done/release-beta-18/`; autobyteus-18, not dispatched by the PM);
  - the latest stable is `v1.5.12` (`8338f97e59`).
- So this is presumably **`v1.5.13-beta.5`**. Confirm with `release_versions.py next-beta`.

## Content

Checked by the Solution Designer with `git log --merges --first-parent v1.5.13-beta.4..origin/personal`. Seven merges:

| Merge | Ticket | Notes source |
| --- | --- | --- |
| `e6d3902477` | autobyteus-472 `phone-viewer-pinch-zoom-472` | `release-notes.md`. PDFs and images zoom by touch and keep it across a refresh; Download saves to the phone's Downloads. **Needs the new Android APK** |
| `cfc606659f` | autobyteus-452 `open-file-live-refresh-452` | `release-notes.md`. An open workspace file refreshes by itself (desktop and phone) |
| `8a319100d8` | autobyteus-471 `desktop-node-file-open-471` | `release-notes.md`. The desktop opens node files read-only; a remote run's path names its node; the phone shows text files of any size |
| `1ee1ea61cf`, `827f1e68dc` | autobyteus-469 `collaboration-tree-open-tasks-only-469` | `release-notes.md`. A run's collaboration tree lists only runs whose Task is open |
| `388386dcb5` | `model-settings-reality` (autobyteus-9; not dispatched by the PM) | `handoff-summary.md` (no `release-notes.md`). Claude thinking settings tell the truth |
| `ee46b59310` | autobyteus-464 `task-copy-assignment-race-464` | `handoff-summary.md`. Closing a copy's Task and giving the same copy its next Task in parallel works in either order |

- The first-parent commits that are not merges touch only `tickets/`, so they are records with no software change.
- `scripts/public/docker` is unchanged since beta.4, so no launcher reinstall is needed.
- Not in this beta: 457 and 461, whose designs are running, and the follow-up tickets.
- Re-check by ancestry right before writing the notes. Anything merged later that the Task does not name needs the PM's word before it ships.

## Notes

- "What you need to do" comes first:
  - install the new Android app (APK). Download and zoom need it, and it also brings beta.3's fixes to anyone who has not installed that yet;
  - update the nodes (`autobyteus-docker upgrade --all --tag beta`), or let them update on the beta channel; the launcher is unchanged;
  - the desktop updates itself.
- Then what changed, from the sources above.

## Smoke check and waivers

- Run the full `python3 scripts/release_smoke.py` on all five runtimes, as `RELEASE.md` says. Don't write into the worktree during the run.
- **Grok:** the user's standing word (verbatim, 2026-11-11) is "Waive grok if no usage limit anymore".
  - The PM reads it as: a Grok case that fails **only** on a usage or rate limit may be waived. Record the waiver with that quote.
  - Any other Grok failure is not waived: ask him.
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
- **Do not touch the user's running app or nodes.** Several teams may be running on them, including 461's on `personal`-side code. The PM checks versions afterwards.
- After the last push, bring the user's checkout of `personal` up to date:
  - `git fetch`, then `git merge --ff-only`;
  - never stash, reset, check out or commit;
  - report the line "User's checkout of the target branch: Updated to <commit> / Not updated: why".
- Clean up everything you create, this worktree and its branches included. Record the delivery record on `personal`.

## Done when (from the Task)

- The tag, the GitHub pre-release with all 23 assets, the four workflows and Docker `:beta` are published and verified.
- The smoke result, and any waiver in his words, is recorded.
- The delivery record is on `personal`, and cleanup is done.
- Return `Delivery Completed` to the Solution Designer. The PM verifies and reports to the user.
