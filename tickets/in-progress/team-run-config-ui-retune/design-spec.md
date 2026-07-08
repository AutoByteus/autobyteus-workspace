# Design Spec

## Current-State Read

`RunConfigPanel.vue` selects `TeamRunConfigForm.vue` when a team run config and team definition are active. `TeamRunConfigForm.vue` currently owns the whole desktop/web Team Configuration composition:

1. Team definition display.
2. Global runtime/model fields through `RuntimeModelConfigFields.vue`.
3. Workspace selection through `WorkspaceSelector.vue`.
4. Team Members Override disclosure + `MemberOverrideTree.vue`.
5. Global `Auto approve tools` bound to `config.autoExecuteTools`.
6. Read-only/locked explanation banners.

The current data boundary is healthy: `TeamRunConfig.autoExecuteTools` is already the team-level source of truth; `MemberConfigOverride.autoExecuteTools` is an optional per-member override; `buildTeamRunMemberConfigRecords(...)` resolves each leaf member's effective approval setting as `override?.autoExecuteTools ?? config.autoExecuteTools`. No backend/API/store model change is needed.

The current UI problems are local presentation defects:

- Global `Auto approve tools` appears after Team Members Override, so a long expanded member list can hide it below the fold.
- Team Members Override has local expansion state but uses an unreliable `i-heroicons-chevron-right-20-solid` CSS icon class and lacks accessible disclosure attributes; user screenshots show no visible chevron.
- `overridesExpanded` starts as `true`, so many-member teams initially show all override controls.
- `MemberOverrideTree.vue` uses tight `space-y-2`, nested full card borders, and `MemberOverrideItem.vue` gives every member its own full border, creating close repeated lines.
- Member row copy repeats `Override` (`Runtime Override`, `LLM Model Override`) and verbose inherited placeholders even though the parent section already establishes override context.

The target design must preserve all edit/read-only semantics while retuning layout, disclosure, borders, and copy.

## Intended Change

Retune the Team Configuration UI as captured in the approved text wireframes at:

`/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-config-ui-retune/tickets/in-progress/team-run-config-ui-retune/team-run-config-ui-text-wireframes.md`

The target behavior:

1. Move team-level `Auto approve tools` directly under Workspace and before Team Members Override.
2. Make Team Members Override default collapsed.
3. Render Team Members Override as an accessible disclosure header with a visible inline SVG chevron matching the right-side Team tab pattern.
4. Show an explicit override count in the header when any member has meaningful overrides.
5. Render expanded member rows as one connected list with a single outer border and shared separators between siblings.
6. Shorten member-row copy (`Runtime`, `LLM Model`, `Global default`, `Auto approve`) while preserving the existing translation keys or adding localized replacements as needed.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UX Cleanup
- Current design issue found (`Yes`/`No`/`Unclear`): No broad architecture issue found
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No broad refactor; local presentation cleanup only
- Evidence: Existing team config data ownership and propagation are correct. `TeamRunConfigForm.vue` is the correct UI composition owner. The right-side Team tab demonstrates a native button + inline SVG + `aria-expanded` disclosure pattern. The problematic areas are local ordering, icon rendering, default expansion state, repeated borders, and verbose copy.
- Design response: Modify the existing form and child presentation components in place. Do not introduce new config state, backend aliases, compatibility wrappers, or a separate approval owner.
- Refactor rationale: A larger refactor would be unnecessary. The current boundaries remain healthy for this scope; the required changes are local component composition/styling/copy updates.
- Intentional deferrals and residual risk, if any: Visual polish is partially subjective; implementation should use browser/screenshot review in addition to component tests to confirm the connected-list styling actually reduces perceived density.

Rules:
- `No refactor needed` is valid because the existing owner, boundary, API shape, file placement, and changed data structures remain healthy for this scope.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove/decommission only obsolete UI presentation pieces in this scope:
  - the unreliable Team Members Override `i-heroicons-chevron-right-20-solid` icon-class usage,
  - the old default-expanded member override section behavior,
  - repeated member-row full border styling that causes adjacent double-border noise,
  - user-facing legacy wording `Auto-execute` in the member override row if the implementation updates that row copy.
