# Design Spec

## Current-State Read

The V1 TeamRun execution tree is the authoritative persisted topology for one rooted team execution. `AgentTeamRunManager.createTeamRun()` writes that tree before any lazy member runtime is initialized, and `restoreTeamRun()` reconstructs configured runtime inputs from the stored tree. Initial `platformAgentRunId: null` is therefore correct only until an external backend establishes its provider identity.

The ownership break occurs after initialization. `MixedAgentMemberHandle` learns the provider ID from the created `AgentRun`, writes it only into `MixedAgentMemberContext`, and may refresh that detached field again from events. `RootTeamRun` never receives an execution-tree mutation. The V1 stream handler records only a summary, and the remaining `TeamRunService.refreshRunMetadata()` method has no caller and would only reproject the unchanged tree. Restart consequently reloads null and selects `createAgentRun()`.

Two lifecycle details constrain the target design:

1. Configured agents and members inside an already-committed task team initialize lazily after their tree nodes exist, so their binding can be adopted immediately by `RootTeamRun`.
2. A directly delegated task agent is initialized during local preparation before its task node exists. Its provider binding must be staged in the prepared task and folded into the root task-activation commit before the prepared handle becomes live or receives work.

`TeamRunPersistenceCoordinator` already serializes physical writes and provides write-before-live-commit behavior. However, task changes currently calculate `nextTree` before acquiring that lock. Adding concurrent provider-binding writes without correcting preparation timing would allow a stale task tree to overwrite a newly committed binding. All execution-tree changes in scope must therefore derive their next tree at the root lock head.

The Codex adapter correctly sends a supplied ID to `thread/resume`, but catches every resume failure and calls `thread/start`. That fail-open branch is incompatible with exact contextual continuation. Local history is stored separately in application-owned AgentRun memory; its complete user/assistant trace corpus supplies the canonical signal needed to distinguish a genuinely fresh null binding from an already-used, unrecoverable null binding.

Claude shares the V1 tree-ownership failure and adds a provider-specific lifecycle defect. `ClaudeSessionManager.createRunSession()` currently stores the local AgentRun ID as a temporary `sessionId`; `ClaudeAgentRunBackend.getPlatformAgentRunId()` therefore exposes a non-provider placeholder. `ClaudeSession.startTurn()` accepts input and starts provider work asynchronously. Only a later provider stream chunk supplies the actual UUID, which `ClaudeSession.adoptResolvedSessionId()` uses to replace the placeholder in runtime memory. Team persistence misses that late mutation; standalone activation/activity persistence may also record the placeholder before discovery. A graceful termination can happen to repair standalone metadata, but process-restart correctness cannot depend on cleanup timing.

The installed `@anthropic-ai/claude-agent-sdk@0.3.231` contract provides the missing clean lifecycle: SDK `sessionId` selects a caller-supplied valid UUID for a **new** conversation, while SDK `resume` loads an **existing** session. The current `ClaudeSdkClient` collapses those distinct meanings by naming its wrapper input `sessionId` but always mapping it to SDK `resume`. Because a provider-valid UUID can be reserved before the first turn, Claude does not need a late mutable identity or message-cache rekeying.

Two normal ingress paths also expose a publication-ordering defect that the target design must close. Team WebSocket messages are dispatched independently, so two first commands can enter the same lazy `MixedAgentMemberHandle.ensureReady()` before either asynchronous backend construction finishes. The current handle has no in-flight readiness state. `AgentRunManager.createAgentRun()` checks the active map before awaiting backend creation and registers only afterward, so overlapping calls can construct competing provider candidates. Separately, standalone `AgentRunCommandCoordinator` prefers a manager-registered run over its activation promise. `AgentRunProvisioningService` currently calls the eager manager creation API, then awaits `recordRunStarted`; a second supported command can therefore post input while the standalone UUID metadata commit is still pending.

These are not transport-only edge cases. Architecture review traced both from supported WebSocket actions in `ARCH-REV-001` (`PREM-ARCH-001` and `PREM-ARCH-002`). The live registry is consequently part of the durability boundary: construction and publication must be separate, and every product caller for one local AgentRun ID must join one owning readiness/activation attempt rather than racing through the active map.

`origin/personal` uses the same Claude placeholder/stream-adoption implementation. Its team path appeared healthy because legacy TeamRun metadata was rebuilt from mutable live member contexts after runtime events. V1 correctly removed that event/WebSocket-dependent projection but failed to add the root-owned binding transition. The target must not restore the personal-branch debounce.

The complete source, branch comparison, and runtime evidence are recorded in `investigation-notes.md`, `runtime-reproduction-evidence.md`, and `claude-runtime-reproduction-evidence.md`.

## Intended Change

Establish one explicit platform-binding lifecycle:

- A runtime member may discover a provider ID, but it cannot make that ID live by mutating its context directly.
- `AgentRunManager` separates runtime construction from live publication. `prepareNewAgentRun()` and strict prepare-restore operations synchronously claim the local run ID, construct one **unpublished** `AgentRunActivationCandidate`, install manager-owned observers while it is still private, and return only candidate metadata plus `commitPublication()` / `abort()`. The candidate hides the raw `AgentRun`; `getActiveRun()` cannot discover it and no caller can post input through it.
- A candidate claim remains exclusive until publication or confirmed abort. `commitPublication()` is a synchronous, I/O-free state transition that inserts the already-prepared run into the active registry and returns it. `abort()` terminates the private run and releases the claim only after cleanup is confirmed. Failed cleanup quarantines the claim and forbids another same-process candidate.
- The discovered binding is expressed as `TeamAgentPlatformBinding`, containing the existing compound team-member execution identity plus the opaque provider ID.
- For an already-present execution node, `RootTeamRun.adoptAgentPlatformBinding()` is the authoritative operation. It prepares from the current tree under the root persistence lock, applies an idempotent/conflict-rejecting pure mutation, writes the tree, then updates the root snapshot/index. Only after that acceptance succeeds may the member handle expose the new `AgentRun` as ready or forward a user message.
- `MixedAgentMemberHandle` owns one readiness promise per lazy member. The first supported caller creates the attempt; every overlapping caller receives the same promise and therefore the same candidate/adoption/publication result. On success, the handle assigns the published run before clearing the in-flight promise, so later callers use the ready field. On failure, the promise is cleared for retry only after a pre-publication failure has confirmed candidate cleanup. It is not cleared after an indeterminate root commit or failed cleanup.
- For a direct task agent whose node is not yet present, the local preparation owner stages the same binding value in `PreparedTaskExecution` while retaining the unpublished candidate. `TaskDelegationService` adds the node and applies all staged bindings to the same next tree inside the task activation transaction. The prepared execution publishes the candidate synchronously in `commitAfterDurability`; work remains unreleased until tree/task durability and candidate publication have both completed.
- Every tree-changing persistence plan—binding adoption, task activation, and task settlement—prepares its next tree at the serialized lock head so independent changes cannot overwrite one another.
- A null binding is allowed to create a provider session only when the complete local conversation trace corpus proves the execution is fresh. Prior user/assistant activity with null, or an unreadable/indeterminate activity state, produces an explicit non-resumable error.
- Restoring a known provider ID must either resume and return the same ID or fail. Codex must never translate `thread/resume` failure into `thread/start`.
- A fresh Claude backend reserves one UUID with `randomUUID()` during backend/session creation, before the candidate is returned. That UUID is immediately the backend's only `platformAgentRunId`: team creation adopts it through the root before publication/input, and standalone activation writes it through `recordRunStarted` before publication/input.
- Claude replaces its mutable placeholder with a `ClaudeProviderSessionLifecycle` state machine. `NEW_RESERVED` maps the first query to SDK `{ sessionId }`; once the SDK query object is successfully opened it moves to `RESUME_REQUIRED_UNCONFIRMED`; any matching provider stream identity moves it to `RESUMABLE_CONFIRMED`. Restored UUIDs begin `RESUME_REQUIRED_UNCONFIRMED`. Both non-new states map later queries to SDK `{ resume }`.
- Every non-null Claude stream UUID must equal the reserved/restored UUID. A successful turn cannot complete without at least one matching provider identity confirmation. A conflict or missing confirmation is terminal and cannot mutate the binding.
- `hasCompletedTurn` remains turn-result state only; it no longer selects creation versus resume. Provider-session lifecycle owns that decision, including interrupted/partial turns that have opened a query without completing.
- Standalone external-runtime restoration uses the same strict provider-state restoration boundary as team members. Missing IDs, Claude local-AgentRun-ID placeholders, provider restore failures, and returned-ID mismatches fail observably; no backend may reinterpret them as fresh creation.
- A new `StandaloneAgentRunActivationService` is the sole standalone live-admission owner. It holds one per-run activation promise across prepared creation and persisted restoration. `AgentRunCommandCoordinator`, explicit activation, create, and restore facades all join it. The service orders metadata validation -> private candidate construction/identity validation -> exact `recordRunStarted` durability -> candidate publication. The command coordinator no longer owns a competing activation map or combines a manager lookup with a separate activation path.
- If a standalone start write throws, activation strictly re-reads metadata. Exact intended started metadata is treated as committed and published; an unchanged readable prepared record is treated as not committed, the candidate is aborted, and retry is allowed after confirmed cleanup; missing, unreadable, or conflicting state is indeterminate, so the candidate is aborted/quarantined and same-process retry is rejected. No indeterminate state is exposed as active.

