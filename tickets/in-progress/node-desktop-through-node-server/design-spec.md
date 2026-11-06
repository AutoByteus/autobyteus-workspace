# Design Spec — S1: See a Docker node's desktop through its own server (desktop app)

## Solution And Approval Basis

- Current solution revision ID: `SR-002` (revised for architecture review ARCH-REV-001: AR-001 … AR-005)
- Approved requirements baseline: `requirements-doc.md` at SR-001 (the user's approval of the autobyteus-394 plan, 2026-11-06, at the parent's SR-004; DEC-S1-1 within the direction).
- Behavior-defining supplements: none.
- User approval of the design: `Obtained` — the user reviewed the parent design (which defines S1) on 2026-11-06 and asked to create the slice Tasks; this spec restricts it to S1 and adds the S1 launcher detail.
- Design status: `Ready`
- Canonical investigation notes: this folder's `investigation-notes.md` (S1-01 … S1-06) and the parent's (AF-01 … AF-17, runtime findings).
- Authorities read (2026-11-06): `references/architecture-design.md`, `references/design-principles.md`, root `DESIGN.md` (rules 1, 4, 5, 9, 11, 12), `GLOSSARY.md`, `TESTING.md`. `references/design-examples.md`: not used.
- Conflicts / discrepancies: none.

## Current-State Read

