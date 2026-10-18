# Delivery / Release / Deployment Report — task-keys-and-dependencies

## Release / Publication / Deployment Scope

- Repository finalization of the verified change into `origin/personal` (DR-002), then a **beta release `v1.5.5-beta.3`** (DR-003). The delegating Task's "Done when" asks for "tests, a beta release, and the user's check in the app" (`handoff-architecture-design-complete.md` line 42; `investigation-notes.md` line 22). DR-001 and DR-002 wrongly recorded that nobody had asked for a release; the Solution Designer's receipt check caught it.
- `task_size=Large`, `architectural_risk=High`, route: Reviewed (ARCH-REV-003 → IR-003 → CRR-002 → API-REV-001 → CRR-003 → DR-001 Blocked/Local Fix → IR-004 → CRR-004 → API-REV-002 → CRR-005 → DR-002).

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at the final integrated state (`origin/personal@66429d6f31`; the file is unchanged by this ticket).
- Deviations from the guide and why: `None`. The ticket branch is not pushed. The guide finalizes through a local `finalize/<ticket>` branch and does not require it.
- Proposed guide fixes: `None`. One note on its "Checks Before Tagging" section: UUID-named data snapshots in ticket evidence can exceed the 200-character limit once archived under `tickets/done/`. Delivery archived them as `.tar.gz` (see below). The guide's existing advice already covers this.

## Handoff Summary

- Handoff summary artifact: `tickets/in-progress/task-keys-and-dependencies/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/in-progress/task-keys-and-dependencies/delivery-revision-record.md`
- Current delivery revision ID: `DR-004`

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

## DR-002 Integration Refresh (final)

- Latest tracked remote base checked: `origin/personal@66429d6f31` (fetched at DR-002 start).
- IR-004 integrated it: merges `6c1fa46436` (project-tool-split, conflicts resolved) and `08ce2f0483` (remove-nested-task-team), plus baseline fixes `fa49138794`, `9eeb58fb9d`, `361eea070d`. Ticket HEAD is `c95e0138e8`, 0 commits behind.
- New base commits integrated by delivery in DR-002: `No` (already current).
- Local checkpoint commit: `Not needed` (no integration step).
- Delivery-side rerun: `Not needed`. The working tree's source equals `c95e0138e8`; only ticket artifacts are uncommitted. API-REV-002 reran every case by impact at that exact commit (`evidence/logs/r2-*`, `evidence/browser/*-r2*/`, `evidence/desktop-r2/`, `evidence/live-r2/`):
  - server typecheck: pass; unit 5,811 passed; architecture 44 passed;
  - web unit: 4,473 passed;
  - core Projects E2E: 11 + 6 + 14 passed;
  - gated `tests/e2e/projects`: 17/18;
  - PT-E2E 17/17, PMU, DSK-001..006 and LIVE-001: passed.
- Rule 9 dispositions (all failures have causes and owners):
  - `team-run-v1-production-upgrade` 3/4:
    - this ticket's part (the ledger row count) is fixed in-branch by `fa49138794`;
    - the rest is caused by `20260901_agent_org_flat_team_families_v1` writing an AgentOrg tree where the test expects Team V2 files. Owner: that migration (FU-API-002).
  - `task-copy-idle-lifetime`: intermittent, from fixed timers and probe limits under CPU contention.
    - The cause is documented on base in `TESTING.md` (`45291d105f`) and reported to the idle-shutdown and AGY model discovery owners.
    - The suite and its helpers are byte-identical to base, and alternating series pass equally (FU-API-005).
  - PMU-021 once: a `FileExplorerStreamingService` `ws.onerror` log during `page.reload()`. File-explorer code is identical to base; owner: file explorer (FU-API-004).
- Handoff state current with latest tracked remote base: `Yes`. It is re-checked before the final merge (Repository Finalization).

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
- User check needed: **`Yes`**, because the delegating Task's "Done when" asks for the user's check in the app. (DR-001/DR-002 said `No`, which was wrong.) The evidence alone already proves the change works; this check is the requested acceptance step on the released beta.
- User check reference: **Passed** (DR-004): the user replied "works. now i am running the latest beta" on 2026-10-17, after upgrading their own desktop app to `v1.5.5-beta.3` and checking Projects (Task keys on the cards; the minimal check agreed with the user).
- Re-verification after re-integration (DR-002): `Sufficient`.
  - API-REV-002 re-proved every critical AC at `c95e0138e8`, at 95.6% confidence with no category below 90%.
  - Delivery opened the round-2 evidence:
    - `desktop-r2/dsk-002-upgrade-check.json`: Pass; no failures or new files; `20261017_project_task_keys_v1` SUCCEEDED in 1 attempt; same prefixes and keys as round 1.
    - `desktop-r2/dsk-006-restart-check.json`: Pass, `changedSinceFirstStart: []`.
    - `desktop-r2/dsk-003-ui.json`: steps Pass.
    - `live-r2/live-001-claude-haiku.json`: 10/10 checks, including "Task created after the rename keeps the prefix (live-keys-5)" through the new `update_project`.
    - `browser/projects-feature-ledger-r2.txt`: PT-E2E-001..017 Pass.
    - `logs/r2-server-e2e-project-task-boundaries.log`: 14/14.
  - User check needed: see above (Yes, pending since DR-003).

