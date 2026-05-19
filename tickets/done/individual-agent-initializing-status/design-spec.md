# Design Spec

## Current-State Read

Standalone agent lifecycle is currently split across frontend orchestration and backend runtime objects:

- Frontend `agentRunStore.sendUserInputAndSubscribe()` decides whether a run is new or inactive.
- For inactive existing standalone runs, frontend calls `RestoreAgentRun` and waits for full runtime restore before opening the websocket and sending the user message.
- For new standalone runs, frontend calls runtime-starting `CreateAgentRun` before opening the websocket and sending the first message.
- Standalone websocket `AgentStreamHandler.connect()` requires an active/restored `AgentRun` because it calls `resolveAgentRun()` before creating a stream session.
- Backend `AgentRun.postUserMessage()` emits `Initializing`, but only after active runtime restore/create has completed.

Team members have the healthier boundary: the team run container receives a member command, publishes member `Initializing`, then restores/starts the member runtime and forwards the message. Standalone needs the same backend-owned lifecycle shape at run identity level.

This revised design resolves architecture-review blockers and the post-delivery validation gap:

- AR-002: exact command idempotency/concurrency policy.
- AR-003: exact status projection/overlay lifecycle contract.
- AR-004: exact prepared-new identity activation contract.
- PD-001: command overlay replacement must be command-correlated; restored-runtime readiness snapshots must not leak visible `running` during an inactive-start command.

## Intended Change

Introduce a backend-owned standalone run command/lifecycle boundary:

```text
Frontend sends message to durable run identity
-> backend command coordinator validates command identity
-> backend publishes command-level Initializing
-> backend creates/restores/starts runtime if needed
-> backend treats restored-runtime readiness as internal while command is STARTING
-> backend forwards message to active AgentRun
-> command-correlated live execution status replaces command overlay
```

For new runs, split durable run identity from runtime activation:

```text
PrepareAgentRun(identity only)
-> frontend finalizes attachments and connects stream by runId
-> SEND_MESSAGE activates runtime under backend Initializing
```

Frontend may optimistically show the submitted user message. Backend owns lifecycle status. Visible `running` during inactive-start send must mean command execution has begun, not merely that runtime restore/attachment succeeded.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Architecture Bug Fix
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue + Missing Invariant
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: Frontend currently calls `RestoreAgentRun`/`CreateAgentRun` before send; standalone websocket restores runtime on connect; `AgentRun.postUserMessage()` emits `Initializing` after active runtime exists; team member command overlay emits before member runtime exists. Post-delivery implementation added `clearOverlayForRuntimeOwnedStatus()`, which clears command overlay and publishes `activeRun.getStatusSnapshot()` immediately after restore; this can expose restored Codex readiness as visible `running` before the accepted message is executing.
- Design response: Move standalone create/restore/start/send lifecycle behind `AgentRunCommandCoordinator`; add runId-scoped command overlay, concrete projection service, command id registry, prepared-run activation state, explicit cleanup/failure behavior, and a command-correlated overlay replacement gate. Remove the restore-snapshot status bridge entirely.
- Refactor rationale: A frontend status placeholder or mutation-response patch would preserve the wrong boundary. Backend command lifecycle must be authoritative so runtime status is consistent across UI, history, websocket, and external send clients.
- Intentional deferrals and residual risk, if any: Full backend ownership of context-file upload/finalization is deferred. New-run send may still call `PrepareAgentRun` first so frontend can finalize attachments under a permanent runId; this is identity allocation, not runtime activation.

## Terminology

- `Run identity`: durable runId + metadata/history identity; can exist while runtime is offline or not yet activated.
- `Active runtime`: live `AgentRun` object registered in `AgentRunManager`.
- `Prepared run`: durable run identity with metadata/history but no runtime created yet.
- `Command lifecycle`: backend state for an accepted user command before/during runtime activation and response generation.
- `Command status overlay`: backend runId-scoped `Initializing`/`Error` status independent of active runtime.
- `Projection`: backend visible status read model combining command overlay, active runtime, and metadata fallback.
- `Live runtime status`: status emitted by active `AgentRun` / runtime backend.
- `Runtime readiness status`: internal status proving a runtime/thread/backend has attached or restored; during an accepted inactive-start command this is not visible lifecycle truth.
- `Command-correlated runtime event`: an event that occurs after message handoff for the accepted command and represents that command's execution or terminal result, e.g. command-start `initializing`, `TURN_STARTED`, command-correlated `AGENT_STATUS running`, `idle`, `error`, or equivalent provider evidence.

## Design Reading Order

