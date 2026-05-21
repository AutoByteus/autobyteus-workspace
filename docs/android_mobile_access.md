# Android + Tailscale Mobile Access Guide

This guide covers the Android app shell that loads the existing AutoByteus `/mobile` web shell from a reachable desktop/server node.

## Ownership boundaries

- **Android app:** setup, saved node profile, WebView containment, diagnostics, build/package.
- **Existing `/mobile` shell:** AutoByteus Home, Chat, Runs, Files, Tools, Activity, pairing bootstrap, and mobile session restore.
- **Remote Access backend:** Phone Access status, pairing sessions, pairing exchange, credentials, revocation.
- **Tailscale:** private network reachability only; it is not AutoByteus authorization.

The Android app intentionally does not include a native AutoByteus runtime, duplicate chat/run UI, direct run/chat API client, or native credential bridge.

## Stable travel URL

Use the same URL at pairing time that the Android phone will use while traveling. Recommended:

```text
https://<desktop-machine>.<tailnet>.ts.net/mobile
```

That is usually provided by Tailscale Serve HTTPS. Direct MagicDNS/tailnet-IP HTTP URLs can be used for private development or LAN/tailnet fallback only after explicit HTTP acknowledgement in the app.

Why this matters: the MVP credential remains in WebView-local `localStorage`, which is origin-scoped. Pairing with a LAN URL and later opening a different Tailscale origin can require re-pairing.

## Desktop setup

1. Start the AutoByteus desktop/server node.
2. Ensure the desktop is signed into Tailscale and reachable by the stable URL.
3. Open **Settings -> Nodes -> Phone Access**.
4. Enable Phone Access.
5. Enter or select the stable Tailscale URL.
6. Create the QR/link.

## Android setup

1. Install the debug APK:

   ```bash
   adb install -r autobyteus-android/app/build/outputs/apk/debug/app-debug.apk
   ```

2. Clear app data for first-run validation:

   ```bash
   adb shell pm clear org.autobyteus.mobile
   ```

3. Launch:

   ```bash
   adb shell am start -n org.autobyteus.mobile/.MainActivity
   ```

4. In the app, choose one of:
   - scan the Phone Access QR using a compatible QR scanner app;
   - paste/share the Phone Access link;
   - manually enter the stable `/mobile` URL.

## Troubleshooting hints shown by the app

- connect Tailscale on Android;
- ensure the desktop node is online, awake, and signed into the same tailnet;
- ensure AutoByteus Android is not excluded by Tailscale split tunneling;
- enable Phone Access on the desktop;
- reset/re-pair if the credential was revoked or the origin changed;
- prefer HTTPS Tailscale Serve over cleartext HTTP.

## API/E2E real-device validation procedure

API/E2E should run this against a physical Android phone when available.

### Required environment

- USB-connected Android phone visible as `device` in `adb devices`.
- Tailscale installed and signed in on the Android phone.
- Desktop/server node signed into the same tailnet.
- Phone Access enabled on the desktop/server node.
- A stable URL such as `https://<desktop-machine>.<tailnet>.ts.net/mobile`.

### Desktop-node modes

Record the mode used in validation evidence:

- **Development-node mode:** a repository development stack or already-running desktop/server node that serves `/mobile`, `/rest/remote-access/*`, GraphQL, and WebSocket endpoints through the stable URL. This is enough for iterative Android wrapper validation.
- **Packaged-Electron mode:** a built Electron desktop app serving its packaged server/mobile assets. Run this when final release readiness claims packaged desktop + Android readiness or when a packaged artifact is available from delivery/CI.

### Minimum scenarios

1. Build the APK:

   ```bash
   ANDROID_HOME="$HOME/Library/Android/sdk" gradle -p autobyteus-android :app:assembleDebug
   ```

2. Run the live smoke helper:

   ```bash
   autobyteus-android/scripts/android-live-smoke.sh \
     autobyteus-android/app/build/outputs/apk/debug/app-debug.apk \
     docs/task-artifacts/android-tailscale-mobile-shell/e2e-evidence
   ```

3. First-run setup: enter/paste the stable Tailscale URL or pairing link and verify the WebView opens `/mobile`.
4. Pairing: complete the existing `/mobile?pairing=` flow and confirm Home/Chat is usable.
5. Attachment upload: open Chat, tap an attachment/file upload control, choose a small local file through the Android picker, and confirm the selected file appears in the existing mobile composer/upload path.
6. Restore: force-stop and reopen:

   ```bash
   adb shell am force-stop org.autobyteus.mobile
   adb shell am start -n org.autobyteus.mobile/.MainActivity
   ```

   Confirm the saved node opens without another QR scan.

7. Travel/reachability simulation: keep Android on Tailscale and avoid relying on the LAN-only URL. If practical, test with Wi-Fi disabled or from another network.
8. Failure diagnostic: disconnect Tailscale or temporarily save an unreachable URL and confirm the native recovery copy appears instead of a raw WebView error page.
9. Evidence capture: include screenshots, logcat, APK path/hash, desktop-node mode, stable URL shape, attachment-upload result, and backend/mobile status observations.
