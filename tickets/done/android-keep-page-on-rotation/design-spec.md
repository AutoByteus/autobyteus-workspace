# Design Spec — Android app keeps its page when the phone rotates

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements: `requirements-doc.md` SR-001 (Solution Designer within the Task's direction; user informed)
- User approval of the design: `Not required`
- Design status: `Ready`
- Investigation: `investigation-notes.md` AR-01 … AR-05
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, root `DESIGN.md`, `TESTING.md`
- Conflicts: none

## Current-State Read

`MainActivity` is the only activity of the shell. It builds the native connection screen or the web shell (`WebShellScreen.render` around one `AutoByteusWebView`) in code. It declares no configuration changes, so a rotation destroys it and `onCreate` opens the saved node's `/mobile` URL again (AR-01). Insets are applied by a listener on the shell root (AR-02).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small` — one manifest attribute, one unit test, emulator evidence, a line in the Android docs.
- Architectural risk: `Low` — no new owner, contract, permission or persistence; the platform's standard way to keep an activity across these changes.
- Escalation trigger: the reproduction does not show the reload (premise wrong); a native screen that needs rebuilding on rotation.

## Intended Change

`.MainActivity` handles rotation, window-size, keyboard and navigation changes itself (`android:configChanges="orientation|screenSize|screenLayout|smallestScreenSize|keyboard|keyboardHidden|navigation"`). The activity, its WebView and its page survive; views re-lay out; the insets listener re-applies insets. No `onConfigurationChanged` override is needed: the native screens are code-built layouts that measure to the new size.

## Change Scope (Mandatory)

- In scope: UC-001. `autobyteus-android/app/src/main/AndroidManifest.xml`; a unit test under `autobyteus-android/app/src/test/java/org/autobyteus/mobile/` that reads the source manifest and asserts the attribute on `.MainActivity` (AC-004); the Android docs (`docs/android_mobile_access.md` or `autobyteus-android/README.md`, wherever the shell behavior is documented) — one line: the app keeps its page across rotation and window-size changes.
- Derived consumers: N/A.
- Deliberately left alone: `uiMode`/`locale`/`fontScale`/`density` (DEC-001), process-death restore (FU-001), iOS, the web app.
- Follow-ups: FU-001 (`follow-ups.md`).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ / AC | Trigger | Existing | Change |
| --- | --- | --- | --- | --- |
| BEH-001/002 | REQ-001; AC-001, 002, 004 | Rotation, resize, keyboard | Recreate + reload | Activity kept; `onConfigurationChanged` default; views re-lay out |
| BEH-003 | REQ-002; AC-003 | Same | Insets on root | Listener re-dispatched with new insets |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`. Current design issue: `No` structural issue — a missing platform declaration (`Missing Invariant`). Refactor needed now: `No`. Triggers checked: Several kinds or forms (rotation, window resize, keyboard — all declared together; dark mode etc. deliberately left recreating, DEC-001).

## Legacy Removal Policy / Persisted Data

- No legacy path; `Not Affected`.

## Data-Flow Spine Inventory / Primary Execution Spine

| Spine | Path |
| --- | --- |
| DS-001 | `rotation → Android delivers onConfigurationChanged to MainActivity (no recreate) → view tree re-measured → WebView resizes, page reflows (window resize event) → insets listener re-pads the root` |

## Removal / Decommission Plan (Mandatory)

None (nothing becomes unnecessary).

## File Mapping

| File | Change |
| --- | --- |
| `autobyteus-android/app/src/main/AndroidManifest.xml` | `android:configChanges` on `.MainActivity` |
| `autobyteus-android/app/src/test/java/org/autobyteus/mobile/MainActivityManifestTest.kt` (name at implementation's choice) | Asserts the attribute (AC-004) |
| Android docs | One line |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Keep recreation and restore WebView state | Rejected (DEC-002) |

## Validation Plan

- First: reproduce the reload on `autobyteus277_api35` before the change (investigation, Reproduction To Hand Over); if it does not reproduce, return `Unclear`.
- After: same steps keep the screen (AC-001); connection input kept (AC-002); landscape/portrait insets on a cutout AVD (AC-003); unit test (AC-004); `gradle :app:assembleDebug` and existing unit tests; no new permission (AC-005). Isolated node only; screenshots of test data only.

## Guidance For Implementation

- Isolated test node only (loopback-published container, test data); remove it afterwards. Never use the user's phone or nodes.
