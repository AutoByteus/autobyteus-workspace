# Future-State Runtime Call Stack — Docker CLI Latest Install Defaults

## UC-001: Local Scripted Build Installs Latest CLI Tools By Default

1. User runs `autobyteus-server-ts/docker/build.sh` without explicit CLI version args.
2. Script builds Docker image using `Dockerfile.monorepo`.
3. Script passes `CLI_INSTALL_CACHE_BUSTER=<current UTC timestamp>`.
4. Docker runtime stage evaluates:
   - `CODEX_CLI_VERSION=latest`
   - `CLAUDE_CODE_VERSION=latest`
   - `CLI_INSTALL_CACHE_BUSTER=<timestamp>`
5. Docker executes CLI install layer because cache-buster value changed:
   - `npm install -g "@openai/codex@latest" "@anthropic-ai/claude-code@latest"`
6. npm resolves current `latest` dist-tags at build time.
7. Image contains current latest Codex CLI and Claude Code unless caller explicitly overrides versions.

## UC-002: Multi-Arch Release Build Installs Latest CLI Tools By Default

1. Release workflow invokes `docker/build-push-action` for default or zh variant.
2. Workflow passes `CLI_INSTALL_CACHE_BUSTER=${{ github.run_id }}` as a build arg.
3. Dockerfile default CLI version args remain `latest` unless workflow/caller overrides them.
4. Buildx cannot reuse an old CLI install layer across release runs because the cache-buster arg changed.
5. npm resolves latest dist-tags during the release build.

## UC-003: Explicit Version Override Still Works

1. Caller passes `--build-arg CODEX_CLI_VERSION=<version>` and/or `--build-arg CLAUDE_CODE_VERSION=<version>`.
2. Dockerfile uses the explicit values in package specs.
3. npm installs the requested versions.
4. Cache-buster can still be passed to force execution of the install layer when needed.

## Error / Fallback Behavior

- If npm registry resolution fails, Docker build fails at the CLI install layer with npm's error; no silent fallback to stale versions is introduced.
- If a manual caller wants reproducibility, they can pass explicit versions and optionally a stable cache-buster.
