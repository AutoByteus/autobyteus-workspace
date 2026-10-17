# Delivery / Release / Deployment Report — task-keys-and-dependencies

## Release / Publication / Deployment Scope

- Repository finalization of the verified change into `origin/personal`. There is no release, publication or deployment: the user did not ask for one, and the guide's default is No release.
- `task_size=Large`, `architectural_risk=High`, route: Reviewed (ARCH-REV-003 → IR-003 → CRR-002 → API-REV-001 → CRR-003).

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at the integrated state (`origin/personal@e579e82b7f`; the file is unchanged by this ticket).
- Deviations from the guide and why: `None`. The ticket branch is not pushed. The guide finalizes through a local `finalize/<ticket>` branch and does not require it.
- Proposed guide fixes: `None`. One note on its "Checks Before Tagging" section: UUID-named data snapshots in ticket evidence can exceed the 200-character limit once archived under `tickets/done/`. Delivery archived them as `.tar.gz` (see below). The guide's existing advice already covers this.

## Handoff Summary

- Handoff summary artifact: `tickets/in-progress/task-keys-and-dependencies/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/in-progress/task-keys-and-dependencies/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal@c600028072`
- Latest tracked remote base reference checked: `origin/personal@e579e82b7f` (fetched 2026-10-17)
- Base advanced since bootstrap: `Yes` (38 commits: Workspaces-tree Team status, active-run skill update notices, release `v1.5.5-beta.2` version bump, migration-guideline wording, baseline test fixes)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed`. `d3686fd072` holds the validated package, excluding the untracked `*/dist/` build output.
- Integration method: `Merge` (`97fdd0f7e2`). There were no conflicts; `autobyteus-server-ts/docs/modules/projects.md` auto-merged, the only file changed on both sides.
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes` (logs in `evidence/delivery/`)

| Check | Command | Result |
| --- | --- | --- |
| Shared build + Prisma | `pnpm -C autobyteus-server-ts prebuild` | exit 0 |
| Server types | `pnpm -C autobyteus-server-ts typecheck` | exit 0 |
| Server unit | `pnpm -C autobyteus-server-ts test:unit` | 713 files / 5,783 tests passed, 0 failed (7 gated skips) |
| Web unit | `pnpm -C autobyteus-web test:nuxt --run` | 632 files / 4,482 tests passed, 0 failed. The pre-existing `RightSideTabs.workspaceTarget` failure (FU-API-001) is fixed on base by `ebf5ca614c` |
| Server Projects E2E (clean env) | `env -i … vitest run tests/e2e/projects/{projects-graphql,projects-startup-migration,project-task-boundaries,project-change-feed}.e2e.test.ts` | 29 passed (change feed gated → run below) |
| Gated server Projects E2E (scripted AGY) | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs vitest run tests/e2e/projects` | 16/17 files, 83 tests passed; `task-copy-idle-lifetime` failed (timing, see below) |
| Timing suite, alone and alternating | same gate, `task-copy-idle-lifetime.e2e.test.ts`; base `e579e82b7f` (temporary worktree) vs integrated | base 0/2, integrated 1/2. All failures are load timeouts |

- `task-copy-idle-lifetime` judgement:
  - The host had load averages of 12–131 on 10 cores, from other agents' vitest runs.
  - Failures on both sides were timeouts: Antigravity model discovery, scripted tool-result waits, a 41 s process stop against a 15 s bound, and a 58.7 s shutdown against a 59 s lower bound.
  - The suite's flows use Temp tasks (`ad_hoc_task_…` IDs), whose IDs this ticket keeps unchanged.
  - API/E2E's quiet-host comparison passed 1/1 on both base and ticket.
  - Classified as load-related, not a regression. Not a delivery blocker.
- Post-integration verification result: `Passed`
- Delivery edits started only after the integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `No`. The base was current at `e579e82b7f` for verification, but `personal` then advanced to `a716a4632e`, and merging it conflicts (see Repository Finalization).

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on:
  - Execution report API-REV-001: every critical AC has direct proof. Final confidence is 95.6%, no category is below 90%, and the 95% target is met.
  - Delivery opened the critical evidence itself:
    - `desktop/dsk-002-upgrade-check.json`: data written by the released 1.5.5-beta.1 build gained only `taskKey` / `taskKeys`. There were no new or removed files, the ledger shows `20261017_project_task_keys_v1` SUCCEEDED in 1 attempt, keys follow creation order, and "AutoByteus!" → `autobyteus-2`, "Café Ops" → `cafe-ops`.
    - `desktop/dsk-006-restart-check.json`: `changedSinceFirstStart: []`, still 1 attempt.
    - Screenshots `dsk-003d-board-keys-badges-1440x900.png` (keys, "Blocked by", "Dependency cancelled") and `dsk-003e-task-page-dependencies-1440x900.png` (key chip, Depends on / Required by, the "only informs" note) match the approved design.
    - `browser/projects-feature/result.json`: all steps Pass.
    - `live/live-001-claude-haiku.json`: a real model (Claude Haiku 5.5) worked by key only.
    - `logs/server-e2e-project-task-boundaries.log`: 12/12.
  - Mocks: only agent inference, and a real-model run covers the key-facing tool contract.
  - Not tested: a migration I/O fault during a desktop upgrade (it needs fault injection; the startup E2E covers the failure path on synthesized data).
  - Integrated-state rerun: as above.
- More evidence requested: `None`
- User check needed: `No`. API/E2E reached every behavior on owned surfaces: isolated desktop instances, an owned data root, and a real model on the user's allowed provider. Nothing depends on the user's own accounts or nodes.
- Re-verification after later re-integration: see Repository Finalization.

## Release Decision

- Decision: `No release`
- Decided by: the release guide's default ("No release … the default when the user does not ask for one"). Neither the delegated request nor the handoff asked for a release. A beta or stable release is available on request; the next tag ships server and web together, as this change requires.

## Docs Sync Result

- Docs sync artifact: `tickets/in-progress/task-keys-and-dependencies/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated:
  - in the change: server `docs/modules/projects.md`, `docs/modules/agent_team_execution.md`, `docs/design/collaboration_model.md`; web `docs/projects.md`;
  - by delivery: web `docs/projects.md` (routes table), server `docs/modules/agent_tools_mcp_server.md` (tool contract), server `docs/modules/agent_tools.md` (`delegate_task` `task_id`).

