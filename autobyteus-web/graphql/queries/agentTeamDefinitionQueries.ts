import { gql } from 'graphql-tag'

export const GetAgentTeamDefinitions = gql`
  query GetAgentTeamDefinitions {
    agentTeamDefinitions {
      __typename
      id
      name
      description
      role
      avatarUrl
      coordinatorMemberName
      nodes {
        __typename
        memberName
        referenceId
        referenceType
      }
    }
  }
`
