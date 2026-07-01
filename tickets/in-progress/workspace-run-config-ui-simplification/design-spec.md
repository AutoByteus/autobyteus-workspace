# Design Spec

## Current-State Read

This is the third solution-design re-entry for `workspace-run-config-ui-simplification`, triggered by delivery-stage user verification feedback captured at `tickets/in-progress/workspace-run-config-ui-simplification/delivery-user-verification-feedback-3.md`.

Current round-3 implementation state:

- `TeamRunConfigForm.vue` renders the selected team definition, `TeamRunDefaultsSummary`, and `TeamMemberOverridesSummary` inside one outer bordered `Team Definition` card. The user now wants no outer border/card around that group; hierarchy should come from typography, spacing, and child-card indentation.
- `TeamRunConfigForm.vue` renders `TeamRunDefaultsSummary.vue` and then a separate white `team-run-defaults-editor` card. The user wants one unified defaults card whose expanded body contains the editor.
- `TeamRunConfigForm.vue` still places team `Auto approve tools` after `WorkspaceSelector` and before `Skill Access`. Member rows later refer to global auto-execute/auto-approve, so the global team setting should move before member overrides.
- `WorkspaceSelector.vue` is shared by team and agent forms. It renders a full-width equal-width Existing/New segmented control and a green success line such as `Workspace: Temp Workspace`; the selected workspace is already visible in the selector, making the green line redundant.
- `RunConfigPanel.vue` owns the sticky footer and Run button. It currently shows only the button and blocking issue text, not a compact launch summary.
- `MemberOverrideTree.vue` recursively renders groups and leaf `MemberOverrideItem.vue` rows. `MemberOverrideItem.vue` currently renders a full edit form immediately when the member override section is open.
- `MemberOverrideItem.vue` currently exposes member auto approve as an ambiguous tri-state checkbox labeled with `Auto-execute` copy; no field-specific override indicators or reset-all control exist.
- `ModelConfigSection.vue` and `ModelConfigBasic.vue` own Thinking control display. Current logic can show a disabled blue/on switch for fixed/non-disable-capable thinking states, which the user reads as unsupported Thinking being highlighted on.
- Launch readiness (`teamRunLaunchReadiness.ts`) and launch materialization (`buildTeamRunMemberConfigRecords(...)`, temp/backend stores) remain authoritative and must not change.

The target design is a frontend UI rework with one shared display correction for Thinking. It must not change the persisted run config shape, readiness policy, or backend launch payload semantics.

## Intended Change

Refine the team-run configuration UI to the following final shape:

1. Top-level form order: `Team Definition` -> `Workspace Directory` -> `Skill Access` -> sticky launch footer.
2. `Team Definition` is a borderless section title plus selected-team field. Its child cards are slightly indented and use their own backgrounds/borders.
3. `Team run defaults` is one card containing summary/header plus an internal expanded editor area. The expanded area contains runtime/model/config controls and team `Auto approve tools`.
4. `Team member overrides` follows after team defaults and remains section-collapsed by default. When opened, leaf members are one-line rows that can expand independently.
5. `WorkspaceSelector` uses a compact left-aligned segmented control and stops rendering redundant green selected-workspace text.
6. `RunConfigPanel` shows a compact team launch summary above/near `Run Team` with at least members, runtime, and model.
7. Member auto approve becomes `Auto Approve Override` with explicit `Use global` / `Yes` / `No` states and explanatory copy.
8. Expanded member cards show field-level override indicators and a `Reset to default` shortcut.
9. Shared Thinking display no longer highlights unsupported/non-configurable/fixed thinking as active blue/on.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UI Cleanup, plus a local shared display bug correction.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes. The form has residual hierarchy/card-composition drift, member override cards are too heavy, team/member auto approve relationship is unclear, and shared Thinking display can misrepresent non-configurable states.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): File Placement Or Responsibility Drift risk in `TeamRunConfigForm.vue` and `MemberOverrideItem.vue`; Local Implementation Defect for non-configurable Thinking display; No backend launch-domain issue.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, bounded to frontend presentation components and presentation helpers.
- Evidence: User feedback 3 and screenshot show the exact residual UI issues. Current source maps those issues to existing components with clear owners.
- Design response: Keep the main owners, but tighten their responsibilities: form composition in `TeamRunConfigForm.vue`, defaults card shell in `TeamRunDefaultsSummary.vue`, workspace control in `WorkspaceSelector.vue`, launch footer summary in `RunConfigPanel.vue` plus a small display component/helper, leaf member card behavior in `MemberOverrideItem.vue`, and Thinking display in `ModelConfigSection.vue`/`ModelConfigBasic.vue`.
- Refactor rationale: Adding more wrappers and inline logic to `TeamRunConfigForm.vue` would make it a display blob. Extending existing focused components and adding a pure footer summary helper keeps boundaries clear.
- Intentional deferrals and residual risk, if any: A full design-system segmented-control component and broad agent-run footer summary are deferred. This ticket updates only the shared `WorkspaceSelector` segmented control and team footer summary.

## Terminology

