# Requirements Document — one-nodes-tab

## Document Status

- Status: `Approved` (SR-006). The user approved the Product Team's UI/UX package ("i think we are ready. approved", 2026-10-23), together with the requirement impacts decided in that review, which are applied here (marked SR-006). DEC-709 is decided as option (b). The user delegated it ("you decide"), and the Solution Designer had recommended (b).
- Current solution revision ID: `SR-006`
- Package identifier: `one-nodes-tab`
- Request / ticket: "One Nodes tab: merge Remote Collaboration into Manage Nodes, with ONE list of nodes added once" (after autobyteus-267)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-10-22 (updated 2026-10-23)
- Approved by and reference: **User**. 2026-10-22: DEC-701 … DEC-704 ("Just make the UI clean. If you think the UI is clean, then we can start working on it now."). 2026-10-23: the Product Team's UI/UX package and its requirement impacts ("i think we are ready. approved"). DEC-709 (b) was delegated to the designer ("you decide").
- Exact approved requirements baseline: this document at SR-006 (SR-007 changed no requirement).
- Behavior-defining supplements: the Product Team's approved UI/UX package `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/one-nodes-tab/ui-ux-spec.md` with `visual-references/` VIS-001…VIS-031 (the user: "i think we are ready. approved", 2026-10-23; SR-006). `ui-sketch.md` is superseded history: it was the UI basis at SR-002, when the user asked for a markdown UI.
- Investigation: [investigation-notes.md](investigation-notes.md)

## Problem And Desired Outcome

