# Design Spec

## Current-State Read

The workspace config panel reuses launch configuration forms for both new runs and selected existing/historical runs. `RunConfigPanel.vue` can distinguish these modes through `selectionStore.selectedRunId`, but the old UI did not consistently carry that distinction into the form components. As a result, historical agent/team config could render controls as editable even though there is no save/apply workflow for editing a historical run.

The affected frontend path is:

`Workspace run selection -> RunConfigPanel -> AgentRunConfigForm/TeamRunConfigForm -> RuntimeModelConfigFields -> ModelConfigSection/ModelConfigAdvanced -> Browser controls`

Current ownership boundaries:

- `RunConfigPanel` owns choosing whether the panel is showing selected existing run context or new launch-store config.
- `AgentRunConfigForm` and `TeamRunConfigForm` own user-facing controls and direct config mutation handlers.
- `RuntimeModelConfigFields` owns the shared runtime/model update boundary and normalization emissions.
- `ModelConfigSection` and `ModelConfigAdvanced` own advanced/thinking visibility and display.
- Backend history/resume services own whether `llmConfig` is present or null, and are intentionally out of scope for this ticket.

The target design must preserve the existing launch-edit path while making selected existing run config inspect-only.

## Intended Change

Introduce explicit frontend read-only propagation for existing/historical run selection mode:

1. `RunConfigPanel` derives `readOnly` from selection mode and passes it to agent/team config forms.
2. Agent/team forms disable all controls, guard all direct mutation/update handlers, and show a localized read-only notice when `readOnly` is true.
3. Team forms propagate read-only state to member override items.
4. Runtime/model fields accept read-only mode and suppress normalization/update emissions.
5. Model config sections stay expanded/inspectable in read-only mode so persisted values like `reasoning_effort: xhigh` are visible.
6. Missing/null historical model-thinking config may be shown as an explicit frontend-only not-recorded state; no backend inference or recovery is introduced.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.
- `Existing/historical run selection mode`: UI state where `selectionStore.selectedRunId` is set and config is displayed from active run/team context rather than editable launch stores.
- `New-run configuration mode`: UI state where no historical run is selected and config is editable for launching a new agent/team run.

## Design Reading Order

Read this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> reusable owned structures check -> final file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: the old editable-looking historical run UI is removed for selected existing runs.
- No compatibility flag or dual behavior is kept for allowing historical config controls to remain enabled.
- Backend null-metadata compatibility/recovery is out of scope, not implemented as a fallback in this ticket.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-HRC-UX-001 | Primary End-to-End | User selects existing agent/team run | Browser renders read-only inspectable config | `RunConfigPanel` | Carries the mode decision from selection state into all config UI owners |
| DS-HRC-UX-002 | Primary End-to-End | User configures a new agent/team run | Launch stores receive editable config updates | Agent/team config forms | Ensures the new-run launch path remains editable and non-regressed |
| DS-HRC-UX-003 | Bounded Local | Runtime/model field receives config props | Model config controls render persisted advanced/thinking values | `RuntimeModelConfigFields` + model config display components | Prevents hidden thinking config and suppresses read-only mutation emissions |

## Primary Execution Spine(s)

- DS-HRC-UX-001: `Workspace sidebar selected run -> RunConfigPanel selection mode -> Agent/Team config form readOnly prop -> Runtime/model + workspace + option controls disabled -> Read-only inspection UI`
- DS-HRC-UX-002: `Workspace config tab with no selected run -> RunConfigPanel launch mode -> Agent/Team launch form -> Runtime/model/workspace/options update handlers -> Launch stores`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-HRC-UX-001 | When a user selects an existing run, `RunConfigPanel` treats the config as historical context, not launch input. It passes read-only state down so forms disable controls and guard mutation handlers while model-thinking details stay visible. | Run selection, config panel mode, agent/team form, runtime/model display, browser controls | `RunConfigPanel` for mode; forms for UI mutation surfaces | Localization; missing/null metadata display; workspace path resolution |
| DS-HRC-UX-002 | When no existing run is selected, the same forms continue to edit launch configuration and write through existing store update paths. | Launch config mode, agent/team form, store update handlers, launch button | Agent/team config forms and launch stores | Launch readiness; workspace loading state |
| DS-HRC-UX-003 | Runtime/model fields receive a read-only flag and render persisted values without emitting normalization writes. Advanced config is initially expanded or readily inspectable in historical mode. | Runtime/model field wrapper, model section, advanced config | `RuntimeModelConfigFields` and model display components | Runtime model catalog loading; missing value label |

