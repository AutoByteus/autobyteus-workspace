## Release notes: agents continue after an update

(For the next beta or stable release that includes this change. User-facing; keep it with the release's other notes. No user action is needed, so there is no "What you need to do" section.)

### Agents that were working continue after an update

- When AutoByteus restarts for an update, agents that were in the middle of a task continue by themselves after the restart. You no longer need to message each one. This covers "Install update and restart" on the desktop and the in-place update and image upgrade of a Docker node.
- Each of these agents gets one note in its chat: the application restarted after an update, its previous turn was interrupted, and commands that were running may not have finished, so it should check before repeating them. An agent that had delegated work is also told which of its delegated agents were resumed.
- Only agents that were busy at the update continue. Idle agents, agents you stopped or archived, and agents of a closed task are left alone. If you message an agent before its note arrives, it continues with your message instead.
- A normal quit and relaunch, "Restart server", or stopping and starting a Docker node does not resume anything.
- Continuing an agent starts a new turn with its model, as if you had asked it to continue. At most three agents resume at the same time.
- This starts with your next update after installing this version. The update that installs this version still stops busy agents as before, because the version being replaced does not yet note which agents were working.

### Rolling back

- No data migration. The update writes one small file listing the busy agents and removes it at the next start. Earlier versions ignore it.
