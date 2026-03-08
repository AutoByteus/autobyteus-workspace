# Investigation Notes

## Metadata

- Ticket: `messaging-gateway-desktop-distribution`
- Last Updated: `2026-03-08`
- Scope Triage: `Medium`

## Sources Consulted

1. `autobyteus-web/stores/windowNodeContextStore.ts`
2. `autobyteus-web/utils/nodeCapabilityProbe.ts`
3. `autobyteus-web/utils/nodeEndpoints.ts`
4. `autobyteus-web/types/node.ts`
5. `autobyteus-web/electron/main.ts`
6. `autobyteus-web/electron/server/baseServerManager.ts`
7. `autobyteus-web/electron/server/serverRuntimeEnv.ts`
8. `autobyteus-web/electron/server/services/AppDataService.ts`
9. `autobyteus-web/stores/serverSettings.ts`
10. `autobyteus-web/components/settings/messaging/GatewayConnectionCard.vue`
11. `autobyteus-web/stores/gatewaySessionSetupStore.ts`
12. `autobyteus-web/services/messagingGatewayClient.ts`
13. `autobyteus-server-ts/src/config/app-config.ts`
14. `autobyteus-server-ts/src/api/graphql/types/server-settings.ts`
15. `autobyteus-server-ts/src/api/graphql/types/external-channel-setup/resolver.ts`
16. `autobyteus-server-ts/src/runtime-management/runtime-capability-service.ts`
17. `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts`
18. `autobyteus-server-ts/docker/docker-compose.yml`
19. `autobyteus-message-gateway/src/config/runtime-config.ts`
20. `autobyteus-message-gateway/src/bootstrap/create-gateway-app.ts`
21. `autobyteus-web/electron/updater/appUpdater.ts`
22. `autobyteus-web/stores/appUpdateStore.ts`
23. `autobyteus-web/components/app/AppUpdateNotice.vue`
24. `autobyteus-web/components/server/ServerMonitor.vue`
25. `autobyteus-web/stores/serverStore.ts`
26. `autobyteus-web/build/scripts/build.ts`
27. `.github/workflows/release-desktop.yml`
28. `autobyteus-server-ts/.github/workflows/release-docker-image.yml`
29. `autobyteus-web/scripts/prepare-server.mjs`
30. `autobyteus-server-ts/src/utils/download-utils.ts`
31. `autobyteus-server-ts/src/services/application-service.ts`
32. `autobyteus-server-ts/docs/modules/applications.md`
33. `autobyteus-message-gateway/package.json`
34. `autobyteus-message-gateway/docker/Dockerfile`
35. `autobyteus-message-gateway/README.md`

## Current Architecture Walkthrough

### 1. Node selection already exists as a first-class product concept

- The frontend already binds each window to a specific node base URL and derives all API endpoints from that base URL.
- Electron already distinguishes between the embedded local node and remote nodes.
- Capability probing already exists, but today it is very coarse and only reports terminal and file explorer streaming availability.

Implication:
- Messaging should align with this existing node boundary instead of introducing a separate Electron-local ownership model.

### 2. Messaging setup currently bypasses the node model

- The current messaging settings flow is built around a manually supplied gateway base URL and optional admin token.
- The gateway session setup store and gateway client speak directly to the gateway HTTP API instead of going through the selected node's server API.

Implication:
- The messaging UX currently behaves as if the gateway were an external appliance, even though the rest of the product is moving toward node-scoped ownership.

### 3. The server already owns persistent runtime data

- The Electron-managed embedded server already uses a dedicated `server-data` directory with `.env`, `db`, `logs`, and `download`.
- `autobyteus-server-ts` also exposes a general app-data abstraction with `db`, `logs`, `download`, `memory`, `skills`, `agents`, and other server-owned directories.
- Docker deployment already mounts a persistent server data volume.

Implication:
- A managed messaging gateway can be installed and persisted under server-owned storage for both embedded and remote nodes without inventing a new ownership model.

### 4. The server already owns mutable configuration surfaces

- Server settings are already exposed through GraphQL and consumed by the frontend as node-owned configuration.
- External channel bindings already live in the server's GraphQL API, but that surface only covers binding CRUD and provider/transport constraints.

Implication:
- Gateway lifecycle and configuration management should be added as another server-owned capability surface rather than a direct browser-to-gateway contract.

### 5. The server already has process-management precedent

- Electron already supervises the embedded server process.
- `autobyteus-server-ts` already contains a reusable child-process manager pattern for auxiliary runtimes (`CodexAppServerProcessManager`).

Implication:
- Running the messaging gateway as a server-managed child process is consistent with existing architecture and operational patterns.

