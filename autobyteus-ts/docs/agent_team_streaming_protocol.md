# Agent Team Streaming Protocol

The native `autobyteus-ts` team stream multiplexes runtime events for native
teams. It no longer carries native task-plan events.

## Event Envelope

```json
{
  "event_id": "uuid",
  "timestamp": "2026-06-03T00:00:00.000Z",
  "team_id": "team-id",
  "event_source_type": "TEAM | AGENT | SUB_TEAM",
  "data": {}
}
```

## Source Types

### `TEAM`

Team status updates. Data is `AgentTeamStatusUpdateData`.

### `AGENT`

A member agent stream event rebroadcast. Data is `AgentEventRebroadcastPayload`
with `agent_name` and `agent_event`.

### `SUB_TEAM`

A nested team stream event rebroadcast. Data is `SubTeamEventRebroadcastPayload`
with `sub_team_node_name` and `sub_team_event`.

## Dedicated Task Delegation

Server-owned dedicated task delegation is not part of this native stream source
set. Server team runs publish dedicated task domain events through
`TeamRunEventSourceType.TASK_DELEGATION`, which the server WebSocket layer
exposes as `TASK_DELEGATION_EVENT`. See
`autobyteus-server-ts/docs/modules/agent_team_execution.md`.

## Personal ToDo

Personal ToDo updates remain agent-level events and continue to use
`TODO_LIST_UPDATE` in the agent WebSocket/streaming protocol.
