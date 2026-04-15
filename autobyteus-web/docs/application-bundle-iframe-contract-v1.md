# Application Bundle Iframe Contract v1

This document defines the exact v1 bootstrap contract between the host application page and a bundled application UI loaded inside an iframe.

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

- `contractVersion`: `"1"`
- v1 is the only supported version in this slice.
- Incompatible changes require a new versioned contract instead of silently changing v1.

## Recommended layering

The raw iframe bootstrap is the lowest-level host handoff only.

Recommended author-facing usage on top of that bootstrap:

- use `@autobyteus/application-frontend-sdk` in the iframe app to call app backend queries, commands, GraphQL, and notifications through the host-provided transport URLs,
- use `@autobyteus/application-backend-sdk` in `backend/dist/**` to export the typed backend definition, and
- treat `@autobyteus/application-sdk-contracts` as the shared source of manifest, request-context, storage-context, notification, and event-dispatch types.

## Host-resolved iframe launch URL

The backend catalog returns transport-neutral asset paths such as:

```text
/application-bundles/<application-id>/assets/ui/index.html
```

The host resolves that path against the currently bound backend REST base, then appends the required v1 launch hints.

Exact query-hint names:

- `autobyteusContractVersion`
- `autobyteusApplicationSessionId`
- `autobyteusLaunchInstanceId`
- `autobyteusHostOrigin`

`autobyteusHostOrigin` is:

- the exact `window.location.origin` string for non-opaque hosts
- the literal string `"file://"` for packaged `file://` hosts

## Shared envelope

All v1 messages use this envelope:

```ts
{
  channel: 'autobyteus.application.host'
  contractVersion: '1'
  eventName: string
  payload: Record<string, unknown>
}
```

## Child → host ready event

Bundled iframe UIs must signal readiness by posting this exact message:

```json
{
  "channel": "autobyteus.application.host",
  "contractVersion": "1",
  "eventName": "autobyteus.application.ui.ready",
  "payload": {
    "applicationSessionId": "app-session-123",
    "launchInstanceId": "app-session-123::launch-1"
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
- `contractVersion === '1'`
- `eventName === 'autobyteus.application.ui.ready'`
- `payload.applicationSessionId === launched application session id`
- `payload.launchInstanceId === launched launch instance id`

## Host → child bootstrap event

After the host receives one valid ready event, it sends this exact bootstrap message to the iframe using target origin equal to the resolved iframe origin.

```json
{
  "channel": "autobyteus.application.host",
  "contractVersion": "1",
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
    "session": {
      "applicationSessionId": "app-session-123",
      "launchInstanceId": "app-session-123::launch-1"
    },
    "runtime": {
      "kind": "AGENT_TEAM",
      "runId": "team-run-456",
      "definitionId": "bundle-team__example-package__example-app__example-team"
    },
    "transport": {
      "graphqlUrl": "http://localhost:3000/graphql",
      "restBaseUrl": "http://localhost:3000/rest",
      "websocketUrl": "ws://localhost:3000/graphql",
      "sessionStreamUrl": "ws://localhost:3000/ws/application-session",
      "backendStatusUrl": "http://localhost:3000/rest/applications/bundle-app__example-package__example-app/backend/status",
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
  session: {
    applicationSessionId: string
    launchInstanceId: string
  }
  runtime: {
    kind: 'AGENT' | 'AGENT_TEAM'
    runId: string
    definitionId: string
  }
  transport: {
    graphqlUrl: string
    restBaseUrl: string
    websocketUrl: string
    sessionStreamUrl: string
    backendStatusUrl: string | null
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
- `sessionStreamUrl` remains the host-owned retained-session snapshot stream base.
- `backend*` URLs are the application-scoped backend boundary for queries, commands, routes, GraphQL, engine status, and backend notifications.
- In launched application pages the host currently populates the `backend*` URLs; the nullable type exists so the shared transport shape can still be reused before an application is bound.

### Child-side acceptance rules

Bundled UIs should read the launch hints from the iframe URL query and accept bootstrap only when all of the following are true:

- `event.source === window.parent`
- `event.origin` matches the normalized `autobyteusHostOrigin` rule (`file://` accepts packaged `null` events)
- `channel === 'autobyteus.application.host'`
- `contractVersion === '1'`
- `eventName === 'autobyteus.application.host.bootstrap'`
- `payload.session.applicationSessionId === autobyteusApplicationSessionId`
- `payload.session.launchInstanceId === autobyteusLaunchInstanceId`
- `payload.host.origin === autobyteusHostOrigin`

## Minimal bootstrap handling example

```html
<script>
  const params = new URLSearchParams(window.location.search)
  const applicationSessionId = params.get('autobyteusApplicationSessionId')
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
      contractVersion: '1',
      eventName: 'autobyteus.application.ui.ready',
      payload: { applicationSessionId, launchInstanceId },
    },
    '*',
  )

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return
    if (!matchesHostOrigin(hostOrigin, event.origin)) return
    const message = event.data
    if (!message || message.channel !== 'autobyteus.application.host') return
    if (message.contractVersion !== '1') return
    if (message.eventName !== 'autobyteus.application.host.bootstrap') return
    if (message.payload?.session?.applicationSessionId !== applicationSessionId) return
    if (message.payload?.session?.launchInstanceId !== launchInstanceId) return
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
    applicationId: payload.application.applicationId,
    applicationSessionId: payload.session.applicationSessionId,
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
  },
})
```

## Failure behavior

- The host waits `10_000` ms from iframe load for a valid ready event.
- Invalid asset resolution or a missing bound REST base fails immediately.
- Unsupported versions fail immediately.
- Invalid origin, invalid source, wrong channel, wrong event name, malformed payloads, or mismatched session bindings are ignored.
- If no valid ready event arrives before timeout, bootstrap fails.
- On failure, the host keeps ownership of the error UI and does not send partial bootstrap payloads.
- v1 defines no host-to-child error event.

## Stability rule

`ApplicationIframeContract.ts`, `ApplicationIframeHost.vue`, the SDK packages, and this document together define the public v1 application bootstrap contract. Keep them aligned exactly.
