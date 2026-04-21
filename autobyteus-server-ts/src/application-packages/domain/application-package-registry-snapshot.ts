import type { ApplicationPackageSourceKind } from "../types.js";

export type ApplicationPackageRegistryEntry = {
  packageId: string;
  displayName: string;
  packageRootPath: string;
  sourceKind: ApplicationPackageSourceKind;
  source: string;
  applicationCount: number;
  isPlatformOwned: boolean;
  isRemovable: boolean;
  managedInstallPath: string | null;
  bundledSourceRootPath: string | null;
};

export type ApplicationPackageRegistryDiagnostic = {
  packageId: string;
  displayName: string;
  packageRootPath: string;
  sourceKind: ApplicationPackageSourceKind;
  message: string;
  discoveredAt: string;
};

export type ApplicationPackageRegistrySnapshot = {
  packages: ApplicationPackageRegistryEntry[];
  diagnostics: ApplicationPackageRegistryDiagnostic[];
  refreshedAt: string;
};
