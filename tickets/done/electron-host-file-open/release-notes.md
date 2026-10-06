# AutoByteus 1.4.95

## What's new

- Unified run settings: start Agents and Teams in New chat, customize member settings in one panel, and reuse a run's settings with “+”. Agent Orgs use a shorter launch page with the same controls.
- `@` now asks your agent to delegate to an Agent or Team. Agents and Teams already in the run are available in the menu too, so your agent can reach an existing instance rather than create an unnecessary copy.
- Delegated copies can be closed by marking their Task done. Finished Task runs leave the Workspaces tree and remain closed after restart, while conversation history and workspace files remain available.
- The separately selectable `create_or_update_project` tool supports Project creation and partial updates. Omitted fields are preserved; explicit workspace lists replace links without deleting workspace folders or Tasks.

## Fixes and improvements

- Clicking a supported local file in the Electron Event Monitor now uses the selected Agent/member workspace even when metadata is incomplete. The same click shows the read-only preview or ordinary file error in the responsive Files drawer or dock; reopening reuses its tab.
- Team, Org member and standalone collaborator file artifacts hydrate with their run state. Active-run file changes use their bound process authority.
- Cleaner delegated rows and smoother removal of finished Task runs in the Workspaces tree.
- AutoByteus-launched Codex clients now effectively disable Codex's competing native-agent collaboration features. AutoByteus collaboration and ordinary Codex tools remain available; running clients are not force-restarted.
- The default built-in agent is named Daily Assistant. Task-authoring text is simpler while existing editor controls remain available.

## Upgrade notes

- Existing Projects storage moves once to per-Project folders on first start. The original file is retained as `projects.pre-folders.json`; while migration is pending, Projects asks you to restart the app to finish.

- **Task-tool callers:** updating an existing Task with `create_or_update_task` now takes `task_id` without `project_id`; sending both is rejected. Update external agent packages that use the old call shape.
- The built-in Project Task Manager has been removed. Use the Project Task Manager from the agent repository by configuring that repository as an agent package root. On startup, the old built-in `agents/autobyteus-project-task-manager/` app-data folder is deleted without a backup. Other agents, Projects, Tasks and histories are retained; past conversations with the removed agent stay readable but cannot be continued.
- The Electron preview fix adds no edit/save access and does not broaden remote/browser/mobile file access.

## Known limitation

Closed Team members may still appear in the members panel, running list and token-usage display even though their finished Task runs are hidden from the Workspaces tree.
