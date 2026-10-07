# AutoByteus 1.4.96

## What's new

- **Projects is always on.** Projects is now part of every desktop node: there is no Projects switch in Settings any more. The mobile app does not show Projects.
- **Live Projects pages.**
  - The Projects list, Task boards and Task pages update as agents or you work. No Refresh is needed.
  - Each delegated Task shows the agent or team it was handed to, with its live status. Click it to open that worker's conversation.
- **Projects tab beside the chat.**
  - In any Agent, Team or Org conversation, the first right-panel tab shows a live Task board for the Project you pick, or for Temp tasks.
  - Open a Task there and come back, or jump to the full Projects page.
- **Temp tasks.** Work an agent delegated without a Project gets its own read-only board, with an "N open" count on the Projects page.
- **Continue with the same worker after DONE.**
  - After an agent moves a finished Task back to TODO or IN_PROGRESS, messaging the worker's run ID brings that agent or team back with its earlier conversation.
  - Its row returns to the Workspaces tree. The app never changes a Task's status by itself.
- **New chats are kept as Drafts.** A New chat you started typing stays under Chat as a Draft row until you send or discard it. Drafts are kept for the current session.
- **Grok Build compaction is visible.**
  - Automatic and manual (`/compact`) compactions show as one activity each.
  - Reopened history starts after the latest compaction.

## Fixes and improvements

- Task cards stay compact: long Task descriptions show two lines plus up to two lines of context, and the full text is on the Task page.
- Clicking a delegated worker's row in the left panel always opens its conversation, from any page.
- `delegate_task` results now say whether the new copy is an `agent` or a `team`.
- Token statistics labels follow the app font-size setting.

## Upgrade notes

- No data migration is needed.
- A previously saved `ENABLE_PROJECTS` setting is ignored. It now appears as an ordinary custom setting that you can delete.
- Agent packages whose instructions say a DONE Task is final should be updated to describe reopening the Task and then messaging the worker. One example is the agent repository's `project-task-management` skill.
