# Prototype Bootstrap Report

## Status

- Status: **Completed — corrected baseline candidate ready for Product Prototyper inspection**
- Request type: `Current-Experience Bootstrap Correction`
- Package: `initial-prototype-baseline`
- Requirements revision: `RER-002`
- Source pin: `8ef282ba77705180d985e7000d801f0e0068cdc1`
- Known failed, missing, unknown, or unsubstantiated UI inventory IDs: **none**
- User review: **not started**. These are bootstrap parity screenshots, not final approved references; no `ui-ux-spec.md` was created.
- Next action: Product Prototyper directly inspects and either accepts this current-state baseline or returns precise remaining discrepancy IDs.

## Source And Prototype Identity

| Item | Value |
| --- | --- |
| Selected frontend | `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web` |
| Governing source | `origin/personal`, fetched at actual kickoff on 2026-08-22 |
| Exact source commit | `8ef282ba77705180d985e7000d801f0e0068cdc1` |
| Source observation URL | `http://127.0.0.1:3100` |
| Controlled source node | `http://127.0.0.1:4310` (synthetic, loopback only) |
| Prototype root | `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype` |
| Prototype review URL | `http://127.0.0.1:3200` |
| Review command | `PORT=3200 HOST=127.0.0.1 node .output/server/index.mjs` |
| Technology | Nuxt 3, Vue 3, TypeScript, Pinia, Tailwind, source presentation conventions |

The selected source application was not modified. The prototype is a separate workspace and requires no Electron runtime, backend, production node, credentials, customer data, or live integration.

## Exact Current-Experience Coverage

| Evidence class | Inventory | Result |
| --- | ---: | --- |
| Preserved route/configuration/state frames | `ROUTE-001`–`ROUTE-041`, `CFG-001`–`CFG-011`, `STATE-001`–`STATE-008` (60) | **60/60 pass** |
| Corrected host/lifecycle/workspace/mobile frames | `HOST-001`–`HOST-008`, `STATE-009`–`STATE-013`, `WKS-001`–`WKS-021`, `MOB-001`–`MOB-014` (48) | **48/48 pass** |
| All-route locale/responsive permutations | `MAT-R001-DZH`–`MAT-R041-NZH` (123) | **123/123 pass** |
| Corrected-surface locale/responsive permutations | host/state/workspace `DZH`, `NEN`, `NZH`; mobile `NZH` (116) | **116/116 pass** |
| Preserved interactions | `JRN-001`–`JRN-018` | **18/18 pass** |
| Correction interactions | `JRN-019`–`JRN-049` | **31/31 pass** |
| Retained source presentation files | `app.vue`, `error.vue`, Tailwind, components, pages, layouts, assets, public, localization, display | **369/369 exact byte matches** |
| Interaction discovery | `DISC-001`–`DISC-017` | **179 source files / 925 discovered cases classified** |

Every rendered row compares the pinned runnable source and independently runnable prototype under the same Chromium build, viewport, locale, light theme, reduced-motion setting, host/access context, synthetic records, locally served fonts/icons/assets, scenario timing, and action sequence. Evidence records body content, rendered controls/roles, route, dialogs, focus/action semantics, screenshot hashes, and perceptual metrics. Any non-byte-identical screenshot passed only when differences were tightly bounded non-perceptible rendering noise; there is no known perceptible or behaviorally meaningful discrepancy.

The complete row-level inventory is `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/parity-inventory.md`.

## Correction Of Product Prototyper Review Gaps

| Review gap | Corrected inventory/evidence | Result |
| --- | --- | --- |
| `PP-GAP-001` Electron/internal node | Selectable `electron_internal` host mock; `HOST-001`–`HOST-005`, `STATE-009`–`STATE-013`, `JRN-019`–`JRN-021`, `JRN-037`; exact locale/narrow matrix | **Resolved** |
| `PP-GAP-002` Electron/external node | Independent `electron_external` context and `HOST-006`–`HOST-008`; Electron capabilities retained while embedded-only monitor is absent | **Resolved** |
| `PP-GAP-003` embedded-server lifecycle | Starting, ready, failure, details/logs, restart, shutdown and recovery via `STATE-009`–`STATE-013` and `JRN-021` | **Resolved** |
| `PP-GAP-004` populated agent/team workspaces | Agent/team active, streaming, completed, error, interrupted and reopened-history states in `WKS-001`–`WKS-004`, `WKS-012`–`WKS-021`; run/message/delegation/history/interrupt/recovery journeys | **Resolved** |
| `PP-GAP-005` workspace tools | Files/viewer, Terminal, Activity/todos, Token, Artifacts, VNC, embedded Browser, tool-strip/drawer/resize and file-context actions in `WKS-005`–`WKS-011`, `JRN-022`, `JRN-026`, `JRN-043` | **Resolved** |
| `PP-GAP-006` paired mobile | Runs, Setup, Chat, team focus/messages/references, Files/viewer/attachment, Artifacts, Activity, Troubleshooting, Unpair and switcher focus in `MOB-001`–`MOB-014`, `JRN-027`–`JRN-030`, `JRN-044`–`JRN-045` | **Resolved** |
| `PP-GAP-007` locale/responsive completeness | 123 all-route and 116 correction permutations, each separately rendered and compared; English desktop is the corresponding base row | **Resolved** |
| `PP-GAP-008` discovery and state completeness | `DISC-001`–`DISC-017`; `JRN-031`–`JRN-049` cover agent/team CRUD, MCP, node/window, provider, messaging, package, media, history, resize, mobile and run lifecycle/recovery patterns; retained presentation is byte-exact | **Resolved** |

