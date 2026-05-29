# Investigation Notes

Status: Current

## Scope Triage

Scope: Small.

Reasoning: The change is limited to the Autobyteus RPA LLM TypeScript adapter, the shared Autobyteus HTTP client request payload, model discovery schema parsing, and focused mocked unit tests. No UI rendering or live RPA browser automation is required in this repository.

## README / Project Instructions Reviewed

- Root `README.md` confirms this is the AutoByteus TypeScript monorepo and uses project filters for builds.
- `autobyteus-ts/examples/README.md` confirms `autobyteus-ts` is the TypeScript package and examples are run from compiled output.
- `autobyteus-ts` has no package-local top-level `README.md`; package test/build behavior is defined by `package.json` and `vitest.config.ts`.

## Refreshed Code Findings

- `AutobyteusLLM` now forwards `LLMInvocationOptions.signal` to `AutobyteusClient`, but it still calls `sendMessage`/`streamMessage` with only `conversationId`, `modelName`, and `payload`.
- `AutobyteusSendMessageRequest` still lacks a `generationConfig` field.
- `AutobyteusClient.sendMessage` and `streamMessage` build request bodies without `generation_config`.
- `AutobyteusModelProvider.getModels` still builds `LLMModel` without parsing `modelInfo.config_schema`.
- `LLMConfig.extraParams`, `LLMModel.configSchema`, and native Gemini API thinking schema support already exist.
- Existing tests already cover Autobyteus LLM call shape, client request payloads, and provider metadata, so the fix can add mocked unit coverage in those areas.

## Required Work

- Add optional `generationConfig` to the Autobyteus chat request contract.
- Forward `AutobyteusLLM.config.extraParams` into `generationConfig` for non-streaming and streaming calls.
- Add `generation_config` to Autobyteus chat HTTP payloads, defaulting to `{}` when absent.
- Parse server `config_schema` into `LLMModel.configSchema` during Autobyteus model discovery.
- Cover all of the above with mocked unit tests.

## Out Of Scope

- Live Gemini UI/App RPA E2E in this repository. The server-side live RPA behavior was validated separately; this TypeScript repository should mock the server API contract.
- Changes to native Gemini API LLM thinking behavior.
