# Design Spec

## Current-State Read

The workspace run configuration surface has a correct high-level mode split but an unsafe lower-level model-config lifecycle:

- `RunConfigPanel.vue` uses selected-run state as read-only source config when `selectionStore.selectedRunId` exists, and uses `agentRunConfigStore.config` / `teamRunConfigStore.config` as editable new-run buffers when selection is cleared.
- Header add actions already intend to duplicate current config:
  - `AgentWorkspaceView.createNewAgent()` shallow-copies `selectedAgent.value.config`, then clears selection.
  - `TeamWorkspaceView.createNewTeamRun()` JSON-clones `activeTeamContext.value.config`, then clears selection.
- After selection is cleared, the copied config is rendered as editable by `AgentRunConfigForm` / `TeamRunConfigForm`, both of which use `RuntimeModelConfigFields` and `ModelConfigSection`.
- `RuntimeModelConfigFields` passes `clear-on-empty-schema=true` into `ModelConfigSection`. During async model catalog loading, `modelConfigSchemaByIdentifier(...)` returns `null`. In editable mode, `ModelConfigSection` treats that `null` schema as authority to emit `update:config(null)`, deleting copied `llmConfig` values such as `{ reasoning_effort: "xhigh" }`.
- `ModelConfigSection` has a second schema-change watcher that can clear config on async schema arrival (`null` -> schema) if the config object reference is unchanged. This watcher also owns reset policy without knowing whether the user actually changed model/runtime.
- Individual-agent and team forms share this path, so the agent path has the same risk. The agent add path also shallow-copies nested config, so editing a copied config can mutate the source object if child components update nested state directly.
- Running-panel group add (`RunningAgentsPanel`) clones `group.runs[0]`; it does not prefer the currently selected same-definition run.
- History agent definition-row add (`runHistoryStore.createDraftRun`) can reuse same-definition local contexts, but it does not explicitly prefer selected same-definition context and does not consistently use deep clone helpers.

The target design must preserve config-first add behavior from the prior `workspace-run-config-form-consistency` work, but make source-run seeding and model-config clearing ownership explicit.

## Intended Change

Add/new-run from a selected run should create an editable draft seed from that selected run's current config and preserve the seed through asynchronous model-schema loading. Model-specific config should be cleared only when an owner that observes an explicit user runtime/model change performs the clear.

No backend contract change is planned. The frontend already has selected run/team configs after opening history or live runs.

## Terminology

- `Source run config`: the selected agent/team context config used as the template for a new editable draft.
- `Editable run seed`: a deep-cloned, unlocked `AgentRunConfig` or `TeamRunConfig` stored in the run config store for a new run.
- `Schema-driven config renderer`: `ModelConfigSection`; it renders, sanitizes, and applies defaults for known schema fields but must not infer user model-switch intent.
- `Runtime/model selection owner`: `RuntimeModelConfigFields`, `MemberOverrideItem`, or messaging binding launch-preset selection code that directly receives user runtime/model changes.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove inferred config-clearing behavior from `ModelConfigSection` rather than keeping it as a fallback path.
- The design rejects dual-path clearing where both model-selection owners and `ModelConfigSection` can erase model config.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Selected agent header add click | Editable agent run config form preserving source `llmConfig` | `AgentWorkspaceView` source-run seed action + run config store | Covers individual agent replication. |
| DS-002 | Primary End-to-End | Selected team header add click | Editable team run config form preserving global/member `llmConfig` | `TeamWorkspaceView` source-run seed action + team config store | Covers screenshot-reported team regression. |
| DS-003 | Primary End-to-End | Group/history add click | Editable run config seeded by selected same-definition source or deterministic fallback | Group/history add owner using shared seed policy | Aligns non-header add actions with source expectation. |
| DS-004 | Bounded Local | Editable runtime/model field mount while model catalog loads | Copied `llmConfig` remains present until real schema sanitization/defaulting | `RuntimeModelConfigFields` + `ModelConfigSection` boundary | Fixes root cause. |
| DS-005 | Bounded Local | User explicitly changes runtime/model | Incompatible `llmConfig` is cleared once by selection owner | Runtime/model selection owners | Preserves stale-config cleanup. |

## Primary Execution Spine(s)

