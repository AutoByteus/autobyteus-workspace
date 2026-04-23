import type { ApplicationRuntimeResourceKind, ApplicationRuntimeResourceOwner, ApplicationRuntimeResourceRef } from "./runtime-resources.js";
export declare const APPLICATION_MANIFEST_VERSION_V3: "3";
export type ApplicationSupportedLaunchDefaultsDeclaration = {
    llmModelIdentifier?: boolean | null;
    runtimeKind?: boolean | null;
    workspaceRootPath?: boolean | null;
};
export type ApplicationResourceSlotDeclaration = {
    slotKey: string;
    name: string;
    description?: string | null;
    allowedResourceKinds: ApplicationRuntimeResourceKind[];
    allowedResourceOwners?: ApplicationRuntimeResourceOwner[] | null;
    required?: boolean | null;
    supportedLaunchDefaults?: ApplicationSupportedLaunchDefaultsDeclaration | null;
    defaultResourceRef?: ApplicationRuntimeResourceRef | null;
};
export type ApplicationManifestV3 = {
    manifestVersion: typeof APPLICATION_MANIFEST_VERSION_V3;
    id: string;
    name: string;
    description?: string | null;
    icon?: string | null;
    ui: {
        entryHtml: string;
        frontendSdkContractVersion: "2";
    };
    backend: {
        bundleManifest: string;
    };
    resourceSlots?: ApplicationResourceSlotDeclaration[] | null;
};
//# sourceMappingURL=manifests.d.ts.map