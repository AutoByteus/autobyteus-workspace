# Diagram Zoom Viewer Requirements

## Status

`Refined` — original inspection behavior approved on 2026-07-20; visual-chrome requirements revised from the user's live Electron verification on 2026-07-20. The revised intent is explicit: compact, hover-adaptive inline affordance; uniform icon-only viewer controls; no layout space consumed by inline chrome.

## Goal / Problem Statement

Detailed Mermaid diagrams rendered inside frontend Markdown can be scaled down until their labels and relationships are unreadable. The implemented inspection viewer solves the functional readability problem, but live Electron review exposed avoidable visual friction: the inline expand button is always visible, visually oversized, and consumes its own row; the viewer's `Fit diagram` control is a much wider text button than its neighboring icon controls. Deliver a clean, familiar diagram experience whose chrome stays subordinate to the content while remaining discoverable and accessible across pointer, keyboard, and touch input.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | The candidate implementation renders the successful inline preview full-width, but a bordered 44×44 expand button is always visible in a dedicated flex row above the SVG. It adds blank vertical space and competes visually with the diagram. | On hover-capable fine-pointer devices, a compact floating expand affordance overlays the preview only while the preview is hovered or the control has keyboard focus. It reserves no layout height. On coarse/no-hover devices it remains visibly available in a compact touch-safe form. Non-interactive preview activation remains an equivalent entry path. | The diagram stays inline in normal Markdown flow, never forces the message wider than its container, respects its intrinsic maximum, and keeps generated content unchanged. | REQ-001, REQ-002, REQ-010; AC-001–AC-004, AC-015–AC-016, AC-018 |
| BEH-002 | Mermaid-generated links remain interactive and use the shared Markdown renderer's existing external-link route in inline and expanded views. | Chrome refinement does not steal clicks from links or other interactive SVG descendants. | Existing link routing and Electron/browser behavior remain unchanged. | REQ-006; AC-011 |
| BEH-003 | The Mermaid component shows localized loading/error states, re-renders on source change, and exposes viewer entry only for the current successful SVG. | The refined control visibility applies only to a successful current render; loading and error states cannot expose empty/stale chrome. | Existing loading, failure reporting, source-change rendering, and non-diagram Markdown rendering remain unchanged. | REQ-007; AC-012 |
| BEH-004 | The shared `MarkdownRenderer` supplies the candidate viewer to agent, team/task, and Markdown-preview surfaces. | The visual refinement remains centralized and consistent wherever the shared renderer produces a Mermaid diagram. | Consumers do not acquire diagram-specific state or duplicate the interaction. | REQ-008; AC-013 |
| BEH-005 | The candidate modal opens fitted and supports zoom, pan, fit/reset, and dismissal. Its header exposes three square icon buttons plus a significantly wider `Fit diagram` text button. | The same four actions remain persistently available as a compact, visually consistent icon-only toolbar: zoom out, fit-to-view, zoom in, and close. Fit uses the conventional inward-corners icon paired semantically with the outward-corners expand icon; localized names remain available to assistive technology and native hover titles/tooltips. | Zoom geometry, pan, fitted reset, focus containment/return, body lock, dismissal, current-SVG ownership, and ephemeral state remain unchanged. | REQ-003–REQ-005, REQ-009–REQ-010; AC-005–AC-010, AC-014, AC-017–AC-018 |

## Investigation Findings

- `useMarkdownSegments.ts` -> `MarkdownRenderer.vue` -> `MermaidDiagram.vue` -> `mermaidService.ts` remains the shared Mermaid production path.
- The candidate `MermaidDiagram.vue` places `mermaid-expand-button` before the SVG inside a `flex-col` success shell. `mb-2`, `min-h-11`, `min-w-11`, and `self-end` make it an always-visible 44×44 control in its own row; this directly explains the live screenshot's blank strip.
- The candidate `MermaidDiagramViewer.vue` gives all actions a 44×44 base, then adds `min-w-fit`, horizontal padding, and a visible `<span>` only to Fit. This directly explains the inconsistent wide pill seen in live Electron.
- Functional zoom/pan/link/focus behavior already passed prior source review and API/E2E. This rework is a presentation correction inside the same two Mermaid components, plus proportional updates to tests and durable documentation.
- Accessibility hit area and visible chrome size are different concerns. The refined design can use a compact visible surface while retaining a comfortably operable target, especially for touch/coarse-pointer layouts.

