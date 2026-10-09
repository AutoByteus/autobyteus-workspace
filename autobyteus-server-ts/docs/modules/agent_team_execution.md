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
  selects the AutoByteus, Codex, Claude, AGY, or Grok Build backend from each launch setting.
  Each execution family injects its own provider factories, definition
  services, session authority, memory/context environment, and task-execution
  identity capabilities; Team execution never reaches across to another
  family's manager or identity allocator.

`antigravity_cli` is also a selectable external member runtime. It retains
the same exact Team member execution address and root-owned provider binding;
its capsule, permissions, and trace behavior are documented in
[Antigravity CLI Runtime](./antigravity_cli_runtime.md).

`grok_build` is likewise a selectable external member runtime with the same
exact member address and root-owned provider binding (the Grok `sessionId`);
see [Grok Build Runtime](./grok_build_runtime.md).

## Launch-Time Identity

Public launch input contains `teamDefinitionId`, one complete root Team default,
and one complete configuration for every exact direct-Agent address; callers do
not choose concrete run identities. `TeamRunService` canonicalizes workspace
roots, and `FlatTeamTopologyPlanner` validates the flat definition, coordinator,
exact Agent coverage, and definition bindings before
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
| Codex or Claude member | `FlatTeamAgentExecutionHandle -> AgentRunManager` | Standalone Codex or Claude `AgentRun` | `composeSharedCarpenterPrompt` projects shared Team Instruction plus AgentTeam Addressing/Collaboration through provider instruction boundaries. `get_handoff_rules`, `send_message_to`, `delegate_task` and `create_or_update_task` remain automatically exposed through Agent Tools MCP. |

## Durable Member Activation And Restore

Root create versus restore intent is explicit process-local materialization
state. `AgentTeamRunManager` passes it through `FlatTeamExecutionFactory` and
the configured-Agent registry; handles do not infer a restored native run from
`platformAgentRunId`. That intent governs a handle's first activation only.
After the handle has published an AgentRun once, any later re-activation plans
as `restore`, for example a message to a member whose runtime died. The planner
receives the mode per attempt. A crashed external member therefore continues its
persisted provider conversation, and a native member restores its context. A
failed first activation keeps the original mode.

