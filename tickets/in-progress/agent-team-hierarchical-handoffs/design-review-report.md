# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/design-spec.md`
- Supplemental Task Artifacts Reviewed: `agent-team-addressing-handoff-contract.md`; `agent-team-collaboration-system-instruction.md`; `team-run-canonical-identity-refactor.md`; `team-stream-execution-projection-contract.md`; `agent-segment-lifecycle-contract.md`; `nested-classroom-live-validation-contract.md`
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/solution-revision-record.md`
- Relevant Solution Revision IDs: cumulative `SR-001`–`SR-020`; current authority `SR-020`, preserving the complete SR-018 structure passed by `ARCH-REV-011` and the single lifecycle owner accepted by `ARCH-REV-012`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-013`
- Current Review Round: `13`
- Trigger: `solution_designer` requested a complete cumulative SR-020 re-review after `ARCH-REV-012` returned `DR-007` and `DR-008`; `CR-F-043` remains a later API/E2E-owned cleanup/evidence prerequisite.
- Prior Review Round Reviewed: `ARCH-REV-012` / cumulative SR-019 Fail (`DR-007`, `DR-008`)
- Latest Authoritative Round: `13`
- Current-State Evidence Basis: approved requirements and all six current supplements; current source at worktree HEAD `e29625f69d2b090ab1839baccdc595fdcac03eff`, based on `origin/personal` `54890a07f74e941a7a12b6daaa26364f4c927b72` (`85` ahead / `0` behind; merge-base equals `origin/personal`); `CRR-076`; API-F-024 evidence; direct reinspection of provider converters, `AgentRun`, its dispatch queue/pipeline/turn lifecycle/error evidence, the default file-change processor, Team/standalone/application/browser projections, memory/history, external-channel, compaction, and skill-improvement consumers; and SR-020's exhaustive consumer, file-operation, diagnostic, file-map, removal, sequence, and verification contracts. No implementation, durable-test, migration, provider, cleanup, or runtime result is inferred from SR-020.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status (`Confirmed`/`Contradicted`/`Blocked`): `Confirmed`. The approved behavior, current production basis, target ownership, and complete consumer/diagnostic cut are coherent and actionable.
- Approved requirements / intended behavior understood: Yes. The cumulative target remains one rooted TeamRun aggregate, canonical logical and concrete execution identities, shared recipient resolution, intrinsic collaboration behavior, exact Team/status/stream/frontend boundaries, proportionate released-data migration, a forward-only V5 application cut, and provider-neutral typed segment delivery.
- Relevant existing behavior and evidence confirmed: Yes. Current source and the observed AutoByteus Team failure establish start-owned type, untyped native content, the common serialized AgentRun boundary, strict Team admission, downstream browser behavior, and the current in-pipeline/listener consumers of segment events.
- Approved change, preserved behavior, and outside scope understood: Yes. SR-020 repairs lifecycle ownership and its complete consumer cut without changing addresses, task ownership, status ownership, migration/application decisions, provider substitution, external Agent packages, or API-owned cleanup responsibility. Existing text/reasoning/tool/file/shell/media presentation and supported downstream AgentRun consumers remain preserved.
- Remaining material ambiguity, if any: None.

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001`–`BEH-013` | Definition, addressing, handoff, providers, rooted runtime, task targeting | Pass | Pass | Pass | Confirmed | None. |
| `BEH-014` | Team event/status/WebSocket identity and delivery | Pass | Pass | Pass | Confirmed | None. SR-020 consumes the same correlated Team boundary. |
| `BEH-015` | Released Team/task/token/external conversion and startup gate | Pass | Pass | Pass | Confirmed | None. |
| `BEH-016` | V5 application/API/frontend contracts and concrete execution | Pass | Pass | Pass | Confirmed | None. |
| `BEH-017` | Storage-private physical lineage | Pass | Pass | Pass | Confirmed | None. |
| `BEH-018` | Imported three-runtime live validation | Pass | Pass | Pass | Confirmed | Downstream execution remains required after all gates. |
| `BEH-019` | Provider-neutral segment lifecycle and typed downstream presentation | Pass | Pass | Pass | Confirmed | None. SR-020 completes the canonical processor/listener fan-out and exact diagnostic branches without adding another lifecycle owner. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? (`Pass`/`Fail`) | Linked To Relevant Core Artifacts? (`Pass`/`Fail`) | Internally Complete? (`Pass`/`Fail`) | Consistent With Related Core Artifacts? (`Pass`/`Fail`) | Status And Approval Applicability Are Clear? (`Pass`/`Fail`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `agent-team-addressing-handoff-contract.md` | Pass | Pass | Pass | Pass | Pass | None. |
| `agent-team-collaboration-system-instruction.md` | Pass | Pass | Pass | Pass | Pass | None. |
| `team-run-canonical-identity-refactor.md` | Pass | Pass | Pass | Pass | Pass | None. |
| `team-stream-execution-projection-contract.md` | Pass | Pass | Pass | Pass | Pass | None. Its Team segment projection correctly starts after AgentRun admission. |
| `agent-segment-lifecycle-contract.md` | Pass | Pass | Pass | Pass | Pass | None. |
| `nested-classroom-live-validation-contract.md` | Pass | Pass | Pass | Pass | Pass | None; it remains downstream evidence authority. |

The investigation notes contain the canonical supplement inventory and link each supplement to the governing artifacts. The segment supplement is correctly positioned as structural design authority and is consistent with the Team-stream, identity, and live-validation supplements.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The task is classified as a comprehensive refactor; SR-019/SR-020 classify the segment defect and its closure as boundary/ownership, consumer-inventory, and boundary-shape work. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | CRR-076 and the real AutoByteus path prove that Team is too late and AgentRun is the first common serialized owner. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | One run-owned state is required now; CR-F-043 remains explicitly downstream-owned. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | DS-017A–G, the segment supplement's exhaustive matrix, file-operation bounded spine, four-variant error evidence, exact file map/removals, and verification seams make the bounded refactor actionable. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001`–`DS-006` | Rooted launch, child/restore, shared recipient, send/task | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-007`, `DS-014A`–`J` | Correlated event, command, initial/pre-run status | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-008`–`DS-013` | Storage, migration, handoff, live validation, V5, token transaction | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-015A`–`G`, `DS-016A`–`B` | Frontend lifecycle and application producer binding | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-017A`–`G` | Provider source -> AgentRun lifecycle -> complete canonical consumer and diagnostic fan-out | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

