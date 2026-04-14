# Design Spec

## Current-State Read

The application-bundle import work already established several important foundations:

- bundle-driven application discovery and catalog data now come from `autobyteus-server-ts/src/application-bundles`,
- bundled application UI is served from backend-owned static assets,
- the packaged Electron topology problem was already corrected by making asset fields REST-base-relative and host-resolved,
- the iframe bootstrap contract is already versioned and topology-aware,
- embedded application-owned agents and teams are already being surfaced through the normal definition systems,
- same-bundle integrity for app-owned teams is already enforced at authoritative backend validation boundaries.

But the current application experience is still incomplete for the expanded product model:

- the Applications catalog exists, but the application detail page is still only a launch panel plus iframe host,
- the frontend still generates `applicationSessionId` locally and owns application sessions in memory,
- underlying agent/team runs are still launched directly from the frontend through `createAgentRun` / `createAgentTeamRun`,
- there is no backend-owned active-session binding shape for reconnect/page-refresh on `/applications/[id]`,
- there is no typed application publication contract tight enough to retain member artifact and progress simultaneously,
- Applications visibility is still controlled by `runtimeConfig.public.enableApplications`, which is baked into the packaged frontend build and cannot vary by bound node after install,
- there is no application/member projection layer above raw runtime events,
- there is no frontend SDK for bundled applications,
- the current built-in bundled app proves only iframe bootstrap, not the intended artifact/delivery-driven UX.

Existing runtime infrastructure that the target design should reuse rather than replace:

- `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts`
- `autobyteus-server-ts/src/services/agent-streaming/*`
- `autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-event-processor.ts`
- `autobyteus-web/stores/agentRunStore.ts`
- `autobyteus-web/stores/agentTeamRunStore.ts`
- `autobyteus-web/stores/agentArtifactsStore.ts`
- `autobyteus-web/services/agentStreaming/*`

The target design therefore extends the validated bundle/runtime topology with one new authoritative backend boundary for application sessions and promoted application-visible state.

## Intended Change

Keep the bundle-driven application import/discovery model, but evolve Applications into a first-class product/runtime surface with four explicit levels:

1. **Applications Catalog**
   - remains the first-class top-level module beside Agents and Agent Teams.

2. **Application Page / Host Shell**
   - opening an application lands on a dedicated application page,
   - the host shell owns launch state, top-level navigation, route/session binding, and drill-down paths,
   - the shell exposes at least `Application` and `Execution` modes.

3. **Application View (bundled UI + SDK)**
   - the bundled UI renders the highest meaningful promoted application state,
   - it reacts to backend-projected application/member publications through a frontend SDK,
   - it does not need raw iframe messaging or raw runtime transport knowledge.

4. **Execution View (native host-owned)**
   - the host shows supporting members for the current application session,
   - selected members open in artifact/status-first mode,
   - deeper runtime inspection hands off to the existing workspace/running experience.

Under those UI layers, introduce two authoritative backend boundaries:

- **`ApplicationCapabilityService`**
  - owns node/server runtime Applications availability,
  - reads/writes the typed Applications setting backing store,
  - exposes the authoritative capability used by nav visibility, route guarding, and application catalog behavior for the currently bound node/window.

- **`ApplicationSessionService`**
  - owns application-session identity,
  - owns the active-session index and route-level binding lookup for `/applications/[id]`,
  - launches the bound underlying agent/team runtime,
  - receives typed application publication tool events,
  - projects application-level and member-level retained state,
  - exposes session snapshot + session stream APIs used by both the native host shell and the bundled SDK.

The key architecture becomes:

```text
raw runtime events
  -> typed application publication events
  -> backend application/member retained projections
  -> bundled app SDK + native execution shell renderers
```

The agent/member side publishes typed state. The backend decides retained projection semantics. The UI decides how to render the projected state.

## Target Product Model

### Top-level navigation

- `Agents`
- `Agent Teams`
- `Applications`

### Application page structure

The application page becomes a stable native shell with three responsibilities:

1. **host controls**
   - launch / relaunch / stop,
   - application metadata,
   - mode selection (`Application`, `Execution`),
   - deep-inspection navigation.

2. **Application mode**
   - hosts the bundled UI iframe,
   - bundled UI bootstraps through the SDK,
   - bundled UI renders top-level delivery state and any app-specific centered experience.

3. **Execution mode**
   - host-native member list,
   - selected member artifact/status panel,
   - explicit `Open runtime details` handoff into the current workspace/running experience.

The current workspace/running UI remains the deepest technical inspection layer; this scope does not duplicate raw runtime/chat/log responsibilities there.

## Terminology

- `Package root`: one imported local/GitHub repository root managed by the existing package system.
- `Application bundle folder`: one folder under `<package-root>/applications/<application-id>` with `application.json`; this remains the installable application unit.
- `Canonical application id`: globally unique application id derived from `{ packageId, localApplicationId }`.
- `Application session`: one authoritative backend-owned launched application instance wrapping one underlying agent run or team run plus retained application/member state.
- `Application session binding`: the backend-owned answer to “which live session, if any, should `/applications/[id]` bind to right now?”
- `Applications capability`: the node-owned runtime answer to whether the Applications module is available in the currently bound window.
- `Application publication`: one typed application-visible event emitted by an agent/member through the standard publication tool contract.
- `Publication family`: the semantic class of one publication. V1 supports exactly `MEMBER_ARTIFACT`, `DELIVERY_STATE`, and `PROGRESS`.
- `Publication key`: required stable upsert key within the family-specific retained scope.
- `Producer provenance`: backend-derived identity of the publishing member, including nested team/member route when applicable.
- `Application view`: the bundled UI surface inside the host shell.
- `Execution view`: the host-native member/status/artifact surface for one application session.
- `Runtime details`: the existing workspace/running view used for deepest technical inspection.
- `Artifact reference`: typed handle describing how to resolve one published artifact (`WORKSPACE_FILE`, `URL`, `BUNDLE_ASSET`, `INLINE_JSON`).

## Legacy Removal Policy

