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
`MemberTeamContext` with `send_message_to` enabled and delegates to the sender's
root (`RootTeamRun`, `AgentOrgRun` or `StandaloneAgentRunRoot`), which resolves
the address and hands the message to the one
[teammate delivery path](#teammate-delivery-path). Child managers forward
root-bound delivery intent without rewriting it into flat names or synthetic
representative identities.

Accepted team-route deliveries are the only `send_message_to` path that creates
Team Communication projection:

- recipient input is held in the exact target AgentRun FIFO through the resolved
  member/team handle, and becomes eligible only after the message is saved to the
  root's log;
- accepted `INTER_AGENT_MESSAGE` events carry the team context needed by the Team
  Communication processor to build address-first `senderAddress` and
  `receiverAddress` values;
- `reference_files` become Team Communication child references persisted under
  the team run; and
- frontend Team tab sent/received perspectives hydrate from that projection and
  match the focused member by its AgentRun ID. `collaborationParticipantMessages`
  returns the focused agent's messages whose other agent is in the root's tree, or
  is an agent of a delegated run that left the tree when its Task closed: those are
  listed in `pastParticipants` (`{ agentRunId, address }`, read from the run's own
  file by `DelegatedRunAgentsReader`), and the web names them from the address
  (identity kind `past`; autobyteus-469 D-5).

Acceptance means the live AgentRun owns one ordered, at-most-once forwarding
attempt. It does not mean a provider turn has completed and does not synchronously
wait for a next-turn-only backend. Team Communication/member-input projection is
created once, when the saved message is committed to the recipient; forwarding and terminal lifecycle facts do not
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
active run. Rejection preserves the exact operation code/message and has no
receiver identity: `target_agent_run_id` is left out, as every platform tool
result leaves out a field with no value ([Tool Result Rule](agent_tools.md#tool-result-rule)):

```json
{
  "accepted": false,
  "code": "COLLABORATION_TARGET_NOT_FOUND",
  "message": "Target was not found."
}
```

The removed generic `result` field and generic communication-result mapper are
not compatibility surfaces. Native JSON, MCP text JSON, MCP
`structuredContent`, public types, and advertised post-2025-03 output schemas
use the same flat field names. MCP `isError` is set only for rejected outcomes.

`get_handoff_rules` instead returns the read-only `{ handoffs }` object shown
above. Its AutoByteus JSON result and MCP `content`/`structuredContent` represent
that same object; it is not wrapped in an operation result.

## Teammate Delivery Path

Every message an agent of a root receives from another agent, and the sender's
record of a message to a remote run, is saved and delivered by one
implementation for the standalone Agent root, the AgentOrg root and the Team
root: `RootCommunicationEngine` (`agent-collaboration/execution/communication`).
It is the only owner of the root's message list.

`SendMessageToDispatcher -> member collaboration context -> root message delivery (resolve recipient, live lease) -> RootCommunicationEngine -> port.reserveRecipientInput (member handle -> AgentRun.reserveUserMessage) -> port.commitMessageAppend (the root's persistence coordinator: lock -> append.prepare -> log append -> append.commitAfterDurability) -> result`

Entry forms, all through the engine:

| Entry form | Used by | Root-view publish | Recipient |
| --- | --- | --- | --- |
| `deliver` | `send_message_to` by address or by run ID within the run, and handoffs | Yes | Its slot is held, then committed, presented and released |
| `acceptFromRemote` | A message from a linked run on a peer node | No (the view shows the root's own agents) | As for `deliver` |
| `commitSentToRemote` | The sender's record after the peer accepted a message | No | None (the peer stores its side) |

1. The root's message delivery resolves the recipient and takes the live lease.
   Address resolution stays root-specific. A message to another run, and a saved
   Task given to an existing run (`TaskDelegation.toExistingRun`, a
   `task_assignment` message), go root to root through `CrossRunMessageDelivery`
   (above), each root writing its own log.
2. The engine checks the message: the root accepts messages, sender and receiver
   are exact live executions of this root, the target is not the sender, the
   Task scope allows the pair, and the content is not empty. It builds the
   message record and the recipient input, and holds a slot in the recipient's
   FIFO with `reserveUserMessage`.
3. The engine builds one `RootMessageAppend` and hands it to the root's
   coordinator (`commitMessageAppend`). Under the root's lock the append checks
   again that the root is open, the message ID is not in the list, and the Task
   scope still allows the pair; it then names the logs the message belongs to.
   The coordinator appends one line to each of those logs (and, for a run a peer
   node started, first creates its package).
4. Not written: the slot is cancelled and the sender gets
   `*_MESSAGE_HISTORY_COMMIT_FAILED` with the write's own message. Written but
   not finalized (indeterminate): the root enters persistence fail-stop, the
   slot is cancelled and the coordinator's error is thrown.
5. Written: the engine updates its list, commits the slot, publishes the message
   to the root view (when the entry form publishes), presents it to the
   recipient and releases the slot. The recipient therefore runs a message only
   after it is saved.
6. The Task may close, or the recipient may stop accepting input, between the
   log write and the slot commit (REQ-012). The saved record stays and is shown
   in the root view (when the form publishes), the recipient never gets the
   input, and the root keeps working. The sender gets the same Task refusal
   `{ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED", message }`
   it gets before the slot is held, or
   `{ accepted: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", message: "AgentRun is not accepting input." }`.
   Only a failure of the list update, the publish or the presentation itself
   still fail-stops the root.

Each root supplies its differences as a small `RootCommunicationPort`
(`standalone-root-communication-port.ts`, `agent-org-communication-port.ts`,
`team-communication-port.ts`). The port carries data and effects only; the
engine decides the order:

| Root | Recipient input | Root-view event, then presentation | Codes: `deliver` not accepting / conflict / not saved |
| --- | --- | --- | --- |
| Standalone Agent | Generic builder | `communication`, then the recipient's presentation | `COLLABORATION_ROOT_NOT_ACCEPTING_MESSAGES` / `AGENT_ROOT_MESSAGE_COMMIT_CONFLICT` / `AGENT_ROOT_MESSAGE_HISTORY_COMMIT_FAILED` |
| AgentOrg | Generic builder | `communication`, then the member presentation | `COLLABORATION_ROOT_NOT_ACCEPTING_MESSAGES` / `AGENT_ORG_MESSAGE_COMMIT_CONFLICT` / `AGENT_ORG_MESSAGE_HISTORY_COMMIT_FAILED` |
| Team | Team builder | `COMMUNICATION`, then `MEMBER_INPUT` | `TEAM_RUN_NOT_ACCEPTING_MESSAGES` / `TEAM_MESSAGE_COMMIT_CONFLICT` / `TEAM_MESSAGE_HISTORY_COMMIT_FAILED` |

The remote forms of every root use `COLLABORATION_ROOT_NOT_ACCEPTING_MESSAGES`.
A root's `getCommunicationSnapshot()` builds its message envelope from the
engine's list.

## `target_agent_run_id` Global Direct Route

`target_agent_run_id` has these paths, chosen in order by `GlobalAgentRunMessageRouter`. The run ID is the
address (CM-13, autobyteus-492): any running agent is reached by its run ID, on this node, or with `node` on a
paired peer (below).

**Same-root path.** When the sender has a member collaboration context and the
target AgentRun is one of the sender's own run's agents (`hasAgentExecution`),
delivery goes through that root's `deliverExactAgentMessage` as ordinary root
communication. A delegated run is never an agent of the run that delegated to it
(autobyteus-461): it is reached by the next path.

**Cross-run path** (`CrossRunMessageDelivery`, design DS-2, DS-003). A target in another
run of this node goes from root to root:

1. the receiver's run is found from the Task entries (`DelegationIndex.runOfAgent`),
   in memory, also after a restart;
2. admission: both runs work on one open Task, or one is the assigner of an open
   Task the other works on (contract §2.2). Otherwise the sender's message may be
   the assigner's continuation of the receiver's closed `assigned` entry (its Task
   not DONE or CANCELLED: the Task side reopens it, and the accepted `message`
   ends with "<run id> continues with its conversation.", see
   [Reactivation](projects.md#reactivation)); else a receiver whose Tasks are all
   closed is refused with `TASK_AGENT_RESOURCE_CLOSED`, whoever sends; any other pair
   of runs is **unrelated** (a different Task, or a run no Task names);
3. the sender's root prepares the message, the receiver's root accepts it in its
   gate (re-checking "open" from the Task side, writing its own log, waking a
   stopped related run with its conversation and delivering), then the sender's root
   writes its own log with the same message ID. A refusal writes nothing (CM-9).
4. an unrelated message goes the same way only while the receiver runs
   (`RunningAgents.rootOf`, from each root's own live statuses), in its active
   root (`CollaborationRootResolver.resolveActive`, never restored): a stopped run
   is not woken, and the router answers "not running". It stays out of run views
   (`publishToViews: false`, DEC-014), like a message with another node; both
   agents' conversations and both logs hold it.
5. a run on a peer that this node's tree holds is the peer path's; when all its
   Task entries on that node are closed, `closedPeerRunRefusal` answers
   `TASK_AGENT_RESOURCE_CLOSED` for every sender here, with or without `node`.

The receiver sees the sender's address only when it can use that address to reach
the sender (contract §2.5); otherwise the run ID only.

**Team run IDs.** `send_message_to` reaches agents only. Before the live-only
path, the router asks every active root (`ActiveCollaborationRootDirectory.findTeamCoordinator`)
whether the ID is one of its team run IDs; if so it refuses with `TARGET_IS_TEAM_RUN`
and the coordinator's agent run ID to use.

**Peer path (`node`, DS-004).** `send_message_to(target_agent_run_id, node)` finds the peer by this
node's name for it (`RemoteRunChannel.findPeer`: the refusals of `delegate_task` with `node`), applies this
node's closed-Task admission (`closedPeerRunRefusal`), then hands the message to the sender's root
(`deliverToPeerRun`), whose `RemoteMessageSend` uses the root's link when the sender is paired with that run,
else a one-message `unlinked_run` endpoint (`/rest/remote/run-messages`). The peer delivers it only to an
agent that runs there and never wakes it; a team run's ID is refused with its coordinator's run ID. `node`
goes only with `target_agent_run_id`, and needs a sender in a collaboration run. The receiver's header names
the sender's node, and it answers with that `node`. See [Remote Collaboration](remote_collaboration.md).

**Global live-only path.** Every other target must be the canonical
server-side `AgentRun.runId` of a run that is active at delivery time.
Dispatch flows through:

`SendMessageToDispatcher -> GlobalAgentRunMessageRouter -> AgentRunManager.getActiveRun(...) -> AgentRun.postUserMessage(...)`

If `AgentRunManager.getActiveRun(targetAgentRunId)` returns no active run, the
delivery fails closed with `TARGET_AGENT_RUN_NOT_ACTIVE` ("No running agent has the run id …",
saying that a stopped agent is not woken and to pass `node` for another node). A live run with a member
context that the cross-run path did not deliver to runs in no live root, so a collaboration sender gets
the same refusal; the direct post serves only senders or targets without a collaboration root. This path must not
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

## Runtime Projection

Runtime adapters expose one logical `send_message_to` capability through their
native tool surfaces when effective runtime exposure includes it. Standalone
runs require explicit configuration; every valid team member context receives
`get_handoff_rules`, `send_message_to` and `delegate_task`
automatically (a member with no Team scope, such as a standalone host, gets all
but `get_handoff_rules`), with duplicates removed. No task tool is automatic: an
agent that should close the Task its delegation created lists `update_task` in its
definition (see [Delegated catalog runs](#delegated-catalog-runs)). The root topology resolver and active delivery binding
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

All runtime projections end at the same `AgentRun` input admission:
`postUserMessage(...)`, or `reserveUserMessage(...)` for teammate delivery. Codex, Claude, AutoByteus, Team routing, external callers, and
the command registry do not select start/append/wait behavior themselves.

Configured Team members receive `get_handoff_rules` through the same runtime
projection: a bound AutoByteus local tool or the session-scoped
`autobyteus_agent_tools` MCP surface for Codex and Claude. The MCP adapter is
available only when the session sender has an active member collaboration
context.

## Communication Versus Task Execution

The rules are defined in the [Collaboration Model](../design/collaboration_model.md) (CM-1 … CM-9); this document describes the mechanics.

`send_message_to(recipient_address)` reaches **the one instance at that
address in the sender's run** (a configured member, a teammate inside the
sender's own team instance, a standalone run's own agent), or, for a delegated
run, a standing agent of the run that assigned its Task (contract §2.3 step 2). It
never creates a run (CM-4): any other address is `COLLABORATION_TARGET_NOT_FOUND`
with guidance to use `delegate_task`. `send_message_to(target_agent_run_id)`
reaches existing runs only. `delegate_task` always starts one new run (an Agent or
AgentTeam), or gives a saved Task to an existing one by its run ID, and delivers
the complete work packet during that same call; it refuses the sender's own team
(CM-1, below). The `recipient_address` names what to start; it is kept as the
Task entry's `recipientAddress`, a name in the delegator's space, never an address
of the new run.

### Task-linked message scope

Runs the user started are never checked against Task data among their own agents.
Every delegated run is Task-owned: an `assigned` entry (a Project Task, or a Task
with no Project its description-only delegation created) or `subWork` of its
delegator's current Task. Two runs are related when they share an open Task or one
is the other's assigner (contract §2.2): a message between them may wake the
receiver. Any other running agent is reached by run ID too (CM-13), but never
woken. The refusal of a closed Task is returned to the sender as
`{accepted: false, code, message}` so the agent reads the next step. The receiver's
root re-checks the Task side in its gate, so a Task closed while the message waits
refuses it too.

There is no per-Task helper bring-in: `broughtIn` records already stored in a
Task's `agent_run_resources.json` stay readable and keep their open or closed
state, but nothing writes new ones. Follow-up by exact run ID never creates a run.
See [Project Task agent run resources](projects.md#saved-id-delegation-and-agent-run-resources).

### Address resolution order (`MessageRecipientResolution`)

Every root (Team, Org, Agent) resolves `send_message_to(address)` with the shared
`agent-collaboration/collaborators/message-recipient-resolution.ts`, inside its
operation gate. The function only resolves:

1. **The sender's own team instances**, deepest first (the structural root `/`
   is not one): the instance's own address reaches its coordinator; an address
   under the instance's prefix reaches that instance's member. There is **no
   fall-through** inside the prefix (AR-003): a miss is
   `COLLABORATION_TARGET_NOT_FOUND`, never run-wide. This is how a mounted Org
   Team works as one unit (REQ-007); a delegated team is a team run of its own,
   rooted at `/`.
2. **Run-wide standing placements**: a configured placement, or the run's own
   agent (an Agent root's host).

When both miss and the sender's run works on a Task, the sender's `CollaborationTree`
resolves the address (`CollaborationTree.resolve`, from `SendMessageToDispatcher`), in
this order:
1. step 2 must apply: the standing agents of the runs that assigned its Tasks
   (contract §2.3 step 2, `stepTwo()`); when it does not, the address is not found;
2. for a delegated team, an address written under the name the team was delegated to,
   alone or with one of its own members, is refused with the address to use. This
   comes **before** step 2's receiver is looked up (SR-081): such an address means the
   team's own teammate, never the assigning run's namesake agent, which stays
   reachable by run ID;
3. step 2's receiver for the address.

Any other address is `COLLABORATION_TARGET_NOT_FOUND` ("No agent or agent team
you can talk with has the address <address>. To answer a message or report your
task result, use send_message_to with target_agent_run_id set to the sender run
id. To have a task done by a new agent, use delegate_task."). Nothing is allocated or written, so a message
can never start an agent; the first message to an existing but Offline agent
starts it (`fresh` on first activation, `restore` after the run is reopened).

After delegation, parent and child communicate through `send_message_to`
with exact run IDs, in both directions (the cross-run path above, which wakes a
stopped run with its conversation). There is no task submission, review, or
acceptance.

## Delegated catalog runs

A listed shared Agent or Agent Team definition that is not in the run is reached
only by `delegate_task` (CM-5). Each call starts one new, independent run of its
own (`DelegatedRunStarter`: an agent run, or a team run rooted at `/`), recorded in
its Task entry (`delegatedFrom`, `recipientAddress`); the new run's own file holds
its launch and `launchSource` (below). Nothing is recorded in the delegating run
(autobyteus-461). The user's `@` steers the focused agent to the same tool (see
`@` below). Runs recorded by earlier releases as *collaborators* are converted at
startup into ordinary, unowned delegated runs of the same root (migration
`20261015_collaborators_to_delegated_runs_v1`; their memory never moves, see
[Run History](./run_history.md)). The runtime has no collaborator concept.

- **Own-team refusal (CM-1, DEC-008).** `resolveDelegationPlacement`
  (`catalog-delegation.ts`) first compares the address with the sender's own
  (`agentAddressOf(sender)`): its own address is refused with
  `COLLABORATION_SELF_TARGET_REJECTED` and `selfDelegationRefusedMessage` ("you can't
  delegate to yourself. Do the work yourself, or delegate it to another agent or agent
  team.", autobyteus-435). Then it asks the root's index `isOwnTeamAddress(sender,
  address)`. It is true for the sender's own address, any address inside (or equal
  to) a team instance that contains the sender at any depth, and, in a Team root,
  every configured root placement for a configured member. Then
  `COLLABORATION_SELF_TARGET_REJECTED` is raised, with `send_message_to` guidance,
  before any placement, preparation, Task link or run allocation. Siblings,
  parents and outside units are allowed: a delegated run's agent may delegate to
  a catalog Agent or Team; an Org agent may
  delegate to a mounted Team it does not belong to.
- **Runs of their own.** A delegated run is never hosted by the run that
  delegated to it: it has its own root, idle shutdown, Stop and restart resume,
  and its life is bound to its Task (CM-7).
- **Catalog addresses (REQ-003).** `CatalogAddressMap`
  (`catalog-address-map.ts`) is the only allocator. It is a pure function of the
  eligible catalog and the run's addresses in use: a definition already in the
  run keeps its in-run address; any other definition gets its name's segment
  (`/product_team`) when that segment is unique among the eligible catalog and
  not used by the run, otherwise `<segment>_<6 hex of sha256(definitionId)>` for
  every colliding definition. Listing twice with an unchanged catalog gives the
  same addresses; an address that maps to nothing is the normal not found.
- **Placement order for `delegate_task(address)`.** CM-1 refusal, then the root's
  in-run configured placement, then a listed catalog definition (a new run with
  a source snapshot built by `CollaboratorEntryBuilder` and resolved per agent by
  `CollaboratorLaunchResolver`; the new run's own file records the launch and its
  `launchSource`). The run restores as the run it is. Each call is a new run, so
  parallel runs of one definition are allowed. A catalog definition that cannot run
  returns `delegated: false` with "<name> cannot be delegated to: <reason>".
- **`@` (mention resolution).** A user message with `mentions`
  (`{kind, definition_id}[]`, at most 8) is resolved by the root
  (`resolveCollaboratorMentions` → `CollaboratorAdmission.resolveMentions`),
  inside its operation gate, before it is posted. Every mention is re-validated
  by the shared candidate policy (`requireEligible`: shared, not an Org, not a
  built-in, not an internal agent while hidden, not the port's `ownDefinition()`;
  it may already be in the run) and
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
  `AgentRunCommandCoordinator.postUserMessage` → `StandaloneAgentRunRoot.postAgentUserMessage` →
  `StandaloneRootMessageDelivery.postToAgent`) appends a `[Mentioned agents]` note, one
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
- **Task closure (DONE or CANCELLED).** Closing a Task stops its runs that have no
  other open Task, each through its own ordinary Stop (`TaskRunControl`); a peer's
  run is fenced, not stopped. A delegated run is a row of its delegator's tree while
  it has an open Task entry, so a closed run's row leaves the tree and comes back when
  its assigner continues it; an open view learns it from the tree's next change
  (`RUN_TREE_CHANGED`, see
  [Run trees](../design/agent_websocket_streaming_protocol.md#run-trees-autobyteus-461)).
  There is no closed set in the trees or the stored reads. The same holds for a Task with no Project: a description-only
  `delegate_task` by an unowned sender returns its `task_id`, and
  `update_task({task_id, status: "DONE"})` (for an agent that selected
  `update_task`) closes it and stops its runs (see
  [Projects](projects.md#tasks-with-no-project-ad-hoc)).
- **Discovery (REQ-001/002).** The opt-in tool `list_available_agents` (see
  [Agent Tools](./agent_tools.md)) asks the sender's root
  (`listAvailableAgents`), which returns `{name, kind, address, description?}` for
  every eligible definition once (`description` only when the definition has one;
  autobyteus-261 DEC-405), with the `@` eligibility (Q-2): an in-run
  definition at its in-run address (the standalone host, then configured
  placement or Org mounted Team; ties go to the smallest address), any other at its
  catalog address. Definitions come from the live
  [agent package definitions](./agent_package_definitions.md): a definition just
  written to an agent package is listed once the change is detected, without
  Reload. A Team or Org whose ID exists in more than one registered package is not
  listed, because it is unavailable to every reader. In a standalone Agent run the
  sender is the viewer, and the host's list never holds itself. Listing never
  writes, so a standalone run that only lists is not marked as collaborating. With `node`, the tool lists a peer node's offer instead (a *peer* is a
  remote node registered with this node; see the [Glossary](../../../GLOSSARY.md#nodes)),
  and the opt-in `list_peer_nodes` lists the peers with their status (autobyteus-261; see
  [Remote Collaboration](./remote_collaboration.md#discovery)); neither goes through
  the sender's root.
- **In the run.** Configured placements and a standalone run's host count as in the
  run: `@` addresses that instance, and `send_message_to` reaches it. Delegated
  runs are not in the run: they are reached by their run ID.
- **Candidates.** GraphQL `collaboratorMentionCandidates(rootSubjectKind,
  rootRunId, focusedAgentRunId)` lists the `@` options of an active or stored root from the same
  policy: shared Agents (minus the Model Router, a built-in marked
  `collaborationEligible: false`, and internal agents while hidden), then
  shared Agent Teams, in catalog order, **including** definitions already in the
  run; only the port's own definition is left out. That is a Team run's Team.
  For an Agent root, `focusedAgentRunId` is required (omitting it is an error),
  and the host definition is left out only when the focused agent is the host.
  Team and Org roots ignore `focusedAgentRunId`. The ID is not
  membership-checked (an unknown ID gets the non-host view of the menu; the
  send-time re-check verifies). Application-owned runs list none.

### Launch configuration of a delegated run

A delegated run is started by an agent, not by a user launch form, so nobody picks
its runtime and model. `CollaboratorLaunchResolver`
(`collaborator-launch-resolver.ts`; the "collaborator" file names are a cosmetic
leftover of FU-1) is the single owner of that choice for a delegated run. For each
agent it takes runtime, model and model settings **together** from the first
usable layer:

```text
Agent run:                          agent default -> inherited from the run root
Team run:
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
  agent still starts. When no layer is usable for some agent, the delegation fails with
  `delegated: false` and "<name> cannot be delegated to: <reason>", and nothing is
  added.
- **Notes.** `launch-configuration-notes.ts` renders each skip as one line, for
  example `reviewer: its agent default codex_app_server / sol-6.1 could not be
  used (<reason>); it runs on claude_agent_sdk / sonnet (inherited from the
  run).` A Team-level skip is written once, as "its members without their own
  default run on …". `delegate_task` returns these lines as `launch_notes` (see
  [Agent Tools](./agent_tools.md)). Only the call that started the run carries
  notes.
- **A run started for a peer node.** A peer's `delegate_task` resolves its target through the same admission
  and resolver, with a launch base of `defaults_only` instead of `inherited`
  (`CollaboratorRootPort.launchBase()`; the run roots return `inherited`, `NodeCatalogPort` returns
  `defaults_only`). There is no run root on the receiving node, so there is no inherited layer: workspace
  and auto-approve come from the base (the temp workspace, auto-approve on), and the base's workspace is
  the validation context. An agent that no configured layer covers fails: with nothing complete configured,
  `CollaboratorNoDefaultLaunchError` ("There is no default runtime configured for the target agent <name>",
  or "… the target agent team <name>" for an agent of a Team);
  with a configured layer that can't be used, `CollaboratorAddError` with that layer's reason. See
  [Remote Collaboration](./remote_collaboration.md).
- **Recorded, not re-read.** The resolved values and their source (the origin and
  the skipped layers) are written into the new run's own file when it starts: an
  agent run's `run_metadata.json` (`launchSource`), a team run's tree (each member's
  complete `launchConfiguration` and `launchSource`, the team's
  `rootTeam.defaultLaunchSource`). Restore uses these recorded values only. Editing a
  definition default later changes only runs started afterwards.
- **Configured placements.** Delegation to a configured placement starts the run from
  that placement's launch configuration as it is now and records origin `configured`
  ("As configured in this run") in its own file. Editing the placement later changes
  only runs started afterwards. Single-agent starts and
  application launch baselines have their own rules. An installed but unauthenticated runtime passes these
  checks and fails at its first turn as a run error, not as a fallback.

### User Model Choice And Stop Of A Delegated Run

A delegated run is an ordinary run: the user stops it and changes its model as for
any run, in its own view, or from its delegator's Settings, which show the
delegator's tree rows, each with the launch its run has now (the row's `launch`).
Each row is reached as its own run; nothing goes through the delegator (rule 2):

- **Stop.** A row's Stop is that run's own ordinary Stop (`terminateAgentRun` /
  `terminateAgentTeamRun`); the runs it delegated keep working. A peer run's Stop is
  sent to its node.
- **Choice.** A row's change is that run's own stopped-run save:
  `updateStoppedAgentRunSelection` for an agent run; for a delegated team,
  `updateStoppedTeamRunSelections` with a `CONFIGURED_TEAM` patch at `/` (the team's
  default only) or a `CONFIGURED_AGENT` patch at a member's address. Another runtime
  than the run's current one is an agent runtime switch, as for any run. A row whose
  run is running refuses the Save before any write. Settings save the delegator's own
  settings first, then each changed run in row order; a failure names the runs saved
  and the one not saved, and nothing is rolled back. A saved launch changes the row in every tree that holds it
  (`ChildRowsFeed.rowChanged`). A peer run keeps no launch on this node and is not
  editable here.

These replaced the delegator-side GraphQL operations `stopDelegatedExecution`,
`updateDelegatedLaunchSelections` and `delegatedLaunchModelOptions` (and their
`COPY_RUNNING` refusal).

The shared policy, admission (`@` and eligibility), launch resolver, identity
allocator, entry builder, catalog address map, message-recipient resolution,
catalog delegation and source projection live in
`src/agent-collaboration/collaborators/`; each root implements
`CollaboratorRootPort` and delegates through `TaskDelegation` (see
[Agent Team Execution](./agent_team_execution.md), [Agent Orgs](./agent_orgs.md)
and [Standalone Agent Run Root](./standalone_agent_run_root.md)).

Known limits:

- Renaming, unsharing or deleting a listed definition mid-run and reusing its
  name is unsupported (design principle 6); stored addresses never move.
- A delegated run's run ID follows the
  [`target_agent_run_id` rules](#target_agent_run_id-global-direct-route): a run a
  Task relates to the sender's run is reached through the cross-run path (woken
  when stopped); any other target only through the global live-only path.
- A build older than autobyteus-461 cannot read the converted data (startup
  migration `20261111_delegated_runs_own_runs_v1`). Downgrade is unsupported.
- Own-team delegation: every root refuses it with
  `COLLABORATION_SELF_TARGET_REJECTED` (CM-1, DEC-008), including a standalone
  run's root; use `send_message_to` for a teammate. Its own address is refused with the
  same code and words of its own (autobyteus-435).

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

or, when the address would not reach the sender (a sender in another run whose
address the receiver cannot use):

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
