import { AgentRunEventPipeline } from "./agent-run-event-pipeline.js";
import { FileChangeEventProcessor } from "./processors/file-change/file-change-event-processor.js";
import { LifecycleStatusEventTransformer } from "./processors/lifecycle-status/lifecycle-status-event-transformer.js";
import { AgentSegmentLifecycleEventTransformer } from "./processors/segment-lifecycle/agent-segment-lifecycle-event-transformer.js";
import { TeamCommunicationMessageProcessor } from "./processors/team-communication/team-communication-message-event-processor.js";
import { TokenUsageEventEnrichmentTransformer } from "./processors/token-usage/token-usage-event-enrichment-transformer.js";
import { TokenUsageRunPersistenceTransformer } from "./processors/token-usage/token-usage-run-persistence-transformer.js";

let cachedDefaultAgentRunEventPipeline: AgentRunEventPipeline | null = null;
let cachedTokenUsageEnrichmentTransformer: TokenUsageEventEnrichmentTransformer | null = null;
let cachedTokenUsagePersistenceTransformer: TokenUsageRunPersistenceTransformer | null = null;
let tokenUsageLifecycleState: "accepting" | "quiescent" = "accepting";

export const getDefaultAgentRunEventPipeline = (): AgentRunEventPipeline => {
  if (!cachedDefaultAgentRunEventPipeline) {
    cachedTokenUsageEnrichmentTransformer = tokenUsageLifecycleState === "accepting"
      ? new TokenUsageEventEnrichmentTransformer()
      : null;
    cachedTokenUsagePersistenceTransformer = tokenUsageLifecycleState === "accepting"
      ? new TokenUsageRunPersistenceTransformer()
      : null;
    cachedDefaultAgentRunEventPipeline = new AgentRunEventPipeline([
      new FileChangeEventProcessor(),
      new TeamCommunicationMessageProcessor(),
    ], [
      new AgentSegmentLifecycleEventTransformer(),
      ...(cachedTokenUsageEnrichmentTransformer
        ? [cachedTokenUsageEnrichmentTransformer]
        : []),
      ...(cachedTokenUsagePersistenceTransformer
        ? [cachedTokenUsagePersistenceTransformer]
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
  cachedTokenUsagePersistenceTransformer?.quiesce();
};

export const resetDefaultAgentRunEventPipeline = async (): Promise<void> => {
  await stopDefaultAgentRunEventPipeline();
  cachedDefaultAgentRunEventPipeline = null;
  cachedTokenUsageEnrichmentTransformer = null;
  cachedTokenUsagePersistenceTransformer = null;
  tokenUsageLifecycleState = "accepting";
};

export const resetDefaultAgentRunEventPipelineForTests =
  resetDefaultAgentRunEventPipeline;
