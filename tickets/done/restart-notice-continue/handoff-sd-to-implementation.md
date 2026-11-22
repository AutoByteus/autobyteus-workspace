# Handoff: Solution Designer → Implementation Engineer

- Result: `Architecture Design Complete`, `task_size=Small`, `architectural_risk=Low`. Direct implementation route. Architecture review not selected.
- Task: Project Task `autobyteus-585` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), from `/project_task_manager`.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-notice-continue`
- Branch: `codex/restart-notice-continue`. It tracks `origin/personal`; push it by its own name.
- Base: `origin/personal` @ `0da6bfbfc13e76dcd0b3e07ed937019b0e5ce60c`. Finalization target: `origin/personal`.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-notice-continue/tickets/in-progress/restart-notice-continue/`

## Scope after the founder's decision

The Task had two parts. **The founder dropped part 1 (the notice wording)** on 2026-11-22 after the work-journal sampling: 30 of 31 agents continued (DEC-001). Do not change server code or the notice text.

This ticket is **part 2 only**: every platform notice is drawn as its own light, labelled row in the conversation, never inside an agent's message, on desktop and phone (`/mobile`).

## Read

- `requirements-doc.md`: REQ-001..REQ-005, AC-001..AC-007, DEC-001..DEC-002.
- `design-spec.md`: Final File Responsibility Mapping, the builder example, and the `showsUsage` rule. That rule exists because splitting a message would otherwise show and count its tokens twice.
- `investigation-notes.md`: code paths with lines; the founder's screenshots in `evidence/`.
- `solution-revision-record.md`.

## The change in short

1. `recentEventMonitorWindow.ts` `buildRecentEventMonitorPresentation`:
   - a `system_task_notification` segment becomes a `notice` item and ends the agent run;
   - `message` items get `showsUsage` (true on the message's last item).
2. Usage total and the feed's usage line use `showsUsage`. The witness tokenizes `notice` items.
3. `AgentConversationFeed.vue`: a notice row with `data-speaker="system"`.
4. `SystemTaskNotificationSegment.vue`:
   - icon in the avatar column, label as the speaker line, muted body;
   - a label for every notice (Application restarted, Skill updated, Tools updated, Agent runtime changed, Background tasks finished, else Platform notice);
   - the bracketed `[Platform notice — …]` first line dropped.
5. Remove the dead notice branch from `AIMessage.vue`. Add en and zh-CN catalog keys. Check the phone CSS. Update the e2e fixture and the `agent_execution_architecture.md` notice lines.

## Proof (TESTING.md)

- Web unit specs for AC-001..AC-004 and AC-007; existing specs updated only where they asserted the old placement (AC-006).
- Phone: a case in `pnpm -C autobyteus-web test:e2e:mobile-shell` showing the founder's case (AC-005).
- Desktop: a browser probe with a screenshot (AC-005).

No release without the founder's word.
