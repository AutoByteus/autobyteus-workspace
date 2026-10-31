# Delivery / Release / Deployment Report — projects-left-navigation

## Release / Publication / Deployment Scope

Repository finalization of `codex/projects-left-navigation` into `origin/personal`. No release, publication or deployment (see Release Decision). `task_size=Large`, `architectural_risk=High`, route: reviewed (architecture review, code review, API/E2E, test-code review).

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` `bfb6d5b154`, read in the ticket worktree after integrating the base (unchanged since the bootstrap base `8faae96899`).
- Deviations from the guide and why: `None`. The pre-tag checks (release smoke, build-only release run) apply only to a tag; no tag is made. Licensing and hygiene checks were run anyway on the merged state.
- Proposed guide fixes, and whether the user agreed: `None`.

## Handoff Summary

- Handoff summary artifact: `tickets/done/projects-left-navigation/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/projects-left-navigation/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: —

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `8faae968997564cf52dc404eb6b6f6a7721d5434`
- Latest tracked remote base reference checked: `origin/personal` `bfb6d5b15438071973294b6c60faa0c811e57b94` (fetched 2026-10-31 ~15:20 local)
- Base advanced since bootstrap or previous refresh: `Yes` (106 commits)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed` — `754d9f6373` (the code reviewer's and architecture reviewer's uncommitted records)
- Integration method: `Merge` — `0c8a6f4d22`, no conflicts
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes`
- Post-integration verification result: `Passed`
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes` (re-checked before the final merge; see Repository Finalization)

### Rerun plan (TESTING.md § Rerun by impact)

- Validated code commit `c9972a1581`; `git diff --name-only 8faae96899 origin/personal` outside `tickets/` touches `autobyteus-ts/src/memory/store` (a shared foundation, Rule 4), run history, agent execution, agent memory, Electron application and web run-config files. Six files changed on both sides: `agent-run-service.ts`, `standalone-agent-run-lifecycle-service.ts`, `api/graphql/types/agent-run.ts`, `agent-run-history-catalog-service.ts`, `autobyteus-web/package.json`, `docs/design-cases.md`.
- Merge review: the base's runtime switch builds the run's config through `StandaloneAgentRunLifecycleService.buildConfig`, which carries `project` (all three call sites); no new `AgentRunConfig` construction bypasses it. Effective lines after the merge: catalog service 491 (base alone 504; the ticket's row-projector extraction keeps it under 500), lifecycle 443, agent-run GraphQL 342, agent-run service 318.
- Decision: every recorded case **Rerun** (Rule 4), plus typechecks and rebuilt outputs (Rule 5).

| ID | Reruns | Command | Result | Evidence |
| --- | --- | --- | --- | --- |
| DEL-00 | build | `pnpm install`; `pnpm -C autobyteus-server-ts prebuild` (builds `autobyteus-ts` and the SDKs); `pnpm -C autobyteus-web exec nuxt prepare`; `pnpm -C autobyteus-server-ts build` | Pass (`build-exit=0`, bootstrap smoke passed) | `evidence/delivery/DEL-00-install-build.log` |
| DEL-01 | API-R01, API-R04 (IMP-01, IMP-06, IMP-10) | `pnpm -C autobyteus-server-ts test:unit` | Pass: `Test Files 901 passed \| 5 skipped (906)`, `Tests 7652 passed \| 9 skipped (7661)` | `DEL-01-server-test-unit.log` (+ `.full.log.gz`) |
| DEL-02 | API-R02, API-R03 (IMP-02, IMP-03, IMP-05) | server `typecheck`; web `typecheck`; `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | Pass: `server-typecheck-exit=0`; `[typecheck] production errors: 0; test-file errors: 298 in 139 files (baseline 298 in 139 files)`, `PASS`; guards exit 0 | `DEL-02-typecheck-guards.log` |
| DEL-03 | API-R03, API-03, API-07 (IMP-04, IMP-07, IMP-13) | `pnpm -C autobyteus-web test:nuxt --run` | Pass: `Test Files 680 passed (680)`, `Tests 4927 passed (4927)` | `DEL-03-web-test-nuxt.log` (+ `.full.log.gz`) |
| DEL-04 | API-01, API-02 | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture> … vitest run tests/e2e/projects tests/e2e/run-history tests/e2e/agent-team-runs` | Pass: `Test Files 39 passed (39)`, `Tests 180 passed \| 4 skipped (184)`; PRH-01…PRH-10 pass; `DEL-04/project-run-history.json` `prh01.prompt` starts `## Project\n\nYou work in the Project …`, `runRecordKeys` holds no Project key | `DEL-04-server-e2e.log` (+ `.full.log.gz`), `DEL-04/project-run-history.json` |
| DEL-05 | API-04, API-06 | `env -i PATH HOME TMPDIR USER LOGNAME pnpm -C autobyteus-web test:e2e:projects-left-navigation --output-dir …/DEL-05-browser-probe` | Pass: `PLN-01: Pass` … `PLN-10: Pass`; `PLN-09.details.stopDiag` = `{"serverActiveAfterStop":[false],"projectsStopButtonsAfter5s":0,"teamStopShownBefore":1,"teamStopShownAfter5s":0,…}`; cleanup `dataRootRemoved: true` | `DEL-05-browser-probe.log`, `DEL-05-browser-probe/evidence.json`, `PLN-*.png` |
| DEL-06 | API-05 | `isolated-app start --build --data-root /tmp/pln-del-iso` → stop → scripted AGY lines in `server-data/.env` → `start --from-worktree` (`iso-53238-d272`) → `node evidence/api-e2e/API-05-desktop-journey.mjs 53238 <backendUrl> <dataRoot> <out>` → stop; data root removed, `list` empty | Pass: `run folder and runtime: {"workspaceRootPath":"/tmp/pln-del-iso/launch-repo","runtimeKind":"antigravity_cli"}`; `## Project section: "## Project\n\nYou work in the Project …"`; `Team row with Task line: "Review the launch checklist"`; `run marked open: "true"`; `page errors: []`; `result: "Pass"` | `DEL-06-desktop/DEL-06-desktop-journey.log`, `DEL-06-desktop/API-05-0[1-8]-*.png`, `DEL-06-instance-{start,stop}.json`, `DEL-06-build-start.log` |

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: the execution report's Acceptance-Criteria Proof and Cases (API-REV-002, final confidence 95%, target 95%, no category below 94%), the evidence files opened below, and the integrated-state rerun (DEL-00…DEL-06). Mocked: the model provider only (the repository's scripted Antigravity CLI drives real delegation through the real MCP tools); no mocks of our code. Not tested: live paid inference on the five runtimes (AC-014 allows the scripted runtime, labeled), a recomposing runtime's restore (unit-tested), remote runs (shared scope key).

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 (switch, same run, remembered) | API-04 PLN-01 `evidence.json`; DEL-05 PLN-01 | `workspacesMark` = the open run; `remembered: "true"`; screenshot `PLN-01-projects-three-projects.png` shows the switch and three Projects | Proven |
| AC-002 (existing runs via Task records) | API-01 PRH-08; PLN-01 `perProject` | One run id under P, Q and R; archived run absent | Proven |
| AC-003 (start under P: record, folder, prompt) | API-01 `project-run-history.json` `prh01`; PLN-02; API-05 log; DEL-04 | Prompt starts `## Project\n\nYou work in the Project …`; `runRecordKeys` without a Project key; `listedMs: 204`; folder `p-folder`; desktop `## Project section` line and `workspaceRootPath …/launch-repo` | Proven |
| AC-004 (New chat chip) | PLN-03 | `chipR` first folder `r-first`; Q → `temp_workspace`; `chipPicked: "Website … · picked-folder"`; "No project" run has no section | Proven |
| AC-005 (Team under P) | PRH-03; PLN-04 | `recordedMs 198`, `listedMs 410`; coordinator and member told the Project | Proven |
| AC-006 (delegated rows live) | PLN-05; API-05; screenshot `PLN-05-p-team-with-task-line.png` | Team row under the run in P with Task line "Review the launch checklist" and members, `teamRowMs 814` | Proven |
| AC-007 (scopes) | PRH-04/05/06/10; PLN-05; API-03 | Q work only under Q; Temp-task work under P; multi-Project copy under both, then only Q | Proven (observation: current Task line) |
| AC-008 (closure, reactivation) | PLN-06; PRH-06; API-05 | Rows leave on DONE; reopen + message brings them back; member conversation kept (2 entries) | Proven |
| AC-009 (beyond the cap) | PRH-07; PLN-07 | `wsListedCount 6`, `pListedCount 8`; A opens | Proven |
| AC-011 (reconnect, last good tree) | PLN-08 | New PID after restart; `treeKept: true`; `lateProjectLive: true` | Proven for Projects mode's own state (FU-008 existing) |
| AC-012 (archive, delete, Stop, group archive) | PLN-09 r2 and DEL-05; PRH-08/09; screenshot `PLN-09-after-stop-projects.png` | `projectsStopButtonsAfter5s: 0`, `teamStopShownAfter5s: 0`; "Stop running runs first." toast; 8 listed runs archived, outsider kept; deleted Project's runs stay in Workspaces | Proven |
| AC-014 (packaged app, real delegation) | API-05 r2 log; DEL-06 | `result: "Pass"`, `page errors: []`, Team row with Task line, run marked open in Workspaces | Proven (scripted runtime, labeled) |
| AC-015 (folder rule) | PLN-03 | as AC-004 | Proven |
| AC-010, AC-013, AC-016, AC-017 (non-critical) | PLN-05, PLN-10, API-06 screenshots; DEL-05 `PLN-10-chip-menu-projects-tab.png` | Board follows; keyboard; zh-CN tabs `["工作区","项目"]`; narrow strip; briefcase; chip tabs and "No project" | Proven |

