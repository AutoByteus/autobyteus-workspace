# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative; this file keeps the history.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` CRR-007, round 1 | SR-053, IR-004, CRR-007 | N/A | Fail / 61% |

## Revision Entries

### API-REV-001: baseline; the contract's stories, the migration start and the stopped-delegator views

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-007 at `bc223a8ae0`), API/E2E round 1
- Triggering finding or case IDs: the review's API/E2E items (removed events, removed restore mutations, SCN-005/AC-007 journeys, C3-06, the migration on real starts) and the design's Validation list
- Related revision IDs: SR-053, IR-004, CRR-007
- Why this baseline was recorded: first validation of the package
- Coverage decisions or durable test paths changed: added the stories acceptance test and its model export, the built-server migration start, the stopped-delegator views probe, the member-message restore helper, the in-process run-history helper; updated the harnesses, the in-process suites and six suites that used the removed restore mutations (report, "Durable Coverage Changed")
- Cases added, changed, removed, or rechecked: API-E02 Fail, API-E03 Pass, API-B01 Fail, API-B02 Pass, API-E01 triaged (six files updated and passing), API-R01/R02 reused; API-I01, API-B03, API-L01, API-F01 deferred to after the fix round
- Commands, environment, fixture, or broader-validation delta: ENV-1 (built servers, clean env, scripted AGY), ENV-2 (probe-owned browser stack)

#### Prior Failure Resolution

None

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/api-e2e/`
- Prior result and confidence: N/A
- Current result and confidence: Fail / 61%
- New or remaining failure IDs: F-1, F-2, F-3 (`Local Fix`), F-4 (`Unclear`), F-5 (`Design Impact`)
- Recommended owner: Implementation Engineer (F-1 … F-3), Solution Designer (F-5; K-1 … K-11 contract-model notes); F-4 for the failure-origin review
- Remaining risks, blocked evidence, or untested scope: the stale baseline suites (API-E01), the web probes naming removed events (API-B03), integration, the real runtime, the fresh-start build, the phone layout; observation O-1 (a child command loads a stopped delegator's root, so `agentRunCollaborationStatuses.isActive` answers `true`)