Before a candidate is built, a handle canonicalizes and reactivates the
persisted workspace through `WorkspaceManager.ensureWorkspaceByRootPath(...)`.

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
- A delegated task Agent starts as a fresh execution. An external task binding
  is applied to the same lock-head tree snapshot as task activation, and the
  single execution-tree write finishes before publication and work release.
  Native task Agents stage no provider binding. A task Agent that was shut down
  for idleness is later woken in `restore` mode (see
  [Delegated Child Lifecycle](#delegated-child-lifecycle)).

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
or non-cataloged packages, and writes the current execution tree through the
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
replacement needs fresh runtime-catalog membership and valid target-schema
settings. AutoByteus additionally needs verified positive non-decreasing
context capacity; external runtimes do not. Same-model settings skip the
AutoByteus replacement-capacity comparison only. An incompatible descendant blocks
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
one direct Agent in the flat root. Each task-Team ID must select the next task
Team recorded in the execution tree, and the optional task-Agent ID must select
the exact recorded task Agent for that logical member. A recorded delegated
child that is shut down is still a valid target; `SEND_MESSAGE` wakes it first.
Missing, stale, or mismatched identity fails
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
supported Team follow-up path, and a send to a shut-down delegated child wakes
that child's chain inside a live lease before input is reserved. Interrupt and
tool decisions are active-only and must not restore stopped work: on a non-live
task Agent they return `RUN_NOT_ACTIVE` without touching the handle.

Interrupt acknowledgement is command-correlated. The server echoes the exact
client `command_id` and execution address with `accepted`, `rejected`, or
`failed`; accepted means the runtime accepted the interrupt request, not that a
terminal status has already been projected.

## Root And Agent Lifecycle

Flat Team preparation is always scope-only: it builds the TeamRun and its
member contexts but never starts a member. This holds for every Team kind with
no option to opt out: fresh and restored standalone Teams, Org-mounted Teams,
collaborator Teams, and delegated Team copies (task Teams), whether hosted at
the root (`RootTeamExecutionDirectory.beginRootTaskTeam`) or inside a Team
(`TaskTeamExecutionRegistry`). The full configured topology is available, but
configured Agents remain unstarted and Offline until required by work.
Restore retains its mode, member identity, history and saved provider binding;
Offline does not mean that a retained member has no history or binding.
The first supported input or peer delivery activates only its exact receiver;
selecting a row or publishing the root is not worker startup. Concurrent first
inputs for the same member share one readiness attempt. Different members
prepare independently and serialize only their root persistence mutations.
This is an execution policy, not a UI color/status override.

A delegated Team copy therefore starts only its coordinator, when the work
packet is delivered to it (the seed). Every other member has no AgentRun, no
provider session and a `null` saved `platformAgentRunId` in the execution
tree, and shows Offline, until work reaches it; its binding is adopted into the
tree when it starts. Work-bearing task preparation still stages identity before
durable task publication and release, but a task Team stages no provider
bindings. If the coordinator cannot start, the seed fails and `delegate_task`
fails as for any seed failure. Copies delegated before this behavior keep their
already-started members until normal idle shutdown; they restore lazily like
any other copy, with no migration.

A member's start for an input (`ConfiguredAgentExecutionHandle.startForInput`)
is one step shared by both input entry points: teammate delivery
(`reserveInput`, used by `send_message_to` and handoffs) and direct input
(`postMessage`, used by the delegated seed and user or application input). If
the member cannot start, each audience gets one outcome:

- the sender gets a not-accepted result with code `AGENT_RUN_ACTIVATION_FAILED`
  (`{reserved: false}` for a reservation, `{accepted: false}` for a post). The
  message carries the cause as `<underlying code>: <message>`, for example
  `AGY_MODEL_UNAVAILABLE: …`; the underlying code is not the result code;
- the member's status shows `error` with the cause; and
- the member's conversation gets one error card (the `readiness_failure` event,
  emitted once per failed start attempt and adapted to an `ERROR` presentation
  event).

Input closed for the member at that moment (Task DONE, root shutdown) is not a
start failure: the sender gets `AGENT_RUN_NOT_ACCEPTING_INPUT` with the closure
reason, with no `error` status and no error card. A failure while the member's
run is already active is unexpected and is thrown, not reported this way. This
contract is the same for UI-started Teams and Orgs, collaborator Teams and
delegated copies.

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
`AGENT_STATUS`, command overlays, delegated-child liveness, and open work are
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
   managed finish and owns no parallel Agent Tools cleanup path. A member whose
   runtime already died is no longer published by `AgentRunManager`. Its
   resources were released on inactive discovery, so its handle treats the root
   fence and termination as already complete. The root still fences the handle
   first, so shutdown never re-activates it. Stop cancels every delegated-child
   idle timer and retains the package, catalog row, execution tree (including
   delegated children), communication history, context, and resume identity.
3. The root remains managed and the lifecycle/history projection remains
   `isActive: true` until that whole scope reaches accepted terminal completion
   and the manager unregisters the exact root. A failed Stop retains the same
   managed root and history for retry; it does not make Delete available. A
   failed attempt, including a failed frozen-scope fence or finish, is never
   cached, so a retry re-runs it. Restore of a root that is still managed but no
   longer active (stopping or fail-stopped) first completes that root's
   termination inside the restore transition, then restores it. If termination
   still fails, restore reports `TEAM_RUN_STOP_INCOMPLETE` instead of "already
   managed". `TeamRunService.restoreTeamRun` has no separate pre-guard; the
   manager decides.
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

The only first-party delegation tool is `delegate_task`. Delegation is a pure
spawn: it starts a fresh child and hands back its ingress run ID. It creates no
separate delegation task-record/submission/review/settlement subsystem. Optional
Project Task linkage uses the existing business Task authority; the retired
`submit_task_result` / `review_task_result` tools, the task-records file, the
delegation task GraphQL/REST APIs, and their task UI no longer exist. The current
Projects APIs/UI are separate and are not retired. Legacy task-plan tools
and runtime-specific delegation protocols are not part of this surface, and
legacy configured tool names are ignored.

`delegate_task` accepts:

```text
{
  recipient_address,
  description,
  reference_files?
}
```

Alternatively, `{recipient_address, task_id}` selects saved Project Task work.
The parser rejects mixed description/reference overrides and a caller
`project_id`. Described delegation without an ID keeps the contract above. Only
non-owned runs, such as the Manager, may pass a `task_id`. A Task-owned run
that does so is rejected with `TASK_AGENT_RESOURCE_OWNED_SENDER`. The saved
text and context, the assignment record and permanent DONE closure belong to
the [Project Task agent run resources contract](projects.md#saved-id-delegation-and-agent-run-resources).

The address uses the same canonical absolute non-root `/...` grammar as
`send_message_to`; relative addresses, bare names, and the structural root `/`
are invalid. `RootTeamRun.resolveDelegationPlacement` returns one immutable
Agent or AgentTeam placement: a configured member first, then a collaborator
of the run or a member of a collaborator Team (see
[Agent Communication](./agent_communication.md#collaborators)); delegating to a
collaborator starts an extra copy. Task sources come from
`TeamTaskSourceResolver`, which projects a collaborator entry into the same
source shape a configured placement has. An Agent cannot delegate to its
own logical placement. An address that is neither returns
`{ delegated: false, message }` rather than failing the call. Input and
admission failures (`VALIDATION_ERROR`, `INVALID_REFERENCE_FILE`,
`ROOT_RUN_NOT_ACTIVE`) are tool errors raised before any preparation.
`resolveMessageRecipient` (used by `send_message_to`) resolves a configured
member, then a collaborator Agent, a collaborator Team (its coordinator) or a
collaborator Team member: one execution per address.

### Collaborators In A Team Root (AR-006)

A Team root hosts each collaborator in its root TeamRun's
`FlatTeamExecutionManager`:

- a collaborator Agent is a direct Agent of the root TeamRun, held by
  `local/registries/team-root-collaborator-agent-registry.ts`
  (`TeamRootCollaboratorAgentRegistry`, beside the collaborator Team registry):
  `prepareCollaboratorAgent` prepares its lazy handle with the activation mode it
  was added with. Direct-agent commands, input reservation, delivery, status and
  input snapshots, root-termination freeze and restore consult configured handles
  first, then this registry. `FlatTeamMemberConfigResolver` and
  `runtimeContext.memberContexts` hold configured members only (REQ-002);
- a collaborator Team is one TeamRun under the root, held by
  `local/registries/collaborator-team-execution-registry.ts` (lazy members, no
  idle shutdown) and registered with the root's `TeamRunResolver`;
  `requireTeamRun` falls back to `requireCollaboratorTeam`.

`TeamExecutionIndex` records `collaborator` and `collaborator_team_member`
executions (a collaborator Team's parent is the root TeamRun, so a member's
physical scope is `[collaboratorTeamRunId]`). Admission prepares, commits, then
publishes; `materializeTeamRoot` re-hosts collaborators with the root in
`restore` mode; the root TeamRun's termination includes them.

**Member collaboration scope (CR-001).** One owner,
`agent-collaboration/execution/domain/member-instance-scope.ts#resolveMemberCollaborationScope`,
decides every member's outgoing handoffs and enclosing instruction in all three roots, at
construction and restore. The hosting TeamRun's own context reaches it as `hostTeam` through the
member-context callback. Rules, in order:
1. a direct member of its non-root hosting Team instance (collaborator Team, any copy, including a
   catalog copy prepared from its recorded `source`) gets that instance's handoffs and Team
   instruction;
2. a root-level member at a configured root placement (or a copy at its address) gets the root's
   handoffs and instruction;
3. anything else (a collaborator Agent, a catalog Agent copy, an Agent hosted by a Team it is not a
   member of) gets none — a catalog Agent copy in a Team root gets no root-Team instruction.

Agent-initiated collaborators (REQ-004/005/007) use the same hosting. The root's
message and delegation addressing lives in `services/team-run-message-delivery.ts`
(`TeamRunMessageDelivery`), called inside the materialization gate:
`send_message_to(address)` resolves with the shared `MessageRecipientResolution`
(the sender's own Team instance first, then run-wide, then a catalog bring-in via
`TeamRunCollaborators.bringInAt`; the materialization gate admits concurrently,
so bring-ins and `@` mention resolutions are serialized by the root's
`CollaboratorAdmissionQueue`; `@` itself adds nothing), and `delegate_task(address)`
adds a catalog placement with a source snapshot after configured and
collaborator placements. Copies are placed by address through the shared
`resolveTaskCopyHost` (REQ-012; the Team root's rule, now shared by all roots); catalog copies
record `source` on their task execution and restore from it.
`listAvailableAgents(sender)` is read-only and takes no gate.

A successful Agent target creates one task Agent at the logical member's
address. A successful AgentTeam target creates one task-scoped TeamRun and sends
the work packet through that Team's exact configured coordinator ingress; only
the coordinator starts, and the other members start when work reaches them (see
[Root And Agent Lifecycle](#root-and-agent-lifecycle)). The
work packet is the child's first message: the delegator's address and AgentRun
ID, the description, and any reference files. The result is a strict union:

```text
{ delegated: true, target_kind: "agent", target_agent_run_id: "<Agent copy run ID>" }            // an Agent copy
{ delegated: true, target_kind: "team", target_team_run_id: "<Team copy run ID>",
  target_team_coordinator_agent_run_id: "<its coordinator AgentRun ID>" }                         // a Team copy
{ delegated: true, target_kind: "agent", target_agent_run_id: "…", task_id: "ad_hoc_task_…" }     // Task created
{ delegated: false, message: "<why nothing started>" }
```

The result names each ID for what it is: a Team copy's team run ID (to give it
a later Task) and its coordinator's agent run ID (to message it), never one
ambiguous `target_agent_run_id`. Internally the roots return a
`TaskDelegationOutcome` (`{delegated, copy: DelegatedCopy, taskId?}`) and only
the tool layer serializes it.

`delegate_task` can also give a saved Task to an **existing** copy by its own ID
(`{target_team_run_id | target_agent_run_id, task_id}`): each root's
`assignToExistingCopy` hands it to `RootTaskExecutionLifecycle.assignToExistingCopy`
together with the root's exact delivery, so the copy is woken or restored with
its conversation and receives the Task's work as a `task_assignment` message
from the delegator. The address path is `delegateToNewCopy`. See
[Follow-up Task to an existing copy](projects.md#follow-up-task-to-an-existing-copy).

`task_id` is present only when the delegation created a Task with no Project:
a description-only `delegate_task` from an agent that is not working on a Task.
Every delegated copy therefore belongs to a Task (linked: the Project Task;
sub-work: its creator's Task; otherwise its own ad-hoc Task), and
`create_or_update_task({task_id, status: "DONE"})` closes it (see
[Projects](./projects.md#tasks-with-no-project-ad-hoc)).

After delegation, parent and child talk only through `send_message_to` with run
IDs, in both directions. `recipient_address` identifies the definition to
instantiate; it is not an alias for the spawned child.

Activation is serialized per root by `RootTaskExecutionLifecycle`
(`src/agent-collaboration/execution/task`) through its FIFO command queue. The
subject adapter (`TeamTaskExecutionAdapter` for Team roots,
`AgentOrgTaskExecutionAdapter` for Org roots) prepares the child privately,
commits **one** execution-tree write that records the child together with
`delegatorAgentRunId`, and only then publishes `TASK_EXECUTION_STARTED` and
releases work.

Direct task-Agent activation owns a registry-local durability event gate
(`preparing`, `sealed`, `committed`, `aborted`). While the Agent candidate is
private, every adapted Agent event is retained behind that gate. After the tree
write and any external platform binding are durable, the root publishes
`TASK_EXECUTION_STARTED`; only then does `releaseWork()` drain retained events
to the unchanged root publisher. Draining is FIFO, includes events published
synchronously while the drain is in progress, and becomes direct exactly-once
forwarding only after the retained queue is empty. Assignment work starts in a
later microtask after release. Repeated release is idempotent, while
pre-durability failure, abort, or registry disposal drops retained and future
events and starts no assignment work.

This ordering makes activation the public identity barrier: every root-stream
Agent frame for a newly delegated child follows its `TASK_EXECUTION_STARTED`
event. `RootTeamRun` / `TeamRunEventPublisher` remain the only
`change_sequence` authority, so configured-Agent and multiple same-address
task-Agent frames share one strictly increasing root sequence without acquiring
a second publisher or task-local sequence.

## Delegated Child Lifecycle

Delegated children (task executions: a task Agent or a task Team) are managed
as execution resources, distinct from business Tasks. **The execution tree
carries no Task information.** Which copies, Team members and helpers belong to
a Project Task is recorded only on the Task side, in that Task's
`agent_run_resources.json`. The in-memory view loaded from it is reached
through `TaskExecutionResourcePort`. That Task record, not the physical subtree or
the definition/address, decides what DONE stops: a copy has one current Task,
and DONE stops only copies whose current Task it is. The Manager, borrowed unowned
runs and other Tasks are outside that set.

The idle/wake rules below apply to unowned children and to Task-owned children
while their record is open. Explicit DONE closes the Task's runs: while a
record is closed its runs receive no input and are never woken or restored,
including after restart; a deleted Task's runs stay closed. DONE cancels registered
preparations and requests an exact stop of each closed run on every authority
the root still holds. Stop failures are logged and kept in memory only, never
persisted. Repeating DONE requests the stop again. A stop failure is never
reported as success, and DONE never terminates the whole root. History remains
inspectable. Reopening the Task starts nothing and does not revive old copies by
itself. After the agent reopens the Task, the run that assigned the work can
reactivate exactly that copy by messaging its run ID (for a Team, its
coordinator): the root settles the previous stop, discards the released handle
or TeamRun, reopens that one record and restores the copy with its conversation
through the wake path below. Helpers stay closed. See
[Reactivation](projects.md#reactivation).

- **Liveness (one predicate, runtime-only, never persisted).** A task Agent is
  live only while its registry holds a handle **and** that handle's AgentRun is
  active. A task Team is live only while its TeamRun is registered. A chain is
  live only if every task execution in it is live. The same predicate
  (`adapter.isLive`) drives the idle schedule, the queue-head shutdown skip, the
  restore precheck, open work, status snapshots, and command gating.
- **Idle shutdown.** `TaskExecutionIdleShutdownSchedule` arms a grace timer for
  every live execution in a child's chain on `idle`, `offline`, or `error` status
  and on every live-lease release; `running` or `initializing` cancels it. When
  the timer fires, the shutdown command runs at the queue head, skips leased or
  non-live executions, and shuts the execution down only if
  `tryPrepareTerminationIfQuiescent` succeeds. A child waiting for tool approval
  is never quiet, and neither is a child whose runtime reports a running
  background task (`AgentRunBackend.hasRunningBackgroundTasks()`: a Claude
  `run_in_background` task or an AGY background step; Codex, AutoByteus and ACP
  report none). There is no time limit for such a wait. A Team copy is quiet only
  when every member is. A skipped fire sets no new timer; when a background task
  ends (`BACKGROUND_TASK_UPDATED` with `completed`, `failed` or `stopped`), the
  root calls `onAgentBackgroundTaskEnded`, which re-arms every live execution
  containing that agent, so an otherwise quiet copy is shut down one grace
  period after the end even when no turn follows (AGY). The root-stop fence and
  Task DONE or CANCELLED release do not consult background tasks: they stop the copy and its
  background work as before. A task Agent keeps its registered handle and only its run
  ends; a task Team terminates as a whole and is unregistered. Nothing is
  written to the tree on shutdown or wake.
- **Grace period.** The server setting
  `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS` (default 600 000 ms = 10
  minutes; accepted range 60 000–86 400 000 ms) is a predefined editable server
  setting. It is read at arm time, so a change applies to the next quiet
  moment.
- **Wake-on-message.** A `send_message_to` run-ID delivery from the same root,
  and an operator composer message, acquire a live lease for the target's chain.
  `assertRestorableChain` first checks that each shut-down ingress has readable
  conversation activity; otherwise the delivery is rejected with
  `TASK_EXECUTION_CONTEXT_UNAVAILABLE` and nothing is restored. The chain is then
  restored outermost-first in `restore` mode (native or external provider
  session) and the message is delivered. A restore failure returns
  `TASK_EXECUTION_RESTORE_FAILED` and re-arms whatever was already restored.
  Senders in another root, and root-less senders, can never wake a child.
- **Open work.** A task execution counts as open work only while an Agent inside
  it is `initializing` or `running`. An errored or shut-down child does not
  block the root.
- **Status.** Non-live task Agents report the standard `offline` status; the UI
  has no separate shut-down state.
- **Root reopen.** No handles exist after a restart, so every recorded child
  starts shut down. Unowned children and children whose Task record is open
  are wakeable. Children closed in their Task's `agent_run_resources.json`
  stay fenced. There is no reopen repair.
- **Root stop.** `closeExternalAdmission` / `enterRootFailStop` dispose every
  grace timer; the frozen termination scope stops every live execution.

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
collaboration contract (REQ-009 wording). The exact copy distinguishes ordinary
communication with the one instance at an address (its "Ordinary
Communication" section), where a teammate's address reaches the member of the
sender's own team instance and an available agent or team is brought in on
first use, from spawning a new copy with every `delegate_task` call (its
"Delegated Agents" section). It also prohibits duplicate work-packet delivery,
tells the Agent to follow up on a copy only through its returned run ID, states
that a quiet copy is shut down (but not while it has a running background task)
and restored with its conversation on the next message, and presents possible rule-based handoffs that the Agent evaluates against its outcome. The
Agent selects the single rule whose condition most specifically applies and
notifies only that rule's recipient; it does not fan out one outcome to
additional recipients. The renderer injects no flat recipient, representative,
or delegation roster. Runtime exposure automatically includes `get_handoff_rules`,
`send_message_to`, `delegate_task` and `create_or_update_task` for a valid Team
context, with identical copy across AutoByteus, Codex, and Claude.

`send_message_to.recipient_address` resolves through the root logical placement
service, the sender's own Team instance first: a teammate address inside a
collaborator Team or a delegated Team copy reaches that same instance's member,
never another copy (REQ-007). An Agent target delivers to that real Agent. An AgentTeam target
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
A run ID never creates an execution; a first message to an available catalog
address brings that one instance in (see
[Agent Communication](./agent_communication.md#address-resolution-order-messagerecipientresolution)).
A successful `delegate_task` already
starts the child and delivers the complete assignment to its fresh ingress.
Callers must not resend the assignment through logical-address messaging; all
later exchange with the child, in both directions, uses its agent run ID (a
Team copy's coordinator). A Team copy's team run ID is refused by
`send_message_to` (`TARGET_IS_TEAM_RUN`) with the coordinator's run ID to use.

`target_agent_run_id` is the exact AgentRun route owned by
`src/agent-communication`. `GlobalAgentRunMessageRouter` sends a run-ID target
that belongs to the sender's own collaboration root through that root
(`deliverExactAgentMessage`), inside a live lease: it wakes a shut-down
delegated child first, also reaches a not-yet-activated configured member
(which then activates lazily), and is recorded as ordinary Team Communication.
Targets outside the sender's root use the global live-only path, which creates
no Team Communication projection and rejects an inactive target with
`TARGET_AGENT_RUN_NOT_ACTIVE`; nothing is ever restored across roots.

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

- `TASK_EXECUTION_STARTED` carries the host `parent_team_run_id` and the new
  task Agent or task Team execution, including its nullable
  `delegator_agent_run_id`;
- `COLLABORATOR_ADDED` carries a new root-level collaborator entry with its run
  IDs; its executions exist (Offline) from then on;
- `ERROR` with `COLLABORATOR_ADD_FAILED` rejects a send whose collaborator could
  not be added and carries `collaborator_name`;
- `TEAM_COMMUNICATION_MESSAGE` carries exact sender/receiver addresses;
- `MEMBER_INPUT_MESSAGE` carries its execution, optional sender, stable message
  identity, origin, and context files; and
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

- `team_run_execution_tree.json` is the canonical immutable runtime tree.
  Its single root Team stores a complete `defaultLaunchConfiguration`; every
  direct configured Agent stores a complete `launchConfiguration`.
- Stored handoffs are the immutable launch-time compiled snapshot. Restore does
  not recompile current definition files.
- Stored concrete AgentRun/TeamRun IDs and provider resume IDs are data; public
  new-launch input cannot supply them.
- There are no persistent configured child TeamRuns. Delegated children are
  recorded in the execution tree with their concrete execution address, run
  IDs, `startedAt`, and (for children created since the resource lifecycle)
  `delegatorAgentRunId`. The tree is the only persisted authority for them;
  after reopen they start shut down and are woken on demand, unless their
  Task's agent run resources record them as closed. The tree itself holds no
  Task stamp. Task ownership comes only from the Task side.
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
validated current package per root TeamRun:

- `team_run_execution_tree.json`; and
- versioned `team_communication_messages.json`.

The execution tree is **read tolerantly and written exactly** (see the
[data migration guideline](../design/data_migration_guideline.md) section 3).
The reader requires the known required fields (`createdAt`, `archivedAt`,
`applicationBinding`, `handoffs`, `rootTeam`, and the required node, member,
launch-configuration, and task-execution fields), checks the invariants (unique
run IDs, canonical addresses, a unique coordinator, handoff endpoints, and a
present `delegatorAgentRunId` resolving to an AgentRun in the same tree), and
projects only known fields. `schemaVersion`, the retired `settledAt`, and any
unknown key are ignored and never reach memory or a later write. The writer
emits the exact current shape with no `schemaVersion`. An older tree is
therefore admitted as-is and loses those obsolete fields only when the runtime
next saves it for its own reasons. Handoff entries inside the tree remain
exact-key (`normalizeCollaborationHandoffs`). A preserved released V1 tree is
still rejected structurally, because its launch configurations use retired
`runtimeKind` values.

Released `task_delegation_records.json` files are neither required nor retired:
they stay untouched on disk and are never read. `TeamRunPackageCatalog` admits
only complete, valid current packages. A root that still contains predecessor
`team_run_metadata.json`, lacks a required package file, or has
invalid/unsupported content is excluded from normal runtime and history instead
of entering a compatibility path. `TeamRunStatePackageLoader` loads the package
for restore; delegated children come back shut down, with no repair step.
Runs closed by a Task's DONE remain permanently non-wakeable.

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

These released migrations keep their released behavior on skip-version
installs. Where they classify shapes ("already current" versus "old") or read
released task-records files, they import frozen strict copies from
`src/app-data-migrations/legacy/released-run-package-shapes/` (Team tree V2,
Org tree V1, task-records V1, Org state-package V1), never the current tolerant
readers. Current runtime code never imports that module. The delegated-child
resource lifecycle added no migration of its own.

The V1-to-V2 coordinator-derived Team default is a historical migration rule
only. New launches must provide complete `teamConfigs[]` and `memberConfigs[]`,
and every new tree node is built from those resolved values rather than inferred
from a coordinator. The dated configured-recovery branch is not a migration or
runtime input.

The execution tree owns Team identity, definition, creation/archive facts,
application binding, handoffs, the flat configured-Agent topology, delegated
child executions (with their delegator), and launch configuration. The Team history index owns
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
- `src/config/task-execution-idle-shutdown-setting.ts`
- `src/run-history/store/run-execution-tree-shared-record-schemas.ts`
- `src/run-history/store/team-run-execution-tree-schema.ts`
- `src/app-data-migrations/legacy/released-run-package-shapes`
- `src/agent-execution/shared/runtime-agent-tool-exposure.ts`
- `src/services/agent-streaming/agent-team-stream-handler.ts`
- `src/services/agent-streaming/team-agent-event-websocket-projector.ts`
- `src/app-data-migrations/migrations/agent-org-flat-team-families-v1`
