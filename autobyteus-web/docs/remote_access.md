# Phone Access / Remote Access

Phone Access lets a phone browser, PWA, AutoByteus Android shell, or AutoByteus iOS shell connect to the desktop-owned AutoByteus node over a private network path that the user or organization already trusts. The shared client surface is the Nuxt mobile web shell served by the backend under `/mobile`; native wrappers reuse the same pairing and transport protocol rather than bundling a separate AutoByteus runtime.

## What Phone Access Does

- The desktop app exposes **Phone Setup** in **Settings -> Nodes** for the current node window. Embedded and remote-node windows use the trusted private-network product model for desktop/Electron access; paired phones use separate mobile credentials.
- Phone Setup contains a Tailscale Serve guide plus the **Phone Access** card. The card enables or disables phone access, lists reachable server URL candidates, accepts a manual private-network URL, creates a short-lived pairing QR/link, and separates active paired phones from revoked/history records.
- New desktop-created pairing QR codes require an `https://` URL. The recommended path is Tailscale Serve HTTPS, for example `https://desktop.tailnet-name.ts.net/mobile`.
- For remote-node Phone Access, create the QR from the opened node window. Remote-node QR creation requires a manual phone-facing private HTTPS URL and verifies that URL reaches the same `serverInstanceId` as the desktop management URL.
- The pairing QR opens `https://<private-node>/mobile?pairing=<payload>` on the phone. The payload contains a short-lived one-time pairing code and the selected canonical server base URL.
- After pairing, the phone stores a mobile node session locally and uses the same node endpoint model as the desktop web app to derive REST, GraphQL, and WebSocket URLs from the paired base URL.
- Supported mobile routes run in a phone shell; desktop-only routes redirect back to the mobile shell with an explicit unsupported-feature notice.


## Mobile Shell and Desktop Boundary

Phone Access is additive to the existing desktop/web product. The phone-first shell is mounted under `/mobile` and owns the mobile Home, Chat, Runs, Files, Artifacts, and Activity views. Phase One removes the mobile Tools/Terminal/VNC page entirely. Normal desktop routes, including desktop `/workspace` and browser desktop flows, continue to use the regular desktop shell and must not be rewritten to the mobile shell.

Stale or unsupported phone links such as `/mobile/workspace` stay inside the mobile experience and show an explicit unsupported-feature notice. Desktop-only workflows remain available from desktop/Electron and should not be forked or degraded by mobile journey refinements.

The mobile shell can start new agent and team runs without falling back to hidden desktop defaults. The **Start new** surface uses the same launch configuration stores and runtime/model semantics as desktop: the user selects the run target, workspace, runtime/model, and launch options, then creates the run. It does not collect or send the first chat message. After creation, mobile opens the new run on Chat and the user sends from the normal composer.

Mobile **Start new** workspace selection is a launch-workspace flow, not the Recent-work/context switcher. It lists workspaces currently known to the workspace store, including workspaces that are not attached to a live run, and includes **Load workspace by server path** for unlisted workspaces. The path entered there is an absolute path on the paired AutoByteus node or container, not on the phone. Loading a path uses the existing workspace create/load boundary and selects the returned workspace for the active agent or team launch config.

Mobile **Auto approve tools** is available when the selected agent or team has an active launch config. The switch remains off by default and writes the existing `autoExecuteTools` launch-config field; it must not create a mobile-only approval flag or change backend approval semantics. For team launches, the global team setting is preserved in the team config and inherited by generated member configs unless an existing member override explicitly supersedes it.

For team runs, mobile exposes a **Message target** selector only on the work tabs where that focus affects the current run, such as Chat, Files, Artifacts, and Activity. The selector is intentionally hidden on the Runs tab and while **Start new** is open because team-message focus belongs to Chat, not run configuration. The current mobile client remembers the last valid focused member per team run for Recent-work reopen; that memory is client-local and is not a cross-device/backend persistence contract.

Draft context files attached before mobile run creation remain available for the first Chat send. Agent-run draft files transfer into the new agent composer tray. Team-run draft files remain mobile-owned pending attachments keyed by the team run until the first Chat send, then flush to the currently selected focused leaf member.

The mobile **Files** view is a phone-first read-only workspace browser. It resolves the workspace from the current workspace, agent-run, or team-run context and must not fall back to an unrelated active or first workspace when a selected run's workspace root cannot be resolved. Folder taps lazy-load children through the existing workspace file-explorer store, full-workspace search uses the shared file search boundary, and file taps open a full-screen mobile viewer over the shared file viewer state. Supported mobile preview families include text/Markdown/code, image, audio, video, PDF, CSV, and Excel through the existing protected workspace content routes and authorized resource loaders. The mobile viewer keeps an **Attach** action for adding workspace paths to the current run chat context, pending team-run context, or next-run draft, but mobile file editing, rename, delete, move, create, and desktop context-menu operations remain out of scope.

