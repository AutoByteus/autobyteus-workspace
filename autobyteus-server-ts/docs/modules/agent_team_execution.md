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
Provider-native Codex thread IDs and Claude session IDs remain separate from
local AgentRun identity. For current Team execution trees,
`platformAgentRunId` is an external-provider binding only. Native AutoByteus
continuation uses the local AgentRun ID plus its persisted memory state, and new
native nodes keep `platformAgentRunId: null`.

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

## Durable Member Activation And Restore

Root create versus restore intent is explicit process-local materialization
state. `AgentTeamRunManager` passes it through the mixed root, configured-member
registry, and persistent nested subteams; configured handles do not infer a
restored native run from `platformAgentRunId`. Before any candidate is built,
the handle canonicalizes and reactivates the persisted workspace through
`WorkspaceManager.ensureWorkspaceByRootPath(...)`.

Each configured Agent handle and configured subteam handle owns one readiness
attempt. Concurrent commands join that attempt. `AgentRunManager` returns a
private activation candidate that is not visible through active lookup and has
no input/event surface until the governing durability step succeeds:

- A fresh external member creates one provider conversation and stages its
  exact non-local ID as a `TeamAgentPlatformBinding`. `RootTeamRun` adopts that
  binding through a lock-head execution-tree mutation before candidate
  publication.
- A restored external member must have an exact persisted provider binding.
  Local conversation activity with a null binding is an explicit non-resumable
  failure, not permission to create a replacement. Codex resume has no
  start-thread fallback; Claude resumes the same preselected UUID.
- A restored native member with canonical prior activity restores the same
  local AgentRun ID, memory directory, and WorkingContext. A restored native
  member with no activity may create fresh. Native members never stage or adopt
  a `TeamAgentPlatformBinding`; unreadable activity or restore failure fails
  closed.
- A delegated task Agent is always a fresh execution. An external task binding
  is applied to the same lock-head tree snapshot as task activation, and both
  tree/task durability finish before candidate publication and work release.
  Native task Agents stage no provider binding.

A failed pre-durability attempt aborts the private candidate and is retryable
only after cleanup is confirmed. An indeterminate durable write, publication
failure after durability, or uncertain candidate cleanup fail-stops/quarantines
the owning root or run instead of admitting duplicate work.

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

`AgentTeamRunManager` alone owns root Team liveness. Its lookup vocabulary is
deliberately precise:

- **active** means `getActiveTeamRun(...)` can return a command-capable root;
- **managed** means `getManagedTeamRun(...)` / `hasManagedTeamRun(...)` still
  owns the exact root while it is active, initializing, stopping, or retained
  after a nonterminal Stop failure; and
- **terminal inactive** means the exact root is no longer manager-owned.

The public `TeamRunLifecycleSnapshot {teamRunId,isActive}` and Team history
`isActive` projection represent manager ownership, so they remain true while
Stop is pending and become false only after exact unregister. This public
"active" state must not be confused with an individual member doing work or
with the narrower command-active lookup. Active-to-active replacement does not
flicker false/true, stale cleanup cannot deactivate a replacement, and accepted
termination publishes terminal inactive only after exact unregister.

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

## Stop, Retained History, And Later Delete

The root lifecycle and stored-history lifecycle are intentionally separate:

1. A manager-owned root, including a root whose configured members all report
   `offline` or whose Stop is pending, exposes **Stop** only. Member status is
   not root terminality and never authorizes deletion.
2. Stop targets the exact root TeamRun ID, closes new materialization admission,
   joins work already admitted, freezes one recursive scope, interrupts active
   turns before quiescence, and terminates every materialized configured,
   delegated, and nested descendant. Stop retains the V1 package, catalog row,
   task/communication history, context, and resume identity.
3. The root remains managed and the lifecycle/history projection remains
   `isActive: true` until that whole scope reaches accepted terminal completion
   and the manager unregisters the exact root. A failed Stop retains the same
   managed root and history for retry; it does not make Delete available.
4. Only the later terminal-inactive `READY` history row exposes **Archive** and
   **Delete**. Delete is a new user decision with permanent-deletion
   confirmation; Stop never opens that confirmation and never invokes Delete.
5. `TeamRunHistoryService.deleteStoredTeamRun(...)` delegates physical removal
   to the history catalog. `AgentTeamRunManager.withUnmanagedHistoryDeletion(...)`
   serializes the exact-ID exclusion through the complete catalog/package
   transition, rejects active or stopping roots, and lets compensated storage
   failure preserve a truthful inactive retry target.

Thus the supported journey is `Stop -> terminal retained inactive history ->`
an optional, separately confirmed `Delete`. There is no combined
stop-and-delete command, mutation, modal, or transport operation.

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
- `TeamRunService.resolveActiveTeamRun(teamRunId)` is the supported
  restore-aware root lookup for Team connection/send flows. It may restore an
  unmanaged persisted root, but it returns no replacement while the exact root
  remains managed and is not command-active. Active-only controls use
  `getActiveTeamRun(...)`; owners that must observe a stopping/nonterminal root
  use `getManagedTeamRun(...)` or `resolveManagedTeamRun(...)` explicitly.
- Member memory paths are resolved through `AgentMemoryLocationService`; no
  manager, stream, browser, or history consumer reconstructs them from names or
  provider IDs.
- Every non-null persisted member workspace root is made active before create or
  restore candidate construction; valid persisted workspaces do not silently
  fall back to the temporary workspace.
- Accepted restored follow-up messages record activity without changing the
  stable opening/coordinator title.

### Startup Transition To The Current TeamRun Package

