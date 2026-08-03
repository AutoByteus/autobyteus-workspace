import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import type { TeamBackendKind } from "./team-backend-kind.js";
import {
  buildMemberPath,
  buildMemberRouteKeyFromPath,
  normalizeMemberPath,
} from "./team-run-member-identity.js";
import { normalizeMemberRouteKey } from "./team-run-member-identity.js";
import {
  cloneCollaborationHandoffs,
  type CollaborationHandoff,
} from "../../agent-collaboration/domain/collaboration-handoff.js";

export type TeamRunMemberKind = "agent" | "agent_team";

export type TeamRunMemberConfigBase = {
  memberKind: TeamRunMemberKind;
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId?: string | null;
  role?: string | null;
  description?: string | null;
};

export type TeamMemberRunConfig = TeamRunMemberConfigBase & {
  memberKind: "agent";
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode;
  workspaceId?: string | null;
  workspaceRootPath?: string | null;
  memoryDir?: string | null;
  llmConfig?: Record<string, unknown> | null;
  runtimeKind: RuntimeKind;
  applicationExecutionContext?: ApplicationExecutionContext | null;
};

export type TeamSubTeamMemberRunConfig = TeamRunMemberConfigBase & {
  memberKind: "agent_team";
  teamDefinitionId: string;
  coordinatorMemberRouteKey: string | null;
  childTeamRunId?: string | null;
  memberConfigs: TeamRunMemberConfig[];
};

export type TeamRunMemberConfig = TeamMemberRunConfig | TeamSubTeamMemberRunConfig;

export type TeamMemberRunConfigInput = Omit<
  Partial<TeamMemberRunConfig>,
  "memberKind"
> & {
  memberKind?: "agent" | null;
  memberName: string;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode;
  runtimeKind: RuntimeKind;
};

export type TeamSubTeamMemberRunConfigInput = Omit<
  Partial<TeamSubTeamMemberRunConfig>,
  "memberKind" | "memberConfigs"
> & {
  memberKind: "agent_team";
  memberName: string;
  teamDefinitionId: string;
  memberConfigs: TeamRunMemberConfigInput[];
};

export type TeamRunMemberConfigInput =
  | TeamMemberRunConfigInput
  | TeamSubTeamMemberRunConfigInput
  | TeamRunMemberConfig;

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const normalizeOptionalString = (value: string | null | undefined): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const hasExplicitMemberPath = (
  input: { memberPath?: string[] | readonly string[] | null },
): input is { memberPath: string[] | readonly string[] } =>
  Array.isArray(input.memberPath) && input.memberPath.length > 0;

export const normalizeTeamRunMemberConfigTree = (
  memberConfigs: readonly TeamRunMemberConfigInput[],
  parentPath: readonly string[] = [],
): TeamRunMemberConfig[] =>
  memberConfigs.map((memberConfig) => normalizeTeamRunMemberConfig(memberConfig, parentPath));

const normalizeTeamRunMemberConfig = (
  input: TeamRunMemberConfigInput,
  parentPath: readonly string[],
): TeamRunMemberConfig => {
  const memberName = normalizeRequiredString(input.memberName, "memberName");
  const memberPath = hasExplicitMemberPath(input)
    ? normalizeMemberPath(input.memberPath)
    : buildMemberPath(parentPath, memberName);
  const memberRouteKey = normalizeMemberRouteKey(
    input.memberRouteKey ?? buildMemberRouteKeyFromPath(memberPath),
  );

  if (input.memberKind === "agent_team") {
    return {
      memberKind: "agent_team",
      memberName,
      memberPath,
      memberRouteKey,
      memberRunId: normalizeOptionalString(input.memberRunId),
      role: input.role ?? null,
      description: input.description ?? null,
      teamDefinitionId: normalizeRequiredString(input.teamDefinitionId, "teamDefinitionId"),
      coordinatorMemberRouteKey: normalizeOptionalString(input.coordinatorMemberRouteKey),
      childTeamRunId: normalizeOptionalString(input.childTeamRunId),
      memberConfigs: normalizeTeamRunMemberConfigTree(input.memberConfigs, memberPath),
    };
  }

  return {
    memberKind: "agent",
    memberName,
    memberPath,
    memberRouteKey,
    memberRunId: normalizeOptionalString(input.memberRunId),
    role: input.role ?? null,
    description: input.description ?? null,
    agentDefinitionId: normalizeRequiredString(input.agentDefinitionId, "agentDefinitionId"),
    llmModelIdentifier: normalizeRequiredString(input.llmModelIdentifier, "llmModelIdentifier"),
    autoExecuteTools: Boolean(input.autoExecuteTools),
    skillAccessMode: input.skillAccessMode,
    workspaceId: input.workspaceId ?? null,
    workspaceRootPath: input.workspaceRootPath ?? null,
    memoryDir: input.memoryDir ?? null,
    llmConfig: input.llmConfig ?? null,
    runtimeKind: input.runtimeKind,
    applicationExecutionContext: input.applicationExecutionContext ?? null,
  };
};

