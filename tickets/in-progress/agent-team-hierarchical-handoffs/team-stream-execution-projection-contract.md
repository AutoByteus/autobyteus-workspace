# Team Stream And Frontend Execution Projection Contract

## Artifact Metadata

- Canonical path: `tickets/in-progress/agent-team-hierarchical-handoffs/team-stream-execution-projection-contract.md`
- Purpose: make the complete Team Agent/event/wire boundary and frontend concrete-execution ownership executable, and align its segment/error variants with the SR-020 run-owned canonical lifecycle and diagnostic projection, without reopening canonical backend addressing, released-data migration, storage, or the direct forward-only application-SDK design.
- Scope: current TeamRun domain events, initial connection/open/restore Agent-status snapshots, pre-run send/delegation status overlays, the `/ws/agent-team` server/client protocol, exact application producer binding at Team AgentRun construction, frontend rooted topology, concrete execution projection, task lifecycle, focus/open/history/navigation, and clean-cut removal evidence.
- Status: `Refined — SR-020 exact diagnostic projection aligned for DR-007/DR-008 architecture re-review; prior Team status/event/frontend structure preserved`.
- Related requirements: `R-036`, `R-039`, `R-043`, `R-049`–`R-056`.
- Related acceptance criteria: `AC-029`, `AC-035`, `AC-036`, `AC-038`, `AC-039`, `AC-045`–`AC-051`.
- Approval applicability: `N/A — design supplement for already-approved preserved behavior; SR-020 closes only the canonical consumer/diagnostic cut and adds no new product capability, while SR-017's direct target-only application rule and SR-018's status producers remain unchanged`.
- Relationship to core artifacts: requirements own observable outcomes; investigation notes own current evidence; design spec owns system allocation and sequencing; this file owns the exact Team boundary shapes, nineteen case spines, invariants, and removal inventory. [agent-segment-lifecycle-contract.md](./agent-segment-lifecycle-contract.md) exclusively owns provider-source admission and AgentRun segment lifecycle.

## 1. Decision Summary

SR-016 closes two boundaries rather than adding more local fixes:

1. **One Team stream contract owner.** Server domain events become correlated variants. A dedicated transport-contract package owns exact strict wire DTOs and runtime schemas. Server mapping is exhaustive; browser admission parses the whole variant before any state mutation. No `unknown`, `Record<string, unknown>`, type-only cast, field alias, or duplicate execution identity crosses the Team WebSocket boundary.
2. **One frontend concrete-execution owner.** The frontend projects the single persisted rooted TeamRun aggregate into immutable logical/effective-configuration topology plus one concrete execution graph. A `TeamExecutionState` aggregate privately owns every persistent/task Agent and AgentTeam execution, concrete run binding, graph relation, root/task lifecycle and task timeline, focus, and Agent-context association/disposal. The associated `AgentContext` and established Agent projector remain the sole owners of Agent-local conversation/status/tool state. Consumers use typed queries and view rows; they never mutate topology, access a raw serialized-key map, parse its keys, or manufacture placeholder run IDs.
3. **Draft is not execution.** Pre-launch Team configuration/input lives in `TeamLaunchDraft`, keyed by a UI-only draft ID and logical member address. It contains no TeamRun/AgentRun ID, `TeamExecutionAddress`, `AgentContext`, conversation run identity, or stream subscription. Successful launch replaces the draft with a canonical execution context built only from server-allocated IDs; no temporary execution identity is rebased.
4. **Application producer identity is bound at execution construction.** The existing server Team Agent handle validates a persistent Agent's producer address and rebinds a task Agent/task-Team-Agent producer address before `AgentRunConfig` exists. The frontend then projects the persisted assignment into the same exact concrete-execution invariant. Published-artifact or application-stream consumers never repair producer identity after the fact.
5. **Task activation is published before its execution can speak or work.** One short per-TeamRun activation sequencer, one closed runtime work gate, and one bounded exact-subtree TeamRun publication barrier make durable activation the parent event. Success publishes activation, drains initialization FIFO, then opens work; any pre-publication failure removes the fresh execution and every held event. Transport/frontend code has no reorder buffer or missing-parent inference.
6. **Every Agent-status producer uses one binding and one status value.** Live Agent events, non-event initial connection/open/restore snapshots, pre-run initializing/error overlays, and run-history list projection all consume the same domain-owned `TeamAgentExecutionBinding` constructor and immutable `TeamAgentStatusSnapshot`. Connection snapshots call the exact status projector directly; overlays publish through one correlated status-event constructor and are replaced by the first matching real status. No fake connection event, second binding parser/model, generic Team status payload, or identity fallback exists.
7. **Team consumes, but never owns, segment lifecycle or error classification.** Every provider segment candidate first crosses the run-owned lifecycle behind `AgentRunEventDispatchQueue`. The Team bridge receives only canonical start/content/end or exact `AgentRunErrorEvidence`. `TeamAgentEventAdapter` remains stateless; canonical content is self-contained for late subscribers, and exact turn/runtime diagnostic evidence survives Team wire/browser projection without terminal effects.

The backend `AgentTeamAddress` and `TeamExecutionAddress` meanings remain authoritative. The transport package owns their exact JSON representation at one process boundary; it does not resolve logical recipients, task eligibility, or topology.

## 2. Governing Principles Applied

- One authority per meaning.
- Correlated discriminated unions make invalid source/payload combinations unrepresentable.
- A transport DTO is not a domain resolver.
- Persistent topology describes what is mounted; concrete execution state describes what is running or restored.
- A concrete execution exists only when every required concrete run ID is known.
- Durable task records and frontend execution projection are different owners: GraphQL/task storage owns records; `TeamExecutionState` owns their browser projection.
- The public state boundary accepts typed identity objects. Serialized keys are a private implementation detail, never a caller API.
- Presentation is a derived read model, not mutation fields mixed into topology.
- Concrete execution attribution is established at the construction source, not repaired at an event, artifact, or browser consumer.
- Current runtime has one spelling and one schema. Historical knowledge remains migration-only.
- Live and restored state use the same transition owner and invariants.
- The first common serialized runtime boundary owns lifecycle correlation; transport/application/browser layers project admitted facts only.

## 3. Native Terminology

| Term | Meaning | Does not mean |
| --- | --- | --- |
| `TeamRunEvent` | Correlated server-domain event emitted by a TeamRun | Generic `{source,data}` bag |
| `TeamAgentExecutionBinding` | Immutable execution identity common to every Team Agent event/status producer | Event details, topology/config, or a second address |
| `TeamAgentStatusSnapshot` | Immutable `{execution,details,statusHint}` current-status projection reusable by event and non-event paths | Proof that a status transition occurred or a generic Agent payload |
| `TeamStreamServerMessage` | Exact validated server-to-browser Team WebSocket variant | Generic server message with arbitrary payload |
| `TeamStreamClientMessage` | Exact validated browser-to-server Team command variant | Partially parsed `{type,payload}` |
| `TeamStreamContract` | Transport-only DTO/schema package | Team topology, routing, or task policy owner |
| `TeamExecutionState` | Frontend aggregate owning concrete execution projection and focus | Pinia store containing a public map |
| `TeamTopologyNode` | Immutable rooted persistent placement snapshot | Task execution or mutable presentation row |
| `TeamConcreteExecution` | Valid discriminated persistent/task Agent or AgentTeam execution instance | A topology clone with missing IDs |
| `TeamExecutionNavigationRow` | Derived display/focus row returned by the aggregate | Authoritative topology or task record |
| `TeamExecutionAddressKey` | Private canonical serialization used inside the aggregate | A value exposed to callers or UI text |
| `TeamLaunchDraft` | Pre-launch config, logical member-address focus, and pending input | A copied definition topology, TeamRun, AgentRun, execution address, history record, or stream subject |
| `AgentSegmentLifecycleState` | AgentRun-owned non-persisted start/content/end correlation and canonical content enrichment | TeamRun state, WebSocket session state, browser fallback, or provider-specific Team logic |

## 4. Correlated TeamRun Domain Events

`TeamRunEvent` is one closed union. `eventSourceType` narrows the entire event; there is no independent `TeamRunEventData` union.

```ts
type TeamAgentExecutionBinding =
  | Readonly<{
      kind: "persistent_agent";
      executionAddress: TeamExecutionAddress;
    }>
  | Readonly<{
      kind: "task_agent";
      executionAddress: TeamExecutionAddress;
    }>
  | Readonly<{
      kind: "task_team_agent";
      executionAddress: TeamExecutionAddress;
      agentRunId: string;
    }>;

type TeamAgentStatusSnapshot = Readonly<{
  execution: TeamAgentExecutionBinding;
  details: TeamAgentStatusDetails;
  statusHint: AgentRunStatusHint;
}>;

type TeamRunEvent =
  | Readonly<{
      eventSourceType: "AGENT";
      execution: TeamAgentExecutionBinding;
      payload: TeamAgentEvent;
    }>
  | Readonly<{
      eventSourceType: "TASK_DELEGATION";
      executionAddress: TeamExecutionAddress;
      payload: TeamRunTaskDelegationEvent;
    }>
  | Readonly<{
      eventSourceType: "COMMUNICATION";
      payload: TeamRunCommunicationEventPayload;
    }>
  | Readonly<{
      eventSourceType: "MEMBER_INPUT";
      executionAddress: TeamExecutionAddress;
      payload: TeamRunMemberInputEventPayload;
    }>;
```

`TeamAgentEvent` is the correlated Team-domain projection of the established standalone `AgentRunEvent`:

```ts
type TeamAgentEvent =
  | Readonly<{ eventType: "TURN_STARTED"; details: TeamTurnStartedDetails; statusHint: AgentRunStatusHint }>
  | Readonly<{ eventType: "TURN_COMPLETED"; details: TeamTurnCompletedDetails; statusHint: AgentRunStatusHint }>
  | Readonly<{ eventType: "TURN_INTERRUPTED"; details: TeamTurnInterruptedDetails; statusHint: AgentRunStatusHint }>
  | Readonly<{ eventType: "SEGMENT_START"; details: TeamSegmentStartDetails; statusHint: AgentRunStatusHint }>
  | Readonly<{ eventType: "SEGMENT_CONTENT"; details: TeamSegmentContentDetails; statusHint: AgentRunStatusHint }>
  | Readonly<{ eventType: "SEGMENT_END"; details: TeamSegmentEndDetails; statusHint: AgentRunStatusHint }>
  | Readonly<{ eventType: "AGENT_STATUS"; details: TeamAgentStatusDetails; statusHint: AgentRunStatusHint }>
  | Readonly<{ eventType: "COMPACTION_STATUS"; details: TeamCompactionStatusDetails; statusHint: AgentRunStatusHint }>
  | Readonly<{ eventType: "TOKEN_USAGE_UPDATED"; details: TeamTokenUsageDetails; statusHint: AgentRunStatusHint }>
  | Readonly<{ eventType: "ASSISTANT_COMPLETE"; details: TeamAssistantCompleteDetails; statusHint: AgentRunStatusHint }>
  | Readonly<{ eventType: "TOOL_APPROVAL_REQUESTED"; details: TeamToolApprovalRequestedDetails; statusHint: AgentRunStatusHint }>
  | Readonly<{ eventType: "TOOL_APPROVED"; details: TeamToolApprovedDetails; statusHint: AgentRunStatusHint }>
  | Readonly<{ eventType: "TOOL_DENIED"; details: TeamToolDeniedDetails; statusHint: AgentRunStatusHint }>
  | Readonly<{ eventType: "TOOL_EXECUTION_STARTED"; details: TeamToolExecutionStartedDetails; statusHint: AgentRunStatusHint }>
  | Readonly<{ eventType: "TOOL_EXECUTION_SUCCEEDED"; details: TeamToolExecutionSucceededDetails; statusHint: AgentRunStatusHint }>
  | Readonly<{ eventType: "TOOL_EXECUTION_FAILED"; details: TeamToolExecutionFailedDetails; statusHint: AgentRunStatusHint }>
  | Readonly<{ eventType: "TOOL_EXECUTION_INTERRUPTED"; details: TeamToolExecutionInterruptedDetails; statusHint: AgentRunStatusHint }>
  | Readonly<{ eventType: "TOOL_LOG"; details: TeamToolLogDetails; statusHint: AgentRunStatusHint }>
  | Readonly<{ eventType: "TODO_LIST_UPDATE"; details: TeamTodoListDetails; statusHint: AgentRunStatusHint }>
  | Readonly<{ eventType: "SYSTEM_TASK_NOTIFICATION"; details: TeamSystemTaskNotificationDetails; statusHint: AgentRunStatusHint }>
  | Readonly<{ eventType: "ARTIFACT_PERSISTED"; details: TeamArtifactPersistedDetails; statusHint: AgentRunStatusHint }>
  | Readonly<{ eventType: "FILE_CHANGE"; details: TeamFileChangeDetails; statusHint: AgentRunStatusHint }>
  | Readonly<{ eventType: "ERROR"; details: TeamAgentErrorDetails; statusHint: AgentRunStatusHint }>;
```

The member-handle event bridge receives the canonical post-pipeline standalone `AgentRunEvent`, requires its `runId` to equal the handle's real AgentRun binding, obtains the exact execution address from that already-bound handle, and calls the sole domain `createTeamAgentExecutionBinding({executionAddress,agentRunId:raw.runId})` constructor before passing the event through one `TeamAgentEventAdapter`. The constructor classifies by address shape: persistent Agent uses `persistent_agent`; task Agent uses `task_agent` and requires `executionAddress.taskAgentRunId === agentRunId`; Agent inside a task AgentTeam uses `task_team_agent` and retains that verified AgentRun ID because `TeamExecutionAddress` deliberately does not encode member AgentRun IDs inside a task Team. The adapter is exhaustive over the canonical Agent event enum, validates and maps each admitted payload into the correlated domain variant above, normalizes absent supported non-segment facts to explicit `null`/empty arrays, and removes raw `runId` from the event details. For segment events it requires the already-admitted finite type and non-empty turn; it performs no start/content/end correlation. Its `AGENT_STATUS` arm calls the same `createTeamAgentStatusDetails(...)` constructor used by connection snapshots and pre-run overlays. Where a payload carries a distinct sender run ID, the adapter receives only a narrow `resolveExecutionAddressByAgentRunId(runId)` capability backed by the accepted root execution directory; it does not import the mixed manager or perform logical routing. Therefore generic provider candidates stop at the AgentRun lifecycle transformer, canonical standalone events stop at the Team ingress adapter, and neither `TeamRunEvent` nor Team egress contains `Record<string,unknown>`.

`AgentRunEventType.INTER_AGENT_MESSAGE` and `.TEAM_COMMUNICATION_MESSAGE` are deliberately not Team Agent variants. Team collaboration already has two authoritative events: `COMMUNICATION` updates the Team communication projection and `MEMBER_INPUT` updates the exact recipient transcript. Re-emitting derived Agent collaboration events would create a second path and duplicate identity. The Team member bridge filters those two derived events; `TeamCommunicationService` consumes only the correlated `COMMUNICATION` variant. Standalone Agent streaming may retain its independent events. Refactoring the standalone Agent event subsystem is otherwise outside this ticket.

The binding constructor lives in `agent-team-execution/domain/team-agent-execution-binding.ts` and is used by live event admission, initial snapshot enumeration, pre-run status overlay creation, and history/status projection. It enforces the same shape invariant as the later wire schema: `persistent_agent` has an empty task-Team chain and null task-Agent ID; `task_agent` has a non-null task-Agent ID equal to the supplied allocated/verified run ID; `task_team_agent` has a non-empty task-Team chain, null task-Agent ID, and non-empty separate `agentRunId`. A mismatch is a producer-boundary rejection, not a mapper correction. No consumer classifies or reparses the binding.

### 4.1 Exact Team Agent detail vocabulary

The following table is exhaustive for `TeamAgentEvent`. Fields are camel-case domain fields; the wire projector changes them to the one snake-case spelling shown by the shared DTO schema. Every listed field is present. A field marked `| null` is explicit null rather than omitted; collection fields use an empty frozen collection. `JsonValue` is recursive JSON data and is allowed only in the named opaque fields.

