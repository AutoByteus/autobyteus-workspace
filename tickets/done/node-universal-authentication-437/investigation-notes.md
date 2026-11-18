# Investigation Notes

## Investigation Meta

- Package identifier: `node-universal-authentication-437`
- Request / ticket: Project Task `autobyteus-437` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), with its two PM comments of 2026-11-09
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437`
- Repository mode: `Git`
- Task worktree / branch: same path, `codex/node-universal-authentication-437`
- Resolved base: `origin/personal` @ `b690a5dfdb` (fetched 2026-11-08)
- Finalization target: `origin/personal`
- Bootstrap result: worktree created; no install yet (no probe needed in this phase; autobyteus-436's worktree holds the PROBE-01 harness)
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (2026-11-08): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md`, `references/handoff.md`; `TESTING.md` (Environments, credentials and data)
- Investigation status: requirements-phase investigation complete; architecture investigation after approval (UNK list below)

## Initial Request And Clarifications

- Original request: the user's decision in the autobyteus-436 conversation (2026-11-08), quoted in the Task: every endpoint needs authentication; the Electron app gets its key when the system starts; phones and peer nodes get theirs by pairing; "if they don't have that thing they cannot get it"; "one for all … analyze, investigate and think about a proper design … VS Code and Jupyter really have similar things."
- Constraints (Task): the user decides visible behavior; do not break the desktop app, phone, Docker and remote nodes, remote collaboration, agents, applications, the message gateway; isolated tests; no secrets in logs; DESIGN.md and TESTING.md; release only on his word.
- Done when: the user has an approved design with a slice plan.

## Source Log