1. Use-case data-flow span matrix.
2. Command identity/concurrency contract.
3. Projection/overlay lifecycle contract.
4. Prepared-run identity and activation contract.
5. File/interface mapping and migration plan.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths from in-scope send lifecycle.`
- Remove frontend send dependency on `RestoreAgentRun` as a precondition.
- Remove frontend first-message dependency on runtime-starting `CreateAgentRun` as a precondition.
- Remove standalone websocket connection's requirement to restore active runtime before creating a session.
- Remove frontend lifecycle-status optimism from the superseded design.
- Remove frontend history `markRunAsActive -> Running` as a lifecycle source for send path.
- Migrate external standalone message send callers above the runtime boundary to `AgentRunCommandCoordinator`.
- Remove the delivered restore-snapshot bridge (`clearOverlayForRuntimeOwnedStatus` shape) that publishes `activeRun.getStatusSnapshot()` while a STARTING command overlay is active. Do not replace it with a compatibility flag or alternate legacy path.

## Use Case Data-Flow Span Matrix

| Use Case | Data-Flow Span | Governing Owner(s) | Expected Status / Command Behavior |
| --- | --- | --- | --- |
| UC-001 Existing active standalone send | `Composer -> local user message ack -> AgentStreamingService SEND_MESSAGE(message_id,dedupe_key) -> AgentStreamHandler -> AgentRunCommandCoordinator -> active AgentRun.postUserMessage -> runtime backend -> live events -> projection/history/UI` | Frontend store for local message; command coordinator for backend send; active AgentRun for runtime | Same command id idempotent; different command rejected if prior command still in progress; live status authoritative. |
| UC-002 Existing offline standalone send | `Composer -> local ack -> connect websocket by runId without restore -> SEND_MESSAGE -> coordinator validates/dedupes -> overlay Initializing -> AgentRunService.restoreAgentRun -> runtime readiness internal -> active AgentRun.postUserMessage -> command-correlated live events -> overlay cleared -> UI/history` | Command coordinator + overlay/projection | Backend `Initializing` visible before and through restore; no restored-runtime `running` is visible before command execution. |
| UC-003 Completely new standalone first message | `Temp UI context -> validation -> PrepareAgentRun(metadata activationState=PREPARED) -> promote runId -> finalize attachments -> connect websocket -> SEND_MESSAGE -> coordinator transitions PREPARED/ACTIVATING -> activatePreparedRun(create mechanics) -> AgentRun.postUserMessage -> live events` | `PrepareAgentRun` for identity; coordinator for activation/send | Runtime is not created during prepare; first message command owns `Initializing` and activation. |
| UC-004 Slow Codex restore/start | `Coordinator overlay Initializing -> restoreAgentRun internal -> Codex restoreBackend -> CodexThreadManager.restoreThread -> app-server thread/resume -> active AgentRun -> post message -> Codex live turn events` | Command coordinator + Codex backend | `Initializing` spans the entire `thread/resume` delay. |
| UC-005 Status observation/history during activation | `Overlay store -> AgentRunStatusProjectionService -> stream initial snapshot / run-history list -> frontend run-history reconciliation -> selected context/header/sidebar` | Projection service | Projection returns `status=initializing`, `isActive=true`, `lastKnownStatus=ACTIVE`, `statusSource=COMMAND_OVERLAY`, `shouldConnectStream=true`. |
| UC-006 Live runtime replacement | `Command-correlated runtime event after message handoff -> coordinator observer verifies command correlation -> clears overlay -> mapper/broadcaster sends live status -> frontend applies live status -> history projection now active runtime or terminal metadata` | Active AgentRun event pipeline + overlay store | Runtime readiness/snapshot does not clear overlay; only command-correlated live status does. |
| UC-007 Activation failure | `SEND_MESSAGE -> overlay Initializing -> restore/create/post throws or rejects -> coordinator records command FAILED -> overlay Error -> ACK failed -> history projection status=error -> frontend error feedback` | Command coordinator + overlay/projection | No stale initializing; command registry retains failure for same-id retry. |
| UC-008 Same-id retry during activation | `Reconnect/retry SEND_MESSAGE with same runId/message_id -> coordinator finds STARTING/FORWARDED record -> ACK duplicate_in_progress -> no second restore/post` | Command registry | Idempotent, no duplicate message persistence. |
| UC-009 Different-id command during activation | `Second SEND_MESSAGE with different message_id while run has STARTING/FORWARDED command -> coordinator rejects -> ACK rejected RUN_COMMAND_IN_PROGRESS -> no queue/no forward` | Command registry | Different-command queueing is out of scope and explicitly rejected. |
| UC-010 Agent-team member reference | `Team SEND_MESSAGE -> TeamRun.postMessage -> TeamCommandStatusOverlayStore Initializing -> ensure member runtime -> member AgentRun.postUserMessage -> live member events` | Existing team subsystem | Behavior remains reference; no regression. |
| UC-011 External standalone dispatch | `External channel envelope -> channel facade -> AgentRunCommandCoordinator.postUserMessage(command identity derived from envelope id) -> same activation/status/idempotency path -> dispatch result` | External facade + command coordinator | External sends do not bypass restore/status boundary. |
| UC-012 Restored runtime reports running before command execution | `SEND_MESSAGE -> overlay Initializing -> restore returns active runtime snapshot/status running -> coordinator treats readiness status as internal -> activeRun.postUserMessage -> command-correlated TURN_STARTED/running -> overlay clears to Running` | Command coordinator replacement gate | Visible sequence is `offline -> initializing -> running`; never `offline -> initializing -> running -> initializing -> running`. |

## Command Identity / Idempotency / Concurrency Contract (AR-002)

### Client protocol fields

Standalone websocket `SEND_MESSAGE` payload must include:

| Field | Required | Meaning | Validation |
| --- | --- | --- | --- |
| `message_id` | Yes | Client-generated command/message id stable across retries for the same submitted user message. | Non-empty string, max 128 chars, recommended `client_` + UUID/ULID. |
| `dedupe_key` | Yes | Persistence-level dedupe key for this run/message. | Non-empty string, max 256 chars. Frontend format: `agent_run_input:${runId}:${message_id}`. |
| `content` | Yes | User message content. | Existing content validation. |
| `context_file_paths` / `image_urls` | No | Attachments. | Existing attachment validation. |

Backend command idempotency key is `(runId, message_id)`. `dedupe_key` is stored in `AgentInputUserMessage.metadata` and used by persistence/conversation dedupe where applicable; it is not a substitute for command id.

### Command registry states

`AgentRunCommandRegistry` is owned by the coordinator and stores records per run:

| State | Meaning | Busy For Different IDs? | Same-ID Retry Response |
| --- | --- | --- | --- |
| `STARTING` | Overlay published; runtime create/restore not yet ready or message not yet forwarded. | Yes | `duplicate_in_progress` |
| `FORWARDED` | Message accepted/forwarded to runtime; waiting for terminal live status (`idle`, `offline`, or `error`) or command completion signal. | Yes | `duplicate_in_progress` |
| `COMPLETED` | Runtime reached terminal/non-running status for the command. | No | `duplicate_completed` |
| `FAILED` | Activation/post rejected or threw. | No | `duplicate_failed` with original code/message |
| `REJECTED` | Command was rejected before activation, e.g. invalid or busy different id. | No for that id | `duplicate_rejected` |

Retention:

- `STARTING`/`FORWARDED`: retained until terminal transition or explicit failure.
- `COMPLETED`/`FAILED`/`REJECTED`: retained for 15 minutes after terminal timestamp, then purged.
- Scope is one backend process. Cross-process durable exactly-once is out of scope; `dedupe_key` still protects persistence-level duplicates where persisted.

### Concurrent command policy

- Same `(runId, message_id)` while existing record is `STARTING`/`FORWARDED`: idempotent duplicate; no second restore/create/post; return duplicate acknowledgement with current status projection.
- Same `(runId, message_id)` after terminal retention: return duplicate terminal acknowledgement; no second post.
- Different `message_id` while any command for run is `STARTING`/`FORWARDED`: reject immediately with code `RUN_COMMAND_IN_PROGRESS`; do not queue.
- Different `message_id` after prior command is `COMPLETED`/`FAILED`/`REJECTED`: allowed and processed normally.

### Acknowledgement shape

Add websocket server message `AGENT_COMMAND_ACK` for standalone send commands. This is the exact protocol message name for this design; implementation must not introduce a second equivalent acknowledgement name for standalone sends.

```ts
type AgentCommandAckPayload = {
  command_type: 'SEND_MESSAGE';
  run_id: string;
  message_id: string;
  dedupe_key: string;
  state:
    | 'accepted'
    | 'duplicate_in_progress'
    | 'duplicate_completed'
    | 'duplicate_failed'
    | 'duplicate_rejected'
    | 'rejected'
    | 'failed';
  accepted: boolean;
  duplicate: boolean;
  code?: 'RUN_COMMAND_IN_PROGRESS' | 'INVALID_COMMAND_ID' | 'RUN_NOT_FOUND' | 'ACTIVATION_FAILED' | 'RUNTIME_REJECTED' | 'UNKNOWN_ERROR';
  message?: string;
  status?: AgentStatusPayload;
};
```

`RUN_COMMAND_IN_PROGRESS` uses `accepted=false`, `duplicate=false`, `state='rejected'`.
The websocket envelope carrying this payload uses `type='AGENT_COMMAND_ACK'`.

## Projection / Overlay Lifecycle Contract (AR-003)

### Projection output

`AgentRunStatusProjectionService.getRunStatusProjection(runId)` returns:

```ts
type AgentRunStatusSource =
  | 'COMMAND_OVERLAY'
  | 'ACTIVE_RUNTIME'
  | 'PREPARED_IDENTITY'
  | 'HISTORICAL_METADATA'
  | 'TERMINATED_METADATA'
  | 'MISSING';

