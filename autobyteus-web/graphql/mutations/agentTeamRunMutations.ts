import { gql } from 'graphql-tag'

export const CreateAgentTeamRun = gql`
  mutation CreateAgentTeamRun($input: CreateAgentTeamRunInput!) {
    createAgentTeamRun(input: $input) {
      __typename
      success
      message
      teamRunId
    }
  }
`

export const TerminateAgentTeamRun = gql`
  mutation TerminateAgentTeamRun($teamRunId: String!) {
    terminateAgentTeamRun(teamRunId: $teamRunId) {
      __typename
      success
      message
    }
  }
`

export const RestoreAgentTeamRun = gql`
  mutation RestoreAgentTeamRun($teamRunId: String!) {
    restoreAgentTeamRun(teamRunId: $teamRunId) {
      __typename
      success
      message
      teamRunId
    }
  }
`

export const UpdateStoppedTeamRunModelConfigs = gql`
  mutation UpdateStoppedTeamRunModelConfigs($input: UpdateStoppedTeamRunModelConfigsInput!) {
    updateStoppedTeamRunModelConfigs(input: $input) {
      success
      outcome
      message
      isActive
      editability {
        editable
        reason
      }
      canonicalExecutionTree
      fieldErrors {
        path
        message
      }
    }
  }
`
