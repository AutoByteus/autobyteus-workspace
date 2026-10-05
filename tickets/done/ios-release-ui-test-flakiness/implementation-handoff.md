# Implementation Handoff — iOS release UI-test flakiness fix

Ticket root: /Users/normy/autobyteus_org/autobyteus-worktrees/ios-release-ui-test-flakiness/tickets/in-progress/ios-release-ui-test-flakiness
Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/ios-release-ui-test-flakiness; branch `codex/ios-release-ui-test-flakiness`; base origin/personal @ 10fb69504; commits `c314aa98c` (IR-001) and `8d3cb19ea` (IR-002, Local Fix for CRR-001 F-001). API/E2E has already pushed the branch for the CI series, but `8d3cb19ea` is local only and must be pushed before the series restarts.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Direct route (Small / Low). Solution Designer sent "Architecture Design Complete" under the Small/Medium + Low rule → /implementation_engineer.
- Requirements doc: /Users/normy/autobyteus_org/autobyteus-worktrees/ios-release-ui-test-flakiness/tickets/in-progress/ios-release-ui-test-flakiness/requirements-doc.md (Approved 2026-10-05; REQ-I1–I4)
- Investigation notes: /Users/normy/autobyteus_org/autobyteus-worktrees/ios-release-ui-test-flakiness/tickets/in-progress/ios-release-ui-test-flakiness/investigation-notes.md (I01–I13)
- Solution revision record: /Users/normy/autobyteus_org/autobyteus-worktrees/ios-release-ui-test-flakiness/tickets/in-progress/ios-release-ui-test-flakiness/solution-revision-record.md (SR-002)
- Design spec: /Users/normy/autobyteus_org/autobyteus-worktrees/ios-release-ui-test-flakiness/tickets/in-progress/ios-release-ui-test-flakiness/design-spec.md
- Supplemental task artifacts: probes/ (CI failure analysis, local-repro) and the new implementation-evidence/ folder (local proof logs and runner scripts)
- Design review report: `N/A — not applicable` (direct route)
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: code-review-report.md CRR-001 (API/E2E failure-origin review of CI-4, run 37276561512), finding F-001, classification Local Fix; API/E2E revision API-REV-001 and evidence api-e2e-evidence/ci-run4/

## Current Implementation Summary

1. **App (`AutoByteusMobile/AppShellCoordinator.swift`):** the validator now comes from `makeConnectionValidator()` (nonisolated, static).
   - Under `#if DEBUG` it reads launch environment `AUTOBYTEUS_CONNECTION_TIMEOUT_SECONDS`. A positive finite number, capped at 120, gives `ConnectionValidator(timeoutSeconds:)`.
   - Otherwise, and always in non-DEBUG builds, it returns the unchanged `ConnectionValidator()`, whose default is 5 s. The production code path is literally the previous call.
2. **UI tests (`AutoByteusMobileUITests/AutoByteusMobileUITests.swift`):**
   - One `launchApp(resetSavedNodes:)` helper sets `AUTOBYTEUS_CONNECTION_TIMEOUT_SECONDS=60` on every launch, including the restore relaunch. `AUTOBYTEUS_RESET_SAVED_NODES=1` is set only on first launches.
   - `connect()` waits until the input exists and is hittable, taps, waits for `hasKeyboardFocus == true` before `typeText`, and waits for the HTTP switch and Connect button to be hittable before tapping. These waits are bounded at 30 s and return as soon as the condition holds.
   - WebView and marker waits are 60 s each. The unreachable diagnostic wait is 90 s (override + 30): port 9 refuses at once, and even a hanging connection would end at the 60 s override before the wait does.
   - No fixed sleeps. The assertions are the same as before.
3. **Fake server (`scripts/fake-mobile-server.py`):** optional `--status-delay-seconds` (float, default 0, negative rejected) delays only `/rest/remote-access/status`. CI does not pass it.
   **IR-002 (F-001):** on a loaded simulator a delivered tap can have no effect. CI-4 showed this on the HTTP acknowledgement switch: the app correctly refused http, so "unreachable" could never appear. `connect()` now:
   - waits (bounded) for the input to contain the typed URL;
   - turns the switch on with `turnOn()`: wait until hittable; return if already on; tap; wait up to 30 s for value `"1"`; at most 3 attempts. The value is checked before every tap, so the switch is never toggled back off;
   - asserts "HTTP acknowledgement switch should be on before Connect", then taps Connect.
4. **Docs (`autobyteus-ios/README.md`):** the override, its Debug-only scope and cap, and the local slow-host regression command.

