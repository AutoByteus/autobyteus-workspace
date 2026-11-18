## Stop is quiet when there is nothing to stop

- **Pressing Stop twice, or after the agent already finished, no longer shows an error.** A Stop that finds nothing to stop is now accepted quietly for every kind of run: a single agent, a Team member, an Agent Org member, a delegated agent and an agent on a paired node. This works the same on the desktop app and on the phone.
- **The Stop button shows "Stopping…".** After the first press it turns into a spinner and "Stopping…", cannot be pressed again, and goes back to Send (or Stop, if the agent is still running) as soon as the run's status changes.
- **A connection that drops while Stop is waiting is no longer reported as a failed Stop.** The button keeps "Stopping…" until the connection is back and the run's status says what happened.
- **A real failure shows one plain message that names the agent**, for example "Could not stop Solution Designer. Please try again." or "Stop was not sent: not connected to the node. Check the connection and try again." It never shows a run ID or an internal word. Agent Org members and agents on a paired node now show it too; before, a failed Stop showed nothing for them.

### Good to know

- A Stop pressed at the very moment the agent starts its next turn is accepted but does not stop that turn. Press Stop again.
- "Stopping…" has no timer: while the node cannot be reached it stays until the connection returns.
