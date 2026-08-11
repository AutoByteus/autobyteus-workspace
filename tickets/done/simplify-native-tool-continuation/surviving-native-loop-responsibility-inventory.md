# Surviving Native Loop Responsibility Inventory

## Status And Purpose

- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-native-tool-continuation/tickets/done/simplify-native-tool-continuation/surviving-native-loop-responsibility-inventory.md`
- Type: Evidence and design-context supplement.
- Purpose: Classify suspected post-removal abstractions by real production reachability and current lifecycle responsibility so implementation does not delete necessary native behavior merely because a name sounds historical.
- Supported core artifacts: `investigation-notes.md`, `requirements.md`, and the later `design-spec.md`.
- Approval applicability: `N/A`. This file records evidence and candidate posture; intended behavior remains authoritative in `requirements.md`.
- Source authority: Refreshed `origin/personal` at `3cddeec6b93602da172fec2e7b9a80acc7c05117`.

## Classification Legend

- **Remove:** No current production responsibility remains after contraction, or the responsibility is an empty/duplicated indirection.
- **Contract:** A real responsibility remains, but multi-mode or misplaced coordination can be removed.
- **Retain:** The component owns a supported lifecycle boundary not caused by the removed text transports.
- **Review public break:** Repository production has no external caller, but the symbol is exported from the package root and removal may affect unknown consumers.

## Production Responsibility Inventory

| Component / Surface | Current Reachable Responsibility | Evidence | Classification | Candidate Target Posture |
| --- | --- | --- | --- | --- |
| `AgentTurnRunner` | Owns outer-turn loop sequencing, abort fences, status transitions, tool/result phases, continuation, recovery, and settlement. | Sole production caller of `ToolResultPipeline`, `ToolResultContinuationBuilder`, and same-turn continuation input. | Retain / extend | Make ordered result-batch ingestion explicit here after custom result processors complete. Do not merge provider streaming, tool execution, or memory internals into it. |
| `ToolPhase` | Owns preparation, approval, in-process/external execution, result collection, and interruption terminalization. | Sole normal producer of the result array consumed by the runner; iterates invocations in provider call order. | Retain | No behavior redesign. |
| `ToolResultPipeline` | Runs configured result processors in order and returns the final transformed event. | Sole production call is the runner's normal tool-result loop. | Retain | Preserve extension processing; remove the built-in memory side-effect processor from this customizable pipeline. |
| `MemoryIngestToolResultProcessor` | In the normal production batch it detects the active batch and deliberately does nothing; outside that path it can ingest a single result. | Runner is the only production pipeline caller; every normal native batch remains active until all results are processed. No other production `ToolResultPipeline` caller exists. | Remove / review public break | Runner calls `MemoryManager.ingestToolResults(...)` once with the final processed batch. Remove auto-injection, implementation file, and root export without a no-op replacement. |
| Active-batch deferral branch | Prevents the built-in processor from persisting each active result before the continuation builder persists the batch. | Log/probe shows one deferral per normal result followed by builder ingestion. | Remove | Eliminate the competing early-ingestion route rather than preserving a permanent deferral rule. |
| `ToolResultContinuationBuilder` | Resolves turn identity, persists results, builds semantic display text, extracts context files, and creates an internal `SenderType.TOOL` message with single-mode metadata. | Only production caller is the runner. Context/media behavior is real; memory/mode responsibilities are separable. | Contract / rename | Runner owns turn identity and ingestion. A pure `ToolContinuationInputBuilder` accepts processed results plus explicit turn ID and builds semantic text, context-file carriers, and factual turn/count processor metadata only. |
| `tool-continuation-metadata.ts` | Writes/reads a `tool_continuation_mode` key whose only accepted value is `native_api`. | Only source readers are `AgentInputPipeline` and `MemoryIngestInputProcessor`; only writer is the continuation builder. Metadata is not persisted. | Remove | Internal `SenderType.TOOL` plus presence/absence of a context carrier fully determines the request shape. |
| `AgentInputPipeline.processToolContinuation` | Validates same-turn TOOL input, runs configured input processors, builds the optional LLM-facing context carrier, and returns request-selection vocabulary. | Internal TOOL input cannot enter `AgentEventInbox`; runner is the only producer/caller. Input processors are intentionally preserved. | Contract | Keep the entrypoint and custom processor execution. Return `llmUserMessage: LLMUserMessage | null`; null means the canonical working context is already complete. |
| `MemoryIngestInputProcessor` | Persists processed external user input and currently writes a raw-trace boundary for internal TOOL continuation. | Auto-injected by `AgentFactory`; external user ingestion is real. The TOOL boundary repeats adjacent call/result facts, and repository production has no semantic reader for `tool_continuation`. | Retain / contract | Keep external user-memory ingestion. For `SenderType.TOOL`, preserve existing validation/processor flow but return without a memory write. Do not replace the trace with renamed coordination metadata. |
| `MemoryManager.ingestToolContinuationBoundary` | Writes `traceType: tool_continuation`, including the user-visible `Native API tool continuation` raw-trace card. | One production caller (`MemoryIngestInputProcessor`); no production semantic reader. Actual `tool_call` and `tool_result` records already carry the durable facts. | Remove | Delete the method and stale writer-focused coverage. Historical records remain generic readable traces and are not migrated. |
| `LlmRequestMode = append_user_message | tool_history_only` | Chooses whether request assembly appends `llmUserMessage`; propagated from pipeline through runner and LLM phase. | Only one semantic distinction remains: an actual user/media carrier is present or absent. | Remove | Express the distinction structurally with a nullable additional user message, not a mode string. |
| `LLMRequestAssembler.prepareToolContinuationRequest` | Duplicates `prepareRequest` except it does not append a user message and uses different diagnostic text. | Both methods perform the same system prompt, protocol-safety, compaction, recovery, sanitation, and rendering steps. | Remove / merge | One `prepareRequest(userMessageToAppend | null, identity, systemPrompt)` path; append only when the value exists. |
| `ToolContinuationReadyEvent` | Represents a same-turn LLM-ready transition without a new user message for status/lifecycle processing. | Runner emits it only when no carrier is appended; status derivation recognizes it. | Retain | This is ephemeral lifecycle identity, not transport selection or durable memory. Do not persist it or replace it with model-protocol vocabulary. |
| `SenderType.TOOL` internal carrier | Prevents internal continuation from starting a new external turn and lets processors recognize the same-turn message. | Inbox explicitly rejects it; pipeline validates it; builder is the only production constructor. | Retain | Keep as internal continuation identity. Remove redundant mode metadata. |
| `StreamingResponseHandlerFactory` | Chooses pass-through vs API handler and couples handler construction with schema construction. | Sole production caller is `LlmPhase`; only two branches remain. | Remove / review public break | With one handler capable of text and native tool deltas, `LlmPhase` can construct it directly and build schemas only when tool names exist. |
| `StreamingHandlerResult` | Data-only wrapper for handler plus nullable schemas. | No behavior; only factory/tests use it. Root-exported through handler index. | Remove / review public break | Use local values in `LlmPhase`; no replacement wrapper. |
| `StreamingResponseHandler` abstract base | Declares seven methods implemented by exactly two handlers. | No production dependency other than factory typing and subclass declarations. | Remove / review public break | A single concrete handler removes the need for an abstract hierarchy. |
| `PassThroughStreamingResponseHandler` | Emits ordinary text segment lifecycle and always returns zero invocations for no-tool turns. | Its text/interruption/failure behavior is already implemented by `ApiToolCallStreamingResponseHandler`. | Remove / review public break | Use the API-capable handler with native tool-delta processing disabled when the resolved tool list is empty. |
| `ApiToolCallStreamingResponseHandler` | Emits ordinary text plus native tool/file segment lifecycles and constructs normalized invocations. | Current unit coverage already proves text-only, legacy-looking text, tool, file, interruption, failure, and callback behavior. Its tool-specific name becomes misleading as the one handler for all LLM streams. | Contract / rename / review public break | Move the implementation to the canonical `LlmStreamingResponseHandler`. Accept a natural `toolCallsEnabled` construction fact so no-tool streams ignore unexpected tool deltas. Keep bounded indexed stream state and file projectors; do not retain a forwarding alias. |
| `ToolSchemaProvider` | Maps configured tool definitions to provider-native request schema. | Factory is only current caller; provider-specific formatters remain required. | Retain / re-own caller | `LlmPhase` invokes it only when resolved tool names are non-empty. |
| `ToolInvocationBatch` | Tracks turn/batch invocation identity and order for active-turn admission and LLM loop count; also contains an unused result-settlement map/API. | Production never calls `settleResult`, `hasSettled`, `isComplete`, `getOrderedSettledResults`, or `getSettledInvocationIds`. | Contract | Retain active-batch invocation identity/order and external-result admission; delete unused settlement state/methods. |
| Provider-native renderers | Translate canonical assistant tool calls/results to provider-specific API history. | Deterministic integration coverage for Gemini, Ollama, Anthropic, Mistral, and OpenAI Responses. | Retain | No generic continuation renderer or mode selection. |
| Context-file extraction and carrier | Converts tool-returned `ContextFile` values/serialized shapes into a user/media message for APIs that need the bytes/reference on the next request. | `read-media-file-continuation-flow.test.ts` proves audio/video carrier rendering. | Retain explicitly | Keep as the one exceptional reason a same-turn tool continuation appends a user message. |
| Compaction/protocol safety/recovery | Protects canonical tool call/result suffixes, sanitizes media, and restores a failed request boundary. | Both assembler methods call the same safety/compaction/recovery sequence. | Retain | Preserve exact timing while consolidating the duplicate methods. |

## Supported Target Shape Candidate

The evidence supports this target flow without introducing a new protocol abstraction:

`AgentTurnRunner -> LlmPhase -> one concrete native-capable stream handler -> ToolPhase -> custom ToolResultPipeline -> AgentTurnRunner batch ingestion -> ToolContinuationInputBuilder -> AgentInputPipeline -> one LLMRequestAssembler.prepareRequest(optional carrier) -> provider-native renderer`

On the continuation return path, `MemoryIngestInputProcessor` performs no raw-trace write for internal TOOL input. Durable history already contains the ordered `tool_call` and `tool_result` facts; `ToolContinuationReadyEvent` remains runtime-only.

Natural, still-required distinctions are data facts rather than selectable modes:

1. Configured tool names are empty or non-empty. This controls whether schemas are sent and whether native tool deltas are accepted.
2. A completed tool result batch has context files or does not. This controls whether an additional user/media carrier exists.
3. The next LLM leg originates from external input or same-turn continuation. This controls status/lifecycle identity and turn validation.

None of these is a model-to-tool transport selector.

## Candidate Deletion Surface

Production files that can be deleted entirely if the requirements are approved and implementation tracing confirms no new base changes:

- `autobyteus-ts/src/agent/message/tool-continuation-metadata.ts`
- `autobyteus-ts/src/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.ts`
- `autobyteus-ts/src/agent/streaming/handlers/streaming-response-handler.ts`
- `autobyteus-ts/src/agent/streaming/handlers/pass-through-streaming-response-handler.ts`
- `autobyteus-ts/src/agent/streaming/handlers/streaming-handler-factory.ts`

These five files contain about 269 source lines on the investigated base. Additional deletions come from `MemoryManager.ingestToolContinuationBoundary`, its input-processor call/tests, auto-injection, exports, duplicate assembler branches, continuation metadata/turn resolution, and unused batch settlement APIs. Exact implementation delta remains implementation-owned.

## Public Surface Impact

Repository production source has no consumer of the following root-exported concrete symbols outside `autobyteus-ts` itself:

- `MemoryIngestToolResultProcessor`
- `StreamingResponseHandler`
- `PassThroughStreamingResponseHandler`
- `StreamingResponseHandlerFactory`
- `StreamingHandlerResult`

Removing them is a clean public contraction and may break unknown external subpath/root consumers. The proposed requirements reject aliases and no-op compatibility wrappers; approval should treat the contraction as intentional.

The following supported surfaces remain:

- `LlmStreamingResponseHandler` as the concrete normalized stream owner (clean rename of the current API handler, without an old-name alias);
- `SegmentEvent` / segment enums;
- native provider schema formatters and `ToolSchemaProvider`;
- tool-result processor base/registry for actual custom processors;
- input processor base/registry and `MemoryIngestInputProcessor`.

## Coverage Evidence And Downstream Impact

- Focused current-base probe passed 8 files / 45 tests covering the runner, builder, input pipeline, memory result processor, handler factory, pass-through handler, read-media carrier, and five provider-native continuation renderers.
- The provider-native integration logs show `MemoryIngestToolResultProcessor` deferring each active result, followed by one builder batch ingestion; this is direct evidence of duplicated coordination rather than two valid production ingestion paths.
- The user-supplied raw-trace screenshot and production writer/reader search show that `Native API tool continuation` is a displayed coordination marker, not independently consumed memory. The writer and method can be removed without removing tool facts or the runtime continuation.
- Durable coverage will require updates/removals after initial code review. In particular, factory/pass-through/memory-processor/mode/boundary-writer assertions become stale, while native handler, provider continuation, ordered call/result traces, absence of new continuation traces, media carrier, interruption, compaction, request recovery, and no-tool scenarios must remain or expand.
- Final test-file decisions belong to `api_e2e_engineer` after its mandatory coverage investigation.
