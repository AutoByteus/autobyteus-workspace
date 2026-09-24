# Release Notes — Claude Agent SDK Runtime Reliability and Model Pickers

## What's fixed and improved

- **Claude-runtime agents no longer lose long-running commands.** Previously, a Bash command that a Claude Agent SDK agent started "in the background" (or that Claude moved to the background after its timeout) was killed when the turn ended, while the agent kept promising to report back. Claude turns now run Bash in the foreground only: a long command completes inside the same turn and the agent reports the result, or it ends with a visible timeout error. A single command may run up to 30 minutes when the agent requests that timeout; the default per-command timeout stays 2 minutes.
- **Claude agents expose only an explicit set of Claude Code built-in tools**: `Bash`, `Read`, `Edit`, `Write`, `Glob`, `Grep`, `NotebookEdit`, `WebFetch`, `WebSearch` and `Skill`. Claude's native subagent and multi-agent tools are no longer visible or callable; AutoByteus `delegate_task`, `send_message_to` and the Team tools are the multi-agent mechanism. AutoByteus MCP tools are unaffected.
- **Claude Agent SDK model pickers show one option per real model**, labeled with the exact model ID (for example `claude-opus-5-5[1m]`) instead of aliases like "Default (recommended)". The recommended model carries a **Recommended** badge and is listed first; search matches the model ID, display name, description and "Recommended". This applies to agent and team run configuration, member overrides, existing-run Settings, messaging bindings and application launch profiles.

## Compatibility

- No database migration.
- Saved configurations and runs keep their stored Claude model values (`default`, `sonnet`, `opus[1m]`, …) and launch exactly as before.
- Sessions created before the tool restriction keep Claude's earlier agent-type listing in their transcript history; on resume the tool list is still restricted.
- A Claude `settings.json` `env` block that sets `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` or `BASH_MAX_TIMEOUT_MS` overrides the new Bash policy inside the Claude CLI.
- Codex App Server and AutoByteus model pickers and runtimes are unchanged.

## Validation boundary

- Background Bash fix: the user explicitly verified the local macOS Electron build ("it works"). Live tests through the AutoByteus server with the real Claude CLI passed on both the PATH CLI (2.1.281) and the SDK-bundled CLI (2.1.280): a command requested "in the background" ran in the foreground and was reported in the same turn, and a timeout overrun failed visibly instead of being backgrounded. A full 30-minute command was not run.
- Tool restriction and model pickers were each user-verified and finalized in earlier deliveries. The tool restriction was validated against a local fake Anthropic API with both CLIs; the pickers were checked in a browser against a live Claude CLI (2.1.281). Model IDs and tool names come from the installed Claude CLI and can change between CLI versions.
