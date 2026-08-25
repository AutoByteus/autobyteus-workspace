# Design Spec

## Current-State Read

The selected-run configuration surface is read-only for both subjects, but the visible lock is only one part of the gap.

- `RunConfigPanel.vue` treats any `selectedRunId` as selection mode. It passes one broad read-only state to `AgentRunConfigForm.vue`, and it projects an existing Team through `StoredTeamRunFormModel`, whose `stored` mode is unconditionally read-only. The footer containing `Run Agent` / `Run Team` is hidden in selection mode, so no Save operation exists.
- `RuntimeModelConfigFields.vue` couples runtime/model selector state to `ModelConfigSection.vue` through the same disabled/read-only inputs. The current boundary cannot express “runtime and model fixed, `llmConfig` editable.”
- Standalone resume data exposes broad `editableFields` flags for model identity, `llmConfig`, auto approval, and skill mode when inactive. The selected form ignores those flags, and `activeContextStore.updateConfig` can only patch browser state; it has no persistence contract.
- Standalone commands reuse an active `AgentRun`. When inactive, `StandaloneAgentRunActivationService` reconstructs `AgentRunConfig` from `run_metadata.json`. Its `attempts` map coalesces activation, but configuration persistence does not share that transition boundary.
- Team resume data returns the schema-v2 execution tree and `isActive`. `AgentTeamRunManager` owns root create/restore and already serializes them through `rootTransitionLanes`; no stopped configuration update exists. The stored tree contains `llmConfig` at the root default, every configured nested-team default, and every configured-agent launch configuration. Task-created nodes contain no editable launch configuration.
- AutoByteus and Codex already consume persisted `llmConfig` during create/restore. Codex translates `reasoning_effort` and `service_tier` into turn configuration while preserving its thread binding. Claude model discovery advertises thinking/effort controls, but its bootstrap/session/client chain drops `llmConfig` before the SDK query.
- Exact inspection of `@anthropic-ai/claude-agent-sdk@0.3.231` confirms query options support `thinking?: ThinkingConfig` and `effort?: EffortLevel`. The current Claude catalog also conflates adaptive-thinking and effort capability discovery and can advertise a control the descriptor does not support.

The target must preserve explicit Stop, inactive automatic restore, persisted run packages, provider bindings, and active-runtime immutability. Detailed evidence and commands are in `investigation-notes.md`, BEH-001 through BEH-007.

## Intended Change

Add stopped-only, persisted model-configuration editing for an existing standalone Agent Run or existing root Agent Team Run.

