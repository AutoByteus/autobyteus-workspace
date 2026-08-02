# Agent Team Streaming Protocol

`autobyteus-ts` no longer owns the application team-stream transport. The
server composes heterogeneous/nested teams and publishes the current protocol
from `autobyteus-server-ts`.

The current public boundary separates:

- exact leaf-agent `AGENT_STATUS` and runtime events;
- binary root `TEAM_RUN_LIFECYCLE { team_run_id, is_active }`; and
- task delegation, communication, and member-input team events with explicit
  path/route/task-execution identity.

There is no public aggregate team status event. See
`autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` and
`autobyteus-server-ts/docs/modules/agent_team_execution.md` for the authoritative
server protocol and ownership model.

## Dedicated Task Delegation

Server-owned dedicated task delegation is not part of this native stream source
set. Server team runs publish dedicated task domain events through
`TeamRunEventSourceType.TASK_DELEGATION`, which the server WebSocket layer
exposes as `TASK_DELEGATION_EVENT`. See
`autobyteus-server-ts/docs/modules/agent_team_execution.md`.

## Personal ToDo

Personal ToDo updates remain agent-level events and continue to use
`TODO_LIST_UPDATE` in the agent WebSocket/streaming protocol.
