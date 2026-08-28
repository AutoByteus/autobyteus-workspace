# @autobyteus/application-sdk-contracts

Shared TypeScript contract package for AutoByteus application bundles.

## What it owns

- application manifest v5 types and version constants
- backend bundle manifest v1 types and version constants
- backend definition contract v7 types
- frontend SDK contract v6 constants
- iframe/bootstrap contract v4 constants, query hints, payload types, transport shape, and validators/builders
- shared request/route/GraphQL/notification/storage context types
- execution-resource, resource-slot, and host-managed launch-default configuration types
- named agent-execution, agent-resource, published-artifact, precise agent/team binding, standard agent-communication, and execution-event types
- application-owned agent-tool declaration, caller, handler, content, and result types
- optional application-backend WebSocket request/session/route types
- application engine status types


## External custom application guide

New external custom applications should start with `@autobyteus/application-devkit` and the canonical `src/` to `dist/importable-package` layout described in `../docs/custom-application-development.md`. Existing in-repo teaching samples remain internal examples and are not the external default folder model.

## Key exported version constants

- `APPLICATION_MANIFEST_VERSION`
- `APPLICATION_BACKEND_BUNDLE_CONTRACT_VERSION`
- `APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION`
- `APPLICATION_FRONTEND_SDK_CONTRACT_VERSION`
- `APPLICATION_EVENT_DELIVERY_SEMANTICS` (`AT_LEAST_ONCE`)

## Main shared contracts

### Bundle manifests

- `ApplicationManifest`
  - `application.json`
  - requires `manifestVersion: "5"`
  - requires `ui.frontendSdkContractVersion: "6"`
  - requires `backend.bundleManifest`
  - may declare app-consumable `executionResourceSlots[]` for host-managed saved setup
  - may declare static application-owned `agentTools[]`; a declaration is available only to an application run whose Agent/Team definition selects its name
  - does **not** declare a singular launch-time `runtimeTarget`
- `ApplicationBackendBundleManifest`
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
- `ApplicationAgentToolDeclaration`
  - stable `name`, description, and a deliberately portable object `inputSchema`
  - supports nested object/array properties plus string, integer, number, and boolean constraints represented by the shared mapper
- `ApplicationAgentToolHandler`
  - receives already-authorized and schema-validated arguments
  - receives the immutable binding-derived caller identity under `context.caller`
  - returns MCP-safe content, optional structured content, and optional explicit error status
- `ApplicationRouteRequest` / `ApplicationRouteResponse`
- `ApplicationGraphqlRequest`

### Iframe / bootstrap contract

- `APPLICATION_IFRAME_CHANNEL`
- `APPLICATION_IFRAME_CONTRACT_VERSION`
- `APPLICATION_IFRAME_READY_EVENT`
- `APPLICATION_IFRAME_BOOTSTRAP_EVENT`
- `ApplicationIframeLaunchHints`
- `ApplicationHostTransport`
- `ApplicationUiReadyEnvelope`
- `ApplicationHostBootstrapEnvelope`
- `createApplicationUiReadyEnvelope(...)`
- `createApplicationHostBootstrapEnvelope(...)`
- `isApplicationUiReadyEnvelope(...)`
- `isApplicationHostBootstrapEnvelope(...)`
- `readApplicationIframeLaunchHints(...)`
- `normalizeApplicationHostOrigin(...)`
- `doesApplicationHostOriginMatch(...)`

`iframeLaunchId` is an ephemeral iframe bootstrap correlation id only. It is not app business identity and is not included in normal backend request context.

### Runtime-orchestration contracts

- `ApplicationAgentExecution` / `ApplicationAgentResources` / `ApplicationPublishedArtifacts`
- `ApplicationExecutionResourceRef` / `ApplicationExecutionResourceSummary`
- `ApplicationExecutionResourceSlotDeclaration`
- `ApplicationConfiguredExecutionResource` / `ApplicationConfiguredLaunchDefaults`
- `ApplicationResolvedResourceLaunchBaseline` / `ApplicationEffectiveLaunchConfiguration`
- `ApplicationTeamScopeLaunchConfig` / `ApplicationTeamMemberLaunchConfig`
- `ApplicationStartAgentInput` / `ApplicationStartAgentTeamInput`
- `ApplicationAgentBinding` / `ApplicationAgentTeamBinding`
- `ApplicationAgentTargetAddress` / `ApplicationAgentInput` / `ApplicationAgentEvent` / `ApplicationAgentStreamEvent`
- `ApplicationAgentConnectionError` and standard wire-frame types
- `ApplicationExecutionEventEnvelope`
- `ApplicationPublishedArtifactEvent`
- `ApplicationWebSocketRouteDefinition` and its request/session/frame types

