# Investigation Notes — one-nodes-tab

## Investigation Meta

- Package identifier: `one-nodes-tab`
- Request / ticket: "One Nodes tab: merge Remote Collaboration into Manage Nodes, with ONE list of nodes added once" (Project Task Manager, 2026-10-22; the user's direction 2026-10-21/22). Follows autobyteus-267 (delivered).
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab`, `codex/one-nodes-tab`
- Resolved base: `origin/personal` @ `ca1f09e52a` (fetched 2026-10-22)
- Finalization target: `origin/personal`
- Bootstrap result: worktree created with `git worktree add -b codex/one-nodes-tab … origin/personal`
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read (requirements gate, 2026-10-22): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md`; (design gate, 2026-10-22): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md`
- Investigation status: complete (requirements and architecture). Current SR: SR-003.

## Initial Request And Clarifications

- Original request: see the Task text quoted in `requirements-doc.md` § Problem. The user: "otherwise it causes a lot of confusion; the user has to add twice". Direction: one tab, Manage Nodes, one list of nodes, each showing both roles; a node is added once.
- Decisions the Task leaves to the user: join the stored lists or only the screens; how the other side registers this node; Memory Sync and Guide tabs; the UI (Product Team designs, user approves).
- Fixed by the Task: B's protection (B decides who may talk to it) and identity pinning stay; collaboration explicit and OFF by default per node and per added node; the own-shared-agents list stays removed (267); slow peers never block (RSK-402); no compatibility code (DESIGN.md rule 9); migration only with approval and a backup; no release unless asked.

## Product And Domain Understanding

- Product area: desktop app / web UI → Nodes page (`NodeManager.vue`).
- Two lists with different owners and different viewpoints:
  - **Desktop list** (owner: the desktop app's main process, `electron/nodeRegistryStore.ts`, file `<userData>/node-registry.v1.json`; in the browser UI `localStorage` key `autobyteus.node_registry.v1`): the nodes whose window this desktop can open. Addresses are as the *desktop* reaches them. One list for all windows of this desktop.
  - **Peer list** (owner: each node's server, `PeerDirectory`, `<data>/remote-collaboration/peers.json`): the nodes *this node's agents* may talk to and accept requests from. Addresses are as *that server* reaches them. One list per node; the page shows the list of the node the window is opened on.
- Terminology: "this node" = the node the window is opened on; "node ID" = the server identity `srv_…` (`serverInstanceId`), pinned at peer registration.

## Source Log

| Date | Type | Source | Why | Finding |
| --- | --- | --- | --- | --- |
| 2026-10-22 | Code | `autobyteus-web/components/settings/NodeManager.vue`, `NodeManagerTabs.vue` | Current page | Six tabs: manage, memorySync, remoteCollaboration, phoneSetup, dockerGuide, nfsGuide (`?nodeTab=` query selects one). Manage = "This node" card, add form (name, URL; capability probe 1.5 s; loopback/http warnings), configured-node list (Open, Rename, Remove; type and probe chip). |
| 2026-10-22 | Code | `RemoteCollaborationCard.vue`, `RemoteCollaborationPeersSection.vue`, `RemoteCollaborationOffer*.vue`, `stores/remoteCollaboration*.ts` | Peer UI | Switch card (`FeatureCapabilityToggleCard`); peer rows (name, URL · node ID, state chip, refresh, Rename, Remove), offer disclosure (267); add form (URL, name) enabled only with the switch on; collapsed "How peers' runs work" rules. Offers asked on tab open, switch on, add, refresh (267 DEC-502). |
| 2026-10-22 | Code | `stores/nodeStore.ts`, `electron/nodeRegistryStore.ts`, `electron/application/electronApplication.ts`, `types/node.ts` | Desktop list | `NodeProfile {id, name, baseUrl, nodeType embedded/remote, capabilities, capabilityProbeState, isSystem, createdAt, updatedAt}`; no node ID (`srv_…`) stored. IPC `upsert-node-registry`, `get-node-registry-snapshot`, `open-node-window`; snapshot broadcast to all windows. |
| 2026-10-22 | Code | `autobyteus-server-ts/src/remote-collaboration/settings/peer-directory.ts`, `domain/peer-node.ts` | Peer registration | `add`: switch must be on; name 1–64 `[A-Za-z0-9 _.-]`, unique; probes `GET <url>/rest/remote-access/status` for `serverInstanceId`; refuses this node itself and a node ID already registered. `PeerNode {nodeId, name, baseUrl, addedAt}`. |
| 2026-10-22 | Code | `channel/peer-gateway.ts` | Admission (CM-12) | Inbound order: toNodeId = me → switch on → `fromNodeId` registered → handler. `fromNodeId` is claimed, not proven (RSK-401, until S6). |
| 2026-10-22 | Code | `channel/peer-client.ts` | Errors | Settings errors: `PEER_UNREACHABLE` ("<url> could not be reached: <fetch message>" → the "fetch failed" the user sees), `PEER_NOT_AUTOBYTEUS`, `PEER_IS_THIS_NODE`, `PEER_ALREADY_REGISTERED`, name errors, `REMOTE_COLLABORATION_OFF`. Runtime refusals: OFF, PEER_NOT_REGISTERED, PEER_UNREACHABLE, PEER_IDENTITY_MISMATCH. Timeout 20 s. |
| 2026-10-22 | Code | `autobyteus-server-ts/src/server-addressing/server-address-candidate-service.ts` (GraphQL `listMemoryHubUrlCandidates`) | Can a node say how others reach it? | Yes, an existing owner lists a node's own candidate addresses: configured URL, `host.docker.internal:<port>` when the configured host is loopback, and interface addresses. |
| 2026-10-22 | Code | `compositions/build-studio-server.ts:373` | Can the window call another node directly? | CORS `origin: true`: a window can call any node's API (the capability probe already does). |
| 2026-10-22 | Code | `utils/nodeHostValidation.ts` | Existing hint | Warns "loopback … only reachable from the same machine" in the desktop add form; nothing in the peer form. |
| 2026-10-22 | Code | `MemorySyncCard.vue` | Third tab | Memory Sync configures this node as a memory hub (tokens, imported sources) and/or a source (hub URL + token, background sync). It keeps no list of nodes in the sense of the two lists above; it is a separate, token-based relationship. |
| 2026-10-22 | Doc | `autobyteus-server-ts/docs/design/collaboration_model.md` CM-10…CM-12 | Contract | Requests only while the switch is on, only from registered peers; offer = shared Agents/Teams; one inbound entry point where authentication is added later. |
| 2026-10-22 | Doc | `tickets/done/remote-nodes-page/*` (267), `tickets/done/remote-discovery/design-spec.md` (261, RSK-401/402), `tickets/done/cross-node-agent-communication/*` (191) | Prior decisions | 267: own-entries card removed by the user; peers asked on open/add/switch-on/refresh; reasons localized from refusal codes. |

## Relevant Existing Behavior And Supported Product Paths

| ID | Kind | Trigger | Current path | Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-701 | User | Nodes → Manage Nodes → Add Remote Node | Name + URL; window probes health (1.5 s), saves desktop entry | Node can be opened; agents know nothing of it | NodeManager.vue | Read |
| BEH-702 | User | Nodes → Remote Collaboration → add peer | Switch must be on; server probes identity, pins `srv_…`, saves peer | This node's agents can address it (once the peer registers this node too) | peer-directory.ts | Read |
| BEH-703 | User | Using one node both ways | Same node entered in Manage Nodes and in Remote Collaboration on each side (up to 4 entries per pair) | Duplicated entries with different names | Measured on the user's data (below) | Measured |
| BEH-704 | User | Peer row state | Availability asked by this node's server; "Not registered there … Register this node there." with no action | User must open the other window and register by hand, with an address valid *from that node* | RemoteCollaborationPeersSection.vue; localization | Read |
| BEH-705 | User | Wrong address in the peer form | "… could not be reached: fetch failed." | No cause, no hint | peer-client.ts `fetchServerInstanceId` | Read |
| BEH-706 | User | Switch | Remote Collaboration card switch, default off (`DEFAULT_DISABLED`) | — | RemoteCollaborationCard.vue | Read |

## Runtime, Probe, Or Reproduction Findings (read-only on the user's live setup)

| Method | Observation | Established |
| --- | --- | --- |
| `node-registry.v1.json` read with `python3 -I` | Desktop list: Embedded `http://127.0.0.1:29695`; `http://localhost:8001` (name = URL); `http://localhost:8003` (name = URL). | Measured |
| `curl <node>/rest/remote-access/status` for 8001, 8003, 50433, 29695 | Each answers its own `srv_…`. | Measured |
| GraphQL `{ peerNodes }` on 29695, 8001, 8003 | Desktop node: peer "docker" = `http://localhost:8001` (`srv_ibJio…`, the same node as desktop entry `http://localhost:8001`). Docker 8001: peer "electron" = `http://host.docker.internal:29695` (`srv_m9VF…` = desktop node). 8003: none. So the pair desktop↔8001 today occupies 3 entries with 3 names ("http://localhost:8001", "docker", "electron"). | Measured |
| GraphQL `listMemoryHubUrlCandidates` on 29695 and 8001 | Desktop: `127.0.0.1:29695`, `host.docker.internal:29695`, LAN addresses. Docker 8001: `localhost:8001`, `host.docker.internal:8001`, `172.17.0.4:8001` (wrong: container port is 8000). | Measured |
| `docker exec autobyteus-server-0 curl host.docker.internal:29695/…status`, `…:8003/…status` | Both answer from inside a container (desktop node and another Docker node through its published port). | Measured |
| `curl http://host.docker.internal:8001/…` on the Mac host | Does not resolve (`000`). | Measured |

Conclusion: a node's address depends on who calls, and no single address works for every caller. Candidate addresses verified by node ID can find the right one per caller without the user typing it.

- Temporary diagnostics: none.
- Reproduction for implementation: none needed (no defect; new behavior).

## Persisted Data And State Facts

- Desktop list: `<userData>/node-registry.v1.json` (rewritten whole on every change, version counter; loader drops invalid entries); browser: `localStorage`. Few entries (3 on the user's desktop).
- Peer list: per node `<data>/remote-collaboration/peers.json`, only `PeerDirectory` reads/writes. 0–1 entries per node today.
- Must be preserved: every existing desktop entry (opens as before) and every existing peer (agents keep delegating with the same name; pinned node ID unchanged).
- The same node is in both lists today (desktop entry `http://localhost:8001` and peer "docker" on the desktop node); names differ.

## Supplemental Artifact Inventory

| Path | Owner | Purpose | Status |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/one-nodes-tab/ui-ux-spec.md` + `visual-references/` (VIS-001…031), `product-ticket.md`, `design-change-log.md`, `design-assumptions.md` | Product Team (external) | Approved UI/UX package, normative UI | Approved by the user 2026-10-23 (SR-006) |
| `ui-sketch.md` rev 3 | Solution Designer | Earlier markdown UI | Superseded at SR-006; history |
| `handoff-product-design.md` | Solution Designer | Product Design request | Done |
| `design-review-report.md`, `architecture-review-revision-record.md` | Architecture reviewer | ARCH-REV-001 | Round 1 Fail; findings resolved at SR-004/SR-006 |
| `evidence/probes/*.mjs` | Solution Designer | Node fetch error shapes (disposable probes kept as evidence) | Evidence |
| `follow-ups.md` | Solution Designer | FU-001, FU-002 | Not yet sent |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution |
| --- | --- | --- | --- |
| RSK-701 | Risk | Registering this node on B from the window is an unauthenticated API call to B, like every settings call today (trusted private network, RSK-401). The protection "B decides" is the owner's explicit action, not a proof of identity. | Accepted under the trusted-network direction until the security slice; stated in the UI copy. |
| UNK-701 | Unknown | Whether a node can tell it runs in a container (for the Docker address hint). | Architecture (e.g. the configured loopback host plus the candidate service's Docker alias). |
| UNK-702 | Unknown | Browser UI (no desktop app): the desktop list is `localStorage` and Open is unavailable; the one-step registration of the other side works when the browser can reach it. | Architecture; requirements keep today's browser behavior plus the merged list. |

## Requirement Implications

- One list must be keyed by node identity (`srv_…`), not by URL: the same node has different URLs in the two lists (measured).
- "Register the other side in one step" is feasible without a new trust mechanism: the window reaches both nodes, and each node's server verifies the other's identity; the right return address can be found from the node's own advertised candidates, tried by the registering server and accepted only when the node ID matches.
- The stored lists have different owners and viewpoints; merging them into one store would put addresses valid for one caller where another caller needs different ones.

## Architecture Investigation Findings (2026-10-22)

| Method | Observation | Established |
| --- | --- | --- |
| `node evidence/probes/fetch-causes.mjs`, `refused.mjs` (Node 22) | Refused → `TypeError: fetch failed`, `cause.code ECONNREFUSED` (for `localhost`: `AggregateError` with `errors[].code`); unknown host → `cause.code ENOTFOUND`; black hole with `AbortSignal.timeout` → `TimeoutError`. Port 9 is blocked by fetch itself ("bad port"), so use another port in tests. | Measured |
| `docker exec autobyteus-server-0 test -f /.dockerenv` | Present | Measured |
| `api/graphql/types/remote-collaboration-settings.ts` | Settings errors → `GraphQLError` with `extensions.code`; `peerNodeOffer` returns `refusalCode` only | Read |
| `electron/application/electronApplication.ts:182-235` | Registry changes `add`, `remove`, `rename` with an exhaustive `never` switch; whole-snapshot write | Read |
| `grep capabilities, capabilityProbeState` (web) | `capabilities` never read; `capabilityProbeState` only by the Manage Nodes chip; `nodeCapabilityProbe.ts` and `nodeHostValidation.ts` only called by the add form | Read |
| `plugins/30.apollo.client.ts` | `buildBoundApolloClient` adds remote-access headers and pushes every error to `uiErrorStore` | Read |
| `stores/nodeStore.ts addRemoteNode` | Electron: add then `openNodeWindow` (preserved) | Read |
| `grep nodeTab` | Only `NodeManager.vue` uses `?nodeTab=` | Read |

## Notes For Architecture Design

See [design-spec.md](design-spec.md): joining by node ID with a lazily learned `serverInstanceId`; resolution of addresses on the registering server; a window-driven plan on both nodes; classified causes plus a server-computed Docker hint.