- Viewer: `autobyteus-web/components/workspace/tools/VncViewer.vue` reads `AUTOBYTEUS_VNC_SERVER_HOSTS` and the password keys through the server-settings store, parses them with `utils/vncHosts.ts`, and renders one `VncHostTile.vue` per host with `autoConnect`. `composables/useVncSession.ts` creates noVNC `RFB(container, url, { credentials: { password }, shared: true })`; on connect `triggerInitialRemoteResize` (lines 80-101) sets `viewOnly = false` and `resizeSession = true` for ~320 ms; `enterFullscreenFitMode` (228-237) keeps `resizeSession = true` and switches to Interactive.
- Mounting: `RightSideTabs.vue:68` mounts the viewer only while the VNC tab is selected; `WorkspaceToolShell.vue:19-28` mounts the panel only while shown; `VncHostTile.vue` `onBeforeUnmount` disconnects. A minimized or hidden window keeps the tile mounted.
- Server: Fastify 5 with `@fastify/websocket`; `/ws/*` routes call `authorizeRemoteAccessWebSocket` (`api/websocket/remote-access-websocket-auth.ts`) themselves, as `api/websocket/terminal.ts` does; the policy plugin defers `/ws/` to them (`api/security/remote-access-policy-plugin.ts`). REST routes register under `/rest` (`api/rest/index.ts`); a subsystem may own its route file (`node-update/node-update-routes.ts`). `node-update/starter-client.ts:10` `STARTER_SOCKET_ENV`; `node-update-routes.ts:12-13`: no starter socket = embedded or development server.
- Node: Xvnc `:99` RFB on 5900 (security None) in the server's network namespace; reachable on `127.0.0.1:5900` from the server (parent probe, measured).
- Launcher after S0 (S1-02): publishes backend + `127.0.0.1:<NOVNC_PORT>:6080`, sets `AUTOBYTEUS_VNC_SERVER_HOSTS`, `CONFIG_HASH_VERSION="v8"`.
- No structural problem in the existing owners; the feature adds a capability beside them and removes the client-owned target and resize policy.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large` — new server subsystem (3 files) + 2 routes; web client contract, composable rewrite, tile rename, viewer, settings card removal, localization; launcher bash + PowerShell, compose, dev script; docs, GLOSSARY, module doc; tests across server unit/integration/E2E, web unit, launcher, real-node and desktop-instance checks.
- Architectural risk: `High` — new REST and WebSocket contract; a security-relevant input filter that is the View only boundary; long-lived binary streams (backpressure, lifecycle, shutdown); removal of a settings surface; deployment change (published ports).
- Escalation trigger: a noVNC 1.7.0 client→server message the filter does not frame; any need for new image content; Electron renderer unable to open `wss` to a Tailscale Serve node; the route needing a different policy than the shared one.

## Architecture Investigation Evidence

| Source | Reference | Observation | Decision Supported |
| --- | --- | --- | --- |
| Parent forwarding probe | parent `probes/rfb-forwarding-probe.mjs`, `handshake-result.json` | WS→TCP to Xvnc carries RFB unchanged; no subprotocol; security type None | D-1 |
| Parent resize probe | parent `probes/resize-result.json` | One SetDesktopSize resizes the shared desktop | Filter drops type 251 |
| AF-01 | `node-update/starter-client.ts:10`, `node-update-routes.ts:12-13` | Starter present = Docker node | D-3 |
| AF-02 | docker README 512-578; `check-system-level.mjs` | Packages update in place on existing images | D-3 (no image change) |
| AF-04/05 | `@fastify/websocket/index.js:206-218`; `ws/lib/websocket.js:341,422` | preClose closes clients; pause/resume | D-6 |
| AF-06 | noVNC `rfb.js:315-327,447,473,508,1215,1235,2337` | View only sends no input, ignores server clipboard | REQ-017 on the client |
| AF-07 | `RightSideTabs.vue:68`, `WorkspaceToolShell.vue:19-28` | Unmount disconnects | Only visibility added |
| AF-10/16 | `server-settings-service.ts:113-116,314-330`; all `AUTOBYTEUS_VNC*` uses | No migration | Removal plan |
| S1-02 | launcher/compose lines | Removal points | Launcher change |

## Intended Change

Add a node-owned path for the node desktop: `GET /rest/node-desktop` answers whether this node has one; `/ws/node-desktop?mode=view|control` authorizes the viewer with the shared WebSocket policy, then bridges it to Xvnc on `127.0.0.1:5900` through an RFB input filter that enforces the mode and blocks resizes. The desktop app's VNC Viewer uses only this path; the host list, password keys and resize behavior go away; the launcher and compose stop publishing 6080 and setting the host env.

## Change Scope (Mandatory)

- In scope: UC-001, UC-003, UC-004, UC-005 (S1 part), UC-006 (S1 part). Areas: new `autobyteus-server-ts/src/node-desktop/`; `src/api/rest/node-desktop.ts`, `src/api/websocket/node-desktop.ts` and their registration; `server-settings-service.ts` (one predefined key removed); web `utils/nodeDesktopClient.ts`, `utils/nodeEndpoints.ts`, `types/node.ts`, `composables/useVncSession.ts`, `components/workspace/tools/{VncViewer.vue, NodeDesktopTile.vue}`, `components/settings/ServerSettingsEndpointCards.vue`, localization (en, zh-CN); launcher (bash, PowerShell), compose, `.env.example`, `docker-start.sh`; tests; docs (`docs/design-cases.md` case 16, already added in this worktree; `GLOSSARY.md`, `autobyteus-server-ts/docs/modules/node_desktop.md` + modules README, `autobyteus-web/docs/workspace_layout.md`, `docs/settings.md`, `autobyteus-server-ts/docker/README.md`, root `README.md`, `autobyteus-server-ts/README.md`).
- Derived consumers: `NodeEndpoints` gains `nodeDesktopWs` (additive; every `deriveNodeEndpoints` consumer unaffected). Settings visible-key set loses the predefined key (env-only values disappear; saved values show as deletable custom settings). Launcher config hash `v8` → `v9` feeds the container label and the reuse decision: each managed node is recreated once at its next `upgrade --all` / `workspace apply`, keeping volumes and the backend port.
- Deliberately left alone: the Remote Access policy and every other route (Origin: autobyteus-403; phone deny: autobyteus-404); `/mobile`; base and server images (`EXPOSE`, websockify, 9223 forwarder: S2); remote-run panel note; embedded node; noVNC version; node-update C1–C4; the "VNC Viewer" tab name.
- Follow-ups: none new.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | REQ / AC | Trigger | Existing | Change | Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001/002 | User | REQ-001, 002, 004; AC-001–004 | VNC Viewer tab | Host list, client dials | Through the node's server | DS-001, DS-002 |
| BEH-005 | System | REQ-007; AC-008, 009 | Viewer connects/maximizes | Resize | Never; filter drops 251 | DS-003 |
| BEH-006 | System | REQ-005, 006, 017; AC-006, 007, 020 | Mode switch | Client flag | Per-stream mode, filter-enforced | DS-003 |
| BEH-007 | Operational | REQ-020; AC-022 | Launcher/compose | backend + loopback 6080 + env | backend only | DS-005 |
| BEH-008 | Contract | REQ-003; AC-005 | Stream open | Shared policy | Same policy | DS-001 |
| — | System | REQ-008, 010, 011; AC-010, 011, 013, 014 | Close, hide, restart, slow viewer | — | Stream lifecycle, backpressure, logs | DS-004 |
| BEH-011 | System | REQ-002; AC-004 | Embedded node | Empty host list | Explicit "no shared desktop" | DS-002 |
| BEH-009 | User | preserved | Remote run | Note | Unchanged | — |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Related | Relationship |
| --- | --- | --- | --- |
| Parent `probes/rfb-forwarding-probe.mjs` | RFB handshake / resize | AC-008 | Starting point for a test against the new route |

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement` (feature + behavior change + hardening).
- Current design issue found: `Yes` — the client owns the target address, a password and a resize policy for a resource the node owns.
- Structural triggers: Capability-area reuse (fires: shared WS policy, Docker-node fact, endpoints, authorized fetch, preClose, URL redaction reused); Legacy cleanup (fires: host list, password, resize, settings card, launcher env/port removed, no dual path); Several kinds or forms (fires: trusted-network, loopback and phone viewers all go through one policy call; bash and PowerShell launchers both changed); Vocabulary drift (fires: "desktop" = desktop app in GLOSSARY → new word **node desktop**); Behavior by absence (checked: availability is an explicit rule, not a failed connection); Ambiguous boundary (ruled out: no desktop id or target selector); Responsibility overload (ruled out: filter and stream are separate owners).
- Root cause classification: `Boundary Or Ownership Issue` + `Legacy Or Compatibility Pressure`.
- Refactor needed now: `Yes` (clean cut of the client path, in this change).
- Intentional deferrals: limits, phone cut-off (S3); in-node listeners (S2). Residual risk until S2: inside the node 5900/6080/9223 listen on the container interface; after S1 none is published.

## Terminology

