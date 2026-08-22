# @autobyteus/application-frontend-sdk

Frontend helper package for application UIs running in AutoByteus Studio or the standalone host.

## What it owns

- `startApplication(...)`
- `createApplicationClient(...)`
- `createApplicationBackendMountTransport(...)`
- provider-neutral startup states for bootstrap acquisition, application handoff, failure, and disposal
- schema-agnostic `applicationClient.backend` helpers for GraphQL, routes, queries, commands, and optional custom WebSockets
- sibling `applicationClient.notifications.subscribe(listener)` for backend notifications
- standard `applicationClient.agentCommunication.connect(address)` connections for application-bound agents and teams
- re-exported request/notification/context types from `@autobyteus/application-sdk-contracts`


## External custom application guide

For new external applications, use `@autobyteus/application-devkit` and the guide in `../docs/custom-application-development.md`. The starter template keeps app-authored startup on `startApplication(...)` in both production and dev bootstrap modes.

## Usage

```ts
import {
  startApplication,
} from '@autobyteus/application-frontend-sdk'

startApplication({
  rootElement: document.getElementById('app-root'),
  onBootstrapped: async ({ runtimeBootstrap, applicationClient, rootElement }) => {
    rootElement.textContent = `Started ${runtimeBootstrap.application.name}`

    const result = await applicationClient.backend.graphql({
      query: 'query BriefsQuery { briefs { briefId title } }',
      operationName: 'BriefsQuery',
    })

    console.log(result)
  },
})
```

## Notes

- `startApplication(...)` resolves either the Studio iframe provider or the top-level same-origin standalone provider, then owns bootstrap acquisition, startup-failure containment, and business UI handoff.
- Business app code should begin inside `onBootstrapped(...)` and should not own pre-bootstrap waiting/failure/direct-open UX.
- `applicationClient` is the generic backend-mount client created after bootstrap validation succeeds.
- `runtimeBootstrap.transport` supplies absolute browser-visible bases for backend request/response, notifications, optional custom backend WebSockets, and standard agent communication.
- GraphQL, routes, query, and command URLs derive from that base instead of becoming parallel sources of truth.
- `applicationClient.agentCommunication.connect(address)` is the standard provider-neutral bidirectional path for a bound agent, whole team, or static team member. It does not require an application backend proxy route.
- Standard agent events are intentionally minimal: `TURN_STARTED`, exact `TEXT_DELTA`, `TURN_COMPLETED`, `TURN_INTERRUPTED`, and safe `ERROR`. Applications may append live text locally; complete structured business output belongs in published artifacts.
- `applicationClient.backend.connectWebSocket(path, options)` is a separate optional escape hatch for custom realtime business protocols.
- The client exposes no raw browser socket, runtime-id API, or application authentication surface.
- Studio iframe correlation remains provider-internal; application code receives only the normalized runtime identity and endpoints.
- `applicationClient.notifications.subscribe(listener)` is optional; omit the notification transport if the app UI does not use backend notifications.
- The SDK does not own app business schemas or generated clients. Those stay inside each application workspace.

## Teaching samples

- `../applications/brief-studio/README.md`
- `../applications/socratic-math-teacher/README.md`
