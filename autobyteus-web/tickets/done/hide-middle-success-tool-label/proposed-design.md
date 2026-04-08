# Design Spec

## Current-State Read

The current center inline tool-row path is:
`ToolCallSegment / WriteFileCommandSegment / EditFileCommandSegment / TerminalCommandSegment -> ToolCallIndicator.vue -> header-row status/icon/context computations -> center monitor row`

Current implementation facts:
- `autobyteus-web/components/conversation/ToolCallIndicator.vue` is the shared authoritative renderer for all center-monitor tool-bearing rows.
- The header currently renders a visible uppercase text token through:
  - template span: `v-if="!isAwaiting" ... {{ statusLabel }}`
  - computed text mapping: `statusLabel`
  - computed tint mapping: `statusTextClasses`
- The same component already owns the non-text state affordances the approved requirements want to keep: status icon/spinner, border color, opacity treatment, approval buttons, and inline error row.
- `ToolCallIndicator.vue` also owns the center-to-Activity navigation path through `handleCardClick()` -> `goToActivity()` -> `setActiveTab('progress')` -> `activityStore.setHighlightedActivity(runId, invocationId)`.
- The right-side Activity panel is a separate presentation boundary: `ActivityFeed.vue` renders feed/highlight behavior and `ActivityItem.vue` renders the right-side textual status chip plus short debug hash/id.
- There is currently no dedicated `ToolCallIndicator` regression spec. That means the label-removal requirement and the right-panel non-change boundary are both easy to regress silently.

Current coupling / fragmentation observations:
- The center inline row and the right-side Activity row intentionally present the same underlying tool state differently. They should stay separate presentation owners.
- The approved change is not a new feature flag or caller option. It is a clean-cut behavior change to the center shared renderer.
- Simply blanking selected `statusLabel` values would leave the header label element in place and preserve a now-empty branch. The target design should remove the visible status-label branch itself, not just change selected strings to `''`.

Constraints the target design must respect:
- Keep approval-needed rows explicit and actionable.
- Keep click-to-Activity navigation unchanged for non-awaiting rows.
- Keep right-side `ActivityItem.vue` textual status chip and short id unchanged.
- Keep current truncation, chevron affordance, and error-row treatment; this is not a broader density redesign.

## Intended Change

Make `ToolCallIndicator.vue` the sole owner of the center-row status-text removal by deleting the visible header status-label branch and its now-unused computed text mappings, while preserving the existing non-text status affordances and click-to-Activity behavior.

Add focused regression coverage at the component boundary:
- a new `ToolCallIndicator` spec to pin center-row no-text behavior plus unchanged navigation/approval/non-text-state signals;
- a minimal `ActivityItem` boundary spec to pin the explicit non-scope right-panel behavior (textual status chip + short debug id).

No new shared status-presentation helper, compatibility prop, or dual-path layout flag is introduced.

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
- Required action: remove the center header's visible status-label branch instead of retaining it behind a prop, CSS-only hide path, or blank-string mapping.
- Treat removal as first-class design work: the label element, `statusLabel`, and `statusTextClasses` become unnecessary in `ToolCallIndicator.vue` and should be deleted in this change.
- Decision rule: the design fails if it keeps both the old visible-label path and a new no-label path for the same center rows.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Tool-bearing conversation segment wrapper render | Center inline tool-card header DOM | `ToolCallIndicator.vue` | This is the shared center surface where visible status text must be removed for every wrapper-backed tool row. |
| DS-002 | Primary End-to-End | User click on a navigable inline tool card | Right-side Activity tab activation + highlighted activity row | `ToolCallIndicator.vue` | Click-to-Activity behavior is explicitly in scope to preserve. |
| DS-003 | Primary End-to-End | Activity row render from `ToolActivity` data | Right-side textual status chip + short debug id | `ActivityItem.vue` | This is the explicit non-scope boundary that must stay unchanged while DS-001 changes. |

## Primary Execution Spine(s)

