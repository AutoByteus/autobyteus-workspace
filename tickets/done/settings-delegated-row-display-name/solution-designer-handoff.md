# Solution Designer Handoff: autobyteus-208 (settings-delegated-row-display-name)

- Result: `Architecture Design Complete`, `task_size=Small`, `architectural_risk=Low` → direct implementation route
- Package: `settings-delegated-row-display-name`, Project Task `autobyteus-208`, SR-001
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-delegated-row-display-name`, branch `fix/settings-delegated-row-display-name`, base `origin/personal` @ `1138e8fbef`; finalization target `origin/personal`; no release (the change ships with the next release the user decides)
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-delegated-row-display-name/tickets/in-progress/settings-delegated-row-display-name/`
- Approval: requirements approved by the Solution Designer within the Task's direction; user informed (2026-10-24)

## Original request (summary)

In Settings, a catalog copy's delegated-launch row shows the raw address basename (`scribe_5083`), while the sidebar and the conversation show the display name (`scribe 5083`). Apply the existing display-name rule in the Settings delegated-launch rows for Team, Org and Agent roots, and cover it with a web unit test. Also correct the header of probe case DCR-001 in `autobyteus-web/tests/e2e/delegated-copy-own-file-cases.mjs` (line 12; comment only, no rerun). Done when a catalog copy shows the same display name in Run Settings, the sidebar and the conversation (unit test and a look in the app), the stale comment is corrected, and the change is merged.

## Finding

- Reproduced (`evidence/SD-01-repro-base.log`). `delegatedLaunchRows.ts` names every row by basename. The Team sidebar and contexts use `readsAsDisplayName` (a display name for a catalog copy, the basename for a configured member's copy). Org and Agent views use `memberDisplayName` for all.
- The Team rule is written out twice today (`teamExecutionTreeSelectors.ts:97-99`, `teamExecutionContextFactory.ts:67-70`).
- Product design repository: its specs do not name the old form, so there is nothing to mention to the Product Team.

## Design (see design-spec.md)

Extract the Team name rule as one exported function in `teamExecutionTreeSelectors.ts`, used by the nav rows, the context factory and the Settings Team rows. Org/Agent Settings rows use `memberDisplayName`. Remove `nameAt`, add one docs sentence and correct the probe header comment.

## Validation expectations

Web unit tests (AC-001…003), header review (AC-004), and a look in the app (AC-005): a catalog copy in a Team run, and in an Org run, shows one name in Run Settings, the sidebar and the conversation.

## Follow-ups

None.

## Route

Handoff rule "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer` (2026-10-24).
