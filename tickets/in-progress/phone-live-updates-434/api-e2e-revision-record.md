# API/E2E Revision Record — autobyteus-434

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-001 (Pass), round 1 | SR-004, ARCH-REV-003, IR-001, CRR-001 | N/A | Pass / 95.4% |

## Revision Entries

### API-REV-001 — Baseline: phone live updates proven on the phone bundle and the real Android app; durable cases MSP-20…22

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-001, Pass, no findings), round 1.
- Triggering finding or case IDs: N/A (first validation); the reviewer's asks: AC-002 for a top-level agent run, the read-to-open window, AC-003 on the emulator (ASM-001) with the FU-003 watch, the durable mobile-shell cases, AC-006.
- Related revision IDs: SR-004, ARCH-REV-003, IR-001, CRR-001.
- Why this baseline was recorded: first completed API/E2E result.
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-web/tests/e2e/mobile-live-reconnect-cases.mjs` (MSP-20 AC-001/AC-002, MSP-21 AC-003/AC-004, MSP-22 AC-005): its own node, a TCP proxy as the phone's network path, its own phones.
  - Updated `autobyteus-web/tests/e2e/mobile-shell-probe.mjs`: header lists MSP-20…22, `runCases` runs them last, runtime note.
- Cases added, changed, removed, or rechecked: API-01…05, API-10 reused from the implementation's checks; API-06, API-07, API-08 existing tests run; MSP-20…22 new; API-09 emulator journey (temporary harness kept in the evidence folder).
- Commands, environment, fixture, or broader-validation delta: broader validation on the phone bundle (browser) and on an Android emulator instance of our own.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `follow-ups.md` (FU-004 added).
- Prior result and confidence: N/A.
- Current result and confidence: `Pass`, final confidence 95.4% (no category below 95%); every AC proven, none user-only.
- New or remaining failure IDs: none in this change; FU-004 (pre-existing Team open race) recorded as a follow-up.
- Recommended owner: code reviewer (proportional test-code review of the added and updated durable test code).
- Remaining risks, blocked evidence, or untested scope: the agent read-to-open window (design-accepted; not hit, not proven absent); the emulator's first wake after launch reconnected in 4.0 s (≤ 5 s); a delegated copy's conversation after an outage is shown at stream level only; FU-004.
