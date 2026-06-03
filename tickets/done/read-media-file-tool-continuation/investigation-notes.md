# Investigation Notes: read_media_file Tool Continuation Media Regression

Status: Current
Date: 2026-06-03

## Summary

The current failure is not explained by the small/large upload threshold path itself. Focused checks show:

- `autobyteus-ts` client request construction still serializes small local audio/video media inline and stages large known-size media.
- `autobyteus_rpa_llm_server` accepts inline small audio/video media and materializes those into local paths.
- The `read_media_file` tool still resolves the requested path and returns a `ContextFile`.

The regression is in the tool-result continuation path in latest `autobyteus-ts`: recent refactoring replaced the older synthetic user continuation, which attached `ContextFile` tool results to the next LLM request, with canonical history-only continuations that set `contextFiles` to `null` and mark the follow-up request as `tool_history_only`.

## Current Code Evidence

### `read_media_file`

File: `autobyteus-ts/src/tools/multimedia/media-reader-tool.ts`

- `ReadMediaFile.getName()` returns `read_media_file`.
- `_execute()` resolves absolute or workspace-relative paths, checks the file exists and is a regular file, then returns `new ContextFile(absolutePath)`.
- The tool itself does not base64 encode or stage media. It relies on downstream `ContextFile` handling.

Relevant current behavior:

- `ContextFile` infers file type from path extension when constructed with default `UNKNOWN` type.
- Audio extensions include `.mp3`, `.wav`, `.m4a`, `.flac`, `.ogg`, `.aac`.
- Video extensions include `.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`.

### LLM media attachment

File: `autobyteus-ts/src/agent/message/multimodal-message-builder.ts`

- `buildLLMUserMessage()` only puts media into `image_urls`, `audio_urls`, and `video_urls` by reading `AgentInputUserMessage.contextFiles`.
- If `contextFiles` is `null`, no media URLs are attached to the LLM request.

### Current continuation behavior

File: `autobyteus-ts/src/agent/loop/tool-result-continuation-builder.ts`

- `build()` now always requires `context` and `turn`.
- `buildToolHistoryContinuation()` ingests tool results into memory.
- It returns `new AgentInputUserMessage(..., SenderType.TOOL, null, metadata)`.
- The third constructor argument is explicitly `null`, so a `ContextFile` returned by `read_media_file` is not carried on the continuation message.

File: `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts`

- Current logic maps any tool continuation with continuation metadata to `llmRequestMode = 'tool_history_only'`.
- `tool_history_only` means the request assembler uses history/tool-result memory and does not append the continuation's `llmUserMessage`.
- Therefore even a media-bearing continuation would be dropped unless the pipeline permits `append_user_message` for media-bearing tool continuations.

## Earlier Working Code Comparison

Compared against tag/point `v1.3.39`, before the recent continuation-history refactor.

Command evidence:

- `git diff v1.3.39..HEAD -- autobyteus-ts/src/agent/loop/tool-result-continuation-builder.ts`
- `git diff v1.3.39..HEAD -- autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts`

### Earlier `ToolResultContinuationBuilder`

The earlier code had two paths:

- Native API tool-call mode used native API continuation.
- Non-native/text-history mode used `buildSyntheticUserContinuation(processedEvents)`.

The removed `buildSyntheticUserContinuation()` had dedicated media handling:

- If `processedEvent.result instanceof ContextFile`, it pushed that result into `mediaContextFiles`.
- If `processedEvent.result` was an array of `ContextFile`, it pushed all of them.
- It returned `new AgentInputUserMessage(finalContentForLLM, SenderType.TOOL, mediaContextFiles.length > 0 ? mediaContextFiles : null)`.

That is the earlier working behavior that made `read_media_file` useful: the media file result was not only described as tool text; it was attached as a context file for the next LLM request.

### Current `ToolResultContinuationBuilder`

The recent refactor removed:

