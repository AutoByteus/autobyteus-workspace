# AutoByteus Android Mobile Shell

This project builds the Android WebView shell for the existing AutoByteus `/mobile` experience. It does **not** run AutoByteus locally on Android and it does not implement agent/team/run/chat behavior natively.

## What the app owns

- first-run setup for scan/paste/manual node URL entry;
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
6. Pair from Android by scanning the QR with a QR scanner app, sharing/pasting the link into AutoByteus Android, or manually entering the stable URL.

Credentials are origin-scoped because the web shell stores the MVP credential in WebView localStorage. If you pair with `http://192.168.x.x:29695/mobile` and later open `https://desktop.tailnet-name.ts.net/mobile`, Android may need to pair again.

## Build

Prerequisites:

- JDK 17+;
- Android SDK with platform 35;
- Gradle 9.x, or run through the Gradle version available in your environment;
- `ANDROID_HOME` pointing at the Android SDK when it is not discoverable automatically.

From the repository root:

```bash
ANDROID_HOME="$HOME/Library/Android/sdk" gradle -p autobyteus-android :app:assembleDebug
```

The debug APK is written to:

```text
autobyteus-android/app/build/outputs/apk/debug/app-debug.apk
```

## Install and launch with adb

```bash
adb devices
adb install -r autobyteus-android/app/build/outputs/apk/debug/app-debug.apk
adb shell pm clear org.autobyteus.mobile
adb shell am start -n org.autobyteus.mobile/.MainActivity
```

## Implementation-scoped checks

```bash
ANDROID_HOME="$HOME/Library/Android/sdk" gradle -p autobyteus-android :app:testDebugUnitTest
ANDROID_HOME="$HOME/Library/Android/sdk" gradle -p autobyteus-android :app:assembleDebug :app:compileDebugAndroidTestKotlin
```

## Real-device validation handoff

API/E2E owns live validation. Use `scripts/android-live-smoke.sh` to install, clear app data, launch, and collect initial evidence on a USB-connected Android phone. Then complete the manual pairing, chat attachment upload, restore, and unreachable-node checklist in `../docs/android_mobile_access.md`.
