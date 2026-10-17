import type { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import type { AgentRunMemoryLocator } from "../../agent-collaboration/execution/services/agent-run-memory-locator.js";
import type { AgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import type { WorkspaceManager } from "../../workspaces/workspace-manager.js";
import type { FlatTeamExecutionCallbacks } from "./flat-team-execution-callbacks.js";
import type { TaskTeamExecutionFactory } from "./task-team-execution-factory.js";

/** Composition dependencies for one concrete TeamRun's local runtime manager. */
export type FlatTeamExecutionManagerOptions = {
  subTeamRunFactory: TaskTeamExecutionFactory;
  agentRunManager?: AgentRunManager;
  memoryLocator?: AgentRunMemoryLocator;
  activityInspector?: AgentConversationActivityInspector;
  workspaceManager?: Pick<WorkspaceManager, "ensureWorkspaceByRootPath">;
  callbacks: FlatTeamExecutionCallbacks;
};