See the authoritative interaction and visual contract in [ui-ux-spec.md](./ui-ux-spec.md).

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-zoom-viewer/tickets/done/diagram-zoom-viewer/ui-ux-spec.md` | UI/UX specification for adaptive inline chrome, compact viewer controls, zoom/pan journeys, responsive states, and accessibility | REQ-001–REQ-010 | AC-001–AC-018 | `Refined` / user-directed revision on 2026-07-20 | Defines intended user-visible behavior and is part of the approved requirements basis. |

## Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` / `UI Quality Rework`
- Current design issue signal: `Yes`, local to Mermaid presentation.
- Root cause classification: `Local Implementation Defect` caused by an upstream UX invariant that was previously too coarse.
- Refactor posture: `Not Needed`
- Evidence basis: The correct shared owners, viewer lifecycle, geometry boundary, and external-link return path are already implemented and validated. The defect is that the initial specification equated discoverability/touch target with persistent large visual chrome and permitted the inline action to participate in layout. The live screenshots show the resulting hierarchy and spacing problem.
- Requirement or scope impact: Refine the visual/interaction contract and presentation tests inside `MermaidDiagram.vue` and `MermaidDiagramViewer.vue`. Do not change viewport math, Mermaid rendering, parent consumers, APIs, persistence, or modal ownership.

## Recommendations

Use a clean two-level experience that follows common diagram-viewer behavior:

1. Keep the inline diagram itself primary. On desktop, reveal a small floating expand icon when the pointer enters the preview; hide it again on pointer leave unless it retains keyboard focus.
2. Preserve keyboard and touch discoverability: focus reveals the same control, and coarse/no-hover devices keep the compact control visible. The whole non-interactive preview remains clickable/tappable.
3. Reserve zero diagram layout space for the floating affordance; it may overlay a small safe corner of the preview and must not introduce a blank toolbar row.
4. In the modal, show four equal icon-only controls: `−`, fit-to-view, `+`, and close. Keep their localized accessible labels/titles, but do not render the `Fit diagram` text inside the toolbar.
5. Keep the normal journey unchanged and obvious: open -> click `−` or `+` -> drag only when needed -> click the fit icon for the overview -> press `Escape` or close to leave.
6. Require rendered inspection, not class-only reasoning, before implementation handoff.

## Scope Classification

`Medium` — core logic is already implemented, but the shared and input-adaptive frontend presentation still requires realistic visual/browser verification.

## In-Scope Use Cases

- UC-001: Read a Mermaid diagram inline without needless width constraint or permanent control-row whitespace.
- UC-002: Discover and open a successfully rendered diagram with mouse, keyboard, or touch.
- UC-003: Zoom and pan a detailed diagram until labels and relationships are readable.
- UC-004: Reset to a fitted overview and close the viewer, returning to the same source context.
- UC-005: Use the viewer with keyboard, mouse/trackpad, and narrow/touch layouts.
- UC-006: Follow an interactive link inside a Mermaid diagram without accidentally opening or closing the viewer.
- UC-007: Use compact, visually consistent diagram chrome that does not overpower the content.

## Out of Scope

- Changing agent prompts or Mermaid source generation.
- Adding support for non-Mermaid diagram syntaxes.
- Editing Mermaid source or diagram nodes.
- Export, copy, download, minimap, search, percentage display, or presentation mode.
- Correcting the pre-existing Mermaid dark-theme TODO.
- Redesigning the generic image/gallery modal.
- Persisting diagram viewer zoom or pan state.
- Refactoring validated zoom geometry, external-link routing, or modal ownership without evidence of a separate defect.

## Functional Requirements