- **Node desktop:** the virtual graphical desktop inside a Docker node (Xvnc display `:99`, RFB on `127.0.0.1:5900` inside the node) that its agents use, shown in the VNC Viewer. Not the desktop app, not the user's own screen. Added to `GLOSSARY.md` (Nodes section).
- **Viewer:** one client connection showing the node desktop.
- **Mode:** `view` (UI "View only") or `control` (UI "Control"), fixed per stream.

## Legacy Removal Policy (Mandatory)

- Removed: host list and direct dialing, password keys and the `'mysecretpassword'` fallback, resize-on-connect and fullscreen-fit resize, the View only lift, `utils/vncHosts.ts`, the "AutoByteus VNC Hosts" card entry and predefined setting, the launcher/compose host env and the 6080 publishing and allocation.
- Compatibility kept: `None` (DESIGN.md rule 9: app and node run the same release).

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Subjects: saved `AUTOBYTEUS_VNC_SERVER_HOSTS` / `AUTOBYTEUS_VNC_SERVER_PASSWORD` / `AUTOBYTEUS_VNC_PASSWORD` in a node's data-dir `.env`; launcher state `NOVNC_PORT` / `noVncPort`.
- Readers after S1: none. Settings shows a saved key as a deletable custom setting (`server-settings-service.ts:314-330`); bash `load_state` sources the file (extra variable inert); PowerShell JSON extra property inert.
- Decision: `Directly Usable — No Migration`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001/002/008 | User opens the VNC Viewer tab | Live node desktop rendered | Server `NodeDesktopStream`; client `useVncSession` | The feature |
| DS-002 | Primary End-to-End | BEH-011 | Viewer mounts | Tile or "no shared desktop" | `resolveNodeDesktop` | Explicit availability |
| DS-003 | Bounded Local | BEH-005/006 | Viewer bytes arrive | Allowed bytes to Xvnc | `RfbViewerInputFilter` | View only + no resize boundary |
| DS-004 | Return-Event | REQ-008/010/011 | Xvnc bytes / any close | Bytes to viewer; both sides closed; one log line | `NodeDesktopStream` | Backpressure, cleanup, logging |
| DS-005 | Operational | BEH-007 | `new-container` / `upgrade --all` / `workspace apply` / compose | Container publishing only the backend | Launcher; compose | Exposure |

## Primary Execution Spine(s)

DS-001: `VNC Viewer tab (VncViewer) -> NodeDesktopTile -> useVncSession (creates the WebSocket for nodeDesktopClient.nodeDesktopStreamUrl(mode), registers its own close listener, hands the socket to noVNC RFB as its channel) -> ws(s)://<node>/ws/node-desktop?mode=…[&access_token] -> api/websocket/node-desktop (authorizeRemoteAccessWebSocket -> parse mode -> resolveNodeDesktop) -> NodeDesktopStream.start -> TCP 127.0.0.1:5900 -> Xvnc :99`; viewer bytes pass `RfbViewerInputFilter` before TCP.

DS-002: `VncViewer -> nodeDesktopClient.fetchNodeDesktop (authorizedFetch GET <rest>/node-desktop) -> api/rest/node-desktop -> resolveNodeDesktop -> { available }`

## Spine Narratives (Mandatory)

| Spine ID | Narrative | Owner | Off-spine |
| --- | --- | --- | --- |
| DS-001 | The tab asks the node whether it has a node desktop, then the tile opens a View only stream. The route authorizes first, then parses the mode and checks availability, then creates the stream, which connects TCP and pipes viewer bytes through the filter and Xvnc bytes straight back. Switching mode closes and reopens the stream in the other mode | stream (server), session (client) | shared policy, endpoints, credential URL, close-code text |
| DS-002 | One GET returns `{ available: true }` on a Docker node, `{ available: false }` otherwise | availability | authorized fetch |
| DS-003 | Handshake stages, then table-driven framing and per-mode forwarding | filter | — |
| DS-004 | 8 MiB high / 1 MiB low watermark on the viewer side; WS pause on TCP back-pressure; whichever side closes, the other is closed and one metadata line logged | stream | logging |
| DS-005 | The launcher writes only `-p <B>:8000`; `v9` hash makes the next lifecycle command recreate the node with its backend port and volumes | launcher | docs |

## Spine Actors / Main-Line Nodes

`VncViewer.vue`, `NodeDesktopTile.vue`, `useVncSession`, `nodeDesktopClient`; `api/rest/node-desktop.ts`, `api/websocket/node-desktop.ts`, `NodeDesktopStream`, `RfbViewerInputFilter`, `resolveNodeDesktop`; Xvnc; launcher `start_node`.

## Ownership Map

