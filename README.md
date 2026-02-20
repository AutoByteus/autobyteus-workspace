# autobyteus-workspace

Git super-repo for the AutobByteus TypeScript platform workspace.

## Included submodules

- `autobyteus-web`
- `autobyteus-server-ts`
- `autobyteus-ts`
- `autobyteus-message-gateway`

## Setup

```bash
git clone --recurse-submodules https://github.com/AutoByteus/autobyteus-workspace.git
cd autobyteus-workspace
pnpm install
```

If cloned without `--recurse-submodules`:

```bash
git submodule update --init --recursive
```

## Shared Git Hooks (optional)

This repo includes committed hooks in `.githooks/`.

To enable hooks for the current worktree:

```bash
pnpm hooks:install
```

Behavior after install:

- On branch switch to `personal` or `enterprise`, submodules are auto-aligned to the same profile branch when possible.
- Dirty submodules are skipped for safety.

Note: Hook configuration is local to your machine/worktree and is not automatically enabled by clone.

## Build examples

```bash
pnpm --filter autobyteus-web build
pnpm --filter autobyteus-server-ts build
pnpm --filter autobyteus-message-gateway build
```

## Release workflow

- Workflow file: `.github/workflows/release-desktop.yml`
- Triggers:
  - push tag `v*` (for example: `v1.1.8`)
  - manual run via `workflow_dispatch`
- Artifacts:
  - macOS ARM64 DMG + blockmap
  - Linux x64 AppImage + blockmap
- For private submodules, set repository secret `SUBMODULES_TOKEN` with read access to submodule repos.
