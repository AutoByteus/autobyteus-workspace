# CRR-005 cumulative source structure/size inventory

Base: refreshed origin/personal `8caa610ff438c288d9aca9f2efe2c33924fbf517`; reviewed source `ebaf3a78eff2d3147dc3f4f2eb63bf119d6547ad`.

74 surviving handwritten production paths; 29 removals. Tests, fixtures and generated files excluded. IR-003: 10 surviving plus 1 removed production path, 23 total source/test/fixture paths. No remaining file >500 nonempty; no surviving delta >220. The two >220 removals retire the old collector/parser, not reasons to split deleted code.

Prior owner/placement review retained where unchanged. Rebase changed 16 of the 71 prior surviving paths; relevant constructor, builtin, settings and event seams rechecked; unrelated upstream functionality is not independently reapproved. `rebase-affected-prior-source.patch` records that comparison. New frozen wire-shape file belongs only to migration; current serializer remains current-only. No new defect or structural split required.

| Source | Nonempty | Added/deleted | >500 | >220 | SoC / placement / disposition |
|---|---:|---:|---|---|---|
| `autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts` | 127 | 4/4 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-server-ts/src/agent-collaboration/execution/events/agent-presentation-event.ts` | 123 | 3/3 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-server-ts/src/agent-collaboration/execution/events/agent-presentation-message-projector.ts` | 96 | 4/4 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-server-ts/src/agent-collaboration/execution/events/collaboration-agent-presentation-adapter.ts` | 361 | 2/2 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | 444 | 9/60 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-runtime-tool-exposure.ts` | 29 | 1/4 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/compaction-lineage-scope-resolver.ts` | 0 | 0/23 | Pass | Pass | Removed approved obsolete owner; no action |
| `autobyteus-server-ts/src/agent-execution/compaction/compaction-llm-factory.ts` | 39 | 42/0 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-server-ts/src/agent-execution/compaction/compaction-run-output-collector.ts` | 0 | 0/257 | Pass | Reviewed removal | Removed approved obsolete owner; no action |
| `autobyteus-server-ts/src/agent-execution/compaction/memory-compactor-agent-launch-resolver.ts` | 0 | 0/113 | Pass | Pass | Removed approved obsolete owner; no action |
| `autobyteus-server-ts/src/agent-execution/compaction/server-compaction-agent-runner.ts` | 0 | 0/204 | Pass | Pass | Removed approved obsolete owner; no action |
| `autobyteus-server-ts/src/agent-execution/providers/agent-provider-factory-builder.ts` | 210 | 5/5 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-agent-event.ts` | 112 | 3/3 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-server-ts/src/api/graphql/schema.ts` | 83 | 0/2 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-server-ts/src/api/graphql/types/working-context-compaction-strategy.ts` | 0 | 0/27 | Pass | Pass | Removed approved obsolete owner; no action |
| `autobyteus-server-ts/src/app-data-migrations/migrations/migrate-native-working-context-snapshots-v5-migration.ts` | 259 | 19/4 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts` | 33 | 0/6 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent-config.json` | 0 | 0/11 | Pass | Pass | Removed approved obsolete owner; no action |
| `autobyteus-server-ts/src/compositions/create-process-agent-provider-factory-builder.ts` | 61 | 2/4 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-server-ts/src/config/compaction-model-settings.ts` | 27 | 30/0 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-server-ts/src/config/working-context-compaction-strategy-setting.ts` | 0 | 0/21 | Pass | Pass | Removed approved obsolete owner; no action |
| `autobyteus-server-ts/src/services/agent-streaming/team-agent-event-websocket-projector.ts` | 119 | 3/3 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | 372 | 8/14 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/agent/compaction/compaction-runtime-reporter.ts` | 79 | 7/93 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/agent/context/agent-config.ts` | 110 | 1/7 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/agent/factory/agent-factory.ts` | 209 | 0/9 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/agent/llm-request-assembler.ts` | 121 | 4/0 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/agent/loop/llm-phase-compaction.ts` | 98 | 0/1 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | 373 | 4/59 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/agent/streaming/events/stream-event-payload-lifecycle.ts` | 252 | 12/12 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/clients/autobyteus-client.ts` | 492 | 2/2 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/llm/api/anthropic-llm.ts` | 306 | 2/0 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/llm/api/autobyteus-llm.ts` | 141 | 3/2 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/llm/api/completion-status.ts` | 17 | 19/0 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/llm/api/gemini-llm.ts` | 263 | 2/0 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/llm/api/mistral-llm.ts` | 128 | 2/0 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/llm/api/ollama-llm.ts` | 178 | 5/0 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/llm/api/openai-compatible-llm.ts` | 177 | 2/0 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/llm/api/openai-responses-llm.ts` | 368 | 2/0 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/llm/base.ts` | 173 | 1/1 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/llm/llm-factory.ts` | 322 | 3/1 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/llm/utils/response-types.ts` | 70 | 6/0 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/memory/compaction/accepted-compaction-builder.ts` | 31 | 18/115 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/memory/compaction/accepted-compaction-committer.ts` | 32 | 26/34 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/memory/compaction/agent-compaction-summarizer.ts` | 0 | 0/181 | Pass | Pass | Removed approved obsolete owner; no action |
| `autobyteus-ts/src/memory/compaction/compaction-agent-runner.ts` | 0 | 0/61 | Pass | Pass | Removed approved obsolete owner; no action |
| `autobyteus-ts/src/memory/compaction/compaction-conversation-history-renderer.ts` | 104 | 3/3 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/memory/compaction/compaction-execution.ts` | 17 | 19/0 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/memory/compaction/compaction-response-parser.ts` | 0 | 0/271 | Pass | Reviewed removal | Removed approved obsolete owner; no action |
| `autobyteus-ts/src/memory/compaction/compaction-result-normalizer.ts` | 0 | 0/123 | Pass | Pass | Removed approved obsolete owner; no action |
| `autobyteus-ts/src/memory/compaction/compaction-result.ts` | 0 | 0/34 | Pass | Pass | Removed approved obsolete owner; no action |
| `autobyteus-ts/src/memory/compaction/compaction-runtime-settings.ts` | 52 | 0/7 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/memory/compaction/compaction-summary-parser.ts` | 34 | 36/0 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/memory/compaction/compaction-summary-prompt.ts` | 2 | 2/0 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/memory/compaction/default-working-context-compaction-strategy-registry.ts` | 0 | 0/28 | Pass | Pass | Removed approved obsolete owner; no action |
| `autobyteus-ts/src/memory/compaction/direct-llm-compaction-summarizer.ts` | 69 | 72/0 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/memory/compaction/memory-compaction-configuration.ts` | 44 | 7/7 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/memory/compaction/pending-compaction-executor.ts` | 87 | 64/104 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/memory/compaction/structured-json-compaction-strategy.ts` | 0 | 0/77 | Pass | Pass | Removed approved obsolete owner; no action |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-output-validator.ts` | 253 | 40/10 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-prompt-builder.ts` | 59 | 1/14 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-proposal.ts` | 29 | 3/11 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-strategy-registry.ts` | 0 | 0/52 | Pass | Pass | Removed approved obsolete owner; no action |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-strategy-resolver.ts` | 0 | 0/33 | Pass | Pass | Removed approved obsolete owner; no action |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-strategy-setting.ts` | 0 | 0/9 | Pass | Pass | Removed approved obsolete owner; no action |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-strategy.ts` | 0 | 0/50 | Pass | Pass | Removed approved obsolete owner; no action |
| `autobyteus-ts/src/memory/index.ts` | 71 | 2/22 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/memory/lineage/compaction-lineage-record.ts` | 0 | 0/120 | Pass | Pass | Removed approved obsolete owner; no action |
| `autobyteus-ts/src/memory/lineage/compaction-lineage-scope.ts` | 0 | 0/38 | Pass | Pass | Removed approved obsolete owner; no action |
| `autobyteus-ts/src/memory/lineage/compaction-lineage-store.ts` | 0 | 0/10 | Pass | Pass | Removed approved obsolete owner; no action |
| `autobyteus-ts/src/memory/memory-manager-compaction-coordinator.ts` | 318 | 25/95 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/memory/memory-manager-working-context-controller.ts` | 75 | 5/1 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/memory/memory-manager.ts` | 489 | 2/12 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/memory/migration/native-working-context-snapshot-shapes.ts` | 190 | 197/0 | Pass | Pass | Pass — frozen migration wire contracts, no runtime codec dependency; no action |
| `autobyteus-ts/src/memory/migration/native-working-context-snapshot-v5-converter.ts` | 499 | 3/3 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/memory/projection/compacted-memory-context-projector.ts` | 0 | 0/45 | Pass | Pass | Removed approved obsolete owner; no action |
| `autobyteus-ts/src/memory/projection/compacted-memory-message-builder.ts` | 0 | 0/58 | Pass | Pass | Removed approved obsolete owner; no action |
| `autobyteus-ts/src/memory/projection/compacted-memory-projection-bundle.ts` | 0 | 0/23 | Pass | Pass | Removed approved obsolete owner; no action |
| `autobyteus-ts/src/memory/projection/current-compaction-output-loader.ts` | 0 | 0/41 | Pass | Pass | Removed approved obsolete owner; no action |
| `autobyteus-ts/src/memory/restore/working-context-snapshot-bootstrapper.ts` | 55 | 6/38 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/memory/store/base-store.ts` | 23 | 6/17 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/memory/store/file-compaction-lineage-store.ts` | 0 | 0/85 | Pass | Pass | Removed approved obsolete owner; no action |
| `autobyteus-ts/src/memory/store/file-store.ts` | 72 | 5/16 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | 386 | 27/62 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/memory/working-context-provenance.ts` | 175 | 11/0 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-ts/src/memory/working-context-snapshot-serializer.ts` | 133 | 54/90 | Pass | Pass | Pass — current state projection/writer; not historical conversion; no action |
| `autobyteus-ts/src/memory/working-context-tool-protocol-repairer.ts` | 193 | 1/1 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-web/components/progress/CompactionActivityItem.vue` | 103 | 5/0 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-web/components/settings/CompactionConfigCard.vue` | 231 | 24/83 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-web/components/settings/CompactionModelSettings.vue` | 50 | 50/0 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-web/graphql/queries/server_settings_queries.ts` | 27 | 0/1 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-web/graphql/queries/workingContextCompactionStrategyQueries.ts` | 0 | 0/10 | Pass | Pass | Removed approved obsolete owner; no action |
| `autobyteus-web/localization/messages/en/settings.ts` | 414 | 12/9 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-web/localization/messages/zh-CN/settings.ts` | 414 | 12/9 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-web/services/agentStreaming/handlers/compactionActivityProjection.ts` | 255 | 13/13 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-web/services/agentStreaming/protocol/compactionTypes.ts` | 32 | 6/6 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-web/services/agentStreaming/teamStreamDtoAdapters.ts` | 143 | 1/1 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-web/stores/serverSettings.ts` | 402 | 0/15 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-web/stores/workingContextCompactionStrategyCatalog.ts` | 0 | 0/149 | Pass | Pass | Removed approved obsolete owner; no action |
| `autobyteus-web/types/activity/RunActivity.ts` | 61 | 7/0 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-web/types/agent/AgentRunState.ts` | 77 | 7/0 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-web/utils/compactionModelSettings.ts` | 12 | 12/0 | Pass | Pass | Pass — existing concern/placement retained; no action |
| `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md => tickets/in-progress/context-compaction-simplification-analysis/upstream-prompts/autobyteus-original.md` | 0 | 8/0 | Pass | Pass | Removed approved obsolete owner; no action |
