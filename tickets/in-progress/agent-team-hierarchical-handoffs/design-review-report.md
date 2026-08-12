# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/design-spec.md`
- Supplemental Task Artifacts Reviewed: `agent-team-addressing-handoff-contract.md`; `agent-team-collaboration-system-instruction.md`; `team-run-canonical-identity-refactor.md`; `team-stream-execution-projection-contract.md`; `nested-classroom-live-validation-contract.md`
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/solution-revision-record.md`
- Relevant Solution Revision IDs: cumulative `SR-001`–`SR-018`; current authority `SR-018`, preserving all SR-017 boundaries accepted by ARCH-REV-010
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-011`
- Current Review Round: `11`
- Trigger: `solution_designer` requested a complete cumulative SR-018 review after correcting ARCH-REV-010 findings `DR-005` and `DR-006`.
- Prior Review Round Reviewed: `ARCH-REV-010` / cumulative SR-017 Fail, plus the triggering implementation/code/API-E2E/delivery record chain through `CRR-050`; pre-pause `API-REV-023` remains non-authoritative evidence only
- Latest Authoritative Round: `11`
- Current-State Evidence Basis: approved requirements/supplements and current source at worktree HEAD `307b13a98b65c8912f596fde7195c6534dd4479d`, refreshed from `origin/personal` `023f4f550b07f27dbf388d55234a10b8eae0e0c7` (`57` ahead / `0` behind; merge-base equals `origin/personal`); `CRR-050`; direct reinspection of current Team event, status snapshot, command overlay, task activation, WebSocket, frontend execution, migration, application, and task-record paths. No implementation, migration, provider, or runtime result is inferred from the solution package.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status (`Confirmed`/`Contradicted`/`Blocked`): `Confirmed`.
- Approved requirements / intended behavior understood: Yes. The cumulative approved target is one rooted TeamRun aggregate, canonical logical and concrete-execution addresses, shared message/task recipient resolution, intrinsic collaboration protocol, exact current contracts, one frontend concrete-execution owner, released-data migration, direct forward-only application V5 cut, and required three-runtime validation.
- Relevant existing behavior and evidence confirmed: Yes. Current source confirms the recursive Team execution paths, exact task/run identity, task activation ordering defect, generic Team event/wire and frontend state problems, direct initial Team status snapshot, pre-run command-status overlay, released-data migration lifecycle, and application admission/build boundaries reflected by the design.
- Approved change, preserved behavior, and outside scope understood: Yes. AgentOrg/dynamic topology, external Agent package edits, cross-TeamRun task ownership expansion, mixed-version runtime compatibility, application predecessor preservation, and physical memory-path relocation remain outside scope. Exact-run delivery, root coordinator entry, task lifecycle, current Team status behavior, and supported UI behavior remain preserved.
- Remaining material ambiguity, if any: None. UC-019 now separates released framework-owned migration subjects from discard/rebuild application state exactly as the user directed.

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001`–`BEH-013` | Definition, addressing, handoff, providers, rooted runtime, task targeting | Pass | Pass | Pass | Confirmed | None. |
| `BEH-014` | Team event/status/WebSocket identity and delivery | Pass | Pass | Pass | Confirmed | None. Live, initial non-event, and pre-run status share one binding/details/projector boundary. |
| `BEH-015` | Released Team/task/token/external conversion and startup gate | Pass | Pass | Pass | Confirmed | None. |
| `BEH-016` | V5 application/API/frontend contracts and concrete execution | Pass | Pass | Pass | Confirmed | None. Unsupported application predecessor state stays outside migration/compatibility. |
| `BEH-017` | Storage-private physical lineage | Pass | Pass | Pass | Confirmed | None. |
| `BEH-018` | Imported three-runtime live validation | Pass | Pass | Pass | Confirmed | Downstream execution remains required; a skipped/unavailable row cannot Pass. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? (`Pass`/`Fail`) | Linked To Relevant Core Artifacts? (`Pass`/`Fail`) | Internally Complete? (`Pass`/`Fail`) | Consistent With Related Core Artifacts? (`Pass`/`Fail`) | Status And Approval Applicability Are Clear? (`Pass`/`Fail`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `agent-team-addressing-handoff-contract.md` | Pass | Pass | Pass | Pass | Pass | None. |
| `agent-team-collaboration-system-instruction.md` | Pass | Pass | Pass | Pass | Pass | None. |
| `team-run-canonical-identity-refactor.md` | Pass | Pass | Pass | Pass | Pass | None. |
| `team-stream-execution-projection-contract.md` | Pass | Pass | Pass | Pass | Pass | None. Eighteen case spines now include initial and pre-run status paths. |
| `nested-classroom-live-validation-contract.md` | Pass | Pass | Pass | Pass | Pass | None. |

The investigation notes retain the canonical supplement inventory; each supplement is linked from its governing core artifacts, and its scope/status/approval applicability is explicit.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | `design-spec.md` identifies a comprehensive refactor with preserved behavior and required transition work. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Parallel identity, uncorrelated transport, mixed frontend state, migration ownership, and unsupported compatibility pressure are grounded in source/CRR evidence. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Rooted identity, stream, frontend, task activation, token transaction, and current application contracts are in scope; AgentOrg and unsupported predecessor application behavior are excluded. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | DS-001–DS-016, DS-014A–J, file maps, removal inventory, sequence, examples, and verification seams make the response actionable and proportionate. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001`–`DS-003` | compile, persistent child, restore | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-004`–`DS-006` | shared recipient, separate send/task execution | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-007`, `DS-014A`–`J` | event, command, initial status, pre-run status round trip | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-008`–`DS-010` | storage, migration, handoff completion | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-011` | three-runtime validation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-012A`–`D` | forward-only V5 application cut | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-013A`–`D` | token canonical transaction | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-015A`–`G` | frontend draft/topology/execution lifecycle | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-016A`–`B` | application producer binding | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

