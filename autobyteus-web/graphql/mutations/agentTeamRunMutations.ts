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
  mutation TerminateAgentTeamRun($id: String!) {
    terminateAgentTeamRun(id: $id) {
      __typename
      success
      message
    }
  }
`

export const SendMessageToTeam = gql`
  mutation SendMessageToTeam($input: SendMessageToTeamInput!) {
    sendMessageToTeam(input: $input) {
      __typename
      success
      message
      teamRunId
    }
  }
`
