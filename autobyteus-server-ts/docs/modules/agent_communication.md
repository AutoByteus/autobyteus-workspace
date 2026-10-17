# Agent Communication

## Scope

`src/agent-communication` owns the shared public `send_message_to` and
`get_handoff_rules` contracts, argument parsing, selector dispatch, canonical
operation result contracts, direct exact-run routing, and optional direct-message
grants.
Runtime adapters and team execution code call this shared boundary instead of
owning provider-specific selector or result semantics.

## Public `send_message_to` Selectors

`send_message_to` accepts exactly one target selector:

- `recipient_address`: a canonical absolute non-root logical Agent-or-Team
  address beginning with `/` in the caller's collaboration root.
- `target_agent_run_id`: an exact `AgentRun.runId` — any AgentRun in the
  sender's own collaboration root (including a shut-down delegated child), or a
  currently active AgentRun elsewhere.

Callers must not provide both selectors, omit both selectors, or use selector
aliases such as `recipient`, `recipientName`, or `targetAgentRunId`. `content`
must be a non-empty self-contained message body. Optional `reference_files` must
be an array of absolute local path strings and should be used in addition to, not
instead of, explanatory message content. Optional `message_type` defaults to
`agent_message` when omitted; runtime/provider traces must not require providers
to echo that optional field when the semantic delivery is otherwise valid.

The structural root `/`, relative addresses, bare names, backslashes,
repeated/trailing separators, and `.`/`..` path segments are invalid. A Team
address resolves to that mounted Team's exact configured coordinator ingress,
while an Agent address resolves to that mounted Agent execution. Absolute
addresses can select nested, sibling, or cross-branch placements inside the same
collaboration root. The topology resolver rejects missing targets, invalid
traversal through an Agent, self-targets, and Teams without valid ingress before
recipient input or an accepted communication event is produced.

The shared collaboration boundary carries one canonical execution identity
rather than parallel path/owner caches. `TeamMemberExecutionIdentity` is exactly
the frozen `{rootTeamRunId, memberAddress, agentRunId}` shape. The caller's
logical placement, address segments, and basename are derived from
`memberAddress` through the strict address domain. Common placement resolution
returns only frozen Agent
`{kind:"agent",address}` or Team
`{kind:"team",address,ingressAddress}` values. Team ingress is retained because
it is configured topology, not derivable from the Team address; member paths,
route keys, owner coordinates, configs, handles, and runtime lifecycle identity
do not cross this shared message/task placement boundary.

## `recipient_address` Team Route

`recipient_address` is the logical Team route. It requires an active
`MemberTeamContext` with `send_message_to` enabled and delegates to the root
Team delivery boundary owned by `TeamRun` / `MixedTeamManager`. Child managers
forward root-bound delivery intent without rewriting it into flat names or
synthetic representative identities.

Accepted team-route deliveries are the only `send_message_to` path that creates
Team Communication projection:

- recipient input is admitted through the resolved member/team handle into the
  exact target AgentRun FIFO;
- accepted `INTER_AGENT_MESSAGE` events carry the team context needed by the Team
  Communication processor to build address-first `senderAddress` and
  `receiverAddress` values;
- `reference_files` become Team Communication child references persisted under
  the team run; and
- frontend Team tab sent/received perspectives hydrate from that projection and
  match the focused execution by exact normalized `TeamExecutionAddress`.

Acceptance means the live AgentRun owns one ordered, at-most-once forwarding
attempt. It does not mean a provider turn has completed and does not synchronously
wait for a next-turn-only backend. Team Communication/member-input projection is
created once at admission; forwarding and terminal lifecycle facts do not
republish it.

Team-owned internals may still use task-agent/recovery machinery for task
delegation workflows, but public logical delivery has one rooted address
authority and no flat-roster or bare-name fallback.

## `get_handoff_rules`

`get_handoff_rules` is a configured, read-only Team-member tool with no
arguments. It returns only the caller's ordered outgoing compiled handoff rules,
flattened into one condition and canonical destination per entry:

```json
{
  "handoffs": [
    {
      "when": "Delegate field verification when needed.",
      "recipient_address": "/research_team/field_team"
    }
  ]
}
```