- More evidence requested: `None`.
- User check needed: `No`. Nothing in this change needs the user's own accounts or nodes; the API/E2E report marks no user-only part.
- Re-verification after later re-integration: see Repository Finalization.

## Release Decision

- Decision: `No release`
- Decided by: the release guide's default (`RELEASE.md` § Release Decision: "No release … the default when the user does not ask for one") and the ticket's bootstrap ("release only on the user's word", `investigation-notes.md`); the user did not ask. A beta or stable release is available on request; `release-notes.md` is ready.

## Docs Sync Result

- Docs sync artifact: `tickets/done/projects-left-navigation/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-server-ts/docs/modules/{projects,run_history,prompt_engineering}.md`, `autobyteus-web/docs/{projects,workspace_layout,chat}.md`
- No-impact rationale: N/A

## Ticket State Transition

- Ticket moved to `tickets/done/projects-left-navigation`: `Yes` (in `72fe02dcaf`)
- Archived ticket path: `tickets/done/projects-left-navigation/`

## Version / Tag / Release Commit

None: no release.

## Repository Finalization

- Bootstrap context source: `investigation-notes.md` (finalization target `origin/personal`) and `RELEASE.md` § Finalization Target.
- Ticket branch: `codex/projects-left-navigation`
- Ticket branch commit result: `Completed` — `72fe02dcaf` (docs sync, delivery artifacts, release notes, archive), on top of the merge `0c8a6f4d22` and checkpoint `754d9f6373`.
- Ticket branch push result: `Completed` — first push after the Secret Gate (`origin/personal..codex/projects-left-navigation`, 31 commits, PASS).
- Finalization target remote: `origin`
- Finalization target branch: `personal`
- Target advanced after verification / acceptance: `No` (`bfb6d5b154` at verification, before the merge and before the push).
- Delivery-owned edits protected before re-integration: `Not needed`
- Re-integration before final merge result: `Not needed`
- Target branch update result: `Completed` — `git checkout -b finalize/projects-left-navigation origin/personal` at `bfb6d5b154`.
- Merge into target result: `Completed` — `git merge --no-ff` → `d9a51f16dc`; its tree is identical to the verified ticket branch (`git diff --stat codex/projects-left-navigation HEAD` empty). Secret Gate on the merged state: PASS (32 commits).
- Push target branch result: `Completed` — `origin/personal` re-fetched and still `bfb6d5b154`, then `bfb6d5b154..d9a51f16dc HEAD -> personal`.
- Repository finalization status: `Completed`
- Blocker: none.

