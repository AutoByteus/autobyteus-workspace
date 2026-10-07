# Handoff — Architecture Design Complete — `reactivate-done-task-runs` (SR-002, supersedes SR-001)

- Result: `Architecture Design Complete`
- From: Solution Designer (`/solution_designer`), 2026-10-07
- task_size: `Large`; architectural_risk: `High` → independent architecture review

## Original request and goal
After a Task is marked DONE, its delegated agent/team copy is closed for good. Follow-up rounds then need a new copy that has lost its conversation.

**SR-002 (current):** Task status stays the agent's responsibility; the software never changes it.
1. The agent moves the Task back to TODO/IN_PROGRESS with `create_or_update_task`.
2. The run that assigned the work messages the run ID `delegate_task` returned (for a team, the coordinator).
3. That reactivates exactly that worker: it is restored with its conversation, the message is delivered and its rows reappear.

A message while the Task is still DONE is refused with a hint to reopen the Task first. A later DONE closes the worker again.

## Approval basis
Requirements SR-002 were approved by the user on 2026-10-07 ("…no automatic status change because if you silently change the status, the agent is not aware of it and this stays intransparent for the user. I think it's clear now."). This revises the SR-001 approval ("Go ahead…"). Decisions:
- (a) helpers stay closed;
- (b) only the assigner may reactivate;
- (c) no team run ID; `delegate_task` returns `target_kind`;
- DEC-004: the agent reopens the Task explicitly; the worker returns on the message (not on the status change).

## Workspace
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs`
- Branch: `codex/reactivate-done-task-runs`
- Base: `origin/personal` @ `cfeda548bfb1838fd21961b09f13733f2a95e139`
- Finalization target: `origin/personal`

## Artifacts (absolute paths)
- Requirements (Approved): `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/investigation-notes.md`
- Design spec (Ready): `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/solution-revision-record.md`
- Supplements: None. Prior review artifacts: ARCH-REV-001 (SR-001, `Fail`, AR-001) in `design-review-report.md` / `architecture-review-revision-record.md` (factual correction 2026-10-07, AR-004).

## Design summary
- **One sequencing owner:** a new `RootTaskExecutionLifecycle.deliverToExactTarget`, used by the three root facades' `deliverExactAgentMessage`.
- **Task side via `TaskAgentResourcePort`:** `assertReopenable` / `reopenAssignment`. Serialized per Task with DONE. The Task must not be DONE. Only the entry's `closedAt` is cleared; status is never written.
- **Runtime:**
  - a new adapter/backend operation discards the released (fenced/terminated) authority after awaiting the idempotent exact release;
  - the existing restore path is then reused.
- **New event** `task_executions_reopened` / `TASK_EXECUTIONS_REOPENED`, mirroring the closed event, in the server, both stream-contract packages and three web consumers.
- **Tool results:** `delegate_task` gains `target_kind`; the `send_message_to` schema is unchanged (its message notes the reactivation).
- **Agent-facing texts** no longer call DONE final.
- **Persisted data:** Directly Usable — No Migration.

## Points worth review attention
1. Discard-on-reopen versus changing the DONE release path (Backward-Compatibility Rejection Log).
2. The per-host-kind discard (root agent, root team, team-hosted agent/team, Org): investigation finding 2 and the escalation trigger.
3. Failure semantics: refusals before the commit change nothing (including the message while DONE); a restore failure after the commit leaves the assignment open (accepted risk).
4. Concurrency: the queue `reopen` command; per-Task serialization with DONE.

## Open risks
- See design-spec "Risks".
- Follow-up outside this repository: the agent repository's `project-task-management` skill text about DONE.

## Related
`project-manager-ux` is on hold until this ticket is delivered.

## Routing record
- 2026-10-07: the SR-001 review was asked to stop (user change). This SR-002 package supersedes it.
`get_handoff_rules` (2026-10-07): the Large/High rule → `/architecture_reviewer`.
