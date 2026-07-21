# @autobyteus/application-frontend-sdk

Frontend helper package for application bundle UIs running inside the AutoByteus iframe host.

## What it owns

- `startHostedApplication(...)`
- `createApplicationClient(...)`
- `createApplicationBackendMountTransport(...)`
- framework-owned hosted-application startup states for unsupported entry, waiting, local startup, and startup failure
- schema-agnostic `applicationClient.backend` helpers for GraphQL, routes, queries, commands, notifications, and optional custom WebSockets
- standard `applicationClient.agentCommunication.connect(address)` connections for application-bound agents and teams
- re-exported request/notification/context types from `@autobyteus/application-sdk-contracts`


## External custom application guide

For new external applications, use `@autobyteus/application-devkit` and the guide in `../docs/custom-application-development.md`. The starter template keeps app-authored startup on `startHostedApplication(...)` in both production and dev bootstrap modes.

## Usage

```ts
import {
  startHostedApplication,
} from '@autobyteus/application-frontend-sdk'

startHostedApplication({
  rootElement: document.getElementById('app-root'),
  onBootstrapped: async ({ bootstrap, applicationClient, rootElement }) => {
    rootElement.textContent = `Started ${bootstrap.application.name}`

    const result = await applicationClient.backend.graphql({
      query: 'query BriefsQuery { briefs { briefId title } }',
      operationName: 'BriefsQuery',
    })

    console.log(result)
  },
})
```

## Notes

- Direct/raw bundle entry without valid host launch hints is unsupported by default and stays framework-owned.
- `startHostedApplication(...)` owns launch-hint parsing, ready/bootstrap wiring, startup-failure containment, and the handoff into business UI.
- Business app code should begin inside `onBootstrapped(...)` and should not own pre-bootstrap waiting/failure/direct-open UX.
- `applicationClient` is the generic hosted backend-mount client created after bootstrap validation succeeds.
- `bootstrap.transport` supplies the exact fixed desktop bases for backend request/response, notifications, optional custom backend WebSockets, and standard agent communication.
- GraphQL, routes, query, and command URLs derive from that base instead of becoming parallel sources of truth.
- `applicationClient.agentCommunication.connect(address)` is the standard provider-neutral bidirectional path for a bound agent, whole team, or static team member. It does not require an application backend proxy route.
- `applicationClient.backend.connectWebSocket(path, options)` is a separate optional escape hatch for custom realtime business protocols.
- The hosted client exposes no raw browser socket, runtime-id API, or application authentication surface.
- `bootstrap.iframeLaunchId` is iframe-bootstrap correlation context only; `applicationClient.getApplicationInfo().requestContext` contains `{ applicationId }`.
- `subscribeNotifications` is optional; omit it if the app UI does not use backend notifications.
- The SDK does not own app business schemas or generated clients. Those stay inside each application workspace.

## Teaching samples

- `../applications/brief-studio/README.md`
- `../applications/socratic-math-teacher/README.md`