- `Team defaults card`: the unified `Team run defaults` card containing summary/header plus expanded body.
- `Expanded defaults body`: internal area inside the team defaults card that contains runtime/model/config controls and team auto approve.
- `Member override section`: the overall `Team member overrides` summary and list disclosure.
- `Member override item`: one leaf agent member row/card inside the member override section.
- `Auto Approve Override`: member-level tri-state override for `MemberConfigOverride.autoExecuteTools`.
- `Non-configurable Thinking`: a Thinking-like schema state that is absent, unsupported, fixed, or not user-toggleable; it must not look like an active user-enabled switch.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Replace obsolete in-ticket UI behavior directly. Do not add flags to keep the outer team border, separate defaults editor card, old workspace tabs, green selected-workspace text, old member auto-execute checkbox, or always-expanded leaf member cards.
- Obsolete in scope:
  - Outer bordered Team Definition group container.
  - Separate run-defaults editor card outside the summary card.
  - Team auto approve as a top-level section below workspace.
  - Full-width equal Existing/New workspace segmented control.
  - Green `Workspace: ...` selected-workspace success line.
  - Member `Auto-execute` checkbox and copy.
  - Always-rendered full member override forms.
  - Missing field-level override indicators/reset in expanded member cards.
  - Disabled blue/on switch for unsupported/non-configurable Thinking.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User opens team run config | Borderless ordered form renders Team Definition, Workspace, Skill Access, footer | `TeamRunConfigForm.vue` | Main information hierarchy change |
| DS-002 | Primary End-to-End | User inspects/edits team defaults | One defaults card displays summary and expanded runtime/model/auto-approve body | `TeamRunDefaultsSummary.vue` + `TeamRunConfigForm.vue` | Merged card and moved auto approve |
| DS-003 | Primary End-to-End | User selects workspace | Compact workspace mode segmented control and no redundant success line | `WorkspaceSelector.vue` | Workspace presentation refinement |
| DS-004 | Primary End-to-End | User reviews before launch | Footer summary displays member count/runtime/model above Run Team | `RunConfigPanel.vue` + presentation helper/component | Reduces scroll-back before launch |
| DS-005 | Primary End-to-End | User opens member overrides | Section opens a list of one-line leaf member summaries | `TeamMemberOverridesSummary.vue` / `MemberOverrideTree.vue` / `MemberOverrideItem.vue` | Avoids large full-card stack |
| DS-006 | Primary End-to-End | User expands one or more member rows | Independent expanded cards show fields, indicators, reset, and tri-state auto approve override | `MemberOverrideItem.vue` | Member override redesign |
| DS-007 | Primary End-to-End | Model config renders Thinking | Unsupported/non-configurable Thinking is absent or disabled neutral instead of highlighted on | `ModelConfigSection.vue` / `ModelConfigBasic.vue` | Shared display correctness |
| DS-008 | Return-Event | User edits defaults/member overrides/workspace | Existing config mutation, readiness, and materialization paths update | Existing form handlers/readiness/builders | Confirms UI rework preserves launch semantics |

## Primary Execution Spine(s)

- `Team selection -> teamRunConfigStore.setTemplate -> RunConfigPanel -> TeamRunConfigForm -> Borderless Team Definition section -> Unified Team Defaults Card -> Runtime/model/team auto approve edits`
- `Team Definition section -> TeamMemberOverridesSummary -> MemberOverrideTree -> MemberOverrideItem collapsed row -> expanded item fields/reset -> memberOverrides update`
- `TeamRunConfig + active TeamDefinition -> team run footer summary presentation -> RunConfigPanel sticky footer -> Run Team`
- `WorkspaceSelector mode/value state -> compact tabs + select/input -> select-existing/workspace-input-change events`
- `Model schema -> ModelConfigSection thinking state -> ModelConfigBasic visual state -> neutral unsupported/non-configurable display`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The form uses section spacing rather than an outer card to make top-level configuration easier to scan. | Team section, workspace section, skill section, footer | `TeamRunConfigForm.vue` | Tailwind spacing/indentation |
| DS-002 | Defaults summary and editor become one card. The summary always remains in the card; the editor and team auto approve appear in the internal expanded body. | Defaults summary, runtime/model editor, team auto approve | `TeamRunDefaultsSummary.vue` shell and `TeamRunConfigForm.vue` body | Slot/body composition, divider |
| DS-003 | Workspace selection keeps the same state/events but presents mode choice as a compact pill and removes redundant selected text. | Mode tabs, existing select, new path input | `WorkspaceSelector.vue` | Shared agent/team scope |
| DS-004 | The sticky footer shows key team launch facts before the irreversible launch action. It does not decide readiness. | Member count, runtime, model, Run Team button | `RunConfigPanel.vue` | Pure presentation derivation |
| DS-005 | Opening member overrides reveals compact leaf rows instead of all full forms. | Override section summary, recursive tree, leaf rows | `MemberOverrideTree.vue` / `MemberOverrideItem.vue` | Nested team grouping, role labels |
| DS-006 | A leaf member row can expand independently, show exactly which fields diverge, and reset all overrides for that member. | Member item expansion, field wrappers, reset, override emit | `MemberOverrideItem.vue` | Tri-state auto approve selector, read-only safety |
| DS-007 | Thinking UI is rendered from shared schema state. Non-configurable/fixed states no longer look actively enabled. | Thinking control state, visual switch, read-only reason | `ModelConfigSection.vue` / `ModelConfigBasic.vue` | Provider-specific adapter semantics |
| DS-008 | Existing event flow remains the return path after edits. | `TeamRunConfig`, readiness result, launch records | Existing form/readiness/builders | Runtime catalogs, model compatibility |

