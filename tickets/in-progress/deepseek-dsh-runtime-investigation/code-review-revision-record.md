# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 / IR-001 | N/A | Fail (Local Fix) | CR-001 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2 / IR-002 (CR-001 fix) | Fail (Local Fix) | Pass | CR-001 |
| CRR-003 | `api-e2e-test-review-report.md` | Post-API/E2E test-code review, round 1 / API-REV-001 | N/A (first test review) | Fail (Local Fix, API/E2E) | TR-001 |
| CRR-004 | `api-e2e-test-review-report.md` | Post-API/E2E test-code review, round 2 / API-REV-002 (TR-001 fix) | Fail (Local Fix, API/E2E) | Pass | TR-001 |

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

### CRR-003 — Test-code review of the API/E2E suites (API-REV-001)

- Canonical review report updated: `api-e2e-test-review-report.md`
- Review entry point and round: post-API/E2E test-code review, round 1
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-001); API-10…API-16, API-20…API-22, API-25
- Relevant solution revision IDs: SR-004
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-002 (no product source changed after `fddcff0f13`)
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A (the implementation review, CRR-002, passed)
- Current authoritative result: Fail — `Local Fix` owned by API/E2E
- What changed in the review result and why: five durable test files reviewed. They are sound, except that the standalone-host case accepts any launch error and leaves the recorded `dshDataFiles` unasserted, so it can pass without proving the DEC-020 refusal.
- Supported product scenario / material-premise basis changes: none. AC-009's key-removed alternate has no product removal surface today (noted for the Solution Designer).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: TR-001
- Material score or classification changes: N/A
- Recommended recipient: API/E2E engineer; then rerun API-25 and return for this test review
- Remaining risks or uncertainty: AC-006 and the AC-009 key-removed trigger are requirement-basis notes for the Solution Designer

### CRR-004 — TR-001 fix verified (API-REV-002)

- Canonical review report updated: `api-e2e-test-review-report.md`
- Review entry point and round: post-API/E2E test-code review, round 2
- Review scope: `N/A` (test review; TR-001 recheck)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-002); TR-001, API-25
- Relevant solution revision IDs: SR-004
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-002 (no product source changed since `fddcff0f13`)
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (Local Fix, TR-001)
- Current authoritative result: Pass
- What changed in the review result and why: `6e1dc44337` makes the standalone-host case assert the DEC-020 refusal and that no dsh files were written. The API-25 rerun passed with the expected receipt.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| TR-001 | Open (Local Fix, API/E2E) | Resolved | API-REV-002, `6e1dc44337` | Test diff; `API-25-standalone-host-r2.log` (1 passed; `PROVIDER_RELAY_UNAVAILABLE: …`, `dshStarts: []`, `dshDataFiles: []`) |

- New or remaining finding IDs: None
- Material score or classification changes: N/A
- Recommended recipient: delivery engineer
- Remaining risks or uncertainty: requirement-basis notes for the Solution Designer: AC-006 `{{…}}` precondition; AC-009 key-removed trigger has no product surface. FU-001 and FU-002 are in `follow-ups.md`.
