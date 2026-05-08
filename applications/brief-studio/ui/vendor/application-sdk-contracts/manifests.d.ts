import type { ApplicationExecutionResourceKind, ApplicationExecutionResourceSource, ApplicationExecutionResourceRef } from "./execution-resources.js";
export declare const APPLICATION_MANIFEST_VERSION_V3: "3";
export type ApplicationSupportedAgentLaunchConfigDeclaration = {
    llmModelIdentifier?: boolean | null;
    runtimeKind?: boolean | null;
    workspaceRootPath?: boolean | null;
};
export type ApplicationSupportedTeamMemberOverrideDeclaration = {
    llmModelIdentifier?: boolean | null;
    runtimeKind?: boolean | null;
};
export type ApplicationSupportedTeamLaunchConfigDeclaration = {
    llmModelIdentifier?: boolean | null;
    runtimeKind?: boolean | null;
    workspaceRootPath?: boolean | null;
    memberOverrides?: ApplicationSupportedTeamMemberOverrideDeclaration | null;
};
export type ApplicationSupportedLaunchConfigDeclaration = {
    AGENT?: ApplicationSupportedAgentLaunchConfigDeclaration | null;
    AGENT_TEAM?: ApplicationSupportedTeamLaunchConfigDeclaration | null;
};
export type ApplicationExecutionResourceSlotDeclaration = {
    slotKey: string;
    name: string;
    description?: string | null;
    allowedExecutionResourceKinds: ApplicationExecutionResourceKind[];
    allowedExecutionResourceSources?: ApplicationExecutionResourceSource[] | null;
    required?: boolean | null;
    supportedLaunchConfig?: ApplicationSupportedLaunchConfigDeclaration | null;
    defaultExecutionResourceRef?: ApplicationExecutionResourceRef | null;
};
export type ApplicationManifestV3 = {
    manifestVersion: typeof APPLICATION_MANIFEST_VERSION_V3;
    id: string;
    name: string;
    description?: string | null;
    icon?: string | null;
    ui: {
        entryHtml: string;
        frontendSdkContractVersion: "3";
    };
    backend: {
        bundleManifest: string;
    };
    executionResourceSlots?: ApplicationExecutionResourceSlotDeclaration[] | null;
};
//# sourceMappingURL=manifests.d.ts.map