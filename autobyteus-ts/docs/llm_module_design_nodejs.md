# LLM Module Design (Node.js / TypeScript)

This document complements `docs/llm_module_design.md` and focuses on the
Node.js/TypeScript implementation in `autobyteus-ts`.

## 1. Overview

The Node.js LLM module mirrors the Python architecture (BaseLLM + LLMModel +
LLMFactory) while adapting to official Node SDKs and streaming APIs. It maintains
feature parity: tool call streaming, multimodal inputs, local runtime discovery,
and usage tracking.

## 2. Core Types

- **`BaseLLM`** (`src/llm/base.ts`): message history, system prompt, extensions,
  and the abstract `_sendUserMessageToLLM` / `_streamUserMessageToLLM` hooks.
- **`LLMModel`** (`src/llm/models.ts`): model metadata + runtime/host identifier.
- **`LLMFactory`** (`src/llm/llm-factory.ts`): registry, discovery, reload logic.

## 3. OpenAI Implementation (Responses API)

Python uses `OpenAIResponsesLLM`, so the TS implementation does too:

- **`OpenAIResponsesLLM`** (`src/llm/api/openai-responses-llm.ts`)
  - Uses `client.responses.create(...)` (official Node SDK).
  - Supports reasoning params (`reasoning_effort`, `reasoning_summary`).
  - Normalizes tool definitions to `function` style.
  - Streams tool calls + text deltas from Responses events.
- **`OpenAILLM`** (`src/llm/api/openai-llm.ts`) extends `OpenAIResponsesLLM`.

**Note:** `OpenAICompatibleLLM` remains for OpenAI‑compatible providers
(DeepSeek, Grok, Kimi, Qwen, Zhipu, Minimax).

## 4. Provider Implementations

Cloud providers (SDK-backed):
- `AnthropicLLM` (`@anthropic-ai/sdk`)
- `GeminiLLM` (`@google/genai`)
- `MistralLLM` (`@mistralai/mistralai`)
- `OpenAICompatibleLLM` (OpenAI-style APIs)

Local runtimes:
- **LM Studio**: `LMStudioLLM`, `LMStudioModelProvider`
- **Ollama**: `OllamaLLM`, `OllamaModelProvider`, `OllamaProviderResolver`
- **Autobyteus**: `AutobyteusLLM`, `AutobyteusModelProvider`

## 5. Model Identifiers

- API runtimes use the model name directly (e.g., `gpt-5.2`).
- Local runtimes include the host, e.g.
  `model:runtime@host` (e.g., `qwen/qwen3-vl-30b:lmstudio@192.168.2.158:1234`).

## 6. Streaming & Tool Calls

Tool call deltas are normalized into `ToolCallDelta` objects across providers:
- `openai-tool-call-converter`
- `anthropic-tool-call-converter`
- `mistral-tool-call-converter`
- `gemini-tool-call-converter`

Responses streaming (OpenAI) emits:
- output text deltas
- reasoning summary deltas
- function call deltas
- completed event with usage

## 7. Testing

Integration tests live in `tests/integration/llm/...`.
They mirror Python tests one‑for‑one (model names preserved).

## 8. Where to Update

- Add new models in `LLMFactory.initializeRegistry()`.
- Add new providers under `src/llm/api` + update `LLMProvider`.
- Add discovery for local runtimes under `src/llm/*-provider.ts`.
