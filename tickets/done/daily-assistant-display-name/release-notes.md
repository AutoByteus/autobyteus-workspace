# Release notes draft — Daily Assistant name restored

Status: draft. Release or deployment was not requested for this ticket. This text is used only if the user asks for a release after verification. The version number is assigned at release time.

## What's changed
- **The default Chat agent is called Daily Assistant again.** The built-in general-purpose agent is shown as "Daily Assistant" on the Agents page, in New Chat and in its self-introduction. Its role, tools, skills and specialist-agent discovery are unchanged.

## Upgrade notes
- No data migration or reset. The agent keeps the same definition (`autobyteus-daily-assistant`), and server startup refreshes it automatically.
- Chats created while the agent was called "General Agent" (v1.4.92–v1.4.94) keep that label in history. They still open and continue normally.
