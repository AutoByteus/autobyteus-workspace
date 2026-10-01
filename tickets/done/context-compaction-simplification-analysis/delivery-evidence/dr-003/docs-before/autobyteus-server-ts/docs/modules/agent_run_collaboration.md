# Agent Run Collaboration

## Scope

`src/agent-run-collaboration/` owns the collaboration root of a standalone Agent run (root kind
`agent`). A user in a standalone run can type `@` and bring a shared Agent or Agent Team into
the run. The root hosts one instance per collaborator (added when the user sends, Offline until
its first message); the run's agent (the host) messages it with `send_message_to` by address, and
`delegate_task` to its address starts an extra copy. This module holds the collaborators, their
copies and their messages. The host itself stays a normal standalone AgentRun, owned by the
standalone lifecycle and streamed on `/ws/agent/:runId`.

Collaborators, admission and the candidate policy are shared by all roots; see
[Agent Communication](./agent_communication.md#collaborators).

## Which runs host collaborators

A standalone run can host collaborators unless it is a server helper run
(`launchPurpose: "server_helper"`, such as the memory compactor and the skill improver) or an
application-owned run (`applicationExecutionContext`). This one rule
(`isCollaborationEligibleStandaloneRun`) decides both the root and the host's member context.
An eligible host always has `send_message_to` and `delegate_task` from its first turn and a short
standalone collaboration section in its prompt; it has no `get_handoff_rules`.

## Root lifetime

`AgentRunCollaborationRootManager` is the only owner of Agent roots.

- `ensureRoot(metadata)` runs when the standalone lifecycle publishes the host (create or restore).
  It is idempotent and takes no root gate. It loads the stored package or starts an empty one.
- The package is lazy: `memory/agents/<host>/collaboration/` is created with the first collaborator,
  and the catalog row then gets `hasCollaboration: true`.
- The root survives a host crash. A later user message or a child's `send_message_to` to the host
  restores the host in `restore` mode through the standalone lifecycle.
- History delete and archive of a run whose host is down end a lingering root first, as an
  explicit Stop does (fence, stop every child, unregister), and only then change history; nothing
  is deleted while the root is live. They are refused ("Run is active. Terminate it before …") while
  the host itself is active, or when the root cannot be ended. The catalog goes through
  `StandaloneRunLiveness.releaseForHistory` (`run-history/services/standalone-run-liveness.ts`),
  backed by `AgentRunCollaborationRootManager.hasRegisteredRoot` / `endRegisteredRoot`.
- Only an explicit Stop of the host (`AgentRunService.terminateAgentRun`) terminates the root first,
  which stops every child; then the host stops. Server shutdown stops all Agent roots before the
  standalone runs.
- `resolveCommandReadyRoot(hostRunId)` is the command entry: it restores the host through the
  standalone lifecycle when needed (the lifecycle lane is released on return), then returns the
  registered root. Callers take the root gate only afterwards, so the lane and the gate are never
  nested.

## Hosting

The root hosts collaborators in its existing backends (AR-006): a collaborator Agent through
`RootAgentExecutionRegistry.prepareConfigured`, a collaborator Team as one TeamRun through
`RootTeamExecutionDirectory.prepareConfigured` (members prepared lazily). Admission prepares the
handles, commits the entries (the first commit creates the package), then publishes them and
emits `collaborator_added`. `AgentRunCollaborationRootBuilder.build` re-hosts stored collaborators
in `restore` mode, and termination stops them with every other child. Messages resolve the host,
a collaborator Agent, a collaborator Team (its coordinator) or a collaborator Team member. An
extra copy is hosted by the delegator's host: the root for a root-level Agent, the collaborator
TeamRun for its members (recorded in the entry's `taskExecutions`). A collaborator Agent directly
under the root is not Team-scoped; members of a collaborator Team are.

## Package

```text
memory/agents/<hostRunId>/
  run_metadata.json
  collaboration/
    collaboration_tree.json        # subjectKind "agent", host, collaborators (with run IDs), taskExecutions (extra copies)
    communication_messages.json    # schemaVersion 1, hostRunId, messages
    <childRunId>/...               # a collaborator Agent's (or copy's) memory
    <teamRunId>/<agentRunId>/...   # members of a collaborator Team (or of a copy)
```

Trees are read tolerantly and written exactly, like the Team and Org trees. The location
service resolves a child through the third root family `agents`.

## Surfaces

- **Admission.** A host SEND_MESSAGE with `mentions` on `/ws/agent/:runId` is admitted by the
  command coordinator after the host is active; a child's SEND_MESSAGE with `mentions` on the
  collaboration stream is admitted by the root. A collaborator that cannot be added rejects the
  send with `COLLABORATOR_ADD_FAILED` and `collaborator_name` (nothing is posted); a run that
  cannot host collaborators answers `COLLABORATOR_MENTION_UNAVAILABLE`.
- **Collaboration stream** `/ws/agent-collaboration/:hostRunId`: `connect` calls
  `resolveCommandReadyRoot` (restoring a stopped host), then sends the Agent-root snapshot
  (`root_subject_kind: "agent"`, `root_agent`), events (`agent_presentation`,
  `task_execution_started`, `communication`, `collaborator_added`) and lifecycle. Commands target
  children only; a command to the host is rejected (`AGENT_ROOT_HOST_COMMAND_REJECTED`). A run that
  cannot host collaborators closes the socket with `4004` and `AGENT_ROOT_UNAVAILABLE`.
- **GraphQL.** `agentRunCollaboration(runId)` returns the live snapshot or the stored package
  (children offline) and never restores. `agentRunCollaborationMemberProjection` and
  `agentRunCollaborationMemberEventMonitorActiveTracePage` read a child's conversation.
  `collaboratorMentionCandidates(rootSubjectKind: "agent", rootRunId)` lists the `@` options.
- **Context files.** Children use the owner kinds `agent_collaboration_member_draft` /
  `agent_collaboration_member_final` (`{hostRunId, agentRunId}`), with routes
  `/rest/drafts/agent-collaborations/:host/agent-runs/:agent/context-files/:file` and
  `/rest/agent-collaborations/:host/agent-runs/:agent/context-files/:file`. The host keeps the
  ordinary standalone owners.
- **Message references.** `/rest/agent-collaborations/:host/communication/messages/:messageId/references/:referenceId/content`.

## Known limits

- Token usage of children is not rolled up to the host run.
- An older build that reads a catalog row with `hasCollaboration` rejects the standalone index.

## TS Source

- `src/agent-run-collaboration/domain/agent-run-collaboration-root.ts`
- `src/agent-run-collaboration/services/agent-run-collaboration-root-manager.ts`
- `src/agent-run-collaboration/services/agent-run-collaboration-root-builder.ts`
- `src/agent-run-collaboration/prompt/standalone-collaboration-instruction.ts`
- `src/agent-execution/services/standalone-agent-run-collaboration-binding.ts`
- `src/services/agent-streaming/agent-collaboration-stream-handler.ts`
- `src/api/graphql/types/agent-run-collaboration.ts`
- `src/run-history/store/agent-run-collaboration-tree-store.ts`
