# Agent Team Execution

## Scope

Manages standalone flat Team runs, immutable direct-Agent topology,
runtime-specific Agent members, exact execution addressing, task delegation,
restore, and Team event projection through one server-owned boundary. Persistent
multi-Team composition belongs to [Agent Organization](./agent_orgs.md), not to
the Team runtime.

## Backend And Topology Model

- `TeamBackendKind.MIXED` remains the persisted backend-kind value, but current
  execution is constructed by `FlatTeamExecutionFactory`,
  `FlatTeamRunBackend`, and `FlatTeamExecutionManager`.
- `TeamRunService` and `FlatTeamTopologyPlanner` resolve one AgentTeam Definition
  V2 before launch. The root Team is `/`; all configured children are direct
  Agents, and exactly one is the configured coordinator.
- `TeamRunConfig.rootTeam` and its derived execution index are runtime
  authority. Logical names, flat roster projections, provider IDs, and browser
  state are not alternative topology authorities.
- Configured Team-in-Team composition is rejected. A Team delegated for a task
  is a task-scoped runtime execution beneath its exact host and does not mutate
  configured membership or become a persistent configured child.
- Per-Agent runtime selection stays below the Team boundary. `AgentRunManager`
  selects the AutoByteus, Codex, or Claude backend from each launch setting.
  Each execution family injects its own provider factories, definition
  services, session authority, memory/context environment, and task-execution
  identity capabilities; Team execution never reaches across to another
  family's manager or identity allocator.

## Launch-Time Identity

Public launch input contains `teamDefinitionId`, one complete root Team default,
and one complete configuration for every exact direct-Agent address; callers do
not choose concrete run identities. `TeamRunService` canonicalizes workspace
roots, and `FlatTeamTopologyPlanner` validates the flat definition, coordinator,
exact Agent coverage, definition bindings, and configured skill access before
allocating a root TeamRun ID and direct AgentRun IDs. The result is one immutable
`TeamRunConfig`.

IDs are opaque runtime/storage identities. Names/slugs can improve readability
but must never be parsed for routing, task ownership, restore, or UI identity.
Provider-native Codex thread IDs and Claude session IDs remain separate from
local AgentRun identity. For current Team execution trees,
`platformAgentRunId` is an external-provider binding only. Native AutoByteus
continuation uses the local AgentRun ID plus its persisted memory state, and new
native nodes keep `platformAgentRunId: null`.

Member memory is root-hierarchical. A standalone Team begins with the Team root
identity and an empty task-Team ancestor chain. Direct configured Agents use the
root TeamRun ID plus their AgentRun ID. A task Team appends its concrete
TeamRun ID to the immutable `RootExecutionPhysicalScope`; its Agent and deeper
task-Team descendants use that task ancestry. `RootedAgentMemoryLocator` owns
physical path resolution. Consumers do not derive paths from logical addresses
or provider IDs.

Required startup migration `20260823_repair_team_agent_memory_layout` contains
the only knowledge of the previously released nested-member memory defect. The
later required startup cutover
`20260901_agent_org_flat_team_families_v1` classifies prior fixed-depth Team V2
packages: native flat Team packages remain Team V2 without writes, while the
supported former multi-Team shape becomes the separate AgentOrg V1 family.
Current Team runtime and history remain target-schema-only.

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

- direct configured Agent: empty task-Team chain and `taskAgentRunId: null`;
- delegated task Agent: empty task-Team chain and its exact allocated
  `taskAgentRunId`;
- Agent inside a task Team: ordered concrete `taskTeamRunIds`, its canonical
  member address, and `taskAgentRunId: null`;
- nested task Teams append their run IDs in traversal order.

## Runtime Composition Path

