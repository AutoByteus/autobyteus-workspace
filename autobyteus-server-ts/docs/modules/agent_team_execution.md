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

## Runtime Composition Path

| Path | Authoritative owner | Member execution primitive | Notes |
| --- | --- | --- | --- |
| Any server team run (all-AutoByteus, all-Codex, all-Claude, heterogeneous, or nested) | `MixedTeamManager` | Agent members own one runtime-specific `AgentRun`; subteam members own child `TeamRun`s | `MixedTeamManager` is retained by name and is the single active server team manager. Runtime-specific team managers/backends are not instantiated by server team create/restore. |
| AutoByteus member in a server team | `MixedAgentMemberHandle -> AgentRunManager -> AutoByteusAgentRunBackendFactory` | Standalone AutoByteus `AgentRun` | `composeNativeAutoByteusPrompt` consumes `MemberTeamContext` and emits Team Instruction plus AgentTeam Addressing/Collaboration before native guidance; native core then appends only the terminal configured Skills catalog. |
| Codex or Claude member in a server team | `MixedAgentMemberHandle -> AgentRunManager` | Standalone Codex or Claude `AgentRun` | `composeSharedCarpenterPrompt` projects shared Team Instruction plus AgentTeam Addressing/Collaboration through provider instruction boundaries; native Bash/file guidance is excluded. `get_handoff_rules`, `send_message_to`, and `delegate_task` remain automatically included in effective team tool exposure and routed through Agent Tools MCP. |

## Nested Member Identity And Commands

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

Team Agent status has two deliberately distinct strict projections. The initial
`TEAM_EXECUTION_VIEW_SNAPSHOT.agent_statuses` entries carry both
`agent_run_id` and snapshot-only `member_address`, while a sequenced live
`AGENT_STATUS` carries `change_sequence`, `agent_run_id`, and status details
without `member_address`. Both shapes share only a private status-details
mapper and are parsed by their respective `@autobyteus/team-stream-contracts`
schemas. `RootTeamRun` and `TeamRunEventPublisher` remain the only live change
sequence authority; a live projector must never reuse the structural snapshot
DTO or fabricate an address after sequence assignment.

Each executable member handle owns its pending command overlay. It can publish
`initializing` before slow Agent startup/restore/provider send work and replaces
or clears that overlay only through matching runtime status, command failure,
termination, or disposal. AgentRun remains the authoritative turn/status and
segment-lifecycle owner after command handoff. It also owns ordinary input
admission: a valid member command or peer delivery can be accepted into the
exact AgentRun FIFO while another turn is active without a provider-specific
busy rejection. Codex may append to the exact active turn when AgentRun selects
that capability; AutoByteus and Claude wait for a later turn. Team managers do
not own another input queue or infer this policy from provider state.

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

- exact `TeamMemberExecutionIdentity {rootTeamRunId,memberAddress,agentRunId}`
  for rooted execution identity and logical collaboration placement;
- only that Agent's immutable outgoing compiled handoff snapshot;
- optional Team instruction; and
- active delivery/tool service bindings.

After optional authored `Team Instruction`, the Carpenter prompt renders one
`AgentTeam Addressing` section followed by one `AgentTeam Collaboration`
section, before `Working Environment`. The shared exact renderer supplies the
canonical member address, logical directory/file analogy, `/...` and `./...`
semantics, Team coordinator ingress rule, `send_message_to`, the
`get_handoff_rules` workflow, and the task direct-child rule. It injects no flat
recipient, representative, or delegation roster. Runtime exposure automatically
includes `get_handoff_rules`, `send_message_to`, and `delegate_task` for a valid
Team context, with identical copy across AutoByteus, Codex, and Claude.

`send_message_to.recipient_address` resolves through the root logical placement
service. An Agent target delivers to that real Agent. An AgentTeam target
delivers through its exact direct coordinator ingress. Child managers forward a
root-bound delivery intent without rewriting the sender/receiver into flat or
representative identities. Team Communication persists the actual sender and
receiver as exact `TeamExecutionAddress` values; explicit `reference_files` are
structured metadata and natural message prose is not scanned for paths.
An accepted delivery is projected once when the target AgentRun owns the input;
later provider forwarding or terminal observation does not publish a duplicate
Team Communication or member-input record.

`target_agent_run_id` remains the separate live-only direct AgentRun route owned
by `src/agent-communication`; it does not create Team Communication projection.

## Canonical Team Events And WebSocket Projection

Mixed Agent member handles subscribe to post-pipeline `AgentRunEvent`s, verify
the real AgentRun binding, and call the sole
`createTeamAgentExecutionBinding(...)` constructor. It classifies persistent
Agent, task Agent, and task-Team Agent identities. `TeamAgentEventAdapter` maps
the finite Agent event vocabulary into a correlated Team domain event and is
stateless with respect to turn, segment, task, and runtime lifecycle.

`FILE_CHANGE` admission follows the same strict boundary. The adapter accepts
only the canonical `AgentRunFileChangePayload` keys, requires its `runId` to
match the source `AgentRunEvent`, validates the finite artifact type, status,
and source-tool values, and preserves `sourceInvocationId` as a required
nullable field. It rejects legacy wire aliases, extra fields, invalid enum
values, and cross-run payloads before the Team projector allocates or emits a
wire event.

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

