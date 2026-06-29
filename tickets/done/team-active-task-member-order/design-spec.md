# Design Spec

## Current-State Read

`TeamActiveTasksSection.vue` owns the Team tab Tasks section active task presentation. It renders a master/detail split: the left navigator lists active tasks and references, while the right detail pane displays the selected task. For selected task-team entries, `selectedEntry.members` already contains focusable member rows and the component already emits `select-member` when the user clicks a primary task Focus button or a member row.

Current right-pane order for selected tasks:

1. selected task title/status and primary Focus button
2. waiting notice when the status label matches `/waiting|approval|input|action/i`
3. markdown task description
4. task-team member focus rows
5. technical details

The current behavior hides task-team member focus rows below long task descriptions. The component boundary remains appropriate; the defect is local presentation order.

## Intended Change

For selected task-team entries, move the existing task-team member focus rows above the task description markdown, directly after the title/status/primary Focus/waiting notice area. Preserve current row style, click behavior, text, and selectors. Do not add labels, explanatory copy, counters, sticky behavior, or new visual concepts.

Target right-pane order:

1. selected task title/status and primary Focus button
2. waiting notice when applicable
3. task-team member focus rows, if any
4. markdown task description
5. technical details

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UI cleanup
- Current design issue found (`Yes`/`No`/`Unclear`): No broader design issue
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No
- Evidence: `TeamActiveTasksSection.vue` already owns the detail layout and focus rows. `deriveActiveTaskEntries` already supplies members. Workflow tests already cover focus routing. The issue is only that the rows appear after long markdown.
- Design response: Reorder existing template blocks within the same component.
- Refactor rationale: No refactor is needed because owner, API shape, file placement, and state/data model remain healthy for this scope.
- Intentional deferrals and residual risk, if any: Sticky behavior and additional compact summaries are intentionally out of scope to keep the UI clean.

## Terminology

- `Task detail pane`: The right pane inside `TeamActiveTasksSection.vue` when a task is selected and no reference preview is open.
- `Member focus rows`: Existing `[data-test="active-task-member-row"]` buttons rendered from `selectedEntry.members` for task-team entries.

## Design Reading Order

1. UI presentation spine
2. component ownership
3. template block mapping
4. tests/checks

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: No compatibility branch is needed. The old member-row placement after markdown is replaced directly by the new placement before markdown.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Active team context selected in Team tab | User clicks task-team member Focus row | `TeamActiveTasksSection.vue` for presentation; `TeamOverviewPanel.vue`/store for focus hydration | Shows where the UI order affects member discovery while preserving focus routing. |

## Primary Execution Spine(s)

`Active Team Context -> deriveActiveTaskEntries -> TeamActiveTasksSection selectedEntry -> Member focus row rendered near top -> select-member event emitted -> TeamOverviewPanel focusActiveTaskMember -> teamContextsStore.focusMemberAndEnsureHydrated`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The active team context produces active task entries. The selected task detail renders task controls. For task-team entries, member focus rows are visible before long task body content and continue to emit the same focus request when clicked. | Active team context; active task entry; task detail pane; member focus row; focus request | `TeamActiveTasksSection.vue` for local presentation order | Markdown rendering, status label formatting, reference preview, focus hydration |

## Spine Actors / Main-Line Nodes

- Active team context
- Active task entry
- Selected task detail pane
- Member focus row
- Focus event/focus hydration

## Ownership Map

- `deriveActiveTaskEntries`: owns deriving display-ready active task entries, including task-team `members`.
- `TeamActiveTasksSection.vue`: owns selected task detail presentation order and emits selected route keys.
- `TeamOverviewPanel.vue`: owns translating emitted route keys into `focusMemberAndEnsureHydrated` calls.
- `teamContextsStore`: owns focused member state and hydration.

## Thin Entry Facades / Public Wrappers (If Applicable)

Not applicable.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Member-row placement below markdown | It hides focusable members after long task content | Same rows moved before markdown in `TeamActiveTasksSection.vue` | In This Change | No duplicate rows should remain. |

## Return Or Event Spine(s) (If Applicable)

`Member focus row click -> emit('select-member', memberRouteKey) -> TeamOverviewPanel.focusActiveTaskMember -> store focus state update -> focused member UI/message identity updates`

## Bounded Local / Internal Spines (If Applicable)

