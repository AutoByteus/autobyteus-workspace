import type { ApplicationAgentRunLaunch, ApplicationConfiguredAgentLaunchProfile, ApplicationConfiguredResource, ApplicationConfiguredTeamLaunchProfile, ApplicationRuntimeResourceRef, ApplicationSkillAccessMode, ApplicationTeamMemberLaunchConfig, ApplicationTeamRunLaunch } from "@autobyteus/application-sdk-contracts";
export declare const APPLICATION_HOST_MANAGED_SKILL_ACCESS_MODE: "PRELOADED_ONLY";
export declare const resolveConfiguredAgentLaunchProfile: (input: {
    configuredResource: ApplicationConfiguredResource | null | undefined;
    fallbackResourceRef: ApplicationRuntimeResourceRef;
}) => {
    resourceRef: ApplicationRuntimeResourceRef;
    launchProfile: ApplicationConfiguredAgentLaunchProfile | null;
};
export declare const resolveConfiguredTeamLaunchProfile: (input: {
    configuredResource: ApplicationConfiguredResource | null | undefined;
    fallbackResourceRef: ApplicationRuntimeResourceRef;
}) => {
    resourceRef: ApplicationRuntimeResourceRef;
    launchProfile: ApplicationConfiguredTeamLaunchProfile | null;
};
export declare const buildConfiguredAgentRunLaunch: (input: {
    launchProfile: ApplicationConfiguredAgentLaunchProfile | null | undefined;
    workspaceRootPath: string;
    llmModelIdentifier: string;
    runtimeKind?: string | null;
    skillAccessMode?: ApplicationSkillAccessMode | null;
}) => ApplicationAgentRunLaunch;
export declare const buildConfiguredTeamMemberLaunchConfigs: (input: {
    launchProfile: ApplicationConfiguredTeamLaunchProfile;
    workspaceRootPath: string;
    llmModelIdentifier?: string | null;
    runtimeKind?: string | null;
    skillAccessMode?: ApplicationSkillAccessMode | null;
}) => ApplicationTeamMemberLaunchConfig[];
export declare const buildConfiguredTeamRunLaunch: (input: {
    launchProfile: ApplicationConfiguredTeamLaunchProfile | null | undefined;
    workspaceRootPath: string;
    llmModelIdentifier?: string | null;
    runtimeKind?: string | null;
    skillAccessMode?: ApplicationSkillAccessMode | null;
}) => ApplicationTeamRunLaunch;
//# sourceMappingURL=launch-profile.d.ts.map