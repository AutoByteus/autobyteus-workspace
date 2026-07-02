# Design Spec

## Current-State Read

This is the sixth solution-design re-entry for `workspace-run-config-ui-simplification`, triggered by delivery-stage user verification feedback captured in `tickets/in-progress/workspace-run-config-ui-simplification/delivery-user-verification-feedback-6.md`.

Current delivery-held state:

- Worktree: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification`.
- Branch: `codex/workspace-run-config-ui-simplification`.
- HEAD: `ff088189392fe0dc1238a8b21e74cf90bfed6ded`, with latest base `origin/personal` at `57185192d4b93840dab1fb7134604b1716a600a8` already integrated by delivery.
- Prior rounds delivered the accepted top-level team-run layout, member override card behavior, flat team defaults, and default-on Thinking for team/agent launch config.

Relevant current code reality:

- `WorkspaceSelector.vue` centers the whole Existing/New mode pill via `flex justify-center`. Feedback 6 asks for the whole control to be left-aligned while each equal-width segment centers its content.
- `RunConfigPanel.vue` owns the sticky footer and renders `TeamRunLaunchSummary.vue` above `Run Team`. It has effective team config, active team definition, workspace state, pending workspace input mode/path, and can hold a ref to `TeamRunConfigForm.vue`.
- `TeamRunLaunchSummary.vue` is display-only and currently shows only member count, runtime, and model. It does not include auto approve, workspace, override tag, separators, or navigation emits.
- `teamRunConfigPresentation.ts` currently builds a launch summary DTO with only member/runtime/model. Its existing member override presentation helper has useful display-name logic but the launch summary needs route keys for navigation.
- `TeamRunConfigForm.vue` owns `overridesExpanded`, member tree construction, and recursive member override rendering. It is the correct owner to expose `focusMemberOverrides(routeKeys)` or equivalent.
- `MemberOverrideTree.vue` owns recursive traversal; `MemberOverrideItem.vue` owns leaf card shell. Leaf cards need route-key focus anchors.
- `MemberOverrideItem.vue` passes `advanced-display-mode="flat"` to member `ModelConfigSection`, but does not pass `default-thinking-on-when-supported`; member effective Claude/Anthropic contexts therefore can initialize Thinking OFF even though shared default-on logic exists.
- `ModelConfigSection.vue` and `llmThinkingConfigAdapter.ts` already own provider-aware default-on behavior when opted in.

The target design is a bounded frontend UI/model-config/navigation rework. It must not change backend launch payload shape, readiness authority, or first-send member materialization semantics.

## Intended Change

1. Left-align Workspace Directory Existing/New segmented control; keep equal segment widths and centered segment content.
2. Extend Run Team summary with auto approve state, workspace state, and an optional orange member-override navigation tag.
3. Add route-key-driven navigation from the override tag to relevant member cards through the TeamRunConfigForm boundary.
4. Opt member override model-config rendering into the same supported-model default-on Thinking behavior used by team/agent launch config.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UI Enhancement with a member model-config default bug fix.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue for footer-to-member navigation; Missing Invariant/Local Implementation Defect for member default-on Thinking opt-in; Local Implementation Defect for segmented-control alignment.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, bounded to presentation DTOs, existing component boundaries, and tests.
- Evidence: Feedback 6 requires navigation from a footer summary tag to nested member cards. Current `TeamRunLaunchSummary.vue` has no route-key data or event; `RunConfigPanel.vue` and `TeamRunConfigForm.vue` have the right parent/form boundary. Current member `ModelConfigSection` omits the already-existing default Thinking prop.
- Design response: Extend the existing presentation helper and summary component; use a parent-to-child form ref/exposed method for navigation; add stable route-key anchors to member cards; pass default Thinking opt-in from `MemberOverrideItem.vue`; fix workspace layout in `WorkspaceSelector.vue`.
- Refactor rationale: Letting `TeamRunLaunchSummary.vue` query DOM or mutate form state would bypass ownership. Duplicating thinking provider logic in member components would bypass the shared adapter boundary.
- Intentional deferrals and residual risk, if any: Broad cross-product summary/navigation abstractions are deferred. This ticket needs only the team footer override tag and member-card navigation.

## Terminology

- `Launch summary strip`: the compact summary above the `Run Team` button.
- `Override tag`: the orange clickable summary item shown only when meaningful member overrides exist.
- `Override target route keys`: stable member route keys for overridden leaf member cards.
- `Member focus bridge`: the public method/event path from `RunConfigPanel.vue` into `TeamRunConfigForm.vue` to expand and focus member cards.
- `Effective member model config`: model/config resolved from member override plus team defaults for the member card.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action:
  - replace centered workspace control with left-aligned wrapper and equal centered segments;
  - replace member/runtime/model-only launch summary with the richer summary;
  - replace non-clickable/no-override-summary behavior with an orange override tag when overrides exist;
  - replace member override Thinking OFF-by-default behavior with default-on opt-in through shared model config;
  - do not add flags retaining old footer summary or old workspace alignment.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User views Workspace Directory | Left-aligned equal-width Existing/New control renders | `WorkspaceSelector.vue` | Corrects layout while preserving selector behavior |
| DS-002 | Primary End-to-End | User reviews Run Team footer | Summary displays member/runtime/model/auto approve/workspace/optional overrides | `RunConfigPanel.vue` + `TeamRunLaunchSummary.vue` | Adds launch context before action |
| DS-003 | Primary End-to-End | User clicks override tag | Member override section opens and relevant card(s) scroll/focus | `RunConfigPanel.vue` -> `TeamRunConfigForm.vue` -> member cards | New footer-to-form navigation behavior |
| DS-004 | Primary End-to-End | User opens member override model config | Thinking initializes ON for supported effective model absent explicit state | `MemberOverrideItem.vue` -> `ModelConfigSection.vue` -> `llmThinkingConfigAdapter.ts` | Fixes member effective model default bug |
| DS-005 | Return/Event | User edits config or runs team | Existing readiness/materialization update paths remain | Existing stores/builders | Regression guard |

## Primary Execution Spine(s)

- Workspace: `Agent/Team form -> WorkspaceSelector -> mode pill -> select/new input events`.
- Summary data: `RunConfigPanel effective team config + active team members + workspace state -> teamRunConfigPresentation -> TeamRunLaunchSummary`.
- Override navigation: `TeamRunLaunchSummary override button -> RunConfigPanel handler -> TeamRunConfigForm exposed focus method -> MemberOverrideTree/Item route-key focus target`.
- Member Thinking: `MemberOverrideItem effective runtime/model/config -> ModelConfigSection defaultThinkingOnWhenSupported -> llmThinkingConfigAdapter -> update:override llmConfig`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Workspace selector keeps its existing state/events but changes only wrapper/button alignment. | Form, selector, mode buttons | `WorkspaceSelector.vue` | Selected/disabled states |
| DS-002 | Footer summary derives compact launch facts and renders them display-only. | Panel, presentation helper, summary component | `RunConfigPanel.vue` / `teamRunConfigPresentation.ts` | Workspace label, override label, localization |
| DS-003 | The summary emits a semantic focus event; panel delegates to team form; form expands overrides and focuses route-key leaf cards. | Summary, panel, team form, member card | `TeamRunConfigForm.vue` for form navigation | nextTick/scroll/focus, route keys |
| DS-004 | Member model config uses the same provider-aware default-on boundary as team/agent defaults. | Member item, model section, thinking adapter | `llmThinkingConfigAdapter.ts` for provider semantics | Explicit off state, read-only no-op |
| DS-005 | Existing return paths after edits remain unchanged. | Config stores, readiness, launch builders | Existing stores/builders | Regression tests |

## Spine Actors / Main-Line Nodes

- `WorkspaceSelector.vue`
- `RunConfigPanel.vue`
- `TeamRunLaunchSummary.vue`
- `teamRunConfigPresentation.ts`
- `TeamRunConfigForm.vue`
- `MemberOverrideTree.vue`
- `MemberOverrideItem.vue`
- `ModelConfigSection.vue`
- `llmThinkingConfigAdapter.ts`
- Existing readiness/materialization utilities

## Ownership Map

- `WorkspaceSelector.vue`: owns mode control layout, equal-width segment buttons, selected/disabled states, and workspace select/input events.
- `RunConfigPanel.vue`: owns footer placement, effective team/workspace context, summary construction inputs, and override-tag event handling.
- `teamRunConfigPresentation.ts`: owns pure launch summary facts: member count, runtime, model, auto approve, workspace, override tag label/route keys.
- `TeamRunLaunchSummary.vue`: owns display of summary items and emits `focus-overrides` with route keys; no config mutation or DOM scrolling.
- `TeamRunConfigForm.vue`: owns member override section expansion and exposed focus/navigation method.
- `MemberOverrideTree.vue` / `MemberOverrideItem.vue`: own route-key leaf card rendering and focus targets.
- `MemberOverrideItem.vue`: owns passing effective member model config props to `ModelConfigSection.vue`.
- `ModelConfigSection.vue` / `llmThinkingConfigAdapter.ts`: own provider-aware Thinking default behavior.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TeamRunLaunchSummary.vue` | `RunConfigPanel.vue` and presentation helper | Visual footer summary | Member form state, DOM scrolling, readiness |
| `TeamRunConfigForm.vue` exposed focus method | `TeamRunConfigForm.vue` | Parent-safe navigation into form-owned member section | Launch summary display or footer state |
| `MemberOverrideTree.vue` | `MemberOverrideItem.vue` | Recursive list wrapper | Leaf card model config/Thinking policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `justify-center` workspace wrapper behavior | User wants left alignment | Left-aligned wrapper in `WorkspaceSelector.vue` | In This Change | Keep centered button content |
| Content-width non-equal segment buttons | User wants equal segments | Equal-width segment classes/grid | In This Change | Keep selected-state contrast |
| Member/runtime/model-only launch summary DTO | User wants richer summary | Extended `TeamRunLaunchSummaryPresentation` | In This Change | Keep existing items |
| Non-clickable/no override tag summary | User wants override navigation | Orange tag event + form focus method | In This Change | No tag when no overrides |
| Member model config without default Thinking opt-in | Incorrect for supported effective models | Prop pass to `ModelConfigSection.vue` | In This Change | Shared adapter remains owner |

