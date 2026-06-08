# AutoByteus iOS Mobile Shell

This project builds the native iOS wrapper for the existing AutoByteus `/mobile` experience. It does **not** run AutoByteus locally on iOS and it does not implement Home, Chat, Runs, Files, Activity, agent/team setup, or mobile credential exchange natively.

## What the app owns

- first-run scan/paste/manual node URL entry;
- app-owned Phone Access QR scanning and iOS camera-permission recovery;
- native persistence of saved node profile metadata only;
- reachability checks against `/rest/remote-access/status`;
- `WKWebView` containment for the saved AutoByteus origin;
- Tailscale-oriented diagnostics and recovery actions;
- safe share-extension pending-input handoff.

The existing `/mobile` web shell owns AutoByteus product UI and WebView-local mobile credential storage. Native iOS code must not persist `mra_...` credentials.

## Prerequisites

- macOS with Xcode installed.
- XcodeGen (`brew install xcodegen`).
- An iOS simulator runtime for simulator builds/tests.

## Generate, build, and test

From the repository root:

```bash
autobyteus-ios/scripts/generate-project.sh
xcodebuild \
  -project autobyteus-ios/AutoByteusMobile.xcodeproj \
  -scheme AutoByteusMobile \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  build
```

Core unit tests:

```bash
xcodebuild \
  -project autobyteus-ios/AutoByteusMobile.xcodeproj \
  -scheme AutoByteusMobile \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  -only-testing:AutoByteusMobileCoreTests \
  test
```

Simulator smoke path with a fake AutoByteus node:

```bash
autobyteus-ios/scripts/ios-simulator-smoke.sh tickets/ios-wrapper-app/e2e-evidence
```

The smoke script starts a local fake `/rest/remote-access/status` + `/mobile` server, injects the fake URL through UI-test build settings/Info.plist, runs the UI smoke tests, fails if those tests skip, stores an `.xcresult` with screenshots, and captures signing-readiness output. API/E2E owns authoritative simulator evidence; implementation may run this as a confidence check when time/environment allow.

## Signing readiness

Discovery only, no App Store Connect upload:

```bash
autobyteus-ios/scripts/ios-signing-readiness.sh tickets/ios-wrapper-app/signing-readiness
```

Optional archive dry run when a team is intentionally supplied:

```bash
IOS_DEVELOPMENT_TEAM=<TEAMID> IOS_SIGNING_READINESS_ARCHIVE=1 \
  autobyteus-ios/scripts/ios-signing-readiness.sh tickets/ios-wrapper-app/signing-readiness
```

The script records Xcode version/path, simulator inventory, public code-signing identity names/hashes, detected provisioning teams, profiles from both `~/Library/MobileDevice/Provisioning Profiles` and `~/Library/Developer/Xcode/UserData/Provisioning Profiles`, separate app and share-extension development/App-Store profile counts, wildcard development profile matches, App Group entitlement matches, optional archive status, readiness reasons, and a readiness classification. It distinguishes simulator readiness, development-device profile readiness, development-device App Group gaps, and App Store/TestFlight/archive readiness. It does not report App Store/archive readiness unless a dry-run archive passes or an Apple/iOS Distribution identity plus exact app + share-extension App Store/TestFlight profiles with the requested App Group are present. It never uploads to App Store Connect and does not print private keys or API credentials.

## GitHub Actions / TestFlight upload

`.github/workflows/release-ios.yml` provides the iOS CI release path:

- tag pushes matching `v*` and manual `workflow_dispatch` runs always run simulator build/test artifacts first;
- manual build-only runs use `publish_app_store_connect=false` and do not require Apple distribution secrets;
- tag pushes and manual publish runs use a guarded App Store Connect/TestFlight publish path only after all iOS-specific secrets are present;
- missing publish secrets fail fast with exact missing names and `gh secret set <NAME>` guidance before any keychain, profile, archive, export, or upload step;
- upload uses App Store Connect API-key auth through `xcrun altool` and does not submit for final App Store review/public release.

Required repository secrets for the publish path:

