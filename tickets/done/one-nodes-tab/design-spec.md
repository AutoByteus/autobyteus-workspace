# Design Spec — one-nodes-tab

## Solution And Approval Basis

- Current solution revision ID: `SR-007` (ARCH-REV-002 findings AR-007 … AR-010 resolved; SR-006 integrated the Product Team's approved UI and decided DEC-709 (b))
- Approved requirements baseline: [requirements-doc.md](requirements-doc.md) at SR-006, approved by the user. DEC-701 … DEC-704 were approved on 2026-10-22. The Product Team's UI/UX package, with its requirement impacts, was approved on 2026-10-23 ("i think we are ready. approved"). DEC-709 (b) was delegated to the designer by the user ("you decide").
- Behavior-defining supplements: the Product Team's approved UI/UX package `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/one-nodes-tab/ui-ux-spec.md` with `visual-references/` VIS-001…VIS-031 (design repo `personal` @ `feed5c6`; the user: "i think we are ready. approved", 2026-10-23). `ui-sketch.md` is superseded.
- Design status: `Ready` (SR-007)
- Investigation notes: [investigation-notes.md](investigation-notes.md) (architecture findings under § Architecture Investigation Findings).
- Authorities read (2026-10-22): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repository root), `autobyteus-server-ts/docs/design/data_migration_guideline.md` §§ 1–3, `autobyteus-server-ts/docs/design/collaboration_model.md` CM-10…CM-12, `autobyteus-web/AGENTS.md`, `autobyteus-server-ts/AGENTS.md`. `design-examples.md` not used.
- Conflicts or discrepancies: none.

## Current-State Read

- **Desktop list.** The desktop app's main process owns it (`electron/application/electronApplication.ts` `applyNodeRegistryChange`, `electron/nodeRegistryStore.ts`, `node-registry.v1.json`). The renderer reaches it through `stores/nodeStore.ts` (IPC `upsert-node-registry` with changes `add`, `remove` and `rename`). In the browser it is kept in `localStorage`. An entry knows its address as the desktop reaches it, but not its node ID. `capabilities` and `capabilityProbeState` are written once at add time; only the Manage Nodes chip reads `capabilityProbeState`, and nothing reads `capabilities`.
- **Peer list.** Each node's server owns it: `PeerDirectory` with `peers.json`. GraphQL `RemoteCollaborationSettingsResolver` exposes `peerNodes`, `addPeerNode {baseUrl, name}`, `renamePeerNode`, `removePeerNode`, `peerNodeOffer`, and the switch. `add` probes `/rest/remote-access/status` through `PeerClient.fetchServerInstanceId` and pins the node ID. A transport failure becomes `PEER_UNREACHABLE` with the raw message ("fetch failed").
- **Page.** `NodeManager.vue` (381 lines) owns the tabs and the whole Manage panel inline: add form, list, rename and remove. `RemoteCollaborationCard.vue` and `RemoteCollaborationPeersSection.vue` own the peer UI. `remoteCollaborationOffersStore` asks this node's server for each peer's offer (267, by token, no polling).
- **What the target can reuse:**
  - The window can call any node's API: CORS `origin: true`, and the window already probes nodes.
  - Each server already knows its own candidate addresses (`ServerAddressCandidateService`).
  - Each server already answers the availability and offer questions for its own peers (261/267).