Current runtime readers consume one validated V1 package per root TeamRun:
`team_run_execution_tree.json`, `task_delegation_records.json`, and
`team_communication_messages.json`. Released predecessor interpretation stays
inside required startup app-data migration
`20260814_team_run_execution_tree_v1`. It is the single registered final Team
cutover: the unpublished canonical-identity migration and its converters are
not prerequisites or runtime compatibility paths, and external-channel state is
outside this transition.

The migration classifier uses positive authority evidence; missing
`team_run_metadata.json` alone is not an error or a reason to skip blindly:

- a regular `team_run_metadata.json` is an authoritative `PREDECESSOR`, including
  an interrupted promotion where V1 targets already exist;
- all three current files plus full cross-file validation are `CURRENT_V1`;
- with neither predecessor nor current authority, a structurally valid
  `team_run_manifest.json` matching the directory is `HISTORICAL_RESIDUE` and is
  skipped without mutation; and
- partial, malformed, or unrecognized roots are `INVALID`, preserve their bytes,
  and are excluded with a warning. Empty shells, content-bearing roots without
  recognized authority, unsafe paths, and read/classification errors receive
  the same isolated preserve/exclude treatment.

Each root is planned and validated before mutation. Released metadata is
converted directly to the current recursive execution tree; a non-empty nested
`teamRunId` is authoritative, while an absent or blank value may use the
released `memberRunId` evidence. The predecessor-only execution-address
normalizer accepts the exact four-field form or the released ordered `segments`
form, folds nested member/task-Team ancestry in order, and rejects contradictory
or incomplete identity rather than guessing. Address-bearing and older
run-ID-based Team communication projections are resolved against the same
planned tree. Normal restore and API paths do not implement a
predecessor/current dual reader.

For a valid predecessor root, the migration creates a protected backup, stages
and validates the complete three-file package, then promotes it with
same-filesystem operations. Roots are independent; one invalid root does not
prevent another root from being promoted. If a promotion operation reports an
error after the predecessor marker disappears, read-only validation decides
whether the complete current package can still be admitted. Otherwise the root
is excluded without a false preservation claim. Existing valid V1 packages are
admitted as no-ops, and a terminal clean or warning-completed migration does not
repeat work on relaunch.

The same final coordinator validates released token identity only at the
migration boundary, updates eligible `root_team_run_id` values transactionally,
and retains predecessor-only database columns as inert evidence. Unsupported
token rows remain unchanged with warnings. Current Token Usage readers group by
root TeamRun and concrete AgentRun IDs; they do not own Team execution topology.

After root processing, the migration reconciles `team_run_history_index.json`
from independently admitted trees. Every admitted root produces exactly one
Team history row; historical residue, invalid roots, and stale index-only roots
are absent. The execution tree owns Team identity, definition, workspace,
creation, and archive facts. Existing index rows may contribute only their
summary and termination fields; if no summary exists, coordinator trace
evidence may supply a best-effort title.

The history store owns strict index parsing and the canonical index path. A
missing index is treated as empty. If a valid existing index must change, the
reconciler creates a protected timestamped backup before the atomic replacement
and validates the persisted projection. Exact equivalence creates no write and
no backup. A history read/write/validation problem is a warning and does not
block startup; the strict catalog is still rebuilt from admitted current
packages. Normal catalog, GraphQL, and sidebar paths consume only the current
index; they do not scan `memory/agent_teams`, and Team members do not become
standalone Agent history rows.

Conversion, promotion, token, and history problems produce item diagnostics and
a terminal `SUCCEEDED_WITH_WARNINGS`, never migration-owned startup fatality.
The server logs the result, rebuilds the strict catalog, and continues to
listen; `/rest/health` is the embedded application's only readiness authority.
Only an independently established database/runtime/bootstrap condition that
makes the current application inoperable can use the separate fixed
platform-fatal path.

## TS Source

- `src/agent-team-execution/domain/team-member-execution-identity.ts`
- `src/agent-team-execution/domain/team-agent-execution-binding.ts`
- `src/agent-team-execution/domain/team-run-config.ts`
- `src/agent-team-execution/domain/team-run.ts`
- `src/agent-team-execution/services/team-run-service.ts`
- `src/agent-team-execution/services/agent-team-run-manager.ts`
- `src/agent-team-execution/services/team-run-execution-tree-mutator.ts`
- `src/agent-team-execution/services/team-run-persistence-coordinator.ts`
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
- `src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-execution-tree-v1-app-data-migration.ts`
- `src/app-data-migrations/migrations/team-run-execution-tree-v1/predecessor-team-metadata-converter.ts`
- `src/app-data-migrations/migrations/team-run-execution-tree-v1/predecessor-team-execution-address-normalizer.ts`
- `src/app-data-migrations/migrations/team-run-execution-tree-v1/predecessor-task-delegation-converter.ts`
- `src/app-data-migrations/migrations/team-run-execution-tree-v1/predecessor-team-communication-converter.ts`
- `src/app-data-migrations/migrations/team-run-execution-tree-v1/predecessor-team-run-planner.ts`
- `src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-predecessor-source-resolver.ts`
- `src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-v1-package-promoter.ts`
- `src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-history-index-reconciler.ts`
- `src/app-data-migrations/migrations/team-run-execution-tree-v1/token-usage-team-run-v1-row-planner.ts`
- `src/token-usage/repositories/sql/token-usage-team-run-v1-migration-repository.ts`
- `src/run-history/services/team-run-history-index-row-projector.ts`
- `src/run-history/store/team-run-history-index-store.ts`
- `@autobyteus/team-stream-contracts`
