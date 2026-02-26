# Memory Migration Progress Record

This document tracks the Autobyteus memory subsystem migration from Python into autobyteus-ts.
Test parity requirement: TS unit + integration coverage must match or exceed the Python memory suite. LM Studio-dependent tests are included but gated by environment configuration.

## Legend
- **Status:** `Pending`, `In Progress`, `Completed`, `Deferred`
- **Test Status:** `Pending`, `In Progress`, `Created`, `Deferred`, `N/A`
- **Notes:** brief summary of scope and test coverage
- **Note:** Test Status tracks whether the TS test file was migrated/created; actual executions are tracked in the Unit Run / Integration Run columns and the Progress Log.

## Progress Log
- 2026-02-03: Added `MEMORY_MIGRATION_STRATEGY.md` and standardized progress format to match other tickets.
- 2026-02-03: Clarified Node.js/TS naming conventions (file naming + casing) in `MEMORY_MIGRATION_STRATEGY.md`.
- 2026-02-03: Added file-store episodic/semantic/list-limit coverage and MemoryManager raw-tail/tool-interaction filtering tests. Ran `pnpm exec vitest --run tests/unit/memory/file-store.test.ts tests/unit/memory/memory-manager.test.ts` (passed).
- 2026-02-03: Added tool payload support to `Message` + TOOL role; ran `pnpm exec vitest --run tests/unit/llm/utils/messages.test.ts` (passed).
- 2026-02-03: Added prompt renderers (OpenAI chat + responses); ran `pnpm exec vitest --run tests/unit/llm/prompt-renderers/openai-chat-renderer.test.ts tests/unit/llm/prompt-renderers/openai-responses-renderer.test.ts` (passed).
- 2026-02-03: Refactored TS LLM core to stateless `sendMessages/streamMessages` and updated providers to use prompt renderers; added Anthropic/Gemini/Mistral/Ollama/Autobyteus renderers.
- 2026-02-03: Implemented memory core (models, store, active transcript, compaction, retriever, memory manager) and added unit tests for transcript/turn tracker/file store.
- 2026-02-03: Integrated memory into agent runtime (memory manager init, input/tool result processors, request assembler, handler updates); removed `conversationHistory` usage across runtime and tests.
- 2026-02-03: Updated tool approval integration to set turn IDs for memory traces; run_bash integration skipped because `node-pty` is unavailable. Ran `pnpm exec vitest --run tests/unit/memory tests/unit/agent/handlers/llm-user-message-ready-event-handler.test.ts tests/unit/llm/base.test.ts tests/integration/agent/tool-approval-flow.test.ts` (passed; run_bash skipped).
- 2026-02-03: Added unit tests for compaction policy/snapshot/compactor flows, memory ingest processors, LLM request assembler, and token budget; updated LLM config tests for compaction fields. Ran `pnpm exec vitest --run tests/unit/memory tests/unit/agent/input-processor/memory-ingest-input-processor.test.ts tests/unit/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.test.ts tests/unit/agent/llm-request-assembler.test.ts tests/unit/agent/llm-request-assembler-compaction-trigger.test.ts tests/unit/agent/token-budget.test.ts tests/unit/llm/utils/llm-config.test.ts` (passed).
- 2026-02-03: Added unit tests for MemoryManager/Retriever/ToolInteractionBuilder and integration tests for compaction flows (tool tail/quality/real scenario/real summarizer). Ran `pnpm exec vitest --run tests/unit/memory/memory-manager.test.ts tests/unit/memory/retriever.test.ts tests/unit/memory/tool-interaction-builder.test.ts tests/integration/agent/memory-compaction-tool-tail-flow.test.ts tests/integration/agent/memory-compaction-quality-flow.test.ts tests/integration/agent/memory-compaction-real-scenario-flow.test.ts tests/integration/agent/memory-compaction-real-summarizer-flow.test.ts` (passed).
- 2026-02-03: Added LM Studio-gated integration tests for memory flows (`memory-llm-flow`, `memory-compaction-flow`, `memory-tool-call-flow`, `handler-memory-flow`, `full-tool-roundtrip-flow`). Not run (requires LM Studio config).
- 2026-02-03: Ran LM Studio-gated memory integration flows (`memory-llm-flow`, `memory-compaction-flow`, `memory-tool-call-flow`, `handler-memory-flow`, `full-tool-roundtrip-flow`) (passed). Warnings emitted about Ollama/LM Studio/Autobyteus connectivity and missing `AUTOBYTEUS_SSL_CERT_FILE`.
- 2026-02-03: Added file-store prune test for archive-disabled mode; ran `pnpm exec vitest --run tests/unit/memory/file-store.test.ts` (passed).
- 2026-02-03: Ran LLM unit suite `pnpm exec vitest --run tests/unit/llm` (passed; expected stderr from media payload negative cases).
- 2026-02-03: Ran LLM integration suite (non-API) `pnpm exec vitest --run tests/integration/llm/base.test.ts tests/integration/llm/enums.test.ts tests/integration/llm/extensions tests/integration/llm/llm-reloading.test.ts tests/integration/llm/models.test.ts tests/integration/llm/token-counter tests/integration/llm/user-message.test.ts tests/integration/llm/utils tests/integration/llm/converters` (2 failures: token usage extension expected stateful messages; messages integration expected no tool payload).
- 2026-02-03: Updated LLM integration tests for stateless message flow + tool payload serialization; re-ran `pnpm exec vitest --run tests/integration/llm/extensions/token-usage-tracking-extension.test.ts tests/integration/llm/utils/messages.test.ts` (passed).
- 2026-02-03: Ran `pnpm exec vitest --run tests/unit/agent/context/agent-runtime-state.test.ts tests/unit/agent/factory/agent-factory.test.ts tests/unit/agent/handlers/tool-invocation-request-event-handler.test.ts tests/unit/agent/handlers/tool-result-event-handler.test.ts` (agent-runtime-state failed: expected agent id mismatch).
- 2026-02-03: Fixed agent runtime state string expectation; re-ran `pnpm exec vitest --run tests/unit/agent/context/agent-runtime-state.test.ts` (passed).
- 2026-02-03: Added prompt renderer unit coverage for Anthropic/Gemini/Mistral/Ollama/Autobyteus and aligned tool payload formatting with Python expectations. Ran `pnpm exec vitest --run tests/unit/llm/prompt-renderers/anthropic-prompt-renderer.test.ts tests/unit/llm/prompt-renderers/gemini-prompt-renderer.test.ts tests/unit/llm/prompt-renderers/mistral-prompt-renderer.test.ts tests/unit/llm/prompt-renderers/ollama-prompt-renderer.test.ts tests/unit/llm/prompt-renderers/autobyteus-prompt-renderer.test.ts` (passed).
- 2026-02-03: Ran `pnpm exec vitest --run tests/integration/llm/api/autobyteus-llm.test.ts` (passed; connectivity warnings logged).
- 2026-02-03: Ran `pnpm exec vitest --run tests/integration/llm/api/lmstudio-llm.test.ts` (passed; connectivity warnings logged).
- 2026-02-03: Ran `pnpm exec vitest --run tests/integration/llm/api/ollama-llm.test.ts` (passed; connectivity warnings logged).
- 2026-02-03: Ran `pnpm exec vitest --run tests/integration/llm/api/openai-compatible-llm.test.ts` (passed).
- 2026-02-03: Ran `pnpm exec vitest --run tests/integration/llm/api/openai-llm.test.ts` (failed: connection error).
- 2026-02-03: Ran `pnpm exec vitest --run tests/integration/llm/api/openai-llm-image.test.ts` (failed: connection error; invalid image path case failed).
- 2026-02-03: Ran `pnpm exec vitest --run tests/integration/llm/api/anthropic-llm.test.ts` (failed: connection error).
- 2026-02-03: Ran `pnpm exec vitest --run tests/integration/llm/api/anthropic-llm-image.test.ts` (failed: unsupported MIME invalid media source; connection error).
- 2026-02-03: Ran `pnpm exec vitest --run tests/integration/llm/api/gemini-llm.test.ts` (failed: ENOTFOUND oauth2.googleapis.com).
- 2026-02-03: Ran `pnpm exec vitest --run tests/integration/llm/api/mistral-llm.test.ts` (failed: connection error, fetch failed).
- 2026-02-03: Ran `pnpm exec vitest --run tests/integration/llm/api/grok-llm.test.ts` (failed: connection error).
- 2026-02-03: Ran `pnpm exec vitest --run tests/integration/llm/api/kimi-llm.test.ts` (failed: connection error).
- 2026-02-03: Ran `pnpm exec vitest --run tests/integration/llm/api/deepseek-llm.test.ts` (failed: connection error).
- 2026-02-03: Ran `pnpm exec vitest --run tests/integration/llm/api/zhipu-llm.test.ts` (failed: connection error).
- 2026-02-03: Ran `pnpm exec vitest --run tests/integration/llm/api/qwen-llm.test.ts` (skipped).
- 2026-02-03: Removed `llm.messages` assertions across all LLM API integration tests to align with stateless LLM behavior (Python parity). Adjusted OpenAI image cleanup test to validate cleanup without history access.
- 2026-02-03: Ran `pnpm exec vitest --run tests/integration/llm/api/mistral-llm.test.ts` (failed: connection error, fetch failed).
- 2026-02-03: Ran `pnpm exec vitest --run tests/integration/agent tests/integration/agent-team` (failed: live tool-call handler tests for OpenAI/Anthropic/Gemini/Mistral due to connection/DNS errors; LM Studio/Autobyteus connectivity warnings emitted).

