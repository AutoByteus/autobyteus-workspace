# Future Improvements: Task Execution And Team Boundaries

## Status

Future-only design notes. The current contract is already clean-cut and uses
canonical AgentTeam addresses plus exact `TeamExecutionAddress` values. None of
the items below authorizes a compatibility reader, dual writer, generated
identity, or request-time migration fallback.

## Current Healthy Boundary

```text
TaskDelegationService
  owns durable delegated-task records, target selection, review/settlement
  policy, activation bindings, and task-owned reference files.

MixedTeamManager / TeamRun backends
  own runtime lifecycle, exact execution lookup, delivery, interrupt, and
  canonical event publication.

TeamExecutionAddress
  owns public execution identity:
  { rootTeamRunId, taskTeamRunIds, memberAddress, taskAgentRunId }.

Team stream projection
  publishes one strict agent_execution binding for every Agent event.

Frontend Team execution model
  reconciles topology, snapshots, events, focus, commands, and hydration by
  exact serialized TeamExecutionAddress.
```

Logical topology and physical runtime identity stay separate. Rooted
`memberAddress` identifies the logical Agent placement. Ordered
`taskTeamRunIds` and nullable `taskAgentRunId` identify a concrete delegated
execution. AgentRun ids are runtime ownership/evidence, not a substitute for the
Team execution address.

## Candidate Future Improvements

### 1. Return Initial Execution Addresses From Team Creation

The current frontend creates a TeamRun and then hydrates canonical metadata
before it can bind the selected draft member to a concrete execution. A future
mutation result could include the initial structural Agent execution addresses:

```ts
type CreatedTeamAgentExecution = {
  executionAddress: TeamExecutionAddress;
  agentRunId: string;
};
```

This could reduce a startup round trip, provided the result is produced from the
same canonical topology and is still validated during hydration. It must not
carry runtime policy, task policy, legacy route aliases, or a second identity.

### 2. Keep The Frontend Execution Model Decomposed

As the Team execution model grows, keep topology indexing, active execution
reconciliation, focus, task snapshot reconciliation, and Agent-context ownership
in small collaborators. The public store boundary should still expose exact
address operations and immutable snapshots rather than leaking internal maps.

### 3. Extend Strict Event Invariant Matrices

Maintain compact server and frontend matrices that cover every Agent event
family for:

- structural Agents;
- task Agents;
- members of first-level and nested task Teams;
- repeated task execution for one logical member; and
- restored executions after process restart.

Each row should prove strict `agent_execution` shape, exact address preservation,
correct AgentRun binding where applicable, and rejection of missing or foreign
identity. Do not add provider-specific identity repair in the mapper or client.

### 4. Split Orchestrators Before Adding Policy

`MixedTeamManager`, task activation/settlement coordinators, and the frontend
Team execution model are appropriate integration boundaries, but should not
accumulate unrelated persistence, presentation, or authorization policy. Extract
cohesive collaborators before a new behavior would require cross-cutting
conditionals in those owners.

### 5. Evolve Recovery Through Canonical Records

If recovery requirements expand, extend schema-versioned Team metadata and task
records transactionally. Recovery must reconstruct exact addresses from those
canonical records and runtime-owned evidence. It must not infer task identity
from generated AgentRun strings, display names, or directory suffixes.

### 6. Preserve Clean Protocol Naming

New protocol fields should describe current domain facts once. Additions require
one producer, one strict parser, one owner, and one removal plan if temporary.
Never reintroduce path/route/instance aliases beside `TeamExecutionAddress`.

## Non-Goals

These future notes do not propose:

- moving delegated-task acceptance/review policy into Team runtime classes;
- exposing provider-native identity to application consumers;
- frontend reconstruction of missing execution identity;
- compatibility-only transport fields or read-time migration; or
- using display topology as physical persistence lineage.

## Recommendation

Prioritize invariant coverage and cohesive extraction only when concrete change
pressure appears. The current canonical address, strict stream binding, and
schema-v3 persistence contracts should remain the stable boundary.
