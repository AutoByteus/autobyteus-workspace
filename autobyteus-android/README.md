# AutoByteus Android Mobile Shell

This project builds the Android WebView shell for the existing AutoByteus `/mobile` experience. It does **not** run AutoByteus locally on Android and it does not implement agent/team/run/chat behavior natively.

## What the app owns

- first-run setup for scan/paste/manual node URL entry;
- app-owned Phone Access QR scanning, Android camera permission handling, and scan cancel/denial diagnostics;
- native persistence of a clean saved node profile, for example `https://desktop.tailnet-name.ts.net/mobile`;
- reachability checks against `/rest/remote-access/status`;
- WebView containment for the saved AutoByteus origin;
- Tailscale-oriented diagnostics and recovery actions.

The existing desktop Phone Access service still owns pairing sessions and credentials. The existing `/mobile` web shell still owns mobile Home, Chat, Runs, Files, Tools, Activity, and credential storage in WebView-local `localStorage` for this MVP.

## Recommended Tailscale setup

1. Sign in to Tailscale on the desktop/server node and the Android phone.
2. Prefer Tailscale Serve HTTPS for travel, such as:

   ```text
   https://desktop.tailnet-name.ts.net/mobile
   ```

3. In the desktop AutoByteus app, open **Settings -> Nodes -> Phone Access**.
4. Enable Phone Access.
5. Use the same stable Tailscale Serve/MagicDNS URL you expect to use while away before creating the QR/link.
6. Pair from Android by tapping **Scan QR** in AutoByteus Android, sharing/pasting the link into AutoByteus Android, or manually entering the stable URL.

Credentials are origin-scoped because the web shell stores the MVP credential in WebView localStorage. If you pair with `http://192.168.x.x:29695/mobile` and later open `https://desktop.tailnet-name.ts.net/mobile`, Android may need to pair again.

## QR scanning

The Android app includes its own QR scanner activity through `com.journeyapps:zxing-android-embedded` and requests `android.permission.CAMERA` when **Scan QR** is used. Users do not need to install a separate ZXing-compatible scanner app.

Decoded QR text is passed into the same connection input resolver used by paste, Android text-share, and manual entry. Cancelling the scanner, denying camera permission, or receiving an empty scan result returns to the connection screen with recoverable guidance instead of crashing or leaving a stale busy state.

## Build

Prerequisites:

- JDK 17+;
- Android SDK with platform 35;
- `ANDROID_HOME` pointing at the Android SDK when it is not discoverable automatically.

From the repository root:

```bash
cd autobyteus-android
ANDROID_HOME="$HOME/Library/Android/sdk" ./gradlew :app:assembleDebug
```

The debug APK is written to:

```text
autobyteus-android/app/build/outputs/apk/debug/app-debug.apk
```

## Release signing and CI artifacts

The Android app reads release version and signing inputs from environment variables so CI can build from a tag without editing source files:

- `ANDROID_VERSION_NAME` overrides the manifest version name.
- `ANDROID_VERSION_CODE` overrides the manifest version code and must be an integer from `1` to `2100000000`.
- `ANDROID_KEYSTORE_PATH`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

When all signing variables are present, `./gradlew :app:assembleRelease` produces a signed release APK at:

```text
autobyteus-android/app/build/outputs/apk/release/app-release.apk
```

The repository release workflow `.github/workflows/release-android.yml` decodes `ANDROID_KEYSTORE_B64` from GitHub Secrets into `ANDROID_KEYSTORE_PATH`, exports the version variables from the release tag, and publishes only signed release APK assets named like:

```text
AutoByteus_personal_android-1.3.25-release.apk
```

Manual workflow-dispatch build-only runs may upload a private debug workflow artifact named like `AutoByteus_personal_android-0.1.0-ci.123-debug.apk` when signing secrets are absent. Debug APKs must not be uploaded to GitHub Releases or surfaced by the website download flow.

The launcher icon is an Android adaptive icon. Keep foreground artwork within the common launcher safe area before packaging; the current AutoByteus foreground vector scales the logo group to `0.66` around the `54,54` viewport center so circle, rounded, and squircle masks do not crop the mark. When changing `app/src/main/res/drawable/ic_launcher_foreground.xml` or launcher mipmaps, rebuild the APK and capture resource inspection plus mask preview or device-launcher evidence.

## Install and launch with adb

```bash
adb devices
adb install -r autobyteus-android/app/build/outputs/apk/debug/app-debug.apk
adb shell pm clear org.autobyteus.mobile
adb shell am start -n org.autobyteus.mobile/.MainActivity
```

## Implementation-scoped checks

```bash
cd autobyteus-android
ANDROID_HOME="$HOME/Library/Android/sdk" ./gradlew :app:testDebugUnitTest
ANDROID_HOME="$HOME/Library/Android/sdk" ./gradlew :app:assembleDebug :app:compileDebugAndroidTestKotlin
```

## Real-device validation handoff

API/E2E owns live validation. Use `scripts/android-live-smoke.sh` to install, clear app data, launch, and collect initial evidence on a USB-connected Android phone. Then complete the app-owned QR scan, scan-cancel/permission, pairing, chat attachment upload, restore, stale-mobile-bundle, and unreachable-node checklist in `../docs/android_mobile_access.md`.

If a source change touches the web mobile shell, rebuild and refresh the desktop-served `/mobile` bundle as well as the APK. The Android app loads `/mobile` from the desktop/server node; installing a fresh APK alone cannot update stale packaged `mobile-web/` assets.
