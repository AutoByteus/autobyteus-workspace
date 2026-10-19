# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer / `code-review-report.md` CRR-001 / Round 1 | SR-002, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 95.5% |

## Revision Entries

### API-REV-001 — Baseline: user's crash → restart → continue journey on the built server, plus negative control

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` (CRR-001, Pass), round 1
- Triggering finding or case IDs: none (no findings); still-to-run items AC-005, AC-006 at the real boundary, EXC-E2E-007
- Related revision IDs: SR-002, ARCH-REV-002, IR-001, CRR-001
- Why this baseline was recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/projects/unclean-shutdown-delegated-team-restore.e2e.test.ts` (`f91c9126db`)
- Cases added, changed, removed, or rechecked:
  - Added: API-01 (USR-1), API-02 (USR-2, USR-3), API-04 (USR-4), API-07 (USR-5).
  - Existing E2E run: API-03 (EXC-E2E-007), API-05 (delegation-forest-restore).
  - One-off checks: API-06 (test type check), API-08 (negative control on base `f171032e88`).
  - Reused: IMP-02, IMP-03, IMP-06, IMP-07, IMP-08.
- Commands, environment, fixture, or broader-validation delta: the worktree was built (`prebuild` + `build`). The lifecycle E2E ran three `dist/app.js` processes (SIGKILL crash, restart, second restart) in a clean env with the scripted AGY CLI. A temporary base worktree was built and then removed.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/API-*`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.5% (no category below 95% where applicable; user-surface N/A)
- New or remaining failure IDs: none
- Recommended owner: Code Reviewer for proportional test-code review of the new E2E file
- Remaining risks, blocked evidence, or untested scope:
  - REQ-006 is unit-only by nature.
  - Other runtimes are covered at store level.
  - Observation for FU-002: display readers log snippets of damaged lines before the repair.
