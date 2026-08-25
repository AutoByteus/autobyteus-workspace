# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/requirements.md`
- Upstream Investigation Notes: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/investigation-notes.md`
- Reviewed Design Spec: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/design-spec.md`
- Supplemental Task Artifacts Reviewed: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/ui-ux-spec.md`
- Solution Revision Record Reviewed: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-004` (`SR-003` retained as the prior reviewed feature basis; `SR-001` remains obsolete analysis-only history)
- Architecture Review Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: SR-004 rework after code-review Requirement Gap `CR-F-002`, based on explicit user approval of a sequential browser journey and a production-path audit of independent non-Settings resolvers.
- Prior Review Round Reviewed: Round 2 / `ARCH-REV-002`
- Latest Authoritative Round: Round 3 / `ARCH-REV-003`
- Triggering Downstream Artifacts Reviewed: `implementation-handoff.md`, `implementation-revision-record.md` (`IR-001`, `IR-002`), `code-review-report.md`, `code-review-revision-record.md` (`CRR-003`), and the pre-rework `api-e2e-coverage-investigation.md`.
- Current-State Evidence Basis: Current branch HEAD `08b11b3aa4f3826d3360655dfbba6e884dd66d6b` plus the uncommitted SR-004 solution artifacts. Independent source reads confirmed the existing `StandaloneAgentRunLifecycleService` per-run lane, `AgentTeamRunManager` root lane, external-channel Agent and Team ingress paths, Application Engine `sendInput` paths, current revision/draft-rebase machinery, current Team archive/delete gate broadening, and Stop-owned resume refresh. The target is therefore reviewed as a concrete refactor of current source, not as greenfield design.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status (`Confirmed`/`Contradicted`/`Blocked`): **Confirmed**
- Approved requirements / intended behavior understood: Yes. The browser journey is sequential: Stop completes, Settings performs a network-fresh canonical load, the user edits and waits for Save, and only a later browser message restores the same logical run/team. Browser multi-writer and hand-speed races are excluded.
- Relevant existing behavior and evidence confirmed: Yes. Independent external-channel ingress and Application Engine input can resolve bound stopped Agent/Team runs through the same lifecycle owners used by stopped Save. The current branch also contains revision tokens, rebasing, and Team archive/delete broadening that serve no approved path.
- Scope guardrail confirmed (`In-Scope Use Cases` / `Out of Scope` / `Preserved Behavior Boundary` / `Review Authority`): Yes.
- Approved change, preserved behavior, and outside scope understood: Yes. Narrow stopped-only `llmConfig` updates, restore continuity, Team propagation/no Reset, validation, persistence outcomes, and three-runtime application remain in scope; revision/multi-client policy and archive/delete coordination are removed.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID (`Yes`/`No`): Yes; no blocking Design Impact finding remains.
- Remaining material ambiguity, if any: None. MP-SR4-005 is `Unclear`, but it drives no requirement, coverage, or separate mechanism; its known callers already converge on the independently justified Team manager lane.

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User / Contract | Pass | Pass | Pass | Confirmed | None. Definition and launch flows remain separate. |
| BEH-002 | System | Pass | Pass | Pass | Confirmed | None. Restore consumes existing persisted `llmConfig`. |
| BEH-003 | System / Operational | Pass | Pass | Pass | Confirmed | None. Active backends remain immutable. |
| BEH-004 | User | Pass | Pass | Pass | Confirmed | None. Settings-owned fresh load replaces Stop-owned refresh. |
| BEH-005 | User | Pass | Pass | Pass | Confirmed | None. SR-004 preserves the SR-003 Team propagation/no-Reset correction. |
| BEH-006 | Contract | Pass | Pass | Pass | Confirmed | None. Narrow canonical APIs remain, without revision semantics. |
| BEH-007 | User / System | Pass | Pass | Pass | Confirmed | None. Dynamic-schema safety and all-runtime application remain coherent. |
| BEH-008 | System / Operational | Pass | Pass | Pass | Confirmed | None. External-channel and Application Engine caller paths independently justify the retained owner lanes. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? (`Pass`/`Fail`) | Linked To Relevant Core Artifacts? (`Pass`/`Fail`) | Internally Complete? (`Pass`/`Fail`) | Consistent With Related Core Artifacts? (`Pass`/`Fail`) | Status And Approval Applicability Are Clear? (`Pass`/`Fail`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `ui-ux-spec.md` | Pass | Pass | Pass | Pass | Pass | None. It consistently requires Settings-entry loading, sequential Save, independent-system relock, and no revision/multi-tab or stopped-Team Reset UX. |

The existing `api-e2e-coverage-investigation.md` is triggering downstream evidence rather than an approved solution supplement. Its API-E2E-003/004 and revision/multi-client assertions predate SR-004 and are explicitly non-authoritative; the API/E2E owner must revise that artifact after implementation and code review before executing or editing durable coverage.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Requirements, investigation, and design describe a feature/behavior change plus current-branch refactor. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Missing lifecycle invariant/boundary ownership is distinguished from the SR-003 duplicated coordination overreach and the local Claude adapter defect. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | A narrow refactor retains real resolver ordering while deleting revision, rebase, and archive/delete expansion. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Removal plan, ownership map, current-file mapping, sequence, examples, and coverage guidance all implement the same decision. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Standalone Settings load and stopped Save | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Standalone later restore | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Team Settings load, propagation, and stopped Save | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Team later restore | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Canonical return/event and uncertainty verification | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | Standalone Save versus independent resolver lane | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-007 | Team Save versus independent resolver root lane | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-008 | Claude persisted-config application | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

DS-006 and DS-007 are proportionate bounded-local spines: they reuse current identity-specific lifecycle owners and add no optimistic writer protocol. DS-001/DS-003 correctly move freshness to the Settings surface that decides whether editing may unlock.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Standalone Agent update | Pass | Pass | Pass | Pass | Resolver -> Agent service -> lifecycle lane -> catalog commit; no resolver/store bypass. |
| Root Team update | Pass | Pass | Pass | Pass | Resolver -> Team service -> manager root lane -> pure mutator/tree store. |
| Browser existing-run draft | Pass | Pass | Pass | Pass | Fresh canonical state and unsaved draft remain distinct; the browser owns no revision arbitration. |
| Runtime-specific application | Pass | Pass | Pass | Pass | Generic lifecycle persists values; provider adapters interpret them during restore/query construction. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Web form/draft/history | Pass | Pass | Pass | Pass | Components delegate to the draft store; cached state may relock but cannot unlock. |
| Agent service/lifecycle/catalog | Pass | Pass | Pass | Pass | Lifecycle owns ordering/eligibility; catalog owns queued atomic commit and reread. |
| Team service/manager/mutator/store | Pass | Pass | Pass | Pass | Save uses the manager lane; archive/delete return to their baseline history ownership. |
| Validator/runtime adapters | Pass | Pass | Pass | Pass | Validation is provider-neutral; provider keys stay within runtime adapters. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `getAgentRunResumeConfig(runId)` | Pass | Pass | Pass | Low | Pass |
| `getTeamRunResumeConfig(teamRunId)` | Pass | Pass | Pass | Low | Pass |
| `updateStoppedAgentRunModelConfig({agentRunId,llmConfig})` | Pass | Pass | Pass | Low | Pass |
| `updateStoppedTeamRunModelConfigs({teamRunId,patches})` | Pass | Pass | Pass | Low | Pass |
| lifecycle/manager stopped-update methods | Pass | Pass | Pass | Low | Pass |
| catalog `commitRunModelConfig` | Pass | Pass | Pass | Low | Pass |
| `ModelConfigValidationService.validate` | Pass | Pass | Pass | Low | Pass |

The target inputs contain no fixed fields or expected revision. Agent and Team remain separate subjects, Team patches retain kind/address identity, and canonical payloads stay specialized.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Standalone Save/restore ordering | Pass | Pass | N/A | Pass | Retain the current lifecycle owner/lane because MP-SR4-003/004 reach it. |
| Team Save/restore ordering | Pass | Pass | N/A | Pass | Retain the current manager root lane; no second coordinator. |
| Agent/Team persistence | Pass | Pass | N/A | Pass | Reuse current atomic writers, queues, and canonical rereads. |
| Settings freshness | Pass | Pass | N/A | Pass | Reuse resume queries with network-only policy at Settings entry. |
| Model/schema validation | Pass | Pass | Pass | Pass | The already-implemented focused validator remains justified. |
| Existing-run drafts and Team planner | Pass | Pass | Pass | Pass | Focused current pieces remain; revision-only branches are removed. |
| Claude translation | Pass | Pass | N/A | Pass | Retain the implemented adapter chain against pinned SDK `0.3.231`. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Web existing-run configuration | Pass | Pass | Pass | Pass | Fresh load, drafts, Save, and uncertainty refresh remain one focused capability. |
| Agent execution | Pass | Pass | Pass | Pass | Existing lifecycle lane governs restore and stopped update. |
| Team execution | Pass | Pass | Pass | Pass | Existing manager lane governs root restore and stopped update only. |
| Run history | Pass | Pass | Pass | Pass | Canonical reads and physical commit remain history-owned; no revision policy. |
| LLM management | Pass | Pass | Pass | Pass | Current-catalog validation remains off-spine. |
| Claude runtime | Pass | Pass | Pass | Pass | Capability and query translation remain at the provider boundary. |
| GraphQL | Pass | Pass | Pass | Pass | Thin subject-specific mapping remains transport-only. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Model-config editability | Pass | Pass | Pass | Pass | Tight shared meaning without broad field flags or a revision carrier. |
| Normalized schema validation | Pass | Pass | Pass | Pass | Shared only by the two lifecycle update owners. |
| Transport outcomes/errors | Pass | Pass | Pass | Pass | Shared vocabulary with specialized canonical payloads. |
| No-op/config equality | Pass | N/A | Pass | Pass | Remains an internal commit/planner concern; no digest/revision structure is retained merely for sharing. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RunModelConfigEditability` | Pass | Pass | Pass | Pass | Pass | Only editability/reason remain; revision is removed. |
| Mutation result core | Pass | Pass | Pass | Pass | Pass | Common outcomes plus Agent config or Team tree canonical payload. |
| Team scope patch | Pass | Pass | Pass | N/A | Pass | Only kind/address/config is mutable. |
| Frontend Agent/Team draft union | Pass | Pass | Pass | Pass | Pass | Discriminated subject variants, without rebase/revision state. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `existingRunModelConfigStore.ts` | Pass | Pass | Pass | Pass | Fresh Settings load, draft/Save, result handling, and uncertainty refresh; revision/rebase flags removed. |
| `existingAgentModelConfigDraft.ts` | Pass | Pass | Pass | Pass | Clone/equality/patch only. |
| `existingTeamModelConfigDraft.ts` | Pass | Pass | Pass | Pass | Equality snapshot, direct-edit markers, propagation, and minimal patches; no Reset or revision rebase. |
| `standalone-agent-run-lifecycle-service.ts` | Pass | Pass | Pass | Pass | Activation/restore/stopped update share one real lifecycle owner. |
| Agent catalog commit helper | Pass | Pass | Pass | Pass | Missing/archived/no-op/write/reread outcome classification without digest policy. |
| `agent-team-run-manager.ts` | Pass | Pass | Pass | Pass | Root restore/update lane; generalized history gate removed. |
| Team mutator and validator | Pass | Pass | Pass | Pass | Pure patching and schema authority stay separate from lifecycle/I/O. |
| Claude adapter-chain files | Pass | Pass | N/A | Pass | Each file retains its existing catalog, session, bootstrap, turn, or SDK boundary. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server Agent/Team/LLM/history files | Pass | Pass | Low | Pass | Current locations match lifecycle, validation, and persistence ownership. |
| `web/services/runConfigEditing/` | Pass | Pass | Low | Pass | Pure draft algorithms stay outside Pinia/components. |
| Web draft/form contracts | Pass | Pass | Low | Pass | Existing-run shapes remain distinct from launch authoring. |
| GraphQL transport files | Pass | Pass | Low | Pass | Transport vocabulary is not promoted to a domain owner. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `configurationRevision`, `expectedConfigurationRevision`, `STALE_REVISION` | Pass | Pass | Pass | Pass | Server, GraphQL, generated client, UI state, copy, and tests are all named. |
| `run-model-config-revision.ts` digest helper | Pass | N/A | Pass | Pass | Delete without replacement revision/fingerprint machinery. |
| Revision-aware commit/rebase/forced-baseline branches | Pass | Pass | Pass | Pass | Canonical fresh load/result and uncertainty verification remain. |
| Concurrent-writer/multi-client tests and stale API-E2E-003/004 premises | Pass | Pass | Pass | Pass | Current source tests are removed; downstream investigation must be rewritten before execution. |
| Generalized `withUnmanagedRootPersistence` and archive lane changes | Pass | Pass | Pass | Pass | Restore baseline `withUnmanagedHistoryDeletion` and archive/delete behavior/tests; Save alone stays in the manager lane. |
| Stop-owned Agent/Team resume refresh | Pass | Pass | Pass | Pass | Settings entry becomes the sole unlock-authoritative fresh read. |
| Earlier broad flags/browser-only mutation/stored-Team projection | Pass | Pass | Pass | Pass | Prior clean removals remain in effect. |
| Claude combined capability predicate | Pass | Pass | Pass | Pass | Independent capability emission remains the clean replacement. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Revision-bearing and revision-free update contracts | No | Pass | Pass | Only the revision-free target remains; no ignored/nullable compatibility fields. |
| Team history persistence gate | No | Pass | Pass | Restore baseline archive/delete ownership rather than retain both gates. |
| Agent/Team update and frontend contracts | No | Pass | Pass | No full-config/full-tree or dual mutation path. |
| Claude SDK mapping | No | Pass | Pass | Exact pinned options; no deprecated fallback. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Standalone `run_metadata.json.llmConfig` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Existing metadata restore and writer consume the field; revision was computed, never stored. |
| Team schema-v2 configured-scope `llmConfig` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Existing tree reader/builder consumes these locations; no shape/version change. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Cross-contract revision removal | Pass | Pass | Pass | Pass |
| Retained Agent/Team lifecycle lanes | Pass | Pass | Pass | Pass |
| Team archive/delete baseline restoration | Pass | Pass | Pass | Pass |
| Settings fresh-load ownership and draft simplification | Pass | Pass | Pass | Pass |
| Runtime adapters and Team propagation preservation | Pass | Pass | Pass | Pass |

The sequence is actionable against HEAD `08b11b3aa`: it names the current overreach, removes it as one clean contract cut, preserves the independently justified lanes, and forbids a revision compatibility seam.

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Settings-entry freshness | Yes | Pass | Pass | Pass | Fresh load precedes unlock; cached Stop state cannot unlock. |
| Narrow Agent/Team inputs | Yes | Pass | Pass | Pass | No fixed fields, full tree, or writer revision. |
| Independent resolver ordering | Yes | Pass | Pass | Pass | External/application restore-first and Save-first outcomes are explicit. |
| Unsupported browser concurrency | Yes | Pass | Pass | Pass | Multi-tab and hand-speed paths are explicitly rejected as machinery/coverage drivers. |
| Team propagation/fixed divergence | Yes | Pass | Pass | Pass | Direct edits win, cross-model copying is forbidden, and no stopped Reset is added. |
| Claude and schema-gap behavior | Yes | Pass | Pass | Pass | Typed SDK mapping and non-destructive failure behavior remain concrete. |

## Material Premise Validation (Only When Needed)

### `MP-001` — A stopped configured Team scope can have fixed runtime/model divergence from its parent

- Related approved requirement or established contract: REQ-001, REQ-008, REQ-010, REQ-015; AC-005, AC-006, AC-012, AC-014; UXJ-003.
- Relevant behavior ID(s): BEH-005.
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: The pre-launch Team Configuration surface permits a user to set a configured nested-team/member runtime or model override, launch, later stop the root, and reopen Team Configuration.
- Support evidence: Launch override models and hierarchy resolution persist the configured fixed identity into the schema-v2 tree; the approved stopped editor exposes those configured scopes.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `pre-launch Team Configuration -> configured scope identity override -> Run Team -> persisted execution tree -> root Stop -> Settings fresh load -> stopped configured-scope editor`.
- Lifecycle preconditions and material consequence at the claimed point: The scope is stopped and directly editable, but its runtime/model remains fixed and may differ from its parent.
- Reachability: `Reachable`
- Review consequence / proportionate response: Preserve the SR-003 boundary: ancestor propagation stops, direct edits validate against the scope's own model, and no stopped-run Reset or cross-model copy exists.

### `MP-SR4-001` — Concurrent browser clients write the same stopped configuration

- Related approved requirement or established contract: The approved sequential workflow in REQ-005, REQ-009, REQ-014 and the Scope Guardrail.
- Relevant behavior ID(s): BEH-004–BEH-006.
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: None. Generic ability to open tabs, use another browser, or invoke GraphQL is not an approved same-run collaboration journey.
- Support evidence: The user explicitly approved one Stop -> Settings -> fresh load -> edit -> Save sequence and excluded multi-tab/users and concurrent Save submissions.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: No supported path reaches two concurrent configuration writers; the approved path has one local draft and one completed Save.
- Lifecycle preconditions and material consequence at the claimed point: The assumed lost-update conflict requires a second unsupported writer.
- Reachability: `Not Reachable`
- Review consequence / proportionate response: Remove revision tokens, stale outcomes, writer rebasing, concurrent-writer tests, and related copy. This premise cannot drive replacement machinery.

### `MP-SR4-002` — The same browser sends its resume message while Save is in flight

- Related approved requirement or established contract: REQ-005, REQ-006, REQ-009; AC-004 and AC-008.
- Relevant behavior ID(s): BEH-004–BEH-006.
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: None. The approved browser action sends the later message only after Save returns.
- Support evidence: The user rejected hand-speed browser timing as a product path; the UI disables affected controls/action during Save.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `Stop completes -> Settings fresh load -> edit -> Save result -> later browser message`; no same-browser in-flight resume action is part of the journey.
- Lifecycle preconditions and material consequence at the claimed point: The hypothesized browser overlap is excluded before it can create restore-first state.
- Reachability: `Not Reachable`
- Review consequence / proportionate response: Do not require browser race state, copy, tests, or coordination for this premise.

### `MP-SR4-003` — External-channel inbound input restores a bound stopped run

- Related approved requirement or established contract: Preserved external-channel binding/ingress behavior under REQ-006, REQ-007, REQ-009; AC-004, AC-008, AC-014.
- Relevant behavior ID(s): BEH-008.
- Initiating basis kind: `System`
- Independent product-supported initiating trigger or applicable governing contract: A configured external-channel binding receives a normal inbound provider message.
- Support evidence: `ChannelIngressService.handleInboundMessage` resolves a persisted binding and dispatches it through `ChannelRunFacade`; this feature exists independently of Settings.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Agent: `ChannelIngressService -> ChannelRunFacade -> ChannelAgentRunFacade -> AgentRunCommandCoordinator -> AgentRunService.resolveCommandReadyAgentRun -> StandaloneAgentRunLifecycleService`. Team: `ChannelIngressService -> ChannelRunFacade -> ChannelTeamRunFacade -> ChannelBindingRunLauncher.resolveOrStartTeamRun -> TeamRunService.restoreTeamRun -> AgentTeamRunManager`, followed by message dispatch.
- Lifecycle preconditions and material consequence at the claimed point: A durable binding refers to a stopped persisted run while Settings may independently save it. Without common owner ordering, restore can materialize the prior config while Save commits a new one.
- Reachability: `Reachable`
- Review consequence / proportionate response: Retain one existing per-run/root lane. Restore-first publishes active and Save returns `RUN_ACTIVE`; Save-first commits before restore reads. No writer revision is justified.

### `MP-SR4-004` — Application Engine input restores a bound stopped run

- Related approved requirement or established contract: Preserved Application Engine communication behavior under REQ-006, REQ-007, REQ-009; AC-004, AC-008, AC-014.
- Relevant behavior ID(s): BEH-008.
- Initiating basis kind: `System`
- Independent product-supported initiating trigger or applicable governing contract: Application Engine `sendInput`, including `ApplicationAgentCommunicationSession.deliverInput`, targets an existing application run binding.
- Support evidence: The public Application Engine operation routes accepted input through `ApplicationOrchestrationHostService.sendRunInput`; it is independent of the Settings browser flow.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `Application Engine/client communication -> ApplicationOrchestrationHostService.sendRunInput -> postAddressedRunInputInternal -> AgentRunService.resolveAgentRun -> StandaloneAgentRunLifecycleService`, or `TeamRunService.resolveActiveTeamRun -> AgentTeamRunManager`, then post input.
- Lifecycle preconditions and material consequence at the claimed point: The application binding persists while its Agent/Team runtime is stopped and the input resolver can restore it independently.
- Reachability: `Reachable`
- Review consequence / proportionate response: The same existing per-identity lane already justified by MP-SR4-003 is sufficient; no second coordination mechanism or optimistic writer policy is added.

### `MP-SR4-005` — Team stream/output/recovery attachment overlaps Settings Save

- Related approved requirement or established contract: Preserved Team stream/output and external-channel recovery behavior; no approved Settings-overlap contract.
- Relevant behavior ID(s): BEH-008.
- Initiating basis kind: `System`
- Independent product-supported initiating trigger or applicable governing contract: Concrete restore-aware callers exist, but no normal event has been established that begins one during the approved Save interval.
- Support evidence: `AgentTeamStreamHandler`, channel output delivery/recovery, and binding checks call Team resolution methods, but the investigation does not prove the relevant overlap lifecycle.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Incomplete for the asserted Settings overlap; callers converge on `TeamRunService`/`AgentTeamRunManager` if invoked.
- Lifecycle preconditions and material consequence at the claimed point: Whether such an attachment starts while stopped Save is pending is not established.
- Reachability: `Unclear`
- Review consequence / proportionate response: It drives no requirement, finding, or coverage. No separate machinery is needed because the independently justified manager lane already owns any actual restore call.

### `MP-SR4-006` — The stopped-update API is called while the run/root is active

- Related approved requirement or established contract: REQ-002, REQ-003, REQ-006, REQ-009; AC-003 and AC-008 explicitly require direct active-call rejection.
- Relevant behavior ID(s): BEH-004–BEH-006.
- Initiating basis kind: `Contract`
- Independent product-supported initiating trigger or applicable governing contract: The public subject mutation contract accepts a request for an existing run identity, and active standalone/root state is a normal supported lifecycle state.
- Support evidence: AC-003/AC-008 govern the direct API result independently of UI presentation; the mutation maps through Agent/Team facades to the lifecycle owner.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `GraphQL update mutation for active run ID -> resolver -> AgentRunService/TeamRunService -> lifecycle owner active check -> RUN_ACTIVE`.
- Lifecycle preconditions and material consequence at the claimed point: The subject is active when mutation reaches the owner; persistence must not occur.
- Reachability: `Reachable`
- Review consequence / proportionate response: Keep one server-side active check and direct contract coverage. Do not infer a browser concurrency/rebase workflow.

### `MP-SR4-007` — Definite failure or indeterminate physical persistence outcome

- Related approved requirement or established contract: REQ-012, REQ-013; AC-010; existing atomic metadata writer and Team file-commit outcome contract.
- Relevant behavior ID(s): BEH-006.
- Initiating basis kind: `Contract`
- Independent product-supported initiating trigger or applicable governing contract: The established persistence boundaries explicitly report/produce failed writes; the Team commit writer distinguishes post-rename finalization-indeterminate outcome.
- Support evidence: Current metadata commit/reread handling and `TeamRunExecutionTreeStore`/file commit result types are normal lifecycle dependencies of Save.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `stopped Save owner -> atomic metadata/tree writer -> failed or renamed-finalization-indeterminate outcome -> canonical reread/typed result -> network-fresh outcome-verification read`.
- Lifecycle preconditions and material consequence at the claimed point: The run remains stopped, but the browser cannot truthfully infer whether a physical update committed after an uncertain outcome.
- Reachability: `Reachable`
- Review consequence / proportionate response: Retain typed persistence outcomes and canonical verification; do not use them to reintroduce writer revisions.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

**Pass** — SR-004 resolves `CR-F-002` at the solution/design basis. The retained Agent and Team lifecycle lanes are proportionate to independently reachable MP-SR4-003/004, and revision/archive/delete overreach is explicitly and actionably decommissioned.

## Findings

None. Prior architecture finding `F-001` remains resolved. Code-review Requirement Gap `CR-F-002` is resolved by the approved SR-004 behavior basis; current source still requires the specified implementation refactor before source re-review.

## Classification

N/A — no current architecture-review finding.

## Recommended Recipient

`/implementation_engineer`

## Residual Risks

- Current HEAD still implements the superseded revision/rebase and Team archive/delete expansion. Architecture Pass authorizes the SR-004 refactor; it is not evidence that current source already matches the target.
- The pre-rework `api-e2e-coverage-investigation.md` remains stale and must be revised by `/api_e2e_engineer` after implementation and code review. Its API-E2E-003/004 browser/revision premises must not be executed or used to drive durable coverage as written.
- Stored Team override provenance remains intentionally unavailable; draft-start equality plus direct-edit markers provide deterministic propagation only.
- Dynamic catalog/schema absence, Team post-rename persistence indeterminacy, and real-provider Claude execution remain bounded implementation/coverage risks with explicit owners and outcomes.
- MP-SR4-005 remains `Unclear` and non-authoritative. It requires no investigation for this implementation because no decision depends on it and known callers already converge on the retained manager lane.

## Latest Authoritative Result

- Review Decision: **Pass**
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): **Pass** — unsupported browser premises drive removal, reachable external/application resolvers justify only the existing owner lanes, and the unclear Team attachment premise drives nothing.
- Notes: `ARCH-REV-003` supersedes the prior SR-003 review result for implementation planning. Implement the SR-004 clean cut against HEAD `08b11b3aa`, then rerun source review before API/E2E coverage planning/execution resumes.
