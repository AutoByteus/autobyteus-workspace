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
  its hash (a peer secret is the exception, NA-9). One word for every kind; the
  UI says "setup code" and "pair", never a second word for the same thing.
- **Credential kinds**:
  - **Owner credential** (`own_…`): a desktop's, one per desktop per node; full
    authority over the node. The **launch credential** is the owner credential
    the desktop app creates each time it starts its own node; it is never
    stored.
  - **Phone credential** (`mra_…`): a paired phone's.
  - **Peer secret**: shared by two paired nodes; never sent after pairing, used
    to sign each request.
  - **Memory sync source credential** (`mhub_…`): a memory sync source's.
- **Setup code**: a one-time code a desktop exchanges for an owner credential.
  It is readable only on the node's own computer, or created by a desktop that
  is already an owner.
- **Peer invite code**: a one-time code a node's owner creates; another node
  exchanges it to pair.
- **Network admission**: whether a node accepts a connection, by where it
  arrived (NA-3).
- **Client identity**: what the gate established for a request: owner
  (credential ID), phone (device ID), peer (node ID) or memory sync source
  (source ID).
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
| NA-5 | **Each client kind gets its credential one way.** The desktop app's own node: a launch credential, created at each start and handed to the node privately. Another node (Docker, remote): an owner credential, once, for a setup code. A setup code is created on demand, whatever the node's owners: on the node's own computer through its local control socket (`<data dir>/node-access/local-control.sock`, mode 0600; Windows: a current-user named pipe), which `autobyteus-docker setup-code <node>` and the node-access CLI use, or by an existing owner desktop. A phone: by pairing (QR). A peer: by pairing with an invite code. A memory sync source: from the hub node's owner. | Each path is one step the owner takes once (or none); no credential is guessed or taken over by whoever comes first. |
| NA-6 | **Exempt endpoints** are only those a client needs before it holds a credential: `GET /rest/health`, `GET /rest/remote-access/status` (no secret), the phone page `/mobile` and its assets, the three exchanges (`POST /rest/remote-access/pairing-exchanges`, `POST /rest/node-access/setup-exchanges`, `POST /rest/remote/peer-pairing-exchanges`) and CORS preflights. Each exchange accepts a valid, unused, unexpired code only. | Without them no client could ever get a credential. |
| NA-7 | **Route permissions by client kind.** Owner: every endpoint. Phone: everything except owner actions (settings, pairing and devices, node update, owner credentials, peers and invites) and except WebSockets outside the phone WebSocket routes. Peer: only `/rest/remote/*`. Memory sync source: only the memory sync hub routes. What a phone may do inside the endpoints it reaches is narrowed in a later model revision (slice 2). | Each kind reaches what it is for; owner actions stay with owners. |
| NA-8 | **Credentials never leave their owner.** Not in URLs (except the browser WebSocket `access_token`, which the phone needs), never in logs, errors, page code or agent context. The desktop app keeps its credentials in its main process, encrypted at rest, and attaches them to the app window's requests itself; the in-app browser and the agents' browser get none. | A credential that a page, a log or an agent can read is no longer secret. |
| NA-9 | **Peers sign, they do not send.** Two nodes pair once and share a peer secret; every request between them carries an HMAC-SHA256 signature over method, path with query, the sender's and the receiver's node IDs, timestamp, a nonce and the body's hash. A node accepts it only when it is the receiver, within ±300 s, not earlier than its own start, once per nonce; the gate checks the received body against the signed hash before any handler runs. A node ID alone proves nothing. The peer gateway checks that the request's `fromNodeId` is the authenticated peer. | A captured request reveals no secret and cannot be replayed; node IDs are public. |
| NA-10 | **Secrets are random and stored safely.** Credentials and codes: at least 32 (codes 18) random bytes; nodes store hashes and compare in constant time; peer secrets (which signing needs in plain form) and the MCP gateway token (which its owner must be able to copy) are stored with mode 0600; setup codes exist only as hashes in the node's memory; the desktop encrypts its store with the OS keychain. Codes are single-use: pairing codes 5 minutes, peer invites 10 minutes, setup codes 30 minutes. A setup code is never written to a file or a log; it is shown only where it was asked for. | Guessing must be infeasible and a copied disk file must not be a credential. |
| NA-11 | **Every credential can be revoked from the owner's desktop.** Phones (Phone Setup), owner credentials (a node's connected desktops; "Disconnect" revokes the desktop's own), peers (removing the peer forgets its secret on this node). A revoked credential is refused on the next request, and every open WebSocket of that client is closed at once (4403 with the revocation code): the gate keeps open sockets by client identity, and each credential's owner tells it when it revokes. | Losing a device must not mean losing the node. |
| NA-12 | **Tool endpoints use their own credential the same way.** The MCP gateway needs its token from every client, this computer included. The token is the node setting `AUTOBYTEUS_MCP_GATEWAY_TOKEN` when set; otherwise the node creates one (`mcpg_…`) and keeps it for its owner, who sees it in the MCP gateway panel and can regenerate it. | Same reason as NA-1. |
| NA-13 | **One refusal shape.** HTTP: status and `{ code, message }`; WebSocket: close code and the code as reason. One log line per refusal with the code, the route (credentials redacted) and the client address. A client shows the message of a code it does not know. | Setups can be diagnosed without exposing secrets. |
| NA-14 | **Upgrades never fall back to the old rule.** After an update the desktop's own node and paired phones work with no step; every other node shows "Needs connecting" and every peer without a secret "Pair again" until the owner's one-time step. Nothing is served without a credential in the meantime. | A grace period would be the hole this model closes. |
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
| NAS-13 | Stranger on the allowed Wi-Fi | Guessed codes | Pairing, setup and peer exchanges | 401; codes are single-use and expire (NA-10) |
| NAS-14 | Any program on this computer, or a tailnet device through Tailscale Serve | None | Any non-exempt endpoint | 401 |
| NAS-15 | A web page in a browser on this computer | Whatever the browser sends | Any | 403 `REMOTE_ACCESS_ORIGIN_REFUSED` (Origin rule) |
| NAS-16 | A page in the in-app browser or an agent's browser | None (no credential is attached there) | A node URL | 401 |
| NAS-17 | HTML file previewed in the app window | Its scripts run in an opaque origin (`sendUserFile`) | A request to the node | 403 `REMOTE_ACCESS_ORIGIN_REFUSED` |
| NAS-18 | Installed application in the app window | Owner (attached by the app) | Its backend and node APIs | Works, with owner authority (narrowed in slice 2) |
| NAS-19 | Two nodes the desktop owns | Owner credentials on both | "Pair" | One action pairs both; both hold the peer secret |
| NAS-20 | Paired peer | Signature with the peer secret | Delegation, messages, run observation | Works in both directions |
| NAS-21 | Anyone claiming a peer's node ID | No or wrong signature | `/rest/remote/*` | 401 |
| NAS-22 | Replay of a captured peer request | The captured signature | Same request again, or after 300 s | 401 |
| NAS-23 | Peer paired before this model | No peer secret | `/rest/remote/*` | 401; UI shows "Pair again" |
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