- DS-001: `Header Add Click -> AgentWorkspaceView Source Seed -> cloneAgentConfig/unlock -> AgentRunConfigStore Buffer -> RunConfigPanel Editable Agent Form -> RuntimeModelConfigFields -> ModelConfigSection Preserve/Sanitize`
- DS-002: `Header Add Click -> TeamWorkspaceView Source Seed -> cloneTeamConfig/unlock -> TeamRunConfigStore Buffer -> RunConfigPanel Editable Team Form -> RuntimeModelConfigFields + MemberOverrideItem -> ModelConfigSection Preserve/Sanitize`
- DS-003: `Group/History Add Click -> Source Template Policy -> clone/unlock or definition default -> Config Store Buffer -> RunConfigPanel Editable Form`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Agent header plus is a source-run duplication command. The selected agent context supplies the source config; the view creates an unlocked deep clone and stores it as the editable agent buffer. The form renders it without clearing `llmConfig` while schema metadata is loading. | Header action, selected agent context, editable agent buffer, runtime/model fields, model config renderer | `AgentWorkspaceView` for source; `AgentRunConfigStore` for buffer | Clone helper, schema loading, stale config cleanup on explicit changes |
| DS-002 | Team header plus follows the same shape, but the source has global config plus member overrides. The team clone must deep-clone global and per-member `llmConfig` and preserve them until a user changes model/runtime. | Header action, selected team context, editable team buffer, member override rows, model config renderer | `TeamWorkspaceView` for source; `TeamRunConfigStore` for buffer | Team clone helper, member override cleanup, readiness checks |
| DS-003 | Add actions without a row-specific run source use a deterministic template policy: selected same-definition source first, then best known same-definition context, then definition defaults. | Group/history add action, template policy, editable buffer | The add action owner (`RunningAgentsPanel` or `runHistoryStore`) | Workspace resolution, model availability, deterministic fallback |
| DS-004 | Editable form mount is not a user model change. Missing schema during async load must not delete copied model config. Once schema is available, the renderer may sanitize invalid fields and apply non-thinking defaults. | Runtime/model fields, model catalog, schema-driven renderer | `RuntimeModelConfigFields` loads schema; `ModelConfigSection` renders schema | Loading-vs-schema-less ambiguity |
| DS-005 | Runtime/model change events are user intent. The selection owner clears model-specific config at that moment, before rendering the new model's config schema. | Runtime select, model select, config emit | `RuntimeModelConfigFields`, `MemberOverrideItem`, messaging binding selection | Stale provider/model-specific config cleanup |

## Spine Actors / Main-Line Nodes

- Header add action (`WorkspaceHeaderActions`) is a thin UI trigger.
- Source owner (`AgentWorkspaceView`, `TeamWorkspaceView`) knows the selected context and starts the seed command.
- Config clone helper (`useDefinitionLaunchDefaults`) creates source-safe editable copies.
- Config buffer stores (`agentRunConfigStore`, `teamRunConfigStore`) own the editable draft state.
- `RunConfigPanel` chooses editable vs read-only rendering.
- Runtime/model fields own explicit runtime/model user changes.
- `ModelConfigSection` owns schema-driven display/edit/sanitize/default only.

## Ownership Map

