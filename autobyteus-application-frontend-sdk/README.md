# @autobyteus/application-frontend-sdk

Frontend helper package for application bundle UIs running inside the AutoByteus iframe host.

## What it owns

- `startHostedApplication(...)`
- `createApplicationClient(...)`
- `createApplicationBackendMountTransport(...)`
- framework-owned hosted-application startup states for unsupported entry, waiting, local startup, and startup failure
- schema-agnostic transport helpers for GraphQL, routes, queries, commands, and notifications
- re-exported request/notification/context types from `@autobyteus/application-sdk-contracts`

## Usage

```ts
import {
  startHostedApplication,
} from '@autobyteus/application-frontend-sdk'

startHostedApplication({
  rootElement: document.getElementById('app-root'),
  onBootstrapped: async ({ bootstrap, applicationClient, rootElement }) => {
    rootElement.textContent = `Started ${bootstrap.application.name}`

    const result = await applicationClient.graphql({
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
- `bootstrap.transport.backendBaseUrl` is the one authoritative hosted backend-mount URL for app business APIs.
- GraphQL, routes, query, and command URLs derive from that base instead of becoming parallel sources of truth.
- `requestContext.launchInstanceId` is optional browser-launch correlation context. It is not business identity.
- `subscribeNotifications` is optional; omit it if the app UI does not use backend notifications.
- The SDK does not own app business schemas or generated clients. Those stay inside each application workspace.

## Teaching samples

- `../applications/brief-studio/README.md`
- `../applications/socratic-math-teacher/README.md`