Out of the model: protection against software already running as the user on
the same computer (it can read the user's files directly), and what each
credential may do inside the endpoints it reaches (slice 2).

## 5. Current State Versus Target

Status as of the change that published this document (autobyteus-437, design).
Update this table when a change lands.

| Item | Status | Notes |
| --- | --- | --- |
| NA-1, NA-2, NA-5, NA-6, NA-7, NA-13, NA-14 | **Target** (autobyteus-437 slice 1) | Today a request without a credential passes every route except owner routes for phones; only phone credentials are checked. |
| NA-3, NA-4 | **Target** (slice 1) | Today the desktop node and Docker nodes accept connections from every network. |
| NA-8 | Holds for phones; **target** for desktops | Phone credentials are not logged; desktops have none yet. |
| NA-9 | **Target** (slice 1) | Today a peer is identified by the `fromNodeId` in the request body. |
| NA-10 | Holds for phone pairing; **target** for the rest | |
| NA-11 | Holds for phones on HTTP and node-desktop streams; **target** for other open WebSockets, owner credentials and peers | Today only node-desktop streams re-check a phone credential. |
| NA-12 | **Target** (slice 1) | Today the MCP gateway needs no token from this computer, and the token exists only as an optional setting. |
| NA-15 | **Target** (slice 1) | Today the desktop hands its node no credential. |
| Phone limits inside reachable endpoints (folders, `createWorkspace`, settings, terminal), credential expiry, application-scoped credentials | **Later** (slice 2, includes autobyteus-436) | |

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
