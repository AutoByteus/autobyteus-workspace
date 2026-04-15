# @autobyteus/application-sdk-contracts

Shared TypeScript contract package for AutoByteus application bundles.

## What it owns

- application manifest v2 types and version constants
- backend bundle manifest v1 types and version constants
- shared request/route/GraphQL/notification/storage context types
- normalized publication event and event-dispatch envelope types
- application engine status types

## Key exported version constants

- `APPLICATION_MANIFEST_VERSION_V2`
- `APPLICATION_BACKEND_BUNDLE_CONTRACT_VERSION_V1`
- `APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V1`
- `APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V1`
- `APPLICATION_EVENT_DELIVERY_SEMANTICS` (`AT_LEAST_ONCE`)

## Main shared contracts

### Bundle manifests

- `ApplicationManifestV2`
  - `application.json`
  - requires `manifestVersion: "2"`
  - requires `ui.frontendSdkContractVersion: "1"`
  - requires `backend.bundleManifest`
- `ApplicationBackendBundleManifestV1`
  - bundle-owned backend manifest under `backend/`
  - declares backend entry module, supported exposures, runtime target, and optional migrations/assets directories

### Request / handler contracts

- `ApplicationRequestContext`
  - authoritative `applicationId`
  - optional `applicationSessionId`
- `ApplicationHandlerContext`
  - request context (or `null` for lifecycle hooks)
  - storage context
  - notification publisher
- `ApplicationRouteRequest` / `ApplicationRouteResponse`
- `ApplicationGraphqlRequest`

### Backend-definition contracts

- `ApplicationBackendDefinition`
- `ApplicationQueryHandler`
- `ApplicationCommandHandler`
- `ApplicationRouteDefinition`
- `ApplicationGraphqlExecutor`
- `ApplicationEventHandler`
- `ApplicationLifecycleHook`

### Durable publication contracts

- `NormalizedPublicationEvent`
- `ApplicationEventDispatchEnvelope`
- `NormalizedPublicationEventFamily`

The event envelope carries stable `eventId` and `journalSequence` plus attempt-specific delivery metadata. App-owned side effects should therefore be idempotent by `eventId`.

### Engine status

- `ApplicationEngineState`
- `ApplicationEngineStatus`
- `ApplicationBackendExposureSummary`

## Teaching sample

The canonical repo-local runnable sample that uses these shared contracts lives at:

- `../applications/brief-studio/README.md`

It also emits a packaging-only import mirror under:

- `../applications/brief-studio/dist/importable-package/`

It demonstrates:

- manifest v2
- backend bundle manifest v1
- app-scoped `ApplicationRequestContext`
- durable publication dispatch envelopes with stable `eventId` and `journalSequence`

## Related docs

- `../autobyteus-server-ts/docs/modules/applications.md`
- `../autobyteus-server-ts/docs/modules/application_backend_gateway.md`
- `../autobyteus-server-ts/docs/modules/application_engine.md`
- `../autobyteus-server-ts/docs/modules/application_storage.md`
- `../autobyteus-web/docs/application-bundle-iframe-contract-v1.md`
- `../autobyteus-application-frontend-sdk/README.md`
- `../autobyteus-application-backend-sdk/README.md`