`ApplicationExecutionEventEnvelope` carries stable `eventId` and `journalSequence` plus attempt-specific delivery metadata. App-owned side effects should therefore be idempotent by `eventId`.

Application-owned tool declarations and backend handlers are an exact pair. A
loaded v7 backend definition must implement in `agentToolHandlers` exactly the
names declared by its v5 manifest `agentTools[]`; missing or extra handlers fail readiness.
Caller routing identity is host-derived and must not be accepted from the tool
arguments. The platform validates the current declaration, application and
binding ownership, input, and bounded result before returning the call through
the runtime projection.

`ApplicationAgentTargetAddress` is the public logical address `{ bindingId, memberAddress }`. A `null` `memberAddress` selects the bound Agent or Team root. A canonical rooted member address such as `/reviewer` or `/research/reviewer` selects that configured Team member. Physical Agent/Team run identifiers remain private runtime correlation data and are not accepted as public target selectors. Application Orchestration authorizes the binding and is the sole logical-to-physical translator.

Team binding members and execution producers expose their logical/member identity and correlation fields without an application-role `runtimeKind`; the enclosing Agent/Team subject already supplies that role. Provider and launch `runtimeKind` contracts are unchanged.

`ApplicationAgentStreamEvent` is the closed provider-neutral live stream: `TURN_STARTED`, exact `TEXT_DELTA`, `TURN_COMPLETED`, `TURN_INTERRUPTED`, or safe `ERROR`. The `ERROR` variant preserves the original provider/runtime `message` after secret redaction and does not expose native transport/provider metadata. It excludes reasoning, tools, native/provider records, credentials, stacks/causes, and accumulated whole responses. Missing API-key configuration may use the local actionable setup message; other provider messages are not semantically rewritten.

`ApplicationPublishedArtifacts` includes durable reads through `list(runId)` and `readRevision({ runId, revisionId })`, and `ApplicationBackendDefinition` exposes live published-artifact callbacks through `artifactHandlers.persisted`. These artifact callbacks are intentionally separate from lifecycle `eventHandlers`.

`ApplicationSkillAccessMode` is intentionally narrow: `PRELOADED_ONLY` means
the host launches with the target agent definition's configured skills, and
`NONE` suppresses AutoByteus-managed skills for flows that explicitly need no
skills. `GLOBAL_DISCOVERY` / all-installed skill access is not part of the SDK
contract. External application code should configure broad/orchestrator agents
by assigning the desired skill names to the agent definition rather than by
requesting a broader launch-time mode.

SDK consumers use the `ApplicationExecutionResource*` types, `source`, `executionResourceRef`, `executionResourceSlots[]`, and `agentResources.listAvailable(...)` / `agentResources.getConfigured(...)`.

For a Team resource, the resolved baseline and effective launch configuration contain two complete projections: `teamScopes` for the rooted Team hierarchy and `leaves` for rooted Agent members. Baseline runtime/model/config fields may be absent and retain per-field provenance for diagnostics. A runnable effective configuration requires runtime, model, resolved workspace, atomic `llmConfig`, and provenance for every Team scope and Agent leaf.

The explicit Team launch branch (`mode: "memberConfigs"`) carries both `teamConfigs` and `memberConfigs`; it has no parallel root-default field. The separate `mode: "preset"` branch remains the compact root-inherited launch form for callers that intentionally select that behavior.

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

- manifest v5
- manifest-declared `executionResourceSlots[]`
- a read-only application-owned `get_brief_context` tool selected by the
  maintained Brief Studio Team
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
- `../autobyteus-web/docs/application-bundle-iframe-contract.md`
- `../autobyteus-application-frontend-sdk/README.md`
- `../autobyteus-application-backend-sdk/README.md`
