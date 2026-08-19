# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/design-spec.md`
- Supplemental Task Artifacts Reviewed:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/runtime-reproduction-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/claude-runtime-reproduction-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/autobyteus-runtime-reproduction-evidence.md`
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001`, `SR-002`, `SR-003`, `SR-004`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: User-approved native AutoByteus restart-continuity expansion and SR-004 upstream rework after halted implementation/code review.
- Prior Review Round Reviewed: Round 2 / `ARCH-REV-002` — Pass for the SR-003 Codex/Claude scope.
- Latest Authoritative Round: Round 3 / `ARCH-REV-003`
- Downstream Rework Triggers Reviewed:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/implementation-handoff.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/implementation-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/code-review-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/code-review-revision-record.md`
- Current-State Evidence Basis: The explicitly approved cumulative requirements; all three isolated browser restart supplements; the authoritative base at `2b0f8ea99296bb3f983c497d1f5c00a4d839f404`; the halted partial implementation at `ddfb494e7`; `CODE-FIND-001`; and current source for TeamRun restore/materialization, mixed configured/task composition, workspace activation, activity inspection, candidate publication, native backend create/restore, tree persistence, and supported team/task ingress. `origin/personal` is comparison evidence only.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: Confirmed
- Approved requirements / intended behavior understood: Yes. The cumulative approved basis requires exact Codex and Claude continuation, native configured-member working-context restoration, valid workspace reactivation, explicit failure instead of silent replacement, and native exclusion from external binding semantics.
- Relevant existing behavior and evidence confirmed: Yes. The browser evidence and current source independently establish all three restart defects, the native temp-workspace fallback, and the halted implementation's native self-ID binding regression.
- Approved change, preserved behavior, and outside scope understood: Yes. Fresh/uninitialized native execution and newly delegated tasks remain fresh; local history remains separate; open delegated-task hydration, standalone-native changes beyond non-regression, missing external-ID recovery, and overwritten native-snapshot recovery remain outside scope.
- Remaining material ambiguity, if any: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | User / Operational | Pass | Pass — configured Codex browser restart and physical tree/provider evidence | Pass — private creation, root binding durability, publication, then strict exact restore | Confirmed | None |
| `BEH-002` | User / System | Pass | Pass — visible local history is demonstrably independent from provider/native working context | Pass — history is preserved while runtime restoration is separately enforced and observable | Confirmed | None |
| `BEH-003` | System / Contract | Pass | Pass — configured/task nodes and native self-ID accessor are confirmed in source and `CODE-FIND-001` | Pass — external-only binding staging/adoption; native nodes remain outside the binding lifecycle | Confirmed | None |
| `BEH-004` | User / System | Pass | Pass — existing standalone Codex metadata restore is supported | Pass — standalone single-flight and strict candidate restoration are preserved | Confirmed | None |
| `BEH-005` | User / System | Pass | Pass — explicit fresh creation is supported for no-binding/no-activity state | Pass — one unpublished new candidate, applicable durability, then publication | Confirmed | None |
| `BEH-006` | System / Contract | Pass | Pass — known Codex resume fallback and prior-activity/null state are established | Pass — strict resume or explicit non-resumable error; no replacement creation | Confirmed | None |
| `BEH-007` | User / Operational / Contract | Pass | Pass — Claude browser restart and installed SDK semantics are established | Pass — reserved UUID, root durability, exact SDK create/resume, and no rebinding | Confirmed | None |
| `BEH-008` | User / Operational | Pass | Pass — standalone Claude placeholder timing and abrupt restart boundary are established | Pass — UUID metadata durability precedes publication/input and later exact resume | Confirmed | None |
| `BEH-009` | User / Operational | Pass | Pass — the supported browser stop/start/reopen/recall journey failed on base and passed in the isolated comparison control | Pass — restored provenance plus activity selects generic native restore of the same local ID/memory before input | Confirmed | None |
| `BEH-010` | User / System | Pass | Pass — a persisted requested workspace reached a missing-active-workspace temp fallback after restart | Pass — the handle invokes `WorkspaceManager.ensureWorkspaceByRootPath` before activity/candidate construction | Confirmed | None |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `runtime-reproduction-evidence.md` | Pass | Pass | Pass | Pass | Pass | None |
| `claude-runtime-reproduction-evidence.md` | Pass | Pass | Pass | Pass | Pass | None |
| `autobyteus-runtime-reproduction-evidence.md` | Pass | Pass | Pass | Pass | Pass | None |

The investigation notes contain the canonical three-supplement inventory. Each evidence artifact is linked from requirements/design, has a bounded purpose and complete status, and is correctly marked approval-N/A.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The package consistently classifies a large bug fix with lifecycle refactor | None |
| Root-cause classification is explicit and evidence-backed | Pass | External missing invariant, native provenance loss, workspace-owner bypass, and partial-implementation runtime conflation are separately traced | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor-needed-now is explicit; historical recovery and task hydration are intentionally excluded | None |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | Root/factory mode, handle plan, subteam split, workspace reuse, external gate, file map, sequence, examples, and coverage all implement the classification | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Configured external creation/binding | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-002` | Configured external exact restart | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-003` | Direct task activation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-004` | Error return/event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-005` | Root tree transaction | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| `DS-006` | Standalone exact restore | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-007` | Complete-corpus activity classification | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| `DS-008` | Claude session lifecycle | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| `DS-009` | Fresh standalone Claude activation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-010` | Candidate claim/publication/abort | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| `DS-011` | Standalone activation single-flight | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| `DS-012` | Restored configured native activation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-013` | Fresh configured/task native activation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

