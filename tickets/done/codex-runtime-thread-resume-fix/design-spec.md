# Design Spec

## Current-State Read

The V1 TeamRun package correctly persists one rooted identity topology, but current runtime materialization does not preserve every identity/lifecycle fact needed for continuation.

For Codex and Claude team members, the fresh backend establishes a provider-native thread/session ID after the initial V1 tree has been written. Base code captured that ID only in mutable `MixedAgentMemberContext`; `RootTeamRun` never adopted it. Restart reconstructed null and selected a new provider conversation. Codex then compounded the problem by converting known-thread resume failure into `thread/start`. Claude compounded it by exposing the local AgentRun ID as a placeholder until the stream reported the real UUID.

SR-003 repaired the architecture in the current halted implementation: `AgentRunManager` owns unpublished activation candidates and an exclusive run-ID claim; `MixedAgentMemberHandle` and `StandaloneAgentRunActivationService` own their respective single-flights; root/task/standalone durability precedes candidate publication; cleanup uncertainty quarantines; provider restoration is exact; fresh Claude reserves its UUID. Architecture review `ARCH-REV-002` passed that package.

The native browser rerun reveals a separate base defect that the original preserved-native requirement did not model. `AgentTeamRunManager.restoreTeamRun()` loads the V1 package but `materializeRoot()` always calls `MixedTeamRunBackendFactory.createBackend()`. The configured handle sees native `platformAgentRunId: null` and chooses new AgentRun construction. The local AgentRun ID and history projection survive, but the native working context does not. In retained evidence, the second turn restarted at `turn_0001`, the post-restart snapshot lost the marker, and the model explicitly reported no prior context.

V1 also derives a deterministic workspace ID without activating the persisted root after process restart. `AutoByteusAgentRunBackendFactory` uses synchronous `WorkspaceManager.getWorkspaceById()` and silently falls back to the temp workspace. The personal control succeeds because its restore mapper calls `ensureWorkspaceByRootPath()`, its team manager calls a restore backend, and native `AgentRunManager.restoreAgentRun()` reaches `agentFactory.restoreAgent()` / `WorkingContextSnapshotRestoreStep`.

The halted implementation introduces one more native regression (`CODE-FIND-001`): `AutoByteusAgentRunBackend.getPlatformAgentRunId()` returns the local run ID, while the implemented handle stages/adopts any truthy candidate ID as `TeamAgentPlatformBinding`. That self-ID is then rejected by strict external restore. A local external-runtime gate fixes that implementation error but not the pre-existing native restart failure.

Current change posture: bug fix with lifecycle refactor.

Root-cause classification:

- External: missing invariant and root ownership bypass.
- Native: boundary/ownership issue—create/restore provenance is owned by the root manager but discarded before member activation.
- Workspace: capability bypass—the member configuration derives an ID without invoking the workspace owner.
- Partial implementation: runtime-category conflation at the mixed handle boundary.

Refactor is required now. A provider-only gate would leave the user-visible native defect. Reintroducing personal's event-driven metadata refresh would create a second persistence authority. Persisting a new restore flag would duplicate process-local lifecycle provenance. The target instead strengthens the existing owners.

## Intended Change

Retain the complete SR-003 external/standalone/candidate architecture and add one explicit native restoration path:

- `AgentTeamRunManager.createTeamRun()` materializes a fresh root; `restoreTeamRun()` materializes a restored root. `materializeRoot()` receives that explicit mode and calls a semantically matching mixed-factory entrypoint.
- `MixedTeamRunContext` carries a process-local `configuredMemberActivationMode: "fresh" | "restore"`. It is not serialized.
- Configured nested teams inherit the containing configured mode. Newly delegated task agents and task teams explicitly start in `fresh` mode even when their root was restored.
- `MixedAgentMemberHandle` remains the one runtime-adaptation/readiness owner. It selects one private activation plan:
  - `new` for explicit fresh execution or restored execution with no prior semantic activity/binding;
  - `restore_native` for a restored AutoByteus configured member with canonical prior activity;
  - `restore_external` for an external member with an exact persisted provider binding.
- `restore_native` calls generic `AgentRunManager.prepareRestoreAgentRun(new AgentRunContext({ runId, config, runtimeContext: null }))`. The native backend restores from the same local run ID and memory directory.
- `restore_external` continues to call strict `prepareRestoreAgentRunFromPlatformState()` and must return the same provider ID.
- Provider-binding construction, root adoption, context adoption, and task staging are conditional on `isExternalProviderRuntimeKind()`. Native candidate self-IDs are ignored at this team binding boundary and never mutate the V1 tree.
- Before activity classification or candidate construction, `buildAgentRunConfig()` calls existing `WorkspaceManager.ensureWorkspaceByRootPath()` for every non-null member root and uses the returned workspace ID. Null roots retain supported temp-workspace behavior.
- The existing complete-corpus activity inspector serves both external null-binding safety and native restored-state selection. An indeterminate read fails closed; native activity plus restore failure never retries as fresh.
- Candidate construction/publication stays single-flight and undiscoverable before durability. Native restore adds no bypass around the SR-003 claim, abort, quarantine, or event rules.
- External Codex/Claude/standalone behavior from SR-003 remains: root binding adoption, direct-task staged binding, strict provider restore, Claude reserved UUID, and standalone metadata durability.

