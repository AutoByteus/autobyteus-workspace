# TeamRun V1 Persistence Fixtures

## Purpose

- Ownership: `autobyteus-server-ts` durable test fixtures
- Scope: exact current-schema examples for the three root-TeamRun JSON authorities
- Consumers: app-data migration, V1 package validation, streaming, and execution-view tests
- Maintenance rule: keep each case valid under the project-native V1 schemas and cross-file package validator

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

## Validation

The repository's V1 package-schema suite validates every case through the current execution-tree, task-record, communication, and cross-file package validators. Migration and streaming suites reuse the same files so schema examples cannot drift independently from their runtime consumers.
