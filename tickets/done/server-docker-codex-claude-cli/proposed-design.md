# Proposed Design

- Ticket: `server-docker-codex-claude-cli`
- Status: `Proposed`
- Last Updated: `2026-03-10`

## Decision Summary

Recommended design:

1. Bundle both Codex CLI and Claude Code into the server Docker image.
2. Keep the runtime executing as `root`.
3. Use in-container login as the default auth path.
4. Do not copy or bake host credentials into the image.
5. Do not rely on host bind-mounts for auth by default.
6. Keep tool versions pinned at image build time instead of floating `latest` at runtime.
7. If persistence is desired, keep it inside Docker-managed storage rather than host bind mounts.

## Why This Design

### CLI Installation

Both CLIs can already be installed successfully in the current runtime image with npm, so image bundling is technically straightforward.

### Root Runtime

The container already runs as `root` today. That matches the user's desired operating model for in-container agents and avoids additional permission friction for Codex or Claude Code.

### Authentication

Copying host credentials is not a clean cross-tool design:

1. Codex host auth can be reused if `~/.codex` is present in the container.
2. Claude host login does not port cleanly into the Linux container even when both `~/.claude` and `~/.claude.json` are mounted.

That makes host credential reuse asymmetric and brittle. In-container login is the clean common path, especially because the image already includes Chromium and noVNC.

### Persistence Boundary

There are three persistence models:

1. Host bind mounts
   - Best for persistence
   - Worst for isolation
2. Docker-managed named volumes
   - Good persistence without exposing host directories directly
   - Keeps data inside Docker lifecycle
3. Fully ephemeral container filesystem
   - Strong isolation
   - User must re-login after container recreation

Given the user's stated preference to avoid host bind mounts, the clean options are:

1. Docker-managed named volumes if login persistence is wanted
2. Fully ephemeral auth if throwaway behavior is acceptable

## Versioning Recommendation

Do not install floating `@latest` versions during every container startup.

Recommended approach:

1. Add explicit CLI version build args:
   - `CODEX_CLI_VERSION`
   - `CLAUDE_CODE_VERSION`
2. Install exact versions during image build.
3. Let release engineering decide when to bump those versions.

This preserves reproducibility and prevents surprise image drift.

## Suggested Implementation Shape

1. Update the Dockerfile runtime stage to install both CLIs globally with pinned versions.
2. Leave runtime user as `root`.
3. Decide whether auth/session state should live in:
   - existing Docker-managed data volume, or
   - fully ephemeral container storage
4. Optionally add simple docs describing:
   - how to launch Codex in the container
   - how to run `claude auth login`
   - how to reach Chromium/noVNC for browser login

## Explicit Non-Goals

1. Do not bake personal host credentials into the published image.
2. Do not add host home-directory mounts by default.
3. Do not depend on floating `latest` CLI resolution at runtime.

## Recommendation to User

If the goal is a clean and supportable feature, proceed only with this version:

1. image-bundled CLIs,
2. root runtime,
3. in-container login,
4. Docker-managed persistence or intentional ephemerality,
5. pinned versions.

Do not implement a default design that copies host credentials or silently mounts host auth folders into the container.
