# Design Spec — node-universal-authentication-437 (autobyteus-437), slice 1 "no key, no access"

## Solution And Approval Basis

- Current solution revision ID: `SR-006` (round 3 adds AR-003/AR-004 residuals and AR-011 cleanups; round 2: resolves ARCH-REV-001 AR-001…AR-010; section "Round 2 Mechanisms" is authoritative where it is more specific than an earlier section)
- Approved requirements baseline: `requirements-doc.md` SR-002, approved by the user on 2026-11-08 (he delegated the five open decisions to the recommendations; reference in the requirements doc).
- Behavior-defining supplements: the project contract `autobyteus-server-ts/docs/design/node_access_model.md` (NA-1…NA-15, scenarios NAS-01…NAS-38), written at the user's request (2026-11-08: "write this kind of contract to a file … for each different scenario … then you can validate this"), following the existing design contracts (`collaboration_model.md`). It restates the approved requirements and DEC-011…014; this design implements it.
- User approval of the design, when the direction requires it: `Obtained` — the user, 2026-11-08, in the Solution Designer's conversation: "Yes approved", answering "send the design and contract to the architecture review, and slice 1 gets built once the review passes". It covers this design, the contract `node_access_model.md`, DEC-011…014 and building slice 1 after an architecture review pass. The user confirmed he always connects through Tailscale (home, Wi-Fi, train); his paired phone uses a Tailscale Serve `https` address (read-only check).
- Design status: `Ready`
- Canonical investigation notes: `investigation-notes.md` (this folder), including "Architecture Investigation".
- Authorities read (2026-11-08): `references/architecture-design.md`, `references/design-principles.md`, `/DESIGN.md` (rules 1, 4, 5, 7, 9 with the C1–C4 exception, 10, 11, 12), `/GLOSSARY.md` (Nodes), `TESTING.md` (Environments, credentials and data; Browser probes), `autobyteus-server-ts/docs/features/remote_access.md`.
- Project design-principle conflicts: none. Discrepancy to record: `GLOSSARY.md` "Peer" says "both nodes registered each other", which this design changes (one pairing registers both); the glossary is updated in this change.

## Current-State Read

- One request gate exists on a node's main port: Host rule (403 `REMOTE_ACCESS_HOST_REFUSED`, autobyteus-416) → allowed-origin rule (autobyteus-403) → route class (`remote-access-policy-plugin.ts:39-55`, `remote-access-route-policy.ts:37-205`). Its classes decide only what a **phone** credential may do; a request without any credential passes every class except loopback-only GraphQL GET (investigation BEH-001; PROBE-01 in autobyteus-436). `/ws/*` handlers call the same policy (`authorizeWebSocket`); `/mcp/gateway` has its own gate registered earlier, with no token needed from loopback (`mcp-gateway-access.ts:20-40`).
- Clients today carry: nothing (desktop window to any node, Electron main to node-update, peers), a phone credential `mra_` (phone), `mhub_` (memory sync sources), the MCP gateway token (non-local MCP clients). A peer is a claimed `fromNodeId` (`peer-gateway.ts:271-274`).
- Every phone request reads `paired-devices.json` and writes `lastSeenAt` (`paired-device-service.ts:66-80`).
- The desktop node and Docker nodes listen on all addresses (`app.ts:18`; launcher `container-config.sh:26,40`). `NodeNetworkService` already classifies this computer's Tailscale, VPN and local addresses and knows whether the owner allowed the current local network (`node-network-service.ts:66-130`), used only by Phone Setup.
- Constraints: DESIGN.md rule 9 (clean cut between versions; `/rest/node-update` C1 grows only by new codes), rule 7 (bad data contained), rule 11 (no test-only production code), the Host/Origin rules and `sendUserFile` (403, 416).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: new server subsystem (node access: credentials, setup codes, network admission) and a rewritten request gate; peer pairing and request signing in remote collaboration; MCP gateway and memory sync admission; Electron main (credential store, header attachment, connect IPC), Nodes and peers UI; Docker launcher (sh and ps1); dev runtime and test harnesses; docs and glossary. About 40–60 files across server, web, Electron, scripts.
- Architectural risk: `High`
- Risk rationale: a new security boundary on every route; new persisted credentials; a changed peer contract and pairing flow; launcher publishing change; every client of every node must keep working (blast radius); one frozen contract (C1) gains a refusal code.
- Escalation trigger: any client found that cannot carry a credential through the designed paths (UNK-004 phone paths are expected and in scope; anything else returns as `Design Impact`); Docker Desktop refusing to publish on the host's Tailscale address (UNK-006).

## Architecture Investigation Evidence

| Source / Probe | Reference | Observation | Decision supported | Remaining uncertainty |
| --- | --- | --- | --- | --- |
| PROBE-01 (436) | autobyteus-436 `evidence/PROBE-01-phone-file-reach.log` | No credential needed for files/workspaces | REQ-001 gate | — |
| PROBE-02 | `evidence/PROBE-02-client-addresses.log` | Container cannot tell host from LAN; `127.0.0.1` publishing keeps host and container-to-container paths; embedded node sees real client addresses | Network admission by arrival address outside containers; Docker exposure by publishing | Linux Docker not measured; Tailscale-address publishing not measured (UNK-006) |
| PROBE-03 | `evidence/PROBE-03-electron-header-injection.log` | Main-process header attachment covers fetch, WebSocket, img, iframe and its subresources; other partitions get nothing | Desktop credentials live and are attached only in Electron main | Measured on 42.4.1; app pins 42.11.16 (same major) |
| Code | `paired-device-service.ts:66-80` | File read + write per phone request | In-memory credential registry | — |
| Code | `node-network-service.ts:66-130` | Interface classification and allowed local network exist | Reuse for admission | Refresh cadence (design below) |
| Code | `remote-collaboration-settings.ts:136-139`, `peer-directory.ts`, `remoteCollaborationStore.ts` | Peers added by GraphQL on each node by the desktop; address `resolve(nodeId, baseUrls)` exists | Desktop pairs its own nodes automatically through invite + accept | — |
| Data (read-only) | `peers.json`, `paired-devices.json` | Peers at `http://localhost:8001`, `:8003`; one active phone | Upgrade path; peers re-pair once | — |
| Doc | `DESIGN.md` rule 9 | C1 frozen except new codes | 401 code on C1 is allowed | — |

## Intended Change

Every request to a node's main port must present a credential the node issued, from an admitted network. The desktop's own node gets a fresh owner credential at each start; other nodes give the desktop an owner credential once, for a setup code; phones keep theirs; peers pair once and sign every request; memory sync sources and MCP clients use their keys with no loopback exemption.

## Round 2 Mechanisms (ARCH-REV-001)

Each mechanism below resolves one review finding. It names the owner, the order, and where it changes earlier sections.

### M-1 Launch credential handover (AR-001)

