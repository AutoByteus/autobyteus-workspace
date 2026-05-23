import { gql } from 'graphql-tag'

export const GetAllWorkspaces = gql`
  query GetAllWorkspaces {
    workspaces {
      __typename
      workspaceId
      name
      displayName
      config
      workspaceRootPath
      absolutePath
      kind
      isTemp
    }
  }
`

export const GetWorkspaceMetadata = gql`
  query GetWorkspaceMetadata($rootPath: String!) {
    workspaceMetadata(rootPath: $rootPath) {
      __typename
      workspaceId
      workspaceRootPath
      displayName
      kind
    }
  }
`
