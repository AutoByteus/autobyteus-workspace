# Investigation Notes — remote-discovery (autobyteus-261)

## Investigation Meta

- Package: `remote-discovery`; Task **autobyteus-261** (slice S5 of autobyteus-25), with the wording follow-ups FU-002/FU-003 of autobyteus-247 merged in by the user (via the PTM, 2026-10-21).
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-discovery`, branch `codex/remote-discovery`, base `origin/personal` `8fbe77c461`. Finalization target: `origin/personal`.
- Authorities read: `solution-designer/SKILL.md`, `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md`; earlier in this conversation `DESIGN.md`, `TESTING.md`, `collaboration_model.md` (CM-1 … CM-12).
- How each finding was established: `Read` unless marked otherwise.

## Initial Request And Clarifications

The PTM's message (2026-10-21), from the user's approved Task:
1. List the available nodes: the registered peers, with the name an agent uses in `node`, whether each is reachable now, and whether remote collaboration is on there. A tool or a parameter: the Solution Designer proposes.
2. List the Agents and Agent Teams on a given node: `list_available_agents` with an optional `node` (none = local, as today). Each entry has its kind. Entries are short and carry only fields that have a value (the autobyteus-260 rule). There is a way to narrow by name. Then an agent can delegate without being told the address.
3. Wording, merged in: the `delegate_task` `node` description says "agent or agent team"; this is user-approved tool text, so show him the old and new text. The two refusal texts read correctly for Teams; the `targetKind` contract field is to be decided deliberately.

Rules: nothing is exposed to agents automatically; trusted private network only; a peer reveals names, kinds and descriptions only, never definitions, prompts or settings; no version checks (DESIGN.md rule 9: an old or unreachable peer is reported as not reachable); lists are read when asked, never cached. Also propose to the user whether autobyteus-262 (global send across nodes) joins this piece. No release unless asked.

autobyteus-260 (the PTM, 2026-10-21): TODO, not started. Its rule: return only fields that have a value. An absent field means none. 0 and false are values and stay. null, an empty list and an empty object are dropped. It is meant to become one central rule for all agent tools later. For 261, apply it yourself to the new entries and the new tool. Keep the entry builder in one place, and tell the user which fields are left out and why.

## Relevant Existing Behavior And Supported Product Paths

| ID | Fact | Source |
| --- | --- | --- |
| E-01 | `list_available_agents` is **opt-in**: an agent has it only when its definition selects it. It takes no arguments and returns `{agents: [{name, kind, address, description}]}`, where `kind` is `agent` or `agent_team`. `description` is `""` when the definition has none. | `agent-tools/agent-discovery/list-available-agents-contract.ts`; `runtime-agent-tool-exposure.ts:76` |
| E-02 | One schema and one description serve both runtimes: the native AutoByteus tool and the Agent Tools MCP adapter (`list-available-agents-mcp-adapter-provider.ts`), both through `buildListAvailableAgentsParameterSchema` and `listAvailableAgentsFor`. | same files |
| E-03 | The local list comes from `CollaboratorCandidatePolicy.listEligible(port)`: shared Agents, then shared Teams, in catalog order. It excludes built-ins, Orgs, the viewer's own definition and application-owned runs. Each entry is at its in-run or catalog address. | `collaborator-candidate-policy.ts` |
| E-04 | On the receiving node, delegation resolves a peer's address through the same policy with `NodeCatalogPort` ("this node, no run"): `catalogDefinitionAt(nodeCatalogPort, address)`. That port has no own definition, no in-run placements and no addresses in use. So **`policy.listEligible(nodeCatalogPort)` lists exactly the Agents and Teams a peer can delegate to, at the addresses delegation accepts**. Discovery and delegation then share one owner. | `node-catalog-port.ts`; `remote-delegation-receiver.ts:39` |
| E-05 | Peers are registered in `<data>/remote-collaboration/peers.json` as `{nodeId, name, baseUrl, addedAt}` (`PeerDirectory`). `name` is the value agents pass as `node`. | `peer-node.ts`, `peer-directory.ts` |
| E-06 | `PeerGateway.admit` is the single inbound entry. Its order: `toNodeId` must be this node (else `PEER_IDENTITY_MISMATCH`), then the switch must be on (else `OFF`), then the caller must be a registered peer (else `PEER_NOT_REGISTERED`), then dispatch. `PeerClient.call` maps an HTTP status other than 2xx, a transport failure or the 20 s timeout to `PEER_UNREACHABLE`, and an answer from the wrong node to `PEER_IDENTITY_MISMATCH`. **A request kind this release adds therefore gets every node-state answer for free.** A peer that lacks the route answers 404, which reads as unreachable (rule 9). | `peer-gateway.ts`, `peer-client.ts` |
| E-07 | Today's request kinds are `POST /rest/remote/delegated-runs` and `POST /rest/remote/messages`. | `remote-requests.ts` |
| E-08 | The switch `ENABLE_REMOTE_COLLABORATION` is off by default. `delegate_task`'s `node` parameter is always in the schema, and using it with the switch off is refused with "turned off" (slice 1 DEC-104: any agent that has `delegate_task`, once the switch is on and the peer is registered). | `remote-collaboration-capability.ts`; `task-delegation-tool-parameter-schemas.ts:36`; 191 `requirements-doc.md` DEC-104 |
| E-09 | The refusal texts live in `peerRefusalText`. `AGENT_NOT_FOUND` reads `Node "X" has no Agent at <address> that can be delegated to.`; `AGENT_CANNOT_RUN` reads `The Agent <name> on node "X" cannot run there: <reason>`. The refusal answer carries `targetName` and no kind. `peerNotRegistered` ends "Use a node name the user gave you." | `remote-refusals.ts`, `remote-requests.ts:44` |
| E-10 | The `delegate_task` `node` description (approved text) is pinned by `agent-team-collaboration-llm-contract.test.ts`. | `agent-team-collaboration-llm-contract.ts:49` |
| E-11 | There is a precedent for referring to an opt-in tool the agent may not have: "If you have list_available_agents, it shows the addresses you can use." | `docs/modules/agent_tools.md:319` |
| E-12 | Global send (262) today: a run ID outside the sender's root goes to `GlobalAgentRunMessageRouter`'s live-only path (this process's active runs). Slice 1 DEC-105 limits cross-node messages to linked runs. | `global-agent-run-message-router.ts` |

## Supplemental Artifact Inventory

None.

## Assumptions, Unknowns, And Risks

- Lists are small (tens of entries). Filtering on the asking node is enough.
- No unknown blocks the requirements. No prerequisite was found: the gateway, the client and the eligibility policy are reused as they are.

## Notes For Architecture Design

- E-04 and E-06 give the shape: one new request kind through `PeerGateway`, answered with `policy.listEligible(nodeCatalogPort)` reduced to the revealed fields, and a node status derived from `PeerClient`'s existing outcome mapping.
