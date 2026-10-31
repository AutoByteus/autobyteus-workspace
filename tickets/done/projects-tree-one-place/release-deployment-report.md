# Delivery / Release / Deployment Report — projects-tree-one-place

## Release / Publication / Deployment Scope

Repository finalization of `codex/projects-tree-one-place` into `origin/personal`, then a **beta** release on the user's word. `task_size=Medium`, `architectural_risk=Low`, route: direct (review gates `Not Applicable`).

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` `f7f331d96b` (read in the ticket worktree; unchanged since `eaafd77ac5`).
- Deviations from the guide and why: `None`.
- Proposed guide fixes, and whether the user agreed: `None`.

## Handoff Summary

- Handoff summary artifact: `tickets/done/projects-tree-one-place/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/projects-tree-one-place/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `f7f331d96b`
- Latest tracked remote base reference checked: `origin/personal` `f7f331d96b` (fetched at delivery start)
- Base advanced since bootstrap or previous refresh: `No`
- New base commits integrated into the ticket branch: `No`
- Local checkpoint commit result: `Not needed` (working tree clean apart from untracked build output)
- Integration method: `Already current`
- Integration result: `Completed`
- Post-integration executable checks rerun: `No`
- Post-integration verification result: `Passed` (the validated state is the delivered state)
- No-rerun rationale: the branch was 0 commits behind `origin/personal`. API/E2E validated code `60fc6161d2` (with the removals in `724bc349ff`) plus its own test commit `36c258a77a`; after that only `b101c2c948` (reports and evidence) and this delivery's docs and ticket files were added. No code changed after validation.
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes` (re-checked before the final merge; see Repository Finalization)

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: the execution report's Acceptance-Criteria Proof and Cases (API-REV-001, final confidence 95.7%, every category ≥ 95%, target 95%), the files opened below. Mocked: the model provider only (scripted Antigravity CLI driving the real MCP tools). Not tested: paid inference.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 (user's case: host run in no Project) | PLN-01 `API-02-browser-probe/evidence.json`, `PLN-01-projects-all-empty.png`; PRH-05 `API-01/project-run-history.json` | `hints` P/Q/R "No runs yet. Use + to run an agent or team for this Project."; `inProjects {"runRows":0,"copyRows":0,"orgGroups":0}`; screenshot shows three empty Projects while the run's delegations show in the center; `prh05.reads.P` lists only runs started under P, not `rootB` | Proven (fixture of the user's case, TESTING.md Rule 2) |
| AC-002 (run under P: all work nested, once, not under Q) | PLN-05; PRH-04; `API-04-desktop/API-04-desktop-journey.log`; `PLN-05-all-work-under-p-none-under-q.png` | `rowsOfAInProjectsMode: 1`, `aUnderQ: 0`, `copiesUnderQ: 0`, `qTaskLineUnderP: "Check the docs links"`; desktop `AC-002: {…"rowsOfRunInProjectsMode":1,…"qRunRows":0}`, `page errors: []`, `result: "Pass"`; screenshot: Team, Q worker and Temp-task worker nested under the run in Prototype Launch | Proven |
| AC-003 (Team under P listed once) | PLN-04; PRH-03 | `recordedMs 173`, `listedMs 489`; PRH-03 passes (Q and R list no Team) | Proven |
| AC-004 (start, archive, delete, Stop, restart without reload) | PLN-02, PLN-08, PLN-09; PRH-08 | PLN-09 `stopDiag` `projectsStopButtonsAfter5s: 0`, `teamStopShownAfter5s: 0`; `deleted` run gone; PLN-08 tree kept after restart | Proven |
| AC-005 (stored shapes unchanged, nothing written for hosts) | PRH-01, PRH-05; API-R01 | `prh01.stored` = `{projectId, runs:[{root:{kind,runId}, linkedAt}]}`; run-record keys without a Project key; `API-01-server-e2e.full.log.gz` `Tests  9 passed (9)` | Proven |
| Regression | API-03 `API-03-server-e2e-regression.log` | `Test Files  39 passed (39)`, `Tests  179 passed \| 4 skipped (183)` | Pass |

- More evidence requested: `None`.
- User check needed: `No`. Nothing needs the user's own accounts or nodes; the report marks no user-only part.

## Release Decision

- Decision: `Beta`
- Decided by: the user, 2026-10-31: "i would like to release a beta for this when its finished thanks" (`requirements-doc.md` § Release Decision), for autobyteus-353 only.

## Docs Sync Result

- Docs sync artifact: `tickets/done/projects-tree-one-place/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-server-ts/docs/modules/{run_history,projects}.md`, `autobyteus-web/docs/{projects,workspace_layout}.md`

## Ticket State Transition

- Ticket moved to `tickets/done/projects-tree-one-place`: `Yes` (in the delivery commit)
- Archived ticket path: `tickets/done/projects-tree-one-place/`

## Repository Finalization

PENDING

## Checks Before Tagging

PENDING

## Version / Tag / Release Commit

PENDING

## Release / Publication / Deployment

PENDING

## Post-Finalization Cleanup

PENDING

## Release Notes Summary

- Release notes artifact created before verification / acceptance: `tickets/in-progress/projects-tree-one-place/release-notes.md`
- Use in this release: a beta tag publishes GitHub generated notes (`RELEASE.md` § Workflow Reference); the curated notes stay in the archived ticket for the next stable release, where they supersede autobyteus-347's "Older runs are included" bullet.
- Release notes status: `Updated`

## Deployment Steps

None beyond the release workflows. This repository deploys no hosted service (`RELEASE.md` § Deployment); users receive the beta through desktop beta updates, the `:beta` Docker tag, and the signed server packages on the GitHub release.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected`.
- Delivery action required: `None`
- Result and evidence: PRH-01 (file shape, released run-record keys), PRH-05 (no file written for host runs).

## Rollback Criteria

Rolling back is possible: no stored data changes. Revert the merge on `personal` and cut a new release (`RELEASE.md` § Rollback); desktop updates never downgrade; Docker users pin an earlier tag.

## Final Status

PENDING
