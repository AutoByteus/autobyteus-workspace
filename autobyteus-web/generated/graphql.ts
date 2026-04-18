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
  /** DateTime scalar supporting ISO strings and date-only YYYY-MM-DD values */
  DateTime: { input: any; output: any; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: { input: any; output: any; }
  /** The `JSONObject` scalar type represents JSON objects as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSONObject: { input: any; output: any; }
};

export type ActivateSkillVersionInput = {
  skillName: Scalars['String']['input'];
  version: Scalars['String']['input'];
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
  ownershipScope: AgentTeamDefinitionOwnershipScope;
};

export enum AgentTeamDefinitionOwnershipScope {
  ApplicationOwned = 'APPLICATION_OWNED',
  Shared = 'SHARED'
}

export type Application = {
  __typename?: 'Application';
  description?: Maybe<Scalars['String']['output']>;
  entryHtmlAssetPath: Scalars['String']['output'];
  iconAssetPath?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  localApplicationId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  packageId: Scalars['String']['output'];
  runtimeTarget: ApplicationRuntimeTarget;
  writable: Scalars['Boolean']['output'];
};

export type ApplicationMemberProjectionGraph = {
  __typename?: 'ApplicationMemberProjectionGraph';
  artifactsByKey: Scalars['JSON']['output'];
  displayName: Scalars['String']['output'];
  memberRouteKey: Scalars['String']['output'];
  primaryArtifactKey?: Maybe<Scalars['String']['output']>;
  runtimeTarget?: Maybe<ApplicationRuntimeMemberTargetGraph>;
  teamPath: Array<Scalars['String']['output']>;
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

export type ApplicationRuntimeMemberTargetGraph = {
  __typename?: 'ApplicationRuntimeMemberTargetGraph';
  runId: Scalars['String']['output'];
  runtimeKind: Scalars['String']['output'];
};

export type ApplicationRuntimeTarget = {
  __typename?: 'ApplicationRuntimeTarget';
  definitionId: Scalars['String']['output'];
  kind: ApplicationRuntimeTargetKind;
  localId: Scalars['String']['output'];
};

export type ApplicationRuntimeTargetGraph = {
  __typename?: 'ApplicationRuntimeTargetGraph';
  definitionId: Scalars['String']['output'];
  kind: Scalars['String']['output'];
  runId: Scalars['String']['output'];
};

export enum ApplicationRuntimeTargetKind {
  Agent = 'AGENT',
  AgentTeam = 'AGENT_TEAM'
}

export type ApplicationSessionApplicationGraph = {
  __typename?: 'ApplicationSessionApplicationGraph';
  applicationId: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  entryHtmlAssetPath: Scalars['String']['output'];
  iconAssetPath?: Maybe<Scalars['String']['output']>;
  localApplicationId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  packageId: Scalars['String']['output'];
  writable: Scalars['Boolean']['output'];
};

export type ApplicationSessionBindingGraph = {
  __typename?: 'ApplicationSessionBindingGraph';
  applicationId: Scalars['String']['output'];
  requestedSessionId?: Maybe<Scalars['String']['output']>;
  resolution: Scalars['String']['output'];
  resolvedSessionId?: Maybe<Scalars['String']['output']>;
  session?: Maybe<ApplicationSessionGraph>;
};

export type ApplicationSessionCommandResult = {
  __typename?: 'ApplicationSessionCommandResult';
  message: Scalars['String']['output'];
  session?: Maybe<ApplicationSessionGraph>;
  success: Scalars['Boolean']['output'];
};

export type ApplicationSessionGraph = {
  __typename?: 'ApplicationSessionGraph';
  application: ApplicationSessionApplicationGraph;
  applicationSessionId: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  runtime: ApplicationRuntimeTargetGraph;
  terminatedAt?: Maybe<Scalars['String']['output']>;
  view: ApplicationSessionViewGraph;
};

export type ApplicationSessionViewGraph = {
  __typename?: 'ApplicationSessionViewGraph';
  members: Array<ApplicationMemberProjectionGraph>;
};

export type ApplicationUserContextFileInput = {
  fileName?: InputMaybe<Scalars['String']['input']>;
  fileType?: InputMaybe<ContextFileTypeEnum>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  uri: Scalars['String']['input'];
};

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

export type ConfigureMcpServerResult = {
  __typename?: 'ConfigureMcpServerResult';
  savedConfig: McpServerConfigUnion;
};

export enum ContextFileTypeEnum {
  Audio = 'AUDIO',
  Csv = 'CSV',
  Docx = 'DOCX',
  Html = 'HTML',
  Image = 'IMAGE',
  Javascript = 'JAVASCRIPT',
  Json = 'JSON',
  Markdown = 'MARKDOWN',
  Pdf = 'PDF',
  Pptx = 'PPTX',
  Python = 'PYTHON',
  Text = 'TEXT',
  Unknown = 'UNKNOWN',
  Video = 'VIDEO',
  Xlsx = 'XLSX',
  Xml = 'XML',
  FromPath = 'fromPath',
  GetReadableTextTypes = 'getReadableTextTypes'
}

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
  llmConfig?: InputMaybe<Scalars['JSON']['input']>;
  llmModelIdentifier: Scalars['String']['input'];
  runtimeKind: Scalars['String']['input'];
  skillAccessMode: ExternalChannelSkillAccessModeEnum;
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

export type CreateApplicationSessionInput = {
  applicationId: Scalars['String']['input'];
  autoExecuteTools?: InputMaybe<Scalars['Boolean']['input']>;
  llmConfig?: InputMaybe<Scalars['JSON']['input']>;
  llmModelIdentifier?: InputMaybe<Scalars['String']['input']>;
  memberConfigs?: InputMaybe<Array<CreateApplicationSessionMemberConfigInput>>;
  runtimeKind?: InputMaybe<Scalars['String']['input']>;
  skillAccessMode?: InputMaybe<ExternalChannelSkillAccessModeEnum>;
  workspaceId?: InputMaybe<Scalars['String']['input']>;
  workspaceRootPath?: InputMaybe<Scalars['String']['input']>;
};

export type CreateApplicationSessionMemberConfigInput = {
  agentDefinitionId: Scalars['String']['input'];
  autoExecuteTools: Scalars['Boolean']['input'];
  llmConfig?: InputMaybe<Scalars['JSON']['input']>;
  llmModelIdentifier: Scalars['String']['input'];
  memberName: Scalars['String']['input'];
  memberRouteKey?: InputMaybe<Scalars['String']['input']>;
  runtimeKind?: InputMaybe<Scalars['String']['input']>;
  skillAccessMode: ExternalChannelSkillAccessModeEnum;
  workspaceId?: InputMaybe<Scalars['String']['input']>;
  workspaceRootPath?: InputMaybe<Scalars['String']['input']>;
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

export type DuplicateAgentDefinitionInput = {
  newName: Scalars['String']['input'];
  sourceId: Scalars['String']['input'];
};

export type EnableSkillVersioningInput = {
  skillName: Scalars['String']['input'];
};

export type ExportNodeSyncBundleInput = {
  scope: Array<SyncEntityTypeEnum>;
  selection?: InputMaybe<ExportNodeSyncSelectionInput>;
  watermarkByEntity?: InputMaybe<Scalars['JSON']['input']>;
};

export type ExportNodeSyncBundleResult = {
  __typename?: 'ExportNodeSyncBundleResult';
  entities: Scalars['JSON']['output'];
  tombstones: Scalars['JSON']['output'];
  watermark: Scalars['String']['output'];
};

export type ExportNodeSyncSelectionInput = {
  agentDefinitionIds?: InputMaybe<Array<Scalars['String']['input']>>;
  agentTeamDefinitionIds?: InputMaybe<Array<Scalars['String']['input']>>;
  includeDeletes?: InputMaybe<Scalars['Boolean']['input']>;
  includeDependencies?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ExternalChannelBindingGql = {
  __typename?: 'ExternalChannelBindingGql';
  accountId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  launchPreset?: Maybe<ExternalChannelLaunchPresetGql>;
  peerId: Scalars['String']['output'];
  provider: Scalars['String']['output'];
  targetAgentDefinitionId?: Maybe<Scalars['String']['output']>;
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
  skillAccessMode: ExternalChannelSkillAccessModeEnum;
  workspaceRootPath: Scalars['String']['output'];
};

export type ExternalChannelLaunchPresetInput = {
  autoExecuteTools?: InputMaybe<Scalars['Boolean']['input']>;
  llmConfig?: InputMaybe<Scalars['JSONObject']['input']>;
  llmModelIdentifier: Scalars['String']['input'];
  runtimeKind?: InputMaybe<Scalars['String']['input']>;
  skillAccessMode: ExternalChannelSkillAccessModeEnum;
  workspaceRootPath: Scalars['String']['input'];
};

export enum ExternalChannelSkillAccessModeEnum {
  GlobalDiscovery = 'GLOBAL_DISCOVERY',
  None = 'NONE',
  PreloadedOnly = 'PRELOADED_ONLY'
}

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
  skillAccessMode: ExternalChannelSkillAccessModeEnum;
  workspaceRootPath: Scalars['String']['output'];
};

export type ExternalChannelTeamLaunchPresetInput = {
  autoExecuteTools?: InputMaybe<Scalars['Boolean']['input']>;
  llmConfig?: InputMaybe<Scalars['JSONObject']['input']>;
  llmModelIdentifier: Scalars['String']['input'];
  runtimeKind?: InputMaybe<Scalars['String']['input']>;
  skillAccessMode: ExternalChannelSkillAccessModeEnum;
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

export type ImportNodeSyncBundleInput = {
  bundle: Scalars['JSON']['input'];
  conflictPolicy: SyncConflictPolicyEnum;
  scope: Array<SyncEntityTypeEnum>;
  tombstonePolicy: SyncTombstonePolicyEnum;
};

export type ImportNodeSyncBundleResult = {
  __typename?: 'ImportNodeSyncBundleResult';
  appliedWatermark?: Maybe<Scalars['String']['output']>;
  failures: Array<ImportNodeSyncFailure>;
  success: Scalars['Boolean']['output'];
  summary: ImportNodeSyncSummary;
};

export type ImportNodeSyncFailure = {
  __typename?: 'ImportNodeSyncFailure';
  entityType: SyncEntityTypeEnum;
  key: Scalars['String']['output'];
  message: Scalars['String']['output'];
};

export type ImportNodeSyncSummary = {
  __typename?: 'ImportNodeSyncSummary';
  created: Scalars['Float']['output'];
  deleted: Scalars['Float']['output'];
  processed: Scalars['Float']['output'];
  skipped: Scalars['Float']['output'];
  updated: Scalars['Float']['output'];
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

export type MemoryMessage = {
  __typename?: 'MemoryMessage';
  content?: Maybe<Scalars['String']['output']>;
  reasoning?: Maybe<Scalars['String']['output']>;
  role: Scalars['String']['output'];
  toolPayload?: Maybe<Scalars['JSON']['output']>;
  ts?: Maybe<Scalars['Float']['output']>;
};

export type MemorySnapshotPage = {
  __typename?: 'MemorySnapshotPage';
  entries: Array<MemorySnapshotSummary>;
  page: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  totalPages: Scalars['Int']['output'];
};

export type MemorySnapshotSummary = {
  __typename?: 'MemorySnapshotSummary';
  hasEpisodic: Scalars['Boolean']['output'];
  hasRawArchive: Scalars['Boolean']['output'];
  hasRawTraces: Scalars['Boolean']['output'];
  hasSemantic: Scalars['Boolean']['output'];
  hasWorkingContext: Scalars['Boolean']['output'];
  lastUpdatedAt?: Maybe<Scalars['String']['output']>;
  runId: Scalars['String']['output'];
};

export type MemoryTraceEvent = {
  __typename?: 'MemoryTraceEvent';
  content?: Maybe<Scalars['String']['output']>;
  media?: Maybe<Scalars['JSON']['output']>;
  seq: Scalars['Int']['output'];
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
  activateSkillVersion: SkillVersion;
  addSkillSource: Array<SkillSource>;
  approveToolInvocation: ApproveToolInvocationResult;
  clearRemoteBrowserBridge: RemoteBrowserBridgeMutationResult;
  configureMcpServer: ConfigureMcpServerResult;
  createAgentDefinition: AgentDefinition;
  createAgentRun: CreateAgentRunResult;
  createAgentTeamDefinition: AgentTeamDefinition;
  createAgentTeamRun: CreateAgentTeamRunResult;
  createApplicationSession: ApplicationSessionCommandResult;
  createCustomLlmProvider: LlmProviderObject;
  createFileOrFolder: Scalars['String']['output'];
  createSkill: Skill;
  createWorkspace: WorkspaceInfo;
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
  duplicateAgentDefinition: AgentDefinition;
  enableManagedMessagingGateway: ManagedMessagingGatewayStatusObject;
  enableSkill: Skill;
  enableSkillVersioning: SkillVersion;
  importAgentPackage: Array<AgentPackage>;
  importApplicationPackage: Array<ApplicationPackage>;
  importMcpServerConfigs: ImportMcpServerConfigsResult;
  importSyncBundle: ImportNodeSyncBundleResult;
  moveFileOrFolder: Scalars['String']['output'];
  probeCustomLlmProvider: CustomLlmProviderProbeResultObject;
  registerRemoteBrowserBridge: RemoteBrowserBridgeMutationResult;
  reloadLlmModels: Scalars['String']['output'];
  reloadLlmProviderModels: Scalars['String']['output'];
  reloadToolSchema: ReloadToolSchemaResult;
  removeAgentPackage: Array<AgentPackage>;
  removeApplicationPackage: Array<ApplicationPackage>;
  removeSkillSource: Array<SkillSource>;
  renameFileOrFolder: Scalars['String']['output'];
  restoreAgentRun: RestoreAgentRunResult;
  restoreAgentTeamRun: RestoreAgentTeamRunResult;
  runNodeSync: RunNodeSyncResult;
  saveManagedMessagingGatewayProviderConfig: ManagedMessagingGatewayStatusObject;
  sendApplicationInput: ApplicationSessionCommandResult;
  setApplicationsEnabled: ApplicationsCapability;
  setGeminiSetupConfig: Scalars['String']['output'];
  setLlmProviderApiKey: Scalars['String']['output'];
  setSearchConfig: Scalars['String']['output'];
  terminateAgentRun: TerminateAgentRunResult;
  terminateAgentTeamRun: TerminateAgentTeamRunResult;
  terminateApplicationSession: ApplicationSessionCommandResult;
  updateAgentDefinition: AgentDefinition;
  updateAgentTeamDefinition: AgentTeamDefinition;
  updateManagedMessagingGateway: ManagedMessagingGatewayStatusObject;
  updateServerSetting: Scalars['String']['output'];
  updateSkill: Skill;
  uploadSkillFile: Scalars['Boolean']['output'];
  upsertExternalChannelBinding: ExternalChannelBindingGql;
  writeFileContent: Scalars['String']['output'];
};


export type MutationActivateSkillVersionArgs = {
  input: ActivateSkillVersionInput;
};


export type MutationAddSkillSourceArgs = {
  path: Scalars['String']['input'];
};


export type MutationApproveToolInvocationArgs = {
  input: ApproveToolInvocationInput;
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


export type MutationCreateApplicationSessionArgs = {
  input: CreateApplicationSessionInput;
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


export type MutationDuplicateAgentDefinitionArgs = {
  input: DuplicateAgentDefinitionInput;
};


export type MutationEnableSkillArgs = {
  name: Scalars['String']['input'];
};


export type MutationEnableSkillVersioningArgs = {
  input: EnableSkillVersioningInput;
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


export type MutationImportSyncBundleArgs = {
  input: ImportNodeSyncBundleInput;
};


export type MutationMoveFileOrFolderArgs = {
  destinationPath: Scalars['String']['input'];
  sourcePath: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};


export type MutationProbeCustomLlmProviderArgs = {
  input: CustomLlmProviderInputObject;
};


export type MutationRegisterRemoteBrowserBridgeArgs = {
  input: RemoteBrowserBridgeInput;
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


export type MutationRunNodeSyncArgs = {
  input: RunNodeSyncInput;
};


export type MutationSaveManagedMessagingGatewayProviderConfigArgs = {
  input: Scalars['JSONObject']['input'];
};


export type MutationSendApplicationInputArgs = {
  input: SendApplicationInputInput;
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


export type MutationTerminateAgentRunArgs = {
  agentRunId: Scalars['String']['input'];
};


export type MutationTerminateAgentTeamRunArgs = {
  teamRunId: Scalars['String']['input'];
};


export type MutationTerminateApplicationSessionArgs = {
  applicationSessionId: Scalars['String']['input'];
};


export type MutationUpdateAgentDefinitionArgs = {
  input: UpdateAgentDefinitionInput;
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

export type NodeSyncEndpointInput = {
  baseUrl: Scalars['String']['input'];
  nodeId: Scalars['String']['input'];
};

export type NodeSyncExportEntityReport = {
  __typename?: 'NodeSyncExportEntityReport';
  entityType: SyncEntityTypeEnum;
  exportedCount: Scalars['Float']['output'];
  sampleTruncated: Scalars['Boolean']['output'];
  sampledKeys: Array<Scalars['String']['output']>;
};

export type NodeSyncFailureSample = {
  __typename?: 'NodeSyncFailureSample';
  entityType: SyncEntityTypeEnum;
  key: Scalars['String']['output'];
  message: Scalars['String']['output'];
};

export type NodeSyncRunReport = {
  __typename?: 'NodeSyncRunReport';
  exportByEntity: Array<NodeSyncExportEntityReport>;
  scope: Array<SyncEntityTypeEnum>;
  sourceNodeId: Scalars['String']['output'];
  targets: Array<NodeSyncTargetDetailedReport>;
};

export type NodeSyncTargetDetailedReport = {
  __typename?: 'NodeSyncTargetDetailedReport';
  failureCountTotal: Scalars['Float']['output'];
  failureSampleTruncated: Scalars['Boolean']['output'];
  failureSamples: Array<NodeSyncFailureSample>;
  message?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  summary?: Maybe<ImportNodeSyncSummary>;
  targetNodeId: Scalars['String']['output'];
};

export type NodeSyncTargetRunResult = {
  __typename?: 'NodeSyncTargetRunResult';
  message?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  summary?: Maybe<ImportNodeSyncSummary>;
  targetNodeId: Scalars['String']['output'];
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
  applicationSession?: Maybe<ApplicationSessionGraph>;
  applicationSessionBinding: ApplicationSessionBindingGraph;
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
  exportSyncBundle: ExportNodeSyncBundleResult;
  externalChannelBindings: Array<ExternalChannelBindingGql>;
  externalChannelCapabilities: ExternalChannelCapabilities;
  externalChannelTeamDefinitionOptions: Array<ExternalChannelTeamDefinitionOptionGql>;
  fileContent: Scalars['String']['output'];
  folderChildren: Scalars['String']['output'];
  getAgentRunResumeConfig: RunResumeConfigPayload;
  getGeminiSetupConfig: GeminiSetupConfig;
  getLlmProviderApiKeyConfigured: Scalars['Boolean']['output'];
  getRunFileChanges: Array<RunFileChangeEntryObject>;
  getRunMemoryView: AgentMemoryView;
  getRunProjection: RunProjectionPayload;
  getSearchConfig: SearchConfig;
  getServerSettings: Array<ServerSetting>;
  getTeamMemberRunMemoryView: AgentMemoryView;
  getTeamMemberRunProjection: TeamMemberRunProjectionPayload;
  getTeamRunResumeConfig: TeamRunResumeConfigPayload;
  health: HealthStatus;
  listApplications: Array<Application>;
  listRunMemorySnapshots: MemorySnapshotPage;
  listTeamRunMemorySnapshots: TeamRunMemorySnapshotPage;
  listWorkspaceRunHistory: Array<WorkspaceRunHistoryGroupObject>;
  managedMessagingGatewayPeerCandidates: ManagedMessagingGatewayPeerCandidateListObject;
  managedMessagingGatewayStatus: ManagedMessagingGatewayStatusObject;
  managedMessagingGatewayWeComAccounts: Array<ManagedMessagingGatewayWeComAccountObject>;
  mcpServers: Array<McpServerConfigUnion>;
  previewMcpServerTools: Array<ToolDefinitionDetail>;
  runtimeAvailabilities: Array<RuntimeAvailabilityObject>;
  searchFiles: Array<Scalars['String']['output']>;
  skill?: Maybe<Skill>;
  skillFileContent?: Maybe<Scalars['String']['output']>;
  skillFileTree?: Maybe<Scalars['String']['output']>;
  skillSources: Array<SkillSource>;
  skillVersionDiff?: Maybe<SkillDiff>;
  skillVersions: Array<SkillVersion>;
  skills: Array<Skill>;
  tools: Array<ToolDefinitionDetail>;
  toolsGroupedByCategory: Array<ToolCategoryGroup>;
  totalCostInPeriod: Scalars['Float']['output'];
  usageStatisticsInPeriod: Array<UsageStatistics>;
  workspaces: Array<WorkspaceInfo>;
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


export type QueryApplicationSessionArgs = {
  id: Scalars['String']['input'];
};


export type QueryApplicationSessionBindingArgs = {
  applicationId: Scalars['String']['input'];
  requestedSessionId?: InputMaybe<Scalars['String']['input']>;
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


export type QueryExportSyncBundleArgs = {
  input: ExportNodeSyncBundleInput;
};


export type QueryFileContentArgs = {
  filePath: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};


export type QueryFolderChildrenArgs = {
  folderPath: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};


export type QueryGetAgentRunResumeConfigArgs = {
  runId: Scalars['String']['input'];
};


export type QueryGetLlmProviderApiKeyConfiguredArgs = {
  providerId: Scalars['String']['input'];
};


export type QueryGetRunFileChangesArgs = {
  runId: Scalars['String']['input'];
};


export type QueryGetRunMemoryViewArgs = {
  includeArchive?: Scalars['Boolean']['input'];
  includeEpisodic?: Scalars['Boolean']['input'];
  includeRawTraces?: Scalars['Boolean']['input'];
  includeSemantic?: Scalars['Boolean']['input'];
  includeWorkingContext?: Scalars['Boolean']['input'];
  rawTraceLimit?: InputMaybe<Scalars['Int']['input']>;
  runId: Scalars['String']['input'];
};


export type QueryGetRunProjectionArgs = {
  runId: Scalars['String']['input'];
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


export type QueryGetTeamRunResumeConfigArgs = {
  teamRunId: Scalars['String']['input'];
};


export type QueryListRunMemorySnapshotsArgs = {
  page?: Scalars['Int']['input'];
  pageSize?: Scalars['Int']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryListTeamRunMemorySnapshotsArgs = {
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


export type QuerySkillVersionDiffArgs = {
  fromVersion: Scalars['String']['input'];
  skillName: Scalars['String']['input'];
  toVersion: Scalars['String']['input'];
};


export type QuerySkillVersionsArgs = {
  skillName: Scalars['String']['input'];
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

export type ReloadToolSchemaResult = {
  __typename?: 'ReloadToolSchemaResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
  tool?: Maybe<ToolDefinitionDetail>;
};

export type RemoteBrowserBridgeInput = {
  authToken: Scalars['String']['input'];
  baseUrl: Scalars['String']['input'];
  expiresAt: Scalars['String']['input'];
};

export type RemoteBrowserBridgeMutationResult = {
  __typename?: 'RemoteBrowserBridgeMutationResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
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
  isActive: Scalars['Boolean']['output'];
  lastActivityAt: Scalars['String']['output'];
  lastKnownStatus: Scalars['String']['output'];
  runId: Scalars['String']['output'];
  summary: Scalars['String']['output'];
};

export type RunMetadataConfigObject = {
  __typename?: 'RunMetadataConfigObject';
  agentDefinitionId: Scalars['String']['output'];
  autoExecuteTools: Scalars['Boolean']['output'];
  llmConfig?: Maybe<Scalars['JSON']['output']>;
  llmModelIdentifier: Scalars['String']['output'];
  runtimeKind: Scalars['String']['output'];
  runtimeReference: RunRuntimeReferenceObject;
  skillAccessMode?: Maybe<ExternalChannelSkillAccessModeEnum>;
  workspaceRootPath: Scalars['String']['output'];
};

export type RunNodeSyncInput = {
  conflictPolicy: SyncConflictPolicyEnum;
  scope: Array<SyncEntityTypeEnum>;
  selection?: InputMaybe<ExportNodeSyncSelectionInput>;
  source: NodeSyncEndpointInput;
  targets: Array<NodeSyncEndpointInput>;
  tombstonePolicy: SyncTombstonePolicyEnum;
};

export type RunNodeSyncResult = {
  __typename?: 'RunNodeSyncResult';
  error?: Maybe<Scalars['String']['output']>;
  report?: Maybe<NodeSyncRunReport>;
  sourceNodeId: Scalars['String']['output'];
  status: Scalars['String']['output'];
  targetResults: Array<NodeSyncTargetRunResult>;
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

export type SendApplicationInputInput = {
  applicationSessionId: Scalars['String']['input'];
  contextFiles?: InputMaybe<Array<ApplicationUserContextFileInput>>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  targetMemberName?: InputMaybe<Scalars['String']['input']>;
  text: Scalars['String']['input'];
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
  activeVersion?: Maybe<Scalars['String']['output']>;
  content: Scalars['String']['output'];
  createdAt?: Maybe<Scalars['String']['output']>;
  description: Scalars['String']['output'];
  fileCount: Scalars['Int']['output'];
  isDisabled: Scalars['Boolean']['output'];
  isReadonly: Scalars['Boolean']['output'];
  isVersioned: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  rootPath: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['String']['output']>;
};

export type SkillDiff = {
  __typename?: 'SkillDiff';
  diffContent: Scalars['String']['output'];
  fromVersion: Scalars['String']['output'];
  toVersion: Scalars['String']['output'];
};

export type SkillSource = {
  __typename?: 'SkillSource';
  isDefault: Scalars['Boolean']['output'];
  path: Scalars['String']['output'];
  skillCount: Scalars['Int']['output'];
};

export type SkillVersion = {
  __typename?: 'SkillVersion';
  commitHash: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  isActive: Scalars['Boolean']['output'];
  message: Scalars['String']['output'];
  tag: Scalars['String']['output'];
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

export enum SyncConflictPolicyEnum {
  SourceWins = 'SOURCE_WINS',
  TargetWins = 'TARGET_WINS'
}

export enum SyncEntityTypeEnum {
  AgentDefinition = 'AGENT_DEFINITION',
  AgentTeamDefinition = 'AGENT_TEAM_DEFINITION',
  McpServerConfiguration = 'MCP_SERVER_CONFIGURATION'
}

export enum SyncTombstonePolicyEnum {
  SourceDeleteWins = 'SOURCE_DELETE_WINS'
}

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
  skillAccessMode: ExternalChannelSkillAccessModeEnum;
  workspaceId?: InputMaybe<Scalars['String']['input']>;
  workspaceRootPath?: InputMaybe<Scalars['String']['input']>;
};

export type TeamMemberInput = {
  memberName: Scalars['String']['input'];
  ref: Scalars['String']['input'];
  refScope?: InputMaybe<AgentMemberRefScope>;
  refType: TeamMemberType;
};

export type TeamMemberMemorySnapshotSummary = {
  __typename?: 'TeamMemberMemorySnapshotSummary';
  hasEpisodic: Scalars['Boolean']['output'];
  hasRawArchive: Scalars['Boolean']['output'];
  hasRawTraces: Scalars['Boolean']['output'];
  hasSemantic: Scalars['Boolean']['output'];
  hasWorkingContext: Scalars['Boolean']['output'];
  lastUpdatedAt?: Maybe<Scalars['String']['output']>;
  memberName: Scalars['String']['output'];
  memberRouteKey: Scalars['String']['output'];
  memberRunId: Scalars['String']['output'];
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

export type TeamRunMemorySnapshotPage = {
  __typename?: 'TeamRunMemorySnapshotPage';
  entries: Array<TeamRunMemorySnapshotSummary>;
  page: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  totalPages: Scalars['Int']['output'];
};

export type TeamRunMemorySnapshotSummary = {
  __typename?: 'TeamRunMemorySnapshotSummary';
  lastUpdatedAt?: Maybe<Scalars['String']['output']>;
  members: Array<TeamMemberMemorySnapshotSummary>;
  teamDefinitionId: Scalars['String']['output'];
  teamDefinitionName: Scalars['String']['output'];
  teamRunId: Scalars['String']['output'];
};

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
  coordinatorMemberRouteKey: Scalars['String']['output'];
  deleteLifecycle: Scalars['String']['output'];
  isActive: Scalars['Boolean']['output'];
  lastActivityAt: Scalars['String']['output'];
  lastKnownStatus: Scalars['String']['output'];
  members: Array<WorkspaceHistoryTeamRunMemberObject>;
  summary: Scalars['String']['output'];
  teamDefinitionId: Scalars['String']['output'];
  teamDefinitionName: Scalars['String']['output'];
  teamRunId: Scalars['String']['output'];
  workspaceRootPath?: Maybe<Scalars['String']['output']>;
};

export type WorkspaceHistoryTeamRunMemberObject = {
  __typename?: 'WorkspaceHistoryTeamRunMemberObject';
  memberName: Scalars['String']['output'];
  memberRouteKey: Scalars['String']['output'];
  memberRunId: Scalars['String']['output'];
  runtimeKind: Scalars['String']['output'];
  workspaceRootPath?: Maybe<Scalars['String']['output']>;
};

export type WorkspaceInfo = {
  __typename?: 'WorkspaceInfo';
  absolutePath?: Maybe<Scalars['String']['output']>;
  config: Scalars['JSON']['output'];
  fileExplorer?: Maybe<Scalars['String']['output']>;
  isTemp: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  workspaceId: Scalars['String']['output'];
};

export type WorkspaceRunHistoryGroupObject = {
  __typename?: 'WorkspaceRunHistoryGroupObject';
  agentDefinitions: Array<RunHistoryAgentGroupObject>;
  teamDefinitions: Array<WorkspaceHistoryTeamDefinitionObject>;
  workspaceName: Scalars['String']['output'];
  workspaceRootPath: Scalars['String']['output'];
};

export type GetAgentPackagesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAgentPackagesQuery = { __typename?: 'Query', agentPackages: Array<{ __typename?: 'AgentPackage', packageId: string, displayName: string, path: string, sourceKind: AgentPackageSourceKind, source: string, sharedAgentCount: number, teamLocalAgentCount: number, agentTeamCount: number, isDefault: boolean, isRemovable: boolean }> };

export type ImportAgentPackageMutationVariables = Exact<{
  input: ImportAgentPackageInput;
}>;


export type ImportAgentPackageMutation = { __typename?: 'Mutation', importAgentPackage: Array<{ __typename?: 'AgentPackage', packageId: string, displayName: string, path: string, sourceKind: AgentPackageSourceKind, source: string, sharedAgentCount: number, teamLocalAgentCount: number, agentTeamCount: number, isDefault: boolean, isRemovable: boolean }> };

export type RemoveAgentPackageMutationVariables = Exact<{
  packageId: Scalars['String']['input'];
}>;


export type RemoveAgentPackageMutation = { __typename?: 'Mutation', removeAgentPackage: Array<{ __typename?: 'AgentPackage', packageId: string, displayName: string, path: string, sourceKind: AgentPackageSourceKind, source: string, sharedAgentCount: number, teamLocalAgentCount: number, agentTeamCount: number, isDefault: boolean, isRemovable: boolean }> };

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

export type DuplicateAgentDefinitionMutationVariables = Exact<{
  input: DuplicateAgentDefinitionInput;
}>;


export type DuplicateAgentDefinitionMutation = { __typename?: 'Mutation', duplicateAgentDefinition: { __typename: 'AgentDefinition', id: string, name: string, role?: string | null, description: string, instructions: string, category?: string | null, avatarUrl?: string | null, toolNames: Array<string>, inputProcessorNames: Array<string>, llmResponseProcessorNames: Array<string>, systemPromptProcessorNames: Array<string>, toolExecutionResultProcessorNames: Array<string>, toolInvocationPreprocessorNames: Array<string>, lifecycleProcessorNames: Array<string>, skillNames: Array<string>, ownershipScope: AgentDefinitionOwnershipScope, ownerTeamId?: string | null, ownerTeamName?: string | null, ownerApplicationId?: string | null, ownerApplicationName?: string | null, ownerPackageId?: string | null, ownerLocalApplicationId?: string | null, defaultLaunchConfig?: { __typename?: 'DefaultLaunchConfig', llmModelIdentifier?: string | null, runtimeKind?: string | null, llmConfig?: any | null } | null } };

export type TerminateAgentRunMutationVariables = Exact<{
  agentRunId: Scalars['String']['input'];
}>;


export type TerminateAgentRunMutation = { __typename?: 'Mutation', terminateAgentRun: { __typename: 'TerminateAgentRunResult', success: boolean, message: string } };

export type CreateAgentRunMutationVariables = Exact<{
  input: CreateAgentRunInput;
}>;


export type CreateAgentRunMutation = { __typename?: 'Mutation', createAgentRun: { __typename?: 'CreateAgentRunResult', success: boolean, message: string, runId?: string | null } };

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

export type SetApplicationsEnabledMutationVariables = Exact<{
  enabled: Scalars['Boolean']['input'];
}>;


export type SetApplicationsEnabledMutation = { __typename?: 'Mutation', setApplicationsEnabled: { __typename?: 'ApplicationsCapability', enabled: boolean, scope: ApplicationsCapabilityScope, settingKey: string, source: ApplicationsCapabilitySource } };

export type CreateApplicationSessionMutationVariables = Exact<{
  input: CreateApplicationSessionInput;
}>;


export type CreateApplicationSessionMutation = { __typename?: 'Mutation', createApplicationSession: { __typename?: 'ApplicationSessionCommandResult', success: boolean, message: string, session?: { __typename?: 'ApplicationSessionGraph', applicationSessionId: string, createdAt: string, terminatedAt?: string | null, application: { __typename?: 'ApplicationSessionApplicationGraph', applicationId: string, localApplicationId: string, packageId: string, name: string, description?: string | null, iconAssetPath?: string | null, entryHtmlAssetPath: string, writable: boolean }, runtime: { __typename?: 'ApplicationRuntimeTargetGraph', kind: string, runId: string, definitionId: string }, view: { __typename?: 'ApplicationSessionViewGraph', members: Array<{ __typename?: 'ApplicationMemberProjectionGraph', memberRouteKey: string, displayName: string, teamPath: Array<string>, artifactsByKey: any, primaryArtifactKey?: string | null, runtimeTarget?: { __typename?: 'ApplicationRuntimeMemberTargetGraph', runId: string, runtimeKind: string } | null }> } } | null } };

export type TerminateApplicationSessionMutationVariables = Exact<{
  applicationSessionId: Scalars['String']['input'];
}>;


export type TerminateApplicationSessionMutation = { __typename?: 'Mutation', terminateApplicationSession: { __typename?: 'ApplicationSessionCommandResult', success: boolean, message: string, session?: { __typename?: 'ApplicationSessionGraph', applicationSessionId: string, createdAt: string, terminatedAt?: string | null, application: { __typename?: 'ApplicationSessionApplicationGraph', applicationId: string, localApplicationId: string, packageId: string, name: string, description?: string | null, iconAssetPath?: string | null, entryHtmlAssetPath: string, writable: boolean }, runtime: { __typename?: 'ApplicationRuntimeTargetGraph', kind: string, runId: string, definitionId: string }, view: { __typename?: 'ApplicationSessionViewGraph', members: Array<{ __typename?: 'ApplicationMemberProjectionGraph', memberRouteKey: string, displayName: string, teamPath: Array<string>, artifactsByKey: any, primaryArtifactKey?: string | null, runtimeTarget?: { __typename?: 'ApplicationRuntimeMemberTargetGraph', runId: string, runtimeKind: string } | null }> } } | null } };

export type SendApplicationInputMutationVariables = Exact<{
  input: SendApplicationInputInput;
}>;


export type SendApplicationInputMutation = { __typename?: 'Mutation', sendApplicationInput: { __typename?: 'ApplicationSessionCommandResult', success: boolean, message: string, session?: { __typename?: 'ApplicationSessionGraph', applicationSessionId: string, createdAt: string, terminatedAt?: string | null, application: { __typename?: 'ApplicationSessionApplicationGraph', applicationId: string, localApplicationId: string, packageId: string, name: string, description?: string | null, iconAssetPath?: string | null, entryHtmlAssetPath: string, writable: boolean }, runtime: { __typename?: 'ApplicationRuntimeTargetGraph', kind: string, runId: string, definitionId: string }, view: { __typename?: 'ApplicationSessionViewGraph', members: Array<{ __typename?: 'ApplicationMemberProjectionGraph', memberRouteKey: string, displayName: string, teamPath: Array<string>, artifactsByKey: any, primaryArtifactKey?: string | null, runtimeTarget?: { __typename?: 'ApplicationRuntimeMemberTargetGraph', runId: string, runtimeKind: string } | null }> } } | null } };

export type UpsertExternalChannelBindingMutationVariables = Exact<{
  input: UpsertExternalChannelBindingInput;
}>;


export type UpsertExternalChannelBindingMutation = { __typename?: 'Mutation', upsertExternalChannelBinding: { __typename: 'ExternalChannelBindingGql', id: string, provider: string, transport: string, accountId: string, peerId: string, threadId?: string | null, targetType: string, targetAgentDefinitionId?: string | null, targetTeamDefinitionId?: string | null, teamRunId?: string | null, updatedAt: any, launchPreset?: { __typename?: 'ExternalChannelLaunchPresetGql', workspaceRootPath: string, llmModelIdentifier: string, runtimeKind: string, autoExecuteTools: boolean, skillAccessMode: ExternalChannelSkillAccessModeEnum, llmConfig?: any | null } | null, teamLaunchPreset?: { __typename?: 'ExternalChannelTeamLaunchPresetGql', workspaceRootPath: string, llmModelIdentifier: string, runtimeKind: string, autoExecuteTools: boolean, skillAccessMode: ExternalChannelSkillAccessModeEnum, llmConfig?: any | null } | null } };

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


export type DiscoverAndRegisterMcpServerToolsMutation = { __typename?: 'Mutation', discoverAndRegisterMcpServerTools: { __typename: 'DiscoverAndRegisterMcpServerToolsResult', success: boolean, message: string, discoveredTools: Array<{ __typename: 'ToolDefinitionDetail', name: string, description: string, origin: ToolOriginEnum, category: string, argumentSchema?: { __typename: 'ToolArgumentSchema', parameters: Array<{ __typename: 'ToolParameterDefinition', name: string, paramType: ToolParameterTypeEnum, description: string, required: boolean, defaultValue?: string | null, enumValues?: Array<string> | null }> } | null }> } };

export type ImportMcpServerConfigsMutationVariables = Exact<{
  jsonString: Scalars['String']['input'];
}>;


export type ImportMcpServerConfigsMutation = { __typename?: 'Mutation', importMcpServerConfigs: { __typename: 'ImportMcpServerConfigsResult', success: boolean, message: string, importedCount: number, failedCount: number } };

export type RunNodeSyncMutationVariables = Exact<{
  input: RunNodeSyncInput;
}>;


export type RunNodeSyncMutation = { __typename?: 'Mutation', runNodeSync: { __typename?: 'RunNodeSyncResult', status: string, sourceNodeId: string, error?: string | null, report?: { __typename?: 'NodeSyncRunReport', sourceNodeId: string, scope: Array<SyncEntityTypeEnum>, exportByEntity: Array<{ __typename?: 'NodeSyncExportEntityReport', entityType: SyncEntityTypeEnum, exportedCount: number, sampledKeys: Array<string>, sampleTruncated: boolean }>, targets: Array<{ __typename?: 'NodeSyncTargetDetailedReport', targetNodeId: string, status: string, message?: string | null, failureCountTotal: number, failureSampleTruncated: boolean, failureSamples: Array<{ __typename?: 'NodeSyncFailureSample', entityType: SyncEntityTypeEnum, key: string, message: string }>, summary?: { __typename?: 'ImportNodeSyncSummary', processed: number, created: number, updated: number, deleted: number, skipped: number } | null }> } | null, targetResults: Array<{ __typename?: 'NodeSyncTargetRunResult', targetNodeId: string, status: string, message?: string | null, summary?: { __typename?: 'ImportNodeSyncSummary', processed: number, created: number, updated: number, deleted: number, skipped: number } | null }> } };

export type DeleteStoredRunMutationVariables = Exact<{
  runId: Scalars['String']['input'];
}>;


export type DeleteStoredRunMutation = { __typename?: 'Mutation', deleteStoredRun: { __typename?: 'DeleteStoredRunMutationResult', success: boolean, message: string } };

export type DeleteStoredTeamRunMutationVariables = Exact<{
  teamRunId: Scalars['String']['input'];
}>;


export type DeleteStoredTeamRunMutation = { __typename?: 'Mutation', deleteStoredTeamRun: { __typename?: 'DeleteStoredTeamRunMutationResult', success: boolean, message: string } };

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


export type ReloadToolSchemaMutation = { __typename?: 'Mutation', reloadToolSchema: { __typename?: 'ReloadToolSchemaResult', success: boolean, message: string, tool?: { __typename: 'ToolDefinitionDetail', name: string, description: string, origin: ToolOriginEnum, category: string, argumentSchema?: { __typename: 'ToolArgumentSchema', parameters: Array<{ __typename: 'ToolParameterDefinition', name: string, paramType: ToolParameterTypeEnum, description: string, required: boolean, defaultValue?: string | null, enumValues?: Array<string> | null }> } | null } | null } };

export type CreateWorkspaceMutationVariables = Exact<{
  input: CreateWorkspaceInput;
}>;


export type CreateWorkspaceMutation = { __typename?: 'Mutation', createWorkspace: { __typename: 'WorkspaceInfo', workspaceId: string, name: string, fileExplorer?: string | null, absolutePath?: string | null } };

export type GetAgentCustomizationOptionsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAgentCustomizationOptionsQuery = { __typename?: 'Query', availableToolNames: Array<string>, availableOptionalInputProcessorNames: Array<string>, availableOptionalLlmResponseProcessorNames: Array<string>, availableOptionalSystemPromptProcessorNames: Array<string>, availableOptionalToolExecutionResultProcessorNames: Array<string>, availableOptionalToolInvocationPreprocessorNames: Array<string>, availableOptionalLifecycleProcessorNames: Array<string> };

export type GetAgentDefinitionsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAgentDefinitionsQuery = { __typename?: 'Query', agentDefinitions: Array<{ __typename: 'AgentDefinition', id: string, name: string, role?: string | null, description: string, instructions: string, category?: string | null, avatarUrl?: string | null, toolNames: Array<string>, inputProcessorNames: Array<string>, llmResponseProcessorNames: Array<string>, systemPromptProcessorNames: Array<string>, toolExecutionResultProcessorNames: Array<string>, toolInvocationPreprocessorNames: Array<string>, lifecycleProcessorNames: Array<string>, skillNames: Array<string>, ownershipScope: AgentDefinitionOwnershipScope, ownerTeamId?: string | null, ownerTeamName?: string | null, ownerApplicationId?: string | null, ownerApplicationName?: string | null, ownerPackageId?: string | null, ownerLocalApplicationId?: string | null, defaultLaunchConfig?: { __typename?: 'DefaultLaunchConfig', llmModelIdentifier?: string | null, runtimeKind?: string | null, llmConfig?: any | null } | null }> };

export type ListRunMemorySnapshotsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ListRunMemorySnapshotsQuery = { __typename?: 'Query', listRunMemorySnapshots: { __typename?: 'MemorySnapshotPage', total: number, page: number, pageSize: number, totalPages: number, entries: Array<{ __typename?: 'MemorySnapshotSummary', runId: string, lastUpdatedAt?: string | null, hasWorkingContext: boolean, hasEpisodic: boolean, hasSemantic: boolean, hasRawTraces: boolean, hasRawArchive: boolean }> } };

export type GetRunMemoryViewQueryVariables = Exact<{
  runId: Scalars['String']['input'];
  includeWorkingContext?: InputMaybe<Scalars['Boolean']['input']>;
  includeEpisodic?: InputMaybe<Scalars['Boolean']['input']>;
  includeSemantic?: InputMaybe<Scalars['Boolean']['input']>;
  includeRawTraces?: InputMaybe<Scalars['Boolean']['input']>;
  includeArchive?: InputMaybe<Scalars['Boolean']['input']>;
  rawTraceLimit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetRunMemoryViewQuery = { __typename?: 'Query', getRunMemoryView: { __typename?: 'AgentMemoryView', runId: string, episodic?: Array<any> | null, semantic?: Array<any> | null, workingContext?: Array<{ __typename?: 'MemoryMessage', role: string, content?: string | null, reasoning?: string | null, toolPayload?: any | null, ts?: number | null }> | null, rawTraces?: Array<{ __typename?: 'MemoryTraceEvent', traceType: string, content?: string | null, toolName?: string | null, toolCallId?: string | null, toolArgs?: any | null, toolResult?: any | null, toolError?: string | null, media?: any | null, turnId: string, seq: number, ts: number }> | null } };

export type GetAgentTeamDefinitionsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAgentTeamDefinitionsQuery = { __typename?: 'Query', agentTeamDefinitions: Array<{ __typename: 'AgentTeamDefinition', id: string, name: string, description: string, instructions: string, category?: string | null, avatarUrl?: string | null, coordinatorMemberName: string, ownershipScope: AgentTeamDefinitionOwnershipScope, ownerApplicationId?: string | null, ownerApplicationName?: string | null, ownerPackageId?: string | null, ownerLocalApplicationId?: string | null, defaultLaunchConfig?: { __typename?: 'DefaultLaunchConfig', llmModelIdentifier?: string | null, runtimeKind?: string | null, llmConfig?: any | null } | null, nodes: Array<{ __typename: 'TeamMember', memberName: string, ref: string, refType: TeamMemberType, refScope?: AgentMemberRefScope | null }> }> };

export type ApplicationsCapabilityFieldsFragment = { __typename?: 'ApplicationsCapability', enabled: boolean, scope: ApplicationsCapabilityScope, settingKey: string, source: ApplicationsCapabilitySource };

export type GetApplicationsCapabilityQueryVariables = Exact<{ [key: string]: never; }>;


export type GetApplicationsCapabilityQuery = { __typename?: 'Query', applicationsCapability: { __typename?: 'ApplicationsCapability', enabled: boolean, scope: ApplicationsCapabilityScope, settingKey: string, source: ApplicationsCapabilitySource } };

export type ApplicationFieldsFragment = { __typename: 'Application', id: string, localApplicationId: string, packageId: string, name: string, description?: string | null, iconAssetPath?: string | null, entryHtmlAssetPath: string, writable: boolean, runtimeTarget: { __typename: 'ApplicationRuntimeTarget', kind: ApplicationRuntimeTargetKind, localId: string, definitionId: string } };

export type ListApplicationsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListApplicationsQuery = { __typename?: 'Query', listApplications: Array<{ __typename: 'Application', id: string, localApplicationId: string, packageId: string, name: string, description?: string | null, iconAssetPath?: string | null, entryHtmlAssetPath: string, writable: boolean, runtimeTarget: { __typename: 'ApplicationRuntimeTarget', kind: ApplicationRuntimeTargetKind, localId: string, definitionId: string } }> };

export type GetApplicationByIdQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetApplicationByIdQuery = { __typename?: 'Query', application?: { __typename: 'Application', id: string, localApplicationId: string, packageId: string, name: string, description?: string | null, iconAssetPath?: string | null, entryHtmlAssetPath: string, writable: boolean, runtimeTarget: { __typename: 'ApplicationRuntimeTarget', kind: ApplicationRuntimeTargetKind, localId: string, definitionId: string } } | null };

export type ApplicationMemberFieldsFragment = { __typename?: 'ApplicationMemberProjectionGraph', memberRouteKey: string, displayName: string, teamPath: Array<string>, artifactsByKey: any, primaryArtifactKey?: string | null, runtimeTarget?: { __typename?: 'ApplicationRuntimeMemberTargetGraph', runId: string, runtimeKind: string } | null };

export type ApplicationSessionFieldsFragment = { __typename?: 'ApplicationSessionGraph', applicationSessionId: string, createdAt: string, terminatedAt?: string | null, application: { __typename?: 'ApplicationSessionApplicationGraph', applicationId: string, localApplicationId: string, packageId: string, name: string, description?: string | null, iconAssetPath?: string | null, entryHtmlAssetPath: string, writable: boolean }, runtime: { __typename?: 'ApplicationRuntimeTargetGraph', kind: string, runId: string, definitionId: string }, view: { __typename?: 'ApplicationSessionViewGraph', members: Array<{ __typename?: 'ApplicationMemberProjectionGraph', memberRouteKey: string, displayName: string, teamPath: Array<string>, artifactsByKey: any, primaryArtifactKey?: string | null, runtimeTarget?: { __typename?: 'ApplicationRuntimeMemberTargetGraph', runId: string, runtimeKind: string } | null }> } };

export type ApplicationSessionBindingFieldsFragment = { __typename?: 'ApplicationSessionBindingGraph', applicationId: string, requestedSessionId?: string | null, resolvedSessionId?: string | null, resolution: string, session?: { __typename?: 'ApplicationSessionGraph', applicationSessionId: string, createdAt: string, terminatedAt?: string | null, application: { __typename?: 'ApplicationSessionApplicationGraph', applicationId: string, localApplicationId: string, packageId: string, name: string, description?: string | null, iconAssetPath?: string | null, entryHtmlAssetPath: string, writable: boolean }, runtime: { __typename?: 'ApplicationRuntimeTargetGraph', kind: string, runId: string, definitionId: string }, view: { __typename?: 'ApplicationSessionViewGraph', members: Array<{ __typename?: 'ApplicationMemberProjectionGraph', memberRouteKey: string, displayName: string, teamPath: Array<string>, artifactsByKey: any, primaryArtifactKey?: string | null, runtimeTarget?: { __typename?: 'ApplicationRuntimeMemberTargetGraph', runId: string, runtimeKind: string } | null }> } } | null };

export type GetApplicationSessionQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetApplicationSessionQuery = { __typename?: 'Query', applicationSession?: { __typename?: 'ApplicationSessionGraph', applicationSessionId: string, createdAt: string, terminatedAt?: string | null, application: { __typename?: 'ApplicationSessionApplicationGraph', applicationId: string, localApplicationId: string, packageId: string, name: string, description?: string | null, iconAssetPath?: string | null, entryHtmlAssetPath: string, writable: boolean }, runtime: { __typename?: 'ApplicationRuntimeTargetGraph', kind: string, runId: string, definitionId: string }, view: { __typename?: 'ApplicationSessionViewGraph', members: Array<{ __typename?: 'ApplicationMemberProjectionGraph', memberRouteKey: string, displayName: string, teamPath: Array<string>, artifactsByKey: any, primaryArtifactKey?: string | null, runtimeTarget?: { __typename?: 'ApplicationRuntimeMemberTargetGraph', runId: string, runtimeKind: string } | null }> } } | null };

export type GetApplicationSessionBindingQueryVariables = Exact<{
  applicationId: Scalars['String']['input'];
  requestedSessionId?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetApplicationSessionBindingQuery = { __typename?: 'Query', applicationSessionBinding: { __typename?: 'ApplicationSessionBindingGraph', applicationId: string, requestedSessionId?: string | null, resolvedSessionId?: string | null, resolution: string, session?: { __typename?: 'ApplicationSessionGraph', applicationSessionId: string, createdAt: string, terminatedAt?: string | null, application: { __typename?: 'ApplicationSessionApplicationGraph', applicationId: string, localApplicationId: string, packageId: string, name: string, description?: string | null, iconAssetPath?: string | null, entryHtmlAssetPath: string, writable: boolean }, runtime: { __typename?: 'ApplicationRuntimeTargetGraph', kind: string, runId: string, definitionId: string }, view: { __typename?: 'ApplicationSessionViewGraph', members: Array<{ __typename?: 'ApplicationMemberProjectionGraph', memberRouteKey: string, displayName: string, teamPath: Array<string>, artifactsByKey: any, primaryArtifactKey?: string | null, runtimeTarget?: { __typename?: 'ApplicationRuntimeMemberTargetGraph', runId: string, runtimeKind: string } | null }> } } | null } };

export type ExternalChannelCapabilitiesQueryVariables = Exact<{ [key: string]: never; }>;


export type ExternalChannelCapabilitiesQuery = { __typename?: 'Query', externalChannelCapabilities: { __typename: 'ExternalChannelCapabilities', bindingCrudEnabled: boolean, reason?: string | null, acceptedProviderTransportPairs: Array<string> } };

export type ExternalChannelBindingsQueryVariables = Exact<{ [key: string]: never; }>;


export type ExternalChannelBindingsQuery = { __typename?: 'Query', externalChannelBindings: Array<{ __typename: 'ExternalChannelBindingGql', id: string, provider: string, transport: string, accountId: string, peerId: string, threadId?: string | null, targetType: string, targetAgentDefinitionId?: string | null, targetTeamDefinitionId?: string | null, teamRunId?: string | null, updatedAt: any, launchPreset?: { __typename?: 'ExternalChannelLaunchPresetGql', workspaceRootPath: string, llmModelIdentifier: string, runtimeKind: string, autoExecuteTools: boolean, skillAccessMode: ExternalChannelSkillAccessModeEnum, llmConfig?: any | null } | null, teamLaunchPreset?: { __typename?: 'ExternalChannelTeamLaunchPresetGql', workspaceRootPath: string, llmModelIdentifier: string, runtimeKind: string, autoExecuteTools: boolean, skillAccessMode: ExternalChannelSkillAccessModeEnum, llmConfig?: any | null } | null }> };

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

export type ListWorkspaceRunHistoryQueryVariables = Exact<{
  limitPerAgent?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ListWorkspaceRunHistoryQuery = { __typename?: 'Query', listWorkspaceRunHistory: Array<{ __typename?: 'WorkspaceRunHistoryGroupObject', workspaceRootPath: string, workspaceName: string, agentDefinitions: Array<{ __typename?: 'RunHistoryAgentGroupObject', agentDefinitionId: string, agentName: string, runs: Array<{ __typename?: 'RunHistoryItemObject', runId: string, summary: string, lastActivityAt: string, lastKnownStatus: string, isActive: boolean }> }>, teamDefinitions: Array<{ __typename?: 'WorkspaceHistoryTeamDefinitionObject', teamDefinitionId: string, teamDefinitionName: string, runs: Array<{ __typename?: 'WorkspaceHistoryTeamRunItemObject', teamRunId: string, teamDefinitionId: string, teamDefinitionName: string, coordinatorMemberRouteKey: string, workspaceRootPath?: string | null, summary: string, lastActivityAt: string, lastKnownStatus: string, deleteLifecycle: string, isActive: boolean, members: Array<{ __typename?: 'WorkspaceHistoryTeamRunMemberObject', memberRouteKey: string, memberName: string, memberRunId: string, runtimeKind: string, workspaceRootPath?: string | null }> }> }> }> };

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

export type GetAgentRunResumeConfigQueryVariables = Exact<{
  runId: Scalars['String']['input'];
}>;


export type GetAgentRunResumeConfigQuery = { __typename?: 'Query', getAgentRunResumeConfig: { __typename?: 'RunResumeConfigPayload', runId: string, isActive: boolean, metadataConfig: { __typename?: 'RunMetadataConfigObject', agentDefinitionId: string, workspaceRootPath: string, llmModelIdentifier: string, llmConfig?: any | null, autoExecuteTools: boolean, skillAccessMode?: ExternalChannelSkillAccessModeEnum | null, runtimeKind: string, runtimeReference: { __typename?: 'RunRuntimeReferenceObject', runtimeKind: string, sessionId?: string | null, threadId?: string | null, metadata?: any | null } }, editableFields: { __typename?: 'RunEditableFieldFlagsObject', llmModelIdentifier: boolean, llmConfig: boolean, autoExecuteTools: boolean, skillAccessMode: boolean, workspaceRootPath: boolean, runtimeKind: boolean } } };

export type GetRuntimeAvailabilitiesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetRuntimeAvailabilitiesQuery = { __typename?: 'Query', runtimeAvailabilities: Array<{ __typename?: 'RuntimeAvailabilityObject', runtimeKind: string, enabled: boolean, reason?: string | null }> };

export type GetServerSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetServerSettingsQuery = { __typename?: 'Query', getServerSettings: Array<{ __typename: 'ServerSetting', key: string, value: string, description: string, isEditable: boolean, isDeletable: boolean }> };

export type GetSearchConfigQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSearchConfigQuery = { __typename?: 'Query', getSearchConfig: { __typename?: 'SearchConfig', provider: string, serperApiKeyConfigured: boolean, serpapiApiKeyConfigured: boolean, googleCseApiKeyConfigured: boolean, googleCseId?: string | null, vertexAiSearchApiKeyConfigured: boolean, vertexAiSearchServingConfig?: string | null } };

export type ListTeamRunMemorySnapshotsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ListTeamRunMemorySnapshotsQuery = { __typename?: 'Query', listTeamRunMemorySnapshots: { __typename?: 'TeamRunMemorySnapshotPage', total: number, page: number, pageSize: number, totalPages: number, entries: Array<{ __typename?: 'TeamRunMemorySnapshotSummary', teamRunId: string, teamDefinitionId: string, teamDefinitionName: string, lastUpdatedAt?: string | null, members: Array<{ __typename?: 'TeamMemberMemorySnapshotSummary', memberRouteKey: string, memberName: string, memberRunId: string, lastUpdatedAt?: string | null, hasWorkingContext: boolean, hasEpisodic: boolean, hasSemantic: boolean, hasRawTraces: boolean, hasRawArchive: boolean }> }> } };

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

export type GetUsageStatisticsInPeriodQueryVariables = Exact<{
  startTime: Scalars['DateTime']['input'];
  endTime: Scalars['DateTime']['input'];
}>;


export type GetUsageStatisticsInPeriodQuery = { __typename?: 'Query', usageStatisticsInPeriod: Array<{ __typename?: 'UsageStatistics', llmModel: string, promptTokens: number, assistantTokens: number, promptCost?: number | null, assistantCost?: number | null, totalCost?: number | null }> };

export type GetToolsQueryVariables = Exact<{
  origin?: InputMaybe<ToolOriginEnum>;
  sourceServerId?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetToolsQuery = { __typename?: 'Query', tools: Array<{ __typename: 'ToolDefinitionDetail', name: string, description: string, origin: ToolOriginEnum, category: string, argumentSchema?: { __typename: 'ToolArgumentSchema', parameters: Array<{ __typename: 'ToolParameterDefinition', name: string, paramType: ToolParameterTypeEnum, description: string, required: boolean, defaultValue?: string | null, enumValues?: Array<string> | null }> } | null }> };

export type GetToolsGroupedByCategoryQueryVariables = Exact<{
  origin: ToolOriginEnum;
}>;


export type GetToolsGroupedByCategoryQuery = { __typename?: 'Query', toolsGroupedByCategory: Array<{ __typename: 'ToolCategoryGroup', categoryName: string, tools: Array<{ __typename: 'ToolDefinitionDetail', name: string, description: string, origin: ToolOriginEnum, category: string, argumentSchema?: { __typename: 'ToolArgumentSchema', parameters: Array<{ __typename: 'ToolParameterDefinition', name: string, paramType: ToolParameterTypeEnum, description: string, required: boolean, defaultValue?: string | null, enumValues?: Array<string> | null }> } | null }> }> };

export type GetAllWorkspacesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllWorkspacesQuery = { __typename?: 'Query', workspaces: Array<{ __typename: 'WorkspaceInfo', workspaceId: string, name: string, config: any, fileExplorer?: string | null, absolutePath?: string | null, isTemp: boolean }> };

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

export type GetSkillsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSkillsQuery = { __typename?: 'Query', skills: Array<{ __typename?: 'Skill', name: string, description: string, content: string, rootPath: string, fileCount: number, isReadonly: boolean, isDisabled: boolean, isVersioned: boolean, activeVersion?: string | null }> };

export type GetSkillQueryVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type GetSkillQuery = { __typename?: 'Query', skill?: { __typename?: 'Skill', name: string, description: string, content: string, rootPath: string, fileCount: number, isReadonly: boolean, isDisabled: boolean, isVersioned: boolean, activeVersion?: string | null } | null };

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


export type CreateSkillMutation = { __typename?: 'Mutation', createSkill: { __typename?: 'Skill', name: string, description: string, content: string, rootPath: string, fileCount: number, isVersioned: boolean, activeVersion?: string | null } };

export type UpdateSkillMutationVariables = Exact<{
  input: UpdateSkillInput;
}>;


export type UpdateSkillMutation = { __typename?: 'Mutation', updateSkill: { __typename?: 'Skill', name: string, description: string, content: string, rootPath: string, fileCount: number, isVersioned: boolean, activeVersion?: string | null } };

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


export type DisableSkillMutation = { __typename?: 'Mutation', disableSkill: { __typename?: 'Skill', name: string, isDisabled: boolean, isVersioned: boolean, activeVersion?: string | null } };

export type EnableSkillMutationVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type EnableSkillMutation = { __typename?: 'Mutation', enableSkill: { __typename?: 'Skill', name: string, isDisabled: boolean, isVersioned: boolean, activeVersion?: string | null } };

export type GetSkillVersionsQueryVariables = Exact<{
  skillName: Scalars['String']['input'];
}>;


export type GetSkillVersionsQuery = { __typename?: 'Query', skillVersions: Array<{ __typename?: 'SkillVersion', tag: string, commitHash: string, message: string, createdAt: string, isActive: boolean }> };

export type GetSkillVersionDiffQueryVariables = Exact<{
  skillName: Scalars['String']['input'];
  fromVersion: Scalars['String']['input'];
  toVersion: Scalars['String']['input'];
}>;


export type GetSkillVersionDiffQuery = { __typename?: 'Query', skillVersionDiff?: { __typename?: 'SkillDiff', fromVersion: string, toVersion: string, diffContent: string } | null };

export type EnableSkillVersioningMutationVariables = Exact<{
  input: EnableSkillVersioningInput;
}>;


export type EnableSkillVersioningMutation = { __typename?: 'Mutation', enableSkillVersioning: { __typename?: 'SkillVersion', tag: string, commitHash: string, message: string, createdAt: string, isActive: boolean } };

export type ActivateSkillVersionMutationVariables = Exact<{
  input: ActivateSkillVersionInput;
}>;


export type ActivateSkillVersionMutation = { __typename?: 'Mutation', activateSkillVersion: { __typename?: 'SkillVersion', tag: string, commitHash: string, message: string, createdAt: string, isActive: boolean } };

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
export const ApplicationFieldsFragmentDoc = gql`
    fragment ApplicationFields on Application {
  __typename
  id
  localApplicationId
  packageId
  name
  description
  iconAssetPath
  entryHtmlAssetPath
  writable
  runtimeTarget {
    __typename
    kind
    localId
    definitionId
  }
}
    `;
export const ApplicationMemberFieldsFragmentDoc = gql`
    fragment ApplicationMemberFields on ApplicationMemberProjectionGraph {
  memberRouteKey
  displayName
  teamPath
  runtimeTarget {
    runId
    runtimeKind
  }
  artifactsByKey
  primaryArtifactKey
}
    `;
export const ApplicationSessionFieldsFragmentDoc = gql`
    fragment ApplicationSessionFields on ApplicationSessionGraph {
  applicationSessionId
  application {
    applicationId
    localApplicationId
    packageId
    name
    description
    iconAssetPath
    entryHtmlAssetPath
    writable
  }
  runtime {
    kind
    runId
    definitionId
  }
  view {
    members {
      ...ApplicationMemberFields
    }
  }
  createdAt
  terminatedAt
}
    ${ApplicationMemberFieldsFragmentDoc}`;
export const ApplicationSessionBindingFieldsFragmentDoc = gql`
    fragment ApplicationSessionBindingFields on ApplicationSessionBindingGraph {
  applicationId
  requestedSessionId
  resolvedSessionId
  resolution
  session {
    ...ApplicationSessionFields
  }
}
    ${ApplicationSessionFieldsFragmentDoc}`;
export const GetAgentPackagesDocument = gql`
    query GetAgentPackages {
  agentPackages {
    packageId
    displayName
    path
    sourceKind
    source
    sharedAgentCount
    teamLocalAgentCount
    agentTeamCount
    isDefault
    isRemovable
  }
}
    `;

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
    packageId
    displayName
    path
    sourceKind
    source
    sharedAgentCount
    teamLocalAgentCount
    agentTeamCount
    isDefault
    isRemovable
  }
}
    `;

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
    packageId
    displayName
    path
    sourceKind
    source
    sharedAgentCount
    teamLocalAgentCount
    agentTeamCount
    isDefault
    isRemovable
  }
}
    `;

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
export const DuplicateAgentDefinitionDocument = gql`
    mutation DuplicateAgentDefinition($input: DuplicateAgentDefinitionInput!) {
  duplicateAgentDefinition(input: $input) {
    ...AgentDefinitionMutationFields
  }
}
    ${AgentDefinitionMutationFieldsFragmentDoc}`;

/**
 * __useDuplicateAgentDefinitionMutation__
 *
 * To run a mutation, you first call `useDuplicateAgentDefinitionMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useDuplicateAgentDefinitionMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useDuplicateAgentDefinitionMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useDuplicateAgentDefinitionMutation(options: VueApolloComposable.UseMutationOptions<DuplicateAgentDefinitionMutation, DuplicateAgentDefinitionMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<DuplicateAgentDefinitionMutation, DuplicateAgentDefinitionMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<DuplicateAgentDefinitionMutation, DuplicateAgentDefinitionMutationVariables>(DuplicateAgentDefinitionDocument, options);
}
export type DuplicateAgentDefinitionMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<DuplicateAgentDefinitionMutation, DuplicateAgentDefinitionMutationVariables>;
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
export const CreateApplicationSessionDocument = gql`
    mutation CreateApplicationSession($input: CreateApplicationSessionInput!) {
  createApplicationSession(input: $input) {
    success
    message
    session {
      ...ApplicationSessionFields
    }
  }
}
    ${ApplicationSessionFieldsFragmentDoc}`;

/**
 * __useCreateApplicationSessionMutation__
 *
 * To run a mutation, you first call `useCreateApplicationSessionMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useCreateApplicationSessionMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useCreateApplicationSessionMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useCreateApplicationSessionMutation(options: VueApolloComposable.UseMutationOptions<CreateApplicationSessionMutation, CreateApplicationSessionMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<CreateApplicationSessionMutation, CreateApplicationSessionMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<CreateApplicationSessionMutation, CreateApplicationSessionMutationVariables>(CreateApplicationSessionDocument, options);
}
export type CreateApplicationSessionMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<CreateApplicationSessionMutation, CreateApplicationSessionMutationVariables>;
export const TerminateApplicationSessionDocument = gql`
    mutation TerminateApplicationSession($applicationSessionId: String!) {
  terminateApplicationSession(applicationSessionId: $applicationSessionId) {
    success
    message
    session {
      ...ApplicationSessionFields
    }
  }
}
    ${ApplicationSessionFieldsFragmentDoc}`;

/**
 * __useTerminateApplicationSessionMutation__
 *
 * To run a mutation, you first call `useTerminateApplicationSessionMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useTerminateApplicationSessionMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useTerminateApplicationSessionMutation({
 *   variables: {
 *     applicationSessionId: // value for 'applicationSessionId'
 *   },
 * });
 */
export function useTerminateApplicationSessionMutation(options: VueApolloComposable.UseMutationOptions<TerminateApplicationSessionMutation, TerminateApplicationSessionMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<TerminateApplicationSessionMutation, TerminateApplicationSessionMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<TerminateApplicationSessionMutation, TerminateApplicationSessionMutationVariables>(TerminateApplicationSessionDocument, options);
}
export type TerminateApplicationSessionMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<TerminateApplicationSessionMutation, TerminateApplicationSessionMutationVariables>;
export const SendApplicationInputDocument = gql`
    mutation SendApplicationInput($input: SendApplicationInputInput!) {
  sendApplicationInput(input: $input) {
    success
    message
    session {
      ...ApplicationSessionFields
    }
  }
}
    ${ApplicationSessionFieldsFragmentDoc}`;

/**
 * __useSendApplicationInputMutation__
 *
 * To run a mutation, you first call `useSendApplicationInputMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useSendApplicationInputMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useSendApplicationInputMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useSendApplicationInputMutation(options: VueApolloComposable.UseMutationOptions<SendApplicationInputMutation, SendApplicationInputMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<SendApplicationInputMutation, SendApplicationInputMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<SendApplicationInputMutation, SendApplicationInputMutationVariables>(SendApplicationInputDocument, options);
}
export type SendApplicationInputMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<SendApplicationInputMutation, SendApplicationInputMutationVariables>;
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
export const RunNodeSyncDocument = gql`
    mutation RunNodeSync($input: RunNodeSyncInput!) {
  runNodeSync(input: $input) {
    status
    sourceNodeId
    error
    report {
      sourceNodeId
      scope
      exportByEntity {
        entityType
        exportedCount
        sampledKeys
        sampleTruncated
      }
      targets {
        targetNodeId
        status
        message
        failureCountTotal
        failureSampleTruncated
        failureSamples {
          entityType
          key
          message
        }
        summary {
          processed
          created
          updated
          deleted
          skipped
        }
      }
    }
    targetResults {
      targetNodeId
      status
      message
      summary {
        processed
        created
        updated
        deleted
        skipped
      }
    }
  }
}
    `;

/**
 * __useRunNodeSyncMutation__
 *
 * To run a mutation, you first call `useRunNodeSyncMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useRunNodeSyncMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useRunNodeSyncMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useRunNodeSyncMutation(options: VueApolloComposable.UseMutationOptions<RunNodeSyncMutation, RunNodeSyncMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<RunNodeSyncMutation, RunNodeSyncMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<RunNodeSyncMutation, RunNodeSyncMutationVariables>(RunNodeSyncDocument, options);
}
export type RunNodeSyncMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<RunNodeSyncMutation, RunNodeSyncMutationVariables>;
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
    fileExplorer
    absolutePath
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
export const ListRunMemorySnapshotsDocument = gql`
    query ListRunMemorySnapshots($search: String, $page: Int, $pageSize: Int) {
  listRunMemorySnapshots(search: $search, page: $page, pageSize: $pageSize) {
    total
    page
    pageSize
    totalPages
    entries {
      runId
      lastUpdatedAt
      hasWorkingContext
      hasEpisodic
      hasSemantic
      hasRawTraces
      hasRawArchive
    }
  }
}
    `;

/**
 * __useListRunMemorySnapshotsQuery__
 *
 * To run a query within a Vue component, call `useListRunMemorySnapshotsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListRunMemorySnapshotsQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useListRunMemorySnapshotsQuery({
 *   search: // value for 'search'
 *   page: // value for 'page'
 *   pageSize: // value for 'pageSize'
 * });
 */
export function useListRunMemorySnapshotsQuery(variables: ListRunMemorySnapshotsQueryVariables | VueCompositionApi.Ref<ListRunMemorySnapshotsQueryVariables> | ReactiveFunction<ListRunMemorySnapshotsQueryVariables> = {}, options: VueApolloComposable.UseQueryOptions<ListRunMemorySnapshotsQuery, ListRunMemorySnapshotsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ListRunMemorySnapshotsQuery, ListRunMemorySnapshotsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ListRunMemorySnapshotsQuery, ListRunMemorySnapshotsQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<ListRunMemorySnapshotsQuery, ListRunMemorySnapshotsQueryVariables>(ListRunMemorySnapshotsDocument, variables, options);
}
export function useListRunMemorySnapshotsLazyQuery(variables: ListRunMemorySnapshotsQueryVariables | VueCompositionApi.Ref<ListRunMemorySnapshotsQueryVariables> | ReactiveFunction<ListRunMemorySnapshotsQueryVariables> = {}, options: VueApolloComposable.UseQueryOptions<ListRunMemorySnapshotsQuery, ListRunMemorySnapshotsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ListRunMemorySnapshotsQuery, ListRunMemorySnapshotsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ListRunMemorySnapshotsQuery, ListRunMemorySnapshotsQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<ListRunMemorySnapshotsQuery, ListRunMemorySnapshotsQueryVariables>(ListRunMemorySnapshotsDocument, variables, options);
}
export type ListRunMemorySnapshotsQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<ListRunMemorySnapshotsQuery, ListRunMemorySnapshotsQueryVariables>;
export const GetRunMemoryViewDocument = gql`
    query GetRunMemoryView($runId: String!, $includeWorkingContext: Boolean, $includeEpisodic: Boolean, $includeSemantic: Boolean, $includeRawTraces: Boolean, $includeArchive: Boolean, $rawTraceLimit: Int) {
  getRunMemoryView(
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
 * __useGetRunMemoryViewQuery__
 *
 * To run a query within a Vue component, call `useGetRunMemoryViewQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetRunMemoryViewQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetRunMemoryViewQuery({
 *   runId: // value for 'runId'
 *   includeWorkingContext: // value for 'includeWorkingContext'
 *   includeEpisodic: // value for 'includeEpisodic'
 *   includeSemantic: // value for 'includeSemantic'
 *   includeRawTraces: // value for 'includeRawTraces'
 *   includeArchive: // value for 'includeArchive'
 *   rawTraceLimit: // value for 'rawTraceLimit'
 * });
 */
export function useGetRunMemoryViewQuery(variables: GetRunMemoryViewQueryVariables | VueCompositionApi.Ref<GetRunMemoryViewQueryVariables> | ReactiveFunction<GetRunMemoryViewQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetRunMemoryViewQuery, GetRunMemoryViewQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetRunMemoryViewQuery, GetRunMemoryViewQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetRunMemoryViewQuery, GetRunMemoryViewQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetRunMemoryViewQuery, GetRunMemoryViewQueryVariables>(GetRunMemoryViewDocument, variables, options);
}
export function useGetRunMemoryViewLazyQuery(variables?: GetRunMemoryViewQueryVariables | VueCompositionApi.Ref<GetRunMemoryViewQueryVariables> | ReactiveFunction<GetRunMemoryViewQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetRunMemoryViewQuery, GetRunMemoryViewQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetRunMemoryViewQuery, GetRunMemoryViewQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetRunMemoryViewQuery, GetRunMemoryViewQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetRunMemoryViewQuery, GetRunMemoryViewQueryVariables>(GetRunMemoryViewDocument, variables, options);
}
export type GetRunMemoryViewQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetRunMemoryViewQuery, GetRunMemoryViewQueryVariables>;
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
    ...ApplicationFields
  }
}
    ${ApplicationFieldsFragmentDoc}`;

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
    ...ApplicationFields
  }
}
    ${ApplicationFieldsFragmentDoc}`;

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
export const GetApplicationSessionDocument = gql`
    query GetApplicationSession($id: String!) {
  applicationSession(id: $id) {
    ...ApplicationSessionFields
  }
}
    ${ApplicationSessionFieldsFragmentDoc}`;