No compatibility wrapper, dual metadata writer, history replay, provider-ID inference, or persisted materialization flag is added.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Trigger / Reachability | Requirement / AC | Current Evidence | Target Production Path | Spine IDs |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Send/restart configured Codex member | REQ-001, REQ-002; AC-001, AC-002, AC-004 | Codex browser/tree/provider evidence | Member single-flight -> private create -> root binding commit -> publish; restart -> strict exact restore | DS-001, DS-002, DS-004, DS-010 |
| BEH-002 | Reopen same conversation | REQ-007, REQ-015; AC-003, AC-018 | History visible while provider/native context absent | History remains independent; runtime restores before first input; native snapshot appends | DS-002, DS-012, DS-004 |
| BEH-003 | Configured/task external or native activation | REQ-003, REQ-009, REQ-013; AC-005, AC-017 | Base source + CODE-FIND-001 | External-only binding staging/adoption; native null/new/restore paths | DS-001, DS-003, DS-013 |
| BEH-004 | Standalone Codex restore | REQ-008; AC-009 | Existing standalone path | Standalone single-flight -> strict private restore -> publish | DS-006, DS-011 |
| BEH-005 | First activation with no context | REQ-004; AC-006 | Fresh create works | Complete-corpus classification -> one private new candidate -> applicable durability -> publish | DS-001, DS-003, DS-007, DS-010 |
| BEH-006 | Known external resume failure | REQ-005, REQ-006; AC-007, AC-008 | Codex fail-open source | Strict provider failure -> cleanup/quarantine classification -> observable error | DS-002, DS-004, DS-007 |
| BEH-007 | Send/restart configured Claude | REQ-001 through REQ-004, REQ-009, REQ-010; AC-010 through AC-014 | Claude browser/SDK evidence | Reserved UUID -> root durability -> SDK create; restart -> exact SDK resume | DS-001, DS-002, DS-008, DS-010 |
| BEH-008 | Overlapping standalone Claude activation then abrupt restart | REQ-009 through REQ-011; AC-014, AC-015 | Static timing evidence | Standalone one-flight -> private UUID candidate -> metadata durability -> publish -> exact resume | DS-009, DS-011, DS-008 |
| BEH-009 | Full restart then send to configured native member | REQ-012, REQ-015; AC-016, AC-018, AC-019 | Base fail/personal pass, traces/snapshots/logs | Restored root mode -> activity present -> native generic restore candidate -> publish -> input append | DS-012, DS-010, DS-004 |
| BEH-010 | Member activation with persisted workspace after restart | REQ-014; AC-018, AC-019 | Base temp fallback/personal ensure logs | Handle config -> workspace ensure -> activity plan -> candidate | DS-012, DS-013 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Related IDs | Design Use | Status |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/runtime-reproduction-evidence.md` | Codex live restart evidence | REQ-001, REQ-002, REQ-007; AC-001 through AC-004 | External binding/resume validation basis | Complete / N/A evidence |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/claude-runtime-reproduction-evidence.md` | Claude UUID/SDK/restart evidence | REQ-001 through REQ-004, REQ-009 through REQ-011; AC-010 through AC-015 | Claude lifecycle/standalone validation basis | Complete / N/A evidence |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/autobyteus-runtime-reproduction-evidence.md` | Native base/personal browser, snapshot, workspace, and source evidence | REQ-012 through REQ-015; AC-016 through AC-019 | Materialization mode, native plan, workspace, and browser validation basis | Complete / N/A evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: Bug fix.
- Design issue signal: Yes.
- Root-cause classification: Missing invariant plus boundary/ownership issue.
- Refactor needed now: Yes.
- Why: root create/restore semantics, member runtime adaptation, workspace activation, external binding, and live publication are distinct authorities. The current path loses one authority's fact and conflates another's identity. A conditional patch around `platformAgentRunId` cannot restore native context.
- Design response: keep `RootTeamRun` authoritative for external identity, `AgentRunManager` authoritative for candidate/live registry, `StandaloneAgentRunActivationService` authoritative for standalone metadata admission, `WorkspaceManager` authoritative for workspace activation, and `MixedAgentMemberHandle` authoritative for one member's activation plan/readiness. Add explicit configured-member mode to composition and remove ambiguous factory/subteam restore APIs.
- Residual deferred risk: recovery of already-active delegated task executions across process restart is not added because this investigation establishes configured-member continuity, not task hydration. New task freshness/binding neutrality remains protected.

## Terminology

- **Team platform binding:** association between one exact team execution identity and an external provider-native ID. It is never a native local run ID.
- **Configured-member activation mode:** process-local `fresh | restore` provenance supplied by root/subteam materialization for configured members.
- **Activation plan:** private handle decision `new | restore_native | restore_external`.
- **Native activity:** canonical user/assistant conversation evidence in active or complete archived local traces for the exact AgentRun memory directory.
- **Fresh execution:** explicit fresh member/task, or restored member with no prior semantic activity and no external binding.
- **Broken external history:** prior activity with no canonical external binding, or unreadable activity state.
- **Unpublished candidate:** manager-owned AgentRun that has no input surface and is absent from the active registry.
- **Publication:** synchronous manager transition from exclusive private claim to active registry after the governing durability boundary.
- **Staged binding:** external task-agent binding held in prepared task state until task/tree durability.
- **Native self-ID:** local AgentRun ID returned by the native backend's generic platform accessor; not a TeamAgentPlatformBinding.

## Design Reading Order

Read behavior map -> data-flow spines -> ownership/boundaries -> interfaces -> file mapping -> examples -> sequence. Provider lifecycle details remain below the generic candidate/owner boundaries.

## Legacy Removal Policy (Mandatory)

- Do not restore personal's debounced live-context-to-metadata refresh.
- Remove unused `TeamRunService.refreshRunMetadata()` as already designed.
- Remove eager manager create/restore APIs beside candidate APIs.
- Remove Codex resume-to-start fallback.
- Remove Claude local-ID placeholder, arbitrary UUID adoption, cache rekeying, ambiguous SDK input, and restore fallback.
- Remove native truthy-ID binding staging/adoption from the mixed handle; eligibility is external-only.
- Replace ambiguous `MixedTeamRunBackendFactory.restoreBackend(context, config)` / `MixedSubTeamRunFactory.createOrRestore()` shapes with explicit fresh/restored configured and fresh-task materialization APIs.
- Remove the unused generic `backends/team-run-backend-factory.ts` interface if no production caller remains after the explicit mixed factory conversion; do not keep two restore contracts.
- Do not add a persisted restore flag, compatibility reader branch, or native self-ID rewrite.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Decision: **Directly Usable — No Migration**.
- External: existing valid non-null IDs remain directly usable; null after prior external activity is unrecoverable/fail-closed.
- Native: V1 already persists local run ID, runtime kind, workspace root, deterministic memory location, trace corpus, and working snapshot. Normal native restore can consume them directly.
- Materialization mode is known at the process entrypoint; serializing it would duplicate lifecycle state.
- Native runtime kind makes external binding irrelevant. Old converted native self-ID values may remain physically present but are ignored by activation planning; new writes never adopt them.
- A native snapshot already overwritten by a failed restart turn is not recoverable.
- No bulk rewrite, startup migration, maintenance window, dual read, or schema version branch is justified.

### Migration Plan (Only When Decision Is `Migration Required`)

Not applicable.

## Data-Flow Spine Inventory

| Spine ID | Type | Trigger | Result | Governing Owner | Why Relevant |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | First configured external command | Binding durable, candidate published, input admitted | Handle + RootTeamRun | External team creation |
| DS-002 | Primary | First command after external restart | Exact provider candidate restored/published | Handle + AgentRunManager | Provider continuity |
| DS-003 | Primary | Direct external/native task activation | Tree/task durable, external binding staged if eligible, candidate published | TaskDelegationService + task registry | Pre-node lifecycle |
| DS-004 | Return/Event | Activation/restore failure | Typed team/standalone error, no false continuation | Handle/activation service | Truthful failure |
| DS-005 | Bounded Local | Any root tree mutation | Prepare current -> write -> live commit | Persistence coordinator | Lost-update prevention |
| DS-006 | Primary | Standalone external restore | Metadata-selected exact candidate published | Standalone activation service | Preserve standalone |
| DS-007 | Bounded Local | No external binding / native restored mode | none/present/indeterminate classification | Activity inspector + handle | Fresh vs continuation |
| DS-008 | Bounded Local | Claude query | create/resume binding and exact stream confirmation | Claude lifecycle/session | UUID correctness |
| DS-009 | Primary | Fresh standalone Claude activation | UUID metadata durable before publication/input | Standalone activation service | Abrupt restart safety |
| DS-010 | Bounded Local | Any candidate prepare/publish/abort | Exclusive claim -> private candidate -> live or cleanup/quarantine | AgentRunManager | Concurrency invariant |
| DS-011 | Bounded Local | Overlapping standalone callers | One promise/result across metadata/candidate/publication | Standalone activation service | ARCH-FIND-002 closure |
| DS-012 | Primary | Restored configured native first command | Workspace active, native snapshot restored, first turn appended | Root manager -> handle -> AgentRunManager | Native continuity |
| DS-013 | Primary | Fresh configured/task native activation | Workspace active, new candidate, no team platform binding | Handle/task registry | Native non-regression |

## Primary Execution Spine(s)

- **DS-001:** `WebSocket/root command -> configured handle single-flight -> workspace ensure -> new private external candidate -> root binding commit -> candidate publish -> input`
- **DS-002:** `root package restore(mode=restore) -> configured handle -> workspace ensure -> persisted binding -> strict private provider restore -> publish -> input`
- **DS-003:** `delegate task -> fresh task handle -> workspace ensure -> private candidate -> staged external binding (or none for native) -> root task/tree durability -> publish -> release work`
- **DS-006/DS-009:** `standalone facade -> standalone activation single-flight -> metadata decision -> private candidate -> metadata durability -> publish -> input`
- **DS-012:** `TeamRunService.restore -> AgentTeamRunManager.restore(mode=restore) -> mixed restored context -> configured handle -> workspace ensure -> activity present -> generic native restore candidate -> publish -> input -> snapshot append`
- **DS-013:** `TeamRun create or task delegation(mode=fresh) -> handle -> workspace ensure -> new native candidate -> no binding -> applicable publication -> input`

## Spine Narratives (Mandatory)

| Spine | Narrative | Main Subjects | Governing Owner | Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | First caller installs readiness promise. The manager returns one private external candidate. Root durably adopts its provider ID. Only then does the handle mirror binding, publish, bind events, and release callers. | member, candidate, binding | Handle / Root | provider, tree store, cleanup |
| DS-002 | Restored mode reaches a handle with exact binding. Activity/binding validation occurs before provider work. Strict provider restore must return the same ID; publication follows. | restored member, binding | Handle / Manager | provider protocol, errors |
| DS-003 | Task preparation retains a private candidate. External binding is staged; native has none. Root task/tree commit occurs before local publication and work release. | task execution, candidate | Task owner | store, cleanup |
| DS-009 | All standalone callers join one activation. Fresh Claude candidate already owns a UUID. Metadata commits/reconciles exact state, then candidate publishes. | standalone metadata, candidate | Standalone activation | metadata store, Claude |
| DS-012 | Root restore mode reaches each configured subtree. At first native input, the handle activates the persisted workspace, classifies local activity, calls generic manager restore, publishes the restored candidate, then forwards input. Native backend loads prior snapshot before the turn. | configured native member, snapshot | Handle / Manager | workspace, memory inspector |
| DS-013 | Explicit fresh configured/task mode never calls native restore. Native self-ID is not staged/adopted; candidate publishes through the normal fresh/task boundary. | fresh native member/task | Handle / Task registry | workspace |

## Spine Actors / Main-Line Nodes

- `AgentTeamRunManager`: root create/restore provenance and root lifecycle registration.
- `MixedTeamRunBackendFactory` / `MixedTeamRunContext`: configured-member materialization composition.
- `MixedSubTeamRunFactory`: explicit configured-child inheritance versus fresh-task construction.
- `MixedAgentMemberHandle`: one member's activation-plan/readiness single-flight and runtime adaptation.
- `WorkspaceManager`: persisted workspace activation.
- `AgentConversationActivityInspector`: strict semantic activity classification.
- `AgentRunManager` / `AgentRunActivationCandidate`: exclusive private-to-live runtime lifecycle.
- `RootTeamRun`: authoritative external binding/tree state.
- `TaskDelegationService` / task registries: task durability and deferred publication.
- `StandaloneAgentRunActivationService`: standalone metadata durability and admission.
- `CodexThreadManager`; `ClaudeProviderSessionLifecycle`; `ClaudeSession`; `ClaudeSdkClient`: provider-local lifecycle.
- `AutoByteusAgentRunBackendFactory`: native create versus snapshot restore.

## Ownership Map

- **AgentTeamRunManager owns:** selecting fresh/restored root factory entrypoint. It does not inspect activity or provider identity.
- **MixedTeamRunBackendFactory owns:** building a runtime context whose configured activation mode is explicit. It does not decide per-runtime plan.
- **MixedSubTeamRunFactory owns:** two explicit subjects: configured child materialization with inherited mode; fresh task-team materialization.
- **MixedAgentMemberHandle owns:** workspace-resolved config, activation plan, one readiness promise, candidate acceptance/publication/abort, and team error projection.
- **WorkspaceManager owns:** canonical root activation and workspace ID. The handle consumes it; it does not duplicate registry logic.
- **Activity inspector owns:** storage parsing/classification only, never activation or provider ID inference.
- **AgentRunManager owns:** claims, candidate construction, generic native restore, strict external restore verification, publication, teardown, quarantine.
- **RootTeamRun owns:** external binding immutability and durable tree mutation.
- **TaskDelegationService owns:** task/tree durability point; task registries own private local prepared candidates.
- **Standalone activation service owns:** per-run standalone one-flight, metadata selection/reconciliation, candidate publication.
- **AutoByteus backend factory owns:** native AgentFactory create/restore mechanics and working snapshot bootstrap.
- **Provider owners retain:** Codex exact resume and Claude UUID/query state.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Governing Owner | Responsibility | Must Not Own |
| --- | --- | --- | --- |
| `TeamRunService` | `AgentTeamRunManager` / `RootTeamRun` | Public create/restore/history calls | Member mode inference, provider binding, workspace bypass |
| `AgentRunService` | `StandaloneAgentRunActivationService` | Public standalone commands/create/restore | Separate activation promise or raw candidate publication |
| `AgentRunCommandCoordinator` | Standalone activation | Command dedupe/status and request command-ready run | Active-first bypass or activation map |
| Streaming handlers | Root/standalone domains | Parse and project events | Persistence repair, candidate admission, provider fallback |

## Removal / Decommission Plan (Mandatory)

| Item | Why Removed/Replaced | Replacement | Scope |
| --- | --- | --- | --- |
| Mutable-context/event metadata refresh | Parallel authority | Root binding adoption | Existing SR-003 |
| Eager AgentRun manager APIs | Pre-durability discovery | Candidate API | Existing SR-003 |
| Command/provisioning activation maps | Duplicate ownership | Standalone activation single-flight | Existing SR-003 |
| Codex resume-to-start | False continuation | Strict failure | Existing SR-003 |
| Claude placeholder/rebinding/cache migration | Mutable invalid identity | Reserved UUID lifecycle | Existing SR-003 |
| Native truthy candidate binding | Self-ID is not provider ID | External-only binding eligibility | SR-004 |
| Root restore through `createBackend` | Erases provenance | Explicit factory restore entrypoint | SR-004 |
| `createOrRestore` subteam API | Ambiguous task/configured semantics | Explicit configured-child/fresh-task methods | SR-004 |
| Deterministic workspace ID without activation | Process-cache assumption | `ensureWorkspaceByRootPath` | SR-004 |
| Unused generic TeamRun backend factory interface | Conflicting restore contract, no caller | Explicit mixed factory contract | SR-004, remove if compile search confirms unused |

## Return Or Event Spine(s) (If Applicable)

- Candidate prepare/restore failure -> handle/standalone owner -> candidate abort/quarantine -> typed domain error -> existing status/event projector -> client.
- Native activity indeterminate -> `TEAM_AGENT_CONTINUATION_STATE_UNREADABLE`; no candidate.
- Native restore failure -> `TEAM_AGENT_NATIVE_RESTORE_FAILED` (new normalized team-facing code) or existing activation failure with native cause; never retry as fresh.
- Workspace activation failure -> `TEAM_AGENT_WORKSPACE_ACTIVATION_FAILED`; no temp fallback for non-null root.
- External binding/restore/Claude errors retain SR-003 codes and omit raw provider IDs from client messages.

## Bounded Local / Internal Spines (If Applicable)

- **DS-005:** persistence coordinator lock -> prepare against current tree -> physical write -> live commit/fail-stop.
- **DS-007:** exact memory directory -> active trace -> archive manifest/complete segments -> `none | present | indeterminate`.
- **DS-008:** Claude lifecycle -> create/resume binding -> note query opened -> exact stream confirmation.
- **DS-010:** manager claim before first await -> backend/run/observer construction -> private candidate -> publication or joined abort -> claim release/quarantine.
- **DS-011:** standalone in-flight map installed before metadata/provider work -> all callers join -> clear only after ready or retry-safe failure.
- **Native plan:** mode/runtime/binding/activity -> `new | restore_native | restore_external`; only one branch can construct a candidate.

### Candidate Failure, Cleanup, And Retry Matrix

| Failure Point | Candidate Published? | Durable Identity Changed? | Cleanup | Retry Rule |
| --- | --- | --- | --- | --- |
| Workspace ensure fails | No | No | None | Retry after environment fix |
| Activity read indeterminate | No | No | None | Retry after state becomes readable; never create |
| Native restore construction fails | No | No | Manager cleans partial backend | Retry native restore only after confirmed cleanup; never new |
| External candidate construction fails | No | No | Manager aborts/cleans | Retry only after confirmed cleanup |
| Root binding write fails before commit | No | No | Abort candidate | Retry after confirmed cleanup |
| Root binding durable, local finalization uncertain | No/live fail-stop | Yes | Root fail-stop + candidate cleanup/quarantine | No create; later exact restore only |
| Candidate cleanup uncertain | No | Maybe provider artifact | Retain manager claim quarantine | No same-process retry |
| Task durability fails | No | No task/binding | Abort prepared candidate | Retry after confirmed cleanup |
| Standalone metadata write error | No | Unknown | Strict reread/reconcile | Exact target publish; exact unchanged abort/retry; otherwise quarantine |
| Candidate publication invariant fails | No | Applicable durability already committed | Quarantine/fail-stop | No retry/create |

## Off-Spine Concerns Around The Spine

| Concern | Served Spines | Owner | Responsibility | Forbidden Alternative |
| --- | --- | --- | --- | --- |
| Workspace activation | DS-001, DS-002, DS-003, DS-012, DS-013 | WorkspaceManager via handle | Canonicalize/activate root, return ID | Deterministic ID plus sync cache assumption |
| Activity inspection | DS-007, DS-012 | Agent memory inspector | Strict corpus classification | Provider scan/history replay |
| Tree persistence | DS-001, DS-003, DS-005 | Root persistence | Write-before-live | Handle/store bypass |
| Candidate attachments/cleanup | DS-010 | AgentRunManager | Prepare observers, detach, terminate/quarantine | Caller-local best effort |
| Error projection | DS-004 | Existing adapters | Observable typed failures | Transport-owned correctness |
| Provider protocol | DS-002, DS-006, DS-008 | Provider owners | Exact start/resume | Root speaks provider SDK |
| Native snapshot restore | DS-012 | AutoByteus backend factory | `restoreAgent` with same memory | History projection replay |

## Ownership Boundaries

Create/restore provenance travels downward; identity durability travels upward. The root manager tells mixed composition whether configured members are fresh or restored. The member handle uses that fact with runtime-specific canonical state to prepare a private candidate. External identity is then accepted upward by `RootTeamRun`; native identity never enters that port.

The active registry remains manager-owned and contains published runs only. The raw unpublished AgentRun is unavailable to team/task/standalone callers. The handle may invoke generic native restore or strict external restore but cannot publish until its governing boundary is satisfied.

Workspace activation occurs before candidate construction inside the member-config boundary. The handle depends on the public workspace owner; it never reads `workspaces.json` or fabricates an active instance.

Configured subtree inheritance and task freshness are distinct APIs. A restored parent cannot accidentally make a newly delegated task team restore, and a fresh task cannot infer mode from parent state.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Required Callers | Forbidden Bypass | Strengthening Action |
| --- | --- | --- | --- | --- |
| `AgentTeamRunManager.create/restoreTeamRun` | Root mode selection/package lifecycle | TeamRunService | Service calls mixed factory directly | Pass explicit materialization mode internally |
| `MixedTeamRunBackendFactory.create/restoreBackend` | Configured mode/context construction | Root manager | One create method for both | Two semantic entrypoints |
| `MixedSubTeamRunFactory.materializeConfiguredChild/prepareFreshTaskTeam` | Inheritance vs fresh task | Configured handle/task registry | Ambiguous `createOrRestore` | Split by subject |
| `MixedAgentMemberHandle.ensureReady` | Workspace, plan, single-flight, candidate lifecycle | All member commands | Registry calls manager directly | Keep private plan resolver |
| `WorkspaceManager.ensureWorkspaceByRootPath` | Workspace registry/active instance | Handle config builder | Hash ID only | Inject public owner |
| `AgentRunManager.prepare* -> candidate` | Claim/private run/restore/publish/abort | Handle/task/standalone | Raw unpublished run | Retain candidate encapsulation |
| `RootTeamRun.adoptAgentPlatformBinding` | External binding/tree durability | External handle acceptance | Native binding/store write | External eligibility before call |
| `TaskDelegationService` | Task/tree durability and release | Root delegation | Prepared registry publishes early | Post-durability commit |
| `StandaloneAgentRunActivationService` | Metadata/admission one-flight | Standalone facade/commands | Active-first manager lookup | One resolver |

## Dependency Rules

1. `AgentTeamRunManager` chooses factory create versus restore; `TeamRunService` and transport do not.
2. `MixedTeamRunContext.configuredMemberActivationMode` is required, process-local, and never serialized.
3. Configured child teams inherit mode; task agent/team preparation passes `fresh` explicitly.
4. All configured/committed member commands enter one `MixedAgentMemberHandle` readiness promise.
5. The handle may depend on WorkspaceManager, activity inspector, AgentRunManager candidate APIs, and external binding acceptor; not on tree stores/provider managers/standalone metadata.
6. `restore_native` uses generic `prepareRestoreAgentRun`; `restore_external` uses strict platform-state restore. These methods are not interchangeable.
7. Only external runtime candidates may be validated as provider candidates or converted to TeamAgentPlatformBinding.
8. Native activity plus restore mode never falls back to new after restore failure.
9. Non-null workspace root must be activated before any backend create/restore call. Temp fallback is valid only when root is null.
10. Candidate, root/task/standalone durability, publication, cleanup, and quarantine rules from SR-003 remain unchanged.
11. All tree changes prepare at lock head; no precomputed next tree.
12. No runtime event drives persistence.
13. Provider-specific UUID/thread rules stay in provider subsystems.
14. Open task hydration is not added through synthetic reconstruction; a separate supported path is required.

## Interface Boundary Mapping

| Interface / Method | Subject | Responsibility | Identity/Input | Notes |
| --- | --- | --- | --- | --- |
| `MixedTeamRunBackendFactory.createBackend(config,id,callbacks)` | Fresh root | Build context mode `fresh` | Team config + root ID | Never used for restore |
| `MixedTeamRunBackendFactory.restoreBackend(config,id,callbacks)` | Restored root | Build context mode `restore` | Config reconstructed from V1 tree | No fabricated runtime context |
| `MixedSubTeamRunFactory.materializeConfiguredChild(input)` | Configured child | Inherit explicit mode | Team node + parent mode | Fresh/restored |
| `MixedSubTeamRunFactory.prepareFreshTaskTeam(input)` | New task team | Force fresh mode | New task TeamRun node | Cannot inherit restore |
| `MixedAgentMemberHandle.ensureReady()` | One committed member | Join one plan/candidate/result | Exact handle identity + mode | Private |
| `MixedAgentMemberHandle.prepareForTaskActivation()` | One new task agent | Prepare fresh candidate/staged external binding | Exact task run | Native staged list empty |
| `resolveActivationPlan(config)` (private) | Member activation | Return new/native/external plan | mode + runtime + binding + activity | Exhaustive union |
| `WorkspaceManager.ensureWorkspaceByRootPath(root)` | Workspace | Activate canonical workspace | Persisted root path | Returned ID used in config |
| `AgentRunManager.prepareNewAgentRun` | New candidate | Private creation | runId + config | Candidate only |
| `AgentRunManager.prepareRestoreAgentRun(context)` | Native/local candidate | Private generic backend restore | local run ID + config + null runtime context | Native path |
| `AgentRunManager.prepareRestoreAgentRunFromPlatformState` | External candidate | Exact provider restore/verify | local ID + config + provider ID | External only |
| `RootTeamRun.adoptAgentPlatformBinding` | External team identity | Durable null-to-ID adoption | compound execution + provider ID | Never native |
| `AgentRunActivationCandidate.commitPublication/abort` | Private runtime | Publish synchronously or joined cleanup | Candidate instance | No input surface |
| `StandaloneAgentRunActivationService.resolve*` | Standalone run | One-flight metadata/candidate/publication | local run ID | SR-003 |
| `AgentConversationActivityInspector.inspect` | Local evidence | `none/present/indeterminate` | run ID + memoryDir | Both external/native planning |
| Claude lifecycle/client methods | Provider UUID | Create/resume/confirm | immutable UUID/discriminant | SR-003 |

Stable or required failure codes:

- Existing SR-003: `TEAM_AGENT_CONTINUATION_BINDING_MISSING`, `TEAM_AGENT_CONTINUATION_STATE_UNREADABLE`, `TEAM_AGENT_PLATFORM_BINDING_CONFLICT`, `TEAM_AGENT_PLATFORM_BINDING_COMMIT_FAILED`, `AGENT_RUN_ACTIVATION_IN_PROGRESS_CONFLICT`, `AGENT_RUN_ACTIVATION_CLEANUP_FAILED`, `STANDALONE_AGENT_RUN_ACTIVATION_COMMIT_INDETERMINATE`, `PLATFORM_AGENT_RUN_RESTORE_FAILED`, `PLATFORM_AGENT_RUN_BINDING_INVALID`, Claude conflict/unconfirmed codes.
- SR-004 adds normalized team-facing `TEAM_AGENT_NATIVE_RESTORE_FAILED` and `TEAM_AGENT_WORKSPACE_ACTIVATION_FAILED` if existing generic activation codes cannot preserve actionable classification. These codes contain no paths, provider IDs, or credentials in client messages.

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Root factory create/restore | Yes | Yes | Low | Two methods; no boolean at public seam |
| Configured mode | Yes | Yes | Low | Tight `fresh | restore`, process-local |
| Subteam configured/task methods | Yes | Yes | Low | Split subjects |
| Activation plan | Yes | Yes | Low | Discriminated union, private |
| Workspace activation | Yes | Yes | Low | Existing owner returns ID |
| Native generic restore | Yes | Yes | Low | Local ID/memory only |
| External strict restore | Yes | Yes | Low | Non-null provider ID exact |
| Binding acceptor | Yes | Yes | Low | External eligibility before call |
| Candidate | Yes | Yes | Low | No raw run/input |
| Standalone activation | Yes | Yes | Low | One per-run promise |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Drift Risk | Decision |
| --- | --- | --- | --- | --- |
| Rooted runtime | `RootTeamRun` | Yes | Low | Retain |
| External association | `TeamAgentPlatformBinding` | Yes | Low | Clarify external eligibility |
| Configured provenance | `MixedConfiguredMemberActivationMode` | Yes | Low | Add in mixed context |
| Per-member decision | `MixedAgentActivationPlan` | Yes | Low | Private discriminated union |
| Private runtime | `AgentRunActivationCandidate` | Yes | Low | Retain |
| Local evidence | `AgentConversationActivityInspector` | Yes | Low | Reuse |
| Workspace owner | `WorkspaceManager` | Yes | Low | Reuse |
| Native restore error | `TEAM_AGENT_NATIVE_RESTORE_FAILED` | Yes | Low | Add only if needed |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Capability | Decision | Why |
| --- | --- | --- | --- |
| Root binding/tree durability | RootTeamRun + persistence coordinator | Reuse/extend from SR-003 | Correct authority |
| Candidate private/live lifecycle | AgentRunManager + candidate | Reuse | Already reviewed/implemented |
| Standalone one-flight | Standalone activation service | Reuse | Already reviewed/implemented |
| Native restore | Generic manager restore + AutoByteus backend restore | Reuse | Existing personal-proven mechanism |
| Activity signal | AgentConversationActivityInspector | Reuse/extend usage | Already strict across archives |
| Workspace activation | WorkspaceManager | Reuse | Existing registry owner |
| Configured mode | Mixed context/factory | Extend | Missing process-local composition fact |
| Subteam mode semantics | MixedSubTeamRunFactory | Refactor | Existing method is ambiguous |
| Provider lifecycle | Codex/Claude owners | Reuse SR-003 | No native coupling |

## Subsystem / Capability-Area Allocation

| Subsystem | Concern | Spine | Owner | Decision |
| --- | --- | --- | --- | --- |
| Agent-team services | Root provenance/tree durability | DS-001, DS-005, DS-012 | Root manager/RootTeamRun | Extend |
| Mixed backend | Configured mode, plan, readiness, task freshness | DS-001 through DS-004, DS-007, DS-012, DS-013 | Factory/handle/registries | Extend/refactor |
| Workspace subsystem | Active workspace instance | DS-012, DS-013 | WorkspaceManager | Reuse |
| Agent memory | Activity classification | DS-007, DS-012 | Inspector | Reuse |
| Agent execution | Candidate/generic/strict restore | DS-002, DS-006, DS-010, DS-012 | AgentRunManager | Reuse SR-003 |
| Native backend | Snapshot restore | DS-012 | AutoByteus factory | Reuse |
| Standalone/run history | Metadata admission | DS-006, DS-009, DS-011 | Activation service/store | Reuse SR-003 |
| Provider subsystems | Exact Codex/Claude sessions | DS-002, DS-008 | Provider owners | Reuse SR-003 |

## Draft File Responsibility Mapping

| File/Group | Owner | Concrete Concern | Action |
| --- | --- | --- | --- |
| `services/agent-team-run-manager.ts` | Root lifecycle | Pass fresh/restore to materialization/factory | Modify |
| `backends/mixed/mixed-team-run-context.ts` | Mixed process context | Define configured activation mode | Modify |
| `backends/mixed/mixed-team-run-backend-factory.ts` | Composition | Explicit create/restore methods/context mode | Modify |
| `backends/mixed/mixed-sub-team-run-factory.ts` | Subteam composition | Split configured inheritance/fresh task | Modify |
| configured/subteam/task registries/handles | Mixed runtime | Pass correct mode | Modify |
| `mixed-agent-member-handle.ts` | Member readiness | Workspace ensure, activation plan, external binding gate | Modify |
| `workspaces/workspace-manager.ts` | Workspace owner | Existing public method; likely no source change | Reuse/inject |
| `agent-run-manager.ts` / candidate | Agent execution | Existing generic/strict candidate seam | Reuse; tests may extend |
| external/root/task/standalone/provider files | Existing SR-003 owners | Preserve prior design | Retain current implementation, adjust only where native gate touches |
| `backends/team-run-backend-factory.ts` | Unused legacy abstraction | Conflicting restore signature | Remove if final compile search confirms no caller |

## Reusable Owned Structures Check

| Structure | Owner/File | Why Shared | Tightness | Must Not Become |
| --- | --- | --- | --- | --- |
| `MixedConfiguredMemberActivationMode` | mixed context | Factory, contexts, configured/task composition | Two values only | Persisted lifecycle state |
| `MixedAgentActivationPlan` | handle-private | Exhaustive local selection | Three variants only; external carries binding | Cross-subsystem generic DTO |
| `TeamAgentPlatformBinding` | team domain | Root/handle/task external identity | Compound execution + provider ID | Native/local identity DTO |
| `AgentRunActivationCandidate` | agent execution | Team/task/standalone private/live invariant | Identity + publish/abort only | Durability transaction or raw run wrapper |
| Activity classification | agent memory | External guard and native plan | none/present/indeterminate | Resumability/provider inference |
| Claude binding/lifecycle | Claude subsystem | Provider session state | UUID + discriminant | Generic platform binding |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning? | Redundancy | Parallel Risk | Action |
| --- | --- | --- | --- | --- |
| Configured activation mode | Yes | None | Low | Process-local only |
| Activation plan | Yes | None | Low | Private/exhaustive |
| Persisted runtime kind | Yes | None | Low | Governs binding relevance |
| Persisted platform ID | Yes for external; irrelevant for native | No new field | Medium old self-ID | Ignore for native; never rewrite/adopt |
| Candidate platform ID | Generic backend observation | Existing | Medium | Consume as team binding only when external |
| Workspace root/ID | Root is persisted input; ID is owner result | Avoid hash-only parallel path | Low after change | Ensure then use returned ID |
| Working snapshot/traces | Distinct native state/evidence | Necessary | Low | Snapshot restores context; traces classify activity |

## Final File Responsibility Mapping

| File | Owner / Boundary | Required Change |
| --- | --- | --- |
| `src/agent-team-execution/services/agent-team-run-manager.ts` | Root lifecycle | Add materialization mode to private input; create calls factory create, restore calls factory restore. |
| `src/agent-team-execution/backends/mixed/mixed-team-run-context.ts` | Mixed runtime context | Add/export `MixedConfiguredMemberActivationMode`; store it on context. Keep platform binding as mutable post-accept mirror only. |
| `src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts` | Composition | Make create/restore explicit; build context with mode; stop rebuilding from ambiguous restore runtime context. |
| `src/agent-team-execution/backends/mixed/mixed-sub-team-run-factory.ts` | Subteam composition | Replace `createOrRestore` with configured-child method requiring mode and fresh-task method forcing fresh. |
| `src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.ts` | Configured child | Pass inherited parent mode. |
| `src/agent-team-execution/backends/mixed/members/mixed-configured-member-registry.ts` | Configured handles | Pass context configured mode to agent handles. |
| `src/agent-team-execution/backends/mixed/members/mixed-task-agent-execution-registry.ts` | Fresh task agent | Pass fresh mode; stage binding only for external candidate. |
| `src/agent-team-execution/backends/mixed/members/mixed-task-team-execution-registry.ts` | Fresh task team | Use explicit fresh-task subteam method. |
| `src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | Composition | Forward no ambiguous mode; registries consume context/explicit fresh. |
| `src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Member lifecycle | Inject WorkspaceManager, ensure root, resolve plan, generic native restore, strict external restore, external-only binding validation/stage/adoption. |
| `src/agent-execution/services/agent-run-manager.ts` | Candidate lifecycle | Reuse existing `prepareRestoreAgentRun` for native; preserve strict external API. Add no team policy. |
| `src/agent-memory/services/agent-conversation-activity-inspector.ts` | Evidence | Reuse unchanged unless a test seam is needed; no provider/native policy. |
| `src/workspaces/workspace-manager.ts` | Workspace owner | Reuse `ensureWorkspaceByRootPath`; no hash-only shortcut. |
| `src/agent-team-execution/backends/team-run-backend-factory.ts` | Obsolete interface | Remove after compile search if still unused. |
| SR-003 root/task/standalone/Codex/Claude files | Existing owners | Preserve current reviewed behavior; incorporate external-only gate where candidate IDs are converted to team bindings. |
| Relevant unit/integration tests | Verification | Update/add mode propagation, plan, workspace ordering, native null, snapshot restore, and single-flight cases. |

## Applied Patterns (If Any)

- **Explicit construction provenance:** create and restore are separate factory entrypoints; mode is carried, not inferred.
- **Strategy selection as discriminated local plan:** handle selects new/native/external once.
- **Single-flight:** one readiness promise per member and one standalone promise per run.
- **Candidate/commit:** private manager candidate publishes only after governing durability.
- **Prepared commit:** direct task external binding/candidate commits after tree/task write.
- **Existing capability reuse:** WorkspaceManager and native restore backend are reused rather than duplicated.
- **State machine:** Claude UUID lifecycle remains explicit.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Must Not Contain |
| --- | --- | --- | --- | --- |
| `agent-team-execution/services/agent-team-run-manager.ts` | File | Root lifecycle | Create/restore provenance and root registration | Member activity/provider policy |
| `agent-team-execution/backends/mixed/mixed-team-run-{context,backend-factory}.ts` | Files | Mixed composition | Configured activation mode/context | Persistence store access |
| `agent-team-execution/backends/mixed/mixed-sub-team-run-factory.ts` | File | Subteam composition | Configured inheritance vs fresh task | Activity/provider identity |
| `agent-team-execution/backends/mixed/members/` | Folder | Member/task runtime adaptation | Plan/readiness/mode/task staging | Direct tree writes/standalone metadata |
| `agent-execution/services/agent-run-manager.ts` + candidate | Files | Agent execution | Private create/restore/publish/cleanup | Team mode/tree/metadata policy |
| `agent-memory/services/agent-conversation-activity-inspector.ts` | File | Memory | Strict evidence | Activation decisions |
| `workspaces/workspace-manager.ts` | File | Workspace | Active workspace registry | Team lifecycle |
| `agent-execution/backends/autobyteus/` | Folder | Native provider | Agent create/restore and snapshot bootstrap | Team binding/mode |
| Root/task/standalone/Codex/Claude paths from SR-003 | Existing | Respective owners | Previously reviewed design | Native coupling |

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `agent-team-execution/services` | Domain-control | Yes | Low | Root provenance |
| `agent-team-execution/backends/mixed` | Runtime adaptation | Yes | Medium | Mode/plan belong to mixed composition, not persisted domain |
| `agent-team-execution/backends/mixed/members` | Per-member/task runtime | Yes | Medium | Handle remains cohesive despite lifecycle density |
| `agent-execution/services` | Runtime lifecycle | Yes | Medium | Candidate/standalone owners remain distinct |
| `agent-memory/services` | Off-spine evidence | Yes | Low | Storage semantics only |
| `workspaces` | Capability owner | Yes | Low | Reused public API |
| Provider backend folders | Provider depth | Yes | Low | Protocol/local runtime mechanics isolated |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Shape | Avoid | Why |
| --- | --- | --- | --- |
| Root restoration | `restoreTeamRun -> factory.restoreBackend -> mode=restore` | restore calling createBackend | Preserve provenance |
| Native restored activity | `mode restore + native + activity present -> generic restore` | null platform ID -> new | Local context is not external binding |
| Native no activity | `mode restore + native + activity none -> new` | force restore of nonexistent state | Preserve never-initialized behavior |
| External binding | `external candidate -> root binding` | any truthy candidate ID -> binding | Reject native self-ID |
| Workspace | `ensure root -> returned ID -> config -> backend` | hash root -> sync cache lookup -> temp | Existing owner must activate |
| Nested configured team | inherit restore mode | default fresh | Restore full configured topology lazily |
| New task team | explicit fresh method | inherit restored parent | Task is a new execution |
| Restore failure | native restore error -> cleanup/error | retry fresh | Never erase context after proven activity |
| Concurrent commands | one handle promise/candidate | two plan/backend calls | Preserve SR-003 |

Illustrative mixed mode and plan:

```ts
type MixedConfiguredMemberActivationMode = "fresh" | "restore";

