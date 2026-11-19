# API/E2E Revision Record — autobyteus-540 (send-on-unbound-stream)

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` CRR-001 Pass; round 1 | SR-003, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 95.3% |

## Revision Entries

### API-REV-001 — Baseline: send delivery probes on desktop and phone, sends after Stops and reconnects, whole server suites

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` (CRR-001 Pass), API/E2E round 1.
- Triggering finding or case IDs: the implementation handoff's "API / E2E … Still Required" (AC-002 rounds and phone case, AC-003 real-stack branches, Team/Org/peer lost sends, the new run's first message, whole server suites).
- Related revision IDs: SR-003, ARCH-REV-002, IR-001, CRR-001.
- Why recorded: first API/E2E result.
- Coverage decisions or durable test paths changed: added `autobyteus-web/tests/e2e/send-delivery-probe.mjs` (`test:e2e:send-delivery`) and `autobyteus-web/tests/e2e/mobile-send-delivery-cases.mjs` (MSP-85…88); updated `autobyteus-web/tests/e2e/fixtures/stop-generation-wire.mjs` and `autobyteus-web/tests/e2e/mobile-shell-probe.mjs`. Commit `41bba2c734`.
- Cases added: API-01…API-09 with API-04b, API-05b, API-08b.
- Commands, environment, fixture, or broader-validation delta: broader validation executed (built nodes, desktop renderer, phone bundle, alpha + beta).

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| autobyteus-533 API-10 / FU-006 (CG-07: 1 of 80 sends after a Stop lost silently) | Follow-up (urgent) | No send lost: 80 after Stops, 40 after reconnects, 15 on the phone; no `SESSION_NOT_READY` | API-06, API-07 SDD-01/02, API-08 MSP-85 |

- Canonical artifacts updated: investigation, execution report, `follow-ups.md` (FU-003), `evidence/api-e2e/` (index `README.md`).
- Prior result and confidence: N/A.
- Current result and confidence: Pass, 95.3%.
- New or remaining failure IDs: none in scope.
- Recommended owner: Code Reviewer (test-code review).
- Remaining risks or untested scope: the queued case on native/ACP (shared admission, AGY run only); 4 FSEvents-bound integration watcher tests; MSP-41 (autobyteus-458 FU-003); R-2, R-4 and the late-appearing (b) message by design; FU-003.
