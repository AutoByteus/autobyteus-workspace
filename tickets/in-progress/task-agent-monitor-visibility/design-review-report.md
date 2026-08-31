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
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/student-two-monitor-probe-round3-after-click.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/round3-backend-projection.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/round3-backend-topology.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/round2-fresh-open-control.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/round2-fresh-open-control-after-click.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/user-verification-electron-29695/user-verification-summary.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/user-verification-electron-29695/backend-state.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/user-verification-electron-29695/electron-task-one-selected.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/user-verification-electron-29695/electron-task-two-selected.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/user-verification-electron-29695/electron-two-task-rows.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/user-verification-electron-29695/LIVE_EARLY_SELECT_SR006_A-summary.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/user-verification-electron-29695/LIVE_EARLY_SELECT_SR006_A-reconnect-status.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/user-verification-electron-29695/reproduce-live-selected-before-work.cjs`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/user-verification-electron-29695/LIVE_EARLY_SELECT_SR006_A-reproduction.raw.json.gz`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/user-verification-electron-29695/LIVE_EARLY_SELECT_SR006_A-selected-immediately.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/user-verification-electron-29695/LIVE_EARLY_SELECT_SR006_A-plus-30s.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/user-verification-electron-29695/LIVE_EARLY_SELECT_SR006_A-plus-60s.png`
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001`–`SR-006` (`SR-006` is current; `SR-001` remains superseded)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-006`
- Current Review Round: `6`
- Triggering Downstream Artifacts Reviewed:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/implementation-handoff.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/code-review-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/handoff-summary.md`
- Trigger: User verification rejected the delivered Electron candidate. `/solution_designer` returned `SR-006` after a current-source/packaged-backend experiment proved a missing post-durability task-Agent event-egress edge and corrected the technical design from frontend-only to a bounded cross-boundary fix.
- Prior Review Round Reviewed: Round 5 / `ARCH-REV-005` / `Pass`; that readiness result was superseded by the failed delivered live journey.
- Latest Authoritative Round: `6`
- Current-State Evidence Basis: Against the packaged embedded backend on node 29695, an exact task was selected at one conversation/one Activity; the exact backend projection reached 6/4 while the selected UI remained `Offline`/1/1 through +60 seconds. The healthy root socket carried 227 frames, including 221 configured-Agent frames, activation, and Team communication, but zero Agent frames for the exact task AgentRun; reconnect snapshot read that exact handle as `Idle`. Current and packaged source show `MixedTaskAgentExecutionRegistry` permanently injects an enqueue-only closure, drains its queue once before assignment work, and never switches later events to the root publisher. The prior node-8001 evidence independently retains the frontend first-inspection/recovery basis.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status (`Confirmed`/`Contradicted`/`Blocked`): `Confirmed`.
- Approved requirements / intended behavior understood: `Yes`. The user-approved observable contract is continuous exact task-AgentRun monitor visibility and truthful separate lifecycle/execution presentation. SR-006 changes the proven technical dependency, not the requested surface behavior.
- Relevant existing behavior and evidence confirmed: `Yes`. MP-006 establishes the first-inspection frontend authority gap. MP-007 independently establishes the post-activation server event-egress gap through an already-open supported direct sibling delegation, exact projection growth, complete root-socket capture, snapshot control, and source/package trace.
- Scope guardrail confirmed (`In-Scope Use Cases` / `Out of Scope` / `Preserved Behavior Boundary` / `Review Authority`): `Yes`.
- Approved change, preserved behavior, and outside scope understood: `Yes`. The server change is limited to the direct task-Agent registry's existing event callback handoff. No prompt, collaboration tool, task policy/service, persistence, lifecycle, DTO/projector, polling, or Team-message inference change is authorized.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID (`Yes`/`No`): `Yes`; there are no current blocking findings.
- Remaining material ambiguity, if any: `None` affecting design readiness. The environment-gated server LLM E2E and real-backend post-fix browser proof are required downstream validation, not missing current-state reachability evidence.

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | User | Pass | Pass | Pass | Confirmed | None. Mounted exact-task selection establishes retained authority before focus and the repaired root stream advances the same exact context afterward. |
| `BEH-002` | User/System | Pass | Pass | Pass | Confirmed | None. Retained hydration and live egress have distinct, complementary owners; neither a shell nor one early active snapshot is permanent authority. |
| `BEH-003` | System | Pass | Pass | Pass | Confirmed | None. View-owned focus plus activation/snapshot/settlement effects preserve cross-surface convergence without focus theft. |
| `BEH-004` | User | Pass | Pass | Pass | Confirmed | None. One mapper separates formal lifecycle from execution status. |
| `BEH-005` | User/System | Pass | Pass | Pass | Confirmed | None. Existing exact task work/ordinary handoffs flow through projection and repaired Agent-event transport independently of lifecycle/tool choice. |
| `BEH-006` | User/System | Pass | Pass | Pass | Confirmed | None. Compound root/run identity and the existing event execution binding preserve configured/task/repeated-run isolation. |
| `BEH-007` | System/Contract | Pass | Pass | Pass | Confirmed | None. The owner-local durability gate withholds before activation publication, drains FIFO under a releasing state, then directly forwards later events to the unchanged root publisher. |
| `PB-001` | Preserved User/System | Pass | Pass | Pass | Confirmed | None. Active subscribed standalone contexts keep live content; replaceable candidates commit coherently before selection/stream policy. |
| `PB-002` | Preserved System/Contract | Pass | Pass | Pass | Confirmed | None. Failed/aborted preparation starts no work and emits no task-Agent event; successful activation precedes one ordered drain and idempotent work release. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? (`Pass`/`Fail`) | Linked To Relevant Core Artifacts? (`Pass`/`Fail`) | Internally Complete? (`Pass`/`Fail`) | Consistent With Related Core Artifacts? (`Pass`/`Fail`) | Status And Approval Applicability Are Clear? (`Pass`/`Fail`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `ui-ux-spec.md` | Pass | Pass | Pass | Pass | Pass | None. Observable behavior remains approved; SR-006 only corrects its proven transport dependency. |
| Node-8001 comparison, deterministic summary/probe, backend JSON, and PNG controls | Pass | Pass | Pass | Pass | Pass | None. They remain the independent MP-006 first-inspection/recovery basis. |
| `user-verification-summary.json`, `backend-state.json`, and Electron screenshots | Pass | Pass | Pass | Pass | Pass | None. They establish that the delivered frontend candidate remained assignment-only for worked exact task runs. |
| `LIVE_EARLY_SELECT_SR006_A-summary.json` | Pass | Pass | Pass | Pass | Pass | None. It compactly establishes exact timing, projection growth, frozen UI, and the zero-exact-Agent-frame root-socket audit. |
| Reconnect-status control | Pass | Pass | Pass | Pass | Pass | None. It proves the exact live handle was `Idle` while the early-selected UI remained stale `Offline`. |
| `reproduce-live-selected-before-work.cjs`, raw gzip capture, and timed PNGs | Pass | Pass | Pass | Pass | Pass | None. Syntax/parse checks pass and the durable capture retains actual GraphQL, WebSocket, DOM/Pinia, timing, runtime/model, and no-reload/refocus path. |
| Prior implementation/code/API-E2E/delivery handoff artifacts | Pass | Pass | Pass | Pass | Pass | None. Their pre-user-verification passes are explicitly historical/superseded; their coverage exclusions and failure reroute explain why SR-006 is required. |

The canonical supplement inventory is complete and cross-linked. The new evidence corrects, rather than contradicts, MP-006: frontend authoritative first inspection works in the delivered candidate, but an active exact monitor cannot continue without the server's missing task-Agent Agent-event edge.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Requirements, investigation, and design classify a cross-boundary bug fix with one bounded server event-egress correction plus retained frontend safeguards. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | MP-007 proves the primary immutable enqueue-only publisher defect; MP-006 independently proves the frontend first-inspection authority gap. Configured-Agent frames, snapshot status, exact persistence, and fresh hydration isolate the owners. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | The registry needs a small owner-local durability gate; the reviewed frontend focus/hydration/Activity/presentation refactor remains necessary. DTO, publisher, prompt, tool, persistence, and lifecycle redesigns are rejected. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | DS-001–DS-009, boundary rules, interface shapes, file map, removal sequence, unit/root-socket/browser coverage, and forbidden alternatives make the two-part correction implementation-ready. | None. |

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
| `DS-009` | Direct task-Agent durability-gated root event egress | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

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
| Task-Agent durability event gate | Pass | Pass | Pass | Pass | The registry owns prepared/releasing/live/aborted state and the handle receives one callback; no raw queue or alternate publisher escapes. |
| Root event publisher / WebSocket projectors | Pass | Pass | Pass | Pass | Existing sequence and DTO owners remain unchanged after gate release. |
| Server semantic no-change boundary | Pass | Pass | Pass | Pass | Prompt, tools, task policy/service, persistence, and lifecycle remain out of scope. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Execution view / navigation | Pass | Pass | Pass | Pass | Navigation only derives. |
| Activity store / adapter | Pass | Pass | Pass | Pass | Adapter is pure; writes use revisioned store actions. |
| Mounted hydration / inspection | Pass | Pass | Pass | Pass | Non-authoritative live shell triggers exact staging; complete witness precedes synchronous apply and focus. |
| Fresh hydration / open | Pass | Pass | Pass | Pass | Exact target; nonfocus misses remain non-authoritative. |
| Standalone hydration / Agent open | Pass | Pass | Pass | Pass | Candidate loading cannot write; keep-live never replaces Activity; replacement validates identity/revision before selection/stream. |
| Task-Agent registry / root publisher | Pass | Pass | Pass | Pass | Gate owns pre-activation buffering and drain; root publisher alone assigns sequences and existing projectors alone shape transport. |
| Frontend / server | Pass | Pass | Pass | Pass | Frontend consumes the existing exact Team event DTOs; polling and Team-message inference are forbidden. |

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
| `TaskAgentDurabilityEventGate.publish(event)` | Pass | Pass | Pass | Low | Pass |
| `releaseToLive()` | Pass | Pass | Pass | Medium | Pass |
| `abort()` | Pass | Pass | Pass | Low | Pass |
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
| Root event publisher and Team Agent-event projectors | Pass | Pass | N/A | Pass | Reuse unchanged; source/frame evidence shows the missing edge is before these owners. |
| Direct task-Agent publisher handoff | Pass | Pass | Pass | Pass | Correct the current registry owner instead of adding a transport, DTO, poller, or task-service policy. |
| Server prompt/tool/task policy/persistence/lifecycle | Pass | Pass | N/A | Pass | Preserve unchanged. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend Team execution | Pass | Pass | Pass | Pass | View owns focus/topology. |
| Frontend Activity/hydration/open | Pass | Pass | Pass | Pass | Store, services, and coordinators remain distinct. |
| Frontend standalone Agent open | Pass | Pass | Pass | Pass | DS-008 assigns candidate loading and open strategy to existing owners. |
| Frontend history/UI | Pass | Pass | Pass | Pass | Facade/read model is coherent. |
| Server mixed direct task-Agent execution | Pass | Pass | Pass | Pass | Existing registry gains only the durability-gated handoff into the existing root publisher. |
| Server prompt/tool/task policy/persistence/lifecycle | Pass | Pass | Pass | Pass | Unchanged. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Task lifecycle/context presentation | Pass | Pass | Pass | Pass | Shared mapper. |
| Compound inspection identity/result | Pass | Pass | Pass | Pass | Root/run only. |
| Activity projection staging | Pass | Pass | Pass | Pass | Pure adapter. |
| Activity revision/batch replacement | Pass | Pass | Pass | Pass | Store-owned transaction. |
| Standalone projection candidate | Pass | Pass | Pass | Pass | `runContextHydrationService.ts` owns one staged exact-run shape. |
| Task-Agent durability event gate | Pass | Pass | Pass | Pass | Owner-local state/FIFO replaces the immutable enqueue-only closure without becoming a generic queue framework. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TeamExecutionTaskPresentation` | Pass | Pass | Pass | N/A | Pass | Raw redundant status removed. |
| `TeamMemberInspectionIdentity` | Pass | Pass | Pass | N/A | Pass | Address excluded. |
| `ActivityProjectionReplacement` | Pass | Pass | Pass | N/A | Pass | Expected revision plus staged content. |
| `TeamRunHydrationCandidate` | Pass | Pass | Pass | Pass | Pass | Carries context, authority, and revisions intact. |
| `RunContextHydrationCandidate` | Pass | Pass | Pass | Pass | Pass | Exact run, built content/files/config, and expected Activity revision have one staged meaning. |
| `TaskAgentDurabilityEventGate` state/FIFO | Pass | Pass | Pass | N/A | Pass | `prepared`, `releasing`, `live`, and `aborted` have one owner-local publication meaning; the root publisher remains the sole sequence owner. |

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
| `mixed-task-agent-execution-registry.ts` | Pass | Pass | Pass | Pass | Existing direct task-Agent preparation owner contains the bounded gate and work-release handoff. |
| Registry unit and mixed-task-delegation E2E tests | Pass | Pass | N/A | Pass | Owner contract covers pre-release isolation/FIFO/reentrancy/live/abort; real socket coverage proves activation-before-exact-Agent-event. |
| Root publisher/projector and prompt/tool/task-policy/persistence/lifecycle files | Pass | Pass | N/A | Pass | Explicitly unchanged. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `services/runHydration` | Pass | Pass | Low | Pass | Projection construction/application. |
| `services/runOpen` | Pass | Pass | Low | Pass | Inspection/open sequencing. |
| `services/teamExecution` | Pass | Pass | Low | Pass | View/task projection. |
| `stores` | Pass | Pass | Medium | Pass | Facade/read model plus Activity owner. |
| `agent-team-execution/backends/mixed/members` | Pass | Pass | Low | Pass | Registry already owns direct task-Agent preparation and injected publication callback. |
| Server unit/E2E runtime tests | Pass | Pass | Low | Pass | Adjacent owner invariant plus existing real root Team-socket path. |
| Unchanged server subsystems | Pass | Pass | Low | Pass | No prompt/tool/task-policy/persistence/lifecycle or DTO/projector placement change. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Direct navigation focus patch | Pass | Pass | Pass | Pass | Remove exports/callers/tests. |
| False local hydration helper | Pass | Pass | Pass | Pass | Typed inspection replaces it. |
| Duplicate lifecycle derivation/raw status | Pass | Pass | Pass | Pass | Shared presentation replaces both. |
| `hydrateActivitiesFromProjection` writer | Pass | Pass | Pass | Pass | Team and standalone consumers are mapped; repository-wide import search gates deletion. |
| `teamRunMemberStatusHydration.ts` | Pass | N/A | Pass | Pass | Zero-caller helper and stale test mocks are removed without a compatibility wrapper. |
| Permanent `retainedEvents` enqueue closure + one-shot splice | Pass | Pass | Pass | Pass | Replaced cleanly by the owner-local gate; no fallback sink, poller, or second transport remains. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Team focus | No | Pass | Pass | One authority. |
| Projection hydration | No | Pass | Pass | No parent fallback, blind replacement, or clear/add compatibility writer intended. |
| Task lifecycle presentation | No | Pass | Pass | No raw/derived dual model. |
| Task-Agent event egress | No | Pass | Pass | One gate replaces the broken sink; no old/new publisher paths coexist. |
| Server prompts/tools/task policy/persistence/lifecycle | No | Pass | Pass | Preserved out of scope. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Execution tree, task records, messages, traces, exact projections | `Directly Usable — No Migration` | Pass | Pass | N/A | Pass | Current readers/node evidence establish direct use; the runtime event-sink handoff changes no stored or DTO field. Current traceability uses R-009 and AC-007/AC-013/AC-015 without adding migration behavior. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Task-Agent durability gate and root event handoff | Pass | Pass | Pass | Pass |
| Activity revision and projection adapter | Pass | Pass | Pass | Pass |
| Standalone candidate/open migration | Pass | Pass | Pass | Pass |
| Mounted hydration/inspection | Pass | Pass | Pass | Pass |
| Activation-shell projection authority | Pass | Pass | Pass | Pass |
| Fresh exact-target open | Pass | Pass | Pass | Pass |
| Focus/navigation and stream convergence | Pass | Pass | Pass | Pass |
| Presentation/UI/server guardrail | Pass | Pass | Pass | Pass |

The sequence corrects and unit-locks the server gate first, then preserves the reviewed frontend migration order. Repository-wide removal checks, a narrow server-diff gate, strengthened real Team-socket coverage, and actual real-backend early-selection validation gate completion.

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Task-Agent event gate | Yes | Pass | Pass | Pass | Prepared/releasing/live/aborted states, FIFO drain including synchronous reentrancy, activation ordering, and abort/no-work are concrete. |
| Live-created shell authority | Yes | Pass | Pass | Pass | Activation/context materialization is explicitly non-authoritative; exact guarded commit precedes focus/current selection. |
| Mounted composite witness | Yes | Pass | Pass | Pass | Activity-only conflict explicit. |
| Fresh exact-target open | Yes | Pass | Pass | Pass | Failure-before-mount clear. |
| Activity revision/batch semantics | Yes | Pass | Pass | Pass | Clear/ABA/no-op/highlight/window concrete. |
| Standalone keep-live/replacement | Yes | Pass | Pass | Pass | DS-008 distinguishes no-replacement keep-live from guarded Activity-first replacement and preserves public ordering. |
| Status/content independence | Yes | Pass | Pass | Pass | `active + Idle` renders work. |
| Narrow server-diff scope | Yes | Pass | Pass | Pass | Only registry event egress and adjacent coverage change; DTO/projector/prompt/tool/task-policy/persistence/lifecycle remain unchanged. |

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

### `MP-007` — An early-selected direct task Agent deterministically becomes stale because its post-activation Agent events never enter the root Team stream

- Related approved requirement or established contract: R-003–R-004, R-007–R-008, R-013; AC-002–AC-003, AC-008, AC-014, AC-017; PB-002.
- Relevant behavior ID(s): `BEH-001`, `BEH-002`, `BEH-005`, `BEH-007`, `PB-002`.
- Initiating basis kind: `User/System`.
- Independent product-supported initiating trigger or applicable governing contract: In an already-open Nested Classroom Team using the packaged embedded backend, the user asks configured student_one to use the supported `delegate_task` operation for configured sibling student_two, then selects the live-created exact task row immediately before its later work.
- Support evidence: `LIVE_EARLY_SELECT_SR006_A-summary.json` and raw gzip capture use the current renderer, backend 29695, Codex runtime, and GPT-5.6 Luna. Exact selection correctly loaded a 1/1 projection; backend projection reached 6/4 by +30 seconds while the exact focused UI stayed `Offline`/1/1 through +60 seconds. The root socket delivered 227 frames, including 221 configured-Agent frames, activation, and Team messages, but zero exact task-Agent Agent frame. A reconnect snapshot reported the exact handle `Idle`. Current and packaged registry source inject `publish: event => retainedEvents.push(event)`, splice the array once before posting assignment, and never redirect the callback; the handle adapter and root projector already support the missing events.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `configured student_one delegate_task → direct task-Agent prepare/private candidate → durable tree/task commit → task activation root publish → releaseWork one-shot drain → assignment post → task Agent status/turn/content/tool events → MixedAgentMemberHandle adapter → immutable enqueue-only retainedEvents sink → no root sequence/WebSocket event → early selected exact context remains stale while raw projection persists work`.
- Lifecycle preconditions and material consequence at the claimed point: The root is active, mounted, and connected; the exact task is durably active and selected; configured-Agent frames prove the same socket/projector is healthy. Missing exact post-activation frames prevent the selected monitor/status from advancing without recovery despite authoritative exact backend work.
- Reachability: `Reachable — reproduced`.
- Review consequence / proportionate response: DS-009 is required at the registry owner. The callback buffers while prepared/releasing, activation publishes first, a synchronous FIFO loop drains buffered plus reentrant publications, state becomes live only when empty, and later events forward once through the existing root publisher. Abort/dispose closes the gate and starts no work. Polling, Team-message inference, DTO duplication, or lifecycle/prompt changes are unsupported and rejected.

## Unresolved Approved-Behavior Or Current-State Gaps

`None`. The failed delivered journey supersedes the old frontend-only readiness premise, and `SR-006` supplies the supported trigger, transport evidence, source/package cause, bounded owner, preserved contracts, and end-to-end validation obligations needed for the corrected design.

## Review Decision

`Pass` — the `SR-006` cross-boundary design is ready for implementation. It retains the independently required frontend exact-focus/hydration/Activity/presentation protections and adds one evidence-grounded server correction at the current publisher-injection owner. DS-009 preserves durability-before-egress, activation-before-Agent-event ordering, root sequence/DTO ownership, exact identity, abort/no-work, and existing lifecycle semantics. The post-fix real Team-socket and early-selected browser proof remain mandatory before renewed delivery.

## Findings

`None`. `ARCH-F-001`–`ARCH-F-006` remain resolved for their established paths. The newly established MP-007 is completely mapped by R-013/AC-017/PB-002 and DS-009; it does not reopen prompt, tool-choice, task-policy, persistence, or lifecycle scope.

## Classification

`N/A` — Pass.

## Recommended Recipient

`/implementation_engineer`

## Residual Risks

- The event gate must drain with a state-aware FIFO loop. Setting `live` before empty, draining a detached one-shot copy, or retaining two publication paths can strand, reorder, or duplicate synchronous reentrant events.
- Failed preparation, root termination/disposal, and persistence finalization-indeterminate paths must close/discard any prepared gate and start no work; repeated successful release remains idempotent.
- The environment-gated server LLM E2E was not part of the prior executed evidence. Implementation/API-E2E must execute it or an equivalent actual root Team-socket proof and must separately prove AC-017 in an already-open real-backend browser with early selection and no reload/refocus.
- Continuous mounted mutation may exhaust bounded frontend hydration retries; it must preserve prior coherent selection and expose Retry rather than overwrite live state.
- Activity revision completeness, standalone keep-live behavior, same-address isolation, and activation-created non-authoritative shell semantics remain implementation invariants from the prior reviewed frontend work.
- `In progress · Idle` with work-like prose or ordinary handoff remains valid; no prompt, collaboration-tool, task-policy/service, persistence, or lifecycle correction is authorized.
- The SR-006 request message names `origin/main`, while the canonical bootstrap/delivery artifacts and actual remote use `origin/personal` at `80e2bd195` and no `origin/main` ref exists. This is non-architectural; implementation stays on the current ticket branch, and delivery must re-confirm the actual tracked finalization target before integration.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass` — `MP-001`–`MP-007` are `Reachable`; MP-006 independently governs first-inspection hydration and MP-007 governs continuous post-activation task-Agent event egress.
- Notes: `ARCH-REV-006` supersedes `ARCH-REV-005` as the current readiness authority. The earlier delivered candidate and its downstream passes remain historical evidence only. Implementation must preserve the reviewed frontend work, add the DS-009 registry gate and adjacent coverage, and obtain actual root-socket plus real-backend early-selection evidence before delivery. No polling, Team-message inference, DTO/projector change, prompt/tool/task-policy/persistence/lifecycle change, or migration is authorized.