| Date | Type | Source | Why | Finding | Follow-up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-08 | Code | `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts` | Today's gate | Route classes: public (health, status, /mobile, preflight, pairing exchange), owner (remote-access settings/devices/pairing sessions, node-update; phone refused), protected (everything else), WebSocket. A request **without** a credential passes every class; only `mra_` phone credentials are validated and limited. | BEH-001 |
| 2026-11-08 | Code | `grep -rn isAuthenticated src` | Is authentication required anywhere | No route reads `isAuthenticated`. | BEH-001 |
| 2026-11-08 | Evidence | autobyteus-436 `evidence/PROBE-01-phone-file-reach.log` | Reach without a key | No credential: register any folder 200, read any file 200 (reproduced). | BEH-001 |
| 2026-11-08 | Code | `src/api/websocket/terminal.ts:154`, `remote-access-websocket-auth.ts:23` | Terminal | The terminal WebSocket uses only `authorizeWebSocket`, which admits any request without a phone credential. Read, not reproduced. | BEH-001, AC (slice 1 failing test) |
| 2026-11-08 | Code | `src/app.ts:18`; `autobyteus-web/electron/server/macOSServerManager.ts:50-54` | Listening address | Default host `0.0.0.0`; the desktop launcher passes no `--host`. Measured on the user's Mac (436): `*:29695`. | BEH-002 |
| 2026-11-08 | Code | `scripts/public/docker/autobyteus-docker.d/bash/container-config.sh:26,40` | Docker nodes | `AUTOBYTEUS_BIND_HOST=0.0.0.0`, `-p "${BACKEND_PORT}:8000"` (all host addresses). Inside the container, host and LAN clients arrive through Docker's NAT, so the client address cannot tell them apart (to verify in design: UNK-003). | BEH-002, DEC-002 |
| 2026-11-08 | Code | `src/remote-collaboration/channel/peer-gateway.ts:186-276`, `peer-client.ts:255-262,318` | Peer requests | Peer requests carry `fromNodeId` in the body and only `content-type`; the gateway checks that the ID is a registered peer; comment: "the place where peer authentication and permissions are added in S6". Node IDs are public (`GET /rest/remote-access/status`). | BEH-004 |
| 2026-11-08 | Code | `src/remote-collaboration/settings/peer-directory.ts` | Peer registration | Each node adds the other by URL + pinned node ID, one direction per node; nothing secret is exchanged. | BEH-004, DEC-004 |
| 2026-11-08 | Code | `src/remote-access/services/remote-access-pairing-service.ts:24-28`, `paired-device-service.ts:25-27` | Phone pairing quality | Pairing code 18 random bytes, 5-minute TTL, single use; credential `mra_` + 32 random bytes, only a SHA-256 hash stored, revocable. A sound building block for every client kind. | DEC-003, DEC-004 |
| 2026-11-08 | Code | `autobyteus-web/utils/remoteAccess/authorizedTransport.ts`, `authorizedResourceUrl.ts`; users in `plugins/30.apollo.client.ts`, `services/api.ts`, the streaming services, viewers | Web client seam | One credential source (`getActiveRemoteAccessCredential`) feeds GraphQL, axios, fetch, WebSocket URLs, and blob loading of protected resources. Today it is set only on the phone. | DEC-006 |
| 2026-11-08 | Code | `autobyteus-web/components/fileExplorer/viewers/HtmlPreviewer.vue:38`, `components/applications/ApplicationIframeHost.vue:2-6`, `autobyteus-application-frontend-sdk/src/create-application-backend-mount-transport.ts` | Resources loaded by URL | The desktop's HTML preview and installed applications load node URLs in iframes; application code calls its backend with plain fetch/WebSocket and no credential. A header cannot be added by page code there. | DEC-006, DEC-008 |
| 2026-11-08 | Code | `autobyteus-web/electron/browser/browser-session-profile.ts:41`, `local-file-protocol/local-file-protocol.ts:15` | Electron request hooks | Electron already rewrites request headers with `webRequest.onBeforeSendHeaders` (in-app browser partition, autobyteus-416). The in-app browser is a separate session partition from the app window. | DEC-006 |
| 2026-11-08 | Code | `autobyteus-web/electron/server/baseServerManager.ts:228`, `nodeAutoUpdate/nodeUpdateClient.ts` | Electron main-process callers | Health (public) and `GET/POST /rest/node-update` on Docker nodes (owner route). | BEH-003 |
| 2026-11-08 | Code | `autobyteus-web/types/node.ts:20-33` | Remote node registry | A remote node is `{ id, name, baseUrl, nodeType, nodeId?, autoUpdate? }`: no credential. The window talks to it directly over `baseUrl`. | BEH-003, DEC-003 |
| 2026-11-08 | Code | `src/agent-tools/mcp/agent-tools-mcp-local-access.ts`, `agent-tools-mcp-local-server.ts:72`, `credential-proxy/credential-proxy-local-server.ts:42` | Internal listeners | Agent tools MCP and credential proxy listen on `127.0.0.1:<random>` with loopback, loopback-Host and origin checks plus per-session/run passes. Separate from the main port. | Out of scope (QR) |
| 2026-11-08 | Code | `src/mcp-gateway/mcp-gateway-access.ts:20-40` | MCP gateway on the main port | Own bearer token required for non-local access; a local (loopback) client needs none, which includes Tailscale Serve traffic. | DEC-007 |
| 2026-11-08 | Code | `src/memory-sync/hub/memory-hub-credential-service.ts:12-75`, `memory-hub-auth.ts` | Memory sync hub | Its own `mhub_` bearer credential per source (hashed). | DEC-007 |
| 2026-11-08 | Code | `autobyteus-message-gateway/src/infrastructure/server-api/autobyteus-server-client.ts:19-20`; `grep -rn channel-ingress autobyteus-server-ts/src` → none | Message gateway | The gateway posts to `/rest/api/channel-ingress/v1/*` with an HMAC signature; the node no longer serves that path (managed gateway removed, autobyteus-294). Not a current caller of the node. | FU-001 |
| 2026-11-08 | Code | `src/agent-execution/runtime/general-process-run-supervisor.ts:146-150` | Runtimes and node URLs | Node URLs of context files are mapped to local paths for runtimes (`ContextFileLocalPathResolver`); runtimes do not fetch the node over HTTP (no other self-call found by `grep getBaseUrl`). | QR-003 |
| 2026-11-08 | Doc | `docs/android_mobile_access.md:53,95`; `autobyteus-server-ts/docs/features/remote_access.md` | Phone ways, product model | Phone ways: company address, Tailscale (tailnet IP over WireGuard, or `tailscale serve --bg <port>` the user runs, https name → loopback), VPN, local network (plain http). Phase One model: trusted private network. | DEC-002, DEC-005 |
| 2026-11-08 | Doc | `docs/future-tickets/mobile-backend-authorization-hardening.md` | Planned Phase Two | Least-privilege phone sessions, expiry, no arbitrary `createWorkspace`, read-only file viewing. | Slice 3 |
| 2026-11-08 | Web | Jupyter Server security docs; VS Code Server `--connection-token` (knowledge, not fetched) | Comparable designs | Both: a random token is required for every request; given once (printed URL / token file), then kept in a cookie or attached by the client; local use included. | DEC-001 |

## Relevant Existing Behavior

