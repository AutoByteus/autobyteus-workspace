import gql from 'graphql-tag'

export const GET_SERVER_SETTINGS = gql`
  query GetServerSettings {
    getServerSettings {
      __typename
      key
      value
      description
    }
  }
`

export const GET_SEARCH_CONFIG = gql`
  query GetSearchConfig {
    getSearchConfig {
      provider
      serperApiKeyConfigured
      serpapiApiKeyConfigured
      googleCseApiKeyConfigured
      googleCseId
      vertexAiSearchApiKeyConfigured
      vertexAiSearchServingConfig
    }
  }
`
