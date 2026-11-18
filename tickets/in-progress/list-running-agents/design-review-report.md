# Design Review Report — list-running-agents (autobyteus-492)

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/list-running-agents/requirements-doc.md` (Approved, SR-005)
- Upstream Investigation Notes: `tickets/in-progress/list-running-agents/investigation-notes.md` (meta still says SR-003; see AR-003)
- Upstream Solution Revision Record: `tickets/in-progress/list-running-agents/solution-revision-record.md` (SR-001 … SR-005)
- Reviewed Design Spec: `tickets/in-progress/list-running-agents/design-spec.md` (Ready, SR-005)
- Supplemental Task Artifacts Reviewed: None (no supplements); `handoff-architecture-review.md`, `follow-ups.md` (empty)
- Relevant Solution Revision IDs: SR-001 … SR-005
- Architecture Review Revision Record: `tickets/in-progress/list-running-agents/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Solution Designer handoff "Architecture Design Complete", `Large`/`High` (SR-003 at `95e9e8f5f3`), replaced during the review by SR-005 at `322fe8ed32` (the Solution Designer's message, 2026-11-18). This result is for SR-005.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/list-running-agents`, branch `codex/list-running-agents` at `322fe8ed32` (base `origin/personal` `bd2053ee51`; only ticket documents changed since the base). I opened the cited lines in `global-agent-run-message-router.ts`, `cross-run-message-delivery.ts`, `remote-message-send.ts`, `remote-endpoint.ts`, `remote-message-receiver.ts`, `root-communication-engine.ts:150-230`, `standalone-agent-run-root.ts:131,153-156,294-301`, `root-team-run.ts:128,424-431`, `agent-org-run.ts:107`, `active-collaboration-root-directory.ts:101-137`, `delegation-index.ts:371-422`, `closed-task-fence.ts`, `paired-agent-access.ts`, `standalone-paired-agent-access.ts:95-100`, `collaboration-composition.ts:190-265`, and the sources of `run-status-service.ts`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: about 20 production files over five subsystems; a changed message contract for every agent (CM-5, CM-11); two new requests between nodes behind the peer gate; changed reach between Tasks and between nodes. SR-004/005 make the change smaller (no team-run-ID routing, no Org entries) but none of these surfaces goes away.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`, with one ambiguity (AR-005) and stale texts (AR-003).
- Approved requirements / intended behavior understood: "the run ID is the address": any agent messages any running agent by run ID, here or with `node` on a paired node (DEC-001/002/007). A team is messaged through its coordinator's run ID as today; the `TARGET_IS_TEAM_RUN` refusal stays, also from a peer (DEC-012, SR-004). `list_running_agents` lists only the live Agent and Team runs a person started; Team entries carry `coordinator_agent_run_id`; Org runs are not listed, and their agents stay reachable by run ID (DEC-004, SR-005). Wake, reopen and the closed-Task rule stay (DEC-003, DEC-011). `delegate_task` is unchanged.
- Relevant existing behavior and evidence confirmed: PRB-002's refusal comes from `CrossRunMessageDelivery.admit` (`cross-run-message-delivery.ts:163`) or R-9 (`global-agent-run-message-router.ts:130`). The team guidance is `:92-102`. Across nodes: the outbound pair refusal (`remote-message-send.ts:35`) and the inbound `not_linked` refusal (`remote-message-receiver.ts:73`).
- Scope guardrail confirmed: In-scope UC-001…004. Out of scope: delegation to running roots, waking unrelated stopped runs, attachments across nodes, retries, UI. The Preserved Behavior Boundary (BEH-006 included) now matches the requirements.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes`. AR-001 → REQ-011, AC-008, DEC-011. AR-004 → the removal plan under Principle 7 (no behavior change). AR-006 → BEH-006, REQ-011.
- Remaining material ambiguity: AR-005 (which senders REQ-011's "fenced remote run" refusal covers).
- Statements about existing code the design relies on, opened at their cited lines: the citations in § Current-State Read and the removal plan match the code. Three statements are incomplete:
  1. "Task check via `assertDeliveryAllowed` … `ownershipChain`": `ownershipChain` has no reader. A search finds only its declarations and a comment at `root-communication-engine.ts:152`. The check reads the root's own links (`remoteLinks.endpointFor`, `standalone-agent-run-root.ts:294-301`), not the endpoint passed in. See AR-004; this is also the cause of AR-001.
  2. `RunningAgents.teamCoordinatorOf` is described as giving "the coordinator of a running team" ("when the team runs there"). Its source `findTeamCoordinator` also answers for a peer team run that a root of this node delegated to (`active-collaboration-root-directory.ts:106-117`). See AR-006.
  3. "No existing owner combines both facts" (§ Reuse): `RunStatusService` already combines `registrations: activeRoots` with `agents(kind)` (`collaboration-composition.ts:249`), but for pushed view subscriptions, not for a synchronous question. A new owner is acceptable (see Residual Risks).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | Contract | Pass | Pass | Fail | Needs Correction | AR-001 (closed-Task rule bypassed on the `node` path) |
| BEH-005 | Contract | Pass | Pass | Fail | Needs Correction | AR-001, AR-005 |
| BEH-006 | Contract | Pass | Pass | Fail | Needs Correction | AR-006 (the peer's coordinator source) |
| BEH-007 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-008 | Contract | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | § Task Design Health Assessment | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Boundary Or Ownership Issue`; PRB-002, `:163`, `:130`, `:35`, `:73` | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | "Yes — replaced, not wrapped" | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Spines, removal plan, sequence | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | List here (Agent, Team) | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | List on a peer | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Message, local, unrelated | Pass | Pass | N/A | Pass | Pass | Pass | Pass (a team run ID leaves the CrossRun route as `null` and reaches the router's unchanged team step) |
| DS-004 | Message with `node` | Pass | Pass | Pass | Pass | Fail | Pass | Fail (AR-001: no closed-Task admission on the sender's node) |
| DS-005 | Answer | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | Linked run, unpaired sender | Pass | Pass | N/A | Pass | Pass | Pass | Pass (the closed check holds through the same root's links, `standalone-agent-run-root.ts:131,294-301`) |
| Bounded: `CrossRunMessageDelivery.route` | Local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RunningAgents` | Pass | Pass | Pass | Pass | Callers never combine directory and statuses themselves |
| Root `deliverToPeerRun` / `acceptPeerRunMessage` | Pass | Pass | Pass | Pass | The router and the receiver never touch an engine |
| `CrossRunMessageDelivery` (Task admission) | Pass | Pass | Fail | Fail | AR-001: the `node` path goes around the Task admission for a peer run this node's tree knows |
| `RemoteRunChannel` / `PeerClient` | Pass | Pass | Pass | Pass | HTTP stays in `remote-collaboration` |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Router → collaboration (CrossRun, `RunningAgents`, channel port, root boundaries) | Pass | Pass | Pass | Pass | Never → `remote-collaboration` |
| `remote-collaboration` → collaboration ports, `RunningAgents`, `RunningAgentsListing` | Pass | Pass | Pass | Pass | As today |
| `RunningAgentsListing` → `RunningAgents`, `RunOwnAgentsReader`, catalog, Projects | Pass | Pass | Pass | Pass | No tool import |

Composition root / Principle 16: `Pass`. New collaborators are passed in from `collaboration-composition.ts`. The router's existing default lookups (`:178-184`) are only used, not extended. A missing `resolveRemoteRunChannel` fails with the existing "turned off" refusal.

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `list_running_agents({node?, address?, state?})` | Pass | Pass | Pass | Low | Pass |
| Entry union by `kind` (Agent, Team with `coordinator_agent_run_id`) | Pass | Pass | Pass | Low | Pass |
| `send_message_to({…, node?})` | Pass | Pass | Pass | Low | Pass (agent run IDs only, as today) |
| `RunningAgents.rootOf` / `statusesOf` | Pass | Pass | Pass | Low | Pass |
| `RunningAgents.teamCoordinatorOf` | Fail | Pass | Pass | Low | Fail (AR-006: "running team here" vs. its source's "any team a root knows") |
| `POST /rest/remote/run-messages` vs `/messages` | Pass | Pass | Pass | Low | Pass (split by subject) |
| `POST /rest/remote/running-agents` | Pass | Pass | Pass | Low | Pass |
| `unlinkedRunEndpoint` | Pass | Pass | Pass | Low | Fail (AR-004: carries a dead `ownershipChain`) |

Empty indirection check: `Pass`. `RunningAgents` combines two owners for three consumers; no new port is added.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Live statuses | Pass | Pass | N/A | Pass | `PairedAgentAccess` per kind, `AgentOrgAgentStatuses` (Org agents stay reachable) |
| "Is it running, in which root" | Pass | Pass | Pass | Pass | `RunStatusService` pushes view subscriptions; a synchronous read-only owner meets a different need |
| Peer lookup, peer listing, remote send/accept | Pass | Pass | N/A | Pass | `findPeer`, `PeerDiscoveryChannel`, `RemoteMessageSend`, engine |
| Team guidance on a peer | Pass | Pass | N/A | Pass | Reuses the local refusal's code and text |
| Closed-Task decision for a peer run | Fail | Fail | N/A | Fail | AR-001: the tree and `admit`/`ClosedTaskFence` already own it, but the `node` path does not ask them |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/running/` | Pass | Pass | Pass | Pass | Three small files, one concern |
| `agent-collaboration/communication/` | Pass | Pass | Fail | Fail | AR-001 |
| `agent-collaboration/execution/remote/` | Pass | Pass | Pass | Pass | — |
| `agent-communication/` | Pass | Pass | Pass | Pass | Team step unchanged |
| Root kinds | Pass | Pass | Pass | Pass | — |
| `remote-collaboration/` | Pass | Pass | Pass | Pass | — |
| `agent-tools/agent-discovery/` + MCP | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RunningAgentEntry` | Pass | Pass | Pass | Pass | Built on B, read on A, returned by the tool |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RunningAgentEntry` | Pass | Pass | Pass | Pass | Pass | Union by `kind`; `coordinator_agent_run_id` on Team entries only |
| `RemoteEndpoint` (+ `unlinked_run`) | Pass | Fail | Pass | Pass | Fail | AR-004 |
| `RemoteMessageTransmission` (+ `run_message`) | Pass | Pass | Pass | Pass | Pass | — |

Derived consumers of a changed structure: `Pass` (§ Change Scope table).

Vocabulary (Principle 15): `Pass`. "Running agent", "started by a person", `unlinked_run`, `run_message` and `coordinator_agent_run_id` are defined; `coordinator_agent_run_id` matches `delegate_task`'s `target_team_coordinator_agent_run_id`. The stale texts are tracked in AR-003.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `running/running-agents.ts`, `running-agents-listing.ts`, `running-agent-entry.ts` | Pass | Pass | N/A | Pass | — |
| `cross-run-message-delivery.ts` | Pass | Pass | N/A | Pass | Natural home for AR-001's fix |
| `global-agent-run-message-router.ts` | Pass | Pass | N/A | Pass | — |
| `remote-endpoint.ts`, `remote-message-send.ts`, `remote-run-channel.ts` | Pass | Pass | N/A | Pass | — |
| Root deliveries, gateway, client, receiver, discovery, reader, tool, MCP, composition | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/agent-collaboration/running/` | Pass | Pass | Low | Pass | — |
| All other edits extend existing files | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| CONFLICT throw `:163`, `OTHER_TASK_REFUSAL` | Pass | Pass | Pass | Pass | — |
| R-9 `router:129-130` | Pass | Pass | Pass | Pass | — |
| Outbound pair refusal `remote-message-send.ts:35`, `allowsSender`, `refusals`, `REMOTE_ROOT_REFUSAL_TEXT.notPermitted` | Pass | Pass | Pass | Pass | `allowsTarget` keeps a reader (`remote-run-links.ts:125`) |
| `TASK_AGENT_RESOURCE_CONFLICT` in the engine's `DELIVERY_REFUSAL_CODES` | Pass | N/A | Pass | Pass | The code stays in `projects/` and `TASK_EXECUTION_RESOURCE_REJECTION_CODES` for delegation; only the engine's message set loses it |
| `RemoteEndpointCore.ownershipChain` (already dead, in a touched file) | Fail | N/A | Fail | Fail | AR-004 |
| Inbound `not_linked` refusal | Pass | Pass | Pass | Pass | Kept for linked requests. Clarity only: the Legacy Removal Policy line "for a message that can go the unlinked way" means "its test is rewritten", because the removal table keeps the branch |
| Old-rule tests and fixtures | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Message rule | No | Pass | Pass | The rejection log covers CONFLICT and the one-route option |
| Mixed releases | No | Pass | Pass | DESIGN.md rule 9: an older peer answers 404, read as unreachable |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Message logs, run files | `Not Affected` | Pass | Pass | N/A | Pass | Existing `CollaborationCommunicationMessage` shape; the list is read-only |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Six-step sequence | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Entry forms (12 rows) | Yes | Fail | N/A | Fail | Missing row: "a sender outside the delegator's root → a remote run this node's tree holds closed, with `node`" (AR-001), and the senders of AR-005 |
| Unlinked endpoint (data, not callback) | Yes | Pass | Pass | Pass | — |
| List result | Yes | Pass | N/A | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-001` — A sender outside the delegator's root messages, with `node`, a peer run whose Task on this node is closed

- Related approved requirement or established contract: REQ-011 ("`TASK_AGENT_RESOURCE_CLOSED`, also for a fenced remote run"), DEC-011, the alternate outcome of AC-008.
- Relevant behavior ID(s): BEH-004, BEH-005.
- Initiating basis kind: `User` (agent tool use under the approved rule).
- Independent product-supported initiating trigger, in order:
  1. PM P on node A delegates a Task with `delegate_task(node: "B")` (supported). Run T starts on B.
  2. T messages agent X on A, in a different root, with `send_message_to(node: "A", …)` (newly supported, REQ-009). X's received header names T's run ID and node B (REQ-009, DS-005).
  3. The Task is closed on A (supported). T keeps running on B, fenced only through A's links ("fenced by the closed Task, not stopped", `task-execution-resource-port.ts:182`).
  4. X replies with `send_message_to(node: "B", target_agent_run_id: T)`.
- Support evidence: the `send_message_to` and `delegate_task` tools; Task closure in Projects. Answering a received message is the normal use of its header.
- Forward path (approved target):
  1. The router's `node` path calls `findPeer`, then X's root `deliverToPeerRun`, then `RemoteMessageSend.sendToPeerRun`.
  2. X's root holds no link to T, so `unlinkedRunEndpoint` is used.
  3. `engine.prepareRemoteSend` calls `assertDeliveryAllowed(X, T)`, which calls X's root `assertPeerEntryOpen(T)`. In X's root `remoteLinks.endpointFor(T)` is `null`, so nothing is checked (`standalone-agent-run-root.ts:294-296`; Team `root-team-run.ts:424-426`).
  4. `PeerClient` sends to B's `run-messages`. `RunningAgents.rootOf(T)` finds T running, and `acceptPeerRunMessage` hands it to the engine, which accepts. B has no Task for T (N-11), so nothing refuses.
  - Without `node`, X first gets `TARGET_AGENT_RUN_NOT_ACTIVE`, whose new text tells it to pass `node` (`CrossRunMessageDelivery.route:94` returns `null` for a peer run before `admit`).
- Lifecycle preconditions and material consequence: the closed Task's run takes new input and spends tokens. DEC-011 says it stays closed, and A's tree (`tasksOf` with `nodeId`) knows it is closed.
- Reachability: `Reachable`.
- Review consequence: AR-001.

### `MP-002` — A team run ID that a root of the receiving node only delegated to, sent with `node`

- Related approved requirement: BEH-006 ("the same refusal … when the team runs there"), REQ-011.
- Initiating basis kind: `User`.
- Trigger: an agent on B tells X on A about a team it delegated to node C and gives the team's run ID, as `delegate_task` returns it. X sends `send_message_to(node: "B", target_agent_run_id: <that team run ID>)`.
- Forward path: B's `acceptRunMessage` finds no running agent with that ID (`rootOf` returns `null`). `RunningAgents.teamCoordinatorOf` then calls `findTeamCoordinator`, which answers from the delegating root's link (`active-collaboration-root-directory.ts:106-117`). B refuses with `TARGET_IS_TEAM_RUN` and a coordinator that runs on C, not on B.
- Consequence: the guidance points to a run that `send_message_to(node: "B", …)` cannot reach. The sender then gets "not running on B" and is not told that the run is on C.
- Reachability: `Reachable`, but rare (the run ID must be passed on by hand).
- Review consequence: AR-006 (Low).

### `MP-003` — An agent stops between the running check and the reservation (design § Risks)

- Initiating basis: none independent (timing only). The design classifies it as not supported (P6), and no machinery depends on it beyond the existing gate re-check. Not a supported scenario; no finding.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Which senders REQ-011's "fenced remote run" covers | Only the node that owns the Task knows it is closed; B (N-11) and a third node do not | AR-005 | Open |

## Review Decision

`Fail`.

## Findings

### AR-001 — The `node` path skips the closed-Task rule for a peer run whose Task this node closed

- Type: `Design Impact`; severity: High.
- Protects: REQ-011, AC-008 (alternate outcome), DEC-011; the preserved boundary "the closed-Task refusal (CM-5/CM-6)".
- Scope status: `Within Approved Scope`. Changes approved behavior: No (it keeps the approved behavior).
- Affected: BEH-004/005; DS-004; the entry-form table.
- Problem:
  - On the sender's node, the closed-Task check for a remote run lives only in the root that holds the link. `assertPeerEntryOpen` reads `this.remoteLinks.endpointFor` (`standalone-agent-run-root.ts:294-301`, `root-team-run.ts:424-431`, Org `agent-org-run.ts:107`).
  - Any sender in another root that passes `node` goes unlinked, and nothing on either node refuses. The closed Task's run receives new work.
  - The new `TARGET_AGENT_RUN_NOT_ACTIVE` hint ("also pass node") steers agents onto this path.
- Evidence: MP-001; `cross-run-message-delivery.ts:92-94` (peer runs leave the route before `admit`); `remote-message-send.ts` has no Task step of its own.
- Required update: give the `node` path the same Task admission the local path has, from the owner that already holds it. The router drives the order:
  1. For `node` plus a run ID, the router asks `CrossRunMessageDelivery` (or the tree through `ClosedTaskFence`) whether this node's tree holds that peer run (`runOfAgent`, plus `tasksOf` entries with this `nodeId`).
  2. If all its entries are closed, it returns `TASK_AGENT_RESOURCE_CLOSED`. The assigner's reopen keeps the link path it has today.
  3. Otherwise it hands the message to the sender's root.
  - Add the row to the entry-form table, and list the test (the remote part of AC-008) in the sequence.
- Why proportionate: one admission call, in the place of the existing owner; no new store or protocol.
- Recipient: Solution Designer.

### AR-003 — Stale texts after SR-002 … SR-005

- Type: `Requirement Gap` (cross-artifact inconsistency); severity: Low.
- Protects: the basis references the downstream roles cite.
- Scope status: `Within Approved Scope` (corrections only). Changes approved behavior: No.
- Problem and evidence:
  - `requirements-doc.md:13`: "Exact approved requirements baseline … SR-004 (this document)", while the current revision is SR-005.
  - `requirements-doc.md:220`: Readiness "(SR-002; no supplements)".
  - `requirements-doc.md` REQ-002: "Each entry has: … `coordinator_agent_run_id` …". It should say "a Team entry also has", as the design's union does (`design-spec.md:239, 311`).
  - `design-spec.md:257` Interface Boundary Check: "Team run ID still refused with coordinator (local)". The refusal now also comes from a peer (BEH-006).
  - `investigation-notes.md`: meta and the last line still say SR-003. RSK-001 ("Limited to user-started roots' entry agents") is the SR-001 reading, which SR-002 superseded.
- Required update: correct these texts to SR-005.
- Recipient: Solution Designer.

### AR-004 — `ownershipChain` is dead in a touched file, and the design adds to it

- Type: `Design Impact`; severity: Low.
- Protects: Principle 7 (no dead code in touched files). No behavior changes.
- Problem: `RemoteEndpointCore.ownershipChain` has no reader. A search of `src/` finds only the declaration and the builders in `remote-endpoint.ts`, and a comment at `root-communication-engine.ts:152`. The design gives the new `unlinked_run` endpoint `ownershipChain: []` and describes it as the Task check. That hides where the check really is (the root's own links), which is what AR-001 is about.
- Required update:
  - Add `ownershipChain` (the type member and the three builders) to the removal plan, with that evidence.
  - Drop it from `unlinkedRunEndpoint`.
  - Correct the engine comment at `:152`.
- Recipient: Solution Designer.

### AR-005 — Which senders does REQ-011's "fenced remote run" refusal cover?

- Type: `Requirement Gap`; severity: Medium.
- Protects: REQ-011, DEC-011.
- Scope status: `Requirement Gap — User Approval Required` only if the Solution Designer finds the question outside the direction in which it already decided DEC-011. Otherwise it can settle the question within that direction and record it.
- Problem:
  - Run T on B was delegated by A, and its Task closes on A. A knows (AR-001); B has no Task for T (N-11); a third node C knows nothing.
  - Under the new rule, B's own agents and C's agents can message T while it runs.
  - REQ-011 says the closed-Task refusal holds "also for a fenced remote run" without saying for which senders, and no AC covers them.
  - Today those senders could not reach T at all (CM-11 on C; R-9 on B).
- Required update: state the intended outcome for senders on the node that runs T and for senders on a third node, in REQ-011 and in the entry-form table. One possible statement: "delivered — only the Task's node knows the closure; the run on B is fenced from A, as today". I do not prescribe an outcome.
- Recipient: Solution Designer.

### AR-006 — The peer's team guidance can name a coordinator on another node

- Type: `Design Impact`; severity: Low.
- Protects: BEH-006 ("the same refusal … when the team runs there"), REQ-011.
- Scope status: `Within Approved Scope`. Changes approved behavior: No.
- Problem: `RunningAgents.teamCoordinatorOf` is defined as "the coordinator of a running team", but it comes from `findTeamCoordinator`. That method also answers for a team on a third node that one of this node's roots delegated to (`active-collaboration-root-directory.ts:106-117`). The peer then refuses with a coordinator it does not run (MP-002).
- Required update: define `teamCoordinatorOf` from the team's own live root on this node, for example `roots.resolve({ rootSubjectKind: "agent_team", rootRunId })?.teamCoordinatorOf(teamRunId)`, so that a team run elsewhere gets the "not running on B" answer. Draw where it sits in DS-004 (after `rootOf` returns `null`).
- Why proportionate: one line of definition; it keeps a refusal's guidance true.
- Recipient: Solution Designer.

AR-002 is not used. It was drafted against SR-003 (a team run ID across nodes) and withdrawn before this result, because SR-004 removed team-run-ID routing.

## Classification

`Design Impact` (AR-001, AR-004, AR-006) and `Requirement Gap` (AR-003, AR-005). Overall route: Solution Designer.

## Recommended Recipient

Solution Designer.

## Residual Risks

- `RunningAgents.rootOf` must decide "running here" from the root's own statuses, not from `placeOf` alone. `hasAgentExecution` also claims linked remote run IDs (`standalone-agent-run-root.ts:153-156`), so `placeOf` can name a root that only links the run. The design's definition (statuses) covers this; implementation should test it.
- Peer `TARGET_IS_TEAM_RUN` text: on a peer the guidance should also tell the agent to keep `node` (REQ-012 wording). This is a text detail for implementation.
- Suggestion, not a finding: § Reuse says no owner combines the directory and the statuses, but `RunStatusService` does, for subscriptions. One sentence on why it is not reused would help readers.
- Inbound messages from any agent of a paired node (accepted by the founder); at-most-once delivery across nodes (FU-002 of autobyteus-191).
- Two-node behavior stays unverified until the two-server E2E runs (UNK-001).

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass`. MP-001 and MP-002 are reachable, each with a forward witness. MP-003 is not a supported scenario, and no machinery depends on it.
- Notes: Findings AR-001, AR-003, AR-004, AR-005, AR-006. The core structure is sound and SR-004/005 simplified it: one owner of "running", the unlinked endpoint as data, a separate `run-messages` route, an opt-in listing that mirrors discovery, the removal plan, and today's team rule kept. The fixes are local to the spec. AR-001 is the only High finding.
