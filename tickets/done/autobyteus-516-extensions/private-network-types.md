# Private Network: workflow per network type (draft, Private Network stage)

Status: Draft 2026-11-24, for the Product Team's design and the founder's review.
Requested by the founder (via the Product Team): design every network type the
Private Network extension is meant to support. Sources: pairing-contract.md,
probes/network-probe, probes/pairing-probe, staged-plan.md. "Validated" means
proved by those probes on one Mac (Headscale on loopback, Tailscale's `tsnet`
library v1.104.7); everything else is provisional.

> **Update 2026-11-25 (founder):** "Add a machine" and the connection code made on the
> desktop are replaced by the **access code made on the target node** and pasted in
> AutoByteus under Nodes → Add node (pairing-contract.md §6); Tailscale machines join by
> **sign-in** (no join key needed); Headscale / host machines join with an **invite
> code** (§7). Sections below that mention "Add a machine" or a connection code are
> history; the contract is the authority.

## Scope recommendation

| # | Type | In the Private Network stage? |
| --- | --- | --- |
| 1 | Your Tailscale account | **Yes** (first release) |
| 2 | Your own Headscale server | **Yes** (first release) |
| 3 | Host a private network (AutoByteus runs Headscale on one of your machines) | **Designed now, built later** (needs its own proof: public address, TLS) |
| 4 | Your own VPN (plain WireGuard or any VPN you run) | **Yes, minimal**: the node accepts the VPN's range; discovery and one-click pairing do not exist |
| 5 | NetBird | **No** (only if the proof of concept shows a reason; it would need its own network program) |
| 6 | AutoByteus-hosted (paid) | **No**: out of this ticket (business decision, own Project) |

Types 1–3 are the same technology (Tailscale protocol, our `tsnet` program), so
they share every screen after joining. Type 4 is a different kind: AutoByteus
only accepts a network the user runs; it has no machine list or caller identity.

## Common to types 1–3

- Joined, the node gets: a private address, **My machines** (every machine of
  the network: name, account that added it, online), and **who is this
  connection** (machine, account) on every request. Validated.
- So all of these exist: "Visible on my private network", "Found on your
  private network", **Pair** (your own node, one click), **Connect / Allow /
  Reject / Cancel**, the unknown-machine flag, "Trust machines I added",
  the **access code** made on the target node (pairing-contract.md §6). Pairing and
  discovery validated on Headscale.
- Removing a machine from the network ends its access everywhere (~11 s, validated).
- One network per node at a time (one network type, one network). Switching:
  leave the current network (this machine is removed from it), join the new
  one, **pair again**: pairings are bound to the network's stable machine ID,
  which is new on the new network. Peer records from the old network stay but
  cannot reach (pairing-contract §5). Leaving works in every state; when signed
  out or the server is unreachable, the machine stays listed on the network until
  removed in the admin console or on the server.

## 1. Your Tailscale account

- **a. Setup.** Outside AutoByteus: a Tailscale account (tailscale.com). For
  teammates: invite them to your Tailscale network in the Tailscale admin
  console (Users → Invite). In AutoByteus: Private Network → "Tailscale account".
- **b. Join.** Either **Sign in with Tailscale** (the node shows a login link;
  you open it on any device and approve; the page waits, then shows joined) or
  **paste an auth key** (`tskey-auth-…`, made in the admin console: Settings →
  Keys). Can go wrong: key invalid, used or expired; **device approval** turned
  on in the tailnet (the machine waits until an admin approves it in the
  console); later, **node key expiry** (Tailscale signs machines out after a
  period unless "disable key expiry" is set for that machine): the card must
  show "Sign in again". Use untagged keys: a tagged machine belongs to the tag,
  not to a person, so "added by" would show the tag and it can never count as
  "yours".
- **c. What the network tells AutoByteus.** Machine list with the account that
  added each machine and online state; caller identity. All pairing features
  exist. Machines shared from another tailnet (Tailscale "sharing") appear with
  their sharer's account: they are someone else's (Connect/Allow).
- **d. Adding a machine.** The new machine signs in with Tailscale on its first-run
  page (no key needed; a pasted auth key stays an option), then makes an **access code**
  that the owner pastes in AutoByteus (Nodes → Add node).
- **e. UI specifics.** Account name; "Sign in again" when the machine was signed
  out; "Waiting for approval in your Tailscale admin console"; plan limits are
  Tailscale's.
- **f. Status.** Library behavior validated on Headscale; **not proved with a real
  Tailscale account**: sign-in link, auth keys, device approval, key expiry,
  invites, sharing, other networks, mobile, relays. Provisional.

## 2. Your own Headscale server

- **a. Setup.** Outside AutoByteus: someone runs a Headscale server on a machine
  every member can reach (public address or domain, **HTTPS**), creates a user per
  person (`headscale users create <name>`) and join keys
  (`headscale preauthkeys create --user <id>`) on that server. In AutoByteus:
  Private Network → "My own Headscale server", enter its URL.
