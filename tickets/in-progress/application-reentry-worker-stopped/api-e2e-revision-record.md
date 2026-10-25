# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` CRR-001 (Pass), round 1 | SR-001, SR-002, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 97% |

## Revision Entries

### API-REV-001: Baseline. Reentry returns applications to ACTIVE with the worker stopped; real crash and pending-event coverage added

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` (CRR-001, Pass), round 1
- Triggering finding or case IDs: N/A (initial); the code review's hints for API/E2E (a real worker crash then repair; a pending event across a reentry)
- Related revision IDs: SR-001, SR-002, ARCH-REV-002, IR-001, CRR-001
- Why this baseline was recorded: first completed validation result
- Coverage decisions or durable test paths changed: `autobyteus-server-ts/tests/e2e/runtime/application-reload-repair.e2e.test.ts`: RE-04 and RE-05 added, helpers added, header updated, RE-03 stores the imported application
- Cases: API-01…05 reused (IMP-00…05); API-06 docs review; API-07 e2e RE-01…05; API-08 two mutations
- Commands, environment, fixture, or broader-validation delta: server E2E in a clean env; temporary design probes and mutations (removed or restored)

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation, execution report, `follow-ups.md` (FU-006)
- Prior result and confidence: N/A
- Current result and confidence: Pass, 97%
- New or remaining failure IDs: none
- Recommended owner: Code Reviewer (proportional test-code review of the e2e change)
- Remaining risks, blocked evidence, or untested scope: the accepted residuals; FU-006 (application-owned runs cannot be ended through the public terminate)
