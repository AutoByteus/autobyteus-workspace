# IMP-004: the editor without a gutter, in the packaged window (AC-001, D-1)

- Commit: `0b88e1e761` and again `9072eb89c4` (fresh-start builds, IMP-002); my own isolated instance from each.
- Date: 2026-11-25.
- Method: `s7-monaco.js` over CDP (runner: IMP-003's `steps/cdp-eval.mjs`): open `notes.ts` (6 lines of TypeScript) in the Files viewer and measure the Monaco DOM.
- Result: **Pass**, identical on both builds.

```
editor left x = 750, width 450 (CSS px)
margin (decorations) x = 750, width 6
first text x = 756   → the text starts 6 px from the editor's edge
.line-numbers elements: 0; folding controls: 0
(.glyph-margin: Monaco keeps its empty element; the margin is 6 px wide in total)
```

`editor-no-gutter.png`: the editor's top, the code flush at 6 px, no numbers, no fold arrows; syntax colouring unchanged.
