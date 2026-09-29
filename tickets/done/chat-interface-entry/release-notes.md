# Chat entry

## New
- **Chat is the new home screen.** AutoByteus opens on a New chat. Chat is the first item in the left navigation, and the pencil starts a fresh chat at any time.
- **Daily Assistant is built in.** New chats go to the Daily Assistant, a general-purpose agent that can use every installed skill. Edit it like any agent; your changes are kept across restarts and updates.
- **Pick the runtime, model and thinking before you start.** In a New chat, one menu searches models across all runtimes, and thinking appears only for models that support it. The last model you used is remembered. Models are named the same way as in the agent and team launch forms, with the recommended Claude model shown first.
- **Choose a workspace before you start.** Chats use a Temp workspace by default. You can pick an existing workspace or open a folder by its absolute path.
- **Skills and addressing in the message box.** Type `/` to ask for one or more skills, or `@` to send the chat to another agent or an agent team. A team started this way uses one model and workspace for every member.
- **Tools are auto-approved by default in new chats.** Switch to "Ask first" before sending.
- **Agents can use all installed skills.** The agent editor has a new "Use all installed skills" option.
- **One skill per name.** Each skill name now has exactly one copy in use.
  - Adding a skill folder, importing or updating an agent package, or creating a skill is refused with a pop-up if a skill with the same name already exists. The pop-up shows both locations so you can rename or remove one.
  - Skills in a runtime's own default folder, such as `~/.codex/skills`, never take precedence. You'll see a notice when one is ignored.
  - If duplicates are created outside the app, the Skills page shows a warning listing which copy is used.

## Changes
- A chat, once started, opens in the regular agent run view. Change the model and thinking in the ⚙ run settings; they are locked while the run is active. Use `/` in the message box to request skills, and ＋ to start a new chat with the same agent and workspace.
- An agent's own private copy of a skill is used only when it is the one copy in use for that name.
- Agents inside an Agent Org use their own bundled skills, the same as agents and agent teams.

## Known limitations
- If an "all installed skills" agent needs a skill that already exists in your workspace's skills folder, AutoByteus keeps your copy and does not add its own.
- The `/` skill list is loaded once per session. A skill added outside the Skills page appears after you open the Skills page or restart the app.