1. While the standalone runtime or Team root is active—including visually idle—all configuration stays locked.
2. After the user manually completes Stop, server-confirmed stopped state unlocks only current-schema `llmConfig` controls. Runtime, model identity, workspace, definition/topology, auto approval, skill mode, and every other launch field remain fixed.
3. The selected-run footer presents `Save` in place of the pre-launch Run action. It stays disabled while active, clean, invalid, or otherwise ineligible. An enabled Save validates and persists a local draft, but never stops, starts, interrupts, or replaces a run.
4. A following message uses the existing restore path and reconstructs the same logical run/team and provider binding from the newly persisted configuration.
5. Team editing is root-gated. The draft snapshots parent/child equality at load. A parent update flows through matching descendants until a draft-start divergence or a scope directly edited in the current draft; that boundary and its branch remain unchanged. A direct edit after propagation overrides the propagated value and blocks later ancestor propagation. Configured scopes use their own fixed model schema. The stopped-run surface adds no Reset-to-inherited action; the existing pre-launch Reset remains unchanged. Only configured root/team/agent scopes can be patched.
6. All three runtimes honor exposed settings. Claude gains the missing typed `llmConfig`-to-SDK query adapter and capability-accurate catalog schema.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User / Contract | REQ-001, REQ-015; AC-015 | Save a reusable Agent/Team Definition | Investigation BEH-001 | Preserve definition saving as separate; never use it to mutate a run instance. | Existing definition path remains unchanged. |
| BEH-002 | System | REQ-004, REQ-006, REQ-007, REQ-015; AC-001, AC-002, AC-007, AC-014, AC-016 | Create or restore a runtime from persisted launch configuration | Investigation BEH-002 and runtime feasibility table | Preserve bootstrap-time configuration and make saved `llmConfig` its next input. | DS-002, DS-004, DS-008 |
| BEH-003 | System / Operational | REQ-002, REQ-003, REQ-006, REQ-009; AC-003, AC-004, AC-008 | Send work to an already active run/team | Investigation BEH-003 | Preserve active backend reuse and stable per-backend configuration; no hot update. | Existing active command path; DS-002/DS-004 only when inactive. |
| BEH-004 | User | REQ-001–REQ-007, REQ-009–REQ-014; AC-001–AC-004, AC-009–AC-014, AC-016 | Select existing standalone run and open Agent Configuration | Investigation BEH-004 | Active stays locked; stopped current-schema model controls become draft-editable and Save becomes available. | DS-001, DS-005, DS-006 |
| BEH-005 | User | REQ-001, REQ-003–REQ-015; AC-005–AC-015 | Select existing Team Run and open Team Configuration | Investigation BEH-005 | Active root stays locked; stopped configured scopes become directly model-config-editable. Parent changes use the approved value-matching propagation boundary, and no stopped-run Reset action is added. | DS-003, DS-005, DS-007 |
| BEH-006 | Contract | REQ-002, REQ-003, REQ-009, REQ-012–REQ-014; AC-003, AC-004, AC-008, AC-010 | Read canonical config/status or submit Save | Investigation BEH-006 | Replace broad flags with model-config editability, opaque revision, narrow mutations, and canonical results. | DS-001, DS-003, DS-005–DS-007 |
| BEH-007 | User / System | REQ-004, REQ-010, REQ-011; AC-009, AC-011, AC-012, AC-016 | Render/validate current runtime-model configuration and restore | Investigation BEH-007 plus exact Claude SDK probe | Reuse current schemas non-destructively; validate authoritatively; make Claude catalog/runtime application truthful. | DS-001, DS-003, DS-008 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/ui-ux-spec.md` | Lifecycle-specific form states, contextual Save, draft/error behavior, Team hierarchy, responsive behavior, and accessibility. | REQ-002–REQ-005, REQ-008, REQ-010–REQ-012; AC-001–AC-014, AC-016 | Governs observable frontend behavior in DS-001, DS-003, and DS-005. | Refined and re-approved after F-001 on 2026-08-25. |

## Task Design Health Assessment (Mandatory)

- Change posture: Feature / Behavior Change.
- Current design issue found: Yes.
- Root cause classification: Missing Invariant and Boundary Or Ownership Issue, with a local Claude adapter defect.
- Refactor needed now: Yes, narrowly.
- Evidence: The browser has no durable Save path, and one read-only flag conflates fixed identity with mutable parameters. Standalone restore coalescing does not serialize persistence. Team has the right root lane but no stopped mutation, and Team archive does not share that lane. Claude advertises configuration it drops.
- Design response: Add identity-specific stopped-update commands behind existing facades; rename/generalize the standalone activation owner into a per-run lifecycle owner; extend the Team root transition owner; separate browser drafts from canonical state; and complete the Claude adapter.
- Refactor rationale: A UI unlock or direct write would leave Save-versus-restore races, browser-only state, unsafe whole-tree replacement, and false-success Claude behavior.
- Intentional deferrals and residual risk: General-purpose schema standardization across packages and unrelated runtime cleanup are deferred. Dynamic catalog absence is handled by failing closed and preserving stored values, not fallback compatibility.

## Terminology

- **Stopped standalone run:** no active `AgentRun` is registered for the run ID and no activation command overlay is starting it.
- **Stopped Team Run:** the root is not managed by `AgentTeamRunManager`. A stopped member inside a managed root is insufficient.
- **Fixed launch identity:** runtime, model, definition, workspace, topology, auto approval, skill mode, IDs, and provider binding; none is accepted by Save.
- **Configured Team scope:** root `/`, configured nested-team address, or configured-agent address. Task-created executions are excluded.
- **Configuration revision:** opaque server digest of fixed runtime/model plus canonical `llmConfig` at relevant scopes. It is not persisted.
- **Canonical configuration:** the value reread/returned from authoritative persistence after a transition completes.

## Design Reading Order

Read the approved behavior map and UI/UX supplement first, then the health, removal, and persisted-data decisions. The spine and ownership sections define lifecycle authority and serialization; interface and subsystem mappings then make those boundaries concrete. Finish with file placement, sequencing, risks, and implementation guidance. This ordering is especially important here because the visible form unlock depends on server-owned stopped-state and restore ordering rather than on frontend status alone.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Replace `RunEditableFieldFlags` with model-config-specific lifecycle editability and revision; do not publish both.
- Remove `activeContextStore.updateConfig`, which suggests existing-run mutation but only changes browser memory. Launch drafts stay in dedicated stores.
- Replace `StoredTeamRunFormModel`'s unconditional read-only meaning with an existing-run form model that separates fixed selectors from model-config editability.
- Rename `StandaloneAgentRunActivationService` to `StandaloneAgentRunLifecycleService`; update imports/tests with no forwarding wrapper.
- Tighten Claude capability mapping in place; remove the branch where either capability enables both controls.
- No legacy API, dual mutation, client full-tree update, or provider hot-update fallback remains.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume:
  - Standalone: one `run_metadata.json` with fixed `runtimeKind`, `llmModelIdentifier`, `platformAgentRunId`, and `llmConfig: object | null`.
  - Team: one schema-v2 `team_run_execution_tree.json` with root/nested default and configured-agent `llmConfig`.
  - One selected package changes per operation; no bulk rewrite.
- Relevant change: No stored shape/version changes. Only existing `llmConfig` fields receive new values. Revision is computed.
- Normal behavior: standalone restore builds config from metadata and metadata writes atomically; Team restore builds config from the tree and the tree writer reports committed, pre-rename failure, or post-rename finalization-indeterminate.
- Required invariants: fixed fields, IDs, bindings, history, tasks/messages, workspaces, topology, timestamps, and task nodes remain unchanged. Only addressed configured-scope `llmConfig` may differ.
- Constraints: history is user data and cannot be discarded/replaced; update must remain atomic at one-file scope.
- Decision: **Directly Usable — No Migration**.
- Rationale: current readers consume exactly these fields. Migration adds I/O and corruption risk without semantic benefit.
- Supported IDs: REQ-006–REQ-010, REQ-012–REQ-014; AC-001, AC-002, AC-005, AC-007, AC-009–AC-011, AC-014.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-004, BEH-006, BEH-007 | Stopped standalone form edit | Canonical metadata Save result while stopped | `StandaloneAgentRunLifecycleService` | Durable stopped-only Agent update. |
| DS-002 | Primary End-to-End | BEH-002–BEH-004 | Next message to stopped Agent | Same logical/provider run turns with revised config | `StandaloneAgentRunLifecycleService` | Proves automatic restore continuity. |
| DS-003 | Primary End-to-End | BEH-005–BEH-007 | Stopped Team hierarchy edit | Canonical tree Save result while root stopped | `AgentTeamRunManager` | One root-owned narrow Team update. |
| DS-004 | Primary End-to-End | BEH-002, BEH-003, BEH-005 | Next message to stopped Team | Same root/member/provider identities restored and message dispatched | `AgentTeamRunManager` | Team and mixed-runtime continuity. |
| DS-005 | Return-Event | BEH-004–BEH-007 | Query/mutation/status result | Form lock, draft, feedback, and canonical cache reconciled | `existingRunModelConfigStore` | Prevents draft from becoming false truth. |
| DS-006 | Bounded Local | BEH-004, BEH-006 | One standalone transition request | Restore/Save completes deterministically | `StandaloneAgentRunLifecycleService` | Orders Save, restore, and concurrent saves. |
| DS-007 | Bounded Local | BEH-005, BEH-006 | One root transition request | Restore/Save/archive/delete gets exclusive root transition | `AgentTeamRunManager` | Root-wide lifecycle/persistence invariant. |
| DS-008 | Primary End-to-End | BEH-002, BEH-007 | Restored Claude `llmConfig` | Exact SDK query receives thinking/effort on same session | Claude adapter chain | Closes advertised-but-dropped gap. |

## Primary Execution Spine(s)

- **DS-001:** `RunConfigPanel -> existingRunModelConfigStore -> updateStoppedAgentRunModelConfig -> AgentRunService -> StandaloneAgentRunLifecycleService -> AgentRunHistoryCatalogService / AgentRunMetadataStore -> canonical result`
- **DS-002:** `Message composer -> agentRunStore / command transport -> AgentRunService.resolveCommandReadyAgentRun -> StandaloneAgentRunLifecycleService -> metadata -> backend bootstrapper -> existing provider binding -> turn`
- **DS-003:** `RunConfigPanel Team hierarchy -> existingRunModelConfigStore -> updateStoppedTeamRunModelConfigs -> TeamRunService -> AgentTeamRunManager -> Team model-config mutator -> TeamRunExecutionTreeStore -> canonical result`
- **DS-004:** `Focused Team composer -> agentTeamRunStore -> restoreAgentTeamRun -> TeamRunService -> AgentTeamRunManager -> tree/config builder -> mixed backend restore -> message`
- **DS-008:** `ClaudeSessionBootstrapper -> Claude model-config adapter -> ClaudeSessionConfig -> ClaudeSession.executeTurn -> ClaudeSdkClient.buildQueryOptions -> SDK query`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A network-fresh stopped run supplies config/editability/revision. Browser edits an isolated draft. The lifecycle owner rechecks state inside its lane, validates against the fixed runtime/model, and asks the catalog persistence boundary to revision-check and replace only metadata `llmConfig`. | Draft, lifecycle transition, metadata | Standalone lifecycle service | Validation, revision, GraphQL, feedback |
| DS-002 | Sending to inactive enters the same lane. Restore reads metadata after any prior Save, preserves run/provider IDs, constructs revised backend, and dispatches normally. | Persisted run, active run, provider session/thread | Standalone lifecycle service | Workspace and backend factory |
| DS-003 | Team draft snapshots parent/child equality at load and tracks directly edited scopes. A parent change traverses only matching, unmarked descendants; the first divergent or directly edited scope stops that branch. A later direct edit overrides propagation and marks the boundary. The planner emits only changed configured-scope patches and exposes no Reset action. Manager lane rejects a managed root, validates every target/value against that target's fixed model, mutates only configured launch configs, writes the validated tree, and returns the canonical tree/revision. | Team draft, root lifecycle, tree | Team manager | Patch planner, validator, write reconciliation |
| DS-004 | Team send restores unmanaged root through the same lane. Saved tree creates mixed backends with preserved root/member/provider identities, then sends to focus. | Root Team, configured executions, mixed backend | Team manager | Package loader, stream hydration |
| DS-005 | Queries, status, and Save results update canonical history. Draft owner combines authoritative lifecycle with catalog representability, relocks on activation, and replaces its baseline only from canonical success/refresh. | Resume state, draft, form | Browser draft store | Catalog load and accessible feedback |
| DS-006 | Per run ID, restore-first publishes active then Save returns `RUN_ACTIVE`; Save-first commits then restore reads new config; stale concurrent saves reject. | Transition lane | Standalone lifecycle service | Quarantine/cleanup unchanged |
| DS-007 | Per root ID, one lane gates restore, stopped Save, archive, and delete. Managed root rejects stopped persistence. | Root lane | Team manager | History catalog retains index queue |
| DS-008 | Bootstrap translates only capability-valid saved keys into typed session settings; each query receives them while `resume` keeps session ID. | Session config, SDK options | Claude adapter chain | Capability catalog |

## Spine Actors / Main-Line Nodes

- `RunConfigPanel`: selected/new surface and contextual action host.
- `existingRunModelConfigStore`: selected existing-run draft and Save/reconciliation owner.
- `AgentRunService` / `TeamRunService`: thin application-facing subject facades.
- `StandaloneAgentRunLifecycleService`: standalone activation/restore/stopped-update sequencer.
- `AgentTeamRunManager`: root Team lifecycle/transition sequencer.
- history catalogs/stores: durable package owners.
- Team model-config mutator: pure narrow transformation.
- runtime bootstrap/session/client: effective provider application.

## Ownership Map

| Node | Owns | Does Not Own |
| --- | --- | --- |
| `RunConfigPanel` | Launch vs existing mode; contextual Run/Save; draft event delegation | Lifecycle truth, tree algorithms, persistence |
| `existingRunModelConfigStore` | One selected draft; dirty/save/reconcile state; request/result routing | Runtime activation or persisted truth |
| `AgentRunService` | Public standalone use-case boundary/wiring | Transition internals/file I/O |
| `StandaloneAgentRunLifecycleService` | Per-run ordering, active recheck, update orchestration, activation quarantine | GraphQL/UI state |
| `AgentRunHistoryCatalogService` | Queue serialization with archive/delete and metadata commit verification | Stopped policy/schema validation |
| `TeamRunService` | Public Team use-case boundary/wiring | Tree writes/root lane |
| `AgentTeamRunManager` | Managed-root truth, root lane, stopped update orchestration | UI inheritance/GraphQL DTOs |
| Team model-config mutator | Pure address/kind checked `llmConfig` replacement | I/O, lifecycle, task mutation |
| `ModelConfigValidationService` | Current catalog lookup/schema normalization/strict validation | Eligibility/persistence |
| revision helper | Deterministic digest of relevant facts | Persisting revision/eligibility |
| Claude adapter | Capability schema and typed SDK translation | Generic stopped lifecycle |

Application services remain thin. Resolvers must not call managers or stores directly.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentRunResolver` | `AgentRunService` -> standalone lifecycle | GraphQL mapping | stopped checks, metadata I/O |
| `AgentRunService` | standalone lifecycle | Agent application API | second lock/transport codes |
| `AgentTeamRunResolver` | `TeamRunService` -> Team manager | GraphQL mapping | tree traversal/writes |
| `TeamRunService` | Team manager | Team application API | second root lane/patch algorithm |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replacement | Scope | Notes |
| --- | --- | --- | --- | --- |
| GraphQL/frontend `RunEditableFieldFlags` | Advertises unrelated mutability and no Save authority | `RunModelConfigEditability` + revision | In This Change | Update generated client/tests. |
| `activeContextStore.updateConfig` | Unused outside store and not durable | existing-run draft store | In This Change | Launch stores unchanged. |
| history editable getters/broad inactive flag mutation | Fixed fields never change; local inactive is not authority | explicit fixed UI + targeted refresh | In This Change | Local status may relock, never unlock. |
| activation service name/file and activation-only attempt ownership | Save must share restore ordering | renamed lifecycle service/lane | In This Change | Preserve quarantine/abort semantics. |
| stored Team unconditional read-only model/projection | Existing Team needs active-locked/stopped-editable | specialized existing-Team model | In This Change | Launch model remains separate. |
| Claude combined capability predicate | Can advertise unsupported control | per-capability schema builder | In This Change | Update tests. |
| notices saying a new run is required | No longer true after stopped Save | approved guidance/messages | In This Change | English/Chinese. |

