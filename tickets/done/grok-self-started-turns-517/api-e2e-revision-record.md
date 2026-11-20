# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` (CRR-002 Pass), round 1 | SR-005, ARCH-REV-005, IR-003, CRR-002 | N/A | Pass / 95.1% |

## Revision Entries

### API-REV-001 — Grok provider-started turns on HEAD; the hand-over gap variant added

- Triggering role, report path, and round: code reviewer, `tickets/in-progress/grok-self-started-turns-517/code-review-report.md` (CRR-002), round 1.
- Triggering finding or case IDs: N/A (baseline); the gap variant was a coverage hint of the handoff and the review.
- Related revision IDs: SR-001..SR-005, ARCH-REV-001..005, IR-001..IR-003, CRR-001, CRR-002.
- Why recorded: first API/E2E result.
- Coverage decisions or durable test paths changed: added `orderBGap` (`tests/e2e/helpers/grok-fake-cli.ts`) and its E2E case in `tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts`.
- Cases: API-01 (Grok replay suite on HEAD, 10/10), API-02 (gap case, plus 3 runs alone), API-03 (typechecks); reused IMP-03, IMP-04, IMP-05, IMP-07.
- Commands, environment, fixture, or broader-validation delta: scripted Grok CLI; no browser (same event shapes as Claude's provider turns).

#### Prior Failure Resolution

None.

- Canonical artifacts updated: coverage investigation, execution report, test progress log.
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.1%
- New or remaining failure IDs: None (the `afterAll` close stall is the known autobyteus-517 FU-002, present on base).
- Recommended owner: code reviewer (proportional test-code review), then delivery.
- Remaining risks: RSK-001, RSK-003, RSK-004 as the design records them.
