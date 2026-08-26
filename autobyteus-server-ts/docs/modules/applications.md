# Applications

## Scope

Discovers self-contained application bundles, validates both the bundle UI contract and the bundle-owned backend contract, exposes transport-neutral catalog metadata plus bundled execution resources, and serves bundle-owned `ui/` assets for the generic frontend Applications host.

Application-owned runtime orchestration, backend transport, worker lifecycle, and storage ownership are documented separately in [`application_orchestration.md`](./application_orchestration.md), [`application_backend_api_gateway.md`](./application_backend_api_gateway.md), [`application_engine.md`](./application_engine.md), and [`application_storage.md`](./application_storage.md). Runtime module availability is documented separately in [`application_capability.md`](./application_capability.md).

## TS Source

- `src/application-bundles`
- `src/api/graphql/types/application.ts`
- `src/api/rest/application-bundles.ts`

## Main Service

- `src/application-bundles/services/application-bundle-service.ts`
- `src/application-bundles/providers/file-application-bundle-provider.ts`
- `src/application-bundles/utils/application-manifest.ts`
- `src/application-bundles/utils/application-backend-manifest.ts`

## Bundle Contract

Each application bundle lives under `applications/<application-id>/` and must satisfy both a frontend bundle manifest and a backend bundle manifest.

### `application.json`

- `manifestVersion` must be `"4"`.
- `id` must match the bundle folder name.
- `ui.entryHtml` is required and must point to a file under `ui/`.
- `ui.frontendSdkContractVersion` must be `"6"`.
- `icon` is optional and must also stay under `ui/`.
- `backend.bundleManifest` is required and must point to a file under `backend/`.

There is no longer a bundle-level `runtimeTarget`. Instead, bundle-owned agents and teams are discovered from `agents/` and `agent-teams/` and surfaced to callers as `bundleResources[]`. Applications may also declare `executionResourceSlots[]` in `application.json` to describe the app-consumable execution resources that the host setup flow must configure before entry. The generic Applications host does not auto-launch any one of them.

### Backend bundle manifest (`backend.bundleManifest`)

- `contractVersion` must be `"1"`.
- `entryModule` must stay under `backend/` and currently must be a prebuilt self-contained ESM module.
- `moduleFormat` must be `"esm"`.
- `distribution` must be `"self-contained"`.
- `targetRuntime.engine` must be `"node"` and `targetRuntime.semver` declares the supported Node range.
- `sdkCompatibility.backendDefinitionContractVersion` must be `"6"`; unsupported bundles are rejected during discovery.
- `sdkCompatibility.frontendSdkContractVersion` must be `"6"`.
- `supportedExposures` is the sole seven-flag exposure authority (`queries`, `commands`, `routes`, `graphql`, `notifications`, `eventHandlers`, `webSockets`).
- The loaded backend definition must use contract version `"6"`; `webSocketRoutes` are admitted only when `webSockets` is enabled.
- `migrationsDir` and `assetsDir` are optional, but when present they must also stay under `backend/`.

The platform does not install app dependencies or run app builds at import/start time. Imported application backends must ship the needed `backend/dist/**` artifacts inside the bundle.

## External Authoring Flow

New external custom applications should use the repo-level
[`custom application development guide`](../../../docs/custom-application-development.md)
and the `@autobyteus/application-devkit` CLI instead of copying the older
repo-local sample layout. That flow keeps editable source under `src/**` and
generates the importable package under `dist/importable-package/applications/<application-id>/`.
The generated package still uses this module's production bundle contract:
`application.json`, runtime `ui/` assets, and runtime `backend/` bundle files
inside each `applications/<application-id>/` package root.

## Current Authoring Samples

The current in-repo teaching/sample applications live only under the shared repo-root `applications/` container:

- `../../../applications/brief-studio/`
- `../../../applications/socratic-math-teacher/`

Important paths:

- Brief Studio authoring source:
  - `../../../applications/brief-studio/`
- Brief Studio generated importable package:
  - `../../../applications/brief-studio/dist/importable-package/`
- Socratic Math Teacher authoring source:
  - `../../../applications/socratic-math-teacher/`
- Socratic Math Teacher generated importable package:
  - `../../../applications/socratic-math-teacher/dist/importable-package/`