type MixedAgentActivationPlan =
  | Readonly<{ kind: "new" }>
  | Readonly<{ kind: "restore_native" }>
  | Readonly<{ kind: "restore_external"; platformAgentRunId: string }>;
```

Illustrative plan selection:

```text
mode=fresh:
  external with prior/unreadable activity -> fail closed
  otherwise -> new

mode=restore + native:
  activity present -> restore_native
  activity none -> new
  activity indeterminate -> fail closed

mode=restore + external:
  valid binding -> restore_external
  no binding + activity none -> new
  no binding + activity present/indeterminate -> fail closed
```

Illustrative candidate selection and binding eligibility:

```ts
const candidate = plan.kind === "restore_native"
  ? await manager.prepareRestoreAgentRun(new AgentRunContext({
      runId: context.agentRunId,
      config,
      runtimeContext: null,
    }))
  : plan.kind === "restore_external"
    ? await manager.prepareRestoreAgentRunFromPlatformState({
        runId: context.agentRunId,
        config,
        platformAgentRunId: plan.platformAgentRunId,
      })
    : await manager.prepareNewAgentRun({ runId: context.agentRunId, config });

if (isExternalProviderRuntimeKind(candidate.runtimeKind)) {
  await acceptExternalBinding(candidate);
}
// Native candidate.platformAgentRunId is never consumed as a team binding.
```

Illustrative workspace ordering:

```ts
const workspaceId = node.workspaceRootPath
  ? (await workspaceManager.ensureWorkspaceByRootPath(node.workspaceRootPath)).workspaceId
  : null;
