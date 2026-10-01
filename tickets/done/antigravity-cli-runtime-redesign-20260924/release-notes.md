## What's New
- Antigravity CLI is available as an Agent runtime for standalone Agents, Teams, and AgentOrgs, with model selection, scoped Agent Tools collaboration, and conversation continuation after restart.

## Improvements
- Large Antigravity AgentOrgs launch with responsive health checks while model discovery runs. Invalid configurations finish with a clear, member-specific error instead of remaining on the starting screen.
- Agent and member conversations retain their identity, history, and visible prior replies across an app restart.
- Antigravity tool activity appears in the existing conversation and Activity/Event Monitor views; new selections default to automatic tool execution while an explicit off choice is preserved.

## Fixes
- Team-local configured skills with safe links to files in their own Team package now start correctly in Antigravity member runs. Linked files are copied into the run-private skill snapshot without changing the source package or selected workspace.

## Notes
- A provider-reported `DONE` tool step is displayed as a successful provider step; it does not independently verify an underlying shell exit code.
- Antigravity CLI must be installed and available to the app. No persisted-data migration is required.
