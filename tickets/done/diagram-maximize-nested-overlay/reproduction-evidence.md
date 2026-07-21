# Nested Diagram Overlay Reproduction Evidence

## Purpose / Status

- Purpose: retained browser-equivalent evidence for the reported artifact -> artifact maximize -> diagram maximize failure and its layer-by-layer dismissal implications.
- Scope: current `origin/personal` frontend at base commit `534210b9e1dffff6c22855ae89ddb3d2afef5a9b`; real `ArtifactContentViewer`, `FileViewer`, `MarkdownPreviewer`, `MarkdownRenderer`, `MermaidDiagram`, and `MermaidDiagramViewer` components.
- Status: Complete.
- Approval applicability: N/A; this artifact records current-state evidence and does not define intended behavior.

## Setup

1. Created an isolated, disposable Nuxt page in the ticket worktree.
2. Rendered a buffered Markdown artifact through the real `ArtifactContentViewer` production component chain; the Markdown included a successfully rendered Mermaid diagram.
3. Switched the artifact to Preview mode.
4. Activated the real artifact maximize control.
5. Activated the real Mermaid diagram expand control.
6. Collected computed stacking values, DOM ownership, hit-testing, SVG-copy counts, focus/body state, and viewport screenshots in headless Google Chrome 150 at 1440×1000 CSS pixels.
7. Exercised programmatic explicit diagram-close and physical `Escape` dismissal separately.
8. Removed the disposable page after the probe. No production source was changed.

The development shell had no backend connected and logged expected health/request failures. The artifact used buffered content and the reproduced overlay behavior did not depend on those requests.

## Observations

### Before diagram maximize

- Artifact shell was fixed and full-screen.
- Computed artifact z-index: `120`.
- Inline Mermaid root SVG count: `1`.
- Diagram-viewer SVG count: `0`.
- Screenshot: `probe-evidence/01-artifact-maximized-before-diagram.png`.

### After diagram maximize

- Computed artifact z-index: `120`.
- Computed Mermaid viewer backdrop z-index: `100`.
- Inline Mermaid root SVG count: `0`.
- Diagram-viewer SVG count: `1`.
- The viewer dialog existed, contained the sole current SVG, and was CSS-visible, but viewport-center hit-testing returned an element inside the artifact instead of the dialog.
- Conclusion: the diagram is not lost and did not fail to render. `MermaidDiagram` intentionally moved the only current SVG copy into `MermaidDiagramViewer`, whose body-teleported layer is painted behind the maximized artifact.
- Screenshot: `probe-evidence/02-diagram-viewer-obscured.png`.

### Dismissal behavior

- Calling the diagram viewer's explicit close action closed only the diagram viewer, left the artifact maximized, and restored the inline SVG copy.
- Pressing `Escape` while the diagram viewer was open closed both layers in one key event:
  - diagram viewer detached;
  - artifact shell was no longer maximized;
  - artifact toggle title returned to `Maximize view`.
- Cause: `MermaidDiagramViewer.handleKeydown` calls `preventDefault()` and emits close, but does not stop propagation; `ArtifactContentViewer` also handles the same bubbled key at `window` without checking `defaultPrevented`.
- Screenshot: `probe-evidence/03-escape-closes-both-layers.png`.

## Root-Cause Evidence

| Defect | Code evidence | Runtime evidence |
| --- | --- | --- |
| Diagram viewer is below maximized host | `MermaidDiagramViewer.vue` uses `z-[100]`; `ArtifactContentViewer.vue` uses `z-[120]` when maximized. Files and team reference maximized viewers also use `z-[120]`. | Computed values were `100` and `120`; hit-testing selected the artifact while the viewer held the SVG. |
| One `Escape` reaches both overlay owners | Diagram viewer prevents default but does not stop propagation. Artifact/File/Team fullscreen surfaces register global `window` Escape handlers that do not check `defaultPrevented`. | One physical `Escape` detached the diagram viewer and restored the artifact to non-maximized state. |
| Blank source region is a transfer symptom, not a sizing/render failure | `MermaidDiagram.vue` removes `.mermaid-svg-container` while `isViewerOpen` and passes `svgContent` to the viewer. | Inline count changed `1 -> 0`, viewer count changed `0 -> 1`; the viewer-owned SVG remained present behind the artifact. |

## Raw Evidence

- Metrics/event record: `probe-evidence/nested-overlay-reproduction.json`.
- Before screenshot: `probe-evidence/01-artifact-maximized-before-diagram.png`.
- Obscured-viewer screenshot: `probe-evidence/02-diagram-viewer-obscured.png`.
- Escape result screenshot: `probe-evidence/03-escape-closes-both-layers.png`.
