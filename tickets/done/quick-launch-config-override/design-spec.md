# Quick-Launch Configuration Override Design Spec

## Current-State Read

The supported team quick-launch path begins at the event-monitor header `+` action and seeds an immutable launch draft from `TeamExecutionViewState.getConfigurationView()`. `createTeamConfigurationView` derives the visible global fields from the configured coordinator, but it also materializes every configured agent's effective runtime, model, model configuration, and auto-approval values as an explicit `memberOverrides` entry. The draft store and `buildTeamRunMemberConfigRecords` then correctly apply their contract—explicit member fields win over globals—so an edited global field is visually updated but remains shadowed by the old per-member copies.

The ownership boundaries after that projection are healthy: `teamRunConfigStore` owns immutable draft edits and exact in-flight admission, `agentTeamRunStore.launchDraft` owns launch orchestration, the member-config builder owns full API materialization, and the server persists and runs the supplied member records. Submission-time or server-side repair would bypass the malformed representation's authoritative projection boundary.

Architecture-level inspection also found two adjacent representation issues relevant to making the fix complete:

1. `MemberConfigOverride.agentDefinitionId` is redundant. Overrides are keyed by canonical member address, no production consumer reads the stored ID, and payload identity comes from the current flattened leaf definition.
2. `teamRunConfigUtils` has a private model-config normalizer that sorts only top-level keys even though the existing canonical launch-config normalizer recursively canonicalizes nested JSON objects. Delta detection should use the canonical normalizer so semantically equal model configs cannot create a false explicit override.

The standalone-agent path is structurally separate and behaves correctly: the selected run is cloned into an editable single config, `createRunFromTemplate` copies the edits into a temporary context, and the first message passes that context's current values to `PrepareAgentRun`. It is a preserved regression boundary, not a target production-code change.

## Intended Change

Refactor the existing execution-tree-to-`TeamRunConfig` projection into a canonical coordinator-baseline-plus-material-deltas transformation:

- derive the global team runtime, model identifier, model config, auto-approval, skill access, and workspace from the coordinator as today;
- for each configured member, emit only supported override fields whose effective values differ from the corresponding global field;
- compare model configs through the canonical recursive normalizer/equality rule;
- omit a member entirely when no material launch-setting delta remains;
- remove the redundant `agentDefinitionId` field and its UI cloning/plumbing from `MemberConfigOverride`;
- preserve the existing draft store, payload materializer, GraphQL/server behavior, execution-tree schema, and standalone-agent runtime path.

This is a clean-cut replacement of the faulty all-member override projection. There is no legacy projection mode, payload fallback, server special case, or history rewrite.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-002, REQ-003, REQ-005; AC-001, AC-002, AC-005, AC-007, AC-009 | Select an existing team in the event monitor, click `+`, edit global launch fields, then `Run Team`. | Investigation `Relevant Existing Behavior And Production Paths` BEH-001 and the deterministic projection/edit/materialization probe. | The editable view remains a separate draft, but equal member values inherit edited globals and the exact admitted snapshot reaches the new execution. | Event-monitor team quick launch and returned hydration: DS-001, DS-004, DS-005. |
| BEH-002 | User | REQ-001, REQ-006; AC-005, AC-006 | Select an existing standalone agent, click `+`, edit, `Run Agent`, then send the first message. | Investigation BEH-002, `AgentWorkspaceView`, `agentContextsStore`, `agentRunStore`, and focused passing tests. | Preserve the current two-stage copy/preparation path and strengthen regression assertions; no production behavior change. | Standalone quick launch: DS-003. |
| BEH-003 | Contract | REQ-002, REQ-003, REQ-004; AC-002, AC-003, AC-004 | A `TeamRunConfig` global field applies unless the address-keyed member delta explicitly supplies that field. | Investigation BEH-003 and the store/config utility/member builder trace. | Tighten `memberOverrides` to launch-setting deltas only; genuine field differences still win and absent fields inherit. | Projection, draft lifecycle, and materialization: DS-001, DS-002, DS-005. |
| BEH-004 | System | REQ-002, REQ-007; AC-002, AC-004, AC-008 | Hydrate a live or historical schema-v1 team execution tree. | Investigation BEH-004, representative stored trees, and the hydration trace. | Read current stored effective member settings directly and derive the canonical in-memory view without modifying history. | Historical/live hydration: DS-002; launch-result hydration: DS-004. |

## Relevant Supplemental Task Artifacts

None. The screenshots and disposable probe result are evidence recorded in `investigation-notes.md`, not separate authoritative supplements.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Bug Fix`
- Current design issue found (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Shared Structure Looseness`
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): `Yes`
- Evidence: The execution projector places the same effective member values in both the global baseline and every explicit override, so `memberOverrides` no longer means “differences from global.” Its required `agentDefinitionId` duplicates address/definition identity and is unused. Model-config equality also duplicates a shallower normalization policy than the existing canonical normalizer.
- Design response: Make the execution projection canonical at its existing owner, contract `MemberConfigOverride` to launch-setting deltas, remove redundant identity plumbing, and consolidate model-config comparison on the existing recursive normalizer. Keep later owners unchanged and regression-test the projector-to-materializer boundary.
- Refactor rationale: Fixing only `Run Team` submission would make the builder reinterpret its input based on origin, violate its explicit-override contract, and leave read-only override display false. The local representation refactor corrects every consumer at the single boundary that creates the malformed shape.
- Intentional deferrals and residual risk, if any: Member-specific workspace and skill-access differences remain outside `MemberConfigOverride` by approved scope. Historical authoring intent for deliberately redundant equal overrides was never persisted; the approved canonical rule treats equality as inheritance. Neither deferral leaves the in-scope runtime/model/config/auto behavior on the known-bad boundary.

