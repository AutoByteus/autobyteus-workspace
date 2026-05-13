# Implementation

## Scope Classification

- Classification: `Small`
- Reasoning: The change is localized to one frontend state composable, one workspace layout component, one outer shell class, and focused tests.
- Workflow Depth: `Small` -> draft `implementation.md` solution sketch -> future-state runtime call stack -> future-state runtime call stack review -> finalize implementation baseline -> source execution.

## Upstream Artifacts (Required)

- Workflow state: `tickets/in-progress/right-panel-resizer-visibility/workflow-state.md`
- Investigation notes: `tickets/in-progress/right-panel-resizer-visibility/investigation-notes.md`
- Requirements: `tickets/in-progress/right-panel-resizer-visibility/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: pending Stage 4
- Future-state runtime call stack review: pending Stage 5
- Proposed design: N/A for small scope; this implementation document contains the solution sketch design basis.

## Document Status

- Current Status: `Ready For Implementation`
- Design Basis Version: `v1`
- Notes: Stage 5 reached `Go Confirmed`; implementation baseline is finalized and source execution can begin only after `workflow-state.md` shows Stage 6 with code edits unlocked.

## Plan Baseline (Freeze Until Replanning)

### Preconditions (Must Be True Before Finalizing The Baseline)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Future-state runtime call stack review has `Go Confirmed`: `Yes`
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Yes`
- No newly discovered use cases in the final two clean rounds: `Yes`

### Solution Sketch (Required For `Small`)

#### Use Cases In Scope

- UC-001: Left sidebar widening constrains the center/right workspace container while right panel remains open.
- UC-002: Available width later returns and the right panel restores toward the user's preferred width.
- UC-003: Direct right splitter drag still enforces the normal minimum when feasible and clamps to available maximum.

#### Spine Inventory In Scope

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Left sidebar/window/container width change | Visible center/right split with splitter still inside workspace | `WorkspaceDesktopLayout.vue` + `useRightPanel.ts` | This is the bug path: available width changes outside the right splitter drag. |
| DS-002 | Bounded Local | Direct right splitter pointer drag | Preferred right-panel width update + actual clamped display width | `useRightPanel.ts` | Preserves existing direct resize behavior while adding max constraints. |
| DS-003 | Return/Event | Actual right-panel width changes | Downstream right-panel consumers observe accurate width | `useRightPanel.ts` | `BrowserPanel.vue` watches `rightPanelWidth.value`; it must receive actual clamped width. |

#### Primary Owners / Main Domain Subjects

- `useRightPanel.ts`
  - Owns right panel visibility.
  - Owns user preferred right-panel width.
  - Owns actual displayed right-panel width derived from preferred width and registered workspace container width.
  - Owns clamp constants: normal minimum right width, center minimum width, right splitter handle width.
- `WorkspaceDesktopLayout.vue`
  - Owns the center/right DOM split and the physical workspace container measurement.
  - Reports container width to `useRightPanel.ts` via a small explicit method.
  - Renders the actual clamped right width and explicit flex guards.
- `layouts/default.vue`
  - Owns the outer app shell flex row.
  - Adds `min-w-0` to the main shell item so the workspace can actually shrink next to the left sidebar.

#### Requirement Coverage Guarantee

| Requirement | Use Case(s) | Spine(s) |
| --- | --- | --- |
| R-001 | UC-001, UC-002, UC-003 | DS-001, DS-002 |
| R-002 | UC-001 | DS-001 |
| R-003 | UC-002, UC-003 | DS-001, DS-002 |
| R-004 | UC-001 | DS-001 |
| R-005 | UC-001, UC-002, UC-003 | DS-001, DS-002, DS-003 |

#### Design-Risk Use Cases

- DR-001: CSS-only clamp hides a mismatch where `BrowserPanel.vue` still reads the old requested width.
  - Objective: keep `rightPanelWidth` as actual display width from the composable, not merely a CSS max-width.
- DR-002: Temporarily clamping the state itself would lose the user's preferred width.
  - Objective: preserve preferred width separately from actual clamped width.

