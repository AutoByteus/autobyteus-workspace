# API/E2E Revision Record — atomic-agent-run-creation (autobyteus-349)

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, CRR-001 Pass, round 1 | SR-004, ARCH-REV-002, IR-001, CRR-001 | N/A | `Fail` / 88.5% (F-API-001 `Requirement Gap`) |

## Revision Entries

### API-REV-001 — Baseline on temporary data roots: AC-001, AC-003 (+N-4), AC-004, AC-005

- Triggering role, report path, and round: code reviewer; `code-review-report.md` (CRR-001); round 1.
- Triggering finding or case IDs: N/A.
- Related revision IDs: SR-004; ARCH-REV-002; IR-001; CRR-001.
- Why recorded: first complete API/E2E result for code `c533fc0b5b` + `93fa105819`.
- Coverage decisions or durable test paths changed: none. New temporary probe `evidence/API-349-probe.mjs`.
- Cases: API-R1, API-00, API-01 (clean + base), API-02, API-02B, API-03, API-03B..E, API-04, API-05.
- Commands, environment, fixture, or broader-validation delta: clean checkouts of `1dca0e2ad6` and the base `e87e6bb2b1`, removed afterwards. Temporary data roots only.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: investigation, report, progress log.
- Prior result and confidence: N/A.
- Current result and confidence: `Fail`, 88.5%.
- New or remaining failure IDs: F-API-001 (crash-interrupted creates leave empty runs with activation artifacts that the content rule keeps).
- Recommended owner: failure-origin review by the code reviewer.
- Remaining risks, blocked evidence, or untested scope: remote delegation across nodes (unit only); the first start on the user's data is not run (by rule).
