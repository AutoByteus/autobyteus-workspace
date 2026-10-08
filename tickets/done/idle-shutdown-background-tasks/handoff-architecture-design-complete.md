# Handoff — Architecture Design Complete (SR-003)

- Package identifier: `idle-shutdown-background-tasks`
- Result: `Architecture Design Complete` (revised)
- Current solution revision: `SR-003` (supersedes SR-002)
- Date: 2026-10-08
- From: `/software_engineering_team/solution_designer`

## Original Request

Project Task from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-10-08: "Idle shutdown of delegated agents kills their running background tasks, so the work stalls silently." Done when: root cause confirmed; a delegated agent's background task is no longer killed silently (approved behavior); covered by tests including a reproduction of the 10-minute case with a shortened grace period; verified by the user. Source: `problem-report.md`.

## What Changed Since SR-002

After ARCH-REV-001 passed the SR-002 removal and while API/E2E was running, the user measured the server cost (an idle Claude CLI holds about 260–480 MB). The user then **reversed the removal** in favor of a hybrid (approved 2026-10-08: "i think hybrid is better", "lets use hybrid approach"). At the user's request the Solution Designer stopped the API/E2E Engineer first.

The SR-002 basis is superseded: requirements and design (SR-002), ARCH-REV-001, implementation IR-001/IR-002 (commits `28afa0884`, `bf5889d03`), code review CRR-001/002 and the stopped API/E2E round apply only to it.

## Approved Behavior (SR-003)

- A delegated copy (Agent or Team) is **not idle-shut-down while any of its agents has a running background task** reported by its runtime (Claude, Antigravity). There is no time limit.
- All other copies keep the existing 10-minute idle shutdown and the grace setting. Runtimes that report no background tasks (Codex, native, ACP) are treated as having none.
- When the last background task ends, the grace period starts again.
- DONE, root stop and server stop are unchanged.
- The SR-002 removal is fully undone outside `tickets/`.

## Design Summary

- Undo `28afa0884` and `bf5889d03` outside `tickets/`. Keep `ba0437e00` and the Claude live E2E file.
- New required `AgentRunBackend.hasRunningBackgroundTasks()`. Claude answers from `ClaudeBackgroundTaskRegistry` and AGY from `AgyBackgroundTaskMonitor`; the other runtimes return `false`.
- `AgentRunTermination.tryPrepareIfQuiescent` returns `null` while that query is true. Only idle shutdown uses this path, so root stop and DONE are unaffected.
- `RootTaskExecutionLifecycle.onAgentBackgroundTaskEnded(agentRunId)` re-arms the grace timer. The three root kinds call it on a terminal `BACKGROUND_TASK_UPDATED`.
- One LLM-contract sentence and the docs are updated.

## Artifacts (absolute paths)

Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/`
- `requirements-doc.md` — Approved, SR-003
- `investigation-notes.md` — HF-01..HF-08 (hybrid), server-cost measurement, AF-01..AF-18 (idle code map, history)
- `design-spec.md` — Ready, SR-003
- `solution-revision-record.md` — SR-001..SR-003
- `problem-report.md`, `evidence/baseline-before*` — evidence
- Prior review artifacts, all applicable to SR-002 only: `design-review-report.md` and `architecture-review-revision-record.md` (ARCH-REV-001), `implementation-handoff.md` and `implementation-revision-record.md`, `code-review-report.md` and `code-review-revision-record.md`. The stopped API/E2E round's files are `api-e2e-*` and `evidence/api-e2e/`.
- Product/UI: N/A — not applicable

## Workspace

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks`, branch `codex/idle-shutdown-background-tasks`.
- Base: `origin/personal` @ `3a2496c95`. HEAD `bf5889d03` contains the SR-002 implementation, which must be undone.
- Untracked API/E2E files from the stopped round must not be committed by implementation.
- Finalization target: `origin/personal`.

## Classification

- task_size: `Medium`
- architectural_risk: `High`. The change touches the shared backend contract and the idle quiet predicate for every runtime and root kind, changes LLM-facing text and includes a large revert.

## Open Risks

- A never-ending AGY daemon or a missed terminal frame keeps a copy live until DONE, root stop or server stop. This is accepted under DEC-005.
- Revert conflict in `mixed-team-run-backend.integration.test.ts`: keep `ba0437e00`.

## Route

`get_handoff_rules` (2026-10-08): architectural_risk=High → `/software_engineering_team/architecture_reviewer`.

## Next Expected Action

Architecture review of SR-003. On Pass, implementation (undo + hybrid), then code review and API/E2E restart.
