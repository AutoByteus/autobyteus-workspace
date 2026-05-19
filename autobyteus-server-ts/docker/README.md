# AutoByteus Server Docker

This is the Docker stack for `autobyteus-server-ts`.
It was moved from `autobyteus_dev_docker/server-only` so the runtime config
now lives with the TypeScript server codebase.

This setup runs `autobyteus-server-ts` in Docker.
It automatically clones and builds the required workspace dependencies:

- `autobyteus-server-ts`
- `autobyteus-ts`

The runtime image also ships with:

- Codex CLI
- Claude Code

## Quick Start

### No-clone users: public launcher

If you want to run the published image without cloning this repository, use the public launcher. It pulls `autobyteus/autobyteus-server:latest`, creates named volumes per node, chooses non-conflicting ports, and prints the Backend URL for **Settings → Nodes → Add Remote Node**.

Install the local launcher once:

macOS / Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/AutoByteus/autobyteus-workspace/personal/scripts/public/docker/autobyteus-docker.sh | bash -s -- install
```

Windows PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/AutoByteus/autobyteus-workspace/personal/scripts/public/docker/autobyteus-docker.ps1 | iex; autobyteus-docker install"
```

Then use direct local commands. `new-container` checks/pulls the image and creates the next indexed managed container:

```bash
autobyteus-docker new-container
```

The first node uses `autobyteus-server-0` as its friendly name and prefers these host ports when available: Backend `8001`, VNC `5908`, noVNC `6080`, and Chrome debug `9228`. If a port is busy, the launcher retries with fresh ports. Repeated `new-container` calls create `autobyteus-server-1`, `autobyteus-server-2`, and so on.

Each launcher-managed container keeps the existing private Docker named volumes
and also gets host-visible user folders:

- `/home/autobyteus/data` remains private server app data in `<node>-data`.
- `/root` remains the private root home/auth volume in `<node>-root-home`.
- `/home/autobyteus/workspace` is the node's host-backed user workspace.
- `/home/autobyteus/shared` is one host-backed folder shared by all managed
  Docker nodes.

The shared workspace host root defaults to
`$HOME/.autobyteus/docker-server/shared-workspace` on macOS/Linux and
`%LOCALAPPDATA%\AutoByteus\docker-server\shared-workspace` on Windows. Override
it with `AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR` if needed. The launcher sets
`AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace`, so default
terminal/agent work appears in the node workspace.

Inspect paths and storage:

```bash
autobyteus-docker workspace paths
autobyteus-docker storage
```

Apply the host bind mounts to existing managed containers with a safe recreate
that keeps named volumes and host folders:

```bash
autobyteus-docker workspace apply --all
```

Existing files under `/home/autobyteus/data/temp_workspace` remain in the data
named volume, but `/home/autobyteus/workspace` becomes the default temp
workspace after apply.

Upgrade every managed Docker node to the latest image while keeping named volumes:

```bash
autobyteus-docker upgrade --all
```

Remove every managed Docker node while keeping named volumes:

```bash
autobyteus-docker destroy --all
```

Reset to one fresh managed Docker node:

```bash
autobyteus-docker reset
```

Show the Backend URL again:

```bash
autobyteus-docker urls
```

Stop the default node without removing named volumes:

```bash
autobyteus-docker stop
```

Launcher state is stored outside the source tree:

- macOS / Linux default: `$HOME/.autobyteus/docker-server`
- Windows default: `%LOCALAPPDATA%\AutoByteus\docker-server`
- Override: `AUTOBYTEUS_DOCKER_STATE_DIR`

### Source checkout users: developer helper

If you have this repository locally, the `docker-start.sh` source helper remains available for local builds, source-checkout development, and release-image refresh testing:

```bash
cd autobyteus-server-ts/docker

# Start default server from local source build
./docker-start.sh up

# Start from the published remote release image instead of building locally
./docker-start.sh up --pull-remote

# Show mapped ports and URLs
./docker-start.sh ports
```

The source helper uses Docker Compose project names internally and stores project state under `autobyteus-server-ts/docker/.runtime/`. Packaged app users should use the public launcher above instead.

### Advanced direct Docker fallback

If you cannot use the launcher, the low-level `docker run` shape is:

```bash
docker run -d \
  --name autobyteus-server \
  --restart unless-stopped \
  --cap-add SYS_ADMIN \
  --security-opt seccomp=unconfined \
  -p 8001:8000 \
  -p 5908:5900 \
  -p 6080:6080 \
  -p 9228:9223 \
  -e AUTOBYTEUS_SERVER_HOST=http://localhost:8001 \
  -e AUTOBYTEUS_VNC_SERVER_HOSTS=localhost:6080 \
  -v autobyteus-server-workspace:/app/autobyteus-server-ts/workspace \
  -v autobyteus-server-data:/home/autobyteus/data \
  -v autobyteus-server-root-home:/root \
  autobyteus/autobyteus-server:latest
```