### 6. The gateway is operationally separate, but technically easy to host

- `autobyteus-message-gateway` is an env-driven Node/Fastify service.
- Its runtime model depends on HTTP callbacks, provider adapters, and file-backed queue/session state rooted under the process working directory.
- Nothing in the inspected code requires Docker as the only runtime boundary.

Implication:
- The right deployment boundary is "server-managed companion process", not "manually run Docker service" and not "merge gateway code into the main server process".

### 7. There is precedent for download/install status UX, but not for server-managed runtime installs

- Electron app updates already expose a useful state machine for `checking`, `available`, `downloading`, `downloaded`, `installing`, `no-update`, and `error`.
- The corresponding frontend store and notice component already present progress, messages, and user actions cleanly.
- Embedded server diagnostics already have a dedicated advanced status UI that shows runtime details such as URLs and logs.

Implication:
- Managed gateway install/start UX can reuse the same product language and status shape, but it cannot directly reuse Electron updater plumbing because the gateway must be installed by the selected node's server, not by the desktop shell.

### 8. The repo has packaging and release precedent, but not for a standalone gateway artifact

- Desktop release flow publishes Electron installers to GitHub Releases.
- Server release flow publishes a Docker image for `autobyteus-server-ts`.
- `prepare-server.mjs` already builds and stages a portable Node server bundle for embedding under `resources/server`.
- I did not find a release workflow that publishes a standalone `autobyteus-message-gateway` artifact.

Implication:
- The build shape needed for an on-demand gateway download is technically straightforward, but the release pipeline for it does not exist yet and must be designed explicitly.

### 9. The server can download files, but not yet verify-and-install runtime artifacts

- `download-utils.ts` provides a generic URL-to-file download helper.
- I did not find a source-level utility for verifying artifact checksums/signatures and unpacking a runtime archive into an install root.

Implication:
- A managed gateway installer can reuse the basic download primitive, but it still needs new ownership for manifest resolution, integrity verification, archive extraction, install activation, and stale-version cleanup.

### 10. The gateway build target is already simple enough for a downloadable runtime package

- `autobyteus-message-gateway` builds to `dist/index.js`.
- The gateway Dockerfile is just a Node workspace build plus `node dist/index.js`.
- The README already documents direct non-Docker startup using `pnpm build` followed by `node dist/index.js`.

Implication:
- A downloadable artifact can be a versioned Node runtime package rather than a Docker image, which matches the "server downloads and starts it" requirement better for both embedded and remote nodes.

## Key Findings

- `F-001`: The product already has a node-centric control plane. Windows bind to nodes, endpoints are derived from node base URLs, and Electron supports embedded plus remote nodes.
- `F-002`: Messaging is the current architectural outlier. The default setup flow bypasses node routing and asks the user for an external gateway URL/token.
- `F-003`: The server side already owns durable storage, mutable settings, and capability reporting. Those are the natural anchors for managed messaging.
- `F-004`: The server side also already has precedent for supervising additional processes. A gateway supervisor is an extension of existing runtime ownership, not a brand new category of behavior.
- `F-005`: The gateway is already a standalone Node service and can run under the same Node runtime assumptions as the main server. Docker is an operational packaging choice, not a hard technical dependency.
- `F-006`: There is no existing generic server-extension installer platform in the codebase. Building one first would increase scope and delay the user-facing fix.
- `F-007`: Source-repo separation is the wrong optimization right now. The gateway and main server/web contracts still evolve together and benefit from monorepo-local refactors.
- `F-008`: Distribution separation and source separation are different decisions. The gateway can remain in the monorepo while still shipping as a versioned companion artifact or bundled runtime.
- `F-009`: The correct ownership boundary is the selected node's server data and process space. For embedded Electron, that happens to be local disk; for remote nodes, it belongs to the remote server environment.
- `F-010`: WeChat is not needed to validate this feature direction and should remain out of scope for the initial server-managed capability design.
- `F-011`: If release/package size is already a constraint, bundling the gateway into every desktop/server release is a weaker default than downloading a compatible gateway artifact only when messaging is enabled on a node.
- `F-012`: Exposing the gateway's bind port can be useful for diagnostics, but it should be treated as server-reported runtime metadata, not as a primary user configuration surface.
- `F-013`: The repo already has a clean UI/state precedent for download progress and installation status (`AppUpdater` + `appUpdateStore`), which is a good model for managed gateway lifecycle visibility.
- `F-014`: The repo already knows how to stage a portable bundled Node server (`prepare-server.mjs`), which suggests the gateway artifact should also be produced as a staged Node runtime package rather than as source-only files.
- `F-015`: There is currently no release workflow that publishes a standalone gateway artifact or release manifest, so dynamic installation requires new CI/release work in addition to runtime code.
- `F-016`: The repo has a generic file download helper, but not a reusable integrity-check and archive-extraction pipeline for runtime installation.

