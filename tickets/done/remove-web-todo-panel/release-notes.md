# Background Tasks replace the empty To-Do section

## Changes
- **The To-Do section is gone from the Activity tab.** It was always empty, because no runtime could fill it.
- **A Background Tasks section takes its place.** It shows work that keeps running after the agent's turn ends:
  - Claude: shell commands started in the background.
  - Antigravity: daemon commands still running when the turn ends.
- **Each task shows its status.** A task appears as running, then changes to completed, failed or stopped, with the summary or exit code the runtime reports. Finished tasks stay listed for the rest of the live session.
- **The header shows running and total counts**, newest task first. With no tasks it says "No background tasks".
- **Stopping a run marks its running tasks as stopped** instead of leaving them as running.
- The list is live-session only: it is not saved and starts empty after a reload. Nothing switches tabs when a task appears.