Not applicable.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Markdown rendering | DS-001 | `TeamActiveTasksSection.vue` | Render task body | Task descriptions can include markdown | If placed before member controls, long content hides focus actions. |
| Waiting notice | DS-001 | `TeamActiveTasksSection.vue` | Explain waiting/user-action status when applicable | Helps users know why task is blocked | Should remain near header before member rows. |
| Technical details | DS-001 | `TeamActiveTasksSection.vue` | Show IDs/kind/arguments in collapsible details | Debug/inspection support | Should remain after user-facing content. |
| Reference preview | DS-001 | `TeamActiveTasksSection.vue` | Replace detail body with selected task reference viewer | Supports task-owned reference inspection | Must remain unaffected by member-row ordering. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Task detail presentation order | `TeamActiveTasksSection.vue` | Reuse | Existing owner already owns this UI. | N/A |
| Focus routing | `TeamOverviewPanel.vue` + `agentTeamContextsStore` | Reuse | Existing behavior is correct. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace Team UI | Team tab overview and active task detail presentation | DS-001 | `TeamActiveTasksSection.vue` | Reuse | Local template reorder only. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | Workspace Team UI | Active task detail component | Render selected task detail and member focus rows | The current file already owns this UI | Uses `ActiveTaskEntry` data |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` | Workspace Team UI tests | Component unit tests | Assert member rows appear before task body and still emit focus | Existing test file covers this component | N/A |

## Reusable Owned Structures Check

No repeated structure or shared type extraction is needed.

## Shared Structure / Data Model Tightness Check

No data model changes.

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | Workspace Team UI | Active task detail component | Reorder existing member focus row block before markdown | Direct current owner of affected template | `ActiveTaskEntry.members` |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` | Workspace Team UI tests | Component test | Verify order/no regression | Existing test owner | N/A |

## Ownership Boundaries

`TeamActiveTasksSection.vue` may decide local presentation order and emit route keys. It must not take over focus hydration or active context ownership. Focus state remains owned by `TeamOverviewPanel.vue` and `agentTeamContextsStore`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TeamActiveTasksSection.vue` `select-member` emit | Member row click handlers | Parent Team overview component | Child component directly mutating focus store | Parent/store API changes, not needed here |

## Dependency Rules

- `TeamActiveTasksSection.vue` may import and render `MarkdownRenderer`, `TeamActiveTaskRow`, and `TeamTaskReferenceViewer` as it does today.
- `TeamActiveTasksSection.vue` must continue to emit `select-member`; it must not directly call `teamContextsStore`.
- No backend/API/store dependency changes.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `emit('select-member', memberRouteKey)` | Focusable team member route | Request focus change | `memberRouteKey: string` | Preserve current behavior. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `select-member` event | Yes | Yes | Low | None. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Active task detail component | `TeamActiveTasksSection` | Yes | Low | None. |
| Member focus row selector | `active-task-member-row` | Yes | Low | Preserve. |

## Applied Patterns (If Any)

None beyond existing Vue component composition.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | File | Active task detail component | Move existing member rows before markdown | Existing UI owner | Store focus mutation or new labels/copy |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` | File | Component unit tests | Assert order and behavior | Existing test owner | Backend/integration concerns |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team` | Main-Line UI presentation | Yes | Low | Existing folder is correct. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Clean task-team detail order | `Header -> Waiting notice -> Existing member rows -> Markdown -> Technical details` | `Header -> Waiting notice -> Markdown -> Existing member rows -> Technical details` | Avoids scroll-to-discover without adding UI text. |
| Copy restraint | Existing row `[avatar] member_name [Focus]` only | Adding `Focus targets:` or explanatory helper copy | User explicitly wants professional clean UI. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Duplicate rows both above and below markdown | Could preserve old location while improving visibility | Rejected | Move the single existing row block above markdown. |
| Feature flag for old/new order | Could support both layouts | Rejected | Local UI cleanup does not need dual behavior. |

## Derived Layering (If Useful)

Not needed.

## Migration / Refactor Sequence

1. In `TeamActiveTasksSection.vue`, move the `selectedEntry.kind === 'task_team' && selectedEntry.members.length` block above `MarkdownRenderer`.
2. Ensure no duplicate member row block remains below markdown.
3. Update `TeamActiveTasksSection.spec.ts` to assert member row DOM position precedes task body and focus emits unchanged.
4. Run targeted component/workflow tests if dependencies are installed.

## Key Tradeoffs

- Moving member rows earlier makes member discovery immediate while keeping the UI clean.
- It may push task description down slightly for task teams with several members, but that is preferable to hiding action targets below long task bodies.

## Risks

- Low risk of visual spacing changes in task-team detail. Mitigate with focused test and visual review if available.

## Guidance For Implementation

Keep the patch small. Do not introduce new copy, computed state, store calls, or new components. Preserve existing data-test selectors and event emission.
