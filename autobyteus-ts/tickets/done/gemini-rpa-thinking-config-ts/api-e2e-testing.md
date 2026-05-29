# API / E2E Validation

Status: Pass

## Strategy

This repository validates the TypeScript-to-RPA-server contract with mocked unit/API-contract tests. A live Gemini UI/App RPA browser test is intentionally out of scope here because the server-side RPA project owns live browser automation; this package owns request construction and model metadata parsing.

## Executed Validation

- Command: `pnpm --filter autobyteus-ts exec vitest run tests/unit/llm/api/autobyteus-llm.test.ts tests/unit/clients/autobyteus-client.test.ts tests/unit/llm/autobyteus-provider.test.ts`
- Result: Pass
- Evidence: 3 test files passed, 25 tests passed.

## Acceptance Coverage

- AC1 non-streaming RPA `sendMessage` sends `generation_config` when `extraParams` is set:
  - Covered by `AutobyteusLLM` generationConfig test and `AutobyteusClient` send payload test.
- AC2 streaming RPA `streamMessage` sends `generation_config` when `extraParams` is set:
  - Covered by `AutobyteusLLM` stream generationConfig test and `AutobyteusClient` stream payload test.
- AC3 discovered RPA models preserve server `config_schema`:
  - Covered by `AutobyteusModelProvider` mocked discovery test.
- AC4 tests mock server API contract:
  - Covered by axios/client mocks and mocked `getAvailableLlmModelsSync`.

## Residual Risk

Low. The live browser behavior remains covered by the RPA server repository; this repository now verifies the request and discovery contract it sends to that server.
