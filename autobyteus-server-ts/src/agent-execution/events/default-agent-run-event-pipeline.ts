import { AgentRunEventPipeline } from "./agent-run-event-pipeline.js";
import { FileChangeEventProcessor } from "./processors/file-change/file-change-event-processor.js";
import { LifecycleStatusEventProcessor } from "./processors/lifecycle-status/lifecycle-status-event-processor.js";
import { TeamCommunicationMessageProcessor } from "./processors/team-communication/team-communication-message-event-processor.js";
import { TokenUsageEventEnrichmentTransformer } from "./processors/token-usage/token-usage-event-enrichment-transformer.js";
import { TokenUsageEventPersistenceProcessor } from "./processors/token-usage/token-usage-event-persistence-processor.js";

let cachedDefaultAgentRunEventPipeline: AgentRunEventPipeline | null = null;
let cachedTokenUsagePersistenceProcessor: TokenUsageEventPersistenceProcessor | null = null;

export const getDefaultAgentRunEventPipeline = (): AgentRunEventPipeline => {
  if (!cachedDefaultAgentRunEventPipeline) {
    cachedTokenUsagePersistenceProcessor = new TokenUsageEventPersistenceProcessor();
    cachedDefaultAgentRunEventPipeline = new AgentRunEventPipeline([
      new LifecycleStatusEventProcessor(),
      new FileChangeEventProcessor(),
      new TeamCommunicationMessageProcessor(),
      cachedTokenUsagePersistenceProcessor,
    ], [
      new TokenUsageEventEnrichmentTransformer(),
    ]);
  }
  return cachedDefaultAgentRunEventPipeline;
};

export const stopDefaultAgentRunEventPipeline = async (): Promise<void> => {
  const processor = cachedTokenUsagePersistenceProcessor;
  if (!processor) {
    cachedDefaultAgentRunEventPipeline = null;
    return;
  }

  await processor.close();
  if (cachedTokenUsagePersistenceProcessor === processor) {
    cachedTokenUsagePersistenceProcessor = null;
    cachedDefaultAgentRunEventPipeline = null;
  }
};