The mobile **Artifacts** view exposes run-scoped generated and touched files through the existing run artifact store and authorized artifact content viewer. It is separate from Files: Files browses a workspace, while Artifacts follows the selected agent run or focused team member run.

Mobile team-message reference files are separate from both Files and Artifacts. Team message cards render structured `referenceFiles` rows from Team Communication data; tapping a row opens a mobile full-screen wrapper around the message-owned reference viewer using `teamRunId`, `messageId`, and `referenceId`. Raw prose paths are not linkified. The viewer fetches `/rest/team-runs/:teamRunId/team-communication/messages/:messageId/references/:referenceId/content` with the paired mobile bearer credential, preserves the focused team-message context on close, and disables rich HTML preview in the mobile shell while keeping raw/Markdown and protected media/PDF/CSV/Excel previews available through authorized fetch/object URLs.

Interactive Terminal and VNC are not mobile Phone Access surfaces in Phase One. Historical terminal-command tool output can still appear as read-only Activity content, but mobile users must not see a terminal tab, Tools tab, VNC panel, or command-entry path.

## Mobile UX Contract

This contract is limited to the `/mobile` phone shell. Compact-copy policy belongs in mobile presentation code and must not change desktop journeys, core stores, backend services, GraphQL/REST/WebSocket contracts, or runtime behavior. Shared monitor layout changes for the mobile shell must either be mobile-opt-in or behavior-neutral for existing desktop callers.

The paired phone shell is intentionally compact. Mobile Home shows AutoByteus identity, node connection state, node address, current work, recent work rows, and switching/troubleshooting actions without repeating desktop-style section labels such as `Mobile Home`, `Current node`, `Current work context`, or a duplicate `Primary next action` card. Recent/current work cards are the resume/open affordance; the old one-off continue-latest action is not part of the mobile contract.

Mobile work headers show the selected work name plus compact status, path, or profile metadata. Default compact mobile metadata should not append visible `Agent run` or `Team run` type suffixes. Type semantics may remain available through structured context and accessible labels when needed.

Mobile Chat owns a fixed viewport-height work frame. The transcript/feed is the scroll owner (`overscroll-contain`), while the composer and bottom tab navigation stay anchored inside the viewport. Work-screen wrappers must keep `min-h-0`, `overflow-hidden`, and safe-area-aware containment across each flex boundary so long conversations cannot create document/body scroll or blank space below the controls.

For team runs, Chat/Files/Artifacts/Activity can expose a compact target picker with the focused member name and a symbolic chevron/dropdown affordance instead of a visible `Change` action. Preserve accessible naming for the target control, but do not reintroduce visible duplicate copy such as `Message target`, `Current: ...`, or explanatory alignment text once a target is selected.

Mobile Activity exposes concrete category filters for Messages and Activity. The previous aggregate `All` filter/view is intentionally absent so each tab has a distinct purpose. Do not add separate mobile-only issue filters such as Errors or Approvals; error and approval state should remain visible on the relevant tool/activity rows instead of through extra filter controls.

Do not reintroduce mobile Tools/Terminal/VNC copy or controls in Phase One. Any future mobile tool surface must go through a separate security and UX design.

## Browser/PWA App Shell Metadata

The `/mobile` route links lightweight browser install metadata through `mobile.webmanifest`, mobile icons, standalone display mode, and theme-color/head tags. This metadata is intentionally limited to app-shell presentation for browser users; it does not add a service worker, offline authenticated cache, alternate API protocol, or cached credential path. If future work adds offline behavior, it must be designed separately so paired credentials and protected node data cannot become stale or broadly cached.

## Network Model

AutoByteus does not require or special-case a VPN vendor. Phone Access only requires that the phone can reach the desktop/server node URL selected during pairing.

Supported setup profiles include:

- **Same LAN:** use the desktop's LAN address and the AutoByteus server port when the local firewall allows it.
- **Tailscale:** use the desktop's full MagicDNS hostname/FQDN when possible.
- **Tailscale Serve HTTPS:** recommended for Android, iOS, and travel; expose the desktop node as a stable HTTPS tailnet URL such as `https://desktop.tailnet-name.ts.net/mobile`. IPv4 and IPv6 values shown in the Tailscale app are useful diagnostics, but the preferred HTTPS Serve URL uses the MagicDNS hostname that matches the certificate/Serve hostname path.
- **Headscale:** use the same Tailscale-compatible client flow against a self-hosted control plane.
- **Company VPN / private DNS:** use the internal hostname or IP that resolves to the desktop/server node.
- **NetBird, Netmaker, or WireGuard:** use the private overlay address or hostname that reaches the node.

