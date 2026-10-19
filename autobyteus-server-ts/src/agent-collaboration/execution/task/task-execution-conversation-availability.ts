import type { AgentConversationActivity } from "../../../agent-memory/services/agent-conversation-activity-inspector.js";
import { createServerLogger } from "../../../logging/server-app-logger.js";
import type { RootExecutionIdentity } from "../domain/root-execution-identity.js";
import { TaskDelegationError } from "./task-delegation-command.js";

const logger = createServerLogger("agent-collaboration.task-execution");

export type UnrestorableConversationActivity = Exclude<AgentConversationActivity, Readonly<{ kind: "present" }>>;

/**
 * The refusal for a shut-down delegated Agent/Team whose ingress member has no readable saved conversation:
 * names the Agent/Team, the member, the problem in plain words and what the user can do, and logs a warning.
 */
export const taskExecutionConversationUnavailable = (input: {
  root: RootExecutionIdentity;
  executionKind: "agent" | "team";
  address: string;
  ingressMember: Readonly<{ address: string; agentRunId: string }>;
  activity: UnrestorableConversationActivity;
}): TaskDelegationError => {
  const subject = `The delegated ${input.executionKind === "agent" ? "Agent" : "Team"} at '${input.address}' cannot be restored`;
  const owner = input.executionKind === "agent" ? "it" : `its coordinator '${input.ingressMember.address}'`;
  const ownerConversation = input.executionKind === "agent"
    ? "its saved conversation"
    : `the saved conversation of its coordinator '${input.ingressMember.address}'`;
  const message = input.activity.kind === "none"
    ? `${subject}: ${owner} has no saved conversation to continue. Start a new delegation for this work.`
    : `${subject}: ${ownerConversation} cannot be read (${input.activity.error.message}). Its files were left unchanged. `
      + "Start a new delegation for this work, or restore its saved conversation from a backup.";
  logger.warn("TASK_EXECUTION_CONVERSATION_UNAVAILABLE", {
    rootSubjectKind: input.root.rootSubjectKind,
    rootRunId: input.root.rootRunId,
    address: input.address,
    memberAddress: input.ingressMember.address,
    memberAgentRunId: input.ingressMember.agentRunId,
    activity: input.activity.kind,
    reason: input.activity.kind === "indeterminate" ? input.activity.error.message : null,
    cause: input.activity.kind === "indeterminate" ? input.activity.error.cause ?? null : null,
  });
  return new TaskDelegationError(
    "TASK_EXECUTION_CONTEXT_UNAVAILABLE",
    message,
    input.activity.kind === "indeterminate" ? { cause: input.activity.error } : undefined,
  );
};
