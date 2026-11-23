# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`, `code-review-report.md` (CRR-001 Pass), round 1 | SR-003, ARCH-REV-002, IR-001, CRR-001 | N/A | Fail / 90.9% |
| API-REV-002 | `/code_reviewer`, `code-review-report.md` (CRR-003 Full Re-Audit Pass on IR-002), round 2 | SR-004, SR-005, IR-002, CRR-002, CRR-003 | Fail / 90.9% | Pass / 95.6% |

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

### API-REV-002 — Rerun after IR-002: a stopped call reads "Stopped" read back; a Team member's case added

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-003, Full Re-Audit, Pass; F-1 resolved), round 2
- Triggering finding or case IDs: F-1 (MSP-102)
- Related revision IDs: SR-004, SR-005, IR-002 (`70f3d8d410` D-D2, `e78a539dfe` SR-005), CRR-002, CRR-003
- Why recorded: rerun after the fix
- Coverage decisions or durable test paths changed: MSP-103 added to `desktop-stopped-call-trace-cases.mjs` (a Team member's stop, reconciled on the desktop, read back on a second phone); `mobile-shell-probe.mjs` passes `sendOver`, `openPhone`, `paired`
- Cases added, changed, removed, or rechecked: R2-MSP-102, MSP-103, R2-MSP-14, R2-SI-1, R2-SE-1, R2-WS-1, FS-1; U-1 reused (IMP-12)
- Commands, environment, fixture, or broader-validation delta: a second phone from the stored pairing; fresh clone of the final commit for FS-1

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-1: a stopped call read "Failed" after a reread (phone, earlier-trace card) | Design Impact (CRR-002) | D-D2: one node rule recognizes a stored interruption (source event or text); the replay and the work journal read it; conversation entries carry the replay's status | R2-MSP-102, MSP-103, R2-WS-1 |

- Canonical artifacts and sections updated: report (round-2 cases first, round-1 rows prefixed `R1`), investigation (round 2 meta and delta), progress log, `evidence/api-e2e/R2-*`, `FS-1-fresh-start-build.log`
- Prior result and confidence: Fail / 90.9%
- Current result and confidence: Pass / 95.6%
- New or remaining failure IDs: None in this ticket. Harness issue found and fixed in my own case (MSP-103's first version disturbed MSP-14). Outside: FU-007, FU-006
- Recommended owner: code reviewer (proportional test-code review)
- Remaining risks, blocked evidence, or untested scope: native and Codex stopped calls proven at the writer level (IMP-11), not live; physical phone
