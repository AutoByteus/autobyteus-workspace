import { gql } from 'graphql-tag'

export const RunApplication = gql`
  mutation RunApplication($appId: String!, $input: JSONObject!) {
    runApplication(appId: $appId, input: $input)
  }
`

// SetApplicationConfiguration has been removed.