- No runtime/backend compatibility path is involved.
- Decision rule: do not add alternate old/new layout modes or feature flags for the old form order.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-TRC-001 | Primary End-to-End | User opens Team Configuration | Team configuration form renders global settings and collapsed member override disclosure | `TeamRunConfigForm.vue` | Governs first-view discoverability and layout order. |
| DS-TRC-002 | Primary End-to-End | User toggles Team Members Override disclosure | Member override tree becomes visible/hidden without config mutation | `TeamRunConfigForm.vue` | Governs collapsibility, chevron affordance, and accessibility state. |
| DS-TRC-003 | Primary End-to-End | User edits an expanded member override | `config.memberOverrides` updates through existing meaningful-override rules | `MemberOverrideItem.vue` + `TeamRunConfigForm.vue` update handler | Ensures UI retune does not break existing override semantics. |
| DS-TRC-004 | Primary End-to-End | User toggles global Auto approve tools | `config.autoExecuteTools` changes, later inherited by member launch records | `TeamRunConfigForm.vue` | Confirms the moved row keeps the existing global approval state boundary. |
| DS-TRC-005 | Primary End-to-End | User views selected/historical team config | Disabled controls and expandable inspection-only member section render | `RunConfigPanel.vue` + `TeamRunConfigForm.vue` | Preserves read-only selected-run behavior. |

## Primary Execution Spine(s)

- DS-TRC-001: `RunConfigPanel -> TeamRunConfigForm -> Global Fields / Workspace -> Auto Approve Row -> Member Override Disclosure -> Read-only/Locked Banner`
- DS-TRC-002: `Disclosure Header Button -> overridesExpanded state -> Chevron/ARIA state -> MemberOverrideTree visibility`
- DS-TRC-003: `MemberOverrideItem control -> update:override event -> TeamRunConfigForm.handleOverrideUpdate -> TeamRunConfig.memberOverrides`
- DS-TRC-004: `Auto approve switch -> TeamRunConfigForm.updateAutoExecute -> TeamRunConfig.autoExecuteTools -> buildTeamRunMemberConfigRecords`
- DS-TRC-005: `Run history selection -> RunConfigPanel readOnly prop -> TeamRunConfigForm disabled/read-only props -> expandable inspection-only override tree`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-TRC-001 | When a team is selected for configuration, the form renders global team settings first. Workspace is followed by Auto approve tools, then a collapsed override disclosure. | Run config panel, Team config form, global settings, override disclosure | `TeamRunConfigForm.vue` | Localization, visual spacing, read-only banner placement |
| DS-TRC-002 | Clicking the override header changes only local disclosure state and updates the visible chevron/ARIA state. It does not touch config values. | Disclosure header, local state, override panel | `TeamRunConfigForm.vue` | Inline SVG chevron, `aria-expanded`, optional `aria-controls` |
| DS-TRC-003 | Inside the expanded panel, existing member controls continue to emit override updates. The parent applies existing meaningful-override pruning. | Member override item, parent update handler, config record | `MemberOverrideItem.vue` for row behavior; `TeamRunConfigForm.vue` for parent mutation | Concise copy and connected-list styling must stay presentation-only |
| DS-TRC-004 | The moved global auto-approve switch continues to mutate only `config.autoExecuteTools`. Member launch records inherit it unless a per-member override exists. | Auto approve switch, team config, member config builder | `TeamRunConfigForm.vue` + existing config builder | Help text and disabled styling |
| DS-TRC-005 | Read-only selected team configs render the same layout with disabled controls. Override disclosure remains clickable so persisted values can be inspected. | Selected run config, read-only form, override disclosure | `RunConfigPanel.vue` read-only selection; `TeamRunConfigForm.vue` presentation | Missing historical config states |

## Spine Actors / Main-Line Nodes

