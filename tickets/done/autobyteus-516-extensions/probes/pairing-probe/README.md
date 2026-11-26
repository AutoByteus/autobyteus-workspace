# Pairing probe (autobyteus-516, 2026-11-22)

Throwaway prototype that walks every flow of [pairing-contract.md](../../pairing-contract.md)
on this Mac. Not production code. Founder's Tailscale checked before/after: unchanged
(Running, 5 peers).

- Network program: `../network-probe/anet` (Tailscale `tsnet` v1.104.7, userspace),
  now forwarding incoming connections to the local node with the network-verified
  caller (machine, account) attached, and carrying the node's outgoing requests.
- `mini-node.mjs`: a mini AutoByteus node implementing the contract (Ed25519 node
  key, peer records, pairing grants, pair / pair-accepted, signed requests, owner
  action, "Add a machine" and the first-run page).
- `run-pairing-probe.mjs` (via `run-pairing-probe.sh`): Headscale on loopback;
  machines ryan-mac, ryan-docker, fake-node (on ryan's account, never clicked),
  bob-laptop (teammate), fresh-node (new, no owner).

Run: `bash run-pairing-probe.sh` (tools in
`/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-516-probe-tools`, see
`../network-probe/README.md`).

## Result (Measured, 2026-11-22): 28/28 passed

- Auto-discovery: from the network's machine list (bob-laptop, fake-node,
  printer-box, ryan-docker), asking "are you AutoByteus?" over the private network
  found the three AutoByteus nodes and left out printer-box, in 0.7 s; the
  question is refused when it does not arrive through the private network.

- Found is not trusted: an unpaired node is refused.
- One click: a grant clicked for ryan-docker pairs it with ryan-mac; signed
  requests then work both ways. A used grant, a grant used from another machine,
  an expired grant: refused.
- A fake machine on the owner's own account without the click: only a pending
  request, its calls refused. With the opt-in switch on it pairs (why the switch
  is off by default).
- Teammate: Connect → "bob-laptop, added by bob" pending → Allow → paired as
  teammates; collaboration works; owner action refused ("peers are not owners");
  a forged "accepted" refused.
- Forged signature, replayed old request, ryan-docker's stolen key used from
  another machine: refused. After unpairing: refused.
- Connection code (241 characters): one paste on the new node's first-run page
  joined the network, paired and made ryan-mac its owner in 3.0 s; the owner
  action worked; pasting again, reusing the code on another node, an expired
  code: refused; the first-run page is not reachable over the network.

## Findings that changed the contract

1. Bind a peer to the network's **stable machine ID**, not its name (names can be
   changed on the coordination server).
2. The connection code carries **`expiresAt`** so a new node refuses an expired
   code before joining the network (in the probe it joined first, then was refused).

Also seen: the owner sees an unexpected machine ("fake-node, added by ryan") in
the found list, which is useful; the design should let the owner reject a
pending request and flag unknown machines.

## Access probe (2026-11-25): `run-access-probe.sh`, 14/14

Validates the steps added after the founder's decisions: the access code
(pairing-contract §6), Reject and Cancel (§3), and gap G1. The network program now also
starts tsnet's local relay (`Loopback()`); the "AutoByteus app" is the script, holding
owner credentials and reaching nodes only through ryan-mac's relay.

- G1: a direct request to a private address times out; through the node's local relay it
  reaches the node. Found: that relay is SOCKS5 with a username/password only (tsnet
  `Loopback`, v1.104.7: "TODO: add HTTP proxy support"); Chromium has no SOCKS5 password
  support, so the network program must offer its own relay for the desktop app.
- Access code: made on build-server's first-run page with exactly `nodeId, address,
  setupCode, expiresAt` (185 characters); pasted → reached through the relay → setup
  exchange → owner credential in 106 ms; owner action accepted; refused: a made-up
  credential, the same code again, the first-run page once owned, an expired code (before
  connecting), a malformed code. An owner made a second code: a second app became owner.
- Reject: bob is told "declined", nothing stored. Cancel: a later Accept is refused as
  withdrawn and nothing is stored on either side. A rejection nobody asked for: refused.

Regression: `run-pairing-probe.sh` still 28/28. The run scripts now resolve the scratch
path (`pwd -P`) so their cleanup finds every process.
