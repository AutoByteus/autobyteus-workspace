# API/E2E Revision Record — autobyteus-407 (S3)

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code_reviewer, `code-review-report.md` CRR-002, round 1 | SR-001, SR-002, ARCH-REV-002, IR-001, IR-002, CRR-001, CRR-002 | N/A | Pass / 95.0% |

## Revision Entries

### API-REV-001 — Baseline: device reruns, rendered refusals, Phone Access off, CR-001 path, Gboard suggestions

- Triggering role, report, round: code_reviewer, CRR-002 Pass (Large/High), round 1
- Triggering finding or case IDs: N/A (initial; CR-001 fixed upstream, its path exercised in API-09)
- Coverage decisions or durable test paths changed: none (temporary probes kept as evidence)
- Cases: API-01 reuses the implementation checks. New cases:
  - API-02: full server suite.
  - API-03: builds from a fresh clone.
  - API-04: AC-017 + Control after zoom.
  - API-05: Gboard keys, suggestion, correction.
  - API-06: AC-019.
  - API-07: Phone Access off + revoke.
  - API-08: AC-021 in two browser devices and the desktop tile.
  - API-09: CR-001.
  - API-10: AC-018 rerun.
  - API-11: log scan.
- Environment delta:
  - Test node `abx407-api-node` (beta image + fresh-clone package).
  - Access-logging proxy with a 502 fault switch.
  - Emulator `autobyteus277_api35`.
  - Headless Chrome with two contexts.
  - Isolated instance `iso-59382-850c`.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| CR-001 (code review round 1) | Local Fix (implementation) | Fixed in `0baf15a981` | API-09, IMP-S3-30 |

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/API-*`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.0%
- New or remaining failure IDs: none
- Remaining risks:
  - Physical phone (user-only, optional per AC-017).
  - Only Gboard installed.
  - CR-001 proven on a dropped availability request.
  - No durable device suite.
