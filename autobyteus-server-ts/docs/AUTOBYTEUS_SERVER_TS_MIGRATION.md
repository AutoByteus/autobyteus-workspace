# AutoByteus Server TS Migration Notes

## Purpose

This file tracks high-level parity goals between `autobyteus-server` (Python) and `autobyteus-server-ts` (TypeScript), with focus on runtime behavior and architecture.

## Current Direction

- Preserve domain layering and service boundaries.
- Prefer explicit singleton accessors over eager module-level singleton exports.
- Keep startup ordering deterministic (`data-dir` -> config init -> migrations -> transports).
- Maintain GraphQL/REST/WebSocket API parity where practical.

## Documentation Migration

Python docs live in:

- `autobyteus-server/docs`

TypeScript counterparts now live in:

- `autobyteus-server-ts/docs`

Module docs are mirrored in:

- `autobyteus-server-ts/docs/modules`

## Known Parity Differences

- Python uses `SingletonMeta`; TS uses `getInstance()` and accessor functions.
- Some TS modules are still being expanded while preserving API compatibility.
