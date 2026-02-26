import { gql } from 'graphql-tag'

export const GetAllWorkspaces = gql`
  query GetAllWorkspaces {
    workspaces {
      __typename
      workspaceId
      name
      config
      fileExplorer
      absolutePath
      isTemp
    }
  }
`