## Return Or Event Spine(s) (If Applicable)

**DS-005:** `canonical query/mutation/lifecycle result -> runHistoryStore resume payload -> existingRunModelConfigStore reconciliation -> Agent/Team form -> lock/Save/feedback`.

- `UPDATED`/`UNCHANGED`: replace canonical config/revision, clear dirty, stay stopped, and patch standalone context display.
- Team: replace `teamResumeConfigByTeamRunId.executionTree`; project the selected Team form from that canonical tree/draft, not a stale context configuration snapshot. Restore later rehydrates member contexts.
- `RUN_ACTIVE`: mark active, retain rejected draft for explanation, relock. A later Stop and network-fresh resume query establishes a new baseline.
- Validation/persistence failure: keep draft and reconcile canonical state. Indeterminate Team writes block Save until network refresh completes.
- Local status can relock immediately; only targeted server refresh unlocks after Stop.

## Bounded Local / Internal Spines (If Applicable)

### DS-006 — standalone lane

`normalize ID -> enqueue -> recheck active/quarantine/persisted state -> activate or validate/update -> commit/reread -> release`.

The active check must be inside the same lane as restore publication and Save. An outside check is advisory only.

### DS-007 — Team root lane

`normalize root ID -> enter rootTransitionLane -> recheck managed/package/archive state -> restore or validate/mutate/write -> canonical result -> release`.

