# Design Spec

## Current-State Read

The dedicated phone shell is mounted through `MobileRemoteAccessShell.vue` and delegates the work screen to `MobileWorkShell.vue`. The shell owns the phone task surface and bottom navigation; the domain data and run/file/activity operations remain in stores and lower-level composables.

Current mobile work flow:

`MobileRemoteAccessShell -> MobileWorkShell -> active mobile tab component -> existing domain store/composable -> rendered phone content`

Current relevant owners:

- `MobileWorkShell.vue` owns the phone work header, focused-member bar placement, active task tab dispatch, and the persistent bottom nav (`Chat`, `Runs`, `Files`, `Tools`, `Activity`). The bottom nav is a normal flex child below content, not an overlay, but it is visually tall and active cells fill the full nav height.
- `MobileTeamMemberFocusBar.vue` owns the phone-focused team member presentation. It delegates selected-member display and picker-sheet behavior to `MobileLaunchTargetPicker.vue`, while `useMobileTeamMemberFocusCoordinator.ts` owns the focusable member list and focus action.
- `MobileLaunchTargetPicker.vue` is a generic mobile picker card used both by the focus bar and by new-run setup target/workspace selectors. It currently hardcodes a visible `Change` / `Choose` text button.
- `MobileActivity.vue` adds a mobile-only title/explainer header above `MobileActivityDigest.vue`.
- `MobileActivityDigest.vue` owns Activity digest tabs and currently adds mobile-only `Issue filters` that reveal `Errors` and `Approvals` filters. Desktop `ProgressPanel.vue` / `ActivityFeed.vue` does not expose equivalent issue filters.
- `MobileFiles.vue` owns phone file browse/search/filter/preview and currently renders blue category labels (`Files`, `Current folder`, `Workspace-wide search`) that repeat selected-tab context.
- `MobileRuns.vue` owns phone run list/setup visibility and currently stacks blue `Runs` with the long heading `Active and recent runs`.
- `MobileRunSetup.vue` and `MobileLaunchRuntimeModelCard.vue` own new-run form presentation and currently render helper paragraphs that repeat visible field labels. `RuntimeModelConfigFields.vue` only renders runtime/model help text when callers pass helper props, so shared field code does not need a behavioral change.

The root product issue is not a backend or ownership-boundary defect. The mobile shell has accumulated mobile-only explanatory/categorization text and filters after the prior mobile parity work. These artifacts now violate the user's desired clean phone presentation and desktop-parity rule.

## Intended Change

Make the in-scope mobile work surfaces cleaner and shorter without changing domain behavior:

1. Focused team member row: keep the selected member label, but replace the large visible `Change` / `Choose` button with a compact chevron/dropdown affordance in the focus bar.
2. Activity: remove redundant page header/explainer and remove mobile-only issue filters (`Issue filters`, `Errors`, `Approvals`). Keep tasks/messages/tools primary digest behavior and row-level status/error details.
3. Files: remove redundant blue category labels while keeping workspace/folder identity, search, filters, breadcrumbs, preview, and attachment behavior.
4. Runs/new-run: replace stacked/long headings with concise labels and remove helper copy that repeats field labels. Keep validation/blocking messages.
5. Bottom navigation: keep five primary controls but make the nav a bit shorter and visually quieter, per user clarification, instead of relocating it in this ticket.
6. Update focused mobile tests to assert the new concise UI and removal of obsolete mobile-only controls/copy.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Cleanup
- Current design issue found (`Yes`/`No`/`Unclear`): No broad design issue found
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found, with local cleanup of obsolete mobile-only presentation controls/copy
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No broad refactor needed
- Evidence: Investigation found clear existing mobile owners for each UI surface. The issue filters are mobile-only and desktop parity check found no equivalent control in `ProgressPanel.vue` / `ActivityFeed.vue`. All flagged redundant strings are localized to dedicated mobile presentation files or mobile-passed helper props.
- Design response: Apply local presentation changes in existing mobile owners. Add one explicit compact toggle mode to the generic picker for focused-member usage only. Do not change backend APIs, stores, or desktop layout.
- Refactor rationale: The existing file ownership remains healthy. A split or subsystem refactor would add indirection without improving the cleanup. The only small interface tightening is an opt-in picker display mode because `MobileLaunchTargetPicker` serves multiple picker contexts.
- Intentional deferrals and residual risk, if any: A full rethink of the five-control navigation location is deferred. Residual risk: even a shorter bottom nav may still feel strange to the user; if so, a later dedicated mobile navigation redesign should compare bottom tabs, top segmented controls, and sheet/drawer navigation.

## Terminology

- `Mobile work shell`: the phone-specific work surface in `MobileWorkShell.vue`.
- `Mobile task tab`: one of `chat`, `runs`, `files`, `tools`, `activity`.
- `Focused member picker`: the use of `MobileLaunchTargetPicker.vue` inside `MobileTeamMemberFocusBar.vue` for message target/focused member changes.
- `Issue filters`: the mobile-only `Issue filters` button plus `Errors`/`Approvals` filter choices in `MobileActivityDigest.vue`.
- `Concise mobile copy`: visible copy that identifies the current object/action without explaining obvious form semantics.

