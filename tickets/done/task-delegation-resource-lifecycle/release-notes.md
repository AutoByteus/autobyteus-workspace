# Release Notes — Delegated agents: spawn, idle shutdown and wake-on-message

## Changed

- **`delegate_task` now just starts a helper.** It starts a fresh delegated agent (or team) with your work description and returns its run ID. Parent and child then talk with ordinary `send_message_to` messages in both directions. There is no task status, "submit result" or "review result" step any more.
- **Quiet delegated agents are shut down automatically.** A delegated agent or team that stays quiet for the grace period (default 10 minutes) is shut down to free resources. It stays in the members tree with the normal **Offline** status. An agent waiting for your tool approval is never shut down.
- **Messaging a shut-down agent wakes it.** A message to its run ID from the same team or org, or a message you type in its composer, restores it with its full conversation before delivering. Follow-ups work at any time, including after a restart.
- **Cleaner workspace.** The Team tab shows **Messages** only. Delegated agents appear in the members tree under their own name, with a **"Started by …"** line naming the agent that started them. The "Task:" labels, the Tasks section and task status badges are gone.

## New setting

- **`AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS`** (Settings → server settings): how long, in milliseconds, a delegated agent may stay quiet before it is shut down. Range: 60000 (1 minute) to 86400000 (24 hours). Default: 600000 (10 minutes).

## Upgrade notes

- **No data migration and nothing rewritten at startup.** Existing team and org runs open as before. Their old task-records files stay on disk but are no longer read.
- **Delegated agents from before this version show no "Started by" line**, because that information was never recorded for them.
- **Old conversations still show their history**, including earlier task notifications and submit/review tool calls.

## Known limitations

- A shut-down delegated agent looks the same (**Offline**) as a team member that has not started yet.
- Waking a delegated agent briefly delays other messages in the same team or org while its conversation is restored. The delay is typically milliseconds, and up to about 1 s for Codex agents. No message is lost.
