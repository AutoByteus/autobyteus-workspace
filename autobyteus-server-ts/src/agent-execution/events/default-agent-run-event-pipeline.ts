import { AgentRunEventPipeline } from "./agent-run-event-pipeline.js";
import { FileChangeEventProcessor } from "./processors/file-change/file-change-event-processor.js";
import { MessageFileReferenceProcessor } from "./processors/message-file-reference/message-file-reference-processor.js";

let cachedDefaultAgentRunEventPipeline: AgentRunEventPipeline | null = null;

export const getDefaultAgentRunEventPipeline = (): AgentRunEventPipeline => {
  if (!cachedDefaultAgentRunEventPipeline) {
    cachedDefaultAgentRunEventPipeline = new AgentRunEventPipeline([
      new FileChangeEventProcessor(),
      new MessageFileReferenceProcessor(),
    ]);
  }
  return cachedDefaultAgentRunEventPipeline;
};
