import type { AgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import { TaskTeamRunIdentityFactory } from "./task-team-run-identity-factory.js";

export type TaskExecutionIdentityCapabilities = Readonly<{
  agentRuns: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;
  taskTeams: Pick<TaskTeamRunIdentityFactory, "create">;
}>;

export const createTaskExecutionIdentityCapabilities = (
  agentRuns: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">,
): TaskExecutionIdentityCapabilities => {
  if (!agentRuns || typeof agentRuns.allocateForAgentDefinition !== "function") {
    throw new Error("Task Agent-run identity allocator is required.");
  }
  return Object.freeze({
    agentRuns,
    taskTeams: new TaskTeamRunIdentityFactory(agentRuns),
  });
};