## Terminology

- **Effective member settings:** The fully materialized runtime/model/config/auto values stored for one configured agent in the execution tree.
- **Coordinator baseline:** The coordinator's effective supported settings, used as the reconstructed team globals.
- **Material member delta / genuine override:** An address-keyed field whose effective value differs from the corresponding coordinator baseline field.
- **Canonical team configuration view:** One coordinator baseline plus only material member deltas; materializing it recreates every supported effective member value.
- **Materialization:** Converting a global-plus-delta `TeamRunConfig` into complete per-member API records.

## Design Reading Order

This design follows the mandatory order: verified behavior and health decision first; persisted-state decision; end-to-end spines and owners; boundaries and dependencies; then subsystem/file mapping, removal, sequencing, and verification guidance.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- In-scope obsolete behavior: the all-configured-members/full-effective-value `memberOverrides` projection.
- In-scope obsolete structure: `MemberConfigOverride.agentDefinitionId`, its clone field, the `MemberOverrideItem` prop used only to populate it, and identity-only override objects.
- In-scope duplicated policy: the private shallow model-config normalizer in `teamRunConfigUtils`.
- Required clean cut: every current live/history execution uses the same canonical projection immediately. No flag, origin tag, old-view fallback, dual override type, or submission-time compatibility branch remains.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: 509 observed schema-v1 files at `/Users/normy/.autobyteus/server-data/memory/agent_teams/<teamRunId>/team_run_execution_tree.json` plus 509 entries in `memory/team_run_history_index.json`. Each configured agent stores a complete `launch_configuration`.
- Relevant code-model, serialization, semantic, or physical-store change: Only the derived frontend `TeamRunConfig.memberOverrides` meaning and shape are contracted. Stored DTOs, GraphQL inputs, server entities, physical files, and writers do not change.
- Normal reader/writer behavior and representative evidence: The normal GraphQL/hydration reader validates schema-v1 into `TeamRunExecutionTreeDto`, then `createTeamConfigurationView` projects it. The server writer continues storing complete effective member settings. Representative current files contain all comparison inputs and already hydrate without version branches.
- Required semantics and invariants under direct use: The coordinator baseline plus field-level deltas must materialize to exactly the original supported effective member runtime/model/config/auto values when unedited; an edited global must reach fields without a delta.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: Run histories are user records and must not be rewritten, discarded, or mutated. No privacy, storage, or physical-schema requirement calls for transformation.
- Decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): `Directly Usable — No Migration`
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: The version-agnostic normal reader already has every effective value required to derive the contracted view. Rewriting 509 files would add I/O, corruption/recovery exposure, and rollout machinery without improving correctness.
- Acceptance criteria or design constraints supported by this decision: REQ-002, REQ-007; AC-002, AC-005, AC-008; no version-specific branch or migration subsystem may be added.

### Migration Plan (Only When Decision Is `Migration Required`)

N/A. The approved and designed decision is `Directly Usable — No Migration`.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-003 | Existing team event-monitor `+` action | Fully materialized `CreateAgentTeamRun.memberConfigs` and server member runtimes | `agentTeamRunStore.launchDraft` for launch sequencing; `createTeamConfigurationView` for the input transformation invariant | Carries the user-edited team configuration through the faulty boundary to the meaningful runtime outcome. |
| DS-002 | Primary End-to-End | BEH-003, BEH-004 | Live/history execution-tree response | Read-only canonical team configuration and quick-launch seed | `hydrateCurrentTeamRunContext` with its team-execution projection | Establishes direct history usability and truthful global/override presentation. |
| DS-003 | Primary End-to-End | BEH-002 | Existing standalone-agent event-monitor `+` action | `PrepareAgentRunInput` and prepared agent run | `agentRunStore.sendUserInputAndSubscribe` after temporary-context creation | Protects the user-confirmed correct single-agent path from collateral regression. |
| DS-004 | Return-Event | BEH-001, BEH-004 | Successful `CreateAgentTeamRun` allocation | Selected hydrated team execution/configuration | `agentTeamRunStore.launchDraft` | Proves the submitted effective values return as the new execution's configuration rather than only appearing correct before launch. |
| DS-005 | Bounded Local | BEH-001, BEH-003 | Canonical quick-launch seed | Completed or released exact immutable draft | `teamRunConfigStore` | Preserves edit, inheritance-pruning, readiness, and in-flight snapshot invariants while the source representation changes. |

## Primary Execution Spine(s)

