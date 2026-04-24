import type {
  ApplicationAgentRunLaunch,
  ApplicationConfiguredAgentLaunchProfile,
  ApplicationConfiguredResource,
  ApplicationConfiguredTeamLaunchProfile,
  ApplicationRuntimeResourceRef,
  ApplicationSkillAccessMode,
  ApplicationTeamMemberLaunchConfig,
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

const cloneResourceRef = (
  resourceRef: ApplicationRuntimeResourceRef,
): ApplicationRuntimeResourceRef => structuredClone(resourceRef);

const normalizeSkillAccessMode = (
  skillAccessMode: ApplicationSkillAccessMode | null | undefined,
): ApplicationSkillAccessMode => {
  if (skillAccessMode === "GLOBAL_DISCOVERY" || skillAccessMode === "NONE") {
    return skillAccessMode;
  }
  return APPLICATION_HOST_MANAGED_SKILL_ACCESS_MODE;
};

export const resolveConfiguredAgentLaunchProfile = (input: {
  configuredResource: ApplicationConfiguredResource | null | undefined;
  fallbackResourceRef: ApplicationRuntimeResourceRef;
}): {
  resourceRef: ApplicationRuntimeResourceRef;
  launchProfile: ApplicationConfiguredAgentLaunchProfile | null;
} => {
  const resourceRef = input.configuredResource?.resourceRef ?? input.fallbackResourceRef;
  const launchProfile = input.configuredResource?.launchProfile?.kind === "AGENT"
    ? input.configuredResource.launchProfile
    : null;

  return {
    resourceRef: cloneResourceRef(resourceRef),
    launchProfile: launchProfile ? structuredClone(launchProfile) : null,
  };
};

export const resolveConfiguredTeamLaunchProfile = (input: {
  configuredResource: ApplicationConfiguredResource | null | undefined;
  fallbackResourceRef: ApplicationRuntimeResourceRef;
}): {
  resourceRef: ApplicationRuntimeResourceRef;
  launchProfile: ApplicationConfiguredTeamLaunchProfile | null;
} => {
  const resourceRef = input.configuredResource?.resourceRef ?? input.fallbackResourceRef;
  const launchProfile = input.configuredResource?.launchProfile?.kind === "AGENT_TEAM"
    ? input.configuredResource.launchProfile
    : null;

  return {
    resourceRef: cloneResourceRef(resourceRef),
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

export const buildConfiguredTeamMemberLaunchConfigs = (input: {
  launchProfile: ApplicationConfiguredTeamLaunchProfile;
  workspaceRootPath: string;
  llmModelIdentifier?: string | null;
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
      `llmModelIdentifier for team member '${memberProfile.memberName}'`,
    ),
    memberName: memberProfile.memberName,
    memberRouteKey: memberProfile.memberRouteKey,
    agentDefinitionId: memberProfile.agentDefinitionId,
    autoExecuteTools: true,
    skillAccessMode,
    workspaceRootPath,
    runtimeKind: normalizeOptionalString(memberProfile.runtimeKind) ?? defaultRuntimeKind ?? null,
  }));
};

export const buildConfiguredTeamRunLaunch = (input: {
  launchProfile: ApplicationConfiguredTeamLaunchProfile | null | undefined;
  workspaceRootPath: string;
  llmModelIdentifier?: string | null;
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
        runtimeKind: normalizeOptionalString(input.runtimeKind) ?? null,
      },
    };
  }

  return {
    kind: "AGENT_TEAM",
    mode: "memberConfigs",
    memberConfigs: buildConfiguredTeamMemberLaunchConfigs({
      launchProfile: input.launchProfile,
      workspaceRootPath: input.workspaceRootPath,
      llmModelIdentifier: input.llmModelIdentifier,
      runtimeKind: input.runtimeKind,
      skillAccessMode: input.skillAccessMode,
    }),
  };
};
