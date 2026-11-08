# API/E2E Revision Record — autobyteus-434

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-001 (Pass), round 1 | SR-004, ARCH-REV-003, IR-001, CRR-001 | N/A | Pass / 95.4% |
| API-REV-002 | Code reviewer, `api-e2e-test-review-report.md` CRR-002 (Fail, TR-001), round 2 | CRR-002 | Pass / 95.4% (test review failed TR-001) | Pass / 95.4% |
| API-REV-003 | Delivery engineer, `release-deployment-report.md` / `delivery-revision-record.md` DR-001 (Blocked: duplicate case ID MSP-20 after the base refresh), round 3 | CRR-003, DR-001 | Pass / 95.4% | Pass / 95.4% |

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

### API-REV-003 — Case IDs renumbered after the base refresh; duplicate-ID guard; integrated-state run

- Triggering role, report path, and round: delivery engineer, `release-deployment-report.md` and `delivery-revision-record.md` (DR-001, Blocked), round 3.
- Triggering finding or case IDs: DR-001: after merging origin/personal `b690a5dfdb` (autobyteus-426 round 2, autobyteus-432), the probe had two cases with ID MSP-20 (426's D-09 case and this ticket's first case). `runCase` stores results by ID, so one overwrote the other.
- Related revision IDs: CRR-003, DR-001.
- Why this revision was recorded: `Local Fix` in API/E2E-owned durable test code.
- Coverage decisions or durable test paths changed:
  - `autobyteus-web/tests/e2e/mobile-live-reconnect-cases.mjs`: **MSP-20 → MSP-21, MSP-21 → MSP-22, MSP-22 → MSP-23** (the `ids` list, `runCase` IDs, `phone.case` labels, screenshot names, header and `--cases=` comment). autobyteus-426 keeps MSP-20.
  - `autobyteus-web/tests/e2e/mobile-shell-probe.mjs`: header line and runtime note to MSP-21…23. **New guard:** before any stack starts, the probe reads its own source and the `*-cases.mjs` modules it imports and exits 1 on a case ID registered twice (`mobile-shell probe: duplicate case IDs …`). `runCase` also records a `"<id> (duplicate)"` failure if an ID runs twice (a non-literal ID the start check cannot read).
  - No assertion changed.
- Cases added, changed, removed, or rechecked:
  - API-11: server and phone bundle rebuilt from the merged state.
  - MSP-20 (426's), MSP-21, MSP-22, MSP-23 run together on the merged state: four distinct entries, all Pass. This is the integrated-state proof of AC-001…AC-005.
  - Guard check: the new probe with the pre-renumber module stops at once (`duplicate case IDs MSP-20 (mobile-shell-probe.mjs, mobile-live-reconnect-cases.mjs)`, exit 1); with the renumbered module it passes the guard. A throwaway copy, removed afterwards.
  - Not rerun: API-09 (emulator; the merge touches neither the Android shell nor this ticket's client streaming code: delivery's web streaming, collaboration, Org and store suites pass on the merge, 48 files / 466 tests), API-06, API-07, the other MSP cases (this round changes none of them: only the probe's header, the start check and `runCase`'s duplicate branch, which a unique ID never reaches; MSP-20, 426's case, ran here and passed).
- Commands, environment, fixture, or broader-validation delta: `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-20,MSP-21,MSP-22,MSP-23 --output-dir=<ticket>/evidence/MSP-20-23-merged`; ENV-4 (merged state `e60cb29272`).

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| DR-001 (duplicate case ID MSP-20 after the base refresh) | `Local Fix` — API/E2E | Renumbered to MSP-21…23; the probe refuses duplicate IDs at start; `evidence/MSP-20-23-merged/mobile-shell-probe.json` `"summary": {"cases": {"MSP-20": "Pass", "MSP-21": "Pass", "MSP-22": "Pass", "MSP-23": "Pass"}, "unknownBrowserErrors": 0}` | MSP-20 (426), MSP-21, MSP-22, MSP-23 |

- Canonical artifacts and sections updated: execution report (ID map, Round, ENV-4, MSP-21…23 rows on the merged run, API-11, Durable Coverage Changed, Latest Authoritative Result), coverage investigation (ID map, IDs), this record (earlier entries keep the old IDs), progress log.
- Prior result and confidence: Pass / 95.4%.
- Current result and confidence: Pass / 95.4% (the merged-state run reproduces every number within a few ms).
- New or remaining failure IDs: none.
- Recommended owner: code reviewer (proportional test-code review of this round's edits); delivery waits on it.
- Remaining risks, blocked evidence, or untested scope: unchanged from API-REV-001.
