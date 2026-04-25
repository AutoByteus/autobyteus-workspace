# Application Backend Gateway

## Scope

Owns the platform-facing transport boundary for application backends: engine status, explicit backend `ensure-ready`, queries, commands, GraphQL execution, arbitrary REST-style routes, and backend notification fan-out.

## TS Source

- `src/application-backend-gateway`
- `src/api/rest/application-backends.ts`
- `src/api/websocket/application-backend-notifications.ts`

## Main Service And Supporting Owners

- `src/application-backend-gateway/services/application-backend-gateway-service.ts`
- `src/application-backend-gateway/streaming/application-notification-stream-service.ts`
- `src/application-engine/services/application-engine-host-service.ts`

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

- `GET /rest/applications/:applicationId/available-resources`
- `GET /rest/applications/:applicationId/resource-configurations`
- `PUT /rest/applications/:applicationId/resource-configurations/:slotKey`

Those setup routes feed the authoritative pre-entry setup gate on `/applications/:id` before the iframe host is allowed to enter the application.

### WebSocket notifications

- `GET /ws/applications/:applicationId/backend/notifications`

The gateway bridges worker-published notifications into a per-application websocket stream. Notification payloads stay app-defined; transport ownership stays platform-owned.

## Engine Handoff

- `ensure-ready`, query, command, route, GraphQL, and event-handler dispatch invocations all rely on `ApplicationEngineHostService`.
- Status reads do not implicitly start the worker.
- Worker notifications are subscribed once at the gateway/engine boundary and re-published through `ApplicationNotificationStreamService`.

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
- `../../../autobyteus-web/docs/applications.md`
- `../../../autobyteus-web/docs/application-bundle-iframe-contract-v3.md`
- `../../../autobyteus-application-sdk-contracts/README.md`
- `../../../autobyteus-application-frontend-sdk/README.md`
