import gql from 'graphql-tag';
import * as VueApolloComposable from '@vue/apollo-composable';
import * as VueCompositionApi from '@vue/composition-api';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type ReactiveFunction<TParam> = () => TParam;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: any; output: any; }
  JSON: { input: any; output: any; }
  JSONObject: { input: any; output: any; }
};

export type AgentDefinition = {
  __typename?: 'AgentDefinition';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  category?: Maybe<Scalars['String']['output']>;
  defaultLaunchConfig?: Maybe<DefaultLaunchConfig>;
  description: Scalars['String']['output'];
  id: Scalars['String']['output'];
  inputProcessorNames: Array<Scalars['String']['output']>;
  instructions: Scalars['String']['output'];
  lifecycleProcessorNames: Array<Scalars['String']['output']>;
  llmResponseProcessorNames: Array<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  ownerApplicationId?: Maybe<Scalars['String']['output']>;
  ownerApplicationName?: Maybe<Scalars['String']['output']>;
  ownerLocalApplicationId?: Maybe<Scalars['String']['output']>;
  ownerPackageId?: Maybe<Scalars['String']['output']>;
  ownerTeamId?: Maybe<Scalars['String']['output']>;
  ownerTeamName?: Maybe<Scalars['String']['output']>;
  ownershipScope: AgentDefinitionOwnershipScope;
  role?: Maybe<Scalars['String']['output']>;
  skillNames: Array<Scalars['String']['output']>;
  systemPromptProcessorNames: Array<Scalars['String']['output']>;
  toolExecutionResultProcessorNames: Array<Scalars['String']['output']>;
  toolInvocationPreprocessorNames: Array<Scalars['String']['output']>;
  toolNames: Array<Scalars['String']['output']>;
};

export enum AgentDefinitionOwnershipScope {
  ApplicationOwned = 'APPLICATION_OWNED',
  Shared = 'SHARED',
  TeamLocal = 'TEAM_LOCAL'
}

export enum AgentMemberRefScope {
  ApplicationOwned = 'APPLICATION_OWNED',
  Shared = 'SHARED',
  TeamLocal = 'TEAM_LOCAL'
}

export enum AgentMemoryAttribution {
  Definition = 'DEFINITION',
  Unattributed = 'UNATTRIBUTED'
}

export type AgentMemoryView = {
  __typename?: 'AgentMemoryView';
  episodic?: Maybe<Array<Scalars['JSON']['output']>>;
  rawTraces?: Maybe<Array<MemoryTraceEvent>>;
  runId: Scalars['String']['output'];
  semantic?: Maybe<Array<Scalars['JSON']['output']>>;
  workingContext?: Maybe<Array<MemoryMessage>>;
};

export type AgentPackage = {
  __typename?: 'AgentPackage';
  agentTeamCount: Scalars['Int']['output'];
  applicationCount: Scalars['Int']['output'];
  displayName: Scalars['String']['output'];
  isDefault: Scalars['Boolean']['output'];
  isRemovable: Scalars['Boolean']['output'];
  packageId: Scalars['String']['output'];
  path: Scalars['String']['output'];
  sharedAgentCount: Scalars['Int']['output'];
  source: Scalars['String']['output'];
  sourceKind: AgentPackageSourceKind;
  teamLocalAgentCount: Scalars['Int']['output'];
  updateInfo: AgentPackageUpdateInfo;
};

export enum AgentPackageImportSourceKind {
  GithubRepository = 'GITHUB_REPOSITORY',
  LocalPath = 'LOCAL_PATH'
}

export enum AgentPackageSourceKind {
  BuiltIn = 'BUILT_IN',
  GithubRepository = 'GITHUB_REPOSITORY',
  LocalPath = 'LOCAL_PATH'
}

export type AgentPackageUpdateInfo = {
  __typename?: 'AgentPackageUpdateInfo';
  canCheck: Scalars['Boolean']['output'];
  canReload: Scalars['Boolean']['output'];
  canUpdate: Scalars['Boolean']['output'];
  checkedAt?: Maybe<Scalars['String']['output']>;
  installedRevision?: Maybe<Scalars['String']['output']>;
  lastError?: Maybe<Scalars['String']['output']>;
  latestRevision?: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  status: AgentPackageUpdateStatus;
};

export enum AgentPackageUpdateStatus {
  CheckFailed = 'CHECK_FAILED',
  NotApplicable = 'NOT_APPLICABLE',
  NotChecked = 'NOT_CHECKED',
  ReloadAvailable = 'RELOAD_AVAILABLE',
  Unknown = 'UNKNOWN',
  UpdateAvailable = 'UPDATE_AVAILABLE',
  UpdateFailed = 'UPDATE_FAILED',
  UpToDate = 'UP_TO_DATE'
}

export type AgentRunMemoryPage = {
  __typename?: 'AgentRunMemoryPage';
  entries: Array<AgentRunMemorySummary>;
  page: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  totalPages: Scalars['Int']['output'];
};

export type AgentRunMemorySummary = {
  __typename?: 'AgentRunMemorySummary';
  agentDefinitionId?: Maybe<Scalars['String']['output']>;
  agentName?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['String']['output']>;
  lastUpdatedAt?: Maybe<Scalars['String']['output']>;
  memory: MemoryAvailabilitySummary;
  runId: Scalars['String']['output'];
  summary?: Maybe<Scalars['String']['output']>;
  workspaceRootPath?: Maybe<Scalars['String']['output']>;
};

export type AgentTeamDefinition = {
  __typename?: 'AgentTeamDefinition';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  category?: Maybe<Scalars['String']['output']>;
  coordinatorMemberName: Scalars['String']['output'];
  defaultLaunchConfig?: Maybe<DefaultLaunchConfig>;
  description: Scalars['String']['output'];
  id: Scalars['String']['output'];
  instructions: Scalars['String']['output'];
  name: Scalars['String']['output'];
  nodes: Array<TeamMember>;
  ownerApplicationId?: Maybe<Scalars['String']['output']>;
  ownerApplicationName?: Maybe<Scalars['String']['output']>;
  ownerLocalApplicationId?: Maybe<Scalars['String']['output']>;
  ownerPackageId?: Maybe<Scalars['String']['output']>;
  ownerTeamId?: Maybe<Scalars['String']['output']>;
  ownerTeamName?: Maybe<Scalars['String']['output']>;
  ownershipScope: AgentTeamDefinitionOwnershipScope;
};

export enum AgentTeamDefinitionOwnershipScope {
  ApplicationOwned = 'APPLICATION_OWNED',
  Shared = 'SHARED',
  TeamLocal = 'TEAM_LOCAL'
}

export type AgentTeamRunMemoryPage = {
  __typename?: 'AgentTeamRunMemoryPage';
  entries: Array<AgentTeamRunMemorySummary>;
  page: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  totalPages: Scalars['Int']['output'];
};

export type AgentTeamRunMemorySummary = {
  __typename?: 'AgentTeamRunMemorySummary';
  createdAt?: Maybe<Scalars['String']['output']>;
  lastUpdatedAt?: Maybe<Scalars['String']['output']>;
  memberTargets: Array<TeamMemberMemoryTargetSummary>;
  memory: MemoryAvailabilitySummary;
  summary?: Maybe<Scalars['String']['output']>;
  teamDefinitionId: Scalars['String']['output'];
  teamDefinitionName: Scalars['String']['output'];
  teamRunId: Scalars['String']['output'];
  workspaceRootPath?: Maybe<Scalars['String']['output']>;
};

export type AgentTeamWithMemoryPage = {
  __typename?: 'AgentTeamWithMemoryPage';
  entries: Array<AgentTeamWithMemorySummary>;
  page: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  totalPages: Scalars['Int']['output'];
};

export type AgentTeamWithMemorySummary = {
  __typename?: 'AgentTeamWithMemorySummary';
  latestMemoryAt?: Maybe<Scalars['String']['output']>;
  memberMemoryCount: Scalars['Int']['output'];
  memory: MemoryAvailabilitySummary;
  teamDefinitionId: Scalars['String']['output'];
  teamDefinitionName: Scalars['String']['output'];
  teamRunCount: Scalars['Int']['output'];
};

export type AgentWithMemoryPage = {
  __typename?: 'AgentWithMemoryPage';
  entries: Array<AgentWithMemorySummary>;
  page: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  totalPages: Scalars['Int']['output'];
};

export type AgentWithMemorySelectorInput = {
  agentDefinitionId?: InputMaybe<Scalars['String']['input']>;
  attribution: AgentMemoryAttribution;
};

export type AgentWithMemorySummary = {
  __typename?: 'AgentWithMemorySummary';
  agentDefinitionId?: Maybe<Scalars['String']['output']>;
  attribution: AgentMemoryAttribution;
  displayName: Scalars['String']['output'];
  latestMemoryAt?: Maybe<Scalars['String']['output']>;
  memory: MemoryAvailabilitySummary;
  runCount: Scalars['Int']['output'];
  stableId: Scalars['String']['output'];
};

export type AppDataMigrationMutationResult = {
  __typename?: 'AppDataMigrationMutationResult';
  message: Scalars['String']['output'];
  migration?: Maybe<AppDataMigrationRecordObject>;
  success: Scalars['Boolean']['output'];
};

export type AppDataMigrationRecordObject = {
  __typename?: 'AppDataMigrationRecordObject';
  attempts: Scalars['Float']['output'];
  canRetry: Scalars['Boolean']['output'];
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  description: Scalars['String']['output'];
  displayName: Scalars['String']['output'];
  errorMessage?: Maybe<Scalars['String']['output']>;
  logPath?: Maybe<Scalars['String']['output']>;
  migrationId: Scalars['String']['output'];
  requiredOnStartup: Scalars['Boolean']['output'];
  startedAt?: Maybe<Scalars['DateTime']['output']>;
  status: AppDataMigrationStatus;
  summary?: Maybe<Scalars['JSON']['output']>;
};

export enum AppDataMigrationStatus {
  Failed = 'FAILED',
  NotRun = 'NOT_RUN',
  Running = 'RUNNING',
  Succeeded = 'SUCCEEDED',
  SucceededWithWarnings = 'SUCCEEDED_WITH_WARNINGS'
}

export type Application = {
  __typename?: 'Application';
  bundleResources: Array<ApplicationExecutionResource>;
  description?: Maybe<Scalars['String']['output']>;
  entryHtmlAssetPath: Scalars['String']['output'];
  executionResourceSlots: Array<ApplicationExecutionResourceSlotSummary>;
  iconAssetPath?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  localApplicationId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  packageId: Scalars['String']['output'];
  writable: Scalars['Boolean']['output'];
};

export type ApplicationExecutionResource = {
  __typename?: 'ApplicationExecutionResource';
  definitionId: Scalars['String']['output'];
  kind: ApplicationExecutionResourceKind;
  localId: Scalars['String']['output'];
};

export enum ApplicationExecutionResourceKind {
  Agent = 'AGENT',
  AgentTeam = 'AGENT_TEAM'
}

export type ApplicationExecutionResourceSlotSummary = {
  __typename?: 'ApplicationExecutionResourceSlotSummary';
  required: Scalars['Boolean']['output'];
  slotKey: Scalars['String']['output'];
};

export type ApplicationPackage = {
  __typename?: 'ApplicationPackage';
  applicationCount: Scalars['Int']['output'];
  displayName: Scalars['String']['output'];
  isPlatformOwned: Scalars['Boolean']['output'];
  isRemovable: Scalars['Boolean']['output'];
  packageId: Scalars['String']['output'];
  sourceKind: ApplicationPackageSourceKind;
  sourceSummary?: Maybe<Scalars['String']['output']>;
};

export type ApplicationPackageDetails = {
  __typename?: 'ApplicationPackageDetails';
  applicationCount: Scalars['Int']['output'];
  bundledSourceRootPath?: Maybe<Scalars['String']['output']>;
  displayName: Scalars['String']['output'];
  isPlatformOwned: Scalars['Boolean']['output'];
  isRemovable: Scalars['Boolean']['output'];
  managedInstallPath?: Maybe<Scalars['String']['output']>;
  packageId: Scalars['String']['output'];
  rootPath: Scalars['String']['output'];
  source: Scalars['String']['output'];
  sourceKind: ApplicationPackageSourceKind;
  sourceSummary?: Maybe<Scalars['String']['output']>;
};

export enum ApplicationPackageImportSourceKind {
  GithubRepository = 'GITHUB_REPOSITORY',
  LocalPath = 'LOCAL_PATH'
}

export enum ApplicationPackageSourceKind {
  BuiltIn = 'BUILT_IN',
  GithubRepository = 'GITHUB_REPOSITORY',
  LocalPath = 'LOCAL_PATH'
}

export type ApplicationsCapability = {
  __typename?: 'ApplicationsCapability';
  enabled: Scalars['Boolean']['output'];
  scope: ApplicationsCapabilityScope;
  settingKey: Scalars['String']['output'];
  source: ApplicationsCapabilitySource;
};

export enum ApplicationsCapabilityScope {
  BoundNode = 'BOUND_NODE'
}

export enum ApplicationsCapabilitySource {
  InitializedEmptyCatalog = 'INITIALIZED_EMPTY_CATALOG',
  InitializedFromDiscoveredApplications = 'INITIALIZED_FROM_DISCOVERED_APPLICATIONS',
  ServerSetting = 'SERVER_SETTING'
}

export type ApproveToolInvocationInput = {
  agentRunId: Scalars['String']['input'];
  invocationId: Scalars['String']['input'];
  isApproved: Scalars['Boolean']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
};

export type ApproveToolInvocationResult = {
  __typename?: 'ApproveToolInvocationResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type ArchiveStoredRunMutationResult = {
  __typename?: 'ArchiveStoredRunMutationResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type ArchiveStoredTeamRunMutationResult = {
  __typename?: 'ArchiveStoredTeamRunMutationResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type CancelPreparedAgentRunResult = {
  __typename?: 'CancelPreparedAgentRunResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type ConfigureMcpServerResult = {
  __typename?: 'ConfigureMcpServerResult';
  savedConfig: McpServerConfigUnion;
};

