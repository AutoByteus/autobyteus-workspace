## Fixes

- Tool Details now shows nested object-parameter fields, so `generate_speech.generation_config` exposes model-specific options such as `voice`, `format`, and `instructions` under the parent `generation_config` argument.
- Reload Schema now refreshes an already-open Tool Details modal from the returned tool definition without requiring close/reopen.

## Improvements

- Tool GraphQL parameter definitions now include per-parameter JSON Schema metadata for frontend schema display.
- Regenerated the frontend GraphQL artifact from the updated backend schema so generated operation types include `ToolParameterDefinition.jsonSchema`.
- Frontend Tools/MCP documentation now records nested tool-parameter display and reload synchronization behavior.
