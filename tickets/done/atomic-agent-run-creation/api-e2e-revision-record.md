# API/E2E Revision Record — atomic-agent-run-creation (autobyteus-349)

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, CRR-001 Pass, round 1 | SR-004, ARCH-REV-002, IR-001, CRR-001 | N/A | `Fail` / 88.5% (F-API-001 `Requirement Gap`) |
| API-REV-002 | Code reviewer, `code-review-report.md`, CRR-003 (reporting Local Fix after SR-005), round 2 | SR-005, CRR-002, CRR-003 | `Fail` / 88.5% | `Pass` / 93.0% |

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

### API-REV-002 — Round 2: AC-004 recorded under SR-005; F-API-001 → FU-005

- Triggering role, report path, and round: code reviewer; `code-review-report.md` (CRR-003); round 2 (reporting Local Fix).
- Triggering finding or case IDs: F-API-001.
- Related revision IDs: SR-005 (DEC-003 = C, AC-004 narrowed to a normal stop); CRR-002; CRR-003. Code unchanged.
- Why recorded: AC-004's text changed; the hard-kill leftovers are the accepted residual FU-005.
- Coverage decisions or durable test paths changed: none.
- Cases:
  - added: API-03G (plain graceful stop: creates in flight around a SIGTERM, relaunch; 3 samples), on a clean build of `c249a3c8c2`;
  - reclassified: API-03 (stuck variant = AC-004 Pass; hard-kill variant = FU-005) and API-03B..E (FU-005 evidence);
  - all other round-1 cases are still valid (no code change).
- Commands, environment, fixture, or broader-validation delta: ENV-3; temporary data roots only; checkout removed.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-API-001 (hard-kill leftovers kept by the content rule) | `Requirement Gap` | Accepted residual FU-005 (SR-005, DEC-003 = C); AC-004 narrowed to a normal stop, which passes | API-03G, API-03 (stuck variant); FU-005 evidence API-03, API-03B..E |

- Canonical artifacts and sections updated: report (Round, Routing, environments, API-03/API-03G rows, AC proof, Findings, Scorecard, Residuals, Latest Result); progress log.
- Prior result and confidence: `Fail` / 88.5%.
- Current result and confidence: `Pass` / 93.0%.
- New or remaining failure IDs: none.
- Recommended owner: code reviewer (sender), who forwards to delivery; test-code review `Not Applicable`.
- Remaining risks, blocked evidence, or untested scope: FU-005 (accepted); remote delegation across nodes (unit only); the first start on the user's data (not run by rule).
