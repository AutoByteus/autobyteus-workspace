# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/design-review-report.md`
- Prior implementation review report, still relevant context: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/review-report.md`
- API/E2E validation report routing this Local Fix: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/api-e2e-validation-report.md`

## What Changed

- Added app-owned QR scanning through `QrScanCoordinator` in the Android shell.
  - Owns camera permission request/return handling.
  - Starts the bundled JourneyApps/ZXing `CaptureActivity` directly inside the APK.
  - Handles cancelled and empty scan results with recoverable diagnostics.
  - Emits only decoded raw text to `MainActivity`, which continues through `submitInput(...)` / `ConnectionInputResolver` / `PairingLinkParser`.
- Removed the legacy external ZXing scanner steady-state path from `AndroidExternalActions` and removed the manifest `<queries>` entry for `com.google.zxing.client.android.SCAN`.
- Preserved file chooser handling by continuing to let `WebFileChooserCoordinator` consume activity results first and keeping QR/file chooser/permission request codes distinct.
- Fixed `/mobile` recent work mapping so team-run contexts use query-shaped `createdAt` and `status`, not stale `lastActivityAt` / `lastKnownStatus` fields.
- Added focused web catalog regression coverage for team runs with `createdAt` / `status` and no legacy team-run fields.
- Updated existing mobile test mocks that were still using stale run-history fields near the changed catalog path.
- Round 2 addendum response: rebuilt local mobile web assets from corrected source with `pnpm -C autobyteus-web build:mobile-web`; recorded exact output path and artifact hashes below.
- API/E2E Local Fix response: added explicit Android runtime dependency `androidx.core:core:1.13.1` so JourneyApps scanner internals can resolve `androidx.core.content.ContextCompat` on the physical device.

## API/E2E Local Fix Details

- Failure classification received from API/E2E: `Local Fix`.
- Failure observed in installed reviewed APK SHA-256 `7955bbd7ca6158c4f5eda7dc464fa4ccc7539c21ddd125418a5ba2898b1bb1c4`.
- Crash evidence: `java.lang.NoClassDefFoundError: Failed resolution of: Landroidx/core/content/ContextCompat;` from `com.journeyapps.barcodescanner.CaptureManager.openCameraWithPermission(...)` during `CaptureActivity.onResume(...)`.
- Fix: added `implementation("androidx.core:core:1.13.1")` to `autobyteus-android/app/build.gradle.kts` next to the JourneyApps scanner dependency.
- Rationale: this is a bounded Android package/runtime dependency defect; scanner ownership and callback design remain unchanged.
- Fixed debug APK path: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-mobile-pairing-qr-error/autobyteus-android/app/build/outputs/apk/debug/app-debug.apk`.
- Fixed debug APK SHA-256: `cf77a63a86fcf8fce3100666722368ad107b14451d35c9a37137448acfd4a7ff`.
- APK dex verification confirms `Landroidx/core/content/ContextCompat;` is present in the fixed APK: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/local-fix-androidx-core-apk-verification.log`.

## Key Files Or Areas

- `autobyteus-android/app/build.gradle.kts` — adds `androidx.core:core:1.13.1` and `com.journeyapps:zxing-android-embedded:4.3.0`.
- `autobyteus-android/app/src/main/java/org/autobyteus/mobile/shell/QrScanCoordinator.kt` — new scanner lifecycle boundary.
- `autobyteus-android/app/src/main/java/org/autobyteus/mobile/MainActivity.kt` — wires QR coordinator and delegates activity/permission callbacks.
- `autobyteus-android/app/src/main/java/org/autobyteus/mobile/shell/AndroidExternalActions.kt` — now external browser/Tailscale actions only.
- `autobyteus-android/app/src/main/AndroidManifest.xml` — adds `CAMERA`, optional camera feature, removes external ZXing scan query.
- `autobyteus-android/app/src/androidTest/java/org/autobyteus/mobile/AutoByteusMobileShellSmokeTest.kt` — QR/file chooser request-code distinctness plus coordinator result/permission edge coverage.
- `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts` — team-run createdAt/status mapping plus guarded sort keys.
- `autobyteus-web/composables/mobile/__tests__/useMobileWorkCatalog.spec.ts` — query-shaped regression coverage.
- `autobyteus-web/components/mobile/__tests__/MobileContextSelectionRegression.spec.ts` and `MobileRemoteAccessShell.spec.ts` — stale mock cleanup.

