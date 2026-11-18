# Design Review Report — list-running-agents (autobyteus-492)

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/list-running-agents/requirements-doc.md` (Approved, SR-006 basis with DEC-014 added at SR-008; status SR-008)
- Upstream Investigation Notes: `tickets/in-progress/list-running-agents/investigation-notes.md` (SR-006)
- Upstream Solution Revision Record: `tickets/in-progress/list-running-agents/solution-revision-record.md` (SR-001 … SR-008)
- Reviewed Design Spec: `tickets/in-progress/list-running-agents/design-spec.md` (Ready, SR-008)
- Supplemental Task Artifacts Reviewed: None (no supplements); `handoff-architecture-review.md`, `follow-ups.md` (empty)
- Relevant Solution Revision IDs: SR-001 … SR-008
- Architecture Review Revision Record: `tickets/in-progress/list-running-agents/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: 4
- Trigger: SR-008 (commit `111ebbc096`): the Solution Designer's own walkthrough of each use case along its spine (§ Design Validation Walkthrough), with fixes G-1 (run views, DEC-014) and G-2 (the receiver's active root). Round 3 reviewed SR-007 (`bd52ef4e15`), which fixed ARCH-REV-002's AR-007. Round 2 reviewed SR-006 (`159298e8a4`): the fixes for ARCH-REV-001 and the founder's entry fields (DEC-013).
- Prior Review Round Reviewed: 3 (ARCH-REV-003, `Pass`, on SR-007); round 2 (ARCH-REV-002, `Fail`, on SR-006); round 1 (ARCH-REV-001, `Fail`, on SR-005)
- Latest Authoritative Round: 4
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/list-running-agents`, branch `codex/list-running-agents` at `111ebbc096` (base `origin/personal` `bd2053ee51`; only ticket documents changed since the base). Round 2 also checked the workspace sources: Agent `run_metadata.json` `workspaceRootPath` (required, `agent-run-metadata-types.ts:9`); Team member `workspaceRootPath` (optional, `team-run-config.ts:22,37`). I opened the cited lines in `global-agent-run-message-router.ts`, `cross-run-message-delivery.ts`, `remote-message-send.ts`, `remote-endpoint.ts`, `remote-message-receiver.ts`, `root-communication-engine.ts:150-230`, `standalone-agent-run-root.ts:131,153-156,294-301`, `root-team-run.ts:128,424-431`, `agent-org-run.ts:107`, `active-collaboration-root-directory.ts:101-137`, `delegation-index.ts:371-422`, `closed-task-fence.ts`, `paired-agent-access.ts`, `standalone-paired-agent-access.ts:95-100`, `collaboration-composition.ts:190-265`, and the sources of `run-status-service.ts`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: about 20 production files over five subsystems; a changed message contract for every agent (CM-5, CM-11); two new requests between nodes behind the peer gate; changed reach between Tasks and between nodes. SR-004/005 make the change smaller (no team-run-ID routing, no Org entries) but none of these surfaces goes away.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Round 4: SR-008's G-1 and G-2 are checked against HEAD (ARCH-REV-004). G-1 holds and its fix is sound. G-2's target is right, but it cites as existing code a method that is uncommitted implementation work (AR-008, non-blocking). Round 3: AR-007 is resolved (ARCH-REV-003). Round 2: AR-001, AR-003, AR-004, AR-005 and AR-006 are resolved (ARCH-REV-002). No finding is open. The rest of this section records the round-1 basis, and it still holds except where noted.
- Overall Basis Status: `Confirmed` (round 2). AR-005 is settled in REQ-011/DEC-011; AR-003's texts are corrected.
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
| BEH-004 | Contract | Pass | Pass | Pass | Confirmed | AR-001 resolved (DS-004, row 13) |
| BEH-005 | Contract | Pass | Pass | Pass | Confirmed | AR-007 resolved (round 3: `route`'s peer-run branch calls `closedPeerRunRefusal`) |
| BEH-006 | Contract | Pass | Pass | Pass | Confirmed | AR-006 resolved |
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
| DS-004 | Message with `node` | Pass | Pass | Pass | Pass | Pass | Pass | Pass (round 2: `closedPeerRunRefusal` comes before the sender's root; `teamCoordinatorOf` comes after `rootOf` returns `null`) |
| DS-005 | Answer | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | Linked run, unpaired sender | Pass | Pass | N/A | Pass | Pass | Pass | Pass (the closed check holds through the same root's links, `standalone-agent-run-root.ts:131,294-301`) |
| Bounded: `CrossRunMessageDelivery.route` | Local | Pass | Pass | N/A | Pass | Pass | Pass | Pass (round 3: peer run → `closedPeerRunRefusal(its nodeId, target) ?? null`) |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RunningAgents` | Pass | Pass | Pass | Pass | Callers never combine directory and statuses themselves |
| Root `deliverToPeerRun` / `acceptPeerRunMessage` | Pass | Pass | Pass | Pass | The router and the receiver never touch an engine |
| `CrossRunMessageDelivery` (Task admission) | Pass | Pass | Pass | Pass | Round 2: `closedPeerRunRefusal` is the one owner of the rule on the `node` path. round 3: the same owner also answers on its own route's peer-run branch (two callers, one rule) |
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
| Entry union by `kind` (Agent `agent_run_id`, `workspace`; Team `team_run_id`, `team_coordinator_agent_run_id`, `workspace`; DEC-013) | Pass | Pass | Pass | Low | Pass (the names match `delegate_task`'s result names without `target_`) |
| `CrossRunMessageDelivery.closedPeerRunRefusal({nodeId, agentRunId})` | Pass | Pass | Pass | Low | Pass |
| `send_message_to({…, node?})` | Pass | Pass | Pass | Low | Pass (agent run IDs only, as today) |
| `RunningAgents.rootOf` / `statusesOf` | Pass | Pass | Pass | Low | Pass |
| `RunningAgents.teamCoordinatorOf` | Pass | Pass | Pass | Low | Pass (round 2: answered from the team's own live root on this node) |
| `POST /rest/remote/run-messages` vs `/messages` | Pass | Pass | Pass | Low | Pass (split by subject) |
| `POST /rest/remote/running-agents` | Pass | Pass | Pass | Low | Pass |
| `unlinkedRunEndpoint` | Pass | Pass | Pass | Low | Pass (round 2: no `ownershipChain`) |

Empty indirection check: `Pass`. `RunningAgents` combines two owners for three consumers; no new port is added.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Live statuses | Pass | Pass | N/A | Pass | `PairedAgentAccess` per kind, `AgentOrgAgentStatuses` (Org agents stay reachable) |
| "Is it running, in which root" | Pass | Pass | Pass | Pass | `RunStatusService` pushes view subscriptions; a synchronous read-only owner meets a different need |
| Peer lookup, peer listing, remote send/accept | Pass | Pass | N/A | Pass | `findPeer`, `PeerDiscoveryChannel`, `RemoteMessageSend`, engine |
| Team guidance on a peer | Pass | Pass | N/A | Pass | Reuses the local refusal's code and text |
| Closed-Task decision for a peer run | Pass | Pass | N/A | Pass | Round 2: `CrossRunMessageDelivery.closedPeerRunRefusal` uses the tree's `runOfAgent`/`tasksOf` |
| Run workspace (DEC-013) | Pass | Pass | N/A | Pass | `RunOwnAgentsReader.listingFactsOf` reads the existing `workspaceRootPath` fields; no new store |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/running/` | Pass | Pass | Pass | Pass | Three small files, one concern |
| `agent-collaboration/communication/` | Pass | Pass | Pass | Pass | AR-001 and AR-007 resolved |
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
| `RunningAgentEntry` | Pass | Pass | Pass | Pass | Pass | Union by `kind`. The ID names follow `delegate_task`. A Team's `workspace` and `state` are its coordinator's (DEC-013, DEC-009). Because the Team member `workspaceRootPath` is optional, the design marks `workspace?` |
| `RemoteEndpoint` (+ `unlinked_run`) | Pass | Pass | Pass | Pass | Pass | Round 2: `ownershipChain` removed from every kind |
| `RemoteMessageTransmission` (+ `run_message`) | Pass | Pass | Pass | Pass | Pass | — |

Derived consumers of a changed structure: `Pass` (§ Change Scope table).

Vocabulary (Principle 15): `Pass`. "Running agent", "started by a person", `unlinked_run`, `run_message`, `agent_run_id`, `team_run_id`, `team_coordinator_agent_run_id` and `workspace` are defined; the ID names are `delegate_task`'s (DEC-013). The stale texts of AR-003 are corrected.

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
| `RemoteEndpointCore.ownershipChain` (already dead, in a touched file) | Pass | N/A | Pass | Pass | Round 2: in the removal plan, with the engine comment at `:152` |
| Inbound `not_linked` refusal | Pass | Pass | Pass | Pass | Kept for linked requests; only its test is rewritten (wording clarified in round 2) |
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
| Entry forms (14 rows) | Yes | Pass | N/A | Pass | Rows 13 and 14 cover AR-001 and AR-005; in round 3, row 13 covers sending with and without `node` (AR-007) |
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

MP-001 and MP-002 are now handled by the design (round 2: DS-004 `closedPeerRunRefusal`; `teamCoordinatorOf` from the team's own root).

### `MP-004` — A sender in a root that does not link the run messages a fenced peer run without `node`

- Related approved requirement: REQ-011 ("every sender on this node gets that refusal, with or without `node`"), AC-008 (alternate outcome: "for any sender on this node, also with `node`").
- Relevant behavior ID(s): BEH-005.
- Initiating basis kind: `User`.
- Trigger: MP-001's steps 1–3, after which X sends `send_message_to(target_agent_run_id: T)` without `node`, exactly as the run ID appears in the header it received.
- Forward path (SR-006 design):
  1. The router's own-root step misses: X's root does not link T.
  2. `CrossRunMessageDelivery.route`: `runOfAgent(T)` finds a run, whose `tasksOf` entries have a `nodeId`, so the bounded spine "peer run? null" returns before any admission (current code `cross-run-message-delivery.ts:92-94`).
  3. The router's team step does not match. `getActiveRun(T)` finds no active run, so the result is `TARGET_AGENT_RUN_NOT_ACTIVE` with the new hint "also pass node".
- Consequence: X is told the run is not running, while REQ-011 and AC-008 require `TASK_AGENT_RESOURCE_CLOSED`. Nothing is delivered. A test written from AC-008 fails against the design, or the implementation departs from the design.
- Reachability: `Reachable`.
- Review consequence: AR-007, resolved in round 3 (SR-007).

### `MP-003` — An agent stops between the running check and the reservation (design § Risks)

- Initiating basis: none independent (timing only). The design classifies it as not supported (P6), and no machinery depends on it beyond the existing gate re-check. Not a supported scenario; no finding.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Which senders REQ-011's "fenced remote run" covers | Only the node that owns the Task knows it is closed; B (N-11) and a third node do not | AR-005 | Resolved (SR-006: REQ-011, DEC-011, row 14) |

## SR-008 Delta Review (Round 4)

Checked against committed code at `111ebbc096`, not the worktree. The worktree holds the implementation engineer's uncommitted changes.

| Item | Claim | Evidence at HEAD | Verdict |
| --- | --- | --- | --- |
| G-1 live feed | An unrelated message would be published live to both runs' views | `RunMessagesFeed.publish` (`run-messages-feed.ts:26-43`) publishes to `chainOf(sender) ∪ chainOf(receiver)`, and `inViewOf` is true when X is either side. The engine's `acceptFromRun` passes `input.senderIdentity.root` as `publishFrom` (`root-communication-engine.ts:291-293`) | Holds |
| G-1 stored read | The Team-tab read drops it | `readCollaborationParticipantMessages` keeps `isPublicMessage` (both agents in X's tree, `public-message-scope.ts:10-13`) or a past participant (`forAgentRunIds`, delegated runs) (`collaboration-participant-messages.ts:81-88`) | Holds: live and reload would disagree |
| G-1 fix | `publishToViews` set by CrossRun (related `true`, unrelated `false`); `acceptFromRun` publishes only when `true` | The three roots spread `CrossRunAcceptInput` into the engine's `RunAcceptInput` (standalone `standalone-root-message-delivery.ts:129-132`, Team `team-run-message-delivery.ts:76-79`, Org `agent-org-run-message-delivery.ts:72-75`), so one field on `CrossRunAcceptInput` reaches the engine with no root change. One rule with remote messages (`acceptFromRemote` publishes nothing, `:226`) | Pass. DEC-014 is the Solution Designer's call within the direction (UI out of scope); REQ-011 states it |
| G-2 target | The receiver's root comes from a never-restoring active lookup that returns the root (with `acceptFromRun`), not the directory's message boundary | `ActiveRootMessageBoundary` has no `acceptFromRun` (`active-collaboration-root-directory.ts:18-27`). The managers' active getters exist: `StandaloneAgentRunRootManager.getActive` (`:123`), `TeamRunService.getActiveTeamRun`, `AgentOrgRunService.getActive` | Pass |
| G-2 citation | "`CollaborationRootResolver.resolveActive` (`collaboration-root-resolver.ts:32,82`) returns the root and never restores" | At HEAD the resolver has only `resolveOrRestore`; line 32 is `isNotFound`, and the file has 77 lines. `resolveActive` exists only in the worktree's uncommitted diff (the implementation engineer's) | AR-008 (non-blocking) |
| Walkthrough rows spot-checked | `contextOfRun` (`project-run-service.ts:67`), `/rest/remote` → PEER (`node-route-permissions.ts:86`), `stepTwo` null with no entries (`collaboration-tree.ts:148-149`), `acceptFromRun` on all three roots | All at the cited lines | Holds |

## Review Decision

`Pass` (round 4). The upstream behavior basis is confirmed (REQ-011 now includes DEC-014), the SR-008 delta is sound and ready for implementation, and no in-scope machinery or finding depends on an unsupported material premise.

## Findings

No blocking finding. Every earlier finding stays resolved (AR-001, AR-003 … AR-007). AR-002 was never used.

### AR-008 — The design cites `CollaborationRootResolver.resolveActive` as existing code; it is new, and the change inventory omits it

- Type: `Design Impact`; severity: Low; blocking: No.
- Protects: Principle 1 (statements about existing code carry true citations) and Principle 14 (complete change inventory). No behavior changes.
- Scope status: `Within Approved Scope`. Changes approved behavior: No.
- Problem: § Dependency Rules and the walkthrough row "Receiver root without restore" say `resolveActive` exists at `compositions/collaboration-root-resolver.ts:32,82`. At HEAD (and the base `bd2053ee51`) the resolver has only `resolveOrRestore`; line 32 is `isNotFound`. The method and the resolver's new `standaloneRoots.getActive` dependency are in the implementation engineer's uncommitted diff. The Final File Responsibility Mapping does not list `collaboration-root-resolver.ts`, so a code reviewer comparing code with the design finds an unlisted file and a citation that does not hold at the base.
- Why not blocking: the target shape is right (a never-restoring active lookup next to `resolveOrRestore`, from the managers' existing active getters), and the implementation already builds it. Only the document is wrong.
- Required update: at its next revision, the Solution Designer adds `src/compositions/collaboration-root-resolver.ts` (Modify: `resolveActive`; `standaloneRoots` gains `getActive`) to the file mapping and rewords the citation as a target. Until then, the implementation handoff lists the file.
- Recipient: Solution Designer (correction); implementation engineer (list it in the handoff).

## Classification

N/A (Pass). AR-008 is a non-blocking `Design Impact`.

## Recommended Recipient

Implementation engineer (primary; the SR-008 delta). Solution Designer (informational, with AR-008's correction).

## Residual Risks

These are for implementation and validation; none blocks.

- G-1: a test should cover an unrelated message (no event on either run's view stream; the Team tab hides it; both logs and both conversations hold it) next to a related one (published as today).
- `workspace` sends a filesystem path of this node to a paired peer. The founder asked for it (DEC-013), and REQ-007's exclusions do not name it. The strict peer reader must accept it (QR-002, AC-004).
- `RunningAgents.rootOf` must decide "running here" from the root's own statuses. A root that only links the run ID must answer "not running".
- `closedPeerRunRefusal` has two callers. Keep it one method of one owner.
- The standalone root's `acceptFromRun` makes the host ready (`whenReady`). The running check comes first; a race in between is not a supported scenario (MP-003).
- Peer `TARGET_IS_TEAM_RUN` text: on a peer the guidance should also tell the agent to keep `node` (REQ-012).
- Inbound messages from any agent of a paired node (accepted by the founder); at-most-once delivery across nodes (FU-002 of autobyteus-191).
- Two-node behavior stays unverified until the two-server E2E runs (UNK-001).

## Latest Authoritative Result

- Review Decision: `Pass` (ARCH-REV-004)
- Material-Premise Gate: `Pass`. G-1's live-vs-stored premise is reachable (an unrelated message under the new rule, a person viewing either run's Team tab) and handled. MP-001, MP-002 and MP-004 are handled; MP-003 is not a supported scenario.
- Notes: `task_size=Large`, `architectural_risk=High`. The package is ready for implementation at SR-008 (`111ebbc096`). AR-008 is a non-blocking document correction.
