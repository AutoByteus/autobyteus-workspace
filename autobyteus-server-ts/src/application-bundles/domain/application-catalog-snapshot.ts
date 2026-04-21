import type { ApplicationBundle } from "./models.js";

export type ApplicationCatalogDiagnostic = {
  applicationId: string;
  localApplicationId: string;
  packageId: string;
  packageRootPath: string;
  applicationRootPath: string;
  message: string;
  discoveredAt: string;
};

export type ApplicationCatalogSnapshot = {
  applications: ApplicationBundle[];
  diagnostics: ApplicationCatalogDiagnostic[];
  refreshedAt: string;
};
