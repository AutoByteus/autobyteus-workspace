# Phone Access / Remote Access

Phone Access lets a phone browser or PWA connect to the desktop-owned AutoByteus node over a private network path that the user or organization already trusts. The first supported client is the Nuxt mobile web shell served by the backend under `/mobile`; Android/iOS native wrappers can reuse the same pairing and transport protocol later.

## What Phone Access Does

- The desktop app exposes a **Phone Access** card in **Settings -> Nodes** for the embedded desktop node.
- The card enables or disables phone access, lists reachable server URL candidates, accepts an advanced/manual private-network URL, creates a short-lived pairing QR/link, and lists paired phones.
- The pairing QR opens `http://<private-node>:<port>/mobile?pairing=<payload>` on the phone. The payload contains a short-lived one-time pairing code and the selected server base URL.
- After pairing, the phone stores a mobile node session locally and uses the same node endpoint model as the desktop web app to derive REST, GraphQL, and WebSocket URLs from the paired base URL.
- Supported mobile routes run in a phone shell; desktop-only routes redirect back to the mobile shell with an explicit unsupported-feature notice.


## Mobile Shell and Desktop Boundary

Phone Access is additive to the existing desktop/web product. The phone-first shell is mounted under `/mobile` and owns the mobile Home, Chat, Runs, Files, and Activity views. Normal desktop routes, including desktop `/workspace` and browser desktop flows, continue to use the regular desktop shell and must not be rewritten to the mobile shell.

Stale or unsupported phone links such as `/mobile/workspace` stay inside the mobile experience and show an explicit unsupported-feature notice. Desktop-only workflows remain available from desktop/Electron and should not be forked or degraded by mobile journey refinements.

The mobile shell can start new agent and team runs without falling back to hidden desktop defaults. The **Start new** surface uses the same launch configuration stores and runtime/model semantics as desktop: the user selects the run target, workspace, runtime/model, and first prompt, and launch stays disabled until those required choices are ready. For team launches, mobile also lets the user choose the initial leaf team member that receives the first prompt.

For existing team runs, mobile exposes a **Message target** selector only on the work tabs where that focus affects the current run, such as Chat, Files, and Activity. The selector is intentionally hidden on the Runs tab and while **Start new** is open so it cannot be confused with the launch-time **First message target** selector. The current mobile client remembers the last valid focused member per team run for Recent-work reopen; that memory is client-local and is not a cross-device/backend persistence contract.

## Network Model

AutoByteus does not require or special-case a VPN vendor. Phone Access only requires that the phone can reach the desktop/server node URL selected during pairing.

Supported setup profiles include:

- **Same LAN:** use the desktop's LAN address and the AutoByteus server port when the local firewall allows it.
- **Tailscale:** use the desktop's tailnet IP or MagicDNS hostname.
- **Headscale:** use the same Tailscale-compatible client flow against a self-hosted control plane.
- **Company VPN / private DNS:** use the internal hostname or IP that resolves to the desktop/server node.
- **NetBird, Netmaker, or WireGuard:** use the private overlay address or hostname that reaches the node.

The app-level pairing credential is still required. A private network or VPN is not treated as sufficient authorization by itself.

## Desktop Pairing Flow

1. Start the desktop Electron app so the bundled server is running.
2. Open **Settings -> Nodes**.
3. Enable **Phone Access**.
4. Pick a **Reachable server URL**. Prefer a non-loopback LAN/VPN URL for a real phone. Use **Manual/private-network URL** when the desired company VPN or overlay hostname is not auto-discovered.
5. Click **Create QR code**.
6. Scan or open the QR/link on the phone before the one-time code expires.
7. The phone exchanges the code for a per-device credential and stores the paired session.

Pairing codes are short-lived and single-use. The long-lived credential is returned only to the phone after the code exchange.

## Paired Phone Behavior

A paired phone stores its session in browser `localStorage` under the mobile web origin. That is acceptable for the PWA MVP but should be treated as less protected than native secure storage. A future native wrapper should move the same credential into platform secure storage.

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

The mobile MVP intentionally gates desktop-only features instead of exposing broken controls. Unsupported feature redirects use `/mobile/?unsupported=<feature>` and render a visible notice in both unpaired and paired states.

Examples of mobile-unsupported surfaces include:

- desktop settings management;
- desktop update controls;
- local folder pickers that depend on Electron APIs;
- application iframe surfaces outside the current mobile MVP.

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

## Troubleshooting

- **Phone cannot reach server:** verify the selected base URL from the phone, OS firewall/private-network ACLs, and VPN/overlay connection.
- **Pairing says disabled:** enable Phone Access from the desktop node before creating or using a QR.
- **Pairing code invalid or expired:** create a new QR. Codes are short-lived and single-use.
- **Credential rejected after pairing:** check whether Phone Access was disabled or the device was revoked; pair again after re-enabling or revocation.
- **WebSocket blocked:** confirm the private network/proxy permits WebSocket traffic to the server port.
- **Desktop-only screen on phone:** use the mobile shell link or supported mobile route; unsupported desktop features should render an explanatory mobile notice rather than a desktop shell.
