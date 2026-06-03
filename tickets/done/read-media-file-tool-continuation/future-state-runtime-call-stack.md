# Future-State Runtime Call Stack: read_media_file Media Continuation

Status: Current
Date: 2026-06-03

## Scenario

An agent calls `read_media_file` for a small workspace-relative media file such as `clip.mp4` or `sample.mp3`. The next LLM turn must receive the media as a current input attachment.

## Expected Call Stack

### 1. LLM asks for `read_media_file`

File: `autobyteus-ts/src/agent/loop/llm-phase.ts`

- `LlmPhase.run()` streams/parses tool invocations.
- `memoryManager.ingestAssistantToolResponse()` stores assistant/tool-call intent.
- `AgentTurnRunner` moves to tool execution.

### 2. Tool executes

File: `autobyteus-ts/src/agent/loop/tool-phase.ts`

- `ToolPhase.run()` invokes the requested tool.
- The tool result is emitted as a `ToolResultEvent`.

File: `autobyteus-ts/src/tools/multimedia/media-reader-tool.ts`

- `ReadMediaFile._execute()` resolves the path.
- It validates the resolved path is a regular file.
- It returns `new ContextFile(absolutePath)`.
- `ContextFile` infers `AUDIO` or `VIDEO` from the extension.

### 3. Tool result processors run

File: `autobyteus-ts/src/agent/pipelines/tool-result-pipeline.ts`

- `ToolResultPipeline.process()` applies configured processors and returns a processed `ToolResultEvent`.
- The processed event still contains the `ContextFile` result.

### 4. Continuation builder preserves both history and media

File: `autobyteus-ts/src/agent/loop/tool-result-continuation-builder.ts`

Future behavior:

- Resolve the continuation `turnId`.
- Call `context.state.memoryManager?.ingestToolResults(processedEvents, turnId, { source })`.
- Collect media `ContextFile`s from `processedEvents`.
- Return `AgentInputUserMessage` with:
  - `senderType = SenderType.TOOL`
  - continuation metadata unchanged
  - `contextFiles = [ContextFile('/abs/sample.mp3'), ContextFile('/abs/clip.mp4')]`

No-media tool result events still return `contextFiles = null`.

### 5. Input pipeline chooses the correct request mode

File: `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts`

Future behavior:

- A canonical tool continuation with no media remains `llmRequestMode = 'tool_history_only'`.
- A canonical tool continuation with `contextFiles.length > 0` becomes `llmRequestMode = 'append_user_message'`.
- `buildLLMUserMessage(processedMessage)` runs in both cases.

File: `autobyteus-ts/src/agent/message/multimodal-message-builder.ts`

- Converts `ContextFileType.AUDIO` to `LLMUserMessage.audio_urls`.
- Converts `ContextFileType.VIDEO` to `LLMUserMessage.video_urls`.
- Converts `ContextFileType.IMAGE` to `LLMUserMessage.image_urls`.

### 6. LLM phase appends current media message

File: `autobyteus-ts/src/agent/loop/llm-phase.ts`

- For `append_user_message`, `LlmPhase.run()` calls:

```ts
assembler.prepareRequest(input.llmUserMessage, activeTurnId, systemPrompt)
```

File: `autobyteus-ts/src/agent/llm-request-assembler.ts`

- `prepareRequest()` converts `LLMUserMessage` into a `Message`.
- The `Message` contains `audio_urls` and `video_urls`.
- `memoryManager.appendWorkingContextUserMessage()` appends the media-bearing current message.
- The renderer receives the complete working context.

### 7. Provider/model runtime receives media through existing renderer behavior

Shared handoff:

- `Message.image_urls`
- `Message.audio_urls`
- `Message.video_urls`

Renderer behavior remains provider-specific:

- Gemini: image/audio/video are converted to inline data.
- OpenAI chat: images and mp3/wav audio are converted to supported content parts; video is skipped with warning.
- OpenAI responses: images are converted; audio/video skipped with warning.
- Anthropic: images are converted; audio/video skipped with warning.
- Mistral: images are converted; audio/video skipped with warning.
- Ollama: images are converted.
- Autobyteus: current message media arrays are passed; historical media is not reattached.
- Codex/Claude server backends: consume `AgentInputUserMessage.contextFiles` in their own runtime-specific mappers/sessions.

## Broken Current Call Stack

Current failure occurs at two points:

1. `ToolResultContinuationBuilder` returns `contextFiles = null`.
2. `AgentInputPipeline` marks every canonical continuation as `tool_history_only`.

Result:

- `ContextFile` remains only as a tool result object in history.
- No current media-bearing message is appended.
- Provider renderers never see `audio_urls` or `video_urls`.

## Validation Target

The integration test should prove:

- `ReadMediaFile` returns `ContextFile` for small audio and video files.
- `ToolResultContinuationBuilder` preserves those context files.
- `AgentInputPipeline` selects `append_user_message`.
- `LLMRequestAssembler.prepareRequest()` creates a rendered request containing the media-bearing user message.
