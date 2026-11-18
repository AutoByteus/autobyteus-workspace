# Delivery / Release / Deployment Report — restart-resume (autobyteus-285)

## Release / Publication / Deployment Scope

Repository finalization of the reviewed and validated change into `personal`. No release: the request did not ask for one and the release guide's default is "No release". The feature runs paid agent turns without a human after an update (DEC-001), so this report also records what makes a restart count as an update on each update path.

- Classification (unchanged by delivery): `task_size` `Large`, `architectural_risk` `High`, route `Reviewed`.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at the repository root, as on `origin/personal` @ `bea544af1b`. That revision includes autobyteus-355's "Beta notes with a user action".
- Deviations from the guide and why: `None`. This change needs no user action, so its `release-notes.md` has no `## What you need to do` section.
- Proposed guide fixes: `None`.

## Handoff Summary

- Handoff summary artifact: `tickets/done/restart-resume/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/restart-resume/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `efd28d5c4a`.
- Latest tracked remote base reference checked: `origin/personal` @ `bea544af1b` (fetched 2026-11-01).
- Base advanced since bootstrap: `Yes`, by 49 commits:
  - autobyteus-357: ten code-quality leftovers, no behavior change;
  - autobyteus-345: smaller server package, frozen installs;
  - the closure of autobyteus-305;
  - autobyteus-355: beta user-action notes and a Grok smoke change.
- New base commits integrated into the ticket branch: `Yes`.
- Local checkpoint commit result: `Completed`. The architecture reviewer's `design-review-report.md` and `architecture-review-revision-record.md` were untracked. They hold the complete ARCH-REV-001 to ARCH-REV-003 record (latest: Pass). Delivery committed them as `b265c98464`, attributed to the architecture reviewer, before integrating.
- Overlap check before the merge:
  - `autobyteus-server-ts/package.json`: the base adds `files`, moves `prisma` to the dependencies and adds a dev dependency; this change adds `write-release-identity.mjs` to `build:full`. Separate hunks.
  - `standalone-agent-run-root.test.ts`: a one-line change on the base side.
  - 357's cleanups touch the run managers and persistence coordinators next to this change's root code; the merge was clean, and the full suite covers the interplay.
- Packaging interplay, checked by reading the code and by DEL-01:
  - The release stamp is `dist/release-identity.json`. 345's `files` list (`dist`, `prisma`, `application-packages`) keeps it, and `npm pack --dry-run` includes it.
  - Desktop staging (`prepare-server.mjs`, `pnpm deploy --prod`) applies the same list.
  - The Docker build copies `autobyteus-web/package.json`, runs `pnpm -C autobyteus-server-ts build` (= `build:full`, which writes the stamp) and then `pnpm deploy --prod`. The in-place update package is copied out of that image (`release-server-docker.yml`).
  - The starter stops the server with SIGTERM, so the record is written.
  - The starter's self-check runs the candidate server on its own empty data folder before the node's server stops, so it cannot consume the record.
  - A rolled-back trial restores a data copy whose record was written by the same release, so the restart is not treated as an update and the record is discarded (DEC-001). The doc records this as FU-003.
- Integration method: `Merge` (`git merge origin/personal`) → `1459807ff9`; no conflicts. The base changed `pnpm-lock.yaml`, so `pnpm install --frozen-lockfile` ran before the checks.
- Integration result: `Completed`.
- Post-integration executable checks rerun: `Yes`.

| Check | Command | Result |
| --- | --- | --- |
| DEL-01a server typecheck | `pnpm -C autobyteus-server-ts typecheck` | Pass (exit 0) |
| DEL-01b full server unit suite | `pnpm -C autobyteus-server-ts test:unit` | Pass: `Test Files 911 passed \| 5 skipped (916)`, `Tests 7713 passed \| 9 skipped (7722)`, exit 0. This is the first full green run on the final code: IMP-10 had one failure, fixed in `7d9a305627` and rerun only for the affected folders |
| DEL-01c build and release stamp | `pnpm -C autobyteus-server-ts build`; read `dist/release-identity.json`; `npm pack --dry-run --json` | Pass: build exit 0; stamp `{"version":"1.5.11-beta.9"}` = `autobyteus-web` version; packed list includes `dist/release-identity.json` |
| DEL-01d 345's package-contents test on the built output | `pnpm -C autobyteus-server-ts exec vitest run tests/architecture/server-package-contents.test.ts --no-watch` | Pass: `Tests 5 passed (5)` |
| DEL-01e 284's gated real-process E2E | `RUN_BUSY_STOP_NOW_E2E=1 RUN_NATIVE_STANDALONE_SHUTDOWN_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/shutdown/busy-run-stop-now.e2e.test.ts tests/e2e/shutdown/native-standalone-host-shutdown.e2e.test.ts --no-watch` | Pass: `Tests 3 passed (3)` (`evidence/DEL-01-integrated-gated-e2e.log`) |
| DEL-01f release-guide checks | `python3 scripts/check_repository_artifact_hygiene.py`; `python3 scripts/check_licensing.py` | Pass; Pass (hygiene rerun with the archived ticket staged) |

- Post-integration verification result: `Passed`. Summary: `evidence/DEL-01-post-integration-checks.log`.
- Delivery edits started only after integrated state was current: `Yes`.
- Handoff state current with latest tracked remote base: `Yes` (rechecked before the push to `personal`).

## Verification

- Evidence judged: `Sufficient`.
- Evidence relied on:
  - the Acceptance-Criteria Proof and Cases in `api-e2e-execution-coverage-report.md` (API-REV-002);
  - the result files and screenshots opened below;
  - the IMP mutation logs;
  - the integrated rerun (DEL-01).
- Final confidence is 95.1%, and every critical AC is directly proven.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 (record lists exactly the busy runs, before any interrupt) | `API-02-r2-result.json` `recordAfterQuit`, `quitLines`; API-03-r2 idle | 6 entries (agent host ×3, agent_team member, agent_org member, agent delegated), all `status` `running`, written under `Recorded 6 busy run(s)`; the idle run is not recorded | Proven |
| AC-002 (update restart: all continue within a bound, each exactly one notice) | `API-02-r2-result.json` `startLines`, `after`; API-05T-r2 screenshots | Stamp X → X+1 on the same data. `6 resumed, 0 skipped, 0 failed`, and `recordAfterStart` null. Every run has `notices` 1, and each produced new output 3–12 s after the restart: Codex checked the process; Claude acknowledged; the copy reported to its host; the host acknowledged the report. The host's notice lists `probe_worker_…`. Desktop screenshots: the notice is shown once as a system notice in the member's and the host's views, and is still there after a reload | Proven on the server and desktop paths. The installer step (Squirrel) and a signed Docker feed were not run; both end in the same server start on a new stamp, which API-02-r2 exercises, and the packaging check above shows the stamp ships on both paths |
| AC-003 (stopped, archived, Task-closed, idle, messaged-first → none resumed or notified) | API-04-r2, API-04B-r2, API-04C-r2; `API-04E-s3-result.json`; API-03-r2; unit `AC-003: the pre-filter skips … stopped on purpose, archived or deleted` | `summary.violations` []. In s3 the outcomes are: archive refused → resumed 3, archive succeeded → not resumed 4, message first → skipped 3, notice then user 4. Across the 42 targets: messaged first → `skipped … already had input`, `modelSeq [user(n0,u1)]`; archived → no model call; Stop of the active restored run wins. A run terminated before the stop is not busy, so it is never recorded (AC-001), and the pre-filter skips it if it is | Proven |
| AC-004 (non-update restart resumes nothing; record discarded) | API-03-r2 P1 | `1 recorded run(s) not resumed; the restart was not an update`, `notices` 0 | Proven |
| AC-005 (unreadable record; resume that throws; crash during resume) | API-03-r2 P3; API-04D; IMP-02 (`delete-late` mutation) | `record was invalid and was removed`, healthy start; after a crash `recordAfterCrash` null and the next start logs nothing | Proven |
| AC-006 (no regression) | DEL-01b, DEL-01e; API-06-r2 | 7713 passed; 284's E2E 3 passed | Proven |

- More evidence requested: `None`.
- User check needed: `No`, not to finalize. The real Squirrel install relaunches outside an isolated profile onto the user's data (TESTING Rule 2). Every step it reaches on the server side was run, and the user did not ask to check. The user should know that the first real update installed with busy agents is the first run through the installer step.
- Re-verification after later re-integration: `Not needed`: `origin/personal` was still `bea544af1b` after verification, at archive time and before the push to `personal`.

## Release Decision

- Decision: `No release`.
- Decided by: the release guide's default (`RELEASE.md` § Release Decision); the request did not ask for one. A beta or stable release is available on request. The feature only does anything on an update, so it first takes effect on the update *after* the release that ships it: the release that ships it writes no stamp-different record when the user updates to it, because the version being stopped has no recorder.

## Docs Sync Result

- Docs sync artifact: `tickets/done/restart-resume/docs-sync-report.md`
- Docs sync result: `Updated`, by the change. Delivery checked the docs against the integrated code and made no further edits.

## Ticket State Transition

- Ticket moved to `tickets/done/restart-resume`: `Yes`
- Archived ticket path: `tickets/done/restart-resume/` on `personal`

## Version / Tag / Release Commit

None (no release).

## Repository Finalization

- Bootstrap context source: `requirements-doc.md` § Document Status (branch `codex/restart-resume`, target `personal`) and `RELEASE.md` § Finalization Target.
- Ticket branch: `codex/restart-resume` @ `70389a0e23` (archive commit).
- Ticket branch commit result: `Completed` (`b265c98464` review checkpoint, `1459807ff9` base merge, `70389a0e23` delivery artifacts and archive).
- Ticket branch push result: `Completed` (`origin/codex/restart-resume` @ `70389a0e23`; deleted after the merge, see cleanup).
- Finalization target remote: `origin`.
- Finalization target branch: `personal`.
- Target advanced after verification / acceptance: `No` (`origin/personal` stayed `bea544af1b` from the integration to the push).
- Delivery-owned edits protected before re-integration: `Not needed`.
- Re-integration before final merge result: `Not needed`.
- Target branch update result: `Completed` (`git checkout -b finalize/restart-resume origin/personal` @ `bea544af1b`).
- Merge into target result: `Completed` (`git merge --no-ff codex/restart-resume` → `cf0137dfae`; its tree equals the verified `70389a0e23`).
- Push target branch result: `Completed` (`bea544af1b..cf0137dfae HEAD -> personal`, after a fetch confirmed `origin/personal` had not moved), plus this record commit.
- Repository finalization status: `Completed`.

## Release / Publication / Deployment

- Applicable: `No`
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required` now. `release-notes.md` is archived for the release that ships this change.

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-resume` (created for this ticket).
- Remote branch cleanup result: `Completed` (`origin/codex/restart-resume` deleted after `70389a0e23` was confirmed an ancestor of `origin/personal`).
- Worktree cleanup, worktree prune, local branch cleanup (`codex/restart-resume`, `finalize/restart-resume`): run from the main checkout right after this record commit is pushed, since the worktree holds this commit until then. Results are confirmed in the terminal message to the Solution Designer.

## Release Notes Summary

- Release notes artifact: `tickets/done/restart-resume/release-notes.md`. It is user-facing: what resumes, the notice, what is left alone, what does not resume, the cost of a resumed turn, and the rollback position. It has no user-action section.
- Release notes status: `Updated` (for the next release; not used now).

## Deployment Steps

None. The repository deploys no hosted service.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: new transient file `<appDataDir>/restart-resume/busy-runs.json`, written at a graceful stop with busy runs and removed at the next start. No change to existing data and no migration (requirements § Data Continuity).
- Delivery action required: `None`.

## Verification Checks

DEL-01a to DEL-01f above, on the integrated state.

## Rollback Criteria

- No migration, so the change can be rolled back: revert the merge on `personal` and cut a new release. Earlier builds ignore the record file.
- Revert if, after an update, a released build does any of these:
  - resumes a run the user stopped, archived or messaged first;
  - notifies a run twice;
  - resumes runs after a plain quit;
  - fails or slows startup.
- Known and accepted:
  - O-2 (a log classification);
  - a hard kill writes no record (FU-001);
  - a run that could not resume is not shown to the user (FU-002).

## Final Status

- Verification complete (from the evidence): `Yes`
- Repository finalization complete: `Yes` (`personal` @ `cf0137dfae`, plus this record commit)
- Applicable release/deployment/rollout complete or not required: `Yes` (not required; no release; `release-notes.md` kept for the release that ships it)
- Applicable safe cleanup complete or not required: remote branch `Completed`; worktree and local branches after this commit (confirmed in the terminal message)
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to the Solution Designer: `Yes`, after this commit and the cleanup
- Terminal message/reference: message to `/software_engineering_team/solution_designer`
