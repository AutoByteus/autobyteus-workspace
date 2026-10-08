# Release Notes — Sending After Stop No Longer Leaves a Run Stuck

Status: prepared before user verification. Whether this ships in a release, and with which version, is decided at finalization.

## Fixed
- After you stop an Antigravity agent mid-turn, the next message is now accepted and answered in the same conversation, also when you send it right away. Before this fix every later message failed with "Agent run '…' still owns retired cleanup.", the run showed Error, and only an app restart helped.
- A standalone agent whose runtime stopped by itself (for example, the Codex app server crashed) now restarts on your next message and keeps its conversation, instead of refusing every message.
- Team members and delegated copies on Antigravity that are stopped and then given new work at once restart and receive it. One failed attempt to shut down the previous session no longer blocks later work.
- If the previous session is still shutting down and cannot finish in time, the chat shows "The agent's previous session was still shutting down, so this message couldn't be delivered. Please send it again." Sending again works once the shutdown completes. The run is no longer blocked permanently.

## Unchanged
- Stop behavior for each runtime (Antigravity still ends its process on Stop; other runtimes cancel the turn).
- Conversation history and the agent's provider context are kept across the restart.

## Notes
- Runs that were already stuck before this update recover after the update: restart the app (or send again) and the run continues with its history.
- While the run restarts, the status briefly shows Offline, then Initializing, before Running.
- Server-side change only. No settings, data migration or reset.