## Return Or Event Spine(s) (If Applicable)

- `Override tag click -> TeamRunLaunchSummary emits focus-overrides(routeKeys) -> RunConfigPanel calls team form ref -> TeamRunConfigForm expands override section -> next tick scroll/focus card target`.
- `Member default Thinking applied -> ModelConfigSection emits update:config -> MemberOverrideItem emitOverrideWithConfig -> TeamRunConfigForm handleOverrideUpdate updates member override`.
- `Workspace mode click -> WorkspaceSelector updates mode -> emits workspace-input-change/select-existing as before`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `TeamRunConfigForm.vue`
  - `focusMemberOverrides(routeKeys) -> set overridesExpanded=true -> nextTick -> locate route-key card targets -> scroll/focus first -> optional temporary highlight all`.
  - Why it matters: navigation belongs to form/member section owner, not the footer display component.
- Parent owner: `teamRunConfigPresentation.ts`
  - `leaf members + memberOverrides -> meaningful override entries -> label/routeKeys -> summary DTO`.
  - Why it matters: keeps route-key/data computation pure and testable.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Workspace label derivation | DS-002 | `RunConfigPanel.vue` / presentation helper | Existing vs new workspace label/name | Footer summary context | Readiness duplication |
| Override display-name formatting | DS-002, DS-003 | `teamRunConfigPresentation.ts` | 1/2 names, >2 count, route keys | Consistent labels and navigation targets | DOM query by name |
| Scroll/focus timing | DS-003 | `TeamRunConfigForm.vue` | Expand then focus after render | Reliable navigation | Summary component owning DOM internals |
| Provider-specific Thinking defaults | DS-004 | `llmThinkingConfigAdapter.ts` | Default ON unless explicit state | Shared correctness | Member-specific provider branches |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Workspace mode layout | `WorkspaceSelector.vue` | Modify | Exact owner | N/A |
| Launch summary facts | `teamRunConfigPresentation.ts` | Extend | Existing summary helper | N/A |
| Footer summary UI | `TeamRunLaunchSummary.vue` | Extend | Existing summary component | N/A |
| Override section navigation | `TeamRunConfigForm.vue` | Extend | Owns member section state | N/A |
| Member card focus target | `MemberOverrideItem.vue` | Extend | Owns leaf card root | N/A |
| Member Thinking default | `ModelConfigSection.vue` / adapter | Reuse/propagate | Existing provider-aware behavior | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace config UI | Existing/New layout/events | DS-001 | `WorkspaceSelector.vue` | Modify | Shared agent/team selector |
| Team launch footer UI | Summary display/event | DS-002, DS-003 | `RunConfigPanel.vue` | Extend | Team-only summary |
| Team run presentation utilities | Summary DTO facts | DS-002, DS-003 | Footer and tests | Extend | Pure functions |
| Member override form UI | Section expansion/card focus | DS-003 | `TeamRunConfigForm.vue`, item components | Extend | Route-key navigation |
| Model config schema/thinking UI | Default-on Thinking | DS-004 | `ModelConfigSection.vue`, adapter | Reuse/extend | Shared provider semantics |
| Launch readiness/materialization | Blocking and payload construction | DS-005 | Existing stores/builders | Reuse unchanged | Regression only |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceSelector.vue` | Workspace config UI | Selector owner | Left wrapper, equal centered segment buttons | Exact markup owner | Existing state/events |
| `teamRunConfigPresentation.ts` | Presentation utilities | Pure DTO owner | Add auto approve, workspace, override tag data | Existing summary helper | Member override name logic |
| `TeamRunLaunchSummary.vue` | Footer UI | Display-only component | Render items with separators; emit override focus | Existing summary component | DTO |
| `RunConfigPanel.vue` | Footer/panel owner | Parent coordinator | Build summary inputs; handle focus event via form ref | Existing footer owner | Team form boundary |
| `TeamRunConfigForm.vue` | Team form UI | Member section owner | Expose focus method; expand overrides | Owns `overridesExpanded` | Member route keys |
| `MemberOverrideTree.vue` | Member tree UI | Recursive list owner | Pass route/focus attrs as needed | Existing traversal owner | Leaf items |
| `MemberOverrideItem.vue` | Member leaf UI | Leaf card owner | Stable data attribute/focus target; default Thinking opt-in | Exact leaf owner | ModelConfigSection |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Launch summary override tag data | `teamRunConfigPresentation.ts` | Presentation utilities | Used by display and navigation tests | Yes | Yes | DOM navigation helper |
| Workspace summary state | `teamRunConfigPresentation.ts` or small local builder in `RunConfigPanel.vue` | Presentation utilities / panel | Keeps label consistent | Yes | Yes | Readiness policy |
| Member route-key focus anchors | `MemberOverrideItem.vue` attrs | Member UI | Needed for footer navigation | Yes | Yes | Global registry |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamRunLaunchSummaryPresentation` | Yes after extension | Yes | Medium | Add explicit `autoApprove`, `workspace`, `overrideTag` groups |
| Override tag DTO | Yes | Yes | Low | Include `count`, `label`, `routeKeys`, optional `visibleNames` |
| Workspace summary DTO | Yes | Yes | Medium | Distinguish `mode`, `label`, optional `name`; do not encode readiness |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/config/WorkspaceSelector.vue` | Workspace config UI | Selector presentation/events | Left-aligned equal-width centered mode control | Exact owner | Existing state/events |
| `autobyteus-web/utils/teamRunConfigPresentation.ts` | Presentation utilities | Pure summary DTO | Extended launch summary incl. auto approve/workspace/overrides | Existing utility | Team member tree data |
| `autobyteus-web/components/workspace/config/TeamRunLaunchSummary.vue` | Footer UI | Summary display | Render separator-delimited chips/tag and emit focus event | Existing component | DTO/localization |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | Footer/panel | Summary owner/parent bridge | Build summary, pass event to team form ref | Existing footer owner | Presentation helper |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Team form | Member section owner | Expose focus member overrides method | Owns expansion/tree | Member item anchors |
| `autobyteus-web/components/workspace/config/MemberOverrideTree.vue` | Member tree | Recursive wrapper | Preserve route keys to leaf items | Existing owner | Leaf items |
| `autobyteus-web/components/workspace/config/MemberOverrideItem.vue` | Member leaf | Card/model config owner | Focus anchor and default Thinking prop | Existing leaf owner | ModelConfigSection |
| `autobyteus-web/components/workspace/config/ModelConfigSection.vue` | Model config UI | Schema/default renderer | Existing default-on behavior reused | Existing owner | Adapter |
| `autobyteus-web/utils/llmThinkingConfigAdapter.ts` | Model config utilities | Provider thinking semantics | Existing explicit/default logic reused | Existing owner | Schema helpers |

## Ownership Boundaries

- Footer summary may request navigation, but `TeamRunConfigForm.vue` owns how member override section opens and which card receives focus.
- `TeamRunLaunchSummary.vue` is display-only and emits semantic events.
- Presentation helpers produce labels/data, not DOM behavior.
- Member cards own their route-key focus target and model-config default props.
- Provider-specific Thinking default logic remains behind `ModelConfigSection.vue` / adapter boundary.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TeamRunConfigForm.vue` member navigation method | Override section state and card DOM refs/anchors | `RunConfigPanel.vue` | Footer querying `.member-card` DOM directly | Expose explicit method/event prop |
| `TeamRunLaunchSummary.vue` | Summary chip/tag markup | `RunConfigPanel.vue` | Component mutating team config or scrolling | Emit semantic event |
| `ModelConfigSection.vue` / adapter | Provider thinking defaults | `MemberOverrideItem.vue` | Member item checking Claude/OpenAI keys | Pass existing opt-in prop |
| `WorkspaceSelector.vue` | Mode control layout/events | Agent/team forms | Per-form segmented-control wrappers | Update shared selector |

