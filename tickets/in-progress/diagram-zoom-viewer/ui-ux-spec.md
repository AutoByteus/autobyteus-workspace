# Diagram Zoom Viewer UI/UX Specification

## Status

`Refined` — original journey approved on 2026-07-20; inline and toolbar chrome revised from the user's live Electron verification on 2026-07-20.

## UX Goal

Make detailed Mermaid diagrams easy to enlarge, navigate, reset, and dismiss without making the controls feel heavier than the diagram. The experience should look like familiar modern viewer chrome: quiet at rest, present when needed, consistent, and usable by mouse, keyboard, or touch.

This specification supports [requirements.md](./requirements.md), especially REQ-001–REQ-010 and AC-001–AC-018. It is the authoritative visual/interaction supplement; requirements remain authoritative for acceptance.

## UX Principles For This Surface

1. **Content first:** the inline diagram owns the layout; entry chrome floats above it and never creates a toolbar row.
2. **Progressive disclosure on desktop:** a fine-pointer user sees the expand affordance when the pointer enters the diagram region, not permanently while reading.
3. **No hover trap:** keyboard focus reveals the affordance, and touch/no-hover layouts keep it visible.
4. **Consistency over words:** the modal's four familiar actions use equal icon-button treatment. Text remains in accessible names/tooltips, not in one oversized toolbar pill.
5. **Simple normal journey:** open -> zoom in/out -> drag if needed -> fit -> Escape/close. No mode switching.
6. **Rendered quality is part of correctness:** spacing, hierarchy, state transitions, and light/dark contrast must be visually inspected in the running frontend.

## Related Requirements And Acceptance Criteria

- Requirements: REQ-001–REQ-010
- Acceptance criteria: AC-001–AC-018

## Users / Personas / Contexts

- Desktop Electron/browser user reading a wide architecture or sequence diagram.
- Mouse/trackpad user who expects contextual controls to appear on diagram hover.
- Keyboard user who cannot depend on pointer hover.
- Touch/coarse-pointer user who cannot generate a durable hover state.
- User inspecting diagrams in team/task messages or Markdown file previews.
- Low-vision user operating at increased browser/application text scale.

## User-Journey Inventory

| Journey ID | User / Context | Starting State | User Goal | Completion State | Related IDs |
| --- | --- | --- | --- | --- | --- |
| UXJ-001 | Fine-pointer reader | Diagram rendered inline; pointer outside preview | Open without permanent visual clutter | Viewer open and fitted | REQ-001–REQ-003, REQ-010; AC-001–AC-005, AC-015, AC-017 |
| UXJ-002 | Mouse/trackpad user | Viewer open | Enlarge and navigate detail | Desired labels readable/reachable | REQ-004–REQ-005; AC-006–AC-009 |
| UXJ-003 | Touch/narrow user | Inline diagram or viewer on small viewport | Discover, open, zoom, and pan without hover | Desired region readable; controls reachable | REQ-002, REQ-004–REQ-005, REQ-009–REQ-010; AC-004, AC-006, AC-008, AC-014, AC-016–AC-018 |
| UXJ-004 | Keyboard user | Focus approaches inline preview | Open, adjust, reset, and close without pointer | Focus returns to expand control | REQ-009–REQ-010; AC-003–AC-006, AC-009–AC-010, AC-018 |
| UXJ-005 | Diagram-link user | Inline/expanded SVG contains link | Follow link, not viewer chrome | Existing external-link action occurs | REQ-006; AC-011 |

## Journey Details

### UXJ-001 — Fine-pointer open

1. At rest, the successful inline diagram appears without a visible toolbar or blank control strip.
2. The pointer enters any non-loading/non-error part of the preview. A compact expand icon fades into the top-right safe area without shifting the SVG.
3. The user may click the icon or any non-interactive diagram/background area. Both open the same viewer.
4. The near-full-viewport modal opens above the workspace with the whole diagram fitted.
5. Four persistent icon-only actions appear in a compact aligned toolbar: zoom out, fit-to-view, zoom in, close.

### UXJ-002 — Inspect detail