- Policy: `No backward compatibility; remove superseded paths.`
- The revised design does **not** keep the current frontend-only application-session model as a fallback path.
- The revised design does **not** keep frontend-direct application runtime launch as the steady-state authority.
- The revised design does **not** expose raw iframe `postMessage` handling as the primary application-authoring interface.
- The revised design does **not** keep one collapsed `latestPublication` shape for member state.
- The revised design does **not** keep `runtimeConfig.public.enableApplications` as the packaged runtime authority for Applications visibility.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | Package import/remove UI | Refreshed package roots + refreshed application/definition catalogs | `AgentPackageService` | Applications, app-owned agents, and app-owned teams must appear/disappear atomically. |
| `DS-002` | `Primary End-to-End` | Applications catalog UI | Resolved application page metadata + bundle asset paths | `ApplicationBundleService` | Discovery/catalog and packaged asset topology must remain authoritative and reusable. |
| `DS-003` | `Primary End-to-End` | `/applications/[id]` route entry | Backend-owned bound live session (or explicit no-session result) for that application page | `ApplicationSessionService` | Reconnect/page-refresh must reattach through backend authority, not frontend memory. |
| `DS-004` | `Primary End-to-End` | Application launch UI | Backend-owned application session + launched underlying runtime + active-session index update | `ApplicationSessionService` | Application session creation and active-session replacement belong under one boundary. |
| `DS-005` | `Primary End-to-End` | Agent/member invokes publication tool | Updated family-tight retained application/member projections emitted to session subscribers | `ApplicationSessionService` | Artifact/delivery/progress publications become the clean promotion boundary between runtime internals and application-visible state. |
| `DS-006` | `Primary End-to-End` | Application page mode switch | Bundled app Application view or native Execution view for the active application session | `ApplicationPageStore` | The host shell must expose layered application/member/runtime inspection cleanly. |
| `DS-007` | `Return-Event` | Bundled iframe app signals ready | SDK bootstraps from the host payload and opens application-session APIs | `ApplicationIframeHost` + `Application SDK` | Bundled app authors must not hand-roll host bootstrap logic. |
| `DS-008` | `Primary End-to-End` | User requests deep inspection from application/member UI | Existing workspace/running view opens on the correct runtime target | `ApplicationExecutionWorkspace` | The deepest runtime surface must stay the current workspace view, not be reimplemented inside Applications. |
| `DS-009` | `Primary End-to-End` | Native Agents/Teams edit UI | Persisted edits written back into owning application bundle folder | `AgentDefinitionService` / `AgentTeamDefinitionService` | App-owned definitions remain editable while preserving bundle ownership and same-bundle integrity. |
| `DS-010` | `Primary End-to-End` | Bound window startup, node switch, or Applications settings change | Runtime Applications visibility/route availability for that window | `ApplicationCapabilityService` | Applications visibility must be runtime-configurable per bound node without rebuilding the Electron renderer, and cutover must preserve already-discovered applications without a legacy frontend fallback. |

## Primary Execution Spine(s)

- `DS-001`: `Settings UI -> AgentPackageService -> package-root validation -> root settings/registry stores -> ApplicationBundleService + definition cache refresh -> Applications/Agents/Agent Teams catalogs`
- `DS-002`: `Applications UI -> applicationStore -> ApplicationResolver -> ApplicationBundleService -> validated application metadata + asset paths -> host asset-url resolver -> application page shell`
- `DS-003`: `ApplicationShell route load -> applicationSessionBinding(applicationId, requestedSessionId?) -> ApplicationSessionService -> active-session index + session snapshot -> ApplicationSessionStore cache/stream attach`
- `DS-004`: `Application host shell -> ApplicationLaunchConfigModal -> createApplicationSession mutation -> ApplicationSessionService -> AgentRunService/TeamRunService -> ApplicationSession snapshot + active-session index`
- `DS-005`: `Application-bound member runtime -> publish_application_event tool -> ApplicationSessionService -> ApplicationPublicationProjector -> application session stream -> bundled SDK + native execution shell`
- `DS-006`: `Application page -> ApplicationPageStore mode/member selection -> bundled Application view or host Execution view`
- `DS-008`: `Application page deep-inspection action -> workspace navigation helper -> existing workspace/running surface`
- `DS-009`: `Agent/Team native edit UI -> GraphQL update mutation -> AgentDefinitionService/AgentTeamDefinitionService -> file provider -> application-owned source resolver -> bundle file write`
- `DS-010`: `Window shell startup / bound-node change / Settings toggle -> ApplicationsCapabilityStore -> applicationsCapability query or setApplicationsEnabled mutation -> ApplicationCapabilityService -> (if setting absent: ApplicationBundleService discovery check + ServerSettingsService initialization write) -> refreshed capability -> nav/route/applicationStore behavior`

## Spine Narratives

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | Package import/remove stays rooted in the existing package subsystem, and refresh continues to cover applications plus app-owned definitions together. | `Settings UI`, `AgentPackageService`, `package validator`, `ApplicationBundleService` | `AgentPackageService` | GitHub installer reuse, rollback on failure, package summary counting. |
| `DS-002` | Applications catalog/detail keeps using bundle discovery, canonical ids, and transport-neutral asset paths; the host still resolves actual URLs from bound backend endpoints. | `applicationStore`, `ApplicationResolver`, `ApplicationBundleService`, `asset URL resolver`, `application page shell` | `ApplicationBundleService` | Manifest parsing, canonical ids, safe asset resolution, packaged Electron topology. |
| `DS-003` | Page load or refresh on `/applications/[id]` no longer depends on frontend memory; the shell asks the backend which live session, if any, should be bound right now. | `ApplicationShell`, `ApplicationSessionStore`, `ApplicationSessionResolver`, `ApplicationSessionService` | `ApplicationSessionService` | requested-session hint handling, canonical binding result, stream reattachment. |
| `DS-004` | The host launch UI derives defaults from app-owned definitions, but creation of the application session and underlying runtime stays behind one backend boundary that also updates the active-session index. | `ApplicationLaunchConfigModal`, `ApplicationSessionStore`, `ApplicationSessionResolver`, `ApplicationSessionService`, `AgentRunService/TeamRunService` | `ApplicationSessionService` | default launch resolution, runtime-kind branching, active-session replacement semantics. |
| `DS-005` | Application-bound members publish typed application-visible state through one standard tool contract; the backend validates, enriches, and projects each family into its own retained slot(s) before any UI reacts to it. | `member runtime`, `publish_application_event tool`, `ApplicationSessionService`, `ApplicationPublicationProjector`, `session stream` | `ApplicationSessionService` | family-specific schema validation, producer provenance derivation, family-specific upsert rules, artifact-reference validation. |
| `DS-006` | The host page owns the layered screen model: Application mode delegates to the bundled app + SDK, while Execution mode remains native and artifact/status-first. | `pages/applications/[id].vue`, `ApplicationPageStore`, `ApplicationIframeHost`, `ApplicationExecutionWorkspace` | `ApplicationPageStore` | selected mode/member UI state, renderer selection, workspace handoff controls. |
| `DS-007` | The iframe contract stays minimal and topology-aware, but the SDK becomes the public authoring boundary above it. | `ApplicationIframeHost`, `ApplicationIframeContract`, `Application SDK` | `Application SDK` (author-facing) / `ApplicationIframeHost` (host-facing) | contract constants, source/origin validation, bootstrap parsing. |
| `DS-008` | Runtime-details drill-down stays outside the app iframe and outside the new execution summary shell; it reuses the existing workspace/running system. | `ApplicationExecutionWorkspace`, `workspace router`, `existing runtime stores/pages` | `ApplicationExecutionWorkspace` | route encoding, team/member target selection, no duplication of runtime UI. |
| `DS-009` | Native definition editing keeps its existing authoritative services and validators, including same-bundle integrity rules for app-owned teams. | `native edit UI`, `GraphQL resolvers`, `definition services`, `file providers` | `AgentDefinitionService` / `AgentTeamDefinitionService` | canonical/local ref translation, writable-source checks, backend same-bundle validation. |
| `DS-010` | Applications visibility stops being a baked frontend build flag. The host asks the bound node for the typed Applications capability at startup, on node switch, and after settings updates; if the capability setting is still absent, the backend seeds it once from current application discovery before returning the capability. Nav visibility, route guarding, and catalog fetch policy all follow that one authority. | `window shell`, `ApplicationsCapabilityStore`, `ApplicationCapabilityResolver`, `ApplicationCapabilityService`, `ApplicationBundleService`, `ServerSettingsService` | `ApplicationCapabilityService` | per-bound-node invalidation, one-time discovery-seeded initialization, hide-until-known startup state, settings-toggle refresh behavior. |

