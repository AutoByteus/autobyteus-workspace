# Design Spec — iOS release UI-test flakiness fix

## Solution And Approval Basis
Package ios-release-ui-test-flakiness, SR-002; requirements approved (U02): REQ-I1–I4. Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/ios-release-ui-test-flakiness, branch codex/ios-release-ui-test-flakiness, base origin/personal @ 10fb69504, finalization target origin/personal. Evidence: investigation-notes.md I01–I13.

## Current-State Read
AppShellCoordinator creates `ConnectionValidator()` with a fixed 5 s timeout. The UI test (autobyteus-ios/AutoByteusMobileUITests/AutoByteusMobileUITests.swift) uses fixed 10–20 s waits, taps the switch/button without waiting, and types immediately after tapping. On slow hosted simulators these limits are exceeded (I10). Reproduced locally with a delayed fake server (I11).

## Task Size And Architectural Risk (Mandatory)
- task_size: **Small** — one app coordinator change (test-only override), UI test robustness changes, an optional fake-server delay flag for regression testing, and a doc note.
- architectural_risk: **Low** — no production behavior change (5 s default kept; override DEBUG-only), no workflow logic change, no data/contract change. CI proof uses the existing non-publishing dispatch path (I13).
- Escalation trigger: High if the fix requires changing workflow publish gating, the production timeout, or runner selection.

## Architecture Investigation Evidence
I03 (workflow, smoke script, fake server), I05–I06 (image/code ruled out), I07–I11 (mechanism, classification, local reproduction), I12 (fix surface), I13 (safe dispatch and concurrency).

## Intended Change
1. App (test hook): in DEBUG builds, AppShellCoordinator reads launch environment `AUTOBYTEUS_CONNECTION_TIMEOUT_SECONDS` (positive number, capped e.g. at 120) and passes it to `ConnectionValidator(timeoutSeconds:)`; absent/invalid → default 5 s. Release builds compile without the override.
2. UI tests: one launch helper that sets `AUTOBYTEUS_CONNECTION_TIMEOUT_SECONDS` (e.g. 60) on every launch, including the restore launch (plus RESET on the first). `connect()` waits for the input to exist and be hittable, taps, waits for keyboard focus (e.g. `app.keyboards.firstMatch.waitForExistence`) before `typeText`, and waits for the switch and button to be hittable before tapping. WebView and marker waits are raised to generous bounds (e.g. 60 s), as is the unreachable diagnostic (e.g. 30 s). No fixed sleeps.
3. Fake server: optional `--status-delay-seconds` (default 0) for deterministic local regression of form (A); CI keeps the default (no delay).
4. Docs: autobyteus-ios/README.md (or docs/ios_mobile_access.md) notes the test override and the local delayed-server regression command.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior | Path |
|---|---|
| BEH-I1 | XCUIApplication.launchEnvironment → AppShellCoordinator.init (DEBUG) → ConnectionValidator(timeoutSeconds:) → URLSession config |
| BEH-I2 | AutoByteusMobileUITests launch helper / connect() / assertFakeMobileLoaded |
| Production | Release build → AppShellCoordinator → ConnectionValidator() default 5 s (unchanged) |

## Relevant Supplemental Task Artifacts
probes/local-repro/ (run-local-ui-test.sh, fake-mobile-server-delay.py, baseline/delay7 results and screen), probes/beta5-attempt1-failure-screen.png, probes/ci-launch-timings.txt, probes/timing.py, probes/delays.py.

## Task Design Health Assessment (Mandatory)
Root cause: environment-sensitive fixed limits in a UI smoke test (app-side 5 s network timeout and test-side fixed waits). Fix: make the limits appropriate to the test environment while keeping the same assertions; do not retry jobs blindly.

## Terminology
Override: the DEBUG-only launch-environment connection timeout for UI tests.

## Design Reading Order
App override → UI test helpers → fake server flag → docs → local proof → CI proof.

## Legacy Removal Policy (Mandatory)
Remove the fixed short waits; no compatibility retained.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)
N/A — no persisted data. Migration-conventions investigation N/A.

## Data-Flow Spine Inventory
Launch environment → coordinator → validator → URLSession; test → XCUI queries.

## Primary Execution Spine(s)
UI test launch → app start → connection screen → Connect → status check → WebView with /mobile → marker → terminate → relaunch → saved node restore → marker.

