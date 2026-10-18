# Handoff — Architecture Design Complete — remove-create-or-update-project

- Result: `Architecture Design Complete`
- Package identifier: `remove-create-or-update-project`; current revision `SR-002`
- Classification: `task_size=Small`, `architectural_risk=High` (a public agent tool contract and its protected name are removed)
- Route (handoff rules): independent architecture review → `/software_engineering_team/architecture_reviewer`
- Approval: requirements `Approved` at SR-001 by the Solution Designer within the direction; user informed 2026-10-18. No behavior-defining supplements.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), Project Task `autobyteus-121`; user go-ahead 2026-10-18 ("We don't need this legacy tool since we have the new tool.")

## Original request (summary)

Remove the deprecated `create_or_update_project`: its contract entry, description, schema and dispatch rule; the `CreateOrUpdateProjectTool` native class; its docs mentions; the tests that check it still works; fix `autobyteus-web/tests/e2e/team-status-live-probe.mjs` (also lists the removed `create_or_update_task`); check the repo for remaining names. Release with a note announcing the removal (the user decides the release type; the delivery engineer follows RELEASE.md). Done when: no code, doc or test refers to it except the release note; an agent still listing it skips it as before; tests; real-app check with a test data package that includes an agent listing the old name (TESTING.md); merged; released with a note; the user's check.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-create-or-update-project`, branch `codex/remove-create-or-update-project`
- Base: `origin/personal` @ `2f211340ee`; finalization target `origin/personal`
- Ticket folder: `tickets/in-progress/remove-create-or-update-project/` (uncommitted)

## Artifacts

- `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-create-or-update-project/tickets/in-progress/remove-create-or-update-project/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-create-or-update-project/tickets/in-progress/remove-create-or-update-project/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-create-or-update-project/tickets/in-progress/remove-create-or-update-project/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-create-or-update-project/tickets/in-progress/remove-create-or-update-project/solution-revision-record.md`
- Review artifacts: none yet

## Points for review

- Allowed remaining references (REQ-004): skip-proof tests/test data (DEC-003), the historical migration fixture (DEC-002), `.github/release-notes/release-notes.md` until the release step replaces it (DEC-004). These refine the Task's literal "only the release note"; the user is informed.
- Dead after removal: `effectiveProjectTaskToolName`, `EffectiveProjectTaskToolName`.

## Route record

- `get_handoff_rules` applied 2026-10-18: "Large or High → architecture review" matches; sent to `/software_engineering_team/architecture_reviewer`.

## Next expected action

Independent architecture review of SR-002.