type AgentRunStatusProjection = {
  runId: string;
  status: AgentApiStatus;
  canInterrupt: boolean;
  isActive: boolean;
  shouldConnectStream: boolean;
  lastKnownStatus: RunKnownStatus;
  statusSource: AgentRunStatusSource;
  statusPayload: AgentStatusPayload;
  command?: {
    messageId: string;
    state: 'STARTING' | 'FORWARDED' | 'FAILED';
    updatedAt: string;
  } | null;
};
```

### Precedence and rules

| Source | Condition | status | canInterrupt | isActive | shouldConnectStream | lastKnownStatus | statusSource |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Command overlay initializing | Overlay has `status=initializing`, including when an active restored runtime snapshot says `running` | `initializing` | false | true | true | `ACTIVE` | `COMMAND_OVERLAY` |
| Command overlay error | Overlay has `status=error` and no active runtime | `error` | false | false | false | `ERROR` | `COMMAND_OVERLAY` |
| Active runtime | `AgentRunManager` has active run and no higher-priority overlay | activeRun snapshot status | activeRun canInterrupt | true | true | `ACTIVE` unless error terminal update has been recorded | `ACTIVE_RUNTIME` |
| Prepared identity | Metadata activationState `PREPARED` and no overlay/active runtime | `offline` | false | false | false | `IDLE` | `PREPARED_IDENTITY` |
| Historical metadata error | Metadata lastKnownStatus `ERROR` | `error` | false | false | false | `ERROR` | `HISTORICAL_METADATA` |
| Historical terminated | Metadata lastKnownStatus `TERMINATED` | `offline` | false | false | false | `TERMINATED` | `TERMINATED_METADATA` |
| Historical idle/offline | Metadata exists, no active runtime, no overlay | `offline` | false | false | false | `IDLE` | `HISTORICAL_METADATA` |
| Missing | No metadata/active/overlay | `offline` | false | false | false | `TERMINATED` or omitted error result | `MISSING` |

`isActive` means “frontend should consider the run live/reconnectable for command/status stream reconciliation,” not only “active runtime object exists.” Thus overlay `Initializing` projects `isActive=true` before runtime registration and continues to override active runtime snapshots until command-correlated replacement.

### Frontend run-history reconciliation

- Frontend must consume backend `status` and `isActive` from projection/list responses.
- Active rows must apply their exact `status` (`initializing`, `running`, `idle`, `error`) rather than forcing `Running` placeholders.
- Rows with `isActive=true` or `shouldConnectStream=true` should keep/connect the command/status stream.
- Rows with `isActive=false` and no selected send in progress should be reconciled to offline/error and disconnected as today.
- `runHistoryStore.markRunAsActive()` must not be called by standalone send path to synthesize `Running`.

### Overlay replacement/clearing

Overlay clearing is session-independent and command-correlated:

- `AgentRunCommandCoordinator` registers a command-scoped observer on the active `AgentRun` immediately after restore/create succeeds and before forwarding the message.
- While the command record is `STARTING`, runtime attachment/readiness status is internal. The coordinator must not clear the overlay or publish visible `running` from `activeRun.getStatusSnapshot()`, restored runtime `isActive`, metadata `lastKnownStatus=ACTIVE`, websocket bind success, or provider readiness status alone.
- The delivered `clearOverlayForRuntimeOwnedStatus(activeRun, runId)` shape is explicitly removed. No replacement method may publish an active runtime snapshot while a STARTING command overlay is active.
- The overlay may be cleared/replaced only by a command-correlated event after message handoff for the accepted command:
  - command-start local `AGENT_STATUS initializing` emitted by `AgentRun.postUserMessage()`; this may replace overlay internally but does not change visible status away from `initializing`;
  - `TURN_STARTED` or command-correlated `AGENT_STATUS running`;
  - command-correlated terminal `idle`, `offline`, or `error`;
  - command activation/post failure handled by the coordinator.
- If a provider cannot supply a turn id before `TURN_STARTED`, the coordinator may use the single in-flight command plus event ordering after `postUserMessage()` handoff as the correlation key. It must not use pre-handoff restore/readiness events.
- On command-correlated `idle`, `offline`, or `error`, command registry transitions current command to `COMPLETED` or `FAILED` as appropriate and updates metadata/history through existing lifecycle processors or explicit coordinator calls.
- This observer is owned by the coordinator/overlay service, not by any websocket session; it runs even if the initiating client disconnects.

## Prepared Run Identity / Activation Contract (AR-004)

### Metadata model

Extend `AgentRunMetadata` with explicit activation state:

```ts
type AgentRunActivationState =
  | 'PREPARED'
  | 'ACTIVATING'
  | 'ACTIVATED'
  | 'ACTIVATION_FAILED';
