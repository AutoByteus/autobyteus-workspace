# API/E2E Revision Record — autobyteus-661

The latest coverage investigation and execution coverage report are authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, code-review-report.md, CRR-002 (slice T-3) | SR-001 (+ decision (b), CR-001/CR-002 decisions), ARCH-REV-004, IR-001, IR-002, CRR-001, CRR-002 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — slice T-3 (node keys, one pairing model, migration) at b59628b4bf

- Trigger: `/code_reviewer`, `code-review-report.md` (CRR-002, Pass).
- Commit under test: b59628b4bf, which also contains 7f723d717b (T-4 part 1, not code-reviewed); runs in API/E2E's own clone.
- Coverage changes: new durable `autobyteus-server-ts/tests/e2e/remote-collaboration/pairing-requests-real-servers.e2e.test.ts` (PRQ-01…05).
- Cases: API-01…API-08, API-R1 (IMP-01…07 reused).
- Environment: three built servers; Docker nodes with this commit's server package; the released 1.5.14-beta.7 image for the upgrade.

#### Prior Failure Resolution

None.

- Canonical artifacts: investigation, report, progress log (new).
- Current result: Pass, 95%.
- Remaining risks: 7f723d717b unreviewed (reviewed with T-4); the Manage Nodes UI and probes are T-6 (FU-661-02); the private-network machine rule has no producer before T-4.
