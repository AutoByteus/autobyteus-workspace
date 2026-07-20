# Diagram Zoom Viewer UI/UX Specification

## Status

`Refined` — approved by the user on 2026-07-20 with a click-first, minimal-control emphasis.

## UX Goal

Make detailed Mermaid diagrams easy to discover, enlarge, navigate, and dismiss while keeping the inline conversation or Markdown document compact and preserving any links embedded in the diagram.

This specification supports [requirements.md](./requirements.md), especially REQ-001–REQ-009 and AC-001–AC-014.

## Related Requirements And Acceptance Criteria

- Requirements: REQ-001–REQ-009
- Acceptance criteria: AC-001–AC-014

## Users / Personas / Contexts

- Desktop web/Electron user reading a wide architecture or sequence diagram inside an agent response.
- User inspecting Mermaid diagrams in team/task messages or Markdown file previews.
- Keyboard user who cannot depend on pointer hover.
- Narrow-screen/Phone Access user who needs persistent touch-sized controls and drag navigation.
- Low-vision user operating at increased browser/application text scale.

## User-Journey Inventory

| Journey ID | User / Context | Starting State | User Goal | Completion State | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- | --- |
| UXJ-001 | Any Markdown reader | Mermaid diagram rendered successfully inline | Notice and open the inspection experience | Large viewer open in fitted state | REQ-001–REQ-003; AC-001–AC-005 |
| UXJ-002 | Mouse/trackpad user | Viewer open | Enlarge a region and navigate to detail | Desired labels are readable and reachable | REQ-004–REQ-005; AC-006–AC-009 |
| UXJ-003 | Touch/narrow-screen user | Viewer open on a small viewport | Zoom with persistent controls and pan by touch | Desired region is readable without losing controls | REQ-004, REQ-005, REQ-009; AC-006, AC-008, AC-014 |
| UXJ-004 | Keyboard user | Focus on inline expand control | Inspect, adjust, reset, and close without a pointer | Focus returns to source control | REQ-009; AC-003–AC-006, AC-009–AC-010, AC-014 |
| UXJ-005 | User following a diagram link | Inline or expanded diagram contains a link | Activate the link rather than trigger viewer chrome | Existing external-link action occurs | REQ-006; AC-011 |

## Journey Details

### UXJ-001 — Open a diagram

1. A successful Mermaid preview appears inline in normal Markdown flow.
2. A compact expand button is persistently visible in the preview's top-right corner; it has sufficient contrast on light and dark diagram backgrounds.
3. The user activates the button, or clicks/taps a non-interactive diagram area.
4. A near-full-viewport modal opens above the whole workspace.
5. The complete diagram is fitted inside the remaining canvas below/alongside the persistent toolbar.
6. Focus moves into the dialog, preferably to the close control or the first toolbar control according to the final toolbar order.

### UXJ-002 / UXJ-003 — Inspect detail

1. The user activates zoom-in, uses the wheel/trackpad over the canvas, or uses another supported zoom shortcut.
2. The diagram grows while remaining clamped to a safe range; pointer-centered zoom keeps the inspected region stable.
3. When content exceeds the canvas, the cursor communicates panning availability and the user drags or scrolls to another region. Touch drag has the same navigation meaning.
4. The user can activate fit/reset at any time to return to the full overview.

### UXJ-004 — Keyboard-only inspection

1. The user tabs to the inline “Expand diagram” control and presses Enter or Space.
2. Focus enters the named modal and remains within its toolbar/canvas controls while open.
3. The user tabs among close, zoom-out, zoom-in, and fit/reset; visible focus styling remains clear.
4. Supported shortcuts: `+`/`=` zoom in, `-` zoom out, `0` fit/reset, `Escape` close. Shortcuts do not fire while an interactive descendant is handling the same keystroke.
5. Closing restores focus to the initiating expand control and leaves the source scroll position unchanged.

### UXJ-005 — Follow a diagram link

