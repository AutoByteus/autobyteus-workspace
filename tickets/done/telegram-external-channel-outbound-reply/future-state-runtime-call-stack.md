# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Large`
- Call Stack Version: `v5`
- Requirements: `tickets/in-progress/telegram-external-channel-outbound-reply/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `tickets/in-progress/telegram-external-channel-outbound-reply/proposed-design.md`
- Source Design Version: `v5`
- Referenced Sections:
  - Spine inventory sections: `DS-001` through `DS-007`
  - Ownership sections: `Ownership Map`, `Final File Responsibility Mapping`

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-002 | Bounded Local | continuity owner | Requirement | R-001, R-008 | N/A | Persisted AGENT binding restores cached run after restart | Yes/Yes/Yes |
| UC-002 | DS-002 | Bounded Local | continuity owner | Requirement | R-001, R-008 | N/A | Persisted TEAM binding restores cached run after restart | Yes/Yes/Yes |
| UC-003 | DS-001 | Primary End-to-End | receipt-ledger owner | Requirement | R-002, R-008 | N/A | Inbound external message remains retry-safe through `ACCEPTED` and terminal receipt states | Yes/Yes/Yes |
| UC-004 | DS-001, DS-003 | Primary End-to-End | accepted-dispatch owner | Requirement | R-003, R-008 | N/A | Accepted direct-agent dispatch is durably recorded before reply readiness | Yes/No/Yes |
| UC-005 | DS-004 | Return-Event | outbox durability owner | Requirement | R-004, R-005, R-008 | N/A | Assistant reply is durably enqueued exactly once | Yes/Yes/Yes |
| UC-006 | DS-005 | Bounded Local | retry policy owner | Requirement | R-006, R-008 | N/A | Callback dispatch distinguishes terminal vs retryable failures | Yes/Yes/Yes |
| UC-007 | DS-007 | Bounded Local | persistence-surface owner | Requirement | R-007, R-008 | N/A | File-only external-channel persistence folder and obsolete surfaces stay removed | Yes/N/A/Yes |
| UC-008 | DS-003 | Return-Event | reply-readiness owner | Requirement | R-009, R-008 | N/A | Successful dispatch registers durable accepted-receipt recovery without warning-only bridge ownership | Yes/Yes/Yes |
| UC-009 | DS-006, DS-003 | Return-Event | accepted-receipt recovery owner | Requirement | R-010, R-008 | N/A | Accepted receipt recovers after restart without inbound retry | Yes/Yes/Yes |

## Transition Notes

- Temporary migration behavior needed to reach target state:
  - Receipt providers and SQL schema may need one-time migration logic to add the new `ACCEPTED` state and any accepted-dispatch metadata fields with safe defaults.
  - The accepted-receipt recovery runtime may coexist briefly with the old AutoByteus-only external-channel processors during the implementation cutover, but the processor-owned path must be removed before the Stage 8 gate passes.
- Retirement plan for temporary logic (if any):
  - Once receipt rows are migrated, the new receipt lifecycle becomes the only ingress durability path and the old bridge-owned turn binding path remains removed.
  - Once the shared recovery runtime owns accepted receipts, the AutoByteus-only processor path is removed from startup registration.

## Use Case: UC-001 [Persisted AGENT binding restores cached run after restart]

### Goal

- Reuse the cached `agentRunId` from the binding file whenever the bound AGENT run can be restored.

### Primary Runtime Call Stack

```text
[ENTRY] channel-binding-run-launcher.ts:resolveOrStartAgentRun(...) [ASYNC]
├── check bindingRunRegistry.ownsAgentRun(...) + agentRunManager.getActiveRun(...)
├── agent-run-service.ts:restoreAgentRun(cachedAgentRunId) [ASYNC]
├── channel-binding-service.ts:upsertBindingAgentRunId(cachedAgentRunId) [ASYNC]
└── # returns cached/restored run id
```

### Fallback / Error Paths

```text
[ERROR/FALLBACK] if restore fails
resolveOrStartAgentRun(...)
├── agentRunService.restoreAgentRun(...) # throws
├── agentRunManager.createAgentRun(...) [ASYNC]
└── channelBindingService.upsertBindingAgentRunId(newRunId) [ASYNC]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 [Persisted TEAM binding restores cached run after restart]

### Goal

- Reuse the cached `teamRunId` from the binding file whenever the bound TEAM run can be restored.

### Primary Runtime Call Stack

```text
[ENTRY] channel-binding-run-launcher.ts:resolveOrStartTeamRun(...) [ASYNC]
├── check bindingRunRegistry.ownsTeamRun(...) + teamRunService.getTeamRun(...)
├── team-run-service.ts:restoreTeamRun(cachedTeamRunId) [ASYNC]
├── channel-binding-service.ts:upsertBindingTeamRunId(cachedTeamRunId) [ASYNC]
└── # returns cached/restored team run id
```

### Fallback / Error Paths