This direct command is intentionally not the primary no-clone path because it has fixed ports and no multi-node state management.

## Compaction Runtime Settings

You can preseed the production compaction behavior with environment variables at
container start, or edit the same values later from **Settings → Server Settings
→ Compaction config**.

Optional compaction settings:

- `AUTOBYTEUS_COMPACTION_TRIGGER_RATIO`
  - decimal trigger ratio for post-response compaction checks
  - default runtime behavior is `0.8`
- `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`
  - agent definition id for the memory compactor agent
  - on startup, a normal shared default compactor agent `autobyteus-memory-compactor` is seeded and selected when this setting is blank
  - configure the selected/default agent's instructions, runtime, model, and model config in the normal agent editor; if those launch defaults are still missing, required compaction fails clearly instead of falling back to the active run model
- `AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE`
  - optional lower effective context ceiling in tokens
  - useful when a provider fails before its advertised maximum context
- `AUTOBYTEUS_COMPACTION_DEBUG_LOGS`
  - set to `true` / `1` / `yes` / `on` to enable detailed compaction budget and result logs

Example:

```bash
docker run -d \
  --name autobyteus-server \
  -p 8001:8000 \
  -e AUTOBYTEUS_SERVER_HOST=http://localhost:8001 \
  -e AUTOBYTEUS_COMPACTION_TRIGGER_RATIO=0.8 \
  -e AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID=your-compactor-agent-definition-id \
  -e AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE=64000 \
  -e AUTOBYTEUS_COMPACTION_DEBUG_LOGS=true \
  autobyteus/autobyteus-server:latest
```

These settings affect subsequent runtime budget checks and visible compactor-agent
runs. They do not interrupt an already in-flight model stream.

For LM Studio and Ollama, the runtime also hardens long-running local requests
in code: idle transport body/header timeouts are disabled for those adapters,
and LM Studio uses a high finite SDK request timeout instead of the shorter
default. There is currently no separate env knob for that transport policy. If
a local runtime still fails under large prompts, lower
`AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE` first.

## CLI Auth Model

Codex CLI and Claude Code are preinstalled in the image. The intended auth flow is:

1. start the container,
2. open the container environment through terminal/noVNC,
3. log in inside the container with:
   - `codex login`
   - `claude auth login`

Use `codex login` directly in the default container shell. The container runs as
`root`, so `sudo codex login` is not required in the normal Docker setup.

The container runs as `root`, and `/root` is persisted in a Docker-managed named volume per launcher node or source-helper project. That means:

- auth state is isolated per Docker node/instance,
- auth state survives normal restart and recreate for the same friendly node,
- auth state is removed only if you explicitly remove that node's volumes.

Host credential folders are not mounted into the container by default.

Claude Agent SDK runtime sessions automatically load Claude Code filesystem
settings sources (`user`, `project`, and `local`). The `user` source means
`~/.claude/settings.json` for the OS user running the AutoByteus server process.
In this Docker image the server runs as `root`, so that path is normally
`/root/.claude/settings.json` inside the container. Mount or persist `/root` (as
the quick-start example does) if you want Claude Code gateway/model settings to
survive container recreation.

## Management Commands

Public launcher commands for no-clone users:

- `autobyteus-docker install`: Install or replace the local launcher without touching Docker containers, volumes, or state.
- `autobyteus-docker new-container`: Check/pull the configured image and create the next indexed managed Docker node (`autobyteus-server-0`, `autobyteus-server-1`, ...).
- `autobyteus-docker upgrade --all`: Recreate all managed containers with the latest image while keeping named volumes.
- `autobyteus-docker destroy --all`: Remove all managed containers and unused old images while keeping named volumes.
- `autobyteus-docker reset`: Destroy all managed containers, keep volumes, then create a fresh `autobyteus-server-0`.
- `autobyteus-docker workspace paths`: Show the host folders backing `/home/autobyteus/workspace` and `/home/autobyteus/shared`.
- `autobyteus-docker workspace apply --all`: Safely recreate managed containers to apply shared workspace bind mounts while keeping named volumes.
- `autobyteus-docker storage`: Show private named volumes, host bind mounts, and launcher state.
- `autobyteus-docker urls`: Show Backend/noVNC/VNC/debug URLs for `autobyteus-server-0` by default.
- `autobyteus-docker status`: Show managed launcher nodes.
- `autobyteus-docker logs`: Show Docker logs for `autobyteus-server-0` by default.
- `autobyteus-docker stop`: Stop `autobyteus-server-0` by default without removing named volumes.
- `autobyteus-docker stop --all`: Stop all launcher-managed nodes without removing named volumes.

Source helper commands for cloned-repository development:

- `./docker-start.sh ps`: Show source-helper instances and their names.
- `./docker-start.sh logs`: Tail logs for an instance.
- `./docker-start.sh ports`: Show mapped ports and URLs for an instance.
- `./docker-start.sh down`: Stop an instance.
- `./docker-start.sh down --delete-state`: Stop and remove saved port configuration.
- `./docker-start.sh up --pull-remote`: Pull the published Docker Hub release image, refresh the local compose alias if the remote digest is newer, and recreate the container only when needed.
- `./docker-start.sh up --build-local`: Explicit alias for the default local-build behavior.

