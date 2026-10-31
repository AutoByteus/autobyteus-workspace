# Delivery / Release / Deployment Report — atomic-agent-run-creation (autobyteus-349)

## Release / Publication / Deployment Scope

Repository finalization of the reviewed and validated change into `personal`. No release: the request did not ask for one and the release guide's default is "No release". The change deletes persisted user data at startup (DEC-001), so this report records the data transition and rollback position for whichever release ships it.

- Classification (unchanged by delivery): `task_size` `Small`, `architectural_risk` `High`, route `Reviewed`.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at the repository root, as on `origin/personal` @ `f7f331d96b`.
- Deviations from the guide and why: `None`.
- Proposed guide fixes: `None`.

## Handoff Summary

- Handoff summary artifact: `tickets/done/atomic-agent-run-creation/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/atomic-agent-run-creation/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `e87e6bb2b1`.
- Latest tracked remote base reference checked: `origin/personal` @ `f7f331d96b` (fetched 2026-10-31).
- Base advanced since bootstrap: `Yes`, by 1 commit: the autobyteus-352 beta.8 delivery record, which holds only ticket documents (`git diff --name-only` outside `tickets/` is empty).
- New base commits integrated into the ticket branch: `Yes`.
- Local checkpoint commit result: `Completed`. The architecture reviewer's `design-review-report.md` and `architecture-review-revision-record.md` were untracked. They hold the complete ARCH-REV-001 (Fail) and ARCH-REV-002 (Pass) record, the Pass the Solution Designer already recorded in `3a317675ca` and the implementation followed. Delivery committed them as `0ff4505277`, attributed to the architecture reviewer, before integrating.
- Integration method: `Merge` (`git merge origin/personal`) → `7d1bc66ba3`; no conflicts.
- Integration result: `Completed`.
- Post-integration executable checks rerun: `Yes`. The integrated code is identical to what API/E2E validated; the rerun confirms it.

| Check | Command | Result |
| --- | --- | --- |
| DEL-01a server typecheck | `pnpm -C autobyteus-server-ts typecheck` | Pass (exit 0) |
| DEL-01b focused suites | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/agent-run-empty-never-started-removal.test.ts tests/unit/agent-execution/agent-run-create-undo.test.ts tests/unit/agent-execution/agent-run-create-service.test.ts tests/unit/agent-execution/agent-run-provisioning-service.test.ts tests/unit/server-runtime-app-data-migration-gate.test.ts tests/architecture/application-framework-boundaries.test.ts tests/architecture/tracked-imports.test.ts --no-watch` | Pass: `Test Files 7 passed (7)`, `Tests 62 passed (62)` |
| DEL-01c full server unit suite | `pnpm -C autobyteus-server-ts test:unit` | Pass: `Test Files 903 passed \| 5 skipped (908)`, `Tests 7665 passed \| 9 skipped (7674)`, exit 0 (the same count as IMP-05) |
| DEL-01d release-guide checks | `python3 scripts/check_repository_artifact_hygiene.py`; `python3 scripts/check_licensing.py` | Pass; Pass (hygiene rerun with the archived ticket staged) |

- Post-integration verification result: `Passed`. Summary: `evidence/DEL-01-post-integration-checks.log`.
- Delivery edits started only after integrated state was current: `Yes`.
- Handoff state current with latest tracked remote base: `Yes` (rechecked before the push to `personal`).

## Verification

- Evidence judged: `Sufficient`.
- Evidence relied on: the Acceptance-Criteria Proof and Cases in `api-e2e-execution-coverage-report.md` (API-REV-002); the result files opened below; IMP-01/IMP-02 with their mutation and fail-before logs; the post-integration rerun. Final confidence is 93.0%; no category is below 90%, and every critical AC is directly proven.
- The gap to 95% has three parts, none of which leaves an AC unproven:
  - remote delegation across two nodes is not run (the code is unchanged; the unit suite covers it);
  - native inference is scripted;
  - AC-004 has no durable case, because it needs a live codex activation.
