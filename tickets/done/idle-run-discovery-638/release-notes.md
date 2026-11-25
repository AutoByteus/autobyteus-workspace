## A restart keeps your running agents running

- After an update, **Restart server**, `docker stop` and start, or a crash, the agent runs and teams you started come back running, idle, with their conversations: every one that was running when the node stopped. No message is sent to them and no model is called. Other agents can find them again with `list_running_agents` and message them; before, an idle run stayed unloaded after a restart, so other agents did not see it and started duplicate runs.
- This holds for a graceful restart and for a kill: after a crash the list of running runs is at most 2 seconds old.
- A run you archived or stopped stays that way, and so do runs that other agents delegated to and Organizations: they come back when you open or message them, as before.
- If a run cannot come back (for example its runtime is missing), the server logs its name and the reason, the other runs still come back, and the server starts as usual. That run is not tried again at the next start: open it or message it to bring it back.
- A run that was busy at the restart still gets its restart reminder with its next input, as before.

### Good to know

- A running run of an external runtime (Claude, Antigravity) holds a runtime process of about 270 to 330 MB. A node with many such runs uses that memory after a restart, as it did before the restart. The node brings runs back three at a time.
- If you stop the node while it is still bringing runs back, the runs not yet handled stay on the list for the next start.
