# Future-State Runtime Call Stack

- Ticket: `server-docker-codex-claude-cli`
- Status: `Current`
- Last Updated: `2026-03-10`

## Scope

This runtime model covers the default server Docker flow where:

1. the image ships with Codex CLI and Claude Code preinstalled,
2. the container runs as `root`,
3. auth happens inside the container,
4. auth/session state persists per Docker Compose project through Docker-managed named volumes.

## Use Case 1: Build A Server Image With Both CLIs

1. Docker build starts from [Dockerfile.monorepo](/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-codex-claude-cli/autobyteus-server-ts/docker/Dockerfile.monorepo).
2. The builder stage compiles server artifacts as it does today.
3. The runtime stage installs pinned global npm packages:
   - `@openai/codex`
   - `@anthropic-ai/claude-code`
4. The resulting image contains:
   - the built AutoByteus server,
   - Chromium/noVNC from the base image,
   - Codex CLI,
   - Claude Code.

## Use Case 2: Start One Server Instance

1. The user runs `./docker-start.sh up ...`.
2. [docker-start.sh](/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-codex-claude-cli/autobyteus-server-ts/docker/docker-start.sh) prepares a per-project `.runtime/<project>.env`.
3. Docker Compose starts the `autobyteus-server` service under that project name.
4. Compose provisions per-project named volumes, including:
   - app data volume,
   - root-home/auth volume.
5. The container starts as `root`, with `HOME=/root`.
6. [entrypoint.sh](/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-codex-claude-cli/autobyteus-server-ts/docker/entrypoint.sh) initializes the server data directory and hands over to the base entrypoint/supervisord.
7. The server becomes available with Codex CLI and Claude Code already on `PATH`.

## Use Case 3: User Logs In To Codex Or Claude Inside The Container

1. The user opens the running container environment through terminal/noVNC/Chromium.
2. The user runs either:
   - `codex login`
   - `claude auth login`
3. Browser/device login happens inside the container environment.
4. Auth state is written into `/root`-scoped files used by those CLIs.
5. Because `/root` is backed by a per-project Docker-managed volume, the login state survives normal container restart/recreate for that same project.

## Use Case 4: Run Multiple Server Instances

1. The user starts separate projects, for example:
   - `./docker-start.sh up --project a`
   - `./docker-start.sh up --project b`
2. Docker Compose namespaces volumes by project.
3. Each instance gets its own isolated `/root` home volume.
4. Codex/Claude login state is not shared across instances unless the user intentionally reuses the same project namespace.

## Use Case 5: Destroy State Intentionally

1. The user runs:
   - `./docker-start.sh down`
   - or `./docker-start.sh down --volumes`
2. If only the container is removed and volumes remain, auth persists for the same project.
3. If the named volumes are removed, the next container start gets a fresh `/root` home and the user must log in again.

## Boundary Decisions

1. Host credential files are not copied into the image.
2. Host home directories are not bind-mounted by default.
3. CLI versions are pinned at image build time.
4. Persistence is Docker-managed and per instance, not host-file-managed.
