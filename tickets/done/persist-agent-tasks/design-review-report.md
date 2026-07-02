# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks/tickets/done/persist-agent-tasks/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks/tickets/done/persist-agent-tasks/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks/tickets/done/persist-agent-tasks/design-spec.md`
- Current Review Round: 3
- Trigger: Complete refresh re-review after additional user clarification on address-perspective task display and team-target `receiverAddress` semantics; user requested a fresh full review rather than a delta-only review.
- Prior Review Round Reviewed: 2
- Latest Authoritative Round: 3
- Current-State Evidence Basis: Re-read the current requirements, investigation notes, design spec, prior review report, and shared design principles. Rechecked the relevant current-code architecture patterns for task delegation lifecycle/activation/routing, Team Communication address persistence/readback, root memory layout, task-team child runtime scope, and frontend address-perspective/store/display patterns. This round reviewed the whole current package, not only the latest clarification delta.

Round rules:
- Reused prior finding IDs DR-001 and DR-002 for the same previously unresolved issues.
- No new findings were discovered in round 3.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial handoff from `solution_designer` | N/A | DR-001, DR-002 | Fail | No | Design was directionally sound but lacked active pre-activation state and root-scoped child task-team persistence identity. |
| 2 | Revised design after round-1 Fail / Design Impact | DR-001, DR-002 | None | Pass | No | Prior findings were resolved and the design was ready for implementation at that time. |
| 3 | Additional user clarification plus full refresh review request | DR-001, DR-002 | None | Pass | Yes | Current package remains coherent; address-perspective display and team-target inbox semantics are now explicit and consistent with the data model. |

## Reviewed Design Spec

The current design adds a task-delegation-owned durable records/read model while preserving `TaskDelegationService` as the active lifecycle owner. It separates active-only starting/binding state from durable `TaskDelegationRecord` records, roots task-team child persistence/id allocation/readback in `TaskDelegationPersistenceScope.rootTeamRunId`, and uses address-perspective frontend derivation: sent tasks match `senderAddress`, received tasks match `receiverAddress`, and live task-agent/task-team nodes only enrich matching persisted records.

