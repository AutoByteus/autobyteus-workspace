# Investigation Notes

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Small`
- Triage Rationale:
  - The break is isolated to the Ollama provider adapter in `autobyteus-ts`.
  - Existing LM Studio behavior already proves the agent-side API tool-call flow works.
  - The required durable work is a provider-specific request/response normalization fix plus targeted unit and integration coverage.
- Investigation Goal:
  - Explain why API-call tool invocation works for `LMStudioLLM` but fails for `OllamaLLM`, and pin the fix to the actual `ollama@0.6.3` contract and live Ollama server payload.
- Primary Questions To Resolve:
  - Does `OllamaLLM` forward tool schemas into the SDK request?
  - What exact tool-call shape does `ollama@0.6.3` return for chat responses?
  - Does streamed Ollama tool calling match OpenAI-style deltas or require its own conversion path?
  - Are there existing Ollama integration tests covering API-call mode tool invocations?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-05 | Code | `autobyteus-ts/src/llm/api/ollama-llm.ts` | Inspect current Ollama provider implementation | `OllamaLLM` only forwards `model`, `messages`, and `stream`; it ignores `kwargs.tools` and never reads `message.tool_calls` from chat responses | No |
| 2026-04-05 | Code | `autobyteus-ts/src/llm/api/lmstudio-llm.ts` | Inspect working comparison path | `LMStudioLLM` inherits `OpenAICompatibleLLM`, which forwards `tools` and converts streamed `delta.tool_calls` | No |
| 2026-04-05 | Code | `autobyteus-ts/src/llm/api/openai-compatible-llm.ts` | Verify the working tool-call baseline | OpenAI-compatible streaming emits `ChunkResponse.tool_calls` via `convertOpenAIToolCalls(delta.tool_calls)` | No |
| 2026-04-05 | Code | `autobyteus-ts/tests/integration/llm/api/lmstudio-llm.test.ts` | Check existing coverage baseline | LM Studio already has a live integration test that asserts tool calls are emitted in API-call mode | No |
| 2026-04-05 | Code | `autobyteus-ts/tests/integration/llm/api/ollama-llm.test.ts` | Check Ollama coverage | Ollama integration tests cover completion, multimodal input, and plain streaming only; there is no API-call tool invocation coverage | No |
| 2026-04-05 | Command | `npm view ollama version dist-tags --json` | Verify stable npm release before assuming upgrade work | Stable npm `latest` is still `0.6.3`; there is no npm package bump to make in `autobyteus-ts` | No |
| 2026-04-05 | Command | `tmpdir=$(mktemp -d) && cd "$tmpdir" && npm pack ollama@0.6.3 --silent >/dev/null && tar -xzf ollama-0.6.3.tgz && sed -n '50,220p' package/dist/shared/ollama.1bfa89da.d.ts` | Verify the published SDK contract for the version used by the project | `ChatRequest` supports `tools?: Tool[]`; `ChatResponse.message.tool_calls?: ToolCall[]`; tool-call arguments are objects, not OpenAI-style argument-string deltas | No |
| 2026-04-05 | Trace | `curl -sS http://localhost:11434/api/chat ... stream=false ... "tools":[...]` against `qwen3.5:35b-a3b-coding-nvfp4` | Capture the real non-streaming Ollama response | Ollama returned `message.tool_calls` with `id`, `function.index`, `function.name`, and `function.arguments` as an object; `message.content` was empty | No |
| 2026-04-05 | Trace | `curl -sS http://localhost:11434/api/chat ... stream=true ... "tools":[...] | rg 'tool_calls|done\":true|content\":\"'` against `qwen3.5:35b-a3b-coding-nvfp4` | Capture the real streaming Ollama response | Stream emitted many `message.thinking` chunks, then one chunk with full `message.tool_calls`, then a final `done:true` chunk; there were no OpenAI-style incremental tool deltas | No |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - `autobyteus-ts/src/llm/api/ollama-llm.ts`
  - `autobyteus-ts/src/llm/api/lmstudio-llm.ts`
  - `autobyteus-ts/src/llm/api/openai-compatible-llm.ts`