DS-014I truthfully models connection/open/restore status as a non-event snapshot while sharing the live status projector. DS-014J models pre-run status as the real correlated event it is and preserves the task activation barrier.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Rooted TeamRun metadata/index | Pass | Pass | Pass | Pass | One persisted tree and derived private index. |
| Shared Team recipient resolver | Pass | Pass | Pass | Pass | One operation-neutral placement result; send/task lifecycles remain separate. |
| Team Agent binding/status/event/stream | Pass | Pass | Pass | Pass | One domain binding/status value; event and non-event callers share one exact projector/serializer. |
| Frontend `TeamExecutionState` | Pass | Pass | Pass | Pass | Private graph/index/transitions, typed effects/views, and AgentContext status ownership. |
| Released-data migration/token store | Pass | Pass | Pass | Pass | Historical knowledge is migration-local; one token transaction and one exact gate. |
| Application V5 current-contract boundary | Pass | Pass | Pass | Pass | Ordinary strict current parsers/loaders only; no predecessor compatibility owner. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Domain address/topology -> runtime/index | Pass | Pass | Pass | Pass | No route/localization fallback. |
| Runtime/config owner -> binding/status -> event or direct status projector -> exact wire | Pass | Pass | Pass | Pass | No fake event, second parser, generic Team egress, or consumer classification. |
| Frontend topology -> execution aggregate -> typed UI views | Pass | Pass | Pass | Pass | No public raw map/key parser or topology mutation. |
| Migration-only legacy modules -> current stores | Pass | Pass | Pass | Pass | Exact six-path released-data allowlist; no runtime legacy import. |
| Application contracts -> SDK/build/parser/loader | Pass | Pass | Pass | Pass | No migration/compatibility dependency. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `RecipientAddressExpression` / `ResolvedTeamRecipient` | Pass | Pass | Pass | Low | Pass |
| `createTeamAgentExecutionBinding` | Pass | Pass | Pass | Low | Pass |
| `TeamAgentStatusSnapshot` / `createTeamAgentStatusEvent` | Pass | Pass | Pass | Low | Pass |
| `projectTeamAgentStatusMessage` | Pass | Pass | Pass | Low | Pass |
| `TeamRunEvent` / Team stream unions | Pass | Pass | Pass | Low | Pass |
| `TeamExecutionState` commands/queries/effects | Pass | Pass | Pass | Low | Pass |
| `applyCanonicalTeamIdentityTransaction` | Pass | Pass | Pass | Low | Pass |
| V5 application semantic contracts/admission | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Definition graph/rooted run compilation | Pass | Pass | N/A | Pass | Extends established definition/execution ownership. |
| Collaboration tools/providers | Pass | Pass | N/A | Pass | One shared server-owned Team capability. |
| Team status/event streaming | Pass | Pass | Pass | Pass | Two small domain values and one transport contract replace multiple generic paths. |
| Frontend Team state | Pass | Pass | Pass | Pass | One aggregate replaces fragmented projection modules without absorbing network/navigation owners. |
| App-data migration/token persistence | Pass | Pass | Pass | Pass | Reuses runner/gate; one transaction owner is justified. |
| Application framework | Pass | Pass | N/A | Pass | Existing build and exact validation boundaries support the direct current cut. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration` / `agent-team-execution` | Pass | Pass | Pass | Pass | Address, topology, resolver, execution, binding, and status owners are coherent. |
| Team event/streaming | Pass | Pass | Pass | Pass | Domain event and non-event snapshot semantics stay distinct while projection is shared. |
| Frontend `teamExecution` capability | Pass | Pass | Pass | Pass | Aggregate/private support/typed views are bounded. |
| `app-data-migrations` / token store | Pass | Pass | Pass | Pass | Migration and transaction ownership are explicit. |
| Application SDK/build/admission | Pass | Pass | Pass | Pass | Forward-only target is proportionate. |
| API/E2E live harness | Pass | Pass | Pass | Pass | Public, isolated, redacted, no-skip matrix. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Canonical logical/execution addresses | Pass | Pass | Pass | Pass | One domain owner plus boundary DTO projection. |
| Team Agent execution binding/status | Pass | Pass | Pass | Pass | Live, initial, overlay, and history producers reuse the same invariant/value. |
| Team stream DTO/schema/serializer | Pass | Pass | Pass | Pass | Transport-only shared package. |
| Frontend topology/execution/task projection | Pass | Pass | Pass | Pass | Tight specialized variants and one aggregate-owned task projection. |
| TeamRun/token migration decoders/stores | Pass | Pass | Pass | Pass | Shared historical decoder and one store transaction. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentTeamAddress` / `TeamExecutionAddress` | Pass | Pass | Pass | Pass | Pass | Logical placement and concrete execution remain distinct. |
| Rooted TeamRun v3 aggregate | Pass | Pass | Pass | Pass | Pass | Typed Agent/AgentTeam nodes preserve genuine facts. |
| `TeamAgentExecutionBinding` / `TeamAgentStatusSnapshot` | Pass | Pass | Pass | Pass | Pass | Only task-Team Agent adds the genuine run ID not encoded by the address; status details carry no identity duplicates. |
| `TeamRunEvent` / wire union | Pass | Pass | Pass | Pass | Pass | Exact correlated variants; connection status remains a direct projection of the same domain value. |
| Frontend topology/execution unions | Pass | Pass | Pass | Pass | Pass | No optional kitchen-sink base or placeholder IDs. |
| Application V5 contracts | Pass | Pass | Pass | Pass | Pass | Independent semantic/envelope versions remain distinct. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `team-agent-execution-binding.ts` / `team-agent-status.ts` | Pass | Pass | Pass | Pass | Shared domain invariants, not forwarding helpers. |
| `team-agent-event.ts` / adapter / Team Agent projector | Pass | Pass | Pass | Pass | Exact event admission and shared status projection. |
| `TeamRuntimeSnapshotService`, status enumeration, handler | Pass | Pass | Pass | Pass | Direct exact non-event snapshot path and deterministic handshake order. |
| `MemberCommandStatusOverlayStore` | Pass | Pass | Pass | Pass | Details-only temporary owner; exact correlated construction and matching replacement. |
| Frontend `services/teamExecution/**` / `AgentTeamContext.ts` | Pass | Pass | Pass | Pass | One public aggregate boundary and private support. |
| Canonical migration/token files | Pass | Pass | Pass | Pass | Stable IDs, historical boundary, transaction, cleanup, and gate are explicit. |
| Application SDK/build/parser/loader files | Pass | Pass | Pass | Pass | Current-only atomic target; application migrator removed. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Domain address/topology/execution/status files | Pass | Pass | Low | Pass | Ownership-led placement. |
| `autobyteus-team-stream-contracts` | Pass | Pass | Low | Pass | Appropriate real process boundary. |
| Server Team streaming adapters | Pass | Pass | Low | Pass | Domain/wire conversion stays out of runtime owners. |
| Frontend `services/teamExecution` | Pass | Pass | Low | Pass | Cohesive capability with private support files. |
| Migration/application target files | Pass | Pass | Low | Pass | Historical and current boundaries are separated. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Route/localization/synthetic task identity | Pass | Pass | Pass | Pass | Exact allowlist and removal inventory are strong. |
| Generic Team events/egress, aliases, frontend raw maps | Pass | Pass | Pass | Pass | CR-F-028/029/030 target cleanup is explicit. |
| Legacy leaf status/generic initial mapper/generic command-start builder | Pass | Pass | Pass | Pass | Replaced by binding/status/projector owners and named in source scans. |
| Application database migrator/compatibility workflow | Pass | Pass | Pass | Pass | Deleted rather than adapted. |
| Obsolete token fields/indexes/migrations | Pass | Pass | Pass | Pass | One migration-store transaction owns contraction. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Current Team runtime/API/frontend | No | Pass | Pass | Legacy identity is limited to exact migration/rejection/history contexts. |
| Released framework-owned persisted data | Yes, migration-local only | Pass | Pass | Six exact production migration paths; no normal-reader compatibility. |
| Application framework | No | Pass | Pass | No supported predecessor cohort; direct current replacement is correct. |
| Team status streaming | No in target | Pass | Pass | Live/initial/pre-run paths share current domain and wire authorities. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| TeamRun/history/task/communication/external files | Migration Required | Pass | Pass | Pass | Pass | Shared decoder, atomic replacement, idempotence, exact gate. |
| Token database | Migration Required | Pass | Pass | Pass | Pass | Plan-first, one verified row/schema/index transaction, rollback/retry. |
| Memory/context physical files | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Physical lineage stays unchanged. |
| Derived indexes/caches | Discard or Rebuild | Pass | Pass | N/A | Pass | Derived from current authorities. |
| Application project databases | Discard or Rebuild | Pass | Pass | N/A | Pass | UC-019 and all supplements now agree. |
| Application bundles/artifacts | Direct Target Replacement — No Migration | Pass | Pass | N/A | Pass | Exact V5/current build and admission. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Rooted backend/migration/API cut | Pass | Pass | Pass | Pass |
| Team event/status/stream cut | Pass | Pass | Pass | Pass |
| Frontend execution aggregate cut | Pass | Pass | Pass | Pass |
| Task activation ordering | Pass | Pass | Pass | Pass |
| Application forward-only V5 cut | Pass | Pass | Pass | Pass |
| Live validation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Rooted logical/concrete addresses and nested execution | Yes | Pass | Pass | Pass | Placement and execution remain distinct. |
| TeamRun/token migration/retry | Yes | Pass | Pass | Pass | Fresh/terminal/failure/rollback cases are concrete. |
| Live/initial/pre-run status to browser | Yes | Pass | Pass | Pass | DS-014A/I/J cover event, non-event, overlay, and replacement paths. |
| Frontend draft/live/restore/focus/cleanup | Yes | Pass | Pass | Pass | DS-015 cases make ownership actionable. |
| Forward-only application V5 | Yes | Pass | Pass | Pass | Target and forbidden compatibility shapes are clear. |
| Three-runtime live validation | Yes | Pass | Pass | Pass | Fixture/model/evidence/cleanup matrix is explicit. |