## Dependency Rules

- `RunConfigPanel.vue` may depend on `TeamRunConfigForm.vue` as a child component ref; it must not depend on member item DOM internals.
- `TeamRunConfigForm.vue` may use route-key selectors/refs inside its rendered subtree; it must preserve route-key identity.
- `TeamRunLaunchSummary.vue` may emit `focus-overrides`, but must not import stores or member components.
- `MemberOverrideItem.vue` may pass `default-thinking-on-when-supported` to `ModelConfigSection.vue`, but must not import thinking adapter helpers directly.
- `WorkspaceSelector.vue` continues to emit the same workspace events.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `TeamRunLaunchSummary` props/events | Launch summary display | Render DTO and emit override focus request | `TeamRunLaunchSummaryPresentation`; `string[]` route keys | Display-only |
| `TeamRunConfigForm.focusMemberOverrides` (name can vary) | Member override navigation | Expand and focus relevant cards | `memberRouteKeys: string[]` | Exposed to parent only |
| `TeamRunLaunchSummaryPresentation` | Summary facts | Auto approve/workspace/override data | Explicit nested fields | Pure DTO |
| `MemberOverrideItem` root attrs | Member card focus target | Stable route-key target | `memberRouteKey` string | `tabindex=-1` or equivalent |
| `ModelConfigSection` prop | Model config default | Default Thinking ON when supported | `defaultThinkingOnWhenSupported` boolean | Existing prop reused |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `focusMemberOverrides(routeKeys)` | Yes | Yes | Low | Use route keys only |
| Override tag DTO | Yes | Yes | Low | Include route keys separately from names |
| Workspace summary DTO | Yes | Yes | Medium | Do not mix with readiness/blocking issue |
| Default Thinking prop | Yes | Yes | Low | Reuse existing prop |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Launch summary strip | `TeamRunLaunchSummary` | Yes | Low | Keep |
| Override tag | `overrideTag` / `memberOverrideTag` | Yes | Low | Prefer explicit member naming |
| Member focus method | `focusMemberOverrides` | Yes | Low | Keep route-key arg |
| Workspace mode toggle | `workspace-mode-toggle` | Yes | Low | Keep data-test |

