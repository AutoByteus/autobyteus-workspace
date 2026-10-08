# Handoff — Architecture Design Complete

- Package identifier: `idle-shutdown-background-tasks`
- Result: `Architecture Design Complete`
- Current solution revision: `SR-002`
- Date: 2026-10-08
- From: `/software_engineering_team/solution_designer`

## Original Request

Project Task from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-10-08: "Idle shutdown of delegated agents kills their running background tasks, so the work stalls silently." Done when: root cause confirmed; a delegated agent's background task is no longer killed silently (approved behavior); covered by tests including a reproduction of the 10-minute case with a shortened grace period; verified by the user. Source report: `problem-report.md` (copy of `/Users/normy/autobyteus_org/agpl-dual-licensing-reports/idle-shutdown-kills-background-tasks.md`).

## Goal And Approved Behavior

- Root cause (confirmed): the idle-shutdown quiet check (`AgentRunTermination.tryPrepareIfQuiescent`) ignores running runtime background tasks; after the 10 min grace the delegated run is terminated and the CLI's background task is killed (Claude; AGY has the same gap).
- Approved (user, 2026-10-08, "yes. i think we should remove it. lets go"): **remove idle shutdown of delegated copies entirely.** Copies stay live until Task DONE, root stop/fail-stop or server stop. Restore on message (after restart, after reactivation) is unchanged. The `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS` setting is removed.
- Out of scope: notifying an agent that a run end stopped its background tasks (deferred, separate-ticket candidate); any replacement timeout/cap.

## Artifacts (absolute paths)

Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/`
- `requirements-doc.md` — Approved, SR-002
- `investigation-notes.md` — evidence incl. "Is Idle Shutdown Still Needed?" and AF-01..AF-18
- `design-spec.md` — Ready
- `solution-revision-record.md` — SR-001, SR-002
- `problem-report.md` — evidence only
- Product/UI artifacts: N/A — not applicable
- Prior review artifacts: N/A — not applicable (first review)

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks`, branch `codex/idle-shutdown-background-tasks`
- Base: `origin/personal` @ `3a2496c95`; finalization target `origin/personal`
- Ticket documents are not yet committed.

## Classification

- task_size: `Medium` — removal-dominated, ~25 source files, ~15 tests, ~8 docs; no new owner/API/persistence
- architectural_risk: `High` — removes a lifecycle/concurrency authority (idle shutdown, quiet-termination chain, lease counting, Org teardown-event suppression) across Team, Org and standalone roots; LLM-facing contract text changes; operational resource behavior changes
- Escalation trigger: a non-idle caller of any removal item, or a supported path that needs a copy to become non-live other than DONE/root stop/fail-stop/server stop

## Open Risks

- R-1 tests/fixtures that used idle shutdown to produce non-live copies need rework.
- R-3 open Tasks keep runtime processes until DONE/root stop (accepted by user).

## Route

`get_handoff_rules` (2026-10-08): architectural_risk=High matches the rule for `/software_engineering_team/architecture_reviewer`. Sent there.

## Next Expected Action

Architecture review of the SR-002 package.