- **DS-001 — Team quick launch:** `WorkspaceHeaderActions (+) -> TeamWorkspaceView.createNewTeamRun -> TeamExecutionViewState.getConfigurationView -> buildEditableTeamRunSeed/teamRunConfigStore -> RunConfigPanel -> agentTeamRunStore.launchDraft -> buildTeamRunMemberConfigRecords -> CreateAgentTeamRun -> server topology/member runtimes`
- **DS-002 — Team history/live read:** `GraphQL team resume/live payload -> TeamRunExecutionTreeDto validation -> hydrateCurrentTeamRunContext -> createTeamConfigurationView -> TeamExecutionViewState.getConfigurationView -> read-only form or new editable seed`
- **DS-003 — Standalone preservation:** `WorkspaceHeaderActions (+) -> AgentWorkspaceView.createNewAgent -> agentRunConfigStore edits -> agentContextsStore.createRunFromTemplate -> temporary AgentContext -> first message -> agentRunStore.sendUserInputAndSubscribe -> PrepareAgentRun -> prepared runtime`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The selected team view supplies a canonical config; the user edits immutable draft snapshots; launch admits the exact selected snapshot, materializes one complete record per current leaf member, and sends it to the server. | Team execution view, team launch draft, team launch orchestration, member runtime | `agentTeamRunStore.launchDraft`; projection invariant owned by `createTeamConfigurationView` | Definition leaf flattening, workspace resolution, readiness validation, GraphQL transport |
| DS-002 | Hydration reads a complete effective execution tree, resolves workspaces, derives the coordinator baseline and only material member deltas, and installs the locked view used by both read-only display and later cloning. | Stored/live execution tree, canonical team configuration view | `hydrateCurrentTeamRunContext` and team-execution projector | DTO validation, configured-agent collection, workspace metadata resolution |
| DS-003 | The agent view clones one selected config, edits it directly, copies it to a temporary context, and submits that exact context's current fields on the first message. | Agent config, temporary AgentContext, prepared AgentRun | `agentRunStore.sendUserInputAndSubscribe` | Workspace lookup, model availability, GraphQL transport, stream connection |
| DS-004 | After allocation, the launch owner hydrates the returned execution tree, promotes selection to that exact team run, and exposes its derived configuration. | Created team identity, hydrated team execution view | `agentTeamRunStore.launchDraft` | Live hydration, selection store, stream subscription |
| DS-005 | Each admitted edit replaces the selected frozen config snapshot; launch locks the exact object in flight and either completes/removes it or releases the same snapshot after failure. | TeamLaunchDraft | `teamRunConfigStore` | Config cloning/freezing, model/runtime catalogs, readiness and pending-input state |

## Spine Actors / Main-Line Nodes

| Node | Direct Role On Spine |
| --- | --- |
| `WorkspaceHeaderActions` | Emits the generic edit/new-run user intent. |
| `TeamWorkspaceView` / `AgentWorkspaceView` | Selects the subject-specific source config and starts the appropriate draft path. |
| `createTeamConfigurationView` | Converts a full execution tree into the canonical locked team config. |
| `teamRunConfigStore` | Owns immutable team draft state, edits, readiness inputs, and exact admission. |
| `agentTeamRunStore.launchDraft` | Owns team allocation, materialization invocation, hydration, selection, and success/failure completion. |
| `buildTeamRunMemberConfigRecords` | Materializes full member launch records from the global-plus-delta config and current leaf definitions. |
| Team GraphQL/server run service | Creates and persists the exact complete member execution configuration and starts runtimes. |
| `agentContextsStore` / `agentRunStore` | Own the preserved standalone temporary-context and first-message preparation lifecycle. |

## Ownership Map

- **Team execution projection:** `createTeamConfigurationView` owns the conversion invariant from flattened effective DTO values to one canonical `TeamRunConfig`. It selects the coordinator baseline and calculates field-level deltas; callers do not prune or reinterpret overrides.
- **Member delta contract:** `MemberConfigOverride` owns only optional runtime, model identifier, model config, and auto-approval differences. Canonical address is the map identity; current team-definition leaf data owns `agentDefinitionId` for launch payloads.
- **Config semantics:** `teamRunConfigUtils` owns equality, explicit-field detection, effective resolution, and “meaningful override” policy. It delegates model-config normalization to the existing canonical launch-config normalizer.
- **Team draft lifecycle:** `teamRunConfigStore` owns cloning/freezing, typed edits, inherited-config pruning, exact snapshot admission, and in-flight exclusion. It does not own execution-tree interpretation.
- **Team launch lifecycle:** `agentTeamRunStore` owns orchestration; `buildTeamRunMemberConfigRecords` remains the singular materializer. Neither knows whether the config came from history or a definition.
- **Team server execution:** Existing GraphQL/service/topology owners consume fully materialized records and remain unchanged.
- **Standalone lifecycle:** Existing agent config/context/run stores remain authoritative; only their contract assertions are strengthened.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `WorkspaceHeaderActions.vue` | Subject-specific workspace view and run/config stores | Shared cog/`+` presentation | Team inheritance rules, config cloning, or launch orchestration |
| `TeamWorkspaceView.createNewTeamRun` | `TeamExecutionViewState` projection plus `teamRunConfigStore` | Bridges selected team UI to a new draft | Override canonicalization or payload repair |
| `RunConfigPanel.handleRun` | `teamRunConfigStore` and `agentTeamRunStore` | Routes the form CTA to the subject-specific lifecycle | Snapshot mutation, member materialization, or server fallback |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Complete effective settings for every member in `createTeamConfigurationView.memberOverrides` | It duplicates globals and shadows later edits. | `createMemberOverrideAgainstBaseline`-style private projection in `teamExecutionContextFactory.ts` | In This Change | No compatibility switch or second projection. |
| Identity-only override map entries | They are not launch-setting differences and falsely imply an override. | Omission through `hasMeaningfulMemberOverride` after delta construction | In This Change | Uniform teams project to an empty map. |
| `MemberConfigOverride.agentDefinitionId` | Address key plus current leaf definition already own identity; the field is unread. | Canonical address key and `TeamRunLeafMemberDefinition.agentDefinitionId` | In This Change | Remove type field, clone field, UI prop/binding, fixtures, and expectations. |
| Private shallow `normalizeModelConfig` / `modelConfigKey` policy in `teamRunConfigUtils.ts` | It duplicates and is weaker than canonical recursive normalization. | Existing `normalizeModelConfig` export from `useDefinitionLaunchDefaults` used by `modelConfigsEqual` | In This Change | Preserve `modelConfigsEqual` as the comparison API. |
| Submission-time/server repair candidate | It would depend on draft origin and bypass projection ownership. | Correct canonical projection before the draft boundary | In This Change | Explicitly prohibited; no code should be added. |

