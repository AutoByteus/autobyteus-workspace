# Code Review Revision Record

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) remains authoritative for its current result. This record indexes every completed review result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 / IR-001 handoff | N/A | Fail (Local Fix) | CR-001 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2 (Targeted Delta) / IR-002 | Fail (Local Fix) | Pass | CR-001 (resolved) |
| CRR-003 | `api-e2e-test-review-report.md` | Proportional API/E2E test-code review, round 1 / API-REV-001 | N/A (first test review) | Pass | None (TO-001 non-blocking observation) |

## Revision Entries

### CRR-001 — Initial implementation review of IR-001

- Canonical review report updated: `tickets/in-progress/delegated-copy-restore-from-own-file/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-001, head `0a303d3a5d`); scenarios SCN-001..SCN-005
- Relevant solution revision IDs: SR-001..SR-008
- Relevant architecture-review revision IDs: ARCH-REV-003..ARCH-REV-007
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail`, score 9.3 / 10. One implementation-owned `Local Fix` (CR-001).
- What changed in the review result and why: initial baseline. D-1..D-9 and M0..M5 are implemented as designed and traced on DS-001..DS-005. One unreachable absent-source check remains in a touched file (`standalone-root-tree-schema.ts:19-22`); Core Principle 7 and AC-009 require its removal.
- Supported product scenario / material-premise basis changes: none. MP-001..MP-003 confirmed. CAND-02..CAND-07 rejected as findings (see the report).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001
- Material score or classification changes: N/A (baseline). Cleanup Completeness 8.5.
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty:
  - mirrored F-X3b copies listed as "Unattributed runs" on the Memory page (residual, for delivery);
  - system-boundary proof of AC-001, AC-003, AC-004 and AC-011(a) is API/E2E scope.

### CRR-002 — CR-001 resolved; implementation review passes

- Canonical review report updated: `tickets/in-progress/delegated-copy-restore-from-own-file/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`. `0a303d3a5d..da1d7f5524` changes two source files, both dead absent-source branches, plus ticket documents and evidence. No spine, interface or data shape changed.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-002, fix commit `96de77efb3`); CR-001
- Relevant solution revision IDs: SR-008
- Relevant architecture-review revision IDs: ARCH-REV-007
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (CRR-001, CR-001)
- Current authoritative result: `Pass`, score 9.45 / 10
- What changed in the review result and why:
  - CR-001 removed.
  - The implementer's sweep also found and removed the same fallback in web `teamExecutionTreeSelectors.ts` (`team.source?.coordinator_address ?? team.address`). Round 1 missed it: that sweep's output was truncated (`head -30`), a review gap.
  - A fresh, untruncated sweep of current server and web code finds no remaining absent-source read for copies.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Local Fix) | Resolved | IR-002, `96de77efb3` | Diff read; both branches removed; sweep clean; IMP-01, IMP-02 (6111 passed) and IMP-07 (4549 passed) exit 0 on `96de77efb3` (`IMP-00-summary.txt`) |

- New or remaining finding IDs: none
- Material score or classification changes: Legacy 9.0 → 9.5; Cleanup 8.5 → 9.5. Classification Large / High preserved.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty: as in the report's Residual Risks (AC-001, AC-003, AC-004 and AC-011(a) at the system boundary; the unrendered "As configured in this run" label; mirrored F-X3b copies under "Unattributed runs").

### CRR-003 — Proportional review of the API/E2E test code: Pass

- Canonical review report updated: `tickets/in-progress/delegated-copy-restore-from-own-file/api-e2e-test-review-report.md`
- Review entry point and round: proportional API/E2E test-code review, round 1
- Review scope: `N/A` (test review). Durable test changes in `d2a711721d`:
  - `delegated-copy-own-file-cases.mjs` (added; DCR-001..003);
  - `delegated-launch-defaults-probe.mjs` (registration and header);
  - `autobyteus-web/package.json` (script).
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-001, Pass); API-11..API-13 / DCR-001..003
- Relevant solution revision IDs: SR-008
- Relevant architecture-review revision IDs: ARCH-REV-007
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A for test review (source review CRR-002: Pass)
- Current authoritative result: `Pass`
- What changed in the review result and why: the new probe cases enter through real triggers (delegation from a composer, stop and slot edit in Settings, restore by run ID, the launch-page override). They assert the AC consequences on own files, runtime argv, Settings rows, app contexts and the run-view projection, and they match the investigation and the evidence JSON. Each case's design matches a documented constraint (CM-1; Antigravity locks auto-approve on; the Grok replay offers one model).
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none. TO-001, a non-blocking observation: the DCR-001 header line 12 still mentions a "+" prefill check that was replaced; comment only.
- Material score or classification changes: N/A. Classification Large / High preserved.
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - AC-010 (the user's real data, after his backup) is delivery's;
  - the Memory-page "Unattributed runs" residual for mirrored F-X3b copies stands, as accepted.
