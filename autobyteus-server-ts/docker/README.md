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
- Antigravity CLI (`agy`)
- Grok CLI (`grok`)

## Quick Start

### No-clone users: public launcher

If you want to run the published image without cloning this repository, use the public launcher. It pulls `autobyteus/autobyteus-server:latest`, creates named volumes per node, chooses non-conflicting ports, and prints the Backend URL for **Nodes -> Manage Nodes -> Add Remote Node**.

Install the local launcher once:

macOS / Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/AutoByteus/autobyteus-workspace/personal/scripts/public/docker/autobyteus-docker.sh | bash -s -- install
```

Windows PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/AutoByteus/autobyteus-workspace/personal/scripts/public/docker/autobyteus-docker.ps1 | iex; autobyteus-docker install"
```

The installer writes the public launcher entry plus its adjacent platform
modules into the local install directory. Normal installed CLI usage therefore
does not require this repository checkout.

Then use direct local commands. `new-container` checks/pulls the image and creates the next indexed managed container:

```bash
autobyteus-docker new-container
```

The first node uses `autobyteus-server-0` as its friendly name and prefers these host ports when available: Backend `8001`, VNC `5908`, noVNC `6080`, and Chrome debug `9228`. If a port is busy, the launcher retries with fresh ports. Repeated `new-container` calls create `autobyteus-server-1`, `autobyteus-server-2`, and so on.

Use the printed Backend URL in **Nodes -> Manage Nodes -> Add Remote Node**, then
open that Docker node window over a trusted LAN, VPN, tailnet, or equivalent
private-network path. Desktop/Electron access to that node follows the trusted
private-network product model; do not expose the full backend directly to the
public internet. Phone pairing still issues separate `mra_...` mobile credentials,
and the server Docker image packages the `/mobile` web shell into
`autobyteus-server-ts/mobile-web` so the QR target is served by a fresh
container.

Each launcher-managed container keeps private Docker named volumes outside the
container writable layer and also gets host-visible user folders:

- `/home/autobyteus/data` remains private server app data in `<node>-data`.
- `/root` remains the private root home/auth volume in `<node>-root-home`.
- `/home/vncuser/.config/chromium` remains private Chromium browser profile
  state in `<node>-chromium-profile`.
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

Upgrade every managed Docker node while keeping named volumes. A plain upgrade
uses each node's saved image ref, so mixed fleets stay on their current image
line (for example, `latest` nodes stay on `latest` and `latest-zh` nodes stay
on `latest-zh`):

```bash
autobyteus-docker upgrade --all
```

**Release tracks: `latest` and `beta`**

- `latest` is the newest **stable** release. This is the default, and nodes on
  `latest` never receive beta images.
- `beta` always points to the **newest build**, beta or stable. It moves forward
  on every release tag and never moves back to an older build.

To follow betas, switch every managed node once. Later plain upgrades then
follow each newer build:

```bash
autobyteus-docker upgrade --all --tag beta   # once
autobyteus-docker upgrade --all              # later: pulls the newest build
```

To return to stable:

```bash
autobyteus-docker upgrade --all --tag latest
```

> **Caution:** only return to `latest` once a stable release **at least as new
> as the beta you are running** is available. While `latest` is older than
> your beta, switching back runs an older server on data that the newer
> version may already have migrated.

To intentionally retarget every managed node to a new tag or image, make that
explicit:

```bash
autobyteus-docker upgrade --all --tag latest-zh
autobyteus-docker upgrade --all --image autobyteus/custom-server:latest-zh
```

Remove every managed Docker node while keeping named volumes:

```bash
autobyteus-docker destroy --all
```

Remove one launcher-managed node, including stale launcher state left after a
manual `docker rm`, while keeping its named volumes and host workspaces. The
next `new-container` call reuses the lowest available indexed slot:

```bash
autobyteus-docker destroy --name autobyteus-server-5
autobyteus-docker new-container
```

Targeted destroy refuses ambiguous, conflicting, or unmanaged containers and
does not own Docker Buildx infrastructure. The builder created by
`build-multi-arch.sh` is removed through Buildx:

```bash
docker buildx rm multi-platform-builder
```

Reset to one fresh managed Docker node:

```bash
autobyteus-docker reset
```

Show the Backend URL again:

```bash
autobyteus-docker urls
```

### Memory Sync between Docker nodes and a hub

Launcher-managed Docker nodes can be Memory Sync sources or hubs. Add/open the
node in **Nodes -> Manage Nodes**, then use that node-bound window's
**Nodes -> Memory Sync** tab.

When the desktop embedded server is the hub and a Docker container is the
source, the hub's desktop loopback URL (`http://127.0.0.1:29695`) is usually not
reachable from inside the container. Use the Memory Hub URL candidates and choose
a source-reachable advertised URL such as `http://host.docker.internal:29695` on
Docker Desktop, or a LAN/VPN/tailnet URL if that is the trusted route. Then run
**Test connection** from the Docker source node before enabling background sync.
After source settings are saved, a blank token field tests the saved Docker
source configuration with its redacted saved token; paste a token only when you
want to test draft URL/source/token values before saving. The Source card shows
inline connection-test feedback plus `Current job` and `Last sync` status for
manual and background syncs.

