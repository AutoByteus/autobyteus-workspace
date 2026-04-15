# @autobyteus/application-backend-sdk

Backend helper package for application bundle backends executed by the AutoByteus application worker runtime.

## What it owns

- `defineApplication(...)`
- re-exported backend definition, handler, request, storage, notification, and event-dispatch types from `@autobyteus/application-sdk-contracts`

## Usage

```ts
import { defineApplication } from '@autobyteus/application-backend-sdk'

export default defineApplication({
  definitionContractVersion: '1',
  queries: {
    status: async (_input, context) => ({
      applicationId: context.requestContext?.applicationId ?? null,
      appDatabasePath: context.storage.appDatabasePath,
    }),
  },
  commands: {
    ping: async (input) => ({ ok: true, input }),
  },
  routes: [
    {
      method: 'GET',
      path: '/hello/:name',
      handler: async (request) => ({
        message: `hello ${request.params.name}`,
      }),
    },
  ],
  graphql: {
    execute: async ({ query }) => ({ queryLength: query.length }),
  },
  eventHandlers: {
    progress: async (envelope, context) => {
      // app-owned side effects should be idempotent by envelope.event.eventId
      await context.publishNotification('progress-observed', {
        eventId: envelope.event.eventId,
        family: envelope.event.family,
      })
    },
  },
})
```

## Bundle expectations

- The worker loads a self-contained ESM backend module.
- The exported definition contract version must be `"1"`.
- Exposed handlers must not exceed the bundle manifest’s `supportedExposures` flags.
- `backend/bundle.json` declares the backend entry module plus optional migrations/assets directories.
- App-authored migrations run only against `app.sqlite`; platform-owned `platform.sqlite` remains reserved.

## Handler context reminders

- `context.requestContext` is `null` only for lifecycle hooks.
- `context.storage` exposes the platform-created storage layout for the current app.
- `context.publishNotification(...)` throws if the backend manifest disabled notifications.
- Event handlers receive `AT_LEAST_ONCE` delivery envelopes. Use stable `eventId` for idempotency.

## Teaching sample

The canonical authoring example for this package lives at:

- `../applications/brief-studio/README.md`

Key sample entrypoints:

- authoring backend source:
  - `../applications/brief-studio/backend-src/index.ts`
- projection owner:
  - `../applications/brief-studio/backend-src/services/brief-projection-service.ts`
- repo-local runnable backend bundle:
  - `../applications/brief-studio/backend/`
- generated importable backend bundle:
  - `../applications/brief-studio/dist/importable-package/applications/brief-studio/backend/`

## Related docs

- `../autobyteus-server-ts/docs/modules/application_backend_gateway.md`
- `../autobyteus-server-ts/docs/modules/application_engine.md`
- `../autobyteus-server-ts/docs/modules/application_storage.md`
- `../autobyteus-server-ts/docs/modules/application_sessions.md`
- `../autobyteus-web/docs/application-bundle-iframe-contract-v1.md`
- `../autobyteus-application-sdk-contracts/README.md`
- `../autobyteus-application-frontend-sdk/README.md`