## Release Decision

- Decision: **`Beta`** (`v1.5.5-beta.3`)
- Decided by: the user's request. The delegating Task's "Done when" says "tests, a beta release, and the user's check in the app". DR-001/DR-002 recorded `No release` by mistake; the Solution Designer's receipt check (`_delivery-receipts/task-keys-and-dependencies/solution-designer-receipt-verification.md`) found it, and DR-003 corrects it.

## Docs Sync Result

- Docs sync artifact: `tickets/in-progress/task-keys-and-dependencies/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated:
  - in the change: server `docs/modules/projects.md`, `docs/modules/agent_team_execution.md`, `docs/design/collaboration_model.md`; web `docs/projects.md`;
  - by delivery: web `docs/projects.md` (routes table), server `docs/modules/agent_tools_mcp_server.md` (tool contract), server `docs/modules/agent_tools.md` (`delegate_task` `task_id`).

## Ticket State Transition

- Ticket moved to `tickets/done/task-keys-and-dependencies`: `Yes` (DR-002, in the delivery commit before the merge). DR-001 had archived it and then moved it back while blocked.
- Archived ticket path: `tickets/done/task-keys-and-dependencies/`
- Evidence path hygiene:
  - The round-1 and round-2 desktop snapshots are `.tar.gz` files. DR-001 archived the round-1 ones; API/E2E archived the round-2 ones in `evidence/desktop-r2/`.
  - No tracked path under `tickets/done/` exceeds 200 characters, and no name is invalid on Windows.
  - `python3 scripts/check_repository_artifact_hygiene.py` is run on the merged state (Verification Checks).

## Version / Tag / Release Commit

- Release worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies-beta`, branch `finalize/task-keys-and-dependencies-beta` from `origin/personal@1e8b45486b`.
- Checks before tagging, on `1e8b45486b`: `check_licensing.py` "Licensing is consistent."; `check_repository_artifact_hygiene.py` passed.
- Version: `python3 scripts/release_versions.py next-beta` → `1.5.5-beta.3`.
- `bash scripts/desktop-release.sh beta --branch finalize/task-keys-and-dependencies-beta --no-push` → commit `516e592d7b` "chore(release): bump workspace release version to 1.5.5-beta.3" (`autobyteus-web/package.json` only) and annotated tag `v1.5.5-beta.3`.
- After re-fetching, `origin/personal` was still `1e8b45486b`. Pushed `1e8b45486b..516e592d7b HEAD -> personal`, then the tag `v1.5.5-beta.3`.

## Repository Finalization

- Bootstrap context source: code-review handoff (base `origin/personal@c600028072`) and `RELEASE.md` (target `origin/personal`, `--no-ff` from `finalize/<ticket>`)
- Ticket branch: `codex/task-keys-and-dependencies`
- Ticket branch commit result: `Completed` (local). The DR-002 delivery commit is on top of `c95e0138e8`; its SHA is in `delivery-revision-record.md` → DR-002 Finalization Result.
- Ticket branch push result: `Not required` (per `RELEASE.md`; never pushed)
- Finalization target remote: `origin`
- Finalization target branch: `personal`
- Target advanced after verification: `No` (`origin/personal` still `66429d6f31` at merge and again before the push)
- Delivery-owned edits protected before re-integration: `Completed` (committed before the merge)
- Re-integration before final merge result: `Not needed`
- Target branch update result: `git fetch origin personal`; `git checkout -b finalize/task-keys-and-dependencies origin/personal`
- Merge into target result: `Completed`, `1b108514cb` (`--no-ff`; tree identical to the verified ticket tree)
- Push target branch result: `Completed`, `66429d6f31..1b108514cb HEAD -> personal` after a re-fetch confirmed `origin/personal` unchanged
- Repository finalization status: `Completed`

## Release / Publication / Deployment

- Applicable: `Yes` (Beta)
- Method: `Project Release Guide` (`RELEASE.md` → Cutting The Release, beta)
- Pipelines triggered and their results (tag push `v1.5.5-beta.3`):

