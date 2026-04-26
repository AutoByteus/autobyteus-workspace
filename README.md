# autobyteus-workspace

Monorepo workspace for the AutoByteus TypeScript platform.

## Workspace projects

- `autobyteus-web`
- `autobyteus-server-ts`
- `autobyteus-ts`
- `autobyteus-message-gateway`
- `autobyteus-application-sdk-contracts`
- `autobyteus-application-frontend-sdk`
- `autobyteus-application-backend-sdk`
- `autobyteus-application-devkit`
- `applications/*` sample application source projects

## Setup

```bash
git clone https://github.com/AutoByteus/autobyteus-workspace.git
cd autobyteus-workspace
pnpm install
```

## Custom application development

New external custom applications should start with the reusable
`@autobyteus/application-devkit` CLI and the canonical source/output layout:

- editable source under `src/frontend`, `src/backend`, optional `src/agents`,
  and optional `src/agent-teams`;
- generated importable packages under `dist/importable-package/applications/<app-id>/`;
- runtime package folders named `ui/` and `backend/` only inside the generated
  package root expected by AutoByteus import.

Full guide:
- [`docs/custom-application-development.md`](docs/custom-application-development.md)

## Run The Published Server Docker

If you want to start the released server image without cloning this repository, run it directly from Docker Hub:

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

Useful endpoints after startup:

```text
GraphQL: http://localhost:8001/graphql
REST:    http://localhost:8001/rest/*
WS:      ws://localhost:8001/ws/...
noVNC:   http://localhost:6080
VNC:     localhost:5908
```

Stop it with:

```bash
docker stop autobyteus-server
```

If you already cloned this repository, you can use the helper script instead:

```bash
cd autobyteus-server-ts/docker
./docker-start.sh up --pull-remote
./docker-start.sh ports
```

Full guide:
- [`autobyteus-server-ts/docker/README.md`](autobyteus-server-ts/docker/README.md)

## All-in-one Docker startup (personal branch)

Use these commands from the repo root:

```bash
./scripts/personal-docker.sh up
./scripts/personal-docker.sh ports
```

Default `up` behavior includes one remote node, fixture seeding, and post-start sync.
If you only want the main all-in-one container:

```bash
./scripts/personal-docker.sh up -r 0 --no-seed-test-fixtures --no-sync-remotes
```

Stop stack:

```bash
./scripts/personal-docker.sh down
```

Full guide:
- [`docker/README.md`](docker/README.md)

## Build examples

```bash
pnpm --filter autobyteus-web build
pnpm --filter autobyteus-server-ts build
pnpm --filter autobyteus-message-gateway build
```

## Testing (Codex Runtime)

For Codex-related tickets, run backend tests with Codex live transport enabled.
Without this env var, Codex live E2E suites are skipped.

```bash
RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts test -- --run
pnpm -C autobyteus-web test
```

## Runtime Sandbox Overrides

If you want the native coding runtimes to run without sandbox restrictions, use these environment variables:

- Codex runtime: `CODEX_APP_SERVER_SANDBOX=danger-full-access`
  - Supported values: `read-only`, `workspace-write`, `danger-full-access`
  - Default: `workspace-write`
- Claude Agent SDK runtime: `CLAUDE_AGENT_SDK_PERMISSION_MODE=bypassPermissions`
  - Supported values: `default`, `plan`, `acceptEdits`, `bypassPermissions`
  - Default: `default`
  - The parser also accepts `bypass-permissions` and `bypass_permissions`

Example:

```bash
CODEX_APP_SERVER_SANDBOX=danger-full-access \
CLAUDE_AGENT_SDK_PERMISSION_MODE=bypassPermissions \
pnpm -C autobyteus-server-ts dev
```

## Android (Termux) Quick Start

Run inside Termux:

```bash
pnpm android:bootstrap
pnpm android:server:start
```

Useful commands:

```bash
pnpm android:bootstrap:check
pnpm android:server:start:bg
pnpm android:server:status
pnpm android:server:stop
```

## Release workflow

- Workflow files:
  - `.github/workflows/release-desktop.yml`
  - `.github/workflows/release-messaging-gateway.yml`
  - `.github/workflows/release-server-docker.yml`
- Triggers:
  - push tag `v*` (for example: `v1.1.8`)
  - manual run via `workflow_dispatch`
- Artifacts:
  - macOS ARM64 DMG + blockmap
  - Linux x64 AppImage + blockmap
  - managed messaging runtime package assets on the same GitHub Release
  - Docker Hub server image for `linux/amd64,linux/arm64`
- Release notes:
  - GitHub Releases use curated user-facing notes from `.github/release-notes/release-notes.md` when that file exists in the tagged revision.
  - The release helper prepares that file from the ticket `release-notes.md`.
  - Historical tags that predate the curated file fall back to GitHub generated notes during manual republish.
- Version/tag sync is mandatory:
  - `autobyteus-web/package.json` and `autobyteus-message-gateway/package.json` versions must both match the release tag version (`vX.Y.Z`).
  - The release helper synchronizes both package versions and the bundled managed messaging manifest before tagging.
  - The desktop and messaging-gateway release workflows enforce those checks and fail on mismatch.
- Server Docker tags:
  - stable release tags publish `autobyteus/autobyteus-server:X.Y.Z` and `autobyteus/autobyteus-server:latest`
  - prerelease tags such as `v1.2.7-rc1` publish only `autobyteus/autobyteus-server:1.2.7-rc1`
- Required GitHub repository secrets for Docker Hub publish:
  - `DOCKERHUB_USERNAME`
  - `DOCKERHUB_TOKEN`
- Optional GitHub repository variable:
  - `DOCKERHUB_IMAGE_NAME`
  - use this if the image repo should not be `autobyteus/autobyteus-server`
- No git submodules are required in this workspace.

### Consistent release commands

Use the release helper script from repo root:

```bash
# Normal new personal release:
# 1) Write short functional release notes in the ticket, for example:
#    tickets/done/<ticket-name>/release-notes.md
# 2) Prepare the release (bump desktop + gateway package versions, sync curated notes and managed messaging manifest, commit, create tag, push branch+tag)
#    This starts the desktop, messaging-gateway, and server Docker release workflows because the pushed tag matches v*.
pnpm release 1.2.7 -- --release-notes tickets/done/<ticket-name>/release-notes.md

# Optional manual build-only validation (no GitHub release publish)
pnpm release:test --ref personal

# Manual publish/update for an existing tag only
# Use this when you need to re-run publish for a tag that already exists.
pnpm release:manual-dispatch v1.2.7 --ref personal
```

Important:

- Do not run `release:manual-dispatch` immediately after a fresh `release` for the same version.
- `release` already pushes `vX.Y.Z`, and the tag push starts `.github/workflows/release-desktop.yml`, `.github/workflows/release-messaging-gateway.yml`, and `.github/workflows/release-server-docker.yml`.
- `release:manual-dispatch` is the manual recovery / re-publish path for an existing tag, not the normal second step of a new release.
- Curated release notes should stay user-facing and functional only; use `.github/release-notes/template.md` as the repo-level format reference.

Script file:
- `scripts/desktop-release.sh`

## License

This repository is licensed under [Apache License 2.0](./LICENSE).

Commercial use and modification are allowed. If you redistribute this software
or derivatives, keep the license and attribution notices (see [`NOTICE`](./NOTICE)).
