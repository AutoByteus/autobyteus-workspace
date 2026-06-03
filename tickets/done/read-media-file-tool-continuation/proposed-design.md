# Proposed Design: Media-Bearing Tool Continuations

Status: Current
Date: 2026-06-03

## Goal

Restore the earlier `read_media_file` behavior without rolling back the compaction/tool-history refactor.

Earlier behavior:

- `read_media_file` returned a `ContextFile`.
- The tool-result continuation builder recognized `ContextFile` results.
- It attached those files to the next `AgentInputUserMessage.contextFiles`.
- `buildLLMUserMessage()` converted those context files into `image_urls`, `audio_urls`, and `video_urls`.
- The provider/model runtime renderer then handled those media inputs according to its own capability.

Current broken behavior:

- `read_media_file` still returns `ContextFile`.
- Tool results are ingested into memory/tool history.
- The continuation message uses `contextFiles = null`.
- The pipeline marks the next request as `tool_history_only`.
- No current user message with media is appended, so the LLM request has no media arrays.

## Design

### 1. Preserve tool-history ingestion

`ToolResultContinuationBuilder` continues to call:

```ts
context.state.memoryManager?.ingestToolResults(processedEvents, turnId, { source })
```

This keeps the compaction/tool-history refactor behavior intact.

### 2. Reattach media tool results as current-turn context files

Add a small helper inside `ToolResultContinuationBuilder` to collect media results from processed tool events.

Supported shapes:

- `result instanceof ContextFile`
- `result` is an array containing `ContextFile` objects
- `result` is a serialized context-file dictionary with `uri`
- `result` is an array containing serialized context-file dictionaries

The serialized dictionary support is defensive because tool results can cross serialization boundaries in memory/status/event paths.

Non-goals:

- Do not restore the old full synthetic text formatter.
- Do not convert arbitrary object results into files.
- Do not change the tool result stored in memory.

### 3. Use normal LLM media conversion

The builder returns:

```ts
new AgentInputUserMessage(content, SenderType.TOOL, collectedContextFilesOrNull, metadata)
```

`AgentInputPipeline` already uses `buildLLMUserMessage(processedMessage)`, which converts context files into `LLMUserMessage` media arrays.

### 4. Choose request mode based on media presence

Keep no-media tool continuations as:

```ts
llmRequestMode = 'tool_history_only'
```

For media-bearing tool continuations:

```ts
llmRequestMode = 'append_user_message'
```

Reason: provider renderers only receive media from the current/append user message path. If the request is history-only, `LLMRequestAssembler.prepareToolContinuationRequest()` does not append `input.llmUserMessage`, so attached media cannot reach the renderer.

### 5. Provider/runtime behavior after media reaches the request

This fix restores the earlier cross-runtime handoff point: `ContextFile` becomes `Message.image_urls/audio_urls/video_urls`. Each model runtime remains responsible for its own media capability:

- Gemini renderer: image/audio/video are converted to inline data parts.
- OpenAI chat renderer: images and mp3/wav audio are rendered; video is currently skipped with a warning.
- OpenAI responses renderer: images are rendered; audio/video currently warn and skip.
- Anthropic renderer: images are rendered; audio/video currently warn and skip.
- Mistral renderer: images are rendered; audio/video currently warn and skip.
- Ollama renderer: images are rendered.
- Autobyteus renderer: only the current user message carries media arrays; historical media is represented as a note.
- Codex/Claude server backends use `AgentInputUserMessage.contextFiles` directly for their own mapping/reference behavior.

The bug fix should not pretend all providers support video/audio equally. It should restore the missing input handoff so capable runtimes can handle the media exactly as before.

## Test Plan

### Unit tests

- `read_media_file` returns typed `ContextFile`s for small workspace-relative audio/video files.
- `ToolResultContinuationBuilder`:
  - preserves no-media history-only behavior.
  - ingests tool results into memory.
  - attaches `ContextFile` and serialized context-file results to the continuation message.
- `AgentInputPipeline`:
  - keeps no-media canonical continuations as `tool_history_only`.
  - treats media-bearing canonical continuations as `append_user_message`.
  - produces `LLMUserMessage.audio_urls` and `LLMUserMessage.video_urls`.

### Integration test

Add an `autobyteus-ts` integration test that runs the real path:

1. Create small audio and video files in a temp workspace.
2. Execute `ReadMediaFile` for each file.
3. Wrap results in `ToolResultEvent`s.
4. Build a continuation with `ToolResultContinuationBuilder`.
5. Process it through `AgentInputPipeline`.
6. Assemble/render the next LLM request with a real `MemoryManager` and prompt renderer.
7. Assert the resulting request contains the audio/video media paths or rendered media payload, depending on the selected renderer.

This proves the regression path from tool execution through the next LLM request, without requiring a live external LLM API call.

## Risks

- Appending a media-bearing tool continuation creates a user message in working context in addition to tool-result history. This is intentional because provider renderers need current media attachments.
- No-media tool results must not regress into duplicated synthetic text prompts. Tests must pin `tool_history_only`.
- Some providers still cannot use certain media types. That remains a provider capability issue, not a continuation bug.
