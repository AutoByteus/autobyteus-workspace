export type ApplicationRuntimeTargetKind = "AGENT" | "AGENT_TEAM";

export type ApplicationRuntimeTarget = {
  kind: ApplicationRuntimeTargetKind;
  localId: string;
  definitionId: string;
};

export type ApplicationCatalogEntry = {
  id: string;
  localApplicationId: string;
  packageId: string;
  name: string;
  description: string | null;
  iconAssetPath: string | null;
  entryHtmlAssetPath: string;
  runtimeTarget: ApplicationRuntimeTarget;
  writable: boolean;
};

export type ApplicationBundle = ApplicationCatalogEntry & {
  applicationRootPath: string;
  packageRootPath: string;
  localAgentIds: string[];
  localTeamIds: string[];
  entryHtmlRelativePath: string;
  iconRelativePath: string | null;
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
  runtimeTarget: {
    kind: ApplicationRuntimeTargetKind;
    localId: string;
  };
  localAgentIds: string[];
  localTeamIds: string[];
  writable: boolean;
};
