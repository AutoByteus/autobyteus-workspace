# Handoff — Architecture Design Complete: projects-tree-one-place (autobyteus-353)

- From: Solution Designer (run `solution_designer_7591e3d191704d25a3396b3020a41127`). To: implementation engineer (rule: Medium and Low → direct implementation).
- Task: autobyteus-353 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`); follow-up to autobyteus-347.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-tree-one-place`, branch `codex/projects-tree-one-place`, base `origin/personal` `f7f331d96b`; finalization target `origin/personal`; release only on the user's word.
- Result: `Architecture Design Complete`, task_size **Medium**, architectural_risk **Low** (removal within existing owners; no persistence change; the `projectRunHistory` shape narrows in one release). Revision SR-002.

## Request and decision

The user (bug report on beta v1.5.11-beta.8): his Project Task Manager run "hello" appears under almost every Project in the Projects tree. It is one run, started in the superrepo workspace, listed under every Project whose Tasks it handed out (347's derived listing). His decision (2026-10-31): a Project shows only runs started under it; "UI is reflecting the data". A run not started under a Project is not in the Projects tree. Under a listed run, its delegated work shows as in Workspaces.

## Documents

`requirements-doc.md` (approved, SR-002), `investigation-notes.md` (E-001…E-007), `design-spec.md` (removal plan and file mapping), `solution-revision-record.md`, screenshots in `evidence/intake/`.

## Done when (from the Task)

The Projects tree no longer shows one run under many Projects; existing runs and history keep working; proven in the app with the user's kind of case (one Project Task Manager run, started in a workspace, that delegated Tasks in several Projects → every Project shows "No runs yet"), plus a run started under P delegating to P and Q (AC-002); finalized on `origin/personal`.
