# Application Architecture Boundaries And Data-Flow Spines

**Status:** Implemented target visualization. It applies the user-approved
API-gateway name to the finalized preserved framework baseline and the completed
clean-cut source, test, and documentation rename in this ticket.

**Purpose:** Visualize the application frontend, AutoByteus server, application
worker/backend, orchestration, runtime, and storage responsibility boundaries.

**Approval applicability:** `N/A` — this is a user-requested Mermaid
visualization of the approved target name and finalized preserved framework
behavior; it adds no new behavior.

**Authoritative behavior:** [`requirements.md`](./requirements.md)

**Authoritative structure:** [`design-spec.md`](./design-spec.md)

## Reading The Architecture

There are three externally visible execution areas, with deeper server-owned
subsystems behind them:

1. **Application frontend:** an iframe UI using the frontend SDK. It talks to the
   AutoByteus server gateway; it does not call the worker, orchestration services,
   agents, teams, or databases directly.
2. **AutoByteus server:** hosts the frontend, exposes gateway transport, owns the
   worker lifecycle, validates application scope, dispatches named context
   capabilities, and owns orchestration/runtime access.
3. **Application worker/backend:** runs app-authored handlers in a separate,
   managed Node worker process. It may keep worker-local state while alive, but
   the server owns starting, stopping, invoking, and scoping it.

The worker boundary is not a second public application server. It is a managed
execution boundary behind the AutoByteus server.

## Macro Responsibility Boundaries

```mermaid
flowchart LR
  subgraph BROWSER["Boundary A — Browser / Application Frontend"]
    UI["Application UI<br/>hosted iframe"]
    FSDK["Application Frontend SDK"]
    UI --> FSDK
  end

  subgraph SERVER["Boundary B — AutoByteus Server"]
    WEBHOST["Applications Web Host<br/>iframe launch + bootstrap"]
    GATEWAY["Application Backend API Gateway<br/>query / command / GraphQL / route / notification"]
    ENGINE["Application Engine Host<br/>worker lifecycle + scoped invocation"]
    ORCH["Application Orchestration<br/>binding / resources / artifacts / lifecycle"]
    RUNTIME["Agent And Team Runtime"]
    PLATFORMDB[("platform.sqlite<br/>platform-owned state")]
    ARTIFACTS[("Published Artifact Store")]
  end

  subgraph WORKER["Boundary C — Managed Application Worker"]
    WRUNTIME["Worker Runtime<br/>handler invocation + context adapter"]
    BACKEND["Application Backend Handlers<br/>app-authored business logic"]
    APPDB[("app.sqlite<br/>app-owned business state")]
    WRUNTIME --> BACKEND
    BACKEND --> APPDB
  end

  WEBHOST -->|"launch + bootstrap"| FSDK
  FSDK -->|"server-owned frontend transport"| GATEWAY
  GATEWAY -->|"invoke app handler"| ENGINE
  ENGINE -->|"managed JSON-RPC"| WRUNTIME
  BACKEND -->|"named context capability"| WRUNTIME
  WRUNTIME -.->|"scoped reverse invocation"| ENGINE
  ENGINE --> ORCH
  ORCH --> RUNTIME
  ORCH --> PLATFORMDB
  ORCH --> ARTIFACTS
  GATEWAY -.->|"response / app notification"| FSDK
```

### Responsibility Table

