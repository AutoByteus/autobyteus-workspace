# Gemini RPA Thinking Config in TypeScript

Status: Design-ready

## Intent

Verify whether the refreshed `autobyteus-ts` project already wires Gemini UI/App RPA model configuration end to end. If gaps remain, implement TypeScript support so RPA LLM configuration behaves similarly to the existing Gemini API LLM thinking configuration.

## Initial Requirements

- RPA LLM calls must be able to pass generation configuration from `LLMConfig.extraParams` to the Autobyteus RPA server request body as `generation_config`.
- RPA model discovery must expose server-provided model `config_schema` through `LLMModel.configSchema`, so callers can inspect configurable thinking options.
- Unit/API-level tests must mock the Autobyteus server API contract instead of requiring a live RPA server.
- Existing Gemini API LLM behavior must remain unchanged.

## Refined Requirements

- `AutobyteusLLM` owns conversion from `LLMConfig.extraParams` to the RPA request-level generation configuration.
- `AutobyteusClient` owns HTTP wire-shape serialization and always sends a `generation_config` object for `/send-message` and `/stream-message`.
- The chat request type must remain backward compatible for existing callers that do not provide generation configuration.
- Autobyteus model discovery must accept server `config_schema` in JSON Schema object form and preserve it through `LLMModel.toModelInfo()`.
- Schema parsing must support the Gemini thinking controls used by the RPA server: string enum `thinking_level` and boolean `include_thoughts`.
- Schema parsing should also handle common JSON Schema primitive/object/array shapes without coupling the provider to Gemini-only fields.

## Acceptance Criteria

- Non-streaming RPA `sendMessage` sends `generation_config` when `extraParams` is set.
- Streaming RPA `streamMessage` sends `generation_config` when `extraParams` is set.
- Discovered RPA models preserve a server-provided `config_schema` on the returned `LLMModel`.
- Tests cover the mocked server contract for both message paths and model discovery.

## Coverage Map

- R1: `AutobyteusLLM` forwards `LLMConfig.extraParams` -> AC1, AC2.
- R2: `AutobyteusClient` serializes `generation_config` -> AC1, AC2.
- R3: `AutobyteusModelProvider` parses `config_schema` -> AC3.
- R4: Unit tests mock client/server contract -> AC4.
