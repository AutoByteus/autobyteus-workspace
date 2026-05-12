# Superseded / Historical Call Stack

> **Superseded on 2026-05-11:** This older call-stack draft predates the `DeepSeekChatRenderer` provider-specific seam. The authoritative design is `design-spec.md`.

# Future-State Runtime Call Stack - DeepSeek reasoning_content Fix

## Use Case: UC-1 Multi-turn conversation with DeepSeek thinking models
- **Source**: Requirement [AC-1]
- **Spine**: LLM Interaction Spine
- **Description**: Assistant message with reasoning is returned from LLM, stored in memory, and sent back in the next turn.

### Call Stack
1. `BaseLLM.streamMessages(messages, ...)`: Enters streaming loop.
2. `OpenAICompatibleLLM._streamMessagesToLLM(messages, ...)`: Calls OpenAI SDK.
3. `DeepSeek API`: Returns chunk with `reasoning_content`.
4. `OpenAICompatibleLLM._streamMessagesToLLM`: Yields `ChunkResponse` with `reasoning`.
5. `BaseLLM.streamMessages`: Accumulates `accumulatedReasoning`.
6. `BaseLLM.streamMessages`: Calls `executeAfterHooks` with `CompleteResponse` containing reasoning.
7. `AgentWorker`: Handles `LLMCompleteResponseReceivedEvent`.
8. `MemoryIngestInputProcessor`: Ingests assistant response into memory.
9. `MemoryManager.ingestAssistantResponse(response, ...)`: Stores content and reasoning in `WorkingContextSnapshot`.
10. `WorkingContextSnapshot.appendAssistant(content, reasoning)`: Stores both fields.
11. **Next Turn Starts**:
12. `MemoryManager.getWorkingContextMessages()`: Builds `Message` objects, including `reasoning_content`.
13. `BaseLLM.sendMessages(messages, ...)`: Called for the next turn.
14. `OpenAICompatibleLLM._sendMessagesToLLM(messages, ...)`: Renders messages.
15. `DeepSeekChatRenderer.render(messages)`: (Current target design) Includes `reasoning_content` in DeepSeek assistant message output; generic `OpenAIChatRenderer` omits it for other OpenAI-compatible providers.
16. `OpenAICompatibleRequestBuilder.build(...)`: Builds final API params.
17. `DeepSeek API`: Receives assistant message with `reasoning_content`, accepts request (no 400 error).
