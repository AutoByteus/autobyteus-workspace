# Phone Access / Remote Access

Phone Access lets a phone browser, PWA, AutoByteus Android shell, or AutoByteus iOS shell connect to the desktop-owned AutoByteus node over a private network path that the user or organization already trusts. The shared client surface is the Nuxt mobile web shell served by the backend under `/mobile`; native wrappers reuse the same pairing and transport protocol rather than bundling a separate AutoByteus runtime.

## What Phone Access Does

- The desktop app exposes **Phone Setup** in the top-level **Nodes** screen for the node of the current window: the desktop's own node, a Docker node on this computer, or a node on another machine. Desktop/Electron access to a node uses the trusted private-network product model; paired phones use separate mobile credentials.
- Phone Setup is one panel, **Phones** (`components/settings/phone/PhonesPanel.vue`, state in `stores/phoneAccessStore.ts`). The user never types or chooses an address: see [Connecting a phone](#connecting-a-phone).
- The pairing QR opens `<address>/mobile?pairing=<payload>` on the phone. The payload (`version: 1`, unchanged) holds a five-minute single-use pairing code, one address the desktop checked to reach this node, and the node's name as the phone shows it (`serverName`).
- After pairing, the phone stores a mobile node session locally (with the node's name, `nodeName`) and uses the same node endpoint model as the desktop web app to derive REST, GraphQL, and WebSocket URLs from the paired base URL.
- Supported mobile routes run in a phone shell; desktop-only routes redirect back to the mobile shell with an explicit unsupported-feature notice.


## Mobile Shell and Desktop Boundary

Phone Access is additive to the existing desktop/web product. The phone shell is mounted under `/mobile`. Normal desktop routes, including standard `/workspace` and browser desktop flows, continue to use the regular adaptive web/desktop shell and must not be rewritten to the mobile shell.

Stale or unsupported phone links such as `/mobile/workspace` stay inside the mobile experience and show the unsupported-feature notice above the run list. Desktop-only workflows remain available from desktop/Electron and should not be forked or degraded by mobile journey refinements.

### Screens (autobyteus-277)

- **Run list** — the phone's only main screen. It lists the same runs as the desktop Runs view (`runListStore`): every non-archived top-level Agent, Team and Org run, newest first by last activity, the newest five then **Show older (N)**. Under each run is its delegated work as a tree: task agents and task teams under an Agent run, members under a Team or Org run, a member's own delegated work under it, and runs on other nodes with their node's chip (autobyteus-278). A run with delegated work and an Org run start unfolded; a team's members start folded. A task agent or task team row shows its current Task's summary, a run on another node its title, and every other row (members, an Org's task rows) its name only. A delegated row under a listed Agent run that is active and not open follows its child's current state on each poll, as on the desktop (see [Workspace layout](./workspace_layout.md), "Delegated row states"); a row on another node keeps its own state source. The top bar's node name opens the connection sheet; the round **+** opens New run. The phone reads the complete history and polls it every 5 s only while the list is on screen and the page is in front.
- **Run screen** — a tap on a row's body opens that agent's conversation with the shared composer; a Team run opens its coordinator, and an Org run opens the first member of its configuration (a Team member opens its coordinator). One 56px bar: ←, the agent's name with its state and "in <parent>", and ⋮. While an open is pending the screen shows only "Opening…". A run on a node that does not answer shows the remote notice instead of the conversation.
- **⋮ views** — Artifacts, Files, Messages (members of a Team or Org only) and Activity, each its own screen for the open agent. Files is a read-only browser of the open agent's folder with one search over the workspace, no filters; an opened file is full screen with no Attach. Messages lists the member's messages with their file references; a reference opens full screen. A remote run's Artifacts and Files say the files are on that node.
- **New run** — an agent run only: Agent, Folder (with "Open a folder by path", an absolute path on the paired node; a path that is not an existing absolute folder there is refused with the reason under the field, such as "No folder at this path.", and nothing is registered), Runtime, Model and Auto approve tools, each choice a bottom sheet. Agent is preselected: the agent of the run opened before, else the Project Task Manager, else the first agent. **Create run** creates the run and opens its conversation for the first message.
- **Connection sheet** — the paired node's name (no address, host or URL: autobyteus-433), its state with a refresh icon while it is reachable and **Retry** when it is not, **Switch node** in the Android app (it opens the app's node list; the shell bridge, below), and **Unpair from <node>**. The sheet lists no peer nodes; runs on other nodes keep their node chips in the run list.

