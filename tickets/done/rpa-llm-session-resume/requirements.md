# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

AutoByteus chats that use an AutoByteus RPA LLM model must continue correctly after the AutoByteus server/agent process is restarted and the same logical agent run is restored. Today the restored `autobyteus-ts` agent can load the prior working context from memory, but the AutoByteus RPA LLM transport collapses the request to only the newest user message and uses a transient in-memory `AutobyteusLLM` conversation id. The RPA LLM server therefore creates or selects the wrong remote/browser conversation and loses the earlier chat context.

## Investigation Findings

- `autobyteus-server-ts` already restores an AutoByteus standalone run with the same logical run id:
  - `AgentRunService.restoreAgentRun(...)` reads run metadata and calls `AgentRunManager.restoreAgentRun(...)` with the recorded run id and memory dir.
  - `AutoByteusAgentRunBackendFactory.restoreBackend(...)` calls `defaultAgentFactory.restoreAgent(context.runId, built.agentConfig, memoryDir)`.
- `autobyteus-ts` already restores local working context for restored agents:
  - `AgentBootstrapper` includes `WorkingContextSnapshotRestoreStep`.
  - `WorkingContextSnapshotBootstrapper` reads `working_context_snapshot.json` when present and resets the `MemoryManager` working context.
  - `LLMRequestAssembler.prepareRequest(...)` appends the newest user message and returns the full working-context message list.
- The RPA LLM transport discards that restored context:
  - `AutobyteusPromptRenderer.render(...)` scans backward and returns only the latest user message.
  - `AutobyteusLLM._sendMessagesToLLM(...)` and `_streamMessagesToLLM(...)` use only that latest rendered user payload.
  - `AutobyteusLLM` constructs `conversationId = randomUUID()` in its constructor, so a restored agent process gets a new remote conversation id even when the logical run id is the same.
- The TypeScript RPA client/server contract is single-message only:
  - `AutobyteusClient.sendMessage(...)` and `streamMessage(...)` post `conversation_id`, `model_name`, `user_message`, and latest media arrays.
  - RPA server `SendUserMessageRequest` has the same single-message shape.
- The RPA LLM server has only an in-memory conversation cache:
  - `LLMService.conversations` is a process-local dictionary keyed by `conversation_id`.
  - If a key is missing, `LLMService` creates a fresh `RPALLMFactory.create_llm(model_name)` instance.
  - `RPABaseLLM` tracks `_user_message_count` inside that instance; UI integrators call `start_new_conversation()` when first used and use the message count to locate the response turn.
- Therefore stable continuation requires both:
  - a stable logical conversation id derived from the AutoByteus run/session boundary, not from the transient LLM object; and
  - a request contract that carries enough reconstructed transcript for the RPA server to bootstrap a new browser/UI conversation when its in-memory session is absent.

## Recommendations

Implement a clean-cut replacement of the AutoByteus RPA LLM text contract from "single latest user message plus transient conversation id" to "caller-supplied stable logical conversation id plus rendered conversation transcript." Require every AutoByteus RPA text LLM call to provide an explicit `logicalConversationId`; agent-driven calls use the AutoByteus agent run id as the logical RPA `conversation_id`, and direct non-agent callers must supply their own stable logical conversation id. Send a normalized message payload containing the working-context transcript and the current user message. On the TypeScript side, the AutoByteus RPA renderer converts structured tool-call/tool-result history into the same transcript text shape AutoByteus expects, including canonical XML for historical assistant tool calls. Let the RPA server decide, based on its active session cache, whether to send only the current user message to an existing UI conversation or synthesize one flattened transcript message when it must create a fresh UI conversation.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: Continue a restored AutoByteus agent chat after the AutoByteus server/agent process restarts while using an AutoByteus RPA LLM model.
- UC-002: Preserve useful multi-turn context when `autobyteus-ts` has restored working-context memory but the RPA LLM server has no active in-memory conversation for the logical chat.
- UC-003: Preserve normal active-session behavior when the RPA LLM server still has the in-memory conversation for the logical chat.
- UC-004: Avoid cross-chat or cross-model context leakage when two runs or model selections differ.

