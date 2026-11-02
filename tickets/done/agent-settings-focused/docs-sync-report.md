# Docs Sync Report

## Scope

- Ticket: `agent-settings-focused` (Project Task `autobyteus-366`), IR-004 / API-REV-003
- Trigger: API/E2E round 3 Pass (API-REV-003); direct route, `task_size=Medium`, `architectural_risk=Low`
- Base: `origin/personal` @ `84ea944ac5` (with autobyteus-348), already merged by implementation (`58fdf50f33`, IR-004)
- Post-integration verification: delivery's clean-clone run (`evidence/DEL-*-clean-clone.log`)

## Why Docs Were Updated

- The change updated `autobyteus-web/docs/settings.md` and `agent_execution_architecture.md`: Settings of a focused agent show that agent's card, with a Team or Org settings switch to the group view, and the save bar names every agent with pending edits.
- Delivery found one sentence in `autobyteus-web/docs/agent_teams.md` that still spoke of "the Run Settings delegated-copy rows". A copy now appears in Settings as the focused agent's card; its name still comes from `teamMemberName` through `delegatedLaunchRows.ts`. The wording was corrected.

## Long-Lived Docs Reviewed

| Doc Path | Result | Notes |
| --- | --- | --- |
| `autobyteus-web/docs/settings.md` (Run Settings: focused card, switch, save bar, Members as the group view, Delegated copies reached by focus) | Updated (by the change; verified) | Matches `ExistingRunSettings.vue` (`run-settings-switch-group`) and the AFS cases |
| `autobyteus-web/docs/agent_execution_architecture.md` | Updated (by the change; verified) | — |
| `autobyteus-web/docs/agent_teams.md` (~line 322) | Updated (by delivery) | "the Run Settings card of a focused delegated copy (built from `delegatedLaunchRows.ts`)" |
| `autobyteus-web/docs/settings.md` (~line 1631, Members list while locked) | No change | The group view keeps its Members list |

## Delivery Continuation

- Result: `Pass`. Next: verification and finalization. No release unless the user says so (AC-006).
