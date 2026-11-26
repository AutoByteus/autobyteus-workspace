# Pairing and Access Contract over the Private Network (Private Network stage)

Status: Draft, current as of 2026-11-25 (rewritten after the founder's decisions of
2026-11-24/25). Written before the design (DESIGN.md rule 13, design principle 17);
validated by [probes/pairing-probe](probes/pairing-probe/README.md) (PP; its access probe AP) where marked.
Rule: **a field exists only if a step below reads it**; the contract grows later only
by optional fields.

## 0. Vocabulary (founder, 2026-11-25)

| Word | Between | Meaning |
| --- | --- | --- |
| **Pair**, **peer** | node ↔ node | Two nodes agree to work together: their agents can delegate and message. Neither controls the other. |
| **Access code** | client → node | A one-time code made on a node; pasted in AutoByteus (Nodes → Add node), it gives that AutoByteus app control of the node (an owner credential, as today). Chinese: 访问码. |
| **Invite code** | network → machine | A one-time code that lets a machine join a Headscale or hosted private network as a given user. |
| **Caller** | private network → node | The machine and account the network program proves for every connection arriving over the private network. |

Being on the network, or found in its machine list, grants nothing.

## 1. Records each node stores

| Record | Shape | Written by | Read by | Lifecycle |
| --- | --- | --- | --- | --- |
| **Node key** | one Ed25519 key pair; private key file mode 0600, never sent | the node, once, on first use of the private network | signing (§5); public key sent when pairing (§3) | kept for the life of the node's data |
| **Peer record** | `{ nodeId, name, publicKey, machine, account, role }` (below) | Pairing, when a pair completes (§3) | signed-request check (§5), Nodes tab | removed by Unpair on this node, or by the other node's `/unpaired`; stays (unreachable) when the network is left |
| **Visible** (`visible`) | boolean, default `false` | the owner's switch "Visible on my private network" (founder's name, 2026-11-26; earlier "Let my private network find this node" / "Discoverable") | Discovery (§4) | changed by the owner only |
| **Pairing grant** | `{ grant, forMachine, role, expiresAt, used }` | Pairing, when the owner clicks Pair or Accept (§3) | Pairing, on a pair request | in memory only; one use, 10 minutes |
| **Pending request** | `{ id, nodeId, name, publicKey, caller }` | Pairing, on a pair request without a grant | Nodes tab ("X wants to pair"), Accept / Reject | in memory only: until Accept, Reject or withdrawn; a restart drops it (the other side asks again) |
| **Outstanding request** | the machine A asked to pair with | Pairing on A, when A's owner clicks Pair for someone else's node | Pairing on A, to accept `pair-accepted` / `pair-rejected` | in memory; until answered or cancelled |

Peer record example:

```json
{ "nodeId": "srv_8f2c41d0a9b3", "name": "linux-box", "publicKey": "MCowBQYDK2VwAyEA…", "machine": "nKxQ7…stable-id", "account": "ryan@example.com", "role": "own" }
```

