# AutoByteus Server TS Documentation

This directory is the TypeScript counterpart of `autobyteus-server/docs`.

The goal is to keep architecture and module docs close to the actual Node.js/TypeScript runtime in `autobyteus-server-ts/src`, while preserving the same documentation shape used by the Python server.

## Structure

- `ARCHITECTURE.md`: system-level architecture for the TS server.
- `PROJECT_OVERVIEW.md`: runtime lifecycle, transport layers, and development flow.
- `URL_GENERATION_AND_ENV_STRATEGY.md`: base URL strategy and environment ownership.
- `FILE_RENDERING_AND_MEDIA_PIPELINE.md`: media and file-serving pipeline.
- `modules/`: per-module design docs.
- `design/`: focused ADR-style design notes.
  - Includes `design/agent_team_communication_local_and_distributed.md` for full local/distributed team communication flow.
- `features/`: feature-level documents.

## Important Runtime Constraint

Initialization order is critical in the TS server:

1. Parse CLI args.
2. Set custom app data directory (`--data-dir`) if provided.
3. Initialize `AppConfig`.
4. Run migrations and start transport layers.

This ordering exists because configuration and database clients depend on environment and path state that must be finalized before services are instantiated.

See `design/startup_initialization_and_lazy_services.md` for details.

## Source of Truth

These docs should reflect the current implementation in:

- `autobyteus-server-ts/src`
- `autobyteus-server-ts/tests`

When implementation and docs diverge, implementation is authoritative until docs are updated.
