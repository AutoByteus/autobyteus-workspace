export const APPLICATION_PACKAGE_IMPORT_SOURCE_KINDS = [
  "LOCAL_PATH",
  "GITHUB_REPOSITORY",
] as const;

export type ApplicationPackageImportSourceKind =
  (typeof APPLICATION_PACKAGE_IMPORT_SOURCE_KINDS)[number];

export const APPLICATION_PACKAGE_SOURCE_KINDS = [
  "BUILT_IN",
  ...APPLICATION_PACKAGE_IMPORT_SOURCE_KINDS,
] as const;

export type ApplicationPackageSourceKind =
  (typeof APPLICATION_PACKAGE_SOURCE_KINDS)[number];

export type ApplicationPackageImportInput = {
  sourceKind: ApplicationPackageImportSourceKind;
  source: string;
};

export type ApplicationPackageSummary = {
  applicationCount: number;
};

export type ApplicationPackage = ApplicationPackageSummary & {
  packageId: string;
  displayName: string;
  path: string;
  sourceKind: ApplicationPackageSourceKind;
  source: string;
  isDefault: boolean;
  isRemovable: boolean;
  managedInstallPath: string | null;
};

export type ApplicationPackageRecord = {
  packageId: string;
  rootPath: string;
  sourceKind: ApplicationPackageImportSourceKind;
  source: string;
  normalizedSource: string;
  managedInstallPath: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GitHubRepositorySource = {
  owner: string;
  repo: string;
  normalizedRepository: string;
  canonicalUrl: string;
  installKey: string;
};

export type GitHubRepositoryMetadata = {
  owner: string;
  repo: string;
  canonicalUrl: string;
  defaultBranch: string;
};

export type ManagedGitHubInstallResult = {
  rootPath: string;
  managedInstallPath: string;
  canonicalSourceUrl: string;
};
