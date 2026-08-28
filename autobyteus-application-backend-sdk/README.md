# @autobyteus/application-backend-sdk

Backend helper package for application bundle backends executed by the AutoByteus application worker runtime.

## What it owns

- `defineApplication(...)`
- pure target-address builders for bound agents, whole teams, and static team members
- re-exported backend definition, handler, request, storage, notification, named context-capability, resource-slot, and execution-event types from `@autobyteus/application-sdk-contracts`


## External custom application guide

For new external applications, use `@autobyteus/application-devkit` and the guide in `../docs/custom-application-development.md`. The starter template writes backend source under `src/backend` and packages the generated runtime backend under `dist/importable-package/applications/<app-id>/backend`.

## Usage

```ts
import { defineApplication } from '@autobyteus/application-backend-sdk'

export default defineApplication({
  definitionContractVersion: '7',
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
  agentToolHandlers: {
    get_application_status: async (_args, context) => {
      const applicationId = context.caller.applicationId
      return {
        content: [{ type: 'text', text: `Application ${applicationId} is ready.` }],
        structuredContent: { applicationId, ready: true },
      }
    },
  },
})
```

## Application-owned agent tools

Declare each application-owned tool statically in the v5 `application.json`
`agentTools[]` array, then implement the exact same name in the v7 backend
definition's `agentToolHandlers` map. Missing, extra, or non-function handlers
make the application definition unready; declarations do not automatically
grant a tool to every run. The Agent or Team member definition must select the
tool name in its normal `toolNames` list.

Each handler receives the validated JSON-object arguments and the normal
`ApplicationHandlerContext` extended with immutable `context.caller` identity:
`applicationId`, `bindingId`, `agentRunId`, and an optional canonical
`memberAddress`. Those values come from the host-authorized application binding;
do not add routing identity to a tool's input schema or trust model-provided
identity fields.

Handlers return `ApplicationAgentToolResult`: MCP-safe `content`, optional
object `structuredContent`, and optional `isError`. The platform enforces the
declared portable schema and bounded JSON/result contract around the worker
call. A handler throw or worker transport failure becomes a sanitized tool
failure; the host does not automatically retry a possibly mutating call.

## Application agent target addresses

When backend business code already owns a precise binding and needs a reusable or projected address, prefer the matching typed builder:

```ts
import {
  createApplicationAgentTargetAddress,
  createApplicationAgentTeamMemberTargetAddress,
} from '@autobyteus/application-backend-sdk'

const agentAddress = createApplicationAgentTargetAddress(agentBinding)
const wholeTeamAddress = createApplicationAgentTargetAddress(teamBinding)
const reviewer = teamBinding.runtime.members.find(
  (member) => member.memberAddress === '/reviewer',
)
if (!reviewer) throw new Error('Reviewer is not part of this binding')

const reviewerAddress = createApplicationAgentTeamMemberTargetAddress(
  teamBinding,
  reviewer.memberAddress,
)
```

The builders return fresh canonical `ApplicationAgentTargetAddress` values and validate only local binding/target structure. The root builder accepts either an Agent or Team binding. The team-member builder accepts an exact canonical rooted `memberAddress` that is present in the Team binding. The builders do not expose or accept physical run IDs and do not decide application activity, binding liveness, runtime availability, or authorization. Application Orchestration performs those authoritative checks and is the sole logical-to-physical translator whenever an address is connected, observed, or sent to.

The shared address DTO remains directly constructible. Code that owns only a `bindingId` and immediately performs a one-shot send should not fetch a binding solely to use a builder:

```ts
await context.agentExecution.sendInput({
  address: {
    bindingId,
    memberAddress: null,
  },
  input: { text: 'Continue the team task.' },
})
```

## Bundle expectations

- The worker loads a self-contained ESM backend module.
- The exported definition contract version must be `"7"`; unsupported definitions are rejected before handler invocation.
- `agentToolHandlers` must exactly match the v5 manifest's declared
  `agentTools[]` names. Agent tools are not an eighth backend exposure flag;
  they are invoked only through the application-scoped execution capability.
- Exposed handlers must not exceed the bundle manifest’s `supportedExposures` flags.
- Optional `webSocketRoutes` require the bundle manifest's `webSockets` exposure flag and remain separate from standard agent communication.
- `backend/bundle.json` declares the backend entry module plus optional migrations/assets directories.
- `application.json` may declare `executionResourceSlots[]`; app backends should resolve launch resources through `context.agentResources.getConfigured(slotKey)` instead of hardcoded runtime targets.
- App code and manifests use `executionResourceRef` / `source` together with the `agentResources` capability.
- Launch-profile helpers normalize missing skill access to `PRELOADED_ONLY`, which means the selected agent or team member uses the skills configured on its definition. `NONE` is the only explicit no-skill override. `GLOBAL_DISCOVERY` is rejected; app-owned broad agents must be configured with the desired skill names instead of requesting all-installed skills at launch.
- `buildConfiguredTeamRunLaunch(...)` accepts optional transport-neutral `llmConfig`, clones it independently into the produced preset or member configs, and leaves host-saved runtime/model selection precedence unchanged.
- `artifactHandlers.persisted` is the live published-artifact callback. It is separate from lifecycle `eventHandlers`, which continue to receive only `RUN_*` journal envelopes.
- Applications that need guaranteed artifact catch-up should use `agentExecution.list(...)`, `publishedArtifacts.list(...)`, and `publishedArtifacts.readRevision(...)`, then apply their own idempotency keyed by `revisionId`.
- Application backends may observe a bound agent target through `agentExecution.subscribeEventStream(address, observer, options)` and send input through the same `ApplicationAgentTargetAddress` using `agentExecution.sendInput({ address, input })`.
- Backend observers receive the same minimal provider-neutral stream as frontend connections: `TURN_STARTED`, exact `TEXT_DELTA`, `TURN_COMPLETED`, `TURN_INTERRUPTED`, or safe `ERROR`; durable structured results continue through published artifacts.
- App-authored migrations run only against `app.sqlite`; platform-owned `platform.sqlite` remains reserved.

## Teaching samples

- `../applications/brief-studio/README.md`
- `../applications/socratic-math-teacher/README.md`