## Applied Patterns (If Any)

- Facade/event boundary: `TeamRunLaunchSummary.vue` emits semantic events instead of owning navigation.
- Parent-child imperative bridge: `RunConfigPanel.vue` calls an exposed `TeamRunConfigForm.vue` method for local form navigation.
- Adapter reuse: member Thinking default reuses the existing `ModelConfigSection.vue` / `llmThinkingConfigAdapter.ts` provider adapter.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/config/WorkspaceSelector.vue` | File | Workspace selector | Left-aligned equal-width mode control | Exact selector owner | Form-specific policy |
| `autobyteus-web/utils/teamRunConfigPresentation.ts` | File | Presentation utility | Extended launch summary DTO | Existing summary helper | DOM scrolling |
| `autobyteus-web/components/workspace/config/TeamRunLaunchSummary.vue` | File | Summary display | Render extended summary/tag; emit event | Existing footer summary component | Store mutation/navigation internals |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | File | Footer parent | Build summary and route focus event | Existing footer owner | Member card DOM internals |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | File | Team form/member section | Expose member focus method | Owns section state | Footer summary display |
| `autobyteus-web/components/workspace/config/MemberOverrideItem.vue` | File | Member card | Route-key focus target; default Thinking opt-in | Owns leaf card/model config | Provider-specific logic |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/workspace/config` | Mixed justified UI feature folder | Yes | Low | Existing workspace config components remain colocated |
| `utils` | Off-spine presentation/adapters | Yes | Low | Existing presentation and thinking helpers live here |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Override navigation | `Summary emits routeKeys -> RunConfigPanel -> teamForm.focusMemberOverrides(routeKeys)` | `TeamRunLaunchSummary` calls `document.querySelector` for member rows | Preserves ownership |
| Override tag label | `1 override (solution_designer)`, `2 overrides (a, b)`, `4 overrides` | Always list every nested member name | Keeps summary compact |
| Workspace alignment | Left wrapper + equal-width buttons with `items-center justify-center` | Center wrapper with content-width buttons | Matches feedback exactly |
| Member Thinking | `<ModelConfigSection default-thinking-on-when-supported ...>` in member item | Claude-specific branch in member item | Reuses adapter boundary |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep centered workspace control via option | Prior round requested center | Rejected | Left-align shared selector directly per latest feedback |
| Summary tag scrolls by display name | Easy to implement | Rejected | Use route keys to preserve nested identity |
| Summary component owns DOM scrolling | Direct click behavior | Rejected | Emit event and delegate to form owner |
| Member-specific Claude default branch | Fast local fix | Rejected | Pass default Thinking opt-in to shared model section |

