import type {
  ApplicationBackendBundleManifestV1,
  ApplicationBackendSupportedExposures,
  ApplicationResourceSlotDeclaration,
  ApplicationRuntimeResourceKind,
} from "@autobyteus/application-sdk-contracts";

export type ApplicationBundleRuntimeResource = {
  kind: ApplicationRuntimeResourceKind;
  localId: string;
  definitionId: string;
};

export type ApplicationBackendBundle = {
  manifestPath: string;
  manifestRelativePath: string;
  entryModulePath: string;
  entryModuleRelativePath: string;
  moduleFormat: ApplicationBackendBundleManifestV1["moduleFormat"];
  distribution: ApplicationBackendBundleManifestV1["distribution"];
  targetRuntime: ApplicationBackendBundleManifestV1["targetRuntime"];
  sdkCompatibility: ApplicationBackendBundleManifestV1["sdkCompatibility"];
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
  bundleResources: ApplicationBundleRuntimeResource[];
  resourceSlots: ApplicationResourceSlotDeclaration[];
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
  resourceSlots: ApplicationResourceSlotDeclaration[];
  localAgentIds: string[];
  localTeamIds: string[];
  writable: boolean;
  backend: ApplicationBackendBundle;
};
