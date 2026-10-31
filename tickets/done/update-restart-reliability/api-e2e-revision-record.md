# API/E2E Revision Record — update-restart-reliability (autobyteus-339)

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, CRR-001 Pass, round 1 | SR-003, ARCH-REV-001, IR-001, CRR-001 | N/A | `Fail` / 91.4% (F-API-001 `Design Impact`) |
| API-REV-002 | Code reviewer, `code-review-report.md`, CRR-003 Pass (IR-002), round 2 | SR-005, ARCH-REV-003, IR-002, CRR-003 | `Fail` / 91.4% | `Pass` / 94.1% |

## Revision Entries

### API-REV-001 — Baseline: AC-002 on a real server, AC-003 ×42, 284 regressions

- Triggering role, report path, and round: code reviewer; `code-review-report.md` (CRR-001); round 1.
- Triggering finding or case IDs: N/A (first validation).
- Related revision IDs: SR-003; ARCH-REV-001; IR-001; CRR-001.
- Why this baseline was recorded: first complete API/E2E result for code `ddb03d0d0b`.
- Coverage decisions or durable test paths changed: none. `evidence/P-001-live-server-probe.mjs` gained the `held-connection` mode (temporary probe).
- Cases: API-R1 (IMP-01..07), API-00..API-05, API-02B; API-06 not tested (unsafe install).
- Commands, environment, fixture, or broader-validation delta: clean checkouts of `2c3575b0f0` and the base `a977b2c1bc` (removed afterwards); live Codex `gpt-6.1-terra` and Claude haiku; 45 isolated desktop journeys.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: investigation (all), report (all), progress log.
- Prior result and confidence: N/A.
- Current result and confidence: `Fail`, 91.4%.
- New or remaining failure IDs: F-API-001 (a cut `createAgentRun` leaves unacknowledged and prepared-only runs).
- Recommended owner: failure-origin review by the code reviewer.
- Remaining risks, blocked evidence, or untested scope: real Squirrel install (user-only); Docker update (optional, not run); FU-001, FU-002.

### API-REV-002 — Round 2: revised D1 (grace drain); F-API-001 resolved

- Triggering role, report path, and round: code reviewer; `code-review-report.md` (CRR-003 Pass of IR-002); round 2.
- Triggering finding or case IDs: F-API-001.
- Related revision IDs: SR-005; ARCH-REV-003; IR-002 (`591bf52551`); CRR-003.
- Why this revision was recorded: rerun after D1 was replaced by `installClientConnectionClose`.
- Coverage decisions or durable test paths changed: none by API/E2E.
- Cases:
  - rerun on a clean build of `3be28563ea`: API-02 (two samples), API-01, API-04 (42 iterations, 41 valid), API-05;
  - added: API-02T (timing with temporary diagnostics, removed);
  - API-03 still valid (base and probe unchanged);
  - reused: IMP-02..04, IMP-08..12.
- Commands, environment, fixture, or broader-validation delta: ENV-4; checkout removed afterwards.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-API-001 (cut `createAgentRun` leaves unacknowledged and prepared-only runs) | `Design Impact` | Resolved by IR-002: creates that reached the server complete with their responses; 0 prepared-only, 0 unacknowledged; late requests refused | API-02 R2, API-02B R2, API-02T |

- Canonical artifacts and sections updated: investigation § Round 2; report (Round, environments, R2 cases, AC proof incl. AC-008, Findings, Scorecard, Residuals, Latest Result); progress log.
- Prior result and confidence: `Fail` / 91.4%.
- Current result and confidence: `Pass` / 94.1%.
- New or remaining failure IDs: none.
- Recommended owner: code reviewer (proportional test-code review).
- Remaining risks, blocked evidence, or untested scope: real Squirrel install (user-only); Docker update (optional); FU-001, FU-002, FU-004.
