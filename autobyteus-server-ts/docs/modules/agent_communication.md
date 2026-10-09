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
the accepted `message` then ends with "<run ID> was reactivated." Otherwise it
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
`get_handoff_rules`, `send_message_to`, `delegate_task` and `create_or_update_task`
automatically (a member with no Team scope, such as a standalone host, gets all
but `get_handoff_rules`), with duplicates removed. `create_or_update_task` is
there so an agent can mark DONE the Task its delegation created (see
[Collaborators](#collaborators)). The root topology resolver and active delivery binding
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

`send_message_to(recipient_address)` reaches **the one instance at that
address**: a configured member, a collaborator or its member, or a teammate
inside the sender's own team instance. An available catalog Agent or Agent Team
that is not yet in the run is brought in on its first message (see
[Collaborators](#collaborators)); later messages reach that same instance. `send_message_to(target_agent_run_id)` reaches existing
executions only and never brings anything in. `delegate_task` instead always
spawns one new task copy (an Agent or AgentTeam) and delivers the complete work
packet during that same call. The `recipient_address` identifies what to copy; it
is not an alias for the spawned copy, and callers must not repeat one assignment
through both operations. The shared prompt and both tool descriptions state this
identically on every runtime (REQ-009).

### Task-linked message scope

The ordinary one-instance/run-wide behavior below is unchanged for unowned
senders. Unowned agents (configured members, hosts, collaborators) are
never checked against Task data. Every delegated copy is Task-owned: a linked
copy by its Project Task, sub-work by its creator's Task, and a description-only
copy of an unowned sender by the Task with no Project that its delegation
created. So two copies owned by different Tasks cannot message each other by
run ID; messages to and from their delegators and configured members work.

A Task-owned sender resolves an address in this order:
1. Its deepest own Team instance, with no fall-through on a miss.
2. That Task's open `broughtIn` helper at the address (dedupe key: Task plus
   address).
3. An existing **unowned** run in the root. Such an adviser is borrowed, not
   adopted, so DONE never stops it.
4. Otherwise, one new helper copy, recorded as `broughtIn` in that Task's
   `agent_run_resources.json` before resources are acquired. Concurrent
   requests from the same Task reuse it. Different Tasks get distinct copies.

Another Task's run is never borrowable: a sender and a recipient owned by
different Tasks fail with `TASK_AGENT_RESOURCE_CONFLICT`. Follow-up by exact
run ID never creates a copy.

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
operation gate:

1. **The sender's own team instances**, deepest first (the structural root `/`
   is not one): the instance's own address reaches its coordinator; an address
   under the instance's prefix reaches that instance's member. There is **no
   fall-through** inside the prefix (AR-003): a miss is
   `COLLABORATION_TARGET_NOT_FOUND`, never run-wide or catalog, so two parallel
   copies of a team never cross. This is how a collaborator Team, a delegated
   Team copy and a mounted Org Team each work as one unit (REQ-007).
2. **Run-wide**: a configured placement, a collaborator, or a collaborator-Team
   member.
3. **Catalog**: an address that `CatalogAddressMap` maps to an eligible
   definition not in the run is brought in by the root's `*Collaborators.bringInAt`
   (`CollaboratorAdmission.ensure`, inside the operation the root's gate already
   admitted; no gate re-entry), then resolved again and delivered; the first
   message starts it. A failed add returns `COLLABORATOR_ADD_FAILED` with the
   reason in `message` and adds nothing.

   **Concurrency.** The root gates (`RootOperationGate`,
   `RootTeamRunMaterializationGate`) are admission and drain barriers, not
   mutexes: they let operations run concurrently and only drain them on
   termination. Collaborator admissions are serialized by a per-root
   `CollaboratorAdmissionQueue` (`collaborator-admission-queue.ts`, a promise
   chain inside each root's `*Collaborators` service). It serializes catalog
   bring-ins (`bringInAt`) and `@` mention resolutions alike, and
   `bringInAt` re-reads the catalog map against the current tree inside the
   queue. So when two first messages to the same new address arrive together,
   the second finds the instance the first committed and reuses it; no second
   instance and no duplicate-address failure (RS-003).

Any other address is the normal `COLLABORATION_TARGET_NOT_FOUND`.

After delegation, parent and child communicate only through `send_message_to`
with exact run IDs, in both directions. There is no task submission, review, or
acceptance. A run-ID target in the sender's own collaboration root is routed
through that root, which wakes a shut-down delegated child (restoring its
conversation) before delivery; a target outside the sender's root must be
active. See
[Delegated Child Lifecycle](./agent_team_execution.md#delegated-child-lifecycle).

## Collaborators

A collaborator is a shared Agent or Agent Team definition brought into a live run
by an agent's first `send_message_to` to its catalog address (Team runs, Org runs,
and standalone Agent runs); later messages reuse the same single instance. The
user's `@` no longer adds collaborators: it steers the focused agent to
`delegate_task` (see `@` below). Stored runs keep, restore and message the
collaborators that earlier releases added on `@`; nothing is migrated. The run hosts **one instance per
collaborator**, recorded as a root-level entry in the run's execution tree
(`collaborators`), at its root-level catalog address. An entry snapshots the run's root launch settings,
and for a Team, its member layout and Team-local handoffs. Its runs are recorded
in the entry: `agentRunId`/`platformAgentRunId` for an Agent; `teamRunId`, one
`agentRunId` per member and the Team's own `taskExecutions` for a Team.

- **Catalog addresses (REQ-003).** `CatalogAddressMap`
  (`catalog-address-map.ts`) is the only allocator. It is a pure function of the
  eligible catalog and the run's addresses in use: a definition already in the
  run keeps its in-run address; any other definition gets its name's segment
  (`/product_team`) when that segment is unique among the eligible catalog and
  not used by the run, otherwise `<segment>_<6 hex of sha256(definitionId)>` for
  every colliding definition. Listing twice with an unchanged catalog gives the
  same addresses; an address that maps to nothing is the normal not found.
  Stored collaborator addresses never change.
- **`@` (mention resolution).** A user message with `mentions`
  (`{kind, definition_id}[]`, at most 8) is resolved by the root
  (`resolveCollaboratorMentions` → `CollaboratorAdmission.resolveMentions`),
  inside its operation gate, before it is posted. Every mention is re-validated
  by the shared candidate policy (`requireEligible`: shared, not an Org, not a
  built-in, not the run's own definition; it may already be in the run) and
  answered with its name, kind, address and `inRun`: a definition already in the
  run resolves to its collaborator entry's address, else its preferred in-run
  placement address (a configured member, an Org mounted Team, a collaborator-Team
  member); any other to its catalog address. **Nothing is written, allocated,
  hosted or published.** The `@` caller
  (Team, Org and collaboration stream handlers, and the standalone host path
  `AgentRunCommandCoordinator.post` → `StandaloneAgentRunRoot.postUserMessage` →
  `StandaloneRootMessageDelivery.postToHost`) appends a `[Mentioned collaborators]`
  note with each name, kind and address, telling the agent to `delegate_task` to
  the address, follow up by the returned run ID and, when the result also has a
  `task_id`, mark that Task DONE with `create_or_update_task` once the work is
  finished. An entry already in the run reads `- Name (Agent) at /address, already
  in this run`, and the guidance then adds that such an agent or team can instead
  be messaged directly with `send_message_to` at its address, or `delegate_task`
  used for a separate copy; a note with no in-run mention is unchanged.
  Runnability is checked when the agent delegates. An ineligible
  mention returns `COLLABORATOR_ADD_FAILED` with its name and reason: nothing is
  posted and the client keeps the draft (agent-stream `AGENT_COMMAND_ACK`,
  Team-stream `ERROR`, collaboration-stream ack; each carries
  `collaborator_name`). The note wording is owned by
  `@autobyteus/agent-presentation-contracts` (`collaboratorMentionNote`), which
  still parses the guidance lines of notes saved by earlier releases.
- **Admission (agent-initiated bring-in, DS-001).** `CollaboratorAdmission.ensure`
  (`collaborator-admission.ts`), run by the root's `*Collaborators.bringInAt`:
  1. the definition is re-validated by the shared candidate policy
     (`requireAdmissible` = `requireEligible` plus "not already in the run unless
     it is a collaborator whose entry is reused"), so a bring-in never creates a
     second instance;
  2. each new placement (an Agent, or every member of a Team) is checked with
     `RunModelSelectionValidator.validateMany` against the run's runtime, model,
     model settings and workspace;
  3. run IDs are allocated (`agentRunId`, `teamRunId`, member run IDs);
  4. the root prepares the hosted executions, commits the new entry in one
     tree write, publishes the executions (Offline) and emits
     `collaborator_added`. `addedViaAgentRunId` is the sender.

  Admission is all-or-nothing. Any failure returns `COLLABORATOR_ADD_FAILED`
  with the collaborator's name and the reason, and nothing is written.
- **Reaching a collaborator.** A collaborator and the members of a collaborator
  Team are reachable with `send_message_to` by address, like configured members:
  a collaborator Agent, a collaborator Team (its coordinator), or a member of a
  collaborator Team. The first message starts it (`fresh` on first activation,
  `restore` after the run is reopened); teammates inside a collaborator Team
  resolve to their own instance (DI-001). `send_message_to` never allocates.
- **Extra copies (REQ-013).** `delegate_task` to a collaborator address (or a
  collaborator Team member address) starts an extra, separate copy: an ordinary
  task execution with the system task notice and its own run IDs, projected from
  the entry by the root's task source resolver. Every copy (extra or catalog) is
  placed by address (REQ-012, `resolveTaskCopyHost` in
  `agent-collaboration/execution/task/task-copy-host.ts`, shared by all roots):
  inside the delegator's own Team instance whose address is the copy's parent (a
  teammate copy), otherwise at the root, with its delegator recorded. Existing
  copies keep their recorded host on restore.
- **Catalog copies (REQ-005, Q-1).** `delegate_task` to a catalog address that is
  not in the run starts a task copy only (no collaborator entry). Placement
  order: a teammate inside the sender's own catalog Team copy (from that copy's
  snapshot), configured, collaborator, then catalog. A catalog placement carries
  a source snapshot built by `CollaboratorEntryBuilder` with the root launch
  settings and checked by the runnability validator; the task record persists it
  as the optional `source` (`TaskExecutionSource`). Activation and restore use the
  record's `source` first. Each call is a new copy, so parallel copies are
  allowed. The task DTOs (`task_execution_started` and the views) carry `source`.
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
  its `task_id`, and `create_or_update_task({task_id, status: "DONE"})` closes,
  stops and hides that copy and its sub-work (see
  [Projects](projects.md#tasks-with-no-project-ad-hoc)).
- **Discovery (REQ-001/002).** The opt-in tool `list_available_agents` (see
  [Agent Tools](./agent_tools.md)) asks the sender's root
  (`listAvailableAgents`), which returns `{name, kind, address, description}` for
  every eligible definition once, with the `@` eligibility (Q-2): an in-run
  definition at its in-run address (configured placement or Org mounted Team,
  then collaborator entry, then collaborator-Team member; ties go to the
  smallest address), any other at its catalog address. Listing never writes, so
  a standalone run that only lists gets no `collaboration/` package.
- **In the run.** Configured placements, every entry, and every member Agent of a
  collaborator Team count as in the run: they are never brought in again, and
  `@` addresses that instance. A failed add writes no entry.
- **Candidates.** GraphQL `collaboratorMentionCandidates(rootSubjectKind,
  rootRunId)` lists the `@` options of an active or stored root from the same
  policy: shared Agents (minus built-ins such as the Daily Assistant), then
  shared Agent Teams, in catalog order, **including** definitions already in the
  run; only the run's own definition (the standalone host Agent, or a Team run's
  Team) is left out. Application-owned runs list none.

The shared policy, admission, runnability validator, identity allocator, entry
builder, catalog address map, message-recipient resolution, catalog delegation
and source projection live in
`src/agent-collaboration/collaborators/`; each root implements
`CollaboratorRootPort` and hosts its collaborators in its existing backends (see
[Agent Team Execution](./agent_team_execution.md), [Agent Orgs](./agent_orgs.md)
and [Standalone Agent Run Root](./standalone_agent_run_root.md)).

Known limits:

- Renaming, unsharing or deleting a listed definition mid-run and reusing its
  name is unsupported (design principle 6); stored addresses never move.
- An address reaches a collaborator only inside its own run. Its run ID follows
  the existing [`target_agent_run_id` rules](#target_agent_run_id-global-direct-route):
  a sender in another root reaches it only through the global live-only path
  (while it is active, without a Team/Org tab row). An Offline collaborator is
  never woken from another root (`TARGET_AGENT_RUN_NOT_ACTIVE`).
- A build older than this collaborator model rejects execution trees whose
  collaborator entries carry run IDs (downgrade). There is no migration, and none
  is needed, because the earlier entry shape was never released.
- Catalog copies record an optional `source` on their task execution. A build
  older than agent-initiated collaborators ignores it, so it cannot restore a
  catalog copy (unsupported downgrade). Stored runs need no migration: copies
  without `source` read as before, and earlier copies keep their recorded
  placement.
- Self-delegation: every root refuses it with `COLLABORATION_SELF_TARGET_REJECTED`
  ("An Agent cannot delegate a task to its own logical placement."), including a
  standalone run's root (REQ-004).

### Sender Of An Agent-To-Agent Message (RD-004)

A `send_message_to` delivery reaches the receiver as input with
`input_origin: inter_agent_delivery` and `sender_agent_id`. Its visible text names
the sender by name, full address and run ID, so a reply by address reaches a
sender inside a Team (REQ-005):

```text
You received a message from sender name: lead, sender address: /eng/lead, sender id: <runId>
message:
<body>
```

All three builders use this header: root deliveries
(`root-communication-runtime-builder.ts`, Org and standalone roots),
Team-run deliveries (`inter-agent-message-runtime-builders.ts`) and the direct
`target_agent_run_id` route (`global-agent-run-message-runtime-builders.ts`, when
the sender is inside a root; a sender outside any root has no address). Stored
deliveries recorded before the address was added keep their old header; the web
parser reads both forms. The released header is frozen in the Org first-message
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
