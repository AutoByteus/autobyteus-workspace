# Standalone Agent Run Root

## Scope

The rules are defined in the [Collaboration Model](../design/collaboration_model.md) (all rules); this document describes the mechanics.

`src/standalone-agent-run-root/` owns every collaboration-eligible standalone Agent run end to
end (root kind `agent`). One `StandaloneAgentRunRoot` owns the run's own agent (the host), its
message log, and the run's lifecycle (start, restore, crash recovery, idle shutdown, Stop, delete and
archive). It holds nothing of the runs it delegated to (autobyteus-461): each is a run of its own,
with its own root, related to this run by its Task entry and shown in this run's view as a child. A
user in a standalone run can type `@` to name a shared Agent or Agent Team; the message tells the
focused agent to `delegate_task` to its address, and nothing is added at send time. An agent reaches
a shared Agent or Agent Team outside the run only with `delegate_task`; `send_message_to` never
creates a run. The host is streamed on `/ws/agent/:runId`; the run's view (its children) on
`/ws/agent-collaboration/:runId`.

Delegation, `@` resolution and the candidate policy are shared by all roots; see
[Agent Communication](./agent_communication.md#delegated-catalog-runs).

## Which runs have a root

A standalone run has a root unless it is an application-owned run (`applicationExecutionContext`). This one
rule (`isCollaborationEligibleStandaloneRun`) decides both the root and the host's member context.
An eligible host always has `send_message_to` and `delegate_task` from
its first turn and a short
standalone collaboration section in its prompt
(`agent-execution/prompt/collaboration-prompt-sections.ts`, role `standalone_agent`); it has no `get_handoff_rules`. Ineligible runs keep the plain
standalone path (`AgentRunService.resolveCommandReadyAgentRun` and the lifecycle directly).

## Ownership

- **`StandaloneAgentRunRoot`** (`domain/standalone-agent-run-root.ts`): one operation gate, the
  root lifecycle (`activating → active → terminating → terminated`, or `fail_stop`) and the public
  API. Delivery, addressing, admission and child commands are in
  `services/standalone-root-message-delivery.ts`.
- **`StandaloneRunAgentHandle`** (`domain/standalone-run-agent-handle.ts`): the host's single
  execution, like a configured member's handle. `ensureReady()` activates a prepared run,
  restores a stopped or crashed one, or returns the live run; concurrent callers join one attempt.
  Every root path to the host (user command, child message, stream connect) goes through it, so
  host crash recovery works like a configured member's. Its backend is
  `StandaloneAgentRunLifecycleService.activateRunAgent(runId, {memberExecutionContext})` (the only
  writer of `run_metadata.json`) and `terminateRunAgent(runId)`. The lifecycle never calls back into
  the root, so the lock order is always the root gate, then the lifecycle lane. `activateRunAgent` of
  an eligible run without its root-built member context throws: a bypass is a loud error.
- **`StandaloneAgentRunRootManager`** (`services/standalone-agent-run-root-manager.ts`): the
  process registry of roots, bound once by the general process run supervisor (no statics).
  - `resolveRoot(runId)`: eligible runs only. It returns the active root, or creates it from the
    stored package (else empty). It never starts the host.
  - `stopRoot(runId)`: explicit Stop. It stops the host only, then unregisters; the runs it
    delegated to keep working (CM-7, design DS-4).
  - `endRoot(runId)`: history delete or archive; the same as Stop, and idempotent.
  - `stopAll()`: server shutdown; every root closes before the standalone runs stop.
  - `getInspection(runId)`: the live snapshot, else the stopped run's own agent; never restores.
  - It registers each root in `ActiveCollaborationRootDirectory`.
- **Ports.** `agent-execution` does not import this module. The manager is injected as
  `StandaloneRunCommandPort` (the command coordinator's eligible-run post: host ready,
  `onActiveRunReady` binding the host stream, mention admission, then the post with the caller's
  options unchanged) and `StandaloneRunLifecyclePort` (`AgentRunService`: create, activate,
  restore and resolve go through `resolveRootAndEnsureAgent`; `terminateAgentRun` goes through
  `stopRoot`). Interrupt and tool approval act on a live host only and never start it.
  The lifecycle port also carries `refreshInheritedLaunch(runId)`: a saved edit of the stopped
  host (`AgentRunService.updateStoppedSelection`, result `UPDATED`) reaches the registered or
  still-loading root, which then hands the host's **saved** launch (`launchConfigurationOf(metadata)`,
  `root.setInheritedLaunch`) to the delegations it starts from then on (as the launch an agent
  without a default inherits). Runs already started keep the launch they started with; a run with no registered root changes nothing and its root, when
  loaded later, reads the saved launch. A failed follow is logged and never fails the saved edit. A
  registered root does not block the edit of a stopped host (only a live host does: `RUN_ACTIVE`),
  so a host that crashed while its root survives stays editable.

