# Design Review Report — Remote Collaboration Slice 1: Remote Delegation, Text Only (autobyteus-191)

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/cross-node-agent-communication/requirements-doc.md` (Approved; SR-004, SR-005, SR-007)
- Upstream Investigation Notes: `…/investigation-notes.md` (SR-012; S-01 … S-15, A-01 … A-14, P-1 … P-5)
- Upstream Solution Revision Record: `…/solution-revision-record.md` (SR-001 … SR-012)
- Reviewed Design Spec: `…/design-spec.md` at commit `02933975c6c18922b60e50824bb89db4f24c045b` (revision 1, SR-012; the review began on `9fb04f2ddc` and was finished on this commit)
- Supplemental Task Artifacts Reviewed: `slice-plan.md`, `follow-ups.md`, contract draft `autobyteus-server-ts/docs/design/collaboration_model.md`, `handoff-architecture-review.md` (including § Revision 1)
- Relevant Solution Revision IDs: SR-011 (design complete), SR-012 (naming, premise checks)
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: `Architecture Design Complete` from the Solution Designer (SR-011), replaced during the review by revision 1 (SR-012)
- Prior Review Round Reviewed: N/A (first review)
- Latest Authoritative Round: 1
- Current-State Evidence Basis: reading the code in the worktree at `02933975c6` (base `5de6a698b9`, `autobyteus-server-ts/src`): `global-agent-run-message-router.ts`, `root-communication-engine.ts`, `root-communication-adapter.ts`, `root-operation-gate.ts`, `root-task-execution-command-queue.ts`, `root-task-execution-adapter.ts`, `root-task-execution-lifecycle.ts`, `standalone-root-message-delivery.ts`, `standalone-root-execution-index.ts`, `standalone-root-communication-adapter.ts`, `standalone-agent-run-root-manager.ts`, `run-execution-tree-shared-records.ts`, `task-agent-message-logs.ts`, `agent-run-metadata-types.ts`, `agent-run-service.ts`, `remote-access-route-policy.ts`, `task-delegation-tool-input-parsers.ts`, and the walkers of `taskExecutions` (list under AR-001).

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication-r2/tickets/in-progress/cross-node-agent-communication`

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: yes. It covers a new subsystem, a shared component wired into three root kinds, a new contract between nodes, an agent-facing tool parameter, new optional fields in three exact-writer trees, a new inbound network surface, and activation and wake across processes.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: yes. Text-only delegation to a published Agent on a registered peer, follow-ups by run ID in both directions (also after idle shutdown and restart), refusal codes, off by default, no credentials, and one entry point per request kind.
- Relevant existing behavior and evidence confirmed: yes. The router's same-root path (`global-agent-run-message-router.ts:99-124`), the engine's in-process delivery (`root-communication-engine.ts:32-89`), the standalone host made ready on delivery (`standalone-root-message-delivery.ts:226-239`), restoring a root by its run ID (`standalone-agent-run-root-manager.ts:138-158`), and the route policy letting credential-less network callers through (`remote-access-route-policy.ts:143-176`; P-1, P-3).
- Scope guardrail confirmed: yes (UC-101 … UC-105; Out of Scope S2 … S6; Preserved Behavior Boundary; Review Authority).
- Approved change, preserved behavior, and outside scope understood: yes. Note that A's run tree and lifecycle control from A are S3, out of scope.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes`
- Remaining material ambiguity: none in the requirements.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-101 | Operational | Pass | Pass | Pass | Confirmed | AR-004 (identity check in the contract) |
| BEH-102 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-103 | Contract | Pass | Pass | Pass | Confirmed | AR-001 (how A loads and walks the link) |
| BEH-104 | Contract | Pass | Pass | Fail | Confirmed (basis) / path needs correction | AR-002 (how the engine handles a remote endpoint) |
| BEH-105 | Contract | Pass | Pass | Fail | Confirmed (basis) / path needs correction | AR-003 (a saved Task given to the remote run by its run ID) |
| BEH-106 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-107 | User | Pass | Pass | Pass | Confirmed | — |