- The desktop's `ServerManager` creates the launch credential and puts it only in the spawn environment of the node process (`AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL`), never in Electron's own `process.env` or `serverRuntimeEnv`'s shared builder output used elsewhere.
- In the node, the **launch-credential intake** (`src/node-access/launch-credential-intake.ts`) is the **first import** of `src/app.ts`. ES modules evaluate in import order, so its body runs before any other module, and so before anything can spawn or copy the environment. It reads the variable, deletes it from `process.env`, and holds the value in module memory; `OwnerCredentialService` asks the intake for it once at composition.
- Every later child (runtimes, terminal shells, application workers, watchers) therefore inherits an environment without it. The development runtime does the same (it starts the node with the variable; the same intake removes it).
- Why not the Electron IPC channel: it exists only on Windows (`windowsServerManager.ts:38` `'ipc'`; macOS and Linux spawn with `['ignore','pipe','pipe']`). Software running as the same user can still read a process's initial environment block; that is outside the model (NA, "Out of the model").
- Contract: new rule NA-15 and scenario NAS-31 ("an agent's terminal environment holds no credential").

### M-2 Setup codes on demand (AR-002, AR-010c)

- No setup code is written at start, to a file or to a log.
- Each node opens a **local control socket** owned by `SetupCodeService`: a Unix socket at `<data dir>/node-access/local-control.sock` with mode 0600 (Windows: a named pipe `\\.\pipe\autobyteus-node-<nodeId>`, current-user ACL). Reaching it requires the node's computer and the data folder's user (or `docker exec` into the container). It answers one request, `setup-code`, with a fresh single-use code valid for 30 minutes, whatever the owner state (no owner, owners lost, the only owner disconnected).
- Clients of that socket: the Docker launcher's `autobyteus-docker setup-code <node>` (`docker exec <container> node -e '<connect, send "setup-code", print the code>'`; the protocol is one line out, one JSON line back, documented in the contract), and for a server install the CLI `node dist/node-access-cli.js setup-code --data-dir <dir>`. `autobyteus-docker install` prints a code at the end the same way.
- An owner desktop can also create a code through the owner route `POST /rest/node-access/setup-codes` (another desktop).
- The embedded node never needs one (launch credential), but has the socket too (a reinstalled desktop recovers its own node with no step anyway).
- Contract: NA-5, NA-10 updated; scenarios NAS-32 (lost desktop store), NAS-33 (only owner disconnected).

### M-3 WebSockets decided in the hook (AR-003)

- The plugin's `onRequest` hook decides every request, `/ws/*` included (the `shouldDeferToWebSocketHandler` skip is removed). The route pattern is known there (`request.routeOptions.url`).
- On a gated route (marked by the wrapper; see the fail-closed bullet below) the hook records a refusal on the request; one WebSocket wrapper, `registerGatedWebSocketRoute` in `api/websocket/index.ts`, which every `/ws/*` route registers through, accepts and closes with 4401/4403 and the code before the handler runs. Handlers never authorize. `/graphql` and `/rest/remote/run-observations` upgrades are refused with HTTP status as today.
- Fail closed: the hook refuses a `/ws/*` upgrade with an HTTP status (401/403, no upgrade) by default. Only on a route that `registerGatedWebSocketRoute` marked (`routeOptions.config.gatedWebSocket === true`) does it record the refusal for close-code delivery instead. A WebSocket route registered without the wrapper therefore never runs its handler for a refused request.
- The architecture test asserts every WebSocket route is either wrapped (`gatedWebSocket`) or one of the two named exceptions, `/graphql` (Mercurius) and `/rest/remote/run-observations` (peer), which receive HTTP refusals.
- An architecture test lists every registered route (HTTP and WebSocket) and checks each has a permission row or the default, and that no handler file imports the gate (AC-002 registers a test WebSocket route too).
- Removed: `shouldDeferToWebSocketHandler`, the eleven per-handler `authorizeRemoteAccessWebSocket` calls, `remote-access-websocket-auth.ts`.

### M-4 Closing open sockets on revocation (AR-004)

- The gate keeps an **open-socket registry** (`api/security/open-socket-registry.ts`): the WebSocket wrapper registers each accepted socket under its `ClientIdentity` and removes it on close.
- Each credential owner publishes a revocation after its own write: `PairedDeviceService.revoke` and turning Phone Access off (phone), `OwnerCredentialService.revoke` (owner), `PeerPairingService` remove or unpair (peer), memory hub source revocation. The gate subscribes and closes that identity's sockets with 4403 and the revocation code (`REMOTE_ACCESS_DEVICE_REVOKED`, `PHONE_ACCESS_DISABLED`, `NODE_CREDENTIAL_REVOKED`, `PEER_UNPAIRED`).
- Sockets outside the wrapper register too, under the identity the hook set on their upgrade request: GraphQL subscription sockets in Mercurius's `subscription.context(socket, request)` (registered) and `subscription.onDisconnect` (removed), configured in `api/graphql/index.ts` (today `subscription: true`); the peer run-observation socket in its own route (`api/rest/remote.ts:43`), registered on open and removed on close. A revocation therefore closes every open socket of that identity (owner, phone, peer, memory sync source).
- The node-desktop viewers' own periodic phone re-check (`node-desktop-viewers.ts:14,52,105`) is removed: the registry covers it.
- Contract §5 corrected: NA-11 holds for phones on HTTP and node-desktop streams today; other open sockets are target.

### M-5 MCP gateway token (AR-005)

