# @autobyteus/application-backend-sdk

Backend helper package for application bundle backends executed by the AutoByteus application worker runtime.

## What it owns

- `defineApplication(...)`
- re-exported backend definition, handler, request, storage, notification, named context-capability, resource-slot, and execution-event types from `@autobyteus/application-sdk-contracts`


## External custom application guide

For new external applications, use `@autobyteus/application-devkit` and the guide in `../docs/custom-application-development.md`. The starter template writes backend source under `src/backend` and packages the generated runtime backend under `dist/importable-package/applications/<app-id>/backend`.

## Usage

```ts
import { defineApplication } from '@autobyteus/application-backend-sdk'

export default defineApplication({
  definitionContractVersion: '3',
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
      const published = await appContext.publishedArtifacts.list(artifact.runId)
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
- The exported definition contract version must be `"3"`; v2 definitions are rejected before handler invocation.
- Exposed handlers must not exceed the bundle manifest’s `supportedExposures` flags.
- `backend/bundle.json` declares the backend entry module plus optional migrations/assets directories.
- `application.json` may declare `executionResourceSlots[]`; app backends should resolve launch resources through `context.agentResources.getConfigured(slotKey)` instead of hardcoded runtime targets.
- App code and manifests use `executionResourceRef` / `source` together with the `agentResources` capability.
- Launch-profile helpers normalize missing skill access to `PRELOADED_ONLY`, which means the selected agent or team member uses the skills configured on its definition. `NONE` is the only explicit no-skill override. `GLOBAL_DISCOVERY` is rejected; app-owned broad agents must be configured with the desired skill names instead of requesting all-installed skills at launch.
- `artifactHandlers.persisted` is the live published-artifact callback. It is separate from lifecycle `eventHandlers`, which continue to receive only `RUN_*` journal envelopes.
- Applications that need guaranteed artifact catch-up should use `agentExecution.list(...)`, `publishedArtifacts.list(...)`, and `publishedArtifacts.readRevision(...)`, then apply their own idempotency keyed by `revisionId`.
- App-authored migrations run only against `app.sqlite`; platform-owned `platform.sqlite` remains reserved.

## Teaching samples

- `../applications/brief-studio/README.md`
- `../applications/socratic-math-teacher/README.md`
