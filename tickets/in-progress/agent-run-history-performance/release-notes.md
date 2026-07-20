# Release Notes — Bounded Agent Run History

## Improvements

- Made large Event Monitor runs open from the active trace only and return the newest 100 canonical replay events instead of reconstructing archived segments during normal viewing.
- Kept historical hydration, live standalone/team updates, local submissions, center rendering, and Activity state bounded to recent windows of at most 100 events.
- Added a localized, keyboard-operable jump-to-latest action that preserves a user's non-pinned reading position while new visible activity arrives.

## Behavior And Compatibility

- Preserved currently mutable Thinking, streamed text, tool, and compaction entries ahead of completed entries during normal eviction, with a deterministic hard fallback when more than 100 entries are simultaneously mutable.
- Preserved collapsed-by-default Thinking and tool cards, absolute-file-path Event Monitor actions, and member attachment-retention behavior.
- Removed the separate conversation-copy control and its eager full-conversation text derivation without adding a replacement archive/export action.
- Existing active traces, archived segments, and manifests remain directly usable and unchanged; no migration or maintenance window is required.
- Event Monitor token/cost totals now describe the retained recent window rather than full archived history.

## Validation

- Latest-base source review passed at `9.6/10` with no findings.
- API/E2E passed at `97.6%` confidence with direct active/archive filesystem, GraphQL, live HTTP, production streaming, and real Chromium evidence.
- Integrated frontend suites passed (`12` files / `109` tests focused; `29` files / `239` tests expanded), and server run-history coverage passed (`4` files / `13` tests).
- A deterministic active fixture larger than 5 MB projected in `36.465 ms` in process; live HTTP and browser usability stayed well inside the required two-second threshold.
- An integrated Linux ARM64 Electron AppImage built successfully, and its unpacked packaged application started with an isolated home and a healthy bundled backend on port `29695` for hands-on verification.
- Full Nuxt and server package typecheck limitations remain documented pre-existing repository baselines; the server production build and all relevant guards passed.
