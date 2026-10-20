# Design Review Report — Remote Collaboration Slice 1: Remote Delegation, Text Only (autobyteus-191)

## Review Round Meta

- Upstream Requirements Doc: `…/requirements-doc.md` (Approved; SR-004, SR-005, SR-007; unchanged in SR-013)
- Upstream Investigation Notes: `…/investigation-notes.md` (SR-013; S-01 … S-15, A-01 … A-15, P-1 … P-5)
- Upstream Solution Revision Record: `…/solution-revision-record.md` (SR-001 … SR-013)
- Reviewed Design Spec: `…/design-spec.md` at commit `910f024ec561d28dd34e05abf17609b0babea638` (SR-013)
- Supplemental Task Artifacts Reviewed: `slice-plan.md`, `follow-ups.md`, contract draft `autobyteus-server-ts/docs/design/collaboration_model.md`, `handoff-architecture-review.md` § Round 2
- Relevant Solution Revision IDs: SR-011, SR-012, SR-013
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: the Solution Designer's round-2 revision (SR-013), answering ARCH-REV-001 (AR-001 … AR-004, N-1 … N-5)
- Prior Review Round Reviewed: round 1 (`ARCH-REV-001`, `Fail`)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: the round-1 code reading (still valid; SR-013 changed documents only), plus these round-2 checks:
  - `run-history/store/task-execution-tree-split.ts` (`splitTaskExecutions` keeps on-disk entries it did not load, in place; `composeTreeFile` / `agentRunIdsOfTree`);
  - `agent-collaboration/execution/task/root-task-execution-resource-scope.ts` (`releaseTaskExecutions`; `NO_AUTHORITY` counts as stopped);
  - `agent-execution/services/agent-run-provisioning-service.ts` (prepared-run TTL 24 h; `cleanupStalePreparedRuns` skips started runs);
  - `agent-execution/services/standalone-agent-run-eligibility.ts`;
  - `run-history/services/agent-run-history-catalog-service.ts:97` (how prepared runs are detected).

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
| DS-002 follow-up A→B | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass (AR-002 resolved) |
| DS-003 reply B→A | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass (AR-002 resolved) |
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
| `RemoteRunLinks` | Pass | Pass | Pass | Pass | The only reader of `remoteTaskExecutions` outside the store |
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

The full round-1 records are in `ARCH-REV-001` of the revision record.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`. The behavior basis is confirmed, and AR-001 … AR-004 and N-1 … N-5 are resolved in the current design spec and verified against the code. No in-scope machinery depends on an unsupported premise. The design is ready for implementation.

## Findings

None blocking. Earlier findings AR-001 … AR-004 are resolved (see `ARCH-REV-002`).

### Implementation notes (non-blocking; for the implementation engineer)

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

Implementation Engineer (`/software_engineering_team/implementation_engineer`); informational notice to the Solution Designer.

## Residual Risks

- RSK-101 / RSK-103: accepted until S6. P-1 and P-3 confirm no new class of access, and mobile credentials are refused on `/rest/remote/*`.
- RSK-106: timeout ambiguity (no retries). A delegation that times out leaves a prepared run on B, which is cleaned up after 24 h.
- RSK-107: restoring a whole Team or Org root for a reply.
- RSK-108: writer exactness. The partition plus the split's keep-unloaded behavior and the round-trip tests per kind cover it.
- Linux Docker `host-gateway`: still to check in the E2E (P-2 covers macOS).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: classification `Large` / `High`. Reviewed commit `910f024ec5` (SR-013). The next step is implementation, following the design's change sequence (contract and data model first; a standalone end-to-end run before the Team and Org roots).
