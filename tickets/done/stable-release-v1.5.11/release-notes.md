## What you need to do
- **Update the desktop app and every remote or Docker node it connects to together.** Some of the names the app and a node use to talk to each other changed in this release (for example for switching a stopped agent's runtime). An older app with a newer node, or the other way round, does not work.
- **Docker nodes: reinstall the launcher once, then upgrade.** Nodes made from images before this release cannot use the new in-place updates and show "Not reachable." under their server line. Run:

  ```bash
  curl -fsSL https://raw.githubusercontent.com/AutoByteus/autobyteus-workspace/personal/scripts/public/docker/autobyteus-docker.sh | bash -s -- install
  autobyteus-docker upgrade --all
  ```

  This moves your nodes to the 1.5.11 image and keeps all your volumes and data. From then on, nodes can be updated in place.
- **The update from 1.5.10 still stops busy agents.** Agents that are in the middle of a task when you install this update stop, as before: message them to continue. From your next update after this one, busy agents continue by themselves.
- **If you connected GitHub in a 1.5.11 beta:** GitHub is now set up on the **Integrations** page. Your token is kept: import `https://github.com/AutoByteus/autobyteus-integrations` there, and its GitHub card shows as connected. Then give the `github-integration` skill to the agents that should use GitHub; the agent ticks from the old card in Server Settings no longer apply.

## Before You Update
- **Coming from a version before 1.5.9? Read the 1.5.9 notes first.** Updating converts your data once, so back up first: quit AutoByteus and copy `~/.autobyteus/server-data` (on a Docker node, the server's data volume). Going back to a version before 1.5.9 afterwards is still not supported; if you need to, open an issue at https://github.com/AutoByteus/autobyteus-workspace/issues and we will help.
- **What the first start of 1.5.11 changes in your data:**
  - Runs that an older version compacted stored their agent runtime under an older spelling. The first start converts those entries once. Nothing you see changes.
  - Empty agent runs that never started (prepared, never sent a message, with nothing in their folder but their own record) are removed at each start, and each removal is written to the server log. Runs with any content are always kept, including older runs that have a conversation but no start date.
  - The Work Journals are rewritten once in the background with the new wording, and memory search refreshes its index after that. This is one-time and takes a few minutes, or up to about half an hour on a node with many runs.
- **Rolling back to 1.5.10 is possible.** The removed empty runs are not restored. The runtime-name conversion needs no undo: 1.5.10 reads the converted entries. A run that was switched to another agent runtime in 1.5.11 has not been tested on 1.5.10. A GitHub token stored in 1.5.11 simply stays unused. The desktop app never downgrades by itself: install 1.5.10 yourself. Docker users pin `autobyteus/autobyteus-server:1.5.10`.

## What's New
- **Agents continue after an update.** When AutoByteus restarts for an update, agents that were in the middle of a task continue by themselves, each told once that the app restarted and that commands that were running may not have finished. Idle agents, agents you stopped or archived, and agents you message first are left alone. A normal quit and relaunch resumes nothing.
- **Update automatically.** A new **Update automatically** switch for the desktop app (in Notifications → Software update and Settings → Updates) and one for each Docker node (in Nodes). Both are off by default. With the app switch on, a new version on your update channel downloads and installs by itself, and the app restarts. On macOS the system first prepares its copy of the update, about half a minute after the download (longer when the computer is busy), while the app and its agents keep working. With a node's switch on, the desktop keeps that node on the desktop's version. A failed automatic update changes nothing, says why, and that version is not tried again automatically.
- **Update a Docker node's server from the app.** **Nodes → Manage Nodes** shows each remote node's server version, and **Update to <version>** brings an older node to the app's version inside its container: it downloads only the server, checks its signature, tries it once, and only then restarts into it. A failed update leaves the old version running. `autobyteus-docker update --all` does the same from the command line.
- **Continue a stopped agent on another agent runtime.** In a stopped run's settings, choose another runtime and one of its models, and save. The switch happens at your next message; the run keeps its chat, history and workspace, and the chat shows "Agent runtime changed from … to …". The new agent is told where the previous agent's work journals are. This works for standalone agents, Team members, Organization agents and delegated copies.
- **Projects in the left panel.** A **Workspaces | Projects** switch lists runs by Project. A Project shows the runs started under it, with their delegated work. Start a run under a Project with **+**, or pick the Project in New chat's workspace chip.
- **Integrations, starting with GitHub.** The new **Integrations** page shows each integration as a card. Import one from a GitHub repository or a local folder, then **Connect** it with a token, which AutoByteus checks and keeps in its encrypted vault. Agents use GitHub through AutoByteus without ever seeing the token: `gh api`, `curl` and `git clone/fetch/pull/push` over `https://github.com/…` work in their shell. Which agents may use it is decided by the integration's skill (`github-integration`); an agent set to "all installed skills" gets it once GitHub is connected. Every GitHub call an agent makes is recorded, without the token.
- **Delegated agents work in their Task's Project folder.** An agent or team that takes a Task of a Project works in the Project's first linked folder. If that folder is missing, the delegation stops and says which Project and folder.
- **Running agents pick up tool changes.** When you change an agent's tools, its running runs take the new tool list at once (Codex and Grok at the next message), with a "Tools updated" card. No restart needed.
- **New model: OpenAI `gpt-6.1-terra`**, in Settings and on the Codex runtime.
- **Thinking effort on every Claude model.** One Thinking list for all Claude models: Off, Low, Medium, High, Xhigh, Max. Claude Opus 4.8, Opus 4.7 and Sonnet 4.6 are no longer offered; saved runs on them show "No longer offered".
- **`read_file` reads images, audio and video** for the model's next turn, and refuses binary files. `read_media_file` is gone; agents that listed it use `read_file` instead.

## Improvements
- **Quitting with busy agents is quick and leaves nothing running.** Terminate stops a busy agent at once. Quitting or stopping the server interrupts busy agents, finishes within a few seconds, and leaves no agent runtime or command running afterwards.
- **"Install update and restart" is more reliable.** It installs even when the server did not stop cleanly, as long as its process is confirmed gone, and quitting no longer waits on idle connections.
- **Large runs open faster.** A Team or Organization loads each member when you open it, and the Team tab loads its messages when opened. A damaged message log is reported with the reason.
- **Settings of a focused agent show that agent.** Team or Organization settings are one switch away, and the save bar names every agent with unsaved edits.
- **A cleaner Manage Nodes tab**, with each node's server version and update in its own cell.
- **Work Journals read the same on every runtime**, in plain words ("Message to …", "Browser: open …", "Load skill: …"). A message the platform refused now reads as failed.
- **A smaller server**, about 150 MB less on disk.

## Fixes
- **A failed agent start leaves nothing behind.** If an agent run cannot start (for example, its runtime is not installed or its model is unavailable), no empty run is added to the history.
- **Creating a run while the app quits or updates no longer leaves an empty run.** The create either finishes or leaves nothing.

## Upgrade Notes
- **Docker.** The server image is `autobyteus/autobyteus-server:1.5.11`, and `:latest` and `:beta` now point to it. If you follow the beta track with the public launcher, you can return to stable with `autobyteus-docker upgrade --all --tag latest`, because this release is newer than every 1.5.11 beta.
- **Desktop.** Installs on the beta track (Settings → Updates → Receive beta updates) that already have a 1.5.11 beta are offered this release as an update too.