The central DS-017 owner is sound. DS-017F/G now stretches through the default pipeline, subject-specific file context, every affected processor/listener, strict Team/standalone wire, browser/application outcomes, and both non-terminal diagnostic branches.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Rooted TeamRun metadata/index and recipient resolver | Pass | Pass | Pass | Pass | Prior accepted ownership is preserved. |
| Team Agent binding/status/event/stream | Pass | Pass | Pass | Pass | Team remains a stateless canonical consumer. |
| Frontend `TeamExecutionState` | Pass | Pass | Pass | Pass | No segment lifecycle is moved into the Team aggregate. |
| Released-data migration/token store and V5 application boundary | Pass | Pass | Pass | Pass | SR-020 does not change these boundaries. |
| `AgentRun` segment lifecycle | Pass | Pass | Pass | Pass | One state behind the existing queue is the correct authority; SR-020 completes its handoff to every affected consumer. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Domain address/topology -> runtime/index | Pass | Pass | Pass | Pass | No route/local fallback. |
| Runtime/config -> binding/status -> exact Team wire | Pass | Pass | Pass | Pass | No fake event or generic egress. |
| Provider normalizer -> AgentRun segment lifecycle | Pass | Pass | Pass | Pass | Providers supply facts; they do not own correlation. |
| AgentRun canonical segment -> processors/listeners | Pass | Pass | Pass | Pass | Every affected consumer has an exact canonical-input rule; negative-selection coverage protects unaffected relays. |
| Canonical segment -> Team/standalone/application/browser | Pass | Pass | Pass | Pass | These named projections are stateless and exact. |
| Migration-only legacy -> current stores; V5 contracts -> exact loaders | Pass | Pass | Pass | Pass | Existing clean cuts remain sound. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `RecipientAddressExpression` / `ResolvedTeamRecipient` | Pass | Pass | Pass | Low | Pass |
| `TeamAgentExecutionBinding` / status/event/stream boundaries | Pass | Pass | Pass | Low | Pass |
| `TeamExecutionState` commands/queries/effects | Pass | Pass | Pass | Low | Pass |
| `AgentSegmentSourceEvent` / `CanonicalAgentSegmentEvent` | Pass | Pass | Pass | Low | Pass |
| `AgentSegmentLifecycleEventTransformer` failure result | Pass | Pass | Pass | Low | Pass |
| `FileChangeEventProcessor` canonical input seam | Pass | Pass | Pass | Low | Pass |
| Canonical migration transaction and V5 application admission | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider event ordering/correlation | Pass | Pass | Pass | Pass | Reuse AgentRun queue; add one run-owned bounded state. |
| Team/standalone/application/browser projection | Pass | Pass | N/A | Pass | Existing projection owners remain stateless. |
| File-change and remaining AgentRun event consumers | Pass | Pass | N/A | Pass | SR-020 inventories each consumer, preserves only subject-specific accumulation, and removes lifecycle/type/turn fallbacks. |
| Team/frontend/migration/application capabilities | Pass | Pass | Pass | Pass | Prior complete-review decisions remain valid. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution` segment lifecycle | Pass | Pass | Pass | Pass | Domain type, run-owned state, and first transformer are cohesive. |
| `agent-execution` event processors/listeners | Pass | Pass | Pass | Pass | Exact canonical consumption, terminal behavior, and release ownership are explicit. |
| Team event/streaming and frontend execution | Pass | Pass | Pass | Pass | SR-020 does not create a second lifecycle owner. |
| Migration/token/application/live-validation areas | Pass | Pass | Pass | Pass | Prior allocation remains coherent. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Canonical logical/execution addresses | Pass | Pass | Pass | Pass | Prior accepted design. |
| Team Agent execution binding/status and Team wire | Pass | Pass | Pass | Pass | Prior accepted design. |
| Finite `AgentSegmentType` and source/canonical event constructors | Pass | Pass | Pass | Pass | Server domain owns semantics; transport packages own exact mirrors only. |
| Run-owned segment lifecycle state | Pass | Pass | Pass | Pass | State is per run, not cached with the pipeline. |
| Segment diagnostic classification | Pass | Pass | Pass | Pass | The domain-owned four-variant `AgentRunErrorEvidence` distinguishes turn/runtime diagnostics from turn/runtime terminal failures. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentTeamAddress` / `TeamExecutionAddress` / rooted TeamRun v3 | Pass | Pass | Pass | Pass | Pass | Logical placement and concrete execution stay distinct. |
| Team event/status/frontend unions | Pass | Pass | Pass | Pass | Pass | No optional kitchen-sink identity structures. |
| Segment source vs canonical events | Pass | Pass | Pass | Pass | Pass | Start owns type; canonical content repeats it for independent consumers; end remains terminal-only. |
| Segment lifecycle diagnostic | Pass | Pass | Pass | Pass | Pass | Explicit-turn input yields `TURN_DIAGNOSTIC`; missing/empty-turn input yields `RUNTIME_DIAGNOSTIC` with null turn and no active-turn borrowing. |
| Application V5 and migration target structures | Pass | Pass | Pass | Pass | Pass | Unchanged and coherent. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-segment.ts` | Pass | Pass | Pass | Pass | Finite domain/source/canonical shapes. |
| `agent-segment-lifecycle-state.ts` / transformer | Pass | Pass | Pass | Pass | State owns ordering/replay; the transformer emits canonical events or one exact diagnostic variant. |
| `agent-run.ts` / queue / pipeline | Pass | Pass | Pass | Pass | One serialized state handoff is actionable. |
| Provider normalizers | Pass | Pass | Pass | Pass | Explicit starts and minimal later facts are well assigned. |
| `file-change-event-processor.ts` and other canonical consumers | Pass | Pass | Pass | Pass | The matrix and file map assign exact input, subject-specific state, cleanup, removals, and proof. |
| Team/standalone/application/browser segment files | Pass | Pass | Pass | Pass | Their stateless mapping/removal plan is explicit. |
| Prior Team/frontend/migration/application files | Pass | Pass | Pass | Pass | Complete prior allocations remain valid. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/domain/agent-segment.ts` | Pass | Pass | Low | Pass | Appropriate semantic owner. |
| `agent-execution/events/processors/segment-lifecycle/**` | Pass | Pass | Low | Pass | Bounded state/transformer placement is clear. |
| Existing provider and downstream consumer folders | Pass | Pass | Low | Pass | No new cross-layer package is needed; exact modifications are assigned within each owning subsystem. |
| Team contracts/frontend/migration/application files | Pass | Pass | Low | Pass | Prior placement remains sound. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Route/localization/synthetic task identity and generic Team/frontend paths | Pass | Pass | Pass | Pass | Existing exact allowlist/removal inventory remains authoritative. |
| Provider repeated content/end type and unknown-to-text defaults | Pass | Pass | Pass | Pass | Replaced by the common lifecycle. |
| Browser optional type/default/lookup-key paths | Pass | Pass | Pass | Pass | Exact turn+segment identity is clear. |
| Downstream AgentRun consumer fallbacks/type-on-end assumptions | Pass | Pass | Pass | Pass | Exact fallback/alias/end-text/type removal inventory is assigned to the affected files and verification scans. |
| Application compatibility and obsolete migration/token paths | Pass | Pass | Pass | Pass | Prior clean cut remains valid. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Current Team runtime/API/frontend | No | Pass | Pass | Migration-only historical forms remain isolated. |
| Released framework-owned persisted data | Yes, migration-local only | Pass | Pass | Six exact production migration paths; no runtime compatibility. |
| Application framework | No | Pass | Pass | Direct current V5 replacement. |
| Segment source/canonical lifecycle | No target compatibility path | Pass | Pass | Source/canonical distinction is exact and all superseded consumer fallbacks are removed in the same cut. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| TeamRun/history/task/communication/external files | Migration Required | Pass | Pass | Pass | Pass | Shared decoder, atomic replacement, idempotence, exact gate. |
| Token database | Migration Required | Pass | Pass | Pass | Pass | Plan-first, one verified row/schema/index transaction. |
| Memory/context physical files | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Physical lineage stays unchanged. |
| Derived indexes/caches | Discard or Rebuild | Pass | Pass | N/A | Pass | Derived from current authorities. |
| Application project databases | Discard or Rebuild | Pass | Pass | N/A | Pass | No predecessor application cohort. |
| Application bundles/artifacts | Direct Target Replacement — No Migration | Pass | Pass | N/A | Pass | Exact V5/current build and admission. |
| `AgentSegmentLifecycleState` | Not Persisted | Pass | Pass | N/A | Pass | Partial live segments are not restored; history receives canonical admitted events. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Rooted backend/migration/API/frontend/application cut | Pass | Pass | Pass | Pass |
| Team event/status/stream and task activation cut | Pass | Pass | Pass | Pass |
| Segment domain/state/provider cut | Pass | Pass | Pass | Pass |
| Segment processor/listener consumer cut | Pass | Pass | Pass | Pass |
| Segment failure/diagnostic cut | Pass | Pass | Pass | Pass |
| Live validation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Rooted identity, task execution, migration, status, frontend, V5 | Yes | Pass | Pass | Pass | Prior complete-review examples remain sufficient. |
| Segment start/content/end, replay, cleanup, late subscription | Yes | Pass | Pass | Pass | The state-machine cases are concrete. |
| File/write downstream derived-event path | Yes | Pass | Pass | Pass | The first-start/content/tool-enrichment/content/end/cleanup example preserves structural identity, accumulation, and status. |
| Malformed segment without turn | Yes | Pass | Pass | Pass | The example projects runtime diagnostic with null turn and proves non-terminal behavior across both transports and consumers. |
| Three-runtime live validation | Yes | Pass | Pass | Pass | Actual provider facts and no fabricated content type are explicit. |

