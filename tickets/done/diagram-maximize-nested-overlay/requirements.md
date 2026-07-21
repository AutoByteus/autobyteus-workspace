# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — approved by the user on 2026-07-21.

## Goal / Problem Statement

Fix the nested diagram-maximize interaction reached from a maximized Markdown artifact or other supported maximized Markdown preview. The diagram must appear in its own top overlay above the still-mounted maximized preview, and dismissing that diagram layer must reveal the preview in the maximized state it had before the diagram was opened.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Evidence-backed current behavior | Desired behavior | Must remain unchanged |
| --- | --- | --- | --- |
| `BEH-001` | From a normal Markdown artifact preview, maximizing the artifact produces a full-window artifact surface whose embedded Mermaid diagram remains visible. | Preserve artifact/host maximize and the embedded diagram before the nested action. | Selected artifact/file, content, Preview/Edit mode, and underlying reading context remain owned by the host viewer. |
| `BEH-002` | When diagram maximize is activated inside a maximized artifact, the sole current SVG copy moves from the inline preview into a body-teleported diagram viewer at z-index `100`. The artifact remains above it at z-index `120`, so the viewer is obscured and the source region appears blank. | Render the selected diagram in a visible, usable diagram-specific overlay above the maximized host preview. | The one-current-SVG-copy lifecycle, fitted diagram geometry, zoom/pan/Fit, link handling, and normal non-nested expand path remain unchanged. |
| `BEH-003` | The diagram viewer's explicit close event leaves the artifact maximized, but the current `Escape` event bubbles to the artifact's window listener and closes both layers. | All diagram-overlay dismissal paths close exactly the top diagram layer first; the maximized host remains mounted and maximized until the user separately dismisses it. | After diagram close, the inline SVG is restored and focus/context restoration follows the existing viewer contract. |
| `BEH-004` | The shared Mermaid path is used by conversation Markdown and Markdown file/reference/artifact previews; maximized Files and team-reference hosts also use z-index `120`. Existing durable browser coverage opens diagrams only from non-maximized fixture surfaces. | Apply the corrected diagram-overlay contract consistently wherever the shared Mermaid viewer is opened from a supported maximized Markdown host. | No consumer-specific duplicate Mermaid viewer or parallel maximize implementation is introduced. |

## Investigation Findings

- The bug is reproduced in a real browser-equivalent component chain. The diagram is not missing: the only current SVG exists inside the viewer, but the viewer is painted behind the maximized artifact.
- Direct cause 1: `MermaidDiagramViewer.vue` owns a body-teleported backdrop at `z-[100]`; the artifact, Files, and team-reference maximize shells use `z-[120]`.
- Direct cause 2: the top diagram dialog handles `Escape` with `preventDefault()` but does not stop propagation. The artifact and other maximized host surfaces register global Escape listeners, so the same key reaches both layers.
- Explicit diagram close already preserves the maximized artifact, confirming that the host and diagram states are independently owned; the defect is layer ordering and event containment rather than shared state.
- Current unit/browser coverage validates normal diagram viewer lifecycle, geometry, focus, body lock, and single-level Escape but has no nested maximized-host scenario.
- Detailed retained evidence: `reproduction-evidence.md` and `probe-evidence/`.

## Relevant Supplemental Task Artifacts

- `ui-ux-spec.md` (`Refined`): authoritative intended nested-overlay interaction, state transitions, dismissal semantics, responsive behavior, and accessibility expectations. Approval applicability: Required.
- `reproduction-evidence.md` (`Complete`): current-state browser reproduction and root-cause evidence with raw metrics/screenshots. Approval applicability: N/A.

## Design Health Assessment (Mandatory)

