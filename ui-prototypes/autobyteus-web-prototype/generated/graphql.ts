import gql from 'graphql-tag';
import * as VueApolloComposable from '@vue/apollo-composable';
import * as VueCompositionApi from 'vue';
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
  /** The `SafeInt` scalar type represents non-fractional signed whole numeric values that are considered safe as defined by the ECMAScript specification. */
  SafeInt: { input: number; output: number; }
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
  rawTraceFiles?: Maybe<Array<RawTraceFileSummary>>;
  rawTraces?: Maybe<Array<MemoryTraceEvent>>;
  runId: Scalars['String']['output'];
  selectedRawTraceFileName?: Maybe<Scalars['String']['output']>;
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
  handoffs: Array<AgentTeamHandoff>;
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

export type AgentTeamHandoff = {
  __typename?: 'AgentTeamHandoff';
  from: Scalars['String']['output'];
  rules: Array<Scalars['String']['output']>;
  to: Scalars['String']['output'];
};

export type AgentTeamHandoffInput = {
  from: Scalars['String']['input'];
  rules: Array<Scalars['String']['input']>;
  to: Scalars['String']['input'];
};

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
  recoveryAction: AppDataMigrationRecoveryAction;
  requiredOnStartup: Scalars['Boolean']['output'];
  startedAt?: Maybe<Scalars['DateTime']['output']>;
  status: AppDataMigrationStatus;
  summary?: Maybe<Scalars['String']['output']>;
};

export enum AppDataMigrationRecoveryAction {
  ManualRetry = 'MANUAL_RETRY',
  None = 'NONE',
  RestartToRetry = 'RESTART_TO_RETRY'
}

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
  handoffs?: InputMaybe<Array<AgentTeamHandoffInput>>;
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

export type CreateMemoryHubCredentialInput = {
  boundSourceNodeId?: InputMaybe<Scalars['String']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
};

