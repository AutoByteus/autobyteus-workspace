# Code Review Revision Record — busy-quit-shutdown-orphan

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Pass | None |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review, round 2 (API-REV-001 F-API-001, F-API-002) | Pass | Fail: CR-001 `Local Fix` (implementation); F-API-002 → FU-008 | CR-001 |

## Revision Entries

### CRR-001 — Initial source review of IR-001 (stop-now fence, bounded shutdown with sweep, desktop tree force)

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001; code `bf2857ca29`, handoff `9e00c6fafd`)
- Relevant solution revision IDs: SR-008; SR-002, SR-007
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Pass`, 9.4/10, every category ≥ 9.2, no findings
- What changed in the review result and why: the initial baseline. D1 to D3, the helper move, tests and docs match the SR-008 design. The implementer's three flagged points were accepted: the 0.5 s post-SIGKILL confirmation, the sweep-throw fail-safe and the error text (CR-C1 to CR-C3).
- Supported product scenario / material-premise basis changes: None; SCN-001 to SCN-004 used as approved. Candidates CR-C1 to CR-C7 were all rejected as findings.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material score or classification changes: N/A (baseline); Medium / High confirmed
- Recommended recipient: API/E2E engineer
- Remaining risks or uncertainty: these are owned by validation: N-3, N-5/FU-007, N-7, U-A1 to U-A3. Also CR-C5, a desktop `ps` timeout that affects only the force-confirmation diagnostic, and the worst-case server exit, now ≈ 14.25 s.

### CRR-002 — Failure-origin review of API-REV-001 (F-API-001, F-API-002)

- Canonical review report updated: `code-review-report.md` (round 2 sections: CR-C8, CR-C9, CR-001, the score note, FU-008, Classification, Latest Result)
- Review entry point and round: API/E2E Failure-Origin Review, round 2
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-001), F-API-001 (every POSIX exit), F-API-002 (API-11R1)
- Relevant solution revision IDs: SR-008
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-001)
- Current authoritative result: `Fail`. CR-001 is a `Local Fix` owned by implementation; F-API-002 is follow-up FU-008, which API/E2E records as out of scope.
- What changed in the review result and why:
  - F-API-001 is a defect in this change. The shared reader's own `ps` child sits in the server's group as a server descendant, so the sweep selects and signals it on every exit. Reproduced by API/E2E; confirmed by reading `utils/process-tree.ts` and the sweep's selection. It is a round 1 review gap.
  - F-API-002 stalls in the Org root-shutdown stage (Read, against the clean stage timeline). That code is unchanged by this ticket and covered by the guardrail's Out Of Scope. The bound and the sweep contained the stall, and the ACs are proven. The root cause is not established, so it is recorded as FU-008 with its narrowed location and reproduction, not closed as flaky (TESTING Rule 9 note in the report).
- Supported product scenario / material-premise basis changes: None. SCN-002 and SCN-003 are confirmed as real triggers.

#### Prior Finding Resolution

None (CRR-001 had no findings).

- New or remaining finding IDs: CR-001 (new)
- Material score or classification changes: category 8 goes from 9.3 to 9.0 (CR-001); Medium / High unchanged
- Recommended recipient: implementation engineer
- Remaining risks or uncertainty: the root cause of F-API-002 (FU-008), which would reclassify if a reproduction places it in this ticket's code; N-5/FU-007, which F-API-002 makes concrete for autobyteus-285.
