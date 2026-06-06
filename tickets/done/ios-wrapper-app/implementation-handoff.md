# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/design-review-report.md`
- Prior code review report / rework context: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/code-review-report.md`

## What Changed

- Added a new native iOS wrapper project under `autobyteus-ios` with `project.yml` as the authoritative XcodeGen source.
- Added a Foundation-only `AutoByteusMobileCore` framework for URL normalization, pairing parsing, input resolution, status validation, saved-node metadata persistence, trusted navigation policy, diagnostics, and pending share input.
- Added UIKit/WebKit/AVFoundation app shell files for native setup, QR scanning, `/mobile` `WKWebView` hosting, overlay recovery, external-opening actions, privacy/ATS metadata, App Group entitlements, and AutoByteus app icons.
- Added a share extension that stores text/URL/pairing payloads through a consume-once pending-input store instead of using unsupported extension app-launch behavior.
- Added iOS unit tests for Android-equivalent URL, pairing, HTTP acknowledgement, diagnostics/status mapping, saved-node serialization, pending share input, and navigation-policy examples.
- Added simulator/readiness tooling: XcodeGen generation, fake mobile server, simulator smoke script, signing-readiness script, and App Store profile verification script.
- Added `.github/workflows/release-ios.yml` implementing the round-4 DS-IOS-009 GitHub Actions/App Store Connect/TestFlight contract.
- Added iOS docs in `autobyteus-ios/README.md` and `docs/ios_mobile_access.md`, updated root release docs in `README.md`, and added `.gitignore` rules for generated/local iOS artifacts.

## Code Review Local Fixes Previously Applied

- CVR-001 fixed:
  - Added `autobyteus-ios/AutoByteusMobileUITests/Info.plist` with `AUTOBYTEUS_TEST_NODE_URL` and `AUTOBYTEUS_SMOKE_TESTS_REQUIRED` build-setting injection so the UI test process receives script-controlled smoke configuration.
  - Updated `ios-simulator-smoke.sh` to pass those build settings, run only the UI smoke tests, fail on skipped smoke tests, and require both expected UI tests to pass.
  - Strengthened `AutoByteusMobileUITests` to assert `AUTOBYTEUS_FAKE_MOBILE_READY` inside `WKWebView` after first open and after restore, and to attach screenshots for loaded/restored/diagnostic states.
- CVR-002 fixed:
  - Tightened `ios-signing-readiness.sh` to report app bundle ID, share-extension bundle ID, requested App Group, separate app/share profile counts, App Group entitlement matches, profile-entitlement completeness, archive-prerequisite completeness, readiness reasons, and JSON equivalents.
  - Final classification no longer reaches App Store/archive-ready unless an explicit archive dry run passes or distribution identity plus app/share profiles with requested App Group are present.
- Architecture round-2 signing evidence update applied:
  - `ios-signing-readiness.sh` scans both `~/Library/MobileDevice/Provisioning Profiles` and `~/Library/Developer/Xcode/UserData/Provisioning Profiles`, including `.mobileprovision` and `.provisionprofile` files.
  - The script deduplicates profiles by UUID, reports detected provisioning teams without hard-coding a team assumption, filters by `IOS_DEVELOPMENT_TEAM` only when provided, supports wildcard development profiles such as `7Y86YBQ7B4.*`, and separates development-device profile readiness from App Group entitlement readiness and App Store/TestFlight archive readiness.

## Round-4 GitHub Actions / TestFlight Scope Implemented

- Added `.github/workflows/release-ios.yml` with:
  - triggers for `push` tags `v*` and `workflow_dispatch`;
  - manual inputs `publish_app_store_connect`, `release_tag`, `release_ref`, and `prerelease`;
  - release metadata outputs for release tag/ref, semantic core version, prerelease label, iOS marketing version, numeric build number, checked-out SHA, artifact version, and publish intent;
  - build-only simulator build/test/smoke artifact path that does not require Apple distribution secrets;
  - exact publish secret gate for `IOS_DISTRIBUTION_CERTIFICATE_P12_BASE64`, `IOS_DISTRIBUTION_CERTIFICATE_P12_PASSWORD`, `IOS_APPSTORE_PROVISIONING_PROFILE_BASE64`, `IOS_SHARE_EXTENSION_APPSTORE_PROVISIONING_PROFILE_BASE64`, `IOS_DEVELOPMENT_TEAM`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, and `APP_STORE_CONNECT_API_KEY_P8_BASE64`;
  - fail-fast missing-secret messages with exact `gh secret set <NAME>` guidance before keychain/profile/archive/export/upload;
  - temporary keychain import, distribution identity check, App Store profile decode/verification/install, manual `ExportOptions.plist`, archive/export `.ipa`, checksum, and sanitized artifacts;
  - `xcrun altool --upload-app` App Store Connect/TestFlight upload using API-key auth, with `API_PRIVATE_KEYS_DIR` pointing at the temporary `AuthKey_<KEY>.p8` directory;
  - cleanup for temporary keychain, certificate, API key, and installed profiles;
  - explicit non-goals: no desktop `APPLE_*` secret fallback, no `Developer ID Application` iOS signing, no development/wildcard profile App Store archive, and no final public App Store review/release submission.
- Added `autobyteus-ios/scripts/verify-appstore-profile.py` to enforce App Store profile invariants before publish: iOS platform, expected team, exact app identifier, `get-task-allow=false`, no provisioned devices/all-devices profile, and non-expired profile.
- Updated `autobyteus-ios/project.yml` with target-specific App Store profile specifier build-setting hooks for the main app and share extension so publish archive can supply separate profile names.
- Updated docs to describe build-only vs guarded publish, required iOS/App Store Connect secrets, optional iOS repository variables, `gh secret set` setup, TestFlight upload boundary, and final App Store review/listing/privacy work remaining out of scope.

## Round-5 Release Automation Rework Applied

- CVR-003 fixed after architecture round 5:
  - Added `autobyteus-ios/scripts/resolve-ios-release-metadata.py` as the release metadata authority. It accepts `vMAJOR.MINOR.PATCH[-PRERELEASE]`, derives `ios_marketing_version=MAJOR.MINOR.PATCH` for iOS `MARKETING_VERSION` / `CFBundleShortVersionString`, preserves `artifact_version` with any prerelease suffix for artifact names/summaries, records `prerelease_label`, and uses numeric `GITHUB_RUN_NUMBER` as `build_number` / `CURRENT_PROJECT_VERSION`.
  - Replaced stale workflow `version_name` handling with explicit `semantic_version_core`, `prerelease_label`, `ios_marketing_version`, `artifact_version`, and `build_number` outputs.
- CVR-004 fixed:
  - `IOS_BUNDLE_ID` and `IOS_SHARE_EXTENSION_BUNDLE_ID` now drive `autobyteus-ios/project.yml` app/share `PRODUCT_BUNDLE_IDENTIFIER` settings through XcodeGen build settings.
  - `autobyteus-ios/scripts/generate-project.sh` supplies default bundle IDs for local generation, while workflow build/test/smoke/archive, App Store profile verification, `ExportOptions.plist`, and summaries consume the same app/share bundle-ID settings.
  - The app URL scheme metadata now uses the same bundle-ID authority instead of a second hard-coded app bundle ID.
- CVR-005 fixed:
  - Build-only simulator build, core tests, and simulator smoke all receive the same `IOS_BUNDLE_ID`, `IOS_SHARE_EXTENSION_BUNDLE_ID`, `MARKETING_VERSION=${ios_marketing_version}`, and `CURRENT_PROJECT_VERSION=${build_number}` values used by archive.
  - `ios-simulator-smoke.sh` validates that `MARKETING_VERSION` is numeric `MAJOR.MINOR.PATCH` and `CURRENT_PROJECT_VERSION` is numeric only, passes both into UI-test `xcodebuild`, and records bundle/version settings in smoke evidence.
- Added `autobyteus-ios/scripts/ios-release-contract-check.py` as durable static/executable coverage for prerelease metadata splitting, invalid release-tag rejection, bundle-ID authority wiring, build/test/archive build-setting propagation, profile/export bundle mapping, and altool private-key discovery configuration. The GitHub Actions build job runs this check before Xcode build/test/smoke.
- Updated `autobyteus-ios/README.md`, `docs/ios_mobile_access.md`, and root `README.md` to document the split metadata model and single bundle-ID authority.

## Key Files Or Areas

- `.github/workflows/release-ios.yml`
- `autobyteus-ios/project.yml`
- `autobyteus-ios/AutoByteusMobileCore/*.swift`
- `autobyteus-ios/AutoByteusMobile/*.swift`
- `autobyteus-ios/AutoByteusMobileShareExtension/*.swift`
- `autobyteus-ios/AutoByteusMobileCoreTests/*.swift`
- `autobyteus-ios/AutoByteusMobileUITests/Info.plist`
- `autobyteus-ios/AutoByteusMobileUITests/AutoByteusMobileUITests.swift`
- `autobyteus-ios/scripts/generate-project.sh`
- `autobyteus-ios/scripts/resolve-ios-release-metadata.py`
- `autobyteus-ios/scripts/ios-release-contract-check.py`
- `autobyteus-ios/scripts/ios-signing-readiness.sh`
- `autobyteus-ios/scripts/ios-simulator-smoke.sh`
- `autobyteus-ios/scripts/verify-appstore-profile.py`
- `autobyteus-ios/README.md`
- `docs/ios_mobile_access.md`
- `README.md`
- `.gitignore`

## Important Assumptions

- `project.yml` remains authoritative; `autobyteus-ios/AutoByteusMobile.xcodeproj` is generated locally by `autobyteus-ios/scripts/generate-project.sh` and intentionally ignored.
- `IOS_BUNDLE_ID` and `IOS_SHARE_EXTENSION_BUNDLE_ID` are the app/share target bundle-ID authority. Defaults are `org.autobyteus.mobile` and `org.autobyteus.mobile.share`, but workflow/local builds can override them through build settings without changing a second profile/export mapping source.
- The native iOS app only validates `/rest/remote-access/status` and hosts the existing `/mobile` shell. It does not own pairing exchange, chat/run/files APIs, or mobile credentials.
- The share extension uses App Group `group.org.autobyteus.mobile`; physical-device/App Store signing readiness depends on matching app and extension profiles/entitlements, surfaced by readiness tooling and enforced by CI publish profile checks.
- The detected local team `7Y86YBQ7B4` is environment evidence only. CI publish reads `IOS_DEVELOPMENT_TEAM` and exact iOS/App Store Connect secrets from GitHub, not local Xcode login state or desktop `APPLE_*` secrets.
- The broad web-content ATS allowance is included for private HTTP parity and simulator fake-node validation; docs recommend HTTPS Tailscale Serve for production/travel.
- The worktree remains behind `origin/personal` by 7 commits; delivery/finalization should refresh against the recorded base branch before repository finalization.

## Known Risks

- Physical iPhone QR scanning and full WKWebView attachment/file-input proof remain downstream/live-device evidence items.
- Signing-readiness output on this machine reports an Apple Development identity plus an Xcode UserData iOS wildcard development provisioning profile for team `7Y86YBQ7B4`; development-device profile prerequisites are true, but App Group profile prerequisites are false, and no Apple/iOS Distribution identity or exact App Store/TestFlight app/share profiles are detected.
- GitHub iOS publish cannot pass until repository secrets for iOS distribution signing and App Store Connect API-key upload are configured; build-only should remain viable and publish should fail at the explicit missing-secret gate until then.
- `xcrun altool` upload and `API_PRIVATE_KEYS_DIR` / `AuthKey_<KEY>.p8` discovery still need proof on the GitHub macOS runner once publish-path secrets are configured.
- App Store Guideline 4.2 and ATS review risk remains; docs preserve native utility and HTTP-justification notes. Final App Store review/listing/privacy/public-release work is out of scope.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature
- Reviewed root-cause classification: No Design Issue Found
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): No Refactor Needed for Android/backend/mobile-web/release-system; iOS wrapper and iOS release automation are sibling owners.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes: Existing Android/backend/mobile-web product ownership remains unchanged. App shell routes through `ConnectionInputResolver`, `ConnectionValidator`, `SavedNodeStore`, and `TrustedNavigationPolicy`. Release automation is isolated in `.github/workflows/release-ios.yml` and does not reuse desktop Apple secrets.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: None
- Legacy old-behavior retained in scope: No
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: Yes; no existing iOS legacy path existed, and no native credential bridge/local runtime/unrestricted browser path was introduced.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): Yes
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: Yes
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): Yes; source implementation files remain under the guardrail. The workflow and validation scripts are tooling artifacts and were checked with actionlint/syntax checks.
- Notes: Core target stayed Foundation-only. The only `mra_...` Swift mentions are a no-storage comment and a unit-test assertion that saved profile JSON does not contain that marker.

## Environment Or Dependency Notes

- Local Xcode observed: Xcode 26.1.1 (build 17B100).
- XcodeGen is available at `/opt/homebrew/bin/xcodegen` in this environment.
- Build/test used iOS Simulator destination `platform=iOS Simulator,name=iPhone 17`; smoke script selected simulator UDID `8E8844A9-04F1-4729-A417-52DE909E0A92`.
- Local provisioning profile evidence is under Xcode UserData (`~/Library/Developer/Xcode/UserData/Provisioning Profiles`); the legacy `~/Library/MobileDevice/Provisioning Profiles` directory is absent on this machine.
- Generated `.xcodeproj` exists locally for checks but is ignored by git.

## Local Implementation Checks Run

Implementation-scoped checks only:

1. `autobyteus-ios/scripts/generate-project.sh` — passed after bundle-ID build-setting defaults were added.
2. `autobyteus-ios/scripts/ios-release-contract-check.py` — passed; executable cases cover `v1.2.7-rc1` => `ios_marketing_version=1.2.7`, `artifact_version=1.2.7-rc1`, `prerelease_label=rc1`, numeric build `456`; build-only branch metadata; invalid tag rejection; static bundle/version/profile/export/altool workflow wiring.
3. `actionlint .github/workflows/release-ios.yml` and `ruby -e 'require "yaml"; YAML.load_file(".github/workflows/release-ios.yml")'` — passed.
4. `bash -n autobyteus-ios/scripts/generate-project.sh autobyteus-ios/scripts/ios-simulator-smoke.sh autobyteus-ios/scripts/ios-signing-readiness.sh` — passed.
5. `python3 -m py_compile autobyteus-ios/scripts/fake-mobile-server.py autobyteus-ios/scripts/ios-release-contract-check.py autobyteus-ios/scripts/resolve-ios-release-metadata.py autobyteus-ios/scripts/verify-appstore-profile.py` — passed.
6. `plutil -lint` for app/share/UI-test plist and entitlement files — passed.
7. Release metadata resolver samples:
   - `v1.2.7-rc1` tag case — passed with numeric iOS marketing version `1.2.7`, artifact version `1.2.7-rc1`, prerelease label `rc1`, numeric build `456`, publish requested `true`.
   - build-only branch case — passed with `ios_marketing_version=0.1.0`, `artifact_version=ci-789`, numeric build `789`, publish requested `false`.
8. Invalid simulator smoke version guard: `MARKETING_VERSION=1.2.7-rc1 autobyteus-ios/scripts/ios-simulator-smoke.sh ...` — failed early with expected exit status `64`, proving prerelease suffixes cannot enter iOS `MARKETING_VERSION` through smoke.
9. Custom bundle/version generated-build-settings proof:
   - Generated the project with `IOS_BUNDLE_ID=com.example.autobyteus.mobile` and `IOS_SHARE_EXTENSION_BUNDLE_ID=com.example.autobyteus.mobile.share`; `xcodebuild -showBuildSettings` without additional bundle-ID overrides showed app target `PRODUCT_BUNDLE_IDENTIFIER=com.example.autobyteus.mobile` and share target `PRODUCT_BUNDLE_IDENTIFIER=com.example.autobyteus.mobile.share`.
   - Ran `xcodebuild -showBuildSettings` with `MARKETING_VERSION=1.2.7` and `CURRENT_PROJECT_VERSION=456`; output showed the custom app/share bundle IDs plus marketing version `1.2.7` and current project version `456`.
10. `xcodebuild -project autobyteus-ios/AutoByteusMobile.xcodeproj -scheme AutoByteusMobile -destination 'platform=iOS Simulator,id=8E8844A9-04F1-4729-A417-52DE909E0A92' -only-testing:AutoByteusMobileCoreTests IOS_BUNDLE_ID=org.autobyteus.mobile IOS_SHARE_EXTENSION_BUNDLE_ID=org.autobyteus.mobile.share MARKETING_VERSION=0.1.0 CURRENT_PROJECT_VERSION=1 test` — passed; 21 unit tests.
11. Custom bundle/version simulator smoke: `IOS_BUNDLE_ID=com.example.autobyteus.mobile IOS_SHARE_EXTENSION_BUNDLE_ID=com.example.autobyteus.mobile.share MARKETING_VERSION=1.2.7 CURRENT_PROJECT_VERSION=456 autobyteus-ios/scripts/ios-simulator-smoke.sh tickets/ios-wrapper-app/implementation-evidence/simulator-smoke-custom-bundle` — passed; 2 UI smoke tests executed, 0 skipped, fake `/mobile` marker asserted after open and restore, unreachable diagnostic asserted, app launched as `com.example.autobyteus.mobile`, and smoke-captured signing readiness used the custom app/share IDs.
12. `python3 -m json.tool` on standalone and smoke signing-readiness JSON plus metadata evidence JSON — passed.
13. Previous signing-readiness and negative App Store profile checks remain applicable: local wildcard development profile classification is `development-device-profile-ready-app-group-incomplete`; `verify-appstore-profile.py` rejects wildcard/development profiles for App Store export.
14. Boundary greps from prior implementation remain applicable: no `UIKit`/`WebKit`/`AVFoundation` imports in `AutoByteusMobileCore`; no native Swift credential storage path found.

Relevant evidence:

- Round-5 static/release-contract checks: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/implementation-evidence/release-workflow/static-checks.log`
- Prerelease metadata sample: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/implementation-evidence/release-workflow/metadata-prerelease-tag.json`
- Build-only metadata sample: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/implementation-evidence/release-workflow/metadata-build-only.json`
- Invalid smoke version guard: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/implementation-evidence/release-workflow/invalid-smoke-version.log`
- Custom bundle generated-project summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/implementation-evidence/release-workflow/custom-bundle-envonly-summary.log`
- Custom bundle/version build-settings summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/implementation-evidence/release-workflow/custom-bundle-version-summary.log`
- Custom bundle/version smoke summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/implementation-evidence/simulator-smoke-custom-bundle/summary.txt`
- Custom bundle/version smoke log: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/implementation-evidence/simulator-smoke-custom-bundle/xcodebuild-test.log`
- Custom bundle/version smoke result bundle: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/implementation-evidence/simulator-smoke-custom-bundle/AutoByteusMobile.xcresult`
- Custom smoke signing readiness: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/implementation-evidence/simulator-smoke-custom-bundle/signing-readiness/ios-signing-readiness.txt`
- Core unit test summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/implementation-evidence/core-tests-after-release-rework/summary.txt`
- Core unit test log/result: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/implementation-evidence/core-tests-after-release-rework/xcodebuild-core-tests.log`, `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/implementation-evidence/core-tests-after-release-rework/AutoByteusMobileCoreTests.xcresult`
- Previous baseline smoke summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/implementation-evidence/simulator-smoke/summary.txt`
- Previous standalone signing readiness: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/implementation-evidence/signing-readiness/ios-signing-readiness.txt`
- Previous standalone signing readiness JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app/implementation-evidence/signing-readiness/ios-signing-readiness.json`

## Downstream Validation Hints / Suggested Scenarios

- API/E2E can rerun `autobyteus-ios/scripts/ios-simulator-smoke.sh <evidence-dir>`; the script should fail if the UI smoke tests skip.
- API/E2E should include a prerelease/custom-bundle path equivalent to the local round-5 smoke: `IOS_BUNDLE_ID=<app id> IOS_SHARE_EXTENSION_BUNDLE_ID=<share id> MARKETING_VERSION=1.2.7 CURRENT_PROJECT_VERSION=<numeric> autobyteus-ios/scripts/ios-simulator-smoke.sh <evidence-dir>`.
- For release workflow CI, validate that a `v1.2.7-rc1` tag or manual input uses `MARKETING_VERSION=1.2.7`, `CURRENT_PROJECT_VERSION=<numeric run number>`, and keeps `1.2.7-rc1` only for artifact/release metadata.
- Confirm fake `/mobile` marker appears in `WKWebView`, then force-stop/relaunch and confirm saved-node restore.
- Exercise disabled/unreachable node diagnostics and ensure native recovery appears before WebView raw errors.
- Run signing-readiness with intended `IOS_DEVELOPMENT_TEAM` and optional `IOS_SIGNING_READINESS_ARCHIVE=1` when credentials/team are available; the detected local team `7Y86YBQ7B4` is environment evidence, not a hard-coded product assumption.
- Validate `.github/workflows/release-ios.yml` build-only behavior in GitHub Actions when a runner is available.
- Validate publish-request missing-secret behavior in GitHub Actions: with iOS secrets absent, build-only artifacts should upload and publish should fail fast with exact missing `IOS_*` / `APP_STORE_CONNECT_*` names before keychain/profile/archive/upload.
- When complete iOS/App Store Connect secrets are configured, validate temp keychain/profile import, app + share profile verification, archive/export `.ipa`, checksum, `API_PRIVATE_KEYS_DIR`/`AuthKey_<KEY>.p8` discovery, and `xcrun altool` upload to App Store Connect/TestFlight.
- On a physical iPhone, validate QR camera grant/deny/cancel/decode and attachment/file input through the existing `/mobile` shell before any production release-readiness claim.

## API / E2E / Executable Validation Still Required

- API/E2E should rerun simulator-first fake-node UI/E2E smoke and capture its own evidence.
- Signing-readiness report capture and classification by API/E2E.
- GitHub Actions iOS build-only path execution or equivalent documented deferral.
- GitHub Actions publish missing-secret gate execution or equivalent documented deferral while secrets are absent.
- Full App Store Connect/TestFlight publish path only when exact iOS signing/App Store Connect secrets are available.
- Physical-device QR and file-upload evidence before any production release-readiness claim.
- Live-node/Tailscale pairing evidence when a real Phone Access node/device is available.