- Change posture: bug fix.
- Root-cause classification: `Missing Invariant` with two local manifestations.
- Missing invariant: a shared top-level diagram dialog must outrank its supported maximized Markdown host and must exclusively consume dismissal input while it is topmost.
- Refactor needed now: no broad overlay-manager refactor. The existing ownership boundaries are healthy: `MermaidDiagramViewer` already owns top-layer presentation, focus/body isolation, and diagram dismissal; each host viewer owns its own maximize state. The correction belongs at the shared diagram-viewer boundary, not in consumer-specific workarounds.
- Residual risk intentionally out of scope: the repository uses manually assigned z-indexes rather than a product-wide overlay-tier abstraction. This task should document and test the concrete supported host/viewer relation, but introducing a general overlay stack would be disproportionate and is not required to remove the current defect.

## Recommendations

1. Correct the shared `MermaidDiagramViewer` layer tier so it is above every supported Markdown host maximize shell (`120`) while remaining below intentionally higher system-critical surfaces.
2. Make a handled diagram-viewer `Escape` stop before it reaches underlying host-level global listeners; one user action must dismiss one layer.
3. Keep the host mounted and its maximize state unchanged while covered. Do not transfer host maximize ownership into Mermaid state.
4. Extend focused component coverage for layer tier/event containment and durable browser coverage with a real nested artifact/host maximize scenario, explicit-close and Escape dismissal, repeated open/close, SVG ownership, focus return, and single-level regression.

## Scope Classification (`Small`/`Medium`/`Large`)

Small — a shared frontend overlay-contract correction with focused unit and browser/E2E coverage.

## In-Scope Use Cases

- `UC-001`: Maximize a Markdown artifact/host preview, then maximize a successfully rendered diagram inside it.
- `UC-002`: Dismiss the nested diagram overlay and continue in the still-maximized artifact/host preview.
- `UC-003`: Separately dismiss the maximized host and return to its underlying workspace surface.
- `UC-004`: Preserve diagram maximize from a non-maximized Markdown surface.
- `UC-005`: Reopen/close the nested diagram viewer without stale backdrop, focus, body-lock, sizing, or SVG state.

## Out of Scope

- Changing Mermaid source parsing, rendering semantics, generated SVG, zoom/pan/Fit geometry, or HTTP link policy.
- Redesigning Files, Artifacts, or team-reference surfaces.
- Introducing a general application-wide modal/overlay stack manager.
- Changing unrelated system overlays at z-index `1000`/`9999` or the VNC fullscreen implementation.
- Adding new diagram navigation capabilities.

## Functional Requirements

- `REQ-001`: Activating diagram maximize inside a supported maximized Markdown host must display the selected diagram in a top overlay rather than leave the source region blank.
- `REQ-002`: The diagram overlay, backdrop, dialog, diagram, and controls must be visually and interactively above the maximized host surface.
- `REQ-003`: While the diagram overlay is open, the host viewer must remain mounted and retain its maximize state, selected content, view mode, and reading context; lower-layer controls must not receive pointer or focus interaction through the top layer.
- `REQ-004`: Diagram close-button, backdrop, and `Escape` dismissal must close only the top diagram overlay and restore the embedded diagram/focus without dismissing the maximized host.
- `REQ-005`: After the diagram overlay closes, a separate host restore/close action or subsequent `Escape` must dismiss the host according to its existing contract.
- `REQ-006`: Diagram maximize must preserve existing behavior when launched from a non-maximized Markdown surface.
- `REQ-007`: The shared Mermaid viewer must enforce this contract for supported Markdown host consumers rather than requiring artifact-only or consumer-specific viewer copies.
- `REQ-008`: The diagram must retain the existing one-current-SVG-copy lifecycle and fitted viewport behavior; it must not disappear because its viewer is obscured, unclickable, or incorrectly sized.
- `REQ-009`: Opening and closing repeatedly must clean up top-layer backdrop, body-scroll lock, focus containment, pointer state, and transient sizing state once per cycle.

## Acceptance Criteria