## Spine Actors / Main-Line Nodes

- Workspace run selection state.
- `RunConfigPanel` selection/launch mode boundary.
- `AgentRunConfigForm` / `TeamRunConfigForm` form boundary.
- `MemberOverrideItem` for team-member override rows.
- `RuntimeModelConfigFields` runtime/model update boundary.
- `ModelConfigSection` / `ModelConfigAdvanced` persisted advanced config display.
- Browser controls.

## Ownership Map

- Workspace run selection state owns which run/team/member is selected.
- `RunConfigPanel` owns the invariant: selected existing run config is displayed for inspection, not editing.
- `AgentRunConfigForm` owns single-agent config controls and must prevent read-only interactions from mutating config.
- `TeamRunConfigForm` owns team-global controls, member override propagation, and must prevent read-only interactions from mutating config.
- `MemberOverrideItem` owns per-member override controls and must respect disabled/read-only display state.
- `RuntimeModelConfigFields` owns runtime/model update emissions and must not emit or normalize into config while read-only.
- `ModelConfigSection` / `ModelConfigAdvanced` own visibility and disabled display of model-thinking fields.
- Backend history/resume owns data presence; frontend does not recover or materialize missing values.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `RuntimeModelConfigFields` as a shared UI wrapper | Form owner for editability; model display components for visual state | Shares runtime/model UI across agent/team screens | Backend runtime semantics, historical recovery, persistence |
| `WorkspaceSelector` as nested selector control | Agent/team form for disabled state; workspace store for workspace lifecycle | Reuses workspace pick/load UI | Historical-run edit/save semantics |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Editable-looking historical run controls | Historical config has no save/apply semantics and should not accept user edits | `RunConfigPanel` read-only propagation plus form-level guards | In This Change | Controls become disabled and handlers no-op while selected run mode is active |
| Hidden/collapsed advanced thinking values in read-only historical mode | Users need to inspect persisted model-thinking settings | `advancedInitiallyExpanded`/read-only display behavior in model config components | In This Change | Does not change backend data |
| Backend recovery/materialization in this ticket | Belongs to separate root-cause ticket | Out-of-scope split | Follow-up | Explicitly excluded from this frontend ticket |

## Return Or Event Spine(s) (If Applicable)

No external event spine is introduced. Existing form update events remain only for new-run configuration mode. In read-only mode, update handlers return without mutating config or emitting workspace changes.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `RuntimeModelConfigFields`.
  - Chain: `incoming runtime/model props -> runtime/provider catalog state -> selected model/config UI -> update emit guard`.
  - Why it matters: read-only mode must stop both user-triggered updates and implicit normalization/default emissions.

- Parent owner: `TeamRunConfigForm`.
  - Chain: `team definition -> resolved leaf members -> member override rows -> member read-only model config display`.
  - Why it matters: team historical config includes both global and member-level model-thinking values.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization strings | DS-HRC-UX-001, DS-HRC-UX-003 | Agent/team forms and model display | Read-only notice and optional not-recorded label | User-facing strings must be localized | Hard-coded literals would violate localization boundary |