```

Prepared metadata fields:

| Field | Prepared Value |
| --- | --- |
| `runId` | Generated durable run id. |
| `agentDefinitionId`, `workspaceRootPath`, `llmModelIdentifier`, `llmConfig`, `autoExecuteTools`, `skillAccessMode`, `runtimeKind`, `applicationExecutionContext` | From validated `PrepareAgentRunInput`. |
| `memoryDir` | Reserved from memory layout for runId. Runtime resources are not started. |
| `platformAgentRunId` | `null`. |
| `lastKnownStatus` | `IDLE`. |
| `activationState` | `PREPARED`. |
| `preparedAt` / `preparedExpiresAt` | Timestamps for cleanup; default expiry 24 hours if no command activates it. |

Existing metadata without `activationState` is migrated/normalized to `ACTIVATED` as a data migration/default, not as a behavior compatibility path.

History row on prepare:

- Created with `lastKnownStatus=IDLE`, `status` projected as `offline`, `isActive=false`, `statusSource=PREPARED_IDENTITY`.
- `summary` may use a first-message summary preview from `PrepareAgentRunInput.initialSummary` if provided; otherwise empty.
- Prepared run may be visible in history after prepare, but is cleaned up if abandoned.

### Prepare API

`PrepareAgentRun(input)` validates the same launch config required for current new runs plus optional `initialSummary`; it writes prepared metadata/history and returns:

```ts
type PrepareAgentRunResult = {
  success: boolean;
  message: string;
  runId: string | null;
  activationState: 'PREPARED' | null;
  preparedExpiresAt: string | null;
};
```

It must not call `AgentRunManager.createAgentRun()` or start/restore any provider runtime.

### Activation API below coordinator

Add `AgentRunService.activatePreparedRun(runId): Promise<AgentRun>`:

1. Read metadata and require `activationState` in `PREPARED` or `ACTIVATION_FAILED` and no active runtime.
2. Transition metadata to `ACTIVATING` before runtime create.
3. Build `AgentRunConfig` from prepared metadata.
4. Call `AgentRunManager.createAgentRun(config, runId)`.
5. On success, write metadata `activationState=ACTIVATED`, `platformAgentRunId=activeRun.getPlatformAgentRunId()`, `lastKnownStatus=ACTIVE`.
6. Record history activity/restored/activated row without duplicating the prepared row.
7. Return active run.
8. On failure, write `activationState=ACTIVATION_FAILED`, `lastKnownStatus=ERROR`, publish overlay error via coordinator, and leave metadata for retry/cancel.

How coordinator chooses mechanics:

| Runtime State | Metadata activationState | Active runtime exists? | Coordinator Action |
| --- | --- | --- | --- |
| Active existing | Any | Yes | Use active runtime directly. |
| Prepared new | `PREPARED` / `ACTIVATION_FAILED` | No | `activatePreparedRun(runId)` create mechanics. |
| Currently activating same command | `ACTIVATING` | Maybe no | Same command id returns duplicate in-progress; different id rejected. |
| Historical offline | `ACTIVATED` or migrated default | No | `restoreAgentRun(runId)` restore mechanics. |
| Missing/terminated | Missing or terminated metadata | No | Reject `RUN_NOT_FOUND` or terminated/offline per existing policy. |

### Prepared cleanup/cancel

- Add `CancelPreparedAgentRun(runId)` for frontend best-effort cleanup if attachment finalization, websocket connect, or first `SEND_MESSAGE` fails before activation.
- Cancel only succeeds for `activationState=PREPARED` and no active runtime/command in progress.
- Cancel deletes metadata/history shell, reserved memoryDir if created, and asks context-file cleanup to remove finalized files under that run owner when available.
- Stale cleanup removes `PREPARED` runs older than `preparedExpiresAt` (default 24 hours) with no active command/runtime.
- `ACTIVATION_FAILED` runs are not automatically deleted immediately; they remain visible as error so user can retry/delete. A later explicit delete/archive handles them.

### Existing CreateAgentRun after split

- Frontend first-message send path must stop using runtime-starting `CreateAgentRun`.
- Server-side `CreateAgentRun` is removed from the normal first-message send path. If the API is still needed for an explicit “start empty active runtime” product action, it must be implemented internally as `prepareAgentRun()` + `activatePreparedRun()` so there is one runtime-create path.
- If no product surface owns explicit empty-runtime launch, remove/deprecate the mutation after frontend migration. Either way, normal send must use `PrepareAgentRun` plus websocket `SEND_MESSAGE`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Existing active standalone message | Runtime events returned to UI | `AgentRunCommandCoordinator` | Active path remains correct through new boundary. |
| DS-002 | Primary End-to-End | Existing offline standalone message | Restored runtime handles message and status reaches UI | `AgentRunCommandCoordinator` | Main reported bug path. |
| DS-003 | Primary End-to-End | New standalone first message | Created runtime handles first message and status reaches UI | `PrepareAgentRun` + `AgentRunCommandCoordinator` | Covers new-agent first send. |
| DS-004 | Primary End-to-End | Slow Codex restore | Codex turn/live status reaches UI | Command coordinator + Codex backend | Makes Codex resume visible as initializing. |
| DS-005 | Return-Event | Command overlay status | Stream/history/frontend visible status | `AgentRunStatusProjectionService` | Status before active runtime. |
| DS-006 | Return-Event | Runtime live status | Overlay cleared and UI updated | Coordinator-owned live observer + active AgentRun event pipeline | Session-independent replacement. |
| DS-007 | Bounded Local | Per-run command execution | Serialized restore/start/send result | `AgentRunCommandCoordinator` | Idempotency/concurrency. |
| DS-008 | Comparative Primary | Team member offline send | Member live status reaches UI | Existing `TeamRun` container/overlay | Reference architecture. |
| DS-009 | Primary End-to-End | External channel standalone send | Runtime dispatch result | External facade + `AgentRunCommandCoordinator` | Prevents boundary bypass. |
| DS-010 | Return/Event Guard | Restored runtime reports `running` during inactive-start command | No visible `running` until command-correlated execution | `AgentRunCommandCoordinator` overlay replacement gate | Prevents post-delivery flicker. |

## Primary Execution Spine(s)

- DS-001 active standalone: `Composer -> AgentStreamingService SEND_MESSAGE(message_id,dedupe_key) -> AgentStreamHandler -> AgentRunCommandCoordinator -> command registry -> active AgentRun -> Runtime backend -> AgentRun events -> Stream/UI`.
- DS-002 offline standalone: `Composer -> command stream by runId -> AgentRunCommandCoordinator -> CommandOverlay(Initializing) -> AgentRunService.restoreAgentRun -> AgentRunManager/backend factory -> runtime readiness internal -> AgentRun.postUserMessage -> command-correlated live events -> overlay clear -> Stream/UI`.
- DS-003 new standalone: `Composer temp context -> PrepareAgentRun(PREPARED metadata) -> promote runId/finalize attachments -> command stream -> AgentRunCommandCoordinator -> CommandOverlay(Initializing) -> AgentRunService.activatePreparedRun -> AgentRun.postUserMessage -> live events -> overlay clear -> Stream/UI`.
- DS-009 external standalone: `External channel envelope -> channel facade builds command id -> AgentRunCommandCoordinator -> same active/offline/prepared mechanics -> dispatch result`.
- DS-010 restored-runtime running guard: `CommandOverlay(Initializing) -> restore runtime snapshot/status running -> coordinator classifies as runtime readiness internal -> no visible status change -> command handoff -> command-correlated running/terminal event -> overlay clear -> Stream/UI`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Active message routes through command boundary and forwards to active runtime if no busy command conflicts. | runId, command id, active AgentRun | `AgentRunCommandCoordinator` | dedupe, attachments |
| DS-002 | Offline message publishes initializing, restores runtime internally, then forwards. | run identity, overlay, restore service, active AgentRun | `AgentRunCommandCoordinator` | metadata, workspace, projection |
| DS-003 | New first message prepares identity first, then command activates runtime. | prepared metadata, command overlay, active runtime | `PrepareAgentRun`; coordinator | attachment finalization, cleanup |
| DS-004 | Codex app-server resume is nested under backend initializing. | Codex thread manager, app-server thread | Codex backend under coordinator | provider errors |
| DS-005 | Overlay status is projected before active runtime exists. | overlay payload, projection, history/stream | Projection service | frontend reconciliation |
| DS-006 | Command-correlated live runtime status clears overlay through coordinator-owned observer. | AgentRun event, overlay store, broadcaster | Coordinator/overlay + AgentRun event pipeline | session independence |
| DS-007 | Per-run command registry enforces same-id idempotency and different-id rejection. | message_id, command record, run lock | Command coordinator | TTL cleanup |
| DS-008 | Team path remains reference. | team run, member route, member overlay | Team subsystem | nested teams |
| DS-009 | External channels use same command boundary. | envelope id, runId, command result | External facade + coordinator | ingress persistence |
| DS-010 | Restored-runtime `running` is suppressed until command-correlated execution. | command overlay, runtime readiness snapshot, command event | Command coordinator | provider status mapping |

## Spine Actors / Main-Line Nodes

- Frontend composer/store: local message visibility, validation, identity preparation, attachment finalization.
- `PrepareAgentRun`: durable identity preparation for new runs only.
- `AgentRunCommandCoordinator`: authoritative standalone command and activation boundary.
- `AgentRunCommandRegistry`: per-run idempotency/concurrency state.
- `AgentRunCommandStatusOverlayStore`: runId-scoped command status owner.
- `AgentRunStatusProjectionService`: visible status/isActive/lastKnownStatus/source owner.
- `AgentStreamHandler`: websocket transport/session boundary.
- `AgentRunService` / `AgentRunManager`: runtime create/restore mechanics below coordinator.
- Active `AgentRun`: runtime command/live event owner after activation.
- External channel facades: alternate command callers that must depend on coordinator.

## Ownership Map

- Frontend owns local UX and command submission, not lifecycle truth.
- `PrepareAgentRun` owns durable identity only; it must not start runtime.
- `AgentRunCommandCoordinator` owns command acceptance, idempotency, activation serialization, overlay publication, runtime activation choice, forwarding, and failure status.
- `AgentRunCommandRegistry` owns command state and TTL retention.
- `AgentRunCommandStatusOverlayStore` owns overlay payload storage/publication and clearing API.
- `AgentRunStatusProjectionService` owns projection precedence and frontend/history-visible fields.
- `AgentStreamHandler` owns transport and must delegate lifecycle to coordinator/projection.
- `AgentRunService` remains internal runtime metadata/workspace/create/restore owner behind coordinator.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `agentRunStore.sendUserInputAndSubscribe()` | Backend prepare/command APIs | UI action orchestration | Runtime restore/start/status lifecycle |
| `AgentStreamHandler.connect()` | Status projection/session registry | Websocket transport | Runtime restore policy |
| `PrepareAgentRun` GraphQL mutation | Run identity preparation service | Allocate runId for new runs | Runtime activation/send lifecycle |
| Existing `RestoreAgentRun` mutation | Explicit manual restore only, if retained | Administrative/non-send restore | Message-send precondition |
| External channel facade | `AgentRunCommandCoordinator` | Channel-specific envelope translation | Direct active runtime post/restore |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Frontend send path calling `RestoreAgentRun` | Coordinator owns activation. | `AgentRunCommandCoordinator.postUserMessage`. | In This Change | Required for bug. |
| Frontend first-message path using runtime-starting `CreateAgentRun` | Runtime creation belongs to command lifecycle. | `PrepareAgentRun` + `activatePreparedRun`. | In This Change | `CreateAgentRun` retained only if internally delegated or non-send launch needed. |
| Websocket connect restoring runtime | Stream must observe initializing before restore. | `AgentRunStatusProjectionService` identity/status session. | In This Change | Connect validates metadata/identity only. |
| Restore-snapshot status bridge (`activeRun.getStatusSnapshot()` -> visible status while command STARTING) | Runtime readiness is not command execution and causes `Initializing -> Running -> Initializing` flicker. | Command-correlated overlay replacement gate. | In This Change | Remove entirely; no compatibility fallback. |
| Frontend `markRunAsActive`/Running projection in send path | Backend projection authoritative. | Projection `isActive/status`. | In This Change | Remove generic Running placeholder from send path. |
| Superseded frontend accepted-send status helper/code | Conflicts with backend authority. | Backend overlay. | In This Change | Worktree has obsolete changes; remove before implementation. |
| External channel direct `activeRun.postUserMessage` for standalone sends | Bypasses command lifecycle/status/idempotency. | External facade -> coordinator. | In This Change | Preserve channel-specific envelope handling around coordinator. |

## Return Or Event Spine(s) (If Applicable)

### DS-005 Command Overlay Event Spine

`Coordinator.publishInitializing -> OverlayStore upsert STARTING overlay -> Broadcaster sends AGENT_STATUS(initializing) to sessions -> ProjectionService returns COMMAND_OVERLAY projection for stream/history -> frontend renders Initializing`.

### DS-006 Command-Correlated Runtime Replacement Spine

`Coordinator activates/restores runtime -> registers command-scoped observer -> runtime readiness snapshots/events remain internal while command STARTING -> coordinator hands message to AgentRun.postUserMessage -> command-correlated AGENT_STATUS/TURN_STARTED/terminal event -> observer clears overlay and updates command record -> AgentRunEventMessageMapper/broadcaster sends live status -> ProjectionService falls through to active runtime or terminal metadata`.

The replacement observer is not tied to websocket session lifetime. It is also not a generic active-runtime snapshot bridge.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `AgentRunCommandCoordinator`.
  - Chain: `receive command -> validate message_id/dedupe_key -> registry lookup -> reject/duplicate/accept -> publish initializing -> choose active/prepared/restore mechanics -> register live observer -> forward message -> update registry -> clear/error overlay`.
- Parent owner: `AgentRunStatusProjectionService`.
  - Chain: `project(runId) -> overlay lookup -> active runtime snapshot -> metadata activation/lastKnown fallback -> projection object`.
- Parent owner: `PreparedRunCleanup`.
  - Chain: `scan PREPARED metadata older than expiresAt -> verify no active runtime/command -> remove metadata/history/memoryDir/files`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Context file finalization | DS-001, DS-002, DS-003 | Frontend send + file upload store | Promote draft files to final run owner before command. | Existing file model requires runId. | Backend command lifecycle would expand into file pipeline. |
| Metadata lookup | DS-002, DS-003, DS-005 | Coordinator/projection | Validate identity and choose activation mechanics. | Offline/prepared run exists without runtime. | Stream transport would bypass boundary. |
| Workspace ensure | DS-002, DS-003 | AgentRunService | Ensure workspace before provider create/restore. | Runtime internal requirement. | Frontend/stream would own setup. |
| Command TTL cleanup | DS-007 | Command registry | Bound memory and duplicate retention. | Needed for retries. | Coordinator becomes unbounded state store. |
| Prepared run cleanup | DS-003 | Run identity service | Remove abandoned prepared identities. | Prepare can succeed before send. | History clutter/file leaks. |
| History index update | DS-005, DS-006 | Projection/history service | Reflect overlay/live/failure state. | Sidebar/current tree visibility. | Frontend would invent lifecycle. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Runtime create/restore mechanics | `AgentRunService` / `AgentRunManager` | Reuse behind coordinator | Mechanics exist; caller boundary is wrong. | N/A |
| Runtime live event mapping | `AgentRun` event pipeline / mapper | Reuse | Live events remain authoritative. | N/A |
| Pre-runtime standalone status | Team overlay exists for teams | Create standalone overlay | Identity is runId, not member route/team. | Team overlay should not become mixed subject. |
| Status projection | History/stream have local logic | Create projection service | Need one overlay/active/metadata precedence. | Duplicating in stream/history violates boundary rule. |
| New run identity | Existing `prepareFreshRun` private helper | Extend into public identity prep | Helper already reserves runId/config; must write metadata/history without runtime. | Existing `CreateAgentRun` starts runtime. |
| External sends | External channel facades | Refactor to coordinator | Facades own envelope translation only. | Direct runtime calls bypass lifecycle. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend standalone command lifecycle | Command validation, idempotency, activation, forwarding, failure | DS-001, DS-002, DS-003, DS-007, DS-009 | `AgentRunCommandCoordinator` | Create | New authoritative boundary. |
| Backend status overlay/projection | Command overlays, projection fields, clearing | DS-005, DS-006 | Overlay store/projection service | Create | Concrete AR-003 contract. |
| Prepared run identity | Prepared metadata/history, activation state, cleanup | DS-003 | AgentRunService identity methods | Extend | Concrete AR-004 contract. |
| Backend runtime management | Provider create/restore/start | DS-002, DS-003, DS-004 | AgentRunService/Manager | Reuse | Internal behind coordinator. |
| Standalone websocket transport | Command/status sessions by runId | DS-001, DS-002, DS-005 | AgentStreamHandler | Extend | No restore on connect. |
| Frontend standalone send | Local message, prepare identity, attachments, command send | DS-001, DS-002, DS-003 | agentRunStore | Refactor | Remove lifecycle authority. |
| Run history projection | Visible status/sidebar/history rows | DS-005, DS-006 | Backend history + frontend store | Extend | Consume projection status/isActive. |
| Team lifecycle | Team member command overlay | DS-008 | Existing team subsystem | Reuse | Reference behavior. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-run-command-coordinator.ts` | Backend command lifecycle | Command owner | Validate command id, enforce registry policy, publish overlay, choose active/prepared/restore, forward message, observe live replacement | One command sequencing owner. | Overlay, registry, AgentRunService |
| `agent-run-command-registry.ts` | Backend command lifecycle | Idempotency owner | Per-run command records, busy check, TTL cleanup | Keeps coordinator focused. | Command id types |
| `agent-run-command-status-overlay-store.ts` | Status overlay | Overlay owner | Store/publish initializing/error overlays, expose clear/replace | Standalone counterpart to team overlay. | AgentStatusPayload |
| `agent-run-status-projection-service.ts` | Status projection | Projection owner | Return full projection object | Avoids duplicated precedence. | Overlay, manager, metadata |
| `agent-run-service.ts` | Runtime/metadata service | Runtime mechanics + identity prep | `prepareAgentRun`, `activatePreparedRun`, existing restore/create internals | Existing owner of metadata/workspace/runtime. | Metadata types |
| `agent-run-metadata-types.ts` | Persistence model | Metadata schema | Add activationState/prepared timestamps | Existing metadata type. | Activation enum |
| `agent-stream-handler.ts` | Transport | Websocket boundary | Connect by identity, send initial projection, route commands to coordinator, send ACKs | Existing standalone stream owner. | Projection/coordinator |
| `channel-agent-run-facade.ts` | External channel | Envelope translation | Build command identity and call coordinator | Existing external facade. | Coordinator |
| `agent-run-history-service.ts` | History projection | History list owner | Use projection for status/isActive/source | Existing history service. | Projection service |
| `agentRunStore.ts` | Frontend send | UI orchestration | Prepare identity for new; send message_id/dedupe_key; no restore/create runtime precondition | Existing frontend owner. | Stream/mutations |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Command id validation/result | `agent-run-command-types.ts` | Backend command lifecycle | Stream/external tests need same shape. | Yes | Yes | Loose untyped metadata. |
| Projection output | `agent-run-status-projection-service.ts` | Backend projection | Stream/history use same object. | Yes | Yes | Separate stream/history precedence ladders. |
| Activation state enum | `agent-run-metadata-types.ts` | Persistence model | Prepare/activate/cleanup share it. | Yes | Yes | Guessing from platform id. |
| Command ACK payload | Streaming protocol types | Transport protocol | Frontend/backend agree on exact `AGENT_COMMAND_ACK` message. | Yes | Yes | Generic error-only response. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentStatusPayload` | Yes | Yes | Low | Reuse for overlay/live statuses. |
| `AgentRunStatusProjection` | Yes | Yes | Low after definition | Add exact fields and statusSource. |
| `activationState` | Yes | Yes | Low | Explicit prepared/activation state. |
| `message_id` vs `dedupe_key` | Yes | Yes | Medium | `message_id` command id; `dedupe_key` persistence dedupe. Document and validate. |
| `status` vs `lastKnownStatus` vs `isActive` | Yes after contract | Yes | Medium | Projection contract defines meanings. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-command-coordinator.ts` | Backend command lifecycle | Authoritative command boundary | Command validation, registry decisions, overlay publication, runtime activation, forwarding, command-correlated overlay replacement, failure handling, live observer setup | One coherent lifecycle owner. | Registry, overlay, projection, AgentRunService |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-command-registry.ts` | Backend command lifecycle | Idempotency state owner | STARTING/FORWARDED/COMPLETED/FAILED/REJECTED records and TTL | Keeps policy reusable/testable. | Command types |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-command-status-overlay-store.ts` | Backend status overlay | Overlay owner | RunId overlay upsert/publish/get/clear; error overlay | Mirrors team concept, runId scoped. | Status payload |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-status-projection-service.ts` | Backend projection | Read-side status owner | Full projection object and precedence | One truth for stream/history. | Overlay/manager/metadata |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | Runtime/metadata service | Internal mechanics | `prepareAgentRun`, `activatePreparedRun`, restore/create internals, cancel prepared | Existing metadata/runtime owner. | Metadata types |
| `autobyteus-server-ts/src/run-history/store/agent-run-metadata-types.ts` | Persistence model | Metadata schema | `activationState`, `preparedAt`, `preparedExpiresAt` | Existing metadata type. | Activation enum |
| `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | Transport | Websocket boundary | Identity-only connect; projection initial status; coordinator send; `AGENT_COMMAND_ACK` | Existing standalone transport. | Coordinator/projection |
| `autobyteus-server-ts/src/api/graphql/types/agent-run.ts` | API | GraphQL boundary | `PrepareAgentRun`, `CancelPreparedAgentRun`; adjust/deprecate CreateAgentRun | Existing agent run API surface. | AgentRunService |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts` | History | Run-history read owner | Use projection for status/isActive/lastKnownStatus/statusSource | Existing history service. | Projection service |
| `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-facade.ts` | External channel | External dispatch boundary | Route standalone sends through coordinator with derived command identity | Existing external facade. | Coordinator |
| `autobyteus-web/stores/agentRunStore.ts` | Frontend send | UI send orchestration | Prepare identity, finalize attachments, generate message_id/dedupe_key, connect stream, send command | Existing frontend send owner. | GraphQL/stream |
| `autobyteus-web/services/agentStreaming/AgentStreamingService.ts` | Frontend stream | Client transport | SEND_MESSAGE fields and `AGENT_COMMAND_ACK` handling | Existing client stream owner. | Protocol types |
| `autobyteus-web/stores/runHistoryLoadActions.ts` / `runHistoryStore.ts` | Frontend history | Read model reconciliation | Consume status/isActive exactly; no Running placeholder for send path | Existing history owner. | Backend projection |

## Ownership Boundaries

- `AgentRunCommandCoordinator` is authoritative for standalone message commands. Callers above it must not restore/create runtime directly for send.
- `AgentRunStatusProjectionService` is authoritative for visible status/isActive/lastKnownStatus/source. Stream and history must not each compute precedence.
- `AgentRunService` owns runtime mechanics below the coordinator, including prepared identity activation.
- `AgentStreamHandler` is transport and must not own runtime activation decisions.
- Frontend owns local UI state and command submission only.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentRunCommandCoordinator.postUserMessage` | registry, overlay, restore/create, active runtime forward, command-correlated overlay replacement | websocket handler, external channel facades | direct restore + `activeRun.postUserMessage`; restore snapshot -> visible running | Extend coordinator input/result |
| `AgentRunStatusProjectionService.getRunStatusProjection` | overlay/active/metadata precedence | stream connect, run-history service | separate status/isActive calculations | Extend projection object |
| `AgentRunService.prepareAgentRun` | metadata/history identity prep | GraphQL prepare mutation | runtime-starting create for first send | Add needed identity fields |
| `AgentRunService.activatePreparedRun` | prepared metadata -> runtime create | command coordinator | treating prepared as restore | Extend activation API |
| `AgentStreamHandler.connect` | websocket session setup | frontend stream client | restoring runtime on connect | Delegate to projection/coordinator |

