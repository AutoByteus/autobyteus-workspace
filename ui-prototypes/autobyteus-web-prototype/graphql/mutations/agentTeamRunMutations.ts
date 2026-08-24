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
