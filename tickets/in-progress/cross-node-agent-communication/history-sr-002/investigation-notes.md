# Investigation Notes

## Investigation Meta

- Package identifier: `cross-node-agent-communication`
- Request / ticket: Cross-node agent collaboration (delegate work and messages with file attachments between AutoByteus nodes on a trusted private network)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication` / `codex/cross-node-agent-communication`
- Resolved base remote / branch / revision: `origin` / `personal` (remote HEAD) / `b0b077b02` (fast-forwarded 2026-10-01 at user request; original bootstrap base `8caa610ff438c288d9aca9f2efe2c33924fbf517`). Branch has no commits of its own; ticket folder is untracked.
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: Worktree and branch created from refreshed `origin/personal`; ticket folder `tickets/in-progress/cross-node-agent-communication/` created.
- Bootstrap blocker: None
- Current solution revision ID: `SR-002`
- Bookkeeping: parked as Project Task `project_task_6f01dae7-41fe-4645-94f6-f3ba1ce54069` (Project AutoByteus `project_a1377344-25db-482a-97cc-ecfdb0fb495a`, status TODO, not dispatched) on 2026-10-09; the Task holds copies of the four ticket artifacts as of that date.
- Investigation status: Requirements-phase investigation complete for the draft baseline; architecture-phase investigation not started.

## Initial Request And Clarifications

- Original request (2026-09-30): The product supports multiple nodes, but they are independent. The user generates a video on the host machine with one agent; another node has full computer use. Today the user must copy materials to that node manually, start an agent/team there and ask it to publish. The user asked whether `send_message_to` could support a node address, noted that reference files are local-only, and proposed a cluster-wide "context layer storage".
- Clarifications received (conversation 2026-09-30 → 2026-10-01):
  1. Discussed explicit file sending (agent sends files first, then a message using target paths) vs product-handled attachments. The user's guiding principle: the agent's context must stay consistent and the agent should know what it is doing. Agreed direction: the agent keeps today's mental model (message/task with attachments of its *own* files); the product transfers files and gives the receiver local paths; both sides receive explicit confirmation/mapping.
  2. Agreed that federation (each node authoritative for its own runs; server-to-server forwarding) fits the product better than a central broker or shared cluster state.
  3. The user sees the long-term direction as agents invoking agents on other people's nodes within a company, but explicitly: "first build the foundation". Public-network trust is out of scope for this ticket.
  4. The user clarified that people who trust each other can form a trusted private network over the internet via a VPN. Agreed: "trusted private network" is a topology statement (LAN, company network, VPN/overlay such as Tailscale/WireGuard/NetBird), not a geography statement.
  5. User instruction 2026-10-01: "continue please" — proceed with drafting requirements.
- User-supplied facts and constraints: Trusted network only; foundation first; future multi-owner direction should not be precluded.
- Initial ambiguity (still open, see requirements DEC table): server-to-server pairing, large-transfer blocking, standalone file tool, discovery, initiator eligibility.

## Product And Domain Understanding

- Product area: Agent communication / task delegation / nodes / remote access.
- Affected actors or systems: Node owner(s); sending agent run on node A; receiving agent/team run on node B; each node's AutoByteus server; desktop UI on each node.
- Existing user or operational purpose: Multi-node lets one desktop app open windows bound to several independent servers (embedded or remote/Docker). Agents collaborate only within one server.
- Relevant terminology:
  - Node: one AutoByteus server instance (embedded desktop server or remote/Docker server), identified by `serverInstanceId`.
  - Peer node: another node this node is paired with.
  - Published agent: an Agent or AgentTeam definition a node owner explicitly offers for remote invocation.
  - Remote-started run: an agent/team run on node B started on behalf of an agent on node A.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-09-30 | Code | `autobyteus-web/types/node.ts`, `autobyteus-web/electron/nodeRegistryTypes.ts`, `electron/nodeRegistryStore.ts` | How nodes are modeled | Node registry is a client-side (Electron) list of `{id,name,baseUrl,nodeType}`; windows bind to one node. Servers have no peer awareness. | Server-side peer concept is new. |
| 2026-09-30 | Code | `grep nodeId/remoteNode/federat` over `autobyteus-server-ts/src` | Any server-to-server awareness | Only file-explorer "node" (tree node) hits; no server-to-server routing exists. | — |
| 2026-09-30 | Code | `autobyteus-server-ts/src/services/reference-files/absolute-local-reference-files.ts` | Reference-file contract | `reference_files` must be absolute local filesystem paths; URLs/protocol paths are rejected. | Cross-node attachments need product-level transfer. |
| 2026-09-30 | Code | `src/agent-communication/services/send-message-to-tool-contract.ts`, `src/agent-tools/agent-communication/send-message-to-parameter-schema.ts` | Tool surface | Params: `recipient_address`, `target_agent_run_id`, `content`, `message_type`, `reference_files`. | — |
| 2026-09-30 | Doc | `autobyteus-server-ts/docs/modules/agent_communication.md` | Routing semantics | `recipient_address` is root-scoped; `target_agent_run_id` reaches same-root runs (with wake) or any *active* run on the same server (live-only). "Out of Scope: distributed inbox, inactive-run queue, global run discovery, cross-process routing." Acceptance = admitted into target FIFO, at-most-once. | Cross-node is a new capability boundary; keep acceptance semantics. |
| 2026-10-01 | Code | `src/agent-communication/services/send-message-to-dispatcher.ts`, `global-agent-run-message-router.ts`, `global-agent-run-message-runtime-builders.ts` | Exact delivery path | `SendMessageToDispatcher → GlobalAgentRunMessageRouter → AgentRunManager.getActiveRun → AgentRun.postUserMessage`. Visible content: "You received a message from sender name: X, sender id: Y … Reference files: …". Metadata carries sender id/name/runtime kind, reference files. | Architecture: remote branch + inbound admission reusing `postUserMessage`. |
| 2026-10-01 | Code | `src/agent-communication/domain/agent-run-message-sender.ts`, `send-message-target-selector.ts` | Sender identity / selector | Sender = `{senderRunId, senderName, runtimeKind, memberExecutionContext}`; selector is a 2-kind union. No node identity. | Sender identity must gain node origin. |
| 2026-10-01 | Code | `src/agent-communication/services/direct-agent-run-message-grant-registry.ts` (doc §Optional Direct-Message Grants) | Existing permission precedent | Grants narrow allowed targets, message types, reference-file roots, max deliveries, expiry. Used by Retrospective Skill Improver. | Precedent for delegator↔remote-run follow-up permission. |
| 2026-10-01 | Doc / Code | `docs/modules/agent_team_execution.md` §Server-Owned Task Delegation, §Delegated Child Lifecycle; `src/agent-tools/task-delegation/task-delegation-tool-contract.ts` | `delegate_task` semantics | Pure spawn of a mounted definition in the caller's root; returns `{target_agent_run_id}` or `{null, message}`. Requires team/org member context. Delegated children idle-shutdown (default 10 min) and are woken only by same-root senders. | Cross-node delegation targets a *published* definition on another node; follow-ups must be able to reach a non-active remote-started run. |
| 2026-10-01 | Code | `src/context-files/domain/context-file-owner-types.ts`, `src/context-files/store/context-file-layout.ts`, `src/api/rest/context-files.ts` | File-storage precedent | Per-run context files stored under run memory dir (`context_files`), served via REST locators, deleted with run. | Received attachments can follow the same ownership model. |
| 2026-10-01 | Code / Doc | `src/remote-access/services/server-instance-identity-service.ts`; `autobyteus-web/docs/remote_access.md` | Identity and trust model | Each server has a stable `srv_…` `serverInstanceId`; phone pairing verifies URL identity via `/rest/remote-access/status`, then exchanges a one-time code for a scoped credential. Desktop remote-node access to the full backend is trusted-network-only with no secret; docs recommend Tailscale/company VPN/NetBird/WireGuard and forbid public exposure. | Pairing precedent for server-to-server; full-backend openness is a pre-existing adjacent risk. |
| 2026-10-01 | Doc | `autobyteus-server-ts/docs/modules/agent_communication.md` §Runtime Projection; `docs/modules/agent_tools.md` | Tool exposure across runtimes | AutoByteus, Codex, Claude and external runtimes share one dispatcher via local tool or `autobyteus_agent_tools` MCP. Standalone runs need explicit configuration for `send_message_to`. | New capability must be exposed uniformly across runtimes. |
| 2026-10-01 | Code | `autobyteus-web/services/agentStreaming/agentStreamMessageProjector.ts` | Receiver UI | `INTER_AGENT_MESSAGE` events render as structural conversation entries. | Origin node must be representable. |
| 2026-10-01 | Command / Code / Doc | `git merge --ff-only origin/personal` (→ `b0b077b02`); `git diff 8caa610ff HEAD -- src/agent-communication src/agent-tools/task-delegation src/services/reference-files src/remote-access`; `docs/modules/agent_run_collaboration.md`; `docs/modules/agent_communication.md` §Collaborators; `docs/modules/agent_tools.md:55`; `tickets/done/cross-scope-agent-mentions/handoff-summary.md` | Re-verify evidence after base update (released `cross-scope-agent-mentions`, v1.4.92-beta.5) | (1) `send_message_to` dispatcher/router/visible message builder and reference-file validation unchanged. (2) Every user-facing run — including standalone Agent runs (new `agent` collaboration root, `src/agent-run-collaboration/`) — always has `send_message_to` and `delegate_task` from its first turn; server-helper and application-owned runs excluded. `delegate_task` contract now accepts any root kind (`isRootSubjectKind`). (3) `@` collaborators: a user types `@` in a live run to bring a shared Agent/Team in; the run hosts one instance at a root-level address (e.g. `/product_team`), added when the message is sent, Offline until first message, persisted/restored with the run; reached by `send_message_to` address; `delegate_task` to it starts an extra copy. (4) Agent-to-agent deliveries are recorded with sender and shown as "From <Sender>:". (5) Collaborator run IDs reached from another root follow the live-only rule (no wake). | BEH-003 current behavior updated; DEC-006 rationale updated; `@` collaborator model recorded as a design/product option for remote targets (OPT-001). |
| 2026-10-01 | User | Conversation | Scope/trust | Trusted private network incl. VPN; foundation first; no public-network design. | Recorded as scope. |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User / Operational | User adds a remote node in Nodes → Manage Nodes | Desktop app stores node profile locally; opens a window bound to that node | Nodes are independent; servers unaware of each other | `types/node.ts`, `docs/remote_access.md` | High |
| BEH-002 | Contract | Agent calls `send_message_to` | Delivered only to runs on the same server (root route or active-run route) | Cross-server delivery impossible | `agent_communication.md` | High |
| BEH-003 | Contract | Agent calls `delegate_task` | Spawns a configured member or `@` collaborator definition within the caller's own collaboration root (Team, Org, or standalone Agent root) on the same server | No cross-server spawn | `agent_team_execution.md`; `agent_run_collaboration.md` (base `b0b077b02`) | High |
| BEH-008 | User | User types `@` in a live run | Picks a shared local Agent/Team; on send the run hosts one collaborator instance at a root-level address; the focused agent is told the address and uses `send_message_to` | Only local definitions; collaborators live on the same server | `agent_communication.md` §Collaborators | High |
| BEH-004 | Contract | `reference_files` on message/delegation | Absolute local paths passed through to the receiver unchanged | Paths are meaningful only on the same machine | `absolute-local-reference-files.ts` | High |
| BEH-005 | User | User workaround (from request) | Copy files manually to node B, start agent/team on B, instruct it | Manual, error-prone | User report | High |
| BEH-006 | Contract | Delegated child idle | Child shuts down after grace; same-root sender wakes it on message | Cross-root senders cannot wake | `agent_team_execution.md` | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `SendMessageToDispatcher` / `GlobalAgentRunMessageRouter` | Single shared send path for all runtimes | Cross-node messages must keep identical semantics across runtimes | Add remote branch without forking runtime-specific behavior |
| `AgentRun.postUserMessage` | Single admission owner | Remote messages must reach the run through the same admission owner | Inbound endpoint ends at the same owner |
| `DirectAgentRunMessageGrantRegistry` | Narrow messaging permissions | Follow-up permission model exists | Persisted/cross-node grant variant |
| Context-file layout | Run-owned file storage | Received attachments owned by and deleted with receiving run | Reuse vs. new inbox layout |
| `ServerInstanceIdentityService` | Stable server identity | Peer identity pinning | Pairing protocol |
| Phone pairing (`remote-access-pairing-service.ts`) | One-time code → scoped credential | Precedent for server-to-server pairing | Reuse patterns, separate credential type |
| Electron node registry | Client-only node list | Peer registry must exist server-side | Relationship between client node list and server peer list |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Message/delegation payloads (content, message type, reference files); new: sender node identity, attachment descriptors (name, size, hash).
- Existing readers/writers: dispatcher, router, runtime builders, Team Communication projection, frontend stream projector.

### Structural Surfaces

- New server-to-server API surface (inbound endpoints), new peer registry persistence, published-agent settings, run origin metadata, received-attachment storage, follow-up grant persistence.
- Existing: agent-communication module, task-delegation tools, context-file storage, remote-access identity/pairing, Agent Tools MCP server.

### Potential Structural Impacts To Investigate

- API or external-contract change: Yes — new inter-node protocol; agent tool surface gains node targeting.
- Persistence schema or invariant change: Yes — new records (peers, published agents, origin metadata, grants).
- Security or privacy boundary change: Yes — new inbound surface accepting agent input and files from peers.
- Concurrency or lifecycle change: Yes — remote-started run lifecycle, wake on follow-up, large transfer lifecycle.
- Deployment/migration/ownership: No migration of existing data expected; new module ownership.

## Runtime, Probe, Or Reproduction Findings

None yet (no runtime probes needed for requirements; behavior gaps are confirmed from code and docs).

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (owner of host + computer-use node) | Hand a generated video to an agent on another node for publishing without manual copying | Direct report | Core scenario SCN-003 | — |
| User | Agent context must stay consistent; agent handles only its own paths | Direct statement | Attachments of own files; receiver gets local paths + mapping | — |
| User | Trusted network (incl. VPN) only; foundation first | Direct statement | Scope guardrail | — |
| User | Future: invoke agents on other people's nodes | Direct statement (future) | Foundation must not preclude multi-owner; published agents + grants | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| VPN/overlay networks (Tailscale, WireGuard, NetBird, company VPN) | User-operated | Provide reachability between nodes | `docs/remote_access.md` | Product does not manage them |
| Agent-to-agent interop protocols (e.g., A2A) | External | Possible future interop target | Discussion only | Not evaluated; out of scope |

## Persisted Data And State Facts

- Affected stored subject: New only — peer pairings, published-agent settings, remote-run origin metadata, received attachments, follow-up permissions. Existing run/team history unaffected.
- Required semantics: Received attachments belong to the receiving run and are removed with its history.
- Acceptable loss: N/A for existing data (none changed).
- Remaining evidence gap: Exact storage locations decided in architecture.

## Product Design Request Context

- Product Design request in the current input: `Present` (2026-10-01).
- User's requested outcome, in the user's own terms: "can you send a request to product prototype? I want to brainstorm with the product prototype because it's much easier to brainstorm with the product prototype itself."
- Requirement / behavior IDs involved: BEH-001, BEH-006, BEH-007; REQ-001…004, REQ-007, REQ-012, REQ-013; DEC-001…006 (UX-relevant aspects).
- Product decision, uncertainty, or experience to understand or evolve: The overall cross-node collaboration experience — pairing nodes, publishing agents, how an agent's cross-node handoff and file delivery appear to both users/agents, and how remote-started runs appear and are controlled on the receiving node — while the open decisions are still unsettled.
- Critical journey and states: SCN-001 (pair), SCN-002 (publish), SCN-003 (video handoff A→B and reply), SCN-005 (failures), SCN-007 (revoke), SCN-008 (oversee remote runs on B).
- Known constraints and non-goals: Trusted private network only (LAN/company/VPN); no public-network trust, person-level identity, incoming-task approval, offline queue, distributed teams.
- Relevant existing-product context: Existing desktop app Nodes screen (Manage Nodes, Phone Setup, Docker Guide), agent/team catalog and run views, conversation rendering of inter-agent messages (`autobyteus-web`).
- Product Design request artifact / message reference: `tickets/in-progress/cross-node-agent-communication/product-design-request.md` (sent via handoff rules 2026-10-01).
- Established separate prototype repository/root and ticket reference: Not established by Solution Designer; owned by Product Prototyper.

## Product Design Findings

N/A — not requested.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| None | — | — | — | — | — | — |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | Pre-existing: desktop remote-node access exposes the full backend to anyone who can reach the node URL; on a VPN shared with other people this exceeds "published agents only". | Undermines the per-agent boundary on shared VPNs | Separate ticket candidate (optional owner pairing for full backend); mitigation today: VPN ACLs | Recorded, out of scope |
| RSK-002 | Risk | Incoming peer messages are untrusted input to agents that may have computer use (prompt injection). | Safety | Publishing is explicit; origin is visible to receiving agent; per-run permissions only | Mitigated by scope design |
| RSK-003 | Unknown | Multi-GB transfers over VPN may be slow; tool-call timeouts in runtimes (Codex/Claude MCP) may cap blocking duration. | DEC-002 viability | Architecture investigation | Open |
| RSK-004 | Unknown | Version skew between nodes. | Clear failure needed | Versioned protocol (REQ) | Open for design |
| OPT-001 | Unknown (option) | The released `@` collaborator model offers a natural entry point for remote targets: `@` could also list published agents on paired nodes, bringing a remote collaborator into the run at an address the host agent messages. Whether remote targets are reached through `@` collaborators, an agent-initiated delegation, or both is a product/requirements decision (relates to DEC-004/005/006). | Shapes UX and addressing | User via Product brainstorming | Open |

## Architecture Investigation Findings

Not started (requirements phase).

## Requirement Implications

- Cross-node capability is new behavior (BEH-002/003/004 have no cross-node path).
- Existing local semantics must be preserved exactly.
- Trust is network-level plus pairing/publishing, consistent with existing remote-access precedent.

## Notes For Architecture Design

- Verify MCP/runtime tool-call timeout limits for long blocking transfers (RSK-003).
- Decide relationship between Electron node registry and server peer registry.
- Decide inbound protocol versioning and idempotency (message IDs).
- Decide storage location for received attachments (context-file layout reuse).
