# Requirements — Docker CLI Latest Install Defaults

Status: Design-ready

## Requirement Summary

The backend server Docker image must install the npm `latest` release of both runtime CLIs by default:

- `@openai/codex`
- `@anthropic-ai/claude-code`

The Dockerfile must not hard-code stale CLI versions as default build args. Explicit build-time overrides must remain available for reproducibility, rollback, and emergency pinning.

## Acceptance Criteria

- AC-001 — Dockerfile defaults:
  - `autobyteus-server-ts/docker/Dockerfile.monorepo` sets `CODEX_CLI_VERSION=latest`.
  - `autobyteus-server-ts/docker/Dockerfile.monorepo` sets `CLAUDE_CODE_VERSION=latest`.
- AC-002 — Override compatibility:
  - The Dockerfile continues installing `@openai/codex@${CODEX_CLI_VERSION}` and `@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}` so callers can pass explicit versions.
- AC-003 — Cache-safe scripted builds:
  - Local/release scripted build paths pass a cache-busting build arg into the CLI install layer so npm resolves `latest` during normal scripted builds rather than reusing an old layer.
- AC-004 — Source hygiene:
  - Tracked source has no stale default CLI version pins for `CODEX_CLI_VERSION` or `CLAUDE_CODE_VERSION` outside generated/ignored artifacts.
- AC-005 — Validation:
  - Lightweight executable validation verifies Dockerfile defaults and build-script/release-workflow cache-buster wiring.

## Out of Scope

- Rebuilding or publishing the Docker image in this change unless separately requested.
- Removing explicit version override capability.
- Modifying generated app bundle output under ignored `electron-dist` artifacts.
