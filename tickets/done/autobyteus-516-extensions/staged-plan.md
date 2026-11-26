# autobyteus-516 — Staged Plan For AutoByteus Extensions

Status: Draft for the founder's review (SR-001, 2026-11-21). Informative: it is the
map of the whole direction. Each stage gets its own requirements and the founder's
approval of its design before anything in it is built. Evidence: [investigation-notes.md](investigation-notes.md).

Sizes: S (days), M (about a week of team work), L (several weeks). They are
estimates from the investigation, not commitments.

## Stage 1 — Extension foundation, proven by moving Voice Input onto it (this package)

- What: one extension manager on every node (desktop's own node, Linux server,
  Docker node); a first-party catalog; install / enable / disable / update /
  remove; settings; status, errors and a log per extension; owner-only
  management. Voice Input moves onto it with no visible change and the
  founder's install kept as it is.
- Size: **M–L** (server module and API, node access routes, web Settings page,
  voice transport, removal of the desktop-only manager, data adoption, tests).
- From the founder: DEC-001 (extensions live on each node), DEC-002 (extension
  vs integration, first-party only); approval of the requirements, then of the
  design, before building; a word on what is wrong with voice for him today
  (feeds Stage 1b).
- Devices: none. Tests use a copy of his voice registry in an isolated home,
  never his live data.

## Stage 1b — Voice engine improvement (after Stage 1, when the founder wants it)

- What: adopt the newer voice runtime (English MLX Whisper Small, Chinese
  Fun-ASR-Nano, bounded start/stop, honest readiness) as an extension update.
- Blocker in another Project: runtime v1.0.0 has never been published; its
  release run failed closed on a reproducibility mismatch (autobyteus-voice-runtime,
  DR-014, Aug 2026). It covers macOS Apple Silicon only.
- Size: **M** in this repository, plus the runtime release fix (voice runtime
  repository: the PM creates that Task).
- From the founder: which problems matter (speed, Chinese, accuracy, other
  platforms); whether Mac-only is acceptable.

## Stage 2 — Private Network (the proposal's "Remote Network"; name chosen by the founder 2026-11-21)

Pattern shared by every extension: an AutoByteus extension (install, update,
on/off, status, log) plus a standalone program in its own repository with its own
signed releases and a small stable interface (JSON status, a few commands):
Voice Input + voice runtime; Shared File System + AutoByteus NFS; Private Network +
**AutoByteus Network** (new).

- **AutoByteus Network program:** a small Go program built on an existing
  WireGuard-based library, not a VPN of our own. First candidate: Tailscale's
  `tsnet` (BSD), which works with a Tailscale account or a self-hosted Headscale
  server. NetBird (client BSD-3) only if the proof of concept shows a reason.
  It runs in **userspace mode**: no administrator password, no VPN on the
  computer, no clash with an existing Tailscale; only AutoByteus uses the
  network (others reach this server; this server reaches others through a local
  relay). A whole-computer VPN (official app, administrator prompt) stays a
  guided option, needed mainly for Shared File System between places.
- **One extension, a choice of network inside:** your Tailscale account; your
  own Headscale server; later NetBird; possibly an AutoByteus-hosted service
  (business decision: operations, tenant isolation, cost, trust).
- **Your own VPN (plain WireGuard or any VPN you run):** "bring your own
  network": the extension lets the owner mark its address range as private
  (today: `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS`), so nodes accept it; pairing
  stays with codes, because plain WireGuard has no account service that can say
  which machines are yours.
- **Network-vouched pairing (security-model change, its own approval):** on a
  managed network the program can tell AutoByteus which machine a connection
  comes from and which account added it. A switch per server, "Trust machines I
  added to my private network" (off by default; default is a one-click Pair
  confirmation), lets servers of the same owner pair
  automatically and lets the desktop get owner access without a setup code. The
  one human step left is joining each machine to the network once. Removing a
  machine from the network revokes it everywhere. Other ways in (LAN, machines
  shared by other accounts) keep today's codes. Risk: whoever controls the
  coordination server controls this trust; off for shared or company networks.
- **Several network extensions, one role (founder 2026-11-21, business model):**
  e.g. a free "Private Network for Tailscale" (the user's own Tailscale or
  Headscale) and a paid "AutoByteus Private Network" (our hosted network,
  invite by link or email, nothing to set up). Each is its own package; both
  declare the same role (an optional `provides: "private-network"` field added
  to the contract in this stage) and implement the same small set of actions
  (this machine, my machines, who is this connection, invite, join), so the
  Nodes tab, discovery and pairing work with either. One network extension on
  per server at a time. The server part needs the contract's optional `start`
  (run the network program when turned on and when the node starts).