## Material Premise Validation (Only When Needed)

### `MP-001` — A supported predecessor application bundle/database must survive the V5 cut

- Related approved requirement or established contract: User's explicit SR-017/SR-018 governing clarification; `R-043`, `AC-033`, `AC-035`.
- Relevant behavior ID(s): `BEH-016`, `UC-019`, `UC-020`.
- Initiating basis kind: `Contract`.
- Independent product-supported initiating trigger or applicable governing contract: The application framework is unused and has no supported predecessor cohort; only current project artifacts and freshly created/reset databases are supported.
- Support evidence: Corrected UC-019, AC-033, persisted-data table, SR-018, DS-012, and the user's direct clarification.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Project build/test setup -> current V5 artifacts/fresh database -> ordinary exact parser/loader -> application execution. No supported path introduces a predecessor database or old executable bundle.
- Lifecycle preconditions and material consequence at the claimed point: Old input would be unsupported. Retaining migration, quarantine, upgrade, or adapter machinery would add complexity without a product state.
- Reachability: `Not Reachable`.
- Review consequence / proportionate response: Correctly excluded. No compatibility machinery is designed, and UC-019 no longer contradicts this decision.

### `MP-002` — A supported historical TeamRun can carry display names that differ from structural routes

- Related approved requirement or established contract: `BEH-015`, `R-041`, `AC-031`, `AC-037`.
- Relevant behavior ID(s): `BEH-015`, `UC-019`.
- Initiating basis kind: `Operational` plus `Contract`.
- Independent product-supported initiating trigger or applicable governing contract: Operator upgrades a supported pre-v3 TeamRun store.
- Support evidence: Historical writer/types, maintained display/route-divergent fixture, and prior CRR-022 evidence.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Pre-v3 write -> upgrade/start -> stable prerequisite/canonical migration -> strict v3 runtime.
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
- Support evidence: Current handler/snapshot service/domain/manager path independently inspected in ARCH-REV-010.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Team workspace -> bound Team WebSocket -> `CONNECTED` -> status enumeration -> shared binding/status snapshot -> direct exact status projector/serializer/parser -> AgentContext status -> root lifecycle.
- Lifecycle preconditions and material consequence at the claimed point: Persistent, task-Agent, and task-Team-Agent status must retain exact execution identity; a task-Team Agent needs its genuine AgentRun ID once.
- Reachability: `Reachable`.
- Review consequence / proportionate response: Addressed by DS-014I, one domain binding/status value, direct shared projection, explicit removals, and real producer-to-consumer coverage. No fake event or generic egress is introduced.