| Event | Exact detail fields |
| --- | --- |
| `TURN_STARTED` | `turnId:string|null` |
| `TURN_COMPLETED` | `turnId:string|null`, `reason:string|null` |
| `TURN_INTERRUPTED` | `turnId:string|null`, `reason:string|null` |
| `SEGMENT_START` | `segmentId:string`, `turnId:string`, `segmentType:AgentSegmentType`, `metadata:JsonValue|null` |
| `SEGMENT_CONTENT` | `segmentId:string`, `turnId:string`, `segmentType:AgentSegmentType`, `delta:string` |
| `SEGMENT_END` | `segmentId:string`, `turnId:string`, `metadata:JsonValue|null`, `interrupted:boolean`, `reason:string|null`, `failed:boolean`, `error:string|null` |
| `AGENT_STATUS` | `status:AgentRuntimeStatus`, `trigger:string|null`, `toolName:string|null`, `errorMessage:string|null`, `errorDetails:string|null` |
| `COMPACTION_STATUS` | `phase:CompactionPhase|null`, `kind:string|null`, `status:string|null`, `turnId:string|null`, `compactionOperationId:string|null`, `requestedTurnId:string|null`, `executionTurnId:string|null`, `selectedBlockCount:number|null`, `compactedBlockCount:number|null`, `rawTraceCount:number|null`, `semanticFactCount:number|null`, `compactionAgentDefinitionId:string|null`, `compactionAgentName:string|null`, `compactionRuntimeKind:string|null`, `compactionModelIdentifier:string|null`, `compactionRunId:string|null`, `compactionTaskId:string|null`, `errorMessage:string|null`, `provider:string|null`, `sourceSurface:string|null`, `boundaryKey:string|null`, `providerEventId:string|null`, `providerSessionId:string|null`, `providerThreadId:string|null`, `providerTimestamp:number|null`, `trigger:string|null`, `preTokens:number|null`, `rotationEligible:boolean|null` |
| `TOKEN_USAGE_UPDATED` | `TeamTokenUsageDetails` below |
| `ASSISTANT_COMPLETE` | `content:string|null`, `reasoning:string|null`, `usage:JsonValue|null`, `imageUrls:readonly string[]`, `audioUrls:readonly string[]`, `videoUrls:readonly string[]` |
| `TOOL_APPROVAL_REQUESTED` | `invocationId:string`, `toolName:string`, `turnId:string|null`, `arguments:JsonValue` |
| `TOOL_APPROVED` | `invocationId:string`, `toolName:string`, `turnId:string|null`, `reason:string|null` |
| `TOOL_DENIED` | `invocationId:string`, `toolName:string`, `turnId:string|null`, `arguments:JsonValue|null`, `reason:string|null`, `error:string|null` |
| `TOOL_EXECUTION_STARTED` | `invocationId:string`, `toolName:string`, `turnId:string|null`, `arguments:JsonValue|null` |
| `TOOL_EXECUTION_SUCCEEDED` | `invocationId:string`, `toolName:string`, `turnId:string|null`, `arguments:JsonValue|null`, `result:JsonValue|null` |
| `TOOL_EXECUTION_FAILED` | `invocationId:string`, `toolName:string`, `turnId:string|null`, `arguments:JsonValue|null`, `error:string` |
| `TOOL_EXECUTION_INTERRUPTED` | `invocationId:string`, `toolName:string`, `turnId:string|null`, `arguments:JsonValue|null`, `reason:string` |
| `TOOL_LOG` | `logEntry:string`, `toolInvocationId:string`, `toolName:string`, `turnId:string|null` |
| `TODO_LIST_UPDATE` | `todos:readonly {todoId:string,description:string,status:"pending"|"in_progress"|"done"}[]` |
| `SYSTEM_TASK_NOTIFICATION` | `sender:{kind:"system"}|{kind:"execution",executionAddress:TeamExecutionAddress}`, `content:string` |
| `ARTIFACT_PERSISTED` | `artifactId:string`, `path:string`, `artifactType:ArtifactType`, `status:"available"`, `description:string|null`, `revisionId:string`, `createdAt:string`, `updatedAt:string` |
| `FILE_CHANGE` | `fileChangeId:string`, `path:string`, `fileType:ArtifactType`, `status:FileChangeStatus`, `sourceTool:FileChangeSourceTool`, `sourceInvocationId:string|null`, `content:string|null`, `createdAt:string`, `updatedAt:string` |
| `ERROR` | `code:string`, `message:string`, `evidence:AgentRunErrorEvidence|null`; exact four-variant evidence is already resolved at the AgentRun domain boundary |

`AgentSegmentType` is closed to `text | tool_call | write_file | edit_file | run_bash | reasoning | media`. The server Agent domain owns the semantic value. The browser-safe `@autobyteus/team-stream-contracts` package owns the exact wire mirror as `agentSegmentTypeSchema` plus its inferred DTO type; `SEGMENT_START` and `SEGMENT_CONTENT` use that schema rather than `nonEmptyStringSchema`, and their `turn_id` uses non-null `nonEmptyStringSchema` rather than the generic nullable turn schema. One exhaustive domain-to-wire projector and package parity tests guard drift. The wire mirror does not own segment lifecycle or correlation.

`TeamTokenUsageDetails` contains exactly these non-execution facts: `usageEventId`, `idempotencyKey`, `observedAt`, `turnId`, `llmCallId`, `modelProvider`, `modelIdentifier`, `modelValue`, `usageScope`, `inputTokenSemantic`, `standardInputTokens`, `cacheMissInputTokens`, `cacheReadInputTokens`, `cacheCreationInputTokens`, `cacheCreation5mInputTokens`, `cacheCreation1hInputTokens`, `cacheState`, `reasoningOutputTokens`, `billableOutputTokens`, `meterDeltaInputTokens`, `meterDeltaOutputTokens`, `meterDeltaTotalTokens`; price fields `inputPricePerMillion`, `outputPricePerMillion`, `cachedInputReadPricePerMillion`, `cachedInputWritePricePerMillion`, `cachedInputWrite5mPricePerMillion`, `cachedInputWrite1hPricePerMillion`; cost fields `estimatedApiInputCost`, `estimatedApiStandardInputCost`, `estimatedApiCacheReadInputCost`, `estimatedApiCacheCreationInputCost`, `estimatedApiCacheCreation5mInputCost`, `estimatedApiCacheCreation1hInputCost`, `estimatedApiOutputCost`, `estimatedApiReasoningOutputCost`, `estimatedApiTotalCost`; and `currency`, `apiCostStatus`, `missingPriceDimensions`, `pricingPolicyKey`, `selectedPricingTierId`, `latestPromptTokens`, `effectiveContextWindowTokens`, `contextWindowUsagePercent`, and `qualityFlags`. The contract package uses finite unions for categorical fields and exact non-empty/nullable primitives for open provider/model/correlation values; it does not weaken an enum with `| string` or admit surplus fields. `runId`, `rootTeamRunId`, `executionAddress`, `memberAgentRunId`, `agentDefinitionId`, `workspaceId`, and duplicate `runtimeKind` are excluded because the outer Team Agent event plus topology own them.

The adapter does not spread the raw payload. Each switch arm reads only the fields in its row and rejects malformed required fields. For `SYSTEM_TASK_NOTIFICATION`, the literal system sentinel maps to `{kind:"system"}`; any run-valued sender must resolve through the root mixed execution directory to one exact `TeamExecutionAddress` before publication, otherwise the event is rejected. Raw sender run IDs never enter the Team domain/wire. `TEAM_COMMUNICATION_MESSAGE`, `INTER_AGENT_MESSAGE`, and any unknown future Agent event produce no Team Agent variant; an unknown future enum value is a compile/exhaustiveness failure rather than an `ERROR` fallback.

For `ERROR`, the adapter calls the sole `resolveAgentRunErrorEvidence(event)` domain function and stores its exact semantic result. The allowed evidence variants are `TURN_DIAGNOSTIC(turnId)`, `RUNTIME_DIAGNOSTIC`, `TURN_TERMINAL(turnId)`, and `RUNTIME_GLOBAL`; an established unclassified error uses explicit `null`. The adapter never reads an active turn, reclassifies from status hint, or treats runtime scope alone as terminal.

Its result is correlated and explicit: `{kind:"publish",event}`, `{kind:"filtered_collaboration_duplicate"}`, or `{kind:"rejected",code:"TEAM_AGENT_EVENT_ADMISSION_FAILED",message}`. The bridge logs a filtered duplicate and publishes nothing for it. For a malformed known event, the bridge publishes the exact Team Agent `ERROR` variant under the same verified outer execution address, using that stable code and an actionable redacted message; it never forwards any partial raw payload. A newly added compile-time Agent enum member must be implemented in the adapter before build passes.

Identity ownership by variant:

- `AGENT.execution`: one correlated Agent-execution binding. All variants carry the exact address once. Only `task_team_agent` additionally carries its genuine non-empty AgentRun binding because that value is neither present in the address nor available from persistent metadata; persistent/task-Agent variants must not repeat it.
- `TASK_DELEGATION.executionAddress`: the exact concrete task execution root from the active record's `taskRun.address`. The task payload may contain the semantically distinct sender, but not the delivery receiver, logical target, or another root/run locator.
- `COMMUNICATION.payload.senderAddress` and `.receiverAddress`: both are retained because the message relationship needs two distinct concrete participants. There is no ambiguous universal outer execution address.
- `MEMBER_INPUT.executionAddress`: the exact receiving Agent execution. The payload retains an optional semantically distinct sender but has no `recipientAddress` duplicate.

The event carries no generic `teamRunId`: the subscription already identifies the emitting root TeamRun, while an execution-bearing variant's `executionAddress` identifies the concrete execution. Agent and member-input payloads carry no generic `taskContext`: the aggregate resolves task Agent/task-Team membership and the governing `taskId` from the exact execution address plus its one task graph/projection. The pre-refactor `taskAgentInstanceId = "task_agent_" + taskId` and `taskTeamInstanceId = "task_team_" + taskId` add no information and are removed from current domain, status, token, event, work-packet, and wire shapes. `taskId` remains only where it is the actual task operation/correlation fact.

Task delegation is itself correlated:

```ts
type TeamRunTaskDelegationEvent =
  | Readonly<{ eventType: "TASK_DELEGATION_ACTIVATED"; details: TaskDelegationActivationEventDetails }>
  | Readonly<{ eventType: "TASK_DELEGATION_RESULT_SUBMITTED"; details: TaskDelegationResultSubmittedEventDetails }>
  | Readonly<{ eventType: "TASK_DELEGATION_RESULT_REVIEWED"; details: TaskDelegationResultReviewedEventDetails }>;
```

The event details are a deliberate projection of the task ledger, not a spread of its record or existing permissive event payload:

```ts
type TaskDelegationEventIdentity = Readonly<{
  taskId: string;
}>;

type TaskDelegationActivationEventDetails = TaskDelegationEventIdentity & Readonly<{
  senderAddress: TeamExecutionAddress;
  content: string;
  referenceFiles: readonly TaskDelegationReferenceFile[];
  createdAt: string;
  startedAt: string;
}>;

type TaskDelegationResultSubmittedEventDetails = TaskDelegationEventIdentity & Readonly<{
  submissionId: string;
  submittedAt: string;
}>;

type TaskDelegationResultReviewedEventDetails = TaskDelegationEventIdentity & Readonly<{
  reviewId: string;
  reviewedSubmissionId: string;
  decision: TaskResultReviewDecision;
  reviewedAt: string;
}>;
```

The exact review-decision and reference-file value types remain task-domain-owned. Activation is the only task event that carries the durable base facts needed to materialize the just-persisted task; its `startedAt` comes from `record.taskRun.startedAt`, not a second publication clock, its event type implies the literal initial `active` status, and the initial projection derives `updatedAt = startedAt` exactly as the task record does. Later result events carry only the fact that occurred and cause a durable complete-record refresh. They do not repeat base task content, sender, references, current/previous status, derived updated/pending/latest/acceptance fields, presentation `taskLabel`, or a redundant `terminal` boolean. Submitted status is derivable from the task transition and reviewed status from `decision`, but the complete task record remains the projection authority.

`TASK_DELEGATION_STATUS_UPDATED` is also removed. Current production invokes it only immediately after `RESULT_SUBMITTED` or `RESULT_REVIEWED`, so it is a second event for the same transition rather than an independently originating fact. The two result variants plus complete refresh preserve task status/timeline behavior without duplicate publication. Task labels derive from canonical task content plus task ID, and terminal state derives from the finite task status.

No task detail repeats `teamRunId`, `rootTeamRunId`, delivery receiver/logical target address, target kind, execution instance/run ID, delegator identity, or tool-shaped `taskArguments`. The subscription owns the emitting root TeamRun scope; outer `executionAddress` owns the concrete task root plus target-kind/run derivation, while the durable record alone retains the distinct delivery receiver. Activation retains `senderAddress` because it is a different participant. If presentation needs the original tool-shaped arguments, it derives `{recipient_address,description,reference_files}` from the durable task record and topology rather than inventing them from a live transition. `TASK_DELEGATION_TERMINAL_STATUS` is removed because no current producer exists; `TASK_DELEGATION_STATUS_UPDATED` is removed because it has no independent producer transition.

For all three task variants, the publisher obtains that outer identity from the active record's non-null `taskRun.address`. It does not publish `record.receiverAddress`: for a task Agent that record field is the persistent/base delivery target, while for a task AgentTeam it is the concrete coordinator ingress inside the new task Team. Both are valid operation-owned delivery facts, but neither is the task execution root that the frontend materializes and updates. The correlated event therefore carries `taskRun.address` once and leaves delivery receiver semantics in the durable task record.

Activation also owns producer ordering. `TaskDelegationService` serializes only the short prepare/persist/publish critical section for activation attempts on the same TeamRun. Once fresh task execution identity and `taskRun.address` are allocated, but before runtime start/post can emit initializing/member events, task delegation opens a bounded `TaskActivationEventBarrier` at the TeamRun publication boundary for that exact task subtree. The prepared runtime accepts/enqueues the work packet behind a closed execution gate: initialization may publish synchronously into the barrier, but model work and task-originated operations cannot execute yet. Acceptance returns only after that preparation is quiescent; no asynchronous event producer can run again until the gate opens. The service therefore checks the final count/byte budget before starting the durable write, so overflow can never race a successful active-record commit. The barrier queues only related Agent, member-input, communication, and nested task events; unrelated Team events bypass it. A rejected runtime start, persistence failure, or limit overflow discards the queue and terminates/settles the fresh execution. On success, the service persists the active record, publishes `TASK_DELEGATION_ACTIVATED` directly, releases queued events FIFO immediately after it, and only then opens work execution. The barrier then ceases to exist and the activation sequencer admits the next attempt. Thus the frontend never guesses a missing task parent and transport owns no retry/buffer policy.

Communication and member-input payloads are equally tight:

```ts
type TeamRunCommunicationEventPayload = Readonly<{
  messageId: string;
  senderAddress: TeamExecutionAddress;
  receiverAddress: TeamExecutionAddress;
  content: string;
  messageType: TeamCommunicationMessageType;
  referenceFiles: readonly TeamCommunicationReferenceFile[];
  createdAt: string;
}>;

type TeamRunMemberInputEventPayload = Readonly<{
  messageId: string;
  dedupeKey: string;
  content: string;
  inputOrigin: "user_message" | "inter_agent_delivery";
  receivedAt: string;
  contextFilePaths: readonly TeamRunMemberInputContextFile[];
  senderAddress: TeamExecutionAddress | null;
  parentCommunicationMessageId: string | null;
}>;
```

Neither repeats `teamRunId`; member input does not repeat the outer receiver. The wire mapper changes spelling only at the transport boundary and never introduces an additional identity.

Every publisher must construct one union variant directly. No private publisher accepts `eventType` plus `payload: unknown`.

### 4.2 One Agent-status value across live, initial, overlay, and history paths

`agent-team-execution/domain/team-agent-status.ts` owns `TeamAgentStatusDetails`, `TeamAgentStatusSnapshot`, `createTeamAgentStatusDetails(...)`, status-hint derivation, and immutable snapshot construction. Its exact details are the `AGENT_STATUS` row from §4.1 only:

```ts
type TeamAgentStatusDetails = Readonly<{
  status: AgentRuntimeStatus;
  trigger: string | null;
  toolName: string | null;
  errorMessage: string | null;
  errorDetails: string | null;
}>;
```

Details contain no execution address, TeamRun ID, AgentRun ID, Agent name, runtime kind, task ID/instance/run alias, or presentation field. `TeamAgentStatusSnapshot` composes the details with one already-constructed binding and status hint. This is the single shared status-domain value; there is no `TeamLeafAgentStatusSnapshot`, `AgentStatusPayload` Team subtype, or generic status identity base.

The four producer/consumer cases are intentionally distinct only where their semantics differ:

1. **Live Agent event:** the member bridge verifies the live AgentRun ID, calls the one binding constructor, and `TeamAgentEventAdapter` uses the one details constructor. The correlated `AGENT_STATUS` event is projected normally.
2. **Initial connection/open/restore snapshot:** persistent/task/task-Team mixed handles and config-backed offline Agent enumeration supply their exact execution address plus allocated context/node AgentRun ID to the same binding constructor and return `TeamAgentStatusSnapshot`. `TeamRuntimeSnapshotService` calls `projectTeamAgentStatusMessage(snapshot)` directly, then the strict serializer. It does **not** create a `TeamRunEvent`; a connection snapshot is current state, not a new domain transition.
3. **Pre-run initializing/error overlay:** an unmaterialized mixed Agent handle owns its exact execution address and allocated AgentRun ID before `ensureReady()`. It constructs the binding and passes it with initializing/error facts to `MemberCommandStatusOverlayStore`. The store owns only details keyed by private canonical execution-address serialization, builds a snapshot, and calls `createTeamAgentStatusEvent(snapshot)` to publish the real correlated status event. After the member bridge successfully publishes the first matching real correlated `AGENT_STATUS`, it calls `clearAcceptedLiveStatus(binding)`; exact binding equality removes only that overlay.
4. **Run-history/list live projection:** `TeamRunLiveProjectionService` consumes the snapshot through a run-history-owned typed list mapper. It may derive presentation through the rooted Team index, but it may not strip a generic payload, reuse a wire DTO as history state, or restore duplicate identity fields.

The task-Team Agent's genuine AgentRun ID comes from `MixedAgentMemberContext`/the fresh child TeamRun configuration and appears exactly once in its binding even before AgentRun materialization. A task Agent's supplied ID must equal `executionAddress.taskAgentRunId` and is not transported twice. Persistent Agent output transports no AgentRun ID. No path guesses between persistent/root/local shapes or asks the projector to repair identity.

## 5. Exact Team WebSocket Contract Owner

Add the workspace package:

```text
autobyteus-team-stream-contracts/
  src/
    team-execution-address-dto.ts
    team-agent-message-dtos.ts
    team-task-message-dtos.ts
    team-collaboration-message-dtos.ts
    team-control-message-dtos.ts
    team-stream-server-message.ts
    team-stream-client-message.ts
    index.ts
```

Package name: `@autobyteus/team-stream-contracts`.

The package:

- depends only on `zod`, the browser-safe runtime-schema library already used by the server workspace;
- contains no server domain, frontend store, UI, GraphQL, provider, or persistence dependency;
- owns exact `.strict()` schemas and inferred readonly DTO types for every message allowed on `/ws/agent-team`;
- exports `parseTeamStreamServerMessage`, `parseTeamStreamClientMessage`, `serializeTeamStreamServerMessage`, and `serializeTeamStreamClientMessage`;
- admits no unknown message type, missing field, surplus field, camel/snake alias, or arbitrary payload property;
- owns the exact transport spelling, not topology resolution or canonical-address business operations.

