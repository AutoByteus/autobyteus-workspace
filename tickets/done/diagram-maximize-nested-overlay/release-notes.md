# Release Notes — Nested Diagram Overlay

## Fixes

- Mermaid diagrams now open above an already-maximized artifact or Markdown preview instead of appearing blank or hidden behind the host.
- Closing the diagram with its close action, backdrop, or `Escape` now dismisses only the diagram and keeps the underlying preview maximized with its path, content, and Preview selection intact.
- A separate later `Escape` can still exit the underlying maximized preview.

## Quality

- Extended the existing real-browser diagram probe with the full artifact-preview-to-Mermaid component path, pointer-layer checks, repeated dismissal cycles, focus and single-SVG restoration, and owned-resource cleanup.