- Owner: `McpGatewayTokenService` (`src/mcp-gateway/mcp-gateway-token-service.ts`). If `AUTOBYTEUS_MCP_GATEWAY_TOKEN` is set, that is the token (read-only; the panel says it comes from the node's environment). Otherwise the service creates `mcpg_` + 32 random bytes the first time the gateway is used or the panel asks, stored at `<data dir>/mcp-gateway/token.json` (mode 0600, plain, because the owner must be able to copy it into clients).
- Owner routes: `GET /rest/mcp-gateway/token` (shows it), `POST /rest/mcp-gateway/token/regenerate` (a new token; the old one stops working). Phones and peers cannot read it (NA-7).
- `McpGatewayPanel.vue` shows the token with Copy and Regenerate; `autobyteus-web/docs/tools_and_mcp.md` is updated ("the frontend does not display the token" no longer holds).
- Contract: NA-12 updated.

### M-6 Network admission: the compared address (AR-006)

Admission compares the connection's **client address** (`request.raw.socket.remoteAddress`, normalized as today by `normalizeClientAddress`), never the destination address alone, because macOS accepts a packet for any of its addresses on any interface (P-002). Rules, in order; the first match admits:

| Rule | Client address must be | Plus | Example admitted | Example refused |
| --- | --- | --- | --- | --- |
| This computer | `127.0.0.0/8` or `::1` | — | `127.0.0.1` (desktop, Tailscale Serve, Docker via `host.docker.internal`) | — |
| Tailscale | in `100.64.0.0/10` or `fd7a:115c:a1e0::/48` | the connection's local address (`socket.localAddress`) is one of this computer's Tailscale addresses (`NodeNetworkService`) | phone `100.101.7.9` → `100.88.1.2:29695` | `100.64.5.5` arriving on the Wi-Fi address |
| Allowed local network | inside the subnet of a local address of this computer (`address/prefix` from `os.networkInterfaces()` `cidr`; the classifier is extended to keep it) | that network's ID is allowed (`allowed-local-networks.json`) | `192.168.2.40` while at home (allowed) | `192.168.2.40` at a café (not allowed) |
| Configured networks | inside a CIDR of `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS` | — | `10.8.0.0/16` listed, client `10.8.3.4` | — |
| Node in a container | any | `runsInContainer` | every arrival (NA-4) | — |

- Spoofing: a TCP client cannot complete a connection from an address it does not receive replies at; loopback sources from outside are dropped by the kernel. Residual RSK-005: a local network that itself uses `100.64.0.0/10` addresses and whose replies leave through the Wi-Fi interface; the local-address condition and NA-1 (a credential is still required) bound it.
- The snapshot (DS-007) holds: this computer's Tailscale addresses, its local subnets with their network ID and allowed flag, and the configured CIDRs.

### M-7 Peer signature binding and body integrity (AR-007)

- The signed string is `METHOD \n PATH?QUERY \n fromNodeId \n toNodeId \n timestamp \n nonce \n sha256(body)`, with headers `X-AutoByteus-Peer-From`, `-To`, `-Timestamp`, `-Nonce`, `-Body-SHA256`, `-Signature`. The peer verifier refuses when `To` is not this node's ID, when the timestamp is outside ±300 s or earlier than this process's start, or when the nonce was seen. A request captured from A→B therefore cannot be presented to A (wrong `To`) or replayed after a restart.
- Body integrity has one owner, the gate: for a request whose identity is a peer, the gate's `preParsing` hook wraps the payload stream to compute SHA-256 as it is read, and its `preValidation` hook compares it with `X-AutoByteus-Peer-Body-SHA256` before any handler runs (a mismatch refuses 401 `NODE_CREDENTIAL_INVALID`). WebSocket upgrades have no body (the hash of the empty string). The exempt pairing exchange has no peer identity and is not checked.
- The routes in `api/rest/remote.ts` hold no security check.

### M-8 Upgrade of existing deployments (AR-008)

- (a) Existing Docker containers keep their old publishing until recreated. `autobyteus-docker setup-code <node>` (the step the owner takes once after the update anyway) first runs the launcher's existing config-hash check (`docker-runtime.sh:290-310`) and recreates the container with the new publishing when it differs (named volumes and port kept), then asks for the code. `autobyteus-docker upgrade` and `start` do the same. The release note says the container restarts once. Until then the node in the old container accepts every arrival, but only exempt endpoints answer without a credential (NA-1); NAS-34.
- (b) A node not in a container on another computer, reached over a local network (a server install, Android `--host 0.0.0.0`): after the update the desktop gets 403 `NODE_NETWORK_REFUSED`. The Nodes page shows "This node does not accept connections from your network", with the two ways the approved decisions give: reach it through its Tailscale address, or on that computer add this network to `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS` (DEC-012). Then "Needs connecting" and the setup code as usual. No new behavior beyond DEC-011/012. NAS-35.

### M-9 Pairing addresses (AR-009)

- An invite is `{ nodeId, addressCandidates, inviteCode }`: `createPeerInvite` on A fills `addressCandidates` from A's own `peerAddressCandidates` (`remote-collaboration-settings.ts:120`), as the desktop does today when adding a peer.
- `acceptPeerInvite(invite, name)` on B: B's `PeerPairingService` resolves A's candidates with the existing `PeerAddressResolver` (which handles loopback inside a container, `peer-address-resolver.ts:17-20`) and pins A's node ID; then calls A's exchange with B's own candidates; A resolves them the same way and pins B.
- Desktop owning both: it calls `createPeerInvite` on A and passes the invite to `acceptPeerInvite` on B (one click). Between two desktops: the invite is shown as one copyable text (`abpi_` + base64url of the invite) and pasted on B.
- Re-pairing a row without a secret (an existing peer): the exchange updates that node ID's row on both sides (name, address, history kept) and sets the secret; a row that already has a secret is re-paired only after the owner removes it.

### M-10 Package corrections (AR-010)

- (a) The Host rule refuses with 403 `REMOTE_ACCESS_HOST_REFUSED` (fixed in Current-State Read and DS-001).
- (b) `nodeUpdateClient.ts` is `Modify` (owner credential from the store).
- (c) No setup code in files or logs (M-2).
- (d) `LOCAL_DEV_ONLY` (loopback-only GraphQL GET) is removed: GraphQL GET (development UI) needs an owner credential like everything else.
- (e) `node-access/domain` is a leaf: `client-identity.ts` and `credential-secret.ts` import nothing from the project; `remote-access`, `remote-collaboration`, `memory-sync/hub`, `mcp-gateway` and `node-access/services` import it. The composition root (`compositions/build-studio-server.ts`) builds `NodeCredentialResolver` with the verifiers of each area and gives it to the gate.

## Change Scope (Mandatory)

- In scope: UC-001…UC-008 (requirements). Areas: the request gate and route permissions (`autobyteus-server-ts/src/api/security/`), a new `src/node-access/` subsystem, phone credential verification (`src/remote-access/`), peer pairing and signing (`src/remote-collaboration/`), memory sync admission (`src/memory-sync/hub/`), MCP gateway access (`src/mcp-gateway/`), Electron main (`autobyteus-web/electron/`), Nodes and peers UI and stores (`autobyteus-web/components/settings/nodes`, `stores/remoteCollaborationStore.ts`, `stores/nodeStore.ts`), Phone Setup copy for the local network and VPN, Docker launcher (`scripts/public/docker/`), dev runtime and Vite proxy, server e2e helpers and browser/phone probes, docs (`remote_access.md`, `android_mobile_access.md`, `docker/README.md`, `GLOSSARY.md`, `TESTING.md`, `autobyteus-server-ts/README.md`; `collaboration_model.md` CM-12 and its status row when peer authentication lands). The contract `docs/design/node_access_model.md` is added in this change (with its `DESIGN.md` and design README entries); its section 5 is updated as slice 1 lands.
- Derived consumers: `peers.json` gains `peerSecret` → readers: `PeerStore`, `PeerDirectory` (list/find), GraphQL `PeerNodeGql` (must **not** expose the secret), `list_peer_nodes` tool (must not expose it), remote run views. `paired-devices.json` unchanged (now cached). `NodeEntry` unchanged (credentials stored separately in Electron main).
- Deliberately left alone: what each credential may do beyond today's phone limits (slice 2: phone scopes, autobyteus-436 folders, `createWorkspace`, expiry, application-scoped keys); the agent-tools MCP and credential-proxy loopback listeners (own passes); the standalone application host (FU-002); the message gateway (FU-001); Host/Origin rules (kept as they are, run first).
- Follow-ups: FU-001, FU-002.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Kind | Requirement / AC | Trigger | Existing evidence | Change / preserved | Target path / spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-001, 002, 009; AC-001, 002, 009 | Any request | Route policy; PROBE-01 | Credential required; route permitted by client kind | DS-001 |
| BEH-002 | Operational | REQ-008; AC-008 | Connection | `app.ts`, launcher; PROBE-02 | Network admission; Docker publishing | DS-001 (admission), DS-006 |
| BEH-003 | User | REQ-003, 004, 010; AC-003, 004 | Desktop start; connect a node | `types/node.ts`, PROBE-03 | Owner credentials attached by Electron main | DS-002, DS-003 |
| BEH-004 | System | REQ-006; AC-006 | Peer request; pairing | Peer gateway | Pair once; signed requests | DS-004, DS-005 |
| BEH-005 | User | REQ-005; AC-005 | Phone request | `authorizedTransport.ts` | Required, cached | DS-001 |
| BEH-006 | User | REQ-003; AC-003 | Iframes in the app window | PROBE-03 | Preserved through main-process attachment | DS-002 |
| BEH-007 | System | REQ-007; AC-007 | MCP client, memory source | `mcp-gateway-access.ts`, memory hub | Token always; `mhub_` as a gate kind | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Related | Relationship | Status |
| --- | --- | --- | --- | --- |
| `probes/echo-client-address.mjs`, PROBE-02 log | Docker/host client addresses | REQ-008 | Basis for admission and publishing | Evidence |
| `probes/electron-header-injection/`, PROBE-03 log | Electron attachment | REQ-003 | Basis for desktop credentials | Evidence |
| autobyteus-436 PROBE-01 | Reach without credential | REQ-001 | Becomes the failing test to start from | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement` (security boundary).
- Current design issue found: `Yes`.
- Structural triggers:
  - *Several kinds or forms* (fires): one gate serves this computer, owner desktops, phones, peers, memory sources, MCP clients; each kind gets its own verifier and route permission (below). Two parallel paths (main gate and `/mcp/gateway`'s gate) must refuse the same way: the MCP gate gets network admission and loses loopback trust.
  - *Behavior by absence* (fires): today "no credential" means "trusted network" (`trustedNetworkContext`), access granted because a phone prefix is absent. Replaced by an explicit identity result.
  - *Authoritative boundary* (fires): peer identity is read from the request body by the peer gateway, not established by the gate. Replaced: the gate authenticates the peer; the peer gateway checks the body's `fromNodeId` equals it.
  - *Persisted-data transition* (fires): new credential files and `peerSecret`; see below.
  - *Capability-area reuse* (fires): network facts (`NodeNetworkService`), pairing codes and hashing (`remote-access`), address resolution (remote collaboration) are reused.
  - *Vocabulary drift* (checked): "credential" already names the phone's secret (GLOSSARY "Phone WebSocket route"); this design uses **credential** for every client's secret and adds kinds; "key" is not introduced as a second word.
- Root cause classification: `Missing Invariant` (no credential required) with a `Boundary Or Ownership Issue` (peer identity outside the gate).
- Refactor needed now: `Yes`: the route policy's trusted-network classes become client-kind permissions; phone verification moves behind one credential resolver with an in-memory registry.
- Evidence: Current-State Read citations.
- Design response: below.
- Intentional deferrals: what each credential may do (slice 2).

## Terminology

Additions to `GLOSSARY.md` in this change:
- **Credential:** the secret a client presents to a node on every request; the node keeps only its hash. Kinds: **owner credential** (`own_…`, the desktop's: one per desktop per node, full authority), **phone credential** (`mra_…`, as today), **peer secret** (shared by two paired nodes; never sent, used to sign), **memory sync source credential** (`mhub_…`, as today). The MCP gateway token stays the tool endpoint's own setting.
- **Launch credential:** the owner credential the desktop app creates each time it starts its own node and hands it privately; never stored.
- **Setup code:** a one-time code, readable only on a node's own computer (or created by an owner desktop), that a desktop exchanges for an owner credential.
- **Peer invite code:** a one-time code a node's owner creates; another node exchanges it to pair as peers.
- **Network admission:** whether a node accepts a connection by where it arrived: this computer, its Tailscale address, an allowed local network, or a network listed in `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS`.
- **Client identity:** what the gate established for a request: `{ kind: "owner", credentialId }`, `{ kind: "phone", deviceId }`, `{ kind: "peer", nodeId }`, `{ kind: "memory_sync_source", sourceId }`.
- Changed: **Peer**: "a remote node paired with this node: both nodes hold the same peer secret and this node pinned the peer's node ID".

## Legacy Removal Policy (Mandatory)

- Obsolete paths: trusted-network authorization (`trustedNetworkContext`, `TRUSTED_NETWORK_*` route classes, `isAuthenticated`), the MCP gateway's loopback exemption, peer admission by body `fromNodeId`, adding a peer by URL alone (`addPeerNode`), per-request device file reads.
- Compatibility wrappers kept: `None`. Peers without a secret and nodes without the desktop's owner credential are refused until their one-time step (REQ-010), not served on the old rule.

## Persisted Data / State Transition Decision (Mandatory)

- Stored subjects: (a) `node-access/owner-credentials.json` (new: `[{ credentialId, credentialHash, desktopName, createdAt, lastSeenAt }]`); (b) `node-access/setup-code` (new, one line, file mode 0600, deleted on use); (c) `remote-collaboration/peers.json` gains optional `peerSecret` per peer (file mode 0600); (d) Electron: `node-credentials.json` in the app's user-data folder, encrypted with `safeStorage`, `{ [entryId]: { credentialId, credential } }`. Volumes: a few records.
- Reader behavior: `PeerStore` reads rows without `peerSecret` as unpaired peers (`paired: false`), which the gate refuses and the UI shows as "Pair again". `paired-devices.json` unchanged.
- Decision: `Directly Usable — No Migration`. All changes are additive; existing rows keep their meaning; no field changes meaning (Data Migration Guideline checklist: no version field; no reused names; tolerant reader projects the new optional field; historical data never blocks startup: a broken `owner-credentials.json` row is skipped with a warning naming it, rule 7).
- Rationale: nothing must be transformed; the secret cannot be invented for old peers (both sides must agree), so re-pairing is the only correct path.

## Data-Flow Spine Inventory

| Spine | Scope | Behaviors | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001, 002, 005, 007 | A request reaches the main port | Handler runs with a client identity, or a refusal | `NodeAccessGate` | The one rule for every endpoint |
| DS-002 | Primary | BEH-003, 006 | Desktop starts its own node | Every app-window request carries the launch credential | Electron `NodeCredentialAttacher` (main) | The desktop needs no step |
| DS-003 | Primary | BEH-003 | Owner enters a setup code for a node | Desktop holds an owner credential for that node | Electron `NodeConnectService` → node `SetupCodeExchange` | One-time step per remote node |
| DS-004 | Primary | BEH-004 | Owner pairs two nodes | Both hold one peer secret | `PeerPairingService` (each node) | Replaces add-on-both-sides |
| DS-005 | Return/Event | BEH-004 | A node calls its peer | Peer request authenticated | `PeerClient` signs → gate verifies | Peer requests prove the secret |
| DS-006 | Operational | BEH-002 | Launcher creates a Docker node | Port published on this computer (+ Tailscale) | Launcher `container-config` | Docker exposure |
| DS-007 | Bounded local | BEH-002 | Admission snapshot refresh | Current admitted arrival addresses | `NetworkAdmission` | Network changes (Wi-Fi switch) |

## Primary Execution Spine(s)

- DS-001: `Connection → Host rule → Origin rule → NetworkAdmission.admit(socket) → NodeCredentialResolver.identify(request) → RoutePermissions.allows(route, identity) → Handler (identity in request context)`
- DS-002: `Electron start → ServerManager creates launch credential → node process env AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL → launch-credential intake (first module app.ts imports) reads it and deletes it from process.env before any other module loads → OwnerCredentialService registers its hash (memory only) → NodeCredentialAttacher adds Authorization to defaultSession requests for the node's origin → DS-001`
- DS-003: `On the node's computer: launcher setup-code / node-access CLI → node local control socket → SetupCodeService.create (30 min, single use) → code printed there; then Nodes page "Connect" (setup code) → preload IPC → NodeConnectService (Electron main) → POST <node>/rest/node-access/setup-exchanges → SetupCodeService.exchange → OwnerCredentialService.issue → credential returned → NodeCredentialStore (safeStorage) → NodeCredentialAttacher`
- DS-004: `Peers UI "Pair" (desktop owns A and B) → A: createPeerInvite (owner route) → { nodeId, addressCandidates (A's own peerAddressCandidates), inviteCode } → B: acceptPeerInvite(invite, name) (owner route) → B PeerPairingService resolves A's candidates with PeerAddressResolver (pins A's node ID) → POST A /rest/remote/peer-pairing-exchanges {code, B nodeId, B name, B address candidates} → A PeerPairingService: check code, pin B by probing candidates, create secret, store peer B → answer {A nodeId, A name, secret} → B stores peer A`
- DS-005: `PeerClient.request → PeerRequestSigner adds X-AutoByteus-Peer-From / -To / -Timestamp / -Nonce / -Body-SHA256 / -Signature → peer's DS-001 → NodeCredentialResolver (peer verifier: to == own node ID, secret, window, not before process start, replay) → gate body integrity (preParsing hash, preValidation compare) → PeerGateway checks body fromNodeId == identity.nodeId`

## Spine Narratives (Mandatory)

| Spine | Narrative | Subject nodes | Owner | Off-spine |
| --- | --- | --- | --- | --- |
| DS-001 | After the existing Host and Origin rules, the gate first asks where the connection arrived; then it identifies the client from exactly one credential form (Bearer header, WebSocket `access_token` query for browsers, peer signature headers); then it checks the route family permits that kind. Exempt routes skip identification but not admission. A refusal answers 401/403 (WebSocket: close code) with one log line naming route, reason and client address, never a credential. | Connection, client identity, route permission | `NodeAccessGate` | Admission snapshot, verifiers, refusal logging |
| DS-002 | The desktop app creates a random launch credential before spawning its node, passes it in the child's environment, and from then on its main process adds it to requests that the app window's session sends to that node's origins (HTTP and WebSocket). The renderer and pages never see it; the in-app browser's partition gets nothing. | Launch credential | Electron main | — |
| DS-003 | A setup code is created on demand, whatever the node's owner state: on the node's own computer through the node's local control socket (Docker: `autobyteus-docker setup-code <node>`; a server install: the node-access CLI), or by an existing owner desktop. The owner enters it on the Nodes page; the desktop's main process exchanges it and stores the returned owner credential encrypted. | Setup code, owner credential | `SetupCodeService` (node), `NodeConnectService` (desktop) | Credential file store |
| DS-004 | When the desktop owns both nodes it runs both halves itself: it asks A for an invite `{ nodeId, addressCandidates, inviteCode }` and gives it to B. B resolves A's candidates with `PeerAddressResolver`, pins A's node ID and calls A's pairing exchange with its own candidates; A verifies the code, resolves and pins B the same way, creates the shared secret, stores B (or updates B's unpaired row), and answers; B stores A. One action registers both nodes. Nodes owned by different desktops: the invite is shown on A as one copyable text (`abpi_…`) and pasted on B (M-9). | Invite, peer secret | `PeerPairingService` | Address resolver, peer store |
| DS-005 | Every request from a node to its peer carries an HMAC-SHA256 signature over method, path with query, sender and receiver node IDs, timestamp, nonce and body hash. The receiving gate accepts it only as the named receiver, within ±300 s, not earlier than its own start, once per nonce; the gate itself checks the received body against the signed hash (preParsing/preValidation) before any handler runs (M-7). | Peer request | `PeerRequestSigner` / gate verifier and body integrity | Replay cache |

