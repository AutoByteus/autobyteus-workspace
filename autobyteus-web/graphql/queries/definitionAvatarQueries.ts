import { gql } from 'graphql-tag'

/** Each definition's picture address only, for the rows that show it (autobyteus-669 W-3): desktop and phone. */
export const GetAgentDefinitionAvatars = gql`
  query GetAgentDefinitionAvatars {
    agentDefinitions { id avatarUrl }
  }
`
export const GetAgentTeamDefinitionAvatars = gql`
  query GetAgentTeamDefinitionAvatars {
    agentTeamDefinitions { id avatarUrl }
  }
`
export const GetAgentOrgDefinitionAvatars = gql`
  query GetAgentOrgDefinitionAvatars {
    agentOrgDefinitions { id avatarUrl }
  }
`
