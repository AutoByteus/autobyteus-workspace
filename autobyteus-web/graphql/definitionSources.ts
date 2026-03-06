import gql from 'graphql-tag'

export const GET_DEFINITION_SOURCES = gql`
  query GetDefinitionSources {
    definitionSources {
      path
      agentCount
      agentTeamCount
      isDefault
    }
  }
`

export const ADD_DEFINITION_SOURCE = gql`
  mutation AddDefinitionSource($path: String!) {
    addDefinitionSource(path: $path) {
      path
      agentCount
      agentTeamCount
      isDefault
    }
  }
`

export const REMOVE_DEFINITION_SOURCE = gql`
  mutation RemoveDefinitionSource($path: String!) {
    removeDefinitionSource(path: $path) {
      path
      agentCount
      agentTeamCount
      isDefault
    }
  }
`
