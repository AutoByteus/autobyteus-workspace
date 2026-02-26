# Proposed-Design-Based Runtime Call Stack - inter-agent-message-ui-polish

## Design Basis (Small Scope)
- Source: `tickets/inter-agent-message-ui-polish/implementation-plan.md`
- Target: Sender label resolution is injected from team context and segment UI is compact/inline.

## UC-1: Team inter-agent segment shows member name, not raw member ID
1. `components/workspace/team/AgentTeamEventMonitor.vue` computes `interAgentSenderNameById` from `activeTeam.members`.
2. `components/workspace/agent/AgentEventMonitor.vue` receives map prop and forwards it to message rendering.
3. `components/conversation/AIMessage.vue` renders each `inter_agent_message` segment with `senderDisplayName` derived from map lookup by `segment.senderAgentId`.
4. `components/conversation/segments/InterAgentMessageSegment.vue` prefers `senderDisplayName` over raw ID heuristics.
5. UI displays `From Professor:` instead of `From member_<id>:`.

## UC-2: Fallback path when mapping is unavailable
1. `InterAgentMessageSegment.vue` receives no mapped sender name.
2. Component computes display label from existing normalization heuristic.
3. If ID is machine-style (`member_<hex>`), component shows neutral fallback (`Teammate`) as primary label.

## UC-3: Compact visual flow + optional details
1. `InterAgentMessageSegment.vue` renders a lightweight inline row (icon + sender + content + chevron).
2. Metadata details remain hidden by default.
3. User toggles chevron to reveal detail row (`messageType` + `recipientRoleName`).
