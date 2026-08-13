# Agent Team Execution

## Scope

Manages current Team runs, immutable topology, runtime-specific Agent members,
exact nested execution addressing, task delegation, restore, and Team event
projection through one server-owned boundary.

## Backend And Topology Model

- `TeamBackendKind.MIXED` is the only active server Team orchestration backend.
  Homogeneous AutoByteus, Codex, Claude, heterogeneous, and nested definitions
  all use `MixedTeamManager`.
- `TeamRunService` resolves the complete definition graph before launch and
  builds one immutable rooted topology. Every Agent and AgentTeam placement has
  one canonical rooted `AgentTeamAddress`, such as `/review_team/reviewer`.
- `TeamRunConfig.rootTeam` and its derived topology index are runtime authority.
  Logical member names, paths, route keys, flat rosters, runtime ID parsing, and
  browser tree state are not alternative topology authorities.
- Each Agent placement owns one runtime-specific `AgentRun`. A persistent nested
  AgentTeam owns a child `TeamRun`; its Agents retain root collaboration
  addresses while runtime traversal remains internal to the manager tree.
- Per-Agent runtime selection stays below the Team boundary. `AgentRunManager`
  selects the AutoByteus, Codex, or Claude backend from each launch setting.

## Launch-Time Identity

`TeamRunService` allocates the root TeamRun ID before runtime creation. Public
launch input contains definition/configuration, not caller-chosen concrete
member or child-run identities. `TeamDefinitionTopologyPlanner` allocates each
persistent AgentRun ID and persistent nested TeamRun ID, binds the exact rooted
member address, and projects any application execution producer to that exact
execution address.

IDs are opaque runtime/storage identities. Names/slugs can improve readability
but must never be parsed for routing, task ownership, restore, or UI identity.
Provider-native Codex thread IDs, Claude session IDs, and AutoByteus runtime IDs
remain separate metadata.

Member memory is root-hierarchical. Persistent and task executions resolve their
`memoryDir` through `AgentMemoryLocationService` from the root TeamRun, concrete
task-Team chain, and real AgentRun identity. Consumers do not derive a fallback
path from a logical address or provider ID.

## Canonical Execution Address

Every concrete Agent command, status/event projection, task participant, token
owner, and frontend execution selection uses:

```ts
type TeamExecutionAddress = Readonly<{
  rootTeamRunId: string;
  taskTeamRunIds: readonly string[];
  memberAddress: AgentTeamAddress;
  taskAgentRunId: string | null;
}>;
```

- persistent Agent: empty task-Team chain and `taskAgentRunId: null`;
- delegated task Agent: empty task-Team chain and its exact allocated
  `taskAgentRunId`;
- Agent inside a task Team: ordered concrete `taskTeamRunIds`, its canonical
  member placement, and `taskAgentRunId: null`;
- nested task Teams append run IDs in traversal order.

The root ID must match the bound TeamRun. The member address must exist in the
selected topology. Each task-Team ID must select the next active task Team, and
the optional task-Agent ID must select the exact active task Agent for that
logical member. Missing/stale/mismatched identity fails closed. There is no
fallback to a coordinator, structural template, path, route key, name, task
instance ID, generated browser identity, or first matching leaf.

## Team Commands

The Team WebSocket accepts strict command DTOs from
`@autobyteus/team-stream-contracts`:

- `SEND_MESSAGE` carries content/context attachments, `message_id`,
  `dedupe_key`, and one exact `execution_address`;
- `INTERRUPT_GENERATION` carries `command_id` and the exact address; and
- `APPROVE_TOOL` / `DENY_TOOL` carry invocation ID, reason, and the exact
  address emitted with the pending tool call.

`AgentTeamStreamHandler` parses the DTO, verifies the root, and calls
`TeamRun.executeMemberCommand(...)`. `MixedTeamManager` traverses the exact
execution chain and dispatches to the selected persistent Agent, task Agent, or
task-Team Agent. Send may restore the root Team container as part of the
supported Team follow-up path; interrupt and tool decisions are active-only and
must not restore stopped work.