| Behavior ID | Kind | Trigger | Current path | Current outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Any request to a node's main port | Host and Origin rules, then route class; no credential needed except owner routes refuse phones | Anyone who can reach the port can read files, run agents, change settings, open the terminal (read) | Route policy; PROBE-01 | Reproduced (files), Read (terminal) |
| BEH-002 | Operational | Node start | Desktop node and Docker nodes listen on all addresses | Reachable from every network the computer joins | `app.ts`, launcher; lsof on the user's Mac | Measured |
| BEH-003 | User | Desktop uses its own node and remote/Docker nodes | Window calls each node's `baseUrl` directly, no credential; main process calls health and node-update | Works because nothing is required | `types/node.ts`, `nodeUpdateClient.ts` | Read |
| BEH-004 | System | Peer collaboration | Each side registers the other by URL + node ID; requests carry `fromNodeId` | Anyone who can reach a node can claim a peer's ID | Peer gateway/client | Read |
| BEH-005 | User | Phone | Paired once; sends `mra_` on GraphQL, REST and phone WebSockets | Works; the credential is optional on the node | `authorizedTransport.ts` | Read |
| BEH-006 | User | Desktop iframes (HTML preview, applications) | Node URLs loaded by the browser, no header | Works because nothing is required | `HtmlPreviewer.vue`, `ApplicationIframeHost.vue` | Read |
| BEH-007 | System | MCP gateway clients, memory sync sources | Own tokens (`mhub_`, gateway token); MCP gateway local clients need none | Separate key systems | `mcp-gateway-access.ts`, `memory-hub-*` | Read |

## Structural And Payload Surface Inventory

- Every caller of the main port: desktop window (own node and remote/Docker nodes), Electron main process (health, node-update), phone shell, peer nodes, MCP gateway clients, memory sync sources, iframes (HTML preview, applications), in-app browser and the agents' browser tool (separate partition), tests and probes. Not a caller: message gateway (route gone), runtimes (local paths), agent tools/credential proxy (own loopback listeners).
- Existing keys: phone `mra_` (hashed, revocable), memory hub `mhub_` (hashed), MCP gateway token (configured), internal run passes. No owner key exists.
- Persisted data affected: new owner/peer/desktop credentials; peer records gain a key; desktop node registry gains a credential per remote node (stored by Electron, not in the renderer). Existing phones' credentials stay valid.

## Unknowns For Architecture

- UNK-001: whether Electron's `webRequest.onBeforeSendHeaders` applies to WebSocket upgrades and iframe subresources of the app window in the current Electron version (expected yes; probe in design).
- UNK-002: whether an agent's browser tool or the in-app browser opens node pages that need access (applications standalone, file previews).
- UNK-003: the client address a Docker node sees for host, other containers (`host.docker.internal`) and LAN devices on Docker Desktop for Mac and on Linux.
- UNK-004: every phone-shell request path that omits the credential today (works only because nothing is required); find with the phone shell probe under enforcement.
- UNK-005: how a peer reaches a Docker node today (direct published port, host, tailnet).

## Supplement Inventory

| Path | Purpose | Status |
| --- | --- | --- |
| autobyteus-436 `evidence/PROBE-01-phone-file-reach.log`, `probes/abx436-phone-file-reach.probe.e2e.test.ts` | Reproduction of BEH-001 for files | Current (in the 436 worktree) |
| `follow-ups.md` | FU-001, FU-002 | Current |
| `autobyteus-server-ts/docs/design/node_access_model.md` | The node access contract (rules and scenario table) the design implements and the tests check | Current; project document added by this ticket |

## Architecture Investigation (after approval, 2026-11-08)

Authorities read for this phase: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (root; rules 7, 9 with the C1–C4 exception, 10, 12), `GLOSSARY.md` (Nodes section).