- `RunConfigPanel.vue`: selects the effective team config and read-only state.
- `TeamRunConfigForm.vue`: owns team form composition, local disclosure state, and global/member update routing.
- `RuntimeModelConfigFields.vue`: owns global runtime/model field presentation and model config section.
- `WorkspaceSelector.vue`: owns workspace selection presentation.
- `MemberOverrideTree.vue`: owns recursive member/nested-team override layout.
- `MemberOverrideItem.vue`: owns leaf member override controls and emits meaningful override changes.
- `buildTeamRunMemberConfigRecords(...)`: downstream launch-record resolver that already applies global/member approval inheritance.

## Ownership Map

- `RunConfigPanel.vue` owns whether the form is new/editable or selected/read-only. It must not own member override layout.
- `TeamRunConfigForm.vue` owns top-level ordering, `overridesExpanded`, disclosure header state, global auto-approve mutation, and parent-side member override mutation. It is the governing owner for this UI retune.
- `MemberOverrideTree.vue` owns the recursive visual grouping of members and nested team groups. It should own connected-list/separator styling.
- `MemberOverrideItem.vue` owns row-level controls, row copy, badges, and event emission. It should not decide whether the whole section is expanded.
- Config stores and builders own data semantics only; this change must not move UI concerns into them.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `RunConfigPanel.vue` team branch | `TeamRunConfigForm.vue` for the form body | Chooses agent vs team config form and passes read-only/workspace state | Team member override layout/copy/styling |
| `RuntimeModelConfigFields.vue` | Existing launch-config/model-config components | Shared runtime/model field presentation | Team-specific approval or override disclosure policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Team Members Override CSS-icon chevron (`i-heroicons-chevron-right-20-solid`) | It is invisible/unreliable in screenshots and not the local working disclosure pattern. | Inline SVG chevron in `TeamRunConfigForm.vue` header | In This Change | Mirror right-side Team tab pattern. |
| Default-expanded override section (`overridesExpanded = ref(true)`) | It makes long member forms visible immediately and pushes global settings down. | `overridesExpanded = ref(false)` | In This Change | Disclosure remains usable in read-only mode. |
| Separate sibling member card borders/gaps | Cause close double-border/line noise. | Connected-list container with shared separators in `MemberOverrideTree.vue` / `MemberOverrideItem.vue` | In This Change | Preserve row padding and badges. |
| Verbose row labels/options | Repeats context and increases text density. | Concise localized copy | In This Change | Keep translation keys if practical; values can change. |

## Return Or Event Spine(s) (If Applicable)

- Member edit return spine: `MemberOverrideItem -> update:override event -> TeamRunConfigForm.handleOverrideUpdate -> config.memberOverrides`.
- Workspace selection return spine remains unchanged: `WorkspaceSelector -> select-existing/workspace-input-change -> TeamRunConfigForm emit -> RunConfigPanel`.

## Bounded Local / Internal Spines (If Applicable)

