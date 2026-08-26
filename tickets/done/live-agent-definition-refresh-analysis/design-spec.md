# Design Spec

## Current-State Read

The authoritative worktree is no longer the preimplementation baseline. Integrated HEAD `c3b2466489e81d74930582f76016540480345020` contains the stopped-run feature, SR-004 sequential-flow cleanup, provider bridge, and the advanced Application runtime topology merged at `7e3f4e97c3e58951daa21070e46cb8c71246197a`. The target design must correct that real integrated code rather than describe a greenfield change.

- The current browser implementation has `ExistingRunConfigEditor`, specialized Agent/Team drafts, narrow mutations, fixed-versus-model-control presentation, schema validation, Save feedback, and Team propagation without stopped-run Reset. Those parts directly serve the approved feature.
- The current SR-004 browser implementation already awaits Stop separately and makes Settings entry own a network-fresh resume query before unlock. This user-corrected sequence is preserved; CR-F-003 concerns only the server authority behind that fresh result.
- General Process `StandaloneAgentRunLifecycleService` owns activation, stopped update, and a per-run lane. General `AgentTeamRunManager.updateStoppedModelConfigs` uses the existing root lane. External-channel ingress reaches those same General owners.
- Application Engine intentionally constructs another `AgentRunManager`, `AgentTeamRunManager`, lifecycle service, `AgentRunService`, and `TeamRunService` in `createApplicationRunServices`. Application launch/input reaches those application-scoped instances, while Studio GraphQL/history is composed only with General Process services. Both families share persisted history, but their live maps and lanes are instance-local. The current General-only Settings read/update can therefore misclassify a normally active Application-owned ID as stopped and write it.
- Application orchestration already owns durable exact-ID evidence: Agent metadata and Team trees retain `applicationId`/`bindingId`; `ApplicationRunLookupStore` indexes roots and members for nonterminal bindings; launch establishes lookup before returning the binding; startup recovery rebuilds it behind `ApplicationOrchestrationStartupGate`; terminal transition persists `TERMINATED`/`ORPHANED` before removing lookup; and `sendRunInput` rejects terminal bindings. Supported post-start `reloadAndReenter` clears/rebuilds the lookup while startup is already ready, so the owner reader must cross-check persisted provenance rather than equating temporary lookup absence with release.
- SR-004 already removed SR-003 revision tokens, stale-writer behavior, browser draft rebasing, and unrelated Team archive/delete broadening. SR-005 must not restore any of them.
- Existing metadata and schema-v2 Team trees already store the relevant `llmConfig`. The current narrow update services/mutator, validator, atomic write/reread handling, and canonical result shapes are retained behind the new owner-aware orchestration boundary.
- AutoByteus and Codex consume persisted `llmConfig` during create/restore. The implemented Claude bridge now carries capability-valid thinking/effort into SDK query options for pinned `@anthropic-ai/claude-agent-sdk@0.3.231`; that correction remains required.

The target preserves explicit Stop, the sequential browser journey, independently triggered General external-channel restore, Application encapsulation, persisted packages, provider bindings, and active-runtime immutability. Detailed evidence and commands are in `investigation-notes.md`, BEH-001 through BEH-008, and MP-SR5-001/002/003.

## Intended Change

Add stopped-only, persisted model-configuration editing for an existing standalone Agent Run or existing root Agent Team Run.