- `ToolCallSegment / WriteFileCommandSegment / EditFileCommandSegment / TerminalCommandSegment -> ToolCallIndicator.vue -> local status/icon/context computations -> inline tool-card header DOM -> center monitor`
- `User click on inline tool card -> ToolCallIndicator.handleCardClick -> useRightSideTabs.setActiveTab('progress') -> agentActivityStore.setHighlightedActivity(runId, invocationId) -> ActivityFeed / ActivityItem highlight`
- `agentActivityStore.getActivities(runId) -> ActivityFeed.vue -> ActivityItem.vue -> textual status chip + short debug id`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Each tool-bearing segment wrapper forwards one tool invocation into `ToolCallIndicator.vue`, which decides what the center inline header shows. The target change lands entirely here: keep icon, tint, border, context summary, chevron, and error row, but delete the visible status text branch so reclaimed width goes back to tool/context content. | Segment wrappers, `ToolCallIndicator.vue`, inline header DOM | `ToolCallIndicator.vue` | status icon mapping, border/tint classes, context summary parsing/truncation, approval controls |
| DS-002 | When a non-awaiting inline card is activated, `ToolCallIndicator.vue` switches the right-side tab to `progress` and marks the matching activity as highlighted for the current run. This interaction survives unchanged. | inline card interaction, `ToolCallIndicator.vue`, `useRightSideTabs`, `agentActivityStore`, `ActivityFeed.vue` | `ToolCallIndicator.vue` | active run lookup from `activeContextStore`, downstream feed highlight behavior |
| DS-003 | The right-side Activity surface independently renders the row icon, textual status chip, and short id from `ToolActivity` data. This rendering remains the authoritative textual status surface and must not be reshaped to support the center-row density change. | `agentActivityStore`, `ActivityFeed.vue`, `ActivityItem.vue` | `ActivityItem.vue` | feed ordering/highlight, item expand/collapse sections |

## Spine Actors / Main-Line Nodes

- DS-001: segment wrappers -> `ToolCallIndicator.vue` -> center inline header DOM
- DS-002: inline card interaction -> `ToolCallIndicator.vue` -> `useRightSideTabs` -> `agentActivityStore` -> `ActivityFeed.vue`
- DS-003: `agentActivityStore` -> `ActivityFeed.vue` -> `ActivityItem.vue`

## Ownership Map

- Segment wrappers (`ToolCallSegment.vue`, `WriteFileCommandSegment.vue`, `EditFileCommandSegment.vue`, `TerminalCommandSegment.vue`)
  - Thin entry facades only.
  - Own segment-specific prop adaptation.
  - Must not own center-row status-text policy.
- `ToolCallIndicator.vue`
  - Governing owner for center inline tool-card presentation.
  - Owns status icon/spinner selection, border/opacity treatment, context-summary rendering, approval controls, error-row visibility, and click-to-Activity initiation.
  - Owns the clean-cut removal of visible center status text.
- `useRightSideTabs`
  - Owns active right-panel tab selection.
- `agentActivityStore`
  - Owns highlighted activity identity by `(runId, invocationId)`.
- `ActivityFeed.vue`
  - Owns feed listing and scroll/highlight reveal behavior.
