# Requirements: Right Panel Resizer Visibility

- Status: Design-ready
- Ticket: right-panel-resizer-visibility
- Created: 2026-05-13
- Last Updated: 2026-05-13
- Scope Classification: Small

## Goal / Problem Statement

The desktop workspace has a three-column shell: left app/sidebar, center workspace conversation/team content, and right tabs/tool panel. When the left sidebar is widened, the remaining workspace container narrows. If the right panel has a large preferred width, the center/right split can exceed the available width and the splitter between center and right panel can be clipped or become non-interactable.

The application must keep the center/right splitter visible and usable whenever the right panel is open by constraining the right panel's actual displayed width to the current workspace container while preserving the user's preferred right-panel width for restoration when space returns.

## Requirement IDs

### R-001 — Container-aware right panel display width

The right panel actual display width must be derived from both the user's preferred right-panel width and the available desktop workspace center/right container width.

- Preferred width remains the user's requested width from direct right-panel dragging.
- Actual display width is clamped so the center panel minimum width and the center/right resize handle remain inside the workspace container.
- If the container is too narrow to honor the normal right-panel minimum, the actual display width may temporarily go below the preferred minimum rather than pushing the splitter offscreen.

### R-002 — Left-sidebar resize must reclamp the center/right split

Changing the left sidebar width must cause the workspace center/right split to recompute the actual right-panel display width, because it changes the available workspace container width even though the user did not drag the right splitter.

### R-003 — Preferred width restoration

If the right panel is temporarily clamped because available width shrank, the user's preferred width must be preserved and automatically restored up to the available maximum when the workspace container becomes wider again.

### R-004 — Flex layout must not hide the splitter through min-content overflow

The shell and workspace flex items must explicitly allow horizontal shrink/clipping where appropriate so tab labels or panel content do not impose a min-content width that pushes the splitter out of view.

### R-005 — Validation coverage

Executable validation must cover the right-panel width clamp and at least one layout-level assertion that the desktop workspace shell has the expected shrink/clipping guards.

## In-Scope Use Cases

| Use Case ID | Requirement IDs | Description | Primary User Impact |
| --- | --- | --- | --- |
| UC-001 | R-001, R-002, R-004 | User widens the left sidebar while the right panel is open and has a large preferred width. | Right splitter remains visible/interactable and the right panel shrinks within available space. |
| UC-002 | R-001, R-003 | User later narrows/collapses the left sidebar or the window becomes wider after temporary clamping. | Right panel restores toward the preferred width instead of staying unnecessarily narrow. |
| UC-003 | R-001, R-005 | User directly drags the right splitter smaller/larger. | Right drag still respects the normal minimum when there is enough space and clamps to available maximum when there is not. |

## Acceptance Criteria

| Acceptance Criteria ID | Requirement IDs | Scenario Intent | Expected Outcome | Validation Target |
| --- | --- | --- | --- | --- |
| AC-001 | R-001, R-002 | Given a workspace container width and a preferred right-panel width that would overflow, when the container width is registered/updated, the actual `rightPanelWidth` equals `containerWidth - centerMinWidth - handleWidth` and does not overflow. | The center panel can keep its `200px` minimum and the splitter remains within the container. | Unit/composable test. |
| AC-002 | R-001, R-003 | Given a preferred right-panel width larger than a temporary container max, when the container later grows, the actual `rightPanelWidth` restores up to the preserved preferred width or new max. | Temporary clamp does not permanently discard the user's preferred width. | Unit/composable test. |
| AC-003 | R-001, R-003 | Given enough available width, when the user drags the right splitter smaller than the preferred minimum, the actual width clamps to the normal minimum (`400px`). | Existing right-panel usability minimum is preserved when feasible. | Unit/composable test. |
| AC-004 | R-004 | Given the desktop workspace layout, its root/right-panel flex classes and outer default-layout main classes must include explicit shrink/clipping guards. | Browser flex min-content behavior cannot hide the splitter or force the app main beyond the left sidebar. | Component/source test. |
| AC-005 | R-005 | Focused frontend tests for the changed layout/composable pass. | Validation evidence demonstrates the edge case at code level. | Vitest focused commands. |

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered By Use Case IDs | Notes |
| --- | --- | --- |
| R-001 | UC-001, UC-002, UC-003 | Core clamp behavior. |
| R-002 | UC-001 | Left sidebar resize changes workspace container width. |
| R-003 | UC-002, UC-003 | Restoration and direct drag preference behavior. |
| R-004 | UC-001 | Layout CSS guards keep the splitter inside visible flex bounds. |
| R-005 | UC-001, UC-002, UC-003 | All behavioral requirements have executable targets. |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario ID Intent | Test Level | Notes |
| --- | --- | --- | --- |
| AC-001 | AV-001 | Unit | `useRightPanel` max clamp from registered workspace width. |
| AC-002 | AV-002 | Unit | Preferred width restore when registered workspace width grows. |
| AC-003 | AV-003 | Unit | Direct right drag normal minimum clamp. |
| AC-004 | AV-004 | Component/source | `WorkspaceDesktopLayout` and `default.vue` expose shrink/overflow layout guards. |
| AC-005 | AV-005 | Integration/focused test run | Run focused Vitest files after dependency setup. |

## Constraints / Dependencies

- The center panel existing minimum is `200px` (`min-w-[200px]`) and remains in scope as the minimum center usability width.
- The right splitter existing handle width is `4px` and should be accounted for in width math.
- The right panel's normal direct-drag minimum remains `400px` only when the container can afford it.
- The public returned `rightPanelWidth` from `useRightPanel` should represent actual display width because `BrowserPanel.vue` watches it for host bounds.
- Stage 7 validation currently requires dependency setup in the fresh ticket worktree because `node_modules` is absent.

## Assumptions

- Full backend data is not necessary to validate the layout bug because the faulty behavior is purely frontend geometry/state.
- Keeping the right panel open but narrower under severe constraint is preferable to clipping the splitter out of the visible workspace.
- Adding non-user-visible `data-test` hooks to layout elements is acceptable for durable validation.

## Open Questions / Risks

| Item | Status | Mitigation |
| --- | --- | --- |
| Full manual Electron reproduction may require seeded backend state. | Open but non-blocking. | Validate geometry owner with focused unit/component tests; optionally inspect local app if dependencies/dev server are available. |
| Very narrow desktop widths may not have enough space for the normal `400px` right-panel minimum plus `200px` center. | Addressed by requirements. | Temporarily clamp below the normal minimum to preserve splitter visibility. |

## Confirmed Scope Classification

- Classification: Small
- Reasoning: The fix is localized to one composable and two layout components, with focused frontend tests. It does not change backend contracts, persistent data, or broad navigation behavior.
