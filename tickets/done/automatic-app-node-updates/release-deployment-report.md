# Delivery / Release / Deployment Report — automatic-app-node-updates (autobyteus-356)

## Release / Publication / Deployment Scope

- Repository finalization of the reviewed and validated change into `personal`, then a **beta** release at the user's request.
- The beta carries everything merged since `v1.5.11-beta.10`: this ticket, autobyteus-318, -358, -97 and -348.
- autobyteus-285 (restart resume), which this ticket relies on, already shipped in `v1.5.11-beta.10`.
- Classification (unchanged by delivery): `task_size` `Medium`, `architectural_risk` `High`, route `Reviewed`.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` read from `origin/personal` @ `84ea944ac5`, as the guide requires.
- Deviation, recorded honestly: in this delivery session the guide for autobyteus-284, -339, -349 and -285 was read from the main checkout, which lacked the Secret Gate, so those four finalizations were pushed without it.
  - Delivery ran it retroactively over `1a4453e553..ec3f721622`, the 378 commits covering all four: `PASS (no secrets found)`.
  - From this ticket on, the guide is read from `origin/personal`, and the gate runs before each push.
- Proposed guide fixes: `None`. The guide already says to read it from `origin/personal` (case study `v1.5.9-beta.14`).

## Handoff Summary

- Handoff summary artifact: `tickets/done/automatic-app-node-updates/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/automatic-app-node-updates/delivery-revision-record.md`
- Current delivery revision ID: `DR-002`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `3b9dc912a1`.
- Latest tracked remote base reference checked: `origin/personal` @ `84ea944ac5` (fetched 2026-11-02).
- Base advanced since bootstrap: `Yes`, by 134 commits: autobyteus-318 (test and tooling hygiene, including the Electron test setup and the web typecheck baseline), -358, -97 and -348.
- New base commits integrated into the ticket branch: `Yes`.
- Local checkpoint commit result: `Completed`. The architecture reviewer's uncommitted edits to `design-review-report.md` and `architecture-review-revision-record.md` (ARCH-REV-003 to -005, ending in Pass) were committed as `51aa6398c2`, attributed to the reviewer.
- Overlap:
  - `electron_packaging.md`, `settings.md`: separate hunks.
  - `electron/tsconfig.json`: the base excludes `vitest.global-setup.ts`; this change adds two shared includes. Separate hunks.
  - The base's new `electron/tsconfig.typecheck.json` extends `tsconfig.json`, so it inherits the includes.
- Integration method: `Merge` → `42d74d09c6`; no conflicts. `pnpm install --frozen-lockfile` ran before the checks.
- Integration result: `Completed`.
- Post-integration executable checks rerun: `Yes`.

| Check | Command | Result |
| --- | --- | --- |
| DEL-01a Electron main suite | `pnpm -C autobyteus-web test:electron run` | Pass: `Tests 407 passed \| 1 skipped (408)` (as IMP-01) |
| DEL-01b web typecheck | `pnpm -C autobyteus-web typecheck` | Pass: `production errors: 0; test-file errors: 99 in 43 files (baseline 99 in 43 files)`. The baseline is the one autobyteus-318 cut on the base |
| DEL-01c Electron `tsc` | `pnpm -C autobyteus-web exec tsc -p electron/tsconfig.json --noEmit` | Pass (exit 0) |
| DEL-01d full web suite | `pnpm -C autobyteus-web test:nuxt` | Pass: `Test Files 689 passed (689)`, `Tests 5046 passed (5046)` (4986 before the merge) |
| DEL-01e Secret Gate | `scripts/check_secrets.sh origin/personal..HEAD` (before the first push of the ticket branch) | Pass: 32 commits, no secrets |
| DEL-01f release-guide checks | `python3 scripts/check_licensing.py`; `python3 scripts/check_repository_artifact_hygiene.py` | Pass; Pass |

- Post-integration verification result: `Passed`. Summary: `evidence/DEL-01-post-integration-checks.log`.
- Delivery edits started only after integrated state was current: `Yes`.

## Verification

- Evidence judged: `Sufficient`.
- Evidence relied on:
  - the Acceptance-Criteria Proof and Cases in `api-e2e-execution-coverage-report.md` (API-REV-003, 93.9%; no category below 90%; every critical AC proven);
  - the round-3 files opened below;
  - the IMP mutation records;
  - the integrated rerun.
- The gap to 95% has three named parts: the live 15-minute bound, residual O-6, and the user-only Developer ID install. None leaves an AC unproven.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 (both off by default; off = today) | Round 2 API-01, round 1 API-01 | As recorded; the off path's code is unchanged since | Proven |
| AC-002 (switch on: downloads, installs, restarts without a click; row; also busy) | `API-02B-r3-sampler.jsonl`, `-sidebar.log`; `API-02D-r3` row | Health 200 in every sample through the wait. The window was gone at 07:15:51 with health 200 on the new version. Sidebar `"1 updated"`. Busy machine (load up to 415): an 81 s wait, no false failure | Proven. The Developer ID signed install is the user's own (the test copies use an ad hoc signature) |
| AC-003 (busy agents resume after the automatic restart) | `API-03-r3-busy-run-after.json` | `notices` 1: "The application restarted … after an update to 1.5.11-beta.11. Your previous turn was interrupted. …"; `isActive` true | Proven |
| AC-004 (node updated to the desktop's version) | Round 1 API-06/08/09 | Node on the desktop's version; row "Updated automatically to …"; the node path is unchanged since `31d38080fc` (API-10-r3) | Proven |
| AC-005 (failures) | `API-05C-r3-state.log`; API-05-r3 (3 of 3); round 2 API-04; round 1 API-07/08; API-13 | `outcomeReason` "The system updater could not prepare this update."; row "Automatic update failed. Nothing was changed. \| … \| It won't be tried again automatically. You can still install it yourself."; no server exit; after a restart only the yml is fetched | Proven, with residual O-6 (FU-006) |
| AC-006 (no server surface) | `API-10-r3-ac006.log` | The greps for the 356 names exit 1 in the server and contracts | Proven |

- More evidence requested: `None`.
- User check needed: `No`, not to finalize. The Developer ID signed install happens on the user's own machine: the user's first real automatic update is that proof.

## Release Decision

- Decision: `Beta`.
- Decided by: the user, 2026-11-02: "please release a beta for this ticket … there will be a new release request, it will be a beta if everything is fine. i say this in advance thanks".
  - "This ticket" in the first line was autobyteus-285. It already shipped in `v1.5.11-beta.10` (through autobyteus-362), so the beta the user asked for is this one: the release request the user announced, 356, released together with everything since beta.10.

## Docs Sync Result

- Docs sync artifact: `tickets/done/automatic-app-node-updates/docs-sync-report.md`
- Docs sync result: `Updated` (by the change; delivery checked the merged text).

## Ticket State Transition

- Ticket moved to `tickets/done/automatic-app-node-updates`: `Yes`
- Archived ticket path: `tickets/done/automatic-app-node-updates/` on `personal`

## Second Integration And Re-Verification (DR-002)

- History (DR-001): finalization was blocked. `origin/personal` moved to `fc5a726444` (`v1.5.11-beta.11`, cut by another task; 356 not in it), and the re-integration conflicted with autobyteus-363 in `NodeServerUpdate.vue` and `docs/settings.md`. Delivery aborted the merge, reopened the ticket and routed it to implementation as a `Local Fix`.
- The fix (IR-004):
  - merge `08984df524` (`origin/personal` @ `fc5a726444`);
  - the node switch sits at the foot of 363's server cell, and the node is asked once per row;
  - CRR-007 Pass;
  - API-REV-004 Pass on the merge against a real test node;
  - CRR-008: test review Not Applicable.
- Integration state at DR-002: `origin/personal` was still `fc5a726444`, already in the branch (`git log HEAD..origin/personal` empty). Integration method: `Already current`.
- No-rerun rationale for delivery's own suites: after `08984df524` only ticket documents changed (`git diff --stat 08984df524 HEAD -- . ':!tickets'` is empty), and on that exact code:
  - IMP-02 reran the web typecheck (production errors 0; test-file errors 99, at baseline), the Electron `tsc` and the full web suite (5085 passed);
  - API-R4 reran the Electron suite (407) and the Nodes, notifications and stores tests (1212) on a clean checkout of `482e9ce797`.
  The release's pre-tag checks and the build-only release run then cover the merged `personal` state.
- Re-verification from evidence (the merged Nodes UI, AC-004/REQ-005):
  - `API-14-layouts-after-outcome.json`: `toggleInCell` true at narrow 462 px, medium 913 px and wide (server column 16rem); the cell reads "Updated automatically to 1.5.11-beta.11", notice null.
  - `API-14-switch-on-follow.json`: a real node, from `Server 1.5.11-beta.7` through `Preparing 1.5.11-beta.11…` and `Restarting…` to `AUTO_UPDATED`; `updatedLines` 1.
  - O-7: for about 6 s the row shows the window's own "Updated to 1.5.11-beta.11." before the automatic line. Cosmetic.
  - The merge does not touch `autobyteus-web/electron`, so API-REV-003's real-Squirrel results stand.
  - Judgement: `Proven`. No user check is needed to finalize.
- The architecture reviewer's edits: committed in `51aa6398c2` (DR-001); the worktree is clean.

## Repository Finalization

- Bootstrap context source: `requirements-doc.md` § Document Status (branch `codex/automatic-app-node-updates`, target `personal`) and `RELEASE.md` § Finalization Target (read from `origin/personal`).
- Ticket branch: `codex/automatic-app-node-updates` @ `2c54eb55ef` (DR-002 archive). Secret Gate passed before its first push.
- Ticket branch push result: `Completed` (deleted after the merge, see cleanup).
- Finalization target remote / branch: `origin` / `personal`.
- Target advanced after verification: `No` (`fc5a726444` from the fix merge to the push).
- Merge into target result: `Completed` (`git merge --no-ff` on `finalize/automatic-app-node-updates` → `e241868162`; its tree equals the verified `2c54eb55ef`; Secret Gate on the merged state passed).
- Push target branch result: `Completed` (`fc5a726444..e241868162 HEAD -> personal`, after a fetch confirmed `personal` had not moved).
- Repository finalization status: `Completed`.

## Release / Publication / Deployment

- Applicable: `Yes` (the user's beta decision).
- Method: `Project Release Guide` (`RELEASE.md` from `origin/personal`): `bash scripts/desktop-release.sh beta --branch finalize/automatic-app-node-updates --no-push`, then pushes.
- Version: `v1.5.11-beta.12` (`python3 scripts/release_versions.py next-beta`). Release commit `260d4e3fc4` (`chore(release): bump workspace release version to 1.5.11-beta.12`), annotated tag `v1.5.11-beta.12`.
- Content since `v1.5.11-beta.11`: autobyteus-356 only (plus beta.11's release records).
- Checks before tagging, on the merged `personal` `e241868162`:
  - licensing: Pass. Hygiene: Pass. Secret Gate `v1.5.11-beta.11..HEAD`: Pass (46 commits). See `evidence/REL-01-pretag-checks.log`.
  - Release smoke check (`python3 scripts/release_smoke.py`), `evidence/REL-02-release-smoke.log`:
    - Claude 3/3, Codex 3/3, Antigravity 2/2 and AutoByteus 2/2 PASS;
    - Grok 0/3, every case refused for quota (`429 … free-usage-exhausted`, rolling 24 h; beta.11's smoke check had used the free tier the same day).
    - **Waiver:** the user waived Grok for `v1.5.11-beta.12` (2026-11-02: "Waive Grok"). Reason: a quota refusal, not a product failure. 356 changes no agent runtime.
  - Build-only release run (`pnpm release:test --ref personal`, run `41453287610`), `evidence/REL-03-build-only-run.log`:
    - attempt 1: four targets succeeded; macOS ARM64 was cancelled because no hosted runner picked it up (a capacity annotation);
    - rerun of the failed job (transient, RELEASE.md Recovery): success. All five desktop targets built; Publish skipped.
- Push: `personal` `e241868162..260d4e3fc4` after a fetch confirmed it unmoved (Secret Gate on the release commit: Pass); tag `v1.5.11-beta.12` pushed at 14:28:52Z.
- Pipelines (`evidence/REL-04-rollout.log`), watched together:
  - Desktop Release: success;
  - Android APK Release: success;
  - Server Docker Release: success;
  - iOS App Store Connect Release: success on attempt 2. Attempt 1 failed only the simulator UI test `testFakeNodeOpensAndRestoresWithFakeMobileMarker` ("Timed out while evaluating UI query"); the build and 27 unit tests passed. That test runs against a fake node, the workflow does not build the web app, and no iOS file changed since beta.11, whose iOS run passed. So it was transient; `gh run rerun --failed` led to success, including Archive And Upload To App Store Connect.
- Published artifacts: the GitHub pre-release `v1.5.11-beta.12`, `isPrerelease` true, **23 of 23 assets**:
  - macOS ARM64 and x64 `.dmg` and `.zip` with blockmaps;
  - the Linux x64 and ARM64 AppImages, the Windows `.exe`;
  - `latest*.yml` ×4;
  - the Android APK and its `.sha256`;
  - the signed server packages for x64 and arm64 (`.tar.gz`, `.json`, `.json.sig`).
  Docker image `autobyteus/autobyteus-server:1.5.11-beta.12` (the workflow succeeded; `:beta` moves to the newest tag).
- Beta notes: GitHub generated notes. No ticket in the release has a `## What you need to do` section, so the notes were not edited. Observation: the generated body repeats its "Full Changelog" line, as `v1.5.11-beta.11` does. This is existing workflow behaviour, recorded as FU-007.
- Release/publication/deployment result: `Completed`.
- Release notes handoff result: `Not required` for a beta (generated notes). `release-notes.md` is kept for the next stable release.

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates` (created for this ticket).
- Remote branch cleanup: `origin/codex/automatic-app-node-updates` is deleted after this record is pushed (its head `2c54eb55ef` is an ancestor of `personal`).
- Worktree cleanup, worktree prune, local branches (`codex/…`, `finalize/…`): run from the main checkout right after this record commit is pushed. The results are confirmed in the terminal message to the Solution Designer.

## Release Notes Summary

- Release notes artifact: `tickets/done/automatic-app-node-updates/release-notes.md` (user-facing; no "What you need to do" section, because both switches start off).
- A beta uses GitHub generated notes; a user-action section is added only when a ticket in the release has one (`RELEASE.md` § Beta notes with a user action). The result is recorded in the release section.

## Deployment Steps

None beyond the release. Docker users get the image `autobyteus/autobyteus-server:<version>` and `:beta`; desktop users with beta updates on are offered the release.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Directly Usable — No Migration`. Two new desktop-side files appear only when used: `userData/app-update-automatic.json`, and `autoUpdate` in node registry entries.
- Delivery action required: `None`.

## Rollback Criteria

- No migration, so the change can be rolled back: revert the merge and cut a newer beta. Desktop updates never downgrade.
- Revert if a released build does any of these:
  - installs without the switch on;
  - restarts while the system updater is still preparing;
  - retries a failed version automatically;
  - updates a node past the desktop's version.

## Final Status

- Verification complete (from the evidence): `Yes` (DR-002 re-verified on the 363 merge).
- Repository finalization complete: `Yes` (`personal` @ `e241868162`; release commit `260d4e3fc4`; plus this record commit).
- Applicable release complete: `Yes`. Beta `v1.5.11-beta.12`: all four workflows succeeded (iOS on its rerun) and 23 of 23 assets; Grok waived by the user in the release smoke check.
- Applicable safe cleanup: after this commit (confirmed in the terminal message).
- Unresolved blocker: `None`.
- Successful terminal package eligible for return: `Yes`.
- Terminal package sent to the Solution Designer: `Yes`, after this commit and the cleanup.
