export type ApplicationRuntimeResourceKind = "AGENT" | "AGENT_TEAM";
export type ApplicationRuntimeResourceOwner = "bundle" | "shared";
export type ApplicationRuntimeResourceRef = {
    owner: "bundle";
    kind: "AGENT";
    localId: string;
} | {
    owner: "bundle";
    kind: "AGENT_TEAM";
    localId: string;
} | {
    owner: "shared";
    kind: "AGENT";
    definitionId: string;
} | {
    owner: "shared";
    kind: "AGENT_TEAM";
    definitionId: string;
};
export type ApplicationRuntimeResourceSummary = {
    owner: ApplicationRuntimeResourceOwner;
    kind: ApplicationRuntimeResourceKind;
    localId: string | null;
    definitionId: string;
    name: string;
    applicationId: string | null;
};
export type ApplicationConfiguredLaunchDefaults = {
    llmModelIdentifier?: string | null;
    runtimeKind?: string | null;
    workspaceRootPath?: string | null;
    autoExecuteTools?: boolean | null;
};
export type ApplicationConfiguredResource = {
    slotKey: string;
    resourceRef: ApplicationRuntimeResourceRef;
    launchDefaults?: ApplicationConfiguredLaunchDefaults | null;
};
//# sourceMappingURL=runtime-resources.d.ts.map