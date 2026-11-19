## What you need to do
- **This release cannot be rolled back.** On its first start it converts how delegated runs are stored, once, so that each is a run of its own; conversations, Tasks and files are kept. An older version cannot read the converted runs. If you need to go back after updating, contact support instead of installing an older version.
- **Update the desktop app and every node together**, including every paired node: nodes on different versions cannot reach each other's delegated runs. If you use Memory Sync, update each source and the hub together too: an older hub does not accept the new large-file uploads.
- **Docker nodes:** run

  ```bash
  autobyteus-docker upgrade --all
  ```

  Each node keeps its track: nodes on the stable track (the default) get 1.5.13, and nodes on the beta track get it too and stay on the beta track. Your volumes and data are kept. `autobyteus-docker update --all` updates the nodes in place instead. To get the launcher's new progress messages for `setup-code` and `new-container`, run its install command again first (the command in the Docker guide); your nodes and their setup codes are not touched.
- **Beta-track Docker nodes that should go back to stable:** run `autobyteus-docker upgrade --all --tag latest`. It is safe now: this release is at least as new as every 1.5.13 beta.
- **Android:** install this release's APK (`AutoByteus_personal_android-1.5.13-release.apk`). Downloading files on the phone needs it; it also brings full screen under the camera cutout, and a phone that reopens on the same run and screen.
- **The first start builds the agents' run catalogs once,** in the background: new files under `episodic/` in the memory folder only, about 12 seconds for around 4,000 runs. Nothing in any run folder changes, and the catalogs can be deleted at any time. On a long-used installation, the server log can show, at each start, one warning for each old team run saved without its team structure; those runs are left out of the catalogs.
- **Reviewing tool calls on the AutoByteus runtime:** a tool other than the four base tools now asks for approval twice, first for the search, then for the tool. Running tools automatically is unchanged.
- **Daily Assistant on another node:** to delegate to a paired node's Daily Assistant, give it a runtime and model on that node, or turn on Model Routing there.

## Good To Know
- Conversations of agents restored before this update keep the turns they already stored: replies from before this update can still appear merged there, and their older restart reminders behave as before. Everything from this update on shows correctly.
- Codex, Grok and DeepSeek agents still show "Idle" while a background task of theirs runs (no live count).
- On the desktop, some small text with a fixed size does not follow **Settings → Display → App font size**.
- Delegated runs from builds before mid-October 2026 that belong to no Task are no longer shown under the run that started them. Their conversations stay on disk and on the Memory page.
- In our checks, a Grok agent was not woken when its background command ended. It can still wait for the command itself.

