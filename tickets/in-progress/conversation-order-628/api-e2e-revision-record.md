# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`, `code-review-report.md` (CRR-002 Pass), round 1 | SR-001…SR-006, ARCH-REV-001…003, IR-001, IR-002, CRR-001, CRR-002 | N/A | Pass / 95.1% |

## Revision Entries

### API-REV-001 — Baseline: order and node times proven on Claude and native runs

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-002, round 2, Pass), round 1
- Triggering finding or case IDs: — (baseline)
- Related revision IDs: SR-001…SR-006, ARCH-REV-001…003, IR-002, CRR-002
- Why recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed: MSP-106 and MSP-107 added (gated live) in `mobile-conversation-order-live-cases.mjs`, registered in `mobile-shell-probe.mjs`
- Cases added, changed, removed, or rechecked: MSP-106, MSP-107, SI-1, SE-1, WS-1, FS-1 (with the packaged-app check); U-1 reused (IMP-16)
- Commands, environment, fixture, or broader-validation delta: the test vault for node `nu` only; a test-owned Claude (api-key mode)

#### Prior Failure Resolution

None

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/api-e2e/`
- Prior result and confidence: N/A
- Current result and confidence: Pass / 95.1%
- New or remaining failure IDs: None in this ticket. Outside: FU-002, 609 FU-006, 609 FU-007
- Recommended owner: code reviewer (proportional test-code review)
- Remaining risks, blocked evidence, or untested scope: N-5 by unit only; Codex not run; physical phone
