# Handoff — autobyteus-389 → Delivery (Release Requested)

- Classification: `Release Requested`. Release of already-merged work with no software change, so there are no requirements, investigation or design documents.
- Route: the handoff rule for `Release Requested` → `/software_engineering_team/delivery_engineer` (rules read 2026-11-06).
- Task: autobyteus-389 in project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`, "Release the next beta (v1.5.12-beta.2): the new left panel (Runs, Workspaces, Projects views; Remove in the chat chooser) from autobyteus-385".
- Requested by: the user, through `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).

## The request, in the user's words

- The user, 2026-11-06: "please release a new beta".
- Release kind: beta pre-release. Version: the next beta after `v1.5.12-beta.1`, presumably `v1.5.12-beta.2` (the Task title); delivery confirms it per RELEASE.md.
- Context (PM): he expected the new left panel in his app, but his installed app is `v1.5.12-beta.1`, which was cut before autobyteus-385 merged.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/beta-release-v1.5.12-beta.2`
- Branch: `codex/beta-release-v1.5.12-beta.2`
- Base: `origin/personal` at `e00581d485` (fetched 2026-11-06); `pnpm install --frozen-lockfile` OK.
- Previous beta: `v1.5.12-beta.1` → `f10c45aab8` (2026-11-05). Latest stable: `v1.5.11`.

## What is new since v1.5.12-beta.1

`git log --first-parent v1.5.12-beta.1..origin/personal`:
- `8142ba8116`: merge of autobyteus-385 (workspace-tree-vs-chooser), the only product change. It brings:
  - the left panel's "View" menu with Runs, Workspaces (default) and Projects;
  - Workspaces and Projects list only folders and Projects that have runs;
  - the tree's folder X and add actions are gone;
  - the chat folder chooser has a deliberate "Remove" (refused while a run is running there; nothing on disk is deleted);
  - the Runs view lists runs newest first by last activity, with delegated work nested;
  - run-history read windows with `lastActivityAt`.
- `8fc42211aa`, `3ef5e33eec`, `e00581d485`: delivery and ticket records only.

## Constraints (the Task, RELEASE.md and the user's standing rules)

- **RELEASE.md steps:**
  - secret gate;
  - build-only desktop run on the merged state;
  - release smoke check;
  - release notes, with a "What you need to do" section only if the user has an action;
  - Docker `:beta` moves to the new tag; `:latest` stays on the stable `v1.5.11`.
- **Tags:** never move or delete a published tag.
- **Smoke waivers:** a waiver (for example Codex, whose quota resets 2026-11-10, or Grok limits) needs the user's own explicit words. Ask him; don't assume one. The `v1.5.12-beta.1` waiver ("waive please for the beta") was for that beta only. Report what was not checked.
- **The user's Docker nodes:** do not touch `autobyteus-server-0`, `-1`, `-2` (they run an older `:beta` built 2026-10-31; he updates them himself). Tell the user when the new `:beta` image is published.
- **Data:** test data and the test vault only; never the user's running app or `~/.autobyteus`.
- **Cleanup:** remove everything you create (this worktree, local branches, test app instances); remote branches are kept as usual.

## Done when (from the Task)

- the beta tag, the GitHub pre-release with all assets, the workflows and Docker `:beta` are published and verified;
- the notes are written;
- the delivery record is on the base branch;
- cleanup is done.

## Expected output

`Delivery Completed` back to the Solution Designer with the released version, tag, assets, workflow runs, Docker digests, smoke results (and any waiver in the user's words) and the record paths on `personal`.
