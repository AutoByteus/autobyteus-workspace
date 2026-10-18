# Docs Sync Report — link-existing-run-to-task (Project Task autobyteus-11)

## Scope

- Integrated base: `origin/personal` `00ca7f5350` (merges `5ba05e7de4` and `cd3bb0dd6b` into the ticket branch).
- The implementer updated the long-lived docs. Delivery checked them on the merged state and made no edits.

## Reviewed

| Doc | Result | Notes |
| --- | --- | --- |
| autobyteus-server-ts/docs/modules/projects.md | No change | §"A Task for a run the user started (adoption)": rule, path, refusals, rollback. Upstream's removal of `create_or_update_project` merged cleanly into the same file |
| autobyteus-server-ts/docs/design/collaboration_model.md | No change | §5 row "CM-6 for runs the user started (adoption)": Holds |
| autobyteus-web/docs/agent_execution_architecture.md | No change | The adopted run's own sidebar row retires (SR-009), with a link to the server adoption section |
| TESTING.md | No change by delivery | The ticket's rule (resolve the temp `HOME`) is committed separately as `docs(testing)` (`7c8950a602`) |

## Method

- A link and anchor check over the ticket's changed docs on the merged state found 0 dead links.
- The merged `projects.md` was diffed against both parents.

## Result

Pass, no delivery edits.
