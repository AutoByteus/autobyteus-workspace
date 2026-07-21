# UI/UX Specification

## Status (`Draft`/`Requirements-ready`/`Refined`)

Refined — approved by the user on 2026-07-21.

## UX Goal

Make diagram maximize a predictable nested focus action: the diagram opens visibly above an already-maximized Markdown host, and every dismissal removes exactly one layer so the user returns to the context immediately underneath.

## Related Requirements And Acceptance Criteria

- Requirements: `REQ-001`–`REQ-009`.
- Acceptance criteria: `AC-001`–`AC-011`.
- Current-state evidence: `reproduction-evidence.md`.

## Users / Personas / Contexts

- A desktop/web workspace user reading a Markdown artifact or reference containing a large Mermaid diagram.
- The user needs two nested levels of focus: full-host reading, then focused diagram inspection.

## User-Journey Inventory

- `UJ-001`: Normal Markdown host -> maximized host -> maximized diagram -> maximized host -> workspace surface.
- `UJ-002`: Normal Markdown surface -> maximized diagram -> normal surface (regression preservation).
- `UJ-003`: Repeatedly open and dismiss the diagram overlay while the host remains maximized.

## Journey Details

### `UJ-001` Nested maximize

1. The user opens a Markdown artifact/reference/file with a successfully rendered diagram.
2. The user activates the host maximize control.
3. The host fills the application window; the diagram remains embedded and visible.
4. The user activates the diagram maximize control.
5. A diagram overlay appears above the host. Its backdrop covers the host and its dialog shows the selected diagram fitted to the available viewport.
6. The user dismisses the diagram using close, backdrop, or `Escape`.
7. Only the diagram overlay disappears. The same host is revealed, still maximized, with its embedded diagram restored and reading/view state retained.
8. The user performs a distinct host restore/close action or presses `Escape` again.
9. The host returns to its underlying workspace layout.

### `UJ-002` Single maximize

The existing diagram-maximize journey from a non-maximized surface remains intact and dismisses back to that surface.

### `UJ-003` Repeated lifecycle

Each open/close cycle creates one usable top diagram layer and removes its backdrop, handlers, focus state, body-scroll lock, pointer state, and transient sizing state when dismissed. No layer or SVG copy accumulates.

## Screen / Surface / Component Inventory

- Underlying workspace surface.
- Maximized Markdown host shell and its restore control.
- Embedded Mermaid diagram and diagram-maximize control.
- Top diagram backdrop.
- Diagram dialog with title, zoom out, Fit, zoom in, close, canvas, and rendered SVG.

## Interaction And State-Transition Specification

| Current state | Action | Next state | Required visible/interactive result |
| --- | --- | --- | --- |
| Normal Markdown host | Maximize host | Maximized host | Host content and embedded diagram visible. |
| Maximized host | Maximize diagram | Maximized host + top diagram overlay | Backdrop/dialog above host; diagram visible and fitted; host blocked but retained. |
| Host + diagram overlay | Close diagram button | Maximized host | Same host still maximized; one inline SVG restored; focus returns to diagram opener. |
| Host + diagram overlay | Click diagram backdrop | Maximized host | Same one-layer result as close button. |
| Host + diagram overlay | Press `Escape` | Maximized host | Exactly one layer closes; event does not also dismiss host. |
| Maximized host | Restore host / press `Escape` | Normal host/workspace | Existing host restoration behavior. |
| Normal Markdown surface | Maximize diagram | Diagram overlay | Existing single-layer viewer remains usable and dismisses normally. |

A user input belongs to the topmost active layer. One pointer or keyboard event must never cascade into dismissal/activation of an underlying layer.

## Markdown Wireframes / Visual Structure

### Nested diagram open

```text
Application viewport
└─ Underlying workspace
   └─ Maximized Markdown host (mounted, visually covered, non-interactive)
      ├─ Host header / restore control
      ├─ Markdown content
      └─ Inline diagram placeholder (height preserved; SVG temporarily viewer-owned)

Body-teleported top layer
└─ Diagram backdrop (above maximized host)
   └─ Diagram dialog
      ├─ Title
      ├─ [Zoom out] [Fit] [Zoom in] [Close]
      └─ Diagram canvas
         └─ One visible fitted SVG
```

### After one dismissal

```text
Application viewport
└─ Underlying workspace
   └─ Maximized Markdown host (still open)
      ├─ Host header / restore control
      └─ Markdown content with one restored inline SVG
```

## Non-Happy-Path States

### Loading

Existing Mermaid render loading stays inline and exposes no maximize action. Opening is possible only after a current SVG exists.

### Empty

A source block that produces no successful diagram follows existing renderer behavior; no blank top viewer is introduced.

### Error And Recovery

Existing Mermaid render errors remain inline and bounded. The nested-layer fix must not convert renderer errors into an empty viewer.

### Disabled / Unavailable

Existing rules for absent maximize controls during loading/error remain unchanged.

### Permission / Authentication

Not applicable.

## Responsive And Platform Behavior

- The diagram overlay uses the application viewport as its sizing boundary and remains above the maximized host at supported desktop/web window sizes.
- Existing compact/wrapping toolbar and fitted diagram behavior remain intact at narrow widths and 200% text zoom.
- Resize while open continues to use the viewer's existing `ResizeObserver` fit behavior.
- Browser-equivalent behavior is expected to match Electron because both render the same Vue/CSS path; use actual desktop execution only if downstream evidence finds a shell-specific difference.

## Accessibility And Keyboard Behavior

- When the diagram opens, focus enters its dialog at the existing close control and stays contained in the top dialog.
- The backdrop blocks pointer activation of the host while the diagram is open.
- The host remains mounted underneath but must not become the active keyboard interaction surface while the diagram dialog is open.
- `Escape` is consumed by the top dialog and dismisses exactly that layer. After focus returns to the opener, a later, distinct `Escape` may dismiss the host.
- Close controls retain localized accessible names, titles, keyboard activation, and visible focus states.
- Dismissing the diagram returns focus to its invoking expand control inside the still-maximized host when that control remains connected.

## Content, Labels, And Validation Messages

Reuse existing localized diagram viewer title and zoom/Fit/close labels. No new user-facing copy is required.

## Data And API Dependencies

None. The journey depends only on existing Markdown/Mermaid rendering state and independently owned transient host/viewer presentation state.

## Out Of Scope

- New pan/zoom modes or diagram authoring behavior.
- A product-wide overlay stack manager.
- Redesign of host headers, workspace navigation, or other system modals.

## Open Decisions / Risks

- No user-facing decision remains open.
- Implementation must choose a diagram tier above supported host fullscreen tier `120` without overtaking intentionally higher system-critical overlays.
- Nested focus return and one-event/one-layer behavior require browser execution, not only shallow component assertions.

## Approval Status

Approved by the user on 2026-07-21 together with `requirements.md`.