The native additions are primary spines rather than scattered conditionals. They join the previously reviewed candidate lifecycle without weakening its durability or concurrency invariant.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentTeamRunManager.createTeamRun/restoreTeamRun` | Pass | Pass | Pass | Pass | Root fresh/restore provenance originates once and is conveyed process-locally |
| `MixedTeamRunBackendFactory` / `MixedTeamRunContext` | Pass | Pass | Pass | Pass | Composition carries required configured-member mode; it does not decide per-runtime restoration |
| `MixedSubTeamRunFactory` | Pass | Pass | Pass | Pass | Configured-child inheritance and fresh-task construction are distinct subject APIs |
| `MixedAgentMemberHandle` | Pass | Pass | Pass | Pass | One private readiness attempt owns workspace, plan, candidate, applicable binding, and publication |
| `WorkspaceManager` | Pass | Pass | Pass | Pass | Existing canonical ensure API remains the active-workspace authority |
| `AgentConversationActivityInspector` | Pass | Pass | Pass | Pass | Returns strict local facts only; it cannot infer provider identity or activate runs |
| `AgentRunManager` / candidate | Pass | Pass | Pass | Pass | Generic native restore and strict external restore remain distinct; private/live lifecycle stays encapsulated |
| `RootTeamRun` / task owner | Pass | Pass | Pass | Pass | Root owns external binding/tree durability; task owner retains candidates through its durability point |
| `StandaloneAgentRunActivationService` | Pass | Pass | Pass | Pass | SR-003 single-flight/durability/admission ownership remains unchanged |
| Codex / Claude lifecycle boundaries | Pass | Pass | Pass | Pass | Provider protocol and UUID/thread semantics remain provider-local |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Root provenance and mixed composition | Pass | Pass | Pass | Pass | Root selects create/restore; contexts carry mode; transport does neither |
| Configured versus task subteam composition | Pass | Pass | Pass | Pass | Configured descendants inherit; task agents/teams force fresh |
| Mixed handle | Pass | Pass | Pass | Pass | May use workspace/activity/manager/binding acceptor; may not write stores or infer provider state |
| Workspace activation | Pass | Pass | Pass | Pass | Hash-only ID derivation is removed in favor of the owner API |
| Native versus external restore | Pass | Pass | Pass | Pass | Generic restore is native/local; strict platform-state restore is external only |
| Team platform binding | Pass | Pass | Pass | Pass | Candidate IDs cross into binding construction only under explicit external-runtime eligibility |
| Candidate/durability owners | Pass | Pass | Pass | Pass | Publication stays after root/task/standalone durability; no eager manager convenience path returns |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `MixedTeamRunBackendFactory.createBackend/restoreBackend` | Pass | Pass | Pass | Low | Pass |
| `MixedConfiguredMemberActivationMode` | Pass | Pass | Pass | Low | Pass |
| `MixedSubTeamRunFactory.materializeConfiguredChild` | Pass | Pass | Pass | Low | Pass |
| `MixedSubTeamRunFactory.prepareFreshTaskTeam` | Pass | Pass | Pass | Low | Pass |
| Handle-private `MixedAgentActivationPlan` | Pass | Pass | Pass | Low | Pass |
| `WorkspaceManager.ensureWorkspaceByRootPath` | Pass | Pass | Pass | Low | Pass |
| `AgentRunManager.prepareRestoreAgentRun` | Pass | Pass | Pass | Medium | Pass |
| `AgentRunManager.prepareRestoreAgentRunFromPlatformState` | Pass | Pass | Pass | Low | Pass |
| `TeamAgentPlatformBindingAcceptor.accept` / root adoption | Pass | Pass | Pass | Low | Pass |
| `PreparedTaskExecution.stagedPlatformBindings` / post-durability commit | Pass | Pass | Pass | Low | Pass |
| `AgentRunActivationCandidate.commitPublication/abort` | Pass | Pass | Pass | Low | Pass |

The existing generic backend platform-ID accessor remains potentially ambiguous for native implementations, but the design contains that risk at the mixed runtime-adaptation boundary instead of widening the persisted binding model.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Native snapshot restoration | Pass | Pass | N/A | Pass | Reuses generic manager restore and `AutoByteusAgentRunBackendFactory.restoreBackend` |
| Workspace reactivation | Pass | Pass | N/A | Pass | Reuses `WorkspaceManager.ensureWorkspaceByRootPath` |
| Semantic activity fact | Pass | Pass | N/A | Pass | Reuses the strict active/archive inspector |
| Root tree durability | Pass | Pass | N/A | Pass | Preserves root adoption and lock-head persistence |
| Candidate private/live lifecycle | Pass | Pass | N/A | Pass | Reuses SR-003 claim/publication/abort/quarantine |
| Configured materialization provenance | Pass | Pass | Pass | Pass | A two-value process-local mode is the missing composition fact |
| Configured-child versus task-team semantics | Pass | Pass | Pass | Pass | Split subject APIs prevent accidental inheritance |
| External provider continuation | Pass | Pass | N/A | Pass | Codex/Claude strict mechanisms are retained |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent-team root lifecycle | Pass | Pass | Pass | Pass | Owns create/restore provenance and durable topology |
| Mixed runtime composition | Pass | Pass | Pass | Pass | Owns mode propagation and runtime-adaptation plan |
| Workspace subsystem | Pass | Pass | Pass | Pass | Owns canonical active workspace instances |
| Agent memory | Pass | Pass | Pass | Pass | Owns read-only trace classification |
| Agent execution | Pass | Pass | Pass | Pass | Owns native/external candidate construction and live registry |
| Native backend | Pass | Pass | Pass | Pass | Owns local agent create/restore/snapshot bootstrap |
| Standalone activation / metadata | Pass | Pass | Pass | Pass | Retains prior exact durability/admission ownership |
| Codex / Claude providers | Pass | Pass | Pass | Pass | Retain exact provider protocol semantics |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Configured-member activation mode | Pass | Pass | Pass | Pass | Shared only across mixed composition, not persisted or globally generic |
| Handle activation plan | Pass | N/A | Pass | Pass | Correctly private to the single adaptation owner |
| `AgentRunActivationCandidate` | Pass | Pass | Pass | Pass | Reused across team/task/standalone while manager owns its state |
| `TeamAgentPlatformBinding` | Pass | Pass | Pass | Pass | Remains a tight external team identity value |
| Activity classification union | Pass | Pass | Pass | Pass | Memory-owned fact type reused without activation policy |
| Workspace canonicalization/registry | Pass | Pass | Pass | Pass | Existing owner is reused rather than duplicated |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `MixedConfiguredMemberActivationMode` | Pass | Pass | Pass | Pass | Pass | Process-local lifecycle provenance only |
| `MixedAgentActivationPlan` | Pass | Pass | Pass | Pass | Pass | Exhaustive `new / restore_native / restore_external` union |
| Persisted runtime kind + `platformAgentRunId` | Pass | Pass | Pass | Pass | Pass | Runtime kind governs field relevance; native ignores legacy self-ID and never writes a new one |
| Native local ID + memory state | Pass | Pass | Pass | Pass | Pass | Local identity and snapshot remain distinct from external binding |
| Workspace root + returned workspace ID | Pass | Pass | Pass | Pass | Pass | Root is stored input; ID is the workspace owner's process-local result |
| Candidate platform ID | Pass | Pass | Pass | Pass | Pass | Generic backend observation is consumed as a team binding only for external runtimes |
| Claude UUID lifecycle structures | Pass | Pass | Pass | Pass | Pass | Unchanged tight provider-specific state |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-team-run-manager.ts` | Pass | Pass | Pass | Pass | Root create/restore mode selection only |
| `mixed-team-run-context.ts` / `mixed-team-run-backend-factory.ts` | Pass | Pass | Pass | Pass | Required mode and explicit root composition |
| `mixed-sub-team-run-factory.ts` | Pass | Pass | Pass | Pass | Configured inheritance and fresh task construction are separate |
| configured/task member registries and subteam handle | Pass | Pass | Pass | Pass | Each passes mode from the correct provenance source |
| `mixed-agent-member-handle.ts` | Pass | Pass | Pass | Pass | Cohesive per-member workspace/plan/readiness/candidate boundary |
| `agent-run-manager.ts` / candidate | Pass | Pass | Pass | Pass | Existing generic/strict preparation and publication ownership are preserved |
| activity inspector / workspace manager | Pass | Pass | N/A | Pass | Reused fact/capability owners need no policy expansion |
| root/task/standalone/provider files from SR-003 | Pass | Pass | Pass | Pass | Prior responsibilities remain intact with the external-only conversion gate |
| obsolete generic TeamRun backend factory interface | Pass | Pass | Pass | Pass | Compile search confirms no consumer; conditional removal is actionable |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-team-execution/services` | Pass | Pass | Low | Pass | Root provenance/persistence coordination |
| `agent-team-execution/backends/mixed` | Pass | Pass | Medium | Pass | Mode and runtime adaptation belong at this boundary |
| `agent-team-execution/backends/mixed/members` | Pass | Pass | Medium | Pass | Handle remains cohesive; no new independent subsystem is hidden there |
| `agent-execution/services` | Pass | Pass | Medium | Pass | Candidate and standalone activation owners remain distinct |
| `agent-memory/services` | Pass | Pass | Low | Pass | Strict read-only evidence |
| `workspaces` | Pass | Pass | Low | Pass | Existing active-workspace owner |
| native/Codex/Claude backend folders | Pass | Pass | Low | Pass | Runtime-specific protocols remain isolated |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Root restore calling generic create path | Pass | Pass | Pass | Pass | Replaced by explicit create/restore factory entrypoints |
| Ambiguous subteam `createOrRestore` | Pass | Pass | Pass | Pass | Replaced by configured-child and fresh-task methods |
| Hash-only workspace activation assumption | Pass | Pass | Pass | Pass | Replaced by WorkspaceManager ensure result |
| Native truthy-ID binding staging/adoption | Pass | Pass | Pass | Pass | Replaced by external-runtime eligibility at every conversion point |
| Unused generic TeamRun backend factory interface | Pass | Pass | Pass | Pass | Remove after confirmed compile search; current search shows no consumer |
| V1 refresh facade / personal debounce | Pass | Pass | Pass | Pass | Remains forbidden; root binding/native provenance owners replace it |
| Eager manager create/restore and duplicate activation maps | Pass | Pass | Pass | Pass | SR-003 candidate and standalone owner remain the clean replacement |
| Codex fallback / Claude placeholder and rebinding | Pass | Pass | Pass | Pass | Strict provider restore and UUID lifecycle remain the replacement |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Process-local materialization mode | No | Pass | Pass | No persisted flag or dual reader is added |
| Historical native self-ID tree value | No | Pass | Pass | Current runtime-kind semantics ignore an irrelevant field; this is a normal reader rule, not a compatibility path |
| Native restore-to-create fallback | No | Pass | Pass | Proven activity plus restore failure fails closed |
| Team metadata refresh | No | Pass | Pass | Event/debounce writer is not restored |
| External provider fallback/placeholder | No | Pass | Pass | Strict exact paths remain clean-cut |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| V1 tree runtime kind / `platformAgentRunId` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | External reads exact opaque ID; native ignores the field and new native mutations keep it null |
| Native local ID, traces, and working snapshot | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Existing local ID/memory directory are the generic native restore inputs; no schema rewrite is needed |
| Persisted workspace root | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Existing root is reactivated through WorkspaceManager and the returned ID is process-local |
| Standalone metadata / external bindings | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Valid identities remain directly usable; absent/placeholder identities remain explicitly non-resumable |

No stored schema, version branch, or new persisted lifecycle fact is introduced. Rewriting valid current records or irrelevant native self-ID fields would add risk without enabling recovery; already overwritten snapshots and absent external IDs remain unrecoverable.

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Root/context mode introduction | Pass | Pass | Pass | Pass |
| Configured-child/task-team API split | Pass | Pass | Pass | Pass |
| Workspace ensure and activation-plan conversion | Pass | Pass | Pass | Pass |
| Native generic restore and external binding gate | Pass | Pass | Pass | Pass |
| SR-003 candidate/durability invariant preservation | Pass | Pass | Pass | Pass |
| Focused/integration validation then source re-review | Pass | Pass | Pass | Pass |
| Downstream isolated browser coverage | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Root create versus restore provenance | Yes | Pass | Pass | Pass | Explicit entrypoint and mode flow |
| Native activity plan selection | Yes | Pass | Pass | Pass | All mode/runtime/binding/activity branches are shown |
| Generic native versus strict external candidate | Yes | Pass | Pass | Pass | Concrete candidate construction code is supplied |
| External-only binding eligibility | Yes | Pass | Pass | Pass | Native candidate self-ID is explicitly excluded |
| Workspace activation ordering | Yes | Pass | Pass | Pass | Ensure result precedes inspection/candidate |
| Nested configured inheritance versus fresh task | Yes | Pass | Pass | Pass | Good/avoid shapes and distinct factory methods are explicit |
| Native restore failure | Yes | Pass | Pass | Pass | No fallback; cleanup/error path is explicit |
| Candidate concurrency/durability | Yes | Pass | Pass | Pass | SR-003 failure matrix, latches, and examples remain applicable |
| Real browser validation | Yes | Pass | Pass | Pass | Disposable DB, pinned state, full stop/restart, and physical assertions are concrete |

## Material Premise Validation (Only When Needed)

### `PREM-ARCH-001` — Two supported first commands can overlap while one team member is initializing

- Related approved requirement or established contract: `REQ-001`, `REQ-003`, `REQ-004`, `REQ-010`, `REQ-012`; normal team messaging.
- Relevant behavior ID(s): `BEH-001`, `BEH-003`, `BEH-005`, `BEH-007`, `BEH-009`.
- Initiating basis kind: User / System.
- Independent product-supported initiating trigger or applicable governing contract: A user sends more than one normal team-conversation message before lazy member initialization completes; normal team/system delivery can also overlap that first command.
- Support evidence: The team WebSocket accepts independent `SEND_MESSAGE` events (`src/services/agent-streaming/agent-team-stream-handler.ts:87-95,159-166`) and routes each to the same configured execution.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: concurrent `SEND_MESSAGE` deliveries -> root commands -> one `MixedAgentMemberHandle.ensureReady` promise -> one manager run-ID claim/private candidate -> applicable root durability -> synchronous publication -> joined callers continue through the same AgentRun.
- Lifecycle preconditions and material consequence at the claimed point: The configured member is lazily uninitialized in the process. Without joining, duplicate runtime construction or conflicting adoption is possible; the retained handle/manager single-flight prevents it.
- Reachability: Reachable.
- Review consequence / proportionate response: The SR-003 single-flight/private-candidate machinery remains required and SR-004 preserves it across workspace/activity/native awaits.

### `PREM-ARCH-002` — A standalone command can otherwise observe a fresh run before standalone identity durability commits

- Related approved requirement or established contract: `REQ-009`, `REQ-010`, `REQ-011`.
- Relevant behavior ID(s): `BEH-008`.
- Initiating basis kind: User / Operational.
- Independent product-supported initiating trigger or applicable governing contract: A user sends overlapping standalone conversation messages while a prepared external run is activating; abrupt process restart is the approved continuity boundary.
- Support evidence: Standalone `SEND_MESSAGE` events enter independently through `agent-stream-handler.ts:173-180`; the SR-003 investigation established the prior early-registry window.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: both commands -> `StandaloneAgentRunActivationService` -> one per-run promise/private candidate -> exact metadata commit/reconciliation -> synchronous publication -> both commands receive the same run -> input.
- Lifecycle preconditions and material consequence at the claimed point: The run is prepared but not durably started. Early discoverability could admit input before UUID durability; the retained owner and published-only registry close that window.
- Reachability: Reachable.
- Review consequence / proportionate response: `ARCH-FIND-002` remains resolved and SR-004 does not reopen its boundary.

### `PREM-ARCH-003` — A restored configured native member with prior activity reaches lazy materialization after a full supported restart

- Related approved requirement or established contract: `REQ-012`, `REQ-014`, `REQ-015`; `AC-016` through `AC-019`.
- Relevant behavior ID(s): `BEH-009`, `BEH-010`.
- Initiating basis kind: User / Operational.
- Independent product-supported initiating trigger or applicable governing contract: On the team-conversation product surface, a user sends a marker to a configured native member, fully stops/restarts the API, reopens the saved TeamRun, and sends a context-dependent recall message.
- Support evidence: The isolated browser reproduction observed this exact journey. The GraphQL restore surface calls `TeamRunService.restoreTeamRun` (`src/api/graphql/types/agent-team-run.ts:139-149`), which calls `AgentTeamRunManager.restoreTeamRun` (`src/agent-team-execution/services/team-run-service.ts:129-145`); the current manager loads the package but its materializer still calls the create backend.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: reopen -> root package restore -> explicit restored mixed context -> first configured-member command -> workspace ensure -> complete-corpus activity present -> generic native restore with same local run ID/memory -> candidate publication -> first input appends to restored context.
- Lifecycle preconditions and material consequence at the claimed point: The saved configured member has canonical prior trace/snapshot activity and a non-null workspace root. Current base behavior fresh-creates in a temp fallback and replaces working context; target behavior restores before input and forbids restore-to-create fallback.
- Reachability: Reachable.
- Review consequence / proportionate response: Explicit root-to-member mode, workspace-owner reuse, activity selection, and native generic restore are necessary and bounded to the observed lifecycle.

### `PREM-ARCH-004` — Restored configured descendants and newly delegated task executions require different provenance

- Related approved requirement or established contract: `REQ-012`, `REQ-013`; `AC-019`; the existing delegation contract defines a task execution as fresh.
- Relevant behavior ID(s): `BEH-003`, `BEH-009`.
- Initiating basis kind: User / System / Contract.
- Independent product-supported initiating trigger or applicable governing contract: A saved configured team may contain nested configured teams; after reopening it, an agent can use the supported `delegate_task` tool to create a new task agent/team.
- Support evidence: Configured children are lazily materialized through `MixedSubTeamMemberHandle`; task delegation allocates new run IDs and calls `prepareTaskAgent/prepareTaskTeam` (`src/agent-team-execution/task-delegation/task-delegation-service.ts:117-152`). The rendered contract explicitly describes `delegate_task` as a fresh dedicated execution (`member-collaboration-instruction-renderer.ts:40-43`).
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: restored root -> configured child handle -> inherited restore mode -> configured native descendant activity restore; separately `delegate_task` -> new task IDs -> `prepareFreshTaskTeam` or fresh task-agent handle -> new candidate -> task/tree durability -> publication.
- Lifecycle preconditions and material consequence at the claimed point: Configured descendants belong to the restored saved topology, while task executions are created after restart. A shared implicit `createOrRestore` path can invert either behavior; the split subject APIs make the distinction explicit.
- Reachability: Reachable.
- Review consequence / proportionate response: Required inherited mode for configured children plus explicit fresh task entrypoints is proportionate and prevents both stale-context loss and accidental task restoration.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

**Pass** — SR-004 is implementation-ready. It closes the newly approved native restart-continuity design gap and explicitly addresses the downstream native binding trigger while preserving the previously passed SR-003 candidate, durability, provider, and standalone invariants.

## Findings

None.

## Classification

N/A — Pass.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Historical external null bindings, Claude local-ID placeholders, and already-overwritten native snapshots remain unrecoverable; explicit failure is correct.
- A restored native member with activity but a missing/corrupt snapshot can fail generic restore. It must not be replaced by fresh construction.
- A durably reserved but unmaterialized Claude UUID can fail exact resume; no replacement session may be created.
- Candidate cleanup uncertainty may leave an unused remote artifact, but the manager claim/quarantine must prevent publication and same-process replacement.
- Old converted native self-ID fields may remain physically present and be ignored by the runtime-kind reader. New native executions must remain null; downstream coverage should include a representative direct-use record.
- The halted source still contains `CODE-FIND-001` and the pre-existing native restore defect. This review validates the revised design, not the current implementation; both require implementation and source re-review.
- API/E2E owns durable-coverage classification and isolated realistic Codex/Claude/native restart execution after source review passes.

## Latest Authoritative Result

- Review Decision: Pass
- Material-Premise Gate: Pass — retained and new lifecycle machinery is backed by supported user/operational triggers, current contracts, and full forward paths.
- Notes: `ARCH-FIND-001` and `ARCH-FIND-002` remain resolved. SR-004 addresses the upstream design needed for native configured-member continuity and the design side of `CODE-FIND-001`; that code-review finding remains implementation-owned until corrected and re-reviewed. `ARCH-REV-002` alone no longer authorizes continuation; `ARCH-REV-003` is the current pass.