- `AC-001`: Given a successfully rendered Mermaid diagram in a Markdown artifact, when the artifact is maximized and then the diagram is maximized, one diagram SVG is visibly rendered in a top diagram overlay.
- `AC-002`: In the nested state, computed/observable stacking and pointer hit-testing place the diagram backdrop/dialog above the maximized host; lower host controls cannot receive physical pointer activation through it.
- `AC-003`: While the diagram overlay is open, the host remains mounted and maximized, retains its selected content and Preview mode, and the inline SVG is absent only because the viewer owns the one current copy.
- `AC-004`: Activating the diagram close button dismisses only the diagram overlay, restores exactly one inline SVG, returns focus according to the existing contract, and leaves the host maximized.
- `AC-005`: Pressing `Escape` while the diagram overlay is topmost has the same one-layer result as `AC-004`; it does not also restore/close the host.
- `AC-006`: After `AC-004` or `AC-005`, a distinct host restore action or subsequent `Escape` returns to the underlying workspace surface.
- `AC-007`: Backdrop dismissal closes only the diagram layer and leaves the host maximized.
- `AC-008`: Repeated nested open/close cycles leave no blank diagram region, duplicate/missing SVG, orphaned backdrop, body-scroll lock, hidden control, or stale viewer state.
- `AC-009`: At supported desktop/web viewport sizes and resize conditions, the diagram opens fitted and usable with the existing zoom/pan/Fit controls.
- `AC-010`: Diagram maximize from a non-maximized conversation/file preview retains its current visible viewer, dismissal, focus, body-lock, geometry, link, and SVG-ownership behavior.
- `AC-011`: Durable browser coverage includes the real nested maximize production path and distinguishes explicit diagram dismissal, first `Escape`, and subsequent host dismissal; focused tests cover the layer tier and Escape propagation invariant.

## Constraints / Dependencies

- Reuse `MermaidDiagramViewer` as the authoritative dialog owner and existing Teleport-to-body behavior.
- Preserve `ArtifactContentViewer`/Files/team-reference ownership of their own maximize state.
- Avoid consumer-specific z-index overrides, duplicate viewers, compatibility branches, or dual SVG ownership.
- Preserve current localized labels and existing supported web/Electron-equivalent behavior.
- Implementation-scoped checks may validate the focused components, but API/E2E owns durable production-path browser coverage and broader execution.

## Persisted Data Outcome (When Applicable)

Not applicable; all affected state is transient frontend presentation state.

## Assumptions

- The user's phrase “close the maximize diagram” includes the diagram close button and normal modal dismissal methods, including `Escape` and backdrop where currently supported.
- Browser-equivalent validation is authoritative for this shared Vue rendering and stacking behavior; actual Electron execution is necessary only if downstream evidence finds a desktop-shell-only difference.
- Supported maximized Markdown hosts use the current shared `MarkdownPreviewer -> MarkdownRenderer -> MermaidDiagram -> MermaidDiagramViewer` path.

## Risks / Open Questions

- No blocking requirement question remains.
- Manual z-index conventions can regress if a supported host later moves above the selected diagram-viewer tier; the nested browser scenario must make that relationship executable.
- Focus restoration timing must be checked in the nested production path because the opener remains inside a teleported maximized host.

## Requirement-To-Use-Case Coverage

| Requirement | Use case(s) |
| --- | --- |
| `REQ-001`, `REQ-002`, `REQ-003`, `REQ-007`, `REQ-008` | `UC-001` |
| `REQ-004` | `UC-002` |
| `REQ-005` | `UC-003` |
| `REQ-006` | `UC-004` |
| `REQ-009` | `UC-005` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance criterion | Scenario intent |
| --- | --- |
| `AC-001`, `AC-002`, `AC-003`, `AC-009` | Open a diagram from a real maximized Markdown host and verify visible top-layer ownership and fitted usability. |
| `AC-004`, `AC-007` | Explicit close/backdrop dismiss one layer and restore the inline diagram/focus while preserving the host. |
| `AC-005`, `AC-006` | First Escape closes the diagram only; a separate subsequent dismissal closes the host. |
| `AC-008` | Repeated nested lifecycle and cleanup. |
| `AC-010` | Existing non-nested viewer regression suite. |
| `AC-011` | Durable test intent and coverage ownership. |

## Approval Status

Approved by the user on 2026-07-21 after reviewing the reproduced root cause and proposed layered behavior.
