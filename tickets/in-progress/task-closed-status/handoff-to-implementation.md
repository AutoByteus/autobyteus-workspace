# Handoff — Architecture Design Complete (`task-closed-status`)

- Result classification: `Architecture Design Complete`
- From: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-10-08
- Current solution revision: `SR-004`
- Classification: `task_size=Medium`, `architectural_risk=Low` (rationale in `design-spec.md` › Task Size And Architectural Risk)
- Route: Medium/Low → direct implementation (`/software_engineering_team/implementation_engineer`), from the configured handoff rules. Direct means skipping independent architecture review, not skipping design. Implementation self-checks, code review and API/E2E validation still apply per the rules.

## Original Request

User, 2026-10-08, via `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`): "Currently the task status has to do, in progress and done. But sometimes when I plan a task, I find that this task is not needed … I want to close it directly … I think this is normal in task management."

## Approved Intent (summary; the requirements doc is authoritative)

- New terminal status **`CLOSED`** ("Closed" / "已关闭"), meaning dropped as not needed, not completed, for Project and Temp Tasks.
- **Agents are the only status writers** (user, SR-002). Closing and reopening happen only through `create_or_update_task`. The app stays display-only: no Close/Reopen button and no GraphQL status write.
- CLOSED stops and removes workers **exactly like DONE**, and refuses `delegate_task {task_id}` and worker reactivation like DONE. Reopen to TODO/IN_PROGRESS works as after DONE.
- `list_project_tasks` filters by CLOSED. Tool, LLM-contract and refusal texts explain CLOSED.
- **Clean board** (user, SR-003): To Do / In Progress / Done as today. Closed Tasks are hidden by default. A small **"Closed (N)"** toggle beside Refresh (absent when N=0) shows a full-width Closed lane under the lanes. The same applies to the right-panel board and the Temp tasks board. Pills and labels read "Closed", distinct from Done.
- Open counts exclude CLOSED. Existing data keeps working with no migration.

## Approval Basis

- `requirements-doc.md` status `Approved`. User approval 2026-10-08 (quote recorded in requirements Document Status and SR-003).
- No behavior-defining supplements. No Product Design involvement (N/A — not requested).

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status`
- Branch: `codex/task-closed-status`
- Base: `origin/personal` @ `3a2496c95b16b0f7e0cedc7afdf615ada00b2267` (fetched 2026-10-08)
- Finalization target: `origin/personal`
- Solution artifacts are uncommitted in `tickets/in-progress/task-closed-status/`.

## Artifacts (absolute paths)

| Artifact | Path |
| --- | --- |
| Requirements (Approved) | `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/requirements-doc.md` |
| Investigation notes | `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/investigation-notes.md` |
| Design spec (Ready) | `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/design-spec.md` |
| Solution revision record | `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/solution-revision-record.md` |
| Architecture review report | N/A — not applicable (Medium/Low direct route) |
| Supplements / Product Design | N/A — not applicable |

## Key Design Points For Implementation

1. Server `projects/domain/task-status.ts` owns the 4-value tuple, `validateTaskStatus` and `isTerminalTaskStatus`. Stores, service, project-service, change messages and the tool contract use it; the duplicated sets and `=== "DONE"` checks are removed.
2. `ProjectTaskService`: a terminal status → `closeAndWrite` (unchanged mechanics). Assignment and reactivation are refused for terminal Tasks, with messages naming the actual status.
3. **Repoint the released `projects-per-folder-v1` migration** to a frozen copy of `readTaskFile` (in `released-project-folder-v1.ts`) **before** widening the current reader (Data Migration Guideline §3/§4).
4. Add `CLOSED` to the GraphQL enum only; no status input.
5. Wording updates in the tool descriptions, the LLM collaboration contract and the runtime refusal texts (exact intent in design › Concrete Examples).
6. Web `utils/projects/taskStatusPresentation.ts` (renamed from `taskStatusLabelKey.ts`, no shim) owns labels, pill classes, temp lanes and the open predicate. New `ClosedTasksToggle.vue`. Both boards get the hidden-by-default full-width Closed lane. en/zh-CN strings. Update the generated enum.
7. Tests, desktop verification steps and the docs list are in design › Guidance For Implementation.

## Open Risks

- R-001: "closed" also names agent-run closure; mitigated by definitions in the tool text and docs.
- R-002: the external Project Task Manager skill (separate `autobyteus-agents` repo) doesn't know CLOSED; follow-up candidate, out of scope.
- LLM-contract string tests may need updated expected text.

## Escalation

Return a `Design Impact` to Solution Designer if any of the triggers in design-spec › Task Size And Architectural Risk occur. Return a `Requirement Gap` for anything that changes the approved intended behavior.

## Expected Output

Implementation per the design, implementation-scoped checks, and `implementation-handoff.md`, routed per the handoff rules.

## Applied Handoff Route

- Rules consulted 2026-10-08 via `get_handoff_rules`. Matching rule: "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer`.
