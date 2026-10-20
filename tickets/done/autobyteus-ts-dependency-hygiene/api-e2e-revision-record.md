# API/E2E Revision Record — autobyteus-ts-dependency-hygiene

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md` (IR-001), round 1 | SR-001, IR-001 | N/A | Pass / 95.1% |

## Revision Entries

### API-REV-001 — Lockfile install paths, packaged and Docker MCP checks, L-1 decision

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md` (IR-001), round 1
- Triggering finding or case IDs: L-1 (decision requested)
- Related revision IDs: SR-001, IR-001
- Why this baseline was recorded: first complete API/E2E result.
- Coverage decisions or durable test paths changed: none.
- Cases: reused API-R01…API-R03 (IMP-02…IMP-08); added API-01 (install paths and dedupe on a fresh checkout), API-02 (references), API-03 (MCP through the packaged server; stop reproductions), API-04 (Docker image; install-context attribution).
- Commands, environment, fixture, or broader-validation delta: fresh temporary checkout; isolated instances from the IMP-06 packaged app; a test-owned Docker image and container.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md` (new); `follow-ups.md` (FU-003, FU-004); `evidence/API-01…API-04`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.1%
- New or remaining failure IDs: none
- Recommended owner: N/A
- Remaining risks, blocked evidence, or untested scope: packaged Linux and Windows desktop builds not run locally; one forced instance stop not reproduced (observation).
