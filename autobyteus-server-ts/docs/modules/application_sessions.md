# Application Sessions

## Scope

Owns backend-authoritative application-session lifecycle for launched applications: create, bind, query, terminate, send input, persist retained session snapshots, append normalized publication events to the durable journal, and stream live session snapshots to subscribers.

## TS Source

- `src/application-sessions`
- `src/api/graphql/types/application-session.ts`
- `src/api/websocket/application-session.ts`

## Main Service And Supporting Owners

- `src/application-sessions/services/application-session-service.ts`
- `src/application-sessions/services/application-publication-service.ts`
- `src/application-sessions/services/application-publication-validator.ts`
- `src/application-sessions/services/application-publication-projector.ts`
- `src/application-sessions/services/application-publication-dispatch-service.ts`
- `src/application-sessions/stores/application-session-state-store.ts`
- `src/application-sessions/stores/application-publication-journal-store.ts`
- `src/application-sessions/streaming/application-session-stream-service.ts`
- `src/application-sessions/streaming/application-session-stream-handler.ts`
- `src/application-sessions/tools/publish-artifact-tool.ts`

## Authority Boundary

- GraphQL queries expose `applicationSession(id)` and `applicationSessionBinding(applicationId, requestedSessionId?)`.
- GraphQL mutations expose `createApplicationSession`, `terminateApplicationSession`, and `sendApplicationInput`.
- `ApplicationSessionService` launches the underlying agent run or team run, owns active-session replacement, and returns the canonical application-session snapshot shape used by the frontend.
- Live session snapshots and the active-session index are now persisted in platform-owned SQLite state through `ApplicationSessionStateStore`; the old in-memory-only authority path has been removed.
- Only one live session is retained per application id. Relaunch terminates the previous live session before a replacement session is created. The frontend page shell should therefore expose `Launch` / `Relaunch` / `Stop current session` around one current live session instead of implying concurrent parallel launched copies inside Applications.

## Route Binding Contract

`applicationSessionBinding(applicationId, requestedSessionId?)` is the authoritative route-reattachment lookup for `/applications/[id]`.

It returns one of three resolutions:

- `requested_live`: the requested session id still exists, belongs to the same application, and is live.
- `application_active`: the requested session is gone or stale, but another live session is currently active for that application.
- `none`: no live session is currently available for that application.

Frontend route canonicalization should follow `resolvedSessionId`, not the originally requested id.

## Session Snapshot Shape

Each snapshot includes:

- application catalog metadata (`applicationId`, local id, package id, name, asset paths, writable flag),
- launched runtime identity (`kind`, `runId`, `definitionId`),
- `createdAt` / `terminatedAt`, and
- a retained application view.

The retained application view is intentionally artifact-centric:

- `view.members[*].artifactsByKey` stores retained member artifacts by stable `artifactKey`.
- `primaryArtifactKey` resolves to the newest retained artifact for that member.
- Delivery-state and progress-family retained slots were removed from the v1 target shape; host-native execution surfaces now read retained artifacts plus runtime metadata instead.

## Input Routing

- `sendApplicationInput` accepts user text plus optional `contextFiles` and `metadata`.
- Single-agent application sessions route input directly to the underlying agent run.
- Team-backed application sessions route input through the team run and may target a specific member by `targetMemberName`.

## Publication Contract

Application-attached runtimes publish application-visible state through the `publish_artifact` tool.

Runtime-originated v1 publication rules:

- `contractVersion` must be `"1"`.
- `artifactKey`, `artifactType`, and `artifactRef` are required.
- `title`, `summary`, `metadata`, and `isFinal` are optional.
- Legacy family-selection fields such as `publicationFamily`, `deliveryState`, or progress fields are rejected.
- Artifact references are validated before projection.
- Rejected publications do not mutate retained session state.

Publication ownership is now split explicitly:

- `ApplicationPublicationService` validates and normalizes the runtime artifact publication.
- Within one platform-state transaction, it updates the retained session projection and appends a normalized journal row with stable `eventId` and monotonically increasing `journalSequence`.
- The normalized durable journal family is `ARTIFACT`; platform lifecycle events remain `SESSION_STARTED` and `SESSION_TERMINATED`.
- Producer provenance (`memberRouteKey`, optional `memberName`, and role/runtime kind) is platform-owned and attached from runtime context; app authors do not provide it manually.
- After commit, the service publishes the next retained snapshot to session-stream subscribers and schedules asynchronous backend event dispatch.
- Session start and session termination are also journaled as normalized lifecycle events by the platform.

Projection rules stay tight:

- Artifact publications update only the publishing member’s artifact projection map.
- Lifecycle events do not mutate the retained artifact view.

## Dispatch / Retry Contract

- Normalized journal events are dispatched asynchronously to the owning application backend through `ApplicationPublicationDispatchService` and the application engine.
- Dispatch is ordered per application and uses `AT_LEAST_ONCE` delivery semantics.
- Retry backoff doubles from `1s` up to `60s`.
- Missing app-side event handlers are treated as acknowledged no-op dispatches; handler failures stay in the journal and are retried later.
- Server startup calls `resumePendingDispatches()` so preexisting pending journal rows are rescheduled without waiting for a fresh new publication.
- App-owned side effects must therefore be idempotent by stable `eventId`.

## Streaming Contract

- WebSocket subscribers connect at `/ws/application-session/:applicationSessionId`.
- Successful connection sends a `connected` message and then the current `snapshot` immediately.
- Later create/terminate/publication changes publish the next full snapshot for that session.
- Unknown session ids are rejected during connect and the socket is closed.

## Related Docs

- [`applications.md`](./applications.md)
- [`application_backend_gateway.md`](./application_backend_gateway.md)
- [`application_engine.md`](./application_engine.md)
- [`application_storage.md`](./application_storage.md)
- `../../../autobyteus-web/docs/applications.md`
- `../../../autobyteus-web/docs/application-bundle-iframe-contract-v1.md`
- `../../../autobyteus-application-sdk-contracts/README.md`
- `../../../autobyteus-application-backend-sdk/README.md`