| Node | Owns | Notes |
| --- | --- | --- |
| `WorkspaceHeaderActions` | UI events only | Thin facade; must not own source selection or seed policy. |
| `AgentWorkspaceView` / `TeamWorkspaceView` | Selected source context for header add | Must use clone helper and unlock seed. |
| `RunningAgentsPanel` | Group add fallback source policy for currently known live/history contexts | Must prefer selected same-definition source before group first/recent fallback. |
| `runHistoryStore.createDraftRun` | History agent-row workspace/default draft preparation | Must use selected same-definition source policy and clone helper. |
| `useDefinitionLaunchDefaults` | Default templates and deep source-config clone/seed construction | Correct home for reusable `AgentRunConfig` / `TeamRunConfig` normalization. |
| `RuntimeModelConfigFields` | Runtime/model selection intent and model catalog/schema lookup | Must clear `llmConfig` only on explicit user runtime/model change or validated runtime incompatibility. |
| `ModelConfigSection` | Schema-driven model config editing, sanitization, defaulting, read-only display | Must not clear config just because schema is absent or changed asynchronously. |
| `MemberOverrideItem` | Member override runtime/model selection and override config shape | Must preserve/clear explicit member `llmConfig` based on member model change, not renderer side effects. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `WorkspaceHeaderActions` | Parent workspace view | Shared header buttons | Source-run clone policy |
| `RunConfigPanel` | Config stores + selected context stores | Shared rendering shell | Source selection or schema-clearing policy |
| `ModelConfigSection` | Runtime/model selection owners for reset intent | Reusable renderer/editor | User model-switch detection |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `ModelConfigSection.clearConfigIfEmptySchema` behavior for editable forms | It erases copied config during loading and duplicates reset policy | Explicit runtime/model-change clears in selection owners | In This Change | Remove prop usage from `RuntimeModelConfigFields`; remove or ignore `clearOnEmptySchema` from renderer. |
| `ModelConfigSection` schema-change reset watcher | It treats async schema arrival as user model switch | `RuntimeModelConfigFields.updateRuntimeKind` / `updateModel`, `MemberOverrideItem.handle*Change`, binding `updateModel` | In This Change | Keep sanitize/default watcher for actual schema. |
| Ad hoc JSON clone in `TeamWorkspaceView` | Duplicates clone policy | `cloneTeamConfig`/editable seed helper | In This Change | Avoid JSON-specific data loss and keep one clone owner. |
| Shallow clone in `AgentWorkspaceView` | Allows nested mutation leakage | `cloneAgentConfig`/editable seed helper | In This Change | Required for source immutability. |
| `RunningAgentsPanel` group-first source choice | Does not match selected source expectation | selected same-definition policy | In This Change | Fallback may still use best recent known template. |

## Return Or Event Spine(s) (If Applicable)

No asynchronous return/event spine changes are required. Existing model catalog fetching remains asynchronous, but it becomes an off-spine input to rendering rather than a reset trigger.

## Bounded Local / Internal Spines (If Applicable)

