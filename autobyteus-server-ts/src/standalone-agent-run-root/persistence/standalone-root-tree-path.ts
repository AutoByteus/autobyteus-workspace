import path from "node:path";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";

export const STANDALONE_ROOT_TREE_FILE_NAME = "collaboration_tree.json";
export const STANDALONE_ROOT_MESSAGES_FILE_NAME = "communication_messages.json";

/** `memory/agents/<hostRunId>/collaboration`. */
export const getStandaloneRootDirPath = (memoryDir: string, hostRunId: string): string =>
  new AgentMemoryLayout(memoryDir).getAgentRunCollaborationDirPath(hostRunId);

export const getStandaloneRootTreePath = (collaborationDir: string): string =>
  path.join(path.resolve(collaborationDir), STANDALONE_ROOT_TREE_FILE_NAME);

export const getStandaloneRootMessagesPath = (collaborationDir: string): string =>
  path.join(path.resolve(collaborationDir), STANDALONE_ROOT_MESSAGES_FILE_NAME);