- `TeamRunConfigForm` disclosure local spine: `Header click/key activation -> toggle overridesExpanded -> update aria/chevron -> show/hide panel`. This spine must not call member override update handlers.
- `MemberOverrideItem` tri-state approval local spine: `checkbox change -> next tri-state value -> buildOverride(...) -> emit update`. The label/copy can change, but the tri-state cycle must remain existing behavior: global default -> on -> off -> global default.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization copy | DS-TRC-001/003 | `TeamRunConfigForm.vue`, `MemberOverrideItem.vue` | Provide concise English/Zh-CN labels/options | Keeps product text centralized and guard-compliant | Hardcoded strings would violate localization boundaries. |
| Visual separators | DS-TRC-001/003 | `MemberOverrideTree.vue` | Make sibling rows share one separator line | Reduces perceived line density | Putting separator policy inside update logic would mix presentation and semantics. |
| Override count summary | DS-TRC-001/002 | `TeamRunConfigForm.vue` | Show count of meaningful member overrides in collapsed header | Avoids hidden override risk | New state would duplicate existing `memberOverrides`; derive only. |
| Accessibility attributes | DS-TRC-002 | `TeamRunConfigForm.vue` | `aria-expanded`, optional `aria-controls`, hidden chevron icon | Makes disclosure understandable to assistive tech | ARIA in child tree would not describe the parent disclosure. |
| Component tests | All | Test suite | Lock ordering/disclosure/read-only/edit behavior | Prevents regression | E2E-only coverage would be too late for local component behavior. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Team form composition | Workspace config components | Extend | Existing `TeamRunConfigForm.vue` already owns the form. | N/A |
| Member override rendering | Workspace config components | Extend | Existing `MemberOverrideTree.vue`/`MemberOverrideItem.vue` own row layout and controls. | N/A |
| Disclosure chevron pattern | Right-side Team tab pattern | Reuse shape | Inline SVG + `aria-expanded` is proven visible and local. | N/A |
| Auto approval state | Existing `TeamRunConfig.autoExecuteTools` | Reuse | Already propagated to member launch records. | N/A |
| Override count | Existing `hasMeaningfulMemberOverride(...)` utility | Reuse | Avoids duplicating meaningful-override rules. | N/A |
| Copy localization | Existing workspace translation catalogs | Extend | Current component text is localized there. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace config UI | Team config form order, disclosure state, global auto approval row | DS-TRC-001/002/004/005 | `TeamRunConfigForm.vue` | Extend | Primary implementation area. |
| Workspace member override UI | Connected list, row copy, row controls | DS-TRC-003 | `MemberOverrideTree.vue`, `MemberOverrideItem.vue` | Extend | Preserve update semantics. |
| Localization runtime/messages | Concise labels/options | DS-TRC-001/003 | Components using `$t` | Extend | Update English and Zh-CN manual catalogs; generated files only if project workflow requires. |
| Frontend component tests | Durable UI behavior checks | All | Vitest | Extend | Focused tests in existing config test files. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `TeamRunConfigForm.vue` | Workspace config UI | Team form composition | Move auto-approve row; implement collapsed disclosure header; derive override count; preserve update handlers | Existing owner for this surface | `hasMeaningfulMemberOverride`, existing props/config |
| `MemberOverrideTree.vue` | Workspace member override UI | Recursive override list | Connected-list wrapper/separators and nested group styling | Existing recursive layout owner | Existing tree data |
| `MemberOverrideItem.vue` | Workspace member override UI | Leaf row controls | Remove standalone full-border card style; concise labels/auto-approval row presentation | Existing row owner | Existing meaningful override helpers |
| `workspace.ts` catalogs | Localization | Product copy | Concise English/Zh-CN copy | Existing manual catalog | Existing keys or added keys |
| `TeamRunConfigForm.spec.ts` | Tests | Component behavior | Ordering, default collapse, disclosure ARIA, read-only expansion, edit semantics | Existing form test suite | Existing mocks |
| `MemberOverrideItem.spec.ts` | Tests | Row copy/tri-state behavior | Concise row text and tri-state cycle if needed | Existing row test suite | Existing mocks |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Meaningful member override count | None new; compute in `TeamRunConfigForm.vue` using `hasMeaningfulMemberOverride(...)` | Workspace config UI | Only needed in one header for now | Yes | Yes | A duplicate override-state store |
| Disclosure header pattern | None new | Workspace config UI | Scope has one new disclosure; right-side Team tab pattern can be copied locally | Yes | Yes | Generic disclosure framework for one use |
| Auto-approve label state | Maybe computed split labels in `MemberOverrideItem.vue` | Workspace member override UI | Row-local tri-state presentation only | Yes | Yes | New config field or alias |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamRunConfig.autoExecuteTools` | Yes | N/A | Low | Reuse unchanged. |
| `MemberConfigOverride.autoExecuteTools` | Yes | N/A | Low | Reuse unchanged. |
| Member override count | Yes, derived count only | Yes | Low | Do not persist. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Workspace config UI | Team config form | Global order, auto-approve row placement, override disclosure state/header/count/accessibility | Existing form composition owner | `hasMeaningfulMemberOverride` |
| `autobyteus-web/components/workspace/config/MemberOverrideTree.vue` | Workspace member override UI | Recursive member override list | Connected-list sibling separators and lighter nested group styling | Existing tree renderer | Existing member tree nodes |
| `autobyteus-web/components/workspace/config/MemberOverrideItem.vue` | Workspace member override UI | Leaf member override row | Row styling, concise labels, auto-approval state copy while keeping event semantics | Existing row owner | Existing helper utilities |
| `autobyteus-web/localization/messages/en/workspace.ts` | Localization | English workspace copy | Concise member-row labels/options and any header badge text | Existing manual catalog | Existing keys preferred |
| `autobyteus-web/localization/messages/zh-CN/workspace.ts` | Localization | Zh-CN workspace copy | Matching concise translated labels/options | Existing manual catalog | Existing keys preferred |
| `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` | Tests | Team form coverage | Ordering/disclosure/default/read-only/edit tests | Existing focused suite | Existing stubs/mocks |
| `autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts` | Tests | Row coverage | Concise auto-approve tri-state/copy tests if not covered through form | Existing focused suite | Existing stubs/mocks |
| `autobyteus-web/docs/agent_teams.md` | Durable docs | Team config docs | Update if final UI/docs sync deems no-impact false | Existing docs owner | N/A |

## Ownership Boundaries

The authoritative boundary for team launch configuration remains `TeamRunConfig` and existing config stores/builders. `TeamRunConfigForm.vue` is a presentation/composition owner, not a data-model owner. `MemberOverrideItem.vue` may change copy/styling and continue emitting existing `update:override` events; it must not mutate the config directly.

`TeamRunConfigForm.vue` may derive display-only header state, such as meaningful override count, from `config.memberOverrides`. It must not store or persist a separate override count.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TeamRunConfigForm.vue` form boundary | Disclosure state, global auto-approve update handler, member override parent mutation | `RunConfigPanel.vue` | `RunConfigPanel.vue` reaching into `MemberOverrideTree` disclosure state | Add/adjust props/events on `TeamRunConfigForm.vue`, not bypass. |
| `MemberOverrideItem.vue` row boundary | Runtime/model/auto-approve controls and `buildOverride(...)` emission | `MemberOverrideTree.vue` / `TeamRunConfigForm.vue` | Parent directly mutating row-local control state | Use existing `update:override` event. |
| `TeamRunConfig.autoExecuteTools` | Global approval value | UI and launch builders | New `autoApproveTools` alias | Reuse existing field and labels only. |

