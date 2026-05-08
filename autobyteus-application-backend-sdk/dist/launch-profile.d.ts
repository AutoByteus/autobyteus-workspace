import type { ApplicationAgentRunLaunch, ApplicationConfiguredAgentLaunchProfile, ApplicationConfiguredExecutionResource, ApplicationConfiguredTeamLaunchProfile, ApplicationExecutionResourceRef, ApplicationSkillAccessMode, ApplicationTeamMemberLaunchConfig, ApplicationTeamRunLaunch } from "@autobyteus/application-sdk-contracts";
export declare const APPLICATION_HOST_MANAGED_SKILL_ACCESS_MODE: "PRELOADED_ONLY";
export declare const resolveConfiguredAgentLaunchProfile: (input: {
    configuredResource: ApplicationConfiguredExecutionResource | null | undefined;
    fallbackExecutionResourceRef: ApplicationExecutionResourceRef;
}) => {
    executionResourceRef: ApplicationExecutionResourceRef;
    launchProfile: ApplicationConfiguredAgentLaunchProfile | null;
};
export declare const resolveConfiguredTeamLaunchProfile: (input: {
    configuredResource: ApplicationConfiguredExecutionResource | null | undefined;
    fallbackExecutionResourceRef: ApplicationExecutionResourceRef;
}) => {
    executionResourceRef: ApplicationExecutionResourceRef;
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