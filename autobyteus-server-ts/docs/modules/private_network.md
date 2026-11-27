# Private Network

## Scope

The node's side of Private Network (autobyteus-661, Stage 2): nodes in different places reach each other over a private
network that the **AutoByteus Network program** (Tailscale's `tsnet`, its own repository `AutoByteus/autobyteus-network`)
joins for the node, and nodes on one local network find each other by DNS-SD. The rules are in the
[node access model](../design/node_access_model.md) (NA-6, NA-9; NAS-47…NAS-54) and the
[collaboration model](../design/collaboration_model.md) (CM-12); pairing itself is in
[remote_collaboration.md](./remote_collaboration.md). Vocabulary: [Glossary](../../../GLOSSARY.md#nodes) (*Visible on my
private network / local network*, *Network relay*, *Pair again*).

The core never imports the extension's code. It reaches the network only three ways: the extension's role actions
(through the Extension Manager), the **caller socket** (inbound connections) and the **network relay** (outbound).

Code: `src/private-network/`, composed in `src/compositions/private-network-composition.ts`.

## Parts

| Part | Does |
| --- | --- |
| `PrivateNetworkListener` | The caller socket: `<data>/private-network/caller.sock` (mode 0600 in a 0700 folder), on Windows a named pipe `\\.\pipe\autobyteus-private-network-<random per start>`. The program writes one line `AUTOBYTEUS-CALLER {"machine","account","ip"}\n` and then the raw connection; the listener marks the socket with that caller and hands it to the node's HTTP server. A connection without a valid line is closed. The node's TCP port never carries a caller. |
| `NodeAccessGate` (admission) | Admits a marked connection like a local one (the network proved the machine); credentials apply as always. The caller is read with `getPrivateNetworkCaller(request)`; a peer paired over the private network is taken only from its machine (NAS-47). |
| `NodeVisibility` | The two owner switches, off by default: `PRIVATE_NETWORK_VISIBLE` ("Visible on my private network") and `LOCAL_NETWORK_VISIBLE` ("Visible on my local network"; it turns on only while the node accepts its local network: `LOCAL_NETWORK_NOT_ALLOWED`). |
| `NodeInfoResponder` | `POST /rest/remote/info` (exempt): `{nodeId, name}` over the private network while visible there, or on another connection while visible on the local network; otherwise exactly Fastify's "not found" answer. |
| `PrivateNetworkRole` | The extension that is on and `provides: "private-network"`, resolved at every call (`manager.enabledProvider`). Reads its actions strictly: `status` → `{state: notJoined·waitingApproval·joined·expired·signedOut·unreachable, machine?, message}`, `machines` → `[{name, ip, id, account, sharedBy?, online}]`, `relay` → `{port, credential}`. Without a provider: `PRIVATE_NETWORK_NOT_SET_UP` ("Private Network is not set up on this node."); another answer shape: `PRIVATE_NETWORK_BAD_ANSWER`. |
| `PeerConnector` (`remote-collaboration/channel/`) | The only route to a peer. A record with a `machine` is reached only through the network relay: an HTTP CONNECT tunnel to `<ip>:8000` with `Proxy-Authorization: Basic base64("autobyteus:" + credential)`, one undici dispatcher per relay start. Every sender (requests, pairing messages, the provider relay, the run-observation WebSocket, identity probes) passes the target's dispatcher. Without the relay the peer is unavailable with the reason, never reached directly. |
| `FoundNodes` | The Nodes tab's Found lists. Private network (while joined): every online machine but this one is asked `POST /rest/remote/info` through the relay at `http://<ip>:8000` (3 s each, 16 at a time); the visible nodes that are neither this node nor paired, each marked `mine` (a machine on the owner's account, not shared) or someone else's (its account, `sharedBy`). Local network: `LocalNetworkBrowser`'s entries, minus this node, its peers and the nodes already found on the private network. The app leaves out the nodes it controls. |
| `LocalNetworkAnnouncer` | While the local switch is on, the node accepts its local network and listens: DNS-SD `_autobyteus._tcp`, instance name = the node's name (one DNS label, ≤ 63 bytes), its port, TXT `id` = node ID. Off, or the server closing, withdraws it. Synced when the server listens, at every switch change and each minute. |
| `LocalNetworkBrowser` | Browses `_autobyteus._tcp` while the Nodes tab looks: the first look waits 1.5 s, a later one asks again and waits 0.8 s; it stops after 10 minutes without a look. An entry needs a node ID in TXT `id`, a name, a port and an address (IPv4 first, link-local last, else global IPv6). |

The mDNS stack is the pure-JS `bonjour-service`; a failure of its socket (port 5353 refused or taken) is logged and
leaves the node unannounced or the list empty. It never stops the node (the library's defaults would throw).

## Pairing over the private network

`pairWithNode(…, machine)` pairs with a node found there (contract §3, §4): the node is asked through the relay, this
node offers only its own private address (`http://<its ip>:8000`, from `status`), and the record keeps the peer's
`machine` and the `account` the network lists for it. A pair message that arrives over the private network is probed
back through the relay at the caller's machine; the record keeps the caller's machine and account. Requests between the
two are then taken only from those machines. Not joined: `PRIVATE_NETWORK_NOT_JOINED`; a machine the network does not
list now: `PEER_UNREACHABLE`.

## Routes and GraphQL

| Endpoint | Access | Does |
| --- | --- | --- |
| `POST /rest/remote/info` | exempt | who this node is, by the visibility rules above |
| `GET /rest/private-network/relay` | owner | `{port, credential}` (`no-store`) for the desktop's proxy; 409 `PRIVATE_NETWORK_NOT_SET_UP`, 502 for an extension that cannot answer (NAS-54) |
| GraphQL `nodeVisibility`, `setNodeVisibility(privateNetwork, localNetwork)` | owner | the two switches |
| GraphQL `foundNodes` | owner | `{privateNetwork {state, message, nodes}, localNetwork}` |
| GraphQL `pairWithNode(address, addresses, grant, nodeId, name, machine)` | owner | `machine` pairs over the private network |

## The program's interface (what the AutoByteus Network program must match)

- Its server part gets `ctx.privateNetwork {callerSocketPath, nodePort}` ([extensions.md](./extensions.md)).
- Inbound: it listens on its machine's private address, port **8000**, and hands each connection to `callerSocketPath`
  with the caller line.
- Outbound: an HTTP CONNECT relay on 127.0.0.1 with a credential new at every start, user name `autobyteus`.

## Tests

- `tests/unit/private-network/`: the listener on every platform (a named pipe on Windows: workflow
  `.github/workflows/private-network-windows.yml`), visibility and `/rest/remote/info`, the role, the relay route,
  FoundNodes (with an end-to-end case through a stand-in relay into a real caller socket), the announcer and browser
  over an in-memory network.
- `tests/unit/remote-collaboration/peer-connector.test.ts`: every sender through a stand-in relay
  (`tests/helpers/fake-network-relay.ts`).
- Gated: `RUN_LOCAL_NETWORK_MDNS=1` runs `tests/integration/private-network/local-network-mdns.integration.test.ts` on this
  computer's real multicast DNS (a test-only service type).
