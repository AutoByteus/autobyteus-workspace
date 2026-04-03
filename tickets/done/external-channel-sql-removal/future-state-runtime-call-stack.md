# Future-State Runtime Call Stacks

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v2`
- Requirements: `tickets/in-progress/external-channel-sql-removal/requirements.md` (status `Refined`)
- Source Artifact: `tickets/in-progress/external-channel-sql-removal/proposed-design.md`
- Source Design Version: `v2`
- Referenced Sections:
  - Spine inventory sections: `DS-001`, `DS-002`, `DS-003`
  - Ownership sections: `Ownership Map`, `Change Inventory`

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope | Governing Owner | Source Type | Requirement ID(s) | Design-Risk Objective | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Primary End-to-End | `provider-proxy-set.ts` | Requirement | R-001,R-004 | N/A | File-backed ingress receipt lifecycle and source lookup | Yes/No/Yes |
| UC-002 | DS-002 | Return-Event | `provider-proxy-set.ts` | Requirement | R-002,R-003,R-004 | N/A | File-backed callback delivery-event persistence | Yes/No/Yes |
| UC-003 | DS-003 | Shared SQL Logging Policy | patched `repository_prisma` client factory | Requirement | R-006,R-007 | N/A | Default-off Prisma query logging with explicit opt-in | Yes/No/Yes |

## Transition Notes

- No temporary migration logic is planned in runtime code.
- SQL external-channel providers and schema models are removed directly instead of hidden behind compatibility branches.
- Shared Prisma query logging is controlled at client construction time rather than by per-query wrappers.

## Use Case: UC-001 File-backed ingress receipt lifecycle and source lookup

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `provider-proxy-set.ts`
- Why This Use Case Matters To This Spine: It covers the observed query-heavy receipt lifecycle that currently hits Prisma-backed SQL storage.

### Goal

Persist and query external-channel ingress receipts entirely through the file-backed provider.

### Preconditions

- External-channel services are constructed with the default provider proxy set.
- External-channel storage path is available.

### Expected Outcome

- Receipt lifecycle state and source lookup are stored in JSON files, with no SQL provider selection.

### Primary Runtime Call Stack

```text
[ENTRY] src/external-channel/services/channel-message-receipt-service.ts:createPendingIngressReceipt(...)
└── src/external-channel/providers/provider-proxy-set.ts:getProviderSet() [ASYNC]
    └── src/external-channel/providers/provider-proxy-set.ts:loadFileProviderSet() [ASYNC]
        └── src/external-channel/providers/file-channel-message-receipt-provider.ts:createPendingIngressReceipt(...) [IO]

[ENTRY] src/external-channel/services/channel-message-receipt-service.ts:claimIngressDispatch(...)
└── src/external-channel/providers/file-channel-message-receipt-provider.ts:claimIngressDispatch(...) [IO]

[ENTRY] src/external-channel/services/channel-message-receipt-service.ts:recordAcceptedDispatch(...)
└── src/external-channel/providers/file-channel-message-receipt-provider.ts:recordAcceptedDispatch(...) [IO]

[ENTRY] src/external-channel/services/channel-message-receipt-service.ts:getSourceByAgentRunTurn(...)
└── src/external-channel/providers/file-channel-message-receipt-provider.ts:getSourceByAgentRunTurn(...) [IO]
```

### Branching / Fallback Paths

```text
[ERROR] if dispatch lease token mismatches
src/external-channel/providers/file-channel-message-receipt-provider.ts:recordAcceptedDispatch(...)
└── throw Error("Ingress dispatch lease mismatch ...")
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-003 Default-off Prisma query logging with explicit opt-in

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: `Shared SQL Logging Policy`
- Governing Owner: patched `repository_prisma` client factory
- Why This Use Case Matters To This Spine: It covers the confirmed always-on query logging path that floods normal server logs even when external-channel SQL paths are removed.

### Goal

Instantiate the shared Prisma client without SQL query logging by default, while allowing operators to re-enable query logs explicitly through an environment variable.

### Preconditions

- A Prisma-backed repository domain imports `repository_prisma`.
- Server environment may or may not define the explicit query-log opt-in flag.

### Expected Outcome

- Default environment: Prisma client sets `logQueries = false`.
- Opt-in environment: Prisma client sets `logQueries = true`.

### Primary Runtime Call Stack

```text
[ENTRY] Prisma-backed repository module import
└── patched repository_prisma client factory:resolvePrismaLogLevels() [SYNC]
    ├── reads explicit env flag (for example `PRISMA_LOG_QUERIES`)
    └── returns ["info", "warn", "error"] by default
        └── new PrismaClient({ log: ["info", "warn", "error"] }) [SYNC]
```

### Branching / Fallback Paths

```text
[OPT-IN] if explicit query-log env flag is enabled
patched repository_prisma client factory:resolvePrismaLogLevels() [SYNC]
└── returns ["query", "info", "warn", "error"]
    └── new PrismaClient({ log: ["query", "info", "warn", "error"] }) [SYNC]
```

### Coverage Status

- Primary Path: `Planned`
- Fallback Path: `Planned`
- Error Path: `N/A`

## Use Case: UC-002 File-backed callback delivery-event persistence

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Return-Event`
- Governing Owner: `provider-proxy-set.ts`
- Why This Use Case Matters To This Spine: It covers the remaining SQL delivery-event persistence path.

### Goal

Persist callback delivery events entirely through the file-backed provider.

### Preconditions

- Delivery event service is constructed with the default provider proxy set.

### Expected Outcome

- Callback delivery-event upsert and lookup use JSON files only.

### Primary Runtime Call Stack

```text
[ENTRY] src/external-channel/services/delivery-event-service.ts:recordPending(...)
└── src/external-channel/providers/provider-proxy-set.ts:getProviderSet() [ASYNC]
    └── src/external-channel/providers/provider-proxy-set.ts:loadFileProviderSet() [ASYNC]
        └── src/external-channel/providers/file-delivery-event-provider.ts:upsertByCallbackKey(...) [IO]

[ENTRY] src/external-channel/providers/delivery-event-provider.ts:findByCallbackKey(...)
└── src/external-channel/providers/file-delivery-event-provider.ts:findByCallbackKey(...) [IO]
```

### Branching / Fallback Paths

```text
[ERROR] if callback key is blank
src/external-channel/providers/file-delivery-event-provider.ts:findByCallbackKey(...)
└── throw Error("callbackIdempotencyKey must be a non-empty string.")
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
