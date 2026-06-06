# iOS + Tailscale Mobile Access Guide

This guide covers the iOS app shell in `autobyteus-ios`. The app loads the existing AutoByteus `/mobile` web shell from a reachable desktop/server node.

## Ownership boundaries

- **iOS app:** native setup, QR scanning, saved node metadata, Phone Access status checks, trusted `WKWebView` containment, diagnostics, share pending-input handoff, build/signing-readiness discovery.
- **Existing `/mobile` shell:** AutoByteus Home, Chat, Runs, Files, Activity, pairing bootstrap, and WebView-local mobile credential storage.
- **Remote Access backend:** Phone Access status, pairing sessions, pairing exchange, mobile credentials, revocation, and protected route authorization.
- **Tailscale:** private network reachability only; it is not AutoByteus authorization.

The iOS app intentionally does not include a native AutoByteus runtime, duplicate chat/run UI, direct run/chat API client, or native `mra_...` credential bridge.

## Recommended stable URL

Use the final private HTTPS origin at pairing time:

```text
https://<desktop-machine>.<tailnet>.ts.net/mobile
```

The `/mobile` web shell stores the MVP mobile credential in WebView-local storage scoped to origin. Switching from a LAN origin to a Tailscale origin later can require re-pairing.

## Build and simulator validation

```bash
autobyteus-ios/scripts/generate-project.sh
xcodebuild \
  -project autobyteus-ios/AutoByteusMobile.xcodeproj \
  -scheme AutoByteusMobile \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  -only-testing:AutoByteusMobileCoreTests \
  test
```

Simulator smoke with fake node and evidence:

```bash
autobyteus-ios/scripts/ios-simulator-smoke.sh tickets/ios-wrapper-app/e2e-evidence
```

Expected simulator scenarios:

1. Enter `http://127.0.0.1:<port>/mobile` from the fake server.
2. Acknowledge private HTTP.
3. Validate `/rest/remote-access/status`.
4. Open `/mobile` in a full-viewport `WKWebView`.
5. Assert the fake `/mobile` marker `AUTOBYTEUS_FAKE_MOBILE_READY` inside `WKWebView`.
6. Force-stop/relaunch and confirm saved-node restore with the same marker.
7. Exercise an unreachable node and confirm a native diagnostic instead of a raw WebView error page.
8. Record simulator UDID/runtime, fake URL, `.xcresult`, test log, screenshots, and signing-readiness output.

## QR and file-upload evidence

The simulator should return graceful QR unavailable/cancel diagnostics when no camera exists. Physical-device evidence is still required before production release readiness claims:

- camera permission grant/deny;
- in-app QR decode;
- cancel recovery;
- `/mobile` attachment/file input through `WKWebView`/system pickers.

## Signing and App Store readiness discovery

Run:

```bash
autobyteus-ios/scripts/ios-signing-readiness.sh tickets/ios-wrapper-app/signing-readiness
```

The readiness report classifies local Xcode, simulators, public signing identities, provisioning profiles discovered in both `~/Library/MobileDevice/Provisioning Profiles` and `~/Library/Developer/Xcode/UserData/Provisioning Profiles`, app/share-extension wildcard development profile matches, exact App Store/TestFlight profile matches, App Group entitlement matches, optional archive dry run, and whether the environment appears simulator-ready, development-device profile-ready, development-device App Group-complete, or App-Store/TestFlight archive-ready. Missing distribution certificates, exact app/share profiles, or App Group entitlements are readiness gaps, not app implementation failures.

## GitHub Actions TestFlight/App Store Connect upload

The repository includes `.github/workflows/release-ios.yml` for iOS release automation:

- build-only path: tag/manual runs build and test the simulator app and upload private workflow artifacts/logs without requiring Apple distribution secrets;
- publish path: tag pushes and manual runs with `publish_app_store_connect=true` attempt App Store Connect/TestFlight upload only after all required iOS/App Store Connect secrets are present;
- missing-secret gate: publish requests fail before keychain/profile/archive/upload and list exact missing names with `gh secret set <NAME>` guidance;
- final public App Store review, listing metadata, privacy questionnaire, and release approval remain outside this workflow.

Required publish secrets:

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

Optional non-secret repository variables:

```text
IOS_BUNDLE_ID
IOS_SHARE_EXTENSION_BUNDLE_ID
IOS_APP_SCHEME
IOS_ARTIFACT_PREFIX
```

`IOS_BUNDLE_ID` and `IOS_SHARE_EXTENSION_BUNDLE_ID` are the single app/share bundle-ID source for generated Xcode targets, build-only simulator checks, App Store profile verification, `ExportOptions.plist`, and workflow summaries. Do not configure a profile/export bundle ID that differs from the Xcode target bundle ID.

Release tags with prerelease suffixes are valid for artifacts but not for iOS bundle short versions. For `v1.2.7-rc1`, the workflow builds with `MARKETING_VERSION=1.2.7`, names artifacts with `artifact_version=1.2.7-rc1`, records `prerelease_label=rc1`, and uses numeric `GITHUB_RUN_NUMBER` as `CURRENT_PROJECT_VERSION`.

Use `autobyteus-ios/scripts/ios-release-contract-check.py` as the quick local guard when changing iOS release metadata, bundle IDs, workflow build settings, profile verification, or upload wiring.

Do not reuse macOS desktop `APPLE_*` secrets or `Developer ID Application` identities for iOS. The workflow verifies App Store profiles for both the app bundle and share extension bundle and rejects development/wildcard profiles for App Store export.

## App Store review and ATS notes

Native utility beyond a generic website wrapper should be highlighted if submitting for review:

- app-owned QR setup;
- saved node management;
- Phone Access reachability diagnostics;
- trusted-origin containment;
- Tailscale/private-node recovery guidance;
- share pending-input handoff.

The app supports acknowledged private `http://` for LAN/tailnet parity and simulator validation. HTTPS Tailscale Serve is recommended for real travel use. Any App Store submission should justify `NSAllowsArbitraryLoadsInWebContent` or tighten ATS policy if Apple review requires it.
