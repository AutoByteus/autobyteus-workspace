import { gql } from 'graphql-tag'
import { ApplicationSessionFields } from '~/graphql/queries/applicationSessionQueries'

export const CreateApplicationSession = gql`
  mutation CreateApplicationSession($input: CreateApplicationSessionInput!) {
    createApplicationSession(input: $input) {
      success
      message
      session {
        ...ApplicationSessionFields
      }
    }
  }
  ${ApplicationSessionFields}
`

export const TerminateApplicationSession = gql`
  mutation TerminateApplicationSession($applicationSessionId: String!) {
    terminateApplicationSession(applicationSessionId: $applicationSessionId) {
      success
      message
      session {
        ...ApplicationSessionFields
      }
    }
  }
  ${ApplicationSessionFields}
`

export const SendApplicationInput = gql`
  mutation SendApplicationInput($input: SendApplicationInputInput!) {
    sendApplicationInput(input: $input) {
      success
      message
      session {
        ...ApplicationSessionFields
      }
    }
  }
  ${ApplicationSessionFields}
`
