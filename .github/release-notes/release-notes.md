# AutoByteus v1.4.91 — Chat

## What's New
- **Chat is the new home screen.** AutoByteus now opens on a New chat, and **Chat** is the first item in the left navigation. The pencil starts a fresh chat at any time.
  - **Daily Assistant is built in.** New chats go to the Daily Assistant, a general-purpose agent that can use every installed skill. You can edit it like any other agent, and your changes are kept across restarts and updates.
  - **Pick the runtime, model and thinking before you start.** One menu searches models across all runtimes, and thinking appears only for models that support it. Models are named the same way as in the launch forms, with the recommended Claude model first. The last model you used is remembered.
  - **Choose a workspace.** Chats use a Temp workspace by default. You can pick an existing workspace or open a folder by its absolute path.
  - **Skills and addressing in the message box.** Type `/` to ask for one or more skills, or `@` to send the chat to another agent or an agent team. A team started this way uses one model and one workspace for every member.
  - **Tools are auto-approved by default in new chats.** Switch to "Ask first" before sending.
  - After the first message, a chat opens in the regular agent run view. Change the model and thinking with ⚙ (they are locked while the run is active), and use ＋ to start a new chat with the same agent and workspace.
- **Agents can use all installed skills.** The agent editor has a new **Use all installed skills** option.
- **One skill per name.** Each skill name now has exactly one copy in use.
  - Adding a skill folder, importing or updating an agent package, or creating a skill is refused with a pop-up if that skill name already exists. The pop-up shows both locations so you can rename or remove one.
  - Skills in a runtime's own default folder, such as `~/.codex/skills`, never take precedence. A notice tells you when one is ignored.
  - If duplicates are created outside the app, the Skills page shows a warning listing which copy is used.
  - Agents inside an Agent Org use their own bundled skills, the same as agents and agent teams.
- **Beta updates for the desktop app.** Turn on **Settings → Updates → Receive beta updates** to get early builds.
  - The setting is off by default, and turning it off never downgrades your app.
  - A **Beta** label appears next to the version when you are running a beta.
  - Docker users can follow betas with `autobyteus-docker upgrade --all --tag beta`.
- **Tasks in Projects (Projects preview).** Each Project page now has a **Tasks** tab with a To Do / In Progress / Done board. You can search Tasks, and Project cards show their open Tasks and workspaces. A Project now opens on a full-width page with **Tasks** and **Workspaces** tabs. Projects is still off by default (Settings → Server Settings → Basics → **Projects**).

## Improvements
- **Simpler delegation.** `delegate_task` now simply starts a helper agent or team and returns its run ID. The parent and the helper talk with ordinary `send_message_to` messages; there is no longer a task status, submit or review step.
  - A delegated helper that stays quiet for 10 minutes is shut down to free resources. It shows as **Offline**, and messaging it wakes it with its full conversation. The grace period is set by `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS`.
  - Delegated agents appear in the members tree with a "Started by …" line. In the Agent Org tree, delegated Team rows can now be collapsed like normal Team rows.
- **Antigravity CLI image generation** now shows where the image was saved, and the image appears in the Artifacts tab.
- **The Antigravity CLI runtime no longer becomes unavailable just because the CLI was upgraded.** AutoByteus still checks the required CLI flags and usable models.
- **The Docker server image now includes the Antigravity (`agy`) and Grok (`grok`) CLIs**, alongside Codex and Claude Code. Sign in to each one at runtime; no credentials are included in the image.

## Fixes
- **Antigravity runs no longer fail during long background commands.** Previously, a turn with no output for 300 seconds, for example during a build, test or `sleep`, was stopped as "Antigravity runtime stopped unexpectedly".
  - Commands still running when a turn ends now show as started in the background, instead of spinning forever.
  - Stopping or terminating an Antigravity agent, Team or Org, or quitting the app, now also stops the dev servers and other background commands it started.
- **A crashed member no longer makes an Agent Org or Team unrecoverable.** Terminate succeeds, the next message restores the Org or Team with its history, and a crashed member of a running Org can be messaged directly again.
- **Notifications now appear above open dialogs** instead of behind them.

## Upgrade notes
- **Standalone agent runs now open in Chat.** New chats start from the pencil, from ＋ in a run's header, or from `+` on an agent in the Workspaces tree.
- **Imports can now be refused because of a duplicate skill name.** Rename or remove one copy, then try again.
- **An agent's private copy of a skill is used only when it is the one copy in use for that name.**
- **Existing team and org runs open as before.** Their old task records stay on disk but are no longer read, and older delegated agents have no "Started by" line.
- **No data migration is needed.** The Daily Assistant is added once, and existing agents, runs and Projects are unchanged.

## Known limitations
- In a New chat, the model button can briefly show the raw model ID until the model list loads.
- The `/` skill list loads once per session. A skill added outside the Skills page appears after you open the Skills page or restart the app.
- A dev server that Antigravity has already moved to the background is not cleaned up if Antigravity itself crashes. Commands that deliberately detach themselves, for example Docker containers, are also not stopped. Background-command cleanup is not supported on Windows.
- A shut-down delegated agent looks the same (**Offline**) as a team member that has not started yet.
