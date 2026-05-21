# Android WebView Toolbar UX Rework Evidence

## Evidence Type

UI render-tree/source inspection, focused Android instrumentation coverage, and API/E2E physical-device screenshot evidence. No backend, mobile web, pairing, navigation-policy, file chooser, or WebView security behavior was changed for this UX rework.

## Healthy WebView State Inspection

- File inspected: `autobyteus-android/app/src/main/java/org/autobyteus/mobile/ui/WebShellScreen.kt`
- `WebShellScreen.render()` creates a `FrameLayout` root and adds the supplied `WebView` directly with `MATCH_PARENT` width and height.
- When `diagnostic == null`, no native toolbar, title row, URL text, or wrapper action buttons are added above the WebView.
- Removed healthy-state native controls: `Edit node`, `Retry`, and `Browser` no longer reserve any top layout space.
- Round-6 cleanup removed the stale `profile: SavedNodeProfile` render parameter and `UNUSED_PARAMETER` suppression, so the render API now exposes only the values it uses.

Relevant implementation points:

- `WebShellScreen.kt`: root is a `FrameLayout`; WebView is child `0` with full `MATCH_PARENT` layout params; diagnostic overlay is only added when `diagnostic != null`.
- Diagnostic overlay keeps recovery actions only for recovery states (`Retry`, `Edit`, `Browser`).

## Focused Coverage Added

- File: `autobyteus-android/app/src/androidTest/java/org/autobyteus/mobile/AutoByteusMobileShellSmokeTest.kt`
- Test: `healthyWebShellGivesWebViewFullViewportWithoutNativeToolbar`
  - Asserts healthy render root has exactly one child.
  - Asserts that child is the WebView.
  - Asserts WebView width/height are `MATCH_PARENT`.
  - Asserts visible render-tree text does not contain `EDIT NODE`, `RETRY`, or `BROWSER`.
- Test: `diagnosticWebShellKeepsRecoveryActionsInOverlay`
  - Asserts diagnostic render keeps the WebView as child `0` and adds overlay child `1`.
  - Asserts recovery actions remain available in diagnostic overlay.

## API/E2E Physical-Device Evidence

API/E2E validation round 3 completed the requested real-device follow-up after code-review round 6:

- Screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/e2e-evidence/revalidation-round6-toolbar/25-healthy-webview-no-native-toolbar.png`
- Text dump: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/e2e-evidence/revalidation-round6-toolbar/25-healthy-webview-no-native-toolbar-texts.txt`
- Assertion: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/e2e-evidence/revalidation-round6-toolbar/26-healthy-toolbar-assertion.txt`

Result: pass. The physical Android healthy `/mobile` screen shows mobile web content (`AUTOBYTEUS REMOTE ACCESS`, `Mobile Home`, current node status) and the assertion file records `forbidden_native_toolbar_text_found=False` for the former persistent native toolbar text.

## Local / Review / API-E2E Checks

- Code-review round 6: passed the CR-002 cleanup; `WebShellScreen.render()` no longer accepts the unused profile parameter.
- API/E2E round 3: passed healthy no-toolbar physical-device validation and attachment upload regression.
- `ANDROID_HOME=/Users/normy/Library/Android/sdk gradle -p autobyteus-android :app:testDebugUnitTest :app:assembleDebug :app:compileDebugAndroidTestKotlin` — Passed in API/E2E round 3.
- Direct physical-device instrumentation: `adb shell am instrument -w -r org.autobyteus.mobile.test/androidx.test.runner.AndroidJUnitRunner` — Passed with `OK (5 tests)` in API/E2E round 3.
- Delivery rerun: `ANDROID_HOME=/Users/normy/Library/Android/sdk gradle -p autobyteus-android :app:compileDebugAndroidTestKotlin` — Passed after delivery refreshed `origin/personal`.
- `git diff --check` — Passed in API/E2E round 3 and delivery.
