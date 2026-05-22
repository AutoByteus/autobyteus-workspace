# Phone Access / Remote Access

Phone Access lets a phone browser, PWA, or AutoByteus Android shell connect to the desktop-owned AutoByteus node over a private network path that the user or organization already trusts. The shared client surface is the Nuxt mobile web shell served by the backend under `/mobile`; native wrappers reuse the same pairing and transport protocol rather than bundling a separate AutoByteus runtime.

## What Phone Access Does

- The desktop app exposes a **Phone Access** card in **Settings -> Nodes** for the embedded desktop node.
- The card enables or disables phone access, lists reachable server URL candidates, accepts an advanced/manual private-network URL, creates a short-lived pairing QR/link, and lists paired phones.
- The pairing QR opens `http://<private-node>:<port>/mobile?pairing=<payload>` on the phone. The payload contains a short-lived one-time pairing code and the selected server base URL.
- After pairing, the phone stores a mobile node session locally and uses the same node endpoint model as the desktop web app to derive REST, GraphQL, and WebSocket URLs from the paired base URL.
- Supported mobile routes run in a phone shell; desktop-only routes redirect back to the mobile shell with an explicit unsupported-feature notice.


## Mobile Shell and Desktop Boundary

Phone Access is additive to the existing desktop/web product. The phone-first shell is mounted under `/mobile` and owns the mobile Home, Chat, Runs, Files, Tools, and Activity views. Normal desktop routes, including desktop `/workspace` and browser desktop flows, continue to use the regular desktop shell and must not be rewritten to the mobile shell.

Stale or unsupported phone links such as `/mobile/workspace` stay inside the mobile experience and show an explicit unsupported-feature notice. Desktop-only workflows remain available from desktop/Electron and should not be forked or degraded by mobile journey refinements.

The mobile shell can start new agent and team runs without falling back to hidden desktop defaults. The **Start new** surface uses the same launch configuration stores and runtime/model semantics as desktop: the user selects the run target, workspace, and runtime/model, then creates the run. It does not collect or send the first chat message. After creation, mobile opens the new run on Chat and the user sends from the normal composer.

For team runs, mobile exposes a **Message target** selector only on the work tabs where that focus affects the current run, such as Chat, Files, and Activity. The selector is intentionally hidden on the Runs tab and while **Start new** is open because team-message focus belongs to Chat, not run configuration. The current mobile client remembers the last valid focused member per team run for Recent-work reopen; that memory is client-local and is not a cross-device/backend persistence contract.

Draft context files attached before mobile run creation remain available for the first Chat send. Agent-run draft files transfer into the new agent composer tray. Team-run draft files remain mobile-owned pending attachments keyed by the team run until the first Chat send, then flush to the currently selected focused leaf member.

The mobile **Tools** view exposes Terminal and VNC through phone-sized wrappers around the existing browser-compatible tool owners. Terminal uses the paired node's authenticated WebSocket endpoint for the selected workspace. VNC uses the configured server host list and noVNC viewer. VNC hosts must be reachable from the phone; desktop-only loopback hostnames should be replaced with LAN, VPN, or overlay addresses that the phone can open.

## Mobile UX Contract

This contract is limited to the `/mobile` phone shell. Compact-copy policy belongs in mobile presentation code and must not change desktop journeys, core stores, backend services, GraphQL/REST/WebSocket contracts, or runtime behavior. Shared monitor layout changes for the mobile shell must either be mobile-opt-in or behavior-neutral for existing desktop callers.

The paired phone shell is intentionally compact. Mobile Home shows AutoByteus identity, node connection state, node address, current work, recent work rows, and switching/troubleshooting actions without repeating desktop-style section labels such as `Mobile Home`, `Current node`, `Current work context`, or a duplicate `Primary next action` card. Recent/current work cards are the resume/open affordance; the old one-off continue-latest action is not part of the mobile contract.

Mobile work headers show the selected work name plus compact status, path, or profile metadata. Default compact mobile metadata should not append visible `Agent run` or `Team run` type suffixes. Type semantics may remain available through structured context and accessible labels when needed.

Mobile Chat owns a fixed viewport-height work frame. The transcript/feed is the scroll owner (`overscroll-contain`), while the composer and bottom tab navigation stay anchored inside the viewport. Work-screen wrappers must keep `min-h-0`, `overflow-hidden`, and safe-area-aware containment across each flex boundary so long conversations cannot create document/body scroll or blank space below the controls.

