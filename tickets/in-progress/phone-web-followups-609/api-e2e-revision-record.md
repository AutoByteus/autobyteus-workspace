# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`, `code-review-report.md` (CRR-001 Pass), round 1 | SR-003, ARCH-REV-002, IR-001, CRR-001 | N/A | Fail / 90.9% |

## Revision Entries

### API-REV-001 — Baseline: every item but AC-D proven; a stopped call reads "Failed" after a reread

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-001, Full Review, Pass), round 1
- Triggering finding or case IDs: — (baseline)
- Related revision IDs: SR-003, ARCH-REV-002, IR-001, CRR-001
- Why recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed:
  - MSP-101 added (`mobile-heading-links-cases.mjs`);
  - MSP-102 added (new `desktop-stopped-call-trace-cases.mjs`);
  - MSP-91 tightened (`mobile-file-open-cases.mjs`);
  - `AGENT_TOOL_STEPS` added to `agy-failure-cli.mjs`, with a routing test.
- Cases added, changed, removed, or rechecked: CS-1, CD-1, SI-1, SE-1 (with a base comparison), FX-1, MSP-89…91, MSP-101, MSP-102, WS-1; U-1 and CC-1 reused (IMP-07, IMP-03, IMP-09); FS-1 next round
- Commands, environment, fixture, or broader-validation delta: clean env under `/tmp/api609`; a fresh clone of the base `f2c0d2a902` for SE-1 and CD-1

#### Prior Failure Resolution

None

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/api-e2e/`
- Prior result and confidence: N/A
- Current result and confidence: Fail / 90.9%
- New or remaining failure IDs: F-1 (AC-D read-back)
- Recommended owner: through the failure-origin review; preliminary Design Impact
- Remaining risks, blocked evidence, or untested scope: FS-1 on the final tree; physical phone; outside: SE-1's two base failures (socket in the snapshot), MSP-61 (FU-006)
