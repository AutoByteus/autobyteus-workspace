import { AgentRunEventPipeline } from "./agent-run-event-pipeline.js";
import { FileChangeEventProcessor } from "./processors/file-change/file-change-event-processor.js";
import { LifecycleStatusEventTransformer } from "./processors/lifecycle-status/lifecycle-status-event-transformer.js";
import { AgentSegmentLifecycleEventTransformer } from "./processors/segment-lifecycle/agent-segment-lifecycle-event-transformer.js";
import { TeamCommunicationMessageProcessor } from "./processors/team-communication/team-communication-message-event-processor.js";
import { TokenUsageEventEnrichmentTransformer } from "./processors/token-usage/token-usage-event-enrichment-transformer.js";
import { TokenUsageEventPersistenceProcessor } from "./processors/token-usage/token-usage-event-persistence-processor.js";

let cachedDefaultAgentRunEventPipeline: AgentRunEventPipeline | null = null;
let cachedTokenUsageEnrichmentTransformer: TokenUsageEventEnrichmentTransformer | null = null;
let cachedTokenUsagePersistenceProcessor: TokenUsageEventPersistenceProcessor | null = null;
let tokenUsageLifecycleState: "accepting" | "quiescent" = "accepting";

export const getDefaultAgentRunEventPipeline = (): AgentRunEventPipeline => {
  if (!cachedDefaultAgentRunEventPipeline) {
    cachedTokenUsageEnrichmentTransformer = tokenUsageLifecycleState === "accepting"
      ? new TokenUsageEventEnrichmentTransformer()
      : null;
    cachedTokenUsagePersistenceProcessor = tokenUsageLifecycleState === "accepting"
      ? new TokenUsageEventPersistenceProcessor()
      : null;
    cachedDefaultAgentRunEventPipeline = new AgentRunEventPipeline([
      new FileChangeEventProcessor(),
      new TeamCommunicationMessageProcessor(),
      ...(cachedTokenUsagePersistenceProcessor
        ? [cachedTokenUsagePersistenceProcessor]
        : []),
    ], [
      new AgentSegmentLifecycleEventTransformer(),
      ...(cachedTokenUsageEnrichmentTransformer
        ? [cachedTokenUsageEnrichmentTransformer]
        : []),
    ], [
      new LifecycleStatusEventTransformer(),
    ]);
  }
  return cachedDefaultAgentRunEventPipeline;
};

export const stopDefaultAgentRunEventPipeline = async (): Promise<void> => {
  tokenUsageLifecycleState = "quiescent";
  cachedTokenUsageEnrichmentTransformer?.quiesce();
  const processor = cachedTokenUsagePersistenceProcessor;
  if (processor) {
    await processor.close();
  }
};

export const resetDefaultAgentRunEventPipelineForTests = async (): Promise<void> => {
  await stopDefaultAgentRunEventPipeline();
  cachedDefaultAgentRunEventPipeline = null;
  cachedTokenUsageEnrichmentTransformer = null;
  cachedTokenUsagePersistenceProcessor = null;
  tokenUsageLifecycleState = "accepting";
};
