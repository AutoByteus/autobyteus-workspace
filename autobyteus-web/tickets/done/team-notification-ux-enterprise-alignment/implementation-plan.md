# Implementation Plan

## Stage

- Stage: `Finalized`
- Scope: `Medium`

## Workstream A: Frontend notification UX alignment

1. Replace inter-agent segment UI with compact inline presentation.
2. Add sender display-name propagation chain:
- `AgentTeamEventMonitor` computes sender map.
- `AgentEventMonitor` forwards map.
- `AIMessage` resolves sender display name per segment.
3. Add segment/component tests for readable sender and details-toggle behavior.

## Workstream B: Tool indicator robustness alignment

1. Add malformed id guards in `segmentHandler` event handlers.
2. Add activity-store invocation id guard and `updateActivityToolName` behavior.
3. Sync tool name from lifecycle payload in `toolLifecycleHandler`.
4. Extend lifecycle/store tests for placeholder-name replacement and malformed payload handling.

## Workstream C: Core producer alignment (`autobyteus-ts`)

1. Simplify inter-agent recipient prompt text format.
2. Add sender display-name resolution from team context when available.
3. Make `send_message_to.message_type` optional with `direct_message` default.
4. Update unit tests for new handler template and tool default behavior.
5. Remove enum-instance usage from inter-agent message handling/tests so message type is plain string across runtime flow.

## Verification Plan

1. Web focused tests
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web test:nuxt components/conversation/__tests__/AIMessage.spec.ts components/conversation/segments/__tests__/InterAgentMessageSegment.spec.ts components/workspace/agent/__tests__/AgentEventMonitor.spec.ts components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts stores/__tests__/agentActivityStore.spec.ts services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts --run`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web test:nuxt services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts --run`

2. Core focused tests
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-ts exec vitest run tests/unit/agent/handlers/inter-agent-message-event-handler.test.ts tests/unit/agent/message/send-message-to.test.ts tests/unit/agent/message/inter-agent-message.test.ts tests/unit/agent/agent.test.ts`


## Full Removal follow-up (separate ticket)

- Remove `message_type` from core event constructors, stream payload schemas, and web protocol handlers/types.
- Run cross-repo contract migration with synchronized tests and adapters in one change window.