`TeamExecutionAddressDto` has exactly:

```ts
{
  root_team_run_id: string;
  task_team_run_ids: string[];
  member_address: string;
  task_agent_run_id: string | null;
}
```

The Team wire contract uses snake-case consistently, including inside the nested address DTO; server/frontend domain objects remain camel-case and convert only at their respective process boundary. Its runtime schema validates non-empty run IDs, ordered non-empty task-Team IDs, the rooted canonical member-address grammar, and no extra keys. Server adapters map the domain object to this DTO. Browser admission converts it through the existing frontend canonical-address constructor before state use. No wire package function resolves `./...`, looks up topology, or checks task eligibility.

`TeamAgentExecutionBindingDto` is the exact snake-case projection of the domain binding:

```ts
type TeamAgentExecutionBindingDto =
  | Readonly<{
      kind: "persistent_agent";
      execution_address: TeamExecutionAddressDto;
    }>
  | Readonly<{
      kind: "task_agent";
      execution_address: TeamExecutionAddressDto;
    }>
  | Readonly<{
      kind: "task_team_agent";
      execution_address: TeamExecutionAddressDto;
      agent_run_id: string;
    }>;
```

The strict schema also enforces the discriminator/address-shape rules below; it does not accept `agent_run_id:null` as an alias for absence on the first two variants. A task-Team Agent repeats the same genuine binding on each of its events so any event may be first or arrive after restore; this is one idempotent execution binding, not a second logical address or event-detail field.

### 5.1 Closed message families

`TeamStreamServerMessage` is the union of these exact families; there is no optional `TeamStreamIdentityPayload` base:

| Family | Exact identity rule | Payload rule |
| --- | --- | --- |
| connection readiness | `CONNECTED.payload.session_id` | the successfully bound WebSocket URL/session already owns the root TeamRun scope; no repeated `team_id`, `team_run_id`, or `agent_id` |
| Team lifecycle | the bound Team stream session | exact `{is_active:boolean}` only; no repeated root TeamRun identity |
| Agent turn/segment/status/compaction/token/tool/todo/artifact/file/error-output | required correlated `agent_execution` once | exact `{kind:"persistent_agent"|"task_agent",execution_address}` or `{kind:"task_team_agent",execution_address,agent_run_id}`; one strict payload schema per message type; runtime/presentation derive from topology; no duplicate emitting Agent/member identity inside event details; distinct compaction/tool/task correlation remains explicit |
| command acknowledgement | exact acknowledged command discriminator and its required target/result | no generic acknowledgement record |
| task delegation | required concrete task-root `execution_address` + one of the three `event_type`/details pairs | only the minimal task details in §4; no delivery-receiver/Team/root/target/execution duplicate |
| Team communication | `sender_address` + `receiver_address` | exact message/reference/timestamp fields; no outer universal execution address |
| member input / external user input | required receiver `execution_address` once | exact origin/content/context/sender/correlation fields; no `recipient_address` |
| connection/protocol or Agent error | `code`, `message`, required nullable `error_scope`, `error_effect`, `turn_id`, and `agent_execution: TeamAgentExecutionBindingDto | null` | Agent-origin error retains exact binding/evidence; connection/protocol or unclassified error uses explicit null evidence rather than optional fields or inferred semantics |

Semantically opaque tool/provider values are typed as recursive `JsonValue` only in the specifically named `metadata`, `arguments`, `result`, or usage fields. That does not permit surplus top-level or task fields. `any`, generic `Record<string,unknown>`, and object spread into a wire variant are forbidden.

The exact server variants are:

| Type | Exact payload |
| --- | --- |
| `CONNECTED` | `{session_id:string}`; this is the application-level proof that server binding succeeded, not a duplicate Team identity envelope |
| `TEAM_RUN_LIFECYCLE` | `{is_active:boolean}`; it applies only to the root persistent-Team execution owned by this already-bound Team stream |
| each Team Agent event from §4.1 except `ERROR` | `{agent_execution,...that event's exact detail fields}`; `agent_execution` is the correlated strict binding above, Agent detail spelling is the established snake-case spelling, and no raw/name/runtime/task-instance identity field is present |
| `AGENT_COMMAND_ACK` | correlated interrupt-only union: accepted `{command_type:"INTERRUPT_GENERATION",command_id,state:"accepted",execution_address}` or failure `{command_type:"INTERRUPT_GENERATION",command_id,state:"rejected"|"failed",code,message,execution_address}`; no nested target/run object |
| `TASK_DELEGATION_EVENT` | `{event_type,execution_address,...the exact matching snake-case task-detail fields from §4}`; no camel-case alias is accepted |
| `TEAM_COMMUNICATION_MESSAGE` | `{message_id,sender_address,receiver_address,content,message_type,reference_files,created_at}`; each reference is exactly `{reference_id,path,type,created_at,updated_at}`; emitting TeamRun scope replaces duplicate `team_run_id` |
| `MEMBER_INPUT_MESSAGE` | `{execution_address,message_id,dedupe_key,content,input_origin,received_at,context_file_paths,sender_address,parent_communication_message_id}`; nullable fields are explicit and each context file is `{path,type}` |
| `EXTERNAL_USER_MESSAGE` | `{execution_address,content,received_at,provider,transport,account_id,peer_id,thread_id,external_message_id,context_file_paths}`; there is no `agent_id`/`agent_name` identity duplicate |
| `ERROR` | correlated pair with required evidence fields: Agent-origin `{code,message,error_scope,error_effect,turn_id,agent_execution:TeamAgentExecutionBindingDto}` or connection/protocol `{code,message,error_scope:null,error_effect:null,turn_id:null,agent_execution:null}`; an unclassified Agent error also projects three evidence nulls without losing its binding |

`agent_execution` is a strict discriminated union; `agent_run_id` is forbidden for persistent/task-Agent bindings and required for a task-Team Agent. Its address must match the discriminator: empty task-Team chain/null task-Agent ID for persistent, non-null task-Agent ID for task Agent, and non-empty task-Team chain/null task-Agent ID for task-Team Agent. Agent definition presentation, runtime launch facts, and task association derive from the immutable topology plus the concrete execution graph selected by `agent_execution.execution_address`; the stream does not repeat `agent_name`, `runtime_kind`, `task_id`, or a synthetic task-instance ID on every Agent event. `SEND_MESSAGE` has no Team success acknowledgement today, so the target does not invent one. The only produced Team `AGENT_COMMAND_ACK` is interrupt acknowledgement and therefore has only the interrupt variant above. `INTER_AGENT_MESSAGE` is absent from the Team server union; `COMMUNICATION` plus `MEMBER_INPUT_MESSAGE` are the non-duplicated collaboration path.

`TeamStreamClientMessage` is exactly:

```ts
type TeamStreamClientMessage =
  | Readonly<{
      type: "SEND_MESSAGE";
      payload: Readonly<{
        content: string;
        context_file_paths: readonly string[];
        image_urls: readonly string[];
        execution_address: TeamExecutionAddressDto;
        message_id: string;
        dedupe_key: string;
      }>;
    }>
  | Readonly<{
      type: "INTERRUPT_GENERATION";
      payload: Readonly<{ command_id: string; execution_address: TeamExecutionAddressDto }>;
    }>
  | Readonly<{
      type: "APPROVE_TOOL" | "DENY_TOOL";
      payload: Readonly<{
        invocation_id: string;
        execution_address: TeamExecutionAddressDto;
        reason: string | null;
      }>;
    }>;
```

The Team client command builder supplies explicit empty arrays/null and generates message/dedupe IDs before serialization. Every Team command requires one exact execution address. Sending to the root coordinator uses that real persistent coordinator Agent's address; it is not encoded as a null/default target. The standalone Agent endpoint may keep its independent command shapes.

There is no Team `approval_token`. Current server source neither emits nor reads that field; the frontend-only `ToolApprovalTokenPayload`/token map and tests manufacture an apparent concurrency contract that does not exist at the command owner. Approval identity is the required `invocation_id` plus the exact receiving `execution_address`; `TeamToolApprovalTracker` may retain only the invocation-to-address association needed by the UI. The target removes the unused token type, collection, payload field, `as any` casts, and manufactured token fixtures rather than promoting dead metadata into the new contract.

## 6. Server Wire Projection

### 6.1 Exact mapper result

`convertTeamRunEventToServerMessage()` returns `TeamStreamServerMessage`, not generic `ServerMessage`.

It uses a switch over `event.eventSourceType`; each arm receives its narrowed event without casts. A final `assertNever` makes an added domain variant a compile failure until mapped.

Agent events are normalized at Team ingress by `TeamAgentEventAdapter` and reach the mapper as the correlated `TeamAgentEvent` plus `TeamAgentExecutionBinding`. The mapper switches exhaustively over `agentEvent.eventType`, maps its already-narrowed domain details explicitly to the matching DTO, and maps the one binding to `agent_execution`. Its `AGENT_STATUS` arm first forms the shared `TeamAgentStatusSnapshot` and delegates to `projectTeamAgentStatusMessage(snapshot)`. `TeamRuntimeSnapshotService` calls that same exported function directly for connection/open/restore state, without calling `convertTeamRunEventToServerMessage()`. The projector never repeats raw `runId`, `task_agent_run_id`, synthetic task-instance ID, display name, runtime kind, or derivable task association in event details. The only transported AgentRun ID is the required `task_team_agent.agent_run_id`, because the frontend must materialize that concrete execution and neither its address nor persistent metadata owns the ID. Provider/runtime event bags may remain inside their established standalone-Agent boundary, but no generic payload enters `TeamRunEvent` or escapes the Team server projector.

Task events map one-to-one:

```text
TASK_DELEGATION_ACTIVATED        -> exact activated wire payload
TASK_DELEGATION_RESULT_SUBMITTED -> exact result-submitted wire payload
TASK_DELEGATION_RESULT_REVIEWED  -> exact result-reviewed wire payload
```

The canonical current Team wire spelling is snake-case throughout. `event_type` and `execution_address` are transport discriminator/identity; every task-detail field is mapped explicitly from its camel-case domain fact to one snake-case DTO field. The mapper does not call a generic `serializePayload`, spread an arbitrary task details object, or rely on a cast. There are no corresponding camel-case alternatives.

`MEMBER_INPUT_MESSAGE.payload.execution_address` is the only receiving execution locator. Delete `recipient_address`. `sender_address`, when present, remains because it identifies a different participant.

### 6.2 Serialization and egress

The Team broadcaster and WebSocket egress accept only `TeamStreamServerMessage`. They serialize through the contract package. Connected, lifecycle, command acknowledgement, error, external-user, communication, task, member-input, and Agent-derived messages all belong to the closed union. Serialization first validates the exact variant and then performs JSON encoding; a schema or JSON-safety failure produces the typed `TEAM_STREAM_PROJECTION_FAILED` error/diagnostic with server-side event-source context and never emits a partial message under the original Agent/task type. `CONNECTED` is emitted only after the server has bound the WebSocket session to the TeamRun selected by the endpoint; `TeamStreamingService` treats that message—not the lower-level socket-open callback—as application subscription readiness and retains `session_id` privately. A lifecycle message therefore cannot apply to another TeamRun and carries only the changing fact.

Standalone Agent streaming may keep its separate contract during this ticket, but Team egress may not accept the generic `ServerMessage` class or `Record<string,unknown>` payload. Shared cadence/coalescing infrastructure may be generic over an already-validated message; it must not invent or alter fields.

`AgentTeamStreamHandler.sendInitialStatusSnapshot()` is cut to exact contract messages. After the exact post-binding `CONNECTED`, it requests `readonly TeamAgentStatusSnapshot[]`, calls `projectTeamAgentStatusMessage()` for each snapshot in deterministic enumeration order, sends those strict messages, and then sends the exact root lifecycle snapshot. It does not invoke the TeamRun event mapper, construct a generic `ServerMessage`, spread a legacy payload, or parse a binding. A projection failure uses the same typed Team-stream diagnostic and never emits a partially mapped status.

### 6.3 Client commands

`AgentTeamStreamHandler` parses raw client JSON with `parseTeamStreamClientMessage` before dispatch. `SEND_MESSAGE`, `INTERRUPT_GENERATION`, `APPROVE_TOOL`, and `DENY_TOOL` are correlated strict variants. Existing exact `TeamExecutionAddress` command semantics remain unchanged; the unused frontend-only Team approval-token shape is removed as described above. Unknown/invalid input uses the established typed Team command error and performs no command-side mutation.

## 7. Frontend Admission Boundary

`parseServerMessage()` becomes Team-specific or is replaced by `parseTeamStreamServerMessage()`. It validates JSON syntax and the complete strict union. It never returns a cast value.

The frontend accepts only the canonical snake-case wire spelling. Its typed DTO-to-frontend adapter names each field explicitly; it does not run alias normalization or accept:

- `eventType` beside/in place of `event_type`;
- `taskId` beside/in place of `task_id`;
- `referenceFiles` beside/in place of `reference_files`;
- `rootTeamRunId` beside/in place of `root_team_run_id`;
- `recipient_address` beside/in place of `execution_address`; or
- arbitrary payload fields through `[key:string]:any`.

A rejected message is logged as a protocol admission failure and causes no task refresh, topology/execution mutation, status/timeline update, focus change, communication projection, or Agent transcript dispatch.

After admission, TypeScript narrowing is exhaustive. `TeamStreamingService` does not call `record()`, `text()`, or alias normalizers for Team message identity.

## 8. Immutable Frontend Topology

The topology model contains only immutable mounted logical/effective-launch-configuration facts:

```ts
type TeamTopologyNode =
  | Readonly<{
      kind: "agent";
      address: AgentTeamAddress;
      role: string | null;
      description: string | null;
      agentDefinitionId: string;
      runtimeKind: RuntimeKind;
      llmModelIdentifier: string;
      llmConfig: ReadonlyJsonObject | null;
      autoExecuteTools: boolean;
      skillAccessMode: SkillAccessMode;
      workspaceRootPath: string | null;
    }>
  | Readonly<{
      kind: "agent_team";
      address: AgentTeamAddress;
      role: string | null;
      description: string | null;
      teamDefinitionId: string;
      coordinatorAddress: AgentTeamAddress;
      children: readonly TeamTopologyNode[];
    }>;
```

`ReadonlyJsonObject` is the existing model-config boundary's recursively JSON-safe object value (string/number/boolean/null/array/object only), not an unconstrained `Record<string,unknown>`. Provider-specific keys remain intentionally open because the runtime/model owns them, but functions, class instances, `undefined`, and non-JSON values are rejected by the launch/metadata projection boundary. The Team topology reuses that owned value type rather than defining another config schema.

`executionAddress`, task ID/status/timeline/arguments/references/target/sender, `isTaskExecution`, and mutable current status are not topology fields. One immutable `TeamTopologySnapshot` owns the recursive root and a private derived address index:

```ts
interface TeamTopologySnapshot {
  readonly teamDefinitionName: string;
  readonly rootTeam: TeamTopologyAgentTeamNode;
  getNode(address: AgentTeamAddress): TeamTopologyNode | null;
  listNodes(): readonly TeamTopologyNode[];
}
```

The node shape is the immutable logical/effective-launch-configuration projection of the approved canonical `TeamRunMetadataV3.rootTeam`; its paired execution builder consumes the node-local run bindings and `ApplicationExecutionContext` into `TeamExecutionState` in the same operation. `ApplicationExecutionContext.producer.executionAddress` is concrete execution identity, so it is not topology/configuration even though the one recursive disk aggregate stores it locally on the Agent node. No persistence schema is split and no second `TeamRunConfig` authority is created. Definition display names are presentation data resolved by definition ID in the navigation projector, with the canonical address basename as the safe fallback. Callers never receive or mutate the index. The snapshot is constructed only after canonical launch/restore metadata validation; it contains no run ID or execution address and has no draft or root-ID-promotion mode.

### 8.1 Pre-launch Team draft

```ts
type TeamLaunchDraft = Readonly<{
  draftId: TeamLaunchDraftId;
  config: DeepReadonly<TeamRunConfig>;
  focusedMemberAddress: AgentTeamAddress;
  pendingInputsByMemberAddress: ReadonlyMap<AgentTeamAddress, TeamLaunchPendingInput>;
}>;
```

`TeamRunConfig.teamDefinitionId` points to the existing definition-catalog authority; the draft does not copy a second definition topology. The configuration/member UI obtains a read-only derived definition-topology view from that catalog and launch readiness revalidates every stored address against the current definition closure before the launch request. `TeamLaunchPendingInput` contains only pre-launch user text/reference/composer facts required to submit the first command after launch. `draftId` is a UI/store selection identity and never enters an API run field, `TeamExecutionAddress`, conversation ID, stream subscription, token/history record, or persisted TeamRun metadata.

`focusedMemberAddress` and every pending-input key must resolve through that definition query to an Agent node; selecting an AgentTeam group resolves explicitly to its configured coordinator Agent before the draft is stored. A missing/stale address is an actionable launch-readiness failure and is never silently retargeted. This keeps the later transfer singular and avoids a second “default Team target” interpretation.

The refactored existing Team run-config store is the `TeamLaunchDraft` owner (rename to `teamLaunchDraftStore` if repository conventions permit). It replaces immutable draft/config snapshots through typed edit actions; no component mutates `config` directly and no second “current Team config” value exists beside the selected draft. `agentTeamContextsStore` stores launched contexts only, keyed by real root TeamRun ID. Team selection is a discriminated subject—`{kind:"team_draft",draftId}` or `{kind:"team_run",rootTeamRunId}`—rather than a string that may be temporary or real.

