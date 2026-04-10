# Requirements

- Ticket: `artifact-maximize-button`
- Status: `Design-ready`
- Last Updated: `2026-04-10 11:28:07 CEST`

## Goal / Problem Statement

Add a maximize button to the artifact content area so it matches the file explorer content viewer experience when opening a file like `README.md`.

The file explorer content pane exposes a maximize or zen-mode control, but the artifact content pane does not. This creates an inconsistent viewing experience for similar read and review workflows.

## In-Scope Use Cases

| Use Case ID | Description |
| --- | --- |
| `UC-001` | User selects an artifact in the `Artifacts` tab and wants to maximize the content pane for focused reading or review. |
| `UC-002` | User restores a maximized artifact viewer back to the split-pane layout without losing the selected artifact or current view mode. |
| `UC-003` | User views artifact states such as loading, pending, deleted, unsupported preview, or loaded content while maximize is available only when an artifact is selected. |

## Requirements

| Requirement ID | Description | Covered Use Case IDs |
| --- | --- | --- |
| `R-001` | The artifact content viewer must expose a maximize control in its header whenever an artifact is selected. | `UC-001` |
| `R-002` | Entering maximize mode from the artifact content viewer must present a full-view overlay interaction consistent with the file explorer viewer, including a visible restore or close affordance and `Escape` exit behavior. | `UC-001`, `UC-002` |
| `R-003` | Existing artifact header controls, especially edit and preview mode toggles for supported text artifacts, must remain available and continue to work in both normal and maximized states. | `UC-001`, `UC-002` |
| `R-004` | The maximize implementation must not reuse file explorer maximize state in a way that causes cross-tab display-state bleed between Files and Artifacts. | `UC-001`, `UC-002` |
| `R-005` | The change must preserve existing artifact rendering states for empty, loading, deleted, pending, unsupported-preview, and loaded content flows. | `UC-003` |

## Acceptance Criteria

| Acceptance Criteria ID | Requirement ID | Expected Outcome |
| --- | --- | --- |
| `AC-001` | `R-001` | With an artifact selected in the `Artifacts` tab, the header shows a maximize button alongside the existing controls. |
| `AC-002` | `R-002` | Clicking maximize renders the artifact viewer in a full-view overlay comparable to the file explorer viewer, and the user can restore via button or `Escape`. |
| `AC-003` | `R-003` | Preview and edit toggles still work for supported text artifacts before and after maximize. |
| `AC-004` | `R-004` | File viewer and artifact viewer maximize state remain independent, so opening Artifacts does not inherit stale Files maximize state. |
| `AC-005` | `R-005` | Existing artifact content states still render correctly after the maximize capability is added. |
| `AC-006` | `R-001`, `R-002`, `R-003`, `R-005` | Targeted automated tests cover the maximize control and at least one restore path while preserving existing viewer behavior. |

## Constraints

- Base branch must be `origin/personal`.
- The current `personal` worktree is dirty, so work must stay isolated in the dedicated ticket worktree.

## Assumptions

- The existing file explorer maximize interaction is the reference behavior for visual and interaction parity.
- A dedicated artifact display-mode store is acceptable and lower risk than generalizing the file explorer store in this ticket.
- Localized tooltip copy is optional for this UX fix if the repo already tolerates hardcoded maximize titles in adjacent viewers.

## Open Questions / Risks

- The repository contains both localized and hardcoded maximize button titles in nearby components; this ticket will minimize scope unless localization becomes necessary for consistency tests.
- Teleported overlays must clean up maximized state on unmount so stale UI state does not persist when the tab changes.

## Requirement To Use-Case Coverage

| Requirement ID | Use Case IDs | Acceptance Criteria IDs |
| --- | --- | --- |
| `R-001` | `UC-001` | `AC-001`, `AC-006` |
| `R-002` | `UC-001`, `UC-002` | `AC-002`, `AC-006` |
| `R-003` | `UC-001`, `UC-002` | `AC-003`, `AC-006` |
| `R-004` | `UC-001`, `UC-002` | `AC-004` |
| `R-005` | `UC-003` | `AC-005`, `AC-006` |

## Acceptance Criteria To Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| `AC-001` | Artifact header renders a maximize button when an artifact exists. |
| `AC-002` | Maximize enters overlay mode and restore exits it, including `Escape`. |
| `AC-003` | Text artifact edit and preview toggles remain operational in both layout states. |
| `AC-004` | Artifact maximize state is scoped independently from file viewer maximize state. |
| `AC-005` | Existing artifact state branches continue to render the same user-facing content. |
| `AC-006` | Automated tests prove maximize/restore behavior without regressing artifact rendering. |

## Scope Classification

- Confirmed Scope: `Small`
