# Future Improvements: Task-Agent Identity And Team Execution Boundaries

## Status

Future improvement notes / not required for the current task-agent identity projection refactor.

The current implementation is intentionally a clean, explicit-identity design:

- server-originated task-agent stream/status events carry concrete task-agent identity;
- frontend routing no longer infers task-agent identity from generated run-id strings;
- task-agent context projection is separated from generic team stream dispatch;
- task-management policy remains outside `TeamRun`;
- `TeamRun` and backend managers remain concrete runtime lifecycle boundaries.

These notes record follow-up directions that may make the design even simpler or more enforceable later. They are not compatibility requirements and should not be implemented through fallback or dual-path behavior.

## Current Healthy Boundary

The current team/task separation should be preserved:

```text
TaskDelegationService
  owns delegated task records, task ids, task-agent binding, status policy,
  acceptance policy, authorization, terminal notifications, and settlement
  requests.

TeamRun / backend managers
  own runtime lifecycle: start member runtime, start task-agent runtime,
  post message, interrupt, settle, publish runtime events.

Streaming / websocket mapping
  owns transport projection of runtime and task-agent identity.

Frontend active-execution projection
  owns which concrete execution subject is visible/addressable in the UI.
```

The important rule is that task policy should not drift into `TeamRun`, and runtime lifecycle mechanics should not drift into task-management services.

## Candidate Future Improvements

### 1. Return Backend Member Identities From Team Creation

Today the frontend may need to create a temporary team context, promote it to the backend team run id, then fetch backend resume metadata to reconcile the actual logical member run ids.

A cleaner future API could have `createAgentTeamRun` return the backend-assigned member identities directly:

```ts
type CreatedTeamRunMemberIdentity = {
  memberRouteKey: string;
  memberPath: string[];
  memberRunId: string;
};

type CreateAgentTeamRunResult = {
  teamRunId: string;
  members: CreatedTeamRunMemberIdentity[];
};
```

Expected benefit:

- fewer startup round trips;
- less frontend dependence on resume metadata for a just-created run;
- a clearer create-run contract for packaged Electron and web UI direct-send flows.

Design caution:

- this should be a direct identity contract only;
- do not put runtime policy, task policy, or stream routing decisions into the create mutation result.

### 2. Promote `ExecutionIdentity` To A Shared Server Value Shape

Several paths now distinguish logical member execution from task-agent execution. A future cleanup could introduce a small shared server-side value shape for status overlays and event publication:

```ts
type TeamExecutionIdentity =
  | {
      kind: 'logical_member';
      memberRouteKey: string;
      memberPath: string[];
      memberRunId: string;
    }
  | {
      kind: 'task_agent';
      logicalMemberRouteKey: string;
      logicalMemberPath: string[];
      taskAgentInstanceId: string;
      taskAgentRunId: string;
      taskId: string;
    };
```

Expected benefit:

- fewer ad hoc execution-key strings;
- stronger compile-time guardrails around status overlays, event mapping, and backend manager callbacks;
- easier invariant testing that every task-agent-origin event carries the full task-agent identity.

Design caution:

- keep it a tight execution-identity shape;
- do not turn it into a generic kitchen-sink event payload.

### 3. Add A Server Invariant Test Matrix For Task-Agent-Origin Events

The current implementation has focused tests around command-start/status overlays. A future validation hardening pass could add a compact invariant matrix for every server-managed task-agent-origin event family:

```text
task-agent command status
task-agent work packet / input
task-agent tool lifecycle
task-agent terminal status
task-agent settlement / offline
```

Each row should prove:

- `task_agent_run_id` is present;
- `task_agent_instance_id` is present where known;
- `task_id` is present where known;
- logical `member_route_key` / `member_path` remain present;
- identity-less logical-member events continue to work for normal members.

Expected benefit:

- future backend event additions cannot silently regress into identity-less task-agent events;
- frontend resolver strictness remains safe.

### 4. Split Near-Limit Orchestrators Before Adding More Behavior

Some orchestration files remain below the effective line limit but are close enough that future work should be careful:

- frontend stream dispatch;
- frontend team-run send/open/hydration orchestration;
- backend team manager/runtime lifecycle adapters.

Future work should split only along real owners, for example:

```text
stream transport facade
-> message parser
-> member/context resolver
-> task-agent projection
-> event handler dispatch
```

Do not add generic `helper` or `util` layers that merely forward calls.

### 5. Keep Durable Task Persistence Deferred Until Recovery Requires It

The current task-agent delegation lifecycle is runtime-owned and does not require a durable task-delegation repository.

Only add durable task persistence if a future requirement explicitly asks for recovery, replay, cross-process history, or long-running task resumption after backend restart.

If that happens, the repository should sit behind the task-management owner:

```text
caller -> TaskDelegationService -> TaskDelegationRepository
```

Avoid this shape:

```text
caller -> TaskDelegationService
caller -> TaskDelegationRepository
```

The service must remain the authoritative boundary for task policy and authorization.

### 6. Keep Protocol Naming Clean-Cut

The current stream protocol uses `TASK_DELEGATION_EVENT` as the task-delegation transport surface. Future cleanup should continue to avoid dual old/new wrappers such as simultaneously supporting task-plan and task-delegation event names for the same current behavior.

If a protocol rename is ever needed, it should be handled as a clean migration with explicit client/version analysis rather than a permanent compatibility branch.

## Non-Goals

These notes do not propose:

- reintroducing generated task-agent run-id heuristics;
- weakening frontend resolver strictness;
- moving task lifecycle policy into `TeamRun`;
- adding durable task persistence without recovery requirements;
- adding compatibility wrappers for removed task-plan behavior;
- redesigning the explicit-intent task tools.

## Recommendation

Keep the current architecture as the baseline. The best near-term future improvement is likely **returning backend member identities from team creation**, because it would simplify the direct-create/send data flow without weakening the explicit-identity model.

The second-best improvement is a small shared `TeamExecutionIdentity` shape plus an invariant test matrix. That would make the current contract easier to enforce as more task-agent event families are added.