## Out of Scope

- Persisting browser/UI provider sessions inside `autobyteus_rpa_llm_workspace` across RPA LLM server process restarts.
- Replaying every historical user/assistant turn into the browser UI as separate turns; the resume path should synthesize context into the first post-restart user message when the server-side RPA session is missing.
- UI redesign.
- Voice transcription quality changes. Voice/audio inputs are only relevant as message media that may appear on the current user message.
- Full historical media re-upload. Historical media may be represented as textual references in the resume transcript; only the current user message's media must remain attachable.

## Functional Requirements

- FR-001: AutoByteus RPA text LLM requests must use an explicit caller-supplied stable logical conversation id; agent-driven requests must provide the restored agent run id, and direct non-agent callers must provide their own stable id.
- FR-002: The RPA LLM request payload must include a normalized rendered transcript of the current working context, not only the latest user message. When source messages contain structured tool calls or tool results, the TypeScript AutoByteus RPA renderer must include them in message content as canonical transcript text/XML before the payload reaches the RPA server.
- FR-003: The payload must identify the current/latest user message unambiguously and preserve its text plus image/audio/video attachments.
- FR-004: When the RPA LLM server has an active session for the logical conversation id, it must send only the current user message to that active RPA LLM instance to avoid duplicating prior context.
- FR-005: When the RPA LLM server does not have an active session for the logical conversation id, it must create a new RPA LLM instance and send one synthesized user message that is a faithful flattened transcript, with the current user message as the final `User` block.
- FR-006: The rendered transcript must include user, assistant, system, tool-call, and tool-result context. Historical tool calls must be rendered by TypeScript from structured payloads into canonical AutoByteus XML; historical tool results must be rendered as deterministic result records. The RPA server must not parse or interpret tool payloads for XML conversion; it only flattens already-rendered messages on cache miss. Only the current user message's media remains attachable media.
- FR-007: The RPA LLM server must reject or replace a cached session when the same logical conversation id is reused with a different model name, rather than silently mixing models.
- FR-008: Cleanup must target every explicit remote conversation id actually used by an `AutobyteusLLM` instance so intentional termination does not leave stale RPA server sessions.
- FR-009: The old single-message text LLM endpoint shape, TypeScript client call shape, and generated fallback UUID conversation identity must be removed from in-scope source/tests rather than kept as compatibility paths.
- FR-010: The change must include executable validation for TypeScript request rendering/identity propagation and Python RPA server resume behavior.

## Acceptance Criteria

- AC-001: Given a restored AutoByteus agent run whose memory contains at least one prior user and assistant message, the next RPA LLM request uses the restored agent run id as the logical `conversation_id` and does not generate a fallback UUID.
- AC-002: The TypeScript AutoByteus RPA LLM request payload contains the prior rendered transcript entries, including XML-rendered historical tool calls and tool-result records where present, plus the latest user entry; the latest user entry remains the current message sent to the RPA UI.
- AC-003: If the RPA LLM server already has a cached session for that `conversation_id`, it calls the cached RPA LLM with only the latest user content/media and does not include the resume transcript in the UI message.
- AC-004: If the RPA LLM server has no cached session for that `conversation_id`, it creates a new RPA LLM and calls it with one flattened transcript message made from already-rendered payload message content, containing prior user/assistant context, XML-rendered historical tool calls, historical tool results, and the latest user message as the final `User` block without adding a separate `Current user request:` section.
- AC-005: A second logical run id after restart does not receive any transcript, cached LLM instance, or provider/browser state from the first run id.
- AC-006: Reusing a `conversation_id` with a different `model_name` is handled explicitly by validation/replacement behavior covered by tests, not by silent cache reuse.
- AC-007: Unit tests cover `AutobyteusPromptRenderer`, `AutobyteusLLM` client payload generation, `AutobyteusLLM` rejection when `logicalConversationId` is missing, and `LLMUserMessageReadyEventHandler` logical conversation id propagation.
- AC-008: Python service tests cover both active-session no-duplication and missing-session history-resume behavior without needing live browser/RPA dependencies.
- AC-009: A transcript containing an assistant tool call and a tool result is rendered by the TypeScript AutoByteus RPA renderer before transport: the assistant tool call appears in message content as canonical AutoByteus XML and the tool result appears with its id, tool name, result, and error information. The RPA server cache-miss path flattens those rendered messages without parsing tool structure.

