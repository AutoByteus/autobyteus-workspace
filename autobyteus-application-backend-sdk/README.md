# @autobyteus/application-backend-sdk

Backend helper package for application bundle backends executed by the AutoByteus application worker runtime.

## What it owns

- `defineApplication(...)`
- re-exported backend definition, handler, request, storage, notification, runtime-control, resource-slot, and execution-event types from `@autobyteus/application-sdk-contracts`


## External custom application guide

For new external applications, use `@autobyteus/application-devkit` and the guide in `../docs/custom-application-development.md`. The starter template writes backend source under `src/backend` and packages the generated runtime backend under `dist/importable-package/applications/<app-id>/backend`.

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
  artifactHandlers: {
    persisted: async (artifact, appContext) => {
      const published = await appContext.runtimeControl.getRunPublishedArtifacts(artifact.runId)
      await appContext.publishNotification('artifact-observed', {
        artifactId: artifact.artifactId,
        revisionId: artifact.revisionId,
        publishedCount: published.length,
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
- `application.json` may declare `resourceSlots[]`; app backends should resolve launch resources through `context.runtimeControl.getConfiguredResource(slotKey)` instead of hardcoded runtime targets.
- `artifactHandlers.persisted` is the live published-artifact callback. It is separate from lifecycle `eventHandlers`, which continue to receive only `RUN_*` journal envelopes.
- Applications that need guaranteed artifact catch-up should use `runtimeControl.listRunBindings(...)`, `getRunPublishedArtifacts(...)`, and `getPublishedArtifactRevisionText(...)`, then apply their own idempotency keyed by `revisionId`.
- App-authored migrations run only against `app.sqlite`; platform-owned `platform.sqlite` remains reserved.

## Teaching samples

- `../applications/brief-studio/README.md`
- `../applications/socratic-math-teacher/README.md`
