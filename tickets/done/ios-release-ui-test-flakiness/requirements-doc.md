# iOS release UI-test flakiness — requirements

## Status
- Package ios-release-ui-test-flakiness; revision SR-002; status **Approved** (user, 2026-10-05: "lets try to fix it", U02, after first considering stopping the iOS release).
- Workspace /Users/normy/autobyteus_org/autobyteus-worktrees/ios-release-ui-test-flakiness; branch codex/ios-release-ui-test-flakiness; base origin/personal @ 10fb69504; finalization target origin/personal.
- Evidence: investigation-notes.md I01–I13; probes/ (CI artifacts analysis, deterministic local reproduction).
- Context: the iOS app is not in active use (App Store review requires a test environment the user cannot provide yet, U01). The iOS release stays on tag pushes.

## Problem
The iOS release's simulator smoke UI test fails intermittently on the first attempt and passes on rerun (7 of ~46 first attempts; 6 of 16 since 2026-10-01). Every failure is a fixed time limit losing against a slow GitHub-hosted simulator:
- (A) the app's 5 s connection check times out → "node unreachable" screen instead of the WebView (5 of 7; reproduced deterministically locally);
- (B) the page marker appears in the WebView accessibility tree after the test's 20 s wait (1 of 7);
- (C) typing fails because keyboard focus was not ready (1 of 7).

## Behavior
| ID | Current | Desired | Preserved |
|---|---|---|---|
| BEH-I1 | A slow simulator makes the app's 5 s status check time out in UI tests | In the UI-test environment the app's connection check allows enough time (test-configured), so slowness does not fail the test | Production default connection timeout (5 s) and diagnostics unchanged |
| BEH-I2 | Test waits are fixed at 10–20 s and taps/typing do not wait for readiness | The test waits for readiness (elements hittable, keyboard focused) with generous upper bounds; it still finishes as soon as the UI is ready | The test still asserts the same outcomes: WebView with the fake marker, restore after relaunch, unreachable diagnostic |

## Requirements and acceptance
| REQ | Outcome | Acceptance |
|---|---|---|
| REQ-I1 | The UI-test environment can raise the app's connection-check timeout; production builds keep 5 s. | AC-I1a: local deterministic test — fake server delaying the status response by 7 s: before the fix, test fails (reproduced, I11); after the fix, test passes. AC-I1b: a Release build ignores the override (code-level: override compiled only for DEBUG, or equivalent proof). |
| REQ-I2 | The smoke UI tests wait robustly for readiness: input, switch and button hittable; keyboard focus before typing; WebView and marker with generous timeouts; both launches (open and restore) get the test configuration. | AC-I2: local runs pass at normal speed with no added fixed sleeps; the tests still fail when the fake server is unreachable or the marker is absent (negative check). |
| REQ-I3 | Proven in CI without publishing. | AC-I3: 10 consecutive manual dispatches of release-ios.yml on the fix branch with publish_app_store_connect=false all pass on the first attempt (if unfixed, at the recent ~37% failure rate this is ~1% likely), with no publish job running. |
| REQ-I4 | No regression: core tests, release contract check, the unreachable-diagnostic test and the publish path unchanged. | AC-I4: release-contract check and core tests pass; workflow publish gating unchanged. |

## Out of scope
Changing the production connection timeout or diagnostics; App Store submission; switching runners; adding blind job-level retries.