## Material Premise Validation (Only When Needed)

### `MP-001` — A supported predecessor application bundle/database must survive the V5 cut

- Related approved requirement or established contract: User's governing forward-only application clarification; `R-043`, `AC-033`, `AC-035`.
- Relevant behavior ID(s): `BEH-016`, `UC-019`, `UC-020`.
- Initiating basis kind: `Contract`.
- Independent product-supported initiating trigger or applicable governing contract: Only current project artifacts and freshly created/reset application databases are supported.
- Support evidence: Corrected UC-019, cumulative SR-018–SR-020, and DS-012.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: project build/test -> V5 artifacts/fresh DB -> exact parser/loader -> application execution.
- Lifecycle preconditions and material consequence at the claimed point: Old application input is unsupported; compatibility machinery would add ungrounded complexity.
- Reachability: `Not Reachable`.
- Review consequence / proportionate response: Correctly excluded; SR-020 does not reopen it.

### `MP-002` — A supported historical TeamRun can carry display names that differ from structural routes

- Related approved requirement or established contract: `BEH-015`, `R-041`, `AC-031`, `AC-037`.
- Relevant behavior ID(s): `BEH-015`, `UC-019`.
- Initiating basis kind: `Operational` plus `Contract`.
- Independent product-supported initiating trigger or applicable governing contract: Operator upgrades a supported pre-v3 TeamRun store.
- Support evidence: Historical writer/types, maintained display/route-divergent fixture, and prior CRR-022 evidence.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: pre-v3 write -> upgrade/start -> stable prerequisite/canonical migration -> strict v3 runtime.
- Lifecycle preconditions and material consequence at the claimed point: Display differs while route/path agree; treating display as structure blocks valid upgrade.
- Reachability: `Reachable`.
- Review consequence / proportionate response: Addressed by the migration-only decoder and structural derivation.

