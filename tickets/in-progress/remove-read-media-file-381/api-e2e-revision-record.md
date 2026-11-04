# API/E2E Revision Record — autobyteus-381

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation_engineer, `implementation-handoff.md`, round 1 | SR-001, IR-001 | N/A | Pass / 96.0% |

## Revision Entries

### API-REV-001 — Baseline: direct-route validation of the read_media_file cleanup

- Triggering role, report path, and round: implementation_engineer; `implementation-handoff.md` (IR-001, HEAD `67ed4d9e03`); round 1
- Triggering finding or case IDs: N/A (initial validation)
- Related revision IDs: SR-001, IR-001
- Why this baseline was recorded: first completed API/E2E result.
- Coverage decisions or durable test paths changed: baseline fix `0e5e2f3029` to `autobyteus-server-ts/tests/e2e/runtime/work-journal-live-runtimes.e2e.test.ts` (the task names its files by absolute path; TESTING.md Rule 9).
- Cases added, changed, removed, or rechecked: API-01..API-04 reuse IMP-01..IMP-06; API-05 (grep at HEAD), API-06 (server and core unit suites), API-07 (cross-version journal probe), API-08 (live journal e2e, AutoByteus on LM Studio), API-09 (server type gate after the baseline fix).
- Commands, environment, fixture, or broader-validation delta: broader validation required and executed (live run, cross-version lifecycle probe); clean env; synthetic data only.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/API-*`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 96.0%
- New or remaining failure IDs: None. API-08 run 1 failed on a cause in the test (relative path in its task, refused since `4cb3167a26`), fixed as a baseline fix; run 2 passed.
- Recommended owner: delivery_engineer (direct low-risk route)
- Remaining risks, blocked evidence, or untested scope: the live e2e on Claude, Codex and Antigravity was not run (paid; their oracle entries are unchanged). Observation: an old run's open journal file reads the call generically once that run continues (it is rendered on every `ensureCurrent` by design), as DEC-001 accepts.
