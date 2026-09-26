# Handoff — Architecture Design Complete (SR-004)

- Result classification: `Architecture Design Complete`
- Package identifier: `PROJ-TASKS-20260926-001` (`project-tasks`)
- Current solution revision: `SR-004`
- Classification: `task_size=Medium`, `architectural_risk=High`
- Route: `get_handoff_rules` rule "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/architecture_reviewer`
- Expected output: independent architecture review (Pass / Fail / Blocked)

## Original Request And Goal

User, 2026-09-26, after Projects shipped (v1.4.86): add Tasks that belong to a Project.

- **In scope:** create a Task (description only; users find titles hard), open, edit and delete it, search, delete a Project together with its Tasks, and show not-done counts on the Project list.
- **Status:** To Do / In Progress / Done. Status is changed only by agents, in a later ticket, so humans never move Tasks.
- **Out of scope:** task admission (assigning or delegating Tasks to agents, teams or orgs).
- **Visibility:** Tasks are hidden with Projects; no new flag.
- **Navigation:** the user chose a two-pane Projects page (as in Settings) and a Task list rather than a board.

## Approval Basis

- Requirements `Approved`: `SR-003`, `APPROVAL-PROJ-TASKS-20260926-001` (the user's reply "B + list, rest as recommended").
- Coverage: `REQ-001`–`REQ-016` (`REQ-004` withdrawn), `AC-001`–`AC-012`, `SCN-001`–`SCN-008` (`SCN-X01` rejected).
- The package supersedes released `PROJ-CONCEPT-20260926-001` `REQ-014`/`AC-012`, extends its `REQ-009`, and replaces its `REQ-008` card grid.
- No behavior-defining supplements.

## Workspace Context

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks`; branch `codex/project-tasks`; base `origin/personal@e06080b0027636cecf20b5e437c496d423c7f26b`; finalization target `origin/personal`.

## Artifacts

- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/solution-revision-record.md`
- Prior review artifacts for this package: `N/A — not applicable (first review)`
- Released predecessor, for context: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/done/projects-concept-introduction/` (`design-spec.md`, `design-review-report.md`)

## Design Summary

- **Storage.** Tasks are embedded in each Project row of `<appDataDir>/projects/projects.json`: `{ taskId, description, status, createdAt, updatedAt }`. Deleting a Project deletes its Tasks atomically under one lock. Released rows without `tasks` normalise to `[]` (`Directly Usable — No Migration`).
- **Server behavior:**
  - A new `ProjectTaskService` handles list, create (status `TODO`), update-description and delete.
  - Task writes do not bump the Project's `updatedAt`.
  - `ProjectService.toView` adds `openTaskCount` and excludes `tasks`.
- **GraphQL:** `ProjectTask`, `ProjectTaskStatus`, `projectTasks`, `createProjectTask`, `updateProjectTask`, `deleteProjectTask`, and `Project.openTaskCount`. There is no status mutation. The names are clear of `TaskDelegation*`.
- **Web:**
  - A new parent route `pages/projects.vue` holds the two panes. `ProjectListPane` replaces `ProjectsList`/`ProjectCard`, which are removed.
  - `ProjectDetail` gets tabs (Tasks by default, and Workspaces via `?tab=`), and the Workspaces section moves into its own `ProjectWorkspacesPanel`.
  - New Task components: `ProjectTasksPanel` (search, status filter, list), `ProjectTaskRow`, `ProjectTaskDialog`.
  - New store `projectTaskStore`; new `projectStore.setOpenTaskCount`.

## Classification Evidence

- **Medium:** the change stays within the Projects subsystem on server and web, about 25 files, with no cross-subsystem refactor.
- **High:** the released persisted shape and GraphQL contract gain fields, the released UI is replaced, and this is the first nested route in the repo.

## Open Risks

- Contention on the shared single-file lock once agents write Task status often. This is deferred to the admission ticket, with the trigger recorded in the design.
- Descriptions have no length limit, as approved.
- This is the first nested route; nav active-state and the mobile gate must be verified.
- The released e2e probe must be adapted, not removed.
- `RISK-001` is carried over: the exploratory prototype exists only in the container.

## Next Expected Action

`/architecture_reviewer` reviews. On Pass it applies its own handoff rules; on Fail or Blocked it returns to `/solution_designer`.
