# Investigation Notes

- Ticket: `server-docker-codex-claude-cli`
- Status: `Complete`
- Last Updated: `2026-03-10`

## Current Docker Runtime Facts

1. The current server image is built from [Dockerfile.monorepo](/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-codex-claude-cli/autobyteus-server-ts/docker/Dockerfile.monorepo).
2. The runtime stage already includes Node/npm through the `autobyteus/chrome-vnc` base image and currently installs `git` and `ripgrep`.
3. The running container already executes as `root`, with `HOME=/root`.
4. The image already includes Chromium, which is usable for in-container interactive login through the noVNC/Chrome setup.
5. The compose stack currently mounts named Docker volumes for:
   - `/app/autobyteus-server-ts/workspace`
   - `/home/autobyteus/data`

## Practical Local Validation

1. A disposable container based on `autobyteus-server:latest` successfully installed both CLIs together:
   - `@openai/codex`
   - `@anthropic-ai/claude-code`
2. After install, both tools launched successfully:
   - `codex-cli 0.112.0`
   - `Claude Code 2.1.72`
3. This confirms the current runtime image can technically bundle both CLIs without first changing the base image.

## Official Install/Auth Guidance

### Codex CLI

Primary source: OpenAI Codex CLI documentation and help pages.

1. OpenAI documents installing Codex with npm.
2. OpenAI documents two supported auth approaches:
   - ChatGPT account login
   - API key login
3. OpenAI documents local auth state under:
   - `~/.codex/auth.json`
   - `~/.codex/config.toml`

### Claude Code

Primary source: Anthropic Claude Code documentation.

1. Anthropic documents installing Claude Code with npm.
2. Anthropic documents interactive login flows through `claude auth login` and browser-based account auth.
3. Anthropic also documents credential-management behavior using platform-native secure storage, including macOS Keychain.

## Credential Reuse Findings

### Codex

1. Mounting the host `~/.codex` folder into `/root/.codex` inside the container allowed `codex login status` to report a valid ChatGPT login.
2. That means host credential reuse is technically possible for Codex when the auth files are present in the container home directory.
3. However, this is still a local-secret reuse pattern, not a clean image contract. It should not be baked into the published image.

### Claude Code

1. Mounting only `~/.claude` was not enough to restore login.
2. Mounting both `~/.claude` and `~/.claude.json` still did not restore login inside the Linux container.
3. This matches Anthropic's documented use of native secure credential storage on macOS and indicates that host-login portability is not a reliable cross-platform contract.

## Design Implications

1. Bundling both CLIs in the image is practical.
2. Copying host credentials into the image at build time is not acceptable.
3. Bind-mounting host credentials into the running container can work for Codex, but it is not a robust general solution and does not solve Claude Code cleanly.
4. The cleanest UX given the user's updated preference is:
   - install both CLIs in the image,
   - keep the container running as `root`,
   - let the user log in inside the container using Chromium/noVNC,
   - avoid host credential mounts by default.
5. If no host bind mounts are used, login state becomes ephemeral unless persisted in a Docker-managed volume inside the container lifecycle.

## Release Strategy Recommendation

1. Do not build the published image against floating `latest` package installs with no pinning.
2. For a release image, prefer explicit version args or release-controlled pinned versions for:
   - Codex CLI
   - Claude Code
3. If the product goal is "ship recent versions," resolve that in release engineering, not in every container startup.

## Preliminary Recommendation

Recommended direction:

1. Add Codex CLI and Claude Code to the server image build.
2. Keep runtime user as `root` unless a later hardening requirement appears.
3. Do not copy host credentials into the image.
4. Do not rely on host credential bind mounts as the default UX.
5. Support in-container login as the primary auth path.
6. If persistence is desired without exposing host folders, use Docker-managed named volumes instead of host bind mounts.

## Open Questions For Design

1. Should CLI install be part of the default image or a separate variant?
2. Should Docker-managed auth/data volumes remain enabled by default, or should the image be intentionally ephemeral?
3. Should version pinning live in Docker build args, env defaults, or release workflow inputs?
