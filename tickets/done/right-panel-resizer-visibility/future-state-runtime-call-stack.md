# Future-State Runtime Call Stacks (Debug-Trace Style)

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint
  - `[ASYNC]` async boundary / callback
  - `[STATE]` in-memory mutation or computed state
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path
- This is a future-state (`to-be`) execution model, not an as-is trace.
- No legacy/backward-compatibility branches are included.

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/in-progress/right-panel-resizer-visibility/requirements.md` (status `Design-ready`)
- Source Artifact: `tickets/in-progress/right-panel-resizer-visibility/implementation.md` (solution sketch)
- Source Design Version: `v1`
- Referenced Sections:
  - `Solution Sketch / Spine Inventory In Scope`
  - `Target Architecture Shape`
  - `Spine-Led Dependency And Sequencing Map`

## Future-State Modeling Rule

- Model target design behavior even where current code lacks container-aware clamping.
- Every use case maps to at least one declared spine.
- The main behavior is a bounded frontend layout/state flow; backend/API calls are out of scope.

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope | Governing Owner | Source Type | Requirement ID(s) | Design-Risk Objective | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Primary End-to-End | `WorkspaceDesktopLayout.vue` + `useRightPanel.ts` | Requirement | R-001, R-002, R-004 | N/A | Left sidebar resize keeps right splitter visible | Primary/Fallback/Error |
| UC-002 | DS-001, DS-002 | Primary End-to-End + Bounded Local | `useRightPanel.ts` | Requirement | R-001, R-003 | Preserve preferred width separately from actual clamp | Temporary clamp restores preferred width | Primary/Fallback/Error |
| UC-003 | DS-002, DS-003 | Bounded Local + Return-Event | `useRightPanel.ts` | Requirement | R-001, R-005 | Keep direct drag behavior while reporting actual width to consumers | Direct right splitter drag remains bounded | Primary/Fallback/Error |
| UC-004 | DS-003 | Return-Event | `useRightPanel.ts` -> `BrowserPanel.vue` | Design-Risk | R-001, R-005 | Avoid CSS-only clamping mismatch for Browser host bounds | Right width observers receive actual width | Primary/N/A/Error |

## Transition Notes

- No data migration is needed.
- The old single-width model is replaced by a preferred/actual width model inside `useRightPanel.ts`.
- Existing consumers continue reading `rightPanelWidth`; in the target state, this value means actual display width.

## Use Case: UC-001 Left sidebar resize keeps right splitter visible

### Spine Context

- Spine ID(s): DS-001
- Spine Scope: Primary End-to-End
- Governing Owner: `WorkspaceDesktopLayout.vue` physical container measurement; `useRightPanel.ts` clamp policy
- Why This Use Case Matters To This Spine: This is the user-reported path. The user is not dragging the right splitter; they are widening the left sidebar, which narrows the workspace container and must still preserve the center/right splitter.

### Goal

When the left app sidebar grows or the workspace container shrinks, the center/right splitter remains inside the visible workspace and the right panel's actual width is clamped to leave room for the center minimum plus handle width.

### Preconditions

- Right panel is visible.
- Preferred right panel width may be larger than the newly available workspace maximum.
- `WorkspaceDesktopLayout.vue` root element is mounted and measurable.

### Expected Outcome

- `rightPanelWidth.value <= workspaceContainerWidth - MIN_CENTER_WIDTH - RIGHT_HANDLE_WIDTH` when container width is known.
- Center panel keeps at least `200px`.
- Splitter flex item remains rendered between center and right panel.

### Primary Runtime Call Stack

```text
[ENTRY] layouts/default.vue:useLeftPanel().initDragLeftPanel(mousedown)
├── composables/useLeftPanel.ts:doDrag(mousemove) [STATE]
│   └── leftPanelWidth.value = clamp(startWidth + deltaX, 260, 520)
├── layouts/default.vue:leftPanelStyle [STATE] # aside width changes
├── browser layout engine:recalculateFlexRow(...) [ASYNC]
│   └── components/layout/WorkspaceDesktopLayout.vue:rootElement.clientWidth changes
├── components/layout/WorkspaceDesktopLayout.vue:ResizeObserver(callback) [ASYNC]
│   └── components/layout/WorkspaceDesktopLayout.vue:syncWorkspaceWidth()
│       └── composables/useRightPanel.ts:setRightPanelWorkspaceWidth(containerWidth) [STATE]
├── composables/useRightPanel.ts:rightPanelWidth(computed) [STATE]
│   ├── maxRightWidth = max(0, containerWidth - MIN_CENTER_WIDTH - RIGHT_HANDLE_WIDTH)
│   └── actualRightWidth = min(preferredRightPanelWidth, maxRightWidth)
├── components/layout/WorkspaceDesktopLayout.vue:render()
│   ├── centerPanel.class includes min width/shrink-safe guards
│   ├── resizeHandle.class includes fixed/flex-none guard
│   └── rightPanel.style.width = `${rightPanelWidth}px`
└── browser layout engine:paintVisibleSplit(...) # center + handle + right fit inside workspace
```

### Branching / Fallback Paths

```text
[FALLBACK] if ResizeObserver is unavailable
components/layout/WorkspaceDesktopLayout.vue:onMounted()
├── components/layout/WorkspaceDesktopLayout.vue:syncWorkspaceWidth()
├── window.addEventListener('resize', syncWorkspaceWidth)
└── subsequent window resize invokes setRightPanelWorkspaceWidth(...)
```

```text
[FALLBACK] if workspace container is too narrow for normal 400px right minimum
composables/useRightPanel.ts:rightPanelWidth(computed)
├── maxRightWidth = max(0, containerWidth - 200 - 4)
└── actualRightWidth = min(preferredRightPanelWidth, maxRightWidth) # may be < 400 to keep handle visible
```

```text
[ERROR] if measured container width is invalid/null
components/layout/WorkspaceDesktopLayout.vue:syncWorkspaceWidth()
└── composables/useRightPanel.ts:setRightPanelWorkspaceWidth(null)
    └── rightPanelWidth falls back to preferred/right-drag clamp without throwing