An Agent with no outgoing edges succeeds with `handoffs: []`. A call without an
active Team collaboration context is rejected with
`COLLABORATION_CONTEXT_REQUIRED`. Handoff rules are launch-time guidance; reading
them does not authorize a message or task, and the normal target resolver and
task eligibility policy still apply.

## Result Shapes

`send_message_to` returns a strict operation-owned result. Accepted delivery
includes the exact existing AgentRun that accepted the message:

```json
{
  "accepted": true,
  "code": "DELIVERED",
  "message": "Delivered message to /reviewer.",
  "target_agent_run_id": "existing-reviewer-run-123"
}
```

For a logical Agent address, `target_agent_run_id` is that mounted Agent's
existing run. For a logical AgentTeam address, it is the mounted Team's existing
configured coordinator run. For exact-run delivery, it confirms the selected
active run. Rejection preserves the exact operation code/message and returns no
successful receiver identity:

```json
{
  "accepted": false,
  "code": "COLLABORATION_TARGET_NOT_FOUND",
  "message": "Target was not found.",
  "target_agent_run_id": null
}
```

The removed generic `result` field and generic communication-result mapper are
not compatibility surfaces. Native JSON, MCP text JSON, MCP
`structuredContent`, public types, and advertised post-2025-03 output schemas
use the same flat field names and null rule. MCP `isError` is set only for
rejected outcomes.

`get_handoff_rules` instead returns the read-only `{ handoffs }` object shown
above. Its AutoByteus JSON result and MCP `content`/`structuredContent` represent
that same object; it is not wrapped in an operation result.

## `target_agent_run_id` Global Direct Route

`target_agent_run_id` has two paths, chosen by `GlobalAgentRunMessageRouter`.