## Module And File Placement Observations

### Code that is already under the correct owner

- Node selection and node endpoint derivation live in `autobyteus-web` and should stay there because they are frontend control-plane concerns.
- Server data, server configuration, and server runtime ownership live in `autobyteus-server-ts` and Electron's embedded server manager, which is the correct boundary for lifecycle management.
- The gateway runtime itself already lives in its own package and is well positioned to remain a standalone companion process.

### Places where the current ownership boundary is wrong for managed messaging

- `autobyteus-web/components/settings/messaging/GatewayConnectionCard.vue`
- `autobyteus-web/stores/gatewaySessionSetupStore.ts`
- `autobyteus-web/services/messagingGatewayClient.ts`

These files are currently responsible for direct gateway connection management. That is the wrong default ownership boundary for a node-managed model. The canonical ownership should move to:

- server API and service logic in `autobyteus-server-ts`
- node capability modeling in both backend capability exposure and `autobyteus-web/types/node.ts`
- frontend settings UI that talks to the selected node's server API instead of the gateway directly

### Canonical placement for the new concern

- Managed gateway lifecycle API: `autobyteus-server-ts/src/api/...`
- Managed gateway service/supervisor: `autobyteus-server-ts/src/services/...` or a dedicated runtime-management area
- Managed gateway installer/release resolution: `autobyteus-server-ts/src/services/...` or a dedicated `runtime-management` / `managed-capabilities` area
- Node capability exposure: backend capability endpoint plus `autobyteus-web/types/node.ts` / `autobyteus-web/utils/nodeCapabilityProbe.ts`
- Embedded-node install root: Electron-managed `server-data`
- Remote-node install root: the remote server's app-data directory or mounted server data volume
- Diagnostic UI placement: advanced server/messaging status panels in `autobyteus-web`, fed by node-scoped server APIs rather than direct gateway calls

## Constraints

- `C-001`: The product must support multiple nodes, so messaging cannot be modeled as an Electron-only local install.
- `C-002`: The gateway should stay as a separate process for failure isolation and operational clarity.
- `C-003`: The initial solution should not require Docker socket control or container orchestration from inside the server.
- `C-004`: The initial solution should not depend on a generic plugin marketplace or arbitrary extension runtime.
- `C-005`: WeChat-specific sidecar behavior is excluded from this ticket's scope.
- `C-006`: Gateway install/update behavior must make sense for both embedded nodes and remote nodes, so Electron-only IPC cannot be the primary control mechanism.
- `C-007`: Gateway port visibility is useful, but should be diagnostic and read-only because bind details differ across embedded versus remote environments.

## Open Unknowns

- `U-001`: The final server API shape is still open. GraphQL, REST, or a mixed control/data approach are all viable.
- `U-002`: The exact gateway artifact format is still open. The evidence supports a staged Node runtime bundle, but the final archive structure and activation strategy still need design.
- `U-003`: The decommission path for the current manual external-gateway setup flow is still open, but the target architecture should be a clean replacement rather than a permanent dual-path system.
- `U-004`: The user-facing presentation of runtime diagnostics is still open. The current recommendation is status-first UI with optional advanced fields for bind address, port, version, and logs.

## Implications For Requirements And Design

- `I-001`: Messaging should be reframed as a node/server-managed capability.
- `I-002`: The gateway should remain in the monorepo.
- `I-003`: The gateway should remain a separate process rather than being linked into the main server process.
- `I-004`: The install root, config, logs, and state should all live under server-owned data directories.
- `I-005`: The frontend should stop depending on a raw gateway base URL and token in the default managed flow.
- `I-006`: The first iteration should target non-WeChat providers only and avoid building a generic extension framework up front.
- `I-007`: The default delivery strategy should be on-demand download of a server-compatible gateway artifact when messaging is enabled on a node, not unconditional bundling into every release package.
- `I-008`: The server should report runtime diagnostics, including bind port, as read-only status metadata so the frontend can surface it when useful without making it part of normal setup.
- `I-009`: The design must add a new release/build lane for a standalone gateway artifact and a compatible manifest lookup path, because neither exists in the current repo automation.
- `I-010`: The design must add artifact verification and extraction ownership on the server side, because only raw file download exists today.
- `I-011`: The design should replace the current raw gateway URL/token setup path for in-scope providers instead of preserving it as a long-term compatibility flow.