## Ownership Map

- `AgentPackageService`
  - Owns package-root import/remove sequencing, validation, rollback, registry persistence, and cross-catalog refresh sequencing.
- `ApplicationBundleService`
  - Owns application bundle discovery, manifest validation, canonical application ids, bundle-local runtime-target resolution, and backend asset-path construction.
- `ApplicationCapabilityService` **(new authoritative backend owner)**
  - Owns node-owned runtime Applications availability, one-time capability initialization when the setting is absent, typed read/update semantics for that capability, and translation to/from the persisted server setting backing store.
- `ApplicationSessionService` **(new authoritative backend owner)**
  - Owns application-session identity, active-session indexing by application id, route-level binding lookup, runtime launch/termination for application sessions, publication validation entrypoint, retained projection state, session snapshot retrieval, and session replacement semantics.
- `ApplicationPublicationProjector` **(new off-spine concern under application sessions)**
  - Owns family-specific retained projection updates from validated publications into application-level and member-level session state.
- `ApplicationSessionStreamService` / stream handler **(new transport concern under application sessions)**
  - Owns live outward emission of session snapshots/deltas to the host shell and SDK clients.
- `ApplicationsCapabilityStore` **(new frontend runtime-capability cache)**
  - Owns frontend cache of the currently bound node’s Applications capability, invalidates on `windowNodeContextStore.bindingRevision`, and provides the single frontend visibility/route-availability answer.
- `ApplicationSessionStore` (frontend)
  - Owns frontend cache of backend-owned application sessions, calls the backend binding lookup, attaches session streams, and issues create/terminate/send-input commands. It does **not** own active-session truth.
- `ApplicationPageStore` **(new frontend host-shell UI state owner)**
  - Owns route-local mode selection, selected member, selected member panel state, and deep-inspection navigation intent.
- `ApplicationIframeHost`
  - Owns iframe lifecycle, resolved iframe URL rendering, and the one-time topology-aware host bootstrap handshake.
- `Application SDK` **(new author-facing boundary)**
  - Owns bootstrap parsing, session-stream subscription, artifact resolution helpers, and application-session command wrappers for bundled UIs.
- `AgentDefinitionService`
  - Owns mutation-time validation and persistence of agent definitions, including app-owned agents and default launch-config fields.