## Spine Actors / Main-Line Nodes

`NodeAccessGate`, `NetworkAdmission`, `NodeCredentialResolver`, `RoutePermissions`, `OwnerCredentialService`, `SetupCodeService`, `PeerPairingService`, `PeerRequestSigner`, Electron `NodeCredentialAttacher`, `NodeConnectService`, `NodeCredentialStore`.

## Ownership Map

- `NodeAccessGate` (`api/security/node-access-gate.ts`): sequencing of admission → identification → permission for HTTP and WebSocket; the refusal contract and log line. Replaces `RemoteAccessRoutePolicy`.
- `RoutePermissions` (`api/security/node-route-permissions.ts`): the table route family → permitted client kinds; deny by default (an unlisted route requires an owner or phone credential; phone WebSockets only on `PHONE_WEBSOCKET_ROUTES`).
- `NetworkAdmission` (`node-access/services/network-admission.ts`): the admitted-arrival snapshot from `NodeNetworkService` facts, allowed local networks and `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS`; refresh (DS-007).
- `NodeCredentialResolver` (`node-access/services/node-credential-resolver.ts`): reads the one credential form of a request and returns a `ClientIdentity` or a refusal, through one verifier per kind (strategy by prefix / peer headers).
- `OwnerCredentialService` (`node-access/services/owner-credential-service.ts`): the launch credential (memory), persistent owner credentials (issue, verify, list, revoke), last-seen throttling.
- `SetupCodeService` (`node-access/services/setup-code-service.ts`): creates setup codes on demand (local control socket, owner route; 30 min, single use, kept as hashes in memory, never written to a file or a log) and runs the single-use exchange (M-2).
- Phone verifier: `PairedDeviceService` keeps records in memory (loaded once, updated on its own writes), Phone Access switch and revocation as today.
- `PeerPairingService` (`remote-collaboration/settings/peer-pairing-service.ts`): invites, exchange (both sides), replaces `PeerDirectory.add`.
- `PeerRequestSigner` (`remote-collaboration/channel/peer-request-signature.ts`): sign and verify (one file, both directions).
- Electron: `NodeCredentialStore` (encrypted file), `NodeCredentialAttacher` (webRequest hook on `session.defaultSession`, origins from the node registry), `NodeConnectService` (exchange, disconnect).

