# Application Bundle Iframe Contract v1

This document defines the exact v1 bootstrap contract between the host application page and a bundled application UI loaded inside an iframe.

## Contract ownership

- Shared constants/types: `autobyteus-web/types/application/ApplicationIframeContract.ts`
- Host runtime implementation: `autobyteus-web/components/applications/ApplicationIframeHost.vue`
- This document is the human-facing reference for bundled application authors.

Do not introduce alternate event names, duplicate schemas, or inline literals outside the shared contract file.

## Version

- `contractVersion`: `"1"`
- v1 is the only supported version in this slice.
- Incompatible changes require a new versioned contract instead of silently changing v1.

## Host-resolved iframe launch URL

The backend catalog returns transport-neutral asset paths such as:

```text
/application-bundles/<application-id>/assets/ui/index.html
```

The host resolves that path against the currently bound backend REST base, then appends the required v1 launch hints.

Exact query-hint names:

- `autobyteusContractVersion`
- `autobyteusApplicationSessionId`
- `autobyteusHostOrigin`

`autobyteusHostOrigin` is:

- the exact `window.location.origin` string for non-opaque hosts
- the literal string `"null"` for packaged `file://` hosts

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
    "applicationSessionId": "app-session-123"
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

## Host → child bootstrap event

After the host receives one valid ready event, it sends this exact bootstrap message to the iframe using target origin equal to the resolved iframe origin.

```json
{
  "channel": "autobyteus.application.host",
  "contractVersion": "1",
  "eventName": "autobyteus.application.host.bootstrap",
  "payload": {
    "host": {
      "origin": "null"
    },
    "application": {
      "applicationId": "bundle-app__example-package__example-app",
      "localApplicationId": "example-app",
      "packageId": "example-package",
      "name": "Example App"
    },
    "session": {
      "applicationSessionId": "app-session-123"
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
      "sessionStreamUrl": "ws://localhost:3000/ws/application-session"
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
  }
}
```

### Child-side acceptance rules

Bundled UIs should read the launch hints from the iframe URL query and accept bootstrap only when all of the following are true:

- `event.source === window.parent`
- `event.origin === autobyteusHostOrigin`
- `channel === 'autobyteus.application.host'`
- `contractVersion === '1'`
- `eventName === 'autobyteus.application.host.bootstrap'`
- `payload.session.applicationSessionId === autobyteusApplicationSessionId`
- `payload.host.origin === autobyteusHostOrigin`

## Failure behavior

- The host waits `10_000` ms from iframe load for a valid ready event.
- Invalid asset resolution or a missing bound REST base fails immediately.
- Unsupported versions fail immediately.
- Invalid origin, invalid source, wrong channel, wrong event name, malformed payloads, or mismatched session bindings are ignored.
- If no valid ready event arrives before timeout, bootstrap fails.
- On failure, the host keeps ownership of the error UI and does not send partial bootstrap payloads.
- v1 defines no host-to-child error event.

## Minimal bundled UI example

```html
<script>
  const params = new URLSearchParams(window.location.search)
  const applicationSessionId = params.get('autobyteusApplicationSessionId')
  const hostOrigin = params.get('autobyteusHostOrigin')

  window.parent.postMessage(
    {
      channel: 'autobyteus.application.host',
      contractVersion: '1',
      eventName: 'autobyteus.application.ui.ready',
      payload: { applicationSessionId },
    },
    '*',
  )

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return
    if (event.origin !== hostOrigin) return
    const message = event.data
    if (!message || message.channel !== 'autobyteus.application.host') return
    if (message.contractVersion !== '1') return
    if (message.eventName !== 'autobyteus.application.host.bootstrap') return
    if (message.payload?.session?.applicationSessionId !== applicationSessionId) return
    if (message.payload?.host?.origin !== hostOrigin) return

    console.log('Application bootstrap received:', message.payload)
  })
</script>
```

## Stability rule

`ApplicationIframeContract.ts`, `ApplicationIframeHost.vue`, and this document together define the public v1 contract. Keep them aligned exactly.