### Trusted private HTTP and Android 15

- On the documented trusted private HTTP pairing the page is not a secure context, so `crypto.randomUUID` is missing. Message, command and client ids come from one helper, `utils/randomId.ts` (`createRandomId()`), which builds the same UUID from `crypto.getRandomValues` there.
- Android 15 draws a targetSdk 35 app edge-to-edge. The Android shell pads its screens with the status bar, the navigation bar, a display cutout and the keyboard (`ui/SystemBarInsets.kt`), so the phone's bars, ⋮ and the composer stay visible and tappable and the composer stays above the keyboard. Inside that padded WebView the page's `env(safe-area-inset-*)` reads 0, so the phone's CSS adds no second padding; before Android 15 the window keeps the bars apart and nothing moves.

### Ownership

The phone keeps no model of its own. It reads the desktop's owners: `runListStore` and the shared disclosure (`useRunListDisclosure`), the collaboration, Team and Org row sources, the shared open actions in their `shell: 'mobile'` mode (they select or open and do no navigation), and `activeContextStore.activeWorkspaceTarget` for what is open. The screen state lives in `/mobile`'s route query, written only by `useMobileNavigation`, so the system Back key walks file/reference → view → run → list. The open Org's keys (`agentOrgRouteQuery`) are kept on the list entry too, so the list still marks it after ←. The pending open is `mobileRunOpeningStore`.

Mobile **Auto approve tools** writes the existing `autoExecuteTools` launch-config field; it must not create a mobile-only approval flag or change backend approval semantics. For `antigravity_cli` the switch is on and locked, because Antigravity always runs with auto-approve.

The interactive Terminal is not a mobile Phone Access surface. Historical terminal-command tool output can still appear as read-only Activity content, but mobile users must not see a terminal tab, Tools tab, or command-entry path. The paired node's desktop is offered as the **VNC Viewer** view (see [Node desktop on the phone](#node-desktop-on-the-phone)).

## Mobile UX Contract

This contract is limited to the `/mobile` phone shell. Compact-copy policy belongs in mobile presentation code and must not change desktop journeys, core stores, backend services, GraphQL/REST/WebSocket contracts, or runtime behavior. Shared monitor layout changes for the mobile shell must either be mobile-opt-in or behavior-neutral for existing desktop callers.

The approved UI/UX specification of autobyteus-277 is normative for the phone's layout, copy and states. Only what its "What Is Not On The Phone" list puts on the phone appears; the rest is simply absent, with no explanatory text: no Home, no "Switch work" sheet, no tabs, no Workspaces or Projects views, no Team or Org start, no Stop/Archive/Delete on rows, no Files filters and no Attach on an opened file. Every screen is a full-viewport column (`100dvh`) that respects the safe areas; touch targets are at least 44×44 CSS px and nothing scrolls horizontally at 360 px.

Do not reintroduce mobile Tools/Terminal copy or controls. Any future mobile tool surface must go through a separate security and UX design (the VNC Viewer went through one: autobyteus-394/407).

## Browser/PWA App Shell Metadata

The `/mobile` route links lightweight browser install metadata through `mobile.webmanifest`, mobile icons, standalone display mode, and theme-color/head tags. This metadata is intentionally limited to app-shell presentation for browser users; it does not add a service worker, offline authenticated cache, alternate API protocol, or cached credential path. If future work adds offline behavior, it must be designed separately so paired credentials and protected node data cannot become stale or broadly cached.

## Network Model

AutoByteus does not require or special-case a VPN vendor, and it never installs, runs or configures Tailscale or any other network software. Phone Access only requires that the phone can reach the address in the QR.

The node reports the network facts of the computer it runs on (`GET /rest/remote-access/network`; the rules are in `autobyteus-server-ts/docs/features/remote_access.md`, Node Network And Ways To Connect). The desktop turns them into four **ways to connect**, in this order of preference:

