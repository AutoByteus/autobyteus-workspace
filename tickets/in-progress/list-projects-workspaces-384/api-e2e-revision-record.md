# API/E2E Revision Record — autobyteus-384

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation_engineer, `implementation-handoff.md`, round 1 | SR-001, SR-002, IR-001 | N/A | Pass / 96.0% |

## Revision Entries

### API-REV-001 — Baseline: list_projects with linked folders over native, real MCP and a live model

- Triggering role, report path, and round: implementation_engineer; `implementation-handoff.md` (IR-001, HEAD `af13798404`); round 1
- Triggering finding or case IDs: N/A (initial validation)
- Related revision IDs: SR-001, SR-002 (beta release, DEC-004), IR-001
- Why this baseline was recorded: first completed API/E2E result.
- Coverage decisions or durable test paths changed: E-006 of `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` now lists the Projects over real MCP (`590cddaff1`).
- Cases added, changed, removed, or rechecked: API-01, API-02 reuse IMP-01, IMP-02; API-03 (e2e file, with a negative control), API-04 (type gate), API-05 (live agent probe).
- Commands, environment, fixture, or broader-validation delta: broader validation required and executed (live AutoByteus run on LM Studio); clean env; temp data only.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/API-*`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 96.0%
- New or remaining failure IDs: None
- Recommended owner: delivery_engineer (then the beta release)
- Remaining risks, blocked evidence, or untested scope: Claude/Codex agents not run live (paid; the MCP transport they use is proven by API-03); one model and one run for the agent-use scenario.
