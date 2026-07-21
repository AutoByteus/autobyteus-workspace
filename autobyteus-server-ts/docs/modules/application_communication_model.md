# Application Communication Model

## Scope

Defines the canonical taxonomy of communication mechanisms between application frontends, application backends, the host server, and runtime subsystems. This document is the single source of truth for understanding which communication path to use, who initiates it, what direction it flows, whether a named backend context capability is involved, and what durability semantics apply.

## Communication Matrix

| Mechanism | Direction | Initiator | API Surface | Context-Capability Involvement | Durability | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| **Request / Response** | Frontend → Backend → Frontend | App frontend | `client.backend.query(...)`, `.command(...)`, `.graphql(...)`, `.route(...)` | None implicit. A backend handler _may_ call a named context capability, but that is an app-owned decision, not an inherent part of the request path. | Transient (request/response lifecycle only) | Application Backend API Gateway (`ApplicationBackendApiGatewayService`) |
| **Backend Notifications** | Backend → Frontend | App backend handler | `context.publishNotification(topic, payload)` (backend), `client.notifications.subscribe(callback)` (frontend) | None. Backend notifications fan out independently of the orchestration capabilities. | **Live, non-durable.** No queue, no replay, no persistence. If no frontend is subscribed, the notification is silently dropped. | Backend Notification Hub (`ApplicationBackendNotificationHub`) |
| **Agent Execution And Resources** | Backend → Host Server → Runtime | App backend handler | `context.agentExecution.*`, `context.agentResources.*` | **Direct.** These capabilities launch/control bound agents and teams and resolve resources. | Mixed: run bindings and lifecycle events are durable (SQLite journals); live input/termination is transient. | Application Orchestration (`ApplicationOrchestrationHostService`) |
| **Published-Artifact Reads** | Backend → Host Server → Artifact Store | App backend handler | `context.publishedArtifacts.list(...)`, `.readRevision(...)` | **Direct.** This capability reads durable published artifacts for application-owned runs. | Durable shared artifact store. | Application Orchestration (`ApplicationOrchestrationHostService`) |
| **Artifact Relay** | Runtime → Host Server → Backend | Runtime / published artifact subsystem | `artifactHandlers.persisted(event, context)` (app backend handler receives the event) | Indirect: the relay uses binding state managed by orchestration, but it is not a context-capability call. | Best-effort live delivery. Apps recover missed artifacts through `context.publishedArtifacts`. | Application Published Artifact Relay (`ApplicationPublishedArtifactRelayService`) |
| **Standard Agent Communication** | Frontend ↔ Bound Runtime | App frontend | `client.agentCommunication.connect(address)` | Direct through Communication, Streaming, and Orchestration; never through the backend gateway, engine, or worker. | Live ordered connection-local stream; no replay. | `ApplicationAgentCommunicationService` |
| **Backend Agent Observation** | Bound Runtime → Backend | App backend handler | `context.agentExecution.subscribeEventStream(address, observer, options)` | Direct named capability bridged through Engine to the same Streaming/Orchestration authority. | Live ordered subscription-local stream; no replay. | `ApplicationAgentStreamingService` |
| **Custom Backend WebSocket** | Frontend ↔ Backend | App frontend or backend route handler | `client.backend.connectWebSocket(path, options)` / `webSocketRoutes` | None implicit; the application handler may separately call context capabilities. | Live bounded custom session; no replay. | Application Backend API Gateway + Application Backend Host |

## Key Boundary Rules

### 1. Backend notifications are not agent execution (FR-001, FR-002, FR-005)

`context.publishNotification(topic, payload)` publishes a live, non-durable message to subscribed app frontends. It does not interact with `agentExecution`, does not start or manage runs, and does not persist anything. The handler decides which separate context capability, if any, to call.

### 2. Backend notifications are live and non-durable (FR-003)

There is no message queue, no replay buffer, and no delivery guarantee. If a frontend connects _after_ a notification was published, it will not receive that notification. Applications that need durable delivery must use their own persistence and reconciliation logic.

### 3. Artifact relay is independent from backend notifications (FR-004)

When a runtime publishes an artifact, it reaches the app backend through `ApplicationPublishedArtifactRelayService` → `artifactHandlers.persisted(event, context)`. This path is entirely separate from the backend notification stream. If the app backend _also_ wants to notify the frontend about an artifact, it must explicitly call `context.publishNotification(...)` — this is an app-owned decision, not automatic relay behavior.

### 4. Frontend request/response does not imply agent execution (FR-005)

When the frontend calls `client.backend.command(name, input)`, the request flows through the backend API gateway and engine host to the app backend handler. The handler receives `publishNotification` and the named orchestration capabilities, but none are invoked unless handler code explicitly calls them. Frontend request/response is a synchronous transport boundary, not an execution trigger.