- `AgentTeamDefinitionService`
  - Owns mutation-time validation and persistence of team definitions, including app-owned teams and same-bundle membership enforcement.

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ApplicationResolver` | `ApplicationBundleService` | GraphQL transport for catalog/detail queries | filesystem scanning, manifest parsing, URL resolution policy |
| `ApplicationCapabilityResolver` **(new)** | `ApplicationCapabilityService` | GraphQL transport for runtime Applications capability read/update | generic server-settings table semantics, frontend build config policy |
| `ApplicationSessionResolver` **(new)** | `ApplicationSessionService` | GraphQL transport for create/query/bind/terminate/send-input | active-session policy, projection policy, runtime-launch branching |
| application asset REST route | `ApplicationBundleService` | Serves bundle `ui/` assets over HTTP | raw path guessing or path-traversal policy outside the service |
| application session stream route/handler **(new)** | `ApplicationSessionStreamService` | Transport for live session snapshot/delta emission | projection policy, runtime launch authority |
| `ApplicationIframeHost` | `ApplicationIframeContract` + `ApplicationSessionStore` | host-side iframe bootstrap transport | application-state subscription semantics exposed to authors |
| `publish_application_event` tool wrapper **(new)** | `ApplicationSessionService` | runtime-facing publication command | free-form UI control, direct frontend assumptions |

## Authoritative Boundary Decisions

### 1. `ApplicationCapabilityService` owns runtime Applications availability fully

The packaged renderer must not decide Applications availability from build-time Nuxt config.

Therefore:
- runtime Applications availability is a node-owned backend capability,
- each window follows its currently bound node,
- `ApplicationCapabilityService` becomes the authoritative read/update owner,
- nav visibility, route guarding, and catalog fetch behavior all depend on that backend-owned capability through `ApplicationsCapabilityStore`,
- frontend startup uses `unknown -> loading -> resolved` capability state and hides Applications until the capability is known,
- the capability cutover must stay clean-cut: no legacy frontend flag, no dual authority, and no repeated inference after the explicit setting has been initialized.

### 2. `ApplicationSessionService` owns active-session binding fully

This closes `DAR-003`.

The target route remains `/applications/[id]`, so reconnect/page-refresh requires a backend answer to:

> “Which live session, if any, should this application page bind to right now?”

Therefore:
- `ApplicationSessionService` maintains `activeSessionIdByApplicationId`,
- `createApplicationSession` updates that index,
- `terminateApplicationSession` clears/replaces it,
- `applicationSessionBinding(applicationId, requestedSessionId?)` becomes the authoritative route-binding query,
- `ApplicationSessionStore` becomes a cache/transport client only.

### 3. Publication families project into family-specific retained state

This closes `DAR-004`.

The target design does **not** use one collapsed `latestPublication` + `latestStatus` shape.

Instead:
- `MEMBER_ARTIFACT` projects only into member artifact slots,
- `PROGRESS` projects only into member progress slots,
- `DELIVERY_STATE` projects only into application delivery state,
- families never overwrite each other’s retained fields.

### 4. V1 publication contract removes free-form metadata

To keep the promoted contract family-tight, V1 has **no** `metadata?: Record<string, unknown>` escape hatch.

If future extensibility is needed, it must arrive through an explicit V2 field design, not a generic rendering-affecting map.

### 5. The SDK remains the author-facing boundary, not the raw iframe contract

The iframe contract still exists for platform maintainers, but bundled applications are expected to depend on the SDK.

## Backend Applications Capability Contract

## Typed capability shape

```ts
interface ApplicationsCapability {
  enabled: boolean
  scope: 'BOUND_NODE'
  settingKey: 'ENABLE_APPLICATIONS'
  source: 'SERVER_SETTING' | 'INITIALIZED_FROM_DISCOVERED_APPLICATIONS' | 'INITIALIZED_EMPTY_CATALOG'
}
```

## Backend application-capability subsystem

Create one dedicated backend subsystem instead of hiding this under bundle discovery:

- `autobyteus-server-ts/src/application-capability`

Why:
- this capability governs runtime product availability for the current node,
- it is not bundle-discovery logic,
- and callers above it should depend on the typed capability boundary rather than on generic server-settings internals.

### New backend capability files

| Path | Change | Responsibility |
| --- | --- | --- |
| `autobyteus-server-ts/src/application-capability/domain/models.ts` | `Add` | canonical `ApplicationsCapability` transport/domain shape |
| `autobyteus-server-ts/src/application-capability/services/application-capability-service.ts` | `Add` | authoritative runtime Applications capability read/update owner |
| `autobyteus-server-ts/src/api/graphql/types/application-capability.ts` | `Add` | GraphQL query/mutation boundary for runtime Applications capability |
| `autobyteus-server-ts/src/application-bundles/services/application-bundle-service.ts` | `Modify` | expose lightweight discoverable-application summary used by capability initialization |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | `Modify` | register predefined `ENABLE_APPLICATIONS` setting plus typed helper access used by `ApplicationCapabilityService` |

## GraphQL boundary

Add one subject-specific transport file:
- `autobyteus-server-ts/src/api/graphql/types/application-capability.ts`

Expose:
- `applicationsCapability(): ApplicationsCapability!`
- `setApplicationsEnabled(enabled: Boolean!): ApplicationsCapability!`

The mutation is a typed settings action, not a generic key/value write from the shell.

## Persistence backing

- Extend `ServerSettingsService` with the predefined editable setting key `ENABLE_APPLICATIONS`.
- `ApplicationCapabilityService` reads/writes that backing key through typed methods; callers above it do not depend on the generic settings table directly.
- `ServerSettingsManager` may still display the setting, but the shell/nav/route guard consume only the typed capability boundary.

## Initialization / cutover rule

`ApplicationCapabilityService` must not depend on the removed frontend build flag or any other legacy UI authority.

Instead, every capability read/update first calls an internal `ensureInitialized()` step:

1. If `ENABLE_APPLICATIONS` is already persisted, do nothing and read the persisted value.
2. If `ENABLE_APPLICATIONS` is absent:
   - ask `ApplicationBundleService` whether this node currently has any discoverable applications,
   - if yes, persist `ENABLE_APPLICATIONS=true` and return `source = 'INITIALIZED_FROM_DISCOVERED_APPLICATIONS'`,
   - if no, persist `ENABLE_APPLICATIONS=false` and return `source = 'INITIALIZED_EMPTY_CATALOG'`.

After this initialization write exists:
- all later reads use the persisted server setting directly,
- later application discovery changes do not overwrite the explicit setting,
- later user Settings changes also update only the persisted setting,
- no legacy or repeated discovery inference remains in the steady-state path.

## Per-node semantics

- Capability is resolved from the currently bound node/server.
- Each Electron window may therefore expose different Applications visibility depending on its own bound node.

## Backend Application-Session Binding Contract

## Route-binding API

Add one explicit backend-owned lookup shape:

```ts
interface ApplicationSessionBinding {
  applicationId: string
  requestedSessionId: string | null
  resolvedSessionId: string | null
  resolution: 'requested_live' | 'application_active' | 'none'
  session: ApplicationSessionSnapshot | null
}
```

### GraphQL query

```ts
applicationSessionBinding(applicationId: String!, requestedSessionId: String): ApplicationSessionBinding!
```

### Resolution rules

1. If `requestedSessionId` is present, belongs to the same `applicationId`, and is still live, return it with `resolution = 'requested_live'`.
2. Else if `activeSessionIdByApplicationId[applicationId]` exists and is live, return that with `resolution = 'application_active'`.
3. Else return `resolution = 'none'` and `session = null`.

### Active-session rules

- V1 keeps **one live active session per application id** on the bound backend.
- `createApplicationSession` for an application replaces the previous active session for that application.
- Replacement semantics:
  - either terminate the prior active session immediately before promoting the new one,
  - or mark the new one active only after the old one is terminated.
- The authoritative decision remains inside `ApplicationSessionService`; callers do not coordinate this themselves.

## Session APIs

`ApplicationSessionResolver` exposes:

- `createApplicationSession(input)`
- `applicationSession(id)`
- `applicationSessionBinding(applicationId, requestedSessionId?)`
- `terminateApplicationSession(applicationSessionId)`
- `sendApplicationInput(input)`

`applicationSession(id)` remains useful for direct session retrieval, but it is **not** the route-binding API.

## Backend Application-Session Snapshot Model

```ts
interface ApplicationSessionSnapshot {
  applicationSessionId: string
  application: {
    applicationId: string
    localApplicationId: string
    packageId: string
    name: string
    description: string | null
    iconAssetPath: string | null
    entryHtmlAssetPath: string
    writable: boolean
  }
  runtime: {
    kind: 'AGENT' | 'AGENT_TEAM'
    runId: string
    definitionId: string
  }
  view: {
    delivery: ApplicationDeliveryProjection
    members: ApplicationMemberProjection[]
  }
  createdAt: string
  terminatedAt: string | null
}
```

## Publication Contract Design (v1)

## Tool name

`publish_application_event`

## Family-specific input union

```ts
type PublishApplicationEventInputV1 =
  | PublishMemberArtifactEventInputV1
  | PublishDeliveryStateEventInputV1
  | PublishProgressEventInputV1
```

### `MEMBER_ARTIFACT`

```ts
interface PublishMemberArtifactEventInputV1 {
  contractVersion: '1'
  publicationFamily: 'MEMBER_ARTIFACT'
  publicationKey: string
  artifactType: string
  state: 'draft' | 'ready' | 'blocked' | 'superseded'
  title: string
  summary?: string
  artifactRef: ApplicationArtifactRef
  isFinal?: boolean
}
```

### `DELIVERY_STATE`

```ts
interface PublishDeliveryStateEventInputV1 {
  contractVersion: '1'
  publicationFamily: 'DELIVERY_STATE'
  publicationKey: string
  deliveryState: 'waiting' | 'in_progress' | 'ready' | 'blocked'
  title?: string
  summary?: string
  artifactType?: string
  artifactRef?: ApplicationArtifactRef
}
```

### `PROGRESS`

```ts
interface PublishProgressEventInputV1 {
  contractVersion: '1'
  publicationFamily: 'PROGRESS'
  publicationKey: string
  phaseLabel: string
  state: 'queued' | 'working' | 'ready' | 'blocked'
  percent?: number
  detailText?: string
}
```

## V1 explicit rejection rules

The backend rejects the publication if:
- `publicationKey` is missing,
- required family-specific fields are missing,
- disallowed fields for the declared family are present,
- free-form `metadata` or equivalent generic maps are present,
- artifact refs are invalid for a family that requires them,
- the run is not attached to an application session.

## Authoritative fields derived by the backend

The tool caller never supplies these authoritatively:
- `applicationSessionId`
- `publishedAt`
- `producer.memberRouteKey`
- `producer.teamPath`
- `producer.runId`
- `producer.runtimeKind`

These are derived from execution/application-session context.

## Artifact reference shape (v1)

```ts
type ApplicationArtifactRef =
  | { kind: 'WORKSPACE_FILE'; workspaceId?: string | null; path: string }
  | { kind: 'URL'; url: string }
  | { kind: 'BUNDLE_ASSET'; assetPath: string }
  | { kind: 'INLINE_JSON'; mimeType: string; value: unknown }
```

## Family-tight retained projection model

### Application-level delivery retention

```ts
interface ApplicationDeliveryProjection {
  current: ApplicationDeliveryStateProjection | null
}

