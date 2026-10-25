# Handoff — Architecture Design Complete — task-comments

- Classification: `Architecture Design Complete`; `task_size=Medium`, `architectural_risk=High`.
- Package: `task-comments`; Project Task `autobyteus-259` (Part 1 only, comments; Part 2 split into its own Task by the user, 2026-10-22).
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user.
- Revision: `SR-012`. Requirements `Approved` at SR-011 by the user (2026-10-22); design `Ready`.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-comments`, branch `codex/task-comments`.
  - Base: `origin/personal@786055f3d7f1ffe338f614340ffed006c7afbf7a`.
  - Finalization target: `origin/personal`.
  - Ticket artifacts are in `tickets/in-progress/task-comments/`; they are not committed yet.

## What the user decided

- A Project Task has an add-only comment thread under its description (no edit, no delete, no author).
- Stored as `comments: [{id, createdAt, text}]` in `task.json`; `id` is the Task-local number.
- Agents add a comment with `update_task add_comment`, alone or with other fields; the `update_task` result is otherwise unchanged.
- Agents read comments as texts only, oldest first: `list_project_tasks` `comments: [...]` (absent when none), `search_project_tasks` `commentCount` (absent when 0). Exact search covers comment text.
- `update_task` adds `partsNotClosed` (`autobyteus-187`), only when a parent close leaves parts open.
- Delegated work contains the comments after the description.
- No run notification (FU-002), no meaning search of comments (FU-001), no design step (the existing Task-page style), no mixed-version code (DESIGN.md rule 9).

## Package

- Requirements: `requirements-doc.md` (SR-011).
- Investigation notes: `investigation-notes.md` (AF-001–AF-009). The "Part 2 Investigation" section belongs to the split-off Task and is not in scope.
- Design: `design-spec.md` (SR-012).
- Revision record: `solution-revision-record.md`.
- Follow-ups: `follow-ups.md` (FU-001, FU-002).
- Prior review artifacts: `N/A — not applicable`.

## Points for the reviewer

- The comment write goes through the shared `update()` body under the existing per-Task lock. A combined status + comment call is atomic.
- New GraphQL mutation `addProjectTaskComment`, because `UpdateProjectTaskInput.description` is required (AF-003).
- The port's `resolveAssignment` gains `comments` for the work text (AF-008).
- The board's exact search now matches comments too (AF-007).
- `project-task-service.ts` is at 481 lines; the comment rules go to `domain/task-comments.ts`.

## Route applied

`get_handoff_rules`: Large or High → `/software_engineering_team/architecture_reviewer`.

## Round 2 (SR-013), after ARCH-REV-001 Fail

- ARF-001 resolved, editorial only (no intended-behavior change):
  - AC-001: `add_comment`; the result is unchanged.
  - AC-010 and DEC-012: comment texts as bullets, no IDs or times. The design's work-text example and DS-003 were aligned; the `1.`/`2.` numbering was not intended.
  - External Contracts and Architecture Phase Input rewritten; AC-012 no longer refers to a spec; ASM-001 accepted; SCN-001's trigger fixed.
  - Data Continuity names the rollback consequence (an older build drops comments when it rewrites a Task).
- ARF-002 resolved:
  - DEC-025 records the board's search matching comment text.
  - It is the Solution Designer's decision (consistency across surfaces sharing one server rule). The user was informed on 2026-10-22, in the message after the design, and did not object.
  - Out Of Scope wording, BEH-004, REQ-008, UC-004, SCN-009 and AC-016 (new) updated.
- Classification unchanged: Medium / High.
- Prior review artifacts: `design-review-report.md`, `architecture-review-revision-record.md` (ARCH-REV-001, on SR-011 / SR-012).
