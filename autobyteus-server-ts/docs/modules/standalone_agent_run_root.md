# Standalone Agent Run Root

## Scope

`src/standalone-agent-run-root/` owns every collaboration-eligible standalone Agent run end to
end (root kind `agent`). One `StandaloneAgentRunRoot` owns the run's own agent (the host),
its collaborators, their task copies, their messages, the run's lifecycle (start, restore,
crash recovery, Stop, delete and archive) and the collaboration package. A user in a standalone
run can type `@` to name a shared Agent or Agent Team; the message tells the focused agent to
`delegate_task` to its address, and nothing is added at send time. A delegated copy belongs to a
Task with no Project that the agent can mark DONE (`create_or_update_task`), which stops and hides
it. The root also hosts one instance per collaborator that an agent brings in by its first
`send_message_to` to a catalog address (and the collaborators of stored runs); `delegate_task` to a
collaborator address starts an extra copy. The host is still streamed on `/ws/agent/:runId`.

Collaborators, admission and the candidate policy are shared by all roots; see
[Agent Communication](./agent_communication.md#collaborators).

## Which runs have a root

A standalone run has a root unless it is a server helper run (`launchPurpose: "server_helper"`,
such as the skill improver) or an application-owned run (`applicationExecutionContext`). This one
rule (`isCollaborationEligibleStandaloneRun`) decides both the root and the host's member context.
An eligible host always has `send_message_to`, `delegate_task` and `create_or_update_task` from
its first turn and a short
standalone collaboration section in its prompt
(`agent-execution/prompt/standalone-collaboration-instruction.ts`, including the shared "Work
Requests and Outcomes" section); it has no `get_handoff_rules`. Ineligible runs keep the plain
standalone path (`AgentRunService.resolveCommandReadyAgentRun` and the lifecycle directly).

## Ownership

- **`StandaloneAgentRunRoot`** (`domain/standalone-agent-run-root.ts`): one operation gate, the
  root lifecycle (`activating → active → terminating → terminated`, or `fail_stop`) and the public
  API. Delivery, addressing, admission and child commands are in
  `services/standalone-root-message-delivery.ts`.
- **`StandaloneHostAgentHandle`** (`domain/standalone-host-agent-handle.ts`): the host's single
  execution, like a configured member's handle. `ensureReady()` activates a prepared run,
  restores a stopped or crashed one, or returns the live run; concurrent callers join one attempt.
  Every root path to the host (user command, child message, stream connect) goes through it, so
  host crash recovery works like a configured member's. Its backend is
  `StandaloneAgentRunLifecycleService.activateHost(runId, {memberExecutionContext})` (the only
  writer of `run_metadata.json`) and `terminateHost(runId)`. The lifecycle never calls back into
  the root, so the lock order is always the root gate, then the lifecycle lane. `activateHost` of
  an eligible run without its root-built member context throws: a bypass is a loud error.
- **`StandaloneAgentRunRootManager`** (`services/standalone-agent-run-root-manager.ts`): the
  process registry of roots, bound once by the general process run supervisor (no statics).
  - `resolveRoot(runId)`: eligible runs only. It returns the active root, or creates it from the
    stored package (else empty). It never starts the host.
  - `stopRoot(runId)`: explicit Stop. It ends every child, then the host, then unregisters.
  - `endRoot(runId)`: history delete or archive; the same as Stop, and idempotent.
  - `stopAll()`: server shutdown; every root's children stop before the standalone runs.
  - `getInspection(runId)`: the live snapshot, else the stored package with every child offline;
    never restores.
  - It registers each root in `ActiveCollaborationRootDirectory`.
- **Ports.** `agent-execution` does not import this module. The manager is injected as
  `StandaloneRunCommandPort` (the command coordinator's eligible-run post: host ready,
  `onActiveRunReady` binding the host stream, mention admission, then the post with the caller's
  options unchanged) and `StandaloneRunLifecyclePort` (`AgentRunService`: create, activate,
  restore and resolve go through `resolveRootAndEnsureHost`; `terminateAgentRun` goes through
  `stopRoot`). Interrupt and tool approval act on a live host only and never start it.

## Root lifetime

- The package is lazy: `memory/agents/<host>/collaboration/` is created with the first
  collaborator, and the catalog row then gets `hasCollaboration: true`.
- A host crash does not end the root. The next user message, a child's `send_message_to` to the
  host, or a collaboration-stream connect makes the host ready again through its handle. Children
  keep running, and commands to children on the collaboration stream go to the active root
  without restarting the host.
- History delete and archive go through `StandaloneRunLiveness.releaseForHistory`
  (`run-history/services/standalone-run-liveness.ts`): refused while the host is active,
  otherwise `manager.endRoot` ends a remaining root (fence, stop every child, unregister) before
  the history change; refused when the root cannot be ended.
- After a server restart there are no roots until a run is used.

## Hosting

The root hosts collaborators in its existing backends (AR-006): a collaborator Agent through
`RootAgentExecutionRegistry.prepareConfigured`, a collaborator Team as one TeamRun through
`RootTeamExecutionDirectory.prepareConfigured` (members prepared lazily). Admission prepares the
handles, commits the entries (the first commit creates the package), then publishes them and
emits `collaborator_added`. `StandaloneRootBuilder` re-hosts stored collaborators in `restore`
mode, and termination stops them with every other child. Messages resolve the host, a
collaborator Agent, a collaborator Team (its coordinator) or a collaborator Team member. A copy
is placed by address (REQ-012, `resolveTaskCopyHost`): a teammate copy inside the delegator's own
Team instance (recorded in that instance's `taskExecutions`), any other copy at the root. A
collaborator Agent directly under the root is not Team-scoped; members of a collaborator Team
are.

Agents bring collaborators in and delegate to the catalog themselves (REQ-004/005/008).
`StandaloneRootRecipientResolver` resolves `send_message_to(address)` with the shared
`MessageRecipientResolution`, inside the operation gate: the sender's own Team instance first
(REQ-007), then the host or a collaborator, then a catalog bring-in through
`StandaloneRootCollaborators.bringInAt` (`CollaboratorAdmission.ensure`; the first bring-in
creates the package). The root's `CollaboratorAdmissionQueue` serializes admission, so concurrent first
messages to one new address make one instance. `delegate_task(address)` falls back to a catalog
copy with a recorded `source`, which `StandaloneRootTaskSourceResolver` reads first. Delegating
to the caller's own address is rejected with `COLLABORATION_SELF_TARGET_REJECTED`, as in Team
and Org roots. `listAvailableAgents(sender)` serves `list_available_agents` and never writes, so
a run that only lists has no `collaboration/` package and no `hasCollaboration` flag (AR-005).

The root's collaborator port is built **per viewer** (`collaboratorPortFor(viewerAgentRunId)` /
`standaloneRootCollaboratorPortFor(tree, launch, viewer)`). The viewer is the focused composer
agent for `@` candidates and mention resolution, and the sender for `list_available_agents`,
bring-in and catalog copies. The host is always an in-run placement with rank `run_agent` at its
host address. `ownDefinition()` is the host definition only when the viewer is the host. So a
member of any delegated copy (a Team copy's member, an Agent copy) can `@` the host and find it
in `list_available_agents`. It then reaches the existing host run with
`send_message_to(<host address>)`. The host never sees itself. `delegate_task` to the host is
refused, and bring-in or a catalog copy never creates a second host. Other definitions get the
same catalog addresses for every viewer in the normal case. Known limit (MP-001): after the
host's definition is renamed and another definition takes the old name's slug, a definition not
yet in the run can be listed at different catalog addresses for the host and for other viewers.
That address then fails as not found; it never creates a second instance.

## Project Task-Linked Copies

The host and children use the same strict saved-ID/described `delegate_task`
variants as Team/Org roots. The standalone tree carries no Task information.
The root is the `hostRoot` recorded in the Task's `agent_run_resources.json`,
and the Project Task service remains the business authority. Owned helper
copies and further delegations belong to the same Task even when hosted as
root-level siblings. Existing unowned collaborators are borrowed, not adopted.
Explicit DONE closes and stops exactly that Task's runs. It never stops the
host or unrelated collaborators, and never deletes history. Closed copies
cannot be woken, also after root restore, and reopening the Task does not
restart them by itself. After the agent reopens the Task, the host (the
assigner) reactivates one copy by messaging its run ID
([Reactivation](projects.md#reactivation)).

See [Project Task agent run resources](projects.md#saved-id-delegation-and-agent-run-resources),
[message scope](agent_communication.md#task-linked-message-scope) and
[public projection](run_history.md#task-linked-history-and-public-projection).

## Package

```text
memory/agents/<hostRunId>/
  run_metadata.json
  collaboration/
    collaboration_tree.json        # subjectKind "agent", host, collaborators (with run IDs), taskExecutions (extra and catalog copies)
    communication_messages.json    # schemaVersion 1, hostRunId, messages
    <childRunId>/...               # a collaborator Agent's (or copy's) memory
    <teamRunId>/<agentRunId>/...   # members of a collaborator Team (or of a copy)
```

Trees are read tolerantly and written exactly, like the Team and Org trees. The location
service (`StandaloneRootLocationService`) resolves a child through the third root family
`agents`.

## Surfaces

- **`@` resolution.** A host SEND_MESSAGE with `mentions` on `/ws/agent/:runId` is resolved by the
  root after the host is ready (`AgentRunCommandCoordinator.post` →
  `StandaloneAgentRunRoot.postUserMessage` → `StandaloneRootMessageDelivery.postToHost`); a child's
  SEND_MESSAGE with `mentions` on the collaboration stream is resolved by the root
  (`resolveCollaboratorMentions`). Resolution adds nothing; the posted message carries the note
  steering the agent to `delegate_task`. An ineligible mention rejects the send with
  `COLLABORATOR_ADD_FAILED` and `collaborator_name` (nothing is posted; the host stays ready); a
  run that cannot host collaborators answers `COLLABORATOR_MENTION_UNAVAILABLE`.
- **Collaboration stream** `/ws/agent-collaboration/:hostRunId`: `connect` resolves the root and
  makes the host ready (a stopped run's host starts when its collaboration view is opened), then
  sends the Agent-root snapshot (`root_subject_kind: "agent"`, `root_agent`; `is_active` is the
  host's live state, plus the required `closed_task_executions` beside the unfiltered tree),
  events (`agent_presentation`, `task_execution_started`, `task_executions_closed` (published
  before a DONE Task's runs are stopped), `task_executions_reopened` (published when the
  assigner reactivates a closed copy), `communication`, `collaborator_added`) and lifecycle. Commands target children only and use the active root as
  is (only when no root is active is it resolved and its host made ready, as on connect); a
  command to the host is rejected (`AGENT_ROOT_HOST_COMMAND_REJECTED`). A run that cannot host collaborators closes the
  socket with `4004` and `AGENT_ROOT_UNAVAILABLE`.
- **GraphQL.** `agentRunCollaboration(runId)` returns the live snapshot or the stored package
  (children offline; `closed_task_executions` read by the manager against the stored tree) and
  never restores. `agentRunCollaborationMemberProjection` and
  `agentRunCollaborationMemberEventMonitorActiveTracePage` read a child's conversation (sender
  addresses of agent-to-agent deliveries are resolved from the root's index).
  `collaboratorMentionCandidates(rootSubjectKind: "agent", rootRunId, focusedAgentRunId)` lists
  the `@` options for one focused agent (the host or a child). `focusedAgentRunId` is required
  for Agent roots, and the stored root answers per focused agent too.
  `getStandaloneRunTokenUsageSummary(runId)` rolls the run's token usage up over its children
  (see [Token Usage](./token_usage.md#standalone-run-roll-up)).
- **Context files.** Children use the owner kinds `agent_collaboration_member_draft` /
  `agent_collaboration_member_final` (`{hostRunId, agentRunId}`). Draft locators have the form
  `/rest/drafts/agent-collaborations/:host/agent-runs/:agent/context-files/:file` and are read
  and deleted through the universal `GET`/`DELETE /rest/drafts/*` routes (see
  [File Rendering And Media Pipeline](../FILE_RENDERING_AND_MEDIA_PIPELINE.md#url--serving-strategy)).
  Final files are served from `/rest/agent-collaborations/:host/agent-runs/:agent/context-files/:file`.
  The host keeps the ordinary standalone owners.
- **Message references.** `/rest/agent-collaborations/:host/communication/messages/:messageId/references/:referenceId/content`.

## Native Compaction, Live Input And Whole-Host Stop

Root children use the same native recovery/admission contract as Team/Org members: accepted A
may remain Held before parent dispatch; later accepted B remains Queued and can permit the
current failed epoch. Successful recovery resumes FIFO without replaying consumed work. The host
keeps its standalone stream; collaboration commands and snapshots target children, including
native leaves in hosted Teams, not the host a second time.

`collectStandaloneRootInputSnapshots` admits exact indexed child run IDs, rejects a non-child
snapshot and deduplicates repeated Team-recursive leaves. Strict live GraphQL and reconnect
snapshots expose those input facts; an inactive stored package cannot invent pending native
state. Renderer projection is not retry permission or backend-restart queue persistence.

Whole-host Stop fences root admission, stops children and then stops the host. The frontend
captures exact root/context/service revisions before awaiting the command, retires the matching
stream and reconciles confirmed terminal state for all loaded children, including hosted-Team
members. Failed or superseded commands cannot mutate a replacement context. Late compaction
output must not commit or revive the stopped operation. Existing terminal Activity rows may
survive an in-memory projection refresh, but a new inactive renderer does not synthesize a native
compaction journal from Offline status. See
[frontend activity](../../../autobyteus-web/docs/agent_execution_architecture.md#run-level-compaction-activity)
and [memory](agent_memory.md) for the persistence boundaries.

## Known limits

- An older build that reads a catalog row with `hasCollaboration` rejects the standalone index.
- A malformed `collaboration_tree.json` is not repaired: no supported workflow produces one
  (atomic writes, tolerant readers), so no hardening is added (REQ-010).

## TS Source

- `src/standalone-agent-run-root/domain/standalone-agent-run-root.ts`
- `src/standalone-agent-run-root/domain/standalone-host-agent-handle.ts`
- `src/standalone-agent-run-root/services/standalone-agent-run-root-manager.ts`
- `src/standalone-agent-run-root/services/standalone-root-message-delivery.ts`
- `src/standalone-agent-run-root/services/standalone-root-builder.ts`
- `src/standalone-agent-run-root/services/standalone-root-recipient-resolver.ts`
- `src/standalone-agent-run-root/services/standalone-root-location-service.ts`
- `src/standalone-agent-run-root/persistence/standalone-root-package-store.ts`
- `src/agent-execution/services/standalone-agent-run-lifecycle-service.ts`
- `src/agent-execution/services/standalone-run-ports.ts`
- `src/agent-execution/prompt/standalone-collaboration-instruction.ts`
- `src/services/agent-streaming/agent-collaboration-stream-handler.ts`
- `src/run-history/services/standalone-run-liveness.ts`
- `src/api/graphql/types/agent-run-collaboration.ts`
