# API/E2E Revision Record — autobyteus-415

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation_engineer, `implementation-handoff.md` IR-001, round 1 | SR-001, IR-001 | N/A | Pass / 95.1% |

## Revision Entries

### API-REV-001 — Baseline: instrumented tests on two API levels, AC-001 from the node's side, system activities across rotation

- Triggering role, report, round: implementation_engineer, IR-001 (direct low-risk route), round 1
- Triggering finding or case IDs: N/A (initial)
- Related revision IDs: SR-001, IR-001
- Why recorded: first validation round
- Coverage decisions or durable test paths changed: added `autobyteus-android/app/src/androidTest/java/org/autobyteus/mobile/MainActivityConfigurationChangeTest.kt`. It passes on API 35 and API 34, and fails without `android:configChanges` (control).
- Cases: API-01 reuses IMP-02…06. New cases:
  - API-02: instrumented tests, API 35, plus the control.
  - API-03: AC-001 on a Files view, with node-side counting through an access proxy.
  - API-04: file chooser across rotation.
  - API-05: QR scanner across rotation.
  - API-06: display resize.
  - API-07: dark-mode boundary, plus the relaunch log.
  - API-08: API 34.
- Commands, environment, fixture delta: emulators `autobyteus277_api35` / `autobyteus277_api34` (test AVDs, wiped); test node `abx415-api-node` on the `beta` image; access-logging proxy; WebView DevTools; logcat relaunch lines with positive controls.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `follow-ups.md` (FU-002), `evidence/API-*`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.1%
- New or remaining failure IDs: none
- Recommended owner: N/A
- Remaining risks:
  - A physical phone was not used (team rule).
  - Split screen and a hardware keyboard were not exercised.
  - Instrumented tests run on demand only.
