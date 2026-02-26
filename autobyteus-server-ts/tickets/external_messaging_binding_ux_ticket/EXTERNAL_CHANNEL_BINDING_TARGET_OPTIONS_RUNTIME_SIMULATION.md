# Simulated Runtime Call Stacks (Server Target Options)

## Simulation Basis
- Design source:
  - `/Users/normy/autobyteus_org/autobyteus-server-ts/tickets/external_messaging_binding_ux_ticket/EXTERNAL_CHANNEL_BINDING_TARGET_OPTIONS_DESIGN.md`

## Conventions
- Frame: `path/to/file.ts:functionName(...)`
- Tags: `[ENTRY] [ASYNC] [STATE] [IO] [FALLBACK] [ERROR]`

## Use Case 1: Query Active AGENT Targets

```text
[ENTRY] src/api/graphql/types/external-channel-setup.ts:externalChannelBindingTargetOptions()
└── src/external-channel/services/channel-binding-target-options-service.ts:listActiveTargetOptions() [ASYNC]
    ├── src/agent-execution/services/agent-run-manager.ts:listActiveInstances() [STATE]
    ├── src/agent-execution/services/agent-run-manager.ts:getAgentRun(id) [STATE]
    └── service maps each active agent -> {targetType: AGENT, targetId, displayName, status} [STATE]
```

Verification:
- End-to-end setup target discovery: Pass
- Separation of concerns: Pass

## Use Case 2: Query Active TEAM Targets

```text
[ENTRY] external-channel-setup.ts:externalChannelBindingTargetOptions()
└── channel-binding-target-options-service.ts:listActiveTargetOptions() [ASYNC]
    ├── src/agent-team-execution/services/agent-team-run-manager.ts:listActiveInstances() [STATE]
    ├── src/agent-team-execution/services/agent-team-run-manager.ts:getTeamRun(id) [STATE]
    └── service maps each active team -> {targetType: TEAM, targetId, displayName, status} [STATE]
```

Verification:
- Team branch complete: Pass
- No resolver-level runtime coupling smell: Pass

## Use Case 3: Stale Or Empty Runtime State

```text
[ENTRY] external-channel-setup.ts:externalChannelBindingTargetOptions()
└── channel-binding-target-options-service.ts:listActiveTargetOptions() [ASYNC]
    ├── listActiveInstances() returns ids [STATE]
    ├── [FALLBACK] get*Instance(id) => null for stale id -> skip [STATE]
    └── returns [] when no valid active target exists [STATE]
```

Verification:
- Empty-state behavior deterministic: Pass
- No hidden failure branch in setup UX flow: Pass

## Use Case 4: Reject Stale Target During Binding Save

```text
[ENTRY] src/api/graphql/types/external-channel-setup.ts:upsertExternalChannelBinding(input)
└── src/external-channel/services/channel-binding-target-options-service.ts:isActiveTarget(targetType, targetId) [ASYNC]
    ├── [FALLBACK] true -> continue upsert path
    │   └── src/external-channel/services/channel-binding-service.ts:upsertBinding(input) [ASYNC][IO]
    └── [ERROR] false -> throw TARGET_NOT_ACTIVE validation error
```

Verification:
- Stale-selection failure is caught at setup boundary: Pass
- Binding service concern remains persistence-only: Pass

## Design Smell Check
- Resolver doing orchestration/business logic: Avoided (delegated to service)
- Cross-module leakage: None detected
- Public API ambiguity: None detected