When one Docker node is the hub for other Docker nodes, use the hub URL printed
by `autobyteus-docker urls` only if it is reachable from the source containers.
Otherwise provide the appropriate Docker network, host alias, LAN, VPN, or
tailnet route manually. Memory Sync uses hub-generated `mhub_...` source tokens;
copy them when created/regenerated because plaintext tokens are not shown again.

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
  -v autobyteus-server-chromium-profile:/home/vncuser/.config/chromium \
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
  - on startup, the product-managed built-in compactor agent `autobyteus-memory-compactor` is synced from the bundled template and selected when this setting is blank
  - configure a custom selected agent's instructions, runtime, model, and model config in the normal agent editor or package source; blank runtime/model defaults inherit from the triggering parent run, and required compaction fails clearly only when no selected definition exists or a required field is absent from both the selected definition and parent run
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

Codex CLI, Claude Code, Antigravity CLI and Grok CLI are preinstalled, not
pre-authenticated. Installation does not add or change AutoByteus runtime
selectors; runtime availability still depends on the existing integration and
provider configuration. ZCode and DSH are not included. The intended auth flow is:

1. start the container,
2. open the container environment through terminal/noVNC,
3. log in inside the container with:
   - `codex login`
   - `claude auth login`
   - `agy` (follow the provider sign-in flow)
   - `grok` (follow the provider sign-in flow)

Use the backend's root terminal, or `docker exec -it --user root <container> bash`
with `HOME=/root`. A terminal opened directly in the noVNC desktop can instead
run as `vncuser`; its login/configuration is separate from the root backend.