The launch owner sends the draft config, receives the server's canonical TeamRun metadata/run identities, constructs a new `TeamTopologySnapshot` plus `TeamExecutionState`, transfers the pending input to the exact real coordinator/selected Agent execution, and atomically replaces the selected draft with that execution context. Failure leaves the draft unchanged. No temporary TeamRun ID, synthetic AgentRun ID, draft `AgentContext`, or identity-promotion/rebase operation exists in target frontend production code.

### 8.2 One metadata-to-frontend projection builder

`ApplicationExecutionContext` below is the one exact type exported by V5 `@autobyteus/application-sdk-contracts`: `{applicationId,bindingId,producer}`. The server application-domain model aliases it rather than redeclaring it. The frontend defines no `Record<string,unknown>` alternative; its projection boundary maps every field and validates the nested producer with the existing frontend canonical execution-address capability.

Canonical metadata deliberately contains no active/inactive frontend lifecycle and cannot by itself reconstruct dynamic Agent state. The builder therefore accepts one closed input assembled by the supported launch/open boundary:

```ts
type TeamRunFrontendProjectionInput = Readonly<{
  metadata: TeamRunMetadataV3;
  rootLifecycle: Readonly<{isActive: boolean}>;
  initialFocusedMemberAddress: AgentTeamAddress;
  persistentAgentSeeds: readonly TeamPersistentAgentSeed[];
}>;

type TeamPersistentAgentSeed = Readonly<{
  memberAddress: AgentTeamAddress;
  workspace: WorkspaceMetadata | null;
  runtime:
    | Readonly<{kind: "fresh"}>
    | Readonly<{kind: "loaded"; snapshot: AgentExecutionHydrationSnapshot}>
    | Readonly<{kind: "historical_unloaded"}>;
}>;
```

`AgentExecutionHydrationSnapshot` is an exact identity-free dynamic Agent state projection; it contains conversation/status/history content but no transport subscription, member/execution/run/config/application identity. The metadata Agent node remains the only source of those stable facts. There is exactly one seed per metadata Agent and no seed for an AgentTeam node. `fresh`, `loaded`, and `historical_unloaded` are explicit lifecycle meanings rather than one nullable bag. `rootLifecycle` comes from the launch/resume response, not inference from `archivedAt` or metadata presence. Initial focus must resolve to an Agent; selecting an AgentTeam is converted to its configured coordinator before this boundary.

`TeamRunFrontendProjectionBuilder` is the only owner that splits that exact input into the two frontend views. In one all-or-nothing build it:

1. projects address/definition/role/description/effective Agent launch facts into `TeamTopologySnapshot` without any run binding;
2. projects every AgentTeam node into `PersistentTeamExecution` and every Agent node into `PersistentAgentExecution` using the node's exact current run bindings; the root Team execution uses `{kind:"root"}` because its ID is already `executionAddress.rootTeamRunId`, while each child Team execution uses `{kind:"child",teamRunId}` for its distinct child TeamRun binding; each persistent Agent execution also owns the node's exact SDK-typed `ApplicationExecutionContext | null`, admitted only after missing/surplus/invalid fields are rejected and its producer address equals the record's exact execution address;
3. constructs each persistent AgentContext once from the metadata node's permanent Agent run ID, the topology configuration view, the execution record's application context, and the matching seed's workspace/dynamic-state variant; that context is the sole frontend owner of its Agent run ID and Agent-local state, while later lazy history hydration enters `TeamExecutionState` with identity-free dynamic data and never becomes a context-level bag;
4. sets the root record's lifecycle only from `rootLifecycle`, resolves initial focus to the exact persistent Agent execution, and validates seed completeness/uniqueness, one-to-one address/kind pairing, root TeamRun equality, direct coordinator Agent existence, non-empty run IDs, and no surplus/missing persistent execution; and
5. returns one `{topology,executions}` `AgentTeamContext` or a typed failure with no registered partial context.

Fresh launch and restore/historical open use this same builder with different explicit seed variants. Runtime platform-Agent binding updates replace only the affected execution record through `TeamExecutionState`; they do not mutate topology or write a second context-level binding.

## 9. Discriminated Concrete Execution Model

`TeamExecutionState` privately stores the following closed union:

```ts
type TeamConcreteExecution =
  | PersistentTeamExecution
  | PersistentAgentExecution
  | TaskAgentExecution
  | TaskTeamExecution
  | TaskTeamAgentExecution;

type PersistentTeamExecution =
  | Readonly<{
      kind: "persistent_team";
      executionAddress: TeamExecutionAddress;
      runBinding: Readonly<{kind: "root"}>;
      lifecycle: Readonly<{isActive: boolean}>;
    }>
  | Readonly<{
      kind: "persistent_team";
      executionAddress: TeamExecutionAddress;
      runBinding: Readonly<{kind: "child"; teamRunId: string}>;
    }>;

type PersistentAgentExecution = Readonly<{
  kind: "persistent_agent";
  executionAddress: TeamExecutionAddress;
  platformAgentRunId: string | null;
  applicationExecutionContext: ApplicationExecutionContext | null;
  agentContext: AgentContext;
}>;

type TaskAgentExecution = Readonly<{
  kind: "task_agent";
  executionAddress: TeamExecutionAddress;
  platformAgentRunId: string | null;
  applicationExecutionContext: ApplicationExecutionContext | null;
  taskId: string;
  agentContext: AgentContext;
}>;

type TaskTeamExecution = Readonly<{
  kind: "task_team";
  executionAddress: TeamExecutionAddress;
  taskId: string;
}>;

type TaskTeamAgentExecution = Readonly<{
  kind: "task_team_agent";
  executionAddress: TeamExecutionAddress;
  platformAgentRunId: string | null;
  applicationExecutionContext: ApplicationExecutionContext | null;
  agentContext: AgentContext;
}>;

type TeamTaskProjection = Readonly<{
  taskId: string;
  executionAddress: TeamExecutionAddress;
  status: TaskDelegationStatus;
  senderAddress: TeamExecutionAddress;
  content: string;
  referenceFiles: readonly TaskDelegationReferenceFile[];
  createdAt: string;
  startedAt: string;
  updatedAt: string;
  updates: readonly TeamTaskUpdateProjection[];
}>;

type TeamTaskProjectionSnapshot = Readonly<{
  kind: "complete_root_task_snapshot";
  tasks: readonly TeamTaskProjection[];
}>;

type TeamTaskUpdateProjection =
  | Readonly<{
      kind: "submission";
      submissionId: string;
      senderAddress: TeamExecutionAddress;
      receiverAddress: TeamExecutionAddress;
      content: string;
      referenceFiles: readonly TaskDelegationReferenceFile[];
      createdAt: string;
    }>
  | Readonly<{
      kind: "review";
      reviewId: string;
      senderAddress: TeamExecutionAddress;
      receiverAddress: TeamExecutionAddress;
      reviewedSubmissionId: string;
      decision: TaskResultReviewDecision;
      content: string | null;
      referenceFiles: readonly TaskDelegationReferenceFile[];
      createdAt: string;
    }>;
```

Agent-local conversation, Agent runtime status, compaction, tool activity, todo, artifact, and composer state remain owned once by the associated `AgentContext` plus the existing Agent projection capability. `TeamConcreteExecution` does not copy an `AgentExecutionStatusSnapshot`; its typed summary/navigation row reads the reactive Agent status from that associated context. The aggregate owns association, kind/address validation, task lifecycle, graph, focus, and disposal, then returns `dispatch_agent` as true external work for the existing Agent projector. This reuses the established Agent capability rather than making `TeamExecutionState` a second Agent event store.

`TeamTaskProjection` is the exact task lifecycle/timeline value stored once in the aggregate's private task index. It is flat because its execution address and task facts describe one subject; an outer `{executionAddress,task}` wrapper would add naming/indirection without another owner. Active `task_agent`/`task_team` executions store only `taskId`; they do not copy the projection, and `TeamTaskHistoryRow` is derived on query rather than persisted as a second mutable collection. Thus one task projection serves active status/timeline, history after terminal cleanup, and presentation. `createdAt` is the durable task ordering fact, `startedAt` is the execution-start fact, and `updatedAt` is the monotonic reconciliation fact; none substitutes for another. Delivery receiver is intentionally absent because the mapper validates it before setting `executionAddress` from `taskRun.address`. Submission/review participant pairs remain because each update is a relationship between two distinct executions. The private graph owns parent/child edges; no projection repeats a parent address merely to support traversal. The aggregate accepts record reconciliation only through `TeamTaskProjectionSnapshot`, whose discriminator asserts that the mapper supplied a complete response after validating every row against the aggregate's expected root. The snapshot does not repeat that root; a partial list has no reconciliation API.

### 9.1 Persistent AgentTeam

Required facts:

- `kind: "persistent_team"`;
- exact persistent `executionAddress` with empty task-Team chain, null task-Agent ID, and the logical AgentTeam member address;
- correlated `runBinding: {kind:"root"} | {kind:"child";teamRunId:string}`: the root `/` record must use `root` and derives its TeamRun ID only from `executionAddress.rootTeamRunId`; every non-root persistent Team must use `child` with the canonical metadata node's non-empty child TeamRun ID; and
- immutable topology-node lookup at `executionAddress.memberAddress`.

It has no `AgentContext`. Root Team lifecycle activity is owned by the root `persistent_team` record.

### 9.2 Persistent Agent

Required facts:

- `kind: "persistent_agent"`;
- stable `executionAddress` with empty task-Team chain and null task-Agent ID;
- immutable topology-node reference/lookup at `executionAddress.memberAddress`; and
- non-empty permanent Agent run identity owned by the associated `AgentContext.state.runId`, plus `platformAgentRunId:string|null` and typed `applicationExecutionContext:ApplicationExecutionContext|null`. The execution record does not repeat that Agent run ID. When present, the application context's producer execution address equals this record's exact execution address.

### 9.3 Task Agent

Required facts:

- `kind: "task_agent"`;
- `executionAddress.taskAgentRunId` is non-null and is the sole task Agent run identity;
- `platformAgentRunId:string|null` is the only external runtime binding for that task Agent;
- typed `applicationExecutionContext:ApplicationExecutionContext|null`, derived from the source persistent Agent's application assignment but rebound to this exact task execution address;
- one `taskId` reference into the aggregate's single task-projection index; sender/lifecycle/timeline/presentation facts are read from that projection; and
- owned `AgentContext`, whose permanent run identity equals `executionAddress.taskAgentRunId`; the address remains the task Agent's execution identity and no sibling record field repeats it.

### 9.4 Task AgentTeam root

Required facts:

- `kind: "task_team"`;
- non-empty task-Team chain whose last ID is the sole real task TeamRun identity;
- `executionAddress.memberAddress` equals the logical target AgentTeam address, not its coordinator;
- one `taskId` reference into the aggregate's single task-projection index; its task facts come from that projection and its parent edge belongs only to the private execution graph;
- no `AgentContext`, because an AgentTeam is not an Agent.

### 9.5 Agent within a task AgentTeam

Required facts:

- `kind: "task_team_agent"`;
- non-empty task-Team chain and null task-Agent ID;
- exact logical member identity only through `executionAddress.memberAddress`; and
- non-empty permanent Agent run identity owned by the associated `AgentContext.state.runId`, obtained from the current Agent binding/hydration input, plus `platformAgentRunId:string|null` and typed `applicationExecutionContext:ApplicationExecutionContext|null`. The execution record does not repeat the Agent run ID. Any application context retains the source Agent's application/binding/presentation facts but uses this record's exact execution address.

A nested task AgentTeam is another `task_team` variant with a longer ordered chain. Its concrete Agent children are separate `task_team_agent` variants. The record never stores `memberAddress`, `agentRunId`, `taskAgentRunId`, `taskTeamRunId`, target address, or coordinator address beside the same fact already owned by its `executionAddress`, associated `AgentContext`, or immutable topology lookup. For persistent and task-Team Agents the permanent AgentRun ID exists once in `AgentContext.state.runId`; for a task Agent the same context value must equal the ID already carried by its execution address and is never a separately writable execution-record field. `platformAgentRunId` exists once on each Agent variant because it is a distinct external runtime binding. `applicationExecutionContext` exists once on each Agent execution because it is a concrete application binding whose producer address must match that execution; task Agent variants derive/rebind it from the corresponding persistent source Agent rather than retaining a persistent execution address. The root persistent Team and every task Team derive their own run ID from the execution address; only a non-root `persistent_team.runBinding` stores a distinct child TeamRun ID. No variant or owned `AgentContext` permits an empty run ID.

Every owned `AgentContext` receives a permanent Agent run ID and an immutable `AgentExecutionConfigurationView` derived from its source topology Agent node plus the execution record's typed application context. The topology view is not a mutable copy or a second run/config identity; only Agent-local conversation/status/tool/UI state is AgentContext-owned. Team launch/restore never calls `promoteTemporaryId`, `teamRunMemberIdentityReconciler`, or assigns `state.runId`; replacement hydration is identity-free. Transport subscription/readiness/unsubscribe fields are extracted from the common `AgentContext` into the standalone/Team streaming session owners, so an Agent context is not another connection owner. Task executions reuse the same logical node launch facts while their concrete binding comes from the exact address or first verified task-Team-Agent binding and their application producer address comes only from that concrete execution record.

## 10. TeamExecutionState Authority

`AgentTeamContext` exposes immutable topology and one execution owner:

```ts
interface AgentTeamContext {
  readonly topology: TeamTopologySnapshot;
  readonly executions: TeamExecutionState;
}
```

`AgentTeamContext` is the composition record, not a second execution/config/lifecycle facade. Its root TeamRun ID comes from the root execution address and its active lifecycle from the root `persistent_team` record; there is no sibling `teamRunId` or `lifecycle`, and the root record does not repeat the root ID as a field. Active-run configuration panels derive an immutable `TeamRunConfigurationView` from topology node launch facts. Creating another run explicitly creates a new `TeamLaunchDraft`; no mutable launched `config` is retained. Historical hydration is an input to `TeamExecutionState`, not a parallel context field. WebSocket connection/subscription/unsubscribe state remains private to `TeamStreamingService`/transport rather than domain context. Topology-only callers query `topology`; concrete execution/focus/presentation callers query `executions`. `TeamExecutionState` receives the immutable topology query boundary at construction and is the only owner allowed to combine topology with execution lifecycle into derived execution views.

In the Vue application, `TeamExecutionState` is implemented as a capability factory/setup-style reactive aggregate, not as an unobserved class instance or a second Pinia store with public state. Its execution map/graph/focus are private reactive collections. Each public transition commits its record/graph/focus changes synchronously as one owner operation and then returns only a minimal typed disposition plus any true external-work effects; effects execute only after that commit. Reactive query consumers observe the committed state directly, so no redundant “change” DTO or second apply step exists. Components track typed query results through their existing store/computed boundary and never receive the reactive collections themselves. This preserves UI reactivity without moving transition policy into `agentTeamContextsStore` or `TeamStreamingService`.

`TeamExecutionState` owns:

- the private execution-address index;
- parent/child task-execution relationships;
- the private one-entry-per-task projection index, seeded/confirmed by durable records and used for both active task views and derived history rows;
- `AgentContext` creation/association/disposal;
- task lifecycle, task timeline, and task presentation snapshots; Agent-local status remains single-owned by the associated AgentContext/Agent projector and is only read for derived Team views;
- the exact focused execution address;
- live-event application;
- GraphQL/task-record reconciliation and historical hydration;
- terminal subtree cleanup and deterministic focus fallback; and
- typed navigation/presentation views.

Public/query surface:

```ts
getRootTeamRunId(): string;
isRootTeamActive(): boolean;
getAgentContext(address): AgentContext | null;
getFocusedAddress(): TeamExecutionAddress;
getFocusedAgentContext(): AgentContext | null;
getExecutionSummary(address): TeamExecutionSummary | null;
listAgentContextEntries(): readonly Readonly<{
  executionAddress: TeamExecutionAddress;
  agentContext: AgentContext;
}>[];
listNavigationRows(): readonly TeamExecutionNavigationRow[];
listTaskHistoryRows(): readonly TeamTaskHistoryRow[];
focus(address): TeamExecutionMutationResult;
applyExecutionMessage(message: TeamExecutionProjectionMessage): TeamExecutionApplyResult;
reconcileTaskSnapshot(snapshot: TeamTaskProjectionSnapshot): TeamExecutionMutationResult;
hydrate(snapshot: TeamExecutionHydrationSnapshot): TeamExecutionMutationResult;
```

`TeamExecutionSummary` is an immutable presentation-neutral view containing the discriminator, exact execution address, lifecycle/status when applicable, and active task/sender facts required by status consumers; it contains no `AgentContext`, mutable collection, internal graph edge, or serialized key. `TeamTaskHistoryRow` is a separate immutable terminal/nonterminal query shape derived from the latest complete retained `TeamTaskProjection`—either the durable-confirmed activation base or a full-record reconciliation—and is not stored as another mutable read-model collection. It retains task ID, concrete task execution address, status, sender, content/references, and complete timeline needed by history but is not a concrete active execution and is never focusable. `listTaskHistoryRows()` projects the private task entries and orders rows deterministically by durable `createdAt`, then `taskId`; it never depends on map insertion order or a serialized address key. The concrete union and mutation methods on its records remain private. The internal execution map may use canonical serialization for O(1) lookup, but each record retains its typed address and all iteration/subtree checks use that record. No caller receives the concrete execution/task maps, map keys, or a union reference that can become a second mutation surface.

`TeamTaskProjection` is the minimal closed current task-record row produced by one GraphQL/task-record mapper after exact address/run-chain/target-kind validation. It flattens only the record's concrete `taskRun.address` as `executionAddress` plus its normalized task facts; it is not the transport response, repeats neither delivery receiver nor parent, and has no alias or index signature. The mapper receives the expected root from the bound request/aggregate, validates every row against it, and emits rows only inside one `TeamTaskProjectionSnapshot` after the complete GraphQL response validates successfully; one invalid row rejects the whole snapshot. `TeamExecutionHydrationSnapshot` is the closed persistent-execution input produced by the metadata/history hydration boundary. Both are accepted as complete values and reconciled by the aggregate; neither input exposes a callback or repository through which the aggregate could fetch more state.

