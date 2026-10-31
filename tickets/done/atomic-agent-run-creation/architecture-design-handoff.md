# Architecture Design Complete — atomic-agent-run-creation (autobyteus-349), SR-003

From `/solution_designer`, 2026-10-31. Task `autobyteus-349` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`),
requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`); brief: 339's FU-004
and FU-003.

## Result
- `Architecture Design Complete`. **task_size = Small, architectural_risk = High** (persisted user data deleted at
  startup).
- Requirements Approved by the user (SR-002). User approval of the design: Obtained.

## The key fact
A read-only count of the user's real data found 17 records marked never-started (`preparedAt`, no `startedAt`):
- 6 are truly empty;
- **11 are real May conversations**, written before the start date existed.

So the existing 24 h rule (`cleanupStalePreparedRuns`), which judges by that mark alone, would have deleted real
conversations. The user approved removing only runs with **no content at all**.

## Design
- **D1:** `createAgentRun` cancels its prepared run on an activation error (logging a refusal), then rethrows.
- **D2:** `removeEmptyNeverStartedRuns` (record readable, never started, **no file besides `run_metadata.json`**)
  replaces `cleanupStalePreparedRuns`. It runs as one startup stage after `buildStudioServer` and before `listen`;
  it never fails startup and never deletes unreadable data.

## Review focus
1. Is the content check sufficient: does any run content live outside the run folder?
2. The startup stage's placement and its failure handling.
3. D1's behavior when activation fails after `startedAt` was committed (cancel refuses, by design).

## Constraints
- Tests on temporary data roots only; never the user's data. No release unless asked.

## Workspace and artifacts
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/atomic-agent-run-creation`, branch
  `codex/atomic-agent-run-creation`, base `origin/personal` @ `e87e6bb2b1`.
- Ticket folder `tickets/in-progress/atomic-agent-run-creation/`: `requirements-doc.md`, `investigation-notes.md`,
  `design-spec.md`, `solution-revision-record.md`, `follow-ups.md`.

## Route
The handoff rule for architectural_risk High → `/software_engineering_team/architecture_reviewer`, 2026-10-31.
