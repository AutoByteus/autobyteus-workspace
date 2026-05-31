# Investigation Notes — Docker CLI Latest Install Defaults

## Scope Triage

Scope: Small.

This is a Docker packaging/default-build behavior change. The core ownership is the server Docker packaging surface, primarily `autobyteus-server-ts/docker/Dockerfile.monorepo`, with release/local build paths considered because Docker layer caching can keep an old `npm install -g` result even when package specs use `@latest`.

## Evidence Collected

- Running backend container before the fix:
  - `@openai/codex`: installed `0.135.0`, npm `latest` `0.135.0`.
  - `@anthropic-ai/claude-code`: installed `2.1.72`, npm `latest` `2.1.158`.
- Dockerfile had hard-coded default build args before this ticket:
  - `ARG CODEX_CLI_VERSION=0.112.0`
  - `ARG CLAUDE_CODE_VERSION=2.1.72`
- Package install command already uses build args:
  - `npm install -g "@openai/codex@${CODEX_CLI_VERSION}" "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}"`
- Current npm dist-tags checked during investigation:
  - `@openai/codex latest = 0.135.0`
  - `@anthropic-ai/claude-code latest = 2.1.158`
- Release workflow uses GitHub Actions buildx cache for server Docker image layers, so changing Dockerfile defaults to `latest` is necessary but not fully sufficient if a cached `RUN npm install -g ...` layer is reused in future releases.

## Root Cause

The Dockerfile defaulted fast-moving CLI tools to fixed versions. That made image builds reproducible but stale by default, contrary to the intended behavior for these runtime CLIs.

## Risk / Design Considerations

- Keeping build args is useful for emergency pinning and reproducible debugging.
- Default values should be `latest` so npm selects current dist-tags for normal builds.
- Automated build paths should include a cache-busting build arg for the CLI install layer so the `latest` package resolution is actually executed during release/local scripted builds.
- Direct ad-hoc `docker build` without `--no-cache` can still reuse Docker cache unless the cache-buster arg is set by the caller; docs/validation should make scripted paths robust.