1. The user clicks zoom-in or uses wheel/trackpad over the canvas.
2. The diagram grows within the existing clamped range; pointer-centered zoom keeps the inspected region stable.
3. If content overflows, the user drags or scrolls. Cursor/state feedback communicates pan availability.
4. The user clicks the inward-corners fit icon to restore the whole overview.
5. The user presses `Escape` or activates close to return to the original reading context.

### UXJ-003 — Touch/no-hover

1. Because hover is unavailable, the compact expand affordance is visible by default in the inline top-right safe area.
2. The visible icon surface stays visually compact, but its button remains comfortably tappable; tapping non-interactive diagram space is an equivalent shortcut.
3. The viewer provides the same persistent icon-only controls. Touch drag pans overflow content.
4. Controls never require hover to reveal their meaning: accessible names and native/platform tooltip/title behavior remain available where supported.

### UXJ-004 — Keyboard-only

1. Tabbing reaches the native expand button even though desktop pointer-resting chrome is visually quiet.
2. `:focus-visible`/`:focus-within` immediately reveals the control with a clear focus ring; it must never remain an invisible focused target.
3. Enter/Space opens the named modal. Focus enters and stays within the open dialog.
4. The user tabs among the four icon controls and canvas. Localized accessible names communicate each icon.
5. `+`/`=` zooms in, `-` zooms out, `0` fits, and `Escape` closes, except when an interactive descendant owns the keystroke.
6. Close returns focus to the inline expand button and leaves source scroll unchanged; the button remains visible while focused.

### UXJ-005 — Follow a diagram link

1. The user activates a Mermaid anchor or other interactive descendant.
2. The component does not reinterpret it as expand, pan-start, backdrop-close, or reset.
3. Existing Markdown/Electron external-link routing proceeds unchanged.

## Surface And State Inventory

| Surface / Component | Purpose | Important States | Required Visual Behavior |
| --- | --- | --- | --- |
| Inline preview | Present diagram in content flow | Rest, hover, focus-within, touch/no-hover, viewer-open placeholder | No permanent toolbar row; no diagram movement across control transitions |
| Inline expand control | Viewer entry | Hidden-resting desktop, revealed-hover, focus-visible, pressed, visible-touch | Compact floating outward-corners icon; subtle neutral surface; clear focus/hover feedback |
| Viewer shell | Isolate inspection | Opening, fitted, zoomed, panned, narrow | Near-full viewport; chrome subordinate to canvas |
| Viewer toolbar | Four actions | Default, hover, focus, pressed, disabled | Uniform icon-only controls; no one-off text pill; stable alignment |
| Viewer canvas | Render/navigate SVG | Fitted, overflow, dragging, focused | Diagram remains primary; pan/focus cursors/rings legible |
| Loading/error | Existing render lifecycle | Loading, failed | No expand affordance or empty viewer |

## Interaction And State Transitions

| State | Trigger | Immediate Feedback | Result | Notes |
| --- | --- | --- | --- | --- |
| Inline, fine-pointer rest | Pointer outside | No visible expand chrome | Diagram-only overview | Button remains in DOM/tab order if successful |
| Inline, fine-pointer hover | Pointer enters preview | Compact icon fades/settles in; preview does not reflow | Entry affordance visible | Entire preview hover, not only tiny icon, reveals it |
| Inline, keyboard focus | Button receives focus | Icon and focus ring appear immediately | Keyboard entry visible | Overrides pointer-resting hidden state |
| Inline, pointer leave | Pointer leaves and button lacks focus | Icon fades out | Diagram-only rest | No layout change |
| Inline, coarse/no-hover | Successful SVG | Compact icon visible | Touch entry available | Capability-based CSS, not UA detection |
| Successful inline | Activate icon/non-interactive preview | Press feedback; overlay opens | Viewer fitted | Interactive descendants excluded |
| Viewer fitted | Zoom in | Scale grows; minimum/maximum states update | Zoomed/pannable | Icon controls persistent |
| Viewer zoomed | Fit icon/`0` | Immediate/minimal transition | Fitted origin | Fit icon remains semantically clear through label/title |
| Viewer open | Close/Escape/backdrop | Overlay disappears | Source restored | Focus/body-scroll restoration preserved |
| Loading/error | Any attempted entry | No misleading action | Existing state remains | No blank modal |

## Markdown Wireframes / Visual Structure