### 5. Standard application-agent communication is direct and separate

`applicationClient.agentCommunication.connect(address)` is the framework-standard bidirectional path for a frontend to communicate with an application-bound agent, whole team, or selected static member. The trusted desktop host supplies the fixed application-scoped endpoint. Communication owns readiness/input/network state, Streaming owns exact provider-neutral event projection and per-consumer FIFO delivery, and Orchestration owns target authorization and binding lifecycle. This path does not invoke application backend handlers.

### 6. Backend observation and custom WebSockets are optional advanced adapters

An application backend may subscribe to the same provider-neutral event contract through `context.agentExecution.subscribeEventStream(...)`. Separately, `applicationClient.backend.connectWebSocket(...)` and `webSocketRoutes` support custom realtime business protocols. Neither adapter replaces or proxies the standard frontend agent connection, and neither changes notification or artifact durability semantics.

## Concrete Examples

| Scenario | Mechanism | What Happens |
| --- | --- | --- |
| Brief Studio shows "artifact ready" badge | Backend Notification | App backend's `artifactHandlers.persisted` calls `context.publishNotification("artifact.available", { artifactId })`. Frontend's `subscribeNotifications` callback updates the UI. |
| Brief Studio fetches a generated document's text | Request/Response + Published-Artifact Read | App backend's command handler calls `context.publishedArtifacts.readRevision({ runId, revisionId })` and returns the result to the frontend via the normal command response. |
| Socratic Math Teacher starts a tutoring run | Request/Response + Agent Execution | Frontend calls `client.backend.command("startTutoring", { topic })`. Backend handler calls `context.agentExecution.startAgentTeam(...)` and returns the binding summary. |
| Hosted lesson UI sends a follow-up and renders live tutor events | Standard Agent Communication | Frontend connects using the returned team binding address, waits for READY, sends shared `ApplicationAgentInput`, and receives ordered provider-neutral events without an app-defined proxy route. |
| Backend projects live selected-member progress | Backend Agent Observation | Handler subscribes to the same address/event contract through `context.agentExecution.subscribeEventStream(...)`; worker delivery remains separate from the frontend socket. |
| App implements a collaborative room protocol | Custom Backend WebSocket | Frontend opens `client.backend.connectWebSocket('/rooms/room-7')`; the Gateway and Backend Host route bounded text/binary frames to the declared application handler. |
| Frontend shows a loading spinner during generation | Backend Notification | App backend handler calls `context.publishNotification("generation.progress", { percent })` at intervals. Frontend updates the spinner. If the frontend disconnects and reconnects, it will not see missed progress updates. |
| Agent completes and publishes a code artifact | Artifact Relay | Runtime persists the artifact. `ApplicationPublishedArtifactRelayService` delivers the event to the app backend's `artifactHandlers.persisted`. The app decides whether to also notify the frontend. |

## Internal Ownership Summary

| Internal Service | Responsibility | File |
| --- | --- | --- |
| `ApplicationBackendNotificationHub` | Backend-published frontend notification fan-out over WebSocket. Manages per-application connection registry. Owned by the backend API gateway. | `src/application-backend-api-gateway/notifications/application-backend-notification-hub.ts` |
| `ApplicationBackendApiGatewayService` | Transport boundary for all frontend → backend requests. Bridges engine notifications to the stream service. | `src/application-backend-api-gateway/services/application-backend-api-gateway-service.ts` |
| `ApplicationOrchestrationHostService` | Agent/team execution, resources, run bindings, journals, and published-artifact reads. | `src/application-orchestration/services/application-orchestration-host-service.ts` |
| `ApplicationPublishedArtifactRelayService` | Best-effort live artifact event relay to bound app backends. | `src/application-orchestration/services/application-published-artifact-relay-service.ts` |
| `ApplicationAgentCommunicationService` | Standard frontend connection state, READY commit, input correlation, and network failure mapping. | `src/application-agent-communication/services/application-agent-communication-service.ts` |
| `ApplicationAgentStreamingService` | Shared target attachment, exact event projection, per-consumer sequence/observation metadata, bounded FIFO, and terminal drain. | `src/application-agent-streaming/services/application-agent-streaming-service.ts` |

## Related Docs

- [`application_backend_api_gateway.md`](./application_backend_api_gateway.md)
- [`application_orchestration.md`](./application_orchestration.md)
- [`application_engine.md`](./application_engine.md)
- [`applications.md`](./applications.md)
- `../../../autobyteus-application-sdk-contracts/README.md`
- `../../../autobyteus-application-frontend-sdk/README.md`
- `../../../autobyteus-application-backend-sdk/README.md`
