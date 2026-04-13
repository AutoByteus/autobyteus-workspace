import { gql } from 'graphql-tag'

export const GetAgentTeamDefinitions = gql`
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
      nodes {
        __typename
        memberName
        ref
        refType
        refScope
      }
    }
  }
`
