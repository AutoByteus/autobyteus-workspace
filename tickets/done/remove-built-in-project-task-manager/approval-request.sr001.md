# Approval Request — SR-001 (remove-built-in-project-task-manager)

- Status: `Ready for Approval` (holding for the user's decision; no downstream handoff yet)
- Original request: Remove the built-in "Project Task Manager" (`autobyteus-project-task-manager`) from the AutoByteus server. Keep the Projects feature and its tools unchanged. Follow DESIGN.md/TESTING.md, including what happens to copies already installed in users' app data.
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager`, branch `codex/remove-built-in-project-task-manager`, base `origin/personal` @ `1aa918298`, finalization target `origin/personal`
- Canonical artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager/tickets/in-progress/remove-built-in-project-task-manager/requirements-doc.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager/tickets/in-progress/remove-built-in-project-task-manager/investigation-notes.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager/tickets/in-progress/remove-built-in-project-task-manager/solution-revision-record.md`

## Key findings

1. The two agents have different IDs (`autobyteus-project-task-manager` built-in vs `project-task-manager` from the agent repository), so both are listed.
2. Removing only the registration and template is not enough. Upgraded installs keep the folder `<appData>/agents/autobyteus-project-task-manager/`, and it would still be listed as an ordinary agent named "Project Task Manager". The duplicate would remain.
3. The built-in shipped only in beta releases v1.4.95-beta.1 to beta.3 (added 2026-10-05). Only beta and development installs have the copy.
4. Project rules (Data Migration Guideline) allow deleting such data only with explicit user approval of the feature removal. The cleanup must never block startup. The precedent is the approved removal of external messaging data.

## Planned outcome (REQ-001..008)

- The server stops shipping and installing the built-in.
- On the first start of the new version, the old installed copy is removed once (no backup). If removal fails, the app still starts and the next start retries.
- Nothing else changes: history, Projects/Tasks, settings, other agents and the agent-repository agent are untouched. The Project tools work exactly as before (`list_projects`, `list_project_tasks`, `create_or_update_project`, `create_or_update_task`, `delegate_task`, `send_message_to`, `list_available_agents`).
- The remaining built-ins (Daily Assistant, Retrospective Skill Improver) are unchanged. The web's list of built-in IDs is updated to match the server's.
- Docs and tests that assume a shipped manager are updated.

## Decisions needed from the user

- **DEC-001: already-installed copies.**
  - **A (recommended):** delete `<appData>/agents/autobyteus-project-task-manager/` once on first start, with no backup. Its files were overwritten from the template on every start, so it holds no user edits.
  - **B:** leave it in place. The duplicate stays until the user deletes it by hand.
- **DEC-002: consequences.** Old conversations with the built-in stay in history and remain readable, but they can't be continued. A Team or Org the user built that includes the built-in won't start until that member is replaced. This is what happens today when any agent is deleted. They will not be switched over to the repository agent automatically: the two agents differ, and project rules forbid guessing identity.
- **ASM-001:** confirm that the agent repository is configured wherever the user wants a Project Task Manager. Otherwise none will be listed after the removal.

## Next action

The user approves the requirements, or asks for changes, and chooses DEC-001 A or B. Architecture design starts only after that approval.
