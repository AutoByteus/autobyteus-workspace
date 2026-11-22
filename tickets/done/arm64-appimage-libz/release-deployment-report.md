# Delivery / Release / Deployment Report — arm64-appimage-libz (autobyteus-28)

## Release / Publication / Deployment Scope

Finalize `codex/arm64-appimage-libz` into `origin/personal`. No release, tag or deployment (see Release Decision). `task_size` `Medium`, `architectural_risk` `High`, route `Reviewed` (ARCH-REV-002, CRR-001, CRR-002 present).

## Project Release Guide

- Release guide path and revision: `RELEASE.md` as on `origin/personal` `81f6aa8be4` (last changed in `87c748a9a5`), read in the ticket worktree after integration. This ticket edits it (Workflow Reference, Linux validation list).
- Deviations from the guide and why:
  - The guide names the main checkout as `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` (macOS). On this node the main checkout is `/home/autobyteus/workspace/autobyteus-workspace`. Finalization ran in the ticket worktree, as the guide requires.
  - `gitleaks` is not on `PATH` here. It was run from `~/.local/bin` (same tool, same `.gitleaks.toml`).
- Proposed guide fixes, and whether the user agreed: `None`.
- Build-only release run (guide § Build-only release run: required for a release workflow, Linux packaging and build-step/gate changes, on the ticket branch before the merge): done by implementation and API/E2E. Desktop Release run 44956618584 on `codex/arm64-appimage-libz` at `05996bd715` (the current source; later commits change only `tickets/` and the durable test) concluded `success`. I confirmed it with `gh run view 44956618584` during delivery. No Server Docker build-only run is needed: the ticket does not touch `release-server-docker.yml` or `autobyteus-server-ts/docker/**`. The merged base commits do touch them, but they were finalized by autobyteus-598.

## Handoff Summary

- Handoff summary artifact: `tickets/done/arm64-appimage-libz/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/arm64-appimage-libz/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: —

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `9f6add773b`
- Latest tracked remote base reference checked: `origin/personal` `81f6aa8be4` (fetched 2026-11-22)
- Base advanced since bootstrap or previous refresh: `Yes`. `ebeec5840f` and merge `81f6aa8be4` (chrome-vnc 1.4.2 pins, autobyteus-598) change `autobyteus-server-ts/docker/Dockerfile.monorepo`, `autobyteus-server-ts/docker/system-level.json` and `tickets/done/chrome-vnc-1.4.2-digests/`.
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed`. `dea66fe614` commits the untracked `design-review-report.md` and `architecture-review-revision-record.md` (ARCH-REV-002), so the integration could not lose them.
- Integration method: `Merge` (`git merge --no-edit origin/personal` → `fa87a5d289`, no conflicts)
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes`. The plan followed TESTING.md "Rerun by impact". The diff since validation, `git diff --name-only 003057f46d fa87a5d289`, is the two Docker files above, autobyteus-598's ticket folder, and this ticket's two architecture-review documents. No API/E2E case (AE-01..AE-11) exercises them, so all of them are **Still valid**. Step 5 still applies: both typechecks and one relevant check on the merged state.
  - `DEL-01-ticket-units-merged.log`: `node --test scripts/desktop-package/verify-clean-image-runtime.test.mjs` → `# pass 3`, `# fail 0`. `python3 -m unittest scripts/tests/test_desktop_release_clean_image_step.py scripts/tests/test_desktop_release_server_package_wait.py -v` → `Ran 17 tests … OK`. `(autobyteus-web) NUXT_TEST=true pnpm exec vitest run scripts/__tests__/linuxAppImageBuild.spec.ts` → `Tests 7 passed (7)`.
  - `DEL-02-web-typecheck.log`: `pnpm -C autobyteus-web typecheck` → `production errors: 0; test-file errors: 86 in 36 files (baseline 86 in 36 files)`, `PASS`, `exit=0`.
  - `DEL-03-server-typecheck.log`: `pnpm -C autobyteus-server-ts typecheck` → `production errors: 0; test-file errors: 1001 in 313 files (baseline 1001 in 313 files)`, `PASS`, `exit=0`.
  - Also run: `python3 -m unittest discover -s scripts/tests -p 'test_desktop_release_*.py'` → `Ran 24 tests … OK` (cited in FU-005).