### `MP-003` — A supported upgrade can have a terminal prerequisite record before canonical migration

- Related approved requirement or established contract: `BEH-015`, `R-042`, `AC-031`, `AC-037`.
- Relevant behavior ID(s): `BEH-015`, `UC-019`.
- Initiating basis kind: `Operational`.
- Independent product-supported initiating trigger or applicable governing contract: Operator runs a predecessor startup and later upgrades the same data directory.
- Support evidence: Runner terminal semantics, stable predecessor ID, and prior read-only operational evidence.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: terminal `20260517...` -> target startup -> pending `20260801...` handles predecessor/residual input -> exact gate.
- Lifecycle preconditions and material consequence at the claimed point: Stable terminal records do not rerun; final conversion needs an independently pending owner.
- Reachability: `Reachable`.
- Review consequence / proportionate response: Addressed without record reset, third ID, or runtime fallback.

### `MP-004` — Terminal historical token status can coexist with predecessor token rows

- Related approved requirement or established contract: `BEH-014`, `BEH-015`, `R-036`, `R-041`, `R-042`, `AC-032`, `AC-037`.
- Relevant behavior ID(s): `BEH-014`, `BEH-015`, `UC-019`.
- Initiating basis kind: `Operational`.
- Independent product-supported initiating trigger or applicable governing contract: Operator starts the supported predecessor and later upgrades the same data directory.
- Support evidence: Historical ID semantics, predecessor writer/strict reader, and prior read-only row/record evidence.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: old converter terminal -> pending canonical owner -> Team/task conversion -> strict token plan/transaction -> exact gate.
- Lifecycle preconditions and material consequence at the claimed point: Revised code under the historical ID cannot be assumed to rerun.
- Reachability: `Reachable`.
- Review consequence / proportionate response: Addressed under `20260801...` with no new ID or second gate.