## Spine Actors / Main-Line Nodes

- Team selection surface
- `teamRunConfigStore`
- `RunConfigPanel.vue`
- `TeamRunConfigForm.vue`
- `TeamRunDefaultsSummary.vue`
- `RuntimeModelConfigFields.vue`
- Team auto approve control block inside `TeamRunConfigForm.vue`
- `WorkspaceSelector.vue`
- `TeamMemberOverridesSummary.vue`
- `MemberOverrideTree.vue`
- `MemberOverrideItem.vue`
- `ModelConfigSection.vue` / `ModelConfigBasic.vue`
- `teamRunConfigPresentation.ts` or adjacent presentation helper
- `teamRunLaunchReadiness.ts`
- `buildTeamRunMemberConfigRecords(...)`

## Ownership Map

- `TeamRunConfigForm.vue`: owns top-level team form layout, section order, child-card indentation, disclosure defaults, config update handlers, and placement of team auto approve inside the defaults card body.
- `TeamRunDefaultsSummary.vue`: owns unified defaults card shell, summary display, edit/hide action, and expanded-body slot/divider. It emits toggle only.
- `RuntimeModelConfigFields.vue`: owns runtime/model/config editing and forwards model-config presentation props.
- `WorkspaceSelector.vue`: owns workspace mode segmented control styling, selected-workspace display, helper/error/locked text, and workspace select/input events.
- `RunConfigPanel.vue`: owns sticky launch footer, Run Team button, blocking issue display, and rendering of a team launch summary near the button.
- `teamRunConfigPresentation.ts` or a small adjacent presentation helper: owns pure derivation of footer summary labels/chips, reusing runtime labels and member count inputs.
- `TeamMemberOverridesSummary.vue`: owns overall member override section summary and open/close toggle.
- `MemberOverrideTree.vue`: owns recursive group/list traversal and forwarding member update events.
- `MemberOverrideItem.vue`: owns leaf member row/card expansion, field-level indicators, reset, member auto approve tri-state selector, and per-field override emits.
- `ModelConfigSection.vue`: owns thinking support/state interpretation for UI, advanced disclosure, and passing visual state/reasons to `ModelConfigBasic.vue`.
- `ModelConfigBasic.vue`: owns switch rendering and must support a neutral disabled visual when instructed by `ModelConfigSection.vue`.
- `teamRunLaunchReadiness.ts`: owns launch-blocking policy.
- `buildTeamRunMemberConfigRecords(...)`: owns per-member launch record conversion.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `RunConfigPanel.vue` rendering `TeamRunConfigForm.vue` | `TeamRunConfigForm.vue` | Routes active config type and owns footer/run button | Team form internals or member leaf field mutation |
| `TeamRunDefaultsSummary.vue` with expanded slot | `TeamRunConfigForm.vue` supplies body; summary component owns card shell | Allows one card without moving editor mutation into summary | Runtime/model mutation or auto approve mutation logic |
| `WorkspaceSelector.vue` | Workspace store/form callers | Shared workspace UI | Run readiness or workspace creation finalization beyond existing events |
| `MemberOverrideTree.vue` | `MemberOverrideItem.vue` for leaf UI | Recursive list wrapper | Leaf expansion state or field-level override UI |
| `ModelConfigBasic.vue` | `ModelConfigSection.vue` | Switch renderer | Provider thinking semantics |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Outer bordered Team Definition group | User requested spacing/typography hierarchy | Borderless section in `TeamRunConfigForm.vue` with indented child cards | In This Change | Keep data-test if useful, but no border/card styling |
| Separate defaults editor card | User requested merged summary/editor | Expanded slot/body inside `TeamRunDefaultsSummary.vue` | In This Change | Summary remains when collapsed |
| Auto approve below workspace | Team auto approve is a team default and member override parent | Team auto approve block inside defaults card before member overrides | In This Change | Remove old top-level block |
| Full-width workspace tabs | User requested content-width pill | Restyled mode toggle in `WorkspaceSelector.vue` | In This Change | Shared for agent/team |
| Green workspace success line | Redundant with selected value | Remove success message render branch in `WorkspaceSelector.vue` | In This Change | Keep error/locked/help |
| Member auto-execute checkbox/copy | Ambiguous override UI | `Auto Approve Override` three-state selector in `MemberOverrideItem.vue` | In This Change | Stored shape unchanged |
| Always-full member edit cards | Too much visual noise | Independent collapsed rows with expanded body in `MemberOverrideItem.vue` | In This Change | Multiple expansions allowed |
| Missing reset-all shortcut | User requested reset | `Reset to default` button emits null override | In This Change | Disabled/read-only safe |
| Disabled blue/on unsupported thinking | Misleading visual state | Neutral disabled display controlled by `ModelConfigSection.vue`/`ModelConfigBasic.vue` | In This Change | Display-only correction |

## Return Or Event Spine(s) (If Applicable)