- **No coupling problem in the existing owners.** The new work is a cross-list projection and a two-node coordination, and neither has an owner today.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`.
- Size rationale: it spans three subsystems:
  - the server's `remote-collaboration` (address resolution, error causes, two queries and one mutation added, the add contract changed);
  - the desktop app's main process (the registry change `identify`, a stored field added, two fields removed);
  - the web Nodes page (a new joined-list store, a two-node connector, about 8 new or rewritten components, removal of the Remote Collaboration tab and 4 files, localization in 2 languages, docs).
- Architectural risk: `High`.
- Risk rationale:
  - The GraphQL contract changes: `addPeerNode` input, new error extensions, and new queries.
  - The desktop's persisted registry changes shape (one field added, two dropped; no migration).
  - A new coordination writes on two nodes from the window, with partial-failure semantics.
  - The trust posture is stated (RSK-701).
- Escalation trigger: anything that needs a new inbound peer-request kind, a change to the gateway admission (CM-12), or a migration of stored data goes back to the Solution Designer.

## Architecture Investigation Evidence

| Source / probe | Reference | Observation | Decision supported |
| --- | --- | --- | --- |
| Node `fetch` failure probe | `evidence/probes/fetch-causes.mjs`, `refused.mjs` (disposable) | Refused → `cause.code ECONNREFUSED` (or `AggregateError.errors[].code`); unknown host → `ENOTFOUND`; black hole → `TimeoutError` | `transportFailureReason` classifier (REQ-707) |
| Container marker | `docker exec autobyteus-server-0 test -f /.dockerenv` | Present in the user's node containers | `runsInContainer()` for the loopback hint (REQ-708) |
| Candidates on live nodes | GraphQL `listMemoryHubUrlCandidates` on 29695 and 8001 | Configured, Docker alias and interface addresses; one wrong container LAN address (`172.17.0.4:8001`) | Resolution by node ID over candidates, tried in parallel (DS-003) |
| Reachability per caller | `curl` from host and from the container | Mac: `host.docker.internal` does not resolve; container: it reaches the desktop and 8003 | No single address per node; each caller resolves its own |
| GraphQL resolver | `api/graphql/types/remote-collaboration-settings.ts` | Settings errors carry `extensions.code` | Extend extensions with `reason`, `loopbackInContainer` |
| Registry change handler | `electronApplication.ts:182-235` | Exhaustive `never` switch over change types | Add `identify` |
| Dead fields | `grep capabilities / capabilityProbeState` | `capabilities` never read; `capabilityProbeState` read only by the chip being replaced | Remove both, plus `nodeCapabilityProbe.ts` and `nodeHostValidation.ts` (only caller is the replaced form) |

## Intended Change

Join the two node lists on the screen by node ID, without merging their stores. Move the switch and the peers into Manage Nodes. Make "collaborate" a single confirmed plan that the window carries out on both nodes. Each server picks the address that works for itself from the other node's own candidates, verified by node ID. Errors carry a classified cause, plus a Docker loopback hint that the server computes.

## Change Scope (Mandatory)

- In scope: UC-701 … UC-706 (requirements). The areas changed:
  - the server's `remote-collaboration` (settings, channel, domain) and its GraphQL resolver, plus `server-addressing` (container check);
  - the desktop registry types and change handler;
  - the web Nodes page, its stores, its localization and the docs.
- Deliberately left alone:
  - the gateway admission and the inbound handlers (CM-12 unchanged);
  - the agent tools and their texts (261);
  - Memory Sync, Phone Setup, and the Docker and NFS guide tabs (DEC-703), except a link from the hint to the Docker guide;
  - the capability toggle store factory;
  - `ServerAddressCandidateService` (reused as is).
- Follow-ups: FU-001 (agent-facing unreachable text still says "fetch failed"), FU-002 (wrong container LAN candidate in Memory Sync suggestions). See [follow-ups.md](follow-ups.md).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Kind | REQ / AC | Trigger | Existing evidence | Change | Target path / spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-703 | User | REQ-702, 703, 711; AC-702 | Manage Nodes opens | Two lists, two tabs | One row per node ID | DS-001 |
| BEH-701/702 | User | REQ-704; AC-703 | Add node | Two forms | One form; optional collaborate | DS-002 (then DS-003 when ticked) |
| BEH-704 | User | REQ-705, 706; AC-704…706 | Row collaboration switch, add form (switch on) / fixing button | Hand registration on each side | Confirmed plan on both nodes | DS-003, DS-004 |
| BEH-705 | User | REQ-707, 708; AC-707 | Any add / resolve failure | "fetch failed" | Cause + Docker hint | DS-003 (error return), DS-005 |
| BEH-706 | User | REQ-701, 709; AC-701 | Switch | Separate tab | Section in Manage Nodes | DS-001 |
| BEH-707 | User | REQ-712, 703; AC-710 | Row expand / triggers | 267 offers | Unchanged timing; both directions | DS-001, DS-004 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | REQ / AC | Relationship | Status |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/one-nodes-tab/ui-ux-spec.md` + `visual-references/` | Normative UI (Product Team, approved by the user) | REQ-701…714 | Screens, states, copy, confirmations and transitions the components realize; its "Data, Contract, And Mock Boundaries" are mapped below (§ Product Package Mapping) | Approved 2026-10-23 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement` (feature plus behavior change).
- Current design issue found: `Yes`.
- Structural triggers that fire:
  - **Responsibility overload:** `NodeManager.vue` inlines the add form, list, rename and remove (381 lines). Growing it with rows, states and dialogs would make a catch-all. Response: split into the components below; `NodeManager.vue` keeps only the tabs and panels.
  - **Repeated coordination:** connect, disconnect, remove and "register this node there" each need the same "do steps on this node and the other node, report each" policy. Response: one owner, `nodeCollaborationConnector`.
  - **Capability-area reuse:** the identity probe, the address candidates and the offers. Response: reuse `/rest/remote-access/status`, `ServerAddressCandidateService` and `remoteCollaborationOffersStore`.
  - **Persisted-data transition:** the registry entry gains `serverInstanceId` and drops two fields. Response: Principle 5, below.
  - **Legacy cleanup:** the old form, chip and probe, and the peer section. Response: removal plan.
- Triggers checked and not firing:
  - **Ambiguous boundary.** `nodeId` already means the desktop profile ID in the window, so the new desktop field is named `serverInstanceId`. Server APIs keep `nodeId` (= server instance ID), as today.
  - **Authoritative boundary.** The page goes through the stores, and the connector through two API clients. No component calls GraphQL directly.
- Root cause classification: `Boundary Or Ownership Issue`. Nothing owns "a node" across the two lists, or the work on both sides.
- Refactor needed now: `Yes`. Split `NodeManager.vue`; replace the peer section; remove the dead probe fields and utilities.
- Evidence: Current-State Read; investigation notes.
- Design response: a joined-list store (projection), a connector (coordination), small single-purpose components.
- Intentional deferrals: FU-001, FU-002.

## Terminology

- **This node:** the node the window is opened on (A). **Other node:** a row's node (B).
- **Node ID:** the server instance ID `srv_…`. On the desktop it is stored as `serverInstanceId`, because `NodeProfile.id` and `windowNodeContext.nodeId` are the desktop profile ID.
- **Window address:** where this desktop reaches a node (desktop list). **Peer address:** where a node's server reaches a peer (`peers.json`).
- **Plan:** the list of changes a confirmation shows and the connector then carries out.

## Legacy Removal Policy (Mandatory)

- Obsolete in scope:
  - the Remote Collaboration tab;
  - `RemoteCollaborationCard.vue`, `RemoteCollaborationPeersSection.vue`, `CurrentWindowNodeCard.vue`;
  - `utils/nodeCapabilityProbe.ts`, `utils/nodeHostValidation.ts`;
  - `NodeProfile.capabilities` and `NodeProfile.capabilityProbeState`;
  - `AddPeerNodeInput {baseUrl, name}`;
  - the localization keys that only those components used.
- Compatibility kept: `None`. `?nodeTab=remoteCollaboration` simply falls to Manage Nodes through the existing valid-tab check; no alias.

## Persisted Data / State Transition Decision (Mandatory)

- **Stored subject:**
  - The desktop registry `<userData>/node-registry.v1.json` (or browser `localStorage`). A handful of entries; the user's desktop has 3.
  - Server `peers.json`: shape unchanged.
- **Change:** `NodeProfile` gains optional `serverInstanceId` and loses `capabilities` and `capabilityProbeState`.
- **Reader / writer:**
  - `normalizeLoadedNode` already projects known fields. It will read `serverInstanceId` when it is a valid `srv_…` string and stop reading the two dropped fields.
  - The writer saves the whole snapshot on every change, so the dropped fields disappear on the next ordinary save.
  - In the browser, `nodeStore` reads `localStorage` as is. The dropped fields are ignored and are not written by new code.
- **Invariants:**
  - A missing `serverInstanceId` truthfully means "not learned yet". The row stays by itself until the node is reached; then `identify` stores it.
  - `identify` sets the ID on the entry it names. **The window probe of the entry's own address is authoritative for that entry** (AR-003): when the address answers with a different ID than the one stored, `identify` replaces it. Example: a Docker node recreated with a fresh data volume. The old peer, if any, then stands as its own row with its own state (`PEER_IDENTITY_MISMATCH` from this node's server). `identify` never merges entries or rewrites names or addresses.
  - Two desktop entries with the same ID (possible from the old form, which had no identity check) join into one row. The row uses the entry created first (`createdAt`), and its Remove removes both.
- **Decision:** `Directly Usable — No Migration` (migration guideline § 3: an optional field whose absence has a truthful meaning; an obsolete field ignored on read and dropped on the next save).
- **Rationale:** nothing old needs transforming. The user approved joining the screens only (DEC-701), so no backup is needed and none of the user's data is rewritten beyond the ordinary save.
- **Supports:** REQ-711, AC-702.

Guideline § 2 checklist:
1. No migration is needed.
2. Startup is unaffected.
3. Source shapes read: the user's real registry (3 entries, with `capabilities` and `capabilityProbeState`). Fixtures for both an old entry and an entry with `serverInstanceId` (`nodeRegistryStore.spec.ts`).
4. Unknown or invalid `serverInstanceId` → treated as absent.
5. Atomicity: the existing whole-file write.
6. No old-shape code.
7. Cost: one write per newly learned ID.
8. References: `serverInstanceId` is compared with `PeerNode.nodeId` on screen only.
9. Tests listed under Guidance.
10. Reviewed by the architecture reviewer.

## Data-Flow Spine Inventory

| Spine | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-703/706/707 | Manage Nodes opens (or Refresh, or the switch turns on) | One row per node, with status | `nodeListStore` | The one list |
| DS-002 | Primary | BEH-701 | Add node form | Desktop entry (with ID) | `nodeListStore.addNode` → `nodeStore` | Add once |
| DS-003 | Primary | BEH-704/705 | Row or add-form collaboration switch on / fixing button | Both nodes registered, switches on | `nodeCollaborationConnector` | Register once, both sides |
| DS-004 | Return | BEH-704 | Row status ask | Two direction states per row | `nodeListStore` (with the offers store and the other-node API) | Clear status per direction |
| DS-005 | Bounded local | BEH-705 | `resolvePeerAddress` | Chosen address or classified attempts | `PeerAddressResolver` | The address that works for this caller |

## Primary Execution Spine(s)

- DS-001: `Manage Nodes opens → nodeListStore.refresh → [nodeStore desktop entries + this node's peers (remoteCollaborationStore) + window identity probes] → join by node ID → rows → per-row status ask (DS-004) → NodeList renders`
- DS-002: `Add form (switch on by default) → nodeListStore.addNode → window identity probe (address → node ID, or cause) → duplicate check by address against every row's window address, whatever the node's state (AR-008) → [answered: duplicate check by node ID] → nodeStore.addRemoteNode (with serverInstanceId when known; does NOT open the window) → desktop registry (IPC) → row appears, highlighted → [switch on and reachable → DS-003 confirmation; unreachable → row shows its cause, no confirmation]`
- DS-003: `Collaboration switch (row or add form) / fixing button → connector.planConnect(row) → [facts: switch here, peers here; via the other node's API: its switch, its peers, its candidates; this node's candidates] → resolvePeerAddress on each registering server (DS-005) → plan steps → confirmation dialog → connector.run(plan) → steps in order: this node's through `remoteCollaborationStore` / the capability store, desktop entries through `nodeStore`, the other node through `nodeCollaborationApi` (direct client) → per-step result by the plan kind's run rule (§ Run Rules) → row re-asked (DS-004)`

## Spine Narratives (Mandatory)

| Spine | Narrative | Subjects | Owner | Off-spine |
| --- | --- | --- | --- | --- |
| DS-001 | When the tab opens, the store takes the desktop entries and this node's peers. It probes each desktop entry's window address for its node ID: one GET to `/rest/remote-access/status`, which also gives reachability. It stores newly learned IDs through `identify`, joins the entries by node ID into rows (DEC-705 name; DEC-706 peer-only rows), marks the bound node's row as "this node", then asks each collaborating row's status. | Node row | `nodeListStore` | identity probe, `identify` write |
| DS-002 | On submit, the typed address is first checked against every row's window address, whatever that node's state, even when it is down (AR-008). A match gives "This is X, already in your list.", nothing is added, and that row is highlighted. Otherwise the window probes the address; if the node answers with an ID that is already a row, the same message is shown. If it answers: the desktop entry is added with its ID. If it doesn't answer, the entry is still added without `serverInstanceId` (today's behavior, AR-004); the row shows its cause, and no confirmation opens. **Adding does not open the node's window** (SR-006; today's `addRemoteNode` does). Success shows no notice. With the form's switch on (the default) and the node reachable, DS-003's confirmation opens at once; Cancel leaves the node listed, not collaborating. | Node row | `nodeListStore` | identity probe |
| DS-003 | The connector gathers the facts and resolves the address each side will use. Each registering server tries the other node's window address and its advertised candidates, keeping the one that answers with the expected node ID. Per AR-001 (b), a side resolves before the confirmation only when its switch is already on; otherwise it resolves as a step after its switch is turned on. The connector applies the naming rule and returns a plan with only the needed steps. The dialog shows the plan; on confirm the connector runs the steps in order: switch here → (resolve B here) → register B here → switch there → (resolve A there) → register A there. Each step follows the plan kind's run rule (§ Run Rules): a connect-type plan stops at the first failure and reports which steps were done. The row is then re-asked, so a partial result shows as the row's warning line with its fixing button. | Plan, step | `nodeCollaborationConnector` | the two node APIs, error text |
| DS-004 | For a row this node collaborates with: A→B is this node's server's `peerNodeOffer(B)` (267's offers store, now carrying the unreachable reason). B→A is asked only when A→B is accepted: the window asks B's server `peerNodeAvailability(A)`, which shows whether B reaches A at the address B has (the Docker case). **For every row whose node the window can reach**, the window reads B's `peers` (`nodeCollaborationApi.peers`). That one read gives whether B has this node registered, and **the address B uses to reach this node**: the "8003 → this node ✓ via http://host.docker.internal:29695" line (AR-009). For a non-collaborating row it tells "registered only by the other node" from "not collaborating". `peerNodeAvailability` stays without an address. The row derives one line by the spec's priority; the connection details show both directions. **Reachability of a peer-only row** (no desktop entry) comes from this node's server (A→B), not the window probe, so a node that only this node can reach (for example at `host.docker.internal`) isn't shown as not reachable (Product risk, SR-006). | Direction state | `nodeListStore` | other-node API |
| DS-005 | `PeerAddressResolver` probes all candidates at once, each bounded by 20 s. It returns the first candidate in order that answered with the expected ID, as soon as every candidate before it has settled. When none matches, it returns each attempt's classified outcome, and `loopbackInContainer` when the first (user-given) address is loopback and this server runs in a container. | Attempt | `PeerAddressResolver` | identity probe, `runsInContainer` |

## Spine Actors / Main-Line Nodes

`NodeManager.vue` (tabs) · `nodeListStore` · `nodeCollaborationConnector` · node APIs (bound / direct) · `RemoteCollaborationSettingsResolver` · `PeerDirectory` · `PeerAddressResolver` · desktop registry (`applyNodeRegistryChange`).

## Ownership Map

- **`nodeListStore` (web, new):**
  - Owns the joined rows (projection rule: key = node ID, else the desktop entry ID), the window identity probe state per row, the B→A state per row, and the derived row warning.
  - Owns the triggers: open, add, switch on, refresh (DEC-708).
  - Owns the add-node sequence.
  - Does not own the desktop entries (`nodeStore`), the peers (`remoteCollaborationStore`) or the A→B offers (`remoteCollaborationOffersStore`).
- **`nodeCollaborationConnector` (web, new):**
  - Owns the plan rule (which steps, in which order), the naming rule (below) and the execution with per-step reporting, for connect, disconnect, remove, rename, "register this node there", "turn on on B" and "change address".
  - Stateless between calls.
  - **One write path per state (AR-005):**
    - This node's peers go through `remoteCollaborationStore`: `resolveAddress`, `add`, `rename`, `remove`, `changeAddress`. This node's switch goes through the capability store's `setEnabled`. So the stores that own this state stay current.
    - The desktop entry goes through `nodeStore` (`removeRemoteNode`, `renameNode`).
    - `nodeCollaborationApi` is used **only for the other node**.
- **`nodeCollaborationApi` (web, new):** the typed operations on another node's remote-collaboration API over the direct client: `capability`, `setEnabled`, `peers`, `peerAddressCandidates`, `resolvePeerAddress`, `addPeer`, `removePeer`, `changePeerAddress`, `peerNodeAvailability`. A thin boundary; it owns no policy. This node is never written through it.
- **`PeerDirectory` (server, extended):**
  - `add({nodeId, name, baseUrl})` checks that `baseUrl` answers with `nodeId` (new code `PEER_IDENTITY_MISMATCH`), plus the existing rules.
  - New `changeAddress(nodeId, baseUrl)` checks the pinned ID at the new address.
  - The only writer of `peers.json`, as before.
- **`PeerAddressResolver` (server, new):** owns candidate selection by identity (DS-005).
- **`PeerClient` (server, extended):** classifies transport failures (`TransportFailureReason`) for the identity probe and for refusals. Its texts for agents are unchanged.
- **Desktop registry (Electron, extended):** `identify` change.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Owner behind it | Why | Must not own |
| --- | --- | --- | --- |
| `RemoteCollaborationSettingsResolver` | `PeerDirectory`, `PeerAddressResolver`, `RemoteNodeDiscovery` (offer and availability) | GraphQL edge | Address choice; plan logic; direct `PeerClient` calls |
| `nodeCollaborationApi` | The other node's resolver | One typed client for the other node | Ordering of steps; writes on this node |

## Naming Rule (AR-002)

Owner: `nodeCollaborationConnector`. Every registration step carries the name it registers under, and the confirmation shows it: "Register 8003 here as 8003" or "Register this node on 8003 as Embedded Node 2".

1. **Source of the name.**
   - For B on this node: the row's name, which is the desktop entry's name (DEC-705; a peer-only row already has a peer name).
   - For this node on B: this node's row name, which is the desktop entry of the bound node (the embedded node is "Embedded Node").
2. **Valid.** Each run of characters outside `[A-Za-z0-9 _.-]` becomes `-`, leading characters that are not a letter or digit are dropped, and the name is cut to 64 characters. If nothing is left, the name is `node`. Example: `http://localhost:8003` → `localhost-8003`.
3. **Unique.** Checked case-insensitively against the peer list of the side being written. That list is already a plan fact: this node's peers from `remoteCollaborationStore`, B's from `nodeCollaborationApi.peers` (readable while B's switch is off). On a clash, append ` 2`, ` 3`, … (cut to fit 64).
4. **Race.** A `PEER_NAME_TAKEN` at run time (the list changed between plan and run) is shown as "8003 already has a node named X", and the row's fixing button re-plans with fresh facts, so the next plan picks a free name. This is never a dead end.
5. Tests: connector cases for invalid characters, collision and the race.

## Loopback Hint Surface (AR-006)

- **Where it appears.** Only where a node that runs in a container fails to resolve another node's address, and the first address it tried is loopback (`localhost`, `127.0.0.1`, `::1`). The server computes this and returns it as `loopbackInContainer` on the `PEER_UNREACHABLE` error from `resolvePeerAddress` or `changePeerAddress`. Two places show it:
  - **the plan result:** in the confirmation before running, or as the failed step's result after running, under AR-001 (b);
  - **the Change address field**, when the user types an address that a Docker node will use.
- **Not in the add form.** The add-form address is the window address. A loopback address there is right for the desktop, so the add form never shows this hint (the spec's UXJ-705 / VIS-018 / VIS-026 surfaces, never the add form).
- **"Use this".** Retries that same node's resolution with `http://host.docker.internal:<port of the failed address>` as the first candidate, followed by the remaining candidates. In Change address it fills the field and retries. It never edits the desktop entry (the Mac cannot resolve `host.docker.internal`; measured).
- **When it happens in practice.** The other node advertises no address the container can reach. Examples: its candidates were all filtered or wrong, or the user typed a loopback address in Change address. Resolution normally finds `host.docker.internal` by itself, so the hint is rare by design. AC-707's Given is refined to this case (SR-004).

## Switch-Off Rule For Address Resolution (AR-001)

- **Decided: option (b)** (SR-006; the user delegated it, "you decide", and the approved package shows it in VIS-003 and VIS-021).
- **Rule.** A server resolves addresses only while its switch is on: `resolvePeerAddress` and `changePeerAddress` refuse with `REMOTE_COLLABORATION_OFF`, like `add`.
- **The plan.**
  - For a side whose switch is already on, resolution happens before the confirmation, and the dialog shows the address.
  - For a side being turned on, the step list is `turnOn…`, then `resolve…`, then `register…`. The confirmation line reads "8003 finds this node's address once collaboration is on".
  - If that resolution fails, the run stops there (RSK-703), and the row shows the cause and its fixing button.
- **Unaffected reads.** Reading the switch and the peer list stays allowed while off. They are local reads, not requests to another node.
- **Option (a) changes** (if the user picks it instead): drop the switch check from `resolvePeerAddress` only, resolve both sides before the confirmation, and state in `remote_collaboration.md` and CM-12 that an off node still answers identity-only resolution for its owner.

## Run Rules (AR-007)

One rule per plan kind, owned by `nodeCollaborationConnector.run`. Each failed step is reported with its cause.

| Plan kind | Steps (only the needed ones) | On a failed step |
| --- | --- | --- |
| `connect`, `finish` | `turnOnHere`, `resolveHere`, `registerHere`, `turnOnThere`, `resolveThere`, `registerThere` | **Stop.** The steps already done stay done. The rest are `notRun`. The dialog shows ✓ ✗ ○ and Close / Try again (VIS-014); the row keeps "Turned on here, but not finished on X" with Try again (VIS-015). |
| `disconnect` | `removeHere`, `removeThere` | **Continue.** `removeThere` runs even when `removeHere` failed, and the other way round. Each failure is reported ("could not be removed"), and the row shows what is left. |
| `remove` | `removeHere`, `removeThere` (when collaborating and reachable at plan time), `removeFromList` | **Continue to `removeFromList`.** A failed `removeThere` is reported, and the list entry is still removed: "Removed here. <name> could not be reached, so this node is still registered there." (UXJ-706, P-004). A failed `removeHere` is reported, and the entry is still removed. Only a failed `removeFromList` leaves the row. |
| `rename` | `renameHere` (peer), `renameInList` (desktop entry) | **Stop** at the first failure, so a refused peer name (`PEER_NAME_TAKEN` or invalid) leaves both names unchanged; the field stays with its message (VIS-010). |
| `changeAddress` | `changeAddressHere` (one step: `changePeerAddress` checks the pinned node ID at the typed address only; no window address or candidates after it) | **Stop.** The Docker hint applies (§ Loopback Hint Surface). *Reconciled at docs sync: implementation assumption A1 was accepted in code review and the separate `resolveHere` step was dropped (CR-002), so AC-707's Docker hint and "A different node answers there…" can happen.* |

## Window Probes While The Switch Is Off

The window's identity probes (reachability dots, for opening windows) run on every tab open, whatever this node's switch says. They are requests from the window, not from this node's server. With this node's switch off, this node's server asks no peer, so the rows show the spec's "Off on this node" presentation (VIS-024). A peer-only row, whose dot normally comes from this node's server, shows "Off on this node", not "not reachable" (ARCH-REV-002 residual note).

## Product Package Mapping (SR-006)

How the approved UI/UX spec's behaviors and mocked boundaries map to this design. Its `prototype/nodes/nodeWorld.ts` and `stores/nodeListStore.ts` are mocks, not architecture.

| Spec item | Production owner / path |
| --- | --- |
| TR-701: every row asked once on open; this node's switch doesn't stop the window's checks | `nodeListStore.refresh` (DS-001, DS-004); § Window Probes While The Switch Is Off |
| TR-702: add without opening the window; the confirmation opens when reachable and the switch is on | DS-002; `nodeStore.addRemoteNode` loses its `openNodeWindow` call (removal plan) |
| TR-703: duplicate by address (always) or node ID (when the probe answers) | `nodeListStore.addNode` (AR-008) |
| TR-704/705/712, UXJ-704: one dialog for turn on, finish, Try again (only what is left) | `nodeCollaborationConnector.plan` with fresh facts, then `run`; partial result kept per row in `nodeListStore` until the next ask |
| TR-706, UXJ-703: turn off removes both registrations, never the other switch | connector `disconnect` plan |
| TR-708: rename = desktop label + this node's peer name; embedded not editable | connector `rename` plan (`nodeStore.renameNode`, `remoteCollaborationStore.rename`); name rule messages; "Another node is already named X" from `PEER_NAME_TAKEN` or the desktop list |
| TR-709, UXJ-706: remove here, there (when reachable), from the list; result when there can't be reached | connector `remove` plan: `removeHere`, `removeThere` (skipped and reported when unreachable), `removeFromList` |
| TR-711, UXJ-705: Change address, the Docker hint, Use this | `remoteCollaborationStore.changeAddress` → `changePeerAddress`; § Loopback Hint Surface |
| TR-714, DEC-706: first Open of a peer-only row adds a desktop entry | `nodeListStore.open(row)`: window probe of the peer address, then `nodeStore.addRemoteNode` and `openNodeWindow` |
| Row line kinds and priority (State Behavior table) | `nodeListStore` row derivation; unit-tested per state |
| "registered only by the other node" | DS-004: the window reads B's `peers` for non-collaborating rows |
| DEC-709 (b) line "8003 finds this node's address once it is on." | § Switch-Off Rule |
| Naming: this node's row name, " 2", " 3" shown in the dialog | § Naming Rule |
| Copy (`nodesPage.ts`, en + zh-CN) | localization files listed in the file mapping |

## Removal / Decommission Plan (Mandatory)

| Item | Why unnecessary | Replaced by | Notes |
| --- | --- | --- | --- |
| Remote Collaboration tab (`NodeManagerTabs.vue` entry, panel in `NodeManager.vue`) | REQ-701 | Manage Nodes sections | `?nodeTab=remoteCollaboration` → falls to Manage Nodes |
| `RemoteCollaborationCard.vue` + spec | Its switch and load logic move | `ThisNodeCard.vue`, `nodeListStore` | — |
| `RemoteCollaborationPeersSection.vue` | Rows, add form and rules move | `NodeList.vue`, `AddNodePanel.vue`, `NodeRow.vue`, `ThisNodeCard.vue` | `RemoteCollaborationOfferDisclosure/OfferList.vue` reused |
| `CurrentWindowNodeCard.vue` | Replaced by "This node" | `ThisNodeCard.vue` | Only `NodeManager.vue` uses it |
| `nodeStore.addRemoteNode`'s `openNodeWindow` call | SR-006: adding no longer opens the window (the user) | Open (`NodeRow` Open icon) | `nodeStore.spec.ts` updated |
| `utils/nodeCapabilityProbe.ts` + tests | Dead: its only caller is the replaced add form; the result fields are dead | `utils/nodeIdentityProbe.ts` | — |
| `utils/nodeHostValidation.ts` + tests | Dead: its only caller is the replaced add form; its loopback/HTTP warnings are replaced by causes and the hint | `nodeConnectionErrorText.ts` | — |
| `NodeProfile.capabilities`, `capabilityProbeState`, `CapabilityProbeState`, `NodeCapabilities`; their handling in `nodeRegistryStore.ts`, `nodeStore.ts` (`createEmbeddedNode`) | Dead: `capabilities` never read; `capabilityProbeState` read only by the removed chip | — | Dropped from storage on the next save |
| `AddPeerNodeInput.baseUrl` single-field contract | Clean cut to `{nodeId, name, baseUrl}` | New input | No dual input |
| Localization keys used only by the removed components (`NodeManager.*` add/capability/warning keys, `RemoteCollaboration.peers.*` form keys) | Dead after removal | New `NodeList.*` keys | en + zh-CN |

## Return Or Event Spine(s) (If Applicable)

DS-004 (above). Answers carry tokens per row, as the offers store does: a stale answer (row removed, re-asked, tab left, switch off) is ignored.

## Bounded Local / Internal Spines (If Applicable)

- DS-005 inside `PeerAddressResolver`: `candidates (deduped, in order) → probe each in parallel (20 s each) → as each settles: if it is the earliest unsettled-free match, resolve → else, when all have settled, reject with the attempts`.
- The connector's run: `steps[] → for each: call → ok: next / failed: apply the plan kind's run rule (§ Run Rules) → result {done[], failed[], notRun[]}`.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk if on main line |
| --- | --- | --- | --- | --- | --- |
| `nodeIdentityProbe` | DS-001/002/003 | `nodeListStore`, connector | Window GET of `/rest/remote-access/status` → `{serverInstanceId}` or a cause (`refused`/`timeout`/`not_found`/`not_autobyteus`/`unreachable`); timeout 5 s (window, desktop-local) | Identity + reachability | Duplicated fetch logic |
| `directNodeApolloClient` | DS-003/004 | `nodeCollaborationApi` | Apollo client for another node's GraphQL: no cache, no global error toasts, no remote-access headers | The other node is not the bound node | Errors from other nodes flooding `uiErrorStore` |
| `nodeConnectionErrorText` | DS-002/003 | Components | Cause → localized sentence, for the window probe (add, as information) and for server errors (code, reason, address). Adds the `host.docker.internal:<port>` suggestion only for a server resolution error with `loopbackInContainer` (§ Loopback Hint Surface) | REQ-707/708 | Error wording spread across components |
| `transportFailureReason` | DS-005, DS-004 | `PeerClient` | Node `fetch` error → `refused`/`timeout`/`not_found`/`unreachable` | REQ-707 | — |
| `runsInContainer` | DS-005 | `PeerAddressResolver` | `/.dockerenv` exists (read once) | REQ-708 | — |
| Plan → dialog lines | DS-003 | `NodeChangeDialog` | Renders steps grouped by the node they happen on ("On this node (…)", "On 8003") with ✓ ✗ ○ | UI | — |

## Ownership Boundaries

- The page talks to `nodeListStore` and the connector only. They talk to `nodeStore`, `remoteCollaborationStore`, `remoteCollaborationOffersStore` and `nodeCollaborationApi`.
- On the server, the resolver calls `PeerDirectory` for writes, `PeerAddressResolver` for resolution, and `RemoteNodeDiscovery` for offers and availability. It never calls `PeerClient` directly.
- The other node is changed only through its own settings API, the same operations its own window uses. There is no new peer-to-peer request kind, and no node writes another node's peers.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden bypass | Fix if too thin |
| --- | --- | --- | --- | --- |
| `PeerDirectory` | `PeerStore`, identity probe | Resolver | Resolver or anything else writing `PeerStore` | Add a directory op |
| `nodeListStore` | Joining, probe tokens | Components | Components joining lists themselves | Add a getter |
| `nodeCollaborationConnector` | Step order, partial results | Components, `nodeListStore` (add + collaborate) | Components calling the other node's API directly | Add a plan kind |
| Gateway (unchanged) | Admission | Peers | — | — |

## Dependency Rules

- Allowed:
  - components → `nodeListStore`, connector, existing stores (read);
  - connector → `remoteCollaborationStore` (this node's peers: read and write), the capability store (this node's switch: read and write), `nodeStore` (desktop entries: rename, remove), `nodeCollaborationApi` (the other node only), `nodeIdentityProbe`;
  - `nodeListStore` → `nodeStore`, `remoteCollaborationStore`, offers store, capability store, `nodeIdentityProbe`, `nodeCollaborationApi` (B→A only).
- Forbidden:
  - the window asking a peer for its *offer* directly (267 REQ-503 stays: offers come from the server that would delegate);
  - the connector writing this node through `nodeCollaborationApi` or the bound Apollo client directly (AR-005);
  - any server endpoint that registers its caller on itself (B decides);
  - `remote-collaboration` importing web or Electron code;
  - `agent-collaboration` port types gaining UI fields (the reason travels on a `remote-collaboration` type).

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `addPeerNode(input: {nodeId, name, baseUrl})` | Peer | Register; checks that `baseUrl` answers with `nodeId` | `nodeId` = server instance ID | Replaces `{baseUrl, name}`. Switch must be on (unchanged) |
| `changePeerAddress(nodeId, baseUrl)` | Peer | New address, same pinned node | `nodeId` | Switch on |
| `resolvePeerAddress(nodeId, baseUrls)` → `String` | Address for a node | DS-005; read-only; **requires the switch on** (`REMOTE_COLLABORATION_OFF` otherwise), like `add` (DEC-709 option (b), decided at SR-006) | `nodeId` + ordered candidates | Errors: `PEER_UNREACHABLE` (with `attempts`, `loopbackInContainer`), `PEER_IS_THIS_NODE`, `REMOTE_COLLABORATION_OFF` |
| `peerAddressCandidates` → `[String!]!` | This node's own addresses | Base URLs from `ServerAddressCandidateService.listCandidates()` | — | For the other side's resolution |
| `peerNodeAvailability(nodeId)` → `{available, refusalCode, unreachableReason}` | A peer's admission of this node now | `RemoteNodeDiscovery.checkAvailabilityOf(nodeId)` (→ `PeerClient.checkAvailability`), like `peerNodeOffer` | `nodeId` | Used on B for B→A |
| `peerNodeOffer(nodeId)` + `unreachableReason` | A peer's offer | Unchanged otherwise | `nodeId` | — |
| Settings error extensions | — | `{code, reason?, address?, loopbackInContainer?, attempts?}` | — | `reason` ∈ `refused`/`timeout`/`not_found`/`unreachable` |
| Registry change `{type: 'identify', nodeId, serverInstanceId}` | Desktop entry | Set or replace the ID learned from the entry's own address (AR-003) | `nodeId` = desktop profile ID | Rejects an invalid ID or an unknown entry; a no-op when it is equal |
| `connector.plan(kind, row)` / `connector.run(plan)` | Plan | Steps, then execution | Row (desktop entry ID and/or node ID) | Kinds: `connect`, `finish` (the steps still missing: Register this node there, Turn on there, Try again), `disconnect`, `remove`, `rename`, `changeAddress`; each with its run rule (§ Run Rules) |

## Interface Boundary Check

| Interface | Singular | Identity explicit | Risk | Action |
| --- | --- | --- | --- | --- |
| `addPeerNode` | Yes | Yes (`nodeId`) | Low | — |
| `resolvePeerAddress` | Yes | Yes | Low | — |
| `identify` | Yes | Yes (desktop `nodeId` + `serverInstanceId`) | Medium (two IDs) | Field names state which is which |
| `peerNodeAvailability` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Drift risk | Action |
| --- | --- | --- | --- | --- |
| Joined row | `NodeRow` | Yes | — | — |
| Desktop node ID field | `serverInstanceId` | Yes | Low | Not `nodeId` (taken by the desktop profile) |
| Coordinator | `nodeCollaborationConnector` | Yes | — | — |
| Plan step | `NodeChangeStep` (`turnOnHere`, `resolveHere`, `registerHere`, `turnOnThere`, `resolveThere`, `registerThere`, `removeHere`, `removeThere`, `removeFromList`, `renameHere`, `renameInList`, `changeAddressHere`) | Yes | — | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Node identity | `/rest/remote-access/status` | Reuse | Public, cheap, already used by `PeerClient` |
| Own addresses | `ServerAddressCandidateService` | Reuse | Lists exactly these |
| A→B status and offer | `remoteCollaborationOffersStore`, `peerNodeOffer` | Extend (`unreachableReason`) | 267's path |
| This node's switch | `remoteCollaborationCapabilityStore` | Reuse | — |
| Offer UI | `RemoteCollaborationOfferDisclosure/OfferList.vue` | Reuse | 267 |
| Switch UI | `FeatureCapabilityToggleCard.vue` | Reuse inside `ThisNodeCard` (or its switch control) | Same switch |
| Other node GraphQL | `buildBoundApolloClient` | Create new `directNodeApolloClient` | The bound builder adds remote-access headers and global toasts that are wrong for another node |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/remote-collaboration/settings` | `PeerDirectory` (add, changeAddress), `PeerAddressResolver` | DS-003/005 | Extend / create |
| `…/remote-collaboration/channel` | `PeerClient` reasons; `transport-failure-reason.ts` | DS-004/005 | Extend / create |
| `…/remote-collaboration/domain` | Settings error fields; `PeerRefusal` (refusal + reason) | — | Extend |
| `…/server-addressing` | `runsInContainer` | DS-005 | Create (one file) |
| `…/api/graphql/types/remote-collaboration-settings.ts` | GraphQL edge | — | Extend |
| `autobyteus-web/electron` | `identify` change; registry projection | DS-001 | Extend |
| `autobyteus-web/stores` | `nodeListStore`; `nodeStore.identifyNode`; offers store reason | DS-001/002/004 | Create / extend |
| `autobyteus-web/services/nodeCollaboration/` | Connector, node API, direct client | DS-003/004 | Create |
| `autobyteus-web/components/settings/nodes/` | Page components | All | Create |
| `autobyteus-web/utils` | `nodeIdentityProbe.ts`, `nodeConnectionErrorText.ts` | DS-001/002/003 | Create |

## Draft File Responsibility Mapping

See the Final mapping. The drafts were the same, except that the error text first sat inside the add form component. It moved to `utils/nodeConnectionErrorText.ts`, because the rows, the confirmation and the dialog all show causes.

## Reusable Owned Structures Check

| Repeated | File | Owner | Why | Tight |
| --- | --- | --- | --- | --- |
| Transport failure reason (`refused`/`timeout`/`not_found`/`unreachable`) | server `channel/transport-failure-reason.ts`; web mirrors it as a string union in `nodeIdentityProbe.ts` (the window's own fetch) | Server channel; web probe | Identity probe, refusals, window probe | Yes, Yes |
| Plan step | `services/nodeCollaboration/nodeChangePlan.ts` (types only) | Connector | Dialog, connector, `nodeListStore` | Yes, Yes |

## Shared Structure / Data Model Tightness Check

| Structure | One meaning per field | Redundant removed | Overlap risk | Action |
| --- | --- | --- | --- | --- |
| `NodeRow { key, name, windowAddress?, desktopNodeId?, serverInstanceId?, peer?: PeerNode, isThisNode, reach: 'checking'\|'reachable'\|{unreachable: reason} }` | Yes | Yes | Low | `peer.baseUrl` is the peer address; `windowAddress` is the desktop's; never one field for both |
| `NodeProfile` | Yes | Yes (drops the probe fields) | Low | — |

## Final File Responsibility Mapping

| File | Area | Owner | Concern |
| --- | --- | --- | --- |
| server `settings/peer-directory.ts` | remote-collaboration | `PeerDirectory` | add with expected ID; `changeAddress` |
| server `settings/peer-address-resolver.ts` (new) | remote-collaboration | `PeerAddressResolver` | DS-005 |
| server `channel/transport-failure-reason.ts` (new) | remote-collaboration | — | Classify fetch errors |
| server `channel/peer-client.ts` | remote-collaboration | `PeerClient` | Identity probe throws a classified error; unreachable refusals carry `reason` |
| server `domain/remote-collaboration-settings-error.ts` | remote-collaboration | — | Codes + `PEER_IDENTITY_MISMATCH`; optional `reason`, `address`, `loopbackInContainer`, `attempts` |
| server `domain/peer-refusal.ts` (new) or the existing refusals file | remote-collaboration | — | `PeerRefusal = RemoteChannelRefusal & {reason?}` |
| server `discovery/remote-node-discovery.ts` | remote-collaboration | `RemoteNodeDiscovery` | Pass the reason through `listAvailableAgentsOf`; add `checkAvailabilityOf(nodeId)`, the one owner of the availability question for the page |
| server `remote-collaboration-services.ts` | remote-collaboration | — | Compose the resolver; expose it |
| server `server-addressing/runs-in-container.ts` (new) | server-addressing | — | `/.dockerenv` |
| server `api/graphql/types/remote-collaboration-settings.ts` | API | Resolver | New/changed ops and error extensions |
| web `types/node.ts` | — | — | `serverInstanceId`; `identify` change; drop the probe types |
| web `electron/nodeRegistryStore.ts`, `application/electronApplication.ts`, `preload.ts`/`types.d.ts` if typed | Electron | Registry | Projection; `identify` |
| web `stores/nodeStore.ts` | stores | `nodeStore` | `identifyNode`; `addRemoteNode` takes `serverInstanceId`; drop the probe fields |
| web `stores/nodeListStore.ts` (new) | stores | `nodeListStore` | DS-001/002/004 |
| web `stores/remoteCollaborationStore.ts` | stores | `remoteCollaborationStore` | This node's peers: the only write path (`resolveAddress`, `add` with the new input, `rename`, `remove`, `changeAddress`, `peerAddressCandidates`); errors kept as `{code, reason, address, loopbackInContainer, attempts}`, not only text |
| web `stores/remoteCollaborationOffersStore.ts` | stores | — | `unreachableReason` on unavailable |
| web `services/nodeCollaboration/nodeCollaborationConnector.ts` (new) | services | Connector | Plan + run |
| web `services/nodeCollaboration/nodeChangePlan.ts` (new) | services | — | Step and plan types |
| web `services/nodeCollaboration/nodeCollaborationApi.ts` (new) | services | — | Typed ops over a client |
| web `services/nodeCollaboration/directNodeApolloClient.ts` (new) | services | — | Client for another node |
| web `utils/nodeIdentityProbe.ts` (new) | utils | — | Window identity probe |
| web `utils/nodeConnectionErrorText.ts` (new) | utils | — | Cause → text + suggestion |
| web `graphql/queries|mutations/remoteCollaboration*.ts` | graphql | — | Documents |
| web `components/settings/NodeManager.vue` | components | — | Tabs + panels only |
| web `components/settings/NodeManagerTabs.vue` | components | — | Without the Remote Collaboration tab |
| web `components/settings/nodes/ThisNodeCard.vue` (new) | components | — | This node, the switch, the rules disclosure |
| web `components/settings/nodes/NodeList.vue` (new) | components | — | "Nodes" card: header, the add panel, rows; triggers on open |
| web `components/settings/nodes/AddNodePanel.vue` (new) | components | — | Always-open form: Address, Name, collaboration switch (on), Add node; field errors, duplicate message (UIS-003) |
| web `components/settings/nodes/NodeRow.vue` (new) | components | — | Dot, click-to-rename name, address, icon + switch, Open, Remove icons, one line with one fixing button, summary (UIS-002) |
| web `components/settings/nodes/NodeConnectionDetails.vue` (new) | components | — | Both directions, addresses, Change address editor, steps, node ID, refresh (UIS-005), in the 267 disclosure's slot |
| web `components/settings/nodes/NodeChangeDialog.vue` (new) | components | — | One confirmation for turn on, finish, turn off and remove: grouped lines, running, partial result, Close / Try again (UIS-004) |
| web `components/settings/nodes/NodeAddressHint.vue` (new) | components | — | Docker hint with Use this and Docker Guide (UIS-006) |
| web `components/settings/nodes/RemoteCollaborationIcon.vue` (new) | components | — | The one icon, 20/24 px, green/grey |
| web `components/settings/RemoteCollaborationOfferDisclosure.vue` (267) | components | — | Gains one slot (connection details) and an optional controlled open state, as the spec says |
| web `localization/messages/{en,zh-CN}/nodesPage.ts` (new) + `remoteCollaborationSettings.ts` (267 offer strings stay) | localization | — | The spec's copy, normative ("remote collaboration", no "peer"); remove dead keys |
| docs: web `docs/settings.md`; server `docs/modules/remote_collaboration.md`; Docker guide text if it tells users to add peers by hand | docs | — | REQ-714 |

Keep every file under 500 lines. `NodeRow.vue` must stay small: the connection details, the hint and the dialog are separate components.

## Applied Patterns (If Any)

- **Plan / execute (command list)** in the connector, so the confirmation shows exactly what runs.
- **Tokens per row** for stale answers, the existing offers-store pattern.

## Target Subsystem / Folder / File Mapping

As in the Final File Responsibility Mapping. New folders:
- `autobyteus-web/components/settings/nodes/`, so the six page components don't flatten into the 60-file `settings/` folder;
- `autobyteus-web/services/nodeCollaboration/`, following the existing `services/<area>/` pattern.

## Folder Boundary Check

| Folder | Depth | Clear | Risk | Note |
| --- | --- | --- | --- | --- |
| `components/settings/nodes/` | Transport/UI | Yes | Low | Page parts only |
| `services/nodeCollaboration/` | Main-line control | Yes | Low | No UI |
| `remote-collaboration/settings/` | Domain-control | Yes | Low | Resolver beside its user `PeerDirectory` |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Address for B registering A (the desktop window, B = Docker 8001) | The window asks A's `peerAddressCandidates` → `[127.0.0.1:29695, host.docker.internal:29695, 192.168.2.158:29695, …]`. It calls B's `resolvePeerAddress(srv_m9VF…, [A's window address, …those])`. B: `127.0.0.1:29695` refused, `host.docker.internal:29695` → `srv_m9VF…` ✓ → returned. | Using the window's address of A (`127.0.0.1`) for B | Measured on the user's setup |
| Plan for 8003 (A on, 8003 off; nothing registered; 8003's peers unknown until it is on, so it was asked for its peer list, which is readable while off) | `[registerHere(8003 @ localhost:8003 as "8003"), turnOnThere(8003), registerThere(A as "Embedded Node"; 8003 finds the address once on)]` | Turning B's switch on without listing it | QR-702, AR-001 (b) |
| Name collision on B (AR-002) | 8003 already has a peer "Embedded Node" (another desktop). The plan registers this node as "Embedded Node 2", and the confirmation says so. | `PEER_NAME_TAKEN` and a fixing button that repeats it | P-001 |
| Partial failure | `registerHere ✓, turnOnThere ✗ (timeout)`. The dialog says what was done and what failed; the row then shows "8003 doesn't know this node yet [Register this node there]". | Rolling back silently, or hiding it | REQ-705 |
| Row join | Desktop entry `{id: remote-ba22…, name: "http://localhost:8001", serverInstanceId: srv_ibJio…}` + peer `{nodeId: srv_ibJio…, name: "docker"}` → one row named "docker" | Joining by URL | URLs differ by caller |
| Peer name for an existing row | Desktop name "http://localhost:8003" is not a valid peer name, so the plan registers it as "localhost-8003" (disallowed characters → `-`, trimmed to 64) and the dialog shows "as localhost-8003" | Failing with PEER_NAME_INVALID | DEC-705 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep `addPeerNode {baseUrl, name}` beside the new input | Older windows | Rejected (DESIGN.md rule 9) | New input only |
| Alias `?nodeTab=remoteCollaboration` | Old links | Rejected (no links exist; unknown tabs already fall to Manage) | — |
| Keep reading `capabilityProbeState` for a chip | Old entries | Rejected | Live identity probe |
| Migrate the registry to add IDs | Joining | Rejected (learned lazily; DEC-701) | `identify` |

## Derived Layering (If Useful)

Components → web stores and connector → node APIs → servers (resolver → directory/resolver/discovery/client) → `peers.json`.

## Change / Refactor Sequence

1. Server:
   - transport reason classifier and container check;
   - `PeerClient` classified identity errors and refusal reasons;
   - `PeerAddressResolver`; `PeerDirectory.add` with the expected ID, and `changeAddress`;
   - discovery `checkAvailabilityOf` and the reason pass-through;
   - GraphQL ops and error extensions;
   - unit tests; docs `remote_collaboration.md`.
2. Desktop registry: types (`serverInstanceId`, `identify`; drop the probe fields), `normalizeLoadedNode`, `applyNodeRegistryChange`, preload typing, `nodeRegistryStore.spec.ts`.
3. Web data: `nodeIdentityProbe`, `nodeStore.identifyNode` and add, the remote-collaboration store and offers store changes, `directNodeApolloClient`, `nodeCollaborationApi`, plan types, connector, `nodeListStore`, store tests.
4. Web UI: the `nodes/` components; `NodeManager.vue` reduced to tabs and panels; tab removed; localization en/zh-CN; component tests.
5. Remove the obsolete components, utilities, keys and tests (removal plan); update docs `settings.md`.
6. Validation on two real servers (one in Docker) per TESTING.md; then the user's check.

## Key Tradeoffs

- **Window-driven coordination vs a server-to-server "register me" request.**
  - Chosen: window-driven. It keeps "B decides" as an owner action through B's own settings API, which is what the user does in B's window today. It adds no inbound peer request that writes on B.
  - Cost: it works only where the window can reach B. Such rows show the warning and the fixing button, which tells the user to open B.
- **Resolution on the registering server** (it alone knows which address works for it) vs **guessing in the window.** Chosen: the server. The window cannot test reachability from inside a container.
- **Resolution and the switch (AR-001, DEC-709 decided (b)).** a node with its switch off contacts no other node at all, as 191 REQ-101 says, so resolution waits until that side is on. The cost: when a side is being turned on, its address appears after the plan runs (in the expanded row) instead of in the confirmation. Option (a) would show it earlier, but it makes every node, in its default off state, fetch addresses that an unauthenticated caller sends it.
- **Persisting `serverInstanceId`** vs probing every time. Chosen: persist, so that an unreachable node doesn't split into two rows.

## Risks

- **RSK-701:** registration on B is an unauthenticated settings call, the same as today (RSK-401); accepted until the security slice. The confirmation says "trusted private network only".
- **RSK-702:** candidates include unreachable LAN and IPv6 addresses. They are probed in parallel and bounded by 20 s, and the first match in order returns early, so a black-holed candidate after a match adds no wait. A black-holed candidate *before* the match can delay the answer up to 20 s, and the dialog shows "checking" meanwhile.
- **RSK-703:** a partial plan (step failed) leaves one side registered. Visible by design (REQ-705, AC-704); no rollback.
- **RSK-402** unchanged: rows check independently.

## Guidance For Implementation

- Reproduction to start from: `None` (new behavior). The disposable probes in `evidence/probes/` show the fetch error shapes.
- Tests:
  - server unit: resolver (order, early match, mismatch skipped, this-node refused, all failing with attempts and `loopbackInContainer`), classifier (the three measured shapes plus `AggregateError`), directory (expected ID check, `changeAddress`);
  - Electron registry spec (old entry with probe fields loads and drops them; `serverInstanceId` valid/invalid; `identify`);
  - `nodeListStore` (join, DEC-705/706, warnings by priority);
  - connector (plans per facts; the run rules: connect-type stops at the first failure; remove with a failed `removeThere` still runs `removeFromList` and reports it, AR-007; naming);
  - `nodeListStore` (duplicate address of a listed node that is down is refused, AR-008; B→A address from B's peers, AR-009);
  - component tests for the UI/UX spec's states (State Behavior table, VIS-001 … VIS-031);
  - a two-server E2E with one node in Docker for AC-704/707 (TESTING.md).
- Localization: every new string in en and zh-CN.
- The "Open" for a peer-only row (DEC-706): when the window probe of the peer address returns the same node ID, add the desktop entry with that address and open it. Otherwise disable Open, with the title "This desktop can't reach <name> at <address>".
- Rename (REQ-710): follow § Run Rules: `renameHere` (the peer, when the row is one) first, then `renameInList` (the desktop entry), stopping at the first failure. Show the peer rule's error when the name is invalid for a peer.
- Remove (REQ-710): the plan is `removeHere` (peer, if any), `removeThere` (this node on B, if B is reachable and has it), then `removeFromList` (desktop entry, if any).
