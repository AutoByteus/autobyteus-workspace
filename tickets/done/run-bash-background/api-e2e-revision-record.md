# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code reviewer, `code-review-report.md` CRR-002 Pass, round 1 | SR-005, ARCH-REV-003, IR-002, CRR-002 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: native background tasks end to end, real models, real panel

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-002), round 1
- Triggering finding or case IDs: none (first validation)
- Related revision IDs: SR-005, ARCH-REV-003, IR-002, CRR-002
- Why this baseline was recorded: first API/E2E validation of autobyteus-338 (product code `ddd594d07b`)
- Coverage decisions or durable test paths changed: added `tests/e2e/runtime/autobyteus-background-task-transport.e2e.test.ts` (BGT-01..09) and `tests/e2e/runtime/autobyteus-background-task-live.e2e.test.ts`; updated the native standalone host fixture (run-end stop, REQ-009) and the native live harness (baseline fix: owner credential on GraphQL; `url` getter)
- Cases added, changed, removed, or rechecked: API-R01..R05 reused (IMP-02..08); API-01..17 new
- Commands, environment, fixture, or broader-validation delta: scripted LM Studio model for deterministic E2E; real Anthropic/OpenAI via the test vault; Linux container probe; isolated desktop instance

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/API-*`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95% (post-repository 90%)
- New or remaining failure IDs: none
- Recommended owner: code reviewer (proportional test-code review)
- Remaining risks, blocked evidence, or untested scope: WSL (R-0/R-6, bridge exit) only on a Windows machine (user-only); FU-003 start under heavy load (out of scope, DEC-005)