## Root lifetime

- A run starts collaborating with its first delegation: its `address` is written to its
  `run_metadata.json` and its catalog row gets `hasCollaboration: true` (contract §3.3, §3.5).
- A host crash does not end the root. The next user message, a message from another run, or a
  command makes the host ready again through its handle. Connecting the run's view never starts
  the host.
- A delegated run's root shuts its host down after the idle grace period
  (`DelegatedRunIdleShutdown`, when the run has `delegatedFrom`); the next message restores it.
- History delete and archive go through `StandaloneRunLiveness.releaseForHistory`
  (`run-history/services/standalone-run-liveness.ts`): refused while the host is active,
  otherwise `manager.endRoot` ends a remaining root before the history change; refused when the
  root cannot be ended.
- After a server restart there are no roots until a run is used (or resumed, see
  [Restart Resume](restart_resume.md)).

## Delegation

`delegate_task` goes through `TaskDelegation` (shared by every root): it resolves the placement, starts
an ordinary run (`DelegatedRunStarter`: an agent run, or a team run rooted at `/`), writes its Task
entry, and sends the work packet. Nothing is recorded in this run.

Agents delegate to the catalog themselves (REQ-004/005/008). `StandaloneRootRecipientResolver`
resolves `send_message_to(address)` with the shared `MessageRecipientResolution`, inside the
operation gate: the host's own address (refused as yourself); when that misses, a run that works on a
Task continues in its `CollaborationTree` (`resolve`) with the standing agents of the runs that assigned
its Tasks (contract §2.3 step 2); any other address is `COLLABORATION_TARGET_NOT_FOUND` and nothing is
created. A message to another run goes by run ID
through `CrossRunMessageDelivery`: it may wake a stopped receiver when both runs work on one open Task or
one is the other's assigner, and it reaches any other running agent without waking it (CM-13,
autobyteus-492). `delegate_task(address)` refuses the sender's own address
(`COLLABORATION_SELF_TARGET_REJECTED`, "you can't delegate to yourself", autobyteus-435), then
delegates to a catalog Agent or Agent Team. `listAvailableAgents(sender)` serves
`list_available_agents` and never writes, so a run that only lists has no `hasCollaboration` flag
(AR-005).

The root's collaborator port is built **per viewer** (`collaboratorPortFor(viewerAgentRunId)`). The
viewer is the focused composer agent for `@` candidates and mention resolution, and the sender for
`list_available_agents`. The host is an in-run placement with rank `run_agent` at its address.
`ownDefinition()` is the host definition only when the viewer is the host. Other definitions get the
same catalog addresses for every viewer in the normal case. Known limit (MP-001): after the host's
definition is renamed and another definition takes the old name's slug, a definition not yet in the
run can be listed at different catalog addresses for the host and for other viewers. That address
then fails as not found; it never creates a second instance.

## Task-linked runs