## High Experience Fidelity, Low Implementation Fidelity

The prototype deliberately reuses the pinned source presentation layer because exact source components, styles, assets, localization and view-model reads are the smallest drift-resistant way to reproduce this unusually broad UI. A manifest proves 369 retained presentation files are unchanged. It does **not** retain the product runtime underneath them:

```text
exact runnable presentation
    -> one prototype state/action adapter
    -> resettable scenario state and small synthetic fixtures
```

- `plugins/00.prototype-state.client.ts` hydrates synthetic snapshots, preserves only explicitly enumerated UI-local mutations, and replaces integration actions.
- `plugins/10.prototype-host-bootstrap.client.ts` installs a browser-side host scenario.
- `prototype/shared/install-host-scenario.js` supplies deterministic Electron/window/node/server/update/extension/browser-shell behavior without Electron.
- `prototype/shared/apply-experience-scenario.js` supplies real UI state for agent/team/mobile lifecycle scenarios.
- `utils/apolloClient.ts` is a no-network compatibility boundary.
- External browser requests and production WebSockets are blocked or replaced locally.
- Synthetic files, terminal output, model/tool/provider/messaging/package/update data and transitions are local and resettable.

Electron, backend/server roots, production protocols, authentication, persistence, filesystem, terminal process, provider/model/MCP processes, messaging gateways, installers/downloaders, Docker and packaging are absent. The prototype therefore defines the complete observable UI experience without becoming a production implementation or runtime copy.

## Browser And Comparison Results

| Command / artifact | Result |
| --- | --- |
| `corepack pnpm capture:parity` | 60/60; `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/evidence/comparison/browser-parity-summary.json` |
| `corepack pnpm capture:correction` | 48/48; zero source/prototype browser errors in final correction run |
| `corepack pnpm capture:matrix` | 123/123 |
| `corepack pnpm capture:correction-matrix` | 116/116; zero source/prototype browser errors |
| `corepack pnpm validate:browser` | 18/18 |
| `corepack pnpm validate:correction-journeys` | 31/31; zero source/prototype browser errors |
| Browser-tool direct inspection | Electron/internal Extensions and populated team workspace inspected at the production-build URL; DOM/geometry and screenshots retained |

The preserved 60-row source observer intentionally records source-side console diagnostics in `ROUTE-029` (Apollo cache warnings from the controlled token-statistics fixture), `STATE-007` (the requested recoverable error state), and `STATE-008` (the requested 403 permission-denied state). Prototype browser errors are zero and source/prototype visible outputs pass. These diagnostics are evidence of the controlled source conditions, not unknown product behavior.

## Static, Unit, Build, Isolation, And Source-Test Validation

| Validation | Result / evidence |
| --- | --- |
| `corepack pnpm typecheck` | Pass |
| `corepack pnpm lint` | Pass |
| `corepack pnpm test` | 2 files / 7 tests pass |
| `corepack pnpm validate:boundaries` | All 13 isolation checks pass |
| `corepack pnpm audit:presentation` | 369/369 exact |
| `corepack pnpm audit:interactions` | 179 files / 925 cases / 17 groups |
| `corepack pnpm build` | Pass; production node-server output |
| Source presentation suite | 177/179 files and 968/970 tests pass; two pinned-source tests fail identically alone |

The two pinned-source test failures are recorded rather than concealed:

1. `AgentUserInputTextArea.focusedInterrupt.e2e.spec.ts` expects a WebSocket send before its mocked team stream becomes ready.
2. `HistoricalTeamLazyHydration.integration.spec.ts` reads an undefined mocked `stopPendingTeamIds` ref.

Both fail unchanged when rerun alone (`evidence/validation/source-presentation-failing-tests-rerun.txt`). Their observable obligations are directly substantiated by exact source-versus-prototype browser journeys `JRN-047` and `JRN-049`, which pass. They are pinned-source unit-harness defects, not prototype discrepancies.

Build warnings about duplicated auto-import names and large retained presentation chunks are recorded in `evidence/validation/build.txt`; they do not change observable behavior or isolation.

## Durable Artifacts

- Inventory: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/parity-inventory.md`
- Comparison report: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/comparison-report.md`
- Evidence index: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/evidence-index.md`
- Scenarios: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/prototype-scenarios.md`
- Runbook: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/prototype-runbook.md`
- Mock boundary: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/mock-boundaries.md`
- Product review finding being corrected: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/product-prototyper-baseline-review.md`
- Machine evidence roots: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/evidence`

## Quality-Gate Conclusion

The selected source and pin are explicit; the prototype starts independently; every distinct recorded route, context, state, interaction and journey has runnable source and prototype evidence; every matrix and journey passes; production capabilities are locally simulated; no live credentials/data/writes are used; and no known perceptible, interaction, navigation, state, focus, responsive or journey discrepancy remains. The corrected baseline is ready for Product Prototyper inspection and acceptance.
