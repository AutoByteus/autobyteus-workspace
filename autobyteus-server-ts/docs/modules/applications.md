# Applications

## Scope

Discovers self-contained application bundles, validates both the bundle UI contract and the bundle-owned backend contract, exposes transport-neutral catalog metadata, and serves bundle-owned `ui/` assets for the generic frontend application host.

Launched runtime lifecycle, durable session/publication state, backend transport, engine startup, and storage ownership are documented separately in [`application_sessions.md`](./application_sessions.md), [`application_backend_gateway.md`](./application_backend_gateway.md), [`application_engine.md`](./application_engine.md), and [`application_storage.md`](./application_storage.md). Runtime module availability is documented separately in [`application_capability.md`](./application_capability.md).

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

Each application bundle lives under `applications/<application-id>/` and must now satisfy both a frontend bundle manifest and a backend bundle manifest.

### `application.json`

- `manifestVersion` must be `"2"`.
- `id` must match the bundle folder name.
- `ui.entryHtml` is required and must point to a file under `ui/`.
- `ui.frontendSdkContractVersion` must be `"1"`.
- `icon` is optional and must also stay under `ui/`.
- `runtimeTarget.kind` must be `AGENT` or `AGENT_TEAM`.
- `runtimeTarget.localId` must resolve to an embedded agent under `agents/` or an embedded team under `agent-teams/` in the same bundle.
- `backend.bundleManifest` is required and must point to a file under `backend/`.

### Backend bundle manifest (`backend.bundleManifest`)

- `contractVersion` must be `"1"`.
- `entryModule` must stay under `backend/` and currently must be a prebuilt self-contained ESM module.
- `moduleFormat` must be `"esm"`.
- `distribution` must be `"self-contained"`.
- `targetRuntime.engine` must be `"node"` and `targetRuntime.semver` declares the supported Node range.
- `sdkCompatibility.backendDefinitionContractVersion` must be `"1"`.
- `sdkCompatibility.frontendSdkContractVersion` must be `"1"`.
- `supportedExposures` declares which backend surfaces are allowed (`queries`, `commands`, `routes`, `graphql`, `notifications`, `eventHandlers`).
- `migrationsDir` and `assetsDir` are optional, but when present they must also stay under `backend/`.

The platform does not install app dependencies or run app builds at import/start time. Imported application backends must ship the needed `backend/dist/**` artifacts inside the bundle.

## Authoring reference sample

The canonical teaching sample now lives under the shared repo-root applications container:

- `../../../applications/brief-studio/`

Important paths:

- authoring source:
  - `../../../applications/brief-studio/`
- generated importable package:
  - `../../../applications/brief-studio/dist/importable-package/`

This sample teaches the shared root model directly:

- repo-local runnable root:
  - `../../../applications/brief-studio/`
- packaging-only import mirror:
  - `../../../applications/brief-studio/dist/importable-package/`

Repo-local discovery uses the direct child root under `applications/` and ignores the nested packaging mirror unless that packaging root is explicitly provisioned/imported as a separate package source.

## Discovery And Catalog Notes

- Repo-local applications and imported package applications use the same bundle-discovery path.
- Discovery walks built-in roots plus registered additional package roots and produces one catalog entry per valid bundle.
- The repo-local built-in applications container resolved by upward scan remains authoritative for built-in package identity.
- If the same physical applications root is also presented as an additional package root, discovery skips the duplicate additional-root entry instead of minting a competing package identity.
- The protected built-in applications root is not a valid user-configured additional package root.
- Bundle validation now checks UI asset paths, backend manifest integrity, runtime-target ownership, and application-owned team integrity before a bundle reaches the catalog.
- GraphQL still exposes transport-neutral UI asset paths (`iconAssetPath`, `entryHtmlAssetPath`) rather than host-usable absolute URLs.
- Backend exposures are not surfaced as raw public URLs in the catalog; they stay behind the platform-owned gateway and iframe bootstrap transport.
- Runtime targets are surfaced with canonical ids so launches bind to the owning bundle’s embedded agent or team instead of relying on global name lookup.
- Session snapshots reuse this catalog metadata so `/applications/[id]` can render bundle ownership and asset details without a second lookup model.

## Runtime Availability Boundary

- Whether the Applications module is available at all is no longer a baked frontend build flag.
- The backend answers that question through the typed runtime Applications capability documented in [`application_capability.md`](./application_capability.md).
- Bundle discovery only participates in one place: first-time capability initialization when `ENABLE_APPLICATIONS` has not been persisted yet.
- After initialization, bundle discovery and bundle serving remain distinct from the steady-state runtime capability authority.

## Runtime Handoff

- The applications module owns discovery, validation, and asset serving only; it does not own live runtime state, backend request handling, worker lifecycle, or per-app storage.
- After a catalog entry is selected, launch/bind/send-input/publication flows move into the application-session subsystem.
- App-owned backend queries, commands, routes, GraphQL, and notifications move through the platform-owned backend gateway and app engine.
- Bundles therefore remain the durable package/distribution boundary, while application sessions, backend transport, engine startup, and storage state have separate authoritative owners.

## Integrity Rules

- Missing `ui` assets, a missing backend bundle manifest, a missing backend entry module, or a missing runtime target make the bundle invalid.
- Application-owned teams are validated during bundle scan/import so their members cannot point outside the same owning application bundle.
- UI and backend manifest paths must stay inside the resolved bundle root.
- Backend paths declared from `application.json` or `backend.bundleManifest` must remain under `backend/`; UI paths must remain under `ui/`.
- Built-in and imported bundles are both treated as package-owned application sources.

## Related Docs

- [`application_capability.md`](./application_capability.md)
- [`application_sessions.md`](./application_sessions.md)
- [`application_backend_gateway.md`](./application_backend_gateway.md)
- [`application_engine.md`](./application_engine.md)
- [`application_storage.md`](./application_storage.md)
- `../../../autobyteus-web/docs/applications.md`
- `../../../autobyteus-web/docs/application-bundle-iframe-contract-v1.md`
- `../../../autobyteus-application-sdk-contracts/README.md`
- `../../../autobyteus-application-frontend-sdk/README.md`
- `../../../autobyteus-application-backend-sdk/README.md`
