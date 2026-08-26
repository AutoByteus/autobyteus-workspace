# Application Backend API Gateway

## Scope

Owns the platform-facing transport boundary for application backends: engine status, explicit backend `ensure-ready`, queries, commands, GraphQL execution, arbitrary REST-style routes, optional application-defined WebSockets, and backend notification fan-out. Standard application-bound agent communication is a separate direct capability and never traverses this gateway.

## TS Source

- `src/application-backend-api-gateway`
- `src/api/rest/application-backends.ts`
- `src/api/websocket/application-backend-notifications.ts`
- `src/api/websocket/application-backends.ts`

## Main Service And Supporting Owners

- `src/application-backend-api-gateway/services/application-backend-api-gateway-service.ts`
- `src/application-backend-api-gateway/notifications/application-backend-notification-hub.ts`
- `src/application-backend-api-gateway/websockets/application-backend-websocket-session-service.ts`
- `src/application-engine/services/application-engine-controller.ts`
- `src/application-engine/services/application-engine-launcher.ts`

## Authority Boundary

- The route `:applicationId` is authoritative for every backend surface.
- Shared Fastify runtime config raises route-param length to `4096`, so long imported canonical application ids can still reach the gateway boundary unchanged.
- `requestContext.applicationId` must match the route application id; mismatches are rejected.
- The gateway forwards normal app request context as `{ applicationId }`; iframe bootstrap correlation ids stay at the host/frontend iframe boundary.
- The gateway always validates that the application exists before forwarding work to the app engine.
- Callers do not talk to worker internals, orchestration stores, or storage internals directly.

## Exposed Runtime Surfaces

### REST

- `GET /rest/applications/:applicationId/backend/status`
  - reads current engine status without forcing startup.
- `POST /rest/applications/:applicationId/backend/ensure-ready`
  - ensures storage + worker startup and returns the resulting engine status.
- `POST /rest/applications/:applicationId/backend/reload`
  - asks the application-availability owner to reload and re-enter one repaired application. During the `REENTERING` window, concurrent backend admission stays blocked with retryable availability detail; a successful reload returns the app to `ACTIVE` with the worker still stopped, and only a later `ensure-ready` boots a fresh worker.
- `POST /rest/applications/:applicationId/backend/queries/:queryName`
- `POST /rest/applications/:applicationId/backend/commands/:commandName`
- `POST /rest/applications/:applicationId/backend/graphql`
- `GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS /rest/applications/:applicationId/backend/routes/*`

Queries, commands, and GraphQL accept `{ applicationId }` request context in the POST body. Custom routes derive backend request context from the authoritative route application id while still forwarding normalized headers, query params, method, path, and body into the worker-owned route handler.

The same REST module also exposes the host launch-setup surfaces outside the backend subpath:

- `GET /rest/applications/:applicationId/available-execution-resources`
- `GET /rest/applications/:applicationId/execution-resource-configurations`
- `POST /rest/applications/:applicationId/execution-resource-configurations/:slotKey/selection-preview`
- `PUT /rest/applications/:applicationId/execution-resource-configurations/:slotKey`
- `DELETE /rest/applications/:applicationId/execution-resource-configurations/:slotKey`

Those setup routes feed the authoritative pre-entry setup gate on
`/applications/:id` before the iframe host is allowed to enter the
application. Reads keep `packageBaseline`, `selectedResourceBaseline`,
`savedOverride`, and `effectiveConfiguration` distinct. Selection preview does
not write state, `PUT` stores a validated sparse Studio override, and `DELETE`
resets that override so the bundle-owned package baseline becomes effective.

### Internal Agent Tools route is separate

Both `buildStudioServer` and `buildStandaloneApplicationServer` register
`/mcp/agent-tools/:sessionId` from the same process-owned
`AgentToolsMcpHost`. Each application runtime issues sessions through its
`ScopedAgentToolMcpSessionAuthority`; authenticated publication uses only that
scope's `PublishedArtifactPublisher`. Studio's `/mcp/gateway` remains a
separate external-client boundary and is not registered by standalone.

### WebSocket notifications

- `GET /ws/applications/:applicationId/backend/notifications`

The gateway bridges worker-published notifications into a per-application websocket stream. Notification payloads stay app-defined; transport ownership stays platform-owned.

### Optional custom backend WebSockets

- `GET /ws/applications/:applicationId/backend/routes/*`

The gateway validates active application/exposure state, forwards only normalized path, decoded business query/params, sanitized headers, and trusted application scope, and coordinates the network session through the engine launcher and controller. The worker-owned `ApplicationBackendHost` selects one exact `webSocketRoutes` declaration and owns application handler execution. Framework readiness precedes application frames, text/binary delivery is bounded and ordered, and two-sided cleanup is exactly once.

This escape hatch is not used to implement `applicationClient.agentCommunication.connect(address)`.

## Engine Handoff

- `ApplicationEngineLauncher` owns ensure/start/restart/stop; `ApplicationEngineController` owns attached worker handles, status/listeners, and query/command/route/GraphQL/WebSocket/event/artifact invocation.
- Accepted backend queries, commands, routes, GraphQL work, and handler callbacks are synchronous completion-coupled operations. The engine retains their correlation until the worker returns the actual result/domain error or the worker/transport closes; it does not manufacture a local work-timeout response while the handler or a nested context capability continues. Bounded startup/stop controls terminate and await the worker before exposing timeout failure.
- Status reads do not implicitly start the worker.
- Worker notifications are subscribed once at the gateway/engine boundary and re-published through `ApplicationBackendNotificationHub`.
- For a full overview of how backend notifications relate to other communication mechanisms (request/response, artifact relay, agent execution and resources), see [`application_communication_model.md`](./application_communication_model.md).

## Error Behavior

- unknown application id -> `404`
- request-context identity mismatch or unmatched custom route -> `400`
- application unavailable (`QUARANTINED` or `REENTERING`) -> `503` with availability detail; `REENTERING` responses are retryable and intentionally block concurrent backend admission during repaired-app re-entry, and `QUARANTINED` also covers removed or invalid-yet-persisted applications on their real canonical `applicationId` even when storage roots use compact hashed keys
- worker/load/runtime failures -> `500`

## Related Docs

- [`applications.md`](./applications.md)
- [`application_orchestration.md`](./application_orchestration.md)
- [`application_engine.md`](./application_engine.md)
- [`application_storage.md`](./application_storage.md)
- [`application_communication_model.md`](./application_communication_model.md)
- `../../../autobyteus-web/docs/applications.md`
- `../../../autobyteus-web/docs/application-bundle-iframe-contract.md`
- `../../../autobyteus-application-sdk-contracts/README.md`
- `../../../autobyteus-application-frontend-sdk/README.md`