## Thin Entry Facades / Public Wrappers

| Facade | Owner behind it | Why | Must not own |
| --- | --- | --- | --- |
| `remote-access-policy-plugin.ts` (kept, renamed `node-access-plugin.ts`) | `NodeAccessGate` | Fastify hook registration and CORS | Any decision |
| `api/rest/node-access.ts` | `SetupCodeService`, `OwnerCredentialService` | REST routes | Code generation |
| GraphQL peer mutations | `PeerPairingService` | Desktop UI calls | Pairing rules |

## Removal / Decommission Plan (Mandatory)

| Item | Why unnecessary | Replaced by | Notes |
| --- | --- | --- | --- |
| `trustedNetworkContext`, `TRUSTED_NETWORK_*` classes, `RemoteAccessAuthContext.isAuthenticated`, `RemoteAccessRoutePolicy` | No trusted network | `NodeAccessGate`, `ClientIdentity` | `REMOTE_ACCESS_AUTH_CONTEXT_PROPERTY` becomes the identity property |
| `RemoteAccessAuthService.authorizeMobileCredential` | One resolver | Phone verifier in `NodeCredentialResolver` | Phone codes kept (`PHONE_ACCESS_DISABLED`, `REMOTE_ACCESS_DEVICE_REVOKED`) |
| `McpGatewayAccessGate` loopback exemption | No loopback trust (DEC-007) | Token always | Panel copy updated |
| `PeerGateway` step 4 (body `fromNodeId` registered) | Identity from the gate | `fromNodeId === identity.nodeId` check | — |
| `PeerDirectory.add`, GraphQL `addPeerNode`, `AddPeerNodeInput`, the add-peer form posting a URL | Pairing replaces it | `PeerPairingService`, `createPeerInvite` / `acceptPeerInvite` | `changePeerAddress`, rename, remove stay |
| `shouldDeferToWebSocketHandler`, per-handler `authorizeRemoteAccessWebSocket` calls, `remote-access-websocket-auth.ts` | The hook decides every request (M-3) | `registerGatedWebSocketRoute` wrapper | — |
| `node-desktop-viewers.ts` periodic phone re-check | Open-socket registry closes revoked sockets (M-4) | `open-socket-registry.ts` | — |
| `LOCAL_DEV_ONLY` route class (loopback-only GraphQL GET) | No loopback trust (M-10d) | Owner credential | — |
| Per-request `paired-devices.json` read and `lastSeenAt` write | Cache | In-memory registry, last-seen ≤ 1/min | — |
| `docs/future-tickets/mobile-backend-authorization-hardening.md` items now done (credential required, revocation enforced on all routes) | Done | Doc updated; remaining items stay for slice 2 | — |