- `ActivityItem.vue`
  - Governing owner for right-side Activity row presentation, including textual status chip and short debug id.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ToolCallSegment.vue` | `ToolCallIndicator.vue` | Adapts generic tool-call segment data into the shared center renderer | center-row status-text policy |
| `WriteFileCommandSegment.vue` | `ToolCallIndicator.vue` | Adapts write-file segment data into the shared center renderer | center-row status-text policy |
| `EditFileCommandSegment.vue` | `ToolCallIndicator.vue` | Adapts edit-file segment data into the shared center renderer | center-row status-text policy |
| `TerminalCommandSegment.vue` | `ToolCallIndicator.vue` | Adapts terminal segment command args into the shared center renderer | center-row status-text policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Header status-label span in `ToolCallIndicator.vue` | Visible center-row status text is the clutter source and wastes width | Existing icon/spinner, tint, border, opacity, error row, and approval controls in `ToolCallIndicator.vue` | In This Change | Delete the element instead of leaving a hidden or empty placeholder branch |
| `statusLabel` computed in `ToolCallIndicator.vue` | It only serves the removed visible header label | No replacement in center row; right-side `ActivityItem.vue` keeps its own local label mapping | In This Change | Do not extract into a shared helper |
| `statusTextClasses` computed in `ToolCallIndicator.vue` | It only serves the removed visible header label | No replacement in center row | In This Change | Remove with the template branch |

## Return Or Event Spine(s) (If Applicable)

No additional return/event spine beyond the explicit click-navigation spine DS-002 is needed for this scope.

## Bounded Local / Internal Spines (If Applicable)

No loop/state-machine-style bounded local spine is material here. The local logic inside `ToolCallIndicator.vue` remains straightforward computed presentation logic.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Status icon/spinner and border/tint mapping | DS-001 | `ToolCallIndicator.vue` | Preserve non-text state readability after text removal | The approved change keeps visual state cues while reclaiming text width | If pushed upstream into wrappers, center-row behavior fragments by segment type |
| Context summary parsing / truncation / secret redaction | DS-001 | `ToolCallIndicator.vue` | Preserve readable command/path context in the reclaimed width | The value of this change is content-first header space, not a status redesign | If mixed into unrelated right-panel components, ownership blurs between surfaces |
| Approval buttons and approval posting | DS-001 | `ToolCallIndicator.vue` | Preserve explicit approval-needed affordances | Approval-needed rows are exempt from navigable-row behavior | If collapsed into the generic no-label path, approval affordances could weaken |
| Right-panel status chip + short id rendering | DS-003 | `ActivityItem.vue` | Preserve the unchanged textual status/debug surface on the right | The approved requirements keep the right side intact | If reused by the center row, the two surfaces become coupled and the non-scope boundary erodes |
| Feed highlight reveal behavior | DS-002 / DS-003 | `ActivityFeed.vue` | Reveal the highlighted activity in the right panel after navigation | Existing downstream consequence of click-to-Activity must survive | If absorbed into `ToolCallIndicator.vue`, the center component would take on right-panel layout behavior |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Center inline tool-row presentation change | `autobyteus-web/components/conversation` | Reuse | `ToolCallIndicator.vue` is already the authoritative shared center renderer | N/A |
| Center-row regression coverage | `autobyteus-web/components/conversation/__tests__` | Extend | A new component spec belongs beside the conversation surface it protects | N/A |
| Right-panel non-change regression boundary | `autobyteus-web/components/progress/__tests__` | Extend | `ActivityItem.vue` already owns the unchanged status chip + short id surface | N/A |
| Shared center/right status presentation abstraction | existing conversation + progress component owners | Reuse existing separate owners | The two surfaces intentionally diverge; no new shared helper should centralize visible status text policy | Creating a shared helper would couple two intentionally different presentation boundaries |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `components/conversation` | Shared center inline tool-card presentation and regression coverage | DS-001, DS-002 | `ToolCallIndicator.vue` | Extend | Single production change surface plus one new component spec |
| `components/progress` | Right-side Activity row presentation and non-change regression coverage | DS-002, DS-003 | `ActivityItem.vue`, `ActivityFeed.vue` | Extend | No production redesign; add a boundary test only |
| `composables/useRightSideTabs` + `stores/agentActivityStore` + `stores/activeContextStore` | Existing navigation/highlight dependencies reused by the center card | DS-002 | `ToolCallIndicator.vue` | Reuse | No structural or API change expected |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/conversation/ToolCallIndicator.vue` | `components/conversation` | `ToolCallIndicator.vue` | Remove visible center status text while preserving icon/tint/border/error-row/approval/click behavior | One shared renderer already governs every affected center row | No new shared structure |
| `autobyteus-web/components/conversation/__tests__/ToolCallIndicator.spec.ts` | `components/conversation/__tests__` | Conversation component regression boundary | Verify no visible center status text for non-awaiting states, preserved non-text state signal, approval behavior, and click-to-Activity navigation | One spec can pin the whole shared renderer behavior | Reuses mocked component boundary only |
| `autobyteus-web/components/progress/__tests__/ActivityItem.spec.ts` | `components/progress/__tests__` | Progress component regression boundary | Verify right-side textual status chip and short id remain unchanged | Direct owner-specific boundary test is cleaner than routing this through feed tests | Reuses `ActivityItem.vue` only |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Visible status-label presentation between center row and right panel | None | Keep local to existing component owners | The two surfaces intentionally present the same status differently; sharing the visible label policy would be the wrong abstraction | Yes | Yes | A generic `toolStatusPresentation.ts`, `showStatusLabel` prop, or dual-surface label helper |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| No new shared structures introduced in this scope | Yes | Yes | Low | Keep center and right presentation mappings local to their existing owners |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/conversation/ToolCallIndicator.vue` | `components/conversation` | `ToolCallIndicator.vue` | Clean-cut removal of visible center status text; preserve icon/spinner, tint, border, context summary, approval controls, error row, and click-to-Activity behavior | This file already owns the center-row presentation boundary | No |
| `autobyteus-web/components/conversation/__tests__/ToolCallIndicator.spec.ts` | `components/conversation/__tests__` | ToolCallIndicator regression boundary | Protect no-text center status behavior and adjacent unchanged center behavior | Shared renderer deserves direct component coverage | No |
| `autobyteus-web/components/progress/__tests__/ActivityItem.spec.ts` | `components/progress/__tests__` | ActivityItem regression boundary | Protect unchanged right-panel textual status chip + short id | Explicitly pins the approved non-scope boundary | No |

## Ownership Boundaries

`ToolCallIndicator.vue` is the authoritative boundary for center inline tool-card presentation. Upstream segment wrappers should keep passing tool data into it and must not regain authority through props such as `showStatusLabel`, `compactMode`, or per-wrapper text toggles.

`ActivityItem.vue` is the authoritative boundary for right-side Activity row presentation. The center-row change must not reach into that boundary through shared visible-label helpers or production edits meant only to mirror the center-row density change.

`useRightSideTabs` and `agentActivityStore` remain internal dependencies of `ToolCallIndicator.vue` for click navigation. Upstream wrappers should not bypass `ToolCallIndicator.vue` and call those dependencies directly to preserve behavior.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ToolCallIndicator.vue` | status icon selection, border/tint classes, context summary, approval buttons, click navigation wiring | tool-bearing conversation segment wrappers | wrappers rendering their own status label or directly calling right-panel navigation/highlight dependencies | extend `ToolCallIndicator.vue` locally, not via new wrapper props |
| `ActivityItem.vue` | right-panel status chip text, short id, expand/collapse sections | `ActivityFeed.vue` and progress-panel composition | center conversation code importing/reusing right-panel visible status presentation logic | add/adjust local `ActivityItem.vue` logic only if a real right-panel requirement changes |

