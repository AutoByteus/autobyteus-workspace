# Architecture Review Handoff — Agent Tools MCP Session Lifetime

## Recipient

`architecture_reviewer`

## Status

Requirements approved by user on 2026-06-16. Design spec produced. Ready for architecture review.

## Cumulative Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/design-spec.md`

## Bootstrap Context

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime`
- Branch: `codex/agent-tools-mcp-session-lifetime`
- Base/tracking branch: `origin/codex/streamable-mcp-runtime-tools`
- Base commit after refresh: `c3cc4d0d49db1146c18a3c251518041ee233c512`

## Scope Summary

Implement Option A for shared Agent Tools MCP sessions:

- remove fixed active-session TTL (`expiresAt`, `ttlMillis`, `expired`, `purgeExpiredSessions`, default 12h TTL);
- keep sessions memory-only and bearer-protected;
- keep old descriptors invalid after server restart/registry reset;
- ensure start/restore/resume materializes a fresh descriptor before runtime MCP use;
- route public standalone termination through `AgentRunManager` cleanup so run-scoped MCP sessions are revoked immediately;
- preserve existing route bearer/redaction behavior.

## Key Design Risks For Review

- Whether changing `AgentRunService.terminateAgentRun(...)` to delegate to `AgentRunManager.terminateAgentRun(...)` preserves metadata/history/platform-ID update behavior without double termination.
- Whether Claude live-session descriptor caching is correctly scoped: no wall-clock refresh during one `ClaudeSession`, but fresh descriptor after restore/restart because a new session state object is created.
- Whether restore/resume coverage should be required at the route/API level or unit level for Codex, Claude, and mixed team members.
- Whether deferring OAuth protected-resource metadata remains acceptable for this lifetime ticket.

## Expected Review Decision

Please review whether the design is ready for implementation or needs design rework before implementation begins.