- DS-004 inside runtime/model config rendering: `Mount editable fields -> request provider groups -> schema initially absent -> preserve copied config -> schema arrives -> sanitize/default against schema`.
- DS-005 inside runtime/model selection: `User selects runtime/model -> owner emits new model/runtime -> owner clears `llmConfig` once -> renderer shows new schema/default controls`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Deep clone/normalization | DS-001, DS-002, DS-003 | Source seed owners | Copy nested config safely and unlock draft | Prevent source mutation and duplicate clone code | Shallow copies mutate source; ad hoc JSON clones drift. |
| Model catalog loading | DS-004 | Runtime/model fields | Fetch provider groups and provide schema when available | Enables schema-driven controls | If treated as reset intent, copied config is erased. |
| Schema sanitization/defaults | DS-004 | Model config renderer | Remove invalid schema fields and add safe non-thinking defaults | Keeps stored config valid when schema is known | If it owns user-switch reset, source copies break. |
| Stale config cleanup | DS-005 | Runtime/model selection owners | Clear provider/model-specific config on explicit user changes | Prevent stale settings across model/runtime changes | If duplicated, config can be cleared unexpectedly. |
| Workspace resolution | DS-003 | History add store | Convert root path into workspace id | Needed for history definition-row add | Not relevant to header add source copy. |
| Team member override materialization | DS-002 | Team config form/member rows | Keep global/member override semantics and readiness | Required for team launch | Misplacing on global form would hide member-specific config. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Config defaults and cloning | `useDefinitionLaunchDefaults.ts` | Extend | Already owns run template normalization and clone helpers | N/A |
| Runtime/model schema lookup | `useRuntimeScopedModelSelection.ts` / `RuntimeModelConfigFields.vue` | Reuse | Already owns runtime-scoped provider groups and schema lookup | N/A |
| Model config rendering | `ModelConfigSection.vue` | Reuse with narrowed responsibility | Existing UI renderer is correct once reset policy is removed | N/A |
| Source-run header add | `AgentWorkspaceView.vue`, `TeamWorkspaceView.vue` | Reuse | These views already know active selected context | N/A |
| Running group add | `RunningAgentsPanel.vue` | Extend | Existing group add owner needs selected-source policy | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace selected run views | Header source seed commands | DS-001, DS-002 | Agent/team workspace views | Extend | Replace local clone code with shared seed helper. |
| Run config stores | Editable draft buffers | DS-001, DS-002, DS-003 | Config panel/forms | Reuse | Store actions can stay mostly unchanged; feed them better cloned seeds. |
| Launch defaults/cloning | Default templates and editable source seeds | DS-001, DS-002, DS-003 | Add actions and stores | Extend | Add `buildEditableAgentRunSeed` / `buildEditableTeamRunSeed` or strengthen existing clone helpers. |
| Runtime/model config UI | Runtime/model choices and schema-driven config | DS-004, DS-005 | Forms and binding setup | Extend | Narrow `ModelConfigSection`; move reset to selection owners. |
| Run history / running tree | Definition/group add source policy | DS-003 | Left tree/running panel | Extend | Prefer selected same-definition source. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `composables/useDefinitionLaunchDefaults.ts` | Launch defaults/cloning | Config seed factory | Add/strengthen source-run seed clone helpers | Existing owner for default and clone normalization | N/A |
| `components/workspace/agent/AgentWorkspaceView.vue` | Workspace selected run views | Agent header add owner | Use editable agent seed helper | Already has selected agent source | Yes |
| `components/workspace/team/TeamWorkspaceView.vue` | Workspace selected run views | Team header add owner | Use editable team seed helper | Already has selected team source | Yes |
| `components/workspace/running/RunningAgentsPanel.vue` | Run tree/group add | Running group add owner | Prefer selected same-definition source before fallback | Existing group add owner | Yes |
| `stores/runHistoryStore.ts` | Run history add | History agent-row draft owner | Prefer selected same-definition source and clone safely | Existing workspace/model resolution owner | Yes |
| `components/launch-config/RuntimeModelConfigFields.vue` | Runtime/model config UI | Runtime/model selection owner | Clear `llmConfig` on explicit runtime/model changes only | Existing direct selection owner | N/A |
| `components/workspace/config/ModelConfigSection.vue` | Runtime/model config UI | Schema renderer | Remove absent-schema/schema-change reset; keep sanitize/default/read-only behavior | Existing renderer | N/A |
| `components/workspace/config/MemberOverrideItem.vue` | Team member config UI | Member override owner | Ensure explicit member model changes clear incompatible config | Existing member override owner | N/A |
| `composables/messaging-binding-flow/launch-preset-model-selection.ts` | Messaging binding launch config | Binding model owner | Clear `llmConfig` on explicit binding model changes | Existing binding model owner | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Deep clone and unlock of source run configs | `composables/useDefinitionLaunchDefaults.ts` | Launch defaults/cloning | Agent, team, running-panel, history add all need same safe seed semantics | Yes | Yes | A UI-specific helper that imports stores |
| Selected same-definition source policy | Local small functions in `RunningAgentsPanel` and `runHistoryStore` or a small utility if duplication grows | Run history/group add | Needed in two add owners; can be local unless implementation duplicates complex logic | Yes | Yes | Generic ID guessing API |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentRunConfig` clone/seed | Yes | Yes | Low | Preserve existing shape; only set `isLocked=false`. |
| `TeamRunConfig` clone/seed | Yes | Yes | Low | Preserve existing global/member override shape; only set `isLocked=false`. |
| `llmConfig` | Yes, model-specific record | N/A | Medium if reset remains in renderer | Make reset ownership explicit and singular. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/composables/useDefinitionLaunchDefaults.ts` | Launch defaults/cloning | Source config seed factory | Export helpers that deep-clone source `AgentRunConfig` / `TeamRunConfig` and force `isLocked=false`; keep default template builders unchanged | Existing clone/default owner | N/A |
| `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue` | Workspace selected run views | Agent source seed action | Use source seed helper; clear team config and selection as today | Parent knows active agent source | Yes |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | Workspace selected run views | Team source seed action | Use source seed helper; clear agent config and selection as today | Parent knows active team source | Yes |
| `autobyteus-web/components/workspace/running/RunningAgentsPanel.vue` | Running group add | Running source policy | Select same-definition active source if currently selected; otherwise recent/best group source; use seed helper | Existing group add owner | Yes |
| `autobyteus-web/stores/runHistoryStore.ts` | History add | Agent history-row draft owner | Use selected same-definition context before preferred template; use seed helper; preserve workspace/model resolution | Existing workspace/model resolver | Yes |
| `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` | Runtime/model config UI | Runtime/model selection owner | Stop passing clear-on-empty-schema; clear `llmConfig` in `updateRuntimeKind`, `updateModel`, and invalid-runtime/model validation paths | Only file with direct user selection event | N/A |
| `autobyteus-web/components/workspace/config/ModelConfigSection.vue` | Runtime/model config UI | Model config renderer | Remove `clearOnEmptySchema` and schema-change reset watcher; keep sanitize/default watcher guarded by actual schema and read-only | Renderer should not know user selection intent | N/A |
| `autobyteus-web/components/workspace/config/MemberOverrideItem.vue` | Team member config UI | Member override selection owner | Ensure explicit model change drops explicit `llmConfig` unless retaining same compatible model is intentional | Owns member override identity | N/A |
| `autobyteus-web/composables/messaging-binding-flow/launch-preset-model-selection.ts` | Messaging binding launch config | Binding model selection owner | Clear launch preset `llmConfig` on explicit model change | Prevents regressions after renderer reset removal | N/A |
| Tests under `autobyteus-web/components/workspace/**/__tests__`, `autobyteus-web/stores/__tests__`, `autobyteus-web/components/workspace/config/__tests__` | Validation | Regression coverage | Add source-copy preservation and explicit-clear tests | Existing test locations match files | N/A |

