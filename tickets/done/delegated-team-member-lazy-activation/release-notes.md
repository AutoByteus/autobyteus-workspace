# Release Notes — Delegated Teams Start Only the Members That Get Work

Status: prepared before user verification. Whether this ships in a release, and with which version, is decided at finalization.

## Changed
- When an agent delegates work to a Team (for example, the Project Task Manager hands a Task to a Team), only the Team's coordinator starts. The other members stay gray "Offline" and use no runtime or provider session until work reaches them. Before this change every member of the copy started at once and showed as active, even if it never got any work.
- A member starts when a teammate message, a handoff or your own message reaches it, then works as before.

## Fixed
- If a Team member cannot start when work reaches it (for example, its model is unavailable), the sender now gets a clear "could not start" result naming the cause, instead of an internal error. The member shows Error, and its conversation shows one error card. This applies to Teams and Orgs you start yourself, too.
- If the coordinator of a delegated Team cannot start, the delegation itself fails, as before.

## Unchanged
- Teams you start from the app, messages to a Team, and delegating a single agent behave as before.
- Idle shutdown, restore after restart, and marking a Task done and reopening it work as before. A restored copy also starts only the members that get work.

## Notes
- Team copies delegated before this update keep their already-started members until those copies go idle and shut down as usual. After that they behave like new copies. No reset or data migration is needed.
- For integrations: an agent member that fails to start now reports code `AGENT_RUN_ACTIVATION_FAILED`, with the underlying code at the start of the message (for example `AGY_MODEL_UNAVAILABLE: …`).
- Server-side change only.
