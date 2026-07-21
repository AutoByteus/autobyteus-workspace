import gql from 'graphql-tag'

export const GET_SERVER_SETTINGS = gql`
  query GetServerSettings {
    getServerSettings {
      __typename
      key
      value
      description
      isEditable
      isDeletable
    }
    getEffectiveWorkingContextCompactionStrategyId
  }
`

export const GET_SEARCH_CONFIG = gql`
  query GetSearchConfig {
    getSearchConfig {
      provider
      backendHealth
      lifecycle
      instructionCode
      serperStorageState
      serpapiStorageState
      vertexAiSearchStorageState
      vertexAiSearchServingConfig
    }
  }
`