- **Business note (founder 2026-11-22):** sell the AutoByteus Private Network to
  users without a public address: we run the coordination servers and relays
  (a few regions). Cost is mostly relay bandwidth, since most connections go
  direct; obligations: keeping customers' networks apart, uptime, security of
  the coordination service (it is the trust anchor for automatic pairing).
  Differentiator against Tailscale/NetBird: built into AutoByteus, invite link,
  automatic discovery and pairing. A separate business/infrastructure decision
  and Project when the founder wants it.
- **Later option, founder's idea 2026-11-21: "Host" and "Join" roles** (like
  the NFS tool's server/client). The AutoByteus Network program could include
  Headscale (BSD-3, one Go binary, embedded relay possible). One always-on
  machine with a public address and HTTPS runs "Host a private network" and
  creates one-time, expiring invites (server address + join key, as a link or
  QR code, sent privately); everyone else chooses "Join". Only the coordination
  port is public, never AutoByteus or NFS. A laptop is a poor host (sleeps,
  changes networks, no public address); a small cloud server or an always-on
  home server with a forwarded port fits. If the host is off, existing
  connections keep working for a while but nobody can join or change anything.
- **[2026-11-25, founder: the access code made on the target node replaces "Add a machine", its connection code and the Tailscale join key; Tailscale machines join by sign-in; see pairing-contract.md §6–§7. The flow below is history for those parts.]**
- **User flow, Private Network for Tailscale (drafted 2026-11-22):** (1) first
  machine: Install, Turn on, "Sign in with Tailscale" (login link) or "Paste a
  join key" or "Use my own server" (Headscale URL); card shows this machine, its
  private address, my machines. (2) Adding a machine, founder's vision
  2026-11-22, replaces the terminal step: **one connection code**. On a node
  you already use, the Private Network card offers "Add a machine": it shows a
  one-time, expiring code (text and QR) that carries a join key for your private
  network and a one-time pairing grant. Paste it on the new machine: in its
  Private Network card, or, for a fresh node nobody has connected to yet (a
  Docker node, a headless server), on its first-run page opened on that machine
  itself (accepted from that computer only, while the node has no owner, like
  today's setup code). The paste joins the network and pairs in one step: no
  address, no setup code, no command line. Machines already signed in to your
  network with your account need no code at all (found and paired
  automatically). [Revised 2026-11-22 after the founder stressed pairing: a
  found machine is never trusted by being found; pairing (key exchange, stored
  peer record) always happens, and by default the owner confirms each pairing
  with one click ("New server found: linux-box, added by you — Pair?"). Fully
  automatic pairing is an opt-in switch only.] A Docker node joins from inside its container (userspace
  mode), no host change. (3) Teammate: Tailscale invite or the same connection
  code with a "teammate" grant (peer, never owner), then Connect/Allow. (4)
  Phone: official Tailscale app; phone pairing as today. (5) Remove a machine
  on the card or in Tailscale: access ends everywhere. The code is a secret:
  one-time, short-lived, never logged.
- **Teammates (two owners), founder's scenario 2026-11-21:** one team network
  (team owner invites the teammate with the network's own invite link; joined
  once in the extension). Each sees the other's server under "found on your
  private network", labelled with the account that added it (verified by the
  network). Pairing by request: one clicks Connect, the other gets "X wants to
  connect node Y — Allow?" and clicks Allow; the nodes exchange the peer secret
  themselves. No code to copy. A teammate becomes a peer only, never gets
  owner access. Easiest with a hosted team network (AutoByteus-hosted option is
  a business decision).
- **Core changes in this repository:** network admission (today only confirmed
  Tailscale addresses are admitted automatically), outbound peer requests
  through the local relay, the node access model's new identity source, Docker
  launcher publishing.
- 2a Proof of concept on test machines the founder names: Linux server,
  MacBook, Android phone; LAN, another Wi-Fi, cellular; direct and relayed;
  phone reaching an authenticated node; reconnect, revocation, restart;
  userspace mode inbound/outbound; identity lookup for pairing.
- Size: 2a **S–M**; AutoByteus Network program **M** (new repository: the PM
  creates that Project/Task); extension + core changes **M–L**.
- From the founder: devices; which network first; a coordination server only
  for the self-hosted options (domain + TLS); approval of network-vouched
  pairing; licensing is clear for BSD clients (keep their notices).

## Stage 3 — Shared File System: proof of concept, then the extension