/**
 * __useGetApplicationSessionQuery__
 *
 * To run a query within a Vue component, call `useGetApplicationSessionQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetApplicationSessionQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetApplicationSessionQuery({
 *   id: // value for 'id'
 * });
 */
export function useGetApplicationSessionQuery(variables: GetApplicationSessionQueryVariables | VueCompositionApi.Ref<GetApplicationSessionQueryVariables> | ReactiveFunction<GetApplicationSessionQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetApplicationSessionQuery, GetApplicationSessionQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetApplicationSessionQuery, GetApplicationSessionQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetApplicationSessionQuery, GetApplicationSessionQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetApplicationSessionQuery, GetApplicationSessionQueryVariables>(GetApplicationSessionDocument, variables, options);
}
export function useGetApplicationSessionLazyQuery(variables?: GetApplicationSessionQueryVariables | VueCompositionApi.Ref<GetApplicationSessionQueryVariables> | ReactiveFunction<GetApplicationSessionQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetApplicationSessionQuery, GetApplicationSessionQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetApplicationSessionQuery, GetApplicationSessionQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetApplicationSessionQuery, GetApplicationSessionQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetApplicationSessionQuery, GetApplicationSessionQueryVariables>(GetApplicationSessionDocument, variables, options);
}
export type GetApplicationSessionQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetApplicationSessionQuery, GetApplicationSessionQueryVariables>;
export const GetApplicationSessionBindingDocument = gql`
    query GetApplicationSessionBinding($applicationId: String!, $requestedSessionId: String) {
  applicationSessionBinding(
    applicationId: $applicationId
    requestedSessionId: $requestedSessionId
  ) {
    ...ApplicationSessionBindingFields
  }
}
    ${ApplicationSessionBindingFieldsFragmentDoc}`;

