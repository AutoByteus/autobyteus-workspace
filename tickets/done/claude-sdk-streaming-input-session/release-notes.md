# Release Notes — Claude Agent SDK Long-Lived Sessions

## What's new and improved

- **Claude agents keep one live session per run.** Each Claude Agent SDK run now keeps a single Claude process for its whole life instead of starting and killing one per turn. The process closes when the run is terminated or the server shuts down.
- **Background commands work.** A command a Claude agent runs in the background keeps running after the turn ends. When it finishes, the conversation shows "Background task completed: …" and the agent continues in a new turn with the result. The notice is kept in run history. This replaces the v1.4.78 stopgap that forced every Bash command into the foreground; Claude CLI defaults apply again.
- **Messages to a busy agent arrive mid-turn.** A message sent to an agent (or a team member) that is still working is delivered into its running turn instead of waiting for the turn to end. This applies to Claude and Codex runs.
- **Stop ends only the current turn.** The conversation, and any background commands, stay alive, and the next message continues the same session.
- **Images are sent to Claude inline.** Attached images are sent as image content; an image that cannot be read becomes a visible note instead of a failure.
- **Token usage stays accurate** across a long-lived session and after a Claude process restart.

## Compatibility

- No database migration. Existing Claude runs resume normally; older runs simply have no background-task notices.
- Each live Claude run keeps its process in memory (about 170 MB). Terminate runs you no longer need.
- If the server environment sets `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`, Claude agents cannot run background commands, and a warning is logged. Unset it to use the CLI defaults.

## Validation boundary

- The user explicitly verified the local macOS Electron build. The change was also validated live through the AutoByteus server with the real Claude CLI, both the PATH CLI (2.1.283) and the SDK-bundled CLI (2.1.280). The checks covered:
  - session lifecycle, background tasks and their notices, and Stop/resume;
  - images, and crash reopen with usage accounting;
  - a live team with Claude and Codex workers, and Codex mid-turn steering;
  - a browser render of the replayed notice.
- API-key authentication mode was not validated live. After a Claude process restart, the first turn counts main-loop usage only.
