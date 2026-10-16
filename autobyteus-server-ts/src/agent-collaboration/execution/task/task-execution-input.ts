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

/** The task itself: its description and any reference files. */
const taskBodyLines = (description: string, referenceFiles: readonly string[]): string[] => [
  "Description:", description,
  ...(referenceFiles.length ? ["", "Reference files:", ...referenceFiles.map((file) => `- ${file}`)] : []),
];

/**
 * The delegated work as the task agent's first message (wording §7.1, SR-015): who gave it, described only
 * by the handles send_message_to takes (its sender address when that address reaches it, design T-5, and
 * its sender run id; never a name), the reply instruction, the description and any reference files.
 */
export const buildTaskWorkText = (input: {
  delegator: CollaborationMemberExecutionIdentity;
  /** The delegator's address when it reaches the delegator run-wide (T-5); null otherwise. */
  delegatorAddress: string | null;
  description: string;
  referenceFiles: readonly string[];
}): string => {
  const runId = input.delegator.agentRunId;
  const [from, reply] = input.delegatorAddress
    ? [`You have a new task from the agent with sender address "${input.delegatorAddress}" and sender run id "${runId}".`,
      "When you finish, or need something you can't get yourself, tell that agent using send_message_to with recipient_address set to that sender address or target_agent_run_id set to that sender run id (one of them, not both)."]
    : [`You have a new task from the agent with sender run id "${runId}".`,
      "When you finish, or need something you can't get yourself, tell that agent using send_message_to with target_agent_run_id set to that sender run id."];
  return [from, reply, "", ...taskBodyLines(input.description, input.referenceFiles)].join("\n");
};

/** The child's first message: the delegated work as a system Task notification. */
export const buildTaskAssigneeWorkPacket = (input: Parameters<typeof buildTaskWorkText>[0]): AgentInputUserMessage =>
  new AgentInputUserMessage(buildTaskWorkText(input), SenderType.SYSTEM, null, markTaskDelegationSystemTaskNotificationMetadata({}));

/**
 * A saved Task given to an existing task agent, delivered as a message from the delegator (so its
 * header already names the sender and gives the ID). The reference files travel as the message's
 * reference files (listed by the delivery, not repeated here).
 */
export const buildExistingCopyTaskMessage = (input: {
  taskId: string;
  description: string;
}): string => [
  `New Task assigned to you: ${input.taskId}. Your previous Task is closed; this is the work to do now.`,
  "",
  ...taskBodyLines(input.description, []),
].join("\n");

export const TASK_ASSIGNMENT_MESSAGE_TYPE = "task_assignment";
/** The exact message input (the shape every root's exact delivery takes) that carries a new Task from its delegator. */
export const buildTaskWorkMessageInput = (delegator: CollaborationMemberExecutionIdentity, targetAgentRunId: string,
  content: string, referenceFiles: readonly string[]): ExactAgentMessageInput => ({
  sender: { kind: "agent", identity: delegator, displayName: getAgentTeamAddressBasename(delegator.memberAddress) ?? delegator.agentRunId },
  targetAgentRunId, content, messageType: TASK_ASSIGNMENT_MESSAGE_TYPE, referenceFiles,
});