## Derived Layering (If Useful)

- Presentation data layer: `teamRunConfigPresentation.ts` derives summary DTOs.
- Footer UI layer: `TeamRunLaunchSummary.vue` renders and emits semantic events.
- Form navigation layer: `RunConfigPanel.vue` bridges to `TeamRunConfigForm.vue`; the form owns member section focus.
- Model config layer: `MemberOverrideItem.vue` passes props; `ModelConfigSection.vue` / adapter own default behavior.

## Migration / Refactor Sequence

1. Update `WorkspaceSelector.vue` wrapper/button classes for left-aligned equal-width centered segments.
2. Extend `TeamRunLaunchSummaryPresentation` and `buildTeamRunLaunchSummaryPresentation(...)` with auto approve, workspace, and member override tag data/route keys.
3. Update `RunConfigPanel.vue` to compute active leaf members once, pass workspace summary inputs, hold a `TeamRunConfigForm` ref, and handle `focus-overrides`.
4. Update `TeamRunLaunchSummary.vue` to render separator-delimited items and orange override tag button.
5. Expose `focusMemberOverrides(routeKeys)` from `TeamRunConfigForm.vue`; expand override section and focus/scroll first relevant target after render.
6. Add route-key focus anchors/data attributes to member leaf card path (`MemberOverrideItem.vue`, optionally passed through tree).
7. Pass `default-thinking-on-when-supported` from `MemberOverrideItem.vue` to member `ModelConfigSection`.
8. Update tests and docs/handoff artifacts.