### Inline — fine-pointer rest

```text
┌──────────────── Mermaid preview ────────────────┐
│                                                 │
│              rendered SVG overview              │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Inline — hover, focus, or no-hover/touch

```text
┌──────────────── Mermaid preview ────────────────┐
│                                        [ ↗↙ ]   │  compact overlay
│              rendered SVG overview              │  zero layout height
│                                                 │
└─────────────────────────────────────────────────┘
```

The icon is conventional four-corners/outward expansion, not literal arrow text. It may cover only a small padded corner. It must not sit in a separate row or push the SVG downward.

### Expanded viewer — wide

```text
┌──────────────────────────────────────────────────────────────┐
│ Diagram viewer                         [ − ][ fit ][ + ] [ × ]│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                 zoomable / pannable canvas                   │
│                      rendered SVG                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

`fit` represents an inward-corners icon, not visible text. All four buttons share the same visual box, icon weight, corner radius, border/background model, and interaction states. A small grouping gap may separate close from zoom/fit controls, but close must not become visually oversized.

### Expanded viewer — narrow

```text
┌─────────────────────────────┐
│ Diagram viewer [−][fit][+][×]│
├─────────────────────────────┤
│                             │
│     zoomable canvas         │
│                             │
└─────────────────────────────┘
```

At extreme text scaling the title may truncate or yield space before controls wrap. Controls must stay as one coherent set where possible and may wrap only when required to remain reachable; removing visible action words should substantially reduce wrapping pressure.

## Visual Design Contract

### Inline affordance

- Position: absolute, top-right, inside preview padding/safe area; z-index only high enough to sit above SVG.
- Layout: contributes zero width/height to normal flow and no bottom margin.
- Visible surface on desktop: approximately 30–36 CSS pixels square; icon approximately 16–18 pixels. Exact values may align with local tokens if the screenshot outcome remains compact.
- Operable touch target: comfortably tappable (target approximately 40–44 CSS pixels) without requiring the painted background to look 44 pixels heavy. Padding/transparent hit area may provide the distinction.
- Resting fine-pointer state: opacity/scale/translation may be subtly reduced to hidden; it does not intercept pointer input until the preview is hovered. Do not use `display:none` for the keyboard-focusable successful control.
- Revealed state: quick, restrained transition (roughly 120–180 ms); no bounce or large movement. Honor reduced-motion preferences.
- Surface: neutral/translucent background, subtle border or shadow, optional backdrop blur, and enough contrast over light or dark SVG fills. Avoid a large opaque card.
- State hierarchy: default revealed < hover/pressed emphasis < clear focus ring. Disabled is not applicable to expand.

### Viewer toolbar

- Exactly four visible actions: zoom out, fit-to-view, zoom in, close.
- Every action is icon-only. No visible zoom percentage, `Fit diagram` label, menu, or text pill.
- Visual dimensions: uniform compact square surfaces, approximately 34–38 CSS pixels on fine-pointer desktop; coarse-pointer/narrow styling may increase target size without making Fit unique.
- Icon family: minus, inward-corners/fit-to-view, plus, close. Expand and Fit should read as an outward/inward semantic pair.
- Grouping: zoom out/fit/zoom in may form a compact group; close may be separated by one small gap/divider. All use the same base button component/class treatment.
- Header: keep title and controls vertically centered; reduce unused chrome while preserving readable title and dismissal.
- Tooltips/labels: localized `aria-label` and `title` remain on every button. Visible text is not needed for comprehension in this familiar four-action set.
- Disabled zoom bound: native disabled semantics plus restrained visual state; still recognizable as the same control.

## Non-Happy-Path States

### Loading

Preserve current localized spinner/text. No overlay affordance until a current SVG exists.

### Empty

No successful SVG means no viewer entry and no blank modal.

### Error And Recovery

Preserve the existing error presentation. A later successful render enables the adaptive affordance for the current SVG.

### Disabled / Unavailable

- Zoom-in disabled at upper bound; zoom-out disabled at fitted lower bound.
- Fit may stay enabled or be disabled while already fitted, but its icon, label, and state must remain unambiguous.
- Native disabled semantics are required; opacity alone is insufficient.

### Permission / Authentication