| Missing/null historical display label | DS-HRC-UX-003 | Model config display | Display explicit not-recorded state when backend config is null | Avoids blank-looking controls without inventing values | Could be mistaken for backend inference if placed in data layer |
| Runtime model catalog loading | DS-HRC-UX-002, DS-HRC-UX-003 | Team form/runtime model fields | Continue loading available models for displays/editing | Existing UI dependency | Putting catalog policy in read-only mode decision would blur responsibilities |
| Workspace path resolution | DS-HRC-UX-001 | `RunConfigPanel` | Show existing run workspace path without enabling edits | Historical config still needs context | Workspace lifecycle changes must not occur from selected historical config |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Historical config panel mode | `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | Extend | Already owns selecting the effective agent/team config and launch button visibility | N/A |
| Agent/team config forms | Existing workspace config form components | Extend | Existing forms own the controls that must be disabled/guarded | N/A |
| Runtime/model display | Existing launch/config runtime-model components | Extend | Existing shared components own model advanced/thinking UI | N/A |
| Localization | Existing localization message files | Extend | User-facing strings already live there | N/A |
| Backend recovery/materialization | Backend run history/runtime subsystems | Defer | Explicitly out of scope for this split ticket | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace config panel frontend | Mode selection, read-only propagation, run button visibility | DS-HRC-UX-001, DS-HRC-UX-002 | `RunConfigPanel` | Extend | Central frontend boundary for existing-vs-new config mode |
| Agent/team config forms | Disabled controls, notices, mutation guards | DS-HRC-UX-001, DS-HRC-UX-002 | `AgentRunConfigForm`, `TeamRunConfigForm` | Extend | No new subsystem needed |
| Runtime/model config UI | Read-only update guard, advanced visibility, persisted reasoning display | DS-HRC-UX-003 | `RuntimeModelConfigFields`, `ModelConfigSection`, `ModelConfigAdvanced` | Extend | Shared UI remains source of display behavior |
| Localization | New read-only and missing-state messages | DS-HRC-UX-001, DS-HRC-UX-003 | Localization message bundles | Extend | Required by localization guard |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `RunConfigPanel.vue` | Workspace config panel frontend | Panel mode boundary | Derive selection mode, pass read-only, block workspace edits in selection mode | It already owns effective config selection | Existing stores/types |
| `AgentRunConfigForm.vue` | Agent config form | Agent form boundary | Disable/guard agent historical controls and show read-only notice | One form owns agent config controls | Existing config type |
| `TeamRunConfigForm.vue` | Team config form | Team form boundary | Disable/guard team global controls and member override propagation | One form owns team config controls | Existing team/member utilities |
| `MemberOverrideItem.vue` | Team member override UI | Member override row | Respect disabled/read-only model config state | One row component owns member override display/edit | Existing override type |
| `RuntimeModelConfigFields.vue` | Runtime/model config UI | Runtime/model update boundary | Block update emissions/normalization in read-only mode | Shared wrapper for runtime/model fields | Existing model config props |
| `ModelConfigSection.vue` | Runtime/model config UI | Model section display | Keep advanced visible and show optional not-recorded state | Existing section owns advanced toggling | Existing config object |
| `ModelConfigAdvanced.vue` | Runtime/model config UI | Advanced config display | Render disabled persisted reasoning value or missing label | Existing advanced display owner | Existing config object |
| Localization files | Localization | Message bundles | Add user-facing read-only/missing labels | Existing generated localization message files are used by current codebase | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| `readOnly` boolean propagation | N/A | Workspace config frontend | Simple prop thread; extraction would add indirection without ownership | Yes | Yes | A global mode singleton or compatibility wrapper |
| Missing historical config display state | N/A | Runtime/model config UI | Small display prop; not enough repeated logic to justify a shared file | Yes | Yes | Backend recovery or inference service |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Existing `AgentRunConfig` / `TeamRunConfig` | Yes | N/A | Low | Do not change data model in this frontend UX ticket |
| `readOnly` component prop | Yes | Yes | Low | Keep as UI mode only; do not overload with config lock semantics |
| `missingHistoricalConfig` component prop | Yes | Yes | Medium | Keep display-only and document no inference/recovery semantics |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | Workspace config panel frontend | Panel mode boundary | Pass `readOnly` to forms for selected existing runs; hide launch button in selection mode; no-op workspace change handlers while selecting historical config | Existing panel owns selection mode and effective config | Existing stores/types |
| `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | Agent config form | Agent form boundary | Apply `isFormReadOnly`, disable controls, guard mutation handlers, show read-only notice, expand model advanced in read-only mode | Existing agent form owns all agent config controls | Existing `AgentRunConfig` |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Team config form | Team form boundary | Apply `isFormReadOnly`, disable controls, guard mutations, show read-only notice, propagate read-only/missing state to members | Existing team form owns team config controls | Existing `TeamRunConfig`, member utilities |
| `autobyteus-web/components/workspace/config/MemberOverrideItem.vue` | Team member override UI | Member override row | Keep member model-thinking display visible and disabled in read-only mode | Existing member row owns member-specific override UI | Existing `MemberConfigOverride` |
| `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` | Runtime/model config UI | Runtime/model update boundary | Add read-only prop and guard update/normalization emissions | Shared runtime/model field owner | Existing config props |
| `autobyteus-web/components/workspace/config/ModelConfigSection.vue` | Runtime/model config UI | Model config section display | Render disabled fields, initially expanded advanced section, optional not-recorded state | Existing section owns the model config display structure | Existing config props |
| `autobyteus-web/components/workspace/config/ModelConfigAdvanced.vue` | Runtime/model config UI | Advanced model config display | Render disabled reasoning effort value or not-recorded label | Existing advanced owner | Existing config props |
| `autobyteus-web/components/workspace/config/__tests__/*.spec.ts` | Frontend tests | Component unit coverage | Verify read-only propagation, disabled controls, visible `xhigh`, no mutation, new-run editability | Existing test placement by component | Vue Test Utils/Vitest |
| `autobyteus-web/localization/messages/en/workspace.generated.ts` | Localization | English messages | Add read-only/not-recorded strings | Existing message bundle | N/A |
| `autobyteus-web/localization/messages/zh-CN/workspace.generated.ts` | Localization | Chinese messages | Add read-only/not-recorded strings | Existing message bundle | N/A |

