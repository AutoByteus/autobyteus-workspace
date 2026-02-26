import gql from 'graphql-tag'

export const UPDATE_SERVER_SETTING = gql`
  mutation UpdateServerSetting($key: String!, $value: String!) {
    updateServerSetting(key: $key, value: $value)
  }
`

export const DELETE_SERVER_SETTING = gql`
  mutation DeleteServerSetting($key: String!) {
    deleteServerSetting(key: $key)
  }
`

export const SET_SEARCH_CONFIG = gql`
  mutation SetSearchConfig(
    $provider: String!
    $serperApiKey: String
    $serpapiApiKey: String
    $googleCseApiKey: String
    $googleCseId: String
    $vertexAiSearchApiKey: String
    $vertexAiSearchServingConfig: String
  ) {
    setSearchConfig(
      provider: $provider
      serperApiKey: $serperApiKey
      serpapiApiKey: $serpapiApiKey
      googleCseApiKey: $googleCseApiKey
      googleCseId: $googleCseId
      vertexAiSearchApiKey: $vertexAiSearchApiKey
      vertexAiSearchServingConfig: $vertexAiSearchServingConfig
    )
  }
`
