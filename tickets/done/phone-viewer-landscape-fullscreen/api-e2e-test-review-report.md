# API/E2E Test Review Report — phone VNC Viewer: full screen in landscape (autobyteus-432)

## Review Meta

- Review Round: `1`
- Trigger: API/E2E Pass (API-REV-001, commit `e099b21515`), with one added durable test
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-003)
- Investigation Notes / Solution Revision Record / Design Spec: not reopened; unchanged since CRR-001
- Supplemental Task Artifacts Reviewed As Context: none
- Architecture Review Revision Record Reviewed As Context: N/A for this entry point
- Implementation Revision Record Reviewed As Context: IR-002 (unchanged)
- Original Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass`
- Final Validation Confidence: 95% (as reported by API/E2E)
- Prior unresolved test-review findings rechecked: None (first test review). CRR-001's held candidate CR-C-06 (Clipboard "copy from the desktop" empty after `xclip`) is resolved by API-08: a copy made inside Chromium on the node reaches the sheet in full screen and in portrait. The empty result came from copying with `xclip` from a shell.
- Project testing guideline(s) applied: root `TESTING.md` and `autobyteus-android/README.md`, as the coverage investigation records them. No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001, SCN-002; unchanged)

## Changed Durable Test Scope

`git diff --name-only d76be54fb0 e099b21515` outside `tickets/`: one added file.

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-android/app/src/androidTest/java/org/autobyteus/mobile/DesktopFullScreenWindowTest.kt` | Added | SCN-001; REQ-001, REQ-002 (AC-001/002 at the window level) | What Android does with the controller's calls on a real `MainActivity` window: orientation, bar visibility through root insets, root background, the same activity | Complements the JVM controller test, which uses a fake `Display`. Mutation-checked: fails without `bars.hide` (M1) and without the landscape request (M2) (`evidence/API-12-durable-window-test.txt`). |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | One test, `fullScreenTurnsToLandscapeAndHidesTheBarsAndOffGivesBothBack`; the doc comment states its boundary relative to the JVM test |
| Assertions prove approved requirements | Pass | Real configuration orientation (landscape, then the earlier one), root-inset visibility of status and navigation bars, `SENSOR_LANDSCAPE` → `UNSPECIFIED`, the same activity instance (415), root colour darkened and given back. Each `awaitWindow` names what it waits for. |
| Fixtures, setup and helpers reuse meaningful repetition | Pass | `SavedNodeStore.clear()` in `@Before`, the same setup as `MainActivityConfigurationChangeTest`; small local helpers (`barsVisible`, `rootColor`, `awaitWindow`) |
| Isolation and determinism | Pass | Polls with a 10 s deadline instead of fixed sleeps; `barsVisible` returns `null` (not met) while status and navigation disagree. The start screen makes no network call. 1/1 alone and 12/12 in the suite on API 35. |
| Large files coherent | N/A | 100 lines |
| No stale/duplicated/disabled/compat-only tests | Pass | — |
| Coverage changes agree with investigation and execution evidence | Pass | Added to close the "durable coverage of real window behavior" gap named at scoring |
| Test callers exercise an independently established scenario | Pass | REQ-001/002 through the controller's production adapter (`forActivity`). The page→bridge leg is covered by the JVM bridge tests and the emulator runs. |
| Each test enters through its scenario's real trigger | Pass | At its stated boundary (the window). It uses its own `forActivity` controller instead of the activity's, which is equivalent because "on" is read from the window. |

Non-blocking observations:
- `if (rootColorBefore != null)` skips the darkening assertion when the root has no plain colour, which is the controller's defined behavior. The start screen does have one (`rgb(248,250,252)` in the evidence), so the check runs. If that screen ever lost its colour, the check would be skipped silently rather than fail.
- The test assumes the device starts in portrait, as its doc comment states. In landscape the first orientation wait would pass trivially, while the `requestedOrientation` assertions would still check the request.

## Findings

None.

## Follow-ups

- Follow-ups this review added: None. API/E2E added FU-002 (the viewer is not restored after process death: the restored `/mobile/?screen=desktop&full=1` names no run, so the page drops to Home) and FU-003 (in landscape full screen the keyboard covers the Clipboard sheet's Send). Both are recorded in `follow-ups.md`; the Solution Designer sends them.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `autobyteus-android/app/src/androidTest/java/org/autobyteus/mobile/DesktopFullScreenWindowTest.kt`
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: Android's one-time "Viewing full screen" hint holds focus until Got it (the back gesture still exits). It is Android's own behavior, recorded by API/E2E.
