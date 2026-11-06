# Requirements Document — Android app keeps its page when the phone rotates

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `android-keep-page-on-rotation`
- Request / ticket: Project Task `autobyteus-415` (prerequisite PRE-001 of autobyteus-407, S3)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-11-06
- Approved by and reference: `Solution Designer within the direction (user informed)` — the Task sets the outcome ("rotating the phone keeps the current page on every screen"); the details below stay within it; the user is informed in the Solution Designer conversation.

## Problem And Desired Outcome

- Problem: the AutoByteus Android app reloads its page on every rotation and returns to the run list, on any screen (investigation AR-01). A user loses where he was, and the planned phone desktop view (S3) cannot be used in landscape.
- Desired outcome: rotating the phone (and other window-size changes such as split screen or a foldable unfolding, or attaching a hardware keyboard) keeps the current page, its route and its state; the page only re-lays out; the system-bar and cutout insets still keep the page clear in both orientations.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Rotation recreates `MainActivity`; `onCreate` reopens the saved node's `/mobile` URL in a new WebView → run list, page reloaded | Rotation keeps the same WebView and page; layout adapts | Start-up path (open the saved node on launch), pairing, file chooser, QR scan, connection screen | AR-01 |
| BEH-002 | User | SCN-002 | Connection screen input is lost on rotation | Kept | — | AR-01 |
| BEH-003 | System | SCN-001 | Insets (autobyteus-277) padded on the shell root | Re-applied for the new orientation (left/right cutout in landscape) | Yes | AR-02 |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Rotate (or resize the window of) the phone app on any screen | SCN-001, SCN-002 |

### Out Of Scope

- Restoring the page after Android kills the app in the background (process death) — follow-up FU-001.
- Dark-mode, language, font-size or density changes (they still recreate the screen, so native screens restyle).
- iOS. The phone desktop view itself (autobyteus-407).

### Non-Goals

- Locking or forcing an orientation.

### Preserved Behavior Boundary

- BEH-001 preserved list; no new Android permission; no change to the web app.

### Prerequisites

None.

### Review Authority

- Every blocking finding cites a REQ, AC or preserved-behavior ID here.

## Requirements

| Requirement ID | Requirement | Behaviors | Priority | Rationale | Feasibility Evidence | Source |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | Rotating the phone, a window-size change (split screen, foldable) or attaching/detaching a hardware keyboard keeps the current page, its route and its state on every screen of the app; nothing reloads | BEH-001, BEH-002 | Must | Task | Android platform: an activity that declares these changes in `android:configChanges` is not recreated and receives `onConfigurationChanged` instead | Task autobyteus-415 |
| REQ-002 | After a rotation the page is laid out for the new size and stays clear of the status bar, navigation bar, display cutout and keyboard | BEH-003 | Must | autobyteus-277 REQ-011 preserved | Read: insets listener is re-dispatched when insets change | Task ("insets still correct") |
| REQ-003 | No new Android permission; launch, pairing, QR scan, file chooser and the connection screen behave as before | — | Must | Task constraint | N/A | Task |

## Acceptance Criteria

| AC ID | REQ | Scenario | Trigger | Expected Outcome | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | Emulator, app paired with an isolated node, a screen other than the run list open (e.g. a run's Files view), `adb emu rotate` | **Before the fix:** back on the run list, the node sees a second `GET /mobile/`. **After:** same screen and route, no second load | Emulator before/after evidence (screen/route check, node access log) |
| AC-002 | REQ-001 | SCN-002 | Connection screen with typed input, rotate | Input kept | Emulator |
| AC-003 | REQ-002 | SCN-001 | Rotate to landscape and back on a run screen | Bars, composer and content clear of status/navigation bars and the cutout in both orientations | Emulator (cutout-capable AVD) screenshots of test data |
| AC-004 | REQ-001 | — | The manifest | `.MainActivity` declares `orientation|screenSize|screenLayout|smallestScreenSize|keyboard|keyboardHidden|navigation` in `android:configChanges` | Unit test on the manifest |
| AC-005 | REQ-003 | — | Build | No new `<uses-permission>`; existing Android tests pass | Build + tests |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Steps | Expected Outcome | Validity |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Phone user | Keep working while turning the phone | Rotation / window resize on any screen | Turn the phone | Same page, re-laid out | Supported Normal Scenario |
| SCN-002 | User | Phone user | Not lose typed connection input | Rotation on the connection screen | Type, turn | Input kept | Supported Normal Scenario |

## UI, Interaction, And Experience Requirements

- Applicable: `No` beyond keeping the page. Product design: N/A — not applicable.

## Data Continuity And Acceptable Loss

- Persisted data affected: `No`.

## Decisions

| Decision ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Which configuration changes to handle in the activity? | Rotation and every window-size change (`orientation`, `screenSize`, `screenLayout`, `smallestScreenSize`), hardware keyboard and navigation (`keyboard`, `keyboardHidden`, `navigation`): the WebView re-lays out by itself and the native screens are simple layouts. Not `uiMode`/`locale`/`fontScale`/`density`: those need the native screens rebuilt to restyle and are rare. **Decide as listed** | Solution Designer | Decided |
| DEC-002 | Save and restore WebView state instead? | `WebView.saveState` restores history but not the page's live state (open streams, typed text), and the app would still re-run `onCreate`'s open path. **Use `configChanges`** | Solution Designer | Decided |

## Traceability

| REQ | ACs | Scenarios |
| --- | --- | --- |
| REQ-001 | AC-001, AC-002, AC-004 | SCN-001, SCN-002 |
| REQ-002 | AC-003 | SCN-001 |
| REQ-003 | AC-005 | — |

## Readiness Check

- Content ready: `Yes`. Approval: within the direction, user informed. Ready for design: `Yes`.
