# Implementation Plan

Status: Design Baseline Finalized

## Small-Scope Solution Sketch

### Data Flow

1. Callers configure an RPA LLM instance with `LLMConfig.extraParams`, for example `{ thinking_level: "medium", include_thoughts: false }`.
2. `AutobyteusLLM` includes a shallow copy of `this.config.extraParams` as `generationConfig` when calling `AutobyteusClient.sendMessage` and `streamMessage`.
3. `AutobyteusClient` serializes the request body for `/send-message` and `/stream-message` with `generation_config: request.generationConfig ?? {}`.
4. The RPA server applies `generation_config` to the selected Gemini UI/App integrator.
5. During model discovery, `AutobyteusModelProvider` parses server `config_schema` and stores it on `LLMModel.configSchema`.
6. `LLMModel.toModelInfo()` exposes the parsed schema as JSON Schema to UI/caller layers, matching existing native Gemini model metadata behavior.

### Ownership

- `AutobyteusLLM`: owns LLM configuration bridging from `LLMConfig` to RPA client request contract.
- `AutobyteusClient`: owns HTTP payload naming and server API contract serialization.
- `AutobyteusModelProvider`: owns server model metadata validation/parsing.
- `ParameterSchema`: remains unchanged; parsing remote JSON Schema can be handled locally in provider code because it is discovery-specific.

### Tests

- Update `tests/unit/llm/api/autobyteus-llm.test.ts` to assert `extraParams` reaches `generationConfig` for send and stream.
- Update `tests/unit/clients/autobyteus-client.test.ts` to assert `/send-message` and `/stream-message` payloads contain `generation_config`.
- Update `tests/unit/llm/autobyteus-provider.test.ts` to mock a server model with Gemini-style `config_schema` and assert `LLMModel.toModelInfo().config_schema` preserves the thinking controls.

## Execution Tracking

- Stage 5 review: Go Confirmed.
- Stage 6 source edits: Unlocked.
- Implementation progress: Complete.
- Unit/integration verification:
  - `pnpm --filter autobyteus-ts exec vitest run tests/unit/llm/api/autobyteus-llm.test.ts tests/unit/clients/autobyteus-client.test.ts tests/unit/llm/autobyteus-provider.test.ts` -> Pass, 25 tests.
  - `pnpm --filter autobyteus-ts build` -> Pass, `[verify:runtime-deps] OK`.
- Changed source ownership:
  - `src/llm/api/autobyteus-llm.ts`: bridges `LLMConfig.extraParams` to RPA request `generationConfig`.
  - `src/llm/api/autobyteus-conversation-payload.ts`: extends chat request contract.
  - `src/clients/autobyteus-client.ts`: serializes `generation_config` for chat endpoints.
  - `src/llm/autobyteus-provider.ts`: parses remote model `config_schema`.