For phone/mobile clients, the app-level pairing credential is still required; a private network or VPN is not treated as sufficient mobile authorization by itself. Desktop/Electron remote-node access to the full backend is separate and follows the trusted private-network product model documented below.

## Server Base URL vs Mobile URL

Phone Access keeps two URL identities separate:

- **Canonical `serverBaseUrl`:** the internal node API base used for REST, GraphQL, and WebSocket calls. It is the origin plus any deployment base path, without `/mobile`, `/rest`, `/graphql`, `/ws`, query, or hash.
- **`mobileUrl`:** the user-facing phone shell URL derived by appending `/mobile` to the canonical server base.

You may paste a mobile shell URL into the Phone Access field. AutoByteus normalizes it before creating the pairing payload:

```text
Input:              https://desktop.tailnet.ts.net/mobile
Stored serverBase:  https://desktop.tailnet.ts.net
QR/mobileUrl:       https://desktop.tailnet.ts.net/mobile?pairing=...
Status/exchange:    https://desktop.tailnet.ts.net/rest/remote-access/...
```

Deployment base paths are preserved:

```text
Input:              https://gateway.example.com/autobyteus/mobile
Stored serverBase:  https://gateway.example.com/autobyteus
QR/mobileUrl:       https://gateway.example.com/autobyteus/mobile?pairing=...
```

## Normal Docker Node Pairing Flow

1. Install the Docker launcher from **Settings -> Nodes -> Docker Guide**.
2. Create a Docker node:

   ```bash
   autobyteus-docker new-container
   ```

3. Add the printed Backend URL as a remote node in **Settings -> Nodes -> Manage Nodes**, then click **Open** on that Docker node.
4. In the Docker node window, open **Settings -> Nodes -> Phone Setup**. Desktop/Electron access to that node follows the trusted private-network product model and does not require a separate setup secret.
5. Configure a phone-facing private HTTPS URL that maps to the Docker node, for example Tailscale Serve or company-controlled HTTPS ingress.
6. Paste the HTTPS `/mobile` URL in the Docker node Phone Access card. AutoByteus compares `/rest/remote-access/status` from the management URL and advertised URL and requires matching `serverInstanceId` values.
7. Enable Phone Access, create the QR, and scan it with the Android/iOS native wrapper or open it in the mobile browser. The pairing exchange and paired-device records belong to the Docker node.

The embedded host desktop node should not mint QR codes for a different remote node, and Docker bridge/LAN addresses must not be treated as loopback owner trust.

## Trusted Remote Node Access vs Phone Credentials

Remote node windows have two separate authority boundaries:

- **Desktop/Electron remote-node access:** the full backend is intended for trusted private networks such as LANs, company VPNs, or tailnets. The default active flow does not add a user-facing setup secret before desktop/Electron can use a registered remote node. Do not expose the full backend directly to the public internet; strict owner pairing would be a separate future opt-in design.
- **Phone/mobile credential:** the Phone Access QR pairing exchange returns a separate `mra_...` mobile credential to the phone. Mobile REST and GraphQL use the mobile credential as a bearer token, and WebSocket uses the same credential in the `access_token` query parameter.

Mobile credentials must not authorize owner-management routes such as settings changes, pairing-session creation, device listing, or revocation. Pairing payloads contain a short-lived one-time code and server base URL, not desktop owner authority. Credential-bearing URLs, pairing payloads, mobile credentials, and authorization headers must be redacted from logs and diagnostics.

## Embedded Desktop Pairing Flow

Use this when the embedded desktop node itself is the node your phone should use. For a separate server Docker node, use the Docker flow above.

1. Start the desktop Electron app so the bundled server is running.
2. Open **Settings -> Nodes -> Phone Setup**.
3. Install/sign in to Tailscale.app on the Mac and Tailscale on the phone.
4. On macOS with **Tailscale.app** installed, sign in through the app UI and confirm the full MagicDNS hostname/FQDN there. AutoByteus only shows copyable commands; it does not run Tailscale or inspect local Tailscale state. Use the bundled app executable directly for Serve:

   ```bash
   /Applications/Tailscale.app/Contents/MacOS/Tailscale serve 29695
   /Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg 29695
   /Applications/Tailscale.app/Contents/MacOS/Tailscale serve status
   /Applications/Tailscale.app/Contents/MacOS/Tailscale serve reset
   ```