#### Target Architecture Shape

1. `useRightPanel.ts` keeps two distinct width concepts:
   - `preferredRightPanelWidth`: mutable width requested by direct right-panel drag.
   - `rightPanelWidth`: computed actual display width after applying current workspace container max.
2. `useRightPanel.ts` exposes a method such as `setRightPanelWorkspaceWidth(width: number | null)` for the layout owner to update available width.
3. `WorkspaceDesktopLayout.vue` measures its root center/right container with `ResizeObserver` and calls the composable registration method on mount, resize, and unmount cleanup.
4. `WorkspaceDesktopLayout.vue` renders the right panel with actual `rightPanelWidth` and flex guards:
   - root: `overflow-hidden`, `min-w-0` where appropriate;
   - handle: fixed/flex-none data-test hook;
   - right panel: `flex-none min-w-0 overflow-hidden`.
5. `layouts/default.vue` adds `min-w-0` to the main app shell flex item so the workspace width changes when the left sidebar grows.

#### New Owners/Boundary Interfaces To Introduce

- No new subsystem or broad module.
- New/strengthened composable API in `useRightPanel.ts`:
  - `rightPanelWidth`: actual display width (existing public name preserved semantically for consumers as displayed width).
  - `setRightPanelWorkspaceWidth(width: number | null)`: sets/removes the current container width constraint.
  - Internal clamp helper functions remain private unless testability requires exported pure helpers; prefer testing through public composable behavior.

#### API/Behavior Delta

- Before: right panel width only had a minimum clamp during direct right-panel drag and could remain larger than available workspace width.
- After: actual displayed right panel width is always clamped against available workspace width when known, keeping `centerMin + handle + rightActualWidth <= workspaceWidth`.
- Before: no mechanism re-evaluated right width when the left sidebar changed width.
- After: workspace root measurement updates the right-panel width constraint when left sidebar/window/container changes.

#### Key Assumptions

- The center panel minimum remains `200px`.
- The existing right handle visual width remains `4px`.
- A temporary display width below `400px` is acceptable only when the container is too small for `400px + 200px + handle`.

#### Known Risks

- `ResizeObserver` is unavailable in some test/runtime contexts; fallback to `window.resize` and immediate measurement is still needed.
- A full manual repro may require a realistic workspace state; focused layout/composable validation remains sufficient for the geometry invariant.

### Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification | Required Re-Entry Path | Round State | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: Round 2 in `future-state-runtime-call-stack-review.md`
  - Clean streak at final round: 2
  - Final review gate line: `Implementation can start: Yes`
- If `No-Go`, required refinement target: N/A

### Principles

- Bottom-up: implement composable state/clamp before layout integration.
- Test-driven: write unit tests for width math and component/source tests for layout guards.
- Mandatory modernization rule: no compatibility wrappers or dual paths.
- Mandatory cleanup rule: no obsolete width path retained in scope.
- Mandatory ownership/decoupling rule: container measurement in layout, clamp policy in composable.
- Mandatory Authoritative Boundary Rule: consumers read `useRightPanel` actual display width instead of bypassing with local CSS-only geometry.

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | DS-002, DS-003 | `useRightPanel.ts` | Add preferred-vs-actual width model and clamp API. | Requirements/design. | Establish authoritative state boundary first. |
| 2 | DS-001 | `WorkspaceDesktopLayout.vue` | Measure workspace root and render clamped width/flex guards. | Task 1. | Layout must use the state boundary rather than local math. |
| 3 | DS-001 | `layouts/default.vue` | Add outer main `min-w-0`. | Task 2 optional but related. | Ensures left sidebar resize can shrink main workspace correctly. |
| 4 | DS-001/DS-002 | Tests | Add focused composable and layout/source assertions. | Tasks 1-3. | Proves acceptance criteria. |