## Ownership Boundaries

- Header views own selected source context and may depend on config stores and clone helpers. They must not manipulate model schema internals.
- Runtime/model selection owners own user intent to switch runtime/model. They may clear `llmConfig` when user changes selection.
- `ModelConfigSection` owns schema-specific rendering and value normalization only after schema exists. It must not reach upward to infer runtime/model selection intent.
- Stores own editable draft buffers and history source resolution; they should receive already-safe cloned configs.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `useDefinitionLaunchDefaults` clone/seed helpers | Nested `llmConfig`/member override cloning | Header/group/history add owners | Local JSON clone or shallow object spread for source config | Add explicit seed helper API |
| `RuntimeModelConfigFields` | Runtime-scoped model catalog/schema and user runtime/model changes | Agent/team config forms | `ModelConfigSection` clearing based on schema absence | Add explicit clear on `updateModel` / `updateRuntimeKind` |
| `ModelConfigSection` | Schema rendering/sanitize/default | Runtime/model fields and member override rows | Parent relying on renderer to detect model switch | Parent clears config on known user switch |
| `runHistoryStore.createDraftRun` | Workspace root resolution and history agent-row add policy | History tree action | UI component resolving workspace/model details directly | Add store action options if needed |

## Dependency Rules

- `AgentWorkspaceView` / `TeamWorkspaceView` may depend on config stores and `useDefinitionLaunchDefaults` helpers.
- `RuntimeModelConfigFields` may depend on `useRuntimeScopedModelSelection` and emit field updates; it must not import selected run stores.
- `ModelConfigSection` must not import runtime/model stores, selected run stores, or source-run helpers.
- `runHistoryStore` may inspect local `agentContextsStore` and `selectionStore` for selected same-definition source; it must not treat arbitrary selected ids as definition ids.
- No caller should clone source configs manually once shared seed helpers exist.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `buildEditableAgentRunSeed(sourceConfig)` or strengthened `cloneAgentConfig` | Agent source config | Deep clone and unlock a source agent config | `AgentRunConfig` object | No run id/definition id ambiguity. |
| `buildEditableTeamRunSeed(sourceConfig)` or strengthened `cloneTeamConfig` | Team source config | Deep clone and unlock source team config | `TeamRunConfig` object | Deep clone member overrides. |
| `RuntimeModelConfigFields.updateRuntimeKind(value)` | Runtime selection | User runtime change and config invalidation | runtime kind string | Clears model and `llmConfig`. |
| `RuntimeModelConfigFields.updateModel(value)` | Model selection | User model change and config invalidation | model identifier string | Must clear old `llmConfig`. |
| `runHistoryStore.createDraftRun({ workspaceRootPath, agentDefinitionId })` | History agent-row draft | Resolve workspace, pick source/default, prepare editable agent buffer | explicit workspace root + agent definition id | Do not overload with run id. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Source config seed helpers | Yes | Yes | Low | Accept config object, not ids. |
| Runtime/model update emits | Yes | Yes | Low | Keep runtime/model as separate emits. |
| `createDraftRun` | Yes | Yes | Low | Preserve current explicit definition/workspace input. |
| `ModelConfigSection.update:config` | Yes | Yes | Low after reset removal | Only emits edited/sanitized model config. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Source run seed | `buildEditableAgentRunSeed`, `buildEditableTeamRunSeed` | Yes | Low | If not adding new names, document `clone*Config` usage as seed. |
| Model config renderer | `ModelConfigSection` | Yes | Medium currently | Narrow behavior to rendering. |
| Runtime/model fields | `RuntimeModelConfigFields` | Yes | Low | Own explicit selection invalidation. |