Generalize the public deletion-only gate to an internal `withUnmanagedRootPersistence` used by Team archive/delete. Stopped model Save remains an explicit manager method, not a generic callback from GraphQL.

## Off-Spine Concerns Around The Spine

| Concern | Spine(s) | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Schema validation | DS-001, DS-003 | lifecycle owners | Exact runtime/model lookup; normalize both schema forms; reject invalid keys/values | Server authority | duplicated provider checks |
| Revision digest | DS-001, DS-003, DS-005 | reads/writes | Stable versioned hash | Prevent stale overwrite | client authority/schema pollution |
| Agent draft compare | DS-001, DS-005 | draft store | Clone/dirty/no-op without sanitizing | Unsaved separation | local patch seen as durable |
| Team draft planner | DS-003, DS-005 | draft store | Draft-start equality links, direct-edit markers, bounded parent propagation, narrow patch generation; no Reset action | Approved Team semantics | panel blob/full-tree API |
| GraphQL mapping | DS-001, DS-003, DS-005 | facades | Typed inputs/results/errors | Explicit contract | resolver owns lifecycle |
| Catalog representability | DS-001, DS-003, DS-005 | forms/store | Fail closed and preserve residuals | Avoid destructive normalization | silent key loss |
| Claude adapter | DS-008 | Claude boundary | Map config to SDK options | Runtime effectiveness | provider rules in generic service |

## Ownership Boundaries

