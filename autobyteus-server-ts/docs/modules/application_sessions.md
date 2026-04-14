# Application Sessions

## Scope

Owns backend-authoritative application-session lifecycle for launched applications: create, bind, query, terminate, send input, project runtime publications into retained application/member state, and stream live session snapshots to subscribers.

## TS Source

- `src/application-sessions`
- `src/api/graphql/types/application-session.ts`
- `src/api/websocket/application-session.ts`

## Main Service And Supporting Owners

- `src/application-sessions/services/application-session-service.ts`
- `src/application-sessions/services/application-session-launch-builder.ts`
- `src/application-sessions/services/application-publication-validator.ts`
- `src/application-sessions/services/application-publication-projector.ts`
- `src/application-sessions/streaming/application-session-stream-service.ts`
- `src/application-sessions/streaming/application-session-stream-handler.ts`
- `src/application-sessions/tools/publish-application-event-tool.ts`

## Authority Boundary

- GraphQL queries expose `applicationSession(id)` and `applicationSessionBinding(applicationId, requestedSessionId?)`.
- GraphQL mutations expose `createApplicationSession`, `terminateApplicationSession`, and `sendApplicationInput`.
- `ApplicationSessionService` launches the underlying agent run or team run, owns active-session replacement, and returns the canonical application-session snapshot shape used by the frontend.
- The current implementation keeps live session snapshots and the active-session index in process memory. Application-session bindings therefore survive route refreshes through backend authority, but they do not survive a server restart.
- Only one live session is retained per application id. Relaunch terminates the previous live session before a replacement session is created.

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

The retained application view is intentionally family-specific:

- `view.delivery.current` stores the current top-level delivery state.
- `view.members[*].artifactsByKey` stores retained member artifacts by stable publication key.
- `view.members[*].progressByKey` stores retained member progress entries by stable publication key.
- `primaryArtifactKey` resolves to the newest non-`superseded` artifact.
- `primaryProgressKey` resolves to the newest retained progress entry.

The service does not collapse those families into one generic `latestPublication` record.

## Input Routing

- `sendApplicationInput` accepts user text plus optional `contextFiles` and `metadata`.
- Single-agent application sessions route input directly to the underlying agent run.
- Team-backed application sessions route input through the team run and may target a specific member by `targetMemberName`.

## Publication Contract

Application-attached runtimes publish application-visible state through the `publish_application_event` tool.

v1 supports exactly three families:

- `MEMBER_ARTIFACT`
- `DELIVERY_STATE`
- `PROGRESS`

Backend rules:

- `contractVersion` must be `"1"`.
- Unsupported `publicationFamily` values are rejected.
- Family-disallowed fields are rejected.
- `metadata` escape hatches are rejected.
- Artifact references are validated before projection.
- The tool forwards the declared family verbatim; unknown families are not coerced to `PROGRESS`.
- Rejected publications do not mutate retained session state.

Projection rules stay family-tight:

- `DELIVERY_STATE` updates only `view.delivery.current`.
- `MEMBER_ARTIFACT` updates only the producer member’s artifact projection map.
- `PROGRESS` updates only the producer member’s progress projection map.

## Streaming Contract

- WebSocket subscribers connect at `/ws/application-session/:applicationSessionId`.
- Successful connection sends a `connected` message and then the current `snapshot` immediately.
- Later create/terminate/publication changes publish the next full snapshot for that session.
- Unknown session ids are rejected during connect and the socket is closed.

## Related Docs

- [`applications.md`](./applications.md)
- `../../autobyteus-web/docs/applications.md`
- `../../autobyteus-web/docs/application-bundle-iframe-contract-v1.md`