**Same-root path.** When the sender has a member collaboration context and the
target AgentRun is recorded in the sender's own active root
(`hasAgentExecution`), delivery goes through that root's
`deliverExactAgentMessage`. The root takes a live lease on the target's chain,
wakes a shut-down delegated child in `restore` mode (rejecting with
`TASK_EXECUTION_CONTEXT_UNAVAILABLE` or `TASK_EXECUTION_RESTORE_FAILED` when
that is impossible), and delivers as ordinary root communication. An unknown
run ID in that root is `TARGET_AGENT_RUN_NOT_FOUND`. Root-less senders never
use this path. When the target belongs to closed Task work, the root first
reactivates it if the sender is the run that assigned it, the target is the
copy's agent run ID (a Team copy's coordinator) and the copy's current Task is
not DONE or CANCELLED;
the accepted `message` then ends with "<run id> continues with its conversation." Otherwise it
refuses with `TASK_AGENT_RESOURCE_CLOSED` and guidance. See
[Reactivation](projects.md#reactivation).

**Team run IDs.** `send_message_to` reaches agents only. Before the live-only
path, the router asks every active root (`ActiveCollaborationRootDirectory.findTeamCoordinator`,
each root's `teamCoordinatorOf`) whether the ID is one of its Team copies' team
run IDs; if so it refuses with `TARGET_IS_TEAM_RUN` and the coordinator's agent
run ID to use, for same-root and cross-root senders alike. A team run in no
active root gets the ordinary not-active refusal, like an agent run ID there.

**Global live-only path.** Every other target must be the canonical
server-side `AgentRun.runId` of a run that is active at delivery time.
Dispatch flows through:

`SendMessageToDispatcher -> GlobalAgentRunMessageRouter -> AgentRunManager.getActiveRun(...) -> AgentRun.postUserMessage(...)`

If `AgentRunManager.getActiveRun(targetAgentRunId)` returns no active run, the
delivery fails closed with `TARGET_AGENT_RUN_NOT_ACTIVE`. This path must not
search team rosters, scan `AgentTeamRunManager`, consult task-agent recovery
caches, use metadata-only lookup, resurrect inactive runs, or lazy-start
preallocated members.

Accepted direct-route deliveries:

- admit one model-visible `AgentInputUserMessage` into the active target run's
  AgentRun-owned FIFO;
- include sender run id/name, runtime kind, message type, target run id, and
  `reference_files` in the runtime input metadata;
- emit a direct `INTER_AGENT_MESSAGE` on the target run only after input
  admission acceptance, without waiting for provider forwarding; and
- intentionally omit `team_run_id` and other Team Communication projection
  fields.

Direct exact-run messages therefore do not create Team Communication rows or Team
tab reference entries. Their `reference_files` are visible to the target runtime
through the generated message block and metadata, but Team Communication
reference persistence remains exclusive to accepted team-route messages.

## Optional Direct-Message Grants

`DirectAgentRunMessageGrantRegistry` is an optional policy overlay for
server-created helper runs. A grant can narrow:

- allowed target run ids;
- allowed `message_type` values;
- allowed `reference_files` paths or roots;
- maximum accepted deliveries; and
- expiry time.

Grants do not discover, resolve, restore, or revive targets. Target liveness is
still decided only by `AgentRunManager.getActiveRun(...)`, and rejected grant
checks return typed delivery failures before the target receives input.

The Retrospective Skill Improver uses this seam to send at most one
`skill_update` message to the active target run after meaningful durable
skill package file changes. That message should explain what changed, why it
matters, and how the target should use or reload the updated guidance, while its
dynamic `reference_files` are absolute paths limited to changed or directly
relevant surviving files inside editable skill roots.

## Runtime Projection

Runtime adapters expose one logical `send_message_to` capability through their
native tool surfaces when effective runtime exposure includes it. Standalone
runs require explicit configuration; every valid team member context receives
`get_handoff_rules`, `send_message_to` and `delegate_task`
automatically (a member with no Team scope, such as a standalone host, gets all
but `get_handoff_rules`), with duplicates removed. No task tool is automatic: an
agent that should close the Task its delegation created lists `update_task` in its
definition (see [Delegated catalog copies](#delegated-catalog-copies)). The root topology resolver and active delivery binding
still authorize each team-route call:

- AutoByteus uses the server-owned local `BaseTool` wrapper.
- Codex App Server receives the first-party Agent Tools MCP server through
  thread-scoped `config.mcp_servers.autobyteus_agent_tools` generated from a
  private descriptor; the old dynamic `send_message_to` registration path is not
  retained as a fallback.
- Claude Agent SDK receives the first-party
  `mcp__autobyteus_agent_tools__send_message_to` tool by materializing the
  server-hosted `autobyteus_agent_tools` MCP descriptor; application surfaces
  still see canonical `send_message_to`.
- External process runtimes can receive a session-scoped
  `autobyteus_agent_tools` Streamable HTTP MCP descriptor from the Agent Tools
  MCP Server. That surface also reuses this shared contract and dispatcher, and
  its server-side session still gates exposure by the resolved effective
  AutoByteus tool set.

Explicitly configured standalone runs can use `target_agent_run_id` without team context.
They cannot use `recipient_address` unless they are running with an active
`MemberTeamContext`. Team members use the same shared dispatcher so selector
semantics stay identical across AutoByteus, Codex, Claude, and the
server-hosted Agent Tools MCP surface.

All runtime projections end at the same `AgentRun.postUserMessage(...)`
admission owner. Codex, Claude, AutoByteus, Team routing, external callers, and
the command registry do not select start/append/wait behavior themselves.

Configured Team members receive `get_handoff_rules` through the same runtime
projection: a bound AutoByteus local tool or the session-scoped
`autobyteus_agent_tools` MCP surface for Codex and Claude. The MCP adapter is
available only when the session sender has an active member collaboration
context.

## Communication Versus Task Execution

The rules are defined in the [Collaboration Model](../design/collaboration_model.md) (CM-1 … CM-9); this document describes the mechanics.

`send_message_to(recipient_address)` reaches **the one instance at that
address in the sender's run**: a configured member, an agent already hosted by
the run, or a teammate inside the sender's own team instance. It never creates a
run (CM-4): an address that is not in the run is `COLLABORATION_TARGET_NOT_FOUND`
with guidance to use `delegate_task`. `send_message_to(target_agent_run_id)`
reaches existing executions only. `delegate_task` always spawns one new task copy
(an Agent or AgentTeam) and delivers the complete work packet during that same
call, and it refuses the sender's own team (CM-1, below). The `recipient_address`
identifies what to copy; it is not an alias for the spawned copy, and callers must
not repeat one assignment through both operations. The shared prompt and both tool
descriptions state this identically on every runtime (REQ-009).

### Task-linked message scope

Unowned agents (configured members, hosts, converted runs) are never checked
against Task data. Every delegated copy is Task-owned: a linked copy by its
Project Task, sub-work by its creator's Task, and a description-only copy of an
unowned sender by the Task with no Project that its delegation created. So two
copies owned by different Tasks cannot message each other by run ID; messages to
and from their delegators and configured members work. The refusal (a different
Task, or a closed Task) is returned to the sender as `{accepted: false, code, message}`
by `RootCommunicationEngine.deliver`, so the agent reads the next step; only that first
delivery-scope check returns it, and the later re-checks inside reservation and commit still throw.

A Task-owned sender resolves an address exactly like any other sender (below).
There is no per-Task helper bring-in any more: `broughtIn` records already stored
in a Task's `agent_run_resources.json` stay readable and keep their open or closed
state, but nothing writes new ones. Follow-up by exact run ID never creates a
copy.

Before any wake or acceptance, both sender and recipient input, and deferred
publication, consult the Task record. A closed sender or recipient fails with
`TASK_AGENT_RESOURCE_CLOSED`, including after restart, unless the exact run-ID
message is the assigner's [reactivation](projects.md#reactivation). While any Task's file
is damaged, waking or messaging a copy that is not in the Task view fails up
front with `TASK_AGENT_RESOURCES_UNAVAILABLE`. See
[Project Task agent run resources](projects.md#saved-id-delegation-and-agent-run-resources).

### Address resolution order (`MessageRecipientResolution`)

Every root (Team, Org, Agent) resolves `send_message_to(address)` with the shared
`agent-collaboration/collaborators/message-recipient-resolution.ts`, inside its
operation gate. The function only resolves:

1. **The sender's own team instances**, deepest first (the structural root `/`
   is not one): the instance's own address reaches its coordinator; an address
   under the instance's prefix reaches that instance's member. There is **no
   fall-through** inside the prefix (AR-003): a miss is
   `COLLABORATION_TARGET_NOT_FOUND`, never run-wide, so two parallel copies of a
   team never cross. This is how a delegated Team copy and a mounted Org Team
   each work as one unit (REQ-007).
2. **Run-wide standing placements**: a configured placement, or the run's own
   agent (an Agent root's host).

Any other address is `COLLABORATION_TARGET_NOT_FOUND` ("No agent or agent team
you can talk with has the address <address>. To answer a message or report your
task result, use send_message_to with target_agent_run_id set to the sender run
id. To have a task done by a new agent, use delegate_task."). Nothing is allocated, hosted or written, so a message
can never start an agent; the first message to an existing but Offline agent
starts it (`fresh` on first activation, `restore` after the run is reopened).

After delegation, parent and child communicate only through `send_message_to`
with exact run IDs, in both directions. There is no task submission, review, or
acceptance. A run-ID target in the sender's own collaboration root is routed
through that root, which wakes a shut-down delegated child (restoring its
conversation) before delivery; a target outside the sender's root must be
active. See
[Delegated Child Lifecycle](./agent_team_execution.md#delegated-child-lifecycle).

## Delegated catalog copies

A listed shared Agent or Agent Team definition that is not in the run is reached
only by `delegate_task` (CM-5). Each call spawns one new, independent copy at the
root of the run, with its delegator recorded and a `source` snapshot of the
definition (below). The user's `@` steers the focused agent to the same tool (see
`@` below). Runs recorded by earlier releases as *collaborators* are converted at
startup into ordinary, unowned delegated runs of the same root (migration
`20261015_collaborators_to_delegated_runs_v1`; their memory never moves, see
[Run History](./run_history.md)). The runtime has no collaborator concept.

- **Own-team refusal (CM-1, DEC-008).** `resolveDelegationPlacement`
  (`catalog-delegation.ts`) first asks the root's index `isOwnTeamAddress(sender,
  address)`. It is true for the sender's own address, any address inside (or equal
  to) a team instance that contains the sender at any depth, and, in a Team root,
  every configured root placement for a configured member. Then
  `COLLABORATION_SELF_TARGET_REJECTED` is raised, with `send_message_to` guidance,
  before any placement, preparation, Task link or run allocation. Siblings,
  parents and outside units are allowed: a delegated copy that is not a
  configured member may delegate to a configured placement; an Org agent may
  delegate to a mounted Team it does not belong to.
- **Hosting.** A new copy is always hosted at the root (the former "teammate copy"
  placement under the delegator's Team instance is gone). Copies already stored
  under a Team instance keep their recorded host on restore (DEC-006).
- **Catalog addresses (REQ-003).** `CatalogAddressMap`
  (`catalog-address-map.ts`) is the only allocator. It is a pure function of the
  eligible catalog and the run's addresses in use: a definition already in the
  run keeps its in-run address; any other definition gets its name's segment
  (`/product_team`) when that segment is unique among the eligible catalog and
  not used by the run, otherwise `<segment>_<6 hex of sha256(definitionId)>` for
  every colliding definition. Listing twice with an unchanged catalog gives the
  same addresses; an address that maps to nothing is the normal not found.
- **Placement order for `delegate_task(address)`.** CM-1 refusal, then the root's
  in-run configured placement, then a listed catalog definition (a fresh copy with
  a source snapshot built by `CollaboratorEntryBuilder` and resolved per agent by
  `CollaboratorLaunchResolver`; the task record persists it as the optional
  `source`). Activation and restore use the record's `source` first. Each call is
  a new copy, so parallel copies are allowed. A catalog definition that cannot run
  returns `delegated: false` with "<name> cannot be delegated to: <reason>".
- **`@` (mention resolution).** A user message with `mentions`
  (`{kind, definition_id}[]`, at most 8) is resolved by the root
  (`resolveCollaboratorMentions` → `CollaboratorAdmission.resolveMentions`),
  inside its operation gate, before it is posted. Every mention is re-validated
  by the shared candidate policy (`requireEligible`: shared, not an Org, not a
  built-in, not the port's `ownDefinition()`; it may already be in the run) and
  answered with its name, kind, address and `presence`, **decided for the agent the
  user is talking to** (the viewer; each root passes `mentionViewerRelation(index,
  focusedAgentRunId)`): `self` (the viewer's own placement, by identity, not by
  address), `own_team` (its own team; exactly what `delegate_task` refuses),
  `in_run` (another unit already in the run), `run_agent` (the standalone host,
  mentioned from a task agent) or `not_in_run` (a catalog definition, which resolves
  to its catalog address). A definition already in the run resolves to its preferred
  in-run placement address. **Own team first (SR-011):** before a mentioned definition is treated as `not_in_run`, the focused agent's own team instance is checked by definition (the agent itself → `self`; a member → `own_team` at its address in the instance; the team itself → `own_team`), because the members of a task agent team are not configured placements. **Nothing is written, allocated, hosted or published.**
  `ownDefinition()` is a Team or Org run's own definition. A standalone Agent root
  builds its port **per viewer** (the focused or sending agent): its
  `ownDefinition()` is the host definition only when the viewer is the host. The host
  is always an in-run placement at its host address, so the host's own composer never
  offers the host, and a task agent can mention it. A host self-mention is still
  rejected ("… is this run's own definition."). The `@` caller (Team, Org and
  collaboration stream handlers, and the standalone host path
  `AgentRunCommandCoordinator.post` → `StandaloneAgentRunRoot.postUserMessage` →
  `StandaloneRootMessageDelivery.postToHost`) appends a `[Mentioned agents]` note, one
  line per mention: `- <Name> (agent|agent team) at <address>[, in your team]: <guidance>`.
  The guidance depends on the presence: `not_in_run` → "delegate the task to it with
  delegate_task; it returns a run id to follow up with."; `in_run` → "talk with it using send_message_to, or delegate a task
  to it with delegate_task; that creates a new task agent and returns its run id to follow up with."; `own_team` → "talk
  with it using send_message_to; don't delegate to it."; `run_agent` → "talk with it
  using send_message_to; you can't delegate to it."; `self` → "that is you.". The note
  names no task tool and says nothing about closing a Task; an agent with
  `update_task` learns that from the tool's own description. Runnability is checked
  when the agent delegates. An ineligible mention returns `COLLABORATOR_ADD_FAILED`
  with its name and reason: nothing is posted and the client keeps the draft
  (agent-stream `AGENT_COMMAND_ACK`, Team-stream `ERROR`, collaboration-stream
  ack; each carries `collaborator_name`; the code keeps its name). The note wording
  is owned by `@autobyteus/agent-presentation-contracts` (`collaboratorMentionNote`),
  which composes the current form and still parses every earlier form (the saved
  `[Mentioned collaborators]` notes), so stored history displays unchanged.
- **Task closure (DONE or CANCELLED).** Every root view (Agent, Team, Org; live snapshot and
  stored read) carries `closed_task_executions` beside the unfiltered tree: the
  task executions whose current Task is DONE or CANCELLED, read through the Task port
  (`closedTaskExecutionsIn`) and the shared `listClosedTaskExecutions`. When DONE or
  CANCELLED asks an active root to stop a Task's runs, `RootTaskExecutionResourceScope` first
  publishes the released runs that are closed and in the tree as the sequenced
  `task_executions_closed` (Team: `TASK_EXECUTIONS_CLOSED`). A repeated DONE or
  CANCELLED re-publishes them. The Workspaces tree leaves those executions and their
  subtrees out; messages and contexts keep them. A reactivation publishes the
  reopened execution as `task_executions_reopened` (Team:
  `TASK_EXECUTIONS_REOPENED`, same reference shape) after its Task-side commit;
  clients remove it from their closed set, so it is listed again while its
  still-closed helpers stay hidden. The same holds for a Task with
  no Project: a description-only `delegate_task` by an unowned sender returns
  its `task_id`, and `update_task({task_id, status: "DONE"})` (for an agent that
  selected `update_task`) closes, stops and hides that copy and its sub-work (see
  [Projects](projects.md#tasks-with-no-project-ad-hoc)).
- **Discovery (REQ-001/002).** The opt-in tool `list_available_agents` (see
  [Agent Tools](./agent_tools.md)) asks the sender's root
  (`listAvailableAgents`), which returns `{name, kind, address, description}` for
  every eligible definition once, with the `@` eligibility (Q-2): an in-run
  definition at its in-run address (the standalone host, then configured
  placement or Org mounted Team; ties go to the smallest address), any other at its
  catalog address. Definitions come from the live
  [agent package definitions](./agent_package_definitions.md): a definition just
  written to an agent package is listed once the change is detected, without
  Reload. A Team or Org whose ID exists in more than one registered package is not
  listed, because it is unavailable to every reader. In a standalone Agent run the
  sender is the viewer: a copy member's list holds the host at its host address plus
  exactly the host's own list, and the host's list never holds itself. Listing
  never writes, so a standalone run that only lists gets no `collaboration/`
  package.
- **In the run.** Configured placements and a standalone run's host count as in the
  run: `@` addresses that instance, and `send_message_to` reaches it. Delegated
  copies are not "in the run" by address: they are reached by their run ID.
- **Candidates.** GraphQL `collaboratorMentionCandidates(rootSubjectKind,
  rootRunId, focusedAgentRunId)` lists the `@` options of an active or stored root from the same
  policy: shared Agents (minus built-ins such as the Daily Assistant), then
  shared Agent Teams, in catalog order, **including** definitions already in the
  run; only the port's own definition is left out. That is a Team run's Team.
  For an Agent root, `focusedAgentRunId` is required (omitting it is an error),
  and the host definition is left out only when the focused agent is the host.
  Team and Org roots ignore `focusedAgentRunId`. The ID is not
  membership-checked (an unknown ID gets the non-host view of the menu; the
  send-time re-check verifies). Application-owned runs list none.

### Launch configuration of catalog copies

A catalog copy is started by an agent, not by a user launch form, so nobody picks
its runtime and model. `CollaboratorLaunchResolver`
(`collaborator-launch-resolver.ts`; the "collaborator" file names are a cosmetic
leftover of FU-1) is the single owner of that choice for a catalog copy. For each
agent it takes runtime, model and model settings **together** from the first
usable layer:

```text
Agent copy:                         agent default -> inherited from the run root
Team copy:
  the Team itself:                  team default  -> inherited from the run root
  each member:                      agent default -> the Team's resolved launch
```

- **Layers.** The agent default is the member's agent definition
  `defaultLaunchConfig` (shared or team-local). The team default is the Team
  definition's `defaultLaunchConfig`. "Inherited" is the run root's launch
  configuration. It is never the delegating member's. Workspace and auto-approve
  always come from the run root. Antigravity still forces auto-approve.
- **Usable.** A configured layer is usable only when it names both a runtime and
  a model, the runtime is available (`RuntimeAvailabilityService`), and the model
  and its settings pass `RunModelSelectionValidator.validateMany` for the run's
  workspace. Fields are never mixed across layers. The inherited layer keeps the
  previous runnability check and its error wording. A delegation checks each
  distinct configured runtime once and validates all candidates in one batch.
- **Fallback.** An unusable configured layer is skipped, and the next layer is
  used. The skip is recorded with a reason: `incomplete`,
  `runtime_unavailable`, `model_unavailable` or `model_settings_invalid`. The
  agent still starts. When no layer is usable for some agent, the copy fails with
  `delegated: false` and "<name> cannot be delegated to: <reason>", and nothing is
  added.
- **Notes.** `launch-configuration-notes.ts` renders each skip as one line, for
  example `reviewer: its agent default codex_app_server / sol-6.1 could not be
  used (<reason>); it runs on claude_agent_sdk / sonnet (inherited from the
  run).` A Team-level skip is written once, as "its members without their own
  default run on …". `delegate_task` returns these lines as `launch_notes` (see
  [Agent Tools](./agent_tools.md)). Only the call that started the copy carries
  notes.
- **Recorded, not re-read.** The resolved values and their source
  (`launchSource` / `defaultLaunchSource`: the origin and the skipped layers) are
  written into the copy's `source` when it starts. A member that runs on its own
  default also records its own `launchConfiguration` (see
  [Run History](./run_history.md)). Restore uses these recorded values through
  `effectiveMemberLaunchConfiguration`. Editing a definition default later changes
  only copies started afterwards. Records written before this rule have no source
  and restore on their recorded Team-level value.
- **Unchanged.** Delegation to a configured placement uses that placement's
  launch configuration. Single-agent starts and application launch baselines
  have their own rules. An installed but unauthenticated runtime passes these
  checks and fails at its first turn as a run error, not as a fallback.

### User Model Choice And Stop Of Copies

The user can stop one delegated copy of a running run and change its model while
it is stopped (`run-history/services/delegated-launch-selection-service.ts`,
GraphQL `stopDelegatedExecution`, `updateDelegatedLaunchSelections`,
`delegatedLaunchModelOptions`).

- **Stop.** `stopDelegatedExecution({rootKind, rootRunId, agentRunId | teamRunId})`
  stops the copy and the copies it started (`delegatedStopSet`: by recorded
  delegator, including Task helpers, and the copies a stopped Team copy hosts),
  innermost first. It interrupts the turn and releases the runtime into the same
  state as idle shutdown: the copy stays indexed and offline, its Task stays open,
  and its next message restores it with its conversation. Copies are stopped
  through the root's task lifecycle (`RootTaskExecutionLifecycle.stopForUser`):
  while a copy is being stopped, a live lease on it is refused with
  `TASK_EXECUTION_STOPPING` (a `send_message_to` or `delegate_task` into, from or by
  it returns `accepted: false`), leases already held are drained outside the queue,
  and the `stop` steps never wait at the queue head. Copies recorded before
  delegators were stored cannot be attributed and keep running
  (`notStoppedUnattributed`).
- **Choice.** `updateDelegatedLaunchSelections` records a choice per agent
  (`agentRunId`) or per Team (`teamRunId`): only the model and its settings; the
  runtime, tool approval and workspace stay. It is validated like stopped-run model
  switching (`RunModelSelectionValidator.validateMany`, the copy's current model for
  the capacity rule), all or nothing. On a running run, it is saved only while every
  named copy is stopped: the root re-checks this at one serialization point (the task
  queue's `reconfigure` step), commits the tree, then publishes the committed
  choices to the root's live views like its other tree mutations (Team
  `DELEGATED_LAUNCH_SELECTIONS_CHANGED`, Org and Agent
  `delegated_launch_selections_changed`; each names a record by run ID with its
  choice as now recorded). A copy woken meanwhile refuses the whole Save with
  `COPY_RUNNING`. On a stopped run, the run's own changed settings and the copies'
  choices are saved in one write (`updateStoppedRunLaunchChanges` /
  `updateStoppedRunConfig`; an Agent run's own model is in its metadata and is
  written after the collaboration tree).
- **Per instance.** The choice belongs to that instance only: extra copies at the
  same address and teammates started inside a copy start on the recorded started
  values (`projectTaskSourceMember`).

The shared policy, admission (`@` and eligibility), launch resolver, identity
allocator, entry builder, catalog address map, message-recipient resolution,
catalog delegation and source projection live in
`src/agent-collaboration/collaborators/`; each root implements
`CollaboratorRootPort` and delegates through its existing backends (see
[Agent Team Execution](./agent_team_execution.md), [Agent Orgs](./agent_orgs.md)
and [Standalone Agent Run Root](./standalone_agent_run_root.md)).

Known limits:

- Renaming, unsharing or deleting a listed definition mid-run and reusing its
  name is unsupported (design principle 6); stored addresses never move.
- A delegated run's run ID follows the existing
  [`target_agent_run_id` rules](#target_agent_run_id-global-direct-route): a sender
  in another root reaches it only through the global live-only path (while it is
  active, without a Team/Org tab row). An Offline run is never woken from another
  root (`TARGET_AGENT_RUN_NOT_ACTIVE`).
- A build older than this release cannot read execution trees converted by the
  startup migration (their collaborators now sit in `taskExecutions`). Downgrade is
  unsupported.
- A converted collaborator Team that never started has no conversation; waking it
  by run ID reports `TASK_EXECUTION_CONTEXT_UNAVAILABLE`, like any copy without a
  saved conversation. Nothing is lost.
- Own-team delegation: every root refuses it with
  `COLLABORATION_SELF_TARGET_REJECTED` (CM-1, DEC-008), including a standalone
  run's root; use `send_message_to` for a teammate.

### Sender Of An Agent-To-Agent Message (RD-004)

A `send_message_to` delivery reaches the receiver as input with
`input_origin: inter_agent_delivery` and `sender_agent_id`. Its visible text names
the sender by its run id and, when that address reaches the sender from the
receiver's position (`reachingAddressOf`, design T-5), by its address; never by
name (the chat looks the name up by run ID):

```text
You received a message from the agent with sender address "/code_reviewer" and sender run id "<runId>".
message:
<body>
```

or, when the address would not reach the sender (a task agent, a member of a task
agent team writing from outside its team, a sender in another run):

```text
You received a message from the agent with sender run id "<runId>".
message:
<body>
```

All three builders use this header: root deliveries
(`root-communication-runtime-builder.ts`, Org and standalone roots),
Team-run deliveries (`inter-agent-message-runtime-builders.ts`) and the direct
`target_agent_run_id` route (`global-agent-run-message-runtime-builders.ts`, never
with an address). The two root builders take the address from the delivery input,
which each root fills with `reachingAddressOf(index, receiver, sender)`. Stored
deliveries recorded while the header also carried `sender address: <address>` keep
that text (and `sender name: …, sender id: …` before that); the web parser reads every form, and the chat label comes only from the run ID. The released header is frozen in the Org first-message
summary migration, which matches historical traces. Memory recording
(native AutoByteus and the external-runtime recorder) stores that sender as the
user trace's `senderId`; replay projects such a trace as an
`inter_agent_message` conversation item, and the web shows it as
"From <Sender>:". See [Run History](./run_history.md).

## Out Of Scope

This module does not provide a distributed inbox, inactive-run message queue,
global run discovery API, cross-process routing, broad ACL system, or task result
/ review / acceptance protocol. Task delegation remains owned by the dedicated
task-delegation tools and services.