### `MP-005` — Required token conversion must not expose a partially committed database

- Related approved requirement or established contract: `R-041`, `AC-032`, `AC-037`, all-or-nothing migration contract.
- Relevant behavior ID(s): `BEH-015`, `UC-019`.
- Initiating basis kind: `Contract`.
- Independent product-supported initiating trigger or applicable governing contract: Approved upgrade/start over multiple framework-owned token rows.
- Support evidence: Current independent-write interface, prior forced-failure proof, and the material row cohort.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: startup -> complete plan -> one row/schema/index transaction -> verify -> commit or rollback -> exact gate.
- Lifecycle preconditions and material consequence at the claimed point: Multiple rows and schema operations must change together.
- Reachability: `Reachable`.
- Review consequence / proportionate response: Addressed by one store-owned transaction and exact-current retry.

### `MP-006` — A Team WebSocket connection emits current Agent status snapshots outside TeamRunEvent

- Related approved requirement or established contract: `R-036`, `R-049`, `R-051`, `R-052`, `AC-045`–`AC-048`.
- Relevant behavior ID(s): `BEH-014`, `BEH-016`, `UC-021`, `UC-024`, `UC-025`.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger or applicable governing contract: A user launches/opens/restores a TeamRun in the Team workspace, establishing `/ws/agent-team`.
- Support evidence: Current handler/snapshot service/domain/manager path independently inspected in ARCH-REV-010/011.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Team workspace -> bound Team WebSocket -> `CONNECTED` -> status enumeration -> shared binding/status snapshot -> direct exact status projector/serializer/parser -> AgentContext status -> root lifecycle.
- Lifecycle preconditions and material consequence at the claimed point: Persistent, task-Agent, and task-Team-Agent status must retain exact execution identity; a task-Team Agent needs its genuine AgentRun ID once.
- Reachability: `Reachable`.
- Review consequence / proportionate response: Addressed by the accepted SR-018 status boundary, unchanged in SR-020.