```

### State And Data Transformations

- Left drag `clientX` delta -> clamped `leftPanelWidth`.
- Workspace DOM `clientWidth` -> `workspaceWidthConstraint`.
- Preferred right width + workspace width constraint -> actual right width.

### Observability And Debug Points

- Unit tests can read `rightPanelWidth.value` after calling `setRightPanelWorkspaceWidth`.
- Component tests can assert layout classes/data-test hooks.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- Full visual repro remains optional if local app dependencies/dev server are available.

### Coverage Status

- Primary Path: `Covered by planned AV-001/AV-004`
- Fallback Path: `Covered by planned AV-001 narrow-container case`
- Error Path: `Covered by safe null-width behavior if included; otherwise low-risk code path`

## Use Case: UC-002 Temporary clamp restores preferred width

### Spine Context

- Spine ID(s): DS-001, DS-002
- Spine Scope: Primary End-to-End + Bounded Local
- Governing Owner: `useRightPanel.ts`
- Why This Use Case Matters To This Spine: A naive implementation that mutates the only width state during left-sidebar constraint would permanently lose the user's preferred right-panel width.

### Goal

Preserve preferred right-panel width while exposing an actual clamped width under temporary container constraints.

### Preconditions

- User previously enlarged right panel through direct right splitter drag.
- `preferredRightPanelWidth > constrainedMaxRightWidth`.

### Expected Outcome

- Under constraint, `rightPanelWidth.value` is clamped to the current max.
- When `setRightPanelWorkspaceWidth` later receives a larger width, `rightPanelWidth.value` restores toward `preferredRightPanelWidth`.

### Primary Runtime Call Stack

```text
[ENTRY] components/layout/WorkspaceDesktopLayout.vue:ResizeObserver(callback) [ASYNC]
├── components/layout/WorkspaceDesktopLayout.vue:syncWorkspaceWidth(smallerWidth)
│   └── composables/useRightPanel.ts:setRightPanelWorkspaceWidth(smallerWidth) [STATE]
├── composables/useRightPanel.ts:rightPanelWidth(computed) [STATE]
│   └── returns constrained actual width, leaves preferredRightPanelWidth unchanged
├── components/layout/WorkspaceDesktopLayout.vue:syncWorkspaceWidth(largerWidth) [ASYNC]
│   └── composables/useRightPanel.ts:setRightPanelWorkspaceWidth(largerWidth) [STATE]
└── composables/useRightPanel.ts:rightPanelWidth(computed) [STATE]
    └── returns min(preferredRightPanelWidth, largerMaxRightWidth)
