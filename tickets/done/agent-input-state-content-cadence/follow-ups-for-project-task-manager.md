# Follow-ups from PB-001 (agent-input-state-content-cadence)

Sent early on the user's direction (2026-10-18). The user delegated both decisions to the Solution Designer: "I trust that you can make a reasonable decision for me." Decisions: requirements-doc DEC-004 and DEC-005. Evidence: investigation notes › "How The Defect Got In And Why It Stayed Unnoticed".

PB-001 itself continues on its own route (implementation commit `1496628f7d` on `codex/agent-input-state-content-cadence`; not yet reviewed or validated).

## Recommended order

1. PB-001 (in progress). Finish it first.
2. **Task A: one content cadence for every chat socket** (FU-001 + FU-002 + FU-003). Start after PB-001 merges.
3. **Task B: `AgentRun` input-state cleanup** (FU-004). Start after PB-001 merges, because it edits the same file (`agent-run.ts`).

## Task A — one content cadence for every chat socket (product defect)

- **What:** The "Live response streaming" setting batches live reply text into one update per window (default 500 ms). Today that only works in a standalone Agent chat (`/ws/agent`).
  - Team chats (`/ws/agent-team`): the batching code exists but never fires. Team `SEGMENT_CONTENT` uses `segment_id` (strict presentation schema since `57ab99fcc4`, 2026-08-11), while `isCoalescibleStreamContent` requires `payload.id`.
  - Org chats (`/ws/agent-org`) and a standalone run's delegated task agents (`/ws/agent-collaboration`): these handlers call `connection.send` directly, with no `AgentStreamWebSocketEgress` at all. No design records this as a decision.
- **Where:** `autobyteus-server-ts/src/services/agent-streaming/websocket-egress/stream-content-coalescing.ts` L10-18; `team-agent-event-websocket-projector.ts` L84; `agent-org-stream-handler.ts` L56-93; `agent-collaboration-stream-handler.ts` L76-99; `src/api/websocket/agent.ts` L161, L182.
- **Evidence:** reading the code only, not run. **First step: verify it on current `origin/personal`**, as PB-001 did.
- **Decision already made (DEC-004):** every chat surface should follow the setting, with the same ordering rules: lifecycle, tool, error and terminal frames flush earlier text first.
- **Include in the same Task (FU-003): stale docs.**
  - `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` lists only 2 of the 4 chat sockets, and says every connection batches.
  - `docs/modules/agent_streaming.md` › "WebSocket Content Egress" says every standalone or Team session has the egress.
  - Update both to describe the result after the fix.
- **Suggested Task description:** "Verify, then fix: the Live response streaming cadence applies only to standalone Agent chats. Team content is not coalescible (`segment_id` vs `id`), and Org and agent-collaboration sockets bypass the egress. Give every chat socket the same egress and cadence with unchanged ordering rules. Add a cadence integration case per socket. Update the streaming protocol and module docs."

## Task B — `AgentRun` input-state cleanup (code quality, no behaviour change)

- **What:**
  - (CC-001) `inputStateEvent()` reads like a getter but advances `inputRevision`. It is called from publish, subscribe and the pull read `getInputStateSnapshot()`. Split "compute" from "advance".
  - (CC-002) `this.reconcileRecovery(); this.publishInputState();` is repeated inline at several call sites. Consolidate it.
  - (CC-003) The `captureMessages` comment in `tests/integration/agent/agent-status-websocket.integration.test.ts` calls `AGENT_INPUT_STATE` "not part of this contract", but production treats it as a cadence boundary. Correct the comment.
- **Where:** `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` (`inputStateEvent`, `publishInputState` and their callers); the test file named above.
- **Evidence:** static reading, 2026-10-18 (investigation notes CC-001..CC-003).
- **Suggested Task description:** "Refactor AgentRun's input-state projection, with no behaviour change: separate revision advancement from event construction, consolidate the repeated reconcile-and-publish sites, and correct the misleading AGENT_INPUT_STATE comment in the status WebSocket integration test. Keep PB-001's publish-once rule and its tests green."

## PTM receipt (2026-10-18)

The PTM recorded both as TODO, not dispatched, each `depends_on` autobyteus-86 (PB-001): Task A = **autobyteus-139**, Task B = **autobyteus-140**. Order: PB-001, then A, then B. The PTM will hand A, then B, to the Solution Designer when PB-001 is terminal.