// Only now inspect activity / construct a candidate.
```

Illustrative browser validation setup:

```bash
pnpm secrets:import -- \
  --source /Users/normy/.autobyteus/server-data/.env \
  --database-url file:///private/tmp/<isolated-run>/autobyteus.db
```

Then run the real UI against explicitly pinned disposable app-data/memory/log/temp paths, stop the API fully, restart the same state, reopen the same TeamRun, and ask for the exact marker. Assert physical snapshot/tree/log evidence in addition to the answer.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Personal event refresh | Worked before | Rejected | Root external binding adoption |
| Native self-ID as binding/restore signal | Personal metadata contained it | Rejected | Runtime kind + explicit mode + local activity |
| Persist materialization mode | Easy restart signal | Rejected | Process entrypoint owns it |
| Provider/history replay | Apparent recovery | Rejected | Exact restore or truthful failure |
| Restore then fresh fallback | Availability | Rejected | Fail closed after proven activity |
| Workspace hash only | Smaller diff | Rejected | Ensure through owner |
| One `createOrRestore` method | Existing shape | Rejected | Explicit configured/fresh-task subjects |
| Keep generic TeamRun factory interface | Potential future use | Rejected if still unused | One current explicit mixed contract |
| Eager manager APIs/input flag | Smaller SR-003 change | Rejected | Unpublished candidate |
| Claude placeholder/rebinding | Old tests | Rejected | Reserved UUID lifecycle |
| Codex resume fallback | Availability | Rejected | Strict error |

## Derived Layering (If Useful)

`Transport -> RootTeamRun -> Mixed configured handle(mode) -> Workspace/Activity -> AgentRun candidate -> Native/External backend`

`External handle -> Root binding -> Root persistence -> candidate publication`

`Task owner -> fresh task handle -> staged external binding -> task/tree durability -> publication -> work`

`Standalone facade -> Standalone activation -> metadata durability -> candidate publication`

Layering is explanatory only; ownership boundaries above remain authoritative.

## Change / Refactor Sequence

1. Preserve current SR-003 committed source as the starting implementation; do not revert candidate/root/task/standalone/Codex/Claude work.
2. Add `MixedConfiguredMemberActivationMode` to mixed runtime context and require it in context construction.
3. Split mixed root factory create/restore entrypoints; make `AgentTeamRunManager.materializeRoot` receive mode and call the correct entrypoint. Remove the unused generic factory interface if compile search confirms no callers.
4. Split subteam factory APIs into configured-child materialization with inherited mode and fresh task-team preparation. Update configured/task call sites.
5. Pass explicit mode into every `MixedAgentMemberHandle`: context mode for configured members, fresh for new task agents.
6. Refactor handle config construction to inject/reuse WorkspaceManager and `ensureWorkspaceByRootPath`; remove `buildFilesystemWorkspaceId` shortcut.
7. Add private exhaustive activation-plan resolution using mode/runtime/binding/activity. Reuse the existing inspector; normalize indeterminate/workspace/native-restore errors.
8. Route `restore_native` to generic manager restore; route `restore_external` to strict platform restore; route `new` to prepare-new.
9. Gate external candidate validation, binding construction, root adoption, context adoption, and task staged binding on external runtime kind. Native self-ID never enters these paths.
10. Preserve readiness single-flight, root/task/standalone durability, candidate publication, abort, quarantine, and failure matrix. Native restore failure never switches plan to new.
11. Add/update focused unit tests for mode propagation, nested configured inheritance, fresh task isolation, activity plan, external gate, workspace-before-backend ordering, native null tree/context, and overlapping native commands.
12. Add integration coverage using the real native backend (mock/model fixture as available) to prove same local memory directory restores and snapshot appends; test no valid-workspace temp fallback.
13. Re-run implementation-scoped builds/type checks and current focused suites. Return through code review.
14. After source review passes, `api_e2e_engineer` investigates durable coverage, imports secrets only into a disposable DB with the exact command, and repeats isolated Codex/Claude/native browser restarts. If durable test code changes, return through code review before delivery.

## Key Tradeoffs

- **Explicit mode versus persisted flag:** explicit mode is accurate and schema-free; it requires propagation through mixed composition but avoids stale duplicated state.
- **Activity-based native selection versus always restore:** selection matches personal's initialized/uninitialized semantics and avoids restoring nonexistent context; strict read can reduce availability when state is unreadable, intentionally protecting context.
- **Handle-owned workspace ensure versus eager root-wide activation:** handle placement preserves lazy topology and centralizes config correctness for configured/task/nested members; repeated roots may call idempotent WorkspaceManager, which is acceptable.
- **External-only binding gate versus widening binding with runtime kind:** gating keeps the root binding shape tight and provider-neutral; runtime adaptation remains at the handle.
- **Ignore old native self-ID versus migration:** normal runtime-kind semantics can use the existing data directly; rewrite cost/risk offers no correctness benefit.
- **Split subteam APIs versus boolean mode argument everywhere:** subject-specific methods prevent restored-parent task mistakes at compile/read time.

## Risks

- A mode propagation omission could fresh-create a nested configured member. Mitigation: required field plus nested tests.
- A restored parent mode could leak into a new task team. Mitigation: separate fresh-task factory method and tests.
- Activity present but working snapshot missing/corrupt will fail native restore. This is truthful; never create over it.
- Workspace activation may fail for unavailable roots. Surface error; never silently temp-fallback for non-null root.
- Existing converted native self-ID may confuse projections, though activation ignores it. Add representative direct-use test; no rewrite.
- Mixed handle size/lifecycle density grows. Keep plan resolver and workspace config as private cohesive methods; split only if a new independent concern appears.
- SR-003 cleanup/publication invariants must not regress during native routing. Preserve latches/call-count tests.
- Provider E2E depends on credentials/models. Retain isolated setup and physical evidence.

## Guidance For Implementation

- Do not edit `implementation-handoff.md`; implementation engineer owns it and must append a new implementation revision after rework.
- Treat current commit `ddfb494e7` as halted partial implementation, not the design authority. Requirements/investigation/design/SR-004 are authoritative after architecture pass.
- Install the handle readiness promise before workspace/activity/backend awaits.
- Workspace activation happens once per readiness attempt and before activity/candidate work. Use injected `Pick<WorkspaceManager,"ensureWorkspaceByRootPath">` for tests.
- Plan resolution is exhaustive. Do not use truthy `platformAgentRunId` as a universal branch.
- For native restored activity, create `AgentRunContext` with exact local run ID/config and `runtimeContext: null`; let the native backend factory restore from `config.memoryDir`.
- Never call `prepareRestoreAgentRunFromPlatformState` for native.
- Never call `createTeamAgentPlatformBinding`, `acceptPlatformBinding`, or context `adoptPlatformAgentRunId` for native, even if candidate reports local self-ID.
- For external no-binding state, retain complete-corpus guard. For external exact binding, retain strict returned-ID equality.
- New task agents/teams are fresh regardless of root mode. Configured descendants inherit mode.
- Candidate remains absent from `getActiveRun` until governing durability. `commitPublication` stays synchronous/I/O-free.
- On native restore failure after activity is present, abort/quarantine according to manager result and expose native restore failure; do not retry new.
- New V1 native trees must remain physically null in `platformAgentRunId`. Old native self-ID values are ignored, not adopted/rebound.
- Unit tests should latch workspace ensure, backend construction, root write, and abort. Assert call order, factory call count 1, shared promise/result, no native binding acceptor call, correct generic versus strict manager method, and retry/quarantine behavior.
- Native integration evidence must compare pre/post working snapshots and raw turn behavior, not only final response.
- Downstream browser run must use:

```bash
pnpm secrets:import -- \
  --source /Users/normy/.autobyteus/server-data/.env \
  --database-url file:///private/tmp/<isolated-run>/autobyteus.db
```

  with all database/app-data/memory/log/temp paths and ports explicitly pinned. Verify the server is fully stopped before restart and confirm no production database handle is open.