### File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action | Verification |
| --- | --- | --- | --- | --- | --- |
| Right panel state and clamp policy | `autobyteus-web/composables/useRightPanel.ts` | Same | Frontend layout composable | Modify | `composables/__tests__/useRightPanel.spec.ts` |
| Desktop center/right split DOM | `autobyteus-web/components/layout/WorkspaceDesktopLayout.vue` | Same | Workspace desktop layout | Modify | `components/layout/__tests__/WorkspaceDesktopLayout.spec.ts` |
| Outer shell main flex item | `autobyteus-web/layouts/default.vue` | Same | App shell layout | Modify | `layouts/__tests__/default.spec.ts` |

### Implementation Work Table (Primary Tracker)

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action | Depends On | Implementation Status | Unit Test File | Unit Test Status | Integration Test File | Integration Test Status | Stage 8 Review Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | DS-002, DS-003 | `useRightPanel.ts` | Preferred/actual width clamp state | `autobyteus-web/composables/useRightPanel.ts` | Same | Modify | Stage 5 Go | Completed | `autobyteus-web/composables/__tests__/useRightPanel.spec.ts` | Passed | N/A | N/A | Planned | Public `rightPanelWidth` now reports actual clamped display width. |
| C-002 | DS-001 | `WorkspaceDesktopLayout.vue` | Container measurement and flex guards | `autobyteus-web/components/layout/WorkspaceDesktopLayout.vue` | Same | Modify | C-001 | Completed | `autobyteus-web/components/layout/__tests__/WorkspaceDesktopLayout.spec.ts` | Passed | N/A | N/A | Planned | Added container measurement, data-test hooks, and shrink/clipping guards. |
| C-003 | DS-001 | `layouts/default.vue` | Outer main shrink guard | `autobyteus-web/layouts/default.vue` | Same | Modify | C-002 | Completed | `autobyteus-web/layouts/__tests__/default.spec.ts` | Passed | N/A | N/A | Planned | Added `min-w-0` to main content classes. |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | AC-001, AC-003 | DS-001, DS-002 | Solution Sketch | UC-001/UC-003 | C-001/C-002 | Unit/component | AV-001/AV-003 |
| R-002 | AC-001 | DS-001 | Solution Sketch | UC-001 | C-002 | Component/source | AV-001 |
| R-003 | AC-002 | DS-001, DS-002 | Solution Sketch | UC-002 | C-001 | Unit | AV-002 |
| R-004 | AC-004 | DS-001 | Solution Sketch | UC-001 | C-002/C-003 | Component/source | AV-004 |
| R-005 | AC-005 | DS-001/DS-002/DS-003 | Test Strategy | UC-001/UC-002/UC-003 | C-001/C-002/C-003 | Focused Vitest | AV-005 |

### Stage 7 Planned Coverage Mapping (Input Only)

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level | Initial Status |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | R-001/R-002 | DS-001 | Actual width clamps to container max. | AV-001 | E2E-equivalent unit | Planned |
| AC-002 | R-003 | DS-001/DS-002 | Preferred width restores when container grows. | AV-002 | E2E-equivalent unit | Planned |
| AC-003 | R-001/R-003 | DS-002 | Direct drag keeps normal min when feasible. | AV-003 | Unit | Planned |
| AC-004 | R-004 | DS-001 | Layout has shrink/clipping guards. | AV-004 | Component/source | Planned |
| AC-005 | R-005 | All | Focused tests pass. | AV-005 | Executable validation | Planned |

### Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No planned`
- Shared data structures remain tight: `Yes`
- Shared design-principles guidance reapplied during implementation: `Yes`
- Authoritative Boundary Rule preserved: `Yes by design`
- Decoupling impact assessment completed: `Yes for design basis`
- New tight coupling or cyclic dependency introduced: `No planned`
- Changed source implementation files kept within proactive size-pressure guardrails: `Yes; effective non-empty counts are 103 (`useRightPanel.ts`), 112 (`WorkspaceDesktopLayout.vue`), and 108 (`default.vue`), with source diffs below the 220-line delta gate.`

### Test Strategy

- Unit tests:
  - `autobyteus-web/composables/__tests__/useRightPanel.spec.ts`
  - Validate clamp to max, restoration from preferred width, and direct-drag min clamp.