1. While the standalone runtime or Team root is active—including visually idle—all configuration stays locked.
2. After the user manually completes Stop and then opens Settings, a network-fresh resume query must confirm stopped state before unlocking only current-schema `llmConfig` controls. Runtime, model identity, workspace, definition/topology, auto approval, skill mode, and every other launch field remain fixed.
3. The selected-run footer presents `Save` in place of the pre-launch Run action. It stays disabled while active, clean, invalid, or otherwise ineligible. An enabled Save validates and persists a local draft, but never stops, starts, interrupts, or replaces a run.
4. After Save returns, a later browser message uses the existing restore path and reconstructs the same logical run/team and provider binding from the newly persisted configuration.
5. Team editing is root-gated. The draft snapshots parent/child equality at load. A parent update flows through matching descendants until a draft-start divergence or a scope directly edited in the current draft; that boundary and its branch remain unchanged. A direct edit after propagation overrides the propagated value and blocks later ancestor propagation. Configured scopes use their own fixed model schema. The stopped-run surface adds no Reset-to-inherited action; the existing pre-launch Reset remains unchanged. Only configured root/team/agent scopes can be patched.
6. All three runtimes honor exposed settings. Claude gains the missing typed `llmConfig`-to-SDK query adapter and capability-accurate catalog schema.
7. The browser does not gain multi-tab/revision-conflict behavior. General per-run/root lanes remain because verified external-channel ingress can independently restore General-owned stopped runs; restore-first yields `RUN_ACTIVE`, while Save-first commits before restore reads.
8. Application Engine remains a separate owner family. A new Application-owned, startup-ready run-ownership reader accepts an exact run/root ID plus optional persisted `applicationId`/`bindingId` provenance, cross-checks the global lookup and binding, and exposes only whether a nonterminal lease exists. A focused Studio model-config service first reads canonical history to obtain that provenance, then consults the lease for all four config operations: live lease means locked/`RUN_ACTIVE` and no write; verified release delegates to General update owners. Inconsistent/unavailable ownership evidence fails closed. Managers are neither merged nor exposed.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User / Contract | REQ-001, REQ-015; AC-015 | Save a reusable Agent/Team Definition | Investigation BEH-001 | Preserve definition saving as separate; never use it to mutate a run instance. | Existing definition path remains unchanged. |
| BEH-002 | System | REQ-004, REQ-006, REQ-007, REQ-015; AC-001, AC-002, AC-007, AC-014, AC-016 | Create or restore a runtime from persisted launch configuration | Investigation BEH-002 and runtime feasibility table | Preserve bootstrap-time configuration and make saved `llmConfig` its next input. | DS-002, DS-004, DS-008 |
| BEH-003 | System / Operational | REQ-002, REQ-003, REQ-006, REQ-009; AC-003, AC-004, AC-008 | Send work to an active General run/team or a nonterminal Application binding | Investigation BEH-003; CRR-006 MP-CR-003/004 | Preserve active backend reuse and stable per-backend configuration; owner-aware Settings must not equate absence from General maps with stopped. | General paths DS-002/DS-004/DS-006/DS-007; Application ownership DS-009. |
| BEH-004 | User | REQ-001–REQ-007, REQ-009–REQ-014; AC-001–AC-004, AC-009–AC-014, AC-016 | After Stop completes, open Agent Configuration | Investigation BEH-004 and UI journey trace | Settings performs a network-fresh read; active stays locked; stopped current-schema model controls become draft-editable and Save becomes available. | DS-001, DS-005, DS-006 |
| BEH-005 | User | REQ-001, REQ-003–REQ-015; AC-005–AC-015 | After root Stop completes, open Team Configuration | Investigation BEH-005 and UI journey trace | Settings performs a network-fresh read; active root stays locked; stopped configured scopes become directly model-config-editable. Parent changes use the approved value-matching propagation boundary, and no stopped-run Reset action is added. | DS-003, DS-005, DS-007 |
| BEH-006 | Contract | REQ-002, REQ-003, REQ-009, REQ-012–REQ-014; AC-003, AC-004, AC-008, AC-010 | Read canonical config/status or submit Save for an exact ID | Investigation BEH-006; CR-F-003 | Keep model-config editability, narrow mutations, canonical results, and revision-free outcomes; add one owner-aware Studio boundary before General read/update delegation. | DS-001, DS-003, DS-005–DS-007, DS-009 |
| BEH-007 | User / System | REQ-004, REQ-010, REQ-011; AC-009, AC-011, AC-012, AC-016 | Render/validate current runtime-model configuration and restore | Investigation BEH-007 plus exact Claude SDK probe | Reuse current schemas non-destructively; validate authoritatively; make Claude catalog/runtime application truthful. | DS-001, DS-003, DS-008 |
| BEH-008 | System / Operational | REQ-002, REQ-003, REQ-006, REQ-009, REQ-012; AC-003, AC-004, AC-008, AC-014 | External-channel ingress resolves a General binding, or Application Engine input addresses a nonterminal Application binding | Investigation BEH-008; MP-SR4-003/004; MP-SR5-001/002/003 | Preserve both owner families. General ingress shares General lanes with Save. Application input remains inside its owner, while the durable nonterminal binding lease keeps Studio locked/rejected until terminal release. | DS-002, DS-004, DS-006, DS-007, DS-009 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/ui-ux-spec.md` | Sequential Settings states, contextual Save, failure recovery, Team hierarchy, responsive behavior, and accessibility. | REQ-002–REQ-005, REQ-008, REQ-010–REQ-012; AC-001–AC-014, AC-016 | Governs observable frontend behavior in DS-001, DS-003, DS-005, and the projection of DS-009 results. | Refined through SR-005 on 2026-08-25; user-approved browser flow unchanged. |

## Task Design Health Assessment (Mandatory)

- Change posture: Feature / Behavior Change.
- Current design issue found: Yes.
- Root cause classification: Missing Invariant and Boundary Or Ownership Issue, with a corrected local Claude adapter defect and historical SR-003 duplicated policy/coordination overreach.
- Refactor needed now: Yes, narrowly.
- Evidence: CRR-006 traced normal Application launch/input through application-scoped live owners and Studio configuration through General Process owners. Because maps and lanes are instance-local, SR-004's claimed convergence is false. The existing Application global lookup/binding terminal lifecycle is durable, startup-reconciled, and already governs whether normal Application input is accepted.
- Design response: Keep the sequential UI, identity-specific General stopped-update commands, General per-run/root external-restore lanes, browser drafts, narrow Team patches, validation, canonical outcomes, and runtime mapping. Add `ApplicationRunOwnershipService` behind the Application platform boundary and `StudioRunModelConfigService` at Studio composition. The latter guards all config reads/updates before delegating eligible work to General services.
- Refactor rationale: This uses the smallest authoritative shared fact—the Application binding lease—rather than pretending two manager families share a lane or creating a global manager. A live binding produces an ordinary lock/rejection; terminal release makes Application input unavailable before General persistence can be admitted.
- Intentional deferrals and residual risk: General-purpose schema standardization, owner-aware routing of Studio Stop/message/archive/delete, and unrelated Application takeover/resume behavior are deferred. Dynamic catalog or ownership-read absence fails closed. Simultaneous browser writers remain outside the product contract.

## Terminology

- **Stopped standalone run:** no General `AgentRun` is registered/activating for the run ID and no nonterminal Application binding owns the exact ID.
- **Stopped Team Run:** the General root is not managed and no nonterminal Application binding owns the root ID. A stopped member inside a managed or Application-bound root is insufficient.
- **Application ownership lease:** verified global lookup and/or persisted canonical provenance showing that an exact run/root/member ID belongs to a binding in `ATTACHED`, `TERMINATING`, or `FAILED`. It is a config-eligibility barrier, not exposure of the application-scoped manager.
- **Released identity:** the referenced Application binding is durably terminal (`TERMINATED`/`ORPHANED`), or startup-ready ownership resolution finds neither an exact lookup nor canonical Application provenance. A terminal binding ends the lease even if its lookup row is momentarily pending removal; normal Application input is already unavailable, and Studio may consult General lifecycle state.
- **Fixed launch identity:** runtime, model, definition, workspace, topology, auto approval, skill mode, IDs, and provider binding; none is accepted by Save.
- **Configured Team scope:** root `/`, configured nested-team address, or configured-agent address. Task-created executions are excluded.
- **Canonical configuration:** the value reread/returned from authoritative persistence after a transition completes.
- **External-ingress restore:** activation/restore initiated by a normal inbound message for an existing channel binding, independent of the Settings browser sequence.
- **Outcome verification:** a network-fresh reread after a transport failure or physical-store indeterminate outcome; it is not revision conflict resolution.

## CR-F-003 Ownership Decision Matrix

| Authoritative Evidence At Studio Config Boundary | Classification | Read Result | Update Result | Normal Runtime Consequence |
| --- | --- | --- | --- | --- |
| Application startup recovery not complete | Pending, not released | Canonical read may complete, then await ownership readiness; on failure return standard load error and remain locked | No General update; `INTERNAL_ERROR` on failure | Recovery either rebuilds the lease or terminalizes/orphans the binding. |
| Exact lookup and/or canonical provenance + verified binding in `ATTACHED`, `TERMINATING`, or `FAILED` | `APPLICATION_OWNED` | Canonical history overlaid with `isActive=true`, editability `RUN_ACTIVE` | `RUN_ACTIVE`, canonical payload, zero write | Application `sendInput`/recovery/reentry remains solely under application-scoped services. |
| Exact lookup/provenance + verified binding in `TERMINATED` or `ORPHANED` | `RELEASED` | Delegate canonical lifecycle truth to General read/result | Delegate to General update | Application input rejects terminal binding; General manager/lane decides active/stopped. |
| No exact lookup and canonical history has no Application provenance after startup readiness | `RELEASED` | Use General canonical read | Delegate to General update | Application lifecycle has no ownership evidence for that ID; General manager/lane decides. |
| Lookup/provenance disagree, or referenced binding is missing/mismatched/unreadable | Indeterminate / fail closed | Standard load error; locked | `INTERNAL_ERROR`, zero write | Repair/recovery is required; never infer General ownership. |

The update path performs one read-only canonical read, then one owner decision, and relies on monotonic lifecycle facts for the exact ID: normal Application launch allocates a fresh ID and persists provenance before exposure; a terminalized binding cannot accept normal input; and Application terminal state is persisted before lookup release. During supported post-start reentry, canonical provenance continues to locate the nonterminal binding while the directory rebuilds. General activity can still begin after release, so the existing General lane performs the final active recheck. No cross-owner mutex or revision protocol is needed.

## Product-Reachability Decisions

The complete witnesses and evidence are in `investigation-notes.md` under **Material Premise Reachability**.

- MP-SR4-001 and MP-SR4-002 are Not Reachable and cannot justify revision, rebase, multi-client, or hand-speed race behavior.
- MP-SR4-003 is a Reachable General runtime-resolution trigger and justifies DS-006/DS-007 lifecycle ordering beyond the sequential browser journey.
- MP-SR4-004 remains Reachable, but CRR-006 reclassifies its consequence: Application input uses separate owners and is governed by DS-009 ownership eligibility, not the General lanes.
- MP-SR4-005 is Unclear as a Settings overlap and therefore drives no separate requirement, finding, or test. Its callers already converge on the same Team manager; no extra mechanism is introduced.
- MP-SR4-006 authorizes simple `RUN_ACTIVE` contract defense, not browser recovery machinery.
- MP-SR4-007 authorizes physical/network outcome verification, not optimistic writer reconciliation.
- MP-SR5-001 establishes normal terminal release before later General editing; MP-SR5-002 establishes startup-readiness/fail-closed behavior; MP-SR5-003 establishes provenance-backed safety through normal post-start reentry. None is a browser race.

## Design Reading Order

Read the approved behavior map and UI/UX supplement first, then the health, removal, and persisted-data decisions. The spine and ownership sections define lifecycle authority and serialization; interface and subsystem mappings then make those boundaries concrete. Finish with file placement, sequencing, risks, and implementation guidance. This ordering is especially important here because the visible form unlock depends on server-owned stopped-state and restore ordering rather than on frontend status alone.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Keep the SR-004 replacement of `RunEditableFieldFlags` with model-config-specific lifecycle editability; do not reintroduce both.
- Keep `activeContextStore.updateConfig` removed; launch drafts stay in dedicated stores.
- Keep the specialized existing-run Team form model that separates fixed selectors from model-config editability.
- Keep the completed `StandaloneAgentRunLifecycleService` rename with no forwarding wrapper.
- Keep SR-003 `configurationRevision` / `expectedConfigurationRevision`, `STALE_REVISION`, `run-model-config-revision.ts`, revision-aware branches, and concurrent-writer tests deleted. Do not restore compatibility fields.
- Keep Team archive/delete APIs at their restored baseline ownership; stopped Save alone uses General `AgentTeamRunManager.updateStoppedModelConfigs` and the General root lane.
- Keep the tightened Claude capability mapping; do not restore the combined-capability branch.
- No legacy API, dual mutation, client full-tree update, or provider hot-update fallback remains.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume:
  - Standalone: one `run_metadata.json` with fixed `runtimeKind`, `llmModelIdentifier`, `platformAgentRunId`, and `llmConfig: object | null`.
  - Team: one schema-v2 `team_run_execution_tree.json` with root/nested default and configured-agent `llmConfig`.
  - One selected package changes per operation; no bulk rewrite.
- Relevant change: No stored shape/version changes. Only existing `llmConfig` fields receive new values. No revision field or digest is stored or transported.
- Ownership change: `__autobyteus_application_run_lookup` and `__autobyteus_run_bindings` are existing current-schema tables and are read as-is; SR-005 adds no column, backfill, alternate lookup, or migration.
- Normal behavior: standalone restore builds config from metadata and metadata writes atomically; Team restore builds config from the tree and the tree writer reports committed, pre-rename failure, or post-rename finalization-indeterminate.
- Required invariants: fixed fields, IDs, bindings, history, tasks/messages, workspaces, topology, timestamps, and task nodes remain unchanged. Only addressed configured-scope `llmConfig` may differ.
- Constraints: history is user data and cannot be discarded/replaced; update must remain atomic at one-file scope.
- Decision: **Directly Usable — No Migration**.
- Rationale: current readers consume exactly these fields. Migration adds I/O and corruption risk without semantic benefit.
- Supported IDs: REQ-006–REQ-010, REQ-012–REQ-014; AC-001, AC-002, AC-005, AC-007, AC-009–AC-011, AC-014.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-004, BEH-006, BEH-007 | Open Settings for stopped standalone, then edit/Save | Owner-aware canonical metadata Save result while stopped | `StudioRunModelConfigService` -> General `StandaloneAgentRunLifecycleService` | Network-fresh, durable stopped-only Agent update after Application lease clearance. |
| DS-002 | Primary End-to-End | BEH-002–BEH-004 | Next message to stopped Agent | Same logical/provider run turns with revised config | `StandaloneAgentRunLifecycleService` | Proves automatic restore continuity. |
| DS-003 | Primary End-to-End | BEH-005–BEH-007 | Open Settings for stopped Team, then hierarchy edit/Save | Owner-aware canonical tree Save result while root stopped | `StudioRunModelConfigService` -> General `AgentTeamRunManager` | Network-fresh root-owned narrow Team update after Application lease clearance. |
| DS-004 | Primary End-to-End | BEH-002, BEH-003, BEH-005 | Next message to stopped Team | Same root/member/provider identities restored and message dispatched | `AgentTeamRunManager` | Team and mixed-runtime continuity. |
| DS-005 | Return-Event | BEH-004–BEH-007 | Settings query, mutation, lifecycle status, or outcome-verification reread | Form lock, draft, feedback, and canonical cache updated | `existingRunModelConfigStore` | Prevents local draft or uncertain response from becoming false truth. |
| DS-006 | Bounded Local | BEH-004, BEH-006, BEH-008 | General standalone stopped Save or General/external Agent resolution | Exactly one General lifecycle operation establishes state first | General `StandaloneAgentRunLifecycleService` | Orders verified General/external resolution with Save; no Application claim or writer revision. |
| DS-007 | Bounded Local | BEH-005, BEH-006, BEH-008 | General Team stopped Save or General/external Team resolution | Exactly one General root lifecycle operation establishes state first | General `AgentTeamRunManager` | Reuses the General root restore lane; Application and archive/delete are outside this spine. |
| DS-008 | Primary End-to-End | BEH-002, BEH-007 | Restored Claude `llmConfig` | Exact SDK query receives thinking/effort on same session | Claude adapter chain | Closes advertised-but-dropped gap. |
| DS-009 | Bounded Local / Ownership | BEH-003, BEH-006, BEH-008 | Studio canonical config read/update for an exact run/root ID plus persisted binding provenance | `APPLICATION_OWNED` lock/rejection, `RELEASED` General delegation, or fail-closed error | Application `ApplicationRunOwnershipService` + Studio `StudioRunModelConfigService` | Reconciles distinct owner families and reentry lookup rebuild without manager access, cross-owner lanes, or new UI policy. |

## Primary Execution Spine(s)

- **DS-001:** `RunConfigPanel -> existingRunModelConfigStore -> updateStoppedAgentRunModelConfig -> StudioRunModelConfigService -> read canonical metadata/provenance -> DS-009 lease check -> if released, General AgentRunService -> StandaloneAgentRunLifecycleService -> AgentRunHistoryCatalogService / AgentRunMetadataStore -> canonical result`
- **DS-002:** `Message composer -> agentRunStore / command transport -> AgentRunService.resolveCommandReadyAgentRun -> StandaloneAgentRunLifecycleService -> metadata -> backend bootstrapper -> existing provider binding -> turn`
- **DS-003:** `RunConfigPanel Team hierarchy -> existingRunModelConfigStore -> updateStoppedTeamRunModelConfigs -> StudioRunModelConfigService -> read canonical tree/provenance -> DS-009 lease check -> if released, General TeamRunService -> AgentTeamRunManager -> Team model-config mutator -> TeamRunExecutionTreeStore -> canonical result`
- **DS-004:** `Focused Team composer -> agentTeamRunStore -> restoreAgentTeamRun -> TeamRunService -> AgentTeamRunManager -> tree/config builder -> mixed backend restore -> message`
- **DS-006:** `General/browser or external ingress -> AgentRunCommandCoordinator -> General StandaloneAgentRunLifecycleService lane`; that lane is shared with eligible DS-001 Save.
- **DS-007:** `General/browser or external ingress -> ChannelBindingRunLauncher.restoreTeamRun -> General AgentTeamRunManager root lane`; that lane is shared with eligible DS-003 Save.
- **DS-008:** `ClaudeSessionBootstrapper -> Claude model-config adapter -> ClaudeSessionConfig -> ClaudeSession.executeTurn -> ClaudeSdkClient.buildQueryOptions -> SDK query`
- **DS-009:** `StudioRunModelConfigService canonical read -> extract optional applicationId/bindingId -> ApplicationRunOwnershipService.hasLiveRunOwnership(exact ID, provenance) -> lookup + referenced binding verification -> true / false / throw`; `true` returns canonical locked/`RUN_ACTIVE` without invoking a General mutation, while `false` delegates to DS-001/DS-003.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Settings entry performs a network-fresh owner-aware query. After DS-009 confirms no Application lease, a stopped General run supplies config/editability and browser edits an isolated draft. The General lifecycle owner rechecks state inside its lane, validates against the fixed runtime/model, and asks catalog persistence to replace only metadata `llmConfig`, reread, and classify the result. | Draft, ownership eligibility, lifecycle transition, metadata | Studio model-config service + General standalone lifecycle | Validation, GraphQL, feedback |
| DS-002 | A later browser message or verified non-Settings resolver enters the same lane. Restore reads metadata after any prior Save, preserves run/provider IDs, constructs the backend, and dispatches normally. | Persisted run, active run, provider session/thread | Standalone lifecycle service | Workspace and backend factory |
| DS-003 | Settings entry performs a network-fresh owner-aware query. After DS-009 confirms no Application lease, Team draft snapshots equality/direct edits and emits narrow patches without Reset. The General manager lane rejects a managed root, validates each fixed model, mutates configured launch configs only, writes the tree, and returns canonical state without revision semantics. | Team draft, ownership eligibility, root lifecycle, tree | Studio model-config service + General Team manager | Patch planner, validator, physical outcome verification |
| DS-004 | Team send restores unmanaged root through the same lane. Saved tree creates mixed backends with preserved root/member/provider identities, then sends to focus. | Root Team, configured executions, mixed backend | Team manager | Package loader, stream hydration |
| DS-005 | Settings queries, lifecycle status, and Save results update canonical history. Draft owner relocks on activation, replaces its baseline only from canonical success/fresh load, and performs outcome verification only after network/physical uncertainty. It does not compare revisions or rebase writer drafts. | Resume state, draft, form | Browser draft store | Catalog load and accessible feedback |
| DS-006 | Per General run ID, browser/external resolver-first publishes active then Save returns `RUN_ACTIVE`; Save-first commits then the General resolver reads new config. The same lane retains activation quarantine/cleanup. There is no Application or concurrent-save path in this lane. | General transition lane | General standalone lifecycle service | External resolution and activation cleanup |
| DS-007 | Per General root ID, the existing root lane gates browser/external restore and stopped Save. Resolver-first makes Save `RUN_ACTIVE`; Save-first commits before General restore reads. Application, archive, and delete retain separate ownership outside this spine. | General root lane | General Team manager | External resolution; normal history catalog behavior |
| DS-008 | Bootstrap translates only capability-valid saved keys into typed session settings; each query receives them while `resume` keeps session ID. | Session config, SDK options | Claude adapter chain | Capability catalog |
| DS-009 | The Studio service reads canonical metadata/tree, extracts optional Application provenance, then asks the Application-owned reader after startup recovery. Lookup and provenance are cross-checked against binding contents/status. A verified nonterminal binding is Application-owned; verified terminal or no lookup/no provenance is released; disagreement/missing evidence errors. Canonical provenance keeps reentry safe while lookup is cleared/rebuilt. Owned reads overlay locked editability and owned updates return `RUN_ACTIVE` without a write. | Application binding lease, canonical provenance, exact run/root identity | Application ownership service; Studio orchestration consumes the result | Startup gate, reentry, canonical history read, typed GraphQL mapping |

## Spine Actors / Main-Line Nodes

- `RunConfigPanel`: selected/new surface and contextual action host.
- `existingRunModelConfigStore`: selected existing-run draft, Save, and uncertain-outcome refresh owner.
- `AgentRunService` / `TeamRunService`: thin application-facing subject facades.
- `StudioRunModelConfigService`: host-composed owner-aware use-case boundary for the two resume reads and two stopped updates only.
- `ApplicationRunOwnershipService`: Application-encapsulated, startup-ready nonterminal binding lease reader; exposes no managers or write methods.
- `StandaloneAgentRunLifecycleService`: standalone activation/restore/stopped-update sequencer.
- `AgentTeamRunManager`: root Team lifecycle/transition sequencer.
- history catalogs/stores: durable package owners.
- Team model-config mutator: pure narrow transformation.
- runtime bootstrap/session/client: effective provider application.

## Ownership Map

| Node | Owns | Does Not Own |
| --- | --- | --- |
| `RunConfigPanel` | Launch vs existing mode; contextual Run/Save; draft event delegation | Lifecycle truth, tree algorithms, persistence |
| `existingRunModelConfigStore` | One selected draft; dirty/save/loading/outcome-verification state; request/result routing | Runtime activation, revision arbitration, or persisted truth |
| `StudioRunModelConfigService` | Exact-ID ownership guard; canonical locked result for live Application lease; delegation to General read/update services after release | Application manager access, config validation, persistence, Stop/message/archive routing |
| `ApplicationRunOwnershipService` | Startup-ready lookup + optional canonical-provenance binding verification and nonterminal/terminal ownership classification | General lifecycle, GraphQL DTOs, configuration mutation, manager exposure |
| `AgentRunService` | Public standalone use-case boundary/wiring | Transition internals/file I/O |
| `StandaloneAgentRunLifecycleService` | Per-run ordering, active recheck, update orchestration, activation quarantine | GraphQL/UI state |
| `AgentRunHistoryCatalogService` | Existing catalog queue, archived/missing checks, narrow metadata write/reread classification | Stopped policy/schema validation or writer revisions |
| `TeamRunService` | Public Team use-case boundary/wiring | Tree writes/root lane |
| `AgentTeamRunManager` | Managed-root truth, root lane, stopped update orchestration | UI inheritance/GraphQL DTOs |
| Team model-config mutator | Pure address/kind checked `llmConfig` replacement | I/O, lifecycle, task mutation |
| `ModelConfigValidationService` | Current catalog lookup/schema normalization/strict validation | Eligibility/persistence |
| Claude adapter | Capability schema and typed SDK translation | Generic stopped lifecycle |

General and Application services remain encapsulated. Resolvers must not call managers, lookup stores, binding stores, or history stores directly.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentRunResolver` non-config methods | `AgentRunService` -> standalone lifecycle | Existing GraphQL mapping | stopped-config checks, metadata I/O |
| `AgentRunService` | standalone lifecycle | Agent application API | second lock/transport codes |
| `AgentTeamRunResolver` non-config methods | `TeamRunService` -> Team manager | Existing GraphQL mapping | stopped-config checks, tree traversal/writes |
| `TeamRunService` | Team manager | Team application API | second root lane/patch algorithm |
| Agent/Team config resolvers | `StudioRunModelConfigService` -> Application ownership reader or General facade | Uniform owner-aware read/update mapping | direct Application lookup/manager access or duplicated guard policy |
| Application platform host-management contract | `ApplicationRunOwnershipService` | Expose one read-only ownership lease capability to Studio composition | General persistence or public Application SDK surface |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replacement | Scope | Notes |
| --- | --- | --- | --- | --- |
| GraphQL/frontend `RunEditableFieldFlags` | Advertises unrelated mutability and no Save authority | `RunModelConfigEditability` | Completed in SR-004 | Update generated client/tests. |
| `activeContextStore.updateConfig` | Unused outside store and not durable | existing-run draft store | Completed in SR-004 | Launch stores unchanged. |
| history editable getters/broad inactive flag mutation | Fixed fields never change; local inactive is not authority | explicit fixed UI + targeted refresh | Completed in SR-004 | Local status may relock, never unlock. |
| activation service name/file and activation-only attempt ownership | Save must share restore ordering | renamed lifecycle service/lane | Completed in SR-004 | Preserve quarantine/abort semantics. |
| `configurationRevision`, `expectedConfigurationRevision`, `STALE_REVISION`, digest helper | No current product path has concurrent config writers | Canonical query/result plus no-op equality | Completed in SR-004 | Remove server, GraphQL, generated, store, localization, and tests together. |
| revision-aware draft rebase/retained-baseline flags | Served imagined multi-window writer behavior | Simple local draft; fresh Settings load; uncertain-outcome refresh only | Completed in SR-004 | Remove `forceBaselineOnNextStoppedSync` and revision comparisons/rebase branches. |
| generalized `withUnmanagedRootPersistence` and archive lane changes | Archive/delete are not part of the supported Settings flow | Restore baseline `withUnmanagedHistoryDeletion` and archive behavior; Save calls explicit manager method | Completed in SR-004 | Keep the pre-existing delete lane independently. |
| stored Team unconditional read-only model/projection | Existing Team needs active-locked/stopped-editable | specialized existing-Team model | Completed in SR-004 | Launch model remains separate. |
| Claude combined capability predicate | Can advertise unsupported control | per-capability schema builder | Completed in SR-004 | Update tests. |
| notices saying a new run is required | No longer true after stopped Save | approved guidance/messages | Completed in SR-004 | English/Chinese. |

