# API/E2E Revision Record — autobyteus-191

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` CRR-002; round 1, cut short by the Solution Designer's hold (ARCH-REV-003) | SR-014, SR-015, ARCH-REV-002, ARCH-REV-003, IR-002, CRR-002 | N/A | Fail (F-001; partial round) / 49% |

## Revision Entries

### API-REV-001 — Baseline: two-server E2E written; settings and gateway validated; delegation held

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` (CRR-002, Pass), round 1. During the round the Solution Designer held change-sequence steps 3–6 (ARCH-REV-003 Fail / Design Impact; SR-015 `f1d7dd9337`, documents only).
- Triggering finding or case IDs: none on entry; F-001 found in this round.
- Related revision IDs: SR-014, SR-015, ARCH-REV-002, ARCH-REV-003, IR-002, CRR-002.
- Why this baseline was recorded: the first API/E2E result (a partial one).
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` (RC-01 … RC-20; RC-01, RC-03 and RC-20 executed).
- Cases added, changed, removed, or rechecked: API-00, API-01, API-03, API-20 run; API-R1 … API-R4 reused; the rest held.
- Commands, environment, fixture, or broader-validation delta: two built server processes with clean environments and capturing proxies (ENV-1).

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (Planned Cases, Ambiguities), `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/api-e2e/`.
- Prior result and confidence: N/A
- Current result and confidence: Fail (partial) / 49%
- New or remaining failure IDs: F-001
- Recommended owner: Implementation Engineer (`Local Fix`, after the code reviewer's failure-origin review)
- Remaining risks, blocked evidence, or untested scope: every delegation and messaging case, the switch-on regression suites and the browser journey wait for the SR-015 code; AC-113 is the user's.