Not applicable.

## Responsive And Platform Behavior

- Browser and Electron share the same component and behavior.
- Desktop fine-pointer: contextual inline affordance appears on preview hover or focus.
- Touch/coarse/no-hover: affordance visible by default; no hover requirement.
- Hybrid devices: capability-query fallback must err toward a visible usable control rather than an unreachable hidden action.
- Modal remains body-teleported and near-full viewport.
- Icon-only toolbar reduces wrapping; if wrapping is still required at 360 CSS pixels/200% text zoom, controls remain grouped, reachable, and non-overlapping.
- Canvas shrinks to available space and remains scrollable/pannable.
- Pinch zoom remains desirable but out of scope.

## Accessibility And Keyboard Behavior

- Expand: native button; localized “Expand diagram”; Enter/Space; visible focus ring; focus always reveals it.
- Hover hiding never removes the button from successful-state tab order and never produces an invisible focus indicator.
- Viewer: named `role="dialog"`, `aria-modal="true"`; focus enters, traps, and returns on close.
- Toolbar: native icon buttons with localized names and titles; decorative icons hidden from assistive technology.
- `Escape` closes; `+`/`=` zooms in; `-` zooms out; `0` fits.
- Background content/scroll remains blocked while open.
- Diagram canvas retains its labeled region semantics and is not the sole representation of the open action.
- Reduced-motion users receive immediate or near-immediate opacity/state changes without transform flourish.

## Content, Labels, And Validation Messages

The following semantic labels remain localized even where only icons are visible:

| Action | English | Simplified Chinese | Visible In Chrome? |
| --- | --- | --- | --- |
| Expand | Expand diagram | 放大图表 | No; icon only |
| Viewer title | Diagram viewer | 图表查看器 | Yes |
| Zoom out | Zoom out | 缩小 | No; icon only |
| Fit | Fit diagram | 适应窗口 | No; icon only |
| Zoom in | Zoom in | 放大 | No; icon only |
| Close | Close diagram viewer | 关闭图表查看器 | No; icon only |

No new error copy is required.

## Rendered Quality Verification Contract

Before implementation handoff, the implementation engineer must inspect and record:

1. Desktop Electron or equivalent production-rendered browser, pointer outside preview: no visible expand chrome and no blank control row.
2. Same surface on preview hover: compact top-right affordance appears without SVG movement.
3. Keyboard Tab/focus: affordance and focus ring appear even without hover.
4. Wide viewer: exactly four uniform icon-only buttons; Fit has no visible text and no unique pill width.
5. Narrow 360 CSS-pixel / 200% text-scale viewer: all actions reachable and aligned; useful canvas remains.
6. Coarse/no-hover emulation or real touch-capable environment: inline expand remains visible/tappable.
7. Representative light and dark application surfaces: icon, button surface, focus ring, and SVG remain legible without visually overpowering the diagram.

Evidence must include screenshots or equivalent retained rendered-state artifacts and the viewport/input conditions. Passing component tests alone is insufficient for AC-018.

## Data And API Dependencies

- Input: current Mermaid source and already-rendered SVG.
- No network, store, route, persistence, GraphQL, REST, or Electron IPC change.
- Viewer must not create image/download representations.

## Out Of Scope

- Source editing, export/download/copy, minimap, search, slide mode, remembered zoom, percentage display, global app zoom, Mermaid theme correction, or non-Mermaid diagrams.

## Open Decisions / Risks

- Exact compact pixel values may align with existing Tailwind/workspace tokens, but the rendered hierarchy and zero-layout-space invariants are mandatory.
- Top-right overlays can obscure content if oversized; use the smallest readable painted surface and existing preview padding.
- CSS hidden/revealed behavior must coordinate `pointer-events`, hover, and focus so there is neither an invisible pointer trap nor an unreachable keyboard target.
- Existing screenshot evidence for the first implementation is now negative UX evidence, not target styling.

## Approval Status

The original functional journey was approved on 2026-07-20. During live Electron verification, the user explicitly rejected the permanent oversized inline row and wide Fit text button and directed a typical refined pattern: hover-revealed inline expand on desktop and a fit icon consistent with the other controls. That direction approves this revised intent. Architecture re-review remains required before source changes.