## Dependency Rules

Allowed:

- `RunConfigPanel.vue` may pass props/events to `TeamRunConfigForm.vue` as it does today.
- `TeamRunConfigForm.vue` may import existing helpers from `teamRunConfigUtils` to derive meaningful override count.
- `TeamRunConfigForm.vue` may render inline SVG chevron directly.
- `MemberOverrideTree.vue` may style child rows/groups and pass through props/events.
- `MemberOverrideItem.vue` may use localized concise labels and preserve existing event emissions.

Forbidden:

- Do not add backend/API fields or duplicate approval aliases.
- Do not move disclosure state into stores.
- Do not let read-only/locked disclosure state disable inspection; only controls remain disabled.
- Do not add compatibility modes for old vs new layout.
- Do not hardcode new product copy outside localization catalogs.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `TeamRunConfigForm` props | Team run config form | Render/edit/display one team config | `config: TeamRunConfig`, `teamDefinition: AgentTeamDefinition`, `readOnly?: boolean` | Unchanged. |
| `TeamRunConfigForm.updateAutoExecute(checked)` | Team-level auto approval | Mutate `config.autoExecuteTools` when editable | boolean | Move row only; keep semantics. |
| `TeamRunConfigForm.handleOverrideUpdate(memberRouteKey, override)` | Member override map | Update/delete meaningful member override | canonical member route key | Existing boundary. |
| `MemberOverrideItem update:override` | One leaf member override | Emit row changes | member route key + override/null | Existing boundary. |
| `WorkspaceSelector` events | Workspace selection | Bubble selection/input upward | workspace id / pending input | Unchanged. |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs.
- Split boundaries by subject or require an explicit compound identity shape.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `updateAutoExecute` | Yes | Yes | Low | None. |
| `update:override` | Yes | Yes | Low | Preserve route key. |
| Disclosure header click | Yes | N/A | Low | Keep local, no config side effects. |
| Localization keys | Yes | N/A | Low | Prefer value updates over duplicate keys where existing keys are semantically acceptable. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Team global approval | `Auto approve tools` | Yes | Low | Keep global label. |
| Member row approval | `Auto approve` + `Global default/On/Off` state | Yes | Medium if old `Auto-execute` remains visible | Update visible copy. |
| Member runtime field | `Runtime` | Yes | Low | Remove repeated `Override`. |
| Member model field | `LLM Model` | Yes | Low | Remove repeated `Override`. |
| Override section | `Team Members Override` | Yes | Low | Keep. |

