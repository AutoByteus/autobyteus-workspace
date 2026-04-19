# Application Bundle Iframe Contract

This document defines the current bundled-application iframe bootstrap contract between the host Applications module and a bundled application UI loaded inside an iframe.

> Historical note: the filename is legacy, but the content below documents the current v2 contract.

## Contract ownership

- Shared contract package: `@autobyteus/application-sdk-contracts`
- Frontend helper package: `@autobyteus/application-frontend-sdk`
- Backend helper package: `@autobyteus/application-backend-sdk`
- Host launch owner: `autobyteus-web/components/applications/ApplicationSurface.vue`
- Host iframe bridge: `autobyteus-web/components/applications/ApplicationIframeHost.vue`
- Shared host-side types/constants: `autobyteus-web/types/application/ApplicationIframeContract.ts`
- This document is the human-facing bootstrap reference for bundled application authors.

Do not introduce alternate event names, duplicate schemas, or inline literals outside the shared contract/type owners.

## Version

- `contractVersion`: `"2"`
- incompatible changes require a new versioned contract instead of silently changing v2

## Recommended layering

The raw iframe bootstrap is the lowest-level host handoff only.

Recommended author-facing usage on top of that bootstrap:

- use `@autobyteus/application-frontend-sdk` in the iframe app to call app backend queries, commands, GraphQL, and notifications through the host-provided transport URLs
- use `@autobyteus/application-backend-sdk` in the backend bundle to export the typed backend definition
- treat `@autobyteus/application-sdk-contracts` as the shared source of manifest, request-context, storage-context, notification, runtime-control, and execution-event types

## Host-resolved iframe launch URL

The backend catalog returns transport-neutral asset paths such as:

```text
/application-bundles/<application-id>/assets/ui/index.html
```

The host resolves that path against the currently bound backend REST base, then appends the required v2 launch hints.

Exact query-hint names:

- `autobyteusContractVersion`
- `autobyteusApplicationId`
- `autobyteusLaunchInstanceId`
- `autobyteusHostOrigin`

`autobyteusHostOrigin` is:

- the exact `window.location.origin` string for non-opaque hosts
- the literal string `"file://"` for packaged `file://` hosts

## Shared envelope

All v2 messages use this envelope:

```ts
{
  channel: 'autobyteus.application.host'
  contractVersion: '2'
  eventName: string
  payload: Record<string, unknown>
}
```

## Child → host ready event

Bundled iframe UIs must signal readiness by posting this exact message:

```json
{
  "channel": "autobyteus.application.host",
  "contractVersion": "2",
  "eventName": "autobyteus.application.ui.ready",
  "payload": {
    "applicationId": "bundle-app__example-package__example-app",
    "launchInstanceId": "bundle-app__example-package__example-app::launch-1"
  }
}
```

### Send rules

- The child posts the ready event to `window.parent`.
- The child uses target origin `"*"` because packaged `file://` hosts have an opaque origin and cannot be targeted precisely.

### Acceptance rules

The host accepts the ready event only when all of the following are true:

- `event.origin === resolved iframe origin`
- `event.source === iframe.contentWindow`
- `channel === 'autobyteus.application.host'`
- `contractVersion === '2'`
- `eventName === 'autobyteus.application.ui.ready'`
- `payload.applicationId === launched application id`
- `payload.launchInstanceId === launched launch instance id`

## Host → child bootstrap event

After the host receives one valid ready event, it sends this bootstrap message to the iframe using target origin equal to the resolved iframe origin.

```json
{
  "channel": "autobyteus.application.host",
  "contractVersion": "2",
  "eventName": "autobyteus.application.host.bootstrap",
  "payload": {
    "host": {
      "origin": "file://"
    },
    "application": {
      "applicationId": "bundle-app__example-package__example-app",
      "localApplicationId": "example-app",
      "packageId": "example-package",
      "name": "Example App"
    },
    "launch": {
      "launchInstanceId": "bundle-app__example-package__example-app::launch-1"
    },
    "requestContext": {
      "applicationId": "bundle-app__example-package__example-app",
      "launchInstanceId": "bundle-app__example-package__example-app::launch-1"
    },
    "transport": {
      "graphqlUrl": "http://localhost:3000/graphql",
      "restBaseUrl": "http://localhost:3000/rest",
      "websocketUrl": "ws://localhost:3000/graphql",
      "backendStatusUrl": "http://localhost:3000/rest/applications/bundle-app__example-package__example-app/backend/status",
      "backendEnsureReadyUrl": "http://localhost:3000/rest/applications/bundle-app__example-package__example-app/backend/ensure-ready",
      "backendQueriesBaseUrl": "http://localhost:3000/rest/applications/bundle-app__example-package__example-app/backend/queries",
      "backendCommandsBaseUrl": "http://localhost:3000/rest/applications/bundle-app__example-package__example-app/backend/commands",
      "backendGraphqlUrl": "http://localhost:3000/rest/applications/bundle-app__example-package__example-app/backend/graphql",
      "backendRoutesBaseUrl": "http://localhost:3000/rest/applications/bundle-app__example-package__example-app/backend/routes",
      "backendNotificationsUrl": "ws://localhost:3000/ws/applications/bundle-app__example-package__example-app/backend/notifications"
    }
  }
}
```