The host and the runs it delegated to use the same strict saved-ID/described `delegate_task`
variants as Team/Org roots. The Task entry (`agent_run_resources.json`) records each delegation:
`delegatedFrom` (this run, one hop), `recipientAddress`, the run, and for a peer's run `nodeId`.
The Project Task service remains the business authority. Explicit DONE stops the Task's runs that
have no other open Task, each through its own ordinary Stop. It never stops the host or unrelated
runs, and never deletes history. A closed run takes no input except its assigner's reactivation:
after the agent reopens the Task, the host (the assigner) continues one run by messaging its run ID
([Reactivation](projects.md#reactivation)).

See [Project Task agent run resources](projects.md#saved-id-delegation-and-agent-run-resources),
[message scope](agent_communication.md#task-linked-message-scope) and
[public projection](run_history.md#task-linked-history-and-public-projection).

## Package

```text
memory/agents/<runId>/
  run_metadata.json                    # its facts, address, launchSource; delegatedFrom when delegated
  communication_messages_active.jsonl  # its own message log, one message per line (TC-13)
  communication_messages_000001.jsonl  # sealed files once the log has rotated (4 MiB each)
  raw_traces_active.jsonl, …           # its memory
```

A run it delegated to has the same files in its own folder (an agent run), or is a team run at
`memory/agent_teams/<teamRunId>/` rooted at `/` with `delegatedFrom` in its tree. There is no
`collaboration/` folder and no tree file: the run's children are read from the Task entries
(`DelegationIndex`, in memory). A message between two runs is stored in both runs' logs with one
message ID (CM-9); the run's view shows the messages of its own log.

## Surfaces

- **`@` resolution.** A host SEND_MESSAGE with `mentions` on `/ws/agent/:runId` is resolved by the
  root after the host is ready (`AgentRunCommandCoordinator.post` →
  `StandaloneAgentRunRoot.postAgentUserMessage` → `StandaloneRootMessageDelivery.postToAgent`); a
  child's SEND_MESSAGE with `mentions` on the run's view stream is resolved for the focused child
  (`resolveCollaboratorMentions`). Resolution adds nothing; the posted message carries the note
  steering the agent to `delegate_task`. An ineligible mention rejects the send with
  `COLLABORATOR_ADD_FAILED` and `collaborator_name` (nothing is posted).
- **View stream** `/ws/agent-collaboration/:runId`: `connect` resolves the root without starting its
  host, then sends the snapshot (`root_subject_kind: "agent"`, `root_agent`; `is_active` is the
  host's live state; the run's own agent only), then `RUN_TREE_SNAPSHOT` (the run's tree at the
  same base), events and lifecycle. A change to its tree (a run it delegated started, closed,
  reopened or deleted, at any depth; a row's saved launch or peer answer) arrives as a numbered
  `run_tree_changed` event (see [Run trees](../design/agent_websocket_streaming_protocol.md#run-trees-autobyteus-461)).
  Messages are `communication`. A delegated run is a run of its own: its row opens it on its own
  stream, where its statuses, output and commands are (a message restores a stopped run, as any
  message does); a peer's run is opened on its node (`/ws/peer-run`). A run that is not a collaboration run closes the
  socket with `4004` and `AGENT_ROOT_UNAVAILABLE`.
- **GraphQL.** `agentRunCollaboration(runId)` returns the live snapshot or the stopped run's view and
  never restores. The clients' history poll for listed runs that are not open is
  `runCollaborationStatuses(runs)` (every run kind; see [Run History](./run_history.md)): each run's
  activity and its open children, here (each by its identity with its agents' statuses) and on peer
  nodes (each by its Task entry, with its node, without statuses); it never restores or starts a run.
  A child on this node is a run of its own and is read by its own identity (its run, or its team
  run's member: conversation, trace pages, Agent Artifacts and file content; autobyteus-461
  CR-461-022). `agentRunCollaborationMemberProjection(runId, memberAddress, agentRunId)` reads a
  child on a peer node through this run, from its node (`StandaloneRootMemberViewProjectionService`,
  which answers only this run's peer children); a peer child's trace and files stay on its node.
  `collaboratorMentionCandidates(rootSubjectKind: "agent", rootRunId, focusedAgentRunId)` lists
  the `@` options for one focused agent (the run's own agent or a child). `focusedAgentRunId` is required
  for Agent roots.
  `getStandaloneRunTokenUsageSummary(runId)` rolls the run's token usage up over the runs it
  delegated to (see [Token Usage](./token_usage.md#standalone-run-roll-up)).
- **Context files.** A delegated run's files are its own: an agent run's under `agent_draft` /
  `agent_final` (`/rest/runs/:runId/context-files/:file`), a delegated team's members' under the
  team-member owners (`/rest/team-runs/:teamRunId/agent-runs/:agentRunId/context-files/:file`), never
  through the run that delegated it. The host-scoped owner kind and its
  `/rest/agent-collaborations/…/context-files/…` routes are gone (autobyteus-500 FU-020); the stored
  links of that form are converted by `20261119_delegated_run_own_attachment_links` and its follow-up,
  with a backup of each rewritten trace file.
- **Message references.** The one route
  `/rest/collaboration-messages/agent/:runId/messages/:messageId/references/:referenceId/content` (autobyteus-615).
  It reads the run's view (its own log composed with the logs of the runs it delegated to), so a message stored in a
  delegated run's log opens too. The former `/rest/agent-collaborations/:runId/communication/...` route is removed.

## Native Compaction And Stop

The host uses the same native recovery and admission contract as Team and Org members: accepted A
may remain Held before parent dispatch; later accepted B remains Queued and can permit the current
failed epoch. Successful recovery resumes FIFO without replaying consumed work. Stop fences root
admission and stops the host; late compaction output must not commit or revive the stopped
operation. See [frontend activity](../../../autobyteus-web/docs/agent_execution_architecture.md#run-level-compaction-activity)
and [memory](agent_memory.md) for the persistence boundaries.

## Runs started by a peer node

A run a peer node delegated to this node (CM-10) is an ordinary eligible standalone run whose
`run_metadata.json` carries `delegatedFrom` `{nodeId, delegatingRun, delegatorAgentRunId}`. Its root
knows the delegator as its `delegator` endpoint (`RemoteRunLinks`), admits the work packet (the prepared
host is activated, then the system task notification naming the delegator's node is posted), writes the
first message to its own log, and shuts the host down after the idle grace period
(`DelegatedRunIdleShutdown`); the next message restores it. A run that delegated to a peer has the
peer's run in that delegation's Task entry (`nodeId`). See [Remote Collaboration](remote_collaboration.md).

## Known limits

- An older build that reads a catalog row with `hasCollaboration` rejects the standalone index.

## TS Source

- `src/standalone-agent-run-root/domain/standalone-agent-run-root.ts`
- `src/standalone-agent-run-root/domain/standalone-run-agent-handle.ts`
- `src/standalone-agent-run-root/services/standalone-agent-run-root-manager.ts`
- `src/standalone-agent-run-root/services/standalone-root-message-delivery.ts`
- `src/standalone-agent-run-root/services/standalone-root-builder.ts`
- `src/standalone-agent-run-root/services/standalone-root-recipient-resolver.ts`
- `src/standalone-agent-run-root/services/delegated-run-idle-shutdown.ts`
- `src/agent-collaboration/execution/delegation/delegated-run-commands.ts`
- `src/agent-collaboration/execution/delegation/delegated-child-locations.ts`
- `src/standalone-agent-run-root/persistence/standalone-root-package-store.ts`
- `src/agent-execution/services/standalone-agent-run-lifecycle-service.ts`
- `src/agent-execution/services/standalone-run-ports.ts`
- `src/agent-execution/prompt/collaboration-prompt-sections.ts`
- `src/services/agent-streaming/agent-collaboration-stream-handler.ts`
- `src/run-history/services/standalone-run-liveness.ts`
- `src/api/graphql/types/agent-run-collaboration.ts`