| Boundary / Module | Owns | Must Not Own Or Bypass |
| --- | --- | --- |
| Application UI / frontend SDK | UI state, app request construction, response/notification consumption | Worker lifecycle, raw orchestration services, runtime authorization, direct DB access |
| Application backend API gateway | Frontend-facing request/response transport and app-defined notification delivery | App business logic, agent/team control policy, direct worker implementation details |
| Application engine host | Worker start/stop/readiness, handler invocation, application scoping, reverse-call dispatch | Agent/team business semantics or direct persistence logic |
| Worker runtime | Load v3 backend, invoke handler, construct context, map named capabilities to reverse RPC | Server orchestration policy, cross-application selection, public frontend transport |
| Application backend handler | App business logic and app-owned state | Direct server service imports, raw agent/team services, platform DB access |
| Application orchestration | Resource resolution, launches, bindings, lifecycle, input, termination, artifact access | App-specific business-object persistence or frontend rendering |
| Agent/team runtime | Execute agents and teams | Application UI transport or app business correlation |
| `platform.sqlite` owners | Binding, lifecycle, configuration, platform projections | App-authored business tables |
| `app.sqlite` owners | Application business state and launch-request/business-object correlation | Platform binding/lifecycle state |

### Concrete Module Map

| Logical Boundary | Repository Module / Principal Owner | Allowed Direction |
| --- | --- | --- |
| Application UI | `autobyteus-web` hosted iframe plus `autobyteus-application-frontend-sdk` | Calls only server REST/WebSocket gateway surfaces |
| Frontend transport | `autobyteus-server-ts/src/application-backend-api-gateway` / `ApplicationBackendApiGatewayService` | Validates app scope, invokes engine, returns responses, fans out backend notifications |
| Worker lifecycle and IPC | `autobyteus-server-ts/src/application-engine` / `ApplicationEngineHostService` | Gateway or orchestration → managed worker; scoped worker reverse calls → orchestration |
| App-authored backend | Installed application's contract-v3 backend loaded by `application-worker-runtime.ts` | Receives handler calls; uses only `ApplicationHandlerContext` and app-owned storage |
| Agent/team and artifact facade | `autobyteus-server-ts/src/application-orchestration` / `ApplicationOrchestrationHostService` | Receives app-scoped engine calls and delegates to focused owners |
| Agent/team execution | Server agent/team runtime services | Receives validated orchestration requests; emits lifecycle/artifact events |
| Platform persistence | Application orchestration/storage stores in `platform.sqlite` | Persists bindings, lifecycle journal, configuration, and projections |
| Application persistence | Per-application `app.sqlite` under the server-provided application storage root | App backend owns its business schema and correlation state |

## Target Backend Context Boundary

```mermaid
flowchart TB
  CTX["ApplicationHandlerContext v3"]

  subgraph EXEC["agentExecution — bound agent/team execution"]
    EA["startAgent"]
    ET["startAgentTeam"]
    SI["sendInput"]
    TERM["terminate"]
    GET["get"]
    LIST["list"]
    FIND["findByLaunchRequestId"]
  end

  subgraph RES["agentResources — permitted resource discovery"]
    RA["listAvailable"]
    RC["getConfigured"]
  end

  subgraph PUB["publishedArtifacts — durable artifact reads"]
    PL["list"]
    PR["readRevision"]
  end

  STORAGE["storage — app-owned paths / app.sqlite"]
  NOTIFY["publishNotification — app-defined frontend notification"]
  REQUEST["requestContext — current application request scope"]

  CTX --> EXEC
  CTX --> RES
  CTX --> PUB
  CTX --> STORAGE
  CTX --> NOTIFY
  CTX --> REQUEST
```

`runtimeControl` is absent. The three named capabilities are public façades; the
server's existing focused orchestration services remain the behavioral owners.

## Frontend Request, Handler Capability, And Return Spine

This sequence also shows how a GraphQL result returns. The original gateway
request remains pending while the handler may perform server-owned context calls.

