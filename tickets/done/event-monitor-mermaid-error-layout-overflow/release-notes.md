# Mermaid renderer failure containment

## Summary

- Suppress Mermaid's fallback error rendering for embedded diagrams so rejected
  renders do not insert vendor-owned SVG nodes into `document.body`.
- Keep rejected renders in the existing `MermaidDiagram.vue` local error card.
- Constrain long parser messages with local width, min-width, overflow, and
  wrapping rules so malformed Mermaid cannot widen Markdown or workspace
  surfaces.
- Preserve valid SVG, viewer, focus, link, generation, and unmount behavior.

## Verification note

- API/E2E passed at 96% final confidence and proportional durable-test review
  was Not Applicable / accepted because no durable API/E2E tests changed.
- User confirmed the rebuilt artifact is working. The delivery record retains
  the bounded residuals: no packaged Electron launch, Windows runtime,
  authenticated Event Monitor feed, or exact production malformed payload was
  independently exercised.
