# Design Spec — remote-discovery (autobyteus-261)

## Solution And Approval Basis

- Package: `remote-discovery`; Task autobyteus-261 (slice S5 of autobyteus-25).
- Requirements: [requirements-doc.md](requirements-doc.md), `Approved` at SR-002 by the user (2026-10-21). Investigation: [investigation-notes.md](investigation-notes.md).
- Current solution revision ID: `SR-003`. Design status: `Ready`.
- Authorities read: `solution-designer/SKILL.md`, `references/architecture-design.md`, `references/design-principles.md`, `references/ticket-scope.md`, `references/finding-the-cause.md`, the repository's `DESIGN.md` (rules 1, 5 and 9 apply), `autobyteus-server-ts/docs/design/collaboration_model.md`.
- Conflicts or discrepancies: none.

## Current-State Read

- Local listing: tool → `MemberCollaborationContext.listAvailableAgents` → the sender's root → `CollaboratorCandidatePolicy.listEligible(rootPort)` (E-01 … E-03).
- Remote delegation: the root's `RemoteDelegation` → the `RemoteRunChannel` port (owned by `agent-collaboration/execution/remote`, implemented by `PeerClient`) → `POST /rest/remote/delegated-runs` → `PeerGateway.admit` → `RemoteDelegationReceiver` → `CollaboratorAdmission` with `NodeCatalogPort` (E-04 … E-07).
- Dependency rule since slice 1: `agent-collaboration` and `agent-tools` never import `remote-collaboration`. They use ports that `agent-collaboration` owns and the composition binds.

## Task Size And Architectural Risk (Mandatory)

