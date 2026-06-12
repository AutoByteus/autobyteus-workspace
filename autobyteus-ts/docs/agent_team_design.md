# Native Agent Team Package Decommissioned

The native AutoByteus `agent-team` runtime package is no longer part of
`autobyteus-ts`. Active team execution is owned by `autobyteus-server-ts` and
runs through the server team stack:

`TeamRun -> MixedTeamManager -> AgentRunManager -> runtime AgentRun backend`

`autobyteus-ts` continues to provide single-agent runtime primitives, messages,
tools, and LLM integration. It does not own team lifecycle, team bootstrap,
team-scoped communication rosters, or team stream rebroadcasting.

## Current Boundaries

- Team definition discovery, launch, restore, member routing, communication
  projection, and team streaming live under `autobyteus-server-ts`.
- AutoByteus members inside server teams are regular `AgentRun`s configured by
  the server with `MemberTeamContext`-derived instructions and primitive
  `customData.teamContext` fields.
- The public agent communication tool name remains `send_message_to`, but the
  implementation is server-owned. `recipient_name` delivery runs through
  `TeamRun` / `MixedTeamManager`; exact active-run `target_agent_run_id`
  delivery runs through the server `agent-communication` direct route. Neither
  path is implemented by native AutoByteus team classes.
- Server-managed task delegation (`delegate_tasks`, `submit_task_result`, and `review_task_result`) remains owned by `autobyteus-server-ts`.
  Personal ToDo tools remain local single-agent tools.

## Removed Native Surface

Do not reintroduce native AutoByteus team lifecycle, bootstrap, manifest
injection, team communication context, or team stream bridge classes in
`autobyteus-ts`. Team behavior belongs in the server team execution modules.