## Dependency Rules

- `AgentStreamHandler` may depend on coordinator and projection; it must not call `AgentRunService.resolveAgentRun()` to restore on connect.
- `AgentRunCommandCoordinator` may depend on command registry, overlay store, projection service, `AgentRunService`, and `AgentRunManager` through service methods. It must not publish `activeRun.getStatusSnapshot()` as visible lifecycle while a STARTING command overlay is active.
- Run history services depend on projection service, not separately on overlay store and active runtime manager.
- Frontend send store may call `PrepareAgentRun` for temp runs and websocket `SEND_MESSAGE`; it must not call `RestoreAgentRun` or runtime-starting `CreateAgentRun` for send lifecycle.
- External standalone send facades must call coordinator.
- Team subsystem stays on team overlay; no mixed standalone/team generic overlay.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `PrepareAgentRun(input)` | New standalone run identity | Validate config, persist prepared metadata/history, return runId | agentDefinitionId, workspace, runtime config, optional initialSummary | No runtime start. |
| `CancelPreparedAgentRun(runId)` | Prepared identity cleanup | Delete unactivated prepared run | runId with activationState PREPARED | Best effort after pre-send failure. |
| `AgentRunCommandCoordinator.postUserMessage(input)` | Standalone message command | Validate/dedupe, activate if needed, forward, ACK/result | runId, message_id, dedupe_key, content, attachments, origin | Main boundary. |
| `AgentRunStatusProjectionService.getRunStatusProjection(runId)` | Visible status projection | Return status/isActive/lastKnownStatus/source | runId | Used by stream/history. |
| `AgentStreamHandler.connect(runId)` | Command/status websocket session | Open by durable identity and initial projection | runId | No restore side effect. |
| `AgentRunService.activatePreparedRun(runId)` | Runtime creation for prepared identity | Create runtime exactly once from prepared metadata | runId | Internal below coordinator. |
| `AgentRunService.restoreAgentRun(runId)` | Runtime restore for activated historical identity | Restore runtime from metadata/platform context | runId | Internal below coordinator for send. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `PrepareAgentRun` | Yes | Yes | Low | Include activationState output. |
| `CancelPreparedAgentRun` | Yes | Yes | Low | Only prepared/no command/no runtime. |
| `postUserMessage` coordinator | Yes | Yes | Low | Require message_id/dedupe_key. |
| `getRunStatusProjection` | Yes | Yes | Low | Return full projection object. |
| `connect(runId)` | Yes | Yes | Low | Validate identity only. |
| Existing `CreateAgentRun` | No for first-message send | Yes | Medium | Remove from send path; delegate or deprecate. |
| Existing `RestoreAgentRun` | Yes as manual restore, not send | Yes | Medium | Remove from send path. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Command boundary | `AgentRunCommandCoordinator` | Yes | Low | Owns commands/activation. |
| Idempotency state | `AgentRunCommandRegistry` | Yes | Low | Separate from overlay. |
| Command overlay | `AgentRunCommandStatusOverlayStore` | Yes | Low | RunId scoped. |
| Projection | `AgentRunStatusProjectionService` | Yes | Low | Full projection object. |
| Prepared identity API | `PrepareAgentRun` | Yes | Medium | Document no runtime activation. |
| Activation state | `AgentRunActivationState` | Yes | Low | Explicit metadata field. |