## Return Or Event Spine(s) (If Applicable)

**DS-004:** `CreateAgentTeamRun success(teamRunId) -> hydrateLiveTeamRunContext -> TeamRunExecutionTreeDto -> createTeamConfigurationView -> AgentTeamContext -> agentSelectionStore selects team/member -> read-only event-monitor configuration`

The returned execution tree remains the runtime truth. API/E2E evidence must compare submitted member records with the returned/hydrated configured-member launch settings to detect any later fallback.

## Bounded Local / Internal Spines (If Applicable)

- **DS-005 parent owner:** `teamRunConfigStore`
- **Chain:** `createDraft(frozen canonical seed) -> applyConfigEdit(replace frozen snapshot) -> admitDraftLaunch(exact selected object) -> inFlightDrafts -> completeDraftLaunch(remove) | releaseDraftLaunch(preserve for retry)`
- **Why it matters:** The fix must not mutate an admitted snapshot, clear genuine member deltas, or reopen the race the exact-object checks prevent. Canonicalization happens before `createDraft`, so this state machine remains origin-agnostic.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Configured-agent tree selection | DS-001, DS-002 | Team execution projection | Enumerate configured leaf agents and coordinator from the DTO. | Supports nested teams without moving traversal into UI/store code. | Components would depend on tree internals and duplicate traversal. |
| Model-config normalization/equality | DS-001, DS-002, DS-005 | Projection and config semantic owners | Recursively canonicalize JSON objects and compare semantic records. | Prevents key order from becoming an explicit delta. | Ad hoc JSON comparison would create inconsistent inheritance. |
| Team-definition leaf flattening | DS-001 | Member materializer / launch owner | Supply display name, address, and current agent definition identity. | Full API records need identity not stored in delta fields. | Override shape would again mix identity with setting deltas. |
| Workspace metadata resolution | DS-001, DS-002, DS-003 | Hydration and run lifecycle owners | Map stored root paths/current workspace IDs to UI metadata and API paths. | Existing launch behavior requires a usable workspace. | Projection change could accidentally broaden into unsupported per-member workspace design. |
| Runtime/model readiness catalogs | DS-001, DS-005 | Draft store/form | Reject unavailable global/effective combinations before launch. | Preserves disabled/error behavior. | Payload code would become validation plus materialization. |
| DTO validation | DS-002, DS-004 | Hydration owner | Validate schema-v1 current data before projection. | Keeps malformed transport outside business view construction. | Projector would need historical/transport fallback logic. |
| Test fixtures | All | Verification owners | Build representative uniform, mixed, nested, and standalone configs. | Durable evidence for the cross-boundary invariant. | Production code must not gain test-only switches. |

## Ownership Boundaries

The authoritative correction boundary is the team-execution projection: once `createTeamConfigurationView` returns, `memberOverrides` must already be canonical. `TeamExecutionViewState.getConfigurationView()` is the read boundary used by the UI; it must not expose the tree and require callers to rebuild semantics. `teamRunConfigStore` is the only team draft command boundary, and `agentTeamRunStore.launchDraft` accepts only the exact admitted draft. The member builder is internal materialization and must stay origin-agnostic. The server boundary receives complete member records and does not infer frontend inheritance.

For standalone agents, the temporary `AgentContext.config` is the authoritative pre-prepare snapshot. The first-message run owner reads it directly; team projection utilities must not be introduced into that path.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `hydrateCurrentTeamRunContext` / returned `TeamExecutionViewState` | DTO validation, workspace resolution, `createTeamConfigurationView`, context association | Run history/live team stores and workspace views | UI reads execution tree plus manually prunes overrides | Strengthen the projection/view contract, not component logic. |
| `createTeamConfigurationView(input)` | Coordinator baseline selection, runtime mapping, field-level delta construction | Team hydration service and focused unit tests | Payload builder repairs “historical” configs differently | Extend the private projection logic in this owner. |
| `teamRunConfigStore` commands | Clone/freeze, edits, readiness data, exact admission, retry lifecycle | Forms, `RunConfigPanel`, team launch store | Direct mutation of selected/in-flight config | Add a typed edit command if a real edit is missing. |
| `agentTeamRunStore.launchDraft(draft)` | Definition lookup, member materialization, GraphQL allocation, hydration, selection, completion/release | `RunConfigPanel` and first-send launch path | Component calls builder/GraphQL directly or changes draft after admission | Extend the store-owned launch command. |
| `agentRunStore.sendUserInputAndSubscribe()` | New-agent prepare input, promotion, first send, stream lifecycle | Agent composer | Team delta logic or source-run lookup during prepare | Strengthen the current AgentContext/config contract. |

## Dependency Rules

