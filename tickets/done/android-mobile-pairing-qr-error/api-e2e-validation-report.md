# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/review-report.md`
- Current Validation Round: 2
- Trigger: Local Fix code-review pass for AndroidX Core dependency after Round 1 scanner crash.
- Prior Round Reviewed: Round 1 validation failure on S-005.
- Latest Authoritative Round: 2

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Round 2 code-review pass and physical Xiaomi validation | N/A | QR scanner crashed on device due missing AndroidX Core class | Fail | No | Routed as `Local Fix` to `implementation_engineer`. |
| 2 | Local Fix review pass for `androidx.core:core:1.13.1` runtime dependency | S-005 scanner crash rechecked with fixed APK SHA `cf77a63a86fcf8fce3100666722368ad107b14451d35c9a37137448acfd4a7ff` | None blocking | Pass | Yes | Scanner launched stably, cancel recovery worked, user scanned QR and connected, saved-node `/mobile` relaunched without Error 500. |

## Validation Basis

Derived from the reviewed requirements/design/handoff and review residual risks:

- App-owned Android QR scanner must open inside the APK and must not depend on an external ZXing app.
- Camera permission/cancel/empty-result recovery should be recoverable where practical.
- Successful QR scan must feed decoded text into the existing save/open pairing path.
- `/mobile` must be served from the corrected rebuilt mobile bundle and must not render the prior `localeCompare` Error 500.
- Validation must record exact installed APK and served mobile bundle identity.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

No external scanner fallback or old team-run field fallback was observed. The scanner activity is bundled under `org.autobyteus.mobile/com.journeyapps.barcodescanner.CaptureActivity`; the legacy external `com.google.zxing.client.android.SCAN` resolver still reports no external activity.

## Validation Surfaces / Modes

- Static artifact identity and manifest/runtime dependency verification.
- Focused web unit/component regression tests.
- Android Gradle unit/build/androidTest compile checks.
- Android Debug Bridge physical-device install and UI automation on Xiaomi `2109119DG`.
- Live physical QR scan performed by the user on the connected phone.
- Desktop packaged server `/mobile` static bundle replacement/serve proof.
- Android WebView saved-node relaunch proof.

## Platform / Runtime Targets

- Host: macOS, worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/android-mobile-pairing-qr-error`, branch `codex/android-mobile-pairing-qr-error`.
- Android device: `dfd6c5c0`, Xiaomi `2109119DG` / `lisa`, Android 12 / SDK 31, MIUI V13.
- Fixed installed APK: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-mobile-pairing-qr-error/autobyteus-android/app/build/outputs/apk/debug/app-debug.apk`
- Fixed installed APK SHA-256: `cf77a63a86fcf8fce3100666722368ad107b14451d35c9a37137448acfd4a7ff`
- Known-bad prior APK SHA-256: `7955bbd7ca6158c4f5eda7dc464fa4ccc7539c21ddd125418a5ba2898b1bb1c4`
- Desktop server process observed: `/Applications/AutoByteus.app/Contents/Resources/server/dist/app.js --port 29695 --data-dir /Users/normy/.autobyteus/server-data`
- Corrected mobile bundle source: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-mobile-pairing-qr-error/autobyteus-web/dist-mobile/public`
- Corrected mobile bundle file count: `177`
- Corrected/served `index.html` SHA-256: `9603ea94ca777769a7c80f216592da080b1641799972836a64b3237e141920bb`
- Saved/paired Android node validated: `http://100.127.30.107:29695/mobile`

## Lifecycle / Upgrade / Restart / Migration Checks

- Initial Round 1 APK install reproduced Xiaomi policy failure: `INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`.
- Non-root device setting remediation set `adb_install_need_confirm=0`, `package_verifier_enable=0`, `verifier_verify_adb_installs=0`; subsequent installs succeeded.
- Fixed APK installed successfully with `adb install -r -d -t`; installed package `lastUpdateTime=2026-05-21 21:43:33`.
- App data was cleared before deterministic Round 2 first-run scanner validation.
- Desktop `/mobile` static assets were copied from the reviewed worktree build into `/Applications/AutoByteus.app/Contents/Resources/server/mobile-web`; both `127.0.0.1` and saved `100.127.30.107` URLs served `index.html` SHA-256 `9603ea94ca777769a7c80f216592da080b1641799972836a64b3237e141920bb`.
- No server restart was required for static-file replacement because the route resolves and streams files on request.
- A backup of the prior packaged mobile bundle was created at `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/mobile-web-before-api-e2e-20260521T192714Z.tar.gz`.
- Saved-node relaunch after QR pairing loaded Mobile Home directly and did not show the prior Error 500.