## Ticket State Transition

- Ticket moved to `tickets/done/task-keys-and-dependencies`: `No`. It was archived in `8d4356fb43`, then moved back to `tickets/in-progress/` because finalization is blocked (DR-001).
- Archived ticket path: — (current path `tickets/in-progress/task-keys-and-dependencies/`)
- Evidence path hygiene: three desktop data snapshots (`evidence/desktop/dsk-001-pre-upgrade-projects/`, `dsk-002-after-first-start-projects/`, `dsk-006-before-restart-projects/`) would have had UUID paths of up to 237 characters under `tickets/done/`. They are archived as same-named `.tar.gz` files with identical content (16/16/18 files, counts checked), and the ledger reference is updated. `python3 scripts/check_repository_artifact_hygiene.py` passed with the ticket under `tickets/done/`.

## Version / Tag / Release Commit

- None (No release). `autobyteus-web/package.json` stays at the base's `1.5.5-beta.2`.

## Repository Finalization

- Bootstrap context source: code-review handoff (base `origin/personal@c600028072`) and `RELEASE.md` (target `origin/personal`, `--no-ff` from `finalize/<ticket>`)
- Ticket branch: `codex/task-keys-and-dependencies`
- Ticket branch commit result: `Completed` (local only): `d3686fd072` (checkpoint), `97fdd0f7e2` (merge of `e579e82b7f`), `8d4356fb43` (delivery records), and the follow-up commit holding the Blocked records.
- Ticket branch push result: `Not required` (per the `RELEASE.md` flow; not pushed)
- Finalization target remote: `origin`
- Finalization target branch: `personal`
- Target advanced after verification: `Yes`, `e579e82b7f` → `a716a4632e` (12 commits, including project-tool-split and the `TESTING.md` Rule 9 change)
- Delivery-owned edits protected before re-integration: `Completed` (committed in `8d4356fb43`)
- Re-integration before final merge result: **`Blocked`**. Merging `a716a4632e` conflicts in `project-task-tool-contract.ts`, `docs/modules/projects.md` and `docs/modules/agent_tools_mcp_server.md`. The merge was aborted. Details in DR-001.
- Target branch update result: not started
- Merge into target result: not started
- Push target branch result: not started
- Repository finalization status: **`Blocked`**
- Blocker: target-side conflict with project-tool-split in the agent-tool contract, plus two Rule-9 failure dispositions (DR-001). Classification `Local Fix`; recipient `/software_engineering_team/implementation_engineer`.

