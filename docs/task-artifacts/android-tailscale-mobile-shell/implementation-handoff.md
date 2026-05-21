# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/design-review-report.md`
- Android WebView toolbar UX rework note: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/android-webview-toolbar-ux-rework.md`
- Android WebView toolbar UX evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/android-webview-toolbar-ux-rework-evidence.md`
- Code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/review-report.md`
- API/E2E validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/api-e2e-report.md`

## What Changed

Implemented the Android/Tailscale mobile shell ticket as an additive app-shell package plus narrow web/docs seams:

- Added `autobyteus-android/` as a standalone Android app project.
- Added native saved-node setup UX for paste/share/manual URL entry, saved node restore, reset/remove, HTTP acknowledgement, Tailscale action, and external QR scanner launch.
- Added Android-local profile, URL normalization, pairing-link parsing, reachability validation, diagnostics, and state classes.
- Added a WebView host that loads the existing desktop-served `/mobile` shell and classifies navigation with exact parsed scheme/host/port/path checks.
- Reworked the Android WebView shell healthy state to give the existing `/mobile` content the full usable app viewport with no persistent native title/URL/action toolbar above it.
- Preserved pairing and credentials in the existing `/mobile` web flow; no native credential bridge and no JavaScript interface were added.
- Added bounded Android WebView file chooser support for existing mobile `<input type="file">` upload controls via `WebChromeClient.onShowFileChooser`, `ACTION_OPEN_DOCUMENT`, pending `ValueCallback<Array<Uri>>`, and cancellation cleanup.
- Added Android unit tests for normalizer, pairing parser, navigation policy, file chooser accept-type policy, and diagnostic mapping, plus instrumentation compile coverage for request-code wiring.
- Added mobile web PWA manifest/head metadata and icons without service-worker/offline authenticated caching.
- Updated Phone Access UI copy/localization and remote-access docs to recommend stable Tailscale Serve/MagicDNS pairing and explain origin-scoped credentials.
- Added Android build/setup docs and a live-device smoke helper for API/E2E evidence capture.


## Local Fix Update For Code Review Finding `CR-001`

- Finding fixed: `CR-001` WebView shell missing native Android file chooser support for existing mobile upload controls.
- Implementation: `AutoByteusWebView` now installs a bounded `WebChromeClient` from `WebFileChooserCoordinator`; the coordinator opens `ACTION_OPEN_DOCUMENT`, returns single or multiple selected `Uri` values to the pending `ValueCallback<Array<Uri>>`, and sends `null` on cancellation, replacement, destroy, or missing picker.
- WebView security posture: `allowFileAccess` remains disabled; content URL access is enabled so user-selected Android document URIs can be read by the WebView file-input flow, while `TrustedNavigationPolicy` still blocks top-level `content:` navigation and all non-HTTP(S) arbitrary schemes. This was later confirmed as the local fix path for `VAL-ANDROID-006`.
- Coverage: `FileChooserRequestPolicyTest` covers accept-type normalization/defaults/multiple selection policy, and `AutoByteusMobileShellSmokeTest` covers request-code routing plus the WebView setting posture needed for Android document URI uploads.
- Boundary check: no JavaScript bridge, native credential bridge, Android product-client clone, or backend change was added.


## Local Fix Update For API/E2E Failure `VAL-ANDROID-006`

- Failure fixed: `VAL-ANDROID-006` native picker opened, but selected image did not appear in the existing mobile Chat context-file composer.
- Root cause addressed: the WebView file-input bridge returned Android document `content://` URIs, but the WebView had `allowContentAccess` disabled, so selected content URIs were not readable by the web file-input upload path.
- Implementation: `AutoByteusWebView` now keeps `allowFileAccess` disabled but enables `allowContentAccess` for user-selected Android document URIs. `WebFileChooserCoordinator` still owns `ACTION_OPEN_DOCUMENT` launch/result handling and now logs picker open/result count without logging filenames or URI values, giving API/E2E a focused log proof point.
- Coverage: connected instrumentation compile coverage now asserts the WebView settings posture (`allowContentAccess == true`, `allowFileAccess == false`) and request-code separation; unit coverage still covers accept-type policy.
- Boundary check: no JavaScript bridge, native credential bridge, Android product-client clone, duplicated pairing exchange, or backend run/chat/runtime change was added.


## Local Fix Update For Code Review Finding `CR-002`

- Finding fixed: removed obsolete `profile: SavedNodeProfile` API surface from `WebShellScreen.render()` after the healthy-state title/URL toolbar was removed.
- Implementation: `WebShellScreen.render()` now accepts only the WebView, optional diagnostic, and callbacks; `MainActivity.renderCurrentWebShell()` and `AutoByteusMobileShellSmokeTest` call sites were updated accordingly.
- Cleanup: removed `@Suppress("UNUSED_PARAMETER")`, the now-unused `SavedNodeProfile` import from `WebShellScreen.kt`, and the no-longer-needed test helper/call-site profile arguments.
- Boundary check: this is a narrow Android UI API cleanup only; no backend, mobile web run/chat behavior, pairing protocol, `TrustedNavigationPolicy`, WebView file chooser, or WebView security posture change was made.

