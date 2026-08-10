# API-REV-017 Delegated-Task UI Failure Analysis

## Result

`Fail` — `API-F-011` and `API-F-012`; R-039 / UC-021 / AC-036.

## Expected

After `delegate_task` creates an active task Agent or task AgentTeam, the production frontend must:

1. show the delegated task count, status, content, target, and lifecycle details in the Team panel; and
2. show the concrete transient task execution in the workspace Team hierarchy so it can be selected independently from the persistent member execution.

## Observed

The user's exact browser screenshot and a fresh independent Chrome run both show a successful `delegate_task` while the Team panel remains `Tasks 0 tasks` and the hierarchy contains no transient task execution row. The fresh run sampled these values for 17 seconds. Its raw task-query counts were `[0, 3, 1]`, so a record reached the browser even while rendering remained empty.

Public GraphQL for the user's exact root returns three accepted records (`task_0001`–`task_0003`) with complete content, current rooted sender/receiver addresses, distinct task-Team chains, start times, submission updates, and accepted reviews. The backend ledger is not missing.

## API-F-011 — Apollo address metadata causes every record to be filtered

`taskDelegationStore.normalizeTaskDelegationRecord` parses nested GraphQL addresses with `parseTeamExecutionAddress`. The parser requires exactly four object keys. Apollo returns the four canonical keys plus `__typename`, making the valid transport object fail exact key-count validation. Normalization returns `null`, and `replaceRecords` filters the record from the store.

A temporary deleted-after-use Vitest probe proves both controls:

- identical current record without `__typename`: accepted;
- identical current record with Apollo `__typename`: rejected/null.

The probe passed `1 file / 2 tests` and left no durable Git delta.

## API-F-012 — task execution context is not projected into visible transient nodes

The workspace display builder emits transient rows only from Team nodes marked `isTaskExecution`. Current task-Team event routing creates an `AgentContext` keyed by the task execution address and returns `handled`. `ensureTaskTeamExecutionProjection` merely returns the persistent Team node; it does not clone/materialize a task execution node or mark it with `isTaskExecution`. The projection update/detail helpers have no production consumer outside their own definitions. Both real screenshots are consistent with that path: persistent hierarchy only.

Existing old projection specs still construct removed `memberPath`, `memberRouteKey`, `task_team_run_id`, and `team_route_key` shapes. Existing task-panel fixtures use manually shaped plain objects rather than Apollo-decorated records. They are inadequate current-boundary proof.

## Preliminary classification

Both findings are bounded frontend implementation defects plus missing current-contract durable coverage. `code_reviewer` must confirm failure origin and final owner before implementation rework.

## Safety

The reproduction used the user-requested manual stack on ports `60004/31004` with isolated root/database `manual-user-20260810-2`. The running server open-file audit found zero references to `/Users/normy/.autobyteus/server-data/db/production.db`. The historical API-REV-014 operational mutation remains disclosed and no rollback was attempted.

The manual stack remains running so the user can continue verification.