### `MP-007` — A supported send/task start publishes status before an AgentRun event exists

- Related approved requirement or established contract: `R-049`, `R-052`, `AC-045`; preserved send/task feedback and activation ordering.
- Relevant behavior ID(s): `BEH-014`, `UC-021`, `UC-024`.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger or applicable governing contract: A Team user or Team Agent sends/delegates work to an unmaterialized Agent execution.
- Support evidence: Current mixed handle, overlay store, generic command-start builder, and activation path independently inspected in ARCH-REV-010.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: send/delegate -> handle-owned exact allocated binding -> details-only overlay -> correlated status event -> activation barrier when applicable -> shared projector/serializer/parser -> AgentContext; first matching live status replaces/clears the overlay.
- Lifecycle preconditions and material consequence at the claimed point: Exact initializing/error status must be visible before a real Agent event, while same-logical-address task executions remain distinct.
- Reachability: `Reachable`.
- Review consequence / proportionate response: Addressed by DS-014J, the shared constructor/snapshot, exact full-address key, correlated constructor, matching replacement rule, and real producer tests.

## Unresolved Approved-Behavior Or Current-State Gaps

`None.`

## Review Decision

`Pass` — the complete cumulative SR-018 solution is implementation-ready. DR-005 and DR-006 are resolved without reopening any accepted SR-017 boundary. This is design readiness only; the broad implementation, full cumulative source review, and fresh API/E2E evidence remain downstream work.