## UX Rework Update For `REQ-ANDROID-UX-021` / `AC-ANDROID-UX-015`

- User-requested issue fixed: the native Android wrapper no longer reserves a persistent top toolbar above healthy `/mobile` WebView content.
- Implementation: `WebShellScreen.render()` now uses a full-viewport `FrameLayout` root and adds the WebView directly as the only child when `diagnostic == null`.
- Recovery preservation: `Retry`, `Edit`, and `Browser` remain available in the diagnostic overlay when a recoverable WebView/native diagnostic is active. Connection-screen re-entry remains available through the existing Android back behavior/edit flow.
- UI evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/android-webview-toolbar-ux-rework-evidence.md` records render-tree/source inspection showing the healthy state has no persistent native `EDIT NODE`, `RETRY`, or `BROWSER` header and documents the focused instrumentation coverage.
- Boundary check: no backend, mobile web run/chat behavior, pairing protocol, `TrustedNavigationPolicy`, WebView file chooser, or WebView security posture change was made for this UX rework.

## Key Files Or Areas

- Android project/build:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/settings.gradle.kts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/build.gradle.kts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/gradle.properties`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/build.gradle.kts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/src/main/AndroidManifest.xml`
- Android shell/state/UI:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/src/main/java/org/autobyteus/mobile/MainActivity.kt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/src/main/java/org/autobyteus/mobile/shell/AndroidAppShellViewModel.kt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/src/main/java/org/autobyteus/mobile/shell/AndroidExternalActions.kt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/src/main/java/org/autobyteus/mobile/shell/ConnectionInputResolver.kt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/src/main/java/org/autobyteus/mobile/ui/ConnectionScreen.kt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/src/main/java/org/autobyteus/mobile/ui/WebShellScreen.kt` — healthy state is now full-viewport WebView; recovery actions only overlay diagnostics.
- Android connection/web boundaries:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/src/main/java/org/autobyteus/mobile/connection/SavedNodeProfile.kt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/src/main/java/org/autobyteus/mobile/connection/SavedNodeStore.kt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/src/main/java/org/autobyteus/mobile/connection/NodeUrlNormalizer.kt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/src/main/java/org/autobyteus/mobile/connection/PairingLinkParser.kt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/src/main/java/org/autobyteus/mobile/connection/ConnectionValidator.kt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/src/main/java/org/autobyteus/mobile/connection/ConnectionDiagnostic.kt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/src/main/java/org/autobyteus/mobile/web/AutoByteusWebView.kt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/src/main/java/org/autobyteus/mobile/web/TrustedNavigationPolicy.kt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/src/main/java/org/autobyteus/mobile/web/WebFileChooserCoordinator.kt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/src/main/java/org/autobyteus/mobile/web/FileChooserRequestPolicy.kt`
- Tests and live validation helper:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/src/test/java/org/autobyteus/mobile/connection/NodeUrlNormalizerTest.kt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/src/test/java/org/autobyteus/mobile/connection/PairingLinkParserTest.kt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/src/test/java/org/autobyteus/mobile/web/TrustedNavigationPolicyTest.kt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/src/test/java/org/autobyteus/mobile/connection/ConnectionDiagnosticMapperTest.kt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/src/test/java/org/autobyteus/mobile/web/FileChooserRequestPolicyTest.kt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/src/androidTest/java/org/autobyteus/mobile/AutoByteusMobileShellSmokeTest.kt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/scripts/android-live-smoke.sh`
- Web/docs seams:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-web/pages/mobile.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-web/public/mobile.webmanifest`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-web/public/icons/autobyteus-mobile-192.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-web/public/icons/autobyteus-mobile-512.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-web/components/settings/PhoneAccessCard.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-web/localization/messages/en/settings.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-web/localization/messages/zh-CN/settings.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-web/docs/remote_access.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/android_mobile_access.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/android-webview-toolbar-ux-rework.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/android-webview-toolbar-ux-rework-evidence.md`

## Important Assumptions

- Android uses platform views instead of Compose to keep the new package dependency-light; this keeps the same designed ownership boundaries.
- QR scanning launches a compatible external QR scanner by intent. Paste/share/manual link entry is implemented for deterministic setup and validation.
- HTTP private URLs are technically permitted by Android network config so acknowledged LAN/tailnet HTTP can work, but the app requires explicit HTTP acknowledgement before saving/opening an HTTP profile.
- The app validates `/rest/remote-access/status` before saving/opening a node. It does not authenticate or call product APIs directly.
- Native credential storage is intentionally not implemented. WebView-local `localStorage` remains the MVP credential store owned by the existing mobile web shell.
- No Gradle wrapper was added; docs use the environment Gradle command.

## Known Risks

