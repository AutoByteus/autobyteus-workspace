# Application Sessions (Historical Note)

The former application-session subsystem is no longer the authoritative model for installed application runtime behavior.

## What Changed

The current implementation replaced the old session-owned model with application-owned runtime orchestration:

- the generic Applications host now ensures the backend is ready and boots the iframe, but it does not create a platform-owned application session,
- application backends decide when to start runs by calling `context.agentExecution.startAgent(...)` or `startAgentTeam(...)`,
- durable state is now expressed as run bindings plus app-owned pending-launch-request reconciliation, execution-event journals, and global run lookups,
- host/bootstrap request context uses `{ applicationId }`, not an application-session id, and
- the old session GraphQL / websocket / retained-snapshot surfaces were removed from the live codepath.

## Current Agent Tools MCP Session Scope

The current Agent Tools MCP sessions are ephemeral bearer capabilities, not a
return of the former durable application-session identity:

- `AgentToolsMcpRuntime` owns one process registry, tool catalog, executor,
  dispatcher, and internal route family.
- Each `ApplicationPlatformRuntime` creates an early
  `ApplicationAgentToolMcpSessionScope`. Its exact run-resource manager and
  active-run registry are constructed before the concrete publisher and later
  `ScopedAgentToolMcpSessionManager`. General-process sessions use a separate
  scope/manager and cannot inherit an application's publication capability.
- Both Studio and standalone register the internal
  `/mcp/agent-tools/:sessionId` route. The external `/mcp/gateway` client surface
  is separate and remains Studio-only.
- Application-runtime shutdown blocks new session issue, closes ingress,
  drains accepted artifact commands while workers can still be ensured, stops
  workers and runtime-owned team/agent runs, revokes remaining scope-owned
  sessions, and stops remaining streams. Exact run removal revokes that run's
  sessions and detaches its file-change, artifact-relay, and memory observers
  at most once.

These descriptors are session-scoped capabilities; they are not stored
application identity, wire-level application sessions, or retained snapshots.

## Current Authoritative Docs

- [`application_orchestration.md`](./application_orchestration.md)
- [`application_backend_api_gateway.md`](./application_backend_api_gateway.md)
- [`application_engine.md`](./application_engine.md)
- [`application_storage.md`](./application_storage.md)
- [`applications.md`](./applications.md)
- `../../../autobyteus-web/docs/applications.md`
- `../../../autobyteus-web/docs/application-bundle-iframe-contract.md`

Keep this file only as a redirect for historical links. Do not treat it as the current architecture description.
