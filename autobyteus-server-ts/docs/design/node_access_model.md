# Node Access Model

The canonical model for who may reach an AutoByteus node and what proves it:
which networks a node accepts connections from, which credentials each kind of
client holds and how it gets them, which client kinds may use which endpoints,
and how every refusal looks. Read it before designing or reviewing any change
to a node's routes, WebSockets, request gate, pairing (phones, desktops, peers),
the desktop app's connection to nodes, the Docker launcher's published ports,
or any new client of a node.

This document holds the model, its reasons and the scenarios it must satisfy.
The module docs hold the mechanics and link here. Where the code does not yet
match the model, the gap is listed in
[Current State Versus Target](#5-current-state-versus-target). Every scenario in
[section 4](#4-scenario-contract) has a test that names its ID.

## 1. Vocabulary

Defined in the project [Glossary](../../../GLOSSARY.md#nodes): **node**, **node
ID**, **peer**, **client address**, **allowed host**, **allowed origin**,
**allowed local network**, **way to connect**, and the words below, which this
model introduces.

- **Credential**: the secret a client presents to a node; the node keeps only
  its hash (a peer proves itself with a signature instead, NA-9). One word for every kind; the
  UI says "setup code" and "pair", never a second word for the same thing.
- **Credential kinds**:
  - **Owner credential** (`own_…`): a desktop's, one per desktop per node; full
    authority over the node. The **launch credential** is the owner credential
    the desktop app creates each time it starts its own node; it is never
    stored.
  - **Phone credential** (`mra_…`): a paired phone's.
  - **Node key** (autobyteus-661): each node's own Ed25519 key pair
    (`<data>/remote-collaboration/node-key.pem`, mode 0600); its private half
    never leaves the node and signs each request to a peer; a peer keeps its
    public half.
  - **Memory sync source credential** (`mhub_…`): a memory sync source's.
- **Setup code**: a one-time code a desktop exchanges for an owner credential.
  It is readable only on the node's own computer, or created by a desktop that
  is already an owner.
- **Pairing grant** (autobyteus-661): a one-time grant a node's owner makes
  for one pair from one node the same app controls (`forNodeId`; 10 minutes, in
  memory). A pair without a grant waits for the owner's Accept.
- **Network admission**: whether a node accepts a connection, by where it
  arrived (NA-3).
- **Client identity**: what the gate established for a request: owner
  (credential ID), phone (device ID), peer (node ID) or memory sync source
  (credential ID; the hub binds a credential to its source on the first batch).
- **Exempt endpoint**: an endpoint a client needs before it can hold a
  credential (NA-6).

## 2. The Gate: Five Checks, In Order

Every HTTP request and WebSocket upgrade to a node's main port meets one gate.
Each check runs only if the one before it passed; the first refusal ends the
request before any handler runs.

| Order | Check | Question | Refusal |
| --- | --- | --- | --- |
| 1 | Host rule | Is the request addressed to one of this node's names? | 403 `REMOTE_ACCESS_HOST_REFUSED` |
| 2 | Origin rule | If a browser sent it, is the page's origin allowed? | 403 `REMOTE_ACCESS_ORIGIN_REFUSED` |
| 3 | Network admission | Did the connection arrive from an accepted network? | 403 `NODE_NETWORK_REFUSED` |
| 4 | Credential | Does it carry a valid credential, and of which client? | 401 `NODE_CREDENTIAL_REQUIRED` / `NODE_CREDENTIAL_INVALID`; phone-specific 403 codes as before |
| 5 | Route permission | May this kind of client use this endpoint? | 403 `NODE_ROUTE_NOT_PERMITTED`; a phone on another WebSocket: `PHONE_ACCESS_ROUTE_REFUSED` |

The gate decides every request, WebSocket upgrades included. A refused upgrade is answered with its HTTP status and never upgraded, except on the node's gated `/ws/*` routes, where it is accepted and closed with 4401 (credential) or 4403 (the others) before any handler runs, so the client can tell the reason. The
MCP gateway (`/mcp/gateway`) is a tool endpoint with its own token; it applies
checks 1–3 the same way and its token as check 4 (NA-12).

## 3. Rules

| Rule | Statement | Why |
| --- | --- | --- |
| NA-1 | **No credential, no access.** Every endpoint of a node's main port needs a valid credential, whatever network the request came from, this computer included. Only the exempt endpoints (NA-6) answer without one. | A network is not proof of who is calling: anyone on the same Wi-Fi, any program on the computer, and anything forwarded by Tailscale Serve (which arrives from this computer) would otherwise be trusted. |
| NA-2 | **Deny by default.** An endpoint added later needs a credential without anyone listing it; it is open to owners and phones until a permission row says otherwise. A new WebSocket is closed to phones until it is added to the phone WebSocket routes. | Security must not depend on remembering to protect a new route. |
| NA-3 | **Network admission comes first, by the client address.** A node that sees real client addresses (not in a container) accepts a connection whose client address is: this computer (`127.0.0.0/8`, `::1`); a Tailscale address (`100.64.0.0/10`, `fd7a:115c:a1e0::/48`) arriving on one of this computer's Tailscale addresses; inside the subnet of the local network this computer is on, only while the owner allowed that network (allowed local network); or inside a network listed in `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS`. The destination address alone never admits (the operating system accepts a packet for any of its addresses on any interface). Everything else is refused, the exempt endpoints included. Admission is never a substitute for a credential (NA-1). | A phone's credential travels unencrypted over plain `http://` on Wi-Fi; refusing networks the owner did not allow (a café, a hotel) means it is never sent there, and strangers cannot even probe the node. Tailscale is encrypted and only the owner's devices reach it. |
| NA-4 | **A node in a container is limited by where its port is published.** Inside a container the arrival address cannot tell this computer from the local network, so admission accepts every arrival and the launcher publishes the port on this computer and, when present, the computer's Tailscale address; `--allow-local-network` publishes it on every address. | Measured: a container sees host and LAN requests from the same address. |
| NA-5 | **Each client kind gets its credential one way.** The desktop app's own node: a launch credential, created at each start and handed to the node privately. Another node (Docker, remote): an owner credential, once, for a setup code. A setup code is created on demand, whatever the node's owners: on the node's own computer through its local control socket (`<data dir>/node-access/local-control.sock`, mode 0600; Windows: a current-user named pipe), which `autobyteus-docker setup-code <node>` and the node-access CLI use, or by an existing owner desktop. A phone: by pairing (QR). A peer: by pairing (a grant from its owner, or the owner's Accept; autobyteus-661). A memory sync source: from the hub node's owner. | Each path is one step the owner takes once (or none); no credential is guessed or taken over by whoever comes first. |
| NA-6 | **Exempt endpoints** are only those a client needs before it holds a credential: `GET /rest/health`, `GET /rest/remote-access/status` (no secret), the phone page `/mobile` and its assets, the two exchanges (`POST /rest/remote-access/pairing-exchanges`, `POST /rest/node-access/setup-exchanges`), the pairing messages `POST /rest/remote/pair`, `/rest/remote/pair-accepted` and `/rest/remote/pair-rejected` (autobyteus-661, listed before the peer routes), and CORS preflights. Each exchange accepts a valid, unused, unexpired code only; `pair` pairs only with a valid grant and otherwise waits for the owner's Accept; `pair-accepted` and `pair-rejected` are taken only for a request this node sent. Because `pair` is exempt, the asker's offered addresses are bounded: at most 8 are asked, at once, each within 5 s, all on the fixed identity route `GET /rest/remote-access/status`, and only the node ID in the answer is compared (autobyteus-661 CR-002 residual). | Without them no client could ever get a credential. |
| NA-7 | **Route permissions by client kind.** Owner: every endpoint except the peer routes (`/rest/remote/*`) and the memory sync hub routes, which only peers and memory sync sources use. Phone: what owners reach except owner actions (settings, pairing and devices, node update, owner credentials, peers and pairing, extensions) and except WebSockets outside the phone WebSocket routes. Peer: only `/rest/remote/*`. Memory sync source: only the memory sync hub routes. What a phone may do inside the endpoints it reaches is narrowed in a later model revision (slice 2). | Each kind reaches what it is for; owner actions stay with owners. |
| NA-8 | **Credentials never leave their owner.** Not in URLs (except the browser WebSocket `access_token`, which the phone needs), never in logs, errors, page code or agent context. The desktop app keeps its credentials in its main process, encrypted at rest, and attaches them to the app window's requests itself; the in-app browser and the agents' browser get none. The phone's credential is kept by the node's own `/mobile` page (its storage in the app's WebView, or the browser) and sent as `Authorization: Bearer`. In the phone apps the page hands it to the app's media player for one playback over the shell bridge, which only the node's origin and main frame have (`playMedia`, autobyteus-574, autobyteus-642): the app keeps it in memory until the player closes, sends it only as that header to a file route of the same node's origin, follows no redirect, and never logs, stores or passes it in an Intent or URL. | A credential that a page, a log or an agent can read is no longer secret. |
| NA-9 | **Peers sign, they do not send.** Two nodes pair once and each keeps the other's public node key (autobyteus-661); every request between them carries an Ed25519 signature with the sender's node key over the sender's and the receiver's node IDs, the timestamp (ms), a nonce, the method, the node route with its query (the path the receiving node sees: without a gateway's base path, such as `/autobyteus` in `https://gateway.example.com/autobyteus`) and the body's hash. A pair never replaces a key this node holds: a pair request for a peer with another key is refused, with or without a grant (Unpair first; the same key pairs again). A node accepts a request only when the sender's record has a key, it is the receiver, within ±300 s, not earlier than its own start, once per nonce, and, over the private network, from the paired machine; the gate checks the received body against the signed hash before any handler runs. A node ID alone proves nothing. The peer gateway checks that the request's `fromNodeId` is the authenticated peer. | A captured request reveals no secret and cannot be replayed; node IDs are public; a key stolen from one machine does not work from another over the private network. |
| NA-10 | **Secrets are random and stored safely.** Credentials and codes: at least 32 (codes 18) random bytes; nodes store hashes and compare in constant time; node keys and the MCP gateway token (which its owner must be able to copy) are stored with mode 0600; setup codes exist only as hashes in the node's memory; the desktop encrypts its store with the OS keychain. Codes are single-use: pairing codes 5 minutes, pairing grants 10 minutes, setup codes 30 minutes. A setup code is never written to a file or a log; it is shown only where it was asked for. | Guessing must be infeasible and a copied disk file must not be a credential. |
| NA-11 | **Every credential can be revoked from the owner's desktop.** Phones (Phone Setup), owner credentials (a node's connected desktops; "Disconnect" revokes the desktop's own), peers (Unpair forgets the peer's key on this node and tells the peer). A revoked credential is refused on the next request, and every open WebSocket of that client is closed at once (4403 with the revocation code): the gate keeps open sockets by client identity, and each credential's owner tells it when it revokes. A client does not reconnect a socket closed for a refused credential (4401, or 4403 with a revocation code; autobyteus-435). | Losing a device must not mean losing the node. |
| NA-12 | **Tool endpoints use their own credential the same way.** The MCP gateway needs its token from every client, this computer included. The token is the node setting `AUTOBYTEUS_MCP_GATEWAY_TOKEN` when set; otherwise the node creates one (`mcpg_…`) and keeps it for its owner, who sees it in the MCP gateway panel and can regenerate it. | Same reason as NA-1. |
| NA-13 | **One refusal shape.** HTTP: status and `{ code, message }`; WebSocket: close code and the code as reason. One log line per refusal with the code, the route (credentials redacted) and the client address. A client shows the message of a code it does not know. | Setups can be diagnosed without exposing secrets. |
| NA-14 | **Upgrades never fall back to the old rule.** After an update the desktop's own node and paired phones work with no step; every other node shows "Needs connecting" and every peer without a node key "Pair again" until the owner's one-time step. Nothing is served without a credential in the meantime. | A grace period would be the hole this model closes. |
| NA-15 | **The launch credential reaches no other program.** The desktop app hands it to its node in the node process's environment only; the node removes it from its environment before any other code loads, so agent runtimes, terminal shells, application workers and every other program the node starts never see it. | A credential an agent can read with `env` would give every agent owner authority. |

## 4. Scenario Contract

Each row is one supported scenario or one attack the model must stop. Tests
name the scenario ID. "Owner" is the user on his desktop app.

| ID | Who / where | Credential | Request | Expected |
| --- | --- | --- | --- | --- |
| NAS-01 | Desktop app, its own node, this computer | Launch credential (attached by the app) | Any screen: runs, files, HTML preview, applications, terminal, node desktop | Works; no step |
| NAS-02 | Desktop app, a Docker node on this computer, not yet connected | None | Any | 401 `NODE_CREDENTIAL_REQUIRED`; Nodes page shows "Needs connecting" |
| NAS-03 | Owner connects that Docker node | Setup code from `autobyteus-docker setup-code <node>` | Setup exchange, then any | Owner credential issued; everything works, node update included |
| NAS-04 | Second desktop connects a node | Setup code created by an existing owner desktop | Setup exchange | Owner credential issued for that desktop |
| NAS-05 | Phone over Tailscale (tailnet address or Tailscale Serve) | Phone credential | Phone screens | Works |
| NAS-06 | Phone on home Wi-Fi the owner allowed | Phone credential | Phone screens | Works |
| NAS-07 | Phone on a café Wi-Fi (not allowed) | Phone credential | Any | 403 `NODE_NETWORK_REFUSED`; the credential is never checked |
| NAS-08 | Phone | Phone credential | An owner action (settings, pairing, node update, peers) | 403 `NODE_ROUTE_NOT_PERMITTED` |
| NAS-09 | Phone | Phone credential | Terminal WebSocket | Refused `PHONE_ACCESS_ROUTE_REFUSED` |
| NAS-10 | Revoked phone | Revoked phone credential | Any, including an open WebSocket | 403 `REMOTE_ACCESS_DEVICE_REVOKED`; WebSocket closed |
| NAS-11 | Stranger on a café Wi-Fi | None | Any endpoint, exempt ones included | 403 `NODE_NETWORK_REFUSED` |
| NAS-12 | Stranger on the owner's allowed home Wi-Fi | None or a made-up credential | GraphQL, a workspace file, `/ws/terminal`, `createWorkspace` | 401; nothing runs |
| NAS-13 | Stranger on the allowed Wi-Fi | Guessed codes | Pairing and setup exchanges | 401; codes are single-use and expire (NA-10) |
| NAS-14 | Any program on this computer, or a tailnet device through Tailscale Serve | None | Any non-exempt endpoint | 401 |
| NAS-15 | A web page in a browser on this computer | Whatever the browser sends | Any | 403 `REMOTE_ACCESS_ORIGIN_REFUSED` (Origin rule) |
| NAS-16 | A page in the in-app browser or an agent's browser | None (no credential is attached there) | A node URL | 401 |
| NAS-17 | HTML file previewed in the app window | Its scripts run in an opaque origin (`sendUserFile`) | A request to the node | 403 `REMOTE_ACCESS_ORIGIN_REFUSED` |
| NAS-18 | Installed application in the app window | Owner (attached by the app) | Its backend and node APIs | Works, with owner authority (narrowed in slice 2) |
| NAS-19 | Two nodes the desktop owns | Owner credentials on both | "Pair" | One action pairs both; each holds the other's public node key |
| NAS-20 | Paired peer | Signature with its node key | Delegation, messages, run observation | Works in both directions |
| NAS-21 | Anyone claiming a peer's node ID | No or wrong signature | `/rest/remote/*` | 401 |
| NAS-22 | Replay of a captured peer request | The captured signature | Same request again, or after 300 s | 401 |
| NAS-23 | Peer paired before node keys | No node key on record | `/rest/remote/*` | 401; UI shows "Pair again" |
| NAS-24 | Peer | Peer signature | An endpoint outside `/rest/remote/*` | 403 `NODE_ROUTE_NOT_PERMITTED` |
| NAS-25 | MCP client on this computer | Gateway token | `/mcp/gateway` | Works; without the token: 401 |
| NAS-26 | Memory sync source | `mhub_` credential | Memory sync hub routes | Works; elsewhere: 403 |
| NAS-27 | Docker node published on this computer (and Tailscale) | — | A request from the local Wi-Fi | Connection refused by the host |
| NAS-28 | Phone over a company VPN or proxy network | Phone credential | Any | 403 until the network is listed in `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS`; then works |
| NAS-29 | Any refusal | — | — | One log line with code, redacted route, client address; no credential, code or secret in any log |
| NAS-30 | Desktop updated, nodes and peers not yet connected or paired | — | Any | NAS-01 and phones work; others "Needs connecting" / "Pair again"; nothing served without a credential |
| NAS-31 | An agent's terminal or runtime on the desktop's own node | — | `env` / reading its environment | No credential of any kind is present |
| NAS-32 | Owner lost the desktop's credential store (reinstall) | Setup code from `autobyteus-docker setup-code <node>` (or the CLI) on the node's computer | Setup exchange | Connected again; the node still has owners from before |
| NAS-33 | The only owner pressed "Disconnect" | Setup code as in NAS-32 | Setup exchange | Connected again |
| NAS-34 | Docker node created before this model, after an in-place update | — | A request from the local Wi-Fi | Answered only by exempt endpoints (NA-1) until `autobyteus-docker setup-code <node>`, `start` or `upgrade` recreates the container; then refused by the host (NAS-27) |
| NAS-35 | Desktop reaching a server node on another computer over a local network, after the update | — | Any | 403 `NODE_NETWORK_REFUSED`; Nodes page explains: use its Tailscale address, or list the network in `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS` there; then NAS-02/NAS-03 |
| NAS-36 | A captured request from node A to node B, presented to node A | The captured signature | Same request | 401 (the receiver in the signature is B) |
| NAS-37 | Owner disconnects a desktop, removes a peer, or revokes a phone while it has open WebSockets | — | — | Those sockets close at once with 4403 and the revocation code |
| NAS-38 | Peer request whose body was changed in transit | Valid signature of the original body | `/rest/remote/*` POST | 401 before any handler runs |
| NAS-39 | Phone (or owner) taps a file path outside the run's folder | Phone credential | `GET /rest/node-files/content?path=<absolute>` | The file, read-only, with the user-file headers; a folder or relative path 400, a missing file 404 (autobyteus-436) |
| NAS-40 | Peer or memory sync source | Its credential | `GET /rest/node-files/content` | 403 `NODE_ROUTE_NOT_PERMITTED` |
| NAS-41 | Paired peer that delegated a run to this node | Peer signature | `POST /rest/remote/delegated-run-states` (a run's delegation state, autobyteus-591) | Works for the runs its own delegations started: closed records and stops the run, open lists it again; another peer's run `REMOTE_TARGET_NOT_PERMITTED`, no such run `REMOTE_TARGET_NOT_FOUND`; unpaired 401 |
| NAS-42 | Desktop app, a window of any node | Owner credential (launch or issued) | Extensions: GraphQL `extensions`, `extensionLog`, the lifecycle mutations; `POST /rest/extensions/:id/actions/:action`; `GET /rest/extensions/:id/ui/*` (autobyteus-516) | Works |
| NAS-43 | Phone, or no credential | Phone credential or none | The same extension endpoints | Phone: the GraphQL resolvers refuse with `NODE_ROUTE_NOT_PERMITTED`, the REST routes are owner actions (403 `NODE_ROUTE_NOT_PERMITTED`). No credential: 401 everywhere |
| NAS-44 | Paired peer relayed through this node (a sandbox, or a node its owner set up; autobyteus-581) | Peer signature over the call and its body | `/rest/remote/provider-relays/<relay>/<kind><provider path>` (any method, raw body up to 32 MiB) | The provider call with this node's credential of the declared kind; every reply marked `x-autobyteus-relay-reply`; a login-token call while this node's login-token setting is off `RELAY_LOGIN_TOKENS_OFF`; a path outside the relay's list `PATH_NOT_ALLOWED`; one provider relay activity line each |
| NAS-45 | A node not paired with this one, or a removed peer, or another node's key | Its signature | `/rest/remote/provider-relays/*` | 401 before the handler (the relayed node shows `RELAY_PEER_NOT_ACCEPTED`); no provider call, no activity line |
| NAS-46 | A sandbox this node created (`sandbox: true` in its peer record) | Peer signature | Any `/rest/remote/*` route | As any paired peer (DEC-111): the mark only labels the peer and lets this node's start remove it |
| NAS-47 | A caller over the private network with a peer's key but on another machine (autobyteus-661) | Valid signature | `/rest/remote/*` | 401: the caller must be the record's machine; a peer paired by plain address is not taken from the private network either |
| NAS-48 | A node the same app controls | A pairing grant made by this node's owner | `POST /rest/remote/pair` with the grant | Paired at once (relation from the grant); a used, expired, unknown or other-machine grant 403 `PAIRING_GRANT_INVALID`, nothing stored |
| NAS-49 | Any node, without a grant | None | `POST /rest/remote/pair` with a request ID | 202, waits for this node's owner (at most 20, one per node); nothing stored until Accept |
| NAS-50 | Anyone | None | `POST /rest/remote/pair-accepted` or `/pair-rejected` for a request this node did not send, or withdrew | 403 `PAIR_REQUEST_NOT_FOUND`, nothing stored |
| NAS-51 | A forged acceptance naming this node's request | Its own node key | `POST /rest/remote/pair-accepted` | This node confirms with a signed `pair-confirm` at the address it asked; that node refuses it, so 403 `PAIR_NOT_CONFIRMED` and nothing stored |
| NAS-52 | Paired peer | Peer signature | `POST /rest/remote/unpaired` | This node removes its record of the caller; its open sockets close (NA-11) |
| NAS-53 | Anyone claiming a paired peer's node ID with another node key | Its own node key, with or without a grant | `POST /rest/remote/pair` | 409 `PEER_KEY_CONFLICT` ("Unpair it first"); no pending request, the peer's key unchanged; a grant also works only for the node it names (`forNodeId`), otherwise 403 `PAIRING_GRANT_INVALID` (CR-001) |
| NAS-54 | The node's owner (the desktop's proxy), a phone, or no credential (autobyteus-661) | Owner credential | `GET /rest/private-network/relay` | The owner gets the network relay's port and its per-start credential (`no-store`); a phone 403, no credential 401; without Private Network 409 `PRIVATE_NETWORK_NOT_SET_UP`; an extension that cannot answer 502 with its reason |

Out of the model: protection against software already running as the user on
the same computer (it can read the user's files directly), and what each
credential may do inside the endpoints it reaches (slice 2).

## 5. Current State Versus Target

Status as of autobyteus-437 slice 1 (implementation). Update this table when a change lands.

| Item | Status | Notes |
| --- | --- | --- |
| NA-1, NA-2, NA-6, NA-7, NA-13, NA-14 | **Holds** (slice 1) | The gate (`src/api/security/node-access-gate.ts`) decides every request after the Host and Origin rules; route permissions in `node-route-permissions.ts`; refusal codes in `src/node-access/domain/node-access-refusal.ts`. A credential that cannot be checked while its data waits for a migration is answered 503 with that subsystem's code (`NODE_IDENTITY_NOT_MIGRATED`, `MEMORY_SYNC_NOT_MIGRATED`). |
| NA-3 | **Holds** (slice 1) | Network admission on the client address (`src/node-access/services/network-admission.ts`), with `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS`. |
| NA-4 | **Holds** for Docker nodes made or recreated by the launcher (slice 1) | The launcher publishes on `127.0.0.1` and the host's Tailscale address, or every address with `--allow-local-network` (config hash `v10`). A node created by an older launcher keeps its publishing until `setup-code`, `start` or `upgrade` recreates it (NAS-34). |
| NA-5 | **Holds** (slice 1) | Launch credential (`AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL`, taken by `src/node-access/launch-credential-intake.ts`); setup codes from the local control socket (`dist/node-access-cli.js setup-code`, `autobyteus-docker setup-code`) and from an owner desktop. |
| NA-8 | **Holds** (slice 1) | Phone, owner and memory sync credentials are kept hashed; refusal lines carry codes only; an application backend never receives the node credential. The phone apps' media player gets the phone credential per playback, in memory, as a header to the node's origin only (autobyteus-574, autobyteus-642: Android `media/NativeMediaPlayback.kt`, `NodeMediaHttp.kt`; iOS `NodeMediaPlayRequest.swift`, `NodeMediaHTTP.swift`; their tests). |
| NA-9 | **Holds** (autobyteus-661) | Peers pair with a grant or by Accept (`src/remote-collaboration/pairing/peer-pairing.ts`); requests are signed with the node key (`channel/peer-request-signer.ts`) and checked by `channel/node-key-peer-verifier.ts`. Pairs from before node keys show "Pair again" (migration `20261127_peers_to_node_keys`). The private-network machine check takes the caller from the private-network listener (its own build slice). |
| NA-10 | **Holds** (slice 1) | Setup codes 30 min, pairing grants 10 min, phone pairing codes as before; all single use; a wrong, expired or used code is refused 401 (a grant 403). |
| NA-11 | **Holds** (slice 1) | Owner credential, phone, peer and memory sync revocations close open sockets at once (`open-socket-registry.ts`). |
| NA-12 | **Holds** (slice 1) | The MCP gateway needs admission and its token (`src/mcp-gateway/mcp-gateway-token-service.ts`). |
| NA-15 | **Holds** (slice 1) | The node takes the launch credential out of its environment before anything spawns. |
| Node files (NAS-39, NAS-40) | **Holds** (autobyteus-436) | `GET /rest/node-files/content?path=<absolute>`: an explicit owner-and-phone row; `src/node-files/node-file-reader.ts` serves one regular file by its real path, read-only, through `sendUserFile`, and never logs the path. Verified by `tests/e2e/node-files/node-files.e2e.test.ts`. |
| Phone limits inside reachable endpoints (folders, `createWorkspace`, settings, terminal), credential expiry, application-scoped credentials | **Later** (slice 2, autobyteus-441) | autobyteus-436 chose no folder limit: a phone reads any node file read-only (NAS-39). "Any file" includes the node's own data folder (peer secrets, the MCP gateway token; owner and phone credentials are stored only as hashes), as it already did through workspaces. 441 decides whether a phone credential gets folder limits, and at least whether the node's data folder is excluded. |

Verification: `tests/e2e/node-access/node-access-model.e2e.test.ts` (server-checkable scenarios), the
remote collaboration two-server e2e (NAS-19, NAS-20), unit tests, the Electron specs and the launcher tests;
`tests/architecture/node-access-boundaries.test.ts` checks that every scenario ID is named by a test.

## 6. Where The Mechanics Live

- The gate, route permissions and refusals: `src/api/security/`
  ([Remote Access](../features/remote_access.md) for the Host and Origin rules).
- Credentials, setup codes, network admission: `src/node-access/`.
- Phone pairing and phone credentials: `src/remote-access/`,
  [Remote Access](../features/remote_access.md).
- Peer pairing and signing: `src/remote-collaboration/`,
  [Collaboration Model](collaboration_model.md) CM-12.
- The desktop app's credentials: `autobyteus-web/electron/nodeAccess/`.
- Docker publishing and `setup-code`: `scripts/public/docker/`,
  [Docker README](../../docker/README.md).