## Return Or Event Spine(s) (If Applicable)

**DS-005:** `network-fresh owner-aware Settings query / mutation result / lifecycle status / uncertain-outcome reread -> runHistoryStore resume payload -> existingRunModelConfigStore -> Agent/Team form -> lock/Save/feedback`.

- `UPDATED`/`UNCHANGED`: replace canonical config, clear dirty, stay stopped, and patch standalone context display.
- Team: replace `teamResumeConfigByTeamRunId.executionTree`; project the selected Team form from that canonical tree/draft, not a stale context configuration snapshot. Restore later rehydrates member contexts.
- `RUN_ACTIVE`: mark active and relock, whether the authoritative cause is General runtime activity or a nonterminal Application lease. Local values may remain visibly unsaved for explanation, but are never rebased or resubmitted automatically. A later owning Stop/terminal release and Settings reopen establishes a fresh baseline.
- Validation or definite persistence failure: keep the local draft and known canonical baseline. Transport failure or indeterminate physical write blocks Save until a network-fresh reread establishes the committed value.
- Local status can relock immediately; only Settings-owned targeted server refresh unlocks after Stop.

## Bounded Local / Internal Spines (If Applicable)

### DS-006 — General standalone lane

`normalize ID -> enter General per-run lane -> recheck active/quarantine/persisted state -> external/browser activation or validate/update -> commit/reread -> release`.