- `Defaults action click -> TeamRunDefaultsSummary emits toggle -> TeamRunConfigForm toggles runDefaultsExpanded -> expanded slot/body shows/hides`.
- `Team auto approve toggle -> TeamRunConfigForm.updateAutoExecute -> config.autoExecuteTools updates -> member rows using global reflect inherited state`.
- `Workspace mode/value change -> WorkspaceSelector emits existing/new event -> RunConfigPanel handlers update active config/workspace loading state`.
- `Member item expand click -> MemberOverrideItem local expansion toggles -> no config mutation`.
- `Member field edit -> MemberOverrideItem emits update:override(memberRouteKey, override|null) -> MemberOverrideTree forwards -> TeamRunConfigForm.handleOverrideUpdate updates config.memberOverrides`.
- `Reset to default click -> MemberOverrideItem emits update:override(memberRouteKey, null) -> override entry removed`.
- `Config mutation -> teamRunLaunchReadiness recomputes -> RunConfigPanel footer button/blocking issue updates`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `TeamRunDefaultsSummary.vue`
  - `summary props + expanded -> card header -> optional divider/body slot -> toggle action`.
  - Why it matters: merges summary/editor without making `TeamRunConfigForm.vue` own duplicate card chrome.
- Parent owner: `MemberOverrideItem.vue`
  - `override props -> hasOverride/field override flags -> collapsed row status -> expanded field wrappers/reset -> update event`.
  - Why it matters: keeps leaf-card UI state local and allows multiple independent expansions.
- Parent owner: `ModelConfigSection.vue`
  - `schema + modelConfig -> thinkingControlState -> configurable/visual state -> ModelConfigBasic props`.
  - Why it matters: prevents each caller from interpreting unsupported/fixed Thinking differently.
- Parent owner: `RunConfigPanel.vue`
  - `effectiveTeamConfig + activeTeamDefinition -> presentation helper -> footer summary chips -> Run Team button`.
  - Why it matters: footer summary is near launch action but remains display-only.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Section spacing/indentation | DS-001 | `TeamRunConfigForm.vue` | Visual hierarchy without outer card | User requested cleaner hierarchy | New wrapper components with no ownership |