## Important Assumptions

- JourneyApps/ZXing embedded scanner is acceptable for this targeted app-owned QR flow and remains fully hidden behind `QrScanCoordinator`.
- The scanner activity returns decoded text in the established `SCAN_RESULT` extra; the coordinator does not parse the payload.
- Team-run list history from the active GraphQL/store contract uses `createdAt` and `status` for this surface.
- The API/E2E crash is fully explained by missing AndroidX Core runtime classes; no scanner lifecycle design change is required.
- Implementation can build corrected APK/mobile-web assets locally, but live desktop-node restart/reload and physical Android validation remain API/E2E or delivery environment responsibilities.

## Known Risks

- Full live camera validation still requires installing the rebuilt fixed APK (`cf77a63a...`) on the physical phone, opening the scanner UI, and scanning a visible Phone Access QR.
- The embedded scanner manifest merges `CaptureActivity` and optional camera features correctly in the debug build, but full camera behavior under targetSdk 35 still needs device validation after this dependency fix.
- The corrected `/mobile` static bundle exists at `autobyteus-web/dist-mobile/public`, and API/E2E already proved a served desktop bundle path before this local fix; API/E2E should preserve/refresh that served bundle when resuming validation.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix / Behavior Change.
- Reviewed root-cause classification: Android QR = Boundary Or Ownership Issue / File Placement Or Responsibility Drift if left in `AndroidExternalActions`; web `/mobile` crash = Local Implementation Defect from stale DTO-field assumptions; API/E2E scanner crash = Local Implementation Defect in Android runtime dependency packaging.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now, narrow Android scan coordinator extraction only; no additional refactor needed for the AndroidX Core dependency fix.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A.
- Evidence / notes: QR lifecycle remains in `QrScanCoordinator`; `AndroidExternalActions.startQrScan()` and external scanner query remain removed; decoded text callback flows to existing `submitInput(...)`; web catalog still uses team `createdAt`/`status`; AndroidX Core dependency now appears in the debug runtime classpath and `ContextCompat` is present in the fixed APK dex.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes` — removed legacy external QR scan method/constant and manifest query; stale team-run mock fields removed near covered mobile tests.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes` — changed source implementation files remain below 500 non-empty lines; the local fix only adds one Android dependency line.
- Notes: The AndroidX Core dependency is not a compatibility fallback; it is the scanner library runtime dependency needed by the app-owned scanner path.

## Environment Or Dependency Notes

- Added Android dependency: `implementation("com.journeyapps:zxing-android-embedded:4.3.0")`.
- Local Fix added Android runtime dependency: `implementation("androidx.core:core:1.13.1")`.
- Debug runtime classpath now includes `androidx.core:core:1.13.1`; see `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/local-fix-androidx-core-gradle-build.log`.
- Debug merged manifest includes `android.permission.CAMERA`, optional camera features, and `com.journeyapps.barcodescanner.CaptureActivity`; it no longer contains `com.google.zxing.client.android.SCAN` query.
- `pnpm install --frozen-lockfile` was run to restore workspace dependencies before web tests; no lockfile changes were produced.
- `pnpm -C autobyteus-web exec nuxi prepare` was required to generate `.nuxt/tsconfig.json` before Vitest in this fresh worktree.
- Round 2 mobile web build path used: `pnpm -C autobyteus-web build:mobile-web`, which writes static assets to `/Users/normy/autobyteus_org/autobyteus-worktrees/android-mobile-pairing-qr-error/autobyteus-web/dist-mobile/public`.
- No Android release artifact was produced in implementation. Therefore `versionCode` / `versionName` were not bumped here; if delivery produces a release artifact, delivery must either bump Android version metadata or record the release-specific no-bump rationale.

## Local Implementation Checks Run

Record only implementation-scoped checks here, such as build, typecheck, unit tests, and narrow integration checks around the changed code.
Do not stand up API/E2E validation environments or treat that work as part of this section.
Do not report API, E2E, or broader executable validation as passed in this artifact.