The behavior basis is confirmed. The `Fail` cells are design-path findings against confirmed behavior, not gaps in the basis.

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `slice-plan.md` | Pass | Pass | Pass | Pass | Pass | — (F-2 still says "versioned" requests; superseded by SR-005; cosmetic) |
| `collaboration_model.md` (contract draft) | Pass | Pass | Pass | Pass | Pass | — |
| `investigation-notes.md` A-09 | Pass | Pass | Pass | Fail | Pass | N-4: A-09's "Design use" still says remote runs go in a separate `remoteTaskExecutions` array, which SR-009 superseded |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design § Task Design Health Assessment | — |
| Root-cause classification is explicit and evidence-backed | Pass | `No Design Issue Found`; A-01 … A-08 | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | "Refactor needed now: No; one small extension" | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Fail | The "one small extension" (a supplied message ID) understates the engine change. `RootCommunicationEngine.deliver` refuses any sender that is not current in this root (`root-communication-engine.ts:36-41`), and it alone owns the message state (`current`, lines 22, 79-85). | AR-002 |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 delegate to a peer | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 follow-up A→B | Primary | Pass | Pass | Pass | Pass | Fail | Pass | Fail (AR-002: owner of the A-side sender-log append and of the B-side accept commit) |
| DS-003 reply B→A | Primary | Pass | Pass | Pass | Pass | Fail | Pass | Fail (AR-002) |
| DS-004 settings | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 `PeerGateway` | Bounded local | Pass | Pass | Pass | Pass | Pass | Pass | Pass (AR-004 adds a target-identity step) |
| DS-006 host idle schedule | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `PeerGateway` | Pass | Pass | Pass | Pass | — |
| `PeerClient` / `RemoteRunChannel` | Pass | Pass | Pass | Pass | — |
| Root `acceptRemoteMessage` | Pass | Pass | Pass | Pass | — |
| `RootCommunicationEngine` (message state and commit) | Fail | Fail | Fail | Fail | AR-002. "`RemoteRunLinks` … uses the engine's existing adapter for the local half" means `RemoteRunLinks` calls `RootCommunicationAdapter.reserveRecipientInput` / `commitAppend` beside the engine. The engine owns `current` (the duplicate-ID check in `commitAppend` and the `commitMessages` callback). That is the bad shape `Caller → Outer Boundary` plus `Caller → Internal`. |
| `PeerDirectory` / `PublishedAgentService` / `RemoteCollaborationCapability` | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/execution/remote` → `RemoteRunChannel` (owned by agent-collaboration, implemented by remote-collaboration) | Pass | Pass | Pass | Pass | Correct inversion |
| `remote-collaboration` → root managers' public APIs, identity | Pass | Pass | Pass | Pass | — |
| Runtime backends / tools | Pass | Pass | Pass | Pass | Only `node` on `delegate_task` |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `delegate_task({node?, recipient_address, description})` | Pass | Pass | Pass | Low | Pass |
| `delegate_task({target_agent_run_id, task_id})` (existing copy) | Pass | Fail | Pass | Medium | Fail (AR-003: no remote-target refusal) |
| `send_message_to` (unchanged) | Pass | Pass | Pass | Low | Pass |
| `POST /rest/remote/delegated-runs` | Pass | Pass | Fail | Low | Fail (AR-004: no target identity; N-1: `requestId` has no reader) |
| `POST /rest/remote/messages` | Pass | Pass | Fail | Low | Fail (AR-004; response shape not stated) |
| `RemoteRunChannel` | Pass | Pass | Pass | Low | Pass |
| Root `acceptRemoteMessage` | Pass | Pass | Pass | Low | Pass |
| Engine remote entry points | Fail | — | — | Medium | Fail (AR-002: not named) |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Peer identity | Pass | Pass | N/A | Pass | `ServerInstanceIdentityService` |
| Switch | Pass | Pass | N/A | Pass | `ENABLE_*` capability |
| Activation | Pass | Pass | Pass | Pass | `RootTaskExecutionLifecycle` with a new operation variant |
| Idle shutdown | Pass | Pass | N/A | Pass | `TaskExecutionIdleShutdownSchedule` |
| Remote run on B | Pass | Pass | N/A | Pass | Standalone root; `resolveRoot` / `ensureReady` (P-4) |
| Run creation on B without work | Pass | Fail | N/A | Pass (non-blocking) | N-2: the prepared-run path (`prepareAgentRun`, `cleanupStalePreparedRuns`) versus `createAgentRun` is not chosen, and RSK-106's description depends on the choice |
| Two-server E2E | Pass | Pass | N/A | Pass | P-5 harness |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/remote-collaboration/` | Pass | Pass | Pass | Pass | — |
| `src/agent-collaboration/execution/remote/` | Pass | Pass | Pass | Pass | — |
| Root trees / stores / indexes (three kinds) | Fail | Pass | Fail | Fail | AR-001 |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Remote delivery across three root kinds | Pass | Pass | Pass | Pass | One `RemoteRunLinks` |
| Refusal codes | Pass | Pass | Pass | Pass | One code list |
| Link-kind decision across walkers | Fail | N/A | Fail | Fail | AR-001: each walker decides alone; the design gives no shared guard or table |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `taskExecutions` entry with `nodeId` | Pass | Pass | Fail | Pass | Fail | AR-001. On disk it is sound. In memory, the current discriminant (`"agentRunId" in value`, A-09) cannot tell a remote link from a local Agent link. |
| `delegatedFrom {nodeId, coordinatingRun, delegatorAgentRunId}` | Pass | Pass | Pass | Pass | Pass | Every field has a reader on B |
| `peers.json`, `published-agents.json` | Pass | Pass | Pass | N/A | Pass | — |
| `/delegated-runs` request | Pass | Fail | Pass | N/A | Pass (non-blocking) | N-1: `requestId` has no reader |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `remote-collaboration/*` (new) | Pass | Pass | Pass | Pass | — |
| `execution/remote/remote-run-links.ts` | Pass | Fail | N/A | Fail | AR-002: as written it would own engine-state mutation |
| `root-communication-engine.ts` (modified) | Pass | Fail | N/A | Fail | AR-002: "accept a supplied message ID" is not the whole change |
| "Modified: the three root trees' types, schemas, stores; the three roots' index, delivery, adapters" | Fail | Pass | N/A | Fail | AR-001: the walker files outside those folders are missing (stop set, launch selections, message-log owners, run-tree DTO projection, location service, status projectors) |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/remote-collaboration/{domain,settings,channel,inbound}` | Pass | Pass | Low | Pass | — |
| `src/agent-collaboration/execution/remote/` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| None (additive capability) | Pass | N/A | Pass | Pass | The dead-code check in touched files is left to implementation, and the design says so |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Optional `nodeId` (absent means this node) | No | Pass | Pass | A tolerant reader whose absent value has a truthful meaning; no version branch |
| No version check between nodes | No | Pass | Pass | DESIGN.md rule 9; SR-005 |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Three root trees (`taskExecutions`) | Not Affected (new optional field) | Pass | Pass | N/A | Pass | Real files inspected (A-13). RSK-108 covers writer exactness with key-set tests. |
| Standalone `run_metadata.json` (`delegatedFrom`) | Not Affected | Pass | Pass | N/A | Pass | Only the root reads it |
| Task `agent_run_resources.json` | Not Affected (shape unchanged) | Pass | Pass | N/A | Pass | A-08 |
| Message logs | Not Affected | Pass | Pass | N/A | Pass | Same seven fields; one ID on both nodes |
| New settings files | New data | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 0 … 7 (contract and data model first, standalone end to end, then Team and Org) | Pass | Pass | Pass | Pass |
| Step 0 / step 3 (in-memory link kinds, engine extension) | Fail | Pass | Pass | Fail. AR-001 and AR-002 decide what step 0 and step 3 build. The design's own escalation trigger ("cannot add remote endpoints … without changing `RootCommunicationEngine`'s admission rules") already holds today (`root-communication-engine.ts:36-41`). |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Tool call, follow-up, header, tree entry, activation order | Yes | Pass | Pass | Pass | Good |
| Engine remote accept and send | Yes | Fail | N/A | Fail | AR-002: one short shape example would settle it |
| Link-walker decisions | Yes | Fail | N/A | Fail | AR-001 |

## Material Premise Validation (Only When Needed)

### `MP-001` — An agent gives a saved Task to its remote run by run ID

- Related approved requirement or established contract: REQ-110, AC-108; CM-2 ("or reuses, by run ID"); the `delegate_task` existing-copy form `{target_agent_run_id, task_id}` (`task-delegation-tool-input-parsers.ts:21-47`).
- Relevant behavior ID(s): BEH-105, BEH-103
- Initiating basis kind: `User` / `Contract`
- Independent product-supported initiating trigger: a delegating agent with `delegate_task`, holding the remote run ID it got back (DS-001 result), calls the documented existing-copy form to give that run a saved Task.
- Support evidence: the tool's documented parameters and refusal text ("…or target_agent_run_id / target_team_run_id with task_id to give a saved Task to one of your task agents"); the remote run is presented to the agent as its task agent.
- Forward path: `delegate_task` → root `assignToExistingCopy` → `RootTaskExecutionLifecycle.assignToExistingCopy` (`root-task-execution-lifecycle.ts:159-199`) → `resolveExistingCopy(adapter, copy)`. The remote link is in the root's tree (data model item 4), so it is found. Then `assertAssignable`, `reopen` (`prepareClosedCopyForResume`, which restores the chain), `assignExistingTaskExecution`, and the work with the Task's `referenceFiles` is delivered.
- Lifecycle preconditions and material consequence: a remote link exists. The Task record changes before any refusal, a local restore is attempted for a run that has no folder on A, or a saved Task with its context files is sent across. All three contradict REQ-110 ("refused before anything is sent").
- Reachability: `Reachable`
- Review consequence: AR-003.

### `MP-002` — The peer at a registered URL is replaced by a different server

- Related approved requirement: REQ-102, AC-102 ("After B's identity changes (a different server at the URL), requests are refused with 'identity mismatch'").
- Relevant behavior ID(s): BEH-101
- Initiating basis kind: `Operational` / `Contract`
- Independent trigger: the owner recreates the Docker node with a fresh data directory (a new `serverInstanceId`) at the same URL. AC-102 names this case explicitly.
- Forward path: A's `PeerClient` sends to the pinned `baseUrl`, and the new server's `PeerGateway` handles the request.
- Material consequence: the design checks identity only on the *answer*. The contract carries no target identity, and its response shapes carry no responder identity, so the mismatch is found after the receiver has acted, or the mismatch cannot be found at all.
- Reachability: `Reachable`
- Review consequence: AR-004 (low severity, but the user asked for the contract to be designed first).

### `MP-003` — A distributed deadlock when both runs send at the same moment (rejected)

- Premise checked: A's outbound send holds a root lock while B's outbound send holds B's root lock.
- Evidence: `RootOperationGate` (`root-operation-gate.ts`) counts admitted operations for draining; it does not serialize them. `RootTaskExecutionCommandQueue` serializes only activate, wake, shutdown, reopen, stop and reconfigure. Neither remote request calls back into the sender's queue synchronously.
- Reachability: `Not Reachable`. No finding.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Fail`. The behavior basis is confirmed and the overall shape is sound and well reasoned: federation, the activation order, `delegatedFrom`, the gateway hook, the port inversion and the data model. Four concrete design-path gaps need a revision of the design spec before implementation. Each fix is small and local.