No persisted schema or bulk data rewrite is introduced.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User / Operational | REQ-001, REQ-002; AC-001, AC-002, AC-004 | Configured Codex member completes a turn, server restarts, user continues | Investigation `BEH-001`; live evidence shows stable local ID, null tree binding, and two provider IDs | Persist the first provider binding before the first message is forwarded; overlapping first commands join one unpublished candidate; restore that exact ID | Binding establishment `DS-001`; restart resume `DS-002`; durable transaction `DS-005`; candidate lifecycle `DS-010` |
| BEH-002 | User / Operational | REQ-007; AC-003 | Reopen persisted TeamRun history | Investigation `BEH-002`; local raw-trace projection restores messages independently | Preserve local history unchanged; provider failure is separately visible rather than hidden by history | Resume `DS-002`; error return `DS-004` |
| BEH-003 | System / Contract | REQ-003; AC-005 | Configured or task agent establishes an external provider identity | Investigation `BEH-003`; shared field exists on configured/task nodes, but current runtime context is detached | Use one binding value and one root-owned mutation invariant; direct task preparation retains an unpublished candidate and stages its binding into activation | Binding establishment `DS-001`; task activation `DS-003`; durable transaction `DS-005`; candidate lifecycle `DS-010` |
| BEH-004 | System / Operational | REQ-008; AC-009 | Restore standalone Codex AgentRun | Investigation `BEH-004`; persisted ID already reaches Codex restore | Preserve standalone path and make known-ID restore fail closed | Standalone restore `DS-006`; error return `DS-004` |
| BEH-005 | System | REQ-004; AC-006 | First activation with no binding or prior conversation | Investigation `BEH-005`; create path works but team ID is not persisted | Permit exactly one unpublished candidate only for provably fresh state; accept binding before publication/readiness | Binding establishment `DS-001`; task activation `DS-003`; activity guard `DS-007`; candidate lifecycle `DS-010` |
| BEH-006 | System / Contract | REQ-005, REQ-006; AC-007, AC-008 | Known-ID resume fails, or prior activity exists with a null binding | Investigation `BEH-006`; Codex currently starts new on resume failure | Produce explicit terminal continuation errors; never invoke new-thread fallback | Resume `DS-002`; error return `DS-004`; activity guard `DS-007` |
| BEH-007 | User / Operational / Contract | REQ-001 through REQ-004, REQ-009, REQ-010; AC-010 through AC-014 | Configured Claude member completes a context-bearing turn, server restarts, user continues | Investigation `BEH-007`; Claude browser evidence shows stable local ID, null tree binding, two provider UUIDs, and lost marker | Reserve one provider-valid UUID in one joined candidate before readiness, durably adopt it before publication, use SDK new-session `sessionId` once, then exact `resume`; stream may confirm but not replace | Team binding `DS-001`; restart `DS-002`; Claude lifecycle `DS-008`; durable transaction `DS-005`; candidate lifecycle `DS-010`; error `DS-004` |
| BEH-008 | System / Operational | REQ-009 through REQ-011; AC-014, AC-015 | Fresh standalone Claude run followed by abrupt process restart | Investigation `BEH-008`; current activation/activity can persist the local-ID placeholder before asynchronous UUID discovery | Join concurrent activation callers; persist the reserved provider UUID before live publication/input; restore the same UUID through strict manager/provider boundaries | Standalone create `DS-009`; standalone restore `DS-006`; standalone single-flight `DS-011`; candidate lifecycle `DS-010`; Claude lifecycle `DS-008`; error `DS-004` |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/runtime-reproduction-evidence.md` | Isolated live-browser restart and provider-identity evidence | REQ-001, REQ-002, REQ-007; AC-001 through AC-004 | Proves the exact broken lifecycle the binding and resume spines replace; supplies realistic downstream validation inputs | Complete / N/A evidence |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/claude-runtime-reproduction-evidence.md` | Claude live-browser restart evidence, provider UUID lifecycle trace, installed SDK contract, standalone timing finding, and `origin/personal` comparison | REQ-001 through REQ-004, REQ-009 through REQ-011; AC-010 through AC-015 | Proves the shared V1 binding loss and constrains the provider-specific preassigned-UUID/new-versus-resume design | Complete / N/A evidence |

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant and Boundary Or Ownership Issue
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: The execution tree is the sole restart source, but backends can mutate separate runtime contexts. Direct task preparation has no way to carry its early provider ID into activation. Tree writes serialize I/O but can prepare from stale snapshots. Codex resume is fail-open. Claude publishes a local-ID placeholder, learns a provider UUID after input, and conflates the SDK's new-session and resume options. `ARCH-REV-001` additionally established two supported overlap paths: a team handle can start two asynchronous candidates because readiness is not single-flight, and the standalone manager publishes a candidate before `recordRunStarted`, allowing a second command to bypass the activation promise.
- Design response: Give `RootTeamRun` one exact binding-adoption boundary, make member readiness one joined promise, stage pre-node task bindings and retain their unpublished candidates until root activation, and move all tree preparation under the existing root persistence lock. Split AgentRun construction from active publication with a manager-owned candidate claim. Add one standalone activation owner whose single-flight spans metadata decision, candidate construction, exact durable start metadata, and publication; remove command-coordinator activation ownership. Remove the Codex fallback and obsolete refresh facade. Replace Claude's placeholder with one preassigned UUID and an owned query-lifecycle state machine; route standalone external restore through the same strict candidate boundary.
- Refactor rationale: A local file write, stream-event refresh, provider-only persistence patch, or input gate layered on an already registered run would leave two identity/admission authorities and remain race-prone. The team invariant belongs at the root execution owner; lazy readiness belongs at one member handle; unpublished-versus-live runtime state belongs at `AgentRunManager`; and standalone durability/admission belongs at one standalone activation service. Claude's protocol distinction stays in its session/client adapter.
- Intentional deferrals and residual risk, if any: Exact recovery of already-broken null records or standalone Claude local-ID placeholders is impossible and remains intentionally unsupported; they receive an explicit error and retain readable local history. A crash after UUID persistence but before Claude provider materialization may leave an unmaterialized known UUID; restore must fail closed if the provider cannot resume it. The separate legacy/V1 data migration failure is not changed. API/E2E suite gating policy remains for downstream coverage investigation.

## Terminology

- **Platform binding:** The immutable association between one exact `TeamMemberExecutionIdentity` and the opaque provider-native `platformAgentRunId` established by its external runtime.
- **Binding adoption:** A null-to-non-null transition accepted by the owner. Repeating the same binding is idempotent; replacing it with a different value is a conflict.
- **Staged binding:** A discovered platform binding held inside an uncommitted direct task-agent preparation and included atomically in the task activation tree.
- **Fresh execution:** A node with a null platform binding and no persisted user/assistant conversation activity in its complete local trace corpus.
- **Broken historical binding:** A node with a null platform binding and prior persisted external-provider conversation activity, or an indeterminate activity read. It is non-resumable without guessing.
- **Claude provider session lifecycle:** Runtime-only state that pairs one immutable provider UUID with `NEW_RESERVED`, `RESUME_REQUIRED_UNCONFIRMED`, or `RESUMABLE_CONFIRMED`. It chooses SDK new-session versus resume behavior; it is not a second persisted identity.
- **Local-ID placeholder:** The current invalid use of the local AgentRun ID as Claude `platformAgentRunId`. It is neither a provider UUID nor recoverable provider context.
- **AgentRun activation candidate:** One manager-claimed, fully constructed but registry-invisible AgentRun whose raw input surface is hidden until the owning durability boundary calls synchronous `commitPublication()`.
- **Readiness/activation single-flight:** One promise per exact local AgentRun ID and owning scope. All overlapping supported callers join its result; no caller starts a parallel backend candidate.
- **Publication:** The I/O-free transition that moves a prepared candidate into `AgentRunManager`'s active registry after authoritative team or standalone durability succeeds.
- **Quarantine:** An in-memory run-ID claim retained after cleanup or commit state becomes indeterminate. It blocks same-process retry and therefore prevents a second provider candidate from compounding uncertain state.

## Design Reading Order

Follow the current-state and intended-change sections, then the behavior map and persisted-state decision, followed by spines, ownership/boundaries, file mapping, and sequencing below. The critical distinction is between immediate root adoption for an existing node and staged adoption inside a direct task activation before the node exists.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove `MixedAgentMemberHandle.capturePlatformRunId()` and all event/post-message recapture calls. Provider identity may change only through the explicit acceptor and context adoption method.
- Replace eager, live-registering `AgentRunManager.createAgentRun()` / `restoreAgentRun()` production contracts with unpublished candidate preparation plus explicit publication. Do not retain an eager convenience path that can bypass durability.
- Remove `AgentRunCommandCoordinator.activationByRunId` and its active-run-first activation composition. All standalone command, create, explicit activation, and restore callers join `StandaloneAgentRunActivationService`.
- Remove prepared-run activation ownership and `activationLocks` from `AgentRunProvisioningService`; it retains preparation/cancellation/expiry only. The new standalone activation owner performs creation/restoration durability and live publication.
- Remove direct public assignment to `MixedAgentMemberContext.platformAgentRunId`; retain only read access and an idempotent/conflict-rejecting adoption method invoked after acceptance.
- Remove unused `TeamRunService.refreshRunMetadata()`. Do not restore `origin/personal`'s debounced stream-event metadata projection.
- Replace unused `PreparedExecutionTreeCommit` / `commitExecutionChange()` with the prepare-against-current execution-tree mutation contract; do not retain both APIs.
- Remove Codex `thread/resume` catch-and-`thread/start` fallback. Fresh creation remains a separate explicit path, not a compatibility branch.
- Remove Claude local-AgentRun-ID session placeholders, arbitrary `adoptResolvedSessionId()` rebinding, `resolveProviderSessionIdForResume()`, and `ClaudeSessionMessageCache.migrateSessionMessages()`. Reserved UUIDs make rekeying obsolete.
- Replace the ambiguous `ClaudeSdkStartQueryTurnOptions.sessionId` wrapper field with one required discriminated `sessionBinding` that maps exclusively to SDK `sessionId` or SDK `resume`; do not retain both APIs.
- Remove `ClaudeAgentRunBackendFactory.restoreBackend()` fallback to `context.runId`; missing/placeholder external identity is an error.
- Do not add dual reads, guessed IDs, local Codex-session scans, or replay-local-history-as-provider-history fallbacks for broken records.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: V1 `team_run_execution_tree.json` agent nodes already contain `platformAgentRunId: string | null`; standalone AgentRun metadata already contains the equivalent field. Both isolated affected team trees had two configured agent nodes, both null, after one member completed turns. Current standalone Claude metadata can contain its local AgentRun ID placeholder.
- Relevant code-model, serialization, semantic, or physical-store change: No schema change. Team writer semantics change from “initial value only” to “durably adopt the established provider ID.” Fresh Claude writer semantics change from a local-ID placeholder/late replacement to one reserved provider UUID known before the first durable activation boundary.
- Normal reader/writer behavior and representative evidence: `TeamRunStatePackageLoader` and `buildTeamRunConfigFromExecutionTree` already read non-null values directly. The schema already validates them. The root persistence coordinator already writes complete tree snapshots atomically.
- Required semantics and invariants under direct use: A valid non-null ID remains opaque, exact, execution-specific, and immutable. Null remains valid only before provider initialization or for a runtime without an external provider identity. For Claude, a valid new UUID is intentionally provider-native because it is supplied to the SDK as the new conversation's `sessionId`; the local AgentRun ID is never valid provider state.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: Do not rewrite production trees, scan provider session directories to guess IDs, cross-bind members, or destroy local trace history. Existing broken null records must remain readable but non-resumable.
- Decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): Directly Usable — No Migration
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: The current schemas and readers already carry every required value. A migration cannot derive a missing opaque ID from null or a local-ID Claude placeholder safely, while a bulk rewrite would add I/O, corruption, and cross-binding risk without recovering meaning. Correct future writes plus fail-closed handling of broken histories provide the only safe outcome.
- Acceptance criteria or design constraints supported by this decision: AC-001, AC-004 through AC-015; REQ-001 through REQ-006 and REQ-008 through REQ-011.

### Migration Plan (Only When Decision Is `Migration Required`)

N/A — the approved decision is `Directly Usable — No Migration`.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-003, BEH-005, BEH-007 | One or more overlapping commands target the same lazy team member | All callers receive the same durably accepted, published AgentRun before any input is forwarded | `MixedAgentMemberHandle` for single-flight; `RootTeamRun` for binding | Establishes one candidate and the missing null-to-ID invariant before readiness |
| DS-002 | Primary End-to-End | BEH-001, BEH-002, BEH-006, BEH-007 | Persisted TeamRun restore and first post-restart command(s) | Exact provider resume through one published run or explicit joined failure | `RootTeamRun`, `MixedAgentMemberHandle`, and `AgentRunManager` | Carries the stored ID into one exact provider conversation without duplicate restores |
| DS-003 | Primary End-to-End | BEH-003, BEH-005 | Direct task-agent delegation preparation | Activated task tree and records with binding committed, candidate published, then work released | `TaskDelegationService` | Handles the lifecycle where provider identity exists before the node and forbids early registry visibility |
| DS-004 | Return-Event | BEH-002, BEH-006, BEH-007, BEH-008 | Continuation guard, provider restore failure, activation failure, or Claude identity violation | Existing TeamRun error event or standalone command/error status projection and UI | `MixedAgentMemberHandle`, `StandaloneAgentRunActivationService`, or active `AgentRun` boundary | Makes context loss and activation failure observable without transport ownership |
| DS-005 | Bounded Local | BEH-001, BEH-003 | Root execution-tree mutation plan reaches lock head | Physical write followed by root snapshot/index commit | `TeamRunPersistenceCoordinator` serving `RootTeamRun` | Prevents lost updates and preserves write-before-live-commit |
| DS-006 | Primary End-to-End | BEH-004, BEH-006, BEH-008 | One or more standalone commands/API calls request a persisted external AgentRun | Same provider ID restored and published once, or one explicit joined failure | `StandaloneAgentRunActivationService` and `AgentRunManager` | Preserves Codex and fixes Claude standalone continuation without duplicate restoration or silent replacement |
| DS-007 | Bounded Local | BEH-005, BEH-006 | Null external-provider binding before candidate creation | Fresh permit or non-resumable rejection | `MixedAgentMemberHandle` served by memory activity inspector | Distinguishes legitimate first creation from broken history |
| DS-008 | Bounded Local | BEH-007, BEH-008 | Claude provider UUID reservation or query start | Matching provider UUID confirmed and future turns forced to resume, or terminal identity error | `ClaudeProviderSessionLifecycle` serving `ClaudeSession` | Keeps new-session and resume semantics explicit without mutable rebinding |
| DS-009 | Primary End-to-End | BEH-008 | One or more commands overlap fresh standalone Claude activation | Reserved UUID durably written, one candidate published, then all callers receive the same run | `StandaloneAgentRunActivationService` | Closes both the pre-stream persistence window and the early-live-registry window |
| DS-010 | Bounded Local | BEH-001, BEH-003, BEH-005, BEH-007, BEH-008 | AgentRun construction is requested for one local run ID | Exactly one candidate is published after external acceptance, or confirmed aborted/quarantined | `AgentRunManager` | Makes undiscoverable-before-durability structural rather than caller convention |
| DS-011 | Bounded Local | BEH-008 | First standalone activation resolver call for a run ID | All compatible callers join one metadata/candidate/publication result | `StandaloneAgentRunActivationService` | Prevents command/API callers from bypassing pending durability |

