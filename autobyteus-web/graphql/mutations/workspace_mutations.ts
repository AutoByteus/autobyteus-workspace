import { gql } from 'graphql-tag'

export const CreateWorkspace = gql`
  mutation CreateWorkspace($input: CreateWorkspaceInput!) {
    createWorkspace(input: $input) {
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
