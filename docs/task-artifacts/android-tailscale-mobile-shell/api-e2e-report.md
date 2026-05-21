# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/review-report.md`
- Current Validation Round: `3`
- Trigger: Code-review round 6 passed the Android WebView toolbar UX rework / `CR-002` cleanup and asked API/E2E to capture healthy WebView no-toolbar evidence, continue Android attachment-upload regression, and carry forward prior residual notes.
- Prior Round Reviewed: `2`
- Latest Authoritative Round: `3`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Post-code-review API/E2E validation | N/A | `VAL-ANDROID-006` | Fail | No | Real-device Android/Tailscale pairing and restore passed, but selecting an image through the native Android picker returned to Chat with `Context Files (0)` and no uploaded attachment. |
| 2 | Code-review round 3 accepted the implementation local fix for `VAL-ANDROID-006` | `VAL-ANDROID-006` | None in product behavior | Pass; route to code review | No | Live device revalidation selected the first visible real image from DocumentsUI. Logcat showed `AutoByteusFileChooser` returned one selected item and the composer showed `Context Files (1)`. API/E2E updated one repository-resident Android instrumentation test, so delivery waited for code-review re-review of that validation-code change. |
| 3 | Code-review round 6 accepted the WebView toolbar UX rework / `CR-002` cleanup | `VAL-ANDROID-006` regression check; prior validation-code review gate | None | Pass | Yes | Physical-device validation shows the healthy `/mobile` WebView has no persistent native `EDIT NODE` / `RETRY` / `BROWSER` toolbar above mobile content. Attachment upload still passes through the native Android picker with selected-item logcat and `Context Files (1)`. No repository-resident validation code was added or updated in this round. |

## Validation Basis

Coverage was derived from the requirements, reviewed design, design-review report, implementation handoff, current code-review report, and directly observed physical-device behavior. Round 3 focused on the reviewer-requested revalidation after the toolbar UX cleanup while retaining the prior Android/Tailscale, native picker, and no-regression coverage.

The implementation handoff's `Legacy / Compatibility Removal Check` remains clean. Source/code-review evidence plus API/E2E observation found no Android `addJavascriptInterface`, WebMessage/native credential bridge, duplicated pairing exchange, native run/chat client clone, backend run/chat/runtime change, service-worker/offline authenticated cache addition, or compatibility-only behavior in the changed scope.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

## Validation Surfaces / Modes

- Android Gradle unit/build/compile checks.
- Android instrumentation through direct `adb shell am instrument` on the already installed app/test APKs.
- USB-connected physical Android device with `adb` screenshots, uiautomator dumps, logcat, and input automation.
- Tailscale Android app and macOS Tailscale peer reachability.
- AutoByteus desktop/server node reachable on the tailnet.
- Existing `/mobile` web shell loaded inside Android WebView.
- Android native file picker (`ACTION_OPEN_DOCUMENT`) and existing mobile Chat context-file composer.
- Backend public Phone Access status and local pairing flow.
- Mobile web/PWA build and source validation.
- Source scans and code-review reports for forbidden bridge/core-client/offline-cache scope.

## Platform / Runtime Targets

- Host: macOS `Darwin MacBookPro 25.2.0`, arm64, Europe/Berlin timezone.
- Java: OpenJDK `21.0.10`.
- Gradle: `9.3.1`.
- Android SDK: `/Users/normy/Library/Android/sdk`.
- adb: `/opt/homebrew/bin/adb`, Android Debug Bridge `36.0.2-14143358`.
- Physical Android device: Xiaomi `2109119DG`, Android `12`, SDK `31`, serial `dfd6c5c0`.
- Tailscale macOS self: `100.127.30.107`, MagicDNS `normys-macbook-pro.tail0347f8.ts.net`.
- Desktop-node mode used: already-running AutoByteus desktop/server process on port `29695` serving `/mobile` and `/rest/remote-access/*`.
- Packaged-Electron mode: not run; no packaged desktop artifact was provided for this API/E2E round.

## Lifecycle / Upgrade / Restart / Migration Checks

