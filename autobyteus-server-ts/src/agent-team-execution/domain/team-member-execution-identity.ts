import {
  assertAgentTeamAddress,
  getAgentTeamAddressBasename,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";

export type TeamMemberExecutionIdentity = Readonly<{
  rootTeamRunId: string;
  memberAddress: AgentTeamAddress;
  agentRunId: string;
}>;

const required = (value: string, fieldName: string): string => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new Error(`${fieldName} is required.`);
  return normalized;
};

export const createTeamMemberExecutionIdentity = (input: {
  rootTeamRunId: string;
  memberAddress: string;
  agentRunId: string;
}): TeamMemberExecutionIdentity => {
  const keys = Object.keys(input).sort();
  const expected = ["agentRunId", "memberAddress", "rootTeamRunId"];
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new Error("Team member execution identity accepts exactly rootTeamRunId, memberAddress, and agentRunId.");
  }
  const memberAddress = assertAgentTeamAddress(input.memberAddress);
  if (!getAgentTeamAddressBasename(memberAddress)) {
    throw new Error("memberAddress must identify an Agent placement.");
  }
  return Object.freeze({
    rootTeamRunId: required(input.rootTeamRunId, "rootTeamRunId"),
    memberAddress,
    agentRunId: required(input.agentRunId, "agentRunId"),
  });
};

export const cloneTeamMemberExecutionIdentity = (
  identity: TeamMemberExecutionIdentity,
): TeamMemberExecutionIdentity => createTeamMemberExecutionIdentity(identity);
