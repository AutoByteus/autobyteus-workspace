# Code Review Revision Record

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result. This record locates each completed review result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | API/E2E Failure-Origin Review (API-REV-001, AC-008 / FU-008) | N/A | `Fail`: `Design Impact` | CR-001 (new) |

## Revision Entries

### CRR-001 — Failure-origin review: a late-firing probe bound misreads an exited child

- Canonical review report updated: `code-review-report.md` (new)
- Review entry point and round: API/E2E Failure-Origin Review (direct route; no prior code review)
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md`, API-REV-001; AC-008 (Grok catalog case in `grok-build-runtime-replay.e2e.test.ts`), AC-007 (DCF-E2E-007)
- Relevant solution revision IDs: as the requirements header
- Relevant architecture-review revision IDs: N/A (direct route)
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail`, `Design Impact` (CR-001)
- What changed in the review result and why:
  - The design's FU-008 mechanism reads `child.exitCode` / `signalCode` when the bound's timer runs.
  - After a main-thread block longer than the bound, Node runs the expired timer before the poll phase that delivers the child's exit, so an exited child is reported as timed out. API-05b: the timer fired at 7,720 ms, `exitCode` null; the exit was processed at 7,730 ms.
  - The implementation follows the design. AC-008's unit case models a late `close`, not a late exit, so IMP-02 passed.
  - AC-007 fails only because the host's FSEvents delivers no events (measured independently): a requirement question on "on this host".
- Supported product scenario / material-premise basis changes: SCN-PROBE-LATE recorded (Supported Explicit Edge, REQ-008)

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001 (open)
- Material score or classification changes: N/A (failure-origin; no scorecard)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty:
  - SM-04 (AGY discovery, the same bound) is held for evidence after the fix;
  - AC-007 cannot pass on this host until FSEvents recovers.