1. The user activates a Mermaid-generated anchor or other interactive descendant.
2. The component does not reinterpret that event as an expand, pan-start, backdrop-close, or reset action.
3. Existing Markdown/Electron external-link routing proceeds unchanged.

## Screen / Surface / Component Inventory

| Surface / Component | Purpose | Entry Conditions | Important States | Exit / Next Action |
| --- | --- | --- | --- | --- |
| Inline Mermaid preview | Keep diagram visible in content flow and provide inspection entry | Mermaid render succeeds | Fitted/simple, fitted/detailed, hover, focus-within | Expand or continue reading |
| Inline expand control | Persistent entry action | Successful SVG available | Default, hover, focus-visible, pressed | Open viewer |
| Diagram viewer backdrop/dialog | Isolate large inspection task | User expands current SVG | Opening, fitted, zoomed, panned, narrow toolbar layout | Close or continue inspecting |
| Viewer toolbar | Persistent controls | Viewer open | Fit, zoomed, min/max zoom disabled states | Zoom, fit/reset, close |
| Viewer canvas | Display and navigate SVG | Viewer open with current SVG | Fitted/centered, overflow/pannable, dragging | Pan, zoom, link activation |
| Loading state | Communicate Mermaid render progress | Render in flight | Existing spinner/text | Success or error |
| Error state | Communicate render failure | Mermaid render rejects | Existing error presentation | Source changes/retry by current lifecycle |

## Interaction And State-Transition Specification

| Scenario / State | User Action Or Trigger | Immediate Feedback | Resulting UI State | Data / Side Effect | Next Available Actions |
| --- | --- | --- | --- | --- | --- |
| Successful inline preview | Activate expand button | Button pressed/focus feedback; overlay appears | Viewer open, fitted | Ephemeral viewer state only | Zoom, pan, fit, close |
| Successful inline preview | Click/tap non-interactive SVG/background | Cursor/press feedback; overlay appears | Viewer open, fitted | None | Same as above |
| Inline interactive descendant | Activate link/control | Existing interactive feedback | Viewer remains as-is | Existing link/action side effect | Continue reading/inspection |
| Fitted viewer | Zoom in | Scale indicator/state updates; diagram grows | Zoomed, possibly pannable | None | Zoom, pan, fit, close |
| Zoomed viewer | Wheel/trackpad zoom | Scale changes around pointer | Zoomed around inspected region | None | Zoom, pan, fit, close |
| Zoomed/overflow viewer | Drag canvas | Grab/grabbing cursor; content follows drag | Panned | None | Continue pan/zoom or fit |
| Any open viewer state | Activate fit/reset or press `0` | Diagram animates minimally or updates immediately | Complete diagram centered/fitted | None | Zoom or close |
| Any open viewer state | Close, `Escape`, or backdrop click | Overlay disappears | Inline source context restored | Viewer state discarded; focus restored | Continue reading/reopen |
| Loading/error | Attempt to find expansion | No misleading enabled control exists | Loading/error remains | None | Wait or inspect error |
| Source changes while open | Current successful SVG becomes unavailable/re-renders | Viewer no longer presents stale SVG | Viewer closes or is withheld until current success | Ephemeral state discarded | Reopen current successful diagram |

## Markdown Wireframes / Visual Structure

### Inline

```text
┌──────────────── Mermaid preview ────────────────┐
│                                      [ Expand ] │
│                                                 │
│              rendered SVG overview              │
│                                                 │
└─────────────────────────────────────────────────┘
```

The control remains visible without hover. Hover/focus may strengthen the border/background, but must not be the only discoverability mechanism.

### Expanded viewer — wide

