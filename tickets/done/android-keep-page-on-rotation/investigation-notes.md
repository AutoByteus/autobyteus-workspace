# Investigation Notes — Android app keeps its page when the phone rotates

## Investigation Meta

- Package identifier: `android-keep-page-on-rotation` (Project Task `autobyteus-415`; prerequisite PRE-001 of autobyteus-407)
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-keep-page-on-rotation`, branch `codex/android-keep-page-on-rotation`, base `origin/personal` @ `3bf9240d4229dc01012aa3bfd0819a971ab3b32a`; finalization target `origin/personal`
- Authorities read (this conversation): requirements-engineering, ticket-scope, finding-the-cause, handoff, architecture-design, design-principles, project-documents; root `DESIGN.md`, `TESTING.md`, `AGENTS.md`
- Origin: autobyteus-407 investigation S3-06 (`/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-on-phone/tickets/in-progress/node-desktop-on-phone/investigation-notes.md`)

## Findings

| ID | Source | Observation | Established | Implication |
| --- | --- | --- | --- | --- |
| AR-01 | `autobyteus-android/app/src/main/AndroidManifest.xml` (`.MainActivity`: no `android:configChanges`, no `screenOrientation`); `app/src/main/java/org/autobyteus/mobile/MainActivity.kt:38-67` (`onCreate` → `savedNodeStore.loadSelectedEntry()` → `validateAndOpen(savedEntry, savedEntry.mobileUrl, …)`), `:197-218` (`openWebShell` builds a new `AutoByteusWebView`); no `onSaveInstanceState`, WebView `saveState`/`restoreState` or `onConfigurationChanged` in `app/src/main/java` | Android recreates an activity on a configuration change it does not declare; this one then opens the saved node's clean `/mobile` URL in a new WebView | Read (code + platform lifecycle); **not reproduced yet** — the reproduction is the first implementation step | Declare the changes in `configChanges` |
| AR-02 | `ui/SystemBarInsets.kt:13-26` (`ViewCompat.setOnApplyWindowInsetsListener` pads the root from systemBars, displayCutout, ime); `ui/WebShellScreen.kt:22-36` (`render` re-parents the WebView into a new root and calls `SystemBarInsets.pad(root)`) | The listener is invoked again whenever the window insets change, including on rotation without recreation | Read | Insets should hold; AC-003 verifies |
| AR-03 | `shell/QrScanCoordinator.kt:105` (`Intents.Scan.ORIENTATION_LOCKED, false`) | QR scanning runs in the scanner's own activity | Read | Not affected |
| AR-04 | `app/build.gradle*` (`compileSdk 35`, `minSdk 26`, `targetSdk 35`); unit tests under `app/src/test/java/org/autobyteus/mobile/{connection,datamigrations,web}` | JVM unit tests exist | Read | A manifest unit test fits there |
| AR-05 | `~/Library/Android/sdk/emulator/emulator -list-avds` | AVDs `autobyteus277_api34`, `autobyteus277_api35`, `codex_api35_arm64`, `android_operator_play_api35`; no device attached | Measured | Emulator verification possible; the user's phone is not used |

## Reproduction To Hand Over

On `autobyteus277_api35`: install the beta APK (or a worktree build), pair it with an isolated test node (loopback-published, test data; reachable from the emulator at `10.0.2.2:<port>`), open a run's Files view, `adb emu rotate`. Expected before the fix: the run list, and a second `GET /mobile/` in the node's log. If it does **not** reproduce, stop and return to the Solution Designer (`Unclear`).

## Supplemental Artifact Inventory

None.
