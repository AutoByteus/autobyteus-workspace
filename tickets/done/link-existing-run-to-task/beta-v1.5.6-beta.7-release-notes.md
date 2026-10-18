> **Beta.** Offered only to desktop installs with **Settings > Updates > Receive beta updates** turned on.

## What's New
- **Find Project Tasks by meaning.** The board's search now finds Tasks by what they are about, not only by the exact words. Exact matches still come first. Agents can do the same with the new `search_project_tasks` tool, which the Project Task Manager uses.
- On first use, the server downloads a small local model (about 55 MB) and indexes existing Tasks in the background; the board shows the progress. Everything runs locally on the CPU. If the model can't be downloaded, exact search keeps working and the board says why, with a retry.

## Changes
- **Withdrawn: giving a Task to a run you started yourself** (from v1.5.6-beta.5). The Project Task Manager again gives Tasks only to task agents it started itself, or to a new task agent. If it is asked to give a Task to a run you started by hand, it refuses with the reason and changes nothing. No run was ever adopted, so no data needs converting.
- Kept from that beta: an archived or deleted run leaves the sidebar right away, also when it was removed from another window; and a team that worked before being delegated no longer stops its Project Manager because of its earlier usage records.

## Fixes
- **Claude agents: replies after background tasks no longer disappear.** When a Claude Agent SDK agent finished a background task and kept working on its own, its replies could be lost and the chat filled with "An Error Occurred" cards while the status showed Idle. The text now appears and is saved, and the status shows Running while it works.
- **Fewer error cards for output that can't be shown:** one short notice per turn instead of one error card per event.
