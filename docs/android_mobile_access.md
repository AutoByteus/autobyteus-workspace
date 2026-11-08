# Android + Tailscale Mobile Access Guide

This guide covers the Android app shell that loads the existing AutoByteus `/mobile` web shell from a reachable node.

Connecting a phone is one step on each side: on the desktop, open the node's **Nodes -> Phone Setup** and press **Show QR code**; on the phone, open AutoByteus and tap **Scan**. The desktop works out and checks the address itself (Tailscale, your VPN, a company address, or the same Wi-Fi or LAN after a once-per-network "Allow phones on this network?"); the full desktop flow is in `autobyteus-web/docs/remote_access.md`, Connecting a phone. Normal Docker nodes and embedded desktop nodes both use the same Phone Access pairing model: trusted private-network desktop access plus separate paired-phone `mra_...` credentials for mobile clients. Broader backend mobile authorization/token hardening remains a future Phase Two item tracked in `docs/future-tickets/mobile-backend-authorization-hardening.md`.

## Ownership boundaries

- **Android app:** the node list (scan-first start screen and **Switch node**), app-owned QR scanning and camera permission handling, the connect sequence and its plain-words reasons, saved node entries, the shell bridge to the open node's page, the VNC Viewer's desktop full screen (landscape and hidden system bars while the page asks for it), WebView containment, build/package.
- **Existing `/mobile` shell:** the run list, the run screen with its ⋮ views (Artifacts, Files, Messages, Activity, and VNC Viewer on a node with a node desktop), New run for agent runs, the connection sheet, pairing bootstrap, and mobile session restore. There is no mobile Terminal or Tools page. The VNC Viewer streams the node desktop through the node's own server (see `autobyteus-web/docs/remote_access.md`, "Node desktop on the phone").
- **Remote Access backend:** Phone Access status, owner routes, pairing sessions, pairing exchange, phone credentials, revocation (every request to a node needs a credential: `autobyteus-server-ts/docs/design/node_access_model.md`).
- **Public Docker launcher:** normal Docker node creation, shared workspace bind mounts, named volumes, and mobile-web asset packaging through the published image path.
- **Tailscale:** private network reachability only; it is not AutoByteus authorization.

The Android app intentionally does not include a native AutoByteus runtime, duplicate chat/run UI, direct run/chat API client, or native credential bridge. The shell bridge carries no credential.

## One address per pairing

The QR holds one address: the best checked address of the way the desktop's tab uses. The MVP credential stays in WebView-local `localStorage`, which is origin-scoped, so the saved node keeps that address. A phone paired on the home Wi-Fi does not move to the Tailscale address by itself; for a phone that travels, use the desktop's **Tailscale** tab (with Tailscale on the phone, that address works at home too).

## Normal Docker-node setup

1. Install the Docker launcher from **Nodes -> Docker Guide**.
2. Create the Docker node:

   ```bash
   autobyteus-docker new-container
   ```
   The node is published on this computer and, when Tailscale runs here, on this computer's Tailscale address. For phones on your Wi-Fi, create it with `autobyteus-docker new-container --allow-local-network`. Do not expose the backend directly to the public internet.
3. Save the printed Backend URL and setup code (`autobyteus-docker setup-code` prints a new one later).
4. In the desktop app, add the Docker Backend URL as a remote node in **Nodes -> Manage Nodes**, enter the setup code to connect it, then click **Open** for that Docker node.
5. In the Docker node window, open **Nodes -> Phone Setup** and press **Show QR code** on the selected tab. The addresses are this computer's addresses with the port the Docker node is published on, each checked to reach that Docker node; an address the node is not published on (the local network without `--allow-local-network`) is reported as not reachable from other devices.
6. Scan the QR with AutoByteus Android. It pairs with the Docker node, lists it under its name from the Nodes page, and mobile-started work runs inside that node's container runtime.

A company address set on the Docker deployment (`AUTOBYTEUS_SERVER_HOST`) is offered under **Company address**. Tailscale Serve and proxies that keep `Host` (or send `X-Forwarded-Host`) need nothing else; an ingress that rewrites `Host` without `X-Forwarded-Host` needs the phone URL's origin in the node setting `AUTOBYTEUS_ALLOWED_ORIGINS`, or the node refuses the phone's requests with `REMOTE_ACCESS_ORIGIN_REFUSED` (see `autobyteus-server-ts/docs/features/remote_access.md`, Allowed Origins). The node also checks the name a request is addressed to: the company address in `AUTOBYTEUS_SERVER_HOST` and the address each phone was paired with are accepted; any other public domain the node is reached by needs to be listed in `AUTOBYTEUS_ALLOWED_HOSTS`, or the node refuses it with `REMOTE_ACCESS_HOST_REFUSED` (Allowed Hosts in the same document).