```mermaid
sequenceDiagram
  autonumber
  participant UI as Application UI
  participant FS as Frontend SDK
  participant GW as Application Backend API Gateway
  participant EH as Engine Host
  participant WR as Worker Runtime
  participant H as App Handler
  participant OH as Orchestration Host
  participant AO as Focused Runtime/Resource/Artifact Owner

  UI->>FS: GraphQL / query / command / route request
  FS->>GW: application-scoped REST request
  GW->>EH: invoke application handler (applicationId scoped)
  EH->>WR: JSON-RPC handler invocation
  WR->>H: call v3 backend handler(context, input)
  opt Handler needs an agent/resource/artifact capability
    H->>WR: context.agentExecution / agentResources / publishedArtifacts
    WR-->>EH: reverse capability request
    EH->>OH: scoped authoritative operation
    OH->>AO: delegate to focused owner
    AO-->>OH: typed result or error
    OH-->>EH: result or error
    EH-->>WR: reverse-call result
    WR-->>H: capability promise resolves
  end
  H-->>WR: handler result
  WR-->>EH: invocation result
  EH-->>GW: application response
  GW-->>FS: GraphQL / request response
  FS-->>UI: client promise resolves
```

**Invariant:** the UI talks to the gateway only. A handler context call crosses
the worker/server boundary through the engine host and cannot choose another
`applicationId`.

## Backend Notification Return Spine

This is an app-defined, live, non-durable frontend update path. It is not the
future agent/team output-stream API.

```mermaid
sequenceDiagram
  autonumber
  participant H as App Handler
  participant WR as Worker Runtime
  participant EH as Engine Host
  participant GW as Application Backend API Gateway
  participant NS as Backend Notification Stream
  participant FS as Frontend SDK
  participant UI as Application UI

  H->>WR: context.publishNotification(topic, payload)
  WR-->>EH: engine protocol notification(applicationId scoped)
  EH-->>GW: subscribed notification event
  GW->>NS: publish app-defined notification
  NS-->>FS: application WebSocket message
  FS-->>UI: subscription callback
```

If no frontend is subscribed, the message is dropped. There is no persistence,
queue, or replay.

## Launch Request And Ambiguous-Handoff Recovery Spine

`launchRequestId` is an application-created correlation ID for one request to
launch an agent or agent team. It is not a runtime `runId`, binding ID, process
launch ID, or LLM/user intent.

```mermaid
sequenceDiagram
  autonumber
  participant BS as App Business Service
  participant AD as app.sqlite
  participant CX as context.agentExecution
  participant WB as Worker/Engine Bridge
  participant OH as ApplicationOrchestrationHostService
  participant LS as Binding Launch Service
  participant BStore as Application Run Binding Store
  participant RT as Agent Or Team Runtime
  participant PD as platform.sqlite

  BS->>AD: persist PendingLaunchRequest(launchRequestId, businessObjectId)
  BS->>CX: startAgent/startAgentTeam({ launchRequestId, ... })
  CX->>WB: scoped reverse invocation
  WB->>OH: start for engine-injected applicationId
  OH->>OH: await startup gate + require active application
  OH->>LS: launch for current application
  LS->>RT: start agent or team
  RT-->>LS: runtime identity
  LS->>BStore: persist binding(bindingId, launchRequestId, runId, ...)
  BStore->>PD: write platform binding
  PD-->>BStore: persisted row
  BStore-->>LS: binding persisted
  LS-->>OH: ApplicationRunBindingSummary
  OH-->>WB: completed binding
  WB-->>CX: capability result
  CX-->>BS: ApplicationRunBindingSummary
  BS->>AD: attach bindingId/runId to business object

  alt Final app-side write was interrupted
    BS->>CX: findByLaunchRequestId(launchRequestId)
    CX->>WB: scoped reverse invocation
    WB->>OH: find for engine-injected applicationId
    OH->>OH: await startup gate + require active application
    OH->>BStore: findBindingByLaunchRequestId(applicationId, launchRequestId)
    BStore->>PD: query platform binding
    PD-->>BStore: persisted row or null
    BStore-->>OH: existing binding or null
    OH-->>WB: existing binding or null
    WB-->>CX: capability result
    CX-->>BS: existing binding or null
    BS->>AD: finalize without duplicate launch
  end
```

**Invariant:** `findByLaunchRequestId` is recovery lookup. It does not make
repeating `startAgent` or `startAgentTeam` idempotent.

