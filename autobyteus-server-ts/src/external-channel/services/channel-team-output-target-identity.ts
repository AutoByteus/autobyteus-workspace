import { assertAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { RootTeamRun } from "../../agent-team-execution/domain/root-team-run.js";
import type { ChannelBinding, ChannelRunOutputTarget } from "../domain/models.js";

export type ChannelTeamOutputTarget = Extract<ChannelRunOutputTarget, { targetType: "TEAM" }>;
export type ChannelTeamOutputTargetIdentity = { entryAgentRunId: string | null };

export const resolveTeamRunOutputTarget = (
  binding: ChannelBinding,
  run: RootTeamRun,
  preferred: ChannelRunOutputTarget | null,
): ChannelTeamOutputTarget | null => {
  const identity = resolveTeamBindingCurrentOutputIdentity(binding, run);
  const entryAgentRunId = preferred?.targetType === "TEAM" && preferred.entryAgentRunId === identity.entryAgentRunId
    ? preferred.entryAgentRunId
    : identity.entryAgentRunId;
  return entryAgentRunId ? { targetType: "TEAM", teamRunId: run.teamRunId, entryAgentRunId } : null;
};

export const resolveTeamBindingCurrentOutputIdentity = (
  binding: ChannelBinding,
  run: RootTeamRun,
): ChannelTeamOutputTargetIdentity => {
  if (!binding.targetMemberAddress) return { entryAgentRunId: run.getCoordinatorAgentRunId() };
  const placement = run.resolveRecipient(assertAgentTeamAddress(binding.targetMemberAddress));
  const address = placement.kind === "agent" ? placement.address : placement.coordinatorAddress;
  const execution = run.getExecutionTreeSnapshot().rootTeam;
  return { entryAgentRunId: findConfiguredAgentRunId(execution.members, address) };
};

const findConfiguredAgentRunId = (
  members: import("../../agent-team-execution/domain/team-run-execution-tree.js").RootConfiguredTeamExecutionNode["members"],
  address: string,
): string | null => {
  for (const member of members) {
    if ("agentRunId" in member) {
      if (member.address === address) return member.agentRunId;
    } else {
      const nested = findConfiguredAgentRunId(member.members, address);
      if (nested) return nested;
    }
  }
  return null;
};
