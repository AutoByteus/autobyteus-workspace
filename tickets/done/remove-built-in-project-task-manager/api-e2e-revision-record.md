# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` / `code-review-report.md` (CRR-001 Pass) / API/E2E round 1 | SR-001, SR-002, ARCH-REV-001, IR-001, CRR-001 | N/A | Pass / 95.7% |

## Revision Entries

### API-REV-001 — Baseline: built-entrypoint migration E2E, cross-version upgrade and browser AC-008

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md`, CRR-001 round 1 (Pass)
- Triggering finding or case IDs: CRR-001 residual risks: AC-008/UNK-001, and entry-point confirmation of AC-001..AC-005.
- Related revision IDs: SR-001, SR-002, ARCH-REV-001, IR-001, CRR-001
- Why this baseline was recorded: first completed API/E2E validation of commit `62af418df`.
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-server-ts/tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts` (E-001..E-004).
  - Added `autobyteus-server-ts/tests/fixtures/app-data-migrations/retired-built-in-project-task-manager/` (FX-001).
  - All existing coverage is `Still Valid`.
- Cases added, changed, removed, or rechecked: R-001..R-005, E-001..E-004, TMP-001, TMP-002.
- Commands, environment, fixture, or broader-validation delta:
  - Rebuilt the dist from `62af418df`.
  - Ran a negative control with the migration unregistered in the dist (4/4 failed as expected; dist restored).
  - Ran a temporary base `1aa918298` worktree build (removed afterwards).
  - Ran a free-port Nuxt dev frontend and headless Chrome against owned backends.
  - The emulated LM Studio was used only for run history.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (all), `api-e2e-execution-coverage-report.md` (all), `api-e2e-test-case-ledger.md` (events 1–12)
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.7% (post-repository 91.4%)
- New or remaining failure IDs: None
- Recommended owner: N/A (Pass). Proportional test-code review of the added E2E and fixture is per handoff rules.
- Remaining risks, blocked evidence, or untested scope:
  - The packaged Electron shell was not exercised (same server entry, no shell change).
  - AC-010 docs review belongs to Delivery.
  - SCN-007 and PREM-001 are unsupported/contrived.
