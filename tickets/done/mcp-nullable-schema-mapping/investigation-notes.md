# Investigation Notes: MCP Nullable Schema Mapping

- Status: Current
- Date: 2026-06-22
- Scope triage: Small

## Goals / Questions

1. Confirm whether the upstream `autobyteus-image-audio` MCP schema for `generate_video.input_images` is correct from an MCP/JSON Schema perspective.
2. Identify where the schema is changed from nullable array/object into string.
3. Confirm how the configured MCP tool is exposed through the Agent Tools MCP layer and where validation fails.
4. Decide the smallest correct implementation scope for the fix.

## User-Observed Failure

- First `generate_video` call sent `input_images` as a string because the exposed tool schema appeared to be string-like. Python FastMCP/Pydantic rejected it with `input_images Input should be a valid list`.
- Second call sent `input_images` as an array, but AutoByteus TypeScript rejected it before reaching the configured MCP server with `Expected type compatible with string`.
- The configured MCP collision warnings for `edit_image`, `generate_image`, and `generate_speech` are separate: those names are protected by Agent Tools MCP adapters; `generate_video` is not in the protected media-tool list and is therefore exposed from the configured MCP registry path.

## Sources Consulted

### Local logs

Command:

```bash
find $HOME/.autobyteus -maxdepth 4 -type f \( -name '*.log' -o -name '*log*' \) -print0 \
  | xargs -0 grep -Hn "generate_video\|Input should be a valid list\|Configured MCP tool.*collides" 2>/dev/null \
  | tail -80
```

Relevant findings:

- `/Users/normy/.autobyteus/server-data/logs/server.log:1944779` registered `generate_video`.
- `/Users/normy/.autobyteus/server-data/logs/server.log:1944857-1944859` logged configured MCP collisions for `edit_image`, `generate_image`, and `generate_speech`.
- `/Users/normy/.autobyteus/server-data/logs/server.log:1945155-1945156` and `/Users/normy/.autobyteus/logs/app.log:518,525` logged local TypeScript-side validation failures: `Invalid arguments for tool 'generate_video': Invalid value for parameter 'input_images' ... Expected type compatible with string.`

### Pure MCP schema from autobyteus-image-audio

Command:

```bash
cd /Users/normy/autobyteus_org/autobyteus_mcps/autobyteus-image-audio
uv run --frozen python - <<'PY'
import anyio, json
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
async def main():
    params = StdioServerParameters(
        command='uv',
        args=['--directory', '/Users/normy/autobyteus_org/autobyteus_mcps/autobyteus-image-audio', 'run', '--frozen', 'autobyteus-image-audio-server'],
    )
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            for tool in tools.tools:
                if tool.name == 'generate_video':
                    print(json.dumps(tool.inputSchema, indent=2, sort_keys=True))
                    return
anyio.run(main)
PY
```

Result:

- `input_images`, `input_audios`, and `input_videos` are each `anyOf: [{ type: "array", items: { type: "string" } }, { type: "null" }]` with `default: null`.
- `generation_config` is `anyOf: [{ type: "object", additionalProperties: true }, { type: "null" }]` with `default: null`.
- Required fields are only `prompt` and `output_file_path`.

Conclusion: the pure MCP schema is correct for optional nullable arrays/objects. It should not be changed to a scalar or string.

### TypeScript MCP schema mapper

File: `autobyteus-ts/src/tools/mcp/schema-mapper.ts`

Key current behavior:

- The mapper reads only `paramSchema.type` as a string.
- JSON Schema nullable unions (`anyOf`/`oneOf`) do not have a top-level `type`, so `mcpParamType` becomes `undefined`.
- The fallback maps unknown/undefined type to `ParameterType.STRING`.
- Array item schemas are preserved only when `mcpParamType === "array"`.

Impact:

- Nullable arrays become `ParameterType.STRING` and lose `arrayItemSchema`.
- Nullable objects become `ParameterType.STRING` and lose object shape.
- `ParameterSchema.toJsonSchema()` then re-emits these properties as `type: "string"`.

### TypeScript validation and Agent Tools MCP exposure path

Files:

- `autobyteus-ts/src/tools/base-tool.ts`
- `autobyteus-ts/src/utils/parameter-schema.ts`
- `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-catalog.ts`
- `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-schema-mapper.ts`
- `autobyteus-server-ts/src/agent-tools/mcp/configured-mcp/configured-mcp-registry-tool-adapter.ts`
- `autobyteus-server-ts/src/agent-tools/media/media-tool-contract.ts`

Findings:

