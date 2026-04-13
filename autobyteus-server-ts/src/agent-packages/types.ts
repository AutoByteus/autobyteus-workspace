export const AGENT_PACKAGE_IMPORT_SOURCE_KINDS = [
  "LOCAL_PATH",
  "GITHUB_REPOSITORY",
] as const;

export type AgentPackageImportSourceKind =
  (typeof AGENT_PACKAGE_IMPORT_SOURCE_KINDS)[number];

export const AGENT_PACKAGE_SOURCE_KINDS = [
  "BUILT_IN",
  ...AGENT_PACKAGE_IMPORT_SOURCE_KINDS,
] as const;

export type AgentPackageSourceKind =
  (typeof AGENT_PACKAGE_SOURCE_KINDS)[number];

export type AgentPackageImportInput = {
  sourceKind: AgentPackageImportSourceKind;
  source: string;
};

export type AgentPackageSummary = {
  sharedAgentCount: number;
  teamLocalAgentCount: number;
  agentTeamCount: number;
  applicationCount: number;
};

export type AgentPackage = AgentPackageSummary & {
  packageId: string;
  displayName: string;
  path: string;
  sourceKind: AgentPackageSourceKind;
  source: string;
  isDefault: boolean;
  isRemovable: boolean;
  managedInstallPath: string | null;
};

export type AgentPackageRecord = {
  packageId: string;
  rootPath: string;
  sourceKind: AgentPackageImportSourceKind;
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