## Applied Patterns (If Any)

- Factory/helper pattern for editable source config seeds in `useDefinitionLaunchDefaults.ts`: controlled construction of safe draft configs.
- Adapter/rendering boundary in `ModelConfigSection`: schema input is adapted into controls, but source/reset policy stays outside.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/composables/useDefinitionLaunchDefaults.ts` | File | Launch config seed factory | Defaults, clone, editable source seed helpers | Existing launch default owner | Store imports or UI state |
| `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue` | File | Agent source view | Header add from selected agent | Has active agent source | Schema logic |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | File | Team source view | Header add from selected team | Has active team source | Schema logic |
| `autobyteus-web/components/workspace/running/RunningAgentsPanel.vue` | File | Running group add | Selected-source preference for group add | Owns grouped running contexts | Model schema clearing |
| `autobyteus-web/stores/runHistoryStore.ts` | File | History draft add | Workspace/model resolution and selected-source preference for agent history row | Existing history add owner | Team member rendering |
| `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` | File | Runtime/model selector | Explicit user selection and model config invalidation | Direct selection events live here | Source-run clone policy |
| `autobyteus-web/components/workspace/config/ModelConfigSection.vue` | File | Schema config renderer | Render/sanitize/default model config | Existing reusable renderer | Runtime/model switch inference |
| `autobyteus-web/components/workspace/config/MemberOverrideItem.vue` | File | Member override editor | Member runtime/model change and override config invalidation | Existing member override owner | Global team source policy |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/workspace/*` | Main-Line UI control | Yes | Low | Existing workspace view/control components. |
| `components/launch-config` | Off-spine reusable launch config controls | Yes | Low | Runtime/model selection controls are shared. |
| `composables/useDefinitionLaunchDefaults.ts` | Off-spine seed/default utility | Yes | Low | Compact file remains clearer than a new folder for this scope. |
| `stores/runHistoryStore.ts` | Main-line history state/control | Yes | Medium | Existing large store; only scoped action changes are needed. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Header team source seed | `const seed = buildEditableTeamRunSeed(activeTeamContext.value.config); teamRunConfigStore.setConfig(seed)` | `JSON.parse(JSON.stringify(...)); child component later clears llmConfig` | Shows source config copied once by correct owner. |
| Async schema load | `schema=null on mount -> keep { reasoning_effort:'xhigh' } -> schema arrives -> sanitize only invalid fields` | `schema=null -> emit null -> source copy loses xhigh` | Captures root fix. |
| Explicit model change | `updateModel('new-model') -> emit model -> emit llmConfig null` | `ModelConfigSection sees schema change and guesses reset` | Keeps reset tied to user intent. |
| Source selection policy | `selected same-definition run -> clone seed` | `group.runs[0] regardless of selected run` | Matches user's "from which the user clicked/selected" expectation. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `clearOnEmptySchema` for old callers while adding guards for new-run copies | Could minimize change surface | Rejected | Remove renderer-level absent-schema clearing; put explicit clears in selection owners. |
| Add special `preserveSourceConfig` flag only for header add | Could patch screenshot path | Rejected | Fix ownership so all source-copied editable configs preserve `llmConfig`. |
| Keep manual JSON/shallow clone and patch `llmConfig` after mount | Fast local patch | Rejected | Shared seed helper gives source immutability and consistent behavior. |