## What's New
- **Delegated work keeps going on its own.** An agent, team or org that was given a Task now runs on its own: stopping the run that delegated it no longer stops it, and its report wakes the stopped run when it arrives, also across nodes. Each run shows its own status, delegated runs are listed under the member that delegated them, and a run cannot be archived or deleted while work it delegated is still running.
- **Long-running managers stay fast.** When a Task is closed, the agents and teams delegated for it leave the tree of the run that delegated them once they have stopped. They come back when the Task is reopened and messaged, or the same run gets a follow-up Task. Nothing is lost: the Team tab, the Memory page and token totals keep everything.
- **Semantic memory for agents.** An agent can have its own private memory folder for the knowledge it learns; every run of that agent uses the same folder. Turn it on with the **Semantic memory** switch in the agent's form.
- **Every agent can search memory.** Every agent run has `search_memory`, without any package change.
- **A catalog of each agent's past runs.** The server keeps one readable catalog per agent, listing all its runs with their dates, Task titles, workspaces and work-journal files, so an agent can review its history from one file. Catalogs update on their own within a minute.
- **The restart reminder.** After the application restarts, every agent that was in the middle of a turn, or was waiting for a background task, gets one short reminder of when and why it restarted: after an update or a restart its background tasks were stopped; after an unexpected stop some may still be running untracked. After an update the agent is woken with it; otherwise it comes with your next message. The card shows the time in your own time zone.
- **"Background task running".** An agent that finished its turn but still has background tasks running shows "Background task running" (or "2 background tasks running") with a steady blue dot on the desktop and the phone, instead of "Idle". A team shows the same when none of its agents is in a turn.
- **Background commands for AutoByteus agents.** `run_bash` can run a long command in the background, such as a build or a dev server, and the agent is told once when it ends, with the exit code and its last output. The Background Tasks panel shows them.
- **Long commands for Claude agents.** Claude agents can run a shell command for up to 2 hours, in the foreground or in the background. The Background Tasks panel and the phone's Activity say in one line why a task ended (a time limit, low memory, the run ended, or the exit code).
- **AutoByteus agents use far fewer tokens per request.** They send only the four base tools plus a tool search, and find any other tool when they need it. The first request of a conversation falls by about two thirds in our checks, and changing an agent's tools mid-conversation no longer invalidates the provider's cache.
- **Running agents pick up new skills.** A skill added to an agent's definition reaches its running runs, and the agent is told which skills were added or removed.
- **Your personal settings survive package updates.** Tools, skills, avatar and default runtime/model you set on a package's agents, Teams and Orgs are kept outside the package files, and stay after the package updates.
- **The Daily Assistant can be delegated to.** It is listed at `/daily_assistant`, so any agent can hand it a Task, and `@` offers it in chat, on this node and on a paired node.
- **Phone: Settings for every run.** Every agent you open on the phone has **Settings** (the last entry of its ⋮ menu): change a stopped run's runtime and model. A live run shows a red stop button that stops that run only, never the agent that started it. A run on another computer says where it can be changed.
- **Phone: one Text size for the whole phone.** In the run list's ⋮, **Text size** offers **Standard**, **Large** and **Largest**, and applies to every phone screen at once.
- **Phone: an easier-to-read conversation**, with wider text, a larger type size, and each speaker's name and picture shown once per turn.
- **Phone: background tasks in Activity**, running and ended, with how each ended, updating live.
- **Phone: zoom and download.** PDFs and images zoom with two fingers and double tap, PDFs stay sharp, and **Download** saves the file to the phone (Android app) or through the browser.
- **Phone: files open everywhere.** A file a conversation names opens read-only wherever it is on the node, attached images, PDFs and text files open in the phone's viewer, and a text file of any size shows in full.
- **Desktop: node files open read-only.** In a window that shows a Docker node or a node on another computer, a file a conversation names opens read-only in the Files panel wherever it is on that node. A path in a run on another node says which node it is on.
- **Open files follow their changes.** A file you have open shows its new content within a second when it changes on disk, on the desktop and the phone, for text, images and PDFs; an unsaved edit is kept.
- **Memory Sync carries large files.** Files of any size, such as 2 GB videos, sync in 8 MB pieces and continue after an interruption. Nodes → Memory Sync lists the files that could not be synced and why, and **Sync now** retries them.
- **Large videos as attachments.** Audio and video files up to 2 GB can be attached and sent to an agent (other files up to 25 MB; both limits are node settings), with a progress percentage and a cancel control.
- **Smaller downloads.** The desktop apps and the Docker server package no longer include an unused copy of Claude Code: downloads are about 75 to 190 MB smaller per platform. Claude agents keep using the Claude Code you installed.

## Improvements
- Markdown: long paths, URLs and words wrap within the width, long code-block lines wrap instead of scrolling sideways, and wide tables and equations scroll in their own box. Links to a section in a document's Contents scroll to that heading.
- Claude thinking settings tell the truth: Opus 5 "Off" really turns thinking off, Fable 5 and 5.1 offer effort only, and only the settings a model declares reach the provider. Model pickers read the current list each time they open.
- Commands start reliably on a busy computer: each command has up to 30 seconds to start, and a command that does not start says how long it was given.
- Quitting the app or stopping a node no longer waits seconds for the server to stop while macOS is busy.
- `autobyteus-docker setup-code` and `new-container` show what they are doing and how long they have waited, and end a stuck wait after 90 seconds with the node's name and what to check.
- The server's Docker image is built and published much faster, so releases reach Docker nodes sooner.
- Android: full screen uses the whole screen also under the camera cutout, and a reload or Android reopening the app brings back the same run and screen.

## Fixes
- After a restart, a restored agent's conversation no longer merges its replies from before and after the restart, and every platform notice, such as the restart reminder, shows once.
- A manager that closes a copy's Task and gives the same copy its next Task at the same time now works in either order.
- A stray file link on the phone no longer shows the pairing screen, and tapping an attachment no longer shows "Pair this phone again".
- One large attachment no longer stops all of Memory Sync.
- Delegating a task to an agent's own address is refused with a clear message.

## Upgrade Notes
- **Docker.** The server image is `autobyteus/autobyteus-server:1.5.13`; `:latest` and `:beta` point to it. Beta-track nodes stay on the beta track with a plain `autobyteus-docker upgrade --all`; `autobyteus-docker upgrade --all --tag latest` returns them to stable, which is safe now because this release is at least as new as every 1.5.13 beta.
- **Desktop.** Installs on the beta track that already have a 1.5.13 beta are offered this release as an update too.

