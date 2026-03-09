# autobyteus-workspace

Monorepo workspace for the AutoByteus TypeScript platform.

## Workspace projects

- `autobyteus-web`
- `autobyteus-server-ts`
- `autobyteus-ts`
- `autobyteus-message-gateway`

## Setup

```bash
git clone https://github.com/AutoByteus/autobyteus-workspace.git
cd autobyteus-workspace
pnpm install
```

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
  - `.github/workflows/release-server-docker.yml`
- Triggers:
  - push tag `v*` (for example: `v1.1.8`)
  - manual run via `workflow_dispatch`
- Artifacts:
  - macOS ARM64 DMG + blockmap
  - Linux x64 AppImage + blockmap
  - Docker Hub server image for `linux/amd64,linux/arm64`
- Version/tag sync is mandatory:
  - `autobyteus-web/package.json` version must match release tag version (`vX.Y.Z`).
  - The release workflow enforces this and fails on mismatch.
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
# 1) Prepare the release (bump package version, commit, create tag, push branch+tag)
#    This starts both release workflows because the pushed tag matches v*.
pnpm release 1.2.7

# Optional manual build-only validation (no GitHub release publish)
pnpm release:test --ref personal

# Manual publish/update for an existing tag only
# Use this when you need to re-run publish for a tag that already exists.
pnpm release:manual-dispatch v1.2.7 --ref personal
```

Important:

- Do not run `release:manual-dispatch` immediately after a fresh `release` for the same version.
- `release` already pushes `vX.Y.Z`, and the tag push starts both `.github/workflows/release-desktop.yml` and `.github/workflows/release-server-docker.yml`.
- `release:manual-dispatch` is the manual recovery / re-publish path for an existing tag, not the normal second step of a new release.

Script file:
- `scripts/desktop-release.sh`

## License

This repository is licensed under [Apache License 2.0](./LICENSE).

Commercial use and modification are allowed. If you redistribute this software
or derivatives, keep the license and attribution notices (see [`NOTICE`](./NOTICE)).