## Primary Execution Spine(s)

- **DS-001 — Existing team-node binding establishment with overlap:** `two supported SEND_MESSAGE deliveries -> RootTeamRun.executeAgentCommand (twice) -> same MixedAgentMemberHandle.ensureReady -> one handle-owned readiness promise -> AgentRunManager.prepareNewAgentRun -> one unpublished candidate/provider ID -> RootTeamRun.adoptAgentPlatformBinding -> TeamRunPersistenceCoordinator durable commit -> context adoption -> candidate.commitPublication -> handle binds events/ready run -> both callers continue through the same AgentRun input admission`
- **DS-002 — Restart resume:** `TeamRunService.restoreTeamRun -> AgentTeamRunManager.restoreTeamRun -> TeamRunStatePackageLoader -> buildTeamRunConfigFromExecutionTree -> RootTeamRun -> first post-restart command(s) -> one handle readiness promise -> AgentRunManager.prepareRestoreAgentRunFromPlatformState -> provider exact resume and ID verification -> unpublished candidate -> candidate.commitPublication -> same AgentRun returned to all callers`
- **DS-003 — Direct task-agent activation:** `delegate_task -> TaskDelegationService -> host TeamRun.prepareTaskAgent -> MixedTaskAgentExecutionRegistry -> MixedAgentMemberHandle.prepareForTaskActivation -> AgentRunManager.prepareNewAgentRun -> unpublished candidate + staged TeamAgentPlatformBinding -> TaskDelegationCommandQueue -> prepare current tree at persistence lock -> add task node + apply staged binding -> persist tree and task records -> PreparedTaskExecution.commitAfterDurability publishes candidate and activates handle -> release work`
- **DS-006 — Standalone external restore with overlap:** `standalone command/API callers -> AgentRunService facade -> StandaloneAgentRunActivationService single-flight -> strict metadata state -> AgentRunManager.prepareRestoreAgentRunFromPlatformState -> exact provider resume/ID verification -> catalog/start reconciliation -> candidate.commitPublication -> same AgentRun returned to callers`
- **DS-009 — Standalone Claude creation with overlap:** `two standalone SEND_MESSAGE deliveries -> AgentRunCommandCoordinator (twice) -> AgentRunService.resolveCommandReadyAgentRun -> same StandaloneAgentRunActivationService promise -> prepared metadata -> AgentRunManager.prepareNewAgentRun -> ClaudeSessionManager reserves UUID in unpublished candidate -> validate provider-native ID -> recordRunStarted(UUID) durable/reconciled -> candidate.commitPublication -> both commands post through same run -> DS-008`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The first handle caller installs one readiness promise before asynchronous work; later callers join it. The manager returns one private candidate, Codex-created or Claude-UUID-reserved. The root durably accepts its binding. Only then does the handle adopt context, synchronously publish the candidate, bind events, and resolve all callers with the same run. A failed prepublication attempt aborts once; retry is permitted only after confirmed cleanup. | Team member execution, readiness attempt, AgentRun candidate, platform binding | `MixedAgentMemberHandle` for readiness; `RootTeamRun` for identity | Provider adapter, memory path, tree store, cleanup/quarantine, error projection |
| DS-002 | Restore constructs members from the stored tree. A non-null valid provider ID selects one handle readiness attempt and the manager's strict prepare-restore operation. The backend must expose the identical ID. Provider failure or mismatch aborts the candidate and propagates; no caller selects create. | Root TeamRun, team agent execution, provider session, candidate | `RootTeamRun` for identity; `MixedAgentMemberHandle` for one-flight; `AgentRunManager` for candidate lifecycle | Package loader, backend factory, provider client |
| DS-003 | Direct task preparation creates a private candidate before its node exists. The prepared execution carries the binding and owns candidate abort/publication. At root activation, the task owner adds the node and binding to the current tree in one transaction. The post-durability callback publishes the candidate and activates the registry; only releaseWork can then deliver input. | Task execution, unpublished candidate, platform binding | `TaskDelegationService` for durability; `MixedTaskAgentExecutionRegistry` for local prepared lifecycle | Task queue, tree mutator, tree/task stores, abort cleanup |
| DS-004 | Known continuation and activation errors are normalized at the owning pre-input boundary. Team failures become agent-scoped terminal TeamRun status/error results; standalone failures become activation-failure acknowledgements/status overlays. Normal in-turn Claude identity violations remain canonical AgentRun errors. | Team or standalone activation failure | Owning handle/activation service | Event publisher, broadcaster, WebSocket projector |
| DS-005 | Each tree-changing plan is queued by the persistence coordinator. Only at lock head does it read the current root tree, calculate the next validated tree, write it, and invoke live commit. Same-value adoption can finish unchanged; failures cancel or fail-stop without exposing a candidate. | Root execution tree transaction | `TeamRunPersistenceCoordinator` serving semantic root owners | Atomic file writer, fail-stop lifecycle |
| DS-006 | One standalone activation promise covers all supported callers for the local run ID. It reads persisted state, prepares an exact restore candidate, reconciles start/catalog durability, and publishes only after the exact binding remains durable. All callers receive the same run or failure. | Standalone AgentRun activation, provider session | `StandaloneAgentRunActivationService` | Metadata/catalog store, backend factory, error/status projection |
| DS-007 | Before null selects external creation, the handle asks the activity inspector for complete local conversation state. Only `none` permits candidate construction; `present` or `indeterminate` yields binding-missing/context-loss error before a provider candidate exists. | Team agent local history state | `MixedAgentMemberHandle` | Agent memory store/archives |
| DS-008 | `ClaudeProviderSessionLifecycle` owns one immutable UUID and the query-mode transition. A new run begins `NEW_RESERVED`; query opening moves it to resume-required even before a chunk. Every reported stream UUID must match, and at least one match is required before successful completion. Restored runs begin resume-required. | Claude provider session | `ClaudeProviderSessionLifecycle` serving `ClaudeSession` | SDK mapping, query cleanup, error conversion |
| DS-009 | The standalone activation owner joins overlapping callers, constructs one private Claude candidate, persists its reserved UUID, and only then publishes. Because the command coordinator cannot see candidates and has no separate activation promise, no input can reach the SDK before metadata durability. | Standalone AgentRun activation, Claude provider session | `StandaloneAgentRunActivationService` | Metadata reconciliation, manager candidate, Claude factory |
| DS-010 | The manager claims a run ID before awaiting backend construction. It prepares the AgentRun and manager observers without placing it in `activeRuns`; the candidate hides the raw run. Publication is a synchronous I/O-free claim-to-active transition. Abort is joined/idempotent and releases the claim only on confirmed teardown; uncertainty leaves the ID quarantined. | AgentRun candidate/publication claim | `AgentRunManager` | Backend factory, lifecycle attachments, teardown |
| DS-011 | The standalone owner places a promise in its per-run map before starting metadata/provider work. Command, create, activate, and restore callers all use this owner. Success removes the in-flight entry after publication; retryable failure removes it only after confirmed candidate abort; indeterminate states are retained as quarantine errors. | Standalone activation attempt | `StandaloneAgentRunActivationService` | Metadata strict read, catalog writer, status projection |

## Spine Actors / Main-Line Nodes

- `RootTeamRun`: authoritative rooted execution state and public team-operation boundary.
- `TaskDelegationService`: root-owned task lifecycle and activation transaction policy.
- `MixedAgentMemberHandle`: one lazy team agent's readiness single-flight, create-versus-restore selection, and provider/local adaptation boundary.
- `AgentRunActivationCandidate`: manager-owned private runtime between backend construction and authoritative publication; it exposes identity and commit/abort only, never input.
- `AgentRunManager`: exclusive run-ID claim, candidate preparation, strict restore verification, observer preparation, live publication, and teardown/quarantine.
- `StandaloneAgentRunActivationService`: one-flight standalone metadata decision, candidate durability, and active admission owner.
- `AgentRunProvisioningService`: standalone prepared-record creation, cancellation, and expiry only.
- `AgentRunCommandCoordinator`: command dedupe/status/input facade that requests a command-ready run from the standalone activation owner.
- `CodexThreadManager`: provider protocol owner for explicit start and explicit resume.
- `ClaudeProviderSessionLifecycle`: immutable provider UUID plus new-session/resume/confirmation state machine.
- `ClaudeSession` / `ClaudeSdkClient`: Claude turn lifecycle and exact mapping of the lifecycle's discriminated binding to SDK query options.
- `TeamRunPersistenceCoordinator`: serialized physical commit and fail-stop mechanism serving the root.
- `TeamRunExecutionTree` plus mutator: canonical immutable persisted identity model and pure transitions.

## Ownership Map

