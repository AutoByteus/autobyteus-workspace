# Requirements Document

## Document Status

- Status: `Draft` (open decisions DEC-001 … DEC-007 await the user)
- Current solution revision ID: `SR-002`
- Package identifier: `cross-node-agent-communication`
- Request / ticket: Cross-node agent collaboration over a trusted private network
- Requirements owner: Solution Designer
- Date: 2026-10-01
- Approval state and reference: Not approved
- Exact approved requirements baseline / solution revision: N/A
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: AutoByteus nodes are independent servers. An agent on one node cannot hand work, messages or files to an agent on another node. A user who generates a video on the host node and needs an agent with computer use on another node to publish it must manually copy the files, start an agent there and instruct it.
- Affected actors or systems: Node owner(s); agents on the sending node; agents/teams on the receiving node; each node's server and desktop UI.
- Desired outcome: On a trusted private network (LAN, company network or VPN/overlay network), an agent on node A can start a published agent or team on node B with a task and attached files, receive its run identity, and both agents can then exchange follow-up messages with attachments. Each agent only ever references files on its own machine; the product transfers attachments and tells both sides what happened.
- Observable definition of success: The video-publishing workflow (SCN-003) completes without any manual file copy or manual agent start on node B, and the receiving agent works on local copies of the files.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001 | Nodes are known only to the desktop app; servers are unaware of each other | Two node owners can pair their servers as peers; either side can remove the pairing | Desktop node registry and remote-node window behavior | `types/node.ts`, `remote_access.md` |
| BEH-002 | Contract | SCN-003, SCN-004 | `send_message_to` reaches runs on the same server only | An agent can also message a run on a peer node that it is permitted to reach (DEC-005) | All same-server `send_message_to` semantics and results | `agent_communication.md` |
| BEH-003 | Contract | SCN-003 | `delegate_task` spawns a configured member or `@` collaborator definition in the caller's collaboration root (Team, Org or standalone Agent root) on the same server | An agent can start a published Agent or AgentTeam on a peer node with a task and attachments, receiving the remote run identity | Local `delegate_task` semantics | `agent_team_execution.md` |
| BEH-004 | Contract | SCN-003, SCN-004 | `reference_files` are local paths passed unchanged | For cross-node delivery, attachments are copied to the receiving node; the receiver sees local paths plus a mapping to the sender's originals; the sender sees a delivery confirmation | Local `reference_files` contract | `absolute-local-reference-files.ts` |
| BEH-005 | User | SCN-003 | User copies files and starts agents on B manually | No manual steps on B beyond one-time pairing and publishing | — | User report |
| BEH-006 | User | SCN-002 | No concept of remotely invocable agents | Node owner explicitly publishes which Agent/Team definitions peers may start | — | New |
| BEH-007 | User | SCN-008 | — (no remote runs exist) | Node owner sees remote-started runs, their origin, and can watch, interact with and stop them like local runs | Existing run UI behavior | New |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Node owner (A and B may be the same person or trusted people) | Let agents collaborate across machines | Pair once, publish selectively, observe and control remote work | Only trusted private networks |
| Sending agent (node A) | Hand off work and files; continue the conversation | One tool call per handoff using its own file paths; clear success/failure | Must not need to know remote paths |
| Receiving agent (node B) | Do the work and reply | Receives a clearly attributed message with local file copies; can reply to the sender | Treats remote input as coming from outside the node |
| Node server | Enforce pairing, publishing and permissions | Rejects anything not explicitly allowed | No public-network exposure assumptions |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Pair and unpair two nodes as peers | SCN-001, SCN-007 |
| UC-002 | Publish / unpublish Agent and AgentTeam definitions for remote invocation | SCN-002, SCN-007 |
| UC-003 | Agent discovers peers and their published agents | SCN-006 |
| UC-004 | Agent starts a published agent/team on a peer node with a task and attachments | SCN-003, SCN-005 |
| UC-005 | Delegator and remote-started run exchange follow-up messages with attachments, both directions | SCN-003, SCN-004 |
| UC-006 | Receiving node owner sees and controls remote-started runs | SCN-008 |

### Out Of Scope