```text
[ERROR/FALLBACK] if restore fails
resolveOrStartTeamRun(...)
├── teamRunService.restoreTeamRun(...) # throws
├── teamRunService.createTeamRun(...) [ASYNC]
└── channelBindingService.upsertBindingTeamRunId(newTeamRunId) [ASYNC]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 [Inbound external message remains retry-safe through `ACCEPTED` and terminal receipt states]

### Goal

- Ensure the receipt ledger can safely resume work after partial failure without reposting the same external message once runtime acceptance already happened.

### Expected Outcome

- Receipt lifecycle becomes `PENDING -> DISPATCHING -> ACCEPTED -> ROUTED` or `UNBOUND`.
- `ACCEPTED` remains durable unfinished work until reply publication completes.
- Retries against `PENDING`, expired `DISPATCHING`, or `ACCEPTED` resume the same receipt row.
- Retries against terminal `ROUTED` or `UNBOUND` return a duplicate/terminal disposition without redispatch.

### Primary Runtime Call Stack

```text
[ENTRY] channel-ingress-service.ts:handleInboundMessage(...) [ASYNC]
└── channel-thread-lock-service.ts:withThreadLock(envelope.routingKey, ...) [ASYNC]
    ├── channel-message-receipt-service.ts:beginOrResumeIngress(...) [ASYNC]
    ├── channel-binding-service.ts:resolveBinding(...) [ASYNC]
    ├── channel-message-receipt-service.ts:claimIngressDispatch(...) [ASYNC]
    ├── channel-run-facade.ts:dispatchToBinding(binding, envelope) [ASYNC]
    ├── channel-message-receipt-service.ts:recordAcceptedDispatch(...) [ASYNC]
    └── accepted-receipt-recovery-runtime.ts:registerAcceptedReceipt(receipt) [ASYNC]
```

### Fallback / Error Paths

```text
[FALLBACK] if the receipt is already ACCEPTED from an earlier partial failure
handleInboundMessage(...)
└── accepted-receipt-recovery-runtime.ts:registerAcceptedReceipt(receipt) [ASYNC]
```

```text
[FALLBACK] if the receipt is recent DISPATCHING
beginOrResumeIngress(...)
└── # returns in-flight duplicate; ingress does not redispatch while the lease is valid
```

```text
[ERROR/TERMINAL] if no binding is found
handleInboundMessage(...)
├── channelBindingService.resolveBinding(...) # returns null
└── channelMessageReceiptService.markIngressUnbound(...) [ASYNC]
```

```text
[TERMINAL DUPLICATE] if the same message retries after ROUTED or UNBOUND
beginOrResumeIngress(...)
└── # returns terminal disposition without redispatch
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-004 [Accepted direct-agent dispatch is durably recorded before reply readiness]

### Goal

- Ensure direct AGENT external dispatch produces durable accepted-turn metadata before any live reply observation step.

### Expected Outcome

- Successful direct-agent dispatch returns a non-null `turnId`.
- The receipt ledger records `agentRunId + turnId` as `ACCEPTED` before any recovery-runtime registration happens.
- If `turnId` is unavailable, direct AGENT dispatch fails instead of continuing with a warning-only path.

### Primary Runtime Call Stack

```text
[ENTRY] channel-agent-run-facade.ts:dispatchToAgentBinding(...) [ASYNC]
├── channel-binding-run-launcher.ts:resolveOrStartAgentRun(...) [ASYNC]
├── AgentRun.postUserMessage(...) [ASYNC]
├── require result.accepted && result.turnId
└── # returns AcceptedAgentDispatch { agentRunId, turnId, dispatchedAt }
```

```text
[PERSISTENCE] channel-ingress-service.ts:handleInboundMessage(...) [ASYNC]
└── channel-message-receipt-service.ts:recordAcceptedDispatch(...) [ASYNC]
    └── *-channel-message-receipt-provider.ts:recordAcceptedDispatch(...) [IO]
```

### Error Path

```text
[ERROR] if direct-agent runtime returns accepted without turnId
dispatchToAgentBinding(...)
└── throw/reject external dispatch before receipt reaches ACCEPTED or ROUTED
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Not Required`
- Error Path: `Covered`

## Use Case: UC-005 [Assistant reply is durably enqueued exactly once]

### Goal

- Ensure one durable outbox work item exists per callback idempotency key for the assistant reply.

### Primary Runtime Call Stack

```text
[ENTRY] reply-callback-service.ts:publishAssistantReplyByTurn(...) [ASYNC]
├── channel-message-receipt-service.ts:getSourceByAgentRunTurn(agentRunId, turnId) [ASYNC]
├── channel-binding-service.ts:isRouteBoundToTarget(...) [ASYNC]
├── gateway-callback-outbox-service.ts:enqueueOrGet(callbackKey, envelope) [ASYNC]
└── delivery-event-service.ts:recordPending(...) [ASYNC, observational]
```

### Fallback / Error Paths