## Design Reading Order

Read this design in this order:

1. Mobile task navigation and selected-tab spines.
2. Surface-specific presentation ownership.
3. Local file responsibilities and small picker interface tightening.
4. Removal/decommission plan for obsolete controls/copy.
5. Test and migration sequence.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove in-scope obsolete mobile-only UI controls/copy rather than hiding them behind compatibility branches.
- Obsolete paths in scope:
  - Mobile Activity `Issue filters` / `Errors` / `Approvals` filter controls.
  - Mobile Activity title/explainer header.
  - Mobile Files blue category labels.
  - Mobile Runs stacked blue category label plus long heading.
  - Mobile new-run helper paragraphs that repeat field labels.
  - Focused-member visible text `Change`/`Choose` button in the focus-bar context.
- The design must not retain an option or feature flag to restore old redundant copy.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-MUX-001 | Primary End-to-End | User opens mobile work screen | Active task tab renders clean surface | `MobileWorkShell.vue` | Shows where bottom nav, focus bar, and tab dispatch should be changed. |
| DS-MUX-002 | Primary End-to-End | User changes focused member | Team context and mobile context reflect new focused member | `MobileTeamMemberFocusBar.vue` + `useMobileTeamMemberFocusCoordinator.ts` | Ensures the chevron affordance does not change focus semantics. |
| DS-MUX-003 | Primary End-to-End | User opens Activity tab | Activity digest renders without redundant header/issue filters | `MobileActivity.vue` / `MobileActivityDigest.vue` | Main path for removing mobile-only Activity complexity. |
| DS-MUX-004 | Primary End-to-End | User opens Files tab | File browse/search/filter/preview remains usable without redundant labels | `MobileFiles.vue` | Ensures copy removal does not remove file functionality. |
| DS-MUX-005 | Primary End-to-End | User opens Runs/new-run setup | Runs list/setup uses concise headings and form labels | `MobileRuns.vue` / `MobileRunSetup.vue` | Ensures launch flow remains usable after helper-copy removal. |
| DS-MUX-006 | Bounded Local | User taps compact picker toggle | Picker sheet opens/closes and option selection emits update | `MobileLaunchTargetPicker.vue` | The generic picker needs an opt-in display mode without forking behavior. |
| DS-MUX-007 | Bounded Local | User taps bottom nav control | `activeTab` updates and shell renders matching tab | `MobileWorkShell.vue` / `mobileWorkStore` | Bottom nav is shortened visually while preserving navigation semantics. |

## Primary Execution Spine(s)

- DS-MUX-001: `MobileRemoteAccessShell -> MobileWorkShell -> bottom nav/focus bar -> selected mobile tab component -> domain store/composable -> clean mobile content`
- DS-MUX-002: `Focus bar -> compact MobileLaunchTargetPicker toggle -> picker option -> useMobileTeamMemberFocusCoordinator.focusMember -> team context/mobileWorkStore -> focused member label updates`
- DS-MUX-003: `Bottom nav Activity -> MobileActivity -> MobileActivityDigest -> activity/team/task stores -> digest cards/tool rows`
- DS-MUX-004: `Bottom nav Files -> MobileFiles -> workspace/fileExplorer stores -> file list/search/filter -> MobileFileViewer/attachment state`
- DS-MUX-005: `Bottom nav Runs -> MobileRuns -> MobileRunSetup -> run config stores/runtime model fields -> useMobileRunLaunchCoordinator`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-MUX-001 | The phone shell receives the current context and active tab, renders the focus bar when appropriate, dispatches to the selected tab, and exposes the shorter bottom nav to change tabs. | Mobile shell, task tab, tab component | `MobileWorkShell.vue` | Nav styling, focus bar inclusion, selected-tab accessibility labels |
| DS-MUX-002 | The focused member row presents the current member and a chevron. Tapping it opens the existing picker sheet; selecting a member calls the existing coordinator and updates focus state. | Focus bar, picker, focus coordinator, team context | `MobileTeamMemberFocusBar.vue` for presentation; coordinator for behavior | Compact picker mode, accessible icon label, error display |
| DS-MUX-003 | Activity tab goes directly to digest content without a redundant page header. Users can switch between Tasks/Messages/Tools, but issue-filter-only paths are removed. | Activity shell, digest cards, tool rows | `MobileActivityDigest.vue` | Row status coloring, empty states, choose-work empty context |
| DS-MUX-004 | Files tab shows workspace/folder identity and controls without category banners. Search/filter/breadcrumb/list/preview behavior stays unchanged. | Files surface, workspace identity, folder/list, file viewer | `MobileFiles.vue` | Advanced file filters, breadcrumbs, attachment notices |
| DS-MUX-005 | Runs tab shows concise run list/setup headings. New-run setup relies on selector labels and validation messages instead of instructional paragraphs. | Runs surface, setup form, runtime/model fields, launch coordinator | `MobileRuns.vue` / `MobileRunSetup.vue` | Setup intent, config store sync, readiness/blocking messages |
| DS-MUX-006 | Picker internals keep the same open/search/select flow; only the toggle presentation changes when `toggleVariant="chevron"` (or equivalent) is passed. | Picker toggle, picker sheet, option list | `MobileLaunchTargetPicker.vue` | Accessible label/title, selected/placeholder visual state |
| DS-MUX-007 | Bottom nav remains the tab control, but classes reduce vertical padding/font/icon scale and active state weight. | Bottom nav, tab buttons, active tab state | `MobileWorkShell.vue` | `mobileWorkStore.setActiveTab`, `aria-label`, `aria-current`/selected state |