- Execution boundaries:
  - Provider adapter boundary: translate internal `Message[]` + `kwargs.tools` into SDK request payload.
  - Streaming boundary: translate provider response chunks into `ChunkResponse`, specifically `ChunkResponse.tool_calls`.
  - Agent tool execution boundary: `ApiToolCallStreamingResponseHandler` expects `ToolCallDelta` entries whose `arguments_delta` is JSON text.
- Owning subsystems / capability areas:
  - `src/llm/api/` owns provider-specific API wiring.
  - `src/llm/converters/` owns provider-response normalization helpers.
  - `tests/integration/llm/api/` owns live provider validation.
  - `tests/unit/llm/api/` is the correct place for provider-specific unit tests.
- Optional modules involved:
  - `src/llm/prompt-renderers/ollama-prompt-renderer.ts`
  - `src/llm/utils/response-types.ts`
  - `src/agent/streaming/handlers/api-tool-call-streaming-response-handler.ts`
- Folder / file placement observations:
  - The provider fix belongs in `src/llm/api/ollama-llm.ts`.
  - Any reusable Ollama response normalization helper belongs under `src/llm/converters/`.
  - New provider tests should sit beside the existing LLM API unit and integration tests, not under agent logic.

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/api/ollama-llm.ts` | `OllamaLLM._sendMessagesToLLM` / `_streamMessagesToLLM` | Ollama chat request and streaming adaptation | No tool schema forwarding; no tool-call extraction; only plain text/thinking handling | Primary fix location |
| `autobyteus-ts/src/llm/api/lmstudio-llm.ts` | `LMStudioLLM` | Working OpenAI-compatible baseline | Inherits tool-call handling from `OpenAICompatibleLLM` | Use as behavioral reference, not copy-paste target |
| `autobyteus-ts/src/llm/api/openai-compatible-llm.ts` | `_streamMessagesToLLM` | Converts OpenAI `delta.tool_calls` to `ChunkResponse.tool_calls` | Assumes OpenAI delta shape; not directly reusable for Ollama full-message tool calls | Confirms provider-specific converter needed |
| `autobyteus-ts/src/llm/converters/openai-tool-call-converter.ts` | `convertOpenAIToolCalls` | OpenAI delta normalization | Produces `ToolCallDelta.arguments_delta` as JSON text fragments | Ollama needs analogous but shape-aware conversion |
| `autobyteus-ts/tests/integration/llm/api/lmstudio-llm.test.ts` | `should emit tool calls for LM Studio` | Existing live API-call regression test | Verifies tool-call emission count only | Reuse structure for Ollama live test |
| `autobyteus-ts/tests/integration/llm/api/ollama-llm.test.ts` | Ollama live integration suite | Basic completion and streaming coverage | Missing tool-call API-mode test entirely | Add live regression coverage here |
| `autobyteus-ts/src/agent/streaming/handlers/api-tool-call-streaming-response-handler.ts` | `feed` / `finalize` | Consumes `ToolCallDelta` and reconstructs invocations | Expects JSON-string argument deltas or a full JSON string accumulated in one chunk | Ollama converter should stringify argument objects and emit one full delta chunk |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-05 | Trace | `curl -sS http://localhost:11434/api/chat ... stream=false ...` | Response payload included `message.tool_calls[0].id`, `message.tool_calls[0].function.index`, `name`, and `arguments` object | Non-streaming Ollama tool calls are full objects, not OpenAI deltas |
| 2026-04-05 | Trace | `curl -sS http://localhost:11434/api/chat ... stream=true ... | rg 'tool_calls|done\":true|content\":\"'` | Stream emitted many `message.thinking` chunks followed by one chunk with `message.tool_calls` and then a final completion chunk | Streaming converter must inspect `part.message.tool_calls` directly; it cannot wait for `delta.tool_calls` |
| 2026-04-05 | Setup | `ollama list` | Local model `qwen3.5:35b-a3b-coding-nvfp4` is available for live integration validation | Live Ollama integration test can target the user-provided model |

