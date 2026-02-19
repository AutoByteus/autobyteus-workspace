# autobyteus-workspace

Git super-repo for the AutobByteus TypeScript platform workspace.

## Included submodules

- `autobyteus-web`
- `autobyteus-server-ts`
- `autobyteus-ts`
- `autobyteus-message-gateway`

## Setup

```bash
git clone --recurse-submodules git@github.com:AutoByteus/autobyteus-workspace.git
cd autobyteus-workspace
pnpm install
```

If cloned without `--recurse-submodules`:

```bash
git submodule update --init --recursive
```

## Build examples

```bash
pnpm --filter autobyteus-web build
pnpm --filter autobyteus-server-ts build
pnpm --filter autobyteus-message-gateway build
```
