# Agent Team Runtime and Task Coordination

The native `autobyteus-ts` agent-team runtime has been decommissioned. Team
launch, restore, member routing, scoped team communication, task-agent and
task-team activation, and team stream projection are owned by
`autobyteus-server-ts` via
the server stack:

`TeamRun -> MixedTeamManager -> AgentRunManager -> runtime AgentRun backend`

`autobyteus-ts` continues to own single-agent runtime primitives, local tools,
messages, memory, and LLM integration. It must not reintroduce a native team
lifecycle or native team task ledger.

Server-managed bounded task delegation (`delegate_task`, `submit_task_result`, and
`review_task_result`) is implemented in `autobyteus-server-ts` and is the
authoritative workflow for team tasks.
The native personal ToDo tools and their in-memory runtime/event path have been
removed from `autobyteus-ts`. Agents that need personal task tracking should use
existing file tools and skills to maintain a workspace task file.

## Removed Legacy Team Task Workflow

The old native team task-plan subsystem has been removed from active source:

- no `TaskPlan`, `BaseTaskPlan`, or `InMemoryTaskPlan` public API;
- no task-plan schemas, reports, deliverables, converters, or stream payloads;
- no task-plan bootstrap step or task-notification mode/env var;
- no native team stream source for task plans;
- no CLI task-plan panel.

Do not reintroduce legacy model-facing task tools such as `assign_task_to`,
`create_task`, `create_tasks`, `get_my_tasks`, `get_task_plan_status`, or the
old local team-task `update_task_status`. Server-managed bounded team work uses
the dedicated task-delegation tools above. Do not reintroduce the removed native
personal ToDo tools; file tools and skills are the supported local replacement.

## Removed Native Team Runtime Scope

Native teams no longer start through an `autobyteus-ts` runtime bootstrap path.
The removed native surface included:

- member agent configuration preparation for native teams;
- native scoped `teamContext` communication;
- `TeamManager` coordinator/member runtime ownership;
- native team, agent, and sub-team stream rebroadcasting.

Server-created AutoByteus team members are ordinary `AgentRun`s configured by
the server with `MemberTeamContext`-derived instructions and primitive
`customData.teamContext` fields. Team-task UI, ledger state, task-agent
instances, and task-team child runs are designed from server-owned
task-delegation data, not from native `autobyteus-ts` task state.

## Streaming Boundary

Native `AgentEventStream` records remain single-agent stream records. Server
team streams enrich child agent events, Team Communication messages, task-agent
and task-team status metadata, scoped child identity, and reference-file entries
under `autobyteus-server-ts`.
Agent-level events can still include generic `SYSTEM_TASK_NOTIFICATION` items.
Backend-owned progress events such as server `TODO_LIST_UPDATE` remain a
server/Codex contract; `autobyteus-ts` no longer emits a native TODO stream
item. These are not native team task-plan events.

## Server-Owned Task Delegation

The cross-runtime task workflow lives in `autobyteus-server-ts` and is owned by
`TaskDelegationService` plus the server tool manifest under
`src/agent-tools/task-delegation`. Native `autobyteus-ts` teams do not own this
model-facing workflow. Server-managed Codex, Claude, AutoByteus-in-server-team,
and mixed team paths own member-target task-agent lifecycle and team-target
task-team child-run lifecycle.

### `delegate_task`

A coordinator/delegator creates one bounded ready-to-run task per tool call with
explicit accountable target fields:

- `recipient_address`: one canonical absolute non-root logical address beginning
  with `/` for the mounted Agent or AgentTeam definition from which a fresh task
  execution is spawned;
- `description`: the complete work-packet body, including objective, context,
  scope, constraints, done conditions, and expected output guidance;
- optional `reference_files`: file or artifact paths the task execution target
  should inspect.

The old `target` object and direct `member_name` selector are not the current
model-facing surface. The same logical Agent or AgentTeam address can be used by
either collaboration operation, but the operation defines the effect:
`send_message_to` contacts the already mounted Agent execution or mounted Team
coordinator, while `delegate_task` spawns a fresh task Agent or fresh task Team
and delivers the complete packet to that new execution.

The service creates one internal ledger record, assigns a stable id such as
`task_0001`, and activates one execution instance for the accepted task. Member
targets start one concrete task-agent instance. Team targets start one
concrete, task-scoped child team run whose ingress coordinator receives the work
packet while the logical team remains the accountable owner. Multiple
independent tasks are represented by multiple `delegate_task` calls. For
sequential follow-up work, the coordinator reviews task A's submitted result and
then calls `delegate_task` again for task B; a later team-target task receives a
fresh task-team run identity rather than reusing the completed run.
The public `delegate_task` result returns the task id, `status: "active"`, and
the fresh task Agent or task Team coordinator ingress as
`target_agent_run_id`. Activation failure returns the task id,
`status: "not_started"`, and a concise failure `message`, with no target identity
because no contactable task execution exists. The original logical
`recipient_address` remains the mounted definition and is not an alias for the
fresh task execution.

The delegation call is already the task-creation and assignment step. Callers
must not repeat its work packet through `send_message_to`. Genuinely new later
clarification may be sent to the exact active task ingress using the returned
`target_agent_run_id`; that message does not create another task or change task
lifecycle state.

