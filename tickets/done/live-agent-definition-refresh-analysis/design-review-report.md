# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/requirements.md`
- Upstream Investigation Notes: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/investigation-notes.md`
- Reviewed Design Spec: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/design-spec.md`
- Supplemental Task Artifacts Reviewed: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/ui-ux-spec.md`
- Solution Revision Record Reviewed: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-005` (`SR-004` remains the sequential-flow/removal basis; `SR-003` remains the no-stopped-Reset basis)
- Architecture Review Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: 4
- Trigger: SR-005 rework after `CRR-006` finding `CR-F-003` proved that the integrated General Process and Application Engine use distinct run owners.
- Prior Review Round Reviewed: Round 3 / `ARCH-REV-003`
- Latest Authoritative Round: Round 4 / `ARCH-REV-004`
- Triggering Downstream Artifacts Reviewed: `implementation-handoff.md`, `implementation-revision-record.md`, `code-review-report.md`, `code-review-revision-record.md` (`CRR-006` / `CR-F-003`), `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`, `api-e2e-test-review-report.md`, `latest-base-integration-conflict-report.md`, `docs-sync-report.md`, `release-deployment-report.md`, `delivery-revision-record.md`, and `evidence/delivery/dr-001-integration-refresh.log`. These are historical integrated context, not proof that SR-005 is implemented.
- Current-State Evidence Basis: Integrated HEAD `c3b2466489e81d74930582f76016540480345020`, including advanced-base merge `7e3f4e97c3e58951daa21070e46cb8c71246197a`. Independent source reads confirmed separate General/Application manager and lifecycle instances; Application launch provenance and lookup publication; startup-gated recovery; supported post-start `reloadAndReenter` lookup rebuild; binding-store status semantics; terminal-status persistence before lookup removal; terminal-input rejection; current General-only Studio composition; and the four existing revision-free config operations.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status (`Confirmed`/`Contradicted`/`Blocked`): **Confirmed**
- Approved requirements / intended behavior understood: Yes. The browser path remains sequential: Stop completes, Settings performs a network-fresh read, the user edits and waits for Save, and only a later browser message restores the run. Multi-writer and hand-speed browser timing remain excluded.
- Relevant existing behavior and evidence confirmed: Yes. General and Application owners are intentionally distinct. External-channel restore reaches General lanes. Application input reaches Application-scoped services and is admitted only for a nonterminal binding. Existing Application provenance, lookup, startup recovery, and terminal transition provide the bounded owner signal SR-005 uses.
- Scope guardrail confirmed (`In-Scope Use Cases` / `Out of Scope` / `Preserved Behavior Boundary` / `Review Authority`): Yes. Owner-aware generic Studio Stop/message/archive/delete routing remains outside scope; no finding or mechanism depends on it.
- Approved change, preserved behavior, and outside scope understood: Yes. Only the two resume reads and two stopped-config updates gain owner-aware routing. General/Application managers remain separate; transport/UI vocabulary, fixed identities, persistence shapes, Team propagation/no Reset, and runtime adapters remain unchanged.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID (`Yes`/`No`): Yes; no blocking finding remains.
- Remaining material ambiguity, if any: None. `MP-SR4-005` remains `Unclear` and explicitly drives no requirement, machinery, or coverage.

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User / Contract | Pass | Pass | Pass | Confirmed | None. Definition and launch authoring stay separate. |
| BEH-002 | System | Pass | Pass | Pass | Confirmed | None. Eligible restore consumes persisted `llmConfig`. |
| BEH-003 | System / Operational | Pass | Pass | Pass | Confirmed | None. Active General state or a nonterminal Application lease keeps configuration locked. |
| BEH-004 | User | Pass | Pass | Pass | Confirmed | None. Settings entry owns the network-fresh Agent read. |
| BEH-005 | User | Pass | Pass | Pass | Confirmed | None. Team scope editing retains bounded propagation and no stopped Reset. |
| BEH-006 | Contract | Pass | Pass | Pass | Confirmed | None. Four narrow operations become owner-aware without a transport expansion. |
| BEH-007 | User / System | Pass | Pass | Pass | Confirmed | None. Schema safety and AutoByteus/Codex/Claude restore application are preserved. |
| BEH-008 | System / Operational | Pass | Pass | Pass | Confirmed | None. General restore is lane-ordered; Application input is excluded from eligible Save by the durable live lease. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? (`Pass`/`Fail`) | Linked To Relevant Core Artifacts? (`Pass`/`Fail`) | Internally Complete? (`Pass`/`Fail`) | Consistent With Related Core Artifacts? (`Pass`/`Fail`) | Status And Approval Applicability Are Clear? (`Pass`/`Fail`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `ui-ux-spec.md` | Pass | Pass | Pass | Pass | Pass | None. It reuses existing loading/locked/`RUN_ACTIVE` states, adds no ownership UX, and preserves the sequential flow and no-stopped-Reset rule. |

The investigation notes contain the canonical supplement inventory and link the supplement to the requirements and design. Downstream coverage/review/delivery artifacts are triggering context, not approved solution supplements or implementation evidence for SR-005.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Requirements, investigation, and design identify a feature/behavior change plus a narrow owner-boundary refactor against integrated HEAD. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | `CR-F-003` is traced to distinct instance-local owners over a shared persisted ID namespace, not browser concurrency or local validation code. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Add one Application-owned reader and one Studio use-case service; do not merge managers, add cross-owner lanes, or widen generic commands. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | DS-009, decision matrix, ownership/dependency/file maps, sequence, examples, and coverage all express the same bounded correction. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Agent Settings read and stopped Save | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Later General Agent restore | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Team Settings read, draft propagation, and stopped Save | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Later General Team restore | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Canonical return/event and uncertainty verification | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | General standalone transition lane | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 | General Team root transition lane | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-008 | Claude persisted-config application | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-009 | Application ownership lease and Studio guard | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

DS-009 spans canonical history, startup-ready Application ownership resolution, and the existing read/update outcomes far enough to expose the real cross-owner path. DS-006/007 remain bounded General lanes; they are not misrepresented as Application owners.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Application run ownership | Pass | Pass | Pass | Pass | `ApplicationRunOwnershipService` owns startup/lookup/binding classification; managers and stores are not exposed. |
| Studio model-config use case | Pass | Pass | Pass | Pass | `StudioRunModelConfigService` is the sole four-operation guard and delegates only after verified release. |
| General standalone update | Pass | Pass | Pass | Pass | Agent facade/lifecycle retains its per-run lane, validation, and persistence owner. |
| General root Team update | Pass | Pass | Pass | Pass | Team facade/manager retains root state, lane, validation, mutator, and tree persistence. |
| Browser draft and runtime adapters | Pass | Pass | Pass | Pass | UI owns drafts only; runtime adapters consume stored provider config only during restore/turn construction. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Config resolvers | Pass | Pass | Pass | Pass | Only the four config methods depend on the Studio service; no resolver imports Application stores/managers. |
| Studio model-config service | Pass | Pass | Pass | Pass | Depends on canonical read services, the read-only ownership port, and General update facades; no Application write path. |
| Application ownership service | Pass | Pass | Pass | Pass | Depends only on startup gate, global lookup, and binding store inside Application orchestration. |
| General Agent/Team owners | Pass | Pass | Pass | Pass | Preserve existing lifecycle/validation/persistence direction and perform final General active rechecks. |
| UI and provider adapters | Pass | Pass | Pass | Pass | No owner inference in the browser and no provider policy in generic lifecycle services. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `getAgentRunResumeConfig(runId)` | Pass | Pass | Pass | Low | Pass |
| `getTeamRunResumeConfig(teamRunId)` | Pass | Pass | Pass | Low | Pass |
| `updateStoppedAgentRunModelConfig({agentRunId,llmConfig})` | Pass | Pass | Pass | Low | Pass |
| `updateStoppedTeamRunModelConfigs({teamRunId,patches})` | Pass | Pass | Pass | Low | Pass |
| `ApplicationRunOwnershipReader.hasLiveRunOwnership({runId,applicationBinding?})` | Pass | Pass | Pass | Low | Pass |
| `StudioRunModelConfigService` four subject-specific methods | Pass | Pass | Pass | Low | Pass |

The boolean ownership port is intentionally narrow: `true` means verified nonterminal ownership, `false` means verified release, and inconsistent/unreadable evidence throws. It does not guess the subject or expose an Application manager/reference.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Application ownership evidence | Pass | Pass | Pass | Pass | Reuses provenance, lookup, binding status, startup gate, and terminal lifecycle behind one read service. |
| Studio cross-owner routing | Pass | Pass | Pass | Pass | Existing configured Studio composition is extended with one focused four-operation service. |
| General lifecycle ordering | Pass | Pass | N/A | Pass | Existing Agent/Team lanes remain authoritative for General/external-channel paths only. |
| Validation and persistence | Pass | Pass | N/A | Pass | Existing validator, catalog commit, tree mutator/store, and canonical reread are retained. |
| Runtime application | Pass | Pass | N/A | Pass | Existing AutoByteus/Codex paths and integrated Claude bridge remain provider-owned. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Application orchestration | Pass | Pass | Pass | Pass | Owns exact-ID live-binding classification, not config mutation. |
| Studio composition / existing-run config | Pass | Pass | Pass | Pass | Owns cross-owner use-case routing for four operations only. |
| Agent execution / Team execution | Pass | Pass | Pass | Pass | Continue to own General runtime state, lanes, and stopped updates. |
| Run history / LLM management | Pass | Pass | Pass | Pass | Canonical read/persistence and schema validation remain separate. |
| Web / provider adapters | Pass | Pass | Pass | Pass | Draft presentation and runtime-specific interpretation remain outside ownership routing. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Application ownership decision | Pass | Pass | Pass | Pass | Centralized in one Application service rather than duplicated across four resolvers. |
| Owner-aware config routing | Pass | Pass | Pass | Pass | Centralized in the Studio service rather than repeated Agent/Team guards. |
| Editability/outcome vocabulary | Pass | Pass | Pass | Pass | Existing tight run-history/API types are reused without ownership fields. |
| Team draft propagation / normalized schema | Pass | Pass | Pass | Pass | Existing pure planner and validator remain the correct shared owners. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Ownership-reader input | Pass | Pass | Pass | Pass | Exact ID plus optional canonical application/binding locator only. |
| Existing editability/outcome types | Pass | Pass | Pass | Pass | Live lease maps to existing active semantics; no parallel ownership result vocabulary. |
| Binding and lookup records | Pass | Pass | Pass | Pass | Existing current-schema records remain authoritative and are cross-checked, not copied into a new index. |
| Agent/Team config shapes | Pass | Pass | Pass | Pass | Subject-specific canonical payloads remain separate over a tight shared result core. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `application-run-ownership-service.ts` | Pass | Pass | Pass | Pass | Read-only startup/lookup/provenance/binding classification only. |
| `studio-run-model-config-service.ts` | Pass | Pass | Pass | Pass | Four-operation owner guard, locked result construction, and General delegation only. |
| Application runtime contracts/composition files | Pass | Pass | N/A | Pass | Expose the reader through host management; no REST/SDK or manager exposure. |
| Studio API composition and four resolver files | Pass | Pass | N/A | Pass | Construct/inject one service and change only four operation routes. |
| Existing General lifecycle/read/persistence files | Pass | Pass | N/A | Pass | Retain their current subject responsibilities; no Application branches. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `application-orchestration/services/application-run-ownership-service.ts` | Pass | Pass | Low | Pass | Binding lifecycle and stores already live in this owner. |
| `application-platform/runtime/*` host-management seam | Pass | Pass | Low | Pass | Existing host-only composition boundary is the correct exposure point. |
| `run-history/services/studio-run-model-config-service.ts` | Pass | Pass | Medium | Pass | Existing-run canonical config already resides here; the Studio-specific name and port keep cross-owner policy explicit. Do not let the file absorb unrelated Studio commands. |
| `api/graphql/studio-application-api-services.ts` and `compositions/build-studio-server.ts` | Pass | Pass | Low | Pass | Existing explicit Studio dependency binding remains the composition root. |
| Agent/Team GraphQL resolver files | Pass | Pass | Low | Pass | Transport-only mapping remains local; ownership logic is removed from resolvers. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| SR-004 same-owner Application assumption | Pass | Pass | Pass | Pass | DS-009 replaces it; Application managers/lanes remain distinct. |
| Direct General-only routing for the four config operations | Pass | Pass | Pass | Pass | Replace only those routes with `StudioRunModelConfigService`; unrelated operations remain unchanged. |
| Stale Application same-lane coverage assertions | Pass | Pass | Pass | Pass | Downstream owner must replace them with live-lease/release/startup/reentry coverage after implementation review. |
| Revision/rebase/concurrent-writer and archive/delete overreach | Pass | N/A | Pass | Pass | Remains removed; SR-005 does not reintroduce it. |
| Cross-owner mutex, manager unification, ownership transfer, and ownership UX | Pass | N/A | Pass | Pass | Explicitly rejected rather than left as optional implementation machinery. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| General-only and owner-aware config routes | No | Pass | Pass | Exactly four routes move to the new boundary; no fallback on ownership errors. |
| Ownership evidence | No | Pass | Pass | Existing current-schema provenance/lookup/binding records are read directly; no version branch or backfill. |
| Revision-bearing contracts | No | Pass | Pass | Revision fields/outcomes remain absent. |
| Runtime/provider mapping | No | Pass | Pass | Exact current AutoByteus/Codex/Claude paths remain; no deprecated fallback. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Standalone metadata `llmConfig` and `applicationExecutionContext` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Current metadata reader/writer and Application launch provenance are already usable. |
| Team schema-v2 configured `llmConfig` and root `applicationBinding` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Current tree reader/writer already preserves both config and ownership locator. |
| Application global lookup and binding tables | Directly Usable — No Migration | Pass | Pass | N/A | Pass | SR-005 adds a read service only; terminal ordering and startup rebuild already operate on current tables. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Application ownership reader and host contract | Pass | Pass | Pass | Pass |
| Studio four-operation orchestration and resolver rewiring | Pass | Pass | Pass | Pass |
| Preservation of General lanes and separate Application managers | Pass | Pass | Pass | Pass |
| Focused composition/owner-lifecycle coverage refresh | Pass | Pass | Pass | Pass |
| UI, Team planner, persistence, and runtime adapter preservation | Pass | Pass | Pass | Pass |

The sequence is actionable against integrated HEAD and does not require a temporary manager bypass, cross-owner lane, revision seam, transport change, or data migration.

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Application live ownership and terminal release | Yes | Pass | Pass | Pass | Demonstrates locked/no-write while nonterminal and later General eligibility without simultaneous calls. |
| Startup recovery and post-start reentry | Yes | Pass | Pass | Pass | Shows why readiness plus canonical provenance are both required. |
| General external restore ordering | Yes | Pass | Pass | Pass | Keeps lane ownership limited to the real General path. |
| Narrow Agent/Team inputs and stopped Team propagation | Yes | Pass | Pass | Pass | Fixed identity, direct-edit precedence, and no Reset remain concrete. |
| Unsupported browser concurrency and cross-owner machinery | Yes | Pass | Pass | Pass | Explicitly rejects revisions, simultaneous-call tests, manager merge, and GraphQL store access. |
| Claude/schema residual behavior | Yes | Pass | Pass | Pass | Existing typed provider mapping and non-destructive schema failure remain clear. |

## Material Premise Validation (Only When Needed)

### `MP-001` — A stopped configured Team scope can have fixed runtime/model divergence from its parent

- Related approved requirement or established contract: REQ-001, REQ-008, REQ-010, REQ-015; AC-005, AC-006, AC-012, AC-014.
- Relevant behavior ID(s): BEH-005.
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: A user configures a nested-team/member runtime or model before launch, runs the Team, stops the root, and reopens Team Settings.
- Support evidence: The pre-launch Team surface and schema-v2 execution tree preserve fixed configured-scope identity.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `pre-launch Team Configuration -> configured identity override -> Run Team -> persisted tree -> root Stop -> Settings fresh load`.
- Lifecycle preconditions and material consequence at the claimed point: The stopped child can differ from its parent and must validate its own `llmConfig` without cross-model copying.
- Reachability: `Reachable`
- Review consequence / proportionate response: Preserve bounded propagation, direct-edit precedence, per-scope validation, and no stopped-run Reset.

### `MP-SR4-001` — Concurrent browser clients write the same stopped configuration

- Related approved requirement or established contract: Sequential workflow in REQ-005, REQ-009, REQ-014 and the Scope Guardrail.
- Relevant behavior ID(s): BEH-004–BEH-006.
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: None.
- Support evidence: The user explicitly excluded multi-tab/users and concurrent Save submissions.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: None; the approved journey has one Settings draft and one completed Save.
- Lifecycle preconditions and material consequence at the claimed point: A second writer is required for the hypothesized conflict but is not a supported product path.
- Reachability: `Not Reachable`
- Review consequence / proportionate response: It drives no revisions, rebasing, copy, findings, or coverage.

### `MP-SR4-002` — The same browser sends its restore message while Save is in flight

- Related approved requirement or established contract: REQ-005, REQ-006, REQ-009; AC-004 and AC-008.
- Relevant behavior ID(s): BEH-004–BEH-006.
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: None.
- Support evidence: The approved user waits for Save before the later message; affected controls/actions are disabled while saving.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `Stop -> Settings fresh load -> edit -> Save result -> later message`.
- Lifecycle preconditions and material consequence at the claimed point: The asserted same-browser overlap is excluded before it can create a restore/write race.
- Reachability: `Not Reachable`
- Review consequence / proportionate response: Do not add timing machinery, copy, or tests.

### `MP-SR4-003` — External-channel inbound input restores a General-owned stopped run

- Related approved requirement or established contract: Preserved external-channel behavior under REQ-006, REQ-007, REQ-009; AC-004, AC-008, AC-014.
- Relevant behavior ID(s): BEH-008.
- Initiating basis kind: `System`
- Independent product-supported initiating trigger or applicable governing contract: A configured external-channel binding receives a normal inbound provider message.
- Support evidence: `ChannelIngressService` dispatches the durable binding through the General Agent/Team run facades.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Agent: `ChannelIngressService -> ChannelRunFacade -> ChannelAgentRunFacade -> AgentRunCommandCoordinator -> StandaloneAgentRunLifecycleService`. Team: `ChannelTeamRunFacade -> ChannelBindingRunLauncher -> TeamRunService -> AgentTeamRunManager`.
- Lifecycle preconditions and material consequence at the claimed point: The binding addresses a stopped persisted General identity; restore must not materialize stale config across Save.
- Reachability: `Reachable`
- Review consequence / proportionate response: Retain one General per-run/root lane. Restore-first yields active rejection; Save-first commits before restore reads.

### `MP-SR4-004` — Application input addresses a nonterminal Application-owned run

- Related approved requirement or established contract: REQ-002, REQ-003, REQ-006, REQ-009; AC-003, AC-004, AC-008, AC-014; preserved Application communication.
- Relevant behavior ID(s): BEH-003, BEH-006, BEH-008.
- Initiating basis kind: `System`
- Independent product-supported initiating trigger or applicable governing contract: Normal Application Engine/client communication calls `sendInput` for an existing binding.
- Support evidence: Application launch returns a persisted binding containing its Agent/Team ID; `ApplicationOrchestrationHostService.sendRunInput` authorizes a nonterminal binding and uses application-scoped services.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `Application client -> sendRunInput -> target authorization/binding read -> application-scoped AgentRunService or TeamRunService -> application-scoped manager -> post input`.
- Lifecycle preconditions and material consequence at the claimed point: The same persisted identity is invisible to General live maps, but its nonterminal binding remains the Application owner and must prevent Studio writes.
- Reachability: `Reachable`
- Review consequence / proportionate response: Reclassified from ARCH-REV-003. Use DS-009 live-lease lock/rejection; do not claim a shared General lane or add a cross-owner mutex.

### `MP-SR4-005` — Team stream/output/recovery attachment overlaps Settings Save

- Related approved requirement or established contract: Preserved Team stream/output and external-channel recovery; no approved Settings-overlap contract.
- Relevant behavior ID(s): BEH-008.
- Initiating basis kind: `System`
- Independent product-supported initiating trigger or applicable governing contract: Concrete restore-aware callers exist, but no normal trigger is established for the asserted overlap.
- Support evidence: The investigation found resolution calls but not a complete initiating lifecycle that begins during approved Save.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Incomplete for the asserted overlap.
- Lifecycle preconditions and material consequence at the claimed point: The claimed timing state is not established.
- Reachability: `Unclear`
- Review consequence / proportionate response: It drives no finding, machinery, or coverage; known General calls already converge on the retained manager lane.

### `MP-SR4-006` — The exact stopped-update API is called for active General or Application-owned state

- Related approved requirement or established contract: REQ-002, REQ-003, REQ-006, REQ-009; AC-003 and AC-008.
- Relevant behavior ID(s): BEH-003, BEH-006.
- Initiating basis kind: `Contract`
- Independent product-supported initiating trigger or applicable governing contract: The public subject mutations accept an exact existing run/root ID, and both owner families have normal active states.
- Support evidence: The current mutations have no exclusion for Application-bound IDs; CRR-006 traced the resulting false-General-inactive path.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `GraphQL mutation -> StudioRunModelConfigService -> Application live-lease rejection or released delegation -> General lifecycle active recheck -> RUN_ACTIVE/no write`.
- Lifecycle preconditions and material consequence at the claimed point: Active config must not be persisted even if the General map cannot see the Application runtime.
- Reachability: `Reachable`
- Review consequence / proportionate response: Route exactly the four config operations through the owner-aware service and cover both owner families; no browser concurrency UX follows.

### `MP-SR5-001` — Application terminal release enables a later General stopped update

- Related approved requirement or established contract: REQ-002, REQ-003, REQ-009, REQ-012; AC-003, AC-008.
- Relevant behavior ID(s): BEH-003, BEH-006, BEH-008.
- Initiating basis kind: `System`
- Independent product-supported initiating trigger or applicable governing contract: Normal explicit Application termination or observed runtime termination completes; a later Settings request addresses the persisted ID.
- Support evidence: `terminateRunBinding` stops the Application runtime before terminal transition; observer termination also calls the same transition service. That service persists terminal status before lookup removal.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `Application termination/observer -> persist TERMINATED or ORPHANED -> remove binding lookups -> later Settings read -> ownership reader returns released -> General read/update/lane`.
- Lifecycle preconditions and material consequence at the claimed point: Terminal bindings are rejected by normal Application input, so General stopped persistence can proceed without cross-owner overlap.
- Reachability: `Reachable`
- Review consequence / proportionate response: Preserve terminal-before-release ordering and test locked-before/eligible-after sequentially; no simultaneous-call protocol is needed.

### `MP-SR5-002` — Ownership resolution occurs during normal startup recovery

- Related approved requirement or established contract: REQ-009, REQ-012; Application startup lifecycle.
- Relevant behavior ID(s): BEH-006, BEH-008.
- Initiating basis kind: `System`
- Independent product-supported initiating trigger or applicable governing contract: The Studio listener opens before `recoverAfterListen` completes, and a normal Settings request may arrive then.
- Support evidence: `server-runtime.ts` listens before calling lifecycle recovery; `ApplicationOrchestrationStartupGate` represents lookup/binding recovery completion or failure.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `HTTP Settings query/update -> Studio service -> ownership reader -> startupGate.awaitReady -> completed rebuild/classification or thrown failure`.
- Lifecycle preconditions and material consequence at the claimed point: Treating a not-yet-rebuilt lookup as released could admit a write under an Application lease.
- Reachability: `Reachable`
- Review consequence / proportionate response: Await the gate and fail closed/no write on failure or inconsistent evidence.

### `MP-SR5-003` — Supported post-start Application reentry rebuilds lookup while startup is already ready

- Related approved requirement or established contract: REQ-009, REQ-012; existing `reloadAndReenter` REST behavior.
- Relevant behavior ID(s): BEH-006, BEH-008.
- Initiating basis kind: `Operational`
- Independent product-supported initiating trigger or applicable governing contract: A supported REST `reloadAndReenter` action begins for an application with persisted nonterminal bindings.
- Support evidence: `ApplicationReentryService.reloadAndReenter` calls `resumeApplication`; recovery lists nonterminal bindings, clears the application lookup, then rebuilds it. Canonical Agent metadata/Team trees retain binding provenance.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `reloadAndReenter -> engine stop/reload -> resumeApplication -> clearApplication -> per-binding lookup rebuild/observer attach`, while a canonical config read can still locate the binding from persisted provenance.
- Lifecycle preconditions and material consequence at the claimed point: The startup gate is already ready, so lookup absence alone cannot prove release during the rebuild.
- Reachability: `Reachable`
- Review consequence / proportionate response: Cross-check canonical provenance and direct binding status; a referenced nonterminal binding stays locked. Cover the sequential state contract, not timing races.

### `MP-SR4-007` — Definite failure or indeterminate physical persistence outcome

- Related approved requirement or established contract: REQ-012, REQ-013; AC-010; current atomic writer contracts.
- Relevant behavior ID(s): BEH-006.
- Initiating basis kind: `Contract`
- Independent product-supported initiating trigger or applicable governing contract: Existing metadata/tree writers can fail; Team commit distinguishes a post-rename indeterminate outcome.
- Support evidence: Current Agent commit/reread and Team file-commit outcome types are normal Save dependencies.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `released stopped Save -> General lifecycle owner -> atomic writer -> failed/indeterminate result -> canonical reread/typed response -> network-fresh verification`.
- Lifecycle preconditions and material consequence at the claimed point: The run remains stopped, but the browser cannot infer physical commit success from its patch.
- Reachability: `Reachable`
- Review consequence / proportionate response: Retain typed outcomes and canonical verification; do not reintroduce writer revisions.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

**Pass** — SR-005 resolves `CR-F-003` at the design basis. The ownership lease is grounded in normal Application launch/input/termination, listener-before-recovery, and supported reentry paths. It is proportionate to the verified cross-owner consequence, preserves both owner families, and introduces neither unsupported concurrency policy nor manager/store bypass.

## Findings

None. Prior architecture finding `F-001` remains resolved. `CR-F-002` remains resolved by SR-004. `CR-F-003` is resolved at the design basis by SR-005; implementation and renewed downstream verification remain required.

## Classification

N/A — no current architecture-review finding.

## Recommended Recipient

`/implementation_engineer`

## Residual Risks

- Current HEAD does not implement SR-005. This Pass authorizes the two-service/four-operation refactor; it is not implementation or test approval.
- Existing API/E2E and delivery results predate SR-005 and must not be reused as final evidence. Stale Application same-lane assertions require downstream owner revision after implementation and source review.
- A live nonterminal Application binding deliberately locks configuration even if its runtime is temporarily unmaterialized. Owner-aware generic Studio Stop/message/archive/delete routing remains outside this ticket.
- Dynamic catalog/schema absence, Team post-rename persistence indeterminacy, value-inferred Team override provenance, and paid-provider Claude execution remain bounded risks with explicit handling/coverage owners.
- `MP-SR4-005` remains `Unclear` and non-authoritative; no decision depends on it.
- `run-history/services/studio-run-model-config-service.ts` has a bounded Medium placement risk. Keep it limited to the named four operations; unrelated Studio orchestration would warrant a separate capability area rather than growth in this file.

## Latest Authoritative Result

- Review Decision: **Pass**
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): **Pass** — Application lease/readiness/reentry machinery is driven by independently supported production paths; unsupported browser concurrency remains excluded; the unclear Team attachment premise drives nothing.
- Notes: `ARCH-REV-004` supersedes ARCH-REV-003's incorrect Application same-owner conclusion while preserving SR-004's sequential browser simplification. Implement SR-005 against integrated HEAD, then repeat source review and refresh API/E2E investigation/execution before delivery.