These are authoring/sample roots, not current shipped built-ins. Future built-in applications should only appear through an explicit promotion/packaging decision, not by maintaining parallel editable source trees. Repo-local discovery uses the direct child roots under `applications/` and ignores nested packaging mirrors unless those packaging roots are explicitly provisioned/imported as separate package sources.

## Discovery And Catalog Notes

- Repo-local applications and imported package applications use the same bundle-discovery path.
- Discovery walks the managed built-in package root plus registered additional package roots and produces one catalog entry per valid bundle.
- Built-in applications are materialized from the server-owned bundled payload under `autobyteus-server-ts/application-packages/platform/applications/` into `<app-data-dir>/application-packages/platform/applications/`; that managed root is the authoritative built-in package identity for discovery and settings, even when the current built-in application set is intentionally empty.
- Repo-root `applications/` remains authoring-only and is not an implicit built-in materialization source.
- The bundled resource root is a read-only materialization source and debug detail, not a user-imported package root.
- If the same physical applications root is also presented as an additional package root, discovery skips the duplicate additional-root entry instead of minting a competing package identity.
- The protected managed built-in applications root and the bundled source root are not valid user-configured additional package roots.
- Bundle validation checks UI asset paths, backend manifest integrity, and application-owned team integrity including nested `agent-teams/<team-id>/agents/*` members before a bundle reaches the catalog.
- GraphQL exposes transport-neutral UI asset paths (`iconAssetPath`, `entryHtmlAssetPath`) plus `bundleResources[]` and manifest-declared `executionResourceSlots[]` rather than host-usable absolute URLs or launch-time runtime state.
- `Application.executionResourceSlots` gives the frontend enough contract detail to summarize required host-managed setup on catalog cards and host pages without promoting raw execution-resource identities into the primary catalog UX.
- Backend exposures are not surfaced as raw public URLs in the catalog; they stay behind the platform-owned backend API gateway and iframe bootstrap transport. The standard application-bound agent connection is a separate direct host capability and does not traverse that gateway or the application worker.
- Bundles may expose zero or more bundled execution resources. Application backends can also choose shared agents/teams later through `context.agentResources`.
- Discovery now produces a diagnostic-aware catalog snapshot: valid bundles remain visible while invalid bundles are quarantined with per-application diagnostics instead of aborting the whole catalog refresh.
- App-scoped reload/reentry can repair one quarantined application and return it to service without restarting unrelated applications. Re-entry preserves `REENTERING` until recovery/dispatch resume finish, then returns the app to `ACTIVE` with the worker still stopped so the next `ensure-ready` path boots a fresh worker.
- When a package is removed or temporarily undiscoverable but platform state still exists, persisted-known reconciliation keeps the real canonical `applicationId` under `QUARANTINED` ownership instead of dropping admission ownership or falling back to the hashed storage-key identity.

## Package Source Presentation

- `ApplicationPackageRegistryService` owns package-root and registry-record state plus settings-facing source summaries and debug details.
- `ApplicationPackageCommandService` owns import, reload, remove, validation, managed-install cleanup, and rollback.
- `ApplicationCatalogRefreshCoordinator` is the only owner of the ordered bundle refresh, availability reconciliation, agent-definition refresh, and team-definition refresh sequence.
- Default list rows hide empty platform-owned built-in packages, show non-empty built-ins as `Platform Applications`, and keep raw internal built-in paths behind explicit details.
- Linked local package rows may show the user-chosen root path directly.
- GitHub-installed package rows use repository identity by default; managed install paths stay in details/debug-only surfaces.

## Runtime Availability Boundary

- Whether the Applications module is available at all is no longer a baked frontend build flag.
- The backend answers that question through the typed runtime Applications capability documented in [`application_capability.md`](./application_capability.md).
- Bundle discovery only participates in one place: first-time capability initialization when `ENABLE_APPLICATIONS` has not been persisted yet.
- After initialization, bundle discovery and bundle serving remain distinct from the steady-state runtime capability authority.

## Runtime Handoff

