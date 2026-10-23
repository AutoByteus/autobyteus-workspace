# Handoff — Architecture Design Complete — task-agent-several-tasks

- Classification: `Architecture Design Complete`; `task_size=Small`, `architectural_risk=High`.
- Package: `task-agent-several-tasks`; Project Task `autobyteus-275`. Requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user.
- Revision `SR-004`; requirements `Approved` at SR-003 by the user (2026-10-23); design `Ready`.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-several-tasks`, branch `codex/task-agent-several-tasks`.
  - Base: `origin/personal@3b09fbe3085c594b75e35baf72c02d0a1f1b4895`.
  - Finalization target: `origin/personal`.
  - Ticket artifacts are in `tickets/in-progress/task-agent-several-tasks/`; they are not committed yet.

## The user's decision

Option B, general:
- the delegator may give the same task agent or team another Task with `delegate_task task_id` + its run id at any time; the delegator alone decides when to add and when to close;
- the copy is freed only when its last open Task is closed (a reference count);
- `send_message_to` is unchanged; there is no queue and no UI change;
- the given Task arrives as today's message, and only the sentence "Your previous Task is closed" changes when that is not true.

## Package

`requirements-doc.md` (SR-003), `investigation-notes.md` (AF-001–AF-009), `design-spec.md` (SR-004), `solution-revision-record.md`. Evidence: `evidence/SD-probe-several-tasks.test.ts.txt` and `-output.txt`, which reproduce AF-001.

## Points for the reviewer

- AF-001 (Reproduced): today's `releasableByHostRoot` never requests a stop after the last of two open Tasks closes. Design: D-RELEASE, "an entry in this Task and no open entry left".
- Removal of the one refusal; all other refusals kept.
- Concurrency of two closures of one copy's Tasks (DS-002 narrative).
- `publishTaskExecutionsReopened` for an already-open copy.
- Prior review artifacts: `N/A — not applicable`.

## Route

`get_handoff_rules`: Large or High → `/software_engineering_team/architecture_reviewer`.

## Round 2 (SR-005), after ARCH-REV-001 Fail

- ARF-001: DS-001 and the example now carry "`; name the Task key in each report.`" when other Tasks are open (REQ-002 unchanged).
- ARF-002: the Removal Plan lists the dead code with grep evidence; `locationOfTask` is kept for D-OPEN; `task-assignment-eligibility.ts` is in the mapping.
- Prior review artifacts: `design-review-report.md`, `architecture-review-revision-record.md` (ARCH-REV-001).
