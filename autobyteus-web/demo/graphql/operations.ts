/**
 * The GraphQL operations the phone sends (autobyteus-279): every name in the measured inventory
 * (`tickets/.../evidence/architecture/phone-network-inventory.json`), and the ones the demo build's own compiled
 * operations showed the phone can send beyond it (the `@` menu, a Team's checkpoint), each with its generated variables and result
 * (`generated/graphql.ts`, checked by `codegen:check`). The demo node's handler table must cover all of them
 * (`DemoGraphqlHandlers`), so a changed schema fails the demo's type check instead of drifting.
 */
import type { CollaborationParticipantMessagesDto } from '@autobyteus/collaboration-stream-contracts';
import type * as G from '~/generated/graphql';
import type { DemoWorld } from '../world/DemoWorld';

export type DemoOperations = {
  AgentBackgroundTaskView: [G.AgentBackgroundTaskViewQueryVariables, G.AgentBackgroundTaskViewQuery];
  AgentOrgRunConfig: [G.AgentOrgRunConfigQueryVariables, G.AgentOrgRunConfigQuery];
  AgentOrgRunModelOptions: [G.AgentOrgRunModelOptionsQueryVariables, G.AgentOrgRunModelOptionsQuery];
  AgentRunModelOptions: [G.AgentRunModelOptionsQueryVariables, G.AgentRunModelOptionsQuery];
  CollaborationParticipantMessages: [{ rootKind: string; rootRunId: string; agentRunId: string }, { collaborationParticipantMessages: CollaborationParticipantMessagesDto }];
  CreateWorkspace: [G.CreateWorkspaceMutationVariables, G.CreateWorkspaceMutation];
  EnsureProviderModelCatalog: [G.EnsureProviderModelCatalogMutationVariables, G.EnsureProviderModelCatalogMutation];
  GetAgentDefinitionAvatars: [G.GetAgentDefinitionAvatarsQueryVariables, G.GetAgentDefinitionAvatarsQuery];
  GetAgentDefinitions: [G.GetAgentDefinitionsQueryVariables, G.GetAgentDefinitionsQuery];
  GetAgentOrgDefinitionAvatars: [G.GetAgentOrgDefinitionAvatarsQueryVariables, G.GetAgentOrgDefinitionAvatarsQuery];
  GetAgentOrgDefinitions: [G.GetAgentOrgDefinitionsQueryVariables, G.GetAgentOrgDefinitionsQuery];
  GetAgentOrgExecutionCheckpoint: [G.GetAgentOrgExecutionCheckpointQueryVariables, G.GetAgentOrgExecutionCheckpointQuery];
  GetAgentOrgMemberFileChanges: [G.GetAgentOrgMemberFileChangesQueryVariables, G.GetAgentOrgMemberFileChangesQuery];
  GetAgentOrgMemberRunProjection: [G.GetAgentOrgMemberRunProjectionQueryVariables, G.GetAgentOrgMemberRunProjectionQuery];
  GetAgentOrgRootHistory: [G.GetAgentOrgRootHistoryQueryVariables, G.GetAgentOrgRootHistoryQuery];
  GetAgentOrgRunInspection: [G.GetAgentOrgRunInspectionQueryVariables, G.GetAgentOrgRunInspectionQuery];
  GetAgentRunCollaboration: [G.GetAgentRunCollaborationQueryVariables, G.GetAgentRunCollaborationQuery];
  GetAgentRunResumeConfig: [G.GetAgentRunResumeConfigQueryVariables, G.GetAgentRunResumeConfigQuery];
  GetAgentTeamDefinitionAvatars: [G.GetAgentTeamDefinitionAvatarsQueryVariables, G.GetAgentTeamDefinitionAvatarsQuery];
  GetAgentTeamDefinitions: [G.GetAgentTeamDefinitionsQueryVariables, G.GetAgentTeamDefinitionsQuery];
  GetAllWorkspaces: [G.GetAllWorkspacesQueryVariables, G.GetAllWorkspacesQuery];
  GetCollaboratorMentionCandidates: [G.GetCollaboratorMentionCandidatesQueryVariables, G.GetCollaboratorMentionCandidatesQuery];
  GetFileContent: [G.GetFileContentQueryVariables, G.GetFileContentQuery];
  GetFolderChildren: [G.GetFolderChildrenQueryVariables, G.GetFolderChildrenQuery];
  GetProviderModelCatalogSnapshots: [G.GetProviderModelCatalogSnapshotsQueryVariables, G.GetProviderModelCatalogSnapshotsQuery];
  GetRunFileChanges: [G.GetRunFileChangesQueryVariables, G.GetRunFileChangesQuery];
  GetRunProjection: [G.GetRunProjectionQueryVariables, G.GetRunProjectionQuery];
  GetRunTree: [G.GetRunTreeQueryVariables, G.GetRunTreeQuery];
  GetRuntimeAvailability: [G.GetRuntimeAvailabilityQueryVariables, G.GetRuntimeAvailabilityQuery];
  GetRuntimeAvailabilityKinds: [G.GetRuntimeAvailabilityKindsQueryVariables, G.GetRuntimeAvailabilityKindsQuery];
  GetTaskWorkerTasks: [G.GetTaskWorkerTasksQueryVariables, G.GetTaskWorkerTasksQuery];
  GetTeamMemberFileChanges: [G.GetTeamMemberFileChangesQueryVariables, G.GetTeamMemberFileChangesQuery];
  GetTeamMemberRunProjection: [G.GetTeamMemberRunProjectionQueryVariables, G.GetTeamMemberRunProjectionQuery];
  GetTeamRunExecutionCheckpoint: [G.GetTeamRunExecutionCheckpointQueryVariables, G.GetTeamRunExecutionCheckpointQuery];
  GetTeamRunResumeConfig: [G.GetTeamRunResumeConfigQueryVariables, G.GetTeamRunResumeConfigQuery];
  ListCollaborationRootHistory: [G.ListCollaborationRootHistoryQueryVariables, G.ListCollaborationRootHistoryQuery];
  ListWorkspaceRunHistory: [G.ListWorkspaceRunHistoryQueryVariables, G.ListWorkspaceRunHistoryQuery];
  PhoneCredentialCheck: [Record<string, never>, { __typename: 'Query' }];
  PrepareAgentRun: [G.PrepareAgentRunMutationVariables, G.PrepareAgentRunMutation];
  RuntimeCurrentModelDescriptors: [G.RuntimeCurrentModelDescriptorsQueryVariables, G.RuntimeCurrentModelDescriptorsQuery];
  SearchFiles: [G.SearchFilesQueryVariables, G.SearchFilesQuery];
  TeamRunModelOptions: [G.TeamRunModelOptionsQueryVariables, G.TeamRunModelOptionsQuery];
  TerminateAgentOrgRun: [G.TerminateAgentOrgRunMutationVariables, G.TerminateAgentOrgRunMutation];
  TerminateAgentRun: [G.TerminateAgentRunMutationVariables, G.TerminateAgentRunMutation];
  TerminateAgentTeamRun: [G.TerminateAgentTeamRunMutationVariables, G.TerminateAgentTeamRunMutation];
  UpdateStoppedAgentOrgRunConfig: [G.UpdateStoppedAgentOrgRunConfigMutationVariables, G.UpdateStoppedAgentOrgRunConfigMutation];
  UpdateStoppedAgentRunSelection: [G.UpdateStoppedAgentRunSelectionMutationVariables, G.UpdateStoppedAgentRunSelectionMutation];
  UpdateStoppedTeamRunSelections: [G.UpdateStoppedTeamRunSelectionsMutationVariables, G.UpdateStoppedTeamRunSelectionsMutation];
};

export type DemoOperationName = keyof DemoOperations;
export type DemoOperationHandler<K extends DemoOperationName> = (variables: DemoOperations[K][0], world: DemoWorld) => DemoOperations[K][1] | Promise<DemoOperations[K][1]>;
export type DemoGraphqlHandlers = { [K in DemoOperationName]: DemoOperationHandler<K> };