- The applications module owns discovery, validation, catalog metadata, app-scoped availability diagnostics, and asset serving only; it does not own live run bindings, event journals, backend request handling, worker lifecycle, or per-app storage.
- After a catalog entry is selected, the generic host loads the application's saved launch setup for declared `executionResourceSlots[]`, blocks entry until required setup is launch-ready, and only then ensures the application backend is ready and boots the iframe.
- If the application backend later wants runtime work, it calls the named `context.agentExecution`, `context.agentResources`, or `context.publishedArtifacts` capability through the application-orchestration boundary.
- Bundles therefore remain the durable package/distribution boundary, while orchestration, backend transport, engine startup, and storage state have separate authoritative owners.

## Dual-Host Servers And Application Runtime

`buildStudioServer` and `buildStandaloneApplicationServer` are the two server
assembly roots over `ApplicationPlatformRuntime`. Studio builds one application
runtime for its process and shares that connected service set across installed
applications. Standalone builds one application runtime for its process and
selects exactly one application from the configured package.

Building `ApplicationPlatformRuntime` prepares managers, services, factories,
and lifecycle owners; it starts no new agent or team run. Its outward boundary
contains exactly four immutable projections: `lifecycle`, `rest`, `realtime`,
and `hostManagement`. Application business demand creates new execution, while
the established recovery phase may restore recorded runs after the server
listens.

- Studio combines the application catalog, setup UI, iframe host, broad Studio
  APIs, the internal `/mcp/agent-tools/:sessionId` route, and the external
  `/mcp/gateway` client surface.
- Standalone selects exactly one local application or package, validates it
  before the server listens, serves its UI at `/`, and exposes same-origin
  bootstrap plus application backend/WebSocket surfaces under
  `/_autobyteus/*`. It includes the internal Agent Tools route but not the
  Studio external gateway.
- Standalone does not copy Studio launch overrides or platform state. A complete
  bundle-owned package baseline is sufficient to start the same package.
- Both hosts treat package bytes as immutable input; mutable storage, logs,
  credentials, and runtime state live outside the package root.
- Each process owns one `AgentToolsMcpHost`. Every application platform runtime
  creates one private `ApplicationExecutionScope` and begins a scoped Agent
  Tools session-authority assembly before constructing its run resources. The
  authority is completed only after the concrete publication capability and
  readiness assertion exist. This keeps provider construction, run cleanup,
  and session revocation explicit and graph-local without deferred binding or a
  process-global application lookup. General Process execution uses a separate
  authority/supervisor. `/mcp/agent-tools/:sessionId` remains distinct from
  Studio-only `/mcp/gateway`.

Server assembly and standalone-host ownership live under
`src/compositions/build-studio-server.ts`,
`src/compositions/build-standalone-application-server.ts`,
`src/standalone-application-host`, and `src/application-platform`.

## Executable Application-Framework Boundaries

`tests/architecture/application-framework-boundaries.test.ts` is the executable
source of truth for the contributor-facing application-framework dependency
rules below. It parses governed TypeScript, JavaScript, and Vue `<script>` /
`<script setup>` source, resolves repository imports against the owning project,
and reports the policy ID, project profile, importer/location, dependency or
missing injection path, and the required correction. The checker is test-only;
it is not loaded by Studio or standalone startup.

| Policy | Governed source | Allowed direction | Rejected direction | Correction |
| --- | --- | --- | --- | --- |
| `AFB-001` | REST, WebSocket, standalone application APIs, and standalone bootstrap | `application-platform-runtime-contracts.ts` and exact subject inputs supplied by assembly | Runtime builder/lifecycle, stores, recovery/availability state, run/session/publication, engine/queue, or shutdown internals | Depend on the exact runtime projection or have the assembly root supply the subject input. |
| `AFB-002` | Studio GraphQL and production application presentation source | GraphQL package/query/command contracts; application SDK contracts/client and presentation-local helpers | GraphQL access to private application runtime owners; Studio presentation access to server package/bundle/runtime implementation | Use the declared GraphQL contract or an application SDK/presentation-local helper. |
| `AFB-003` | Application package and bundle owners | Their own stores, readers, commands, providers, and domain contracts | API/presentation, server assembly, standalone host, or private application runtime | Keep the dependency inside the package/bundle owner. The sole cross-owner seam is `ApplicationCatalogRefreshCoordinator` -> `ApplicationCatalogReconciliationService`. |
| `AFB-004` | Application runtime construction, application MCP session scope/manager, and publish adapter | Complete application-scoped publication/run/session-provider/team-context injection | Direct process-global/default calls or omission, `null`, `undefined`, or opaque spread of a required graph-local input | Inject the named application-scoped dependency. Genuine general-process selection belongs only in `build-studio-server.ts` or `start-standalone-application-host.ts`. |
| `AFB-005` | Maintained Brief/Socratic frontend/backend source and every valid devkit template `src` tree | Project-local source, application SDKs, Node built-ins, and libraries declared by the importer's own manifest | Server/web/Electron/standalone/devkit host internals, undeclared libraries, or local/alias paths escaping the owning project | Use local/SDK source or declare a genuine library in that project's own manifest; do not borrow another project's declaration. |