interface ApplicationDeliveryStateProjection {
  publicationKey: string
  deliveryState: 'waiting' | 'in_progress' | 'ready' | 'blocked'
  title: string | null
  summary: string | null
  artifactType: string | null
  artifactRef: ApplicationArtifactRef | null
  updatedAt: string
  producer: ApplicationProducerProvenance
}
```

Retention rule:
- Every valid `DELIVERY_STATE` publication replaces `delivery.current`.
- `DELIVERY_STATE` does not mutate any member artifact/progress fields.

### Member-level artifact retention

```ts
interface ApplicationMemberProjection {
  memberRouteKey: string
  displayName: string
  teamPath: string[]
  runtimeTarget: {
    runId: string
    runtimeKind: 'AGENT' | 'AGENT_TEAM_MEMBER'
  } | null
  artifactsByKey: Record<string, ApplicationMemberArtifactProjection>
  primaryArtifactKey: string | null
  progressByKey: Record<string, ApplicationMemberProgressProjection>
  primaryProgressKey: string | null
}

interface ApplicationMemberArtifactProjection {
  publicationKey: string
  artifactType: string
  state: 'draft' | 'ready' | 'blocked' | 'superseded'
  title: string
  summary: string | null
  artifactRef: ApplicationArtifactRef
  isFinal: boolean
  updatedAt: string
  producer: ApplicationProducerProvenance
}
```

Retention rule:
- `MEMBER_ARTIFACT` upserts only `artifactsByKey[publicationKey]` for the publishing member.
- `primaryArtifactKey` becomes the most recently updated artifact key whose state is not `superseded`, unless the member has no retained artifact.
- `MEMBER_ARTIFACT` never overwrites progress or delivery fields.

### Member-level progress retention

```ts
interface ApplicationMemberProgressProjection {
  publicationKey: string
  phaseLabel: string
  state: 'queued' | 'working' | 'ready' | 'blocked'
  percent: number | null
  detailText: string | null
  updatedAt: string
  producer: ApplicationProducerProvenance
}
```

Retention rule:
- `PROGRESS` upserts only `progressByKey[publicationKey]` for the publishing member.
- `primaryProgressKey` becomes the most recently updated progress key.
- `PROGRESS` never overwrites artifact or delivery fields.

This is the explicit coexistence answer for `DAR-004`: member artifacts and member progress are retained in separate keyed families and can be rendered together by the SDK or native Execution view.

## Producer provenance shape

```ts
interface ApplicationProducerProvenance {
  memberRouteKey: string
  displayName: string
  teamPath: string[]
  runId: string
  runtimeKind: 'AGENT' | 'AGENT_TEAM_MEMBER'
}
```

## Backend application-sessions subsystem

## New subsystem

`autobyteus-server-ts/src/application-sessions`

## Responsibilities

1. create / bind / query / terminate active application sessions
2. maintain `activeSessionIdByApplicationId`
3. launch the underlying bound runtime via existing run services
4. attach application-session metadata to launched runtime context
5. receive application publication tool calls
6. validate and enrich publication payloads
7. project application-level and member-level retained state
8. stream session snapshots/deltas to clients

## New backend files

| Path | Change | Responsibility |
| --- | --- | --- |
| `autobyteus-server-ts/src/application-sessions/domain/models.ts` | `Add` | canonical backend application-session snapshot/binding/projection shapes |
| `autobyteus-server-ts/src/application-sessions/services/application-session-service.ts` | `Add` | authoritative application-session lifecycle + active-session index + route binding |
| `autobyteus-server-ts/src/application-sessions/services/application-publication-projector.ts` | `Add` | family-tight projection updates |
| `autobyteus-server-ts/src/application-sessions/streaming/application-session-stream-service.ts` | `Add` | outward session snapshot/delta emission |
| `autobyteus-server-ts/src/application-sessions/streaming/application-session-stream-handler.ts` | `Add` | transport binding for session stream connections |
| `autobyteus-server-ts/src/application-sessions/tools/publish-application-event-tool.ts` | `Add` | publication tool definition + family-specific schema |
| `autobyteus-server-ts/src/application-sessions/utils/application-artifact-ref-validator.ts` | `Add` | validate/normalize artifact refs |
| `autobyteus-server-ts/src/application-sessions/utils/application-producer-provenance.ts` | `Add` | derive member/nested-team provenance from runtime context |
| `autobyteus-server-ts/src/api/graphql/types/application-session.ts` | `Add` | GraphQL create/query/bind/terminate/send-input boundary |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | `Modify` | accept application-session launch context injection |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | `Modify` | accept application-session launch context injection |

## Frontend host-shell design

## Host page responsibility split

### `pages/applications/[id].vue`
Thin route entry only.

### `components/applications/ApplicationShell.vue` **(new)**
Owns:
- application metadata header,
- launch/stop actions,
- top-level mode switch,
- route/session binding,
- shared shell layout.

### `components/applications/ApplicationSurface.vue` **(new)**
Hosts the bundled iframe app for `Application` mode.

### `components/applications/execution/ApplicationExecutionWorkspace.vue` **(new)**
Owns native `Execution` mode:
- member list,
- selected member artifact/status panel,
- `Open runtime details` action.

### `components/applications/execution/ApplicationMemberArtifactPanel.vue` **(new)**
Renders selected member projection via built-in renderer registry.

### `components/applications/renderers/HostArtifactRenderer.vue` **(new)**
Built-in generic renderer registry for host-native execution surfaces.

Supported first-slice renderers should include at least:
- markdown/text document,
- image,
- PDF,
- website/html preview,
- generic metadata fallback.

## Frontend stores

### `stores/applicationsCapabilityStore.ts` **(new)**
Owns runtime capability state for the current bound window/node:
- `status: 'unknown' | 'loading' | 'resolved' | 'error'`,
- `capability: ApplicationsCapability | null`,
- `ensureResolved()`,
- `refresh()`,
- `setEnabled(enabled)` for Settings-driven updates,
- invalidation on `windowNodeContextStore.bindingRevision`,
- conservative fallback behavior:
  - unresolved/error => Applications hidden,
  - `/applications` blocked,
  - stale catalog/session UI cleared for that window.

Consumers:
- `AppLeftPanel.vue`,
- `LeftSidebarStrip.vue`,
- `/applications` route middleware,
- `applicationStore`.

### `stores/applicationSessionStore.ts` (refactor)
From:
- frontend-owned session creation + direct run launch + active-session lookup

To:
- `createApplicationSession`, `terminateApplicationSession`, `sendApplicationInput`, `applicationSessionBinding`, `applicationSession` transport owner,
- session snapshot cache,
- session-stream connection/cache,
- route-binding helper.

Explicitly **not** its job anymore:
- active-session truth,
- route-binding resolution policy,
- runtime launch authority.

Suggested public methods:
- `bindApplicationRoute(applicationId, requestedSessionId?)`
- `createApplicationSession(preparedLaunch)`
- `getSessionById(applicationSessionId)`
- `terminateSession(applicationSessionId)`
- `connectSessionStream(applicationSessionId)`

### `stores/applicationPageStore.ts` **(new)**
Owns host-local UI state only:
- selected mode (`Application` / `Execution`),
- selected member route key,
- member sub-mode (`Artifact` / `Runtime Details` intent),
- workspace drill-down target.

## Runtime Applications capability flow

1. Window binds to a node or the bound node changes.
2. `ApplicationsCapabilityStore` invalidates and enters `loading`.
3. The store calls `applicationsCapability()` on the bound node after backend readiness is confirmed.
4. If the bound node has no persisted `ENABLE_APPLICATIONS` yet, `ApplicationCapabilityService` initializes it once from current application discovery before responding.
5. While capability is `unknown` or `loading`, nav surfaces hide Applications and `applicationStore` does not expose stale catalog data from a previous node/capability state.
6. If capability resolution ends in `error` or resolves as disabled, `/applications` route middleware blocks/redirects by the same authority and the catalog store stays empty for that window.
7. If capability resolves as enabled, nav surfaces show Applications and `applicationStore` may fetch catalog data for that bound node.
8. If Settings toggles Applications, `setApplicationsEnabled(enabled)` updates the bound node through the typed mutation and refreshes the store so the same window updates without rebuild.

## Route binding flow

1. Route `/applications/[id]` loads.
2. Host resolves optional `requestedSessionId` from query.
3. `ApplicationSessionStore.bindApplicationRoute(applicationId, requestedSessionId)` calls `applicationSessionBinding(...)`.
4. Backend returns `requested_live`, `application_active`, or `none`.
5. Host caches returned snapshot and attaches to the session stream if a session exists.
6. Host canonicalizes the route query to the resolved session id or removes the hint if none exists.

This closes the reconnect/page-refresh gap behind `DAR-003`.

## Bundled Application SDK Design

## Package placement

Create a browser-compatible application SDK in `autobyteus-ts`:

- `autobyteus-ts/src/application-sdk/index.ts`
- `autobyteus-ts/src/application-sdk/bootstrap.ts`
- `autobyteus-ts/src/application-sdk/client.ts`
- `autobyteus-ts/src/application-sdk/types.ts`
- `autobyteus-ts/src/application-sdk/artifact-resolver.ts`
- `autobyteus-ts/src/application-sdk/session-stream.ts`

Why `autobyteus-ts`:
- it is the existing shared TypeScript package intended for external consumption,
- the SDK is an author-facing library, not an internal Nuxt-only concern,
- keeping it there avoids exposing `autobyteus-web` internals as the authoring boundary.

## Minimal SDK surface (v1)

```ts
import { bootstrapApplication } from '@autobyteus/application-sdk'