- Component/source tests:
  - `autobyteus-web/components/layout/__tests__/WorkspaceDesktopLayout.spec.ts`
  - `autobyteus-web/layouts/__tests__/default.spec.ts`
  - Validate data-test hooks/classes for shrink and clipping guards.
- Stage 7 handoff notes:
  - Dependency setup needed in fresh ticket worktree before executing Vitest because initial probe found no local `node_modules`.

## Execution Tracking (Update Continuously)

### Kickoff Preconditions Checklist

- Workflow state is current: `Yes`
- `workflow-state.md` shows `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: `Yes`
- Scope classification confirmed: `Small`
- Investigation notes are current: `Yes`
- Requirements status is `Design-ready` or `Refined`: `Yes`
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: `Yes`
- Future-state runtime call stack review reached `Go Confirmed`: `Yes`
- No unresolved blocking findings: `Yes`

### Progress Log

- 2026-05-13: Stage 3 small-scope solution sketch created. Source code edits remain locked.
- 2026-05-13: Stage 5 review reached Go Confirmed after two clean rounds; baseline finalized for Stage 6 source implementation.
- 2026-05-13: Dependency setup completed with `pnpm install --frozen-lockfile`; generated Nuxt types with `pnpm -C autobyteus-web exec nuxi prepare` after the first focused test run failed due missing `.nuxt/tsconfig.json`.
- 2026-05-13: Source implementation completed in `useRightPanel.ts`, `WorkspaceDesktopLayout.vue`, and `layouts/default.vue`; focused tests added/updated.
- 2026-05-13: Focused Stage 6 verification passed: `pnpm -C autobyteus-web exec vitest run composables/__tests__/useRightPanel.spec.ts components/layout/__tests__/WorkspaceDesktopLayout.spec.ts layouts/__tests__/default.spec.ts --reporter=dot` (3 files, 15 tests passed).
- 2026-05-13: An initial patch application targeted the parent checkout instead of the ticket worktree; those parent-checkout edits were reverted immediately before applying the same changes in this ticket worktree. No parent-checkout changes remain.

### Scope Change Log

| Date | Previous Scope | New Scope | Trigger | Required Action |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A |


### Stage 6 Completion Summary

- Source changes completed:
  - `autobyteus-web/composables/useRightPanel.ts`: introduced preferred-vs-actual right-panel width and container-aware clamping.
  - `autobyteus-web/components/layout/WorkspaceDesktopLayout.vue`: registers container width through `ResizeObserver`, renders the clamped width, and adds shrink/clipping guards/data-test hooks.
  - `autobyteus-web/layouts/default.vue`: adds `min-w-0` to the outer main shell flex item.
- Tests added/updated:
  - `autobyteus-web/composables/__tests__/useRightPanel.spec.ts`
  - `autobyteus-web/components/layout/__tests__/WorkspaceDesktopLayout.spec.ts`
  - `autobyteus-web/layouts/__tests__/default.spec.ts`
- Stage 6 verification command:
  - `pnpm -C autobyteus-web exec vitest run composables/__tests__/useRightPanel.spec.ts components/layout/__tests__/WorkspaceDesktopLayout.spec.ts layouts/__tests__/default.spec.ts --reporter=dot`
- Stage 6 verification result:
  - Pass: 3 test files, 15 tests.
- Modernization / cleanup:
  - No compatibility wrappers or legacy dual paths added.
  - No obsolete in-scope code retained.
- Size guardrails:
  - `useRightPanel.ts`: 103 effective non-empty lines; diff +68/-7.
  - `WorkspaceDesktopLayout.vue`: 112 effective non-empty lines; diff +45/-5.
  - `default.vue`: 108 effective non-empty lines; diff +1/-1.
  - No changed source implementation file exceeds 500 lines or the 220-line delta gate.


### Stage 7 Status Pointer

- Artifact: `tickets/in-progress/right-panel-resizer-visibility/api-e2e-testing.md`
- Result: Pass
- Evidence: Focused Vitest command passed again in Stage 7 (3 files, 15 tests).
