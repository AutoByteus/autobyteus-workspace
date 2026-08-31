# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/design-spec.md`
- Supplemental Task Artifacts Reviewed:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/ui-ux-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/live-selection-comparison.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/configured-parent-selected.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/task-run-selected.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/deterministic-reproduction-summary.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/reproduce-nested-sibling-task.cjs`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/student-two-monitor-probe-round3-reproduction.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/student-two-monitor-probe-round3-before-click.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/student-two-monitor-probe-round3-after-click.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/round3-backend-projection.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/round3-backend-topology.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/round2-fresh-open-control.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/round2-fresh-open-control-after-click.png`
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001`–`SR-005` (`SR-005` is current; `SR-001` remains superseded)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-005`
- Current Review Round: `5`
- Trigger: `/solution_designer` returned `SR-005` with the user-required deterministic node-8001 reproduction and corrected the projection-authority model for live-created task contexts.
- Prior Review Round Reviewed: Round 4 / `ARCH-REV-004` / `Blocked`.
- Latest Authoritative Round: `5`
- Current-State Evidence Basis: A clean detached frontend baseline at `80e2bd195` reproduced the supported live-created nested-task selection defect 3/3 against Docker node 8001. Before the strongest-round click, the exact task projection already contained five conversation entries and three Activity items; after selection, exact navigation/view/context identities aligned while the local shell remained `Offline`/0/0 for ten seconds and selection made zero exact projection requests. A fresh-open control made one exact request and rendered retained content. Source tracing identifies live tree materialization of an empty exact shell plus the mounted local-reuse branch that focuses without hydration.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status (`Confirmed`/`Contradicted`/`Blocked`): `Confirmed`.
- Approved requirements / intended behavior understood: `Yes`. Scope remains frontend exact task-AgentRun observability and truthful lifecycle/execution presentation.
- Relevant existing behavior and evidence confirmed: `Yes`. The clean-baseline 3/3 reproduction establishes the supported user/system trigger, lifecycle timing, exact identities, server content before selection, false-empty local shell, missing exact request, and successful fresh-open control.
- Scope guardrail confirmed (`In-Scope Use Cases` / `Out of Scope` / `Preserved Behavior Boundary` / `Review Authority`): `Yes`.
- Approved change, preserved behavior, and outside scope understood: `Yes`. No prompt, tool-choice, collaboration-tool, server task-service, persistence, or lifecycle change is authorized.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID (`Yes`/`No`): `Yes`; there are no current blocking findings.
- Remaining material ambiguity, if any: `None` affecting implementation readiness. The deterministic primary trigger is established; separately reachable reconnect, Activity-race, fresh-open, and standalone-open paths retain their evidence-backed protections.

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | User | Pass | Pass | Pass | Confirmed | None. Mounted exact-task selection requires guarded exact projection authority before target focus/current selection. |
| `BEH-002` | User/System | Pass | Pass | Pass | Confirmed | None. Local context presence is not hydration authority; pure staging plus the composite context/conversation/Activity witness protects convergence. |
| `BEH-003` | System | Pass | Pass | Pass | Confirmed | None. Live activation creates a non-authoritative exact shell without stealing focus; later inspection hydrates it, while snapshot/reconnect invalidation and focused reconciliation cover long-lived contexts. |
| `BEH-004` | User | Pass | Pass | Pass | Confirmed | None. One mapper separates formal lifecycle from execution status. |
| `BEH-005` | User/System | Pass | Pass | Pass | Confirmed | None. Content is lifecycle/tool-choice independent and Activity-only races are witnessed. |
| `BEH-006` | User/System | Pass | Pass | Pass | Confirmed | None. Compound root/run identity and no parent fallback preserve isolation. |
| `PB-001` | Preserved User/System | Pass | Pass | Pass | Confirmed | None. Active subscribed standalone contexts keep live content; replaceable candidates commit coherently before selection/stream policy. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? (`Pass`/`Fail`) | Linked To Relevant Core Artifacts? (`Pass`/`Fail`) | Internally Complete? (`Pass`/`Fail`) | Consistent With Related Core Artifacts? (`Pass`/`Fail`) | Status And Approval Applicability Are Clear? (`Pass`/`Fail`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `ui-ux-spec.md` | Pass | Pass | Pass | Pass | Pass | None. Approved behavior remains frontend-only and now describes the proven false-empty exact shell. |
| `live-selection-comparison.json` | Pass | Pass | Pass | Pass | Pass | None. It remains supporting identity/content evidence rather than proof of the deterministic trigger. |
| Original configured-parent/task screenshots | Pass | Pass | Pass | Pass | Pass | None. They remain historical visual evidence. |
| `deterministic-reproduction-summary.json` | Pass | Pass | Pass | Pass | Pass | None. Canonical 3/3 result, configuration, exact timing/identity, supported path, source trace, and control are complete. |
| `reproduce-nested-sibling-task.cjs` | Pass | Pass | Pass | Pass | Pass | None. It records the repeatable supported user-to-nested-delegation probe and required captures. |
| Round-3 browser/store JSON and before/after PNGs | Pass | Pass | Pass | Pass | Pass | None. They show the live-created row transition to exact current focus over the false-empty local shell. |
| Round-3 backend projection/topology JSON | Pass | Pass | Pass | Pass | Pass | None. Exact retained conversation/Activity and topology existed before selection. |
| Fresh-open control JSON/PNG | Pass | Pass | Pass | Pass | Pass | None. One exact projection request renders the exact task content, isolating the mounted-shell authority gap. |

The supplement inventory is complete and cross-linked from the canonical requirements, investigation, and design. The new clean-baseline evidence resolves `ARCH-F-006`/`MP-006` without changing approved product behavior.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Requirements, investigation, and design classify a frontend bug fix. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | The primary defect is the proven live-created exact Offline/empty shell treated as locally hydrated; distinct focus/navigation convergence, Activity witnessing, fresh-target authority, and standalone-open risks remain independently reachable. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Frontend refactor is required; backend/prompt work is prohibited. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Owners, DS-001–DS-008, removals, guarded commits, tests, and the no-server-diff guardrail reflect it. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Mounted and fresh exact selection | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-002` | Mounted projection authority | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-003` | Stream convergence return/event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-004` | Lifecycle/execution presentation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-005` | Guarded mounted hydration | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| `DS-006` | View-owned focus repair | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| `DS-007` | Fresh exact-target candidate/open | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-008` | Standalone Agent open/history/recovery preservation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `TeamExecutionViewState` | Pass | Pass | Pass | Pass | Sole exact focus/topology owner. |
| `agentActivityStore` | Pass | Pass | Pass | Pass | Owns content writes, revision, retention, highlight survival, and atomic replacement. |
| Mounted hydration service | Pass | Pass | Pass | Pass | Context presence or activation is never projection authority; exact staging and the complete Team/Agent/event-monitor/Activity witness precede commit. |
| Fresh hydration/open | Pass | Pass | Pass | Pass | Hydration stages; coordinator validates, commits, mounts, selects, and connects. |
| Inspection coordinator | Pass | Pass | Pass | Pass | Mounted entry cannot fall into full replacement and cannot commit target focus/current selection before exact projection authority. |
| Standalone run hydration / Agent-open coordinator | Pass | Pass | Pass | Pass | Pure candidate loading, post-load strategy, keep-live preservation, guarded replacement, selection, and stream policy are separated. |
| Task presentation mapper | Pass | Pass | Pass | Pass | One derived lifecycle owner. |
| Unchanged server boundary | Pass | Pass | Pass | Pass | Explicit no-change guardrail. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Execution view / navigation | Pass | Pass | Pass | Pass | Navigation only derives. |
| Activity store / adapter | Pass | Pass | Pass | Pass | Adapter is pure; writes use revisioned store actions. |
| Mounted hydration / inspection | Pass | Pass | Pass | Pass | Non-authoritative live shell triggers exact staging; complete witness precedes synchronous apply and focus. |
| Fresh hydration / open | Pass | Pass | Pass | Pass | Exact target; nonfocus misses remain non-authoritative. |
| Standalone hydration / Agent open | Pass | Pass | Pass | Pass | Candidate loading cannot write; keep-live never replaces Activity; replacement validates identity/revision before selection/stream. |
| Frontend / server | Pass | Pass | Pass | Pass | No server change. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `inspectTeamMember(input)` | Pass | Pass | Pass | Low | Pass |
| `ensureAuthoritativeTeamMemberProjection(input)` | Pass | Pass | Pass | Low | Pass |
| `getActivityContentRevision(runId)` | Pass | Pass | Pass | Low | Pass |
| `replaceProjectionActivitiesIfRevisions(replacements)` | Pass | Pass | Pass | Low | Pass |
| `buildActivitiesFromProjection(entries)` | Pass | Pass | N/A | Low | Pass |
| `hydrateLiveTeamRunContext(input)` | Pass | Pass | Pass | Low | Pass |
| `openTeamRun(input)` | Pass | Pass | Pass | Low | Pass |
| `loadRunContextHydrationCandidate(input)` | Pass | Pass | Pass | Low | Pass |
| `hydrateLiveRunContext(input)` | Pass | Pass | Pass | Low | Pass |
| `openAgentRun(input)` | Pass | Pass | Pass | Low | Pass |
| Freshness/view/presentation APIs | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Exact projection query/builders | Pass | Pass | Pass | Pass | Reuse transport/builders; make Activity conversion pure. |
| Activity witness/replace | Pass | Pass | Pass | Pass | Revision belongs with existing store owner. |
| Mounted target authority | Pass | Pass | Pass | Pass | Focused service is justified. |
| Fresh target authority/open | Pass | Pass | Pass | Pass | Correct existing path instead of duplicating. |
| Standalone Agent candidate/open | Pass | Pass | Pass | Pass | Extends existing hydration/open owners while preserving the current strategy and ordering. |
| Unreferenced Team status helper | Pass | Pass | N/A | Pass | Repository-wide production search supports clean removal rather than a wrapper. |
| Focus/topology and task presentation | Pass | Pass | Pass | Pass | Extend view and extract lifecycle derivation. |
| Server behavior | Pass | Pass | N/A | Pass | Reuse unchanged. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend Team execution | Pass | Pass | Pass | Pass | View owns focus/topology. |
| Frontend Activity/hydration/open | Pass | Pass | Pass | Pass | Store, services, and coordinators remain distinct. |
| Frontend standalone Agent open | Pass | Pass | Pass | Pass | DS-008 assigns candidate loading and open strategy to existing owners. |
| Frontend history/UI | Pass | Pass | Pass | Pass | Facade/read model is coherent. |
| Server task/prompt/tool stack | Pass | Pass | Pass | Pass | Unchanged. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Task lifecycle/context presentation | Pass | Pass | Pass | Pass | Shared mapper. |
| Compound inspection identity/result | Pass | Pass | Pass | Pass | Root/run only. |
| Activity projection staging | Pass | Pass | Pass | Pass | Pure adapter. |
| Activity revision/batch replacement | Pass | Pass | Pass | Pass | Store-owned transaction. |
| Standalone projection candidate | Pass | Pass | Pass | Pass | `runContextHydrationService.ts` owns one staged exact-run shape. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TeamExecutionTaskPresentation` | Pass | Pass | Pass | N/A | Pass | Raw redundant status removed. |
| `TeamMemberInspectionIdentity` | Pass | Pass | Pass | N/A | Pass | Address excluded. |
| `ActivityProjectionReplacement` | Pass | Pass | Pass | N/A | Pass | Expected revision plus staged content. |
| `TeamRunHydrationCandidate` | Pass | Pass | Pass | Pass | Pass | Carries context, authority, and revisions intact. |
| `RunContextHydrationCandidate` | Pass | Pass | Pass | Pass | Pass | Exact run, built content/files/config, and expected Activity revision have one staged meaning. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agentActivityStore.ts` | Pass | Pass | Pass | Pass | Revision and atomic batch owner. |
| `runProjectionActivityHydration.ts` | Pass | Pass | Pass | Pass | Pure builder. |
| Team member/full hydration services | Pass | Pass | Pass | Pass | Mounted versus fresh authority is clear. |
| Inspection/open coordinators | Pass | Pass | Pass | Pass | Mounted/fresh sequencing is distinct. |
| Named view/stream/history/workspace/presentation files | Pass | Pass | Pass | Pass | Integration ownership explicit. |
| `runContextHydrationService.ts` | Pass | Pass | Pass | Pass | Owns pure standalone candidate loading and guarded absent-context background commit. |
| `agentRunOpenCoordinator.ts` | Pass | Pass | Pass | Pass | Owns post-load strategy, keep-live preservation, guarded replace, then selection/stream policy. |
| `teamRunMemberStatusHydration.ts` | Pass | Pass | N/A | Pass | Explicitly removed after a zero-production-caller audit; stale mocks are also removed. |
| `autobyteus-server-ts/**` | Pass | Pass | N/A | Pass | No change. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `services/runHydration` | Pass | Pass | Low | Pass | Projection construction/application. |
| `services/runOpen` | Pass | Pass | Low | Pass | Inspection/open sequencing. |
| `services/teamExecution` | Pass | Pass | Low | Pass | View/task projection. |
| `stores` | Pass | Pass | Medium | Pass | Facade/read model plus Activity owner. |
| `autobyteus-server-ts` | Pass | Pass | Low | Pass | No-change boundary. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Direct navigation focus patch | Pass | Pass | Pass | Pass | Remove exports/callers/tests. |
| False local hydration helper | Pass | Pass | Pass | Pass | Typed inspection replaces it. |
| Duplicate lifecycle derivation/raw status | Pass | Pass | Pass | Pass | Shared presentation replaces both. |
| `hydrateActivitiesFromProjection` writer | Pass | Pass | Pass | Pass | Team and standalone consumers are mapped; repository-wide import search gates deletion. |
| `teamRunMemberStatusHydration.ts` | Pass | N/A | Pass | Pass | Zero-caller helper and stale test mocks are removed without a compatibility wrapper. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Team focus | No | Pass | Pass | One authority. |
| Projection hydration | No | Pass | Pass | No parent fallback, blind replacement, or clear/add compatibility writer intended. |
| Task lifecycle presentation | No | Pass | Pass | No raw/derived dual model. |
| Server behavior | No | Pass | Pass | Preserved out of scope. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Execution tree, task records, messages, traces, exact projections | `Directly Usable — No Migration` | Pass | Pass | N/A | Pass | Current readers/node evidence establish direct use; no schema change. Current traceability uses R-009 and AC-007/AC-013/AC-015 without adding behavior. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Activity revision and projection adapter | Pass | Pass | Pass | Pass |
| Standalone candidate/open migration | Pass | Pass | Pass | Pass |
| Mounted hydration/inspection | Pass | Pass | Pass | Pass |
| Activation-shell projection authority | Pass | Pass | Pass | Pass |
| Fresh exact-target open | Pass | Pass | Pass | Pass |
| Focus/navigation and stream convergence | Pass | Pass | Pass | Pass |
| Presentation/UI/server guardrail | Pass | Pass | Pass | Pass |

The sequence migrates standalone consumers before Team consumers, locks the shared store/adapter boundary first, and uses repository-wide import and no-server-diff gates.

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Live-created shell authority | Yes | Pass | Pass | Pass | Activation/context materialization is explicitly non-authoritative; exact guarded commit precedes focus/current selection. |
| Mounted composite witness | Yes | Pass | Pass | Pass | Activity-only conflict explicit. |
| Fresh exact-target open | Yes | Pass | Pass | Pass | Failure-before-mount clear. |
| Activity revision/batch semantics | Yes | Pass | Pass | Pass | Clear/ABA/no-op/highlight/window concrete. |
| Standalone keep-live/replacement | Yes | Pass | Pass | Pass | DS-008 distinguishes no-replacement keep-live from guarded Activity-first replacement and preserves public ordering. |
| Status/content independence | Yes | Pass | Pass | Pass | `active + Idle` renders work. |
| No-server-diff scope | Yes | Pass | Pass | Pass | Explicit/testable. |

## Material Premise Validation (Only When Needed)

### `MP-001` — Ordinary Team reconnect can leave a mounted context without retained projection replay

- Related approved requirement or established contract: R-003–R-004; AC-002–AC-003, AC-009.
- Relevant behavior ID(s): `BEH-002`, `BEH-003`.
- Initiating basis kind: `System`.
- Independent product-supported initiating trigger or applicable governing contract: Unexpected Team WebSocket disconnect while an active Team workspace remains open; supported automatic reconnect re-enters snapshot protocol.
- Support evidence: The client automatically reconnects; Team streaming retains the context; the snapshot carries topology/tasks/messages/statuses but no retained member conversation/Activity projections.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `unexpected close → reconnect → CONNECTED → TEAM_EXECUTION_VIEW_SNAPSHOT → mounted view apply`.
- Lifecycle preconditions and material consequence at the claimed point: A mounted context can miss events while disconnected; topology can be current while retained projection is not replayed.
- Reachability: `Reachable`.
- Review consequence / proportionate response: Snapshot invalidation and focused exact reconciliation are justified and complete.

### `MP-002` — A connected task-activation context starts before task work is released but is not retained-projection authority

- Related approved requirement or established contract: R-004, R-009; AC-009.
- Relevant behavior ID(s): `BEH-003`, `BEH-006`.
- Initiating basis kind: `Contract`.
- Independent product-supported initiating trigger or applicable governing contract: A running Agent delegates via the supported task contract.
- Support evidence: `task-delegation-service.ts:295-307` commits/publishes activation before `releaseWork()`. The SR-005 clean-baseline reproduction additionally proves that the frontend context materialized from the live execution-tree update can remain an `Offline`/empty shell after exact backend work exists; activation ordering alone does not project retained monitor content into that context.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `delegate_task → activation/tree event → exact default local shell → work release → Agent work/events`; later supported row selection reaches mounted inspection.
- Lifecycle preconditions and material consequence at the claimed point: The task context can exist before work and remain locally present after work without having committed an exact retained projection. Context creation therefore cannot establish monitor authority.
- Reachability: `Reachable`.
- Review consequence / proportionate response: Activation may create/associate the exact task shell but must mark it projection-non-authoritative without stealing focus. Later selection uses guarded exact hydration; the superseded live-baseline-authoritative consequence is rejected.

### `MP-003` — Activity-only mutation can race mounted hydration without changing the current presentation revision

- Related approved requirement or established contract: R-003, R-007; AC-003, AC-008, AC-012.
- Relevant behavior ID(s): `BEH-002`, `BEH-005`.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger or applicable governing contract: The operator selects a newly visible/running task while its Agent begins a normal turn.
- Support evidence: `SYSTEM_INSTRUCTIONS_SUPPLIED` mutates `agentActivityStore` through Team streaming while its event-monitor effect is `NONE`; current projection hydration clears/rebuilds Activity.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `task selection → projection fetch`; concurrently `normal turn → system-instruction Activity`; then older projection apply.
- Lifecycle preconditions and material consequence at the claimed point: The fetched projection can predate live Activity and the old presentation-only guard can pass.
- Reachability: `Reachable`.
- Review consequence / proportionate response: `SR-003` resolves `ARCH-F-001` with a separate per-run Activity revision and all-or-none composite-witness apply.

### `MP-004` — Non-mounted Team-member selection can encounter requested projection failure

- Related approved requirement or established contract: R-002–R-004; AC-002–AC-003, AC-006.
- Relevant behavior ID(s): `BEH-001`, `BEH-002`.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger or applicable governing contract: The operator selects a Team member/task whose root is not mounted; AC-006 governs fetch/validation failure.
- Support evidence: Current absent-root selection uses `openTeamRun`; current full hydration treats every projection as best-effort and can mount/focus a null target.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `tree/history selection → openTeamRun → target projection failure/mismatch`.
- Lifecycle preconditions and material consequence at the claimed point: No local root exists and the exact requested target cannot be established; current code can otherwise present a false-empty row.
- Reachability: `Reachable`.
- Review consequence / proportionate response: `SR-003` resolves `ARCH-F-002` with exact target authority before candidate commit and previous-selection preservation.

### `MP-005` — Standalone history/deep-link open can load a projection while the exact run already has a live subscribed context

- Related approved requirement or established contract: Requirements preserved behavior boundary `PB-001`.
- Relevant behavior ID(s): `PB-001`.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger or applicable governing contract: The user opens an active standalone Agent from run history or a workspace execution deep link while that run's stream/context is already present.
- Support evidence: `openHistoricalRun` and `openWorkspaceExecutionLink` both call `openAgentRun`; `decideRunOpenStrategy` returns `KEEP_LIVE_CONTEXT` for an active run with an existing subscribed context; current coordinator tests assert that projected Activity is not applied on this branch and hydrated file changes are merged.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `history row or execution deep link → openAgentRun → projection/resume/files load while current context/stream continue → post-load KEEP_LIVE_CONTEXT decision`.
- Lifecycle preconditions and material consequence at the claimed point: The exact standalone run is active and its stream is ready; applying the older staged projection would overwrite live conversation/Activity.
- Reachability: `Reachable`.
- Review consequence / proportionate response: DS-008 re-evaluates strategy after loading, discards staged conversation/Activity on keep-live, and limits updates to the current permitted config/file merge. Replacement branches separately require unchanged context identity and Activity revision before any selection/stream mutation.

### `MP-006` — The exact stale task-row/current-monitor contradiction is deterministically reachable on node 8001 through a supported live production trigger

- Related approved requirement or established contract: The user's explicit prerequisite that this exact contradiction be reproduced live and deterministically before solution progression; BEH-001 and BEH-003.
- Relevant behavior ID(s): `BEH-001`, `BEH-002`, `BEH-003`.
- Initiating basis kind: `User/System`.
- Independent product-supported initiating trigger or applicable governing contract: In a fresh browser over an active mounted Nested Classroom Team, the user sends a normal message to Teacher requesting supported delegation to the nested StudentStudyGroup; its student_one coordinator uses supported `delegate_task` for sibling student_two; the live Team stream adds the exact transient row; the user waits 20 seconds and selects that row.
- Support evidence: Clean detached frontend baseline `80e2bd195`, Docker node 8001, `codex_app_server`, GPT-5.6 Luna. `deterministic-reproduction-summary.json` records 3/3 stale live selections and 1/1 successful fresh-open control. The strongest round's exact backend projection already had five conversation entries and three Activity items more than six seconds before click. Browser/store evidence shows exact row, navigation focus, execution-view focus, and local context ID all equal `student_two_617e2f1d206245e5b6bd4ae450284846`, yet the context stayed `Offline`/0/0 through +10 seconds; live selection made zero exact projection requests and reported no page errors. Before/after screenshots, backend projection/topology, the repeatable probe, and the fresh-open JSON/PNG corroborate the path.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `normal user message → Teacher delegate_task → nested task Team → student_one sibling delegate_task → live execution-tree update → TeamExecutionViewState context association → default Offline/empty exact shell → row click → mounted hasAgentRun branch → focus/navigation-only helper → exact current row over false-empty monitor`.
- Lifecycle preconditions and material consequence at the claimed point: The root Team is active/mounted with Teacher focused; no reload/reopen/reconnect occurs; exact task backend content exists before click. The UI then truthfully selects the exact ID but falsely presents its retained monitor as Offline/empty while the Team pane still shows task In progress and its ordinary message.
- Reachability: `Reachable — reproduced 3/3`.
- Review consequence / proportionate response: `SR-005` resolves `ARCH-F-006`. A live-created local task context remains non-authoritative until guarded exact projection commit; mounted inspection must stage, validate, and commit exact content before target focus/current/outer selection, preserving the previous coherent selection and exposing the approved retry/error state on failure.

## Unresolved Approved-Behavior Or Current-State Gaps

`None`. `ARCH-F-006` is resolved by the clean-baseline deterministic reproduction and SR-005 authority correction.

## Review Decision

`Pass` — `SR-005` resolves the deterministic evidence gate and corrects activation/live-context authority without changing approved behavior. The primary supported defect now has a repeatable forward production path, the exact mounted target must become projection-authoritative before focus/current selection, and every remaining mechanism is tied to an independently reachable path. Implementation may resume against `SR-005`.

## Findings

`None`. Prior `ARCH-F-001`–`ARCH-F-005` remain resolved. `ARCH-F-006` is resolved in `ARCH-REV-005`.

## Classification

`N/A` — Pass.

## Recommended Recipient

`/implementation_engineer`

## Residual Risks

- Continuous mounted mutation may exhaust bounded retries and expose Retry; it must never overwrite live state.
- Standalone replacement may fail on a context/Activity conflict; the prior context, selection, and stream must remain unchanged.
- Activity writer exclusivity/read-only access and revision advancement for every Activity-content mutation/retention invalidation remain implementation invariants.
- Activation-created or otherwise locally materialized task shells must not gain projection authority from mere existence, activation ordering, row visibility, or metadata; only a guarded exact projection commit establishes authority.
- `In progress · Idle` with completion-like prose or an ordinary handoff is expected; no prompt, tool-choice, lifecycle, server, or persistence correction is authorized.
- The paused uncommitted frontend work predates `SR-005`; implementation must reconcile it to the corrected authority semantics and must not treat it as reproduction evidence.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass` — `MP-001`–`MP-006` are `Reachable`; `MP-006` is reproduced 3/3 and `MP-002` no longer mistakes activation ordering for retained-projection authority.
- Notes: `ARCH-REV-005` supersedes the round-4 Blocked result. `ARCH-F-006` is resolved, all earlier findings remain resolved, and implementation may resume only after reconciling the paused frontend state to `SR-005`. The `autobyteus-server-ts/**` no-change guardrail remains mandatory.
