# Android + Tailscale Mobile Access Guide

This guide covers the Android app shell that loads the existing AutoByteus `/mobile` web shell from a reachable node.

For Phase One security hardening, the recommended path is to pair Android with a **mobile-safe Docker node**, not the embedded host desktop node. The Docker profile reduces practical blast radius by avoiding default privileged flags, avoiding automatic shared host bind mounts, and keeping management ports localhost-bound by default. Broader backend mobile authorization/token hardening remains a future Phase Two item tracked in `docs/future-tickets/mobile-backend-authorization-hardening.md`.

## Ownership boundaries

- **Android app:** setup, app-owned QR scanning and camera permission handling, saved node profile, WebView containment, diagnostics, build/package.
- **Existing `/mobile` shell:** AutoByteus Home, Chat, Runs, Files, Activity, pairing bootstrap, and mobile session restore. Phase One removes the mobile Tools/Terminal/VNC page.
- **Remote Access backend:** Phone Access status, trusted-network owner routes, pairing sessions, pairing exchange, mobile credentials, revocation.
- **Mobile-safe Docker launcher:** Docker node creation, safer runtime defaults, localhost-bound management ports, and mobile-web asset packaging through the published image path.
- **Tailscale:** private network reachability only; it is not AutoByteus authorization.

The Android app intentionally does not include a native AutoByteus runtime, duplicate chat/run UI, direct run/chat API client, or native credential bridge.

## Stable travel URL

Use the same URL at pairing time that the Android phone will use while traveling. Recommended:

```text
https://<desktop-machine>.<tailnet>.ts.net/mobile
```

That is usually provided by Tailscale Serve HTTPS. New desktop-created Phone Access pairing QR codes require an `https://` URL; direct MagicDNS/tailnet-IP HTTP URLs are not accepted for new desktop pairing-session creation.

Why this matters: the MVP credential remains in WebView-local `localStorage`, which is origin-scoped. Pairing with a LAN URL and later opening a different Tailscale origin can require re-pairing.

## Recommended Phase One Docker-node setup

1. Install the Docker launcher from **Settings -> Nodes -> Docker Guide**.
2. Create the mobile-safe Docker node:

   ```bash
   autobyteus-docker new-container --profile mobile-safe
   ```

   The mobile-safe profile does not add `SYS_ADMIN`, does not set `seccomp=unconfined`, does not create automatic shared host bind mounts, and binds published ports to `127.0.0.1`.
3. Save the printed Backend URL. Add it as a remote node only over a trusted LAN, VPN, tailnet, or equivalent private-network path; do not expose the full backend directly to the public internet.
4. In the desktop app, add the Docker Backend URL as a remote node in **Settings -> Nodes**, then click **Open** for that Docker node. Desktop/Electron access to that node follows the trusted private-network product model and does not require a separate setup secret.
5. Create or configure an Android-facing private HTTPS URL that maps to the Docker node Backend URL, for example Tailscale Serve/private HTTPS ingress.
6. Paste that Android-facing HTTPS `/mobile` URL in the Docker node window. AutoByteus verifies that this URL and the desktop management URL reach the same server instance before creating the QR.
7. Enable Phone Access and create the QR in the Docker node window. Android should pair to the Docker node and mobile-started work should run inside the Docker/container runtime.

Do not solve Docker-node Phone Access setup by exposing raw Docker ports broadly or by treating Docker bridge/LAN addresses as loopback/local trust. The full backend is meant for trusted private networks, not direct public internet exposure.

### Credential boundaries

- Desktop/Electron remote-node access follows the trusted private-network product model and does not require an extra setup secret in the default flow.
- Paired Android/mobile clients receive separate `mra_...` mobile credentials from the pairing exchange.
- Mobile credentials authorize protected mobile app calls only where the route class accepts mobile credentials; they do not authorize owner-management routes such as settings changes, pairing-session creation, device listing, or revocation.
- Pairing payloads contain the one-time pairing code and server base URL; they must not contain desktop/owner authority.
- Public server Docker images build and package the `/mobile` web shell into `autobyteus-server-ts/mobile-web`, so a fresh `mobile-safe` container should serve `/mobile` without manual file copies.

## Embedded desktop-node setup

The embedded desktop setup remains useful for development and compatibility, but it is not the recommended secure Phase One Android pairing path.

1. Start the AutoByteus desktop/server node.
2. Ensure the desktop is signed into Tailscale and reachable by the stable URL.
3. Open **Settings -> Nodes -> Phone Setup**.
4. On macOS with Tailscale.app installed, use the app-direct Serve commands from the Phone Setup guide. AutoByteus only shows copyable commands; it does not run Tailscale or inspect local Tailscale state:

   ```bash
   /Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg 29695
   /Applications/Tailscale.app/Contents/MacOS/Tailscale serve status
   ```

