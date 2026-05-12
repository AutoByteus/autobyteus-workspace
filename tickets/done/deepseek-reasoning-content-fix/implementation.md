# Superseded Implementation Plan

> **Superseded on 2026-05-11:** The renderer-only plan is obsolete. The current design requires provider-neutral memory preservation plus `DeepSeekChatRenderer` selected by `DeepSeekLLM`; generic `OpenAIChatRenderer` must not emit `reasoning_content`.

# Implementation - DeepSeek reasoning_content Fix

## Baseline Planning
### Solution Sketch
The fix is to update `OpenAIChatRenderer.render` to include `reasoning_content` in the rendered output for assistant messages.

**Target Ownership Boundaries**:
- `OpenAIChatRenderer` (in `autobyteus-ts/src/llm/prompt-renderers/openai-chat-renderer.ts`): Responsible for converting internal `Message` objects to OpenAI-compatible API parameters.

**Proposed Changes**:
- Modify `OpenAIChatRenderer.render` to check for `msg.reasoning_content` and add it to the message object sent to the API.

### Use Case Coverage
- **UC-1**: Multi-turn conversation with DeepSeek thinking models.
- **UC-2**: Tool continuation with DeepSeek thinking models.

## Future-State Runtime Call Stack Basis
- Entry: `BaseLLM.sendMessages`
- Flow: `OpenAIChatRenderer.render` -> `OpenAICompatibleRequestBuilder.build` -> `OpenAIClient.chat.completions.create`

## Execution Tracking
### Phase 1: Foundational Changes
- [ ] Update `OpenAIChatRenderer.render` to include `reasoning_content`. [Pending]

### Phase 2: Verification
- [ ] Run `autobyteus-ts/tests/integration/agent/deepseek-single-agent-flow.test.ts`. [Pending]
