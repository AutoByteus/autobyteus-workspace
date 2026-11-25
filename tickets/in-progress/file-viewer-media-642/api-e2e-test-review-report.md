# API/E2E Test Review Report

## Review Meta

- Review Round: 1
- Trigger: API/E2E round 2 (API-REV-002, commit `37aafd3eda`) Pass on IR-006. The durable test changes are:
  - `8dc9abb9f6` (round 1);
  - `216bc68baf`: implementation's fix of the scrubber query in API/E2E's file;
  - `37aafd3eda` (round 2).
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-003; REQ-001…004, AC-001…004, DEC-001…008)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001…SR-006)
- Design Spec Reviewed As Context: `design-spec.md` (SR-006)
- Supplemental Task Artifacts Reviewed As Context: none
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (to ARCH-REV-006)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-001…IR-006)
- Original Code Review Report: `code-review-report.md` (CRR-007 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-008`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001 Fail, API-REV-002 Pass)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass (round 2)
- Final Validation Confidence: 93.4%
- Prior unresolved test-review findings rechecked: none (first test review)
- Project testing guideline(s) applied: TESTING.md as the coverage investigation applies it:
  - each agent uses its own devices;
  - the runtime is the fake `antigravity_cli` fixture, with no provider key;
  - the pairing link goes only to a mode-600 secrets file;
  - Rule 9 (a test targets the real control).

  No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`. The tests cover UC-001…UC-004 and CR-001…CR-003's regressions.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-ios/AutoByteusMobileUITests/NativeMediaRealNodeUITests.swift` | Added (`8dc9abb9f6`), updated (`216bc68baf`, `37aafd3eda`) | AC-001 (references in the app), AC-002 (iOS audio: start, reopen, slower-link seek), CR-002, DEC-007 (ways to leave), D-7 | The iOS audio and reference journeys on a real node, 10 cases in name order on one stack (the pairing link is one-time) | Skipped without the stack. The smoke script skips the class with its reason |
| `autobyteus-web/tests/e2e/mobile-file-viewer-media-cases.mjs` (+ registration in `mobile-shell-probe.mjs`) | Added | AC-003 (MSP-111), AC-004 (MSP-112 Monaco, MSP-113 Prism fences on desktop and phone), AC-001 desktop (MSP-114) | The desktop layout, highlighting and reference media cases of the phone/desktop probe | Registered like the other case files; it shares the probe's stack |
| `autobyteus-web/tests/e2e/native-video-node.mjs` | Updated | AC-001, AC-002 | The stack gains audio (MP3, M4A, Ogg, WebM), a Team whose lead's message references media and other types (an empty file and a deleted one included), `POST /team-message` and `POST /touch?file=` | Test data only; the deleted reference is removed after the message is stored |
| `autobyteus-ios/scripts/ios-simulator-smoke.sh`, `autobyteus-ios/README.md` | Updated | — | Skip the new class; document how to run it | — |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | One class per surface; the names state the journey; the `test0…`/`testZ…` order is stated |
| Assertions prove approved requirements instead of incidental details | Pass | See the list below |
| Fixtures, setup, helpers reuse meaningful repetition | Pass | `scrubber`, `elapsedSeconds`, `fileRequests`, `openTheRun`/`openTheTeam`, `control`; the stack's controls are reused from 574 |
| Test isolation and determinism | Pass | A fresh stack and data root, the test's own simulator, `/touch` for uncached versions, and latency and throttle reset in a `defer`. Round 2 passed 10/10 on a fresh stack |
| Large files coherent | Pass | 400 and 337 lines, each one subject |
| No stale, duplicated or compatibility-only tests | Pass | — |
| Coverage agrees with the investigation and evidence | Pass | IOS-A…IOS-H, R2 and MSP-111…114 map to these cases |
| Test callers exercise an independently established supported scenario | Pass | Pairing by link, the run's file links, the Files menu, a real Team `send_message_to` with `reference_files`, AVKit's own controls |
| Each test enters through its scenario's real trigger | Pass | Taps and AVKit's scrubber. Since `216bc68baf` the scrubber is the slider whose identifier is "Current position", not AVKit's volume slider, which round 1's query had matched (Rule 9) |

What the key assertions prove:
- **`testC…` (the seek):** after the seek, a ranged request starting at or past 40% of the file carries the header. At 60 KB/s the stream from 0 cannot get that far in the 3 s window, so this proves a seek read. It is red on IR-005's loader.
- **`testA…` (the start):** the start is measured from the real scrubber (under 2 s), with the credential in the header only and at most 4 requests.
- **`testE…`:** one player while messages arrive, and none after Back (CR-002).
- **`testH…`:** Back and AVKit's Close close the player; a swipe-down does not (`.fullScreen`).
- **MSP-111:** the layout is measured in pixels.
- **MSP-112 and MSP-113:** token classes or spans are counted per type.

## Findings

None that need action.

Non-blocking notes:
- **T-1:** `native-video-node.mjs` rebuilds a reference's ID with the server's rule (SHA-256 of `<messageId>\0<path>`) to find its content URL. If that rule changes, the stack fails loudly (404s) rather than silently. Reading the ID from the view or the API, if one exposes it, would remove the duplicate.
- **T-2:** two checks depend on the simulator's English locale:
  - `elapsedSeconds` reads the first token of AVKit's accessibility value ("17 seconds elapsed, …");
  - `testF…` matches "Reference file unavailable".

  This is acceptable for a test that runs on the test's own simulator; it would only matter on a non-English one.
- **Evidence scan:** I scanned the committed `evidence/` for `mra_…`, `Bearer …` and `pairing=`/`code=`/`token=` values. None were found, and no secrets file is tracked.

## Follow-ups

- Follow-ups this review added: None

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed:
  - `NativeMediaRealNodeUITests.swift`;
  - `mobile-file-viewer-media-cases.mjs` and its `mobile-shell-probe.mjs` registration;
  - `native-video-node.mjs`;
  - `ios-simulator-smoke.sh`;
  - the iOS README.
- Unresolved finding IDs: None (T-1 and T-2 are notes)
- Recommended Recipient: `/delivery_engineer`
- Notes for delivery:
  - **C-6:** 642 renames the cache folder and the bridge (`playMedia`, `mediaPlayer`) on the premise that 574 is unreleased. Ship 574 and 642 in the same release.
  - **Before release, on a physical iPhone (DEC-007):** the sound, the Ring/Silent switch and a lock.
  - **Held:** a zero-byte media reference answers its probe with 416 (an error state), and the iOS Back bar sits over AVKit's top buttons.
  - **Docs updated in the change:**
    - NA-8 (`node_access_model.md`);
    - `remote_access.md`, `file_explorer.md`, `agent_artifacts.md`;
    - `android_mobile_access.md`, `ios_mobile_access.md`;
    - `design-cases.md`.
  - **Build inputs:** no Gradle file, `project.yml`, `package.json` or tsconfig changed.
