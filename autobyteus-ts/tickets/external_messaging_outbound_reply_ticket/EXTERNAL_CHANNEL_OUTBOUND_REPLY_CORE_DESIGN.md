# External Channel Outbound Reply Core Design (autobyteus-ts)

## Summary
Expose deterministic turn identity on assistant completion events so server-side outbound routing can target the exact external source that triggered the turn.

## Goals
- Deterministic outbound correlation by turn.
- Backward-compatible event contract extension.
- Keep runtime concerns separate from server/gateway transport concerns.

## Non-Goals
- No provider transport logic.
- No channel binding logic.
- No UI/UX behavior changes.

## Requirements And Use Cases
- UC1: Assistant completion event includes `turnId` when available.
- UC2: Existing processors and streams continue to work unchanged.
- UC3: Missing turn context degrades safely with `turnId = null`.

## Architecture Overview
1. `MemoryIngestInputProcessor` establishes `context.state.activeTurnId` per user turn.
2. `LLMUserMessageReadyEventHandler` includes that turn id in `LLMCompleteResponseReceivedEvent`.
3. `LLMCompleteResponseReceivedEventHandler` passes the event through to response processors unchanged.

## File And Module Breakdown

| File/Module | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-ts/src/agent/events/agent-events.ts` | Canonical completion event contract | `LLMCompleteResponseReceivedEvent(completeResponse, isError?, turnId?)` | In: complete response + optional turn id; Out: event object | none |
| `/Users/normy/autobyteus_org/autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts` | Build completion event from stream result | `handle(event, context)` | In: `activeTurnId`; Out: completion event with `turnId` | memory manager, event queue |
| `/Users/normy/autobyteus_org/autobyteus-ts/src/agent/handlers/llm-complete-response-received-event-handler.ts` | Response processor dispatch | `handle(event, context)` | In: completion event; Out: processor calls + notifier emission | response processors, notifier |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `agent-events.ts` | none | handlers/processors | Low | Keep as data-only contract |
| `llm-user-message-ready-event-handler.ts` | memory + llm | completion handler/processors | Medium | Single source of truth for setting completion `turnId` |
| `llm-complete-response-received-event-handler.ts` | completion event | custom processors | Low | No routing logic added in runtime handler |

## Data Models (If Needed)
- `LLMCompleteResponseReceivedEvent`
  - Existing fields: `completeResponse`, `isError`
  - Added field: `turnId: string | null`

## Error Handling And Edge Cases
- If no active turn exists, emit completion event with `turnId = null`.
- Error completions (`isError=true`) still carry `turnId` when available.

## Performance / Security Considerations
- Negligible overhead (one nullable field on event payload).
- No new sensitive payloads added.

## Migration / Rollout (If Needed)
- Constructor extension is backward compatible (`turnId` optional argument).
- Existing processors that ignore `triggeringEvent.turnId` continue working.

## Design Feedback Loop Notes (From Inspection)

| Date | Trigger (File/Test/Blocker) | Design Smell | Design Update Applied | Status |
| --- | --- | --- | --- | --- |
| 2026-02-09 | Deep call-stack review | Completion event lacked deterministic route context | Added optional `turnId` on completion event | Planned |

## Open Questions
- None.
