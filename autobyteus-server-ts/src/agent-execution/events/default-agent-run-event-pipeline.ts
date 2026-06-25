import { AgentRunEventPipeline } from "./agent-run-event-pipeline.js";
import { FileChangeEventProcessor } from "./processors/file-change/file-change-event-processor.js";
import { LifecycleStatusEventProcessor } from "./processors/lifecycle-status/lifecycle-status-event-processor.js";
import { TeamCommunicationMessageProcessor } from "./processors/team-communication/team-communication-message-event-processor.js";
import { TokenUsageEventEnrichmentTransformer } from "./processors/token-usage/token-usage-event-enrichment-transformer.js";
import { TokenUsageEventPersistenceProcessor } from "./processors/token-usage/token-usage-event-persistence-processor.js";

let cachedDefaultAgentRunEventPipeline: AgentRunEventPipeline | null = null;

export const getDefaultAgentRunEventPipeline = (): AgentRunEventPipeline => {
  if (!cachedDefaultAgentRunEventPipeline) {
    cachedDefaultAgentRunEventPipeline = new AgentRunEventPipeline([
      new LifecycleStatusEventProcessor(),
      new FileChangeEventProcessor(),
      new TeamCommunicationMessageProcessor(),
      new TokenUsageEventPersistenceProcessor(),
    ], [
      new TokenUsageEventEnrichmentTransformer(),
    ]);
  }
  return cachedDefaultAgentRunEventPipeline;
};
