# Release Notes — Finished Task runs leave the Workspaces tree

## Changed

- **Finished Task runs disappear from the Workspaces tree.** When a Project Task is marked DONE, every Agent and Team run delegated for it leaves the tree, together with their members and nested delegations. This works under Agent, Agent Team and Agent Org runs, live and without a reload.
- **A short, quiet exit.** Leaving rows fade and collapse while the remaining rows move up. With reduced motion turned on, they are removed at once.
- **They stay gone.** Closed runs remain hidden after a reload, an app restart, or deleting the Task. They are also hidden when the run was not open at the time the Task was finished.
- **Nothing is lost.** Conversations, run records and workspace files are kept. Messages with those runs stay in the Team tab. Reopening a Task and delegating again shows the new runs.
- If you were viewing a run that closes, the view returns to the main run, and keyboard focus follows.

## Known limitations

- In a Team, the members panel, running list and token usage still list closed members.