The General active check remains inside the same lane as General/external restore publication and Save. Application Agent resolution never enters this lane and is handled by DS-009. This lane does not serialize concurrent config writers through revisions.

### DS-007 — General Team root lane

`normalize root ID -> enter General rootTransitionLane -> recheck managed/package/archive state -> external/browser restore or validate/mutate/write -> canonical result -> release`.

Stopped model Save remains an explicit manager method, not a generic callback from GraphQL. Do not generalize the history gate: archive retains its baseline check/queue behavior and delete retains the pre-existing `withUnmanagedHistoryDeletion` lane.

### DS-009 — Application ownership lease

`read canonical Agent metadata/Team tree -> extract optional Application provenance -> await Application startup gate -> normalize exact ID -> global lookup + referenced binding read -> cross-check identity/status -> classify nonterminal owned or released -> return to Studio model-config service`.

- `ATTACHED`, `TERMINATING`, and `FAILED` remain `APPLICATION_OWNED` and therefore locked. The lease is conservative even if the application-scoped runtime is temporarily not materialized.
- `TERMINATED` and `ORPHANED` are released. The terminal transition writes that status before lookup removal, and normal Application input rejects either status.
- No lookup after startup readiness is `RELEASED` only when canonical history also has no Application provenance. If provenance exists, the reader loads that exact binding directly; a nonterminal binding remains owned even during `reloadAndReenter` lookup rebuild. Lookup/provenance disagreement or a missing, mismatched, or unreadable referenced binding throws and Studio fails closed.
- The Studio service reads shared canonical history before ownership classification so it can supply the immutable provenance and populate a locked response. It never calls an Application manager or asks the Application owner to persist model config. On release it delegates to the existing General update facade, whose lane still performs the final General active check.
- Application launch allocates a fresh run/root ID and persists canonical provenance/lookup before the binding is returned to normal callers; startup recovery completes behind the gate; post-start reentry retains canonical provenance while rebuilding lookup. The design therefore does not require a cross-owner lock for reacquisition of an already released exact ID.

## Off-Spine Concerns Around The Spine

