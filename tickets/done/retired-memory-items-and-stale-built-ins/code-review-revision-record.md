# Code Review Revision Record

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result. This record locates each completed review result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | `Pass` | None |
| CRR-002 | `api-e2e-test-review-report.md` | Proportional API/E2E test-code review (API-REV-001 `Pass`) | `Pass` (CRR-001, source) | `Pass` | None |

## Revision Entries

### CRR-001 — Initial implementation review: retired memory items and stale built-ins

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001)
- Relevant solution revision IDs: SR-002, SR-003
- Relevant architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Pass`
- What changed in the review result and why: first result.
  - The clean cut of the item model is complete: no leftover use anywhere outside frozen code.
  - Store reads keep the damaged-end repair, and appends keep their first-append check.
  - The startup migration matches the design, and nothing reinstalls the removed folders.
  - Test rewrites keep their assertions (CF-01, CF-02).
  - The two recorded deviations hold (CF-03, CF-04).
- Supported product scenario / material-premise basis changes: none (R-1 is design-accepted)

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none
- Material score or classification changes: N/A (initial)
- Recommended recipient: API/E2E; informational notice to implementation
- Remaining risks or uncertainty:
  - the fresh-start build (the baseline file changed);
  - the gated live and LM Studio memory tests;
  - the web probe case, AC-004 surfaces, and the whole server E2E and integration suites;
  - the delivery gate REQ-007.

### CRR-002 — Proportional test-code review after API/E2E round 1

- Canonical review report updated: `api-e2e-test-review-report.md` (new)
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review). The diff `53eb3521f1..984e04707f`: RRB-3, SIR-002 and three labelled baseline fixes.
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md`, API-REV-001; API-06…API-08, API-12
- Relevant solution revision IDs: SR-003
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-001, source review)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - RRB-3 proves AC-004 through a real agent tool call. Its absence assertions have a sound control: a same-shaped user agent is listed.
  - SIR-002 covers both retired agents on the Agents page.
  - The baseline fixes are scoped and justified:
    - the LM Studio helper registers its models and still skips when LM Studio is unreachable;
    - `memory-llm-flow` allows a real reasoning record without weakening its user and assistant checks;
    - the OpenAI live test sets its tool search;
    - SIR-002 uses released session shapes and leaves the derived episodic catalogs out of its byte check.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None (first test review).

- New or remaining finding IDs: none
- Material score or classification changes: none
- Recommended recipient: delivery engineer
- Remaining risks or uncertainty:
  - REQ-007, the delivery gate;
  - the signing policy and the Docker image, not tested (API-11);
  - FU-001…FU-003.
