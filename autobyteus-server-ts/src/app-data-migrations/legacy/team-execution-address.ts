import {
  assertAgentTeamAddress,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";

export type TeamExecutionAddress = Readonly<{
  rootTeamRunId: string;
  taskTeamRunIds: readonly string[];
  memberAddress: AgentTeamAddress;
  taskAgentRunId: string | null;
}>;

const required = (value: string, fieldName: string): string => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new Error(`${fieldName} is required.`);
  return normalized;
};

export const createTeamExecutionAddress = (input: {
  rootTeamRunId: string;
  taskTeamRunIds?: readonly string[] | null;
  memberAddress: string;
  taskAgentRunId?: string | null;
}): TeamExecutionAddress => {
  const keys = Object.keys(input);
  const allowed = new Set(["rootTeamRunId", "taskTeamRunIds", "memberAddress", "taskAgentRunId"]);
  if (keys.some((key) => !allowed.has(key))) {
    throw new Error("TeamExecutionAddress contains an unsupported identity field.");
  }
  const taskTeamRunIds = Object.freeze((input.taskTeamRunIds ?? []).map((id, index) =>
    required(id, `taskTeamRunIds[${index}]`),
  ));
  const taskAgentRunId = input.taskAgentRunId == null
    ? null
    : required(input.taskAgentRunId, "taskAgentRunId");
  return Object.freeze({
    rootTeamRunId: required(input.rootTeamRunId, "rootTeamRunId"),
    taskTeamRunIds,
    memberAddress: assertAgentTeamAddress(input.memberAddress),
    taskAgentRunId,
  });
};

export const serializeTeamExecutionAddress = (address: TeamExecutionAddress): string =>
  JSON.stringify({
    rootTeamRunId: address.rootTeamRunId,
    taskTeamRunIds: [...address.taskTeamRunIds],
    memberAddress: address.memberAddress,
    taskAgentRunId: address.taskAgentRunId,
  });

export const cloneTeamExecutionAddress = (address: TeamExecutionAddress): TeamExecutionAddress =>
  createTeamExecutionAddress(address);

export const parseTeamExecutionAddress = (value: string): TeamExecutionAddress => {
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error("TeamExecutionAddress is not valid JSON."); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("TeamExecutionAddress must be an object.");
  }
  const record = parsed as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const expected = ["memberAddress", "rootTeamRunId", "taskAgentRunId", "taskTeamRunIds"];
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new Error("TeamExecutionAddress must contain exactly rootTeamRunId, taskTeamRunIds, memberAddress, and taskAgentRunId.");
  }
  if (!Array.isArray(record.taskTeamRunIds)) {
    throw new Error("TeamExecutionAddress.taskTeamRunIds must be an array.");
  }
  return createTeamExecutionAddress({
    rootTeamRunId: record.rootTeamRunId as string,
    taskTeamRunIds: record.taskTeamRunIds as string[],
    memberAddress: record.memberAddress as string,
    taskAgentRunId: record.taskAgentRunId as string | null,
  });
};