5. Copy the HTTPS MagicDNS URL from `serve status` and use the `/mobile` shell shape, for example `https://<desktop-machine>.<tailnet>.ts.net/mobile`. Prefer the full MagicDNS hostname/FQDN shown by Tailscale; IPv4/IPv6 and HTTP interface candidates such as `http://100.x.y.z:29695` are diagnostics only.
6. Enable Phone Access.
7. Paste the stable HTTPS Tailscale `/mobile` URL. AutoByteus stores the canonical server base without `/mobile` and derives REST/GraphQL/WebSocket URLs from that base.
8. Create the QR/link.

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
   - tap **Scan QR** and scan the Phone Access QR with the bundled AutoByteus scanner;
   - paste/share the Phone Access link;
   - manually enter the stable `/mobile` URL.

The Android app owns QR scanning. A separate ZXing-compatible scanner app is not required. If camera permission is denied or the scan is cancelled, the app returns to the connection screen with retry plus paste/manual-entry guidance.

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

For local development validation against a host-only mock or dev node, API/E2E may use an ADB bridge such as `adb reverse tcp:<phone-visible-port> tcp:<host-port>` so the physical phone can reach the host service. Record the reverse mapping and the device id/model/Android version in evidence, then run `adb reverse --remove-all` during cleanup. Do not rely on display size or density overrides for final UI evidence; if an override was used during setup, reset it before the passing run and record `adb shell wm size` / `adb shell wm density` after cleanup.

### Desktop-node modes

Record the mode used in validation evidence:

- **Development-node mode:** a repository development stack or already-running desktop/server node that serves `/mobile`, `/rest/remote-access/*`, GraphQL, and WebSocket endpoints through the stable URL. This is enough for iterative Android wrapper validation.
- **Packaged-Electron mode:** a built Electron desktop app serving its packaged server/mobile assets. Run this when final release readiness claims packaged desktop + Android readiness or when a packaged artifact is available from delivery/CI.

### Minimum scenarios

1. Build the APK:

   ```bash
   ANDROID_HOME="$HOME/Library/Android/sdk" gradle -p autobyteus-android :app:assembleDebug
   ```

2. If the change touches `/mobile`, build the mobile web bundle and ensure the desktop node being validated serves that exact refreshed bundle:

   ```bash
   pnpm -C autobyteus-web build:mobile-web
   shasum -a 256 autobyteus-web/dist-mobile/public/index.html
   ```

   Installing a new Android APK does not update the desktop-served `/mobile` assets. For packaged-desktop validation, rebuild or refresh the packaged server `mobile-web/` directory through the documented packaging path, then verify the served `/mobile/index.html` hash matches the new `dist-mobile/public/index.html` hash.

3. Run the live smoke helper:

   ```bash
   autobyteus-android/scripts/android-live-smoke.sh \
     autobyteus-android/app/build/outputs/apk/debug/app-debug.apk \
     tickets/in-progress/<ticket-name>/e2e-evidence
   ```

4. QR scan launch: tap **Scan QR**, grant camera permission when prompted, and confirm the bundled `org.autobyteus.mobile/com.journeyapps.barcodescanner.CaptureActivity` scanner UI opens. The app must not depend on an external scanner package.
5. Scanner recovery: cancel the scanner and confirm the app returns to the connection screen with the recoverable QR retry/paste/manual-entry guidance. When practical, also exercise Android camera-permission denial.
6. First-run setup: scan the Phone Access QR, or enter/paste/share the stable Tailscale URL or pairing link, and verify the WebView opens `/mobile`.
7. Pairing: complete the existing `/mobile?pairing=` flow and confirm Home/Chat is usable.
8. Attachment upload: open Chat, tap an attachment/file upload control, choose a small local file through the Android picker, and confirm the selected file appears in the existing mobile composer/upload path.
9. Restore: force-stop and reopen:

   ```bash
   adb shell am force-stop org.autobyteus.mobile
   adb shell am start -n org.autobyteus.mobile/.MainActivity
   ```

   Confirm the saved node opens without another QR scan.

10. Mobile Home/catalog freshness: confirm the saved-node relaunch renders Mobile Home/recent work and does not show `Error 500` or `Cannot read properties of undefined (reading 'localeCompare')`. If that error appears after a source fix, first suspect a stale desktop-served `/mobile` bundle.
11. Travel/reachability simulation: keep Android on Tailscale and avoid relying on the LAN-only URL. If practical, test with Wi-Fi disabled or from another network.
12. Failure diagnostic: disconnect Tailscale or temporarily save an unreachable URL and confirm the native recovery copy appears instead of a raw WebView error page.
13. Launcher icon safe-area check: when launcher resources change, inspect or preview the packaged adaptive icon foreground against common launcher masks. The AutoByteus logo should stay fully visible inside the adaptive safe zone; the current vector foreground is expected to use a centered `scaleX=0.66` / `scaleY=0.66` group around pivot `(54,54)` before packaging. Record the preview/device evidence used.
14. Evidence capture: include screenshots, logcat, APK path/hash, served mobile bundle path/hash, desktop-node mode, stable URL shape or ADB reverse mapping, device id/model/Android version, post-cleanup display size/density when ADB display controls were touched, attachment-upload result, backend/mobile status observations, and launcher icon preview/device evidence when icon resources changed.
