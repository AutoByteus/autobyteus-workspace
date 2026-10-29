# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | API/E2E Failure-Origin Review / API-REV-001 Fail (API-04, API-06 old-run edit) | N/A | Fail — Design Impact (Solution Designer) | CR-FO-001 |
| CRR-002 | `code-review-report.md` | Implementation Review / IR-002 (SR-005, Medium / High) | Fail — Design Impact | Pass (9.5/10) | CR-FO-001 (resolved) |
| CRR-003 | `api-e2e-test-review-report.md` | Proportional test-code review / API-REV-002 Pass | Pass (CRR-002) | Pass | None |

## Revision Entries

### CRR-001 — Stopped-run edit of saved run holding `thinking_display` refused

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 1
- Review scope: N/A (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E, `api-e2e-execution-coverage-report.md`, API-04, API-06; REQ-011/AC-011
- Relevant solution revision IDs: SR-002
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Fail — Design Impact
- What changed in the review result and why: the design premise "edit surfaces drop stale keys on save" is contradicted. The stopped-run edit passes `preserveInvalidDraft` (pre-existing, documented residual rule), so the hidden `thinking_display` reaches strict server validation and the Save is refused. Implementation unchanged in these paths.
- Supported product scenario / material-premise basis changes: the SCN-005 edit leg is confirmed as a Supported Normal Scenario (SRC-019 real data).

#### Prior Finding Resolution

None

- New or remaining finding IDs: CR-FO-001
- Material score or classification changes: none (no scorecard in a failure-origin round)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: the Org edit path is confirmed from the code only; fix option (2) would touch a shared validator.

### CRR-002 — IR-002 server validator leaves out undeclared keys; callers use the canonical selection

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 2 (first source review)
- Review scope: `Full Review` of the IR-002 delta (`git diff 1425eb3ec 47f44c3df`); IR-001 source not re-audited (Medium / Low direct route, validated by API-REV-001)
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` IR-002; AC-012, AC-013
- Relevant solution revision IDs: SR-004, SR-005
- Relevant architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail — Design Impact (CRR-001)
- Current authoritative result: Pass, 9.5/10
- What changed in the review result and why: SR-004/005 moved DEC-011 to the server validator. IR-002 implements it, and callers #6 and #7 now use the canonical selection. All 10 call sites are verified against the inventory.
- Supported product scenario / material-premise basis changes: added the SCN-005 launch leg (AC-013); RISK-6 recorded as a decided contract.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-FO-001 | Open (Design Impact) | Resolved (server level; browser rerun pending at API/E2E) | SR-004, SR-005, IR-002 | `model-config-schema-validation.ts` leaves out undeclared keys; IMP-17 AC-012 (a)/(b) `UPDATED`, saved without the key; IMP-21 shows the tests fail on the old src |

- New or remaining finding IDs: None
- Material score or classification changes: first scorecard, 9.5/10
- Recommended recipient: API/E2E (rerun API-04, API-06, Org edit path)
- Remaining risks or uncertainty: RISK-6 (schema-less model configs become `null`); browser edit paths still to be rerun

### CRR-003 — Proportional test-code review after API-REV-002 Pass

- Canonical review report updated: `api-e2e-test-review-report.md`
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: N/A (test review)
- Triggering role, report path, and finding or scenario IDs: API/E2E, `api-e2e-execution-coverage-report.md`, API-02/03/06/09/10/11/12
- Relevant solution revision IDs: SR-005
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-002, implementation review)
- Current authoritative result: Pass
- What changed in the review result and why: the durable resume e2e (team and Org restore cases) was reviewed and is coherent, requirement-aligned and properly gated.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

None

- New or remaining finding IDs: None
- Material score or classification changes: None
- Recommended recipient: Delivery Engineer
- Remaining risks or uncertainty: FU-004 and FU-005 (paths that do not go through the validator) remain follow-ups