- **REQ-001 — Inline use of space:** A successful Mermaid preview must participate in the full available Markdown content width while respecting the SVG's intrinsic maximum and never widening its parent surface. Viewer-entry chrome must not add a dedicated row, alter the SVG's fitted dimensions, or create blank vertical space.
- **REQ-002 — Adaptive, discoverable expansion:** Every successful preview must provide one localized expand control and equivalent non-interactive preview activation. On fine-pointer/hover-capable devices the control is a compact top-right overlay revealed by preview hover or control focus. On coarse/no-hover devices it remains visibly available. Loading/error states expose no action.
- **REQ-003 — Fitted expanded view:** The expanded viewer must occupy nearly the full application viewport, keep its toolbar usable, and initially fit the complete diagram within the available canvas.
- **REQ-004 — Zoom:** The viewer must provide persistent zoom-in and zoom-out controls. Mouse wheel/trackpad input over the canvas must zoom around the interaction point. The supported range must include the fitted overview and at least 4× enlargement, with clamping.
- **REQ-005 — Pan, fit/reset, and clean state:** Enlarged content must remain reachable by pointer/touch drag and native scrolling. A persistent fit-to-view control restores the complete overview and origin. Each opening starts fitted.
- **REQ-006 — Preserve diagram interaction:** Activation from a Mermaid link or another interactive descendant must keep that descendant's existing behavior and must not be reinterpreted as expand/pan/dismiss.
- **REQ-007 — Render lifecycle:** Existing loading, error, and source-change behavior must remain intact. The viewer displays only the current successfully rendered SVG and ceases showing stale content when that render becomes unavailable.
- **REQ-008 — Shared coverage:** The behavior must remain implemented once in the shared Mermaid rendering path and available to all existing `MarkdownRenderer` consumers without consumer-specific wiring.
- **REQ-009 — Accessibility, localization, and responsive behavior:** All action names remain localized in English and Simplified Chinese. The named modal traps focus, supports keyboard zoom/fit/dismiss, returns focus, blocks background interaction/scroll, and stays usable at narrow widths and 200% text zoom. Hover-dependent desktop presentation must have keyboard-focus and no-hover/touch fallbacks.
- **REQ-010 — Refined visual chrome and implementation quality:** Inline and viewer controls must use a coherent compact icon-button treatment, visible hover/pressed/focus/disabled states, and clear semantic icons. The implementation engineer must inspect rendered desktop Electron/browser and narrow/no-hover-equivalent states and record visual evidence that spacing, hierarchy, alignment, and control visibility meet this requirements basis.

## Acceptance Criteria

- **AC-001:** A complex inline diagram uses the available content width without horizontal page/message overflow; viewer-entry chrome adds no separate row or extra vertical gap.
- **AC-002:** A narrower diagram respects Mermaid's intrinsic maximum instead of stretching disproportionately.
- **AC-003:** On a successful diagram, the localized expand button has an accessible name and compact outward-corners icon. On a fine-pointer/hover-capable device it is visually absent at rest, appears when the preview is hovered, remains/reappears on keyboard focus, and hides after pointer leave when it no longer has focus.
- **AC-004:** Button activation and non-interactive preview click/tap open the same viewer; Enter/Space activation does likewise.
- **AC-005:** On open, the overlay is above workspace chrome, the whole diagram is visible, and icon-only zoom-out, fit-to-view, zoom-in, and close controls are visible without viewer hover.
- **AC-006:** Repeated zoom input changes scale within configured bounds and permits at least four times the fitted scale.
- **AC-007:** Wheel/trackpad zoom keeps the interaction point approximately stable.
- **AC-008:** At overflow scale, mouse/pointer drag, touch drag, and native scrolling reach content beyond every canvas edge without text-selection side effects.
- **AC-009:** Fit-to-view returns the complete diagram, resets pan/origin, and exposes a clear fitted/disabled-minimum state.
- **AC-010:** Close, `Escape`, and backdrop activation dismiss; source scroll remains stable; focus returns to the expand button; reopening starts fitted.
- **AC-011:** HTTP(S) links and other interactive SVG descendants retain existing behavior and never trigger expand/dismiss/pan-start.
- **AC-012:** Loading/error states expose no empty control/viewer; successful re-render targets the current SVG.
- **AC-013:** The refined interaction is observable in at least one conversation surface and one non-conversation `MarkdownRenderer` consumer without parent changes.
- **AC-014:** At 360 CSS pixels and 200% text zoom, controls remain reachable, do not overlap, canvas space remains usable, focus stays within the modal, and background scroll/activation is blocked.
- **AC-015:** The desktop inline affordance is absolutely overlaid in the preview's top-right safe area, has zero contribution to normal-flow height, and does not move the diagram when visibility transitions.
- **AC-016:** On coarse-pointer/no-hover input, the inline control does not rely on hover: a compact visible surface remains available with a comfortably operable touch target, and tapping non-interactive diagram space also opens the viewer.
- **AC-017:** The viewer toolbar contains exactly four visually consistent icon-only buttons. Fit uses an inward-corners/fit-to-view glyph and renders no visible text label; each control retains localized `aria-label` and title/tooltip semantics. No action is a uniquely wide pill.
- **AC-018:** Recorded rendered inspection covers (a) desktop resting/hover/focus inline states, (b) the wide viewer toolbar, and (c) narrow/no-hover-equivalent behavior. It confirms no blank inline control row, no diagram layout shift, balanced toolbar alignment, distinguishable states, and coherent light/dark-surface contrast.