Previously completed implementation checks:

- `pnpm install --frozen-lockfile` — passed; restored workspace dependencies from existing lockfile.
- `pnpm -C autobyteus-web exec nuxi prepare` — passed; generated Nuxt type context for tests.
- `pnpm -C autobyteus-web exec vitest run composables/mobile/__tests__/useMobileWorkCatalog.spec.ts components/mobile/__tests__/MobileContextSelectionRegression.spec.ts components/mobile/__tests__/MobileRemoteAccessShell.spec.ts` — passed: 3 files / 27 tests.
- `pnpm -C autobyteus-web build:mobile-web` — passed after Round 2. Log: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/implementation-mobile-web-build.log`.
- Merged manifest inspection confirmed camera permission/CaptureActivity present and legacy external scan query absent.
- Stale assumption search showed no matches for `run.lastActivityAt`, `run.lastKnownStatus`, `AndroidExternalActions.QR_SCAN_REQUEST`, or `com.google.zxing.client.android.SCAN` in changed scanner/catalog paths. Log: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/implementation-stale-assumption-search.log`.

Local Fix checks completed after API/E2E failure:

- `ANDROID_HOME=/Users/normy/Library/Android/sdk gradle -p autobyteus-android :app:dependencies --configuration debugRuntimeClasspath :app:testDebugUnitTest :app:assembleDebug :app:compileDebugAndroidTestKotlin` — passed. Log: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/local-fix-androidx-core-gradle-build.log`.
  - Fixed debug APK path: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-mobile-pairing-qr-error/autobyteus-android/app/build/outputs/apk/debug/app-debug.apk`
  - Fixed debug APK SHA-256: `cf77a63a86fcf8fce3100666722368ad107b14451d35c9a37137448acfd4a7ff`
  - Dependency tree includes `androidx.core:core:1.13.1` under `debugRuntimeClasspath`.
- APK dex verification with `dexdump` — passed. Log: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error/local-fix-androidx-core-apk-verification.log`.
  - Confirmed `Class descriptor  : 'Landroidx/core/content/ContextCompat;'` is present in fixed APK `classes.dex`.
- `git diff --check` — passed.

API/E2E blocked state before this local fix:

- Attempted physical scanner UI validation failed with `NoClassDefFoundError` for `androidx.core.content.ContextCompat` in APK SHA-256 `7955bbd7ca6158c4f5eda7dc464fa4ccc7539c21ddd125418a5ba2898b1bb1c4`.
- That failing APK is superseded by fixed APK SHA-256 `cf77a63a86fcf8fce3100666722368ad107b14451d35c9a37137448acfd4a7ff`.

## Downstream Validation Hints / Suggested Scenarios

- Install the rebuilt fixed debug APK (`cf77a63a86fcf8fce3100666722368ad107b14451d35c9a37137448acfd4a7ff`) on the connected Android device and resume from API/E2E scenario S-005.
- Tap **Scan QR** and confirm the bundled scanner/camera UI opens without the previous `ContextCompat` crash.
- Deny camera permission once and verify the native connection screen shows the camera-permission diagnostic while paste/manual entry remain available.
- Cancel the scanner and verify the app returns to the connection screen with retry/paste guidance and no stale busy state.
- Scan a valid Phone Access QR and verify the decoded text follows the same save/open path as pasting the pairing link.
- Preserve or refresh the corrected desktop-served `/mobile` bundle before saved-node `/mobile` validation.
- Open the saved paired node and verify `/mobile` no longer renders `Error 500: Cannot read properties of undefined (reading 'localeCompare')`.

## API / E2E / Executable Validation Still Required

- Full physical scanner UI stable launch and camera QR scan success path must be rerun on the Xiaomi device with fixed APK SHA-256 `cf77a63a86fcf8fce3100666722368ad107b14451d35c9a37137448acfd4a7ff`.
- Camera permission denial/cancel/empty-result recovery must be rerun.
- Android saved-node `/mobile` no-Error-500 WebView proof must be completed after scanner validation and corrected served bundle setup.
- Delivery should handle documentation sync and any release-version metadata decision if a release artifact is produced.