## Applied Patterns (If Any)

- Command coordinator for backend-owned lifecycle.
- Command registry for idempotency and per-run concurrency control.
- Status overlay for pre-runtime backend status.
- Projection service for read-side status precedence.
- Prepared identity state machine in metadata.
- Session-independent live observer for overlay replacement.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/services/` | Folder | Agent execution services | command coordinator, registry, overlay, projection, prepare/activate methods | Existing standalone run service area. | Team route policy. |
| `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | File | Transport | identity-only stream connect, coordinator send, ACKs | Existing standalone websocket owner. | Restore/start policy. |
| `autobyteus-server-ts/src/api/graphql/types/agent-run.ts` | File | GraphQL API | prepare/cancel mutations, create deprecation/delegation | Existing agent-run API surface. | Send command lifecycle. |
| `autobyteus-server-ts/src/run-history/services/` | Folder | Backend history | projection-backed list rows | Existing history owner. | Overlay precedence duplication. |
| `autobyteus-server-ts/src/external-channel/runtime/` | Folder | External dispatch | route standalone sends to coordinator | Existing external channel area. | Direct runtime lifecycle. |
| `autobyteus-web/stores/agentRunStore.ts` | File | Frontend send | prepare identity, attachments, command send | Existing UI send owner. | Lifecycle truth. |
| `autobyteus-web/services/agentStreaming/` | Folder | Frontend transport | command id payload, ACK handling | Existing stream client. | Runtime lifecycle decisions. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-execution/services` | Main-line domain-control | Yes | Medium | New files must stay narrow: coordinator/registry/overlay/projection. |
| `services/agent-streaming` | Transport | Yes | Low | Transport delegates lifecycle. |
| `run-history/services` | Read projection | Yes | Medium | Depends on projection service. |
| `external-channel/runtime` | External adapter/facade | Yes | Medium | Facades translate envelopes then call coordinator. |
| `autobyteus-web/stores` | Frontend orchestration | Yes | Medium | Store shrinks lifecycle responsibility. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Offline send | `SEND_MESSAGE(message_id=A) -> overlay initializing -> restore -> post`. | `frontend RestoreAgentRun -> wait -> connect -> SEND_MESSAGE`. | Restore is backend lifecycle. |
| Same-id retry | Second `SEND_MESSAGE(message_id=A)` returns `duplicate_in_progress`; no second post. | Retrying calls restore/post again. | Prevents duplicates. |
| Different-id busy | `SEND_MESSAGE(message_id=B)` while A STARTING returns `RUN_COMMAND_IN_PROGRESS`. | Queueing B implicitly or dropping silently. | Policy is explicit and testable. |
| Projection | overlay initializing projects `{status:'initializing', isActive:true, lastKnownStatus:'ACTIVE', statusSource:'COMMAND_OVERLAY'}`. | Status initializing but `isActive=false`, causing frontend disconnect. | Fixes AR-003. |
| New first send | `PrepareAgentRun(PREPARED) -> SEND_MESSAGE -> activatePreparedRun(create)`. | `CreateAgentRun` starts runtime before stream/send. | Fixes AR-004. |
| Live replacement | Coordinator-owned observer clears overlay only on command-correlated runtime execution/terminal events even if websocket disconnected. | Clearing on restored runtime snapshot/readiness. | Prevents false intermediate `running`. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Frontend accepted-send `Initializing` placeholder | Quick UX fix. | Rejected | Backend command overlay. |
| Keep frontend `RestoreAgentRun` before send and add status response | Less stream refactor. | Rejected | Restore internal to coordinator. |
| Keep websocket connect restoring runtime | Minimal backend change. | Rejected | Identity-only connect + projection. |
| Keep restore-snapshot bridge from delivered implementation | It makes runtime readiness visible quickly. | Rejected | Command overlay remains until command-correlated execution event; remove bridge. |
| Queue different command ids during activation | More featureful. | Rejected for this scope | Reject with `RUN_COMMAND_IN_PROGRESS`; future queue requires separate design. |
| Infer prepared-new from `platformAgentRunId=null` | Avoid metadata field. | Rejected | Explicit `activationState`. |
| Reuse team overlay directly | Avoid new store. | Rejected | Standalone runId identity differs. |

## Derived Layering (If Useful)

1. UI layer: local message/draft/attachments only.
2. Frontend transport/API: prepare identity, connect stream, send command.
3. Backend transport/API: GraphQL identity preparation and websocket command sessions.
4. Backend command lifecycle: coordinator, registry, overlay.
5. Backend projection/history: projection service and history integration.
6. Backend runtime: AgentRunService/Manager/provider backends.
7. Backend live events: active AgentRun events and overlay replacement.

## Migration / Refactor Sequence

1. Remove/reset superseded frontend-placeholder implementation changes from the worktree.
2. Add metadata `activationState`, `preparedAt`, `preparedExpiresAt` with migration/default for existing metadata to `ACTIVATED`.
3. Add `AgentRunCommandRegistry` with tests for same-id retry, different-id busy rejection, and 15-minute terminal retention.
4. Add `AgentRunCommandStatusOverlayStore` with initializing/error publish, get, clear, and event tests.
5. Add `AgentRunStatusProjectionService` with projection tests for overlay initializing, overlay error, active runtime, prepared identity, historical error/offline, and missing run.
6. Add `prepareAgentRun`, `activatePreparedRun`, `cancelPreparedAgentRun`, and stale prepared cleanup in `AgentRunService`; refactor existing `createAgentRun` to delegate or deprecate.
7. Add/refine `AgentRunCommandCoordinator` with blocked restore/create tests proving overlay/ACK occurs before restore/create resolves, idempotency works, runtime-readiness `running` snapshots do not clear overlay, and the live observer clears overlay only from command-correlated events independent of websocket.
8. Refactor `AgentStreamHandler.connect()` to validate run identity and send projection snapshot without runtime restore.
9. Refactor `AgentStreamHandler.SEND_MESSAGE` to validate `message_id`/`dedupe_key`, call coordinator, and emit `AGENT_COMMAND_ACK`.
10. Refactor backend run-history service to use projection object for `status`, `isActive`, `lastKnownStatus`, and `statusSource`.
11. Refactor frontend `agentRunStore`: temp run -> `PrepareAgentRun`; existing inactive -> no restore; all sends generate `message_id`/`dedupe_key` and send over stream; remove send-path `markRunAsActive`/Running projection.
12. Refactor frontend `AgentStreamingService` and protocol types for required fields and `AGENT_COMMAND_ACK`.
13. Refactor frontend run-history reconciliation to consume exact backend `status`/`isActive`, connecting streams for overlay-active rows and not forcing Running.
14. Migrate external standalone channel send facades to coordinator.
15. Add API/E2E/manual validation for UC-001 through UC-012, especially offline Codex restore showing backend `Initializing` during `thread/resume` and no intermediate restored-runtime `running` before command-correlated execution.

## Key Tradeoffs

- Rejecting different commands during activation is less flexible than queueing but makes lifecycle and duplicate behavior deterministic for this refactor.
- Prepared identity adds a backend state but avoids frontend runtime-starting create and preserves attachment ownership needs.
- Projection exposes `isActive=true` for overlay initializing even before active runtime exists; this is a semantic shift from “runtime active” to “run should remain connected/reconnectable,” but it matches UI needs and is explicitly sourced by `statusSource`.
- Runtime readiness may be internally `running` while visible lifecycle stays `initializing`; this intentionally separates provider attachment from command execution and matches the stable team-member architecture.
- Keeping durable `lastKnownStatus` coarse avoids persistence migration to transient statuses; visible `status` carries `initializing`.

## Risks

- External channel migration may reveal additional direct runtime send paths.
- Prepared-run cleanup must coordinate with context-file cleanup to avoid orphan files.
- Backend process restart loses in-memory command registry/overlay; current scope guarantees idempotency within one process and relies on dedupe_key/persistence for stored duplicates.
- Existing frontend tests/code from the superseded placeholder approach must be removed to avoid mixed lifecycle authority.
- Delivered implementation contains a restore-snapshot bridge that must be removed, not patched with a compatibility branch.

## Guidance For Implementation

- Implement in backend-first order: registry, overlay, projection, prepare/activate, coordinator, stream.
- Write blocked-promise tests early for restore/create so `Initializing` is asserted before runtime work resolves. Add a restored-runtime-snapshot-`running` test proving no visible `running` is emitted until command-correlated execution begins.
- Do not add frontend lifecycle status optimism.
- Keep standalone overlay runId-scoped; do not mix it with team member route identity.
- Every implementation test should map to the Use Case Data-Flow Span Matrix and acceptance criteria.
