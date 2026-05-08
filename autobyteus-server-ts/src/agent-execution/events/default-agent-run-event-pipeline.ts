import { AgentRunEventPipeline } from "./agent-run-event-pipeline.js";
import { FileChangeEventProcessor } from "./processors/file-change/file-change-event-processor.js";
import { TeamCommunicationMessageProcessor } from "./processors/team-communication/team-communication-message-event-processor.js";

let cachedDefaultAgentRunEventPipeline: AgentRunEventPipeline | null = null;

export const getDefaultAgentRunEventPipeline = (): AgentRunEventPipeline => {
  if (!cachedDefaultAgentRunEventPipeline) {
    cachedDefaultAgentRunEventPipeline = new AgentRunEventPipeline([
      new FileChangeEventProcessor(),
      new TeamCommunicationMessageProcessor(),
    ]);
  }
  return cachedDefaultAgentRunEventPipeline;
};