## Applied Patterns (If Any)

- Disclosure pattern: Native button + inline SVG chevron + `aria-expanded` and optional `aria-controls`, matching right-side Team tab style while adding `aria-controls` for stronger association.
- Connected list pattern: One container border with `divide-y`/single separators between rows, replacing independent card borders.
- Derived summary pattern: Meaningful override count derived from existing `memberOverrides` and helper logic; no new state.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | File | Team config form | Ordering, disclosure, override count, global auto approve row | Existing surface owner | Backend launch preparation |
| `autobyteus-web/components/workspace/config/MemberOverrideTree.vue` | File | Recursive override list | Connected-list/nested group layout | Existing tree owner | Config mutation logic beyond forwarding events |
| `autobyteus-web/components/workspace/config/MemberOverrideItem.vue` | File | Leaf override row | Row styling/copy/control semantics | Existing leaf row owner | Section-level expansion state |
| `autobyteus-web/localization/messages/en/workspace.ts` | File | English workspace messages | Concise English labels/options | Existing localized copy owner | Direct component imports |
| `autobyteus-web/localization/messages/zh-CN/workspace.ts` | File | Zh-CN workspace messages | Concise translations | Existing localized copy owner | Direct component imports |
| `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` | File | Focused form tests | Lock new UI behavior | Existing test owner | Browser-only visual assertions |
| `autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts` | File | Focused row tests | Lock concise copy/tri-state if needed | Existing test owner | Form-level ordering tests |
| `autobyteus-web/docs/agent_teams.md` | File | Durable team config docs | Optional docs sync update | Existing docs owner | Implementation-only notes |

