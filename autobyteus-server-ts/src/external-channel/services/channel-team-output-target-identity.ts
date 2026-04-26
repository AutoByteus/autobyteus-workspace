import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import { getRuntimeMemberContexts } from "../../agent-team-execution/domain/team-run-context.js";
import type { ChannelBinding, ChannelRunOutputTarget } from "../domain/models.js";

export type ChannelTeamOutputTarget = Extract<
  ChannelRunOutputTarget,
  { targetType: "TEAM" }
>;

export type ChannelTeamOutputTargetIdentity = {
  memberName: string | null;
  memberRunId: string | null;
};

export const resolveTeamRunOutputTarget = (
  binding: ChannelBinding,
  run: TeamRun,
  preferred: ChannelRunOutputTarget | null,
): ChannelTeamOutputTarget | null => {
  const preferredTeam = preferred?.targetType === "TEAM" ? preferred : null;
  const identity = resolveTeamBindingOutputIdentity(binding, run, preferredTeam);
  if (!identity.memberName && !identity.memberRunId) {
    return null;
  }
  return {
    targetType: "TEAM",
    teamRunId: binding.teamRunId ?? preferredTeam?.teamRunId ?? run.runId,
    entryMemberRunId: identity.memberRunId,
    entryMemberName: identity.memberName,
  };
};

export const resolveTeamBindingCurrentOutputIdentity = (
  binding: ChannelBinding,
  run: TeamRun,
): ChannelTeamOutputTargetIdentity =>
  resolveTeamBindingOutputIdentity(binding, run, null);

const resolveTeamBindingOutputIdentity = (
  binding: ChannelBinding,
  run: TeamRun,
  preferred: ChannelTeamOutputTarget | null,
): ChannelTeamOutputTargetIdentity => {
  const memberName =
    preferred?.entryMemberName ?? resolveTeamEntryMemberName(binding, run);
  return {
    memberName,
    memberRunId:
      preferred?.entryMemberRunId ?? resolveTeamEntryMemberRunId(run, memberName),
  };
};

const resolveTeamEntryMemberName = (
  binding: ChannelBinding,
  run: TeamRun,
): string | null =>
  normalizeOptionalString(binding.targetNodeName) ??
  normalizeOptionalString(run.context?.coordinatorMemberName ?? null) ??
  normalizeOptionalString(run.config?.coordinatorMemberName ?? null) ??
  (run.config?.memberConfigs.length === 1
    ? normalizeOptionalString(run.config.memberConfigs[0]?.memberName ?? null)
    : null);

const resolveTeamEntryMemberRunId = (
  run: TeamRun,
  memberName: string | null,
): string | null => {
  const contexts = getRuntimeMemberContexts(run.getRuntimeContext());
  if (memberName) {
    return contexts.find((context) => context.memberName === memberName)?.memberRunId ?? null;
  }
  return contexts.length === 1 ? contexts[0]?.memberRunId ?? null : null;
};

const normalizeOptionalString = (
  value: string | null | undefined,
): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};
