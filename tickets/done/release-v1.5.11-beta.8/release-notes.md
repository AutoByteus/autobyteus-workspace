## What's new in this beta

### Continue a stopped agent on another agent runtime

- Open the settings of a stopped agent run, choose another runtime and one of its models, and save. The switch takes effect when you send your next message. The run stays the same run, with the same chat, history entry and workspace. Choosing the original runtime again before sending undoes the change.
- The chat shows a marker, "Agent runtime changed from … to …". The new agent is told where the previous agent's work journals are, so it can continue the work.
- This first version switches standalone agent runs only. Runs of team members, Org members and delegated copies keep their runtime.

### Projects in the left panel

- The run section of the left panel has a **Workspaces | Projects** switch. In Projects mode, each Project lists the runs started for it and every run working on its Tasks. Older runs that worked on a Project's Tasks are included.
- Start a run under a Project with **+** on the Project, or pick the Project in New chat's workspace chip.
- Workspaces mode is unchanged.

### More reliable "Install update and restart"

- The desktop now installs an update even when its server did not stop cleanly, as long as the server process is confirmed gone. Quitting no longer waits on idle browser connections.

### Docker nodes: update in place

- If your Docker nodes run 1.5.11-beta.7 with the current launcher, **Nodes → Manage Nodes** now offers **Update to 1.5.11-beta.8** on each node. One click updates the node inside its container, without pulling a new image. You can also run `autobyteus-docker update --all`.
- An update restarts the node's server, which stops agents that are in the middle of a turn. Update while your nodes are idle.
- Nodes on older images or made by an older launcher: reinstall the launcher, then run `autobyteus-docker upgrade --all` once.

### For developers of API clients

- The GraphQL mutation `updateStoppedAgentRunModelConfig` is replaced by `updateStoppedAgentRunSelection`, which requires a `runtimeKind`. Clients of the old mutation stop working. Update remote nodes together with the desktop.

### Rolling back

- This beta adds no data migration. Projects mode only adds a new file per Project, which earlier versions ignore. A run that was switched to another runtime with this version has not been tested on an earlier version.
