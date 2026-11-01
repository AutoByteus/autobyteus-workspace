# API/E2E Revision Record — test-and-tooling-hygiene-318 (autobyteus-318)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md`, CRR-001 | SR-001..SR-004, ARCH-REV-002/004, IR-001, CRR-001 | N/A | Pass / 95.8% |
| API-REV-002 | Code Reviewer, CRR-003 (IR-002, FU-004 Local Fix from DR-001) | IR-002, CRR-003, DR-001 | Pass / 95.8% | Pass / 96.5% |

## Revision Entries

### API-REV-001 — Baseline: fresh-clone pass, gate negatives, probe refusals, gated and timing reruns

- Cases: API-01 (reused IMP-24, IMP-25), API-02 (fresh clone), API-03 (gate negatives), API-04 (AC-014, 6 probes), API-05 (full e2e and gated/timing reruns), API-06 (run-first probes), API-07 (LM Studio).
- Coverage decisions or durable test paths changed: none.

#### Prior Failure Resolution

None.

- Current result and confidence: Pass, 95.8%. New failures: none. FU-004 recorded as out of scope.
- Recommended owner: Code Reviewer (proportional test-code review), then Delivery.
- Remaining risks: paid suites not run (DEC-011); FU-004; the double-counted production error in the server gate's summary (observation).

### API-REV-002 — Round 2 for IR-002: server integration green on a fresh clone

- Cases: API-08 (fresh clone: install, build, integration prepare, server gate, full `test:integration`).

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| FU-004 (4 pre-existing integration cases, recorded out of scope in API-REV-001; reopened by delivery DR-001 as a Rule 9 Local Fix) | out of scope (follow-up) | Resolved by `de3d284b14`, `f3950965c3`: full `test:integration` 87 files pass, 0 failed | API-08 |

- Current result and confidence: Pass, 96.5%. AC-016 proven without exception. Recommended owner: Code Reviewer, then Delivery.
