# Release Notes: AutoByteus RPA LLM Session Resume

## Summary

AutoByteus RPA-backed text LLM conversations now use a caller-supplied stable logical conversation id plus a rendered transcript payload so restored AutoByteus agents can continue semantically after the AutoByteus server/agent process restarts.

## Breaking API Contract Change

The RPA LLM text endpoints `/send-message` and `/stream-message` no longer accept the old single-message `user_message` body shape. Clients must send:

- `conversation_id`: stable logical conversation id
- `model_name`: RPA LLM model name
- `messages`: rendered transcript entries with `role`, `content`, `image_urls`, `audio_urls`, and `video_urls`
- `current_message_index`: index of the current user message inside `messages`

The RPA text request schema rejects stale extra fields, including per-message `tool_payload`. TypeScript callers of `AutobyteusClient.sendMessage(...)` and `AutobyteusClient.streamMessage(...)` must pass the request object shape `{ conversationId, modelName, payload }`, where `payload` contains `messages` and `current_message_index`.

## TypeScript Identity Contract

Direct `AutobyteusLLM` RPA use now requires `kwargs.logicalConversationId` as a non-empty string for every text send/stream call. The adapter no longer generates a fallback UUID conversation id. Agent-driven calls supply the restored agent/run id through `LLMUserMessageReadyEventHandler`.

## Runtime Behavior

- Existing active RPA server sessions receive only the selected current user message.
- Missing server-side sessions are recreated with one synthesized user message built by flattening the already-rendered role/content transcript through `messages[current_message_index]`.
- Cache-miss resume prompts use role headers (`System:`, `User:`, `Assistant:`, `Tool:`), end with the final current `User:` block, and do not add old `Prior transcript:` or `Current user request:` headings.
- TypeScript owns tool-history rendering: `ToolCallPayload` is rendered into canonical AutoByteus XML and `ToolResultPayload` into deterministic result records before HTTP transport. The RPA server stays flatten-only and does not parse tool payloads or generate tool XML.
- Historical media is represented textually in the transcript; only current-turn media is materialized and attached.
- Cleanup tracks and removes every explicit remote conversation id used by an `AutobyteusLLM` instance.

## Validation

Latest authoritative API/E2E validation is Pass after Round-10 code review. Deterministic TypeScript unit/build checks, Python service/ASGI endpoint checks, fallback/stale-field/prompt-order guards, `git diff --check`, and live browser-backed validation passed.

Live validation used `gemini-3-pro-app-rpa` against the running RPA server and covered:

- non-stream cache miss/hit/model-mismatch/cleanup;
- stream cache miss/hit/cleanup;
- stale `user_message` rejection for send/stream and stale per-message `tool_payload` rejection;
- live TypeScript `AutobyteusLLM -> AutobyteusClient -> RPA server -> browser` behavior with explicit `logicalConversationId`.

## Migration Notes

Update any direct RPA LLM endpoint, `AutobyteusClient`, or direct `AutobyteusLLM` callers before release. Replace `user_message` request bodies with the transcript payload, remove any `tool_payload` HTTP fields, render tool calls/results into `content` before transport, and provide a stable `logicalConversationId` / `conversation_id` for resumable conversations.
