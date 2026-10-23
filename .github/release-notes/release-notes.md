## Before You Update
- **Back up your data first. You can't go back to an earlier version afterwards.** On the first start, this update deletes the data of the removed Skill Improvement feature (details under Upgrade Notes), and Remote Collaboration saves new information with your runs that earlier versions were never checked against. Installing an earlier version after this update is not supported. To back up, quit AutoByteus and copy the `~/.autobyteus/server-data` folder (on a Docker node, the server's data volume). If you need to go back after updating, don't install an older version: open an issue at https://github.com/AutoByteus/autobyteus-workspace/issues and we will help.
- **Update the desktop app and every remote or Docker node it connects to together.** Different versions of the app and a node are not supported together, and Remote Collaboration needs both nodes on this version.

## What's New
- **Remote Collaboration: agents on different nodes work together.** Your desktop node and your Docker or other nodes can now hand work to each other. It is off by default and meant for a trusted private network only: nodes do not authenticate each other, and no key, token or sign-in ever travels between them.
  - **Set it up** in **Nodes → Remote Collaboration** on each node: turn it on, then add the other node by its URL and a name. Register each node on the other one too.
  - **Delegate across nodes.** An agent can give a text task to any shared agent or agent team of another node, naming the node by the name you gave it. The task runs on that node as an ordinary run you can open, watch, message and stop there, and it appears in that node's history titled with the task.
  - **Talk both ways.** The two agents keep messaging each other by run ID, also after the remote run went idle or either node restarted. For a remote team, every member can be reached, including members that haven't started yet.
  - **How runs started by another node work.** Each agent runs with its own default runtime and model (a team member without one uses its team's default), in the node's temp workspace, with tool calls auto-approved. An agent whose runtime signs in with that node's local login (for example Codex or Claude) uses that login for every registered peer. An agent without a default runtime and model is refused with a message saying so.
  - **Let agents find the other node themselves.** Give an agent the new **list_available_nodes** and **list_available_agents** tools: it can then list the registered nodes and their status, and see which agents and agent teams another node offers, without being told an address.
  - **See every peer at a glance.** **Nodes → Remote Collaboration** shows each peer's state (Available, Not reachable, Off there, Not registered there, Different server) and, when it is available, its agents and agent teams, with search for long lists.
- **Notification Center.** A badge in the sidebar shows waiting updates of the app and of the agent packages and skill sources you imported from GitHub. Open it to see what changed and update with one click. AutoByteus checks GitHub in the background at most every 6 hours, without an account or token, and downloads nothing until you press **Update**. Turn the checks off in **Settings → Server Settings → Basics → Update checks**. The update card that used to open by itself is gone; **Settings → Updates** is unchanged.
- **Settings → Agent Runtimes.** See Codex, Claude, Antigravity and Grok for the current node: the installed version, whether a newer one exists, and whether you are signed in. **Update** runs the runtime's own updater, and **Sign in** starts Codex's or Grok's own browser sign-in. On a Docker node, Codex and Grok sign-in opens in the node's own browser, which you finish in the workspace's VNC viewer. AutoByteus never sees or stores your sign-in.
- **NFS Guide.** Copyable, checksum-checked macOS and Linux installation commands for AutoByteus NFS v0.1.0, storage setup guidance and the command reference. The guide only copies text; it runs nothing.

## Improvements
- **MCP servers that split their tool list into pages now show all their tools.** Before, only the first page appeared. AutoByteus now connects to MCP servers with version 2 of the MCP TypeScript client, on every agent runtime.
- **MCP connection errors start with the HTTP status,** for example `HTTP 401 Unauthorized: …`, in tool preview, discovery and agent tool calls. No token or header value appears in any message.
- **A stopped skill-tagged run keeps a clean title.** Its history row reads as your message, without the "Use the … skill for this request." prefix, just as it did while the run was active.

## Security
- **The desktop app now runs on Electron 42.11.16** (Chromium 148, Node.js 24.19), which fixes the security issues reported for the earlier Electron 42 build.
- **Security fixes in libraries the app and server use,** including `tar`, `undici`, `axios`, `protobufjs` and `markdown-it`. 17 unused dependencies were removed, which makes installs and the packaged app smaller.

## Changes
- **Skill Improvement has been removed.** The **Skill Improvement** card in Server Settings and the **Improve skills** button in agent and team chats are gone. It may return later in a different form. To improve a skill today, ask an agent to read a run's Work Journal and update the skill.
- **Some MCP error messages read differently,** because they come from the new MCP client: remote server errors start with `SdkHttpError: …`, a local server that exits at start says `SdkError: Connection closed`, and one that doesn't answer says `SdkError: Request timed out` (still after 60 seconds).

## Known Limitations
- **Remote Collaboration is text only.** Files and saved Tasks can't be sent to another node yet, and a run started by another node can't be stopped from the node that started it.
- **Nodes trust each other on the network.** A node accepts requests from any node registered on it; identities are not yet proven. Use Remote Collaboration only on a network you trust.
- **A message between nodes is sent once.** If the other node doesn't answer within 20 seconds, the agent is told the message may have been delivered; nothing is retried.
- Two libraries still have known security advisories without a fix in their current versions: the server's web framework (moving to its next major version is planned) and the spreadsheet viewer's `.xlsx` reader.

## Upgrade Notes
- **What the first start deletes:** the earlier skill-improvement and self-evolution records, the built-in **Retrospective Skill Improver** agent and all of its runs (they disappear from your run history), and the settings `ENABLE_SKILL_IMPROVEMENT`, `AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID` and `ENABLE_SELF_EVOLUTION`. The **Skill Self-Evolver** agent, if you have it, is kept, but the runs that the old self-evolution feature started with it are deleted too. Nothing else is changed. If something can't be deleted, the app still starts normally and tries again on the next start.
- **Docker.** The server image is `autobyteus/autobyteus-server:1.5.8`, and `:latest` and `:beta` now point to it. If you follow the beta track with the public launcher, you can return to stable with `autobyteus-docker upgrade --all --tag latest`, because this release is newer than every 1.5.8 beta. A Docker node deletes the Skill Improvement data on its first start too, so back up its data volume first.
- Existing runs, agents, teams, Projects, settings and MCP servers load unchanged. Remote Collaboration stays off until you turn it on.