## Spine Narratives (Mandatory)
Slow host: the status check takes up to tens of seconds; with the 60 s test override the check succeeds; the test waits until the WebView and marker appear (bounded). Unreachable test: port 9 refuses quickly, so the diagnostic appears regardless of the larger timeout.

## Spine Actors / Main-Line Nodes
AppShellCoordinator, ConnectionValidator (unchanged API), AutoByteusMobileUITests, fake-mobile-server.py.

## Ownership Map
Coordinator owns reading the override; the UI test owns readiness waits; the smoke script and workflow stay unchanged.

## Thin Entry Facades / Public Wrappers (If Applicable)
N/A.

## Removal / Decommission Plan (Mandatory)
None.

## Return Or Event Spine(s) (If Applicable)
N/A.

## Bounded Local / Internal Spines (If Applicable)
N/A.

## Off-Spine Concerns Around The Spine
None.

## Ownership Boundaries
App core (ConnectionValidator) untouched; only the app shell reads the test override.

## Boundary Encapsulation Map
The override key is private to the coordinator and the UI tests.

## Dependency Rules
No new dependencies.

## Interface Boundary Mapping
`AUTOBYTEUS_CONNECTION_TIMEOUT_SECONDS` (launch environment, DEBUG only); fake server `--status-delay-seconds`.

## Interface Boundary Check
ConnectionValidator already accepts timeoutSeconds.

## Main Domain Subject Naming Check
OK.

## Existing Capability / Subsystem Reuse Check
Reuses the launch-environment test hook pattern (AUTOBYTEUS_RESET_SAVED_NODES) and the ConnectionValidator timeout parameter.

## Subsystem / Capability-Area Allocation
autobyteus-ios app shell, UI tests and scripts.

## Draft File Responsibility Mapping
See final mapping.

## Reusable Owned Structures Check
N/A.

## Shared Structure / Data Model Tightness Check
N/A.

## Final File Responsibility Mapping
| File | Change |
|---|---|
| autobyteus-ios/AutoByteusMobile/AppShellCoordinator.swift | DEBUG-only timeout override → ConnectionValidator(timeoutSeconds:) |
| autobyteus-ios/AutoByteusMobileUITests/AutoByteusMobileUITests.swift | launch helper with the override on every launch; readiness waits; generous bounded waits |
| autobyteus-ios/scripts/fake-mobile-server.py | optional `--status-delay-seconds` |
| autobyteus-ios/README.md (and/or docs/ios_mobile_access.md) | document the override and the local regression command |
| .github/workflows/release-ios.yml, ios-simulator-smoke.sh | unchanged |

## Applied Patterns (If Any)
Test-only launch-environment hook; readiness-based waits.

## Target Subsystem / Folder / File Mapping
As above.

## Folder Boundary Check
All within autobyteus-ios (+ docs).

## Concrete Examples / Shape Guidance (Mandatory When Needed)
Local proof command (adapt probes/local-repro/run-local-ui-test.sh to use the repo fake server with `--status-delay-seconds 7`): before the fix → TEST FAILED (I11); after → TEST SUCCEEDED. Also a 30 s delay should pass with a 60 s override.

## Backward-Compatibility Rejection Log (Mandatory)
No job-level auto-retry; no production timeout change; no runner pinning (the image did not change).

## Derived Layering (If Useful)
N/A.

## Change / Refactor Sequence
1. Fake server flag; reproduce the failure locally with it. 2. App override (DEBUG). 3. UI test helpers and waits. 4. Local proof: delay 0, 7 and 30 s pass; unreachable test passes; negative check (marker removed → fails). 5. Core tests and the release contract check. 6. Docs. 7. CI proof: 10 sequential `gh workflow run release-ios.yml --ref codex/ios-release-ui-test-flakiness -f publish_app_store_connect=false` runs; all first-attempt passes; confirm publish jobs skipped.

## Key Tradeoffs
Test-environment timeout override vs raising the production timeout: chosen to keep product behavior unchanged while the app is not in use (a production change can be decided separately). Generous waits lengthen only failing/slow cases.

## Risks
- Other unknown slowness forms could still appear; the 10-run CI proof bounds this risk.
- CI proof takes ~10 × 15–20 min of hosted macOS time (sequential, due to the concurrency group).
- Manual dispatch must never set publish_app_store_connect=true.

## Guidance For Implementation
Keep the override DEBUG-only and bounded. Apply the test configuration to the restore launch too. Prove locally first with the delayed fake server; leave the CI proof series to validation if preferred.
