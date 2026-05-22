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

export const GetWorkspaceReference = gql`
  query GetWorkspaceReference($rootPath: String!) {
    workspaceReference(rootPath: $rootPath) {
      __typename
      workspaceId
      workspaceRootPath
      displayName
      kind
    }
  }
`