- **`RootTeamRun` owns:** current execution tree, index correlation, platform-binding immutability, root lifecycle admission, and authoritative adoption. It does not own runtime candidate construction or the active registry.
- **`TaskDelegationService` owns:** task preparation/activation/settlement policy and the exact durability point after which a prepared direct-task runtime may publish.
- **`MixedTaskAgentExecutionRegistry` owns:** the private direct-task handle/candidate before root activation, staged binding exposure, and local publish/abort callbacks invoked by `PreparedTaskExecution`.
- **`MixedAgentMemberHandle` owns:** exactly one readiness attempt for a configured/already-committed member, create versus restore selection, activity guarding, root acceptance ordering, joined caller result, and team error adaptation. It does not own durable identity or broadly visible registration.
- **`AgentRunManager` owns:** exclusive pending claims and published runs; construction of private candidates; strict restoration and exact-ID verification; prepublication observer setup; synchronous publication; confirmed teardown; and quarantine after cleanup uncertainty. It never decides whether team-tree or standalone metadata durability is sufficient.
- **`AgentRunActivationCandidate` owns:** its private AgentRun and local state (`PREPARED`, `PUBLISHED`, `ABORTED`, `QUARANTINED`). It hides input and makes publish/abort mutually exclusive.
- **`StandaloneAgentRunActivationService` owns:** one promise per standalone run ID, prepared-versus-started metadata selection, provider-ID validation, start-write reconciliation, publication after durability, and retry/quarantine classification. It is the only standalone path allowed to turn a candidate into an active run.
- **`AgentRunProvisioningService` owns:** prepared standalone record allocation, validation, cancellation, and expiry. It no longer owns activation or an activation lock.
- **`AgentRunCommandCoordinator` owns:** command identity/dedupe, overlays, lifecycle acknowledgements, and posting to a returned ready run. It owns no activation map and cannot read a private candidate.
- **`CodexThreadManager` owns:** `thread/start` for explicit creation and `thread/resume` for explicit restoration. It does not decide contextual fallback.
- **`ClaudeProviderSessionLifecycle` owns:** the one Claude provider UUID, next-query mode, post-open uncertainty, and exact stream-ID confirmation. It does not own persistence.
- **`ClaudeSessionManager` owns:** allocating a UUID for fresh Claude sessions and constructing restored lifecycle state from the supplied persisted ID. It never substitutes the local AgentRun ID.
- **`ClaudeSession` owns:** one Claude turn/query lifecycle and delegates identity decisions to the provider-session lifecycle. It cannot rebind the UUID.
- **`ClaudeSdkClient` owns:** translating exactly one discriminated `create` or `resume` binding into the provider SDK option of the same meaning.
- **`TeamRunPersistenceCoordinator` owns:** root-local commit serialization, file write order, write outcomes, and persistence fail-stop. It does not decide binding semantics.
- **Tree mutator owns:** pure traversal, exact compound-identity match, null-to-value transition, same-value idempotency, conflict rejection, and schema validation.
- **Conversation activity inspector owns:** strict read-only classification of complete external-runtime trace state as `none`, `present`, or `indeterminate`; it never selects provider identity.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TeamRunService` | `AgentTeamRunManager` / `RootTeamRun` | API-facing create, restore, lookup, summary/catalog operations | Platform-binding mutation or live-context projection |
| `MixedTeamRunBackend` / `TeamRun` | `MixedTeamManager` and ultimately `RootTeamRun` | Backend abstraction and exact containing-TeamRun command forwarding | Root persistence, provider binding policy, or ID guessing |
| `AgentTeamStreamHandler` | `RootTeamRun` | Parse commands and project root events to transport | Metadata refresh, persistence repair, provider fallback |
| `AgentRunService` | `AgentRunProvisioningService` / `StandaloneAgentRunActivationService` / `AgentRunManager` | Standalone API-facing preparation, command-ready activation, restoration, metadata, and history operations | Its own activation map, eager manager publication, provider option selection, or duplicate permissive runtime-context construction |
| `ClaudeAgentRunBackend` | `ClaudeSession` / `ClaudeProviderSessionLifecycle` | Generic AgentRun backend adaptation and immediate provider-ID exposure | UUID rebinding, metadata persistence, or SDK option heuristics |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `MixedAgentMemberHandle.capturePlatformRunId()` and event/post-message calls | Mutates a detached persistence representation after the fact | `TeamAgentPlatformBindingAcceptor` plus context adoption after acceptance | In This Change | Provider ID is established during create/restore readiness, not harvested from arbitrary events |
| Public mutable `MixedAgentMemberContext.platformAgentRunId` | Permits bypass of the authoritative owner | Private field with getter and conflict-checked `adoptPlatformAgentRunId()` | In This Change | Runtime mirror remains, but only after acceptance |
| `TeamRunService.refreshRunMetadata()` | Unused V1 facade; reprojects stale root and suggests legacy ownership | `RootTeamRun.adoptAgentPlatformBinding()` | In This Change | Do not recreate personal branch debounce |
| `PreparedExecutionTreeCommit` / `commitExecutionChange()` current shape | Unused and accepts a next tree prepared outside the root lock | Prepare-against-current execution-tree mutation contract | In This Change | All tree-changing paths must use current state at lock head |
| Pre-lock tree projection in task activation/settlement | Can overwrite concurrent binding mutations | Lock-head preparation inside persistence plans | In This Change | Retain task command queue for task policy |
| Eager live-registering `AgentRunManager.createAgentRun()` / `restoreAgentRun()` contracts | Publish before the caller's authoritative team/standalone durability boundary and permit competing async candidates | `prepareNewAgentRun` / prepare-restore returning `AgentRunActivationCandidate` | In This Change | Convert production callers and direct manager tests; do not keep a convenience bypass |
| `AgentRunCommandCoordinator.activationByRunId` and active-first activation resolution | A registered-but-not-durable run bypasses the coordinator promise; duplicates standalone activation ownership | `StandaloneAgentRunActivationService.resolveCommandReadyRun()` | In This Change | Coordinator retains command dedupe/status only |
| `AgentRunProvisioningService.activationLocks` and live activation implementation | Splits one standalone durability/admission lifecycle across provisioning and command/service callers | `StandaloneAgentRunActivationService` | In This Change | Provisioning becomes prepared-record allocation/cancel/expiry only |
| Codex resume-to-start fallback | Falsely converts contextual restoration into fresh creation | Strict propagated restore failure | In This Change | Explicit create path remains |
| Claude local AgentRun ID placeholder and factory restore fallback | Non-provider value can be persisted and suppresses resume | UUID reservation plus strict restored lifecycle construction | In This Change | Reject missing or local-ID restored binding |
| `ClaudeSession.adoptResolvedSessionId()` arbitrary replacement | Stream timing makes runtime identity mutable | `ClaudeProviderSessionLifecycle.confirmProviderSessionId()` exact-match confirmation | In This Change | Conflict or absent confirmation at successful completion is terminal |
| `ClaudeSession.resolveProviderSessionIdForResume()` and `hasCompletedTurn`-driven inference | Conflates turn completion with provider-session existence | Explicit provider-session lifecycle phase | In This Change | Interrupted/partial sessions resume after query opening |
| `ClaudeSessionMessageCache.migrateSessionMessages()` | Needed only because the cache begins under the local placeholder | Cache under the reserved/restored UUID from construction | In This Change | Delete when its sole caller is removed |
| Ambiguous wrapper `sessionId` always mapped to SDK `resume` | Hides the new-session versus existing-session distinction | Required discriminated `ClaudeSdkSessionBinding` | In This Change | Do not retain parallel optional fields |
| Duplicate standalone external restore-context construction in `AgentRunService` | Can bypass strict manager validation and identity equality | Strict manager platform-state restore boundary | In This Change | Native restoration stays on its native path |
| Guessed or replay-based historical recovery | Cannot prove exact provider identity | Explicit non-resumable error plus preserved local history | In This Change | No compatibility fallback added |

## Return Or Event Spine(s) (If Applicable)

- **DS-004 team:** `activity rejection / strict restore error / root adoption failure / candidate cleanup failure -> one MixedAgentMemberHandle readiness promise rejects -> known-error adapter -> TeamRunEventSourceType.AGENT ERROR + rejected AgentOperationResult -> RootTeamRun event publisher -> existing WebSocket projector -> all overlapping callers observe the same failure`. No candidate is published.
- **DS-004 standalone:** `metadata/identity/provider/commit/cleanup failure -> one StandaloneAgentRunActivationService promise rejects -> AgentRunService -> AgentRunCommandCoordinator activation-failure acknowledgement + status overlay/broadcaster -> clients`. The command coordinator does not run a second activation path.
- **DS-004 in-turn:** `Claude identity conflict/unconfirmed success -> Claude terminal error -> AgentRun canonical ERROR/status -> AgentStreamHandler projection`. No replacement session is created.
- Successful provider runtime events remain unchanged after publication: `provider -> AgentRun backend -> AgentRunEvent -> MixedAgentMemberHandle / TeamAgentEventAdapter -> TeamRunEvent -> RootTeamRun publisher -> WebSocket/history consumers`.

## Bounded Local / Internal Spines (If Applicable)

- **Parent owner: `TeamRunPersistenceCoordinator` (DS-005).** `enqueue mutation -> fail-stop check -> prepare against current root state -> validate next snapshot -> physical write(s) -> handle write result -> live commit/cancel/fail-stop`.
- **Parent owner: `MixedAgentMemberHandle` (DS-001/DS-007).** `return ready run OR join readinessAttempt OR install one promise -> build config/activity guard -> manager prepares private create/restore candidate -> await root acceptance when required -> adopt context -> candidate.commitPublication -> synchronously bind events/set ready run -> resolve joined callers`. On failure: `candidate.abort -> confirmed cleanup permits later retry; cleanup/root finalization uncertainty quarantines and rejects later same-process attempts`.
- **Parent owner: `AgentRunManager` (DS-010).** `claim runId before first await -> construct backend/AgentRun -> attach manager observers privately -> return candidate metadata -> external durability owner accepts -> commitPublication moves claim to active registry` or `abort -> detach/terminate -> release claim only on confirmed inactivity`. `getActiveRun` reads only the published map.
- **Parent owner: `StandaloneAgentRunActivationService` (DS-011).** `active published run? -> return; in-flight promise? -> join; else install promise before async work -> strict metadata state -> prepare candidate -> validate ID -> record/reconcile started metadata -> publish -> clear in-flight`. Retryable abort clears the entry; indeterminate commit/cleanup leaves a quarantine rejection.
- **Parent owner: `ClaudeProviderSessionLifecycle` (DS-008).** `reserve UUID -> NEW_RESERVED -> build create binding -> SDK query object opens -> RESUME_REQUIRED_UNCONFIRMED -> validate every non-null stream UUID -> RESUMABLE_CONFIRMED -> future query builds resume binding`. Restore begins resume-required.

### Candidate Failure, Cleanup, And Retry Matrix

| Failure Point | Candidate In Active Registry? | Authoritative State | Required Cleanup | Retry Rule |
| --- | --- | --- | --- | --- |
| Backend/candidate preparation fails before a candidate is returned | No | Unchanged | Manager tears down any partially built backend/observers and releases claim only after confirmation | Retry allowed only after confirmed cleanup; otherwise manager claim is quarantined |
| Team activity guard or root acceptance fails before durable commit | No | Null/unchanged | Joined handle attempt aborts candidate once | Handle clears readiness for later retry only after confirmed abort and non-indeterminate root result |
| Team root binding commits, then a later local step fails | No user input; publication is designed I/O-free | Exact binding is durable | Abort private candidate; preserve adopted binding | Later attempt must strict-restore the durable ID, never create; root fail-stop/quarantine if finalization was indeterminate |
| Direct task activation does not commit | No | Task node/binding not live | `PreparedTaskExecution.abort()` aborts candidate | Retry through a new task preparation only after confirmed cleanup |
| Standalone `recordRunStarted` returns exact target metadata | No until return, then published synchronously | Exact UUID/start metadata durable | None | All joined callers receive one run |
| Standalone start write fails and strict re-read shows unchanged prepared metadata | No | Provably not committed | Abort candidate | Clear activation promise and permit retry only after confirmed abort |
| Standalone start result is missing, unreadable, or conflicts | No | Indeterminate | Abort candidate best effort; retain activation quarantine | No same-process retry/publication; explicit typed failure and restart/reconciliation required |
| Candidate abort cannot confirm inactivity | No | Unchanged, committed, or indeterminate depending on earlier point | Retain manager claim and owning-scope quarantine | No new same-process candidate; all later callers receive cleanup-failed error |

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Execution-tree store | DS-001, DS-003, DS-005 | `RootTeamRun` through persistence coordinator | Atomic complete-tree write | Durable identity across restart | Direct handle writes split authority |
| Task records store | DS-003, DS-005 | `TaskDelegationService` | Durable task lifecycle records | Activation remains correlated with tree | Provider code must not edit task records |
| Conversation activity inspector | DS-007 | `MixedAgentMemberHandle` | Read complete user/assistant trace corpus strictly | Distinguishes fresh from broken null | Provider scans could guess identity |
| Provider backend factory/client | DS-001, DS-002, DS-006, DS-008, DS-009, DS-010 | `AgentRunManager`, `CodexThreadManager`, `ClaudeSession` | Provider construction/restoration and option mapping | Keeps provider specifics below AgentRun | Root/standalone metadata owners must not speak provider protocol |
| Manager lifecycle attachments | DS-010 | `AgentRunManager` | Prepare run-file, artifact-relay, and memory observers before candidate return; detach on abort | Makes later publication I/O-free and rollback-free under the claim | Attaching after authoritative commit could make publication fail |
| Event adapter/projector | DS-004 | Member handle / standalone command coordinator | Normalize failures and runtime events | Observable failure without transport ownership | Transport persistence/admission would couple correctness to UI |
| Strict standalone metadata read | DS-009, DS-011 | `StandaloneAgentRunActivationService` | Distinguish exact intended commit, unchanged prepared state, and unreadable/conflicting state | Enables deterministic retry versus quarantine after write error | Treating null as merely missing could create a second session |
| Candidate teardown | DS-001, DS-003, DS-006, DS-009, DS-010 | `AgentRunManager` | Joined private cleanup and claim release/quarantine | Prevents a second candidate while cleanup is uncertain | Caller-local best effort could leak competing providers |
| History catalog summary | DS-001, DS-002 | `TeamRunService` | Search/list summary only | Existing product history | Must not become binding source |
| Claude session message cache | DS-008 | `ClaudeSession` | Cache messages under immutable UUID | Supports provider-local reads | Rekeying reintroduces mutable identity |

## Ownership Boundaries

Provider construction and active publication are separate authoritative actions. `AgentRunManager` is the only owner of pending run-ID claims and the active registry. Its candidate API hides the raw `AgentRun`, so team/task/standalone owners can inspect the candidate's stable identity and choose commit or abort but cannot send input before durability. All eager manager create/restore APIs are removed from production use.

For an existing team node, the handle's one readiness promise prepares the candidate and `TeamAgentPlatformBindingAcceptor` bridges to `RootTeamRun.adoptAgentPlatformBinding`. The root owns semantic transition and live tree state; its persistence coordinator is internal. After acceptance, the handle adopts its context and publishes the candidate synchronously. For a direct task agent, `PreparedTaskExecution` retains the candidate and staged binding; only the task transaction's post-durability commit publishes it.

`StandaloneAgentRunActivationService` is the single standalone durability and admission boundary. `AgentRunService` is a facade; `AgentRunCommandCoordinator` requests `resolveCommandReadyAgentRun` and cannot bypass an in-flight activation via manager state because candidates are absent from `activeRuns`. `AgentRunProvisioningService` prepares/cancels records only. External restoration uses the manager's strict prepare-restore operation and exact-ID verification.

Within Claude, `ClaudeProviderSessionLifecycle` is the single runtime identity authority. `ClaudeSessionManager` creates it from either a generated UUID or required persisted UUID. `ClaudeSession` consumes its discriminated query binding; `ClaudeSdkClient` maps it without lifecycle inference. Local memory supplies only activity facts and never provider identity.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `RootTeamRun.adoptAgentPlatformBinding(binding)` | Tree mutator, current tree/index, persistence plan | Existing-node mixed binding acceptor | Handle -> tree store; stream -> metadata refresh | Keep compound identity/result explicit |
| `TaskDelegationService` activation | Staged bindings, task/tree commit, prepared candidate publication, work release | Delegation tools/root callers | Registry writes tree or publishes candidate before commit | Extend `PreparedTaskExecution` post-durability contract |
| `MixedAgentMemberHandle.ensureReady()` | One readiness promise, activity guard, candidate acceptance/publication, joined result | All configured/committed member commands | Registry/caller invokes manager creation directly | Add narrow handle lifecycle methods, not another readiness map |
| `AgentRunManager.prepare* -> AgentRunActivationCandidate` | Pending claim, backend/AgentRun construction, strict ID verification, observer preparation, registry publication, teardown/quarantine | Mixed handles/task registry/standalone activation owner | Caller receives raw unpublished AgentRun; eager create/restore registers immediately | Keep raw run private; expose metadata plus publish/abort only |
| `StandaloneAgentRunActivationService.resolve*` | Per-run promise, metadata-state selection, candidate durability, commit reconciliation, publication/quarantine | AgentRunService and all standalone command/create/activate/restore paths | Command coordinator active-first lookup plus separate activation; provisioning eager creation | Add intent-specific facade methods over one internal single-flight |
| `AgentConversationActivityInspector.inspect(...)` | Active/archive memory reads and strict classification | Mixed member handle | Handle parses JSONL/provider sessions | Add exact classification result only |
| `ClaudeProviderSessionLifecycle` | UUID normalization, query-mode state, stream confirmation | Claude manager/session | Direct `sessionId` assignment | Add narrow lifecycle methods |
| `ClaudeSdkClient.startQueryTurn(...)` | One binding -> one SDK option | ClaudeSession | Ambiguous/both identifiers | Require discriminated binding |

## Dependency Rules

1. All configured/already-committed member commands enter `MixedAgentMemberHandle.ensureReady`; no mixed registry/caller may invoke manager candidate preparation for that member independently.
2. `MixedAgentMemberHandle` may depend on the candidate API, binding acceptor, and activity inspector; it must not depend on tree stores, standalone activation, or provider-specific managers.
3. Direct task preparation may use the handle's explicit prepared-activation method, but candidate publication remains inside `PreparedTaskExecution.commitAfterDurability`; `releaseWork` is later.
4. `AgentRunManager` may depend on backend factories and manager-owned observers. It must not depend on team roots or standalone metadata. `getActiveRun` returns published runs only.
5. No production eager manager create/restore API may coexist with the candidate contract. Tests that need an active run must explicitly prepare then publish or use the higher owner.
6. Mixed factories may pass the binding acceptor downward; only `AgentTeamRunManager` binds the live-root acceptor.
7. `RootTeamRun` may use the tree mutator and persistence coordinator; transport/provider adapters may not call them.
8. All root tree changes prepare under the coordinator lock; precomputed `nextTree` is forbidden.
9. Agent-memory inspection returns only activity classification; agent-team code may not inspect provider session directories.
10. `CodexThreadManager.restoreThread` uses only `thread/resume`; `thread/start` is explicit create only.
11. `StandaloneAgentRunActivationService` is the only standalone owner allowed to call candidate `commitPublication`. It may depend on metadata/catalog, workspace/config construction, and manager candidate APIs.
12. `AgentRunProvisioningService` may prepare/cancel/expire standalone records but may not create/publish an AgentRun or own an activation map.
13. `AgentRunCommandCoordinator` may query whether a published run existed for overlay purposes, but actual command resolution must always call `AgentRunService.resolveCommandReadyAgentRun`; it owns no activation promise.
14. A strict metadata-state read used for commit reconciliation must distinguish present, missing, and unreadable. Missing/unreadable/conflict after a start-write exception never selects retry/create.
15. Claude manager/session/client dependency rules from SR-002 remain: generated/restored lifecycle only; exact confirmation; create maps only to SDK `sessionId`; resume maps only to SDK `resume`.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `MixedAgentMemberHandle.ensureReady()` | One committed team-member runtime | Join or create exactly one readiness result | Exact handle execution identity | Promise installed before async work; raw candidate never returned |
| `MixedAgentMemberHandle.prepareForTaskActivation()` | One uncommitted direct-task runtime | Prepare one private candidate and staged binding | Exact pending task AgentRun identity | Callable only by task registry; publication deferred |
| `TeamAgentPlatformBindingAcceptor.accept(binding)` | One existing team binding | Accept discovered ID before runtime publication | Compound execution identity + provider ID | Production implementation calls root |
| `RootTeamRun.adoptAgentPlatformBinding(binding)` | Persisted team execution | Durable null-to-ID adoption | Root ID + address + AgentRun ID + provider ID | Same idempotent; different conflict |
| `PreparedTaskExecution.stagedPlatformBindings` | Pending task activation | Carry pre-node IDs into root transaction | Readonly bindings | Separate from task identity |
| `PreparedTaskExecution.commitAfterDurability()` | Pending local task runtime | Publish candidate and activate local registry after tree/task commit | Opaque prepared execution | Synchronous/I/O-free; work not yet released |
| `AgentRunManager.prepareNewAgentRun(input)` | Fresh AgentRun candidate | Claim ID, construct privately, prepare observers | `runId + AgentRunConfig` | Returns candidate, never active run |
| `AgentRunManager.prepareRestoreAgentRunFromPlatformState(input)` | External restore candidate | Exact restore/verify while private | `runId + config + non-null provider ID` | Typed failure; never create fallback |
| `AgentRunActivationCandidate` | One private AgentRun | Expose stable run/runtime/provider identity; publish or abort | Manager claim token hidden internally | No `postUserMessage`, `reserveInput`, backend, or raw run getter |
| `AgentRunActivationCandidate.commitPublication()` | Candidate live transition | Atomically move claim to active registry and return run | Exact candidate instance | Synchronous/no I/O after manager pre-preparation |
| `AgentRunActivationCandidate.abort()` | Candidate cleanup | Join teardown and classify confirmed vs quarantined | Exact candidate instance | Claim released only on confirmed inactivity |
| `StandaloneAgentRunActivationService.resolveCommandReadyRun(runId)` | Standalone command admission | Return published run or join create/restore activation | Exact local run ID | All commands use this path |
| `StandaloneAgentRunActivationService.activatePreparedRun(runId)` | Prepared standalone run | Validate -> candidate -> durable start -> publish | Exact local run ID | Shares per-run promise with command resolver |
| `StandaloneAgentRunActivationService.restorePersistedRun(runId)` | Started standalone run | Exact restore candidate -> reconcile -> publish | Exact local run ID + stored binding | Shares per-run promise |
| `AgentRunMetadataService.readMetadataState(runId)` | Standalone metadata read | Distinguish present/missing/unreadable for reconciliation | Exact local run ID | Existing forgiving read remains for non-critical catalog use |
| `AgentConversationActivityInspector.inspect(input)` | Local conversation evidence | Classify prior activity | AgentRun ID + exact memoryDir | none/present/indeterminate |
| `ClaudeProviderSessionLifecycle.reserveNew(factory)` | Fresh Claude provider session | Allocate UUID and enter NEW_RESERVED | UUID factory | Deterministic test injection |
| `ClaudeProviderSessionLifecycle.restore(sessionId, localRunId)` | Existing Claude provider session | Validate and enter resume-required | Provider UUID distinct from run ID | No provider probing/create |
| `ClaudeProviderSessionLifecycle.buildNextQueryBinding()` | Next Claude query | Return create or resume binding | Immutable UUID + phase | No SDK dependency |
| `ClaudeProviderSessionLifecycle.noteQueryOpened(binding)` | Claude query lifecycle | Make uncertain opened session resume-only | Previously issued binding | No second create |
| `ClaudeProviderSessionLifecycle.confirmProviderSessionId(id)` | Claude stream identity | Exact confirmation | Non-null provider UUID | Mismatch terminal |
| `ClaudeSdkClient.startQueryTurn({sessionBinding,...})` | Claude SDK query | Exclusive provider option mapping | create or resume discriminant | Never both |

Stable failure codes at these boundaries are:

- `TEAM_AGENT_CONTINUATION_BINDING_MISSING` — prior local conversation exists but the canonical team node has no provider binding.
- `TEAM_AGENT_CONTINUATION_STATE_UNREADABLE` — conversation activity cannot be classified safely.
- `TEAM_AGENT_PLATFORM_BINDING_CONFLICT` — the exact node already contains a different provider ID.
- `TEAM_AGENT_PLATFORM_BINDING_COMMIT_FAILED` — binding transition did not commit durably.
- `AGENT_RUN_ACTIVATION_IN_PROGRESS_CONFLICT` — a bypass attempted to construct another candidate for an already claimed run ID; normal callers must join their owning single-flight.
- `AGENT_RUN_ACTIVATION_CLEANUP_FAILED` — private candidate inactivity could not be confirmed; the run ID remains quarantined.
- `STANDALONE_AGENT_RUN_ACTIVATION_COMMIT_INDETERMINATE` — strict reconciliation cannot prove exact started metadata or unchanged prepared metadata; no publication/retry occurs.
- `PLATFORM_AGENT_RUN_RESTORE_FAILED` — known provider state could not be restored or returned a different ID.
- `PLATFORM_AGENT_RUN_BINDING_INVALID` — persisted external identity is missing/placeholder.
- `CLAUDE_PROVIDER_SESSION_ID_CONFLICT` — stream UUID differs from reserved/restored UUID.
- `CLAUDE_PROVIDER_SESSION_ID_UNCONFIRMED` — successful turn ended without confirmation.

Client messages describe inability to continue/activate without raw provider IDs. Causes and IDs remain scoped diagnostics.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Handle readiness single-flight | Yes | Yes | Low | One promise is scoped to one exact handle/execution; no global selector |
| Binding acceptor/root adoption | Yes | Yes | Low | Require compound team-member identity |
| Prepared task staged bindings/publication | Yes | Yes | Low | Keep provider state outside task identity and publish only post-durability |
| AgentRun candidate | Yes | Yes | Low | Hide raw run/input; expose stable identity plus mutually exclusive publish/abort |
| Manager pending claim | Yes | Yes | Low | Key by exact local run ID and private claim token; reject bypasses rather than joining unknown ownership |
| Standalone activation single-flight | Yes | Yes | Low | One service owns per-run promise across command/create/activate/restore |
| Strict metadata-state read | Yes | Yes | Low | Present/missing/unreadable are distinct; no null conflation at activation reconciliation |
| Activity inspector | Yes | Yes | Low | Exact memoryDir/AgentRun ID; never return provider IDs |
| Strict platform restore | Yes | Yes | Low | Provider ID non-null; returned value exact |
| Claude provider lifecycle | Yes | Yes | Low | One immutable UUID/phase; no setter |
| Claude SDK session binding | Yes | Yes | Low | Discriminated union prevents conflation |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Rooted team lifecycle owner | `RootTeamRun` | Yes | Low | Retain |
| Provider association | `TeamAgentPlatformBinding` | Yes | Low | Match persisted field |
| Runtime between construction and live admission | `AgentRunActivationCandidate` | Yes | Low | Do not call it active/prepared metadata run |
| Candidate live transition | `commitPublication` | Yes | Low | Distinguish registry publication from provider creation |
| Standalone one-flight/durability owner | `StandaloneAgentRunActivationService` | Yes | Low | Standalone prefix prevents generic-owner ambiguity |
| Conversation evidence reader | `AgentConversationActivityInspector` | Yes | Low | Output is activity, not resumability |
| Strict restore error | `PlatformAgentRunRestoreError` | Yes | Low | Provider-neutral |
| Claude UUID state machine | `ClaudeProviderSessionLifecycle` | Yes | Low | Provider-local lifecycle |
| Claude query identity choice | `ClaudeSdkSessionBinding` | Yes | Low | create/resume discriminant |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Durable tree commit | `TeamRunPersistenceCoordinator` | Extend | Existing root serialization/fail-stop | N/A |
| Pure tree transition | execution-tree mutator | Extend | Existing nesting/validation owner | N/A |
| Root binding ownership | `RootTeamRun` | Extend | Existing root snapshot owner | N/A |
| Pre-node task transaction | `PreparedTaskExecution` + task service/registry | Extend | Already retains local prep until durable activation | N/A |
| Team readiness one-flight | `MixedAgentMemberHandle` | Extend | Existing per-member runtime lifecycle owner | N/A |
| Private-to-live AgentRun lifecycle | `AgentRunManager` | Extend + one new owned candidate file | Manager already owns active registry/attachments/termination; it needs a tight private candidate abstraction rather than a second coordinator | Candidate file encapsulates manager claim state without leaking raw run |
| Standalone activation/durability | Agent execution service area | Create New `StandaloneAgentRunActivationService` | Current responsibilities are split among provisioning, service, manager, and command coordinator; one owner is required for the supported concurrency path | Provisioning should remain record preparation; command coordinator should remain command/status; manager cannot own standalone metadata |
| Critical metadata reconciliation | AgentRun metadata store/service | Extend | Existing atomic file owner can expose strict read classification | N/A |
| Prior conversation evidence | Agent-memory services | Create New | No strict classification API exists | Belongs with trace semantics |
| Provider restore failure | AgentRunManager/errors | Extend | Correct provider-neutral candidate boundary | N/A |
| Codex protocol | Codex thread manager | Extend | Existing start/resume owner | N/A |
| Claude identity lifecycle | Claude session area | Create New | Small state machine replaces opportunistic mutation | Not generic AgentRun or SDK-client policy |
| Claude SDK mapping | Claude SDK client | Extend | Existing adapter | N/A |
| UI observability | Existing team/standalone status projectors | Reuse | Already carries terminal failures | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent-team domain/services | Binding, root transition, task contracts, root durability | DS-001, DS-003, DS-005 | Root/task owners | Extend | No provider types |
| Mixed team backend | Readiness single-flight, acceptor propagation, deferred task candidate, error adaptation | DS-001 through DS-004, DS-007 | Member handle/task registry | Extend | No stores/direct provider APIs |
| Agent execution lifecycle | Candidate claim, private construction, strict restore, publication, abort/quarantine | DS-002, DS-006, DS-010 | AgentRunManager | Extend + candidate file | Active registry contains published only |
| Standalone activation | One-flight metadata decision/durability/publication | DS-006, DS-009, DS-011 | Standalone activation service | Create New | Provisioning becomes preparation-only |
| Run-history metadata | Strict present/missing/unreadable read plus existing atomic write | DS-009, DS-011 | Standalone activation service | Extend | No activation policy in store |
| Agent memory | Strict activity classification | DS-007 | Member handle | Create New | Canonical trace corpus |
| Codex backend | Exact resume | DS-002, DS-006 | Codex manager | Extend | Delete fallback |
| Claude backend/session | UUID reservation/query lifecycle/confirmation | DS-001, DS-002, DS-006, DS-008, DS-009 | Claude lifecycle/session | Extend | No team/metadata dependency |
| Runtime-management Claude client | Discriminated SDK mapping | DS-008 | SDK client | Extend | No lifecycle inference |
| Streaming transport | Existing projection | DS-004 | Domain outcomes | Reuse | No persistence/admission changes |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `domain/team-agent-platform-binding.ts` | Agent-team domain | Binding contract | Value/normalizer/acceptor/errors | One semantic concept | Execution identity |
| `domain/root-team-run.ts` + tree mutator/persistence files | Agent-team | Root/persistence | Adopt at lock head and commit tree | Existing authorities | Binding/contracts |
| `domain/prepared-task-execution.ts` + task service/registry | Task lifecycle | Task owner/local registry | Stage binding, retain candidate, publish post-durability, then release | Existing prepared boundary | Binding/candidate |
| `backends/mixed/members/mixed-agent-member-handle.ts` | Mixed backend | Readiness owner | One-flight, guard, candidate prepare, accept, publish/abort, errors | Cohesive member lifecycle | Candidate/acceptor/activity |
| `agent-execution/services/agent-run-activation-candidate.ts` | Agent execution | Manager-owned private lifecycle | Hide raw run; candidate states; publish/abort exclusivity | Tight reusable manager return type | AgentRun identity only |
| `agent-execution/services/agent-run-manager.ts` | Agent execution | Registry/candidate owner | Claims, private construction, strict restore verify, observers, publish, cleanup/quarantine | Existing manager authority | Candidate/errors |
| `agent-execution/services/standalone-agent-run-activation-service.ts` | Standalone activation | Durability/admission owner | Per-run promise, metadata selection/reconciliation, candidate publication | One new missing owner | Candidate/metadata |
| `agent-execution/services/agent-run-provisioning-service.ts` | Standalone preparation | Prepared-record owner | Prepare/cancel/expiry only; remove activation locks | Retightened existing file | N/A |
| `agent-execution/services/agent-run-service.ts` | Standalone facade | API facade | Delegate command-ready/activate/restore to activation owner | Existing public boundary | Typed results |
| `agent-execution/services/agent-run-command-coordinator.ts` | Standalone commands | Command/status owner | Remove activation map; request command-ready run | Existing command boundary | N/A |
| `run-history/store/agent-run-metadata-store.ts` + service | Run history | Metadata provider | Strict read classification for activation reconciliation | Existing store/service | Metadata shape |
| `agent-memory/services/agent-conversation-activity-inspector.ts` | Agent memory | Read-only inspector | Complete trace classification | Separate storage concern | Memory layout |
| Codex manager and Claude lifecycle/session/client files | Provider subsystems | Provider owners | SR-002 exact resume/UUID design | Existing/new cohesive provider files | SDK binding |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Compound team identity + platform ID | team binding file | Agent-team | Root/handle/task/mutator | Yes | Yes | Generic session DTO |
| Execution-tree transition results | mutator/binding domain | Agent-team | Root/task tests | Yes | Yes | Persistence result |
| Lock-head commit shapes | persistence contract | Team persistence | Binding/task mutations | Yes | Yes | Generic transaction framework |
| Private AgentRun candidate lifecycle | `agent-run-activation-candidate.ts` | Agent execution | Team/task/standalone all require same no-input/publication invariant | Yes | Yes | Generic durability transaction or raw AgentRun wrapper |
| Standalone activation promise | Remains private map in standalone activation service | Standalone activation | All standalone callers join one result | Yes | Yes | Global manager readiness map |
| Metadata read classification | Existing metadata store/service types | Run history | Activation must distinguish unreadable/missing | Yes | Yes | Versioned schema compatibility |
| Claude create/resume binding | Claude SDK binding file | Claude client | Lifecycle/client contract | Yes | Yes | Generic platform binding |
| Claude UUID/phase logic | Claude lifecycle file | Claude session | Manager/session/backend invariant | Yes | Yes | Persistence model |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamAgentPlatformBinding` | Yes | Yes | Low | Compound execution + one provider ID |
| `PreparedTaskExecution.stagedPlatformBindings` | Yes | Yes | Low | Separate from task identity |
| `AgentRunActivationCandidate` | Yes | Yes | Low | Expose identifiers/state transitions, not raw run/input/durability callbacks |
| Manager pending claim | Yes | Yes | Low | Private token keyed by run ID; distinct from active map |
| Standalone activation in-flight map | Yes | Yes | Low | Private promise keyed by run ID; no duplicate command map |
| Metadata read state | Yes | Yes | Low | present/missing/unreadable only |
| Mixed context binding | Yes after change | Yes | Low | Private post-accept mirror |
| Persisted `platformAgentRunId` | Yes | Yes | Low | Existing schema |
| Activity classification | Yes | Yes | Low | none/present/indeterminate |
| Claude SDK/lifecycle structures | Yes | Yes | Low | One UUID and discriminated query binding |

