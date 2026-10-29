# Handoff — e2e-task-execution-source-fixtures (SR-001): Architecture Design Complete

- Result: **Architecture Design Complete**, `task_size=Small`, `architectural_risk=Low`
- Package: `e2e-task-execution-source-fixtures`; Project Task `autobyteus-211`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/e2e-task-execution-source-fixtures`, branch `codex/e2e-task-execution-source-fixtures`, base `origin/personal` @ `dc530fdcb0`; finalization target `origin/personal`. Dependencies are installed and `autobyteus-ts` is built in this worktree.
- Approval: Solution Designer within the Task's direction (user informed 2026-10-20)
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/e2e-task-execution-source-fixtures/tickets/in-progress/e2e-task-execution-source-fixtures/` (`requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `follow-ups.md`, this file)
- Architecture review: `N/A — not applicable`

## Original request

Two server e2e tests fail on `origin/personal` since autobyteus-197 made `source` required: `memory-collaboration-graphql` and `team-task-event-current-contract`. Add the required `source` to their fixtures, check for the same drift elsewhere, and find why 197 missed it. Done when both pass, no other fixture has the same drift, and it's merged; no release.

## Design summary

- Add a valid `source` to the task execution in `memory-collaboration-graphql.e2e.test.ts` (record shape) and to both `TASK_EXECUTION_STARTED` payloads in `team-task-event-current-contract.e2e.test.ts` (DTO shape).
- Follow the existing valid examples named in the investigation notes. Assertions unchanged.
- Verify with both files, then the full `pnpm test:e2e`, server `test:unit` and the contract packages.

## Route Record
- 2026-10-20: `get_handoff_rules` matched "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low". Recipient: `/software_engineering_team/implementation_engineer`.
