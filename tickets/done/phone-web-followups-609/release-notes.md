## A stopped tool call reads "Stopped", and links in chat open the run's own files

- **A tool call you stopped now says "Stopped".** When you stop a run in the middle of a tool call, the call shows "Stopped" with a stop icon, in the conversation, in the Activity panel and on the phone, while the run is open and after you reopen it later. Before, it could read "Failed" or "Unknown". This works for every agent runtime and for runs you stopped in earlier versions.
- **A link in chat can point to a file in the run's folder.** A link such as `[clip](media/clip.mp4)` or `[notes](docs/a.md#intro)` that an agent writes in the conversation opens that file from the agent's own folder, in the desktop app and on the phone: the same viewer as a full path. This holds for single agents, Team members and delegated agents, each in its own folder. A link that points outside the folder, or to a file that is not there, shows the usual message, and nothing outside the folder is read.
- **A stopped run's background tasks end.** On the phone's Activity and the desktop's Background Tasks panel, tasks of a run you stop now end as "Stopped: the run ended", even if the node's own update was lost on the way.
- **Files open right after a node restart.** Opening a file in a run's folder, or its HTML preview, no longer fails in the first moments after the node restarts.
- **The earlier-events page matches the live conversation.** Its tool cards show the same one-line summary and the same "Stopped" status as the live cards.
- The Windows desktop build no longer leaves a staging folder inside the package.

### Good to know

- A stopped call also keeps the error text "Tool execution interrupted." in its details, as before; it only reads "Stopped" in its status.
- On the phone, a relative link inside a workspace Markdown file you open from Files still does not open the linked file.