| Concern | Spine(s) | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Schema validation | DS-001, DS-003 | lifecycle owners | Exact runtime/model lookup; normalize both schema forms; reject invalid keys/values | Server authority | duplicated provider checks |
| Agent draft compare | DS-001, DS-005 | draft store | Clone/dirty/no-op without sanitizing | Unsaved separation | local patch seen as durable |
| Team draft planner | DS-003, DS-005 | draft store | Draft-start equality links, direct-edit markers, bounded parent propagation, narrow patch generation; no Reset action | Approved Team semantics | panel blob/full-tree API |
| GraphQL mapping | DS-001, DS-003, DS-005 | facades | Typed inputs/results/errors | Explicit contract | resolver owns lifecycle |
| Application ownership resolution | DS-001, DS-003, DS-009 | Application ownership service + Studio service | Startup readiness, lookup/provenance/binding verification, reentry-safe live lease lock/rejection | Preserve separate owner families | General-only false inactive or GraphQL/store bypass |
| Catalog representability | DS-001, DS-003, DS-005 | forms/store | Fail closed and preserve residuals | Avoid destructive normalization | silent key loss |
| Claude adapter | DS-008 | Claude boundary | Map config to SDK options | Runtime effectiveness | provider rules in generic service |

## Ownership Boundaries

1. Canonical resume/status is server truth; browser draft never mutates history/context before canonical response.
2. The four Studio model-config read/update resolver methods call only `StudioRunModelConfigService`; all unrelated Agent/Team resolver methods keep their existing General facades.
3. `StudioRunModelConfigService` consults only the read-only Application ownership contract, never its managers/stores directly. `APPLICATION_OWNED` is a terminal lock/rejection result for this use case; `RELEASED` delegates to General services.
4. General standalone activation/restore/Save use the General lifecycle lane so external-channel restore cannot interleave. Catalog is internal persistence and keeps its existing queue/archived check; no writer revision is added.
5. General Team manager alone authorizes unmanaged-root mutation; tree store is not called from transport or Application callers.
6. Validator receives server-read fixed runtime/model and cannot default identity, omit invalid keys, or sanitize silently.
7. Generic lifecycle persists config; runtime adapters interpret provider keys at bootstrap/turn construction.

## Boundary Encapsulation Map

| Authoritative Boundary | Encapsulates | Required Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `AgentRunService` | General standalone lifecycle | Studio model-config service/General commands/other Agent resolvers | Resolver -> manager/store; Application manager access | retain subject methods |
| standalone lifecycle | lane, activation/quarantine, stopped-state validation/commit | Agent service | resolver -> metadata; old wrapper | retain current renamed owner, remove revision branches |
| catalog commit | catalog queue, archive check, metadata write/reread | lifecycle only | metadata write beside archive queue | add narrow commit |
| `TeamRunService` | General Team manager | Studio model-config service/General resolvers | resolver -> manager/store; Application manager access | retain Team method |
| Team manager | managed map, root lane, package gate, tree store | Team service/history gate | GraphQL -> tree store | strengthen explicit operations |
| validator | catalog/schema policy | lifecycle owners | frontend-only/provider switch in mutation | extend validator |
| `ApplicationRunOwnershipService` | startup-ready Application binding lease classification | Application platform host-management adapter; `StudioRunModelConfigService` | GraphQL -> lookup/binding stores; General -> Application manager | add exact-ID read method only |
| `StudioRunModelConfigService` | owner-aware config read/update orchestration | four Agent/Team config resolver methods | resolver-owned owner checks; fallback on ownership error; Application manager writes | keep narrow to config surfaces |

## Dependency Rules

- Components depend on the draft store/form models; no direct mutation calls or canonical object mutation.
- Draft store may depend on GraphQL/history/context stores and pure planners; planners import neither Pinia nor Apollo.
- Config resolvers depend on `StudioRunModelConfigService`; other resolvers retain their established service dependencies. No resolver imports Application lookup/binding stores.
- `StudioRunModelConfigService -> General canonical resume/read services -> ApplicationRunOwnershipReader + General AgentRunService/TeamRunService` is allowed. Canonical reads provide binding provenance; the ownership reader returns classification only and cannot persist config.
- `ApplicationRunOwnershipService -> startup gate + ApplicationRunLookupStore + ApplicationRunBindingStore` is allowed inside Application orchestration. It cannot depend on GraphQL or General services.
- `AgentRunService -> lifecycle -> validator + catalog/metadata reader` is allowed; resolver-to-store is forbidden.
- `TeamRunService -> manager -> validator + mutator + tree store` is allowed; service/resolver-to-tree store is forbidden.
- No layer exposes or computes a model-config revision token; canonical reads/results and the lifecycle lane serve the approved paths.
- Generic lifecycle never branches on Claude/Codex keys.
- UI owns the approved pre-edit equality snapshot and bounded parent-propagation plan; the server applies explicit validated patches and never infers propagation from the submitted final tree.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `getAgentRunResumeConfig(runId)` | standalone run | Owner-aware canonical metadata and active/editability | exact `runId` | Network-only Settings call -> Studio service -> DS-009 -> locked overlay or General read. |
| `getTeamRunResumeConfig(teamRunId)` | root Team | Owner-aware canonical tree and root editability | exact root ID | Network-only Settings call -> Studio service -> DS-009 -> locked overlay or General read. |
| `updateStoppedAgentRunModelConfig(input)` | standalone run | Reject live Application lease or validate/persist through General owner | `{agentRunId, llmConfig}` | `llmConfig` present, nullable; no fixed fields/revision. |
| `updateStoppedTeamRunModelConfigs(input)` | root Team | Reject live Application lease or persist configured-scope patches through General owner | `{teamRunId, patches[]}` | Patch has kind/address/present nullable config; reject duplicates; no revision. |
| `ApplicationRunOwnershipReader.hasLiveRunOwnership(input)` | exact persisted identity | Return `true` for verified nonterminal Application ownership or `false` for verified release after startup readiness | `{runId, applicationBinding?:{applicationId,bindingId}}` | Internal host-management contract; cross-check lookup/provenance; ambiguous evidence throws rather than returning false. |
| `StudioRunModelConfigService` four methods | config use cases | Classify owner, build canonical lock/rejection, or delegate to General services | exact Agent/root ID | No manager/store access and no new GraphQL shape. |
| `AgentRunService.updateStoppedModelConfig` | Agent use case | Thin delegation | standalone input | Public facade. |
| lifecycle `updateStoppedModelConfig` | Agent lifecycle | Serialize/recheck/validate/commit | exact run ID | Governing owner. |
| catalog `commitRunModelConfig` | Agent persistence | In existing queue reject missing/archived; no-op compare; write/reread/classify | ID + canonical config | Internal; no lifecycle/revision policy. |
| `TeamRunService.updateStoppedModelConfigs` | Team use case | Thin delegation | root + patches | Public facade. |
| manager `updateStoppedModelConfigs` | Team lifecycle | Serialize/validate targets/configs/persist | root + typed patches | Governing owner. |
| manager `withUnmanagedHistoryDeletion` | Team history | Preserve the baseline delete-only gate | root + internal delete operation | Unchanged; stopped Save does not call it. |
| validator `validate` | fixed model config | Canonical config or errors | runtime + model + config | No defaults/deletions. |

### Transport outcome shape

Both mutations use:

`UPDATED | UNCHANGED | RUN_ACTIVE | RUN_ARCHIVED | NOT_FOUND | MODEL_UNAVAILABLE | SCHEMA_UNAVAILABLE | VALIDATION_FAILED | PERSISTENCE_FAILED | PERSISTENCE_INDETERMINATE | INTERNAL_ERROR`.

Expected rejections are typed, not message-parsed. Results include `success`, `outcome`, `message`, `isActive`, editability, and field errors. Agent returns canonical `llmConfig`; Team returns canonical projected tree. A verified live Application lease maps to existing `RUN_ACTIVE`, `isActive=true`, and locked editability. Ownership resolution failure maps to the existing query error / mutation `INTERNAL_ERROR` fail-closed path with no General write. Only `UPDATED`/`UNCHANGED` have `success=true`. There is no stale-writer or ownership-transfer outcome.

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguous Risk | Action |
| --- | --- | --- | --- | --- |
| Agent resume/update | Yes | Yes | Low | Keep separate from Team. |
| Team resume/update | Yes | Yes | Low | Root ID + kind/address patches. |
| Team scope patch | Yes | Yes | Low | Verify root `/`, kind/address, and configured target. |
| Shared validation | Yes | Yes | Low | Fixed identity is server-read. |
| Application ownership reader | Yes | Yes | Low | Exact ID + optional immutable provenance -> verified live binding or released; no manager/reference leakage. |

## Main Domain Subject Naming Check