- Post-integration verification result: `Passed`
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes` (rechecked before the merge; see Repository Finalization)
- Blocker: None

## Verification

- Evidence judged: `Sufficient`. API/E2E final confidence is 95%, with no category below 90%, and every critical AC is directly proven. I opened the case files for each critical criterion and found the lines the report names:

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement (`Proven`/`Not Proven`/`User Check`/`Accepted Risk (DEC-*)`) |
| --- | --- | --- | --- |
| AC-001 (critical) | AE-01 `evidence/api-e2e/AE-01-arm64-runtime-clean-root.log`; AE-03 `AE-03-ci-run-44956618584.log`; AE-09 `IMP-08-fresh-start-arm64-build.log` (via report) | Clean root `libz.so (unversioned) in tarball: 0  libfuse.so.2: 0`. New image `static-pie linked`, `NEEDED count: 0`, `exit=0` twice. Old image `libz.so: cannot open shared object file`, `exit=127` twice. CI `AutoByteus_personal_linux-arm64-1.5.14-beta.6.AppImage: … static-pie linked` | Proven |
| AC-002 (critical) | AE-06 `AE-06-desktop-root-precondition.log`, `AE-06-app-start-extract-and-run.log`, `AE-06-new-app-window.png` | Precondition: `zlib1g-dev installed: 0`, `unversioned libz.so present: 0   libfuse.so.2 present: 0`. Old: `old exit=127` with the `libz.so` loader error. New: `server ready=yes after 8s`, `{"status":"ok","message":"Server is running"}` `HTTP 200`, renderer in its own user namespace with `seccomp 2`, `--no-sandbox` processes 0, window close `runtime exit=0`, `remaining app processes: 0`. The screenshot shows the packaged app's Chat home ("Daily Assistant", sidebar, composer with the model loaded) | Proven (extract-and-run start). FUSE 3 mount start: Accepted Risk (DEC-005). Extract-and-run leftover in `$TMPDIR`: Accepted Risk (DEC-006, AE-11; docs note added) |
| AC-003 (critical) | AE-02 `AE-02-verifier-clean-image-local.log`; AE-03; AE-08 `AE-08-clean-image-step-test.log` | Local verifier, new: `Verified the AppImage runtime loads and extracts AppRun in a clean ubuntu:24.04 image without libz.so`. Old: `(exit 127): … libz.so: cannot open shared object file`. `libz.so` present: `(exit 3): clean image has /lib/aarch64-linux-gnu/libz.so`. CI: both Linux jobs print the `Verified …` line; step `Verify Linux x64 AppImage runs in a clean Ubuntu image` `success`. Wiring test `Ran 6 tests … OK`; each of the 3 mutations `FAILED`; workflow `(empty = restored)` | Proven |
| AC-004 | AE-04 (report), AE-03 | x64 prefix sha256 equals legacy `runtime-x64`, `NEEDED` unchanged, x64 clean-image step success in CI | Proven (non-critical). No same-commit eb25 x64 baseline (no x64 host); the packaging tree equals published beta.6 |
| AC-005 | AE-03 job list, AE-05 (report), AE-09 | All 5 build jobs `success` in run 44956618584 at `05996bd715` (signing/publish `skipped` as a build-only run); names and `latest*.yml` key structure equal | Proven |
| AC-006 | `evidence/published-appimage-runtime-needed.tsv` | Solution Designer's result to the user (not an API/E2E case) | For the Solution Designer's terminal message |

- More evidence requested: `None`
- User check needed: `No`. Nothing needs the user's accounts or nodes. The one path the evidence cannot reach (the FUSE 3 mount, with no `/dev/fuse` here) is covered by the Solution Designer's evidence decision DEC-005, not by a user check.
- User check reference: N/A
- Accepted unverified risks: DEC-005 (FUSE 3 mount start on a real arm64 desktop) and DEC-006 (the extract-and-run leftover, documented). Each decision covers exactly the part not proven.
- Re-verification after later re-integration: see Repository Finalization.

## Release Decision

- Decision: `No release`
- Decided by: the release guide's default ("No release … This is the default when the user does not ask for one"). The request (Task autobyteus-28) asks for the fix and the verification gate, not a release, and the requirements say "A new beta is his decision, not part of this ticket". A release is available: the change ships with the next beta or stable, and `release-notes.md` is ready for it.

## Docs Sync Result

- Docs sync artifact: `tickets/done/arm64-appimage-libz/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-web/docs/electron_packaging.md` (DEC-006 note), `RELEASE.md` (the new test in the Linux validation list). Implementation's and the Solution Designer's doc changes were checked and need no change. TESTING.md gap: FU-005.

## Ticket State Transition

- Ticket moved to `tickets/done/arm64-appimage-libz`: `Yes` (in the final ticket commit)
- Archived ticket path: `/home/autobyteus/workspace/.codex/worktrees/arm64-appimage-libz/tickets/done/arm64-appimage-libz/`

## Version / Tag / Release Commit

None (no release).

## Repository Finalization

Results are recorded in the record commit after the push; see DR-001 in `delivery-revision-record.md` and the "Finalization Record" section below.

## Release / Publication / Deployment

- Applicable: `No`
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required` (prepared for the next release)

## Post-Finalization Cleanup

See "Finalization Record" below.

## Release Notes Summary

- Release notes artifact created before verification / acceptance: `tickets/done/arm64-appimage-libz/release-notes.md` (user-facing; no internal IDs)
- Archived release notes artifact used for release/publication: not used (no release)
- Release notes status: `Updated`

## Deployment Steps

None.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: none (requirements: no persisted data affected)
- Delivery action required: `None`
- Result and evidence: N/A

## Verification Checks

- Merged-state checks: DEL-01..DEL-03 (above).
- Secret gate on `origin/personal..HEAD` before pushing the ticket branch and on the merged state before pushing `personal` (results in the Finalization Record).

## Rollback Criteria

- Code rollback: `git revert -m 1 <merge commit>` on `personal` restores the legacy arm64 runtime and removes the clean-image gate. Nothing is published, so no user is affected until a later release.
- After a later release: if the arm64 AppImage fails to mount on real desktops (DEC-005 risk), users can still start it with `--appimage-extract-and-run` or `--appimage-extract`. A fix-forward release would follow the guide's Rollback section. No data migration is involved.

## Finalization Record

(Filled in by the record commit after the push.)
