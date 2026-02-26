# Investigation Notes

## Stage

- Understanding Pass: `Completed`
- Last Updated: `2026-02-22`

## Sources Consulted

- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/components/conversation/segments/InterAgentMessageSegment.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/components/conversation/AIMessage.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/components/workspace/agent/AgentEventMonitor.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/stores/agentActivityStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-ts/src/agent/handlers/inter-agent-message-event-handler.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-ts/src/agent/message/send-message-to.ts`
- `git diff personal..origin/enterprise` (targeted file comparison, no checkout)
- User-reported UI screenshot evidence (inter-agent card showing `Type: message` and raw sender id)

## Key Findings

1. Current personal UX mismatch
- Personal UI was still showing verbose inter-agent card metadata inline (`Type: <messageType> · Intended role: <role>`), which is noisy in main chat flow.
- Sender label was often a raw generated id (`member_<hash>`) instead of a readable member name.

2. Enterprise behavior already solved this
- Enterprise web renders inter-agent notifications as compact inline message with a details toggle, and keeps metadata in tooltip/details instead of always inline.
- Enterprise passes a sender-id -> display-name map from team context into message rendering.

3. Producer-side content also differed
- Personal `autobyteus-ts` inter-agent handler still generated a long LLM-facing template containing `Message Type` and role metadata blocks.
- Enterprise simplified it to concise sender/context line + message body.

4. Tool/core indicator robustness gap
- Personal activity store accepted malformed entries and did not reliably backfill tool names from lifecycle payloads.
- Enterprise added invocation id guardrails and lifecycle-based tool-name synchronization to avoid stale `tool_call` / missing names in UI indicators.

5. Scope triage result
- Classification: `Medium`
- Rationale: cross-repo behavior alignment across producer (`autobyteus-ts`) and consumer (`autobyteus-web`) plus renderer/store/lifecycle/test changes.

## Constraints

- No branch checkout/merge from enterprise into personal.
- Preserve existing team run continuation behavior and previously completed team-history fixes.
- Keep ticket under `in-progress` until explicit user completion confirmation.

## Open Questions

1. Metadata visibility default
- Keep inter-agent metadata collapsed by default with explicit toggle (enterprise behavior) vs always visible.

2. Message type retention policy
- Keep message type in transport/storage for analytics/debug while removing it from default chat surface.

## Implications

- Must align both sides: core message formatting + frontend rendering context.
- Must include tests covering sender display name mapping and tool indicator name synchronization.