## Worker/Host Capability Dispatch Spine

```mermaid
flowchart LR
  METHOD["Named context method"]
  REQUEST["Discriminated request<br/>{ capability, operation, input }"]
  RPC["Worker-to-host reverse JSON-RPC"]
  SCOPE["Engine host injects current applicationId"]
  FACADE["ApplicationOrchestrationHostService"]
  OWNER["Focused authoritative owner"]
  RESULT["Typed result or mapped error"]

  METHOD --> REQUEST --> RPC --> SCOPE --> FACADE --> OWNER --> RESULT
  RESULT -.->|"same boundary in reverse"| METHOD
```

Unknown capability/operation combinations fail at this boundary. The protocol is
an exhaustive union, not an untyped `action: string` bag.

## Durable Lifecycle Event Return Spine

```mermaid
sequenceDiagram
  autonumber
  participant RT as Agent/Team Runtime
  participant IN as Event Ingress
  participant J as platform.sqlite Event Journal
  participant D as Event Dispatcher
  participant EH as Engine Host
  participant WR as Worker Runtime
  participant H as App Event Handler
  participant AD as app.sqlite

  RT->>IN: lifecycle event for current binding
  IN->>J: append binding_json with launchRequestId
  D->>J: read next pending current-shaped record
  D->>EH: dispatch event for applicationId
  EH->>WR: invoke v3 event handler
  WR->>H: handler(event, v3 context)
  H->>AD: update app-owned business state
  H-->>WR: handled
  WR-->>EH: success
  EH-->>D: success
  D->>J: acknowledge journal record
```

Only the v3 `binding_json.launchRequestId` shape is written and hydrated. There
is no old-JSON transformation, dual read, or database compatibility path.

## Published Artifact Read Spine

```mermaid
sequenceDiagram
  autonumber
  participant H as App Handler
  participant PA as context.publishedArtifacts
  participant WB as Worker/Engine Bridge
  participant OH as Orchestration Host
  participant AP as Artifact Projection Owner
  participant AS as Durable Artifact Store

  alt List artifacts for an application-owned run
    H->>PA: list(runId)
    PA->>WB: scoped reverse invocation
    WB->>OH: list published artifacts
    OH->>OH: require active application and bound run or member, then resolve projection target
    OH->>AP: list durable projection for validated target
    AP->>AS: read current durable artifact summaries
    AS-->>AP: durable summaries
    AP-->>OH: durable summaries
    OH-->>WB: typed result
    WB-->>PA: capability result
    PA-->>H: ApplicationPublishedArtifactSummary[]
  else Read one revision
    H->>PA: readRevision({ runId, revisionId })
    PA->>WB: scoped reverse invocation
    WB->>OH: read artifact revision
    OH->>OH: require active application and bound run or member, then resolve projection target
    OH->>AP: read revision from validated target
    AP->>AS: read durable revision text
    AS-->>AP: revision text or null
    AP-->>OH: durable revision text or null
    OH-->>WB: typed result
    WB-->>PA: capability result
    PA-->>H: string or null
  end
```

The application frontend can receive artifact-derived data through a normal
backend response or an app-defined notification. It does not read the artifact
store directly.

## Published Artifact Relay And Optional UI Update Spine

Artifact persistence first belongs to the runtime/artifact subsystem. The live
relay then calls the application backend; the backend independently decides
whether the UI needs a notification. Missed live relay state is recovered with
the durable `publishedArtifacts` read capability shown above.

