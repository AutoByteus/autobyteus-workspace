import type { AgentConversationActivity, AgentConversationActivityInspector } from "../../../agent-memory/services/agent-conversation-activity-inspector.js";
import { AgentMemoryLayout } from "../../../agent-memory/store/agent-memory-layout.js";
import { createServerLogger } from "../../../logging/server-app-logger.js";
import type { TeamRunExecutionTreeLocationService } from "../../../run-history/services/team-run-execution-tree-location-service.js";
import type { RunAgentAccess } from "../remote/run-agent-access.js";
import { TaskDelegationError } from "./task-delegation-command.js";
import type { TaskExecutionReference } from "./task-execution-reference.js";

const logger = createServerLogger("agent-collaboration.task-execution");

/** Whether a delegated run can continue: its entry agent (an agent run itself; a team run's coordinator) and its saved conversation. */
export type RunConversationAvailability = Readonly<{ entryAddress: string; activity: AgentConversationActivity }>;

/**
 * Whether a delegated run can take a follow-up Task (autobyteus-461 CR-461-043, as base checked a shut-down copy before
 * assigning it): a run whose entry agent is live can; otherwise its entry agent's saved conversation is inspected,
 * read-only. Built by the composition root.
 */
export const createRunConversationAvailability = (input: Readonly<{
  memoryDir: string;
  inspector: Pick<AgentConversationActivityInspector, "inspect">;
  liveAgents(kind: "agent" | "agent_team"): Pick<RunAgentAccess, "runAgentStatuses">;
  teamMembers: Pick<TeamRunExecutionTreeLocationService, "findAgent">;
}>) => {
  const layout = new AgentMemoryLayout(input.memoryDir);
  return async (execution: TaskExecutionReference, entry: Readonly<{ agentRunId: string; address: string }>): Promise<RunConversationAvailability> => {
    const [kind, runId] = "agentRunId" in execution ? ["agent", execution.agentRunId] as const : ["agent_team", execution.teamRunId] as const;
    if (input.liveAgents(kind).runAgentStatuses(runId).some((agent) => agent.agentRunId === entry.agentRunId)) {
      return { entryAddress: entry.address, activity: { kind: "present" } };
    }
    if (kind === "agent") {
      return { entryAddress: entry.address, activity: input.inspector.inspect({ agentRunId: entry.agentRunId, memoryDir: layout.getStandaloneRunDirPath(entry.agentRunId) }) };
    }
    const member = await input.teamMembers.findAgent({ rootTeamRunId: runId, agentRunId: entry.agentRunId });
    if (!member) return { entryAddress: entry.address, activity: { kind: "indeterminate", error: new Error("its coordinator is not in its team's saved tree") } };
    return { entryAddress: member.memberAddress, activity: input.inspector.inspect({ agentRunId: entry.agentRunId, memoryDir: member.memoryDir }) };
  };
};

/**
 * Base's refusal for a delegated run that cannot be restored (`task-execution-conversation-availability.ts` at
 * `827f1e68dc`): names the run, the problem in plain words and what to do, never a file path; logs a warning.
 */
export const taskExecutionConversationUnavailable = (input: Readonly<{
  execution: TaskExecutionReference;
  address: string;
  entryAddress: string;
  activity: Exclude<AgentConversationActivity, Readonly<{ kind: "present" }>>;
}>): TaskDelegationError => {
  const agent = "agentRunId" in input.execution;
  const subject = `The delegated ${agent ? "Agent" : "Team"} at '${input.address}' cannot be restored`;
  const owner = agent ? "it" : `its coordinator '${input.entryAddress}'`;
  const ownerConversation = agent ? "its saved conversation" : `the saved conversation of its coordinator '${input.entryAddress}'`;
  const message = input.activity.kind === "none"
    ? `${subject}: ${owner} has no saved conversation to continue. Start a new delegation for this work.`
    : `${subject}: ${ownerConversation} cannot be read (${input.activity.error.message}). Its files were left unchanged. `
      + "Start a new delegation for this work, or restore its saved conversation from a backup.";
  logger.warn("TASK_EXECUTION_CONVERSATION_UNAVAILABLE", { execution: input.execution, address: input.address, entryAddress: input.entryAddress,
    activity: input.activity.kind, reason: input.activity.kind === "indeterminate" ? input.activity.error.message : null });
  return new TaskDelegationError("TASK_EXECUTION_CONTEXT_UNAVAILABLE", message, input.activity.kind === "indeterminate" ? { cause: input.activity.error } : undefined);
};
