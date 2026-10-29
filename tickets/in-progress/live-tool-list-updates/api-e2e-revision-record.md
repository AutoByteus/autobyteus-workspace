# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-003 Pass, round 1 | IR-002, IR-003, CRR-003, SR-007 | N/A | Fail / 72% |

## Revision Entries

### API-REV-001 — Baseline: Codex live passes; a failed reopen is not shown on single runs

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-003 Pass), round 1
- Triggering finding or case IDs: API-05 (Fail)
- Related revision IDs: IR-002, IR-003, CRR-003, SR-007
- Why this baseline was recorded: first API/E2E result
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/runtime/tool-list-reopen-failure.e2e.test.ts`
- Cases added, changed, removed, or rechecked: API-01…API-07 planned. API-01 and API-02 reused; API-03 Pass; API-04 Blocked (Grok usage limit); API-05 Fail; API-06 and API-07 Not Tested (next round)
- Commands, environment, fixture, or broader-validation delta: baseline (see the report's Tested Builds And Environments)

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `follow-ups.md` (FU-003), `evidence/api-e2e/`
- Prior result and confidence: N/A
- Current result and confidence: Fail, 72%
- New or remaining failure IDs: API-05 (AC-007, single runs: the failed message is not shown)
- Recommended owner: failure-origin review by the code reviewer; preliminary `Design Impact` (Solution Designer)
- Remaining risks, blocked evidence, or untested scope: real Grok (API-04, provider limit); browser journeys API-06 and API-07
