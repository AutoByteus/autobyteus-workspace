# Solution Designer Handoff: autobyteus-265 (org-settings-save-stale-reread)

- Result: `Architecture Design Complete`, `task_size=Small`, `architectural_risk=Low` → direct implementation route
- Package: `org-settings-save-stale-reread`, Project Task `autobyteus-265`, SR-001
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-settings-save-stale-reread`, branch `fix/org-settings-save-stale-reread`, base `origin/personal` @ `1138e8fbef`; finalization target `origin/personal`; no release unless the user asks
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-settings-save-stale-reread/tickets/in-progress/org-settings-save-stale-reread/`
- Approval: requirements approved by the Solution Designer within the Task's direction; user informed (2026-10-24)

## Original request (summary)

In an Org run, after a stopped delegated copy's model is saved in Settings, the page often says "Settings were saved, but could not be refreshed. Refresh before making more changes." and keeps the old model until Refresh. Find why the stream reconnects after every Save, and make the page show the saved model without a manual refresh. Done when the page shows the new model with no error in a loop of at least 12 Saves, with a regression test, the user's check in the app, and finalization on personal.

## Finding

- The reconnect is the designed reload ("Org and Agent views reload", `docs/settings.md:1388-1392`). The live Save publishes `delegated_launch_selections_changed`, and the Org view answers with a checkpointed stream reconnect.
- The defect is in `agentOrgContextsStore.readRunConfig` (`stores/agentOrgContextsStore.ts:358-372`). It treats the Org view's own reload during the read as a stale target and throws. Settings then shows the message.
- Reproduced deterministically: `evidence/repro-org-reread-race.spec.ts` fails on base (`evidence/SD-01-repro-org-reread-race.log`). Measured on the real stack by autobyteus-205's API-18: 4 of 12 Saves.

## Design (see design-spec.md)

`readRunConfig` re-reads, up to 3 attempts, when only the Org's view or context was refreshed during the read. It still refuses with the existing error when the target changed (context released, node binding changed, Org operation pending). Plus unit tests (AC-002, AC-003) and one docs sentence. The stream, the server and the Team/Agent paths are unchanged.

## Validation expectations

- Unit: the reproduction turns green; AC-003 cases; existing Org/Settings store and stream specs pass.
- API/E2E: AC-001, a loop of ≥ 12 Saves on the real stack (`delegated-launch-defaults-probe.mjs`, DCP-003/DCR-003 repeated), with 0 "could not be refreshed" messages; AC-004 related probe cases.
- AC-005: the user's check in the app before finalization.

## Follow-ups

FU-001 (in-place recording of the event for Org/Agent views; not urgent), in `follow-ups.md`.

## Route

Recorded below after applying the handoff rules.
