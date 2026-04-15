# @autobyteus/application-frontend-sdk

Frontend helper package for application bundle UIs running inside the AutoByteus application iframe host.

## What it owns

- `createApplicationClient(...)`
- the minimal transport adapter shape for queries, commands, GraphQL, and notifications
- re-exported request/notification/context types from `@autobyteus/application-sdk-contracts`

## Usage

```ts
import { createApplicationClient } from '@autobyteus/application-frontend-sdk'

const client = createApplicationClient({
  applicationId: bootstrap.application.applicationId,
  requestContext: {
    applicationId: bootstrap.application.applicationId,
    applicationSessionId: bootstrap.session.applicationSessionId,
  },
  transport: {
    invokeQuery: async ({ queryName, requestContext, input }) => {
      const response = await fetch(`${bootstrap.transport.backendQueriesBaseUrl}/${encodeURIComponent(queryName)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ requestContext, input }),
      })
      const json = await response.json()
      return json.result
    },
    invokeCommand: async ({ commandName, requestContext, input }) => {
      const response = await fetch(`${bootstrap.transport.backendCommandsBaseUrl}/${encodeURIComponent(commandName)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ requestContext, input }),
      })
      const json = await response.json()
      return json.result
    },
    executeGraphql: async ({ requestContext, request }) => {
      const response = await fetch(bootstrap.transport.backendGraphqlUrl!, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ requestContext, request }),
      })
      const json = await response.json()
      return json.result
    },
  },
})
```

## Notes

- The SDK assumes the route `applicationId` remains authoritative; pass the same `applicationId` in `requestContext`.
- `requestContext.applicationSessionId` is optional, but it is the normal way to preserve app-session affinity from the iframe.
- `subscribeNotifications` is optional; omit it if the app UI does not use backend notifications.
- The SDK does not replace the host bootstrap contract; it sits on top of the transport URLs delivered by `application-bundle-iframe-contract-v1.md`.
- Host-retained session snapshots and execution rendering remain host-owned concerns; this SDK focuses on app-owned backend interaction.

## Teaching sample

The canonical iframe-app example for this package lives at:

- `../applications/brief-studio/README.md`

Key sample entrypoints:

- authoring UI:
  - `../applications/brief-studio/ui/app.js`
- repo-local runnable UI bundle:
  - `../applications/brief-studio/ui/`
- generated importable UI bundle:
  - `../applications/brief-studio/dist/importable-package/applications/brief-studio/ui/`

## Related docs

- `../autobyteus-web/docs/application-bundle-iframe-contract-v1.md`
- `../autobyteus-web/docs/applications.md`
- `../autobyteus-application-sdk-contracts/README.md`
- `../autobyteus-application-backend-sdk/README.md`