1. Canonical resume/status is server truth; browser draft never mutates history/context before canonical response.
2. Resolvers call only `AgentRunService`/`TeamRunService`.
3. Standalone activation/restore/Save use the lifecycle lane. Catalog is internal persistence and shares its queue with archive/delete.
4. Team manager alone authorizes unmanaged-root mutation; tree store is not called from transport/application callers.
5. Validator receives server-read fixed runtime/model and cannot default identity, omit invalid keys, or sanitize silently.
6. Generic lifecycle persists config; runtime adapters interpret provider keys at bootstrap/turn construction.

## Boundary Encapsulation Map

| Authoritative Boundary | Encapsulates | Required Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `AgentRunService` | standalone lifecycle | GraphQL/commands | Resolver -> manager/store | add subject method |
| standalone lifecycle | lane, activation/quarantine, validation/commit | Agent service | resolver -> metadata; old wrapper | extend/rename owner |
| catalog commit | catalog queue, archive check, metadata write/reread | lifecycle only | metadata write beside archive queue | add narrow commit |
| `TeamRunService` | Team manager | GraphQL/apps | resolver -> manager/store | add Team method |
| Team manager | managed map, root lane, package gate, tree store | Team service/history gate | GraphQL -> tree store | strengthen explicit operations |
| validator | catalog/schema policy | lifecycle owners | frontend-only/provider switch in mutation | extend validator |

## Dependency Rules

- Components depend on the draft store/form models; no direct mutation calls or canonical object mutation.
- Draft store may depend on GraphQL/history/context stores and pure planners; planners import neither Pinia nor Apollo.
- Resolvers depend only on application services and transport DTOs.
- `AgentRunService -> lifecycle -> validator + catalog/metadata reader` is allowed; resolver-to-store is forbidden.
- `TeamRunService -> manager -> validator + mutator + tree store` is allowed; service/resolver-to-tree store is forbidden.
- Revision helper is server-only; browser treats tokens as opaque.
- Generic lifecycle never branches on Claude/Codex keys.
- UI owns the approved pre-edit equality snapshot and bounded parent-propagation plan; the server applies explicit validated patches and never infers propagation from the submitted final tree.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `getAgentRunResumeConfig(runId)` | standalone run | Return metadata, active/editability, revision | exact `runId` | Remove broad flags. |
| `getTeamRunResumeConfig(teamRunId)` | root Team | Return projected tree, root editability, revision | exact root ID | Revision covers configured scopes. |
| `updateStoppedAgentRunModelConfig(input)` | standalone run | Validate/revision-check/persist `llmConfig` stopped | `{agentRunId, expectedConfigurationRevision, llmConfig}` | `llmConfig` present, nullable; no fixed fields. |
| `updateStoppedTeamRunModelConfigs(input)` | root Team | Persist configured-scope patches stopped | `{teamRunId, expectedConfigurationRevision, patches[]}` | Patch has kind/address/present nullable config; reject duplicates. |
| `AgentRunService.updateStoppedModelConfig` | Agent use case | Thin delegation | standalone input | Public facade. |
| lifecycle `updateStoppedModelConfig` | Agent lifecycle | Serialize/recheck/validate/commit | exact run ID | Governing owner. |
| catalog `commitRunModelConfig` | Agent persistence | In queue reject missing/archived/stale; write/reread | ID + revision + canonical config | Internal. |
| `TeamRunService.updateStoppedModelConfigs` | Team use case | Thin delegation | root + patches | Public facade. |
| manager `updateStoppedModelConfigs` | Team lifecycle | Serialize/validate targets/configs/persist | root + typed patches | Governing owner. |
| manager `withUnmanagedRootPersistence` | Team history | Gate archive/delete behind root lane | root + internal operation | Not transport-exposed. |
| validator `validate` | fixed model config | Canonical config or errors | runtime + model + config | No defaults/deletions. |

### Transport outcome shape

Both mutations use:

`UPDATED | UNCHANGED | RUN_ACTIVE | RUN_ARCHIVED | NOT_FOUND | STALE_REVISION | MODEL_UNAVAILABLE | SCHEMA_UNAVAILABLE | VALIDATION_FAILED | PERSISTENCE_FAILED | PERSISTENCE_INDETERMINATE | INTERNAL_ERROR`.

Expected rejections are typed, not message-parsed. Results include `success`, `outcome`, `message`, `isActive`, editability, current revision, and field errors. Agent returns canonical `llmConfig`; Team returns canonical projected tree. Only `UPDATED`/`UNCHANGED` have `success=true`.

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguous Risk | Action |
| --- | --- | --- | --- | --- |
| Agent resume/update | Yes | Yes | Low | Keep separate from Team. |
| Team resume/update | Yes | Yes | Low | Root ID + kind/address patches. |
| Team scope patch | Yes | Yes | Low | Verify root `/`, kind/address, and configured target. |
| Shared validation | Yes | Yes | Low | Fixed identity is server-read. |

## Main Domain Subject Naming Check

