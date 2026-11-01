# API/E2E Revision Record — restart-resume (autobyteus-285)

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, CRR-001 Pass, round 1 | SR-004, ARCH-REV-002, IR-001, CRR-001 | N/A | `Fail` / 89.9% (F-API-001 `Design Impact`) |

## Revision Entries

### API-REV-001 — Baseline: two-stamp update restarts on real servers and the real desktop

- Triggering role, report path, and round: code reviewer; `code-review-report.md` (CRR-001); round 1.
- Triggering finding or case IDs: N/A.
- Related revision IDs: SR-004; ARCH-REV-002; IR-001; CRR-001.
- Why recorded: first complete API/E2E result for code `b50e2354ab`.
- Coverage decisions or durable test paths changed: none. Temporary probes `evidence/API-285-server-probe.mjs`, `evidence/API-285-desktop-probe.mjs`.
- Cases: API-R1, API-00, API-01, API-02a/API-02, API-03, API-04/04B/04C/04D, API-05a/API-05/API-05T/API-05H, API-06.
- Commands, environment, fixture, or broader-validation delta: clean checkout of `400e4d5b9c` (removed afterwards); temporary data roots only; X+1 by stamp edit (design method).

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: investigation, report, progress log.
- Prior result and confidence: N/A.
- Current result and confidence: `Fail`, 89.9%.
- New or remaining failure IDs: F-API-001 (eligibility checked before the restore; an activation in progress is not live). O-1 recorded (member notice invisible; FU-004).
- Recommended owner: failure-origin review by the code reviewer.
- Remaining risks, blocked evidence, or untested scope: Docker in-place update (infeasible); real Squirrel install (user-only); AR-003 refused copy (unit only).
