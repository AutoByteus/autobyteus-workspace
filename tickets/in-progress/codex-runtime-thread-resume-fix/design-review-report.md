# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/design-spec.md`
- Supplemental Task Artifacts Reviewed:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/runtime-reproduction-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/claude-runtime-reproduction-evidence.md`
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001`, `SR-002`, `SR-003`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: SR-003 Design Impact rework for `ARCH-FIND-001` and `ARCH-FIND-002`.
- Prior Review Round Reviewed: Round 1 / `ARCH-REV-001` — Fail, Design Impact.
- Latest Authoritative Round: Round 2 / `ARCH-REV-002`
- Current-State Evidence Basis: The unchanged user-approved requirements; both isolated browser restart reproductions; installed `@anthropic-ai/claude-agent-sdk@0.3.231` declarations; SR-003 investigation additions; and current source at base `2b0f8ea99296bb3f983c497d1f5c00a4d839f404`, especially WebSocket ingress, mixed member readiness, direct-task preparation/activation, AgentRun manager/registry and observer lifecycle, standalone provisioning/service/command paths, metadata/catalog atomic writes, root persistence locking, and Codex/Claude provider boundaries.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: Confirmed
- Approved requirements / intended behavior understood: Yes. Exact Codex and Claude provider-session continuation, provider-native identity before relied-upon input, explicit failure rather than silent replacement, preserved local history, and no fabricated historical recovery remain the approved basis.
- Relevant existing behavior and evidence confirmed: Yes. The two live reproductions and current source still establish null V1 tree bindings, changed provider identities, misleadingly visible local history, Codex resume fallback, Claude placeholder/rebinding, and the two supported overlapping-activation paths recorded in `PREM-ARCH-001` and `PREM-ARCH-002`.
- Approved change, preserved behavior, and outside scope understood: Yes. Native null identity and local history remain valid; the separate Electron/legacy migration issue and recovery of missing opaque provider IDs remain outside scope.
- Remaining material ambiguity, if any: None. SR-003 changes only target architecture and leaves the approved behavior basis unchanged.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | User / Operational | Pass | Pass — Codex restart reproduction and supported overlapping team ingress are established | Pass — DS-001/DS-002/DS-005/DS-010 join one private candidate, persist the binding, publish, then admit input | Confirmed | None |
| `BEH-002` | User / Operational | Pass | Pass — local history remains independent of provider restoration | Pass — history stays readable and provider continuation failure remains separately observable | Confirmed | None |
| `BEH-003` | System / Contract | Pass | Pass — all relevant node shapes share the binding field and direct task preparation precedes node creation | Pass — existing nodes adopt through root; direct tasks stage binding and retain their candidate until activation durability | Confirmed | None |
| `BEH-004` | System / Operational | Pass | Pass — valid standalone Codex metadata reaches restore today | Pass — DS-006 uses strict candidate restoration and exact-ID verification without fallback | Confirmed | None |
| `BEH-005` | System | Pass | Pass — null selects creation only for a fresh execution | Pass — activity inspection gates one claimed, unpublished candidate | Confirmed | None |
| `BEH-006` | System / Contract | Pass | Pass — known resume failure and prior-activity/null state are established | Pass — strict restore and explicit non-resumable failures replace silent creation | Confirmed | None |
| `BEH-007` | User / Operational / Contract | Pass | Pass — Claude restart evidence and installed SDK new-session/resume contract are established | Pass — reserved UUID, exact lifecycle confirmation, root durability, private publication, and strict resume form one coherent path | Confirmed | None |
| `BEH-008` | System / Operational | Pass | Pass — standalone placeholder timing and overlapping command ingress are established | Pass — DS-006/DS-009/DS-010/DS-011 persist or reconcile the UUID before publication/input and join all callers | Confirmed | None |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `runtime-reproduction-evidence.md` | Pass | Pass | Pass | Pass | Pass | None |
| `claude-runtime-reproduction-evidence.md` | Pass | Pass | Pass | Pass | Pass | None |