## Derived Layering (If Useful)

- UI event layer: header/group/history add controls.
- Source seed layer: selected context/default source policy + clone helper.
- Editable buffer layer: Pinia config stores.
- Form rendering layer: runtime/model fields and schema config renderer.

The key layer rule is that rendering cannot bypass source seed ownership or selection intent ownership.

## Migration / Refactor Sequence

1. Add or strengthen editable seed helpers in `useDefinitionLaunchDefaults.ts`:
   - deep-clone `AgentRunConfig` and `TeamRunConfig` including nested `llmConfig` and member override `llmConfig`;
   - force `isLocked=false`;
   - preserve existing definition ids/names/avatar/workspace/model/runtime/auto-execute/skill access values.
2. Replace `AgentWorkspaceView` and `TeamWorkspaceView` header add clone code with the seed helpers.
3. Update `RunningAgentsPanel` source selection:
   - if selected same-definition agent/team context exists, use it;
   - otherwise choose deterministic best existing group run (prefer most recent by conversation/update timestamp if available; otherwise current stable fallback);
   - use seed helpers.
4. Update `runHistoryStore.createDraftRun`:
   - prefer selected same-definition local context before `pickPreferredRunTemplate` fallback;
   - use seed helper when copying context config;
   - preserve current workspace resolution and model resolution behavior.
5. Refactor `RuntimeModelConfigFields`:
   - stop passing `clear-on-empty-schema`;
   - keep config on mount/schema loading;
   - clear `llmConfig` in explicit `updateRuntimeKind`, explicit `updateModel`, and existing runtime invalidation branches.
6. Refactor `ModelConfigSection`:
   - remove `clearOnEmptySchema` prop behavior and schema-change reset watcher;
   - keep read-only guard, sanitize-against-schema, default application, and missing-historical display.
7. Update `MemberOverrideItem` and `launch-preset-model-selection.ts` so explicit model changes clear incompatible `llmConfig` without relying on `ModelConfigSection`.
8. Add/adjust tests, then run targeted frontend vitest suites.

## Key Tradeoffs

- Removing renderer-level schema reset affects all callers, so explicit model-change cleanup must be added to every current caller that relied on it. This is preferable to preserving a hidden global side effect that deletes copied config.
- A new helper file could be created for source seed policy, but extending `useDefinitionLaunchDefaults.ts` is simpler and matches existing ownership for this medium-sized frontend change.
- Exact historical team global/member override intent may be approximated by reconstructed config for old runs; this is the only available frontend source without backend changes.

## Risks

- Tests may reveal callers outside the investigated set that implicitly relied on `clearOnEmptySchema`; `rg` found current direct callers as `RuntimeModelConfigFields`, `ChannelBindingSetupCard`, and `MemberOverrideItem` via direct `ModelConfigSection` use.
- Runtime schemas with no config fields should not display stale controls; preserving `llmConfig` in state may be acceptable but UI will not render fields. If this is problematic, the runtime/model owner should clear on explicit selection of a schema-less model, not on async absence.
- Running-panel group contexts may lack reliable timestamps. If so, selected same-definition source is still deterministic; fallback can preserve current first-run behavior with a documented stable order.

## Guidance For Implementation

- Treat source preservation as the regression priority: add a test where `llmConfig: { reasoning_effort: 'xhigh' }` remains after editable form mount and after model schema becomes available.
- Add source immutability tests for agent and team: mutate the editable draft and assert the original selected context config's nested `llmConfig`/member override did not change.
- Update existing `ModelConfigSection` tests that expect `clearOnEmptySchema`; replace with tests that explicit model-change owners clear config.
- Suggested targeted checks:
  - `pnpm -C autobyteus-web test:nuxt --run components/workspace/config/__tests__/ModelConfigSection.spec.ts components/workspace/config/__tests__/AgentRunConfigForm.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts components/workspace/config/__tests__/MemberOverrideItem.spec.ts`
  - `pnpm -C autobyteus-web test:nuxt --run components/workspace/agent/__tests__/AgentWorkspaceView.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts components/workspace/running/__tests__/RunningAgentsPanel.spec.ts stores/__tests__/runHistoryStore.spec.ts`
