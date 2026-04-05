# Docs Sync

## Scope

- Ticket: `agent-turn-model-refactor`
- Trigger Stage: `9`
- Workflow state source: `tickets/done/agent-turn-model-refactor/workflow-state.md`

## Why Docs Were Updated

- The mandatory segment-event `turn_id` re-entry changed the stream contract at the segment base layer, so the design docs had to describe that contract truthfully.
- The touched frontend stream protocol now mirrors that same contract, so this docs pass also confirmed whether any separate long-lived frontend streaming doc needed updates.

## Long-Lived Docs Reviewed

| Doc Path | Result | Notes |
| --- | --- | --- |
| `autobyteus-ts/docs/turn_terminology.md` | Reviewed | Already described `turn_id` on streamed segment events correctly. |
| `autobyteus-ts/docs/streaming_parser_design.md` | Updated | Added `turn_id` to the documented segment-event payload schema examples. |
| `autobyteus-ts/docs/api_tool_call_streaming_design.md` | Updated | Updated example `SegmentEvent` construction calls to pass `turnId` and include `turn_id` on direct event construction. |
| `autobyteus-web` long-lived streaming docs | No separate doc to update | The touched frontend stream contract lives directly in `services/agentStreaming/protocol/messageTypes.ts`; no separate long-lived frontend doc exists for this contract. |

## Docs Updated

| Doc Path | Type Of Update | What Changed |
| --- | --- | --- |
| `autobyteus-ts/docs/streaming_parser_design.md` | contract sync | documented `turn_id` on all segment-event payload examples |
| `autobyteus-ts/docs/api_tool_call_streaming_design.md` | implementation example sync | updated example handler code to construct segment events with `turnId` and direct `turn_id` fields |

## Durable Knowledge Promoted

| Topic | Final Truth |
| --- | --- |
| Segment-event base contract | `SegmentEvent` itself owns required `turn_id` |
| Segment producer responsibility | factories, handlers, parser config/context, parser emitter, and direct emitters must receive/provide `turnId` at construction time |
| Downstream seam contract | touched server consumers treat turn-less segment payloads as invalid and ignore them |
| Frontend contract symmetry | touched frontend segment payload types explicitly declare `turn_id`, and the local synthetic segment constructors thread it through when known |

## Final Result

- Result: `Updated`
- Follow-up needed: `None`
- Additional note: `No separate long-lived frontend streaming document exists, so code-level contract symmetry in autobyteus-web is the authoritative sync for that surface.`