5. Copy the private HTTPS MagicDNS URL from `serve status` and use the `/mobile` shell URL shape, for example `https://desktop.tailnet-name.ts.net/mobile`. The Tailscale Serve HTTPS QR target normally does **not** include `:29695`; that port belongs to local HTTP/interface diagnostics.
6. Prefer the full MagicDNS hostname/FQDN shown by Tailscale. Do not use IPv4/IPv6 or HTTP interface candidates such as `http://100.x.y.z:29695` or `http://192.168.x.x:29695` as the normal QR target.
7. Enable **Phone Access**.
8. Paste the HTTPS MagicDNS `/mobile` URL into the **Tailscale Serve HTTPS URL** field. HTTP-only discovered candidates are left as diagnostics and are not auto-selected for new HTTPS-required QR creation.
9. Click **Create QR code**.
10. Scan or open the QR/link on the phone before the one-time code expires. AutoByteus Android and iOS own their **Scan QR** flows with app-owned scanner/camera permission handling; they do not require a separately installed generic QR scanner app.
11. The phone exchanges the code for a per-device credential and stores the paired session.

Pairing codes are short-lived and single-use. The long-lived credential is returned only to the phone after the code exchange.

Official Tailscale references for this setup:

- [Tailscale Serve](https://tailscale.com/docs/features/tailscale-serve)
- [HTTPS certificates](https://tailscale.com/docs/how-to/set-up-https-certificates)
- [MagicDNS](https://tailscale.com/docs/features/magicdns)

## Paired Phone Behavior

A paired phone stores its session in browser/WebView `localStorage` under the mobile web origin. That is acceptable for the current Phone Access MVP but should be treated as less protected than native secure storage. The current native Android/iOS wrappers deliberately load the same `/mobile` shell and do not persist `mra_...` credentials natively; the iOS wrapper saves only node profile metadata. Any future native credential-storage hardening should be designed separately with backend authorization changes.

Because this storage is origin-scoped, pair through the stable travel URL when possible. For example, pairing with `http://192.168.1.25:29695/mobile` and later opening `https://desktop.tailnet-name.ts.net/mobile` uses a different origin and may require re-pairing. The native Android/iOS wrappers save the clean stable `/mobile` URL profile, not the one-time `?pairing=` URL.

After pairing, the mobile shell:

- restores the paired node session on reload;
- checks `/rest/remote-access/status` for reachability and Phone Access state;
- holds the post-pair transition in a checking state until status and work catalogs refresh, so a stable Home screen is not shown with stale or unknown node status after successful pairing;
- sends bearer credentials on protected REST/GraphQL requests;
- appends the credential as an `access_token` query parameter for WebSocket connections;
- uses authorized fetch helpers for media, file, artifact, team-reference, and application setup resources;
- keeps server-owned agent/team/workspace routes reachable when those routes accept paired mobile credentials.

The local **Unpair this phone** action deletes only the phone's local session and returns the UI to the pairing bootstrap without leaving Home or post-pair checking state active. It does not revoke the server-side device record; use the desktop Phone Access card to revoke credentials on the node. Failed or expired pairing exchanges likewise stay on the pairing bootstrap and must not write a local mobile session.

## Revocation and Disable Semantics

- **Disable Phone Access:** paired-device records remain in server data, but non-loopback mobile credentials are rejected while disabled and new pairing sessions cannot be created.
- **Revoke one phone:** that device credential stops working for REST, GraphQL, WebSocket, and protected resource access.
- **Revoke all phones:** every active paired credential is marked revoked and each phone must pair again.
- **Active vs revoked lists:** `GET /remote-access/devices` returns active paired-device summaries only. Revoked records are retained and exposed to local desktop management through `GET /remote-access/devices/revoked`; they appear only in the non-actionable Revoked/History view.
- Local desktop loopback access remains available for desktop management endpoints.

## Mobile Capability Gating

The mobile shell gates truly desktop-only or Electron-only features instead of exposing broken controls. Unsupported feature redirects use `/mobile/?unsupported=<feature>` and render a visible notice in both unpaired and paired states. Run Artifacts are mobile-supported when their normal run context is available. Browser remains unsupported in the current mobile shell because the existing Browser surface is Electron-owned through preload IPC and native WebContentsView projection.

Phase One explicitly removes mobile Terminal and VNC from supported mobile features. Backend operation-level hard denial and broader mobile authorization/token/session hardening are tracked for Phase Two; Docker-node pairing is not a substitute for that future work.

Examples of mobile-unsupported surfaces include:

- desktop settings management;
- desktop update controls;
- local folder pickers that depend on Electron APIs;
- application iframe surfaces outside the current mobile shell;
- the desktop Browser tab, which depends on Electron Browser IPC/native surface projection.

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

The generated mobile output is copied to `autobyteus-web/dist-mobile/public`. The Electron/server preparation scripts and server Docker image builds run this build and copy the output into the packaged server bundle as `mobile-web/`, which the backend serves under `/mobile`.

The native Android shell is built separately from `autobyteus-android/`:

```bash
ANDROID_HOME="$HOME/Library/Android/sdk" gradle -p autobyteus-android :app:assembleDebug
```

The Android shell loads the desktop-served `/mobile` URL in WebView. It does not bundle a separate copy of the AutoByteus mobile UI, run AutoByteus locally, or create a second pairing/credential protocol.

The native iOS shell is generated and built separately from `autobyteus-ios/`:

```bash
autobyteus-ios/scripts/generate-project.sh
xcodebuild \
  -project autobyteus-ios/AutoByteusMobile.xcodeproj \
  -scheme AutoByteusMobile \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  build
```

The iOS shell loads the desktop-served `/mobile` URL in `WKWebView`. It does not bundle a separate copy of the AutoByteus mobile UI, run AutoByteus locally, or create a second pairing/credential protocol.

When a change touches mobile web code used under `/mobile`, treat the mobile web bundle and native wrapper builds as separate freshness gates:

- rebuild `autobyteus-web/dist-mobile/public`;
- rebuild or refresh the desktop/server package that serves `mobile-web/`;
- verify the served `/mobile/index.html` hash matches the corrected `dist-mobile/public/index.html`;
- install the corrected Android APK or iOS app build when native shell behavior changed.

Installing a new native wrapper build does not update the desktop-served `/mobile` bundle. A stale packaged `mobile-web/` directory can keep serving old JavaScript to Android WebView or iOS `WKWebView` even when the native wrapper build is current.

## Troubleshooting

- **Phone cannot reach server:** verify the selected base URL from the phone, OS firewall/private-network ACLs, and VPN/overlay connection.
- **Create QR is blocked for HTTP:** run Tailscale Serve and use the private HTTPS URL before creating a new desktop pairing QR.
- **Android/iOS over Tailscale cannot reach server:** verify Tailscale is connected on the phone, the desktop is online and awake, the app is not excluded by Tailscale split tunneling, and the saved URL is the same stable URL used during pairing.
- **Native Scan QR does not open the bundled scanner:** rebuild and reinstall the current AutoByteus Android APK or iOS app, then verify the app has camera permission. Current AutoByteus native wrappers do not depend on an external QR scanner app.
- **Pairing says disabled:** enable Phone Access from the desktop node before creating or using a QR.
- **Pairing code invalid or expired:** create a new QR. Codes are short-lived and single-use.
- **Mobile Files shows no files for a selected run/team run:** confirm the selected run's workspace root is registered on the paired node, then retry from Files. The mobile shell should show a workspace-unavailable state rather than silently browsing a different workspace.
- **Mobile reference file does not open:** confirm the paired credential is still valid and the node can serve the message-owned `/rest/team-runs/.../team-communication/.../references/.../content` route; reference files are not loaded through the Artifacts route.
- **Mobile Home shows `Error 500` or `localeCompare` after a mobile-web fix:** verify the desktop/server node is serving the freshly rebuilt `/mobile` bundle, not an older packaged `mobile-web/` copy.
- **Credential rejected after pairing:** check whether Phone Access was disabled or the device was revoked; pair again after re-enabling or revocation.
- **Docker node desktop window cannot reach backend:** confirm the Backend URL printed by `autobyteus-docker` is reachable from the desktop over a trusted LAN, VPN, tailnet, or equivalent private-network path. Do not expose the full backend directly to the public internet.
- **WebSocket blocked:** confirm the private network/proxy permits WebSocket traffic to the server port.
- **Remote-node QR creation says URL mismatch:** the phone-facing HTTPS URL is not reaching the same node as the desktop management URL. Recheck the Tailscale Serve/private ingress mapping to the node Backend.
- **Fresh Docker `/mobile` returns missing assets:** upgrade/recreate from a current server Docker image. Current public launcher, remote-server, and all-in-one image paths package `autobyteus-server-ts/mobile-web` during the image build.
- **Desktop-only screen on phone:** use the mobile shell link or supported mobile route; unsupported desktop features should render an explanatory mobile notice rather than a desktop shell.
