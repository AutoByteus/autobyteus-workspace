# Autobyteus TypeScript Examples

This folder contains non-interactive example utilities for the TypeScript version
of Autobyteus. The native `autobyteus-ts` CLI/TUI runners have been removed; use
the programmatic agent/team APIs or the server/web surfaces for interactive
workflows.

## How to Run

Enter the `autobyteus-ts/` folder first:

```bash
cd autobyteus-ts
```

Make sure dependencies are installed:

```bash
pnpm install
```

These examples import TypeScript modules that use `.js` specifiers (for ESM
parity), so they should be run from compiled output. Build once, then run the
generated JavaScript.

From `autobyteus-ts/`:

```bash
pnpm exec tsc -p tsconfig.examples.json
node dist-examples/examples/discover-status-transitions.js
```

## Available Examples

- Status transitions table (`examples/discover-status-transitions.ts`): prints
  the derived status transitions for representative agent runtime events.

## Environment

Examples will try to write logs under `./logs/` by default. You can override the
log file path with `AUTOBYTEUS_LOG_FILE` if you prefer a different location.

To reduce console noise, set `AUTOBYTEUS_LOG_LEVEL` to `warn`, `error`, or
`silent`:

```bash
AUTOBYTEUS_LOG_LEVEL=warn node dist-examples/examples/discover-status-transitions.js
```

To log everything to a file, set `AUTOBYTEUS_LOG_FILE`:

```bash
AUTOBYTEUS_LOG_LEVEL=debug AUTOBYTEUS_LOG_FILE=./logs/autobyteus.log \
  node dist-examples/examples/discover-status-transitions.js
```
