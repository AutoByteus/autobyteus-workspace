# Investigation Notes

## Status

- Stage: `1 Investigation + Triage`
- Result: `Completed`
- Date: `2026-03-03`

## Sources Consulted

### Local code paths

- `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts`
- `autobyteus-ts/src/memory/memory-manager.ts`
- `autobyteus-ts/src/memory/working-context-snapshot.ts`
- `autobyteus-ts/src/llm/prompt-renderers/openai-chat-renderer.ts`
- `autobyteus-ts/src/llm/api/openai-compatible-llm.ts`
- `autobyteus-ts/src/agent/streaming/handlers/api-tool-call-streaming-response-handler.ts`
- `autobyteus-ts/src/agent/streaming/adapters/invocation-adapter.ts`
- `autobyteus-ts/src/llm/llm-factory.ts`
- `autobyteus-ts/src/llm/providers.ts`
- `autobyteus-web/utils/llmThinkingConfigAdapter.ts`
- `autobyteus-ts/tests/integration/llm/api/deepseek-llm.test.ts`
- `autobyteus-ts/tests/integration/llm/api/kimi-llm.test.ts`
- `autobyteus-ts/tests/integration/llm/api/zhipu-llm.test.ts`

### External provider references (official)

- OpenAI function/tool calling guide: `https://platform.openai.com/docs/guides/function-calling`
- OpenAI chat completions API reference: `https://platform.openai.com/docs/api-reference/chat/create`
- DeepSeek API docs (OpenAI-compatible Chat): `https://api-docs.deepseek.com/api/create-chat-completion`
- Moonshot Kimi blog (official): `https://platform.moonshot.cn/blog/posts/kimi-k2-0905`
- Moonshot Kimi latest model rationale (official): `https://platform.moonshot.cn/blog/posts/kimi-latest`
- Zhipu/GLM official model docs: `https://docs.bigmodel.cn/cn/guide/models`
- Zhipu official GLM-4.6 docs page: `https://docs.bigmodel.cn/cn/guide/models/text/glm-4.6`

### Live API probes using `.env.test` keys

- DeepSeek `/models`: returns `deepseek-chat`, `deepseek-reasoner`.
- Kimi `/v1/models`: returns model set including `kimi-latest`, `kimi-k2.5`, `kimi-k2-thinking-turbo`, etc.
- GLM chat endpoint probe with `GLM_API_KEY` (previously `ZHIPU_API_KEY`) returned `401 身份验证失败` during initial investigation snapshot.

## Key Findings

1. **Tool-call ordering bug in working context snapshot**
   - In `LLMUserMessageReadyEventHandler`, tool invocations are ingested first (one-by-one), then full assistant response is ingested after streaming completes.
   - `MemoryManager.ingestToolIntent()` appends one assistant tool_call message per invocation.
   - `MemoryManager.ingestAssistantResponse()` may append another assistant message (content/reasoning) in the same turn.
   - Resulting sequence can become:
     - `assistant(tool_calls)`
     - `assistant(text/reasoning)`
     - `tool(...)`
   - This violates strict OpenAI-compatible contract requiring assistant `tool_calls` to be followed by tool messages for those call IDs.

2. **Multi-tool calls are not grouped per assistant turn**
   - For a single model response with N tool calls, runtime appends N separate assistant messages (each with one tool call), not one assistant message with N `tool_calls`.
   - This increases risk of invalid sequencing under strict providers.

3. **Why issue appears with DeepSeek/Kimi/GLM but not GPT in user report**
   - OpenAI-compatible APIs expect strict `assistant(tool_calls)` followed by corresponding `tool` messages for each `tool_call_id`.
   - DeepSeek/Kimi/GLM follow strict compatibility checks and reject invalid ordering with 400.
   - GPT path can appear tolerant because some model/provider paths still return usable output even when history assembly is imperfect.
   - Inference: behavior difference is not a "DeepSeek-only bug"; it exposes a shared runtime sequencing bug that GPT sometimes masks.

4. **Coverage gap in current tests**
   - Existing DeepSeek/Kimi/Zhipu integration tests validate basic completion + streaming only, not tool-call roundtrip continuation with prior tool history.
   - No provider-specific test currently validates second-turn continuation payload ordering for DeepSeek/Kimi/GLM.

5. **Model catalog drift**
   - Kimi and GLM entries in `llm-factory.ts` are static and may lag provider releases.
   - Live Kimi endpoint confirms newer IDs (e.g., `kimi-k2.5`) beyond current assumptions.

6. **File/module naming alignment request (user feedback)**
   - User requested replacing `zhipu-llm.ts` naming with `glm-llm.ts`.
   - Decision: accept and apply clean-cut rename (no dual naming path) to align user-facing and code-facing provider identity.

## Initial Root Cause Statement

Primary root cause is **history assembly order** in the agent runtime for tool-calling turns, not the DeepSeek SDK itself:
- assistant tool_calls and assistant text are both persisted for the same tool-calling turn, and
- tool calls are persisted as multiple assistant messages instead of one grouped tool_calls message.

This produces request histories that strict OpenAI-compatible providers reject with:
`assistant message with tool_calls must be followed by tool messages`.

## Scope Triage Decision

- Final triage: `Medium`
- Reason:
  - Requires runtime fix in tool-turn history assembly,
  - requires provider/model catalog updates (Kimi + GLM naming/models),
  - requires integration test expansion with real provider calls.

## Unknowns / Risks

- GLM credential in current local `.env.test` is unauthorized, which can block real GLM integration verification unless updated.
- If some providers emit both content and tool_calls intentionally, suppressing assistant content in tool-turns must not regress user-visible behavior unexpectedly.