| Node | Name | Self-Descriptive? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Standalone transition owner | `StandaloneAgentRunLifecycleService` | Yes | Low | Rename. |
| Team transition owner | `AgentTeamRunManager` | Yes | Low | Extend existing responsibility. |
| Browser draft owner | `existingRunModelConfigStore` | Yes | Low | Keep launch drafts separate. |
| Team transformation | `team-run-model-config-mutator.ts` | Yes | Low | No I/O/lifecycle. |
| Schema authority | `ModelConfigValidationService` | Yes | Low | Avoid helper/common. |
| Cross-owner config orchestrator | `StudioRunModelConfigService` | Yes | Low | Keep separate from General/App runtime facades. |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Capability | Decision | Why | If New |
| --- | --- | --- | --- | --- |
| Model/schema lookup | `ModelCatalogService` | Extend | Exact runtime catalogs already owned | N/A |
| Agent restore ordering | activation service | Extend + Rename | Already owns activation/restore/quarantine | N/A |
| Team ordering | manager root lanes | Extend | Owns create/restore/managed truth | N/A |
| Application ownership | canonical binding provenance + global run lookup + binding lifecycle + startup gate | Extend behind service | Already owns durable live binding eligibility, startup recovery, and post-start reentry facts | `ApplicationRunOwnershipService` read-only adapter |
| Studio cross-owner model-config use case | configured Studio API service composition | Create focused service | Four config methods need one policy without changing all run operations | `StudioRunModelConfigService` |
| Agent persistence | history catalog/metadata store | Extend | Queue and atomic file already owned | N/A |
| Team persistence | tree store/writer | Reuse | Schema validation/outcomes correct | N/A |
| Existing-run drafts | launch/history stores | Create focused store | Launch allows different fields; history cannot hold unsaved data | Dedicated owner avoids mixing. |
| Claude translation | Claude adapter chain | Extend | Provider boundary is correct | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem | Concerns | Spine(s) | Owner | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| web existing-run config | Fresh load, drafts, form state, Save/outcome verification | DS-001, DS-003, DS-005 | draft store | Simplify current implementation | Launch unchanged. |
| agent execution | Agent lane/update/restore | DS-001, DS-002, DS-006 | lifecycle | Extend/Rename | Active admission unchanged. |
| Team execution | Root lane/mutator/restore | DS-003, DS-004, DS-007 | manager | Extend | No task patches. |
| run history | Canonical reads/persistence | DS-001, DS-003, DS-005 | lifecycle/read services | Simplify current implementation | No migration or revision. |
| LLM management | Schema lookup/validation | DS-001, DS-003 | validator | Extend | Shared policy. |
| Claude runtime | Capability/query application | DS-008 | adapter chain | Extend | Exact pinned SDK. |
| GraphQL | Subject APIs/mapping | DS-001, DS-003, DS-005 | facades | Extend | Thin. |
| Application orchestration | Nonterminal exact-ID ownership/readiness | DS-009 | ownership service | Extend | No General manager or config write. |
| Studio composition | Owner-aware config routing | DS-001, DS-003, DS-009 | Studio model-config service | Create | Only four read/update operations. |

## Draft File Responsibility Mapping

| Candidate File | Subsystem | Owner | Concern | Why One File | Shared? |
| --- | --- | --- | --- | --- | --- |
| `stores/existingRunModelConfigStore.ts` | web | draft owner | Specialized drafts, Save, and uncertain-outcome refresh | One selected operation state | draft types/planners |
| `services/runConfigEditing/existingTeamModelConfigDraft.ts` | web | pure planner | Draft-start links, direct-edit markers, bounded parent propagation, patch planning | Cohesive algorithm | config equality |
| `standalone-agent-run-lifecycle-service.ts` | Agent | lifecycle | Activation/restore/update lane for external ingress safety | Same lifecycle subject | validator/catalog |
| `model-config-validation-service.ts` | LLM | validation | Catalog/schema/strict validation | Provider-neutral policy | normalized schema |
| `team-run-model-config-mutator.ts` | Team | pure transform | Configured-scope patch only | Avoid mixed current mutator | patch target |

## Reusable Owned Structures Check

| Repeated Logic | Shared File | Owner | Why | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| editability | tight run-history domain type | history | Same meaning in queries/results | Yes | Yes | field-flag bag or revision carrier |
| normalized schema | validator internal/domain file if needed | LLM | Both update paths | Yes | Yes | full generic JSON Schema engine |
| transport outcomes/errors | `api/graphql/types/run-model-config.ts` | API | Shared vocabulary | Yes | Yes | generic mutation/domain owner |

## Shared Structure / Data Model Tightness Check

| Structure | Clear Fields? | Redundant Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `RunModelConfigEditability` | Yes | Yes | Low | Only `editable` and `reason`. |
| mutation result core | Yes | Yes | Low | Shared outcomes; specialized canonical payloads. |
| Team patch | Yes | Yes | Low | Only kind/address/config. |
| frontend draft union | Yes | Yes | Low | Agent/Team discriminated variants. |

## Final File Responsibility Mapping

| File | Subsystem | Owner | Concrete Concern | Why One File | Shared? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/existingRunModelConfigStore.ts` | web | draft owner | Fresh load, submit, result handling, uncertain-outcome refresh | One operation owner | specialized union |
| `types/agent/ExistingRunModelConfigDraft.ts` | web | contract | Tight Agent/Team variants/errors without revision | Explicit store/component contract | outcomes |
| `types/agent/ExistingTeamRunFormModel.ts` | web | form contract | Fixed facts + model edit/catalog state | Separate from launch model | draft scopes |
| `services/runConfigEditing/existingAgentModelConfigDraft.ts` | web | pure planner | Clone/equality/patch | Testable | equality |
| `services/runConfigEditing/existingTeamModelConfigDraft.ts` | web | pure planner | Tree semantics/patches | Testable | patch type |
| `standalone-agent-run-lifecycle-service.ts` | server Agent | lifecycle | Existing activation + lane/update | One lifecycle owner | validator/catalog |
| `model-config-validation-service.ts` | server LLM | validation | Current strict validation | One policy | catalog |
| `team-run-model-config-mutator.ts` | server Team | transform | Configured patch only | Narrow | tree validation |
| `api/graphql/types/run-model-config.ts` | server API | transport | Shared GraphQL vocabulary | Transport-only | domain results |
| `application-orchestration/services/application-run-ownership-service.ts` | server Application | ownership | Startup-ready exact-ID lookup/provenance/binding classification | One Application-encapsulated policy | managers/config mutation |
| `run-history/services/studio-run-model-config-service.ts` | server Studio | use-case orchestration | Owner-aware canonical reads and stopped-update delegation | One cross-owner config boundary | provider keys/managers/stores |

## Applied Patterns (If Any)

- Serialized per-identity transition lane inside lifecycle owners.
- Durable Application binding lease plus owner-aware Studio guard; no cross-owner mutex.
- Existing repository/atomic store serving lifecycle owners.
- Claude provider adapter for capability/query translation.
- Discriminated Agent/Team frontend draft variants.
- Network-fresh Settings entry and canonical success/outcome-verification reads.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/services/standalone-agent-run-lifecycle-service.ts` | Retain integrated file | Agent lifecycle | Keep activation/restore/Save lane and revision-free update | Current General owner | Application branch, GraphQL, provider keys |
| `.../agent-execution/services/agent-run-service.ts` | Retain integrated file | Agent facade | Keep General update facade | Existing boundary | direct file writes or Application ownership policy |
| `.../run-history/services/agent-run-history-catalog-service.ts` | Retain integrated file | Agent persistence | Keep queued archived/missing/no-op check plus commit/reread | Existing queue | active/schema/revision policy |
| `.../run-history/services/agent-run-model-config-commit.ts` | Retain integrated file | Agent persistence helper | Keep exact no-op/write/reread/failure classification without digest | Cohesive physical commit semantics | lifecycle/revision policy |
| `.../run-history/services/agent-run-resume-config-service.ts` | Retain integrated file | Agent read | Supply canonical metadata, including Application provenance, to the Studio service | Existing query source | ownership stores or mutation |
| `.../run-history/services/team-run-history-service.ts` | Retain integrated file | Team read | Supply canonical tree, including Application provenance, to the Studio service | Existing query source | ownership stores or mutation |
| `.../run-history/domain/run-model-config-revision.ts` | Already deleted in SR-004 | Removed SR-003 policy | Keep absent | N/A | No replacement. |
| `.../llm-management/services/model-config-validation-service.ts` | Retain current file | Validator | Exact model/schema validation | Catalog subsystem | lifecycle/I/O |
| `.../agent-team-execution/services/agent-team-run-manager.ts` | Retain integrated file | Team lifecycle | Keep stopped update in the General root restore lane | Root-lane owner | Application branch or UI/GraphQL/archive policy |
| `.../agent-team-execution/services/team-run-service.ts` | Retain integrated file | Team facade | Keep General stopped-update facade | Existing boundary | tree I/O or Application ownership policy |
| `.../agent-team-execution/services/team-run-model-config-mutator.ts` | Retain current file | Team transform | Address/kind patch | Cohesive concern | tasks/I/O |
| `.../run-history/services/team-run-history-catalog-service.ts` | Retain integrated file | Team history | Keep baseline archive and delete-only gate ownership | No supported Settings/archive concurrency path | restore/update logic |
| `.../api/graphql/types/run-model-config.ts` | Retain integrated file | API | Keep revision-free outcomes/editability/errors | Shared transport | business policy |
| `.../run-history/domain/run-model-config.ts`; GraphQL input/result types; generated frontend types | Retain integrated files | Shared contracts | Keep tight revision-free editability/outcome vocabulary | Existing approved API | concurrency policy or ownership-specific fields |
| `.../api/graphql/types/agent-run.ts`, `agent-team-run.ts` | Modify | API mutation entry | Resolve `StudioRunModelConfigService` and route only the two narrow mutations through it | Subject resolvers stay transport-only | manager/store access or duplicated ownership checks |
| `.../api/graphql/types/run-history.ts`, `team-run-history.ts` | Modify | API read entry | Resolve `StudioRunModelConfigService` and route only the two resume-config queries through it | Existing queries keep GraphQL mapping | ownership stores or local active inference |
| `.../application-orchestration/services/application-run-ownership-service.ts` | Add | Application orchestration | Await startup; cross-check lookup + canonical provenance + binding; classify nonterminal exact-ID ownership | Preserves Application encapsulation and reentry safety | General service calls, config writes, manager exposure |
| `.../application-platform/runtime/application-platform-runtime-contracts.ts`, `application-platform-runtime.ts`, `build-application-platform-runtime.ts` | Modify | Application host contract/composition | Expose the ownership reader only to host management, not REST/SDK | Existing host boundary | application manager instances or mutations |
| `.../application-platform/runtime/create-application-orchestration-services.ts` | Modify | Application composition | Construct/wire ownership service from existing startup gate, lookup store, binding store | Owns dependencies | General routing policy |
| `.../run-history/services/studio-run-model-config-service.ts` | Add | Studio application service | Owner-aware Agent/Team resume reads and stopped updates; locked canonical results; General delegation | Focused four-operation use case | direct lookup/manager/store access |
| `.../api/graphql/studio-application-api-services.ts`, `.../compositions/build-studio-server.ts` | Modify | Studio composition | Build/inject Studio config service with Application ownership contract and General services | Existing explicit service binding | service locator fallback or mutable late injection |
| Integrated Claude catalog/session/bootstrap/client files | Retain integrated files | Claude runtime | Keep independently advertised and typed thinking/effort mapping | Provider parity is already implemented | new SR-005 ownership branches |
| Integrated web GraphQL, draft, planner, form, localization, and generated-type files | Retain integrated files | web | Keep the sequential network-fresh, revision-free stopped editor and existing locked/error presentation | SR-005 has no visible UI or transport-shape change | ownership-specific fields, revisions, or new workflow |
| relevant server/web tests | Modify/Add/Remove | coverage | Sequential journey, General external-ingress ordering, Application live-lease rejection/release/startup readiness, validation/persistence/UI/runtime; no concurrent-writer/revision tests | Existing test structure | imagined browser paths or cross-owner manager mocks |

