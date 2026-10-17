# Handoff — Architecture Design Complete (task-keys-declutter, SR-001)

## Result

- `Architecture Design Complete`; `task_size: Small`, `architectural_risk: Low`. A display removal in two components, plus removing the worker answer's `taskKey`, which becomes dead. No persistence, concurrency or ownership change.
- Route: `/software_engineering_team/implementation_engineer` (Small and Low → direct implementation; independent architecture review not required). Implementation self-checks, executable validation and delivery still apply.

## Request

- Project Task `autobyteus-132` from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-10-17.
  - Remove the Task key from board cards (Projects page and right-panel tab) and from the Workspaces-tree Task summary ("show it like previous").
  - Keep keys on the Task page (chip with copy), in the Depends on / Required by lists and in the badge.
- Done when:
  - cards and tree summaries show no key line, and the Task page, badges and lists still show keys;
  - tests are updated and the design record is updated (Product-owned; requested through `/project_task_manager`);
  - a real-app check on an isolated instance (TESTING.md) with screenshots;
  - a beta release;
  - the user's check in the app.

## Approval

Requirements are Approved within the user's direction at SR-001 (user informed 2026-10-17). REQ-002 quotes the user's clarification.

## Artifacts (absolute paths)

- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-declutter/tickets/in-progress/task-keys-declutter/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-declutter/tickets/in-progress/task-keys-declutter/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-declutter/tickets/in-progress/task-keys-declutter/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-declutter/tickets/in-progress/task-keys-declutter/solution-revision-record.md`
- The user's screenshot: `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_e75dacc7-1da9-4dfa-92a4-2af0f7dabdd2/context/ctx_b7b473c521dd__56.png`
- Independent review artifacts: `N/A — not applicable` (direct route).

## Workspace

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-declutter`, branch `codex/task-keys-declutter`.
- Base `origin/personal@aa84fd026c`; target `origin/personal`.

## Notes For The Team

- The Done-when includes a beta release and the user's check. Delivery should plan for both from the start.
- Keep the badge's Project-Task narrowing in `ProjectTaskRow`.
- `generated/graphql.ts` is updated by hand, as in the predecessor.
- The Product design record is not edited by this team (DEC-004).

## Risks

- RSK-001: a badge's key is not shown on its target's card. This is accepted per the user's direction.