/**
 * __useGetApplicationSessionBindingQuery__
 *
 * To run a query within a Vue component, call `useGetApplicationSessionBindingQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetApplicationSessionBindingQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetApplicationSessionBindingQuery({
 *   applicationId: // value for 'applicationId'
 *   requestedSessionId: // value for 'requestedSessionId'
 * });
 */
export function useGetApplicationSessionBindingQuery(variables: GetApplicationSessionBindingQueryVariables | VueCompositionApi.Ref<GetApplicationSessionBindingQueryVariables> | ReactiveFunction<GetApplicationSessionBindingQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetApplicationSessionBindingQuery, GetApplicationSessionBindingQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetApplicationSessionBindingQuery, GetApplicationSessionBindingQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetApplicationSessionBindingQuery, GetApplicationSessionBindingQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetApplicationSessionBindingQuery, GetApplicationSessionBindingQueryVariables>(GetApplicationSessionBindingDocument, variables, options);
}
export function useGetApplicationSessionBindingLazyQuery(variables?: GetApplicationSessionBindingQueryVariables | VueCompositionApi.Ref<GetApplicationSessionBindingQueryVariables> | ReactiveFunction<GetApplicationSessionBindingQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetApplicationSessionBindingQuery, GetApplicationSessionBindingQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetApplicationSessionBindingQuery, GetApplicationSessionBindingQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetApplicationSessionBindingQuery, GetApplicationSessionBindingQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetApplicationSessionBindingQuery, GetApplicationSessionBindingQueryVariables>(GetApplicationSessionBindingDocument, variables, options);
}
export type GetApplicationSessionBindingQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetApplicationSessionBindingQuery, GetApplicationSessionBindingQueryVariables>;
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
        lastActivityAt
        lastKnownStatus
        isActive
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
        lastActivityAt
        lastKnownStatus
        deleteLifecycle
        isActive
        members {
          memberRouteKey
          memberName
          memberRunId
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
export const ListTeamRunMemorySnapshotsDocument = gql`
    query ListTeamRunMemorySnapshots($search: String, $page: Int, $pageSize: Int) {
  listTeamRunMemorySnapshots(search: $search, page: $page, pageSize: $pageSize) {
    total
    page
    pageSize
    totalPages
    entries {
      teamRunId
      teamDefinitionId
      teamDefinitionName
      lastUpdatedAt
      members {
        memberRouteKey
        memberName
        memberRunId
        lastUpdatedAt
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
 * __useListTeamRunMemorySnapshotsQuery__
 *
 * To run a query within a Vue component, call `useListTeamRunMemorySnapshotsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListTeamRunMemorySnapshotsQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useListTeamRunMemorySnapshotsQuery({
 *   search: // value for 'search'
 *   page: // value for 'page'
 *   pageSize: // value for 'pageSize'
 * });
 */
export function useListTeamRunMemorySnapshotsQuery(variables: ListTeamRunMemorySnapshotsQueryVariables | VueCompositionApi.Ref<ListTeamRunMemorySnapshotsQueryVariables> | ReactiveFunction<ListTeamRunMemorySnapshotsQueryVariables> = {}, options: VueApolloComposable.UseQueryOptions<ListTeamRunMemorySnapshotsQuery, ListTeamRunMemorySnapshotsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ListTeamRunMemorySnapshotsQuery, ListTeamRunMemorySnapshotsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ListTeamRunMemorySnapshotsQuery, ListTeamRunMemorySnapshotsQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<ListTeamRunMemorySnapshotsQuery, ListTeamRunMemorySnapshotsQueryVariables>(ListTeamRunMemorySnapshotsDocument, variables, options);
}
export function useListTeamRunMemorySnapshotsLazyQuery(variables: ListTeamRunMemorySnapshotsQueryVariables | VueCompositionApi.Ref<ListTeamRunMemorySnapshotsQueryVariables> | ReactiveFunction<ListTeamRunMemorySnapshotsQueryVariables> = {}, options: VueApolloComposable.UseQueryOptions<ListTeamRunMemorySnapshotsQuery, ListTeamRunMemorySnapshotsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ListTeamRunMemorySnapshotsQuery, ListTeamRunMemorySnapshotsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ListTeamRunMemorySnapshotsQuery, ListTeamRunMemorySnapshotsQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<ListTeamRunMemorySnapshotsQuery, ListTeamRunMemorySnapshotsQueryVariables>(ListTeamRunMemorySnapshotsDocument, variables, options);
}
export type ListTeamRunMemorySnapshotsQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<ListTeamRunMemorySnapshotsQuery, ListTeamRunMemorySnapshotsQueryVariables>;
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
    config
    fileExplorer
    absolutePath
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
    isVersioned
    activeVersion
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
    isVersioned
    activeVersion
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
    isVersioned
    activeVersion
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
    isVersioned
    activeVersion
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
    isVersioned
    activeVersion
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
    isVersioned
    activeVersion
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
export const GetSkillVersionsDocument = gql`
    query GetSkillVersions($skillName: String!) {
  skillVersions(skillName: $skillName) {
    tag
    commitHash
    message
    createdAt
    isActive
  }
}
    `;

/**
 * __useGetSkillVersionsQuery__
 *
 * To run a query within a Vue component, call `useGetSkillVersionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetSkillVersionsQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetSkillVersionsQuery({
 *   skillName: // value for 'skillName'
 * });
 */
export function useGetSkillVersionsQuery(variables: GetSkillVersionsQueryVariables | VueCompositionApi.Ref<GetSkillVersionsQueryVariables> | ReactiveFunction<GetSkillVersionsQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetSkillVersionsQuery, GetSkillVersionsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetSkillVersionsQuery, GetSkillVersionsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetSkillVersionsQuery, GetSkillVersionsQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetSkillVersionsQuery, GetSkillVersionsQueryVariables>(GetSkillVersionsDocument, variables, options);
}
export function useGetSkillVersionsLazyQuery(variables?: GetSkillVersionsQueryVariables | VueCompositionApi.Ref<GetSkillVersionsQueryVariables> | ReactiveFunction<GetSkillVersionsQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetSkillVersionsQuery, GetSkillVersionsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetSkillVersionsQuery, GetSkillVersionsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetSkillVersionsQuery, GetSkillVersionsQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetSkillVersionsQuery, GetSkillVersionsQueryVariables>(GetSkillVersionsDocument, variables, options);
}
export type GetSkillVersionsQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetSkillVersionsQuery, GetSkillVersionsQueryVariables>;
export const GetSkillVersionDiffDocument = gql`
    query GetSkillVersionDiff($skillName: String!, $fromVersion: String!, $toVersion: String!) {
  skillVersionDiff(
    skillName: $skillName
    fromVersion: $fromVersion
    toVersion: $toVersion
  ) {
    fromVersion
    toVersion
    diffContent
  }
}
    `;

/**
 * __useGetSkillVersionDiffQuery__
 *
 * To run a query within a Vue component, call `useGetSkillVersionDiffQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetSkillVersionDiffQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetSkillVersionDiffQuery({
 *   skillName: // value for 'skillName'
 *   fromVersion: // value for 'fromVersion'
 *   toVersion: // value for 'toVersion'
 * });
 */
export function useGetSkillVersionDiffQuery(variables: GetSkillVersionDiffQueryVariables | VueCompositionApi.Ref<GetSkillVersionDiffQueryVariables> | ReactiveFunction<GetSkillVersionDiffQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetSkillVersionDiffQuery, GetSkillVersionDiffQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetSkillVersionDiffQuery, GetSkillVersionDiffQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetSkillVersionDiffQuery, GetSkillVersionDiffQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetSkillVersionDiffQuery, GetSkillVersionDiffQueryVariables>(GetSkillVersionDiffDocument, variables, options);
}
export function useGetSkillVersionDiffLazyQuery(variables?: GetSkillVersionDiffQueryVariables | VueCompositionApi.Ref<GetSkillVersionDiffQueryVariables> | ReactiveFunction<GetSkillVersionDiffQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetSkillVersionDiffQuery, GetSkillVersionDiffQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetSkillVersionDiffQuery, GetSkillVersionDiffQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetSkillVersionDiffQuery, GetSkillVersionDiffQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetSkillVersionDiffQuery, GetSkillVersionDiffQueryVariables>(GetSkillVersionDiffDocument, variables, options);
}
export type GetSkillVersionDiffQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetSkillVersionDiffQuery, GetSkillVersionDiffQueryVariables>;
export const EnableSkillVersioningDocument = gql`
    mutation EnableSkillVersioning($input: EnableSkillVersioningInput!) {
  enableSkillVersioning(input: $input) {
    tag
    commitHash
    message
    createdAt
    isActive
  }
}
    `;

/**
 * __useEnableSkillVersioningMutation__
 *
 * To run a mutation, you first call `useEnableSkillVersioningMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useEnableSkillVersioningMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useEnableSkillVersioningMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useEnableSkillVersioningMutation(options: VueApolloComposable.UseMutationOptions<EnableSkillVersioningMutation, EnableSkillVersioningMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<EnableSkillVersioningMutation, EnableSkillVersioningMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<EnableSkillVersioningMutation, EnableSkillVersioningMutationVariables>(EnableSkillVersioningDocument, options);
}
export type EnableSkillVersioningMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<EnableSkillVersioningMutation, EnableSkillVersioningMutationVariables>;
export const ActivateSkillVersionDocument = gql`
    mutation ActivateSkillVersion($input: ActivateSkillVersionInput!) {
  activateSkillVersion(input: $input) {
    tag
    commitHash
    message
    createdAt
    isActive
  }
}
    `;

/**
 * __useActivateSkillVersionMutation__
 *
 * To run a mutation, you first call `useActivateSkillVersionMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useActivateSkillVersionMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useActivateSkillVersionMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useActivateSkillVersionMutation(options: VueApolloComposable.UseMutationOptions<ActivateSkillVersionMutation, ActivateSkillVersionMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<ActivateSkillVersionMutation, ActivateSkillVersionMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<ActivateSkillVersionMutation, ActivateSkillVersionMutationVariables>(ActivateSkillVersionDocument, options);
}
export type ActivateSkillVersionMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<ActivateSkillVersionMutation, ActivateSkillVersionMutationVariables>;