- Android app data reset and first launch were executed in round 1 through the live smoke helper.
- App force-stop/reopen restore was executed after successful pairing in round 1.
- Round 2 reinstalled the debug APK, cleared app data during instrumentation rechecks, recreated pairing, and reran the live selected-image scenario.
- Round 3 installed the current debug APK, cleared app data, recreated pairing, validated healthy WebView full-viewport behavior, created a team run without sending a chat message, and revalidated attachment upload from the live Chat composer.
- No upgrade/migration check was in scope because this is a new Android package and no prior Android app version exists.

## Coverage Matrix

| Scenario ID | Requirement / Acceptance Coverage | Mode | Result | Evidence |
| --- | --- | --- | --- | --- |
| `VAL-ANDROID-001` | Build APK, compile Android tests, run Android unit/instrumentation tests | Gradle + direct physical-device instrumentation | Pass | `e2e-evidence/revalidation-round6-toolbar/48-final-executable-checks.log`; `19-am-instrument-after-clean-install.log` |
| `VAL-ANDROID-002` | USB device and Tailscale environment readiness | adb + HTTP tailnet probes | Pass | `e2e-evidence/revalidation-round6-toolbar/01-environment-and-reachability.log` |
| `VAL-ANDROID-003` | Install, clear data, launch first-run screen | adb install / pm clear / launch | Pass | `07-adb-install-after-unlock.log`, `18-clean-install-app-and-test.log`, `20-pm-clear-before-toolbar-e2e.log` |
| `VAL-ANDROID-004` | Pair through existing `/mobile?pairing=` flow using stable tailnet URL shape | Android WebView + desktop dev node | Pass | `21-pairing-session-redacted.json`, `23-shared-pairing-redacted-texts.txt`, `24-pair-page-texts.txt`, `25-healthy-webview-no-native-toolbar.png` |
| `VAL-ANDROID-005` | Force-stop/reopen saved-node/session restore | adb + Android WebView | Pass in round 1 | Round-1 `restore-force-stop.txt`, `restore-start.txt`, `restore-after-force-stop.png`, `restore-after-force-stop-texts.txt` |
| `VAL-ANDROID-006` | Chat attachment upload via Android native picker | Android WebView + system DocumentsUI | Pass in rounds 2 and 3 | Round-3 `44-picker-open-structural-summary.txt`, `45-logcat-filechooser-relevant.txt`, `45-after-picker-item-tap-texts.txt`, `46-after-select-wait-texts.txt`, `47-attachment-assertion.txt` |
| `VAL-ANDROID-007` | Android/Tailscale unreachable diagnostic | adb/Tailscale probes | Partial / residual | Tailscale disconnected state was observed and then connected in round 1; native saved-node unreachable diagnostic was not exhaustively repeated after later UI cleanup. Diagnostic overlay recovery actions remain covered by instrumentation. |
| `VAL-WEB-008` | PWA manifest metadata and no offline authenticated cache | source/build scan | Pass with installability follow-up note | Source manifest and `pages/mobile.vue` head exist; no service-worker/offline cache found. Runtime browser install prompt behavior remains a delivery/browser follow-up if needed. Evidence: round-1 `pwa-manifest-validation.log`, round-3 `48-final-executable-checks.log`. |
| `VAL-NOREG-009` | Existing web/localization/build checks | pnpm + git diff | Pass | `e2e-evidence/revalidation-round6-toolbar/48-final-executable-checks.log` |
| `VAL-SCOPE-010` | No native credential bridge, JS bridge, Android product-client clone, or offline service-worker cache | source scan + code-review reports | Pass | Round-1 `source-scope-scan.log`; current `review-report.md` |
| `VAL-ANDROID-011` | Healthy reachable `/mobile` WebView has no persistent native `EDIT NODE`, `RETRY`, or `BROWSER` toolbar above mobile content | Physical Android WebView screenshot + uiautomator assertion + instrumentation layout test | Pass | `25-healthy-webview-no-native-toolbar.png`, `25-healthy-webview-no-native-toolbar-texts.txt`, `26-healthy-toolbar-assertion.txt`, `48-final-executable-checks.log` |

## Test Scope

Tested across rounds:

