import { AgentRunEventPipeline } from "./agent-run-event-pipeline.js";
import { FileChangeEventProcessor } from "./processors/file-change/file-change-event-processor.js";

let cachedDefaultAgentRunEventPipeline: AgentRunEventPipeline | null = null;

export const getDefaultAgentRunEventPipeline = (): AgentRunEventPipeline => {
  if (!cachedDefaultAgentRunEventPipeline) {
    cachedDefaultAgentRunEventPipeline = new AgentRunEventPipeline([
      new FileChangeEventProcessor(),
    ]);
  }
  return cachedDefaultAgentRunEventPipeline;
};
