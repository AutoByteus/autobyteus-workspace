# @autobyteus/application-sdk-contracts

Shared TypeScript contract package for AutoByteus application bundles.

## What it owns

- application manifest v4 types and version constants
- backend bundle manifest v1 types and version constants
- backend definition contract v5 types
- frontend SDK contract v5 constants
- iframe/bootstrap contract v4 constants, query hints, payload types, transport shape, and validators/builders
- shared request/route/GraphQL/notification/storage context types
- execution-resource, resource-slot, and host-managed launch-default configuration types
- named agent-execution, agent-resource, published-artifact, precise agent/team binding, standard agent-communication, and execution-event types
- optional application-backend WebSocket request/session/route types
- application engine status types


## External custom application guide

New external custom applications should start with `@autobyteus/application-devkit` and the canonical `src/` to `dist/importable-package` layout described in `../docs/custom-application-development.md`. Existing in-repo teaching samples remain internal examples and are not the external default folder model.

## Key exported version constants

- `APPLICATION_MANIFEST_VERSION_V4`
- `APPLICATION_BACKEND_BUNDLE_CONTRACT_VERSION_V1`
- `APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V6`
- `APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V6`
- `APPLICATION_EVENT_DELIVERY_SEMANTICS` (`AT_LEAST_ONCE`)

## Main shared contracts

### Bundle manifests

- `ApplicationManifestV4`
  - `application.json`
  - requires `manifestVersion: "4"`
  - requires `ui.frontendSdkContractVersion: "6"`
  - requires `backend.bundleManifest`
  - may declare app-consumable `executionResourceSlots[]` for host-managed saved setup
  - does **not** declare a singular launch-time `runtimeTarget`
- `ApplicationBackendBundleManifestV1`
  - bundle-owned backend manifest under `backend/`
  - declares backend entry module, supported exposures, target runtime, SDK compatibility, and optional migrations/assets directories

### Request / handler contracts

- `ApplicationRequestContext`
  - authoritative `applicationId`
- `ApplicationHandlerContext`
  - request context (or `null` for lifecycle hooks)
  - storage context
  - notification publisher
  - `agentExecution`, `agentResources`, and `publishedArtifacts`
- `ApplicationRouteRequest` / `ApplicationRouteResponse`
- `ApplicationGraphqlRequest`

### Iframe / bootstrap contract

- `APPLICATION_IFRAME_CHANNEL`
- `APPLICATION_IFRAME_CONTRACT_VERSION_V4`
- `APPLICATION_IFRAME_READY_EVENT`
- `APPLICATION_IFRAME_BOOTSTRAP_EVENT`
- `ApplicationIframeLaunchHints`
- `ApplicationHostTransport`
- `ApplicationUiReadyEnvelopeV4`
- `ApplicationHostBootstrapEnvelopeV4`
- `createApplicationUiReadyEnvelopeV4(...)`
- `createApplicationHostBootstrapEnvelopeV4(...)`
- `isApplicationUiReadyEnvelopeV4(...)`
- `isApplicationHostBootstrapEnvelopeV4(...)`
- `readApplicationIframeLaunchHints(...)`
- `normalizeApplicationHostOrigin(...)`
- `doesApplicationHostOriginMatch(...)`

`iframeLaunchId` is an ephemeral iframe bootstrap correlation id only. It is not app business identity and is not included in normal backend request context.

### Runtime-orchestration contracts

- `ApplicationAgentExecution` / `ApplicationAgentResources` / `ApplicationPublishedArtifacts`
- `ApplicationExecutionResourceRef` / `ApplicationExecutionResourceSummary`
- `ApplicationExecutionResourceSlotDeclaration`
- `ApplicationConfiguredExecutionResource` / `ApplicationConfiguredLaunchDefaults`
- `ApplicationStartAgentInput` / `ApplicationStartAgentTeamInput`
- `ApplicationAgentBinding` / `ApplicationAgentTeamBinding`
- `ApplicationAgentTargetAddress` / `ApplicationAgentInput` / `ApplicationAgentEvent` / `ApplicationAgentStreamEvent`
- `ApplicationAgentConnectionError` and standard wire-frame types
- `ApplicationExecutionEventEnvelope`
- `ApplicationPublishedArtifactEvent`
- `ApplicationWebSocketRouteDefinition` and its request/session/frame types

`ApplicationExecutionEventEnvelope` carries stable `eventId` and `journalSequence` plus attempt-specific delivery metadata. App-owned side effects should therefore be idempotent by `eventId`.

`ApplicationAgentStreamEvent` is the closed provider-neutral live stream: `TURN_STARTED`, exact `TEXT_DELTA`, `TURN_COMPLETED`, `TURN_INTERRUPTED`, or safe `ERROR`. It excludes reasoning, tools, native/provider records, and accumulated whole responses.

`ApplicationPublishedArtifacts` includes durable reads through `list(runId)` and `readRevision({ runId, revisionId })`, and `ApplicationBackendDefinition` exposes live published-artifact callbacks through `artifactHandlers.persisted`. These artifact callbacks are intentionally separate from lifecycle `eventHandlers`.

`ApplicationSkillAccessMode` is intentionally narrow: `PRELOADED_ONLY` means
the host launches with the target agent definition's configured skills, and
`NONE` suppresses AutoByteus-managed skills for flows that explicitly need no
skills. `GLOBAL_DISCOVERY` / all-installed skill access is not part of the SDK
contract. External application code should configure broad/orchestrator agents
by assigning the desired skill names to the agent definition rather than by
requesting a broader launch-time mode.

SDK consumers use the `ApplicationExecutionResource*` types, `source`, `executionResourceRef`, `executionResourceSlots[]`, and `agentResources.listAvailable(...)` / `agentResources.getConfigured(...)`.

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

- manifest v4
- manifest-declared `executionResourceSlots[]`
- backend bundle manifest v1
- shared iframe/bootstrap contract v4 with fixed backend notification, custom WebSocket, and standard agent-communication bases
- request context `{ applicationId }`
- application-authored `agentResources.getConfigured(...)` + `agentExecution.startAgentTeam(...)`
- published-artifact reads via `publishedArtifacts.list(...)`
- durable execution-event dispatch envelopes with stable `eventId` and `journalSequence`

## Related docs

- `../autobyteus-server-ts/docs/modules/applications.md`
- `../autobyteus-server-ts/docs/modules/application_orchestration.md`
- `../autobyteus-server-ts/docs/modules/application_backend_api_gateway.md`
- `../autobyteus-server-ts/docs/modules/application_engine.md`
- `../autobyteus-server-ts/docs/modules/application_storage.md`
- `../autobyteus-web/docs/application-bundle-iframe-contract-v4.md`
- `../autobyteus-application-frontend-sdk/README.md`
- `../autobyteus-application-backend-sdk/README.md`
