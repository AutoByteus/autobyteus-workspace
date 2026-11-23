# Investigation Notes

## Investigation Meta

- Package identifier: `conversation-order-628`
- Request / ticket: autobyteus-628, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-order-628`
- Repository mode: `Git`
- Task worktree / branch: the worktree above, branch `codex/conversation-order-628` (no upstream)
- Resolved base: `origin/personal` @ `1f761bc8db` (fetched 2026-11-23)
- Finalization target: `origin/personal`
- Bootstrap result: worktree created; `pnpm install --frozen-lockfile` (`/tmp/sd628-install.log`); workspace builds and `nuxt prepare` (`/tmp/sd628/prepare.log`)
- Current solution revision ID: SR-001
- Authorities read (requirements gate, 2026-11-23):
  - `SKILL.md` (updated 2026-11-23)
  - `references/requirements-engineering.md`
  - `references/ticket-scope.md` (updated)
  - `references/finding-the-cause.md`
- Investigation status: cause established (Reproduced with the real web code; the founder's clock difference not measured).

## The founder's run (read-only)

Run: `memory/agent_teams/software_engineering_team_0ca0b5062e034ffd86ec7e849e85498b/solution_designer_f4744a58011141938ee824cea64ca153/raw_traces_active.jsonl`. Read only; nothing in it changed.
- It is a Team member on the Claude runtime (tool `Read`, `toolu_…` call IDs). The ticket name "agy-acp-runtime" is the ticket's topic, not the run's runtime.
- The turn of the founder's question (`…:turn:249cb66c…`, 17:55:09.697 → 17:55:38.015 local) is stored in the right order:

  | seq | trace | ts | source / ids |
  | --- | --- | --- | --- |
  | 1 | `system_task_notification` "[Platform notice — skill updated] …" | 1795452909.697 | `SYSTEM_TASK_NOTIFICATION`, sender `system.skill_update_notifier`, message `993f64ae…` |
  | 2 | `user` "You mean the new anti-gravity agui ACP motor …" | 1795452909.696 | `AgentRun.postUserMessage`, message `client_561bb955…`, dedupe `member_input:…` |
  | 3 … | `assistant` "Re-reading the updated skill files …", Read ×3, the answer | 1795452915.948 … 1795452938.015 | `SEGMENT_END`, `TOOL_EXECUTION_*` |

- The notice is the preface the node puts in front of the user's input (`agent-execution/domain/agent-run-input-preface-dispatch.ts:22-45`: one provider message, notice first). The notice event is published when the dispatch is forwarded (`:68-100`, `settle`).
- **So the stored data is not out of order, and it is not an old-format artifact.**

## Reload path (Reproduced, temporary server test; Read for the web)

- A temporary test (removed; never committed) fed the founder's shape (previous turn; then notice seq 1 at ts .697, user seq 2 at ts .696, assistant seq 3–4) through `buildHistoricalReplayEvents` → `buildRunProjectionConversation` → `dedupeRunProjectionConversationEntries`. The entries come out in stored order: notice, user, assistant, assistant (`/tmp/sd628/reload-projection.json`).
- The web's `buildConversationFromProjection` (`services/runHydration/runProjectionConversation.ts:335-405`) keeps entry order: `[AI(notice), user, AI(reply)]`.
- The window (below) then sorts by timestamp. All reload timestamps are the node's, so the user (.696) sorts before the notice's AI message (.697). Reload shows You → notice → reply: correct chronologically.

## Live path: the cause (Read + Reproduced)

- `services/eventMonitor/recentEventMonitorWindow.ts:184-201` `buildRecentEventMonitorPresentation`:
  - flattens the conversation (`:80-104`; every row of a message takes that message's `timestamp`);
  - then sorts all rows **by timestamp** (`.sort((l, r) => l.timestampMs - r.timestampMs || l.order - r.order)`, `:200`, since `d50cf2cc99`, 2026-07-18), to interleave compaction rows.
  - It is used by `AgentConversationFeed.vue:160` (desktop and phone) and `recentEventMonitorMutationCoordinator.ts:34`.
- Live, the timestamps come from two clocks:
  - An agent message created live gets the **viewer's** clock: `findOrCreateAIMessage` uses `new Date()` (`services/agentStreaming/handlers/segmentHandler.ts:254-272`), used by the notice handler (`systemTaskNotificationHandler.ts:23`) and the segment handlers.
  - The user's message, once the node echoes it (`MEMBER_INPUT_MESSAGE` → `handleMemberInputMessage` → `upsertUserMessageByIdentity`, `userMessageProjection.ts:49-80`), takes the **node's** `received_at` (`buildUserMessageFromProjectionPayload`, `:29-47`; `nextMessage = {...existing, ...userMessage}` replaces the timestamp). A viewer that did not send it only ever has the node's time.
  - Compaction rows: `centerTimelineTimestamp` = the viewer's `now` live (`compactionActivityProjection.ts:214`).
- When the viewer's clock is behind the node's by more than the time between the node receiving the message and the first agent event reaching the viewer, the user's row sorts after the whole agent message.
  - A platform notice is published as soon as the dispatch is forwarded, so that gap is small and a small clock difference flips the order.
  - Without a notice, the first agent output usually comes seconds later, which needs a larger difference.
- **Reproduction** (real web code: `handleMemberInputMessage`, `handleSystemTaskNotification`, `buildRecentEventMonitorPresentation`; fake timers set the viewer's clock): `tickets/in-progress/conversation-order-628/probes/clock-order-reproduction.spec.ts`, run log beside it.
  - Same clock: previous reply, You, notice, reply (pass).
  - Viewer 1 s behind the node: previous reply, notice, reply, **You**: the founder's screenshots exactly (fails).
- Desktop: the same feed and the same sort. A desktop window on its own embedded node shares the node's clock, so it does not show this. A window on another node (a Docker node, a peer) whose clock is ahead would.
- Not measured: the founder's phone-to-computer clock difference. The screenshots' status bar shows minutes only.

## Other order sources checked

- `dedupeRunProjectionConversationEntries` (`run-projection-dedupe.ts:158-186`) keeps first-seen order.
- The node has no sort in the projection (`rg "sort(" run-history/projection`: only key sorting).
- `enforceRecentConversationWindow` (`recentEventMonitorWindow.ts:106-…`) selects which rows to keep; it does not order the shown rows.

## Requirement implications

- The order must not depend on the viewer's clock: the conversation's own order (stream arrival, stored sequence) is the authority; timestamps are for display.
- Live and reload must agree. Today live shows You → notice → reply (the sender's own message is shown before the notice arrives, and a non-sender gets the echo before the notice, which is published after forwarding). Reload shows the same only because of the same-clock timestamp sort; by entry order alone it would be notice → You → reply.
- Compaction rows must keep their place among the messages.

## Temporary diagnostics

- `autobyteus-server-ts/tests/unit/run-history/projection/sd628-probe.test.ts`: the reload pipeline on the founder's shape. Removed, never committed. Output: `/tmp/sd628/reload-projection.json`.
- The web reproduction was moved out of the source tree into the ticket's `probes/` folder (a supplement for implementation to start from).

## Supplement inventory

| Path | Owner | Purpose | Related | Status |
| --- | --- | --- | --- | --- |
| `probes/clock-order-reproduction.spec.ts` (+ `.run.log`) | Solution Designer | Failing reproduction with the real web code | REQ-001, AC-001 | Evidence; implementation turns it into the real spec |
