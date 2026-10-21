# Design Spec — remote-nodes-page (autobyteus-267)

## Solution And Approval Basis

- Package: `remote-nodes-page`; Task autobyteus-267.
- Requirements: [requirements-doc.md](requirements-doc.md), `Approved` at SR-002.
- The approved UI/UX package is Product-owned and normative: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/remote-nodes-page/ui-ux-spec.md`, with VIS-001 … VIS-007. Its runnable UI reference is the design repository `personal` @ `d9e25db`, runbook section `remote-nodes-page`. The reference source for the page is `components/settings/RemoteCollaborationPeersSection.vue`, `RemoteCollaborationOfferDisclosure.vue` and `RemoteCollaborationOfferList.vue`. Its store, `stores/remoteCollaborationOffersStore.ts`, and the scripted answers are design-only.
- Current solution revision ID: `SR-003`. Design status: `Ready`.
- Authorities read: `solution-designer/SKILL.md`, `references/architecture-design.md`, `references/design-principles.md`, `references/ticket-scope.md`, the repository's `DESIGN.md` (rules 1, 5 and 9), and `collaboration_model.md` (CM-12, unchanged). All were read in this conversation.
- Conflicts or discrepancies: none.

## Current-State Read

- **The page:** `RemoteCollaborationCard.vue` holds the switch card, `RemoteCollaborationPeersSection.vue` and the availability card. `remoteCollaborationStore` loads `peerNodes` and runs add, rename and remove through GraphQL `RemoteCollaborationSettingsResolver`.
- **The agents' source (261):** `RemoteNodeDiscovery.listAvailableAgents(name)` runs `PeerClient.findPeer(name)`, then `PeerClient.listAvailableAgents(nodeId)`. `PeerClient.call` applies the switch, the registration, the 20 s bound, the identity check and the refusal codes.
- **The GraphQL client:** Apollo `HttpLink`, no batching (`plugins/30.apollo.client.ts`). Each query is its own HTTP request, so peers settle independently.

## Task Size And Architectural Risk (Mandatory)

- `task_size`: `Medium`. One GraphQL query and one discovery method on the server; on the web, one store, two new components, a reshaped peers section, the removal of the availability card, strings in two languages, and tests and docs.
- `architectural_risk`: `Low`.
  - The contract between nodes is unchanged; the page reuses 261's discovery path as it is.
  - The new GraphQL query is window ↔ own server, inside one release (rule 9).
  - There is no persistence and no security change: the window never contacts a peer, and the fields are a subset of what agents already get.
  - The window's per-peer async state is local to one store, with a stated stale-answer rule.
- Escalation trigger: `High` if implementation needs a change to the peer contract or to `PeerClient` or `PeerGateway` behavior.

## Intended Change

The window asks its own server for one peer's offer at a time with `peerNodeOffer(nodeId)`. The server answers through the same `RemoteNodeDiscovery` the agent tools use: the entries, or the refusal code. A new web store keeps one state per peer (checking, available, unavailable) and asks at the moments the spec names. The peers section renders those states as the UI/UX spec specifies. The availability card is removed; its rules move into a collapsed line.

## Change Scope (Mandatory)

- Changes:
  - server: `remote-collaboration/discovery/remote-node-discovery.ts`, `api/graphql/types/remote-collaboration-settings.ts`, docs;
  - web: `stores/`, `graphql/queries/remoteCollaborationQueries.ts`, `components/settings/RemoteCollaboration*.vue`, `localization/messages/{en,zh-CN}/remoteCollaborationSettings.ts`, `docs/settings.md`.
- Left alone:
  - `PeerClient`, `PeerGateway` and the peer requests;
  - the agent tools and their texts;
  - `peers.json` and `PeerDirectory`;
  - the switch card;
  - the add, rename and remove behavior.
- Follow-ups found during design: none.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Trigger | Target path | Spine |
| --- | --- | --- | --- |
| REQ-501/502/503 | The window asks for a peer | `PeersSection` → `remoteCollaborationOffersStore.ask(nodeId)` → GraphQL `peerNodeOffer(nodeId)` → `RemoteNodeDiscovery.listAvailableAgentsOf(nodeId)` → `PeerClient.listAvailableAgents` → the peer's gateway | DS-001 |
| REQ-504 | Open, add, switch on, Refresh | The store's `askAll(peers)` or `ask(nodeId)` | DS-002 |
| REQ-507 | Expand, search | `RemoteCollaborationOfferDisclosure` / `RemoteCollaborationOfferList`, all in the window | — |
| REQ-508 | Switch off | The store's `clear()`; the notice | DS-002 |
| BEH-502 | — | The rules line in the peers section; the availability card removed | — |

## Task Design Health Assessment (Mandatory)

- Change posture: a UI feature on an existing server owner.
- Root cause classification: `No Design Issue Found`. `RemoteNodeDiscovery` already owns "a peer's offer". It gains one entry by node ID, which the name-based method then uses, so there is one path and no duplicate.
- Refactor needed now: no.
  - `RemoteCollaborationPeersSection.vue` grows by the header chip and refresh icon, the sentence, the disclosure, the notice and the rules line. The offer list and the disclosure are separate components (as in the UI reference), so the section stays a list of peers.
  - `remoteCollaborationStore` keeps the peers. The per-peer offer state is its own store, because it has a different lifecycle: per view, never cached.

## Legacy Removal Policy (Mandatory)

Clean cut. The availability card and its keys `availability.title` and `availability.note` are removed. The rules text moves to `rules.*`.

## Persisted Data / State Transition Decision

`Not Affected`.

## Data-Flow Spine Inventory

| ID | Scope | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | The window asks for one peer | That peer's state on the page | `remoteCollaborationOffersStore` (window), `RemoteNodeDiscovery` (server) | REQ-501 … REQ-503 |
| DS-002 | Bounded local | A trigger (open, add, switch on or off, Refresh, remove) | Per-peer states | `remoteCollaborationOffersStore` | REQ-504, REQ-508 |

## Primary Execution Spine(s)

- DS-001: `Peers section → offers store.ask(nodeId) → GraphQL peerNodeOffer → RemoteCollaborationSettingsResolver → RemoteNodeDiscovery.listAvailableAgentsOf(nodeId) → PeerClient.listAvailableAgents → peer: PeerGateway → RemoteCatalogLister → answer → {entries} | {refusalCode} → store state → chip, sentence, disclosure`

## Spine Narratives (Mandatory)

**DS-001**
1. The resolver calls `RemoteNodeDiscovery.listAvailableAgentsOf(nodeId)`. That is the new public method; `listAvailableAgents(name)` now resolves the name and calls it. Page and tools therefore share one path.
2. An accepted answer maps to `{entries: [{name, kind, description?}]}`. The address is not sent to the window, which doesn't show it.
3. A refusal maps to `{refusalCode}`. The agent-facing message stays on the server, because the window words the reason itself (DEC-504).
4. The query takes at most about 20 s (the client's bound).

**DS-002: the store's rules**
- **State per peer:** `checking`, `available {entries, checkedAt}` or `unavailable {code}`. `checkedAt` is the window's clock when the answer arrived. Entries are sorted by name within each kind, with `localeCompare`.
- **When peers are asked:**
  - `askAll(peers)` runs when the tab is opened and its peers are loaded with the switch on, and when the switch turns on;
  - `ask(nodeId)` runs on Refresh, and for the new peer after a successful add (the add mutation returns its `nodeId`).
- **When state is dropped:**
  - `clear()` runs when the switch turns off, and when the tab is left; returning asks again.
  - A removed peer's state is dropped.
- **Stale answers:** every ask takes a token per peer. An answer whose token is no longer current is ignored: a peer removed or asked again, the switch turned off, or the tab left.
- **Errors:**
  - A refusal code other than the four the spec words is shown as ST-05 "Not reachable" (for example `BAD_REQUEST` from a mismatched peer).
  - A GraphQL or network error of the query itself is also ST-05.
  - Nothing retries.
- **Polling:** none.

## Ownership Map

| Node | Owns |
| --- | --- |
| `RemoteNodeDiscovery.listAvailableAgentsOf(nodeId)` (new method) | A peer's offer by node ID, for both the tools and the page |
| `peerNodeOffer` (new query in `RemoteCollaborationSettingsResolver`) | Mapping the discovery answer to `PeerNodeOfferGql`; fields with a value only, as far as GraphQL allows (`description` null when absent; exactly one of `entries` / `refusalCode` set) |
| `remoteCollaborationOffersStore` (new, `stores/remoteCollaborationOffersStore.ts`) | Per-peer state, triggers, tokens, sorting, `checkedAt` |
| `RemoteCollaborationPeersSection.vue` (modified) | Each peer's row as the spec draws it (chip, sentence or disclosure, refresh), the switch-off notice, the rules line, and the triggers wired to the store |
| `RemoteCollaborationOfferDisclosure.vue`, `RemoteCollaborationOfferList.vue` (new) | The one-line summary and the open groups with search ("more than 6" rule, "n of m", "No match.", clear) |
| `RemoteCollaborationCard.vue` (modified) | The availability card is removed |

## Removal / Decommission Plan (Mandatory)

- The availability `<section>` in `RemoteCollaborationCard.vue`, with its test assertions.
- The keys `…availability.title` and `…availability.note` in English and Chinese.

## Dependency Rules

- Allowed:
  - `api/graphql → remote-collaboration` (as today);
  - web components → the stores → `graphql/queries`.
- Forbidden:
  - the resolver calling `PeerClient` directly (it goes through `RemoteNodeDiscovery`);
  - the window contacting a peer URL;
  - components calling Apollo directly.

## Interface Boundary Mapping

```graphql
type PeerNodeOfferEntryGql { name: String!  kind: String!  description: String }   # kind: "agent" | "agent_team"
type PeerNodeOfferGql { entries: [PeerNodeOfferEntryGql!]  refusalCode: String }     # exactly one is set
extend type Query { peerNodeOffer(nodeId: String!): PeerNodeOfferGql! }
```

```ts
// RemoteNodeDiscovery
listAvailableAgentsOf(nodeId: string): Promise<readonly AvailableCollaboratorEntry[] | RemoteChannelRefusal>
listAvailableAgents(node: string)   // = findPeer(node) → listAvailableAgentsOf(peer.nodeId)
```

## Existing Capability / Subsystem Reuse Check

| Need | Reused |
| --- | --- |
| A peer's offer and its refusal codes | `RemoteNodeDiscovery`, `PeerClient` (261) |
| The peers list and its changes | `remoteCollaborationStore` |
| The switch state | `remoteCollaborationCapabilityStore` |
| The page's components and visual language | The UI reference components (to be ported) |

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `autobyteus-server-ts/src/remote-collaboration/discovery/remote-node-discovery.ts` | Modify: `listAvailableAgentsOf` |
| `autobyteus-server-ts/src/api/graphql/types/remote-collaboration-settings.ts` | Modify: `peerNodeOffer` and its two types |
| `autobyteus-web/graphql/queries/remoteCollaborationQueries.ts` | Modify: `GetPeerNodeOffer` |
| `autobyteus-web/stores/remoteCollaborationOffersStore.ts` | Add |
| `autobyteus-web/components/settings/RemoteCollaborationPeersSection.vue` | Modify |
| `autobyteus-web/components/settings/RemoteCollaborationOfferDisclosure.vue`, `RemoteCollaborationOfferList.vue` | Add |
| `autobyteus-web/components/settings/RemoteCollaborationCard.vue` | Modify (remove the card) |
| `autobyteus-web/localization/messages/{en,zh-CN}/remoteCollaborationSettings.ts` | Modify: the spec's string table |
| Tests | Server: discovery, resolver. Web: store, components (`__tests__`) |
| `autobyteus-web/docs/settings.md`, `autobyteus-server-ts/docs/modules/remote_collaboration.md` | Modify |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Rejected because |
| --- | --- |
| Keep the availability card hidden behind a flag | The user removed it; there is one current page |
| Detect an older peer and say so | Rule 9: it is "Not reachable" ("…or on an older version") |

## Change / Refactor Sequence

1. Server: `listAvailableAgentsOf`, then `listAvailableAgents` through it; the resolver query; tests.
2. Web: the query and the offers store with its rules and tests.
3. Web: port the UI reference components; wire the triggers; remove the card; strings; component tests against the spec's states and the VIS references.
4. Docs.

## Risks

- RSK-501: browsers keep at most 6 connections per server over HTTP/1.1. With more than 6 peers, several of them silent, a 7th peer's query waits behind them, so it shows Checking… longer than 20 s. It is accepted for the first version (DESIGN.md phase 2), because typical setups have a few peers.
- RSK-401 (from 261): any registered peer can read the list until S6. Unchanged.

## Guidance For Implementation

- Fidelity: follow the UI/UX spec's "Implementation Fidelity Boundary". Port the reference components, then replace the design-only store and script with the production store.
- Validation:
  - unit tests for the store's triggers, tokens and mapping;
  - component tests for ST-01 … ST-11;
  - an E2E run against two real servers: the peer states, the add-then-asked flow, switch off and on, and a black-holed peer that doesn't block;
  - screenshots compared with VIS-001 … VIS-007 at 1440 and 390 px, in English and Chinese.
- The user's check: AC-506.