1. `teamRunContextHydrationService` may depend on `teamExecutionContextFactory`; UI components depend on the returned view, not the factory's DTO internals.
2. `teamExecutionContextFactory` may depend on `TeamRunConfig` and `teamRunConfigUtils` semantic policies. It must not depend on Pinia stores, forms, GraphQL clients, or server origin tags.
3. `teamRunConfigUtils` may reuse the canonical launch-config normalizer. It must not depend on execution DTOs or components.
4. `MemberConfigOverride` contains setting deltas only. Canonical map address owns member identity; payload agent-definition identity comes from `TeamRunLeafMemberDefinition`.
5. `teamRunConfigStore` and `buildTeamRunMemberConfigRecords` continue consuming one origin-agnostic `TeamRunConfig`; neither may branch on “from existing run.”
6. `agentTeamRunStore` must submit the exact admitted draft and must not merge source execution settings at launch time.
7. Server GraphQL/service/topology code remains dependent only on complete `memberConfigs`; no frontend-inheritance policy crosses the transport boundary.
8. Standalone agent stores remain independent of team override utilities.

Forbidden shortcuts: component-level override clearing, builder-level equal-to-global suppression at submission, server fallback to coordinator values, dual old/new `MemberConfigOverride` shapes, history version branches, or mutation of source execution data.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `createTeamConfigurationView({ tree, workspaceMetadataByAddress })` | One team execution configuration | Derive a locked canonical baseline-plus-deltas view. | Root team run embedded in validated tree; member keys are canonical rooted addresses. | Existing signature remains; returned semantic contract tightens. |
| `TeamExecutionViewState.getConfigurationView()` | Current team view configuration | Expose the already-derived locked view. | Bound to the view's root team run; no selector. | Caller must not reinterpret tree values. |
| `teamRunConfigStore.applyConfigEdit(edit)` | Selected team draft | Replace one immutable draft config according to a typed global/member edit. | Selected draft plus canonical member address for member edits. | Existing command remains. |
| `teamRunConfigStore.admitDraftLaunch(draft)` | Team launch draft lifecycle | Admit only the exact selected snapshot. | `TeamLaunchDraftId` plus exact object identity. | Existing invariant remains. |
| `buildTeamRunMemberConfigRecords({ config, leafMembers, workspaceRootPath })` | Complete member launch records | Resolve global/delta effective values and attach current definition/workspace identity. | Canonical member address joins config delta to current leaf definition. | Must remain origin-agnostic. |
| `agentTeamRunStore.launchDraft(draft)` | One team launch | Sequence admission, allocation, hydration, and completion/release. | Exact `TeamLaunchDraft`. | Existing API remains. |
| `agentContextsStore.createRunFromTemplate()` | New standalone temporary context | Copy the current editable agent template into a separate context. | New generated temporary run ID. | Preserved path. |
| `agentRunStore.sendUserInputAndSubscribe()` | Active standalone agent run | Prepare a new run from current context when temporary, then send. | Active context run ID; later promoted exact run ID. | Regression assertions cover all configured fields. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `createTeamConfigurationView` | Yes | Yes | Low | Keep one validated tree input and address-keyed output; do not add origin flags. |
| `getConfigurationView` | Yes | Yes | Low | No change. |
| `applyConfigEdit` | Yes | Yes | Low | No change. |
| `buildTeamRunMemberConfigRecords` | Yes | Yes | Low | Keep definition identity on `leafMembers`, not overrides. |
| `launchDraft` | Yes | Yes | Low | Preserve exact-object admission. |
| `sendUserInputAndSubscribe` | Yes | Yes | Low | Preserve current active-context contract. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Derived team execution config | `createTeamConfigurationView` | Yes | Low | Keep name; document canonical return invariant in code/tests. |
| Per-member setting differences | `MemberConfigOverride` | Yes after contraction | Medium currently because it includes identity/full copies | Remove `agentDefinitionId` and prevent redundant equal fields. |
| Full API member record | `TeamRunMemberConfigRecord` | Yes | Low | Keep complete materialized identity/settings here. |
| Draft lifecycle | `TeamLaunchDraft` / `teamRunConfigStore` | Yes | Low | No change. |
| Private delta constructor | `createMemberOverrideAgainstBaseline` (guidance name) | Yes | Low | Keep private to the projector; do not create a generic “helper.” |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Execution DTO to UI config projection | `services/teamExecution` | Extend | Existing factory already owns the exact conversion boundary. | N/A |
| Semantic model-config equality | `teamRunConfigUtils` plus canonical launch-config normalizer | Extend | Existing API and normalizer cover the domain; remove duplicate shallow policy. | N/A |
| Meaningful/explicit member delta policy | `teamRunConfigUtils` | Reuse | Existing functions already define field presence and materiality. | N/A |
| Immutable quick-launch edits | `teamRunConfigStore` | Reuse | Existing owner is correct and origin-agnostic. | N/A |
| Full API record materialization | `teamRunMemberConfigBuilder` | Reuse | Existing explicit-over-global precedence is the desired contract. | N/A |
| Nested team test data | `test-support/currentTeamTestFixtures.ts` | Reuse | Existing builders create typed execution trees; no production fixture API needed. | N/A |
| Standalone regression | Existing agent store/workspace specs | Extend | Correct path already has focused tests; strengthen field assertions only. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/teamExecution` | Effective-tree projection and team view construction | DS-001, DS-002, DS-004 | Team hydration/view | Extend | Primary source fix and new boundary regression spec. |
| Team launch configuration model/utilities | Tight delta type, canonical equality, explicit/effective field semantics | DS-001, DS-002, DS-005 | Projection, form, store, materializer | Extend | Clean-cut removal of redundant ID and shallow normalization. |
| Workspace team config components | Address-keyed editing/presentation | DS-001, DS-005 | Draft store | Extend minimally | Remove identity-only prop/output plumbing; no visual redesign. |
| Team launch stores/materializer | Draft lifecycle and complete payload | DS-001, DS-004, DS-005 | Team launch | Reuse | Behavior unchanged; existing tests plus new cross-boundary evidence. |
| Standalone agent stores | Temporary context and preparation | DS-003 | Agent launch | Reuse | Test-only strengthening. |
| Server team execution | Complete record persistence/runtime | DS-001, DS-004 | Server run service/topology | Reuse | No source change. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `services/teamExecution/teamExecutionContextFactory.ts` | Team execution | Execution projection | Build coordinator baseline and material member deltas from the DTO. | This file already owns DTO-to-context/config conversion. | `TeamRunConfig`, `modelConfigsEqual`, `hasMeaningfulMemberOverride` |
| `types/agent/TeamRunConfig.ts` | Team launch config model | Shared config contract | Remove redundant identity from the address-keyed delta type. | Singular type authority. | Canonical address map key |
| `utils/teamRunConfigUtils.ts` | Team launch config semantics | Config semantic policy | Use canonical recursive normalization in equality; retain materiality/effective resolvers. | Existing policy owner. | `normalizeModelConfig` |
| `composables/useDefinitionLaunchDefaults.ts` | Launch-config cloning/defaults | Clone boundary | Clone only supported delta fields after type contraction. | Existing clone owner. | `MemberConfigOverride` |
| `MemberOverrideItem.vue` / `MemberOverrideTree.vue` | Team config UI | Member edit surface | Stop accepting/copying redundant agent definition ID while preserving address routing. | Existing presentation/edit owners. | Contracted override type |
| Focused specs | Verification | Each owned boundary | Cover canonical projection, materialization, UI/store cleanup, and standalone preservation. | Tests live beside the behavior owners. | Existing fixtures/builders |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Model-config canonicalization used by clone and equality | Existing `types/launch/defaultLaunchConfig.ts` exposed through `useDefinitionLaunchDefaults.normalizeModelConfig` | Launch-config model | One recursive JSON-object normalization rule is already present. | Yes—the shallow duplicate is deleted. | Yes—one policy remains. | An execution-tree-specific comparator or version adapter |
| Member setting delta shape | Existing `types/agent/TeamRunConfig.ts` | Team launch config | Form, store, projector, and materializer share the same delta contract. | Yes—remove `agentDefinitionId`. | Yes—full effective settings stay in DTO/API records, deltas in this type. | A full member profile or identity record |
| DTO-to-delta construction | Private function in `teamExecutionContextFactory.ts` | Team execution | Used only by one projection loop, so extraction beyond the owner would add a vague utility. | Yes | Yes | A general-purpose mapping service |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `MemberConfigOverride` target | Yes | Yes | Low | Optional fields mean material differences only; map address is identity. |
| `TeamRunConfig` target | Yes | Yes | Low | Globals are coordinator baseline; member map contains only deltas. |
| `AgentLaunchConfigurationDto` | Yes | N/A | Low | Remains full effective persisted/transport truth; projection boundary converts it once. |
| `TeamRunMemberConfigRecord` | Yes | N/A | Low | Remains full API launch record with identity from leaf definition. |
| Model-config equality policy | Yes | Yes | Low | Delete shallow normalizer and compare recursively normalized records. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/teamExecution/teamExecutionContextFactory.ts` | Team execution | Authoritative projection | Derive coordinator globals and frozen, material, address-keyed member deltas; preserve agent-context creation. | One DTO projection owner; private local delta constructor is cohesive. | Yes |
| `autobyteus-web/types/agent/TeamRunConfig.ts` | Team launch config | Contract | Define `MemberConfigOverride` as optional setting deltas only. | Singular model authority. | N/A |
| `autobyteus-web/utils/teamRunConfigUtils.ts` | Team launch config | Semantic policy | Compare canonical model configs and resolve explicit/effective fields. | Existing cohesive config semantics. | Yes |
| `autobyteus-web/composables/useDefinitionLaunchDefaults.ts` | Launch defaults/cloning | Clone boundary | Clone delta fields without identity and retain deep config cloning. | Existing responsibility. | Yes |
| `autobyteus-web/components/workspace/config/MemberOverrideItem.vue` | Team config UI | Leaf member editor | Emit address-keyed setting deltas only. | Leaf interaction remains local. | Yes |
| `autobyteus-web/components/workspace/config/MemberOverrideTree.vue` | Team config UI | Nested edit router | Stop passing redundant definition identity to the item; preserve address and definition tree rendering. | Existing recursive router. | Yes |
| `autobyteus-web/services/teamExecution/__tests__/teamExecutionContextFactory.spec.ts` (new) | Verification | Projection boundary | Prove uniform/mixed/nested semantic projection, no-edit round trip, global edit propagation, source immutability, freezing, and model-config key-order equality. | One focused spec spans projector to pure materializer because that is the defect boundary. | Existing team test fixtures and builder |
| Existing `MemberOverrideItem`, `TeamRunConfigForm`, `useDefinitionLaunchDefaults`, `TeamWorkspaceView`, `teamRunConfigStore`, and `agentTeamRunStore` specs that construct overrides | Verification | Changed contract consumers | Remove obsolete identity expectations and retain field-level edit/materialization coverage. | Co-located contract cleanup. | Contracted type |
| `autobyteus-web/stores/__tests__/agentContextsStore.spec.ts` | Verification | Standalone temp context | Assert edited runtime/model/config/workspace/auto/skill fields are copied into the new temporary context. | Existing owner-level test. | Existing agent config |
| `autobyteus-web/stores/__tests__/agentRunStore.spec.ts` | Verification | Standalone preparation | Assert the same edited values populate `PrepareAgentRunInput`. | Existing first-message owner-level test. | Existing AgentContext |