## Dependency Rules

- Segment wrappers may depend on `ToolCallIndicator.vue` only for center inline tool-row presentation.
- `ToolCallIndicator.vue` may depend on `useRightSideTabs`, `useActiveContextStore`, and `useAgentActivityStore` exactly as the existing click/approval boundary requires.
- `ToolCallIndicator.vue` must not import `ActivityItem.vue` or any shared visible status-label utility for this change.
- `ActivityItem.vue` should remain production-unchanged for this task.
- Tests should mock composables/stores at the component boundary rather than wiring full application runtime.
- Forbidden shortcut: introducing a compatibility prop/flag that allows some center callers to keep the old visible status label.
- Forbidden shortcut: blanking some `statusLabel` strings while retaining the label element and empty branch in the header.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `ToolCallIndicator` props (`invocationId`, `toolName`, `status`, `args`, `errorMessage`) | one center inline tool invocation row | Render the shared center row and wire row-local interactions | `invocationId: string`, `status: ToolInvocationStatus`, tool metadata props | No new `showStatusLabel` or similar prop |
| `ToolCallIndicator.handleCardClick()` / `goToActivity()` | center-row navigation initiation | Switch right-side tab and highlight matching activity | current run id from `activeContextStore` + `props.invocationId` | Behavior preserved unchanged |
| `ActivityItem` prop (`activity`) | one right-side Activity row | Render right-side textual status chip, short id, and expandable details | `activity: ToolActivity` | Remains unchanged |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ToolCallIndicator` props | Yes | Yes | Low | Keep the center-row policy internal; do not add toggle props |
| `goToActivity()` | Yes | Yes | Low | Keep `(runId, invocationId)` lookup unchanged |
| `ActivityItem` props | Yes | Yes | Low | Leave production interface unchanged |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Shared center inline renderer | `ToolCallIndicator.vue` | Yes | Low | Keep existing name |
| Right-side activity row | `ActivityItem.vue` | Yes | Low | Keep existing name |
| Removed center text mapping | `statusLabel` / `statusTextClasses` (remove) | Yes | Low | Delete instead of renaming/moving |

## Applied Patterns (If Any)

- Thin facade pattern already exists in the wrapper segment components. This design keeps that pattern and strengthens the authoritative boundary at `ToolCallIndicator.vue` by refusing new wrapper-level status-text toggles.
- No new local pattern (state machine, registry, adapter, shared presentation service) is warranted for this scope.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/conversation/ToolCallIndicator.vue` | File | `ToolCallIndicator.vue` | Shared center inline tool-row rendering; remove visible status text while preserving all other row behaviors | This is the existing shared owner of every affected center tool row | right-panel chip logic, compatibility props, or wrapper-specific status-text branches |
| `autobyteus-web/components/conversation/__tests__/ToolCallIndicator.spec.ts` | File | Conversation regression boundary | Verify center no-text behavior and unchanged adjacent center behaviors | The spec belongs with the component surface it protects | feed-scroll behavior or right-panel layout assertions |
| `autobyteus-web/components/progress/__tests__/ActivityItem.spec.ts` | File | Progress regression boundary | Verify unchanged right-panel textual status chip and short debug id | The spec belongs with the component that owns the non-scope boundary | center-row layout logic |