### Result submission and review

Activated task-agent and task-team executions receive a system work packet that
contains the task label, rich description, reference files, and lifecycle
instructions. Runtime identities, target kind, and target/accountable-team labels
remain backend metadata/event details for routing and diagnostics; the task
packet body and visible activation notification are centered on the task itself.
The visible activation template is uniform for member and team targets (`You have
a new task.` plus task id, task description, and reference files). The packet
explicitly tells the execution target not to poll for tasks; all necessary task
details are pushed with the activation.

Task-agents and task-team ingress contexts submit reviewable output with
`submit_task_result({ message, reference_files? })`. The task is inferred from
the bound execution context, so the model must not pass task selectors such as
`task_id`, `task_name`, `member_name`, or status fields. Successful submission
records a stable submission id, moves the task to `awaiting_review`, and
system-notifies the task review owner. The public submission result returns only
the task id and `status: "awaiting_review"` unless notification delivery fails
after the submission is recorded, in which case it adds only a concise
`message`.

The task review owner reviews the latest pending submission with
`review_task_result({ task_id, decision, comment?, reference_files? })`.
`decision="request_revision"` requires a non-empty task-result comment and
system-notifies the same task execution instance. `decision="accept"` marks
the task accepted and requests safe settlement for the task-agent or task-team
execution. Every review records the reviewed submission id so multi-cycle
result/revision history is explicit. The public review result returns only the
task id and resulting
status: `status: "accepted"` for acceptance or `status: "active"` for a revision
request. A non-fatal revision-notification failure adds only a concise
`message`; review ids, reviewed submission ids, caller-selected decisions,
settlement bookkeeping, notification booleans, and raw warning objects remain
internal lifecycle/event details.

`send_message_to` remains available for ordinary teammate communication and
handoffs. It is not the task result, revision, acceptance, or finalization
protocol. Accepted logical messaging returns the exact existing Agent or mounted
AgentTeam coordinator that accepted the message as flat
`target_agent_run_id`; rejection returns `target_agent_run_id:null`. The removed
generic `result:null` field is not retained.

## Event And Settlement Semantics

Server-owned task delegation is event-driven rather than model-polled:

- accepted work-packet activations emit `TASK_DELEGATION_ACTIVATED`;
- result submissions emit `TASK_DELEGATION_RESULT_SUBMITTED` and a status
  projection containing the pending submission id;
- task-review decisions emit `TASK_DELEGATION_RESULT_REVIEWED` and a status
  projection containing `reviewId`, `reviewedSubmissionId`, review `comment`,
  and `acceptanceComment` when the acceptance path includes feedback;
- system notification delivery failure does not roll back valid lifecycle state;
  public submission/revision results surface only a concise `message`, while
  deterministic notification warning details remain internal.

Task-agent events carry explicit `task_agent_instance_id`, `task_agent_run_id`,
and `task_id`. Task-team root events carry `execution_kind: "task_team"`,
`task_team_instance_id`, `task_team_run_id`, `task_id`, `team_path`, and
`team_route_key`; child events inside the task-team run also carry
`task_team_relative_member_path` / `task_team_relative_member_route_key` so
clients can project scoped child activity without mutating the structural team
node.

After acceptance, task-agent settlement waits for the bound task-agent run to
become idle/offline, rechecks that no non-terminal work is assigned to that run
and no non-terminal child delegation is owned by it, protects the coordinator by
default, and calls the team-run settlement boundary with the concrete run id as
a stale-route guard. Task-team settlement waits until the known child team has
no open delegation ledger work, no active task-agent instances, and no private
execution work reported by the child `TeamRun`. Duplicate review/child-event wakeups are lifecycle signals
against the same `taskTeamRunId`, not independent close operations. Accepted
settlement then terminates the child team through its lifecycle owner, treats
already-stopping/offline child state as converged inactive state, preserves real
active termination failures as rejected settlement, detaches the server-side
task-delegation service for that child run, and removes the active run binding so
reload/snapshot paths do not rehydrate the completed transient row. Future
delegation to the same logical team remains topology-based.

## Developer Guidance

- Use `send_message_to` for free-form conversation and handoff messages only; do
  not use it for task result submission, revision requests, acceptance, or
  finalization. It communicates with an existing execution and does not spawn or
  track a task.
- Use `delegate_task`, `submit_task_result`, and `review_task_result` for
  bounded server-managed work with ledger state, result/review events, system
  notifications, and safe task-agent or task-team settlement on supported
  server team backends.
- Do not deliver the same assignment through both `delegate_task` and
  `send_message_to`. After successful delegation, use the returned exact active
  `target_agent_run_id` only for genuinely additional clarification.
- Do not reintroduce `create_task`, `create_tasks`, `assign_task_to`,
  `get_my_tasks`, or `get_task_plan_status` as model-facing tools.
- AutoByteus Agent Tools MCP adapters call the existing server-owned
  communication/task-delegation services, advertise machine-readable output
  schemas on supported post-2025-03 revisions, and return MCP text JSON equal to
  structured content. Do not duplicate task state or behavior in a transport.