## Findings

### AR-001 — In-memory link kinds: the compiler does not check what the design says it checks, and the inventory of link walkers is missing

- Type: Design Impact
- Severity: High (blocking)
- Protects: REQ-108, REQ-111 / AC-109, AC-112 / QR-105, data model item 4 ("no folder on A … restore, idle shutdown, stop … do not apply"), Out of Scope (A's run tree and lifecycle control from A are S3), and the requirements' Architecture Phase Input ("how it keeps the link out of A's run tree UI").
- Scope status: Within Approved Scope
- Changes approved behavior: No
- Evidence:
  - Links are told apart by `"agentRunId" in value` (`run-execution-tree-shared-records.ts:145-149`; about 170 such checks under `src/`). A `RemoteTaskAgentExecution` also has `agentRunId`, so every walker that reads only shared fields compiles unchanged and treats the remote link as a local copy.
  - About 35 non-migration files walk `taskExecutions`. Examples:
    - `delegated-stop-set.ts:42-47`: the user Stop / Task-closure stop set would include the remote run.
    - `delegated-launch-selection.ts:119,230,247`: the model change would offer and apply to it.
    - `task-agent-message-logs.ts` `taskAgentLogOwners`: it would read or create an own log at `agents/<remoteId>/` on A.
    - `standalone-root-execution-index.ts` `visitTask`: it would index the link as a hosted `"task"` agent, so `isLiveChild` and `withLiveLease` would try to wake or restore a local copy.
    - `collaboration-execution-tree-dto-projection.ts:74`: it would show the remote run in A's run tree (S3).
    - `composeMessageLogs` (loaded-endpoint filter L6): it would drop the message between the delegator and the remote run from the root's stored view after a restore.
    - The root task adapter methods (`isLive`, `taskExecutionStatus`, `restoreChain`, `tryShutDownIfQuiet`, `shutDownForUser`, `releaseOwnedExecution`, `listTaskExecutions`).
  - The design says "the compiler checks that it does" (§ Principles), and the file mapping lists only the root folders.
- Required update:
  1. Choose an in-memory discriminant that really forces the decision. Examples: an explicit `kind` on the loaded link union; or `isTaskAgentExecution` / `isRemoteTaskAgentExecution` guards that test `nodeId`, with the shared-field `"agentRunId" in` checks on links replaced by the guards. Say which.
  2. Add a short decision table of walker categories with the remote outcome for each, and add the files to the file mapping. Categories: index membership (remote endpoint, not a hosted agent); Task closure (fence only, DEC-107); user stop / stop set (exclude, S3); launch selections (exclude); own-file compose/split and own message logs (exclude: stored whole, no own log); run-tree DTO and status projections (exclude, S3); message-view endpoint filter (include as a loaded endpoint); root task adapter liveness, restore, idle and stop (exclude).
- Why proportionate: this is the main persistence and ownership risk the design itself names (RSK-108, SR-009 tradeoff). One table plus a guard choice fixes it, and no new machinery is needed.
- Recommended recipient: Solution Designer

### AR-002 — The remote send and accept paths are not owned by the engine that owns the message state

- Type: Design Impact
- Severity: Medium (blocking)
- Protects: REQ-106, REQ-108 (CM-9: one message ID in both logs), AC-105, AC-106
- Scope status: Within Approved Scope
- Changes approved behavior: No
- Evidence:
  - `RootCommunicationEngine.deliver` refuses a sender or receiver that is not a current agent of this root (`root-communication-engine.ts:36-41`). It hashes the message ID itself (lines 91-100), and it owns `current` through `commitAppend`'s `getCurrentMessages` / `commitMessages` (lines 79-85). `StandaloneRootCommunicationAdapter.commitAppend` refuses a duplicate ID against that state.
  - The design says the remote paths "live in `RemoteRunLinks`, which uses the engine's existing adapter for the local half" and that the only engine change is "accept a supplied message ID".
  - The A-side step "A appends to the delegator's log" after B accepts (DS-002) has no owner.
  - The design's own escalation trigger (admission rules) already holds.
- Required update:
  - Name the engine's two remote entry points, for example `acceptFromRemote(input)` (inbound) and `recordSentToRemote(input)` (outbound, after the peer accepted). For each, state the checks that apply (open; the local endpoint is current; Task check; content; duplicate ID) and the checks that do not apply (sender membership for a remote sender).
  - State the message-ID source: the sender's node assigns it, and the receiver uses it.
  - State the log owners: receiver-only on accept, sender-only on record, using the remote owner kind.
  - `RemoteRunLinks` keeps the link check, the pair rule and the channel call, and reaches messages only through these engine methods.
  - Update the health assessment, the file mapping and step 3.
- Why proportionate: it keeps one owner of the message state and commit (Principle 3) and needs two small methods, not a refactor.
- Recommended recipient: Solution Designer

### AR-003 — The existing-copy form of `delegate_task` is not refused for a remote run

- Type: Design Impact
- Severity: Medium (blocking)
- Protects: REQ-110, AC-108 ("a `delegate_task` to a peer with `task_id` … refused … nothing sent or started"), REQ-109
- Scope status: Within Approved Scope
- Changes approved behavior: No
- Evidence: MP-001. The design refuses `task_id` only "with `node`" (§ Interface Boundary Mapping). The existing-copy form takes a run ID without `node`, finds the remote link in the tree, and goes on to reopen, assign and deliver (`root-task-execution-lifecycle.ts:159-199`).
- Required update: refuse `{target_agent_run_id: <remote link>, task_id}` with the "attachments or saved Tasks not supported across nodes yet" code. Do it at the existing-copy resolution step, before `assertAssignable`, `reopen` or any Task change. Add the row to the interface table and to the DS-001 refusal list. The AR-001 table can carry it as the "existing-copy assignment / reopen" category.
- Why proportionate: one refusal at one existing decision point.
- Recommended recipient: Solution Designer

### AR-004 — The contract between nodes carries no target identity, so the identity-mismatch refusal is not enforceable before the receiver acts

- Type: Design Impact
- Severity: Low (blocking; part of the contract the user asked to settle first)
- Protects: REQ-102, AC-102 (identity mismatch), REQ-114 (the single entry point)
- Scope status: Within Approved Scope
- Changes approved behavior: No
- Evidence: MP-002. The envelope is `{fromNodeId, request}`. `PeerClient` "checks that the answering node's `serverInstanceId` matches the pinned one", but neither response shape carries the responder's identity (`/delegated-runs` → `{agentRunId}`; `/messages` has no response shape), and a check on the answer comes after the remote side has acted.
- Required update: add `toNodeId` (the pinned peer ID) to the envelope. `PeerGateway` refuses `toNodeId ≠ own serverInstanceId` with "identity mismatch" before the switch and peer checks dispatch. Write out both response shapes (accepted / refusal `{code, message}`), and include the responder's `nodeId` if `PeerClient` still checks the answer.
- Why proportionate: one field and one gateway step, at the hook the design already has.
- Recommended recipient: Solution Designer

### Non-blocking recommendations

- N-1: `/delegated-runs` `requestId` has no stated reader (there are no retries, so QR-101 holds without it). Either state B's deduplication by `requestId` or drop the field (Principles 7 and 11).
- N-2: say which creation path `RemoteDelegationReceiver` uses on B: prepared (`prepareAgentRun`, which expires and is cleaned up by `cleanupStalePreparedRuns`) or created and activated (`createAgentRun`). RSK-106's "idles out and stays in B's history as empty" is true only for the second.
- N-3: `/rest/remote/*` already falls under `TRUSTED_NETWORK_PROTECTED` by default (`remote-access-route-policy.ts:96`). The `REMOTE_PEER` class is fine for clarity. Consider refusing mobile credentials on it, as `TRUSTED_NETWORK_OWNER` does. Not required (RSK-101 holds either way, P-1/P-3).
- N-4: investigation notes A-09 "Design use" still says separate `remoteTaskExecutions` array; align it with SR-009.
- N-5: the `/messages` row says the receiver "ignores a `messageId` it already holds (idempotent)". Today's commit returns `AGENT_ROOT_MESSAGE_COMMIT_CONFLICT` for a duplicate. Either state the accepted-duplicate behavior in the AR-002 accept method, or drop the claim (no retries).

## Classification

`Design Impact` (AR-001 … AR-004).

## Recommended Recipient

Solution Designer (`/software_engineering_team/solution_designer`)

## Residual Risks

- RSK-101 / RSK-103: accepted by the requirements until S6. P-1 and P-3 confirm the slice adds no new class of access.
- RSK-106: timeout ambiguity, accepted (no retries). See N-2.
- RSK-107: restoring a whole Team or Org root for a reply costs the same as the user reopening it.
- RSK-108: writer exactness across three tree kinds. The key-set tests are planned; AR-001 removes the reader-side half of this risk.
- Linux Docker `host-gateway`: still to check in the slice's E2E (P-2 covers macOS only).

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass` (MP-001 and MP-002 reachable with complete witnesses; MP-003 rejected as `Not Reachable`)
- Notes: classification `Large` / `High` confirmed. Reviewed commit `02933975c6` (SR-012). Findings AR-001 … AR-004 are all `Design Impact` within approved scope; none changes intended behavior.