| Node | Name | Self-Descriptive? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Standalone transition owner | `StandaloneAgentRunLifecycleService` | Yes | Low | Rename. |
| Team transition owner | `AgentTeamRunManager` | Yes | Low | Extend existing responsibility. |
| Browser draft owner | `existingRunModelConfigStore` | Yes | Low | Keep launch drafts separate. |
| Team transformation | `team-run-model-config-mutator.ts` | Yes | Low | No I/O/lifecycle. |
| Schema authority | `ModelConfigValidationService` | Yes | Low | Avoid helper/common. |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Capability | Decision | Why | If New |
| --- | --- | --- | --- | --- |
| Model/schema lookup | `ModelCatalogService` | Extend | Exact runtime catalogs already owned | N/A |
| Agent restore ordering | activation service | Extend + Rename | Already owns activation/restore/quarantine | N/A |
| Team ordering | manager root lanes | Extend | Owns create/restore/managed truth | N/A |
| Agent persistence | history catalog/metadata store | Extend | Queue and atomic file already owned | N/A |
| Team persistence | tree store/writer | Reuse | Schema validation/outcomes correct | N/A |
| Existing-run drafts | launch/history stores | Create focused store | Launch allows different fields; history cannot hold unsaved data | Dedicated owner avoids mixing. |
| Claude translation | Claude adapter chain | Extend | Provider boundary is correct | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem | Concerns | Spine(s) | Owner | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| web existing-run config | Drafts, form state, Save/reconcile | DS-001, DS-003, DS-005 | draft store | Extend/Create | Launch unchanged. |
| agent execution | Agent lane/update/restore | DS-001, DS-002, DS-006 | lifecycle | Extend/Rename | Active admission unchanged. |
| Team execution | Root lane/mutator/restore | DS-003, DS-004, DS-007 | manager | Extend | No task patches. |
| run history | Reads/revisions/persistence | DS-001, DS-003, DS-005 | lifecycle/read services | Extend | No migration. |
| LLM management | Schema lookup/validation | DS-001, DS-003 | validator | Extend | Shared policy. |
| Claude runtime | Capability/query application | DS-008 | adapter chain | Extend | Exact pinned SDK. |
| GraphQL | Subject APIs/mapping | DS-001, DS-003, DS-005 | facades | Extend | Thin. |

## Draft File Responsibility Mapping

| Candidate File | Subsystem | Owner | Concern | Why One File | Shared? |
| --- | --- | --- | --- | --- | --- |
| `stores/existingRunModelConfigStore.ts` | web | draft owner | Specialized drafts and Save reconciliation | One selected operation state | draft types/planners |
| `services/runConfigEditing/existingTeamModelConfigDraft.ts` | web | pure planner | Draft-start links, direct-edit markers, bounded parent propagation, patch planning | Cohesive algorithm | config equality |
| `standalone-agent-run-lifecycle-service.ts` | Agent | lifecycle | Activation/restore/update lane | Same lifecycle subject | validator/revision |
| `model-config-validation-service.ts` | LLM | validation | Catalog/schema/strict validation | Provider-neutral policy | normalized schema |
| `team-run-model-config-mutator.ts` | Team | pure transform | Configured-scope patch only | Avoid mixed current mutator | patch target |
| `run-model-config-revision.ts` | history | revision | Canonical digest | One concurrency meaning | specialized inputs |

## Reusable Owned Structures Check

| Repeated Logic | Shared File | Owner | Why | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| editability + revision | tight run-history domain type | history | Same meaning in queries/results | Yes | Yes | field-flag bag |
| normalized schema | validator internal/domain file if needed | LLM | Both update paths | Yes | Yes | full generic JSON Schema engine |
| transport outcomes/errors | `api/graphql/types/run-model-config.ts` | API | Shared vocabulary | Yes | Yes | generic mutation/domain owner |
| canonical digest | revision file | history | Same reads/writes | Yes | Yes | unrelated hash utility |

## Shared Structure / Data Model Tightness Check

| Structure | Clear Fields? | Redundant Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `RunModelConfigEditability` | Yes | Yes | Low | Only editable, reason, opaque revision. |
| mutation result core | Yes | Yes | Low | Shared outcomes; specialized canonical payloads. |
| Team patch | Yes | Yes | Low | Only kind/address/config. |
| frontend draft union | Yes | Yes | Low | Agent/Team discriminated variants. |

## Final File Responsibility Mapping