Do not solve Docker-node Phone Access setup by exposing raw Docker ports broadly. The backend is meant for private networks (Tailscale, an allowed local network), not direct public internet exposure.

### Credential boundaries

- The desktop app holds an owner credential for each node: its own node's comes with every start; a remote or Docker node's comes from a setup code read on that node's computer.
- Paired Android/mobile clients receive separate `mra_...` phone credentials from the pairing exchange.
- Phone credentials open the phone's routes only; they do not open owner actions such as settings changes, pairing-session creation, device listing, or revocation (403 `NODE_ROUTE_NOT_PERMITTED`).
- A node accepts phones only from networks it admits: Tailscale, a local network the owner allowed, or a network listed in its `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS` (a company VPN or proxy network); elsewhere it answers `NODE_NETWORK_REFUSED` and the phone says so.
- Pairing payloads contain the one-time pairing code and server base URL; they must not contain desktop/owner authority.
- Public server Docker images build and package the `/mobile` web shell into `autobyteus-server-ts/mobile-web`, so a fresh launcher-managed Docker container should serve `/mobile` without manual file copies.

## Embedded desktop-node setup

Use this when the desktop's own node is the node your phone should use.

1. Start the AutoByteus desktop app.
2. Open **Nodes -> Phone Setup**. With Tailscale on this computer, the **Tailscale** tab is ready and **Recommended**; without it, **Same Wi-Fi or LAN** asks "Allow phones on this network?" on its first press.
3. Press **Show QR code** (**Turn on and show QR code** when Phone access is off).
4. Optional: when Tailscale runs, **Advanced** in the Tailscale tab shows the one `tailscale serve --bg <port>` command that gives this node an `https://` name on your tailnet. AutoByteus shows it and does not run it; after running it, press **Check again**.

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

4. The first screen is scan-first: **Scan** is the main action, the saved nodes are listed with their reachability ("Checking…", "Online", "Not reachable"), and **Other ways to connect** holds **Type an address** and **Paste a link**. Connect by one of:
   - tap **Scan** and scan the desktop's QR: the app checks the address answers and pairs, with no checkbox, name field or extra tap;
   - paste a pairing link, or share one into the app from another app: it pairs at once, like a scan;
   - **Type an address**: a plain `http://` address needs the sheet's tick ("This address has no extra protection. Fine at home or in your office; on public Wi-Fi, use Tailscale."), and the node's page then offers its own pairing.

The Android app owns QR scanning (journeyapps `BarcodeView` in its own Scan screen). A separate ZXing-compatible scanner app is not required. If camera permission is denied the app says so and offers the paste route; closing the scanner returns to the node list. When the QR's address does not answer, the app shows "Can't reach <node>" with what to do ("Connect to the same Wi-Fi or VPN as the computer, or turn on Tailscale.") and **Open Tailscale**. A node is saved only when the page reports a successful pairing, under the name from the QR.

Several nodes live side by side. Inside a node's page, the node name opens the connection sheet; **Switch node** shows the app's node list with the current node marked, and a tap opens another node. A new node is added with the list's **Scan**.

When Android ends the app's process in the background and the user returns, the app reopens the node and the `/mobile` URL that were open (`shell/OpenPageRestore.kt`, the activity's saved state). The page shows what that URL names; a run's screen comes back as the run list, because its URL does not name the run (the user's decision: reopening the app is enough; autobyteus-426 DEC-013). A pairing link that started the app is not handled again on that return (it was handled when it arrived); a new share still wins. A node removed meanwhile, or a saved URL the navigation policy would not allow for that node, gives the ordinary start.

The WebView's navigation policy (`web/TrustedNavigationPolicy.kt`) keeps the main frame on the open node's origin. A sandboxed in-page preview, such as an HTML artifact, loads as a `blob:` subframe of that origin; it gets no shell bridge. A main-frame `blob:`, a `blob:` of another origin, `file:` and `javascript:` are blocked, and another origin's page opens in the phone's browser.

## Mobile run setup inside Android WebView

Android loads the server-served `/mobile` shell for run setup; it does not implement run setup natively. In **New run** (the round **+** on the run list), mobile users start an agent run and can:

- choose the agent, a folder, and runtime/model settings;
- enable **Auto approve tools** for that run when they intentionally want tool calls to execute without per-call approval; the switch starts from the agent's launch default and uses the same launch-config field as desktop;
- select workspaces from the paired node's workspace store, including workspaces that are not tied to a live run;
- load an unlisted workspace by entering an absolute **server-side** path on the paired AutoByteus node/container, not a path on the Android filesystem. The path must be an existing folder there; otherwise the field shows why ("No folder at this path.", "This path is a file, not a folder.") and nothing is registered.

