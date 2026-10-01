import path from "node:path";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";

export const AGENT_RUN_COLLABORATION_TREE_FILE_NAME = "collaboration_tree.json";
export const AGENT_RUN_COLLABORATION_MESSAGES_FILE_NAME = "communication_messages.json";

/** `memory/agents/<hostRunId>/collaboration`. */
export const getAgentRunCollaborationDirPath = (memoryDir: string, hostRunId: string): string =>
  new AgentMemoryLayout(memoryDir).getAgentRunCollaborationDirPath(hostRunId);

export const getAgentRunCollaborationTreePath = (collaborationDir: string): string =>
  path.join(path.resolve(collaborationDir), AGENT_RUN_COLLABORATION_TREE_FILE_NAME);

export const getAgentRunCollaborationMessagesPath = (collaborationDir: string): string =>
  path.join(path.resolve(collaborationDir), AGENT_RUN_COLLABORATION_MESSAGES_FILE_NAME);
