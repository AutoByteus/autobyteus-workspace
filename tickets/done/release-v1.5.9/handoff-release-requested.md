# Handoff — Release Requested — release-v1.5.9 (autobyteus-319)

- Result: `Release Requested` (no software change; nothing to investigate or design).
- Task: `autobyteus-319` in project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`, "Cut the stable release v1.5.9 from the tested beta line (curated notes, rollback warning, Docker :latest)". Read it with `get_project_task` for its full text and any later comments.
- Requested by: the user (2026-10-28: "it is worth releasing a stable version now, before the next work"), through `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/release-v1.5.9`, branch `codex/release-v1.5.9`, base `origin/personal` `e8a7539f41` (refreshed 2026-10-28). Finalization target `origin/personal`.

## The request (Task text, summarized; the Task is authoritative)

- Kind: **stable** release `v1.5.9` (the next patch after the highest stable tag `v1.5.8`; `v1.5.9` is not tagged yet), following RELEASE.md (Release Decision, Checks Before Tagging, build-only release run, Cutting The Release, Watching The Rollout, Recovery, Rollback).
- Include: everything on the beta line since v1.5.8 (v1.5.9-beta.1 … beta.15).
- Notes: curated, user-facing, in `.github/release-notes/release-notes.md` of the tagged revision: what is new in plain words, what changes, and these warnings said plainly:
  - going back to an older build is not supported after the Task titles migration (autobyteus-260) and after the node vocabulary rename of stored names with backups (autobyteus-290);
  - moving MCP secrets into the vault is user-triggered with a backup first; rolling back to a build before beta.10 after moving secrets needs the `mcps.json` backup restored first (autobyteus-244);
  - the tool `list_available_nodes` is now `list_peer_nodes` (autobyteus-290); agent configs that select it need the new name.
- Before tagging: the secret gate and the build-only release run.
- After tagging: watch all four workflows (Desktop, Android, iOS, Docker); verify GitHub Latest with 17 assets, Docker `:1.5.9` and `:latest` (amd64 and arm64), `:beta` unchanged or moved only as RELEASE.md says.
- Constraints: never move or delete a published tag (`v1.5.9-beta.14` stays as the partial pre-release it is); do not touch the user's Docker nodes (he runs `autobyteus-docker upgrade --all --tag latest` himself) or his app; say plainly in the report anything left partial; archive the release report; clean up the worktree.

## Release-source facts checked by the Solution Designer (2026-10-28)

- `origin/personal` `e8a7539f41` is one commit after the beta.15 tag (`517cf5b604`): `docs(delivery): autobyteus-294 v1.5.9-beta.15 released …`.
- `git diff --name-only v1.5.9-beta.15 origin/personal` outside `tickets/`: **none** (4 files changed, all ticket records). So the current personal tip has the same software content as the tested beta.15. The release-source decision itself is delivery's (Task direction).

## Expected output

`Delivery Completed` to the Solution Designer with the release/deployment report (version, tag, the four workflow runs, assets, Docker digests and tags, GitHub Latest, notes), archived; partial results stated plainly.

## Route record

- `get_handoff_rules` (2026-10-28): "Release Requested" → `/software_engineering_team/delivery_engineer` (the PM asks for the copy that cut beta.15).