## Return Or Event Spine(s)

DS-005 (peer requests and the run-observation WebSocket from a node to its peer).

## Bounded Local / Internal Spines

- DS-007 in `NetworkAdmission`: `timer (30 s) or unknown client address (rate-limited, ≤ 1/5 s) → NodeNetworkService.getNodeNetwork() → snapshot { this computer's Tailscale addresses; local subnets (address/prefix) with network ID and allowed flag; configured client CIDRs; runsInContainer } → swap snapshot`. A request matches its client address (and, for Tailscale, its local address) against the snapshot only (no I/O; QR-002; rules in M-6).

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves | Responsibility | Why | Risk on main line |
| --- | --- | --- | --- | --- | --- |
| Refusal logging | DS-001 | Gate | One line: code, route (redacted URL), client address | Diagnose setups | Credential leak if built ad hoc |
| Replay cache | DS-005 | Peer verifier | Nonces for 600 s | Captured request replay | Unbounded memory: entries expire |
| Last-seen throttle | DS-001 | Owner/phone verifiers | Write ≤ 1/min per credential | Per-request file I/O | — |
| Credential file permissions | DS-003, DS-004 | Stores | Mode 0600 on credential files | Secrets on disk | — |

## Ownership Boundaries

- The gate is the only place that decides whether a request may run. Handlers read the identity; they never inspect `Authorization` or the address (exception: memory sync routes stop reading the bearer themselves and take the `memory_sync_source` identity).
- Remote collaboration owns peer secrets and signing; the gate calls its verifier through `NodeCredentialResolver`, never reads `peers.json`.
- Electron main owns desktop credentials; the renderer gets only states (`connected`, `needs connecting`) and actions through preload.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden bypass | Fix if too thin |
| --- | --- | --- | --- | --- |
| `NodeAccessGate` | admission, resolver, permissions, body integrity, open-socket registry | the plugin hook (every request, `/ws/*` included); `registerGatedWebSocketRoute`, the GraphQL subscription context and the run-observation route only deliver refusals or register sockets | A handler checking credentials itself | Add a permission row |
| `NodeCredentialResolver` | per-kind verifiers | gate | Gate calling `PairedDeviceService` directly | Add a verifier |
| `PeerPairingService` | invites, secrets, probe | GraphQL, remote routes | GraphQL writing `peers.json` | Extend the service |
| Electron `NodeConnectService` | exchange, store, attacher refresh | preload IPC | Renderer holding a credential | Extend IPC with states |

## Dependency Rules