## Ownership Boundaries

- `RunConfigPanel` is the authoritative frontend owner for existing-vs-new mode. Child forms must not rediscover selection mode through stores.
- Forms are authoritative for their own mutation handlers. Disabled HTML controls are not sufficient; handlers must also guard.
- `RuntimeModelConfigFields` is authoritative for runtime/model update emissions. It must avoid emitting or normalizing config in read-only mode.
- Model display components own display only; they must not decide backend semantics or fabricate missing values.
- Backend run history/runtime services are outside this ticket and must not be imported or modified.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `RunConfigPanel` selection-mode boundary | Effective config selection and read-only propagation | Workspace config tab/render tree | Child forms reading selection stores directly to decide editability | Add/adjust explicit props from panel |
| Agent/team form boundary | Direct config mutations and control disabled state | `RunConfigPanel` | Runtime/model or workspace child mutating historical config without form guard | Add form-level guards and read-only props |
| `RuntimeModelConfigFields` update boundary | Runtime/model/model-config update emits and normalization | Agent/team/member config forms | Parent relying only on disabled attributes while child emits updates | Add child read-only guard |
| Model config display boundary | Advanced/thinking visibility and displayed value | Runtime/model field wrapper | Backend recovery logic inside display components | Add display-only props/labels, not data recovery |

## Dependency Rules

Allowed:

- `RunConfigPanel` may depend on selection/context/config stores to decide effective config and read-only mode.
- Agent/team forms may receive `readOnly` via props and pass disabled/read-only state to nested controls.
- Runtime/model components may receive read-only and missing-state display props.
- Tests may mount components and assert read-only props, disabled controls, visible values, and mutation guards.

Forbidden:

