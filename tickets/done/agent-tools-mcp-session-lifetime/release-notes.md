# Release Notes

## Agent Tools MCP session lifetime

- Agent Tools MCP sessions now use owner-lifetime, process-memory validity instead of a fixed active-session TTL.
- A session remains usable only while its registry entry exists in the current server process, is not revoked, and the request presents the matching bearer `Authorization` token.
- Public standalone run termination and mixed-team member disposal revoke the matching Agent Tools MCP sessions through owner lifecycle cleanup.
- Server/process restart or registry reset invalidates old bearer descriptors; restored, resumed, or newly started Codex/Claude owners must materialize fresh descriptors in the current process.
- Route denial behavior remains intentionally redacted: missing bearer is `401`, while unknown, revoked, token-mismatched, or reset/missing sessions return `404 session_unavailable` without leaking session IDs or tokens.

## Operations / migration notes

- No database migration or durable session migration is required.
- Do not persist or reuse Agent Tools MCP bearer descriptors across process restarts.
- Broad `pnpm -C autobyteus-server-ts typecheck` is still blocked by the known pre-existing tests-outside-`rootDir` `TS6059` project configuration issue; production `build`, focused Vitest coverage, and delivery diff hygiene passed.