Interrupt acknowledgement is command-correlated. The server echoes the exact
client `command_id` and execution address with `accepted`, `rejected`, or
`failed`; accepted means the runtime accepted the interrupt request, not that a
terminal status has already been projected.

## Root And Agent Lifecycle

`AgentTeamRunManager` alone owns root Team liveness and publishes
`TeamRunLifecycleSnapshot {teamRunId,isActive}`. Active-to-active replacement
does not flicker false/true; stale cleanup cannot deactivate a replacement; and
accepted termination publishes inactive after exact unregister.

Root `TEAM_RUN_LIFECYCLE`, transport connection state, exact Agent
`AGENT_STATUS`, command overlays, task status, and open-work settlement are
separate facts. Initial Team streaming subscribes to events and manager
lifecycle before reading fresh snapshots, then publishes exact Agent status and
root liveness without synthesizing one from the other.

Each executable member handle owns its pending command overlay. It can publish
`initializing` before slow Agent startup/restore/provider send work and replaces
or clears that overlay only through matching runtime status, command failure,
termination, or disposal. AgentRun remains the authoritative turn/status and
segment-lifecycle owner after command handoff.

## Server-Owned Task Delegation

The first-party model tools are `delegate_task`, `submit_task_result`, and
`review_task_result`. Legacy task-plan tools and runtime-specific delegation
protocols are not part of this surface.

`delegate_task` accepts:

```text
{
  recipient_address,
  description,
  reference_files?
}
```

The address uses the same `/...` or immediate-Team-relative `./...` grammar as
`send_message_to`. The root topology resolver first returns one immutable Agent
or AgentTeam placement. Task policy then requires that placement to be a direct
child of the caller's immediate Team and rejects self, deeper, or cross-branch
activation before reserving a task ID or mutating the ledger.

A successful Agent target creates one task Agent at the logical member's
address. A successful AgentTeam target creates one task-scoped TeamRun and sends
the work packet through that Team's exact configured coordinator ingress while
keeping the logical Team as accountable target. The resulting concrete
execution address is runtime identity; there is no public task-instance ID.

The task lifecycle is:

1. validate caller context, rooted placement, direct-child eligibility,
   description, and absolute local `reference_files`;
2. reserve a task ID in the root persistence scope and record `starting`;
3. activate the concrete task Agent or task Team behind an event-publication
   barrier;
4. replace `starting` with the active record only after activation is observable;
5. allow the bound task execution to call `submit_task_result`, recording one
   submission and moving to `awaiting_review`;
6. allow only the recorded review owner to call `review_task_result`;
7. on `request_revision`, return the same concrete execution to active work and
   deliver revision instructions; or
8. on `accept`, settle the exact task execution and record terminal acceptance.

Notification delivery is non-transactional after valid ledger mutation. A
warning may be recorded without rolling back accepted task state. Task Agent and
task Team settlement use their known execution bindings and open-work facts;
they do not infer ownership from provider output or generated IDs.

Task records are persisted once per root TeamRun in
`task_delegation_records.json`. Sender, receiver, execution, submissions,
reviews, and updates use exact `TeamExecutionAddress` values. Task-Team child
work stays in the root record and preserves its concrete chain. Persisted task
records are display/history state after restart, not authority to resurrect
model tools.

## Collaboration And Handoffs

Each Agent receives one `MemberTeamContext` containing:

- exact AgentRun/runtime data;
- `executionAddress` for concrete execution identity;
- `MemberLogicalAddressContext {rootTeamRunId,memberAddress}` for collaboration;
- only that Agent's immutable outgoing compiled handoff snapshot;
- optional Team instruction; and
- active delivery/tool service bindings.

The Carpenter prompt renders the canonical member address, `/...` and `./...`
semantics, Team coordinator ingress rule, `get_handoff_rules` workflow, and task
direct-child rule. It injects no flat recipient, representative, or delegation
roster. Runtime exposure automatically includes `get_handoff_rules`,
`send_message_to`, and `delegate_task` for a valid Team context.