- Frontend components must not import backend recovery/materialization services.
- Child forms must not query global selection stores to bypass the panel's authoritative mode decision.
- Read-only mode must not be implemented only as CSS or disabled attributes without guarding mutation handlers.
- Missing `llmConfig` must not be replaced with inferred `xhigh` or default values in this ticket.
- This ticket must not modify backend run history, metadata stores, runtime adapters, Codex history readers, or resume services.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `RunConfigPanel -> AgentRunConfigForm :read-only` | Agent historical config UI mode | Tell agent form whether config is inspect-only | Boolean UI mode | Derived from `selectedRunId` |
| `RunConfigPanel -> TeamRunConfigForm :read-only` | Team historical config UI mode | Tell team form whether config is inspect-only | Boolean UI mode | Derived from `selectedRunId` |
| `Agent/Team forms -> RuntimeModelConfigFields :read-only` | Runtime/model UI update boundary | Suppress model/runtime update emissions and render disabled fields | Boolean UI mode | Separate from backend config lock |
| `Forms -> ModelConfigSection :advanced-initially-expanded` | Advanced/thinking visibility | Make advanced config inspectable for historical rows | Boolean display hint | Does not mutate config |
| `Forms -> ModelConfigSection :missing-historical-config` | Missing/null metadata display | Show not-recorded value when backend data is null | Boolean display hint | Display-only; no recovery |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs. The design uses explicit agent/team/member props rather than a backend-resolved generic historical-config editor.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `readOnly` prop | Yes | Yes | Low | Keep boolean UI mode |
| `missingHistoricalConfig` prop | Yes | Yes | Medium | Keep display-only; do not infer data |
| Form update handlers | Yes | Yes | Low | Guard with `isFormReadOnly` |
| Runtime/model update emits | Yes | Yes | Low | Guard with `readOnlyComputed` |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Existing run inspect mode | `readOnly` | Yes | Low | Keep UI-focused name |
| Null backend config display | `missingHistoricalConfig` | Yes | Medium | Keep tied to display state, not recovery |
| Form disabled state | `isFormReadOnly` | Yes | Low | Distinguish from config lock where useful |

## Applied Patterns (If Any)