export type CreateAgentDefinitionInput = {
  avatarUrl?: InputMaybe<Scalars['String']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  defaultLaunchConfig?: InputMaybe<DefaultLaunchConfigInput>;
  description: Scalars['String']['input'];
  inputProcessorNames?: InputMaybe<Array<Scalars['String']['input']>>;
  instructions: Scalars['String']['input'];
  lifecycleProcessorNames?: InputMaybe<Array<Scalars['String']['input']>>;
  llmResponseProcessorNames?: InputMaybe<Array<Scalars['String']['input']>>;
  name: Scalars['String']['input'];
  role?: InputMaybe<Scalars['String']['input']>;
  skillNames?: InputMaybe<Array<Scalars['String']['input']>>;
  systemPromptProcessorNames?: InputMaybe<Array<Scalars['String']['input']>>;
  toolExecutionResultProcessorNames?: InputMaybe<Array<Scalars['String']['input']>>;
  toolInvocationPreprocessorNames?: InputMaybe<Array<Scalars['String']['input']>>;
  toolNames?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CreateAgentRunInput = {
  agentDefinitionId: Scalars['String']['input'];
  autoExecuteTools: Scalars['Boolean']['input'];
  initialSummary?: InputMaybe<Scalars['String']['input']>;
  llmConfig?: InputMaybe<Scalars['JSON']['input']>;
  llmModelIdentifier: Scalars['String']['input'];
  runtimeKind: Scalars['String']['input'];
  skillAccessMode: SkillAccessModeEnum;
  workspaceId?: InputMaybe<Scalars['String']['input']>;
  workspaceRootPath: Scalars['String']['input'];
};

export type CreateAgentRunResult = {
  __typename?: 'CreateAgentRunResult';
  message: Scalars['String']['output'];
  runId?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type CreateAgentTeamDefinitionInput = {
  avatarUrl?: InputMaybe<Scalars['String']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  coordinatorMemberName: Scalars['String']['input'];
  defaultLaunchConfig?: InputMaybe<DefaultLaunchConfigInput>;
  description: Scalars['String']['input'];
  instructions: Scalars['String']['input'];
  name: Scalars['String']['input'];
  nodes: Array<TeamMemberInput>;
};

export type CreateAgentTeamRunInput = {
  memberConfigs: Array<TeamMemberConfigInput>;
  teamDefinitionId: Scalars['String']['input'];
};

export type CreateAgentTeamRunResult = {
  __typename?: 'CreateAgentTeamRunResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
  teamRunId?: Maybe<Scalars['String']['output']>;
};

export type CreateSkillInput = {
  content: Scalars['String']['input'];
  description: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type CreateWorkspaceInput = {
  rootPath: Scalars['String']['input'];
};

export type CustomLlmProviderInputObject = {
  apiKey: Scalars['String']['input'];
  baseUrl: Scalars['String']['input'];
  name: Scalars['String']['input'];
  providerType: Scalars['String']['input'];
};

export type CustomLlmProviderProbeModelObject = {
  __typename?: 'CustomLlmProviderProbeModelObject';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type CustomLlmProviderProbeResultObject = {
  __typename?: 'CustomLlmProviderProbeResultObject';
  baseUrl: Scalars['String']['output'];
  discoveredModels: Array<CustomLlmProviderProbeModelObject>;
  name: Scalars['String']['output'];
  providerType: Scalars['String']['output'];
};

export type DefaultLaunchConfig = {
  __typename?: 'DefaultLaunchConfig';
  llmConfig?: Maybe<Scalars['JSON']['output']>;
  llmModelIdentifier?: Maybe<Scalars['String']['output']>;
  runtimeKind?: Maybe<Scalars['String']['output']>;
};

export type DefaultLaunchConfigInput = {
  llmConfig?: InputMaybe<Scalars['JSON']['input']>;
  llmModelIdentifier?: InputMaybe<Scalars['String']['input']>;
  runtimeKind?: InputMaybe<Scalars['String']['input']>;
};

export type DeleteAgentDefinitionResult = {
  __typename?: 'DeleteAgentDefinitionResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type DeleteAgentTeamDefinitionResult = {
  __typename?: 'DeleteAgentTeamDefinitionResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type DeleteMcpServerResult = {
  __typename?: 'DeleteMcpServerResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type DeleteSkillResult = {
  __typename?: 'DeleteSkillResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type DeleteStoredRunMutationResult = {
  __typename?: 'DeleteStoredRunMutationResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type DeleteStoredTeamRunMutationResult = {
  __typename?: 'DeleteStoredTeamRunMutationResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type DiscoverAndRegisterMcpServerToolsResult = {
  __typename?: 'DiscoverAndRegisterMcpServerToolsResult';
  discoveredTools: Array<ToolDefinitionDetail>;
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type ExternalChannelBindingGql = {
  __typename?: 'ExternalChannelBindingGql';
  accountId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  launchPreset?: Maybe<ExternalChannelLaunchPresetGql>;
  peerId: Scalars['String']['output'];
  provider: Scalars['String']['output'];
  targetAgentDefinitionId?: Maybe<Scalars['String']['output']>;
  targetMemberPath?: Maybe<Array<Scalars['String']['output']>>;
  targetMemberRouteKey?: Maybe<Scalars['String']['output']>;
  targetTeamDefinitionId?: Maybe<Scalars['String']['output']>;
  targetType: Scalars['String']['output'];
  teamLaunchPreset?: Maybe<ExternalChannelTeamLaunchPresetGql>;
  teamRunId?: Maybe<Scalars['String']['output']>;
  threadId?: Maybe<Scalars['String']['output']>;
  transport: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type ExternalChannelCapabilities = {
  __typename?: 'ExternalChannelCapabilities';
  acceptedProviderTransportPairs: Array<Scalars['String']['output']>;
  bindingCrudEnabled: Scalars['Boolean']['output'];
  reason?: Maybe<Scalars['String']['output']>;
};

export type ExternalChannelLaunchPresetGql = {
  __typename?: 'ExternalChannelLaunchPresetGql';
  autoExecuteTools: Scalars['Boolean']['output'];
  llmConfig?: Maybe<Scalars['JSONObject']['output']>;
  llmModelIdentifier: Scalars['String']['output'];
  runtimeKind: Scalars['String']['output'];
  skillAccessMode: SkillAccessModeEnum;
  workspaceRootPath: Scalars['String']['output'];
};

export type ExternalChannelLaunchPresetInput = {
  autoExecuteTools?: InputMaybe<Scalars['Boolean']['input']>;
  llmConfig?: InputMaybe<Scalars['JSONObject']['input']>;
  llmModelIdentifier: Scalars['String']['input'];
  runtimeKind?: InputMaybe<Scalars['String']['input']>;
  skillAccessMode: SkillAccessModeEnum;
  workspaceRootPath: Scalars['String']['input'];
};

export type ExternalChannelTeamDefinitionOptionGql = {
  __typename?: 'ExternalChannelTeamDefinitionOptionGql';
  coordinatorMemberName: Scalars['String']['output'];
  description: Scalars['String']['output'];
  memberCount: Scalars['Int']['output'];
  teamDefinitionId: Scalars['String']['output'];
  teamDefinitionName: Scalars['String']['output'];
};

export type ExternalChannelTeamLaunchPresetGql = {
  __typename?: 'ExternalChannelTeamLaunchPresetGql';
  autoExecuteTools: Scalars['Boolean']['output'];
  llmConfig?: Maybe<Scalars['JSONObject']['output']>;
  llmModelIdentifier: Scalars['String']['output'];
  runtimeKind: Scalars['String']['output'];
  skillAccessMode: SkillAccessModeEnum;
  workspaceRootPath: Scalars['String']['output'];
};

export type ExternalChannelTeamLaunchPresetInput = {
  autoExecuteTools?: InputMaybe<Scalars['Boolean']['input']>;
  llmConfig?: InputMaybe<Scalars['JSONObject']['input']>;
  llmModelIdentifier: Scalars['String']['input'];
  runtimeKind?: InputMaybe<Scalars['String']['input']>;
  skillAccessMode: SkillAccessModeEnum;
  workspaceRootPath: Scalars['String']['input'];
};

export type GeminiSetupConfig = {
  __typename?: 'GeminiSetupConfig';
  geminiApiKeyConfigured: Scalars['Boolean']['output'];
  mode: Scalars['String']['output'];
  vertexApiKeyConfigured: Scalars['Boolean']['output'];
  vertexLocation?: Maybe<Scalars['String']['output']>;
  vertexProject?: Maybe<Scalars['String']['output']>;
};

export type GraphqlSelfEvolutionConfigSourceTraceEntry = {
  __typename?: 'GraphqlSelfEvolutionConfigSourceTraceEntry';
  fields: Array<Scalars['String']['output']>;
  source: Scalars['String']['output'];
};

export type GraphqlSelfEvolutionEffectiveConfig = {
  __typename?: 'GraphqlSelfEvolutionEffectiveConfig';
  enabled: Scalars['Boolean']['output'];
  evolverAgentDefinitionId?: Maybe<Scalars['String']['output']>;
  evolverStrategy: Scalars['String']['output'];
  resolvedAt: Scalars['String']['output'];
  sourceTrace: Array<GraphqlSelfEvolutionConfigSourceTraceEntry>;
  triggerStrategy: Scalars['String']['output'];
};

export type GraphqlSelfEvolutionEligibility = {
  __typename?: 'GraphqlSelfEvolutionEligibility';
  effectiveConfig?: Maybe<GraphqlSelfEvolutionEffectiveConfig>;
  eligible: Scalars['Boolean']['output'];
  reasons: Array<Scalars['String']['output']>;
  skillTargets: Array<GraphqlSelfEvolutionSkillTarget>;
  warnings: Array<Scalars['String']['output']>;
};

export type GraphqlSelfEvolutionNotificationSummary = {
  __typename?: 'GraphqlSelfEvolutionNotificationSummary';
  error?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
};

export type GraphqlSelfEvolutionRunRecord = {
  __typename?: 'GraphqlSelfEvolutionRunRecord';
  completedAt?: Maybe<Scalars['String']['output']>;
  effectiveConfig: GraphqlSelfEvolutionEffectiveConfig;
  errors: Array<Scalars['String']['output']>;
  evidenceSummaryHash?: Maybe<Scalars['String']['output']>;
  evolutionRunId: Scalars['String']['output'];
  evolverAgentDefinitionId: Scalars['String']['output'];
  evolverRunId?: Maybe<Scalars['String']['output']>;
  evolverStrategy: Scalars['String']['output'];
  llmModelIdentifier?: Maybe<Scalars['String']['output']>;
  notificationSummary?: Maybe<GraphqlSelfEvolutionNotificationSummary>;
  requestedAt: Scalars['String']['output'];
  runtimeKind?: Maybe<Scalars['String']['output']>;
  skillTargets: Array<GraphqlSelfEvolutionSkillTarget>;
  sourceRunIds: Array<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  target: GraphqlSelfEvolutionTargetRef;
  triggerStrategy: Scalars['String']['output'];
  workspaceRootPath?: Maybe<Scalars['String']['output']>;
};

export type GraphqlSelfEvolutionSkillTarget = {
  __typename?: 'GraphqlSelfEvolutionSkillTarget';
  isWritable: Scalars['Boolean']['output'];
  skillMdPath: Scalars['String']['output'];
  skillName: Scalars['String']['output'];
  skillRootPath: Scalars['String']['output'];
  sourceLabel?: Maybe<Scalars['String']['output']>;
};

export type GraphqlSelfEvolutionStartResult = {
  __typename?: 'GraphqlSelfEvolutionStartResult';
  evolutionRunId: Scalars['String']['output'];
  evolverRunId?: Maybe<Scalars['String']['output']>;
  record: GraphqlSelfEvolutionRunRecord;
};

export type GraphqlSelfEvolutionStrategyCatalog = {
  __typename?: 'GraphqlSelfEvolutionStrategyCatalog';
  defaultEvolverStrategy: Scalars['String']['output'];
  defaultTriggerStrategy: Scalars['String']['output'];
  evolverStrategies: Array<GraphqlSelfEvolutionStrategyDescriptor>;
  triggerStrategies: Array<GraphqlSelfEvolutionStrategyDescriptor>;
};

export type GraphqlSelfEvolutionStrategyDescriptor = {
  __typename?: 'GraphqlSelfEvolutionStrategyDescriptor';
  description: Scalars['String']['output'];
  label: Scalars['String']['output'];
  name: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

export type GraphqlSelfEvolutionTargetRef = {
  __typename?: 'GraphqlSelfEvolutionTargetRef';
  kind: Scalars['String']['output'];
  memberRunId?: Maybe<Scalars['String']['output']>;
  runId?: Maybe<Scalars['String']['output']>;
  teamRunId?: Maybe<Scalars['String']['output']>;
};

export type HealthStatus = {
  __typename?: 'HealthStatus';
  message: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

export type ImportAgentPackageInput = {
  source: Scalars['String']['input'];
  sourceKind: AgentPackageImportSourceKind;
};

export type ImportApplicationPackageInput = {
  source: Scalars['String']['input'];
  sourceKind: ApplicationPackageImportSourceKind;
};

export type ImportMcpServerConfigsResult = {
  __typename?: 'ImportMcpServerConfigsResult';
  failedCount: Scalars['Int']['output'];
  importedCount: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type LlmProviderObject = {
  __typename?: 'LlmProviderObject';
  apiKeyConfigured: Scalars['Boolean']['output'];
  baseUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  isCustom: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  providerType: Scalars['String']['output'];
  status: Scalars['String']['output'];
  statusMessage?: Maybe<Scalars['String']['output']>;
};

export type ManagedMessagingGatewayPeerCandidateListObject = {
  __typename?: 'ManagedMessagingGatewayPeerCandidateListObject';
  accountId?: Maybe<Scalars['String']['output']>;
  items: Array<ManagedMessagingGatewayPeerCandidateObject>;
  updatedAt: Scalars['String']['output'];
};

export type ManagedMessagingGatewayPeerCandidateObject = {
  __typename?: 'ManagedMessagingGatewayPeerCandidateObject';
  displayName?: Maybe<Scalars['String']['output']>;
  lastMessageAt: Scalars['String']['output'];
  peerId: Scalars['String']['output'];
  peerType: Scalars['String']['output'];
  threadId?: Maybe<Scalars['String']['output']>;
};

export type ManagedMessagingGatewayStatusObject = {
  __typename?: 'ManagedMessagingGatewayStatusObject';
  activeVersion?: Maybe<Scalars['String']['output']>;
  bindHost?: Maybe<Scalars['String']['output']>;
  bindPort?: Maybe<Scalars['Int']['output']>;
  desiredVersion?: Maybe<Scalars['String']['output']>;
  diagnostics: Scalars['JSONObject']['output'];
  enabled: Scalars['Boolean']['output'];
  excludedProviders: Array<Scalars['String']['output']>;
  installedVersions: Array<Scalars['String']['output']>;
  lastError?: Maybe<Scalars['String']['output']>;
  lifecycleState: Scalars['String']['output'];
  message?: Maybe<Scalars['String']['output']>;
  pid?: Maybe<Scalars['Int']['output']>;
  providerConfig: Scalars['JSONObject']['output'];
  providerStatusByProvider: Scalars['JSONObject']['output'];
  releaseTag?: Maybe<Scalars['String']['output']>;
  runtimeReliabilityStatus?: Maybe<Scalars['JSONObject']['output']>;
  runtimeRunning: Scalars['Boolean']['output'];
  supported: Scalars['Boolean']['output'];
  supportedProviders: Array<Scalars['String']['output']>;
};

export type ManagedMessagingGatewayWeComAccountObject = {
  __typename?: 'ManagedMessagingGatewayWeComAccountObject';
  accountId: Scalars['String']['output'];
  label: Scalars['String']['output'];
  mode: Scalars['String']['output'];
};

export type McpServerConfigUnion = StdioMcpServerConfig | StreamableHttpMcpServerConfig;

export type McpServerInput = {
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  serverId: Scalars['String']['input'];
  stdioConfig?: InputMaybe<StdioMcpServerConfigInput>;
  streamableHttpConfig?: InputMaybe<StreamableHttpMcpServerConfigInput>;
  toolNamePrefix?: InputMaybe<Scalars['String']['input']>;
  transportType: McpTransportTypeEnum;
};

export enum McpTransportTypeEnum {
  Stdio = 'STDIO',
  StreamableHttp = 'STREAMABLE_HTTP'
}

export type MemoryAvailabilitySummary = {
  __typename?: 'MemoryAvailabilitySummary';
  hasEpisodic: Scalars['Boolean']['output'];
  hasRawArchive: Scalars['Boolean']['output'];
  hasRawTraces: Scalars['Boolean']['output'];
  hasSemantic: Scalars['Boolean']['output'];
  hasWorkingContext: Scalars['Boolean']['output'];
  latestMemoryAt?: Maybe<Scalars['String']['output']>;
};

export type MemoryMessage = {
  __typename?: 'MemoryMessage';
  content?: Maybe<Scalars['String']['output']>;
  reasoning?: Maybe<Scalars['String']['output']>;
  role: Scalars['String']['output'];
  toolPayload?: Maybe<Scalars['JSON']['output']>;
  ts?: Maybe<Scalars['Float']['output']>;
};

export type MemoryTraceEvent = {
  __typename?: 'MemoryTraceEvent';
  content?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  media?: Maybe<Scalars['JSON']['output']>;
  seq: Scalars['Int']['output'];
  sourceEvent?: Maybe<Scalars['String']['output']>;
  toolArgs?: Maybe<Scalars['JSON']['output']>;
  toolCallId?: Maybe<Scalars['String']['output']>;
  toolError?: Maybe<Scalars['String']['output']>;
  toolName?: Maybe<Scalars['String']['output']>;
  toolResult?: Maybe<Scalars['JSON']['output']>;
  traceType: Scalars['String']['output'];
  ts: Scalars['Float']['output'];
  turnId: Scalars['String']['output'];
};

export type ModelDetail = {
  __typename?: 'ModelDetail';
  activeContextTokens?: Maybe<Scalars['Int']['output']>;
  canonicalName: Scalars['String']['output'];
  configSchema?: Maybe<Scalars['JSON']['output']>;
  hostUrl?: Maybe<Scalars['String']['output']>;
  maxContextTokens?: Maybe<Scalars['Int']['output']>;
  maxInputTokens?: Maybe<Scalars['Int']['output']>;
  maxOutputTokens?: Maybe<Scalars['Int']['output']>;
  modelIdentifier: Scalars['String']['output'];
  name: Scalars['String']['output'];
  providerId: Scalars['String']['output'];
  providerName: Scalars['String']['output'];
  providerType: Scalars['String']['output'];
  runtime: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  addSkillSource: Array<SkillSource>;
  approveToolInvocation: ApproveToolInvocationResult;
  archiveStoredRun: ArchiveStoredRunMutationResult;
  archiveStoredTeamRun: ArchiveStoredTeamRunMutationResult;
  cancelPreparedAgentRun: CancelPreparedAgentRunResult;
  checkAgentPackageUpdates: Array<AgentPackage>;
  configureMcpServer: ConfigureMcpServerResult;
  createAgentDefinition: AgentDefinition;
  createAgentRun: CreateAgentRunResult;
  createAgentTeamDefinition: AgentTeamDefinition;
  createAgentTeamRun: CreateAgentTeamRunResult;
  createCustomLlmProvider: LlmProviderObject;
  createFileOrFolder: Scalars['String']['output'];
  createSkill: Skill;
  createWorkspace: WorkspaceMetadata;
  deleteAgentDefinition: DeleteAgentDefinitionResult;
  deleteAgentTeamDefinition: DeleteAgentTeamDefinitionResult;
  deleteCustomLlmProvider: Scalars['String']['output'];
  deleteExternalChannelBinding: Scalars['Boolean']['output'];
  deleteFileOrFolder: Scalars['String']['output'];
  deleteMcpServer: DeleteMcpServerResult;
  deleteServerSetting: Scalars['String']['output'];
  deleteSkill: DeleteSkillResult;
  deleteSkillFile: Scalars['Boolean']['output'];
  deleteStoredRun: DeleteStoredRunMutationResult;
  deleteStoredTeamRun: DeleteStoredTeamRunMutationResult;
  disableManagedMessagingGateway: ManagedMessagingGatewayStatusObject;
  disableSkill: Skill;
  discoverAndRegisterMcpServerTools: DiscoverAndRegisterMcpServerToolsResult;
  enableManagedMessagingGateway: ManagedMessagingGatewayStatusObject;
  enableSkill: Skill;
  importAgentPackage: Array<AgentPackage>;
  importApplicationPackage: Array<ApplicationPackage>;
  importMcpServerConfigs: ImportMcpServerConfigsResult;
  moveFileOrFolder: Scalars['String']['output'];
  prepareAgentRun: PrepareAgentRunResult;
  probeCustomLlmProvider: CustomLlmProviderProbeResultObject;
  refreshAgentDefinitionCatalog: Scalars['Boolean']['output'];
  refreshAgentTeamDefinitionCatalog: Scalars['Boolean']['output'];
  reloadAgentPackage: Array<AgentPackage>;
  reloadLlmModels: Scalars['String']['output'];
  reloadLlmProviderModels: Scalars['String']['output'];
  reloadSkillCatalog: SkillCatalogReloadResult;
  reloadToolSchema: ReloadToolSchemaResult;
  removeAgentPackage: Array<AgentPackage>;
  removeApplicationPackage: Array<ApplicationPackage>;
  removeSkillSource: Array<SkillSource>;
  renameFileOrFolder: Scalars['String']['output'];
  restoreAgentRun: RestoreAgentRunResult;
  restoreAgentTeamRun: RestoreAgentTeamRunResult;
  runAppDataMigration: AppDataMigrationMutationResult;
  saveManagedMessagingGatewayProviderConfig: ManagedMessagingGatewayStatusObject;
  setApplicationsEnabled: ApplicationsCapability;
  setGeminiSetupConfig: Scalars['String']['output'];
  setLlmProviderApiKey: Scalars['String']['output'];
  setSearchConfig: Scalars['String']['output'];
  setSelfEvolutionEnabled: SelfEvolutionCapability;
  startAgentRunSelfEvolution: GraphqlSelfEvolutionStartResult;
  startTeamMemberSelfEvolution: GraphqlSelfEvolutionStartResult;
  terminateAgentRun: TerminateAgentRunResult;
  terminateAgentTeamRun: TerminateAgentTeamRunResult;
  updateAgentDefinition: AgentDefinition;
  updateAgentPackage: Array<AgentPackage>;
  updateAgentTeamDefinition: AgentTeamDefinition;
  updateManagedMessagingGateway: ManagedMessagingGatewayStatusObject;
  updateServerSetting: Scalars['String']['output'];
  updateSkill: Skill;
  uploadSkillFile: Scalars['Boolean']['output'];
  upsertExternalChannelBinding: ExternalChannelBindingGql;
  writeFileContent: Scalars['String']['output'];
};


export type MutationAddSkillSourceArgs = {
  path: Scalars['String']['input'];
};


export type MutationApproveToolInvocationArgs = {
  input: ApproveToolInvocationInput;
};


export type MutationArchiveStoredRunArgs = {
  runId: Scalars['String']['input'];
};


export type MutationArchiveStoredTeamRunArgs = {
  teamRunId: Scalars['String']['input'];
};


export type MutationCancelPreparedAgentRunArgs = {
  agentRunId: Scalars['String']['input'];
};


export type MutationCheckAgentPackageUpdatesArgs = {
  packageIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationConfigureMcpServerArgs = {
  input: McpServerInput;
};


export type MutationCreateAgentDefinitionArgs = {
  input: CreateAgentDefinitionInput;
};


export type MutationCreateAgentRunArgs = {
  input: CreateAgentRunInput;
};


export type MutationCreateAgentTeamDefinitionArgs = {
  input: CreateAgentTeamDefinitionInput;
};


export type MutationCreateAgentTeamRunArgs = {
  input: CreateAgentTeamRunInput;
};


export type MutationCreateCustomLlmProviderArgs = {
  input: CustomLlmProviderInputObject;
  runtimeKind?: InputMaybe<Scalars['String']['input']>;
};


export type MutationCreateFileOrFolderArgs = {
  isFile: Scalars['Boolean']['input'];
  path: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};


export type MutationCreateSkillArgs = {
  input: CreateSkillInput;
};


export type MutationCreateWorkspaceArgs = {
  input: CreateWorkspaceInput;
};


export type MutationDeleteAgentDefinitionArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteAgentTeamDefinitionArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteCustomLlmProviderArgs = {
  providerId: Scalars['String']['input'];
  runtimeKind?: InputMaybe<Scalars['String']['input']>;
};


export type MutationDeleteExternalChannelBindingArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteFileOrFolderArgs = {
  path: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};


export type MutationDeleteMcpServerArgs = {
  serverId: Scalars['String']['input'];
};


export type MutationDeleteServerSettingArgs = {
  key: Scalars['String']['input'];
};


export type MutationDeleteSkillArgs = {
  name: Scalars['String']['input'];
};


export type MutationDeleteSkillFileArgs = {
  path: Scalars['String']['input'];
  skillName: Scalars['String']['input'];
};


export type MutationDeleteStoredRunArgs = {
  runId: Scalars['String']['input'];
};


export type MutationDeleteStoredTeamRunArgs = {
  teamRunId: Scalars['String']['input'];
};


export type MutationDisableSkillArgs = {
  name: Scalars['String']['input'];
};


export type MutationDiscoverAndRegisterMcpServerToolsArgs = {
  serverId: Scalars['String']['input'];
};


export type MutationEnableSkillArgs = {
  name: Scalars['String']['input'];
};


export type MutationImportAgentPackageArgs = {
  input: ImportAgentPackageInput;
};


export type MutationImportApplicationPackageArgs = {
  input: ImportApplicationPackageInput;
};


export type MutationImportMcpServerConfigsArgs = {
  jsonString: Scalars['String']['input'];
};


export type MutationMoveFileOrFolderArgs = {
  destinationPath: Scalars['String']['input'];
  sourcePath: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};


export type MutationPrepareAgentRunArgs = {
  input: CreateAgentRunInput;
};


export type MutationProbeCustomLlmProviderArgs = {
  input: CustomLlmProviderInputObject;
};


export type MutationReloadAgentPackageArgs = {
  packageId: Scalars['String']['input'];
};


export type MutationReloadLlmModelsArgs = {
  runtimeKind?: InputMaybe<Scalars['String']['input']>;
};


export type MutationReloadLlmProviderModelsArgs = {
  providerId: Scalars['String']['input'];
  runtimeKind?: InputMaybe<Scalars['String']['input']>;
};


export type MutationReloadToolSchemaArgs = {
  name: Scalars['String']['input'];
};


export type MutationRemoveAgentPackageArgs = {
  packageId: Scalars['String']['input'];
};


export type MutationRemoveApplicationPackageArgs = {
  packageId: Scalars['String']['input'];
};


export type MutationRemoveSkillSourceArgs = {
  path: Scalars['String']['input'];
};


export type MutationRenameFileOrFolderArgs = {
  newName: Scalars['String']['input'];
  targetPath: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};


export type MutationRestoreAgentRunArgs = {
  agentRunId: Scalars['String']['input'];
};


export type MutationRestoreAgentTeamRunArgs = {
  teamRunId: Scalars['String']['input'];
};


export type MutationRunAppDataMigrationArgs = {
  migrationId: Scalars['String']['input'];
};


export type MutationSaveManagedMessagingGatewayProviderConfigArgs = {
  input: Scalars['JSONObject']['input'];
};


export type MutationSetApplicationsEnabledArgs = {
  enabled: Scalars['Boolean']['input'];
};


export type MutationSetGeminiSetupConfigArgs = {
  geminiApiKey?: InputMaybe<Scalars['String']['input']>;
  mode: Scalars['String']['input'];
  vertexApiKey?: InputMaybe<Scalars['String']['input']>;
  vertexLocation?: InputMaybe<Scalars['String']['input']>;
  vertexProject?: InputMaybe<Scalars['String']['input']>;
};


export type MutationSetLlmProviderApiKeyArgs = {
  apiKey: Scalars['String']['input'];
  providerId: Scalars['String']['input'];
};


export type MutationSetSearchConfigArgs = {
  googleCseApiKey?: InputMaybe<Scalars['String']['input']>;
  googleCseId?: InputMaybe<Scalars['String']['input']>;
  provider: Scalars['String']['input'];
  serpapiApiKey?: InputMaybe<Scalars['String']['input']>;
  serperApiKey?: InputMaybe<Scalars['String']['input']>;
  vertexAiSearchApiKey?: InputMaybe<Scalars['String']['input']>;
  vertexAiSearchServingConfig?: InputMaybe<Scalars['String']['input']>;
};


export type MutationSetSelfEvolutionEnabledArgs = {
  enabled: Scalars['Boolean']['input'];
};


export type MutationStartAgentRunSelfEvolutionArgs = {
  input: StartAgentRunSelfEvolutionInput;
};


export type MutationStartTeamMemberSelfEvolutionArgs = {
  input: StartTeamMemberSelfEvolutionInput;
};


export type MutationTerminateAgentRunArgs = {
  agentRunId: Scalars['String']['input'];
};


export type MutationTerminateAgentTeamRunArgs = {
  teamRunId: Scalars['String']['input'];
};


export type MutationUpdateAgentDefinitionArgs = {
  input: UpdateAgentDefinitionInput;
};


export type MutationUpdateAgentPackageArgs = {
  packageId: Scalars['String']['input'];
};


export type MutationUpdateAgentTeamDefinitionArgs = {
  input: UpdateAgentTeamDefinitionInput;
};


export type MutationUpdateServerSettingArgs = {
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
};


export type MutationUpdateSkillArgs = {
  input: UpdateSkillInput;
};


export type MutationUploadSkillFileArgs = {
  content: Scalars['String']['input'];
  path: Scalars['String']['input'];
  skillName: Scalars['String']['input'];
};


export type MutationUpsertExternalChannelBindingArgs = {
  input: UpsertExternalChannelBindingInput;
};


export type MutationWriteFileContentArgs = {
  content: Scalars['String']['input'];
  filePath: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};

export type PrepareAgentRunResult = {
  __typename?: 'PrepareAgentRunResult';
  activationState?: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  preparedExpiresAt?: Maybe<Scalars['String']['output']>;
  runId?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type ProviderWithModels = {
  __typename?: 'ProviderWithModels';
  models: Array<ModelDetail>;
  provider: LlmProviderObject;
};

export type Query = {
  __typename?: 'Query';
  agentDefinition?: Maybe<AgentDefinition>;
  agentDefinitions: Array<AgentDefinition>;
  agentPackages: Array<AgentPackage>;
  agentTeamDefinition?: Maybe<AgentTeamDefinition>;
  agentTeamDefinitions: Array<AgentTeamDefinition>;
  agentTeamTemplates: Array<AgentTeamDefinition>;
  agentTemplates: Array<AgentDefinition>;
  application?: Maybe<Application>;
  applicationPackageDetails?: Maybe<ApplicationPackageDetails>;
  applicationPackages: Array<ApplicationPackage>;
  applicationsCapability: ApplicationsCapability;
  availableAudioProvidersWithModels: Array<ProviderWithModels>;
  availableImageProvidersWithModels: Array<ProviderWithModels>;
  availableLlmProvidersWithModels: Array<ProviderWithModels>;
  availableOptionalInputProcessorNames: Array<Scalars['String']['output']>;
  availableOptionalLifecycleProcessorNames: Array<Scalars['String']['output']>;
  availableOptionalLlmResponseProcessorNames: Array<Scalars['String']['output']>;
  availableOptionalSystemPromptProcessorNames: Array<Scalars['String']['output']>;
  availableOptionalToolExecutionResultProcessorNames: Array<Scalars['String']['output']>;
  availableOptionalToolInvocationPreprocessorNames: Array<Scalars['String']['output']>;
  availableToolNames: Array<Scalars['String']['output']>;
  externalChannelBindings: Array<ExternalChannelBindingGql>;
  externalChannelCapabilities: ExternalChannelCapabilities;
  externalChannelTeamDefinitionOptions: Array<ExternalChannelTeamDefinitionOptionGql>;
  fileContent: Scalars['String']['output'];
  folderChildren: Scalars['String']['output'];
  getAgentRunMemoryView: AgentMemoryView;
  getAgentRunResumeConfig: RunResumeConfigPayload;
  getAgentRunSelfEvolutionEligibility: GraphqlSelfEvolutionEligibility;
  getAppDataMigrations: Array<AppDataMigrationRecordObject>;
  getGeminiSetupConfig: GeminiSetupConfig;
  getLlmProviderApiKeyConfigured: Scalars['Boolean']['output'];
  getRunFileChanges: Array<RunFileChangeEntryObject>;
  getRunProjection: RunProjectionPayload;
  getSearchConfig: SearchConfig;
  getSelfEvolutionRunRecord?: Maybe<GraphqlSelfEvolutionRunRecord>;
  getServerSettings: Array<ServerSetting>;
  getTeamCommunicationMessages: Array<TeamCommunicationMessageObject>;
  getTeamMemberRunMemoryView: AgentMemoryView;
  getTeamMemberRunProjection: TeamMemberRunProjectionPayload;
  getTeamMemberSelfEvolutionEligibility: GraphqlSelfEvolutionEligibility;
  getTeamRunResumeConfig: TeamRunResumeConfigPayload;
  health: HealthStatus;
  listAgentRunsWithMemory: AgentRunMemoryPage;
  listAgentTeamRunsWithMemory: AgentTeamRunMemoryPage;
  listAgentTeamsWithMemory: AgentTeamWithMemoryPage;
  listAgentsWithMemory: AgentWithMemoryPage;
  listApplications: Array<Application>;
  listWorkspaceRunHistory: Array<WorkspaceRunHistoryGroupObject>;
  managedMessagingGatewayPeerCandidates: ManagedMessagingGatewayPeerCandidateListObject;
  managedMessagingGatewayStatus: ManagedMessagingGatewayStatusObject;
  managedMessagingGatewayWeComAccounts: Array<ManagedMessagingGatewayWeComAccountObject>;
  mcpServers: Array<McpServerConfigUnion>;
  previewMcpServerTools: Array<ToolDefinitionDetail>;
  runtimeAvailabilities: Array<RuntimeAvailabilityObject>;
  searchFiles: Array<Scalars['String']['output']>;
  selfEvolutionCapability: SelfEvolutionCapability;
  selfEvolutionStrategyCatalog: GraphqlSelfEvolutionStrategyCatalog;
  skill?: Maybe<Skill>;
  skillFileContent?: Maybe<Scalars['String']['output']>;
  skillFileTree?: Maybe<Scalars['String']['output']>;
  skillSources: Array<SkillSource>;
  skills: Array<Skill>;
  tools: Array<ToolDefinitionDetail>;
  toolsGroupedByCategory: Array<ToolCategoryGroup>;
  totalCostInPeriod: Scalars['Float']['output'];
  usageStatisticsInPeriod: Array<UsageStatistics>;
  workspaceMetadata: WorkspaceMetadata;
  workspaces: Array<WorkspaceMetadata>;
};


export type QueryAgentDefinitionArgs = {
  id: Scalars['String']['input'];
};


export type QueryAgentTeamDefinitionArgs = {
  id: Scalars['String']['input'];
};


export type QueryApplicationArgs = {
  id: Scalars['String']['input'];
};


export type QueryApplicationPackageDetailsArgs = {
  packageId: Scalars['String']['input'];
};


export type QueryAvailableAudioProvidersWithModelsArgs = {
  runtimeKind?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAvailableImageProvidersWithModelsArgs = {
  runtimeKind?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAvailableLlmProvidersWithModelsArgs = {
  runtimeKind?: InputMaybe<Scalars['String']['input']>;
};


export type QueryFileContentArgs = {
  filePath: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};


export type QueryFolderChildrenArgs = {
  folderPath: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};


export type QueryGetAgentRunMemoryViewArgs = {
  includeArchive?: Scalars['Boolean']['input'];
  includeEpisodic?: Scalars['Boolean']['input'];
  includeRawTraces?: Scalars['Boolean']['input'];
  includeSemantic?: Scalars['Boolean']['input'];
  includeWorkingContext?: Scalars['Boolean']['input'];
  rawTraceLimit?: InputMaybe<Scalars['Int']['input']>;
  runId: Scalars['String']['input'];
};


export type QueryGetAgentRunResumeConfigArgs = {
  runId: Scalars['String']['input'];
};


export type QueryGetAgentRunSelfEvolutionEligibilityArgs = {
  runId: Scalars['String']['input'];
};


export type QueryGetLlmProviderApiKeyConfiguredArgs = {
  providerId: Scalars['String']['input'];
};


export type QueryGetRunFileChangesArgs = {
  runId: Scalars['String']['input'];
};


export type QueryGetRunProjectionArgs = {
  runId: Scalars['String']['input'];
};


export type QueryGetSelfEvolutionRunRecordArgs = {
  evolutionRunId: Scalars['String']['input'];
};


export type QueryGetTeamCommunicationMessagesArgs = {
  teamRunId: Scalars['String']['input'];
};


export type QueryGetTeamMemberRunMemoryViewArgs = {
  includeArchive?: Scalars['Boolean']['input'];
  includeEpisodic?: Scalars['Boolean']['input'];
  includeRawTraces?: Scalars['Boolean']['input'];
  includeSemantic?: Scalars['Boolean']['input'];
  includeWorkingContext?: Scalars['Boolean']['input'];
  memberRunId: Scalars['String']['input'];
  rawTraceLimit?: InputMaybe<Scalars['Int']['input']>;
  teamRunId: Scalars['String']['input'];
};


export type QueryGetTeamMemberRunProjectionArgs = {
  memberRouteKey: Scalars['String']['input'];
  teamRunId: Scalars['String']['input'];
};


export type QueryGetTeamMemberSelfEvolutionEligibilityArgs = {
  memberRunId: Scalars['String']['input'];
  teamRunId: Scalars['String']['input'];
};


export type QueryGetTeamRunResumeConfigArgs = {
  teamRunId: Scalars['String']['input'];
};


export type QueryListAgentRunsWithMemoryArgs = {
  page?: Scalars['Int']['input'];
  pageSize?: Scalars['Int']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  selector: AgentWithMemorySelectorInput;
};


export type QueryListAgentTeamRunsWithMemoryArgs = {
  page?: Scalars['Int']['input'];
  pageSize?: Scalars['Int']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  teamDefinitionId: Scalars['String']['input'];
};


export type QueryListAgentTeamsWithMemoryArgs = {
  page?: Scalars['Int']['input'];
  pageSize?: Scalars['Int']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryListAgentsWithMemoryArgs = {
  page?: Scalars['Int']['input'];
  pageSize?: Scalars['Int']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryListWorkspaceRunHistoryArgs = {
  limitPerAgent?: Scalars['Int']['input'];
};


export type QueryManagedMessagingGatewayPeerCandidatesArgs = {
  includeGroups?: Scalars['Boolean']['input'];
  limit?: Scalars['Int']['input'];
  provider: Scalars['String']['input'];
};


export type QueryPreviewMcpServerToolsArgs = {
  input: McpServerInput;
};


export type QuerySearchFilesArgs = {
  query: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};


export type QuerySkillArgs = {
  name: Scalars['String']['input'];
};


export type QuerySkillFileContentArgs = {
  path: Scalars['String']['input'];
  skillName: Scalars['String']['input'];
};


export type QuerySkillFileTreeArgs = {
  name: Scalars['String']['input'];
};


export type QueryToolsArgs = {
  origin?: InputMaybe<ToolOriginEnum>;
  sourceServerId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryToolsGroupedByCategoryArgs = {
  origin: ToolOriginEnum;
};


export type QueryTotalCostInPeriodArgs = {
  endTime: Scalars['DateTime']['input'];
  startTime: Scalars['DateTime']['input'];
};


export type QueryUsageStatisticsInPeriodArgs = {
  endTime: Scalars['DateTime']['input'];
  startTime: Scalars['DateTime']['input'];
};


export type QueryWorkspaceMetadataArgs = {
  rootPath: Scalars['String']['input'];
};

export type ReloadToolSchemaResult = {
  __typename?: 'ReloadToolSchemaResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
  tool?: Maybe<ToolDefinitionDetail>;
};

export type RestoreAgentRunResult = {
  __typename?: 'RestoreAgentRunResult';
  message: Scalars['String']['output'];
  runId?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type RestoreAgentTeamRunResult = {
  __typename?: 'RestoreAgentTeamRunResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
  teamRunId?: Maybe<Scalars['String']['output']>;
};

export type RunEditableFieldFlagsObject = {
  __typename?: 'RunEditableFieldFlagsObject';
  autoExecuteTools: Scalars['Boolean']['output'];
  llmConfig: Scalars['Boolean']['output'];
  llmModelIdentifier: Scalars['Boolean']['output'];
  runtimeKind: Scalars['Boolean']['output'];
  skillAccessMode: Scalars['Boolean']['output'];
  workspaceRootPath: Scalars['Boolean']['output'];
};

export type RunFileChangeEntryObject = {
  __typename?: 'RunFileChangeEntryObject';
  content?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  id: Scalars['String']['output'];
  path: Scalars['String']['output'];
  runId: Scalars['String']['output'];
  sourceInvocationId?: Maybe<Scalars['String']['output']>;
  sourceTool: Scalars['String']['output'];
  status: Scalars['String']['output'];
  type: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type RunHistoryAgentGroupObject = {
  __typename?: 'RunHistoryAgentGroupObject';
  agentDefinitionId: Scalars['String']['output'];
  agentName: Scalars['String']['output'];
  runs: Array<RunHistoryItemObject>;
};

export type RunHistoryItemObject = {
  __typename?: 'RunHistoryItemObject';
  archivedAt?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  isActive: Scalars['Boolean']['output'];
  runId: Scalars['String']['output'];
  shouldConnectStream: Scalars['Boolean']['output'];
  status: Scalars['String']['output'];
  statusSource: Scalars['String']['output'];
  summary: Scalars['String']['output'];
  terminatedAt?: Maybe<Scalars['String']['output']>;
};

export type RunMetadataConfigObject = {
  __typename?: 'RunMetadataConfigObject';
  agentDefinitionId: Scalars['String']['output'];
  autoExecuteTools: Scalars['Boolean']['output'];
  llmConfig?: Maybe<Scalars['JSON']['output']>;
  llmModelIdentifier: Scalars['String']['output'];
  runtimeKind: Scalars['String']['output'];
  runtimeReference: RunRuntimeReferenceObject;
  skillAccessMode?: Maybe<SkillAccessModeEnum>;
  workspaceRootPath: Scalars['String']['output'];
};

export type RunProjectionPayload = {
  __typename?: 'RunProjectionPayload';
  activities: Array<Scalars['JSON']['output']>;
  conversation: Array<Scalars['JSON']['output']>;
  lastActivityAt?: Maybe<Scalars['String']['output']>;
  runId: Scalars['String']['output'];
  summary?: Maybe<Scalars['String']['output']>;
};

export type RunResumeConfigPayload = {
  __typename?: 'RunResumeConfigPayload';
  editableFields: RunEditableFieldFlagsObject;
  isActive: Scalars['Boolean']['output'];
  metadataConfig: RunMetadataConfigObject;
  runId: Scalars['String']['output'];
};

export type RunRuntimeReferenceObject = {
  __typename?: 'RunRuntimeReferenceObject';
  metadata?: Maybe<Scalars['JSON']['output']>;
  runtimeKind: Scalars['String']['output'];
  sessionId?: Maybe<Scalars['String']['output']>;
  threadId?: Maybe<Scalars['String']['output']>;
};

export type RuntimeAvailabilityObject = {
  __typename?: 'RuntimeAvailabilityObject';
  enabled: Scalars['Boolean']['output'];
  reason?: Maybe<Scalars['String']['output']>;
  runtimeKind: Scalars['String']['output'];
};

export type SearchConfig = {
  __typename?: 'SearchConfig';
  googleCseApiKeyConfigured: Scalars['Boolean']['output'];
  googleCseId?: Maybe<Scalars['String']['output']>;
  provider: Scalars['String']['output'];
  serpapiApiKeyConfigured: Scalars['Boolean']['output'];
  serperApiKeyConfigured: Scalars['Boolean']['output'];
  vertexAiSearchApiKeyConfigured: Scalars['Boolean']['output'];
  vertexAiSearchServingConfig?: Maybe<Scalars['String']['output']>;
};

export type SelfEvolutionCapability = {
  __typename?: 'SelfEvolutionCapability';
  enabled: Scalars['Boolean']['output'];
  settingKey: Scalars['String']['output'];
  source: Scalars['String']['output'];
};

export type ServerSetting = {
  __typename?: 'ServerSetting';
  description: Scalars['String']['output'];
  isDeletable: Scalars['Boolean']['output'];
  isEditable: Scalars['Boolean']['output'];
  key: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type Skill = {
  __typename?: 'Skill';
  content: Scalars['String']['output'];
  createdAt?: Maybe<Scalars['String']['output']>;
  description: Scalars['String']['output'];
  fileCount: Scalars['Int']['output'];
  isDisabled: Scalars['Boolean']['output'];
  isReadonly: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  rootPath: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['String']['output']>;
};

export enum SkillAccessModeEnum {
  GlobalDiscovery = 'GLOBAL_DISCOVERY',
  None = 'NONE',
  PreloadedOnly = 'PRELOADED_ONLY'
}

export type SkillCatalogReloadResult = {
  __typename?: 'SkillCatalogReloadResult';
  skillSources: Array<SkillSource>;
  skills: Array<Skill>;
};

export type SkillSource = {
  __typename?: 'SkillSource';
  isDefault: Scalars['Boolean']['output'];
  path: Scalars['String']['output'];
  skillCount: Scalars['Int']['output'];
};

export type StartAgentRunSelfEvolutionInput = {
  runId: Scalars['String']['input'];
};

export type StartTeamMemberSelfEvolutionInput = {
  memberRunId: Scalars['String']['input'];
  teamRunId: Scalars['String']['input'];
};

export type StdioMcpServerConfig = {
  __typename?: 'StdioMcpServerConfig';
  args?: Maybe<Array<Scalars['String']['output']>>;
  command: Scalars['String']['output'];
  cwd?: Maybe<Scalars['String']['output']>;
  enabled: Scalars['Boolean']['output'];
  env?: Maybe<Scalars['JSON']['output']>;
  serverId: Scalars['String']['output'];
  toolNamePrefix?: Maybe<Scalars['String']['output']>;
  transportType: McpTransportTypeEnum;
};

export type StdioMcpServerConfigInput = {
  args?: InputMaybe<Array<Scalars['String']['input']>>;
  command: Scalars['String']['input'];
  cwd?: InputMaybe<Scalars['String']['input']>;
  env?: InputMaybe<Scalars['JSON']['input']>;
};

export type StreamableHttpMcpServerConfig = {
  __typename?: 'StreamableHttpMcpServerConfig';
  enabled: Scalars['Boolean']['output'];
  headers?: Maybe<Scalars['JSON']['output']>;
  serverId: Scalars['String']['output'];
  token?: Maybe<Scalars['String']['output']>;
  toolNamePrefix?: Maybe<Scalars['String']['output']>;
  transportType: McpTransportTypeEnum;
  url: Scalars['String']['output'];
};

export type StreamableHttpMcpServerConfigInput = {
  headers?: InputMaybe<Scalars['JSON']['input']>;
  token?: InputMaybe<Scalars['String']['input']>;
  url: Scalars['String']['input'];
};

export type TeamCommunicationMemberAddressObject = {
  __typename?: 'TeamCommunicationMemberAddressObject';
  memberPath: Array<Scalars['String']['output']>;
  memberRouteKey: Scalars['String']['output'];
  teamRunId: Scalars['String']['output'];
};

export type TeamCommunicationMessageObject = {
  __typename?: 'TeamCommunicationMessageObject';
  content: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  messageId: Scalars['String']['output'];
  messageType: Scalars['String']['output'];
  receiverMemberKind?: Maybe<Scalars['String']['output']>;
  receiverMemberName?: Maybe<Scalars['String']['output']>;
  receiverMemberPath?: Maybe<Array<Scalars['String']['output']>>;
  receiverMemberRouteKey?: Maybe<Scalars['String']['output']>;
  receiverRepresentedSubTeam?: Maybe<TeamCommunicationRepresentedSubTeamObject>;
  receiverRunId: Scalars['String']['output'];
  referenceFiles: Array<TeamCommunicationReferenceFileObject>;
  senderMemberKind?: Maybe<Scalars['String']['output']>;
  senderMemberName?: Maybe<Scalars['String']['output']>;
  senderMemberPath?: Maybe<Array<Scalars['String']['output']>>;
  senderMemberRouteKey?: Maybe<Scalars['String']['output']>;
  senderRepresentedSubTeam?: Maybe<TeamCommunicationRepresentedSubTeamObject>;
  senderRunId: Scalars['String']['output'];
  teamRunId: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type TeamCommunicationReferenceFileObject = {
  __typename?: 'TeamCommunicationReferenceFileObject';
  createdAt: Scalars['String']['output'];
  path: Scalars['String']['output'];
  referenceId: Scalars['String']['output'];
  type: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type TeamCommunicationRepresentedSubTeamObject = {
  __typename?: 'TeamCommunicationRepresentedSubTeamObject';
  address: TeamCommunicationMemberAddressObject;
  childTeamRunId?: Maybe<Scalars['String']['output']>;
  memberKind: Scalars['String']['output'];
  memberName: Scalars['String']['output'];
  memberPath: Array<Scalars['String']['output']>;
  memberRouteKey: Scalars['String']['output'];
  memberRunId: Scalars['String']['output'];
  teamDefinitionId: Scalars['String']['output'];
};

export type TeamMember = {
  __typename?: 'TeamMember';
  memberName: Scalars['String']['output'];
  ref: Scalars['String']['output'];
  refScope?: Maybe<AgentMemberRefScope>;
  refType: TeamMemberType;
};

export type TeamMemberConfigInput = {
  agentDefinitionId: Scalars['String']['input'];
  autoExecuteTools: Scalars['Boolean']['input'];
  llmConfig?: InputMaybe<Scalars['JSON']['input']>;
  llmModelIdentifier: Scalars['String']['input'];
  memberName: Scalars['String']['input'];
  memberRouteKey?: InputMaybe<Scalars['String']['input']>;
  runtimeKind?: InputMaybe<Scalars['String']['input']>;
  skillAccessMode: SkillAccessModeEnum;
  workspaceId?: InputMaybe<Scalars['String']['input']>;
  workspaceRootPath?: InputMaybe<Scalars['String']['input']>;
};

export type TeamMemberInput = {
  memberName: Scalars['String']['input'];
  ref: Scalars['String']['input'];
  refScope?: InputMaybe<AgentMemberRefScope>;
  refType: TeamMemberType;
};

export type TeamMemberMemoryTargetSummary = {
  __typename?: 'TeamMemberMemoryTargetSummary';
  agentDefinitionId?: Maybe<Scalars['String']['output']>;
  lastUpdatedAt?: Maybe<Scalars['String']['output']>;
  memberName: Scalars['String']['output'];
  memberRouteKey: Scalars['String']['output'];
  memberRunId: Scalars['String']['output'];
  memory: MemoryAvailabilitySummary;
};

export type TeamMemberRunProjectionPayload = {
  __typename?: 'TeamMemberRunProjectionPayload';
  activities: Array<Scalars['JSON']['output']>;
  agentRunId: Scalars['String']['output'];
  conversation: Array<Scalars['JSON']['output']>;
  lastActivityAt?: Maybe<Scalars['String']['output']>;
  summary?: Maybe<Scalars['String']['output']>;
};

export enum TeamMemberType {
  Agent = 'AGENT',
  AgentTeam = 'AGENT_TEAM'
}

export type TeamRunResumeConfigPayload = {
  __typename?: 'TeamRunResumeConfigPayload';
  isActive: Scalars['Boolean']['output'];
  metadata: Scalars['JSON']['output'];
  teamRunId: Scalars['String']['output'];
};

export type TerminateAgentRunResult = {
  __typename?: 'TerminateAgentRunResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type TerminateAgentTeamRunResult = {
  __typename?: 'TerminateAgentTeamRunResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type ToolArgumentSchema = {
  __typename?: 'ToolArgumentSchema';
  parameters: Array<ToolParameterDefinition>;
};

export type ToolCategoryGroup = {
  __typename?: 'ToolCategoryGroup';
  categoryName: Scalars['String']['output'];
  tools: Array<ToolDefinitionDetail>;
};

export type ToolDefinitionDetail = {
  __typename?: 'ToolDefinitionDetail';
  argumentSchema?: Maybe<ToolArgumentSchema>;
  category: Scalars['String']['output'];
  description: Scalars['String']['output'];
  name: Scalars['String']['output'];
  origin: ToolOriginEnum;
};

export enum ToolOriginEnum {
  Local = 'LOCAL',
  Mcp = 'MCP'
}

export type ToolParameterDefinition = {
  __typename?: 'ToolParameterDefinition';
  defaultValue?: Maybe<Scalars['String']['output']>;
  description: Scalars['String']['output'];
  enumValues?: Maybe<Array<Scalars['String']['output']>>;
  jsonSchema?: Maybe<Scalars['JSON']['output']>;
  name: Scalars['String']['output'];
  paramType: ToolParameterTypeEnum;
  required: Scalars['Boolean']['output'];
};

export enum ToolParameterTypeEnum {
  Array = 'ARRAY',
  Boolean = 'BOOLEAN',
  Enum = 'ENUM',
  Float = 'FLOAT',
  Integer = 'INTEGER',
  Object = 'OBJECT',
  String = 'STRING'
}

export type UpdateAgentDefinitionInput = {
  avatarUrl?: InputMaybe<Scalars['String']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  defaultLaunchConfig?: InputMaybe<DefaultLaunchConfigInput>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  inputProcessorNames?: InputMaybe<Array<Scalars['String']['input']>>;
  instructions?: InputMaybe<Scalars['String']['input']>;
  lifecycleProcessorNames?: InputMaybe<Array<Scalars['String']['input']>>;
  llmResponseProcessorNames?: InputMaybe<Array<Scalars['String']['input']>>;
  name?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<Scalars['String']['input']>;
  skillNames?: InputMaybe<Array<Scalars['String']['input']>>;
  systemPromptProcessorNames?: InputMaybe<Array<Scalars['String']['input']>>;
  toolExecutionResultProcessorNames?: InputMaybe<Array<Scalars['String']['input']>>;
  toolInvocationPreprocessorNames?: InputMaybe<Array<Scalars['String']['input']>>;
  toolNames?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UpdateAgentTeamDefinitionInput = {
  avatarUrl?: InputMaybe<Scalars['String']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  coordinatorMemberName?: InputMaybe<Scalars['String']['input']>;
  defaultLaunchConfig?: InputMaybe<DefaultLaunchConfigInput>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  instructions?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  nodes?: InputMaybe<Array<TeamMemberInput>>;
};

export type UpdateSkillInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type UpsertExternalChannelBindingInput = {
  accountId: Scalars['String']['input'];
  launchPreset?: InputMaybe<ExternalChannelLaunchPresetInput>;
  peerId: Scalars['String']['input'];
  provider: Scalars['String']['input'];
  targetAgentDefinitionId?: InputMaybe<Scalars['String']['input']>;
  targetMemberPath?: InputMaybe<Array<Scalars['String']['input']>>;
  targetMemberRouteKey?: InputMaybe<Scalars['String']['input']>;
  targetTeamDefinitionId?: InputMaybe<Scalars['String']['input']>;
  targetType: Scalars['String']['input'];
  teamLaunchPreset?: InputMaybe<ExternalChannelTeamLaunchPresetInput>;
  threadId?: InputMaybe<Scalars['String']['input']>;
  transport: Scalars['String']['input'];
};

export type UsageStatistics = {
  __typename?: 'UsageStatistics';
  assistantCost?: Maybe<Scalars['Float']['output']>;
  assistantTokens: Scalars['Int']['output'];
  llmModel: Scalars['String']['output'];
  promptCost?: Maybe<Scalars['Float']['output']>;
  promptTokens: Scalars['Int']['output'];
  totalCost?: Maybe<Scalars['Float']['output']>;
};

export type WorkspaceHistoryTeamDefinitionObject = {
  __typename?: 'WorkspaceHistoryTeamDefinitionObject';
  runs: Array<WorkspaceHistoryTeamRunItemObject>;
  teamDefinitionId: Scalars['String']['output'];
  teamDefinitionName: Scalars['String']['output'];
};

export type WorkspaceHistoryTeamRunItemObject = {
  __typename?: 'WorkspaceHistoryTeamRunItemObject';
  archivedAt?: Maybe<Scalars['String']['output']>;
  coordinatorMemberRouteKey: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  isActive: Scalars['Boolean']['output'];
  memberTree: Scalars['JSON']['output'];
  members: Array<WorkspaceHistoryTeamRunMemberObject>;
  status: Scalars['String']['output'];
  summary: Scalars['String']['output'];
  teamDefinitionId: Scalars['String']['output'];
  teamDefinitionName: Scalars['String']['output'];
  teamRunId: Scalars['String']['output'];
  terminatedAt?: Maybe<Scalars['String']['output']>;
  workspaceRootPath?: Maybe<Scalars['String']['output']>;
};

export type WorkspaceHistoryTeamRunMemberObject = {
  __typename?: 'WorkspaceHistoryTeamRunMemberObject';
  memberName: Scalars['String']['output'];
  memberRouteKey: Scalars['String']['output'];
  memberRunId: Scalars['String']['output'];
  runtimeKind: Scalars['String']['output'];
  status: Scalars['String']['output'];
  workspaceRootPath?: Maybe<Scalars['String']['output']>;
};

export type WorkspaceMetadata = {
  __typename?: 'WorkspaceMetadata';
  absolutePath?: Maybe<Scalars['String']['output']>;
  config: Scalars['JSON']['output'];
  displayName: Scalars['String']['output'];
  isTemp: Scalars['Boolean']['output'];
  kind: Scalars['String']['output'];
  name: Scalars['String']['output'];
  workspaceId: Scalars['String']['output'];
  workspaceRootPath: Scalars['String']['output'];
};

export type WorkspaceRunHistoryGroupObject = {
  __typename?: 'WorkspaceRunHistoryGroupObject';
  agentDefinitions: Array<RunHistoryAgentGroupObject>;
  teamDefinitions: Array<WorkspaceHistoryTeamDefinitionObject>;
  workspaceName: Scalars['String']['output'];
  workspaceRootPath: Scalars['String']['output'];
};

export type AgentPackageFieldsFragment = { __typename?: 'AgentPackage', packageId: string, displayName: string, path: string, sourceKind: AgentPackageSourceKind, source: string, sharedAgentCount: number, teamLocalAgentCount: number, agentTeamCount: number, applicationCount: number, isDefault: boolean, isRemovable: boolean, updateInfo: { __typename?: 'AgentPackageUpdateInfo', status: AgentPackageUpdateStatus, canCheck: boolean, canUpdate: boolean, canReload: boolean, message: string, installedRevision?: string | null, latestRevision?: string | null, checkedAt?: string | null, lastError?: string | null } };

export type GetAgentPackagesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAgentPackagesQuery = { __typename?: 'Query', agentPackages: Array<{ __typename?: 'AgentPackage', packageId: string, displayName: string, path: string, sourceKind: AgentPackageSourceKind, source: string, sharedAgentCount: number, teamLocalAgentCount: number, agentTeamCount: number, applicationCount: number, isDefault: boolean, isRemovable: boolean, updateInfo: { __typename?: 'AgentPackageUpdateInfo', status: AgentPackageUpdateStatus, canCheck: boolean, canUpdate: boolean, canReload: boolean, message: string, installedRevision?: string | null, latestRevision?: string | null, checkedAt?: string | null, lastError?: string | null } }> };

export type ImportAgentPackageMutationVariables = Exact<{
  input: ImportAgentPackageInput;
}>;


export type ImportAgentPackageMutation = { __typename?: 'Mutation', importAgentPackage: Array<{ __typename?: 'AgentPackage', packageId: string, displayName: string, path: string, sourceKind: AgentPackageSourceKind, source: string, sharedAgentCount: number, teamLocalAgentCount: number, agentTeamCount: number, applicationCount: number, isDefault: boolean, isRemovable: boolean, updateInfo: { __typename?: 'AgentPackageUpdateInfo', status: AgentPackageUpdateStatus, canCheck: boolean, canUpdate: boolean, canReload: boolean, message: string, installedRevision?: string | null, latestRevision?: string | null, checkedAt?: string | null, lastError?: string | null } }> };

export type RemoveAgentPackageMutationVariables = Exact<{
  packageId: Scalars['String']['input'];
}>;


export type RemoveAgentPackageMutation = { __typename?: 'Mutation', removeAgentPackage: Array<{ __typename?: 'AgentPackage', packageId: string, displayName: string, path: string, sourceKind: AgentPackageSourceKind, source: string, sharedAgentCount: number, teamLocalAgentCount: number, agentTeamCount: number, applicationCount: number, isDefault: boolean, isRemovable: boolean, updateInfo: { __typename?: 'AgentPackageUpdateInfo', status: AgentPackageUpdateStatus, canCheck: boolean, canUpdate: boolean, canReload: boolean, message: string, installedRevision?: string | null, latestRevision?: string | null, checkedAt?: string | null, lastError?: string | null } }> };

export type ReloadAgentPackageMutationVariables = Exact<{
  packageId: Scalars['String']['input'];
}>;


export type ReloadAgentPackageMutation = { __typename?: 'Mutation', reloadAgentPackage: Array<{ __typename?: 'AgentPackage', packageId: string, displayName: string, path: string, sourceKind: AgentPackageSourceKind, source: string, sharedAgentCount: number, teamLocalAgentCount: number, agentTeamCount: number, applicationCount: number, isDefault: boolean, isRemovable: boolean, updateInfo: { __typename?: 'AgentPackageUpdateInfo', status: AgentPackageUpdateStatus, canCheck: boolean, canUpdate: boolean, canReload: boolean, message: string, installedRevision?: string | null, latestRevision?: string | null, checkedAt?: string | null, lastError?: string | null } }> };

export type CheckAgentPackageUpdatesMutationVariables = Exact<{
  packageIds?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
}>;


export type CheckAgentPackageUpdatesMutation = { __typename?: 'Mutation', checkAgentPackageUpdates: Array<{ __typename?: 'AgentPackage', packageId: string, displayName: string, path: string, sourceKind: AgentPackageSourceKind, source: string, sharedAgentCount: number, teamLocalAgentCount: number, agentTeamCount: number, applicationCount: number, isDefault: boolean, isRemovable: boolean, updateInfo: { __typename?: 'AgentPackageUpdateInfo', status: AgentPackageUpdateStatus, canCheck: boolean, canUpdate: boolean, canReload: boolean, message: string, installedRevision?: string | null, latestRevision?: string | null, checkedAt?: string | null, lastError?: string | null } }> };

export type UpdateAgentPackageMutationVariables = Exact<{
  packageId: Scalars['String']['input'];
}>;


export type UpdateAgentPackageMutation = { __typename?: 'Mutation', updateAgentPackage: Array<{ __typename?: 'AgentPackage', packageId: string, displayName: string, path: string, sourceKind: AgentPackageSourceKind, source: string, sharedAgentCount: number, teamLocalAgentCount: number, agentTeamCount: number, applicationCount: number, isDefault: boolean, isRemovable: boolean, updateInfo: { __typename?: 'AgentPackageUpdateInfo', status: AgentPackageUpdateStatus, canCheck: boolean, canUpdate: boolean, canReload: boolean, message: string, installedRevision?: string | null, latestRevision?: string | null, checkedAt?: string | null, lastError?: string | null } }> };

export type ApplicationPackageListFieldsFragment = { __typename?: 'ApplicationPackage', packageId: string, displayName: string, sourceKind: ApplicationPackageSourceKind, sourceSummary?: string | null, applicationCount: number, isPlatformOwned: boolean, isRemovable: boolean };

export type ApplicationPackageDetailsFieldsFragment = { __typename?: 'ApplicationPackageDetails', packageId: string, displayName: string, sourceKind: ApplicationPackageSourceKind, sourceSummary?: string | null, rootPath: string, source: string, managedInstallPath?: string | null, bundledSourceRootPath?: string | null, applicationCount: number, isPlatformOwned: boolean, isRemovable: boolean };

export type GetApplicationPackagesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetApplicationPackagesQuery = { __typename?: 'Query', applicationPackages: Array<{ __typename?: 'ApplicationPackage', packageId: string, displayName: string, sourceKind: ApplicationPackageSourceKind, sourceSummary?: string | null, applicationCount: number, isPlatformOwned: boolean, isRemovable: boolean }> };

export type GetApplicationPackageDetailsQueryVariables = Exact<{
  packageId: Scalars['String']['input'];
}>;


export type GetApplicationPackageDetailsQuery = { __typename?: 'Query', applicationPackageDetails?: { __typename?: 'ApplicationPackageDetails', packageId: string, displayName: string, sourceKind: ApplicationPackageSourceKind, sourceSummary?: string | null, rootPath: string, source: string, managedInstallPath?: string | null, bundledSourceRootPath?: string | null, applicationCount: number, isPlatformOwned: boolean, isRemovable: boolean } | null };

export type ImportApplicationPackageMutationVariables = Exact<{
  input: ImportApplicationPackageInput;
}>;


export type ImportApplicationPackageMutation = { __typename?: 'Mutation', importApplicationPackage: Array<{ __typename?: 'ApplicationPackage', packageId: string, displayName: string, sourceKind: ApplicationPackageSourceKind, sourceSummary?: string | null, applicationCount: number, isPlatformOwned: boolean, isRemovable: boolean }> };

export type RemoveApplicationPackageMutationVariables = Exact<{
  packageId: Scalars['String']['input'];
}>;


export type RemoveApplicationPackageMutation = { __typename?: 'Mutation', removeApplicationPackage: Array<{ __typename?: 'ApplicationPackage', packageId: string, displayName: string, sourceKind: ApplicationPackageSourceKind, sourceSummary?: string | null, applicationCount: number, isPlatformOwned: boolean, isRemovable: boolean }> };

export type AgentDefinitionMutationFieldsFragment = { __typename: 'AgentDefinition', id: string, name: string, role?: string | null, description: string, instructions: string, category?: string | null, avatarUrl?: string | null, toolNames: Array<string>, inputProcessorNames: Array<string>, llmResponseProcessorNames: Array<string>, systemPromptProcessorNames: Array<string>, toolExecutionResultProcessorNames: Array<string>, toolInvocationPreprocessorNames: Array<string>, lifecycleProcessorNames: Array<string>, skillNames: Array<string>, ownershipScope: AgentDefinitionOwnershipScope, ownerTeamId?: string | null, ownerTeamName?: string | null, ownerApplicationId?: string | null, ownerApplicationName?: string | null, ownerPackageId?: string | null, ownerLocalApplicationId?: string | null, defaultLaunchConfig?: { __typename?: 'DefaultLaunchConfig', llmModelIdentifier?: string | null, runtimeKind?: string | null, llmConfig?: any | null } | null };

export type CreateAgentDefinitionMutationVariables = Exact<{
  input: CreateAgentDefinitionInput;
}>;


export type CreateAgentDefinitionMutation = { __typename?: 'Mutation', createAgentDefinition: { __typename: 'AgentDefinition', id: string, name: string, role?: string | null, description: string, instructions: string, category?: string | null, avatarUrl?: string | null, toolNames: Array<string>, inputProcessorNames: Array<string>, llmResponseProcessorNames: Array<string>, systemPromptProcessorNames: Array<string>, toolExecutionResultProcessorNames: Array<string>, toolInvocationPreprocessorNames: Array<string>, lifecycleProcessorNames: Array<string>, skillNames: Array<string>, ownershipScope: AgentDefinitionOwnershipScope, ownerTeamId?: string | null, ownerTeamName?: string | null, ownerApplicationId?: string | null, ownerApplicationName?: string | null, ownerPackageId?: string | null, ownerLocalApplicationId?: string | null, defaultLaunchConfig?: { __typename?: 'DefaultLaunchConfig', llmModelIdentifier?: string | null, runtimeKind?: string | null, llmConfig?: any | null } | null } };

export type UpdateAgentDefinitionMutationVariables = Exact<{
  input: UpdateAgentDefinitionInput;
}>;


export type UpdateAgentDefinitionMutation = { __typename?: 'Mutation', updateAgentDefinition: { __typename: 'AgentDefinition', id: string, name: string, role?: string | null, description: string, instructions: string, category?: string | null, avatarUrl?: string | null, toolNames: Array<string>, inputProcessorNames: Array<string>, llmResponseProcessorNames: Array<string>, systemPromptProcessorNames: Array<string>, toolExecutionResultProcessorNames: Array<string>, toolInvocationPreprocessorNames: Array<string>, lifecycleProcessorNames: Array<string>, skillNames: Array<string>, ownershipScope: AgentDefinitionOwnershipScope, ownerTeamId?: string | null, ownerTeamName?: string | null, ownerApplicationId?: string | null, ownerApplicationName?: string | null, ownerPackageId?: string | null, ownerLocalApplicationId?: string | null, defaultLaunchConfig?: { __typename?: 'DefaultLaunchConfig', llmModelIdentifier?: string | null, runtimeKind?: string | null, llmConfig?: any | null } | null } };

export type DeleteAgentDefinitionMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type DeleteAgentDefinitionMutation = { __typename?: 'Mutation', deleteAgentDefinition: { __typename: 'DeleteAgentDefinitionResult', success: boolean, message: string } };

export type RefreshAgentDefinitionCatalogMutationVariables = Exact<{ [key: string]: never; }>;


export type RefreshAgentDefinitionCatalogMutation = { __typename?: 'Mutation', refreshAgentDefinitionCatalog: boolean };

export type TerminateAgentRunMutationVariables = Exact<{
  agentRunId: Scalars['String']['input'];
}>;


export type TerminateAgentRunMutation = { __typename?: 'Mutation', terminateAgentRun: { __typename: 'TerminateAgentRunResult', success: boolean, message: string } };

export type CreateAgentRunMutationVariables = Exact<{
  input: CreateAgentRunInput;
}>;


export type CreateAgentRunMutation = { __typename?: 'Mutation', createAgentRun: { __typename?: 'CreateAgentRunResult', success: boolean, message: string, runId?: string | null } };

export type PrepareAgentRunMutationVariables = Exact<{
  input: CreateAgentRunInput;
}>;


export type PrepareAgentRunMutation = { __typename?: 'Mutation', prepareAgentRun: { __typename?: 'PrepareAgentRunResult', success: boolean, message: string, runId?: string | null, activationState?: string | null, preparedExpiresAt?: string | null } };

export type CancelPreparedAgentRunMutationVariables = Exact<{
  agentRunId: Scalars['String']['input'];
}>;


export type CancelPreparedAgentRunMutation = { __typename?: 'Mutation', cancelPreparedAgentRun: { __typename?: 'CancelPreparedAgentRunResult', success: boolean, message: string } };

export type RestoreAgentRunMutationVariables = Exact<{
  agentRunId: Scalars['String']['input'];
}>;


export type RestoreAgentRunMutation = { __typename?: 'Mutation', restoreAgentRun: { __typename: 'RestoreAgentRunResult', success: boolean, message: string, runId?: string | null } };

export type ApproveToolInvocationMutationVariables = Exact<{
  input: ApproveToolInvocationInput;
}>;


export type ApproveToolInvocationMutation = { __typename?: 'Mutation', approveToolInvocation: { __typename: 'ApproveToolInvocationResult', success: boolean, message: string } };

export type AgentTeamDefinitionMutationFieldsFragment = { __typename: 'AgentTeamDefinition', id: string, name: string, description: string, instructions: string, category?: string | null, avatarUrl?: string | null, coordinatorMemberName: string, ownershipScope: AgentTeamDefinitionOwnershipScope, ownerApplicationId?: string | null, ownerApplicationName?: string | null, ownerPackageId?: string | null, ownerLocalApplicationId?: string | null, defaultLaunchConfig?: { __typename?: 'DefaultLaunchConfig', llmModelIdentifier?: string | null, runtimeKind?: string | null, llmConfig?: any | null } | null, nodes: Array<{ __typename: 'TeamMember', memberName: string, ref: string, refType: TeamMemberType, refScope?: AgentMemberRefScope | null }> };

export type CreateAgentTeamDefinitionMutationVariables = Exact<{
  input: CreateAgentTeamDefinitionInput;
}>;


export type CreateAgentTeamDefinitionMutation = { __typename?: 'Mutation', createAgentTeamDefinition: { __typename: 'AgentTeamDefinition', id: string, name: string, description: string, instructions: string, category?: string | null, avatarUrl?: string | null, coordinatorMemberName: string, ownershipScope: AgentTeamDefinitionOwnershipScope, ownerApplicationId?: string | null, ownerApplicationName?: string | null, ownerPackageId?: string | null, ownerLocalApplicationId?: string | null, defaultLaunchConfig?: { __typename?: 'DefaultLaunchConfig', llmModelIdentifier?: string | null, runtimeKind?: string | null, llmConfig?: any | null } | null, nodes: Array<{ __typename: 'TeamMember', memberName: string, ref: string, refType: TeamMemberType, refScope?: AgentMemberRefScope | null }> } };

export type UpdateAgentTeamDefinitionMutationVariables = Exact<{
  input: UpdateAgentTeamDefinitionInput;
}>;


export type UpdateAgentTeamDefinitionMutation = { __typename?: 'Mutation', updateAgentTeamDefinition: { __typename: 'AgentTeamDefinition', id: string, name: string, description: string, instructions: string, category?: string | null, avatarUrl?: string | null, coordinatorMemberName: string, ownershipScope: AgentTeamDefinitionOwnershipScope, ownerApplicationId?: string | null, ownerApplicationName?: string | null, ownerPackageId?: string | null, ownerLocalApplicationId?: string | null, defaultLaunchConfig?: { __typename?: 'DefaultLaunchConfig', llmModelIdentifier?: string | null, runtimeKind?: string | null, llmConfig?: any | null } | null, nodes: Array<{ __typename: 'TeamMember', memberName: string, ref: string, refType: TeamMemberType, refScope?: AgentMemberRefScope | null }> } };

export type DeleteAgentTeamDefinitionMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type DeleteAgentTeamDefinitionMutation = { __typename?: 'Mutation', deleteAgentTeamDefinition: { __typename: 'DeleteAgentTeamDefinitionResult', success: boolean, message: string } };

export type RefreshAgentTeamDefinitionCatalogMutationVariables = Exact<{ [key: string]: never; }>;


export type RefreshAgentTeamDefinitionCatalogMutation = { __typename?: 'Mutation', refreshAgentTeamDefinitionCatalog: boolean };

export type CreateAgentTeamRunMutationVariables = Exact<{
  input: CreateAgentTeamRunInput;
}>;


export type CreateAgentTeamRunMutation = { __typename?: 'Mutation', createAgentTeamRun: { __typename: 'CreateAgentTeamRunResult', success: boolean, message: string, teamRunId?: string | null } };

export type TerminateAgentTeamRunMutationVariables = Exact<{
  teamRunId: Scalars['String']['input'];
}>;


export type TerminateAgentTeamRunMutation = { __typename?: 'Mutation', terminateAgentTeamRun: { __typename: 'TerminateAgentTeamRunResult', success: boolean, message: string } };

export type RestoreAgentTeamRunMutationVariables = Exact<{
  teamRunId: Scalars['String']['input'];
}>;


export type RestoreAgentTeamRunMutation = { __typename?: 'Mutation', restoreAgentTeamRun: { __typename: 'RestoreAgentTeamRunResult', success: boolean, message: string, teamRunId?: string | null } };

export type RunAppDataMigrationMutationVariables = Exact<{
  migrationId: Scalars['String']['input'];
}>;


export type RunAppDataMigrationMutation = { __typename?: 'Mutation', runAppDataMigration: { __typename?: 'AppDataMigrationMutationResult', success: boolean, message: string, migration?: { __typename?: 'AppDataMigrationRecordObject', migrationId: string, displayName: string, description: string, status: AppDataMigrationStatus, requiredOnStartup: boolean, canRetry: boolean, attempts: number, startedAt?: any | null, completedAt?: any | null, summary?: any | null, errorMessage?: string | null, logPath?: string | null } | null } };

export type SetApplicationsEnabledMutationVariables = Exact<{
  enabled: Scalars['Boolean']['input'];
}>;


export type SetApplicationsEnabledMutation = { __typename?: 'Mutation', setApplicationsEnabled: { __typename?: 'ApplicationsCapability', enabled: boolean, scope: ApplicationsCapabilityScope, settingKey: string, source: ApplicationsCapabilitySource } };

export type UpsertExternalChannelBindingMutationVariables = Exact<{
  input: UpsertExternalChannelBindingInput;
}>;


export type UpsertExternalChannelBindingMutation = { __typename?: 'Mutation', upsertExternalChannelBinding: { __typename: 'ExternalChannelBindingGql', id: string, provider: string, transport: string, accountId: string, peerId: string, threadId?: string | null, targetType: string, targetAgentDefinitionId?: string | null, targetTeamDefinitionId?: string | null, teamRunId?: string | null, updatedAt: any, launchPreset?: { __typename?: 'ExternalChannelLaunchPresetGql', workspaceRootPath: string, llmModelIdentifier: string, runtimeKind: string, autoExecuteTools: boolean, skillAccessMode: SkillAccessModeEnum, llmConfig?: any | null } | null, teamLaunchPreset?: { __typename?: 'ExternalChannelTeamLaunchPresetGql', workspaceRootPath: string, llmModelIdentifier: string, runtimeKind: string, autoExecuteTools: boolean, skillAccessMode: SkillAccessModeEnum, llmConfig?: any | null } | null } };

export type DeleteExternalChannelBindingMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type DeleteExternalChannelBindingMutation = { __typename?: 'Mutation', deleteExternalChannelBinding: boolean };

export type WriteFileContentMutationVariables = Exact<{
  workspaceId: Scalars['String']['input'];
  filePath: Scalars['String']['input'];
  content: Scalars['String']['input'];
}>;


export type WriteFileContentMutation = { __typename?: 'Mutation', writeFileContent: string };

export type DeleteFileOrFolderMutationVariables = Exact<{
  workspaceId: Scalars['String']['input'];
  path: Scalars['String']['input'];
}>;


export type DeleteFileOrFolderMutation = { __typename?: 'Mutation', deleteFileOrFolder: string };

export type MoveFileOrFolderMutationVariables = Exact<{
  workspaceId: Scalars['String']['input'];
  sourcePath: Scalars['String']['input'];
  destinationPath: Scalars['String']['input'];
}>;


export type MoveFileOrFolderMutation = { __typename?: 'Mutation', moveFileOrFolder: string };

export type RenameFileOrFolderMutationVariables = Exact<{
  workspaceId: Scalars['String']['input'];
  targetPath: Scalars['String']['input'];
  newName: Scalars['String']['input'];
}>;


export type RenameFileOrFolderMutation = { __typename?: 'Mutation', renameFileOrFolder: string };

export type CreateFileOrFolderMutationVariables = Exact<{
  workspaceId: Scalars['String']['input'];
  path: Scalars['String']['input'];
  isFile: Scalars['Boolean']['input'];
}>;


export type CreateFileOrFolderMutation = { __typename?: 'Mutation', createFileOrFolder: string };

export type SetLlmProviderApiKeyMutationVariables = Exact<{
  providerId: Scalars['String']['input'];
  apiKey: Scalars['String']['input'];
}>;


export type SetLlmProviderApiKeyMutation = { __typename?: 'Mutation', setLlmProviderApiKey: string };

export type ReloadLlmModelsMutationVariables = Exact<{
  runtimeKind?: InputMaybe<Scalars['String']['input']>;
}>;


export type ReloadLlmModelsMutation = { __typename?: 'Mutation', reloadLlmModels: string };

export type ReloadLlmProviderModelsMutationVariables = Exact<{
  providerId: Scalars['String']['input'];
  runtimeKind?: InputMaybe<Scalars['String']['input']>;
}>;


export type ReloadLlmProviderModelsMutation = { __typename?: 'Mutation', reloadLlmProviderModels: string };

export type ProbeCustomLlmProviderMutationVariables = Exact<{
  input: CustomLlmProviderInputObject;
}>;


export type ProbeCustomLlmProviderMutation = { __typename?: 'Mutation', probeCustomLlmProvider: { __typename?: 'CustomLlmProviderProbeResultObject', name: string, providerType: string, baseUrl: string, discoveredModels: Array<{ __typename?: 'CustomLlmProviderProbeModelObject', id: string, name: string }> } };

export type CreateCustomLlmProviderMutationVariables = Exact<{
  input: CustomLlmProviderInputObject;
  runtimeKind?: InputMaybe<Scalars['String']['input']>;
}>;


export type CreateCustomLlmProviderMutation = { __typename?: 'Mutation', createCustomLlmProvider: { __typename?: 'LlmProviderObject', id: string, name: string, providerType: string, isCustom: boolean, baseUrl?: string | null, apiKeyConfigured: boolean, status: string, statusMessage?: string | null } };

export type DeleteCustomLlmProviderMutationVariables = Exact<{
  providerId: Scalars['String']['input'];
  runtimeKind?: InputMaybe<Scalars['String']['input']>;
}>;


export type DeleteCustomLlmProviderMutation = { __typename?: 'Mutation', deleteCustomLlmProvider: string };

export type SetGeminiSetupConfigMutationVariables = Exact<{
  mode: Scalars['String']['input'];
  geminiApiKey?: InputMaybe<Scalars['String']['input']>;
  vertexApiKey?: InputMaybe<Scalars['String']['input']>;
  vertexProject?: InputMaybe<Scalars['String']['input']>;
  vertexLocation?: InputMaybe<Scalars['String']['input']>;
}>;


export type SetGeminiSetupConfigMutation = { __typename?: 'Mutation', setGeminiSetupConfig: string };

export type ConfigureMcpServerMutationVariables = Exact<{
  input: McpServerInput;
}>;


export type ConfigureMcpServerMutation = { __typename?: 'Mutation', configureMcpServer: { __typename?: 'ConfigureMcpServerResult', savedConfig: { __typename: 'StdioMcpServerConfig', serverId: string, transportType: McpTransportTypeEnum, enabled: boolean, toolNamePrefix?: string | null, command: string, args?: Array<string> | null, env?: any | null, cwd?: string | null } | { __typename: 'StreamableHttpMcpServerConfig', serverId: string, transportType: McpTransportTypeEnum, enabled: boolean, toolNamePrefix?: string | null, url: string, token?: string | null, headers?: any | null } } };

export type DeleteMcpServerMutationVariables = Exact<{
  serverId: Scalars['String']['input'];
}>;


export type DeleteMcpServerMutation = { __typename?: 'Mutation', deleteMcpServer: { __typename: 'DeleteMcpServerResult', success: boolean, message: string } };

export type DiscoverAndRegisterMcpServerToolsMutationVariables = Exact<{
  serverId: Scalars['String']['input'];
}>;


export type DiscoverAndRegisterMcpServerToolsMutation = { __typename?: 'Mutation', discoverAndRegisterMcpServerTools: { __typename: 'DiscoverAndRegisterMcpServerToolsResult', success: boolean, message: string, discoveredTools: Array<{ __typename: 'ToolDefinitionDetail', name: string, description: string, origin: ToolOriginEnum, category: string, argumentSchema?: { __typename: 'ToolArgumentSchema', parameters: Array<{ __typename: 'ToolParameterDefinition', name: string, paramType: ToolParameterTypeEnum, description: string, required: boolean, defaultValue?: string | null, enumValues?: Array<string> | null, jsonSchema?: any | null }> } | null }> } };

export type ImportMcpServerConfigsMutationVariables = Exact<{
  jsonString: Scalars['String']['input'];
}>;


export type ImportMcpServerConfigsMutation = { __typename?: 'Mutation', importMcpServerConfigs: { __typename: 'ImportMcpServerConfigsResult', success: boolean, message: string, importedCount: number, failedCount: number } };

export type DeleteStoredRunMutationVariables = Exact<{
  runId: Scalars['String']['input'];
}>;


export type DeleteStoredRunMutation = { __typename?: 'Mutation', deleteStoredRun: { __typename?: 'DeleteStoredRunMutationResult', success: boolean, message: string } };

export type ArchiveStoredRunMutationVariables = Exact<{
  runId: Scalars['String']['input'];
}>;


export type ArchiveStoredRunMutation = { __typename?: 'Mutation', archiveStoredRun: { __typename?: 'ArchiveStoredRunMutationResult', success: boolean, message: string } };

export type DeleteStoredTeamRunMutationVariables = Exact<{
  teamRunId: Scalars['String']['input'];
}>;


export type DeleteStoredTeamRunMutation = { __typename?: 'Mutation', deleteStoredTeamRun: { __typename?: 'DeleteStoredTeamRunMutationResult', success: boolean, message: string } };

export type ArchiveStoredTeamRunMutationVariables = Exact<{
  teamRunId: Scalars['String']['input'];
}>;


export type ArchiveStoredTeamRunMutation = { __typename?: 'Mutation', archiveStoredTeamRun: { __typename?: 'ArchiveStoredTeamRunMutationResult', success: boolean, message: string } };

export type SetSelfEvolutionEnabledMutationVariables = Exact<{
  enabled: Scalars['Boolean']['input'];
}>;


export type SetSelfEvolutionEnabledMutation = { __typename?: 'Mutation', setSelfEvolutionEnabled: { __typename?: 'SelfEvolutionCapability', enabled: boolean, settingKey: string, source: string } };

export type StartAgentRunSelfEvolutionMutationVariables = Exact<{
  input: StartAgentRunSelfEvolutionInput;
}>;


export type StartAgentRunSelfEvolutionMutation = { __typename?: 'Mutation', startAgentRunSelfEvolution: { __typename?: 'GraphqlSelfEvolutionStartResult', evolutionRunId: string, evolverRunId?: string | null, record: { __typename?: 'GraphqlSelfEvolutionRunRecord', evolutionRunId: string, status: string, evolverRunId?: string | null, errors: Array<string> } } };

export type StartTeamMemberSelfEvolutionMutationVariables = Exact<{
  input: StartTeamMemberSelfEvolutionInput;
}>;


export type StartTeamMemberSelfEvolutionMutation = { __typename?: 'Mutation', startTeamMemberSelfEvolution: { __typename?: 'GraphqlSelfEvolutionStartResult', evolutionRunId: string, evolverRunId?: string | null, record: { __typename?: 'GraphqlSelfEvolutionRunRecord', evolutionRunId: string, status: string, evolverRunId?: string | null, errors: Array<string> } } };

export type UpdateServerSettingMutationVariables = Exact<{
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
}>;


export type UpdateServerSettingMutation = { __typename?: 'Mutation', updateServerSetting: string };

export type DeleteServerSettingMutationVariables = Exact<{
  key: Scalars['String']['input'];
}>;


export type DeleteServerSettingMutation = { __typename?: 'Mutation', deleteServerSetting: string };

export type SetSearchConfigMutationVariables = Exact<{
  provider: Scalars['String']['input'];
  serperApiKey?: InputMaybe<Scalars['String']['input']>;
  serpapiApiKey?: InputMaybe<Scalars['String']['input']>;
  googleCseApiKey?: InputMaybe<Scalars['String']['input']>;
  googleCseId?: InputMaybe<Scalars['String']['input']>;
  vertexAiSearchApiKey?: InputMaybe<Scalars['String']['input']>;
  vertexAiSearchServingConfig?: InputMaybe<Scalars['String']['input']>;
}>;


export type SetSearchConfigMutation = { __typename?: 'Mutation', setSearchConfig: string };

export type ReloadToolSchemaMutationVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type ReloadToolSchemaMutation = { __typename?: 'Mutation', reloadToolSchema: { __typename?: 'ReloadToolSchemaResult', success: boolean, message: string, tool?: { __typename: 'ToolDefinitionDetail', name: string, description: string, origin: ToolOriginEnum, category: string, argumentSchema?: { __typename: 'ToolArgumentSchema', parameters: Array<{ __typename: 'ToolParameterDefinition', name: string, paramType: ToolParameterTypeEnum, description: string, required: boolean, defaultValue?: string | null, enumValues?: Array<string> | null, jsonSchema?: any | null }> } | null } | null } };

export type CreateWorkspaceMutationVariables = Exact<{
  input: CreateWorkspaceInput;
}>;


export type CreateWorkspaceMutation = { __typename?: 'Mutation', createWorkspace: { __typename: 'WorkspaceMetadata', workspaceId: string, name: string, displayName: string, config: any, workspaceRootPath: string, absolutePath?: string | null, kind: string, isTemp: boolean } };

export type GetAgentCustomizationOptionsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAgentCustomizationOptionsQuery = { __typename?: 'Query', availableToolNames: Array<string>, availableOptionalInputProcessorNames: Array<string>, availableOptionalLlmResponseProcessorNames: Array<string>, availableOptionalSystemPromptProcessorNames: Array<string>, availableOptionalToolExecutionResultProcessorNames: Array<string>, availableOptionalToolInvocationPreprocessorNames: Array<string>, availableOptionalLifecycleProcessorNames: Array<string> };

export type GetAgentDefinitionsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAgentDefinitionsQuery = { __typename?: 'Query', agentDefinitions: Array<{ __typename: 'AgentDefinition', id: string, name: string, role?: string | null, description: string, instructions: string, category?: string | null, avatarUrl?: string | null, toolNames: Array<string>, inputProcessorNames: Array<string>, llmResponseProcessorNames: Array<string>, systemPromptProcessorNames: Array<string>, toolExecutionResultProcessorNames: Array<string>, toolInvocationPreprocessorNames: Array<string>, lifecycleProcessorNames: Array<string>, skillNames: Array<string>, ownershipScope: AgentDefinitionOwnershipScope, ownerTeamId?: string | null, ownerTeamName?: string | null, ownerApplicationId?: string | null, ownerApplicationName?: string | null, ownerPackageId?: string | null, ownerLocalApplicationId?: string | null, defaultLaunchConfig?: { __typename?: 'DefaultLaunchConfig', llmModelIdentifier?: string | null, runtimeKind?: string | null, llmConfig?: any | null } | null }> };

export type GetAgentTeamDefinitionsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAgentTeamDefinitionsQuery = { __typename?: 'Query', agentTeamDefinitions: Array<{ __typename: 'AgentTeamDefinition', id: string, name: string, description: string, instructions: string, category?: string | null, avatarUrl?: string | null, coordinatorMemberName: string, ownershipScope: AgentTeamDefinitionOwnershipScope, ownerTeamId?: string | null, ownerTeamName?: string | null, ownerApplicationId?: string | null, ownerApplicationName?: string | null, ownerPackageId?: string | null, ownerLocalApplicationId?: string | null, defaultLaunchConfig?: { __typename?: 'DefaultLaunchConfig', llmModelIdentifier?: string | null, runtimeKind?: string | null, llmConfig?: any | null } | null, nodes: Array<{ __typename: 'TeamMember', memberName: string, ref: string, refType: TeamMemberType, refScope?: AgentMemberRefScope | null }> }> };

export type GetAppDataMigrationsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAppDataMigrationsQuery = { __typename?: 'Query', getAppDataMigrations: Array<{ __typename?: 'AppDataMigrationRecordObject', migrationId: string, displayName: string, description: string, status: AppDataMigrationStatus, requiredOnStartup: boolean, canRetry: boolean, attempts: number, startedAt?: any | null, completedAt?: any | null, summary?: any | null, errorMessage?: string | null, logPath?: string | null }> };

export type ApplicationsCapabilityFieldsFragment = { __typename?: 'ApplicationsCapability', enabled: boolean, scope: ApplicationsCapabilityScope, settingKey: string, source: ApplicationsCapabilitySource };

export type GetApplicationsCapabilityQueryVariables = Exact<{ [key: string]: never; }>;


export type GetApplicationsCapabilityQuery = { __typename?: 'Query', applicationsCapability: { __typename?: 'ApplicationsCapability', enabled: boolean, scope: ApplicationsCapabilityScope, settingKey: string, source: ApplicationsCapabilitySource } };

export type ApplicationCatalogFieldsFragment = { __typename: 'Application', id: string, name: string, description?: string | null, iconAssetPath?: string | null, entryHtmlAssetPath: string, executionResourceSlots: Array<{ __typename?: 'ApplicationExecutionResourceSlotSummary', slotKey: string, required: boolean }> };

export type ApplicationTechnicalDetailsFieldsFragment = { __typename: 'Application', localApplicationId: string, packageId: string, writable: boolean, bundleResources: Array<{ __typename?: 'ApplicationExecutionResource', kind: ApplicationExecutionResourceKind, localId: string, definitionId: string }> };

export type ApplicationDetailFieldsFragment = { __typename: 'Application', id: string, name: string, description?: string | null, iconAssetPath?: string | null, entryHtmlAssetPath: string, localApplicationId: string, packageId: string, writable: boolean, executionResourceSlots: Array<{ __typename?: 'ApplicationExecutionResourceSlotSummary', slotKey: string, required: boolean }>, bundleResources: Array<{ __typename?: 'ApplicationExecutionResource', kind: ApplicationExecutionResourceKind, localId: string, definitionId: string }> };

export type ListApplicationsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListApplicationsQuery = { __typename?: 'Query', listApplications: Array<{ __typename: 'Application', id: string, name: string, description?: string | null, iconAssetPath?: string | null, entryHtmlAssetPath: string, executionResourceSlots: Array<{ __typename?: 'ApplicationExecutionResourceSlotSummary', slotKey: string, required: boolean }> }> };

export type GetApplicationByIdQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetApplicationByIdQuery = { __typename?: 'Query', application?: { __typename: 'Application', id: string, name: string, description?: string | null, iconAssetPath?: string | null, entryHtmlAssetPath: string, localApplicationId: string, packageId: string, writable: boolean, executionResourceSlots: Array<{ __typename?: 'ApplicationExecutionResourceSlotSummary', slotKey: string, required: boolean }>, bundleResources: Array<{ __typename?: 'ApplicationExecutionResource', kind: ApplicationExecutionResourceKind, localId: string, definitionId: string }> } | null };

export type ExternalChannelCapabilitiesQueryVariables = Exact<{ [key: string]: never; }>;


export type ExternalChannelCapabilitiesQuery = { __typename?: 'Query', externalChannelCapabilities: { __typename: 'ExternalChannelCapabilities', bindingCrudEnabled: boolean, reason?: string | null, acceptedProviderTransportPairs: Array<string> } };

export type ExternalChannelBindingsQueryVariables = Exact<{ [key: string]: never; }>;


export type ExternalChannelBindingsQuery = { __typename?: 'Query', externalChannelBindings: Array<{ __typename: 'ExternalChannelBindingGql', id: string, provider: string, transport: string, accountId: string, peerId: string, threadId?: string | null, targetType: string, targetAgentDefinitionId?: string | null, targetTeamDefinitionId?: string | null, teamRunId?: string | null, updatedAt: any, launchPreset?: { __typename?: 'ExternalChannelLaunchPresetGql', workspaceRootPath: string, llmModelIdentifier: string, runtimeKind: string, autoExecuteTools: boolean, skillAccessMode: SkillAccessModeEnum, llmConfig?: any | null } | null, teamLaunchPreset?: { __typename?: 'ExternalChannelTeamLaunchPresetGql', workspaceRootPath: string, llmModelIdentifier: string, runtimeKind: string, autoExecuteTools: boolean, skillAccessMode: SkillAccessModeEnum, llmConfig?: any | null } | null }> };

export type ExternalChannelTeamDefinitionOptionsQueryVariables = Exact<{ [key: string]: never; }>;


export type ExternalChannelTeamDefinitionOptionsQuery = { __typename?: 'Query', externalChannelTeamDefinitionOptions: Array<{ __typename: 'ExternalChannelTeamDefinitionOptionGql', teamDefinitionId: string, teamDefinitionName: string, description: string, coordinatorMemberName: string, memberCount: number }> };

export type GetFileContentQueryVariables = Exact<{
  workspaceId: Scalars['String']['input'];
  filePath: Scalars['String']['input'];
}>;


export type GetFileContentQuery = { __typename?: 'Query', fileContent: string };

export type SearchFilesQueryVariables = Exact<{
  workspaceId: Scalars['String']['input'];
  query: Scalars['String']['input'];
}>;


export type SearchFilesQuery = { __typename?: 'Query', searchFiles: Array<string> };

export type GetFolderChildrenQueryVariables = Exact<{
  workspaceId: Scalars['String']['input'];
  folderPath: Scalars['String']['input'];
}>;


export type GetFolderChildrenQuery = { __typename?: 'Query', folderChildren: string };

export type GetLlmProviderApiKeyConfiguredQueryVariables = Exact<{
  providerId: Scalars['String']['input'];
}>;


export type GetLlmProviderApiKeyConfiguredQuery = { __typename?: 'Query', getLlmProviderApiKeyConfigured: boolean };

export type GetAvailableLlmProvidersWithModelsQueryVariables = Exact<{
  runtimeKind?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetAvailableLlmProvidersWithModelsQuery = { __typename?: 'Query', availableLlmProvidersWithModels: Array<{ __typename: 'ProviderWithModels', provider: { __typename: 'LlmProviderObject', id: string, name: string, providerType: string, isCustom: boolean, baseUrl?: string | null, apiKeyConfigured: boolean, status: string, statusMessage?: string | null }, models: Array<{ __typename: 'ModelDetail', modelIdentifier: string, name: string, value: string, canonicalName: string, providerId: string, providerName: string, providerType: string, runtime: string, hostUrl?: string | null, configSchema?: any | null, maxContextTokens?: number | null, activeContextTokens?: number | null, maxInputTokens?: number | null, maxOutputTokens?: number | null }> }>, availableAudioProvidersWithModels: Array<{ __typename: 'ProviderWithModels', provider: { __typename: 'LlmProviderObject', id: string, name: string, providerType: string, isCustom: boolean, baseUrl?: string | null, apiKeyConfigured: boolean, status: string, statusMessage?: string | null }, models: Array<{ __typename: 'ModelDetail', modelIdentifier: string, name: string, value: string, canonicalName: string, providerId: string, providerName: string, providerType: string, runtime: string, hostUrl?: string | null }> }>, availableImageProvidersWithModels: Array<{ __typename: 'ProviderWithModels', provider: { __typename: 'LlmProviderObject', id: string, name: string, providerType: string, isCustom: boolean, baseUrl?: string | null, apiKeyConfigured: boolean, status: string, statusMessage?: string | null }, models: Array<{ __typename: 'ModelDetail', modelIdentifier: string, name: string, value: string, canonicalName: string, providerId: string, providerName: string, providerType: string, runtime: string, hostUrl?: string | null }> }> };

export type GetGeminiSetupConfigQueryVariables = Exact<{ [key: string]: never; }>;


export type GetGeminiSetupConfigQuery = { __typename?: 'Query', getGeminiSetupConfig: { __typename?: 'GeminiSetupConfig', mode: string, geminiApiKeyConfigured: boolean, vertexApiKeyConfigured: boolean, vertexProject?: string | null, vertexLocation?: string | null } };

export type ManagedMessagingGatewayStatusQueryVariables = Exact<{ [key: string]: never; }>;


export type ManagedMessagingGatewayStatusQuery = { __typename?: 'Query', managedMessagingGatewayStatus: { __typename: 'ManagedMessagingGatewayStatusObject', supported: boolean, enabled: boolean, lifecycleState: string, message?: string | null, lastError?: string | null, activeVersion?: string | null, desiredVersion?: string | null, releaseTag?: string | null, installedVersions: Array<string>, bindHost?: string | null, bindPort?: number | null, pid?: number | null, providerConfig: any, providerStatusByProvider: any, supportedProviders: Array<string>, excludedProviders: Array<string>, diagnostics: any, runtimeReliabilityStatus?: any | null, runtimeRunning: boolean } };

export type ManagedMessagingGatewayWeComAccountsQueryVariables = Exact<{ [key: string]: never; }>;


export type ManagedMessagingGatewayWeComAccountsQuery = { __typename?: 'Query', managedMessagingGatewayWeComAccounts: Array<{ __typename: 'ManagedMessagingGatewayWeComAccountObject', accountId: string, label: string, mode: string }> };

export type ManagedMessagingGatewayPeerCandidatesQueryVariables = Exact<{
  provider: Scalars['String']['input'];
  includeGroups: Scalars['Boolean']['input'];
  limit: Scalars['Int']['input'];
}>;


export type ManagedMessagingGatewayPeerCandidatesQuery = { __typename?: 'Query', managedMessagingGatewayPeerCandidates: { __typename: 'ManagedMessagingGatewayPeerCandidateListObject', accountId?: string | null, updatedAt: string, items: Array<{ __typename: 'ManagedMessagingGatewayPeerCandidateObject', peerId: string, peerType: string, threadId?: string | null, displayName?: string | null, lastMessageAt: string }> } };

export type GetMcpServersQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMcpServersQuery = { __typename?: 'Query', mcpServers: Array<{ __typename: 'StdioMcpServerConfig', serverId: string, transportType: McpTransportTypeEnum, enabled: boolean, toolNamePrefix?: string | null, command: string, args?: Array<string> | null, env?: any | null, cwd?: string | null } | { __typename: 'StreamableHttpMcpServerConfig', serverId: string, transportType: McpTransportTypeEnum, enabled: boolean, toolNamePrefix?: string | null, url: string, token?: string | null, headers?: any | null }> };

export type PreviewMcpServerToolsQueryVariables = Exact<{
  input: McpServerInput;
}>;


export type PreviewMcpServerToolsQuery = { __typename?: 'Query', previewMcpServerTools: Array<{ __typename: 'ToolDefinitionDetail', name: string, description: string }> };

export type ListAgentsWithMemoryQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ListAgentsWithMemoryQuery = { __typename?: 'Query', listAgentsWithMemory: { __typename?: 'AgentWithMemoryPage', total: number, page: number, pageSize: number, totalPages: number, entries: Array<{ __typename?: 'AgentWithMemorySummary', attribution: AgentMemoryAttribution, agentDefinitionId?: string | null, displayName: string, stableId: string, runCount: number, latestMemoryAt?: string | null, memory: { __typename?: 'MemoryAvailabilitySummary', latestMemoryAt?: string | null, hasWorkingContext: boolean, hasEpisodic: boolean, hasSemantic: boolean, hasRawTraces: boolean, hasRawArchive: boolean } }> } };

export type ListAgentRunsWithMemoryQueryVariables = Exact<{
  selector: AgentWithMemorySelectorInput;
  search?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ListAgentRunsWithMemoryQuery = { __typename?: 'Query', listAgentRunsWithMemory: { __typename?: 'AgentRunMemoryPage', total: number, page: number, pageSize: number, totalPages: number, entries: Array<{ __typename?: 'AgentRunMemorySummary', runId: string, agentDefinitionId?: string | null, agentName?: string | null, summary?: string | null, workspaceRootPath?: string | null, createdAt?: string | null, lastUpdatedAt?: string | null, memory: { __typename?: 'MemoryAvailabilitySummary', latestMemoryAt?: string | null, hasWorkingContext: boolean, hasEpisodic: boolean, hasSemantic: boolean, hasRawTraces: boolean, hasRawArchive: boolean } }> } };

export type ListAgentTeamsWithMemoryQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ListAgentTeamsWithMemoryQuery = { __typename?: 'Query', listAgentTeamsWithMemory: { __typename?: 'AgentTeamWithMemoryPage', total: number, page: number, pageSize: number, totalPages: number, entries: Array<{ __typename?: 'AgentTeamWithMemorySummary', teamDefinitionId: string, teamDefinitionName: string, teamRunCount: number, memberMemoryCount: number, latestMemoryAt?: string | null, memory: { __typename?: 'MemoryAvailabilitySummary', latestMemoryAt?: string | null, hasWorkingContext: boolean, hasEpisodic: boolean, hasSemantic: boolean, hasRawTraces: boolean, hasRawArchive: boolean } }> } };

export type ListAgentTeamRunsWithMemoryQueryVariables = Exact<{
  teamDefinitionId: Scalars['String']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ListAgentTeamRunsWithMemoryQuery = { __typename?: 'Query', listAgentTeamRunsWithMemory: { __typename?: 'AgentTeamRunMemoryPage', total: number, page: number, pageSize: number, totalPages: number, entries: Array<{ __typename?: 'AgentTeamRunMemorySummary', teamRunId: string, teamDefinitionId: string, teamDefinitionName: string, summary?: string | null, workspaceRootPath?: string | null, createdAt?: string | null, lastUpdatedAt?: string | null, memory: { __typename?: 'MemoryAvailabilitySummary', latestMemoryAt?: string | null, hasWorkingContext: boolean, hasEpisodic: boolean, hasSemantic: boolean, hasRawTraces: boolean, hasRawArchive: boolean }, memberTargets: Array<{ __typename?: 'TeamMemberMemoryTargetSummary', memberRouteKey: string, memberName: string, memberRunId: string, agentDefinitionId?: string | null, lastUpdatedAt?: string | null, memory: { __typename?: 'MemoryAvailabilitySummary', latestMemoryAt?: string | null, hasWorkingContext: boolean, hasEpisodic: boolean, hasSemantic: boolean, hasRawTraces: boolean, hasRawArchive: boolean } }> }> } };

export type GetAgentRunMemoryViewQueryVariables = Exact<{
  runId: Scalars['String']['input'];
  includeWorkingContext?: InputMaybe<Scalars['Boolean']['input']>;
  includeEpisodic?: InputMaybe<Scalars['Boolean']['input']>;
  includeSemantic?: InputMaybe<Scalars['Boolean']['input']>;
  includeRawTraces?: InputMaybe<Scalars['Boolean']['input']>;
  includeArchive?: InputMaybe<Scalars['Boolean']['input']>;
  rawTraceLimit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetAgentRunMemoryViewQuery = { __typename?: 'Query', getAgentRunMemoryView: { __typename?: 'AgentMemoryView', runId: string, episodic?: Array<any> | null, semantic?: Array<any> | null, workingContext?: Array<{ __typename?: 'MemoryMessage', role: string, content?: string | null, reasoning?: string | null, toolPayload?: any | null, ts?: number | null }> | null, rawTraces?: Array<{ __typename?: 'MemoryTraceEvent', traceType: string, content?: string | null, toolName?: string | null, toolCallId?: string | null, toolArgs?: any | null, toolResult?: any | null, toolError?: string | null, media?: any | null, turnId: string, seq: number, ts: number }> | null } };

export type GetTeamMemberRunMemoryViewQueryVariables = Exact<{
  teamRunId: Scalars['String']['input'];
  memberRunId: Scalars['String']['input'];
  includeWorkingContext?: InputMaybe<Scalars['Boolean']['input']>;
  includeEpisodic?: InputMaybe<Scalars['Boolean']['input']>;
  includeSemantic?: InputMaybe<Scalars['Boolean']['input']>;
  includeRawTraces?: InputMaybe<Scalars['Boolean']['input']>;
  includeArchive?: InputMaybe<Scalars['Boolean']['input']>;
  rawTraceLimit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetTeamMemberRunMemoryViewQuery = { __typename?: 'Query', getTeamMemberRunMemoryView: { __typename?: 'AgentMemoryView', runId: string, episodic?: Array<any> | null, semantic?: Array<any> | null, workingContext?: Array<{ __typename?: 'MemoryMessage', role: string, content?: string | null, reasoning?: string | null, toolPayload?: any | null, ts?: number | null }> | null, rawTraces?: Array<{ __typename?: 'MemoryTraceEvent', traceType: string, content?: string | null, toolName?: string | null, toolCallId?: string | null, toolArgs?: any | null, toolResult?: any | null, toolError?: string | null, media?: any | null, turnId: string, seq: number, ts: number }> | null } };

export type ListWorkspaceRunHistoryQueryVariables = Exact<{
  limitPerAgent?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ListWorkspaceRunHistoryQuery = { __typename?: 'Query', listWorkspaceRunHistory: Array<{ __typename?: 'WorkspaceRunHistoryGroupObject', workspaceRootPath: string, workspaceName: string, agentDefinitions: Array<{ __typename?: 'RunHistoryAgentGroupObject', agentDefinitionId: string, agentName: string, runs: Array<{ __typename?: 'RunHistoryItemObject', runId: string, summary: string, createdAt: string, archivedAt?: string | null, terminatedAt?: string | null, status: string, isActive: boolean, shouldConnectStream: boolean, statusSource: string }> }>, teamDefinitions: Array<{ __typename?: 'WorkspaceHistoryTeamDefinitionObject', teamDefinitionId: string, teamDefinitionName: string, runs: Array<{ __typename?: 'WorkspaceHistoryTeamRunItemObject', teamRunId: string, teamDefinitionId: string, teamDefinitionName: string, coordinatorMemberRouteKey: string, workspaceRootPath?: string | null, summary: string, createdAt: string, archivedAt?: string | null, terminatedAt?: string | null, status: string, isActive: boolean, memberTree: any, members: Array<{ __typename?: 'WorkspaceHistoryTeamRunMemberObject', memberRouteKey: string, memberName: string, memberRunId: string, status: string, runtimeKind: string, workspaceRootPath?: string | null }> }> }> }> };

export type GetRunProjectionQueryVariables = Exact<{
  runId: Scalars['String']['input'];
}>;


export type GetRunProjectionQuery = { __typename?: 'Query', getRunProjection: { __typename?: 'RunProjectionPayload', runId: string, summary?: string | null, lastActivityAt?: string | null, conversation: Array<any>, activities: Array<any> } };

export type GetRunFileChangesQueryVariables = Exact<{
  runId: Scalars['String']['input'];
}>;


export type GetRunFileChangesQuery = { __typename?: 'Query', getRunFileChanges: Array<{ __typename?: 'RunFileChangeEntryObject', id: string, runId: string, path: string, type: string, status: string, sourceTool: string, sourceInvocationId?: string | null, content?: string | null, createdAt: string, updatedAt: string }> };

export type GetTeamRunResumeConfigQueryVariables = Exact<{
  teamRunId: Scalars['String']['input'];
}>;


export type GetTeamRunResumeConfigQuery = { __typename?: 'Query', getTeamRunResumeConfig: { __typename?: 'TeamRunResumeConfigPayload', teamRunId: string, isActive: boolean, metadata: any } };

export type GetTeamMemberRunProjectionQueryVariables = Exact<{
  teamRunId: Scalars['String']['input'];
  memberRouteKey: Scalars['String']['input'];
}>;


export type GetTeamMemberRunProjectionQuery = { __typename?: 'Query', getTeamMemberRunProjection: { __typename?: 'TeamMemberRunProjectionPayload', agentRunId: string, summary?: string | null, lastActivityAt?: string | null, conversation: Array<any>, activities: Array<any> } };

export type GetTeamCommunicationMessagesQueryVariables = Exact<{
  teamRunId: Scalars['String']['input'];
}>;


export type GetTeamCommunicationMessagesQuery = { __typename?: 'Query', getTeamCommunicationMessages: Array<{ __typename?: 'TeamCommunicationMessageObject', messageId: string, teamRunId: string, senderRunId: string, senderMemberKind?: string | null, senderMemberName?: string | null, senderMemberPath?: Array<string> | null, senderMemberRouteKey?: string | null, receiverRunId: string, receiverMemberKind?: string | null, receiverMemberName?: string | null, receiverMemberPath?: Array<string> | null, receiverMemberRouteKey?: string | null, content: string, messageType: string, createdAt: string, updatedAt: string, senderRepresentedSubTeam?: { __typename?: 'TeamCommunicationRepresentedSubTeamObject', memberKind: string, memberName: string, memberPath: Array<string>, memberRouteKey: string, memberRunId: string, teamDefinitionId: string, childTeamRunId?: string | null, address: { __typename?: 'TeamCommunicationMemberAddressObject', teamRunId: string, memberPath: Array<string>, memberRouteKey: string } } | null, receiverRepresentedSubTeam?: { __typename?: 'TeamCommunicationRepresentedSubTeamObject', memberKind: string, memberName: string, memberPath: Array<string>, memberRouteKey: string, memberRunId: string, teamDefinitionId: string, childTeamRunId?: string | null, address: { __typename?: 'TeamCommunicationMemberAddressObject', teamRunId: string, memberPath: Array<string>, memberRouteKey: string } } | null, referenceFiles: Array<{ __typename?: 'TeamCommunicationReferenceFileObject', referenceId: string, path: string, type: string, createdAt: string, updatedAt: string }> }> };

export type GetAgentRunResumeConfigQueryVariables = Exact<{
  runId: Scalars['String']['input'];
}>;


export type GetAgentRunResumeConfigQuery = { __typename?: 'Query', getAgentRunResumeConfig: { __typename?: 'RunResumeConfigPayload', runId: string, isActive: boolean, metadataConfig: { __typename?: 'RunMetadataConfigObject', agentDefinitionId: string, workspaceRootPath: string, llmModelIdentifier: string, llmConfig?: any | null, autoExecuteTools: boolean, skillAccessMode?: SkillAccessModeEnum | null, runtimeKind: string, runtimeReference: { __typename?: 'RunRuntimeReferenceObject', runtimeKind: string, sessionId?: string | null, threadId?: string | null, metadata?: any | null } }, editableFields: { __typename?: 'RunEditableFieldFlagsObject', llmModelIdentifier: boolean, llmConfig: boolean, autoExecuteTools: boolean, skillAccessMode: boolean, workspaceRootPath: boolean, runtimeKind: boolean } } };

export type GetRuntimeAvailabilitiesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetRuntimeAvailabilitiesQuery = { __typename?: 'Query', runtimeAvailabilities: Array<{ __typename?: 'RuntimeAvailabilityObject', runtimeKind: string, enabled: boolean, reason?: string | null }> };

export type SelfEvolutionCapabilityFieldsFragment = { __typename?: 'SelfEvolutionCapability', enabled: boolean, settingKey: string, source: string };

export type SelfEvolutionEffectiveConfigFieldsFragment = { __typename?: 'GraphqlSelfEvolutionEffectiveConfig', enabled: boolean, triggerStrategy: string, evolverStrategy: string, evolverAgentDefinitionId?: string | null, resolvedAt: string, sourceTrace: Array<{ __typename?: 'GraphqlSelfEvolutionConfigSourceTraceEntry', source: string, fields: Array<string> }> };

export type SelfEvolutionSkillTargetFieldsFragment = { __typename?: 'GraphqlSelfEvolutionSkillTarget', skillName: string, skillRootPath: string, skillMdPath: string, sourceLabel?: string | null, isWritable: boolean };

export type SelfEvolutionEligibilityFieldsFragment = { __typename?: 'GraphqlSelfEvolutionEligibility', eligible: boolean, reasons: Array<string>, warnings: Array<string>, skillTargets: Array<{ __typename?: 'GraphqlSelfEvolutionSkillTarget', skillName: string, skillRootPath: string, skillMdPath: string, sourceLabel?: string | null, isWritable: boolean }>, effectiveConfig?: { __typename?: 'GraphqlSelfEvolutionEffectiveConfig', enabled: boolean, triggerStrategy: string, evolverStrategy: string, evolverAgentDefinitionId?: string | null, resolvedAt: string, sourceTrace: Array<{ __typename?: 'GraphqlSelfEvolutionConfigSourceTraceEntry', source: string, fields: Array<string> }> } | null };

export type SelfEvolutionRunRecordSummaryFieldsFragment = { __typename?: 'GraphqlSelfEvolutionRunRecord', evolutionRunId: string, status: string, evolverRunId?: string | null, errors: Array<string> };

export type GetSelfEvolutionCapabilityQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSelfEvolutionCapabilityQuery = { __typename?: 'Query', selfEvolutionCapability: { __typename?: 'SelfEvolutionCapability', enabled: boolean, settingKey: string, source: string } };

export type GetAgentRunSelfEvolutionEligibilityQueryVariables = Exact<{
  runId: Scalars['String']['input'];
}>;


export type GetAgentRunSelfEvolutionEligibilityQuery = { __typename?: 'Query', getAgentRunSelfEvolutionEligibility: { __typename?: 'GraphqlSelfEvolutionEligibility', eligible: boolean, reasons: Array<string>, warnings: Array<string>, skillTargets: Array<{ __typename?: 'GraphqlSelfEvolutionSkillTarget', skillName: string, skillRootPath: string, skillMdPath: string, sourceLabel?: string | null, isWritable: boolean }>, effectiveConfig?: { __typename?: 'GraphqlSelfEvolutionEffectiveConfig', enabled: boolean, triggerStrategy: string, evolverStrategy: string, evolverAgentDefinitionId?: string | null, resolvedAt: string, sourceTrace: Array<{ __typename?: 'GraphqlSelfEvolutionConfigSourceTraceEntry', source: string, fields: Array<string> }> } | null } };

export type GetTeamMemberSelfEvolutionEligibilityQueryVariables = Exact<{
  teamRunId: Scalars['String']['input'];
  memberRunId: Scalars['String']['input'];
}>;


export type GetTeamMemberSelfEvolutionEligibilityQuery = { __typename?: 'Query', getTeamMemberSelfEvolutionEligibility: { __typename?: 'GraphqlSelfEvolutionEligibility', eligible: boolean, reasons: Array<string>, warnings: Array<string>, skillTargets: Array<{ __typename?: 'GraphqlSelfEvolutionSkillTarget', skillName: string, skillRootPath: string, skillMdPath: string, sourceLabel?: string | null, isWritable: boolean }>, effectiveConfig?: { __typename?: 'GraphqlSelfEvolutionEffectiveConfig', enabled: boolean, triggerStrategy: string, evolverStrategy: string, evolverAgentDefinitionId?: string | null, resolvedAt: string, sourceTrace: Array<{ __typename?: 'GraphqlSelfEvolutionConfigSourceTraceEntry', source: string, fields: Array<string> }> } | null } };

export type GetSelfEvolutionRunRecordQueryVariables = Exact<{
  evolutionRunId: Scalars['String']['input'];
}>;


export type GetSelfEvolutionRunRecordQuery = { __typename?: 'Query', getSelfEvolutionRunRecord?: { __typename?: 'GraphqlSelfEvolutionRunRecord', evolutionRunId: string, status: string, evolverRunId?: string | null, errors: Array<string> } | null };

export type GetServerSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetServerSettingsQuery = { __typename?: 'Query', getServerSettings: Array<{ __typename: 'ServerSetting', key: string, value: string, description: string, isEditable: boolean, isDeletable: boolean }> };

export type GetSearchConfigQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSearchConfigQuery = { __typename?: 'Query', getSearchConfig: { __typename?: 'SearchConfig', provider: string, serperApiKeyConfigured: boolean, serpapiApiKeyConfigured: boolean, googleCseApiKeyConfigured: boolean, googleCseId?: string | null, vertexAiSearchApiKeyConfigured: boolean, vertexAiSearchServingConfig?: string | null } };

export type GetUsageStatisticsInPeriodQueryVariables = Exact<{
  startTime: Scalars['DateTime']['input'];
  endTime: Scalars['DateTime']['input'];
}>;


export type GetUsageStatisticsInPeriodQuery = { __typename?: 'Query', usageStatisticsInPeriod: Array<{ __typename?: 'UsageStatistics', llmModel: string, promptTokens: number, assistantTokens: number, promptCost?: number | null, assistantCost?: number | null, totalCost?: number | null }> };

export type GetToolsQueryVariables = Exact<{
  origin?: InputMaybe<ToolOriginEnum>;
  sourceServerId?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetToolsQuery = { __typename?: 'Query', tools: Array<{ __typename: 'ToolDefinitionDetail', name: string, description: string, origin: ToolOriginEnum, category: string, argumentSchema?: { __typename: 'ToolArgumentSchema', parameters: Array<{ __typename: 'ToolParameterDefinition', name: string, paramType: ToolParameterTypeEnum, description: string, required: boolean, defaultValue?: string | null, enumValues?: Array<string> | null, jsonSchema?: any | null }> } | null }> };

export type GetToolsGroupedByCategoryQueryVariables = Exact<{
  origin: ToolOriginEnum;
}>;


export type GetToolsGroupedByCategoryQuery = { __typename?: 'Query', toolsGroupedByCategory: Array<{ __typename: 'ToolCategoryGroup', categoryName: string, tools: Array<{ __typename: 'ToolDefinitionDetail', name: string, description: string, origin: ToolOriginEnum, category: string, argumentSchema?: { __typename: 'ToolArgumentSchema', parameters: Array<{ __typename: 'ToolParameterDefinition', name: string, paramType: ToolParameterTypeEnum, description: string, required: boolean, defaultValue?: string | null, enumValues?: Array<string> | null, jsonSchema?: any | null }> } | null }> }> };

export type GetAllWorkspacesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllWorkspacesQuery = { __typename?: 'Query', workspaces: Array<{ __typename: 'WorkspaceMetadata', workspaceId: string, name: string, displayName: string, config: any, workspaceRootPath: string, absolutePath?: string | null, kind: string, isTemp: boolean }> };

export type GetWorkspaceMetadataQueryVariables = Exact<{
  rootPath: Scalars['String']['input'];
}>;


export type GetWorkspaceMetadataQuery = { __typename?: 'Query', workspaceMetadata: { __typename: 'WorkspaceMetadata', workspaceId: string, workspaceRootPath: string, displayName: string, kind: string } };

export type GetSkillSourcesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSkillSourcesQuery = { __typename?: 'Query', skillSources: Array<{ __typename?: 'SkillSource', path: string, skillCount: number, isDefault: boolean }> };

export type AddSkillSourceMutationVariables = Exact<{
  path: Scalars['String']['input'];
}>;


export type AddSkillSourceMutation = { __typename?: 'Mutation', addSkillSource: Array<{ __typename?: 'SkillSource', path: string, skillCount: number, isDefault: boolean }> };

export type RemoveSkillSourceMutationVariables = Exact<{
  path: Scalars['String']['input'];
}>;


export type RemoveSkillSourceMutation = { __typename?: 'Mutation', removeSkillSource: Array<{ __typename?: 'SkillSource', path: string, skillCount: number, isDefault: boolean }> };

export type ReloadSkillCatalogMutationVariables = Exact<{ [key: string]: never; }>;


export type ReloadSkillCatalogMutation = { __typename?: 'Mutation', reloadSkillCatalog: { __typename?: 'SkillCatalogReloadResult', skills: Array<{ __typename?: 'Skill', name: string, description: string, content: string, rootPath: string, fileCount: number, isReadonly: boolean, isDisabled: boolean }>, skillSources: Array<{ __typename?: 'SkillSource', path: string, skillCount: number, isDefault: boolean }> } };

export type GetSkillsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSkillsQuery = { __typename?: 'Query', skills: Array<{ __typename?: 'Skill', name: string, description: string, content: string, rootPath: string, fileCount: number, isReadonly: boolean, isDisabled: boolean }> };

export type GetSkillQueryVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type GetSkillQuery = { __typename?: 'Query', skill?: { __typename?: 'Skill', name: string, description: string, content: string, rootPath: string, fileCount: number, isReadonly: boolean, isDisabled: boolean } | null };

export type GetSkillFileTreeQueryVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type GetSkillFileTreeQuery = { __typename?: 'Query', skillFileTree?: string | null };

export type GetSkillFileContentQueryVariables = Exact<{
  skillName: Scalars['String']['input'];
  path: Scalars['String']['input'];
}>;


export type GetSkillFileContentQuery = { __typename?: 'Query', skillFileContent?: string | null };

export type CreateSkillMutationVariables = Exact<{
  input: CreateSkillInput;
}>;


export type CreateSkillMutation = { __typename?: 'Mutation', createSkill: { __typename?: 'Skill', name: string, description: string, content: string, rootPath: string, fileCount: number } };

export type UpdateSkillMutationVariables = Exact<{
  input: UpdateSkillInput;
}>;


export type UpdateSkillMutation = { __typename?: 'Mutation', updateSkill: { __typename?: 'Skill', name: string, description: string, content: string, rootPath: string, fileCount: number } };

export type DeleteSkillMutationVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type DeleteSkillMutation = { __typename?: 'Mutation', deleteSkill: { __typename?: 'DeleteSkillResult', success: boolean, message: string } };

export type UploadSkillFileMutationVariables = Exact<{
  skillName: Scalars['String']['input'];
  path: Scalars['String']['input'];
  content: Scalars['String']['input'];
}>;


export type UploadSkillFileMutation = { __typename?: 'Mutation', uploadSkillFile: boolean };

export type DeleteSkillFileMutationVariables = Exact<{
  skillName: Scalars['String']['input'];
  path: Scalars['String']['input'];
}>;


export type DeleteSkillFileMutation = { __typename?: 'Mutation', deleteSkillFile: boolean };

export type DisableSkillMutationVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type DisableSkillMutation = { __typename?: 'Mutation', disableSkill: { __typename?: 'Skill', name: string, isDisabled: boolean } };

export type EnableSkillMutationVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type EnableSkillMutation = { __typename?: 'Mutation', enableSkill: { __typename?: 'Skill', name: string, isDisabled: boolean } };

export const AgentPackageFieldsFragmentDoc = gql`
    fragment AgentPackageFields on AgentPackage {
  packageId
  displayName
  path
  sourceKind
  source
  sharedAgentCount
  teamLocalAgentCount
  agentTeamCount
  applicationCount
  isDefault
  isRemovable
  updateInfo {
    status
    canCheck
    canUpdate
    canReload
    message
    installedRevision
    latestRevision
    checkedAt
    lastError
  }
}
    `;
export const ApplicationPackageListFieldsFragmentDoc = gql`
    fragment ApplicationPackageListFields on ApplicationPackage {
  packageId
  displayName
  sourceKind
  sourceSummary
  applicationCount
  isPlatformOwned
  isRemovable
}
    `;
export const ApplicationPackageDetailsFieldsFragmentDoc = gql`
    fragment ApplicationPackageDetailsFields on ApplicationPackageDetails {
  packageId
  displayName
  sourceKind
  sourceSummary
  rootPath
  source
  managedInstallPath
  bundledSourceRootPath
  applicationCount
  isPlatformOwned
  isRemovable
}
    `;
export const AgentDefinitionMutationFieldsFragmentDoc = gql`
    fragment AgentDefinitionMutationFields on AgentDefinition {
  __typename
  id
  name
  role
  description
  instructions
  category
  avatarUrl
  toolNames
  inputProcessorNames
  llmResponseProcessorNames
  systemPromptProcessorNames
  toolExecutionResultProcessorNames
  toolInvocationPreprocessorNames
  lifecycleProcessorNames
  skillNames
  ownershipScope
  ownerTeamId
  ownerTeamName
  ownerApplicationId
  ownerApplicationName
  ownerPackageId
  ownerLocalApplicationId
  defaultLaunchConfig {
    llmModelIdentifier
    runtimeKind
    llmConfig
  }
}
    `;
export const AgentTeamDefinitionMutationFieldsFragmentDoc = gql`
    fragment AgentTeamDefinitionMutationFields on AgentTeamDefinition {
  __typename
  id
  name
  description
  instructions
  category
  avatarUrl
  coordinatorMemberName
  ownershipScope
  ownerApplicationId
  ownerApplicationName
  ownerPackageId
  ownerLocalApplicationId
  defaultLaunchConfig {
    llmModelIdentifier
    runtimeKind
    llmConfig
  }
  nodes {
    __typename
    memberName
    ref
    refType
    refScope
  }
}
    `;
export const ApplicationsCapabilityFieldsFragmentDoc = gql`
    fragment ApplicationsCapabilityFields on ApplicationsCapability {
  enabled
  scope
  settingKey
  source
}
    `;
export const ApplicationCatalogFieldsFragmentDoc = gql`
    fragment ApplicationCatalogFields on Application {
  __typename
  id
  name
  description
  iconAssetPath
  entryHtmlAssetPath
  executionResourceSlots {
    slotKey
    required
  }
}
    `;
export const ApplicationTechnicalDetailsFieldsFragmentDoc = gql`
    fragment ApplicationTechnicalDetailsFields on Application {
  __typename
  localApplicationId
  packageId
  writable
  bundleResources {
    kind
    localId
    definitionId
  }
}
    `;
export const ApplicationDetailFieldsFragmentDoc = gql`
    fragment ApplicationDetailFields on Application {
  ...ApplicationCatalogFields
  ...ApplicationTechnicalDetailsFields
}
    ${ApplicationCatalogFieldsFragmentDoc}
${ApplicationTechnicalDetailsFieldsFragmentDoc}`;
export const SelfEvolutionCapabilityFieldsFragmentDoc = gql`
    fragment SelfEvolutionCapabilityFields on SelfEvolutionCapability {
  enabled
  settingKey
  source
}
    `;
export const SelfEvolutionSkillTargetFieldsFragmentDoc = gql`
    fragment SelfEvolutionSkillTargetFields on GraphqlSelfEvolutionSkillTarget {
  skillName
  skillRootPath
  skillMdPath
  sourceLabel
  isWritable
}
    `;
export const SelfEvolutionEffectiveConfigFieldsFragmentDoc = gql`
    fragment SelfEvolutionEffectiveConfigFields on GraphqlSelfEvolutionEffectiveConfig {
  enabled
  triggerStrategy
  evolverStrategy
  evolverAgentDefinitionId
  resolvedAt
  sourceTrace {
    source
    fields
  }
}
    `;
export const SelfEvolutionEligibilityFieldsFragmentDoc = gql`
    fragment SelfEvolutionEligibilityFields on GraphqlSelfEvolutionEligibility {
  eligible
  reasons
  warnings
  skillTargets {
    ...SelfEvolutionSkillTargetFields
  }
  effectiveConfig {
    ...SelfEvolutionEffectiveConfigFields
  }
}
    ${SelfEvolutionSkillTargetFieldsFragmentDoc}
${SelfEvolutionEffectiveConfigFieldsFragmentDoc}`;
export const SelfEvolutionRunRecordSummaryFieldsFragmentDoc = gql`
    fragment SelfEvolutionRunRecordSummaryFields on GraphqlSelfEvolutionRunRecord {
  evolutionRunId
  status
  evolverRunId
  errors
}
    `;
export const GetAgentPackagesDocument = gql`
    query GetAgentPackages {
  agentPackages {
    ...AgentPackageFields
  }
}
    ${AgentPackageFieldsFragmentDoc}`;

/**
 * __useGetAgentPackagesQuery__
 *
 * To run a query within a Vue component, call `useGetAgentPackagesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAgentPackagesQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetAgentPackagesQuery();
 */
export function useGetAgentPackagesQuery(options: VueApolloComposable.UseQueryOptions<GetAgentPackagesQuery, GetAgentPackagesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetAgentPackagesQuery, GetAgentPackagesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetAgentPackagesQuery, GetAgentPackagesQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetAgentPackagesQuery, GetAgentPackagesQueryVariables>(GetAgentPackagesDocument, {}, options);
}
export function useGetAgentPackagesLazyQuery(options: VueApolloComposable.UseQueryOptions<GetAgentPackagesQuery, GetAgentPackagesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetAgentPackagesQuery, GetAgentPackagesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetAgentPackagesQuery, GetAgentPackagesQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetAgentPackagesQuery, GetAgentPackagesQueryVariables>(GetAgentPackagesDocument, {}, options);
}
export type GetAgentPackagesQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetAgentPackagesQuery, GetAgentPackagesQueryVariables>;
export const ImportAgentPackageDocument = gql`
    mutation ImportAgentPackage($input: ImportAgentPackageInput!) {
  importAgentPackage(input: $input) {
    ...AgentPackageFields
  }
}
    ${AgentPackageFieldsFragmentDoc}`;

/**
 * __useImportAgentPackageMutation__
 *
 * To run a mutation, you first call `useImportAgentPackageMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useImportAgentPackageMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useImportAgentPackageMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useImportAgentPackageMutation(options: VueApolloComposable.UseMutationOptions<ImportAgentPackageMutation, ImportAgentPackageMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<ImportAgentPackageMutation, ImportAgentPackageMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<ImportAgentPackageMutation, ImportAgentPackageMutationVariables>(ImportAgentPackageDocument, options);
}
export type ImportAgentPackageMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<ImportAgentPackageMutation, ImportAgentPackageMutationVariables>;
export const RemoveAgentPackageDocument = gql`
    mutation RemoveAgentPackage($packageId: String!) {
  removeAgentPackage(packageId: $packageId) {
    ...AgentPackageFields
  }
}
    ${AgentPackageFieldsFragmentDoc}`;

/**
 * __useRemoveAgentPackageMutation__
 *
 * To run a mutation, you first call `useRemoveAgentPackageMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useRemoveAgentPackageMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useRemoveAgentPackageMutation({
 *   variables: {
 *     packageId: // value for 'packageId'
 *   },
 * });
 */
export function useRemoveAgentPackageMutation(options: VueApolloComposable.UseMutationOptions<RemoveAgentPackageMutation, RemoveAgentPackageMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<RemoveAgentPackageMutation, RemoveAgentPackageMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<RemoveAgentPackageMutation, RemoveAgentPackageMutationVariables>(RemoveAgentPackageDocument, options);
}
export type RemoveAgentPackageMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<RemoveAgentPackageMutation, RemoveAgentPackageMutationVariables>;
export const ReloadAgentPackageDocument = gql`
    mutation ReloadAgentPackage($packageId: String!) {
  reloadAgentPackage(packageId: $packageId) {
    ...AgentPackageFields
  }
}
    ${AgentPackageFieldsFragmentDoc}`;

/**
 * __useReloadAgentPackageMutation__
 *
 * To run a mutation, you first call `useReloadAgentPackageMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useReloadAgentPackageMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useReloadAgentPackageMutation({
 *   variables: {
 *     packageId: // value for 'packageId'
 *   },
 * });
 */
export function useReloadAgentPackageMutation(options: VueApolloComposable.UseMutationOptions<ReloadAgentPackageMutation, ReloadAgentPackageMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<ReloadAgentPackageMutation, ReloadAgentPackageMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<ReloadAgentPackageMutation, ReloadAgentPackageMutationVariables>(ReloadAgentPackageDocument, options);
}
export type ReloadAgentPackageMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<ReloadAgentPackageMutation, ReloadAgentPackageMutationVariables>;
export const CheckAgentPackageUpdatesDocument = gql`
    mutation CheckAgentPackageUpdates($packageIds: [String!]) {
  checkAgentPackageUpdates(packageIds: $packageIds) {
    ...AgentPackageFields
  }
}
    ${AgentPackageFieldsFragmentDoc}`;

/**
 * __useCheckAgentPackageUpdatesMutation__
 *
 * To run a mutation, you first call `useCheckAgentPackageUpdatesMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useCheckAgentPackageUpdatesMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useCheckAgentPackageUpdatesMutation({
 *   variables: {
 *     packageIds: // value for 'packageIds'
 *   },
 * });
 */
export function useCheckAgentPackageUpdatesMutation(options: VueApolloComposable.UseMutationOptions<CheckAgentPackageUpdatesMutation, CheckAgentPackageUpdatesMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<CheckAgentPackageUpdatesMutation, CheckAgentPackageUpdatesMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<CheckAgentPackageUpdatesMutation, CheckAgentPackageUpdatesMutationVariables>(CheckAgentPackageUpdatesDocument, options);
}
export type CheckAgentPackageUpdatesMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<CheckAgentPackageUpdatesMutation, CheckAgentPackageUpdatesMutationVariables>;
export const UpdateAgentPackageDocument = gql`
    mutation UpdateAgentPackage($packageId: String!) {
  updateAgentPackage(packageId: $packageId) {
    ...AgentPackageFields
  }
}
    ${AgentPackageFieldsFragmentDoc}`;

/**
 * __useUpdateAgentPackageMutation__
 *
 * To run a mutation, you first call `useUpdateAgentPackageMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useUpdateAgentPackageMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useUpdateAgentPackageMutation({
 *   variables: {
 *     packageId: // value for 'packageId'
 *   },
 * });
 */
export function useUpdateAgentPackageMutation(options: VueApolloComposable.UseMutationOptions<UpdateAgentPackageMutation, UpdateAgentPackageMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<UpdateAgentPackageMutation, UpdateAgentPackageMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<UpdateAgentPackageMutation, UpdateAgentPackageMutationVariables>(UpdateAgentPackageDocument, options);
}
export type UpdateAgentPackageMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<UpdateAgentPackageMutation, UpdateAgentPackageMutationVariables>;
export const GetApplicationPackagesDocument = gql`
    query GetApplicationPackages {
  applicationPackages {
    ...ApplicationPackageListFields
  }
}
    ${ApplicationPackageListFieldsFragmentDoc}`;

/**
 * __useGetApplicationPackagesQuery__
 *
 * To run a query within a Vue component, call `useGetApplicationPackagesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetApplicationPackagesQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetApplicationPackagesQuery();
 */
export function useGetApplicationPackagesQuery(options: VueApolloComposable.UseQueryOptions<GetApplicationPackagesQuery, GetApplicationPackagesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetApplicationPackagesQuery, GetApplicationPackagesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetApplicationPackagesQuery, GetApplicationPackagesQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetApplicationPackagesQuery, GetApplicationPackagesQueryVariables>(GetApplicationPackagesDocument, {}, options);
}
export function useGetApplicationPackagesLazyQuery(options: VueApolloComposable.UseQueryOptions<GetApplicationPackagesQuery, GetApplicationPackagesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetApplicationPackagesQuery, GetApplicationPackagesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetApplicationPackagesQuery, GetApplicationPackagesQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetApplicationPackagesQuery, GetApplicationPackagesQueryVariables>(GetApplicationPackagesDocument, {}, options);
}
export type GetApplicationPackagesQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetApplicationPackagesQuery, GetApplicationPackagesQueryVariables>;
export const GetApplicationPackageDetailsDocument = gql`
    query GetApplicationPackageDetails($packageId: String!) {
  applicationPackageDetails(packageId: $packageId) {
    ...ApplicationPackageDetailsFields
  }
}
    ${ApplicationPackageDetailsFieldsFragmentDoc}`;

/**
 * __useGetApplicationPackageDetailsQuery__
 *
 * To run a query within a Vue component, call `useGetApplicationPackageDetailsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetApplicationPackageDetailsQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetApplicationPackageDetailsQuery({
 *   packageId: // value for 'packageId'
 * });
 */
export function useGetApplicationPackageDetailsQuery(variables: GetApplicationPackageDetailsQueryVariables | VueCompositionApi.Ref<GetApplicationPackageDetailsQueryVariables> | ReactiveFunction<GetApplicationPackageDetailsQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetApplicationPackageDetailsQuery, GetApplicationPackageDetailsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetApplicationPackageDetailsQuery, GetApplicationPackageDetailsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetApplicationPackageDetailsQuery, GetApplicationPackageDetailsQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetApplicationPackageDetailsQuery, GetApplicationPackageDetailsQueryVariables>(GetApplicationPackageDetailsDocument, variables, options);
}
export function useGetApplicationPackageDetailsLazyQuery(variables?: GetApplicationPackageDetailsQueryVariables | VueCompositionApi.Ref<GetApplicationPackageDetailsQueryVariables> | ReactiveFunction<GetApplicationPackageDetailsQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetApplicationPackageDetailsQuery, GetApplicationPackageDetailsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetApplicationPackageDetailsQuery, GetApplicationPackageDetailsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetApplicationPackageDetailsQuery, GetApplicationPackageDetailsQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetApplicationPackageDetailsQuery, GetApplicationPackageDetailsQueryVariables>(GetApplicationPackageDetailsDocument, variables, options);
}
export type GetApplicationPackageDetailsQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetApplicationPackageDetailsQuery, GetApplicationPackageDetailsQueryVariables>;
export const ImportApplicationPackageDocument = gql`
    mutation ImportApplicationPackage($input: ImportApplicationPackageInput!) {
  importApplicationPackage(input: $input) {
    ...ApplicationPackageListFields
  }
}
    ${ApplicationPackageListFieldsFragmentDoc}`;

/**
 * __useImportApplicationPackageMutation__
 *
 * To run a mutation, you first call `useImportApplicationPackageMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useImportApplicationPackageMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useImportApplicationPackageMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useImportApplicationPackageMutation(options: VueApolloComposable.UseMutationOptions<ImportApplicationPackageMutation, ImportApplicationPackageMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<ImportApplicationPackageMutation, ImportApplicationPackageMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<ImportApplicationPackageMutation, ImportApplicationPackageMutationVariables>(ImportApplicationPackageDocument, options);
}
export type ImportApplicationPackageMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<ImportApplicationPackageMutation, ImportApplicationPackageMutationVariables>;
export const RemoveApplicationPackageDocument = gql`
    mutation RemoveApplicationPackage($packageId: String!) {
  removeApplicationPackage(packageId: $packageId) {
    ...ApplicationPackageListFields
  }
}
    ${ApplicationPackageListFieldsFragmentDoc}`;

/**
 * __useRemoveApplicationPackageMutation__
 *
 * To run a mutation, you first call `useRemoveApplicationPackageMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useRemoveApplicationPackageMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useRemoveApplicationPackageMutation({
 *   variables: {
 *     packageId: // value for 'packageId'
 *   },
 * });
 */
export function useRemoveApplicationPackageMutation(options: VueApolloComposable.UseMutationOptions<RemoveApplicationPackageMutation, RemoveApplicationPackageMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<RemoveApplicationPackageMutation, RemoveApplicationPackageMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<RemoveApplicationPackageMutation, RemoveApplicationPackageMutationVariables>(RemoveApplicationPackageDocument, options);
}
export type RemoveApplicationPackageMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<RemoveApplicationPackageMutation, RemoveApplicationPackageMutationVariables>;
export const CreateAgentDefinitionDocument = gql`
    mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
  createAgentDefinition(input: $input) {
    ...AgentDefinitionMutationFields
  }
}
    ${AgentDefinitionMutationFieldsFragmentDoc}`;

/**
 * __useCreateAgentDefinitionMutation__
 *
 * To run a mutation, you first call `useCreateAgentDefinitionMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useCreateAgentDefinitionMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useCreateAgentDefinitionMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useCreateAgentDefinitionMutation(options: VueApolloComposable.UseMutationOptions<CreateAgentDefinitionMutation, CreateAgentDefinitionMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<CreateAgentDefinitionMutation, CreateAgentDefinitionMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<CreateAgentDefinitionMutation, CreateAgentDefinitionMutationVariables>(CreateAgentDefinitionDocument, options);
}
export type CreateAgentDefinitionMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<CreateAgentDefinitionMutation, CreateAgentDefinitionMutationVariables>;
export const UpdateAgentDefinitionDocument = gql`
    mutation UpdateAgentDefinition($input: UpdateAgentDefinitionInput!) {
  updateAgentDefinition(input: $input) {
    ...AgentDefinitionMutationFields
  }
}
    ${AgentDefinitionMutationFieldsFragmentDoc}`;

/**
 * __useUpdateAgentDefinitionMutation__
 *
 * To run a mutation, you first call `useUpdateAgentDefinitionMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useUpdateAgentDefinitionMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useUpdateAgentDefinitionMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useUpdateAgentDefinitionMutation(options: VueApolloComposable.UseMutationOptions<UpdateAgentDefinitionMutation, UpdateAgentDefinitionMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<UpdateAgentDefinitionMutation, UpdateAgentDefinitionMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<UpdateAgentDefinitionMutation, UpdateAgentDefinitionMutationVariables>(UpdateAgentDefinitionDocument, options);
}
export type UpdateAgentDefinitionMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<UpdateAgentDefinitionMutation, UpdateAgentDefinitionMutationVariables>;
export const DeleteAgentDefinitionDocument = gql`
    mutation DeleteAgentDefinition($id: String!) {
  deleteAgentDefinition(id: $id) {
    __typename
    success
    message
  }
}
    `;

/**
 * __useDeleteAgentDefinitionMutation__
 *
 * To run a mutation, you first call `useDeleteAgentDefinitionMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useDeleteAgentDefinitionMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useDeleteAgentDefinitionMutation({
 *   variables: {
 *     id: // value for 'id'
 *   },
 * });
 */
export function useDeleteAgentDefinitionMutation(options: VueApolloComposable.UseMutationOptions<DeleteAgentDefinitionMutation, DeleteAgentDefinitionMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<DeleteAgentDefinitionMutation, DeleteAgentDefinitionMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<DeleteAgentDefinitionMutation, DeleteAgentDefinitionMutationVariables>(DeleteAgentDefinitionDocument, options);
}
export type DeleteAgentDefinitionMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<DeleteAgentDefinitionMutation, DeleteAgentDefinitionMutationVariables>;
export const RefreshAgentDefinitionCatalogDocument = gql`
    mutation RefreshAgentDefinitionCatalog {
  refreshAgentDefinitionCatalog
}
    `;

/**
 * __useRefreshAgentDefinitionCatalogMutation__
 *
 * To run a mutation, you first call `useRefreshAgentDefinitionCatalogMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useRefreshAgentDefinitionCatalogMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useRefreshAgentDefinitionCatalogMutation();
 */
export function useRefreshAgentDefinitionCatalogMutation(options: VueApolloComposable.UseMutationOptions<RefreshAgentDefinitionCatalogMutation, RefreshAgentDefinitionCatalogMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<RefreshAgentDefinitionCatalogMutation, RefreshAgentDefinitionCatalogMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<RefreshAgentDefinitionCatalogMutation, RefreshAgentDefinitionCatalogMutationVariables>(RefreshAgentDefinitionCatalogDocument, options);
}
export type RefreshAgentDefinitionCatalogMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<RefreshAgentDefinitionCatalogMutation, RefreshAgentDefinitionCatalogMutationVariables>;
export const TerminateAgentRunDocument = gql`
    mutation TerminateAgentRun($agentRunId: String!) {
  terminateAgentRun(agentRunId: $agentRunId) {
    __typename
    success
    message
  }
}
    `;

/**
 * __useTerminateAgentRunMutation__
 *
 * To run a mutation, you first call `useTerminateAgentRunMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useTerminateAgentRunMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useTerminateAgentRunMutation({
 *   variables: {
 *     agentRunId: // value for 'agentRunId'
 *   },
 * });
 */
export function useTerminateAgentRunMutation(options: VueApolloComposable.UseMutationOptions<TerminateAgentRunMutation, TerminateAgentRunMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<TerminateAgentRunMutation, TerminateAgentRunMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<TerminateAgentRunMutation, TerminateAgentRunMutationVariables>(TerminateAgentRunDocument, options);
}
export type TerminateAgentRunMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<TerminateAgentRunMutation, TerminateAgentRunMutationVariables>;
export const CreateAgentRunDocument = gql`
    mutation CreateAgentRun($input: CreateAgentRunInput!) {
  createAgentRun(input: $input) {
    success
    message
    runId
  }
}
    `;

/**
 * __useCreateAgentRunMutation__
 *
 * To run a mutation, you first call `useCreateAgentRunMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useCreateAgentRunMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useCreateAgentRunMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useCreateAgentRunMutation(options: VueApolloComposable.UseMutationOptions<CreateAgentRunMutation, CreateAgentRunMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<CreateAgentRunMutation, CreateAgentRunMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<CreateAgentRunMutation, CreateAgentRunMutationVariables>(CreateAgentRunDocument, options);
}
export type CreateAgentRunMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<CreateAgentRunMutation, CreateAgentRunMutationVariables>;
export const PrepareAgentRunDocument = gql`
    mutation PrepareAgentRun($input: CreateAgentRunInput!) {
  prepareAgentRun(input: $input) {
    success
    message
    runId
    activationState
    preparedExpiresAt
  }
}
    `;

/**
 * __usePrepareAgentRunMutation__
 *
 * To run a mutation, you first call `usePrepareAgentRunMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `usePrepareAgentRunMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = usePrepareAgentRunMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function usePrepareAgentRunMutation(options: VueApolloComposable.UseMutationOptions<PrepareAgentRunMutation, PrepareAgentRunMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<PrepareAgentRunMutation, PrepareAgentRunMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<PrepareAgentRunMutation, PrepareAgentRunMutationVariables>(PrepareAgentRunDocument, options);
}
export type PrepareAgentRunMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<PrepareAgentRunMutation, PrepareAgentRunMutationVariables>;
export const CancelPreparedAgentRunDocument = gql`
    mutation CancelPreparedAgentRun($agentRunId: String!) {
  cancelPreparedAgentRun(agentRunId: $agentRunId) {
    success
    message
  }
}
    `;

/**
 * __useCancelPreparedAgentRunMutation__
 *
 * To run a mutation, you first call `useCancelPreparedAgentRunMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useCancelPreparedAgentRunMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useCancelPreparedAgentRunMutation({
 *   variables: {
 *     agentRunId: // value for 'agentRunId'
 *   },
 * });
 */
export function useCancelPreparedAgentRunMutation(options: VueApolloComposable.UseMutationOptions<CancelPreparedAgentRunMutation, CancelPreparedAgentRunMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<CancelPreparedAgentRunMutation, CancelPreparedAgentRunMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<CancelPreparedAgentRunMutation, CancelPreparedAgentRunMutationVariables>(CancelPreparedAgentRunDocument, options);
}
export type CancelPreparedAgentRunMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<CancelPreparedAgentRunMutation, CancelPreparedAgentRunMutationVariables>;
export const RestoreAgentRunDocument = gql`
    mutation RestoreAgentRun($agentRunId: String!) {
  restoreAgentRun(agentRunId: $agentRunId) {
    __typename
    success
    message
    runId
  }
}
    `;

/**
 * __useRestoreAgentRunMutation__
 *
 * To run a mutation, you first call `useRestoreAgentRunMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useRestoreAgentRunMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useRestoreAgentRunMutation({
 *   variables: {
 *     agentRunId: // value for 'agentRunId'
 *   },
 * });
 */
export function useRestoreAgentRunMutation(options: VueApolloComposable.UseMutationOptions<RestoreAgentRunMutation, RestoreAgentRunMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<RestoreAgentRunMutation, RestoreAgentRunMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<RestoreAgentRunMutation, RestoreAgentRunMutationVariables>(RestoreAgentRunDocument, options);
}
export type RestoreAgentRunMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<RestoreAgentRunMutation, RestoreAgentRunMutationVariables>;
export const ApproveToolInvocationDocument = gql`
    mutation ApproveToolInvocation($input: ApproveToolInvocationInput!) {
  approveToolInvocation(input: $input) {
    __typename
    success
    message
  }
}
    `;

/**
 * __useApproveToolInvocationMutation__
 *
 * To run a mutation, you first call `useApproveToolInvocationMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useApproveToolInvocationMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useApproveToolInvocationMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useApproveToolInvocationMutation(options: VueApolloComposable.UseMutationOptions<ApproveToolInvocationMutation, ApproveToolInvocationMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<ApproveToolInvocationMutation, ApproveToolInvocationMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<ApproveToolInvocationMutation, ApproveToolInvocationMutationVariables>(ApproveToolInvocationDocument, options);
}
export type ApproveToolInvocationMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<ApproveToolInvocationMutation, ApproveToolInvocationMutationVariables>;
export const CreateAgentTeamDefinitionDocument = gql`
    mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
  createAgentTeamDefinition(input: $input) {
    ...AgentTeamDefinitionMutationFields
  }
}
    ${AgentTeamDefinitionMutationFieldsFragmentDoc}`;

/**
 * __useCreateAgentTeamDefinitionMutation__
 *
 * To run a mutation, you first call `useCreateAgentTeamDefinitionMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useCreateAgentTeamDefinitionMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useCreateAgentTeamDefinitionMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useCreateAgentTeamDefinitionMutation(options: VueApolloComposable.UseMutationOptions<CreateAgentTeamDefinitionMutation, CreateAgentTeamDefinitionMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<CreateAgentTeamDefinitionMutation, CreateAgentTeamDefinitionMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<CreateAgentTeamDefinitionMutation, CreateAgentTeamDefinitionMutationVariables>(CreateAgentTeamDefinitionDocument, options);
}
export type CreateAgentTeamDefinitionMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<CreateAgentTeamDefinitionMutation, CreateAgentTeamDefinitionMutationVariables>;
export const UpdateAgentTeamDefinitionDocument = gql`
    mutation UpdateAgentTeamDefinition($input: UpdateAgentTeamDefinitionInput!) {
  updateAgentTeamDefinition(input: $input) {
    ...AgentTeamDefinitionMutationFields
  }
}
    ${AgentTeamDefinitionMutationFieldsFragmentDoc}`;

/**
 * __useUpdateAgentTeamDefinitionMutation__
 *
 * To run a mutation, you first call `useUpdateAgentTeamDefinitionMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useUpdateAgentTeamDefinitionMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useUpdateAgentTeamDefinitionMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useUpdateAgentTeamDefinitionMutation(options: VueApolloComposable.UseMutationOptions<UpdateAgentTeamDefinitionMutation, UpdateAgentTeamDefinitionMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<UpdateAgentTeamDefinitionMutation, UpdateAgentTeamDefinitionMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<UpdateAgentTeamDefinitionMutation, UpdateAgentTeamDefinitionMutationVariables>(UpdateAgentTeamDefinitionDocument, options);
}
export type UpdateAgentTeamDefinitionMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<UpdateAgentTeamDefinitionMutation, UpdateAgentTeamDefinitionMutationVariables>;
export const DeleteAgentTeamDefinitionDocument = gql`
    mutation DeleteAgentTeamDefinition($id: String!) {
  deleteAgentTeamDefinition(id: $id) {
    __typename
    success
    message
  }
}
    `;

/**
 * __useDeleteAgentTeamDefinitionMutation__
 *
 * To run a mutation, you first call `useDeleteAgentTeamDefinitionMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useDeleteAgentTeamDefinitionMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useDeleteAgentTeamDefinitionMutation({
 *   variables: {
 *     id: // value for 'id'
 *   },
 * });
 */
export function useDeleteAgentTeamDefinitionMutation(options: VueApolloComposable.UseMutationOptions<DeleteAgentTeamDefinitionMutation, DeleteAgentTeamDefinitionMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<DeleteAgentTeamDefinitionMutation, DeleteAgentTeamDefinitionMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<DeleteAgentTeamDefinitionMutation, DeleteAgentTeamDefinitionMutationVariables>(DeleteAgentTeamDefinitionDocument, options);
}
export type DeleteAgentTeamDefinitionMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<DeleteAgentTeamDefinitionMutation, DeleteAgentTeamDefinitionMutationVariables>;
export const RefreshAgentTeamDefinitionCatalogDocument = gql`
    mutation RefreshAgentTeamDefinitionCatalog {
  refreshAgentTeamDefinitionCatalog
}
    `;

/**
 * __useRefreshAgentTeamDefinitionCatalogMutation__
 *
 * To run a mutation, you first call `useRefreshAgentTeamDefinitionCatalogMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useRefreshAgentTeamDefinitionCatalogMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useRefreshAgentTeamDefinitionCatalogMutation();
 */
export function useRefreshAgentTeamDefinitionCatalogMutation(options: VueApolloComposable.UseMutationOptions<RefreshAgentTeamDefinitionCatalogMutation, RefreshAgentTeamDefinitionCatalogMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<RefreshAgentTeamDefinitionCatalogMutation, RefreshAgentTeamDefinitionCatalogMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<RefreshAgentTeamDefinitionCatalogMutation, RefreshAgentTeamDefinitionCatalogMutationVariables>(RefreshAgentTeamDefinitionCatalogDocument, options);
}
export type RefreshAgentTeamDefinitionCatalogMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<RefreshAgentTeamDefinitionCatalogMutation, RefreshAgentTeamDefinitionCatalogMutationVariables>;
export const CreateAgentTeamRunDocument = gql`
    mutation CreateAgentTeamRun($input: CreateAgentTeamRunInput!) {
  createAgentTeamRun(input: $input) {
    __typename
    success
    message
    teamRunId
  }
}
    `;

/**
 * __useCreateAgentTeamRunMutation__
 *
 * To run a mutation, you first call `useCreateAgentTeamRunMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useCreateAgentTeamRunMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useCreateAgentTeamRunMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useCreateAgentTeamRunMutation(options: VueApolloComposable.UseMutationOptions<CreateAgentTeamRunMutation, CreateAgentTeamRunMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<CreateAgentTeamRunMutation, CreateAgentTeamRunMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<CreateAgentTeamRunMutation, CreateAgentTeamRunMutationVariables>(CreateAgentTeamRunDocument, options);
}
export type CreateAgentTeamRunMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<CreateAgentTeamRunMutation, CreateAgentTeamRunMutationVariables>;
export const TerminateAgentTeamRunDocument = gql`
    mutation TerminateAgentTeamRun($teamRunId: String!) {
  terminateAgentTeamRun(teamRunId: $teamRunId) {
    __typename
    success
    message
  }
}
    `;

/**
 * __useTerminateAgentTeamRunMutation__
 *
 * To run a mutation, you first call `useTerminateAgentTeamRunMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useTerminateAgentTeamRunMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useTerminateAgentTeamRunMutation({
 *   variables: {
 *     teamRunId: // value for 'teamRunId'
 *   },
 * });
 */
export function useTerminateAgentTeamRunMutation(options: VueApolloComposable.UseMutationOptions<TerminateAgentTeamRunMutation, TerminateAgentTeamRunMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<TerminateAgentTeamRunMutation, TerminateAgentTeamRunMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<TerminateAgentTeamRunMutation, TerminateAgentTeamRunMutationVariables>(TerminateAgentTeamRunDocument, options);
}
export type TerminateAgentTeamRunMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<TerminateAgentTeamRunMutation, TerminateAgentTeamRunMutationVariables>;
export const RestoreAgentTeamRunDocument = gql`
    mutation RestoreAgentTeamRun($teamRunId: String!) {
  restoreAgentTeamRun(teamRunId: $teamRunId) {
    __typename
    success
    message
    teamRunId
  }
}
    `;

/**
 * __useRestoreAgentTeamRunMutation__
 *
 * To run a mutation, you first call `useRestoreAgentTeamRunMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useRestoreAgentTeamRunMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useRestoreAgentTeamRunMutation({
 *   variables: {
 *     teamRunId: // value for 'teamRunId'
 *   },
 * });
 */
export function useRestoreAgentTeamRunMutation(options: VueApolloComposable.UseMutationOptions<RestoreAgentTeamRunMutation, RestoreAgentTeamRunMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<RestoreAgentTeamRunMutation, RestoreAgentTeamRunMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<RestoreAgentTeamRunMutation, RestoreAgentTeamRunMutationVariables>(RestoreAgentTeamRunDocument, options);
}
export type RestoreAgentTeamRunMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<RestoreAgentTeamRunMutation, RestoreAgentTeamRunMutationVariables>;
export const RunAppDataMigrationDocument = gql`
    mutation RunAppDataMigration($migrationId: String!) {
  runAppDataMigration(migrationId: $migrationId) {
    success
    message
    migration {
      migrationId
      displayName
      description
      status
      requiredOnStartup
      canRetry
      attempts
      startedAt
      completedAt
      summary
      errorMessage
      logPath
    }
  }
}
    `;

/**
 * __useRunAppDataMigrationMutation__
 *
 * To run a mutation, you first call `useRunAppDataMigrationMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useRunAppDataMigrationMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useRunAppDataMigrationMutation({
 *   variables: {
 *     migrationId: // value for 'migrationId'
 *   },
 * });
 */
export function useRunAppDataMigrationMutation(options: VueApolloComposable.UseMutationOptions<RunAppDataMigrationMutation, RunAppDataMigrationMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<RunAppDataMigrationMutation, RunAppDataMigrationMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<RunAppDataMigrationMutation, RunAppDataMigrationMutationVariables>(RunAppDataMigrationDocument, options);
}
export type RunAppDataMigrationMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<RunAppDataMigrationMutation, RunAppDataMigrationMutationVariables>;
export const SetApplicationsEnabledDocument = gql`
    mutation SetApplicationsEnabled($enabled: Boolean!) {
  setApplicationsEnabled(enabled: $enabled) {
    ...ApplicationsCapabilityFields
  }
}
    ${ApplicationsCapabilityFieldsFragmentDoc}`;

/**
 * __useSetApplicationsEnabledMutation__
 *
 * To run a mutation, you first call `useSetApplicationsEnabledMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useSetApplicationsEnabledMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useSetApplicationsEnabledMutation({
 *   variables: {
 *     enabled: // value for 'enabled'
 *   },
 * });
 */
export function useSetApplicationsEnabledMutation(options: VueApolloComposable.UseMutationOptions<SetApplicationsEnabledMutation, SetApplicationsEnabledMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<SetApplicationsEnabledMutation, SetApplicationsEnabledMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<SetApplicationsEnabledMutation, SetApplicationsEnabledMutationVariables>(SetApplicationsEnabledDocument, options);
}
export type SetApplicationsEnabledMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<SetApplicationsEnabledMutation, SetApplicationsEnabledMutationVariables>;
export const UpsertExternalChannelBindingDocument = gql`
    mutation UpsertExternalChannelBinding($input: UpsertExternalChannelBindingInput!) {
  upsertExternalChannelBinding(input: $input) {
    __typename
    id
    provider
    transport
    accountId
    peerId
    threadId
    targetType
    targetAgentDefinitionId
    targetTeamDefinitionId
    launchPreset {
      workspaceRootPath
      llmModelIdentifier
      runtimeKind
      autoExecuteTools
      skillAccessMode
      llmConfig
    }
    teamLaunchPreset {
      workspaceRootPath
      llmModelIdentifier
      runtimeKind
      autoExecuteTools
      skillAccessMode
      llmConfig
    }
    teamRunId
    updatedAt
  }
}
    `;

/**
 * __useUpsertExternalChannelBindingMutation__
 *
 * To run a mutation, you first call `useUpsertExternalChannelBindingMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useUpsertExternalChannelBindingMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useUpsertExternalChannelBindingMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useUpsertExternalChannelBindingMutation(options: VueApolloComposable.UseMutationOptions<UpsertExternalChannelBindingMutation, UpsertExternalChannelBindingMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<UpsertExternalChannelBindingMutation, UpsertExternalChannelBindingMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<UpsertExternalChannelBindingMutation, UpsertExternalChannelBindingMutationVariables>(UpsertExternalChannelBindingDocument, options);
}
export type UpsertExternalChannelBindingMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<UpsertExternalChannelBindingMutation, UpsertExternalChannelBindingMutationVariables>;
export const DeleteExternalChannelBindingDocument = gql`
    mutation DeleteExternalChannelBinding($id: String!) {
  deleteExternalChannelBinding(id: $id)
}
    `;

/**
 * __useDeleteExternalChannelBindingMutation__
 *
 * To run a mutation, you first call `useDeleteExternalChannelBindingMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useDeleteExternalChannelBindingMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useDeleteExternalChannelBindingMutation({
 *   variables: {
 *     id: // value for 'id'
 *   },
 * });
 */
export function useDeleteExternalChannelBindingMutation(options: VueApolloComposable.UseMutationOptions<DeleteExternalChannelBindingMutation, DeleteExternalChannelBindingMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<DeleteExternalChannelBindingMutation, DeleteExternalChannelBindingMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<DeleteExternalChannelBindingMutation, DeleteExternalChannelBindingMutationVariables>(DeleteExternalChannelBindingDocument, options);
}
export type DeleteExternalChannelBindingMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<DeleteExternalChannelBindingMutation, DeleteExternalChannelBindingMutationVariables>;
export const WriteFileContentDocument = gql`
    mutation WriteFileContent($workspaceId: String!, $filePath: String!, $content: String!) {
  writeFileContent(
    workspaceId: $workspaceId
    filePath: $filePath
    content: $content
  )
}
    `;

/**
 * __useWriteFileContentMutation__
 *
 * To run a mutation, you first call `useWriteFileContentMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useWriteFileContentMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useWriteFileContentMutation({
 *   variables: {
 *     workspaceId: // value for 'workspaceId'
 *     filePath: // value for 'filePath'
 *     content: // value for 'content'
 *   },
 * });
 */
export function useWriteFileContentMutation(options: VueApolloComposable.UseMutationOptions<WriteFileContentMutation, WriteFileContentMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<WriteFileContentMutation, WriteFileContentMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<WriteFileContentMutation, WriteFileContentMutationVariables>(WriteFileContentDocument, options);
}
export type WriteFileContentMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<WriteFileContentMutation, WriteFileContentMutationVariables>;
export const DeleteFileOrFolderDocument = gql`
    mutation DeleteFileOrFolder($workspaceId: String!, $path: String!) {
  deleteFileOrFolder(workspaceId: $workspaceId, path: $path)
}
    `;

/**
 * __useDeleteFileOrFolderMutation__
 *
 * To run a mutation, you first call `useDeleteFileOrFolderMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useDeleteFileOrFolderMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useDeleteFileOrFolderMutation({
 *   variables: {
 *     workspaceId: // value for 'workspaceId'
 *     path: // value for 'path'
 *   },
 * });
 */
export function useDeleteFileOrFolderMutation(options: VueApolloComposable.UseMutationOptions<DeleteFileOrFolderMutation, DeleteFileOrFolderMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<DeleteFileOrFolderMutation, DeleteFileOrFolderMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<DeleteFileOrFolderMutation, DeleteFileOrFolderMutationVariables>(DeleteFileOrFolderDocument, options);
}
export type DeleteFileOrFolderMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<DeleteFileOrFolderMutation, DeleteFileOrFolderMutationVariables>;
export const MoveFileOrFolderDocument = gql`
    mutation MoveFileOrFolder($workspaceId: String!, $sourcePath: String!, $destinationPath: String!) {
  moveFileOrFolder(
    workspaceId: $workspaceId
    sourcePath: $sourcePath
    destinationPath: $destinationPath
  )
}
    `;

/**
 * __useMoveFileOrFolderMutation__
 *
 * To run a mutation, you first call `useMoveFileOrFolderMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useMoveFileOrFolderMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useMoveFileOrFolderMutation({
 *   variables: {
 *     workspaceId: // value for 'workspaceId'
 *     sourcePath: // value for 'sourcePath'
 *     destinationPath: // value for 'destinationPath'
 *   },
 * });
 */
export function useMoveFileOrFolderMutation(options: VueApolloComposable.UseMutationOptions<MoveFileOrFolderMutation, MoveFileOrFolderMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<MoveFileOrFolderMutation, MoveFileOrFolderMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<MoveFileOrFolderMutation, MoveFileOrFolderMutationVariables>(MoveFileOrFolderDocument, options);
}
export type MoveFileOrFolderMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<MoveFileOrFolderMutation, MoveFileOrFolderMutationVariables>;
export const RenameFileOrFolderDocument = gql`
    mutation RenameFileOrFolder($workspaceId: String!, $targetPath: String!, $newName: String!) {
  renameFileOrFolder(
    workspaceId: $workspaceId
    targetPath: $targetPath
    newName: $newName
  )
}
    `;

/**
 * __useRenameFileOrFolderMutation__
 *
 * To run a mutation, you first call `useRenameFileOrFolderMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useRenameFileOrFolderMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useRenameFileOrFolderMutation({
 *   variables: {
 *     workspaceId: // value for 'workspaceId'
 *     targetPath: // value for 'targetPath'
 *     newName: // value for 'newName'
 *   },
 * });
 */
export function useRenameFileOrFolderMutation(options: VueApolloComposable.UseMutationOptions<RenameFileOrFolderMutation, RenameFileOrFolderMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<RenameFileOrFolderMutation, RenameFileOrFolderMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<RenameFileOrFolderMutation, RenameFileOrFolderMutationVariables>(RenameFileOrFolderDocument, options);
}
export type RenameFileOrFolderMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<RenameFileOrFolderMutation, RenameFileOrFolderMutationVariables>;
export const CreateFileOrFolderDocument = gql`
    mutation CreateFileOrFolder($workspaceId: String!, $path: String!, $isFile: Boolean!) {
  createFileOrFolder(workspaceId: $workspaceId, path: $path, isFile: $isFile)
}
    `;

/**
 * __useCreateFileOrFolderMutation__
 *
 * To run a mutation, you first call `useCreateFileOrFolderMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useCreateFileOrFolderMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useCreateFileOrFolderMutation({
 *   variables: {
 *     workspaceId: // value for 'workspaceId'
 *     path: // value for 'path'
 *     isFile: // value for 'isFile'
 *   },
 * });
 */
export function useCreateFileOrFolderMutation(options: VueApolloComposable.UseMutationOptions<CreateFileOrFolderMutation, CreateFileOrFolderMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<CreateFileOrFolderMutation, CreateFileOrFolderMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<CreateFileOrFolderMutation, CreateFileOrFolderMutationVariables>(CreateFileOrFolderDocument, options);
}
export type CreateFileOrFolderMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<CreateFileOrFolderMutation, CreateFileOrFolderMutationVariables>;
export const SetLlmProviderApiKeyDocument = gql`
    mutation SetLLMProviderApiKey($providerId: String!, $apiKey: String!) {
  setLlmProviderApiKey(providerId: $providerId, apiKey: $apiKey)
}
    `;

/**
 * __useSetLlmProviderApiKeyMutation__
 *
 * To run a mutation, you first call `useSetLlmProviderApiKeyMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useSetLlmProviderApiKeyMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useSetLlmProviderApiKeyMutation({
 *   variables: {
 *     providerId: // value for 'providerId'
 *     apiKey: // value for 'apiKey'
 *   },
 * });
 */
export function useSetLlmProviderApiKeyMutation(options: VueApolloComposable.UseMutationOptions<SetLlmProviderApiKeyMutation, SetLlmProviderApiKeyMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<SetLlmProviderApiKeyMutation, SetLlmProviderApiKeyMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<SetLlmProviderApiKeyMutation, SetLlmProviderApiKeyMutationVariables>(SetLlmProviderApiKeyDocument, options);
}
export type SetLlmProviderApiKeyMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<SetLlmProviderApiKeyMutation, SetLlmProviderApiKeyMutationVariables>;
export const ReloadLlmModelsDocument = gql`
    mutation ReloadLLMModels($runtimeKind: String) {
  reloadLlmModels(runtimeKind: $runtimeKind)
}
    `;

/**
 * __useReloadLlmModelsMutation__
 *
 * To run a mutation, you first call `useReloadLlmModelsMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useReloadLlmModelsMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useReloadLlmModelsMutation({
 *   variables: {
 *     runtimeKind: // value for 'runtimeKind'
 *   },
 * });
 */
export function useReloadLlmModelsMutation(options: VueApolloComposable.UseMutationOptions<ReloadLlmModelsMutation, ReloadLlmModelsMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<ReloadLlmModelsMutation, ReloadLlmModelsMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<ReloadLlmModelsMutation, ReloadLlmModelsMutationVariables>(ReloadLlmModelsDocument, options);
}
export type ReloadLlmModelsMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<ReloadLlmModelsMutation, ReloadLlmModelsMutationVariables>;
export const ReloadLlmProviderModelsDocument = gql`
    mutation ReloadLLMProviderModels($providerId: String!, $runtimeKind: String) {
  reloadLlmProviderModels(providerId: $providerId, runtimeKind: $runtimeKind)
}
    `;

/**
 * __useReloadLlmProviderModelsMutation__
 *
 * To run a mutation, you first call `useReloadLlmProviderModelsMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useReloadLlmProviderModelsMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useReloadLlmProviderModelsMutation({
 *   variables: {
 *     providerId: // value for 'providerId'
 *     runtimeKind: // value for 'runtimeKind'
 *   },
 * });
 */
export function useReloadLlmProviderModelsMutation(options: VueApolloComposable.UseMutationOptions<ReloadLlmProviderModelsMutation, ReloadLlmProviderModelsMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<ReloadLlmProviderModelsMutation, ReloadLlmProviderModelsMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<ReloadLlmProviderModelsMutation, ReloadLlmProviderModelsMutationVariables>(ReloadLlmProviderModelsDocument, options);
}
export type ReloadLlmProviderModelsMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<ReloadLlmProviderModelsMutation, ReloadLlmProviderModelsMutationVariables>;
export const ProbeCustomLlmProviderDocument = gql`
    mutation ProbeCustomLlmProvider($input: CustomLlmProviderInputObject!) {
  probeCustomLlmProvider(input: $input) {
    name
    providerType
    baseUrl
    discoveredModels {
      id
      name
    }
  }
}
    `;

/**
 * __useProbeCustomLlmProviderMutation__
 *
 * To run a mutation, you first call `useProbeCustomLlmProviderMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useProbeCustomLlmProviderMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useProbeCustomLlmProviderMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useProbeCustomLlmProviderMutation(options: VueApolloComposable.UseMutationOptions<ProbeCustomLlmProviderMutation, ProbeCustomLlmProviderMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<ProbeCustomLlmProviderMutation, ProbeCustomLlmProviderMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<ProbeCustomLlmProviderMutation, ProbeCustomLlmProviderMutationVariables>(ProbeCustomLlmProviderDocument, options);
}
export type ProbeCustomLlmProviderMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<ProbeCustomLlmProviderMutation, ProbeCustomLlmProviderMutationVariables>;
export const CreateCustomLlmProviderDocument = gql`
    mutation CreateCustomLlmProvider($input: CustomLlmProviderInputObject!, $runtimeKind: String) {
  createCustomLlmProvider(input: $input, runtimeKind: $runtimeKind) {
    id
    name
    providerType
    isCustom
    baseUrl
    apiKeyConfigured
    status
    statusMessage
  }
}
    `;

/**
 * __useCreateCustomLlmProviderMutation__
 *
 * To run a mutation, you first call `useCreateCustomLlmProviderMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useCreateCustomLlmProviderMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useCreateCustomLlmProviderMutation({
 *   variables: {
 *     input: // value for 'input'
 *     runtimeKind: // value for 'runtimeKind'
 *   },
 * });
 */
export function useCreateCustomLlmProviderMutation(options: VueApolloComposable.UseMutationOptions<CreateCustomLlmProviderMutation, CreateCustomLlmProviderMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<CreateCustomLlmProviderMutation, CreateCustomLlmProviderMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<CreateCustomLlmProviderMutation, CreateCustomLlmProviderMutationVariables>(CreateCustomLlmProviderDocument, options);
}
export type CreateCustomLlmProviderMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<CreateCustomLlmProviderMutation, CreateCustomLlmProviderMutationVariables>;
export const DeleteCustomLlmProviderDocument = gql`
    mutation DeleteCustomLlmProvider($providerId: String!, $runtimeKind: String) {
  deleteCustomLlmProvider(providerId: $providerId, runtimeKind: $runtimeKind)
}
    `;

/**
 * __useDeleteCustomLlmProviderMutation__
 *
 * To run a mutation, you first call `useDeleteCustomLlmProviderMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useDeleteCustomLlmProviderMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useDeleteCustomLlmProviderMutation({
 *   variables: {
 *     providerId: // value for 'providerId'
 *     runtimeKind: // value for 'runtimeKind'
 *   },
 * });
 */
export function useDeleteCustomLlmProviderMutation(options: VueApolloComposable.UseMutationOptions<DeleteCustomLlmProviderMutation, DeleteCustomLlmProviderMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<DeleteCustomLlmProviderMutation, DeleteCustomLlmProviderMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<DeleteCustomLlmProviderMutation, DeleteCustomLlmProviderMutationVariables>(DeleteCustomLlmProviderDocument, options);
}
export type DeleteCustomLlmProviderMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<DeleteCustomLlmProviderMutation, DeleteCustomLlmProviderMutationVariables>;
export const SetGeminiSetupConfigDocument = gql`
    mutation SetGeminiSetupConfig($mode: String!, $geminiApiKey: String, $vertexApiKey: String, $vertexProject: String, $vertexLocation: String) {
  setGeminiSetupConfig(
    mode: $mode
    geminiApiKey: $geminiApiKey
    vertexApiKey: $vertexApiKey
    vertexProject: $vertexProject
    vertexLocation: $vertexLocation
  )
}
    `;

/**
 * __useSetGeminiSetupConfigMutation__
 *
 * To run a mutation, you first call `useSetGeminiSetupConfigMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useSetGeminiSetupConfigMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useSetGeminiSetupConfigMutation({
 *   variables: {
 *     mode: // value for 'mode'
 *     geminiApiKey: // value for 'geminiApiKey'
 *     vertexApiKey: // value for 'vertexApiKey'
 *     vertexProject: // value for 'vertexProject'
 *     vertexLocation: // value for 'vertexLocation'
 *   },
 * });
 */
export function useSetGeminiSetupConfigMutation(options: VueApolloComposable.UseMutationOptions<SetGeminiSetupConfigMutation, SetGeminiSetupConfigMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<SetGeminiSetupConfigMutation, SetGeminiSetupConfigMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<SetGeminiSetupConfigMutation, SetGeminiSetupConfigMutationVariables>(SetGeminiSetupConfigDocument, options);
}
export type SetGeminiSetupConfigMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<SetGeminiSetupConfigMutation, SetGeminiSetupConfigMutationVariables>;
export const ConfigureMcpServerDocument = gql`
    mutation ConfigureMcpServer($input: McpServerInput!) {
  configureMcpServer(input: $input) {
    savedConfig {
      __typename
      ... on StdioMcpServerConfig {
        serverId
        transportType
        enabled
        toolNamePrefix
        command
        args
        env
        cwd
      }
      ... on StreamableHttpMcpServerConfig {
        serverId
        transportType
        enabled
        toolNamePrefix
        url
        token
        headers
      }
    }
  }
}
    `;

/**
 * __useConfigureMcpServerMutation__
 *
 * To run a mutation, you first call `useConfigureMcpServerMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useConfigureMcpServerMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useConfigureMcpServerMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useConfigureMcpServerMutation(options: VueApolloComposable.UseMutationOptions<ConfigureMcpServerMutation, ConfigureMcpServerMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<ConfigureMcpServerMutation, ConfigureMcpServerMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<ConfigureMcpServerMutation, ConfigureMcpServerMutationVariables>(ConfigureMcpServerDocument, options);
}
export type ConfigureMcpServerMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<ConfigureMcpServerMutation, ConfigureMcpServerMutationVariables>;
export const DeleteMcpServerDocument = gql`
    mutation DeleteMcpServer($serverId: String!) {
  deleteMcpServer(serverId: $serverId) {
    __typename
    success
    message
  }
}
    `;

/**
 * __useDeleteMcpServerMutation__
 *
 * To run a mutation, you first call `useDeleteMcpServerMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useDeleteMcpServerMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useDeleteMcpServerMutation({
 *   variables: {
 *     serverId: // value for 'serverId'
 *   },
 * });
 */
export function useDeleteMcpServerMutation(options: VueApolloComposable.UseMutationOptions<DeleteMcpServerMutation, DeleteMcpServerMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<DeleteMcpServerMutation, DeleteMcpServerMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<DeleteMcpServerMutation, DeleteMcpServerMutationVariables>(DeleteMcpServerDocument, options);
}
export type DeleteMcpServerMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<DeleteMcpServerMutation, DeleteMcpServerMutationVariables>;
export const DiscoverAndRegisterMcpServerToolsDocument = gql`
    mutation DiscoverAndRegisterMcpServerTools($serverId: String!) {
  discoverAndRegisterMcpServerTools(serverId: $serverId) {
    __typename
    success
    message
    discoveredTools {
      __typename
      name
      description
      origin
      category
      argumentSchema {
        __typename
        parameters {
          __typename
          name
          paramType
          description
          required
          defaultValue
          enumValues
          jsonSchema
        }
      }
    }
  }
}
    `;

/**
 * __useDiscoverAndRegisterMcpServerToolsMutation__
 *
 * To run a mutation, you first call `useDiscoverAndRegisterMcpServerToolsMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useDiscoverAndRegisterMcpServerToolsMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useDiscoverAndRegisterMcpServerToolsMutation({
 *   variables: {
 *     serverId: // value for 'serverId'
 *   },
 * });
 */
export function useDiscoverAndRegisterMcpServerToolsMutation(options: VueApolloComposable.UseMutationOptions<DiscoverAndRegisterMcpServerToolsMutation, DiscoverAndRegisterMcpServerToolsMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<DiscoverAndRegisterMcpServerToolsMutation, DiscoverAndRegisterMcpServerToolsMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<DiscoverAndRegisterMcpServerToolsMutation, DiscoverAndRegisterMcpServerToolsMutationVariables>(DiscoverAndRegisterMcpServerToolsDocument, options);
}
export type DiscoverAndRegisterMcpServerToolsMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<DiscoverAndRegisterMcpServerToolsMutation, DiscoverAndRegisterMcpServerToolsMutationVariables>;
export const ImportMcpServerConfigsDocument = gql`
    mutation ImportMcpServerConfigs($jsonString: String!) {
  importMcpServerConfigs(jsonString: $jsonString) {
    __typename
    success
    message
    importedCount
    failedCount
  }
}
    `;

/**
 * __useImportMcpServerConfigsMutation__
 *
 * To run a mutation, you first call `useImportMcpServerConfigsMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useImportMcpServerConfigsMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useImportMcpServerConfigsMutation({
 *   variables: {
 *     jsonString: // value for 'jsonString'
 *   },
 * });
 */
export function useImportMcpServerConfigsMutation(options: VueApolloComposable.UseMutationOptions<ImportMcpServerConfigsMutation, ImportMcpServerConfigsMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<ImportMcpServerConfigsMutation, ImportMcpServerConfigsMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<ImportMcpServerConfigsMutation, ImportMcpServerConfigsMutationVariables>(ImportMcpServerConfigsDocument, options);
}
export type ImportMcpServerConfigsMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<ImportMcpServerConfigsMutation, ImportMcpServerConfigsMutationVariables>;
export const DeleteStoredRunDocument = gql`
    mutation DeleteStoredRun($runId: String!) {
  deleteStoredRun(runId: $runId) {
    success
    message
  }
}
    `;

/**
 * __useDeleteStoredRunMutation__
 *
 * To run a mutation, you first call `useDeleteStoredRunMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useDeleteStoredRunMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useDeleteStoredRunMutation({
 *   variables: {
 *     runId: // value for 'runId'
 *   },
 * });
 */
export function useDeleteStoredRunMutation(options: VueApolloComposable.UseMutationOptions<DeleteStoredRunMutation, DeleteStoredRunMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<DeleteStoredRunMutation, DeleteStoredRunMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<DeleteStoredRunMutation, DeleteStoredRunMutationVariables>(DeleteStoredRunDocument, options);
}
export type DeleteStoredRunMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<DeleteStoredRunMutation, DeleteStoredRunMutationVariables>;
export const ArchiveStoredRunDocument = gql`
    mutation ArchiveStoredRun($runId: String!) {
  archiveStoredRun(runId: $runId) {
    success
    message
  }
}
    `;

/**
 * __useArchiveStoredRunMutation__
 *
 * To run a mutation, you first call `useArchiveStoredRunMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useArchiveStoredRunMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useArchiveStoredRunMutation({
 *   variables: {
 *     runId: // value for 'runId'
 *   },
 * });
 */
export function useArchiveStoredRunMutation(options: VueApolloComposable.UseMutationOptions<ArchiveStoredRunMutation, ArchiveStoredRunMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<ArchiveStoredRunMutation, ArchiveStoredRunMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<ArchiveStoredRunMutation, ArchiveStoredRunMutationVariables>(ArchiveStoredRunDocument, options);
}
export type ArchiveStoredRunMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<ArchiveStoredRunMutation, ArchiveStoredRunMutationVariables>;
export const DeleteStoredTeamRunDocument = gql`
    mutation DeleteStoredTeamRun($teamRunId: String!) {
  deleteStoredTeamRun(teamRunId: $teamRunId) {
    success
    message
  }
}
    `;

/**
 * __useDeleteStoredTeamRunMutation__
 *
 * To run a mutation, you first call `useDeleteStoredTeamRunMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useDeleteStoredTeamRunMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useDeleteStoredTeamRunMutation({
 *   variables: {
 *     teamRunId: // value for 'teamRunId'
 *   },
 * });
 */
export function useDeleteStoredTeamRunMutation(options: VueApolloComposable.UseMutationOptions<DeleteStoredTeamRunMutation, DeleteStoredTeamRunMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<DeleteStoredTeamRunMutation, DeleteStoredTeamRunMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<DeleteStoredTeamRunMutation, DeleteStoredTeamRunMutationVariables>(DeleteStoredTeamRunDocument, options);
}
export type DeleteStoredTeamRunMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<DeleteStoredTeamRunMutation, DeleteStoredTeamRunMutationVariables>;
export const ArchiveStoredTeamRunDocument = gql`
    mutation ArchiveStoredTeamRun($teamRunId: String!) {
  archiveStoredTeamRun(teamRunId: $teamRunId) {
    success
    message
  }
}
    `;

/**
 * __useArchiveStoredTeamRunMutation__
 *
 * To run a mutation, you first call `useArchiveStoredTeamRunMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useArchiveStoredTeamRunMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useArchiveStoredTeamRunMutation({
 *   variables: {
 *     teamRunId: // value for 'teamRunId'
 *   },
 * });
 */
export function useArchiveStoredTeamRunMutation(options: VueApolloComposable.UseMutationOptions<ArchiveStoredTeamRunMutation, ArchiveStoredTeamRunMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<ArchiveStoredTeamRunMutation, ArchiveStoredTeamRunMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<ArchiveStoredTeamRunMutation, ArchiveStoredTeamRunMutationVariables>(ArchiveStoredTeamRunDocument, options);
}
export type ArchiveStoredTeamRunMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<ArchiveStoredTeamRunMutation, ArchiveStoredTeamRunMutationVariables>;
export const SetSelfEvolutionEnabledDocument = gql`
    mutation SetSelfEvolutionEnabled($enabled: Boolean!) {
  setSelfEvolutionEnabled(enabled: $enabled) {
    ...SelfEvolutionCapabilityFields
  }
}
    ${SelfEvolutionCapabilityFieldsFragmentDoc}`;

/**
 * __useSetSelfEvolutionEnabledMutation__
 *
 * To run a mutation, you first call `useSetSelfEvolutionEnabledMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useSetSelfEvolutionEnabledMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useSetSelfEvolutionEnabledMutation({
 *   variables: {
 *     enabled: // value for 'enabled'
 *   },
 * });
 */
export function useSetSelfEvolutionEnabledMutation(options: VueApolloComposable.UseMutationOptions<SetSelfEvolutionEnabledMutation, SetSelfEvolutionEnabledMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<SetSelfEvolutionEnabledMutation, SetSelfEvolutionEnabledMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<SetSelfEvolutionEnabledMutation, SetSelfEvolutionEnabledMutationVariables>(SetSelfEvolutionEnabledDocument, options);
}
export type SetSelfEvolutionEnabledMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<SetSelfEvolutionEnabledMutation, SetSelfEvolutionEnabledMutationVariables>;
export const StartAgentRunSelfEvolutionDocument = gql`
    mutation StartAgentRunSelfEvolution($input: StartAgentRunSelfEvolutionInput!) {
  startAgentRunSelfEvolution(input: $input) {
    evolutionRunId
    evolverRunId
    record {
      ...SelfEvolutionRunRecordSummaryFields
    }
  }
}
    ${SelfEvolutionRunRecordSummaryFieldsFragmentDoc}`;

/**
 * __useStartAgentRunSelfEvolutionMutation__
 *
 * To run a mutation, you first call `useStartAgentRunSelfEvolutionMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useStartAgentRunSelfEvolutionMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useStartAgentRunSelfEvolutionMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useStartAgentRunSelfEvolutionMutation(options: VueApolloComposable.UseMutationOptions<StartAgentRunSelfEvolutionMutation, StartAgentRunSelfEvolutionMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<StartAgentRunSelfEvolutionMutation, StartAgentRunSelfEvolutionMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<StartAgentRunSelfEvolutionMutation, StartAgentRunSelfEvolutionMutationVariables>(StartAgentRunSelfEvolutionDocument, options);
}
export type StartAgentRunSelfEvolutionMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<StartAgentRunSelfEvolutionMutation, StartAgentRunSelfEvolutionMutationVariables>;
export const StartTeamMemberSelfEvolutionDocument = gql`
    mutation StartTeamMemberSelfEvolution($input: StartTeamMemberSelfEvolutionInput!) {
  startTeamMemberSelfEvolution(input: $input) {
    evolutionRunId
    evolverRunId
    record {
      ...SelfEvolutionRunRecordSummaryFields
    }
  }
}
    ${SelfEvolutionRunRecordSummaryFieldsFragmentDoc}`;

/**
 * __useStartTeamMemberSelfEvolutionMutation__
 *
 * To run a mutation, you first call `useStartTeamMemberSelfEvolutionMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useStartTeamMemberSelfEvolutionMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useStartTeamMemberSelfEvolutionMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useStartTeamMemberSelfEvolutionMutation(options: VueApolloComposable.UseMutationOptions<StartTeamMemberSelfEvolutionMutation, StartTeamMemberSelfEvolutionMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<StartTeamMemberSelfEvolutionMutation, StartTeamMemberSelfEvolutionMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<StartTeamMemberSelfEvolutionMutation, StartTeamMemberSelfEvolutionMutationVariables>(StartTeamMemberSelfEvolutionDocument, options);
}
export type StartTeamMemberSelfEvolutionMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<StartTeamMemberSelfEvolutionMutation, StartTeamMemberSelfEvolutionMutationVariables>;
export const UpdateServerSettingDocument = gql`
    mutation UpdateServerSetting($key: String!, $value: String!) {
  updateServerSetting(key: $key, value: $value)
}
    `;

/**
 * __useUpdateServerSettingMutation__
 *
 * To run a mutation, you first call `useUpdateServerSettingMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useUpdateServerSettingMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useUpdateServerSettingMutation({
 *   variables: {
 *     key: // value for 'key'
 *     value: // value for 'value'
 *   },
 * });
 */
export function useUpdateServerSettingMutation(options: VueApolloComposable.UseMutationOptions<UpdateServerSettingMutation, UpdateServerSettingMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<UpdateServerSettingMutation, UpdateServerSettingMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<UpdateServerSettingMutation, UpdateServerSettingMutationVariables>(UpdateServerSettingDocument, options);
}
export type UpdateServerSettingMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<UpdateServerSettingMutation, UpdateServerSettingMutationVariables>;
export const DeleteServerSettingDocument = gql`
    mutation DeleteServerSetting($key: String!) {
  deleteServerSetting(key: $key)
}
    `;

/**
 * __useDeleteServerSettingMutation__
 *
 * To run a mutation, you first call `useDeleteServerSettingMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useDeleteServerSettingMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useDeleteServerSettingMutation({
 *   variables: {
 *     key: // value for 'key'
 *   },
 * });
 */
export function useDeleteServerSettingMutation(options: VueApolloComposable.UseMutationOptions<DeleteServerSettingMutation, DeleteServerSettingMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<DeleteServerSettingMutation, DeleteServerSettingMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<DeleteServerSettingMutation, DeleteServerSettingMutationVariables>(DeleteServerSettingDocument, options);
}
export type DeleteServerSettingMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<DeleteServerSettingMutation, DeleteServerSettingMutationVariables>;
export const SetSearchConfigDocument = gql`
    mutation SetSearchConfig($provider: String!, $serperApiKey: String, $serpapiApiKey: String, $googleCseApiKey: String, $googleCseId: String, $vertexAiSearchApiKey: String, $vertexAiSearchServingConfig: String) {
  setSearchConfig(
    provider: $provider
    serperApiKey: $serperApiKey
    serpapiApiKey: $serpapiApiKey
    googleCseApiKey: $googleCseApiKey
    googleCseId: $googleCseId
    vertexAiSearchApiKey: $vertexAiSearchApiKey
    vertexAiSearchServingConfig: $vertexAiSearchServingConfig
  )
}
    `;

/**
 * __useSetSearchConfigMutation__
 *
 * To run a mutation, you first call `useSetSearchConfigMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useSetSearchConfigMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useSetSearchConfigMutation({
 *   variables: {
 *     provider: // value for 'provider'
 *     serperApiKey: // value for 'serperApiKey'
 *     serpapiApiKey: // value for 'serpapiApiKey'
 *     googleCseApiKey: // value for 'googleCseApiKey'
 *     googleCseId: // value for 'googleCseId'
 *     vertexAiSearchApiKey: // value for 'vertexAiSearchApiKey'
 *     vertexAiSearchServingConfig: // value for 'vertexAiSearchServingConfig'
 *   },
 * });
 */
export function useSetSearchConfigMutation(options: VueApolloComposable.UseMutationOptions<SetSearchConfigMutation, SetSearchConfigMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<SetSearchConfigMutation, SetSearchConfigMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<SetSearchConfigMutation, SetSearchConfigMutationVariables>(SetSearchConfigDocument, options);
}
export type SetSearchConfigMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<SetSearchConfigMutation, SetSearchConfigMutationVariables>;
export const ReloadToolSchemaDocument = gql`
    mutation ReloadToolSchema($name: String!) {
  reloadToolSchema(name: $name) {
    success
    message
    tool {
      __typename
      name
      description
      origin
      category
      argumentSchema {
        __typename
        parameters {
          __typename
          name
          paramType
          description
          required
          defaultValue
          enumValues
          jsonSchema
        }
      }
    }
  }
}
    `;

/**
 * __useReloadToolSchemaMutation__
 *
 * To run a mutation, you first call `useReloadToolSchemaMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useReloadToolSchemaMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useReloadToolSchemaMutation({
 *   variables: {
 *     name: // value for 'name'
 *   },
 * });
 */
export function useReloadToolSchemaMutation(options: VueApolloComposable.UseMutationOptions<ReloadToolSchemaMutation, ReloadToolSchemaMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<ReloadToolSchemaMutation, ReloadToolSchemaMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<ReloadToolSchemaMutation, ReloadToolSchemaMutationVariables>(ReloadToolSchemaDocument, options);
}
export type ReloadToolSchemaMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<ReloadToolSchemaMutation, ReloadToolSchemaMutationVariables>;
export const CreateWorkspaceDocument = gql`
    mutation CreateWorkspace($input: CreateWorkspaceInput!) {
  createWorkspace(input: $input) {
    __typename
    workspaceId
    name
    displayName
    config
    workspaceRootPath
    absolutePath
    kind
    isTemp
  }
}
    `;

/**
 * __useCreateWorkspaceMutation__
 *
 * To run a mutation, you first call `useCreateWorkspaceMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useCreateWorkspaceMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useCreateWorkspaceMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useCreateWorkspaceMutation(options: VueApolloComposable.UseMutationOptions<CreateWorkspaceMutation, CreateWorkspaceMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<CreateWorkspaceMutation, CreateWorkspaceMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<CreateWorkspaceMutation, CreateWorkspaceMutationVariables>(CreateWorkspaceDocument, options);
}
export type CreateWorkspaceMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<CreateWorkspaceMutation, CreateWorkspaceMutationVariables>;
export const GetAgentCustomizationOptionsDocument = gql`
    query GetAgentCustomizationOptions {
  availableToolNames
  availableOptionalInputProcessorNames
  availableOptionalLlmResponseProcessorNames
  availableOptionalSystemPromptProcessorNames
  availableOptionalToolExecutionResultProcessorNames
  availableOptionalToolInvocationPreprocessorNames
  availableOptionalLifecycleProcessorNames
}
    `;

/**
 * __useGetAgentCustomizationOptionsQuery__
 *
 * To run a query within a Vue component, call `useGetAgentCustomizationOptionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAgentCustomizationOptionsQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetAgentCustomizationOptionsQuery();
 */
export function useGetAgentCustomizationOptionsQuery(options: VueApolloComposable.UseQueryOptions<GetAgentCustomizationOptionsQuery, GetAgentCustomizationOptionsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetAgentCustomizationOptionsQuery, GetAgentCustomizationOptionsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetAgentCustomizationOptionsQuery, GetAgentCustomizationOptionsQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetAgentCustomizationOptionsQuery, GetAgentCustomizationOptionsQueryVariables>(GetAgentCustomizationOptionsDocument, {}, options);
}
export function useGetAgentCustomizationOptionsLazyQuery(options: VueApolloComposable.UseQueryOptions<GetAgentCustomizationOptionsQuery, GetAgentCustomizationOptionsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetAgentCustomizationOptionsQuery, GetAgentCustomizationOptionsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetAgentCustomizationOptionsQuery, GetAgentCustomizationOptionsQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetAgentCustomizationOptionsQuery, GetAgentCustomizationOptionsQueryVariables>(GetAgentCustomizationOptionsDocument, {}, options);
}
export type GetAgentCustomizationOptionsQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetAgentCustomizationOptionsQuery, GetAgentCustomizationOptionsQueryVariables>;
export const GetAgentDefinitionsDocument = gql`
    query GetAgentDefinitions {
  agentDefinitions {
    __typename
    id
    name
    role
    description
    instructions
    category
    avatarUrl
    toolNames
    inputProcessorNames
    llmResponseProcessorNames
    systemPromptProcessorNames
    toolExecutionResultProcessorNames
    toolInvocationPreprocessorNames
    lifecycleProcessorNames
    skillNames
    ownershipScope
    ownerTeamId
    ownerTeamName
    ownerApplicationId
    ownerApplicationName
    ownerPackageId
    ownerLocalApplicationId
    defaultLaunchConfig {
      llmModelIdentifier
      runtimeKind
      llmConfig
    }
  }
}
    `;

/**
 * __useGetAgentDefinitionsQuery__
 *
 * To run a query within a Vue component, call `useGetAgentDefinitionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAgentDefinitionsQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetAgentDefinitionsQuery();
 */
export function useGetAgentDefinitionsQuery(options: VueApolloComposable.UseQueryOptions<GetAgentDefinitionsQuery, GetAgentDefinitionsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetAgentDefinitionsQuery, GetAgentDefinitionsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetAgentDefinitionsQuery, GetAgentDefinitionsQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetAgentDefinitionsQuery, GetAgentDefinitionsQueryVariables>(GetAgentDefinitionsDocument, {}, options);
}
export function useGetAgentDefinitionsLazyQuery(options: VueApolloComposable.UseQueryOptions<GetAgentDefinitionsQuery, GetAgentDefinitionsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetAgentDefinitionsQuery, GetAgentDefinitionsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetAgentDefinitionsQuery, GetAgentDefinitionsQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetAgentDefinitionsQuery, GetAgentDefinitionsQueryVariables>(GetAgentDefinitionsDocument, {}, options);
}
export type GetAgentDefinitionsQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetAgentDefinitionsQuery, GetAgentDefinitionsQueryVariables>;
export const GetAgentTeamDefinitionsDocument = gql`
    query GetAgentTeamDefinitions {
  agentTeamDefinitions {
    __typename
    id
    name
    description
    instructions
    category
    avatarUrl
    coordinatorMemberName
    ownershipScope
    ownerTeamId
    ownerTeamName
    ownerApplicationId
    ownerApplicationName
    ownerPackageId
    ownerLocalApplicationId
    defaultLaunchConfig {
      llmModelIdentifier
      runtimeKind
      llmConfig
    }
    nodes {
      __typename
      memberName
      ref
      refType
      refScope
    }
  }
}
    `;

/**
 * __useGetAgentTeamDefinitionsQuery__
 *
 * To run a query within a Vue component, call `useGetAgentTeamDefinitionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAgentTeamDefinitionsQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetAgentTeamDefinitionsQuery();
 */
export function useGetAgentTeamDefinitionsQuery(options: VueApolloComposable.UseQueryOptions<GetAgentTeamDefinitionsQuery, GetAgentTeamDefinitionsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetAgentTeamDefinitionsQuery, GetAgentTeamDefinitionsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetAgentTeamDefinitionsQuery, GetAgentTeamDefinitionsQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetAgentTeamDefinitionsQuery, GetAgentTeamDefinitionsQueryVariables>(GetAgentTeamDefinitionsDocument, {}, options);
}
export function useGetAgentTeamDefinitionsLazyQuery(options: VueApolloComposable.UseQueryOptions<GetAgentTeamDefinitionsQuery, GetAgentTeamDefinitionsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetAgentTeamDefinitionsQuery, GetAgentTeamDefinitionsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetAgentTeamDefinitionsQuery, GetAgentTeamDefinitionsQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetAgentTeamDefinitionsQuery, GetAgentTeamDefinitionsQueryVariables>(GetAgentTeamDefinitionsDocument, {}, options);
}
export type GetAgentTeamDefinitionsQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetAgentTeamDefinitionsQuery, GetAgentTeamDefinitionsQueryVariables>;
export const GetAppDataMigrationsDocument = gql`
    query GetAppDataMigrations {
  getAppDataMigrations {
    migrationId
    displayName
    description
    status
    requiredOnStartup
    canRetry
    attempts
    startedAt
    completedAt
    summary
    errorMessage
    logPath
  }
}
    `;

/**
 * __useGetAppDataMigrationsQuery__
 *
 * To run a query within a Vue component, call `useGetAppDataMigrationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAppDataMigrationsQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetAppDataMigrationsQuery();
 */
export function useGetAppDataMigrationsQuery(options: VueApolloComposable.UseQueryOptions<GetAppDataMigrationsQuery, GetAppDataMigrationsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetAppDataMigrationsQuery, GetAppDataMigrationsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetAppDataMigrationsQuery, GetAppDataMigrationsQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetAppDataMigrationsQuery, GetAppDataMigrationsQueryVariables>(GetAppDataMigrationsDocument, {}, options);
}
export function useGetAppDataMigrationsLazyQuery(options: VueApolloComposable.UseQueryOptions<GetAppDataMigrationsQuery, GetAppDataMigrationsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetAppDataMigrationsQuery, GetAppDataMigrationsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetAppDataMigrationsQuery, GetAppDataMigrationsQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetAppDataMigrationsQuery, GetAppDataMigrationsQueryVariables>(GetAppDataMigrationsDocument, {}, options);
}
export type GetAppDataMigrationsQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetAppDataMigrationsQuery, GetAppDataMigrationsQueryVariables>;
export const GetApplicationsCapabilityDocument = gql`
    query GetApplicationsCapability {
  applicationsCapability {
    ...ApplicationsCapabilityFields
  }
}
    ${ApplicationsCapabilityFieldsFragmentDoc}`;

/**
 * __useGetApplicationsCapabilityQuery__
 *
 * To run a query within a Vue component, call `useGetApplicationsCapabilityQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetApplicationsCapabilityQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetApplicationsCapabilityQuery();
 */
export function useGetApplicationsCapabilityQuery(options: VueApolloComposable.UseQueryOptions<GetApplicationsCapabilityQuery, GetApplicationsCapabilityQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetApplicationsCapabilityQuery, GetApplicationsCapabilityQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetApplicationsCapabilityQuery, GetApplicationsCapabilityQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetApplicationsCapabilityQuery, GetApplicationsCapabilityQueryVariables>(GetApplicationsCapabilityDocument, {}, options);
}
export function useGetApplicationsCapabilityLazyQuery(options: VueApolloComposable.UseQueryOptions<GetApplicationsCapabilityQuery, GetApplicationsCapabilityQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetApplicationsCapabilityQuery, GetApplicationsCapabilityQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetApplicationsCapabilityQuery, GetApplicationsCapabilityQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetApplicationsCapabilityQuery, GetApplicationsCapabilityQueryVariables>(GetApplicationsCapabilityDocument, {}, options);
}
export type GetApplicationsCapabilityQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetApplicationsCapabilityQuery, GetApplicationsCapabilityQueryVariables>;
export const ListApplicationsDocument = gql`
    query ListApplications {
  listApplications {
    ...ApplicationCatalogFields
  }
}
    ${ApplicationCatalogFieldsFragmentDoc}`;

/**
 * __useListApplicationsQuery__
 *
 * To run a query within a Vue component, call `useListApplicationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListApplicationsQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useListApplicationsQuery();
 */
export function useListApplicationsQuery(options: VueApolloComposable.UseQueryOptions<ListApplicationsQuery, ListApplicationsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ListApplicationsQuery, ListApplicationsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ListApplicationsQuery, ListApplicationsQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<ListApplicationsQuery, ListApplicationsQueryVariables>(ListApplicationsDocument, {}, options);
}
export function useListApplicationsLazyQuery(options: VueApolloComposable.UseQueryOptions<ListApplicationsQuery, ListApplicationsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ListApplicationsQuery, ListApplicationsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ListApplicationsQuery, ListApplicationsQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<ListApplicationsQuery, ListApplicationsQueryVariables>(ListApplicationsDocument, {}, options);
}
export type ListApplicationsQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<ListApplicationsQuery, ListApplicationsQueryVariables>;
export const GetApplicationByIdDocument = gql`
    query GetApplicationById($id: String!) {
  application(id: $id) {
    ...ApplicationDetailFields
  }
}
    ${ApplicationDetailFieldsFragmentDoc}`;

/**
 * __useGetApplicationByIdQuery__
 *
 * To run a query within a Vue component, call `useGetApplicationByIdQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetApplicationByIdQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetApplicationByIdQuery({
 *   id: // value for 'id'
 * });
 */
export function useGetApplicationByIdQuery(variables: GetApplicationByIdQueryVariables | VueCompositionApi.Ref<GetApplicationByIdQueryVariables> | ReactiveFunction<GetApplicationByIdQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetApplicationByIdQuery, GetApplicationByIdQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetApplicationByIdQuery, GetApplicationByIdQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetApplicationByIdQuery, GetApplicationByIdQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetApplicationByIdQuery, GetApplicationByIdQueryVariables>(GetApplicationByIdDocument, variables, options);
}
export function useGetApplicationByIdLazyQuery(variables?: GetApplicationByIdQueryVariables | VueCompositionApi.Ref<GetApplicationByIdQueryVariables> | ReactiveFunction<GetApplicationByIdQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetApplicationByIdQuery, GetApplicationByIdQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetApplicationByIdQuery, GetApplicationByIdQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetApplicationByIdQuery, GetApplicationByIdQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetApplicationByIdQuery, GetApplicationByIdQueryVariables>(GetApplicationByIdDocument, variables, options);
}
export type GetApplicationByIdQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetApplicationByIdQuery, GetApplicationByIdQueryVariables>;
export const ExternalChannelCapabilitiesDocument = gql`
    query ExternalChannelCapabilities {
  externalChannelCapabilities {
    __typename
    bindingCrudEnabled
    reason
    acceptedProviderTransportPairs
  }
}
    `;

/**
 * __useExternalChannelCapabilitiesQuery__
 *
 * To run a query within a Vue component, call `useExternalChannelCapabilitiesQuery` and pass it any options that fit your needs.
 * When your component renders, `useExternalChannelCapabilitiesQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useExternalChannelCapabilitiesQuery();
 */
export function useExternalChannelCapabilitiesQuery(options: VueApolloComposable.UseQueryOptions<ExternalChannelCapabilitiesQuery, ExternalChannelCapabilitiesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ExternalChannelCapabilitiesQuery, ExternalChannelCapabilitiesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ExternalChannelCapabilitiesQuery, ExternalChannelCapabilitiesQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<ExternalChannelCapabilitiesQuery, ExternalChannelCapabilitiesQueryVariables>(ExternalChannelCapabilitiesDocument, {}, options);
}
export function useExternalChannelCapabilitiesLazyQuery(options: VueApolloComposable.UseQueryOptions<ExternalChannelCapabilitiesQuery, ExternalChannelCapabilitiesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ExternalChannelCapabilitiesQuery, ExternalChannelCapabilitiesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ExternalChannelCapabilitiesQuery, ExternalChannelCapabilitiesQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<ExternalChannelCapabilitiesQuery, ExternalChannelCapabilitiesQueryVariables>(ExternalChannelCapabilitiesDocument, {}, options);
}
export type ExternalChannelCapabilitiesQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<ExternalChannelCapabilitiesQuery, ExternalChannelCapabilitiesQueryVariables>;
export const ExternalChannelBindingsDocument = gql`
    query ExternalChannelBindings {
  externalChannelBindings {
    __typename
    id
    provider
    transport
    accountId
    peerId
    threadId
    targetType
    targetAgentDefinitionId
    targetTeamDefinitionId
    launchPreset {
      workspaceRootPath
      llmModelIdentifier
      runtimeKind
      autoExecuteTools
      skillAccessMode
      llmConfig
    }
    teamLaunchPreset {
      workspaceRootPath
      llmModelIdentifier
      runtimeKind
      autoExecuteTools
      skillAccessMode
      llmConfig
    }
    teamRunId
    updatedAt
  }
}
    `;

/**
 * __useExternalChannelBindingsQuery__
 *
 * To run a query within a Vue component, call `useExternalChannelBindingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useExternalChannelBindingsQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useExternalChannelBindingsQuery();
 */
export function useExternalChannelBindingsQuery(options: VueApolloComposable.UseQueryOptions<ExternalChannelBindingsQuery, ExternalChannelBindingsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ExternalChannelBindingsQuery, ExternalChannelBindingsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ExternalChannelBindingsQuery, ExternalChannelBindingsQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<ExternalChannelBindingsQuery, ExternalChannelBindingsQueryVariables>(ExternalChannelBindingsDocument, {}, options);
}
export function useExternalChannelBindingsLazyQuery(options: VueApolloComposable.UseQueryOptions<ExternalChannelBindingsQuery, ExternalChannelBindingsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ExternalChannelBindingsQuery, ExternalChannelBindingsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ExternalChannelBindingsQuery, ExternalChannelBindingsQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<ExternalChannelBindingsQuery, ExternalChannelBindingsQueryVariables>(ExternalChannelBindingsDocument, {}, options);
}
export type ExternalChannelBindingsQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<ExternalChannelBindingsQuery, ExternalChannelBindingsQueryVariables>;
export const ExternalChannelTeamDefinitionOptionsDocument = gql`
    query ExternalChannelTeamDefinitionOptions {
  externalChannelTeamDefinitionOptions {
    __typename
    teamDefinitionId
    teamDefinitionName
    description
    coordinatorMemberName
    memberCount
  }
}
    `;

/**
 * __useExternalChannelTeamDefinitionOptionsQuery__
 *
 * To run a query within a Vue component, call `useExternalChannelTeamDefinitionOptionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useExternalChannelTeamDefinitionOptionsQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useExternalChannelTeamDefinitionOptionsQuery();
 */
export function useExternalChannelTeamDefinitionOptionsQuery(options: VueApolloComposable.UseQueryOptions<ExternalChannelTeamDefinitionOptionsQuery, ExternalChannelTeamDefinitionOptionsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ExternalChannelTeamDefinitionOptionsQuery, ExternalChannelTeamDefinitionOptionsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ExternalChannelTeamDefinitionOptionsQuery, ExternalChannelTeamDefinitionOptionsQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<ExternalChannelTeamDefinitionOptionsQuery, ExternalChannelTeamDefinitionOptionsQueryVariables>(ExternalChannelTeamDefinitionOptionsDocument, {}, options);
}
export function useExternalChannelTeamDefinitionOptionsLazyQuery(options: VueApolloComposable.UseQueryOptions<ExternalChannelTeamDefinitionOptionsQuery, ExternalChannelTeamDefinitionOptionsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ExternalChannelTeamDefinitionOptionsQuery, ExternalChannelTeamDefinitionOptionsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ExternalChannelTeamDefinitionOptionsQuery, ExternalChannelTeamDefinitionOptionsQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<ExternalChannelTeamDefinitionOptionsQuery, ExternalChannelTeamDefinitionOptionsQueryVariables>(ExternalChannelTeamDefinitionOptionsDocument, {}, options);
}
export type ExternalChannelTeamDefinitionOptionsQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<ExternalChannelTeamDefinitionOptionsQuery, ExternalChannelTeamDefinitionOptionsQueryVariables>;
export const GetFileContentDocument = gql`
    query GetFileContent($workspaceId: String!, $filePath: String!) {
  fileContent(workspaceId: $workspaceId, filePath: $filePath)
}
    `;

/**
 * __useGetFileContentQuery__
 *
 * To run a query within a Vue component, call `useGetFileContentQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetFileContentQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetFileContentQuery({
 *   workspaceId: // value for 'workspaceId'
 *   filePath: // value for 'filePath'
 * });
 */
export function useGetFileContentQuery(variables: GetFileContentQueryVariables | VueCompositionApi.Ref<GetFileContentQueryVariables> | ReactiveFunction<GetFileContentQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetFileContentQuery, GetFileContentQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetFileContentQuery, GetFileContentQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetFileContentQuery, GetFileContentQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetFileContentQuery, GetFileContentQueryVariables>(GetFileContentDocument, variables, options);
}
export function useGetFileContentLazyQuery(variables?: GetFileContentQueryVariables | VueCompositionApi.Ref<GetFileContentQueryVariables> | ReactiveFunction<GetFileContentQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetFileContentQuery, GetFileContentQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetFileContentQuery, GetFileContentQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetFileContentQuery, GetFileContentQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetFileContentQuery, GetFileContentQueryVariables>(GetFileContentDocument, variables, options);
}
export type GetFileContentQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetFileContentQuery, GetFileContentQueryVariables>;
export const SearchFilesDocument = gql`
    query SearchFiles($workspaceId: String!, $query: String!) {
  searchFiles(workspaceId: $workspaceId, query: $query)
}
    `;

/**
 * __useSearchFilesQuery__
 *
 * To run a query within a Vue component, call `useSearchFilesQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchFilesQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useSearchFilesQuery({
 *   workspaceId: // value for 'workspaceId'
 *   query: // value for 'query'
 * });
 */
export function useSearchFilesQuery(variables: SearchFilesQueryVariables | VueCompositionApi.Ref<SearchFilesQueryVariables> | ReactiveFunction<SearchFilesQueryVariables>, options: VueApolloComposable.UseQueryOptions<SearchFilesQuery, SearchFilesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<SearchFilesQuery, SearchFilesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<SearchFilesQuery, SearchFilesQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<SearchFilesQuery, SearchFilesQueryVariables>(SearchFilesDocument, variables, options);
}
export function useSearchFilesLazyQuery(variables?: SearchFilesQueryVariables | VueCompositionApi.Ref<SearchFilesQueryVariables> | ReactiveFunction<SearchFilesQueryVariables>, options: VueApolloComposable.UseQueryOptions<SearchFilesQuery, SearchFilesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<SearchFilesQuery, SearchFilesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<SearchFilesQuery, SearchFilesQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<SearchFilesQuery, SearchFilesQueryVariables>(SearchFilesDocument, variables, options);
}
export type SearchFilesQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<SearchFilesQuery, SearchFilesQueryVariables>;
export const GetFolderChildrenDocument = gql`
    query GetFolderChildren($workspaceId: String!, $folderPath: String!) {
  folderChildren(workspaceId: $workspaceId, folderPath: $folderPath)
}
    `;

/**
 * __useGetFolderChildrenQuery__
 *
 * To run a query within a Vue component, call `useGetFolderChildrenQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetFolderChildrenQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetFolderChildrenQuery({
 *   workspaceId: // value for 'workspaceId'
 *   folderPath: // value for 'folderPath'
 * });
 */
export function useGetFolderChildrenQuery(variables: GetFolderChildrenQueryVariables | VueCompositionApi.Ref<GetFolderChildrenQueryVariables> | ReactiveFunction<GetFolderChildrenQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetFolderChildrenQuery, GetFolderChildrenQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetFolderChildrenQuery, GetFolderChildrenQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetFolderChildrenQuery, GetFolderChildrenQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetFolderChildrenQuery, GetFolderChildrenQueryVariables>(GetFolderChildrenDocument, variables, options);
}
export function useGetFolderChildrenLazyQuery(variables?: GetFolderChildrenQueryVariables | VueCompositionApi.Ref<GetFolderChildrenQueryVariables> | ReactiveFunction<GetFolderChildrenQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetFolderChildrenQuery, GetFolderChildrenQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetFolderChildrenQuery, GetFolderChildrenQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetFolderChildrenQuery, GetFolderChildrenQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetFolderChildrenQuery, GetFolderChildrenQueryVariables>(GetFolderChildrenDocument, variables, options);
}
export type GetFolderChildrenQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetFolderChildrenQuery, GetFolderChildrenQueryVariables>;
export const GetLlmProviderApiKeyConfiguredDocument = gql`
    query GetLLMProviderApiKeyConfigured($providerId: String!) {
  getLlmProviderApiKeyConfigured(providerId: $providerId)
}
    `;

/**
 * __useGetLlmProviderApiKeyConfiguredQuery__
 *
 * To run a query within a Vue component, call `useGetLlmProviderApiKeyConfiguredQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLlmProviderApiKeyConfiguredQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetLlmProviderApiKeyConfiguredQuery({
 *   providerId: // value for 'providerId'
 * });
 */
export function useGetLlmProviderApiKeyConfiguredQuery(variables: GetLlmProviderApiKeyConfiguredQueryVariables | VueCompositionApi.Ref<GetLlmProviderApiKeyConfiguredQueryVariables> | ReactiveFunction<GetLlmProviderApiKeyConfiguredQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetLlmProviderApiKeyConfiguredQuery, GetLlmProviderApiKeyConfiguredQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetLlmProviderApiKeyConfiguredQuery, GetLlmProviderApiKeyConfiguredQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetLlmProviderApiKeyConfiguredQuery, GetLlmProviderApiKeyConfiguredQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetLlmProviderApiKeyConfiguredQuery, GetLlmProviderApiKeyConfiguredQueryVariables>(GetLlmProviderApiKeyConfiguredDocument, variables, options);
}
export function useGetLlmProviderApiKeyConfiguredLazyQuery(variables?: GetLlmProviderApiKeyConfiguredQueryVariables | VueCompositionApi.Ref<GetLlmProviderApiKeyConfiguredQueryVariables> | ReactiveFunction<GetLlmProviderApiKeyConfiguredQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetLlmProviderApiKeyConfiguredQuery, GetLlmProviderApiKeyConfiguredQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetLlmProviderApiKeyConfiguredQuery, GetLlmProviderApiKeyConfiguredQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetLlmProviderApiKeyConfiguredQuery, GetLlmProviderApiKeyConfiguredQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetLlmProviderApiKeyConfiguredQuery, GetLlmProviderApiKeyConfiguredQueryVariables>(GetLlmProviderApiKeyConfiguredDocument, variables, options);
}
export type GetLlmProviderApiKeyConfiguredQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetLlmProviderApiKeyConfiguredQuery, GetLlmProviderApiKeyConfiguredQueryVariables>;
export const GetAvailableLlmProvidersWithModelsDocument = gql`
    query GetAvailableLLMProvidersWithModels($runtimeKind: String) {
  availableLlmProvidersWithModels(runtimeKind: $runtimeKind) {
    __typename
    provider {
      __typename
      id
      name
      providerType
      isCustom
      baseUrl
      apiKeyConfigured
      status
      statusMessage
    }
    models {
      __typename
      modelIdentifier
      name
      value
      canonicalName
      providerId
      providerName
      providerType
      runtime
      hostUrl
      configSchema
      maxContextTokens
      activeContextTokens
      maxInputTokens
      maxOutputTokens
    }
  }
  availableAudioProvidersWithModels(runtimeKind: $runtimeKind) {
    __typename
    provider {
      __typename
      id
      name
      providerType
      isCustom
      baseUrl
      apiKeyConfigured
      status
      statusMessage
    }
    models {
      __typename
      modelIdentifier
      name
      value
      canonicalName
      providerId
      providerName
      providerType
      runtime
      hostUrl
    }
  }
  availableImageProvidersWithModels(runtimeKind: $runtimeKind) {
    __typename
    provider {
      __typename
      id
      name
      providerType
      isCustom
      baseUrl
      apiKeyConfigured
      status
      statusMessage
    }
    models {
      __typename
      modelIdentifier
      name
      value
      canonicalName
      providerId
      providerName
      providerType
      runtime
      hostUrl
    }
  }
}
    `;

/**
 * __useGetAvailableLlmProvidersWithModelsQuery__
 *
 * To run a query within a Vue component, call `useGetAvailableLlmProvidersWithModelsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAvailableLlmProvidersWithModelsQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetAvailableLlmProvidersWithModelsQuery({
 *   runtimeKind: // value for 'runtimeKind'
 * });
 */
export function useGetAvailableLlmProvidersWithModelsQuery(variables: GetAvailableLlmProvidersWithModelsQueryVariables | VueCompositionApi.Ref<GetAvailableLlmProvidersWithModelsQueryVariables> | ReactiveFunction<GetAvailableLlmProvidersWithModelsQueryVariables> = {}, options: VueApolloComposable.UseQueryOptions<GetAvailableLlmProvidersWithModelsQuery, GetAvailableLlmProvidersWithModelsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetAvailableLlmProvidersWithModelsQuery, GetAvailableLlmProvidersWithModelsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetAvailableLlmProvidersWithModelsQuery, GetAvailableLlmProvidersWithModelsQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetAvailableLlmProvidersWithModelsQuery, GetAvailableLlmProvidersWithModelsQueryVariables>(GetAvailableLlmProvidersWithModelsDocument, variables, options);
}
export function useGetAvailableLlmProvidersWithModelsLazyQuery(variables: GetAvailableLlmProvidersWithModelsQueryVariables | VueCompositionApi.Ref<GetAvailableLlmProvidersWithModelsQueryVariables> | ReactiveFunction<GetAvailableLlmProvidersWithModelsQueryVariables> = {}, options: VueApolloComposable.UseQueryOptions<GetAvailableLlmProvidersWithModelsQuery, GetAvailableLlmProvidersWithModelsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetAvailableLlmProvidersWithModelsQuery, GetAvailableLlmProvidersWithModelsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetAvailableLlmProvidersWithModelsQuery, GetAvailableLlmProvidersWithModelsQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetAvailableLlmProvidersWithModelsQuery, GetAvailableLlmProvidersWithModelsQueryVariables>(GetAvailableLlmProvidersWithModelsDocument, variables, options);
}
export type GetAvailableLlmProvidersWithModelsQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetAvailableLlmProvidersWithModelsQuery, GetAvailableLlmProvidersWithModelsQueryVariables>;
export const GetGeminiSetupConfigDocument = gql`
    query GetGeminiSetupConfig {
  getGeminiSetupConfig {
    mode
    geminiApiKeyConfigured
    vertexApiKeyConfigured
    vertexProject
    vertexLocation
  }
}
    `;

/**
 * __useGetGeminiSetupConfigQuery__
 *
 * To run a query within a Vue component, call `useGetGeminiSetupConfigQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetGeminiSetupConfigQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetGeminiSetupConfigQuery();
 */
export function useGetGeminiSetupConfigQuery(options: VueApolloComposable.UseQueryOptions<GetGeminiSetupConfigQuery, GetGeminiSetupConfigQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetGeminiSetupConfigQuery, GetGeminiSetupConfigQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetGeminiSetupConfigQuery, GetGeminiSetupConfigQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetGeminiSetupConfigQuery, GetGeminiSetupConfigQueryVariables>(GetGeminiSetupConfigDocument, {}, options);
}
export function useGetGeminiSetupConfigLazyQuery(options: VueApolloComposable.UseQueryOptions<GetGeminiSetupConfigQuery, GetGeminiSetupConfigQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetGeminiSetupConfigQuery, GetGeminiSetupConfigQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetGeminiSetupConfigQuery, GetGeminiSetupConfigQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetGeminiSetupConfigQuery, GetGeminiSetupConfigQueryVariables>(GetGeminiSetupConfigDocument, {}, options);
}
export type GetGeminiSetupConfigQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetGeminiSetupConfigQuery, GetGeminiSetupConfigQueryVariables>;
export const ManagedMessagingGatewayStatusDocument = gql`
    query ManagedMessagingGatewayStatus {
  managedMessagingGatewayStatus {
    __typename
    supported
    enabled
    lifecycleState
    message
    lastError
    activeVersion
    desiredVersion
    releaseTag
    installedVersions
    bindHost
    bindPort
    pid
    providerConfig
    providerStatusByProvider
    supportedProviders
    excludedProviders
    diagnostics
    runtimeReliabilityStatus
    runtimeRunning
  }
}
    `;

/**
 * __useManagedMessagingGatewayStatusQuery__
 *
 * To run a query within a Vue component, call `useManagedMessagingGatewayStatusQuery` and pass it any options that fit your needs.
 * When your component renders, `useManagedMessagingGatewayStatusQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useManagedMessagingGatewayStatusQuery();
 */
export function useManagedMessagingGatewayStatusQuery(options: VueApolloComposable.UseQueryOptions<ManagedMessagingGatewayStatusQuery, ManagedMessagingGatewayStatusQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ManagedMessagingGatewayStatusQuery, ManagedMessagingGatewayStatusQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ManagedMessagingGatewayStatusQuery, ManagedMessagingGatewayStatusQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<ManagedMessagingGatewayStatusQuery, ManagedMessagingGatewayStatusQueryVariables>(ManagedMessagingGatewayStatusDocument, {}, options);
}
export function useManagedMessagingGatewayStatusLazyQuery(options: VueApolloComposable.UseQueryOptions<ManagedMessagingGatewayStatusQuery, ManagedMessagingGatewayStatusQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ManagedMessagingGatewayStatusQuery, ManagedMessagingGatewayStatusQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ManagedMessagingGatewayStatusQuery, ManagedMessagingGatewayStatusQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<ManagedMessagingGatewayStatusQuery, ManagedMessagingGatewayStatusQueryVariables>(ManagedMessagingGatewayStatusDocument, {}, options);
}
export type ManagedMessagingGatewayStatusQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<ManagedMessagingGatewayStatusQuery, ManagedMessagingGatewayStatusQueryVariables>;
export const ManagedMessagingGatewayWeComAccountsDocument = gql`
    query ManagedMessagingGatewayWeComAccounts {
  managedMessagingGatewayWeComAccounts {
    __typename
    accountId
    label
    mode
  }
}
    `;

/**
 * __useManagedMessagingGatewayWeComAccountsQuery__
 *
 * To run a query within a Vue component, call `useManagedMessagingGatewayWeComAccountsQuery` and pass it any options that fit your needs.
 * When your component renders, `useManagedMessagingGatewayWeComAccountsQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useManagedMessagingGatewayWeComAccountsQuery();
 */
export function useManagedMessagingGatewayWeComAccountsQuery(options: VueApolloComposable.UseQueryOptions<ManagedMessagingGatewayWeComAccountsQuery, ManagedMessagingGatewayWeComAccountsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ManagedMessagingGatewayWeComAccountsQuery, ManagedMessagingGatewayWeComAccountsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ManagedMessagingGatewayWeComAccountsQuery, ManagedMessagingGatewayWeComAccountsQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<ManagedMessagingGatewayWeComAccountsQuery, ManagedMessagingGatewayWeComAccountsQueryVariables>(ManagedMessagingGatewayWeComAccountsDocument, {}, options);
}
export function useManagedMessagingGatewayWeComAccountsLazyQuery(options: VueApolloComposable.UseQueryOptions<ManagedMessagingGatewayWeComAccountsQuery, ManagedMessagingGatewayWeComAccountsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ManagedMessagingGatewayWeComAccountsQuery, ManagedMessagingGatewayWeComAccountsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ManagedMessagingGatewayWeComAccountsQuery, ManagedMessagingGatewayWeComAccountsQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<ManagedMessagingGatewayWeComAccountsQuery, ManagedMessagingGatewayWeComAccountsQueryVariables>(ManagedMessagingGatewayWeComAccountsDocument, {}, options);
}
export type ManagedMessagingGatewayWeComAccountsQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<ManagedMessagingGatewayWeComAccountsQuery, ManagedMessagingGatewayWeComAccountsQueryVariables>;
export const ManagedMessagingGatewayPeerCandidatesDocument = gql`
    query ManagedMessagingGatewayPeerCandidates($provider: String!, $includeGroups: Boolean!, $limit: Int!) {
  managedMessagingGatewayPeerCandidates(
    provider: $provider
    includeGroups: $includeGroups
    limit: $limit
  ) {
    __typename
    accountId
    updatedAt
    items {
      __typename
      peerId
      peerType
      threadId
      displayName
      lastMessageAt
    }
  }
}
    `;

/**
 * __useManagedMessagingGatewayPeerCandidatesQuery__
 *
 * To run a query within a Vue component, call `useManagedMessagingGatewayPeerCandidatesQuery` and pass it any options that fit your needs.
 * When your component renders, `useManagedMessagingGatewayPeerCandidatesQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useManagedMessagingGatewayPeerCandidatesQuery({
 *   provider: // value for 'provider'
 *   includeGroups: // value for 'includeGroups'
 *   limit: // value for 'limit'
 * });
 */
export function useManagedMessagingGatewayPeerCandidatesQuery(variables: ManagedMessagingGatewayPeerCandidatesQueryVariables | VueCompositionApi.Ref<ManagedMessagingGatewayPeerCandidatesQueryVariables> | ReactiveFunction<ManagedMessagingGatewayPeerCandidatesQueryVariables>, options: VueApolloComposable.UseQueryOptions<ManagedMessagingGatewayPeerCandidatesQuery, ManagedMessagingGatewayPeerCandidatesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ManagedMessagingGatewayPeerCandidatesQuery, ManagedMessagingGatewayPeerCandidatesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ManagedMessagingGatewayPeerCandidatesQuery, ManagedMessagingGatewayPeerCandidatesQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<ManagedMessagingGatewayPeerCandidatesQuery, ManagedMessagingGatewayPeerCandidatesQueryVariables>(ManagedMessagingGatewayPeerCandidatesDocument, variables, options);
}
export function useManagedMessagingGatewayPeerCandidatesLazyQuery(variables?: ManagedMessagingGatewayPeerCandidatesQueryVariables | VueCompositionApi.Ref<ManagedMessagingGatewayPeerCandidatesQueryVariables> | ReactiveFunction<ManagedMessagingGatewayPeerCandidatesQueryVariables>, options: VueApolloComposable.UseQueryOptions<ManagedMessagingGatewayPeerCandidatesQuery, ManagedMessagingGatewayPeerCandidatesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ManagedMessagingGatewayPeerCandidatesQuery, ManagedMessagingGatewayPeerCandidatesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ManagedMessagingGatewayPeerCandidatesQuery, ManagedMessagingGatewayPeerCandidatesQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<ManagedMessagingGatewayPeerCandidatesQuery, ManagedMessagingGatewayPeerCandidatesQueryVariables>(ManagedMessagingGatewayPeerCandidatesDocument, variables, options);
}
export type ManagedMessagingGatewayPeerCandidatesQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<ManagedMessagingGatewayPeerCandidatesQuery, ManagedMessagingGatewayPeerCandidatesQueryVariables>;
export const GetMcpServersDocument = gql`
    query GetMcpServers {
  mcpServers {
    __typename
    ... on StdioMcpServerConfig {
      serverId
      transportType
      enabled
      toolNamePrefix
      command
      args
      env
      cwd
    }
    ... on StreamableHttpMcpServerConfig {
      serverId
      transportType
      enabled
      toolNamePrefix
      url
      token
      headers
    }
  }
}
    `;

/**
 * __useGetMcpServersQuery__
 *
 * To run a query within a Vue component, call `useGetMcpServersQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMcpServersQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetMcpServersQuery();
 */
export function useGetMcpServersQuery(options: VueApolloComposable.UseQueryOptions<GetMcpServersQuery, GetMcpServersQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetMcpServersQuery, GetMcpServersQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetMcpServersQuery, GetMcpServersQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetMcpServersQuery, GetMcpServersQueryVariables>(GetMcpServersDocument, {}, options);
}
export function useGetMcpServersLazyQuery(options: VueApolloComposable.UseQueryOptions<GetMcpServersQuery, GetMcpServersQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetMcpServersQuery, GetMcpServersQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetMcpServersQuery, GetMcpServersQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetMcpServersQuery, GetMcpServersQueryVariables>(GetMcpServersDocument, {}, options);
}
export type GetMcpServersQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetMcpServersQuery, GetMcpServersQueryVariables>;
export const PreviewMcpServerToolsDocument = gql`
    query PreviewMcpServerTools($input: McpServerInput!) {
  previewMcpServerTools(input: $input) {
    __typename
    name
    description
  }
}
    `;

/**
 * __usePreviewMcpServerToolsQuery__
 *
 * To run a query within a Vue component, call `usePreviewMcpServerToolsQuery` and pass it any options that fit your needs.
 * When your component renders, `usePreviewMcpServerToolsQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = usePreviewMcpServerToolsQuery({
 *   input: // value for 'input'
 * });
 */
export function usePreviewMcpServerToolsQuery(variables: PreviewMcpServerToolsQueryVariables | VueCompositionApi.Ref<PreviewMcpServerToolsQueryVariables> | ReactiveFunction<PreviewMcpServerToolsQueryVariables>, options: VueApolloComposable.UseQueryOptions<PreviewMcpServerToolsQuery, PreviewMcpServerToolsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<PreviewMcpServerToolsQuery, PreviewMcpServerToolsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<PreviewMcpServerToolsQuery, PreviewMcpServerToolsQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<PreviewMcpServerToolsQuery, PreviewMcpServerToolsQueryVariables>(PreviewMcpServerToolsDocument, variables, options);
}
export function usePreviewMcpServerToolsLazyQuery(variables?: PreviewMcpServerToolsQueryVariables | VueCompositionApi.Ref<PreviewMcpServerToolsQueryVariables> | ReactiveFunction<PreviewMcpServerToolsQueryVariables>, options: VueApolloComposable.UseQueryOptions<PreviewMcpServerToolsQuery, PreviewMcpServerToolsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<PreviewMcpServerToolsQuery, PreviewMcpServerToolsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<PreviewMcpServerToolsQuery, PreviewMcpServerToolsQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<PreviewMcpServerToolsQuery, PreviewMcpServerToolsQueryVariables>(PreviewMcpServerToolsDocument, variables, options);
}
export type PreviewMcpServerToolsQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<PreviewMcpServerToolsQuery, PreviewMcpServerToolsQueryVariables>;
export const ListAgentsWithMemoryDocument = gql`
    query ListAgentsWithMemory($search: String, $page: Int, $pageSize: Int) {
  listAgentsWithMemory(search: $search, page: $page, pageSize: $pageSize) {
    total
    page
    pageSize
    totalPages
    entries {
      attribution
      agentDefinitionId
      displayName
      stableId
      runCount
      latestMemoryAt
      memory {
        latestMemoryAt
        hasWorkingContext
        hasEpisodic
        hasSemantic
        hasRawTraces
        hasRawArchive
      }
    }
  }
}
    `;

/**
 * __useListAgentsWithMemoryQuery__
 *
 * To run a query within a Vue component, call `useListAgentsWithMemoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useListAgentsWithMemoryQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useListAgentsWithMemoryQuery({
 *   search: // value for 'search'
 *   page: // value for 'page'
 *   pageSize: // value for 'pageSize'
 * });
 */
export function useListAgentsWithMemoryQuery(variables: ListAgentsWithMemoryQueryVariables | VueCompositionApi.Ref<ListAgentsWithMemoryQueryVariables> | ReactiveFunction<ListAgentsWithMemoryQueryVariables> = {}, options: VueApolloComposable.UseQueryOptions<ListAgentsWithMemoryQuery, ListAgentsWithMemoryQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ListAgentsWithMemoryQuery, ListAgentsWithMemoryQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ListAgentsWithMemoryQuery, ListAgentsWithMemoryQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<ListAgentsWithMemoryQuery, ListAgentsWithMemoryQueryVariables>(ListAgentsWithMemoryDocument, variables, options);
}
export function useListAgentsWithMemoryLazyQuery(variables: ListAgentsWithMemoryQueryVariables | VueCompositionApi.Ref<ListAgentsWithMemoryQueryVariables> | ReactiveFunction<ListAgentsWithMemoryQueryVariables> = {}, options: VueApolloComposable.UseQueryOptions<ListAgentsWithMemoryQuery, ListAgentsWithMemoryQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ListAgentsWithMemoryQuery, ListAgentsWithMemoryQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ListAgentsWithMemoryQuery, ListAgentsWithMemoryQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<ListAgentsWithMemoryQuery, ListAgentsWithMemoryQueryVariables>(ListAgentsWithMemoryDocument, variables, options);
}
export type ListAgentsWithMemoryQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<ListAgentsWithMemoryQuery, ListAgentsWithMemoryQueryVariables>;
export const ListAgentRunsWithMemoryDocument = gql`
    query ListAgentRunsWithMemory($selector: AgentWithMemorySelectorInput!, $search: String, $page: Int, $pageSize: Int) {
  listAgentRunsWithMemory(
    selector: $selector
    search: $search
    page: $page
    pageSize: $pageSize
  ) {
    total
    page
    pageSize
    totalPages
    entries {
      runId
      agentDefinitionId
      agentName
      summary
      workspaceRootPath
      createdAt
      lastUpdatedAt
      memory {
        latestMemoryAt
        hasWorkingContext
        hasEpisodic
        hasSemantic
        hasRawTraces
        hasRawArchive
      }
    }
  }
}
    `;

/**
 * __useListAgentRunsWithMemoryQuery__
 *
 * To run a query within a Vue component, call `useListAgentRunsWithMemoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useListAgentRunsWithMemoryQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useListAgentRunsWithMemoryQuery({
 *   selector: // value for 'selector'
 *   search: // value for 'search'
 *   page: // value for 'page'
 *   pageSize: // value for 'pageSize'
 * });
 */
export function useListAgentRunsWithMemoryQuery(variables: ListAgentRunsWithMemoryQueryVariables | VueCompositionApi.Ref<ListAgentRunsWithMemoryQueryVariables> | ReactiveFunction<ListAgentRunsWithMemoryQueryVariables>, options: VueApolloComposable.UseQueryOptions<ListAgentRunsWithMemoryQuery, ListAgentRunsWithMemoryQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ListAgentRunsWithMemoryQuery, ListAgentRunsWithMemoryQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ListAgentRunsWithMemoryQuery, ListAgentRunsWithMemoryQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<ListAgentRunsWithMemoryQuery, ListAgentRunsWithMemoryQueryVariables>(ListAgentRunsWithMemoryDocument, variables, options);
}
export function useListAgentRunsWithMemoryLazyQuery(variables?: ListAgentRunsWithMemoryQueryVariables | VueCompositionApi.Ref<ListAgentRunsWithMemoryQueryVariables> | ReactiveFunction<ListAgentRunsWithMemoryQueryVariables>, options: VueApolloComposable.UseQueryOptions<ListAgentRunsWithMemoryQuery, ListAgentRunsWithMemoryQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ListAgentRunsWithMemoryQuery, ListAgentRunsWithMemoryQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ListAgentRunsWithMemoryQuery, ListAgentRunsWithMemoryQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<ListAgentRunsWithMemoryQuery, ListAgentRunsWithMemoryQueryVariables>(ListAgentRunsWithMemoryDocument, variables, options);
}
export type ListAgentRunsWithMemoryQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<ListAgentRunsWithMemoryQuery, ListAgentRunsWithMemoryQueryVariables>;
export const ListAgentTeamsWithMemoryDocument = gql`
    query ListAgentTeamsWithMemory($search: String, $page: Int, $pageSize: Int) {
  listAgentTeamsWithMemory(search: $search, page: $page, pageSize: $pageSize) {
    total
    page
    pageSize
    totalPages
    entries {
      teamDefinitionId
      teamDefinitionName
      teamRunCount
      memberMemoryCount
      latestMemoryAt
      memory {
        latestMemoryAt
        hasWorkingContext
        hasEpisodic
        hasSemantic
        hasRawTraces
        hasRawArchive
      }
    }
  }
}
    `;

/**
 * __useListAgentTeamsWithMemoryQuery__
 *
 * To run a query within a Vue component, call `useListAgentTeamsWithMemoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useListAgentTeamsWithMemoryQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useListAgentTeamsWithMemoryQuery({
 *   search: // value for 'search'
 *   page: // value for 'page'
 *   pageSize: // value for 'pageSize'
 * });
 */
export function useListAgentTeamsWithMemoryQuery(variables: ListAgentTeamsWithMemoryQueryVariables | VueCompositionApi.Ref<ListAgentTeamsWithMemoryQueryVariables> | ReactiveFunction<ListAgentTeamsWithMemoryQueryVariables> = {}, options: VueApolloComposable.UseQueryOptions<ListAgentTeamsWithMemoryQuery, ListAgentTeamsWithMemoryQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ListAgentTeamsWithMemoryQuery, ListAgentTeamsWithMemoryQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ListAgentTeamsWithMemoryQuery, ListAgentTeamsWithMemoryQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<ListAgentTeamsWithMemoryQuery, ListAgentTeamsWithMemoryQueryVariables>(ListAgentTeamsWithMemoryDocument, variables, options);
}
export function useListAgentTeamsWithMemoryLazyQuery(variables: ListAgentTeamsWithMemoryQueryVariables | VueCompositionApi.Ref<ListAgentTeamsWithMemoryQueryVariables> | ReactiveFunction<ListAgentTeamsWithMemoryQueryVariables> = {}, options: VueApolloComposable.UseQueryOptions<ListAgentTeamsWithMemoryQuery, ListAgentTeamsWithMemoryQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ListAgentTeamsWithMemoryQuery, ListAgentTeamsWithMemoryQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ListAgentTeamsWithMemoryQuery, ListAgentTeamsWithMemoryQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<ListAgentTeamsWithMemoryQuery, ListAgentTeamsWithMemoryQueryVariables>(ListAgentTeamsWithMemoryDocument, variables, options);
}
export type ListAgentTeamsWithMemoryQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<ListAgentTeamsWithMemoryQuery, ListAgentTeamsWithMemoryQueryVariables>;
export const ListAgentTeamRunsWithMemoryDocument = gql`
    query ListAgentTeamRunsWithMemory($teamDefinitionId: String!, $search: String, $page: Int, $pageSize: Int) {
  listAgentTeamRunsWithMemory(
    teamDefinitionId: $teamDefinitionId
    search: $search
    page: $page
    pageSize: $pageSize
  ) {
    total
    page
    pageSize
    totalPages
    entries {
      teamRunId
      teamDefinitionId
      teamDefinitionName
      summary
      workspaceRootPath
      createdAt
      lastUpdatedAt
      memory {
        latestMemoryAt
        hasWorkingContext
        hasEpisodic
        hasSemantic
        hasRawTraces
        hasRawArchive
      }
      memberTargets {
        memberRouteKey
        memberName
        memberRunId
        agentDefinitionId
        lastUpdatedAt
        memory {
          latestMemoryAt
          hasWorkingContext
          hasEpisodic
          hasSemantic
          hasRawTraces
          hasRawArchive
        }
      }
    }
  }
}
    `;

/**
 * __useListAgentTeamRunsWithMemoryQuery__
 *
 * To run a query within a Vue component, call `useListAgentTeamRunsWithMemoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useListAgentTeamRunsWithMemoryQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useListAgentTeamRunsWithMemoryQuery({
 *   teamDefinitionId: // value for 'teamDefinitionId'
 *   search: // value for 'search'
 *   page: // value for 'page'
 *   pageSize: // value for 'pageSize'
 * });
 */
export function useListAgentTeamRunsWithMemoryQuery(variables: ListAgentTeamRunsWithMemoryQueryVariables | VueCompositionApi.Ref<ListAgentTeamRunsWithMemoryQueryVariables> | ReactiveFunction<ListAgentTeamRunsWithMemoryQueryVariables>, options: VueApolloComposable.UseQueryOptions<ListAgentTeamRunsWithMemoryQuery, ListAgentTeamRunsWithMemoryQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ListAgentTeamRunsWithMemoryQuery, ListAgentTeamRunsWithMemoryQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ListAgentTeamRunsWithMemoryQuery, ListAgentTeamRunsWithMemoryQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<ListAgentTeamRunsWithMemoryQuery, ListAgentTeamRunsWithMemoryQueryVariables>(ListAgentTeamRunsWithMemoryDocument, variables, options);
}
export function useListAgentTeamRunsWithMemoryLazyQuery(variables?: ListAgentTeamRunsWithMemoryQueryVariables | VueCompositionApi.Ref<ListAgentTeamRunsWithMemoryQueryVariables> | ReactiveFunction<ListAgentTeamRunsWithMemoryQueryVariables>, options: VueApolloComposable.UseQueryOptions<ListAgentTeamRunsWithMemoryQuery, ListAgentTeamRunsWithMemoryQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ListAgentTeamRunsWithMemoryQuery, ListAgentTeamRunsWithMemoryQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ListAgentTeamRunsWithMemoryQuery, ListAgentTeamRunsWithMemoryQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<ListAgentTeamRunsWithMemoryQuery, ListAgentTeamRunsWithMemoryQueryVariables>(ListAgentTeamRunsWithMemoryDocument, variables, options);
}
export type ListAgentTeamRunsWithMemoryQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<ListAgentTeamRunsWithMemoryQuery, ListAgentTeamRunsWithMemoryQueryVariables>;
export const GetAgentRunMemoryViewDocument = gql`
    query GetAgentRunMemoryView($runId: String!, $includeWorkingContext: Boolean, $includeEpisodic: Boolean, $includeSemantic: Boolean, $includeRawTraces: Boolean, $includeArchive: Boolean, $rawTraceLimit: Int) {
  getAgentRunMemoryView(
    runId: $runId
    includeWorkingContext: $includeWorkingContext
    includeEpisodic: $includeEpisodic
    includeSemantic: $includeSemantic
    includeRawTraces: $includeRawTraces
    includeArchive: $includeArchive
    rawTraceLimit: $rawTraceLimit
  ) {
    runId
    workingContext {
      role
      content
      reasoning
      toolPayload
      ts
    }
    episodic
    semantic
    rawTraces {
      traceType
      content
      toolName
      toolCallId
      toolArgs
      toolResult
      toolError
      media
      turnId
      seq
      ts
    }
  }
}
    `;

/**
 * __useGetAgentRunMemoryViewQuery__
 *
 * To run a query within a Vue component, call `useGetAgentRunMemoryViewQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAgentRunMemoryViewQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetAgentRunMemoryViewQuery({
 *   runId: // value for 'runId'
 *   includeWorkingContext: // value for 'includeWorkingContext'
 *   includeEpisodic: // value for 'includeEpisodic'
 *   includeSemantic: // value for 'includeSemantic'
 *   includeRawTraces: // value for 'includeRawTraces'
 *   includeArchive: // value for 'includeArchive'
 *   rawTraceLimit: // value for 'rawTraceLimit'
 * });
 */
export function useGetAgentRunMemoryViewQuery(variables: GetAgentRunMemoryViewQueryVariables | VueCompositionApi.Ref<GetAgentRunMemoryViewQueryVariables> | ReactiveFunction<GetAgentRunMemoryViewQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetAgentRunMemoryViewQuery, GetAgentRunMemoryViewQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetAgentRunMemoryViewQuery, GetAgentRunMemoryViewQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetAgentRunMemoryViewQuery, GetAgentRunMemoryViewQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetAgentRunMemoryViewQuery, GetAgentRunMemoryViewQueryVariables>(GetAgentRunMemoryViewDocument, variables, options);
}
export function useGetAgentRunMemoryViewLazyQuery(variables?: GetAgentRunMemoryViewQueryVariables | VueCompositionApi.Ref<GetAgentRunMemoryViewQueryVariables> | ReactiveFunction<GetAgentRunMemoryViewQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetAgentRunMemoryViewQuery, GetAgentRunMemoryViewQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetAgentRunMemoryViewQuery, GetAgentRunMemoryViewQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetAgentRunMemoryViewQuery, GetAgentRunMemoryViewQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetAgentRunMemoryViewQuery, GetAgentRunMemoryViewQueryVariables>(GetAgentRunMemoryViewDocument, variables, options);
}
export type GetAgentRunMemoryViewQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetAgentRunMemoryViewQuery, GetAgentRunMemoryViewQueryVariables>;
export const GetTeamMemberRunMemoryViewDocument = gql`
    query GetTeamMemberRunMemoryView($teamRunId: String!, $memberRunId: String!, $includeWorkingContext: Boolean, $includeEpisodic: Boolean, $includeSemantic: Boolean, $includeRawTraces: Boolean, $includeArchive: Boolean, $rawTraceLimit: Int) {
  getTeamMemberRunMemoryView(
    teamRunId: $teamRunId
    memberRunId: $memberRunId
    includeWorkingContext: $includeWorkingContext
    includeEpisodic: $includeEpisodic
    includeSemantic: $includeSemantic
    includeRawTraces: $includeRawTraces
    includeArchive: $includeArchive
    rawTraceLimit: $rawTraceLimit
  ) {
    runId
    workingContext {
      role
      content
      reasoning
      toolPayload
      ts
    }
    episodic
    semantic
    rawTraces {
      traceType
      content
      toolName
      toolCallId
      toolArgs
      toolResult
      toolError
      media
      turnId
      seq
      ts
    }
  }
}
    `;

/**
 * __useGetTeamMemberRunMemoryViewQuery__
 *
 * To run a query within a Vue component, call `useGetTeamMemberRunMemoryViewQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTeamMemberRunMemoryViewQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetTeamMemberRunMemoryViewQuery({
 *   teamRunId: // value for 'teamRunId'
 *   memberRunId: // value for 'memberRunId'
 *   includeWorkingContext: // value for 'includeWorkingContext'
 *   includeEpisodic: // value for 'includeEpisodic'
 *   includeSemantic: // value for 'includeSemantic'
 *   includeRawTraces: // value for 'includeRawTraces'
 *   includeArchive: // value for 'includeArchive'
 *   rawTraceLimit: // value for 'rawTraceLimit'
 * });
 */
export function useGetTeamMemberRunMemoryViewQuery(variables: GetTeamMemberRunMemoryViewQueryVariables | VueCompositionApi.Ref<GetTeamMemberRunMemoryViewQueryVariables> | ReactiveFunction<GetTeamMemberRunMemoryViewQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTeamMemberRunMemoryViewQuery, GetTeamMemberRunMemoryViewQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTeamMemberRunMemoryViewQuery, GetTeamMemberRunMemoryViewQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTeamMemberRunMemoryViewQuery, GetTeamMemberRunMemoryViewQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetTeamMemberRunMemoryViewQuery, GetTeamMemberRunMemoryViewQueryVariables>(GetTeamMemberRunMemoryViewDocument, variables, options);
}
export function useGetTeamMemberRunMemoryViewLazyQuery(variables?: GetTeamMemberRunMemoryViewQueryVariables | VueCompositionApi.Ref<GetTeamMemberRunMemoryViewQueryVariables> | ReactiveFunction<GetTeamMemberRunMemoryViewQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTeamMemberRunMemoryViewQuery, GetTeamMemberRunMemoryViewQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTeamMemberRunMemoryViewQuery, GetTeamMemberRunMemoryViewQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTeamMemberRunMemoryViewQuery, GetTeamMemberRunMemoryViewQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetTeamMemberRunMemoryViewQuery, GetTeamMemberRunMemoryViewQueryVariables>(GetTeamMemberRunMemoryViewDocument, variables, options);
}
export type GetTeamMemberRunMemoryViewQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetTeamMemberRunMemoryViewQuery, GetTeamMemberRunMemoryViewQueryVariables>;
export const ListWorkspaceRunHistoryDocument = gql`
    query ListWorkspaceRunHistory($limitPerAgent: Int = 6) {
  listWorkspaceRunHistory(limitPerAgent: $limitPerAgent) {
    workspaceRootPath
    workspaceName
    agentDefinitions {
      agentDefinitionId
      agentName
      runs {
        runId
        summary
        createdAt
        archivedAt
        terminatedAt
        status
        isActive
        shouldConnectStream
        statusSource
      }
    }
    teamDefinitions {
      teamDefinitionId
      teamDefinitionName
      runs {
        teamRunId
        teamDefinitionId
        teamDefinitionName
        coordinatorMemberRouteKey
        workspaceRootPath
        summary
        createdAt
        archivedAt
        terminatedAt
        status
        isActive
        memberTree
        members {
          memberRouteKey
          memberName
          memberRunId
          status
          runtimeKind
          workspaceRootPath
        }
      }
    }
  }
}
    `;

/**
 * __useListWorkspaceRunHistoryQuery__
 *
 * To run a query within a Vue component, call `useListWorkspaceRunHistoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useListWorkspaceRunHistoryQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useListWorkspaceRunHistoryQuery({
 *   limitPerAgent: // value for 'limitPerAgent'
 * });
 */
export function useListWorkspaceRunHistoryQuery(variables: ListWorkspaceRunHistoryQueryVariables | VueCompositionApi.Ref<ListWorkspaceRunHistoryQueryVariables> | ReactiveFunction<ListWorkspaceRunHistoryQueryVariables> = {}, options: VueApolloComposable.UseQueryOptions<ListWorkspaceRunHistoryQuery, ListWorkspaceRunHistoryQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ListWorkspaceRunHistoryQuery, ListWorkspaceRunHistoryQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ListWorkspaceRunHistoryQuery, ListWorkspaceRunHistoryQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<ListWorkspaceRunHistoryQuery, ListWorkspaceRunHistoryQueryVariables>(ListWorkspaceRunHistoryDocument, variables, options);
}
export function useListWorkspaceRunHistoryLazyQuery(variables: ListWorkspaceRunHistoryQueryVariables | VueCompositionApi.Ref<ListWorkspaceRunHistoryQueryVariables> | ReactiveFunction<ListWorkspaceRunHistoryQueryVariables> = {}, options: VueApolloComposable.UseQueryOptions<ListWorkspaceRunHistoryQuery, ListWorkspaceRunHistoryQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ListWorkspaceRunHistoryQuery, ListWorkspaceRunHistoryQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ListWorkspaceRunHistoryQuery, ListWorkspaceRunHistoryQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<ListWorkspaceRunHistoryQuery, ListWorkspaceRunHistoryQueryVariables>(ListWorkspaceRunHistoryDocument, variables, options);
}
export type ListWorkspaceRunHistoryQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<ListWorkspaceRunHistoryQuery, ListWorkspaceRunHistoryQueryVariables>;
export const GetRunProjectionDocument = gql`
    query GetRunProjection($runId: String!) {
  getRunProjection(runId: $runId) {
    runId
    summary
    lastActivityAt
    conversation
    activities
  }
}
    `;

/**
 * __useGetRunProjectionQuery__
 *
 * To run a query within a Vue component, call `useGetRunProjectionQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetRunProjectionQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetRunProjectionQuery({
 *   runId: // value for 'runId'
 * });
 */
export function useGetRunProjectionQuery(variables: GetRunProjectionQueryVariables | VueCompositionApi.Ref<GetRunProjectionQueryVariables> | ReactiveFunction<GetRunProjectionQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetRunProjectionQuery, GetRunProjectionQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetRunProjectionQuery, GetRunProjectionQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetRunProjectionQuery, GetRunProjectionQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetRunProjectionQuery, GetRunProjectionQueryVariables>(GetRunProjectionDocument, variables, options);
}
export function useGetRunProjectionLazyQuery(variables?: GetRunProjectionQueryVariables | VueCompositionApi.Ref<GetRunProjectionQueryVariables> | ReactiveFunction<GetRunProjectionQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetRunProjectionQuery, GetRunProjectionQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetRunProjectionQuery, GetRunProjectionQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetRunProjectionQuery, GetRunProjectionQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetRunProjectionQuery, GetRunProjectionQueryVariables>(GetRunProjectionDocument, variables, options);
}
export type GetRunProjectionQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetRunProjectionQuery, GetRunProjectionQueryVariables>;
export const GetRunFileChangesDocument = gql`
    query GetRunFileChanges($runId: String!) {
  getRunFileChanges(runId: $runId) {
    id
    runId
    path
    type
    status
    sourceTool
    sourceInvocationId
    content
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetRunFileChangesQuery__
 *
 * To run a query within a Vue component, call `useGetRunFileChangesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetRunFileChangesQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetRunFileChangesQuery({
 *   runId: // value for 'runId'
 * });
 */
export function useGetRunFileChangesQuery(variables: GetRunFileChangesQueryVariables | VueCompositionApi.Ref<GetRunFileChangesQueryVariables> | ReactiveFunction<GetRunFileChangesQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetRunFileChangesQuery, GetRunFileChangesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetRunFileChangesQuery, GetRunFileChangesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetRunFileChangesQuery, GetRunFileChangesQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetRunFileChangesQuery, GetRunFileChangesQueryVariables>(GetRunFileChangesDocument, variables, options);
}
export function useGetRunFileChangesLazyQuery(variables?: GetRunFileChangesQueryVariables | VueCompositionApi.Ref<GetRunFileChangesQueryVariables> | ReactiveFunction<GetRunFileChangesQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetRunFileChangesQuery, GetRunFileChangesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetRunFileChangesQuery, GetRunFileChangesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetRunFileChangesQuery, GetRunFileChangesQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetRunFileChangesQuery, GetRunFileChangesQueryVariables>(GetRunFileChangesDocument, variables, options);
}
export type GetRunFileChangesQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetRunFileChangesQuery, GetRunFileChangesQueryVariables>;
export const GetTeamRunResumeConfigDocument = gql`
    query GetTeamRunResumeConfig($teamRunId: String!) {
  getTeamRunResumeConfig(teamRunId: $teamRunId) {
    teamRunId
    isActive
    metadata
  }
}
    `;

/**
 * __useGetTeamRunResumeConfigQuery__
 *
 * To run a query within a Vue component, call `useGetTeamRunResumeConfigQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTeamRunResumeConfigQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetTeamRunResumeConfigQuery({
 *   teamRunId: // value for 'teamRunId'
 * });
 */
export function useGetTeamRunResumeConfigQuery(variables: GetTeamRunResumeConfigQueryVariables | VueCompositionApi.Ref<GetTeamRunResumeConfigQueryVariables> | ReactiveFunction<GetTeamRunResumeConfigQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTeamRunResumeConfigQuery, GetTeamRunResumeConfigQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTeamRunResumeConfigQuery, GetTeamRunResumeConfigQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTeamRunResumeConfigQuery, GetTeamRunResumeConfigQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetTeamRunResumeConfigQuery, GetTeamRunResumeConfigQueryVariables>(GetTeamRunResumeConfigDocument, variables, options);
}
export function useGetTeamRunResumeConfigLazyQuery(variables?: GetTeamRunResumeConfigQueryVariables | VueCompositionApi.Ref<GetTeamRunResumeConfigQueryVariables> | ReactiveFunction<GetTeamRunResumeConfigQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTeamRunResumeConfigQuery, GetTeamRunResumeConfigQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTeamRunResumeConfigQuery, GetTeamRunResumeConfigQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTeamRunResumeConfigQuery, GetTeamRunResumeConfigQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetTeamRunResumeConfigQuery, GetTeamRunResumeConfigQueryVariables>(GetTeamRunResumeConfigDocument, variables, options);
}
export type GetTeamRunResumeConfigQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetTeamRunResumeConfigQuery, GetTeamRunResumeConfigQueryVariables>;
export const GetTeamMemberRunProjectionDocument = gql`
    query GetTeamMemberRunProjection($teamRunId: String!, $memberRouteKey: String!) {
  getTeamMemberRunProjection(
    teamRunId: $teamRunId
    memberRouteKey: $memberRouteKey
  ) {
    agentRunId
    summary
    lastActivityAt
    conversation
    activities
  }
}
    `;

/**
 * __useGetTeamMemberRunProjectionQuery__
 *
 * To run a query within a Vue component, call `useGetTeamMemberRunProjectionQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTeamMemberRunProjectionQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetTeamMemberRunProjectionQuery({
 *   teamRunId: // value for 'teamRunId'
 *   memberRouteKey: // value for 'memberRouteKey'
 * });
 */
export function useGetTeamMemberRunProjectionQuery(variables: GetTeamMemberRunProjectionQueryVariables | VueCompositionApi.Ref<GetTeamMemberRunProjectionQueryVariables> | ReactiveFunction<GetTeamMemberRunProjectionQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTeamMemberRunProjectionQuery, GetTeamMemberRunProjectionQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTeamMemberRunProjectionQuery, GetTeamMemberRunProjectionQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTeamMemberRunProjectionQuery, GetTeamMemberRunProjectionQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetTeamMemberRunProjectionQuery, GetTeamMemberRunProjectionQueryVariables>(GetTeamMemberRunProjectionDocument, variables, options);
}
export function useGetTeamMemberRunProjectionLazyQuery(variables?: GetTeamMemberRunProjectionQueryVariables | VueCompositionApi.Ref<GetTeamMemberRunProjectionQueryVariables> | ReactiveFunction<GetTeamMemberRunProjectionQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTeamMemberRunProjectionQuery, GetTeamMemberRunProjectionQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTeamMemberRunProjectionQuery, GetTeamMemberRunProjectionQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTeamMemberRunProjectionQuery, GetTeamMemberRunProjectionQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetTeamMemberRunProjectionQuery, GetTeamMemberRunProjectionQueryVariables>(GetTeamMemberRunProjectionDocument, variables, options);
}
export type GetTeamMemberRunProjectionQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetTeamMemberRunProjectionQuery, GetTeamMemberRunProjectionQueryVariables>;
export const GetTeamCommunicationMessagesDocument = gql`
    query GetTeamCommunicationMessages($teamRunId: String!) {
  getTeamCommunicationMessages(teamRunId: $teamRunId) {
    messageId
    teamRunId
    senderRunId
    senderMemberKind
    senderMemberName
    senderMemberPath
    senderMemberRouteKey
    senderRepresentedSubTeam {
      memberKind
      memberName
      memberPath
      memberRouteKey
      memberRunId
      teamDefinitionId
      childTeamRunId
      address {
        teamRunId
        memberPath
        memberRouteKey
      }
    }
    receiverRunId
    receiverMemberKind
    receiverMemberName
    receiverMemberPath
    receiverMemberRouteKey
    receiverRepresentedSubTeam {
      memberKind
      memberName
      memberPath
      memberRouteKey
      memberRunId
      teamDefinitionId
      childTeamRunId
      address {
        teamRunId
        memberPath
        memberRouteKey
      }
    }
    content
    messageType
    createdAt
    updatedAt
    referenceFiles {
      referenceId
      path
      type
      createdAt
      updatedAt
    }
  }
}
    `;

/**
 * __useGetTeamCommunicationMessagesQuery__
 *
 * To run a query within a Vue component, call `useGetTeamCommunicationMessagesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTeamCommunicationMessagesQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetTeamCommunicationMessagesQuery({
 *   teamRunId: // value for 'teamRunId'
 * });
 */
export function useGetTeamCommunicationMessagesQuery(variables: GetTeamCommunicationMessagesQueryVariables | VueCompositionApi.Ref<GetTeamCommunicationMessagesQueryVariables> | ReactiveFunction<GetTeamCommunicationMessagesQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTeamCommunicationMessagesQuery, GetTeamCommunicationMessagesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTeamCommunicationMessagesQuery, GetTeamCommunicationMessagesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTeamCommunicationMessagesQuery, GetTeamCommunicationMessagesQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetTeamCommunicationMessagesQuery, GetTeamCommunicationMessagesQueryVariables>(GetTeamCommunicationMessagesDocument, variables, options);
}
export function useGetTeamCommunicationMessagesLazyQuery(variables?: GetTeamCommunicationMessagesQueryVariables | VueCompositionApi.Ref<GetTeamCommunicationMessagesQueryVariables> | ReactiveFunction<GetTeamCommunicationMessagesQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTeamCommunicationMessagesQuery, GetTeamCommunicationMessagesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTeamCommunicationMessagesQuery, GetTeamCommunicationMessagesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTeamCommunicationMessagesQuery, GetTeamCommunicationMessagesQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetTeamCommunicationMessagesQuery, GetTeamCommunicationMessagesQueryVariables>(GetTeamCommunicationMessagesDocument, variables, options);
}
export type GetTeamCommunicationMessagesQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetTeamCommunicationMessagesQuery, GetTeamCommunicationMessagesQueryVariables>;
export const GetAgentRunResumeConfigDocument = gql`
    query GetAgentRunResumeConfig($runId: String!) {
  getAgentRunResumeConfig(runId: $runId) {
    runId
    isActive
    metadataConfig {
      agentDefinitionId
      workspaceRootPath
      llmModelIdentifier
      llmConfig
      autoExecuteTools
      skillAccessMode
      runtimeKind
      runtimeReference {
        runtimeKind
        sessionId
        threadId
        metadata
      }
    }
    editableFields {
      llmModelIdentifier
      llmConfig
      autoExecuteTools
      skillAccessMode
      workspaceRootPath
      runtimeKind
    }
  }
}
    `;

/**
 * __useGetAgentRunResumeConfigQuery__
 *
 * To run a query within a Vue component, call `useGetAgentRunResumeConfigQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAgentRunResumeConfigQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetAgentRunResumeConfigQuery({
 *   runId: // value for 'runId'
 * });
 */
export function useGetAgentRunResumeConfigQuery(variables: GetAgentRunResumeConfigQueryVariables | VueCompositionApi.Ref<GetAgentRunResumeConfigQueryVariables> | ReactiveFunction<GetAgentRunResumeConfigQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetAgentRunResumeConfigQuery, GetAgentRunResumeConfigQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetAgentRunResumeConfigQuery, GetAgentRunResumeConfigQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetAgentRunResumeConfigQuery, GetAgentRunResumeConfigQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetAgentRunResumeConfigQuery, GetAgentRunResumeConfigQueryVariables>(GetAgentRunResumeConfigDocument, variables, options);
}
export function useGetAgentRunResumeConfigLazyQuery(variables?: GetAgentRunResumeConfigQueryVariables | VueCompositionApi.Ref<GetAgentRunResumeConfigQueryVariables> | ReactiveFunction<GetAgentRunResumeConfigQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetAgentRunResumeConfigQuery, GetAgentRunResumeConfigQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetAgentRunResumeConfigQuery, GetAgentRunResumeConfigQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetAgentRunResumeConfigQuery, GetAgentRunResumeConfigQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetAgentRunResumeConfigQuery, GetAgentRunResumeConfigQueryVariables>(GetAgentRunResumeConfigDocument, variables, options);
}
export type GetAgentRunResumeConfigQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetAgentRunResumeConfigQuery, GetAgentRunResumeConfigQueryVariables>;
export const GetRuntimeAvailabilitiesDocument = gql`
    query GetRuntimeAvailabilities {
  runtimeAvailabilities {
    runtimeKind
    enabled
    reason
  }
}
    `;

/**
 * __useGetRuntimeAvailabilitiesQuery__
 *
 * To run a query within a Vue component, call `useGetRuntimeAvailabilitiesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetRuntimeAvailabilitiesQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetRuntimeAvailabilitiesQuery();
 */
export function useGetRuntimeAvailabilitiesQuery(options: VueApolloComposable.UseQueryOptions<GetRuntimeAvailabilitiesQuery, GetRuntimeAvailabilitiesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetRuntimeAvailabilitiesQuery, GetRuntimeAvailabilitiesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetRuntimeAvailabilitiesQuery, GetRuntimeAvailabilitiesQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetRuntimeAvailabilitiesQuery, GetRuntimeAvailabilitiesQueryVariables>(GetRuntimeAvailabilitiesDocument, {}, options);
}
export function useGetRuntimeAvailabilitiesLazyQuery(options: VueApolloComposable.UseQueryOptions<GetRuntimeAvailabilitiesQuery, GetRuntimeAvailabilitiesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetRuntimeAvailabilitiesQuery, GetRuntimeAvailabilitiesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetRuntimeAvailabilitiesQuery, GetRuntimeAvailabilitiesQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetRuntimeAvailabilitiesQuery, GetRuntimeAvailabilitiesQueryVariables>(GetRuntimeAvailabilitiesDocument, {}, options);
}
export type GetRuntimeAvailabilitiesQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetRuntimeAvailabilitiesQuery, GetRuntimeAvailabilitiesQueryVariables>;
export const GetSelfEvolutionCapabilityDocument = gql`
    query GetSelfEvolutionCapability {
  selfEvolutionCapability {
    ...SelfEvolutionCapabilityFields
  }
}
    ${SelfEvolutionCapabilityFieldsFragmentDoc}`;

/**
 * __useGetSelfEvolutionCapabilityQuery__
 *
 * To run a query within a Vue component, call `useGetSelfEvolutionCapabilityQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetSelfEvolutionCapabilityQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetSelfEvolutionCapabilityQuery();
 */
export function useGetSelfEvolutionCapabilityQuery(options: VueApolloComposable.UseQueryOptions<GetSelfEvolutionCapabilityQuery, GetSelfEvolutionCapabilityQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetSelfEvolutionCapabilityQuery, GetSelfEvolutionCapabilityQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetSelfEvolutionCapabilityQuery, GetSelfEvolutionCapabilityQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetSelfEvolutionCapabilityQuery, GetSelfEvolutionCapabilityQueryVariables>(GetSelfEvolutionCapabilityDocument, {}, options);
}
export function useGetSelfEvolutionCapabilityLazyQuery(options: VueApolloComposable.UseQueryOptions<GetSelfEvolutionCapabilityQuery, GetSelfEvolutionCapabilityQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetSelfEvolutionCapabilityQuery, GetSelfEvolutionCapabilityQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetSelfEvolutionCapabilityQuery, GetSelfEvolutionCapabilityQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetSelfEvolutionCapabilityQuery, GetSelfEvolutionCapabilityQueryVariables>(GetSelfEvolutionCapabilityDocument, {}, options);
}
export type GetSelfEvolutionCapabilityQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetSelfEvolutionCapabilityQuery, GetSelfEvolutionCapabilityQueryVariables>;
export const GetAgentRunSelfEvolutionEligibilityDocument = gql`
    query GetAgentRunSelfEvolutionEligibility($runId: String!) {
  getAgentRunSelfEvolutionEligibility(runId: $runId) {
    ...SelfEvolutionEligibilityFields
  }
}
    ${SelfEvolutionEligibilityFieldsFragmentDoc}`;

/**
 * __useGetAgentRunSelfEvolutionEligibilityQuery__
 *
 * To run a query within a Vue component, call `useGetAgentRunSelfEvolutionEligibilityQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAgentRunSelfEvolutionEligibilityQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetAgentRunSelfEvolutionEligibilityQuery({
 *   runId: // value for 'runId'
 * });
 */
export function useGetAgentRunSelfEvolutionEligibilityQuery(variables: GetAgentRunSelfEvolutionEligibilityQueryVariables | VueCompositionApi.Ref<GetAgentRunSelfEvolutionEligibilityQueryVariables> | ReactiveFunction<GetAgentRunSelfEvolutionEligibilityQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetAgentRunSelfEvolutionEligibilityQuery, GetAgentRunSelfEvolutionEligibilityQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetAgentRunSelfEvolutionEligibilityQuery, GetAgentRunSelfEvolutionEligibilityQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetAgentRunSelfEvolutionEligibilityQuery, GetAgentRunSelfEvolutionEligibilityQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetAgentRunSelfEvolutionEligibilityQuery, GetAgentRunSelfEvolutionEligibilityQueryVariables>(GetAgentRunSelfEvolutionEligibilityDocument, variables, options);
}
export function useGetAgentRunSelfEvolutionEligibilityLazyQuery(variables?: GetAgentRunSelfEvolutionEligibilityQueryVariables | VueCompositionApi.Ref<GetAgentRunSelfEvolutionEligibilityQueryVariables> | ReactiveFunction<GetAgentRunSelfEvolutionEligibilityQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetAgentRunSelfEvolutionEligibilityQuery, GetAgentRunSelfEvolutionEligibilityQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetAgentRunSelfEvolutionEligibilityQuery, GetAgentRunSelfEvolutionEligibilityQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetAgentRunSelfEvolutionEligibilityQuery, GetAgentRunSelfEvolutionEligibilityQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetAgentRunSelfEvolutionEligibilityQuery, GetAgentRunSelfEvolutionEligibilityQueryVariables>(GetAgentRunSelfEvolutionEligibilityDocument, variables, options);
}
export type GetAgentRunSelfEvolutionEligibilityQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetAgentRunSelfEvolutionEligibilityQuery, GetAgentRunSelfEvolutionEligibilityQueryVariables>;
export const GetTeamMemberSelfEvolutionEligibilityDocument = gql`
    query GetTeamMemberSelfEvolutionEligibility($teamRunId: String!, $memberRunId: String!) {
  getTeamMemberSelfEvolutionEligibility(
    teamRunId: $teamRunId
    memberRunId: $memberRunId
  ) {
    ...SelfEvolutionEligibilityFields
  }
}
    ${SelfEvolutionEligibilityFieldsFragmentDoc}`;

/**
 * __useGetTeamMemberSelfEvolutionEligibilityQuery__
 *
 * To run a query within a Vue component, call `useGetTeamMemberSelfEvolutionEligibilityQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTeamMemberSelfEvolutionEligibilityQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetTeamMemberSelfEvolutionEligibilityQuery({
 *   teamRunId: // value for 'teamRunId'
 *   memberRunId: // value for 'memberRunId'
 * });
 */
export function useGetTeamMemberSelfEvolutionEligibilityQuery(variables: GetTeamMemberSelfEvolutionEligibilityQueryVariables | VueCompositionApi.Ref<GetTeamMemberSelfEvolutionEligibilityQueryVariables> | ReactiveFunction<GetTeamMemberSelfEvolutionEligibilityQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTeamMemberSelfEvolutionEligibilityQuery, GetTeamMemberSelfEvolutionEligibilityQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTeamMemberSelfEvolutionEligibilityQuery, GetTeamMemberSelfEvolutionEligibilityQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTeamMemberSelfEvolutionEligibilityQuery, GetTeamMemberSelfEvolutionEligibilityQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetTeamMemberSelfEvolutionEligibilityQuery, GetTeamMemberSelfEvolutionEligibilityQueryVariables>(GetTeamMemberSelfEvolutionEligibilityDocument, variables, options);
}
export function useGetTeamMemberSelfEvolutionEligibilityLazyQuery(variables?: GetTeamMemberSelfEvolutionEligibilityQueryVariables | VueCompositionApi.Ref<GetTeamMemberSelfEvolutionEligibilityQueryVariables> | ReactiveFunction<GetTeamMemberSelfEvolutionEligibilityQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTeamMemberSelfEvolutionEligibilityQuery, GetTeamMemberSelfEvolutionEligibilityQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTeamMemberSelfEvolutionEligibilityQuery, GetTeamMemberSelfEvolutionEligibilityQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTeamMemberSelfEvolutionEligibilityQuery, GetTeamMemberSelfEvolutionEligibilityQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetTeamMemberSelfEvolutionEligibilityQuery, GetTeamMemberSelfEvolutionEligibilityQueryVariables>(GetTeamMemberSelfEvolutionEligibilityDocument, variables, options);
}
export type GetTeamMemberSelfEvolutionEligibilityQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetTeamMemberSelfEvolutionEligibilityQuery, GetTeamMemberSelfEvolutionEligibilityQueryVariables>;
export const GetSelfEvolutionRunRecordDocument = gql`
    query GetSelfEvolutionRunRecord($evolutionRunId: String!) {
  getSelfEvolutionRunRecord(evolutionRunId: $evolutionRunId) {
    ...SelfEvolutionRunRecordSummaryFields
  }
}
    ${SelfEvolutionRunRecordSummaryFieldsFragmentDoc}`;

/**
 * __useGetSelfEvolutionRunRecordQuery__
 *
 * To run a query within a Vue component, call `useGetSelfEvolutionRunRecordQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetSelfEvolutionRunRecordQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetSelfEvolutionRunRecordQuery({
 *   evolutionRunId: // value for 'evolutionRunId'
 * });
 */
export function useGetSelfEvolutionRunRecordQuery(variables: GetSelfEvolutionRunRecordQueryVariables | VueCompositionApi.Ref<GetSelfEvolutionRunRecordQueryVariables> | ReactiveFunction<GetSelfEvolutionRunRecordQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetSelfEvolutionRunRecordQuery, GetSelfEvolutionRunRecordQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetSelfEvolutionRunRecordQuery, GetSelfEvolutionRunRecordQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetSelfEvolutionRunRecordQuery, GetSelfEvolutionRunRecordQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetSelfEvolutionRunRecordQuery, GetSelfEvolutionRunRecordQueryVariables>(GetSelfEvolutionRunRecordDocument, variables, options);
}
export function useGetSelfEvolutionRunRecordLazyQuery(variables?: GetSelfEvolutionRunRecordQueryVariables | VueCompositionApi.Ref<GetSelfEvolutionRunRecordQueryVariables> | ReactiveFunction<GetSelfEvolutionRunRecordQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetSelfEvolutionRunRecordQuery, GetSelfEvolutionRunRecordQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetSelfEvolutionRunRecordQuery, GetSelfEvolutionRunRecordQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetSelfEvolutionRunRecordQuery, GetSelfEvolutionRunRecordQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetSelfEvolutionRunRecordQuery, GetSelfEvolutionRunRecordQueryVariables>(GetSelfEvolutionRunRecordDocument, variables, options);
}
export type GetSelfEvolutionRunRecordQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetSelfEvolutionRunRecordQuery, GetSelfEvolutionRunRecordQueryVariables>;
export const GetServerSettingsDocument = gql`
    query GetServerSettings {
  getServerSettings {
    __typename
    key
    value
    description
    isEditable
    isDeletable
  }
}
    `;

/**
 * __useGetServerSettingsQuery__
 *
 * To run a query within a Vue component, call `useGetServerSettingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetServerSettingsQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetServerSettingsQuery();
 */
export function useGetServerSettingsQuery(options: VueApolloComposable.UseQueryOptions<GetServerSettingsQuery, GetServerSettingsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetServerSettingsQuery, GetServerSettingsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetServerSettingsQuery, GetServerSettingsQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetServerSettingsQuery, GetServerSettingsQueryVariables>(GetServerSettingsDocument, {}, options);
}
export function useGetServerSettingsLazyQuery(options: VueApolloComposable.UseQueryOptions<GetServerSettingsQuery, GetServerSettingsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetServerSettingsQuery, GetServerSettingsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetServerSettingsQuery, GetServerSettingsQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetServerSettingsQuery, GetServerSettingsQueryVariables>(GetServerSettingsDocument, {}, options);
}
export type GetServerSettingsQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetServerSettingsQuery, GetServerSettingsQueryVariables>;
export const GetSearchConfigDocument = gql`
    query GetSearchConfig {
  getSearchConfig {
    provider
    serperApiKeyConfigured
    serpapiApiKeyConfigured
    googleCseApiKeyConfigured
    googleCseId
    vertexAiSearchApiKeyConfigured
    vertexAiSearchServingConfig
  }
}
    `;

/**
 * __useGetSearchConfigQuery__
 *
 * To run a query within a Vue component, call `useGetSearchConfigQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetSearchConfigQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetSearchConfigQuery();
 */
export function useGetSearchConfigQuery(options: VueApolloComposable.UseQueryOptions<GetSearchConfigQuery, GetSearchConfigQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetSearchConfigQuery, GetSearchConfigQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetSearchConfigQuery, GetSearchConfigQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetSearchConfigQuery, GetSearchConfigQueryVariables>(GetSearchConfigDocument, {}, options);
}
export function useGetSearchConfigLazyQuery(options: VueApolloComposable.UseQueryOptions<GetSearchConfigQuery, GetSearchConfigQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetSearchConfigQuery, GetSearchConfigQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetSearchConfigQuery, GetSearchConfigQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetSearchConfigQuery, GetSearchConfigQueryVariables>(GetSearchConfigDocument, {}, options);
}
export type GetSearchConfigQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetSearchConfigQuery, GetSearchConfigQueryVariables>;
export const GetUsageStatisticsInPeriodDocument = gql`
    query GetUsageStatisticsInPeriod($startTime: DateTime!, $endTime: DateTime!) {
  usageStatisticsInPeriod(startTime: $startTime, endTime: $endTime) {
    llmModel
    promptTokens
    assistantTokens
    promptCost
    assistantCost
    totalCost
  }
}
    `;

/**
 * __useGetUsageStatisticsInPeriodQuery__
 *
 * To run a query within a Vue component, call `useGetUsageStatisticsInPeriodQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUsageStatisticsInPeriodQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetUsageStatisticsInPeriodQuery({
 *   startTime: // value for 'startTime'
 *   endTime: // value for 'endTime'
 * });
 */
export function useGetUsageStatisticsInPeriodQuery(variables: GetUsageStatisticsInPeriodQueryVariables | VueCompositionApi.Ref<GetUsageStatisticsInPeriodQueryVariables> | ReactiveFunction<GetUsageStatisticsInPeriodQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetUsageStatisticsInPeriodQuery, GetUsageStatisticsInPeriodQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetUsageStatisticsInPeriodQuery, GetUsageStatisticsInPeriodQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetUsageStatisticsInPeriodQuery, GetUsageStatisticsInPeriodQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetUsageStatisticsInPeriodQuery, GetUsageStatisticsInPeriodQueryVariables>(GetUsageStatisticsInPeriodDocument, variables, options);
}
export function useGetUsageStatisticsInPeriodLazyQuery(variables?: GetUsageStatisticsInPeriodQueryVariables | VueCompositionApi.Ref<GetUsageStatisticsInPeriodQueryVariables> | ReactiveFunction<GetUsageStatisticsInPeriodQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetUsageStatisticsInPeriodQuery, GetUsageStatisticsInPeriodQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetUsageStatisticsInPeriodQuery, GetUsageStatisticsInPeriodQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetUsageStatisticsInPeriodQuery, GetUsageStatisticsInPeriodQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetUsageStatisticsInPeriodQuery, GetUsageStatisticsInPeriodQueryVariables>(GetUsageStatisticsInPeriodDocument, variables, options);
}
export type GetUsageStatisticsInPeriodQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetUsageStatisticsInPeriodQuery, GetUsageStatisticsInPeriodQueryVariables>;
export const GetToolsDocument = gql`
    query GetTools($origin: ToolOriginEnum, $sourceServerId: String) {
  tools(origin: $origin, sourceServerId: $sourceServerId) {
    __typename
    name
    description
    origin
    category
    argumentSchema {
      __typename
      parameters {
        __typename
        name
        paramType
        description
        required
        defaultValue
        enumValues
        jsonSchema
      }
    }
  }
}
    `;

/**
 * __useGetToolsQuery__
 *
 * To run a query within a Vue component, call `useGetToolsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetToolsQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetToolsQuery({
 *   origin: // value for 'origin'
 *   sourceServerId: // value for 'sourceServerId'
 * });
 */
export function useGetToolsQuery(variables: GetToolsQueryVariables | VueCompositionApi.Ref<GetToolsQueryVariables> | ReactiveFunction<GetToolsQueryVariables> = {}, options: VueApolloComposable.UseQueryOptions<GetToolsQuery, GetToolsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetToolsQuery, GetToolsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetToolsQuery, GetToolsQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetToolsQuery, GetToolsQueryVariables>(GetToolsDocument, variables, options);
}
export function useGetToolsLazyQuery(variables: GetToolsQueryVariables | VueCompositionApi.Ref<GetToolsQueryVariables> | ReactiveFunction<GetToolsQueryVariables> = {}, options: VueApolloComposable.UseQueryOptions<GetToolsQuery, GetToolsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetToolsQuery, GetToolsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetToolsQuery, GetToolsQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetToolsQuery, GetToolsQueryVariables>(GetToolsDocument, variables, options);
}
export type GetToolsQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetToolsQuery, GetToolsQueryVariables>;
export const GetToolsGroupedByCategoryDocument = gql`
    query GetToolsGroupedByCategory($origin: ToolOriginEnum!) {
  toolsGroupedByCategory(origin: $origin) {
    __typename
    categoryName
    tools {
      __typename
      name
      description
      origin
      category
      argumentSchema {
        __typename
        parameters {
          __typename
          name
          paramType
          description
          required
          defaultValue
          enumValues
          jsonSchema
        }
      }
    }
  }
}
    `;

/**
 * __useGetToolsGroupedByCategoryQuery__
 *
 * To run a query within a Vue component, call `useGetToolsGroupedByCategoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetToolsGroupedByCategoryQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetToolsGroupedByCategoryQuery({
 *   origin: // value for 'origin'
 * });
 */
export function useGetToolsGroupedByCategoryQuery(variables: GetToolsGroupedByCategoryQueryVariables | VueCompositionApi.Ref<GetToolsGroupedByCategoryQueryVariables> | ReactiveFunction<GetToolsGroupedByCategoryQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetToolsGroupedByCategoryQuery, GetToolsGroupedByCategoryQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetToolsGroupedByCategoryQuery, GetToolsGroupedByCategoryQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetToolsGroupedByCategoryQuery, GetToolsGroupedByCategoryQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetToolsGroupedByCategoryQuery, GetToolsGroupedByCategoryQueryVariables>(GetToolsGroupedByCategoryDocument, variables, options);
}
export function useGetToolsGroupedByCategoryLazyQuery(variables?: GetToolsGroupedByCategoryQueryVariables | VueCompositionApi.Ref<GetToolsGroupedByCategoryQueryVariables> | ReactiveFunction<GetToolsGroupedByCategoryQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetToolsGroupedByCategoryQuery, GetToolsGroupedByCategoryQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetToolsGroupedByCategoryQuery, GetToolsGroupedByCategoryQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetToolsGroupedByCategoryQuery, GetToolsGroupedByCategoryQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetToolsGroupedByCategoryQuery, GetToolsGroupedByCategoryQueryVariables>(GetToolsGroupedByCategoryDocument, variables, options);
}
export type GetToolsGroupedByCategoryQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetToolsGroupedByCategoryQuery, GetToolsGroupedByCategoryQueryVariables>;
export const GetAllWorkspacesDocument = gql`
    query GetAllWorkspaces {
  workspaces {
    __typename
    workspaceId
    name
    displayName
    config
    workspaceRootPath
    absolutePath
    kind
    isTemp
  }
}
    `;

/**
 * __useGetAllWorkspacesQuery__
 *
 * To run a query within a Vue component, call `useGetAllWorkspacesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAllWorkspacesQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetAllWorkspacesQuery();
 */
export function useGetAllWorkspacesQuery(options: VueApolloComposable.UseQueryOptions<GetAllWorkspacesQuery, GetAllWorkspacesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetAllWorkspacesQuery, GetAllWorkspacesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetAllWorkspacesQuery, GetAllWorkspacesQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetAllWorkspacesQuery, GetAllWorkspacesQueryVariables>(GetAllWorkspacesDocument, {}, options);
}
export function useGetAllWorkspacesLazyQuery(options: VueApolloComposable.UseQueryOptions<GetAllWorkspacesQuery, GetAllWorkspacesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetAllWorkspacesQuery, GetAllWorkspacesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetAllWorkspacesQuery, GetAllWorkspacesQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetAllWorkspacesQuery, GetAllWorkspacesQueryVariables>(GetAllWorkspacesDocument, {}, options);
}
export type GetAllWorkspacesQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetAllWorkspacesQuery, GetAllWorkspacesQueryVariables>;
export const GetWorkspaceMetadataDocument = gql`
    query GetWorkspaceMetadata($rootPath: String!) {
  workspaceMetadata(rootPath: $rootPath) {
    __typename
    workspaceId
    workspaceRootPath
    displayName
    kind
  }
}
    `;

/**
 * __useGetWorkspaceMetadataQuery__
 *
 * To run a query within a Vue component, call `useGetWorkspaceMetadataQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetWorkspaceMetadataQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetWorkspaceMetadataQuery({
 *   rootPath: // value for 'rootPath'
 * });
 */
export function useGetWorkspaceMetadataQuery(variables: GetWorkspaceMetadataQueryVariables | VueCompositionApi.Ref<GetWorkspaceMetadataQueryVariables> | ReactiveFunction<GetWorkspaceMetadataQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetWorkspaceMetadataQuery, GetWorkspaceMetadataQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetWorkspaceMetadataQuery, GetWorkspaceMetadataQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetWorkspaceMetadataQuery, GetWorkspaceMetadataQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetWorkspaceMetadataQuery, GetWorkspaceMetadataQueryVariables>(GetWorkspaceMetadataDocument, variables, options);
}
export function useGetWorkspaceMetadataLazyQuery(variables?: GetWorkspaceMetadataQueryVariables | VueCompositionApi.Ref<GetWorkspaceMetadataQueryVariables> | ReactiveFunction<GetWorkspaceMetadataQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetWorkspaceMetadataQuery, GetWorkspaceMetadataQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetWorkspaceMetadataQuery, GetWorkspaceMetadataQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetWorkspaceMetadataQuery, GetWorkspaceMetadataQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetWorkspaceMetadataQuery, GetWorkspaceMetadataQueryVariables>(GetWorkspaceMetadataDocument, variables, options);
}
export type GetWorkspaceMetadataQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetWorkspaceMetadataQuery, GetWorkspaceMetadataQueryVariables>;
export const GetSkillSourcesDocument = gql`
    query GetSkillSources {
  skillSources {
    path
    skillCount
    isDefault
  }
}
    `;

/**
 * __useGetSkillSourcesQuery__
 *
 * To run a query within a Vue component, call `useGetSkillSourcesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetSkillSourcesQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetSkillSourcesQuery();
 */
export function useGetSkillSourcesQuery(options: VueApolloComposable.UseQueryOptions<GetSkillSourcesQuery, GetSkillSourcesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetSkillSourcesQuery, GetSkillSourcesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetSkillSourcesQuery, GetSkillSourcesQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetSkillSourcesQuery, GetSkillSourcesQueryVariables>(GetSkillSourcesDocument, {}, options);
}
export function useGetSkillSourcesLazyQuery(options: VueApolloComposable.UseQueryOptions<GetSkillSourcesQuery, GetSkillSourcesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetSkillSourcesQuery, GetSkillSourcesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetSkillSourcesQuery, GetSkillSourcesQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetSkillSourcesQuery, GetSkillSourcesQueryVariables>(GetSkillSourcesDocument, {}, options);
}
export type GetSkillSourcesQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetSkillSourcesQuery, GetSkillSourcesQueryVariables>;
export const AddSkillSourceDocument = gql`
    mutation AddSkillSource($path: String!) {
  addSkillSource(path: $path) {
    path
    skillCount
    isDefault
  }
}
    `;

/**
 * __useAddSkillSourceMutation__
 *
 * To run a mutation, you first call `useAddSkillSourceMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useAddSkillSourceMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useAddSkillSourceMutation({
 *   variables: {
 *     path: // value for 'path'
 *   },
 * });
 */
export function useAddSkillSourceMutation(options: VueApolloComposable.UseMutationOptions<AddSkillSourceMutation, AddSkillSourceMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<AddSkillSourceMutation, AddSkillSourceMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<AddSkillSourceMutation, AddSkillSourceMutationVariables>(AddSkillSourceDocument, options);
}
export type AddSkillSourceMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<AddSkillSourceMutation, AddSkillSourceMutationVariables>;
export const RemoveSkillSourceDocument = gql`
    mutation RemoveSkillSource($path: String!) {
  removeSkillSource(path: $path) {
    path
    skillCount
    isDefault
  }
}
    `;

/**
 * __useRemoveSkillSourceMutation__
 *
 * To run a mutation, you first call `useRemoveSkillSourceMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useRemoveSkillSourceMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useRemoveSkillSourceMutation({
 *   variables: {
 *     path: // value for 'path'
 *   },
 * });
 */
export function useRemoveSkillSourceMutation(options: VueApolloComposable.UseMutationOptions<RemoveSkillSourceMutation, RemoveSkillSourceMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<RemoveSkillSourceMutation, RemoveSkillSourceMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<RemoveSkillSourceMutation, RemoveSkillSourceMutationVariables>(RemoveSkillSourceDocument, options);
}
export type RemoveSkillSourceMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<RemoveSkillSourceMutation, RemoveSkillSourceMutationVariables>;
export const ReloadSkillCatalogDocument = gql`
    mutation ReloadSkillCatalog {
  reloadSkillCatalog {
    skills {
      name
      description
      content
      rootPath
      fileCount
      isReadonly
      isDisabled
    }
    skillSources {
      path
      skillCount
      isDefault
    }
  }
}
    `;

/**
 * __useReloadSkillCatalogMutation__
 *
 * To run a mutation, you first call `useReloadSkillCatalogMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useReloadSkillCatalogMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useReloadSkillCatalogMutation();
 */
export function useReloadSkillCatalogMutation(options: VueApolloComposable.UseMutationOptions<ReloadSkillCatalogMutation, ReloadSkillCatalogMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<ReloadSkillCatalogMutation, ReloadSkillCatalogMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<ReloadSkillCatalogMutation, ReloadSkillCatalogMutationVariables>(ReloadSkillCatalogDocument, options);
}
export type ReloadSkillCatalogMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<ReloadSkillCatalogMutation, ReloadSkillCatalogMutationVariables>;
export const GetSkillsDocument = gql`
    query GetSkills {
  skills {
    name
    description
    content
    rootPath
    fileCount
    isReadonly
    isDisabled
  }
}
    `;

/**
 * __useGetSkillsQuery__
 *
 * To run a query within a Vue component, call `useGetSkillsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetSkillsQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetSkillsQuery();
 */
export function useGetSkillsQuery(options: VueApolloComposable.UseQueryOptions<GetSkillsQuery, GetSkillsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetSkillsQuery, GetSkillsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetSkillsQuery, GetSkillsQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetSkillsQuery, GetSkillsQueryVariables>(GetSkillsDocument, {}, options);
}
export function useGetSkillsLazyQuery(options: VueApolloComposable.UseQueryOptions<GetSkillsQuery, GetSkillsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetSkillsQuery, GetSkillsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetSkillsQuery, GetSkillsQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetSkillsQuery, GetSkillsQueryVariables>(GetSkillsDocument, {}, options);
}
export type GetSkillsQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetSkillsQuery, GetSkillsQueryVariables>;
export const GetSkillDocument = gql`
    query GetSkill($name: String!) {
  skill(name: $name) {
    name
    description
    content
    rootPath
    fileCount
    isReadonly
    isDisabled
  }
}
    `;

/**
 * __useGetSkillQuery__
 *
 * To run a query within a Vue component, call `useGetSkillQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetSkillQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetSkillQuery({
 *   name: // value for 'name'
 * });
 */
export function useGetSkillQuery(variables: GetSkillQueryVariables | VueCompositionApi.Ref<GetSkillQueryVariables> | ReactiveFunction<GetSkillQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetSkillQuery, GetSkillQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetSkillQuery, GetSkillQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetSkillQuery, GetSkillQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetSkillQuery, GetSkillQueryVariables>(GetSkillDocument, variables, options);
}
export function useGetSkillLazyQuery(variables?: GetSkillQueryVariables | VueCompositionApi.Ref<GetSkillQueryVariables> | ReactiveFunction<GetSkillQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetSkillQuery, GetSkillQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetSkillQuery, GetSkillQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetSkillQuery, GetSkillQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetSkillQuery, GetSkillQueryVariables>(GetSkillDocument, variables, options);
}
export type GetSkillQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetSkillQuery, GetSkillQueryVariables>;
export const GetSkillFileTreeDocument = gql`
    query GetSkillFileTree($name: String!) {
  skillFileTree(name: $name)
}
    `;

/**
 * __useGetSkillFileTreeQuery__
 *
 * To run a query within a Vue component, call `useGetSkillFileTreeQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetSkillFileTreeQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetSkillFileTreeQuery({
 *   name: // value for 'name'
 * });
 */
export function useGetSkillFileTreeQuery(variables: GetSkillFileTreeQueryVariables | VueCompositionApi.Ref<GetSkillFileTreeQueryVariables> | ReactiveFunction<GetSkillFileTreeQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetSkillFileTreeQuery, GetSkillFileTreeQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetSkillFileTreeQuery, GetSkillFileTreeQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetSkillFileTreeQuery, GetSkillFileTreeQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetSkillFileTreeQuery, GetSkillFileTreeQueryVariables>(GetSkillFileTreeDocument, variables, options);
}
export function useGetSkillFileTreeLazyQuery(variables?: GetSkillFileTreeQueryVariables | VueCompositionApi.Ref<GetSkillFileTreeQueryVariables> | ReactiveFunction<GetSkillFileTreeQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetSkillFileTreeQuery, GetSkillFileTreeQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetSkillFileTreeQuery, GetSkillFileTreeQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetSkillFileTreeQuery, GetSkillFileTreeQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetSkillFileTreeQuery, GetSkillFileTreeQueryVariables>(GetSkillFileTreeDocument, variables, options);
}
export type GetSkillFileTreeQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetSkillFileTreeQuery, GetSkillFileTreeQueryVariables>;
export const GetSkillFileContentDocument = gql`
    query GetSkillFileContent($skillName: String!, $path: String!) {
  skillFileContent(skillName: $skillName, path: $path)
}
    `;

/**
 * __useGetSkillFileContentQuery__
 *
 * To run a query within a Vue component, call `useGetSkillFileContentQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetSkillFileContentQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetSkillFileContentQuery({
 *   skillName: // value for 'skillName'
 *   path: // value for 'path'
 * });
 */
export function useGetSkillFileContentQuery(variables: GetSkillFileContentQueryVariables | VueCompositionApi.Ref<GetSkillFileContentQueryVariables> | ReactiveFunction<GetSkillFileContentQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetSkillFileContentQuery, GetSkillFileContentQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetSkillFileContentQuery, GetSkillFileContentQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetSkillFileContentQuery, GetSkillFileContentQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetSkillFileContentQuery, GetSkillFileContentQueryVariables>(GetSkillFileContentDocument, variables, options);
}
export function useGetSkillFileContentLazyQuery(variables?: GetSkillFileContentQueryVariables | VueCompositionApi.Ref<GetSkillFileContentQueryVariables> | ReactiveFunction<GetSkillFileContentQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetSkillFileContentQuery, GetSkillFileContentQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetSkillFileContentQuery, GetSkillFileContentQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetSkillFileContentQuery, GetSkillFileContentQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetSkillFileContentQuery, GetSkillFileContentQueryVariables>(GetSkillFileContentDocument, variables, options);
}
export type GetSkillFileContentQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetSkillFileContentQuery, GetSkillFileContentQueryVariables>;
export const CreateSkillDocument = gql`
    mutation CreateSkill($input: CreateSkillInput!) {
  createSkill(input: $input) {
    name
    description
    content
    rootPath
    fileCount
  }
}
    `;

/**
 * __useCreateSkillMutation__
 *
 * To run a mutation, you first call `useCreateSkillMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useCreateSkillMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useCreateSkillMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useCreateSkillMutation(options: VueApolloComposable.UseMutationOptions<CreateSkillMutation, CreateSkillMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<CreateSkillMutation, CreateSkillMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<CreateSkillMutation, CreateSkillMutationVariables>(CreateSkillDocument, options);
}
export type CreateSkillMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<CreateSkillMutation, CreateSkillMutationVariables>;
export const UpdateSkillDocument = gql`
    mutation UpdateSkill($input: UpdateSkillInput!) {
  updateSkill(input: $input) {
    name
    description
    content
    rootPath
    fileCount
  }
}
    `;

/**
 * __useUpdateSkillMutation__
 *
 * To run a mutation, you first call `useUpdateSkillMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useUpdateSkillMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useUpdateSkillMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useUpdateSkillMutation(options: VueApolloComposable.UseMutationOptions<UpdateSkillMutation, UpdateSkillMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<UpdateSkillMutation, UpdateSkillMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<UpdateSkillMutation, UpdateSkillMutationVariables>(UpdateSkillDocument, options);
}
export type UpdateSkillMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<UpdateSkillMutation, UpdateSkillMutationVariables>;
export const DeleteSkillDocument = gql`
    mutation DeleteSkill($name: String!) {
  deleteSkill(name: $name) {
    success
    message
  }
}
    `;

/**
 * __useDeleteSkillMutation__
 *
 * To run a mutation, you first call `useDeleteSkillMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useDeleteSkillMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useDeleteSkillMutation({
 *   variables: {
 *     name: // value for 'name'
 *   },
 * });
 */
export function useDeleteSkillMutation(options: VueApolloComposable.UseMutationOptions<DeleteSkillMutation, DeleteSkillMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<DeleteSkillMutation, DeleteSkillMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<DeleteSkillMutation, DeleteSkillMutationVariables>(DeleteSkillDocument, options);
}
export type DeleteSkillMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<DeleteSkillMutation, DeleteSkillMutationVariables>;
export const UploadSkillFileDocument = gql`
    mutation UploadSkillFile($skillName: String!, $path: String!, $content: String!) {
  uploadSkillFile(skillName: $skillName, path: $path, content: $content)
}
    `;

/**
 * __useUploadSkillFileMutation__
 *
 * To run a mutation, you first call `useUploadSkillFileMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useUploadSkillFileMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useUploadSkillFileMutation({
 *   variables: {
 *     skillName: // value for 'skillName'
 *     path: // value for 'path'
 *     content: // value for 'content'
 *   },
 * });
 */
export function useUploadSkillFileMutation(options: VueApolloComposable.UseMutationOptions<UploadSkillFileMutation, UploadSkillFileMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<UploadSkillFileMutation, UploadSkillFileMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<UploadSkillFileMutation, UploadSkillFileMutationVariables>(UploadSkillFileDocument, options);
}
export type UploadSkillFileMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<UploadSkillFileMutation, UploadSkillFileMutationVariables>;
export const DeleteSkillFileDocument = gql`
    mutation DeleteSkillFile($skillName: String!, $path: String!) {
  deleteSkillFile(skillName: $skillName, path: $path)
}
    `;

/**
 * __useDeleteSkillFileMutation__
 *
 * To run a mutation, you first call `useDeleteSkillFileMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useDeleteSkillFileMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useDeleteSkillFileMutation({
 *   variables: {
 *     skillName: // value for 'skillName'
 *     path: // value for 'path'
 *   },
 * });
 */
export function useDeleteSkillFileMutation(options: VueApolloComposable.UseMutationOptions<DeleteSkillFileMutation, DeleteSkillFileMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<DeleteSkillFileMutation, DeleteSkillFileMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<DeleteSkillFileMutation, DeleteSkillFileMutationVariables>(DeleteSkillFileDocument, options);
}
export type DeleteSkillFileMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<DeleteSkillFileMutation, DeleteSkillFileMutationVariables>;
export const DisableSkillDocument = gql`
    mutation DisableSkill($name: String!) {
  disableSkill(name: $name) {
    name
    isDisabled
  }
}
    `;

/**
 * __useDisableSkillMutation__
 *
 * To run a mutation, you first call `useDisableSkillMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useDisableSkillMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useDisableSkillMutation({
 *   variables: {
 *     name: // value for 'name'
 *   },
 * });
 */
export function useDisableSkillMutation(options: VueApolloComposable.UseMutationOptions<DisableSkillMutation, DisableSkillMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<DisableSkillMutation, DisableSkillMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<DisableSkillMutation, DisableSkillMutationVariables>(DisableSkillDocument, options);
}
export type DisableSkillMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<DisableSkillMutation, DisableSkillMutationVariables>;
export const EnableSkillDocument = gql`
    mutation EnableSkill($name: String!) {
  enableSkill(name: $name) {
    name
    isDisabled
  }
}
    `;

/**
 * __useEnableSkillMutation__
 *
 * To run a mutation, you first call `useEnableSkillMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useEnableSkillMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useEnableSkillMutation({
 *   variables: {
 *     name: // value for 'name'
 *   },
 * });
 */
export function useEnableSkillMutation(options: VueApolloComposable.UseMutationOptions<EnableSkillMutation, EnableSkillMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<EnableSkillMutation, EnableSkillMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<EnableSkillMutation, EnableSkillMutationVariables>(EnableSkillDocument, options);
}
export type EnableSkillMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<EnableSkillMutation, EnableSkillMutationVariables>;