For team runs, Chat/Files/Activity can expose a compact target picker with the focused member name and `Change` action. Preserve accessible naming for the target control, but do not reintroduce visible duplicate copy such as `Message target`, `Current: ...`, or explanatory alignment text once a target is selected.

Mobile Activity exposes concrete category filters: Tasks, Messages, and Tools. The previous aggregate `All` filter/view is intentionally absent so each tab has a distinct purpose. Error and approval filters may remain available as secondary issue filters for tool activity.

Mobile Tools keeps routine copy short: show Terminal/VNC controls and the selected workspace/path, reserve explanatory guidance for actionable empty, setup, or error states, and keep persistent reachability guidance in docs/troubleshooting rather than the default tool panel.

## Browser/PWA App Shell Metadata

The `/mobile` route links lightweight browser install metadata through `mobile.webmanifest`, mobile icons, standalone display mode, and theme-color/head tags. This metadata is intentionally limited to app-shell presentation for browser users; it does not add a service worker, offline authenticated cache, alternate API protocol, or cached credential path. If future work adds offline behavior, it must be designed separately so paired credentials and protected node data cannot become stale or broadly cached.

## Network Model

AutoByteus does not require or special-case a VPN vendor. Phone Access only requires that the phone can reach the desktop/server node URL selected during pairing.

Supported setup profiles include:

- **Same LAN:** use the desktop's LAN address and the AutoByteus server port when the local firewall allows it.
- **Tailscale:** use the desktop's tailnet IP or MagicDNS hostname.
- **Tailscale Serve HTTPS:** recommended for Android/travel; expose the desktop node as a stable HTTPS tailnet URL such as `https://desktop.tailnet-name.ts.net/mobile`.
- **Headscale:** use the same Tailscale-compatible client flow against a self-hosted control plane.
- **Company VPN / private DNS:** use the internal hostname or IP that resolves to the desktop/server node.
- **NetBird, Netmaker, or WireGuard:** use the private overlay address or hostname that reaches the node.

The app-level pairing credential is still required. A private network or VPN is not treated as sufficient authorization by itself.

## Desktop Pairing Flow

1. Start the desktop Electron app so the bundled server is running.
2. Open **Settings -> Nodes**.
3. Enable **Phone Access**.
4. Pick a **Reachable server URL**. Prefer a non-loopback LAN/VPN URL for a real phone. Use **Manual/private-network URL** when the desired company VPN or overlay hostname is not auto-discovered.
   - For Android travel, prefer entering the stable Tailscale Serve or MagicDNS URL before creating the QR. Use the same URL that the phone will use while away.
5. Click **Create QR code**.
6. Scan or open the QR/link on the phone before the one-time code expires. AutoByteus Android owns its **Scan QR** flow with a bundled scanner and camera permission handling; it does not require a separately installed generic QR scanner app.
7. The phone exchanges the code for a per-device credential and stores the paired session.

Pairing codes are short-lived and single-use. The long-lived credential is returned only to the phone after the code exchange.

## Paired Phone Behavior

A paired phone stores its session in browser `localStorage` under the mobile web origin. That is acceptable for the PWA MVP but should be treated as less protected than native secure storage. A future native wrapper should move the same credential into platform secure storage.

Because this storage is origin-scoped, pair through the stable travel URL when possible. For example, pairing with `http://192.168.1.25:29695/mobile` and later opening `https://desktop.tailnet-name.ts.net/mobile` uses a different origin and may require re-pairing. The Android app saves the clean stable `/mobile` URL profile, not the one-time `?pairing=` URL.

After pairing, the mobile shell:

- restores the paired node session on reload;
- checks `/rest/remote-access/status` for reachability and Phone Access state;
- holds the post-pair transition in a checking state until status and work catalogs refresh, so a stable Home screen is not shown with stale or unknown node status after successful pairing;
- sends bearer credentials on protected REST/GraphQL requests;
- appends the credential as an `access_token` query parameter for WebSocket connections;
- uses authorized fetch helpers for media, file, artifact, team-reference, and application setup resources;
- keeps server-owned agent/team/workspace routes reachable when they are mobile-safe.

