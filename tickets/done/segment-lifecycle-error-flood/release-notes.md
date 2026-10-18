## Fixes

- **Claude agents: replies after background tasks no longer disappear.** When a Claude Agent SDK agent finished a background task and then kept working on its own, its replies in that turn could be lost and the chat filled with "An Error Occurred" cards while the status showed Idle. The agent's text now appears and is saved, and the status shows Running while it works.
- **Fewer error cards for output that can't be shown.** If part of an agent's output in a turn can't be shown, the chat now shows a single short notice for that turn, "Some of the agent's output in this turn could not be shown.", instead of one error card per event.
