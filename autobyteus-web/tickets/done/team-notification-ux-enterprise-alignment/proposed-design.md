# Proposed Design

Version: `v1`
Date: `2026-02-22`
Scope: `Medium`

## 1. Current State (As-Is)

- Inter-agent message segment renders as heavy boxed card with inline metadata (`Type`, `Intended role`) and raw sender id text.
- Team monitor does not pass sender display mapping into AI message component chain.
- Activity store accepts malformed invocation ids and cannot reliably correct placeholder tool names.
- Core inter-agent handler builds verbose recipient prompt payload with message type and role blocks.
- Core `send_message_to` requires `message_type`, forcing extra noise in tool calls.

## 2. Target State (To-Be)

- Inter-agent message renders as compact inline row: readable sender + content; details hidden behind toggle/tooltip.
- Team monitor computes sender mapping from active team members and injects it into message rendering props.
- Activity pipeline rejects malformed invocation ids and synchronizes concrete tool names from lifecycle payloads.
- Core inter-agent handler emits concise recipient message template focused on sender + content.
- Core `send_message_to` defaults `message_type` to `direct_message` when omitted.

## 3. Change Inventory

| Type | File | Responsibility |
| --- | --- | --- |
| Modify | `autobyteus-web/components/conversation/segments/InterAgentMessageSegment.vue` | Compact inter-agent rendering, readable sender formatting, metadata toggle |
| Modify | `autobyteus-web/components/conversation/AIMessage.vue` | Thread sender-name mapping into inter-agent segment |
| Modify | `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue` | Accept + pass inter-agent sender mapping to AI message |
| Modify | `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue` | Build sender-id -> display-name map from active team members |
| Modify | `autobyteus-web/stores/agentActivityStore.ts` | Guard malformed invocation ids and allow tool-name backfill |
| Modify | `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | Sync activity tool name from lifecycle events |
| Modify | `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | Drop malformed segment events missing ids |
| Modify | `autobyteus-ts/src/agent/handlers/inter-agent-message-event-handler.ts` | Resolve sender display name + concise LLM input template |
| Modify | `autobyteus-ts/src/agent/message/send-message-to.ts` | Make `message_type` optional and default to `direct_message` |
| Modify/Add | web/core unit tests | Guard new rendering and lifecycle behaviors |

## 4. Naming Decisions

- Sender display fallback label: `Teammate` (instead of raw machine id).
- Default optional message type: `direct_message`.
- No new public API names introduced beyond prop `interAgentSenderNameById` in web component path.

## 5. Dependency Flow

1. `autobyteus-ts` emits inter-agent events and recipient message input.
2. `autobyteus-web` team monitor resolves sender names by agent id.
3. `AIMessage` passes resolved name to inter-agent segment renderer.
4. Tool lifecycle handlers update activity store status + canonical tool names.

## 6. Risk Controls

- Add tests for sender mapping propagation and details visibility behavior.
- Add tests for activity store malformed-id guard and tool-name backfill.
- Preserve event payload compatibility; only relax `message_type` requirement (default path added).

## 7. Use-Case Coverage Matrix

| use_case_id | Primary | Fallback | Error | Design Sections |
| --- | --- | --- | --- | --- |
| UC-001 | Yes | N/A | N/A | 2, 3 |
| UC-002 | Yes | Yes | N/A | 2, 3, 5 |
| UC-003 | Yes | N/A | N/A | 2, 3 |
| UC-004 | Yes | N/A | N/A | 2, 3, 5 |
| UC-005 | Yes | N/A | Yes | 2, 3, 6 |
| UC-006 | Yes | Yes | N/A | 2, 3 |
| UC-007 | Yes | Yes | N/A | 2, 3, 5 |
