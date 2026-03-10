# Implementation Plan

- Ticket: `server-docker-codex-claude-cli`
- Status: `Approved For Stage 6`
- Last Updated: `2026-03-10`

## Planned Changes

1. Update [Dockerfile.monorepo](/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-codex-claude-cli/autobyteus-server-ts/docker/Dockerfile.monorepo) to install pinned Codex CLI and Claude Code versions in the runtime image.
2. Update [docker-compose.yml](/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-codex-claude-cli/autobyteus-server-ts/docker/docker-compose.yml) to persist `/root` with a per-project Docker-managed named volume.
3. Update [README.md](/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-codex-claude-cli/autobyteus-server-ts/docker/README.md) to document:
   - bundled CLIs,
   - in-container login,
   - per-instance Docker-managed persistence,
   - reset behavior with `down --volumes`.

## Verification Plan

1. Build the Docker image locally.
2. Start a project-local container.
3. Verify `codex --version` and `claude --version` inside the container.
4. Verify `/root` is backed by a project-scoped volume.
5. Verify docs reflect the new auth and persistence model.
