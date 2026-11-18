## New

- A stopped agent can now continue on another agent runtime. Open the settings of a stopped run, choose another runtime and a model of it, and save. Nothing happens yet: the switch takes effect when you send your next message. The run stays the same run, with the same chat, history entry and workspace. Choosing the original runtime again before sending undoes the change.
- When the switch happens, the chat shows a marker, "Agent runtime changed from … to …". The new agent is told that another agent worked on the run before it and where that agent's work journals are, so it can read them and continue. After a restart or reload the chat still shows the earlier conversation and the marker.

## Notes

- This first version switches a standalone agent run only. Runs of team members, Org members and delegated copies keep their runtime.
- If the switch fails while starting, your message is refused with the reason, the previous agent's records stay as they were, and sending again completes the switch.
- For developers of API clients: the mutation `updateStoppedAgentRunModelConfig` is replaced by `updateStoppedAgentRunSelection`, which requires a `runtimeKind`. Clients of the old mutation stop working.