- `resolveNodeDesktop(env)` (`node-desktop-availability.ts`): the only owner of "this node has a node desktop at `127.0.0.1:5900`": returns the target exactly when `env[STARTER_SOCKET_ENV]` is set (AF-01: the server's existing Docker-node fact; every Docker node image provides Xvnc there, AF-03), else `null`.
- WS route (thin entry): attaches the socket's `message` listener synchronously; awaits `authorizeRemoteAccessWebSocket` (rejection → `closeSocketForRemoteAccessRejection`); validates the query strictly (AR-002): exactly one `mode` with value `view` or `control`, at most one `access_token`, and no other parameter; anything else (a missing or repeated `mode`, `host`, `port`, `target`, `url`, any unknown key) → close 4400 `NODE_DESKTOP_INVALID_REQUEST` before any upstream connection. Order: authorize → validate query → resolve → stream; `resolveNodeDesktop` null → close 4404 `NODE_DESKTOP_UNAVAILABLE`; then constructs and starts the stream with the auth context. Viewer bytes before the stream starts → close 4400 (RFB starts with the server's version string, so a correct viewer sends none).
- `NodeDesktopStream`: one viewer's lifecycle — TCP connect after authorization, both pipes, watermarks, byte counters, close propagation and codes, the end-of-stream log line.
- `RfbViewerInputFilter`: RFB client→server framing and per-mode policy; pure.
- REST route (thin entry): `{ available: resolveNodeDesktop(process.env) !== null }`.
- `useVncSession`: noVNC session for one viewer and the owner of its WebSocket (AR-001). `connect(mode)`: `const socket = new WebSocket(nodeDesktopStreamUrl(endpoints, mode, credential))`; `socket.addEventListener('close', (e) => { lastClose = { code: e.code, reason: e.reason } })` **before** `new RFB(container, socket, { shared: true })` (noVNC accepts a channel, `rfb.js:92-115,564-571`, and sets its own handler as the `onclose` property, `websock.js:284`, which does not remove a listener added with `addEventListener`). On RFB `disconnect` it maps `lastClose` with `viewerStateForClose` (noVNC's own event carries only `{ clean }`, `rfb.js:950-952`, and logs the code only, `:659-671`). Viewport strategy: `scaleViewport = true`, `clipViewport = false`, `resizeSession = false` always, `viewOnly = mode === 'view'`. One socket and one RFB per connection; a reconnect creates both anew.
- `NodeDesktopTile.vue`: tile UI and when to connect (mount, document visible); disconnect on unmount and on `visibilitychange` → hidden; reconnect on visible when it was connected or auto-connecting; Reconnect button for `disconnected`/`unreachable`. Every reconnect (visibility or button) opens in View only (D-10).
- `nodeDesktopClient.ts`: the client contract — `fetchNodeDesktop(endpoints)`, `nodeDesktopStreamUrl(endpoints, mode, credential)`, `NodeDesktopMode`, and `viewerStateForClose({ code, reason })` → `'not-allowed' | 'unavailable' | 'disconnected' | 'unreachable' | 'closed'` (table in D-7).

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Owner Behind | Must Not Own |
| --- | --- | --- |
| `api/websocket/node-desktop.ts` | `NodeDesktopStream` | piping, buffering, filtering |
| `api/rest/node-desktop.ts` | `resolveNodeDesktop` | the rule |
| `VncViewer.vue` | `NodeDesktopTile`, `nodeDesktopClient` | connection logic |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By |
| --- | --- | --- |
| `autobyteus-web/utils/vncHosts.ts`, `utils/__tests__/vncHosts.spec.ts` | Dead: only `VncViewer.vue` imports it | `nodeDesktopClient.ts` |
| Host list, password keys, `'mysecretpassword'`, `VncHostConfig` (`VncViewer.vue`, `VncHostTile.vue`) | Node owns the target; Xvnc has no password | availability + stream URL |
| `VncHostTile.vue` | Renamed: "host" no longer exists | `NodeDesktopTile.vue` |
| `triggerInitialRemoteResize` + timers, `resizeSession = fullscreenFitEnabled`, View only lift in `enterFullscreenFitMode`/`exitFullscreenFitMode`, `password`/`credentials` options (`useVncSession.ts`) | REQ-007; Maximize is client-side only | `applyViewportStrategy` without resize |
| Predefined `AUTOBYTEUS_VNC_SERVER_HOSTS` (`server-settings-service.ts:113-116`) + test rows (`tests/unit/api/graphql/types/server-settings.test.ts:33-41`) | No reader | — |
| "AutoByteus VNC Hosts" entry (`ServerSettingsEndpointCards.vue:169-174`) + spec rows (`:60,76`) | DEC-006 | — |
| `AUTOBYTEUS_VNC_SERVER_HOSTS` in `electron/server/__tests__/serverRuntimeEnv.spec.ts:27,145` | Key gone | — |
| VncViewer "no VNC hosts configured…" keys (en, zh-CN, generated workspace catalogs) | Empty state changes | node desktop keys |
| Launcher: `-e AUTOBYTEUS_VNC_SERVER_HOSTS`, `-p "127.0.0.1:${NOVNC_PORT}:6080"`, `NOVNC_PORT`/`noVncPort` allocation (preference 6080+i), state, reuse/retry checks, hash text lines, `VNC Viewer:` output and help text (bash `container-config.sh`, `core.sh`, `docker-runtime.sh`; PowerShell `ContainerConfig.ps1`, `Core.ps1`, `DockerRuntime.ps1`; S1-02) | Nothing outside the node uses 6080 after S1 | backend only; `v9` |
| Compose `AUTOBYTEUS_VNC_SERVER_HOSTS` and 6080 mapping, `.env.example` `AUTOBYTEUS_WEB_VNC_PORT`, `docker-start.sh` `novnc_port` and its endpoint line | Same | — |
| `tests/e2e/vnc-live-probe.mjs` host-list assumptions | Route replaces hosts | probe rewritten to the route |
| `ServerSettingsEndpointCards.vue` `'hostPort'` format: the `QuickFieldFormat` member (`:151`), `hostPort: ['ws', 'wss']` (`:196`), `parseHostPortTokenToRow` (`:236`) and its branch (`:252`) | Dead: the VNC Hosts entry (`:174`) was its only user (AR-003a) | `'url'` format only | |
| `types/novnc.d.ts` `RfbCredentials` (`:2`), `credentials` option (`:9`), `sendCredentials` (`:24`) | Dead: no password (AR-003b); the constructor's second parameter is typed `string \| WebSocket` | channel typing | |
| `tests/integration/app-font-size-fixed-px-audit.integration.test.ts:43` path `components/workspace/tools/VncHostTile.vue` | File renamed (AR-003c) | `NodeDesktopTile.vue` | |
| Generated `VncHostTile.*` localization keys (`host_name`, `toggle_interaction_mode`; en and zh-CN `workspace.generated.ts`) | File renamed (AR-003d) | `NodeDesktopTile.*` keys from the project's localization tooling | |

## Return Or Event Spine(s) (If Applicable)

DS-004: `Xvnc -> TCP data -> NodeDesktopStream (bufferedAmount check) -> ws.send -> noVNC`; close: `either side close/error -> NodeDesktopStream.close(code, reason) -> other side closed -> log line`; return to the UI: `browser WebSocket close event (code, reason) -> useVncSession's own close listener records it -> noVNC 'disconnect' event -> useVncSession maps the recorded code + reason with nodeDesktopClient.viewerStateForClose -> NodeDesktopTile shows the state`.

## Bounded Local / Internal Spines (If Applicable)

DS-003, parent `RfbViewerInputFilter`:
`chunk -> append to pending -> stage version: 12 bytes, "RFB 003.007\n" or "RFB 003.008\n" (else reject) -> stage security: 1 byte, must be 1 (None) -> stage init: 1 byte, forwarded as 1 (shared) -> message loop: type -> length known? -> whole message buffered? -> allowed for mode ? forward : drop -> next`

| Type | Message | Length | view | control |
| --- | --- | --- | --- | --- |
| 0 | SetPixelFormat | 20 | forward | forward |
| 2 | SetEncodings | 4 + 4·n (n = u16 at 2) | forward without pseudo-encoding −316 | forward without pseudo-encoding −316 |
| 3 | FramebufferUpdateRequest | 10 | forward | forward |
| 4 | KeyEvent | 8 | drop | forward |
| 5 | PointerEvent | 6 (always: −316 is never advertised upstream) | drop | forward |
| 6 | ClientCutText | 8 + abs(s32 at 4), ≤ 1 MiB else reject | drop | forward |
| 150 | EnableContinuousUpdates | 10 | forward | forward |
| 248 | ClientFence | 9 + u8 at 8 (≤ 64 else reject) | forward | forward |
| 250 | xvp (shutdown/reboot) | 4 | drop | drop |
| 251 | SetDesktopSize | 8 + 16·n (n = u8 at 6) | drop | drop |
| 255 | QEMU, subtype 0 (extended key) | 12 | drop | forward |
| other (incl. 255 other subtypes) | — | — | reject → close 4400 | reject → close 4400 |

Why −316 is removed: noVNC advertises the ExtendedMouseButtons pseudo-encoding (−316, `core/rfb.js:2272`) and, once the VNC server confirms it in a framebuffer update (`:2707-2708`), sends a 7-byte pointer event (`RFB.messages.extendedPointerEvent`) instead of the 6-byte one. The confirmation travels server→client, which the filter does not parse. Removing −316 from the viewer's SetEncodings (and fixing the count) keeps the server from ever enabling it, so every pointer event stays 6 bytes. Cost: mouse buttons 8 and above are not sent. The table was checked against every encoder in noVNC 1.7.0's `RFB.messages` (types 0, 2, 3, 4, 5, 6, 150, 248, 250, 251, 255/0; S1-05); the implementation adds a test per encoder.

## Off-Spine Concerns Around The Spine

| Concern | Serves | Responsibility | Reuse |
| --- | --- | --- | --- |
| Access policy | WS route | Same principals as all `/ws` | `authorizeRemoteAccessWebSocket` |
| Docker-node fact | availability | One fact | `STARTER_SOCKET_ENV` |
| Endpoints | client | `nodeDesktopWs` | `deriveNodeEndpoints` |
| Credential URL + redaction | client | Phone credential (unused by the desktop app; S3) | `buildAuthenticatedWebSocketUrl`, `redactRemoteAccessWebSocketUrl` |
| Server URL redaction | WS route | Any logged URL | `redactSensitiveUrl` |
| Shutdown | stream | Close on app close | `@fastify/websocket` preClose |
| Log line | stream | Metadata only | `console.info` as other WS routes |

## Ownership Boundaries / Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass |
| --- | --- | --- | --- |
| `/ws/node-desktop` | stream, filter, availability | every viewer | any other path to 5900/6080 |
| `resolveNodeDesktop` | Docker-node fact, target | WS route, REST route | hard-coding `127.0.0.1:5900` elsewhere |
| `nodeDesktopClient.ts` | route paths, query names, close-code map | `VncViewer`, `NodeDesktopTile`, `useVncSession` | components building URLs |

## Dependency Rules

- `api/{rest,websocket}/node-desktop.ts` → `node-desktop/*`; WS route → `api/websocket/remote-access-websocket-auth.ts`; `node-desktop/node-desktop-availability.ts` → `node-update/starter-client.ts` (constant only).
- `node-desktop/*` does not import Fastify; the stream takes a minimal socket interface (`send(data, cb)`, `close(code, reason)`, `pause()`, `resume()`, `on(…)`, `bufferedAmount`), like `terminal.ts`'s `SocketLike`.
- Web: only `useVncSession` imports `@novnc/novnc`; only `nodeDesktopClient.ts` knows the route strings.

## Interface Boundary Mapping

| Interface | Subject | Identity | Notes |
| --- | --- | --- | --- |
| `GET /rest/node-desktop` → `200 { available: boolean }` | this node's node desktop | none | route class `TRUSTED_NETWORK_PROTECTED` (unchanged policy) |
| `GET /ws/node-desktop?mode=view\|control[&access_token=]` (upgrade) | one viewer stream | exactly `mode` (+ optional `access_token`); any other or repeated parameter refused | close codes: shared policy 4401/4403/4404; 4400 `NODE_DESKTOP_INVALID_REQUEST` (bad, missing, repeated or extra query parameter) / `NODE_DESKTOP_VIEWER_PROTOCOL` (early bytes, rejected message); 4404 `NODE_DESKTOP_UNAVAILABLE`; 4502 `NODE_DESKTOP_DISCONNECTED` (TCP refused, failed or ended); 1000 normal |
| `resolveNodeDesktop(env): { host: '127.0.0.1'; port: 5900 } \| null` | target | env | internal |
| `new RfbViewerInputFilter(mode).accept(chunk): { forward: Buffer } \| { reject: string }` | viewer bytes | mode | pure |
| `fetchNodeDesktop(endpoints)`, `nodeDesktopStreamUrl(endpoints, mode, credential)` | client contract | mode | web |

## Interface Boundary Check

All singular, explicit identity, low ambiguity (no target selector exists).

## Main Domain Subject Naming Check

| Subject | Name | Note |
| --- | --- | --- |
| Agent's virtual desktop | node desktop (`nodeDesktop`, `/rest/node-desktop`, `/ws/node-desktop`, `node-desktop/`) | GLOSSARY entry |
| Tile | `NodeDesktopTile` | replaces "host" |
| Mode | `view`/`control`; UI "View only"/"Control" | replaces "Interactive" (en, zh-CN) |
| Tab | "VNC Viewer" | kept (Product may rename in S3) |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| WS authorization | `remote-access-websocket-auth.ts` | Reuse |
| Docker-node fact | `starter-client.ts` | Reuse |
| Shutdown | preClose | Reuse |
| Redaction | `redact-sensitive-url.ts`, `websocketAuth.ts` | Reuse |
| Endpoints / authorized fetch | `nodeEndpoints.ts`, `authorizedTransport.ts` | Extend / Reuse |
| Binary bridge + RFB framing | none (websockify not used, D-1) | Create New (`src/node-desktop/`) |

## Subsystem / Capability-Area Allocation

| Area | Owns | Decision |
| --- | --- | --- |
| `autobyteus-server-ts/src/node-desktop/` | availability, stream, filter | Create New |
| `src/api/rest`, `src/api/websocket` | entries | Extend |
| `autobyteus-web` tools/composable/utils | viewer | Extend / Rename |
| `autobyteus-web` settings | card entry removal | Extend |
| public launcher, server docker dev files | publishing | Extend |

## Final File Responsibility Mapping

| File | Kind | Concern |
| --- | --- | --- |
| `autobyteus-server-ts/src/node-desktop/node-desktop-availability.ts` | Add | `resolveNodeDesktop` |
| `autobyteus-server-ts/src/node-desktop/rfb-viewer-input-filter.ts` | Add | handshake, framing, mode policy, `NodeDesktopMode` |
| `autobyteus-server-ts/src/node-desktop/node-desktop-stream.ts` | Add | TCP connect, pipes, watermarks (8 MiB / 1 MiB), close codes, log line |
| `autobyteus-server-ts/src/api/websocket/node-desktop.ts` | Add | WS entry |
| `autobyteus-server-ts/src/api/websocket/index.ts` | Modify | register |
| `autobyteus-server-ts/src/api/rest/node-desktop.ts`, `src/api/rest/index.ts` | Add / Modify | REST entry, register |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | Modify | remove predefined key |
| `autobyteus-server-ts/docs/modules/node_desktop.md`, `docs/modules/README.md` | Add / Modify | module doc (routes, policy, filter table, lifecycle, close codes) |
| `autobyteus-web/utils/nodeDesktopClient.ts` | Add | client contract |
| `autobyteus-web/types/node.ts`, `utils/nodeEndpoints.ts` | Modify | `nodeDesktopWs` |
| `autobyteus-web/composables/useVncSession.ts` | Modify | owns the WebSocket (close listener before RFB), mode, no resize, no password, reconnect on mode change, close-code state (D-7) |
| `autobyteus-web/types/novnc.d.ts` | Modify | constructor `urlOrChannel: string \| WebSocket`; credentials types removed |
| `autobyteus-web/tests/integration/app-font-size-fixed-px-audit.integration.test.ts` | Modify | renamed tile path |
| `autobyteus-web/components/workspace/tools/NodeDesktopTile.vue` | Rename from `VncHostTile.vue` + Modify | tile, visibility, mode switch |
| `autobyteus-web/components/workspace/tools/VncViewer.vue` | Modify | availability states, one tile |
| `autobyteus-web/components/settings/ServerSettingsEndpointCards.vue` | Modify | remove VNC Hosts entry and the now-dead `hostPort` format |
| `autobyteus-web/utils/vncHosts.ts` (+ spec) | Remove | — |
| `autobyteus-web/localization/messages/{en,zh-CN}/*` (+ generated workspace catalogs, via the project's localization tooling) | Modify | node desktop states, "View only"/"Control" |
| `GLOSSARY.md` | Modify | node desktop |
| `docs/design-cases.md` | Modify (done by the Solution Designer) | Case 16: a protocol filter that framed one form of a message |
| `autobyteus-web/docs/workspace_layout.md`, `docs/settings.md` | Modify | VNC Viewer through the node; card removed |
| `scripts/public/docker/autobyteus-docker.d/bash/{container-config.sh,core.sh,docker-runtime.sh}`, `powershell/{ContainerConfig.ps1,Core.ps1,DockerRuntime.ps1}` | Modify | only `-p <B>:8000`; no host env; `NOVNC_PORT` gone; `v9`; output/help without VNC Viewer |
| `autobyteus-server-ts/docker/{docker-compose.yml,.env.example,docker-start.sh}` | Modify | backend only; no host env |
| `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md` | Modify | ports: backend only; VNC Viewer goes through the node's server; existing nodes change at `upgrade --all` / `workspace apply` |
| Tests (see Validation Plan) | Add / Modify | — |

## Applied Patterns (If Any)

- Bounded state machine in `RfbViewerInputFilter`; adapter `NodeDesktopStream` (WebSocket ↔ TCP).

## Target Subsystem / Folder / File Mapping / Folder Boundary Check

`src/node-desktop/` holds three single-concern files (flat is clearer than sub-folders); transport entries stay in `src/api/{rest,websocket}/` like `terminal.ts` and `files.ts`. Low mixed-layer risk.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided |
| --- | --- | --- |
| Target | `resolveNodeDesktop(process.env)` → `127.0.0.1:5900` | `?target=host:port`; a setting naming the upstream |
| View only | filter drops 4/5/6/255 in `view` | trusting `rfb.viewOnly` |
| Mode switch | toggle → `disconnect()` → `connect()` with `mode=control` | in-band text frames on noVNC's socket |
| Maximize | `scaleViewport = true`, `resizeSession = false` | remote resize to the screen |
| Log line | `[node-desktop] stream ended mode=view viewer=trusted_network durationMs=… toViewer=… fromViewer=… reason=viewer-closed` | URL with `access_token`; any payload |
| Launcher | `-p "${BACKEND_PORT}:8000"` only | keeping `127.0.0.1:…:6080` "just in case" |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Replacement |
| --- | --- | --- |
| Host list as fallback for older nodes | Rejected (rule 9) | same release on both sides |
| Host list as server-side extra targets | Rejected (DEC-006) | one node desktop |
| VNC password option | Rejected | AutoByteus access; Xvnc offers None |
| Resize in Control | Rejected (DEC-004) | client-side fit |
| Keep 6080 on loopback | Rejected (REQ-020) | server route |

## Derived Layering (If Useful)

N/A.

## Design Decisions

- **D-1** Upstream is Xvnc TCP on loopback, not websockify (measured equal; one hop fewer; filter needs raw RFB).
- **D-2** No desktop id: `/rest/node-desktop`, `/ws/node-desktop`.
- **D-3** Availability = Docker node (`STARTER_SOCKET_ENV` set); works on today's images after an in-place update; no new image content.
- **D-4** Mode fixed per stream; switching reconnects.
- **D-5** Filter table above; unknown types fail closed; ClientInit forced shared; SetEncodings forwarded without −316 so pointer events keep one length.
- **D-6** Backpressure: on TCP `data`, `socket.send(chunk, cb)`; then if `bufferedAmount ≥ 8 MiB − 64 KiB` → `tcp.pause()`; in `cb`, if paused and `bufferedAmount < 1 MiB` → `tcp.resume()`. A Node TCP `data` chunk is at most 64 KiB (libuv's read buffer), so the next chunk sent before the pause takes effect keeps `bufferedAmount` ≤ 8 MiB (AR-004); the integration test asserts ≤ 8 MiB with a non-reading viewer. If `tcp.write` returns false → `socket.pause()`; on `drain` → `socket.resume()`.
- **D-7** Close codes reach the UI through `useVncSession`'s own close listener (AR-001). `viewerStateForClose`:

  | Close | Reason | Viewer state | UI |
  | --- | --- | --- | --- |
  | 4401, 4403 | any shared-policy reason | `not-allowed` | "This viewer is not allowed on this node" |
  | 4404 | `NODE_DESKTOP_UNAVAILABLE` | `unavailable` | "This node has no shared desktop" |
  | 4404 | other (route unsupported) | `not-allowed` | as above |
  | 4502 | `NODE_DESKTOP_DISCONNECTED` | `disconnected` | "The node's desktop disconnected" + Reconnect |
  | 4400 | any | `disconnected` | "The connection was refused" + Reconnect |
  | 1005 (close without a code: the server's shutdown closes clients through `@fastify/websocket` preClose `client.close()`) | — | `disconnected` | "The node's desktop disconnected" + Reconnect (server restart, AC-011) |
  | 1006 or no close frame | — | `unreachable` | "Cannot reach the node" + Reconnect |
  | 1000, 1001 | — | `closed` | "Disconnected" + Connect |

  A unit test per row.
- **D-10** Mode after reconnect (AR-005): every reconnect, after the window was hidden or by the Reconnect button, opens in View only; only the explicit switch opens a Control stream. REQ-005 reads "every viewer starts in View only", and a returning user should not find input live without choosing it again.
- **D-8** Launcher `v9`: the next `upgrade --all` / `workspace apply` recreates each node once with its backend port and volumes.
- **DEC-S1-1** Shared policy unchanged for phones (requirements doc).

## Change / Refactor Sequence

1. Server: availability → filter (with unit tests) → stream (integration tests) → routes + registration → settings key removal → module doc.
2. Web: endpoints + `nodeDesktopClient` → `useVncSession` rewrite → `NodeDesktopTile` (rename, visibility, mode switch) → `VncViewer` → settings card → localization → remove `vncHosts.ts` and stale tests.
3. Launcher (bash, PowerShell), compose, `.env.example`, `docker-start.sh` → launcher tests.
4. Docs, GLOSSARY.
5. Validation (below).

## Key Tradeoffs

- Reconnect on mode switch (simple, auditable) vs. in-band switching (no redraw).
- Availability tied to the Docker-node fact (works on existing images) vs. an image variable (needs image changes and a system level).

## Risks

- `wss` from the Electron renderer to a Tailscale Serve node (expected fine: other `/ws` routes already use it).
- A noVNC message type outside the table would close the stream (fail closed, visible as 4400): the per-type test against noVNC's encoders covers it.
- Until S2, inside the node 5900/6080/9223 still listen on the container interface (not published after S1).

## Validation Plan (per TESTING.md)

- Server unit: filter (both modes, each table row, messages split across chunks, handshake errors, early bytes, oversize cut text/fence, shared forced, every message noVNC 1.7.0 can encode); availability (env set/unset).
- Server integration: `NodeDesktopStream` against a local fake RFB TCP server (`net.createServer`): both directions, close propagation (upstream closed ≤ 2 s after viewer close), TCP refused → 4502, non-reading viewer keeps `bufferedAmount` ≤ 8 MiB with TCP paused.
- Server E2E (test-owned server): `GET /rest/node-desktop` with/without the starter env; WS refused for invalid/revoked phone credential and Phone Access disabled before the fake upstream sees a connection; trusted-network accepted; 4400 with no upstream connection for: invalid mode, missing mode, repeated mode, `mode=view&host=…&port=…`, `target=`, `url=`, any unknown key (AC-003).
- Real node: a container built from the worktree (or an isolated node whose server package is the worktree build), loopback-published, test data: through `/ws/node-desktop` — handshake; `view` pointer/key bytes do not reach Xvnc (`xdotool getmouselocation` inside), `control` does; SetDesktopSize leaves `:99` at 1920×1080 (start from the parent probe); Xvnc restart → 4502 and reconnect; server restart → no orphaned streams.
- Web unit: `useVncSession` (never `resizeSession = true`; `viewOnly` follows mode; mode switch reconnects; no credentials option; the close listener is registered before RFB and one test per D-7 row maps code + reason to the state), reconnect opens in View only (D-10), `NodeDesktopTile` (hidden → disconnect, visible → reconnect), `VncViewer` (available / unavailable / error), `nodeDesktopClient` (URL with and without credential), settings card without VNC Hosts.
- Browser probe: `tests/e2e/vnc-live-probe.mjs` rewritten to the route.
- Isolated desktop instance (worktree build): open a Docker test node window → VNC Viewer renders through `/ws/node-desktop`; Maximize keeps the node at its size; View only / Control switch; minimizing the window ends the stream.
- Launcher: `scripts/tests/test_public_docker_launcher_*.py` (only `:8000` mapping, no host env, no `NOVNC_PORT` state, `v9`, recreate keeps the backend port), `pwsh` run where available; `docker compose config`.
- Log scan over all runs (AC-014). Fresh-start build: applies (`scripts/**`, `autobyteus-server-ts/docker/**`).

## Guidance For Implementation

- Reproduction: parent `probes/rfb-forwarding-probe.mjs` MODE=resize becomes the "resize refused" test through `/ws/node-desktop`.
- Keep the filter pure and table-driven; never log bytes; `redactSensitiveUrl` for any logged URL.
- Never set `rfb.viewOnly = false` outside a `control` stream; never set `resizeSession = true`.
- Attach the socket's `message` listener synchronously at connection (as `terminal.ts`), start the stream only after authorization; viewer bytes before that → close 4400.
- Real nodes `autobyteus-server-0/1/2`: never touched.
