# Application Sessions (Historical Note)

The former application-session subsystem is no longer the authoritative model for installed application runtime behavior.

## What Changed

The current implementation replaced the old session-owned model with application-owned runtime orchestration:

- the generic Applications host now ensures the backend is ready and boots the iframe, but it does not create a platform-owned application session,
- application backends decide when to start runs by calling `context.runtimeControl.*`,
- durable state is now expressed as run bindings plus app-owned pending-intent reconciliation, execution-event journals, and global run lookups,
- host/bootstrap request context uses `{ applicationId }`, not an application-session id, and
- the old session GraphQL / websocket / retained-snapshot surfaces were removed from the live codepath.

## Current Authoritative Docs

- [`application_orchestration.md`](./application_orchestration.md)
- [`application_backend_gateway.md`](./application_backend_gateway.md)
- [`application_engine.md`](./application_engine.md)
- [`application_storage.md`](./application_storage.md)
- [`applications.md`](./applications.md)
- `../../../autobyteus-web/docs/applications.md`
- `../../../autobyteus-web/docs/application-bundle-iframe-contract-v3.md`

Keep this file only as a redirect for historical links. Do not treat it as the current architecture description.
