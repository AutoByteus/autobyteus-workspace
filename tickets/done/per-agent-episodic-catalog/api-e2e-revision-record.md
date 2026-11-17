# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative. This file records each completed validation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-001 Pass, round 1 | SR-002, ARCH-REV-002/004, IR-001, CRR-001 | N/A | `Fail` / 88% |
| API-REV-002 | Code reviewer, `code-review-report.md` CRR-003 Pass, round 2 | SR-003, ARCH-REV-005, IR-002, CRR-003 | `Fail` / 88% | `Pass` / 95% |
| API-REV-003 | Code reviewer, `code-review-report.md` CRR-005 Pass (after test review CRR-004 TR-001), round 3 | IR-003, CRR-004, CRR-005 | `Pass` / 95% | `Pass` / 95% |

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

### API-REV-002 — Round 2: damaged records left out with warnings; whole suites run

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md` (CRR-003 `Pass` of IR-002), round 2
- Triggering finding or case IDs: API-09 (round 1 failure), API-15 (docs note)
- Related revision IDs: SR-003; ARCH-REV-005; IR-002; CRR-003
- Why this revision was recorded: rerun after the fix of round 1's failure
- Coverage decisions or durable test paths changed: `tests/e2e/memory/episodic-catalog.e2e.test.ts` EC-06 extended (warning codes, damaged org tree, damaged standalone metadata, non-JSON manifest; evidence written before the assertions)
- Cases added, changed, removed, or rechecked: all rerun (code changed in discovery, journal read, catalog); API-12 and API-13 run for the first time; API-14 Not Tested (no quiet host)
- Commands, environment, fixture, or broader-validation delta: base comparison in an own worktree at `2b73308ce5` (removed afterwards) for the E2E failures; temporary timing logs in this worktree for `embedding-settings` (removed; `src` identical to `159286c1c1`)

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| API-09 / EC-06: a damaged team record left out without a warning (AC-009, REQ-012) | Design Impact (preliminary); CR-001 in code review | IR-002 (SR-003): discovery logs `RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE` naming the root, record and reason; also for org trees and standalone metadata; an unreadable manifest gives `EPISODIC_CATALOG_RUN_LEFT_OUT` | API-09 (EC-06) |

- Canonical artifacts and sections updated: the coverage investigation (§ Round 2 Plan), the execution report (all), progress log, `follow-ups.md` (FU-003 extended, FU-005 added), `evidence/` (round 1's moved to `evidence/round1/`)
- Prior result and confidence: `Fail`, 88%
- Current result and confidence: `Pass`, 95%
- New or remaining failure IDs: none caused by this change; suite failures on this host recorded as FU-003 and FU-005 with their causes
- Recommended owner: `/code_reviewer` for proportional test-code review
- Remaining risks, blocked evidence, or untested scope: AC-010's server start on the founder's data (user, delivery gate); Task-title lookup cost on real data not measured; the history-row branch for damaged `run_metadata.json` is not reached in real use (report API-09 note); docs-sync note (API-15)

### API-REV-003 — Round 3: definition from metadata alone (TR-001)

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md` (CRR-005 `Pass` of IR-003, resolving TR-001 of `api-e2e-test-review-report.md`), round 3
- Triggering finding or case IDs: TR-001
- Related revision IDs: IR-003; CRR-004, CRR-005
- Why this revision was recorded: rerun after a source change in discovery
- Coverage decisions or durable test paths changed: `tests/e2e/memory/episodic-catalog.e2e.test.ts`: EC-06's `it` title and one comment now name the full damage set (the test review's non-blocking note); no assertion changed
- Cases added, changed, removed, or rechecked: rerun API-00, API-04…API-10, API-16; new API-17; reused IMP-16/17/18; the rest Still valid (plan in the report's Round section)
- Commands, environment, fixture, or broader-validation delta: none

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| TR-001 (test review): unreachable history-row attribution branch shown by EC-06 | Local Fix (implementation) | IR-003 removed the branch; EC-06's observed outcome (run A left out with a `run_metadata.json` warning) unchanged | API-09, API-17 |

- Canonical artifacts and sections updated: the execution report (Round, Cases, AC proof, result notes), the investigation (§ Round 3 Plan), progress log, `evidence/` (round 2's authoritative E2E files moved to `evidence/round2/`)
- Prior result and confidence: `Pass`, 95%
- Current result and confidence: `Pass`, 95%
- New or remaining failure IDs: none
- Recommended owner: `/code_reviewer` for proportional test-code review
- Remaining risks, blocked evidence, or untested scope: as API-REV-002, without the history-row note and the docs-sync note (both resolved by IR-003)