const app = await bootstrapApplication()

const snapshot = app.getSnapshot()
const member = app.getMember('requirements_engineer')

const stop = app.subscribe((next) => {
  console.log(next.view.delivery.current)
  console.log(next.view.members)
})

await app.sendInput({
  text: 'Please continue the implementation.',
  contextFiles: [{ path: '/workspace/feature.md', type: 'text' }],
})

const artifact = member?.primaryArtifactKey
  ? member.artifactsByKey[member.primaryArtifactKey]
  : null
const url = artifact ? app.resolveArtifactUrl(artifact.artifactRef) : null
```

## SDK object shape

```ts
interface BootstrappedApplicationClient {
  getSnapshot(): ApplicationSessionSnapshot
  subscribe(listener: (snapshot: ApplicationSessionSnapshot) => void): () => void
  getMember(memberRouteKey: string): ApplicationMemberProjection | null
  sendInput(input: ApplicationUserInput): Promise<void>
  resolveArtifactUrl(ref: ApplicationArtifactRef | null | undefined): string | null
  dispose(): void
}
```

## SDK responsibilities

- parse the iframe bootstrap payload,
- validate session binding + host origin through the existing contract,
- connect to the application-session stream,
- provide current snapshot + subscription APIs,
- resolve artifact refs into usable URLs/data,
- wrap `sendApplicationInput` command calls,
- expose shared family-tight projection types.

## SDK non-goals (v1)

- no direct exposure of internal Pinia stores,
- no requirement that app authors understand team/agent runtime WS transports,
- no React/Vue-specific adapters in the first slice,
- no local dev-server mode in this slice,
- no free-form renderer metadata channel.

## Iframe contract reuse

The previously revised topology-aware iframe contract remains in force.

Changes in this scope:
- the bundled app is now expected to consume the SDK instead of hand-written bootstrap code,
- the bootstrap payload expands to include application-session API/stream metadata required by the SDK,
- the packaged Electron origin rules remain unchanged.

## Frontend file responsibility mapping

| Path | Change | Responsibility |
| --- | --- | --- |
| `autobyteus-web/pages/applications/[id].vue` | `Modify` | thin route entry into new application shell |
| `autobyteus-web/components/AppLeftPanel.vue` | `Modify` | read runtime Applications capability instead of build-time config |
| `autobyteus-web/components/layout/LeftSidebarStrip.vue` | `Modify` | read runtime Applications capability instead of build-time config |
| `autobyteus-web/middleware/feature-flags.global.ts` | `Modify or Replace` | runtime Applications route guard driven by capability store instead of Nuxt build config |
| `autobyteus-web/components/applications/ApplicationShell.vue` | `Add` | native host shell for app page |
| `autobyteus-web/components/applications/ApplicationSurface.vue` | `Add` | Application-mode surface hosting iframe + fallback states |
| `autobyteus-web/components/applications/ApplicationIframeHost.vue` | `Modify` | retain host bootstrap + session-aware iframe lifecycle |
| `autobyteus-web/components/applications/execution/ApplicationExecutionWorkspace.vue` | `Add` | Execution-mode host-native member workspace |
| `autobyteus-web/components/applications/execution/ApplicationMemberList.vue` | `Add` | member list / selection |
| `autobyteus-web/components/applications/execution/ApplicationMemberArtifactPanel.vue` | `Add` | artifact/status-first member panel |
| `autobyteus-web/components/applications/renderers/HostArtifactRenderer.vue` | `Add` | built-in renderer registry for execution/member artifacts |
| `autobyteus-web/stores/applicationStore.ts` | `Modify` | catalog fetch/store gated by runtime Applications capability instead of build-time config |
| `autobyteus-web/stores/applicationsCapabilityStore.ts` | `Add` | frontend cache for node-owned Applications capability |
| `autobyteus-web/stores/applicationSessionStore.ts` | `Modify` | backend-owned session cache + route binding + stream + commands |
| `autobyteus-web/stores/applicationPageStore.ts` | `Add` | local host-shell UI state |
| `autobyteus-web/services/applicationStreaming/ApplicationSessionStreamingService.ts` | `Add` | session stream client for host shell |
| `autobyteus-web/utils/application/applicationLaunch.ts` | `Modify` | keep launch-draft preparation only; remove frontend session-id creation authority |
| `autobyteus-web/utils/application/runtimeDrilldown.ts` | `Add` | translate application/member targets into workspace/runtime navigation |
| `autobyteus-web/components/settings/ServerSettingsManager.vue` | `Modify` | host first-class Applications toggle under Server Settings / Advanced Server Settings |
| `autobyteus-web/components/settings/ApplicationsFeatureToggleCard.vue` | `Add` | first-class Server Settings control for Applications enablement |
| `autobyteus-web/types/application/ApplicationSession.ts` | `Modify` | match backend-owned binding/snapshot/projection shapes |
| `autobyteus-web/types/application/ApplicationIframeContract.ts` | `Modify` | expanded bootstrap payload fields for SDK/session stream |

## SDK file mapping

| Path | Change | Responsibility |
| --- | --- | --- |
| `autobyteus-ts/src/application-sdk/types.ts` | `Add` | public SDK contracts/types |
| `autobyteus-ts/src/application-sdk/bootstrap.ts` | `Add` | host bootstrap parsing + validation |
| `autobyteus-ts/src/application-sdk/client.ts` | `Add` | app-author client surface |
| `autobyteus-ts/src/application-sdk/session-stream.ts` | `Add` | session stream transport wrapper |
| `autobyteus-ts/src/application-sdk/artifact-resolver.ts` | `Add` | artifact ref -> URL/data helpers |
| `autobyteus-ts/src/application-sdk/index.ts` | `Add` | SDK entrypoint exports |

## Reference application design

## Name

`application-sdk-demo`

## Purpose

Provide one small, deterministic application bundle that proves together:
- application import/discovery,
- backend application-session launch,
- backend route reattachment after refresh,
- runtime Applications capability enablement from the bound node,
- application publication tool flow,
- bundled SDK usage,
- top-level delivery rendering,
- member artifact rendering,
- member progress + artifact coexistence.

## Minimal runtime shape

A small team-based app is preferred because it exercises member projections clearly.

Suggested member flow:
- `requirements-writer`
  - publishes `PROGRESS` with key `drafting`,
  - publishes `MEMBER_ARTIFACT` with key `requirements_artifact` referencing a markdown artifact.
- `delivery-promoter`
  - publishes `DELIVERY_STATE` with key `final_delivery` referencing the final preview/report artifact.

## Minimal renderer goals

- Application view (bundled UI via SDK):
  - show waiting state initially,
  - switch to final delivery renderer when the delivery publication arrives.
- Execution view (native host):
  - show both members,
  - selecting `requirements-writer` renders both current progress and the requirements artifact,
  - provide `Open runtime details` handoff.

The reference app should deliberately prefer simple artifact types that are easy to validate in first slice:
- markdown/text document,
- HTML preview,
- image,
- or structured JSON report.

## Renderer strategy

Two renderer layers coexist intentionally:

### 1. Bundled app renderers (SDK-driven)

- owned by the application author inside the bundled UI,
- free to compose application-specific product experiences,
- react to projected application/member state through the SDK.

### 2. Host-native execution renderers

- owned by the platform,
- used only for Execution mode and member artifact inspection,
- generic by artifact type / artifact-ref kind,
- intentionally not app-specific.

This keeps the application product surface flexible while preserving a consistent native execution/debug experience.

## Dependency rules

- `AppLeftPanel`, `LeftSidebarStrip`, `/applications` route guard, and `applicationStore` depend on `ApplicationsCapabilityStore`, not on `useRuntimeConfig().public.enableApplications`.
- `ApplicationsCapabilityStore` depends on `ApplicationCapabilityResolver` and `windowNodeContextStore`, not on the generic server-settings table.
- `ApplicationCapabilityService` may depend on `ApplicationBundleService` only for one-time missing-setting initialization; callers above the capability boundary must not reproduce that discovery/inference themselves.
- `applicationStore` clears/keeps empty catalog state while Applications capability is unresolved, disabled, or errored for the current bound node; it must not surface stale entries from a previously enabled node/window state.
- `ApplicationShell` depends on `ApplicationSessionStore` and `ApplicationPageStore`, not directly on runtime stores.
- `ApplicationSessionStore` depends on backend `ApplicationSessionResolver` / session-stream transport; it does not compute active-session truth itself.
- `ApplicationSessionStore` uses `applicationSessionBinding(...)` for route/session reattachment; it does not reconstruct that from cached memory.
- Bundled applications depend on the `Application SDK`, not directly on raw `ApplicationIframeContract` details.
- `Application SDK` depends on the bootstrap contract and application-session APIs, not on `autobyteus-web` stores/components.
- `publish_application_event` depends on `ApplicationSessionService`, not on frontend/UI concerns.
- `ApplicationSessionService` depends on `ApplicationBundleService` for application lookup and on existing run services for runtime launch; callers above it must not bypass it and talk to both session service and raw run services for application sessions.
- `ApplicationPublicationProjector` exposes family-tight retained outputs only; no generic latest-publication shortcut is allowed at the SDK/native-shell boundary.
- Asset URL resolution remains frontend-owned and host-resolved from backend paths; neither the SDK nor the host shell may reintroduce host-relative `/rest/...` concatenation.

## Removal / decommission plan

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Scope |
| --- | --- | --- | --- |
| frontend-generated `applicationSessionId` in `applicationLaunch.ts` | backend must own session identity | `ApplicationSessionService` | `In This Change` |
| frontend-direct application session launch via `createAgentRun` / `createAgentTeamRun` inside `ApplicationSessionStore` | application sessions need one backend authoritative boundary | `createApplicationSession` | `In This Change` |
| frontend-owned active-session lookup in `ApplicationSessionStore` | reconnect/page-refresh binding must be backend authoritative | `applicationSessionBinding(...)` | `In This Change` |
| current application detail page as “metadata + iframe only” | application page becomes a layered host shell | `ApplicationShell.vue` + native Execution workspace | `In This Change` |
| `runtimeConfig.public.enableApplications` packaged runtime gate | Applications visibility must be node-owned at runtime | `ApplicationCapabilityService` + `ApplicationsCapabilityStore` | `In This Change` |
| any legacy/frontend fallback for Applications visibility during cutover | rollout must stay clean-cut and backend-owned | one-time `ApplicationCapabilityService.ensureInitialized()` discovery-seeded write | `In This Change` |
| hand-written bootstrap logic in bundled sample app | SDK becomes the public authoring boundary | `autobyteus-ts/src/application-sdk` | `In This Change` |
| collapsed member `latestPublication` / `latestStatus` projection idea | it cannot retain artifact + progress coexistence safely | family-tight retained projection fields/maps | `In This Change` |
| free-form metadata on publication payload v1 | it weakens the typed promoted contract | explicit family-specific fields only | `In This Change` |

## Migration / implementation sequence

0. **Runtime Applications capability**
   - add `ApplicationCapabilityService`,
   - add one-time `ensureInitialized()` cutover that seeds missing `ENABLE_APPLICATIONS` from current application discovery,
   - add `applicationsCapability()` / `setApplicationsEnabled(...)`,
   - refactor nav, route guard, and `applicationStore` to use `ApplicationsCapabilityStore`,
   - remove build-time packaged runtime dependence on `runtimeConfig.public.enableApplications`,
   - do not retain any legacy frontend fallback after the initialization write exists.
1. **Backend session boundary**
   - add `application-sessions` subsystem,
   - add `applicationSessionBinding(...)`,
   - refactor frontend launch path to use `createApplicationSession`.
2. **Route reattachment**
   - refactor `ApplicationSessionStore` + `ApplicationShell` to bind sessions through backend lookup,
   - canonicalize resolved session id into route query as needed.
3. **Runtime launch binding**
   - thread application-session context into application-launched agent/team runs,
   - ensure session termination also terminates underlying run.
4. **Publication tool + family-tight projector**
   - add `publish_application_event`,
   - validate family-specific payloads,
   - derive producer provenance,
   - project separate delivery/artifact/progress retained state.
5. **Application session stream**
   - add backend session-stream emission,
   - add frontend session-stream client/service,
   - connect `ApplicationSessionStore` and SDK to live projections.
6. **Host page redesign**
   - add `ApplicationShell`, `ApplicationPageStore`, Execution workspace, member artifact/progress panel, runtime drill-down helper.
7. **SDK**
   - add SDK package in `autobyteus-ts`,
   - make bootstrap/session-stream/artifact helpers author-facing,
   - update contract docs to point authors to SDK.
8. **Reference app**
   - build `application-sdk-demo` using the SDK,
   - ensure it publishes one member artifact, one member progress update, and one delivery state.
9. **Cleanup**
   - remove obsolete frontend-local session logic,
   - remove collapsed projection shortcuts,
   - preserve previously fixed packaged Electron topology assertions.

## Tradeoffs

### Chosen: backend/node-owned runtime Applications capability

Pros:
- no Electron rebuild required after install,
- correct per-window/per-node behavior,
- same authority for nav, route guard, and catalog behavior.

Cons:
- requires startup capability fetch and node-change invalidation logic.

Rejected alternatives:
- keep Nuxt build-time `enableApplications` as packaged runtime authority,
- or make the shell read arbitrary server-settings table rows directly.
- Rejected because Applications is backend-backed and should be a typed node capability, not a baked frontend constant or an ad-hoc generic settings dependency.

### Chosen: one-time discovery-seeded capability initialization

Pros:
- preserves already-discovered applications through rollout,
- stays backend-owned and clean-cut,
- avoids keeping any legacy frontend flag or dual authority alive.

Cons:
- requires one lightweight discovery check when the setting is absent.

Rejected alternatives:
- default missing `ENABLE_APPLICATIONS` directly to false,
- or seed from a legacy frontend/runtime flag.
- Rejected because default-false cutover fails the approved migration requirement for already-visible applications, while a legacy flag seed would violate the project’s no-legacy/no-backward-compatibility direction and keep mixed authority alive.

### Chosen: backend-owned application-session binding

Pros:
- authoritative reattachment after refresh/reconnect,
- route-level determinism for `/applications/[id]`,
- cleaner separation between backend truth and frontend cache.

Cons:
- requires one more backend query/binding shape.

Rejected alternative:
- keep active-session lookup in `ApplicationSessionStore`.
- Rejected because it weakens the claimed backend boundary and fails `DAR-003`.

### Chosen: family-tight retained projections

Pros:
- explicit artifact + progress coexistence,
- clearer SDK/native-shell contract,
- no drift back toward raw runtime semantics.

Cons:
- slightly more verbose projection model.

Rejected alternative:
- one generic `latestPublication` plus `latestStatus`.
- Rejected because it cannot define deterministic coexistence/upsert rules for multiple publication families.

### Chosen: remove free-form metadata in v1

Pros:
- keeps the promoted contract small and typed,
- reduces renderer ambiguity,
- easier validation and SDK stability.

Cons:
- less extensibility in v1.

Rejected alternative:
- generic `metadata?: Record<string, unknown>`.
- Rejected because it reopens a free-form escape hatch and undermines the typed contract.

## Risks

- The new backend session subsystem is still the biggest structural addition; implementation must keep its authority complete and avoid leaking reattachment logic back to the frontend.
- If reference-app validation only exercises the happy path and never checks artifact + progress coexistence, `DAR-004` risks reappearing later in implementation.
- If `sendApplicationInput` tries to mirror every low-level runtime nuance in v1, the application-session boundary may become overloaded; keep it centered on app-session semantics.
- If host-native Execution renderers try to become application-specific, the execution shell will bloat and compete with bundled app UIs.
- The prior packaged Electron `file://` vs backend HTTP topology fix remains mandatory; no part of the SDK or shell redesign may regress that path.