Mutation results are closed and do not repeat already-committed reactive state:

```ts
type TeamExecutionRejectionCode =
  | "TEAM_EXECUTION_NOT_FOUND"
  | "TEAM_EXECUTION_NOT_FOCUSABLE"
  | "TEAM_EXECUTION_IDENTITY_MISMATCH"
  | "TEAM_EXECUTION_TRANSITION_INVALID";

type TeamExecutionMutationResult =
  | Readonly<{disposition: "applied" | "unchanged"}>
  | Readonly<{
      disposition: "rejected";
      code: TeamExecutionRejectionCode;
      message: string;
    }>;

type TeamExecutionEffect =
  | Readonly<{
      kind: "dispatch_agent";
      executionAddress: TeamExecutionAddress;
      message: TeamAgentStreamMessage;
    }>
  | Readonly<{
      kind: "record_team_token_usage";
      executionAddress: TeamExecutionAddress;
      details: TeamTokenUsageDetails;
    }>
  | Readonly<{
      kind: "refresh_task_records";
    }>;

type TeamExecutionApplyResult =
  | Readonly<{
      disposition: "applied";
      effects: readonly TeamExecutionEffect[];
    }>
  | Readonly<{
      disposition: "unchanged";
      effects: readonly TeamExecutionEffect[];
    }>
  | Readonly<{
      disposition: "rejected";
      code: TeamExecutionRejectionCode;
      message: string;
      effects: readonly [];
    }>;
```

The owner never fetches GraphQL directly and never mutates a navigation or token store. An `applied` disposition means the complete owner transition committed synchronously; `unchanged` means aggregate state is byte/deep-equivalent but true external work may still be required; `rejected` means zero aggregate mutation. This distinction lets a post-activation task signal return `{disposition:"unchanged",effects:[{kind:"refresh_task_records"}]}` without inventing a partial task projection. The refresh effect carries no root ID because the already-bound Team context owns that scope and the executor obtains it through `getRootTeamRunId()`. Rejection cannot carry effects, and an unsupported combination has no representation through optional properties.

For live input, the already-bound `TeamStreamingService` executes returned effects after the aggregate transition: the existing Agent stream projector receives `dispatch_agent`, the Team-specific token entrypoint receives `record_team_token_usage`, and the established task refresh scheduler receives `refresh_task_records`. This executor is a thin transport orchestration seam and cannot mutate the aggregate's private graph/focus/index. `record_team_token_usage` is keyed by the canonical execution address; the token entrypoint derives root scope from that address and stable runtime presentation through the topology/configuration query, without the stripped wire `run_id`, `root_team_run_id`, or `member_agent_run_id`. Standalone Agent token metering may retain its independent run-ID entrypoint.

## 11. Lifecycle And Projection Rules

- Persistent Team/Agent executions are seeded atomically by `TeamRunFrontendProjectionBuilder` from the closed canonical metadata + lifecycle/focus/Agent-seed input; topology contributes logical/effective-launch-configuration facts and execution records exclusively own concrete run/application bindings.
- Strictly parsed live, initial connection/open/restore, and pre-run overlay `AGENT_STATUS` messages all carry the same `agent_execution` binding and exact status details and enter the same `TeamExecutionState` Agent-status transition. The aggregate dispatches the established AgentContext status projector once; it neither records source kind nor maintains a second Team status store.
- A `persistent_agent` or `task_agent` live binding must resolve an already materialized execution of that exact kind; it cannot create one or repeat an AgentRun ID. A `task_team_agent` live binding may materialize the missing concrete Agent only when its containing task Team exists, topology proves the Agent is inside that Team, and the non-empty `agentRunId` is new or equals the associated AgentContext's permanent run ID. Kind/address/ID mismatch rejects with zero mutation. The new record derives its stable launch/application assignment from topology/source Agent execution and rebinds application producer identity to the exact task-Team-Agent address; the construction binding is consumed into the AgentContext rather than copied into another record field.
- A task Agent is created only from an exact task record/event containing its real task Agent run ID.
- A task AgentTeam root is created only from an exact task record/event containing its real task Team run ID and valid chain.
- A task-Team member Agent is created only when a real Agent event/status/hydration record supplies its real AgentRun ID.
- Missing task-Team children remain absent executions and absent from task-Team navigation. The task Team group and only its concrete materialized descendants are shown; source topology remains available independently through persistent-Team views and is never copied under the task execution.
- Live activation and restored GraphQL records enter the same task materialization transition and must converge to deep-equal execution/projection state. Because activation is published only after its active record is durable, its exact base facts seed one complete `active` task projection with an empty update list and `updatedAt = startedAt`. Every later submission/review event is only a change signal: it validates task identity and correlation vocabulary, performs no partial task-projection mutation, and returns the root-bound `refresh_task_records` effect. The complete durable snapshot alone replaces the task projection.
- Duplicate/out-of-order activation events and records are idempotent by exact task identity, immutable execution/base facts, and monotonic `updatedAt`; an event cannot replace another task execution sharing the logical address. A later task signal whose task is not yet materialized still requests refresh rather than manufacturing an execution from incomplete details.
- Task records remain durable authority. The aggregate keeps one task projection per task ID and derives both active task views and history from it; no transient timeline overlay or second history archive exists.
- Result-submitted/reviewed live details intentionally omit durable update content/reference files. They never manufacture a partial timeline entry or directly delete an execution. The refresh obtains the complete durable update, and reconciliation replaces the exact one-copy projection once.
- The task-record mapper requires an exact non-null `taskRun.address` and uses it as the enclosing task execution identity. It validates the record's distinct delivery receiver rather than conflating it with that identity: for an Agent target, `receiverAddress` equals `taskRun.address` with `taskAgentRunId` removed; for an AgentTeam target, `receiverAddress` equals the immutable topology's configured coordinator ingress inside the task Team identified by `taskRun.address`. After every row validates, it emits one complete root-scoped snapshot of flat `TeamTaskProjection` values with `executionAddress = taskRun.address`. The aggregate then derives parent/child edges in its private graph. A task Agent's source parent is the Agent execution at the same address without `taskAgentRunId`. A first-level task Team's source parent is the persistent Team execution at its logical Team address. A nested task Team's containing parent is the unique `task_team` execution whose task-Team run-ID chain equals the child's chain without the final ID; topology must prove the nested target lies inside that containing Team. A task-Team Agent's containing parent is the unique `task_team` execution named by the terminal task-Team run ID, with topology proving Agent membership. Neither the delivery receiver nor a parent address is repeated on the stored task projection.
- Reconciliation is an atomic staged merge over an append-only durable task ledger, not wholesale replacement by response-array position. Before mutation, it validates unique task IDs and execution addresses, immutable `executionAddress`/`createdAt`/`startedAt`, update identity/order, and topology/receiver rules for every row. For an existing task, a newer `updatedAt` replaces its one projection, an older row is ignored as a stale concurrent response, and an equal timestamp must be deep-equal; equal-time conflict rejects the whole snapshot. A known task absent from an otherwise complete response is retained because a root query may have started before a concurrently persisted activation; absence never means deletion in this append-only store.
- Terminal cleanup occurs only after the staged complete-root reconciliation confirms terminal state. For a terminal task Team, every currently materialized descendant task must have a terminal candidate projection from that same response; an absent, stale, or nonterminal descendant means the snapshot cannot authorize cleanup, so the aggregate rejects it with zero mutation rather than deleting partial history. A valid reconciliation atomically swaps the candidate one-projection-per-task index, then removes exactly the terminal task Agent or task-Team concrete-execution subtree and disposes associated Agent contexts plus graph edges once. The task projections remain, so history rows derive without a copied archive structure. The durable task record remains task-store-owned for persistence, but frontend history consumers still query `TeamExecutionState`; they do not bypass it to interpret raw task records.
- Only the three Agent execution variants are focusable. A `task_team` row is an expandable concrete group, not a chat target; its concrete coordinator Agent becomes focusable only after that Agent's real run ID materializes as `task_team_agent`.
- If focus lies inside the removed subtree, fallback is the corresponding persistent source Agent for a removed task Agent, otherwise the persistent coordinator of the closest source Team. Focus never becomes a Team/group or missing address.
- Selection remains outside focus: a workspace row is current only when the selected subject is that exact root TeamRun and its exact focused execution address equals the row address.

## 12. Derived Presentation

`TeamExecutionNavigationRow` is a closed view union:

- `persistent_agent` — immutable Agent topology row plus its persistent execution/status;
- `persistent_team` — immutable AgentTeam topology group;
- `task_agent` — concrete task Agent;
- `task_team` — concrete task AgentTeam root;
- `task_team_agent` — concrete Agent within a task AgentTeam.

Every row carries typed `executionAddress`, display label, depth, concrete status when applicable, `hasChildren`, and a discriminator-derived `focusable` fact (`false` for `persistent_team` and `task_team`, true for the three Agent kinds). Its logical member address is `executionAddress.memberAddress`; a row does not store a second `memberAddress` field. It never carries or renders a serialized execution key.

Display names come from a read-only definition-presentation resolver keyed by the topology node's definition ID. A task label is derived at query time from the canonical task content and task ID; it is not a stored event/projection field. The fallback is the canonical address basename. Sender labels resolve a typed sender execution address through `TeamExecutionState` and topology; unresolved addresses render that same safe basename, never JSON.

Run history, desktop/mobile navigation, token rows, event monitors, approvals, Team workspace, and focus/open actions consume these typed queries/view rows. They do not depend on both `AgentTeamContext` and an internal execution map.

## 13. Data-Flow Spines By Case

### 13.1 Agent event to exact browser execution

```text
Agent runtime emits AgentRunEvent
  -> member bridge verifies raw AgentRun ID
  -> TeamAgentEventAdapter validates/maps exact correlated details or filters duplicate collaboration event
  -> TeamRun AGENT publisher supplies one correlated Agent binding: address-only persistent/task Agent or address + required task-Team-Agent run ID
  -> correlated TeamRunAgentEvent
  -> exhaustive Team-agent wire projector
  -> TeamStreamServerMessage
  -> contract serializer
  -> WebSocket
  -> strict browser parser
  -> TeamExecutionState.applyExecutionMessage
  -> existing persistent/task Agent is verified, or missing task-Team Agent is materialized from its genuine run ID
  -> exact AgentContext dispatch/status/timeline OR typed canonical-address token-meter effect
  -> reactive typed navigation/presentation view
```

### 13.2 Task activation/result submission/result review

```text
Task ledger transition
  -> enter the per-TeamRun short activation critical section
  -> allocate exact taskRun address and open bounded exact-subtree activation barrier before runtime start/post
  -> accept/enqueue work behind a closed execution gate while runtime-related initialization events queue
  -> rejection/persist failure/overflow discards them and settles fresh execution
  -> persist active record
  -> TASK_DELEGATION_ACTIVATED bypasses barrier
  -> require active record.taskRun.address and publish it as the one concrete task execution address
  -> release queued runtime events FIFO, open task work execution, and leave the critical section; later task transitions publish directly
  -> keep persistent target / task-Team coordinator ingress only in the durable record
  -> correlated TeamRunTaskDelegationEvent
  -> exhaustive task wire mapper
  -> strict TASK_DELEGATION_EVENT DTO
  -> browser admission
  -> TeamExecutionState validates task execution chain against immutable topology
  -> activated creates exact task_agent or task_team plus one durable-confirmed active task projection
  -> later submission/review signal leaves that complete projection untouched and requests GraphQL task-record refresh
  -> typed task/navigation views
```

### 13.3 Communication message

```text
Accepted Team communication record
  -> correlated COMMUNICATION event with senderAddress + receiverAddress
  -> exact TEAM_COMMUNICATION_MESSAGE DTO
  -> strict browser admission
  -> Team communication store projection
  -> participant presentation resolves through TeamExecutionState/topology
```

### 13.4 Member input delivery

```text
Accepted user/inter-Agent input delivery
  -> correlated MEMBER_INPUT event with outer recipient executionAddress
  -> mapper emits exactly one execution_address
  -> strict MEMBER_INPUT_MESSAGE DTO
  -> browser admission
  -> TeamExecutionState resolves exact AgentContext
  -> transcript input projection once
```

### 13.5 Invalid/unknown wire input

```text
Raw WebSocket text
  -> JSON parse
  -> strict union parse fails on type/shape/alias/surplus/invalid address
  -> protocol diagnostic
  -> zero task refresh, execution mutation, focus change, communication projection, or transcript dispatch
```

### 13.6 Launch draft to fresh persistent frontend state

```text
definition/configuration UI
  -> TeamLaunchDraft {draftId, config, member-address focus, pending input}
  -> existing definition-catalog query validates current logical addresses; no topology copy
  -> launch command; no TeamExecutionAddress or AgentContext exists yet
  -> server returns canonical TeamRun metadata with real Team/Agent run IDs + exact active lifecycle
  -> launch owner assembles initial logical Agent focus + exactly one fresh identity-free Agent seed per metadata Agent
  -> TeamRunFrontendProjectionBuilder validates/splits once
  -> immutable run-ID/execution-address-free TeamTopologySnapshot with private derived address index
  -> persistent Team + Agent execution records with real run/application bindings
  -> TeamExecutionState seed and canonical AgentContexts
  -> exact initial focus
  -> transfer pending input to exact real execution
  -> context store atomically replaces selected draft with TeamRun context
  -> typed workspace/history/navigation rows
```

### 13.7 Task Agent execution

```text
Validated activation/live event or active task record
  -> exact concrete taskRun address with taskAgentRunId
  -> locate immutable source Agent topology node
  -> create TaskAgentExecution + AgentContext
  -> reference one taskId in the single task-projection index
  -> focus/open/history queries use typed address
```

### 13.8 Task AgentTeam and nested task AgentTeam

```text
Validated activation/live event or active task record
  -> exact concrete taskRun root + ordered taskTeamRunIds
  -> locate immutable source AgentTeam topology node
  -> create TaskTeamExecution only
  -> later Agent event/hydration with real AgentRun ID
  -> create TaskTeamAgentExecution
  -> nested delegation appends one taskTeamRunId and repeats the same transition
```

No source subtree is cloned. No missing descendant is represented with an empty run ID.

### 13.9 Restore/hydration convergence

```text
Open historical/current TeamRun
  -> resume owner assembles canonical metadata + exact lifecycle/focus + complete loaded/historical-unloaded Agent seeds
  -> TeamRunFrontendProjectionBuilder creates immutable topology + persistent execution graph atomically
  -> GraphQL complete root-scoped durable task-record response in stable parent-before-child order
  -> TeamTaskProjectionMapper requires every taskRun.address, validates root scope plus Agent-base / AgentTeam-coordinator delivery receiver, and emits one all-or-nothing complete snapshot
  -> TeamExecutionState.reconcileTaskSnapshot
  -> stage one task-ID/address-unique monotonic projection merge; retain known rows absent from a concurrent append-only snapshot, ignore older rows, reject equal-time conflicts
  -> enclosing record owns taskRun.address; private graph derives parent from address + topology
  -> hydrate concrete Agent contexts/statuses by exact address
  -> same valid union/state as equivalent live events
  -> restore focus only when target exists; otherwise deterministic fallback
```

### 13.10 Focus, selection, and presentation

```text
User selects exact TeamRun row/execution row
  -> typed TeamExecutionAddress action
  -> TeamExecutionState.focus validates existence/focusability
  -> selected root TeamRun remains owned by workspace selection
  -> row is current iff selected root + exact focused address both match
  -> desktop/mobile panels query focused AgentContext/presentation
```

### 13.11 Terminal cleanup

```text
Complete durable reconciliation confirms a terminal task plus every materialized descendant in the same candidate snapshot
  -> TeamExecutionState validates and stages the one-copy task-projection index plus exact task root
  -> atomically retain terminal task projections, then remove concrete subtree + AgentContexts + graph edges
  -> repair focus within same transaction
  -> reactive typed navigation/history views derive from the committed aggregate state
  -> navigation/history refresh once
```

### 13.12 Draft launch failure

```text
TeamLaunchDraft -> launch/import/config/server failure
  -> no execution context is constructed or registered
  -> draft config, member-address focus, and pending input remain unchanged
  -> actionable launch error
  -> retry creates one fresh server allocation; no provisional run identity is reused
```

### 13.13 Exact Team client command

```text
focused/selected concrete Agent execution
  -> typed Team command factory requires exact executionAddress
  -> SEND_MESSAGE generates message/dedupe IDs and explicit arrays
     OR INTERRUPT generates command ID
     OR APPROVE/DENY uses invocation ID + tracked exact address + explicit reason/null
  -> shared strict client serializer
  -> WebSocket
  -> server shared strict client parser before dispatch
  -> exact Team execution resolver/command owner
  -> send delivery events, interrupt acknowledgement, tool lifecycle event, or typed ERROR
```

Invalid/surplus/aliased commands—including null/missing execution address or removed `approval_token`—stop at server admission and execute no command.

### 13.14 Connection, lifecycle, acknowledgement, and error

```text
Team WebSocket session / TeamRun lifecycle / command result / protocol failure
  -> exact CONNECTED / TEAM_RUN_LIFECYCLE / AGENT_COMMAND_ACK / ERROR builder
  -> shared strict serializer -> browser strict parser
  -> transport session owner / root persistent_team lifecycle owner / command tracker / protocol diagnostic owner
  -> no TeamExecutionState mutation unless the exact message family owns one
```