## Final File Responsibility Mapping

| File | Owner / Boundary | Concrete Concern | Required Change |
| --- | --- | --- | --- |
| `src/agent-team-execution/domain/team-agent-platform-binding.ts` | Team binding | Value/acceptor/errors | Add |
| `src/agent-team-execution/domain/root-team-run.ts` | Root authority | Durable existing-node adoption | Modify |
| `src/agent-team-execution/services/team-run-execution-tree-mutator.ts` | Pure mutator | Exact adoption across node shapes | Modify |
| `src/agent-team-execution/services/team-run-persistence-{contract,coordinator}.ts` | Root durability | Lock-head preparation/outcomes | Modify |
| `src/agent-team-execution/domain/prepared-task-execution.ts` | Prepared task boundary | Staged bindings and post-durability local commit | Modify |
| `src/agent-team-execution/task-delegation/task-delegation-service.ts` | Task owner | Add node+binding at lock head; invoke publication before work | Modify |
| `src/agent-team-execution/backends/mixed/members/mixed-task-agent-execution-registry.ts` | Prepared local task owner | Retain unpublished candidate; stage binding; publish/abort through prepared contract | Modify |
| `src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Member readiness | One-flight promise; candidate acceptance/publication/cleanup; separate task-preparation method | Modify |
| Mixed factory/manager/configured registry/context and `services/agent-team-run-manager.ts` | Composition/runtime mirror | Propagate root acceptor; private post-accept context adoption | Modify |
| `src/agent-execution/services/agent-run-activation-candidate.ts` | AgentRunManager internal boundary | Candidate state and raw-run encapsulation | Add |
| `src/agent-execution/services/agent-run-manager.ts` | Candidate/active registry owner | Claim before await; private construction/restore verification; prepare observers; publish/abort/quarantine; remove eager APIs | Modify |
| `src/agent-execution/errors.ts` | Execution errors | Activation conflict/cleanup/restore codes | Modify |
| `src/agent-execution/services/standalone-agent-run-activation-service.ts` | Standalone durability/admission | Per-run one-flight, create/restore, metadata reconciliation, candidate publish/quarantine | Add |
| `src/agent-execution/services/agent-run-provisioning-service.ts` | Standalone preparation | Retain prepare/cancel/cleanup; remove activation and locks | Modify |
| `src/agent-execution/services/agent-run-service.ts` | Standalone facade | Compose new activation owner; expose command-ready/activate/restore delegation; remove runtime-context construction | Modify |
| `src/agent-execution/services/agent-run-command-coordinator.ts` | Command/status | Remove activation map and active-first resolution; call command-ready service | Modify |
| `src/run-history/store/agent-run-metadata-store.ts` and `services/agent-run-metadata-service.ts` | Metadata provider | Strict present/missing/unreadable read state | Modify |
| `src/agent-memory/services/agent-conversation-activity-inspector.ts` | Memory inspector | Complete activity classification | Add |
| `src/agent-execution/backends/codex/thread/codex-thread-manager.ts` | Codex protocol | Delete resume-to-start fallback | Modify |
| Claude context/bootstrap/session manager/session/cache/backend factory/backend files | Claude provider lifecycle | SR-002 reserved UUID/exact confirmation/removals | Modify/Add lifecycle file |
| `src/runtime-management/claude/client/claude-sdk-session-binding.ts` and client | Claude SDK boundary | Discriminated create/resume mapping | Add/Modify |
| `src/agent-team-execution/services/team-run-service.ts` | Thin team facade | Remove unused refresh | Modify |

## Applied Patterns (If Any)

- **Prepared commit:** Team/task/standalone owners make durability explicit; private AgentRun candidates publish only after the owning commit.
- **Single-flight:** One promise at the member handle and one at the standalone activation owner join supported overlapping callers at their natural scope.
- **Factory/composition root:** `MixedTeamRunBackendFactory` propagates one required binding acceptor through configured and nested TeamRuns without hiding policy in a service locator.
- **Candidate/commit:** `AgentRunManager` prepares an undiscoverable candidate; team/task/standalone owners decide durability; publication is a synchronous manager transition.
- **State machine:** `ClaudeProviderSessionLifecycle` makes new reservation, uncertain query opening, and confirmed resumability explicit; provider stream events validate the state rather than mutate identity.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `src/agent-team-execution/domain/team-agent-platform-binding.ts` | File | Team domain | Binding/acceptor/error vocabulary | Team invariant | Provider APIs/I/O |
| `src/agent-team-execution/domain/root-team-run.ts` | File | Root authority | Existing-node adoption/live tree state | Existing root owner | Provider protocol/raw store access |
| `src/agent-team-execution/services/team-run-execution-tree-mutator.ts` | File | Pure transition | Exact recursive adoption | Existing tree mutation home | I/O/runtime handles |
| `src/agent-team-execution/services/team-run-persistence-{contract,coordinator}.ts` | Files | Root persistence | Lock-head preparation/commit outcomes | Existing durability subsystem | Provider fallback |
| `src/agent-team-execution/domain/prepared-task-execution.ts` and `task-delegation/` | Files/folder | Task lifecycle | Staged binding, post-durability local publication, work release | Existing task transaction | Direct provider/store bypass |
| `src/agent-team-execution/backends/mixed/` | Folder | Team runtime adaptation | One-flight readiness, root acceptor, deferred task candidate | Existing mixed runtime mechanics | Direct tree writes/standalone metadata |
| `src/agent-execution/services/agent-run-activation-candidate.ts` | File | AgentRunManager internal | Raw-run encapsulation and candidate state | One tight lifecycle subject | Team/metadata durability policy; input methods |
| `src/agent-execution/services/agent-run-manager.ts` | File | Candidate/active registry | Claims, private construction, strict restore, observer prep, publish/abort/quarantine | Existing runtime registry owner | Team tree/standalone metadata decisions |
| `src/agent-execution/services/standalone-agent-run-activation-service.ts` | File | Standalone durability/admission | Per-run single-flight, metadata decision/reconciliation, candidate publication | Missing authoritative owner | Provider SDK details/team tree mutation |
| `src/agent-execution/services/agent-run-provisioning-service.ts` | File | Standalone preparation | Prepared record allocation/cancel/expiry only | Retightened existing concern | AgentRun creation/publication/activation map |
| `src/agent-execution/services/agent-run-service.ts` | File | Standalone facade | Compose preparation/activation/history entrypoints | Existing public service | Independent activation/runtime context construction |
| `src/agent-execution/services/agent-run-command-coordinator.ts` | File | Command/status | Dedupe/status and request command-ready run | Existing command boundary | Activation map/candidate lookup |
| `src/run-history/store/agent-run-metadata-store.ts` and service | Files | Metadata provider | Strict present/missing/unreadable reads | Existing persistence owner | Activation policy |
| `src/agent-memory/services/agent-conversation-activity-inspector.ts` | File | Memory read | Strict activity classification | Trace semantics owner | Provider ID inference |
| `src/agent-execution/backends/codex/thread/codex-thread-manager.ts` | File | Codex protocol | Exact resume without fallback | Existing provider owner | Team/metadata logic |
| `src/agent-execution/backends/claude/session/` and `backend/` | Folders | Claude lifecycle/adapter | Reserved UUID, explicit query state, confirmation, immutable cache key | Existing provider depth | Team/standalone persistence |
| `src/runtime-management/claude/client/claude-sdk-session-{binding,client}.ts` | Files | Claude SDK adapter | Discriminated create/resume mapping | Existing provider-client owner | Lifecycle inference |

## Folder Boundary Check

| Path / Folder | Structural Depth | Boundary Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `agent-team-execution/domain` | Main-Line Domain-Control | Yes | Low | Root/binding semantics |
| `agent-team-execution/services` | Persistence/domain service | Yes | Low | Pure mutation and durability mechanisms |
| `agent-team-execution/task-delegation` | Main-Line Domain-Control | Yes | Low | Task transaction owns deferred publication point |
| `agent-team-execution/backends/mixed` | Mixed Justified | Yes | Medium | Runtime adaptation and per-member readiness only |
| `agent-execution/services` | Main-Line Domain-Control | Yes | Medium | Manager owns generic candidate/registry; standalone activation owns metadata admission; provisioning and facade remain thin and distinct |
| `run-history/store` / `services` | Persistence-Provider | Yes | Low | Strict read is metadata semantics, not activation policy |
| `agent-memory/services` | Off-Spine Concern | Yes | Low | Activity classification |
| Codex/Claude backend/client folders | Provider control/adapter | Yes | Low | Provider-specific lifecycle remains isolated |
| `services/agent-streaming` | Transport | Yes | Low | No persistence/admission edits |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why It Matters |
| --- | --- | --- | --- |
| Two team first commands | `caller A installs readiness promise; caller B joins; one candidate -> root commit -> publish -> both receive same run` | both see `agentRun == null` and each call async create | Prevents competing provider sessions |
| Existing-node adoption | `private candidate -> root accept/persist -> context adopt -> publish -> input` | manager registers -> later tree write | Makes durability precede discoverability |
| Direct task preparation | `private candidate + staged binding -> tree/task commit -> publish -> registry active -> release` | publish during prepare and hope activation commits | Protects pre-node lifecycle |
| Standalone overlapping commands | `both call command-ready resolver -> same activation promise -> UUID metadata write -> publish -> input` | second command sees manager active while first still writes metadata | Closes ARCH-FIND-002 |
| Candidate cleanup | `abort joins teardown; release claim only when inactive; otherwise quarantine` | best-effort terminate then immediately create replacement | Prevents uncertain duplicates |
| Standalone write error | `strict reread exact target => publish; unchanged prepared => abort/retry; unreadable/conflict => quarantine` | treat all exceptions as prepared and retry create | Deterministic commit classification |
| Concurrent tree changes | `lock -> prepare current tree -> write -> live commit` | precompute then overwrite newer tree | Prevents lost updates |
| Restore semantics | `known ID -> exact resume candidate -> same ID or typed failure` | resume failure -> fresh create | Prevents false continuation |
| Broken historical null | `activity + null -> non-resumable error` | guess provider ID/replay history | Only canonical binding proves identity |
| Fresh Claude identity | `reserve UUID in private candidate -> durable adopt/write -> publish -> SDK {sessionId}` | local placeholder -> late rebinding | Valid identity before input |
| Claude later/restore | `query opened -> resume-required; {resume: same UUID}` | `hasCompletedTurn` chooses mode | Handles partial materialization |
| Claude stream identity | equal confirms; mismatch fails | observed UUID replaces binding | Stream validates only |

Illustrative narrow candidate contract:

```ts
type AgentRunCandidateAbortResult =
  | Readonly<{ kind: "aborted" }>
  | Readonly<{ kind: "quarantined"; error: Error }>;