## Release / Publication / Deployment

- Applicable: `No`
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required` (kept in the archived ticket for a later release)

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation`
- Worktree cleanup result: run from the main checkout right after this record is pushed (`git worktree remove --force`; the worktree then holds only untracked build output and installed packages). The terminal message reports the outcome.
- Worktree prune result: same step (`git worktree prune`).
- Local ticket branch cleanup result: same step (`codex/projects-left-navigation`, `finalize/projects-left-navigation`).
- Remote branch cleanup result: `Completed` — `origin/codex/projects-left-navigation` deleted after `72fe02dcaf` was confirmed an ancestor of `origin/personal`.
- Isolated desktop instances and probe stacks: stopped and removed (`isolated-app list` → `[]`; `/tmp/pln-del-iso` removed; probe `dataRootRemoved: true`).
- Blocker: none.

## Release Notes Summary

- Release notes artifact created before verification / acceptance: `tickets/in-progress/projects-left-navigation/release-notes.md`
- Archived release notes artifact used for release/publication: not used (no release); kept at `tickets/done/projects-left-navigation/release-notes.md`
- Release notes status: `Updated`

## Deployment Steps

None. This repository deploys no hosted service (`RELEASE.md` § Deployment).

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected` for existing data; a new additive file `projects/<projectId>/project_runs.json`.
- Delivery action required: `None`
- Result and evidence: DEL-01 includes `run-records-rollback-shape.test.ts` (released key sets for index rows); DEL-04 PRH-01 asserts the exact file shape and no Project key on run records; PRH-09 asserts Project Delete keeps the file.

## Verification Checks

- `python3 scripts/check_repository_artifact_hygiene.py`: passed on the integrated ticket branch; rerun on the merged state below.
- `python3 scripts/check_licensing.py`: consistent.
- `scripts/check_secrets.sh origin/personal..HEAD`: PASS (30 commits) before any push; rerun below.

## Rollback Criteria

Revert the merge on `personal` (`RELEASE.md` § Rollback). Rolling back is possible: older builds never read `project_runs.json`, and run metadata, history index rows and Team trees keep their released keys (IMP-10, the rollback-shape test). After a rollback, runs started under a Project are listed in Workspaces as before; an older build's Project Delete leaves the file, which is harmless.

## Final Status

- Verification complete (from the evidence): `Yes`
- Repository finalization complete: `Yes` (`origin/personal` `d9a51f16dc`)
- Applicable release/deployment/rollout complete or not required: `Yes` (`Not required`: no release)
- Applicable safe cleanup complete or not required: `Yes` (remote branch deleted; worktree and local branches removed right after this record, reported in the terminal message)
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to the Solution Designer: `Yes`, after this record is pushed
- Terminal message/reference: `send_message_to` the Solution Designer (`Delivery Completed`)