- Implementation cycle: `Rework` (IR-002 Local Fix on the IR-001 baseline)
- Implementation revision record: /Users/normy/autobyteus_org/autobyteus-worktrees/ios-release-ui-test-flakiness/tickets/in-progress/ios-release-ui-test-flakiness/implementation-revision-record.md
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: `N/A` · Related code-review revision IDs: `CRR-001` · Related API/E2E revision IDs: `API-REV-001` · Related delivery revision IDs: `N/A`
- Triggering finding IDs: `F-001`

## Routing Classification (Mandatory)

- Task size: `Small` · Architecture risk: `Low`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - Four files changed, with no workflow, smoke-script, publish-gating, production-timeout or runner change. Those were the escalation triggers; none fired.
  - The override is compiled only where `SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG`.
- Selected route: `Direct API/E2E` (per get_handoff_rules)
- Lightweight implementation self-review completed: `Yes`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-I1 / REQ-I1 | UI-test env can raise the connection-check timeout; production keeps 5 s | `XCUIApplication.launchEnvironment` → `AppShellCoordinator.makeConnectionValidator` (DEBUG) → `ConnectionValidator(timeoutSeconds:)` | AC-I1a: status delayed 7 s fails before the fix (repo flag reproduces I11: same assertions, TEST FAILED) and passes after (29.96 s). A 30 s delay also passes (76.9 s). AC-I1b: Debug has `SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG`; Release has none. The scheme's TestAction is Debug and ArchiveAction (the TestFlight archive) is Release. A Release simulator build succeeds, and the non-DEBUG path is the unchanged `ConnectionValidator()`. |
| BEH-I2 / REQ-I2 | Readiness waits, generous bounds, both launches configured, same assertions | `launchApp`, `connect`, `tapWhenHittable`, `waitUntil`, `assertFakeMobileLoaded` | Normal speed: 18.9 s and 12.9 s, comparable to the 19.95 s baseline, with no fixed sleeps. Negative checks: marker absent fails (marker assertion, 137 s); no fake server fails (WebView and marker assertions, 255 s). |
| REQ-I3 | Proven in CI without publishing | — | **Not run by implementation**; see "Still Required". |
| REQ-I4 | No regression | — | Release contract check passes. Core tests 21/21. The unchanged `ios-simulator-smoke.sh` passes locally (both UI tests, no skips). Workflow and publish gating are unchanged (no diff). |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `autobyteus-ios/AutoByteusMobile/AppShellCoordinator.swift`
- `autobyteus-ios/AutoByteusMobileUITests/AutoByteusMobileUITests.swift`
- `autobyteus-ios/scripts/fake-mobile-server.py`
- `autobyteus-ios/README.md`
- Unchanged by design: `.github/workflows/release-ios.yml`, `autobyteus-ios/scripts/ios-simulator-smoke.sh`, `AutoByteusMobileCore/ConnectionValidator.swift`.

## Important Assumptions

- **Keyboard focus check.** Readiness uses the `hasKeyboardFocus` element attribute (via predicate) rather than `app.keyboards.firstMatch` as the design suggested. The software keyboard may be absent when the simulator has a hardware keyboard connected, while focus is what `typeText` needs (failure form C: "keyboard focus").
- **Unreachable wait.** It is 90 s rather than "e.g. 30 s", so it can never be shorter than the 60 s override.

## Known Risks

- Unknown slowness forms beyond the three classified could still appear; the 10-run CI series bounds this.
- Failing runs now take longer (up to roughly 4–5 min for this test) because the bounds are generous; passing runs are not slower.
- `hasKeyboardFocus` is an XCUI attribute read through KVC, widely used but not in Apple's public attribute protocol. It worked locally on Xcode 26.1.1 and the iPhone 17 simulator, the same Xcode major the workflow requires.

## Task Design Health Assessment Implementation Check

- Reviewed root cause: environment-sensitive fixed limits (app 5 s check and fixed test waits). Fix as designed: test-environment limits plus readiness waits; no blind retries.
- Refactor decision: `No Refactor Needed` · Implementation matched: `Yes` · Design Impact routed: `N/A`.

### Self-review (direct route)
- Production behavior is unchanged: the Release path is the original `ConnectionValidator()` call.
- The override is bounded (cap 120, positive finite only) and DEBUG-only.
- The restore launch carries the override.
- The same assertions remain, and the negative checks confirm they still fail.
- No workflow change, so publish gating cannot change.

## Legacy / Compatibility Removal Check

- The fixed 10/15/20 s waits and the unconditioned taps and typing were removed. No compatibility mechanisms were added and no shared structures changed. All files are small.

