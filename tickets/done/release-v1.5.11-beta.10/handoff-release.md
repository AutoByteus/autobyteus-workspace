# Handoff — Release Requested: beta v1.5.11-beta.10 (autobyteus-362)

- Classification: `Release Requested` (no software change; nothing to investigate or design).
- From: Solution Designer (run `solution_designer_7591e3d191704d25a3396b3020a41127`); to: delivery engineer (rule: Release Requested).
- Task: autobyteus-362 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).
- The user's request (2026-11-01, relayed in the Task): "release a new beta please".
- Release kind: **beta**, next after `v1.5.11-beta.9`; expected tag `v1.5.11-beta.10` (no such tag exists; checked after `git fetch --tags`: the latest beta tag is `v1.5.11-beta.9`).
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-v1.5.11-beta.10`, branch `release/v1.5.11-beta.10`, base `origin/personal` `746b2f5016` (93 commits past `v1.5.11-beta.9`, fetched 2026-11-01). Teams 318 and 358 may still merge into personal: refresh before the build-only run, release the tip you verified and name it.

## What it carries (Task keys in `git log v1.5.11-beta.9..746b2f5016`: 285, 305, 337, 345, 353, 355, 357)

| Task | Archived ticket (release notes) |
| --- | --- |
| autobyteus-285 restart-resume | `tickets/done/restart-resume/` |
| autobyteus-337 Integrations page | `tickets/done/integrations-page/` |
| autobyteus-345 packaging, dependencies and build | `tickets/done/packaging-dependencies-build/` |
| autobyteus-355 RELEASE.md notes rule and Grok smoke | `tickets/done/release-guide-notes-and-grok-smoke/` |
| autobyteus-357 code-quality leftovers | `tickets/done/code-quality-leftovers/` |
| autobyteus-305 closure, smaller items | `tickets/done/docker-node-in-place-server-update/`, `tickets/done/update-restart-reliability/` (check which are new since beta.9) |
| autobyteus-353 (already in beta.9) | `tickets/done/projects-tree-one-place/` (its record commits only; confirm nothing user-facing is new) |

## Constraints from the Task (verbatim intent)

- Follow `RELEASE.md`: Secret Gate, the build-only desktop run on the merged state (also required by 345's release notes), the release smoke check, Docker `:beta` moves with the newest tag, `:latest` only with a stable.
- **Beta notes with a user action** (`RELEASE.md`): collect the "What you need to do" parts of the carried tickets' `release-notes.md` above the generated notes. In particular, from 285: the update INTO a version with the recorder is what resumes busy agents, so the first update after this release (from beta.9) will NOT resume agents; the update after that will.
- Never move or delete a published tag. A smoke-check waiver for a runtime (Codex, Grok) must be the user's explicit words, recorded verbatim; ask the user, not the PM.
- Verify: tag, assets, the four release workflows, Docker tags, and that the tag contains the tickets above.

## Done when (from the Task)

The beta is a pre-release with all assets; the four release workflows succeeded; Docker `:beta` points to it; the delivery record is committed; the report names the final tag, the tip released, and what the user should check after updating.
