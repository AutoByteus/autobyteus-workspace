# Release Notes — Memory Compactor and Built-In Agent Cleanup

## Improvements

- Updated the built-in Memory Compactor prompt so it uses clearer user-facing instructions: summarize earlier work so the same agent can continue later without rereading the full history.
- Built-in internal agents now sync from bundled templates on startup for the product-managed `autobyteus-memory-compactor` and `autobyteus-skill-evolver` ids.
- Memory compaction task prompts now describe the required final JSON shape directly instead of relying on older backend/internal output-contract wording.

## Cleanup

- Removed the generic agent Duplicate/Fork path from the backend GraphQL/API/service/provider layers and frontend UI/store/generated client.
- Documented that app-data edits to product-managed built-in agent ids are overwritten by startup sync; custom compactor behavior should use a separate user/package-managed agent selected by setting.

## Validation

- Verified with targeted backend GraphQL E2E, frontend AgentDetail/integration tests, built-in-agent unit tests, memory compaction unit tests, docs checks, static grep for removed Duplicate/Fork artifacts, and a local personal macOS Electron rebuild.
