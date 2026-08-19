import fs from "node:fs/promises";
import path from "node:path";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type { TeamMemberExecutionIdentity } from "../domain/team-member-execution-identity.js";
import { TaskDelegationError } from "./task-delegation-record.js";

export const requireTaskString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new TaskDelegationError("VALIDATION_ERROR", `${field} is required.`);
  return normalized;
};

export const optionalTaskString = (value: string | null | undefined): string | null =>
  value?.trim() || null;

export const validateTaskReferenceFiles = async (
  values: readonly string[],
): Promise<readonly string[]> => {
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!path.isAbsolute(normalized) || path.normalize(normalized) !== normalized) {
      throw new TaskDelegationError(
        "INVALID_REFERENCE_FILE",
        `Reference file '${value}' must be a normalized absolute path.`,
      );
    }
    const stat = await fs.stat(normalized);
    if (!stat.isFile()) {
      throw new TaskDelegationError("INVALID_REFERENCE_FILE", `Reference '${normalized}' is not a file.`);
    }
    result.push(normalized);
  }
  return Object.freeze(result);
};

export const buildTaskAssigneeWorkPacket = (input: {
  delegator: TeamMemberExecutionIdentity;
  description: string;
  referenceFiles: readonly string[];
}): AgentInputUserMessage => new AgentInputUserMessage([
  `Task delegator address: ${input.delegator.memberAddress}`,
  `Task delegator AgentRun ID: ${input.delegator.agentRunId}`,
  "",
  "Description:",
  input.description,
  ...(input.referenceFiles.length
    ? ["", "Reference files:", ...input.referenceFiles.map((file) => `- ${file}`)]
    : []),
].join("\n"), SenderType.SYSTEM);