export const collectAgentMemberRunConfigs = (
  memberConfigs: readonly TeamRunMemberConfig[],
): TeamMemberRunConfig[] => {
  const agents: TeamMemberRunConfig[] = [];
  const visit = (members: readonly TeamRunMemberConfig[]): void => {
    for (const member of members) {
      if (member.memberKind === "agent") {
        agents.push({ ...member, memberPath: [...member.memberPath] });
      } else {
        visit(member.memberConfigs);
      }
    }
  };
  visit(memberConfigs);
  return agents;
};

export const collectTopLevelAgentMemberRunConfigs = (
  memberConfigs: readonly TeamRunMemberConfig[],
): TeamMemberRunConfig[] =>
  memberConfigs.filter((member): member is TeamMemberRunConfig => member.memberKind === "agent");

export const hasSubTeamMemberConfigs = (
  memberConfigs: readonly TeamRunMemberConfig[],
): boolean =>
  memberConfigs.some((member) => member.memberKind === "agent_team");

export type TeamRunTopologyLocalizationErrorCode =
  | "TEAM_RUN_LOCALIZATION_PREFIX_INVALID"
  | "TEAM_RUN_COORDINATOR_INVALID";

export class TeamRunTopologyLocalizationError extends Error {
  constructor(
    readonly code: TeamRunTopologyLocalizationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TeamRunTopologyLocalizationError";
  }
}

export type LocalizedSubTeamRunTopology = {
  coordinatorMemberRouteKey: string;
  memberTree: TeamRunMemberConfig[];
};

export const localizeSubTeamRunTopology = (
  subTeamConfig: TeamSubTeamMemberRunConfig,
): LocalizedSubTeamRunTopology => {
  const mountPath = normalizeMemberPath(subTeamConfig.memberPath);

  const localizeMember = (source: TeamRunMemberConfig): TeamRunMemberConfig => {
    const sourcePath = normalizeMemberPath(source.memberPath);
    const matchesPrefix =
      sourcePath.length > mountPath.length &&
      mountPath.every((segment, index) => sourcePath[index] === segment);
    if (!matchesPrefix) {
      throw new TeamRunTopologyLocalizationError(
        "TEAM_RUN_LOCALIZATION_PREFIX_INVALID",
        `Member path '${sourcePath.join("/")}' is not a strict descendant of subteam mount '${mountPath.join("/")}'.`,
      );
    }
    const memberPath = sourcePath.slice(mountPath.length);
    const memberRouteKey = buildMemberRouteKeyFromPath(memberPath);
    if (source.memberKind === "agent") {
      return {
        ...source,
        memberPath,
        memberRouteKey,
      };
    }

    const localizedChildren = source.memberConfigs.map(localizeMember);
    const sourceCoordinator = resolveDirectSourceCoordinator(source);
    const coordinatorIndex = source.memberConfigs.indexOf(sourceCoordinator);
    const localizedCoordinator = localizedChildren[coordinatorIndex];
    if (!localizedCoordinator || localizedCoordinator.memberKind !== "agent") {
      throw invalidCoordinator(source.memberRouteKey);
    }
    return {
      ...source,
      memberPath,
      memberRouteKey,
      coordinatorMemberRouteKey: localizedCoordinator.memberRouteKey,
      memberConfigs: localizedChildren,
    };
  };

  const sourceCoordinator = resolveDirectSourceCoordinator(subTeamConfig);
  const coordinatorIndex = subTeamConfig.memberConfigs.indexOf(sourceCoordinator);
  const memberTree = subTeamConfig.memberConfigs.map(localizeMember);
  const localizedCoordinator = memberTree[coordinatorIndex];
  if (!localizedCoordinator || localizedCoordinator.memberKind !== "agent") {
    throw invalidCoordinator(subTeamConfig.memberRouteKey);
  }
  assertLocalizedCoordinatorInvariants(memberTree);
  return {
    coordinatorMemberRouteKey: localizedCoordinator.memberRouteKey,
    memberTree,
  };
};