## Coverage Matrix

| Scenario ID | Requirement / AC | Scenario | Result | Evidence |
| --- | --- | --- | --- | --- |
| S-001 | REQ-008, AC-005, AC-006 | Focused web and Android build/compile checks | Pass | `api-e2e-web-vitest.log`, `api-e2e-gradle-build.log`, `local-fix-androidx-core-gradle-build.log` |
| S-002 | REQ-010, AC-009 | Record exact APK and mobile bundle identities | Pass | `api-e2e-round2-artifact-identity.txt`, `api-e2e-round2-fixed-artifact-check.log` |
| S-003 | REQ-010, AC-009 | Serve corrected `/mobile` bundle from desktop node and verify served hash | Pass | `api-e2e-mobile-web-serve-refresh.log`, `api-e2e-r2-saved-node-relaunch.log` |
| S-004 | REQ-009, AC-001 | Install APK on physical Xiaomi device and launch first-run connection screen | Pass | `api-e2e-round2-fixed-install.log`, `api-e2e-r2-scanner-stable-launch.log` |
| S-005 | REQ-001, AC-001 | Tap **Scan QR** and open app-owned scanner/camera UI | Pass | `api-e2e-r2-scanner-stable-launch.log`, `api-e2e-r2-screenshot-scanner.png` |
| S-006 | REQ-002, AC-002 | Camera permission handling | Partial / acceptable | Runtime permission request path was exercised; explicit physical deny was not completed. Existing Android coordinator coverage remains the durable denial-path proof. Evidence: `api-e2e-r2-permission-prompt2.log`, `local-fix-androidx-core-gradle-build.log`. |
| S-007 | REQ-003, AC-003 | Scanner cancel/empty-result recovery | Pass | `api-e2e-r2-scanner-cancel.log`, `api-e2e-r2-screenshot-scanner-cancel.png` |
| S-008 | REQ-004, AC-004 | Scan valid Phone Access QR and verify save/open pairing path | Pass | User completed scan/connect; `api-e2e-r2-connected-state.log`, `api-e2e-r2-remote-access-devices-after-qr.json`, saved-node prefs in log. |
| S-009 | REQ-006, REQ-007, REQ-009, AC-007 | Open saved paired node and verify `/mobile` no Error 500 | Pass | `api-e2e-r2-saved-node-relaunch.log`, `api-e2e-r2-screenshot-saved-node-relaunch.png`; UI dump reports `HAS_ERROR_500=False`. |

## Test Scope

Round 2 resumed from the prior S-005 failure. It revalidated the fixed APK, scanner launch, cancel recovery, live QR scan/pairing, connected Mobile Home, and saved-node relaunch against the corrected served mobile bundle. Physical explicit camera-denial tapping was not completed; the coordinator denial branch remains covered by Android durable tests reviewed and rerun upstream.

## Validation Setup / Environment

Key setup actions:

- Verified fixed APK SHA and `ContextCompat` dex presence from local-fix logs.
- Installed fixed APK to the connected Xiaomi device.
- Cleared Android app data before first-run scanner validation.
- Configured `adb reverse tcp:29695 tcp:29695` for localhost desktop-node access during some validation steps.
- Replaced packaged desktop server `mobile-web` directory with the reviewed corrected mobile bundle and verified served hash via curl.
- Generated a temporary API/E2E QR artifact, but the actual successful user scan connected to the saved tailnet-like node `http://100.127.30.107:29695`.

## Tests Implemented Or Updated

No repository-resident durable validation was added or updated during API/E2E. Existing durable tests were run/reviewed by implementation/code-review, including Android coordinator edge coverage.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `No`
- Paths added or updated: N/A
- If `Yes`, returned through `code_reviewer` before delivery: N/A
- Post-validation code review artifact: N/A for API/E2E changes. Local Fix source review is captured in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/review-report.md`.

## Other Validation Artifacts

Key API/E2E artifacts:

- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/api-e2e-validation-report.md`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/api-e2e-round2-fixed-artifact-check.log`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/api-e2e-round2-fixed-install.log`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/api-e2e-r2-scanner-stable-launch.log`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/api-e2e-r2-scanner-cancel.log`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/api-e2e-r2-permission-prompt2.log`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/api-e2e-r2-connected-state.log`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/api-e2e-r2-saved-node-relaunch.log`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/api-e2e-mobile-web-serve-refresh.log`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/local-fix-androidx-core-apk-verification.log`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/local-fix-androidx-core-gradle-build.log`

