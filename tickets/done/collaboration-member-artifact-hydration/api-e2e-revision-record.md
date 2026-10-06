# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`, `code-review-report.md` (CRR-001), round 1 | SR-003, ARCH-REV-001, IR-001, CRR-001 | N/A | Pass / 95% |
| API-REV-002 | `/code_reviewer`, `code-review-report.md` (CRR-003), round 2 | SR-003, ARCH-REV-001, IR-002, CRR-003, DR-001 | Pass / 95% | Pass / 95% |

## Revision Entries

### API-REV-001: Baseline; Team and Org member hydration proven in the real UI

- Triggering role, report path, and round: `/code_reviewer`, `tickets/in-progress/collaboration-member-artifact-hydration/code-review-report.md`, round 1
- Triggering finding or case IDs: CRR-001 Pass; AC-001..AC-006 browser/live checks requested
- Related revision IDs: SR-003, ARCH-REV-001, IR-001, CRR-001
- Why recorded: first API/E2E validation
- Coverage decisions or durable test paths changed: none by API/E2E. The implementation's 17 specs were re-run.
- Cases added: R-001, B-001..B-008, M-001
- Environment / broader validation:
  - Owned built backend + Nuxt dev stack.
  - Temporary harness in `api-e2e-evidence/harness/`: a fake-AGY wrapper with per-member conversations and an optional gate; GraphQL fixture setup; a WebSocket sender for Team, Org and standalone.

#### Prior Failure Resolution

None.

- Canonical artifacts updated:
  - `api-e2e-coverage-investigation.md`
  - `api-e2e-execution-coverage-report.md`
  - `api-e2e-test-case-ledger.md`
  - `api-e2e-evidence/`
- Prior result and confidence: N/A
- Current result and confidence: Pass / 95%
- New or remaining failure IDs: none
- Recommended owner: `/code_reviewer` (route-required review; no API/E2E durable test changes)
- Remaining risks, blocked evidence, or untested scope:
  - The exact in-flight interleave and the stream-recovery path are unit-only.
  - AC-007 is unit-only (MP-001).
  - REQ-006 is pending.
  - The pre-existing `workspaceSelectionComposition` spec failure; I did not re-run it on base and rely on IR-001/CRR-001 for its pre-existing status.

### API-REV-002: Re-validation on the merged branch (`dc552c3ab`)

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md` (CRR-003), round 2
- Triggering finding or case IDs: DR-001 (5 post-merge spec failures, fixed in the IR-002 mock)
- Related revision IDs: SR-003, ARCH-REV-001, IR-002, CRR-003, DR-001
- Why recorded: delivery merged `origin/personal@3c8e49ad5`. The base changes server source and Team resume-config/sidebar parsing, which the member journeys depend on.
- Coverage decisions or durable test paths changed: none (API/E2E durable changes: none)
- Cases rechecked:
  - On the merged HEAD: R-001 (widened to the run-hydration, run-open and agent-org suites), B-001, B-002, B-003, B-004, B-006, B-007, B-008.
  - Not repeated: B-005 and M-001 (the artifact path and the web patch are unchanged).
- Environment delta:
  - Server rebuilt on the merged HEAD; new owned stack `r2`.
  - Pre-existing check against merged base `3c8e49ad5` (temporary web checkout, restored).

#### Prior Failure Resolution

None. Round 1 passed. DR-001 was a delivery/implementation test-mock issue, resolved by IR-002 and confirmed by R-001 (r2).

- Canonical artifacts updated:
  - `api-e2e-execution-coverage-report.md` (meta, § Round 2, result)
  - `api-e2e-test-case-ledger.md` (events 15–21)
  - `api-e2e-evidence/round2/`
- Prior result and confidence: Pass / 95%
- Current result and confidence: Pass / 95%
- New or remaining failure IDs: none
- Recommended owner: `/code_reviewer` (route-required; no API/E2E durable test changes)
- Remaining risks:
  - Exact in-flight interleave, stream recovery and AC-007 remain unit-only.
  - REQ-006 is pending.
  - Pre-existing web failures (19, confirmed on the merged base).
