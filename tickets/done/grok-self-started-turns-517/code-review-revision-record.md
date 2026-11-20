# Code Review Revision Record

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result. This record indexes each completed review result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 / IR-002 | N/A | Fail (Local Fix, implementation) | CR-001 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2 (Targeted Delta) / IR-003 | Fail | Pass | CR-001 (resolved) |
| CRR-003 | `api-e2e-test-review-report.md` | Proportional API/E2E test-code review / API-REV-001 | N/A (first test review) | Pass | None |

## Revision Entries

### CRR-001 — Full review of SR-005 implementation: one dead export

- Canonical review report updated: `tickets/in-progress/grok-self-started-turns-517/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-002), branch `codex/grok-self-started-turns-517` @ `5ab411af71`
- Relevant solution revision IDs: SR-001…SR-005
- Relevant architecture-review revision IDs: ARCH-REV-004, ARCH-REV-005
- Relevant implementation revision IDs: IR-001, IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail`. Score average 9.5; Naming 9.0 and Cleanup 9.0.
- What changed in the review result and why: this is the initial result. Behavior basis BEH-001…003 confirmed against the code and probes. The structural checks pass except for the dead export `AcpTurnOrigin` (CR-001).
- Supported product scenario / material-premise basis changes: SC-001…SC-004 used. CAND-002…CAND-006 rejected (artificial timing, not reachable, or design-mandated).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001 (Local Fix, implementation)
- Material score or classification changes: N/A (initial)
- Recommended recipient: implementation engineer; next round is a Targeted Delta Review on CR-001.
- Remaining risks or uncertainty: one-direction ordering (RSK-003), RSK-001, session file at 490 lines, SDK path bypass (RSK-004).

### CRR-002 — CR-001 resolved: Pass

- Canonical review report updated: `tickets/in-progress/grok-self-started-turns-517/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`. The round-2 delta `5ab411af71..cc2701af8a` touches one product file, `acp-agent-session.ts` (+4/−6, type and doc only); everything else in the delta is ticket documents and evidence. It stays within CR-001.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-revision-record.md` IR-003, CR-001
- Relevant solution revision IDs: SR-001…SR-005
- Relevant architecture-review revision IDs: ARCH-REV-005
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: CRR-001 Fail (CR-001)
- Current authoritative result: `Pass`. Score average 9.5; every category ≥ 9.4.
- What changed in the review result and why: CR-001 resolved, so Naming went from 9.0 to 9.4 and Cleanup from 9.0 to 9.5. The P7 and P15 checks now pass.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Local Fix) | Resolved | IR-003, `cc2701af8a` | Diff read: export removed, doc moved onto `ActivePrompt`, class doc updated. Grep finds no `AcpTurnOrigin` in src/tests/GLOSSARY. IMP-07: 9/9 tests; typecheck PASS. |

- New or remaining finding IDs: None
- Material score or classification changes: Naming 9.0 → 9.4; Cleanup 9.0 → 9.5; decision Fail → Pass
- Recommended recipient: API/E2E engineer; informational notice to the implementation engineer
- Remaining risks or uncertainty: unchanged from CRR-001 (RSK-003 one-direction ordering, RSK-001, RSK-004 SDK path bypass, session file at 488 lines)

### CRR-003 — Proportional test-code review after API/E2E pass: Pass

- Canonical review report updated: `tickets/in-progress/grok-self-started-turns-517/api-e2e-test-review-report.md`
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-001: API-01, API-02, API-03); SC-002 / AC-006
- Relevant solution revision IDs: SR-005
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A for test review (source review CRR-002 Pass)
- Current authoritative result: `Pass`
- What changed in the review result and why: reviewed the added `orderBGap` order and the hand-over-gap AC-006 case at `a933bc9f09`. The assertions prove AC-006 and that the message landed in the gap. The case follows the real trigger, reuses the existing helpers, and its timing is guarded.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material score or classification changes: N/A
- Recommended recipient: delivery engineer
- Remaining risks or uncertainty: RSK-001, RSK-003, RSK-004 as designed. The in-process E2E `afterAll` close stall is attributed to FU-002 in the API/E2E reports.