## Temporary Validation Methods / Scaffolding

- ADB install-policy setting probes and remediation were used to unblock physical install.
- ADB UIAutomator dumps and screenshots were captured for first-run, scanner, cancel, connected, and saved-node relaunch states.
- `adb reverse tcp:29695 tcp:29695` was configured for local desktop-node reachability during Android validation.
- Packaged mobile-web assets were temporarily replaced with the reviewed worktree bundle for validation; prior bundle was backed up in the task artifact folder.
- Temporary QR artifact files were generated for API/E2E support but were removed before repository finalization because they contained a raw `/mobile?pairing=` payload and one-time pairing code. See `api-e2e-r2-pairing-qr-redaction-note.md`.

## Dependencies Mocked Or Emulated

None for scanner launch and QR success: this was physical-device execution. Desktop `/mobile` was served by the local packaged AutoByteus server process with its static mobile bundle replaced by the reviewed build output.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | S-005 scanner crash: `NoClassDefFoundError: androidx/core/content/ContextCompat` from JourneyApps `CaptureManager.openCameraWithPermission` | Local Fix | Resolved by fixed APK SHA `cf77a63a86fcf8fce3100666722368ad107b14451d35c9a37137448acfd4a7ff`; scanner activity stayed resumed and displayed camera UI prompt text | `api-e2e-round2-fixed-artifact-check.log`, `api-e2e-round2-fixed-install.log`, `api-e2e-r2-scanner-stable-launch.log` | No crash entries after fixed scanner launch. |

## Scenarios Checked

### S-001: Focused automated checks

Passed. Focused web regression tests and Android build/test compile checks were executed in API/E2E before the local-fix loop; code review independently reran the relevant checks after the dependency fix.

Evidence:

- `api-e2e-web-vitest.log`: 3 files / 27 tests passed.
- `api-e2e-gradle-build.log`: `:app:testDebugUnitTest :app:assembleDebug :app:compileDebugAndroidTestKotlin` passed.
- `local-fix-androidx-core-gradle-build.log`: Gradle dependency/build/test command passed after adding AndroidX Core.

### S-002 / S-003: Artifact identity and corrected served mobile bundle

Passed. Fixed APK hash is `cf77a63a86fcf8fce3100666722368ad107b14451d35c9a37137448acfd4a7ff`; APK verification log confirms `Landroidx/core/content/ContextCompat;` is present in dex. Corrected mobile bundle served under both localhost and saved tailnet-like URL with `index.html` SHA-256 `9603ea94ca777769a7c80f216592da080b1641799972836a64b3237e141920bb`.

Evidence:

- `api-e2e-round2-fixed-artifact-check.log`
- `api-e2e-mobile-web-serve-refresh.log`
- `api-e2e-r2-saved-node-relaunch.log`

### S-004: Install and launch updated APK

Passed. Fixed APK installed successfully on the physical Xiaomi device. First-run connection screen rendered with **Scan QR**.

Evidence:

- `api-e2e-round2-fixed-install.log`
- `api-e2e-r2-scanner-stable-launch.log`

### S-005: App-owned scanner launch

Passed. With camera permission available, tapping **Scan QR** opened the bundled app-owned `org.autobyteus.mobile/com.journeyapps.barcodescanner.CaptureActivity`. UI showed scanner/camera prompt text: `Scan the AutoByteus Phone Access QR`. Activity remained resumed and no `AndroidRuntime` crash appeared.

Evidence:

- `api-e2e-r2-scanner-stable-launch.log`
- `api-e2e-r2-uiautomator-scanner.xml`
- `api-e2e-r2-screenshot-scanner.png`

### S-006: Camera permission handling

Partial / acceptable. Runtime permission request path was exercised after revoking camera permission; the device focus showed Android permission controller before scanner/camera state. Explicit physical denial was not completed. Existing Android coordinator coverage remains the durable proof for `cameraPermissionDenied()` behavior.

Evidence:

- `api-e2e-r2-permission-prompt2.log`
- `local-fix-androidx-core-gradle-build.log`

### S-007: Scanner cancel recovery

Passed. Pressing Back from scanner returned to `MainActivity` and rendered the recoverable diagnostic:

- `QR scan was not completed`
- `No QR text was returned from the scanner.`
- `Scan the Phone Access QR again, or paste/manual-enter the Phone Access link text.`

No crash was logged.

Evidence:

