# Release Notes — Mixed Team Manager Simplification

## Improvements

- Simplified server team execution so all team compositions — all-AutoByteus, all-Codex, all-Claude, mixed-runtime, and nested teams — run through the retained `MixedTeamManager` boundary.
- Kept runtime-specific behavior below the team boundary by creating/restoring each leaf member as an `AgentRun` through `AgentRunManager` using that member's configured runtime kind.
- Promoted server-owned AutoByteus member team context so AutoByteus team members receive the same team instructions, teammate roster, communication guidance, and task-delegation guidance as Codex and Claude members.
- Replaced the old task acceptance path with the explicit `delegate_tasks`, `submit_task_result`, and `review_task_result` protocol so delegated work is submitted, reviewed, accepted, or revised through a clearer lifecycle.
- Improved task-delegation event identity with explicit submission/review fields, making task-agent result routing and audit trails easier to follow.

## Fixes

- Restored high-trust Codex team-member behavior for command, MCP, permission, and external-worktree Git/write operations so team members can auto-approve/grant the operations allowed by their runtime configuration.
- Fixed standalone Codex run-history summary/title updates so a follow-up user message no longer overwrites the initial user-message title in the GraphQL history row or persisted index summary.
- Preserved mixed team communication, tool approval, interrupt, restore, file-change projection, and task-agent lifecycle behavior under the single mixed team path.

## Cleanup

- Removed specialized server team backend families for AutoByteus, Codex, and Claude from active server team execution.
- Removed active model-facing references to the old `accept_task` / `mark_task_completed` / `mark_task_failed` task lifecycle vocabulary.
- Updated long-lived server docs to describe `MixedTeamManager` as the single active server team manager and to remove obsolete native/specialized team-manager assumptions.
