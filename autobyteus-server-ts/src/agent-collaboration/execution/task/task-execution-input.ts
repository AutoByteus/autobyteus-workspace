import { markTaskDelegationSystemTaskNotificationMetadata } from "../events/task-system-input-presentation.js";
import fs from "node:fs/promises";
import path from "node:path";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type { CollaborationMemberExecutionIdentity } from "../domain/root-execution-identity.js";
import { getAgentTeamAddressBasename } from "../../domain/agent-team-address.js";
import type { ExactAgentMessageInput } from "../services/active-collaboration-root-directory.js";
import { TaskDelegationError } from "./task-delegation-command.js";

export const requireTaskString = (value: unknown, field: string): string => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new TaskDelegationError("VALIDATION_ERROR", `${field} is required.`);
  return normalized;
};

export const validateTaskReferenceFiles = async (values: readonly string[]): Promise<readonly string[]> => {
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!path.isAbsolute(normalized) || path.normalize(normalized) !== normalized) {
      throw new TaskDelegationError("INVALID_REFERENCE_FILE", `Reference file '${value}' must be a normalized absolute path.`);
    }
    const stat = await fs.stat(normalized);
    if (!stat.isFile()) throw new TaskDelegationError("INVALID_REFERENCE_FILE", `Reference '${normalized}' is not a file.`);
    result.push(normalized);
  }
  return Object.freeze(result);
};

/** The delegated work: who delegated it (address and run ID), the description and any reference files. */
export const buildTaskWorkText = (input: {
  delegator: CollaborationMemberExecutionIdentity;
  description: string;
  referenceFiles: readonly string[];
}): string => [
  `Task delegator address: ${input.delegator.memberAddress}`,
  `Task delegator AgentRun ID: ${input.delegator.agentRunId}`,
  "", "Description:", input.description,
  ...(input.referenceFiles.length ? ["", "Reference files:", ...input.referenceFiles.map((file) => `- ${file}`)] : []),
].join("\n");

/** The child's first message: the delegated work as a system Task notification. */
export const buildTaskAssigneeWorkPacket = (input: Parameters<typeof buildTaskWorkText>[0]): AgentInputUserMessage =>
  new AgentInputUserMessage(buildTaskWorkText(input), SenderType.SYSTEM, null, markTaskDelegationSystemTaskNotificationMetadata({}));

/**
 * An existing copy's new Task, delivered as a message from the delegator into its conversation. The
 * reference files travel as the message's reference files (listed by the delivery, not repeated here).
 */
export const buildExistingCopyTaskMessage = (input: {
  taskId: string;
  delegator: CollaborationMemberExecutionIdentity;
  description: string;
}): string => [
  `New Task assigned to you: ${input.taskId}. Your previous Task is closed; this is the work to do now.`,
  "",
  buildTaskWorkText({ delegator: input.delegator, description: input.description, referenceFiles: [] }),
].join("\n");

export const TASK_ASSIGNMENT_MESSAGE_TYPE = "task_assignment";
/** The exact message input (the shape every root's exact delivery takes) that carries a new Task from its delegator. */
export const buildTaskWorkMessageInput = (delegator: CollaborationMemberExecutionIdentity, targetAgentRunId: string,
  content: string, referenceFiles: readonly string[]): ExactAgentMessageInput => ({
  sender: { kind: "agent", identity: delegator, displayName: getAgentTeamAddressBasename(delegator.memberAddress) ?? delegator.agentRunId },
  targetAgentRunId, content, messageType: TASK_ASSIGNMENT_MESSAGE_TYPE, referenceFiles,
});