```text
┌──────────────────────────────────────────────────────────────┐
│ Diagram viewer        [ − ] [ Fit ] [ + ]              [ × ]│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                 zoomable / pannable canvas                   │
│                      rendered SVG                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Expanded viewer — narrow

```text
┌─────────────────────────────┐
│ Diagram viewer      [Close] │
│ [ − ]   [ Fit ]   [ + ]     │
├─────────────────────────────┤
│                             │
│     zoomable canvas         │
│                             │
└─────────────────────────────┘
```

The toolbar may wrap into two rows, but controls must not overlay the diagram or move off-screen. These four actions are the complete persistent control set; do not add zoom percentages, menus, minimaps, or modes.

## Non-Happy-Path States

### Loading

Preserve the current localized spinner and “Rendering diagram…” feedback. Do not render the expand control until a current SVG exists.

### Empty

A Mermaid segment with no successfully rendered SVG has no viewer entry. No blank modal is allowed.

### Error And Recovery

Preserve the existing error presentation and message. Do not hide the error behind a disabled control. If a later source change renders successfully, the inline action becomes available for that current SVG.

### Disabled / Unavailable

- Zoom-in is disabled at the upper bound.
- Zoom-out is disabled at the lower bound.
- Fit/reset may remain enabled or be visibly disabled when already fitted, but its meaning must remain clear.
- All disabled controls expose native disabled semantics, not only reduced opacity.

### Permission / Authentication

Not applicable. Diagram inspection is client-side and adds no request or permission path.

## Responsive And Platform Behavior

- Desktop browser and Electron use the same component and interactions.
- The overlay is teleported to the document body so conversation panes, drawers, and overflow containers cannot clip it.
- The dialog uses nearly all viewport width/height while retaining a small safe-area margin on wide screens; on narrow screens it may use the full viewport.
- Controls have touch-friendly targets (approximately 44×44 CSS pixels where layout allows) and wrap rather than overlap.
- The canvas shrinks after toolbar wrapping and remains scrollable/pannable.
- Touch users can zoom through persistent controls and pan through pointer/touch drag; pinch zoom is desirable but not required for this scope.
- Browser/application text scaling to 200% must not hide controls or make dismissal impossible.

## Accessibility And Keyboard Behavior

- Inline expand control: native button, localized accessible name “Expand diagram,” visible focus ring, Enter/Space activation.
- Viewer: `role="dialog"`, `aria-modal="true"`, localized accessible name “Diagram viewer,” and descriptive shortcut help available through title/accessible description if concise.
- Toolbar controls: native buttons with localized accessible names; decorative icons are hidden from assistive technology.
- Focus enters the dialog on open, cycles within it on Tab/Shift+Tab, and returns to the opener on close when the opener still exists.
- `Escape` closes; `+`/`=` zooms in; `-` zooms out; `0` fits/resets. These are supplemental to visible controls.
- Background content is not focusable/operable through the modal and document scrolling is locked while open.
- The diagram canvas must not be announced as a generic unlabeled clickable `div`; opening is represented by the explicit button.

## Content, Labels, And Validation Messages

English labels:

- Expand diagram
- Diagram viewer
- Zoom out
- Zoom in
- Fit diagram
- Close diagram viewer

Simplified Chinese labels:

- 放大图表
- 图表查看器
- 缩小
- 放大
- 适应窗口
- 关闭图表查看器

No new error copy is required; preserve the existing Mermaid rendering error.

## Data And API Dependencies

- Input: current Mermaid source and the successful SVG string already owned by the Mermaid component.
- No network call, store, route, persistence, GraphQL, REST, or Electron IPC dependency.
- The viewer must not create an image URL or download representation.

## Out Of Scope

- Source editing, export/download/copy, minimap, search, slide mode, remembered zoom, global app zoom, Mermaid theme correction, or non-Mermaid diagrams.

## Open Decisions / Risks

- Internal zoom math must account for scaled scroll extents rather than relying on a transform that visually grows content without making all edges reachable.
- Only one copy of SVG markup should be mounted at a time, or IDs must be safely unique; duplicate Mermaid IDs can break markers, labels, or links.
- Exact icon glyphs and neutral colors may follow existing workspace visual tokens, but toolbar persistence, contrast, and target size are not optional.

## Approval Status

Approved by the user on 2026-07-20. Approval emphasizes the minimal normal journey: open, use visible zoom buttons, optionally pan, use `Fit` to restore the overview, and use `Escape`/close to exit.