- **b. Join.** Server URL + join key. Can go wrong: server unreachable, wrong URL,
  key invalid/used/expired. (Interactive login, where the server's admin approves
  a new machine with a command, exists in Headscale but is not proved; leave it
  out or mark provisional.)
- **c. What the network tells AutoByteus.** Same as type 1. Validated.
- **d. Adding a machine.** The new machine joins with an **invite code** for your
  user (from a key made with `headscale preauthkeys create --user <you>`, or made by
  a node where the owner stored a Headscale API key: not proved), then makes an
  **access code** that the owner pastes in AutoByteus (Nodes → Add node).
- **e. UI specifics.** Server URL; "the server is unreachable: nobody can join or
  change anything; existing connections keep working for a while"; the API key
  field shown once.
- **f. Status.** Join with URL + key, machine list, who-is, pairing, connection
  code, revocation: **validated** (loopback server). Not proved: a public server
  with HTTPS, the phone app against it, API-made keys.

## 3. Host a private network (designed now, built later)

The founder's Host/Join idea: AutoByteus runs Headscale itself on one of your
machines.

- **a. Setup.** In AutoByteus, on one **always-on machine with a public address**:
  Private Network → "Host a private network". Outside AutoByteus: a domain name
  pointing to that machine (or its public IP), and, at home, a router port
  forward for the HTTPS port. AutoByteus gets the certificate automatically for
  the domain (Headscale supports this; not proved). Only that HTTPS port is
  public; AutoByteus and its agents never are. The host also joins its own
  network as a normal member.
- **b. Join.** Others: "Join a private network" with an **invite** (link/QR) made
  on the host: the host's address + a one-time, expiring join key, pasted in the
  other machine's Private Network card (the host serves no join web page: only
  the coordination service is public). The invite says whom it is for: "one of
  my machines" (your own Headscale user) or "a teammate" (the teammate's own
  user, created if new), because the key's user is what "added by" shows and
  decides yours vs someone else's. Or, for a brand-new node, the connection
  code on its first-run page.
- **c.** Same as type 1 (it is Headscale).
- **d. Adding a machine.** The host makes invite codes itself (one click, for you or a
  teammate); the joined machine then makes an **access code** for AutoByteus.
- **e. UI specifics.** The host role: public address/domain, port, certificate
  state, a reachability check ("reachable from the internet on 443"), "if this
  machine is off, nobody can join and changes wait; existing connections keep
  working for a while", and that removing the host's network removes the network
  for everyone. A laptop is a poor host (sleeps, changes networks, no public
  address): say so.
- **f. Status.** Only Headscale itself is validated (loopback). Running it inside
  our program, the certificate, public reachability, port forwarding: **not
  proved**. Everything host-specific is provisional.

## 4. Your own VPN (plain WireGuard or any VPN you run)

- **a. Setup.** Entirely outside AutoByteus (the user's VPN). In AutoByteus:
  Private Network → "My own VPN", enter the VPN's address range (e.g.
  `10.8.0.0/24`). The node then accepts connections from that range (today only
  possible with the `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS` setting). Credentials
  are still required for every request (node access model).
- **b. Join.** Not AutoByteus's: the machine is on the VPN or not.
- **c. What the network tells AutoByteus.** Nothing: no machine list, no account,
  no caller identity. So **no** "find this node", no "Found on your private
  network", no one-click Pair, no Connect/Allow over the network, no trust
  switch. The access code still works with the node's local address. The Nodes card says: "Your own VPN cannot find
  nodes or tell who is calling. Add nodes by address and pair them with codes."
- **d. Adding a machine.** The new node's **access code** carries its address on the
  VPN; pairing with today's peer invite code.
- **e. UI specifics.** Only private ranges are accepted (10.0.0.0/8,
  172.16.0.0/12, 192.168.0.0/16, 100.64.0.0/10, fd00::/8), any size inside them;
  anything including public addresses is refused; a warning above /16. The range field with a warning that every machine in the
  range reaches this node's login (not its data: a credential is still needed).
  This type does not use the network program; no download needed beyond the
  extension.
- **f. Status.** Address + setup code + peer invite: today's product. The range
  setting in the card: new, simple.
- **g.** Can be used together with types 1–3 (it only adds an accepted range).

## Out of scope here

- **NetBird**: not designed; revisit only if the proof of concept shows a reason.
- **AutoByteus-hosted network**: out of this ticket; its own business and
  infrastructure Project when the founder wants it. Design nothing for it now
  (at most nothing beyond a future "more options" slot, if the Product Team
  wants one).


> **2026-11-26 (founder):** "Trust machines I added" is removed (pairing-contract §9); the trust-switch parts above (N9, T10, "trust switch" mentions) are history.