- `task_size`: `Medium`. About 15 files across existing owners: one new tool family member, two request kinds behind the existing gateway, one discovery owner, and text and contract edits. No new subsystem, no persistence.
- `architectural_risk`: `High`. It changes the contract between nodes (two new request kinds; the refusal answer's `targetName` becomes `target`). It is a new read-only exposure of a node's catalog to peers (security-relevant, trusted network). And it changes approved agent-facing texts.
- Escalation trigger: none further. A need for persisted state or a root-level change would make it `Large`.

## Intended Change

A node answers two new peer requests, *availability* and *available agents*, through its one gateway. The asking node has one discovery owner that lists the peers with a status and lists one peer's offer. The new opt-in tool `list_available_nodes` and the new optional `node` of `list_available_agents` reach that owner through a port. The refusal answer names the target's kind, so the texts read correctly for Agent Teams.

## Change Scope (Mandatory)

- Changes:
  - `agent-tools/agent-discovery/*` and the runtime exposure wiring;
  - `agent-collaboration/collaborators/` (entry builder) and `agent-collaboration/execution/remote/` (new port; refusal texts unchanged there);
  - `remote-collaboration/{channel,domain,inbound,discovery}`;
  - `api/rest/remote.ts`, `compositions/remote-collaboration-composition.ts`;
  - the agent-facing texts in `agent-team-collaboration-llm-contract.ts`;
  - docs.
- Deliberately left alone:
  - the roots (standalone, Team, Org) and their member-context builders;
  - `CollaboratorCandidatePolicy` eligibility;
  - `PeerDirectory` and `peers.json`;
  - the Nodes tab UI;
  - built-in definitions;
  - global send (262);
  - the central result rule (260).
- Follow-ups found during design: none.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Trigger | Target path | Spine |
| --- | --- | --- | --- |
| BEH-401 | Agent calls `list_available_nodes` | tool → `RemoteDiscoveryChannel.listNodes` → `RemoteNodeDiscovery` → `PeerDirectory.list` + `PeerClient.checkAvailability` (parallel) → peer gateway | DS-001 |
| BEH-402 | Agent calls `list_available_agents {node}` | tool → `RemoteDiscoveryChannel.listAvailableAgents` → `RemoteNodeDiscovery` → `PeerClient.listAvailableAgents` → peer gateway → `RemoteCatalogLister` → `policy.listEligible(nodeCatalogPort)` | DS-002 |
| BEH-402 (preserved) | `list_available_agents` without `node` | unchanged root path; entries through the one entry builder | — |
| BEH-404 | A delegation refused on the peer | `RemoteDelegationReceiver` / `RemoteTeamRunStarter` answer `target {kind, name}` → `PeerClient` → `peerRefusalText` | DS-003 |

## Task Design Health Assessment (Mandatory)

- Change posture: feature, plus a small contract correction (FU-002).
- Root cause classification: `No Design Issue Found`. The gateway (one inbound entry), the client (one outbound transport with failure mapping) and the eligibility policy (one owner of what is offered) absorb the feature. Discovery reuses all three.
- Refactor needed now: no.
- Why the remote listing does not go through the roots: the offer of a peer does not depend on the sender's run. B lists with no run (`NodeCatalogPort`). Routing it through three roots' delivery services would add the same forwarding three times (Principle 13, empty indirection). The tool's availability still requires a collaboration context, as today.

## Legacy Removal Policy (Mandatory)

Clean cut. `targetName` on the refusal answer is replaced by `target`, with no parallel field (rule 9).

## Persisted Data / State Transition Decision

`Not Affected`. Nothing is stored; lists are read per call (REQ-407).

## Data-Flow Spine Inventory

| ID | Scope | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | `list_available_nodes` call on A | `{nodes:[{name,status}]}` | `RemoteNodeDiscovery` (A) | UC-401 |
| DS-002 | Primary | `list_available_agents {node}` on A | `{agents:[…]}` from B's catalog | `RemoteNodeDiscovery` (A), `RemoteCatalogLister` (B) | UC-402 |
| DS-003 | Return | B refuses a delegation | A's agent reads a kind-correct text | `peerRefusalText` (A) | UC-403 |
| DS-004 | Bounded local | `PeerGateway.admit` | dispatch or refusal | `PeerGateway` | Unchanged order; two more kinds use it |

## Primary Execution Spine(s)

- DS-001: `Agent → list_available_nodes tool → RemoteDiscoveryChannel (port) → RemoteNodeDiscovery → PeerClient.checkAvailability ×N (parallel) → B: PeerGateway.admit → {accepted} → status per peer → tool result`
- DS-002: `Agent → list_available_agents {node} → RemoteDiscoveryChannel → RemoteNodeDiscovery → PeerClient.listAvailableAgents → B: PeerGateway.admit → RemoteCatalogLister → CollaboratorCandidatePolicy.listEligible(NodeCatalogPort) → entries → A: entry builder → tool result`
- DS-003: `B: RemoteDelegationReceiver/RemoteTeamRunStarter refusal {code, message, target{kind,name}} → PeerGateway → A: PeerClient.call → peerRefusalText → delegate_task result message`

## Spine Narratives (Mandatory)

- **DS-001.**
  1. The tool checks that this node's switch is on through the port; if it is off, the result is the "turned off" refusal and nothing is sent.
  2. `RemoteNodeDiscovery` reads the registered peers, in `peers.json` order.
  3. It asks each one for *availability* at the same time, each bounded by `PEER_REQUEST_TIMEOUT_MS` (20 s).
  4. An accepted answer is `available`. Anything else is `unavailable`: a refusal by the peer (switch off, this node not registered), the wrong node answering, an HTTP error (an older build without the route answers 404), a transport failure or a timeout.
  5. The whole call takes at most about 20 s.
- **DS-002.**
  1. The tool passes `node` to the port. `RemoteNodeDiscovery` resolves the peer by name, with the same refusal as `delegate_task` for an unknown name, and calls *available agents*.
  2. On B, the gateway admits the request in the existing order. `RemoteCatalogLister` lists `policy.listEligible(nodeCatalogPort)`: the exact set and addresses `catalogDefinitionAt(nodeCatalogPort, …)` accepts.
  3. B maps each entry through the entry builder to `{name, kind, address, description?}`.
  4. A reads the answer strictly. If it is malformed, the result is the unreachable refusal "it answered without its list". A then rebuilds each entry through the same builder.
  5. A refusal becomes a tool error with the existing text.
- **DS-003.** B knows the kind from the definition reference it resolved (`ref.kind`), or `agent_team` in the Team starter. A words it with "Agent" or "Agent Team".

## Ownership Map

| Node | Owns |
| --- | --- |
| `list_available_nodes` tool (new) | Its name, description and empty schema; mapping the port's answer or refusal to the tool result |
| `list_available_agents` contract (modified) | The `node` parameter; choosing the local root path or the port |
| `availableCollaboratorEntry` (new, `agent-collaboration/collaborators/available-collaborator-entry.ts`) | The one shape of a listed entry: `name`, `kind`, `address`, and `description` only when not empty. 260's central rule can take it over |
| `RemoteDiscoveryChannel` (new port, `agent-collaboration/execution/remote/remote-discovery-channel.ts`) | What collaboration code may ask about peers: `listNodes()`, `listAvailableAgents(node)`; process binding like `RemoteRunChannel` |
| `RemoteNodeDiscovery` (new, `remote-collaboration/discovery/remote-node-discovery.ts`) | This node's switch check; the fan-out over registered peers; status mapping; peer lookup by name |
| `PeerClient` (modified) | Two more calls through its existing `call` (envelope, timeout, identity check, refusal mapping); strict reading of the list answer |
| `PeerGateway` (modified) | Two more request kinds through `admit`; *availability* needs no handler |
| `RemoteCatalogLister` (new, `remote-collaboration/inbound/remote-catalog-lister.ts`) | B's answer: the eligible list through the node catalog port, as entries |
| `peerRefusalText` (modified) | Kind-correct texts |

## Removal / Decommission Plan (Mandatory)

- `targetName` on `RemoteRefusalAnswer`, `PeerHandlerRefusal` and in `PeerClient.call` and `peerRefusalText`'s signature: replaced by `target: {kind, name}`.
- The per-entry `Object.freeze({name, kind, address, description})` mapping in `listAvailableAgentsFor`: replaced by the entry builder.
- No dead code found in the touched files (to be confirmed by implementation's unused-export check).

## Dependency Rules

- Allowed:
  - `agent-tools → agent-collaboration` (the port, the entry builder);
  - `remote-collaboration → agent-collaboration` (implements the port, uses the policy and the builder);
  - `compositions → both`;
  - `api/rest → remote-collaboration` (the gateway).
- Forbidden:
  - `agent-tools` or `agent-collaboration` importing `remote-collaboration`;
  - a tool reaching `PeerClient` or `PeerDirectory` directly;
  - `RemoteCatalogLister` reading definitions other than through `CollaboratorCandidatePolicy`.

## Interface Boundary Mapping

```ts
// agent-collaboration/execution/remote/remote-discovery-channel.ts
export type AvailableNode = Readonly<{ name: string; status: "available" | "unavailable" }>;
export interface RemoteDiscoveryChannel {
  /** Registered peers in registration order, each checked now; the refusal when this node's switch is off. */
  listNodes(): Promise<readonly AvailableNode[] | RemoteChannelRefusal>;
  /** What the peer named `node` offers for delegation; a refusal with the same texts as delegate_task. */
  listAvailableAgents(node: string): Promise<readonly AvailableCollaboratorEntry[] | RemoteChannelRefusal>;
}
```

Requests between nodes (`remote-requests.ts`):

| Route | Body | Accepted answer |
| --- | --- | --- |
| `POST /rest/remote/availability` | envelope `{fromNodeId, toNodeId}` | `{accepted: true, nodeId}` |
| `POST /rest/remote/available-agents` | envelope | `{accepted: true, nodeId, agents: [{name, kind, address, description?}]}` |

Refusal answer (all routes): `{accepted: false, nodeId, code, message, target?: {kind: "agent" | "agent_team", name}}`. `target` is present for `NO_DEFAULT_RUNTIME` and `AGENT_CANNOT_RUN`.

## Main Domain Subject Naming Check

- "available nodes" is the user's term (the tool `list_available_nodes`, the type `AvailableNode`).
- "Remote" names A's discovery side; "Peer" names the transport and gateway, as since slice 1.

## Existing Capability / Subsystem Reuse Check

| Need | Reused |
| --- | --- |
| Inbound admission (switch, registration, identity) | `PeerGateway.admit` |
| Outbound transport, timeout, failure mapping | `PeerClient.call` |
| What a node offers | `CollaboratorCandidatePolicy.listEligible` with `NodeCatalogPort` |
| Refusal texts | `peerRefusalText`, `localRefusalText` |
| Tool exposure | `RuntimeAgentToolExposure` (one more opt-in flag), the tool registry, the MCP adapter providers |

## Shared Structure / Data Model Tightness Check

- `AvailableCollaboratorEntry`: one shape for local and remote entries and for the wire. There is no node field on entries: the agent asked for one node.
- `AvailableNode`: two fields, both always set. Left out: node ID, URL and `addedAt` (the agent can't use them), and the reason (`list_available_agents` with that node gives it, worded in one place).
- `target {kind, name}` replaces one loose field with one tight one.

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `agent-tools/agent-discovery/list-available-nodes-contract.ts` | Add: name, description, schema, `listAvailableNodesFor(port)` |
| `agent-tools/agent-discovery/list-available-nodes-tool.ts` | Add: the native tool and its registration (as the agents tool) |
| `agent-tools/mcp/providers/list-available-nodes-mcp-adapter-provider.ts` | Add; listed in `default-agent-tool-mcp-adapter-providers.ts` |
| `agent-tools/agent-discovery/list-available-agents-contract.ts` | Modify: `node` parameter, description, entries through the builder |
| `agent-tools/agent-discovery/list-available-agents-tool.ts`, `…/list-available-agents-mcp-adapter-provider.ts` | Modify: pass the arguments |
| `agent-execution/shared/runtime-agent-tool-exposure.ts`, `backends/autobyteus/autobyteus-agent-tool-resolver.ts`, `backends/claude/session/claude-session-tooling-options.ts`, `agent-tools/mcp/agent-tool-mcp-session-registry.ts`, `startup/agent-tool-loader.ts` | Modify: `listAvailableNodesEnabled`, the same availability rule as `list_available_agents` |
| `agent-collaboration/collaborators/available-collaborator-entry.ts` | Add: the entry builder and type |
| `agent-collaboration/execution/remote/remote-discovery-channel.ts` | Add: the port and its process binding |
| `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | Modify: the texts below |
| `remote-collaboration/discovery/remote-node-discovery.ts` | Add |
| `remote-collaboration/inbound/remote-catalog-lister.ts` | Add |
| `remote-collaboration/channel/peer-client.ts`, `peer-gateway.ts` | Modify: two calls / two kinds; `target` |
| `remote-collaboration/domain/remote-requests.ts`, `remote-refusals.ts` | Modify: paths, answer types, `target`, texts |
| `remote-collaboration/inbound/remote-delegation-receiver.ts`, `remote-team-run-starter.ts` | Modify: `target {kind, name}` |
| `remote-collaboration/remote-collaboration-services.ts`, `compositions/remote-collaboration-composition.ts` | Modify: build and bind `RemoteNodeDiscovery`; the lister handler |
| `api/rest/remote.ts` | Modify: two routes |
| Docs: `agent_tools.md`, `remote_collaboration.md`, `agent_communication.md` (discovery), `collaboration_model.md` (CM-12, done in this design) | Modify |

## Concrete Examples / Shape Guidance

```json
// list_available_nodes
{"nodes":[{"name":"beta-node","status":"available"},{"name":"docker","status":"unavailable"}]}
// list_available_agents {"node":"beta-node"}
{"agents":[{"name":"Publisher","kind":"agent","address":"/publisher"},
           {"name":"Studio Team","kind":"agent_team","address":"/studio_team","description":"Writes and checks articles"}]}
// then
delegate_task {"node":"beta-node","recipient_address":"/studio_team","description":"…"}
```

Bad shape: `{"name":"beta-node","reachable":true,"collaborationOn":true,"nodeId":"srv_…","description":""}`. It has fields the agent can't use and an empty value.

## Agent-Facing Texts (DEC-406; wording delegated to the Solution Designer)

| Text | Old | New |
| --- | --- | --- |
| `delegate_task` `node` | "…and recipient_address is the address of an agent on that node." | "…and recipient_address is the address of an agent or agent team on that node." |
| `delegate_task` description, the node line | "With node in mode (1), the task agent starts on that peer node, from the agent at recipient_address there; …" | "With node in mode (1), the task agent starts on that peer node, from the agent or agent team at recipient_address there; …" (the rest unchanged) |
| `list_available_agents` | "List the agents and agent teams you can work with, each with its name, kind (agent or agent_team), address and description. This read-only tool takes no arguments." | "List the agents and agent teams you can work with, each with its name, kind (agent or agent_team), address and description (when it has one). With node, list what that peer node offers for delegation instead; use an address from that list as recipient_address in delegate_task with the same node. This tool is read-only." |
| `list_available_agents` `node` (new) | — | "Optional: the name of a peer node registered on this node. Without it, this node's agents and agent teams are listed." |
| `list_available_nodes` (new) | — | "List the peer nodes registered on this node, each with its name and status: available (it takes work from this node now) or unavailable. Use the name as node in list_available_agents and delegate_task; for an unavailable node, list_available_agents with that node says why. This read-only tool takes no arguments." |
| Unknown node name | "No peer node named "X" is registered on this node, so nothing was sent. Use a node name the user gave you." | "…so nothing was sent. Use a node name the user gave you; if you have list_available_nodes, it lists them." |
| `AGENT_NOT_FOUND` | "Node "X" has no Agent at /x that can be delegated to." | "Node "X" has no Agent or Agent Team at /x that can be delegated to. If you have list_available_agents, call it with this node to see what it offers." |
| `AGENT_CANNOT_RUN`, Team | "The Agent Studio Team on node "X" cannot run there: …" | "The Agent Team Studio Team on node "X" cannot run there: …" (Agent text unchanged) |
| Malformed list answer (new) | — | "Node "X" could not be reached (it answered without its list)." (the existing unreachable form) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Rejected because |
| --- | --- |
| Keep `targetName` beside a new `targetKind` | Two parallel fields for one subject; rule 9 allows the clean cut |
| Detect a peer without the new routes and say "older version" | Rule 9: it is reported `unavailable`, as the user directed |

## Change / Refactor Sequence

1. The entry builder, and `listAvailableAgentsFor` through it (local tests stay green apart from the empty description).
2. The contract: `remote-requests.ts` paths and types, `target`.
3. B: the gateway kinds, `RemoteCatalogLister`, the routes, the composition.
4. A: the `PeerClient` calls, `RemoteNodeDiscovery`, the port and its binding.
5. The tools: `node` on `list_available_agents`, `list_available_nodes`, and the exposure on every runtime.
6. The texts and their pinned tests; then docs.

## Risks

- RSK-401: A listing is answered to any registered peer. Identity is claimed, not proven, until S6. Only names, kinds, addresses and descriptions are revealed, the same as a delegation already lets a registered peer probe. Accepted under the trusted-network direction.
- RSK-402: `list_available_nodes` can take up to 20 s when a peer black-holes packets. That is the bound the user already has for delegation (QR-102 of 191).

## Guidance For Implementation

Tests:
- **Unit:**
  - the entry builder (no empty description);
  - `RemoteNodeDiscovery`: available, refused, 404, timeout, wrong node, switch off, no peers;
  - `PeerClient`: a strict list answer and a malformed one;
  - the gateway's two kinds through `admit`;
  - `RemoteCatalogLister`: built-ins, Orgs and application-owned definitions excluded, and addresses equal to `catalogDefinitionAt`;
  - texts pinned in the contract tests;
  - exposure: the tool only when selected, on AutoByteus, Claude and MCP.
- **Two-server E2E:** AC-401 … AC-406 extend the existing suite: the four peer states, the listing then a delegation to a listed Team, and a Team added between calls.
- **The user's check:** AC-408, desktop ↔ Docker, both directions.
