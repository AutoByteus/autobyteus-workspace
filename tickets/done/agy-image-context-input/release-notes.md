# Release Notes — Images and Files Reach Antigravity Agents

Status: prepared before user verification. Whether this ships in a release, and with which version, is decided at finalization.

## Fixed
- Images you attach or paste in a message to an Antigravity (AGY) agent now reach the model. Before this fix the agent replied that the image "didn't come through". The agent opens each image with its `view_file` tool, which shows in the conversation as a normal tool step, and then answers about what the image shows. This works for standalone agents and for agents in a Team.
- Other attached files (for example `.txt` or `.pdf`) are now passed to AGY agents by path, as on the other runtimes. Before, they were dropped.
- An image given as a web link is named in the message. An image that cannot be passed at all gets a short note to the agent instead of being dropped silently.

## Changed
- Send needs typed text (or a skill tag). A message with only attached files cannot be sent: Send stays disabled until you type something. This now applies the same way in every message box. Before, the Chat box enabled Send for files alone, and the server then rejected the message.

## Unchanged
- Your sent message shows the text you typed and its attachments, as before.
- Image handling on the Claude, Codex, AutoByteus and ACP runtimes is unchanged. Delegated tasks and messages between agents are unchanged.

## Notes
- No reset or data migration is needed.