```mermaid
sequenceDiagram
  autonumber
  participant RT as Agent/Team Runtime
  participant AS as Published Artifact Store
  participant AR as Artifact Relay
  participant BS as Run Binding Store
  participant EH as Engine Host
  participant WR as Worker Runtime
  participant AH as App Artifact Handler
  participant GW as Application Backend API Gateway
  participant FS as Frontend SDK
  participant UI as Application UI

  RT->>AS: persist artifact revision
  RT-->>AR: ARTIFACT_PERSISTED event
  AR->>BS: resolve application-owned binding
  BS-->>AR: binding or null
  alt Bound application exists
    AR->>EH: invoke application artifact handler
    EH->>WR: worker handler invocation
    WR->>AH: artifactHandlers.persisted(event, context)
    opt Application chooses a live UI update
      AH->>WR: context.publishNotification(topic, payload)
      WR-->>EH: notification
      EH-->>GW: gateway notification bridge
      GW-->>FS: application WebSocket message
      FS-->>UI: subscription callback
    end
    AH-->>WR: handled
    WR-->>EH: success
    EH-->>AR: success
  end
```

The artifact relay is best-effort live delivery; the artifact store remains the
durable source for later reads.

## Forward-Only Source And Fresh-Schema Context

The application feature is unreleased. This is a source/schema-definition
cutover, not a rollout migration.

```mermaid
flowchart TB
  CONTRACT["Backend contract v3<br/>named context + launchRequestId"]
  SDK["Backend SDK + generated declarations"]
  ENGINE["Worker/host discriminated protocol"]
  ORCH["Current orchestration models/stores"]
  PLATFORM["Canonical platform DDL<br/>launch_request_id"]
  BRIEF["Brief baseline SQL 004<br/>pending_launch_requests"]
  SOCRATIC["Socratic baseline SQL 002<br/>pending_launch_requests"]
  PACKAGES["Regenerated built-in backends/packages"]
  FRESH["Isolated fresh-storage validation"]

  CONTRACT --> SDK --> ENGINE --> ORCH
  ORCH --> PLATFORM
  CONTRACT --> BRIEF
  CONTRACT --> SOCRATIC
  SDK --> PACKAGES
  BRIEF --> PACKAGES
  SOCRATIC --> PACKAGES
  PLATFORM --> FRESH
  PACKAGES --> FRESH
```

Explicitly absent from this spine:

- a platform schema-version advance;
- an old-to-new data transform;
- appended rename SQL;
- an app-migration checkpoint redesign;
- old/new dual reads or writes;
- runtime reset, rejection, or deletion behavior for old pre-release storage.

The backend definition contract advances to v3 only because compiled backend
code and the handler context change incompatibly. It is a forward code-contract
marker, not a database migration or compatibility layer.

## Communication Boundary Summary

| Information | Producer | Boundary Crossed | Consumer / Return Path |
| --- | --- | --- | --- |
| Frontend GraphQL/query/command/route | Application UI | Frontend SDK → backend API gateway | Worker handler result returns API gateway → frontend SDK → UI |
| Named handler-context capability | App backend handler | Worker reverse RPC → engine host | Orchestration result returns host → worker → handler |
| Agent/team lifecycle | Runtime | Ingress → durable platform journal → engine worker | App event handler; acknowledgment returns to journal |
| Durable artifact list/revision | Artifact store/projection | Orchestration → engine/worker | App handler; optionally included in frontend response/notification |
| Live published-artifact event | Agent/team runtime | Artifact relay → engine/worker | App artifact handler; durable recovery uses `publishedArtifacts` |
| App-defined notification | App handler | Worker → engine/gateway | Frontend SDK → application UI |
| Live agent output for application UI | No supported producer/contract in this ticket | N/A | Deferred follow-up; must not be tunneled through artifact or notification APIs |

## Forbidden Boundary Shortcuts

- The application UI must not call the worker, orchestration service, agent/team
  runtime, or databases directly.
- App backend code must not import server orchestration/runtime services.
- The worker must not accept caller-selected cross-application scope.
- Engine-host dispatch must not bypass `ApplicationOrchestrationHostService` for
  business operations.
- Current stores and baseline SQL must not contain old-schema fallback logic.
- Streaming must not be smuggled into `publishNotification` or durable artifact
  reads as part of this naming ticket.
