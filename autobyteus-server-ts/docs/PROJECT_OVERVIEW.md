# AutoByteus Server TS Project Overview

## Purpose

`autobyteus-server-ts` is the Node.js/TypeScript backend for AutoByteus. It provides GraphQL, REST, and WebSocket APIs and mirrors core behavior from the Python server with TS-native runtime patterns.

## Entry Point

- Main process start: `src/app.ts`
- Build output: `dist/app.js`

## API Surface

- GraphQL: `/graphql`
- REST: `/rest/*`
- WebSocket:
  - `/ws/agent/:agentId`
  - `/ws/agent-team/:teamId`
  - `/ws/terminal/:workspaceId/:sessionId`
  - `/ws/file-explorer/:workspaceId`

## Domain Areas

Major domains under `src/`:

- Agent definition and execution
- Agent team definition and execution
- Prompt engineering
- Skills and skill versioning
- MCP server management
- LLM and multimedia model management
- Workspaces and file explorer
- Token usage and memory-centric conversation state
- Agent artifacts

## Configuration Model

`AppConfig` resolves and owns:

- App root directory
- App data directory
- `.env` location
- DB/logs/download/memory/media/temp workspace paths
- Server public base URL

Important behavior:

- Custom app data dir must be set before `initialize()`.
- `AUTOBYTEUS_SERVER_HOST` is required for absolute URL generation.

## Startup Philosophy

- Critical: config initialization + migrations.
- Deferred/non-critical: cache preloading, registration, tool discovery.

This keeps startup robust while still warming caches shortly after boot.

## Documentation Index

- `ARCHITECTURE.md`
- `URL_GENERATION_AND_ENV_STRATEGY.md`
- `FILE_RENDERING_AND_MEDIA_PIPELINE.md`
- `modules/README.md`
- `design/startup_initialization_and_lazy_services.md`
