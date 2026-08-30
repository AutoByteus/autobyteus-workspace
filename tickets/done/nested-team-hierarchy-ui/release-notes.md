# AutoByteus 1.4.63 — Nested Team Hierarchy UI

## Improved

- Expanded Workspace-history Team runs now read as a compact printed file tree with continuous ancestor rails and correctly terminating right-only elbows.
- Configured Teams use a filled user-group symbol and semibold label, Agents retain circular avatars, and transient task Teams use a separate dashed bolt treatment.
- Selected rows use an orthogonal indigo treatment that preserves connector and node-role cues.
- Long names remain recoverable by hover/title and keyboard-focus tooltip. Localized tree semantics expose each visible node's role, name, address, level, status, selection, and disclosure state.
- The hierarchy remains operable across the supported 260px, 320px, and 520px panels and Default, Large, and Extra Large font presets; secondary age/status metadata yields and recovers as space requires.

## Preserved Behavior

- Team-definition/run grouping, default-collapsed nested Teams, independent disclosure, exact member selection, selected-ancestor reveal, Stop isolation, status meaning, configured/transient execution identity, and quiet-refresh state remain unchanged.
- The change does not alter team topology, APIs, persistence, lifecycle, authentication, external providers, or Electron-shell integration.

## Validation

- Focused changed component: `9/9` passed.
- Focused history/tree/state/selection/projection/hydration: `120/120` passed.
- Broader affected history/GraphQL/hydration: `201/201` passed.
- Durable hierarchy and aggregate-status Chromium scenarios passed, including the complete 3×3 width/font matrix, localized accessibility output, interactions, refresh, runtime safety, and owned cleanup.
- Production Nuxt build passed with `15` routes prerendered. Delivery's focused check passed `9/9` after the final latest-base refresh.

## Operational Notes

- Persisted data: `Not Affected`; no migration, rebuild, compatibility path, or data rollback is required.
- Known non-blocking risk: Extremely large hierarchy performance has no approved threshold; durable browser evidence covers 16 visible rows through depth 3.
- A Linux ARM64 `1.4.62` package was built and launched as the pre-release verification candidate; its bundled backend passed health checks and the user explicitly accepted the result. Release artifacts are produced independently for version `1.4.63` by the documented tag-triggered desktop workflow.
