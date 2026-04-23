# @autobyteus/application-sdk-contracts

Shared TypeScript contract package for AutoByteus application bundles.

## What it owns

- application manifest v3 types and version constants
- backend bundle manifest v1 types and version constants
- backend definition contract v2 types
- frontend SDK contract v2 constants
- shared request/route/GraphQL/notification/storage context types
- runtime-resource, resource-slot, and host-managed launch-default configuration types
- runtime-control, run-binding, execution-event envelope, and published-artifact callback/query types
- application engine status types

## Key exported version constants

- `APPLICATION_MANIFEST_VERSION_V3`
- `APPLICATION_BACKEND_BUNDLE_CONTRACT_VERSION_V1`
- `APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V2`
- `APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V2`
- `APPLICATION_EVENT_DELIVERY_SEMANTICS` (`AT_LEAST_ONCE`)

## Main shared contracts

### Bundle manifests

- `ApplicationManifestV3`
  - `application.json`
  - requires `manifestVersion: "3"`
  - requires `ui.frontendSdkContractVersion: "2"`
  - requires `backend.bundleManifest`
  - may declare app-consumable `resourceSlots[]` for host-managed saved setup
  - does **not** declare a singular launch-time `runtimeTarget`
- `ApplicationBackendBundleManifestV1`
  - bundle-owned backend manifest under `backend/`
  - declares backend entry module, supported exposures, target runtime, SDK compatibility, and optional migrations/assets directories

### Request / handler contracts

- `ApplicationRequestContext`
  - authoritative `applicationId`
  - optional `launchInstanceId`
- `ApplicationHandlerContext`
  - request context (or `null` for lifecycle hooks)
  - storage context
  - notification publisher
  - `runtimeControl`
- `ApplicationRouteRequest` / `ApplicationRouteResponse`
- `ApplicationGraphqlRequest`

### Runtime-orchestration contracts

- `ApplicationRuntimeControl`
- `ApplicationRuntimeResourceRef` / `ApplicationRuntimeResourceSummary`
- `ApplicationResourceSlotDeclaration`
- `ApplicationConfiguredResource` / `ApplicationConfiguredLaunchDefaults`
- `ApplicationStartRunInput`
- `ApplicationRunBindingSummary`
- `ApplicationExecutionEventEnvelope`
- `ApplicationPublishedArtifactEvent`

`ApplicationExecutionEventEnvelope` carries stable `eventId` and `journalSequence` plus attempt-specific delivery metadata. App-owned side effects should therefore be idempotent by `eventId`.

`ApplicationRuntimeControl` now also includes durable published-artifact reads through `getRunPublishedArtifacts(runId)` and `getPublishedArtifactRevisionText({ runId, revisionId })`, and `ApplicationBackendDefinition` exposes live published-artifact callbacks through `artifactHandlers.persisted`. These artifact callbacks are intentionally separate from lifecycle `eventHandlers`.

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

- manifest v3
- manifest-declared `resourceSlots[]`
- backend bundle manifest v1
- request context `{ applicationId, launchInstanceId? }`
- application-authored `runtimeControl.getConfiguredResource(...)` + `startRun(...)`
- published-artifact reads via `runtimeControl.getRunPublishedArtifacts(...)`
- durable execution-event dispatch envelopes with stable `eventId` and `journalSequence`

## Related docs

- `../autobyteus-server-ts/docs/modules/applications.md`
- `../autobyteus-server-ts/docs/modules/application_orchestration.md`
- `../autobyteus-server-ts/docs/modules/application_backend_gateway.md`
- `../autobyteus-server-ts/docs/modules/application_engine.md`
- `../autobyteus-server-ts/docs/modules/application_storage.md`
- `../autobyteus-web/docs/application-bundle-iframe-contract-v1.md`
- `../autobyteus-application-frontend-sdk/README.md`
- `../autobyteus-application-backend-sdk/README.md`
