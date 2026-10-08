# Handoff — Architecture Design Complete

- Result classification: `Architecture Design Complete`
- Package identifier: `project-task-tool-context-files`
- Current solution revision: `SR-003` (requirements SR-002 Approved; design SR-003 Ready)
- From: `/software_engineering_team/solution_designer`
- Date: 2026-10-08

## Original Request

Delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`): let agents attach context files when they create or update a Project Task with `create_or_update_task`, the same way the user can in the app. Files must be copied into the Task (not just referenced), keep strict argument rules and clear errors, return enough to identify attached files without bulk, update the tool description, `docs/modules/projects.md`, `docs/modules/agent_tools_mcp_server.md` and tests. Out of scope: other task-tool return changes (postponed by the user). Done when an agent can create a Task with files and add files to an existing Task, the files show up in the app, and a later `delegate_task` by `task_id` passes them to the worker. This is verified through the agent tool and by the user in the app.

## Approved Scope (SR-002, user approval in conversation 2026-10-08)

- One additive argument `context_files` (absolute local file paths) on the existing `create_or_update_task`, in both create and patch modes. No separate tool. No removal or replacement by agents; users remove files in the app.
- Same file types (by extension) and 25 MiB cap as app uploads; files are copied into the Task's saved context; all-or-nothing on invalid input (no Task created, no text/status change, no DONE closure).
- `context_files` on a Task with no Project is rejected.
- Return adds `attachedContextFiles: [{storedFilename, displayName}]` only when the call attached files. The field name is flagged to the user; the approved content is "the files this call attached".

## Design Summary (SR-003)

Tool contract/manifest → new tool-facing `ProjectTaskService.createTaskWithLocalContextFiles` and extended `updateTaskById` → new `ProjectTaskContextStore.importLocalFiles` (validate all, then copy; draft-less `PreparedTaskContext`) → existing in-lock commit and DONE ordering. Also: policy `contextFileMimeTypeForPath`, error code `TASK_CONTEXT_FILE_UNAVAILABLE`, and docs. GraphQL commands stay unchanged so local paths cannot be supplied remotely.

## Classification

- task_size: `Medium` — about 7 production files in existing owners, plus 2 docs and tests; no new subsystem or persistence shape.
- architectural_risk: `High` — shared agent-tool contract change on every runtime; new path that reads an agent-named local file into app data; refactor of Task create/update internals carrying the validation-before-write and DONE-closure ordering invariants.

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/solution-revision-record.md`
- Supplements: None
- Prior architecture review artifacts: N/A — not applicable (first review)
- Product design artifacts: N/A — not applicable

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files`
- Branch: `codex/project-task-tool-context-files`
- Base: `origin/personal` @ `4a51482a5` (fetched 2026-10-08)
- Finalization target: `origin/personal`
- Task documents are uncommitted in the worktree's ticket folder.

## Open Risks / Notes

- RSK-001: extension-based typing rejects `.ts`, `.yaml`, `.py`, etc. (accepted, app parity).
- RSK-002: server copies any readable agent-named file (same trust level as `delegate_task.reference_files`; accepted).
- The path rule is repeated from `validateTaskReferenceFiles` to keep dependency direction (recorded deferral).
- Follow-up candidate (out of scope): teach the Project Task Manager skill to use `context_files`.

## Route

- Handoff rules applied (2026-10-08): `architectural_risk=High` matches "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/software_engineering_team/architecture_reviewer`.
- Expected next action: independent architecture review of SR-003 against SR-002.