| File | Subsystem | Owner | Concrete Concern | Why One File | Shared? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/existingRunModelConfigStore.ts` | web | draft owner | Load, submit, retain/reconcile | One operation owner | specialized union |
| `types/agent/ExistingRunModelConfigDraft.ts` | web | contract | Tight Agent/Team variants/errors | Explicit store/component contract | outcomes |
| `types/agent/ExistingTeamRunFormModel.ts` | web | form contract | Fixed facts + model edit/catalog state | Separate from launch model | draft scopes |
| `services/runConfigEditing/existingAgentModelConfigDraft.ts` | web | pure planner | Clone/equality/patch | Testable | equality |
| `services/runConfigEditing/existingTeamModelConfigDraft.ts` | web | pure planner | Tree semantics/patches | Testable | patch type |
| `standalone-agent-run-lifecycle-service.ts` | server Agent | lifecycle | Existing activation + lane/update | One lifecycle owner | validator/catalog |
| `model-config-validation-service.ts` | server LLM | validation | Current strict validation | One policy | catalog |
| `run-model-config-revision.ts` | server history | revision | Versioned digests | One token meaning | crypto |
| `team-run-model-config-mutator.ts` | server Team | transform | Configured patch only | Narrow | tree validation |
| `api/graphql/types/run-model-config.ts` | server API | transport | Shared GraphQL vocabulary | Transport-only | domain results |

## Applied Patterns (If Any)

- Serialized per-identity transition lane inside lifecycle owners.
- Existing repository/atomic store serving lifecycle owners.
- Claude provider adapter for capability/query translation.
- Discriminated Agent/Team frontend draft variants.
- Server-computed optimistic concurrency token.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/services/standalone-agent-run-lifecycle-service.ts` | Rename/Modify File | Agent lifecycle | Replace activation service; lane/update | Existing owner | GraphQL/provider keys |
| `.../agent-execution/services/agent-run-service.ts` | Modify | Agent facade | Expose/wire update | Existing boundary | direct file writes |
| `.../run-history/services/agent-run-history-catalog-service.ts` | Modify | Agent persistence | Queued revision/archive check + commit/reread | Existing queue | active/schema policy |
| `.../run-history/services/agent-run-resume-config-service.ts` | Modify | Agent read | Editability/revision, remove flags | Existing query source | mutation |
| `.../run-history/services/team-run-history-service.ts` | Modify | Team read | Root editability/revision | Existing query source | mutation |
| `.../run-history/domain/run-model-config-revision.ts` | Add | Revision | Stable versioned digest | Shared read/write contract | generic hashes |
| `.../llm-management/services/model-config-validation-service.ts` | Add | Validator | Exact model/schema validation | Catalog subsystem | lifecycle/I/O |
| `.../agent-team-execution/services/agent-team-run-manager.ts` | Modify | Team lifecycle | Stopped update + generalized history gate | Root-lane owner | UI/GraphQL |
| `.../agent-team-execution/services/team-run-service.ts` | Modify | Team facade | Expose update | Existing boundary | tree I/O |
| `.../agent-team-execution/services/team-run-model-config-mutator.ts` | Add | Team transform | Address/kind patch | Cohesive concern | tasks/I/O |
| `.../run-history/services/team-run-history-catalog-service.ts` | Modify | Team persistence | Archive/delete via root gate | Prevent competing writes | restore/update logic |
| `.../api/graphql/types/run-model-config.ts` | Add | API | Outcomes/editability/errors | Shared transport | business policy |
| `.../api/graphql/types/agent-run.ts`, `agent-team-run.ts` | Modify | API | Narrow mutations | Subject resolvers | manager/store access |
| `.../api/graphql/types/run-history.ts`, `team-run-history.ts` | Modify | API read | New editability/revision | Existing queries | update logic |
| `.../runtime-management/claude/client/claude-sdk-model-normalizer.ts` | Modify | Claude catalog | Independent capability fields | Existing adapter | session state |
| `.../claude/session/claude-session-config.ts` | Modify | Claude session | Typed thinking/effort from config | Session settings | catalog access |
| `.../claude/backend/claude-session-bootstrapper.ts` | Modify | Claude bootstrap | Pass persisted config | Existing assembly | generic validation |
| `.../claude/session/claude-session.ts` | Modify | Claude turn | Forward SDK options | Existing query call | raw config interpretation |
| `.../runtime-management/claude/client/claude-sdk-client.ts` | Modify | Claude SDK | Type/emit options | External boundary | lifecycle |
| `autobyteus-web/graphql/mutations/runHistoryMutations.ts`, `agentTeamRunMutations.ts` | Modify | web API | Agent/Team Save documents | Existing API files | draft algorithms |
| `autobyteus-web/graphql/queries/runHistoryQueries.ts` | Modify | web API | Query editability/revision | Existing reads | inference |
| `autobyteus-web/stores/runHistoryTypes.ts`, `runHistoryStore.ts`, load/selection actions | Modify | canonical history | Store/reconcile new payload; remove flags | Existing read model | drafts |
| `autobyteus-web/stores/existingRunModelConfigStore.ts` | Add | draft | Save/retry/reconcile | Focused capability | launch state |
| `autobyteus-web/services/runConfigEditing/` | Add Folder | pure draft | Agent compare/Team planner | Algorithms outside UI | Pinia/Apollo |
| `autobyteus-web/types/agent/ExistingRunModelConfigDraft.ts`, `ExistingTeamRunFormModel.ts` | Add | contracts | Specialized variants | Tight shapes | optional bag |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | Modify | surface | Draft lifecycle, Run/Save, notices | Existing host | tree/network logic |
| Agent/Team form hierarchy files | Modify | forms | Fixed vs model editable; Team direct-edit/propagation events; no existing-run Reset | Existing UI | persistence |
| `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` | Modify | reusable field | Split selector/model-config disablement | Coupling point | selected-run policy |
| `ModelConfigSection.vue` and schema utilities | Modify as needed | schema UI | Residual/representability safety | Existing UI | server authority |
| `autobyteus-web/stores/activeContextStore.ts` | Modify | context facade | Remove local config mutation | Clean ownership | Save |
| English/Chinese workspace localization + generated catalogs | Modify/Regenerate | localization | Approved copy | Existing system | hard-coded strings |
| relevant server/web tests | Modify/Add | coverage | Contracts/races/UI/runtime | Existing test structure | alternate paths |

## Folder Boundary Check

| Folder | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `agent-execution/services` | Main-Line Control | Yes | Low | Standalone lifecycle beside manager/service. |
| `agent-team-execution/services` | Main-Line Control + owned transform | Yes | Low | Manager governs; mutator internal. |
| `llm-management/services` | Off-Spine | Yes | Low | Catalog validation shared. |
| `run-history/domain/services/store` | Mixed justified | Yes | Low | Revision, service, physical store stay distinct. |
| `web/services/runConfigEditing` | Off-Spine | Yes | Low | Pure algorithms separate. |
| `web/components/workspace/config` | Presentation | Yes | Medium | Keep only rendering/events. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided | Why |
| --- | --- | --- | --- |
| Agent input | `{agentRunId, expectedConfigurationRevision, llmConfig:{reasoning_effort:'high'}}` | full runtime/model/workspace config | Fixed fields cannot change. |
| Team patch | `{scopeKind:'CONFIGURED_AGENT', scopeAddress:'/code_reviewer', llmConfig:{...}}` | client replacement tree | Explicit identity; task nodes unreachable. |
| Race | Save lane first -> commit -> restore reads new; restore first -> active -> Save `RUN_ACTIVE` | check inactive then write outside lane | Prevents TOCTOU. |
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

