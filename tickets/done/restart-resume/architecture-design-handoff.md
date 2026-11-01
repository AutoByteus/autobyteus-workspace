# Architecture Design Complete — restart-resume (autobyteus-285), SR-003

From `/solution_designer`, 2026-11-01. Task `autobyteus-285` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`),
requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).

## Result
- `Architecture Design Complete`. **task_size = Large, architectural_risk = High.**
- Requirements Approved by the user (SR-002, DEC-001 = A). User approval of the design: Not required (no product
  behavior beyond his decisions; he is informed).

## Goal
After an update restart, the runs that were busy continue by themselves: standalone, Team, Org and delegated. Each
gets one system notice; stopped-on-purpose, archived, Task-closed and idle runs are never resumed. Other restarts
resume nothing.

## Design
- D1: release-identity stamp.
- D2: record busy runs before `app.close()`.
- D3: resume after listen.
- D4: system notice.

Details are in `design-spec.md`.

## Review focus
1. The update test from a build stamp, rather than a launcher signal: is it correct for the desktop install, the
   Docker in-place update, an image upgrade and dev builds?
2. Recording in the cleanup before `app.close()`: within 284's bound, before any interrupt?
3. `rootOf` through `hasAgentExecution` for every root kind, including nested Teams in Orgs and delegated copies.
4. Waking through `root.executeAgentCommand(post_message)` for each kind, and the fences it keeps (Task-closed copies).
5. Once-only (delete before resume), concurrency 3, and the live check plus dedupe against a user message that comes
   first.
6. The shared `resolveOrRestoreRoot` refactor of `remote-collaboration-composition.ts:51-53`.

## Constraints
- Separate test data only.
- Real-app proof: two builds that differ only in their stamp, on one isolated data root.
- No release; Codex uses `gpt-6.1-terra`.

## Workspace and artifacts
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-resume`, branch `codex/restart-resume`, base
  `origin/personal` @ `efd28d5c4a`.
- Ticket folder `tickets/in-progress/restart-resume/`: `requirements-doc.md`, `investigation-notes.md`,
  `design-spec.md`, `solution-revision-record.md`, `follow-ups.md`.

## Route
The handoff rule for Large / High → `/software_engineering_team/architecture_reviewer`, 2026-11-01.