## Spine Actors / Main-Line Nodes

- `MobileRemoteAccessShell.vue`: entry screen owner; supplies current mobile context and active tab.
- `MobileWorkShell.vue`: mobile work task shell and bottom navigation owner.
- `MobileTeamMemberFocusBar.vue`: focused team member presentation owner.
- `MobileLaunchTargetPicker.vue`: generic picker card/sheet owner.
- `useMobileTeamMemberFocusCoordinator.ts`: focused member behavior owner.
- `MobileActivity.vue` / `MobileActivityDigest.vue`: Activity surface owners.
- `MobileFiles.vue`: Files surface owner.
- `MobileRuns.vue` / `MobileRunSetup.vue` / `MobileLaunchRuntimeModelCard.vue`: Runs/new-run surface owners.
- Existing stores/composables: domain/data owners that must not absorb presentation cleanup.

## Ownership Map

| Owner | Owns | Does Not Own |
| --- | --- | --- |
| `MobileWorkShell.vue` | Which mobile tab is visible, bottom nav rendering/styling, focus bar placement | Run creation, file APIs, activity store data |
| `MobileTeamMemberFocusBar.vue` | Focus bar layout, picker props, error display | Team hydration/focus semantics |
| `MobileLaunchTargetPicker.vue` | Picker card/toggle/sheet/search/option presentation and selected-value emission | Meaning of selected id, focus/run config side effects |
| `useMobileTeamMemberFocusCoordinator.ts` | Focusable member rows and focus update action | Visual control size or icon choice |
| `MobileActivity.vue` | Activity page wrapper | Activity filter policy/details; those are in digest |
| `MobileActivityDigest.vue` | Activity digest section tabs/cards and status counts | Tool invocation storage, desktop Activity behavior |
| `MobileFiles.vue` | Mobile file browse presentation and local filter state | Workspace persistence/file transport |
| `MobileRuns.vue` | Runs list/setup shell and heading | Launch side effects |
| `MobileRunSetup.vue` | Form field arrangement and readiness presentation | Runtime catalog internals, launch coordinator internals |
| `MobileLaunchRuntimeModelCard.vue` | Phone card wrapper around shared runtime/model fields | Shared runtime/model selection implementation |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `MobileActivity.vue` | `MobileActivityDigest.vue` for meaningful Activity digest behavior | Provides tab-level section wrapper | Issue-filter policy, task/message/tool data ownership |
| `MobileLaunchRuntimeModelCard.vue` | `RuntimeModelConfigFields.vue` plus run config stores | Provides mobile card presentation around shared fields | Runtime/model selection internals or backend config policy |
| `MobileRemoteAccessShell.vue` | `MobileWorkShell.vue` for work task navigation | Routes paired phone between Home/Work/Troubleshooting | Tab-specific presentation cleanup |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Visible focus-bar `Change` / `Choose` text button | Too heavy for focused-member card; selected member label already gives context | Compact chevron toggle mode in `MobileLaunchTargetPicker.vue`, passed by `MobileTeamMemberFocusBar.vue` | In This Change | Keep accessible name/title. |
| `MobileActivity.vue` blue `Activity` label | Bottom nav selected state already communicates tab | Direct `MobileActivityDigest` content | In This Change | Remove redundant section header. |
| `MobileActivity.vue` `Task and team updates` heading | Adds vertical space without new information | Digest cards and primary filters | In This Change |  |
| `MobileActivity.vue` right-panel explanatory sentence | Internal implementation explanation, not user task content | No replacement | In This Change |  |
| `MobileActivityDigest.vue` `Issue filters` button | Desktop has no equivalent; adds mobile-only complexity | Normal Tools activity section and row-level statuses | In This Change | Remove related advanced filter state if unused. |
| `Errors` / `Approvals` filter controls | Same as above | Normal tool rows with status labels | In This Change | Keep status labels/colors. |
| `MobileFiles.vue` blue `Files` label | Selected tab already shows Files | Workspace title/path | In This Change | Keep workspace identity. |
| `MobileFiles.vue` blue `Current folder` / `Workspace-wide search` labels | Folder path/search state already provides context | Current folder label and breadcrumb/search placeholder | In This Change | Keep current folder text. |
| `MobileRuns.vue` blue `Runs` label | Selected tab already shows Runs | Concise heading | In This Change |  |
| `Active and recent runs` long heading | Too long; user requested concise `Active runs` | `Active runs` heading | In This Change | Even if list includes recent runs, mobile copy should be concise. |
| `MobileRunSetup.vue` `Start new work` and helper sentence | Repeats visible selector labels | Form selector labels + validation messages | In This Change | Keep `Hide`, mode selector, readiness. |
| `MobileLaunchRuntimeModelCard.vue` helper sentence and passed runtime/model help text | Repeats `Runtime` and `Default team model` / `Model` labels | Field labels in `RuntimeModelConfigFields.vue` | In This Change | Shared component remains capable of help text elsewhere. |
| Tests expecting issue filters/helper copy | Obsolete target behavior | Tests asserting concise UI/removal | In This Change | Update `MobileUxRefinement.spec.ts`. |