## Derived Layering (If Useful)

`Vue presentation -> existing-run draft state -> GraphQL subject boundary -> application facade -> lifecycle owner -> validation/persistence -> runtime adapter/provider`.

This is explanatory; boundary/no-bypass rules remain authoritative.

## Change / Refactor Sequence

1. Add server validation and revision helpers/tests.
2. Rename standalone activation to lifecycle; add per-run lane while preserving candidate cleanup/quarantine/binding checks; add catalog-queued metadata commit and stopped update.
3. Add Team scope mutator/manager update; generalize unmanaged-root history gate and route Team archive/delete through it; cover ordering and write outcomes.
4. Update Agent/Team resume models and add mutations/shared transport types; remove broad flags; regenerate frontend GraphQL types.
5. Correct Claude capability schema and thread config through bootstrap/session/client; add catalog/bootstrap/session/client/same-session restore tests. AutoByteus/Codex receive regression coverage.
6. Add frontend specialized drafts/planners/store. Require targeted network refresh after Stop before unlock; local inactive state only changes display.
7. Split selector/model-config disabling; replace Team stored-only projection; wire model-config-only direct-edit and bounded-propagation events, Save, notices, and a11y. Do not wire the pre-launch Reset action into existing-run mode.
8. Reconcile canonical results; relock on activation; remove obsolete local mutation/flags; update localization.
9. Run implementation-scoped unit/integration checks. API/E2E coverage investigation/execution remains with `api_e2e_engineer` after code review.

No interim UI unlock may land before authoritative mutation/lifecycle serialization. No compatibility seam remains after step 8.

## Key Tradeoffs

- Manual Stop adds one step but avoids active admission, interruption, recycling, and partial-Team semantics.
- Narrow patches require planners but enforce fixed-field preservation and exclude transient tasks.
- Opaque revision avoids schema migration/clocks and prevents lost updates.
- Client-owned bounded Team propagation preserves the approved deterministic value-matching behavior; the server still validates and persists explicit final patches.
- Omitting Reset from stopped-run editing avoids pretending a narrow `llmConfig` update can clear fixed launch identity; the existing pre-launch authoring action remains available only in its current flow.
- Failing closed on schema drift can temporarily block editing but prevents stored-value loss.
- Claude work is Medium, but required for truthful all-runtime behavior.

## Risks

1. Dynamic model/schema disappears between render and Save: resolve again in transition and reject without write.
2. Historical residuals: display and disable Save; never sanitize historical mode.
3. Missing Team override provenance: use the approved draft-start immediate-parent value comparison plus current-draft direct-edit markers only to bound parent propagation; do not claim recovered intent or offer stopped-run Reset.
4. Team post-rename indeterminate: return explicit outcome, reread, network-refresh, block repeat Save until reconciled.
5. Agent archive/delete race: commit through catalog queue after lifecycle eligibility claim.
6. Claude SDK evolution: isolate mapping against pinned `0.3.231`; no deprecated fallback.
7. Concurrent tabs/messages: lanes, opaque revision, typed outcomes, canonical refresh.

## Guidance For Implementation

- Local lifecycle is only a presentation hint. Unlock only from a network-fresh resume payload after Stop; always recheck server-side inside the lane.
- Compute revisions from recursively key-sorted JSON with a version prefix. Agent subject: runtime/model/config. Team subject: address-sorted configured scope kind/address/runtime/model/config. Exclude tasks/unrelated metadata.
- Validator accepts only null/plain JSON object, rejects unknown keys, and enforces required/type/integer/enum/min/max/pattern from both schema encodings. Never add defaults/delete keys. Unsupported shapes fail closed.
- Validate all Team patches before any write. Require nonempty patches, reject duplicates/kind mismatches/transient targets, and return `UNCHANGED` without write for no-op.
- Preserve stored objects by replacing only containing launch `llmConfig`; never rebuild metadata/tree from client input. Reread and verify after write.
- Claude mapping: absent `thinking_enabled` omits option; true -> adaptive; false -> disabled; valid effort -> `effort`. Preserve session binding. Emit each catalog field only for its independent capability.
- Keep `AgentRunConfig.isLocked` semantics; add separate selector and model-config editable props.
- Team planner/UI tests: matching descendant chains propagate; a draft-start divergent child and its branch stay unchanged; direct-edit-before-parent and direct-edit-after-propagation both win and bound later propagation; direct edits use the target's fixed schema; no stopped-run Reset is rendered; equal-to-parent edits, sibling isolation, fixed runtime/model differences, minimal patches, and transient exclusion remain covered. Existing pre-launch Reset regression coverage remains unchanged.
- Server coverage: active rejection, both Save/restore orders, stale concurrent Save, archive/delete serialization, fixed-field preservation, validation, no-op, failure/indeterminate, and revision stability. Team coverage additionally proves each submitted scope validates against its own fixed runtime/model, a divergent child is not implicitly copied from its parent, and no mutation input can change fixed identity.
- Runtime coverage: AutoByteus rebuilt config, Codex same-thread effort/tier, Claude same-session thinking/effort.
- Frontend coverage: active/idle lock, targeted post-Stop refresh, stopped focusability, Run/Save, dirty/saving, draft discard/retention, residual safety, accessible announcements.
