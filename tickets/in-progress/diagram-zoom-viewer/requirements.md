# Diagram Zoom Viewer Requirements

## Status

`Refined` — approved by the user on 2026-07-20, with the interaction simplified around the normal click-first journey.

## Goal / Problem Statement

Detailed Mermaid diagrams rendered inside frontend Markdown can be scaled down until their labels and relationships are unreadable, as shown in the supplied conversation screenshots. Improve the shared Mermaid experience so the inline diagram uses its available space and every successfully rendered diagram can be opened in a large, zoomable, pannable inspection view without disrupting the surrounding conversation or Markdown document.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | A fenced `mermaid` or `mmd` block is rendered as an inline SVG. The wrapper fits the message, but detailed diagrams can remain too small to read and there is no inspection action. | The successful inline preview uses the available content width up to the diagram's intrinsic limit, exposes an obvious expand action, and opens a large diagram viewer from the action or a non-interactive part of the preview. | The diagram stays inline in normal Markdown flow, never forces the message wider than its container, and keeps its generated content unchanged. | REQ-001, REQ-002; AC-001–AC-004 |
| BEH-002 | Mermaid-generated links can remain interactive; HTTP(S) clicks bubble through the shared Markdown renderer's existing external-link route. | Diagram expansion does not steal clicks from links or other interactive SVG descendants, in either inline or expanded mode. | Existing link routing and Electron/browser behavior remain unchanged. | REQ-006; AC-011 |
| BEH-003 | The Mermaid component shows localized loading feedback, a visible error state on failure, and re-renders when its source changes. | Inspection controls exist only for a successful current render; loading and error states remain clear and cannot open an empty/stale viewer. | Existing loading, failure reporting, source-change rendering, and non-diagram Markdown rendering remain unchanged. | REQ-007; AC-012 |
| BEH-004 | The shared `MarkdownRenderer` is used in agent messages, inter-agent/team messages, task/detail surfaces, Markdown file previews, and other rich-text surfaces. | The improved Mermaid interaction is available consistently wherever the shared renderer produces a Mermaid diagram. | Consumers do not acquire diagram-specific state or duplicate the interaction. | REQ-008; AC-013 |
| BEH-005 | No current supported expanded Mermaid inspection path exists. | A modal viewer opens fitted to the available viewport, then supports deliberate zoom, pan, reset/fit, and dismissal while preserving the user's place. | No message, Markdown source, or persisted data is changed. | REQ-003–REQ-005, REQ-009; AC-005–AC-010, AC-014 |

## Investigation Findings

- `useMarkdownSegments.ts` recognizes only fenced `mermaid` and `mmd` blocks for diagram segments.
- `MarkdownRenderer.vue` delegates those segments to `MermaidDiagram.vue`; the latter is the correct shared owner of Mermaid-specific presentation and interaction.
- `MermaidDiagram.vue` currently renders loading/error/success states and applies only `max-width: 100%; height: auto` to the generated SVG. Its flex child does not explicitly occupy the available inline width, and there is no expand or zoom UI. Its hover state and container ref are currently unused.
- Mermaid 11.12.3 emits responsive SVGs with `width="100%"`, an intrinsic `max-width`, and a `viewBox` for diagram types using its maximum-width path. The host wrapper must therefore provide a coherent width, but even a properly fitted high-aspect-ratio diagram still needs an inspection mode for readable details.
- The existing `FullScreenImageModal.vue` demonstrates that full-screen zoom and pan are familiar concepts in the app, but it is image-URL-specific and includes copy/download/gallery behavior that is not appropriate for live Mermaid SVG. It should not be repurposed as the diagram owner.
- The shared Markdown renderer has many consumers, so solving the issue inside the Mermaid rendering boundary gives consistent behavior without changes to conversation, team, task, or file-preview parents.

