# Solution Handoff — Architecture Design Complete

- Result classification: `Architecture Design Complete`
- Package identifier: `remove-web-todo-panel` (scope: replace the dead To-Do panel/event with Background Tasks)
- Current SR entry: `SR-006`
- Date: 2026-09-29
- Route applied: handoff rule "task_size=Large or architectural_risk=High … ready for independent architecture review" → `/architecture_reviewer`

## Original Request And Goals

- User (2026-09-29): the To-Do section in the right-panel Activity tab is no longer used (no to-do in `autobyteus-ts` or the server).
- Follow-up:
  - Remove all to-do list events.
  - Rename the section to "Background Tasks".
  - Show Claude Agent SDK background tasks while they run and after they finish.
  - Check whether Antigravity also starts background tasks; include them if possible.
  - No tab switching.
  - The section behaves like today's To-Do section.
  - Live-only (not persisted).
  - Event-driven design ("background process event").

## Approval Basis

- Requirements: `Approved` by the user 2026-09-29 ("Approve.") on the SR-004 content, recorded in SR-005.
- Decisions:
  - DEC-001: remove all to-do.
  - DEC-003: only real background tasks.
  - DEC-004: section always present with a "No background tasks" empty state.
  - DEC-005: live-only.
  - DEC-006: no tab switching.
  - DEC-007: include AGY daemons via AGY message files, failing safe.
  - DEC-008: the name is "Background Tasks".
- Behavior-defining supplements: None. Product Design: not requested (N/A).

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/solution-revision-record.md`
- Supplements and evidence:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/probes/agy-daemon-exit-signal-probe.py`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/probe-evidence/p3-agy-daemon-exit-signal.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/probe-evidence/p4-agy-daemon-failure-signal.log`
- Related prior tickets (read-only context):
  - `tickets/done/remove-todo-list-tools` (its REQ-003 is superseded)
  - `tickets/done/claude-sdk-background-task-lifecycle`
  - `tickets/done/claude-sdk-streaming-input-session` (its DEC-006 deferred the background-task UI to this ticket)
  - `tickets/done/agy-background-task-turn-liveness`
- Prior architecture review artifacts: `N/A — not applicable` (first review round)

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel`
- Branch: `codex/remove-web-todo-panel`
- Base: `origin/personal` @ `43b6fc0f4b9b51c611df8895a57f8bb13d646f3e` (fetched 2026-09-29)
- Finalization target: `origin/personal`
- No source code changed yet; only ticket artifacts exist under `tickets/in-progress/remove-web-todo-panel/` (uncommitted).

## Solution Summary

- Removal: the to-do path is removed end to end. It covered:
  - server `AgentRunEventType`/`ServerMessageType`, activity set, mapper, collaboration adapter/projectors, event unions;
  - both contract packages (src + committed dist);
  - Codex `item/plan/delta` mapping and the nonexistent `turn/taskProgressUpdated`;
  - web store/handler/panel/types, the `RightSideTabs` auto-switch, localization keys and docs.
- New event `BACKGROUND_TASK_UPDATED`:
  - Payload: a per-task upsert snapshot `{task_id, kind: shell|subagent|monitor|workflow|other, description, status: running|completed|failed|stopped, summary, started_at}`.
  - It is not turn activity and not persisted. Team/org DTOs use `withExecution`.
- Claude: `ClaudeBackgroundTaskRegistry` is extended as the single owner of the Claude background-task view.
  - Membership comes from `background_tasks_changed`, `is_backgrounded`, or a `task_updated` patch.
  - The terminal state comes from `task_notification` or a terminal `task_updated`.
  - `clear()` marks running tasks stopped.
  - A change callback feeds a new session event, which the converter maps to the AgentRunEvent.
- Antigravity: a new `AgyBackgroundTaskMonitor` tracks tool steps still open at turn result.
  - While any are running, it polls `<brain>/<conversation>/.system_generated/messages/*.json` every 2 s.
  - It correlates messages by `sourceMetadata.tool.stepIndex` and maps "exited with code N" to completed (0) or failed (non-zero).
  - `stopAll()` runs on interrupt, terminate, close and failure.
  - Reads use an extracted `agy-brain-file.ts`, which the image-path reader also uses. Unknown formats fall back to stopped.
- Web: `agentBackgroundTaskStore` (per run, upsert, newest first) plus `BackgroundTaskPanel` in `components/progress/`.
  - The panel takes the To-Do slot with the same accordion behavior (Activity expanded by default).
  - It shows the counts, the "No background tasks" empty state, and en and zh-CN strings.

## Classification

- `task_size = Large`: about 35 files across the server domain and streaming, the Claude and AGY backends, two contract packages, the web streaming client and UI, localization and docs.
- `architectural_risk = High`:
  - shared stream contract change;
  - new runtime owner reading an undocumented AGY internal file format;
  - events emitted outside turns, which interacts with lifecycle status;
  - new lifecycle obligations in two backends.
- Escalation triggers:
  - SDK 0.3.280 frames contradict DS-002;
  - AGY exit files are missing or uncorrelated;
  - an external `TODO_LIST_UPDATE` consumer is found;
  - the new event turns out to be persisted or to affect status.

## Scenarios, Evidence Uncertainty And Open Risks

- Scenarios: SCN-001..005, all Supported Normal. The SCN-005 AGY evidence comes from probes P3/P4 on AGY CLI 1.2.13.
- Open risks:
  - Raw Claude `task_type` values for subagent/monitor/workflow were not observed; only `local_bash` was. The kind mapping falls back to `other`, and a live capture on SDK 0.3.280 is needed.
  - The AGY message-file format may drift. The design fails safe.
  - Windows AGY paths are untested.
  - The web list starts empty after a reload mid-run (accepted, DEC-005).
- Out-of-scope observation, a candidate separate ticket: AGY withholds its autonomous reaction to a daemon finish from stdout until the next user turn.

## Expected Output From Recipient

An independent architecture review of `design-spec.md` against the approved requirements, with a Pass, Fail or Blocked result per the reviewer's workflow. Findings that change intended behavior return to the Solution Designer as a Requirement Gap.
