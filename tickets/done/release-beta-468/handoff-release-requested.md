# Release Requested — autobyteus-468: a new beta from `personal`

- Classification: `Release Requested` (no change to the software; nothing to investigate or design)
- Project Task: `autobyteus-468` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), assigned by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) on 2026-11-10
- Requested by: the user, relayed by the PM in his words (2026-11-10): "Okay let's release a new beta". He said it after the PM told him what the beta carries and that the desktop and nodes restart on the update.
- Worktree / branch / base: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-beta-468`, `codex/release-beta-468`, from `origin/personal` @ `2ea04c565c`. Finalization target: `origin/personal`.

## What the beta is

- Release kind: **beta pre-release**, the next beta after `v1.5.13-beta.2` (tag on `f78b60dddd`), presumably `v1.5.13-beta.3`. Confirm it with `release_versions.py next-beta`.
- Latest stable: `v1.5.12` (`8338f97e59`). Docker `:latest` stays on it; `:beta` moves to the new tag.
- Content, checked by the Solution Designer by ancestry: `git log --merges --first-parent v1.5.13-beta.2..origin/personal` shows three merges. 234 non-ticket files change.

| Merge | Ticket | Notes source |
| --- | --- | --- |
| `d88e3f4ec6` | autobyteus-435 `small-follow-ups-batch-435`: 14 small fixes | `tickets/done/small-follow-ups-batch-435/handoff-summary.md` (no `release-notes.md`). **Needs the new Android APK**: full screen under the camera cutout on Android 9–15, and a reload or process-death restore reopens the same run and screen |
| `bd45d07aa2` | autobyteus-338 `run-bash-background`: native `run_bash` runs long commands in the background | `tickets/done/run-bash-background/release-notes.md` (ready). It states that the four background-process tools are retired and that leftover tool names in agents are skipped |
| `bcd0750636` | autobyteus-447 `server-e2e-node-credential-447` | Test code only; nothing visible to users. A line under "Other" at most |

- Re-check by ancestry right before writing the notes. Anything merged later that is not named in the Task needs the PM's word before it ships. The Task excludes 457, 461, 464, 460, 462, 463 and 465–467.

## Notes

- "What you need to do" comes first:
  - install the new Android app (APK);
  - update the nodes (`autobyteus-docker upgrade --all --tag beta`), or let them update on the beta channel;
  - the desktop updates itself.
- Launcher: beta.2's notes asked users to reinstall the launcher for its new messages. Repeat that only if this beta changes the launcher (`scripts/public/docker/`). Otherwise point people coming from beta.1 or older to beta.2's note.
- Then what changed: the phone fixes (435) and background commands (338).

## Smoke check

- Run the full `python3 scripts/release_smoke.py` on all five runtimes, as `RELEASE.md` says. Codex's limit reset at 10:31 today, so Codex should pass.
- The beta.2 waiver ("Waive for token limit") does **not** carry over. If a runtime fails only on a quota or token limit, ask the user, and record his waiver verbatim.
- DeepSeek Harness is not in the smoke run (known 400).
- Avoid the beta.2 deviation: do not write into the worktree while the smoke run is running, so the "worktree left unchanged" row stays meaningful.

## Constraints (from the Task and `RELEASE.md`)

- Follow `RELEASE.md` as on `personal`:
  - the Secret Gate first;
  - no build-only run per tag;
  - triage every pipeline failure first;
  - `latest*.yml` only after the six server packages;
  - `:beta` moves with the newest tag, and `:latest` stays on v1.5.12;
  - never move or delete a published tag.
- **Watch all four workflows together** (Desktop, Server Docker, Android, iOS).
- **Do not touch the user's running app or nodes.**
  - Several teams are running on his machine (457, 461, 464).
  - His desktop and two app-managed nodes update themselves on the beta channel, and busy agents resume (285).
  - The PM checks versions afterwards.
- After the last push, bring the user's checkout of `personal` up to date:
  - `git fetch`, then `git merge --ff-only`;
  - never stash, reset, check out or commit;
  - report the line "User's checkout of the target branch: Updated to <commit> / Not updated: why".
- Clean up everything you create (this worktree and its branches included). Record the delivery record on `personal`.

## Done when (from the Task)

- The tag, the GitHub pre-release with all 23 assets, the four workflows and Docker `:beta` are published and verified.
- The smoke result, and any waiver in his words, is recorded.
- The delivery record is on `personal`, and cleanup is done.
- Return `Delivery Completed` to the Solution Designer. The PM verifies and reports to the user.
