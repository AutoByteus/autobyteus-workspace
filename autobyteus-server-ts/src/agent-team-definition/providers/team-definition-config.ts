import type { AgentTeamDefinition, TeamMemberRefScope } from "../domain/models.js";
import type { DefaultLaunchConfig } from "../../launch-preferences/default-launch-config.js";
import { normalizeDefaultLaunchConfig } from "../../launch-preferences/default-launch-config.js";

export type TeamConfigMember = {
  memberName: string;
  ref: string;
  refType: "agent" | "agent_team";
  refScope?: TeamMemberRefScope;
};

export type TeamConfigRecord = {
  coordinatorMemberName?: string;
  members?: TeamConfigMember[];
  avatarUrl?: string | null;
  defaultLaunchConfig?: DefaultLaunchConfig | null;
};

export class TeamConfigParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeamConfigParseError";
  }
}

const normalizeRefScope = (value: unknown): TeamMemberRefScope | null => {
  if (value === "shared" || value === "team_local" || value === "application_owned") {
    return value;
  }
  return null;
};

export const normalizeMembers = (value: unknown): TeamConfigMember[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const members: TeamConfigMember[] = [];
  value.forEach((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new TeamConfigParseError(`members[${index}] must be an object.`);
    }
    const candidate = entry as Record<string, unknown>;
    const memberName = typeof candidate.memberName === "string" ? candidate.memberName : "";
    const ref = typeof candidate.ref === "string" ? candidate.ref : "";
    const refType = candidate.refType === "agent_team" ? "agent_team" : candidate.refType === "agent" ? "agent" : null;
    const refScope = normalizeRefScope(candidate.refScope);
    if (!memberName || !ref || !refType) {
      throw new TeamConfigParseError(
        `members[${index}] must include non-empty memberName, ref, and refType.`,
      );
    }
    if (refType === "agent" && !refScope) {
      throw new TeamConfigParseError(
        `members[${index}] with refType 'agent' must include refScope 'shared', 'team_local', or 'application_owned'.`,
      );
    }
    if (refType === "agent_team" && candidate.refScope !== undefined && candidate.refScope !== null) {
      throw new TeamConfigParseError(
        `members[${index}] with refType 'agent_team' must not include refScope.`,
      );
    }
    members.push({
      memberName,
      ref,
      refType,
      ...(refType === "agent" ? { refScope: refScope ?? undefined } : {}),
    });
  });
  return members;
};

export const defaultTeamConfig = (): TeamConfigRecord => ({
  coordinatorMemberName: "",
  members: [],
  avatarUrl: null,
  defaultLaunchConfig: null,
});

export const normalizeTeamConfigRecord = (
  value: TeamConfigRecord | Record<string, unknown> | null | undefined,
): TeamConfigRecord => ({
  coordinatorMemberName:
    typeof value?.coordinatorMemberName === "string" ? value.coordinatorMemberName : "",
  members: normalizeMembers(value?.members),
  avatarUrl: typeof value?.avatarUrl === "string" ? value.avatarUrl : null,
  defaultLaunchConfig: normalizeDefaultLaunchConfig(value?.defaultLaunchConfig),
});

export const buildTeamConfigRecord = (domainObj: AgentTeamDefinition): TeamConfigRecord => ({
  coordinatorMemberName: domainObj.coordinatorMemberName,
  avatarUrl: domainObj.avatarUrl ?? null,
  defaultLaunchConfig: domainObj.defaultLaunchConfig ?? null,
  members: domainObj.nodes.map((member) => ({
    memberName: member.memberName,
    ref: member.ref,
    refType: member.refType,
    ...(member.refType === "agent" ? { refScope: member.refScope ?? "shared" } : {}),
  })),
});
