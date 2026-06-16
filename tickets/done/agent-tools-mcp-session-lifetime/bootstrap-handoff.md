# Agent Tools MCP Session Lifetime — Bootstrap Handoff

## Status

Bootstrap complete. Requirements are Draft. No design spec has been produced.

## Worktree / Branch

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime`
- Branch: `codex/agent-tools-mcp-session-lifetime`
- Base/tracking branch: `origin/codex/streamable-mcp-runtime-tools`
- Base commit: `c3cc4d0d49db1146c18a3c251518041ee233c512`

## Canonical Artifacts

- Requirements draft: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/investigation-notes.md`
- This handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/bootstrap-handoff.md`

## Key Point

This is a shared base-branch ticket, not an AGY ticket. It should update the Agent Tools MCP session subsystem so all external runtimes inherit owner-lifetime, bearer-protected session semantics.

## Recommended Next Step

Refine requirements/design around:

1. Removing fixed active-session TTL.
2. Keeping bearer auth mandatory.
3. Explicit owner lifecycle revocation.
4. Memory-only server-restart behavior.
5. Tests for no time expiry, revoke, auth failure, and owner cleanup.