### Project and manifest resolution

Every importer belongs to one closed profile: `server`, `studio-web`,
`brief-backend`, `brief-frontend`, `socratic-backend`, `socratic-frontend`, or
`devkit-template:<name>`. Server and backend profiles use their checked-in
TypeScript configuration. Studio uses deterministic Nuxt source aliases without
loading generated `.nuxt` state. Frontend and template profiles use their
checked-in application config and explicit JavaScript/NodeNext resolution.

AFB-005 checks `dependencies`, `devDependencies`, `peerDependencies`, and
`optionalDependencies` only in the importing application's or template's own
`package.json`. Node built-ins need no declaration. Relative, absolute, Nuxt
alias, and manifest-`imports` specifiers that should name repository source fail
as `UNRESOLVED_GOVERNED_IMPORT` when they cannot be resolved; they are never
silently skipped. Checked-in application `frontend-src/generated/**` remains
governed, while package `dist/**`, `.build/**`, and generated `.nuxt/**` do not.

### AFB-004 injection families

AFB-004 keeps four graph-sensitive construction families complete:

1. **Publication/resource identity:** run session scope, file-change relay,
   memory observer, active-run reader, artifact relay, projection, and snapshot
   stores.
2. **Run ownership/persistence:** all three backend factories, active registry,
   memory recorder, definition/run/team metadata services, identity allocator,
   and run service.
3. **Session/provider scope:** application session scope and publisher,
   AutoByteus definition service, Codex bootstrapper, Claude session
   manager/bootstrapper, and provider Agent Tools session manager. Application
   construction must supply `CodexAgentRunBackendFactory` argument 1 and
   `ClaudeAgentRunBackendFactory` arguments 0 and 1; Codex thread-manager and
   cleanup positions 0 and 2 deliberately remain process-scoped.
4. **Team/context scope:** team-definition context, mixed-team factory/manager,
   team communication and file-change services, run-history manager, identity,
   metadata, and memory inputs.

Required object inputs are inline object literals with explicit non-computed,
non-null properties; a spread does not satisfy an obligation. Required
positional inputs must be present and non-null/non-`undefined`. Reusable
constructors retain their legitimate general-process defaults, but application
construction may not select them by omission. Any genuine obligation or
exception change updates this table, the executable checker and fixtures, and
the reviewed architecture together—never a compatibility wrapper or broad
allow-list.

## Integrity Rules

- Missing `ui` assets, a missing backend bundle manifest, or a missing backend entry module make the bundle invalid.
- Application-owned teams are validated during bundle scan/import so their nested team-local members cannot escape the owning team folder and nested team refs cannot point outside the same owning application bundle.
- UI and backend manifest paths must stay inside the resolved bundle root.
- Backend paths declared from `application.json` or `backend.bundleManifest` must remain under `backend/`; UI paths must remain under `ui/`.
- Built-in and imported bundles are both treated as package-owned application sources.

## Related Docs

- [`application_capability.md`](./application_capability.md)
- [`application_orchestration.md`](./application_orchestration.md)
- [`application_backend_api_gateway.md`](./application_backend_api_gateway.md)
- [`application_engine.md`](./application_engine.md)
- [`application_storage.md`](./application_storage.md)
- `../../../autobyteus-web/docs/applications.md`
- `../../../autobyteus-web/docs/application-bundle-iframe-contract.md`
- `../../../autobyteus-application-sdk-contracts/README.md`
- `../../../autobyteus-application-frontend-sdk/README.md`
- `../../../autobyteus-application-backend-sdk/README.md`
- `../../../docs/custom-application-development.md`