| Expanded defaults slot | DS-002 | `TeamRunDefaultsSummary.vue` | One card shell around summary/editor | Avoid separate cards | Summary mutating config |
| Team launch footer summary derivation | DS-004 | `RunConfigPanel.vue` | Format member/runtime/model facts | Avoid scroll-back before launch | Duplicating readiness policy in footer |
| Workspace tab styling | DS-003 | `WorkspaceSelector.vue` | Content-width selected/unselected styles | Shared workspace UI | Per-form duplicated workspace toggles |
| Member item local expansion | DS-005, DS-006 | `MemberOverrideItem.vue` | Independent row expansion | Multiple expanded cards | Tree owning leaf state globally |
| Field override flags | DS-006 | `MemberOverrideItem.vue` | Runtime/model/config/auto approve indicator booleans | Show exactly what diverges | Guessing from display strings |
| Auto approve tri-state mapping | DS-006 | `MemberOverrideItem.vue` | Map UI state to existing optional boolean | Clear override semantics | New data shape or backend change |
| Thinking visual state | DS-007 | `ModelConfigSection.vue` | Decide neutral vs active switch state | Shared provider semantics | Caller-specific thinking hacks |
| Localization | All UI spines | UI components | New labels/copy | i18n | Hardcoded strings |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Team form layout | `TeamRunConfigForm.vue` | Extend | Existing composition owner | N/A |
| Defaults unified card | `TeamRunDefaultsSummary.vue` | Extend | Existing card/summary owner | N/A |
| Runtime/model editing | `RuntimeModelConfigFields.vue` | Reuse | Correct editor owner | N/A |
| Workspace tabs/success text | `WorkspaceSelector.vue` | Extend | Exact shared UI owner | N/A |
| Footer launch summary | `RunConfigPanel.vue` + presentation helper/component | Extend/Create small display component/helper | Footer owner needs display-only summary | Existing defaults summary component is form-local, not footer-local |
| Member override list | `MemberOverrideTree.vue` | Reuse | Recursive list owner | N/A |
| Leaf member card redesign | `MemberOverrideItem.vue` | Extend | Leaf field UI owner | N/A |
| Thinking display | `ModelConfigSection.vue` / `ModelConfigBasic.vue` | Extend | Shared thinking UI owner | N/A |
| Readiness/materialization | Existing readiness/builders/stores | Reuse unchanged | Domain behavior unchanged | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace team-run configuration UI | Team section order, defaults card, auto approve placement, member override section | DS-001, DS-002, DS-005, DS-006 | `TeamRunConfigForm.vue` and child components | Extend | Main scope |
| Shared workspace selector UI | Existing/new mode control, workspace selected/error/helper display | DS-003 | `WorkspaceSelector.vue` | Extend | Shared by agent/team |
| Launch footer UI | Run button, blocking issue, team launch summary | DS-004, DS-008 | `RunConfigPanel.vue` | Extend | Team-only summary for now |
| Runtime/model config UI | Thinking and advanced model config controls | DS-002, DS-007 | `RuntimeModelConfigFields.vue`, `ModelConfigSection.vue` | Extend | Display-only correction |
| UI presentation utilities | Defaults/member/footer summary formatting | DS-002, DS-004, DS-005 | Summary components/panel | Extend | Pure/testable |
| Launch readiness/materialization | Blocking and per-member records | DS-008 | Stores/builders | Reuse unchanged | No semantic change |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `TeamRunConfigForm.vue` | Team-run config UI | Form orchestrator | Borderless sections, child indentation, top-level order, team auto approve placement in defaults card body | Existing form owner | Yes |
| `TeamRunDefaultsSummary.vue` | Team-run config UI | Defaults card shell | Summary + expanded slot/body + internal divider | Existing defaults card | Presentation props |
| `WorkspaceSelector.vue` | Shared workspace selector UI | Workspace selector | Compact mode pill and no green success text | Exact owner | Existing store/events |
| `RunConfigPanel.vue` | Launch footer UI | Footer/panel owner | Render team footer summary component before Run Team | Existing footer owner | Presentation helper |
| `TeamRunLaunchSummary.vue` (new, optional but recommended) | Launch footer UI | Display-only footer summary | Render member/runtime/model chips | Keeps `RunConfigPanel.vue` lean | Presentation DTO |
| `teamRunConfigPresentation.ts` | UI presentation utilities | Pure derivation | Build footer summary labels and reuse default/member summary types | Existing helper | Runtime label util |
| `MemberOverrideTree.vue` | Team-run config UI | Recursive list | Pass global auto approve and keep forwarding updates | Existing owner | Existing tree nodes |
| `MemberOverrideItem.vue` | Team-run config UI | Leaf member card | Collapsed row, independent expansion, field indicators, reset, auto approve selector | Exact owner | Team config utils |
| `ModelConfigSection.vue` | Runtime/model config UI | Thinking/schema renderer | Compute configurable/visual Thinking state | Shared owner | Thinking adapter |
| `ModelConfigBasic.vue` | Runtime/model config UI | Switch renderer | Support neutral disabled visual separate from real enabled state | Exact renderer | Props from section |
| Tests/localization/docs | Coverage/docs | Supporting owners | Update expectations/copy/docs | Existing files | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Footer summary facts | `teamRunConfigPresentation.ts` or `teamRunLaunchSummaryPresentation.ts` | UI presentation utilities | `RunConfigPanel` should not format labels inline | Yes | Yes | Readiness policy owner |
| Member field override flags | Keep in `MemberOverrideItem.vue` or small local computed helpers | Team-run config UI | Only leaf card needs flags | Yes | Yes | Generic diff engine |
| Auto approve tri-state mapping | `MemberOverrideItem.vue` local helpers | Team-run config UI | Existing optional boolean shape | Yes | Yes | New persisted enum |
| Thinking visual state | `ModelConfigSection.vue` computed state, optional prop to `ModelConfigBasic.vue` | Runtime/model config UI | Shared across all callers | Yes | Yes | Caller-specific override |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Existing `TeamRunConfig` | Yes | N/A | Low | Keep unchanged |
| Existing `MemberConfigOverride.autoExecuteTools` | Yes | N/A | Low | UI labels change only; undefined/true/false mapping remains |
| Footer summary DTO | Yes if fields are `memberCount`, `runtimeLabel`, `modelLabel/state` | Yes | Low | Keep display-only, no readiness booleans except missing-model style if needed |
| Thinking visual props | Yes if `visualEnabled`/`neutralDisabled` are explicit | Yes | Medium | Keep semantic ownership in `ModelConfigSection.vue` |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Team-run config UI | Team form orchestrator | Final section order, borderless Team Definition section, child indentation, defaults slot body, moved team auto approve | Existing boundary | Yes |
| `autobyteus-web/components/workspace/config/TeamRunDefaultsSummary.vue` | Team-run config UI | Defaults card shell | Unified defaults card summary/action/expanded slot | Focused display/toggle component | Yes |
| `autobyteus-web/components/workspace/config/TeamMemberOverridesSummary.vue` | Team-run config UI | Member override section summary | Keep summary/open toggle; may adjust spacing to fit borderless parent | Existing summary component | Yes |
| `autobyteus-web/components/workspace/config/MemberOverrideTree.vue` | Team-run config UI | Recursive member list | Pass global auto approve to leaf items and forward updates | Existing recursive owner | Yes |
| `autobyteus-web/components/workspace/config/MemberOverrideItem.vue` | Team-run config UI | Leaf member override card | Collapsed row, expansion, field indicators, reset, auto approve selector/info | Exact owner | Yes |
| `autobyteus-web/components/workspace/config/WorkspaceSelector.vue` | Shared workspace selector UI | Workspace selector | Content-width mode pill and no green selected-workspace success text | Existing exact owner | N/A |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | Launch footer UI | Panel/footer owner | Render team footer summary before Run Team | Existing footer owner | Yes |
| `autobyteus-web/components/workspace/config/TeamRunLaunchSummary.vue` | Launch footer UI | Display-only summary | Member/runtime/model compact chips | New focused component prevents footer template bloat | Presentation DTO |
| `autobyteus-web/utils/teamRunConfigPresentation.ts` | UI presentation utilities | Pure derivation | Add team footer summary presentation and keep existing defaults/member summaries | Existing utility | Yes |
| `autobyteus-web/components/workspace/config/ModelConfigSection.vue` | Runtime/model config UI | Thinking/model-config renderer | Compute non-configurable Thinking visual state and preserve advanced behavior | Shared owner | Existing adapter |
| `autobyteus-web/components/workspace/config/ModelConfigBasic.vue` | Runtime/model config UI | Switch renderer | Render neutral disabled switch when requested | Exact renderer | Props from section |
| `autobyteus-web/localization/messages/en/workspace.ts`, `zh-CN/workspace.ts` | Localization | Message catalogs | New labels: Auto Approve Override, Use global/Yes/No, info/reset/status/footer summary | Existing catalogs | N/A |
| Component/unit tests | Tests | Coverage | Verify layout, merged card, workspace styling, footer summary, member cards, reset, Thinking visual | Existing suites + new summary tests if needed | N/A |
| Docs | Docs | Durable docs | Refresh final UI behavior in delivery stage | Existing docs | N/A |

