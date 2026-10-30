## Before You Update
- **Back up your data first. You can't go back to an earlier version afterwards.**
  - On the first start, this update gives every Project Task a title, and an earlier version drops those titles whenever it saves a Task.
  - It also renames stored names to the app's new node vocabulary: this node's identity, its Remote Collaboration peers, and Memory Sync. Each converted file keeps a backup, but an earlier version does not read the new names.
  - Installing an earlier version after this update is not supported. To back up, quit AutoByteus and copy the `~/.autobyteus/server-data` folder (on a Docker node, the server's data volume).
  - If you need to go back after updating, don't install an older version: open an issue at https://github.com/AutoByteus/autobyteus-workspace/issues and we will help.
- **If you move your MCP secrets into the vault, keep the backup.** Moving them is your choice, and AutoByteus writes a backup of your `mcps.json` first (`mcps.json.backup-before-vault-move-…`, next to `mcps.json`). Earlier versions don't understand vault references, so servers whose secrets you moved won't connect there. To go back, restore that backup before you start the earlier version.
- **Agents that use `list_available_nodes` need the new name `list_peer_nodes`.** The old tool name no longer exists. Select `list_peer_nodes` in those agents' tool lists.
- **Update the desktop app and every remote or Docker node it connects to together.** Different versions of the app and a node are not supported together.

## What's New
- **Project Tasks have titles and comments.**
  - You give a Task a title when you create it, and you see it on board cards, in pickers, on the Task page and in the Workspaces tree.
  - Add numbered comments under a Task's description, without rewriting the description. Agents can add comments too, and board search finds words in comments.
  - Agents can read one Task in full with the new opt-in tool `get_project_task`.
- **Search your past work.** **Memory → Search** finds runs across every run's Work Journal, best first, with snippets (secrets masked). A click opens the run's journal at the matching lines.
  - Build the index once with **Index now** under **Memory → Index**. It then stays current within about 20 seconds of each turn.
  - Agents can search the same index with the new opt-in tool `search_memory`.
- **Model Routing** (Settings → Model Routing), off by default.
  - While it is on, each agent of a new delegated copy starts with its own default, its team's default, or the choice of the built-in **Model Router** agent, in that order.
  - Defaults that can't run right now are skipped with a note, for example when you're signed out or a usage limit is used up.
  - You teach the router through **Talk to the router**, and set its runtime, model and thinking level with the usual launch controls.
  - Every choice is visible: in the delegation result, in run Settings ("View decision") and under **Decisions** and **Overview**.
- **See every agent runtime's models and usage limits.**
  - **Settings → Model Routing → Agent runtimes now** shows, for the current node, each runtime's models and live usage limits, and which models are blocked until when.
  - Agents can read the same with the new opt-in tool `list_available_agent_runtimes`. Reading the limits spends no tokens.
- **Remote delegated runs in your run tree.** A run your agent started on another node now appears under its delegator, tagged with the node, with its title and status. Open it to watch the live conversation, message it, interrupt it or stop it.
- **MCP secrets in the encrypted vault.**
  - When you add or edit an MCP server, values that look like secrets (API keys, tokens, `Authorization` headers) are locked automatically, and you can lock or unlock any row yourself. A stored secret is never shown again.
  - Existing plain secrets are moved only when you choose to, with **Review and move to vault**.
  - A server whose secret is missing shows **Needs secret** and does not connect.
- **Update checks and automatic updates.**
  - Checks for agent packages and skill sources no longer use GitHub's API quota. You set how often each kind is checked, from 15 minutes to 24 hours.
  - Agent runtimes are a kind of update too.
  - Automatic updates are opt-in for each kind. The app itself is never updated automatically, but it now also checks for app updates periodically, not only at launch.
- **One Manage Nodes list.** **Nodes → Manage Nodes** is now the one place for every node.
  - Each node appears once, with its reachability, its collaboration switch, and one status line with a button that fixes the problem.
  - Turning collaboration on or off, removing a node and renaming it each need one confirmation, and update both nodes.
  - Errors name the cause, for example refused, timed out, name not found or a different node.
- **Internal agents.** An agent definition can be marked internal. Internal agents and their runs are hidden from pickers, run history, Memory and other nodes, unless you turn on **Settings → Server Settings → Basics → Show internal agents**.
- **One-hour prompt cache for Claude agents.**
  - Claude-runtime agents now ask for Claude's one-hour prompt cache by default. On API billing, an agent that waits longer than five minutes then reads its cache instead of writing it again.
  - Turn it off in **Settings → Server Settings → Basics → Claude runtime**.
  - Token Statistics shows 5-minute and 1-hour cache writes separately.
- **An agent working on a Task can be given more Tasks,** for example a parent Task and its parts. It stops when its last open Task is closed.

## Improvements
- **Smaller agent tool results.** Built-in tools leave out empty fields. `list_project_tasks` returns short entries; for a Project with about 150 open Tasks, the list is over 90% smaller.
- **When a configured MCP tool fails, Codex, Claude and Antigravity agents see the failure as a tool error** (for example `HTTP 401 Unauthorized: …`) and can react. Before, they got an internal error.
- **The embedded browser's Back and Forward buttons follow the tab's real history,** including in-page and single-page-app navigation.
- **A new agent team folder in an agent package is picked up reliably,** even when the system misses a folder event.
- **Run Settings names delegated copies as the sidebar does.**
- **The server starts quietly,** without the deprecation warnings it used to print.
- **When another program holds the app's server port,** startup now says so, with guidance on how to retry, instead of only timing out.

## Fixes
- **A Task closing while an agent's message to it was being saved no longer stops the whole run.** The sending agent gets a readable "this Task is closed" answer.
- **An application imported while the server runs, with Codex as its runtime, starts right away.** Before, it stayed quarantined until the next restart.
- **Reloading or repairing an application no longer leaves it quarantined.**
- **Saving a stopped delegated copy's model in a running Org's Settings** no longer sometimes asks you to refresh.
- **Icon-only buttons show their icons again,** for example in MCP server forms, Bulk Import and agent details.
- **Phone app:**
  - choosing a workspace for a new team run works;
  - team messages name the teammate, not just "teammate".
- **Applications:** a team member without a runtime is named by its display name in the setup message.
- **Settings → API keys:** a custom provider whose models are still loading shows "—", not "null models".
- **A failed conversion of custom LLM providers from an older version no longer stops AutoByteus from starting.** Custom providers show as unavailable until the conversion succeeds, on the next start or when you retry it in **Settings → Migrations**.
- **The one-time Skill Improvement cleanup now deletes only Skill Improvement data.** On installs that used the 1.4.92 beta builds, the 1.5.8 cleanup could also delete old memory-compaction helper runs. Runs already deleted that way can't be restored.

## Security
- **The server and the message gateway now run on Fastify 5,** which fixes the web-framework advisories listed as known in 1.5.8.
- **The spreadsheet viewer uses SheetJS 0.20.3,** which fixes the `.xlsx` reader advisory. It also cleans its output down to the table, so a file's cell content can't inject markup.

## Changes
- **`list_available_nodes` is now `list_peer_nodes`** (see Before You Update). `list_available_agents` is unchanged.
- **The Remote Collaboration tab is gone.** Its settings are in **Nodes → Manage Nodes**.
- **The GraphiQL page is turned off,** so `/graphiql` returns "not found". The GraphQL API itself is unchanged.
- **Hyperlinked cells in the spreadsheet viewer show as plain text.** `.xls`, `.xlsx`, `.xlsm` and CSV files still open.

## Known Limitations
- **Nodes trust each other on the network.** Identities are not yet proven, so use Remote Collaboration only on a network you trust.
- **Remote Collaboration is text only.** Files and saved Tasks can't be sent to another node yet.
- **Local (stdio) MCP servers still receive their secrets as environment variables,** because that is the only way such servers accept them.

## Upgrade Notes
- **What the first start converts:**
  - every existing Project Task gets a title from the first line of its description (at most 200 characters);
  - the stored names of this node's identity, its Remote Collaboration peers and Memory Sync follow the new vocabulary, and each converted file keeps a backup;
  - the desktop app's saved node list, and the saved nodes in the iOS and Android apps, are converted the same way.

  Every value stays the same, and nothing needs to be set up again.
- **Docker.**
  - The server image is `autobyteus/autobyteus-server:1.5.9`, and `:latest` and `:beta` now point to it.
  - If you follow the beta track with the public launcher, you can return to stable with `autobyteus-docker upgrade --all --tag latest`, because this release is newer than every 1.5.9 beta.
  - Back up a Docker node's data volume before it starts on this version.
- **Stays off until you turn it on:** Model Routing, Remote Collaboration, automatic updates and the Work Journal index. MCP secrets stay where they are until you move them.
