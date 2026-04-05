# Requirements

## Status

- Current Status: `Design-ready`
- Previous Status: `Draft`

## Goal / Problem Statement

`autobyteus-ts` currently succeeds at tool calling in XML mode for both LM Studio and Ollama, and succeeds at API-call mode for LM Studio, but initially failed at API-call mode for Ollama. The goal is to keep the restored Ollama API-call mode working and extend automated proof to the higher-layer single-agent flow that already exists for LM Studio.

## Scope Classification

- Classification: `Small`
- Rationale:
  - The fix remains contained to the Ollama provider adapter plus directly related integration tests inside `autobyteus-ts`.
  - LM Studio already proves the agent-side API tool-call path works, so no cross-subsystem redesign is needed.
  - The remaining work is targeted validation expansion: keep the provider-specific normalization fix and add one higher-layer Ollama agent-loop proof using the existing LM Studio single-agent flow as the template.

## In-Scope Use Cases

- `UC-001`: An LM provider integration test can request a tool through API-call mode and the runtime normalizes the tool invocation into the internal invocation model.
- `UC-002`: `LmStudioLlm` continues to pass the existing API-call tool-calling behavior.
- `UC-003`: `OllamaLlm` can invoke tools in API-call mode against `qwen3.5:35b-a3b-coding-nvfp4`.
- `UC-004`: The executable test suite contains coverage that would catch a regression where Ollama tool calls are emitted differently from LM Studio tool calls.
- `UC-005`: A higher-layer single-agent integration flow can execute an Ollama API-call tool invocation end-to-end and produce the expected file output.

## Out Of Scope / Non-Goals

- No change to XML-mode tool calling.
- No unrelated provider refactor beyond what is required to support Ollama API-call mode correctly.
- No changes outside `autobyteus-ts` unless a hard dependency is discovered during investigation.

## Acceptance Criteria

1. `AC-001`: `OllamaLLM` forwards `kwargs.tools` to the Ollama chat request in API-call mode.
2. `AC-002`: `OllamaLLM` converts Ollama `message.tool_calls` responses into `ChunkResponse.tool_calls` using the internal `ToolCallDelta` shape expected by `ApiToolCallStreamingResponseHandler`.
3. `AC-003`: Ollama tool-call argument objects are serialized into JSON text in `arguments_delta` so the existing tool invocation reconstruction path works without agent-side changes.
4. `AC-004`: Existing LM Studio API-call mode behavior remains unchanged.
5. `AC-005`: Automated validation includes Ollama-specific coverage for API-call mode tool invocation, including a live integration test that can target `qwen3.5:35b-a3b-coding-nvfp4` when the local runtime is available.
6. `AC-006`: The design and implementation artifacts record the provider-specific Ollama normalization so the reason for the divergence from OpenAI-compatible handling is explicit.
7. `AC-007`: Automated validation includes at least one higher-layer Ollama single-agent API-call tool execution flow analogous to the existing LM Studio single-agent flow.

## Constraints / Dependencies

- The user-provided local Ollama model for integration validation is `qwen3.5:35b-a3b-coding-nvfp4`.
- Integration coverage should reuse the existing LM Studio testing approach where practical.
- The higher-layer validation should reuse the existing single-agent LM Studio flow where practical rather than introducing a new agent harness.
- Investigation should compare `OllamaLlm` and `LmStudioLlm` directly rather than guessing from shared abstractions alone.

## Assumptions

- `autobyteus-ts` already contains LM Studio API-call tool-calling tests that can serve as the working baseline.
- `autobyteus-ts` already contains an LM Studio single-agent API-call flow test that can serve as the higher-layer template.
- The root cause is in provider-specific request/response normalization rather than agent-level XML parsing, because XML mode already works for Ollama and live payload inspection shows `message.tool_calls` is never consumed.

## Open Questions / Risks

1. Ollama may emit a tool-call payload shape that differs from OpenAI-compatible LM Studio responses even when both are used in API-call mode.
2. Existing integration tests may depend on environment variables or local services that are not currently set in this worktree.
3. The issue may involve streaming and non-streaming paths differently; investigation needs to confirm the failing execution path.

## Requirement IDs

- `R-001`: `OllamaLLM` API-call requests forward tool schemas to the Ollama SDK.
- `R-002`: `OllamaLLM` API-call tool responses are normalized into internal tool invocations correctly.
- `R-003`: `LMStudioLLM` API-call tool-call behavior remains unchanged.
- `R-004`: Automated tests cover Ollama API-call mode with a real or faithfully simulated Ollama payload.
- `R-005`: Integration validation can run against `qwen3.5:35b-a3b-coding-nvfp4` when the local Ollama runtime is available.
- `R-006`: Higher-layer agent integration coverage proves the Ollama API-call tool path works beyond the provider-level stream handler.

## Requirement To Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| `R-001` | `UC-001`, `UC-003` |
| `R-002` | `UC-001`, `UC-003` |
| `R-003` | `UC-002` |
| `R-004` | `UC-003`, `UC-004` |
| `R-005` | `UC-003`, `UC-004` |
| `R-006` | `UC-005` |

## Acceptance-Criteria To Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| `AC-001` | Provider request includes tool definitions when `streamUserMessage(..., { tools })` is used |
| `AC-002` | Streamed Ollama chunk with `message.tool_calls` becomes at least one normalized `ChunkResponse.tool_calls` entry |
| `AC-003` | Normalized Ollama tool arguments can be reconstructed into invocation arguments by the existing API tool-call handler |
| `AC-004` | Existing LM Studio integration test continues to pass without source changes in LM Studio code |
| `AC-005` | Live Ollama integration test emits tool calls when the local qwen model is available |
| `AC-006` | Design and implementation artifacts explain why Ollama needs provider-specific normalization |
| `AC-007` | A single-agent Ollama integration flow executes `write_file` end-to-end and creates the expected file |