## Return Or Event Spine(s) (If Applicable)

- Focus member return/update: `focusMember()` resolves -> `teamContextsStore` focused member updates -> `mobileWorkStore.updateFocusedTeamMember()` updates current context -> `MobileTeamMemberFocusBar` selected label recomputes.
- Run setup validation return: field/store changes -> `blockingIssue` recomputes -> readiness/submit disabled state updates. Removing helper text must not affect this validation return path.
- Activity row status return: `agentActivityStore` activity updates -> `MobileActivityDigest` counts/tools section and `MobileToolActivityList` rows update. Removing issue filters must not suppress activity row updates.

## Bounded Local / Internal Spines (If Applicable)

- `MobileLaunchTargetPicker.vue` picker local spine: `toggle button -> isOpen -> query input -> groupedItems -> option click -> emit update -> close sheet/reset query`.
  - Parent owner: `MobileLaunchTargetPicker.vue`.
  - Why it matters: compact focus toggle changes only the first node (toggle presentation), not search/select behavior.
- `MobileWorkShell.vue` nav local spine: `tab button click -> emit update:activeTab -> mobileWorkStore.setActiveTab -> prop update -> active tab component switch`.
  - Parent owner: `MobileWorkShell.vue`.
  - Why it matters: shorter nav must not change tab state semantics.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Accessibility names for symbolic controls | DS-MUX-002, DS-MUX-007 | Picker/focus bar/nav | Preserve meaning after visible labels shrink | Icon-only visuals need screen-reader labels | Visual cleanup could make controls inaccessible |