Antigravity settings normally live at
`/root/.gemini/antigravity-cli/settings.json`; its account authentication can
also depend on Linux Secret Service/DBus. Persisting `/root` alone does not prove
keyring-backed login durability. Follow the official
[Antigravity installation and authentication guide](https://antigravity.google/docs/cli/install/)
for browser sign-in or Gemini API-key configuration.

Grok uses `/root/.grok` by default (including `config.toml`); this image does not
set a runtime `GROK_HOME`. Start `grok` for browser sign-in, or supply your own
`XAI_API_KEY` at runtime as described in the
[Grok getting-started guide](https://docs.x.ai/build/overview).
Never put tokens or API keys in Docker build arguments or the image. No provider
login or inference is performed by the build checks.

Use `codex login` directly in the default container shell. The container runs as
`root`, so `sudo codex login` is not required in the normal Docker setup.

Browser-opening auth commands run from the root shell route through the packaged
VNC browser bridge. The image sets `BROWSER=/usr/local/bin/open-vnc-browser-url.sh`;
that helper switches to `vncuser` only from root, skips the switch when it is
already running as `vncuser`, clears inherited `BROWSER`, and dispatches to the
system `/usr/bin/xdg-open` inside the VNC desktop session. This keeps CLI
device-login URLs opening in the container's Chromium/noVNC session without
recursing back through the root bridge. Existing containers need to be recreated
or upgraded to pick up browser-bridge script changes from a rebuilt image.

The container runs as `root`, and `/root` is persisted in a Docker-managed named volume per launcher node or source-helper project. That means:

- auth state is isolated per Docker node/instance,
- file-backed configuration/auth state stored under `/root` survives normal
  restart and recreate for the same friendly node (provider keyrings or other
  external credential stores are not covered by this volume guarantee),
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
- `autobyteus-docker upgrade --all`: Recreate all managed containers with each node's saved image ref while keeping named volumes; pass `--tag` or `--image` only when intentionally retargeting every node.
- `autobyteus-docker destroy --all`: Remove all managed containers and unused old images while keeping named volumes.
- `autobyteus-docker destroy --name <node>`: Remove one uniquely proven managed server container and its launcher state while keeping named volumes and host workspaces; stale state is explicitly forgotten.
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

By default, the server Dockerfile asks npm for the current `latest` dist-tag of
the npm-distributed CLIs:

- `@openai/codex`
- `@anthropic-ai/claude-code`
- `@xai-official/grok`

Antigravity is acquired from its official latest-channel installer. Both new
commands are installed outside `/root`: `agy` in `/usr/local/bin`, and `grok`
as a global npm native executable. Build-only installer state is discarded;
version checks must succeed and print the resolved versions in the build log.
A failed latest installation fails the build instead of falling back to an old
home-installed copy.

The build scripts pass a changing `CLI_INSTALL_CACHE_BUSTER` build arg so the
CLI install layer is re-run during scripted builds instead of silently reusing a
stale Docker cache layer. This covers all four CLI installations, including
AGY's download; release CI uses the same cache-buster for default/zh builds.
Raw Docker/Compose builds can reuse the layer if cache inputs do not change:
pass a fresh `--build-arg CLI_INSTALL_CACHE_BUSTER=$(date -u +%Y%m%d%H%M%S)`
or use `--no-cache` to force acquisition.

"Latest" means the version resolved when the image is built, not a guarantee
that an already-running container tracks future releases. Rebuild (or pull a
newly built image) and recreate while keeping the existing root-home, server
data and Chromium volumes. No container-start installer or updater is added;
provider-managed self-updates are separate from image packaging. User shell
PATH customizations can still deliberately select a different executable;
check `command -v agy`, `command -v grok`, `agy --version` and `grok --version`
when troubleshooting. Do not delete auth volumes to refresh the commands.

The existing Codex/Claude version overrides remain available for an emergency
pin (AGY/Grok continue to resolve latest):

```bash
docker buildx build \
  --build-arg CODEX_CLI_VERSION=0.135.0 \
  --build-arg CLAUDE_CODE_VERSION=2.1.158 \
  -f autobyteus-server-ts/docker/Dockerfile.monorepo \
  .
```

## CLI Packaging Regression Checks

From the repository root, run the network-free packaging checks:

```bash
python3 -m unittest discover -s scripts/tests -p 'test_server_docker*.py' -v
python3 -m unittest discover -s scripts/tests -p test_docker_build_context_sources.py -v
```

For a locally built **full production image**, run the opt-in offline check:

```bash
python3 scripts/tests/server_docker_cli_smoke.py --image <local-image> --platform linux/arm64
```

Repeat for `linux/amd64` and the default/`zh` variants as appropriate. The harness
neither builds nor pulls images. It checks native command resolution and versions
for all four CLIs in clean/reused-home default and root login shells, preserving
synthetic home/data/browser markers. It owns and removes its temporary containers
and volumes; no user credentials or existing volumes are used. This is not a
server-startup, full noVNC UI, authentication/keyring, or inference test.

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
- Default prereleases such as `v1.2.3-beta.1` publish:
  - `<image>:1.2.3-beta.1`
- Default releases, stable or beta, then move the forward-only `<image>:beta`
  tag to the version image just pushed. This happens only when the tag is the
  newest recognized release tag (`vX.Y.Z` or `vX.Y.Z-beta.N`, checked with
  `scripts/release_versions.py is-newest` after a fresh tag fetch).
  - A manual re-publish of an older tag leaves `:beta` on the newer build.
  - If a newer tag's build fails, `:beta` stays one build behind until that
    run is re-run.
  - The `zh` variant has no `beta` tag.
- Manual `workflow_dispatch` runs can publish only the `zh` runtime variant by enabling `publish_zh`.
- Stable manual `zh` publishes use:
  - `<image>:<version>-zh`
  - `<image>:latest-zh`
- Manual `zh` prereleases use:
  - `<image>:1.2.3-beta.1-zh`

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
- `<node-name>-root-home`: in-container root home, including file-backed CLI configuration/auth state (see CLI Auth Model)
- `<node-name>-chromium-profile`: private Chromium browser profile state at `/home/vncuser/.config/chromium` (cookies, local storage, preferences)

Public launcher host bind mounts (additional, per friendly node unless noted):
- `$HOME/.autobyteus/docker-server/shared-workspace/nodes/<node-name>` on macOS/Linux, or `%LOCALAPPDATA%\AutoByteus\docker-server\shared-workspace\nodes\<node-name>` on Windows, to `/home/autobyteus/workspace`.
- `$HOME/.autobyteus/docker-server/shared-workspace/shared` on macOS/Linux, or `%LOCALAPPDATA%\AutoByteus\docker-server\shared-workspace\shared` on Windows, to `/home/autobyteus/shared` for every managed node.
- Override the host root with `AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR`.

Source helper named volumes (per Compose project):
- `<project>_autobyteus-server-workspace`: built artifacts
- `<project>_autobyteus-server-data`: `.env`, SQLite DB, logs, media, memory
- `<project>_autobyteus-server-root-home`: in-container root home, including file-backed CLI configuration/auth state (see CLI Auth Model)
- `<project>_autobyteus-server-chromium-profile`: private Chromium browser profile state at `/home/vncuser/.config/chromium`

Server data directory in container: `/home/autobyteus/data`

The launcher leaves `/home/autobyteus/data` as private app/server state. Do not
bind-mount over that directory for the normal workflow; use
`/home/autobyteus/workspace` for node-specific user files and
`/home/autobyteus/shared` for cross-node collaboration. Adding or changing
Docker bind mounts on an existing container requires recreation, but
`autobyteus-docker workspace apply --all` keeps existing named volumes and host
folders. On Linux, files written from the current root-running container may be
root-owned on the host.

**Destructive reset, not an upgrade step:** removing source-helper project
volumes also deletes persisted server data, root-home CLI state and browser
profile state. Back up anything needed first. Do not use this to refresh CLI
binaries or as a routine provider logout:

```bash
./docker-start.sh down --volumes
```
