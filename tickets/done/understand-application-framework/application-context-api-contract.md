# Application Backend Context API Contract — Naming Refactor

**Status:** Approved requirements supplement
**Approval basis:** User approved the narrowed naming-refactor ticket and the `launchRequestId` terminology on 2026-07-20, then clarified that the application feature is unreleased/under development and must have one forward-only code path with no migration or backward compatibility.
**Scope:** Intended public application-backend handler-context shape and exact clean-cut mapping.
**Does not define:** Runtime-output streaming, frontend transport, or changes to execution/artifact behavior.

## Target Context Shape

```text
ApplicationHandlerContext
├── requestContext
├── storage
├── publishNotification(...)
├── agentExecution
│   ├── startAgent(...)
│   ├── startAgentTeam(...)
│   ├── sendInput(...)
│   ├── terminate(...)
│   ├── get(...)
│   ├── list(...)
│   └── findByLaunchRequestId(...)
├── agentResources
│   ├── listAvailable(...)
│   └── getConfigured(...)
└── publishedArtifacts
    ├── list(...)
    └── readRevision(...)
```

`runtimeControl` is not present in the target context.

## Target Type Shape

The following TypeScript is normative for names and responsibility allocation;
the design spec may factor declarations into focused files without changing the
public shape.

```ts
export type ApplicationStartAgentInput = {
  launchRequestId: string;
  executionResourceRef: ApplicationExecutionResourceRef;
  launch: ApplicationAgentRunLaunch;
  initialInput?: ApplicationRuntimeInput | null;
};

export type ApplicationStartAgentTeamInput = {
  launchRequestId: string;
  executionResourceRef: ApplicationExecutionResourceRef;
  launch: ApplicationTeamRunLaunch;
  initialInput?: ApplicationRuntimeInput | null;
};

export type ApplicationAgentExecution = {
  startAgent: (
    input: ApplicationStartAgentInput,
  ) => Promise<ApplicationRunBindingSummary>;
  startAgentTeam: (
    input: ApplicationStartAgentTeamInput,
  ) => Promise<ApplicationRunBindingSummary>;
  sendInput: (input: {
    bindingId: string;
    text: string;
    targetMemberRouteKey?: string | null;
    targetMemberPath?: string[] | null;
    contextFiles?: ApplicationRuntimeInputContextFile[] | null;
    metadata?: Record<string, unknown> | null;
  }) => Promise<ApplicationRunBindingSummary>;
  terminate: (
    bindingId: string,
  ) => Promise<ApplicationRunBindingSummary | null>;
  get: (
    bindingId: string,
  ) => Promise<ApplicationRunBindingSummary | null>;
  list: (
    filter?: ApplicationRunBindingListFilter | null,
  ) => Promise<ApplicationRunBindingSummary[]>;
  findByLaunchRequestId: (
    launchRequestId: string,
  ) => Promise<ApplicationRunBindingSummary | null>;
};

export type ApplicationAgentResources = {
  listAvailable: (filter?: {
    source?: ApplicationExecutionResourceSource | null;
    kind?: ApplicationExecutionResourceKind | null;
  } | null) => Promise<ApplicationExecutionResourceSummary[]>;
  getConfigured: (
    slotKey: string,
  ) => Promise<ApplicationConfiguredExecutionResource | null>;
};

export type ApplicationPublishedArtifactSummary = {
  id: string;
  runId: string;
  path: string;
  type: ApplicationPublishedArtifactFileKind;
  status: "available";
  description: string | null;
  revisionId: string;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationPublishedArtifacts = {
  list: (runId: string) => Promise<ApplicationPublishedArtifactSummary[]>;
  readRevision: (input: {
    runId: string;
    revisionId: string;
  }) => Promise<string | null>;
};

export type ApplicationHandlerContext = {
  requestContext: ApplicationRequestContext | null;
  storage: ApplicationStorageContext;
  publishNotification: (topic: string, payload: unknown) => Promise<void>;
  agentExecution: ApplicationAgentExecution;
  agentResources: ApplicationAgentResources;
  publishedArtifacts: ApplicationPublishedArtifacts;
};
```

`ApplicationRunBindingSummary` remains the returned binding model in this
ticket, but its correlation field changes cleanly from `bindingIntentId` to
`launchRequestId`.

`ApplicationPublishedArtifactSummary` names and exports the exact item shape
currently returned inline by `getRunPublishedArtifacts`. This extraction does
not add, remove, or reinterpret any artifact field; the backend SDK must
re-export it and generated declarations must be rebuilt from the contract.

## Exact Public Mapping

