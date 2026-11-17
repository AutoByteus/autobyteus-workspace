## Agents are told when the application restarted

- After the application restarts, every agent that was in the middle of a turn, or was waiting for a background task it started, gets one short reminder. It names when and why the application restarted (an update, a restart, or an unexpected stop such as a crash), with the time as date and UTC, for example "2026-11-17 12:10 UTC".
- After an update or a restart, the reminder says the agent's background tasks were stopped, so it can check what it still needs, restart it, or continue.
- After an unexpected stop, the reminder says some background tasks may still be running but are no longer tracked, and the agent can check them itself.
- After an update the agent is woken with the reminder. After a restart or an unexpected stop, the reminder comes with the next message you send it. Each agent gets it once.
- Known issue: in the conversation view, the reminder can show twice after a restart, and the agent's first reply before the restart may be hidden. The agent receives it only once.
