## What's New
- Antigravity CLI is available as an Agent runtime for standalone runs and Team/AgentOrg members, with model discovery, exact provider conversation restore, and run-scoped Agent Tools collaboration.

## Improvements
- New AGY launch selections default to automatic tool execution while retaining an explicit off choice; headless denials remain visible and non-green.
- AGY tool and assistant activity flows through the existing conversation, raw-trace, and Activity/Event Monitor surfaces, including persisted member reload.
- Team and direct/nested AgentOrg member conversations retain their exact identity and visible prior replies across a clean backend restart, then continue in a fresh browser session.

## Notes
- An AGY tool step reported `DONE` is shown as provider-step success, not proof that an underlying shell command exited zero; the provider output remains available and no exit code is invented.
- This ticket needs no persisted-data migration. AGY CLI 1.2.10 was the validated provider version. This file is a pre-verification release-note handoff, not evidence that a version/tag was published.
