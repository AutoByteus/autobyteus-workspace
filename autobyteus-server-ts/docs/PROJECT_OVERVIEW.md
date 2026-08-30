# AutoByteus Server TS Project Overview

## Purpose

`autobyteus-server-ts` is the Node.js/TypeScript backend for AutoByteus. It provides GraphQL, REST, and WebSocket APIs and mirrors core behavior from the Python server with TS-native runtime patterns.

## Entry Point

- Main process start: `src/app.ts`
- Build output: `dist/app.js`

## API Surface

- GraphQL: `/graphql`
- REST: `/rest/*`
  - Phone Access management and pairing: `/rest/remote-access/*`
  - Memory Sync hub ingestion: `/rest/memory-sync/v1/*`
- Process-local MCP Streamable HTTP on a dedicated ephemeral loopback listener:
  - AutoByteus Agent Tools MCP Server: `/mcp/agent-tools/:sessionId`
- Mobile web/PWA static shell: `/mobile` and `/mobile/*`
- WebSocket:
  - `/ws/agent/:runId`
  - `/ws/agent-team/:teamRunId`
  - `/ws/terminal/:workspaceId/:sessionId`
  - `/ws/file-explorer/:workspaceId`

## Domain Areas

Major domains under `src/`:

- Agent definition and execution
- Agent team definition and execution
- Server-hosted Agent Tools MCP sessions for configured server-owned tools
- External-channel messaging ingress, bindings, and reply routing
- Prompt engineering
- Skills
- Shared Agent Work Trace Projection
- Manual Skill Improvement orchestration
- MCP server management
- LLM and multimedia model management
- Workspaces and file explorer
- Token usage and memory-centric conversation state
- Server-owned agent memory inspection, raw-trace-only Codex/Claude recording, and Memory Sync / Memory Hub imported-memory corpus support
- Agent artifacts
- Remote Access / Phone Access pairing, mobile auth, and mobile static app serving

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
- `features/memory_sync.md`
- `features/remote_access.md`
- `modules/README.md`
  - `modules/agent_work_traces.md`
  - `modules/skill_improvement.md`
  - `modules/agent_tools_mcp_server.md`
- `design/startup_initialization_and_lazy_services.md`
