# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `implementation_engineer` / `implementation-handoff.md` / round 1 | SR-003, IR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: archived or deleted open runs close to the workspace empty view

- Triggering role, report path, and round: `/software_engineering_team/implementation_engineer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears/tickets/in-progress/archived-open-run-disappears/implementation-handoff.md`, round 1.
- Triggering finding or case IDs: N/A (initial validation)
- Related revision IDs: SR-003 (design), IR-001 (implementation); architecture review and code review N/A (direct low-risk route).
- Why this baseline was recorded: first completed API/E2E validation result.
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-server-ts/tests/unit/run-history/services/agent-run-resume-config-service.test.ts` (API-001: server `RUN_ARCHIVED` / `isActive` contract on the real catalog archive path).
  - Updated `autobyteus-server-ts/tests/unit/run-history/services/agent-run-history-catalog-service.test.ts` (BASE-001, baseline fix, separate commit: stub `collaborationRoots` so the tests no longer import the process root-manager graph).
  - Kept the implementation's new and updated web specs (Still Valid).
- Cases added, changed, removed, or rechecked: REPO-01..05, LIVE-01..LIVE-10 (LIVE-10 Not Tested live).
- Commands, environment, fixture, or broader-validation delta: isolated desktop instance `--from-worktree` (build verified to contain the fix), fake AGY CLI, GraphQL seed `api-e2e-evidence/live-seed.mjs`.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-evidence/`.
- Prior result and confidence: N/A
- Current result and confidence: `Pass`, 95% (no category below 90%)
- New or remaining failure IDs: none
- Recommended owner: N/A
- Remaining risks, blocked evidence, or untested scope: draft discard (SCN-A1) and the Archive/Delete server-failure paths are proven by specs only. Web-build browser Back was not run (same code path as the stale address, which was proven).