```text
IOS_DISTRIBUTION_CERTIFICATE_P12_BASE64
IOS_DISTRIBUTION_CERTIFICATE_P12_PASSWORD
IOS_APPSTORE_PROVISIONING_PROFILE_BASE64
IOS_SHARE_EXTENSION_APPSTORE_PROVISIONING_PROFILE_BASE64
IOS_DEVELOPMENT_TEAM
APP_STORE_CONNECT_KEY_ID
APP_STORE_CONNECT_ISSUER_ID
APP_STORE_CONNECT_API_KEY_P8_BASE64
```

Optional repository variables can override defaults:

```text
IOS_BUNDLE_ID=org.autobyteus.mobile
IOS_SHARE_EXTENSION_BUNDLE_ID=org.autobyteus.mobile.share
IOS_APP_SCHEME=AutoByteusMobile
IOS_ARTIFACT_PREFIX=AutoByteus_personal_ios
IOS_XCODE_APP_PATH=/Applications/Xcode_26.3.app
```

`IOS_BUNDLE_ID` and `IOS_SHARE_EXTENSION_BUNDLE_ID` are the single app/share target bundle-ID authority. The XcodeGen project defines target bundle identifiers from those build settings, and the workflow passes the same values to simulator build/test/smoke, profile verification, archive, `ExportOptions.plist`, and summaries.

`IOS_XCODE_APP_PATH` selects the Xcode app bundle used by both the simulator build/test job and the App Store Connect archive/upload job. The workflow sets `DEVELOPER_DIR`, requires the selected Xcode major version to be 26 or newer, and logs the selected Xcode plus iPhoneOS SDK before building or archiving. Override this variable only when the GitHub-hosted runner moves the required Xcode 26+ installation to a different app path.

Release metadata is split for App Store compatibility. For a tag such as `v1.2.7-rc1`, the workflow uses `ios_marketing_version=1.2.7` for `MARKETING_VERSION` / `CFBundleShortVersionString`, keeps `artifact_version=1.2.7-rc1` for artifact names, records `prerelease_label=rc1` for summaries/TestFlight notes, and uses numeric `GITHUB_RUN_NUMBER` for `CURRENT_PROJECT_VERSION` / `CFBundleVersion`.

Run `autobyteus-ios/scripts/ios-release-contract-check.py` after changing release metadata, bundle-ID, smoke, profile-verification, or upload wiring. The check covers prerelease metadata splitting, invalid release-tag rejection, custom bundle-ID propagation, build/test/archive setting propagation, profile/export mapping, and App Store Connect private-key discovery configuration.

Do not reuse the macOS desktop `APPLE_*` signing/notarization secrets for iOS. A `Developer ID Application` certificate is not valid for iOS App Store/TestFlight signing. The workflow verifies App Store profiles for the main app and share extension and rejects development/wildcard profiles with `get-task-allow=true`.

## Private HTTP and ATS

The app supports acknowledged `http://` for trusted private LAN/tailnet nodes to preserve Android wrapper parity and simulator fake-node validation. Production/travel setup should prefer HTTPS Tailscale Serve:

```text
https://<desktop-machine>.<tailnet>.ts.net/mobile
```

`NSAllowsArbitraryLoadsInWebContent` is present for private-node WebView HTTP compatibility and must be justified in App Store review notes if this app is submitted.

## Live-node / physical-device checklist

Before claiming production release readiness, validate on a physical iPhone when available:

1. Connect the iPhone and desktop/server node to the same tailnet/private network.
2. Enable Phone Access on the desktop/server node.
3. Pair using a stable HTTPS `/mobile` URL.
4. Scan QR with the in-app scanner and record camera permission/cancel recovery.
5. Confirm `/mobile` Home/Chat/Runs/Files load in the WebView.
6. Exercise attachment/file input in the WebView with a small local file.
7. Force-quit/relaunch and confirm saved-node restore.
8. Exercise an unreachable node and confirm native diagnostic recovery.
9. Record signing-readiness output for the intended bundle ID/team.

Simulator-first validation cannot prove real camera capture or every file-picker/photo-library behavior; record those as evidence gaps until a physical device is used.