## Release Image Refresh

The compose stack uses a local image name, `autobyteus-server:<tag>`, even when you want to consume the published Docker Hub release.

For release consumption, prefer:

```bash
cd autobyteus-server-ts/docker
./docker-start.sh up --pull-remote
```

That mode pulls `autobyteus/autobyteus-server:<tag>`, compares it against the local alias, retags the local compose image when the remote digest is newer, and force-recreates the container only when an update is actually needed.

If you are developing locally and want source changes to drive the container, use:

```bash
cd autobyteus-server-ts/docker
./docker-start.sh up
```

## Manual Build (Advanced)

If you only want to build the image without starting it:

```bash
./build.sh
./build.sh --variant zh
```

## Multi-Arch Release Image

For a publishable image that is fully built at image-build time, use the multi-arch script:

```bash
./build-multi-arch.sh --push
./build-multi-arch.sh --push --variant zh
```

Default target image is:

- `autobyteus/autobyteus-server:<version>-<variant>`
- `autobyteus/autobyteus-server:latest-<variant>`

## GitHub Release Automation

Workflow file: `.github/workflows/release-server-docker.yml`

What it does:
- Triggers on Git tags (e.g. `v1.2.3`).
- Builds `docker/Dockerfile.monorepo` for `linux/amd64,linux/arm64`.
- Push-tag releases publish only the default runtime image.
- Stable default releases publish:
  - `<image>:<version>`
  - `<image>:latest`
- Default prereleases such as `v1.2.3-rc1` publish:
  - `<image>:1.2.3-rc1`
- Manual `workflow_dispatch` runs can publish only the `zh` runtime variant by enabling `publish_zh`.
- Stable manual `zh` publishes use:
  - `<image>:<version>-zh`
  - `<image>:latest-zh`
- Manual `zh` prereleases use:
  - `<image>:1.2.3-rc1-zh`

Required GitHub repository secrets:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

Optional GitHub repository variable:

- `DOCKERHUB_IMAGE_NAME`

Default image name:

- `autobyteus/autobyteus-server`

Manual republish:

- Run the `Server Docker Release` workflow with `workflow_dispatch`.
- Provide `release_tag`.
- Optionally provide `release_ref` if you need to rebuild an existing release tag from a different branch or SHA after a workflow-only fix.
- Optionally provide `image_name` if you want to override the default repository.
- Enable `publish_zh` when you want the manual run to publish the `zh` variant instead of the default image.

## Endpoints (Default When Available)

- GraphQL: `http://localhost:8001/graphql`
- REST: `http://localhost:8001/rest/*`
- WS: `ws://localhost:8001/ws/...`
- VNC: `localhost:5908`
- noVNC: `http://localhost:6080`
- Chrome debug proxy: `localhost:9228`

## Data and Persistence

Public launcher named volumes (per friendly node):
- `<node-name>-workspace`: built artifacts
- `<node-name>-data`: private server app data at `/home/autobyteus/data` (`.env`, SQLite DB, logs, media, memory, agents, skills, workspaces)
- `<node-name>-root-home`: in-container root home, including Codex/Claude auth state

Public launcher host bind mounts (additional, per friendly node unless noted):
- `$HOME/.autobyteus/docker-server/shared-workspace/nodes/<node-name>` on macOS/Linux, or `%LOCALAPPDATA%\AutoByteus\docker-server\shared-workspace\nodes\<node-name>` on Windows, to `/home/autobyteus/workspace`.
- `$HOME/.autobyteus/docker-server/shared-workspace/shared` on macOS/Linux, or `%LOCALAPPDATA%\AutoByteus\docker-server\shared-workspace\shared` on Windows, to `/home/autobyteus/shared` for every managed node.
- Override the host root with `AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR`.

Source helper named volumes (per Compose project):
- `<project>_autobyteus-server-workspace`: built artifacts
- `<project>_autobyteus-server-data`: `.env`, SQLite DB, logs, media, memory
- `<project>_autobyteus-server-root-home`: in-container root home, including Codex/Claude auth state

Server data directory in container: `/home/autobyteus/data`

The launcher leaves `/home/autobyteus/data` as private app/server state. Do not
bind-mount over that directory for the normal workflow; use
`/home/autobyteus/workspace` for node-specific user files and
`/home/autobyteus/shared` for cross-node collaboration. Adding or changing
Docker bind mounts on an existing container requires recreation, but
`autobyteus-docker workspace apply --all` keeps existing named volumes and host
folders. On Linux, files written from the current root-running container may be
root-owned on the host.

To reset Codex/Claude login for a source-helper instance, remove the project volumes:

```bash
./docker-start.sh down --volumes
```
