# Release Notes — Simplified Native Tool Continuation

## Summary

The native tool loop now uses one explicit control path for tool-equipped and
no-tool LLM streams. This is a clean public/API contraction: obsolete handler,
factory, continuation-mode, and built-in persistence-processor surfaces were
removed rather than retained as aliases.

## Runtime Changes

- `LlmPhase` constructs one `LlmStreamingResponseHandler` and explicitly enables
  native tool-call deltas only when the turn has configured tools.
- `ToolSchemaProvider` builds provider-native schemas only for tool-equipped
  turns; no-tool requests omit the `tools` field.
- `AgentTurnRunner` commits each final, post-processor result batch once through
  `MemoryManager.ingestToolResults(...)`, preserving native order.
- `ToolContinuationInputBuilder` is now a pure semantic/context carrier builder.
- `AgentInputPipeline` returns `llmUserMessage: null` for text-only structured
  native continuation and a message only when context-file media needs a carrier.
- All request shapes use `LLMRequestAssembler.prepareRequest(...)`.
- `ToolInvocationBatch` retains identity, order, and admission only.

## Supported Public Contracts

The package root retains the canonical identities for:

- `LlmStreamingResponseHandler`
- `ToolSchemaProvider`
- `SegmentEvent`
- `BaseToolExecutionResultProcessor`
- `ToolExecutionResultProcessorRegistry`

`ToolContinuationInputBuilder` remains importable from its canonical internal
module, but is not presented as a package-root contract.

## Breaking Public Contraction

The following old root names and corresponding old subpaths are removed without
aliases or compatibility wrappers:

- `StreamingResponseHandlerFactory`
- `StreamingResponseHandler`
- `StreamingHandlerResult`
- `PassThroughStreamingResponseHandler`
- `ApiToolCallStreamingResponseHandler`
- `MemoryIngestToolResultProcessor`
- `ToolResultContinuationBuilder`
- `ToolContinuationMetadata`
- `ToolContinuationMode`
- `TOOL_CONTINUATION_MODE_PREPARE`

The continuation-specific assembler method and continuation-mode metadata are
also removed. Consumers should use the canonical handler/schema/segment and
custom processor contracts above, and should model optional additional user
input as a message-or-null fact rather than selecting a continuation mode.

No deprecated forwarding modules, dual runtime paths, or fallbacks are supplied.
Unknown external consumers of removed package subpaths must update imports.

## Compatibility and Persisted Data

- Existing raw traces, working-context snapshots, tool call/result payloads,
  compaction lineage, and run history are directly usable.
- New runs stop writing the coordination-only `tool_continuation` raw trace.
- Historical generic `tool_continuation` records remain readable and may remain
  visible in old history; they are inert.
- No migration, rebuild, maintenance window, dual reader, or stored-data rewrite
  is required.

## Preserved Behavior

Provider-native histories, context/media continuation, custom processors,
no-tool streaming, compaction and protocol recovery, approval/external results,
interruption/failure fences, and final assistant output remain supported.

## Validation

- Source review: `CRR-004` Pass, reviewed implementation
  `0891e42f0ebdd2db5f0d1b2bd746abdb1e115668`, score 9.7/10.
- API/E2E: `API-REV-004` Pass at 98.2% confidence. Supplemental evidence proved
  exact configured 5% thresholds: LM Studio `13043` from effective input budget
  `260864`, and DeepSeek `49936` from effective input budget `998720` (clean run
  crossed at `56152`). Both real paths completed compaction and continued with
  correct tool/memory/history behavior.
- Supplemental proportional review: `CRR-006` Not Applicable because round 4
  changed no repository-resident source, test, fixture, or harness. Durable
  coverage review `CRR-005` remains the authoritative Pass; focused root
  contract 35/35, production package build Pass, and all five compiled root
  identities exact.
- One first-attempt DeepSeek compactor response was invalid JSON and remains
  recorded as a failed execution. Deterministic failure fencing, an unchanged
  clean DeepSeek rerun, and independent LM Studio execution passed; stochastic
  provider-model output remains a disclosed non-blocking risk.
- Delivery refresh: 41 newer `origin/personal` commits were merged through
  `d0bcd0dab2263fa284cf07de8d98214e5d19af73`; the integrated macOS ARM64
  Electron `1.4.47` package build and packaged-source checks pass.

These notes document the change only. No package version, tag, publication, or
deployment has been created during the pre-verification delivery stage.
