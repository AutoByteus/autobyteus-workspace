# Application Backend Gateway

## Scope

Owns the platform-facing transport boundary for application backends: engine status, queries, commands, GraphQL execution, arbitrary REST-style routes, and backend notification fan-out.

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
- `applicationSessionId` is optional context, not the primary backend routing key.
- The gateway always validates that the application exists before forwarding work to the app engine.
- Callers do not talk to worker internals, storage internals, or publication internals directly.

## Exposed Runtime Surfaces

### REST

- `GET /rest/applications/:applicationId/backend/status`
  - reads current engine status without forcing startup.
- `POST /rest/applications/:applicationId/backend/queries/:queryName`
- `POST /rest/applications/:applicationId/backend/commands/:commandName`
- `POST /rest/applications/:applicationId/backend/graphql`
- `GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS /rest/applications/:applicationId/backend/routes/*`

Queries, commands, and GraphQL accept request context in the POST body. All request surfaces can also carry `applicationSessionId` via:

- `x-autobyteus-application-session-id` header, or
- `applicationSessionId` query string.

For custom routes, the gateway forwards normalized headers, query params, method, path, and body into the worker-owned route handler.

### WebSocket notifications

- `GET /ws/applications/:applicationId/backend/notifications`

The gateway bridges worker-published notifications into a per-application websocket stream. Notification payloads stay app-defined; transport ownership stays platform-owned.

## Engine Handoff

- Query/command/route/GraphQL invocations wake the application engine on demand through `ApplicationEngineHostService.ensureApplicationEngine(...)`.
- Engine status reads do not implicitly start the worker.
- Worker notifications are subscribed once at the gateway layer and re-published through `ApplicationNotificationStreamService`.

## Error Behavior

- unknown application id -> `404`
- request-context identity mismatch or unmatched custom route -> `400`
- worker/load/runtime failures -> `500`

## Related Docs

- [`applications.md`](./applications.md)
- [`application_engine.md`](./application_engine.md)
- [`application_storage.md`](./application_storage.md)
- [`application_sessions.md`](./application_sessions.md)
- `../../../autobyteus-web/docs/applications.md`
- `../../../autobyteus-web/docs/application-bundle-iframe-contract-v1.md`
- `../../../autobyteus-application-sdk-contracts/README.md`
- `../../../autobyteus-application-frontend-sdk/README.md`
