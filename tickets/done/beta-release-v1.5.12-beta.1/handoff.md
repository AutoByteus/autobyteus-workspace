# Handoff — beta-release-v1.5.12-beta.1 (autobyteus-383) → delivery engineer: Release Requested

- From: Solution Designer, 2026-11-04. Task `autobyteus-383`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`,
  requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) at the user's
  word (2026-11-04: "let's release a beta version, I forgot to say").
- Classification: **Release Requested**. The work is already merged; there is no software change and nothing to design.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/beta-release-v1.5.12-beta.1`, branch
  `codex/beta-release-v1.5.12-beta.1`, base `origin/personal` @ `7cc4961b39`. That is 9 commits past stable `v1.5.11`;
  its only merged ticket is autobyteus-381, which removed the last `read_media_file` traces, is code only and has no
  user-visible change. `scripts/release_versions.py next-beta` → `1.5.12-beta.1`.
- Teams on autobyteus-348, 95 and 378 may merge while this runs: release the tip you verify, and name it and the tickets
  it contains in the report.

## The request
- Cut and publish the next beta following `RELEASE.md`:
  - the next unused beta number;
  - the secret gate, licensing and hygiene;
  - the build-only desktop run on the merged state;
  - the release smoke check;
  - the "Beta notes with a user action" rule (with no user action, the generated notes stand alone);
  - Docker `:beta` moves to it; `:latest` stays on `v1.5.11`.
- A beta is a pre-release and never "Latest". Never move or delete a published tag.

## Notes to carry (for the report, and for the notes if any ticket needs a user action)
- Users on stable v1.5.11 have the restart-resume recorder, so an update from v1.5.11 to this beta is the **first** that
  resumes busy agents by itself.
- With "Update automatically" on (and **Receive beta updates** on), the app and the nodes that follow it update by
  themselves.

## The user's decisions
- A runtime waiver in the smoke check (Grok, Codex) only on his explicit words, recorded verbatim. Ask through the
  Solution Designer. Grok's quota resets daily.

## Done-when (from the Task)
- The beta is published as a pre-release with all assets.
- The four workflows succeeded.
- Docker `:beta` points to it, and `:latest` is unchanged.
- The delivery record is committed.
- The report names the tag, the tip released, and what the user should check after updating.