### Startup Transition To The Current TeamRun Package

Current runtime readers consume one validated V1 package per root TeamRun:
`team_run_execution_tree.json`, `task_delegation_records.json`, and
`team_communication_messages.json`. Released predecessor interpretation stays
inside required startup app-data migrations.

The migration classifier uses positive authority evidence; missing
`team_run_metadata.json` alone is not an error or a reason to skip blindly:

- a regular `team_run_metadata.json` is an authoritative `PREDECESSOR`, including
  an interrupted promotion where V1 targets already exist;
- all three current files plus full cross-file validation are `CURRENT_V1`;
- with neither predecessor nor current authority, a structurally valid
  `team_run_manifest.json` matching the directory is `HISTORICAL_RESIDUE` and is
  skipped without mutation; and
- partial, malformed, or unrecognized roots are `INVALID`, preserve their bytes,
  and keep the required migration failed for repair/retry.

Canonical identity conversion and the execution-tree V1 promotion share this
classifier. The V1 definition declares the canonical identity migration as a
prerequisite, so it cannot create an attempt after canonical conversion fails.
When predecessor metadata survives an interrupted V1 promotion, both migrations
resolve task/message evidence from a matching protected V1 backup rather than
parsing live target files as predecessor data. Normal restore and API paths do
not implement a predecessor/current dual reader.

Predecessor communication endpoints may contain either the exact four-field
Team execution address or the released ordered `segments` representation. One
migration-only execution-address normalizer owns this translation for canonical
structured conversion, stored-address conversion in the older communication
migration, and retryable V1 package planning. It validates the expected root,
member path/route aliases, ordered task-Team ancestry, and optional task-Agent
identity; a null optional alias is treated as absent, while contradictory,
duplicate, malformed, or root-mismatched evidence fails with row/side context.
The older migration's flat projection adapter remains local to that migration.

Terminal success of the older communication and canonical migrations does not
force them to rerun when V1 previously failed. Startup retries only the V1
migration, resolves normalized endpoints to exact AgentRun IDs through the
planned execution tree, validates every root first, and promotes the cohort only
when all roots are valid. A failed preflight preserves predecessor files and
backups; after success, later startup is a byte/path/backup/attempt no-op. The
current V1 communication file contains AgentRun IDs only and runtime readers do
not retain either predecessor address representation.

Before `20260814_team_run_execution_tree_v1` can report success, it reconciles
`team_run_history_index.json` from the complete validated current/promoted tree
map. Every validated root produces exactly one Team history row; historical
residue, invalid roots, and stale index-only roots are absent. The execution tree
owns Team identity, definition, workspace, creation, and archive facts. Existing
index rows may contribute only their summary and termination fields; if no
summary exists, coordinator trace evidence may supply a best-effort title.

The history store owns strict index parsing and the canonical index path. A
missing index is treated as empty, but malformed rows fail the required migration
without changing bytes. If a valid existing index must change, the reconciler
creates a protected timestamped backup before the atomic replacement. Exact
equivalence is a no-write/no-backup result, so later startup is idempotent.
Normal catalog, GraphQL, and sidebar paths still consume only this current index;
they do not scan `memory/agent_teams`, and Team members do not become standalone
Agent history rows.

## TS Source

- `src/agent-team-execution/domain/team-member-execution-identity.ts`
- `src/agent-team-execution/domain/team-agent-execution-binding.ts`
- `src/agent-team-execution/domain/team-run-config.ts`
- `src/agent-team-execution/domain/team-run.ts`
- `src/agent-team-execution/services/team-run-service.ts`
- `src/agent-team-execution/services/agent-team-run-manager.ts`
- `src/agent-team-execution/services/team-definition-topology-planner.ts`
- `src/agent-team-execution/services/team-logical-placement-resolver.ts`
- `src/agent-team-execution/services/member-team-context-builder.ts`
- `src/agent-team-execution/services/member-collaboration-instruction-renderer.ts`
- `src/agent-team-execution/services/team-collaboration-instruction-renderer.ts`
- `src/agent-execution/prompt/carpenter-prompt-composer.ts`
- `src/agent-team-execution/services/inter-agent-message-delivery-intent-builder.ts`
- `src/agent-team-execution/services/member-command-status-overlay-store.ts`
- `src/agent-team-execution/services/team-agent-event-adapter.ts`
- `src/agent-team-execution/task-delegation`
- `src/agent-team-execution/backends/mixed`
- `src/agent-tools/task-delegation`
- `src/agent-execution/shared/runtime-agent-tool-exposure.ts`
- `src/services/agent-streaming/agent-team-stream-handler.ts`
- `src/services/agent-streaming/team-agent-event-websocket-projector.ts`
- `src/app-data-migrations/migrations/team-run-migration-state-classifier.ts`
- `src/app-data-migrations/migrations/team-execution-address-normalizer.ts`
- `src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-predecessor-source-resolver.ts`
- `src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-history-index-reconciler.ts`
- `src/run-history/services/team-run-history-index-row-projector.ts`
- `src/run-history/store/team-run-history-index-store.ts`
- `@autobyteus/team-stream-contracts`
