# Diagram Zoom Viewer — Implementation Visual Evidence (Round 2)

This retained evidence records implementation-engineer rendered self-inspection for the approved visual refinement. It is implementation evidence, not API/E2E sign-off.

## Environment

- Production-equivalent renderer: Nuxt development renderer through installed Google Chrome, headless
- Fixture: existing durable Diagram Zoom Viewer fixture copied to a disposable route and removed after inspection
- Desktop: 1440×1000 CSS pixels, `(hover: hover) and (pointer: fine)`
- Touch/no-hover: 360×740 CSS pixels, `hasTouch`, mobile/coarse/no-hover context, 200% root text size
- Dark rendering: `prefers-color-scheme: dark`
- Backend: intentionally absent; the fixture's browser-only surface was usable and the expected health-proxy refusal did not affect inspection

## Retained States

| File | State |
| --- | --- |
| `01-desktop-rest-light.png` | Fine-pointer rest: no visible expand chrome and no reserved row |
| `02-desktop-hover-light.png` | Whole-preview hover: compact top-right expand surface |
| `03-desktop-keyboard-focus-light.png` | Keyboard Tab focus: revealed action and visible focus ring |
| `04-viewer-wide-light.png` | Wide light viewer: four uniform 36×36 icon-only controls |
| `05-desktop-hover-dark.png` | Dark inline surface and contrast |
| `06-viewer-wide-dark.png` | Dark viewer and toolbar contrast |
| `07-coarse-inline-360-200.png` | Coarse/no-hover fallback: visible 44×44 target with compact 34×34 painted surface |
| `08-viewer-narrow-360-200-coarse.png` | 360×740/200% viewer: four reachable 44×44 icon-only controls and usable canvas |
| `visual-evidence.json` | Conditions, DOM/style/geometry measurements, functional-regression results, and 23 passing assertions |
| `09-hybrid-wide-inline-rest.png` | Wide combined-capability cascade: coarse-secondary override keeps the resting corner action visible and 44×44 |
| `10-hybrid-wide-viewer.png` | Wide combined-capability cascade: four uniform 44×44 icon-only viewer actions |
| `hybrid-evidence.json` | CR-002 source/emitted-CSS/cascade method, conditions, measurements, and eight passing focused assertions |

## Direct Inspection Result

The floating action stays visually subordinate to the diagram, uses a restrained translucent 30×30 painted surface pinned four pixels inside the preview's top-right corner, and occupies no normal-flow space. Rest, hover, pointer-leave, and keyboard-focus measurements report identical SVG geometry. The viewer toolbar is balanced and icon-only; Fit retains the inward-corners icon and localized name/title without a unique pill. Light/dark surfaces, touch fallback, hybrid fallback, and narrow/text-scaled states remained legible.

Installed Chrome/CDP cannot expose fine primary and coarse secondary media capabilities simultaneously: enabling touch replaces the primary capability. The focused hybrid check therefore keeps Chrome's real `(hover: hover) and (pointer: fine)` query active, reads the actual emitted `any-pointer: coarse` rules from CSSOM, and activates those exact declarations through a test-only document class. This deterministically exercises the combined cascade without changing product source or the retained fixture. `hybrid-evidence.json` records the emitted conditions/declarations and the before/after computed results.

The same browser pass also exercised zoom-in, Fit reset, expanded HTTP(S) link dispatch through the existing owner, close, and focus return.