const invalidCoordinator = (teamRouteKey: string): TeamRunTopologyLocalizationError =>
  new TeamRunTopologyLocalizationError(
    "TEAM_RUN_COORDINATOR_INVALID",
    `Team '${teamRouteKey}' must identify exactly one direct Agent coordinator.`,
  );

const resolveDirectSourceCoordinator = (
  team: Pick<TeamSubTeamMemberRunConfig, "memberRouteKey" | "coordinatorMemberRouteKey" | "memberConfigs">,
): TeamMemberRunConfig => {
  const coordinatorRouteKey = team.coordinatorMemberRouteKey?.trim() ?? "";
  const matches = team.memberConfigs.filter(
    (member): member is TeamMemberRunConfig =>
      member.memberKind === "agent" && member.memberRouteKey === coordinatorRouteKey,
  );
  if (matches.length !== 1) {
    throw invalidCoordinator(team.memberRouteKey);
  }
  return matches[0]!;
};

const assertLocalizedCoordinatorInvariants = (
  members: readonly TeamRunMemberConfig[],
): void => {
  for (const member of members) {
    if (member.memberKind !== "agent_team") {
      continue;
    }
    const matches = member.memberConfigs.filter(
      (child) =>
        child.memberKind === "agent" &&
        child.memberRouteKey === member.coordinatorMemberRouteKey,
    );
    if (matches.length !== 1) {
      throw invalidCoordinator(member.memberRouteKey);
    }
    assertLocalizedCoordinatorInvariants(member.memberConfigs);
  }
};

export class TeamRunConfig {
  readonly teamDefinitionId: string;
  readonly teamBackendKind: TeamBackendKind;
  readonly coordinatorMemberName: string | null;
  readonly coordinatorMemberRouteKey: string | null;
  readonly memberTree: TeamRunMemberConfig[];
  readonly effectiveHandoffs: readonly CollaborationHandoff[];
  /** Derived flat leaf-agent projection. Do not use as authoritative nested topology. */
  readonly memberConfigs: TeamMemberRunConfig[];

  constructor(input: {
    teamDefinitionId: string;
    teamBackendKind: TeamBackendKind;
    coordinatorMemberName?: string | null;
    coordinatorMemberRouteKey?: string | null;
    memberConfigs?: TeamRunMemberConfigInput[];
    memberTree?: TeamRunMemberConfigInput[];
    effectiveHandoffs?: readonly CollaborationHandoff[] | null;
  }) {
    this.teamDefinitionId = normalizeRequiredString(input.teamDefinitionId, "teamDefinitionId");
    this.teamBackendKind = input.teamBackendKind;
    this.coordinatorMemberName = normalizeOptionalString(input.coordinatorMemberName);
    const treeInput = input.memberTree ?? input.memberConfigs ?? [];
    this.memberTree = normalizeTeamRunMemberConfigTree(treeInput);
    this.memberConfigs = collectAgentMemberRunConfigs(this.memberTree);
    this.effectiveHandoffs = Object.freeze(
      cloneCollaborationHandoffs(input.effectiveHandoffs ?? []),
    );
    this.coordinatorMemberRouteKey = normalizeOptionalString(input.coordinatorMemberRouteKey)
      ?? (this.coordinatorMemberName
        ? normalizeMemberRouteKey(this.coordinatorMemberName)
        : null);
  }
}