## Applied Patterns (If Any)

- **Canonical projection at the read boundary:** Full stored effective data is transformed once into the frontend's baseline-plus-delta domain shape.
- **Global defaults plus sparse overrides:** `TeamRunConfig` expresses inheritance; the materializer remains the inverse operation for supported fields.
- **Exact immutable draft admission:** Existing object-identity state-machine checks remain the launch consistency guard.
- **Thin UI entrypoints:** Header, workspace, and panel components route intent without owning domain reconstruction.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/teamExecution/teamExecutionContextFactory.ts` | File | Team execution projection | Canonical DTO-to-view transformation. | Existing team execution conversion owner. | Store mutations, GraphQL, source-origin flags, migration logic |
| `autobyteus-web/services/teamExecution/__tests__/teamExecutionContextFactory.spec.ts` | File | Projection verification | Durable cross-boundary regression using current DTO-shaped fixtures and pure materializer. | Co-located with owner. | Live user data or desktop-only setup |
| `autobyteus-web/types/agent/TeamRunConfig.ts` | File | Team launch config contract | Tight sparse member delta type. | Existing canonical type location. | Persisted DTO compatibility fields |
| `autobyteus-web/utils/teamRunConfigUtils.ts` | File | Team config semantic policy | Equality, presence, resolution, materiality. | Existing focused utility owner. | DTO traversal or launch orchestration |
| `autobyteus-web/composables/useDefinitionLaunchDefaults.ts` | File | Config build/clone boundary | Clone contracted deltas and normalize nested config. | Existing shared launch-config construction path. | Historical source repair |
| `autobyteus-web/components/workspace/config/MemberOverrideItem.vue` | File | Leaf override editing | Emit setting fields only. | Existing UI owner. | Agent-definition identity duplication or payload building |
| `autobyteus-web/components/workspace/config/MemberOverrideTree.vue` | File | Recursive member presentation | Route edits by canonical address. | Existing nested UI structure. | Delta comparison policy |
| Relevant existing `__tests__` files under components/composables/stores | File | Regression verification | Align fixtures/expectations with the clean-cut type and strengthen standalone assertions. | Co-located with current owners. | Compatibility fixtures for the removed field |

The existing relatively flat team-execution folder remains the clearer choice: this change adds one private transformation inside the established factory and one co-located spec, not a new lifecycle owner or structural depth that warrants another module/folder.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `services/teamExecution` | Main-Line Domain-Control | Yes | Low | Owns execution-tree view transformation/state; keep DTO projection here. |
| `types/agent` | Main-Line Domain-Control | Yes | Low | Owns frontend agent/team config contracts, not persistence. |
| `utils/teamRunConfigUtils.ts` | Off-Spine Concern | Yes | Low | Serves the team config owner with pure field semantics. |
| `components/workspace/config` | Mixed Justified | Yes | Low | Presentation and edit emission are co-located; domain policy stays in utilities/store. |
| `stores` | Main-Line Domain-Control | Yes | Low | Existing draft/run lifecycle owners remain distinct files. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Uniform historical team | Global `model=old`; `memberOverrides={}`. After `set_model(new)`, every built member record has `model=new`. | Global `model=old`; every member override also says `model=old`, so `set_model(new)` is shadowed. | This is the exact reported defect. |
| Field-level mixed team | Coordinator and B match globals; C differs only in runtime. Store `{ '/C': { runtimeKind: 'claude_agent_sdk' } }`; after a global model edit, C keeps its runtime but inherits the new model. | Copy C's old model/config/auto into the runtime override object. | Genuine differences must not freeze unrelated fields. |
| Semantic config equality | Global `{a: {x: 1, y: 2}}` and member `{a: {y: 2, x: 1}}` produce no delta after recursive normalization. | Compare object identity or only top-level key order and emit a false `llmConfig` override. | False deltas recreate the shadowing class for advanced config. |
| Member identity | Delta map key `/reviewer`; payload gets `agentDefinitionId` from current leaf definition. | Store `agentDefinitionId` again inside the delta even though nobody reads it. | Keeps one identity owner and one meaning per structure. |
| Fix boundary | Correct `createTeamConfigurationView`, then let store/builder/server follow normal contracts. | Clear overrides in `RunConfigPanel`, suppress them in the builder only for history, or overwrite on the server. | Prevents mixed-level repair and keeps read-only display correct too. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep both full-member and sparse-member projection behind a flag | Could reduce apparent rollout change. | Rejected | One canonical projection for all current live/history executions. |
| Retain optional `agentDefinitionId` in `MemberConfigOverride` for old callers | Existing source/tests construct it. | Rejected | Update all in-repo callers/fixtures atomically; identity stays on address/leaf definition. |
| Mark configs as `fromExistingRun` and repair during materialization | Would allow submission-specific suppression. | Rejected | Correct the projection before draft creation; builder stays origin-agnostic. |
| Server ignores member values equal to old coordinator values | Could mask the payload defect. | Rejected | Server continues honoring complete member records exactly. |
| Rewrite schema-v1 history to store inheritance intent | Might create explicit metadata. | Rejected | Existing data is directly usable; derive approved coordinator-plus-delta semantics at read time. |
| Version-specific reader branch | Could preserve old all-member view. | Rejected | Current version-agnostic reader always emits the target domain shape. |

## Derived Layering (If Useful)

For explanation only: `UI entry/presentation -> team/agent state and lifecycle owners -> pure projection/materialization policies -> GraphQL/server execution`. The team hydration boundary converts transport DTOs before UI/state consumers; the launch boundary materializes the frontend domain shape before transport. No higher layer reaches around these owners.

## Change / Refactor Sequence

1. Contract `MemberConfigOverride` by removing `agentDefinitionId`; update clone code and member editor/tree plumbing so all production construction emits setting deltas only.
2. Consolidate `modelConfigsEqual` on the existing recursive `normalizeModelConfig`; delete the local shallow normalizer/key policy.
3. In `createTeamConfigurationView`, derive coordinator-supported baseline fields once, construct each member override field only when different, retain only `hasMeaningfulMemberOverride` results, freeze retained overrides/map/config, and leave agent-context mapping unchanged.
4. Add the new factory regression spec proving uniform inheritance, heterogeneous field preservation, semantic config equality, no-edit inverse materialization, edited-global payload values, and source immutability.
5. Update existing override consumers' specs/fixtures to the clean-cut type; do not add compatibility assertions or `as any` escape hatches for the removed field.
6. Strengthen standalone context/preparation specs to assert the complete confirmed-good edit path without changing production source.
7. Run focused type/lint/unit suites first, then the full relevant frontend suite. Downstream API/E2E should validate a real web-equivalent team launch and returned hydration; server tests are required only if evidence contradicts the no-server-change design.

There is no temporary dual shape and no migration sequencing.

## Key Tradeoffs

- **Coordinator as baseline:** This is the only established global choice recoverable from flattened history and preserves all effective values through deltas. It cannot recover deliberately redundant authoring intent, which the user explicitly approved treating as inheritance.
- **Sparse field-level overrides rather than all-or-nothing member profiles:** This allows unrelated globals to change while preserving genuine differences; it requires careful per-field comparison but matches the form/store/materializer contract.
- **Remove redundant override identity now:** This increases compile/test cleanup but prevents the contracted shared type from retaining a second meaning and eliminates identity-only artifacts permanently.
- **Private mapper rather than a new subsystem utility:** The DTO-specific transformation has one caller/owner. Shared policies remain in `teamRunConfigUtils`; extracting a generic mapper would over-abstract a localized boundary.
- **No persisted migration:** Read-time derivation is lossless for supported settings and avoids operational risk.

## Risks

- A missed in-repo fixture may still construct the removed override identity field; TypeScript checks and focused repository search must drive complete cleanup rather than compatibility casts.
- Model configs can contain nested JSON; equality must use the recursive canonical normalizer and tests must include nested key reordering.
- Genuine overrides are field-level. Tests that use one member differing in every field alone could miss accidental unrelated-field copying; include single-field-difference cases.
- The current team definition supplies payload `agentDefinitionId`. Historical definitions that no longer resolve are governed by existing launch readiness/definition behavior and must not be “fixed” by reintroducing stale identity in overrides.
- Exact alternate model selection from the reported ephemeral draft is unavailable, but the deterministic boundary reproduction and user confirmation are sufficient; realistic validation must use a known old/new pair.
- Member workspace/skill differences remain outside scope and must not be silently added to the delta type.

## Guidance For Implementation

- Prefer a small private DTO-specific function such as `createMemberOverrideAgainstBaseline(source, baseline)` inside `teamExecutionContextFactory.ts`. Build an empty delta, add runtime/model/config/auto fields only when materially different, then retain it only when `hasMeaningfulMemberOverride` is true.
- Compare already-mapped runtime kinds, exact validated/normalized model identifiers, booleans, and `modelConfigsEqual` results. Never compare model-config object identity or raw `JSON.stringify` order.
- Keep freezing consistent with the current returned view. Do not mutate the DTO, coordinator launch configuration, selected source view, or a previously admitted draft.
- Do not change `buildTeamRunMemberConfigRecords` precedence. Its override-first/global-fallback behavior is the correct inverse of the target projection.
- Do not add `fromHistory`, `quickLaunch`, schema-version, or source-run fields to `TeamRunConfig`.
- Remove `agentDefinitionId` from override construction and expectations rather than making it optional or leaving compatibility casts. Continue taking payload identity from `TeamRunLeafMemberDefinition`.
- The primary unit regression should begin with a DTO-shaped execution tree, call `createTeamConfigurationView`, apply or clone an edited global config through supported semantics, and call `buildTeamRunMemberConfigRecords`. Assert both the sparse intermediate shape and complete output.
- Add separate mixed cases where only one field differs so unrelated fields demonstrably inherit. Include the coordinator, a matching member, and a genuinely different nested member address.
- Preserve existing readiness, pending/in-flight, failure/retry, workspace, and read-only form tests. The UI should change only in truthful override count/badge state derived from the corrected map; no copy/layout/localization work is required.
- Strengthen `agentContextsStore.spec.ts` and `agentRunStore.spec.ts` with edited runtime/model/config/workspace/auto/skill values across both standalone stages; do not add team utilities to production agent code.
- Implementation-scoped success evidence should include TypeScript/build validation and focused Nuxt/Vitest suites. API/E2E coverage investigation must then decide the durable browser/system scenario, validate submitted team values against hydrated/runtime-observable values, and record that persisted history files were not rewritten.