- Explicit prop propagation: `RunConfigPanel` owns the mode decision and passes it down instead of letting descendants rediscover global selection state.
- Guarded UI boundary: disabled controls are paired with handler guards to prevent direct/mounted component mutation paths.
- Display-only missing state: null backend metadata is represented as missing/not recorded without creating a fallback data path.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/config` | Folder | Workspace config frontend | Existing/launch config forms and panel | Existing folder already owns this UI | Backend history/runtime logic |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | File | Panel mode boundary | Read-only mode derivation and form handoff | Existing effective config owner | Backend data recovery |
| `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | File | Agent form boundary | Agent controls/notice/guards | Existing agent form | Team member logic or backend semantics |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | File | Team form boundary | Team controls/notice/guards/member handoff | Existing team form | Backend materialization |
| `autobyteus-web/components/workspace/config/MemberOverrideItem.vue` | File | Member override row | Member read-only display and disabled controls | Existing member row | Global team mode derivation |
| `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` | File | Runtime/model update boundary | Read-only emit guard and display props | Existing shared runtime/model field owner | Historical recovery logic |
| `autobyteus-web/components/workspace/config/ModelConfigSection.vue` | File | Model config section display | Basic/advanced/missing display state | Existing model section | Runtime/backend inference |
| `autobyteus-web/components/workspace/config/ModelConfigAdvanced.vue` | File | Advanced model config display | Reasoning effort disabled value/missing label | Existing advanced display | Data materialization |
| `autobyteus-web/components/workspace/config/__tests__` | Folder | Frontend component tests | Focused component-level validation | Existing test placement | API/E2E environment setup |
| `autobyteus-web/localization/messages` | Folder | Localization | Read-only and missing-state messages | Existing localization boundary | Hard-coded UI literals |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/config` | Main-Line Domain-Control UI | Yes | Low | Existing UI feature folder owns workspace config panels/forms |
| `autobyteus-web/components/launch-config` | Shared UI control | Yes | Medium | Shared runtime/model fields are used by launch and workspace config; guard must stay UI-only |
| `autobyteus-web/localization/messages` | Off-Spine Concern | Yes | Low | Required localization owner |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Read-only mode propagation | `RunConfigPanel(selectedRunId) -> <TeamRunConfigForm readOnly /> -> <RuntimeModelConfigFields readOnly />` | `RuntimeModelConfigFields` imports selection store and decides by itself | Preserves panel as authoritative mode owner |
| Persisted reasoning display | Backend config `{ llmConfig: { reasoning_effort: 'xhigh' } }` renders disabled `xhigh` in advanced display | UI overwrites null with `xhigh` based on runtime defaults | Shows persisted values without backend inference |
| Handler guard | `if (isFormReadOnly.value) return` before config mutation | Relying only on `<select disabled>` | Tests can still call handlers/component emits; guard prevents hidden mutation paths |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep historical controls enabled but with no save button | Existing behavior | Rejected | Disable controls and show read-only notice |
| Add a save button for historical runs | Could make enabled controls meaningful | Rejected for this ticket | Future separate edit/resume config design if needed |
| Recover missing `llmConfig` in frontend from defaults/history | Could fill blank reasoning values | Rejected | Show only backend-provided values; optional not-recorded display for null |
| Backend materialization in same ticket | Could fix missing metadata root cause | Rejected for split | Later backend/root-cause ticket |

## Derived Layering (If Useful)

- UI mode layer: `RunConfigPanel` derives selected existing-vs-new mode.
- UI form layer: agent/team/member forms enforce read-only or editable behavior.
- Shared control layer: runtime/model components render and emit only as allowed by form mode.
- Data/backend layer: unchanged in this ticket.

## Migration / Refactor Sequence

1. Apply frontend-only patch in dedicated branch `codex/historical-run-config-readonly-ux` from latest `origin/personal`.
2. Add read-only prop derivation in `RunConfigPanel` and preserve launch button only for new-run mode.
3. Add form-level disabled state, read-only notices, and handler guards in agent/team forms.
4. Propagate read-only and advanced visibility into runtime/model fields and member override rows.
5. Add model config display behavior for read-only advanced values and optional missing/null not-recorded state.
6. Add/update localization strings.
7. Add focused unit tests for agent/team/read-only/new-run/persisted reasoning scenarios.
8. Run focused tests and localization guards.
9. Do not modify backend paths; backend/root-cause work moves to a separate ticket.

## Key Tradeoffs

- Reusing current forms avoids duplicated historical-only read views, but requires strong read-only prop/handler guards.
- Expanding advanced sections by default in read-only mode prioritizes inspectability over compactness.
- Showing not-recorded for null metadata improves transparency but intentionally does not solve the backend root cause.

## Risks

- A missed child component emit could still mutate local historical config; covered by focused unit tests and explicit guards.
- Some controls may have disabled visual states that look slightly different from ideal read-only text; acceptable for this small UX split.
- Backend null metadata remains unresolved until the later root-cause ticket.

## Guidance For Implementation

- Keep the patch frontend-only. Reject backend source changes in this ticket.
- Preserve new-run editability. Any component update must be tested in both read-only and editable modes.
- Guard code-level update handlers; do not rely only on disabled DOM controls.
- Ensure persisted `llmConfig.reasoning_effort` values display when present, especially `xhigh`.
- Keep localization strings in message files and rerun localization guards.
- Suggested focused checks:
  - `pnpm -C autobyteus-web exec nuxi prepare`
  - `pnpm -C autobyteus-web exec vitest run components/workspace/config/__tests__/RunConfigPanel.spec.ts components/workspace/config/__tests__/AgentRunConfigForm.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts components/workspace/config/__tests__/MemberOverrideItem.spec.ts components/workspace/config/__tests__/ModelConfigSection.spec.ts`
  - `pnpm -C autobyteus-web guard:localization-boundary`
  - `pnpm -C autobyteus-web audit:localization-literals`
