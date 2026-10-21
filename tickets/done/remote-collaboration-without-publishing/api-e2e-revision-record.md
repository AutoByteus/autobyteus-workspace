# API/E2E Revision Record — autobyteus-245

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` CRR-001; round 1 | SR-005, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Two-server E2E rewritten for no publishing; Pass

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` (CRR-001, Pass, no findings), round 1.
- Triggering finding or case IDs: none (step 6 of the design: the E2E still used publishing).
- Related revision IDs: SR-005, ARCH-REV-002, IR-001, CRR-001.
- Why this baseline was recorded: the first API/E2E result for this ticket.
- Coverage decisions or durable test paths changed: `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`:
  - RC-03 checks there is no publish API;
  - RC-04 replaced by AC-202 … AC-204 and AC-207;
  - RC-05 checks AC-201/AC-205;
  - RC-17 replaced by RU-1;
  - RC-20 uses `address`;
  - harness: beta gets a missing Codex, a team-local fixture and a leftover file.
- Cases added, changed, removed, or rechecked:
  - API-00;
  - API-01 … API-20 (runs 1 and 2, 20/20 each);
  - API-21 (same-node suites with the switch on, 36/37 with autobyteus-191's FU-003);
  - API-22 (browser card);
  - API-R1/R2 reused.
- Commands, environment, fixture, or broader-validation delta: ENV-1 … ENV-3 (report).

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/api-e2e/`.
- Prior result and confidence: N/A
- Current result and confidence: Pass / 95%
- New or remaining failure IDs: none
- Recommended owner: the Code Reviewer, for the proportional test-code review.
- Remaining risks, blocked evidence, or untested scope:
  - RSK-201 (auto-approve always on, accepted);
  - Agent Teams across nodes (autobyteus-247).