| Workflow | Run | Result |
| --- | --- | --- |
| Desktop Release | 39045177328 | success |
| Android APK Release | 39045177303 | success |
| iOS App Store Connect Release | 39045177374 | success |
| Server Docker Release | 39045177298 | success |
| AutoByteus NFS Release | 39045177326 | failure (not part of this release: the user says NFS is moving out of the superrepo; no action) |

- Published artifacts checked:
  - GitHub release `v1.5.5-beta.3`: `isPrerelease: true`, not a draft, **17 assets**, which matches the guide's table:
    - macOS arm64 and x64: `.dmg`, `.zip` and both blockmaps;
    - Linux x64 and arm64 AppImages;
    - the Windows `.exe`;
    - `latest.yml`, `latest-mac.yml`, `latest-linux.yml`, `latest-linux-arm64.yml`;
    - the Android APK and its `.sha256`.
  - Docker Hub `autobyteus/autobyteus-server`:
    - `1.5.5-beta.3` and `beta` share digest `sha256:2620dcf053bf…` (amd64 and arm64);
    - `latest` is unchanged (`sha256:8c6724d5e830…`, 2026-10-15).
  - TestFlight upload: the iOS workflow succeeded.
- Release/publication/deployment result: **`Completed`** (all four release workflows succeeded)
- Release notes handoff result: `Not required`. A beta uses GitHub generated notes.

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies`
- Temporary worktrees: DR-001's `/tmp/tkd-deliv-base-wt` and API/E2E's round-2 base worktree are removed and pruned.
- Worktree removal, `git worktree prune`, and deletion of local branches `codex/task-keys-and-dependencies` and `finalize/task-keys-and-dependencies` run right after the record commit is pushed, because the worktree holds this record.
- A receipt copy of the archived ticket is exported from the pushed commit to `/Users/normy/autobyteus_org/autobyteus-worktrees/_delivery-receipts/task-keys-and-dependencies/tickets/done/task-keys-and-dependencies/`. Results are confirmed in the terminal message.
- Remote branch cleanup result: `Not required` (the ticket branch was never pushed)
- Isolated instances: API/E2E stopped round 1 (iso-51714-eb1e, iso-52802-e5b4) and round 2 (iso-54666-daa7, iso-54787-85d6) and removed their owned roots. Delivery started none.

## Release Notes Summary

- Release notes artifact: `Not required` (beta; generated notes)
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

- Repository, on merge `1b108514cb` before the push: `check_repository_artifact_hygiene.py` passed; `check_licensing.py` reports "Licensing is consistent."; no `*/dist/` path in the merge diff.

## Rollback Criteria

- Roll back if keyed Projects disappear after the upgrade, or if Task writes or agent Task tools fail with key or dependency errors on valid input.
- Method (`RELEASE.md`): revert the merge on `personal` and cut a new release. Desktop updates never downgrade.
- Data compatibility:
  - Older builds read keyed data unchanged. The added `taskKey`, `taskKeys` and `dependsOnTaskIds` fields are ignored by the released readers.
  - `retired-task-key-prefixes.json` is a file; the released store lists only directories.
- Caveat: Tasks created by a rolled-back build have no key. Re-shipping this feature after a rollback would need a new key migration (new ID) for those Tasks, because this migration's ledger row would already be SUCCEEDED.

## Final Status

- Verification complete from the evidence: `Yes` (DR-002)
- User check in the app (requested by the Task): **`Passed`** (DR-004): the user replied "works. now i am running the latest beta" on 2026-10-17, after upgrading their own desktop app to `v1.5.5-beta.3` and checking Projects (Task keys on the cards; the minimal check agreed with the user). The full list offered to the user: Steps the user was asked to check on `v1.5.5-beta.3`, with **Settings > Updates > Receive beta updates** on:
  1. Every Project Task card shows a key (e.g. `autobyteus-1`); existing Tasks are numbered in creation order.
  2. A Task page shows the key chip (copy works) and a Dependencies card.
  3. Edit task → "Depends on" adds a dependency, and the board card shows "Blocked by <key>" until that Task is Done.
  4. The Workspaces-tree Task summary reads "<key> <summary>".
- Repository finalization complete: `Yes` (`1b108514cb`, record `1e8b45486b`, release commit `516e592d7b` on `personal`)
- Release complete: `Yes` (Beta `v1.5.5-beta.3`, 4/4 release workflows, 17 assets, Docker `1.5.5-beta.3` / `beta`)
- Applicable safe cleanup complete or not required: `Yes`. The ticket worktree and branches were removed (DR-002), and the beta worktree and branch (DR-003). The DR-004 record worktree is removed after this push.
- Unresolved blocker: `None`
- Successful terminal package eligible for return: **`Yes`** (DR-004)
- Terminal package sent to `/solution_designer`: `Yes`, after this record's push (DR-004)
