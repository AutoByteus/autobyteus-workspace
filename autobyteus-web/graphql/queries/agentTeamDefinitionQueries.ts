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
      revision
      handoffs { from to rules }
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
        refScope
      }
    }
  }
`