See the intended interaction contract in [ui-ux-spec.md](./ui-ux-spec.md).

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-zoom-viewer/tickets/in-progress/diagram-zoom-viewer/ui-ux-spec.md` | UI/UX specification for inline sizing, expanded viewing, zoom/pan, responsive states, and accessibility | REQ-001–REQ-009 | AC-001–AC-014 | `Requirements-ready` / user approval pending | Defines the intended user-visible behavior and is part of the requirements basis. |

## Design Health Assessment (Mandatory)

- Change posture: `Feature` / `Behavior Change`
- Initial design issue signal: `Yes`, local to the Mermaid presentation boundary.
- Root cause classification: `Missing Invariant`
- Refactor posture: `Likely Not Needed`
- Evidence basis: The shared Mermaid owner already receives the source, owns render lifecycle, and is used by all relevant Markdown surfaces. The missing invariant is that a successfully rendered detailed diagram must remain inspectable. A local width omission contributes to the poor inline use of space. No parent consumer, API, persisted model, or cross-subsystem ownership change is needed.
- Requirement or scope impact: Add inspection behavior inside the shared Mermaid rendering boundary; do not generalize or alter the image/gallery modal, Markdown parsing, message state, or persisted content.

## Recommendations

Use a clean, click-first two-level experience:

1. Keep a stable, full-width inline preview so the conversation/document remains scannable.
2. Add a clearly visible expand control and allow a click on non-interactive diagram space to open an overlay viewer.
3. Make the normal journey obvious: open -> click `−` or `+` -> drag only when needed -> click `Fit` for the overview -> press `Escape` or click close to leave.
4. Keep only four persistent viewer actions: zoom out, fit, zoom in, and close. Do not add a percentage selector, minimap, mode switcher, or other advanced chrome. Wheel/trackpad zoom and keyboard shortcuts remain secondary conveniences rather than the interface users must learn.
5. Treat focus behavior, interactive Mermaid descendants, mobile sizing, and state reset as first-class acceptance criteria rather than optional polish.

## Scope Classification

`Medium`

## In-Scope Use Cases

- UC-001: Read a Mermaid diagram inline without it being needlessly constrained by an auto-sized wrapper.
- UC-002: Open a successfully rendered Mermaid diagram from a conversation, team/task message, or Markdown preview.
- UC-003: Zoom and pan a detailed diagram until labels and relationships are readable.
- UC-004: Reset to a fitted overview and close the viewer, returning to the same source context.
- UC-005: Use the viewer with keyboard, mouse/trackpad, and narrow/touch layouts.
- UC-006: Follow an interactive link inside a Mermaid diagram without accidentally opening or closing the viewer.

## Out of Scope

- Changing agent prompts or Mermaid source generation.
- Adding support for non-Mermaid diagram syntaxes.
- Editing Mermaid source or diagram nodes.
- Export, copy, download, minimap, search, or presentation mode.
- Correcting the pre-existing Mermaid dark-theme TODO.
- Redesigning the generic image/gallery modal.
- Persisting diagram viewer zoom or pan state across openings, navigation, or reloads.

## Functional Requirements

- **REQ-001 — Inline use of space:** A successful Mermaid preview must participate in the full available Markdown content width while respecting the SVG's intrinsic maximum and never widening its parent surface.
- **REQ-002 — Discoverable expansion:** Every successful Mermaid preview must expose a persistent, localized expand control. Activating that control, or clicking/tapping a non-interactive area of the preview, opens the expanded viewer. Loading and error states do not expose the action.
- **REQ-003 — Fitted expanded view:** The expanded viewer must occupy nearly the full application viewport, keep its toolbar usable, and initially fit the complete diagram within the available canvas.
- **REQ-004 — Zoom:** The viewer must provide persistent zoom-in and zoom-out controls. Mouse wheel/trackpad input over the canvas must zoom around the interaction point. The supported range must include the fitted overview and at least 4× enlargement from that fitted state, with clamping at both ends.
- **REQ-005 — Pan, fit/reset, and clean state:** When enlarged content exceeds the canvas, the user must be able to pan it by pointer/touch drag and native scrolling. A persistent fit/reset control must restore the complete-diagram overview and origin. Each new opening starts fitted rather than inheriting prior view state.
- **REQ-006 — Preserve diagram interaction:** Activation originating from a Mermaid link or another interactive descendant must keep that descendant's existing behavior and must not be reinterpreted as expand/pan/dismiss.
- **REQ-007 — Render lifecycle:** Existing loading, error, and source-change behavior must remain intact. The viewer must display only the current successfully rendered SVG and close or otherwise cease showing stale content if that render becomes unavailable.
- **REQ-008 — Shared coverage:** The behavior must be implemented once in the shared Mermaid rendering path and be available to all existing `MarkdownRenderer` consumers without consumer-specific wiring.
- **REQ-009 — Accessibility, localization, and responsive behavior:** All new labels must be localized in English and Simplified Chinese. The viewer must be an appropriately named modal, trap focus while open, support keyboard zoom/fit/dismiss actions, return focus to the initiating control, prevent background interaction/scroll, and keep controls usable at narrow widths and at 200% browser/app text zoom.

## Acceptance Criteria

- **AC-001:** Given a successfully rendered Mermaid diagram whose intrinsic width is at least the Markdown content width, its inline wrapper occupies the available content width and the diagram is fitted without horizontal page/message overflow.
- **AC-002:** Given a diagram narrower than its available content area, the inline view respects Mermaid's intrinsic maximum instead of stretching a simple diagram disproportionately.
- **AC-003:** A visible localized expand button appears only on a successful diagram and has an accessible name; it does not depend on hover to be discoverable.
- **AC-004:** Clicking/tapping either the expand button or a non-interactive area of the rendered preview opens the same viewer; keyboard activation of the button does likewise.
- **AC-005:** On open, the overlay is above the workspace chrome, the whole diagram is visible within the canvas, and the close, zoom-out, zoom-in, and fit/reset controls are visible without hover.
- **AC-006:** Repeated zoom-in and zoom-out input changes the rendered diagram scale, remains within the configured bounds, and permits at least four times the fitted scale.
- **AC-007:** Wheel/trackpad zoom keeps the interaction point approximately stable rather than jumping to an unrelated edge of the diagram.
- **AC-008:** At a scale that exceeds the canvas, mouse/pointer drag, touch drag, and scrollbars/native scroll allow the user to reach content beyond every canvas edge without selecting diagram text as a drag side effect.
- **AC-009:** Fit/reset returns the complete diagram to view, resets pan to its origin, and exposes a clear fitted state.
- **AC-010:** Close control, `Escape`, and backdrop activation dismiss the viewer; the source page/message retains its scroll position; focus returns to the initiating expand control; reopening starts in the fitted state.
- **AC-011:** Activating an HTTP(S) link generated inside a Mermaid diagram follows the existing Markdown external-link path and does not open/dismiss the viewer. The same non-interference rule applies to any other interactive SVG descendant.
- **AC-012:** During loading or after a render error, no empty expand control or viewer is available; existing localized loading feedback and error content remain visible. When source content re-renders successfully, the action targets the current SVG.
- **AC-013:** The same successful-render interaction is observable through at least one conversation Markdown surface and one non-conversation `MarkdownRenderer` consumer such as a Markdown file preview, with no diagram-specific parent changes.
- **AC-014:** At a narrow 360 CSS-pixel viewport and at 200% text zoom, the dialog toolbar remains reachable, controls do not overlap, the canvas retains usable space, keyboard focus stays inside the open modal, and background scrolling/activation is blocked.

## Constraints / Dependencies

- Vue 3 / Nuxt component architecture and the existing Mermaid 11.12.3 render service remain authoritative.
- New interaction belongs under `components/conversation/segments/renderer/`, despite that historical path being reused outside conversations; moving the shared renderer subsystem is out of scope.
- Reuse the already-rendered SVG markup; do not convert it to a raster image or data URL, because that would discard live SVG semantics and introduce irrelevant image-modal actions.
- New icons must use the project's existing `@iconify/vue` dependency.
- New user-facing strings must use the current localization catalogs, not hard-coded English.
- The modal must be teleported above constrained/overflowing parent surfaces.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Existing message text and Markdown files containing Mermaid fences.
- Required outcome: `Not Affected`
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve all source text unchanged; viewer state remains ephemeral.
- Unacceptable data loss or corruption: Any mutation of message/Markdown content or persisted conversation state.
- Relevant availability, maintenance-window, or rollout constraints: None.
- Related requirement and acceptance-criteria IDs: REQ-007, REQ-008; AC-012–AC-013.

## Assumptions

- The supplied screenshots represent supported Mermaid rendering through `MarkdownRenderer`.
- “Zoom” means diagram-local zoom in an expanded viewer, not browser- or application-wide zoom.
- The inline preview should remain an overview rather than becoming a permanently large canvas that pushes subsequent conversation content far down the page.

## Risks / Open Questions

- No blocking requirement question remains. Exact toolbar styling and internal scale-step constants may be tuned during implementation as long as the observable requirements above hold.
- Mermaid SVG may include internal IDs and links. The design must avoid simultaneously mounting duplicate SVG markup with colliding IDs and must preserve interactive descendants.
- Pointer-centered zoom and focus containment need executable browser validation; component-only assertions are insufficient evidence for those behaviors.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| REQ-001 | UC-001 |
| REQ-002 | UC-002, UC-006 |
| REQ-003 | UC-002, UC-003 |
| REQ-004 | UC-003, UC-005 |
| REQ-005 | UC-003, UC-004, UC-005 |
| REQ-006 | UC-006 |
| REQ-007 | UC-001, UC-002 |
| REQ-008 | UC-001, UC-002 |
| REQ-009 | UC-002–UC-005 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance-Criteria IDs | Scenario Intent |
| --- | --- |
| AC-001–AC-002 | Inline responsive sizing for complex and simple diagrams |
| AC-003–AC-005 | Discoverable opening and fitted viewer presentation |
| AC-006–AC-009 | Zoom, focal stability, pan, and reset |
| AC-010 | Dismissal, context preservation, and state reset |
| AC-011 | Mermaid link/non-expand interaction preservation |
| AC-012 | Loading/error/source-update lifecycle |
| AC-013 | Shared renderer coverage across production consumers |
| AC-014 | Narrow layout, text zoom, focus, and background isolation |

## Approval Status

Approved by the user on 2026-07-20. The approval specifically favors the recommended interaction while requiring a clean, usable, non-complicated experience centered on visible zoom buttons. The normal reset action is the visible `Fit` button; `Escape` follows the conventional behavior of closing the expanded viewer rather than silently changing zoom.
