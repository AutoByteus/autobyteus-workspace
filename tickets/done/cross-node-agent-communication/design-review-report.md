# Design Review Report — Remote Collaboration Slice 1: Remote Delegation, Text Only (autobyteus-191)

## Review Round Meta

- Upstream Requirements Doc: `…/requirements-doc.md` (Approved; SR-004, SR-005, SR-007; unchanged in SR-013)
- Upstream Investigation Notes: `…/investigation-notes.md` (SR-013; S-01 … S-15, A-01 … A-15, P-1 … P-5)
- Upstream Solution Revision Record: `…/solution-revision-record.md` (SR-001 … SR-013)
- Reviewed Design Spec: `…/design-spec.md` at commit `b9f630de6ba09c002ee876463c49b0866f07fdb2` (SR-017; includes SR-014 … SR-016)
- Supplemental Task Artifacts Reviewed: `slice-plan.md`, `follow-ups.md`, contract draft `autobyteus-server-ts/docs/design/collaboration_model.md`, `handoff-architecture-review.md` § Round 2
- Relevant Solution Revision IDs: SR-011 … SR-017
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-007`
- Current Review Round: 7
- Trigger: the Solution Designer's SR-017 (commit `b9f630de6b`): a revised design from the code reviewer's failure-origin review CRR-005 of API/E2E finding F-002. Team and Org package validators reject stored delegator ↔ remote messages, because they check endpoints against the local-only index.
- Prior Review Round Reviewed: round 6 (`ARCH-REV-006`, `Pass`)
- Latest Authoritative Round: 7
- Current-State Evidence Basis: the round-1 code reading (still valid; SR-013 changed documents only), plus these round-2 checks:
  - `run-history/store/task-execution-tree-split.ts` (`splitTaskExecutions` keeps on-disk entries it did not load, in place; `composeTreeFile` / `agentRunIdsOfTree`);
  - `agent-collaboration/execution/task/root-task-execution-resource-scope.ts` (`releaseTaskExecutions`; `NO_AUTHORITY` counts as stopped);
  - `agent-execution/services/agent-run-provisioning-service.ts` (prepared-run TTL 24 h; `cleanupStalePreparedRuns` skips started runs);
  - `agent-execution/services/standalone-agent-run-eligibility.ts`;
  - `run-history/services/agent-run-history-catalog-service.ts:97` (how prepared runs are detected).
- Round-7 checks (code at `b9f630de6b`, implementation `31d46978ad`):
  - `run-history/services/team-run-state-package-validator.ts:23-26` and `agent-org-execution/services/agent-org-state-package-validator.ts:20-22` call `index.requireAgent` on both message endpoints (the F-002 cause, confirmed);
  - `run-history/services/root-run-package-current-validator.ts:163,195` (the admission scan calls both);
  - `task-execution-tree-split.ts:303-313` `agentRunIdsOfTree` (own parts + task agents + `shape.remoteLinks`, `?? []` in each shape);
  - the three message stores compose the stored view with that set (standalone adds the back-link endpoint, `standalone-root-package-store.ts:81`);
  - every non-migration lookup of a message endpoint in an index: the two validators; Org delivery (skips a remote sender, `agent-org-run-message-delivery.ts:178`); standalone presentation (`getAgent`, tolerant, `standalone-root-message-delivery.ts:236`); `public-message-scope.ts` (filters remote-endpoint messages out of the root view stream, CR-001);
  - the callers of the validators among migrations (`agent-org-history-first-message-summary-v1` imports the *current* Org validator; the others import released copies).
- Round-4 checks: `agent-collaboration/execution/task/root-task-dispatch.ts` (`dispatchTaskCopy`: `planActivation` → `linkNewTaskExecution` → queue `beginActivation` → `prepare` → `commit` → `acceptSeed` → `markStarted`; failure path `markFailed`); `agent-run-history-catalog-service.ts` (`recordPreparedRun` writes a history row for a prepared run). SR-015 notes that an implementation of steps 0 … 7 already exists (code review CRR-002) and is to be brought in line with this design; the code review checks it.

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication-r2/tickets/in-progress/cross-node-agent-communication`

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: yes, unchanged from round 1.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: yes, unchanged; SR-013 changes no intended behavior.
- Relevant existing behavior and evidence confirmed: yes (round 1, plus the round-2 code checks above).
- Scope guardrail confirmed: yes.
- Approved change, preserved behavior, and outside scope understood: yes. The design now states the S3 exclusions explicitly (A's run tree, stop, reactivation).
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (none remain).
- Remaining material ambiguity: none.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-101 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-102 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-103 | Contract | Pass | Pass | Pass | Confirmed | N-6 (how B admits the work packet; non-blocking) |
| BEH-104 | Contract | Pass | Pass | Pass | Confirmed | N-8 (where the wake happens around `acceptFromRemote`; non-blocking) |
| BEH-105 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-106 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-107 | User | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `slice-plan.md` | Pass | Pass | Pass | Pass | Pass | — (F-2 "versioned" wording superseded by SR-005; cosmetic) |
| `collaboration_model.md` (contract draft) | Pass | Pass | Pass | Pass | Pass | — |
| `investigation-notes.md` | Pass | Pass | Pass | Pass | Pass | — (A-09 aligned) |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design § Task Design Health Assessment | — |
| Root-cause classification is explicit and evidence-backed | Pass | `No Design Issue Found`; A-01 … A-15 | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Now names the engine's two remote entry points and the in-memory partition | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | § Remote Links In Memory; § Remote Delivery In The Engine | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 delegate to a peer | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-001 delegate to a peer (SR-014 order) | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass (the peer call now runs in `planActivation`, before the Task link and outside the root's queue; MP-004) |
| DS-002 follow-up A→B | Primary | Pass | Fail | Pass | Pass | Pass | Pass | Pass (AR-005, AR-006 resolved; N-12: the spine-narrative row is stale) |
| DS-003 reply B→A | Primary | Pass | Fail | Pass | Pass | Pass | Pass | Pass (AR-005, AR-006 resolved; N-12) |
| DS-004 settings | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 `PeerGateway` | Bounded local | Pass | Pass | Pass | Pass | Pass | Pass | Pass (the narrative row still lists only switch → peer; the authoritative gateway order is in § Contract Between Nodes) |
| DS-006 host idle schedule | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `PeerGateway` | Pass | Pass | Pass | Pass | Fixed order: mobile credential, `toNodeId`, switch, peer, dispatch |
| `PeerClient` / `RemoteRunChannel` | Pass | Pass | Pass | Pass | Checks the responder's `nodeId` |
| Root `acceptRemoteMessage` | Pass | Pass | Pass | Pass | — |
| `RootCommunicationEngine` | Pass | Pass | Pass | Pass | `sendToRemote` / `acceptFromRemote`; `RemoteRunLinks` never touches the adapter |
| `RemoteRunLinks` | Pass | Pass | Pass | Pass | AR-006 resolved: a core with membership and `deliver` only; the per-side rules live on the `RemoteEndpoint` kinds `delegated_run` / `delegator` |
| `RemoteDelegation` | Pass | Pass | Pass | Pass | Placement, planning and activation of DS-001, separate from messaging. N-13: one sentence must say that each root adapter's `planActivation` delegates a remote placement to it |
| Root message delivery | Pass | Pass | Pass | Pass | The single governing owner of each node's half of DS-002/DS-003 (AR-005) |
| `PeerDirectory` / `PublishedAgentService` / `RemoteCollaborationCapability` | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/execution/remote` → `RemoteRunChannel` | Pass | Pass | Pass | Pass | — |
| `remote-collaboration` → root managers, identity | Pass | Pass | Pass | Pass | — |
| `RemoteRunLinks` → engine (not adapter) | Pass | Pass | Pass | Pass | — |
| Runtime backends / tools | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `delegate_task({node?, recipient_address, description})` | Pass | Pass | Pass | Low | Pass |
| `delegate_task({target_agent_run_id, task_id})` | Pass | Pass | Pass | Low | Pass (`REMOTE_SAVED_TASK_NOT_SUPPORTED` before any Task change) |
| `send_message_to` | Pass | Pass | Pass | Low | Pass |
| `POST /rest/remote/delegated-runs` | Pass | Pass | Pass | Low | Pass |
| `POST /rest/remote/messages` | Pass | Pass | Pass | Low | Pass |
| `RootCommunicationEngine.sendToRemote` / `acceptFromRemote` | Pass | Pass | Pass | Low | Pass |
| `RemoteRunChannel`, root `acceptRemoteMessage` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Tree compose / split | Pass | Pass | N/A | Pass | Extends the shared `task-execution-tree-split.ts` and `CoordinatingTreeShape`; the split already keeps entries it did not load (verified) |
| Run creation on B | Pass | Pass | N/A | Pass | Prepared-run path; 24 h TTL; cleanup skips started runs (verified) |
| Task closure | Pass | Pass | N/A | Pass | `NO_AUTHORITY` counts as stopped (verified, `root-task-execution-resource-scope.ts:118-130`); see N-9 |
| Peer identity, switch, idle shutdown, activation, two-server E2E | Pass | Pass | N/A | Pass | Unchanged from round 1 |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/remote-collaboration/` | Pass | Pass | Pass | Pass | — |
| `src/agent-collaboration/execution/remote/` | Pass | Pass | Pass | Pass | — |
| Root trees / stores / indexes (three kinds) | Pass | Pass | Pass | Pass | Partitioned in memory at the shared store owner |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Remote delivery across three root kinds | Pass | Pass | Pass | Pass | `RemoteRunLinks` plus the engine |
| Link-kind decision across walkers | Pass | Pass | Pass | Pass | Decided once at the store; the walker table records each category; guard test per root kind |
| Refusal codes | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| On-disk `taskExecutions` entry with `nodeId` / in-memory `RemoteTaskAgentExecution` in `remoteTaskExecutions` | Pass | Pass | Pass | Pass | Pass | One list on disk (SR-009); distinct type and list in memory |
| `delegatedFrom` | Pass | Pass | Pass | Pass | Pass | — |
| Envelope `{fromNodeId, toNodeId}`; answers with `nodeId` | Pass | Pass | Pass | N/A | Pass | `requestId` dropped |
| Settings files | Pass | Pass | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `remote-collaboration/*` | Pass | Pass | Pass | Pass | — |
| `execution/remote/remote-run-links.ts` | Pass | Pass | N/A | Pass | — |
| `root-communication-engine.ts` (two entry points) and adapters (`commitSentToRemote`) | Pass | Pass | N/A | Pass | — |
| `task-execution-tree-split.ts`, `coordinating-tree-shapes.ts`, three tree types and stores | Pass | Pass | N/A | Pass | See N-7 |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/remote-collaboration/{domain,settings,channel,inbound}` | Pass | Pass | Low | Pass | — |
| `src/agent-collaboration/execution/remote/` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| None (additive capability); `requestId` removed from the contract | Pass | N/A | Pass | Pass | Dead-code check in touched files during implementation |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Optional `nodeId` (absent means this node) | No | Pass | Pass | Tolerant reader |
| No version check between nodes | No | Pass | Pass | DESIGN.md rule 9 |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Three root trees (`taskExecutions`) | Not Affected | Pass | Pass | N/A | Pass | The split keeps entries it did not load (verified); round-trip and key-set tests per kind |
| Standalone `run_metadata.json` (`delegatedFrom`) | Not Affected | Pass | Pass | N/A | Pass | See N-10 (prepared-run fields in the example) |
| Task records, message logs, settings | Not Affected / new data | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 0 … 7 | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Tool call, follow-up, header, tree entry, activation order | Yes | Pass | Pass | Pass | — |
| Engine remote send (A side) | Yes | Pass | N/A | Pass | § Remote Delivery In The Engine |
| Walker decisions | Yes | Pass | N/A | Pass | § Remote Links In Memory table |
| Contract bodies and answers | Yes | Pass | N/A | Pass | § Contract Between Nodes |

## Material Premise Validation (Only When Needed)

- `MP-001` (a saved Task given to the remote run by run ID): `Reachable`. Resolved by the AR-003 refusal.
- `MP-002` (a different server behind a pinned URL): `Reachable`. Resolved by `toNodeId` and the responder `nodeId` (AR-004).
- `MP-003` (a distributed deadlock when both runs send at once): `Not Reachable` (round 1). It remains so: SR-013 adds no lock, and `sendToRemote` awaits `transmit` without holding the task queue.

### `MP-004` — The peer prepared a run, and then A's Task link refused (SR-014 order)

- Related requirement: REQ-104 ("On refusal, nothing is started on either node"), AC-104 alternates.
- Initiating basis: `System`. `dispatchTaskCopy` calls `planActivation` (the peer call) before `linkNewTaskExecution` (`root-task-dispatch.ts:45-53`).
- Refusals after planning and their reachability:
  - B's own refusals come before any run exists, so nothing is left anywhere (AC-104 holds literally).
  - `node` with `task_id` or `reference_files` is refused in `RemoteDelegation.delegationPlacement`, before planning.
  - A closed Task at link time needs the delegator's Task to close between planning and linking. A task agent's closed Task stops the agent (CM-6), so this is a race, not a workflow: `Technically Possible but Unsupported/Contrived`.
  - A transport failure on the answer to `startDelegatedRun` is the accepted RSK-106 case.
- Consequence when it happens: a prepared, never-activated run on B with a history row (`recordPreparedRun`), removed after 24 h by `cleanupStalePreparedRuns`. Nothing was activated, so "nothing is started" holds.
- Reachability: the race is `Not Reachable` as a supported scenario; the timeout case is accepted RSK-106 (FU-002).
- Review consequence: no finding; residual risk only.

The full round-1 records are in `ARCH-REV-001` of the revision record.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`. SR-017 closes the gap F-002 exposed: one consumer category, the package-state validators, was missing from the AR-001 walker table. The round-1 review that asked for that table missed it too; it inventoried walkers of `taskExecutions`, not consumers of the stored message view that cross-check endpoints against the index. The response stays inside the AR-001 ownership: the index stays local-only, the two validators take endpoints from the store-owned set `agentRunIdsOfTree` (the same set that composes the stored view), they keep the distinct-endpoints check, and they add "at least one endpoint is a local agent". The change is bounded to the two validators. I found no other consumer that asserts index membership of a stored message endpoint. Two non-blocking notes (N-15, N-16) and one pre-existing follow-up (FU-004). The design is ready for implementation.

