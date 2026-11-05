# Handoff — autobyteus-384 → Implementation

- Result: `Architecture Design Complete`; `task_size = Small`, `architectural_risk = Low`. Route: the rule for Small/Medium with Low → `/software_engineering_team/implementation_engineer` (rules read 2026-11-05).
- Package: `list-projects-workspaces-384`, SR-001.
- Task: autobyteus-384, requested by `/project_task_manager` for the user.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/list-projects-workspaces-384`.
  - Branch: `codex/list-projects-workspaces-384`.
  - Base: `origin/personal` `1964ce9874`; finalization target: `origin/personal`. **Release: a new beta release** (the user, 2026-11-05; requirements DEC-004).
- Ticket folder: `tickets/in-progress/list-projects-workspaces-384/` in the worktree.

## Original request (summary)

`list_projects` returns each Project's linked workspace folders (the path, and the link's description when there is one), compactly with no empty fields. The tool description says what they are for. The other places a Project is shown to an agent are checked for consistency.

Why: the Project Task Manager will check whether a folder the user gives already belongs to a Project (autobyteus-agents-84 waits for this).

## What to do

`design-spec.md` § Change / Refactor Sequence:
- add `projects/domain/project-summary.ts` (`ProjectSummary`, `toProjectSummary`);
- `listProjectSummaries` and create/update use it; remove `projectAcknowledgement`;
- update the `list_projects` description (§ Tool Description);
- tests: AC-001..AC-005.

## Left alone, with reasons

- the run-start Project section (DEC-002);
- availability and display names (DEC-003);
- Task search and the journal line (unaffected).

## Follow-ups

None.
