# AutoByteus iOS Mobile Shell

This project builds the native iOS wrapper for the existing AutoByteus `/mobile` experience. It does **not** run AutoByteus locally on iOS and it does not implement the run list, the run screen and its views, New run, or mobile credential exchange natively. It bundles one build of those same web screens, the demo (`DemoWeb/`, autobyteus-279), which runs on sample data with no network.

## What the app owns

- the scan-first start screen, as on Android (`Start/`): Scan, **Try demo**, the saved nodes ("Your nodes"), and **Other ways to connect** (Type an address, Paste a link); then Connecting and Can't reach (`Connect/`, `AutoByteusMobileCore/NodeConnectionFlow.swift`);
- app-owned Phone Access QR scanning and iOS camera-permission recovery; the demo code `autobyteus://demo` ("Demo code found");
- native persistence of saved node entry metadata only; native screens name a node by `SavedNodeEntry.shownName` ("AutoByteus node" when no name is known, never an address);
- reachability checks against `/rest/remote-access/status`;
- `WKWebView` containment for the saved AutoByteus origin, with the shell bridge `window.AutoByteusShell` (`Shell/ShellBridgeHandler.swift`, Android's contract plus `leaveDemo`; see `autobyteus-web/docs/remote_access.md`);
- the demo (`Demo/`): the bundled demo build in its own web view at `autobyteus-demo://app/`, with no network and nothing kept after Leave demo or a cold launch;
- Tailscale-oriented diagnostics and recovery actions;
- the share extension: it keeps the shared text, and the app acts on it once when it next becomes active (a pairing link connects, the demo link opens the demo, other text opens Type an address pre-filled);
- the iPad layout of its own screens (a centered 448 pt first screen, 512 pt sheets).

The existing `/mobile` web shell owns AutoByteus product UI and WebView-local mobile credential storage. Native iOS code must not persist `mra_...` credentials.

## Prerequisites

- macOS with Xcode installed.
- XcodeGen (`brew install xcodegen`).
- An iOS simulator runtime for simulator builds/tests.

## Generate, build, and test

From the repository root, after `pnpm install`. The build fails while `DemoWeb/` is missing, so make the demo build first (it is build output, not committed):

```bash
autobyteus-ios/scripts/prepare-demo-web.sh --build
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

The video loader's AVPlayer test (`AuthorizedMediaLoaderTests`, autobyteus-574) reads a 20+ MB MP4 from the host and is
skipped without it: add `TEST_RUNNER_AUTOBYTEUS_574_VIDEO=<path>` before `xcodebuild` (the `TEST_RUNNER_` prefix passes it
to the tests). The app's video player on the simulator (`NativeVideoPlayerUITests`) needs the fake node started with a
wide MP4, and is not part of the smoke run:

```bash
python3 autobyteus-ios/scripts/fake-mobile-server.py --port 29874 --video <a wide MP4> &
xcodebuild \
  -project autobyteus-ios/AutoByteusMobile.xcodeproj \
  -scheme AutoByteusMobile \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  -only-testing:AutoByteusMobileUITests/NativeVideoPlayerUITests \
  AUTOBYTEUS_TEST_NODE_URL=http://127.0.0.1:29874/mobile \
  test
```

The app's player against a real node of this worktree (`NativeVideoRealNodeUITests`, autobyteus-574 API/E2E: pairing,
a chat link, Files, seek, a file rewritten while its viewer is open, node removal) needs
`autobyteus-web/tests/e2e/native-video-node.mjs`, started at this computer's LAN address (a pairing link may not name a
loopback host). Its tests run in name order on one fresh stack (the pairing link is one-time); it is not part of the
smoke run:

```bash
node autobyteus-web/tests/e2e/native-video-node.mjs --output-dir=<fresh dir> \
  --origin-host=<LAN IP> --listen-host=<LAN IP> --secrets-file=<file outside the evidence> &
TEST_RUNNER_AUTOBYTEUS_574_REAL_NODE_INFO=<fresh dir>/stack-info.json \
TEST_RUNNER_AUTOBYTEUS_574_REAL_NODE_SECRETS=<secrets file> \
xcodebuild \
  -project autobyteus-ios/AutoByteusMobile.xcodeproj \
  -scheme AutoByteusMobile \
  -destination 'platform=iOS Simulator,id=<your own simulator>' \
  -only-testing:AutoByteusMobileUITests/NativeVideoRealNodeUITests \
  IOS_BUNDLE_ID=org.autobyteus.mobile IOS_SHARE_EXTENSION_BUNDLE_ID=org.autobyteus.mobile.share \
  test
```

Simulator smoke path with a fake AutoByteus node:

```bash
autobyteus-ios/scripts/ios-simulator-smoke.sh tickets/ios-wrapper-app/e2e-evidence
```

The smoke script (like the release workflow's simulator build and tests) runs on the simulator `scripts/select-ios-simulator.py` chooses: the device named exactly `IOS_SIMULATOR_NAME` (default `iPhone 17`) on the newest available iOS runtime the selected Xcode can run (not above its iOS simulator SDK), else the first iPhone there with a notice. The smoke script starts a local fake `/rest/remote-access/status` + `/mobile` server, injects the fake URL through UI-test build settings/Info.plist, runs the UI smoke tests (the fake node through Type an address, Can't reach, and the demo: Try demo, the demo code, the demo link, Leave demo, a kept share, the blocked network), fails if those tests skip, stores an `.xcresult` with screenshots, and captures signing-readiness output. API/E2E owns authoritative simulator evidence; implementation may run this as a confidence check when time/environment allow.

GitHub-hosted simulators are intermittently very slow, so the UI smoke tests wait for readiness (hittable controls, keyboard focus) with generous upper bounds instead of fixed waits. On a loaded simulator a delivered tap can have no effect, so before Connect the tests confirm that the URL field holds the typed node URL and that the HTTP acknowledgement switch is on: the switch state is checked before each tap and re-tapped up to 3 times, never toggling it off. The tests launch the app, including the restore relaunch, with `AUTOBYTEUS_CONNECTION_TIMEOUT_SECONDS=60`. That launch-environment override of the app's connection-check timeout is compiled only into Debug builds, which the scheme's test action uses; Release/TestFlight builds always keep the 5 s default (values above 120 s are capped; invalid values are ignored).

To reproduce a slow host locally, start the fake node with a delayed status response and run the fake-node test against it:

```bash
python3 autobyteus-ios/scripts/fake-mobile-server.py --port 29876 --status-delay-seconds 7 &
xcodebuild \
  -project autobyteus-ios/AutoByteusMobile.xcodeproj \
  -scheme AutoByteusMobile \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  -only-testing:AutoByteusMobileUITests/AutoByteusMobileUITests/testFakeNodeOpensAndRestoresWithFakeMobileMarker \
  AUTOBYTEUS_TEST_NODE_URL=http://127.0.0.1:29876/mobile \
  AUTOBYTEUS_SMOKE_TESTS_REQUIRED=1 \
  test
```

Without the override the app's 5 s check times out and the test shows Can't reach; with it the test passes.

The iPad layout test is its own class and needs an iPad destination; the iPhone smoke skips it:

```bash
xcodebuild \
  -project autobyteus-ios/AutoByteusMobile.xcodeproj \
  -scheme AutoByteusMobile \
  -destination 'platform=iOS Simulator,name=iPad Air 11-inch (M3)' \
  -only-testing:AutoByteusMobileUITests/DemoIPadUITests \
  test
``` CI keeps the default `--status-delay-seconds 0`.

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

- tag pushes matching `v*` and manual `workflow_dispatch` runs always run simulator build/test artifacts first; both macOS jobs build the bundled demo from `pnpm install` (`prepare-demo-web.sh --build`);
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
IOS_XCODE_APP_PATH=/Applications/Xcode_27.2.app
```

`IOS_BUNDLE_ID` and `IOS_SHARE_EXTENSION_BUNDLE_ID` are the single app/share target bundle-ID authority. The XcodeGen project defines target bundle identifiers from those build settings, and the workflow passes the same values to simulator build/test/smoke, profile verification, archive, `ExportOptions.plist`, and summaries.

`IOS_XCODE_APP_PATH` selects the Xcode app bundle used by both the simulator build/test job and the App Store Connect archive/upload job; both jobs run on GitHub's `xcode-27` runner image. `scripts/select-release-xcode.sh` sets `DEVELOPER_DIR`, requires the selected Xcode and its iPhoneOS SDK to be major version 27 or newer (App Store Connect refuses apps built with an older SDK, ITMS-90725), and logs the selected Xcode plus iPhoneOS SDK before building or archiving. When the app path is missing, its error lists the installed Xcode apps. Override this variable only when the runner image no longer has `/Applications/Xcode_27.2.app` (for example when GitHub retires that version); the workflow's `env` holds the only default.

Release metadata is split for App Store compatibility. For a tag such as `v1.2.7-rc1`, the workflow uses `ios_marketing_version=1.2.7` for `MARKETING_VERSION` / `CFBundleShortVersionString`, keeps `artifact_version=1.2.7-rc1` for artifact names, records `prerelease_label=rc1` for summaries/TestFlight notes, and uses numeric `GITHUB_RUN_NUMBER` for `CURRENT_PROJECT_VERSION` / `CFBundleVersion`.

Run `autobyteus-ios/scripts/ios-release-contract-check.py` after changing release metadata, bundle-ID, smoke, profile-verification, or upload wiring. The check covers prerelease metadata splitting, invalid release-tag rejection, custom bundle-ID propagation, build/test/archive setting propagation, profile/export mapping, App Store Connect private-key discovery configuration, the app icon set's structure (every slot at its pixel size, 8-bit RGB without alpha), `ITSAppUsesNonExemptEncryption = false`, and the workflow's icon check step.

Do not reuse the macOS desktop `APPLE_*` signing/notarization secrets for iOS. A `Developer ID Application` certificate is not valid for iOS App Store/TestFlight signing. The workflow verifies App Store profiles for the main app and share extension and rejects development/wildcard profiles with `get-task-allow=true`.

## App icon

The app icon set (`AutoByteusMobile/Assets.xcassets/AppIcon.appiconset/`) is generated from the product logo, `autobyteus-web/public/autobyteus-icon.svg`: the mark on the logo circle's own blue (#1E3A8A) as a full square, as on Android, every slot rendered at its exact pixel size as RGB without alpha (App Store Connect refuses an icon with alpha). Do not edit the PNGs by hand:

```bash
pnpm --dir autobyteus-web ios-icon:build   # regenerate every slot after a logo change; commit the PNGs
pnpm --dir autobyteus-web ios-icon:check   # fail when a slot is missing, mis-sized, has alpha, or no longer matches the logo
```

The release workflow's `build-ios` job runs `ios-icon:check` before building, so a set that drifts from the logo stops the release. The check compares pixels within a small tolerance (`scripts/build-ios-app-icon.mjs`), so a different PNG encoder or image library build on another machine does not fail it.

## Export compliance

`AutoByteusMobile/Info.plist` declares `ITSAppUsesNonExemptEncryption = false`, so App Store Connect does not ask about encryption for each build. It is true of the app as built (autobyteus-594): the native code uses no cryptography API and networks only through `WKWebView` (the system's TLS); the bundled demo web build hashes with SHA-256 only; and the bundled noVNC client's ciphers serve authentication only (the remote-desktop session itself is not encrypted by it). Encryption provided by the operating system and encryption used only for authentication are exempt.

Revisit the key, and set it to `true` with the matching export documentation, before adding encryption of the app's own beyond those: for example a cryptography library or `CryptoKit`/`CommonCrypto` used to encrypt data, or a VPN or proprietary secure channel. The contract check requires `false` and must change with it.

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
5. Confirm the `/mobile` run list, a run screen and its ⋮ → Files view load in the WebView.
6. Exercise attachment/file input in the WebView with a small local file.
7. Force-quit/relaunch and confirm saved-node restore.
8. Exercise an unreachable node and confirm native diagnostic recovery.
9. Record signing-readiness output for the intended bundle ID/team.

10. The demo: scan the demo QR code with the in-app scanner, open `autobyteus://demo` from the Camera app, and walk the demo with airplane mode on (every icon shows, nothing fails).

Simulator-first validation cannot prove real camera capture or every file-picker/photo-library behavior; record those as evidence gaps until a physical device is used.
