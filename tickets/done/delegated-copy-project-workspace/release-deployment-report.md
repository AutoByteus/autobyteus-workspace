# Delivery / Release / Deployment Report — delegated-copy-project-workspace

## Release / Publication / Deployment Scope

Repository finalization of `codex/delegated-copy-project-workspace` into `origin/personal`. No release. `task_size=Medium`, `architectural_risk=High`, route: reviewed.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` `c952758a81`.
- Deviations from the guide and why: `None`.
- Proposed guide fixes: `None`.

## Handoff Summary

- Handoff summary artifact: `tickets/done/delegated-copy-project-workspace/handoff-summary.md`
- Delivery revision record: `tickets/done/delegated-copy-project-workspace/delivery-revision-record.md`; current revision `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `c952758a81`
- Latest tracked remote base reference checked: `origin/personal` `c952758a81`
- Base advanced since bootstrap: `No`; new base commits integrated: `No`
- Local checkpoint commit result: `Not needed` for integration; the reviewers' uncommitted records were committed as `bbb7907d7f`.
- Integration method: `Already current`; result: `Completed`
- Post-integration executable checks rerun: `No`. No-rerun rationale: 0 commits behind; validated code `8959bc507a` and tests `e6321c9e82` are what is delivered; later commits are documents only.
- Delivery edits started only after integrated state was current: `Yes`

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: API-REV-001 (95.9%, every category ≥ 95%), the files below. Mocked: the manager and most copies run the scripted Antigravity CLI (real tool path; its process cwd is its capsule by design, so its folder is proven from launch inputs); real Codex and Claude copies for the actual working directory. Not tested: a folder-scoped Codex catalog on a configured placement (AC-008 at unit level).

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 | `API-01-server-e2e.log`, `API-01/delegated-copy-project-folder.json` `dcf01`; `API-02/delegated-copy-project-folder-live.json` | `Tests 8 passed \| 2 skipped`; `dcf01.copy` recorded, capsule and `addDirs` = `…/folder-F`, manager `…/workspace`; DCF-L1 `codex_app_server` and DCF-L2 `claude_agent_sdk`: `pwdWrittenByTheCopy` = F, `inG: false` | Proven |
| AC-002 | `dcf02` | coordinator and member capsule/`addDirs` = F | Proven |
| AC-003 | DCF-03 | sub-work in F with the manager in G | Proven |
| AC-004 | DCF-04 | no link and Temp task inherit | Proven |
| AC-006 | `dcf06`; API-03 `project-change-feed` | `TASK_PROJECT_FOLDER_UNAVAILABLE` with the approved text, "Nothing was started."; the feed test asserts the refusal and the unassigned Task | Proven |
| AC-007 | `dcf08` | two different server `pids`; `launchesAfterRestart` copyG in G, copyF in F, manager in G | Proven |
| AC-009 | `API-04-desktop/API-04-desktop-journey.log` | agent copy and Team member terminals `pwd` = `…/project-folder`; manager control `…/manager-folder`; P `runRows: 0`; `newRowForProjectFolder: true`; `page errors: []`; `result: "Pass"` | Proven |
| AC-005, AC-008 (non-critical) | DCF-05; unit `collaborator-admission` | F1 chosen; launch check reads F's catalog | Proven (AC-008 at unit level) |
| Regression | `API-03-server-e2e-regression.log` | after the approved test update: both files `Tests 48 passed (48)`; first run `1 failed \| 245 passed` (the updated feed test, explained) | Pass |

- More evidence requested: `None`. User check needed: `No`.

## Release Decision

- Decision: `No release`
- Decided by: the bootstrap ("release only on the user's word", `investigation-notes.md`) and `RELEASE.md`'s default; the user did not ask.

## Docs Sync Result

- Docs sync artifact: `tickets/done/delegated-copy-project-workspace/docs-sync-report.md`; result `Updated` (server `projects.md`, `collaboration_model.md`; web `agent_orgs.md`).

## Ticket State Transition

- Ticket moved to `tickets/done/delegated-copy-project-workspace`: `Yes` (in the delivery commit)

## Version / Tag / Release Commit

None.

## Repository Finalization

PENDING

## Release / Publication / Deployment

- Applicable: `No`; `Not required`. `release-notes.md` written for the next release.

## Post-Finalization Cleanup

PENDING

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: new copies' recorded folder only, in the existing field; no shape change; no migration. DCF-08 restores old-rule and new-rule copies in their own folders.

## Rollback Criteria

Revert the merge on `personal`. No stored data changes shape; copies started under this version restore in their recorded folder on an older build.

## Final Status

PENDING