| Path | Authoritative owner | Member execution primitive | Notes |
| --- | --- | --- | --- |
| Current standalone Team run | `FlatTeamExecutionManager` | Each configured Agent owns one runtime-specific `AgentRun`; delegated task Teams are task-scoped child executions | `ConfiguredAgentExecutionRegistry`, `TaskAgentExecutionRegistry`, and `TaskTeamExecutionRegistry` keep configured and task lifecycles distinct. |
| AutoByteus member | `FlatTeamAgentExecutionHandle -> AgentRunManager -> AutoByteusAgentRunBackendFactory` | Standalone AutoByteus `AgentRun` | `composeNativeAutoByteusPrompt` consumes `MemberTeamContext` and emits Team Instruction plus AgentTeam Addressing/Collaboration before native guidance. |
| Codex or Claude member | `FlatTeamAgentExecutionHandle -> AgentRunManager` | Standalone Codex or Claude `AgentRun` | `composeSharedCarpenterPrompt` projects shared Team Instruction plus AgentTeam Addressing/Collaboration through provider instruction boundaries. `get_handoff_rules`, `send_message_to`, and `delegate_task` remain automatically exposed through Agent Tools MCP. |

## Durable Member Activation And Restore

Root create versus restore intent is explicit process-local materialization
state. `AgentTeamRunManager` passes it through `FlatTeamExecutionFactory` and
the configured-Agent registry; handles do not infer a restored native run from
`platformAgentRunId`. Before a candidate is built, a handle canonicalizes and
reactivates the persisted workspace through
`WorkspaceManager.ensureWorkspaceByRootPath(...)`.

Each configured Agent handle owns one readiness attempt. Concurrent commands
join that attempt. `AgentRunManager` returns a private activation candidate that
is not visible through active lookup and has no input/event surface until the
governing durability step succeeds:

- At first work, a configured external member carries the complete
  `CollaborationAgentPlatformBindingChange` through the root-owned callback.
  `RootTeamRun.commitAgentPlatformBindingChange` commits against the current
  tree under its persistence lock before local cache update, candidate
  publication, or input acceptance.
- A restored external member with real conversation activity continues its
  exact persisted provider binding. Activity with a null binding fails closed,
  not by creating a replacement. Codex resume has no start-thread fallback;
  Claude resumes the same preselected UUID.
- Verified absence of conversation activity permits a new provider conversation.
  A retained non-null empty-conversation binding is replaced only after an
  expected-old comparison in that same durable root boundary. Unreadable
  activity never permits replacement. This uses the current storage format;
  no migration or reset is needed.
- A restored native member with canonical prior activity restores the same
  local AgentRun ID, memory directory, and WorkingContext. A restored native
  member with no activity may create fresh. Native members never stage or adopt
  a `TeamAgentPlatformBinding`; unreadable activity or restore failure fails
  closed.
- A delegated task Agent is always a fresh execution. An external task binding
  is applied to the same lock-head tree snapshot as task activation, and both
  tree/task durability finish before publication and work release. Native task
  Agents stage no provider binding.

A failed pre-durability attempt aborts the private candidate and is retryable
only after cleanup is confirmed. An indeterminate durable write, publication
failure after durability, or uncertain candidate cleanup fail-stops/quarantines
the owning root or run instead of admitting duplicate work.

Task delegation receives narrow capabilities from
`createTaskExecutionIdentityCapabilities(...)` rather than an Agent manager or
allocator object. The task path may allocate and inspect only the identities it
needs, preserving the same General Process versus Application execution-family
boundary used elsewhere.

## Stopped Team Model Configuration

`AgentTeamRunManager.updateStoppedModelConfigs(...)` owns General Process
updates to persisted Team model/settings pairs. It runs inside the same root transition
lane as restore, rechecks that no root remains manager-owned, rejects archived
or non-cataloged packages, and writes the current V2 execution tree through the
existing atomic tree store. Save-first therefore makes the new values visible
to the next restore; restore-first returns `RUN_ACTIVE` without writing.