interface AgentRunActivationCandidate {
  readonly runId: string;
  readonly runtimeKind: RuntimeKind;
  readonly platformAgentRunId: string | null;
  commitPublication(): AgentRun; // synchronous; returns the run only after registry insertion
  abort(): Promise<AgentRunCandidateAbortResult>;
  // no postUserMessage, reserveUserMessage, backend, context, or raw AgentRun getter
}
```

Illustrative team single-flight shape:

```text
ready active? return it
readinessAttempt exists? return it
install one promise before asynchronous configuration/backend work
promise: prepare candidate -> durable accept -> publish -> set ready
failure: abort candidate once -> clear only if cleanup and commit state are provably retry-safe
```

Illustrative standalone activation shape:

```text
published run? return/validate operation
activation promise exists? join it
otherwise install one promise before async work:
  strict metadata -> prepare private create/restore candidate -> validate identity
  -> record/reconcile started metadata -> commitPublication
```

Illustrative binding and Claude shapes remain:

```ts
type TeamAgentPlatformBinding = Readonly<{
  execution: TeamMemberExecutionIdentity;
  platformAgentRunId: string;
}>;

type ClaudeSdkSessionBinding =
  | Readonly<{ kind: "create"; sessionId: string }>
  | Readonly<{ kind: "resume"; sessionId: string }>;
