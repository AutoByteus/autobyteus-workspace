# @autobyteus/application-frontend-sdk

Frontend helper package for application bundle UIs running inside the AutoByteus iframe host.

## What it owns

- `createApplicationClient(...)`
- `createApplicationBackendMountTransport(...)`
- schema-agnostic transport helpers for GraphQL, routes, queries, commands, and notifications
- re-exported request/notification/context types from `@autobyteus/application-sdk-contracts`

## Usage

```ts
import {
  createApplicationBackendMountTransport,
  createApplicationClient,
} from '@autobyteus/application-frontend-sdk'

const client = createApplicationClient({
  applicationId: bootstrap.application.applicationId,
  requestContext: bootstrap.requestContext,
  transport: createApplicationBackendMountTransport({
    backendBaseUrl: bootstrap.transport.backendBaseUrl!,
    backendNotificationsUrl: bootstrap.transport.backendNotificationsUrl,
  }),
})

const result = await client.graphql({
  query: 'query BriefsQuery { briefs { briefId title } }',
  operationName: 'BriefsQuery',
})
```

## Notes

- `bootstrap.transport.backendBaseUrl` is the one authoritative hosted backend-mount URL for app business APIs.
- GraphQL, routes, query, and command URLs derive from that base instead of becoming parallel sources of truth.
- `requestContext.launchInstanceId` is optional browser-launch correlation context. It is not business identity.
- `subscribeNotifications` is optional; omit it if the app UI does not use backend notifications.
- The SDK does not own app business schemas or generated clients. Those stay inside each application workspace.

## Teaching samples

- `../applications/brief-studio/README.md`
- `../applications/socratic-math-teacher/README.md`