## Ownership Boundaries

`TeamRunConfigForm.vue` remains the authoritative form composition boundary. It decides where team defaults, auto approve, member overrides, workspace, and skill access appear. It does not decide footer summary rendering and does not own leaf member expansion details.

`TeamRunDefaultsSummary.vue` becomes the unified card shell for defaults. It may render a slot/body but must remain display/toggle only: runtime/model and auto approve mutations stay in `TeamRunConfigForm.vue` and `RuntimeModelConfigFields.vue`.

`WorkspaceSelector.vue` owns workspace selection presentation. The form should not wrap or restyle its segmented control externally.

`RunConfigPanel.vue` owns the sticky footer and is the right place for near-button launch facts. It must not duplicate readiness logic; it displays facts and continues to use `teamRunLaunchReadiness.ts` for blocking.

`MemberOverrideItem.vue` owns each leaf member's UI state and field-level indicators because it already owns field controls and override emit construction. `MemberOverrideTree.vue` should not track expansion state for every leaf unless implementation needs a controlled mode later.

`ModelConfigSection.vue` owns Thinking semantics for display. `MemberOverrideItem.vue` must not special-case provider thinking support.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TeamRunConfigForm.vue` | Section order, defaults body composition, team auto approve placement | `RunConfigPanel.vue` | Panel reaching into team form layout | Add explicit form prop/event only if needed |
| `TeamRunDefaultsSummary.vue` | Defaults card chrome/action/body slot | `TeamRunConfigForm.vue` | Form duplicating separate card shells | Add slots/props to summary card |
| `WorkspaceSelector.vue` | Workspace tabs/select/input/helper presentation | Agent/team forms | Forms reimplementing mode tabs | Extend selector props/styles |
| `RunConfigPanel.vue` | Footer/run button/summary region | Workspace config forms | Forms rendering footer summary near Run button | Add footer summary component/helper |
| `MemberOverrideItem.vue` | Leaf expansion, field flags, reset, auto approve selector | `MemberOverrideTree.vue` | Tree managing field UI or reset logic | Add leaf props/events |
| `ModelConfigSection.vue` | Thinking state/display and advanced schema rendering | Runtime/model fields/member item | Callers manually overriding Thinking switch visuals | Add section/basic display props |
| `teamRunLaunchReadiness.ts` | Launch-blocking rules | Stores/panel | Footer summary deciding canLaunch | Extend readiness only for validation-policy changes |

## Dependency Rules

- `TeamRunConfigForm.vue` may depend on summary components, `RuntimeModelConfigFields.vue`, `WorkspaceSelector.vue`, member editor components, and presentation utilities.
- `TeamRunDefaultsSummary.vue` may accept an expanded/body slot and display props. It must not import stores or mutate `TeamRunConfig`.
- `WorkspaceSelector.vue` may use workspace/window stores as it does today. It must not know whether the caller is an agent or a team.
- `RunConfigPanel.vue` may depend on a team footer summary component and pure presentation helper. It must not import member override item internals.
- `MemberOverrideTree.vue` may pass global values to `MemberOverrideItem.vue`; it must not inspect individual field override flags for presentation.
- `MemberOverrideItem.vue` may import `teamRunConfigUtils` helpers to determine meaningful/explicit field overrides.
- `ModelConfigSection.vue` may import thinking/schema utilities and pass display props to `ModelConfigBasic.vue`. It must remain independent of team-run-specific components/stores.
- Launch readiness/materialization code must not import UI presentation helpers.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `TeamRunDefaultsSummary` props/slots | Defaults card | Show summary and host expanded editor body | Presentation DTO fields + `expanded` + slot | New slot/body replaces separate editor card |
| `WorkspaceSelector` props/events | Workspace selection | Existing/new selection and path input | Existing props/events unchanged | Styling/success text only |
| `TeamRunLaunchSummary` props | Footer summary display | Render compact member/runtime/model facts | Presentation DTO | Display-only |
| `buildTeamRunLaunchSummaryPresentation` | Footer summary derivation | Format member count/runtime/model | `TeamRunConfig`, leaf member count | Pure helper |
| `MemberOverrideItem` props/events | Leaf member override | Expand/edit/reset one member override | `memberRouteKey`, `MemberConfigOverride | undefined`, global defaults | Add global auto approve prop and reset emits null |
| `ModelConfigSection` -> `ModelConfigBasic` props | Thinking display | Visual active/neutral/disabled state | Computed booleans/reason | Shared correction |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamRunDefaultsSummary` | Yes | Yes | Low | Slot for expanded body only |
| `WorkspaceSelector` | Yes | Yes | Low | Keep existing event contract |
| `TeamRunLaunchSummary` | Yes | Yes | Low | No launch readiness decisions |
| `MemberOverrideItem` | Yes | Yes | Low | Uses canonical `memberRouteKey` |
| Auto approve selector mapping | Yes | Yes | Low | Undefined/true/false only |
| Thinking display props | Yes | Yes | Medium | Section computes state, Basic renders only |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Member auto approve field | `Auto Approve Override` | Yes | Low | Replace `Auto-execute` copy in member item |
| Member override statuses | `Using team defaults`, `Custom overrides` | Yes | Low | Add localized labels |
| Reset control | `Reset to default` | Yes | Low | Clears one member override |
| Footer summary | `TeamRunLaunchSummary` | Yes | Low | Display-only component/helper |
| Thinking neutral state | `nonConfigurableThinking` / `neutralDisabled` | Yes if explicit | Medium | Avoid vague `unsupported` if state is fixed-on but non-toggleable |