- Live Android/Tailscale behavior still needs API/E2E validation on a USB-connected physical Android device. Implementation checks built and unit-tested the app but did not perform live pairing/restore.
- The healthy-state native toolbar removal is covered by UI render-tree inspection/instrumentation compile coverage, but API/E2E should still capture a real-device screenshot showing healthy `/mobile` content without the persistent native `EDIT NODE` / `RETRY` / `BROWSER` header.
- QR scan UX depends on an installed scanner app. Paste/share/manual URL setup is the reliable MVP path if no scanner exists.
- Android WebView file chooser source wiring and content-URI readability are now implemented and compile/unit/instrumentation-covered, but the corrected attachment upload path still needs API/E2E device revalidation.
- `pnpm -C autobyteus-web build:mobile-web` still reports existing bundle-size/dynamic-import warnings unrelated to this change.
- Gradle reports deprecation warnings from the current Gradle/AGP toolchain combination; build/test tasks still pass.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature / app-shell packaging and connection journey.
- Reviewed root-cause classification: No Design Issue Found for existing Phone Access/mobile core; Boundary Or Ownership Issue only if Android duplicates mobile/core behavior.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): No core refactor needed now.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A.
- Evidence / notes: Implementation added an isolated Android shell package and narrow web/docs metadata/copy only. No backend run/chat/runtime files were changed. Android does not implement native run/chat/product clients, duplicate pairing exchange, native credential bridge, or broad JavaScript bridge.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: after the `CR-002` cleanup, `WebShellScreen.kt` is 70 effective non-empty lines and `MainActivity.kt` is 216 effective non-empty lines. No changed implementation source file exceeds 500 effective non-empty lines or crosses the proactive `>220` pressure threshold.

## Environment Or Dependency Notes

- Android build uses AGP `8.13.2`, Kotlin Android plugin `2.0.21`, compile SDK `35`, min SDK `26`, target SDK `35`.
- `ANDROID_HOME=/Users/normy/Library/Android/sdk` was used for local Android checks.
- `pnpm install --frozen-lockfile --offline` was run to hydrate workspace `node_modules` for web checks; generated dependency/build outputs are ignored.
- Android ignored build output includes `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/build/outputs/apk/debug/app-debug.apk` for local smoke/install use.

## Local Implementation Checks Run

Implementation-scoped checks only:

- `ANDROID_HOME=/Users/normy/Library/Android/sdk gradle -p autobyteus-android :app:testDebugUnitTest :app:assembleDebug :app:compileDebugAndroidTestKotlin` — Passed after the `CR-002` obsolete `WebShellScreen.render()` profile-parameter cleanup.
- `pnpm -C autobyteus-web guard:web-boundary` — Passed after the Android WebView toolbar UX rework.
- `pnpm -C autobyteus-web guard:localization-boundary` — Passed after the Android WebView toolbar UX rework.
- `pnpm -C autobyteus-web audit:localization-literals` — Passed after the Android WebView toolbar UX rework with zero unresolved findings; emitted the existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning for the localization audit script.
- `pnpm -C autobyteus-web build:mobile-web` — Passed; emitted existing Vite chunk-size/dynamic-import warnings.
- `git diff --check` — Passed after the `CR-002` cleanup.
- Source file size guard script/check — Passed after the `CR-002` cleanup; `WebShellScreen.kt` is 70 effective non-empty lines and largest changed Android source implementation file remains `MainActivity.kt` at 216 effective non-empty lines.

## Downstream Validation Hints / Suggested Scenarios

- Run the live-device helper:
  - `autobyteus-android/scripts/android-live-smoke.sh autobyteus-android/app/build/outputs/apk/debug/app-debug.apk docs/task-artifacts/android-tailscale-mobile-shell/e2e-evidence`
- Validate paste/share/manual stable URL setup using `https://<desktop-machine>.<tailnet>.ts.net/mobile`.
- Validate existing `/mobile?pairing=` flow opens and stores the web-side mobile credential.
- Revalidate healthy WebView UX on a real Android device: open a reachable saved `/mobile` node and capture a screenshot showing no persistent native `EDIT NODE`, `RETRY`, or `BROWSER` header above the mobile content.
- Revalidate `VAL-ANDROID-006` on a real Android device: tap the existing mobile upload control, confirm the native picker appears, select a small file, confirm `AutoByteusFileChooser` logs one selected item, and confirm the mobile composer increments to at least `Context Files (1)` or shows an upload placeholder/thumbnail.
- Force-stop/reopen Android and confirm saved-node restore without a fresh scan when the same stable origin is reachable.
- Test unreachable saved URL or Tailscale-off state and confirm the native recovery copy appears instead of a raw WebView error.
- Verify unrelated external links open outside the WebView and same-origin desktop paths such as `/workspace` are blocked rather than loaded.
- Confirm the mobile manifest is discoverable from `/mobile` and no service worker/offline authenticated cache was added.
- Record development-node vs packaged-Electron desktop-node mode in validation evidence.

## API / E2E / Executable Validation Still Required

API/E2E remains required before delivery. It should cover a USB-connected Android phone signed into Tailscale, a reachable AutoByteus desktop/server node with Phone Access enabled, APK install/clear/launch, pairing, Chat attachment upload through the native picker, saved-node restore after force-stop, unreachable-node diagnostics, evidence capture, and packaged-Electron smoke if final release readiness includes packaged desktop behavior.