## Persisted Data Transition Check

N/A — no persisted data.

## Environment Or Dependency Notes

- Local Xcode 26.1.1 (17B100), xcodegen, iPhone 17 simulator AED15013-…; the project is regenerated by `scripts/generate-project.sh` and is not tracked.
- Runner scripts used for the local proof: implementation-evidence/run-local-ui-test.sh and run-local-ui-test-custom-server.sh. The custom-server variant was used for the marker-absent negative check, with a /tmp copy of the fake server whose marker text was replaced.

## Local Implementation Checks Run

### IR-002 (after the F-001 fix)

| Check | Result |
| --- | --- |
| No delay, both UI tests | passed: fake-node 20.8 s, unreachable 15.1 s |
| Delay 7 s, fake-node test (AC-I1a) | passed 32.6 s |
| Negative: marker absent (AC-I2) | TEST FAILED at the marker assertion (138.6 s) |
| Simulated lost tap: temporary, uncommitted app patch that swallows the first switch-on | Both tests passed. The log shows the switch tapped, then re-tapped about 32 s later, then Connect. The patch was reverted. |
| Simulated switch that never turns on: temporary, uncommitted patch | Failed first at swift:84 "HTTP acknowledgement switch should be on before Connect", after exactly 3 taps (the real step). XCTest's default `continueAfterFailure` then also runs the 90 s diagnostic wait. The patch was reverted. |

Evidence: implementation-evidence/r2-*-result.txt. The app source is unchanged in IR-002 (`git status` clean apart from the test file before the commit). Core tests, the contract check and the Release build are unaffected because only the UI-test file changed.

### IR-001

Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/ios-release-ui-test-flakiness/tickets/in-progress/ios-release-ui-test-flakiness/implementation-evidence/

| Check | Result |
| --- | --- |
| Before the fix, status delayed 7 s (repo `--status-delay-seconds 7`) | TEST FAILED (WebView + marker assertions), reproducing I11 |
| After the fix, no delay, both UI tests | passed: fake-node 18.9 s, unreachable 12.9 s |
| After the fix, delay 7 s, fake-node test | passed 29.96 s |
| After the fix, delay 30 s, fake-node test | passed 76.9 s (two status checks of 30 s each) |
| Negative: marker absent | TEST FAILED at the marker assertion (137 s) |
| Negative: no fake server | TEST FAILED at the WebView/marker assertions (255 s) |
| Core unit tests (AutoByteusMobileCoreTests) | 21/21 passed |
| `scripts/ios-release-contract-check.py` | passed |
| Unchanged `scripts/ios-simulator-smoke.sh` | passed, both UI tests, no skips |
| Release-configuration simulator build | BUILD SUCCEEDED |

## Frontend Rendered-Result Check (When Applicable)

Not Applicable. The app UI is unchanged; only a Debug launch hook and tests changed. The UI tests themselves exercised the rendered connection screen, WebView and diagnostic.

## Downstream Coverage Hints / Suggested Scenarios

- CI proof (REQ-I3 / AC-I3):
  1. Push `codex/ios-release-ui-test-flakiness`.
  2. Dispatch `gh workflow run release-ios.yml --ref codex/ios-release-ui-test-flakiness -f publish_app_store_connect=false` **sequentially**: wait for each run to finish before the next. The concurrency group `ios-release-<ref>` would cancel extra pending runs.
  3. Require 10 of 10 first-attempt passes.
  4. Confirm `publish-secret-gate` and `upload-testflight` are skipped in each run.
  5. **Never** set publish_app_store_connect=true. The series takes about 10 × 15–20 min of hosted macOS time.
- Optionally inspect each run's xcresult timings to see how slow the host was on passing runs (evidence that slowness was absorbed).

## Open Owner Decision (carry to solution_designer; does not block this fix)

The user has questioned whether AC-I3's 10 sequential CI runs (~2–3 h) are needed. AC-I3 is an approved acceptance criterion, so changing the run count is a requirement change that needs solution_designer and explicit user approval (CRR-001 Residual Risks). Until then, re-validate under the current AC-I3; the CI count restarts at 1 with `8d3cb19ea`.

Optional, not done (scope): setting `continueAfterFailure = false` in the UI tests would stop a test at its first failure instead of also running later bounded waits. That saves up to about 90 s on failing runs but changes how failures are reported.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Push `8d3cb19ea` and restart the CI dispatch series at 1 (AC-I3 as currently approved).
- Independent rerun of the local deterministic proof if desired (the README command, or the evidence runner scripts).
