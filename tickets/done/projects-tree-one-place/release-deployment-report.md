# Delivery / Release / Deployment Report — projects-tree-one-place

## Release / Publication / Deployment Scope

Repository finalization of `codex/projects-tree-one-place` into `origin/personal`, then a **beta** release on the user's word. `task_size=Medium`, `architectural_risk=Low`, route: direct (review gates `Not Applicable`).

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` `f7f331d96b` (read in the ticket worktree; unchanged since `eaafd77ac5`).
- Deviations from the guide and why: one, a delivery slip, recovered (see Repository Finalization): `personal` was pushed with a merge of a base newer than the verified one before that state was checked. The generic delivery rule (re-check the target after verification; re-integrate and rerun before the final merge) was not followed at that moment; the reruns were done right after, on the pushed merge, before any release step.
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

- Bootstrap context source: `investigation-notes.md` / `RELEASE.md` § Finalization Target (`origin`, `personal`).
- Ticket branch: `codex/projects-tree-one-place`
- Ticket branch commit result: `Completed` — `7938ff883c` (docs sync, delivery artifacts, release notes, archive).
- Ticket branch push result: `Completed` — first push after the Secret Gate (`origin/personal..HEAD`: PASS).
- Finalization target remote / branch: `origin` / `personal`
- Target advanced after verification / acceptance: **`Yes`** — `f7f331d96b` → `325e0f9593` (23 commits of autobyteus-349, `atomic-agent-run-creation`: undo of a failed one-call run creation; removal of empty never-started runs at startup; server only, plus docs).
- What happened: I created `finalize/projects-tree-one-place` from the freshly fetched `origin/personal` (`325e0f9593`), merged (`6b58f3f5af`; only `run_history.md` changed on both sides, auto-merged in separate sections), ran the Secret Gate on the merged state (PASS) and, after confirming `origin/personal` had not moved since that fetch, pushed `325e0f9593..6b58f3f5af`. My check compared against the fetch, not against the verified base, so the merged state was pushed before it was checked. Nothing is undone (`RELEASE.md`: fix forward).
- Recovery, on the pushed merge `6b58f3f5af`, before any release step (TESTING.md rerun by impact: server run creation and startup changed; web unchanged):
  - DEL-01: `pnpm install --frozen-lockfile`, server `prebuild`, `build`, `typecheck`: all exit 0 (`evidence/delivery/DEL-01-build-typecheck.log`).
  - DEL-02: server unit suite: `Test Files 902 passed | 5 skipped (907)`, `Tests 7660 passed | 9 skipped (7669)` (`DEL-02-server-test-unit.log`).
  - DEL-03: server E2E `tests/e2e/projects tests/e2e/run-history tests/e2e/agent-team-runs`: `Test Files 39 passed (39)`, `Tests 179 passed | 4 skipped (183)`; PRH-01…PRH-10 pass, PRH-05 (the user's case) included (`DEL-03-server-e2e.log`, `DEL-03/project-run-history.json`).
  - DEL-04: browser probe PLN-01…PLN-10 on the rebuilt merged server (see below).
  - Not rerun: the web suite and typecheck (no web file changed in the 23 commits); the packaged desktop journey (no desktop-shell or web change; the build-only release run and the release smoke check exercise the packaged build and run starts on the merged state).
- Merge into target result: `Completed` — `6b58f3f5af`
- Push target branch result: `Completed` — `325e0f9593..6b58f3f5af`
- Repository finalization status: `Completed`; verification re-done on the merged state (above).

## Checks Before Tagging

On `personal` `6b58f3f5af` plus the allowlist commit `3699c58e09` (`evidence/delivery/REL-01-pretag-checks.log`, `REL-02-release-smoke.log`):

- `python3 scripts/check_licensing.py`: `Licensing is consistent.`
- `python3 scripts/check_repository_artifact_hygiene.py`: `Repository artifact hygiene check passed.`
- `scripts/check_secrets.sh v1.5.11-beta.8..HEAD`: first **BLOCKED**, 1 finding: `generic-api-key` in `tickets/done/atomic-agent-run-creation/evidence/API-349-probe.mjs:42`, commit `2b87d1ab16` (autobyteus-349, already on `personal`). Checked by shape and context, never at a provider: the value is the scripted inference server's model ID in its `{ models: [{ key: … }] }` list (the same name is the `model` of its replies), not a credential. Fixed with the narrowest `.gitleaks.toml` entry, with its reason: that exact value, the generic rule only, that probe file only (`3699c58e09`). Rerun: `PASS (no secrets found)`, 35 commits. (The finding entered `personal` with autobyteus-349's commits; its own gate range would have covered that commit. Noted for the Solution Designer; no action taken on 349's records.)
- `python3 scripts/release_smoke.py` (after `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts prebuild`): **PASS**, 13/13: Claude 3/3, Codex 3/3, Grok 3/3, Antigravity 2/2, AutoByteus 2/2; models `{"claude": "haiku", "codex": "gpt-5.6-luna", "grok": "grok-4.7"}`; commit `3699c58e09`. No runtime waiver.
- Build-only release run: see Version / Tag / Release Commit.

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
