# Investigation Notes

## Investigation Meta

- Package identifier: `restart-notice-continue` (Project Task `autobyteus-585`)
- Request / ticket: autobyteus-585, "Platform restart notice: keep resumed agents working … and render the notice as its own row on desktop & phone"
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-notice-continue`
- Repository mode: `Git` (superrepo `AutoByteus/autobyteus-workspace`)
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-notice-continue`, `codex/restart-notice-continue`
- Resolved base: `origin/personal` @ `0da6bfbfc13e76dcd0b3e07ed937019b0e5ce60c` (fetched 2026-11-22)
- Finalization target: `origin/personal`
- Bootstrap result: `Ready`
- Current solution revision ID: `SR-001`
- Authorities read (2026-11-22): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/handoff.md`, `references/project-documents.md`; repo `DESIGN.md`, `TESTING.md`
- Investigation status: Complete

## Initial Request And Clarifications

- Original request: Task autobyteus-585 (from `/project_task_manager`), from the founder's observation on 2026-11-21 after the update to `v1.5.14-beta.4`. Two problems:
  1. A Claude agent stopped and waited after the restart notice. It took the runtime's "user stopped you, wait" tool error literally.
  2. The notice was drawn inside the agent's own message, so it looked as if the agent wrote it.
- Clarifications received (the founder, in the Solution Designer conversation, 2026-11-22):
  - "the majority of agents which actually continues with these work … look at the work journal … do some sampling of statistics". The sampling was done (below).
  - Then: "I guess we don't have to update the like platform notice message right because it seems like there's only one case I experienced". **Decision: the notice wording is not changed** (DEC-001).
- Remaining scope: the notice's place and look in the conversation, desktop and phone.

## Product And Domain Understanding

- Product area: the run conversation (desktop workspace and the phone app `/mobile`, same web components).
- Platform notices are inputs the platform gives an agent, not text the agent wrote. They come from a family of senders (`autobyteus-server-ts/src/agent-execution/domain/system-task-notification-senders.ts`):
  - restart reminder `system.restart_resume`;
  - skill update `system.skill_update_notifier`;
  - tool list `system.tool_list_update_notifier`;
  - background tasks `system.background_task_notifier`;
  - team change `system.team_change_notifier`;
  - runtime hand-over `system.runtime_handover`;
  - Claude background task `system.claude_background_task`;
  - Grok provider turn `system.grok_provider_turn`;
  - Model Router request `system.model_router`;
  - task notices.

## Source Log

| Date | Source Type | Exact Source / Command | Why | Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-22 | Code | `autobyteus-server-ts/src/restart-resume/restart-notice.ts` | Notice text | Header `[Platform notice — application restarted]`, cause line, the interrupted-turn line ("check the results of any tool calls…"), background line. Published as `SYSTEM_TASK_NOTIFICATION` | Wording unchanged (DEC-001) |
| 2026-11-22 | Code | `autobyteus-web/services/agentStreaming/handlers/systemTaskNotificationHandler.ts` | Live placement | Each notice is pushed as a `system_task_notification` **segment into `findOrCreateAIMessage(context)`**: the conversation's last AI message, or a new one. A wake after an update arrives with no user message in between, so it is appended to the end of the previous turn's AI message, and the agent's reply follows in the same message. | Root cause UI-1 |
| 2026-11-22 | Code | `autobyteus-web/services/runHydration/runProjectionConversation.ts` L275-283 | History placement | A recorded notice becomes the same segment inside an AI message | Same |
| 2026-11-22 | Code | `autobyteus-web/components/conversation/AIMessage.vue` L53-58 | Rendering | The segment renders inside the agent's row (avatar, phone speaker line "implementation_engineer") | Root cause UI-1 |
| 2026-11-22 | Code | `autobyteus-web/components/conversation/segments/SystemTaskNotificationSegment.vue` | Look | Renders through the normal markdown renderer. It shows a small uppercase label only for runtime change, skill update and tools update; **the restart reminder and every other notice get no label**. The restart body keeps its bracketed header line. | Root cause UI-2 |
| 2026-11-22 | Doc / ticket | `autobyteus-web/docs/agent_execution_architecture.md` L2007-2008; `tickets/done/notification-segment-message-style/requirements.md` (2026-06-29, commit `ea814d523d`) | Why it looks like this | June ticket replaced a heavy purple card (emoji, title, monospace) with "ordinary chat content … not a prominent alert card". Out of scope there: "converting system notifications into user messages … at the data/model level". | Keep light; change place and label only |
| 2026-11-22 | Code | `autobyteus-web/services/eventMonitor/recentEventMonitorWindow.ts` `buildRecentEventMonitorPresentation` L156-202 | The feed's row builder | Already splits one AI message into several rows (runs of retained segments, interleaved with compaction rows). Items: `message` and `compaction`. | Natural owner for a `notice` row |
| 2026-11-22 | Code | `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` L27-45 | Feed rows | Latest mode renders `message` items (User/AI) and `compaction` rows (`data-speaker="system"`) | Add the notice row |
| 2026-11-22 | Code | `autobyteus-web/services/eventMonitor/eventMonitorActiveTraceBrowsePresentation.ts`; server `event-monitor-active-trace-page-projection.ts` L138-139 | Browse mode (older pages) | Browse pages carry no notice visual ("the notice replays in the conversation") | Unchanged |
| 2026-11-22 | Code | `autobyteus-web/services/eventMonitor/recentEventMonitorPresentationWitness.ts` L93-140 | Change detection of the feed | Tokens per item; handles `compaction`, user, AI segments | Must handle the new item kind |
| 2026-11-22 | Code | `autobyteus-web/assets/css/phone-conversation.css` | Phone layout | Rows keyed by `data-speaker`. An agent row after an agent row hides avatar/speaker; a `system` row in between makes the next agent row show its name again. | Phone gets the separation from the row itself |
| 2026-11-22 | Doc | `TESTING.md` L65-67 | Phone proof | Renderer behavior the phone offers is proven on the phone bundle (`pnpm -C autobyteus-web test:e2e:mobile-shell`) | Verification intent |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Current Path | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Wake after an update (restart reminder as first input) | Notice → appended to the last AI message (the previous turn) → agent replies in the same message | Notice drawn inside the agent's message with no label: reads as the agent's words (founder's screenshot 08:34) | Screenshots in `evidence/`; handler code | High |
| BEH-002 | System | A notice rides the next user/agent input (preface), or any other platform notice starting a turn | User row → AI message starting with the notice → reply | Notice at the top of the agent's message; label only for 3 kinds | Handler, segment component | High |
| BEH-003 | User | Reload / open the run later | History projection puts the notice in the AI message | Same look as live | `runProjectionConversation.ts` | High |
| BEH-004 | User | Browse older pages | Browse pages omit notices | Not shown there | Server projection L138-139 | High |
| BEH-005 | System | Restart cuts a Claude run's running tool | Claude runtime records `TOOL_EXECUTION_FAILED` with its own "user doesn't want to proceed … STOP … wait for the user … still stands" text | 30/31 agents continued after the notice; 1 of the 4 that saw that text stopped | Sampling below | High (sample of 31) |

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Evidence |
| --- | --- | --- | --- | --- | --- |
| `python3 -I probe/restart_notice_sampling.py ~/.autobyteus/server-data/memory out.json`, over every work journal | What agents did after each restart notice | 31 notices (Claude 29, Codex 1, Antigravity 1); 23 mid-turn. 30 continued (a command, edit or other action before the next input); 1 stopped (autobyteus-584's implementation engineer). | Measured | The premature stop is rare | `evidence/restart-notice-sampling-20261122.txt` |
| Raw traces, last tool result before each mid-turn notice | Which agents saw a "stop and wait" result | Claude: 4 with the runtime's text, recorded at shutdown; 17 without a recorded result. Antigravity: "Tool execution interrupted." Codex: none. Of the 4: 3 continued, 1 stopped. | Measured | The founder decided not to change the wording (DEC-001) | same |
| `grep -a` in `@anthropic-ai/claude-agent-sdk-darwin-arm64@0.3.280/claude` | Origin of the text | The text is the Claude runtime's own, including "Correction to the text above: this call was stopped while running … The instruction to stop and wait still stands." | Reproduced (string present) | Not ours | same |

- Temporary diagnostics: None in the repo. Scratch in `/tmp/rn585/` (removed at cleanup).
- Reproduction for implementation: the founder's screenshots (`evidence/*.jpg`). A conversation fixture with a previous AI turn ending in a tool call, then a restart notice segment, then reply text, renders the notice inside the agent's row today.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- |
| `probe/restart_notice_sampling.py` | Solution Designer | Sampling of agents' behavior after restart notices | DEC-001 | Current | Evidence tool |
| `evidence/restart-notice-sampling-20261122.txt` | Solution Designer | Its result | DEC-001 | Current | Evidence |
| `evidence/*.jpg` | Founder | The observed rendering | AC-001 | Current | Evidence |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| RSK-001 | Risk | The premature stop can recur, about 1 in 31 notices sampled | The founder accepts it (DEC-001) | Accepted |

## Architecture Investigation Findings

- The conversation model keeps notices as AI-message segments. Readers of that shape include:
  - live dedupe `showsNotice`;
  - window enforcement;
  - the presentation witness;
  - hydration;
  - token-usage text per message.
- Only the feed's presentation builder decides rows, and it already splits AI messages, so a notice row is a presentation decision with one owner.
- `AIMessage.vue` is used only by `AgentConversationFeed.vue` (`rg -l AIMessage --glob '*.vue'`). Once the builder never hands it a notice segment, its notice branch is dead.
- Phone and desktop share the feed; the phone styles come from `phone-conversation.css` by `data-speaker`.

## Requirement Implications

- The fix is web-only presentation: own row and label for every platform notice; no server, model, transport or wording change.

## Notes For Architecture Design

- Split at notice segments in `buildRecentEventMonitorPresentation` (new item kind), render the row in the feed with `data-speaker="system"`, give every notice a label, show the label instead of a bracketed `[Platform notice — …]` header line, remove the dead branch in `AIMessage.vue`, update the witness and docs.