Each patch targets the root Team address `/` or one exact direct configured
Agent address. `TeamRunModelConfigMutator` resolves that address in the
immutable stored topology and replaces only
`llmModelIdentifier` and `llmConfig` in `defaultLaunchConfiguration` or
`launchConfiguration`. Both fields are required; `llmConfig` may explicitly be
null. It cannot change runtime kind,
workspace, automatic-tool policy, concrete run IDs, provider bindings, task
nodes, hierarchy, or addresses. Every intended scope validates against its own
original saved selection and fixed runtime before the single tree write. A
replacement needs verified target context capacity at least that scope's fresh
saved-model capacity plus valid target-schema settings. Same-model settings
skip replacement-capacity comparison only. An incompatible descendant blocks
the whole Save; it is not silently omitted. See
[LLM Management](./llm_management.md#persisted-run-model-selection-validation).

The browser may plan bounded propagation from a parent edit, but the server
receives the resulting exact-scope patches rather than inheritance intent. The
planner links direct Agents using draft-start runtime/model/settings equality.
It preserves Agents that started divergent or were edited directly, even when a
later direct edit equals its parent. Mixed-runtime Agents do not link,
and stopped-run editing exposes no Reset-to-definition action because the V2
snapshot does not preserve original override provenance. No configuration
revision, rebase, or cross-client merge protocol is part of this boundary.

Post-write canonical read uncertainty returns `PERSISTENCE_INDETERMINATE` with
the last known tree; it does not claim a definite failure or issue a rollback
write. Canonical verification/Retry locks duplicate Save and clears obsolete
feedback after a successful read. Save does not start members or rewrite their
history/compaction state. Normal subsequent member messages restore the saved
pairs within the same local/provider conversations.

Studio checks the separate Application ownership lease before delegating to the
General root lane. A nonterminal Application binding keeps both Agent and Team
resume reads locked and direct stopped updates at `RUN_ACTIVE`; terminal release
restores ordinary General eligibility. See [Run History](./run_history.md) and
[Application Orchestration](./application_orchestration.md).

## Exact Member Identity And Commands

The root ID must match the bound TeamRun. A configured member address must name
one direct Agent in the flat root. Each task-Team ID must select the next active
task Team, and the optional task-Agent ID must select the exact active task
Agent for that logical member. Missing, stale, or mismatched identity fails
closed. There is no fallback to the coordinator, a structural template, route
key, name, task instance ID, generated browser identity, or first matching
leaf.

## Team Commands

The Team WebSocket accepts strict command DTOs from
`@autobyteus/team-stream-contracts`:

- `SEND_MESSAGE` carries content/context attachments, `message_id`,
  `dedupe_key`, and one exact `execution_address`;
- `INTERRUPT_GENERATION` carries `command_id` and the exact address; and
- `APPROVE_TOOL` / `DENY_TOOL` carry invocation ID, reason, and the exact
  address emitted with the pending tool call.

`AgentTeamStreamHandler` parses the DTO, verifies the root, and calls
`TeamRun.executeMemberCommand(...)`. `FlatTeamExecutionManager` traverses the exact
execution chain and dispatches to the selected configured Agent, task Agent, or
task-Team Agent. Send may restore the root Team container as part of the
supported Team follow-up path; interrupt and tool decisions are active-only and
must not restore stopped work.

Interrupt acknowledgement is command-correlated. The server echoes the exact
client `command_id` and execution address with `accepted`, `rejected`, or
`failed`; accepted means the runtime accepted the interrupt request, not that a
terminal status has already been projected.

## Root And Agent Lifecycle

Fresh and restored standalone Teams and Org-mounted Teams pass
`prepareConfiguredAgents: false`. The full configured topology is available,
but configured Agents remain unstarted and Offline until required by work.
Restore retains its mode, member identity, history and saved provider binding;
Offline does not mean that a retained member has no history or binding.
The first supported input or peer delivery activates only its exact receiver;
selecting a row or publishing the root is not worker startup. Concurrent first
inputs for the same member share one readiness attempt. Different members
prepare independently and serialize only their root persistence mutations.
This is an execution policy, not a UI color/status override. Work-bearing task
preparation still stages identity before durable task publication and release.
An uncertain commit or post-durability local/publication failure is nonretryable
until safe root reopen; a definite failed write can retry after confirmed cleanup.
Reopening is a safety/reconciliation boundary, not permission to replay an old
message automatically. Distinguish a pending send whose admission was lost from
an input already accepted before process loss. Inspect canonical state and use
the existing deliberate-input path; do not infer acceptance from frame deliveries
across multiple browser tabs or from an unchanged status color.

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
   joins work already admitted, freezes the root plus its task-execution scope,
   interrupts active turns before quiescence, and terminates every materialized
   configured Agent and task-scoped descendant. Each published Agent member delegates
   reversible preparation and committed finish to
   `AgentRunManager.prepareAgentRunTermination(expectedRun)`; a cancelled or
   rejected finish retains its active run/session, while an accepted finish is
   not visible as success until exact-current removal and resource/session
   cleanup complete. The member handle disposes only after that accepted
   managed finish and owns no parallel Agent Tools cleanup path. Stop retains
   the V2 package, catalog row, task/communication history, context, and resume
   identity.
3. The root remains managed and the lifecycle/history projection remains
   `isActive: true` until that whole scope reaches accepted terminal completion
   and the manager unregisters the exact root. A failed Stop retains the same
   managed root and history for retry; it does not make Delete available.
4. Only the later terminal-inactive `READY` history row exposes **Archive** and
   **Delete**. Delete is a new user decision with permanent-deletion
   confirmation; Stop never opens that confirmation and never invokes Delete.
5. `TeamRunHistoryService.deleteStoredTeamRun(...)` delegates physical removal
   to the history catalog. Archive, unarchive, and delete acquire the catalog
   queue before `AgentTeamRunManager.withInactiveHistoryMutation(...)` checks
   the exact root inside the same transition lane as restore. Active or stopping
   roots are rejected; compensated storage failure preserves a truthful inactive
   retry target.

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

The address uses the same canonical absolute non-root `/...` grammar as
`send_message_to`; relative addresses, bare names, and the structural root `/`
are invalid. The root topology resolver first returns one immutable Agent or
AgentTeam placement. Task policy then requires that placement to be a direct
child of the caller's immediate Team and rejects self, deeper, or cross-branch
activation before reserving a task ID or mutating the ledger.

A successful Agent target creates one task Agent at the logical member's
address. A successful AgentTeam target creates one task-scoped TeamRun and sends
the work packet through that Team's exact configured coordinator ingress while
keeping the logical Team as accountable target. The resulting concrete
execution address is runtime identity; there is no public task-instance ID.
Successful delegation returns the formal `task_id`, `status:"active"`, and the
fresh task Agent or task Team coordinator ingress as `target_agent_run_id`.
Activation failure returns `task_id`, `status:"not_started"`, and a concise
`message`, omitting `target_agent_run_id` because no contactable fresh execution
exists.

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

Direct task-Agent activation owns a registry-local durability event gate with
`prepared`, `releasing`, `live`, and `aborted` states. While the Agent candidate
is private, every adapted Agent event is retained behind that gate. After the
active task record and any external platform binding are durable, the root
publishes `TASK_AGENT_ACTIVATED`; only then does `releaseWork()` drain retained
events to the unchanged root publisher. Draining is FIFO, includes events
published synchronously while the drain is in progress, and becomes direct
exactly-once forwarding only after the retained queue is empty. Assignment work
starts in a later microtask after release. Repeated release is idempotent, while
pre-durability failure, abort, or registry disposal drops retained and future
events and starts no assignment work.

This ordering makes activation the public identity barrier: every root-stream
Agent frame for a newly delegated task Agent follows its
`TASK_AGENT_ACTIVATED` event. `RootTeamRun` / `TeamRunEventPublisher` remain the
only `change_sequence` authority, so configured-Agent and multiple same-address
task-Agent frames share one strictly increasing root sequence without acquiring
a second publisher or task-local sequence.

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
canonical member address, logical directory/file analogy, absolute non-root
address rule, Team coordinator ingress rule, and the complete intent-first
collaboration contract. The exact copy distinguishes ordinary communication
with an existing execution from spawning a fresh independently owned task
execution, prohibits duplicate work-packet delivery, records exact returned run
identity, preserves formal result/review lifecycle tools, and presents possible
rule-based handoffs that the Agent evaluates against its outcome. The
Agent selects the single rule whose condition most specifically applies and
notifies only that rule's recipient; it does not fan out one outcome to
additional recipients. The renderer injects no flat recipient, representative,
or delegation roster. Runtime exposure automatically includes `get_handoff_rules`,
`send_message_to`, and `delegate_task` for a valid Team context, with identical
copy across AutoByteus, Codex, and Claude.

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

Successful logical messaging returns that existing Agent or AgentTeam
coordinator run as flat `target_agent_run_id`; rejection returns null identity.
This message creates no task or new execution. A successful `delegate_task`
already creates the task and delivers the complete assignment to its fresh
ingress. Callers must not resend the assignment through logical-address
messaging. Genuinely new clarification may target the exact active fresh ingress
returned by delegation, but only `submit_task_result` and `review_task_result`
change formal task lifecycle state.

`target_agent_run_id` remains the separate live-only direct AgentRun route owned
by `src/agent-communication`; it does not create Team Communication projection.

## Canonical Team Events And WebSocket Projection

Flat Team Agent execution handles subscribe to post-pipeline `AgentRunEvent`s, verify
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

For a live task Agent, the root stream is the continuation path after any exact
retained projection used for first inspection. The activation-before-Agent-frame
barrier ensures a client can materialize and select the exact task identity
before later status, turn, segment, tool, and content events arrive, then route
those events by `agent_execution` without reload, polling, or same-address
fallback. A reconnect snapshot remains the recovery authority; it does not
replace the normal post-activation event-egress contract.

## Restore And Persistence

- `team_run_execution_tree.json` is the canonical immutable V2 runtime tree.
  Its single root Team stores a complete `defaultLaunchConfiguration`; every
  direct configured Agent stores a complete `launchConfiguration`.
- Stored handoffs are the immutable launch-time compiled snapshot. Restore does
  not recompile current definition files.
- Stored concrete AgentRun/TeamRun IDs and provider resume IDs are data; public
  new-launch input cannot supply them.
- There are no persistent configured child TeamRuns. Task executions are
  represented by their concrete execution address and retained task records;
  stale records alone do not recreate an active execution.
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

Current runtime, storage, history, GraphQL, and stream readers consume one
validated V2 package per root TeamRun:

- `team_run_execution_tree.json` with `schemaVersion: 2`;
- versioned `task_delegation_records.json`; and
- versioned `team_communication_messages.json`.

`TeamRunPackageCatalog` admits only complete, cross-file-valid V2 packages. A
root that still contains predecessor `team_run_metadata.json`, lacks any required
package file, or has invalid/unsupported content is excluded from normal runtime
and history instead of entering a compatibility path. `TeamRunStatePackageLoader`
loads the complete package for restore and repairs nonterminal task records to an
interrupted state after restart; it does not pretend that in-flight task
executions resumed.

The required startup sequence has three distinct Team package stages:

1. `20260814_team_run_execution_tree_v1` classifies predecessor roots, converts
   released metadata/communication/task projections into a complete
   migration-owned V1 package, reconciles eligible history/token evidence, and
   leaves valid existing V1 packages unchanged. This stage owns all predecessor
   schema interpretation.
2. `20260823_repair_team_agent_memory_layout` uses that validated V1 intermediate
   to move unambiguous nested-Agent memory directories into the canonical
   root/ancestor-TeamRun/AgentRun layout.
3. `20260824_team_run_execution_tree_v2` transforms exact V1 trees to exact V2.
   It maps legacy runtime labels to current runtime values, sets the root address
   to `/`, preserves IDs, topology, Agent snapshots, tasks, handoffs, application
   binding, and timestamps, and materializes Team defaults from direct
   coordinator Agent snapshots.
4. `20260901_agent_org_flat_team_families_v1` performs the final fixed-depth
   split. Exact native flat Team V2 packages are validated and left in place;
   supported former organization-like Team packages move atomically to the
   AgentOrg V1 family. Unsupported or conflicting items remain unavailable and
   retry on the next startup; current readers never decode the retired shape.

The V2 migration is required on startup, has `ANYTIME` policy, and depends on the
memory-layout migration. Exact V2 files are idempotently skipped. Missing,
invalid, unsupported, or non-regular entries are reported with per-item
outcomes; current readers do not accept V1 as fallback. Each V1 candidate is
validated before transformation, the V2 candidate is validated before write,
and the canonical file is reread and accepted only as exact V2 after the shared
atomic writer returns. A post-rename finalization warning is isolated as a
warning only when the reread target is already valid V2; otherwise the item
fails and remains retry-visible.

The V1-to-V2 coordinator-derived Team default is a historical migration rule
only. New launches must provide complete `teamConfigs[]` and `memberConfigs[]`,
and every new V2 node is built from those resolved values rather than inferred
from a coordinator. The dated configured-recovery branch is not a migration or
runtime input.

The execution tree owns Team identity, definition, creation/archive facts,
application binding, handoffs, the flat configured-Agent topology, task
execution snapshots, and launch configuration. The Team history index owns
list-oriented summary and termination facts. Normal catalogs do not scan
predecessor metadata or manufacture missing packages. AgentOrg packages and
history indexes are documented separately in [Agent Organization](./agent_orgs.md).

## TS Source

- `src/agent-team-execution/domain/team-agent-execution-binding.ts`
- `src/agent-team-execution/domain/team-run-config.ts`
- `src/agent-team-execution/domain/team-run-execution-tree.ts`
- `src/agent-team-execution/domain/team-run.ts`
- `src/agent-team-execution/local/flat-team-execution-factory.ts`
- `src/agent-team-execution/local/flat-team-execution-manager.ts`
- `src/agent-team-execution/local/flat-team-run-backend.ts`
- `src/agent-team-execution/local/registries/configured-agent-execution-registry.ts`
- `src/agent-team-execution/local/registries/task-agent-execution-registry.ts`
- `src/agent-team-execution/local/registries/task-team-execution-registry.ts`
- `src/agent-team-execution/services/flat-team-topology-planner.ts`
- `src/agent-team-execution/services/team-run-service.ts`
- `src/agent-team-execution/services/agent-team-run-manager.ts`
- `src/agent-team-execution/services/team-run-execution-tree-mutator.ts`
- `src/agent-team-execution/services/team-run-persistence-coordinator.ts`
- `src/agent-team-execution/services/member-team-context-builder.ts`
- `src/agent-team-execution/services/member-collaboration-instruction-renderer.ts`
- `src/agent-team-execution/services/team-collaboration-instruction-renderer.ts`
- `src/agent-team-execution/services/inter-agent-message-delivery-intent-builder.ts`
- `src/agent-team-execution/services/member-command-status-overlay-store.ts`
- `src/agent-team-execution/services/team-agent-event-adapter.ts`
- `src/agent-team-execution/task-delegation`
- `src/agent-collaboration/execution`
- `src/agent-tools/task-delegation`
- `src/agent-execution/shared/runtime-agent-tool-exposure.ts`
- `src/services/agent-streaming/agent-team-stream-handler.ts`
- `src/services/agent-streaming/team-agent-event-websocket-projector.ts`
- `src/app-data-migrations/migrations/agent-org-flat-team-families-v1`
