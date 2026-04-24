export const APPLICATION_HOST_MANAGED_SKILL_ACCESS_MODE = "PRELOADED_ONLY";
const normalizeOptionalString = (value) => {
    const normalized = typeof value === "string" ? value.trim() : "";
    return normalized.length > 0 ? normalized : null;
};
const requireNonEmptyString = (value, fieldName) => {
    const normalized = normalizeOptionalString(value);
    if (!normalized) {
        throw new Error(`${fieldName} is required.`);
    }
    return normalized;
};
const cloneResourceRef = (resourceRef) => structuredClone(resourceRef);
const normalizeSkillAccessMode = (skillAccessMode) => {
    if (skillAccessMode === "GLOBAL_DISCOVERY" || skillAccessMode === "NONE") {
        return skillAccessMode;
    }
    return APPLICATION_HOST_MANAGED_SKILL_ACCESS_MODE;
};
export const resolveConfiguredAgentLaunchProfile = (input) => {
    const resourceRef = input.configuredResource?.resourceRef ?? input.fallbackResourceRef;
    const launchProfile = input.configuredResource?.launchProfile?.kind === "AGENT"
        ? input.configuredResource.launchProfile
        : null;
    return {
        resourceRef: cloneResourceRef(resourceRef),
        launchProfile: launchProfile ? structuredClone(launchProfile) : null,
    };
};
export const resolveConfiguredTeamLaunchProfile = (input) => {
    const resourceRef = input.configuredResource?.resourceRef ?? input.fallbackResourceRef;
    const launchProfile = input.configuredResource?.launchProfile?.kind === "AGENT_TEAM"
        ? input.configuredResource.launchProfile
        : null;
    return {
        resourceRef: cloneResourceRef(resourceRef),
        launchProfile: launchProfile ? structuredClone(launchProfile) : null,
    };
};
export const buildConfiguredAgentRunLaunch = (input) => ({
    kind: "AGENT",
    workspaceRootPath: input.workspaceRootPath,
    llmModelIdentifier: input.llmModelIdentifier,
    autoExecuteTools: true,
    skillAccessMode: normalizeSkillAccessMode(input.skillAccessMode),
    runtimeKind: input.launchProfile?.runtimeKind ?? input.runtimeKind ?? null,
});
const resolveTeamWorkspaceRootPath = (input) => (normalizeOptionalString(input.launchProfile.defaults?.workspaceRootPath)
    ?? requireNonEmptyString(input.workspaceRootPath, "workspaceRootPath"));
export const buildConfiguredTeamMemberLaunchConfigs = (input) => {
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
        llmModelIdentifier: requireNonEmptyString(normalizeOptionalString(memberProfile.llmModelIdentifier) ?? defaultLlmModelIdentifier, `llmModelIdentifier for team member '${memberProfile.memberName}'`),
        memberName: memberProfile.memberName,
        memberRouteKey: memberProfile.memberRouteKey,
        agentDefinitionId: memberProfile.agentDefinitionId,
        autoExecuteTools: true,
        skillAccessMode,
        workspaceRootPath,
        runtimeKind: normalizeOptionalString(memberProfile.runtimeKind) ?? defaultRuntimeKind ?? null,
    }));
};
export const buildConfiguredTeamRunLaunch = (input) => {
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
//# sourceMappingURL=launch-profile.js.map