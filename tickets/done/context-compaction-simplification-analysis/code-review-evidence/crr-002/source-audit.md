# CRR-002 cumulative source size / structure audit

IR-001 production scope recounted at IR-002; the newly changed current core stream payload is included. Test support/tests/generated output remain exempt. All listed files preserve their established ownership and placement. CR-001/002 closure is recorded in the canonical report, not inferred from these counts.

| Source file | Nonempty | Added / deleted | >500 | >220 delta | SoC / placement | Preliminary classification | Required action |
| --- | ---: | ---: | --- | --- | --- | --- | --- |
| `autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts` | 122 | +4/−4 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-server-ts/src/agent-collaboration/execution/events/agent-presentation-event.ts` | 122 | +3/−3 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-server-ts/src/agent-collaboration/execution/events/agent-presentation-message-projector.ts` | 96 | +4/−4 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-server-ts/src/agent-collaboration/execution/events/collaboration-agent-presentation-adapter.ts` | 369 | +2/−2 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | 450 | +9/−60 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-runtime-tool-exposure.ts` | 29 | +1/−4 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-server-ts/src/agent-execution/compaction/compaction-llm-factory.ts` | 39 | +42/−0 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-server-ts/src/agent-execution/providers/agent-provider-factory-builder.ts` | 202 | +5/−5 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-agent-event.ts` | 111 | +3/−3 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-server-ts/src/api/graphql/schema.ts` | 79 | +0/−2 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-server-ts/src/application-platform/runtime/build-application-platform-runtime.ts` | 304 | +2/−0 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts` | 23 | +0/−6 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-server-ts/src/compositions/create-process-agent-provider-factory-builder.ts` | 61 | +2/−4 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-server-ts/src/config/compaction-model-settings.ts` | 28 | +31/−0 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-server-ts/src/services/agent-streaming/team-agent-event-websocket-projector.ts` | 119 | +3/−3 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | 371 | +8/−14 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-server-ts/src/startup/compaction-model-settings-migration.ts` | 31 | +33/−0 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/agent/compaction/compaction-runtime-reporter.ts` | 79 | +7/−93 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/agent/context/agent-config.ts` | 116 | +1/−7 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/agent/factory/agent-factory.ts` | 209 | +0/−9 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/agent/llm-request-assembler.ts` | 121 | +4/−0 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/agent/loop/llm-phase-compaction.ts` | 98 | +0/−1 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | 373 | +4/−59 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/agent/streaming/events/stream-event-payload-lifecycle.ts` | 252 | +12/−12 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/clients/autobyteus-client.ts` | 492 | +2/−2 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/llm/api/anthropic-llm.ts` | 306 | +2/−0 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/llm/api/autobyteus-llm.ts` | 141 | +3/−2 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/llm/api/completion-status.ts` | 17 | +19/−0 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/llm/api/gemini-llm.ts` | 263 | +2/−0 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/llm/api/mistral-llm.ts` | 128 | +2/−0 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/llm/api/ollama-llm.ts` | 178 | +5/−0 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/llm/api/openai-compatible-llm.ts` | 177 | +2/−0 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/llm/api/openai-responses-llm.ts` | 368 | +2/−0 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/llm/base.ts` | 173 | +1/−1 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/llm/llm-factory.ts` | 322 | +3/−1 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/llm/utils/response-types.ts` | 70 | +6/−0 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/compaction/accepted-compaction-builder.ts` | 31 | +18/−115 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/compaction/accepted-compaction-committer.ts` | 32 | +26/−34 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/compaction/compaction-conversation-history-renderer.ts` | 104 | +3/−3 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/compaction/compaction-execution.ts` | 17 | +19/−0 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/compaction/compaction-runtime-settings.ts` | 52 | +0/−7 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/compaction/compaction-summary-parser.ts` | 34 | +36/−0 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/compaction/compaction-summary-prompt.ts` | 2 | +2/−0 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/compaction/direct-llm-compaction-summarizer.ts` | 69 | +72/−0 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/compaction/memory-compaction-configuration.ts` | 44 | +7/−7 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/compaction/pending-compaction-executor.ts` | 87 | +64/−104 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-output-validator.ts` | 249 | +34/−9 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-prompt-builder.ts` | 59 | +1/−14 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-proposal.ts` | 29 | +3/−11 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/index.ts` | 71 | +2/−22 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/memory-manager-compaction-coordinator.ts` | 318 | +25/−95 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/memory-manager-working-context-controller.ts` | 76 | +5/−0 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/memory-manager.ts` | 489 | +2/−12 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/restore/working-context-snapshot-bootstrapper.ts` | 60 | +2/−29 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/store/base-store.ts` | 23 | +6/−17 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/store/file-store.ts` | 72 | +5/−16 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | 386 | +27/−62 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/working-context-provenance.ts` | 175 | +11/−0 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-web/components/progress/CompactionActivityItem.vue` | 103 | +5/−0 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-web/components/settings/CompactionConfigCard.vue` | 231 | +24/−83 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-web/components/settings/CompactionModelSettings.vue` | 50 | +50/−0 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-web/graphql/queries/server_settings_queries.ts` | 27 | +0/−1 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-web/localization/messages/en/settings.ts` | 398 | +12/−9 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-web/localization/messages/zh-CN/settings.ts` | 398 | +12/−9 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-web/services/agentStreaming/handlers/compactionActivityProjection.ts` | 255 | +13/−13 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-web/services/agentStreaming/protocol/compactionTypes.ts` | 32 | +6/−6 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-web/services/agentStreaming/teamStreamDtoAdapters.ts` | 143 | +1/−1 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-web/stores/serverSettings.ts` | 393 | +0/−15 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-web/types/activity/RunActivity.ts` | 61 | +7/−0 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-web/types/agent/AgentRunState.ts` | 77 | +7/−0 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-web/utils/compactionModelSettings.ts` | 12 | +12/−0 | Pass | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/compaction-lineage-scope-resolver.ts` | 0 | +0/−23 | N/A — removed | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-server-ts/src/agent-execution/compaction/compaction-run-output-collector.ts` | 0 | +0/−257 | N/A — removed | Yes — justified obsolete removal | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-server-ts/src/agent-execution/compaction/memory-compactor-agent-launch-resolver.ts` | 0 | +0/−116 | N/A — removed | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-server-ts/src/agent-execution/compaction/server-compaction-agent-runner.ts` | 0 | +0/−206 | N/A — removed | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-server-ts/src/api/graphql/types/working-context-compaction-strategy.ts` | 0 | +0/−27 | N/A — removed | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent-config.json` | 0 | +0/−11 | N/A — removed | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md` | 0 | +0/−37 | N/A — removed | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-server-ts/src/config/working-context-compaction-strategy-setting.ts` | 0 | +0/−21 | N/A — removed | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/compaction/agent-compaction-summarizer.ts` | 0 | +0/−181 | N/A — removed | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/compaction/compaction-agent-runner.ts` | 0 | +0/−61 | N/A — removed | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/compaction/compaction-response-parser.ts` | 0 | +0/−271 | N/A — removed | Yes — justified obsolete removal | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/compaction/compaction-result-normalizer.ts` | 0 | +0/−123 | N/A — removed | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/compaction/compaction-result.ts` | 0 | +0/−34 | N/A — removed | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/compaction/default-working-context-compaction-strategy-registry.ts` | 0 | +0/−28 | N/A — removed | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/compaction/structured-json-compaction-strategy.ts` | 0 | +0/−77 | N/A — removed | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-strategy-registry.ts` | 0 | +0/−52 | N/A — removed | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-strategy-resolver.ts` | 0 | +0/−33 | N/A — removed | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-strategy-setting.ts` | 0 | +0/−9 | N/A — removed | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-strategy.ts` | 0 | +0/−50 | N/A — removed | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/lineage/compaction-lineage-record.ts` | 0 | +0/−120 | N/A — removed | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/lineage/compaction-lineage-scope.ts` | 0 | +0/−38 | N/A — removed | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/lineage/compaction-lineage-store.ts` | 0 | +0/−10 | N/A — removed | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/projection/compacted-memory-context-projector.ts` | 0 | +0/−45 | N/A — removed | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/projection/compacted-memory-message-builder.ts` | 0 | +0/−58 | N/A — removed | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/projection/compacted-memory-projection-bundle.ts` | 0 | +0/−23 | N/A — removed | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/projection/current-compaction-output-loader.ts` | 0 | +0/−41 | N/A — removed | No | Pass — owner retained or approved removal | No source-structure finding | None |
| `autobyteus-ts/src/memory/store/file-compaction-lineage-store.ts` | 0 | +0/−85 | N/A — removed | No | Pass — owner retained or approved removal | No source-structure finding | None |
