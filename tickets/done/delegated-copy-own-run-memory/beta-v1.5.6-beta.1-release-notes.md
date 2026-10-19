> **Beta.** Offered only to desktop installs with **Settings > Updates > Receive beta updates** turned on.

## Improvements
- **Each task agent keeps its own memory.** An agent or team that another agent delegates work to (a task agent) is now a run of its own, with its own folder, conversation, files and message log. The run that delegated it keeps only short links. Long-running coordinators stay small, and the Memory page lists an agent task agent under its agent definition's name.
- Deleting a coordinating run from history removes only its own folder; its task agents' memory is kept.
- Messages are stored with the runs they belong to: a message inside one run is stored once in that run's log, and a message between two runs is in both logs.

## Upgrade Notes
- **One-way data upgrade.** At first start, this version moves each existing task agent's memory out of its coordinating run into the task agent's own folder, and gives each task agent its own message log. Conversations, files, settings and history are kept, and the views look the same as before. Nothing is deleted. **An older app version cannot read the upgraded data, so downgrading after this upgrade is not supported.**
- If a step of the upgrade can't finish, the app still starts and works, and the next start continues the upgrade.
- **Memory Sync:** a node that runs this version exports task agents as their own runs. Data imported from a node that is not yet upgraded shows its coordinating runs without their task agents until that node upgrades and syncs again. Nothing is deleted.