## Key Tradeoffs

- Parent-child ref for team form navigation is intentionally local and avoids global event buses or direct DOM lookup from the footer component.
- Summary DTO extension keeps rendering simple but grows presentation utility responsibility; this is acceptable because the utility already owns team run summary facts.
- Member default-on Thinking may materialize an explicit member config when needed to represent the visible effective model default; this is preferable to showing an interactive supported switch OFF incorrectly.

## Risks

- Route-key focus may fail if the override section is collapsed and DOM is not ready. Mitigate with `nextTick` and stable data-test/data-route attributes.
- Long workspace or member names may overflow summary. Mitigate with truncation/title while preserving route-key data.
- Applying default-on Thinking in member context must still preserve explicit inherited/member off states. Mitigate with adapter tests and member component tests.

## Guidance For Implementation

- Add/adjust component tests for:
  - left-aligned workspace control and equal-width centered segment content;
  - summary includes member/runtime/model/auto approve/workspace;
  - no override tag with zero overrides;
  - override tag label for one/two/>two overrides;
  - clicking override tag expands/focuses member card by route key;
  - member override Thinking defaults ON for Claude/Anthropic fixture with no explicit state;
  - explicit off and read-only remain no-mutation;
  - prior footer, member, and launch materialization behavior remains intact.
- Keep launch readiness and payload builders unchanged unless tests require fixture-only updates.