When validating an Android-visible mobile-web change, refresh and verify the served `/mobile` bundle as described below. Installing a new APK alone cannot update this run setup UI.

## Troubleshooting hints shown by the app

- connect Tailscale on Android;
- ensure the desktop node is online, awake, and signed into the same tailnet;
- ensure AutoByteus Android is not excluded by Tailscale split tunneling;
- turn Phone access on in the node's Phone Setup panel;
- scan a new code if the credential was revoked, or the code expired or was already used;
- for travel, pair through the desktop's **Tailscale** tab.

## API/E2E real-device validation procedure

API/E2E should run this against a physical Android phone when available.

### Required environment

- USB-connected Android phone visible as `device` in `adb devices`.
- Tailscale installed and signed in on the Android phone.
- Desktop/server node signed into the same tailnet.
- A desktop node whose Phone Setup panel shows a ready way (Tailscale for the travel path, Same Wi-Fi or LAN for the local path).

For local development validation against a host-only mock or dev node, API/E2E may use an ADB bridge such as `adb reverse tcp:<phone-visible-port> tcp:<host-port>` so the physical phone can reach the host service. Record the reverse mapping and the device id/model/Android version in evidence, then run `adb reverse --remove-all` during cleanup. Do not rely on display size or density overrides for final UI evidence; if an override was used during setup, reset it before the passing run and record `adb shell wm size` / `adb shell wm density` after cleanup.

### Desktop-node modes

Record the mode used in validation evidence:

- **Development-node mode:** a repository development stack or already-running desktop/server node that serves `/mobile`, `/rest/remote-access/*`, GraphQL, and WebSocket endpoints through the address in its QR. This is enough for iterative Android wrapper validation.
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

4. QR scan launch: tap **Scan**, grant camera permission when prompted, and confirm the app's own Scan screen opens with the camera. The app must not depend on an external scanner package.
5. Scanner recovery: close the scanner and confirm the app returns to the node list. When practical, also exercise Android camera-permission denial.
6. First-run setup: confirm the scan-first start screen, then scan the desktop's QR (or paste/share the pairing link).
7. Pairing: confirm the scan reaches the run list with no checkbox, name field or extra tap, the node is listed under the name from the QR, and a run's conversation is usable. With two nodes paired, confirm **Switch node** from the connection sheet opens the other node.
8. Mobile new-run setup: when the change touches run setup, open **New run** (the round **+**), confirm **Auto approve tools** is visible, toggle it intentionally, select an existing folder, and exercise **Open a folder by path** with a path on the paired node/container before creating the run.
9. Attachment upload: open Chat, tap an attachment/file upload control, choose a small local file through the Android picker, and confirm the selected file appears in the existing mobile composer/upload path.
10. Restore: force-stop and reopen:

   ```bash
   adb shell am force-stop org.autobyteus.mobile
   adb shell am start -n org.autobyteus.mobile/.MainActivity
   ```

   Confirm the saved node opens without another QR scan.

11. Mobile Home/catalog freshness: confirm the saved-node relaunch renders Mobile Home/recent work and does not show `Error 500` or `Cannot read properties of undefined (reading 'localeCompare')`. If that error appears after a source fix, first suspect a stale desktop-served `/mobile` bundle.
12. Travel/reachability simulation: for the recommended HTTPS path, keep Android on Tailscale and avoid relying on the LAN-only URL. If practical, test with Wi-Fi disabled or from another network. For a Same Wi-Fi or LAN validation, keep the phone on that network and record the way the QR used.
13. Failure diagnostic: disconnect Tailscale or temporarily save an unreachable URL and confirm the native recovery copy appears instead of a raw WebView error page.
14. Launcher icon safe-area check: when launcher resources change, inspect or preview the packaged adaptive icon foreground against common launcher masks. The AutoByteus logo should stay fully visible inside the adaptive safe zone; the current vector foreground is expected to use a centered `scaleX=0.66` / `scaleY=0.66` group around pivot `(54,54)` before packaging. Record the preview/device evidence used.
15. Evidence capture: include screenshots, logcat, APK path/hash, served mobile bundle path/hash, desktop-node mode, the way and address shape the QR used or ADB reverse mapping, device id/model/Android version, post-cleanup display size/density when ADB display controls were touched, attachment-upload result, mobile run setup toggle/workspace-path-load evidence when applicable, backend/mobile status observations, and launcher icon preview/device evidence when icon resources changed.
