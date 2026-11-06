# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 / IR-001 | N/A | Fail (Local Fix) | CR-001 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2 / IR-002 (CR-001 fix) | Fail (Local Fix) | Pass | CR-001 |

## Revision Entries

### CRR-001 — Initial implementation review of the dsh runtime (IR-001)

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001); SCN-001…SCN-010
- Relevant solution revision IDs: SR-004
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Fail — `Local Fix` owned by implementation
- What changed in the review result and why: first result. Behavior basis confirmed for BEH-001…BEH-015, DS-008, AC-016/017; one bounded size finding: `general-process-run-supervisor.ts` was over 500 non-empty lines on the base (511) and this change grows it (522).
- Supported product scenario / material-premise basis changes: none; P-001 confirmed. Candidates C-02…C-06 rejected (recorded in the report). AC-006 precondition not producible through the product (pre-existing composer guard) recorded as a residual risk for the Solution Designer.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001
- Material score or classification changes: Separation of Concerns and File Placement 8.8; others ≥ 9.3
- Recommended recipient: implementation engineer; then targeted delta source review, then API/E2E
- Remaining risks or uncertainty: AC-006 wording; discovery placeholder depends on dsh behavior (DEC-003)

### CRR-002 — CR-001 fix verified (IR-002)

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`. The delta `9344f4b9b5..fddcff0f13` touches only CR-001's file and one new file holding the code moved out of it, plus ticket documents. No spine, shared interface or data shape changed.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-002); CR-001
- Relevant solution revision IDs: SR-004
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (Local Fix, CR-001)
- Current authoritative result: Pass
- What changed in the review result and why: `GeneralProcessRunSupervisorInput` and `requireGeneralProcessRunSupervisorInput` moved to `agent-execution/runtime/general-process-run-supervisor-input.ts` (83 lines), identical apart from doc comments and the validator's `export`. The supervisor is down to 446 lines (511 on the base). No other importer. IMP-09 is green: 39 unit/integration tests, typecheck PASS, 15 scripted studio E2Es.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Local Fix) | Resolved | IR-002, `cb132711f6` | Line counts 446 / 83; block diff vs `9344f4b9b5`; `IMP-09-cr-001-recheck.log` |

- New or remaining finding IDs: None
- Material score or classification changes: Separation of Concerns and File Placement 8.8 → 9.3; result Pass
- Recommended recipient: API/E2E engineer; informational notice to the implementation engineer
- Remaining risks or uncertainty: AC-006 wording (Solution Designer); discovery placeholder depends on dsh (DEC-003); live AC-010/AC-012 and the other handoff hints left to API/E2E