Rules applied here:
- No folder reorganization is justified for this small UI refinement.
- The existing flat component/test folder layout stays clearer than inventing a new shared status-presentation area.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/conversation` | Mixed Justified | Yes | Low | Existing conversation UI components already own center monitor rendering; no extra split needed |
| `autobyteus-web/components/progress` | Mixed Justified | Yes | Low | Existing progress UI components already own right-panel Activity rendering; keep that boundary intact |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Center inline header after change | `check icon + tool name + context summary + chevron`, with no visible `SUCCESS` / `FAILED` / `RUNNING` / `APPROVED` / `DENIED` token | `check icon + tool name + context summary + SUCCESS chip + chevron` | Shows the exact density change the user approved |
| Clean-cut center ownership | `ToolCallIndicator.vue` always omits visible center status text for non-awaiting rows | `ToolCallIndicator.vue` gains a `showStatusLabel` prop so some callers keep old behavior | Prevents caller-driven fragmentation of one shared renderer |
| Right-panel non-change boundary | `ActivityItem.vue` still shows `Success` chip and `#abc123` while center row stays text-free | `ToolCallIndicator.vue` and `ActivityItem.vue` both switch to a shared status helper or both lose the right-side chip | Makes the explicit non-scope boundary concrete |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| `showStatusLabel` / `compact` prop on `ToolCallIndicator.vue` | Would preserve old center-row label behavior for some callers | Rejected | Apply one clean shared renderer behavior: remove visible center status text for all wrapper-backed center rows |
| Blank-string mapping in `statusLabel` while retaining the label span | Superficially low-effort way to hide selected text | Rejected | Remove the label element and delete `statusLabel` / `statusTextClasses` entirely |
| Shared center/right status-presentation helper | Might reduce local duplication | Rejected | Keep center and right visual policies local to `ToolCallIndicator.vue` and `ActivityItem.vue` because the surfaces intentionally differ |

Hard block:
- Any design that depends on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior fails review.

## Derived Layering (If Useful)

Not needed beyond the named component boundaries for this small UI change.

## Migration / Refactor Sequence

1. Modify `autobyteus-web/components/conversation/ToolCallIndicator.vue`.
   - Delete the visible header status-label span.
   - Remove now-unused `statusLabel` and `statusTextClasses` computed state.
   - Keep current `statusClasses`, icon/spinner selection, context summary, chevron, approval buttons, error row, and click handler intact.
   - Do not add a new prop, feature flag, or shared helper.
2. Add `autobyteus-web/components/conversation/__tests__/ToolCallIndicator.spec.ts`.
   - Mock `useRightSideTabs`, `useActiveContextStore`, and `useAgentActivityStore`.
   - Stub `Icon` so icon selection can be asserted without full icon rendering.
   - Verify at least `success`, `error`, `executing`, `approved`, and `denied` rows render no visible status label text.
   - Verify at least one adjacent non-text signal remains (for example success/error icon stub or executing spinner class).
   - Verify awaiting-approval rows still show `Approve` / `Deny` buttons and do not depend on the removed status-text branch.
   - Verify clicking a navigable row still calls `setActiveTab('progress')` and `setHighlightedActivity(runId, invocationId)`.
3. Add `autobyteus-web/components/progress/__tests__/ActivityItem.spec.ts`.
   - Mount `ActivityItem.vue` directly.
   - Verify the right-side textual status chip still renders.
   - Verify the short debug hash/id still renders from the invocation id.
4. Run targeted component tests for the new specs (and any nearby existing progress/conversation specs if convenient) to confirm the clean-cut behavior.

## Key Tradeoffs

- Keep duplicated presentation logic local rather than extracting a shared status-presentation layer. This preserves the approved divergence between the center row and the right-side Activity panel.
- Add a small right-panel boundary spec even though no production right-panel code changes. This slightly increases test surface area but gives the approved non-scope boundary an explicit guardrail.
- Limit the production change to one shared renderer. This keeps risk low but intentionally does not attempt a wider inline density redesign.

## Risks

- A too-broad text assertion in tests could false-positive if fixture tool names or context strings contain status words. Use neutral fixture content.
- The executing state uses a spinner `div` rather than an `Icon` component, so tests should assert the spinner-specific class/path rather than assuming every state exposes `data-icon`.
- If implementation tries to preserve accessibility semantics, it must do so without restoring visible status text in layout (for example, by using local non-visual ARIA labeling rather than a visible chip).

## Guidance For Implementation

- Keep `ToolCallIndicator.vue` as the only production component changed unless implementation discovers a concrete issue that truly requires more.
- Remove the center visible label branch; do not just map more states to empty strings.
- Keep `ActivityItem.vue` production code unchanged for this task.
- Preserve current `min-w-0`, truncation, and right-chevron behavior so reclaimed space naturally benefits the tool/context content.
- If additional test selectors are needed, add them locally and minimally; do not introduce new shared presentation abstractions just for testing.