## Folder Boundary Check

| Folder | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `agent-execution/services` | Main-Line Control | Yes | Low | Standalone lifecycle beside manager/service. |
| `agent-team-execution/services` | Main-Line Control + owned transform | Yes | Low | Manager governs; mutator internal. |
| `application-orchestration/services` | Main-Line Application ownership | Yes | Low | Binding lifecycle and lookup already live here. |
| `llm-management/services` | Off-Spine | Yes | Low | Catalog validation shared. |
| `run-history/services` | Studio config orchestration + history | Yes | Medium | Name the Studio-specific service explicitly; keep Application storage behind its port. |
| `run-history/domain/services/store` | Mixed justified | Yes | Low | Tight editability/outcome domain, service, and physical store stay distinct; revision helper is removed. |
| `web/services/runConfigEditing` | Off-Spine | Yes | Low | Pure algorithms separate. |
| `web/components/workspace/config` | Presentation | Yes | Medium | Keep only rendering/events. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided | Why |
| --- | --- | --- | --- |
| Settings entry | `mount editor -> clear/lock draft -> network-only resume query for selected identity -> ignore superseded response -> create canonical draft -> load schema -> unlock if stopped` | unlock from cached Stop state or refresh config inside the Stop action | Matches the real sequential screen journey and prevents a stale enable flash. |
| Agent input | `{agentRunId, llmConfig:{reasoning_effort:'high'}}` | full runtime/model/workspace config or writer revision | Fixed fields cannot change; no concurrent writer contract. |
| Team patch | `{scopeKind:'CONFIGURED_AGENT', scopeAddress:'/code_reviewer', llmConfig:{...}}` | client replacement tree | Explicit identity; task nodes unreachable. |
| Real independent activation | External-channel Save lane first -> commit -> ingress restore reads new; ingress restore first -> active -> Save `RUN_ACTIVE` | justify with two browser tabs or omit the lane despite channel ingress | Protects BEH-008 without inventing writer policy. |
| Application live ownership | Normal Application launch returns binding -> Studio canonical read provides provenance -> owner read verifies nonterminal binding -> locked/direct Save `RUN_ACTIVE`/no write; terminal transition completes -> later Studio read may delegate to General | call the General manager and infer stopped, merge managers, or run cross-owner Save/restore timing tests | Protects active immutability through the real ownership lifecycle. |
| Startup recovery | Settings owner check awaits Application startup gate; recovered live binding stays locked; failed/inconsistent evidence errors closed | treat missing lookup during recovery as released | Prevents a normal startup gap from bypassing the lease. |
| Post-start reentry | Canonical provenance references the nonterminal binding even while `reloadAndReenter` clears/rebuilds global lookup | treat ready-gate + missing lookup as release | Covers a supported operational lifecycle without a timing protocol. |
| Parent propagation | Parent changes only draft-start matching, not-directly-edited descendants; a direct edit before/after propagation wins and becomes a boundary | server guesses from the submitted final tree or overwrites a direct edit | UI snapshots and applies the approved deterministic boundary. |
| Fixed-identity divergence | A child with different fixed runtime/model remains `Customized`, receives no ancestor change, has no Reset action, and edits against its own schema | copy parent `llmConfig` or change child identity | Resolves F-001 without broadening mutable fields. |
| Claude | absent -> omit; true -> adaptive; false -> disabled; effort -> SDK effort | persist but never query-map | Avoid false success. |
| Schema gap | show residual, disable Save, Retry | mount-time sanitization | Prevent data loss. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Clean Replacement |
| --- | --- | --- | --- |
| Keep broad flags beside new contract | Less frontend churn | Rejected | Replace query/types/stores/tests. |
| Activation wrapper around lifecycle | Fewer imports | Rejected | Rename/update directly. |
| Generic Agent/Team full-config mutation | One API | Rejected | Two narrow subject APIs. |
| Full Team tree replacement | Client has tree | Rejected | Narrow patches/server canonical tree. |
| Hot update or auto-stop Save | Immediate apply | Rejected | Manual Stop -> Save -> restore. |
| Reuse pre-launch Reset in stopped-run editing | Familiar hierarchy action | Rejected | No stopped-run Reset; direct scope edits plus bounded parent propagation. Existing pre-launch Reset is unchanged. |
| Claude deprecated `maxThinkingTokens` fallback | Older examples | Rejected | Exact pinned `thinking`/`effort`. |
| Parallel stored/stopped Team modes | Easier transition | Rejected | One existing-run model contract. |
| Optimistic revision/draft rebase | Mechanically possible concurrent browser writers | Rejected | Sequential browser flow, canonical fresh load/result, and no-op equality. |
| Generalize Team archive/delete lane for Settings Save | One lock for all persistence operations | Rejected | Save uses explicit manager lifecycle method; baseline archive/delete ownership remains. |
| Merge General and Application managers/lanes | One apparent active map | Rejected | Preserve advanced-base scopes; use durable Application lease before General delegation. |
| GraphQL reads Application lookup/binding stores | Minimal code | Rejected | Application ownership service + Studio model-config service. |
| Route stopped config writes into application-scoped services | Keep historical owner forever | Rejected for this ticket | A nonterminal binding is not editable; after terminal release normal Application input is unavailable and eligible config writes remain General. No Application resume/config API is invented. |

## Derived Layering (If Useful)

`Vue presentation -> existing-run draft state -> GraphQL config boundary -> StudioRunModelConfigService -> Application ownership lease or General lifecycle owner -> validation/persistence -> runtime adapter/provider`.