| Removed Public API | Target Public API | Semantic Outcome |
| --- | --- | --- |
| `runtimeControl.startRun(...)` with `launch.kind === "AGENT"` | `agentExecution.startAgent(...)` | Starts one standalone agent and returns its application binding. |
| `runtimeControl.startRun(...)` with `launch.kind === "AGENT_TEAM"` | `agentExecution.startAgentTeam(...)` | Starts one agent team and returns its application binding. |
| `runtimeControl.postRunInput(...)` | `agentExecution.sendInput(...)` | Sends text/context to the binding, optionally targeting a team member. |
| `runtimeControl.terminateRunBinding(...)` | `agentExecution.terminate(...)` | Terminates the bound execution and returns the updated binding or `null`. |
| `runtimeControl.getRunBinding(...)` | `agentExecution.get(...)` | Returns the application-owned binding by `bindingId` or `null`. |
| `runtimeControl.listRunBindings(...)` | `agentExecution.list(...)` | Lists application-owned bindings with the existing optional status filter. |
| `runtimeControl.getRunBindingByIntentId(...)` | `agentExecution.findByLaunchRequestId(...)` | Recovers/correlates a binding from a caller-generated launch request ID. |
| `runtimeControl.listAvailableExecutionResources(...)` | `agentResources.listAvailable(...)` | Lists permitted agent and agent-team resources. |
| `runtimeControl.getConfiguredExecutionResource(...)` | `agentResources.getConfigured(...)` | Resolves one configured resource slot. |
| `runtimeControl.getRunPublishedArtifacts(...)` | `publishedArtifacts.list(...)` | Lists durable published artifacts for an application-owned run. |
| `runtimeControl.getPublishedArtifactRevisionText(...)` | `publishedArtifacts.readRevision(...)` | Reads one published artifact revision as text. |

## Launch Request Identity

`launchRequestId` is an application-generated, non-empty, unique correlation
identifier for one request to launch an agent or agent team.

It exists because application state and platform binding state are stored in
separate databases and cannot be committed in one transaction. The supported
recovery sequence is:

```text
application persists PendingLaunchRequest(launchRequestId, businessObjectId)
  -> application calls startAgent/startAgentTeam(launchRequestId, ...)
  -> platform creates and persists binding(bindingId, launchRequestId)
  -> application persists bindingId on its business object
```

If the last handoff is interrupted after the platform persisted the binding,
the application calls:

```ts
await context.agentExecution.findByLaunchRequestId(launchRequestId)
```

and completes its application-owned correlation.

The identifier is not an LLM/user intent, not the application process launch,
not the resulting `bindingId`, and not the runtime `runId`. It is also not a
promise that repeating `startAgent` or `startAgentTeam` is idempotent; callers
must use `findByLaunchRequestId` to resolve an ambiguous completed handoff before
deciding whether another launch is appropriate.

## Clean-Cut Rules

- Remove the `ApplicationRuntimeControl` public type.
- Remove `ApplicationHandlerContext.runtimeControl`.
- Remove public/current documentation using `runtimeControl` terminology.
- Rename public/current `bindingIntentId` terminology to `launchRequestId`.
- Rename built-in application `PendingBindingIntent` concepts to
  `PendingLaunchRequest`.
- Do not provide aliases, dual properties, dual-read runtime branches, or
  deprecated forwarding methods.
- Advance the backend definition contract from v2 to v3; do not load a v2
  backend against the v3 handler context.
- Treat that v2→v3 value as an application-backend API/package compatibility
  version, not a database schema version.
- Update canonical platform/app schema definitions and baseline SQL directly.
  Do not add a database schema-version advance, transform service, appended
  rename migration, migration checkpoint, compatibility read, or any runtime
  behavior for old application storage. Validate from isolated fresh test state.
- Rebuild all checked-in backend bundles from updated source.

## Behavior Preserved

- application scoping and authorization;
- execution resource resolution and configured slots;
- standalone-agent and agent-team launch configuration;
- binding IDs, run IDs, runtime subjects, statuses, and member summaries;
- initial input and later input delivery;
- team member targeting by route key or member path;
- lifecycle event handling and recovery;
- artifact persistence, listing, revision reads, and relay;
- GraphQL/query/command/route request and response behavior;
- backend notifications and storage context.

## Explicitly Outside This Contract

- application-scoped live runtime output;
- frontend SDK or iframe bootstrap changes;
- WebSocket/SSE/GraphQL-subscription work;
- renaming the internal agent `AgentRun` or team `TeamRun` domain;
- changing binding, launch, recovery, or artifact semantics.
