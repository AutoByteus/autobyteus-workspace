# Code Review Revision Record — code-quality-leftovers (autobyteus-357)

The latest `code-review-report.md` (or `api-e2e-test-review-report.md` for test reviews) is authoritative; this record indexes every completed review result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1; IR-001 | N/A | Fail (`Local Fix`, implementation) | CR-001, CR-002 |
| CRR-002 | `code-review-report.md` (Latest Round section) | Implementation Review, round 2 (Targeted Delta); IR-002 | Fail | Pass | CR-001, CR-002 (resolved) |
| CRR-003 | `api-e2e-test-review-report.md` | Proportional test-code review after API-REV-001 Pass | Pass (CRR-002 source) | Pass | None |

## Revision Entries

### CRR-001: Initial source review of IR-001

- Canonical review report updated: `tickets/in-progress/code-quality-leftovers/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001, range `ebc5277e52..313bff2c8c`)
- Relevant solution revision IDs: SR-002
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Fail
- What changed in the review result and why: initial baseline. All ten items are implemented as designed, with no behavior change. Two rule-11 / dead-code findings were introduced by the change.
- Supported product scenario / material-premise basis changes: initial (SCN-A, SCN-B, SCN-C, CON-11).

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - CR-001 (`Local Fix`): the provider-section spec keeps multi-source states with a test-only `rows` hint; the composable's multi-source-only disjunct stays.
  - CR-002 (`Local Fix`): the unused `resetProjectTaskContextDraftsForTests` export.
- Follow-ups added: FU-002 (the reload toast on STALE_ERROR), FU-003 (the terminal `ps` deadline under load).
- Material score or classification changes: No Legacy Retention 9.0 and Cleanup Completeness 8.8.
- Recommended recipient: Implementation Engineer.
- Remaining risks or uncertainty: the `CompactionAttempts` heuristic for future suites; the live-e2e harness runs only with credentials; re-integration with `origin/personal`.

### CRR-002: Targeted-delta review of IR-002

- Canonical review report updated: `code-review-report.md`, § Latest Round
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`. The delta covers only the CR-001 and CR-002 files: the composable, its spec, and `project-task-context-drafts.ts`.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-002, code `534ad1f55e`); CR-001, CR-002
- Relevant solution revision IDs: SR-002
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-001)
- Current authoritative result: Pass
- What changed in the review result and why: the composable reads the provider's single source, and its flags are equivalent for zero or one source (checked case by case). The spec's `rows` hint and multi-source cases are replaced by single-source cases. The unused reset export is removed.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Local Fix) | Resolved | IR-002 (`534ad1f55e`) | `useProviderApiKeySectionRuntime.ts` 74–79; spec single-source cases; IMP-16 (1,466 web tests); IMP-17 Settings check Pass |
| CR-002 | Open (Local Fix) | Resolved | IR-002 | `git grep resetProjectTaskContextDraftsForTests`: no hits; IMP-16 server checks |

- New or remaining finding IDs: none.
- Material score or classification changes: average 9.4; every category ≥ 9.2.
- Recommended recipient: API/E2E Engineer; informational notice to the implementation engineer.
- Remaining risks or uncertainty: the `CompactionAttempts` heuristic for future suites; the live-e2e harness runs only with credentials; re-integration with `origin/personal`; FU-002 and FU-003.

### CRR-003: Proportional test-code review after API-REV-001

- Canonical review report updated: `api-e2e-test-review-report.md` (new)
- Review entry point and round: Successful API/E2E Test-Code Review, round 1
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-001 Pass, 95.3%)
- Relevant solution revision IDs: SR-002
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-002, source review)
- Current authoritative result: Pass (test-code review)
- What changed in the review result and why: three baseline test fixes, each with its cause named per TESTING.md rule 9. The stale Org config refusal, the stale picker initial-option check and the missing local pricing status are all corrected to current behavior. No findings.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none.
- Material score or classification changes: N/A.
- Recommended recipient: Delivery Engineer.
- Remaining risks or uncertainty: the `CompactionAttempts` heuristic; the live-e2e compaction run is not done (TESTING.md: only on the user's request; AC-006's fallback is met); FU-002…FU-004.
