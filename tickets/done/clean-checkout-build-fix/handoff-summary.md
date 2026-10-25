# Handoff Summary: clean-checkout-build-fix (URGENT)

## Ticket

- Package `clean-checkout-build-fix`, Project Task `autobyteus-282`.
- `task_size=Medium`, `architectural_risk=Low`. Route: direct. Architecture, source and test-code review are `N/A — not applicable`.
- API/E2E API-REV-001: Pass, 95.5%. Delivery DR-001.

## What Was Wrong

- autobyteus-280 (merged as `48b29c4342`) moved the frozen memory-migration modules to `autobyteus-server-ts/src/app-data-migrations/frozen/autobyteus-ts/memory/`.
- The server's `.gitignore` had a bare `memory` rule, which ignores every folder named `memory`, so git never tracked those files.
- Worktrees that had them on disk built and tested green, including 280's delivery checks. A clean checkout of `personal` failed: tsc and the migration suites could not resolve 22 imports.
- No published release contains it. The newest tag, `v1.5.9-beta.2`, predates `48b29c4342`.

## What Changed

- **Restored files.** The frozen memory modules and their needed dependencies are now tracked (19 files under `frozen/autobyteus-ts/memory/`). They are frozen copies at the version 280 froze, then pruned.
- **Ignore rule.** `autobyteus-server-ts/.gitignore` ignores only `/memory/`, the runtime data folder at the server root.
- **New check.** `scripts/check_repository_artifact_hygiene.py` has a tracked-imports group: tracked code that imports a file git does not track fails. It runs:
  - in every server test run (`tests/architecture/tracked-imports.test.ts`);
  - in the pre-tag hygiene check that the release workflows run;
  - alone with `--only tracked-imports`.
- **Docs:** `TESTING.md`, `RELEASE.md` and the data migration guideline. Delivery added the check to RELEASE.md's pre-tag list.

## Integration

- Base `origin/personal` @ `1c9edce551`. The branch was current, with no new base commits, so no rerun was needed beyond API/E2E's fresh-clone runs of the delivered tree.

## Verification

- From the evidence, no user check:
  - **AC-001:** a fresh clone (`--no-local`, 0 untracked or ignored files) builds: install, prebuild, tsc, build, `test:integration:prepare`. Unit 6657, integration 421, and architecture plus migration startup e2e all pass; e2e lists 838 tests.
  - **AC-002:** `check-ignore` results are right (frozen files not ignored, `/memory/` ignored).
  - **AC-003:** the check passes on the tree and fails (23 imports, exit 1) on a reproduction of the original failure.
- Only failure: FU-001 of autobyteus-280, pre-existing.

## Release

- No release (RELEASE.md default; not requested). Releases built from `personal` after `48b29c4342` work again from this merge on.

## Follow-ups

- `follow-ups.md` (see the file). Delivery lesson recorded in `release-deployment-report.md`: green checks in a worktree do not prove a clean checkout. The tracked-imports check now covers this failure class.