- Android unit tests and connected/direct instrumentation tests on the physical device.
- Android debug APK assemble/install/launch.
- Tailscale Android connection recovery and Android-to-desktop tailnet HTTP reachability.
- Pairing through the existing mobile pairing page and backend pairing exchange.
- Mobile home load with existing paired credential.
- Healthy reachable WebView layout after toolbar UX cleanup: mobile content occupies the viewport below the Android status bar and no persistent native recovery toolbar is visible.
- Saved-node restore after app force-stop.
- Native Android file picker launch from the mobile Chat upload control.
- Real selected-image return path from DocumentsUI into existing mobile context-file composer.
- Web/mobile guard/build checks and static source scans.

Not fully tested:

- sending a Chat message with the attached image after the composer accepted it;
- exhaustive unreachable saved-node diagnostic after the round-3 re-pair;
- packaged-Electron desktop-node smoke;
- full browser PWA install prompt behavior after hydration.

## Validation Setup / Environment

- APK path: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/build/outputs/apk/debug/app-debug.apk`.
- Test APK path: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk`.
- AutoByteus desktop/server status from host and Android returned HTTP 200 with Phone Access enabled.
- Tailscale Serve HTTPS was not configured (`tailscale serve status`: `No serve config` in earlier evidence), so validation used MagicDNS/tailnet HTTP `http://normys-macbook-pro.tail0347f8.ts.net:29695/mobile` with the Android app's explicit HTTP acknowledgement. This is the documented private-development/tailnet fallback path, not the preferred final travel URL.
- MIUI install restrictions made the Gradle `connectedDebugAndroidTest` installer path unreliable until user/device approval was cleared. API/E2E therefore verified the final instrumentation state by clean-installing app/test APKs and running `adb shell am instrument -w -r org.autobyteus.mobile.test/androidx.test.runner.AndroidJUnitRunner`, which passed all 5 tests.
- Pairing-link screenshots/XML containing one-time `pairing=` values were removed or redacted. Round-3 post-cleanup scan found no retained unredacted `pairing=` token or `content://` URI value in the round-3 evidence directory.

## Tests Implemented Or Updated

No repository-resident tests were added or updated during validation round 3.

Prior API/E2E round 2 updated one repository-resident Android instrumentation test after code-review round 3:

- Path: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/src/androidTest/java/org/autobyteus/mobile/AutoByteusMobileShellSmokeTest.kt`
- Reason: the implementation-added WebView settings test used `Instrumentation.startActivitySync(MainActivity)`, which repeatedly failed on the live device with a launch-idle timeout even after clearing app data. That made the durable validation state-dependent and blocked API/E2E despite the product live scenario passing.
- Change: the test constructs `AutoByteusWebView` directly on the instrumentation main thread with application context and a no-op `WebFileChooserCoordinator(Activity())`, then verifies `settings.allowContentAccess == true` and `settings.allowFileAccess == false`.
- Review status: accepted by subsequent code-review passes; current canonical review report is `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/review-report.md`.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `No`
- Paths added or updated: `N/A`
- If `Yes`, returned through `code_reviewer` before delivery: `N/A for round 3`
- Post-validation code review artifact: Prior round-2 validation-code update has already been accepted by code review; see `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/review-report.md`.

## Other Validation Artifacts

- Validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/api-e2e-report.md`
- Round-3 evidence directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/e2e-evidence/revalidation-round6-toolbar`
- Key round-3 evidence:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/e2e-evidence/revalidation-round6-toolbar/01-environment-and-reachability.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/e2e-evidence/revalidation-round6-toolbar/19-am-instrument-after-clean-install.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/e2e-evidence/revalidation-round6-toolbar/25-healthy-webview-no-native-toolbar.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/e2e-evidence/revalidation-round6-toolbar/26-healthy-toolbar-assertion.txt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/e2e-evidence/revalidation-round6-toolbar/44-picker-open-structural-summary.txt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/e2e-evidence/revalidation-round6-toolbar/45-logcat-filechooser-relevant.txt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/e2e-evidence/revalidation-round6-toolbar/46-after-select-wait-texts.txt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/e2e-evidence/revalidation-round6-toolbar/47-attachment-assertion.txt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/e2e-evidence/revalidation-round6-toolbar/48-final-executable-checks.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/e2e-evidence/revalidation-round6-toolbar/49-sensitive-evidence-scan.log`

