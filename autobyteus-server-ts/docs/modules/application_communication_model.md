# Application Communication Model

## Scope

Defines the canonical taxonomy of communication mechanisms between application frontends, application backends, the host server, and runtime subsystems. This document is the single source of truth for understanding which communication path to use, who initiates it, what direction it flows, whether `runtimeControl` is involved, and what durability semantics apply.

## Communication Matrix

| Mechanism | Direction | Initiator | API Surface | `runtimeControl` Involvement | Durability | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| **Request / Response** | Frontend → Backend → Frontend | App frontend | `client.query(...)`, `client.command(...)`, `client.graphql(...)`, `client.route(...)` | None implicit. Backend handler _may_ call `context.runtimeControl.*` but it is an app-owned decision, not an inherent part of the request path. | Transient (request/response lifecycle only) | Application Backend Gateway (`ApplicationBackendGatewayService`) |
| **Backend Notifications** | Backend → Frontend | App backend handler | `context.publishNotification(topic, payload)` (backend), `client.subscribeNotifications(callback)` (frontend) | None. Backend notifications are published by app backend handlers and fan out to subscribed frontends independently of `runtimeControl`. | **Live, non-durable.** No queue, no replay, no persistence. If no frontend is subscribed, the notification is silently dropped. | Backend Notification Stream (`ApplicationBackendNotificationStreamService`) |
| **Runtime Control** | Backend → Host Server → Runtime | App backend handler | `context.runtimeControl.startRun(...)`, `.postRunInput(...)`, `.terminateRunBinding(...)`, `.listAvailableExecutionResources(...)`, `.getRunPublishedArtifacts(...)`, etc. | **Direct.** This _is_ the runtime control surface. | Mixed: run bindings and lifecycle events are durable (SQLite journals). Live input/termination is transient. Published artifact reads are durable (shared artifact store). | Application Orchestration (`ApplicationOrchestrationHostService`) |
| **Artifact Relay** | Runtime → Host Server → Backend | Runtime / published artifact subsystem | `artifactHandlers.persisted(event, context)` (app backend handler receives the event) | Indirect: the relay uses binding state managed by orchestration, but the relay itself is not a `runtimeControl` call. | Best-effort live delivery. Apps recover missed artifacts through `context.runtimeControl.getRunPublishedArtifacts(...)` and `getPublishedArtifactRevisionText(...)`. | Application Published Artifact Relay (`ApplicationPublishedArtifactRelayService`) |
| **Runtime Streaming / Conversation** _(Future)_ | To be defined | To be defined | Not yet implemented | To be defined | To be defined | Reserved as a future, separate API. Must not be overloaded onto backend notification topics. |

## Key Boundary Rules

### 1. Backend notifications are NOT runtime control (FR-001, FR-002, FR-005)

`context.publishNotification(topic, payload)` publishes a live, non-durable message to subscribed app frontends. It does not interact with `runtimeControl`, does not start or manage runs, and does not persist anything. The backend handler context provides both `publishNotification` and `runtimeControl` as separate capabilities — the handler decides which (if any) to call.

### 2. Backend notifications are live and non-durable (FR-003)

There is no message queue, no replay buffer, and no delivery guarantee. If a frontend connects _after_ a notification was published, it will not receive that notification. Applications that need durable delivery must use their own persistence and reconciliation logic.

### 3. Artifact relay is independent from backend notifications (FR-004)

When a runtime publishes an artifact, it reaches the app backend through `ApplicationPublishedArtifactRelayService` → `artifactHandlers.persisted(event, context)`. This path is entirely separate from the backend notification stream. If the app backend _also_ wants to notify the frontend about an artifact, it must explicitly call `context.publishNotification(...)` — this is an app-owned decision, not automatic relay behavior.

### 4. Frontend request/response does not imply runtime control (FR-005)

When the frontend calls `client.command(name, input)`, the request flows through the backend gateway and engine host to the app backend handler. The handler receives a `context` object that includes both `publishNotification` and `runtimeControl`, but neither is invoked unless the handler code explicitly calls them. Frontend request/response is a synchronous transport boundary, not a runtime control trigger.

### 5. Runtime streaming is a future, separate API (FR-010)

Real-time runtime data streaming (e.g., agent step-by-step progress, token streaming) is a conceptually distinct capability from backend notifications. When implemented, it should be a separate API surface with its own subscription model, not overloaded onto notification topics. Notification topics are for app-level UI updates; runtime streaming is for live execution telemetry.

## Concrete Examples

| Scenario | Mechanism | What Happens |
| --- | --- | --- |
| Brief Studio shows "artifact ready" badge | Backend Notification | App backend's `artifactHandlers.persisted` calls `context.publishNotification("artifact.available", { artifactId })`. Frontend's `subscribeNotifications` callback updates the UI. |
| Brief Studio fetches a generated document's text | Request/Response + Runtime Control | App backend's command handler calls `context.runtimeControl.getPublishedArtifactRevisionText({ runId, revisionId })` and returns the result to the frontend via the normal command response. |
| Socratic Math Teacher starts a tutoring run | Request/Response + Runtime Control | Frontend calls `client.command("startTutoring", { topic })`. Backend handler calls `context.runtimeControl.startRun(...)` and returns the binding summary. |
| Frontend shows a loading spinner during generation | Backend Notification | App backend handler calls `context.publishNotification("generation.progress", { percent })` at intervals. Frontend updates the spinner. If the frontend disconnects and reconnects, it will not see missed progress updates. |
| Agent completes and publishes a code artifact | Artifact Relay | Runtime persists the artifact. `ApplicationPublishedArtifactRelayService` delivers the event to the app backend's `artifactHandlers.persisted`. The app decides whether to also notify the frontend. |

## Internal Ownership Summary

| Internal Service | Responsibility | File |
| --- | --- | --- |
| `ApplicationBackendNotificationStreamService` | Backend-published frontend notification fan-out over WebSocket. Manages per-application connection registry. Owned by the backend gateway. | `src/application-backend-gateway/streaming/application-backend-notification-stream-service.ts` |
| `ApplicationBackendGatewayService` | Transport boundary for all frontend → backend requests. Bridges engine notifications to the stream service. | `src/application-backend-gateway/services/application-backend-gateway-service.ts` |
| `ApplicationOrchestrationHostService` | Runtime control surface: run lifecycle, bindings, journals, published artifact reads. | `src/application-orchestration/services/application-orchestration-host-service.ts` |
| `ApplicationPublishedArtifactRelayService` | Best-effort live artifact event relay to bound app backends. | `src/application-orchestration/services/application-published-artifact-relay-service.ts` |

## Related Docs

- [`application_backend_gateway.md`](./application_backend_gateway.md)
- [`application_orchestration.md`](./application_orchestration.md)
- [`application_engine.md`](./application_engine.md)
- [`applications.md`](./applications.md)
- `../../../autobyteus-application-sdk-contracts/README.md`
- `../../../autobyteus-application-frontend-sdk/README.md`
- `../../../autobyteus-application-backend-sdk/README.md`
