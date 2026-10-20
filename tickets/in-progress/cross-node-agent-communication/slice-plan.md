# Slice Plan — Cross-Node Agent Collaboration (parent Task)

- Package: `cross-node-agent-communication`; revision `SR-004` (2026-10-19); status: **Approved** by the user on 2026-10-19 together with `requirements-doc.md` (see its Document Status for the quote).
- Owner: Solution Designer. The Project Task Manager creates each slice as a Project Task `part_of` the parent, with its `depends_on`, after the user approves it. Slices are proposed one at a time: the next one is proposed only after the user approves this plan and the previous slice is understood.
- Each slice runs the full flow in its own Task: requirements refinement where needed, architecture design and review, implementation, code review, API/E2E, delivery.
- Only slice 1 is specified (`requirements-doc.md`). S2 … S6 are listed with their purpose and done-when only. They are **not designed**, and their scope may move when slice 1 teaches us something.

## Foundations

What slice 1 needs (built inside slice 1, not as a separate foundation slice: the direction is "the first working slice before any large design"):

| ID | Foundation | Why slice 1 needs it | Size of the change |
| --- | --- | --- | --- |
| F-1 | Peer records and the switch: per-node settings for peers (name, URL, pinned identity) and published Agents (with launch settings); a capability switch, off by default | Nothing crosses nodes without them; they are also where S6 adds a secret | New, small; follows the Memory Sync and feature-capability patterns |
| F-2 | Inter-node contract: server-to-server requests (no version negotiation, SR-005) (start a delegated run; deliver a message to a linked run), each with one inbound entry point, an idempotency key and bounded timeouts | The transport the collaboration model § 4 names | New module; new inbound REST routes on the trusted network |
| F-3 | **Remote delegated-run link** (the part of CM-7 "through links instead of hosting" that slice 1 needs): node A records the remote run as a link (peer, remote run ID, Task) in the delegating run's root and its Task; node B hosts the run as its own independent run, with a link back to the remote coordinator | A run on another node cannot be hosted in A's process | Medium. On B it rests on the existing standalone run root, which restores its host on the next message. On A it adds a new kind of task execution to the root and its Task records |
| F-4 | Run-ID routing across the link: `send_message_to` by run ID to and from a linked remote run goes through the link, with the same wake rules as same-root delivery, and the message is recorded on both sides (CM-9) | Follow-ups both ways | Medium; one new branch in the run-ID router and one inbound delivery path |

What can wait (not needed for slice 1):

| Item | Why it can wait | Where |
| --- | --- | --- |
| Converting **local** delegated runs from hosting to links (full CM-7) | Slice 1 links only remote runs (DEC-110); local hosting works and is out of scope | Only if a later slice proves it needed; then its own Task |
| File transfer, attachment mapping, size limits | Text-only first slice | S2 |
| Lifecycle control across the link (stop, Task closure, reactivation, model change), remote runs in A's run tree, origin badges | Idle shutdown on B covers slice 1; A fences closed Tasks (DEC-107) | S3 |
| Remote addresses for standing instances, remote Teams | Not needed for one published Agent | S4 |
| Discovery of peers' published agents | The user names the target in slice 1 | S5 |
| Authentication, pairing secret, permission checks, delivery status beyond accepted/refused | Security after the main function (direction) | S6 |

## Slices

| Slice | Title | Purpose | Done when | Depends on |
| --- | --- | --- | --- | --- |
| **S1** | Remote delegation, text only | Switch, peers, published Agents; an agent delegates a text task to a published Agent on a peer; the remote run is an independent run on the peer; follow-ups by run ID both ways, also after idle shutdown and restart (F-1 … F-4) | REQ-101 … REQ-115 and AC-101 … AC-113 of `requirements-doc.md` pass. This includes the user's check on the desktop node and a Docker node, in both directions | — |
| S2 | Attachments across nodes | `reference_files` on cross-node delegations and follow-ups; delegation of a saved Task with its context files. The sender names its own files; the product copies them; the receiver gets local paths plus a mapping back; integrity check and all-or-nothing admission; size limit. Settles old DEC-002 (does a large transfer block the sender?) | The video example works end to end without a manual copy: a video on the desktop node is handed to the publishing agent on the other node | S1 |
| S3 | Lifecycle across nodes | Closing the Task on A stops the remote run; the user stops, reactivates or changes the model of a remote run from A; the remote run is listed in A's run tree, marked with its peer; B's run views show the origin | A remote run behaves like a local delegated run for every lifecycle control the collaboration model gives (CM-6, CM-7) | S1 |
| S4 | Remote Agent Teams | Publish Agent Teams; delegate to a published Team on a peer; follow-ups through its coordinator run ID | A Team on a peer can be delegated to and talked with like a local Team copy | S1 (S3 recommended first) |
| S5 | Discovery | Agents list registered peers and their published agents (name, description, availability), for example in `list_available_agents` | An agent finds a peer's published agent without being told its address | S1 |
| S6 | Security for cross-node | Owner pairing with a secret on top of the peer record; peer authentication on every inbound request; permission checks at the inbound entry points (REQ-114). Its own Task, which may sit outside this parent if the user prefers | No cross-node request is accepted from an unpaired or unauthenticated node | S1 (better after S2–S5) |

Later candidates, not planned yet: a standalone "send files to a node" tool (old DEC-003); messages to a peer's standing instances by address; a store-and-forward queue for unreachable peers.

Separate Task, not a slice (recorded 2026-10-01 as RSK-001 and kept): the desktop's remote-node access exposes a node's full backend to anyone who can reach it on a shared VPN. A possible fix is an optional owner-pairing step. It is a candidate for its own Task. The Project Task Manager records it when the user wants it.

## Slice 1 — Proposed Task Text (for the Project Task Manager, after approval)

> **Cross-node slice 1: remote delegation, text only** (part of the cross-node parent Task; depends on: none)
>
> Make a node able to hand a text task to a published agent on another node, and let the two runs talk both ways. On each node: a switch for cross-node collaboration (off by default), peer nodes registered by URL and name with their server identity pinned (both nodes register each other; no secret), and the Agents the owner publishes, each with its launch settings on that node. An agent with `delegate_task` delegates a text task to a published Agent on a registered peer and gets the remote run ID back. The peer starts an independent run of it with its own setup. The delegating run and the remote run then message each other by run ID, also after idle shutdown or a restart. Refuse attachments, saved-Task delegation and unrelated targets with clear reasons. No credential crosses nodes. Trusted private network only.
>
> Requirements (approved basis): `requirements-doc.md` REQ-101 … REQ-115, AC-101 … AC-113, decisions DEC-101 … DEC-110, in `tickets/in-progress/cross-node-agent-communication/` of branch `codex/cross-node-agent-communication-r2`.
>
> **Architecture first, with the user** (the user, 2026-10-19: "the main thing is that we should discuss about the architecture … the very first ticket is how do we achieve … the communication itself … we set up the main architecture, main frame"). The Task starts with the architecture design of the inter-node communication frame: the contract between nodes, the remote delegated-run link on both nodes, and run-ID routing across the link (F-2 … F-4). The design also covers the peer and publish settings (F-1). The Solution Designer discusses this design with the user before architecture review and implementation. Best done by the same Solution Designer, which holds the context.
>
> Done when: AC-101 … AC-113 pass, including the user's check across the desktop node and a Docker node, in both directions. Full flow (architecture discussion with the user, architecture review, implementation, code review, API/E2E, delivery).