## Progress Table
| File | Status | Unit Tests | Unit Run | Integration Tests | Integration Run | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `memory_migration_ticket/MEMORY_MIGRATION_STRATEGY.md` | Completed | N/A | N/A | N/A | N/A | Strategy for parity, bottom-up TDD, and test coverage |
| `memory_migration_ticket/MEMORY_MIGRATION_PROGRESS.md` | Completed | N/A | N/A | N/A | N/A | Progress tracking record |
| `src/memory/models/memory-types.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | Memory type enums (RAW_TRACE / EPISODIC / SEMANTIC) |
| `src/memory/models/raw-trace-item.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | JSONL trace schema + serialization |
| `src/memory/models/episodic-item.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | Episodic summary records |
| `src/memory/models/semantic-item.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | Semantic facts with confidence |
| `src/memory/models/tool-interaction.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | Derived tool interaction model |
| `src/memory/store/base-store.ts` | Completed | N/A | N/A | N/A | N/A | Base store interface |
| `src/memory/store/file-store.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | JSONL file store + archive pruning |
| `src/memory/active-transcript.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | Transcript assembly with tool payloads |
| `src/memory/turn-tracker.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | Turn ID allocation (turn_0001) |
| `src/memory/compaction/compaction-result.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | Compaction output (episodic + semantic) |
| `src/memory/compaction/summarizer.ts` | Completed | N/A | N/A | N/A | N/A | Summarizer interface |
| `src/memory/compaction/compactor.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | Compaction window selection + pruning |
| `src/memory/policies/compaction-policy.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | Trigger ratio + safety margin |
| `src/memory/retrieval/memory-bundle.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | Episodic + semantic bundle |
| `src/memory/retrieval/retriever.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | Retrieval from memory store |
| `src/memory/tool-interaction-builder.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | Tool interaction builder |
| `src/memory/compaction-snapshot-builder.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | Snapshot formatting |
| `src/memory/memory-manager.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | Ingest + transcript + compaction hook |
| `src/memory/index.ts` | Completed | N/A | N/A | N/A | N/A | Memory exports |
| `src/llm/utils/messages.ts` | Completed | Created | 2026-02-03 Passed | Created | 2026-02-03 Passed | TOOL role + tool payload support |
| `src/llm/prompt-renderers/base-prompt-renderer.ts` | Completed | N/A | N/A | N/A | N/A | Prompt renderer base |
| `src/llm/prompt-renderers/tool-payload-format.ts` | Completed | N/A | N/A | N/A | N/A | Shared tool payload formatting helpers |
| `src/llm/prompt-renderers/openai-chat-renderer.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | OpenAI chat prompt rendering |
| `src/llm/prompt-renderers/openai-responses-renderer.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | OpenAI responses prompt rendering |
| `src/llm/prompt-renderers/anthropic-prompt-renderer.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | Anthropic prompt rendering |
| `src/llm/prompt-renderers/gemini-prompt-renderer.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | Gemini prompt rendering |
| `src/llm/prompt-renderers/mistral-prompt-renderer.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | Mistral prompt rendering |
| `src/llm/prompt-renderers/ollama-prompt-renderer.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | Ollama prompt rendering |
| `src/llm/prompt-renderers/autobyteus-prompt-renderer.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | Autobyteus prompt rendering |
| `src/llm/prompt-renderers/index.ts` | Completed | N/A | N/A | N/A | N/A | Renderer exports |
| `src/llm/base.ts` | Completed | Created | 2026-02-03 Passed | Created | 2026-02-03 Passed | Stateless sendMessages/streamMessages |
| `src/llm/models.ts` | Completed | Created | 2026-02-03 Passed | Created | 2026-02-03 Passed | Context metadata fields for token budget |
| `src/llm/utils/llm-config.ts` | Completed | Created | 2026-02-03 Passed | Created | 2026-02-03 Passed | Compaction config fields |
| `src/agent/token-budget.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | Token budget + compaction policy |
| `src/agent/context/agent-runtime-state.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | Memory manager + removed history |
| `src/agent/input-processor/memory-ingest-input-processor.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | Memory ingest of processed user input |
| `src/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | Memory ingest of tool results |
| `src/agent/llm-request-assembler.ts` | Completed | Created | 2026-02-03 Passed | Created | 2026-02-03 Passed | Build transcript + snapshot |
| `src/agent/handlers/llm-user-message-ready-event-handler.ts` | Completed | Created | 2026-02-03 Passed | Created | 2026-02-03 Passed | Switched to memory-based flow |
| `src/agent/factory/agent-factory.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | Initialize memory + inject processors (Autobyteus model fetch warnings) |
| `src/agent/handlers/tool-invocation-request-event-handler.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | Ensure tool invocations carry turnId |
| `src/agent/handlers/tool-result-event-handler.ts` | Completed | Created | 2026-02-03 Passed | N/A | N/A | Tool result ingestion ordering |
| `tests/unit/memory/active-transcript.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/memory/compaction-archive-flow.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/memory/compaction-flow.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/memory/compaction-policy.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/memory/compaction-snapshot-builder.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/memory/compactor.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/memory/file-store.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/memory/memory-manager.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/memory/raw-trace-rollover.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/memory/retriever.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/memory/tool-interaction-builder.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/memory/turn-tracker.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/agent/input-processor/memory-ingest-input-processor.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/agent/llm-request-assembler.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/agent/llm-request-assembler-compaction-trigger.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/agent/token-budget.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/agent/handlers/llm-user-message-ready-event-handler.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/agent/context/agent-runtime-state.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/agent/factory/agent-factory.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test (Autobyteus model fetch warnings) |
| `tests/unit/agent/handlers/tool-invocation-request-event-handler.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/agent/handlers/tool-result-event-handler.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/llm/base.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/llm/utils/messages.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/llm/utils/llm-config.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/llm/prompt-renderers/openai-chat-renderer.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/llm/prompt-renderers/openai-responses-renderer.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/llm/prompt-renderers/anthropic-prompt-renderer.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/llm/prompt-renderers/gemini-prompt-renderer.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/llm/prompt-renderers/mistral-prompt-renderer.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/llm/prompt-renderers/ollama-prompt-renderer.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/unit/llm/prompt-renderers/autobyteus-prompt-renderer.test.ts` | Completed | N/A | 2026-02-03 Passed | N/A | N/A | Unit test |
| `tests/integration/llm/base.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration test |
| `tests/integration/llm/enums.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration test |
| `tests/integration/llm/extensions/base-extension.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration test |
| `tests/integration/llm/extensions/extension-registry.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration test |
| `tests/integration/llm/extensions/token-usage-tracking-extension.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration test (stateless message flow) |
| `tests/integration/llm/llm-reloading.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration test (model discovery warnings logged) |
| `tests/integration/llm/models.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration test |
| `tests/integration/llm/token-counter/base-token-counter.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration test |
| `tests/integration/llm/user-message.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration test |
| `tests/integration/llm/utils/llm-config.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration test |
| `tests/integration/llm/utils/media-payload-formatter.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration test |
| `tests/integration/llm/utils/messages.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration test (tool payload serialization) |
| `tests/integration/llm/utils/response-types.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration test |
| `tests/integration/llm/utils/token-usage.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration test |
| `tests/integration/llm/utils/token-usage-tracker.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration test |
| `tests/integration/llm/utils/tool-call-delta.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration test |
| `tests/integration/llm/converters/anthropic-tool-call-converter.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration test |
| `tests/integration/llm/converters/openai-tool-call-converter.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration test |
| `tests/integration/llm/api/anthropic-llm.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Failed | Connection error |
| `tests/integration/llm/api/anthropic-llm-image.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Failed | Unsupported MIME invalid media source; connection error |
| `tests/integration/llm/api/autobyteus-llm.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration test (connectivity warnings logged) |
| `tests/integration/llm/api/deepseek-llm.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Failed | Connection error |
| `tests/integration/llm/api/gemini-llm.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Failed | ENOTFOUND oauth2.googleapis.com |
| `tests/integration/llm/api/grok-llm.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Failed | Connection error |
| `tests/integration/llm/api/kimi-llm.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Failed | Connection error |
| `tests/integration/llm/api/lmstudio-llm.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration test (connectivity warnings logged) |
| `tests/integration/llm/api/mistral-llm.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Failed | Connection error (fetch failed) |
| `tests/integration/llm/api/ollama-llm.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration test (connectivity warnings logged) |
| `tests/integration/llm/api/openai-compatible-llm.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration test |
| `tests/integration/llm/api/openai-llm.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Failed | Connection error |
| `tests/integration/llm/api/openai-llm-image.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Failed | Connection error; invalid image path case failed |
| `tests/integration/llm/api/qwen-llm.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Skipped | All tests skipped by suite |
| `tests/integration/llm/api/zhipu-llm.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Failed | Connection error |
| `tests/integration/agent/memory-compaction-tool-tail-flow.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration flow (deterministic summarizer) |
| `tests/integration/agent/memory-compaction-quality-flow.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration flow (deterministic summarizer) |
| `tests/integration/agent/memory-compaction-real-scenario-flow.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration flow (deterministic summarizer) |
| `tests/integration/agent/memory-compaction-real-summarizer-flow.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration flow (deterministic summarizer) |
| `tests/integration/agent/memory-llm-flow.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration flow (LM Studio gated; connectivity warnings) |
| `tests/integration/agent/memory-compaction-flow.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration flow (LM Studio gated; connectivity warnings) |
| `tests/integration/agent/memory-tool-call-flow.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration flow (LM Studio gated; connectivity warnings) |
| `tests/integration/agent/handler-memory-flow.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration flow (LM Studio gated; connectivity warnings) |
| `tests/integration/agent/full-tool-roundtrip-flow.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration flow (LM Studio gated; connectivity warnings) |
| `tests/integration/agent/tool-approval-flow.test.ts` | Completed | N/A | N/A | Created | 2026-02-03 Passed | Integration flow (turnId wiring; run_bash skipped without node-pty) |
