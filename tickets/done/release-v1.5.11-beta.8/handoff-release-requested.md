# Handoff — autobyteus-352: Release Requested (next beta, v1.5.11-beta.8)

- Classification: `Release Requested`. The work is already merged and no software change is requested, so there is no requirements, investigation or design.
- Task: `autobyteus-352` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`, "Release the next beta (v1.5.11-beta.8)"
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's request, 2026-10-31: **"lets release a new beta"**
- Release kind: **beta**. Version: the next beta, `python3 scripts/release_versions.py next-beta` → **1.5.11-beta.8** (checked 2026-10-31).
- Workspace:
  - worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/release-v1.5.11-beta.8`;
  - branch `codex/release-v1.5.11-beta.8`, created from `origin/personal` @ `eaafd77ac5` (fetched 2026-10-31);
  - target `origin/personal`.
- Previous release: `v1.5.11-beta.7` at `8faae96899`. There are 139 commits after it on `origin/personal`.

## What it carries (merged on `origin/personal`; the PTM verified each, and I checked each merge is an ancestor of `origin/personal`)

| Task | What | Merge | Release notes |
| --- | --- | --- | --- |
| autobyteus-316 | Runtime switch for a stopped single agent. The GraphQL mutation `updateStoppedAgentRunModelConfig` is renamed `updateStoppedAgentRunSelection`, which breaks old clients (DESIGN rule 9; the user updates his own nodes). autobyteus-343 (stored runtime names) is already in beta.6, so the order constraint holds | `2df46e7f91` | `tickets/done/cross-runtime-resume/release-notes.md` |
| autobyteus-339 | Reliable update restart: "Install update and restart" installs after an incomplete shutdown when the old server is confirmed gone | `5d0df2eeb3` | `tickets/done/update-restart-reliability/release-notes.md` |
| autobyteus-347 | The Workspaces \| Projects switch in the left panel; new file `projects/<projectId>/project_runs.json` | `d9a51f16dc` | `tickets/done/projects-left-navigation/release-notes.md` |

## Constraints (from the Task)

- Follow `RELEASE.md` on `origin/personal`: Secret Gate, build-only release run, release smoke check, curated notes as the guide requires for this release kind, Docker `:beta` moves with the newest tag, `:latest` only with a stable.
- Never move or delete a published tag.
- A runtime waiver in the release smoke check (Codex, Grok) needs **the user's explicit words, recorded verbatim**.
- Verify the result: tag, assets (23), the four workflows, Docker tags.
- Never touch the user's nodes `autobyteus-server-0/1/2`.

## Context for "what the user should check after updating" (from autobyteus-305)

- This is the first release since the user's three Docker nodes moved onto the in-place path (2026-10-31: all on 1.5.11-beta.7, each with `<node>-server-packages`).
- After the desktop updates to beta.8, each node row should offer **"Update to 1.5.11-beta.8"**; one click per node updates it in place, with no image pull.
- Until autobyteus-305 step 5, the update stops agents that are mid-turn, so update while the nodes are idle.
- Alternative: `autobyteus-docker update --all`.

## Done when (from the Task)

The beta is published as a pre-release with all assets, the four release workflows succeeded, Docker `:beta` points to it, and the delivery record is committed. Report the final tag and what the user should check after updating.

## Route record

- `get_handoff_rules` (2026-10-31): "Release Requested … the user asks to release or deploy work that is already merged" → `/software_engineering_team/delivery_engineer`.
