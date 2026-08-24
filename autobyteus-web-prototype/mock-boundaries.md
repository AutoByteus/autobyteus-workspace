# Mock And Isolation Boundaries

## Contract

The prototype preserves the exact observable current UI while replacing all production/external capability underneath it with deterministic local state. It uses only synthetic data, performs no production writes, needs no production credential, and can be reset per browser context.

| Production capability | Exact visible experience preserved | Local prototype implementation | Intentionally absent |
| --- | --- | --- | --- |
| GraphQL/REST catalogs and settings | Routes, records, loading/empty/error/permission states, validation, feedback and retry | Deterministic snapshots plus intercepted store actions | Apollo transport, API server, production schemas/URLs |
| Authentication and access | Trusted desktop, paired/unpaired/denied mobile presentation | Local context key and inert synthetic mobile-session record | Identity provider, token validation, production session |
| Node/window context | Node list/binding, Electron internal/external distinction, native-capability controls | Browser-local host registry/window fixture | Node process, IPC, real windows |
| Electron bridge | Extensions, Updates, native folder actions, embedded server status/logs/recovery and Browser tool | `install-host-scenario.js` installs deterministic `window.electronAPI` | Electron package/runtime/preload/native bridge |
| Embedded server lifecycle | Starting, ready, failure, log/details, restart, shutdown and recovery UI | Scripted status state and timers | Server child process, filesystem logs, destructive reset |
| Persistence | Locale/layout/scenario continuity and local UI mutations | Isolated `localStorage` and in-memory Pinia overlays | Database, durable customer writes |
| Agent/team execution | Catalog Run, workspace draft, launch readiness, chosen-workspace Team/member projection and member focus, conversation, streaming, activity/todos, messages, delegation, status, interrupt/error/recovery/history | Real presentation state with synthetic messages and scripted transitions; focused `launchDraft` creates one local deterministic context; enumerated local selection/focus actions mutate resettable reactive view state | Model/provider calls, run scheduler, production stream |
| WebSocket streaming | Open/ready presentation and visible transitions | Local `EventTarget`-based `PrototypeWebSocket` | Agent/team/file/terminal/transcription servers |
| Files/workspace/viewers | Tree, viewer, context actions, create dialogs, attachment feedback | Synthetic `TreeNode` objects and text/media fixtures | Filesystem access, file watcher, production path |
| Terminal | Terminal tab/shell presentation and scripted output | Local view state | PTY/shell/command execution |
| Browser/VNC | Tabs, controls, device/view states and connection presentation | Host/browser fixture and view state | Browser automation host, VNC server/socket |
| Token usage/cost | Exact unavailable/populated presentation required by each controlled scenario | Synthetic local summary/error state | Billing store, usage ingestion, price service |
| Models/providers/tools/MCP | Catalogs, editors, required validation, save/delete/import feedback | Synthetic records and UI-local state mutations | Credentials, model calls, MCP processes/tools |
| Messaging | Provider/scope/binding/verification/recovery UI | Synthetic provider/account/binding state | Gateway, messaging transport, external account |
| Applications | Catalog/detail/setup/retry UI | Synthetic application and locally scripted response | Application server/iframe backend/orchestration |
| Packages/extensions/updates | Inventory, enable/disable/install/remove/import/update feedback | Local host/action fixtures | Download, installer, package or extension writes |
| Media | Categories, viewer and delete confirmation | Local synthetic SVG/text metadata | Media repository/storage |
| Icons/fonts/assets | Exact source visual assets and Monaco-backed viewers | Reused checked-in assets, local Iconify collections, and `/public/prototype-assets/monaco/vs` | Icon/font/editor CDN request |

## Enforcement Points

- `plugins/00.prototype-state.client.ts` selects snapshots, applies resettable overlays, retains only enumerated UI-local actions and replaces integration actions.
- `plugins/10.prototype-host-bootstrap.client.ts` installs host state before the UI initializes.
- `prototype/shared/install-host-scenario.js` is the Electron/window/server/update/extension/browser-shell adapter.
- `prototype/shared/apply-experience-scenario.js` builds deterministic agent/team/mobile UI objects, including the `workspace_team_launch` context/selection/tree projection, reactive focused-member state, and lifecycle state.
- `plugins/00.prototype-state.client.ts` directs the retained Monaco loader to
  the checked-in local mirror so ordinary review does not depend on jsDelivr.
- `utils/apolloClient.ts` is a no-network compatibility object.
- The prototype's `fetch` wrapper rejects external and API boundary requests; file/application responses needed for visible review are generated locally.
- The prototype replaces `window.WebSocket` with a local scripted implementation.
- `corepack pnpm validate:boundaries` checks that Electron/native/server/backend/Docker/packaging roots and dependencies were not copied and verifies the explicit request/WebSocket/reset boundary.

## Controlled Source Observation

An exact export of the pinned source is run against `prototype/source-observation/mock-node.mjs` only for parity evidence. That local server provides synthetic GraphQL/REST shapes, static media/application content, a controlled file-stream WebSocket, and the source-only `team_launch` create/resume execution tree. The evidence harness blocks non-loopback traffic and injects the same host scenario for Electron-visible source comparison. This observation adapter is not needed by the independently runnable prototype.

## Presentation Reuse Rationale

Exact source Vue components, pages, layouts, styles, localization and assets are retained because they are the smallest reliable way to preserve a 100% current UI appearance. Read-only store/view-model definitions remain where components consume their getters directly. A byte audit proves all 369 retained presentation files match the pin. Runtime behavior is nevertheless supplied by one prototype adapter and small fixtures; production clients/processes/contracts are not runtime dependencies.

This is high experience fidelity and deliberately low implementation fidelity—not a production frontend copy, Electron build, integration environment, or target architecture.
