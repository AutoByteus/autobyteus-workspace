# Application bundle iframe contract v3

This document describes the current iframe/bootstrap contract used by bundled applications.

The authoritative runtime contract lives in:

- `../../autobyteus-application-sdk-contracts/src/application-iframe-contract.ts`

## Key contract points

- the browser host owns launch readiness and iframe bootstrap
- each route entry/reload gets one ephemeral `iframeLaunchId` for iframe bootstrap correlation only
- the iframe app sends `autobyteus.application.ui.ready`
- the host replies with `autobyteus.application.host.bootstrap`
- bundle-side startup ownership belongs to `startHostedApplication(...)` in `@autobyteus/application-frontend-sdk`
- the bootstrap payload carries one authoritative hosted backend-mount URL: `transport.backendBaseUrl`
- app business APIs derive GraphQL, route, query, and command endpoints from `backendBaseUrl`
- normal app backend request context contains only the durable `applicationId`

## URL launch hints

The host appends these query hints to the bundle entry HTML URL:

- `autobyteusContractVersion=3`
- `autobyteusApplicationId=<application id>`
- `autobyteusIframeLaunchId=<ephemeral iframe bootstrap id>`
- `autobyteusHostOrigin=<normalized host origin>`

## Bootstrap payload shape

```ts
export type ApplicationBootstrapPayloadV3 = {
  host: {
    origin: string
  }
  application: {
    applicationId: string
    localApplicationId: string
    packageId: string
    name: string
  }
  iframeLaunchId: string
  requestContext: {
    applicationId: string
  }
  transport: {
    backendBaseUrl: string | null
    backendNotificationsUrl: string | null
  }
}
```

The payload intentionally does **not** contain a platform-owned execution id, app session id, or prelaunched runtime summary. `iframeLaunchId` is not a durable app instance, run, or business identity.

## Local dev bootstrap

External app authors can test this same v3 startup path through
`@autobyteus/application-devkit`:

```bash
autobyteus-app dev
```

The dev host appends the same v3 query hints, waits for
`autobyteus.application.ui.ready`, and posts
`autobyteus.application.host.bootstrap` so app-authored frontend code can keep
using `startHostedApplication(...)` unchanged in local dev and production.

## Frontend usage pattern

```ts
import {
  startHostedApplication,
} from '@autobyteus/application-frontend-sdk'

startHostedApplication({
  rootElement: document.getElementById('app-root'),
  onBootstrapped: ({ bootstrap, applicationClient, rootElement }) => {
    rootElement.textContent = `Started ${bootstrap.application.name}`
    void applicationClient.graphql({
      query: 'query HealthQuery { __typename }',
      operationName: 'HealthQuery',
    })
  },
})
```

## Teaching samples

- `applications/brief-studio/`
- `applications/socratic-math-teacher/`

## Related docs

- [`../../docs/custom-application-development.md`](../../docs/custom-application-development.md)