The investigation notes retain the canonical supplement inventory. Both supplements remain linked from the core package with clear purpose, requirement coverage, completion state, and approval-N/A evidence status.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The package consistently classifies a bug fix with design impact | None |
| Root-cause classification is explicit and evidence-backed | Pass | Missing invariant and ownership/boundary defects are traced through root, handle, manager, standalone, and provider code | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor needed now is explicit; historical recovery and unrelated migration stay intentionally deferred/out of scope | None |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | SR-003 concretely separates construction/publication, adds scoped single-flights, retightens provisioning/command ownership, and defines cleanup/retry/quarantine | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Team binding establishment | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-002` | Team restart resume | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-003` | Direct task activation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-004` | Error return/event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-005` | Root tree transaction | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| `DS-006` | Standalone restore | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-007` | Null-binding activity guard | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| `DS-008` | Claude provider lifecycle | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| `DS-009` | Standalone Claude creation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-010` | AgentRun candidate lifecycle | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| `DS-011` | Standalone activation single-flight | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

The two new bounded spines expose the previously hidden registry and concurrency boundaries without displacing the complete end-to-end paths.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RootTeamRun.adoptAgentPlatformBinding` | Pass | Pass | Pass | Pass | Root remains the sole committed team-binding owner |
| `MixedAgentMemberHandle.ensureReady` | Pass | Pass | Pass | Pass | One handle-owned promise joins configured/committed member callers |
| `TaskDelegationService` activation | Pass | Pass | Pass | Pass | Candidate and staged binding remain private until tree/task durability, then publication precedes work |
| `TeamRunPersistenceCoordinator` | Pass | Pass | Pass | Pass | All tree changes prepare from current state at lock head |
| `AgentRunManager.prepare*` / candidate | Pass | Pass | Pass | Pass | Exclusive pre-await claim, no raw input surface, published-only active registry, and abort/quarantine are explicit |
| `StandaloneAgentRunActivationService` | Pass | Pass | Pass | Pass | Sole standalone durability/admission owner across command, create, activate, and restore |
| `AgentConversationActivityInspector` | Pass | Pass | Pass | Pass | Returns facts only and cannot infer identity |
| `ClaudeProviderSessionLifecycle` / `ClaudeSdkClient` | Pass | Pass | Pass | Pass | UUID lifecycle and SDK option mapping remain provider-local |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Root/handle team binding path | Pass | Pass | Pass | Pass | Handle uses candidate, acceptor, and activity APIs; no store or eager-manager bypass |
| Task activation owner | Pass | Pass | Pass | Pass | Prepared execution exposes staged identity and post-durability publication only |
| AgentRun manager/candidate | Pass | Pass | Pass | Pass | Manager owns claims/registry, not team or standalone durability decisions |
| Standalone activation owner | Pass | Pass | Pass | Pass | Facades and command resolution join the service; provisioning and coordinator lose duplicate activation state |
| Metadata reconciliation | Pass | Pass | Pass | Pass | Strict read classification serves activation without moving policy into the store |
| Provider boundaries | Pass | Pass | Pass | Pass | Generic owners carry opaque IDs; Codex/Claude own protocol semantics |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `TeamAgentPlatformBindingAcceptor.accept` | Pass | Pass | Pass | Low | Pass |
| `RootTeamRun.adoptAgentPlatformBinding` | Pass | Pass | Pass | Low | Pass |
| `MixedAgentMemberHandle.ensureReady` | Pass | Pass | Pass | Low | Pass |
| `MixedAgentMemberHandle.prepareForTaskActivation` | Pass | Pass | Pass | Low | Pass |
| `PreparedTaskExecution.stagedPlatformBindings` / `commitAfterDurability` | Pass | Pass | Pass | Low | Pass |
| `AgentRunManager.prepareNewAgentRun` / strict prepare-restore | Pass | Pass | Pass | Low | Pass |
| `AgentRunActivationCandidate.commitPublication` / `abort` | Pass | Pass | Pass | Low | Pass |
| `StandaloneAgentRunActivationService.resolve*` | Pass | Pass | Pass | Low | Pass |
| Strict metadata-state read | Pass | Pass | Pass | Low | Pass |
| Activity inspector | Pass | Pass | Pass | Low | Pass |
| Claude lifecycle methods / SDK binding | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Root tree durability and mutation | Pass | Pass | N/A | Pass | Extends the existing root coordinator and mutator |
| Task pre-node transaction | Pass | Pass | N/A | Pass | Extends the existing prepared-task boundary |
| Team readiness serialization | Pass | Pass | N/A | Pass | The existing handle is the natural scope owner |
| Private-to-live AgentRun lifecycle | Pass | Pass | Pass | Pass | Manager remains registry owner; a tight candidate type encapsulates its private state |
| Standalone durable activation | Pass | Pass | Pass | Pass | A new service is justified because provisioning, command, manager, and metadata concerns must not remain split |
| Conversation activity classification | Pass | Pass | Pass | Pass | A narrow memory-owned inspector is justified |
| Strict provider restore | Pass | Pass | N/A | Pass | Extends the existing AgentRun/provider boundary |
| Claude lifecycle and SDK mapping | Pass | Pass | Pass | Pass | Small provider-owned state and binding types replace ambiguous mutation |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent-team domain and persistence | Pass | Pass | Pass | Pass | Root semantics, task policy, pure mutation, and physical commit stay separated |
| Mixed team backend | Pass | Pass | Pass | Pass | Per-member readiness and deferred task candidate mechanics stay local |
| Agent execution lifecycle | Pass | Pass | Pass | Pass | Manager owns candidate claims, construction, publication, and teardown |
| Standalone activation | Pass | Pass | Pass | Pass | One new service owns metadata durability and live admission |
| Provisioning / command coordination | Pass | Pass | Pass | Pass | Retightened to prepared-record lifecycle and command/status respectively |
| Run-history metadata / agent memory | Pass | Pass | Pass | Pass | Strict persistence and activity facts serve owners without taking policy |
| Codex / Claude provider subsystems | Pass | Pass | Pass | Pass | Exact provider protocols remain isolated |
| Streaming transport | Pass | Pass | Pass | Pass | Existing projection is reused without persistence or admission ownership |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `TeamAgentPlatformBinding` | Pass | Pass | Pass | Pass | Tight team-domain value |
| Tree transition and lock-head commit shapes | Pass | Pass | Pass | Pass | Remain inside team execution/persistence |
| `AgentRunActivationCandidate` | Pass | Pass | Pass | Pass | Reused by team, task, and standalone durability owners while manager owns its state |
| Standalone activation promise | Pass | N/A | Pass | Pass | Correctly remains private to its service rather than becoming a global coordinator |
| Strict metadata read state | Pass | Pass | Pass | Pass | Reuses the metadata subsystem |
| Claude SDK binding / UUID lifecycle | Pass | Pass | Pass | Pass | Each stays with its provider concern |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TeamAgentPlatformBinding` | Pass | Pass | Pass | Pass | Pass | Compound execution identity plus one opaque provider ID |
| Persisted `platformAgentRunId` | Pass | Pass | Pass | N/A | Pass | Existing singular schema field remains authoritative |
| `PreparedTaskExecution.stagedPlatformBindings` | Pass | Pass | Pass | Pass | Pass | Separate from task reference identity |
| `AgentRunActivationCandidate` / manager pending claim | Pass | Pass | Pass | Pass | Pass | Candidate exposes identity and mutually exclusive transitions, not raw run/input |
| Standalone activation map / metadata read state | Pass | Pass | Pass | Pass | Pass | One promise per run and exact present/missing/unreadable classification |
| Claude SDK/lifecycle structures | Pass | Pass | Pass | Pass | Pass | One immutable UUID and one discriminated query binding |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Team binding, root, tree mutator, and persistence files | Pass | Pass | Pass | Pass | Complete existing-node and lock-head path |
| Prepared task, task service, and mixed task registry | Pass | Pass | Pass | Pass | Stage/retain, commit, publish, and release responsibilities are explicit |
| `mixed-agent-member-handle.ts` | Pass | Pass | Pass | Pass | Owns the one-flight readiness/adoption/publication path |
| `agent-run-activation-candidate.ts` / `agent-run-manager.ts` | Pass | Pass | Pass | Pass | Candidate state is separated while manager remains the claim/registry authority |
| `standalone-agent-run-activation-service.ts` | Pass | Pass | Pass | Pass | One file owns standalone durability/admission and reconciliation |
| Provisioning, AgentRun service, and command coordinator files | Pass | Pass | Pass | Pass | Duplicate activation state and active-first composition are explicitly removed |
| Metadata store/service and activity inspector | Pass | Pass | Pass | Pass | Strict fact providers stay off the main sequencing line |
| Codex and Claude provider files | Pass | Pass | Pass | Pass | Exact resume and UUID/query semantics are concretely allocated |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-team-execution/domain`, `services`, and `task-delegation` | Pass | Pass | Low | Pass | Root, persistence, and task depths remain readable |
| `agent-team-execution/backends/mixed` | Pass | Pass | Medium | Pass | Mixed runtime adaptation contains only member/task readiness mechanics |
| `agent-execution/services` | Pass | Pass | Medium | Pass | Candidate manager, standalone activation, provisioning, facade, and command roles are distinct |
| `run-history` / `agent-memory` | Pass | Pass | Low | Pass | Persistence and trace semantics remain provider concerns to the owners |
| Codex / Claude backend and runtime-client folders | Pass | Pass | Low | Pass | Provider-local state stays below generic execution |
| Streaming services | Pass | Pass | Low | Pass | No new persistence/admission behavior is placed in transport |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Mixed context capture/assignment | Pass | Pass | Pass | Pass | Replaced by accepted immutable adoption |
| V1 refresh facade / personal debounce | Pass | Pass | Pass | Pass | Explicitly removed and prohibited |
| Precomputed tree commit contract | Pass | Pass | Pass | Pass | Replaced by lock-head preparation |
| Eager AgentRun manager create/restore APIs | Pass | Pass | Pass | Pass | Replaced cleanly by candidate preparation/publication; no convenience bypass remains |
| Command-coordinator and provisioning activation maps | Pass | Pass | Pass | Pass | Replaced by the standalone activation owner |
| Codex resume-to-start fallback | Pass | Pass | Pass | Pass | Exact restore failure is propagated |
| Claude placeholder/rebinding/inference/cache migration | Pass | Pass | Pass | Pass | Replaced by reserved UUID lifecycle and discriminated SDK binding |
| Duplicate standalone restore-context construction | Pass | Pass | Pass | Pass | Routed through strict manager preparation |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Team metadata refresh | No | Pass | Pass | Event-driven live-context projection is rejected |
| AgentRun eager activation | No in target | Pass | Pass | Callers and tests convert to the candidate or authoritative higher owner |
| Codex resume fallback | No in target | Pass | Pass | Fresh start remains a separate explicit path |
| Claude placeholder/session mapping | No in target | Pass | Pass | Historical placeholders are rejected rather than interpreted |
| Historical null recovery | No | Pass | Pass | No guessed ID or local-history replay |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| V1 team tree `platformAgentRunId` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Existing schema/readers already carry valid non-null opaque IDs |
| Standalone AgentRun metadata | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Valid IDs are directly usable; null/local-ID placeholders contain no safe recoverable provider identity |

The candidate/publication rework changes live ordering only. It introduces no stored field, version branch, or reason to rewrite existing data.

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| AgentRun candidate construction/publication | Pass | Pass | Pass | Pass |
| Standalone activation/service retightening | Pass | Pass | Pass | Pass |
| Root tree binding and task lock-head conversion | Pass | Pass | Pass | Pass |
| Team readiness and direct-task deferred publication | Pass | Pass | Pass | Pass |
| Strict restore and provider failures | Pass | Pass | Pass | Pass |
| Claude lifecycle/client refactor | Pass | Pass | Pass | Pass |
| Final bypass/removal search and concurrency checks | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Two overlapping team commands | Yes | Pass | Pass | Pass | Promise installation, one candidate, root commit, publication, and shared result are explicit |
| Direct task staging/publication | Yes | Pass | Pass | Pass | Candidate stays private through task/tree commit and work is released last |
| Candidate cleanup/quarantine | Yes | Pass | Pass | Pass | Failure matrix defines confirmed abort, indeterminate state, and retry rules |
| Standalone overlapping activation/write error | Yes | Pass | Pass | Pass | Same promise and exact committed/unchanged/indeterminate reconciliation are concrete |
| Lock-head tree mutation | Yes | Pass | Pass | Pass | Lost-update shape and replacement are explicit |
| Strict restore / broken historical null | Yes | Pass | Pass | Pass | Fail-closed behavior is concrete |
| Claude UUID lifecycle and SDK mapping | Yes | Pass | Pass | Pass | Create, query-open uncertainty, confirmation, and resume are clear |

## Material Premise Validation (Only When Needed)

### `PREM-ARCH-001` — Two supported first commands can overlap while one team member is still initializing

- Related approved requirement or established contract: `REQ-001`, `REQ-003`, `REQ-004`, `REQ-010`; normal same-process team messaging.
- Relevant behavior ID(s): `BEH-001`, `BEH-003`, `BEH-005`, `BEH-007`.
- Initiating basis kind: User / System.
- Independent product-supported initiating trigger or applicable governing contract: In the team-conversation surface, a user sends more than one normal message before the first lazy member initialization completes; a normal team/system delivery can likewise overlap a user command to that member.
- Support evidence: `/ws/agent-team/:teamRunId` dispatches socket messages independently (`src/api/websocket/agent.ts:121-133`), and `AgentTeamStreamHandler` awaits each root command in its independently started handler (`src/services/agent-streaming/agent-team-stream-handler.ts:84-104`).
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Two `SEND_MESSAGE` deliveries -> two root commands -> the same `MixedAgentMemberHandle.ensureReady` -> the first installs `readinessAttempt` before async work and the second joins it -> one manager claim/private candidate -> root durability -> synchronous publication -> both callers continue through the same AgentRun.
- Lifecycle preconditions and material consequence at the claimed point: The configured external member is lazily uninitialized. Without joining, current code can create competing provider sessions; in SR-003, the handle-owned promise and manager claim guarantee one candidate and one accepted binding.
- Reachability: Reachable.
- Review consequence / proportionate response: The SR-003 handle single-flight plus unpublished manager candidate is required and proportionate; `ARCH-FIND-001` is resolved.

### `PREM-ARCH-002` — A concurrent standalone command can otherwise observe a fresh AgentRun before standalone metadata activation commits

- Related approved requirement or established contract: `REQ-009`, `REQ-010`, `REQ-011`; provider binding must be durable before first standalone Claude input can be relied upon.
- Relevant behavior ID(s): `BEH-008`.
- Initiating basis kind: User / Operational.
- Independent product-supported initiating trigger or applicable governing contract: A user sends two distinct messages rapidly on the standalone agent conversation stream while a prepared external run is being activated; abrupt process restart is the approved continuity boundary.
- Support evidence: `/ws/agent/:runId` dispatches messages independently (`src/api/websocket/agent.ts:60-72`; `src/services/agent-streaming/agent-stream-handler.ts:165-180`). Current coordinator/manager/provisioning ordering allows the second command to observe an early active run.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Two `SEND_MESSAGE` deliveries -> both coordinators request command readiness -> `AgentRunService` routes both to `StandaloneAgentRunActivationService` -> one per-run promise/private candidate -> reserved UUID validation -> exact `recordRunStarted` commit or strict reconciliation -> synchronous publication -> both commands receive the same run and only then post input.
- Lifecycle preconditions and material consequence at the claimed point: The run is prepared but not durably started. Current code can accept input in the early-registration window; SR-003 removes that registry visibility and the active-first/duplicate activation maps.
- Reachability: Reachable.
- Review consequence / proportionate response: The SR-003 standalone owner, strict reconciliation, and published-only registry are required and proportionate; `ARCH-FIND-002` is resolved.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

**Pass** — SR-003 resolves both prior Design Impact findings. The cumulative design is behavior-grounded, structurally coherent, actionable in the current codebase, and ready for implementation.

## Findings

None.

## Classification

N/A — Pass.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Exact recovery remains impossible for historical null bindings and Claude local-ID placeholders; explicit non-resumable behavior is correct.
- A durably reserved Claude UUID may remain unmaterialized after a crash; exact resume may fail and must not create a replacement.
- Provider/backend cleanup failure may leave an unused remote artifact. The retained claim/quarantine must keep it unreachable from live input and forbid same-process replacement.
- Post-durability publication is intentionally an invariant-only, synchronous step. Any impossible claim mismatch must fail-stop/quarantine and must not release task work or standalone input.
- Downstream API/E2E owns final durable-coverage validity and realistic Codex/Claude restart execution.

## Latest Authoritative Result

- Review Decision: Pass
- Material-Premise Gate: Pass — both retained concurrency mechanisms are backed by independent product-supported triggers and full forward paths.
- Notes: `ARCH-FIND-001` and `ARCH-FIND-002` are resolved by SR-003. The cumulative SR-001/SR-002/SR-003 package is implementation-ready.
