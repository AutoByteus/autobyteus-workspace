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

export const UpdateStoppedAgentOrgMemberModelConfig = gql`
  mutation UpdateStoppedAgentOrgMemberModelConfig($input: UpdateStoppedAgentOrgMemberModelConfigInput!) {
    updateStoppedAgentOrgMemberModelConfig(input: $input) {
      success outcome message isActive editability { editable reason } fieldErrors { path message }
      canonical { orgRunId memberAddress agentRunId launchConfiguration isActive editability { editable reason } }
    }
  }
`