Rules:
- Keep layout compact but readable; this scope does not need new folders or modules.
- Existing flat config component folder remains acceptable because the affected files already have clear responsibilities.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/workspace/config/` | UI presentation/form composition | Yes | Low | Existing folder already owns run config UI. No new grouping needed. |
| `localization/messages/*/` | Localization | Yes | Low | Existing catalogs. |
| `components/workspace/config/__tests__/` | Tests | Yes | Low | Existing focused component tests. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Disclosure header | `<button :aria-expanded="overridesExpanded"><svg :class="overridesExpanded ? '' : '-rotate-90'" aria-hidden="true">...</svg> Team Members Override (6)</button>` | Text-only clickable header or invisible `i-heroicons...` span | Makes expandability visible and accessible. |
| Member list borders | `<div class="rounded-md border overflow-hidden divide-y"><MemberRow/><MemberRow/></div>` | `<div class="space-y-2"><div class="border rounded">A</div><div class="border rounded">B</div></div>` | Single shared separator avoids double-border noise. |
| Concise copy | `Runtime` + option `Global default` | `Runtime Override` + option `Use global runtime default` | Parent section already provides context. |
| Auto approval copy | `Auto approve` + state `Global default` | `Auto-execute: Use global` | Aligns copy with global `Auto approve tools` and reduces legacy wording. |
| Hidden override summary | `Team Members Override (6)  2 overridden` | Collapsed header with no clue that overrides exist | Reduces risk of hiding important member-specific settings. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Feature flag to preserve old order | Could avoid changing existing UI abruptly | Rejected | Clean-cut new order: Workspace -> Auto approve -> Override disclosure. |
| Keep old `Auto-execute` wording for member row | Existing translation keys use that name | Rejected for visible copy | Values can change while keys stay if practical. |
| Keep old separate-card styling and only add collapse | Faster minimal change | Rejected | Connected-list separators are part of approved UI direction. |
| Add new `autoApproveTools` config alias | Could match UI wording | Rejected | Existing `autoExecuteTools` remains the data field. |

Hard block:
- Any design that depends on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior fails review.

## Derived Layering (If Useful)

UI layer only:

- `RunConfigPanel.vue` selects the form.
- `TeamRunConfigForm.vue` composes global fields/disclosure and owns local UI state.
- `MemberOverrideTree.vue` / `MemberOverrideItem.vue` render member override content.
- Existing stores/builders remain unchanged data boundaries.

## Migration / Refactor Sequence

1. Update `TeamRunConfigForm.vue`:
   - Move existing auto-approve row to immediately after `WorkspaceSelector`.
   - Set `overridesExpanded` initial state to `false`.
   - Replace current chevron span with inline SVG chevron and add `aria-expanded`, `aria-controls`, stable `data-test` ids.
   - Derive `meaningfulOverrideCount` from `config.memberOverrides` using existing `hasMeaningfulMemberOverride(...)`.
   - Show override count only when > 0.
2. Update `MemberOverrideTree.vue` styling:
   - Replace sibling `space-y-2` card layout with connected-list container / shared separators.
   - Make nested team group styling lighter and avoid close competing full borders.
3. Update `MemberOverrideItem.vue` styling/copy:
   - Remove standalone outer card border when rendered inside connected list.
   - Change visible labels to concise copy.
   - Preserve all existing computed semantics and event emissions.
   - For auto approval, keep tri-state cycle but present concise `Auto approve` + `Global default/On/Off` state.
4. Update localization catalogs for English and Zh-CN.
5. Update focused component tests:
   - New order and default collapsed state.
   - Disclosure ARIA/chevron and expansion/collapse no config mutation.
   - Editable member override path after expansion.
   - Read-only/locked control disabled state and disclosure inspectability.
   - Concise member-row copy if not fully covered by form tests.
6. Run focused frontend tests. If the worktree lacks dependencies, use a dependency-ready workspace or install dependencies per project practice.
7. During delivery docs sync, review `autobyteus-web/docs/agent_teams.md`; update if the inspectability/collapsed behavior needs durable documentation.

## Key Tradeoffs

- `v-show` vs `v-if` for the override panel:
  - Prefer `v-show` for minimal behavior change and state preservation. Hidden rows remain mounted, which preserves existing model-loading side effects and avoids lazy mount surprises.
  - `v-if` is acceptable only if implementation verifies readiness/model-loading and edit-state behavior remain correct.
- Inline SVG vs `@iconify/vue` for chevron:
  - Prefer inline SVG to mirror right-side Team tab and avoid icon package/stub changes.
- Override count:
  - Worth adding because default collapse can hide meaningful per-member differences.
  - Must be derived, not persisted.

## Risks

- Visual density is subjective; browser or screenshot verification is needed beyond unit tests.
- Concise copy must remain clear in both English and Zh-CN.
- Tests currently may assume member override items render immediately; update them to expand the disclosure before asserting row content.
- New worktree currently lacks frontend dependencies (`vitest` not found in probe), so validation must account for environment setup.
- Branch is currently behind `origin/personal` by 3 commits after bootstrap; delivery engineer will refresh against the recorded base before finalization per team workflow.

## Guidance For Implementation

- Do not change `TeamRunConfig`, `MemberConfigOverride`, config stores, backend launch, or `buildTeamRunMemberConfigRecords(...)`.
- Keep global top-level labels explicit (`Default LLM Model (Global)` is good); make only member-row copy concise.
- Add stable selectors such as:
  - `data-test="team-auto-approve-row"`
  - `data-test="team-member-overrides-toggle"`
  - `data-test="team-member-overrides-panel"`
  - `data-test="member-override-list"`
- Mirror right-side Team tab chevron behavior: down chevron when expanded, `-rotate-90` when collapsed.
- Use `aria-expanded` on the disclosure button; include `aria-controls` if a stable panel id is introduced.
- Keep the disclosure usable in read-only/locked mode; disable controls inside only.
- Prefer connected-list styling with one outer border and shared separators for sibling rows.
- Component tests should interact through public DOM/events, not inspect component internals.