```text
[FALLBACK] duplicate publish request
enqueueOrGet(...)
└── # returns duplicate=true without creating a second durable record
```

```text
[ERROR] missing route source or empty reply
publishAssistantReplyByTurn(...)
└── # returns skip reason without enqueue
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-006 [Callback dispatch distinguishes terminal vs retryable failures]

### Goal

- Ensure permanent gateway callback failures dead-letter immediately while transient failures continue through retry.

### Primary Runtime Call Stack

```text
[ENTRY] gateway-callback-dispatch-worker.ts:dispatchLease(...) [ASYNC]
├── gateway-callback-publisher.ts:publish(envelope) [ASYNC]
│   └── # throws GatewayCallbackPublishError { retryable, statusCode }
├── if retryable -> outboxStore.markRetry(...)
└── else -> outboxStore.markDeadLetter(...)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-007 [File-only external-channel persistence folder and obsolete surfaces stay removed]

### Goal

- Keep all file-backed external-channel artifacts under one top-level `server-data/external-channel/` folder.

### Primary Runtime Call Stack

```text
[ENTRY] external-channel storage helper resolution [ASYNC]
└── resolve top-level file paths:
    ├── serverData/external-channel/bindings.json
    ├── serverData/external-channel/message-receipts.json
    ├── serverData/external-channel/delivery-events.json
    └── serverData/external-channel/gateway-callback-outbox.json
```

### Error Path

```text
[ERROR] obsolete SQL binding storage requested
provider-proxy-set.ts
└── # no active DB-backed binding provider exists
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-008 [Successful dispatch registers durable accepted-receipt recovery without warning-only bridge ownership]

### Goal

- Ensure ingress never depends on warning-only bridge arming to acknowledge successful routed dispatch.

### Preconditions

- Runtime acceptance produced accepted metadata and the receipt row was persisted as `ACCEPTED`.

### Expected Outcome

- Ingress persists the accepted receipt and registers it with the accepted-receipt recovery runtime.
- The HTTP ingress response may conclude successfully once that durable recovery registration succeeds.
- The receipt row itself remains `ACCEPTED` until reply publication later settles it to `ROUTED`.

### Primary Runtime Call Stack

```text
[ENTRY] channel-ingress-service.ts:handleInboundMessage(...) [ASYNC]
└── channel-thread-lock-service.ts:withThreadLock(...) [ASYNC]
    ├── channel-run-facade.ts:dispatchToBinding(...) [ASYNC]
    ├── channel-message-receipt-service.ts:recordAcceptedDispatch(...) [ASYNC]
    └── accepted-receipt-recovery-runtime.ts:registerAcceptedReceipt(receipt) [ASYNC]
```

### Fallback / Error Paths

```text
[ERROR] if accepted receipt cannot be registered with the shared recovery runtime
handleInboundMessage(...)
└── # ingress fails instead of claiming durable reply readiness
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-009 [Accepted receipt recovers after restart without inbound retry]

### Goal

- Ensure the server can restart after runtime acceptance and still resume the same accepted turn without depending on another inbound webhook retry.

### Preconditions

- A receipt already exists in `ACCEPTED` with accepted dispatch metadata.
- The original user message has already been accepted by the runtime and must not be reposted.

### Expected Outcome

- Process boot reloads unfinished accepted receipts from durable storage.
- If the reply is already complete, the system publishes the exact turn reply from persisted traces without live events.
- Otherwise it restores/looks up the live run, arms the appropriate reply bridge again, and keeps the receipt `ACCEPTED` until publication completes.

### Primary Runtime Call Stack

```text
[ENTRY] app.ts:start(...) [ASYNC]
└── accepted-receipt-recovery-runtime.ts:start() [ASYNC]
    ├── channel-message-receipt-service.ts:listAcceptedReceipts(...) [ASYNC]
    ├── accepted-receipt-recovery-runtime.ts:registerAcceptedReceipt(receipt) [ASYNC]
    ├── channel-agent-run-reply-bridge.ts:resumeAcceptedTurn(...) [ASYNC]
    ├── channel-team-run-reply-bridge.ts:resumeAcceptedTurn(...) [ASYNC]
    └── agent-memory / run-history turn-scoped reply resolver [ASYNC]
```

### Fallback / Error Paths

```text
[FALLBACK] if persisted turn reply is already complete
accepted-receipt-recovery-runtime.ts:registerAcceptedReceipt(...)
├── turn-scoped reply resolver -> exact reply text
└── reply-callback-service.ts:publishAssistantReplyByTurn(...) [ASYNC]
```

```text
[FALLBACK] if reply is not complete but the run is active or restorable
accepted-receipt-recovery-runtime.ts:registerAcceptedReceipt(...)
└── reply bridge arms live subscription for the accepted turn
```

```text
[ERROR] if recovery cannot yet arm or recover the reply
accepted-receipt-recovery-runtime.ts:registerAcceptedReceipt(...)
└── # receipt remains ACCEPTED for later retry by the runtime loop
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`