- `api-e2e-r2-scanner-cancel.log`
- `api-e2e-r2-uiautomator-scanner-cancel.xml`
- `api-e2e-r2-screenshot-scanner-cancel.png`

### S-008: Valid QR scan and pairing/save/open path

Passed. User manually scanned a valid Phone Access QR and reported connection success. ADB evidence immediately after shows Android returned to `MainActivity`, WebView rendered Mobile Home, backend device list contains active non-revoked device `device_3d06ccae32dc43956c60f0af910576b2`, and Android `SavedNodeStore` contains the stable saved profile:

- `baseUrl`: `http://100.127.30.107:29695`
- `mobileUrl`: `http://100.127.30.107:29695/mobile`
- `displayName`: `AutoByteus Desktop`
- `httpAcknowledged`: `true`

Evidence:

- `api-e2e-r2-connected-state.log`
- `api-e2e-r2-uiautomator-connected.xml`
- `api-e2e-r2-screenshot-connected.png`
- `api-e2e-r2-remote-access-devices-after-qr.json`

### S-009: Saved-node `/mobile` no Error 500

Passed. Force-stopping and relaunching the app without clearing data opened the saved node directly to Mobile Home. UI dump included `AUTOBYTEUS REMOTE ACCESS`, `Mobile Home`, `CURRENT NODE`, `AutoByteus Desktop`, `http://100.127.30.107:29695`, `Connected`, and recent work rows including team-run rows. The validation script explicitly reported `HAS_ERROR_500=False`; no `localeCompare` text appeared in the UI or filtered logcat.

Evidence:

- `api-e2e-r2-saved-node-relaunch.log`
- `api-e2e-r2-uiautomator-saved-node-relaunch.xml`
- `api-e2e-r2-screenshot-saved-node-relaunch.png`

## Passed

- Local-fix APK installed: SHA-256 `cf77a63a86fcf8fce3100666722368ad107b14451d35c9a37137448acfd4a7ff`.
- Prior S-005 `ContextCompat` scanner crash is resolved.
- App-owned scanner/camera UI opens inside bundled `CaptureActivity`; no external scanner app dependency observed.
- Scanner cancel returns to connection screen with recoverable retry/paste guidance.
- User scanned a valid Phone Access QR and connected successfully.
- Android native saved-node store contains the stable saved `/mobile` profile.
- Connected Mobile Home rendered recent work/team-run rows without `Error 500` or `localeCompare` failure.
- Saved-node relaunch opened `/mobile` and remained on Mobile Home with `HAS_ERROR_500=False`.
- Corrected mobile bundle served with exact `index.html` SHA-256 `9603ea94ca777769a7c80f216592da080b1641799972836a64b3237e141920bb`.

## Failed

No blocking failures in latest authoritative Round 2.

## Not Tested / Out Of Scope

- Explicit physical tap on Android permission-denial button was not completed. Denial-path behavior is covered by Android coordinator tests and prior reviewed source, but physical denial UI proof remains uncollected.
- Empty-result scanner result distinct from Back/cancel was not separately induced on device; cancel path covers the same recoverable diagnostic branch from the scanner callback.

## Blocked

None for latest authoritative Round 2.

## Cleanup Performed

- No repository source/test files were changed during API/E2E.
- `adb reverse tcp:29695 tcp:29695` may remain configured for the device and can be reused if needed.
- The prior packaged mobile-web bundle backup remains at `mobile-web-before-api-e2e-20260521T192714Z.tar.gz` for traceability.

## Classification

N/A — latest authoritative result is `Pass`.

## Recommended Recipient

`delivery_engineer`

## Evidence / Notes

Key fixed-scanner evidence from `api-e2e-r2-scanner-stable-launch.log`:

```text
mResumedActivity: ActivityRecord{... org.autobyteus.mobile/com.journeyapps.barcodescanner.CaptureActivity ...}
text= Scan the AutoByteus Phone Access QR ... class= android.widget.TextView
```

Key saved-node no-crash evidence from `api-e2e-r2-saved-node-relaunch.log`:

```text
AUTOBYTEUS REMOTE ACCESS
AutoByteus
Mobile Home
CURRENT NODE
AutoByteus Desktop
http://100.127.30.107:29695
Connected
HAS_ERROR_500= False
```

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: Fixed APK resolves the scanner crash; physical-device QR scan connected successfully; saved-node `/mobile` relaunch renders Mobile Home from the corrected served bundle without the prior `localeCompare` Error 500. Ready for delivery/docs sync.
