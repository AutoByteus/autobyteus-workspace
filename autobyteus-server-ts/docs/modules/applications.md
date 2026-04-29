# Applications

## Scope

Discovers self-contained application bundles, validates both the bundle UI contract and the bundle-owned backend contract, exposes transport-neutral catalog metadata plus bundled runtime resources, and serves bundle-owned `ui/` assets for the generic frontend Applications host.

Application-owned runtime orchestration, backend transport, worker lifecycle, and storage ownership are documented separately in [`application_orchestration.md`](./application_orchestration.md), [`application_backend_gateway.md`](./application_backend_gateway.md), [`application_engine.md`](./application_engine.md), and [`application_storage.md`](./application_storage.md). Runtime module availability is documented separately in [`application_capability.md`](./application_capability.md).

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

- `manifestVersion` must be `"3"`.
- `id` must match the bundle folder name.
- `ui.entryHtml` is required and must point to a file under `ui/`.
- `ui.frontendSdkContractVersion` must be `"3"`.
- `icon` is optional and must also stay under `ui/`.
- `backend.bundleManifest` is required and must point to a file under `backend/`.

There is no longer a bundle-level `runtimeTarget`. Instead, bundle-owned agents and teams are discovered from `agents/` and `agent-teams/` and surfaced to callers as `bundleResources[]`. Applications may also declare `resourceSlots[]` in `application.json` to describe the app-consumable runtime resources that the host setup flow must configure before entry. The generic Applications host does not auto-launch any one of them.

### Backend bundle manifest (`backend.bundleManifest`)

- `contractVersion` must be `"1"`.
- `entryModule` must stay under `backend/` and currently must be a prebuilt self-contained ESM module.
- `moduleFormat` must be `"esm"`.
- `distribution` must be `"self-contained"`.
- `targetRuntime.engine` must be `"node"` and `targetRuntime.semver` declares the supported Node range.
- `sdkCompatibility.backendDefinitionContractVersion` must be `"2"`.
- `sdkCompatibility.frontendSdkContractVersion` must be `"3"`.
- `supportedExposures` declares which backend surfaces are allowed (`queries`, `commands`, `routes`, `graphql`, `notifications`, `eventHandlers`).
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
- GraphQL exposes transport-neutral UI asset paths (`iconAssetPath`, `entryHtmlAssetPath`) plus `bundleResources[]` and manifest-declared `resourceSlots[]` rather than host-usable absolute URLs or launch-time runtime state.
- `Application.resourceSlots` gives the frontend enough contract detail to summarize required host-managed setup on catalog cards and host pages without promoting raw runtime-resource identities into the primary catalog UX.
- Backend exposures are not surfaced as raw public URLs in the catalog; they stay behind the platform-owned backend gateway and iframe bootstrap transport.
- Bundles may expose zero or more bundled runtime resources. Application backends can also choose shared agents/teams later through the runtime-control boundary.
- Discovery now produces a diagnostic-aware catalog snapshot: valid bundles remain visible while invalid bundles are quarantined with per-application diagnostics instead of aborting the whole catalog refresh.
- App-scoped reload/reentry can repair one quarantined application and return it to service without restarting unrelated applications. Re-entry preserves `REENTERING` until recovery/dispatch resume finish, then returns the app to `ACTIVE` with the worker still stopped so the next `ensure-ready` path boots a fresh worker.
- When a package is removed or temporarily undiscoverable but platform state still exists, persisted-known reconciliation keeps the real canonical `applicationId` under `QUARANTINED` ownership instead of dropping admission ownership or falling back to the hashed storage-key identity.

## Package Source Presentation

- `ApplicationPackageService` is the authoritative settings-facing owner for application-package source summaries and debug details.
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
- After a catalog entry is selected, the generic host loads the application's saved launch setup for declared `resourceSlots[]`, blocks entry until required setup is launch-ready, and only then ensures the application backend is ready and boots the iframe.
- If the application backend later wants runtime work, it calls `context.runtimeControl.*` through the application-orchestration boundary.
- Bundles therefore remain the durable package/distribution boundary, while orchestration, backend transport, engine startup, and storage state have separate authoritative owners.

## Integrity Rules

- Missing `ui` assets, a missing backend bundle manifest, or a missing backend entry module make the bundle invalid.
- Application-owned teams are validated during bundle scan/import so their nested team-local members cannot escape the owning team folder and nested team refs cannot point outside the same owning application bundle.
- UI and backend manifest paths must stay inside the resolved bundle root.
- Backend paths declared from `application.json` or `backend.bundleManifest` must remain under `backend/`; UI paths must remain under `ui/`.
- Built-in and imported bundles are both treated as package-owned application sources.

## Related Docs

- [`application_capability.md`](./application_capability.md)
- [`application_orchestration.md`](./application_orchestration.md)
- [`application_backend_gateway.md`](./application_backend_gateway.md)
- [`application_engine.md`](./application_engine.md)
- [`application_storage.md`](./application_storage.md)
- `../../../autobyteus-web/docs/applications.md`
- `../../../autobyteus-web/docs/application-bundle-iframe-contract-v3.md`
- `../../../autobyteus-application-sdk-contracts/README.md`
- `../../../autobyteus-application-frontend-sdk/README.md`
- `../../../autobyteus-application-backend-sdk/README.md`
- `../../../docs/custom-application-development.md`
