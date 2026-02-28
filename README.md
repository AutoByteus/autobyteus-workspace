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

- Workflow file: `.github/workflows/release-desktop.yml`
- Triggers:
  - push tag `v*` (for example: `v1.1.8`)
  - manual run via `workflow_dispatch`
- Artifacts:
  - macOS ARM64 DMG + blockmap
  - Linux x64 AppImage + blockmap
- No git submodules are required in this workspace.

## License

This repository is licensed under [Apache License 2.0](./LICENSE).

Commercial use and modification are allowed. If you redistribute this software
or derivatives, keep the license and attribution notices (see [`NOTICE`](./NOTICE)).
