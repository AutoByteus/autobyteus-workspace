# Application bundle iframe contract

This document describes the current iframe/bootstrap contract used by bundled applications.

The authoritative code owner for the runtime contract now lives in:

- `../../autobyteus-application-sdk-contracts/src/application-iframe-contract.ts`

## Key contract points

- the browser host owns launch readiness and iframe bootstrap
- the iframe app sends `autobyteus.application.ui.ready`
- the host replies with `autobyteus.application.host.bootstrap`
- bundle-side startup ownership belongs to `startHostedApplication(...)` in `@autobyteus/application-frontend-sdk`
- the bootstrap payload carries one authoritative hosted backend-mount URL: `transport.backendBaseUrl`
- app business APIs derive GraphQL, route, query, and command endpoints from `backendBaseUrl`
- only non-derivable channels such as `backendNotificationsUrl` are carried alongside it

## Bootstrap payload shape

```ts
export type ApplicationBootstrapPayloadV2 = {
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
    backendBaseUrl: string | null
    backendNotificationsUrl: string | null
  }
}
```

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