- `api/security` → `node-access/services` → (`remote-access` phone verifier, `remote-collaboration` peer verifier, `memory-sync/hub` source verifier, `remote-access` `NodeNetworkService`). `node-access/domain` is a leaf every one of them may import (M-10e). The composition root wires the resolver. Capability areas never import `api/security` or `node-access/services`; they publish revocations the gate subscribes to (M-4).
- `remote-collaboration/channel/peer-client.ts` → `peer-request-signature.ts`; nothing else signs.
- Renderer → preload → Electron main; renderer never imports credential values. The phone keeps its own `authorizedTransport` seam (unchanged).

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity shape | Notes |
| --- | --- | --- | --- | --- |
| `POST /rest/node-access/setup-exchanges` (exempt) | Setup code | Exchange for an owner credential | `{ setupCode, desktopName }` → `{ credentialId, credential }` | 401 `NODE_SETUP_CODE_INVALID` |
| `POST /rest/node-access/setup-codes` (owner) | Setup code | Code for another desktop | → `{ setupCode, expiresAt }` (30 min) | — |
| `GET /rest/node-access/owner-credentials`, `DELETE …/:credentialId` (owner) | Owner credential | List, revoke | `credentialId` | Disconnect calls DELETE for its own |
| GraphQL `createPeerInvite` (owner) | Peer invite | Create | → `{ invite: { nodeId, addressCandidates, inviteCode }, expiresAt }` (10 min, single use; also as copyable `abpi_…` text) | On A (M-9) |
| GraphQL `acceptPeerInvite(invite, name)` (owner); invite = `{ nodeId, addressCandidates, inviteCode }` | Peer pairing | Run the exchange | → `PeerNode` | On B (M-9) |
| `POST /rest/remote/peer-pairing-exchanges` (exempt) | Peer pairing | A's side | `{ inviteCode, fromNodeId, fromName, addressCandidates[] }` → `{ nodeId, name, peerSecret }` | 401 `PEER_INVITE_INVALID` |
| Preload `nodeAccess.connect(entryId, setupCode)`, `nodeAccess.disconnect(entryId)`, `nodeAccess.states()` | Desktop node credentials | Connect, disconnect, states | `entryId` | No credential crosses IPC to the renderer |
| Local control socket `setup-code` (node's computer only) | Setup code | On-demand code | `"setup-code\n"` → `{ "setupCode", "expiresAt" }` | M-2 |
| `GET /rest/mcp-gateway/token`, `POST …/token/regenerate` (owner) | MCP gateway token | Show, regenerate | — | M-5 |
| Refusal | — | — | 401 `NODE_CREDENTIAL_REQUIRED` / `NODE_CREDENTIAL_INVALID`; 403 `NODE_NETWORK_REFUSED` / `NODE_ROUTE_NOT_PERMITTED`; WebSocket close 4401 / 4403 | C1 gets the 401 code (allowed by rule 9) |

## Interface Boundary Check

| Interface | Singular | Explicit identity | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| setup exchange / codes / owner credentials | Yes | Yes | Low | — |
| peer invite / accept / exchange | Yes | Yes | Low | — |
| `ClientIdentity` | Yes | Yes (kind-tagged union) | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Same everywhere | Drift | Action |
| --- | --- | --- | --- | --- | --- |
| Client secret | credential (+ kind) | Yes | Yes (glossary already uses it for phones) | "key" in user talk | UI says "setup code", "pair"; no "key" in code |
| Desktop's credential | owner credential / launch credential | Yes | New | — | Glossary |
| Peer relationship | peer, peer secret, pair | Yes | Changes "Peer" definition | — | Glossary update |
| Arrival check | network admission | Yes | New | vs "allowed host"/"allowed origin" | Glossary entry beside them |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Network facts | `NodeNetworkService` | Reuse | Already classifies Tailscale, VPN, local, allowed |
| Random codes, hashing, constant-time compare | `paired-device-service.ts`, `remote-access-pairing-service.ts` | Extend into a shared `node-access/domain/credential-secret.ts` | Same primitives for four kinds |
| Address pinning for peers | `addresses.resolve(nodeId, baseUrls)`, `PeerClient.fetchNodeId` | Reuse | Same probe |
| Request header rewriting in Electron | `browser-session-profile.ts` pattern | Reuse pattern | Proven (PROBE-03) |
| Settings for allowed names | `AUTOBYTEUS_ALLOWED_HOSTS` / `_ORIGINS` (`node-browser-access.ts`) | Extend with `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS` | Same family, same reader |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `api/security` | gate, permissions, plugin | DS-001 | Extend (replace route policy) |
| `node-access` (new) | owner credentials, setup codes, admission, resolver, identity | DS-001…003, DS-007 | Create new: no existing area owns node-wide credentials; `remote-access` stays the phone feature |
| `remote-access` | phone pairing, phone verifier, network facts | DS-001 | Extend |
| `remote-collaboration` | peer pairing, signing | DS-004, DS-005 | Extend |
| `memory-sync/hub` | source verifier | DS-001 | Extend |
| `mcp-gateway` | its gate | DS-001 | Modify |
| Electron main | desktop credentials | DS-002, DS-003 | Extend |
| Launcher scripts | publishing, `setup-code` | DS-006 | Modify |

## Final File Responsibility Mapping

| File | Area | Concern |
| --- | --- | --- |
| `autobyteus-server-ts/src/api/security/node-access-gate.ts` (new; replaces `remote-access-route-policy.ts`) | api/security | Sequence, refusals, WebSocket authorization |
| `src/api/security/node-route-permissions.ts` (new; from `classifyHttpRoute` + `PHONE_WEBSOCKET_ROUTES`) | api/security | Route family → permitted kinds |
| `src/api/security/node-access-plugin.ts` (renamed from `remote-access-policy-plugin.ts`) | api/security | Hook + CORS |
| `src/node-access/domain/client-identity.ts` | node-access | `ClientIdentity` union |
| `src/node-access/domain/credential-secret.ts` | node-access | generate, hash, constant-time compare (moved from remote-access) |
| `src/node-access/services/node-credential-resolver.ts` | node-access | Credential form → identity via verifiers |
| `src/node-access/services/owner-credential-service.ts`, `stores/owner-credential-store.ts` | node-access | Owner credentials |
| `src/node-access/services/setup-code-service.ts` | node-access | Setup codes |
| `src/node-access/services/network-admission.ts` | node-access | Admission snapshot |
| `src/api/rest/node-access.ts` | api/rest | Setup exchange, codes, owner credentials |
| `src/remote-access/services/paired-device-service.ts` | remote-access | In-memory registry, throttled last-seen |
| `src/remote-collaboration/settings/peer-pairing-service.ts` (new), `peer-store.ts` (+`peerSecret`), `peer-directory.ts` (−`add`) | remote-collaboration | Pairing, store |
| `src/remote-collaboration/channel/peer-request-signature.ts` (new), `peer-client.ts`, `peer-gateway.ts`, `api/rest/remote.ts` (exchange route only; no security check) | remote-collaboration | Signing, verification |
| `src/api/graphql/types/remote-collaboration-settings.ts` | api/graphql | invite/accept mutations; `PeerNodeGql.paired` |
| `src/memory-sync/hub/*`, `api/rest/memory-sync.ts` | memory-sync | Verifier; routes read identity |
| `src/mcp-gateway/mcp-gateway-access.ts`, `mcp-gateway-routes.ts`, `mcp-gateway-token-service.ts` (new), `api/rest/mcp-gateway-token.ts` (new) | mcp-gateway | Token always + admission; token creation, storage, owner read/regenerate |
| `autobyteus-web/electron/nodeAccess/nodeCredentialStore.ts`, `nodeCredentialAttacher.ts`, `nodeConnectService.ts`, `nodeAccessIpc.ts` (new); `server/*ServerManager.ts` (launch credential env); `preload.ts`; `nodeAutoUpdate/nodeUpdateClient.ts` (Modify: adds the node's owner credential from the store; Node's global `fetch` is not a session request) | Electron | Desktop credentials |
| `autobyteus-web/components/settings/nodes/*`, `stores/nodeStore.ts`, `stores/remoteCollaborationStore.ts`, peers UI, Phone Setup copy, `components/tools/McpGatewayPanel.vue` copy, localization | web | States, connect, pair, copy |
| `scripts/public/docker/autobyteus-docker.d/bash/container-config.sh`, `commands.sh`, PowerShell equivalents | launcher | Publishing, `setup-code` |
| `scripts/development/development-runtime.mjs`, `autobyteus-web/nuxt.config.ts` (proxy header) | dev | Dev launch credential |
| `autobyteus-server-ts/tests/e2e/helpers/studio-runtime-test-server.ts` and probes | tests | Credentials in harnesses |
| `src/node-access/launch-credential-intake.ts` (new; first import of `src/app.ts`) | node-access | Read and delete the launch credential before anything loads (M-1) |
| `src/node-access/services/local-control-socket.ts` (new), `src/node-access-cli.ts` (new, built to `dist/node-access-cli.js`) | node-access | Local `setup-code` socket and its CLI client (M-2) |
| `src/api/security/open-socket-registry.ts` (new); `src/api/websocket/index.ts` (`registerGatedWebSocketRoute`) | api/security, api/websocket | Open sockets by identity; refusal delivery (M-3, M-4) |
| `src/remote-access/services/network-interface-classifier.ts` (keep `cidr`), `domain/models.ts` | remote-access | Local subnets for admission (M-6) |
| `src/node-desktop/node-desktop-viewers.ts` | node-desktop | Remove the phone re-check (M-4) |
| `autobyteus-web/docs/tools_and_mcp.md` | docs | The panel shows the token (M-5) |

## Applied Patterns

- Strategy (credential verifiers by kind) inside `NodeCredentialResolver`.
- Repository (`OwnerCredentialStore`, `PeerStore`).

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Identity | `const identity = getClientIdentity(request); if (identity.kind !== "peer") …` set by the gate | A handler reading `Authorization` | One owner |
| Peer signature | `sig = HMAC(secret, "POST\n/rest/remote/messages\n<fromNodeId>\n<toNodeId>\n1762600000\n<nonce>\n<sha256(body)>")` | Sending the secret as a bearer; a signature without sender and receiver | Sniffed requests reveal no secret and cannot be reflected |
| Desktop | Main process adds `Authorization: Bearer own_…` for `http://127.0.0.1:29695/*`, `ws://127.0.0.1:29695/*` | Renderer reading a credential from preload | Pages and agents never see it |
| Refusal | 401 `{ code: "NODE_CREDENTIAL_REQUIRED", message: "This node needs a credential. Connect it on the Nodes page." }` | Generic 500 | Client shows the message |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why considered | Decision | Replacement |
| --- | --- | --- | --- |
| Accept requests without a credential during a grace period | Smooth upgrade | Rejected | "Needs connecting" states (REQ-010) |
| Keep URL-only peers working | Avoid re-pairing | Rejected | Pair again |
| Loopback trust | Local tools | Rejected (Tailscale Serve) | Launch credential, tokens |
| Old desktop vs new node | Version mismatch | N/A (rule 9) | — |

## Change / Refactor Sequence

1. Server: launch-credential intake (M-1) and `node-access` domain and services; resolver with owner, phone, memory verifiers; gate + permissions replacing the route policy; refusal codes; in-memory phone registry. Turn PROBE-01 (436) into failing e2e cases first (AC-001).
2. Electron: launch credential, attacher (embedded node), dev runtime and Vite proxy; server e2e helper credentials. The desktop works against its own node.
3. Setup codes through the local control socket and the owner route (M-2), owner credentials; the hook deciding `/ws/*` and the open-socket registry (M-3, M-4); Nodes page connect/disconnect and the network-refused state (M-8b); credential store; C1 calls covered.
4. Peer pairing with invites carrying address candidates (M-9) and signing with sender/receiver binding and gate body integrity (M-7); peers UI; GraphQL changes; remote collaboration e2e (two nodes).
5. Network admission on the client address (M-6) and `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS`; MCP gateway token service, owner routes and panel (M-5).
6. Launcher: publishing, `setup-code` (recreate on config change, then the local socket; M-2, M-8a), install output; Docker probe.
7. Phone shell probe under enforcement (UNK-004), fix missing credential paths.
8. Remove obsolete items (Removal plan); docs, glossary, TESTING.md, release-note "What you need to do".

## Key Tradeoffs

- Peer secrets are stored in plain form (mode 0600) because signing needs them; in exchange the secret never travels after pairing.
- Admission by arrival address cannot apply inside a container (PROBE-02); Docker exposure is the launcher's published addresses.
- The desktop pairs its own nodes automatically (both halves); a manual code is only needed between desktops.
- Applications in the app window get the owner's authority, as today; narrowing is slice 2.

## Risks

- RSK-001: a client path that never sent a credential (phone or web) breaks (UNK-004); mitigated by running every probe under enforcement.
- RSK-002: Docker Desktop publishing on the host's Tailscale address (UNK-006); fallback: Tailscale Serve to `127.0.0.1:<port>`, shown in Phone Setup.
- RSK-003: users of the VPN or company-proxy ways need `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS` (release note).
- RSK-004: losing the desktop's encrypted credential file means connecting nodes again with a setup code from each node's computer (M-2); acceptable.
- RSK-005: a local network that itself uses `100.64.0.0/10` addresses (M-6); bounded by the local-address condition and NA-1.
- RSK-006: Linux Docker hosts not measured (`host.docker.internal`, publishing); covered by the Docker probe on the release runner's platform where possible.

## Guidance For Implementation

- Reproduction to start from: autobyteus-436 `probes/abx436-phone-file-reach.probe.e2e.test.ts` (copy into `autobyteus-server-ts/tests/e2e/remote-access/`): P1–P3 must become refusals; P4 stays 400 with an owner credential.
- Electron main-process `fetch` (node update, connect) is not a renderer request: add the credential explicitly in `NodeConnectService`/`nodeUpdateClient` through the credential store, not through the attacher.
- WebSocket from the phone keeps `access_token`; desktop WebSockets rely on the attacher (PROBE-03); dev WebSockets go through the Vite proxy with the header.
- Never log a credential, setup code, invite code, gateway token or secret (QR-001); refusal lines carry codes only. No setup code is ever written to a file or a log (Round 2, AR-002/AR-010c).
- Tests on isolated nodes and test-owned containers only (TESTING.md).
- Verification follows the contract: one server e2e suite `autobyteus-server-ts/tests/e2e/node-access/node-access-model.e2e.test.ts` with one test per server-checkable scenario, named by its ID (`NAS-11 …`); the Electron probe covers NAS-01, NAS-16, NAS-17, NAS-18, NAS-30; the Docker probe NAS-02, NAS-03, NAS-27; the phone shell probe NAS-05…NAS-10; two-node e2e NAS-19…NAS-24, NAS-36, NAS-38; server e2e also NAS-31 (a spawned child's environment), NAS-37 (sockets closed on revocation); the Docker probe also NAS-32…NAS-34; the Electron probe NAS-35 (a non-container node refusing the desktop's network). Every scenario ID appears in at least one test name; a check (`grep` of NAS IDs in tests against the contract table) is part of the suite.
