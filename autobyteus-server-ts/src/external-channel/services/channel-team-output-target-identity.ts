import { assertAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { createTeamExecutionAddress, type TeamExecutionAddress } from "../../agent-team-execution/domain/team-execution-address.js";
import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import type { ChannelBinding, ChannelRunOutputTarget } from "../domain/models.js";

export type ChannelTeamOutputTarget = Extract<ChannelRunOutputTarget, { targetType: "TEAM" }>;
export type ChannelTeamOutputTargetIdentity = { executionAddress: TeamExecutionAddress | null };

export const resolveTeamRunOutputTarget = (
  binding: ChannelBinding,
  run: TeamRun,
  preferred: ChannelRunOutputTarget | null,
): ChannelTeamOutputTarget | null => {
  const identity = resolveTeamBindingOutputIdentity(binding, run, preferred?.targetType === "TEAM" ? preferred : null);
  return identity.executionAddress ? {
    targetType: "TEAM",
    teamRunId: binding.teamRunId?.trim() || preferred?.targetType === "TEAM" && preferred.teamRunId.trim() || run.teamRunId,
    entryExecutionAddress: identity.executionAddress,
  } : null;
};

export const resolveTeamBindingCurrentOutputIdentity = (binding: ChannelBinding, run: TeamRun): ChannelTeamOutputTargetIdentity =>
  resolveTeamBindingOutputIdentity(binding, run, null);

const resolveTeamBindingOutputIdentity = (
  binding: ChannelBinding,
  run: TeamRun,
  preferred: ChannelTeamOutputTarget | null,
): ChannelTeamOutputTargetIdentity => {
  if (preferred?.entryExecutionAddress) return { executionAddress: createTeamExecutionAddress(preferred.entryExecutionAddress) };
  const memberAddress = binding.targetMemberAddress
    ? assertAgentTeamAddress(binding.targetMemberAddress)
    : run.context.index.getTeam(run.context.teamAddress)?.coordinatorAddress ?? null;
  return { executionAddress: memberAddress ? createTeamExecutionAddress({ rootTeamRunId: run.config.rootTeam.teamRunId, memberAddress }) : null };
};