export type CreateSkillInput = {
  content: Scalars['String']['input'];
  description: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type CreateWorkspaceInput = {
  rootPath: Scalars['String']['input'];
};

export type CustomProviderInputObject = {
  apiKey: Scalars['String']['input'];
  baseUrl: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type CustomProviderProbeModelObject = {
  __typename?: 'CustomProviderProbeModelObject';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type CustomProviderProbeResultObject = {
  __typename?: 'CustomProviderProbeResultObject';
  discoveredModels: Array<CustomProviderProbeModelObject>;
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

export type EventMonitorActiveTraceAttachment = {
  __typename?: 'EventMonitorActiveTraceAttachment';
  attachmentId: Scalars['ID']['output'];
  locator: Scalars['String']['output'];
  mediaType: Scalars['String']['output'];
};

export type EventMonitorActiveTracePage = {
  __typename?: 'EventMonitorActiveTracePage';
  activeGeneration: Scalars['String']['output'];
  beforeCursor?: Maybe<Scalars['String']['output']>;
  cursorStatus: Scalars['String']['output'];
  events: Array<EventMonitorActiveTracePageEvent>;
  hasEarlier: Scalars['Boolean']['output'];
  loadedEarlierCount: Scalars['Int']['output'];
};

export type EventMonitorActiveTracePageEvent = {
  __typename?: 'EventMonitorActiveTracePageEvent';
  eventId: Scalars['ID']['output'];
  occurredAtMs?: Maybe<Scalars['Float']['output']>;
  turnGroupId: Scalars['ID']['output'];
  visuals: Array<EventMonitorActiveTracePageVisual>;
};

export type EventMonitorActiveTracePageVisual = EventMonitorAssistantTextVisual | EventMonitorCompactionVisual | EventMonitorMediaVisual | EventMonitorThinkingVisual | EventMonitorToolCardVisual | EventMonitorUserVisual;

export type EventMonitorApprovalTarget = {
  __typename?: 'EventMonitorApprovalTarget';
  agentRunId: Scalars['ID']['output'];
};

export type EventMonitorAssistantTextVisual = {
  __typename?: 'EventMonitorAssistantTextVisual';
  content: Scalars['String']['output'];
  eventId: Scalars['ID']['output'];
  kind: Scalars['String']['output'];
  kindOrdinal: Scalars['Int']['output'];
  visualId: Scalars['ID']['output'];
};

export type EventMonitorCompactionVisual = {
  __typename?: 'EventMonitorCompactionVisual';
  activityId: Scalars['String']['output'];
  eventId: Scalars['ID']['output'];
  kind: Scalars['String']['output'];
  kindOrdinal: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  phase: Scalars['String']['output'];
  provider?: Maybe<Scalars['String']['output']>;
  rawTraceCount?: Maybe<Scalars['Int']['output']>;
  semanticFactCount?: Maybe<Scalars['Int']['output']>;
  turnId?: Maybe<Scalars['String']['output']>;
  visualId: Scalars['ID']['output'];
};

export type EventMonitorMediaVisual = {
  __typename?: 'EventMonitorMediaVisual';
  eventId: Scalars['ID']['output'];
  kind: Scalars['String']['output'];
  kindOrdinal: Scalars['Int']['output'];
  mediaType: Scalars['String']['output'];
  urls: Array<Scalars['String']['output']>;
  visualId: Scalars['ID']['output'];
};

export type EventMonitorThinkingVisual = {
  __typename?: 'EventMonitorThinkingVisual';
  content: Scalars['String']['output'];
  eventId: Scalars['ID']['output'];
  kind: Scalars['String']['output'];
  kindOrdinal: Scalars['Int']['output'];
  visualId: Scalars['ID']['output'];
};

export type EventMonitorToolCardVisual = {
  __typename?: 'EventMonitorToolCardVisual';
  approvalTarget?: Maybe<EventMonitorApprovalTarget>;
  cardKind: Scalars['String']['output'];
  errorMessage?: Maybe<Scalars['String']['output']>;
  eventId: Scalars['ID']['output'];
  invocationId: Scalars['String']['output'];
  kind: Scalars['String']['output'];
  kindOrdinal: Scalars['Int']['output'];
  statusKey: Scalars['String']['output'];
  summaryArgs: EventMonitorToolSummaryArgs;
  toolName: Scalars['String']['output'];
  visualId: Scalars['ID']['output'];
};

export type EventMonitorToolSummaryArgs = {
  __typename?: 'EventMonitorToolSummaryArgs';
  cmd?: Maybe<Scalars['String']['output']>;
  command?: Maybe<Scalars['String']['output']>;
  file_path?: Maybe<Scalars['String']['output']>;
  filename?: Maybe<Scalars['String']['output']>;
  filepath?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  path?: Maybe<Scalars['String']['output']>;
  prompt?: Maybe<Scalars['String']['output']>;
  query?: Maybe<Scalars['String']['output']>;
  raw?: Maybe<Scalars['String']['output']>;
  script?: Maybe<Scalars['String']['output']>;
  target_path?: Maybe<Scalars['String']['output']>;
  text?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  url?: Maybe<Scalars['String']['output']>;
};

export type EventMonitorUserVisual = {
  __typename?: 'EventMonitorUserVisual';
  attachments: Array<EventMonitorActiveTraceAttachment>;
  eventId: Scalars['ID']['output'];
  kind: Scalars['String']['output'];
  kindOrdinal: Scalars['Int']['output'];
  text: Scalars['String']['output'];
  visualId: Scalars['ID']['output'];
};

export type ExternalChannelBindingGql = {
  __typename?: 'ExternalChannelBindingGql';
  accountId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  launchPreset?: Maybe<ExternalChannelLaunchPresetGql>;
  peerId: Scalars['String']['output'];
  provider: Scalars['String']['output'];
  targetAgentDefinitionId?: Maybe<Scalars['String']['output']>;
  targetMemberAddress?: Maybe<Scalars['String']['output']>;
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

export enum GeminiSetupMode {
  AiStudio = 'AI_STUDIO',
  VertexExpress = 'VERTEX_EXPRESS',
  VertexProject = 'VERTEX_PROJECT'
}

export type GeminiSetupStateObject = {
  __typename?: 'GeminiSetupStateObject';
  activeMode?: Maybe<GeminiSetupMode>;
  aiStudioConfigured?: Maybe<Scalars['Boolean']['output']>;
  vertexExpressConfigured?: Maybe<Scalars['Boolean']['output']>;
  vertexProject?: Maybe<GeminiVertexProjectObject>;
};

export type GeminiVertexProjectObject = {
  __typename?: 'GeminiVertexProjectObject';
  location: Scalars['String']['output'];
  project: Scalars['String']['output'];
};

export type GraphqlSkillImprovementConfigSourceTraceEntry = {
  __typename?: 'GraphqlSkillImprovementConfigSourceTraceEntry';
  fields: Array<Scalars['String']['output']>;
  source: Scalars['String']['output'];
};

export type GraphqlSkillImprovementEffectiveConfig = {
  __typename?: 'GraphqlSkillImprovementEffectiveConfig';
  enabled: Scalars['Boolean']['output'];
  improverAgentDefinitionId?: Maybe<Scalars['String']['output']>;
  improverStrategy: Scalars['String']['output'];
  resolvedAt: Scalars['String']['output'];
  sourceTrace: Array<GraphqlSkillImprovementConfigSourceTraceEntry>;
  triggerStrategy: Scalars['String']['output'];
};

export type GraphqlSkillImprovementEligibility = {
  __typename?: 'GraphqlSkillImprovementEligibility';
  effectiveConfig?: Maybe<GraphqlSkillImprovementEffectiveConfig>;
  eligible: Scalars['Boolean']['output'];
  reasons: Array<Scalars['String']['output']>;
  skillTargets: Array<GraphqlSkillImprovementSkillTarget>;
  warnings: Array<Scalars['String']['output']>;
};

export type GraphqlSkillImprovementNotificationSummary = {
  __typename?: 'GraphqlSkillImprovementNotificationSummary';
  error?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
};

export type GraphqlSkillImprovementRunRecord = {
  __typename?: 'GraphqlSkillImprovementRunRecord';
  completedAt?: Maybe<Scalars['String']['output']>;
  effectiveConfig: GraphqlSkillImprovementEffectiveConfig;
  errors: Array<Scalars['String']['output']>;
  evidenceSummaryHash?: Maybe<Scalars['String']['output']>;
  improvementRunId: Scalars['String']['output'];
  improverAgentDefinitionId: Scalars['String']['output'];
  improverRunId?: Maybe<Scalars['String']['output']>;
  improverStrategy: Scalars['String']['output'];
  llmModelIdentifier?: Maybe<Scalars['String']['output']>;
  notificationSummary?: Maybe<GraphqlSkillImprovementNotificationSummary>;
  requestedAt: Scalars['String']['output'];
  runtimeKind?: Maybe<Scalars['String']['output']>;
  skillTargets: Array<GraphqlSkillImprovementSkillTarget>;
  sourceRunIds: Array<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  target: GraphqlSkillImprovementTargetRef;
  triggerStrategy: Scalars['String']['output'];
  workspaceRootPath?: Maybe<Scalars['String']['output']>;
};

export type GraphqlSkillImprovementSkillTarget = {
  __typename?: 'GraphqlSkillImprovementSkillTarget';
  isWritable: Scalars['Boolean']['output'];
  skillMdPath: Scalars['String']['output'];
  skillName: Scalars['String']['output'];
  skillRootPath: Scalars['String']['output'];
  sourceLabel?: Maybe<Scalars['String']['output']>;
};

export type GraphqlSkillImprovementStartResult = {
  __typename?: 'GraphqlSkillImprovementStartResult';
  improvementRunId: Scalars['String']['output'];
  improverRunId?: Maybe<Scalars['String']['output']>;
  record: GraphqlSkillImprovementRunRecord;
};

export type GraphqlSkillImprovementStrategyCatalog = {
  __typename?: 'GraphqlSkillImprovementStrategyCatalog';
  defaultImproverStrategy: Scalars['String']['output'];
  defaultTriggerStrategy: Scalars['String']['output'];
  improverStrategies: Array<GraphqlSkillImprovementStrategyDescriptor>;
  triggerStrategies: Array<GraphqlSkillImprovementStrategyDescriptor>;
};

export type GraphqlSkillImprovementStrategyDescriptor = {
  __typename?: 'GraphqlSkillImprovementStrategyDescriptor';
  description: Scalars['String']['output'];
  label: Scalars['String']['output'];
  name: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

export type GraphqlSkillImprovementTargetRef = {
  __typename?: 'GraphqlSkillImprovementTargetRef';
  agentRunId?: Maybe<Scalars['String']['output']>;
  kind: Scalars['String']['output'];
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

export type MemoryExplorerSourceInput = {
  sourceNodeId?: InputMaybe<Scalars['String']['input']>;
  type: MemoryExplorerSourceType;
};

export type MemoryExplorerSourceOption = {
  __typename?: 'MemoryExplorerSourceOption';
  displayName?: Maybe<Scalars['String']['output']>;
  key: Scalars['String']['output'];
  label: Scalars['String']['output'];
  lastImportedAt?: Maybe<Scalars['String']['output']>;
  lastSyncStatus?: Maybe<Scalars['String']['output']>;
  readOnly: Scalars['Boolean']['output'];
  sourceNodeId?: Maybe<Scalars['String']['output']>;
  type: MemoryExplorerSourceType;
};

export enum MemoryExplorerSourceType {
  Imported = 'IMPORTED',
  Local = 'LOCAL'
}

export type MemoryHubConnectionInfoGql = {
  __typename?: 'MemoryHubConnectionInfoGql';
  advertisedHubBaseUrl?: Maybe<Scalars['String']['output']>;
  credentials: Array<MemoryHubCredentialSummaryGql>;
  healthEndpointUrl?: Maybe<Scalars['String']['output']>;
  hubEnabled: Scalars['Boolean']['output'];
  ingestEndpointUrl?: Maybe<Scalars['String']['output']>;
  secureTransportWarning?: Maybe<Scalars['String']['output']>;
};

export enum MemoryHubConnectionTestMode {
  Draft = 'DRAFT',
  Saved = 'SAVED'
}

export type MemoryHubConnectionTestResultGql = {
  __typename?: 'MemoryHubConnectionTestResultGql';
  authenticated: Scalars['Boolean']['output'];
  hubEnabled: Scalars['Boolean']['output'];
  message?: Maybe<Scalars['String']['output']>;
  ok: Scalars['Boolean']['output'];
  sourceNodeId: Scalars['String']['output'];
};

export type MemoryHubCredentialMutationResultGql = {
  __typename?: 'MemoryHubCredentialMutationResultGql';
  credential: MemoryHubCredentialSummaryGql;
  plaintextToken?: Maybe<Scalars['String']['output']>;
};

export type MemoryHubCredentialSummaryGql = {
  __typename?: 'MemoryHubCredentialSummaryGql';
  boundSourceNodeId?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  credentialId: Scalars['String']['output'];
  label?: Maybe<Scalars['String']['output']>;
  lastUsedAt?: Maybe<Scalars['String']['output']>;
  revokedAt?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
};

export type MemoryImportSummaryGql = {
  __typename?: 'MemoryImportSummaryGql';
  displayName?: Maybe<Scalars['String']['output']>;
  fileCount: Scalars['Int']['output'];
  firstImportedAt?: Maybe<Scalars['String']['output']>;
  lastCommittedAt?: Maybe<Scalars['String']['output']>;
  lastCommittedBatchId?: Maybe<Scalars['String']['output']>;
  lastError?: Maybe<Scalars['String']['output']>;
  lastImportedAt?: Maybe<Scalars['String']['output']>;
  lastKnownEndpoint?: Maybe<Scalars['String']['output']>;
  lastSyncStatus?: Maybe<Scalars['String']['output']>;
  sourceNodeId: Scalars['String']['output'];
  totalBytes: Scalars['Float']['output'];
};

export type MemoryMessage = {
  __typename?: 'MemoryMessage';
  content?: Maybe<Scalars['String']['output']>;
  reasoning?: Maybe<Scalars['String']['output']>;
  role: Scalars['String']['output'];
  toolPayload?: Maybe<Scalars['JSON']['output']>;
  ts?: Maybe<Scalars['Float']['output']>;
};

export type MemorySyncHubConfigGql = {
  __typename?: 'MemorySyncHubConfigGql';
  advertisedHubBaseUrl?: Maybe<Scalars['String']['output']>;
  enabled: Scalars['Boolean']['output'];
  updatedAt?: Maybe<Scalars['String']['output']>;
};

export type MemorySyncRunResultGql = {
  __typename?: 'MemorySyncRunResultGql';
  changedFiles: Scalars['Int']['output'];
  committedBatches: Scalars['Int']['output'];
  deferredFiles: Scalars['Int']['output'];
  duplicateBatches: Scalars['Int']['output'];
  finishedAt: Scalars['String']['output'];
  scannedFiles: Scalars['Int']['output'];
  startedAt: Scalars['String']['output'];
  unchangedFiles: Scalars['Int']['output'];
};

export type MemorySyncSourceConfigGql = {
  __typename?: 'MemorySyncSourceConfigGql';
  backgroundEnabled: Scalars['Boolean']['output'];
  batchSize: Scalars['Int']['output'];
  displayName?: Maybe<Scalars['String']['output']>;
  enabled: Scalars['Boolean']['output'];
  hubBaseUrl?: Maybe<Scalars['String']['output']>;
  hubTokenConfigured: Scalars['Boolean']['output'];
  hubTokenPreview?: Maybe<Scalars['String']['output']>;
  intervalMs: Scalars['Int']['output'];
  sourceNodeId?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['String']['output']>;
};

export type MemorySyncSourceStateGql = {
  __typename?: 'MemorySyncSourceStateGql';
  jobState: Scalars['String']['output'];
  lastError?: Maybe<Scalars['String']['output']>;
  lastSuccessfulSyncAt?: Maybe<Scalars['String']['output']>;
  trackedFileCount: Scalars['Int']['output'];
};

export type MemorySyncStatusGql = {
  __typename?: 'MemorySyncStatusGql';
  connectionInfo: MemoryHubConnectionInfoGql;
  hub: MemorySyncHubConfigGql;
  imports: Array<MemoryImportSummaryGql>;
  oneTimePlaintextToken?: Maybe<Scalars['String']['output']>;
  source: MemorySyncSourceConfigGql;
  sourceState?: Maybe<MemorySyncSourceStateGql>;
};

export type MemoryTraceEvent = {
  __typename?: 'MemoryTraceEvent';
  scope: Scalars['String']['output'];
  content?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  media?: Maybe<Scalars['JSON']['output']>;
  seq?: Maybe<Scalars['Int']['output']>;
  sourceEvent?: Maybe<Scalars['String']['output']>;
  toolArgs?: Maybe<Scalars['JSON']['output']>;
  toolCallId?: Maybe<Scalars['String']['output']>;
  toolError?: Maybe<Scalars['String']['output']>;
  toolName?: Maybe<Scalars['String']['output']>;
  toolResult?: Maybe<Scalars['JSON']['output']>;
  traceType: Scalars['String']['output'];
  ts: Scalars['Float']['output'];
  turnId?: Maybe<Scalars['String']['output']>;
};

export type ModelDetail = {
  __typename?: 'ModelDetail';
  activeContextTokens?: Maybe<Scalars['Int']['output']>;
  canonicalName: Scalars['String']['output'];
  configSchema?: Maybe<Scalars['JSON']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  hostUrl?: Maybe<Scalars['String']['output']>;
  maxContextTokens?: Maybe<Scalars['Int']['output']>;
  maxInputTokens?: Maybe<Scalars['Int']['output']>;
  maxOutputTokens?: Maybe<Scalars['Int']['output']>;
  metadataProvenance?: Maybe<ModelMetadataProvenance>;
  modelIdentifier: Scalars['String']['output'];
  name: Scalars['String']['output'];
  providerId: Scalars['String']['output'];
  providerName: Scalars['String']['output'];
  providerType: Scalars['String']['output'];
  runtime: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export enum ModelMetadataProvenance {
  CuratedFallback = 'CURATED_FALLBACK',
  CuratedOnly = 'CURATED_ONLY',
  Live = 'LIVE'
}

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
  createCustomProvider: Scalars['String']['output'];
  createFileOrFolder: Scalars['String']['output'];
  createMemoryHubSourceCredential: MemoryHubCredentialMutationResultGql;
  createSkill: Skill;
  createWorkspace: WorkspaceMetadata;
  deleteAgentDefinition: DeleteAgentDefinitionResult;
  deleteAgentTeamDefinition: DeleteAgentTeamDefinitionResult;
  deleteCustomProvider: Scalars['Boolean']['output'];
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
  probeCustomProvider: CustomProviderProbeResultObject;
  refreshAgentDefinitionCatalog: Scalars['Boolean']['output'];
  refreshAgentTeamDefinitionCatalog: Scalars['Boolean']['output'];
  regenerateMemoryHubSourceCredential: MemoryHubCredentialMutationResultGql;
  reloadAgentPackage: Array<AgentPackage>;
  reloadLlmModels: Scalars['String']['output'];
  reloadLlmProviderModels: Scalars['String']['output'];
  reloadSkillCatalog: SkillCatalogReloadResult;
  reloadToolSchema: ReloadToolSchemaResult;
  removeAgentPackage: Array<AgentPackage>;
  removeApplicationPackage: Array<ApplicationPackage>;
  removeSkillSource: Array<SkillSource>;
  removeWorkspace: RemoveWorkspaceResultInfo;
  renameFileOrFolder: Scalars['String']['output'];
  restoreAgentRun: RestoreAgentRunResult;
  restoreAgentTeamRun: RestoreAgentTeamRunResult;
  revokeMemoryHubSourceCredential: MemoryHubCredentialSummaryGql;
  runAppDataMigration: AppDataMigrationMutationResult;
  saveGeminiAiStudio: GeminiSetupStateObject;
  saveGeminiVertexExpress: GeminiSetupStateObject;
  saveGeminiVertexProject: GeminiSetupStateObject;
  saveManagedMessagingGatewayProviderConfig: ManagedMessagingGatewayStatusObject;
  saveProviderApiKey: Scalars['Boolean']['output'];
  saveQwenConfiguration: QwenSetupStatus;
  setApplicationsEnabled: ApplicationsCapability;
  setSearchConfig: Scalars['String']['output'];
  setSkillImprovementEnabled: SkillImprovementCapability;
  startAgentRunSkillImprovement: GraphqlSkillImprovementStartResult;
  startMemorySync: MemorySyncRunResultGql;
  startTeamMemberSkillImprovement: GraphqlSkillImprovementStartResult;
  terminateAgentRun: TerminateAgentRunResult;
  terminateAgentTeamRun: TerminateAgentTeamRunResult;
  testMemoryHubConnection: MemoryHubConnectionTestResultGql;
  updateAgentDefinition: AgentDefinition;
  updateAgentPackage: Array<AgentPackage>;
  updateAgentTeamDefinition: AgentTeamDefinition;
  updateManagedMessagingGateway: ManagedMessagingGatewayStatusObject;
  updateMemoryHubConfig: MemorySyncStatusGql;
  updateMemorySyncSourceConfig: MemorySyncStatusGql;
  updateServerSetting: Scalars['String']['output'];
  updateSkill: Skill;
  uploadSkillFile: Scalars['Boolean']['output'];
  upsertExternalChannelBinding: ExternalChannelBindingGql;
  useGeminiMode: GeminiSetupStateObject;
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


export type MutationCreateCustomProviderArgs = {
  input: CustomProviderInputObject;
};


export type MutationCreateFileOrFolderArgs = {
  isFile: Scalars['Boolean']['input'];
  path: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};


export type MutationCreateMemoryHubSourceCredentialArgs = {
  input?: InputMaybe<CreateMemoryHubCredentialInput>;
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


export type MutationDeleteCustomProviderArgs = {
  providerId: Scalars['String']['input'];
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


export type MutationProbeCustomProviderArgs = {
  input: CustomProviderInputObject;
};


export type MutationRegenerateMemoryHubSourceCredentialArgs = {
  credentialId: Scalars['String']['input'];
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


export type MutationRemoveWorkspaceArgs = {
  input: RemoveWorkspaceInput;
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


export type MutationRevokeMemoryHubSourceCredentialArgs = {
  credentialId: Scalars['String']['input'];
};


export type MutationRunAppDataMigrationArgs = {
  migrationId: Scalars['String']['input'];
};


export type MutationSaveGeminiAiStudioArgs = {
  activateAfterSave: Scalars['Boolean']['input'];
  apiKey: Scalars['String']['input'];
};


export type MutationSaveGeminiVertexExpressArgs = {
  activateAfterSave: Scalars['Boolean']['input'];
  apiKey: Scalars['String']['input'];
};


export type MutationSaveGeminiVertexProjectArgs = {
  activateAfterSave: Scalars['Boolean']['input'];
  location: Scalars['String']['input'];
  project: Scalars['String']['input'];
};


export type MutationSaveManagedMessagingGatewayProviderConfigArgs = {
  input: Scalars['JSONObject']['input'];
};


export type MutationSaveProviderApiKeyArgs = {
  apiKey: Scalars['String']['input'];
  providerId: Scalars['String']['input'];
};


export type MutationSaveQwenConfigurationArgs = {
  input: QwenConfigurationInput;
};


export type MutationSetApplicationsEnabledArgs = {
  enabled: Scalars['Boolean']['input'];
};


export type MutationSetSearchConfigArgs = {
  provider: Scalars['String']['input'];
  serpapiApiKey?: InputMaybe<Scalars['String']['input']>;
  serperApiKey?: InputMaybe<Scalars['String']['input']>;
  vertexAiSearchApiKey?: InputMaybe<Scalars['String']['input']>;
  vertexAiSearchServingConfig?: InputMaybe<Scalars['String']['input']>;
};


export type MutationSetSkillImprovementEnabledArgs = {
  enabled: Scalars['Boolean']['input'];
};


export type MutationStartAgentRunSkillImprovementArgs = {
  input: StartAgentRunSkillImprovementInput;
};


export type MutationStartTeamMemberSkillImprovementArgs = {
  input: StartTeamMemberSkillImprovementInput;
};


export type MutationTerminateAgentRunArgs = {
  agentRunId: Scalars['String']['input'];
};


export type MutationTerminateAgentTeamRunArgs = {
  teamRunId: Scalars['String']['input'];
};


export type MutationTestMemoryHubConnectionArgs = {
  input: TestMemoryHubConnectionInput;
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


export type MutationUpdateMemoryHubConfigArgs = {
  input: UpdateMemoryHubConfigInput;
};


export type MutationUpdateMemorySyncSourceConfigArgs = {
  input: UpdateMemorySyncSourceConfigInput;
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


export type MutationUseGeminiModeArgs = {
  mode: GeminiSetupMode;
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

export type ProviderSettingsGroup = {
  __typename?: 'ProviderSettingsGroup';
  audioModels: Array<ModelDetail>;
  imageModels: Array<ModelDetail>;
  llmModels: Array<ModelDetail>;
  provider: LlmProviderObject;
  videoModels: Array<ModelDetail>;
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
  availableOptionalToolExecutionResultProcessorNames: Array<Scalars['String']['output']>;
  availableOptionalToolInvocationPreprocessorNames: Array<Scalars['String']['output']>;
  availableToolNames: Array<Scalars['String']['output']>;
  availableVideoProvidersWithModels: Array<ProviderWithModels>;
  externalChannelBindings: Array<ExternalChannelBindingGql>;
  externalChannelCapabilities: ExternalChannelCapabilities;
  externalChannelTeamDefinitionOptions: Array<ExternalChannelTeamDefinitionOptionGql>;
  fileContent: Scalars['String']['output'];
  folderChildren: Scalars['String']['output'];
  getAgentRunMemoryView: AgentMemoryView;
  getAgentRunResumeConfig: RunResumeConfigPayload;
  getAgentRunSkillImprovementEligibility: GraphqlSkillImprovementEligibility;
  getAgentRunTokenUsageSummary: TokenUsageRunSummaryGraphql;
  getAppDataMigrations: Array<AppDataMigrationRecordObject>;
  getEffectiveStreamingContentFlushIntervalMs: Scalars['Int']['output'];
  getEffectiveWorkingContextCompactionStrategyId: Scalars['String']['output'];
  getGeminiSetupConfig: GeminiSetupStateObject;
  getMemoryHubConnectionInfo: MemoryHubConnectionInfoGql;
  getMemorySyncStatus: MemorySyncStatusGql;
  getRunEventMonitorActiveTracePage: EventMonitorActiveTracePage;
  getRunFileChanges: Array<RunFileChangeEntryObject>;
  getRunProjection: RunProjectionPayload;
  getSearchConfig: SearchConfig;
  getSecretVaultStatus: SecretVaultStatus;
  getServerSettings: Array<ServerSetting>;
  getSkillImprovementRunRecord?: Maybe<GraphqlSkillImprovementRunRecord>;
  getTaskDelegationRecords: Array<TaskDelegationRecordObject>;
  getTeamCommunicationMessages: Array<TeamCommunicationMessageObject>;
  getTeamMemberEventMonitorActiveTracePage: EventMonitorActiveTracePage;
  getTeamMemberRunMemoryView: AgentMemoryView;
  getTeamMemberRunProjection: TeamMemberRunProjectionPayload;
  getTeamMemberSkillImprovementEligibility: GraphqlSkillImprovementEligibility;
  getTeamMemberTokenUsageSummary: TokenUsageRunSummaryGraphql;
  getTeamRunExecutionCheckpoint: TeamRunExecutionCheckpointPayload;
  getTeamRunResumeConfig: TeamRunResumeConfigPayload;
  getTeamRunTokenUsageSummary: TokenUsageRunSummaryGraphql;
  getWorkingContextCompactionStrategies: Array<WorkingContextCompactionStrategyOption>;
  health: HealthStatus;
  listAgentRunsWithMemory: AgentRunMemoryPage;
  listAgentTeamRunsWithMemory: AgentTeamRunMemoryPage;
  listAgentTeamsWithMemory: AgentTeamWithMemoryPage;
  listAgentsWithMemory: AgentWithMemoryPage;
  listApplications: Array<Application>;
  listMemoryExplorerSources: Array<MemoryExplorerSourceOption>;
  listMemoryHubUrlCandidates: Array<ServerAddressCandidateGql>;
  listMemoryImports: Array<MemoryImportSummaryGql>;
  listWorkspaceRunHistory: Array<WorkspaceRunHistoryGroupObject>;
  managedMessagingGatewayPeerCandidates: ManagedMessagingGatewayPeerCandidateListObject;
  managedMessagingGatewayStatus: ManagedMessagingGatewayStatusObject;
  managedMessagingGatewayWeComAccounts: Array<ManagedMessagingGatewayWeComAccountObject>;
  mcpServers: Array<McpServerConfigUnion>;
  previewMcpServerTools: Array<ToolDefinitionDetail>;
  providerSettings: Array<ProviderSettingsGroup>;
  qwenSetupStatus: QwenSetupStatus;
  runtimeAvailabilities: Array<RuntimeAvailabilityObject>;
  searchFiles: Array<Scalars['String']['output']>;
  skill?: Maybe<Skill>;
  skillFileContent?: Maybe<Scalars['String']['output']>;
  skillFileTree?: Maybe<Scalars['String']['output']>;
  skillImprovementCapability: SkillImprovementCapability;
  skillImprovementStrategyCatalog: GraphqlSkillImprovementStrategyCatalog;
  skillSources: Array<SkillSource>;
  skills: Array<Skill>;
  tokenUsageTaskStatisticsInPeriod: TokenUsageTaskStatisticsResultGraphql;
  tools: Array<ToolDefinitionDetail>;
  toolsGroupedByCategory: Array<ToolCategoryGroup>;
  totalCostInPeriod?: Maybe<Scalars['Float']['output']>;
  usageStatisticsInPeriod: Array<UsageStatistics>;
  workspaceMetadata: WorkspaceMetadata;
  workspaceRunHistory: WorkspaceRunHistoryGroupObject;
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


export type QueryAvailableVideoProvidersWithModelsArgs = {
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
  includeRawTraceFiles?: Scalars['Boolean']['input'];
  includeRawTraces?: Scalars['Boolean']['input'];
  includeSemantic?: Scalars['Boolean']['input'];
  includeWorkingContext?: Scalars['Boolean']['input'];
  rawTraceFileName?: InputMaybe<Scalars['String']['input']>;
  rawTraceLimit?: InputMaybe<Scalars['Int']['input']>;
  runId: Scalars['String']['input'];
  source?: InputMaybe<MemoryExplorerSourceInput>;
};


export type QueryGetAgentRunResumeConfigArgs = {
  runId: Scalars['String']['input'];
};


export type QueryGetAgentRunSkillImprovementEligibilityArgs = {
  runId: Scalars['String']['input'];
};


export type QueryGetAgentRunTokenUsageSummaryArgs = {
  runId: Scalars['String']['input'];
};


export type QueryGetRunEventMonitorActiveTracePageArgs = {
  beforeCursor?: InputMaybe<Scalars['String']['input']>;
  runId: Scalars['String']['input'];
};


export type QueryGetRunFileChangesArgs = {
  runId: Scalars['String']['input'];
};


export type QueryGetRunProjectionArgs = {
  runId: Scalars['String']['input'];
};


export type QueryGetSkillImprovementRunRecordArgs = {
  improvementRunId: Scalars['String']['input'];
};


export type QueryGetTaskDelegationRecordsArgs = {
  teamRunId: Scalars['String']['input'];
};


export type QueryGetTeamCommunicationMessagesArgs = {
  teamRunId: Scalars['String']['input'];
};


export type QueryGetTeamMemberEventMonitorActiveTracePageArgs = {
  agentRunId: Scalars['String']['input'];
  beforeCursor?: InputMaybe<Scalars['String']['input']>;
  teamRunId: Scalars['String']['input'];
};


export type QueryGetTeamMemberRunMemoryViewArgs = {
  agentRunId: Scalars['String']['input'];
  includeArchive?: Scalars['Boolean']['input'];
  includeEpisodic?: Scalars['Boolean']['input'];
  includeRawTraceFiles?: Scalars['Boolean']['input'];
  includeRawTraces?: Scalars['Boolean']['input'];
  includeSemantic?: Scalars['Boolean']['input'];
  includeWorkingContext?: Scalars['Boolean']['input'];
  rawTraceFileName?: InputMaybe<Scalars['String']['input']>;
  rawTraceLimit?: InputMaybe<Scalars['Int']['input']>;
  source?: InputMaybe<MemoryExplorerSourceInput>;
  teamRunId: Scalars['String']['input'];
};


export type QueryGetTeamMemberRunProjectionArgs = {
  agentRunId: Scalars['String']['input'];
  teamRunId: Scalars['String']['input'];
};


export type QueryGetTeamMemberSkillImprovementEligibilityArgs = {
  agentRunId: Scalars['String']['input'];
  teamRunId: Scalars['String']['input'];
};


export type QueryGetTeamMemberTokenUsageSummaryArgs = {
  agentRunId: Scalars['String']['input'];
  teamRunId: Scalars['String']['input'];
};


export type QueryGetTeamRunExecutionCheckpointArgs = {
  teamRunId: Scalars['String']['input'];
};


export type QueryGetTeamRunResumeConfigArgs = {
  teamRunId: Scalars['String']['input'];
};


export type QueryGetTeamRunTokenUsageSummaryArgs = {
  teamRunId: Scalars['String']['input'];
};


export type QueryListAgentRunsWithMemoryArgs = {
  page?: Scalars['Int']['input'];
  pageSize?: Scalars['Int']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  selector: AgentWithMemorySelectorInput;
  source?: InputMaybe<MemoryExplorerSourceInput>;
};


export type QueryListAgentTeamRunsWithMemoryArgs = {
  page?: Scalars['Int']['input'];
  pageSize?: Scalars['Int']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  source?: InputMaybe<MemoryExplorerSourceInput>;
  teamDefinitionId: Scalars['String']['input'];
};


export type QueryListAgentTeamsWithMemoryArgs = {
  page?: Scalars['Int']['input'];
  pageSize?: Scalars['Int']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  source?: InputMaybe<MemoryExplorerSourceInput>;
};


export type QueryListAgentsWithMemoryArgs = {
  page?: Scalars['Int']['input'];
  pageSize?: Scalars['Int']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  source?: InputMaybe<MemoryExplorerSourceInput>;
};


export type QueryListMemoryHubUrlCandidatesArgs = {
  currentNodeBaseUrl?: InputMaybe<Scalars['String']['input']>;
  manualBaseUrl?: InputMaybe<Scalars['String']['input']>;
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


export type QueryProviderSettingsArgs = {
  runtimeKind?: InputMaybe<Scalars['String']['input']>;
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


export type QueryTokenUsageTaskStatisticsInPeriodArgs = {
  endTime: Scalars['DateTime']['input'];
  startTime: Scalars['DateTime']['input'];
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


export type QueryWorkspaceRunHistoryArgs = {
  limitPerAgent?: Scalars['Int']['input'];
  workspaceId: Scalars['String']['input'];
};

export type QwenConfigurationInput = {
  apiKey: Scalars['String']['input'];
  baseUrl: Scalars['String']['input'];
};

export enum QwenEndpointSource {
  Configured = 'CONFIGURED',
  Default = 'DEFAULT'
}

export type QwenSetupStatus = {
  __typename?: 'QwenSetupStatus';
  apiKeyConfigured: Scalars['Boolean']['output'];
  effectiveBaseUrl: Scalars['String']['output'];
  endpointSource: QwenEndpointSource;
};

export type RawTraceFileSummary = {
  __typename?: 'RawTraceFileSummary';
  fileName: Scalars['String']['output'];
  firstTimestamp?: Maybe<Scalars['Float']['output']>;
  kind: Scalars['String']['output'];
  lastTimestamp?: Maybe<Scalars['Float']['output']>;
  recordCount: Scalars['Int']['output'];
  segmentIndex?: Maybe<Scalars['Int']['output']>;
};

export type ReloadToolSchemaResult = {
  __typename?: 'ReloadToolSchemaResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
  tool?: Maybe<ToolDefinitionDetail>;
};

export type RemoveWorkspaceInput = {
  workspaceId: Scalars['String']['input'];
};

export type RemoveWorkspaceResultInfo = {
  __typename?: 'RemoveWorkspaceResultInfo';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
  workspaceId: Scalars['String']['output'];
  workspaceRootPath?: Maybe<Scalars['String']['output']>;
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
  hasEarlierActiveTraceEvents: Scalars['Boolean']['output'];
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
  instructionCode?: Maybe<Scalars['String']['output']>;
  provider: Scalars['String']['output'];
  serpapiStorageState?: Maybe<Scalars['String']['output']>;
  serperStorageState?: Maybe<Scalars['String']['output']>;
  vaultHealth: Scalars['String']['output'];
  vertexAiSearchServingConfig?: Maybe<Scalars['String']['output']>;
  vertexAiSearchStorageState?: Maybe<Scalars['String']['output']>;
};

export type SecretVaultStatus = {
  __typename?: 'SecretVaultStatus';
  assurance: Scalars['String']['output'];
  health: Scalars['String']['output'];
  instructionCode?: Maybe<Scalars['String']['output']>;
};

export type ServerAddressCandidateGql = {
  __typename?: 'ServerAddressCandidateGql';
  baseUrl: Scalars['String']['output'];
  id: Scalars['String']['output'];
  kind: Scalars['String']['output'];
  label: Scalars['String']['output'];
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
  None = 'NONE',
  PreloadedOnly = 'PRELOADED_ONLY'
}

export type SkillCatalogReloadResult = {
  __typename?: 'SkillCatalogReloadResult';
  skillSources: Array<SkillSource>;
  skills: Array<Skill>;
};

export type SkillImprovementCapability = {
  __typename?: 'SkillImprovementCapability';
  enabled: Scalars['Boolean']['output'];
  settingKey: Scalars['String']['output'];
  source: Scalars['String']['output'];
};

export type SkillSource = {
  __typename?: 'SkillSource';
  isDefault: Scalars['Boolean']['output'];
  path: Scalars['String']['output'];
  skillCount: Scalars['Int']['output'];
};

export type StartAgentRunSkillImprovementInput = {
  runId: Scalars['String']['input'];
};

export type StartTeamMemberSkillImprovementInput = {
  agentRunId: Scalars['String']['input'];
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

export type TaskDelegationRecordObject = {
  __typename?: 'TaskDelegationRecordObject';
  createdAt: Scalars['String']['output'];
  delegatorAgentRunId: Scalars['String']['output'];
  description: Scalars['String']['output'];
  recipientAddress: Scalars['String']['output'];
  referenceFiles: Array<TaskDelegationReferenceFileObject>;
  status: Scalars['String']['output'];
  targetAgentRunId?: Maybe<Scalars['String']['output']>;
  targetTeamRunId?: Maybe<Scalars['String']['output']>;
  taskId: Scalars['String']['output'];
  updates: Array<TaskDelegationUpdateObject>;
};

export type TaskDelegationReferenceFileObject = {
  __typename?: 'TaskDelegationReferenceFileObject';
  createdAt: Scalars['String']['output'];
  path: Scalars['String']['output'];
  referenceId: Scalars['String']['output'];
  type: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type TaskDelegationUpdateObject = {
  __typename?: 'TaskDelegationUpdateObject';
  content?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  decision?: Maybe<Scalars['String']['output']>;
  interruptionId?: Maybe<Scalars['String']['output']>;
  kind: Scalars['String']['output'];
  referenceFiles: Array<TaskDelegationReferenceFileObject>;
  reviewId?: Maybe<Scalars['String']['output']>;
  reviewedSubmissionId?: Maybe<Scalars['String']['output']>;
  submissionId?: Maybe<Scalars['String']['output']>;
};

export type TeamCommunicationMessageObject = {
  __typename?: 'TeamCommunicationMessageObject';
  content: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  messageId: Scalars['String']['output'];
  messageType: Scalars['String']['output'];
  receiverAgentRunId: Scalars['String']['output'];
  referenceFiles: Array<TeamCommunicationReferenceFileObject>;
  senderAgentRunId: Scalars['String']['output'];
};

export type TeamCommunicationReferenceFileObject = {
  __typename?: 'TeamCommunicationReferenceFileObject';
  createdAt: Scalars['String']['output'];
  path: Scalars['String']['output'];
  referenceId: Scalars['String']['output'];
  type: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
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
  memberAddress: Scalars['String']['input'];
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
  agentRunId: Scalars['String']['output'];
  displayName: Scalars['String']['output'];
  lastUpdatedAt?: Maybe<Scalars['String']['output']>;
  memberAddress: Scalars['String']['output'];
  memory: MemoryAvailabilitySummary;
};

export type TeamMemberRunProjectionPayload = {
  __typename?: 'TeamMemberRunProjectionPayload';
  activities: Array<Scalars['JSON']['output']>;
  agentRunId: Scalars['String']['output'];
  conversation: Array<Scalars['JSON']['output']>;
  hasEarlierActiveTraceEvents: Scalars['Boolean']['output'];
  lastActivityAt?: Maybe<Scalars['String']['output']>;
  summary?: Maybe<Scalars['String']['output']>;
};

export enum TeamMemberType {
  Agent = 'AGENT',
  AgentTeam = 'AGENT_TEAM'
}

export type TeamRunResumeConfigPayload = {
  __typename?: 'TeamRunResumeConfigPayload';
  executionTree: Scalars['JSON']['output'];
  isActive: Scalars['Boolean']['output'];
  teamRunId: Scalars['String']['output'];
};

export type TeamRunExecutionCheckpointPayload = {
  __typename?: 'TeamRunExecutionCheckpointPayload';
  changeSequence: Scalars['Int']['output'];
  hasOpenExecutionWork: Scalars['Boolean']['output'];
  rootTeamRunId: Scalars['String']['output'];
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

export type TestMemoryHubConnectionInput = {
  hubBaseUrl?: InputMaybe<Scalars['String']['input']>;
  mode: MemoryHubConnectionTestMode;
  sourceNodeId?: InputMaybe<Scalars['String']['input']>;
  token?: InputMaybe<Scalars['String']['input']>;
};

export type TokenUsageCostSummaryAggregateGraphql = {
  __typename?: 'TokenUsageCostSummaryAggregateGraphql';
  apiCostStatus: Scalars['String']['output'];
  billableOutputTokens: Scalars['SafeInt']['output'];
  cacheCreation1hInputTokens: Scalars['SafeInt']['output'];
  cacheCreation5mInputTokens: Scalars['SafeInt']['output'];
  cacheCreationInputTokenRate?: Maybe<Scalars['Float']['output']>;
  cacheCreationInputTokens: Scalars['SafeInt']['output'];
  cacheMissInputTokens: Scalars['SafeInt']['output'];
  cacheReadInputTokenRate?: Maybe<Scalars['Float']['output']>;
  cacheReadInputTokens: Scalars['SafeInt']['output'];
  cacheState: Scalars['String']['output'];
  currency?: Maybe<Scalars['String']['output']>;
  estimatedApiCacheCreation1hInputCost?: Maybe<Scalars['Float']['output']>;
  estimatedApiCacheCreation5mInputCost?: Maybe<Scalars['Float']['output']>;
  estimatedApiCacheCreationInputCost?: Maybe<Scalars['Float']['output']>;
  estimatedApiCacheReadInputCost?: Maybe<Scalars['Float']['output']>;
  estimatedApiInputCost?: Maybe<Scalars['Float']['output']>;
  estimatedApiOutputCost?: Maybe<Scalars['Float']['output']>;
  estimatedApiReasoningOutputCost?: Maybe<Scalars['Float']['output']>;
  estimatedApiStandardInputCost?: Maybe<Scalars['Float']['output']>;
  estimatedApiTotalCost?: Maybe<Scalars['Float']['output']>;
  grossInputTokens: Scalars['SafeInt']['output'];
  missingPriceDimensions: Array<Scalars['String']['output']>;
  observedModelIdentifiers: Array<Scalars['String']['output']>;
  observedModelProviders: Array<Scalars['String']['output']>;
  observedRuntimeKinds: Array<Scalars['String']['output']>;
  outputTokens: Scalars['SafeInt']['output'];
  pricingPolicyKey?: Maybe<Scalars['String']['output']>;
  reasoningOutputTokens: Scalars['SafeInt']['output'];
  selectedPricingTierId?: Maybe<Scalars['String']['output']>;
  standardInputTokenRate?: Maybe<Scalars['Float']['output']>;
  standardInputTokens: Scalars['SafeInt']['output'];
  totalTokens: Scalars['SafeInt']['output'];
  unitPrices: TokenUsageUnitPricesGraphql;
  updatedAt?: Maybe<Scalars['String']['output']>;
  usageReportCount: Scalars['Int']['output'];
};

export type TokenUsageRunSummaryGraphql = {
  __typename?: 'TokenUsageRunSummaryGraphql';
  agentDefinitionId?: Maybe<Scalars['String']['output']>;
  apiCostStatus: Scalars['String']['output'];
  billableOutputTokens: Scalars['SafeInt']['output'];
  cacheCreation1hInputTokens: Scalars['SafeInt']['output'];
  cacheCreation5mInputTokens: Scalars['SafeInt']['output'];
  cacheCreationInputTokenRate?: Maybe<Scalars['Float']['output']>;
  cacheCreationInputTokens: Scalars['SafeInt']['output'];
  cacheMissInputTokens: Scalars['SafeInt']['output'];
  cacheReadInputTokenRate?: Maybe<Scalars['Float']['output']>;
  cacheReadInputTokens: Scalars['SafeInt']['output'];
  cacheState: Scalars['String']['output'];
  contextWindowUsagePercent?: Maybe<Scalars['Float']['output']>;
  currency?: Maybe<Scalars['String']['output']>;
  effectiveContextWindowTokens?: Maybe<Scalars['SafeInt']['output']>;
  estimatedApiCacheCreation1hInputCost?: Maybe<Scalars['Float']['output']>;
  estimatedApiCacheCreation5mInputCost?: Maybe<Scalars['Float']['output']>;
  estimatedApiCacheCreationInputCost?: Maybe<Scalars['Float']['output']>;
  estimatedApiCacheReadInputCost?: Maybe<Scalars['Float']['output']>;
  estimatedApiInputCost?: Maybe<Scalars['Float']['output']>;
  estimatedApiOutputCost?: Maybe<Scalars['Float']['output']>;
  estimatedApiReasoningOutputCost?: Maybe<Scalars['Float']['output']>;
  estimatedApiStandardInputCost?: Maybe<Scalars['Float']['output']>;
  estimatedApiTotalCost?: Maybe<Scalars['Float']['output']>;
  grossInputTokens: Scalars['SafeInt']['output'];
  latestModelIdentifier?: Maybe<Scalars['String']['output']>;
  latestModelProvider?: Maybe<Scalars['String']['output']>;
  latestPromptTokens?: Maybe<Scalars['SafeInt']['output']>;
  latestRuntimeKind?: Maybe<Scalars['String']['output']>;
  missingPriceDimensions: Array<Scalars['String']['output']>;
  observedModelIdentifiers: Array<Scalars['String']['output']>;
  observedModelProviders: Array<Scalars['String']['output']>;
  observedRuntimeKinds: Array<Scalars['String']['output']>;
  outputTokens: Scalars['SafeInt']['output'];
  pricingPolicyKey?: Maybe<Scalars['String']['output']>;
  reasoningOutputTokens: Scalars['SafeInt']['output'];
  rootTeamRunId?: Maybe<Scalars['String']['output']>;
  runId: Scalars['String']['output'];
  selectedPricingTierId?: Maybe<Scalars['String']['output']>;
  standardInputTokenRate?: Maybe<Scalars['Float']['output']>;
  standardInputTokens: Scalars['SafeInt']['output'];
  totalTokens: Scalars['SafeInt']['output'];
  unitPrices: TokenUsageUnitPricesGraphql;
  updatedAt?: Maybe<Scalars['String']['output']>;
  usageReportCount: Scalars['Int']['output'];
  workspaceId?: Maybe<Scalars['String']['output']>;
};

export type TokenUsageTaskStatisticsResultGraphql = {
  __typename?: 'TokenUsageTaskStatisticsResultGraphql';
  rows: Array<TokenUsageTaskStatisticsRowGraphql>;
};

export type TokenUsageTaskStatisticsRowGraphql = {
  __typename?: 'TokenUsageTaskStatisticsRowGraphql';
  aggregate: TokenUsageCostSummaryAggregateGraphql;
  children: Array<TokenUsageTaskStatisticsRowGraphql>;
  createdAt: Scalars['String']['output'];
  createdTimeSource: Scalars['String']['output'];
  displayName: Scalars['String']['output'];
  modelDisplayNames: Array<Scalars['String']['output']>;
  models: Array<Scalars['String']['output']>;
  rootTeamRunId?: Maybe<Scalars['String']['output']>;
  rowId: Scalars['String']['output'];
  rowKind: Scalars['String']['output'];
  runId?: Maybe<Scalars['String']['output']>;
  runtimeKinds: Array<Scalars['String']['output']>;
  summary?: Maybe<Scalars['String']['output']>;
  taskId?: Maybe<Scalars['String']['output']>;
};

export type TokenUsageUnitPriceSummaryGraphql = {
  __typename?: 'TokenUsageUnitPriceSummaryGraphql';
  pricePerMillion?: Maybe<Scalars['Float']['output']>;
  status: Scalars['String']['output'];
};

export type TokenUsageUnitPricesGraphql = {
  __typename?: 'TokenUsageUnitPricesGraphql';
  cacheCreation1hInput: TokenUsageUnitPriceSummaryGraphql;
  cacheCreation5mInput: TokenUsageUnitPriceSummaryGraphql;
  cacheCreationInput: TokenUsageUnitPriceSummaryGraphql;
  cacheReadInput: TokenUsageUnitPriceSummaryGraphql;
  output: TokenUsageUnitPriceSummaryGraphql;
  reasoningOutput: TokenUsageUnitPriceSummaryGraphql;
  standardInput: TokenUsageUnitPriceSummaryGraphql;
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
  handoffs?: InputMaybe<Array<AgentTeamHandoffInput>>;
  id: Scalars['String']['input'];
  instructions?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  nodes?: InputMaybe<Array<TeamMemberInput>>;
};

export type UpdateMemoryHubConfigInput = {
  advertisedHubBaseUrl?: InputMaybe<Scalars['String']['input']>;
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UpdateMemorySyncSourceConfigInput = {
  backgroundEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  batchSize?: InputMaybe<Scalars['Int']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  hubBaseUrl?: InputMaybe<Scalars['String']['input']>;
  hubToken?: InputMaybe<Scalars['String']['input']>;
  intervalMs?: InputMaybe<Scalars['Int']['input']>;
  sourceNodeId?: InputMaybe<Scalars['String']['input']>;
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
  targetMemberAddress?: InputMaybe<Scalars['String']['input']>;
  targetTeamDefinitionId?: InputMaybe<Scalars['String']['input']>;
  targetType: Scalars['String']['input'];
  teamLaunchPreset?: InputMaybe<ExternalChannelTeamLaunchPresetInput>;
  threadId?: InputMaybe<Scalars['String']['input']>;
  transport: Scalars['String']['input'];
};

export type UsageStatistics = {
  __typename?: 'UsageStatistics';
  aggregate: TokenUsageCostSummaryAggregateGraphql;
  apiCostStatus: Scalars['String']['output'];
  assistantCost?: Maybe<Scalars['Float']['output']>;
  assistantTokens: Scalars['SafeInt']['output'];
  cacheCreationInputTokens: Scalars['SafeInt']['output'];
  cacheReadInputTokenRate?: Maybe<Scalars['Float']['output']>;
  cacheReadInputTokens: Scalars['SafeInt']['output'];
  cacheState: Scalars['String']['output'];
  currency?: Maybe<Scalars['String']['output']>;
  inputCost?: Maybe<Scalars['Float']['output']>;
  inputTokens: Scalars['SafeInt']['output'];
  llmModel: Scalars['String']['output'];
  modelDisplayName: Scalars['String']['output'];
  outputCost?: Maybe<Scalars['Float']['output']>;
  outputTokens: Scalars['SafeInt']['output'];
  promptCost?: Maybe<Scalars['Float']['output']>;
  promptTokens: Scalars['SafeInt']['output'];
  reasoningCost?: Maybe<Scalars['Float']['output']>;
  reasoningTokens: Scalars['SafeInt']['output'];
  runtimeKind: Scalars['String']['output'];
  thinkingCost?: Maybe<Scalars['Float']['output']>;
  thinkingTokens: Scalars['SafeInt']['output'];
  totalCost?: Maybe<Scalars['Float']['output']>;
};

export type WorkingContextCompactionStrategyOption = {
  __typename?: 'WorkingContextCompactionStrategyOption';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
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
  coordinatorAddress: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  isActive: Scalars['Boolean']['output'];
  members: Array<WorkspaceHistoryTeamRunMemberObject>;
  rootTeam: Scalars['JSON']['output'];
  summary: Scalars['String']['output'];
  teamDefinitionId: Scalars['String']['output'];
  teamDefinitionName: Scalars['String']['output'];
  teamRunId: Scalars['String']['output'];
  terminatedAt?: Maybe<Scalars['String']['output']>;
  workspaceRootPath?: Maybe<Scalars['String']['output']>;
};

export type WorkspaceHistoryTeamRunMemberObject = {
  __typename?: 'WorkspaceHistoryTeamRunMemberObject';
  agentRunId: Scalars['String']['output'];
  displayName: Scalars['String']['output'];
  memberAddress: Scalars['String']['output'];
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

export type AgentDefinitionMutationFieldsFragment = { __typename: 'AgentDefinition', id: string, name: string, role?: string | null, description: string, instructions: string, category?: string | null, avatarUrl?: string | null, toolNames: Array<string>, inputProcessorNames: Array<string>, llmResponseProcessorNames: Array<string>, toolExecutionResultProcessorNames: Array<string>, toolInvocationPreprocessorNames: Array<string>, lifecycleProcessorNames: Array<string>, skillNames: Array<string>, ownershipScope: AgentDefinitionOwnershipScope, ownerTeamId?: string | null, ownerTeamName?: string | null, ownerApplicationId?: string | null, ownerApplicationName?: string | null, ownerPackageId?: string | null, ownerLocalApplicationId?: string | null, defaultLaunchConfig?: { __typename?: 'DefaultLaunchConfig', llmModelIdentifier?: string | null, runtimeKind?: string | null, llmConfig?: any | null } | null };

export type CreateAgentDefinitionMutationVariables = Exact<{
  input: CreateAgentDefinitionInput;
}>;


export type CreateAgentDefinitionMutation = { __typename?: 'Mutation', createAgentDefinition: { __typename: 'AgentDefinition', id: string, name: string, role?: string | null, description: string, instructions: string, category?: string | null, avatarUrl?: string | null, toolNames: Array<string>, inputProcessorNames: Array<string>, llmResponseProcessorNames: Array<string>, toolExecutionResultProcessorNames: Array<string>, toolInvocationPreprocessorNames: Array<string>, lifecycleProcessorNames: Array<string>, skillNames: Array<string>, ownershipScope: AgentDefinitionOwnershipScope, ownerTeamId?: string | null, ownerTeamName?: string | null, ownerApplicationId?: string | null, ownerApplicationName?: string | null, ownerPackageId?: string | null, ownerLocalApplicationId?: string | null, defaultLaunchConfig?: { __typename?: 'DefaultLaunchConfig', llmModelIdentifier?: string | null, runtimeKind?: string | null, llmConfig?: any | null } | null } };

export type UpdateAgentDefinitionMutationVariables = Exact<{
  input: UpdateAgentDefinitionInput;
}>;


export type UpdateAgentDefinitionMutation = { __typename?: 'Mutation', updateAgentDefinition: { __typename: 'AgentDefinition', id: string, name: string, role?: string | null, description: string, instructions: string, category?: string | null, avatarUrl?: string | null, toolNames: Array<string>, inputProcessorNames: Array<string>, llmResponseProcessorNames: Array<string>, toolExecutionResultProcessorNames: Array<string>, toolInvocationPreprocessorNames: Array<string>, lifecycleProcessorNames: Array<string>, skillNames: Array<string>, ownershipScope: AgentDefinitionOwnershipScope, ownerTeamId?: string | null, ownerTeamName?: string | null, ownerApplicationId?: string | null, ownerApplicationName?: string | null, ownerPackageId?: string | null, ownerLocalApplicationId?: string | null, defaultLaunchConfig?: { __typename?: 'DefaultLaunchConfig', llmModelIdentifier?: string | null, runtimeKind?: string | null, llmConfig?: any | null } | null } };

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


export type RunAppDataMigrationMutation = { __typename?: 'Mutation', runAppDataMigration: { __typename?: 'AppDataMigrationMutationResult', success: boolean, message: string, migration?: { __typename?: 'AppDataMigrationRecordObject', migrationId: string, displayName: string, description: string, status: AppDataMigrationStatus, requiredOnStartup: boolean, recoveryAction: AppDataMigrationRecoveryAction, canRetry: boolean, attempts: number, startedAt?: any | null, completedAt?: any | null, summary?: string | null, errorMessage?: string | null, logPath?: string | null } | null } };

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

export type SaveProviderApiKeyMutationVariables = Exact<{
  providerId: Scalars['String']['input'];
  apiKey: Scalars['String']['input'];
}>;


export type SaveProviderApiKeyMutation = { __typename?: 'Mutation', saveProviderApiKey: boolean };

export type SaveQwenConfigurationMutationVariables = Exact<{
  input: QwenConfigurationInput;
}>;


export type SaveQwenConfigurationMutation = { __typename?: 'Mutation', saveQwenConfiguration: { __typename?: 'QwenSetupStatus', effectiveBaseUrl: string, endpointSource: QwenEndpointSource, apiKeyConfigured: boolean } };

export type ReloadLlmModelsMutationVariables = Exact<{
  runtimeKind?: InputMaybe<Scalars['String']['input']>;
}>;


export type ReloadLlmModelsMutation = { __typename?: 'Mutation', reloadLlmModels: string };

export type ReloadLlmProviderModelsMutationVariables = Exact<{
  providerId: Scalars['String']['input'];
  runtimeKind?: InputMaybe<Scalars['String']['input']>;
}>;


export type ReloadLlmProviderModelsMutation = { __typename?: 'Mutation', reloadLlmProviderModels: string };

export type ProbeCustomProviderMutationVariables = Exact<{
  input: CustomProviderInputObject;
}>;


export type ProbeCustomProviderMutation = { __typename?: 'Mutation', probeCustomProvider: { __typename?: 'CustomProviderProbeResultObject', discoveredModels: Array<{ __typename?: 'CustomProviderProbeModelObject', id: string, name: string }> } };

export type CreateCustomProviderMutationVariables = Exact<{
  input: CustomProviderInputObject;
}>;


export type CreateCustomProviderMutation = { __typename?: 'Mutation', createCustomProvider: string };

export type DeleteCustomProviderMutationVariables = Exact<{
  providerId: Scalars['String']['input'];
}>;


export type DeleteCustomProviderMutation = { __typename?: 'Mutation', deleteCustomProvider: boolean };

export type SaveGeminiAiStudioMutationVariables = Exact<{
  apiKey: Scalars['String']['input'];
  activateAfterSave: Scalars['Boolean']['input'];
}>;


export type SaveGeminiAiStudioMutation = { __typename?: 'Mutation', saveGeminiAiStudio: { __typename?: 'GeminiSetupStateObject', activeMode?: GeminiSetupMode | null, aiStudioConfigured?: boolean | null, vertexExpressConfigured?: boolean | null, vertexProject?: { __typename?: 'GeminiVertexProjectObject', project: string, location: string } | null } };

export type SaveGeminiVertexExpressMutationVariables = Exact<{
  apiKey: Scalars['String']['input'];
  activateAfterSave: Scalars['Boolean']['input'];
}>;


export type SaveGeminiVertexExpressMutation = { __typename?: 'Mutation', saveGeminiVertexExpress: { __typename?: 'GeminiSetupStateObject', activeMode?: GeminiSetupMode | null, aiStudioConfigured?: boolean | null, vertexExpressConfigured?: boolean | null, vertexProject?: { __typename?: 'GeminiVertexProjectObject', project: string, location: string } | null } };

export type SaveGeminiVertexProjectMutationVariables = Exact<{
  project: Scalars['String']['input'];
  location: Scalars['String']['input'];
  activateAfterSave: Scalars['Boolean']['input'];
}>;


export type SaveGeminiVertexProjectMutation = { __typename?: 'Mutation', saveGeminiVertexProject: { __typename?: 'GeminiSetupStateObject', activeMode?: GeminiSetupMode | null, aiStudioConfigured?: boolean | null, vertexExpressConfigured?: boolean | null, vertexProject?: { __typename?: 'GeminiVertexProjectObject', project: string, location: string } | null } };

export type UseGeminiModeMutationVariables = Exact<{
  mode: GeminiSetupMode;
}>;


export type UseGeminiModeMutation = { __typename?: 'Mutation', useGeminiMode: { __typename?: 'GeminiSetupStateObject', activeMode?: GeminiSetupMode | null, aiStudioConfigured?: boolean | null, vertexExpressConfigured?: boolean | null, vertexProject?: { __typename?: 'GeminiVertexProjectObject', project: string, location: string } | null } };

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

export type MemorySyncStatusFieldsFragment = { __typename?: 'MemorySyncStatusGql', oneTimePlaintextToken?: string | null, hub: { __typename?: 'MemorySyncHubConfigGql', enabled: boolean, advertisedHubBaseUrl?: string | null, updatedAt?: string | null }, source: { __typename?: 'MemorySyncSourceConfigGql', enabled: boolean, sourceNodeId?: string | null, displayName?: string | null, hubBaseUrl?: string | null, hubTokenConfigured: boolean, hubTokenPreview?: string | null, backgroundEnabled: boolean, intervalMs: number, batchSize: number, updatedAt?: string | null }, connectionInfo: { __typename?: 'MemoryHubConnectionInfoGql', hubEnabled: boolean, advertisedHubBaseUrl?: string | null, ingestEndpointUrl?: string | null, healthEndpointUrl?: string | null, secureTransportWarning?: string | null, credentials: Array<{ __typename?: 'MemoryHubCredentialSummaryGql', credentialId: string, label?: string | null, boundSourceNodeId?: string | null, createdAt: string, lastUsedAt?: string | null, revokedAt?: string | null, status: string }> }, sourceState?: { __typename?: 'MemorySyncSourceStateGql', jobState: string, lastSuccessfulSyncAt?: string | null, lastError?: string | null, trackedFileCount: number } | null, imports: Array<{ __typename?: 'MemoryImportSummaryGql', sourceNodeId: string, displayName?: string | null, lastKnownEndpoint?: string | null, firstImportedAt?: string | null, lastImportedAt?: string | null, lastSyncStatus?: string | null, lastError?: string | null, fileCount: number, totalBytes: number, lastCommittedBatchId?: string | null, lastCommittedAt?: string | null }> };

export type UpdateMemoryHubConfigMutationVariables = Exact<{
  input: UpdateMemoryHubConfigInput;
}>;


export type UpdateMemoryHubConfigMutation = { __typename?: 'Mutation', updateMemoryHubConfig: { __typename?: 'MemorySyncStatusGql', oneTimePlaintextToken?: string | null, hub: { __typename?: 'MemorySyncHubConfigGql', enabled: boolean, advertisedHubBaseUrl?: string | null, updatedAt?: string | null }, source: { __typename?: 'MemorySyncSourceConfigGql', enabled: boolean, sourceNodeId?: string | null, displayName?: string | null, hubBaseUrl?: string | null, hubTokenConfigured: boolean, hubTokenPreview?: string | null, backgroundEnabled: boolean, intervalMs: number, batchSize: number, updatedAt?: string | null }, connectionInfo: { __typename?: 'MemoryHubConnectionInfoGql', hubEnabled: boolean, advertisedHubBaseUrl?: string | null, ingestEndpointUrl?: string | null, healthEndpointUrl?: string | null, secureTransportWarning?: string | null, credentials: Array<{ __typename?: 'MemoryHubCredentialSummaryGql', credentialId: string, label?: string | null, boundSourceNodeId?: string | null, createdAt: string, lastUsedAt?: string | null, revokedAt?: string | null, status: string }> }, sourceState?: { __typename?: 'MemorySyncSourceStateGql', jobState: string, lastSuccessfulSyncAt?: string | null, lastError?: string | null, trackedFileCount: number } | null, imports: Array<{ __typename?: 'MemoryImportSummaryGql', sourceNodeId: string, displayName?: string | null, lastKnownEndpoint?: string | null, firstImportedAt?: string | null, lastImportedAt?: string | null, lastSyncStatus?: string | null, lastError?: string | null, fileCount: number, totalBytes: number, lastCommittedBatchId?: string | null, lastCommittedAt?: string | null }> } };

export type UpdateMemorySyncSourceConfigMutationVariables = Exact<{
  input: UpdateMemorySyncSourceConfigInput;
}>;


export type UpdateMemorySyncSourceConfigMutation = { __typename?: 'Mutation', updateMemorySyncSourceConfig: { __typename?: 'MemorySyncStatusGql', oneTimePlaintextToken?: string | null, hub: { __typename?: 'MemorySyncHubConfigGql', enabled: boolean, advertisedHubBaseUrl?: string | null, updatedAt?: string | null }, source: { __typename?: 'MemorySyncSourceConfigGql', enabled: boolean, sourceNodeId?: string | null, displayName?: string | null, hubBaseUrl?: string | null, hubTokenConfigured: boolean, hubTokenPreview?: string | null, backgroundEnabled: boolean, intervalMs: number, batchSize: number, updatedAt?: string | null }, connectionInfo: { __typename?: 'MemoryHubConnectionInfoGql', hubEnabled: boolean, advertisedHubBaseUrl?: string | null, ingestEndpointUrl?: string | null, healthEndpointUrl?: string | null, secureTransportWarning?: string | null, credentials: Array<{ __typename?: 'MemoryHubCredentialSummaryGql', credentialId: string, label?: string | null, boundSourceNodeId?: string | null, createdAt: string, lastUsedAt?: string | null, revokedAt?: string | null, status: string }> }, sourceState?: { __typename?: 'MemorySyncSourceStateGql', jobState: string, lastSuccessfulSyncAt?: string | null, lastError?: string | null, trackedFileCount: number } | null, imports: Array<{ __typename?: 'MemoryImportSummaryGql', sourceNodeId: string, displayName?: string | null, lastKnownEndpoint?: string | null, firstImportedAt?: string | null, lastImportedAt?: string | null, lastSyncStatus?: string | null, lastError?: string | null, fileCount: number, totalBytes: number, lastCommittedBatchId?: string | null, lastCommittedAt?: string | null }> } };

export type CreateMemoryHubSourceCredentialMutationVariables = Exact<{
  input?: InputMaybe<CreateMemoryHubCredentialInput>;
}>;


export type CreateMemoryHubSourceCredentialMutation = { __typename?: 'Mutation', createMemoryHubSourceCredential: { __typename?: 'MemoryHubCredentialMutationResultGql', plaintextToken?: string | null, credential: { __typename?: 'MemoryHubCredentialSummaryGql', credentialId: string, label?: string | null, boundSourceNodeId?: string | null, createdAt: string, lastUsedAt?: string | null, revokedAt?: string | null, status: string } } };

export type RegenerateMemoryHubSourceCredentialMutationVariables = Exact<{
  credentialId: Scalars['String']['input'];
}>;


export type RegenerateMemoryHubSourceCredentialMutation = { __typename?: 'Mutation', regenerateMemoryHubSourceCredential: { __typename?: 'MemoryHubCredentialMutationResultGql', plaintextToken?: string | null, credential: { __typename?: 'MemoryHubCredentialSummaryGql', credentialId: string, label?: string | null, boundSourceNodeId?: string | null, createdAt: string, lastUsedAt?: string | null, revokedAt?: string | null, status: string } } };

export type RevokeMemoryHubSourceCredentialMutationVariables = Exact<{
  credentialId: Scalars['String']['input'];
}>;


export type RevokeMemoryHubSourceCredentialMutation = { __typename?: 'Mutation', revokeMemoryHubSourceCredential: { __typename?: 'MemoryHubCredentialSummaryGql', credentialId: string, label?: string | null, boundSourceNodeId?: string | null, createdAt: string, lastUsedAt?: string | null, revokedAt?: string | null, status: string } };

export type TestMemoryHubConnectionMutationVariables = Exact<{
  input: TestMemoryHubConnectionInput;
}>;


export type TestMemoryHubConnectionMutation = { __typename?: 'Mutation', testMemoryHubConnection: { __typename?: 'MemoryHubConnectionTestResultGql', ok: boolean, hubEnabled: boolean, sourceNodeId: string, authenticated: boolean, message?: string | null } };

export type StartMemorySyncMutationVariables = Exact<{ [key: string]: never; }>;


export type StartMemorySyncMutation = { __typename?: 'Mutation', startMemorySync: { __typename?: 'MemorySyncRunResultGql', startedAt: string, finishedAt: string, scannedFiles: number, changedFiles: number, unchangedFiles: number, deferredFiles: number, committedBatches: number, duplicateBatches: number } };

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
  vertexAiSearchApiKey?: InputMaybe<Scalars['String']['input']>;
  vertexAiSearchServingConfig?: InputMaybe<Scalars['String']['input']>;
}>;


export type SetSearchConfigMutation = { __typename?: 'Mutation', setSearchConfig: string };

export type SetSkillImprovementEnabledMutationVariables = Exact<{
  enabled: Scalars['Boolean']['input'];
}>;


export type SetSkillImprovementEnabledMutation = { __typename?: 'Mutation', setSkillImprovementEnabled: { __typename?: 'SkillImprovementCapability', enabled: boolean, settingKey: string, source: string } };

export type StartAgentRunSkillImprovementMutationVariables = Exact<{
  input: StartAgentRunSkillImprovementInput;
}>;


export type StartAgentRunSkillImprovementMutation = { __typename?: 'Mutation', startAgentRunSkillImprovement: { __typename?: 'GraphqlSkillImprovementStartResult', improvementRunId: string, improverRunId?: string | null, record: { __typename?: 'GraphqlSkillImprovementRunRecord', improvementRunId: string, status: string, improverRunId?: string | null, errors: Array<string> } } };

export type StartTeamMemberSkillImprovementMutationVariables = Exact<{
  input: StartTeamMemberSkillImprovementInput;
}>;


export type StartTeamMemberSkillImprovementMutation = { __typename?: 'Mutation', startTeamMemberSkillImprovement: { __typename?: 'GraphqlSkillImprovementStartResult', improvementRunId: string, improverRunId?: string | null, record: { __typename?: 'GraphqlSkillImprovementRunRecord', improvementRunId: string, status: string, improverRunId?: string | null, errors: Array<string> } } };

export type ReloadToolSchemaMutationVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type ReloadToolSchemaMutation = { __typename?: 'Mutation', reloadToolSchema: { __typename?: 'ReloadToolSchemaResult', success: boolean, message: string, tool?: { __typename: 'ToolDefinitionDetail', name: string, description: string, origin: ToolOriginEnum, category: string, argumentSchema?: { __typename: 'ToolArgumentSchema', parameters: Array<{ __typename: 'ToolParameterDefinition', name: string, paramType: ToolParameterTypeEnum, description: string, required: boolean, defaultValue?: string | null, enumValues?: Array<string> | null, jsonSchema?: any | null }> } | null } | null } };

export type CreateWorkspaceMutationVariables = Exact<{
  input: CreateWorkspaceInput;
}>;


export type CreateWorkspaceMutation = { __typename?: 'Mutation', createWorkspace: { __typename: 'WorkspaceMetadata', workspaceId: string, name: string, displayName: string, config: any, workspaceRootPath: string, absolutePath?: string | null, kind: string, isTemp: boolean } };

export type RemoveWorkspaceMutationVariables = Exact<{
  input: RemoveWorkspaceInput;
}>;


export type RemoveWorkspaceMutation = { __typename?: 'Mutation', removeWorkspace: { __typename?: 'RemoveWorkspaceResultInfo', success: boolean, message: string, workspaceId: string, workspaceRootPath?: string | null } };

export type GetAgentCustomizationOptionsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAgentCustomizationOptionsQuery = { __typename?: 'Query', availableToolNames: Array<string>, availableOptionalInputProcessorNames: Array<string>, availableOptionalLlmResponseProcessorNames: Array<string>, availableOptionalToolExecutionResultProcessorNames: Array<string>, availableOptionalToolInvocationPreprocessorNames: Array<string>, availableOptionalLifecycleProcessorNames: Array<string> };

export type GetAgentDefinitionsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAgentDefinitionsQuery = { __typename?: 'Query', agentDefinitions: Array<{ __typename: 'AgentDefinition', id: string, name: string, role?: string | null, description: string, instructions: string, category?: string | null, avatarUrl?: string | null, toolNames: Array<string>, inputProcessorNames: Array<string>, llmResponseProcessorNames: Array<string>, toolExecutionResultProcessorNames: Array<string>, toolInvocationPreprocessorNames: Array<string>, lifecycleProcessorNames: Array<string>, skillNames: Array<string>, ownershipScope: AgentDefinitionOwnershipScope, ownerTeamId?: string | null, ownerTeamName?: string | null, ownerApplicationId?: string | null, ownerApplicationName?: string | null, ownerPackageId?: string | null, ownerLocalApplicationId?: string | null, defaultLaunchConfig?: { __typename?: 'DefaultLaunchConfig', llmModelIdentifier?: string | null, runtimeKind?: string | null, llmConfig?: any | null } | null }> };

export type GetAgentTeamDefinitionsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAgentTeamDefinitionsQuery = { __typename?: 'Query', agentTeamDefinitions: Array<{ __typename: 'AgentTeamDefinition', id: string, name: string, description: string, instructions: string, category?: string | null, avatarUrl?: string | null, coordinatorMemberName: string, ownershipScope: AgentTeamDefinitionOwnershipScope, ownerTeamId?: string | null, ownerTeamName?: string | null, ownerApplicationId?: string | null, ownerApplicationName?: string | null, ownerPackageId?: string | null, ownerLocalApplicationId?: string | null, defaultLaunchConfig?: { __typename?: 'DefaultLaunchConfig', llmModelIdentifier?: string | null, runtimeKind?: string | null, llmConfig?: any | null } | null, nodes: Array<{ __typename: 'TeamMember', memberName: string, ref: string, refType: TeamMemberType, refScope?: AgentMemberRefScope | null }> }> };

export type GetAppDataMigrationsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAppDataMigrationsQuery = { __typename?: 'Query', getAppDataMigrations: Array<{ __typename?: 'AppDataMigrationRecordObject', migrationId: string, displayName: string, description: string, status: AppDataMigrationStatus, requiredOnStartup: boolean, recoveryAction: AppDataMigrationRecoveryAction, canRetry: boolean, attempts: number, startedAt?: any | null, completedAt?: any | null, summary?: string | null, errorMessage?: string | null, logPath?: string | null }> };

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

export type GetProviderSettingsQueryVariables = Exact<{
  runtimeKind?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetProviderSettingsQuery = { __typename?: 'Query', providerSettings: Array<{ __typename?: 'ProviderSettingsGroup', provider: { __typename?: 'LlmProviderObject', id: string, name: string, providerType: string, isCustom: boolean, baseUrl?: string | null, apiKeyConfigured: boolean, status: string, statusMessage?: string | null }, llmModels: Array<{ __typename?: 'ModelDetail', modelIdentifier: string, name: string, providerType: string }>, audioModels: Array<{ __typename?: 'ModelDetail', modelIdentifier: string, name: string, providerType: string }>, imageModels: Array<{ __typename?: 'ModelDetail', modelIdentifier: string, name: string, providerType: string }>, videoModels: Array<{ __typename?: 'ModelDetail', modelIdentifier: string, name: string, providerType: string }> }> };

export type GetAvailableLlmProvidersWithModelsQueryVariables = Exact<{
  runtimeKind?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetAvailableLlmProvidersWithModelsQuery = { __typename?: 'Query', availableLlmProvidersWithModels: Array<{ __typename?: 'ProviderWithModels', provider: { __typename?: 'LlmProviderObject', id: string, name: string, providerType: string, isCustom: boolean, baseUrl?: string | null, status: string, statusMessage?: string | null }, models: Array<{ __typename?: 'ModelDetail', modelIdentifier: string, name: string, description?: string | null, value: string, canonicalName: string, providerId: string, providerName: string, providerType: string, runtime: string, hostUrl?: string | null, configSchema?: any | null, maxContextTokens?: number | null, activeContextTokens?: number | null, maxInputTokens?: number | null, maxOutputTokens?: number | null, metadataProvenance?: ModelMetadataProvenance | null }> }>, availableAudioProvidersWithModels: Array<{ __typename?: 'ProviderWithModels', provider: { __typename?: 'LlmProviderObject', id: string, name: string, providerType: string, isCustom: boolean, baseUrl?: string | null, status: string, statusMessage?: string | null }, models: Array<{ __typename?: 'ModelDetail', modelIdentifier: string, name: string, value: string, canonicalName: string, providerId: string, providerName: string, providerType: string, runtime: string, hostUrl?: string | null }> }>, availableImageProvidersWithModels: Array<{ __typename?: 'ProviderWithModels', provider: { __typename?: 'LlmProviderObject', id: string, name: string, providerType: string, isCustom: boolean, baseUrl?: string | null, status: string, statusMessage?: string | null }, models: Array<{ __typename?: 'ModelDetail', modelIdentifier: string, name: string, value: string, canonicalName: string, providerId: string, providerName: string, providerType: string, runtime: string, hostUrl?: string | null }> }>, availableVideoProvidersWithModels: Array<{ __typename?: 'ProviderWithModels', provider: { __typename?: 'LlmProviderObject', id: string, name: string, providerType: string, isCustom: boolean, baseUrl?: string | null, status: string, statusMessage?: string | null }, models: Array<{ __typename?: 'ModelDetail', modelIdentifier: string, name: string, value: string, canonicalName: string, providerId: string, providerName: string, providerType: string, runtime: string, hostUrl?: string | null }> }> };

export type GetGeminiSetupConfigQueryVariables = Exact<{ [key: string]: never; }>;


export type GetGeminiSetupConfigQuery = { __typename?: 'Query', getGeminiSetupConfig: { __typename?: 'GeminiSetupStateObject', activeMode?: GeminiSetupMode | null, aiStudioConfigured?: boolean | null, vertexExpressConfigured?: boolean | null, vertexProject?: { __typename?: 'GeminiVertexProjectObject', project: string, location: string } | null } };

export type GetQwenSetupStatusQueryVariables = Exact<{ [key: string]: never; }>;


export type GetQwenSetupStatusQuery = { __typename?: 'Query', qwenSetupStatus: { __typename?: 'QwenSetupStatus', effectiveBaseUrl: string, endpointSource: QwenEndpointSource, apiKeyConfigured: boolean } };

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

export type ListMemoryExplorerSourcesQueryVariables = Exact<{ [key: string]: never; }>;


export type ListMemoryExplorerSourcesQuery = { __typename?: 'Query', listMemoryExplorerSources: Array<{ __typename?: 'MemoryExplorerSourceOption', key: string, type: MemoryExplorerSourceType, label: string, sourceNodeId?: string | null, displayName?: string | null, readOnly: boolean, lastImportedAt?: string | null, lastSyncStatus?: string | null }> };

export type ListAgentsWithMemoryQueryVariables = Exact<{
  source?: InputMaybe<MemoryExplorerSourceInput>;
  search?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ListAgentsWithMemoryQuery = { __typename?: 'Query', listAgentsWithMemory: { __typename?: 'AgentWithMemoryPage', total: number, page: number, pageSize: number, totalPages: number, entries: Array<{ __typename?: 'AgentWithMemorySummary', attribution: AgentMemoryAttribution, agentDefinitionId?: string | null, displayName: string, stableId: string, runCount: number, latestMemoryAt?: string | null, memory: { __typename?: 'MemoryAvailabilitySummary', latestMemoryAt?: string | null, hasWorkingContext: boolean, hasEpisodic: boolean, hasSemantic: boolean, hasRawTraces: boolean, hasRawArchive: boolean } }> } };

export type ListAgentRunsWithMemoryQueryVariables = Exact<{
  selector: AgentWithMemorySelectorInput;
  source?: InputMaybe<MemoryExplorerSourceInput>;
  search?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ListAgentRunsWithMemoryQuery = { __typename?: 'Query', listAgentRunsWithMemory: { __typename?: 'AgentRunMemoryPage', total: number, page: number, pageSize: number, totalPages: number, entries: Array<{ __typename?: 'AgentRunMemorySummary', runId: string, agentDefinitionId?: string | null, agentName?: string | null, summary?: string | null, workspaceRootPath?: string | null, createdAt?: string | null, lastUpdatedAt?: string | null, memory: { __typename?: 'MemoryAvailabilitySummary', latestMemoryAt?: string | null, hasWorkingContext: boolean, hasEpisodic: boolean, hasSemantic: boolean, hasRawTraces: boolean, hasRawArchive: boolean } }> } };

export type ListAgentTeamsWithMemoryQueryVariables = Exact<{
  source?: InputMaybe<MemoryExplorerSourceInput>;
  search?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ListAgentTeamsWithMemoryQuery = { __typename?: 'Query', listAgentTeamsWithMemory: { __typename?: 'AgentTeamWithMemoryPage', total: number, page: number, pageSize: number, totalPages: number, entries: Array<{ __typename?: 'AgentTeamWithMemorySummary', teamDefinitionId: string, teamDefinitionName: string, teamRunCount: number, memberMemoryCount: number, latestMemoryAt?: string | null, memory: { __typename?: 'MemoryAvailabilitySummary', latestMemoryAt?: string | null, hasWorkingContext: boolean, hasEpisodic: boolean, hasSemantic: boolean, hasRawTraces: boolean, hasRawArchive: boolean } }> } };

export type ListAgentTeamRunsWithMemoryQueryVariables = Exact<{
  teamDefinitionId: Scalars['String']['input'];
  source?: InputMaybe<MemoryExplorerSourceInput>;
  search?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ListAgentTeamRunsWithMemoryQuery = { __typename?: 'Query', listAgentTeamRunsWithMemory: { __typename?: 'AgentTeamRunMemoryPage', total: number, page: number, pageSize: number, totalPages: number, entries: Array<{ __typename?: 'AgentTeamRunMemorySummary', teamRunId: string, teamDefinitionId: string, teamDefinitionName: string, summary?: string | null, workspaceRootPath?: string | null, createdAt?: string | null, lastUpdatedAt?: string | null, memory: { __typename?: 'MemoryAvailabilitySummary', latestMemoryAt?: string | null, hasWorkingContext: boolean, hasEpisodic: boolean, hasSemantic: boolean, hasRawTraces: boolean, hasRawArchive: boolean }, memberTargets: Array<{ __typename?: 'TeamMemberMemoryTargetSummary', memberAddress: string, displayName: string, agentRunId: string, agentDefinitionId?: string | null, lastUpdatedAt?: string | null, memory: { __typename?: 'MemoryAvailabilitySummary', latestMemoryAt?: string | null, hasWorkingContext: boolean, hasEpisodic: boolean, hasSemantic: boolean, hasRawTraces: boolean, hasRawArchive: boolean } }> }> } };

export type GetMemorySyncStatusQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMemorySyncStatusQuery = { __typename?: 'Query', getMemorySyncStatus: { __typename?: 'MemorySyncStatusGql', oneTimePlaintextToken?: string | null, hub: { __typename?: 'MemorySyncHubConfigGql', enabled: boolean, advertisedHubBaseUrl?: string | null, updatedAt?: string | null }, source: { __typename?: 'MemorySyncSourceConfigGql', enabled: boolean, sourceNodeId?: string | null, displayName?: string | null, hubBaseUrl?: string | null, hubTokenConfigured: boolean, hubTokenPreview?: string | null, backgroundEnabled: boolean, intervalMs: number, batchSize: number, updatedAt?: string | null }, connectionInfo: { __typename?: 'MemoryHubConnectionInfoGql', hubEnabled: boolean, advertisedHubBaseUrl?: string | null, ingestEndpointUrl?: string | null, healthEndpointUrl?: string | null, secureTransportWarning?: string | null, credentials: Array<{ __typename?: 'MemoryHubCredentialSummaryGql', credentialId: string, label?: string | null, boundSourceNodeId?: string | null, createdAt: string, lastUsedAt?: string | null, revokedAt?: string | null, status: string }> }, sourceState?: { __typename?: 'MemorySyncSourceStateGql', jobState: string, lastSuccessfulSyncAt?: string | null, lastError?: string | null, trackedFileCount: number } | null, imports: Array<{ __typename?: 'MemoryImportSummaryGql', sourceNodeId: string, displayName?: string | null, lastKnownEndpoint?: string | null, firstImportedAt?: string | null, lastImportedAt?: string | null, lastSyncStatus?: string | null, lastError?: string | null, fileCount: number, totalBytes: number, lastCommittedBatchId?: string | null, lastCommittedAt?: string | null }> } };

export type ListMemoryHubUrlCandidatesQueryVariables = Exact<{
  currentNodeBaseUrl?: InputMaybe<Scalars['String']['input']>;
  manualBaseUrl?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListMemoryHubUrlCandidatesQuery = { __typename?: 'Query', listMemoryHubUrlCandidates: Array<{ __typename?: 'ServerAddressCandidateGql', id: string, kind: string, label: string, baseUrl: string, source: string }> };

export type GetMemoryHubConnectionInfoQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMemoryHubConnectionInfoQuery = { __typename?: 'Query', getMemoryHubConnectionInfo: { __typename?: 'MemoryHubConnectionInfoGql', hubEnabled: boolean, advertisedHubBaseUrl?: string | null, ingestEndpointUrl?: string | null, healthEndpointUrl?: string | null, secureTransportWarning?: string | null, credentials: Array<{ __typename?: 'MemoryHubCredentialSummaryGql', credentialId: string, label?: string | null, boundSourceNodeId?: string | null, createdAt: string, lastUsedAt?: string | null, revokedAt?: string | null, status: string }> } };

export type GetAgentRunMemoryViewQueryVariables = Exact<{
  runId: Scalars['String']['input'];
  source?: InputMaybe<MemoryExplorerSourceInput>;
  includeWorkingContext?: InputMaybe<Scalars['Boolean']['input']>;
  includeEpisodic?: InputMaybe<Scalars['Boolean']['input']>;
  includeSemantic?: InputMaybe<Scalars['Boolean']['input']>;
  includeRawTraces?: InputMaybe<Scalars['Boolean']['input']>;
  includeRawTraceFiles?: InputMaybe<Scalars['Boolean']['input']>;
  includeArchive?: InputMaybe<Scalars['Boolean']['input']>;
  rawTraceLimit?: InputMaybe<Scalars['Int']['input']>;
  rawTraceFileName?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetAgentRunMemoryViewQuery = { __typename?: 'Query', getAgentRunMemoryView: { __typename?: 'AgentMemoryView', runId: string, episodic?: Array<any> | null, semantic?: Array<any> | null, selectedRawTraceFileName?: string | null, workingContext?: Array<{ __typename?: 'MemoryMessage', role: string, content?: string | null, reasoning?: string | null, toolPayload?: any | null, ts?: number | null }> | null, rawTraceFiles?: Array<{ __typename?: 'RawTraceFileSummary', fileName: string, kind: string, recordCount: number, segmentIndex?: number | null, firstTimestamp?: number | null, lastTimestamp?: number | null }> | null, rawTraces?: Array<{ __typename?: 'MemoryTraceEvent', scope: string, id?: string | null, traceType: string, sourceEvent?: string | null, content?: string | null, toolName?: string | null, toolCallId?: string | null, toolArgs?: any | null, toolResult?: any | null, toolError?: string | null, media?: any | null, turnId?: string | null, seq?: number | null, ts: number }> | null } };

export type GetTeamMemberRunMemoryViewQueryVariables = Exact<{
  teamRunId: Scalars['String']['input'];
  agentRunId: Scalars['String']['input'];
  source?: InputMaybe<MemoryExplorerSourceInput>;
  includeWorkingContext?: InputMaybe<Scalars['Boolean']['input']>;
  includeEpisodic?: InputMaybe<Scalars['Boolean']['input']>;
  includeSemantic?: InputMaybe<Scalars['Boolean']['input']>;
  includeRawTraces?: InputMaybe<Scalars['Boolean']['input']>;
  includeRawTraceFiles?: InputMaybe<Scalars['Boolean']['input']>;
  includeArchive?: InputMaybe<Scalars['Boolean']['input']>;
  rawTraceLimit?: InputMaybe<Scalars['Int']['input']>;
  rawTraceFileName?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetTeamMemberRunMemoryViewQuery = { __typename?: 'Query', getTeamMemberRunMemoryView: { __typename?: 'AgentMemoryView', runId: string, episodic?: Array<any> | null, semantic?: Array<any> | null, selectedRawTraceFileName?: string | null, workingContext?: Array<{ __typename?: 'MemoryMessage', role: string, content?: string | null, reasoning?: string | null, toolPayload?: any | null, ts?: number | null }> | null, rawTraceFiles?: Array<{ __typename?: 'RawTraceFileSummary', fileName: string, kind: string, recordCount: number, segmentIndex?: number | null, firstTimestamp?: number | null, lastTimestamp?: number | null }> | null, rawTraces?: Array<{ __typename?: 'MemoryTraceEvent', scope: string, id?: string | null, traceType: string, sourceEvent?: string | null, content?: string | null, toolName?: string | null, toolCallId?: string | null, toolArgs?: any | null, toolResult?: any | null, toolError?: string | null, media?: any | null, turnId?: string | null, seq?: number | null, ts: number }> | null } };

export type ListWorkspaceRunHistoryQueryVariables = Exact<{
  limitPerAgent?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ListWorkspaceRunHistoryQuery = { __typename?: 'Query', listWorkspaceRunHistory: Array<{ __typename?: 'WorkspaceRunHistoryGroupObject', workspaceRootPath: string, workspaceName: string, agentDefinitions: Array<{ __typename?: 'RunHistoryAgentGroupObject', agentDefinitionId: string, agentName: string, runs: Array<{ __typename?: 'RunHistoryItemObject', runId: string, summary: string, createdAt: string, archivedAt?: string | null, terminatedAt?: string | null, status: string, isActive: boolean, shouldConnectStream: boolean, statusSource: string }> }>, teamDefinitions: Array<{ __typename?: 'WorkspaceHistoryTeamDefinitionObject', teamDefinitionId: string, teamDefinitionName: string, runs: Array<{ __typename?: 'WorkspaceHistoryTeamRunItemObject', teamRunId: string, teamDefinitionId: string, teamDefinitionName: string, coordinatorAddress: string, workspaceRootPath?: string | null, summary: string, createdAt: string, archivedAt?: string | null, terminatedAt?: string | null, isActive: boolean, rootTeam: any, members: Array<{ __typename?: 'WorkspaceHistoryTeamRunMemberObject', memberAddress: string, displayName: string, agentRunId: string, status: string, runtimeKind: string, workspaceRootPath?: string | null }> }> }> }> };

export type GetWorkspaceRunHistoryQueryVariables = Exact<{
  workspaceId: Scalars['String']['input'];
  limitPerAgent?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetWorkspaceRunHistoryQuery = { __typename?: 'Query', workspaceRunHistory: { __typename?: 'WorkspaceRunHistoryGroupObject', workspaceRootPath: string, workspaceName: string, agentDefinitions: Array<{ __typename?: 'RunHistoryAgentGroupObject', agentDefinitionId: string, agentName: string, runs: Array<{ __typename?: 'RunHistoryItemObject', runId: string, summary: string, createdAt: string, archivedAt?: string | null, terminatedAt?: string | null, status: string, isActive: boolean, shouldConnectStream: boolean, statusSource: string }> }>, teamDefinitions: Array<{ __typename?: 'WorkspaceHistoryTeamDefinitionObject', teamDefinitionId: string, teamDefinitionName: string, runs: Array<{ __typename?: 'WorkspaceHistoryTeamRunItemObject', teamRunId: string, teamDefinitionId: string, teamDefinitionName: string, coordinatorAddress: string, workspaceRootPath?: string | null, summary: string, createdAt: string, archivedAt?: string | null, terminatedAt?: string | null, isActive: boolean, rootTeam: any, members: Array<{ __typename?: 'WorkspaceHistoryTeamRunMemberObject', memberAddress: string, displayName: string, agentRunId: string, status: string, runtimeKind: string, workspaceRootPath?: string | null }> }> }> } };

export type GetRunProjectionQueryVariables = Exact<{
  runId: Scalars['String']['input'];
}>;


export type GetRunProjectionQuery = { __typename?: 'Query', getRunProjection: { __typename?: 'RunProjectionPayload', runId: string, summary?: string | null, lastActivityAt?: string | null, conversation: Array<any>, activities: Array<any>, hasEarlierActiveTraceEvents: boolean } };

export type GetRunFileChangesQueryVariables = Exact<{
  runId: Scalars['String']['input'];
}>;


export type GetRunFileChangesQuery = { __typename?: 'Query', getRunFileChanges: Array<{ __typename?: 'RunFileChangeEntryObject', id: string, runId: string, path: string, type: string, status: string, sourceTool: string, sourceInvocationId?: string | null, content?: string | null, createdAt: string, updatedAt: string }> };

export type EventMonitorActiveTracePageFieldsFragment = { __typename?: 'EventMonitorActiveTracePage', beforeCursor?: string | null, hasEarlier: boolean, loadedEarlierCount: number, activeGeneration: string, cursorStatus: string, events: Array<{ __typename?: 'EventMonitorActiveTracePageEvent', eventId: string, turnGroupId: string, occurredAtMs?: number | null, visuals: Array<{ __typename?: 'EventMonitorAssistantTextVisual', kind: string, visualId: string, eventId: string, kindOrdinal: number, content: string } | { __typename?: 'EventMonitorCompactionVisual', kind: string, visualId: string, eventId: string, kindOrdinal: number, activityId: string, phase: string, message: string, turnId?: string | null, rawTraceCount?: number | null, semanticFactCount?: number | null, provider?: string | null } | { __typename?: 'EventMonitorMediaVisual', kind: string, visualId: string, eventId: string, kindOrdinal: number, mediaType: string, urls: Array<string> } | { __typename?: 'EventMonitorThinkingVisual', kind: string, visualId: string, eventId: string, kindOrdinal: number, content: string } | { __typename?: 'EventMonitorToolCardVisual', kind: string, visualId: string, eventId: string, kindOrdinal: number, invocationId: string, cardKind: string, toolName: string, statusKey: string, errorMessage?: string | null, summaryArgs: { __typename?: 'EventMonitorToolSummaryArgs', path?: string | null, file_path?: string | null, filepath?: string | null, filename?: string | null, target_path?: string | null, command?: string | null, cmd?: string | null, script?: string | null, query?: string | null, prompt?: string | null, url?: string | null, message?: string | null, text?: string | null, title?: string | null, name?: string | null, raw?: string | null }, approvalTarget?: { __typename?: 'EventMonitorApprovalTarget', agentRunId: string } | null } | { __typename?: 'EventMonitorUserVisual', kind: string, visualId: string, eventId: string, kindOrdinal: number, text: string, attachments: Array<{ __typename?: 'EventMonitorActiveTraceAttachment', attachmentId: string, mediaType: string, locator: string }> }> }> };

export type GetRunEventMonitorActiveTracePageQueryVariables = Exact<{
  runId: Scalars['String']['input'];
  beforeCursor?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetRunEventMonitorActiveTracePageQuery = { __typename?: 'Query', getRunEventMonitorActiveTracePage: { __typename?: 'EventMonitorActiveTracePage', beforeCursor?: string | null, hasEarlier: boolean, loadedEarlierCount: number, activeGeneration: string, cursorStatus: string, events: Array<{ __typename?: 'EventMonitorActiveTracePageEvent', eventId: string, turnGroupId: string, occurredAtMs?: number | null, visuals: Array<{ __typename?: 'EventMonitorAssistantTextVisual', kind: string, visualId: string, eventId: string, kindOrdinal: number, content: string } | { __typename?: 'EventMonitorCompactionVisual', kind: string, visualId: string, eventId: string, kindOrdinal: number, activityId: string, phase: string, message: string, turnId?: string | null, rawTraceCount?: number | null, semanticFactCount?: number | null, provider?: string | null } | { __typename?: 'EventMonitorMediaVisual', kind: string, visualId: string, eventId: string, kindOrdinal: number, mediaType: string, urls: Array<string> } | { __typename?: 'EventMonitorThinkingVisual', kind: string, visualId: string, eventId: string, kindOrdinal: number, content: string } | { __typename?: 'EventMonitorToolCardVisual', kind: string, visualId: string, eventId: string, kindOrdinal: number, invocationId: string, cardKind: string, toolName: string, statusKey: string, errorMessage?: string | null, summaryArgs: { __typename?: 'EventMonitorToolSummaryArgs', path?: string | null, file_path?: string | null, filepath?: string | null, filename?: string | null, target_path?: string | null, command?: string | null, cmd?: string | null, script?: string | null, query?: string | null, prompt?: string | null, url?: string | null, message?: string | null, text?: string | null, title?: string | null, name?: string | null, raw?: string | null }, approvalTarget?: { __typename?: 'EventMonitorApprovalTarget', agentRunId: string } | null } | { __typename?: 'EventMonitorUserVisual', kind: string, visualId: string, eventId: string, kindOrdinal: number, text: string, attachments: Array<{ __typename?: 'EventMonitorActiveTraceAttachment', attachmentId: string, mediaType: string, locator: string }> }> }> } };

export type GetTeamMemberEventMonitorActiveTracePageQueryVariables = Exact<{
  teamRunId: Scalars['String']['input'];
  agentRunId: Scalars['String']['input'];
  beforeCursor?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetTeamMemberEventMonitorActiveTracePageQuery = { __typename?: 'Query', getTeamMemberEventMonitorActiveTracePage: { __typename?: 'EventMonitorActiveTracePage', beforeCursor?: string | null, hasEarlier: boolean, loadedEarlierCount: number, activeGeneration: string, cursorStatus: string, events: Array<{ __typename?: 'EventMonitorActiveTracePageEvent', eventId: string, turnGroupId: string, occurredAtMs?: number | null, visuals: Array<{ __typename?: 'EventMonitorAssistantTextVisual', kind: string, visualId: string, eventId: string, kindOrdinal: number, content: string } | { __typename?: 'EventMonitorCompactionVisual', kind: string, visualId: string, eventId: string, kindOrdinal: number, activityId: string, phase: string, message: string, turnId?: string | null, rawTraceCount?: number | null, semanticFactCount?: number | null, provider?: string | null } | { __typename?: 'EventMonitorMediaVisual', kind: string, visualId: string, eventId: string, kindOrdinal: number, mediaType: string, urls: Array<string> } | { __typename?: 'EventMonitorThinkingVisual', kind: string, visualId: string, eventId: string, kindOrdinal: number, content: string } | { __typename?: 'EventMonitorToolCardVisual', kind: string, visualId: string, eventId: string, kindOrdinal: number, invocationId: string, cardKind: string, toolName: string, statusKey: string, errorMessage?: string | null, summaryArgs: { __typename?: 'EventMonitorToolSummaryArgs', path?: string | null, file_path?: string | null, filepath?: string | null, filename?: string | null, target_path?: string | null, command?: string | null, cmd?: string | null, script?: string | null, query?: string | null, prompt?: string | null, url?: string | null, message?: string | null, text?: string | null, title?: string | null, name?: string | null, raw?: string | null }, approvalTarget?: { __typename?: 'EventMonitorApprovalTarget', agentRunId: string } | null } | { __typename?: 'EventMonitorUserVisual', kind: string, visualId: string, eventId: string, kindOrdinal: number, text: string, attachments: Array<{ __typename?: 'EventMonitorActiveTraceAttachment', attachmentId: string, mediaType: string, locator: string }> }> }> } };

export type GetTeamRunResumeConfigQueryVariables = Exact<{
  teamRunId: Scalars['String']['input'];
}>;


export type GetTeamRunResumeConfigQuery = { __typename?: 'Query', getTeamRunResumeConfig: { __typename?: 'TeamRunResumeConfigPayload', teamRunId: string, isActive: boolean, executionTree: any } };

export type GetTeamRunExecutionCheckpointQueryVariables = Exact<{
  teamRunId: Scalars['String']['input'];
}>;


export type GetTeamRunExecutionCheckpointQuery = { __typename?: 'Query', getTeamRunExecutionCheckpoint: { __typename?: 'TeamRunExecutionCheckpointPayload', rootTeamRunId: string, changeSequence: number, hasOpenExecutionWork: boolean } };

export type GetTeamMemberRunProjectionQueryVariables = Exact<{
  teamRunId: Scalars['String']['input'];
  agentRunId: Scalars['String']['input'];
}>;


export type GetTeamMemberRunProjectionQuery = { __typename?: 'Query', getTeamMemberRunProjection: { __typename?: 'TeamMemberRunProjectionPayload', agentRunId: string, summary?: string | null, lastActivityAt?: string | null, conversation: Array<any>, activities: Array<any>, hasEarlierActiveTraceEvents: boolean } };

export type GetTeamCommunicationMessagesQueryVariables = Exact<{
  teamRunId: Scalars['String']['input'];
}>;


export type GetTeamCommunicationMessagesQuery = { __typename?: 'Query', getTeamCommunicationMessages: Array<{ __typename?: 'TeamCommunicationMessageObject', messageId: string, senderAgentRunId: string, receiverAgentRunId: string, content: string, messageType: string, createdAt: string, referenceFiles: Array<{ __typename?: 'TeamCommunicationReferenceFileObject', referenceId: string, path: string, type: string, createdAt: string, updatedAt: string }> }> };

export type GetTaskDelegationRecordsQueryVariables = Exact<{
  teamRunId: Scalars['String']['input'];
}>;


export type GetTaskDelegationRecordsQuery = { __typename?: 'Query', getTaskDelegationRecords: Array<{ __typename?: 'TaskDelegationRecordObject', taskId: string, delegatorAgentRunId: string, recipientAddress: string, targetAgentRunId?: string | null, targetTeamRunId?: string | null, status: string, description: string, createdAt: string, referenceFiles: Array<{ __typename?: 'TaskDelegationReferenceFileObject', referenceId: string, path: string, type: string, createdAt: string, updatedAt: string }>, updates: Array<{ __typename?: 'TaskDelegationUpdateObject', kind: string, submissionId?: string | null, reviewId?: string | null, interruptionId?: string | null, reviewedSubmissionId?: string | null, decision?: string | null, content?: string | null, createdAt: string, referenceFiles: Array<{ __typename?: 'TaskDelegationReferenceFileObject', referenceId: string, path: string, type: string, createdAt: string, updatedAt: string }> }> }> };

export type GetAgentRunResumeConfigQueryVariables = Exact<{
  runId: Scalars['String']['input'];
}>;


export type GetAgentRunResumeConfigQuery = { __typename?: 'Query', getAgentRunResumeConfig: { __typename?: 'RunResumeConfigPayload', runId: string, isActive: boolean, metadataConfig: { __typename?: 'RunMetadataConfigObject', agentDefinitionId: string, workspaceRootPath: string, llmModelIdentifier: string, llmConfig?: any | null, autoExecuteTools: boolean, skillAccessMode?: SkillAccessModeEnum | null, runtimeKind: string, runtimeReference: { __typename?: 'RunRuntimeReferenceObject', runtimeKind: string, sessionId?: string | null, threadId?: string | null, metadata?: any | null } }, editableFields: { __typename?: 'RunEditableFieldFlagsObject', llmModelIdentifier: boolean, llmConfig: boolean, autoExecuteTools: boolean, skillAccessMode: boolean, workspaceRootPath: boolean, runtimeKind: boolean } } };

export type GetRuntimeAvailabilitiesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetRuntimeAvailabilitiesQuery = { __typename?: 'Query', runtimeAvailabilities: Array<{ __typename?: 'RuntimeAvailabilityObject', runtimeKind: string, enabled: boolean, reason?: string | null }> };

export type GetServerSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetServerSettingsQuery = { __typename?: 'Query', getEffectiveWorkingContextCompactionStrategyId: string, getEffectiveStreamingContentFlushIntervalMs: number, getServerSettings: Array<{ __typename: 'ServerSetting', key: string, value: string, description: string, isEditable: boolean, isDeletable: boolean }> };

export type GetSearchConfigQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSearchConfigQuery = { __typename?: 'Query', getSearchConfig: { __typename?: 'SearchConfig', provider: string, vaultHealth: string, instructionCode?: string | null, serperStorageState?: string | null, serpapiStorageState?: string | null, vertexAiSearchStorageState?: string | null, vertexAiSearchServingConfig?: string | null } };

export type SkillImprovementCapabilityFieldsFragment = { __typename?: 'SkillImprovementCapability', enabled: boolean, settingKey: string, source: string };

export type SkillImprovementEffectiveConfigFieldsFragment = { __typename?: 'GraphqlSkillImprovementEffectiveConfig', enabled: boolean, triggerStrategy: string, improverStrategy: string, improverAgentDefinitionId?: string | null, resolvedAt: string, sourceTrace: Array<{ __typename?: 'GraphqlSkillImprovementConfigSourceTraceEntry', source: string, fields: Array<string> }> };

export type SkillImprovementSkillTargetFieldsFragment = { __typename?: 'GraphqlSkillImprovementSkillTarget', skillName: string, skillRootPath: string, skillMdPath: string, sourceLabel?: string | null, isWritable: boolean };

export type SkillImprovementEligibilityFieldsFragment = { __typename?: 'GraphqlSkillImprovementEligibility', eligible: boolean, reasons: Array<string>, warnings: Array<string>, skillTargets: Array<{ __typename?: 'GraphqlSkillImprovementSkillTarget', skillName: string, skillRootPath: string, skillMdPath: string, sourceLabel?: string | null, isWritable: boolean }>, effectiveConfig?: { __typename?: 'GraphqlSkillImprovementEffectiveConfig', enabled: boolean, triggerStrategy: string, improverStrategy: string, improverAgentDefinitionId?: string | null, resolvedAt: string, sourceTrace: Array<{ __typename?: 'GraphqlSkillImprovementConfigSourceTraceEntry', source: string, fields: Array<string> }> } | null };

export type SkillImprovementRunRecordSummaryFieldsFragment = { __typename?: 'GraphqlSkillImprovementRunRecord', improvementRunId: string, status: string, improverRunId?: string | null, errors: Array<string> };

export type GetSkillImprovementCapabilityQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSkillImprovementCapabilityQuery = { __typename?: 'Query', skillImprovementCapability: { __typename?: 'SkillImprovementCapability', enabled: boolean, settingKey: string, source: string } };

export type GetAgentRunSkillImprovementEligibilityQueryVariables = Exact<{
  runId: Scalars['String']['input'];
}>;


export type GetAgentRunSkillImprovementEligibilityQuery = { __typename?: 'Query', getAgentRunSkillImprovementEligibility: { __typename?: 'GraphqlSkillImprovementEligibility', eligible: boolean, reasons: Array<string>, warnings: Array<string>, skillTargets: Array<{ __typename?: 'GraphqlSkillImprovementSkillTarget', skillName: string, skillRootPath: string, skillMdPath: string, sourceLabel?: string | null, isWritable: boolean }>, effectiveConfig?: { __typename?: 'GraphqlSkillImprovementEffectiveConfig', enabled: boolean, triggerStrategy: string, improverStrategy: string, improverAgentDefinitionId?: string | null, resolvedAt: string, sourceTrace: Array<{ __typename?: 'GraphqlSkillImprovementConfigSourceTraceEntry', source: string, fields: Array<string> }> } | null } };

export type GetTeamMemberSkillImprovementEligibilityQueryVariables = Exact<{
  teamRunId: Scalars['String']['input'];
  agentRunId: Scalars['String']['input'];
}>;


export type GetTeamMemberSkillImprovementEligibilityQuery = { __typename?: 'Query', getTeamMemberSkillImprovementEligibility: { __typename?: 'GraphqlSkillImprovementEligibility', eligible: boolean, reasons: Array<string>, warnings: Array<string>, skillTargets: Array<{ __typename?: 'GraphqlSkillImprovementSkillTarget', skillName: string, skillRootPath: string, skillMdPath: string, sourceLabel?: string | null, isWritable: boolean }>, effectiveConfig?: { __typename?: 'GraphqlSkillImprovementEffectiveConfig', enabled: boolean, triggerStrategy: string, improverStrategy: string, improverAgentDefinitionId?: string | null, resolvedAt: string, sourceTrace: Array<{ __typename?: 'GraphqlSkillImprovementConfigSourceTraceEntry', source: string, fields: Array<string> }> } | null } };

export type GetSkillImprovementRunRecordQueryVariables = Exact<{
  improvementRunId: Scalars['String']['input'];
}>;


export type GetSkillImprovementRunRecordQuery = { __typename?: 'Query', getSkillImprovementRunRecord?: { __typename?: 'GraphqlSkillImprovementRunRecord', improvementRunId: string, status: string, improverRunId?: string | null, errors: Array<string> } | null };

export type TokenUsageRunSummaryFieldsFragment = { __typename?: 'TokenUsageRunSummaryGraphql', runId: string, rootTeamRunId?: string | null, agentDefinitionId?: string | null, workspaceId?: string | null, grossInputTokens: number, standardInputTokens: number, cacheMissInputTokens: number, cacheReadInputTokens: number, cacheCreationInputTokens: number, cacheCreation5mInputTokens: number, cacheCreation1hInputTokens: number, outputTokens: number, reasoningOutputTokens: number, billableOutputTokens: number, totalTokens: number, cacheReadInputTokenRate?: number | null, standardInputTokenRate?: number | null, cacheCreationInputTokenRate?: number | null, cacheState: string, estimatedApiInputCost?: number | null, estimatedApiStandardInputCost?: number | null, estimatedApiCacheReadInputCost?: number | null, estimatedApiCacheCreationInputCost?: number | null, estimatedApiCacheCreation5mInputCost?: number | null, estimatedApiCacheCreation1hInputCost?: number | null, estimatedApiOutputCost?: number | null, estimatedApiReasoningOutputCost?: number | null, estimatedApiTotalCost?: number | null, currency?: string | null, apiCostStatus: string, missingPriceDimensions: Array<string>, pricingPolicyKey?: string | null, selectedPricingTierId?: string | null, latestPromptTokens?: number | null, effectiveContextWindowTokens?: number | null, contextWindowUsagePercent?: number | null, latestModelProvider?: string | null, latestModelIdentifier?: string | null, latestRuntimeKind?: string | null, usageReportCount: number, updatedAt?: string | null, unitPrices: { __typename?: 'TokenUsageUnitPricesGraphql', standardInput: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null }, cacheReadInput: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null }, cacheCreationInput: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null }, cacheCreation5mInput: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null }, cacheCreation1hInput: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null }, output: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null }, reasoningOutput: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null } } };

export type GetAgentRunTokenUsageSummaryQueryVariables = Exact<{
  runId: Scalars['String']['input'];
}>;


export type GetAgentRunTokenUsageSummaryQuery = { __typename?: 'Query', getAgentRunTokenUsageSummary: { __typename?: 'TokenUsageRunSummaryGraphql', runId: string, rootTeamRunId?: string | null, agentDefinitionId?: string | null, workspaceId?: string | null, grossInputTokens: number, standardInputTokens: number, cacheMissInputTokens: number, cacheReadInputTokens: number, cacheCreationInputTokens: number, cacheCreation5mInputTokens: number, cacheCreation1hInputTokens: number, outputTokens: number, reasoningOutputTokens: number, billableOutputTokens: number, totalTokens: number, cacheReadInputTokenRate?: number | null, standardInputTokenRate?: number | null, cacheCreationInputTokenRate?: number | null, cacheState: string, estimatedApiInputCost?: number | null, estimatedApiStandardInputCost?: number | null, estimatedApiCacheReadInputCost?: number | null, estimatedApiCacheCreationInputCost?: number | null, estimatedApiCacheCreation5mInputCost?: number | null, estimatedApiCacheCreation1hInputCost?: number | null, estimatedApiOutputCost?: number | null, estimatedApiReasoningOutputCost?: number | null, estimatedApiTotalCost?: number | null, currency?: string | null, apiCostStatus: string, missingPriceDimensions: Array<string>, pricingPolicyKey?: string | null, selectedPricingTierId?: string | null, latestPromptTokens?: number | null, effectiveContextWindowTokens?: number | null, contextWindowUsagePercent?: number | null, latestModelProvider?: string | null, latestModelIdentifier?: string | null, latestRuntimeKind?: string | null, usageReportCount: number, updatedAt?: string | null, unitPrices: { __typename?: 'TokenUsageUnitPricesGraphql', standardInput: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null }, cacheReadInput: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null }, cacheCreationInput: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null }, cacheCreation5mInput: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null }, cacheCreation1hInput: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null }, output: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null }, reasoningOutput: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null } } } };

export type GetTeamRunTokenUsageSummaryQueryVariables = Exact<{
  teamRunId: Scalars['String']['input'];
}>;


export type GetTeamRunTokenUsageSummaryQuery = { __typename?: 'Query', getTeamRunTokenUsageSummary: { __typename?: 'TokenUsageRunSummaryGraphql', runId: string, rootTeamRunId?: string | null, agentDefinitionId?: string | null, workspaceId?: string | null, grossInputTokens: number, standardInputTokens: number, cacheMissInputTokens: number, cacheReadInputTokens: number, cacheCreationInputTokens: number, cacheCreation5mInputTokens: number, cacheCreation1hInputTokens: number, outputTokens: number, reasoningOutputTokens: number, billableOutputTokens: number, totalTokens: number, cacheReadInputTokenRate?: number | null, standardInputTokenRate?: number | null, cacheCreationInputTokenRate?: number | null, cacheState: string, estimatedApiInputCost?: number | null, estimatedApiStandardInputCost?: number | null, estimatedApiCacheReadInputCost?: number | null, estimatedApiCacheCreationInputCost?: number | null, estimatedApiCacheCreation5mInputCost?: number | null, estimatedApiCacheCreation1hInputCost?: number | null, estimatedApiOutputCost?: number | null, estimatedApiReasoningOutputCost?: number | null, estimatedApiTotalCost?: number | null, currency?: string | null, apiCostStatus: string, missingPriceDimensions: Array<string>, pricingPolicyKey?: string | null, selectedPricingTierId?: string | null, latestPromptTokens?: number | null, effectiveContextWindowTokens?: number | null, contextWindowUsagePercent?: number | null, latestModelProvider?: string | null, latestModelIdentifier?: string | null, latestRuntimeKind?: string | null, usageReportCount: number, updatedAt?: string | null, unitPrices: { __typename?: 'TokenUsageUnitPricesGraphql', standardInput: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null }, cacheReadInput: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null }, cacheCreationInput: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null }, cacheCreation5mInput: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null }, cacheCreation1hInput: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null }, output: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null }, reasoningOutput: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null } } } };

export type GetTeamMemberTokenUsageSummaryQueryVariables = Exact<{
  teamRunId: Scalars['String']['input'];
  agentRunId: Scalars['String']['input'];
}>;


export type GetTeamMemberTokenUsageSummaryQuery = { __typename?: 'Query', getTeamMemberTokenUsageSummary: { __typename?: 'TokenUsageRunSummaryGraphql', runId: string, rootTeamRunId?: string | null, agentDefinitionId?: string | null, workspaceId?: string | null, grossInputTokens: number, standardInputTokens: number, cacheMissInputTokens: number, cacheReadInputTokens: number, cacheCreationInputTokens: number, cacheCreation5mInputTokens: number, cacheCreation1hInputTokens: number, outputTokens: number, reasoningOutputTokens: number, billableOutputTokens: number, totalTokens: number, cacheReadInputTokenRate?: number | null, standardInputTokenRate?: number | null, cacheCreationInputTokenRate?: number | null, cacheState: string, estimatedApiInputCost?: number | null, estimatedApiStandardInputCost?: number | null, estimatedApiCacheReadInputCost?: number | null, estimatedApiCacheCreationInputCost?: number | null, estimatedApiCacheCreation5mInputCost?: number | null, estimatedApiCacheCreation1hInputCost?: number | null, estimatedApiOutputCost?: number | null, estimatedApiReasoningOutputCost?: number | null, estimatedApiTotalCost?: number | null, currency?: string | null, apiCostStatus: string, missingPriceDimensions: Array<string>, pricingPolicyKey?: string | null, selectedPricingTierId?: string | null, latestPromptTokens?: number | null, effectiveContextWindowTokens?: number | null, contextWindowUsagePercent?: number | null, latestModelProvider?: string | null, latestModelIdentifier?: string | null, latestRuntimeKind?: string | null, usageReportCount: number, updatedAt?: string | null, unitPrices: { __typename?: 'TokenUsageUnitPricesGraphql', standardInput: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null }, cacheReadInput: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null }, cacheCreationInput: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null }, cacheCreation5mInput: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null }, cacheCreation1hInput: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null }, output: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null }, reasoningOutput: { __typename?: 'TokenUsageUnitPriceSummaryGraphql', status: string, pricePerMillion?: number | null } } } };

export type TokenUsageCostSummaryAggregateFieldsFragment = { __typename?: 'TokenUsageCostSummaryAggregateGraphql', grossInputTokens: number, standardInputTokens: number, cacheMissInputTokens: number, cacheReadInputTokens: number, cacheCreationInputTokens: number, cacheCreation5mInputTokens: number, cacheCreation1hInputTokens: number, outputTokens: number, reasoningOutputTokens: number, billableOutputTokens: number, totalTokens: number, cacheReadInputTokenRate?: number | null, standardInputTokenRate?: number | null, cacheCreationInputTokenRate?: number | null, cacheState: string, estimatedApiInputCost?: number | null, estimatedApiStandardInputCost?: number | null, estimatedApiCacheReadInputCost?: number | null, estimatedApiCacheCreationInputCost?: number | null, estimatedApiCacheCreation5mInputCost?: number | null, estimatedApiCacheCreation1hInputCost?: number | null, estimatedApiOutputCost?: number | null, estimatedApiReasoningOutputCost?: number | null, estimatedApiTotalCost?: number | null, currency?: string | null, apiCostStatus: string, missingPriceDimensions: Array<string>, pricingPolicyKey?: string | null, selectedPricingTierId?: string | null, usageReportCount: number, updatedAt?: string | null, observedRuntimeKinds: Array<string>, observedModelIdentifiers: Array<string>, observedModelProviders: Array<string> };

export type TokenUsageTaskStatisticsRowFieldsFragment = { __typename?: 'TokenUsageTaskStatisticsRowGraphql', rowId: string, rowKind: string, runId?: string | null, taskId?: string | null, rootTeamRunId?: string | null, displayName: string, summary?: string | null, createdAt: string, createdTimeSource: string, models: Array<string>, modelDisplayNames: Array<string>, runtimeKinds: Array<string>, aggregate: { __typename?: 'TokenUsageCostSummaryAggregateGraphql', grossInputTokens: number, standardInputTokens: number, cacheMissInputTokens: number, cacheReadInputTokens: number, cacheCreationInputTokens: number, cacheCreation5mInputTokens: number, cacheCreation1hInputTokens: number, outputTokens: number, reasoningOutputTokens: number, billableOutputTokens: number, totalTokens: number, cacheReadInputTokenRate?: number | null, standardInputTokenRate?: number | null, cacheCreationInputTokenRate?: number | null, cacheState: string, estimatedApiInputCost?: number | null, estimatedApiStandardInputCost?: number | null, estimatedApiCacheReadInputCost?: number | null, estimatedApiCacheCreationInputCost?: number | null, estimatedApiCacheCreation5mInputCost?: number | null, estimatedApiCacheCreation1hInputCost?: number | null, estimatedApiOutputCost?: number | null, estimatedApiReasoningOutputCost?: number | null, estimatedApiTotalCost?: number | null, currency?: string | null, apiCostStatus: string, missingPriceDimensions: Array<string>, pricingPolicyKey?: string | null, selectedPricingTierId?: string | null, usageReportCount: number, updatedAt?: string | null, observedRuntimeKinds: Array<string>, observedModelIdentifiers: Array<string>, observedModelProviders: Array<string> } };

export type GetTokenUsageTaskStatisticsInPeriodQueryVariables = Exact<{
  startTime: Scalars['DateTime']['input'];
  endTime: Scalars['DateTime']['input'];
}>;


export type GetTokenUsageTaskStatisticsInPeriodQuery = { __typename?: 'Query', tokenUsageTaskStatisticsInPeriod: { __typename?: 'TokenUsageTaskStatisticsResultGraphql', rows: Array<{ __typename?: 'TokenUsageTaskStatisticsRowGraphql', rowId: string, rowKind: string, runId?: string | null, taskId?: string | null, rootTeamRunId?: string | null, displayName: string, summary?: string | null, createdAt: string, createdTimeSource: string, models: Array<string>, modelDisplayNames: Array<string>, runtimeKinds: Array<string>, children: Array<{ __typename?: 'TokenUsageTaskStatisticsRowGraphql', rowId: string, rowKind: string, runId?: string | null, taskId?: string | null, rootTeamRunId?: string | null, displayName: string, summary?: string | null, createdAt: string, createdTimeSource: string, models: Array<string>, modelDisplayNames: Array<string>, runtimeKinds: Array<string>, children: Array<{ __typename?: 'TokenUsageTaskStatisticsRowGraphql', rowId: string, rowKind: string, runId?: string | null, taskId?: string | null, rootTeamRunId?: string | null, displayName: string, summary?: string | null, createdAt: string, createdTimeSource: string, models: Array<string>, modelDisplayNames: Array<string>, runtimeKinds: Array<string>, children: Array<{ __typename?: 'TokenUsageTaskStatisticsRowGraphql', rowId: string, rowKind: string, runId?: string | null, taskId?: string | null, rootTeamRunId?: string | null, displayName: string, summary?: string | null, createdAt: string, createdTimeSource: string, models: Array<string>, modelDisplayNames: Array<string>, runtimeKinds: Array<string>, children: Array<{ __typename?: 'TokenUsageTaskStatisticsRowGraphql', rowId: string, rowKind: string, runId?: string | null, taskId?: string | null, rootTeamRunId?: string | null, displayName: string, summary?: string | null, createdAt: string, createdTimeSource: string, models: Array<string>, modelDisplayNames: Array<string>, runtimeKinds: Array<string>, children: Array<{ __typename?: 'TokenUsageTaskStatisticsRowGraphql', rowId: string, rowKind: string, runId?: string | null, taskId?: string | null, rootTeamRunId?: string | null, displayName: string, summary?: string | null, createdAt: string, createdTimeSource: string, models: Array<string>, modelDisplayNames: Array<string>, runtimeKinds: Array<string>, aggregate: { __typename?: 'TokenUsageCostSummaryAggregateGraphql', grossInputTokens: number, standardInputTokens: number, cacheMissInputTokens: number, cacheReadInputTokens: number, cacheCreationInputTokens: number, cacheCreation5mInputTokens: number, cacheCreation1hInputTokens: number, outputTokens: number, reasoningOutputTokens: number, billableOutputTokens: number, totalTokens: number, cacheReadInputTokenRate?: number | null, standardInputTokenRate?: number | null, cacheCreationInputTokenRate?: number | null, cacheState: string, estimatedApiInputCost?: number | null, estimatedApiStandardInputCost?: number | null, estimatedApiCacheReadInputCost?: number | null, estimatedApiCacheCreationInputCost?: number | null, estimatedApiCacheCreation5mInputCost?: number | null, estimatedApiCacheCreation1hInputCost?: number | null, estimatedApiOutputCost?: number | null, estimatedApiReasoningOutputCost?: number | null, estimatedApiTotalCost?: number | null, currency?: string | null, apiCostStatus: string, missingPriceDimensions: Array<string>, pricingPolicyKey?: string | null, selectedPricingTierId?: string | null, usageReportCount: number, updatedAt?: string | null, observedRuntimeKinds: Array<string>, observedModelIdentifiers: Array<string>, observedModelProviders: Array<string> } }>, aggregate: { __typename?: 'TokenUsageCostSummaryAggregateGraphql', grossInputTokens: number, standardInputTokens: number, cacheMissInputTokens: number, cacheReadInputTokens: number, cacheCreationInputTokens: number, cacheCreation5mInputTokens: number, cacheCreation1hInputTokens: number, outputTokens: number, reasoningOutputTokens: number, billableOutputTokens: number, totalTokens: number, cacheReadInputTokenRate?: number | null, standardInputTokenRate?: number | null, cacheCreationInputTokenRate?: number | null, cacheState: string, estimatedApiInputCost?: number | null, estimatedApiStandardInputCost?: number | null, estimatedApiCacheReadInputCost?: number | null, estimatedApiCacheCreationInputCost?: number | null, estimatedApiCacheCreation5mInputCost?: number | null, estimatedApiCacheCreation1hInputCost?: number | null, estimatedApiOutputCost?: number | null, estimatedApiReasoningOutputCost?: number | null, estimatedApiTotalCost?: number | null, currency?: string | null, apiCostStatus: string, missingPriceDimensions: Array<string>, pricingPolicyKey?: string | null, selectedPricingTierId?: string | null, usageReportCount: number, updatedAt?: string | null, observedRuntimeKinds: Array<string>, observedModelIdentifiers: Array<string>, observedModelProviders: Array<string> } }>, aggregate: { __typename?: 'TokenUsageCostSummaryAggregateGraphql', grossInputTokens: number, standardInputTokens: number, cacheMissInputTokens: number, cacheReadInputTokens: number, cacheCreationInputTokens: number, cacheCreation5mInputTokens: number, cacheCreation1hInputTokens: number, outputTokens: number, reasoningOutputTokens: number, billableOutputTokens: number, totalTokens: number, cacheReadInputTokenRate?: number | null, standardInputTokenRate?: number | null, cacheCreationInputTokenRate?: number | null, cacheState: string, estimatedApiInputCost?: number | null, estimatedApiStandardInputCost?: number | null, estimatedApiCacheReadInputCost?: number | null, estimatedApiCacheCreationInputCost?: number | null, estimatedApiCacheCreation5mInputCost?: number | null, estimatedApiCacheCreation1hInputCost?: number | null, estimatedApiOutputCost?: number | null, estimatedApiReasoningOutputCost?: number | null, estimatedApiTotalCost?: number | null, currency?: string | null, apiCostStatus: string, missingPriceDimensions: Array<string>, pricingPolicyKey?: string | null, selectedPricingTierId?: string | null, usageReportCount: number, updatedAt?: string | null, observedRuntimeKinds: Array<string>, observedModelIdentifiers: Array<string>, observedModelProviders: Array<string> } }>, aggregate: { __typename?: 'TokenUsageCostSummaryAggregateGraphql', grossInputTokens: number, standardInputTokens: number, cacheMissInputTokens: number, cacheReadInputTokens: number, cacheCreationInputTokens: number, cacheCreation5mInputTokens: number, cacheCreation1hInputTokens: number, outputTokens: number, reasoningOutputTokens: number, billableOutputTokens: number, totalTokens: number, cacheReadInputTokenRate?: number | null, standardInputTokenRate?: number | null, cacheCreationInputTokenRate?: number | null, cacheState: string, estimatedApiInputCost?: number | null, estimatedApiStandardInputCost?: number | null, estimatedApiCacheReadInputCost?: number | null, estimatedApiCacheCreationInputCost?: number | null, estimatedApiCacheCreation5mInputCost?: number | null, estimatedApiCacheCreation1hInputCost?: number | null, estimatedApiOutputCost?: number | null, estimatedApiReasoningOutputCost?: number | null, estimatedApiTotalCost?: number | null, currency?: string | null, apiCostStatus: string, missingPriceDimensions: Array<string>, pricingPolicyKey?: string | null, selectedPricingTierId?: string | null, usageReportCount: number, updatedAt?: string | null, observedRuntimeKinds: Array<string>, observedModelIdentifiers: Array<string>, observedModelProviders: Array<string> } }>, aggregate: { __typename?: 'TokenUsageCostSummaryAggregateGraphql', grossInputTokens: number, standardInputTokens: number, cacheMissInputTokens: number, cacheReadInputTokens: number, cacheCreationInputTokens: number, cacheCreation5mInputTokens: number, cacheCreation1hInputTokens: number, outputTokens: number, reasoningOutputTokens: number, billableOutputTokens: number, totalTokens: number, cacheReadInputTokenRate?: number | null, standardInputTokenRate?: number | null, cacheCreationInputTokenRate?: number | null, cacheState: string, estimatedApiInputCost?: number | null, estimatedApiStandardInputCost?: number | null, estimatedApiCacheReadInputCost?: number | null, estimatedApiCacheCreationInputCost?: number | null, estimatedApiCacheCreation5mInputCost?: number | null, estimatedApiCacheCreation1hInputCost?: number | null, estimatedApiOutputCost?: number | null, estimatedApiReasoningOutputCost?: number | null, estimatedApiTotalCost?: number | null, currency?: string | null, apiCostStatus: string, missingPriceDimensions: Array<string>, pricingPolicyKey?: string | null, selectedPricingTierId?: string | null, usageReportCount: number, updatedAt?: string | null, observedRuntimeKinds: Array<string>, observedModelIdentifiers: Array<string>, observedModelProviders: Array<string> } }>, aggregate: { __typename?: 'TokenUsageCostSummaryAggregateGraphql', grossInputTokens: number, standardInputTokens: number, cacheMissInputTokens: number, cacheReadInputTokens: number, cacheCreationInputTokens: number, cacheCreation5mInputTokens: number, cacheCreation1hInputTokens: number, outputTokens: number, reasoningOutputTokens: number, billableOutputTokens: number, totalTokens: number, cacheReadInputTokenRate?: number | null, standardInputTokenRate?: number | null, cacheCreationInputTokenRate?: number | null, cacheState: string, estimatedApiInputCost?: number | null, estimatedApiStandardInputCost?: number | null, estimatedApiCacheReadInputCost?: number | null, estimatedApiCacheCreationInputCost?: number | null, estimatedApiCacheCreation5mInputCost?: number | null, estimatedApiCacheCreation1hInputCost?: number | null, estimatedApiOutputCost?: number | null, estimatedApiReasoningOutputCost?: number | null, estimatedApiTotalCost?: number | null, currency?: string | null, apiCostStatus: string, missingPriceDimensions: Array<string>, pricingPolicyKey?: string | null, selectedPricingTierId?: string | null, usageReportCount: number, updatedAt?: string | null, observedRuntimeKinds: Array<string>, observedModelIdentifiers: Array<string>, observedModelProviders: Array<string> } }> } };

export type GetUsageStatisticsInPeriodQueryVariables = Exact<{
  startTime: Scalars['DateTime']['input'];
  endTime: Scalars['DateTime']['input'];
}>;


export type GetUsageStatisticsInPeriodQuery = { __typename?: 'Query', usageStatisticsInPeriod: Array<{ __typename?: 'UsageStatistics', runtimeKind: string, llmModel: string, modelDisplayName: string, inputTokens: number, cacheReadInputTokens: number, cacheCreationInputTokens: number, cacheReadInputTokenRate?: number | null, cacheState: string, outputTokens: number, thinkingTokens: number, inputCost?: number | null, outputCost?: number | null, thinkingCost?: number | null, totalCost?: number | null, currency?: string | null, apiCostStatus: string, aggregate: { __typename?: 'TokenUsageCostSummaryAggregateGraphql', grossInputTokens: number, standardInputTokens: number, cacheMissInputTokens: number, cacheReadInputTokens: number, cacheCreationInputTokens: number, cacheCreation5mInputTokens: number, cacheCreation1hInputTokens: number, outputTokens: number, reasoningOutputTokens: number, billableOutputTokens: number, totalTokens: number, cacheReadInputTokenRate?: number | null, standardInputTokenRate?: number | null, cacheCreationInputTokenRate?: number | null, cacheState: string, estimatedApiInputCost?: number | null, estimatedApiStandardInputCost?: number | null, estimatedApiCacheReadInputCost?: number | null, estimatedApiCacheCreationInputCost?: number | null, estimatedApiCacheCreation5mInputCost?: number | null, estimatedApiCacheCreation1hInputCost?: number | null, estimatedApiOutputCost?: number | null, estimatedApiReasoningOutputCost?: number | null, estimatedApiTotalCost?: number | null, currency?: string | null, apiCostStatus: string, missingPriceDimensions: Array<string>, pricingPolicyKey?: string | null, selectedPricingTierId?: string | null, usageReportCount: number, updatedAt?: string | null, observedRuntimeKinds: Array<string>, observedModelIdentifiers: Array<string>, observedModelProviders: Array<string> } }> };

export type GetToolsQueryVariables = Exact<{
  origin?: InputMaybe<ToolOriginEnum>;
  sourceServerId?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetToolsQuery = { __typename?: 'Query', tools: Array<{ __typename: 'ToolDefinitionDetail', name: string, description: string, origin: ToolOriginEnum, category: string, argumentSchema?: { __typename: 'ToolArgumentSchema', parameters: Array<{ __typename: 'ToolParameterDefinition', name: string, paramType: ToolParameterTypeEnum, description: string, required: boolean, defaultValue?: string | null, enumValues?: Array<string> | null, jsonSchema?: any | null }> } | null }> };

export type GetToolsGroupedByCategoryQueryVariables = Exact<{
  origin: ToolOriginEnum;
}>;


export type GetToolsGroupedByCategoryQuery = { __typename?: 'Query', toolsGroupedByCategory: Array<{ __typename: 'ToolCategoryGroup', categoryName: string, tools: Array<{ __typename: 'ToolDefinitionDetail', name: string, description: string, origin: ToolOriginEnum, category: string, argumentSchema?: { __typename: 'ToolArgumentSchema', parameters: Array<{ __typename: 'ToolParameterDefinition', name: string, paramType: ToolParameterTypeEnum, description: string, required: boolean, defaultValue?: string | null, enumValues?: Array<string> | null, jsonSchema?: any | null }> } | null }> }> };

export type GetWorkingContextCompactionStrategiesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetWorkingContextCompactionStrategiesQuery = { __typename?: 'Query', getWorkingContextCompactionStrategies: Array<{ __typename?: 'WorkingContextCompactionStrategyOption', id: string, name: string }> };

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
export const MemorySyncStatusFieldsFragmentDoc = gql`
    fragment MemorySyncStatusFields on MemorySyncStatusGql {
  hub {
    enabled
    advertisedHubBaseUrl
    updatedAt
  }
  source {
    enabled
    sourceNodeId
    displayName
    hubBaseUrl
    hubTokenConfigured
    hubTokenPreview
    backgroundEnabled
    intervalMs
    batchSize
    updatedAt
  }
  connectionInfo {
    hubEnabled
    advertisedHubBaseUrl
    ingestEndpointUrl
    healthEndpointUrl
    secureTransportWarning
    credentials {
      credentialId
      label
      boundSourceNodeId
      createdAt
      lastUsedAt
      revokedAt
      status
    }
  }
  sourceState {
    jobState
    lastSuccessfulSyncAt
    lastError
    trackedFileCount
  }
  imports {
    sourceNodeId
    displayName
    lastKnownEndpoint
    firstImportedAt
    lastImportedAt
    lastSyncStatus
    lastError
    fileCount
    totalBytes
    lastCommittedBatchId
    lastCommittedAt
  }
  oneTimePlaintextToken
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
export const EventMonitorActiveTracePageFieldsFragmentDoc = gql`
    fragment EventMonitorActiveTracePageFields on EventMonitorActiveTracePage {
  beforeCursor
  hasEarlier
  loadedEarlierCount
  activeGeneration
  cursorStatus
  events {
    eventId
    turnGroupId
    occurredAtMs
    visuals {
      ... on EventMonitorUserVisual {
        kind
        visualId
        eventId
        kindOrdinal
        text
        attachments {
          attachmentId
          mediaType
          locator
        }
      }
      ... on EventMonitorAssistantTextVisual {
        kind
        visualId
        eventId
        kindOrdinal
        content
      }
      ... on EventMonitorThinkingVisual {
        kind
        visualId
        eventId
        kindOrdinal
        content
      }
      ... on EventMonitorToolCardVisual {
        kind
        visualId
        eventId
        kindOrdinal
        invocationId
        cardKind
        toolName
        statusKey
        errorMessage
        summaryArgs {
          path
          file_path
          filepath
          filename
          target_path
          command
          cmd
          script
          query
          prompt
          url
          message
          text
          title
          name
          raw
        }
        approvalTarget {
          agentRunId
        }
      }
      ... on EventMonitorMediaVisual {
        kind
        visualId
        eventId
        kindOrdinal
        mediaType
        urls
      }
      ... on EventMonitorCompactionVisual {
        kind
        visualId
        eventId
        kindOrdinal
        activityId
        phase
        message
        turnId
        rawTraceCount
        semanticFactCount
        provider
      }
    }
  }
}
    `;
export const SkillImprovementCapabilityFieldsFragmentDoc = gql`
    fragment SkillImprovementCapabilityFields on SkillImprovementCapability {
  enabled
  settingKey
  source
}
    `;
export const SkillImprovementSkillTargetFieldsFragmentDoc = gql`
    fragment SkillImprovementSkillTargetFields on GraphqlSkillImprovementSkillTarget {
  skillName
  skillRootPath
  skillMdPath
  sourceLabel
  isWritable
}
    `;
export const SkillImprovementEffectiveConfigFieldsFragmentDoc = gql`
    fragment SkillImprovementEffectiveConfigFields on GraphqlSkillImprovementEffectiveConfig {
  enabled
  triggerStrategy
  improverStrategy
  improverAgentDefinitionId
  resolvedAt
  sourceTrace {
    source
    fields
  }
}
    `;
export const SkillImprovementEligibilityFieldsFragmentDoc = gql`
    fragment SkillImprovementEligibilityFields on GraphqlSkillImprovementEligibility {
  eligible
  reasons
  warnings
  skillTargets {
    ...SkillImprovementSkillTargetFields
  }
  effectiveConfig {
    ...SkillImprovementEffectiveConfigFields
  }
}
    ${SkillImprovementSkillTargetFieldsFragmentDoc}
${SkillImprovementEffectiveConfigFieldsFragmentDoc}`;
export const SkillImprovementRunRecordSummaryFieldsFragmentDoc = gql`
    fragment SkillImprovementRunRecordSummaryFields on GraphqlSkillImprovementRunRecord {
  improvementRunId
  status
  improverRunId
  errors
}
    `;
export const TokenUsageRunSummaryFieldsFragmentDoc = gql`
    fragment TokenUsageRunSummaryFields on TokenUsageRunSummaryGraphql {
  runId
  rootTeamRunId
  agentDefinitionId
  workspaceId
  grossInputTokens
  standardInputTokens
  cacheMissInputTokens
  cacheReadInputTokens
  cacheCreationInputTokens
  cacheCreation5mInputTokens
  cacheCreation1hInputTokens
  outputTokens
  reasoningOutputTokens
  billableOutputTokens
  totalTokens
  cacheReadInputTokenRate
  standardInputTokenRate
  cacheCreationInputTokenRate
  cacheState
  estimatedApiInputCost
  estimatedApiStandardInputCost
  estimatedApiCacheReadInputCost
  estimatedApiCacheCreationInputCost
  estimatedApiCacheCreation5mInputCost
  estimatedApiCacheCreation1hInputCost
  estimatedApiOutputCost
  estimatedApiReasoningOutputCost
  estimatedApiTotalCost
  currency
  apiCostStatus
  missingPriceDimensions
  pricingPolicyKey
  selectedPricingTierId
  unitPrices {
    standardInput {
      status
      pricePerMillion
    }
    cacheReadInput {
      status
      pricePerMillion
    }
    cacheCreationInput {
      status
      pricePerMillion
    }
    cacheCreation5mInput {
      status
      pricePerMillion
    }
    cacheCreation1hInput {
      status
      pricePerMillion
    }
    output {
      status
      pricePerMillion
    }
    reasoningOutput {
      status
      pricePerMillion
    }
  }
  latestPromptTokens
  effectiveContextWindowTokens
  contextWindowUsagePercent
  latestModelProvider
  latestModelIdentifier
  latestRuntimeKind
  usageReportCount
  updatedAt
}
    `;
export const TokenUsageCostSummaryAggregateFieldsFragmentDoc = gql`
    fragment TokenUsageCostSummaryAggregateFields on TokenUsageCostSummaryAggregateGraphql {
  grossInputTokens
  standardInputTokens
  cacheMissInputTokens
  cacheReadInputTokens
  cacheCreationInputTokens
  cacheCreation5mInputTokens
  cacheCreation1hInputTokens
  outputTokens
  reasoningOutputTokens
  billableOutputTokens
  totalTokens
  cacheReadInputTokenRate
  standardInputTokenRate
  cacheCreationInputTokenRate
  cacheState
  estimatedApiInputCost
  estimatedApiStandardInputCost
  estimatedApiCacheReadInputCost
  estimatedApiCacheCreationInputCost
  estimatedApiCacheCreation5mInputCost
  estimatedApiCacheCreation1hInputCost
  estimatedApiOutputCost
  estimatedApiReasoningOutputCost
  estimatedApiTotalCost
  currency
  apiCostStatus
  missingPriceDimensions
  pricingPolicyKey
  selectedPricingTierId
  usageReportCount
  updatedAt
  observedRuntimeKinds
  observedModelIdentifiers
  observedModelProviders
}
    `;
export const TokenUsageTaskStatisticsRowFieldsFragmentDoc = gql`
    fragment TokenUsageTaskStatisticsRowFields on TokenUsageTaskStatisticsRowGraphql {
  rowId
  rowKind
  runId
  taskId
  rootTeamRunId
  displayName
  summary
  createdAt
  createdTimeSource
  models
  modelDisplayNames
  runtimeKinds
  aggregate {
    ...TokenUsageCostSummaryAggregateFields
  }
}
    ${TokenUsageCostSummaryAggregateFieldsFragmentDoc}`;
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
      recoveryAction
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
export const SaveProviderApiKeyDocument = gql`
    mutation SaveProviderApiKey($providerId: String!, $apiKey: String!) {
  saveProviderApiKey(providerId: $providerId, apiKey: $apiKey)
}
    `;

/**
 * __useSaveProviderApiKeyMutation__
 *
 * To run a mutation, you first call `useSaveProviderApiKeyMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useSaveProviderApiKeyMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useSaveProviderApiKeyMutation({
 *   variables: {
 *     providerId: // value for 'providerId'
 *     apiKey: // value for 'apiKey'
 *   },
 * });
 */
export function useSaveProviderApiKeyMutation(options: VueApolloComposable.UseMutationOptions<SaveProviderApiKeyMutation, SaveProviderApiKeyMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<SaveProviderApiKeyMutation, SaveProviderApiKeyMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<SaveProviderApiKeyMutation, SaveProviderApiKeyMutationVariables>(SaveProviderApiKeyDocument, options);
}
export type SaveProviderApiKeyMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<SaveProviderApiKeyMutation, SaveProviderApiKeyMutationVariables>;
export const SaveQwenConfigurationDocument = gql`
    mutation SaveQwenConfiguration($input: QwenConfigurationInput!) {
  saveQwenConfiguration(input: $input) {
    effectiveBaseUrl
    endpointSource
    apiKeyConfigured
  }
}
    `;

/**
 * __useSaveQwenConfigurationMutation__
 *
 * To run a mutation, you first call `useSaveQwenConfigurationMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useSaveQwenConfigurationMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useSaveQwenConfigurationMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useSaveQwenConfigurationMutation(options: VueApolloComposable.UseMutationOptions<SaveQwenConfigurationMutation, SaveQwenConfigurationMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<SaveQwenConfigurationMutation, SaveQwenConfigurationMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<SaveQwenConfigurationMutation, SaveQwenConfigurationMutationVariables>(SaveQwenConfigurationDocument, options);
}
export type SaveQwenConfigurationMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<SaveQwenConfigurationMutation, SaveQwenConfigurationMutationVariables>;
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
export const ProbeCustomProviderDocument = gql`
    mutation ProbeCustomProvider($input: CustomProviderInputObject!) {
  probeCustomProvider(input: $input) {
    discoveredModels {
      id
      name
    }
  }
}
    `;

/**
 * __useProbeCustomProviderMutation__
 *
 * To run a mutation, you first call `useProbeCustomProviderMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useProbeCustomProviderMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useProbeCustomProviderMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useProbeCustomProviderMutation(options: VueApolloComposable.UseMutationOptions<ProbeCustomProviderMutation, ProbeCustomProviderMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<ProbeCustomProviderMutation, ProbeCustomProviderMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<ProbeCustomProviderMutation, ProbeCustomProviderMutationVariables>(ProbeCustomProviderDocument, options);
}
export type ProbeCustomProviderMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<ProbeCustomProviderMutation, ProbeCustomProviderMutationVariables>;
export const CreateCustomProviderDocument = gql`
    mutation CreateCustomProvider($input: CustomProviderInputObject!) {
  createCustomProvider(input: $input)
}
    `;

/**
 * __useCreateCustomProviderMutation__
 *
 * To run a mutation, you first call `useCreateCustomProviderMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useCreateCustomProviderMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useCreateCustomProviderMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useCreateCustomProviderMutation(options: VueApolloComposable.UseMutationOptions<CreateCustomProviderMutation, CreateCustomProviderMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<CreateCustomProviderMutation, CreateCustomProviderMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<CreateCustomProviderMutation, CreateCustomProviderMutationVariables>(CreateCustomProviderDocument, options);
}
export type CreateCustomProviderMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<CreateCustomProviderMutation, CreateCustomProviderMutationVariables>;
export const DeleteCustomProviderDocument = gql`
    mutation DeleteCustomProvider($providerId: String!) {
  deleteCustomProvider(providerId: $providerId)
}
    `;

/**
 * __useDeleteCustomProviderMutation__
 *
 * To run a mutation, you first call `useDeleteCustomProviderMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useDeleteCustomProviderMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useDeleteCustomProviderMutation({
 *   variables: {
 *     providerId: // value for 'providerId'
 *   },
 * });
 */
export function useDeleteCustomProviderMutation(options: VueApolloComposable.UseMutationOptions<DeleteCustomProviderMutation, DeleteCustomProviderMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<DeleteCustomProviderMutation, DeleteCustomProviderMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<DeleteCustomProviderMutation, DeleteCustomProviderMutationVariables>(DeleteCustomProviderDocument, options);
}
export type DeleteCustomProviderMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<DeleteCustomProviderMutation, DeleteCustomProviderMutationVariables>;
export const SaveGeminiAiStudioDocument = gql`
    mutation SaveGeminiAiStudio($apiKey: String!, $activateAfterSave: Boolean!) {
  saveGeminiAiStudio(apiKey: $apiKey, activateAfterSave: $activateAfterSave) {
    activeMode
    aiStudioConfigured
    vertexExpressConfigured
    vertexProject {
      project
      location
    }
  }
}
    `;

/**
 * __useSaveGeminiAiStudioMutation__
 *
 * To run a mutation, you first call `useSaveGeminiAiStudioMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useSaveGeminiAiStudioMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useSaveGeminiAiStudioMutation({
 *   variables: {
 *     apiKey: // value for 'apiKey'
 *     activateAfterSave: // value for 'activateAfterSave'
 *   },
 * });
 */
export function useSaveGeminiAiStudioMutation(options: VueApolloComposable.UseMutationOptions<SaveGeminiAiStudioMutation, SaveGeminiAiStudioMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<SaveGeminiAiStudioMutation, SaveGeminiAiStudioMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<SaveGeminiAiStudioMutation, SaveGeminiAiStudioMutationVariables>(SaveGeminiAiStudioDocument, options);
}
export type SaveGeminiAiStudioMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<SaveGeminiAiStudioMutation, SaveGeminiAiStudioMutationVariables>;
export const SaveGeminiVertexExpressDocument = gql`
    mutation SaveGeminiVertexExpress($apiKey: String!, $activateAfterSave: Boolean!) {
  saveGeminiVertexExpress(apiKey: $apiKey, activateAfterSave: $activateAfterSave) {
    activeMode
    aiStudioConfigured
    vertexExpressConfigured
    vertexProject {
      project
      location
    }
  }
}
    `;

/**
 * __useSaveGeminiVertexExpressMutation__
 *
 * To run a mutation, you first call `useSaveGeminiVertexExpressMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useSaveGeminiVertexExpressMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useSaveGeminiVertexExpressMutation({
 *   variables: {
 *     apiKey: // value for 'apiKey'
 *     activateAfterSave: // value for 'activateAfterSave'
 *   },
 * });
 */
export function useSaveGeminiVertexExpressMutation(options: VueApolloComposable.UseMutationOptions<SaveGeminiVertexExpressMutation, SaveGeminiVertexExpressMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<SaveGeminiVertexExpressMutation, SaveGeminiVertexExpressMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<SaveGeminiVertexExpressMutation, SaveGeminiVertexExpressMutationVariables>(SaveGeminiVertexExpressDocument, options);
}
export type SaveGeminiVertexExpressMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<SaveGeminiVertexExpressMutation, SaveGeminiVertexExpressMutationVariables>;
export const SaveGeminiVertexProjectDocument = gql`
    mutation SaveGeminiVertexProject($project: String!, $location: String!, $activateAfterSave: Boolean!) {
  saveGeminiVertexProject(
    project: $project
    location: $location
    activateAfterSave: $activateAfterSave
  ) {
    activeMode
    aiStudioConfigured
    vertexExpressConfigured
    vertexProject {
      project
      location
    }
  }
}
    `;

/**
 * __useSaveGeminiVertexProjectMutation__
 *
 * To run a mutation, you first call `useSaveGeminiVertexProjectMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useSaveGeminiVertexProjectMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useSaveGeminiVertexProjectMutation({
 *   variables: {
 *     project: // value for 'project'
 *     location: // value for 'location'
 *     activateAfterSave: // value for 'activateAfterSave'
 *   },
 * });
 */
export function useSaveGeminiVertexProjectMutation(options: VueApolloComposable.UseMutationOptions<SaveGeminiVertexProjectMutation, SaveGeminiVertexProjectMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<SaveGeminiVertexProjectMutation, SaveGeminiVertexProjectMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<SaveGeminiVertexProjectMutation, SaveGeminiVertexProjectMutationVariables>(SaveGeminiVertexProjectDocument, options);
}
export type SaveGeminiVertexProjectMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<SaveGeminiVertexProjectMutation, SaveGeminiVertexProjectMutationVariables>;
export const UseGeminiModeDocument = gql`
    mutation UseGeminiMode($mode: GeminiSetupMode!) {
  useGeminiMode(mode: $mode) {
    activeMode
    aiStudioConfigured
    vertexExpressConfigured
    vertexProject {
      project
      location
    }
  }
}
    `;

/**
 * __useUseGeminiModeMutation__
 *
 * To run a mutation, you first call `useUseGeminiModeMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useUseGeminiModeMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useUseGeminiModeMutation({
 *   variables: {
 *     mode: // value for 'mode'
 *   },
 * });
 */
export function useUseGeminiModeMutation(options: VueApolloComposable.UseMutationOptions<UseGeminiModeMutation, UseGeminiModeMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<UseGeminiModeMutation, UseGeminiModeMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<UseGeminiModeMutation, UseGeminiModeMutationVariables>(UseGeminiModeDocument, options);
}
export type UseGeminiModeMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<UseGeminiModeMutation, UseGeminiModeMutationVariables>;
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
export const UpdateMemoryHubConfigDocument = gql`
    mutation UpdateMemoryHubConfig($input: UpdateMemoryHubConfigInput!) {
  updateMemoryHubConfig(input: $input) {
    ...MemorySyncStatusFields
  }
}
    ${MemorySyncStatusFieldsFragmentDoc}`;

/**
 * __useUpdateMemoryHubConfigMutation__
 *
 * To run a mutation, you first call `useUpdateMemoryHubConfigMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useUpdateMemoryHubConfigMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useUpdateMemoryHubConfigMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useUpdateMemoryHubConfigMutation(options: VueApolloComposable.UseMutationOptions<UpdateMemoryHubConfigMutation, UpdateMemoryHubConfigMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<UpdateMemoryHubConfigMutation, UpdateMemoryHubConfigMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<UpdateMemoryHubConfigMutation, UpdateMemoryHubConfigMutationVariables>(UpdateMemoryHubConfigDocument, options);
}
export type UpdateMemoryHubConfigMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<UpdateMemoryHubConfigMutation, UpdateMemoryHubConfigMutationVariables>;
export const UpdateMemorySyncSourceConfigDocument = gql`
    mutation UpdateMemorySyncSourceConfig($input: UpdateMemorySyncSourceConfigInput!) {
  updateMemorySyncSourceConfig(input: $input) {
    ...MemorySyncStatusFields
  }
}
    ${MemorySyncStatusFieldsFragmentDoc}`;

/**
 * __useUpdateMemorySyncSourceConfigMutation__
 *
 * To run a mutation, you first call `useUpdateMemorySyncSourceConfigMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useUpdateMemorySyncSourceConfigMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useUpdateMemorySyncSourceConfigMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useUpdateMemorySyncSourceConfigMutation(options: VueApolloComposable.UseMutationOptions<UpdateMemorySyncSourceConfigMutation, UpdateMemorySyncSourceConfigMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<UpdateMemorySyncSourceConfigMutation, UpdateMemorySyncSourceConfigMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<UpdateMemorySyncSourceConfigMutation, UpdateMemorySyncSourceConfigMutationVariables>(UpdateMemorySyncSourceConfigDocument, options);
}
export type UpdateMemorySyncSourceConfigMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<UpdateMemorySyncSourceConfigMutation, UpdateMemorySyncSourceConfigMutationVariables>;
export const CreateMemoryHubSourceCredentialDocument = gql`
    mutation CreateMemoryHubSourceCredential($input: CreateMemoryHubCredentialInput) {
  createMemoryHubSourceCredential(input: $input) {
    plaintextToken
    credential {
      credentialId
      label
      boundSourceNodeId
      createdAt
      lastUsedAt
      revokedAt
      status
    }
  }
}
    `;

/**
 * __useCreateMemoryHubSourceCredentialMutation__
 *
 * To run a mutation, you first call `useCreateMemoryHubSourceCredentialMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useCreateMemoryHubSourceCredentialMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useCreateMemoryHubSourceCredentialMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useCreateMemoryHubSourceCredentialMutation(options: VueApolloComposable.UseMutationOptions<CreateMemoryHubSourceCredentialMutation, CreateMemoryHubSourceCredentialMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<CreateMemoryHubSourceCredentialMutation, CreateMemoryHubSourceCredentialMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<CreateMemoryHubSourceCredentialMutation, CreateMemoryHubSourceCredentialMutationVariables>(CreateMemoryHubSourceCredentialDocument, options);
}
export type CreateMemoryHubSourceCredentialMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<CreateMemoryHubSourceCredentialMutation, CreateMemoryHubSourceCredentialMutationVariables>;
export const RegenerateMemoryHubSourceCredentialDocument = gql`
    mutation RegenerateMemoryHubSourceCredential($credentialId: String!) {
  regenerateMemoryHubSourceCredential(credentialId: $credentialId) {
    plaintextToken
    credential {
      credentialId
      label
      boundSourceNodeId
      createdAt
      lastUsedAt
      revokedAt
      status
    }
  }
}
    `;

/**
 * __useRegenerateMemoryHubSourceCredentialMutation__
 *
 * To run a mutation, you first call `useRegenerateMemoryHubSourceCredentialMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useRegenerateMemoryHubSourceCredentialMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useRegenerateMemoryHubSourceCredentialMutation({
 *   variables: {
 *     credentialId: // value for 'credentialId'
 *   },
 * });
 */
export function useRegenerateMemoryHubSourceCredentialMutation(options: VueApolloComposable.UseMutationOptions<RegenerateMemoryHubSourceCredentialMutation, RegenerateMemoryHubSourceCredentialMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<RegenerateMemoryHubSourceCredentialMutation, RegenerateMemoryHubSourceCredentialMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<RegenerateMemoryHubSourceCredentialMutation, RegenerateMemoryHubSourceCredentialMutationVariables>(RegenerateMemoryHubSourceCredentialDocument, options);
}
export type RegenerateMemoryHubSourceCredentialMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<RegenerateMemoryHubSourceCredentialMutation, RegenerateMemoryHubSourceCredentialMutationVariables>;
export const RevokeMemoryHubSourceCredentialDocument = gql`
    mutation RevokeMemoryHubSourceCredential($credentialId: String!) {
  revokeMemoryHubSourceCredential(credentialId: $credentialId) {
    credentialId
    label
    boundSourceNodeId
    createdAt
    lastUsedAt
    revokedAt
    status
  }
}
    `;

/**
 * __useRevokeMemoryHubSourceCredentialMutation__
 *
 * To run a mutation, you first call `useRevokeMemoryHubSourceCredentialMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useRevokeMemoryHubSourceCredentialMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useRevokeMemoryHubSourceCredentialMutation({
 *   variables: {
 *     credentialId: // value for 'credentialId'
 *   },
 * });
 */
export function useRevokeMemoryHubSourceCredentialMutation(options: VueApolloComposable.UseMutationOptions<RevokeMemoryHubSourceCredentialMutation, RevokeMemoryHubSourceCredentialMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<RevokeMemoryHubSourceCredentialMutation, RevokeMemoryHubSourceCredentialMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<RevokeMemoryHubSourceCredentialMutation, RevokeMemoryHubSourceCredentialMutationVariables>(RevokeMemoryHubSourceCredentialDocument, options);
}
export type RevokeMemoryHubSourceCredentialMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<RevokeMemoryHubSourceCredentialMutation, RevokeMemoryHubSourceCredentialMutationVariables>;
export const TestMemoryHubConnectionDocument = gql`
    mutation TestMemoryHubConnection($input: TestMemoryHubConnectionInput!) {
  testMemoryHubConnection(input: $input) {
    ok
    hubEnabled
    sourceNodeId
    authenticated
    message
  }
}
    `;

/**
 * __useTestMemoryHubConnectionMutation__
 *
 * To run a mutation, you first call `useTestMemoryHubConnectionMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useTestMemoryHubConnectionMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useTestMemoryHubConnectionMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useTestMemoryHubConnectionMutation(options: VueApolloComposable.UseMutationOptions<TestMemoryHubConnectionMutation, TestMemoryHubConnectionMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<TestMemoryHubConnectionMutation, TestMemoryHubConnectionMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<TestMemoryHubConnectionMutation, TestMemoryHubConnectionMutationVariables>(TestMemoryHubConnectionDocument, options);
}
export type TestMemoryHubConnectionMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<TestMemoryHubConnectionMutation, TestMemoryHubConnectionMutationVariables>;
export const StartMemorySyncDocument = gql`
    mutation StartMemorySync {
  startMemorySync {
    startedAt
    finishedAt
    scannedFiles
    changedFiles
    unchangedFiles
    deferredFiles
    committedBatches
    duplicateBatches
  }
}
    `;

/**
 * __useStartMemorySyncMutation__
 *
 * To run a mutation, you first call `useStartMemorySyncMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useStartMemorySyncMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useStartMemorySyncMutation();
 */
export function useStartMemorySyncMutation(options: VueApolloComposable.UseMutationOptions<StartMemorySyncMutation, StartMemorySyncMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<StartMemorySyncMutation, StartMemorySyncMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<StartMemorySyncMutation, StartMemorySyncMutationVariables>(StartMemorySyncDocument, options);
}
export type StartMemorySyncMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<StartMemorySyncMutation, StartMemorySyncMutationVariables>;
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
    mutation SetSearchConfig($provider: String!, $serperApiKey: String, $serpapiApiKey: String, $vertexAiSearchApiKey: String, $vertexAiSearchServingConfig: String) {
  setSearchConfig(
    provider: $provider
    serperApiKey: $serperApiKey
    serpapiApiKey: $serpapiApiKey
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
 *     vertexAiSearchApiKey: // value for 'vertexAiSearchApiKey'
 *     vertexAiSearchServingConfig: // value for 'vertexAiSearchServingConfig'
 *   },
 * });
 */
export function useSetSearchConfigMutation(options: VueApolloComposable.UseMutationOptions<SetSearchConfigMutation, SetSearchConfigMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<SetSearchConfigMutation, SetSearchConfigMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<SetSearchConfigMutation, SetSearchConfigMutationVariables>(SetSearchConfigDocument, options);
}
export type SetSearchConfigMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<SetSearchConfigMutation, SetSearchConfigMutationVariables>;
export const SetSkillImprovementEnabledDocument = gql`
    mutation SetSkillImprovementEnabled($enabled: Boolean!) {
  setSkillImprovementEnabled(enabled: $enabled) {
    ...SkillImprovementCapabilityFields
  }
}
    ${SkillImprovementCapabilityFieldsFragmentDoc}`;

/**
 * __useSetSkillImprovementEnabledMutation__
 *
 * To run a mutation, you first call `useSetSkillImprovementEnabledMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useSetSkillImprovementEnabledMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useSetSkillImprovementEnabledMutation({
 *   variables: {
 *     enabled: // value for 'enabled'
 *   },
 * });
 */
export function useSetSkillImprovementEnabledMutation(options: VueApolloComposable.UseMutationOptions<SetSkillImprovementEnabledMutation, SetSkillImprovementEnabledMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<SetSkillImprovementEnabledMutation, SetSkillImprovementEnabledMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<SetSkillImprovementEnabledMutation, SetSkillImprovementEnabledMutationVariables>(SetSkillImprovementEnabledDocument, options);
}
export type SetSkillImprovementEnabledMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<SetSkillImprovementEnabledMutation, SetSkillImprovementEnabledMutationVariables>;
export const StartAgentRunSkillImprovementDocument = gql`
    mutation StartAgentRunSkillImprovement($input: StartAgentRunSkillImprovementInput!) {
  startAgentRunSkillImprovement(input: $input) {
    improvementRunId
    improverRunId
    record {
      ...SkillImprovementRunRecordSummaryFields
    }
  }
}
    ${SkillImprovementRunRecordSummaryFieldsFragmentDoc}`;

/**
 * __useStartAgentRunSkillImprovementMutation__
 *
 * To run a mutation, you first call `useStartAgentRunSkillImprovementMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useStartAgentRunSkillImprovementMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useStartAgentRunSkillImprovementMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useStartAgentRunSkillImprovementMutation(options: VueApolloComposable.UseMutationOptions<StartAgentRunSkillImprovementMutation, StartAgentRunSkillImprovementMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<StartAgentRunSkillImprovementMutation, StartAgentRunSkillImprovementMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<StartAgentRunSkillImprovementMutation, StartAgentRunSkillImprovementMutationVariables>(StartAgentRunSkillImprovementDocument, options);
}
export type StartAgentRunSkillImprovementMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<StartAgentRunSkillImprovementMutation, StartAgentRunSkillImprovementMutationVariables>;
export const StartTeamMemberSkillImprovementDocument = gql`
    mutation StartTeamMemberSkillImprovement($input: StartTeamMemberSkillImprovementInput!) {
  startTeamMemberSkillImprovement(input: $input) {
    improvementRunId
    improverRunId
    record {
      ...SkillImprovementRunRecordSummaryFields
    }
  }
}
    ${SkillImprovementRunRecordSummaryFieldsFragmentDoc}`;

/**
 * __useStartTeamMemberSkillImprovementMutation__
 *
 * To run a mutation, you first call `useStartTeamMemberSkillImprovementMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useStartTeamMemberSkillImprovementMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useStartTeamMemberSkillImprovementMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useStartTeamMemberSkillImprovementMutation(options: VueApolloComposable.UseMutationOptions<StartTeamMemberSkillImprovementMutation, StartTeamMemberSkillImprovementMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<StartTeamMemberSkillImprovementMutation, StartTeamMemberSkillImprovementMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<StartTeamMemberSkillImprovementMutation, StartTeamMemberSkillImprovementMutationVariables>(StartTeamMemberSkillImprovementDocument, options);
}
export type StartTeamMemberSkillImprovementMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<StartTeamMemberSkillImprovementMutation, StartTeamMemberSkillImprovementMutationVariables>;
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
export const RemoveWorkspaceDocument = gql`
    mutation RemoveWorkspace($input: RemoveWorkspaceInput!) {
  removeWorkspace(input: $input) {
    success
    message
    workspaceId
    workspaceRootPath
  }
}
    `;

/**
 * __useRemoveWorkspaceMutation__
 *
 * To run a mutation, you first call `useRemoveWorkspaceMutation` within a Vue component and pass it any options that fit your needs.
 * When your component renders, `useRemoveWorkspaceMutation` returns an object that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - Several other properties: https://v4.apollo.vuejs.org/api/use-mutation.html#return
 *
 * @param options that will be passed into the mutation, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/mutation.html#options;
 *
 * @example
 * const { mutate, loading, error, onDone } = useRemoveWorkspaceMutation({
 *   variables: {
 *     input: // value for 'input'
 *   },
 * });
 */
export function useRemoveWorkspaceMutation(options: VueApolloComposable.UseMutationOptions<RemoveWorkspaceMutation, RemoveWorkspaceMutationVariables> | ReactiveFunction<VueApolloComposable.UseMutationOptions<RemoveWorkspaceMutation, RemoveWorkspaceMutationVariables>> = {}) {
  return VueApolloComposable.useMutation<RemoveWorkspaceMutation, RemoveWorkspaceMutationVariables>(RemoveWorkspaceDocument, options);
}
export type RemoveWorkspaceMutationCompositionFunctionResult = VueApolloComposable.UseMutationReturn<RemoveWorkspaceMutation, RemoveWorkspaceMutationVariables>;
export const GetAgentCustomizationOptionsDocument = gql`
    query GetAgentCustomizationOptions {
  availableToolNames
  availableOptionalInputProcessorNames
  availableOptionalLlmResponseProcessorNames
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
    recoveryAction
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
export const GetProviderSettingsDocument = gql`
    query GetProviderSettings($runtimeKind: String) {
  providerSettings(runtimeKind: $runtimeKind) {
    provider {
      id
      name
      providerType
      isCustom
      baseUrl
      apiKeyConfigured
      status
      statusMessage
    }
    llmModels {
      modelIdentifier
      name
      providerType
    }
    audioModels {
      modelIdentifier
      name
      providerType
    }
    imageModels {
      modelIdentifier
      name
      providerType
    }
    videoModels {
      modelIdentifier
      name
      providerType
    }
  }
}
    `;

/**
 * __useGetProviderSettingsQuery__
 *
 * To run a query within a Vue component, call `useGetProviderSettingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetProviderSettingsQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetProviderSettingsQuery({
 *   runtimeKind: // value for 'runtimeKind'
 * });
 */
export function useGetProviderSettingsQuery(variables: GetProviderSettingsQueryVariables | VueCompositionApi.Ref<GetProviderSettingsQueryVariables> | ReactiveFunction<GetProviderSettingsQueryVariables> = {}, options: VueApolloComposable.UseQueryOptions<GetProviderSettingsQuery, GetProviderSettingsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetProviderSettingsQuery, GetProviderSettingsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetProviderSettingsQuery, GetProviderSettingsQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetProviderSettingsQuery, GetProviderSettingsQueryVariables>(GetProviderSettingsDocument, variables, options);
}
export function useGetProviderSettingsLazyQuery(variables: GetProviderSettingsQueryVariables | VueCompositionApi.Ref<GetProviderSettingsQueryVariables> | ReactiveFunction<GetProviderSettingsQueryVariables> = {}, options: VueApolloComposable.UseQueryOptions<GetProviderSettingsQuery, GetProviderSettingsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetProviderSettingsQuery, GetProviderSettingsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetProviderSettingsQuery, GetProviderSettingsQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetProviderSettingsQuery, GetProviderSettingsQueryVariables>(GetProviderSettingsDocument, variables, options);
}
export type GetProviderSettingsQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetProviderSettingsQuery, GetProviderSettingsQueryVariables>;
export const GetAvailableLlmProvidersWithModelsDocument = gql`
    query GetAvailableLLMProvidersWithModels($runtimeKind: String) {
  availableLlmProvidersWithModels(runtimeKind: $runtimeKind) {
    provider {
      id
      name
      providerType
      isCustom
      baseUrl
      status
      statusMessage
    }
    models {
      modelIdentifier
      name
      description
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
      metadataProvenance
    }
  }
  availableAudioProvidersWithModels(runtimeKind: $runtimeKind) {
    provider {
      id
      name
      providerType
      isCustom
      baseUrl
      status
      statusMessage
    }
    models {
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
    provider {
      id
      name
      providerType
      isCustom
      baseUrl
      status
      statusMessage
    }
    models {
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
  availableVideoProvidersWithModels(runtimeKind: $runtimeKind) {
    provider {
      id
      name
      providerType
      isCustom
      baseUrl
      status
      statusMessage
    }
    models {
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
    activeMode
    aiStudioConfigured
    vertexExpressConfigured
    vertexProject {
      project
      location
    }
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
export const GetQwenSetupStatusDocument = gql`
    query GetQwenSetupStatus {
  qwenSetupStatus {
    effectiveBaseUrl
    endpointSource
    apiKeyConfigured
  }
}
    `;

/**
 * __useGetQwenSetupStatusQuery__
 *
 * To run a query within a Vue component, call `useGetQwenSetupStatusQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetQwenSetupStatusQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetQwenSetupStatusQuery();
 */
export function useGetQwenSetupStatusQuery(options: VueApolloComposable.UseQueryOptions<GetQwenSetupStatusQuery, GetQwenSetupStatusQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetQwenSetupStatusQuery, GetQwenSetupStatusQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetQwenSetupStatusQuery, GetQwenSetupStatusQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetQwenSetupStatusQuery, GetQwenSetupStatusQueryVariables>(GetQwenSetupStatusDocument, {}, options);
}
export function useGetQwenSetupStatusLazyQuery(options: VueApolloComposable.UseQueryOptions<GetQwenSetupStatusQuery, GetQwenSetupStatusQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetQwenSetupStatusQuery, GetQwenSetupStatusQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetQwenSetupStatusQuery, GetQwenSetupStatusQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetQwenSetupStatusQuery, GetQwenSetupStatusQueryVariables>(GetQwenSetupStatusDocument, {}, options);
}
export type GetQwenSetupStatusQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetQwenSetupStatusQuery, GetQwenSetupStatusQueryVariables>;
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
export const ListMemoryExplorerSourcesDocument = gql`
    query ListMemoryExplorerSources {
  listMemoryExplorerSources {
    key
    type
    label
    sourceNodeId
    displayName
    readOnly
    lastImportedAt
    lastSyncStatus
  }
}
    `;

/**
 * __useListMemoryExplorerSourcesQuery__
 *
 * To run a query within a Vue component, call `useListMemoryExplorerSourcesQuery` and pass it any options that fit your needs.
 * When your component renders, `useListMemoryExplorerSourcesQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useListMemoryExplorerSourcesQuery();
 */
export function useListMemoryExplorerSourcesQuery(options: VueApolloComposable.UseQueryOptions<ListMemoryExplorerSourcesQuery, ListMemoryExplorerSourcesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ListMemoryExplorerSourcesQuery, ListMemoryExplorerSourcesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ListMemoryExplorerSourcesQuery, ListMemoryExplorerSourcesQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<ListMemoryExplorerSourcesQuery, ListMemoryExplorerSourcesQueryVariables>(ListMemoryExplorerSourcesDocument, {}, options);
}
export function useListMemoryExplorerSourcesLazyQuery(options: VueApolloComposable.UseQueryOptions<ListMemoryExplorerSourcesQuery, ListMemoryExplorerSourcesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ListMemoryExplorerSourcesQuery, ListMemoryExplorerSourcesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ListMemoryExplorerSourcesQuery, ListMemoryExplorerSourcesQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<ListMemoryExplorerSourcesQuery, ListMemoryExplorerSourcesQueryVariables>(ListMemoryExplorerSourcesDocument, {}, options);
}
export type ListMemoryExplorerSourcesQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<ListMemoryExplorerSourcesQuery, ListMemoryExplorerSourcesQueryVariables>;
export const ListAgentsWithMemoryDocument = gql`
    query ListAgentsWithMemory($source: MemoryExplorerSourceInput, $search: String, $page: Int, $pageSize: Int) {
  listAgentsWithMemory(
    source: $source
    search: $search
    page: $page
    pageSize: $pageSize
  ) {
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
 *   source: // value for 'source'
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
    query ListAgentRunsWithMemory($selector: AgentWithMemorySelectorInput!, $source: MemoryExplorerSourceInput, $search: String, $page: Int, $pageSize: Int) {
  listAgentRunsWithMemory(
    selector: $selector
    source: $source
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
 *   source: // value for 'source'
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
    query ListAgentTeamsWithMemory($source: MemoryExplorerSourceInput, $search: String, $page: Int, $pageSize: Int) {
  listAgentTeamsWithMemory(
    source: $source
    search: $search
    page: $page
    pageSize: $pageSize
  ) {
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
 *   source: // value for 'source'
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
    query ListAgentTeamRunsWithMemory($teamDefinitionId: String!, $source: MemoryExplorerSourceInput, $search: String, $page: Int, $pageSize: Int) {
  listAgentTeamRunsWithMemory(
    teamDefinitionId: $teamDefinitionId
    source: $source
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
        memberAddress
        displayName
        agentRunId
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
 *   source: // value for 'source'
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
export const GetMemorySyncStatusDocument = gql`
    query GetMemorySyncStatus {
  getMemorySyncStatus {
    hub {
      enabled
      advertisedHubBaseUrl
      updatedAt
    }
    source {
      enabled
      sourceNodeId
      displayName
      hubBaseUrl
      hubTokenConfigured
      hubTokenPreview
      backgroundEnabled
      intervalMs
      batchSize
      updatedAt
    }
    connectionInfo {
      hubEnabled
      advertisedHubBaseUrl
      ingestEndpointUrl
      healthEndpointUrl
      secureTransportWarning
      credentials {
        credentialId
        label
        boundSourceNodeId
        createdAt
        lastUsedAt
        revokedAt
        status
      }
    }
    sourceState {
      jobState
      lastSuccessfulSyncAt
      lastError
      trackedFileCount
    }
    imports {
      sourceNodeId
      displayName
      lastKnownEndpoint
      firstImportedAt
      lastImportedAt
      lastSyncStatus
      lastError
      fileCount
      totalBytes
      lastCommittedBatchId
      lastCommittedAt
    }
    oneTimePlaintextToken
  }
}
    `;

/**
 * __useGetMemorySyncStatusQuery__
 *
 * To run a query within a Vue component, call `useGetMemorySyncStatusQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMemorySyncStatusQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetMemorySyncStatusQuery();
 */
export function useGetMemorySyncStatusQuery(options: VueApolloComposable.UseQueryOptions<GetMemorySyncStatusQuery, GetMemorySyncStatusQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetMemorySyncStatusQuery, GetMemorySyncStatusQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetMemorySyncStatusQuery, GetMemorySyncStatusQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetMemorySyncStatusQuery, GetMemorySyncStatusQueryVariables>(GetMemorySyncStatusDocument, {}, options);
}
export function useGetMemorySyncStatusLazyQuery(options: VueApolloComposable.UseQueryOptions<GetMemorySyncStatusQuery, GetMemorySyncStatusQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetMemorySyncStatusQuery, GetMemorySyncStatusQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetMemorySyncStatusQuery, GetMemorySyncStatusQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetMemorySyncStatusQuery, GetMemorySyncStatusQueryVariables>(GetMemorySyncStatusDocument, {}, options);
}
export type GetMemorySyncStatusQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetMemorySyncStatusQuery, GetMemorySyncStatusQueryVariables>;
export const ListMemoryHubUrlCandidatesDocument = gql`
    query ListMemoryHubUrlCandidates($currentNodeBaseUrl: String, $manualBaseUrl: String) {
  listMemoryHubUrlCandidates(
    currentNodeBaseUrl: $currentNodeBaseUrl
    manualBaseUrl: $manualBaseUrl
  ) {
    id
    kind
    label
    baseUrl
    source
  }
}
    `;

/**
 * __useListMemoryHubUrlCandidatesQuery__
 *
 * To run a query within a Vue component, call `useListMemoryHubUrlCandidatesQuery` and pass it any options that fit your needs.
 * When your component renders, `useListMemoryHubUrlCandidatesQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useListMemoryHubUrlCandidatesQuery({
 *   currentNodeBaseUrl: // value for 'currentNodeBaseUrl'
 *   manualBaseUrl: // value for 'manualBaseUrl'
 * });
 */
export function useListMemoryHubUrlCandidatesQuery(variables: ListMemoryHubUrlCandidatesQueryVariables | VueCompositionApi.Ref<ListMemoryHubUrlCandidatesQueryVariables> | ReactiveFunction<ListMemoryHubUrlCandidatesQueryVariables> = {}, options: VueApolloComposable.UseQueryOptions<ListMemoryHubUrlCandidatesQuery, ListMemoryHubUrlCandidatesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ListMemoryHubUrlCandidatesQuery, ListMemoryHubUrlCandidatesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ListMemoryHubUrlCandidatesQuery, ListMemoryHubUrlCandidatesQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<ListMemoryHubUrlCandidatesQuery, ListMemoryHubUrlCandidatesQueryVariables>(ListMemoryHubUrlCandidatesDocument, variables, options);
}
export function useListMemoryHubUrlCandidatesLazyQuery(variables: ListMemoryHubUrlCandidatesQueryVariables | VueCompositionApi.Ref<ListMemoryHubUrlCandidatesQueryVariables> | ReactiveFunction<ListMemoryHubUrlCandidatesQueryVariables> = {}, options: VueApolloComposable.UseQueryOptions<ListMemoryHubUrlCandidatesQuery, ListMemoryHubUrlCandidatesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<ListMemoryHubUrlCandidatesQuery, ListMemoryHubUrlCandidatesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<ListMemoryHubUrlCandidatesQuery, ListMemoryHubUrlCandidatesQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<ListMemoryHubUrlCandidatesQuery, ListMemoryHubUrlCandidatesQueryVariables>(ListMemoryHubUrlCandidatesDocument, variables, options);
}
export type ListMemoryHubUrlCandidatesQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<ListMemoryHubUrlCandidatesQuery, ListMemoryHubUrlCandidatesQueryVariables>;
export const GetMemoryHubConnectionInfoDocument = gql`
    query GetMemoryHubConnectionInfo {
  getMemoryHubConnectionInfo {
    hubEnabled
    advertisedHubBaseUrl
    ingestEndpointUrl
    healthEndpointUrl
    secureTransportWarning
    credentials {
      credentialId
      label
      boundSourceNodeId
      createdAt
      lastUsedAt
      revokedAt
      status
    }
  }
}
    `;

/**
 * __useGetMemoryHubConnectionInfoQuery__
 *
 * To run a query within a Vue component, call `useGetMemoryHubConnectionInfoQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMemoryHubConnectionInfoQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetMemoryHubConnectionInfoQuery();
 */
export function useGetMemoryHubConnectionInfoQuery(options: VueApolloComposable.UseQueryOptions<GetMemoryHubConnectionInfoQuery, GetMemoryHubConnectionInfoQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetMemoryHubConnectionInfoQuery, GetMemoryHubConnectionInfoQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetMemoryHubConnectionInfoQuery, GetMemoryHubConnectionInfoQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetMemoryHubConnectionInfoQuery, GetMemoryHubConnectionInfoQueryVariables>(GetMemoryHubConnectionInfoDocument, {}, options);
}
export function useGetMemoryHubConnectionInfoLazyQuery(options: VueApolloComposable.UseQueryOptions<GetMemoryHubConnectionInfoQuery, GetMemoryHubConnectionInfoQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetMemoryHubConnectionInfoQuery, GetMemoryHubConnectionInfoQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetMemoryHubConnectionInfoQuery, GetMemoryHubConnectionInfoQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetMemoryHubConnectionInfoQuery, GetMemoryHubConnectionInfoQueryVariables>(GetMemoryHubConnectionInfoDocument, {}, options);
}
export type GetMemoryHubConnectionInfoQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetMemoryHubConnectionInfoQuery, GetMemoryHubConnectionInfoQueryVariables>;
export const GetAgentRunMemoryViewDocument = gql`
    query GetAgentRunMemoryView($runId: String!, $source: MemoryExplorerSourceInput, $includeWorkingContext: Boolean, $includeEpisodic: Boolean, $includeSemantic: Boolean, $includeRawTraces: Boolean, $includeRawTraceFiles: Boolean, $includeArchive: Boolean, $rawTraceLimit: Int, $rawTraceFileName: String) {
  getAgentRunMemoryView(
    runId: $runId
    source: $source
    includeWorkingContext: $includeWorkingContext
    includeEpisodic: $includeEpisodic
    includeSemantic: $includeSemantic
    includeRawTraces: $includeRawTraces
    includeRawTraceFiles: $includeRawTraceFiles
    includeArchive: $includeArchive
    rawTraceLimit: $rawTraceLimit
    rawTraceFileName: $rawTraceFileName
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
    rawTraceFiles {
      fileName
      kind
      recordCount
      segmentIndex
      firstTimestamp
      lastTimestamp
    }
    selectedRawTraceFileName
    rawTraces {
      scope
      id
      traceType
      sourceEvent
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
 *   source: // value for 'source'
 *   includeWorkingContext: // value for 'includeWorkingContext'
 *   includeEpisodic: // value for 'includeEpisodic'
 *   includeSemantic: // value for 'includeSemantic'
 *   includeRawTraces: // value for 'includeRawTraces'
 *   includeRawTraceFiles: // value for 'includeRawTraceFiles'
 *   includeArchive: // value for 'includeArchive'
 *   rawTraceLimit: // value for 'rawTraceLimit'
 *   rawTraceFileName: // value for 'rawTraceFileName'
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
    query GetTeamMemberRunMemoryView($teamRunId: String!, $agentRunId: String!, $source: MemoryExplorerSourceInput, $includeWorkingContext: Boolean, $includeEpisodic: Boolean, $includeSemantic: Boolean, $includeRawTraces: Boolean, $includeRawTraceFiles: Boolean, $includeArchive: Boolean, $rawTraceLimit: Int, $rawTraceFileName: String) {
  getTeamMemberRunMemoryView(
    teamRunId: $teamRunId
    agentRunId: $agentRunId
    source: $source
    includeWorkingContext: $includeWorkingContext
    includeEpisodic: $includeEpisodic
    includeSemantic: $includeSemantic
    includeRawTraces: $includeRawTraces
    includeRawTraceFiles: $includeRawTraceFiles
    includeArchive: $includeArchive
    rawTraceLimit: $rawTraceLimit
    rawTraceFileName: $rawTraceFileName
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
    rawTraceFiles {
      fileName
      kind
      recordCount
      segmentIndex
      firstTimestamp
      lastTimestamp
    }
    selectedRawTraceFileName
    rawTraces {
      scope
      id
      traceType
      sourceEvent
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
 *   agentRunId: // value for 'agentRunId'
 *   source: // value for 'source'
 *   includeWorkingContext: // value for 'includeWorkingContext'
 *   includeEpisodic: // value for 'includeEpisodic'
 *   includeSemantic: // value for 'includeSemantic'
 *   includeRawTraces: // value for 'includeRawTraces'
 *   includeRawTraceFiles: // value for 'includeRawTraceFiles'
 *   includeArchive: // value for 'includeArchive'
 *   rawTraceLimit: // value for 'rawTraceLimit'
 *   rawTraceFileName: // value for 'rawTraceFileName'
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
        coordinatorAddress
        workspaceRootPath
        summary
        createdAt
        archivedAt
        terminatedAt
        isActive
        rootTeam
        members {
          memberAddress
          displayName
          agentRunId
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
export const GetWorkspaceRunHistoryDocument = gql`
    query GetWorkspaceRunHistory($workspaceId: String!, $limitPerAgent: Int = 6) {
  workspaceRunHistory(workspaceId: $workspaceId, limitPerAgent: $limitPerAgent) {
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
        coordinatorAddress
        workspaceRootPath
        summary
        createdAt
        archivedAt
        terminatedAt
        isActive
        rootTeam
        members {
          memberAddress
          displayName
          agentRunId
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
 * __useGetWorkspaceRunHistoryQuery__
 *
 * To run a query within a Vue component, call `useGetWorkspaceRunHistoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetWorkspaceRunHistoryQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetWorkspaceRunHistoryQuery({
 *   workspaceId: // value for 'workspaceId'
 *   limitPerAgent: // value for 'limitPerAgent'
 * });
 */
export function useGetWorkspaceRunHistoryQuery(variables: GetWorkspaceRunHistoryQueryVariables | VueCompositionApi.Ref<GetWorkspaceRunHistoryQueryVariables> | ReactiveFunction<GetWorkspaceRunHistoryQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetWorkspaceRunHistoryQuery, GetWorkspaceRunHistoryQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetWorkspaceRunHistoryQuery, GetWorkspaceRunHistoryQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetWorkspaceRunHistoryQuery, GetWorkspaceRunHistoryQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetWorkspaceRunHistoryQuery, GetWorkspaceRunHistoryQueryVariables>(GetWorkspaceRunHistoryDocument, variables, options);
}
export function useGetWorkspaceRunHistoryLazyQuery(variables?: GetWorkspaceRunHistoryQueryVariables | VueCompositionApi.Ref<GetWorkspaceRunHistoryQueryVariables> | ReactiveFunction<GetWorkspaceRunHistoryQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetWorkspaceRunHistoryQuery, GetWorkspaceRunHistoryQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetWorkspaceRunHistoryQuery, GetWorkspaceRunHistoryQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetWorkspaceRunHistoryQuery, GetWorkspaceRunHistoryQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetWorkspaceRunHistoryQuery, GetWorkspaceRunHistoryQueryVariables>(GetWorkspaceRunHistoryDocument, variables, options);
}
export type GetWorkspaceRunHistoryQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetWorkspaceRunHistoryQuery, GetWorkspaceRunHistoryQueryVariables>;
export const GetRunProjectionDocument = gql`
    query GetRunProjection($runId: String!) {
  getRunProjection(runId: $runId) {
    runId
    summary
    lastActivityAt
    conversation
    activities
    hasEarlierActiveTraceEvents
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
export const GetRunEventMonitorActiveTracePageDocument = gql`
    query GetRunEventMonitorActiveTracePage($runId: String!, $beforeCursor: String) {
  getRunEventMonitorActiveTracePage(runId: $runId, beforeCursor: $beforeCursor) {
    ...EventMonitorActiveTracePageFields
  }
}
    ${EventMonitorActiveTracePageFieldsFragmentDoc}`;

/**
 * __useGetRunEventMonitorActiveTracePageQuery__
 *
 * To run a query within a Vue component, call `useGetRunEventMonitorActiveTracePageQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetRunEventMonitorActiveTracePageQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetRunEventMonitorActiveTracePageQuery({
 *   runId: // value for 'runId'
 *   beforeCursor: // value for 'beforeCursor'
 * });
 */
export function useGetRunEventMonitorActiveTracePageQuery(variables: GetRunEventMonitorActiveTracePageQueryVariables | VueCompositionApi.Ref<GetRunEventMonitorActiveTracePageQueryVariables> | ReactiveFunction<GetRunEventMonitorActiveTracePageQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetRunEventMonitorActiveTracePageQuery, GetRunEventMonitorActiveTracePageQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetRunEventMonitorActiveTracePageQuery, GetRunEventMonitorActiveTracePageQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetRunEventMonitorActiveTracePageQuery, GetRunEventMonitorActiveTracePageQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetRunEventMonitorActiveTracePageQuery, GetRunEventMonitorActiveTracePageQueryVariables>(GetRunEventMonitorActiveTracePageDocument, variables, options);
}
export function useGetRunEventMonitorActiveTracePageLazyQuery(variables?: GetRunEventMonitorActiveTracePageQueryVariables | VueCompositionApi.Ref<GetRunEventMonitorActiveTracePageQueryVariables> | ReactiveFunction<GetRunEventMonitorActiveTracePageQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetRunEventMonitorActiveTracePageQuery, GetRunEventMonitorActiveTracePageQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetRunEventMonitorActiveTracePageQuery, GetRunEventMonitorActiveTracePageQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetRunEventMonitorActiveTracePageQuery, GetRunEventMonitorActiveTracePageQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetRunEventMonitorActiveTracePageQuery, GetRunEventMonitorActiveTracePageQueryVariables>(GetRunEventMonitorActiveTracePageDocument, variables, options);
}
export type GetRunEventMonitorActiveTracePageQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetRunEventMonitorActiveTracePageQuery, GetRunEventMonitorActiveTracePageQueryVariables>;
export const GetTeamMemberEventMonitorActiveTracePageDocument = gql`
    query GetTeamMemberEventMonitorActiveTracePage($teamRunId: String!, $agentRunId: String!, $beforeCursor: String) {
  getTeamMemberEventMonitorActiveTracePage(
    teamRunId: $teamRunId
    agentRunId: $agentRunId
    beforeCursor: $beforeCursor
  ) {
    ...EventMonitorActiveTracePageFields
  }
}
    ${EventMonitorActiveTracePageFieldsFragmentDoc}`;

/**
 * __useGetTeamMemberEventMonitorActiveTracePageQuery__
 *
 * To run a query within a Vue component, call `useGetTeamMemberEventMonitorActiveTracePageQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTeamMemberEventMonitorActiveTracePageQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetTeamMemberEventMonitorActiveTracePageQuery({
 *   teamRunId: // value for 'teamRunId'
 *   agentRunId: // value for 'agentRunId'
 *   beforeCursor: // value for 'beforeCursor'
 * });
 */
export function useGetTeamMemberEventMonitorActiveTracePageQuery(variables: GetTeamMemberEventMonitorActiveTracePageQueryVariables | VueCompositionApi.Ref<GetTeamMemberEventMonitorActiveTracePageQueryVariables> | ReactiveFunction<GetTeamMemberEventMonitorActiveTracePageQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTeamMemberEventMonitorActiveTracePageQuery, GetTeamMemberEventMonitorActiveTracePageQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTeamMemberEventMonitorActiveTracePageQuery, GetTeamMemberEventMonitorActiveTracePageQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTeamMemberEventMonitorActiveTracePageQuery, GetTeamMemberEventMonitorActiveTracePageQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetTeamMemberEventMonitorActiveTracePageQuery, GetTeamMemberEventMonitorActiveTracePageQueryVariables>(GetTeamMemberEventMonitorActiveTracePageDocument, variables, options);
}
export function useGetTeamMemberEventMonitorActiveTracePageLazyQuery(variables?: GetTeamMemberEventMonitorActiveTracePageQueryVariables | VueCompositionApi.Ref<GetTeamMemberEventMonitorActiveTracePageQueryVariables> | ReactiveFunction<GetTeamMemberEventMonitorActiveTracePageQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTeamMemberEventMonitorActiveTracePageQuery, GetTeamMemberEventMonitorActiveTracePageQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTeamMemberEventMonitorActiveTracePageQuery, GetTeamMemberEventMonitorActiveTracePageQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTeamMemberEventMonitorActiveTracePageQuery, GetTeamMemberEventMonitorActiveTracePageQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetTeamMemberEventMonitorActiveTracePageQuery, GetTeamMemberEventMonitorActiveTracePageQueryVariables>(GetTeamMemberEventMonitorActiveTracePageDocument, variables, options);
}
export type GetTeamMemberEventMonitorActiveTracePageQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetTeamMemberEventMonitorActiveTracePageQuery, GetTeamMemberEventMonitorActiveTracePageQueryVariables>;
export const GetTeamRunResumeConfigDocument = gql`
    query GetTeamRunResumeConfig($teamRunId: String!) {
  getTeamRunResumeConfig(teamRunId: $teamRunId) {
    teamRunId
    isActive
    executionTree
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
export const GetTeamRunExecutionCheckpointDocument = gql`
    query GetTeamRunExecutionCheckpoint($teamRunId: String!) {
  getTeamRunExecutionCheckpoint(teamRunId: $teamRunId) {
    rootTeamRunId
    changeSequence
    hasOpenExecutionWork
  }
}
    `;

/**
 * __useGetTeamRunExecutionCheckpointQuery__
 *
 * To run a query within a Vue component, call `useGetTeamRunExecutionCheckpointQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTeamRunExecutionCheckpointQuery` returns an object from Apollo Client that contains result, loading and error properties.
 */
export function useGetTeamRunExecutionCheckpointQuery(variables: GetTeamRunExecutionCheckpointQueryVariables | VueCompositionApi.Ref<GetTeamRunExecutionCheckpointQueryVariables> | ReactiveFunction<GetTeamRunExecutionCheckpointQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTeamRunExecutionCheckpointQuery, GetTeamRunExecutionCheckpointQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTeamRunExecutionCheckpointQuery, GetTeamRunExecutionCheckpointQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTeamRunExecutionCheckpointQuery, GetTeamRunExecutionCheckpointQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetTeamRunExecutionCheckpointQuery, GetTeamRunExecutionCheckpointQueryVariables>(GetTeamRunExecutionCheckpointDocument, variables, options);
}
export function useGetTeamRunExecutionCheckpointLazyQuery(variables?: GetTeamRunExecutionCheckpointQueryVariables | VueCompositionApi.Ref<GetTeamRunExecutionCheckpointQueryVariables> | ReactiveFunction<GetTeamRunExecutionCheckpointQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTeamRunExecutionCheckpointQuery, GetTeamRunExecutionCheckpointQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTeamRunExecutionCheckpointQuery, GetTeamRunExecutionCheckpointQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTeamRunExecutionCheckpointQuery, GetTeamRunExecutionCheckpointQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetTeamRunExecutionCheckpointQuery, GetTeamRunExecutionCheckpointQueryVariables>(GetTeamRunExecutionCheckpointDocument, variables, options);
}
export type GetTeamRunExecutionCheckpointQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetTeamRunExecutionCheckpointQuery, GetTeamRunExecutionCheckpointQueryVariables>;
export const GetTeamMemberRunProjectionDocument = gql`
    query GetTeamMemberRunProjection($teamRunId: String!, $agentRunId: String!) {
  getTeamMemberRunProjection(teamRunId: $teamRunId, agentRunId: $agentRunId) {
    agentRunId
    summary
    lastActivityAt
    conversation
    activities
    hasEarlierActiveTraceEvents
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
 *   agentRunId: // value for 'agentRunId'
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
    senderAgentRunId
    receiverAgentRunId
    content
    messageType
    createdAt
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
export const GetTaskDelegationRecordsDocument = gql`
    query GetTaskDelegationRecords($teamRunId: String!) {
  getTaskDelegationRecords(teamRunId: $teamRunId) {
    taskId
    delegatorAgentRunId
    recipientAddress
    targetAgentRunId
    targetTeamRunId
    status
    description
    referenceFiles {
      referenceId
      path
      type
      createdAt
      updatedAt
    }
    updates {
      kind
      submissionId
      reviewId
      interruptionId
      reviewedSubmissionId
      decision
      content
      referenceFiles {
        referenceId
        path
        type
        createdAt
        updatedAt
      }
      createdAt
    }
    createdAt
  }
}
    `;

/**
 * __useGetTaskDelegationRecordsQuery__
 *
 * To run a query within a Vue component, call `useGetTaskDelegationRecordsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTaskDelegationRecordsQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetTaskDelegationRecordsQuery({
 *   teamRunId: // value for 'teamRunId'
 * });
 */
export function useGetTaskDelegationRecordsQuery(variables: GetTaskDelegationRecordsQueryVariables | VueCompositionApi.Ref<GetTaskDelegationRecordsQueryVariables> | ReactiveFunction<GetTaskDelegationRecordsQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTaskDelegationRecordsQuery, GetTaskDelegationRecordsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTaskDelegationRecordsQuery, GetTaskDelegationRecordsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTaskDelegationRecordsQuery, GetTaskDelegationRecordsQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetTaskDelegationRecordsQuery, GetTaskDelegationRecordsQueryVariables>(GetTaskDelegationRecordsDocument, variables, options);
}
export function useGetTaskDelegationRecordsLazyQuery(variables?: GetTaskDelegationRecordsQueryVariables | VueCompositionApi.Ref<GetTaskDelegationRecordsQueryVariables> | ReactiveFunction<GetTaskDelegationRecordsQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTaskDelegationRecordsQuery, GetTaskDelegationRecordsQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTaskDelegationRecordsQuery, GetTaskDelegationRecordsQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTaskDelegationRecordsQuery, GetTaskDelegationRecordsQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetTaskDelegationRecordsQuery, GetTaskDelegationRecordsQueryVariables>(GetTaskDelegationRecordsDocument, variables, options);
}
export type GetTaskDelegationRecordsQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetTaskDelegationRecordsQuery, GetTaskDelegationRecordsQueryVariables>;
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
  getEffectiveWorkingContextCompactionStrategyId
  getEffectiveStreamingContentFlushIntervalMs
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
    vaultHealth
    instructionCode
    serperStorageState
    serpapiStorageState
    vertexAiSearchStorageState
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
export const GetSkillImprovementCapabilityDocument = gql`
    query GetSkillImprovementCapability {
  skillImprovementCapability {
    ...SkillImprovementCapabilityFields
  }
}
    ${SkillImprovementCapabilityFieldsFragmentDoc}`;

/**
 * __useGetSkillImprovementCapabilityQuery__
 *
 * To run a query within a Vue component, call `useGetSkillImprovementCapabilityQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetSkillImprovementCapabilityQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetSkillImprovementCapabilityQuery();
 */
export function useGetSkillImprovementCapabilityQuery(options: VueApolloComposable.UseQueryOptions<GetSkillImprovementCapabilityQuery, GetSkillImprovementCapabilityQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetSkillImprovementCapabilityQuery, GetSkillImprovementCapabilityQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetSkillImprovementCapabilityQuery, GetSkillImprovementCapabilityQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetSkillImprovementCapabilityQuery, GetSkillImprovementCapabilityQueryVariables>(GetSkillImprovementCapabilityDocument, {}, options);
}
export function useGetSkillImprovementCapabilityLazyQuery(options: VueApolloComposable.UseQueryOptions<GetSkillImprovementCapabilityQuery, GetSkillImprovementCapabilityQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetSkillImprovementCapabilityQuery, GetSkillImprovementCapabilityQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetSkillImprovementCapabilityQuery, GetSkillImprovementCapabilityQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetSkillImprovementCapabilityQuery, GetSkillImprovementCapabilityQueryVariables>(GetSkillImprovementCapabilityDocument, {}, options);
}
export type GetSkillImprovementCapabilityQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetSkillImprovementCapabilityQuery, GetSkillImprovementCapabilityQueryVariables>;
export const GetAgentRunSkillImprovementEligibilityDocument = gql`
    query GetAgentRunSkillImprovementEligibility($runId: String!) {
  getAgentRunSkillImprovementEligibility(runId: $runId) {
    ...SkillImprovementEligibilityFields
  }
}
    ${SkillImprovementEligibilityFieldsFragmentDoc}`;

/**
 * __useGetAgentRunSkillImprovementEligibilityQuery__
 *
 * To run a query within a Vue component, call `useGetAgentRunSkillImprovementEligibilityQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAgentRunSkillImprovementEligibilityQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetAgentRunSkillImprovementEligibilityQuery({
 *   runId: // value for 'runId'
 * });
 */
export function useGetAgentRunSkillImprovementEligibilityQuery(variables: GetAgentRunSkillImprovementEligibilityQueryVariables | VueCompositionApi.Ref<GetAgentRunSkillImprovementEligibilityQueryVariables> | ReactiveFunction<GetAgentRunSkillImprovementEligibilityQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetAgentRunSkillImprovementEligibilityQuery, GetAgentRunSkillImprovementEligibilityQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetAgentRunSkillImprovementEligibilityQuery, GetAgentRunSkillImprovementEligibilityQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetAgentRunSkillImprovementEligibilityQuery, GetAgentRunSkillImprovementEligibilityQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetAgentRunSkillImprovementEligibilityQuery, GetAgentRunSkillImprovementEligibilityQueryVariables>(GetAgentRunSkillImprovementEligibilityDocument, variables, options);
}
export function useGetAgentRunSkillImprovementEligibilityLazyQuery(variables?: GetAgentRunSkillImprovementEligibilityQueryVariables | VueCompositionApi.Ref<GetAgentRunSkillImprovementEligibilityQueryVariables> | ReactiveFunction<GetAgentRunSkillImprovementEligibilityQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetAgentRunSkillImprovementEligibilityQuery, GetAgentRunSkillImprovementEligibilityQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetAgentRunSkillImprovementEligibilityQuery, GetAgentRunSkillImprovementEligibilityQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetAgentRunSkillImprovementEligibilityQuery, GetAgentRunSkillImprovementEligibilityQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetAgentRunSkillImprovementEligibilityQuery, GetAgentRunSkillImprovementEligibilityQueryVariables>(GetAgentRunSkillImprovementEligibilityDocument, variables, options);
}
export type GetAgentRunSkillImprovementEligibilityQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetAgentRunSkillImprovementEligibilityQuery, GetAgentRunSkillImprovementEligibilityQueryVariables>;
export const GetTeamMemberSkillImprovementEligibilityDocument = gql`
    query GetTeamMemberSkillImprovementEligibility($teamRunId: String!, $agentRunId: String!) {
  getTeamMemberSkillImprovementEligibility(
    teamRunId: $teamRunId
    agentRunId: $agentRunId
  ) {
    ...SkillImprovementEligibilityFields
  }
}
    ${SkillImprovementEligibilityFieldsFragmentDoc}`;

/**
 * __useGetTeamMemberSkillImprovementEligibilityQuery__
 *
 * To run a query within a Vue component, call `useGetTeamMemberSkillImprovementEligibilityQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTeamMemberSkillImprovementEligibilityQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetTeamMemberSkillImprovementEligibilityQuery({
 *   teamRunId: // value for 'teamRunId'
 *   agentRunId: // value for 'agentRunId'
 * });
 */
export function useGetTeamMemberSkillImprovementEligibilityQuery(variables: GetTeamMemberSkillImprovementEligibilityQueryVariables | VueCompositionApi.Ref<GetTeamMemberSkillImprovementEligibilityQueryVariables> | ReactiveFunction<GetTeamMemberSkillImprovementEligibilityQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTeamMemberSkillImprovementEligibilityQuery, GetTeamMemberSkillImprovementEligibilityQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTeamMemberSkillImprovementEligibilityQuery, GetTeamMemberSkillImprovementEligibilityQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTeamMemberSkillImprovementEligibilityQuery, GetTeamMemberSkillImprovementEligibilityQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetTeamMemberSkillImprovementEligibilityQuery, GetTeamMemberSkillImprovementEligibilityQueryVariables>(GetTeamMemberSkillImprovementEligibilityDocument, variables, options);
}
export function useGetTeamMemberSkillImprovementEligibilityLazyQuery(variables?: GetTeamMemberSkillImprovementEligibilityQueryVariables | VueCompositionApi.Ref<GetTeamMemberSkillImprovementEligibilityQueryVariables> | ReactiveFunction<GetTeamMemberSkillImprovementEligibilityQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTeamMemberSkillImprovementEligibilityQuery, GetTeamMemberSkillImprovementEligibilityQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTeamMemberSkillImprovementEligibilityQuery, GetTeamMemberSkillImprovementEligibilityQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTeamMemberSkillImprovementEligibilityQuery, GetTeamMemberSkillImprovementEligibilityQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetTeamMemberSkillImprovementEligibilityQuery, GetTeamMemberSkillImprovementEligibilityQueryVariables>(GetTeamMemberSkillImprovementEligibilityDocument, variables, options);
}
export type GetTeamMemberSkillImprovementEligibilityQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetTeamMemberSkillImprovementEligibilityQuery, GetTeamMemberSkillImprovementEligibilityQueryVariables>;
export const GetSkillImprovementRunRecordDocument = gql`
    query GetSkillImprovementRunRecord($improvementRunId: String!) {
  getSkillImprovementRunRecord(improvementRunId: $improvementRunId) {
    ...SkillImprovementRunRecordSummaryFields
  }
}
    ${SkillImprovementRunRecordSummaryFieldsFragmentDoc}`;

/**
 * __useGetSkillImprovementRunRecordQuery__
 *
 * To run a query within a Vue component, call `useGetSkillImprovementRunRecordQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetSkillImprovementRunRecordQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetSkillImprovementRunRecordQuery({
 *   improvementRunId: // value for 'improvementRunId'
 * });
 */
export function useGetSkillImprovementRunRecordQuery(variables: GetSkillImprovementRunRecordQueryVariables | VueCompositionApi.Ref<GetSkillImprovementRunRecordQueryVariables> | ReactiveFunction<GetSkillImprovementRunRecordQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetSkillImprovementRunRecordQuery, GetSkillImprovementRunRecordQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetSkillImprovementRunRecordQuery, GetSkillImprovementRunRecordQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetSkillImprovementRunRecordQuery, GetSkillImprovementRunRecordQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetSkillImprovementRunRecordQuery, GetSkillImprovementRunRecordQueryVariables>(GetSkillImprovementRunRecordDocument, variables, options);
}
export function useGetSkillImprovementRunRecordLazyQuery(variables?: GetSkillImprovementRunRecordQueryVariables | VueCompositionApi.Ref<GetSkillImprovementRunRecordQueryVariables> | ReactiveFunction<GetSkillImprovementRunRecordQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetSkillImprovementRunRecordQuery, GetSkillImprovementRunRecordQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetSkillImprovementRunRecordQuery, GetSkillImprovementRunRecordQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetSkillImprovementRunRecordQuery, GetSkillImprovementRunRecordQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetSkillImprovementRunRecordQuery, GetSkillImprovementRunRecordQueryVariables>(GetSkillImprovementRunRecordDocument, variables, options);
}
export type GetSkillImprovementRunRecordQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetSkillImprovementRunRecordQuery, GetSkillImprovementRunRecordQueryVariables>;
export const GetAgentRunTokenUsageSummaryDocument = gql`
    query GetAgentRunTokenUsageSummary($runId: String!) {
  getAgentRunTokenUsageSummary(runId: $runId) {
    ...TokenUsageRunSummaryFields
  }
}
    ${TokenUsageRunSummaryFieldsFragmentDoc}`;

/**
 * __useGetAgentRunTokenUsageSummaryQuery__
 *
 * To run a query within a Vue component, call `useGetAgentRunTokenUsageSummaryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAgentRunTokenUsageSummaryQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetAgentRunTokenUsageSummaryQuery({
 *   runId: // value for 'runId'
 * });
 */
export function useGetAgentRunTokenUsageSummaryQuery(variables: GetAgentRunTokenUsageSummaryQueryVariables | VueCompositionApi.Ref<GetAgentRunTokenUsageSummaryQueryVariables> | ReactiveFunction<GetAgentRunTokenUsageSummaryQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetAgentRunTokenUsageSummaryQuery, GetAgentRunTokenUsageSummaryQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetAgentRunTokenUsageSummaryQuery, GetAgentRunTokenUsageSummaryQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetAgentRunTokenUsageSummaryQuery, GetAgentRunTokenUsageSummaryQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetAgentRunTokenUsageSummaryQuery, GetAgentRunTokenUsageSummaryQueryVariables>(GetAgentRunTokenUsageSummaryDocument, variables, options);
}
export function useGetAgentRunTokenUsageSummaryLazyQuery(variables?: GetAgentRunTokenUsageSummaryQueryVariables | VueCompositionApi.Ref<GetAgentRunTokenUsageSummaryQueryVariables> | ReactiveFunction<GetAgentRunTokenUsageSummaryQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetAgentRunTokenUsageSummaryQuery, GetAgentRunTokenUsageSummaryQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetAgentRunTokenUsageSummaryQuery, GetAgentRunTokenUsageSummaryQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetAgentRunTokenUsageSummaryQuery, GetAgentRunTokenUsageSummaryQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetAgentRunTokenUsageSummaryQuery, GetAgentRunTokenUsageSummaryQueryVariables>(GetAgentRunTokenUsageSummaryDocument, variables, options);
}
export type GetAgentRunTokenUsageSummaryQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetAgentRunTokenUsageSummaryQuery, GetAgentRunTokenUsageSummaryQueryVariables>;
export const GetTeamRunTokenUsageSummaryDocument = gql`
    query GetTeamRunTokenUsageSummary($teamRunId: String!) {
  getTeamRunTokenUsageSummary(teamRunId: $teamRunId) {
    ...TokenUsageRunSummaryFields
  }
}
    ${TokenUsageRunSummaryFieldsFragmentDoc}`;

/**
 * __useGetTeamRunTokenUsageSummaryQuery__
 *
 * To run a query within a Vue component, call `useGetTeamRunTokenUsageSummaryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTeamRunTokenUsageSummaryQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetTeamRunTokenUsageSummaryQuery({
 *   teamRunId: // value for 'teamRunId'
 * });
 */
export function useGetTeamRunTokenUsageSummaryQuery(variables: GetTeamRunTokenUsageSummaryQueryVariables | VueCompositionApi.Ref<GetTeamRunTokenUsageSummaryQueryVariables> | ReactiveFunction<GetTeamRunTokenUsageSummaryQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTeamRunTokenUsageSummaryQuery, GetTeamRunTokenUsageSummaryQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTeamRunTokenUsageSummaryQuery, GetTeamRunTokenUsageSummaryQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTeamRunTokenUsageSummaryQuery, GetTeamRunTokenUsageSummaryQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetTeamRunTokenUsageSummaryQuery, GetTeamRunTokenUsageSummaryQueryVariables>(GetTeamRunTokenUsageSummaryDocument, variables, options);
}
export function useGetTeamRunTokenUsageSummaryLazyQuery(variables?: GetTeamRunTokenUsageSummaryQueryVariables | VueCompositionApi.Ref<GetTeamRunTokenUsageSummaryQueryVariables> | ReactiveFunction<GetTeamRunTokenUsageSummaryQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTeamRunTokenUsageSummaryQuery, GetTeamRunTokenUsageSummaryQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTeamRunTokenUsageSummaryQuery, GetTeamRunTokenUsageSummaryQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTeamRunTokenUsageSummaryQuery, GetTeamRunTokenUsageSummaryQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetTeamRunTokenUsageSummaryQuery, GetTeamRunTokenUsageSummaryQueryVariables>(GetTeamRunTokenUsageSummaryDocument, variables, options);
}
export type GetTeamRunTokenUsageSummaryQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetTeamRunTokenUsageSummaryQuery, GetTeamRunTokenUsageSummaryQueryVariables>;
export const GetTeamMemberTokenUsageSummaryDocument = gql`
    query GetTeamMemberTokenUsageSummary($teamRunId: String!, $agentRunId: String!) {
  getTeamMemberTokenUsageSummary(teamRunId: $teamRunId, agentRunId: $agentRunId) {
    ...TokenUsageRunSummaryFields
  }
}
    ${TokenUsageRunSummaryFieldsFragmentDoc}`;

/**
 * __useGetTeamMemberTokenUsageSummaryQuery__
 *
 * To run a query within a Vue component, call `useGetTeamMemberTokenUsageSummaryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTeamMemberTokenUsageSummaryQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetTeamMemberTokenUsageSummaryQuery({
 *   teamRunId: // value for 'teamRunId'
 *   agentRunId: // value for 'agentRunId'
 * });
 */
export function useGetTeamMemberTokenUsageSummaryQuery(variables: GetTeamMemberTokenUsageSummaryQueryVariables | VueCompositionApi.Ref<GetTeamMemberTokenUsageSummaryQueryVariables> | ReactiveFunction<GetTeamMemberTokenUsageSummaryQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTeamMemberTokenUsageSummaryQuery, GetTeamMemberTokenUsageSummaryQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTeamMemberTokenUsageSummaryQuery, GetTeamMemberTokenUsageSummaryQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTeamMemberTokenUsageSummaryQuery, GetTeamMemberTokenUsageSummaryQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetTeamMemberTokenUsageSummaryQuery, GetTeamMemberTokenUsageSummaryQueryVariables>(GetTeamMemberTokenUsageSummaryDocument, variables, options);
}
export function useGetTeamMemberTokenUsageSummaryLazyQuery(variables?: GetTeamMemberTokenUsageSummaryQueryVariables | VueCompositionApi.Ref<GetTeamMemberTokenUsageSummaryQueryVariables> | ReactiveFunction<GetTeamMemberTokenUsageSummaryQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTeamMemberTokenUsageSummaryQuery, GetTeamMemberTokenUsageSummaryQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTeamMemberTokenUsageSummaryQuery, GetTeamMemberTokenUsageSummaryQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTeamMemberTokenUsageSummaryQuery, GetTeamMemberTokenUsageSummaryQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetTeamMemberTokenUsageSummaryQuery, GetTeamMemberTokenUsageSummaryQueryVariables>(GetTeamMemberTokenUsageSummaryDocument, variables, options);
}
export type GetTeamMemberTokenUsageSummaryQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetTeamMemberTokenUsageSummaryQuery, GetTeamMemberTokenUsageSummaryQueryVariables>;
export const GetTokenUsageTaskStatisticsInPeriodDocument = gql`
    query GetTokenUsageTaskStatisticsInPeriod($startTime: DateTime!, $endTime: DateTime!) {
  tokenUsageTaskStatisticsInPeriod(startTime: $startTime, endTime: $endTime) {
    rows {
      ...TokenUsageTaskStatisticsRowFields
      children {
        ...TokenUsageTaskStatisticsRowFields
        children {
          ...TokenUsageTaskStatisticsRowFields
          children {
            ...TokenUsageTaskStatisticsRowFields
            children {
              ...TokenUsageTaskStatisticsRowFields
              children {
                ...TokenUsageTaskStatisticsRowFields
              }
            }
          }
        }
      }
    }
  }
}
    ${TokenUsageTaskStatisticsRowFieldsFragmentDoc}`;

/**
 * __useGetTokenUsageTaskStatisticsInPeriodQuery__
 *
 * To run a query within a Vue component, call `useGetTokenUsageTaskStatisticsInPeriodQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTokenUsageTaskStatisticsInPeriodQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param variables that will be passed into the query
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetTokenUsageTaskStatisticsInPeriodQuery({
 *   startTime: // value for 'startTime'
 *   endTime: // value for 'endTime'
 * });
 */
export function useGetTokenUsageTaskStatisticsInPeriodQuery(variables: GetTokenUsageTaskStatisticsInPeriodQueryVariables | VueCompositionApi.Ref<GetTokenUsageTaskStatisticsInPeriodQueryVariables> | ReactiveFunction<GetTokenUsageTaskStatisticsInPeriodQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTokenUsageTaskStatisticsInPeriodQuery, GetTokenUsageTaskStatisticsInPeriodQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTokenUsageTaskStatisticsInPeriodQuery, GetTokenUsageTaskStatisticsInPeriodQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTokenUsageTaskStatisticsInPeriodQuery, GetTokenUsageTaskStatisticsInPeriodQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetTokenUsageTaskStatisticsInPeriodQuery, GetTokenUsageTaskStatisticsInPeriodQueryVariables>(GetTokenUsageTaskStatisticsInPeriodDocument, variables, options);
}
export function useGetTokenUsageTaskStatisticsInPeriodLazyQuery(variables?: GetTokenUsageTaskStatisticsInPeriodQueryVariables | VueCompositionApi.Ref<GetTokenUsageTaskStatisticsInPeriodQueryVariables> | ReactiveFunction<GetTokenUsageTaskStatisticsInPeriodQueryVariables>, options: VueApolloComposable.UseQueryOptions<GetTokenUsageTaskStatisticsInPeriodQuery, GetTokenUsageTaskStatisticsInPeriodQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetTokenUsageTaskStatisticsInPeriodQuery, GetTokenUsageTaskStatisticsInPeriodQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetTokenUsageTaskStatisticsInPeriodQuery, GetTokenUsageTaskStatisticsInPeriodQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetTokenUsageTaskStatisticsInPeriodQuery, GetTokenUsageTaskStatisticsInPeriodQueryVariables>(GetTokenUsageTaskStatisticsInPeriodDocument, variables, options);
}
export type GetTokenUsageTaskStatisticsInPeriodQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetTokenUsageTaskStatisticsInPeriodQuery, GetTokenUsageTaskStatisticsInPeriodQueryVariables>;
export const GetUsageStatisticsInPeriodDocument = gql`
    query GetUsageStatisticsInPeriod($startTime: DateTime!, $endTime: DateTime!) {
  usageStatisticsInPeriod(startTime: $startTime, endTime: $endTime) {
    runtimeKind
    llmModel
    modelDisplayName
    inputTokens
    cacheReadInputTokens
    cacheCreationInputTokens
    cacheReadInputTokenRate
    cacheState
    outputTokens
    thinkingTokens
    inputCost
    outputCost
    thinkingCost
    totalCost
    currency
    apiCostStatus
    aggregate {
      ...TokenUsageCostSummaryAggregateFields
    }
  }
}
    ${TokenUsageCostSummaryAggregateFieldsFragmentDoc}`;

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
export const GetWorkingContextCompactionStrategiesDocument = gql`
    query GetWorkingContextCompactionStrategies {
  getWorkingContextCompactionStrategies {
    id
    name
  }
}
    `;

/**
 * __useGetWorkingContextCompactionStrategiesQuery__
 *
 * To run a query within a Vue component, call `useGetWorkingContextCompactionStrategiesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetWorkingContextCompactionStrategiesQuery` returns an object from Apollo Client that contains result, loading and error properties
 * you can use to render your UI.
 *
 * @param options that will be passed into the query, supported options are listed on: https://v4.apollo.vuejs.org/guide-composable/query.html#options;
 *
 * @example
 * const { result, loading, error } = useGetWorkingContextCompactionStrategiesQuery();
 */
export function useGetWorkingContextCompactionStrategiesQuery(options: VueApolloComposable.UseQueryOptions<GetWorkingContextCompactionStrategiesQuery, GetWorkingContextCompactionStrategiesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetWorkingContextCompactionStrategiesQuery, GetWorkingContextCompactionStrategiesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetWorkingContextCompactionStrategiesQuery, GetWorkingContextCompactionStrategiesQueryVariables>> = {}) {
  return VueApolloComposable.useQuery<GetWorkingContextCompactionStrategiesQuery, GetWorkingContextCompactionStrategiesQueryVariables>(GetWorkingContextCompactionStrategiesDocument, {}, options);
}
export function useGetWorkingContextCompactionStrategiesLazyQuery(options: VueApolloComposable.UseQueryOptions<GetWorkingContextCompactionStrategiesQuery, GetWorkingContextCompactionStrategiesQueryVariables> | VueCompositionApi.Ref<VueApolloComposable.UseQueryOptions<GetWorkingContextCompactionStrategiesQuery, GetWorkingContextCompactionStrategiesQueryVariables>> | ReactiveFunction<VueApolloComposable.UseQueryOptions<GetWorkingContextCompactionStrategiesQuery, GetWorkingContextCompactionStrategiesQueryVariables>> = {}) {
  return VueApolloComposable.useLazyQuery<GetWorkingContextCompactionStrategiesQuery, GetWorkingContextCompactionStrategiesQueryVariables>(GetWorkingContextCompactionStrategiesDocument, {}, options);
}
export type GetWorkingContextCompactionStrategiesQueryCompositionFunctionResult = VueApolloComposable.UseQueryReturn<GetWorkingContextCompactionStrategiesQuery, GetWorkingContextCompactionStrategiesQueryVariables>;
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