## Constraints / Dependencies

- Vue 3 / Nuxt and Mermaid 11.12.3 remain authoritative.
- Changes belong under `components/conversation/segments/renderer/`; moving the shared subsystem is out of scope.
- Reuse the rendered SVG; do not rasterize it.
- Icons use existing `@iconify/vue`; expand/fit use a semantically paired outward/inward icon family where practical.
- User-facing/action names remain in current localization catalogs, even where visible toolbar text is removed.
- The modal remains teleported above constrained parents.
- CSS input-capability behavior must use capability media queries such as `(hover: hover) and (pointer: fine)` with an accessible default/fallback, not user-agent detection.
- Compact visible surfaces must not be achieved by eliminating keyboard focus indication or usable coarse-pointer hit targets.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Existing message text and Markdown files containing Mermaid fences.
- Required outcome: `Not Affected`
- Existing data to preserve: All source text unchanged; viewer state remains ephemeral.
- Unacceptable data loss or corruption: Any mutation of message/Markdown content or persisted conversation state.
- Related IDs: REQ-007–REQ-008; AC-012–AC-013.

## Assumptions

- The four supplied screenshots represent supported Mermaid behavior: two initial unreadable states and two live candidate-implementation states.
- “Compact” means visually subordinate and consistently proportioned, not removal of semantic labels or operable targets.
- Hover adaptation applies only where hover is actually supported; touch/no-hover discovery cannot depend on emulated hover.
- Escape closes the modal; fit-to-view remains a distinct icon action.

## Risks / Open Questions

- No blocking requirement question remains; the user explicitly requested hover reveal and icon-only Fit during live Electron verification.
- A corner overlay may cover diagram content in unusually dense top-right diagrams. Keep the footprint small and position it within preview padding; do not reintroduce a layout row as a workaround.
- Opacity-only hiding can leave a mysterious invisible pointer target. The hidden desktop state should not intercept pointer input until the preview is hovered, while keyboard focus must still reveal it.
- Existing automated tests may encode the superseded persistent-inline-control wording/layout and must be evaluated as stale where they conflict with AC-003/AC-015–AC-018.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-007 |
| REQ-002 | UC-002, UC-005–UC-007 |
| REQ-003 | UC-002–UC-003 |
| REQ-004 | UC-003, UC-005 |
| REQ-005 | UC-003–UC-005 |
| REQ-006 | UC-006 |
| REQ-007 | UC-001–UC-002 |
| REQ-008 | UC-001–UC-002 |
| REQ-009 | UC-002–UC-005, UC-007 |
| REQ-010 | UC-001–UC-003, UC-005, UC-007 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance-Criteria IDs | Scenario Intent |
| --- | --- |
| AC-001–AC-002, AC-015 | Inline sizing, zero control-row space, and no layout shift |
| AC-003–AC-005, AC-016 | Adaptive mouse/keyboard/touch opening and fitted presentation |
| AC-006–AC-009 | Zoom, focal stability, pan, and reset |
| AC-010 | Dismissal, context preservation, and state reset |
| AC-011 | Link/non-expand interaction preservation |
| AC-012 | Loading/error/source-update lifecycle |
| AC-013 | Shared renderer coverage |
| AC-014, AC-018 | Narrow, text-scaled, focus/background, and rendered visual-quality validation |
| AC-017 | Consistent icon-only modal toolbar |

## Approval Status

The original functional requirements were approved on 2026-07-20. The user then performed live Electron verification on the same date and explicitly directed this refinement: the inline maximize action should appear on pointer hover rather than remain as a large permanent row, the visual treatment should be compact and polished, and Fit should be an icon consistent with the other viewer controls. This message is the approval basis for the revised intent; architecture review is required again before implementation resumes.
