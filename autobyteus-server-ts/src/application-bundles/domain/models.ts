import type {
  ApplicationBackendBundleManifest,
  ApplicationBackendSupportedExposures,
  ApplicationExecutionResourceSlotDeclaration,
  ApplicationExecutionResourceKind,
  ApplicationAgentToolDeclaration,
} from "@autobyteus/application-sdk-contracts";

export type ApplicationBundleExecutionResource = {
  kind: ApplicationExecutionResourceKind;
  localId: string;
  definitionId: string;
};

export type ApplicationBackendBundle = {
  manifestPath: string;
  manifestRelativePath: string;
  entryModulePath: string;
  entryModuleRelativePath: string;
  moduleFormat: ApplicationBackendBundleManifest["moduleFormat"];
  distribution: ApplicationBackendBundleManifest["distribution"];
  targetRuntime: ApplicationBackendBundleManifest["targetRuntime"];
  sdkCompatibility: ApplicationBackendBundleManifest["sdkCompatibility"];
  supportedExposures: ApplicationBackendSupportedExposures;
  migrationsDirPath: string | null;
  migrationsDirRelativePath: string | null;
  assetsDirPath: string | null;
  assetsDirRelativePath: string | null;
};

export type ApplicationCatalogEntry = {
  id: string;
  localApplicationId: string;
  packageId: string;
  name: string;
  description: string | null;
  iconAssetPath: string | null;
  entryHtmlAssetPath: string;
  bundleResources: ApplicationBundleExecutionResource[];
  executionResourceSlots: ApplicationExecutionResourceSlotDeclaration[];
  agentTools: readonly ApplicationAgentToolDeclaration[];
  writable: boolean;
};

export type ApplicationBundle = ApplicationCatalogEntry & {
  applicationRootPath: string;
  packageRootPath: string;
  localAgentIds: string[];
  localTeamIds: string[];
  entryHtmlRelativePath: string;
  iconRelativePath: string | null;
  backend: ApplicationBackendBundle;
};

export type ApplicationOwnedDefinitionSource = {
  definitionId: string;
  applicationId: string;
  applicationName: string;
  packageId: string;
  localApplicationId: string;
  localDefinitionId: string;
  applicationRootPath: string;
  packageRootPath: string;
  writable: boolean;
};

export type ValidatedApplicationBundle = {
  localApplicationId: string;
  applicationRootPath: string;
  name: string;
  description: string | null;
  iconRelativePath: string | null;
  entryHtmlRelativePath: string;
  executionResourceSlots: ApplicationExecutionResourceSlotDeclaration[];
  agentTools: readonly ApplicationAgentToolDeclaration[];
  localAgentIds: string[];
  localTeamIds: string[];
  writable: boolean;
  backend: ApplicationBackendBundle;
};