- 3a Proof of concept: the existing AutoByteus NFS tool on two or three test
  machines, on a LAN and then over the Stage 2 network; cross-node visibility,
  concurrent writes, permission errors, disconnects, remount.
- 3b Extension: show the node's role (file server / client / none), the share,
  its health and the mounted folder; launch the tool's own setup for steps that
  need the administrator prompt; never run NFS on a public address.
- Needs in another Project (AutoByteus NFS; the PM creates the Task when Stage 3
  starts): a read-only status the app can read **without root**. Today every
  command except `version` and the dashboards asks for administrator approval,
  including `status`.
- Open NFS tickets that bear on it: field validation on independent Mac/Linux
  hosts; publisher confirmation failures.
- Known product limits to state to users: hard mounts can stall agent and app
  work while storage is lost; the file server is a single point of failure; the
  Mac path is NFSv3 with local-only locks.
- Size: 3a **S–M**; 3b **M**; plus the NFS-project Task.
- From the founder: devices; host-level mounts only (recommended) or also
  inside Docker nodes (the Docker launcher already maps an operator-supplied
  shared directory); how agents get permission-scoped access to shared paths
  (recommendation: through ordinary workspaces, no new permission system).

- **Founder 2026-11-24: design Shared File System now, implement it later (not in
  this stage's build).** Order: its data contract first (from the NFS tool's
  real data: configuration `{state, role, connection{storageId, endpoint,
  export, protocol, mountRoot}, source, backend}` and status `{storageId,
  mountRoot, hostReady, limitation}` in `autobyteus-nfs`
  `internal/adminwire/types.go`, `internal/setup/status.go`,
  `internal/config/connection.go`), then the Product Team's UI on it. Known
  constraints for the contract: (1) every NFS command except `version` asks for
  the administrator, including `status`, and status can stall on a lost hard
  mount: the card needs an unprivileged, time-bounded read-only status (a Task
  in the AutoByteus NFS Project); (2) setup keeps the OS administrator prompt
  (the tool's own dashboard/terminal); (3) the server's connection JSON is
  already a "paste on the other machine" code; (4) across places, the
  computer's own NFS client cannot use the userspace Private Network: it needs
  either a local forward by the network program (NFSv4.1 on one TCP port
  might work; Mac NFSv3 needs several ports) or a whole-computer VPN: unproven.
  Validation of setup, mounts and outages needs the founder's test machines and
  administrator password: ask first.

## Stage 4 — Integration across extensions

- Node status (which extensions run where), service discovery of AutoByteus
  nodes over the private network, Shared FS reachable over Remote Network.
- Size: **M**. From the founder: names and access control across extensions;
  possibly a Product Design round for the Nodes and Extensions pages.

## Stage 5 — Onboarding

- Automate the supported setup steps while keeping the OS security prompts.
- Size: **M**. From the founder: which journeys first.

## Stage 6 — Local Inference Runtime

- Only with a concrete workflow (proposal §5, §7.6). Not planned.

## Relation to other Tasks

| Task | What it is (as known; out-of-scope Task reads are refused to this team) | Relation to autobyteus-516 |
| --- | --- | --- |
| autobyteus-70 | Shared filesystem across nodes, done: the first NFS work, later extracted into the AutoByteus NFS repository | History; nothing to absorb |
| autobyteus-270 | "Shared file system across nodes: make nodes feel like one machine for files", design first, open | Stage 3 covers its shared-storage part. Recommendation to the PM: close 270 as superseded by 516 Stage 3, or keep only any part of it that is not storage |
| autobyteus-488 | Company / Kubernetes deployment; security before any public exposure (slice S6) | Not absorbed. 516 follows the same rule (no public exposure). A private overlay network may later be one way to reach company nodes |
| autobyteus-437 | Node authentication (credentials per client) | Reused as is: application authentication on the private network already holds |
| autobyteus-244 / Integrations | Integrations page and credential proxy | Not changed; defined as a different kind (requirements DEC-002) |

## Proof-of-concept needs (Stages 2 and 3)

- A Linux server, a MacBook and an Android phone (the founder's, only with his
  permission), or test machines he names; ideally not his main Mac, which runs
  Tailscale for his phone access.
- A reachable server with a domain and TLS for the coordination service.
- No change to his running AutoByteus nodes; test nodes are new and owned by the test.
- No public exposure of AutoByteus, NFS or management APIs beyond the
  coordination server's own HTTPS port.
- Enrollment keys and passwords typed by the founder on the device.


> **2026-11-26 (founder):** "Trust machines I added" is removed (pairing-contract §9); the trust-switch parts above (N9, T10, "trust switch" mentions) are history.
