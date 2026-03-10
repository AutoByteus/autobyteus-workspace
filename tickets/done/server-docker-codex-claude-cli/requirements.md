# Requirements

- Ticket: `server-docker-codex-claude-cli`
- Status: `Refined`
- Last Updated: `2026-03-10`

## User Intent

Analyze whether the server Docker image should include both Codex CLI and Claude Code by default, and define the cleanest auth/runtime model for using those tools inside the container.

The analysis should determine:

1. whether installing both tools in the image is practical,
2. whether "always install latest" is a good release strategy,
3. whether local host credentials can or should be copied or mounted into the container,
4. whether in-container interactive login is a better default than host credential reuse,
5. whether the server container should remain `root` for tool execution,
6. whether Docker-managed persistence or full ephemerality is the right default,
7. how this should be tested locally before any Docker release change.

## Working Questions

1. What does the current server Docker image include today, and where would Codex CLI / Claude Code fit?
2. What are the current official installation methods for Codex CLI and Claude Code?
3. What credential files or login state do those tools rely on locally?
4. Is copying local credentials into the image or container safe and supportable?
5. Is a bind-mount or runtime login flow better than baking credentials into the image?
6. Should the image track floating latest versions, pinned versions, or build args?
7. Should login state be persisted in Docker-managed storage or remain ephemeral across container recreation?
8. What local validation path would be sufficient before proposing a Docker release?

## Constraints

1. Investigation/design only until the workflow explicitly unlocks source edits.
2. Prefer clean runtime boundaries over convenience hacks that leak secrets into images.
3. Use primary sources for current Codex CLI / Claude Code install and auth guidance.
4. The user prefers the server container to run with root-level authority for in-container agents/tools.
5. The user prefers not to bind-mount host data folders that could expose local files to destructive in-container actions.
6. In-container login is acceptable if it produces a cleaner design than host credential reuse.
