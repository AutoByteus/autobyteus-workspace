# API/E2E Coverage Investigation — iOS release UI-test flakiness

## Investigation Meta

- Ticket folder: /Users/normy/autobyteus_org/autobyteus-worktrees/ios-release-ui-test-flakiness/tickets/in-progress/ios-release-ui-test-flakiness/
- Requirements: requirements-doc.md (SR-002, Approved, U02). Investigation notes: investigation-notes.md (I01–I13). Solution revision record: solution-revision-record.md. Design: design-spec.md. Supplements: probes/, implementation-evidence/, solution-handoff.md.
- Implementation: implementation-handoff.md, implementation-revision-record.md (IR-001, commit c314aa98c, local only at handoff).
- Design review / architecture review / code review: `N/A — not applicable` (direct route).
- API/E2E: revision record api-e2e-revision-record.md; ledger api-e2e-test-case-ledger.md; revision `API-REV-001`; round 1.

## Routing Classification

Small / Low; direct low-risk → delivery; test-code review `Not Required — direct low-risk route`.

## Requirement Basis

- REQ-I1: a Debug UI-test override raises the app's connection-check timeout; Release keeps 5 s.
- REQ-I2: readiness waits; both launches configured; same assertions; negatives still fail.
- REQ-I3 / AC-I3: 10 consecutive manual dispatches of release-ios.yml on the fix branch, `publish_app_store_connect=false`, all passing on attempt 1, with no publish job running.
- REQ-I4: core tests, release contract, unreachable diagnostic and publish gating unchanged.

## Scenarios And Real Usage

The real trigger is the release workflow's Build And Test job on GitHub-hosted macOS simulators (tag push or manual dispatch). AC-I3 uses the manual dispatch path with publish disabled (I13). Local deterministic slow-host emulation uses the repo fake server's new `--status-delay-seconds` (form A). Forms B (late marker) and C (keyboard focus) can only be exercised by real slow hosts in CI.

## Boundaries

| Surface | Affected | Evidence |
| --- | --- | --- |
| App connection check (Debug only) | Yes | local delay runs; build-settings check |
| UI tests (readiness waits) | Yes | local runs; CI series |
| Fake server script | Yes (local flag only) | CI does not pass it |
| Workflow / publish gating / production timeout | No (no diff) | verified gating lines 286/346 `publish_requested == 'true'`; branch push triggers no workflow (all `on: push: tags v*` + dispatch) |

## Project Execution Discovery

- TESTING.md (root) has no iOS row. Instructions used: autobyteus-ios/README.md (updated by this change), scripts/ios-simulator-smoke.sh, scripts/generate-project.sh, .github/workflows/release-ios.yml.
- Local: Xcode 26.1.1, xcodegen, an iPhone 17 simulator. CI: macos-latest (macos-26-arm64 image), gh CLI authenticated (ryan-zheng-teki); repo AutoByteus/autobyteus-workspace; default branch personal.
- Safety: push only the feature branch (no tags; a `v*` tag would start real releases). Dispatch with `publish_app_store_connect=false` only, sequentially (concurrency group `ios-release-<ref>` cancels extra pending runs). Verify per run that publish-secret-gate and upload-testflight are skipped.

## Build-configuration proof (AC-I1b)

`xcodebuild -showBuildSettings`: Debug `SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG`; Release: none. Scheme: TestAction Debug, ArchiveAction Release (the TestFlight archive). The override code is inside `#if DEBUG`; the non-DEBUG path is the unchanged `ConnectionValidator()`.

## Existing Coverage Inventory

| Path | Validity | Action |
| --- | --- | --- |
| AutoByteusMobileUITests (fake-node open/restore; unreachable diagnostic) | Updated by the implementation (same assertions) | local + CI |
| AutoByteusMobileCoreTests (21) | Still Valid | run |
| scripts/ios-release-contract-check.py | Still Valid | run |

## Durable Coverage Changes Planned

None beyond the implementation's test changes; validation is execution (local reruns plus the CI series).

## Execution Plan

1. Independent local reruns: delay 7 s fails on the base app/tests and passes on the fix; normal speed passes; negative check (no server) still fails.
2. Core tests and release contract check.
3. CI series: push the branch; 10 sequential dispatches; per run record attempt, conclusion, test duration, and skipped publish jobs.

## Ledger

`Yes` (10 long CI runs). Path: api-e2e-test-case-ledger.md.

## Broader Validation Decision

`Required` — the CI series is the approved proof (AC-I3); local emulation covers only form A.

## Not Tested

Forms B and C cannot be induced locally. Covered by readiness waits and the CI series.

## Decision

Proceed `Yes`; reroute `No`.
