# Release Requested — autobyteus-18: the next beta from `personal`

- Classification: `Release Requested` (no change to the software; nothing to investigate or design)
- Project Task: `autobyteus-18` (Project `project_f34a9537-07d7-449a-b78f-16368f1aa619`), assigned by `/project_task_manager` (run `project_task_manager_2f41a1df4e464bf2aa8970327d9d7ad0`) on 2026-11-10
- Requested by: the user, relayed by the PM in his words (2026-11-10): "we should create a new beta". Purpose: ship agent semantic memory (autobyteus-12), which is not in `v1.5.13-beta.3`, so the Computer Use Operator's migration (autobyteus-agents-23) takes effect.
- Worktree / branch / base: `/home/autobyteus/workspace/.codex/worktrees/release-beta-18`, `codex/release-beta-18`, from `origin/personal` @ `16947ba681` (fetched 2026-11-10). Finalization target: `origin/personal`.

## What the beta is

- Release kind: **beta pre-release**, the next beta after `v1.5.13-beta.3` (tag on `c60ebbb9fc`), expected `v1.5.13-beta.4`. Confirm it with `release_versions.py next-beta`; `v1.5.13-beta.4` does not exist yet.
- Latest stable: `v1.5.12`. Docker `:latest` stays on it; `:beta` moves to the new tag.
- Content, checked by the Solution Designer by ancestry: `git log --first-parent v1.5.13-beta.3..origin/personal` (21 commits) has one feature merge plus record commits:

| Commit | Ticket | Notes source |
| --- | --- | --- |
| `e88588aa9` (merge) | autobyteus-12 `agent-semantic-memory`: an agent can have its own semantic memory folder | `tickets/done/agent-semantic-memory/release-notes.md` (ready; it must be in the notes — the Task asks to mention agent semantic memory) |
| `a7cf08611`, `1d273dd8a` | autobyteus-12 delivery records | Docs only; nothing for the notes |
| `16947ba68` | autobyteus-468 record of beta.3's publication | Docs only |

- The tag must contain `e88588aa9` (the Task's done-when). Re-check by ancestry right before writing the notes; anything merged later that is not named here needs the PM's word before it ships.
- Unchanged since beta.3 (checked: `git diff --name-only v1.5.13-beta.3 origin/personal`): no files under `autobyteus-android/`, `autobyteus-ios/` or `scripts/public/docker/`. So no new APK action and no launcher reinstall is needed for this beta, unless your own check finds otherwise.

## Notes

- "What you need to do" first: update the nodes (`autobyteus-docker upgrade --all --tag beta`) or let them update on the beta channel; the desktop updates itself. No new phone app and no launcher reinstall for this beta (see above).
- Then what changed: semantic memory for agents, from the ready `release-notes.md` of autobyteus-12.

## Smoke check

- Run the full `python3 scripts/release_smoke.py` on all runtimes as `RELEASE.md` says.
- Earlier waivers do **not** carry over (beta.2 "Waive for token limit", beta.3 "Waive please" for one Grok 429). If a runtime fails only on a quota or rate limit, ask the user and record his waiver verbatim.
- DeepSeek Harness is not in the smoke run (known; also not installed in this environment).
- Do not write into the worktree while the smoke run is running.

## Constraints (from the Task and `RELEASE.md`)

- Follow `RELEASE.md` as on `personal`: the Secret Gate first; no build-only run per tag; triage every pipeline failure first; `latest*.yml` only after the server packages; `:beta` moves with the newest tag and `:latest` stays on v1.5.12; never move or delete a published tag. Watch all workflows together (Desktop, Server Docker, Android, iOS).
- Do not touch the user's running app or nodes.
- After the last push, bring the user's checkout of `personal` (`/home/autobyteus/workspace/autobyteus-workspace`) up to date with `git fetch` and `git merge --ff-only` only (never stash, reset, check out or commit), and report "User's checkout of the target branch: Updated to <commit> / Not updated: why".
- Clean up everything you create (this worktree and its local branches included). Record the delivery record on `personal`.

## Done when (from the Task)

- The beta is published with its artifacts and notes, and the tag contains `e88588aa9`.
- The smoke result, and any waiver in the user's words, is recorded.
- The publication is recorded on `personal`, and cleanup is done.
- Return `Delivery Completed` to the Solution Designer.