## Constraints / Dependencies

- Primary source workspace: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-llm-session-resume`.
- Clean RPA source workspace for this task: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace-rpa-llm-session-resume`.
- The user's original RPA checkout at `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace` is dirty and must not be used for implementation edits.
- `autobyteus-server-ts` already has run metadata and restore plumbing; the primary TypeScript changes should live in `autobyteus-ts` unless implementation discovers a missing server-ts boundary.
- The RPA LLM server remains process-memory-backed for live browser sessions; history-based reconstruction is required when that memory is absent.

## Assumptions

- For AutoByteus standalone server runs, `context.agentId` in `autobyteus-ts` is the same logical run id that `autobyteus-server-ts` exposes as the agent run id.
- The desired behavior is semantic chat continuity; preserving the exact browser/provider session object is desirable when available but not required when unavailable.
- Prior media can be represented as transcript text on resume; only current user media must be uploaded/attached to the browser UI.
- Direct, non-agent `AutobyteusLLM` use must provide an explicit stable `logicalConversationId`; `AutobyteusLLM` must reject missing identity instead of generating a transient fallback UUID.

## Risks / Open Questions

- OQ-001: Should the model-mismatch behavior reject with a clear error or cleanup-and-replace the old cached session? Recommendation: reject to avoid accidental context loss unless the implementation owner confirms replacement is preferred.
- OQ-002: How much transcript should be sent when the working context is large? Recommendation: use the already-compacted working context produced by `MemoryManager`; do not add a separate RPA-specific compaction policy in this change.
- OQ-003: Should historical media URLs be redacted in resume prompts for privacy? Recommendation: include counts/type labels by default and avoid embedding historical data URIs.

## Requirement-To-Use-Case Coverage

| Requirement | UC-001 | UC-002 | UC-003 | UC-004 |
| --- | --- | --- | --- | --- |
| FR-001 | Yes | Yes | Yes | Yes |
| FR-002 | Yes | Yes | No | No |
| FR-003 | Yes | Yes | Yes | No |
| FR-004 | Yes | No | Yes | No |
| FR-005 | Yes | Yes | No | No |
| FR-006 | Yes | Yes | No | No |
| FR-007 | No | No | Yes | Yes |
| FR-008 | Yes | No | Yes | Yes |
| FR-009 | Yes | Yes | Yes | Yes |
| FR-010 | Yes | Yes | Yes | Yes |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001 | Stable logical identity after restore |
| AC-002 | TypeScript transcript payload generation |
| AC-003 | Active RPA server session path avoids duplicate context |
| AC-004 | Missing RPA server session path reconstructs context |
| AC-005 | Cross-run isolation |
| AC-006 | Cross-model cache safety |
| AC-007 | TypeScript regression coverage |
| AC-008 | Python RPA service regression coverage |
| AC-009 | TypeScript tool-payload-to-XML rendering and RPA server flatten-only resume behavior |

## Approval Status

Approved by user on 2026-04-29 in conversation: user confirmed the proposed direction that `autobyteus-ts` should send messages/context to the RPA server and the server should decide how to use it. User further clarified on 2026-04-29 that tool calls must be included in the AutoByteus client payload and represented as canonical AutoByteus XML by the TypeScript AutoByteus RPA renderer before they reach the RPA server; the RPA server should not need a tool parser. User also clarified on 2026-04-29 that the cache-miss resume message should look like the original role-ordered transcript flattened into one message, not introduce a separate `Current user request:` section; the final `User` block is the current turn. On 2026-04-30, implementation reported the user clarified the identity contract further: generated fallback UUID behavior must be removed, `AutobyteusLLM` must require `kwargs.logicalConversationId`, and direct non-agent callers must provide their own stable logical conversation id.