```

```text
NEW_RESERVED --query opened--> RESUME_REQUIRED_UNCONFIRMED
RESUME_REQUIRED_UNCONFIRMED --matching stream id--> RESUMABLE_CONFIRMED
restored persisted UUID -------------------------> RESUME_REQUIRED_UNCONFIRMED
```

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Mechanism | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Reintroduce personal event refresh | Previously worked | Rejected | Root adoption before publication |
| Dual-write context/tree | Small patch | Rejected | Post-accept context mirror only |
| Keep eager manager create/restore beside candidate APIs | Test/caller convenience | Rejected | Convert callers/tests; no bypass around durability |
| Register candidate with an `initializing` input flag | Smaller manager change | Rejected | Candidate absent from active registry and raw input hidden |
| Keep command coordinator activation map | Already exists | Rejected | One standalone activation promise behind AgentRunService |
| Keep provisioning activation locks too | Limits local diff | Rejected | Provisioning preparation-only; activation service sole owner |
| Release manager claim after failed cleanup | Improves availability | Rejected | Quarantine until restart/reconciliation |
| Treat metadata read `null` as safe retry | Existing forgiving API | Rejected | Strict present/missing/unreadable classification |
| Keep old precomputed tree API | Smaller refactor | Rejected | Lock-head preparation only |
| Codex resume-to-start fallback | Availability | Rejected | Observable exact restore failure |
| Guess/replay historical context | Apparent recovery | Rejected | Explicit non-resumable outcome |
| Keep Claude placeholder/ambiguous client/rebinding | Test compatibility | Rejected | Reserved UUID/lifecycle/discriminated binding |
| Retry Claude create after query open | Availability | Rejected | Exact resume only after uncertainty |
| Persist Claude phase | Narrow crash distinction | Rejected | Persist UUID only; restore conservatively resumes |

## Derived Layering (If Useful)

`Transport -> Root team boundary -> Mixed handle single-flight -> AgentRun candidate lifecycle -> Provider adapter`

`Root team boundary -> TeamRun persistence coordinator -> execution-tree store`

`Standalone command/API facade -> StandaloneAgentRunActivationService -> AgentRun candidate lifecycle -> Provider adapter`

`StandaloneAgentRunActivationService -> run-history metadata/catalog`

Task preparation branches under the root task owner, retains a private candidate, and rejoins after tree/task durability before publication/work. Candidate construction is below the team/standalone durability owners, while publication remains inside the manager-owned registry boundary.

## Change / Refactor Sequence

1. Add `AgentRunActivationCandidate` and activation error vocabulary. Refactor `AgentRunManager` so it claims a run ID before awaiting backend work, prepares all manager observers privately, returns only the candidate, publishes synchronously, and aborts/quarantines deterministically.
2. Remove eager manager create/restore production APIs and convert direct manager tests/callers to explicit candidate publication or their higher owner. Add focused manager coverage for overlap conflict, registry invisibility, no input surface, observer rollback, publication, joined abort, confirmed retry, and quarantine.
3. Add `StandaloneAgentRunActivationService` with one per-run promise across command, create, prepared activation, and restore. Add strict metadata read classification and start-write reconciliation. Retighten `AgentRunProvisioningService` to prepare/cancel/expiry; remove its activation locks.
4. Route `AgentRunService` activation/restore/command-ready methods through the new standalone owner. Remove duplicate external runtime-context construction. Remove `AgentRunCommandCoordinator.activationByRunId` and active-first activation composition; always request a command-ready run.
5. Add `TeamAgentPlatformBinding`/acceptor/errors and pure recursive adoption tests.
6. Replace precomputed tree commits with lock-head plans; convert task activation/settlement while preserving abort/orphan/fail-stop behavior.
7. Add `RootTeamRun.adoptAgentPlatformBinding` and propagate its acceptor through team composition.
8. Refactor `MixedAgentMemberHandle` to install one readiness promise before async work, use private candidate create/strict restore, accept/adopt before publication, and share success/failure across callers. Implement retry only after confirmed cleanup; quarantine indeterminate attempts.
9. Refactor direct task preparation to retain an unpublished candidate, expose staged bindings, publish in the post-durability commit, activate the local registry, and release work last.
10. Add the complete-corpus activity inspector and fail-closed null guard.
11. Add provider-neutral strict restore verification in candidate preparation and delete Codex resume-to-start fallback.
12. Add `ClaudeSdkSessionBinding` and `ClaudeProviderSessionLifecycle`; reserve deterministic UUIDs on fresh creation and require exact restored state.
13. Refactor Claude session/client/cache/backend paths for query-open uncertainty, exclusive SDK options, exact stream confirmation, and placeholder/adoption/migration removal.
14. Normalize prepublication team/standalone failures through existing status/error projections. Add new activation cleanup/indeterminate codes without exposing provider IDs.
15. Delete capture/event recapture, public context assignment, unused refresh facade, eager manager APIs, provisioning/command activation maps, obsolete commit contracts, Claude placeholder/adoption/inference/cache migration, and ambiguous SDK inputs. Search production and tests for every bypass.
16. Run implementation-scoped concurrency and lifecycle checks: two overlapping team first commands create one backend/candidate and share one result; direct-task candidate is absent until task durability; two standalone commands cannot post before exact metadata commit; create/restore callers join; every failure-matrix row yields the specified retry/quarantine state. Preserve tool/interrupt/native behavior.
17. Downstream API/E2E re-evaluates durable coverage and repeats isolated Codex/Claude browser restart markers plus standalone Claude abrupt restart where feasible.

## Key Tradeoffs

- **Candidate/publication seam versus an initializing active-run flag:** The seam changes more manager callers, but structurally prevents discovery and input rather than relying on every caller to honor a flag.
- **Two scoped single-flights versus one global coordinator:** Team readiness needs root/task semantics, while standalone activation needs metadata semantics. A handle-local promise and standalone-service promise share the manager candidate primitive without creating a generic policy blob.
- **Manager claim/quarantine versus immediate retry:** Quarantine reduces availability after cleanup uncertainty, but prevents a second provider candidate from compounding unknown state.
- **New standalone activation owner versus widening provisioning or command coordination:** The new file gives metadata durability and live admission one owner while keeping record preparation and command/status responsibilities singular.
- **Strict metadata reconciliation versus treating write failure uniformly:** A strict re-read can safely recover an exact committed write or allow retry from an unchanged record; unreadable/conflicting state must fail closed.
- **Immediate root adoption plus staged task adoption:** Node lifecycle genuinely differs; both reuse one binding and one manager candidate lifecycle.
- **Fail closed versus automatic historical recovery:** Broken null/placeholder histories remain readable but cannot claim continuation.
- **Provider-neutral persistence with provider-specific repair:** Root/standalone owners handle opaque identity; Codex/Claude adapters retain protocol semantics.
- **Preassigned Claude UUID:** Enables pre-input durability but leaves a narrow persisted-yet-unmaterialized crash window that exact restore may reject.
- **Runtime-only Claude phase/query-open transition:** Avoids schema migration and prevents uncertain second creation at the cost of fail-closed resume after pre-chunk failure.

## Risks

- Manager candidate refactor touches direct test and internal callers. Mitigation: remove eager APIs in one sequence, compile-search all calls, and make candidate publication explicit.
- A manager observer could fail during candidate preparation. Mitigation: install before candidate return, roll back already-installed observers, terminate partial backend, and release claim only after confirmed cleanup.
- Two team commands could still diverge if a registry bypasses the handle. Mitigation: forbid direct manager calls, test exact same promise/backend count, and search all configured-member production paths.
- Publication after durability must remain synchronous/I/O-free. Mitigation: preinstall observers, reserve run ID, and test that `commitPublication` only moves the claimed object into `activeRuns`.
- Direct-task post-durability publication invariant failure would occur after physical commit. Mitigation: make all fallible preparation precede durability; treat an impossible claim mismatch as root fail-stop/quarantine and send no work.
- Standalone start-write exceptions may occur after metadata replacement. Mitigation: strict re-read and exact target comparison; never infer retry from the forgiving null API.
- Cleanup failure can leave an unused provider artifact. Mitigation: no input, retained claim/quarantine, scoped diagnostics, and no same-process replacement. Remote artifact deletion is not assumed available.
- Incorrect recursive tree mutation/task lock conversion risks wrong node/lost updates. Mitigation: compound identity, all node-shape tests, lock-head concurrency regression coverage.
- Activity inspection may miss archives/read failures. Mitigation: complete corpus and `indeterminate` blocks create.
- Strict Codex restore exposes hidden corruption. This is intentional truthful failure.
- A reserved Claude UUID may be durable before provider materialization; exact restore can fail. Never create a replacement.
- Claude stream omissions/mismatch and existing placeholder tests require focused updates without weakening tools, interrupts, compaction, or event order.

## Guidance For Implementation

- `AgentRunManager` must place a private claim token in its pending map before the first backend-factory `await`. `activeRuns` and `getActiveRun` contain published runs only.
- `AgentRunActivationCandidate` must not expose the raw run, context, backend, input methods, or subscriptions. Identity getters are snapshot values. Only `commitPublication` returns the run, after insertion.
- Prepare manager-owned run-file/artifact/memory attachments before returning the candidate. Abort detaches them and terminates the private run. `commitPublication` performs no await, provider call, store write, or fallible attachment.
- Candidate abort is one joined operation. Remove the pending claim only when termination confirms inactivity. On rejection/throw/unknown activity, retain quarantine and return `AGENT_RUN_ACTIVATION_CLEANUP_FAILED`.
- `MixedAgentMemberHandle` installs `readinessAttempt` before async config/backend work. Every overlapping caller returns that exact promise. Assign the published run and bind events synchronously, then clear the in-flight promise so the ready field becomes the next-call authority. On failure, clear only according to the failure matrix.
- If root adoption commits but local candidate cleanup follows, update/adopt the context binding before retry classification so a later attempt selects strict restore, never create.
- `MixedTaskAgentExecutionRegistry` must not call the normal live `ensureReady` during preparation. Use the explicit deferred preparation method; prepared registries and manager active lookup must not expose the candidate.
- `PreparedTaskExecution.commitAfterDurability` publishes/activates synchronously; `releaseWork` happens afterward. Abort before durability awaits candidate cleanup.
- `StandaloneAgentRunActivationService` installs its map promise before metadata/provider work. `AgentRunCommandCoordinator` always calls `resolveCommandReadyAgentRun`; its initial active lookup may only inform overlay display.
- For standalone start reconciliation, compare the exact run ID, runtime kind, platform ID, and non-null started state against the intended target. Only exact target is committed; only exact original prepared state is retryable. Missing/unreadable/conflicting is indeterminate.
- External standalone candidates require non-null provider-native identity; Claude requires valid UUID distinct from local run ID. Native runtimes may remain null.
- Preserve generic opaque team IDs; validate Claude UUID syntax only inside Claude lifecycle. Detect old `platformAgentRunId === runId` before provider work.
- Lock-head tree preparation reads the root snapshot once and installs exactly the written snapshot/index.
- Do not emit persistence-driving runtime events. Transport projects outcomes only.
- Claude lifecycle remains synchronous/store-free; SDK binding is required and exhaustive; query-open and stream-confirmation rules from SR-002 remain unchanged.
- Unit/integration coverage must use controllable latches around backend creation, root write, metadata write, and abort to prove ordering—not only final state. Assert backend factory call count `1`, candidate absent from `getActiveRun`, shared promise/result, no SDK input before durability, physical tree/metadata exactness, and retry/quarantine results.
- Realistic validation records provider ID before restart, stops the server fully, reopens the same run, asserts identical ID, and asks a context-dependent question. Visible history alone is insufficient; standalone Claude restart omits graceful termination.
