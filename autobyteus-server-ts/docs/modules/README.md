# Module Documentation (TypeScript)

This directory mirrors the module documentation layout used in `autobyteus-server/docs/modules`, adapted to TypeScript source locations.

## Module Index

| Module | TS Documentation |
| --- | --- |
| Agent Artifacts | [agent_artifacts.md](./agent_artifacts.md) |
| Agent Customization | [agent_customization.md](./agent_customization.md) |
| Agent Definition | [agent_definition.md](./agent_definition.md) |
| Agent Execution | [agent_execution.md](./agent_execution.md) |
| Agent Streaming | [agent_streaming.md](./agent_streaming.md) |
| Agent Team Definition | [agent_team_definition.md](./agent_team_definition.md) |
| Agent Team Execution | [agent_team_execution.md](./agent_team_execution.md) |
| Agent Tools | [agent_tools.md](./agent_tools.md) |
| Applications | [applications.md](./applications.md) |
| Codex Integration | [codex_integration.md](./codex_integration.md) |
| File Explorer | [file_explorer.md](./file_explorer.md) |
| File Search | [file_search.md](./file_search.md) |
| LLM Management | [llm_management.md](./llm_management.md) |
| MCP Server Management | [mcp_server_management.md](./mcp_server_management.md) |
| Multimedia Management | [multimedia_management.md](./multimedia_management.md) |
| Prompt Engineering | [prompt_engineering.md](./prompt_engineering.md) |
| Search | [search.md](./search.md) |
| Skill Versioning | [skill_versioning.md](./skill_versioning.md) |
| Skills | [skills.md](./skills.md) |
| Terminal | [terminal.md](./terminal.md) |
| Token Usage | [token_usage.md](./token_usage.md) |
| WebSocket Session Design | [websocket_session_design.md](./websocket_session_design.md) |
| Workspace File Explorer | [WORKSPACE_FILE_EXPLORER.md](./WORKSPACE_FILE_EXPLORER.md) |
| Workspaces | [workspaces.md](./workspaces.md) |

## Common TS Patterns

- Services expose `getInstance()` or accessor functions.
- Cached providers decorate persistence providers for read-heavy flows.
- GraphQL resolvers in `src/api/graphql/types` are thin adapters over services.
- Startup registration and background initialization run through `src/startup`.
- `workflow-definition` is no longer an active module in the current codebase.

## Related Docs

- [Architecture](../ARCHITECTURE.md)
- [Project Overview](../PROJECT_OVERVIEW.md)
- [URL Strategy](../URL_GENERATION_AND_ENV_STRATEGY.md)
- [Startup/Lazy Initialization](../design/startup_initialization_and_lazy_services.md)