### `MP-007` — A supported send/task start publishes status before an AgentRun event exists

- Related approved requirement or established contract: `R-049`, `R-052`, `AC-045`; preserved send/task feedback and activation ordering.
- Relevant behavior ID(s): `BEH-014`, `UC-021`, `UC-024`.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger or applicable governing contract: A Team user or Team Agent sends/delegates work to an unmaterialized Agent execution.
- Support evidence: Current mixed handle, overlay store, command-start builder, and activation path inspected in ARCH-REV-010/011.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: send/delegate -> handle-owned binding -> details-only overlay -> correlated status event -> activation barrier where applicable -> shared projector/serializer/parser -> AgentContext; matching live status replaces the overlay.
- Lifecycle preconditions and material consequence at the claimed point: Exact initializing/error status must be visible before a real Agent event, while same-address task executions remain distinct.
- Reachability: `Reachable`.
- Review consequence / proportionate response: Addressed by the accepted SR-018 status boundary, unchanged in SR-020.

### `MP-008` — A supported write-file segment crosses the changed canonical boundary before file-change derivation

- Related approved requirement or established contract: `BEH-019` preserved file presentation; `R-043`, `R-053`–`R-055`, `AC-049`, `AC-050`.
- Relevant behavior ID(s): `BEH-019`, `UC-028`.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger or applicable governing contract: A user asks a supported standalone or Team Agent to create/edit a file and the provider emits the established write-file segment lifecycle.
- Support evidence: Current default pipeline places `FileChangeEventProcessor` after transformers; its start/content/end handlers read `segment_type`, and end uses it before the invocation-context lookup. The target canonical end deliberately carries no type.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Agent UI/Team UI prompt -> provider write-file start/content/end -> AgentRun queue -> first segment transformer -> `FileChangeEventProcessor` -> derived `FILE_CHANGE` -> standalone/Team stream -> browser file presentation.
- Lifecycle preconditions and material consequence at the claimed point: Under the written target, end reaches the processor without type; the processor cannot select `write_file`, so its terminal/pending derived update is omitted. A repeated active start can also reset existing invocation accumulation unless explicitly mapped idempotently.
- Reachability: `Reachable`.
- Review consequence / proportionate response: Resolved by SR-020's exhaustive affected-consumer matrix, exact file-operation context lifecycle, source-fallback removals, negative-selection proof, and narrow queued run-release hook; no second lifecycle owner or restored end type is introduced.