The WebSocket endpoint and bound server session are the sole root-Team stream scope. `CONNECTED {session_id}` marks application readiness only after successful binding; the browser does not repeat or compare a TeamRun ID already owned by that session. `TEAM_RUN_LIFECYCLE {is_active}` updates only the root `persistent_team` execution in that bound context. Connection/subscription state remains transport-owned; root Team lifecycle belongs to the root `persistent_team` execution record and is not duplicated on `AgentTeamContext`.

### 13.15 External user message

```text
accepted external-channel envelope + resolved exact recipient
  -> TeamLiveMessagePublisher exact EXTERNAL_USER_MESSAGE builder
  -> one execution_address + non-identity external correlation/attachment fields
  -> shared serializer -> WebSocket -> strict browser parser
  -> TeamExecutionState resolves exact AgentContext
  -> recipient transcript projection once
```

The message does not repeat Agent run ID/name/runtime; topology and execution state own those facts.

### 13.16 Exact application producer at Team AgentRun construction

Persistent case:

```text
MixedAgentMemberHandle.ensureReady
  -> derive one exact persistent execution address
  -> node ApplicationExecutionContext is null or producer address must equal it
  -> mismatch fails before AgentRunConfig / AgentRun exists
  -> matching context enters AgentRunConfig unchanged
  -> published artifact / application event / application stream carries that producer
```

Task Agent and Agent-inside-task-AgentTeam case:

```text
MixedAgentMemberHandle.ensureReady
  -> derive exact task execution from typed task-Team chain/task-Agent identity
  -> retain applicationId + bindingId + producer displayName/runtimeKind
  -> replace producer.executionAddress with the exact task execution
  -> rebound context enters AgentRunConfig before create/restore
  -> published artifact / application event / application stream attributes the task execution at source
```

The handle decides task scope only from its already-typed domain execution address (`taskTeamRunIds` non-empty or `taskAgentRunId` non-null). No root/local lookup, consumer-side repair, or second binding record exists.

### 13.17 Initial connection/open/restore Agent status

```text
Team workspace launch/open/restore -> /ws/agent-team connect
  -> server resolves and binds exact TeamRun
  -> exact CONNECTED {session_id}
  -> AgentTeamStreamHandler.sendInitialStatusSnapshot
  -> TeamRuntimeSnapshotService asks TeamRun.getLeafAgentStatusSnapshots()
  -> mixed manager enumerates config-backed offline persistent Agents, materialized persistent/task Agents, and child task-Team Agents
  -> each owning handle/config supplies exact execution address + allocated AgentRun ID
  -> createTeamAgentExecutionBinding + createTeamAgentStatusDetails
  -> immutable TeamAgentStatusSnapshot
  -> direct projectTeamAgentStatusMessage(snapshot), shared with live AGENT_STATUS
  -> exact serializer -> WebSocket -> strict browser parser
  -> TeamExecutionState validates/materializes exact execution as allowed and dispatches the established AgentContext status transition
  -> exact bound-root TEAM_RUN_LIFECYCLE {is_active}
```

The task-Team Agent row carries its genuine allocated member AgentRun ID exactly once. The task-Agent row validates but does not repeat the ID already encoded by its execution address. The persistent row has no transported AgentRun ID. No `TeamRunEvent`, generic `ServerMessage`, legacy `TeamLeafAgentStatusSnapshot`, or independent identity parser appears on this spine.

### 13.18 Pre-run send/delegation status overlay and live replacement

```text
send_message_to/delegate_task -> exact unmaterialized mixed Agent handle
  -> handle owns exact execution address + allocated AgentRun ID before ensureReady()
  -> createTeamAgentExecutionBinding
  -> MemberCommandStatusOverlayStore receives binding + initializing/error facts
  -> store owns TeamAgentStatusDetails by private full execution-address key
  -> TeamAgentStatusSnapshot
  -> createTeamAgentStatusEvent(snapshot)
  -> correlated TeamRun AGENT/AGENT_STATUS publication (inside task activation barrier when applicable)
  -> same projectTeamAgentStatusMessage -> strict serializer/parser
  -> same TeamExecutionState/AgentContext status transition
  -> successful first matching real correlated AGENT_STATUS publication applies real status through the same path
  -> member bridge calls clearAcceptedLiveStatus(binding); exact binding equality deletes only that overlay
```

The overlay never accepts or stores TeamRun ID, display name, runtime kind, raw Agent ID, task instance, or another execution representation. Failed `ensureReady()` may publish exact error details through the same constructor; a subsequent retry or real status cannot clear a different same-logical-address execution because the full execution address is the private key.

### 13.19 Canonical segment lifecycle into Team/browser/application consumers

```text
provider emits START(type) -> CONTENT(no type) -> END(no type)
  -> AgentRunEventDispatchQueue
  -> first AgentSegmentLifecycleEventTransformer + run-owned state
  -> canonical CONTENT(type derived from matching start)
  -> member bridge verifies AgentRun binding
  -> stateless TeamAgentEventAdapter maps exact turn/id/type/delta
  -> correlated Team event -> strict Team DTO/serializer/parser
  -> TeamExecutionState resolves exact AgentContext
  -> browser lookup by {turnId,segmentId}, stored type must agree
  -> append once, or create the exact typed segment when a late subscriber missed start
  -> same canonical Team content may feed the shared pure application text-delta projector
```

Same-type active start is dropped at the AgentRun lifecycle owner; the Team bridge never sees a replay start and therefore never owns reset/metadata-merge policy.

Missing start, unknown/conflicting type, retired turn, content after end, malformed/surplus source fields, and other lifecycle violations become `AGENT_SEGMENT_LIFECYCLE_INVALID` before the Team bridge. The transformer uses the candidate's own explicit turn when present; otherwise it emits runtime diagnostic with null turn:

```text
AgentRun TURN_DIAGNOSTIC(turnId) OR RUNTIME_DIAGNOSTIC
  -> TeamAgentEventAdapter retains exact AgentRunErrorEvidence
  -> Team projector emits required error_scope/error_effect/turn_id fields
  -> strict Team serializer/parser -> Team DTO adapter
  -> AgentContext error handler appends one visible diagnostic row
  -> no open message/segment/tool completion and no Agent-status mutation
  -> application Team projector emits no failure for either diagnostic
```

The standalone Agent wire uses the same required nullable evidence fields and the same browser behavior. Unclassified/connection errors use explicit evidence nulls and preserve their existing behavior. The browser has no optional type, `"text"` default, unknown-to-text factory, type-plus-ID serialized key, ID-only lookup/removal, evidence-dropping Team adapter, or lifecycle correlation. Complete processor/listener, replay/order/cleanup, and diagnostic semantics belong only to [agent-segment-lifecycle-contract.md](./agent-segment-lifecycle-contract.md).

## 14. Authoritative Boundary Rules

Allowed:

```text
TeamStreamingService -> strict contract parser
TeamStreamingService -> TeamExecutionState public transition/query API
TeamExecutionState -> private index/private projector
TeamExecutionState -> immutable TeamTopologySnapshot query API
topology-only UI -> TeamTopologySnapshot query API
UI/stores -> TeamExecutionState public query/view API
Team launch UI/store -> TeamLaunchDraft -> launch owner
TaskDelegationService -> TeamRun task-activation publication lease
TeamRun publication -> TaskActivationEventBarrier
mixed Agent handle/config owner -> createTeamAgentExecutionBinding -> TeamAgentStatusSnapshot
TeamRuntimeSnapshotService -> projectTeamAgentStatusMessage
MemberCommandStatusOverlayStore -> createTeamAgentStatusEvent(snapshot)
AgentRun canonical segment event -> stateless TeamAgentEventAdapter
```

Forbidden:

```text
TeamStreamingService -> raw execution map
UI/store -> raw execution map
UI/store -> JSON.parse(execution key)
UI/store -> topology address-index map
Task projector -> mutable topology children
Run-history store -> task lifecycle mutation
GraphQL hydrator -> direct focus/index mutation
Contract package -> server topology/task policy
TeamLaunchDraft -> TeamExecutionAddress/AgentContext/stream/history/token boundary
TaskDelegationService -> barrier queue/listeners
WebSocket/frontend -> activation reorder buffer or missing-parent inference
TeamRuntimeSnapshotService -> fake TeamRunEvent or generic ServerMessage
status snapshot/overlay/history mapper -> second binding parser/model or root/local fallback
MemberCommandStatusOverlayStore -> mixed manager/config/display/runtime/task-instance identity
TeamAgentEventAdapter/TeamRun/WebSocket/application/browser -> provider-source segment correlation or inferred/default type
```

The task-activation lease is deliberately task-specific. `TaskDelegationService` first enters one FIFO activation sequencer per TeamRun and asks the activation coordinator to prepare and bind a discriminated task Agent or task AgentTeam execution without releasing work. That makes the exact `taskRun.address` available. TeamRun publication then opens its single lease for that address. The service starts the prepared runtime far enough to accept/enqueue the work packet behind the closed execution gate and waits for the preparation-quiescent acknowledgement. It then requires the lease to remain within both limits, constructs and durably writes the active record through an activation-specific throwing persistence method, synchronously commits the ledger/directory, and commits the lease with the matching typed `TASK_DELEGATION_ACTIVATED` event. Lease commit publishes that event first, drains held related events FIFO (including reentrant related publications appended during drain), and closes. The coordinator then opens work execution and the service releases the sequencer. Abort closes the work gate without execution, discards the event queue, settles/unregisters the prepared execution, discards the starting/staged ledger entry, and releases the sequencer.

The ledger privately stages the immutable active-record candidate under the starting task before the durable write. No normal task transition can observe or mutate that candidate. After the write succeeds, promotion to the active entry and directory state is a synchronous non-throwing commit of that exact candidate; no second record is rebuilt. The task-Agent directory and task-Team run directory expose `starting` entries only to activation cleanup and do not resolve them as active. This prevents a prepared Agent or task Team coordinator from opening a nested task/command path before its own activation exists.

The barrier decides relationship only through typed execution-address subtree comparison over the correlated event's address-bearing fields. It holds an event when at least one of its authoritative addresses is the prepared root or its concrete descendant; the root activation event bypasses only its matching lease. Unrelated events publish immediately. There is one open lease per TeamRun because the activation sequencer prevents overlap; task work cannot create a nested lease until its parent gate opens. One configurable maximum count and retained-byte budget bound the lease; the retained-byte measure is UTF-8 length of the immutable plain Team domain-event snapshot and is resource accounting, not a second wire serializer. Overflow makes the activation attempt fail, and nothing from that attempt is published. The barrier state machine is `idle -> holding -> releasing -> idle`; related reentrant publications append during `releasing` and drain in order. It has no timer, disk queue, retry, task ledger, runtime handle, or frontend representation.

`TeamExecutionProjectionMessage` is the exact subset of validated Team messages that may affect Agent/task/member-input execution projection. `TeamStreamingService` becomes a thin orchestration facade: receive raw -> parse -> exhaustively route connection/ack/error/communication to their existing owners or pass that typed subset to `TeamExecutionState` -> execute only returned Agent-dispatch, Team-token, and task-record-refresh effects. Navigation is a derived aggregate query view after the committed change, not an effect or second mutation path. The service does not normalize task aliases, materialize nodes, schedule direct cleanup, or own task state.

## 15. File And Ownership Mapping

### Add

- `autobyteus-team-stream-contracts/` package (`package.json`, `tsconfig`, source/schema files, package build/test) plus root workspace/lockfile registration and exact workspace dependencies from server and web.
- `autobyteus-server-ts/src/agent-team-execution/domain/team-agent-event.ts` — exact correlated Team Agent event/details union.
- `autobyteus-server-ts/src/agent-team-execution/domain/team-agent-execution-binding.ts` — sole persistent/task/task-Team Agent classifier/validator from exact execution address plus allocated AgentRun ID.
- `autobyteus-server-ts/src/agent-team-execution/domain/team-agent-status.ts` — exact status details, immutable status snapshot, details/snapshot constructors, and status-hint derivation reused by live, initial, overlay, and history paths.
- `autobyteus-server-ts/src/agent-team-execution/services/team-agent-event-adapter.ts` — exhaustive standalone-Agent ingress validation/mapping and duplicate-collaboration filter.
- `autobyteus-server-ts/src/services/agent-streaming/team-agent-event-websocket-projector.ts` — exhaustive Team-only projection from correlated Agent input to exact Team wire; exports `projectTeamAgentStatusMessage(snapshot)` for both live `AGENT_STATUS` and direct initial snapshot use and does not reuse/change the generic standalone-Agent mapper.
- `autobyteus-server-ts/src/agent-team-execution/services/task-activation-event-barrier.ts` — focused TeamRun-publication mechanism for one bounded exact task subtree; typed address matching, activation-first commit/FIFO drain, and discard only. It owns no task state or transport retry.
- `autobyteus-web/types/agent/TeamLaunchDraft.ts` — pre-launch config/logical-focus/pending-input model with no run identity.
- `autobyteus-web/services/teamExecution/teamTopologySnapshot.ts` — immutable rooted topology plus private canonical-address index/query owner.
- `autobyteus-web/services/teamExecution/teamRunFrontendProjectionBuilder.ts` — sole all-or-nothing closed canonical metadata/lifecycle/focus/Agent-seed -> topology + persistent execution context builder for launch and restore; it rejects lifecycle inference and incomplete/duplicated seed coverage.
- `autobyteus-web/services/teamExecution/teamExecutionState.ts` — aggregate/transition owner with private execution graph plus one task-ID projection index; staged monotonic record reconciliation and terminal cleanup are atomic, while active/history views derive from the same projections.
- `autobyteus-web/services/teamExecution/teamExecutionModels.ts` — closed execution/view unions, including task executions with only a task-ID reference and the one typed application execution context owned by each concrete Agent execution rather than topology.
- `autobyteus-web/services/teamExecution/teamTaskProjectionMapper.ts` — one exact complete root-scoped GraphQL/task-record-response-to-`TeamTaskProjectionSnapshot` boundary that requires every `taskRun.address`, validates every run chain and target-kind-specific delivery receiver (Agent base address or AgentTeam coordinator ingress), then strips delivery receiver/derived parent/presentation label before aggregate storage; one invalid row rejects the whole snapshot and it has no repository access.
- `autobyteus-web/services/agentStreaming/teamClientMessageFactory.ts` — pure exact command construction, explicit null/arrays, and message/dedupe ID allocation before strict serialization.
- `autobyteus-web/services/teamExecution/teamExecutionTransitions.ts` and `teamExecutionNavigationProjector.ts` — focused private pure support for the aggregate. They are not exported as alternate mutation/coordinator boundaries.

### Modify

- `AgentRun` event/error pipeline boundary and the files owned by [agent-segment-lifecycle-contract.md](./agent-segment-lifecycle-contract.md) — guarantee every Team listener receives only canonical segments or exact four-variant error evidence. Team code imports neither private segment state nor lifecycle status.
- `autobyteus-team-stream-contracts/src/team-agent-message-dtos.ts` — retain the finite segment schema/non-null segment turns and add required nullable `error_scope`, `error_effect`, and `turn_id` to both strict error arms; do not make evidence optional.
- `team-run-event.ts` — correlated variants and singular identity fields.
- mixed Agent member event bridge + `TeamAgentEventAdapter` — verify AgentRun ID once, map canonical segments without state, call the sole error-evidence resolver for `ERROR`, preserve its exact semantic variant/null, call shared status construction, retain run ID only for task-Team binding, and filter duplicate collaboration events.
- `TeamRun.getLeafAgentStatusSnapshots`, Team manager/backend interfaces, `mixed-team-run-backend.ts`, `mixed-team-manager.ts`, and persistent/task/subteam/task-Team handles — return only `TeamAgentStatusSnapshot`; construct it from each owning context/node's exact address and allocated AgentRun ID; include config-backed offline persistent Agents and forward child/task Team snapshots without prefix/rebase/reparse.
- `member-command-status-overlay-store.ts` — accept an already-built binding, store exact details by private full execution-address key, publish via `createTeamAgentStatusEvent(snapshot)`, expose `clearAcceptedLiveStatus(binding)`, and clear only after the first matching typed real status is successfully published, without cast.
- `team-runtime-snapshot-service.ts` + `agent-team-stream-handler.ts` — after exact `CONNECTED`, project each snapshot directly through the shared status projector and send exact contract messages before scoped lifecycle; no fake event or generic Team message.
- `run-history/services/team-run-live-projection-service.ts` — map the same snapshot through one run-history-owned typed list projection, deriving presentation from rooted topology if needed and never reusing generic stream payload/state.
- `task-delegation-activation-coordinator.ts` / task instance registries — split prepare/bind from start and expose one kind-safe abort/settle operation; do not mark the task active before durable record persistence.
- task Agent/task-Team start requests, `task-delegation-service.ts`, ledger, directories, settlement, notification, work packets, and member Team context — use root-TeamRun-scoped task ID plus exact execution address; cross-root lookup accepts `{rootTeamRunId,taskId}` explicitly; derive one non-persisted `ActiveTaskExecutionBinding`; own prepare -> barrier -> start -> durable active-record write -> synchronous in-memory commit -> activation publish/release, with an activation-specific throwing write and exact cleanup on every failure. No synthetic task instance, copied owner/parent/run/time bundle, or generic task context remains.
- `team-run.ts`, backend interfaces, and mixed Team publication owner — expose one task-specific activation-publication lease while keeping the barrier queue/listeners private; all ordinary `publishEvent` calls pass through the barrier.
- `task-delegation-event-publisher.ts` — construct direct typed variants, no unknown publisher; activation uses the exact persisted base/timestamps once and commits through the matching lease, while later variants contain transition/correlation facts only.
- `team-run-event-websocket-message-mapper.ts` — exhaustively route the narrowed TeamRun variants and delegate the already-correlated Agent arm only to `team-agent-event-websocket-projector.ts`; the standalone `agent-run-event-message-mapper.ts` remains independently owned by `/ws/agent` and cannot enter Team egress.
- `team-agent-event-websocket-projector.ts`, standalone `agent-run-event-message-mapper.ts`, browser `messageTypes.ts`/strict parser/`teamStreamDtoAdapters.ts`, `agentStatusHandler.ts`, and application projector — map exact error evidence to required fields, preserve both diagnostics as visible/non-terminal, suppress diagnostic application failure, and retain established terminal/unclassified behavior.
- `autobyteus-application-sdk-contracts/src/application-agent-bindings.ts` / `index.ts` — export the one exact `ApplicationExecutionContext` type beside `ApplicationExecutionProducer`; no address resolver is added to the SDK package.
- server application-orchestration domain context value functions + `team-run-metadata-schema.ts` — alias the SDK type; exactly clone/validate context fields with the server canonical address capability; expose persistent assertion and task rebind values without a generic record.
- `mixed-agent-member-handle.ts` — derive the exact execution address once at AgentRun construction; require a persistent application producer address to match, or replace the producer address for task/task-Team-Agent execution before building `AgentRunConfig`; preserve stable application/binding/display/runtime facts.
- Team broadcaster/egress/handler — exact Team message types and strict client parse.
- frontend protocol entrypoint — import shared DTOs/parser; remove mirrored loose Team types.
- browser segment DTO/identity/handler/type-factory modules — require canonical content type; lookup by exact turn+segment with stored-type verification; allow typed late-subscription creation; remove optional/default/arbitrary type, serialized type+ID key, and ID-only lookup/removal.
- `application-agent-stream-event-projector.ts` — standalone and Team canonical content use one pure exact-text-delta projection; no lifecycle map or type inference.
- `TeamToolApprovalTracker.ts` — rename to `TeamToolApprovalTargetTracker.ts`; retain only invocation-to-execution-address association and remove token storage/access/casts.
- `AgentTeamContext.ts` — composition record with only immutable `TeamTopologySnapshot` plus `executions` owner; no duplicate root/config/lifecycle/hydration/session field or public topology/execution map.
- `AgentContext.ts` plus standalone/Team streaming session owners — keep Agent-local configuration/conversation/status/tool/composer state on the context, but move connection readiness/unsubscribe ownership out to the relevant transport session. Team contexts are constructed once with permanent run identity and never use ID promotion/reconciliation.
- `teamRunConfigStore.ts` (prefer rename to `teamLaunchDraftStore.ts`) — become the sole immutable `TeamLaunchDraft` editor/owner; remove a separate current-config value beside the draft.
- `agentTeamContextsStore.ts` — store launched `{topology,executions}` contexts only under real root TeamRun IDs; remove draft creation/promotion behavior.
- `agentSelectionStore` / workspace selection — use discriminated `team_draft` vs `team_run` subjects; replace draft selection only after canonical server allocation/hydration succeeds.
- launch/hydration/open/history/navigation/mobile/token/presentation/event-monitor/approval consumers — use typed queries/view rows.
- `tokenUsageMeterStore.ts` / Team token handler — add one Team-specific `applyTeamTokenUsage(executionAddress,details)` path keyed by canonical execution address/root scope; do not reconstruct or persist stripped Team wire run-identity fields. Standalone Agent token application remains separate.
- latest `origin/personal` workspace selection seam — preserve selected-TeamRun gating plus exact execution-address equality.