## Applied Patterns (If Any)

- Slot-based card composition: `TeamRunDefaultsSummary.vue` owns card shell while `TeamRunConfigForm.vue` supplies editable body content.
- Local independent expansion state: `MemberOverrideItem.vue` owns its own row expansion; multiple rows can be expanded because there is no shared accordion controller.
- Pure presentation helper: footer summary facts are derived outside `RunConfigPanel.vue` to avoid template and formatting drift.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | File | Team form orchestrator | Final section layout and moved team auto approve | Existing team form | Member leaf expansion logic |
| `autobyteus-web/components/workspace/config/TeamRunDefaultsSummary.vue` | File | Defaults card shell | Summary + expanded slot | Existing defaults summary | Config mutation |
| `autobyteus-web/components/workspace/config/WorkspaceSelector.vue` | File | Workspace selector | Compact segmented control and helper text behavior | Shared selector | Team-specific launch facts |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | File | Config panel/footer | Render team footer summary | Existing footer owner | Summary formatting details if component/helper exists |
| `autobyteus-web/components/workspace/config/TeamRunLaunchSummary.vue` | File | Footer summary display | Chips/labels for members/runtime/model | Same config UI area | Readiness policy |
| `autobyteus-web/components/workspace/config/MemberOverrideTree.vue` | File | Recursive list | Group rendering and prop forwarding | Existing recursive tree | Leaf field presentation |
| `autobyteus-web/components/workspace/config/MemberOverrideItem.vue` | File | Leaf member card | Collapsed row, expansion, reset, field indicators, auto approve selector | Existing leaf editor | Tree traversal |
| `autobyteus-web/components/workspace/config/ModelConfigSection.vue` | File | Model config renderer | Thinking visual-state computation | Existing thinking owner | Team/member-specific conditionals |
| `autobyteus-web/components/workspace/config/ModelConfigBasic.vue` | File | Switch renderer | Neutral disabled visual | Existing switch component | Provider logic |
| `autobyteus-web/utils/teamRunConfigPresentation.ts` | File | Presentation utility | Add footer summary DTO/helper | Existing summary helper | Validation policy |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/workspace/config` | Mixed justified workspace config UI | Yes | Low | Existing folder for config forms/summaries/selectors/footer components |
| `components/launch-config` | Shared launch-config UI | Yes | Low | Runtime/model field wrapper remains shared |
| `utils` | Off-spine presentation/domain utilities | Yes | Low | Presentation helper stays pure and separate from readiness |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Borderless team section | `h3 Team Definition` + team name field + `ml-3` child cards | One large bordered card around all team content | Matches requested hierarchy |
| Merged defaults card | `<TeamRunDefaultsSummary><template #expanded>RuntimeModelConfigFields + AutoApprove</template></TeamRunDefaultsSummary>` | Summary card followed by separate white editor card | Prevents visual fragmentation |
| Auto approve mapping | `Use global -> undefined`, `Yes -> true`, `No -> false` | New string enum in `MemberConfigOverride` | Preserves backend shape |
| Member rows | Collapsed row: name + `Agent`/`Coordinator` + status + chevron; expanded body contains controls | Rendering all full forms immediately after section open | Reduces clutter while preserving access |
| Footer summary | Chips: `7 members`, `Codex App Server`, `gpt-5.5` | Footer recomputes readiness or lists every member | Keeps summary compact/display-only |
| Thinking display | Fixed/non-configurable thinking row disabled neutral with reason | Disabled blue/on switch for unsupported/fixed thinking | Avoids misleading active state |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep outer Team Definition border behind a class toggle | Existing implementation | Rejected | Remove outer card styling directly |
| Keep separate editor card while changing spacing | Less code | Rejected | Merge editor into defaults card body |
| Add a prop to make workspace tabs old/new style per caller | Shared component impact concern | Rejected for now | Update `WorkspaceSelector.vue` shared style |
| Keep green workspace success in read-only only | Could preserve old display | Rejected unless implementation finds hidden selected value issue | Selected value/input displays workspace; errors/locked help remain |
| Keep member checkbox with new labels | Less code | Rejected | Explicit three-state selector |
| Single accordion member expansion | Simpler global state | Rejected | Multiple independent expansions required |
| Patch unsupported Thinking only in member items | Narrower scope | Rejected | Shared `ModelConfigSection` owns Thinking semantics |