- `AgentToolMcpCatalog.buildConfiguredMcpSupportedDefinition()` exposes configured MCP registry tools using `definition.argumentSchema`.
- `AgentToolsMcpSchemaMapper.toMcpInputSchema()` faithfully calls `ParameterSchema.toJsonSchema()` when the input schema source is an AutoByteus `ParameterSchema`.
- `ConfiguredMcpRegistryToolAdapter.execute()` calls `registry.createTool(...).execute(..., rawArguments)`.
- `BaseTool.prepareArguments()` validates the raw arguments against the mapped AutoByteus schema before dispatching to the configured MCP server.
- `media-tool-contract.ts` protects only `generate_image`, `edit_image`, and `generate_speech`; `generate_video` is not a protected static adapter, so configured MCP `generate_video` is exposed and uses the broken mapped schema.

### Python/RPA downstream shape

Files:

- `/Users/normy/autobyteus_org/autobyteus/autobyteus/multimedia/video/api/autobyteus_video_client.py`
- `/Users/normy/autobyteus_org/autobyteus/autobyteus/clients/autobyteus_client.py`
- `/Users/normy/autobyteus_org/autobyteus_rpa_llm_workspace/autobyteus_rpa_llm_server/autobyteus_rpa_llm_server/api/schemas.py`
- `/Users/normy/autobyteus_org/autobyteus_rpa_llm_workspace/autobyteus_rpa_llm_server/autobyteus_rpa_llm_server/api/endpoints.py`

Findings:

- Python client and RPA server expect lists: `input_image_urls: Optional[List[str]]`, `input_audio_urls: Optional[List[str]]`, and `input_video_urls: Optional[List[str]]`.
- The RPA server request schema also accepts `generation_config: Optional[Dict[str, Any]]`.
- Downstream contracts align with the pure MCP schema; they are not the source of the string coercion.

### Python autobyteus parity note

File: `/Users/normy/autobyteus_org/autobyteus/autobyteus/tools/mcp/schema_mapper.py`

Finding:

- The Python mapper has an analogous top-level `type` fallback-to-string pattern.
- However, the active observed UI/runtime failure is in the TypeScript project because Agent Tools MCP exposure and local validation use the TypeScript `ParameterSchema` path.
- Recommended ticket scope: fix TypeScript now; note Python parity as a follow-up unless this ticket is explicitly expanded.

### Test environment observation

Command:

```bash
cd autobyteus-ts && pnpm exec vitest run tests/unit/tools/mcp/schema-mapper.test.ts
```

Result:

- Failed before test execution because this fresh ticket worktree has no installed `node_modules`: `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "vitest" not found`.
- Stage 6/7 validation should install workspace dependencies or otherwise use available package tooling before running durable tests.

## Current Behavior Summary

The root cause is not the MCP schema. The root cause is `autobyteus-ts/src/tools/mcp/schema-mapper.ts` losing the non-null branch of nullable `anyOf`/`oneOf` schemas and defaulting them to `string`. The corrupted `ParameterSchema` is then re-exposed by the Agent Tools MCP catalog and enforced by `BaseTool.prepareArguments()`.

## Scope Triage

- Classification: Small.
- Rationale: The corrective change is localized to one TypeScript schema mapper plus unit tests. The Agent Tools MCP catalog and adapter behavior is consistent once the mapped `ParameterSchema` is correct. No RPA server or Python MCP schema contract change is needed for the active failure.

## File Placement / Ownership Observations

- `autobyteus-ts/src/tools/mcp/schema-mapper.ts` is the correct owner for translating MCP JSON Schema into AutoByteus `ParameterSchema`.
- `autobyteus-ts/tests/unit/tools/mcp/schema-mapper.test.ts` is the correct durable unit-test location for mapper behavior.
- No new subsystem or folder is needed; adding a small helper inside the mapper preserves locality and avoids artificial indirection.

## Design Implications

- Add nullable-union schema resolution inside `McpSchemaMapper` before reading `type`.
- Only unwrap nullable unions with exactly one non-null branch (`anyOf` or `oneOf`) so complex multi-type unions continue to follow existing conservative fallback behavior.
- Preserve outer metadata (`description`, `default`, validation attributes) while using the resolved non-null branch for type-specific mapping.
- Support JSON Schema array-of-types shorthand such as `type: ["array", "null"]` when there is exactly one non-null type.
- Add unit tests proving nullable array/object schemas map and re-emit correctly.

## Unknowns / Risks

- `additionalProperties: true` on nullable object has no explicit internal `ParameterSchema` representation when there are no nested `properties`; re-emitting `type: "object"` without `additionalProperties` still permits additional properties by JSON Schema default. The server normalizer only adds `additionalProperties: false` at root, not nested properties.
- If external code depends on the old fallback-to-string behavior for complex unions, the fix should avoid changing those complex unions by only unwrapping nullable single-branch unions.