The latest clarification is incorporated coherently: for `receiverTargetKind = "team"`, the persisted record preserves team accountability with that single task-specific field while `receiverAddress` stores the actual task-team ingress/coordinator inbox address under the task-team address chain. The design explicitly rejects separate durable `target`, `ingress`, `coordinator`, or duplicate receiver identity objects.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design identifies a feature plus behavior durability change. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design classifies Missing Invariant and Boundary Or Ownership Issue with evidence from the in-memory ledger, registry detach, active-only reference lookup, active-only frontend task list, activation event ordering, ledger id counter reset, and task-team child/root-scope mismatch. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design states refactor needed now and maps records service/store/normalizer, active entry model, persistence scope resolver, address builder, root id allocator, and frontend persisted-first derivation. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Spines, ownership map, active-state separation, root-scope rules, address-perspective display rules, removal/decommission plan, file mapping, and migration sequence all reflect the chosen refactor. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | DR-001 | Blocker | Resolved | Requirements/design define `ActiveTaskDelegationStartingEntry`, `ActiveTaskDelegationRecordEntry`, `TaskDelegationLedgerEntry`, and an explicit reserve/create/bind/start/activate/discard sequence. Durable `TaskDelegationRecord.status` excludes `not_started`; public failure `not_started` remains tool-result-only. | Resolution remains intact in round 3. |
| 1 | DR-002 | Major | Resolved | Requirements/design define `TaskDelegationPersistenceScope { rootTeamRunId, currentTeamRunId, teamRunPath }`, make task-team child delegations in scope, require one root records file, move task id reservation to `TaskDelegationRecordsService.reserveTaskId(scope)`, and require root-scoped addresses/hydration/reference fallback. | Resolution remains intact in round 3. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Delegate task creation/persistence/live event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Result submission/persistence/notification | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Review/persistence/settlement | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Root run hydration and focused-address UI display, including child task-team records | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Task reference preview with active-first root-persisted fallback | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Live task event refresh/enrichment | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 | Root records write queue | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-008 | Root-scoped task id reservation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend task delegation | Pass | Pass | Pass | Pass | Correct owner for active lifecycle, active entries, persistence scope, address building, task-owned durable records, and reference fallback. |
| Task-delegation records subfolder | Pass | Pass | Pass | Pass | Records store/normalizer/canonicalizer/service and root id allocator are appropriately task-owned. |
| Team Communication | Pass | Pass | Pass | Pass | Correctly reused as a pattern only; it does not own task data. |
| Backend GraphQL/REST | Pass | Pass | Pass | Pass | Transport remains thin behind records/reference services. |
| Frontend hydration/store/display | Pass | Pass | Pass | Pass | Persisted-record-first display with focused sender/receiver address matching and live enrichment is coherent. |
| Task-team child-run persistence scope | Pass | Pass | Pass | Pass | Explicit `TaskDelegationPersistenceScope` resolves root/current ambiguity. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Durable task record canonicalization | Pass | Pass | Pass | Pass | `records/task-delegation-record-canonicalizer.ts` is a clear task-owned boundary. |
| Active pre-activation entry shape | Pass | Pass | Pass | Pass | `task-delegation-active-entry.ts` resolves durable `not_started` leakage. |
| Root persistence scope | Pass | Pass | Pass | Pass | `task-delegation-persistence-scope.ts` prevents ad hoc local/root id guessing. |
| Root-scoped task id reservation | Pass | Pass | Pass | Pass | `records/task-delegation-task-id-allocator.ts` belongs under the durable records owner. |
| Address builder for task sender/member receiver/team inbox/taskRun/update addresses | Pass | Pass | Pass | Pass | Centralizing address construction controls team-target inbox semantics without duplicate identity objects. |
| Records JSON normalization | Pass | Pass | Pass | Pass | Normalizer protects readback/write cache. |
| Frontend task record normalization/store | Pass | Pass | Pass | Pass | Dedicated frontend task store is appropriate. |
| Task entry display mapping | Pass | Pass | Pass | Pass | Existing entry utility can remain if semantics become persisted-first and focused-address based. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TaskDelegationRecordsFile` | Pass | Pass | Pass | N/A | Pass | `teamRunId` is explicitly the root storage team run id. |
| Durable `TaskDelegationRecord` | Pass | Pass | Pass | Pass | Pass | Address-first durable shape is tight and omits runtime-only/duplicated fields. |
| `receiverTargetKind` + `receiverAddress` semantics | Pass | Pass | Pass | Pass | Pass | `receiverTargetKind` is the single task-specific accountable-target supplement; `receiverAddress` is actual receiver/inbox identity. No parallel receiver objects are allowed. |
| `TaskRunReference` | Pass | Pass | Pass | Pass | Pass | Compact address + startedAt is enough for durable readback. |
| `TaskUpdate` entries | Pass | Pass | Pass | Pass | Pass | Message-like submission/review entries fit the read model. |
| Active ledger starting/record entries | Pass | Pass | Pass | Pass | Pass | Starting entries are active-only; record entries embed durable records. |
| `TaskDelegationPersistenceScope` | Pass | Pass | Pass | Pass | Pass | Root/current/teamRunPath meanings are explicit. |
| Frontend `TeamTaskEntry` / active-entry replacement | Pass | Pass | Pass | Pass | Pass | Stable entry key with optional live node avoids active-only authority. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Activation event publication in coordinator | Pass | Pass | Pass | Pass | Service publishes only after persistence. |
| Private ledger clone-only implementation | Pass | Pass | Pass | Pass | Snapshot utility replacement is named. |
| Durable `not_started` record state | Pass | Pass | Pass | Pass | Starting entries replace pre-activation durable status and are discarded on failure. |
| Ledger-local task id counter as global authority | Pass | Pass | Pass | Pass | Root id allocator under records service replaces it. |
| Active-node-only frontend task authority | Pass | Pass | Pass | Pass | Persisted-record-first focused-address derivation replaces it. |
| Active-service-only reference lookup | Pass | Pass | Pass | Pass | Active-first/root-persisted fallback replaces it. |
| Child-local task records files | Pass | Pass | Pass | Pass | Explicitly rejected in favor of the root file. |
| Duplicate durable `target`/`ingress`/`coordinator`/receiver identity objects | Pass | Pass | Pass | Pass | Explicitly rejected; grouping/accountability derive from address segments and `receiverTargetKind`. |
| Legacy task-plan persistence/tools | Pass | Pass | Pass | Pass | Correctly rejected. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `task-delegation-active-entry.ts` | Pass | Pass | Pass | Pass | Active-only lifecycle/binding state has a clear owner. |
| `task-delegation-persistence-scope.ts` | Pass | Pass | Pass | Pass | Root/current scope resolver is focused. |
| `task-delegation-address-builder.ts` | Pass | Pass | Pass | Pass | Centralized root-scoped address construction is justified, especially for team-target ingress/coordinator receivers. |
| `task-delegation-record.ts` | Pass | Pass | Pass | Pass | Durable record/envelope model remains tight. |
| `records/task-delegation-task-id-allocator.ts` | Pass | Pass | Pass | Pass | Root id reservation belongs with durable records. |
| `records/task-delegation-records-service.ts` | Pass | Pass | Pass | Pass | Durable read/write/id owner is coherent. |
| `task-delegation-ledger.ts` | Pass | Pass | Pass | Pass | Active state/transition responsibility is explicit. |
| `task-delegation-service.ts` | Pass | Pass | Pass | Pass | Correct lifecycle side-effect ordering owner. |
| `task-delegation-reference-content-service.ts` | Pass | Pass | Pass | Pass | Correct route behavior owner. |
| GraphQL/frontend store/hydration/task display files | Pass | Pass | Pass | Pass | File mapping is actionable and boundary-aligned. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `TaskDelegationService` | Pass | Pass | Pass | Pass | May orchestrate ledger, activation, records, address builder, events, notifications, and settlement. |
| `TaskDelegationLedger` | Pass | Pass | Pass | Pass | Owns active entries only; no root id allocation or filesystem. |
| `TaskDelegationRecordsService` | Pass | Pass | Pass | Pass | Encapsulates store/normalizer/queue/root id allocator. |
| `TaskDelegationReferenceContentService` | Pass | Pass | Pass | Pass | Encapsulates active lookup and persisted fallback. |
| Frontend store/hydration/display | Pass | Pass | Pass | Pass | Components avoid reconstructing history from memberTree or GraphQL payloads directly. |
| Root memory-scope dependency | Pass | Pass | Pass | Pass | `TaskDelegationPersistenceScope` is required at write/id boundaries. |
| Endpoint identity model | Pass | Pass | Pass | Pass | Team Communication address utilities are reused; task design forbids parallel sender/receiver identity objects. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `TaskDelegationService` | Pass | Pass | Pass | Pass | Tool router remains a thin active-service locator. |
| `TaskDelegationRecordsService` | Pass | Pass | Pass | Pass | Store/normalizer/id allocator are not bypassed. |
| `TaskDelegationLedger` | Pass | Pass | Pass | Pass | Starting vs record entry transitions stay internal to service/ledger path. |
| `TaskDelegationReferenceContentService` | Pass | Pass | Pass | Pass | REST route stays thin. |
| `TaskDelegationStore`/entry derivation | Pass | Pass | Pass | Pass | UI uses persisted store plus focused-address derivation; live nodes are enrichment only. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `TaskDelegationRecordsService.reserveTaskId(scope)` | Pass | Pass | Pass | Low | Pass |
| `TaskDelegationRecordsService.persistRecord(scope, record)` | Pass | Pass | Pass | Low | Pass |
| `TaskDelegationRecordsService.getTaskDelegationRecords(rootTeamRunId)` | Pass | Pass | Pass | Low | Pass |
| `TaskDelegationRecordsService.resolveReference({ rootTeamRunId, taskId, referenceId })` | Pass | Pass | Pass | Low | Pass |
| `TaskDelegationLedger.createStartingEntry(...)` | Pass | Pass | Pass | Low | Pass |
| `TaskDelegationLedger.activateStartingEntry(taskId, taskRunReference, receiverAddress)` | Pass | Pass | Pass | Low | Pass |
| `TaskDelegationLedger.discardStartingEntry(taskId)` | Pass | Pass | Pass | Low | Pass |
| GraphQL `getTaskDelegationRecords(teamRunId)` | Pass | Pass | Pass | Low | Pass |
| Existing task tools | Pass | Pass | Pass | Low | Pass |
| `deriveTeamTaskEntries(teamContext, persistedRecords, focusedAddress)` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-team-execution/task-delegation/` | Pass | Pass | Low | Pass | Main capability owns active lifecycle and task-specific helpers. |
| `agent-team-execution/task-delegation/records/` | Pass | Pass | Low | Pass | Durable records/id allocation are off-spine concerns inside task delegation. |
| `api/graphql/types/task-delegation.ts` | Pass | Pass | Low | Pass | Thin transport resolver. |
| `autobyteus-web/stores/taskDelegationStore.ts` | Pass | Pass | Low | Pass | Frontend durable task record state owner. |
| `autobyteus-web/services/runHydration/taskDelegationHydrationService.ts` | Pass | Pass | Low | Pass | Good hydration boundary. |
| `autobyteus-web/utils/teamActiveTaskEntries.ts` | Pass | Pass | Medium | Pass | Existing path is acceptable if semantics/types stop being active-only and are address-perspective based. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Durable task records | Pass | Pass | Pass | Pass | Extend task delegation, not Team Communication. |
| Atomic JSON persistence | Pass | Pass | Pass | Pass | Reuse Team Communication pattern only. |
| Address-first sender/receiver identity | Pass | Pass | N/A | Pass | Reuse `ConversationTargetAddress` contract and address-key matching. |
| Team memory layout | Pass | Pass | N/A | Pass | Root storage uses `AgentMemoryLayout` with `rootTeamRunId`. |
| GraphQL readback | Pass | Pass | Pass | Pass | Pattern reuse is sound. |
| Reference content route | Pass | Pass | N/A | Pass | Existing route identity is extended through service fallback. |
| Frontend task display | Pass | Pass | Pass | Pass | Persisted-first focused-address derivation is correct. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Legacy task plans | No | Pass | Pass | Correctly rejected. |
| Active-node-only UI as durable mechanism | No | Pass | Pass | Live nodes remain enrichment only. |
| Public tool-result persistence | No | Pass | Pass | Persistence uses internal records, not concise tool DTOs. |
| Failed activation visible persistence | No | Pass | Pass | Starting entries are discarded; no durable `not_started` rows. |
| Child-local records files | No | Pass | Pass | Root file is the only durable records file. |
| Duplicate receiver/target compatibility shape | No | Pass | Pass | Explicitly rejected in favor of address segments plus `receiverTargetKind`. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Backend records service/store/normalizer/canonicalizer | Pass | Pass | Pass | Pass |
| Active starting/record entry refactor | Pass | Pass | Pass | Pass |
| Root persistence scope/address builder | Pass | Pass | Pass | Pass |
| Root task id allocator | Pass | Pass | Pass | Pass |
| Lifecycle persistence before events/notification/settlement | Pass | Pass | Pass | Pass |
| Reference fallback | Pass | Pass | Pass | Pass |
| Frontend persisted-first focused-address task entries | Pass | Pass | Pass | Pass |
| Team-target receiver inbox semantics | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Durable task JSON | Yes | Pass | N/A | Pass | Concrete shape is clear. |
| Team-target receiver inbox address | Yes | Pass | Pass | Pass | Example shows logical team segment -> `task_team` segment -> coordinator/member segment and forbids duplicate receiver objects. |
| Submit/review ordering | Yes | Pass | Pass | Pass | Good/bad examples clarify authority. |
| UI persisted-first entries | Yes | Pass | Pass | Pass | Clear. |
| Focused sender/receiver perspective | Yes | Pass | N/A | Pass | Design states exact sender/receiver address matching and live enrichment only. |
| Reference fallback | Yes | Pass | Pass | Pass | Clear. |
| Root task id allocation | Yes | Pass | Pass | Pass | Clarifies root/child collision handling. |
| Failed activation/starting entry | Yes | Pass | Pass | Pass | Resolves prior DR-001. |
| Child task-team root storage/addressing | Yes | Pass | Pass | Pass | Resolves prior DR-002. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None blocking | N/A | N/A | Closed |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

N/A — passed. Prior round Design Impact findings DR-001 and DR-002 are resolved and remain resolved under the refreshed design.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Records write failure after lifecycle mutation remains intentionally non-rollbacking; implementation must log structured warnings and preserve public tool DTOs while testing the normal durability path.
- Persisted `active`/`awaiting_review` rows after restart are visible history, not active runtime authority; frontend copy and live enrichment must avoid implying liveness without live nodes.
- Root-vs-child identity remains a key implementation hazard; write/id APIs must require `TaskDelegationPersistenceScope`, and tests should cover child task-team records written into the root file.
- Team-target received-task visibility depends on exact persisted `receiverAddress` matching the task-team ingress/coordinator inbox. Implementation should test coordinator-focused matching and avoid adding duplicate target/receiver objects; any broader stable-ancestor grouping should remain a derived UI concern, not a durable schema change.
- Existing `ActiveTasks` component/file names may remain only if user-facing copy and types stop treating active runtime nodes as the task authority.
- GraphQL address object reuse/export is an implementation detail, but the exposed contract must stay typed and address-first.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Design is ready for implementation. Send the current cumulative package to `implementation_engineer`; this round-3 review supersedes the prior pass package.