## External Code / Dependency Findings

- Upstream repo / package / sample examined:
  - npm package `ollama@0.6.3`
- Version / tag / commit / release:
  - npm stable `latest`: `0.6.3`
- Files, endpoints, or examples examined:
  - packaged type definitions under `package/dist/shared/ollama.1bfa89da.d.ts`
- Relevant behavior, contract, or constraint learned:
  - `ChatRequest.tools` is supported in the published SDK version used by the project.
  - `ChatResponse.message.tool_calls` is the supported response surface.
  - Tool-call `arguments` are objects; the provider adapter must serialize them to JSON to satisfy `ToolCallDelta.arguments_delta`.
- Confidence and freshness:
  - High; verified directly from the published `ollama@0.6.3` package on 2026-04-05.

## Reproduction / Environment Setup

- Required services, mocks, or emulators:
  - Local Ollama server on `http://localhost:11434`
- Required config, feature flags, or env vars:
  - None for raw `curl` reproduction
- Required fixtures, seed data, or accounts:
  - Local model `qwen3.5:35b-a3b-coding-nvfp4`
- External repos, samples, or artifacts cloned/downloaded for investigation:
  - Temporary `npm pack` extraction of `ollama@0.6.3`
- Setup commands that materially affected the investigation:
  - `ollama list`
  - `npm view ollama version dist-tags --json`
  - `npm pack ollama@0.6.3`
  - `curl` probes against `/api/chat`
- Cleanup notes for temporary investigation-only setup:
  - `npm pack` extraction was temporary only and not retained in the repo

## External / Internet Findings

| Source | Fact / Constraint | Why It Matters | Confidence / Freshness |
| --- | --- | --- | --- |
| `npm view ollama version dist-tags --json` | Stable npm `latest` is `0.6.3` | No dependency-upgrade work is needed; fix must target the current version contract | High / 2026-04-05 |

## Constraints

- Technical constraints:
  - `ApiToolCallStreamingResponseHandler` expects JSON text in `arguments_delta`, not raw argument objects.
  - The fix must preserve existing LM Studio behavior and not force Ollama through an OpenAI-only abstraction that does not match its payload shape.
- Environment constraints:
  - Live Ollama responses are slow with the provided qwen model; integration tests should remain resilient to long inference times.
- Third-party / API constraints:
  - The project’s npm dependency is `ollama@0.6.3`; any fix must match that version’s contract.

## Unknowns / Open Questions

- Unknown:
  - Whether non-streaming `sendUserMessage(..., { tools })` is used anywhere in production paths for Ollama.
- Why it matters:
  - `CompleteResponse` currently has no tool-call field, so streaming is the critical path; a non-streaming helper can still be made more truthful, but it is secondary.
- Planned follow-up:
  - Search usage quickly during implementation and keep the required behavioral fix focused on streaming tool invocation parity.

## Implications

### Requirements Implications

- Requirements should explicitly state that Ollama API-call mode must forward tool schemas and emit normalized tool invocation deltas from `message.tool_calls`.
- Requirements should classify Ollama live tool-call coverage as mandatory because there was no existing regression test.

### Design Implications

- Design should introduce a provider-specific normalization step for Ollama tool-call responses instead of trying to route them through `convertOpenAIToolCalls`.
- Streaming logic should inspect both `message.thinking` and `message.tool_calls` because Ollama exposes those fields separately from plain content.

### Implementation / Placement Implications

- Implement request forwarding and response conversion in `src/llm/api/ollama-llm.ts`.
- Add a small Ollama tool-call converter in `src/llm/converters/` if that keeps the provider implementation readable.
- Add one unit test for conversion/streaming behavior and one live integration test for Ollama tool-call emission.