| Date | Type | Source | Finding | Established | Design use |
| --- | --- | --- | --- | --- | --- |
| 2026-11-08 | Probe | PROBE-02 `probes/echo-client-address.mjs`, log `evidence/PROBE-02-client-addresses.log` (throwaway containers from the local `autobyteus/autobyteus-server:beta` image; removed) | Docker Desktop for Mac: inside a container, a request from this Mac (A1) and one sent to the Mac's LAN address (A2) arrive from the same address (`172.64.155.209`): a container cannot tell host from LAN. Published on `127.0.0.1` only: the Mac reaches it (A3), the LAN address is refused (A4), other containers reach it through `host.docker.internal` (B3). Containers reach a host listener bound to `127.0.0.1` through `host.docker.internal`, arriving as `127.0.0.1` (B1, B2). The embedded node sees a LAN client as its LAN address (C1). Linux Docker not measured. | Measured | Network admission by arrival address for nodes not in a container; publishing addresses for Docker nodes |
| 2026-11-08 | Probe | PROBE-03 `probes/electron-header-injection/` run with Electron 42.4.1 (main checkout's binary; the app pins 42.11.16), log `evidence/PROBE-03-electron-header-injection.log` | `session.defaultSession.webRequest.onBeforeSendHeaders` added the header to a file:// window's `fetch`, WebSocket upgrade, `<img>`, iframe and the iframe's own subresource; a window in another partition got none. | Measured | UNK-001 resolved: the desktop attaches owner credentials in the main process |
| 2026-11-08 | Data (read-only) | `~/.autobyteus/server-data/remote-collaboration/peers.json` (names and addresses only), `remote-access/paired-devices.json` (way and revocation only) | The user's embedded node has two peers, `docker-8001` at `http://localhost:8001` and `docker-8003` at `http://localhost:8003`; one active paired phone (31 revoked). | Read | UNK-005: peers reach Docker nodes through the host's published ports |
| 2026-11-08 | Code | `autobyteus-server-ts/src/remote-access/services/paired-device-service.ts:66-80`, `stores/paired-device-store.ts:33` | Every phone request reads `paired-devices.json` and writes `lastSeenAt` back. | Read | QR-002: the gate keeps credentials in memory; last-seen written at most once a minute |
| 2026-11-08 | Code | `src/remote-access/services/node-network-service.ts:66-130`, `network-interface-classifier.ts` | One owner already classifies this computer's interfaces (Tailscale, VPN, local addresses), the local network ID and whether the owner allowed it; in a container it reports `runsInContainer`. The allowed flag is used only by Phone Setup today. | Read | Network admission reuses these facts |
| 2026-11-08 | Code | `src/api/security/remote-access-policy-plugin.ts:19-21,39-55`; `src/mcp-gateway/mcp-gateway-routes.ts:42-51`, `mcp-gateway-access.ts:20-40` | `/ws/*` upgrades are authorized by their handlers; `/mcp/gateway` has its own gate registered before the policy plugin (local needs no token). | Read | One gate for all routes except the MCP gateway's own; MCP gateway loses its loopback exemption |
| 2026-11-08 | Code | `src/memory-sync/hub/memory-hub-credential-service.ts`, `api/rest/memory-sync.ts` | Memory sync sources present `mhub_` credentials that the hub routes check. | Read | `mhub_` becomes a credential kind of the gate |
| 2026-11-08 | Code | `src/standalone-application-host/config/standalone-application-host-config.ts:28-77`; `compositions/build-standalone-application-server.ts` | The standalone application host is a separate server, loopback by default, with no credential gate. | Read | Out of scope (FU-002) |
| 2026-11-08 | Code | `autobyteus-web/nuxt.config.ts:39-150`; `scripts/development/development-runtime.mjs:38,250-266` | Development frontends reach the node through Vite's proxy; the dev runtime already writes the backend's environment. | Read | Dev credential injected by the proxy |
| 2026-11-08 | Doc | `DESIGN.md` rule 9 | `/rest/node-update` (C1) is frozen across versions: it grows only by optional fields and new codes; a client shows the `message` of an unknown code. | Read | A 401 with a new code on C1 is allowed; nothing on C1 is renamed |

- Resolved: UNK-001 (PROBE-03), UNK-003 (PROBE-02, macOS), UNK-005 (peers.json). UNK-002: the in-app browser and agents' browser get no credential (PROBE-03 other partition); no product path found that opens node pages there (`grep openBrowserTab`: only `BrowserPanel.vue` with user-entered URLs). UNK-004: found by running the phone shell probe under enforcement (implementation).

## Round 2 Evidence (ARCH-REV-001, 2026-11-08)

| Source | Finding | Established | Design use |
| --- | --- | --- | --- |
| `autobyteus-web/electron/server/windowsServerManager.ts:38`, `macOSServerManager.ts:42`, `linuxServerManager.ts:39` | The Electron↔node IPC channel (`'ipc'` stdio) exists only on Windows; macOS and Linux spawn with `['ignore','pipe','pipe']` | Read | M-1: hand over by environment, removed by the node's first module |
| `autobyteus-server-ts/docker/starter/cli.mjs:51-52` (C2, frozen) | The starter CLI has only `status` and `update` | Read | M-2: setup codes through the node's own local socket, not the starter |
| `src/remote-access/services/network-interface-classifier.ts` (no `netmask`/`cidr`), `domain/models.ts:50` | Interface addresses kept without prefix length | Read (review AR-006) | M-6: classifier keeps `cidr` |
| `src/mcp-gateway/mcp-gateway-access.ts:6,24`; `autobyteus-web/docs/tools_and_mcp.md` | Token only from an optional env variable; the frontend does not show it | Read (review AR-005) | M-5 |
| `src/node-desktop/node-desktop-viewers.ts:14,52,105`; `remote-access-websocket-auth.ts:23-30` | Only node-desktop streams re-check a phone; other sockets are authorized once | Read (review AR-004) | M-4 |
| `scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh:290-310` | Containers are recreated only by the launcher on a changed config hash | Read (review AR-008) | M-8a |