### `MP-009` — Malformed segment input can lack the turn required by the prescribed diagnostic

- Related approved requirement or established contract: Strict untrusted-source admission in `R-053`, `R-054`, and `AC-049`.
- Relevant behavior ID(s): `BEH-019`, `UC-028`.
- Initiating basis kind: `Contract`.
- Independent product-supported initiating trigger or applicable governing contract: Every provider converter emits untrusted generic AgentRun segment candidates into the common strict parser; the approved admission contract explicitly includes malformed identity and requires an observable non-terminal diagnostic.
- Support evidence: The pre-SR-020 supplement declared a segment without a turn malformed, forbade manufacturing a turn, and simultaneously prescribed `error_scope:"turn"` plus an exact `turn_id`. Current source recognizes a turn diagnostic only when a turn ID exists; SR-020 adds the distinct target runtime-diagnostic variant.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: supported provider runtime -> converter candidate with segment event type but missing/empty `turn_id` -> AgentRun queue -> strict first transformer -> required failure projection -> lifecycle-status finalizer and Team/standalone error projection.
- Lifecycle preconditions and material consequence at the claimed point: Under SR-019, the transformer could not both avoid guessing and produce the required exact-turn diagnostic. SR-020 makes the admitted failure class implementable without borrowing an active turn.
- Reachability: `Reachable` by the governing strict-admission contract.
- Review consequence / proportionate response: Resolved by domain-owned `RUNTIME_DIAGNOSTIC`, required nullable Team/standalone evidence, visible non-terminal browser projection, and explicit no-effect rules for application/external/compaction/skill/lifecycle/command consumers.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` — SR-020 is ready for implementation. It preserves the accepted cumulative architecture, completes the canonical segment boundary through every affected processor/listener, and provides an exact identity-unattributable non-terminal diagnostic without guessing or adding a second lifecycle owner.

## Findings

None. Prior findings `DR-007` and `DR-008` are resolved in `ARCH-REV-013`.

## Classification

None.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Implementation must keep segment state per AgentRun, first in the queued pipeline, and absent from the cached pipeline, Team adapters, application projectors, and browser transport.
- Command acceptance, explicit turn facts, runtime snapshots, terminal batches, and accepted termination must update both run-owned lifecycle concerns in queue order without pre-clearing final content.
- Provider normalization must emit truthful explicit starts and minimal later facts for all seven values without unknown-to-text defaults or provider-specific Team logic.
- The broad cumulative source cut still requires full source review: rooted identity, Team event/status transport, task ordering, frontend aggregate, exact removals, migration/token transaction, V5 artifact cut, and provider protocol.
- `CR-F-043` remains a later API/E2E-owned cleanup/evidence correction before any new live run; architecture/implementation must not inspect or delete the residue.
- The imported three-runtime matrix, including actual untyped native content and no-skip evidence, remains mandatory downstream.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass` — `MP-002`–`MP-009` are supported by approved operational/user/contract paths and receive proportionate treatment; `MP-001` is `Not Reachable` and continues to drive no compatibility machinery.
- Notes: `ARCH-REV-013` is a complete cumulative SR-020 review, not a delta-only review. The rooted identity, shared recipient/provider protocol, exact Team status/event/wire boundary, task lifecycle, frontend execution aggregate, released-data transition, forward-only application cut, storage preservation, validation architecture, and single AgentRun segment owner are accepted. SR-020 resolves `DR-007` and `DR-008`; implementation and subsequent full source review must prove the atomic cut and removals.
