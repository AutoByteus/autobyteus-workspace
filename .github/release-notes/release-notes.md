## Before You Update
- **This release converts no data.** Nothing you have stored changes when you update from 1.5.9.
- **Coming from a version before 1.5.9? Read the 1.5.9 notes first.** Updating converts your data once (Task titles, the new node vocabulary), so:
  - back up first: quit AutoByteus and copy `~/.autobyteus/server-data` (on a Docker node, the server's data volume);
  - going back to a version before 1.5.9 afterwards is still not supported. If you need to, open an issue at https://github.com/AutoByteus/autobyteus-workspace/issues and we will help;
  - if you moved MCP secrets into the vault, keep the `mcps.json` backup AutoByteus wrote; earlier versions don't read vault references;
  - agents that used `list_available_nodes` need `list_peer_nodes`.
- **Update the desktop app and every remote or Docker node it connects to together.** Different versions of the app and a node are not supported together.

## Improvements
- **Runtimes have one full name everywhere:** AutoByteus, Codex App Server, Claude Agent SDK, Antigravity CLI and Grok Build. The same names appear in the chat footer, the model menu, Run Settings, Settings → Agent Runtimes, Model Routing, application setup, Token Statistics, and the messages agents receive about delegated runs.
- **A cleaner interface.** The Settings menu is text-only again, and the decorative icons that 1.5.9 made visible next to text labels are gone. Icons that carry meaning, such as search, folders and icon-only buttons, stay.
- **Voice input in Memory → Search.** With the Voice Input extension on, the search box has the same microphone button as the chat input. What you say appears in the box, and the search runs when you press Search.
- **Embedding settings show one "Waiting…" state** for a Project index that has not started yet, whether or not the model is ready.

## Fixes
- **The "Skill updated" card shows file paths exactly as written.** Names such as `__init__.py` or `*draft*.md` are no longer shown as bold or italic text.
- **Enter in the "Depends on" picker chooses the first Task you can choose,** even when the newest Task in the list is one that already depends on this Task.

## Upgrade Notes
- **Docker.** The server image is `autobyteus/autobyteus-server:1.5.10`, and `:latest` and `:beta` now point to it. If you follow the beta track with the public launcher, you can return to stable with `autobyteus-docker upgrade --all --tag latest`, because this release is newer than every 1.5.10 beta.
- **Desktop.** Installs on the beta track (Settings → Updates → Receive beta updates) that already have 1.5.10-beta.1 are offered this release as an update too.
