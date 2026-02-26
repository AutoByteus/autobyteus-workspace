# Implementation Plan - inter-agent-message-ui-polish

## Small-Scope Solution Sketch
- Add an inter-agent sender-name map at team event monitor boundary from `activeTeam.members` (`agentId -> displayName`).
- Thread that map down to `InterAgentMessageSegment` as optional `senderDisplayName`.
- Update segment fallback logic for unresolved machine IDs.
- Simplify segment styling to a lighter inline pattern while retaining detail toggle.

## Tasks
1. Update `components/workspace/team/AgentTeamEventMonitor.vue` to compute and pass `interAgentSenderNameById`.
2. Update `components/workspace/agent/AgentEventMonitor.vue` and `components/conversation/AIMessage.vue` prop plumbing.
3. Update `components/conversation/segments/InterAgentMessageSegment.vue` display/fallback logic and compact styling.
4. Update/add tests for sender-name mapping and compact inter-agent segment behavior.
5. Run targeted frontend tests.

## Verification Strategy
- `components/conversation/segments/__tests__/InterAgentMessageSegment.spec.ts`
- `components/conversation/__tests__/AIMessage.spec.ts`
- `components/workspace/agent/__tests__/AgentEventMonitor.spec.ts`