- Nodes reachable over the public internet without a trusted private network; any public-network trust, internet-facing authentication or NAT traversal.
- Person-level identity (SSO), per-person/group access policies, incoming-task approval prompts, quotas/billing, audit dashboards (future multi-owner phase).
- Agent teams whose configured members are placed on different nodes.
- Messaging arbitrary runs on a peer node that the sender did not start (or that did not start it); global run discovery.
- Offline queuing / store-and-forward when a peer is unreachable.
- A central shared storage service; standalone "send files to a node without an agent" tool (subject to DEC-003).
- Interoperability with non-AutoByteus agent protocols (e.g., A2A).
- Changing the existing desktop remote-node full-backend access model (see RSK-001; separate ticket candidate).
- Folder attachments (files only).

### Non-Goals

- Making cross-node delivery transparent to the agent: the agent knowingly targets another node.
- Guaranteed delivery beyond today's at-most-once admission semantics.
- Viewing node B's run live stream from node A's window (the user can open node B's window).

### Preserved Behavior Boundary

- All same-server `send_message_to`, `delegate_task`, `get_handoff_rules` and `reference_files` behavior (BEH-002/003/004 preserved columns) is unchanged, including result shapes and error codes.
- Desktop node registry, remote-node windows and Phone Access pairing are unchanged.
- Existing run history, team history and context files are unchanged.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Two node owners can pair their nodes as peers through an explicit pairing step performed on both sides (mechanism per DEC-001). A pairing binds the peer's stable server identity; a node whose identity no longer matches is rejected. | BEH-001 | Must | Foundation for all cross-node traffic | User 2026-10-01; DEC-001 |
| REQ-002 | A node owner can list paired peers, give them a readable name, and remove a pairing. After removal, all new cross-node requests in either direction between those nodes are rejected; existing run history remains. | BEH-001 | Must | Control and revocation | — |
| REQ-003 | A node owner can publish and unpublish individual Agent and AgentTeam definitions for remote invocation. Nothing is published by default. | BEH-006 | Must | Explicit consent; foundation for multi-owner | User 2026-10-01 |
| REQ-004 | An agent enabled for cross-node collaboration can discover the paired peers and each peer's currently published agents/teams (name and description) (DEC-004). | BEH-003 | Must | Agents need to know valid targets | DEC-004 |
| REQ-005 | An enabled agent can start a published Agent or AgentTeam on a peer node with a task description and attached files from its own machine. On success it receives the remote node identity and the remote run identity; on failure nothing is started and it receives a specific reason. | BEH-003, BEH-005 | Must | Core handoff | SCN-003 |
| REQ-006 | Attachments are referenced by the sender as absolute paths on its own machine. The product copies them to the receiving node, verifies integrity, and stores them owned by the receiving run. The receiver is given only paths that exist on its own machine. | BEH-004 | Must | Agent context consistency | User principle 2026-09-30 |
| REQ-007 | The sending agent's result confirms the target node and run and lists each delivered file (name, size). The receiving agent's message states the sending agent's name, run identity and node, and lists each received file with its local path and the sender's original path. | BEH-004 | Must | Explicit awareness on both sides | User 2026-09-30 |
| REQ-008 | A message or task is admitted to the receiver only after all its attachments have been fully received and verified. If any attachment fails, the delivery is rejected as a whole and no partial files remain on the receiver. | BEH-004 | Must | No half-delivered handoffs | — |
| REQ-009 | The delegating run and the run it started on a peer can send each other follow-up messages, with attachments, in both directions. No other cross-node message targets are permitted (DEC-005). | BEH-002 | Must | Conversation continuity with minimal exposure | DEC-005 |
| REQ-010 | A follow-up to a remote-started run that is no longer active, but whose history still exists, restores it and delivers the message — matching today's same-node wake behavior for delegated children. A follow-up to a delegating run follows the receiving node's existing local rules for that run. | BEH-002, BEH-006 | Should | Parity with local delegation | `agent_team_execution.md` |
| REQ-011 | Cross-node failures return specific, distinguishable reasons to the calling agent, at least: peer unknown/not paired, peer unreachable, peer identity mismatch, target not published, target run not permitted / not found, attachment missing/unreadable, attachment over limit, transfer failed/integrity failure, incompatible peer version, receiver rejected input. | BEH-002, BEH-003 | Must | Agents and users must understand failures | — |
| REQ-012 | Remote-started runs appear in the receiving node's normal run views, marked with their origin (peer node and delegating agent). The owner can watch, message, and stop them like local runs. Deleting such a run's history also deletes its received attachments. | BEH-007 | Must | Owner control and visibility | — |
| REQ-013 | Cross-node messages are visible in both agents' conversations with their origin/destination node. | BEH-002, BEH-007 | Should | Observability | — |
| REQ-014 | Cross-node capability is available to every supported agent runtime (AutoByteus, Codex, Claude, external runtimes) with identical semantics, and only for agents explicitly enabled for it (DEC-006). | BEH-002, BEH-003 | Must | Consistent runtime contract; minimal exposure | `agent_communication.md` §Runtime Projection |
| REQ-015 | Cross-node requests use a versioned inter-node contract; a peer running an incompatible version is rejected with a clear reason rather than misbehaving. | BEH-001 | Must | Nodes upgrade independently | RSK-004 |
| REQ-016 | Large-attachment behavior follows DEC-002 and a configurable total attachment size limit per delivery. | BEH-004 | Must | Videos may be large | DEC-002 |

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001 / SCN-001 | Two nodes reachable on a private network | After pairing on both sides, each lists the other as a peer with its readable name | Pairing with a wrong/expired code or mismatched identity fails with a reason; no peer is recorded | API/E2E with two server instances |
| AC-002 | REQ-002 | SCN-007 | Paired nodes; existing remote-started run | After unpairing, new delegations/messages in either direction fail with "not paired"; existing run history remains viewable | — | API/E2E |
| AC-003 | REQ-003, REQ-004 | SCN-002, SCN-006 | B publishes "Publisher" | An enabled agent on A discovers B and "Publisher"; unpublished definitions are not listed | After unpublishing, "Publisher" is no longer listed and starting it fails with "not published" | API/E2E |
| AC-004 | REQ-005, REQ-006, REQ-007, REQ-008 | SCN-003 | A's agent has `/Users/me/videos/final.mp4`; B publishes "Publisher" | A's agent starts Publisher on B with the file; result names node B, remote run ID and `final.mp4` with size; on B a new run starts whose first message names the sender agent, run and node A and lists a local path on B for `final.mp4` plus the original path; the local file is byte-identical | — | API/E2E with real file transfer; hash compare |
| AC-005 | REQ-008, REQ-011 | SCN-005 | Attachment path missing, or transfer interrupted, or integrity mismatch | Nothing starts on B; A's agent receives the specific reason; no partial files remain on B | — | API/E2E with fault injection |
| AC-006 | REQ-009, REQ-007 | SCN-003 | Remote-started run on B exists | B's run replies to A's delegating run with an attachment; A's agent receives it attributed to node B with a local path on A | — | API/E2E |
| AC-007 | REQ-009 | SCN-009 | A's agent targets a run on B it did not start | Delivery is rejected with "not permitted"; B's run receives nothing | — | API/E2E |
| AC-008 | REQ-010 | SCN-004 | Remote-started run on B is not active but has history | A follow-up from the delegating run restores it and it receives the message | History deleted → "not found" | API/E2E |
| AC-009 | REQ-011 | SCN-005 | Peer offline / incompatible version / not published | Each yields its specific distinguishable reason; nothing started | — | API/E2E |
| AC-010 | REQ-012, REQ-013 | SCN-008 | Remote-started run on B | B's UI lists the run marked with origin node A and delegating agent; owner can open, message and stop it; deleting its history removes received attachments | — | Frontend/E2E |
| AC-011 | REQ-014 | SCN-003 | Delegating agent on each supported runtime | Same tool semantics and results on each runtime; a non-enabled agent has no cross-node capability | — | Runtime matrix E2E |
| AC-012 | REQ-016 | SCN-005 | Attachments above configured limit | Rejected before transfer with "over limit"; within limit per DEC-002 behavior | — | API/E2E |
| AC-013 | Preserved boundary | BEH-002/003/004 | Existing same-node tests | All existing same-node communication/delegation tests pass unchanged | — | Regression suite |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Goal / Event | Trigger / Entry | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | Node owner(s) | Pair nodes | Node settings | Both nodes reachable on LAN/VPN | Start pairing on one node, complete on the other | Both list each other | Wrong code / identity mismatch fails | Supported Normal | User 2026-10-01 | REQ-001/002, AC-001 |
| SCN-002 | User | Owner of B | Offer an agent | Agent/Team settings | Definition exists on B | Mark "Publisher" published | Peers can discover/start it | Unpublish removes | Supported Normal | User | REQ-003, AC-003 |
| SCN-003 | User / System | Video agent on A (user-driven) | Publish a generated video using B's computer use | Agent decides to hand off | Paired; Publisher published; video on A | A's agent starts Publisher on B with task + video → B stores local copy, starts run with attributed message → Publisher publishes → replies to A's agent (optionally with screenshot) | Video published without manual steps | Failures per SCN-005 | Supported Normal | Original request | REQ-005–009, AC-004/006 |
| SCN-004 | System | A's agent | Follow up later | `send_message_to` to remote run | Remote run idle/stopped with history | Message delivered after restore | Conversation continues | History deleted → not found | Supported Normal | Parity with local delegation | REQ-010, AC-008 |
| SCN-005 | System | A's agent | Handoff fails | Any cross-node call | Peer offline, not paired, not published, bad file, over limit, version mismatch | Call fails before admission | Specific reason, nothing started, no partial files | — | Supported Normal | — | REQ-008/011/016, AC-005/009/012 |
| SCN-006 | System | A's agent | Find targets | Discovery capability | Paired peers | Agent lists peers and published agents | Sees names/descriptions | Peer offline shown as unavailable | Supported Normal | DEC-004 | REQ-004, AC-003 |
| SCN-007 | Operational | Node owner | Revoke | Settings | Paired | Unpair or unpublish | New requests rejected | — | Supported Normal | — | REQ-002/003, AC-002/003 |
| SCN-008 | User | Owner of B | Oversee remote work | Run views on B | Remote-started run exists | Open, watch, message, stop, delete | Same controls as local runs, with origin shown | — | Supported Normal | — | REQ-012/013, AC-010 |
| SCN-009 | System | A's agent | Message an unrelated run on B | `send_message_to` with node + arbitrary run ID | Run exists on B, not started by A's run | — | Rejected "not permitted" | — | Technically Possible but Unsupported | DEC-005 | REQ-009, AC-007 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (behavior-level only)
- Linked UI/UX supplement / prototype / Product ticket / revision / confirmation / visual baseline: `N/A — not applicable` (Product Design not requested)
- Required outcomes: peer pairing/unpairing and listing (REQ-001/002); per-definition publish toggle (REQ-003); origin marking of remote-started runs and cross-node messages (REQ-012/013). Exact placement and visuals are left to design within existing settings and run-view patterns.
- Explicitly unresolved product decisions: none beyond DEC table.

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-006, AC-004 | Reliability | Received files are byte-identical to the originals (integrity verified) | All transfers | Hash comparison |
| QR-002 | REQ-016, AC-012 | Performance | Files at least as large as the configured limit transfer by streaming without loading whole files into memory | Multi-GB videos | Large-file E2E with memory observation |
| QR-003 | REQ-001/003/009 | Security | Inbound cross-node requests are accepted only from paired peers, only for published targets or permitted follow-ups; pairing credentials are stored as secrets and redacted from logs | Trusted private network | Negative API tests; log inspection |
| QR-004 | REQ-005/009 | Reliability | A retried request never delivers the same message or starts the same task twice | Network retries | Idempotency test |
| QR-005 | REQ-015 | Compatibility | Version mismatch fails clearly | Mixed versions | API test |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` (new data only)
- Data or state that must be preserved: All existing run/team/org history, context files, node registry and remote-access data unchanged.
- New data: peer pairings, published-agent settings, run origin metadata, follow-up permissions, received attachments.
- Acceptable loss: None for existing data.
- Retention: Received attachments live and die with the receiving run's history.
- Unknowns: storage locations (architecture).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| User-operated private network (LAN, company network, Tailscale/WireGuard/NetBird VPN) | Provides reachability between nodes | `remote_access.md` | Replies need reachability in both directions |
| Runtime tool-call surfaces (Codex/Claude MCP, AutoByteus local tool) | Must expose the capability uniformly | `agent_communication.md` | Tool-call timeouts vs large transfers (RSK-003) |

## Supplemental Artifacts

None.

## Assumptions

| ID | Assumption | Why Necessary | Validation / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Both nodes run a version containing this feature | Protocol availability | REQ-015 handles mismatch | Open |
| ASM-002 | Nodes can reach each other in both directions on the private network (typical for LAN/tailnets) | Replies from B to A | User to confirm; one-way reach makes replies fail clearly (REQ-011) | Open |
| ASM-003 | Published definitions on B use B's own configuration (models, tools, credentials, workspace) | Remote agents run with the receiving owner's setup | User to confirm | Open |

## Open Decisions And Questions

| ID | Question | Why It Matters | Options / Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | How do servers pair? | Who can drive agents on a node | **Recommended:** one-time pairing code created on one node and entered on the other (like Phone Access), yielding a per-peer credential; identity pinned. Alternative: trusted-network-only registration by URL with identity pinning, no secret. | User | Open |
| DEC-002 | Does a large transfer block the sender's tool call? | Agent experience; runtime timeouts | **Recommended:** the call waits until files are transferred and the task/message is admitted (simple, consistent with today's "accepted" meaning), with a configurable size limit (proposed default 10 GB total per delivery). Alternative: return immediately and notify the agent later. | User | Open |
| DEC-003 | Include a standalone "send files to a node" tool (no agent recipient)? | Scope | **Recommended:** no, separate ticket built on the same transfer mechanism. | User | Open |
| DEC-004 | How do agents discover remote targets? | Usability | **Recommended:** a read-only capability listing paired peers and their published agents (name, description, availability). Alternative: user tells agents in instructions. | User | Open |
| DEC-005 | Which cross-node message targets are allowed? | Exposure | **Recommended:** only between a delegating run and the run(s) it started on a peer, both directions. | User | Open |
| DEC-006 | Which agents may use cross-node capability? | Exposure. Since base `b0b077b02`, every user-facing run (standalone included) always has `send_message_to`/`delegate_task`, so cross-node reach needs its own gate rather than tool presence | **Recommended:** any user-facing agent explicitly enabled for cross-node use; not enabled by default. Alternative: available wherever the always-on collaboration tools are, gated only by pairing and publishing. | User | Open |
| DEC-007 | How does a remote target enter a run? | UX and addressing; the released `@` collaborator model (BEH-008) is a natural entry point (OPT-001) | Options: (a) the user `@`-mentions a published agent on a paired node, which becomes a remote collaborator at an address; (b) the agent discovers and delegates itself; (c) both. To settle in Product brainstorming. | User | Open |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-002 | UC-001 | BEH-001 | AC-001, AC-002 | SCN-001, SCN-007 |
| REQ-003 | UC-002 | BEH-006 | AC-003 | SCN-002, SCN-007 |
| REQ-004 | UC-003 | BEH-003 | AC-003 | SCN-006 |
| REQ-005 | UC-004 | BEH-003, BEH-005 | AC-004 | SCN-003 |
| REQ-006 | UC-004, UC-005 | BEH-004 | AC-004 | SCN-003 |
| REQ-007 | UC-004, UC-005 | BEH-004 | AC-004, AC-006 | SCN-003 |
| REQ-008 | UC-004, UC-005 | BEH-004 | AC-004, AC-005 | SCN-003, SCN-005 |
| REQ-009 | UC-005 | BEH-002 | AC-006, AC-007 | SCN-003, SCN-009 |
| REQ-010 | UC-005 | BEH-002, BEH-006 | AC-008 | SCN-004 |
| REQ-011 | UC-004, UC-005 | BEH-002, BEH-003 | AC-005, AC-009 | SCN-005 |
| REQ-012 | UC-006 | BEH-007 | AC-010 | SCN-008 |
| REQ-013 | UC-005, UC-006 | BEH-002, BEH-007 | AC-010 | SCN-008 |
| REQ-014 | UC-004, UC-005 | BEH-002, BEH-003 | AC-011 | SCN-003 |
| REQ-015 | UC-001 | BEH-001 | AC-009 | SCN-005 |
| REQ-016 | UC-004 | BEH-004 | AC-012 | SCN-005 |

## Architecture Phase Input

- Approved scenario IDs to map: SCN-001 … SCN-008 (SCN-009 as rejection path).
- Constraints to preserve: same-node semantics (AC-013); single admission owner `AgentRun.postUserMessage`; uniform runtime exposure; at-most-once acceptance semantics.
- Deferred to design: tool surface shape (extend `send_message_to`/`delegate_task` with node targeting vs. new tools), inter-node protocol and endpoints, push vs. pull transfer, storage location, relationship of Electron node registry to server peer registry, grant persistence.
- Technical facts to verify: runtime tool-call timeout limits (RSK-003); restore path for remote-started standalone vs. team runs.
- Known risks: RSK-001 (pre-existing full-backend exposure on shared VPNs), RSK-002 (prompt injection), RSK-003, RSK-004.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Prototype and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `No`
- Remaining content blocker: User decisions DEC-001 … DEC-007 and confirmation of ASM-002/ASM-003.

### Approved Basis Ready For Design

- User approval received: `No`
- Exact requirements and supplement approval basis recorded: `No`
- Approved requirements package ready for architecture design: `No`
- Remaining blocker: Approval pending.
