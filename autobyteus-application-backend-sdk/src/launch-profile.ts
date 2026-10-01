import type {
  ApplicationAgentRunLaunch,
  ApplicationEffectiveLaunchConfiguration,
  ApplicationTeamRunLaunch,
} from "@autobyteus/application-sdk-contracts";

const requireWorkspaceRootPath = (
  value: string | null,
  label: string,
): string => {
  const normalized = value?.trim() ?? "";
  if (!normalized) throw new Error(`workspaceRootPath is required for ${label}.`);
  return normalized;
};

const requireMemberAddress = (value: string | null): string => {
  const normalized = value?.trim() ?? "";
  if (!normalized) throw new Error("memberAddress is required for an effective team leaf.");
  return normalized;
};

export const buildEffectiveAgentRunLaunch = (input: {
  configuration: ApplicationEffectiveLaunchConfiguration;
}): ApplicationAgentRunLaunch => {
  if (input.configuration.resourceKind !== "AGENT" || input.configuration.leaves.length !== 1) {
    throw new Error("Runnable AGENT configuration must contain exactly one effective leaf.");
  }
  const leaf = input.configuration.leaves[0]!;
  return {
    kind: "AGENT",
    workspaceRootPath: requireWorkspaceRootPath(leaf.workspaceRootPath, leaf.agentDefinitionId),
    llmModelIdentifier: leaf.llmModelIdentifier,
    autoExecuteTools: true,
    runtimeKind: leaf.runtimeKind,
    ...(leaf.llmConfig === null ? {} : { llmConfig: structuredClone(leaf.llmConfig) }),
  };
};

export const buildEffectiveTeamRunLaunch = (input: {
  configuration: ApplicationEffectiveLaunchConfiguration;
}): ApplicationTeamRunLaunch => {
  if (input.configuration.resourceKind !== "AGENT_TEAM") {
    throw new Error("Runnable AGENT_TEAM configuration is required.");
  }
  return {
    kind: "AGENT_TEAM",
    mode: "memberConfigs",
    teamConfigs: input.configuration.teamScopes.map((scope) => ({
      teamAddress: scope.teamAddress,
      workspaceRootPath: requireWorkspaceRootPath(scope.workspaceRootPath, scope.displayName),
      llmModelIdentifier: scope.llmModelIdentifier,
      autoExecuteTools: true,
      runtimeKind: scope.runtimeKind,
      ...(scope.llmConfig === null ? {} : { llmConfig: structuredClone(scope.llmConfig) }),
    })),
    memberConfigs: input.configuration.leaves.map((leaf) => ({
      memberAddress: requireMemberAddress(leaf.memberAddress),
      displayName: leaf.displayName,
      agentDefinitionId: leaf.agentDefinitionId,
      workspaceRootPath: requireWorkspaceRootPath(leaf.workspaceRootPath, leaf.displayName),
      llmModelIdentifier: leaf.llmModelIdentifier,
      autoExecuteTools: true,
      runtimeKind: leaf.runtimeKind,
      ...(leaf.llmConfig === null ? {} : { llmConfig: structuredClone(leaf.llmConfig) }),
    })),
  };
};
