# Code Review Revision Record — desktop-node-file-open-471 (autobyteus-471)

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | API/E2E Failure-Origin Review (API-REV-001: F-1, F-2, F-3) | N/A | Fail (Local Fix, implementation) | CR-001, CR-002, CR-003 |
| CRR-002 | `api-e2e-test-review-report.md` | Proportional test-code review after API/E2E pass (API-REV-002) | Fail (Local Fix) | Pass | CR-001, CR-002, CR-003 (resolved) |

## Revision Entries

### CRR-001 — Failure-origin review of API-REV-001

- Canonical review report updated: `tickets/in-progress/desktop-node-file-open-471/code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 1 (direct route; no prior source review)
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md`; F-1, F-2, F-3 (AC-003, REQ-001)
- Relevant solution revision IDs: SR-002
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Fail, Local Fix (implementation)
- What changed in the review result and why: baseline. All three failures are implementation defects confirmed in code:
  - CR-001: `AgentEventMonitor`'s autobyteus-278 remote branch pre-empts the new rule.
  - CR-002: a desktop path attachment in a remote run is read from the window's own node.
  - CR-003: a node file opened by a caller other than the link handler is editable.
- Supported product scenario / material-premise basis changes: REQ-003's "(links and path attachments)" is read as applying to both clients; it is not a Requirement Gap.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001, CR-002, CR-003
- Material score or classification changes: N/A (no scorecard on a failure-origin round)
- Recommended recipient: implementation engineer
- Remaining risks or uncertainty: if no existing desktop surface can show the remote-run message for an attachment, CR-002 returns as Design Impact.

### CRR-002 — Proportional test-code review after API/E2E pass; CR-001…CR-003 resolved

- Canonical review report updated: `api-e2e-test-review-report.md` (new); `code-review-report.md` § Resolution Check
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review): `32dccf58fa`, `b49b5c539f`, `23524436af`
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-002)
- Relevant solution / architecture-review / implementation revision IDs: SR-002 / N/A / IR-002 (fix at `b0f3d1c42b`)
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail, Local Fix (CRR-001)
- Current authoritative result: Pass
- What changed in the review result and why: three baseline probe fixes replace races with conditions, and no assertion is loosened. MSP-20 now counts by send time from the moment the run screen shows, a cause measured before the change. CR-001…CR-003 are confirmed resolved in code and on the real surfaces.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Local Fix) | Resolved | `b0f3d1c42b`, API-REV-002 | `r2/d5.json`, API-06; `AgentEventMonitor.remoteRunFiles.spec.ts` |
| CR-002 | Open (Local Fix) | Resolved | `b0f3d1c42b`, API-REV-002 | `r2/d5.json`, API-06; `remoteRunFile.ts` |
| CR-003 | Open (Local Fix) | Resolved | `b0f3d1c42b`, API-REV-002 | `r2/d9.json`; `fileExplorerNodeRouting.spec.ts` |

- New or remaining finding IDs: none
- Material score or classification changes: N/A
- Recommended recipient: delivery engineer
- Remaining risks or uncertainty: Windows/Linux desktop not run; RSK-001 accepted; FU-001…FU-003.