### Payload schema

```ts
{
  host: {
    origin: string
  }
  application: {
    applicationId: string
    localApplicationId: string
    packageId: string
    name: string
  }
  launch: {
    launchInstanceId: string
  }
  requestContext: {
    applicationId: string
    launchInstanceId: string
  }
  transport: {
    graphqlUrl: string
    restBaseUrl: string
    websocketUrl: string
    backendStatusUrl: string | null
    backendEnsureReadyUrl: string | null
    backendQueriesBaseUrl: string | null
    backendCommandsBaseUrl: string | null
    backendGraphqlUrl: string | null
    backendRoutesBaseUrl: string | null
    backendNotificationsUrl: string | null
  }
}
```

### Transport meaning

- `graphqlUrl`, `restBaseUrl`, and `websocketUrl` remain host/runtime endpoints.
- `backend*` URLs are the application-scoped backend boundary for status, ensure-ready, queries, commands, routes, GraphQL, and notifications.
- the route `applicationId` is already embedded in those backend URLs and remains authoritative.

### Child-side acceptance rules

Bundled UIs should read the launch hints from the iframe URL query and accept bootstrap only when all of the following are true:

- `event.source === window.parent`
- `event.origin` matches the normalized `autobyteusHostOrigin` rule (`file://` accepts packaged `null` events)
- `channel === 'autobyteus.application.host'`
- `contractVersion === '2'`
- `eventName === 'autobyteus.application.host.bootstrap'`
- `payload.application.applicationId === autobyteusApplicationId`
- `payload.launch.launchInstanceId === autobyteusLaunchInstanceId`
- `payload.host.origin === autobyteusHostOrigin`

## Minimal bootstrap handling example

```html
<script>
  const params = new URLSearchParams(window.location.search)
  const applicationId = params.get('autobyteusApplicationId')
  const launchInstanceId = params.get('autobyteusLaunchInstanceId')
  const hostOrigin = params.get('autobyteusHostOrigin')
  const matchesHostOrigin = (expectedOrigin, actualOrigin) => (
    expectedOrigin === 'file://'
      ? actualOrigin === 'file://' || actualOrigin === 'null'
      : actualOrigin === expectedOrigin
  )

  window.parent.postMessage(
    {
      channel: 'autobyteus.application.host',
      contractVersion: '2',
      eventName: 'autobyteus.application.ui.ready',
      payload: { applicationId, launchInstanceId },
    },
    '*',
  )

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return
    if (!matchesHostOrigin(hostOrigin, event.origin)) return
    const message = event.data
    if (!message || message.channel !== 'autobyteus.application.host') return
    if (message.contractVersion !== '2') return
    if (message.eventName !== 'autobyteus.application.host.bootstrap') return
    if (message.payload?.application?.applicationId !== applicationId) return
    if (message.payload?.launch?.launchInstanceId !== launchInstanceId) return
    if (message.payload?.host?.origin !== hostOrigin) return

    console.log('Application bootstrap received:', message.payload)
  })
</script>
```

## Minimal frontend SDK wiring example

```ts
import { createApplicationClient } from '@autobyteus/application-frontend-sdk'

const client = createApplicationClient({
  applicationId: payload.application.applicationId,
  requestContext: {
    applicationId: payload.requestContext.applicationId,
    launchInstanceId: payload.requestContext.launchInstanceId,
  },
  transport: {
    invokeQuery: async ({ queryName, requestContext, input }) => {
      const response = await fetch(`${payload.transport.backendQueriesBaseUrl}/${encodeURIComponent(queryName)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ requestContext, input }),
      })
      const json = await response.json()
      return json.result
    },
    invokeCommand: async ({ commandName, requestContext, input }) => {
      const response = await fetch(`${payload.transport.backendCommandsBaseUrl}/${encodeURIComponent(commandName)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ requestContext, input }),
      })
      const json = await response.json()
      return json.result
    },
    executeGraphql: async ({ requestContext, request }) => {
      const response = await fetch(payload.transport.backendGraphqlUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ requestContext, request }),
      })
      const json = await response.json()
      return json.result
    },
    subscribeNotifications: ({ listener }) => {
      const socket = new WebSocket(payload.transport.backendNotificationsUrl)
      socket.addEventListener('message', (event) => {
        const message = JSON.parse(String(event.data))
        if (message?.type === 'notification' && message.notification) {
          listener(message.notification)
        }
      })
      return { close: () => socket.close() }
    },
  },
})
```

## Request-context meaning

`requestContext` is about request source identity from the iframe host boundary:

- `applicationId` is required
- `launchInstanceId` is optional but normally preserved for browser-launch correlation

It is **not** a business identifier and should not replace app-owned concepts such as `executionRef`.
