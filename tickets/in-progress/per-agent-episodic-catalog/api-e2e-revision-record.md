# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative. This file records each completed validation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-001 Pass, round 1 | SR-002, ARCH-REV-002/004, IR-001, CRR-001 | N/A | `Fail` / 88% |

## Revision Entries

### API-REV-001 — Baseline: episodic catalogs on a real server; a damaged team record is left out without a warning

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md` (CRR-001 `Pass`), round 1
- Triggering finding or case IDs: N/A (first round)
- Related revision IDs: SR-002; ARCH-REV-002, ARCH-REV-004; IR-001; CRR-001
- Why this baseline was recorded: first API/E2E result for autobyteus-493
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/memory/episodic-catalog.e2e.test.ts` (EC-01…EC-07; gated `RUN_AGY_FAILURE_E2E=1`; needs a current `dist/`)
- Cases added, changed, removed, or rechecked: API-00…API-16 (planned in the investigation); IMP-01/02/03/06/07/08 reused as API-01…API-03
- Commands, environment, fixture, or broader-validation delta: test-owned Studio server with the scripted AGY CLI, then three `dist/app.js` starts on the same data dir; host load 60–95 throughout

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (all), `api-e2e-execution-coverage-report.md` (all), `api-e2e-test-progress.md`, `follow-ups.md` (FU-003), `evidence/API-*`
- Prior result and confidence: N/A
- Current result and confidence: `Fail`, 88% (requirement proof 85%, failure/lifecycle evidence 75%)
- New or remaining failure IDs: API-09 (EC-06): AC-009 / REQ-012, no logged warning names a damaged team run (left out correctly, others catalogued)
- Recommended owner: failure-origin review by `/code_reviewer`; preliminary `Design Impact`
- Remaining risks, blocked evidence, or untested scope: API-12 (integration) and API-13 (whole E2E) Next Round, on the fixed commit; AC-010's server start on the founder's data is the user's check (TESTING.md forbids a start on real data or a copy); Task-title lookup cost on real data not measured; FU-003 load-sensitive unit tests
