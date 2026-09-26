import gql from 'graphql-tag'

import { ProjectFields } from '~/graphql/queries/projectQueries'

export const CreateProject = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      ...ProjectFields
    }
  }
  ${ProjectFields}
`

export const UpdateProject = gql`
  mutation UpdateProject($input: UpdateProjectInput!) {
    updateProject(input: $input) {
      ...ProjectFields
    }
  }
  ${ProjectFields}
`

export const DeleteProject = gql`
  mutation DeleteProject($projectId: String!) {
    deleteProject(projectId: $projectId)
  }
`

export const AddProjectWorkspace = gql`
  mutation AddProjectWorkspace($input: AddProjectWorkspaceInput!) {
    addProjectWorkspace(input: $input) {
      ...ProjectFields
    }
  }
  ${ProjectFields}
`

export const UpdateProjectWorkspace = gql`
  mutation UpdateProjectWorkspace($input: UpdateProjectWorkspaceInput!) {
    updateProjectWorkspace(input: $input) {
      ...ProjectFields
    }
  }
  ${ProjectFields}
`

export const RemoveProjectWorkspace = gql`
  mutation RemoveProjectWorkspace($input: RemoveProjectWorkspaceInput!) {
    removeProjectWorkspace(input: $input) {
      ...ProjectFields
    }
  }
  ${ProjectFields}
`