## Concrete examples

### Example: per-window runtime Applications visibility

```text
Window A -> bound to local dev node
  -> applicationsCapability() returns enabled=true
  -> nav shows Applications

Window B -> bound to remote production node
  -> applicationsCapability() returns enabled=false
  -> nav hides Applications and /applications is blocked
```

### Example: clean-cut capability cutover with discovered applications

```text
Node upgrade arrives
  -> ENABLE_APPLICATIONS is absent
  -> ApplicationCapabilityService.ensureInitialized() runs
  -> ApplicationBundleService reports discoverable applications exist
  -> ServerSettingsService persists ENABLE_APPLICATIONS=true
  -> applicationsCapability() returns enabled=true
  -> Applications remains visible after upgrade

Later:
  user disables Applications in Settings
  -> setApplicationsEnabled(false) persists false
  -> later restarts read the persisted false directly
  -> discovery does not auto-enable it again
```

### Example: route reattachment after refresh

```text
User refreshes /applications/software-engineering?applicationSessionId=app-session-123
  -> ApplicationShell calls applicationSessionBinding(applicationId='software-engineering', requestedSessionId='app-session-123')
  -> ApplicationSessionService checks:
       1. is app-session-123 still live for software-engineering?
       2. else is there another active session for software-engineering?
  -> returns requested_live / application_active / none
  -> ApplicationSessionStore caches returned snapshot and reattaches the stream
```

