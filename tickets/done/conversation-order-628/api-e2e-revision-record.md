# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`, `code-review-report.md` (CRR-002 Pass), round 1 | SR-001…SR-006, ARCH-REV-001…003, IR-001, IR-002, CRR-001, CRR-002 | N/A | Pass / 95.1% |
| API-REV-002 | `/code_reviewer`, `code-review-report.md` (CRR-004 Pass on IR-003, after DR-001 Blocked), round 2 | SR-007, ARCH-REV-004, IR-003, CRR-004, DR-001 | Pass / 95.1% | Pass / 95.1% |

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

### API-REV-002 — Rerun on the merged tree after SR-007 and DR-001 Finding 1

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-004, targeted delta, Pass), round 2
- Triggering finding or case IDs: DR-001 Finding 1 (contract suites red), Finding 2 (SR-007: stored trace times)
- Related revision IDs: SR-007, ARCH-REV-004, IR-003 (`ba25165c1e`, `2dbfe43c28`), CRR-004, DR-001
- Why recorded: rerun after IR-003 on the merged tree (`54cee15c8e` merge of `origin/personal`)
- Coverage decisions or durable test paths changed: None (MSP-106/107 unchanged; their 500 ms bounds hold for write times)
- Cases added, changed, removed, or rechecked: R2-CS-1, R2-MSP-105…107, R2-SI-1, R2-SE-1, R2-WS-1, R2-FS-1 (a new clone; the merged commit had no fresh-start build), R2-U-1 reused (IMP-18; delivery's DEL-04/DEL-01)
- Commands, environment, fixture, or broader-validation delta: the first live run was stopped by an application restart and run again

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| DR-001 Finding 1: contract suites red | delivery finding | their fixtures carry `occurred_at` / `accepted_at` (`2dbfe43c28`) | R2-CS-1 |
| DR-001 Finding 2: stamped trace times reordered multi-event traces on reload | Design Impact (SR-007) | stored traces keep their write time (`ba25165c1e`) | R2-MSP-105…107 (reopened order; write times within 11 ms of live), IMP-18 |

- Canonical artifacts and sections updated: report (round-2 cases first, round-1 rows prefixed `R1`), progress log, `evidence/api-e2e/R2-*`
- Prior result and confidence: Pass / 95.1%
- Current result and confidence: Pass / 95.1%
- New or remaining failure IDs: None in this ticket. Outside: FU-002, 609 FU-006, 609 FU-007
- Recommended owner: code reviewer (proportional test-code review)
- Remaining risks, blocked evidence, or untested scope: N-5 by unit only; N-6 (a future runtime's remote time in a trace's `ts`); Codex not run; physical phone
