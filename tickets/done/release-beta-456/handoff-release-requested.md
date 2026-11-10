# Release Requested — autobyteus-456: a new beta from `personal` after autobyteus-455

- Classification: `Release Requested` (no change to the software; nothing to investigate or design)
- Project Task: `autobyteus-456` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), assigned by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) on 2026-11-10
- Requested by: the user, relayed by the PM in his words (2026-11-10): "Yes please, we release after the Daily Assistant is fixed." autobyteus-455 is merged (`20b0694fbb`, record `fd0eb664c3`; verified by the PM).
- Why it is urgent: the user's Berlin event application (Task miscellaneous-1, deadline today 23:59 Berlin time) waits for the PM to delegate it to the Daily Assistant. His desktop and nodes are on the beta channel with automatic updates, so the beta reaches them by itself.
- Worktree / branch / base: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-beta-456`, `codex/release-beta-456`, from `origin/personal` @ `fd0eb664c3`. Finalization target: `origin/personal`.

## What the beta is

- Release kind: **beta pre-release**, the next beta after `v1.5.13-beta.1` (tag on `6884309283`), presumably `v1.5.13-beta.2`. You confirm the version per `RELEASE.md`.
- Latest stable: `v1.5.12` (`8338f97e59`). Docker `:latest` stays on it; `:beta` moves to the new tag.
- Content, checked by the Solution Designer by ancestry (`git log --merges --first-parent v1.5.13-beta.1..origin/personal`). There are three merges, and 71 non-ticket files change:

| Merge | Ticket | Notes source |
| --- | --- | --- |
| `eaeb5ee733` | autobyteus-450 `conversation-file-open-450` | `tickets/done/conversation-file-open-450/release-notes.md`. Attached images show as thumbnails and open in the phone's viewer. Every open of a file shows its current content. The Android app keeps the page when a page jumps to a node file address. **Needs the new Android APK** |
| `354e6893b3` | `docker-setup-code-wait-feedback` (autobyteus-workspace-3; not dispatched by the PM) | `tickets/done/docker-setup-code-wait-feedback/release-notes.md`. `autobyteus-docker setup-code` and `new-container` show each step and a waiting message |
| `20b0694fbb` | autobyteus-455 `daily-assistant-delegation-target` | No `release-notes.md`; write the note from its `handoff-summary.md`. The Daily Assistant is listed and addressable at `/daily_assistant`: in the @ menu, `list_available_agents`, `delegate_task` and a peer node's list. The Model Router stays internal. The self, second-copy and teammate guards stay |

- Not merged (do not wait): autobyteus-447 (server E2E tests carry the node key) and autobyteus-435 (second batch of small phone fixes). Re-check by ancestry just before writing the notes; if either has merged by then, include it.

## Notes

Beta notes come first under "What you need to do":
- install the new Android app (APK);
- let the nodes update (or `autobyteus-docker upgrade --all --tag beta`);
- the desktop updates itself on the beta channel.

Then: the file fixes (450), the Daily Assistant is now addressable (455), and the Docker launcher feedback.

## Smoke check

Run the full smoke check (`python3 scripts/release_smoke.py`) on all five runtimes, as `RELEASE.md` § Release smoke check says.
- Codex's usage limit resets today at about 10:31, so Codex may pass now.
- The user's earlier waivers do not carry over. If a runtime fails only because of a quota or token limit, ask him, and record his waiver in his own words.
- Put the printed summary in the delivery report. v1.5.13-beta.1 has no smoke result recorded (autobyteus-453); this beta needs a full record.

## Constraints (from the Task and `RELEASE.md`)

- Follow `RELEASE.md` as on `personal`:
  - no build-only run per tag;
  - triage every pipeline failure first;
  - updater files after the six server packages;
  - Docker `:beta` moves with the newest tag, and `:latest` stays on v1.5.12;
  - never move or delete a published tag.
- **Watch all four workflows together** (Desktop, Server Docker, Android, iOS), per `RELEASE.md` § Watching The Rollout. v1.5.13-beta.1 was partial for about an hour because the runs were watched one after another.
- New rule (autobyteus-agents-97, PR #165): after the last push to `personal`, bring the user's own checkout up to date:
  - `git fetch`, then `git merge --ff-only` when it is on the target branch with no local commits;
  - never stash, reset, check out, commit or merge-commit;
  - the report carries the line "User's checkout of the target branch: Updated to <commit> / Not updated: why".
- Clean up everything you create: worktrees, branches, test instances, temp files. This worktree and `codex/release-beta-456` included.

## Done when (from the Task)

- The beta tag, the GitHub pre-release with all 23 assets, the four workflows and Docker `:beta` are published and verified.
- The smoke result is recorded, with any waiver in the user's own words.
- The delivery record is on `personal`, and cleanup is done.
- Return `Delivery Completed` to the Solution Designer. The PM verifies and reports to the user.