`send_message_to.recipient_address` resolves through the root logical placement
service. An Agent target delivers to that real Agent. An AgentTeam target
delivers through its exact direct coordinator ingress. Child managers forward a
root-bound delivery intent without rewriting the sender/receiver into flat or
representative identities. Team Communication persists the actual sender and
receiver as exact `TeamExecutionAddress` values; explicit `reference_files` are
structured metadata and natural message prose is not scanned for paths.

`target_agent_run_id` remains the separate live-only direct AgentRun route owned
by `src/agent-communication`; it does not create Team Communication projection.

## Canonical Team Events And WebSocket Projection

Mixed Agent member handles subscribe to post-pipeline `AgentRunEvent`s, verify
the real AgentRun binding, and call the sole
`createTeamAgentExecutionBinding(...)` constructor. It classifies persistent
Agent, task Agent, and task-Team Agent identities. `TeamAgentEventAdapter` maps
the finite Agent event vocabulary into a correlated Team domain event and is
stateless with respect to turn, segment, task, and runtime lifecycle.

Every Agent-originated Team wire message carries `agent_execution`. The strict
wire projection contains no duplicate member path/name/run fields. Segment
start/content carry required turn, exact ID, and the finite canonical type;
segment end carries exact turn/ID plus terminal facts without repeating type.
Error events retain required nullable scope/effect/turn evidence. Invalid Team
input is rejected rather than repaired or routed by compatibility fields.

Team-only events retain their own strict identities:

- `TASK_DELEGATION_EVENT` carries exact execution and participant addresses;
- `TEAM_COMMUNICATION_MESSAGE` carries exact sender/receiver addresses;
- `MEMBER_INPUT_MESSAGE` carries its execution, optional sender, stable message
  identity, origin, and context files;
- `EXTERNAL_USER_MESSAGE` carries its exact execution address; and
- `TEAM_RUN_LIFECYCLE` carries root liveness only.

Multiple WebSocket/API subscribers do not create duplicate runtime listeners,
pipeline passes, or projection writes.

## Restore And Persistence

- `TeamRunMetadata.rootTeam` is the canonical immutable runtime tree.
- Stored handoffs are the immutable launch-time compiled snapshot. Restore does
  not recompile current definition files.
- Stored concrete AgentRun/TeamRun IDs and provider resume IDs are data; public
  new-launch input cannot supply them.
- Persistent nested TeamRuns restore through their parent topology. Task
  executions are represented by their concrete address and retained task
  records; stale records alone do not recreate an active execution.
- `TeamRunService.resolveTeamRun(teamRunId)` is the supported restore-aware root
  lookup for connection/send flows. Active-only controls use active lookup.
- Member memory paths are resolved through `AgentMemoryLocationService`; no
  manager, stream, browser, or history consumer reconstructs them from names or
  provider IDs.
- Accepted restored follow-up messages record activity without changing the
  stable opening/coordinator title.

## TS Source

- `src/agent-team-execution/domain/team-execution-address.ts`
- `src/agent-team-execution/domain/team-agent-execution-binding.ts`
- `src/agent-team-execution/domain/team-run-config.ts`
- `src/agent-team-execution/domain/team-run.ts`
- `src/agent-team-execution/services/team-run-service.ts`
- `src/agent-team-execution/services/agent-team-run-manager.ts`
- `src/agent-team-execution/services/team-definition-topology-planner.ts`
- `src/agent-team-execution/services/team-logical-placement-resolver.ts`
- `src/agent-team-execution/services/member-team-context-builder.ts`
- `src/agent-team-execution/services/member-collaboration-instruction-renderer.ts`
- `src/agent-team-execution/services/team-runtime-instruction-renderer.ts`
- `src/agent-team-execution/services/inter-agent-message-delivery-intent-builder.ts`
- `src/agent-team-execution/services/team-agent-event-adapter.ts`
- `src/agent-team-execution/task-delegation`
- `src/agent-team-execution/backends/mixed`
- `src/agent-tools/task-delegation`
- `src/services/agent-streaming/agent-team-stream-handler.ts`
- `src/services/agent-streaming/team-agent-event-websocket-projector.ts`
- `@autobyteus/team-stream-contracts`
