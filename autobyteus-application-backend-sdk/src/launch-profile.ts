import type {
  ApplicationAgentRunLaunch,
  ApplicationConfiguredAgentLaunchProfile,
  ApplicationConfiguredExecutionResource,
  ApplicationConfiguredTeamLaunchProfile,
  ApplicationExecutionResourceRef,
  ApplicationSkillAccessMode,
  ApplicationTeamMemberLaunchConfig,
  ApplicationTeamRunPreset,
  ApplicationTeamRunLaunch,
} from "@autobyteus/application-sdk-contracts";

export const APPLICATION_HOST_MANAGED_SKILL_ACCESS_MODE = "PRELOADED_ONLY" as const satisfies ApplicationSkillAccessMode;

const normalizeOptionalString = (
  value: string | null | undefined,
): string | null => {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
};

const requireNonEmptyString = (
  value: string | null | undefined,
  fieldName: string,
): string => {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const cloneExecutionResourceRef = (
  executionResourceRef: ApplicationExecutionResourceRef,
): ApplicationExecutionResourceRef => structuredClone(executionResourceRef);

const normalizeSkillAccessMode = (
  skillAccessMode: ApplicationSkillAccessMode | string | null | undefined,
): ApplicationSkillAccessMode => {
  if (skillAccessMode === undefined || skillAccessMode === null || skillAccessMode === APPLICATION_HOST_MANAGED_SKILL_ACCESS_MODE) {
    return APPLICATION_HOST_MANAGED_SKILL_ACCESS_MODE;
  }
  if (skillAccessMode === "NONE") {
    return "NONE";
  }
  throw new Error(`Unsupported skillAccessMode '${skillAccessMode}'.`);
};

export const resolveConfiguredAgentLaunchProfile = (input: {
  configuredResource: ApplicationConfiguredExecutionResource | null | undefined;
  fallbackExecutionResourceRef: ApplicationExecutionResourceRef;
}): {
  executionResourceRef: ApplicationExecutionResourceRef;
  launchProfile: ApplicationConfiguredAgentLaunchProfile | null;
} => {
  const executionResourceRef = input.configuredResource?.executionResourceRef ?? input.fallbackExecutionResourceRef;
  const launchProfile = input.configuredResource?.launchProfile?.kind === "AGENT"
    ? input.configuredResource.launchProfile
    : null;

  return {
    executionResourceRef: cloneExecutionResourceRef(executionResourceRef),
    launchProfile: launchProfile ? structuredClone(launchProfile) : null,
  };
};

export const resolveConfiguredTeamLaunchProfile = (input: {
  configuredResource: ApplicationConfiguredExecutionResource | null | undefined;
  fallbackExecutionResourceRef: ApplicationExecutionResourceRef;
}): {
  executionResourceRef: ApplicationExecutionResourceRef;
  launchProfile: ApplicationConfiguredTeamLaunchProfile | null;
} => {
  const executionResourceRef = input.configuredResource?.executionResourceRef ?? input.fallbackExecutionResourceRef;
  const launchProfile = input.configuredResource?.launchProfile?.kind === "AGENT_TEAM"
    ? input.configuredResource.launchProfile
    : null;

  return {
    executionResourceRef: cloneExecutionResourceRef(executionResourceRef),
    launchProfile: launchProfile ? structuredClone(launchProfile) : null,
  };
};

export const buildConfiguredAgentRunLaunch = (input: {
  launchProfile: ApplicationConfiguredAgentLaunchProfile | null | undefined;
  workspaceRootPath: string;
  llmModelIdentifier: string;
  runtimeKind?: string | null;
  skillAccessMode?: ApplicationSkillAccessMode | null;
}): ApplicationAgentRunLaunch => ({
  kind: "AGENT",
  workspaceRootPath: input.workspaceRootPath,
  llmModelIdentifier: input.llmModelIdentifier,
  autoExecuteTools: true,
  skillAccessMode: normalizeSkillAccessMode(input.skillAccessMode),
  runtimeKind: input.launchProfile?.runtimeKind ?? input.runtimeKind ?? null,
});

const resolveTeamWorkspaceRootPath = (input: {
  launchProfile: ApplicationConfiguredTeamLaunchProfile;
  workspaceRootPath: string;
}): string => (
  normalizeOptionalString(input.launchProfile.defaults?.workspaceRootPath)
  ?? requireNonEmptyString(input.workspaceRootPath, "workspaceRootPath")
);

export const buildConfiguredTeamDefaultConfig = (input: {
  launchProfile: ApplicationConfiguredTeamLaunchProfile;
  workspaceRootPath: string;
  llmModelIdentifier?: string | null;
  llmConfig?: Record<string, unknown> | null;
  runtimeKind?: string | null;
  skillAccessMode?: ApplicationSkillAccessMode | null;
}): ApplicationTeamRunPreset => ({
  workspaceRootPath: resolveTeamWorkspaceRootPath(input),
  llmModelIdentifier: requireNonEmptyString(
    normalizeOptionalString(input.launchProfile.defaults?.llmModelIdentifier)
      ?? normalizeOptionalString(input.llmModelIdentifier),
    "teamDefaultConfig.llmModelIdentifier",
  ),
  autoExecuteTools: true,
  skillAccessMode: normalizeSkillAccessMode(input.skillAccessMode),
  runtimeKind: normalizeOptionalString(input.launchProfile.defaults?.runtimeKind)
    ?? normalizeOptionalString(input.runtimeKind),
  ...(input.llmConfig === undefined ? {} : { llmConfig: structuredClone(input.llmConfig) }),
});

export const buildConfiguredTeamMemberLaunchConfigs = (input: {
  launchProfile: ApplicationConfiguredTeamLaunchProfile;
  workspaceRootPath: string;
  llmModelIdentifier?: string | null;
  llmConfig?: Record<string, unknown> | null;
  runtimeKind?: string | null;
  skillAccessMode?: ApplicationSkillAccessMode | null;
}): ApplicationTeamMemberLaunchConfig[] => {
  const skillAccessMode = normalizeSkillAccessMode(input.skillAccessMode);
  const defaultLlmModelIdentifier = normalizeOptionalString(input.launchProfile.defaults?.llmModelIdentifier)
    ?? normalizeOptionalString(input.llmModelIdentifier);
  const defaultRuntimeKind = normalizeOptionalString(input.launchProfile.defaults?.runtimeKind)
    ?? normalizeOptionalString(input.runtimeKind);
  const workspaceRootPath = resolveTeamWorkspaceRootPath({
    launchProfile: input.launchProfile,
    workspaceRootPath: input.workspaceRootPath,
  });

  return input.launchProfile.memberProfiles.map((memberProfile) => ({
    llmModelIdentifier: requireNonEmptyString(
      normalizeOptionalString(memberProfile.llmModelIdentifier) ?? defaultLlmModelIdentifier,
      `llmModelIdentifier for team member '${memberProfile.memberAddress}'`,
    ),
    memberAddress: memberProfile.memberAddress,
    agentDefinitionId: memberProfile.agentDefinitionId,
    autoExecuteTools: true,
    skillAccessMode,
    workspaceRootPath,
    ...(input.llmConfig === undefined ? {} : { llmConfig: structuredClone(input.llmConfig) }),
    runtimeKind: normalizeOptionalString(memberProfile.runtimeKind) ?? defaultRuntimeKind ?? null,
  }));
};

export const buildConfiguredTeamRunLaunch = (input: {
  launchProfile: ApplicationConfiguredTeamLaunchProfile | null | undefined;
  workspaceRootPath: string;
  llmModelIdentifier?: string | null;
  llmConfig?: Record<string, unknown> | null;
  runtimeKind?: string | null;
  skillAccessMode?: ApplicationSkillAccessMode | null;
}): ApplicationTeamRunLaunch => {
  if (!input.launchProfile) {
    return {
      kind: "AGENT_TEAM",
      mode: "preset",
      launchPreset: {
        workspaceRootPath: requireNonEmptyString(input.workspaceRootPath, "workspaceRootPath"),
        llmModelIdentifier: requireNonEmptyString(input.llmModelIdentifier, "llmModelIdentifier"),
        autoExecuteTools: true,
        skillAccessMode: normalizeSkillAccessMode(input.skillAccessMode),
        ...(input.llmConfig === undefined ? {} : { llmConfig: structuredClone(input.llmConfig) }),
        runtimeKind: normalizeOptionalString(input.runtimeKind) ?? null,
      },
    };
  }

  return {
    kind: "AGENT_TEAM",
    mode: "memberConfigs",
    teamDefaultConfig: buildConfiguredTeamDefaultConfig({
      launchProfile: input.launchProfile,
      workspaceRootPath: input.workspaceRootPath,
      llmModelIdentifier: input.llmModelIdentifier,
      llmConfig: input.llmConfig,
      runtimeKind: input.runtimeKind,
      skillAccessMode: input.skillAccessMode,
    }),
    memberConfigs: buildConfiguredTeamMemberLaunchConfigs({
      launchProfile: input.launchProfile,
      workspaceRootPath: input.workspaceRootPath,
      llmModelIdentifier: input.llmModelIdentifier,
      llmConfig: input.llmConfig,
      runtimeKind: input.runtimeKind,
      skillAccessMode: input.skillAccessMode,
    }),
  };
};
