import { gql } from 'graphql-tag'

export const CreateAgentOrgRun = gql`
  mutation CreateAgentOrgRun($input: CreateAgentOrgRunInput!) {
    createAgentOrgRun(input: $input) { success message agentOrgRunId }
  }
`
export const RestoreAgentOrgRun = gql`
  mutation RestoreAgentOrgRun($agentOrgRunId: String!) {
    restoreAgentOrgRun(agentOrgRunId: $agentOrgRunId) { success message agentOrgRunId }
  }
`
export const TerminateAgentOrgRun = gql`
  mutation TerminateAgentOrgRun($agentOrgRunId: String!) {
    terminateAgentOrgRun(agentOrgRunId: $agentOrgRunId) { success message agentOrgRunId }
  }
`

export const UpdateStoppedAgentOrgRunConfig = gql`
  mutation UpdateStoppedAgentOrgRunConfig($input: UpdateStoppedAgentOrgRunConfigInput!) {
    updateStoppedAgentOrgRunConfig(input: $input) {
      success outcome message isActive editability { editable reason } fieldErrors { path message }
      canonical
    }
  }
`

export const ArchiveStoredAgentOrgRun = gql`
  mutation ArchiveStoredAgentOrgRun($orgRunId: String!) {
    archiveStoredAgentOrgRun(orgRunId: $orgRunId) { success message orgRunId }
  }
`;

export const DeleteStoredAgentOrgRun = gql`
  mutation DeleteStoredAgentOrgRun($orgRunId: String!) {
    deleteStoredAgentOrgRun(orgRunId: $orgRunId) { success message orgRunId }
  }
`;