### Remove

- `teamTaskExecutionTree.ts`.
- `teamTaskExecutionProjection.ts`.
- `teamTaskAgentContextProjection.ts`.
- `teamTaskTeamExecutionProjection.ts`.
- `teamTaskExecutionEventRouter.ts`.
- `teamTaskExecutionRestore.ts` after restore is absorbed by the aggregate.
- public `agentExecutionsByKey` and every raw-key parser.
- public `memberNodesByAddress`; its address index becomes private inside `TeamTopologySnapshot`.
- duplicate launched `AgentTeamContext.teamRunId`, mutable `config`, historical-hydration bag, `isSubscribed`, and `unsubscribe`; their facts derive from topology/enter execution state/remain transport-owned.
- `AgentContext.isSubscribed` / `AgentContext.unsubscribe` as connection owners; standalone and Team transport session maps own them. Remove Team `state.runId` assignments, `teamRunMemberIdentityReconciler`, and temporary-to-real context promotion/rebase paths.
- any duplicate mutable Team configuration held outside the selected `TeamLaunchDraft`, plus temporary/real Team selection encoded by one ambiguous string ID.
- task/presentation fields from `TeamRunNodeBase` and `isTaskExecution` branches.
- copied task snapshots on concrete execution records, any separately mutated task-history collection, and stored `taskLabel`; task executions retain only `taskId`, the one task projection remains, and labels/history derive.
- `applicationExecutionContext` from frontend topology/configuration nodes; the persisted aggregate remains unchanged, while the projection builder moves that concrete producer binding to the paired Agent execution and task variants rebind its producer address exactly.
- browser `Record<string,unknown>`/object-only casts for TeamRun `applicationExecutionContext`; the SDK-owned exact type plus projection-boundary mapper replaces them.
- task event camel/snake aliases, arbitrary index signature, unproduced terminal alias, and duplicate `TASK_DELEGATION_STATUS_UPDATED` publisher/variant/DTO/handler branches.
- `TaskAgentInstanceIdentity`, `TaskTeamInstanceIdentity`, `taskAgentInstanceId`, `taskTeamInstanceId`, their deterministic factories/clone helpers, copied task owner/parent/run/timestamp fields, generic Team `task_context`, and separate task activation-result Agent/Team run-ID fields. Current code uses task ID, exact execution address, or actual Agent run ID according to subject.
- Team publication/service acceptance of derived Agent `INTER_AGENT_MESSAGE` / `TEAM_COMMUNICATION_MESSAGE`; canonical `COMMUNICATION` and `MEMBER_INPUT` remain.
- `MEMBER_INPUT.recipient_address` and server builder field.
- `CONNECTED.team_id`/`CONNECTED.team_run_id` and `TEAM_RUN_LIFECYCLE.team_run_id`, because the bound Team stream session is already the root scope.
- frontend-only Team `ToolApprovalTokenPayload`, approval-token map/payload field, related `as any` casts, and manufactured token fixtures; the invocation-to-execution-address tracker remains.
- route-key branches in `agent-status-projection-identity.ts`.
- `buildTargetMemberRunMismatchResult`, `buildTargetMemberNotFoundResult`, and `buildTargetMemberRunInactiveResult`.
- generic Team egress acceptance of `ServerMessage`/`Record<string,unknown>`.
- `agent-team-execution/domain/team-leaf-agent-status-snapshot.ts` and all `TeamLeafAgentStatusPayload`/builder symbols.
- `services/agent-streaming/team-stream-agent-identity-payload.ts` and its generic initial-status mapper.
- `agent-team-execution/services/team-member-command-start-status-events.ts` and its generic payload/event builders.
- `forwardMixedTeamLeafAgentStatusSnapshot` (and its file when no other real responsibility remains); exact snapshots cross child boundaries unchanged.
- temporary TeamRun/AgentRun IDs, draft `AgentContext`/conversation IDs, and draft-to-execution key rebasing.
- optional/arbitrary `SEGMENT_CONTENT.segment_type`, `payload.segment_type ?? "text"`, unknown-segment-to-text factories, type-plus-ID `lookupKey`, ID-only segment lookup/removal, Team/application/browser segment lifecycle maps, and durable provider fixtures that fabricate type on source content/end.
- Team/standalone error evidence loss, optional scope/effect/turn fields, browser all-errors-terminal handling, and application diagnostic-to-failure projection.

File removal may be implemented as deletion or complete absorption into the named owner; no forwarding wrapper remains.

`services/teamExecution/` is a capability boundary, not a streaming subfolder: launch metadata, historical hydration, and live stream inputs all need the same concrete-execution owner. `services/agentStreaming/` retains transport/session orchestration and exact command construction only. It may depend on the public `TeamExecutionState` boundary, while no execution model or transition module may depend on WebSocket transport. The two pure support modules are imported only by `TeamExecutionState`/its same-capability tests; consumers depend on the aggregate/query surface, never the reducers directly.

## 16. Current-Source Allowlist

A repository scan must fail current production code on:

- `source_route_key`, `team_route_key`, `task_team_relative_member_route_key`, `member_route_key`, `memberRouteKey`, `memberPath`, coordinator route names;
- public `recipient_name` / `recipient_path` Team selectors;
- task event alias branches and `[key:string]:any`;
- `agentExecutionsByKey` or `memberNodesByAddress` anywhere in current production or current durable Team tests;
- `JSON.parse(executionKey)` or equivalent current execution-key parsing;
- empty-string Agent/Team run-ID placeholders;
- `temp-team`/draft IDs used as TeamRun/AgentRun IDs, `TeamExecutionAddress`, conversation IDs, or stream/history subjects;
- duplicate Team member-input receiver identity;
- `TeamLeafAgentStatusSnapshot`, `TeamLeafAgentStatusPayload`, `mapTeamLeafAgentStatusSnapshot`, `buildAgentMemberCommandStartStatusEvent`, `buildAgentMemberCommandStatusPayload`, or `forwardMixedTeamLeafAgentStatusSnapshot`;
- Agent-status details carrying TeamRun ID, Agent ID/name, runtime kind, task instance/run aliases, or a second execution address;
- launched-context duplicate root/config/hydration/subscription fields.
- `AgentContext.isSubscribed` / `AgentContext.unsubscribe` connection ownership or Team-time run-ID promotion assignments.
- a task execution carrying a copied task snapshot, a separately mutated task-history collection, or a stored `taskLabel`; only the private one-entry-per-task projection and query-derived label/history are current.
- `TASK_DELEGATION_STATUS_UPDATED` in current Team domain/wire/browser code or fixtures; result submission/review are the sole non-activation task transitions.
- Team `approval_token`/`ToolApprovalTokenPayload`, which have no server producer or consumer.
- derived Agent collaboration event types in the Team event/stream path (they may remain on the standalone Agent stream only).
- `CONNECTED.team_id`/`CONNECTED.team_run_id` and `TEAM_RUN_LIFECYCLE.team_run_id` in current Team server/browser DTO, builder, parser, handler, or durable-current fixtures.
- Agent-bound Team/standalone `ERROR` projection that omits required `error_scope`/`error_effect`/`turn_id`, treats runtime scope alone as terminal, or borrows an active turn for missing-turn input.
- synthetic task Agent/Team instance identity, generic Team `task_context`, separate task activation run-ID results, or redundant token `root_team_run_id`/`member_agent_run_id`/`task_agent_instance_id`/`task_agent_run_id` in current domain/runtime/store/wire code.
- provider-source `SEGMENT_CONTENT`/`SEGMENT_END` carrying `segment_type`; optional canonical content type; `?? "text"`; unknown-type-to-text; browser type-plus-ID `lookupKey`; ID-only segment mutation; or any segment lifecycle registry outside run-owned `AgentSegmentLifecycleState`.

The legacy Team identity-token production scan has this exact allowlist and no directory wildcard:

| Exact target production path | Reason |
| --- | --- |
| `autobyteus-server-ts/src/app-data-migrations/migrations/team-run-member-tree-prerequisite-converter.ts` | Historical flat/memberTree input only |
| `autobyteus-server-ts/src/app-data-migrations/migrations/team-canonical-metadata-converter.ts` | Historical TeamRun input -> current v3 only |
| `autobyteus-server-ts/src/app-data-migrations/migrations/team-canonical-structured-file-converter.ts` | Historical structured Team records only |
| `autobyteus-server-ts/src/app-data-migrations/migrations/team-communication-projection-address-migration.ts` | Historical communication projection only |
| `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-canonical-execution-address-planner.ts` | Historical token `{segments}`/route input planning only |
| `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-canonical-identity-migration-store.ts` | Transactional legacy-column read/update/drop boundary only |

Those six exact paths are the complete released Team legacy-identity production allowlist. The provider-name backfill is attempted before canonical contraction but is not a canonical prerequisite. Its migration-local database reads `SELECT *`; classification sees only the five semantic fields, while preservation sorts the discovered physical columns, excludes only `provider_name`, and compares every other value before/after. It therefore names no obsolete Team identity/display column, remains retry-safe after contraction, and needs no allowlist entry. Both narrow token column-drop definitions are removed; the one canonical store owns physical contraction. Application predecessor data has no allowlist: the unused framework is rewritten directly to current project artifacts/fresh databases, and its prior database migrator is deleted rather than retained.

Non-current application version literals are allowed only in narrow ordinary parser-rejection tests, never in production compatibility/migration code. Definition-authoring `memberName`, unrelated filesystem/router terminology, and historical ticket/report text are excluded by semantic/path scope rather than whitelisted as Team runtime identity. `agentExecutionsByKey`, `memberNodesByAddress`, provisional execution IDs, and current-shape aliases have no production/test allowlist at all; archived ticket prose is outside current-source scope. Private canonical execution serialization/parsing is allowed only in the execution-address capability file and never via caller-owned `JSON.parse(executionKey)`. Generated/vendor/importable project artifacts are scanned as current contract outputs and receive no legacy allowlist.

## 17. Verification Seams

### 17.1 Domain correlation

- Type tests prove every `eventSourceType` narrows its payload without casts.
- Every supported Team Agent subtype narrows its exact details; malformed known payloads become one typed admission error, and adding an Agent enum member breaks the exhaustive adapter.
- Derived Agent `INTER_AGENT_MESSAGE`/`TEAM_COMMUNICATION_MESSAGE` are filtered from Team publication while canonical `COMMUNICATION`/`MEMBER_INPUT` each publish once.
- Each of the three nonduplicated task event types accepts only its details type; removed status/terminal aliases have no variant.
- Adding an event/task variant breaks exhaustive mapping until implemented.
- a raw Agent event whose run ID disagrees with its member handle binding—or with `executionAddress.taskAgentRunId` for a task Agent—is rejected before Team event publication; persistent/task-Agent bindings contain no second run ID, while a task-Team-Agent binding contains exactly that one genuine ID and materializes/validates its frontend execution;
- persistent/task/task-Team live, initial, and pre-run producers all call the same binding constructor; construction rejects address/allocated-ID disagreement before event or snapshot projection, and no other binding classifier exists;
- Team segment variants accept only canonical post-AgentRun events: start/content/end require a non-empty turn, start/content require the finite shared type, content type must be the state-derived start type, and no Team class has lifecycle state or runtime-kind branching;

### 17.2 Producer-to-browser contract

For live AGENT, all three task events, COMMUNICATION, MEMBER_INPUT, and pre-run overlay status:

```text
real producer/builder
  -> TeamRun event capture
  -> real mapper
  -> real serializer
  -> browser strict parser
  -> real TeamExecutionState/consumer
```

Fixtures are captured from mapper output, not hand-invented browser messages. Assertions cover exact execution identity and absence of aliases/duplicates.

For initial connection/open/restore status:

```text
real AgentTeamStreamHandler.connect/open/restore setup
  -> TeamRuntimeSnapshotService
  -> real persistent/task/task-Team mixed status enumeration
  -> TeamAgentStatusSnapshot
  -> projectTeamAgentStatusMessage directly (no TeamRun event)
  -> real serializer
  -> browser strict parser
  -> real TeamExecutionState/AgentContext status consumer
```

The initial seam proves deterministic `CONNECTED -> Agent status snapshots -> root lifecycle` order, identical wire shape to live status, genuine task-Team AgentRun ID exactly once, and no generic TeamRun/name/runtime/raw-ID/task-instance duplicate. A projector spy/test must prove neither `convertTeamRunEventToServerMessage()` nor generic `ServerMessage` is invoked.

Pre-run coverage uses real persistent Agent, task Agent, and Agent-inside-task-AgentTeam handles with no materialized AgentRun. It proves initializing/error construction uses the shared binding/status snapshot and `createTeamAgentStatusEvent`, task activation ordering/barrier remains intact, the exact event reaches the same serializer/parser/status consumer, and the first matching live status removes the overlay while a different same-logical-address execution does not.

Agent producer coverage includes all three bindings. Persistent/task-Agent output forbids `agent_run_id`; task-Team-Agent output requires the verified non-empty ID, strict parsing preserves it once, and the real aggregate materializes the exact missing `task_team_agent` or rejects a kind/address/ID mismatch with zero mutation.

Segment producer coverage begins at the actual provider/native source, not the Team mapper. AutoByteus supplies `start(type) -> content(no type) -> end(no type)` through converter, AgentRun queue/first transformer, complete processor/listener fan-out, Team bridge, strict serializer/parser, and browser AgentContext transition. Codex reasoning and Claude text/tool paths prove one explicit start and minimal later facts. Assertions include exact type enrichment, typed late subscription, two identical deltas retained, active repeated start swallowed, start/end replay, turn/interruption/runtime cleanup, file content not reset and end without type, and zero Team/application/browser lifecycle state.

Diagnostic coverage begins with two malformed provider candidates: one with an explicit turn and one without/empty turn. It proves exact `TURN_DIAGNOSTIC` versus `RUNTIME_DIAGNOSTIC`, unchanged lifecycle status, exact required nullable Team and standalone wire evidence, browser-visible row without message/segment/tool/status terminalization, no application error projection, and no external/compaction/skill/command/lifecycle failure. A fixture that inserts `segment_type` directly on source content is rejected as surplus and cannot satisfy this seam.

Activation-order coverage uses the real task service, activation coordinator, synchronous initializing Agent producer/task-Team child forwarding, Team mapper/serializer, browser parser, and aggregate. It proves: activation is observed before every event from the prepared subtree and before the work packet/task-originated command can execute; unrelated Team events bypass while the lease is open; two concurrent activations on one TeamRun serialize their short critical sections without serializing later task work; related reentrant events retain FIFO order; matching repeated publications remain subject to normal downstream idempotence; and forced runtime-start rejection, activation-write rejection, count overflow, or byte overflow publishes neither activation nor held child events, exposes no starting entry through active resolution, leaves no active ledger/directory entry, and settles/removes the fresh runtime.