### Example: member artifact + progress coexistence

```text
Requirements Writer
  -> publish_application_event(PROGRESS, publicationKey='drafting', phaseLabel='Drafting requirements', state='working', percent=40)
  -> projector upserts members['requirements_writer'].progressByKey['drafting']

Requirements Writer
  -> publish_application_event(MEMBER_ARTIFACT, publicationKey='requirements_artifact', artifactType='markdown_document', artifactRef=WORKSPACE_FILE:/workspace/requirements.md, state='ready')
  -> projector upserts members['requirements_writer'].artifactsByKey['requirements_artifact']

Result:
  member.progressByKey['drafting'] is still retained
  member.artifactsByKey['requirements_artifact'] is retained separately
  native Execution and SDK consumers can render both together
```

### Example: delivery state promotion

```text
Delivery Promoter
  -> publish_application_event(DELIVERY_STATE, publicationKey='final_delivery', deliveryState='ready', artifactType='html_preview', artifactRef=WORKSPACE_FILE:/workspace/final.html)
  -> projector replaces application.view.delivery.current
  -> bundled SDK receives next snapshot
  -> bundled Application view switches from waiting state to final preview renderer
```

## Final Design Summary

The target design keeps the validated bundle-import and packaged-Electron topology work, but promotes Applications into a richer architecture with two additional contract tightenings required by round-4 review:

- bundle-driven discovery stays,
- app-owned definition editing stays,
- iframe topology-aware bootstrap stays,
- **backend-owned runtime Applications capability is added**,
- **capability cutover initializes once from current application discovery, then persists explicit runtime ownership without any legacy frontend fallback**,
- **backend-owned application sessions are added**,
- **backend-owned active-session binding for `/applications/[id]` is added**,
- **typed application publication events are added**,
- **family-tight retained application/member projections are added**,
- **the application page becomes a layered host shell**,
- **a frontend SDK becomes the author-facing contract**,
- **a small reference app proves the whole path end to end**.

That closes the remaining design gaps behind `DAR-003` and `DAR-004` while preserving the already validated bundle/import/topology work.
