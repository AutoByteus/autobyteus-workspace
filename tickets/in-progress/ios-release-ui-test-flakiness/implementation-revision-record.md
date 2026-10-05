# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record only indexes implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | solution_designer / solution-handoff.md (Architecture Design Complete) / initial | N/A | `Initial Baseline` | SR-002 | Implemented; local proof passes; commit `c314aa98c` (later pushed by API/E2E) |
| IR-002 | code_reviewer / code-review-report.md CRR-001 (failure origin of API-REV-001 CI-4) / round 1 | F-001 | `Local Fix` | SR-002, CRR-001, API-REV-001 | Switch state confirmed before Connect; local proof passes; commit `8d3cb19ea` (not pushed) |

## Revision Entries

### IR-001 — Debug-only connection-timeout override and readiness-based smoke UI tests (initial baseline)

- Triggering role, report path, and round: solution_designer, /Users/normy/autobyteus_org/autobyteus-worktrees/ios-release-ui-test-flakiness/tickets/in-progress/ios-release-ui-test-flakiness/solution-handoff.md, initial round.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: Implementation complete on branch `codex/ios-release-ui-test-flakiness`, commit `c314aa98c` (local only, not pushed). Classification Small / Low confirmed. Ready for direct API/E2E validation, including the CI dispatch series.
- Related solution revision IDs: SR-002
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation of the approved SR-002 design.
- Approved behavior or requirement IDs affected: BEH-I1, BEH-I2; REQ-I1–I4.
- Implementation delta:
  - App: `AppShellCoordinator.makeConnectionValidator` reads the DEBUG-only `AUTOBYTEUS_CONNECTION_TIMEOUT_SECONDS` (positive, capped at 120); otherwise it calls the unchanged `ConnectionValidator()`.
  - UI tests: a launch helper sets the override (60) on every launch, including the restore launch; taps wait for hittable controls and typing waits for keyboard focus; bounded waits of 30/60/90 s; no sleeps.
  - Fake server: `--status-delay-seconds`.
  - README notes.
- Changed files or areas: autobyteus-ios/AutoByteusMobile/AppShellCoordinator.swift, autobyteus-ios/AutoByteusMobileUITests/AutoByteusMobileUITests.swift, autobyteus-ios/scripts/fake-mobile-server.py, autobyteus-ios/README.md.
- Local validation and result:
  - Before the fix, a 7 s delay fails (I11 reproduced with the repo flag).
  - After the fix, delays of 0, 7 and 30 s pass.
  - Negative checks (marker absent, no server) fail as expected.
  - Core tests 21/21, contract check, and the unchanged smoke script pass.
  - The Release build succeeds and Release defines no DEBUG condition.
- Next recipient or routing: per get_handoff_rules (direct API/E2E for Small/Low).
- Remaining limitations or risks: AC-I3 CI series not run (branch not pushed); unknown slowness forms; longer duration of failing runs; `hasKeyboardFocus` is a KVC attribute.

### IR-002 — Confirm the HTTP acknowledgement switch is on before Connect (Local Fix, CRR-001 F-001)

- Triggering role, report path, and round: code_reviewer, /Users/normy/autobyteus_org/autobyteus-worktrees/ios-release-ui-test-flakiness/tickets/in-progress/ios-release-ui-test-flakiness/code-review-report.md, CRR-001 round 1 (failure origin of API/E2E API-REV-001, CI-4 run 37276561512).
- Triggering finding IDs: F-001
- Classification: `Local Fix`
- Prior authoritative result: IR-001 (`c314aa98c`). CI-4 failed on attempt 1 at swift:31: the switch tap was delivered but had no effect, so the app showed "HTTP needs explicit acknowledgement" and no connection was attempted.
- Current authoritative result: `8d3cb19ea`. `connect()` confirms that the switch is on (bounded wait, at most 3 taps, value checked before each tap), asserts that it is on before Connect, and waits for the input to contain the typed URL. Classification Small / Low unchanged.
- Related solution revision IDs: SR-002
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why this revision is recorded: Local Fix for F-001, a new slow-host form "D" (a tap delivered without effect).
- Approved behavior or requirement IDs affected: BEH-I2, REQ-I2, REQ-I3 (AC-I3 restarts).
- Implementation delta: `turnOn(_:name:)`, `isOn(_:)`, `maxToggleAttempts = 3`, an NSPredicate overload of `waitUntil`, the typed-URL wait and the switch-on assertion in `connect()`.
- Changed files or areas: autobyteus-ios/AutoByteusMobileUITests/AutoByteusMobileUITests.swift only.
- Local validation and result:
  - Delay 0 (both tests) and delay 7 s pass; the marker-absent negative fails as expected.
  - A simulated lost first tap passes via the re-tap.
  - A simulated switch that never turns on fails at the precise step after 3 taps.
  - Both simulations used temporary uncommitted app patches, reverted afterwards.
- Next recipient or routing: /api_e2e_engineer (push `8d3cb19ea`, restart the CI series at 1).
- Remaining limitations or risks:
  - Other unseen slow-host forms may remain.
  - Open owner decision on the AC-I3 run count (solution_designer plus user approval; not blocking).