### 17.3 Admission rejection

Reject unknown type, missing/extra field, wrong task subtype, invalid execution address, alias-only payload, both alias/current fields, duplicate receiver field, repeated Agent name/runtime identity, null command target, and removed `approval_token`. Assert zero downstream calls/mutations.

Valid control coverage admits exactly `CONNECTED {session_id}` and `TEAM_RUN_LIFECYCLE {is_active}`. A low-level socket-open callback alone does not mark the Team application stream ready; the exact `CONNECTED` handshake does. Lifecycle mutates only the bound context's root persistent-Team record. Adding `team_id`, `team_run_id`, or any other surplus scope field is rejected before either owner changes state.

### 17.4 Execution aggregate

- persistent/task Agent at same logical address remain distinct;
- two task AgentTeams at the same target remain distinct by ordered run chain;
- direct task Agent and task AgentTeam activation persist task identity only as root-TeamRun-scoped `taskId` and concrete execution only as non-null `taskRun.address`; duplicate `task_0001` values in two roots remain unambiguous through their addresses, cross-root query requires `{rootTeamRunId,taskId}`, and the active binding is deep-equal to `{kind,taskId,executionAddress}` derived from that record and is never serialized;
- no-argument submit, settlement, notifications, work-packet delivery, status, tokens, and exact-run messaging use task ID, execution address, or actual Agent run ID according to subject without a synthetic instance ID, copied owner/parent/run/time bundle, or generic `task_context`;
- nested task AgentTeam materializes only the real root and real observed Agents;
- the first task-Team-Agent event carries the exact genuine AgentRun ID once, materializes one record, and a repeated matching event is idempotent while a conflicting ID is rejected without replacing the record;
- no empty run ID can be constructed;
- live and GraphQL restore converge;
- task-record mapping rejects a missing `taskRun.address`, wrong root scope, partial/ambiguous response, an Agent base-receiver mismatch, or an AgentTeam coordinator-ingress mismatch; one invalid row rejects the whole snapshot and it stores neither delivery receiver nor a parent address inside the task projection;
- activation uses the record's exact `createdAt`/`taskRun.startedAt`, derives the projection's initial `updatedAt` from that start fact, creates one deep-equal durable-confirmed active projection, derives its label from content, and publishes no second activation/update clock, repeated base task fields, presentation label, or terminal boolean;
- submission/review live input creates no partial task/timeline entry, returns an unchanged disposition plus the root-bound task-record refresh effect, and complete-root record reconciliation replaces the exact one-copy projection once; result review cannot clean up until a complete terminal snapshot is reconciled;
- reconciliation enforces unique task ID/execution address, immutable base identity/timestamps, monotonic `updatedAt`, deep equality at equal time, stale-row preservation, and append-only retention of known rows absent from a concurrent older query; one conflict rejects the staged snapshot with zero mutation;
- out-of-order/duplicate records/events are idempotent;
- task status/timeline and sender presentation use typed identity; Agent status remains single-owned by AgentContext and is not copied into execution records;
- terminal cleanup removes only the exact subtree and repairs focus; a terminal task-Team row cannot delete an absent/stale/nonterminal materialized descendant, and the committed single task-projection index retains every durable task row from which history derives;
- draft state contains no execution/run identity; successful launch constructs one real execution context and transfers focus/input once, while failure leaves the draft unchanged;
- launch/open input tests prove root lifecycle comes from the exact launch/resume fact rather than metadata inference, initial focus resolves to an Agent, and `fresh`/`loaded`/`historical_unloaded` seeds cover metadata Agents exactly once; missing/duplicate/surplus/AgentTeam seeds or seed-owned run/config/application identity reject the complete build before registration;
- topology contains canonical-v3 logical/node-local launch facts but no run binding; the paired root persistent-Team execution is the only root-ID/lifecycle authority; `AgentTeamContext` contains no duplicate run/lifecycle/config/hydration/session fields;
- topology contains no application producer execution address; every persistent/task Agent execution owns at most one typed application context whose producer address equals that exact execution, including task rebinding from the persistent source assignment;
- the SDK, server alias, and frontend execution field are compile-time identical; malformed/missing/surplus metadata context fields and a non-canonical producer address fail the all-or-nothing projection with no context registration;
- persistent/task AgentContexts consume derived immutable configuration views plus their execution-owned application context and never become a second launch/run authority;
- one real Vue computed/component consumer updates after aggregate live, restore, focus, and cleanup transitions without any public map/revision mutation by the component;
- only Agent rows are focusable; persistent/task Team rows remain expandable groups until a real coordinator Agent execution exists;
- callers cannot access/parse private keys.
- callers cannot receive the internal `TeamConcreteExecution` union/map through a generic getter or iterator; only the named immutable summary/context/navigation query results compile.
- callers cannot access/mutate the topology address index and receive the same node only through `TeamTopologySnapshot.getNode`.

### 17.5 Runtime application producer binding

- a persistent Team Agent with a matching non-null context enters `AgentRunConfig` unchanged; a mismatched producer address fails before AgentRun creation;
- a task Agent preserves application ID, binding ID, display name, and producer runtime kind but its `AgentRunConfig` contains the exact task Agent execution address;
- an Agent inside a task AgentTeam, including a nested task AgentTeam, applies the same rule using the ordered task-Team run chain;
- real published-artifact and application-event/stream producer capture matches each exact constructed execution; and
- null application context remains null. No artifact/event/browser consumer rewrites producer identity.

### 17.6 Product paths

- current browser task Agent/AgentTeam/nested-Team rows, detail panel, sender label, focus/open/history, terminal cleanup, desktop, and mobile scenarios;
- normal Team workspace launch/open/restore connection snapshots for persistent, task-Agent, and task-Team-Agent executions, including config-backed offline members and genuine task-Team AgentRun materialization;
- supported send/delegation to unmaterialized persistent/task/task-Team Agents, initializing/error feedback, task activation order, and matching live-status replacement;
- `MEMBER_INPUT` real delivery reaches the exact recipient transcript once;
- latest base behavior: repeated member addresses across sibling TeamRuns mark a row current only for the selected TeamRun and exact focused execution;
- provider/imported nested-classroom matrix from the existing validation supplement.
- ordinary AutoByteus/Codex/Claude text/tool/reasoning segment output renders without protocol rejection/default text; application text deltas agree between standalone and Team paths; late subscription remains correctly typed.
- both lifecycle diagnostic branches remain visible and non-terminal through Team/standalone browser state, while real terminal/unclassified errors preserve established behavior.

### 17.7 Removal proof

- explicit file/symbol deletion assertions;
- exact six-path production-source allowlist scan plus proof that no application migration/predecessor/compatibility/fallback path remains;
- current token schema/domain/repository/result/event scan proves no parallel root/member/task-run/task-instance identity fields, while migration transaction coverage proves address conversion, obsolete-column/index removal, JSON-root expression-index use, total rollback, and idempotent retry;
- no durable test continues to manufacture removed aliases/placeholders/raw keys;
- no provider source content/end repeats type; no Team/application/browser lifecycle map, optional content type, text fallback, serialized type+ID key, ID-only mutation, evidence-dropping error adapter, all-errors-terminal branch, or fabricated per-content-type boundary fixture remains;
- full source review occurs before paused API/E2E resumes.

## 18. Change Sequence

1. Add strict Team stream contracts and contract tests without routing them into production.
2. Contract task runtime identity to root-TeamRun-scoped task ID + exact execution address, require explicit `{rootTeamRunId,taskId}` at any cross-root boundary, then split activation into prepare/start/commit-or-abort, add the bounded exact-subtree TeamRun publication barrier, require activation persistence, and prove activation-first/failure cleanup with real synchronous producers. Correlate task publisher variants so activation emits the durable base once and later variants emit transition/correlation only. Add the sole Team Agent binding and status-snapshot domain values, cut the exhaustive standalone-Agent ingress adapter plus pre-run overlay to them, filter derived collaboration duplicates, and remove synthetic task instances/context/result run IDs, duplicate domain/status identities/derived task fields, and no-op Team approval tokens.
3. Cut Team server mapper, broadcaster, egress, client handler, `TeamRuntimeSnapshotService`, real mixed status enumeration, and `AgentTeamStreamHandler.sendInitialStatusSnapshot` atomically to the strict contract. Direct initial status and live status share the one projector; delete legacy leaf snapshots/generic initial mapping/command-start builder.
4. Cut browser admission to the same strict contract and remove loose mirrored Team DTOs/aliases.
5. At `MixedAgentMemberHandle`'s existing AgentRun-construction boundary, validate persistent and rebind task-scoped application producer identity before `AgentRunConfig`; prove source attribution with real artifact/application producer seams.
6. Add identity-free `TeamLaunchDraft`, canonical-v3 `TeamTopologySnapshot`, reduced `AgentTeamContext`, `TeamExecutionState`, valid unions, and one task-ID projection index; seed persistent executions only from real topology IDs and keep stream sessions transport-owned.
7. Route typed live Agent/task/member-input events plus strict initial/pre-run Agent statuses through the aggregate and exact communication/control families directly to their assigned owners; all Agent statuses use the same AgentContext transition.
8. Route GraphQL restore/hydration/open and task-record reconciliation through the aggregate; stage unique/immutable/monotonic append-only merges atomically and derive active/history views from the same retained projection.
9. Cut focus, history/navigation, desktop/mobile, token, status/timeline, presentation, approval, and event-monitor callers to typed queries/view rows.
10. Cut the launch path to construct the canonical topology/execution context only after server allocation and transfer pending focus/input once; remove the old temporary TeamRun/AgentRun draft execution path.
11. Cut terminal cleanup to the aggregate.
12. Delete old task projection/tree modules, copied task snapshots/separate history/stored labels, task-instance identity modules/factories/fields, legacy Team leaf-status snapshot/generic initial-status mapper/generic command-start event builder/redundant snapshot bridge, raw map/key consumers, duplicate fields, provisional execution IDs/rebase code, dormant route helpers, redundant current token identity fields/cleanup definitions, and obsolete tests.
13. Establish the run-owned segment lifecycle and error-evidence variants before Team ingress; cut provider source to explicit starts/minimal content/end and the complete post-pipeline consumer set to canonical input. Make active repeated start an owner no-op. Cut Team/standalone error DTOs/projectors/parser/browser/application atomically to exact evidence and non-terminal diagnostics.
14. Replace fabricated Team segment/error fixtures with actual provider -> AgentRun -> processors/listeners -> Team/standalone wire -> browser/application seams. Run the exact live-event, connection/open/restore snapshot, pre-run overlay/replacement, segment/diagnostic, application-producer, draft launch/failure, aggregate, source allowlist, and affected/full build seams, then full cumulative source review.
15. Resume the paused API/E2E round only after source review Pass and after API/E2E resolves its CR-F-043 owned cleanup/evidence prerequisite.

No dual runtime period is designed. Steps may be compiled in checkpoints, but production is switched in one clean cut before review.

## 19. Tradeoffs And Risks

- A dedicated contract package adds one small workspace package, but removes larger duplicated server/browser contracts and makes runtime validation share the exact source of truth.
- Strict parsing will expose producer defects immediately instead of silently projecting partial state. This is intentional; errors are observable and mutation-free.
- One execution aggregate is broader than a small helper because it owns a real lifecycle. Private pure transition/projection modules prevent it becoming a coordination blob while preserving one public authority.
- Not cloning task-Team topology means a task Team initially shows only its real execution root. Concrete children appear when their run IDs are known. This is more truthful than a full-looking invalid tree.
- Separating `TeamLaunchDraft` removes convenient reuse of `AgentContext` before launch, but eliminates synthetic TeamRun/AgentRun/conversation identities and the cross-map promotion transaction. The pending input/focus transfer is one explicit launch-owner operation.
- Large consumer migration risk is controlled by introducing the typed query surface first, cutting consumers by subject, and deleting the raw map only after all compile-time call sites move.
- A persisted application assignment mixes stable binding facts with a concrete producer address. Keeping the recursive disk snapshot is intentional; both server AgentRun construction and browser projection must split/rebind it at their own concrete-execution boundary, and source-attribution tests prevent the server from leaking a persistent address into task artifacts/events.
- Standalone Agent stream generic cleanup is not required; the exhaustive Team ingress adapter is the anti-corruption boundary, and Team domain/egress are fully closed in this ticket.
- Initial connection/open/restore status is deliberately a non-event snapshot projected through the same exact status function. This keeps domain semantics truthful while avoiding a second wire contract. The cost is one projector entrypoint shared by event and snapshot callers, which is smaller than a fake event or duplicate mapper.
- Pre-run status exists before AgentRun materialization, but the mixed handle already owns allocated identity. Passing that typed binding into a details-only overlay prevents fallback lookup and makes replacement exact even when the same logical Agent address has multiple task executions.
- Producer-side activation ordering adds one bounded transient queue, but prevents both browser inference and lost synchronous runtime events. Exact-subtree matching lets unrelated Team traffic continue; count/byte overflow fails and cleans the attempt rather than degrading into partial publication.
- Later task events no longer update timeline immediately from incomplete payloads; they schedule the already-required complete durable refresh. This small refresh latency buys one complete task authority, removes repeated event fields, and makes live/restore/history converge without a transient overlay.
- Append-only task reconciliation retains a known row missing from a concurrently older full response. That is deliberate monotonic merge, not a compatibility fallback: the durable store has no supported record deletion meaning, while equal-time contradiction and terminal-descendant uncertainty still reject atomically.
- Requiring canonical type on every Team content event repeats one derived fact across the wire, but that self-contained projection is intentional: Team/application/browser subscribers can join mid-segment without replaying server state. The authoritative fact is still established once in `AgentRun`; Team transport does not become a lifecycle owner.
- Required nullable error-evidence fields add three values to every error wire payload, but remove ambiguity: null is an explicit unclassified/protocol fact, diagnostics are not inferred from message/code/status, and Team/standalone browser behavior stays identical.

## 20. Forbidden Shortcuts

- Validate only the outer `type` string.
- Cast a generic payload after a switch.
- Keep an `unknown` task payload and validate separately in each consumer.
- Accept camel and snake spellings “temporarily.”
- Manufacture a `TeamRunEvent` for connection/open/restore status, retain a generic initial `ServerMessage`, or create a second status binding/parser/model.
- Let the status overlay accept display/runtime/TeamRun/task-instance identity, derive a binding from route/local fallback, or clear overlays by logical member address alone.
- Start/post a prepared task runtime before opening its exact publication lease, swallow activation-record persistence failure, publish activation around the barrier, use an unbounded queue, or let WebSocket/frontend code wait for or infer the missing task parent.
- Repeat base task content/sender/references, derived label/terminal/latest fields on later task events, create a partial live task/timeline overlay, copy the task snapshot into execution, or maintain a second mutable history collection.
- Recreate a task instance ID from task ID, carry copied owner/parent/task-run/time identity beside `taskRun.address`, emit generic `task_context`, or return separate task Agent/Team run IDs from activation.
- Treat absence from a complete but concurrently older append-only task response as deletion, pick between equal-time conflicting task rows, or clean a terminal task Team without terminal candidates for every materialized descendant in that response.
- Retain `recipient_address` beside `execution_address` for member input.
- Repeat Agent name/runtime/run identity in Team messages when topology/execution address already owns it, or retain derived Agent collaboration events as a second Team path.
- Promote the frontend-only no-op Team approval token into the strict protocol.
- Make the contract package a Team routing or topology dependency.
- Keep topology/task fields optional in one shared node.
- Keep `ApplicationExecutionContext.producer.executionAddress` on frontend topology, pass a persistent producer address into a server task AgentRun, or repair that address later in an artifact/event/browser consumer.
- Clone source topology into task execution state.
- Use empty IDs until an event arrives.
- Treat a draft ID as a TeamRun/AgentRun ID, build draft `TeamExecutionAddress`/`AgentContext`, or rebase provisional execution keys after launch.
- Expose `Map<string,AgentContext>` or serialized keys through the context.
- Keep root TeamRun ID, mutable launched config, hydration state, or WebSocket subscription handles beside their topology/execution/transport owners on `AgentTeamContext`.
- Let both the aggregate and run-history/streaming/hydration code mutate focus or cleanup.
- Add a wrapper around old projection modules instead of deleting/absorbing them.
- Render a serialized key as fallback presentation.
- Allow route-key production code through a broad source allowlist.
- Retain writable token root/member/task-run identity beside canonical execution JSON, perform semantic conversion and column cleanup in separate transactions, or drop predecessor columns through Prisma before app-data planning.
- Put segment correlation in `TeamAgentEventAdapter`, TeamRun, WebSocket sessions, application projectors, or browser transport; add a provider-specific Team branch; put type back on provider content/end; guess text/type/turn from defaults or IDs; accept dual source/canonical shapes; buffer/reorder missing starts; or deduplicate equal deltas.
- Drop Agent error evidence in Team/standalone projection; make error evidence optional; borrow the active turn for a malformed candidate; treat `RUNTIME_DIAGNOSTIC` as runtime terminal; or close browser/application/external/command/output state for either diagnostic.

## 21. Guidance For Implementation

Implement from the spines outward. First establish the one AgentRun segment lifecycle and exact four-variant error evidence, then cut every processor/listener to canonical input before Team ingress. Team adaptation stays stateless and projects required nullable evidence; diagnostics stay visible/non-terminal. Then create/use the one Team Agent execution binding/status snapshot, bind every live/initial/pre-run producer, bind runtime application producers at execution construction, and make the wire/aggregate impossible to misconstruct. Preserve the canonical backend resolver, released-data migration/startup gates, direct V5 application target, provider tool protocol, storage layout, and exact execution-address semantics. Do not revive legacy routes, provisional identity, segment/status defaults, evidence loss, compatibility aliases, application migration/fallback, or consumer-side repair.