| Field | Meaning | Read by |
| --- | --- | --- |
| `nodeId` | the other node's ID | §5: who claims to call |
| `name` | its name | Nodes tab |
| `publicKey` | its node key's public half | §5: signature check |
| `machine` | the network's **stable machine ID** of the machine it runs on (not its name: names can be changed on the coordination server; PP finding) | §5: the caller must be this machine (a stolen key on another machine is refused) |
| `account` | the network account that added that machine | Nodes tab ("added by"); case 3 of §3 |
| `role` | `own` (your node) or `teammate` (someone else's: peer only) | Nodes tab; never grants control |

Identities: a peer record is keyed by `nodeId`; each node keeps its own record of the
other (two records per pair, one on each side). A node has at most one record per
`nodeId`.

## 2. Messages over the private network

All arrive through the network program, which attaches the **caller**
(`{ machine, account }`); a request without a caller is refused.

| Message | From → to | Body | Answer |
| --- | --- | --- | --- |
| `POST /autobyteus/info` | any machine → node | — | `{ nodeId, name }` only while Visible is on; otherwise as if no AutoByteus were there |
| `POST /pair` | A → B | `{ nodeId, name, publicKey, grant? }` | §3 |
| `POST /pair-accepted` | B → A | `{ nodeId, name, publicKey }` | accepted only while A has an outstanding request to that caller machine |
| `POST /pair-rejected` | B → A | — | same condition; A shows "declined" |
| `POST /unpaired` (signed, §5) | A → B | — | B removes its peer record for A (added 2026-11-25: otherwise B keeps a record that A already refuses). If B cannot be reached, B's record stays until its next request is refused; B shows that node as no longer paired then |
| signed request | peer → peer | any | §5 |

## 3. Pairing (Pair / Accept)

B decides a `/pair` from two facts: the grant (an owner's click) and the caller.

| Case | When | B's answer |
| --- | --- | --- |
| 1. Your own two nodes (one click) | The AutoByteus app that clicks Pair controls both nodes: it has B make a grant for A's machine, then has A send `/pair` with it | Valid grant, unused, not expired, `forMachine` = caller's machine → paired (role from the grant); B returns `{ nodeId, name, publicKey }`; A stores B |
| 2. A node this app does not control (someone else's, or a machine on your account that another AutoByteus controls) (Pair, then their Accept) | A sends `/pair` without a grant | Pending request ("A, added by <account>, wants to pair"); B's owner Accepts → B stores A as `teammate` and sends `/pair-accepted`; Reject → `/pair-rejected`; A's owner may Cancel (A drops its outstanding request; later answers are refused) |

Open for the founder (asked 2026-11-24): case 1 as one click, or the same Pair + Accept
for your own nodes too. Recommended: one click (the same person decides for both sides).

## 4. Discovery

`Nodes tab → node → network program: machine list (name, machine, account, online,
private address) → for each online machine: /autobyteus/info over the private network →
answers = AutoByteus nodes → minus the nodes this AutoByteus app controls and the nodes
this node is paired with (those appear in "Controlled nodes" / "Paired nodes") → each marked: someone else's / unknown machine on your
account → "Found on your private network"`. (Changed 2026-11-25, Product round 7: one
Pair per node; a node you control is always in your Nodes list.) Nothing is broadcast on a local network or
the internet. Refresh when the machine list changes and when the Nodes tab opens.

## 5. Signed request (every call between peers)

Headers `X-Node-Id`, `X-Timestamp` (ms), `X-Signature` = Ed25519 over
`nodeId \n timestamp \n method \n path \n sha256(body)`. Refused when: no peer record for
that `nodeId`; bad signature; timestamp more than 60 s off; the caller's machine is not
the record's `machine`.

## 6. Access code (client → node; founder 2026-11-24/25)

Made **on the target node** in its own UI; pasted in AutoByteus under **Nodes → Add node
→ Paste an access code**. Inside it is today's setup code (NA-5), plus how to reach the
node, so no address is typed and no terminal is used.

```
abps_ + base64url of
{ "nodeId": "srv_8f2c41d0a9b3", "address": "100.88.80.80:8000", "setupCode": "…", "expiresAt": "2026-11-25T08:30:00Z" }
```

| Field | Meaning | Read by |
| --- | --- | --- |
| `nodeId` | the target node | AutoByteus app: checks it reached that node; refuses a node already listed |
| `address` | where to reach it: its private-network address, or its local address without a private network | AutoByteus app: connects (over the private network through its own node's relay, G1) |
| `setupCode` | today's one-time setup code (30 minutes, single use, hash only on the node, never logged) | exchanged for this app's owner credential (today's setup exchange) |
| `expiresAt` | when the setup code expires | AutoByteus app: refuses an old code before connecting |

Where it is made (founder 2026-11-25: "I would rather run the setup code"; replaces the
first-run page):
- **on the node's own computer, by the command you already use**: today's
  `autobyteus-docker setup-code <node>` and the server install's
  `node dist/node-access-cli.js setup-code --data-dir <dir>` print an **access code**
  instead of a bare setup code, and are renamed `access-code` to match the word; the start command prints one at the end too. It works whatever the node's
  owners (NA-5: the local control socket is the proof), so it is also the recovery path.
  No browser step;
- **in AutoByteus, for a node it already controls**: Manage Nodes → This node → "Create
  access code" (owner credential only, never a phone), e.g. to give a second computer or
  a teammate control. Shown only where the code can work: when the node has an address
  another computer can reach (its private-network address, or a local-network address it
  is published on), which the code carries; hidden otherwise (the desktop's own node and
  a Docker node published on 127.0.0.1 only). This node also lists who controls it
  ("Controlled by": `desktopName`, `createdAt`, `lastSeenAt` from
  `GET /rest/node-access/owner-credentials`), with Revoke for the others
  (`DELETE …/owner-credentials/:credentialId`, NA-11).

The first-run page is dropped: joining the private network happens afterwards, from the
AutoByteus that now controls the node (install Private Network on it, sign in), so the
first-run page's other job disappears too, and with it gap G4.

Lifecycle: made → used once (owner credential issued) or expired. **Remove** (a node in "Controlled nodes"): this app's owner
credential is revoked on the node and forgotten (today's `nodeRemoved`, NA-11); a paired
node is unpaired first (§2 `/unpaired`). The setup code inside
follows NA-5/NA-10 unchanged.

## 7. Invite code (joining a Headscale or hosted network)

Made on the host (or with the Headscale server's API key), pasted on the machine that
joins (its Private Network card, in the AutoByteus that controls it):

```
abhi_ + base64url of
{ "server": "https://net.example.com", "key": "…", "for": "bob", "expiresAt": "2026-11-26T08:00:00Z" }
```

| Field | Meaning | Read by |
| --- | --- | --- |
| `server` | the coordination server's address | network program: where to join |
| `key` | a one-time join key of that server, made for user `for` | network program: joins with it |
| `for` | the network user the machine joins as: yours, or a teammate's own user | shown before joining ("joins as bob's machine"); decides "added by" and so yours vs someone else's |
| `expiresAt` | when the key expires | refused before joining |

On a Tailscale account no invite code is used: the machine signs in with Tailscale (a
login link approved on any device); a pasted Tailscale auth key stays an option.

## 8. Walks (each use case through the records and messages)

| Use case | Reads | Writes | Proof |
| --- | --- | --- | --- |
| Join (Tailscale sign-in / invite code) | invite code (§7) | network program state | NP (join with key); sign-in: not proved |
| Visible on/off | — | Visible | PP discovery |
| Discover | machine list, `/autobyteus/info`, peer records | — | PP: discovery 0.7 s; non-AutoByteus machine left out |
| Pair your own node | grant, caller | grant `used`, two peer records | PP one-click checks |
| Pair someone else's node | caller | pending → peer records (`teammate`) | PP Connect/Allow; AP: Reject ("declined", nothing stored), Cancel (later Accept refused as withdrawn, nothing stored), unasked rejection refused |
| Collaborate | peer record | — | PP signed-request refusals |
| Access code | setup code (NA-5) | owner credential (today) | AP: made locally (the probe's first-run route stands for today's local control socket) with exactly the four fields; pasted, reached through the relay and exchanged in 106 ms; owner action works; used, expired (before connecting), malformed, made-up credential, first-run on an owned node: refused; a second owner by a code from an owner |
| Unpair / leave | peer record | peer record removed | PP; NP revocation 11 s |

## 9. Gaps and open decisions (for the Private Network design)

- **G1** the AutoByteus app reaching a private address: AP proved the idea (direct
  request: timeout; through the node's local relay: reached, setup exchange done). Found:
  Tailscale's library offers that relay only as **SOCKS5 with a username/password**, and
  Chromium (the desktop app) does not support SOCKS5 with a password; so the AutoByteus
  Network program must offer its own local relay the desktop can use (an HTTP CONNECT
  proxy on 127.0.0.1 with a per-start credential the desktop answers through Electron's
  proxy login). Not proved in Electron;
- **G4** closed: no first-run page (the access code comes from the local control socket);
- not proved: Tailscale sign-in, real Tailscale keys, device approval, key expiry,
  sharing, real networks and relays, the product's own pairing code;
- **today's peers** (shared peer secret, paired by invite over a local network or the
  computer's Tailscale) and **private-network peers** (node keys): one pairing model is
  the Private Network design's decision; recommended: move all pairing to node keys,
  with a sealed migration of existing peers;
- open for the founder: one click for your own nodes (§3).
- **Founder 2026-11-26: "Trust machines I added" removed.** Every pair request from a node
  this app does not control waits for Accept; nodes this app controls pair in one click.
  One rule, no switch (and no automatic trust of the network's account).
- **Founder 2026-11-25: no collaboration switch.** "Now we're using pairing, why do I
  still need this toggle … it's only making the UI complicated." The node-level
  "Remote collaboration" switch (`ENABLE_REMOTE_COLLABORATION`) and the per-node
  collaboration toggles in the Nodes list are removed: a node collaborates exactly with
  the nodes it is paired with; Pair / Unpair are the only controls (no Pause). For the
  Private Network design: the existing stored switch value needs a decided transition
  (Principle 5), for example a node with the switch off and registered peers.

## History

- 2026-11-22: first version; probe 26/26, then 28/28 with discovery; changes: stable
  machine ID; expiry in codes.
- 2026-11-24: `pair-rejected` and Cancel (Product round 1).
- 2026-11-24/25 (founder): owner access by an **access code made on the target node**
  replaces the "connection code" made on the desktop (with its Tailscale join key) and
  the one-click "Manage this node" claim; Tailscale machines join by sign-in; the
  vocabulary of §0.