The local **Unpair this phone** action deletes only the phone's local session and returns the UI to the pairing bootstrap without leaving Home or post-pair checking state active. It does not revoke the server-side device record; use the desktop Phone Access card to revoke credentials on the node. Failed or expired pairing exchanges likewise stay on the pairing bootstrap and must not write a local mobile session.

## Revocation and Disable Semantics

- **Disable Phone Access:** paired-device records remain in server data, but non-loopback mobile credentials are rejected while disabled and new pairing sessions cannot be created.
- **Revoke one phone:** that device credential stops working for REST, GraphQL, WebSocket, and protected resource access.
- **Revoke all phones:** every active paired credential is marked revoked and each phone must pair again.
- Local desktop loopback access remains available for desktop management endpoints.

## Mobile Capability Gating

The mobile shell gates truly desktop-only or Electron-only features instead of exposing broken controls. Unsupported feature redirects use `/mobile/?unsupported=<feature>` and render a visible notice in both unpaired and paired states. Terminal and VNC are mobile-supported when their normal workspace/session or host configuration is available.

Examples of mobile-unsupported surfaces include:

- desktop settings management;
- desktop update controls;
- local folder pickers that depend on Electron APIs;
- application iframe surfaces outside the current mobile shell.

Phone Access code paths must not call `window.electronAPI` or other Electron preload APIs.

## Build and Packaging

The mobile static app is generated separately from the desktop/electron shell:

```bash
pnpm -C autobyteus-web build:mobile-web
```

This runs Nuxt generation with:

- `AUTOBYTEUS_MOBILE_WEB_BUILD=true`
- `NUXT_APP_BASE_URL=/mobile/`
- no build-time backend URL

The generated mobile output is copied to `autobyteus-web/dist-mobile/public`. The Electron/server preparation scripts run this build and copy the output into the packaged server bundle as `mobile-web/`, which the backend serves under `/mobile`.

The native Android shell is built separately from `autobyteus-android/`:

```bash
ANDROID_HOME="$HOME/Library/Android/sdk" gradle -p autobyteus-android :app:assembleDebug
```

The Android shell loads the desktop-served `/mobile` URL in WebView. It does not bundle a separate copy of the AutoByteus mobile UI, run AutoByteus locally, or create a second pairing/credential protocol.

When a change touches mobile web code used under `/mobile`, treat the mobile web bundle and the Android APK as separate freshness gates:

- rebuild `autobyteus-web/dist-mobile/public`;
- rebuild or refresh the desktop/server package that serves `mobile-web/`;
- verify the served `/mobile/index.html` hash matches the corrected `dist-mobile/public/index.html`;
- install the corrected Android APK when native shell behavior changed.

Installing a new APK does not update the desktop-served `/mobile` bundle. A stale packaged `mobile-web/` directory can keep serving old JavaScript to Android WebView even when the Android APK is current.

## Troubleshooting

- **Phone cannot reach server:** verify the selected base URL from the phone, OS firewall/private-network ACLs, and VPN/overlay connection.
- **Android over Tailscale cannot reach server:** verify Tailscale is connected on the phone, the desktop is online and awake, the app is not excluded by Tailscale split tunneling, and the saved URL is the same stable URL used during pairing.
- **Android Scan QR does not open the bundled scanner:** rebuild and reinstall the current AutoByteus Android APK and verify the app has camera permission. Current AutoByteus Android does not depend on an external ZXing scanner app.
- **Pairing says disabled:** enable Phone Access from the desktop node before creating or using a QR.
- **Pairing code invalid or expired:** create a new QR. Codes are short-lived and single-use.
- **Mobile Home shows `Error 500` or `localeCompare` after a mobile-web fix:** verify the desktop/server node is serving the freshly rebuilt `/mobile` bundle, not an older packaged `mobile-web/` copy.
- **Credential rejected after pairing:** check whether Phone Access was disabled or the device was revoked; pair again after re-enabling or revocation.
- **WebSocket blocked:** confirm the private network/proxy permits WebSocket traffic to the server port.
- **VNC host unreachable from phone:** configure VNC hosts with LAN, VPN, or overlay hostnames/IPs that the phone can reach; desktop-only loopback names such as `localhost` usually work only on the desktop host.
- **Desktop-only screen on phone:** use the mobile shell link or supported mobile route; unsupported desktop features should render an explanatory mobile notice rather than a desktop shell.