## Findings

`None.`

## Classification

`N/A` — no blocking Requirement Gap, Design Impact, or Unclear finding remains.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- The status cut must preserve one binding/status constructor path across persistent, task-Agent, task-Team-Agent, config-backed offline, initial, overlay, live, and history producers. Exact task-Team member AgentRun identity, status-hint derivation, and matching overlay replacement require focused source review.
- Task activation's bounded barrier, preparation-quiescent acknowledgement, durable-before-publication order, and failure settlement remain implementation-sensitive.
- Complete-root task reconciliation, equal-time conflict rejection, append-only omission handling, terminal descendant confirmation, and focus repair need executable evidence.
- The six-file released-data allowlist, TeamRun terminal-record chains, token row/schema/index transaction, exact startup gate, and physical memory-path preservation remain high-value migration checks.
- The direct V5 application replacement requires atomic source/generated/vendor/importable/fresh-database consistency and proof that the removed migration/compatibility paths stay absent.
- The frontend cut remains broad: every consumer must move from raw maps/keys and mixed topology/task nodes to typed topology/execution APIs before deletion.
- Provider intrinsic tools, exact instruction injection, minimal handoff output, send code preservation, and the three-runtime no-skip matrix remain downstream evidence obligations.
- Pre-pause `API-REV-023` is non-authoritative and must not substitute for post-implementation/code-review API/E2E execution.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass` — `MP-002`–`MP-007` are reachable and proportionately addressed; `MP-001` is `Not Reachable` and correctly drives no application compatibility machinery.
- Notes: `ARCH-REV-011` is a complete cumulative SR-018 review, not a delta-only review. `DR-005` and `DR-006` are resolved. `CR-F-028`, `CR-F-029`, and `CR-F-030` are now resolved at design level; source resolution is not claimed. The rooted identity, shared recipient/provider protocol, exact status/event/wire boundary, task lifecycle, frontend aggregate, released-data transition, application forward cut, storage preservation, cleanup, and live validation design is coherent and implementation-ready.
