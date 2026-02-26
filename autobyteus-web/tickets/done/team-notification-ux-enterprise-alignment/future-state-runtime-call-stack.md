# Future-State Runtime Call Stack

Version: `v1`
Date: `2026-02-22`
Design Basis: `proposed-design.md v1`

## UC-001/UC-002/UC-003: Inter-agent notification display (readable + low-noise)

Primary Path:
1. `autobyteus-ts/src/agent/handlers/inter-agent-message-event-handler.ts:handle(...)`
2. `resolveSenderDisplayName(context, senderAgentId)` resolves team member display name when available.
3. Handler emits notifier payload with sender id/type/recipient role/content.
4. `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue:interAgentSenderNameById`
5. `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue` passes mapping prop.
6. `autobyteus-web/components/conversation/AIMessage.vue:resolveInterAgentSenderDisplayName(...)`
7. `autobyteus-web/components/conversation/segments/InterAgentMessageSegment.vue`
8. UI renders `From <ReadableSender>: <Content>` with metadata in details toggle/tooltip.

Fallback Path:
1. Sender mapping missing -> `InterAgentMessageSegment.vue:toReadableSenderName(...)`
2. Machine-style sender ids map to `Teammate` fallback.

Error Path:
1. Invalid sender id input -> empty/unknown fallback label without render crash.

## UC-004/UC-005: Tool/core activity indicator correctness

Primary Path:
1. `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts:handleSegmentStart|Content|End`
2. Invalid segment id payloads are dropped early.
3. Valid tool lifecycle event flows into `toolLifecycleHandler.ts`.
4. `toolLifecycleHandler.ts:syncActivityToolName(...)` updates store with concrete tool name.
5. `stores/agentActivityStore.ts:updateActivityToolName(...)` upgrades placeholder names.
6. Activity panel renders stable invocation rows with accurate tool labels.

Error Path:
1. Malformed invocation id in activity add path -> dropped by `addActivity` guard.
2. Missing/invalid tool name in lifecycle payload -> no overwrite of valid existing tool name.

## UC-006/UC-007: Core inter-agent producer message contract

Primary Path:
1. `autobyteus-ts/src/agent/message/send-message-to.ts:_execute(...)`
2. If `message_type` omitted, default `direct_message` is applied.
3. `InterAgentMessageRequestEvent` dispatched with normalized type.
4. Recipient side handler builds concise LLM input:
   - sender display name + sender id
   - message content block only

Fallback Path:
1. Explicit `message_type` still accepted and preserved.

Error Path:
1. Missing `recipient_name` or `content` still fails fast with tool error message.