## Derived Layering (If Useful)

- Form composition layer: `TeamRunConfigForm.vue` and `RunConfigPanel.vue` decide section/footer placement.
- Display component layer: summary cards, workspace selector, member item, and footer summary render UI and emit events.
- Shared model config layer: `RuntimeModelConfigFields.vue`, `ModelConfigSection.vue`, and `ModelConfigBasic.vue` render runtime/model/thinking controls.
- Domain launch layer: readiness and materialization stay unchanged below UI.

## Migration / Refactor Sequence

1. Update localization catalogs with new member override/status/reset/footer summary labels.
2. Refactor `TeamRunDefaultsSummary.vue` into a unified card shell with an expanded-body slot and internal divider while preserving existing summary props/action events.
3. Update `TeamRunConfigForm.vue`:
   - remove outer bordered Team Definition card styling,
   - apply top-level section spacing and child indentation,
   - render `RuntimeModelConfigFields` and team `Auto approve tools` inside the defaults card expanded slot,
   - remove the old auto approve block below workspace,
   - keep `Team member overrides` after defaults.
4. Update `WorkspaceSelector.vue` segmented control classes and remove the green selected-workspace success render branch while preserving error/locked/guidance behavior.
5. Add footer summary presentation helper and display component, then render team summary in `RunConfigPanel.vue` above `Run Team`.
6. Update `MemberOverrideTree.vue` to pass global auto approve state to leaf items as needed.
7. Refactor `MemberOverrideItem.vue`:
   - add independent collapsed/expanded row state,
   - add role/status summary row,
   - add `Reset to default`,
   - add field-level override indicators,
   - replace auto-execute checkbox with `Auto Approve Override` three-state selector and explanatory copy.
8. Update `ModelConfigSection.vue`/`ModelConfigBasic.vue` so unsupported/non-configurable/fixed Thinking displays neutral disabled rather than highlighted on; keep supported configurable thinking reflecting effective state.
9. Update component/unit tests for layout, merged card, workspace selector, footer summary, member item expansion/reset/auto approve selector, and shared Thinking visual behavior.
10. Delivery stage refreshes durable docs and handoff artifacts after implementation/review/API-E2E gates.

## Key Tradeoffs

- Applying workspace selector style globally changes agent and team forms, but this is the shared owner of the exact control and avoids duplicated style branches.
- Putting team auto approve inside the defaults card makes the inheritance relationship clear, but the summary should include enough state so collapsed defaults still communicate the global setting.
- A new footer summary component/helper adds a small file but prevents `RunConfigPanel.vue` from accumulating formatting and member-count logic.
- Neutral display for fixed/non-configurable Thinking may require updating prior tests that treated fixed reasoning defaults as active/on. The visual change is intentional to avoid misleading users.

## Risks

- Member item redesign is the largest local change and can regress override mutation if the tri-state/reset mapping is not covered thoroughly.
- Recursive nested teams need careful spacing so collapsed leaf rows remain readable inside group containers.
- Footer summary member count must account for nested team leaf members, not only direct children.
- `WorkspaceSelector` read-only/new-path cases must still visibly show the selected path after removing success text.
- Thinking provider semantics differ; tests should cover fixed-on/non-disable-capable, configurable on/off, and unsupported/no-schema cases.

## Guidance For Implementation

- Keep this as a clean-cut replacement of current unfinalized ticket UI; do not preserve old styles or old checkbox behavior behind feature flags.
- Suggested defaults-card shape:
  - `TeamRunDefaultsSummary.vue` root card owns `data-test="team-run-defaults-summary"`.
  - Add internal body wrapper with `data-test="team-run-defaults-editor"` when `expanded` and slot content exists.
  - Use `border-t`/`pt-4` or equivalent internal divider only.
- Suggested member item state:
  - `const isExpanded = ref(false)` by default.
  - Toggle only local item expansion; do not mutate config on expand/collapse.
  - `resetToDefault()` emits `update:override(memberRouteKey, null)` and is disabled/no-op when `disabled`.
- Suggested auto approve selector mapping:
  - UI value `global` -> omit `autoExecuteTools`,
  - UI value `yes` -> `autoExecuteTools: true`,
  - UI value `no` -> `autoExecuteTools: false`.
- Suggested Thinking visual rule:
  - If no thinking support, render no Thinking row.
  - If Thinking is supported and user-configurable, switch visual reflects effective enabled state.
  - If the schema implies fixed/non-toggleable Thinking or an unsupported state is being represented, pass a neutral disabled visual and reason to `ModelConfigBasic` instead of blue/on.
- Footer summary must use display facts only. Continue to disable Run Team and render blocking issues through existing readiness computed values.