This is explanatory; boundary/no-bypass rules remain authoritative.

## Change / Refactor Sequence

1. Preserve the integrated SR-004 feature baseline and advanced Application scoping; do not reset or flatten either owner family.
2. Add `ApplicationRunOwnershipService` inside Application orchestration. Await startup readiness; accept exact ID plus optional canonical binding provenance; cross-check lookup, referenced binding, contained root/member IDs, and status; return `true` only for verified nonterminal ownership and `false` only for verified release; throw on disagreement/unavailable evidence. Expose only `hasLiveRunOwnership` through `ApplicationPlatformRuntime.hostManagement`.
3. Add `StudioRunModelConfigService` with the Application ownership reader plus General Agent/Team canonical read and update facades. Route only `getAgentRunResumeConfig`, `getTeamRunResumeConfig`, `updateStoppedAgentRunModelConfig`, and `updateStoppedTeamRunModelConfigs` through it. Read canonical metadata/tree first to obtain immutable binding provenance.
4. For a live lease, overlay the already-read canonical result with `isActive=true`/`RUN_ACTIVE` editability and return `RUN_ACTIVE` on update without invoking the General mutation. For released IDs, use the canonical read result for display and delegate updates unchanged to General services. Ownership errors fail closed/no write.
5. Keep General `StandaloneAgentRunLifecycleService` and `AgentTeamRunManager` lanes unchanged for browser/external-channel ordering. Do not add Application branches inside those owners.
6. Keep Settings-entry network freshness, revision-free browser drafts, fixed-versus-model UI, Team planner/direct edits/no Reset, contextual Save, residual safety, and accessible feedback unchanged except for owner-aware locked results.
7. Retain and verify Claude capability/session/query mapping and AutoByteus/Codex restoration.
8. Add focused composition coverage for normal Application Agent and Team launch -> locked read/direct active rejection/no write -> terminal release -> later General eligibility, plus startup recovery/failure and post-start reentry with a temporarily absent lookup but intact canonical provenance. Re-run existing General lane, GraphQL, browser, and runtime coverage.
9. After renewed source review, `api_e2e_engineer` must replace stale Application same-lane assertions with the SR-005 owner-lease scenarios. No multi-tab, same-browser timing, or cross-owner simultaneous-call test is authorized.

Throughout the sequence, no UI unlock may rely on cached Stop state and no revision compatibility seam may be reintroduced.

## Key Tradeoffs

- Manual Stop adds one step but avoids active admission, interruption, recycling, and partial-Team semantics.
- Narrow patches require planners but enforce fixed-field preservation and exclude transient tasks.
- A live-binding lease can conservatively keep a temporarily unmaterialized Application run locked; this is preferable to a false stopped state and matches the owning Application's ability to restore it.
- Owner-aware orchestration adds one host-composed service but avoids much larger manager unification, cross-owner locks, or leakage of Application internals.
- Omitting optimistic revision keeps the API proportional to the sequential single-writer product path; canonical reads/results and no-op detection remain sufficient.
- Client-owned bounded Team propagation preserves the approved deterministic value-matching behavior; the server still validates and persists explicit final patches.
- Omitting Reset from stopped-run editing avoids pretending a narrow `llmConfig` update can clear fixed launch identity; the existing pre-launch authoring action remains available only in its current flow.
- Failing closed on schema drift can temporarily block editing but prevents stored-value loss.
- The Claude path was the medium-complexity runtime portion and is already integrated; SR-005 must preserve it rather than mix ownership policy into provider code.

## Risks

1. Dynamic model/schema disappears between render and Save: resolve again in transition and reject without write.
2. Historical residuals: display and disable Save; never sanitize historical mode.
3. Missing Team override provenance: use the approved draft-start immediate-parent value comparison plus current-draft direct-edit markers only to bound parent propagation; do not claim recovered intent or offer stopped-run Reset.
4. Team post-rename indeterminate: return explicit outcome, reread, network-refresh, block repeat Save until reconciled.
5. External-channel ingress can activate a General-owned stopped run independently: retain the General per-run/root lane and direct `RUN_ACTIVE` result described by BEH-008.
6. Application owner misclassification could allow writes under a live application-scoped runtime: require startup-ready lookup/provenance/binding verification, nonterminal lease rejection, terminal-before-release ordering, provenance-backed post-start reentry safety, and fail-closed inconsistency handling.
7. Claude SDK evolution: isolate mapping against pinned `0.3.231`; no deprecated fallback.
8. Browser multi-tab/multi-user/concurrent submission behavior is intentionally unspecified. Do not add revision or rebase machinery; if product requirements later authorize such a workflow, investigate it as a separate change.

## Guidance For Implementation

- Local lifecycle is only a presentation hint. Stop completes first; Settings entry then fetches a network-fresh owner-aware resume payload before unlock. First reject any live Application lease; then recheck General state inside its lane because BEH-008 external ingress can independently activate the same General-owned run.
- Do not import `ApplicationRunLookupStore`, `ApplicationRunBindingStore`, or application-scoped managers in GraphQL, General lifecycle, or history-read services. `ApplicationRunOwnershipService` owns those details; `StudioRunModelConfigService` consumes its read-only port.
- Read canonical metadata/tree before owner classification and pass its persisted Application reference into the ownership reader. Await startup recovery. Treat lookup absence as release only when provenance is absent or its verified binding is terminal. Lookup/provenance disagreement, unreadable state, or readiness failure is an error; never fall through to General mutation.
- Preserve terminal ordering: binding terminal state is durable before lookup release. Keep normal Application `sendInput` rejecting terminal/orphaned bindings. These two facts replace the false cross-owner lane assumption.
- Do not compute, transport, persist, or compare model-config revisions. No compatibility field or ignored input remains.
- Validator accepts only null/plain JSON object, rejects unknown keys, and enforces required/type/integer/enum/min/max/pattern from both schema encodings. Never add defaults/delete keys. Unsupported shapes fail closed.
- Validate all Team patches before any write. Require nonempty patches, reject duplicates/kind mismatches/transient targets, and return `UNCHANGED` without write for no-op.
- Preserve stored objects by replacing only containing launch `llmConfig`; never rebuild metadata/tree from client input. Reread and verify after write.
- Preserve the integrated Claude mapping: absent `thinking_enabled` omits option; true -> adaptive; false -> disabled; valid effort -> `effort`. Preserve session binding. Emit each catalog field only for its independent capability.
- Preserve `AgentRunConfig.isLocked` semantics and the already-separated selector/model-config editable props.
- Team planner/UI tests: matching descendant chains propagate; a draft-start divergent child and its branch stay unchanged; direct-edit-before-parent and direct-edit-after-propagation both win and bound later propagation; direct edits use the target's fixed schema; no stopped-run Reset is rendered; equal-to-parent edits, sibling isolation, fixed runtime/model differences, minimal patches, and transient exclusion remain covered. Existing pre-launch Reset regression coverage remains unchanged.
- Server coverage: General direct active rejection; sequential stopped Save; no-op; fixed-field preservation; validation; definite/indeterminate persistence; both Save/General-external-restore orders; normal Application Agent/Team live-lease locked read and direct `RUN_ACTIVE`/no-write; terminal release then later General eligibility; startup recovery; post-start reentry with lookup rebuild and canonical provenance; fail-closed disagreement/missing-binding errors. Do not add generic concurrent-writer, cross-owner simultaneous-call, stale-revision, multi-tab, or archive/delete-vs-Save tests. Team coverage additionally proves each submitted scope validates against its own fixed runtime/model, a divergent child is not implicitly copied from its parent, and no mutation input can change fixed identity.
- Runtime coverage: AutoByteus rebuilt config, Codex same-thread effort/tier, Claude same-session thinking/effort.
- Frontend coverage: active/idle lock; Stop completes before separate Settings entry; Settings-owned network load and no stale unlock; stopped focusability; Run/Save; dirty/saving/no-op; draft discard; validation and uncertain-outcome refresh; external-activation relock; residual safety; accessible announcements. Remove revision/rebase/multi-client cases.
- API/E2E coverage should prove: (1) sequential stopped standalone Save through GraphQL/storage/restart and later same-ID General restore; (2) the equivalent root Team hierarchy path with fixed-field preservation and no Reset; (3) direct General active rejection; (4) exact General Agent and Team external-resolver ordering; (5) normal Application Agent and Team binding ownership makes Studio reads locked and direct updates `RUN_ACTIVE`/no-write until terminal release, including reentry lookup rebuild resolved by canonical provenance; and (6) browser Stop completion -> Settings loading -> edit -> Save -> later message. Existing pre-SR-005 Application same-owner coverage is stale and must be revised by its owner after renewed code review.
