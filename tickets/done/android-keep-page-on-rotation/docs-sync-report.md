# Docs Sync Report

## Scope

- Ticket: `android-keep-page-on-rotation` (Project Task autobyteus-415, prerequisite of autobyteus-407)
- Trigger: API/E2E Pass (API-REV-001, direct low-risk route)
- Bootstrap base reference: `origin/personal` `3bf9240d42`
- Integrated base reference used for docs sync: `origin/personal` `3bf9240d42` (already current)
- Post-integration verification reference: not needed (already current); see the release/deployment report

## Why Docs Were Updated

- Summary: `MainActivity` now handles rotation, window-size changes and keyboard changes itself (`android:configChanges`), so the open page survives them. The implementation added this to the Android README's feature list. Delivery added the command that runs the instrumented tests, which the ticket's new durable test needs. The README only compiled those tests. API/E2E found that the 12 existing instrumented tests had never been run, and that no CI job runs them.
- Why this should live in long-lived project docs: a later Android change needs to know that the open page is kept, and how to run the instrumented test that guards it.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-android/README.md` | Feature list, checks | Updated (feature line by implementation; checks by delivery) | Feature line matches the manifest (`0xdf0`, seven values) and DEC-001 (dark mode, language and font size still recreate) |
| `docs/android_mobile_access.md` | Real-device checklist | No change | Pairing and recovery steps are unchanged; rotation needs no user step |
| `TESTING.md` | Testing rules | No change | No Android-specific rule changed; the instrumented-test command is package-level and lives in the Android README |
| `DESIGN.md` | Design rules | No change | — |
| `RELEASE.md` | Release guide | No change | Android ships through the existing Android APK Release workflow |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-android/README.md` | Feature line (implementation) | Keeping the open page across rotation, window-size changes and a hardware keyboard | Describes the new behavior and its boundary |
| `autobyteus-android/README.md` | Command (delivery) | `./gradlew :app:connectedDebugAndroidTest` under "Implementation-scoped checks", with the four instrumented test classes; no CI job runs them | The ticket's durable test is instrumented; the README only compiled those tests |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Configuration changes | Rotation, size and keyboard changes keep the WebView and page; `uiMode`, locale and font scale still recreate the activity, which reopens the saved node | `design-spec.md` (DEC-001) | `autobyteus-android/README.md` |

## Removed / Replaced Components Recorded

None.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, archive, finalization (no release)
- Notes: FU-001 (screen lost when Android kills the app in the background) and FU-002 (cancelling a QR scan clears the typed address) are in `follow-ups.md`. The Solution Designer sends them.