- Because the change deletes stored data, I checked the kept shapes individually, not only the removed ones.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 (failed activation leaves nothing; caller gets the error) | `API-01-clean-result.json`; API-01-base; IMP-02 | Codex: `success:false`, `spawn codex ENOENT`. Native: `success:false`, `MODEL_IDENTIFIER_NOT_AVAILABLE`, `runId` null. `historyAfter` [], `diskAfter` {}. The base build leaves 2 rows and 2 folders | Proven |
| AC-002 (started run kept; refusal logged) | IMP-02 `IMP-02-create-undo.log` | `AC-002: a run whose start was committed before activation failed is kept, and the refusal is logged` ✓ (real catalog); the base body fails 5 of 9 | Proven |
| AC-003 (only the empty never-started run removed and logged; all others untouched) | `API-02-result.json`, `API-02-server-restart-1.log`; API-02B; IMP-01 and its mutation logs | Removed, each logged `Removed empty never-started run '…' ('Seed E1-empty')` / `('Seed E2-empty-subfolders')`: E1, E2. Kept (`onDisk` true): CTX (4 entries), COLLAB (4), MAY (9 entries, `activationState` ACTIVATED, no `startedAt`), STARTED, TASK (`skipped 1 folder(s) without a standalone run record`), UNREADABLE (`Kept run …: its record could not be read`). Bulk: `bulkEmptyLeft` 0, `bulkStartedKept` 300, `removedLines` 302. The second start removed 0. Mutations: no content check fails 5, following symlinks fails 1, a walk error read as empty fails 2 | Proven |
| AC-004 (normal stop with a create in flight → no empty run after relaunch) | `API-03G-result.json` (3 samples); `API-03-result.json` stuck variant | Each sample: creates sent −74…−4 ms before SIGTERM got `success:true` with a `runId`; those sent after were refused (`fetch failed`); `exit` 0 in 586 / 323 / 445 ms; after relaunch `neverStartedListedAfter` [] and `unknownListedAfter` []; history rows equal the known runs (6 / 12 / 18). Stuck activation + SIGTERM: exit 1 at 11.6 s (bound → sweep), and the cut create left no run | Proven under SR-005's text. Hard kill = accepted residual FU-005 (DEC-003 = C, the user) |
| AC-005 (two-step creation and remote delegation unchanged) | API-04, API-05, IMP-05 | Two-step: record only → first message → `startedAt` with traces → after restart listed, no removal line; 284's gated E2E `Tests 2 passed (2)`; remote delegation by the unit suite | Proven |

- More evidence requested: `None`.
- User check needed: `No`. The user approved the deletion rule itself (DEC-001, after a read-only count of their data), and the evidence shows the implementation deletes exactly that set. The first start on the user's real data is not run, by rule; the user did not ask to check.
- Re-verification after later re-integration: `Not needed`: `origin/personal` was still `f7f331d96b` after verification, at archive time and before the push to `personal`.

## Release Decision

- Decision: `No release`.
- Decided by: the release guide's default (`RELEASE.md` § Release Decision); the request did not ask for one. A beta or stable release is available on request. Whoever cuts it should use `release-notes.md` (curated for stable; for a beta, which uses generated notes, its text should still reach the user).

## Docs Sync Result

- Docs sync artifact: `tickets/done/atomic-agent-run-creation/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `agent_execution.md`, `docs/design-cases.md` (by the change); `run_history.md`, `remote_collaboration.md` (delivery: removed the stale TTL / stale-prepared cleanup claims).

## Ticket State Transition

- Ticket moved to `tickets/done/atomic-agent-run-creation`: `Yes`
- Archived ticket path: `tickets/done/atomic-agent-run-creation/` on `personal`

## Version / Tag / Release Commit

None (no release).

## Repository Finalization

FINALIZATION_SECTION

## Release / Publication / Deployment

- Applicable: `No`
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required` now. `release-notes.md` is archived for the release that ships this change.

## Post-Finalization Cleanup

CLEANUP_SECTION

## Release Notes Summary

- Release notes artifact: `tickets/done/atomic-agent-run-creation/release-notes.md` (user-facing; says what the first start removes, what is always kept, the hard-kill case, and that rolling back is possible).
- Release notes status: `Updated` (written for the next release; not used now).

## Deployment Steps

None. The repository deploys no hosted service.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: DEC-001 = A with the content check (the user, 2026-10-31, after a read-only count: 6 empty never-started runs, 11 May runs with conversations but no start date).
- Delivery action required: `None`. The removal is a startup stage that runs each start, not an app-data migration, and it needs no delivery step.
- Expected effect on the user's data at the first start: the 6 content-free never-started runs are removed and logged; the 11 May runs are kept (the content rule; API-02's MAY shape).
- Rollback: possible. The removed runs held only a record, and earlier builds do not need them; they are not restored. Rolling back also brings back the old behavior: a failed creation leaves an empty run again.

## Verification Checks

DEL-01a to DEL-01d above, on the integrated state.

## Rollback Criteria

- Revert the merge on `personal` and cut a new release.
- Revert if a released build:
  - removes a run that had any content (no evidence of that; the content rule is mutation-checked);
  - logs removals of started runs;
  - fails or noticeably slows startup (measured: 124 ms with nothing to remove, about 15 ms per removal).

## Final Status

FINAL_STATUS_SECTION