| Test updates | All | Implementation/review | Lock target copy/control behavior | Prevent old issue filters/helper copy from returning | Tests may keep obsolete UX alive |
| Desktop parity guard | DS-MUX-003 | Activity design | Ensure mobile does not invent desktop-absent issue filters | User explicitly asked for desktop comparison | Mobile-only complexity may return |
| Row-level status preservation | DS-MUX-003 | Activity digest/tool list | Keep errors/approvals visible in rows even without filter controls | Removing filters must not hide information | Could be misread as removing activity status data |
| Bottom-nav relocation deferral | DS-MUX-001, DS-MUX-007 | Mobile shell | Keep scope bounded to shortening/styling | Avoid larger navigation redesign under cleanup ticket | Scope creep into route/navigation model |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Mobile tab shell | `MobileWorkShell.vue` | Extend | Already owns bottom nav and tab dispatch | N/A |
| Compact picker affordance | `MobileLaunchTargetPicker.vue` | Extend | Same picker sheet/search/select behavior, different toggle presentation | N/A |
| Focus behavior | `useMobileTeamMemberFocusCoordinator.ts` | Reuse unchanged | Existing focus behavior is correct | N/A |
| Activity digest | `MobileActivityDigest.vue` | Extend/remove obsolete state | Already owns filters/cards | N/A |
| File browse presentation | `MobileFiles.vue` | Extend | Already owns visible labels and search/filter UI | N/A |
| Run setup presentation | `MobileRuns.vue`, `MobileRunSetup.vue`, `MobileLaunchRuntimeModelCard.vue` | Extend | Existing owners map exactly to redundant copy | N/A |
| Runtime/model fields | `RuntimeModelConfigFields.vue` | Reuse unchanged | Shared component only renders help text when supplied | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Mobile shell | Work tab layout, bottom nav, focus bar placement | DS-MUX-001, DS-MUX-007 | `MobileWorkShell.vue` | Extend | Shorten/quieten nav classes. |
| Mobile picker | Picker display, sheet, search, option selection | DS-MUX-002, DS-MUX-006 | `MobileLaunchTargetPicker.vue` | Extend | Add opt-in chevron/symbolic toggle variant. |
| Mobile Activity | Activity digest/cards/tool rows | DS-MUX-003 | `MobileActivity.vue`, `MobileActivityDigest.vue` | Extend | Remove redundant header and issue filters. |
| Mobile Files | Workspace/folder browse/search/filter/preview | DS-MUX-004 | `MobileFiles.vue` | Extend | Remove labels, preserve functionality. |
| Mobile Runs | Run list/setup presentation | DS-MUX-005 | `MobileRuns.vue`, `MobileRunSetup.vue` | Extend | Concise headings and form copy. |
| Shared runtime/model fields | Runtime/model selectors | DS-MUX-005 | `RuntimeModelConfigFields.vue` | Reuse | No shared behavior change required. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `MobileWorkShell.vue` | Mobile shell | Work task shell | Bottom nav classes/labels/aria; active tab dispatch | Existing shell owner | `MobileTaskTab` |
| `MobileTeamMemberFocusBar.vue` | Mobile shell/focus | Focus bar presentation | Pass compact picker toggle props; maybe adjust bar padding | Existing focus-bar owner | `MobileWorkContext` |
| `MobileLaunchTargetPicker.vue` | Mobile picker | Generic picker | Add opt-in compact/chevron toggle variant and accessible name | Existing picker owner | Picker item type local |
| `MobileActivity.vue` | Mobile Activity | Activity wrapper | Remove redundant header or reduce to direct digest | Existing tab wrapper | `MobileWorkContext` |
| `MobileActivityDigest.vue` | Mobile Activity | Digest | Remove issue filters and related filter state | Existing digest owner | Activity store data |
| `MobileToolActivityList.vue` | Mobile Activity | Tool rows | Remove or simplify `filter` prop if no longer used | Existing row owner | `ToolInvocationStatus` |
| `MobileFiles.vue` | Mobile Files | Files surface | Remove redundant labels, keep controls | Existing file owner | Workspace/file node types |
| `MobileRuns.vue` | Mobile Runs | Runs surface | Concise heading | Existing runs owner | `MobileWorkContext` |
| `MobileRunSetup.vue` | Mobile Runs | Setup form | Remove helper block/sentences; keep fields/readiness | Existing setup owner | Run config types |
| `MobileLaunchRuntimeModelCard.vue` | Mobile Runs | Runtime/model mobile wrapper | Remove helper paragraph and help props | Existing wrapper owner | Runtime model fields |
| `MobileUxRefinement.spec.ts` | Mobile tests | Regression tests | Update expectations for concise UI | Existing focused test suite | Test fixtures |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Compact picker toggle presentation | None; keep as prop/branch in `MobileLaunchTargetPicker.vue` | Mobile picker | Only one component owns picker toggle markup | Yes | Yes | Separate duplicate picker component |
| Bottom nav style classes | None | Mobile shell | Single nav owner; extraction unnecessary | Yes | Yes | Generic nav policy helper |
| Activity filter model after removal | None | Mobile Activity | Primary filters remain local and simple | Yes | Yes | Reintroduced issue filter abstraction |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `MobileTaskTab` | Yes | N/A | Low | No change. |
| `MobileLaunchPickerItem` local type | Yes | N/A | Low | No change. |
| Proposed picker toggle prop | Yes if named by presentation concern, e.g. `toggleVariant` | Yes | Low | Keep prop specific; avoid multiple booleans like `iconOnly` plus `compact`. |
| Activity filter state | Yes after removal | Yes | Low | Remove `errors`/`approvals` variants unless still needed internally. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/mobile/MobileWorkShell.vue` | Mobile shell | Work shell | Render selected tab and shorter/quieter bottom nav | Existing shell owner | `MobileTaskTab`, `MobileWorkContext` |
| `autobyteus-web/components/mobile/MobileTeamMemberFocusBar.vue` | Mobile focus | Focus bar | Render focused-member picker with compact chevron toggle | Existing focus presentation owner | `MobileWorkContext` |
| `autobyteus-web/components/mobile/MobileLaunchTargetPicker.vue` | Mobile picker | Picker | Generic picker with opt-in chevron toggle variant | Central picker behavior owner | Local item type |
| `autobyteus-web/components/mobile/MobileActivity.vue` | Mobile Activity | Activity tab wrapper | Remove redundant header; render digest directly | Existing wrapper owner | `MobileWorkContext` |
| `autobyteus-web/components/mobile/MobileActivityDigest.vue` | Mobile Activity | Digest | Primary Tasks/Messages/Tools digest without issue filters | Existing digest owner | Store data |
| `autobyteus-web/components/mobile/MobileToolActivityList.vue` | Mobile Activity | Tool rows | Show tool rows/statuses without externally visible issue-filter path | Existing row owner | `ToolInvocationStatus` |
| `autobyteus-web/components/mobile/MobileFiles.vue` | Mobile Files | Files surface | Clean file header/sticky context labels while preserving behavior | Existing files owner | Workspace/file node types |
| `autobyteus-web/components/mobile/MobileRuns.vue` | Mobile Runs | Runs shell | Concise runs/new-run heading | Existing runs owner | `MobileWorkContext` |
| `autobyteus-web/components/mobile/MobileRunSetup.vue` | Mobile Runs | New-run setup | Field-first form without redundant helper paragraph | Existing setup owner | Run config types |
| `autobyteus-web/components/mobile/MobileLaunchRuntimeModelCard.vue` | Mobile Runs | Runtime/model wrapper | Label-only runtime/model card; no redundant helper props | Existing wrapper owner | Shared runtime/model fields |
| `autobyteus-web/components/mobile/__tests__/MobileUxRefinement.spec.ts` | Mobile tests | Regression suite | Assert concise UI/removals | Existing focused tests | Test fixtures |

## Ownership Boundaries

- `MobileWorkShell.vue` is the authoritative boundary for phone task navigation. Tab child components must not restyle or duplicate the five-control nav.
- `MobileLaunchTargetPicker.vue` is the authoritative picker boundary for toggle/sheet/search/option presentation. Focus bar should request a compact variant through a prop, not duplicate picker markup.
- `useMobileTeamMemberFocusCoordinator.ts` remains the authoritative focus behavior boundary. Presentation files must not reimplement team-member focus/hydration.
- `MobileActivityDigest.vue` owns mobile Activity filter/card presentation. It must not depend on desktop `ProgressPanel.vue`, and desktop must not be modified to justify mobile-only filters.
- File/run/runtime domain stores remain authoritative for data and validation. Presentation cleanup must not bypass or duplicate their logic.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `MobileLaunchTargetPicker.vue` | Open state, search query, grouped options, select/close | `MobileTeamMemberFocusBar.vue`, `MobileRunSetup.vue` | Recreating a separate focus-only picker with duplicated search/select logic | Add explicit display variant prop/slot |
| `useMobileTeamMemberFocusCoordinator.ts` | Member row generation, focus action, updating team/mobile stores | `MobileTeamMemberFocusBar.vue` | Focus bar directly mutating team stores | Add coordinator API if needed |
| `MobileWorkShell.vue` | Bottom nav active state rendering and tab dispatch | `MobileRemoteAccessShell.vue` and child tabs | Child tabs adding their own global task nav | Add shell prop/class variant if needed |
| `MobileActivityDigest.vue` | Activity card/filter presentation | `MobileActivity.vue` | Activity wrapper duplicating digest section policy | Change digest API or content directly |
| Run config stores / `RuntimeModelConfigFields.vue` | Runtime/model selector state and schema config | `MobileLaunchRuntimeModelCard.vue`, `MobileRunSetup.vue` | Mobile setup duplicating runtime/model option logic | Pass cleaner props to shared field component |

## Dependency Rules

Allowed:

- Mobile presentation components may depend on mobile types/stores/composables and shared field/row components.
- `MobileTeamMemberFocusBar.vue` may pass display props to `MobileLaunchTargetPicker.vue` and call coordinator methods through existing event handling.
- `MobileLaunchRuntimeModelCard.vue` may pass fewer helper props to `RuntimeModelConfigFields.vue`.
- Tests may mount mobile components and assert absence/presence of visible copy/test ids.

Forbidden:

- Do not import `RightSideTabs`, `ProgressPanel`, or desktop layout shells into mobile components for this cleanup.
- Do not add backend flags or compatibility branches to keep old copy/filters.
- Do not remove or bypass store/composable validation to make copy disappear.
- Do not make all `MobileLaunchTargetPicker` usages icon-only; only focus-bar usage should become compact unless explicitly requested.
- Do not remove row-level activity statuses/errors when removing issue filters.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `MobileLaunchTargetPicker` props | Picker presentation | Configure label/placeholder/items/model value/test id/display variant | `modelValue: string`, `items: { id, label, detail?, group? }[]` | Add one optional display prop, e.g. `toggleVariant?: 'button' | 'chevron'` or `compactToggle?: boolean`. |
| `MobileLaunchTargetPicker` `update:modelValue` event | Picker selection | Emit selected item id | string item id | No change. |
| `useMobileTeamMemberFocusCoordinator.focusMember(memberRouteKey)` | Team focus behavior | Focus/hydrate member and update stores | member route key string | No change. |
| `MobileWorkShell` `update:activeTab` event | Mobile tab navigation | Request active tab change | `MobileTaskTab` | No change. |
| `MobileToolActivityList` props | Tool activity rows | Render all relevant rows | `context: MobileWorkContext | null` | Remove `filter` prop if no longer used; otherwise leave internal-compatible but not externally surfaced. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `MobileLaunchTargetPicker` display prop | Yes | Yes | Low | Use one enum/boolean, not multiple overlapping props. |
| `focusMember(memberRouteKey)` | Yes | Yes | Low | No change. |
| `update:activeTab` | Yes | Yes | Low | No change. |
| `MobileToolActivityList.filter` | Yes currently, but visible filter UI will be removed | Yes | Low | Remove prop if unused after digest cleanup. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Focus bar | `MobileTeamMemberFocusBar` | Yes | Low | No rename. |
| Generic picker | `MobileLaunchTargetPicker` | Mostly yes; used for focus and setup | Medium | Keep for now; prop should not be named in a launch-only way. |
| Activity filters | `Issue filters` | No for target UX | High | Remove. |
| Runs heading | `Active and recent runs` | Too verbose | Medium | Use `Active runs`. |
| New-run heading | `Start new work` | Vague/redundant | Medium | Use concise `New run` / rely on parent heading. |

## Applied Patterns (If Any)

- Opt-in display variant: `MobileLaunchTargetPicker` keeps one behavior owner while allowing a compact toggle presentation for focus bar. This avoids duplicated picker components.
- Local presentation cleanup: redundant copy is removed at the owning mobile surface instead of adding CSS hiding or feature flags.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/mobile/` | Folder | Mobile phone shell | Phone-specific presentation surfaces | Existing mobile owner folder | Desktop shell layout logic |
| `autobyteus-web/components/mobile/MobileWorkShell.vue` | File | Mobile work shell | Shorter/quieter bottom task navigation | Existing tab/nav owner | Domain data loading |
| `autobyteus-web/components/mobile/MobileTeamMemberFocusBar.vue` | File | Focus bar | Compact focus picker usage | Existing focus bar owner | Focus store mutation logic |
| `autobyteus-web/components/mobile/MobileLaunchTargetPicker.vue` | File | Mobile picker | Opt-in chevron toggle variant | Existing picker behavior owner | Team-specific focus behavior |
| `autobyteus-web/components/mobile/MobileActivity.vue` | File | Activity wrapper | Remove redundant page header | Existing Activity tab wrapper | Filter/card policy duplication |
| `autobyteus-web/components/mobile/MobileActivityDigest.vue` | File | Activity digest | Remove issue-filter UI/state; keep primary digest | Existing digest owner | Desktop progress panel imports |
| `autobyteus-web/components/mobile/MobileToolActivityList.vue` | File | Tool row renderer | Render statuses/errors without visible issue filter path | Existing row owner | Filter UI controls |
| `autobyteus-web/components/mobile/MobileFiles.vue` | File | Files surface | Remove category labels, preserve browse/search/filter | Existing files owner | Workspace persistence |
| `autobyteus-web/components/mobile/MobileRuns.vue` | File | Runs surface | Concise heading | Existing runs owner | Launch side effects |
| `autobyteus-web/components/mobile/MobileRunSetup.vue` | File | Setup form | Remove redundant helper paragraph | Existing setup owner | Runtime/model internals |
| `autobyteus-web/components/mobile/MobileLaunchRuntimeModelCard.vue` | File | Runtime/model wrapper | Remove helper text/help props | Existing wrapper owner | Shared field implementation |
| `autobyteus-web/components/mobile/__tests__/MobileUxRefinement.spec.ts` | File | Mobile UX tests | Assert concise UI and removals | Existing focused suite | Obsolete old-copy assertions |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/mobile` | Mobile presentation / shell | Yes | Low | All in-scope changes are phone UI presentation. |
| `components/launch-config` | Shared launch field presentation | Yes | Low | No structural change; mobile passes fewer helper props. |
| `components/progress` | Desktop/right-panel progress/activity | Yes | Low | Read for parity only; do not modify for this task unless a test import requires no-op adjustment. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Focus picker | Selected label `solution_designer` + right-side chevron button with `aria-label="Change message target"` | Large visible `Change` text button inside a tall card | Matches user request while preserving accessibility. |
| Activity filters | `Tasks · 0`, `Messages · 0`, `Tools · 0` only | `Issue filters` -> `Errors`, `Approvals` | Desktop has no issue filters; remove mobile-only complexity. |
| Files context | Workspace title/path, search, then current folder path/breadcrumb | Blue `FILES` plus blue `CURRENT FOLDER` labels | Keeps useful identity while removing categorization banners. |
| Runs heading | `Active runs` and button `Start new`; setup state `New run` | `Runs` + `Active and recent runs` stacked | Reduces vertical/cognitive load. |
| New-run form | Mode buttons, `Agent`/`Team`, `Workspace`, `Runtime`, `Model`, readiness message | `Start new work` + paragraph explaining the selectors | Field labels are sufficient; validation messages remain. |
| Bottom nav | Smaller vertical padding, smaller icon/label scale, subtle active indicator/pill | Tall full-cell active blue background competing with composer | Implements user's “a bit shorter” clarification without navigation redesign. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Feature flag to keep old Issue filters | Could preserve prior mobile parity-ticket behavior | Rejected | Remove issue filter UI/state in scope. |
| CSS-only hiding of redundant headers | Faster visual change | Rejected | Remove markup/copy at owning components. |
| Keep `Change` text and only reduce font size | Minimizes code change | Rejected | User requested symbolic dropdown/chevron; add compact affordance. |
| Move bottom nav to a new top/drawer navigation | Could address user discomfort | Rejected for this ticket | Shorten/quieten nav now; defer full nav redesign. |
| Change desktop Activity to add issue filters for parity | Would make mobile filters “match” desktop | Rejected | User asked to remove mobile-only complexity; desktop should remain unchanged. |

## Derived Layering (If Useful)

- Phone shell layer: `MobileRemoteAccessShell.vue`, `MobileWorkShell.vue`.
- Phone surface layer: `MobileActivity*`, `MobileFiles`, `MobileRuns`, `MobileRunSetup`, `MobileTools` (unchanged except nav context).
- Shared presentation controls: `MobileLaunchTargetPicker`, `RuntimeModelConfigFields`.
- Domain/store layer: existing stores/composables unchanged.

The cleanup stays in the first three layers and must not push presentation policy into the domain/store layer.

## Migration / Refactor Sequence

1. Update `MobileLaunchTargetPicker.vue`:
   - Add an opt-in compact/chevron toggle variant prop.
   - Ensure the symbolic control has a stable accessible label/title.
   - Preserve existing default `Change`/`Choose` button behavior for run setup pickers.
2. Update `MobileTeamMemberFocusBar.vue`:
   - Pass the compact/chevron toggle variant.
   - Reduce focus-bar/card padding only if needed after picker compacting.
3. Update `MobileActivity.vue`:
   - Remove redundant header and render `MobileActivityDigest` as the main content.
4. Update `MobileActivityDigest.vue` and `MobileToolActivityList.vue`:
   - Remove `Issue filters` UI and `Errors`/`Approvals` filter state/control paths.
   - Keep primary Tasks/Messages/Tools switching and tool row statuses.
5. Update `MobileFiles.vue`:
   - Remove blue category labels.
   - Keep workspace title/path, search/filter panel, current folder label, breadcrumb, list, preview.
6. Update `MobileRuns.vue`:
   - Replace stacked label/heading with concise heading (`Active runs` or `New run`).
7. Update `MobileRunSetup.vue` and `MobileLaunchRuntimeModelCard.vue`:
   - Remove redundant helper paragraphs and mobile-passed runtime/model help text.
   - Keep required validation/readiness/error messages.
8. Update `MobileWorkShell.vue` bottom nav classes:
   - Reduce vertical padding/height, icon/label scale, and active-state visual weight.
   - Add/verify accessible selected state/labels.
9. Update tests:
   - `MobileUxRefinement.spec.ts` must assert absence of old issue filters/helper copy and presence/usability of compact controls.
   - Run focused mobile tests.
10. Do a light source search for removed strings (`Issue filters`, `Right-panel information`, `Start new work`, `Active and recent runs`, visible focus `Change` in focus context) and ensure no obsolete test expectations remain.

## Key Tradeoffs

- Keeping bottom nav vs relocating: Keeping it avoids broad navigation redesign and preserves one-handed discoverability. The tradeoff is that visual discomfort may not be fully solved by shortening alone.
- Removing issue filters vs preserving error quick-filter: Removal matches desktop and user cleanliness. The tradeoff is one fewer shortcut for error/approval-only views, but row-level status remains visible.
- Picker prop vs separate focus picker: Prop keeps one picker owner and avoids duplicated sheet/search behavior. The tradeoff is a slightly broader generic picker API.

## Risks

- Compact icon-only controls can become inaccessible if aria/title labels are missed.
- Tests may still assert old helper text from the prior mobile parity ticket; they must be updated deliberately.
- If implementation removes helper text too aggressively, required validation/blocking messages could disappear. Keep validation/error copy.
- If `MobileToolActivityList.filter` is removed, TypeScript/test updates must cover all references.

## Guidance For Implementation

- Treat this as local mobile presentation cleanup. Do not change backend, GraphQL, run creation semantics, file APIs, terminal/VNC behavior, or desktop layout.
- Prefer removing obsolete markup/copy over hiding it with CSS.
- Preserve `data-testid` values where tests depend on functional controls; update tests only where the control is intentionally removed.
- For the chevron, use an existing icon approach in the project if available (`@iconify/vue` is already used elsewhere) or a simple text glyph if consistent. The important requirement is compact visual affordance plus accessible label.
- Suggested focused tests:
  - Focus bar renders compact chevron toggle and does not show visible `Change` button text in that context.
  - Activity has no `Issue filters`, no `Errors`/`Approvals` controls, and no redundant header/explainer.
  - Files has no blue `Files` / `Current folder` labels but still renders search/list.
  - Runs/new-run setup does not contain old helper copy and still enables/disables launch correctly.
  - Bottom nav still has all five tabs and shorter/quieter class treatment if class-level assertion is practical.
