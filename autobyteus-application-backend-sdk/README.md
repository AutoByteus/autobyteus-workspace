# @autobyteus/application-backend-sdk

Backend helper package for application bundle backends executed by the AutoByteus application worker runtime.

## What it owns

- `defineApplication(...)`
- re-exported backend definition, handler, request, storage, notification, runtime-control, and execution-event types from `@autobyteus/application-sdk-contracts`

## Usage

```ts
import { defineApplication } from '@autobyteus/application-backend-sdk'

export default defineApplication({
  definitionContractVersion: '2',
  graphql: {
    execute: async (request, context) => {
      if (request.operationName === 'StatusQuery') {
        return {
          data: {
            status: {
              applicationId: context.requestContext?.applicationId ?? null,
              launchInstanceId: context.requestContext?.launchInstanceId ?? null,
            },
          },
        }
      }
      return {
        data: null,
        errors: [{ message: `Unsupported operation ${request.operationName}` }],
      }
    },
  },
  eventHandlers: {
    artifact: async (envelope, appContext) => {
      await appContext.publishNotification('artifact-observed', {
        eventId: envelope.event.eventId,
        family: envelope.event.family,
      })
    },
  },
})
```

## Bundle expectations

- The worker loads a self-contained ESM backend module.
- The exported definition contract version must be `"2"`.
- Exposed handlers must not exceed the bundle manifest’s `supportedExposures` flags.
- `backend/bundle.json` declares the backend entry module plus optional migrations/assets directories.
- App-authored migrations run only against `app.sqlite`; platform-owned `platform.sqlite` remains reserved.

## Teaching samples

- `../applications/brief-studio/README.md`
- `../applications/socratic-math-teacher/README.md`