```

### Branching / Fallback Paths

```text
[FALLBACK] if no workspace width has been registered yet
composables/useRightPanel.ts:rightPanelWidth(computed)
└── returns preferredRightPanelWidth # no container max known before mount
```

```text
[ERROR] if the registered width is negative/NaN
composables/useRightPanel.ts:setRightPanelWorkspaceWidth(width)
└── sanitize to null or non-negative finite width before computed clamp
```

### State And Data Transformations

- Workspace width updates alter the max constraint only.
- User preferred width is not overwritten by passive container resize.

### Observability And Debug Points

- Composable unit test simulates large preferred width, constrains container, then grows container and verifies restoration.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Coverage Status

- Primary Path: `Covered by planned AV-002`
- Fallback Path: `Covered by initial width expectations`
- Error Path: `Optional low-risk sanitation assertion`

## Use Case: UC-003 Direct right splitter drag remains bounded

### Spine Context

- Spine ID(s): DS-002, DS-003
- Spine Scope: Bounded Local + Return-Event
- Governing Owner: `useRightPanel.ts`
- Why This Use Case Matters To This Spine: Existing right splitter drag behavior must survive while gaining an upper bound.

### Goal

Direct right splitter dragging updates preferred width, enforces normal minimum when feasible, clamps to available maximum, and notifies observers through actual `rightPanelWidth`.

### Preconditions

- Right panel is visible.
- User mouses down on the center/right splitter.

### Expected Outcome

- Dragging left increases preferred width but actual width cannot exceed available maximum.
- Dragging right decreases width but, when available max is at least `400px`, actual width cannot go below `400px`.
- Event listeners are removed on mouseup.

### Primary Runtime Call Stack

```text
[ENTRY] components/layout/WorkspaceDesktopLayout.vue:.drag-handle@mousedown
└── composables/useRightPanel.ts:initDragRightPanel(event)
    ├── event.preventDefault()
    ├── startX = event.clientX
    ├── startWidth = rightPanelWidth.value # actual current width
    ├── document.addEventListener('mousemove', doDrag) [ASYNC]
    └── document.addEventListener('mouseup', stopDrag) [ASYNC]
        ├── composables/useRightPanel.ts:doDrag(mousemove)
        │   ├── proposedPreferred = startWidth + (startX - mousemove.clientX)
        │   └── preferredRightPanelWidth.value = clampDragPreferred(proposedPreferred) [STATE]
        └── composables/useRightPanel.ts:rightPanelWidth(computed) [STATE]
            └── actualRightWidth = min(preferredRightPanelWidth, currentMaxRightWidth)
```

### Branching / Fallback Paths

```text
[FALLBACK] if current max width is below normal minimum
composables/useRightPanel.ts:clampDragPreferred(proposed)
└── clamp to maxRightWidth instead of forcing 400px overflow
```

```text
[ERROR] if drag handler receives unexpected event data
composables/useRightPanel.ts:doDrag(mousemove)
└── catch/log error without leaving listeners installed after mouseup
```

### State And Data Transformations

- Mouse delta -> proposed preferred width.
- Proposed preferred width -> bounded preferred width.
- Bounded preferred width + workspace constraint -> actual width.

### Observability And Debug Points

- Unit tests dispatch mouse events and inspect `rightPanelWidth.value`.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Coverage Status

- Primary Path: `Covered by planned AV-003`
- Fallback Path: `Covered by AV-001/AV-003 max constraint cases`
- Error Path: `Existing catch/log preserved if practical`

## Use Case: UC-004 Right width observers receive actual width

### Spine Context

- Spine ID(s): DS-003
- Spine Scope: Return-Event
- Governing Owner: `useRightPanel.ts`
- Why This Use Case Matters To This Spine: The Browser tab watches `rightPanelWidth.value`; a CSS-only clamp would make the visual panel width diverge from the state observed by embedded browser bounds synchronization.

### Goal

Downstream consumers observe the actual clamped display width through the existing `rightPanelWidth` composable return value.

### Preconditions

- `BrowserPanel.vue` or any right-panel tool watches `rightPanelWidth.value`.
- Workspace container width changes or direct right splitter drag changes preferred width.

### Expected Outcome

- `rightPanelWidth.value` changes when the actual display width changes because of container constraints.
- Consumers do not need to duplicate layout math.

### Primary Runtime Call Stack

```text
[ENTRY] composables/useRightPanel.ts:setRightPanelWorkspaceWidth(containerWidth) [STATE]
├── composables/useRightPanel.ts:rightPanelWidth(computed) [STATE]
│   └── emits reactive actual-width change
└── components/workspace/tools/BrowserPanel.vue:watch([... rightPanelWidth.value ...]) [ASYNC]
    ├── vue:nextTick()
    └── components/workspace/tools/BrowserPanel.vue:syncHostBounds()
```

### Branching / Fallback Paths

```text
[FALLBACK] if right panel is hidden
components/layout/WorkspaceDesktopLayout.vue:v-show="isRightPanelVisible"
└── consumers already include visibility in their watchers; width remains safe state but hidden panel does not render.
```

### State And Data Transformations

- Actual clamped width is emitted as the public `rightPanelWidth` reactive value.
- Consumers derive their own local geometry after DOM update, not by recomputing clamp policy.

### Observability And Debug Points

- Composable tests cover actual width changes; existing BrowserPanel watcher remains unchanged.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Coverage Status

- Primary Path: `Covered indirectly by AV-001/AV-002; direct BrowserPanel test not required for this small scope`
- Fallback Path: `N/A`
- Error Path: `N/A`
