# Chat entry

## New
- **Chat is the new home screen.** AutoByteus opens on a New chat. Chat is the first item in the left navigation, and the pencil starts a fresh chat at any time.
- **Daily Assistant is built in.** New chats go to the Daily Assistant, a general-purpose agent that can use every installed skill. Edit it like any agent; your changes are kept across restarts and updates.
- **Pick the runtime, model and thinking from the message box.** One menu searches models across all runtimes. Thinking appears only for models that support it. The last model you used is remembered.
- **Choose a workspace before you start.** Chats use a Temp workspace by default. You can pick an existing workspace or open a folder by its absolute path.
- **Skills and addressing in the message box.** Type `/` to ask for one or more skills, or `@` to send the chat to another agent or an agent team. A team started this way uses one model and workspace for every member.
- **Tools are auto-approved by default in new chats.** Switch to "Ask first" before sending.
- **Agents can use all installed skills.** The agent editor has a new "Use all installed skills" option.

## Changes
- Single-agent runs now open in the Chat view. Change the model and thinking in the message box footer; they are locked while the run is active.
- The run settings panel and the "new agent" header button are no longer shown for single-agent runs. Start a new chat with the pencil, or with `+` on an agent in the Workspaces tree.
- Advanced model parameters other than thinking can no longer be changed for an existing single-agent run. Team runs are unchanged.

## Known limitations
- If an "all installed skills" agent needs a skill that already exists in your workspace's skills folder, AutoByteus keeps your copy and does not add its own.