## Temporary Validation Methods / Scaffolding

- Temporary local pairing session was created through the desktop node local-only pairing session endpoint.
- `adb` commands were used for install, launch, force-stop, screenshots, uiautomator dumps, logcat, Android shell connectivity probes, picker interaction, and app-data resets.
- Round 3 selected the first visible real item in Android DocumentsUI, matching the user's clarification that the correct regression path is selecting an actual phone image rather than a synthetic/nonexistent endpoint fixture.
- A team run was created only to expose the real Chat composer; no chat message was sent.
- No temporary runtime scaffolding was left outside the evidence directory.

## Dependencies Mocked Or Emulated

- No core backend/mobile behavior was mocked.
- Desktop-node mode used an already-running development AutoByteus desktop/server node rather than a packaged Electron app.
- Tailscale Serve HTTPS was not configured; MagicDNS/tailnet HTTP was used as the private-network fallback.

## Prior Failure Resolution Check

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `VAL-ANDROID-006` | `Local Fix` | Resolved in round 2; still passing in round 3 | Round 3 `45-logcat-filechooser-relevant.txt` shows picker open and `File picker returned one selected item`; `46-after-select-wait-texts.txt` and `47-attachment-assertion.txt` show `CONTEXT · 1 FILE` and `Context Files (1)` after selecting the first visible real image from DocumentsUI. | The earlier synthetic file-fixture attempt was not representative; rounds 2 and 3 used a real visible image picker path as requested by the user. |
| 2 | Repository-resident validation-code update required re-review before delivery | Workflow gate | Resolved | Current `review-report.md` reports code review round 6 pass and API/E2E may resume; final round 3 added no new durable validation code. | Delivery can proceed after this pass because no repository-resident validation code changed in round 3. |

## Scenarios Checked

### `VAL-ANDROID-011` — Healthy `/mobile` WebView with no persistent native toolbar

Round-3 steps/evidence:

1. Installed the current Android debug APK on the physical Xiaomi Android 12 device.
2. Cleared app data and recreated pairing through the existing `/mobile?pairing=<redacted>` flow over the tailnet HTTP URL.
3. Waited for the reachable healthy mobile home screen.
4. Captured screenshot/XML/text evidence.
5. Asserted that the visible healthy screen did not include the former persistent native recovery toolbar actions `EDIT NODE`, `RETRY`, or `BROWSER` above the mobile content.

Result: Pass. Evidence: `25-healthy-webview-no-native-toolbar.png`, `25-healthy-webview-no-native-toolbar-texts.txt`, `26-healthy-toolbar-assertion.txt`. The visible screen contains mobile web content (`AUTOBYTEUS REMOTE ACCESS`, `Mobile Home`, current node status) and the assertion file records `forbidden_native_toolbar_text_found=False`.

### `VAL-ANDROID-006` — Chat attachment upload via native picker

Round-3 steps/evidence:

1. From the paired mobile WebView, selected the Software Engineering Team, workspace, and a default model to create a run and expose the real Chat composer. No message was sent.
2. Cleared logcat.
3. Tapped the Chat composer `Upload files` control.
4. Android DocumentsUI opened under `com.google.android.documentsui/com.android.documentsui.picker.PickActivity`.
5. Selected the first visible real image/document row from the picker.
6. App returned to `org.autobyteus.mobile/.MainActivity`.
7. Logcat showed:
   - `AutoByteusFileChooser: Opening Android file picker; allowMultiple=true; mime=*/*`
   - `AutoByteusFileChooser: File picker returned one selected item.`
8. The existing mobile composer showed `CONTEXT · 1 FILE` and `Context Files (1)` immediately and after an additional wait.

Result: Pass / prior failure remains resolved. Evidence: `44-picker-open-structural-summary.txt`, `45-logcat-filechooser-relevant.txt`, `45-after-picker-item-tap-texts.txt`, `46-after-select-wait-texts.txt`, `47-attachment-assertion.txt`.

### `VAL-ANDROID-001` — Android build/tests/instrumentation

Final round-3 commands passed:

