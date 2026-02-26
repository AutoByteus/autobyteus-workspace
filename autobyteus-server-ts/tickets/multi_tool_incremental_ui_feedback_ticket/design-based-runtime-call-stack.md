# Design-Based Runtime Call Stacks - Server Slice (v2)

## Design Basis

- `/Users/normy/autobyteus_org/autobyteus-server-ts/tickets/multi_tool_incremental_ui_feedback_ticket/proposed-design.md`
- `/Users/normy/autobyteus_org/autobyteus-ts/tickets/multi_tool_incremental_ui_feedback_ticket/proposed-design.md` (Revised v13)

## Use Case Index

- Use Case 1: Single-agent maps `TOOL_EXECUTION_SUCCEEDED`
- Use Case 2: Single-agent maps `TOOL_EXECUTION_FAILED`
- Use Case 3: Single-agent maps `TOOL_DENIED`
- Use Case 4: Single-agent maps `TOOL_APPROVED`
- Use Case 5: Single-agent maps `TOOL_EXECUTION_STARTED`
- Use Case 6: Team rebroadcast preserves `agent_name`/`agent_id` for lifecycle events
- Use Case 7: Circular payload remains websocket-safe
- Use Case 8: Unknown stream event still emits explicit error message

## Use Case 1: Single-agent maps `TOOL_EXECUTION_SUCCEEDED`

```text
[ENTRY] AgentEventStream emits StreamEventType.TOOL_EXECUTION_SUCCEEDED
└── AgentStreamHandler.convertStreamEvent(...)
    └── ServerMessage(type=TOOL_EXECUTION_SUCCEEDED,payload=serialize(data))
```

## Use Case 2: Single-agent maps `TOOL_EXECUTION_FAILED`

```text
[ENTRY] StreamEventType.TOOL_EXECUTION_FAILED
└── AgentStreamHandler.convertStreamEvent(...)
    └── ServerMessage(type=TOOL_EXECUTION_FAILED,payload=serialize(data))
```

## Use Case 3: Single-agent maps `TOOL_DENIED`

```text
[ENTRY] StreamEventType.TOOL_DENIED
└── AgentStreamHandler.convertStreamEvent(...)
    └── ServerMessage(type=TOOL_DENIED,payload=serialize(data))
```

## Use Case 4: Single-agent maps `TOOL_APPROVED`

```text
[ENTRY] StreamEventType.TOOL_APPROVED
└── AgentStreamHandler.convertStreamEvent(...)
    └── ServerMessage(type=TOOL_APPROVED,payload=serialize(data))
```

## Use Case 5: Single-agent maps `TOOL_EXECUTION_STARTED`

```text
[ENTRY] StreamEventType.TOOL_EXECUTION_STARTED
└── AgentStreamHandler.convertStreamEvent(...)
    └── ServerMessage(type=TOOL_EXECUTION_STARTED,payload=serialize(data))
```

## Use Case 6: Team rebroadcast preserves member context for lifecycle events

```text
[ENTRY] AgentTeamEvent(source=AGENT, agent_name=memberX)
└── AgentTeamStreamHandler.convertTeamEvent(...)
    ├── AgentStreamHandler.convertStreamEvent(agent_event)
    └── merge payload + {agent_name,agent_id}
```

## Use Case 7: Circular payload remains websocket-safe

```text
[ENTRY] lifecycle payload includes circular object
└── payload-serialization.serializePayload(...)
    └── returns JSON-safe fallback object
        └── ServerMessage.toJson() succeeds
```

## Use Case 8: Unknown stream event still emits explicit error message

```text
[ENTRY] unmapped StreamEventType
└── AgentStreamHandler.convertStreamEvent(default)
    └── ServerMessage(type=ERROR, code=UNKNOWN_EVENT)
```
