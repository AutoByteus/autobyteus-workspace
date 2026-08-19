# TeamRun Persistence Scenarios

## Status

- Status: `User Approved — normative schema and cross-file examples validated for architecture review`
- Scope: the exact target shapes of the three root-TeamRun JSON authorities
- Governing contract: `../team-run-persistence-architecture-contract.md`
- Approval applicability: intended-behavior supplement; user approval applies with the requirements package

## Exact File Set

Every case directory contains exactly:

```text
team_run_execution_tree.json
task_delegation_records.json
team_communication_messages.json
```

The examples are normative. An implementation may use different in-memory classes, but its persisted JSON must accept these shapes exactly, reject unknown fields, and preserve their cross-file invariants.

## Scenario Matrix

| Case | Execution-tree fact | Task-record fact | Communication fact |
| --- | --- | --- | --- |
| `case-001-persistent-only` | Root, nested persistent AgentTeams, persistent Agents, launch configuration, coordinator addresses, and handoffs | Empty records | Empty messages |
| `case-002-active-task-agent` | One live task Agent hosted by the persistent Team execution that owns the target placement | Active Agent task selected by absolute logical recipient and linked by exact AgentRun ID | Persistent AgentRun sends to the exact task AgentRun |
| `case-003-nested-task-team` | One live task AgentTeam, its fresh TeamRun/AgentRun bindings, a configured descendant TeamRun, and a nested task Agent hosted in that same task subtree | Team delegation plus a nested Agent delegation; the latter is awaiting review with a submission | Nested task AgentRun sends to the task Team coordinator AgentRun |
| `case-004-settled-task` | Retained settled task Agent execution | Accepted task with submission and accepting review | Empty messages |
| `case-005-restart-interruption` | Retained task Agent settled during restart recovery | Interrupted task with one durable interruption update | Empty messages |

## Reading Rules

1. `address` is always one canonical absolute logical placement; `/` is structural root syntax and never a recipient value.
2. `agentRunId` and `teamRunId` are the only concrete execution identities.
3. Tree nesting is the only source of concrete runtime containment and ancestry.
4. `recipientAddress` is deliberately retained on a task record because it states the chosen logical target; it is not the concrete execution identity.
5. `taskExecution` refers to one fresh task root structurally as either `{ "agentRunId": ... }` or `{ "teamRunId": ... }`.
6. A Team-target delegation returns the task Team coordinator's `agentRunId`; that value is derived from the execution tree and configured `coordinatorAddress`, not copied into the task record.
7. Ordinary message endpoints are exact AgentRun IDs. Messages do not create topology or task edges.
8. Task execution bindings inherit immutable definition and launch facts from their addressed configured placement. Those facts are not repeated on task nodes.
9. Task `status` is retained as the directly readable current business state; `updates` is the immutable transition evidence.
10. A settled task execution remains in the execution tree for history but is excluded from the live frontend execution projection.

## Validation Evidence

A disposable strict validator was run on all 15 JSON files. It checked exact keys, schema versions, canonical non-root addresses, coordinator membership, direct logical containment, unique run IDs, structural Agent/AgentTeam discrimination, task-to-execution correlation, nearest-containing-scope plus configured-descendant host selection, lifecycle/settlement consistency, and exact message endpoints.

Recorded result:

```text
PASS {'files': 15, 'agents': 43, 'teams': 22, 'taskRoots': 5, 'tasks': 5, 'messages': 2}
```

The validator is intentionally not a repository artifact. The durable implementation must provide project-native validators and tests for the same contract.
