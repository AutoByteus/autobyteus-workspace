export const APPLICATION_HOST_MANAGED_SKILL_ACCESS_MODE = "PRELOADED_ONLY";
const normalizeSkillAccessMode = (value) => value ?? APPLICATION_HOST_MANAGED_SKILL_ACCESS_MODE;
const requireWorkspaceRootPath = (value, label) => {
    const normalized = value?.trim() ?? "";
    if (!normalized)
        throw new Error(`workspaceRootPath is required for ${label}.`);
    return normalized;
};
export const buildEffectiveAgentRunLaunch = (input) => {
    if (input.configuration.resourceKind !== "AGENT" || input.configuration.leaves.length !== 1) {
        throw new Error("Runnable AGENT configuration must contain exactly one effective leaf.");
    }
    const leaf = input.configuration.leaves[0];
    return {
        kind: "AGENT",
        workspaceRootPath: requireWorkspaceRootPath(leaf.workspaceRootPath, leaf.agentDefinitionId),
        llmModelIdentifier: leaf.llmModelIdentifier,
        autoExecuteTools: true,
        skillAccessMode: normalizeSkillAccessMode(input.skillAccessMode),
        runtimeKind: leaf.runtimeKind,
        ...(leaf.llmConfig === null ? {} : { llmConfig: structuredClone(leaf.llmConfig) }),
    };
};
export const buildEffectiveTeamRunLaunch = (input) => {
    if (input.configuration.resourceKind !== "AGENT_TEAM") {
        throw new Error("Runnable AGENT_TEAM configuration is required.");
    }
    const skillAccessMode = normalizeSkillAccessMode(input.skillAccessMode);
    return {
        kind: "AGENT_TEAM",
        mode: "memberConfigs",
        memberConfigs: input.configuration.leaves.map((leaf) => ({
            memberName: leaf.memberName,
            memberRouteKey: leaf.memberRouteKey ?? leaf.memberName,
            agentDefinitionId: leaf.agentDefinitionId,
            workspaceRootPath: requireWorkspaceRootPath(leaf.workspaceRootPath, leaf.memberRouteKey ?? leaf.memberName),
            llmModelIdentifier: leaf.llmModelIdentifier,
            autoExecuteTools: true,
            skillAccessMode,
            runtimeKind: leaf.runtimeKind,
            ...(leaf.llmConfig === null ? {} : { llmConfig: structuredClone(leaf.llmConfig) }),
        })),
    };
};
//# sourceMappingURL=launch-profile.js.map