```bash
ANDROID_HOME=/Users/normy/Library/Android/sdk gradle -p autobyteus-android :app:testDebugUnitTest :app:assembleDebug :app:compileDebugAndroidTestKotlin
adb shell am instrument -w -r org.autobyteus.mobile.test/androidx.test.runner.AndroidJUnitRunner
```

Result: Pass. Gradle build/unit/compile checks passed. Direct instrumentation ran 5 tests on the physical device and returned `OK (5 tests)`.

### `VAL-NOREG-009` — no-regression checks

Commands passed:

```bash
git diff --check
pnpm -C autobyteus-web guard:web-boundary
pnpm -C autobyteus-web guard:localization-boundary
pnpm -C autobyteus-web audit:localization-literals
pnpm -C autobyteus-web build:mobile-web
```

Known warnings remain: existing Node module-type warning in localization audit and existing Vite dynamic-import/chunk-size warnings during mobile web build.

## Passed

- `VAL-ANDROID-001`: Android build/unit/compile checks and direct physical-device instrumentation passed.
- `VAL-ANDROID-002`: Physical Android device and Android-to-desktop tailnet reachability passed.
- `VAL-ANDROID-003`: APK install/clear/launch passed after device install approval path was cleared.
- `VAL-ANDROID-004`: Existing `/mobile?pairing=` flow paired successfully through Android WebView.
- `VAL-ANDROID-005`: Saved-node/session restore after force-stop passed in round 1.
- `VAL-ANDROID-006`: Native picker selected-image upload reaches the existing mobile composer and increments to `Context Files (1)`.
- `VAL-NOREG-009`: web boundary/localization/build checks and `git diff --check` passed.
- `VAL-SCOPE-010`: no forbidden bridge/core-client/offline-cache scope observed.
- `VAL-ANDROID-011`: healthy reachable `/mobile` WebView has no persistent native recovery toolbar above mobile content.

## Failed

No product/API/E2E scenario remains failed in the latest authoritative round.

## Not Tested / Out Of Scope

- Packaged-Electron desktop smoke: not run because this round used development-node mode and no packaged desktop artifact was provided.
- Camera QR scan: not run; pasted/shared pairing link path was used for deterministic validation.
- Final message send with uploaded attachment: not run after composer accepted the selected image.
- Full PWA install prompt/browser installability: source/build checked; runtime installability can be rechecked later if delivery requires it.
- Tailscale Serve HTTPS: not configured locally; MagicDNS/tailnet HTTP with explicit app acknowledgement was used.
- Exhaustive unreachable saved-node diagnostic after the toolbar rework: not repeated; instrumentation verifies diagnostic recovery actions remain available in overlay state, and live tailnet reachability was healthy for the no-toolbar and upload checks.

## Blocked

No latest-round validation blocker remains.

Round-3 note: Gradle's `connectedDebugAndroidTest` task hit MIUI user-restricted install behavior while trying to install/reinstall APKs during setup. That was treated as an environment/install-permission issue, not a product failure, because manual APK installation plus direct `adb shell am instrument` ran the same instrumentation suite successfully on the physical device.

## Cleanup Performed

- No temporary source or runtime scaffolding was left behind.
- Pairing-token evidence was redacted/removed.
- Round-3 evidence scan found no retained raw `pairing=` token or `content://` URI value in the round-3 evidence directory.
- No chat message was sent during attachment validation.

## Classification

- Latest result: `Pass`
- Required next route: `delivery_engineer`
- Reason: Round 3 found no product/API/E2E failures and added or updated no repository-resident durable validation code after the latest code-review pass.

## Recommended Recipient

`delivery_engineer`

## Evidence / Notes

The user-observed behavior was reproduced on the real phone path: selecting an actual visible image from the Android picker returns to the mobile Chat composer and shows one context file. This specifically avoids the earlier non-representative attempt to select a synthetic/nonexistent endpoint fixture on the phone.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: API/E2E validation is complete for the Android/Tailscale mobile shell and WebView toolbar UX rework. Proceed to delivery with residual notes for packaged-Electron smoke, full PWA install prompt behavior, and exhaustive unreachable diagnostic only if delivery scope requires them.