| Way (`connectionWay`) | Address used | Trust decision |
| --- | --- | --- |
| Company address (`company_address`) | The node's configured address (`AUTOBYTEUS_SERVER_HOST`), or one the user types ("Enter the address your IT gave you") | None: typing it and pressing **Use this address** is the decision |
| Tailscale (`tailscale`) | The node's Tailscale HTTPS name when it reaches this node, else its Tailscale address (`100.x`, confirmed by a `.ts.net` reverse name or a `tailscale*` interface) with the node's port | None: Tailscale encrypts device to device |
| Your VPN (`vpn`) | A private address on a tunnel interface (WireGuard and similar, also Headscale, NetBird, Netmaker) with the node's port | None |
| Same Wi-Fi or LAN (`local_network`) | The computer's local address with the node's port, default-route first | Asked once per local network: "Allow phones on this network?" |

- Every address is checked before it goes into a QR: `GET <address>/rest/remote-access/status` must answer with the node's own `nodeId` within 2 s. A way is ready when one of its addresses passes.
- Never offered: loopback, link-local (`fe80::`, `169.254.*`), container-internal and bridge addresses, IPv6 addresses, and public plain-HTTP addresses. An unconfirmed `100.64/10` address is treated as a local-network address.
- The "Allow phones on this network?" answer is kept per local network, recognised by its network ID (`gw_<hash>` of the router's hardware address, or `this-computer` when it cannot be read), and shared by every node on this computer. On a new network the desktop asks again. **Wi-Fi/LAN allowed on this network** in the tab turns it off again.
- Platform priority: macOS and Linux hosts are checked for Tailscale, VPN and network recognition. On Windows an unrecognised VPN is treated as a local network and asked, and the answer is kept per computer.
- The node's URL policy still refuses public HTTP and phone-unreachable local-only hosts (`localhost`, `127.*`, `0.0.0.0`, `::1`, `host.docker.internal`), also for a typed company address.

For phone/mobile clients, the app-level pairing credential is still required; a private network or VPN is not treated as sufficient mobile authorization by itself. Desktop/Electron remote-node access to the full backend is separate and follows the trusted private-network product model documented below.

## Server Base URL vs Mobile URL

Phone Access keeps two URL identities separate:

- **Canonical `serverBaseUrl`:** the internal node API base used for REST, GraphQL, and WebSocket calls. It is the origin plus any deployment base path, without `/mobile`, `/rest`, `/graphql`, `/ws`, query, or hash.
- **`mobileUrl`:** the user-facing phone shell URL derived by appending `/mobile` to the canonical server base.

A typed company address may be a mobile shell URL. The node normalizes every address before creating the pairing payload:

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

## Connecting a phone

The same steps work in every node's window: the desktop's own node, a Docker node, or a node on another machine.

1. Open the node's window (for a Docker node or a node on another machine: add it in **Nodes -> Manage Nodes**, then click **Open**) and go to **Nodes -> Phone Setup**.
2. The panel shows the four ways to connect as tabs (**Same Wi-Fi or LAN**, **Tailscale**, **Your VPN**, **Company address**). Each tab says whether it is ready on this computer, how it works, and When / Setup / Safety in plain words. The best ready way is selected and marked **Recommended**.
3. Press the tab's **Show QR code**. When Phone access is off the button reads **Turn on and show QR code**; the press turns it on. On **Same Wi-Fi or LAN** the first press on a network is **Allow and show QR code**, the "Allow phones on this network?" decision.
4. The QR appears with one line on how the phone will connect ("Works anywhere through Tailscale", "Works through your VPN", "Works on this network", "Works through the address set up for this node (…)"), its remaining time ("Valid for 5:00") and **Close**. The QR holds only that tab's best checked address.
5. Scan it with the AutoByteus Android app: the phone connects with no other input. A phone without the app scans it with its camera: the browser opens the node's page, which pairs with one **Connect to <node>** tap and offers **Get the Android app**.

The code's life on the desktop:

- **Close**, another tab, **New code**, leaving the panel or turning Phone access off discards the code on the node (`DELETE /rest/remote-access/pairing-sessions/:sessionId`); a phone using it is refused.
- After five minutes the panel says "This code has expired" and offers **New code**. A used code is refused.

The phone's name for the node comes from the QR: the desktop's own node is named after this computer (for example "MacBook Pro"); every other node keeps its name from the Nodes page.

Per kind of node:

- **The desktop's own node:** the addresses are this computer's. **Advanced** in the Tailscale tab shows, when Tailscale runs but its HTTPS name does not reach this node, the one command that gives the node an `https://` name on the tailnet (`tailscale serve --bg <port>`), with **Copy** and **Check again**. AutoByteus shows it and never runs it, and never offers `serve reset`, which would remove the user's other Serve mappings.
- **A Docker node on this computer** (the node runs in a container and the desktop reaches it on loopback): the addresses are this computer's addresses with the port the node is published on, each checked to reach the Docker node. A node published only on `127.0.0.1` gets "<node> isn't reachable from other devices. Publish its port on this computer's network, then try again." Its Advanced command uses its own HTTPS port (`--https=8443…8542`, by the order the nodes were added), so it does not take the desktop's 443. The "Allow phones on this network?" answer is kept by the desktop's own node, for every node on this computer.
- **A node on another machine:** the addresses are that node's own and the address the desktop reaches it at, each checked. When none can be checked, every tab is not ready and **Company address** offers "Enter the address your IT gave you"; a typed address that does not reach the node gets "This address doesn't reach <node>." and no code. That node keeps its own "Allow phones on this network?" answers.

The pairing exchange and paired-device records belong to the node whose window made the code. Docker bridge and LAN addresses are never treated as loopback owner trust.

## Trusted Remote Node Access vs Phone Credentials

Remote node windows have two separate authority boundaries:

- **Desktop/Electron remote-node access:** the full backend is intended for trusted private networks such as LANs, company VPNs, or tailnets. The default active flow does not add a user-facing setup secret before desktop/Electron can use a registered remote node. Do not expose the full backend directly to the public internet; strict owner pairing would be a separate future opt-in design.
- **Phone/mobile credential:** the Phone Access QR pairing exchange returns a separate `mra_...` mobile credential to the phone. Mobile REST and GraphQL use the mobile credential as a bearer token, and WebSocket uses the same credential in the `access_token` query parameter.

Mobile credentials must not authorize owner-management routes such as settings changes, pairing-session creation, device listing, or revocation. Pairing payloads contain a short-lived one-time code and server base URL, not desktop owner authority. Credential-bearing URLs, pairing payloads, mobile credentials, and authorization headers must be redacted from logs and diagnostics.

## Pairing codes

Pairing codes are short-lived (five minutes) and single-use. The long-lived credential is returned only to the phone after the code exchange. The QR holds no long-lived secret.

Official Tailscale references for the optional secure web address:

- [Tailscale Serve](https://tailscale.com/docs/features/tailscale-serve)
- [HTTPS certificates](https://tailscale.com/docs/how-to/set-up-https-certificates)
- [MagicDNS](https://tailscale.com/docs/features/magicdns)

## Paired Phone Behavior

A paired phone stores its session in browser/WebView `localStorage` under the mobile web origin. That is acceptable for the current Phone Access MVP but should be treated as less protected than native secure storage. The current native Android/iOS wrappers deliberately load the same `/mobile` shell and do not persist `mra_...` credentials natively; the iOS wrapper saves only node profile metadata. Any future native credential-storage hardening should be designed separately with backend authorization changes.

Because this storage is origin-scoped, a phone paired through one way keeps that address: a phone paired on the home Wi-Fi does not switch to the Tailscale address on its own (one node at several addresses is follow-up work). For a phone that travels, use the **Tailscale** tab: with Tailscale on the phone, that address also works at home. The native Android/iOS wrappers save the clean `/mobile` URL profile, not the one-time `?pairing=` URL.

After pairing, the mobile shell:

- restores the paired node session on reload;
- checks `/rest/remote-access/status` for reachability and Phone Access state;
- on opening, **Retry** and **Check**, checks its own credential with one request to the node (`mobileNodeSessionStore.checkCredential()`); the connection state comes from that answer only (see [Revocation and Disable Semantics](#revocation-and-disable-semantics) for what the phone shows). The 5 s run-list poll never sends it;
- opens the agent package definitions feed only while paired, to the paired node with its credential; an unpaired phone page opens no feed socket (the desktop window keeps its feed);
- holds the post-pair transition in a checking state until status and the run history refresh, so the run list is not shown with stale or unknown node status after successful pairing;
- sends bearer credentials on protected REST/GraphQL requests;
- appends the credential as an `access_token` query parameter for WebSocket connections;
- uses authorized fetch helpers for media, file, artifact, team-reference, and application setup resources;
- keeps server-owned agent/team/workspace routes reachable when those routes accept paired mobile credentials.

The local **Unpair from <node>** action deletes only the phone's local session for that node and returns the UI to the pairing bootstrap without leaving the run list or post-pair checking state active. It does not revoke the server-side device record; use **Revoke** in the desktop's **Connected phones** list to revoke credentials on the node. Failed or expired pairing exchanges likewise stay on the pairing bootstrap and must not write a local mobile session.

### Pairing page

`MobilePairingBootstrap.vue` handles `/mobile?pairing=<payload>`:

- **In the Android app** (the shell bridge answers): it pairs at once, with the phone's model name as the device name, then tells the app it paired. A failed exchange shows the reason with **Scan again** and back: "This code has expired. Make a new one on your computer." (expired, or closed or replaced on the desktop), "This code was already used. Make a new one on your computer.", Phone access off, or the node did not answer.
- **In a browser:** the page shows the node's name, **Connect to <node>** (one tap pairs) and **Get the Android app**.

### Android shell bridge

The Android app gives the page one object, `window.AutoByteusShell` (`utils/remoteAccess/shellBridge.ts` on the page; `web/ShellBridge.kt` in the app, androidx.webkit web messages). Only the main frame of the open node's origin gets it; sandboxed frames and other origins do not. The page uses it to ask for the phone's model name, the number of saved nodes and the open node's name as the app shows it on its first page (`hello`; `nodeName`, `""` when the app has none), to report that it is mounted (`{ type: 'pageReady' }`, sent once per document by `MobileRemoteAccessShell`; only this shows the page in the app or closes the app's overlay over it, and WebView's error page cannot send it), to report a successful pairing with the node's name (the app saves the node only then), to ask the app to show its node list (**Switch node**) or its scanner (**Scan again**), and to turn the VNC Viewer's desktop full screen on or off (`{ type: 'desktopFullScreen', on }`, sent only by `composables/mobile/useDesktopFullScreenDisplay.ts`). It carries no credential: each node's credential stays in that node's page.

The phone names the open node, never its address (autobyteus-433; `utils/remoteAccess/nodeName.ts`). The header, its accessibility label, the offline banner, "Connected to …", the connection sheet and **Unpair from <node>** use, in order: the app's name for the node (from `hello`, in the Android app), the session's `nodeName` saved at pairing, else "AutoByteus node". The pairing page names a QR without a name "AutoByteus node". A session paired before names were kept therefore shows the app's name, not the host. In a browser there is no bridge and `pageReady` does nothing.

## Revocation and Disable Semantics

- **Disable Phone Access** (the **Phone access** switch in the panel header): paired-device records remain in server data, but non-loopback mobile credentials are rejected while disabled, new pairing sessions cannot be created, and every shown code is discarded. Paired phones work again when it is turned back on.
- **Revoke one phone:** that device credential stops working for REST, GraphQL, WebSocket, and protected resource access.
- **Revoke all phones:** every active paired credential is marked revoked and each phone must pair again.
- **What the phone shows** after its credential check: a revoked or unknown credential removes the phone's stored session and shows the pairing screen. With Phone Access off the session is kept, the bar reads "Phone access off" and the list shows "<node> is reachable, but Phone access is off." with **Check**; once it is on again, **Check** loads the runs. A node that does not answer shows "Can't reach <node>." with **Check**, also right after a check that found Phone Access off. While Phone Access is off the connection sheet says "Not reachable".
- **Active vs revoked lists:** `GET /remote-access/devices` returns active paired-device summaries only; the desktop's **Connected phones** list shows each with its name, how it connects and when it was last seen, and **Revoke**. **Revoke all** sits apart from the main action and asks first. Revoked records are retained and exposed to local desktop management through `GET /remote-access/devices/revoked`; they appear only behind the collapsed, non-actionable **History (n)**. Dates and times there follow the app's language.
- Local desktop loopback access remains available for desktop management endpoints.

## Node desktop on the phone

A run's ⋮ menu offers **VNC Viewer** next to Artifacts, Files, Messages and Activity when the paired node has a node desktop (a Docker node: `GET /rest/node-desktop` answers `{ available: true }`) and the open run is on that node; it is hidden on a node without one (the desktop's embedded node) and for a run on another node. The view (`MobileNodeDesktop.vue`, route `?screen=desktop`) streams the node desktop through the node's own server (`/ws/node-desktop` with the phone's credential), as the desktop app's VNC Viewer does:

- It opens **View only** and fitted to the screen, in portrait or landscape. In View only nothing reaches the desktop: pinch zooms (up to 4×), a drag pans, a double tap switches between **Fit** (the whole desktop) and **Fill** (the picture, undistorted, covers the screen; drag to see the cropped part), and **Fit** in the bar returns to fit; in a desktop browser a trackpad pinch (Ctrl+wheel) zooms. A zoomed picture is never panned past its own edge. The desktop's size never changes.
- **Control** is a deliberate switch in the bar; the stream reconnects in Control with the picture fitted, and touches act on the desktop (tap = click, drag = drag, two-finger drag = scroll). **Keyboard** opens the phone's keyboard; typed text (including words a keyboard composes), Enter, Backspace and Tab reach the desktop. CJK input methods are not guaranteed.
- **Clipboard** (in Control, while connected; next to Keyboard) opens a sheet. **Paste to the desktop**: text put in its box and **Send to desktop** lands on the desktop's clipboard, to paste there. **Copy from the desktop**: the text last copied on the desktop is shown selectable, and **Copy** puts it on the phone's clipboard (through `navigator.clipboard` when present, else a copy command, which works in the Android WebView on `http://`); if that fails the sheet says "Long-press the text to copy it." Nothing is read or written without a tap, and View only has no Clipboard.
- **Full screen** hides the bars. In the Android app it also turns the phone to landscape (either side, by its sensor, even with auto-rotate off) and hides Android's status and navigation bars (a swipe from the edge shows them for a moment); leaving gives back the phone's own orientation and the bars. In a browser it uses the browser's full screen and asks for landscape where the browser allows it (Chrome on Android); a browser that refuses (for example after a reload, with no tap) keeps the in-page full screen, and Esc leaving the browser's full screen leaves the viewer's too. A small strip at the top edge has **Show controls**, which brings the bars back, in both modes; in Control it also has **Keyboard** and **Clipboard**, so typing and pasting work without leaving full screen. In View only one tap anywhere also brings the bars back (in Control a tap elsewhere is a desktop click). The system Back key leaves full screen first (`full=1` is its own history entry).
- The stream ends when the app goes to the background or the page is hidden, and reconnects in View only, with a fresh access check, when it is visible again.
- The node serves at most 4 desktop streams at once, and at most 2 per paired phone; another viewer sees "Too many viewers on this node right now" with Retry (close code 4429).
- Revoking the phone, or turning Phone Access off, ends its open desktop stream at once: the node closes every open socket of that phone with 4403 and the refusal code (autobyteus-437, node access model NAS-37), and the viewer shows "not allowed".

## Live run streams on the phone

An open run on the phone (an agent run, a Team member or an Org member) keeps its live
stream through lost connections and the app's background:

- **The path to the node drops** (Wi-Fi to mobile data, a node restart): the phone keeps
  trying, at most 30 s apart, and never gives up while the page is shown. When it is back,
  it shows what it missed and then follows live.
- **The app is in the background or the screen is off:** the phone makes no attempt while
  the page is hidden. When the page is shown again, it reconnects at once and catches up.
  After 30 s or more hidden, it re-synchronizes a stream that still looks open.
- A message sent while the run is busy shows once, also on another phone or window that
  opens the run during that turn.

The same rules apply in the desktop window
(`agent_execution_architecture.md`, Live Run Stream Reconnection).

## Mobile Capability Gating

The mobile shell gates truly desktop-only or Electron-only features instead of exposing broken controls. Unsupported feature redirects use `/mobile/?unsupported=<feature>` and render a visible notice in both unpaired and paired states. Run Artifacts are mobile-supported when their normal run context is available. Browser remains unsupported in the current mobile shell because the existing Browser surface is Electron-owned through preload IPC and native WebContentsView projection.

The mobile Terminal is not a supported mobile feature; the node desktop is (above). Backend operation-level hard denial and broader mobile authorization/token/session hardening are tracked for Phase Two; Docker-node pairing is not a substitute for that future work.

For WebSockets the backend now enforces the phone's surface: a phone credential opens only the phone WebSocket routes (agent, team, org and agent-collaboration run streams, projects, agent package definitions, file explorer, node desktop). It is refused on every other WebSocket route, such as the terminal, update notifications, application WebSockets and GraphQL subscriptions, with close code 4403 and reason `PHONE_ACCESS_ROUTE_REFUSED` (HTTP 403 for a GraphQL upgrade). This refusal does not unpair the phone. A new phone WebSocket surface must be added to the backend's phone route list (`autobyteus-server-ts/docs/features/remote_access.md`, Route Policy).

The node accepts a request only when it is addressed to one of the node's names (DNS rebinding defence): IP addresses, `.local`, `.lan`, dotless and `*.ts.net` names, the host of `AUTOBYTEUS_SERVER_HOST`, and the address every paired phone and open pairing code uses pass with no setting, so phones need nothing. A desktop or peer node that reaches the node by any other public domain needs that name in the node setting `AUTOBYTEUS_ALLOWED_HOSTS`, or the node answers 403 `REMOTE_ACCESS_HOST_REFUSED` (see `autobyteus-server-ts/docs/features/remote_access.md`, Allowed Hosts).

The node also accepts browser requests only from allowed origins: the phone shell is served by the node itself (same origin, also through Tailscale Serve or a Host-preserving proxy) and passes. A gateway that rewrites `Host` without `X-Forwarded-Host` needs its phone URL's origin in the node setting `AUTOBYTEUS_ALLOWED_ORIGINS`; otherwise the node answers 403 `REMOTE_ACCESS_ORIGIN_REFUSED` (see `autobyteus-server-ts/docs/features/remote_access.md`, Allowed Origins).

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

- **Phone cannot reach server** (the app says "Can't reach <node>"): the phone is not on the way the QR uses. Connect it to the same Wi-Fi or VPN as the computer, or turn on Tailscale on the phone, then scan again; also check OS firewall and private-network ACLs.
- **No tab is ready:** the panel found no address that reaches this node. Connect the computer to a Wi-Fi, VPN or Tailscale and press **Check again**, or enter the node's address under **Company address**. A Docker node published only on `127.0.0.1` must be published on the computer's network.
- **A typed company address is refused:** "This address doesn't reach <node>." means it answers with another node's ID or not at all; public HTTP and local-only hosts are refused by the node.
- **Android/iOS over Tailscale cannot reach server:** verify Tailscale is connected on the phone, the desktop is online and awake, the app is not excluded by Tailscale split tunneling, and the saved URL is the same stable URL used during pairing.
- **Native Scan QR does not open the bundled scanner:** rebuild and reinstall the current AutoByteus Android APK or iOS app, then verify the app has camera permission. Current AutoByteus native wrappers do not depend on an external QR scanner app.
- **Pairing says disabled:** turn **Phone access** on in the node's Phone Setup panel (**Show QR code** does it).
- **Pairing code invalid or expired:** press **New code** on the desktop. Codes are short-lived and single-use, and a code closed or replaced on the desktop is refused.
- **Mobile Files shows no files for an open run:** confirm the run's workspace root is registered on the paired node, then retry from Files. The mobile shell should show a workspace-unavailable state rather than silently browsing a different workspace.
- **Mobile reference file does not open:** confirm the paired credential is still valid and the node can serve the message-owned `/rest/team-runs/.../team-communication/.../references/.../content` route; reference files are not loaded through the Artifacts route.
- **The mobile run list shows `Error 500` or `localeCompare` after a mobile-web fix:** verify the desktop/server node is serving the freshly rebuilt `/mobile` bundle, not an older packaged `mobile-web/` copy.
- **Credential rejected after pairing:** check whether Phone Access was disabled or the device was revoked; pair again after re-enabling or revocation.
- **Docker node desktop window cannot reach backend:** confirm the Backend URL printed by `autobyteus-docker` is reachable from the desktop over a trusted LAN, VPN, tailnet, or equivalent private-network path. Do not expose the full backend directly to the public internet.
- **WebSocket blocked:** confirm the private network/proxy permits WebSocket traffic to the server port.
- **The Tailscale HTTPS name is not used:** it answers with another node's ID (for example another AutoByteus on the same computer took the Serve mapping) or does not answer; the Tailscale address is used meanwhile. Run the Advanced command for this node and press **Check again**.
- **Fresh Docker `/mobile` returns missing assets:** upgrade/recreate from a current server Docker image. Current public launcher, remote-server, and all-in-one image paths package `autobyteus-server-ts/mobile-web` during the image build.
- **Desktop-only screen on phone:** use the mobile shell link or supported mobile route; unsupported desktop features should render an explanatory mobile notice rather than a desktop shell.