## Release / Publication / Deployment

- Applicable: `No`
- Method: `Project Release Guide` (No release)
- Pipelines triggered and their results: none (no tag)
- Published artifacts checked: N/A
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required`

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies`. It is kept for the fix.
- Temporary base worktree `/tmp/tkd-deliv-base-wt` (timing comparison): removed, and `git worktree prune` was run.
- Worktree cleanup result: `Not required yet` (blocked before finalization)
- Local ticket branch cleanup result: `Not required yet`
- Remote branch cleanup result: `Not required` (never pushed)
- Isolated instances: API/E2E stopped both (iso-51714-eb1e, iso-52802-e5b4) and removed the owned data root. Delivery started none.

## Escalation / Reroute

- Classification: `Local Fix`
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Why final handoff could not complete:
  - `origin/personal` advanced after verification with project-tool-split. Its tool-contract changes conflict with this ticket's.
  - The new `TESTING.md` Rule 9 requires cause-based fixes for FU-API-002, which this ticket's migration partly causes, and for the `task-copy-idle-lifetime` failure.
  - Resolving them changes the source under verification, so it goes back through implementation and the validation chain.

## Release Notes Summary

- Release notes artifact: `Not required` (no stable release)
- Release notes status: `Not required`

## Deployment Steps

- None. This repository deploys no hosted service.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Migration Required` for Task keys (`20261017_project_task_keys_v1`, STARTUP_ONLY, prerequisite `20261005_projects_per_folder_v1`). `Directly Usable` for `dependsOnTaskIds` and `retired-task-key-prefixes.json`.
- Delivery action required: `None`. The migration runs at the first start of the release that includes this change.
- Result and evidence:
  - DSK-001/002/006: upgrade of release-written data, then a restart no-op.
  - R4b: startup E2E covering an unkeyable Project, retry and no-op.
  - Migration unit tests.
  - Released-shape → fixture inventory in `docs-sync-report.md`. It was checked against `data_migration_guideline.md` as changed on base by `8a970f214c`.

## Verification Checks

- Repository: `python3 scripts/check_repository_artifact_hygiene.py` passed, and `python3 scripts/check_licensing.py` reports "Licensing is consistent." (on `97fdd0f7e2` plus the delivery edits). Both must be rerun on the final merged state.

## Rollback Criteria

- Roll back if keyed Projects disappear after the upgrade, or if Task writes or agent Task tools fail with key or dependency errors on valid input.
- Method (`RELEASE.md`): revert the merge on `personal` and cut a new release. Desktop updates never downgrade.
- Data compatibility:
  - Older builds read keyed data unchanged. The added `taskKey`, `taskKeys` and `dependsOnTaskIds` fields are ignored by the released readers.
  - `retired-task-key-prefixes.json` is a file; the released store lists only directories.
- Caveat: Tasks created by a rolled-back build have no key. Re-shipping this feature after a rollback would need a new key migration (new ID) for those Tasks, because this migration's ledger row would already be SUCCEEDED.

## Final Status

- Verification complete (from the evidence): `Yes` for the `97fdd0f7e2` integrated state. It must be re-verified after the fix.
- Repository finalization complete: `No` (Blocked)
- Applicable release/deployment/rollout complete or not required: `Yes` (`Not required`, No release)
- Applicable safe cleanup complete or not required: `No` (pending finalization)
- Unresolved blocker: target-side conflict with project-tool-split, plus Rule-9 failure dispositions (DR-001)
- Successful terminal package eligible for return: `No`
- Terminal package sent to `/solution_designer`: `No`
- Reroute: `Local Fix` → `/software_engineering_team/implementation_engineer`
