# Docs Sync Report

## Scope

- Ticket: `follow-ups-448-final` (Project Task `autobyteus-526`, part of `autobyteus-530`), **round 2**:
  - FU-007: remove the unmounted running-team panel;
  - FU-008: the two remaining browser probes;
  - FU-001: the package folder watcher unit test under load.
  - Classification: `task_size: Small`, `architectural_risk: Low`, direct route (no independent reviews).
- Trigger: API/E2E handoff (API-REV-001 Pass, 93%), 2026-11-20.
- Bootstrap base reference: `origin/personal` @ `8f2d209b2c`.
- Integrated base reference used for docs sync: `origin/personal` @ `01ebb4ddce` (one commit, a delivery record of autobyteus-571), merged as `f68268060d`.
- Post-integration verification reference: none rerun; the merged code is identical to the tested commit outside `tickets/` (`release-deployment-report.md`).

## Why Docs Were Updated

- Summary: the implementation removed the paragraph about the unmounted `components/workspace/running/*` surface and its `TeamActivityDot.vue` from `autobyteus-web/docs/agent_execution_architecture.md`. Delivery confirmed that no long-lived doc still names the removed components, panel or `data-test` selectors. No other doc describes the changed probes or the watcher unit test.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_execution_architecture.md` | named the removed surface | No change (updated by implementation) | `git grep` finds no `RunningTeamGroup`, `RunningTeamRow` or `TeamActivityDot` in any doc outside ticket folders |
| `GLOSSARY.md` | Team status terms | No change | none name the removed panel |
| `TESTING.md` | "File watching on a busy Mac" covers folder-watcher tests that wait for FSEvents | No change; rule proposal below | still accurate: the skill folder watcher unit test and `package-auto-refresh.integration.test.ts` wait for real events |
| `DESIGN.md`, `RELEASE.md` | project documents | No change | no ticket report recorded a discrepancy |

## Docs Updated

- None by delivery. The implementation's change to `autobyteus-web/docs/agent_execution_architecture.md` is confirmed.

## Proposed Rule (for the TESTING.md owner, the API/E2E engineer)

- This round (SR-002, REQ-003) settled a testing pattern for watchers: a watcher's unit test performs real folder operations and delivers each event through the watcher's injected event sources (`createWatcher`, `createParentFolderWatch`). Real OS delivery stays in the integration test.
- This made the package watcher's unit test pass 10/10 at load ~65 with `fseventsd` ~157% CPU, where it had passed 2/20 before.
- TESTING.md's "File watching on a busy Mac" could state this as the rule for new watcher unit tests. That is the owner's decision; it is not changed here.

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `components/workspace/running/RunningTeamGroup.vue`, `RunningTeamRow.vue`, `components/workspace/common/TeamActivityDot.vue`, their specs and 8 localization keys (en, zh-CN) | nothing: they were mounted by no page; the Workspaces tree's universal Team status covers Team rows. `TeamMemberRow.vue` stays | `agent_execution_architecture.md` (the paragraph removed) |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: finalization per `RELEASE.md`, the round's archive ("record copy") and cleanup.
