# Round 22 browser Gemini compact Settings journey

- Scenario: `SCSP-E2E-BROWSER-GEMINI-PRESENTATION-001`
- Implementation HEAD: `49c27b2fe3aeb8b8299759c6ae64f7ffddc09254`
- Browser surface: actual `open_tab` browser against Nuxt on task-owned `127.0.0.1:33122` and the exact built server on task-owned `127.0.0.1:63122`.
- Isolation: the user's same-worktree `pnpm dev:test` stack was already listening on 3000/8000. It was identified, preserved, not reused, and not stopped. The validation used the same project-supported `test-runtime-bootstrap.mjs` and Nuxt development command on unique ports with a task-owned application DB/key/runtime root.

## Compact presentation

1. Navigated through the real Settings API Keys surface and selected Gemini.
2. The compact connection panel rendered exactly three independent options: AI Studio, Vertex Express, and Vertex Project.
3. Initial task-owned state showed `Active mode: Not selected`; all three options were `Not Configured`; all editors were collapsed; no credential input existed in the DOM; and no standalone Gemini removal control was present.
4. Each option exposed a labeled Configure action and its value-free description. Supporting screenshot: `361-round22-browser-gemini-compact.png`.

## Expanded editor and hidden input

1. Expanded Vertex Express. Exactly one editor existed and the first field received focus.
2. The credential field was type `password`. The visibility control changed it to `text` and back to `password` without logging or recording the value.
3. A synthetic task-only value enabled both Save and Save-and-use for the first configuration. Other option editors remained absent.
4. Supporting masked screenshot: `362-round22-browser-gemini-expanded.png`.

## Save-and-use and persistence

1. Clicked the production Save-and-use action for Vertex Express.
2. The assembled backend/frontend reported `Active mode: Vertex Express`, `Configured`, and the explicit active marker. The write-only input/editor disappeared and the synthetic value was absent from visible text.
3. Reloaded the page, reselected Gemini, and observed the same configured/active state with all editors collapsed and zero Gemini credential inputs in the DOM.
4. Supporting screenshot: `363-round22-browser-gemini-active.png`.

## Result

**Pass.** Current compact/expanded presentation, focus and visibility behavior, independent option identity, first-time Save-and-use, value-free configured/active state, vault-backed persistence through reload, and absence of a standalone removal control all passed on the exact reviewed HEAD.