## Findings

None blocking. AR-001 … AR-004 resolved in ARCH-REV-002; AR-005 … AR-007 resolved in ARCH-REV-004. Their round-3 wording is kept in `architecture-review-revision-record.md` (ARCH-REV-003).

- AR-005 (resolved): the root's message delivery governs each node's half. Outbound: `endpoint.allowsSender` → `engine.prepareRemoteSend` (no state change) → `RemoteRunLinks.deliver` (channel only) → `engine.commitSentToRemote` (sender's log, no Task re-check). Inbound: link check → wake → `acceptFromRemote`. No callback; one owner per spine per node in the inventory.
- AR-006 (resolved): `RemoteEndpoint` kinds `delegated_run` (delegator-only pair rule, chain `[{agentRunId}]`, existing-copy refusal, closure fence) and `delegator` (host-only pair rule, chain `[]`, `coordinatingRun` on transmit, the work packet). `RemoteRunLinks` keeps only membership and `deliver`. DS-001 moved to its own owner, `RemoteDelegation`.
- AR-007 (resolved): an explicit `fenced_remote` result at `releaseTaskExecutions`: no release is invoked, the text is truthful, and it is the S3 hook for "stop on the peer". It replaces N-9.

None blocking (round 7). SR-017 is accepted:
- The walker-table row "Package-state validation (admission scan, Team/Org state loaders): Include as message endpoints" is correct and bounded.
- The single-reader rule is restated: `RemoteRunLinks` is the only reader of `remoteTaskExecutions` outside the store, and `agentRunIdsOfTree` is the one owner of the message-endpoint set. This is the right owner: the validators must accept exactly what the store composes.
- The extended guard test per root kind (a stored delegator ↔ remote message passing admission and restore) covers the F-002 path.

### Round-7 notes (non-blocking)

- N-15, local data unchanged (AC-112 / QR-105): for a tree without remote links, `agentRunIdsOfTree` must equal the index's agent set, so validation of every existing local package is unchanged. Add that equality to the guard test per root kind (a tree with configured members, a task Agent and a task Team), so a later divergence between the index and the set cannot silently widen or narrow admission.
- N-16, name the rule for message consumers in the walker table: consumers of the stored message view take endpoints from `agentRunIdsOfTree`, never from the index. Record the current exclusion as its own row too: `public-message-scope.ts` keeps remote-endpoint messages out of the root view stream (CR-001, S3). S3's run tree then has an explicit rule to follow.
- FU-004 (follow-up, pre-existing, outside this ticket): the released migration `agent-org-history-first-message-summary-v1` imports the current `validateAgentOrgStatePackage` instead of a released copy (the other migrations use copies under `app-data-migrations/legacy/…`). SR-017's change is safe for it: it runs over pre-remote data, and `remoteLinks` reads `?? []`. Still, a migration that depends on current validation code changes whenever that code changes (principle 5: historical-schema knowledge stays in the migration).

Resolved in ARCH-REV-006:
- AR-008 (resolved): `RemoteMessageSend` (`remote-message-send.ts`, one per root, built with the root's engine and links) owns pair rule → `prepareRemoteSend` → `deliver` → `commitSentToRemote` and its refusals. Each root keeps one routing line. Inbound stays per root only for the wake, using the shared `inboundEndpoint` and `acceptFromRemote`. The existing-copy refusal is checked once in `RootTaskExecutionLifecycle.assignToExistingCopy`, after `resolveAssignment` (a read) and before `resolveExistingCopy` or any Task change, through `RemoteEndpointLookup.isRemoteEndpoint`. Tests: shared sequence, shared refusal, routing per root kind.
- AR-009 (resolved): the DS-002/DS-003/DS-005 narratives, § Spine Actors and the ownership map are aligned. Remote planning is stated once (root adapters delegate to `RemoteDelegation`, the only caller of `startDelegatedRun`).

### Text corrections (non-blocking)

- N-14:
  - The ownership map's `RemoteDelegation` bullet ends "`RootTaskExecutionLifecycle` and `dispatchTaskCopy` are unchanged". Since AR-008 the lifecycle gains the existing-copy refusal, so say "`dispatchTaskCopy` is unchanged".
  - The DS-001 spine narrative still says "runs the same serialized activation … The remote activation asks B to create the run". Since SR-014, B is asked in `planActivation`, before the Task link and outside the root's queue; the activation only commits the link and sends the packet.

The round-5 text of AR-008 and AR-009 follows, kept for traceability.

### AR-008 (resolved) — The remote coordination is written once per root kind instead of having one owner

- Type: Design Impact
- Severity: Medium (blocking)
- Protects: REQ-106, REQ-108, REQ-110 / AC-108 (the same refusal and recording rules in every root); preserved behavior AC-112 (no drift between root kinds); design principle 13 (one owner for coordination that repeats across callers) and principle 4 (reuse a shared capability)
- Scope status: Within Approved Scope (user direction 2026-10-20)
- Changes approved behavior: No
- Evidence:
  - § Remote Messaging gives the outbound order (pair rule → `prepareRemoteSend` → `deliver` → `commitSentToRemote`) as "the same shape in the three roots" (`StandaloneRootMessageDelivery`, `TeamRunMessageDelivery`, the Org run's delivery). No step of it depends on the root kind.
  - The walker table puts the existing-copy refusal in "each root's `assignToExistingCopy`", although the existing-copy resolution is shared in `RootTaskExecutionLifecycle.assignToExistingCopy` (`root-task-execution-lifecycle.ts:159-170`: `resolveExistingCopy(this.adapter, input.copy)`).
  - The same policy written three times is the drift risk this feature will meet as S2 (attachments in `prepareRemoteSend`), S3 and S4 add rules.
- Required update: give the repeated remote coordination one owner in `agent-collaboration/execution/remote/`, as the roots already share `RootCommunicationEngine` and `RootTaskExecutionLifecycle`.
  - **Outbound:** a shared `RemoteMessageSend` (or a `RemoteRunLinks` method; name it after the concern), one per root, built with the root's engine and links. It runs pair rule → `prepareRemoteSend` → `deliver` → `commitSentToRemote` once. The root's message delivery stays the governing owner of *routing*: it decides "remote endpoint, not local" and calls it.

    ```ts
    // root delivery, exact run-ID path (the same line in the three roots, no sequence of its own)
    const endpoint = this.remoteRunLinks.endpointFor(targetAgentRunId);
    if (endpoint) return this.remoteSend.send({ sender, endpoint, content, messageType, referenceFiles });
    ```

  - **Inbound:** keep it in each root, because its middle step (the wake: `withLiveLease` for a hosted agent, `host.ensureReady()` for a standalone host) is root-specific. Use the shared core's `inboundEndpoint` and the engine's `acceptFromRemote`, and do not copy the checks.
  - **Existing-copy refusal:** once, in `RootTaskExecutionLifecycle.assignToExistingCopy`, before `resolveExistingCopy`, through the root's `RemoteRunLinks` (the lifecycle gains a narrow "is this a remote endpoint" port). Not in each root.
  - Update the spine inventory and DS-002/DS-003. The outbound half is governed by the root's routing plus the shared send owner, with one owner of the sequence. Also update the ownership map, the walker table rows, the file mapping, the example and the guard tests (one shared test for the sequence, one routing test per root kind).
- Why proportionate: it moves code that is already planned into one place; no new behavior and no new layer that only forwards (the shared owner owns the sequence and its refusals).
- Recommended recipient: Solution Designer

### AR-009 (resolved) — The spec's summary sections contradict its authoritative sections

- Type: Design Impact
- Severity: Low (blocking)
- Protects: REQ-106 (the DS-002/DS-003 owners the code review checks against); design principle 14 (a spine-first, consistent design document)
- Scope status: Within Approved Scope
- Changes approved behavior: No
- Evidence (the former N-12 and N-13):
  - § Spine Narratives still names `RemoteRunLinks` as the owner of DS-002/DS-003 and has it apply the Task check and pair rule. Its DS-005 row lists only the switch and peer checks.
  - § Spine Actors omits the root's message delivery, `RemoteEndpoint` and `RemoteDelegation`.
  - The ownership map describes remote planning twice: `RemoteDelegation` "planning (`startDelegatedRun`)", and "each root adapter's `planActivation` … calls `startDelegatedRun`".
- Required update:
  - Align the three summary places with § Remote Messaging, § Contract Between Nodes and AR-008.
  - State once that each root adapter's `planActivation` / `beginActivation` delegates a remote placement to `RemoteDelegation`, the only caller of `startDelegatedRun`.
- Why proportionate: text only. Code review and later slices read these summaries first.
- Recommended recipient: Solution Designer

### Text corrections for the design spec (superseded by AR-009)

- N-12: § Spine Narratives still names `RemoteRunLinks` as the owner of DS-002/DS-003 and describes it applying the Task check and the pair rule. That contradicts the authoritative inventory and § Remote Messaging. The DS-005 narrative still lists only the switch and peer checks (the gateway order is in § Contract Between Nodes). § Spine Actors omits the root's message delivery, `RemoteEndpoint` and `RemoteDelegation`. Align these three places.
- N-13: the ownership map has two bullets for the same concern: "`RemoteDelegation` … planning (`startDelegatedRun`)" and "each root adapter's `planActivation` for a remote placement calls `startDelegatedRun`". State the relationship once: the root adapter's `planActivation` delegates a remote placement to `RemoteDelegation.planActivation`, the one caller of `startDelegatedRun`. The same holds for `beginActivation`.

### Implementation notes (non-blocking; for the implementation engineer)

Status in SR-015: N-6, N-7, N-8, N-10 and N-11 are now in the design; N-9 is replaced by AR-007.


- N-6, the work packet on B: § Remote Delivery In The Engine covers messages, not the `kind: "work_packet"` request. On B, `acceptRemoteMessage` for a work packet must:
  - apply the link check (the sender is `delegatedFrom.delegatorAgentRunId` from `delegatedFrom.nodeId`);
  - make the prepared host ready (`ensureReady`, which activates the prepared run);
  - post the system task notification built by the existing `task-execution-input.ts` builder, with the node in the header;
  - not write a message-log line (item 9).

  Keep that owner in the standalone root, not in the receiver.
- N-7, the compose shortcut: `composeTreeFile` / `composeTreeFileSync` return the raw tree unchanged when `listTaskAgentRunIds` finds no local task agents. A tree whose only link is remote must still be partitioned into `remoteTaskExecutions`, so the shortcut has to account for remote links (include it in the guard test).
- N-8, wake placement: today the wake or restore happens in the root's delivery *before* `engine.deliver` (`standalone-root-message-delivery.ts:226-239`: `withLiveLease` / `host.ensureReady`); `reserveRecipientInput` itself refuses a receiver that is not live. Wrap `acceptFromRemote` the same way in `acceptRemoteMessage`, rather than relying on reserve to wake.
- N-9, Task closure result: a fenced remote run is reported as `stopped` (`NO_AUTHORITY` counts as stopped), although it keeps running on B until idle (DEC-107). Make sure the text the agent or user sees for DONE/CANCELLED does not claim the remote run was stopped.
- N-10, B's `run_metadata.json` example: with the prepared-run path, the file is first written with `preparedAt` / `preparedExpiresAt` and no `startedAt`; activation adds `startedAt`. The metadata writer used at activation must keep `delegatedFrom` (add it to the round-trip test).
- N-11, ownership chain on B: the back-link endpoint has no Task on B. `RemoteRunLinks.ownershipChainFor` should give the Task check on B an empty or absent chain, so that a B-side Task lookup never refuses replies.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`), for the bounded validator change and the extended guard test; informational notice to the Solution Designer (N-15, N-16, FU-004).

## Residual Risks

- RSK-101 / RSK-103: accepted until S6. P-1 and P-3 confirm no new class of access, and mobile credentials are refused on `/rest/remote/*`.
- MP-004 / SR-014: a peer call that succeeded before a local refusal or a lost answer leaves a prepared run on B (listed in B's history until it expires after 24 h).
- RSK-106: timeout ambiguity (no retries). A delegation that times out leaves a prepared run on B, which is cleaned up after 24 h. A message the peer accepted but whose answer was lost stays out of the sender's log. Reliable delivery (outbox plus idempotent inbox) is recorded as follow-up FU-002.
- RSK-107: restoring a whole Team or Org root for a reply.
- RSK-108: writer exactness. The partition plus the split's keep-unloaded behavior and the round-trip tests per kind cover it.
- Linux Docker `host-gateway`: still to check in the E2E (P-2 covers macOS).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: classification `Large` / `High`. Design at commit `b9f630de6b` (SR-017). AR-001 … AR-009 are resolved, and the F-002 consumer category is added. N-15 and N-16 are non-blocking; FU-004 is recorded. Residual: MP-004, RSK-106 (FU-002), RSK-107.
