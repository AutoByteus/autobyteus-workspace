# API/E2E Revision Record — autobyteus-434

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-001 (Pass), round 1 | SR-004, ARCH-REV-003, IR-001, CRR-001 | N/A | Pass / 95.4% |
| API-REV-002 | Code reviewer, `api-e2e-test-review-report.md` CRR-002 (Fail, TR-001), round 2 | CRR-002 | Pass / 95.4% (test review failed TR-001) | Pass / 95.4% |

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

### API-REV-002 — TR-001: MSP-21(c) measures each phone's own run

- Triggering role, report path, and round: code reviewer, `api-e2e-test-review-report.md` (CRR-002, Fail), round 2.
- Triggering finding or case IDs: TR-001 (`Local Fix`, API/E2E); MSP-21; AC-004.
- Related revision IDs: CRR-002.
- Why this revision was recorded: MSP-21(c) "hidden while unreachable" counted every agent/Team/Org WebSocket on the phone. The agent phone also keeps the Team's stream, and the agent run's own attempt starts with its catch-up read (no socket while the read fails). So the agent phone's `1` was the Team stream, and the agent run's AC-004 behavior was not measured.
- Coverage decisions or durable test paths changed: `autobyteus-web/tests/e2e/mobile-live-reconnect-cases.mjs`:
  - each phone records its GraphQL reads;
  - `ownAttempts` counts the shown run only: Team phone `/ws/agent-team/<team run>`; agent phone `GetRunProjection` reads with `runId` = the agent run plus `/ws/agent/<agent run>`;
  - MSP-21(c) asserts none while hidden, at least one within 2 s of visible, and the agent's attempt is its catch-up read;
  - header line of MSP-21 updated;
  - MSP-20: `reopenedAfterPassMs` is `null`, not `NaN`, when no reopened collaboration stream is found (the reviewer's optional note; the assertion already failed correctly).
- Cases added, changed, removed, or rechecked: MSP-21 rerun alone (`evidence/MSP-21-rerun-tr001/`). The other cases are not rerun: MSP-20's change only affects a value when its assertion fails anyway (MSP-20 passed with the value finite); MSP-22, API-08 and API-09 do not run the changed code.
- Commands, environment, fixture, or broader-validation delta: `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-21 --output-dir=<ticket>/evidence/MSP-21-rerun-tr001`; ENV-1.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| TR-001 (MSP-21(c) counted the agent phone's Team stream) | `Local Fix` — API/E2E | Each phone's own run is counted: while hidden `"phone-team": [], "phone-agent": []`; within 2 s of visible `{"socket": "/ws/agent-team/…", "at": 7}` and `{"read": "GetRunProjection", "at": 8}`; probe `Pass` | MSP-21 |

- Canonical artifacts and sections updated: execution report (Round, MSP-21 row, AC-004 proof row, Durable Coverage Changed, Latest Authoritative Result), this record, `api-e2e-test-progress.md`.
- Prior result and confidence: Pass / 95.4% (test review CRR-002 failed on TR-001).
- Current result and confidence: Pass / 95.4% (the scores do not change: AC-004 for the agent owner is now measured on the phone as the round-1 report claimed).
- New or remaining failure IDs: none.
- Recommended owner: code reviewer (proportional test-code review, round 2).
- Remaining risks, blocked evidence, or untested scope: unchanged from API-REV-001.