- `ContextFile` import.
- Synthetic continuation formatter.
- Collection of `ContextFile` tool results.
- `mediaContextFiles` attachment to the next `AgentInputUserMessage`.

The replacement canonical continuation writes tool results into memory and returns `contextFiles = null`.

### Earlier `AgentInputPipeline`

Before the refactor, only `NATIVE_API_TOOL_CONTINUATION_MODE` forced `tool_history_only`.

### Current `AgentInputPipeline`

Now any non-null tool continuation mode forces `tool_history_only`.

This is compatible with pure tool-history continuation, but it is not compatible with `read_media_file` because media bytes/paths must still be sent as current-turn media attachments, not just recorded as a tool result object.

## Server/Web Upload Path Review

Compared current code and recent diffs under:

- `autobyteus-server-ts/src/services/agent-streaming`
- `autobyteus-server-ts/src/agent-customization/processors/prompt`
- `autobyteus-web/utils/contextFiles`

Findings:

- Recent server/web diffs from `v1.3.39..HEAD` are about team routing/tool approval and task metadata, not media upload processing.
- `autobyteus-web/utils/contextFiles/contextAttachmentSend.ts` sends images as `image_urls` and all non-image attachments, including audio/video, as `context_file_paths`.
- `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` accepts `context_file_paths` and `image_urls`, creates `ContextFile` objects, and forwards them in `AgentInputUserMessage.context_files`.
- `autobyteus-server-ts/src/agent-customization/processors/prompt/user-input-context-building-processor.ts` resolves context-file locators/local paths and preserves non-text media files as `ContextFile`s.

Separate gap to record but not the primary bug:

- Websocket `SEND_MESSAGE` payload types/handlers do not currently accept explicit `audio_urls` or `video_urls`; audio/video attachments are expected to flow through `context_file_paths`.
- This does not explain the `read_media_file` regression because `read_media_file` happens inside `autobyteus-ts` after the user message has already reached the runtime.

## Validated Adjacent Behavior

Earlier focused tests outside this ticket established:

- `autobyteus-ts` small local video/audio request construction still sends inline data URIs when under thresholds.
- `autobyteus-ts` large known-size video request construction stages media.
- `autobyteus_rpa_llm_server` E2E accepts inline small audio/video data URIs in `/send-message` and materializes them to local media paths.

Those results reduce the likelihood that the current symptom is caused by upload size routing alone.

## Root Cause

Recent `autobyteus-ts` tool-continuation refactoring removed the synthetic media attachment behavior from the `read_media_file` result path.

The `ContextFile` produced by `read_media_file` is now preserved only as a tool result in history/memory. It is not attached to the next LLM request as a media input because:

1. `ToolResultContinuationBuilder` returns `AgentInputUserMessage(..., contextFiles = null, ...)`.
2. `AgentInputPipeline` marks every continuation mode as `tool_history_only`.
3. `buildLLMUserMessage()` can only produce `audio_urls`/`video_urls` from `contextFiles`.

## Scope Triage

Scope classification: Medium.

The likely code fix is small, but the behavior crosses tool result serialization, continuation request mode selection, memory/tool history, and LLM media attachment. It also sits in a recently refactored area, so it needs design/runtime-call-stack validation rather than a narrow local patch only.

## Proposed Fix Direction

- Preserve canonical tool-history ingestion for all tool results.
- Additionally collect media `ContextFile` results from tool events into the continuation `AgentInputUserMessage.contextFiles`.
- Keep no-media canonical tool continuations as `tool_history_only`.
- For media-bearing tool continuations, allow the pipeline/request assembler path to append the user message so `buildLLMUserMessage()` can populate `image_urls`, `audio_urls`, and `video_urls`.
- Add focused tests for:
  - `read_media_file` small audio/video returning typed `ContextFile`s.
  - Continuation builder preserving media `ContextFile` results.
  - Pipeline choosing `append_user_message` for media-bearing continuations and preserving `tool_history_only` for no-media continuations.
