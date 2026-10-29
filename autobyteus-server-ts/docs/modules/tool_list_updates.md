# Tool List Updates

## Scope

When an agent definition's tools change, every running agent with that
definition gets its new tool list, with its conversation kept:

- at once where its runtime can take a new list in a running session
  (AutoByteus, Claude, Antigravity): from the runtime's next model call;
- at its next message otherwise (Codex, Grok): the runtime session is reopened
  inside the next turn-start dispatch.

A removed tool stops working at once on every runtime, because the Agent Tools
MCP endpoint refuses it from the next request on. The agent gets one short
notice of what changed, and the user sees a "Tools updated" card in the run.

## TS Source

- `src/tool-list-updates/tool-list-updates.ts` (composition: create, subscribe, close)
- `src/tool-list-updates/services/tool-list-update-service.ts`
- `src/tool-list-updates/services/tool-list-diff.ts`
- `src/tool-list-updates/services/tool-list-update-notice-builder.ts`
- `src/tool-list-updates/providers/seen-tool-names-store.ts`
- `src/agent-definition/services/agent-definition-change-signal.ts`
- `src/agent-execution/domain/agent-run-platform-notices.ts`
- backends: `applyDefinitionTools` / `getToolNames` on each `AgentRunBackend`;
  `src/agent-execution/backends/shared/runtime-session-reopen.ts` (the failed
  dispatch); `src/agent-execution/backends/acp/session/acp-session-launcher.ts`
- Team members: `ConfiguredAgentExecutionHandle.postMessage` (a failed input as a run `ERROR`)
- Agent Tools endpoint: `replaceForRun` / `describeForRun` and
  `AgentToolsMcpSessionStreams` (see [Agent Tools MCP Server](./agent_tools_mcp_server.md#live-tool-list))

## Change Signal

`AgentDefinitionChangeSignal` is one signal for every way an agent definition
can change. It carries no IDs: definitions are read on demand by ID, so the
service re-reads each tracked run's own definition. That covers shared,
team-local, org-owned and application-owned agents alike. Its sources:

- the agent package definition reloader's publisher (in-app saves, file edits
  and Reload; `agent-package-definition-feed-composition.ts`);
- `AgentDefinitionService.updateAgentDefinition` for application-owned agents,
  which have no folder reload;
- `ApplicationPackageCommandService` after a committed import, reload or removal.

## Applying A Change

On each signal `ToolListUpdateService` runs one pass over the tracked runs (a
signal during a pass asks for exactly one more pass). For each run it re-reads
the run's definition (a missing definition leaves the run as it is) and calls
`AgentRun.applyDefinitionTools(definition)`. The backend compares the
definition's tools with what its runtime has and returns
`{ kind, toolNames }`:

| Runtime | How it takes the list | Result |
| --- | --- | --- |
| AutoByteus | `Agent.replaceTools`: the next LLM call lists the new tools; a tool whose name stays keeps its existing instance; removed and unused instances are cleaned up | `applied` |
| Claude | the Agent Tools session is replaced (the CLI re-lists over its held GET stream); the run context keeps the exposure for later process generations; tools in the current descriptor are allowed without asking | `applied` |
| AGY | the Agent Tools session is replaced (AGY re-lists over its held GET stream) | `applied` |
| Codex | the session is replaced (removal enforced at once); `reopenPending` is set | `on_next_turn` |
| Grok | the session is replaced (removal enforced at once); `reopenPending` is set | `on_next_turn` |

An unchanged list (a save without tool changes, or a change reverted before the
next turn start) returns `unchanged` and needs no reopen.

## Reopen (Codex, Grok)

A reopen happens only inside a `start_turn` dispatch, with no active turn. An
`append_to_active_turn` is sent on the current session unchanged.

- **Codex** (`CodexThreadManager.reopenThread`): the run's preparation (client,
  lease, skills, thread object) is kept. With a conversation:
  `thread/unsubscribe`, then `thread/resume` of the same thread with the
  rebuilt config. Without one (no rollout yet): `thread/unsubscribe`, then
  `thread/start`; the run takes the new thread ID.
- **Grok** (`AcpAgentRunBackend`): end first, then load. The open session's
  sinks are detached (its exit is not a run failure), the process is ended, and
  `AcpSessionLauncher` loads the same session in a new process into the run's
  `AcpPreparationOwner`, the single holder of the process.

On success the backend recomputes `reopenPending` (a save during the reopen is
not lost). On failure the input is not sent, and there is no notice: the
dispatch fails with `RUNTIME_SESSION_REOPEN_FAILED` and the message "Couldn't
give this run its new tools (<cause>). Send your message again to retry, or stop
and resume the run." The next turn start tries again. A Grok run with a failed
reopen stays active and idle with no runtime session.

The message is shown the way every failed message is:

- a single run: the input lifecycle marks the command failed with that message
  (`AgentRunCommandCoordinator`);
- a Team member: `ConfiguredAgentExecutionHandle.postMessage` passes a
  lifecycle observer that publishes a run `ERROR { code, message }` (no error
  evidence) to the Team stream through `publishAgentEvent`; the web shows it as
  an error in that member's conversation. It is not published through the run,
  so nothing records or shows it twice, and it is not replayed.

Stop, then resume, stays the user's manual way to restart a run.

## Notice

What the agent hears is the difference between the names it was last told
about (its seen record) and the names it has, or will have at its next turn
start:

```text
[Platform notice — tools updated]

Your tools changed. Now available: get_project_task. No longer available: search_memory.
```

- An idle run gets it combined into its next external input, through the
  single `AgentRunPlatformNotices` slot (tool list notices first, then skill
  notices; one notice per input).
- A run waiting for a reopen gets it only with a `start_turn` dispatch, the one
  that reopens its runtime.
- A busy run whose runtime took the change at once gets it now through
  `AgentRun.postUserMessage`, as skill notices do.
- A delivered notice publishes the run's `SYSTEM_TASK_NOTIFICATION`; the web
  shows it as a "Tools updated" card with "Now available: … No longer
  available: …". A notice not delivered stays pending for the next input.

## Persisted State

`<memoryDir>/seen_tool_names.json`, shaped `{ "version": 1, "toolNames": [...] }`,
written by `SeenToolNamesStore` with the seen skill versions rules: reads are
tolerant (missing, unreadable or invalid mean "no record"), writes are atomic
and never create or re-create the memory folder (a missing folder is retried
while the run is tracked). It is written for a new run (its current names), when
a notice is delivered, and for a restored run without a record (its current
names, no notice). A restored run whose record differs from its tools hears
what changed with its first input. "No record" means "has seen the current
list", so runs from before this feature get no false notice and need no
migration. Runs without a memory folder keep the record in memory only.

## Lifecycle And Composition

`build-studio-server.ts` and `start-standalone-application-host.ts` create the
subsystem with the host definition services' change signal and pass
`new AgentRunPlatformNotices([toolListUpdates.service, skillUpdateNotices.service])`
as `platformInputNotices`. Shutdown closes it first (no new passes; it waits for
passes and record writes in progress).

## Ownership Rules

- The service never touches runtime details; it calls
  `AgentRun.applyDefinitionTools` and `getToolNames`.
- Backends never diff or notify the agent, and publish no notice events: a
  failed reopen is only a failed dispatch.
- Only the session service changes a session's exposure, and only
  `AgentToolsMcpSessionStreams` writes to the held GET streams.
- `AgentRun` knows only the composite port, never the sources.
