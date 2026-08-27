import type { ApplicationAgentRunLaunch, ApplicationEffectiveLaunchConfiguration, ApplicationSkillAccessMode, ApplicationTeamRunLaunch } from "@autobyteus/application-sdk-contracts";
export declare const APPLICATION_HOST_MANAGED_SKILL_ACCESS_MODE: "PRELOADED_ONLY";
export declare const buildEffectiveAgentRunLaunch: (input: {
    configuration: ApplicationEffectiveLaunchConfiguration;
    skillAccessMode?: ApplicationSkillAccessMode | null;
}) => ApplicationAgentRunLaunch;
export declare const buildEffectiveTeamRunLaunch: (input: {
    configuration: ApplicationEffectiveLaunchConfiguration;
    skillAccessMode?: ApplicationSkillAccessMode | null;
}) => ApplicationTeamRunLaunch;
//# sourceMappingURL=launch-profile.d.ts.map