- Problem: the Nodes page keeps two lists of the same nodes in two tabs. Manage Nodes is the desktop app's list (which node windows can be opened). Remote Collaboration → Peer nodes is the server's list (which nodes this node's agents may use, and accept requests from). To use one Docker node both ways, the user enters it up to four times (once to open it, once on each side to collaborate), with an address that must be right *for the node that calls*, and gets "fetch failed" when it is not. On the user's desktop today, the pair desktop ↔ Docker 8001 is three entries with three names ("http://localhost:8001", "docker", "electron").
- Affected actors: the owner of the desktop app and his nodes (desktop node, Docker nodes, other machines on his private network).
- Desired outcome: one tab, Manage Nodes, with one list. Each node appears once and shows both roles: open its window, and collaborate with it. A node is added once; making collaboration work in both directions is one explicit step; each row says clearly what works and what is missing; a wrong address gets a clear cause and hint.
- Observable definition of success: the user adds a Docker node once, turns collaboration on for it in one step, and agents on both nodes can delegate to each other; his existing entries keep working and show once.

## Relevant Current And Desired Behavior

| ID | Kind | Scenarios | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-701 | User | SCN-701 | Manage Nodes: add a node (name, URL) to open its window; adding opens its window at once | The one add form adds the node to the list. **Collaboration is on by default in the form and is always confirmed once** (SR-006, the user). **Adding does not open the node's window**; Open does (SR-006, the user) | Open; the embedded node entry; adding a node that is not reachable now (it is added, and its row shows the cause). The capability probe's role is kept by the identity probe and the row's dot; its unused stored fields go (SR-004) | NodeManager.vue |
| BEH-702 | User | SCN-702 | Remote Collaboration: add a peer (URL, name) on this node's server; switch must be on | Collaboration is turned on per node from its row (or the add form); no separate peer form | Identity pinning; the switch gate; name rules | peer-directory.ts |
| BEH-703 | User | SCN-703 | Same node in both lists, shown twice under different names | One row per node (by node ID), both roles on it | Both stored lists keep working | Measured, investigation notes |
| BEH-704 | User | SCN-702 | "Not registered there … Register this node there." — the user must open the other window and type this node's address *as seen from there* | One step registers both sides; each direction has its own clear status | B accepts only nodes registered on B | RemoteCollaborationPeersSection.vue |
| BEH-705 | User | SCN-704 | "could not be reached: fetch failed" | The cause is named, with a hint for loopback addresses on a Docker node | — | peer-client.ts |
| BEH-706 | User | SCN-705 | This node's switch is in the Remote Collaboration tab | It moves into Manage Nodes (a section of the same tab), with its explanation and the "How peers' runs work" rules | Default off; its meaning | RemoteCollaborationCard.vue |
| BEH-707 | User | SCN-701 | Expanded peer shows its offer (267) | **Once collaboration with a node is on**, its row shows the 267 summary line ("7 Agents · 2 Agent Teams  names…") under the bar; clicking it opens the list and the connection details (SR-006) | 267's timing (open, add, switch on, refresh), no polling, 20 s bound; no list of this node's own shared agents | 267 requirements |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required outcome | Constraint |
| --- | --- | --- | --- |
| Owner (the user) | Manage all his nodes in one place | Add once, one step for collaboration, clear status | Trusted private network only (RSK-401) |
| Agents on each node | Delegate to registered peers | Peers keep the same names and pinned IDs | CM-12 unchanged |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-701 | See all nodes in one list, each once, with its status, collaboration state and offer | SCN-701, SCN-703 |
| UC-702 | Add a node once; optionally collaborate with it | SCN-701 |
| UC-703 | Turn collaboration with a node on or off in one step, both directions | SCN-702 |
| UC-704 | Understand a wrong or unreachable address and fix it | SCN-704 |
| UC-705 | Turn this node's remote collaboration on or off from Manage Nodes | SCN-705 |
| UC-706 | Rename and remove a node from its one row | SCN-706 |

### Out Of Scope

- Peer authentication / secrets (security slice S6); RSK-401 stays as accepted.
- What a peer offers and how remote runs work (CM-10…CM-12, 245/247/261 unchanged); the agent tools.
- Memory Sync's hub/source relationship and its tokens (unless the user decides otherwise in DEC-703, it stays a tab unchanged); Phone Setup; the Docker and NFS guides' content.
- Starting or messaging remote runs from the page.
- A release (only if the user asks).

### Non-Goals

- No list of this node's own shared agents or readiness flags (removed by the user in 267).
- No polling or live updates; no cache of peers' offers.
- No compatibility code between versions (DESIGN.md rule 9); both nodes run the same release.

### Preserved Behavior Boundary

- Opening a node window; the embedded node entry; capability probe.
- Peer identity pinning, name rules (they are the `node` value agents use), "this node itself" and "already registered" refusals.
- With this node's switch off, no request goes to any peer, and the page asks none (267 REQ-508).
- 267's offer display and timing (REQ-501…REQ-504, REQ-507, REQ-509, REQ-510) and its localized reasons.
- Existing desktop entries and existing peers keep working without a manual step.

### Prerequisites

None found.

### Review Authority

- Every blocking finding cites an approved REQ, AC or preserved-behavior ID.
- New product behavior, policy, migration obligation or compatibility promise is a `Requirement Gap` needing the user's approval.
- Adjacent concerns are follow-ups (`follow-ups.md`).
- The user decides scope and the UI (the Product Team's package, which he approves); the Solution Designer decides within the direction.

## Requirements

| ID | Requirement | Behavior | Priority | Rationale / source |
| --- | --- | --- | --- | --- |
| REQ-701 | The Nodes page has no Remote Collaboration tab. Everything it had (this node's switch and explanation, the peers, their states and offers, the rules) is in Manage Nodes. The other tabs follow DEC-703. | BEH-706 | Must | The user's direction |
| REQ-702 | Manage Nodes shows one list of nodes: every node in the desktop list and every peer of this node, each node once, identified by its node ID (`srv_…`). The node the window is opened on is shown as "this node", without collaboration actions. A node whose identity is not known yet (never reached) is shown as its own row until it is reached. | BEH-703 | Must | Same node has different URLs in the two lists (measured) |
| REQ-703 | Each row shows: its name (click to rename); whether it is reachable now (dot); its remote-collaboration switch; Open (when this window can open it); Remove; at most one line with one fixing button when something needs the owner; and, once collaboration is on, the summary of what it offers, which opens the list and the connection details (SR-006). A node's Agents and Teams are not shown before collaboration with it is on. | BEH-701, BEH-707 | Must | Task; Product package |
| REQ-704 | Adding a node is one always-visible form (address, name, the remote-collaboration switch, **on by default**). With the switch on and the node reachable, adding opens the one confirmation (REQ-705); nothing changes on any node before the owner confirms. Cancel leaves the node listed, not collaborating. With the switch off, the node is only listed. An unreachable node is added and its row shows the cause; no confirmation opens. Adding does not open the node's window. A node already in the list (same address, or same node ID) is not added again: "This is X, already in your list." Success shows no notice. (SR-006: changed from off by default, by the user.) | BEH-701, BEH-702 | Must | Task; the user, Product review 2026-10-23 |
| REQ-705 | Turning collaboration on for a node is one explicit step that, after one confirmation listing exactly what will change, registers the node on this node and registers this node on that node, each with an address that works *for the node that calls* and the other's pinned node ID (DEC-702). If that node's switch is off, the confirmation says so and turning it on there is part of what the user confirms. Turning collaboration off removes both registrations (where reachable) and says what could not be removed. | BEH-704 | Must | Task: register once; B's protection stays |
| REQ-706 | Each node's connection details show both directions (this node → it, it → this node) with working / the reason and the address used. The row shows one line with one fixing button for: off there [Turn on there]; not registered there [Register this node there]; a different node at its address (red dot) [Change address]; not reachable, with its cause [Check again]; a step not finished [Try again]; registered only by the other node [Turn on]; not collaborating [Turn on]. Checking shows a spinner dot and "up to 20 seconds". Every button that changes another node opens the confirmation first. With this node's switch off, rows show no warnings. (SR-006) | BEH-704 | Must | Task; Product package |
| REQ-707 | Errors name the cause: not reachable (with the network reason in plain words: refused, timed out, name not found), not an AutoByteus node, this node itself, a different node than registered (identity mismatch), not registered there, collaboration off there. "fetch failed" alone is never shown. | BEH-705 | Must | Task |
| REQ-708 | When an address with `localhost`/`127.0.0.1` would be used by a node running in Docker, the page explains that inside Docker it means the container, and suggests `host.docker.internal:<port>` or the host's LAN address. | BEH-705 | Must | Task; measured |
| REQ-709 | This node's remote collaboration switch, its explanation and "How peers' runs work" are a section of Manage Nodes. Default off. With it off, no peer is asked and the rows say collaboration is off on this node; turning collaboration on for a node while it is off includes turning it on (in the same confirmation). | BEH-706 | Must | Task |
| REQ-710 | Rename (click the name) renames the node once: the name shown everywhere for it, including the name agents use (`node`), with the peer name rules; the embedded node's name is not editable. Remove (trash icon) confirms first, listing what is removed: the node from this node, **this node from the other node when collaborating and it can be reached** (SR-006), and the node from the list. When the other node can't be reached, the list entry is still removed and the result says this node stays registered there. The node and its data are not touched. | BEH-701, BEH-702 | Must | One row = one node; Product package |
| REQ-711 | Existing desktop entries and peers keep working after the upgrade with no manual step and no rewrite of the user's data beyond what DEC-701 approves; a node present in both lists today shows once (REQ-702). | BEH-703 | Must | Task: data continuity |
| REQ-712 | Slow or unreachable nodes never block the page or other rows (each bounded by 20 s); nothing polls. | BEH-707 | Must | RSK-402; 267 QR-501/502 |
| REQ-713 | The same works in a window opened on a Docker node ("this node" is then the Docker node) and in both languages (English, Chinese). | all | Must | 267 REQ-509 |
| REQ-714 | Docs describe the one tab: web `docs/settings.md`, server `docs/modules/remote_collaboration.md`; and the Docker guide where it explains addresses. | — | Must | Done criteria |

## Acceptance Criteria

| ID | REQ | Scenario | Given / When | Then | Failure / alternate | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-701 | REQ-701, REQ-709 | SCN-705 | The Nodes page opens | There is no Remote Collaboration tab; the switch with its explanation is in Manage Nodes; default off | — | Component tests; user check |
| AC-702 | REQ-702, REQ-711 | SCN-703 | The user's current data (desktop entry `http://localhost:8001` and peer "docker" = same node) | One row for that node, both roles shown; 8003 one row; the desktop node is "this node" | A node never reached shows as its own row | E2E with two servers; user check |
| AC-703 | REQ-704 | SCN-701 | Add a node with the form's switch off; and add one with it on, then Cancel | It appears once, can be opened, its window does not open on add; it is not registered on either side; no notice | A node already listed (address or node ID) → "This is X, already in your list.", nothing added; unreachable → added with its cause, no confirmation | E2E (peers.json unchanged on both) |
| AC-704 | REQ-705, REQ-706 | SCN-702 | Desktop window, Docker node in the list, both switches on, nothing registered; "Collaborate" → confirm | Both sides registered, the Docker side with an address that reaches the desktop from inside the container (e.g. `host.docker.internal:<port>`), pinned IDs right; both directions show working; agents on each side can list the other's agents | The other node's switch off → the confirmation includes turning it on; the other node unreachable from here → nothing half-done is hidden: the row shows which side is missing and the fixing action | E2E two servers (one in Docker for the address case); user check |
| AC-705 | REQ-705 | SCN-702 | Collaboration on; "Stop collaborating" | Both registrations removed; the node stays in the list and can be opened | Other side unreachable → says this node is still registered there | E2E |
| AC-706 | REQ-706 | SCN-702 | Four peers in 261's four states and one waiting | Each row shows each direction's state, at its own pace; missing parts show the fixing action | — | Component tests; E2E |
| AC-707 | REQ-707, REQ-708 | SCN-704 | A node running in Docker can't find an address for another node and the first address it tried is loopback: for example, Change address with `http://127.0.0.1:<desktop port>`, or a node that advertises no address the container can reach (refined in SR-004; the add form's address is the desktop's, where loopback is right) | The page explains loopback inside Docker and suggests `host.docker.internal:<port>`; "Use this" retries with it; a refused/timeout/DNS/identity case each names its cause | No "fetch failed" alone | Component + E2E |
| AC-708 | REQ-710 | SCN-706 | Rename a collaborating node | One name everywhere; agents use the new name with `node` | Invalid name → the peer rule's message | E2E |
| AC-709 | REQ-710 | SCN-706 | Remove a collaborating node | Confirmation says what is removed; afterwards no entry for it on this desktop/this node (and on the other side when chosen/reachable) | — | E2E |
| AC-710 | REQ-712, BEH-707 | SCN-701 | A black-holed peer | Waiting then not reachable after ~20 s; other rows and the page usable; offers shown per 267 timing | — | E2E |
| AC-711 | REQ-713 | all | The user's desktop and Docker nodes | He manages all nodes in one tab, adds once, collaboration both ways works | — | User check |
| AC-712 | REQ-714 | — | — | Docs updated | — | Review |
| AC-713 | Preserved | — | — | 267 offer tests, peer refusals and agent tool results unchanged; Open unchanged | — | Existing tests |

## Relevant Scenarios And Journeys

| ID | Kind | Actor | Goal | Trigger | Start | Steps | Outcome | Alternate | Validity | Evidence | REQ/AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-701 | User | Owner | Add a node | Manage Nodes → add | Node running | Enter address and name; leave or tick collaborate; add | One row; open works; collaboration only if ticked | Already listed; unreachable (cause named) | Supported Normal | Task; BEH-701 | REQ-702…704, AC-703 |
| SCN-702 | User | Owner | Let agents on both nodes work together | Row → Collaborate | Node in list | Confirm what will change; both sides registered | Both directions working | Other switch off; other side unreachable; stop collaborating | Supported Normal | Task; 191 mutual registration (user, 2026-10-19) | REQ-705, 706, AC-704…706 |
| SCN-703 | User | Owner | See existing nodes after the upgrade | Opens Nodes | Same node in both lists | — | One row per node | Unreached node separate until reached | Supported Normal | Measured user data | REQ-702, 711, AC-702 |
| SCN-704 | User | Owner | Fix a wrong address | Add/collaborate fails | Docker window, loopback address | Read cause and hint; correct | Works | — | Supported Normal | Task; measured | REQ-707, 708, AC-707 |
| SCN-705 | User | Owner | Turn this node's collaboration on/off | Manage Nodes switch | — | Toggle | Rows update | — | Supported Normal | 191/267 | REQ-709, AC-701 |
| SCN-706 | User | Owner | Rename / remove a node | Row actions | — | Rename / confirm removal | One name / gone | Invalid name | Supported Normal | Task | REQ-710, AC-708/709 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`.
- **UI authority (SR-006): the Product Team's approved package.** It replaces `ui-sketch.md`, which stays as history only.
  - UI/UX spec: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/one-nodes-tab/ui-ux-spec.md` (Approved). Journeys UXJ-701…710, transitions TR-701…715, surfaces UIS-001…006, states, the copy (`localization/messages/{en,zh-CN}/nodesPage.ts` in the reference), validation, responsive, accessibility.
  - Final visual references: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/one-nodes-tab/visual-references/` VIS-001…VIS-031. Every visible detail is normative except what the spec marks illustrative (node names, addresses, IDs, agent names, delays).
  - Design repository: `/Users/normy/autobyteus_org/autobyteus-web-design`, `personal` @ `feed5c653e31692235c64680e7963e73afd27f6e` (design result `371e2ef0510d6b0dae471e63bd49f48d357e6cf6`); ticket record `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/one-nodes-tab/product-ticket.md`; runnable reference: repository root, `corepack pnpm dev --port <port>`, `/nodes?nodeTab=manage`, runbook `ui-reference-runbook.md` § `one-nodes-tab`.
  - The user's confirmation: "i think we are ready. approved", 2026-10-23, after 8 review rounds (DC-701…DC-723).

## Quality And Non-Functional Requirements

| ID | REQ/AC | Area | Constraint | Verification |
| --- | --- | --- | --- | --- |
| QR-701 | REQ-712, AC-710 | Performance | No node request blocks the page or another row; each ≤ 20 s | E2E |
| QR-702 | REQ-704, REQ-705 | Security | Collaboration never turns on (here or there) without the user's explicit confirmation; trusted network only (RSK-401/RSK-701 stated in the UI) | Tests + review |
| QR-703 | REQ-713 | Accessibility / i18n | Keyboard and screen-reader states as 267; English and Chinese | Component tests |

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes` — the desktop list (`node-registry.v1.json` / `localStorage`) and each node's `peers.json` may receive additions (e.g. a desktop entry remembering its node's ID) as the user acts; DEC-701 decides whether the stored lists are joined.
- Must be preserved: every desktop entry and every peer, names and pinned IDs.
- Acceptable loss: none.
- Constraints: any rewrite of existing user data only with the user's approval and a backup first; nothing registered twice after the upgrade; no compatibility code.

## External Contracts And Dependencies

| Contract | Constraint | Evidence |
| --- | --- | --- |
| CM-12 (mutual registration, switch, identity) | Unchanged | collaboration_model.md |
| `GET /rest/remote-access/status` (`serverInstanceId`) | Used to identify nodes | peer-client.ts |
| Server address candidates (`ServerAddressCandidateService`) | A node lists how others may reach it | Measured |

## Assumptions

| ID | Assumption | Status |
| --- | --- | --- |
| ASM-701 | The window can reach the nodes in the desktop list (it opens them), so it can ask both nodes' servers in one step | Supported by CORS `origin: true` and the existing probe |
| ASM-702 | The user operates both nodes he connects (his desktop and his Docker nodes) | The Task's scenario; DEC-702 covers other owners |

## Decisions

| ID | Question | Why it matters | Options / evidence | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-701 | Join the stored lists, or only the screens? | Data migration, ownership | (a) One stored list. (b) Keep both stores with their owners; the screen joins them by node ID; a desktop entry may remember its node's ID when it learns it. | The two lists answer different questions from different places: the desktop list is "which windows can *this desktop* open" (addresses as the desktop reaches them); a peer list is "whom *this node's agents* may use" and must live on that node, which works without the desktop (measured: the desktop reaches Docker 8001 as `localhost:8001`, the Docker node reaches the desktop only as `host.docker.internal:29695`, and the Mac cannot resolve `host.docker.internal`). One stored list would hold addresses that are wrong for one of the callers. Joining by node ID shows your existing duplicate (8001) once with no migration and no backup needed. **Recommend (b): join the screens, not the stores.** | User | Decided: approved as recommended (2026-10-22) |
| DEC-702 | How does the other side register this node? | Register once; B's protection | (a) One step from the row: the window asks both servers; each verifies the other's node ID; the other side's address is found from this node's own advertised addresses (tried by that node, kept only when the ID matches). (b) A request to B that B's owner approves in B's window ("node X wants to collaborate: allow?"). (c) A code/instruction to enter on the other side. | You run both nodes yourself, and your desktop already reaches both; today you open B's window and register by hand, so (a) is the same owner decision in one click, with a confirmation that names B and what changes. (b) adds a pending-request store and a second visit to B, and gives no extra security until peers are authenticated (anyone on the network can already call B's settings, RSK-401). (c) still means typing on the other side. **Recommend (a)** now, with the row's fixing action when B can't be reached; (b) can come with the security slice for nodes owned by someone else. | User | Decided: approved as recommended (2026-10-22) |
| DEC-703 | What happens to Memory Sync, Phone Setup and the Docker/NFS guides? | Scope | Keep as tabs, or make sections of one page | None of them keeps a list of nodes: Memory Sync is a token-based hub/source relationship; Phone Setup pairs phones; the guides are instructions. The confusion is the two node lists. **Recommend: remove only the Remote Collaboration tab; keep the other tabs as they are** (Manage Nodes, Memory Sync, Phone Setup, Docker Guide, NFS Guide), and link the Docker guide from the address hint. | User | Decided: approved as recommended (2026-10-22) |
| DEC-704 | Does turning collaboration on also turn on the *other* node's switch, and turning it off remove this node from the other side? | Explicit choice on both nodes | Ask separately on B / include in the one confirmation | Requiring a second visit to B undoes "one step"; doing it silently breaks "explicit". **Recommend: one confirmation that lists every change, including "turn on remote collaboration on B (it is off)"; "Stop collaborating" removes both registrations** but never turns B's switch off (other peers may use it). | User | Decided: approved as recommended (2026-10-22) |
| DEC-705 | Which name does a row show when the two lists name the node differently (e.g. "http://localhost:8001" vs "docker")? | One row, one name | Desktop label / peer name | The peer name is what agents use (`node`) and what message headers show; the desktop label is often just the URL. **Decided: show the peer name when the node is a peer, the desktop label otherwise; Rename sets both.** No silent rewrite of existing labels. | Solution Designer | Decided |
| DEC-706 | Peers of this node that are not in the desktop list | One list | Hide / show | Hiding them would hide nodes agents can use. **Decided: show them; Open appears once this window reaches the node's address, and the first Open adds a desktop entry** (Product package, SR-006). | Solution Designer; confirmed in the user-approved package | Decided |
| DEC-707 | Collaboration choice in the add form | Off by default | — | Was: off by default. **Changed by the user in the Product review (SR-006): on by default, always confirmed once**; untick to only list and open. His reason: people add a node expecting agents to use it, and a separate toggle confused them. QR-702 still holds: nothing changes on any node without the confirmation. | User | Decided |
| DEC-709 | (Architecture review AR-001) May a node whose remote collaboration is **off** check another node's address (a GET of its public identity page) so the confirmation can show the address before anything is turned on? | 191 REQ-101 says an off node sends no cross-node requests; today adding a peer needs the switch on | (a) Allow identity-only checks while off, and document it. (b) Keep "off" strict: a side checks addresses only once its switch is on; the confirmation then says "8003 finds this node's address once collaboration is on". | Off is every node's default. Under (a), every node in that default state would fetch addresses that anyone on the network sends it. That isn't harmful by itself, but it weakens what "off" means for a small convenience. Under (b), the only cost is that the address line appears after the run (in the expanded row) when that side is being turned on; when both switches are already on, the confirmation still shows it. **Recommend (b).** | User (delegated: \"you decide\") | Decided: (b), SR-006 |
| DEC-708 | When are nodes asked for state/offer? | 267's user decision | — | **Decided: keep 267 DEC-502** (on open, on add, on switch on, refresh per node); reachability uses the existing probe; nothing polls. | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-701 | UC-705 | BEH-706 | AC-701 | SCN-705 |
| REQ-702 | UC-701 | BEH-703 | AC-702 | SCN-703 |
| REQ-703 | UC-701 | BEH-701, 707 | AC-702, AC-710 | SCN-701 |
| REQ-704 | UC-702 | BEH-701, 702 | AC-703 | SCN-701 |
| REQ-705 | UC-703 | BEH-704 | AC-704, AC-705 | SCN-702 |
| REQ-706 | UC-703 | BEH-704 | AC-704, AC-706 | SCN-702 |
| REQ-707, REQ-708 | UC-704 | BEH-705 | AC-707 | SCN-704 |
| REQ-709 | UC-705 | BEH-706 | AC-701 | SCN-705 |
| REQ-710 | UC-706 | BEH-701, 702 | AC-708, AC-709 | SCN-706 |
| REQ-711 | UC-701 | BEH-703 | AC-702 | SCN-703 |
| REQ-712 | UC-701 | BEH-707 | AC-710 | SCN-701 |
| REQ-713 | all | all | AC-711 | all |
| REQ-714 | — | — | AC-712 | — |

## Architecture Phase Input

- Scenarios to map: SCN-701 … SCN-706.
- Constraints: CM-12 unchanged; each list keeps its owner unless DEC-701 says otherwise; identity by node ID; 20 s bound; no polling; no compatibility code.
- Deferred to architecture: who orchestrates "connect both sides" (window vs this node's server), how the other side's address is chosen (candidates verified by ID), how desktop entries learn their node ID, Docker detection for the hint, error-cause mapping from the transport error, tab removal.
- Facts to verify: the candidate service's ordering and wrong LAN candidates in containers (measured `172.17.0.4:8001`); browser-UI behavior.
- Risks: RSK-701 (unauthenticated registration call, accepted under RSK-401).

## Readiness Check

### Content Ready For Approval

- Current behavior evidence-backed: `Yes`
- Desired and preserved behavior explicit: `Yes`
- Scope and non-goals clear: `Yes`
- Requirements and ACs testable and traceable: `Yes`
- Scenarios covered with validity and evidence: `Yes`
- Product design integrated: `Yes`: the Product Team's approved package, SR-006 (see § UI, Interaction, And Experience Requirements)
- Decisions visible with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none.

### Approved Basis Ready For Design

- Approval recorded: `Yes` (the user, 2026-10-22; with the Product package and its requirement impacts, 2026-10-23, SR-006)
- Approved requirements ready for architecture: `Yes`
